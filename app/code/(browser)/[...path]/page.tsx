import Link from "next/link";
import { notFound } from "next/navigation";
import path from "path";
import { codeToHtml } from "shiki";
import type { ShikiTransformer } from "shiki";
import { listFiles, readFile } from "@/lib/code-files";
import { FileBody } from "../../FileBody";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const files = await listFiles();
  return files.map((f) => ({ path: f.split("/") }));
}

const LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".css": "css",
  ".scss": "scss",
  ".md": "markdown",
  ".mdx": "markdown",
  ".html": "html",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".sh": "bash",
};

// Add an id (L<n>) and a clickable line-number anchor to every line.
const lineNumbers: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.properties.id = `L${line}`;
    node.children.unshift({
      type: "element",
      tagName: "a",
      properties: { href: `#L${line}`, class: "ln" },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

function Breadcrumb({ rel }: { rel: string }) {
  const segs = rel.split("/");
  const file = segs.pop()!;
  return (
    <nav className="mb-3 font-mono text-sm">
      <Link href="/code" className="text-[#2f81f7] hover:underline">
        patterns
      </Link>
      {segs.map((s, i) => (
        <span key={i} className="text-[#7d8590]">
          {" / "}
          {s}
        </span>
      ))}
      <span className="text-[#7d8590]">{" / "}</span>
      <span className="font-semibold text-[#e6edf3]">{file}</span>
    </nav>
  );
}

export default async function FilePage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path: segs } = await params;
  // Segments arrive percent-encoded (e.g. %5BpatternId%5D); decode to match the
  // raw tracked path. decodeURIComponent is idempotent for unescaped names.
  const rel = segs.map(decodeURIComponent).join("/");
  const content = await readFile(rel);
  if (content == null) notFound();

  const lang = LANG[path.extname(rel)] || "text";
  const html = await codeToHtml(content, {
    lang,
    theme: "github-dark",
    transformers: [lineNumbers],
  });
  const lines = content.split("\n").length;
  const bytes = Buffer.byteLength(content, "utf8");

  return (
    <div>
      <Breadcrumb rel={rel} />
      <FileBody html={html} raw={content} lines={lines} bytes={bytes} />
    </div>
  );
}

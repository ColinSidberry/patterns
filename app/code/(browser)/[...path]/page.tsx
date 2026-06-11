import { notFound } from "next/navigation";
import path from "path";
import { codeToHtml } from "shiki";
import { listFiles, readFile } from "@/lib/code-files";

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
  const html = await codeToHtml(content, { lang, theme: "catppuccin-mocha" });

  return (
    <div>
      <header className="mb-3">
        <span className="font-mono text-sm text-[#a6adc8]">{rel}</span>
      </header>
      <div
        className="overflow-x-auto rounded-lg border border-white/10 p-4 text-sm [&_pre]:!bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

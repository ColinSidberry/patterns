import { marked } from "marked";
import { listFiles, readFile } from "@/lib/code-files";
import { CodeTree, type TreeNode } from "./CodeTree";

export const dynamic = "force-static";

// Build a nested folder tree from the flat path list, folders before files.
function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode = { name: "", children: [] };
  for (const f of files) {
    const parts = f.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let child = node.children!.find((c) => c.name === part);
      if (!child) {
        child = isFile ? { name: part, path: f } : { name: part, children: [] };
        node.children!.push(child);
      }
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const af = !!a.children;
      const bf = !!b.children;
      if (af !== bf) return af ? -1 : 1; // folders first
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root.children!);
  return root.children!;
}

export default async function CodeIndex() {
  const files = await listFiles();
  const tree = buildTree(files);

  const readme = await readFile("README.md");
  const readmeHtml = readme ? await marked.parse(readme) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#cdd6f4]">Source code</h1>
        <p className="mt-1 text-sm text-[#a6adc8]">
          {files.length} files · browse the implementation of this project.
        </p>
      </header>

      <CodeTree tree={tree} />

      {readmeHtml && (
        <section className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/10 px-4 py-2 font-mono text-sm text-[#89b4fa]">
            README.md
          </div>
          <div
            className="prose prose-invert max-w-none px-6 py-5 prose-pre:bg-[#13131a] prose-code:text-[#cdd6f4] prose-a:text-[#89b4fa]"
            dangerouslySetInnerHTML={{ __html: readmeHtml }}
          />
        </section>
      )}
    </main>
  );
}

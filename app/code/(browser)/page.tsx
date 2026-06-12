import { marked } from "marked";
import { readFile } from "@/lib/code-files";

export const dynamic = "force-static";

// Index of the code browser: the tree lives in the layout sidebar, so the main
// area just renders the README to orient visitors (GitHub-style).
export default async function CodeIndex() {
  const readme = await readFile("README.md");
  const readmeHtml = readme ? await marked.parse(readme) : null;

  if (!readmeHtml) {
    return (
      <p className="text-sm text-[#7d8590]">
        Select a file from the tree to view its source.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-[#30363d]">
      <div className="border-b border-[#30363d] bg-[#161b22] px-4 py-2 text-sm font-semibold text-[#e6edf3]">
        README.md
      </div>
      <div
        className="prose prose-invert max-w-none bg-[#0d1117] px-6 py-5 prose-headings:border-b prose-headings:border-[#30363d] prose-headings:pb-2 prose-pre:bg-[#161b22] prose-code:text-[#e6edf3] prose-a:text-[#2f81f7]"
        dangerouslySetInnerHTML={{ __html: readmeHtml }}
      />
    </section>
  );
}

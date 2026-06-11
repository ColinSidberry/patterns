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
      <p className="text-sm text-[#a6adc8]">
        Select a file from the tree to view its source.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-4 py-2 font-mono text-sm text-[#89b4fa]">
        README.md
      </div>
      <div
        className="prose prose-invert max-w-none px-6 py-5 prose-pre:bg-[#13131a] prose-code:text-[#cdd6f4] prose-a:text-[#89b4fa]"
        dangerouslySetInnerHTML={{ __html: readmeHtml }}
      />
    </section>
  );
}

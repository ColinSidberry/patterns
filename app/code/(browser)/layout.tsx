import Link from "next/link";
import { listFiles } from "@/lib/code-files";
import { buildTree } from "../tree";
import { CodeTree } from "../CodeTree";

// Persistent sidebar for the code browser. Wraps the index + file views (NOT
// /code/login, which lives outside this route group so the file tree is never
// shown to unauthenticated visitors). The layout doesn't remount on navigation,
// so the tree's expand state survives moving between files.
export default async function CodeBrowserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const files = await listFiles();
  const tree = buildTree(files);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden md:block">
        <div className="sticky top-6">
          {/* Single-line header (mb-3) to match the file-path header in main,
              so the tree panel and code panel tops align. */}
          <div className="mb-3 flex items-baseline justify-between">
            <Link
              href="/code"
              className="text-sm font-semibold text-[#cdd6f4] hover:text-[#89b4fa]"
            >
              Source code
            </Link>
            <span className="text-xs text-[#6c7086]">{files.length} files</span>
          </div>
          <div className="max-h-[82vh] overflow-y-auto pr-1">
            <CodeTree tree={tree} />
          </div>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

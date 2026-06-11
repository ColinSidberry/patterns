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
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <aside className="hidden w-72 shrink-0 md:block">
        <div className="sticky top-6">
          <Link
            href="/code"
            className="block text-sm font-semibold text-[#cdd6f4] hover:text-[#89b4fa]"
          >
            Source code
          </Link>
          <p className="mt-0.5 text-xs text-[#6c7086]">{files.length} files</p>
          <div className="mt-3 max-h-[82vh] overflow-y-auto pr-1">
            <CodeTree tree={tree} />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

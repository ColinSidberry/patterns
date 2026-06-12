import Link from "next/link";
import { listFiles } from "@/lib/code-files";
import { buildTree } from "../tree";
import { FileNav } from "../FileNav";

// Persistent GitHub-style sidebar for the code browser. Wraps the index + file
// views (NOT /code/login, which lives outside this route group so the file tree
// is never shown to unauthenticated visitors). The layout doesn't remount on
// navigation, so tree/search state survives moving between files.
export default async function CodeBrowserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const files = await listFiles();
  const tree = buildTree(files);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-6">
            <div className="mb-3 flex items-baseline justify-between">
              <Link
                href="/code"
                className="text-sm font-semibold text-[#e6edf3] hover:text-[#2f81f7]"
              >
                Files
              </Link>
              <span className="text-xs text-[#7d8590]">{files.length}</span>
            </div>
            <FileNav tree={tree} files={files} />
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

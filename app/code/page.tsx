import Link from "next/link";
import { listFiles } from "@/lib/code-files";

export const dynamic = "force-static";

// Group the flat file list by top-level directory for a readable index.
function groupByTopDir(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const f of files) {
    const slash = f.indexOf("/");
    const top = slash < 0 ? "(root)" : f.slice(0, slash);
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top)!.push(f);
  }
  return groups;
}

export default async function CodeIndex() {
  const files = await listFiles();
  const groups = groupByTopDir(files);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[#cdd6f4]">Source code</h1>
        <p className="mt-1 text-sm text-[#a6adc8]">
          {files.length} files · browse the implementation of this project.
        </p>
      </header>

      <div className="space-y-8">
        {[...groups.entries()].map(([dir, paths]) => (
          <section key={dir}>
            <h2 className="mb-2 font-mono text-sm text-[#89b4fa]">{dir}/</h2>
            <ul className="divide-y divide-white/5 rounded-lg border border-white/10 bg-white/[0.02]">
              {paths.map((p) => (
                <li key={p}>
                  <Link
                    href={`/code/${p.split("/").map(encodeURIComponent).join("/")}`}
                    className="block px-4 py-2 font-mono text-sm text-[#cdd6f4] hover:bg-white/[0.04]"
                  >
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

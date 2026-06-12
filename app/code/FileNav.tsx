"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CodeTree } from "./CodeTree";
import type { TreeNode } from "./tree";

function navHref(p: string): string {
  return `/code/${p.split("/").map(encodeURIComponent).join("/")}`;
}

export function FileNav({
  tree,
  files,
}: {
  tree: TreeNode[];
  files: string[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  // Press "t" (GitHub-style) or Cmd/Ctrl-K to focus the file finder.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing =
        el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "t" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const query = q.trim().toLowerCase();
  const matches = query
    ? files.filter((f) => f.toLowerCase().includes(query)).slice(0, 50)
    : [];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (matches[0]) router.push(navHref(matches[0]));
  }

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQ("")}
          placeholder="Go to file"
          className="mb-3 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-sm text-[#e6edf3] placeholder:text-[#6e7681] focus:border-[#2f81f7] focus:outline-none"
        />
      </form>

      {query ? (
        <ul className="max-h-[78vh] overflow-y-auto rounded-md border border-[#30363d]">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[#7d8590]">No matches</li>
          ) : (
            matches.map((f) => (
              <li key={f}>
                <a
                  href={navHref(f)}
                  className="block px-3 py-1.5 font-mono text-xs text-[#7d8590] hover:bg-[#161b22] hover:text-[#e6edf3]"
                >
                  {f}
                </a>
              </li>
            ))
          )}
        </ul>
      ) : (
        <div className="max-h-[78vh] overflow-y-auto">
          <CodeTree tree={tree} />
        </div>
      )}
    </div>
  );
}

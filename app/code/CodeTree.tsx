"use client";

import { useState } from "react";
import Link from "next/link";

export type TreeNode = {
  name: string;
  path?: string; // set on files (full rel path)
  children?: TreeNode[]; // set on folders
};

function hrefFor(path: string): string {
  return `/code/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function Folder({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(false); // collapsed by default, GitHub-style
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: depth * 16 + 8 }}
        className="flex w-full items-center gap-1.5 py-1 pr-2 text-left font-mono text-sm text-[#cdd6f4] hover:bg-white/[0.04]"
      >
        <span className="w-3 text-[#6c7086]">{open ? "▾" : "▸"}</span>
        <span className="text-[#89b4fa]">{node.name}/</span>
      </button>
      {open && (
        <ul>
          {node.children!.map((c) => (
            <NodeRow key={c.name} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function FileRow({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <li>
      <Link
        href={hrefFor(node.path!)}
        style={{ paddingLeft: depth * 16 + 8 + 18 }}
        className="flex items-center py-1 pr-2 font-mono text-sm text-[#a6adc8] hover:bg-white/[0.04] hover:text-[#cdd6f4]"
      >
        {node.name}
      </Link>
    </li>
  );
}

function NodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  return node.children ? (
    <Folder node={node} depth={depth} />
  ) : (
    <FileRow node={node} depth={depth} />
  );
}

export function CodeTree({ tree }: { tree: TreeNode[] }) {
  return (
    <ul className="rounded-lg border border-white/10 bg-white/[0.02] py-1">
      {tree.map((n) => (
        <NodeRow key={n.name} node={n} depth={0} />
      ))}
    </ul>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TreeNode } from "./tree";

function navHref(path: string): string {
  return `/code/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function Folder({
  node,
  depth,
  current,
}: {
  node: TreeNode;
  depth: number;
  current: string;
}) {
  const dirPath = `/code/${node.path}`;
  const containsActive = current === dirPath || current.startsWith(dirPath + "/");
  const [open, setOpen] = useState(containsActive); // expand to reveal active file
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: depth * 16 + 8 }}
        className="flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left font-mono text-sm text-[#e6edf3] hover:bg-[#161b22]"
      >
        <span className="w-3 text-[#7d8590]">{open ? "▾" : "▸"}</span>
        <span>{node.name}/</span>
      </button>
      {open && (
        <ul>
          {node.children!.map((c) => (
            <NodeRow key={c.name} node={c} depth={depth + 1} current={current} />
          ))}
        </ul>
      )}
    </li>
  );
}

function FileRow({
  node,
  depth,
  current,
}: {
  node: TreeNode;
  depth: number;
  current: string;
}) {
  const active = current === `/code/${node.path}`;
  return (
    <li>
      <Link
        href={navHref(node.path!)}
        style={{ paddingLeft: depth * 16 + 8 + 18 }}
        className={`flex items-center rounded py-1 pr-2 font-mono text-sm hover:bg-[#161b22] ${
          active
            ? "bg-[#161b22] text-[#e6edf3]"
            : "text-[#7d8590] hover:text-[#e6edf3]"
        }`}
      >
        {node.name}
      </Link>
    </li>
  );
}

function NodeRow(props: { node: TreeNode; depth: number; current: string }) {
  return props.node.children ? <Folder {...props} /> : <FileRow {...props} />;
}

export function CodeTree({ tree }: { tree: TreeNode[] }) {
  const current = decodeURIComponent(usePathname());
  return (
    <ul>
      {tree.map((n) => (
        <NodeRow key={n.name} node={n} depth={0} current={current} />
      ))}
    </ul>
  );
}

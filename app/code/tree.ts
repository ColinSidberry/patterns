// Shared tree types/builder for the /code viewer (used by the sidebar layout
// and the index). Pure — no IO, safe to import from server or client modules.

export type TreeNode = {
  name: string;
  path?: string; // files: full rel path; folders: dir path
  children?: TreeNode[];
};

// Build a nested folder tree from the flat path list, folders before files.
export function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode = { name: "", children: [] };
  for (const f of files) {
    const parts = f.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let child = node.children!.find((c) => c.name === part);
      if (!child) {
        child = isFile
          ? { name: part, path: f }
          : { name: part, path: parts.slice(0, i + 1).join("/"), children: [] };
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

export type TreeNode<T> = T & { children: TreeNode<T>[] };

export function buildTree<T extends { id: string; parentId: string | null; sortOrder: number }>(
  nodes: T[],
): TreeNode<T>[] {
  const map = new Map<string, TreeNode<T>>();
  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] });
  }

  const roots: TreeNode<T>[] = [];
  for (const node of nodes) {
    const current = map.get(node.id)!;
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(current);
    } else {
      roots.push(current);
    }
  }

  const sortRecursive = (list: TreeNode<T>[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const item of list) sortRecursive(item.children);
  };
  sortRecursive(roots);
  return roots;
}

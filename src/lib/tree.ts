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

export function mapTreeNode<T extends { id: string }>(
  nodes: TreeNode<T>[],
  id: string,
  map: (node: TreeNode<T>) => TreeNode<T>,
): TreeNode<T>[] {
  return nodes.map((node) => {
    if (node.id === id) return map(node);
    if (node.children.length === 0) return node;
    const children = mapTreeNode(node.children, id, map);
    return children === node.children ? node : { ...node, children };
  });
}

export function patchTreeNode<T extends { id: string }>(
  nodes: TreeNode<T>[],
  id: string,
  patch: Partial<T>,
): TreeNode<T>[] {
  return mapTreeNode(nodes, id, (node) => ({ ...node, ...patch }));
}

export function filterTreeNodes<T extends { id: string }>(
  nodes: TreeNode<T>[],
  predicate: (node: TreeNode<T>) => boolean,
): TreeNode<T>[] {
  return nodes.filter(predicate).map((node) => ({
    ...node,
    children: filterTreeNodes(node.children, predicate),
  }));
}

export function insertTreeChild<T extends { id: string }>(
  nodes: TreeNode<T>[],
  parentId: string | null,
  child: TreeNode<T>,
): TreeNode<T>[] {
  if (parentId === null) return [...nodes, child];
  return mapTreeNode(nodes, parentId, (node) => ({
    ...node,
    children: [...node.children, child],
  }));
}

export function moveTreeSibling<T extends { id: string }>(
  nodes: TreeNode<T>[],
  id: string,
  direction: "up" | "down",
): TreeNode<T>[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index !== -1) {
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= nodes.length) return nodes;
    const next = [...nodes];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    return next;
  }

  let changed = false;
  const next = nodes.map((node) => {
    const children = moveTreeSibling(node.children, id, direction);
    if (children === node.children) return node;
    changed = true;
    return { ...node, children };
  });
  return changed ? next : nodes;
}

export function nextSiblingSortOrder<T extends { sortOrder: number }>(
  siblings: T[],
): number {
  return siblings.reduce((max, node) => Math.max(max, node.sortOrder), -1) + 1;
}

export function findTreeSiblings<T extends { id: string }>(
  nodes: TreeNode<T>[],
  parentId: string | null,
): TreeNode<T>[] | null {
  if (parentId === null) return nodes;
  for (const node of nodes) {
    if (node.id === parentId) return node.children;
    const nested = findTreeSiblings(node.children, parentId);
    if (nested) return nested;
  }
  return null;
}

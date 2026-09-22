export function mapTreeNode(nodes, id, map) {
  return nodes.map((node) => {
    if (node.id === id) return map(node);
    if (!node.children?.length) return node;
    const children = mapTreeNode(node.children, id, map);
    return children === node.children ? node : { ...node, children };
  });
}

export function patchTreeNode(nodes, id, patch) {
  return mapTreeNode(nodes, id, (node) => ({ ...node, ...patch }));
}

export function filterTreeNodes(nodes, predicate) {
  return nodes.filter(predicate).map((node) => ({
    ...node,
    children: filterTreeNodes(node.children || [], predicate),
  }));
}

export function insertTreeChild(nodes, parentId, child) {
  if (parentId === null) return [...nodes, child];
  return mapTreeNode(nodes, parentId, (node) => ({
    ...node,
    children: [...(node.children || []), child],
  }));
}

export function moveTreeSibling(nodes, id, direction) {
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
    const children = moveTreeSibling(node.children || [], id, direction);
    if (children === node.children) return node;
    changed = true;
    return { ...node, children };
  });
  return changed ? next : nodes;
}

export function nextSiblingSortOrder(siblings) {
  return siblings.reduce((max, node) => Math.max(max, node.sortOrder ?? 0), -1) + 1;
}

export function findTreeSiblings(nodes, parentId) {
  if (parentId === null) return nodes;
  for (const node of nodes) {
    if (node.id === parentId) return node.children || [];
    const nested = findTreeSiblings(node.children || [], parentId);
    if (nested) return nested;
  }
  return null;
}

export function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findNode(node.children || [], id);
    if (nested) return nested;
  }
  return null;
}

export function walkTree(nodes, fn) {
  for (const node of nodes) {
    fn(node);
    if (node.children?.length) walkTree(node.children, fn);
  }
}

export function reindexTree(nodes) {
  return nodes.map((node, index) => ({
    ...node,
    sortOrder: index,
    children: reindexTree(node.children || []),
  }));
}

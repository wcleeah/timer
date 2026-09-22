import { describe, expect, test } from "bun:test";
import { insertTreeChild, moveTreeSibling, patchTreeNode } from "./public/js/tree.js";

describe("tree", () => {
  test("patches a nested node", () => {
    const tree = [
      {
        id: "g",
        children: [{ id: "t", name: "old", children: [] }],
      },
    ];
    const next = patchTreeNode(tree, "t", { name: "new" });
    expect(next[0].children[0].name).toBe("new");
    expect(tree[0].children[0].name).toBe("old");
  });

  test("moves siblings", () => {
    const tree = [
      { id: "a", children: [] },
      { id: "b", children: [] },
    ];
    const down = moveTreeSibling(tree, "a", "down");
    expect(down.map((n) => n.id)).toEqual(["b", "a"]);
  });

  test("inserts a root child", () => {
    const tree = insertTreeChild([], null, { id: "n", children: [] });
    expect(tree).toHaveLength(1);
  });
});

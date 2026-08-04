"use client";

import {
  addPresetNode,
  deletePresetNode,
  movePresetNode,
  updatePresetNode,
} from "@/app/actions/presets";
import { DurationFields } from "@/components/DurationFields";
import type { PresetNode } from "@/db/schema";
import {
  filterTreeNodes,
  findTreeSiblings,
  insertTreeChild,
  moveTreeSibling,
  nextSiblingSortOrder,
  patchTreeNode,
  type TreeNode,
} from "@/lib/tree";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";

const field =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";
const ghostBtn =
  "rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground";
const dangerBtn =
  "rounded-md border border-border px-2 py-1 text-xs text-danger hover:bg-danger-soft";

type OptimisticUpdate = (tree: TreeNode<PresetNode>[]) => TreeNode<PresetNode>[];

function createPresetChild(
  presetId: string,
  parentId: string | null,
  kind: "group" | "timer",
  sortOrder: number,
): TreeNode<PresetNode> {
  const isTimer = kind === "timer";
  return {
    id: crypto.randomUUID(),
    presetId,
    parentId,
    kind,
    name: isTimer ? "New timer" : "New group",
    sortOrder,
    mode: isTimer ? "countdown" : null,
    durationMs: isTimer ? 25 * 60_000 : null,
    note: "",
    children: [],
  };
}

function NodeEditor({
  node,
  presetId,
  depth,
  tree,
  runAction,
}: {
  node: TreeNode<PresetNode>;
  presetId: string;
  depth: number;
  tree: TreeNode<PresetNode>[];
  runAction: (update: OptimisticUpdate, action: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(true);
  const pad = Math.min(depth, 6) * 12;

  const addChild = (kind: "group" | "timer") => {
    const siblings = findTreeSiblings(tree, node.id) ?? [];
    const created = createPresetChild(
      presetId,
      node.id,
      kind,
      nextSiblingSortOrder(siblings),
    );
    runAction(
      (current) => insertTreeChild(current, node.id, created),
      () =>
        addPresetNode({
          id: created.id,
          presetId,
          parentId: node.id,
          kind,
          sortOrder: created.sortOrder,
        }),
    );
  };

  if (node.kind === "group") {
    return (
      <div style={{ marginLeft: pad }}>
        <div className="border-b border-border px-2 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-muted"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Collapse" : "Expand"}
            >
              <span
                className={`inline-block transition ${open ? "rotate-90" : ""}`}
              >
                ▸
              </span>
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              defaultValue={node.name}
              onBlur={(e) => {
                const name = e.target.value;
                if (name === node.name) return;
                runAction(
                  (current) => patchTreeNode(current, node.id, { name }),
                  () => updatePresetNode({ id: node.id, presetId, name }),
                );
              }}
            />
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className={ghostBtn}
                onClick={() => addChild("group")}
              >
                + Group
              </button>
              <button
                type="button"
                className={ghostBtn}
                onClick={() => addChild("timer")}
              >
                + Timer
              </button>
              <button
                type="button"
                className={ghostBtn}
                onClick={() =>
                  runAction(
                    (current) => moveTreeSibling(current, node.id, "up"),
                    () => movePresetNode(node.id, presetId, "up"),
                  )
                }
              >
                ↑
              </button>
              <button
                type="button"
                className={ghostBtn}
                onClick={() =>
                  runAction(
                    (current) => moveTreeSibling(current, node.id, "down"),
                    () => movePresetNode(node.id, presetId, "down"),
                  )
                }
              >
                ↓
              </button>
              <button
                type="button"
                className={dangerBtn}
                onClick={() =>
                  runAction(
                    (current) =>
                      filterTreeNodes(current, (n) => n.id !== node.id),
                    () => deletePresetNode(node.id, presetId),
                  )
                }
              >
                Del
              </button>
            </div>
          </div>
        </div>
        {open &&
          node.children.map((child) => (
            <NodeEditor
              key={child.id}
              node={child}
              presetId={presetId}
              depth={depth + 1}
              tree={tree}
              runAction={runAction}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      style={{ marginLeft: pad }}
      className="border-b border-border px-2 py-2"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
          timer
        </span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          defaultValue={node.name}
          onBlur={(e) => {
            const name = e.target.value;
            if (name === node.name) return;
            runAction(
              (current) => patchTreeNode(current, node.id, { name }),
              () => updatePresetNode({ id: node.id, presetId, name }),
            );
          }}
        />
      </div>
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] text-muted">
          Mode
          <select
            className={field}
            value={node.mode ?? "countdown"}
            onChange={(e) => {
              const mode = e.target.value as
                | "countdown"
                | "stopwatch"
                | "recurring";
              runAction(
                (current) => patchTreeNode(current, node.id, { mode }),
                () => updatePresetNode({ id: node.id, presetId, mode }),
              );
            }}
          >
            <option value="countdown">Countdown</option>
            <option value="stopwatch">Stopwatch</option>
            <option value="recurring">∞ Recurring</option>
          </select>
        </label>
        <div className="space-y-1 text-[11px] text-muted">
          Duration
          <DurationFields
            key={node.durationMs ?? 0}
            ms={node.durationMs ?? 0}
            onSave={(durationMs) =>
              runAction(
                (current) => patchTreeNode(current, node.id, { durationMs }),
                () =>
                  updatePresetNode({ id: node.id, presetId, durationMs }),
              )
            }
          />
        </div>
      </div>
      <label className="mb-2 block space-y-1 text-[11px] text-muted">
        Note
        <textarea
          className={`${field} min-h-12`}
          defaultValue={node.note}
          onBlur={(e) => {
            const note = e.target.value;
            if (note === node.note) return;
            runAction(
              (current) => patchTreeNode(current, node.id, { note }),
              () => updatePresetNode({ id: node.id, presetId, note }),
            );
          }}
        />
      </label>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={ghostBtn}
          onClick={() =>
            runAction(
              (current) => moveTreeSibling(current, node.id, "up"),
              () => movePresetNode(node.id, presetId, "up"),
            )
          }
        >
          ↑
        </button>
        <button
          type="button"
          className={ghostBtn}
          onClick={() =>
            runAction(
              (current) => moveTreeSibling(current, node.id, "down"),
              () => movePresetNode(node.id, presetId, "down"),
            )
          }
        >
          ↓
        </button>
        <button
          type="button"
          className={dangerBtn}
          onClick={() =>
            runAction(
              (current) => filterTreeNodes(current, (n) => n.id !== node.id),
              () => deletePresetNode(node.id, presetId),
            )
          }
        >
          Del
        </button>
      </div>
    </div>
  );
}

export function PresetTreeEditor({
  presetId,
  tree,
  onBusyChange,
}: {
  presetId: string;
  tree: TreeNode<PresetNode>[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticTree, applyOptimistic] = useOptimistic(
    tree,
    (_current, update: OptimisticUpdate) => update(_current),
  );

  useEffect(() => {
    onBusyChange?.(pending);
  }, [pending, onBusyChange]);

  const runAction = (
    update: OptimisticUpdate,
    action: () => Promise<void>,
  ) => {
    startTransition(async () => {
      applyOptimistic(update);
      try {
        await action();
      } catch {
        router.refresh();
      }
    });
  };

  const addRoot = (kind: "group" | "timer") => {
    const created = createPresetChild(
      presetId,
      null,
      kind,
      nextSiblingSortOrder(optimisticTree),
    );
    runAction(
      (current) => insertTreeChild(current, null, created),
      () =>
        addPresetNode({
          id: created.id,
          presetId,
          parentId: null,
          kind,
          sortOrder: created.sortOrder,
        }),
    );
  };

  return (
    <div>
      <div className="mb-2 grid grid-cols-2 gap-1">
        <button
          type="button"
          className={`${ghostBtn} w-full py-2 text-center`}
          onClick={() => addRoot("group")}
        >
          + Group
        </button>
        <button
          type="button"
          className="w-full rounded-md border border-border bg-accent-soft px-2 py-2 text-center text-xs text-accent hover:bg-surface-2"
          onClick={() => addRoot("timer")}
        >
          + Timer
        </button>
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        {optimisticTree.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">
            Add groups and timers to build this preset.
          </p>
        ) : (
          optimisticTree.map((node) => (
            <NodeEditor
              key={node.id}
              node={node}
              presetId={presetId}
              depth={0}
              tree={optimisticTree}
              runAction={runAction}
            />
          ))
        )}
      </div>
    </div>
  );
}

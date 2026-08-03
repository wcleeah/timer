"use client";

import {
  addPresetNode,
  deletePresetNode,
  movePresetNode,
  updatePresetNode,
} from "@/app/actions/presets";
import type { PresetNode } from "@/db/schema";
import { formatDuration, parseDurationInput } from "@/lib/timer-math";
import type { TreeNode } from "@/lib/tree";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const field =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";
const ghostBtn =
  "rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50";
const dangerBtn =
  "rounded-md border border-border px-2 py-1 text-xs text-danger hover:bg-danger-soft disabled:opacity-50";

function DurationField({
  ms,
  onSave,
}: {
  ms: number | null;
  onSave: (ms: number) => void;
}) {
  const [value, setValue] = useState(formatDuration(ms ?? 0));

  return (
    <input
      className={`${field} font-mono`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const parsed = parseDurationInput(value);
        if (parsed !== null) {
          onSave(parsed);
          setValue(formatDuration(parsed));
        } else {
          setValue(formatDuration(ms ?? 0));
        }
      }}
      placeholder="mm:ss"
      inputMode="numeric"
    />
  );
}

function NodeEditor({
  node,
  presetId,
  depth,
}: {
  node: TreeNode<PresetNode>;
  presetId: string;
  depth: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const pad = Math.min(depth, 6) * 12;

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
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
              <span className={`inline-block transition ${open ? "rotate-90" : ""}`}>
                ▸
              </span>
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              defaultValue={node.name}
              onBlur={(e) =>
                run(() =>
                  updatePresetNode({
                    id: node.id,
                    presetId,
                    name: e.target.value,
                  }),
                )
              }
            />
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={pending}
                className={ghostBtn}
                onClick={() =>
                  run(() =>
                    addPresetNode({
                      presetId,
                      parentId: node.id,
                      kind: "group",
                    }),
                  )
                }
              >
                + Group
              </button>
              <button
                type="button"
                disabled={pending}
                className={ghostBtn}
                onClick={() =>
                  run(() =>
                    addPresetNode({
                      presetId,
                      parentId: node.id,
                      kind: "timer",
                    }),
                  )
                }
              >
                + Timer
              </button>
              <button
                type="button"
                disabled={pending}
                className={ghostBtn}
                onClick={() =>
                  run(() => movePresetNode(node.id, presetId, "up"))
                }
              >
                ↑
              </button>
              <button
                type="button"
                disabled={pending}
                className={ghostBtn}
                onClick={() =>
                  run(() => movePresetNode(node.id, presetId, "down"))
                }
              >
                ↓
              </button>
              <button
                type="button"
                disabled={pending}
                className={dangerBtn}
                onClick={() =>
                  run(() => deletePresetNode(node.id, presetId))
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
            />
          ))}
      </div>
    );
  }

  return (
    <div style={{ marginLeft: pad }} className="border-b border-border px-2 py-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
          timer
        </span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          defaultValue={node.name}
          onBlur={(e) =>
            run(() =>
              updatePresetNode({
                id: node.id,
                presetId,
                name: e.target.value,
              }),
            )
          }
        />
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <label className="space-y-1 text-[11px] text-muted">
          Mode
          <select
            className={field}
            defaultValue={node.mode ?? "countdown"}
            onChange={(e) =>
              run(() =>
                updatePresetNode({
                  id: node.id,
                  presetId,
                  mode: e.target.value as "countdown" | "stopwatch",
                }),
              )
            }
          >
            <option value="countdown">Countdown</option>
            <option value="stopwatch">Stopwatch</option>
          </select>
        </label>
        <label className="space-y-1 text-[11px] text-muted">
          Duration
          <DurationField
            ms={node.durationMs}
            onSave={(durationMs) =>
              run(() =>
                updatePresetNode({ id: node.id, presetId, durationMs }),
              )
            }
          />
        </label>
      </div>
      <label className="mb-2 block space-y-1 text-[11px] text-muted">
        Note
        <textarea
          className={`${field} min-h-12`}
          defaultValue={node.note}
          onBlur={(e) =>
            run(() =>
              updatePresetNode({
                id: node.id,
                presetId,
                note: e.target.value,
              }),
            )
          }
        />
      </label>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          disabled={pending}
          className={ghostBtn}
          onClick={() => run(() => movePresetNode(node.id, presetId, "up"))}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={pending}
          className={ghostBtn}
          onClick={() => run(() => movePresetNode(node.id, presetId, "down"))}
        >
          ↓
        </button>
        <button
          type="button"
          disabled={pending}
          className={dangerBtn}
          onClick={() => run(() => deletePresetNode(node.id, presetId))}
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
}: {
  presetId: string;
  tree: TreeNode<PresetNode>[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        <button
          type="button"
          disabled={pending}
          className={ghostBtn}
          onClick={() =>
            run(() =>
              addPresetNode({ presetId, parentId: null, kind: "group" }),
            )
          }
        >
          + Group
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-md border border-border bg-accent-soft px-2 py-1 text-xs text-accent hover:bg-surface-2 disabled:opacity-50"
          onClick={() =>
            run(() =>
              addPresetNode({ presetId, parentId: null, kind: "timer" }),
            )
          }
        >
          + Timer
        </button>
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        {tree.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">
            Add groups and timers to build this preset.
          </p>
        ) : (
          tree.map((node) => (
            <NodeEditor
              key={node.id}
              node={node}
              presetId={presetId}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  );
}

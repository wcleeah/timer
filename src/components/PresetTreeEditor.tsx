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
      className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-teal-50 outline-none focus:border-amber-300/50"
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
      <div className="space-y-2" style={{ marginLeft: pad }}>
        <div className="rounded-2xl border border-teal-400/15 bg-teal-950/40 p-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="mt-1 text-teal-200/70"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Collapse" : "Expand"}
            >
              {open ? "▾" : "▸"}
            </button>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                className="w-full bg-transparent text-base font-semibold text-teal-50 outline-none"
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg bg-white/5 px-3 py-2 text-xs text-teal-100"
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
                  className="rounded-lg bg-amber-400/15 px-3 py-2 text-xs text-amber-200"
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
                  className="rounded-lg bg-white/5 px-3 py-2 text-xs text-teal-100/70"
                  onClick={() =>
                    run(() => movePresetNode(node.id, presetId, "up"))
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg bg-white/5 px-3 py-2 text-xs text-teal-100/70"
                  onClick={() =>
                    run(() => movePresetNode(node.id, presetId, "down"))
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                  onClick={() =>
                    run(() => deletePresetNode(node.id, presetId))
                  }
                >
                  Delete
                </button>
              </div>
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
    <div className="space-y-2" style={{ marginLeft: pad }}>
      <div className="rounded-2xl border border-amber-300/20 bg-[#14201c] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <input
          className="mb-2 w-full bg-transparent text-base font-semibold text-amber-50 outline-none"
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
        <div className="mb-2 grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs text-teal-100/60">
            Mode
            <select
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-teal-50"
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
          <label className="space-y-1 text-xs text-teal-100/60">
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
        <label className="mb-2 block space-y-1 text-xs text-teal-100/60">
          Note
          <textarea
            className="min-h-16 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-teal-50 outline-none focus:border-amber-300/50"
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs text-teal-100/70"
            onClick={() => run(() => movePresetNode(node.id, presetId, "up"))}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs text-teal-100/70"
            onClick={() => run(() => movePresetNode(node.id, presetId, "down"))}
          >
            ↓
          </button>
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
            onClick={() => run(() => deletePresetNode(node.id, presetId))}
          >
            Delete
          </button>
        </div>
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-xl bg-white/5 px-4 py-3 text-sm text-teal-100"
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
          className="rounded-xl bg-amber-400/20 px-4 py-3 text-sm font-medium text-amber-100"
          onClick={() =>
            run(() =>
              addPresetNode({ presetId, parentId: null, kind: "timer" }),
            )
          }
        >
          + Timer
        </button>
      </div>
      {tree.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-teal-100/50">
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
  );
}

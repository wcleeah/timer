"use client";

import {
  completeTimer,
  pauseTimer,
  resetTimer,
  setTimerMs,
  startTimer,
  uncompleteTimer,
  updateRunNodeNote,
} from "@/app/actions/runs";
import { DurationFields } from "@/components/DurationFields";
import type { RunNode } from "@/db/schema";
import { displayMs, formatDuration, hasHitZero } from "@/lib/timer-math";
import { patchTreeNode, type TreeNode } from "@/lib/tree";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

const field =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";
const ghostBtn =
  "rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground";

type OptimisticUpdate = (tree: TreeNode<RunNode>[]) => TreeNode<RunNode>[];

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close(), 800);
  } catch {
    // ignore audio failures
  }
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function LiveTime({
  node,
  expired,
}: {
  node: RunNode;
  expired?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const running =
    node.status === "running"
      ? `${String(node.endsAt)}:${String(node.runningSince)}`
      : "stopped";

  useEffect(() => {
    if (node.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [node.status, running]);

  return (
    <span
      className={`timer-display font-mono text-2xl tracking-tight tabular-nums ${
        expired ? "text-danger" : "text-code"
      }`}
    >
      {formatDuration(displayMs(node, now))}
    </span>
  );
}

function optimisticStart(node: RunNode): Partial<RunNode> {
  const now = Date.now();
  if (node.mode === "countdown") {
    const remaining = node.remainingMs ?? node.durationMs ?? 0;
    return {
      status: "running",
      endsAt: new Date(now + remaining),
      runningSince: null,
    };
  }
  return {
    status: "running",
    runningSince: new Date(now),
    endsAt: null,
  };
}

function optimisticPause(node: RunNode): Partial<RunNode> {
  const now = Date.now();
  if (node.mode === "countdown") {
    const endsAt = asDate(node.endsAt);
    const remaining = endsAt
      ? Math.max(0, endsAt.getTime() - now)
      : (node.remainingMs ?? 0);
    return {
      status: "paused",
      remainingMs: remaining,
      endsAt: null,
      completedAt: null,
    };
  }

  const runningSince = asDate(node.runningSince);
  const elapsed =
    (node.elapsedMs ?? 0) + (runningSince ? now - runningSince.getTime() : 0);
  return {
    status: "paused",
    elapsedMs: elapsed,
    runningSince: null,
  };
}

function optimisticReset(node: RunNode): Partial<RunNode> {
  return {
    status: "idle",
    remainingMs: node.durationMs ?? 0,
    elapsedMs: 0,
    endsAt: null,
    runningSince: null,
    completedAt: null,
  };
}

function optimisticComplete(node: RunNode): Partial<RunNode> {
  const now = Date.now();
  let remainingMs = node.remainingMs ?? node.durationMs ?? 0;
  let elapsedMs = node.elapsedMs ?? 0;

  if (node.status === "running") {
    const endsAt = asDate(node.endsAt);
    const runningSince = asDate(node.runningSince);
    if (node.mode === "countdown" && endsAt) {
      remainingMs = Math.max(0, endsAt.getTime() - now);
    }
    if (node.mode === "stopwatch" && runningSince) {
      elapsedMs += now - runningSince.getTime();
    }
  }

  return {
    status: "completed",
    remainingMs,
    elapsedMs,
    endsAt: null,
    runningSince: null,
    completedAt: new Date(now),
  };
}

function TimerCard({
  node,
  runAction,
}: {
  node: RunNode;
  runAction: (update: OptimisticUpdate, action: () => Promise<void>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editMs, setEditMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const alarmedRef = useRef(false);
  const endsKey = String(node.endsAt);
  const expired =
    node.status === "running" &&
    node.mode === "countdown" &&
    hasHitZero(node, now);

  useEffect(() => {
    if (node.status !== "running" || node.mode !== "countdown") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [node.status, node.mode, endsKey]);

  useEffect(() => {
    if (!expired) {
      alarmedRef.current = false;
      return;
    }
    if (alarmedRef.current) return;
    alarmedRef.current = true;
    playBeep();
  }, [expired]);

  const primary =
    node.status === "running" ? (
      <button
        type="button"
        className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2"
        onClick={() =>
          runAction(
            (tree) => patchTreeNode(tree, node.id, optimisticPause(node)),
            () => pauseTimer(node.id),
          )
        }
      >
        Pause
      </button>
    ) : (
      <button
        type="button"
        className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg"
        onClick={() =>
          runAction(
            (tree) => patchTreeNode(tree, node.id, optimisticStart(node)),
            () => startTimer(node.id),
          )
        }
      >
        {node.status === "paused" ? "Resume" : "Start"}
      </button>
    );

  return (
    <div
      className={`border-b border-border px-3 py-2.5 transition ${
        expired
          ? "timer-expired"
          : node.status === "running"
            ? "bg-running-soft"
            : node.status === "completed"
              ? "opacity-60"
              : "bg-background"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-medium">{node.name}</h3>
        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
          {node.mode}
        </span>
      </div>
      <div className="mb-2">
        <LiveTime
          key={`${node.id}-${node.status}-${String(node.endsAt)}-${String(node.runningSince)}`}
          node={node}
          expired={expired}
        />
      </div>
      <label className="mb-2 block space-y-1 text-[11px] text-muted">
        Note
        <textarea
          className={`${field} min-h-10`}
          defaultValue={node.note}
          onBlur={(e) => {
            if (e.target.value === node.note) return;
            const note = e.target.value;
            runAction(
              (tree) => patchTreeNode(tree, node.id, { note }),
              () => updateRunNodeNote(node.id, note),
            );
          }}
        />
      </label>

      {editing ? (
        <div className="mb-2 space-y-2">
          <DurationFields key={`edit-${node.id}`} ms={editMs} onSave={setEditMs} />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg"
              onClick={() => {
                const ms = editMs;
                setEditing(false);
                runAction(
                  (tree) =>
                    patchTreeNode(
                      tree,
                      node.id,
                      node.mode === "countdown"
                        ? {
                            remainingMs: ms,
                            status:
                              node.status === "running"
                                ? "running"
                                : node.status === "idle"
                                  ? "paused"
                                  : node.status,
                            endsAt:
                              node.status === "running"
                                ? new Date(Date.now() + ms)
                                : null,
                            runningSince: null,
                          }
                        : {
                            elapsedMs: ms,
                            status:
                              node.status === "running"
                                ? "running"
                                : node.status === "idle"
                                  ? "paused"
                                  : node.status,
                            runningSince:
                              node.status === "running" ? new Date() : null,
                            endsAt: null,
                          },
                    ),
                  () => setTimerMs(node.id, ms),
                );
              }}
            >
              Save
            </button>
            <button
              type="button"
              className={ghostBtn}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {node.status !== "completed" ? primary : null}
        {node.status !== "completed" ? (
          <>
            <button
              type="button"
              className={ghostBtn}
              onClick={() =>
                runAction(
                  (tree) => patchTreeNode(tree, node.id, optimisticReset(node)),
                  () => resetTimer(node.id),
                )
              }
            >
              Reset
            </button>
            <button
              type="button"
              className={ghostBtn}
              onClick={() => {
                setEditMs(displayMs(node));
                setEditing((v) => !v);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-danger hover:bg-danger-soft"
              onClick={() =>
                runAction(
                  (tree) =>
                    patchTreeNode(tree, node.id, optimisticComplete(node)),
                  () => completeTimer(node.id),
                )
              }
            >
              Done
            </button>
          </>
        ) : (
          <button
            type="button"
            className={ghostBtn}
            onClick={() =>
              runAction(
                (tree) =>
                  patchTreeNode(tree, node.id, {
                    status: "paused",
                    completedAt: null,
                  }),
                () => uncompleteTimer(node.id),
              )
            }
          >
            Restore
          </button>
        )}
      </div>
    </div>
  );
}

function RunTree({
  nodes,
  showCompleted,
  runAction,
  depth = 0,
}: {
  nodes: TreeNode<RunNode>[];
  showCompleted: boolean;
  runAction: (update: OptimisticUpdate, action: () => Promise<void>) => void;
  depth?: number;
}) {
  return (
    <div>
      {nodes.map((node) => {
        if (node.kind === "group") {
          const anyVisible = (n: TreeNode<RunNode>): boolean => {
            if (n.kind === "timer") {
              return showCompleted || n.status !== "completed";
            }
            return n.children.some(anyVisible);
          };
          if (!showCompleted && node.children.length > 0 && !anyVisible(node)) {
            return null;
          }
          return (
            <details
              key={node.id}
              open
              className="border-b border-border"
              style={{ marginLeft: Math.min(depth, 4) * 10 }}
            >
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium hover:bg-surface">
                <span className="chevron mr-1.5 inline-block text-muted transition">
                  ▸
                </span>
                {node.name}
              </summary>
              <RunTree
                nodes={node.children}
                showCompleted={showCompleted}
                runAction={runAction}
                depth={depth + 1}
              />
            </details>
          );
        }

        if (!showCompleted && node.status === "completed") return null;

        return (
          <div
            key={node.id}
            style={{ marginLeft: Math.min(depth, 4) * 10 }}
          >
            <TimerCard node={node} runAction={runAction} />
          </div>
        );
      })}
    </div>
  );
}

export function RunView({ tree }: { tree: TreeNode<RunNode>[] }) {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(false);
  const [, startTransition] = useTransition();
  const [optimisticTree, applyOptimistic] = useOptimistic(
    tree,
    (_current, update: OptimisticUpdate) => update(_current),
  );

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

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
          className="size-3.5 accent-accent"
        />
        Show completed
      </label>
      <div className="overflow-hidden rounded-md border border-border">
        <RunTree
          nodes={optimisticTree}
          showCompleted={showCompleted}
          runAction={runAction}
        />
      </div>
    </div>
  );
}

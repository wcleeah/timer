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
import type { RunNode } from "@/db/schema";
import {
  displayMs,
  formatDuration,
  hasHitZero,
  parseDurationInput,
} from "@/lib/timer-math";
import type { TreeNode } from "@/lib/tree";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const field =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";
const ghostBtn =
  "rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50";

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

function LiveTime({ node }: { node: RunNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (node.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [node.status, node.endsAt, node.runningSince, node.id]);

  return (
    <span className="font-mono text-2xl tracking-tight tabular-nums text-code">
      {formatDuration(displayMs(node, now))}
    </span>
  );
}

function TimerCard({ node }: { node: RunNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [alarming, setAlarming] = useState(false);
  const alarmedRef = useRef(false);

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  useEffect(() => {
    if (node.status !== "running" || node.mode !== "countdown") {
      alarmedRef.current = false;
      return;
    }

    const tick = () => {
      if (!hasHitZero(node) || alarmedRef.current) return;
      alarmedRef.current = true;
      setAlarming(true);
      playBeep();
      startTransition(async () => {
        await completeTimer(node.id);
        router.refresh();
      });
      window.setTimeout(() => setAlarming(false), 1600);
    };

    const id = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(id);
  }, [node, router]);

  const primary =
    node.status === "running" ? (
      <button
        type="button"
        disabled={pending}
        className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50"
        onClick={() => run(() => pauseTimer(node.id))}
      >
        Pause
      </button>
    ) : (
      <button
        type="button"
        disabled={pending}
        className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg disabled:opacity-50"
        onClick={() => run(() => startTimer(node.id))}
      >
        {node.status === "paused" ? "Resume" : "Start"}
      </button>
    );

  return (
    <div
      className={`border-b border-border px-3 py-2.5 transition ${
        alarming
          ? "timer-shake bg-accent-soft"
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
        <LiveTime node={node} />
      </div>
      <label className="mb-2 block space-y-1 text-[11px] text-muted">
        Note
        <textarea
          className={`${field} min-h-10`}
          defaultValue={node.note}
          onBlur={(e) => {
            if (e.target.value !== node.note) {
              run(() => updateRunNodeNote(node.id, e.target.value));
            }
          }}
        />
      </label>

      {editing ? (
        <div className="mb-2 flex gap-2">
          <input
            className={`${field} font-mono`}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={
              node.mode === "countdown" ? "mm:ss remaining" : "mm:ss elapsed"
            }
            inputMode="numeric"
          />
          <button
            type="button"
            className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg"
            onClick={() => {
              const parsed = parseDurationInput(editValue);
              if (parsed === null) return;
              setEditing(false);
              run(() => setTimerMs(node.id, parsed));
            }}
          >
            Save
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {node.status !== "completed" ? primary : null}
        {node.status !== "completed" ? (
          <>
            <button
              type="button"
              disabled={pending}
              className={ghostBtn}
              onClick={() => run(() => resetTimer(node.id))}
            >
              Reset
            </button>
            <button
              type="button"
              disabled={pending}
              className={ghostBtn}
              onClick={() => {
                setEditValue(formatDuration(displayMs(node)));
                setEditing((v) => !v);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-danger hover:bg-danger-soft disabled:opacity-50"
              onClick={() => run(() => completeTimer(node.id))}
            >
              Done
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            className={ghostBtn}
            onClick={() => run(() => uncompleteTimer(node.id))}
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
  depth = 0,
}: {
  nodes: TreeNode<RunNode>[];
  showCompleted: boolean;
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
            <TimerCard node={node} />
          </div>
        );
      })}
    </div>
  );
}

export function RunView({ tree }: { tree: TreeNode<RunNode>[] }) {
  const [showCompleted, setShowCompleted] = useState(false);

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
        <RunTree nodes={tree} showCompleted={showCompleted} />
      </div>
    </div>
  );
}

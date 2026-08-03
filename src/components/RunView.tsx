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
    <span className="font-[family-name:var(--font-timer)] text-4xl tracking-tight tabular-nums text-amber-50">
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
        className="flex-1 rounded-xl bg-teal-300/15 px-4 py-3 text-sm font-medium text-teal-100"
        onClick={() => run(() => pauseTimer(node.id))}
      >
        Pause
      </button>
    ) : (
      <button
        type="button"
        disabled={pending}
        className="flex-1 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-[#13201b]"
        onClick={() => run(() => startTimer(node.id))}
      >
        {node.status === "paused" ? "Resume" : "Start"}
      </button>
    );

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        alarming
          ? "timer-shake border-amber-300 bg-amber-400/20"
          : node.status === "running"
            ? "border-amber-300/40 bg-[#1a2a24]"
            : node.status === "completed"
              ? "border-white/10 bg-white/5 opacity-70"
              : "border-white/10 bg-[#14201c]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="truncate text-base font-semibold text-teal-50">
          {node.name}
        </h3>
        <span className="rounded-md bg-black/30 px-2 py-1 text-[10px] uppercase tracking-wider text-teal-100/60">
          {node.mode}
        </span>
      </div>
      <div className="mb-3">
        <LiveTime node={node} />
      </div>
      <label className="mb-3 block space-y-1 text-xs text-teal-100/55">
        Note
        <textarea
          className="min-h-14 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-teal-50 outline-none focus:border-amber-300/40"
          defaultValue={node.note}
          onBlur={(e) => {
            if (e.target.value !== node.note) {
              run(() => updateRunNodeNote(node.id, e.target.value));
            }
          }}
        />
      </label>

      {editing ? (
        <div className="mb-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-teal-50"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={node.mode === "countdown" ? "mm:ss remaining" : "mm:ss elapsed"}
            inputMode="numeric"
          />
          <button
            type="button"
            className="rounded-lg bg-amber-400/20 px-3 py-2 text-sm text-amber-100"
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

      <div className="flex flex-wrap gap-2">
        {node.status !== "completed" ? primary : null}
        {node.status !== "completed" ? (
          <>
            <button
              type="button"
              disabled={pending}
              className="rounded-xl bg-white/5 px-3 py-3 text-sm text-teal-100/80"
              onClick={() => run(() => resetTimer(node.id))}
            >
              Reset
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-xl bg-white/5 px-3 py-3 text-sm text-teal-100/80"
              onClick={() => {
                setEditValue(formatDuration(displayMs(node)));
                setEditing((v) => !v);
              }}
            >
              Edit time
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-xl bg-rose-500/15 px-3 py-3 text-sm text-rose-100"
              onClick={() => run(() => completeTimer(node.id))}
            >
              Complete
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            className="rounded-xl bg-white/5 px-3 py-3 text-sm text-teal-100/80"
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
    <div className="space-y-3">
      {nodes.map((node) => {
        if (node.kind === "group") {
          const visibleChildren = node.children.filter((child) => {
            if (child.kind === "group") return true;
            return showCompleted || child.status !== "completed";
          });
          if (!showCompleted && visibleChildren.length === 0) {
            const hasAnyTimer = (n: TreeNode<RunNode>): boolean =>
              n.kind === "timer" || n.children.some(hasAnyTimer);
            if (!node.children.some(hasAnyTimer)) {
              // empty group still shown
            } else {
              const anyVisible = (n: TreeNode<RunNode>): boolean => {
                if (n.kind === "timer") {
                  return showCompleted || n.status !== "completed";
                }
                return n.children.some(anyVisible);
              };
              if (!anyVisible(node)) return null;
            }
          }
          return (
            <details
              key={node.id}
              open
              className="rounded-2xl border border-teal-400/15 bg-teal-950/30 p-3"
              style={{ marginLeft: Math.min(depth, 4) * 8 }}
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-teal-100">
                <span className="mr-2 text-teal-100/50">▸</span>
                {node.name}
              </summary>
              <div className="mt-3">
                <RunTree
                  nodes={node.children}
                  showCompleted={showCompleted}
                  depth={depth + 1}
                />
              </div>
            </details>
          );
        }

        if (!showCompleted && node.status === "completed") return null;

        return (
          <div
            key={node.id}
            style={{ marginLeft: Math.min(depth, 4) * 8 }}
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
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-teal-100/70">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
          className="size-4 accent-amber-400"
        />
        Show completed
      </label>
      <RunTree nodes={tree} showCompleted={showCompleted} />
    </div>
  );
}

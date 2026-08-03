import type { RunNode } from "@/db/schema";

export type TimerMode = "countdown" | "stopwatch";
export type TimerStatus = "idle" | "running" | "paused" | "completed";

export function displayMs(node: RunNode, now = Date.now()): number {
  if (node.kind !== "timer") return 0;

  if (node.mode === "countdown") {
    if (node.status === "running" && node.endsAt) {
      return Math.max(0, node.endsAt.getTime() - now);
    }
    return Math.max(0, node.remainingMs ?? node.durationMs ?? 0);
  }

  // stopwatch
  if (node.status === "running" && node.runningSince) {
    return (node.elapsedMs ?? 0) + (now - node.runningSince.getTime());
  }
  return Math.max(0, node.elapsedMs ?? 0);
}

export function hasHitZero(node: RunNode, now = Date.now()): boolean {
  return (
    node.kind === "timer" &&
    node.mode === "countdown" &&
    node.status === "running" &&
    displayMs(node, now) <= 0
  );
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parseDurationInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 60_000;
  }

  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (parts.length === 2) {
    const [m, s] = parts;
    return (m * 60 + s) * 1000;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  return null;
}

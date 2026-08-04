import type { RunNode } from "@/db/schema";

export type TimerMode = "countdown" | "stopwatch" | "recurring";
export type TimerStatus = "idle" | "running" | "paused" | "completed";

export function isCountdownLike(mode: string | null | undefined): boolean {
  return mode === "countdown" || mode === "recurring";
}

export function formatModeLabel(mode: string | null | undefined): string {
  if (mode === "recurring") return "∞";
  return mode ?? "";
}

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function displayMs(node: RunNode, now = Date.now()): number {
  if (node.kind !== "timer") return 0;

  if (isCountdownLike(node.mode)) {
    if (node.status === "running") {
      const endsAt = toTime(node.endsAt);
      if (endsAt !== null) return Math.max(0, endsAt - now);
    }
    return Math.max(0, node.remainingMs ?? node.durationMs ?? 0);
  }

  // stopwatch
  if (node.status === "running") {
    const runningSince = toTime(node.runningSince);
    if (runningSince !== null) {
      return (node.elapsedMs ?? 0) + (now - runningSince);
    }
  }
  return Math.max(0, node.elapsedMs ?? 0);
}

export function hasHitZero(node: RunNode, now = Date.now()): boolean {
  return (
    node.kind === "timer" &&
    isCountdownLike(node.mode) &&
    node.status === "running" &&
    displayMs(node, now) <= 0
  );
}

export type DurationParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

export function splitDuration(ms: number): DurationParts {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function combineDuration(parts: DurationParts): number {
  const hours = Math.max(0, Math.trunc(parts.hours) || 0);
  const minutes = Math.max(0, Math.trunc(parts.minutes) || 0);
  const seconds = Math.max(0, Math.trunc(parts.seconds) || 0);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
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

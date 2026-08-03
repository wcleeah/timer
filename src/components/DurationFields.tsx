"use client";

import { combineDuration, splitDuration } from "@/lib/timer-math";
import { useState } from "react";

const field =
  "w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-center font-mono text-sm outline-none placeholder:text-muted/60 focus:border-accent";

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function partValue(n: number): string {
  return n === 0 ? "" : String(n);
}

export function DurationFields({
  ms,
  onSave,
}: {
  ms: number;
  onSave: (ms: number) => void;
}) {
  const initial = splitDuration(ms);
  const [hours, setHours] = useState(partValue(initial.hours));
  const [minutes, setMinutes] = useState(partValue(initial.minutes));
  const [seconds, setSeconds] = useState(partValue(initial.seconds));

  const commit = () => {
    const nextMs = combineDuration({
      hours: Number(hours) || 0,
      minutes: Number(minutes) || 0,
      seconds: Number(seconds) || 0,
    });
    const parts = splitDuration(nextMs);
    setHours(partValue(parts.hours));
    setMinutes(partValue(parts.minutes));
    setSeconds(partValue(parts.seconds));
    if (nextMs !== ms) onSave(nextMs);
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1">
      <label className="space-y-1">
        <span className="block text-center text-[10px] uppercase tracking-wide text-muted">
          H
        </span>
        <input
          className={field}
          value={hours}
          onChange={(e) => setHours(normalizeDigits(e.target.value))}
          onBlur={commit}
          inputMode="numeric"
          placeholder="0"
          aria-label="Hours"
        />
      </label>
      <span className="pt-4 text-muted">:</span>
      <label className="space-y-1">
        <span className="block text-center text-[10px] uppercase tracking-wide text-muted">
          M
        </span>
        <input
          className={field}
          value={minutes}
          onChange={(e) => setMinutes(normalizeDigits(e.target.value))}
          onBlur={commit}
          inputMode="numeric"
          placeholder="0"
          aria-label="Minutes"
        />
      </label>
      <span className="pt-4 text-muted">:</span>
      <label className="space-y-1">
        <span className="block text-center text-[10px] uppercase tracking-wide text-muted">
          S
        </span>
        <input
          className={field}
          value={seconds}
          onChange={(e) => setSeconds(normalizeDigits(e.target.value))}
          onBlur={commit}
          inputMode="numeric"
          placeholder="0"
          aria-label="Seconds"
        />
      </label>
    </div>
  );
}

"use client";

import { startRunFromPreset } from "@/app/actions/presets";
import Link from "next/link";
import { useTransition } from "react";

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-4"
      aria-hidden
    >
      <path d="M6.5 4.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}

function PlayAllIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-4"
      aria-hidden
    >
      <path d="M3.5 4.5v11l7-5.5-7-5.5Z" />
      <path d="M11 4.5v11l7-5.5-7-5.5Z" />
    </svg>
  );
}

const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50";

export function PresetListItem({
  id,
  name,
  bordered,
}: {
  id: string;
  name: string;
  bordered?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${
        bordered ? "border-t border-border" : ""
      }`}
    >
      <Link
        href={`/presets/${id}`}
        className="min-w-0 flex-1 truncate py-1 text-sm font-medium hover:underline"
      >
        {name}
      </Link>
      <button
        type="button"
        className={iconBtn}
        disabled={pending}
        title="Start run"
        aria-label={`Start run for ${name}`}
        onClick={() =>
          startTransition(async () => {
            await startRunFromPreset(id);
          })
        }
      >
        <PlayIcon />
      </button>
      <button
        type="button"
        className={iconBtn}
        disabled={pending}
        title="Start run with all timers"
        aria-label={`Start all timers for ${name}`}
        onClick={() =>
          startTransition(async () => {
            await startRunFromPreset(id, { startAll: true });
          })
        }
      >
        <PlayAllIcon />
      </button>
    </div>
  );
}

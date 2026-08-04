"use client";

import { startRunFromPreset } from "@/app/actions/presets";
import Link from "next/link";
import { useTransition } from "react";

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
      className={`space-y-2 px-3 py-3 ${
        bordered ? "border-t border-border" : ""
      }`}
    >
      <Link
        href={`/presets/${id}`}
        className="block truncate text-sm font-medium hover:underline"
      >
        {name}
      </Link>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-md bg-accent px-2 py-2 text-center text-xs font-medium text-accent-fg disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              await startRunFromPreset(id);
            })
          }
        >
          Start run
        </button>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-md border border-border px-2 py-2 text-center text-xs font-medium text-foreground hover:bg-surface disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              await startRunFromPreset(id, { startAll: true });
            })
          }
        >
          Start all
        </button>
      </div>
    </div>
  );
}

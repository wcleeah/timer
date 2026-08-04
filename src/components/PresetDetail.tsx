"use client";

import {
  deletePreset,
  renamePreset,
  startRunFromPreset,
} from "@/app/actions/presets";
import { AppHeader, PageShell } from "@/components/AppChrome";
import { PresetTreeEditor } from "@/components/PresetTreeEditor";
import type { PresetNode } from "@/db/schema";
import type { TreeNode } from "@/lib/tree";
import { useRef, useState, useTransition } from "react";

type SaveState = "saved" | "unsaved" | "saving";

function SaveIndicator({ state }: { state: SaveState }) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "unsaved"
        ? "Unsaved changes"
        : "All saved";

  return (
    <span
      className={`shrink-0 font-mono text-[11px] ${
        state === "unsaved"
          ? "text-accent"
          : state === "saving"
            ? "text-muted"
            : "text-muted/80"
      }`}
      aria-live="polite"
    >
      {label}
    </span>
  );
}

export function PresetDetail({
  presetId,
  initialName,
  tree,
}: {
  presetId: string;
  initialName: string;
  tree: TreeNode<PresetNode>[];
}) {
  const [name, setName] = useState(initialName);
  const [nameState, setNameState] = useState<SaveState>("saved");
  const [treeBusy, setTreeBusy] = useState(false);
  const [, startTransition] = useTransition();
  const savedNameRef = useRef(initialName);

  const saveState: SaveState =
    nameState === "saving" || treeBusy
      ? "saving"
      : nameState === "unsaved"
        ? "unsaved"
        : "saved";

  const persistName = (next: string) => {
    const trimmed = next.trim() || "Untitled preset";
    if (trimmed === savedNameRef.current) {
      setName(trimmed);
      setNameState("saved");
      return;
    }
    setNameState("saving");
    startTransition(async () => {
      try {
        await renamePreset(presetId, trimmed);
        savedNameRef.current = trimmed;
        setName(trimmed);
        setNameState("saved");
      } catch {
        setNameState("unsaved");
      }
    });
  };

  return (
    <PageShell>
      <AppHeader
        backHref="/"
        backLabel="← Presets"
        action={
          <button
            type="button"
            className="text-xs text-danger hover:underline"
            onClick={() =>
              startTransition(async () => {
                await deletePreset(presetId);
              })
            }
          >
            Delete
          </button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameState(
              e.target.value.trim() === savedNameRef.current
                ? "saved"
                : "unsaved",
            );
          }}
          onBlur={() => persistName(name)}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-tight outline-none"
          aria-label="Preset name"
        />
        <SaveIndicator state={saveState} />
      </div>

      <div className="mb-4 grid gap-2">
        <button
          type="button"
          className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-accent-fg"
          onClick={() =>
            startTransition(async () => {
              await startRunFromPreset(presetId);
            })
          }
        >
          Start run
        </button>
        <button
          type="button"
          className="w-full rounded-md border border-border py-2.5 text-sm font-medium text-foreground hover:bg-surface"
          onClick={() =>
            startTransition(async () => {
              await startRunFromPreset(presetId, { startAll: true });
            })
          }
        >
          Start run · all timers
        </button>
      </div>

      <PresetTreeEditor
        presetId={presetId}
        tree={tree}
        onBusyChange={setTreeBusy}
      />
    </PageShell>
  );
}

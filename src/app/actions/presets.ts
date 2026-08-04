"use server";

import { db } from "@/db";
import { presetNodes, presets, runNodes, runs } from "@/db/schema";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function nextSortOrder(presetId: string, parentId: string | null) {
  const [row] = await db
    .select({ value: max(presetNodes.sortOrder) })
    .from(presetNodes)
    .where(
      and(
        eq(presetNodes.presetId, presetId),
        parentId
          ? eq(presetNodes.parentId, parentId)
          : isNull(presetNodes.parentId),
      ),
    );
  return (row?.value ?? -1) + 1;
}

export async function createPreset(formData: FormData) {
  const name = String(formData.get("name") || "Untitled preset").trim();
  const [preset] = await db
    .insert(presets)
    .values({ name: name || "Untitled preset" })
    .returning();
  revalidatePath("/");
  redirect(`/presets/${preset.id}`);
}

export async function renamePreset(presetId: string, name: string) {
  await db
    .update(presets)
    .set({ name: name.trim() || "Untitled preset", updatedAt: new Date() })
    .where(eq(presets.id, presetId));
  revalidatePath("/");
  revalidatePath(`/presets/${presetId}`);
}

export async function deletePreset(presetId: string) {
  await db.delete(presets).where(eq(presets.id, presetId));
  revalidatePath("/");
  redirect("/");
}

export async function addPresetNode(input: {
  id?: string;
  presetId: string;
  parentId: string | null;
  kind: "group" | "timer";
  name?: string;
  sortOrder?: number;
}) {
  const sortOrder =
    input.sortOrder ?? (await nextSortOrder(input.presetId, input.parentId));
  const isTimer = input.kind === "timer";
  await db.insert(presetNodes).values({
    ...(input.id ? { id: input.id } : {}),
    presetId: input.presetId,
    parentId: input.parentId,
    kind: input.kind,
    name: input.name?.trim() || (isTimer ? "New timer" : "New group"),
    sortOrder,
    mode: isTimer ? "countdown" : null,
    durationMs: isTimer ? 25 * 60_000 : null,
    note: "",
  });
  await db
    .update(presets)
    .set({ updatedAt: new Date() })
    .where(eq(presets.id, input.presetId));
  revalidatePath(`/presets/${input.presetId}`);
}

export async function updatePresetNode(input: {
  id: string;
  presetId: string;
  name?: string;
  note?: string;
  mode?: "countdown" | "stopwatch" | "recurring";
  durationMs?: number | null;
}) {
  const patch: Partial<typeof presetNodes.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name.trim() || "Untitled";
  if (input.note !== undefined) patch.note = input.note;
  if (input.mode !== undefined) patch.mode = input.mode;
  if (input.durationMs !== undefined) patch.durationMs = input.durationMs;

  await db.update(presetNodes).set(patch).where(eq(presetNodes.id, input.id));
  await db
    .update(presets)
    .set({ updatedAt: new Date() })
    .where(eq(presets.id, input.presetId));
  revalidatePath(`/presets/${input.presetId}`);
}

export async function deletePresetNode(id: string, presetId: string) {
  const all = await db
    .select()
    .from(presetNodes)
    .where(eq(presetNodes.presetId, presetId));

  const toDelete = new Set<string>();
  const collect = (nodeId: string) => {
    toDelete.add(nodeId);
    for (const child of all.filter((n) => n.parentId === nodeId)) {
      collect(child.id);
    }
  };
  collect(id);

  for (const nodeId of toDelete) {
    await db.delete(presetNodes).where(eq(presetNodes.id, nodeId));
  }

  await db
    .update(presets)
    .set({ updatedAt: new Date() })
    .where(eq(presets.id, presetId));
  revalidatePath(`/presets/${presetId}`);
}

export async function movePresetNode(
  id: string,
  presetId: string,
  direction: "up" | "down",
) {
  const [node] = await db
    .select()
    .from(presetNodes)
    .where(eq(presetNodes.id, id));
  if (!node) return;

  const siblings = await db
    .select()
    .from(presetNodes)
    .where(
      and(
        eq(presetNodes.presetId, presetId),
        node.parentId
          ? eq(presetNodes.parentId, node.parentId)
          : isNull(presetNodes.parentId),
      ),
    )
    .orderBy(asc(presetNodes.sortOrder));

  const index = siblings.findIndex((s) => s.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= siblings.length) return;

  const other = siblings[swapWith];
  await db
    .update(presetNodes)
    .set({ sortOrder: other.sortOrder })
    .where(eq(presetNodes.id, node.id));
  await db
    .update(presetNodes)
    .set({ sortOrder: node.sortOrder })
    .where(eq(presetNodes.id, other.id));

  revalidatePath(`/presets/${presetId}`);
}

export async function startRunFromPreset(
  presetId: string,
  options?: { startAll?: boolean },
) {
  const startAll = options?.startAll === true;
  const [preset] = await db
    .select()
    .from(presets)
    .where(eq(presets.id, presetId));
  if (!preset) throw new Error("Preset not found");

  const nodes = await db
    .select()
    .from(presetNodes)
    .where(eq(presetNodes.presetId, presetId))
    .orderBy(asc(presetNodes.sortOrder));

  const [run] = await db
    .insert(runs)
    .values({
      presetId: preset.id,
      presetName: preset.name,
    })
    .returning();

  const idMap = new Map<string, string>();
  for (const node of nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }

  const now = new Date();
  if (nodes.length > 0) {
    await db.insert(runNodes).values(
      nodes.map((node) => {
        const isTimer = node.kind === "timer";
        const remainingMs = isTimer ? (node.durationMs ?? 0) : null;
        const countdownLike =
          node.mode === "countdown" || node.mode === "recurring";
        const shouldStart =
          startAll &&
          isTimer &&
          (node.mode === "stopwatch" || (countdownLike && (remainingMs ?? 0) > 0));

        return {
          id: idMap.get(node.id)!,
          runId: run.id,
          parentId: node.parentId ? idMap.get(node.parentId)! : null,
          kind: node.kind,
          name: node.name,
          sortOrder: node.sortOrder,
          mode: node.mode,
          durationMs: node.durationMs,
          note: node.note,
          status: shouldStart ? "running" : "idle",
          remainingMs,
          elapsedMs: 0,
          cycleCount: 0,
          endsAt:
            shouldStart && countdownLike && remainingMs != null
              ? new Date(now.getTime() + remainingMs)
              : null,
          runningSince:
            shouldStart && node.mode === "stopwatch" ? now : null,
        };
      }),
    );
  }

  redirect(`/runs/${run.id}`);
}

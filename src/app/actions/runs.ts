"use server";

import { db } from "@/db";
import { runNodes, runs } from "@/db/schema";
import { isCountdownLike } from "@/lib/timer-math";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getNode(id: string) {
  const [node] = await db.select().from(runNodes).where(eq(runNodes.id, id));
  return node ?? null;
}

function revalidateRun(runId: string) {
  revalidatePath(`/runs/${runId}`);
  revalidatePath("/history");
  revalidatePath(`/history/${runId}`);
}

export async function startTimer(nodeId: string) {
  const node = await getNode(nodeId);
  if (!node || node.kind !== "timer" || node.status === "completed") return;

  const now = new Date();
  if (isCountdownLike(node.mode)) {
    const remaining = node.remainingMs ?? node.durationMs ?? 0;
    if (remaining <= 0) return;
    await db
      .update(runNodes)
      .set({
        status: "running",
        endsAt: new Date(now.getTime() + remaining),
        runningSince: null,
      })
      .where(eq(runNodes.id, nodeId));
  } else {
    await db
      .update(runNodes)
      .set({
        status: "running",
        runningSince: now,
        endsAt: null,
      })
      .where(eq(runNodes.id, nodeId));
  }
  revalidateRun(node.runId);
}

export async function pauseTimer(nodeId: string) {
  const node = await getNode(nodeId);
  if (!node || node.kind !== "timer" || node.status !== "running") return;

  const now = Date.now();
  if (isCountdownLike(node.mode)) {
    const remaining = node.endsAt
      ? Math.max(0, node.endsAt.getTime() - now)
      : (node.remainingMs ?? 0);
    await db
      .update(runNodes)
      .set({
        status: "paused",
        remainingMs: remaining,
        endsAt: null,
        completedAt: null,
      })
      .where(eq(runNodes.id, nodeId));
  } else {
    const elapsed =
      (node.elapsedMs ?? 0) +
      (node.runningSince ? now - node.runningSince.getTime() : 0);
    await db
      .update(runNodes)
      .set({
        status: "paused",
        elapsedMs: elapsed,
        runningSince: null,
      })
      .where(eq(runNodes.id, nodeId));
  }
  revalidateRun(node.runId);
}

export async function resetTimer(nodeId: string) {
  const node = await getNode(nodeId);
  if (!node || node.kind !== "timer") return;

  await db
    .update(runNodes)
    .set({
      status: "idle",
      remainingMs: node.durationMs ?? 0,
      elapsedMs: 0,
      endsAt: null,
      runningSince: null,
      completedAt: null,
    })
    .where(eq(runNodes.id, nodeId));
  revalidateRun(node.runId);
}

/** Done on a recurring timer: bump cycle, reset duration, auto-start. */
export async function cycleRecurringTimer(nodeId: string) {
  const node = await getNode(nodeId);
  if (!node || node.kind !== "timer" || node.mode !== "recurring") return;
  if (node.status === "completed") return;

  const duration = node.durationMs ?? 0;
  const now = new Date();
  const shouldRun = duration > 0;

  await db
    .update(runNodes)
    .set({
      cycleCount: (node.cycleCount ?? 0) + 1,
      remainingMs: duration,
      elapsedMs: 0,
      status: shouldRun ? "running" : "paused",
      endsAt: shouldRun ? new Date(now.getTime() + duration) : null,
      runningSince: null,
      completedAt: null,
    })
    .where(eq(runNodes.id, nodeId));
  revalidateRun(node.runId);
}

/** Complete for real (and Done on non-recurring timers). */
export async function completeTimer(nodeId: string) {
  const node = await getNode(nodeId);
  if (!node || node.kind !== "timer") return;

  const now = Date.now();
  let remainingMs = node.remainingMs ?? node.durationMs ?? 0;
  let elapsedMs = node.elapsedMs ?? 0;

  if (node.status === "running") {
    if (isCountdownLike(node.mode) && node.endsAt) {
      remainingMs = Math.max(0, node.endsAt.getTime() - now);
    }
    if (node.mode === "stopwatch" && node.runningSince) {
      elapsedMs += now - node.runningSince.getTime();
    }
  }

  await db
    .update(runNodes)
    .set({
      status: "completed",
      remainingMs,
      elapsedMs,
      endsAt: null,
      runningSince: null,
      completedAt: new Date(),
    })
    .where(eq(runNodes.id, nodeId));
  revalidateRun(node.runId);
}

export async function uncompleteTimer(nodeId: string) {
  const node = await getNode(nodeId);
  if (!node || node.kind !== "timer" || node.status !== "completed") return;

  await db
    .update(runNodes)
    .set({
      status: "paused",
      completedAt: null,
    })
    .where(eq(runNodes.id, nodeId));
  revalidateRun(node.runId);
}

export async function setTimerMs(nodeId: string, ms: number) {
  const node = await getNode(nodeId);
  if (!node || node.kind !== "timer" || node.status === "completed") return;

  const safe = Math.max(0, Math.floor(ms));
  const wasRunning = node.status === "running";

  if (isCountdownLike(node.mode)) {
    await db
      .update(runNodes)
      .set({
        remainingMs: safe,
        status: wasRunning ? "running" : node.status === "idle" ? "paused" : node.status,
        endsAt: wasRunning ? new Date(Date.now() + safe) : null,
        runningSince: null,
      })
      .where(eq(runNodes.id, nodeId));
  } else {
    await db
      .update(runNodes)
      .set({
        elapsedMs: safe,
        status: wasRunning ? "running" : node.status === "idle" ? "paused" : node.status,
        runningSince: wasRunning ? new Date() : null,
        endsAt: null,
      })
      .where(eq(runNodes.id, nodeId));
  }
  revalidateRun(node.runId);
}

export async function updateRunNodeNote(nodeId: string, note: string) {
  const node = await getNode(nodeId);
  if (!node) return;
  await db.update(runNodes).set({ note }).where(eq(runNodes.id, nodeId));
  revalidateRun(node.runId);
}

export async function endRun(runId: string) {
  await db
    .update(runs)
    .set({ endedAt: new Date() })
    .where(eq(runs.id, runId));
  revalidatePath("/history");
  revalidatePath(`/history/${runId}`);
  revalidatePath(`/runs/${runId}`);
}

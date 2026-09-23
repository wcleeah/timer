import {
  clonePresetToRun,
  getActiveRun,
  getPreset,
  saveActiveRun,
} from "./store.js";
import { isCountdownLike } from "./timer-math.js";
import { walkTree } from "./tree.js";
import { replacePushJobs } from "./push.js";
import { releaseSound, unlockSound } from "./sound.js";

export async function syncRunPushes() {
  const run = getActiveRun();
  const jobs = [];
  if (run) {
    walkTree(run.tree || [], (node) => {
      if (node.kind !== "timer" || !node.notify) return;
      if (!isCountdownLike(node.mode)) return;
      if (node.status !== "running") return;
      const endsAt = Number(node.endsAt);
      if (!endsAt || endsAt <= Date.now()) return;
      jobs.push({
        timerId: node.id,
        endsAt,
        title: node.name || "Timer",
        body: `${run.presetName} — time’s up`,
      });
    });
  }
  await replacePushJobs(jobs);
}

export async function startRun(presetId, { startAll = false } = {}) {
  unlockSound();
  const preset = getPreset(presetId);
  if (!preset) return;
  if (getActiveRun() && !confirm("Replace the current run?")) return;
  saveActiveRun(clonePresetToRun(preset, { startAll }));
  await syncRunPushes();
  location.hash = "#/run";
}

export async function endRun() {
  releaseSound();
  saveActiveRun(null);
  await syncRunPushes();
  location.hash = "#/";
}

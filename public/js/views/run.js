import { headerHtml, page } from "../chrome.js";
import { bindDuration, durationFieldsHtml } from "../duration.js";
import { esc, on, resetBindings } from "../dom.js";
import { endRun, syncRunPushes } from "../run-session.js";
import { playBeep, unlockSound } from "../sound.js";
import { getActiveRun, saveActiveRun } from "../store.js";
import {
  displayMs,
  formatDuration,
  hasHitZero,
  isCountdownLike,
} from "../timer-math.js";
import { findNode, patchTreeNode, walkTree } from "../tree.js";

let showCompleted = false;
let editingId = null;
let tickTimer = null;
const alarmed = new Map();

export function stopRunTick() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function startTick(root) {
  stopRunTick();
  tickTimer = setInterval(() => tick(root), 200);
  tick(root);
}

function tick(root) {
  const run = getActiveRun();
  if (!run) return;
  const now = Date.now();
  walkTree(run.tree || [], (node) => {
    if (node.kind !== "timer") return;
    const timeEl = root.querySelector(`[data-time="${node.id}"]`);
    if (timeEl) timeEl.textContent = formatDuration(displayMs(node, now));
    const card = root.querySelector(`[data-card="${node.id}"]`);
    const expired = hasHitZero(node, now);
    if (card) {
      card.classList.toggle("timer-expired", expired);
      card.classList.toggle("is-running", node.status === "running" && !expired);
    }
    if (expired && node.sound) {
      const key = String(node.endsAt);
      if (alarmed.get(node.id) !== key) {
        alarmed.set(node.id, key);
        playBeep();
      }
    } else {
      alarmed.delete(node.id);
    }
  });
}

function persist(run, tree) {
  const next = { ...run, tree };
  saveActiveRun(next);
  return next;
}

function patch(id, update) {
  const run = getActiveRun();
  if (!run) return null;
  const node = findNode(run.tree || [], id);
  if (!node) return null;
  const nextPatch = typeof update === "function" ? update(node) : update;
  return persist(run, patchTreeNode(run.tree, id, nextPatch));
}

function startTimer(id) {
  unlockSound();
  const run = patch(id, (node) => {
    if (node.kind !== "timer" || node.status === "completed") return {};
    const now = Date.now();
    if (isCountdownLike(node.mode)) {
      const remaining = node.remainingMs ?? node.durationMs ?? 0;
      if (remaining <= 0) return {};
      return { status: "running", endsAt: now + remaining, runningSince: null };
    }
    return { status: "running", runningSince: now, endsAt: null };
  });
  return run;
}

function pauseTimer(id) {
  return patch(id, (node) => {
    if (node.kind !== "timer" || node.status !== "running") return {};
    const now = Date.now();
    if (isCountdownLike(node.mode)) {
      const remaining = node.endsAt ? Math.max(0, Number(node.endsAt) - now) : (node.remainingMs ?? 0);
      return { status: "paused", remainingMs: remaining, endsAt: null, completedAt: null };
    }
    const elapsed =
      (node.elapsedMs ?? 0) + (node.runningSince ? now - Number(node.runningSince) : 0);
    return { status: "paused", elapsedMs: elapsed, runningSince: null };
  });
}

function resetTimer(id) {
  return patch(id, (node) => {
    if (node.kind !== "timer") return {};
    return {
      status: "idle",
      remainingMs: node.durationMs ?? 0,
      elapsedMs: 0,
      endsAt: null,
      runningSince: null,
      completedAt: null,
    };
  });
}

function cycleTimer(id) {
  return patch(id, (node) => {
    if (node.kind !== "timer" || node.mode !== "recurring" || node.status === "completed") return {};
    const duration = node.durationMs ?? 0;
    const now = Date.now();
    const shouldRun = duration > 0;
    return {
      cycleCount: (node.cycleCount ?? 0) + 1,
      remainingMs: duration,
      elapsedMs: 0,
      status: shouldRun ? "running" : "paused",
      endsAt: shouldRun ? now + duration : null,
      runningSince: null,
      completedAt: null,
    };
  });
}

function completeTimer(id) {
  return patch(id, (node) => {
    if (node.kind !== "timer") return {};
    const now = Date.now();
    let remainingMs = node.remainingMs ?? node.durationMs ?? 0;
    let elapsedMs = node.elapsedMs ?? 0;
    if (node.status === "running") {
      if (isCountdownLike(node.mode) && node.endsAt) {
        remainingMs = Math.max(0, Number(node.endsAt) - now);
      }
      if (node.mode === "stopwatch" && node.runningSince) {
        elapsedMs += now - Number(node.runningSince);
      }
    }
    return {
      status: "completed",
      remainingMs,
      elapsedMs,
      endsAt: null,
      runningSince: null,
      completedAt: now,
    };
  });
}

function uncompleteTimer(id) {
  return patch(id, (node) => {
    if (node.kind !== "timer" || node.status !== "completed") return {};
    return { status: "paused", completedAt: null };
  });
}

function setTimerMs(id, ms) {
  return patch(id, (node) => {
    if (node.kind !== "timer" || node.status === "completed") return {};
    const safe = Math.max(0, Math.floor(ms));
    const wasRunning = node.status === "running";
    if (isCountdownLike(node.mode)) {
      return {
        remainingMs: safe,
        status: wasRunning ? "running" : node.status === "idle" ? "paused" : node.status,
        endsAt: wasRunning ? Date.now() + safe : null,
        runningSince: null,
      };
    }
    return {
      elapsedMs: safe,
      status: wasRunning ? "running" : node.status === "idle" ? "paused" : node.status,
      runningSince: wasRunning ? Date.now() : null,
      endsAt: null,
    };
  });
}

function anyVisible(node) {
  if (node.kind === "timer") return showCompleted || node.status !== "completed";
  return (node.children || []).some(anyVisible);
}

function timerCard(node) {
  const now = Date.now();
  const expired = hasHitZero(node, now);
  const recurring = node.mode === "recurring";
  const classes = [
    "timer-card",
    expired ? "timer-expired" : "",
    node.status === "running" && !expired ? "is-running" : "",
    node.status === "completed" ? "is-done" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const primaryLabel = node.status === "running" ? "Pause" : node.status === "paused" ? "Resume" : "Start";
  const primary =
    node.status === "running"
      ? `<button type="button" class="btn btn-accent btn-block" data-act="pause" data-id="${esc(node.id)}">Pause</button>`
      : `<button type="button" class="btn btn-accent btn-block" data-act="start" data-id="${esc(node.id)}">${primaryLabel}</button>`;

  const editing =
    editingId === node.id
      ? `<div class="edit-time">
          <div data-edit-id="${esc(node.id)}">${durationFieldsHtml(displayMs(node))}</div>
          <div class="quiet-actions">
            <button type="button" class="text-btn" data-act="save-edit" data-id="${esc(node.id)}">Save</button>
            <button type="button" class="text-btn" data-act="cancel-edit">Cancel</button>
          </div>
        </div>`
      : "";

  const controls =
    node.status !== "completed"
      ? `${primary}
         <div class="quiet-actions">
           <button type="button" class="text-btn" data-act="reset" data-id="${esc(node.id)}">Reset</button>
           <button type="button" class="text-btn" data-act="edit" data-id="${esc(node.id)}">Edit time</button>
           ${
             recurring
               ? `<button type="button" class="text-btn" data-act="cycle" data-id="${esc(node.id)}">Next cycle</button>
                  <button type="button" class="text-btn text-btn-danger" data-act="complete" data-id="${esc(node.id)}">Finish</button>`
               : `<button type="button" class="text-btn text-btn-danger" data-act="complete" data-id="${esc(node.id)}">Done</button>`
           }
         </div>`
      : `<button type="button" class="btn btn-block" data-act="restore" data-id="${esc(node.id)}">Restore</button>`;

  const modeLabel =
    node.mode === "stopwatch" ? "Stopwatch" : node.mode === "recurring" ? "Repeat" : "Countdown";

  return `<div class="${classes}" data-card="${esc(node.id)}">
    <div class="timer-card-head">
      <h3>${esc(node.name)}</h3>
      <div class="row">
        <span class="mode-pill">${esc(modeLabel)}</span>
        ${recurring ? `<span class="cycles">×${node.cycleCount ?? 0}</span>` : ""}
      </div>
    </div>
    <span class="timer-display" data-time="${esc(node.id)}">${esc(formatDuration(displayMs(node, now)))}</span>
    <textarea class="note-field" data-field="note" data-id="${esc(node.id)}" placeholder="Add a note" aria-label="Note" rows="1">${esc(node.note ?? "")}</textarea>
    ${editing}
    ${controls}
  </div>`;
}

function treeHtml(nodes, depth = 0) {
  return nodes
    .map((node) => {
      const pad = Math.min(depth, 4) * 10;
      if (node.kind === "group") {
        if (!showCompleted && node.children?.length && !anyVisible(node)) return "";
        return `<details class="group" open style="margin-left:${pad}px">
          <summary class="group-summary"><span class="chevron" aria-hidden="true"></span>${esc(node.name)}</summary>
          ${treeHtml(node.children || [], depth + 1)}
        </details>`;
      }
      if (!showCompleted && node.status === "completed") return "";
      return `<div style="margin-left:${pad}px">${timerCard(node)}</div>`;
    })
    .join("");
}

export function renderRun(root) {
  resetBindings(root);
  const run = getActiveRun();
  if (!run) {
    location.hash = "#/";
    return;
  }

  root.innerHTML = page(`
    ${headerHtml({ backHref: "#/", backLabel: "Presets" })}
    <div class="intro">
      <h1 class="page-title">${esc(run.presetName)}</h1>
      <p class="mono-meta">Started ${esc(new Date(run.startedAt).toLocaleString())}</p>
    </div>
    <label class="switch">
      <span>Show completed</span>
      <input type="checkbox" data-act="show-completed" ${showCompleted ? "checked" : ""} />
    </label>
    <div class="list">${treeHtml(run.tree || []) || `<p class="empty">No timers in this run.</p>`}</div>
    <button type="button" class="btn btn-end" data-act="end">End run</button>
  `);

  const refresh = async () => {
    await syncRunPushes();
    renderRun(root);
  };

  on(root, "change", "[data-act=show-completed]", (_e, input) => {
    showCompleted = input.checked;
    renderRun(root);
  });
  on(root, "click", "[data-act=end]", () => endRun());
  on(root, "click", "[data-act=start]", async (_e, btn) => {
    startTimer(btn.dataset.id);
    await refresh();
  });
  on(root, "click", "[data-act=pause]", async (_e, btn) => {
    pauseTimer(btn.dataset.id);
    await refresh();
  });
  on(root, "click", "[data-act=reset]", async (_e, btn) => {
    resetTimer(btn.dataset.id);
    await refresh();
  });
  on(root, "click", "[data-act=cycle]", async (_e, btn) => {
    cycleTimer(btn.dataset.id);
    await refresh();
  });
  on(root, "click", "[data-act=complete]", async (_e, btn) => {
    completeTimer(btn.dataset.id);
    await refresh();
  });
  on(root, "click", "[data-act=restore]", async (_e, btn) => {
    uncompleteTimer(btn.dataset.id);
    await refresh();
  });
  on(root, "click", "[data-act=edit]", (_e, btn) => {
    editingId = btn.dataset.id;
    renderRun(root);
  });
  on(root, "click", "[data-act=cancel-edit]", () => {
    editingId = null;
    renderRun(root);
  });
  on(root, "click", "[data-act=save-edit]", async (_e, btn) => {
    const wrap = root.querySelector(`[data-edit-id="${btn.dataset.id}"] .duration`);
    if (wrap) {
      const hours = Number(wrap.querySelector('[data-part="hours"]').value) || 0;
      const minutes = Number(wrap.querySelector('[data-part="minutes"]').value) || 0;
      const seconds = Number(wrap.querySelector('[data-part="seconds"]').value) || 0;
      setTimerMs(btn.dataset.id, (hours * 3600 + minutes * 60 + seconds) * 1000);
    }
    editingId = null;
    await refresh();
  });
  on(root, "focusout", "[data-field=note]", (_e, input) => {
    const runNow = getActiveRun();
    const node = findNode(runNow?.tree || [], input.dataset.id);
    if (!node || input.value === node.note) return;
    persist(runNow, patchTreeNode(runNow.tree, node.id, { note: input.value }));
  });

  bindDuration(root, () => {});
  on(root, "pointerdown", "*", () => unlockSound());
  startTick(root);
}

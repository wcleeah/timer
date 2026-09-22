import { headerHtml, page } from "../chrome.js";
import { bindDuration, durationFieldsHtml } from "../duration.js";
import { esc, on, resetBindings } from "../dom.js";
import { ensurePush, notificationBlocked, pushSupported } from "../push.js";
import { startRun } from "../run-session.js";
import { deletePreset, getPreset, savePreset } from "../store.js";
import {
  filterTreeNodes,
  findNode,
  findTreeSiblings,
  insertTreeChild,
  moveTreeSibling,
  nextSiblingSortOrder,
  patchTreeNode,
  reindexTree,
  walkTree,
} from "../tree.js";

function createChild(kind, parentId, sortOrder) {
  const isTimer = kind === "timer";
  return {
    id: crypto.randomUUID(),
    parentId,
    kind,
    name: isTimer ? "New timer" : "New group",
    sortOrder,
    mode: isTimer ? "countdown" : null,
    durationMs: isTimer ? 0 : null,
    note: "",
    sound: false,
    notify: false,
    children: [],
  };
}

function persist(preset, tree) {
  savePreset({ ...preset, tree: reindexTree(tree) });
}

function nodeHtml(node, depth) {
  const pad = Math.min(depth, 6) * 12;
  if (node.kind === "group") {
    const children = (node.children || [])
      .map((child) => nodeHtml(child, depth + 1))
      .join("");
    return `<div style="margin-left:${pad}px">
      <div class="node">
        <div class="node-head">
          <button type="button" class="collapse" data-act="toggle" data-id="${esc(node.id)}" aria-label="Collapse">
            <span class="chevron open">▸</span>
          </button>
          <input class="node-name" data-field="name" data-id="${esc(node.id)}" value="${esc(node.name)}" />
          <div class="row-wrap">
            <button type="button" class="btn btn-xs" data-act="add-group" data-id="${esc(node.id)}">+ Group</button>
            <button type="button" class="btn btn-xs" data-act="add-timer" data-id="${esc(node.id)}">+ Timer</button>
            <button type="button" class="btn btn-xs" data-act="up" data-id="${esc(node.id)}">↑</button>
            <button type="button" class="btn btn-xs" data-act="down" data-id="${esc(node.id)}">↓</button>
            <button type="button" class="btn btn-xs btn-danger" data-act="del" data-id="${esc(node.id)}">Del</button>
          </div>
        </div>
      </div>
      <div data-children="${esc(node.id)}">${children}</div>
    </div>`;
  }

  const cue =
    node.mode === "stopwatch"
      ? ""
      : `<div class="toggles">
          <label class="check"><input type="checkbox" data-field="sound" data-id="${esc(node.id)}" ${node.sound ? "checked" : ""} /> Sound</label>
          <label class="check"><input type="checkbox" data-field="notify" data-id="${esc(node.id)}" ${node.notify ? "checked" : ""} /> Notify</label>
        </div>`;

  return `<div class="node" style="margin-left:${pad}px">
    <div class="node-head mb-2">
      <span class="badge">timer</span>
      <input class="node-name" data-field="name" data-id="${esc(node.id)}" value="${esc(node.name)}" />
    </div>
    <div class="grid-sm-2 mb-2">
      <label class="label">Mode
        <select class="select" data-field="mode" data-id="${esc(node.id)}">
          <option value="countdown" ${node.mode === "countdown" ? "selected" : ""}>Countdown</option>
          <option value="stopwatch" ${node.mode === "stopwatch" ? "selected" : ""}>Stopwatch</option>
          <option value="recurring" ${node.mode === "recurring" ? "selected" : ""}>∞ Recurring</option>
        </select>
      </label>
      <div class="label">Duration
        <div data-duration-id="${esc(node.id)}">${durationFieldsHtml(node.durationMs ?? 0)}</div>
      </div>
    </div>
    <label class="label mb-2">Note
      <textarea class="textarea" data-field="note" data-id="${esc(node.id)}">${esc(node.note ?? "")}</textarea>
    </label>
    ${cue}
    <div class="row-wrap">
      <button type="button" class="btn btn-xs" data-act="up" data-id="${esc(node.id)}">↑</button>
      <button type="button" class="btn btn-xs" data-act="down" data-id="${esc(node.id)}">↓</button>
      <button type="button" class="btn btn-xs btn-danger" data-act="del" data-id="${esc(node.id)}">Del</button>
    </div>
  </div>`;
}

function hasNotify(nodes) {
  let found = false;
  walkTree(nodes, (node) => {
    if (node.notify) found = true;
  });
  return found;
}

export function renderPreset(root, id) {
  resetBindings(root);
  const preset = getPreset(id);
  if (!preset) {
    location.hash = "#/";
    return;
  }

  const tree = preset.tree || [];
  const notifyOn = hasNotify(tree);
  const notifyHint =
    notifyOn && notificationBlocked()
      ? `<p class="hint">Notifications are blocked in this browser.</p>`
      : notifyOn && !pushSupported()
        ? `<p class="hint">This browser does not support web push.</p>`
        : "";

  root.innerHTML = page(`
    ${headerHtml({
      backHref: "#/",
      backLabel: "← Presets",
      actionHtml: `<button type="button" class="link-danger" data-act="delete-preset">Delete</button>`,
    })}
    <div class="row mb-3">
      <input class="name-input" data-field="preset-name" value="${esc(preset.name)}" aria-label="Preset name" />
    </div>
    <div class="stack mb-4">
      <button type="button" class="btn btn-accent btn-block" data-act="start">Start run</button>
      <button type="button" class="btn btn-block" data-act="start-all">Start run · all timers</button>
    </div>
    ${notifyHint}
    <div class="grid-2 mb-2">
      <button type="button" class="btn btn-xs" data-act="add-root-group">+ Group</button>
      <button type="button" class="btn btn-xs btn-soft" data-act="add-root-timer">+ Timer</button>
    </div>
    <div class="list">
      ${
        tree.length === 0
          ? `<p class="empty">Add groups and timers to build this preset.</p>`
          : tree.map((node) => nodeHtml(node, 0)).join("")
      }
    </div>
  `);

  const refresh = () => renderPreset(root, id);

  const mutate = (fn) => {
    const current = getPreset(id);
    if (!current) return;
    persist(current, fn(current.tree || []));
    refresh();
  };

  on(root, "click", "[data-act=delete-preset]", () => {
    if (!confirm("Delete this preset?")) return;
    deletePreset(id);
    location.hash = "#/";
  });
  on(root, "click", "[data-act=start]", () => startRun(id));
  on(root, "click", "[data-act=start-all]", () => startRun(id, { startAll: true }));
  on(root, "click", "[data-act=add-root-group]", () => {
    mutate((tree) =>
      insertTreeChild(tree, null, createChild("group", null, nextSiblingSortOrder(tree))),
    );
  });
  on(root, "click", "[data-act=add-root-timer]", () => {
    mutate((tree) =>
      insertTreeChild(tree, null, createChild("timer", null, nextSiblingSortOrder(tree))),
    );
  });
  on(root, "click", "[data-act=add-group]", (_e, btn) => {
    mutate((tree) => {
      const siblings = findTreeSiblings(tree, btn.dataset.id) ?? [];
      return insertTreeChild(
        tree,
        btn.dataset.id,
        createChild("group", btn.dataset.id, nextSiblingSortOrder(siblings)),
      );
    });
  });
  on(root, "click", "[data-act=add-timer]", (_e, btn) => {
    mutate((tree) => {
      const siblings = findTreeSiblings(tree, btn.dataset.id) ?? [];
      return insertTreeChild(
        tree,
        btn.dataset.id,
        createChild("timer", btn.dataset.id, nextSiblingSortOrder(siblings)),
      );
    });
  });
  on(root, "click", "[data-act=up]", (_e, btn) => {
    mutate((tree) => moveTreeSibling(tree, btn.dataset.id, "up"));
  });
  on(root, "click", "[data-act=down]", (_e, btn) => {
    mutate((tree) => moveTreeSibling(tree, btn.dataset.id, "down"));
  });
  on(root, "click", "[data-act=del]", (_e, btn) => {
    mutate((tree) => filterTreeNodes(tree, (node) => node.id !== btn.dataset.id));
  });
  on(root, "click", "[data-act=toggle]", (_e, btn) => {
    const kids = root.querySelector(`[data-children="${btn.dataset.id}"]`);
    const chevron = btn.querySelector(".chevron");
    if (kids) kids.hidden = !kids.hidden;
    chevron?.classList.toggle("open", !kids?.hidden);
  });

  on(root, "focusout", "[data-field=preset-name]", (_e, input) => {
    const current = getPreset(id);
    if (!current) return;
    const name = input.value.trim() || "Untitled preset";
    input.value = name;
    if (name !== current.name) savePreset({ ...current, name });
  });

  on(root, "focusout", "[data-field=name]", (_e, input) => {
    const current = getPreset(id);
    const node = findNode(current?.tree || [], input.dataset.id);
    if (!node || input.value === node.name) return;
    persist(current, patchTreeNode(current.tree, node.id, { name: input.value }));
  });

  on(root, "focusout", "[data-field=note]", (_e, input) => {
    const current = getPreset(id);
    const node = findNode(current?.tree || [], input.dataset.id);
    if (!node || input.value === node.note) return;
    persist(current, patchTreeNode(current.tree, node.id, { note: input.value }));
  });

  on(root, "change", "[data-field=mode]", (_e, select) => {
    mutate((tree) => patchTreeNode(tree, select.dataset.id, { mode: select.value }));
  });

  on(root, "change", "[data-field=sound]", (_e, input) => {
    const current = getPreset(id);
    persist(current, patchTreeNode(current.tree, input.dataset.id, { sound: input.checked }));
  });

  on(root, "change", "[data-field=notify]", async (_e, input) => {
    if (input.checked) {
      const sub = await ensurePush();
      if (!sub) {
        input.checked = false;
        const current = getPreset(id);
        persist(current, patchTreeNode(current.tree, input.dataset.id, { notify: false }));
        refresh();
        return;
      }
    }
    const current = getPreset(id);
    persist(current, patchTreeNode(current.tree, input.dataset.id, { notify: input.checked }));
  });

  bindDuration(root, (input, ms) => {
    const wrap = input.closest("[data-duration-id]");
    const current = getPreset(id);
    const node = findNode(current?.tree || [], wrap?.dataset.durationId);
    if (!node || (node.durationMs ?? 0) === ms) return;
    persist(current, patchTreeNode(current.tree, node.id, { durationMs: ms }));
    refresh();
  });
}

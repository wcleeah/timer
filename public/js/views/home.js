import { headerHtml, page } from "../chrome.js";
import { esc, on, resetBindings } from "../dom.js";
import { createPreset, listPresets } from "../store.js";
import { startRun } from "../run-session.js";
import { walkTree } from "../tree.js";

function presetSummary(preset) {
  let timers = 0;
  let groups = 0;
  walkTree(preset.tree || [], (node) => {
    if (node.kind === "timer") timers += 1;
    else if (node.kind === "group") groups += 1;
  });
  if (!timers && !groups) return "Empty preset";
  const parts = [];
  if (groups) parts.push(`${groups} group${groups === 1 ? "" : "s"}`);
  parts.push(`${timers} timer${timers === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function renderHome(root) {
  resetBindings(root);
  const presets = listPresets();
  const items =
    presets.length === 0
      ? `<p class="empty">No presets yet. Name one below, then add timers.</p>`
      : presets
          .map(
            (preset) => `<article class="preset-card">
              <a class="preset-name" href="#/preset/${esc(preset.id)}">${esc(preset.name)}</a>
              <p class="preset-meta">${esc(presetSummary(preset))}</p>
              <div class="card-actions">
                <button type="button" class="btn btn-accent grow" data-act="start" data-id="${esc(preset.id)}">Start</button>
                <button type="button" class="btn" data-act="start-all" data-id="${esc(preset.id)}">Start all</button>
              </div>
            </article>`,
          )
          .join("");

  root.innerHTML = page(`
    ${headerHtml()}
    <div class="intro">
      <h1 class="page-title">Presets</h1>
      <p class="lede">Open a preset to change it. Start waits for you to begin each timer. Start all runs every timer at once.</p>
    </div>
    <section class="list">${items}</section>
    <form class="composer" data-act="create">
      <p class="kicker">New preset</p>
      <div class="composer-row">
        <input class="field grow" name="name" placeholder="Name this preset" autocomplete="off" aria-label="Preset name" />
        <button class="btn btn-accent" type="submit">Create</button>
      </div>
    </form>
  `);

  on(root, "submit", "[data-act=create]", (e, form) => {
    e.preventDefault();
    const name = new FormData(form).get("name");
    const preset = createPreset(String(name || ""));
    location.hash = `#/preset/${preset.id}`;
  });

  on(root, "click", "[data-act=start]", (_e, btn) => {
    startRun(btn.dataset.id);
  });
  on(root, "click", "[data-act=start-all]", (_e, btn) => {
    startRun(btn.dataset.id, { startAll: true });
  });
}

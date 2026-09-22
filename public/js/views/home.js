import { headerHtml, page } from "../chrome.js";
import { esc, on, resetBindings } from "../dom.js";
import { createPreset, listPresets } from "../store.js";
import { startRun } from "../run-session.js";

export function renderHome(root) {
  resetBindings(root);
  const presets = listPresets();
  const items =
    presets.length === 0
      ? `<p class="empty">No presets yet.</p>`
      : presets
          .map(
            (preset) => `<div class="list-item">
              <a class="preset-name" href="#/preset/${esc(preset.id)}">${esc(preset.name)}</a>
              <div class="grid-2">
                <button type="button" class="btn btn-sm btn-accent" data-act="start" data-id="${esc(preset.id)}">Start run</button>
                <button type="button" class="btn btn-sm" data-act="start-all" data-id="${esc(preset.id)}">Start all</button>
              </div>
            </div>`,
          )
          .join("");

  root.innerHTML = page(`
    ${headerHtml()}
    <div class="mb-4">
      <h1 class="page-title">Presets</h1>
      <p class="lede">Choose a preset to edit or start a run.</p>
    </div>
    <form class="row mb-3" data-act="create">
      <input class="field grow" name="name" placeholder="New preset…" autocomplete="off" />
      <button class="btn btn-accent" type="submit">Create</button>
    </form>
    <section class="list">${items}</section>
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

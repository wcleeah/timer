import { esc } from "./dom.js";
import { getActiveRun } from "./store.js";
import { currentTheme } from "./theme.js";

export function headerHtml({ backHref, backLabel, actionHtml = "" } = {}) {
  const run = getActiveRun();
  const hash = location.hash || "#/";
  const runLink =
    run && hash !== "#/run"
      ? `<a class="run-link" href="#/run">Open run</a>`
      : "";

  return `<header class="header">
    <div class="header-inner">
      <div class="header-left">
        ${
          backHref
            ? `<a class="back" href="${esc(backHref)}">${esc(backLabel ?? "← Back")}</a>`
            : `<a class="brand" href="#/">timer</a>`
        }
      </div>
      <div class="header-right">
        ${actionHtml}
        ${runLink}
        <button type="button" class="btn btn-sm" data-act="theme">${currentTheme() === "dark" ? "Light" : "Dark"}</button>
      </div>
    </div>
  </header>`;
}

export function page(inner) {
  return `<main class="page">${inner}</main>`;
}

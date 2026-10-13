import { esc } from "./dom.js";
import { getActiveRun } from "./store.js";
import { currentTheme } from "./theme.js";

const clock =
  '<svg class="mark-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M12 8.2V12.4L14.8 14.2" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const chevron =
  '<svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5 9 12l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const moon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 13.2A6.2 6.2 0 0 1 10.6 6.2 6.4 6.4 0 1 0 16.5 13.2Z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/></svg>';

const sun =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';

export function headerHtml({ backHref, backLabel, actionHtml = "" } = {}) {
  const run = getActiveRun();
  const hash = location.hash || "#/";
  const dark = currentTheme() === "dark";
  const runLink =
    run && hash !== "#/run" ? `<a class="run-pill" href="#/run">Open run</a>` : "";

  const themeBtn = `<button type="button" class="icon-btn" data-act="theme" aria-label="${dark ? "Switch to light" : "Switch to dark"}">${dark ? sun : moon}</button>`;

  return `<header class="header">
    <div class="header-inner">
      <div class="header-left">
        ${
          backHref
            ? `<a class="back" href="${esc(backHref)}">${chevron}<span>${esc(backLabel ?? "Back")}</span></a>`
            : `<a class="brand" href="#/"><span class="mark">${clock}</span>Timer</a>`
        }
      </div>
      <div class="header-right">
        ${actionHtml}
        ${runLink}
        ${themeBtn}
      </div>
    </div>
  </header>`;
}

export function page(inner) {
  return `<main class="page">${inner}</main>`;
}

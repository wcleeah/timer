import { toggleTheme } from "./theme.js";
import { renderHome } from "./views/home.js";
import { renderPreset } from "./views/preset.js";
import { renderRun, stopRunTick } from "./views/run.js";

export function route() {
  stopRunTick();
  const root = document.getElementById("app");
  const hash = (location.hash || "#/").slice(1) || "/";
  const preset = hash.match(/^\/preset\/([^/]+)$/);
  if (hash === "/run") {
    renderRun(root);
    return;
  }
  if (preset) {
    renderPreset(root, preset[1]);
    return;
  }
  renderHome(root);
}

export function bindChrome() {
  document.addEventListener("click", (event) => {
    const themeBtn = event.target.closest("[data-act=theme]");
    if (!themeBtn) return;
    toggleTheme();
    const label = themeBtn;
    label.textContent = label.textContent === "Dark" ? "Light" : "Dark";
  });
}

import { registerSW } from "./push.js";
import { bindChrome, route } from "./router.js";
import { initTheme } from "./theme.js";

initTheme();
registerSW();
bindChrome();
window.addEventListener("hashchange", route);
route();

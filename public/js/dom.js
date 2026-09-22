export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char],
  );
}

export function resetBindings(root) {
  root._bindAbort?.abort();
  root._bindAbort = new AbortController();
}

export function on(root, event, selector, handler) {
  root.addEventListener(
    event,
    (e) => {
      const el = e.target instanceof Element ? e.target : e.target?.parentElement;
      const target = el?.closest(selector);
      if (!target || !root.contains(target)) return;
      handler(e, target);
    },
    { signal: root._bindAbort?.signal },
  );
}

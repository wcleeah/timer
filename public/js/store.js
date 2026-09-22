const PRESETS_KEY = "timer.presets";
const RUN_KEY = "timer.activeRun";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (value == null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
}

export function listPresets() {
  const list = readJson(PRESETS_KEY, []);
  return Array.isArray(list)
    ? [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    : [];
}

export function getPreset(id) {
  return listPresets().find((preset) => preset.id === id) ?? null;
}

export function savePreset(preset) {
  const list = listPresets();
  const index = list.findIndex((item) => item.id === preset.id);
  const next = { ...preset, updatedAt: Date.now() };
  if (index === -1) list.unshift(next);
  else list[index] = next;
  writeJson(PRESETS_KEY, list);
  return next;
}

export function deletePreset(id) {
  writeJson(
    PRESETS_KEY,
    listPresets().filter((preset) => preset.id !== id),
  );
}

export function createPreset(name) {
  const now = Date.now();
  const preset = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled preset",
    createdAt: now,
    updatedAt: now,
    tree: [],
  };
  savePreset(preset);
  return preset;
}

export function getActiveRun() {
  return readJson(RUN_KEY, null);
}

export function saveActiveRun(run) {
  writeJson(RUN_KEY, run);
}

export function clonePresetToRun(preset, { startAll = false } = {}) {
  const now = Date.now();

  const cloneNode = (node, parentId) => {
    const id = crypto.randomUUID();
    const isTimer = node.kind === "timer";
    const remainingMs = isTimer ? (node.durationMs ?? 0) : null;
    const countdownLike = node.mode === "countdown" || node.mode === "recurring";
    const shouldStart =
      startAll &&
      isTimer &&
      (node.mode === "stopwatch" || (countdownLike && (remainingMs ?? 0) > 0));

    return {
      id,
      parentId,
      kind: node.kind,
      name: node.name,
      sortOrder: node.sortOrder ?? 0,
      mode: node.mode ?? null,
      durationMs: node.durationMs ?? null,
      note: node.note ?? "",
      sound: Boolean(node.sound),
      notify: Boolean(node.notify),
      status: shouldStart ? "running" : "idle",
      remainingMs,
      elapsedMs: 0,
      cycleCount: 0,
      endsAt: shouldStart && countdownLike && remainingMs != null ? now + remainingMs : null,
      runningSince: shouldStart && node.mode === "stopwatch" ? now : null,
      completedAt: null,
      children: (node.children || []).map((child) => cloneNode(child, id)),
    };
  };

  return {
    id: crypto.randomUUID(),
    presetId: preset.id,
    presetName: preset.name,
    startedAt: now,
    tree: (preset.tree || []).map((node) => cloneNode(node, null)),
  };
}

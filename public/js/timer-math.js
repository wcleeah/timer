export function isCountdownLike(mode) {
  return mode === "countdown" || mode === "recurring";
}

export function formatModeLabel(mode) {
  if (mode === "recurring") return "∞";
  return mode ?? "";
}

export function displayMs(node, now = Date.now()) {
  if (node.kind !== "timer") return 0;

  if (isCountdownLike(node.mode)) {
    if (node.status === "running" && node.endsAt != null) {
      return Math.max(0, Number(node.endsAt) - now);
    }
    return Math.max(0, node.remainingMs ?? node.durationMs ?? 0);
  }

  if (node.status === "running" && node.runningSince != null) {
    return (node.elapsedMs ?? 0) + (now - Number(node.runningSince));
  }
  return Math.max(0, node.elapsedMs ?? 0);
}

export function hasHitZero(node, now = Date.now()) {
  return (
    node.kind === "timer" &&
    isCountdownLike(node.mode) &&
    node.status === "running" &&
    displayMs(node, now) <= 0
  );
}

export function splitDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function combineDuration(parts) {
  const hours = Math.max(0, Math.trunc(parts.hours) || 0);
  const minutes = Math.max(0, Math.trunc(parts.minutes) || 0);
  const seconds = Math.max(0, Math.trunc(parts.seconds) || 0);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parseDurationInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 60_000;
  }

  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (parts.length === 2) {
    const [m, s] = parts;
    return (m * 60 + s) * 1000;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  return null;
}

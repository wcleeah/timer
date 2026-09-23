export const DEFAULT_VAPID_SUBJECT = "https://timer.wcleeah.me";

function isLocalHost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

export function resolveVapidSubject(raw?: string | null) {
  const value = (raw ?? "").trim() || DEFAULT_VAPID_SUBJECT;

  if (value.startsWith("mailto:")) {
    const email = value.slice("mailto:".length);
    const host = (email.split("@")[1] ?? "").trim().toLowerCase();
    if (!host || isLocalHost(host)) return DEFAULT_VAPID_SUBJECT;
    return value;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || isLocalHost(url.hostname)) return DEFAULT_VAPID_SUBJECT;
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_VAPID_SUBJECT;
  }
}

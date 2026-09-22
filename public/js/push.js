const SUB_KEY = "timer.pushSubscription";
const VAPID_KEY = "timer.vapidPublicKey";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function readSub() {
  try {
    return JSON.parse(localStorage.getItem(SUB_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSub(sub) {
  if (!sub) localStorage.removeItem(SUB_KEY);
  else localStorage.setItem(SUB_KEY, JSON.stringify(sub));
}

export function notificationBlocked() {
  return typeof Notification !== "undefined" && Notification.permission === "denied";
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function ensurePush() {
  if (!pushSupported()) return null;
  const reg = await registerSW();
  if (!reg) return null;

  const res = await fetch("/api/vapid-public-key");
  if (!res.ok) return null;
  const { publicKey } = await res.json();
  if (!publicKey) return null;

  const storedKey = localStorage.getItem(VAPID_KEY);
  if (storedKey && storedKey !== publicKey) {
    try {
      const existing = await reg.pushManager.getSubscription();
      await existing?.unsubscribe();
    } catch {
      // ignore
    }
    writeSub(null);
  }
  localStorage.setItem(VAPID_KEY, publicKey);

  if (Notification.permission === "denied") return null;
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  const json = sub.toJSON();
  writeSub(json);
  return json;
}

export async function replacePushJobs(jobs) {
  const endpoint = readSub()?.endpoint;
  if (!jobs.length) {
    if (!endpoint) return;
    await fetch("/api/push/cancel-all", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    return;
  }

  const subscription = await ensurePush();
  if (!subscription) return;
  await fetch("/api/push/replace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription, jobs }),
  });
}

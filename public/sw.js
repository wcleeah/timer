const CACHE = "timer-v1";
const PRECACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/manifest.webmanifest",
  "/js/app.js",
  "/js/chrome.js",
  "/js/dom.js",
  "/js/duration.js",
  "/js/push.js",
  "/js/router.js",
  "/js/run-session.js",
  "/js/sound.js",
  "/js/store.js",
  "/js/theme.js",
  "/js/timer-math.js",
  "/js/tree.js",
  "/js/views/home.js",
  "/js/views/preset.js",
  "/js/views/run.js",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(event.request);
        return cached || caches.match("/index.html");
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Timer", body: "Time is up", url: "/#/run" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Timer", {
      body: data.body || "Time is up",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/#/run" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/#/run";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

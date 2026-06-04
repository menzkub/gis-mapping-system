const CACHE = "gis-meter-v26";

const STATIC = [
  "/gis-mapping-system/",
  "/gis-mapping-system/index.html",
  "/gis-mapping-system/styles.css",
  "/gis-mapping-system/config.js",
  "/gis-mapping-system/lang.jsx",
  "/gis-mapping-system/components.jsx",
  "/gis-mapping-system/MapView.jsx",
  "/gis-mapping-system/AuthScreen.jsx",
  "/gis-mapping-system/SearchView.jsx",
  "/gis-mapping-system/AdminPanel.jsx",
  "/gis-mapping-system/app.jsx",
  "/gis-mapping-system/logo.svg",
  "/gis-mapping-system/icon-192.png",
  "/gis-mapping-system/icon-512.png",
  "/gis-mapping-system/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Supabase + external APIs → network only (ต้องข้อมูลจริงเสมอ)
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("unpkg.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("cdnjs.cloudflare.com") ||
    url.hostname.includes("api.github.com")
  ) {
    return;
  }

  // ไฟล์แอป → cache first, fallback network (network updates cache silently)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type !== "opaque") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// ── Push Notification ──────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  let payload = { title: "GIS Meter", body: "มีการแจ้งเตือนใหม่", url: "/gis-mapping-system/" };
  try { payload = { ...payload, ...e.data.json() }; } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    "/gis-mapping-system/icon-192.png",
      badge:   "/gis-mapping-system/icon-192.png",
      vibrate: [200, 100, 200],
      data:    { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = e.notification.data?.url ?? "/gis-mapping-system/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url.includes("gis-mapping-system"));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});

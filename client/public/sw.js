const CACHE = "mindvault-shell-v2";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/mindvault-icon.svg"];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    // Pre-cache the production Vite JS/CSS bundles so a cold offline launch works.
    try {
      const response = await fetch("/index.html");
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\/assets\/[^"']+)["']/g)].map(match => match[1]);
      await Promise.all(assets.map(asset => cache.add(asset).catch(() => null)));
    } catch {}
  })());
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put("/index.html", copy)); return response;
    }).catch(() => caches.match("/index.html").then(response => response || caches.match("/"))));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
      return response;
    })));
  }
});

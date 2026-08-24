/* POINT — service worker
   Network-first pour HTML/JS/manifest : une seule rechargement suffit toujours
   à obtenir la version à jour. Cache = filet de sécurité hors-ligne. */
const VER = "point-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./levels.js",
  "./sfx.js",
  "./manifest.webmanifest",
  "./fonts/space-grotesk.woff2",
  "./fonts/jetbrains-mono.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const netFirst = e.request.mode === "navigate" ||
                   url.pathname.endsWith(".html") ||
                   url.pathname.endsWith(".js") ||
                   url.pathname.endsWith(".webmanifest");
  if(netFirst){
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VER).then(c => c.put(e.request, copy));
        return res;
      }).catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(h => h || caches.match("./index.html"))
      )
    );
  } else {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request))
    );
  }
});

// Offline cache for Output Practice.
// Network-first for the page itself, so a re-upload reaches you next time you
// have signal; cache-first for the icons, which never change.
// Bump CACHE whenever the app changes to retire the old copy.
const CACHE = "output-practice-v7";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // the page: freshest wins, fall back to the cached copy when offline
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      // cache:"no-cache" skips the browser's HTTP cache (GitHub Pages marks
      // files fresh for 10 min) and asks the server every time. It's a cheap
      // check: an unchanged page comes back as a tiny "304 not modified".
      fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
        .then(res => {
          if (!res.ok) throw new Error("bad status");
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // everything else: cache first
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      });
    })
  );
});

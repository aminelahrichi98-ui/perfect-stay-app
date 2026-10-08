/* Perfect Stay : service worker minimal.
   Il ne garde en mémoire QUE la page « hors ligne » : aucune donnée de l'application n'est stockée sur le téléphone. */
const CACHE = "ps-hors-ligne-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/hors-ligne")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/hors-ligne")));
  }
});

// Service worker de LeagueHub : rend le site installable et affiche une page propre hors ligne.
// Il ne met AUCUNE donnée en cache (scores, classements, API) : les pages viennent toujours du
// réseau, seule la page « hors ligne » est gardée pour le cas où la connexion tombe.

const CACHE = "leaguehub-v1";
const OFFLINE_URL = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Seules les navigations sont concernées : API, scripts et images passent directement au réseau.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
  );
});

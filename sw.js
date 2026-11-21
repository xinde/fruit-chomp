const VERSION = "7a3b0fff1459b982";
const FILES = [
  "index.html",
  "motion-test.html",
  "motion-test.css",
  "motion-test.js",
  "motion-checks.js",
  "game.css",
  "game.js",
  "round.js",
  "camera.js",
  "scene.js",
  "offline.js",
  "pwa.js",
  "manifest.webmanifest",
  "assets/berry.png",
  "assets/bomb.png",
  "assets/cherry.png",
  "assets/icon-180.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/lemon.png",
  "assets/melon.png",
  "assets/orange.png",
  "assets/orchard.png",
  "assets/press-start.ttf",
  "assets/title.png",
  "vendor/mediapipe/face_landmarker.task",
  "vendor/mediapipe/vision_bundle.mjs",
  "vendor/mediapipe/wasm/vision_wasm_internal.js",
  "vendor/mediapipe/wasm/vision_wasm_internal.wasm",
  "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js",
  "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm"
];

const scope = self.registration.scope;
const prefix = "fruit-chomp:" + new URL(scope).pathname + ":";
const cacheName = prefix + VERSION;
const urls = FILES.map(path => new URL(path, scope).href);
const known = new Set(urls);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(urls.map(url => new Request(url, {cache: "reload"})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type !== "prepare-offline" || !event.ports[0]) return;
  const reply = event.ports[0];
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(cacheName);
      const saved = new Set((await cache.keys()).map(request => request.url));
      const missing = urls.filter(url => !saved.has(url));
      if (missing.length) await cache.addAll(missing.map(url => new Request(url, {cache: "reload"})));
      reply.postMessage({ready:true});
    } catch {
      reply.postMessage({ready:false});
    }
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  url.search = "";
  const isEntry = req.mode === "navigate" && (url.href === scope || url.href === new URL("index.html", scope).href);
  if (!isEntry && !known.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(isEntry ? new URL("index.html", scope).href : url.href) || fetch(req);
  })());
});

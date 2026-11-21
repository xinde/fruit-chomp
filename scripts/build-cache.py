"""Generate the service worker from the complete offline runtime and content hashes."""
from hashlib import sha256
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
runtime = ["index.html", "game.css", "game.js", "round.js", "camera.js", "scene.js",
           "offline.js", "manifest.webmanifest"]
for folder in ["assets", "vendor"]:
    runtime.extend(sorted(p.relative_to(root).as_posix() for p in (root / folder).rglob("*")
                          if p.is_file() and p.suffix.lower() in
                          {".js", ".mjs", ".wasm", ".png", ".ttf", ".task"}))
body = """
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
"""
digest = sha256(body.encode())
for name in runtime:
    digest.update(name.encode())
    digest.update((root / name).read_bytes())
header = "const VERSION = " + json.dumps(digest.hexdigest()[:16]) + ";\n"
header += "const FILES = " + json.dumps(runtime, indent=2) + ";\n"
(root / "sw.js").write_text(header + body)

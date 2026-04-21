const CACHE_VERSION = "v2";
const APP_SHELL_CACHE = `mermaid-sky-exporter-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `mermaid-sky-exporter-static-${CACHE_VERSION}`;
const APP_SHELL_URL = "/";
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/homepage.png",
];
const STATIC_ASSET_PATHS = new Set(
  CORE_ASSETS.filter((assetPath) => assetPath !== APP_SHELL_URL),
);

function isCacheableResponse(response) {
  return (
    response?.ok && (response.type === "basic" || response.type === "default")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function handleNavigation(request) {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(APP_SHELL_URL, response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(APP_SHELL_URL)) ||
      Response.error()
    );
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    void fetchAndStore(request, cache);
    return cached;
  }

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function fetchAndStore(request, cache) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
    }
  } catch {
    return undefined;
  }

  return undefined;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (STATIC_ASSET_PATHS.has(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  }
});

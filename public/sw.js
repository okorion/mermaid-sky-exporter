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

function toSafeSameOriginUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.origin !== self.location.origin) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function fetchSameOrigin(url) {
  return fetch(url.toString());
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

function handleNavigation(request, url) {
  return caches
    .open(APP_SHELL_CACHE)
    .then((cache) =>
      fetchSameOrigin(url)
        .then((response) => {
          if (!isCacheableResponse(response)) {
            return response;
          }

          return cache
            .put(APP_SHELL_URL, response.clone())
            .then(() => response);
        })
        .catch(() =>
          cache
            .match(request, { ignoreSearch: true })
            .then(
              (cachedRequest) => cachedRequest || cache.match(APP_SHELL_URL),
            )
            .then((fallback) => fallback || Response.error()),
        ),
    )
    .catch(() => Response.error());
}

async function handleStaticAsset(request, url) {
  const [cache, shellCache] = await Promise.all([
    caches.open(STATIC_CACHE),
    caches.open(APP_SHELL_CACHE),
  ]);
  const cached = await cache.match(request);
  if (cached) {
    void fetchAndStore(request, url, cache);
    return cached;
  }

  const precached = await shellCache.match(request, { ignoreSearch: true });
  if (precached) {
    await cache.put(request, precached.clone());
    void fetchAndStore(request, url, cache);
    return precached;
  }

  try {
    const response = await fetchSameOrigin(url);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function fetchAndStore(request, url, cache) {
  try {
    const response = await fetchSameOrigin(url);
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

  const url = toSafeSameOriginUrl(request.url);
  if (!url) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (STATIC_ASSET_PATHS.has(url.pathname)) {
    event.respondWith(handleStaticAsset(request, url));
  }
});

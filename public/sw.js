const CACHE = "family-vault-personal-shell-centered-gate-v4-16";
const SHELL = [
  "/billing-dashboard.css",
  "/document-preview.css",
  "/record-layout.css",
  "/pagination.css",
  "/calendar.css",
  "/payments.css",
  "/quick-filters.css",
  "/legal.css",
  "/privacy.html",
  "/terms.html",
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/vault.js",
  "/migration.js",
  "/guide.js",
  "/samples.js",
  "/organizer.js",
  "/pagination.js",
  "/calendar.js",
  "/payments.js",
  "/image-tools.js",
  "/config.js",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.svg",
  "/icon-512.svg",
  "/view-switcher.js",
  "/view-switcher.css",
  "/soft-color-theme.css",
  "/view-modes-core.js",
  "/view-modes.js",
  "/view-modes-core.js",
  "/view-modes.css",
  "/settings-guide.js",
  "/settings-guide.css",
  "/seasonal.css",
  "/seasonal-core.js",
  "/seasonal.js",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (
    e.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !SHELL.includes(url.pathname)
  )
    return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request)),
  );
});

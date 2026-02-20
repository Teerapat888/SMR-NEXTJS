// Minimal service worker for PWA installability
// System runs on closed LAN - no offline caching needed

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

const CACHE = 'gym-training-mwbexhi2'

async function precacheBuildAssets(cache, scope) {
  const shell = await cache.match(`${scope}index.html`)
  if (!shell) return
  const html = await shell.text()
  const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
    (match) => new URL(match[1], scope).href,
  )
  await Promise.all(
    urls.map((url) =>
      fetch(url)
        .then((response) => (response.ok ? cache.put(url, response) : null))
        .catch(() => null),
    ),
  )
}

self.addEventListener('install', (event) => {
  const scope = self.registration.scope
  const shell = [
    scope,
    `${scope}index.html`,
    `${scope}manifest.webmanifest`,
    `${scope}icons/icon-192.png`,
    `${scope}icons/icon-512.png`,
  ]
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(shell).then(() => precacheBuildAssets(cache, scope)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  const scope = self.registration.scope

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(`${scope}index.html`, copy))
          return response
        })
        .catch(() => caches.match(`${scope}index.html`).then((cached) => cached || caches.match(scope))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => new Response('offline', { status: 503 }))
    }),
  )
})

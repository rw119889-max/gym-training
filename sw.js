const CACHE = 'gym-training-mweivjvz'

// 预缓存清单：只放绝对必要的启动资源。
// 注意不能把 registration.scope 本身放进来——站点挂了分享码校验时根地址会返回 403，
// addAll 是「全有或全无」，一条失败就让整个 install 失败，新版本永远装不上。
const SHELL = ['index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']

const fresh = (url) => new Request(url, { cache: 'reload' })

async function put(cache, url) {
  const response = await fetch(fresh(url))
  if (!response.ok) return null
  await cache.put(url, response.clone())
  return response
}

async function precache(cache, scope) {
  // 逐个抓取、互不牵连：单个 403 或超时都不该阻断安装
  await Promise.allSettled(SHELL.map((rel) => put(cache, new URL(rel, scope).href)))

  const shell = await cache.match(new URL('index.html', scope).href)
  if (!shell) return
  const html = await shell.text()
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
    (match) => new URL(match[1], scope).href,
  )
  await Promise.allSettled(assets.map((url) => put(cache, url)))
}

self.addEventListener('install', (event) => {
  const scope = self.registration.scope
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      try {
        await precache(cache, scope)
      } catch {
        // 预缓存整体失败也要放行，页面至少还能走网络
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED', cache: CACHE }))
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  const scope = self.registration.scope

  if (request.mode === 'navigate') {
    // 文档一律绕过 HTTP 缓存：站点没有下发 Cache-Control，
    // 浏览器会按 Last-Modified 做启发式缓存，能把旧 HTML 留上几个小时。
    event.respondWith(
      (async () => {
        let response = null
        try {
          response = await fetch(request, { cache: 'no-store' })
        } catch {
          response = null
        }
        if (response && response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(`${scope}index.html`, copy))
          return response
        }
        // 网络失败或返回 4xx/5xx（例如分享码失效的 403 页）时优先用缓存里的正常页面，
        // 绝不能把错误页写进缓存冒充 index.html。
        const cached = await caches.match(`${scope}index.html`)
        if (cached) return cached
        if (response) return response
        return new Response('offline', { status: 503, headers: { 'content-type': 'text/plain' } })
      })(),
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

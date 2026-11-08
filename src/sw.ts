/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] }

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// registerType: 'autoUpdate' сам по себе новый SW не активирует — без этого
// он висит в waiting, пока не закрыты все вкладки, и приложение (особенно
// установленный PWA на телефоне) продолжает жить на старом бандле.
self.addEventListener('install', () => {
  void self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Gemini API — NetworkFirst
registerRoute(
  ({ url }) => url.hostname === 'generativelanguage.googleapis.com',
  new NetworkFirst({ cacheName: 'gemini-api-cache', networkTimeoutSeconds: 10 }),
)

// ── Push notifications ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string; tag?: string } ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'SPORA', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag ?? 'spora',
      requireInteraction: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin))
        if (existing) return existing.focus()
        return self.clients.openWindow('/')
      }),
  )
})

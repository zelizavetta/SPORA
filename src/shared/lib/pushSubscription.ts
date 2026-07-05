function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output.buffer.slice(0) as ArrayBuffer
}

async function getVapidKey(): Promise<string> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (envKey) return envKey
  const res = await fetch('/api/push/vapid-public-key')
  const { key } = await res.json()
  return key as string
}

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    // Сначала запросить разрешение на уведомления
    if (Notification.permission === 'denied') return false
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission()
      if (result !== 'granted') return false
    }

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const vapidKey = await getVapidKey()
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('spora_token') ?? ''}`,
      },
      body: JSON.stringify(sub),
    })
    return true
  } catch (e) {
    console.error('[push] subscribe failed', e)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await sub.unsubscribe()
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('spora_token') ?? ''}`,
    },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    return !!(await reg.pushManager.getSubscription())
  } catch {
    return false
  }
}

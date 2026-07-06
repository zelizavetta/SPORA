import type { Medication } from '@shared/types'

let _timers: ReturnType<typeof setTimeout>[] = []

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export function scheduleNotifications(medications: Medication[]) {
  _timers.forEach(id => clearTimeout(id))
  _timers = []

  if (Notification.permission !== 'granted') return

  const active = medications.filter(m => m.isActive)
  for (const med of active) {
    for (const t of (med.scheduledTimes ?? [])) {
      _scheduleOne(med, t)
    }
  }
}

function _scheduleOne(med: Medication, timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }

  const delay = target.getTime() - now.getTime()

  const id = setTimeout(() => {
    new Notification(`Время принять ${med.name}`, {
      body: med.dosage ? `Дозировка: ${med.dosage}` : 'SPORA напоминает о таблетке',
      icon: '/icons/icon-192.png',
      tag: `med-${med.uuid ?? med.name}-${timeStr}`,
      requireInteraction: true,
    })
    _scheduleOne(med, timeStr)
  }, delay)

  _timers.push(id)
}

export function clearNotifications() {
  _timers.forEach(id => clearTimeout(id))
  _timers = []
}

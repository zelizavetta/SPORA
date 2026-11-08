import { db, now } from '@shared/db'
import { request, isRetryable, getToken } from './request'
import type { OutboxEntry, OutboxOp } from '@shared/types'

type Payload = Record<string, unknown>

/** Сколько раз пытаемся дослать одну запись, прежде чем бросить её. */
const MAX_ATTEMPTS = 8

const listeners = new Set<(pending: number) => void>()

/** Подписка на размер очереди — для индикатора «не всё синхронизировано». */
export function onOutboxChange(fn: (pending: number) => void): () => void {
  listeners.add(fn)
  void pendingCount().then(fn)
  return () => { listeners.delete(fn) }
}

async function notify() {
  const count = await pendingCount()
  listeners.forEach(fn => fn(count))
}

export function pendingCount(): Promise<number> {
  return db.outbox.count()
}

/**
 * Кладём изменение в очередь, схлопывая его с уже накопленными по этой записи:
 * десять правок одной заметки офлайн должны улететь одним запросом, а не десятью.
 */
export async function enqueue(op: OutboxOp, entity: string, uuid: string, payload: Payload | null) {
  const pending = await db.outbox.where('uuid').equals(uuid).toArray()
  const mine    = pending.filter(e => e.entity === entity)

  if (op === 'remove') {
    // всё накопленное по записи больше не имеет смысла
    await Promise.all(mine.map(e => db.outbox.delete(e.id!)))
    await db.outbox.add({ op, entity, uuid, payload: null, createdAt: now(), attempts: 0 })
    return notify()
  }

  if (op === 'upsert') {
    // полный снимок записи перекрывает любые прежние правки
    await Promise.all(mine.map(e => db.outbox.delete(e.id!)))
    await db.outbox.add({ op, entity, uuid, payload, createdAt: now(), attempts: 0 })
    return notify()
  }

  // update: вливаем патч в уже стоящий в очереди upsert или update
  const mergeable = mine.find(e => e.op === 'upsert' || e.op === 'update')
  if (mergeable) {
    await db.outbox.update(mergeable.id!, {
      payload: { ...(mergeable.payload ?? {}), ...(payload ?? {}) },
    })
  } else {
    await db.outbox.add({ op, entity, uuid, payload, createdAt: now(), attempts: 0 })
  }
  return notify()
}

async function send(entry: OutboxEntry): Promise<void> {
  const { op, entity, uuid, payload } = entry
  if (op === 'remove') {
    await request(`/api/${entity}/${uuid}`, { method: 'DELETE' })
  } else if (op === 'upsert') {
    await request(`/api/${entity}`, { method: 'POST', body: JSON.stringify(payload) })
  } else {
    await request(`/api/${entity}/${uuid}`, { method: 'PUT', body: JSON.stringify(payload) })
  }
}

let flushing = false

/**
 * Досылает очередь в порядке накопления. Останавливается на первой сетевой
 * ошибке — порядок операций важен, обгонять застрявшую запись нельзя.
 * Возвращает число успешно отправленных изменений.
 */
export async function flushOutbox(): Promise<number> {
  if (flushing || !getToken() || !navigator.onLine) return 0
  flushing = true
  let sent = 0

  try {
    const queue = await db.outbox.orderBy('createdAt').toArray()
    for (const entry of queue) {
      try {
        await send(entry)
        await db.outbox.delete(entry.id!)
        sent++
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        if (!isRetryable(e)) {
          // сервер осознанно отверг запись — она никогда не пройдёт, убираем
          console.warn(`outbox: ${entry.op} ${entry.entity}/${entry.uuid} отвергнут — ${message}`)
          await db.outbox.delete(entry.id!)
          continue
        }
        const attempts = entry.attempts + 1
        if (attempts >= MAX_ATTEMPTS) {
          console.warn(`outbox: ${entry.entity}/${entry.uuid} — ${MAX_ATTEMPTS} неудач, бросаем`)
          await db.outbox.delete(entry.id!)
          continue
        }
        await db.outbox.update(entry.id!, { attempts, lastError: message })
        break // связи нет — остальное подождёт следующей попытки
      }
    }
  } finally {
    flushing = false
    await notify()
  }

  return sent
}

/** Досылать очередь при возвращении сети и при возврате на вкладку. */
export function startOutboxWatcher() {
  window.addEventListener('online', () => { void flushOutbox() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushOutbox()
  })
}

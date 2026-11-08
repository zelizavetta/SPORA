import { request, isRetryable } from './request'
import { enqueue } from './outbox'

export { setToken, clearToken } from './request'
export { ApiError } from './request'

/**
 * Отправляем сразу; если не вышло по причине, которая может пройти позже
 * (нет сети, сервер лежит, токен протух) — изменение уходит в очередь и
 * досылается при следующем удачном соединении.
 */
async function withOutbox<T>(
  op: 'upsert' | 'update' | 'remove',
  entity: string,
  uuid: string,
  payload: Record<string, unknown> | null,
  send: () => Promise<T>,
): Promise<T | null> {
  try {
    return await send()
  } catch (e) {
    if (isRetryable(e)) {
      await enqueue(op, entity, uuid, payload)
      return null
    }
    throw e
  }
}

export const api = {
  login: (password: string) =>
    request<{ token: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  sync: () => request<Record<string, unknown[]>>('/api/sync'),

  upsert: <T extends { uuid: string }>(entity: string, data: T) =>
    withOutbox('upsert', entity, data.uuid, data as unknown as Record<string, unknown>, () =>
      request<T>(`/api/${entity}`, { method: 'POST', body: JSON.stringify(data) })),

  update: <T>(entity: string, uuid: string, data: Partial<T>) =>
    withOutbox('update', entity, uuid, data as Record<string, unknown>, () =>
      request<T>(`/api/${entity}/${uuid}`, { method: 'PUT', body: JSON.stringify(data) })),

  remove: (entity: string, uuid: string) =>
    withOutbox('remove', entity, uuid, null, () =>
      request<{ ok: boolean }>(`/api/${entity}/${uuid}`, { method: 'DELETE' })),
}

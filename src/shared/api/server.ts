const BASE = import.meta.env.VITE_SERVER_URL ?? ''

function getToken(): string | null {
  return localStorage.getItem('spora_token')
}

export function setToken(token: string) {
  localStorage.setItem('spora_token', token)
}

export function clearToken() {
  localStorage.removeItem('spora_token')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: (password: string) =>
    request<{ token: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  sync: () => request<Record<string, unknown[]>>('/api/sync'),

  upsert: <T>(entity: string, data: T) =>
    request<T>(`/api/${entity}`, { method: 'POST', body: JSON.stringify(data) }),

  update: <T>(entity: string, uuid: string, data: Partial<T>) =>
    request<T>(`/api/${entity}/${uuid}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (entity: string, uuid: string) =>
    request<{ ok: boolean }>(`/api/${entity}/${uuid}`, { method: 'DELETE' }),
}

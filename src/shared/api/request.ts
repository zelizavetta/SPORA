const BASE = import.meta.env.VITE_SERVER_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem('spora_token')
}

export function setToken(token: string) {
  localStorage.setItem('spora_token', token)
}

export function clearToken() {
  localStorage.removeItem('spora_token')
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  // сетевые сбои прилетают как TypeError — у них нет статуса, и это повод повторить
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(err.error ?? res.statusText, res.status)
  }
  return res.json() as Promise<T>
}

/**
 * Стоит ли повторять запрос позже.
 * Сеть недоступна и ошибки сервера — да; отвергнутые данные (4xx) — нет,
 * иначе очередь встанет намертво на одной битой записи.
 * 401 оставляем в очереди: токен мог протухнуть, после входа досошлётся.
 */
export function isRetryable(e: unknown): boolean {
  if (e instanceof ApiError) {
    if (e.status === 401 || e.status === 408 || e.status === 429) return true
    return e.status >= 500
  }
  return true // TypeError от fetch и всё прочее — сеть
}

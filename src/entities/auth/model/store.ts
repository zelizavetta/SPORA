import { create } from 'zustand'
import { api, setToken, clearToken } from '@shared/api/server'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (password: string) => Promise<void>
  logout: () => void
  init: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('spora_token'),
  isLoading: false,
  error: null,

  init() {
    set({ isAuthenticated: !!localStorage.getItem('spora_token') })
  },

  async login(password) {
    set({ isLoading: true, error: null })
    try {
      const { token } = await api.login(password)
      setToken(token)
      set({ isAuthenticated: true, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  logout() {
    clearToken()
    set({ isAuthenticated: false })
  },
}))

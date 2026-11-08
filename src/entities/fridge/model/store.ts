import { create } from 'zustand'
import { db, now } from '@shared/db'
import { api } from '@shared/api/server'
import type { FridgeItem, ProductCategory } from '@shared/types'

interface FridgeStore {
  items: FridgeItem[]
  isLoading: boolean
  load: () => Promise<void>
  add: (name: string, category: ProductCategory, quantity: number, unit: string) => Promise<void>
  update: (id: number, patch: Partial<Pick<FridgeItem, 'name' | 'category' | 'quantity' | 'unit'>>) => Promise<void>
  changeQuantity: (id: number, delta: number) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useFridgeStore = create<FridgeStore>((set, get) => ({
  items: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const items = await db.fridge.orderBy('name').toArray()
    set({ items, isLoading: false })
  },

  add: async (name, category, quantity, unit) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.fridge.add({ uuid, name, category, quantity, unit, createdAt: ts, updatedAt: ts })
    const item = await db.fridge.get(id)
    if (item) {
      set(s => ({ items: [...s.items, item].sort((a, b) => a.name.localeCompare(b.name, 'ru')) }))
      api.upsert('fridge', item).catch(() => {})
    }
  },

  update: async (id, patch) => {
    const ts = now()
    await db.fridge.update(id, { ...patch, updatedAt: ts })
    set(s => ({
      items: s.items
        .map(i => i.id === id ? { ...i, ...patch, updatedAt: ts } : i)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    }))
    const item = get().items.find(i => i.id === id)
    if (item?.uuid) api.update('fridge', item.uuid, { ...patch, updatedAt: ts }).catch(() => {})
  },

  changeQuantity: async (id, delta) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return
    await get().update(id, { quantity: Math.max(0, item.quantity + delta) })
  },

  remove: async (id) => {
    const item = get().items.find(i => i.id === id)
    await db.fridge.delete(id)
    set(s => ({ items: s.items.filter(i => i.id !== id) }))
    if (item?.uuid) api.remove('fridge', item.uuid).catch(() => {})
  },
}))

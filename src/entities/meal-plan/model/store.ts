import { create } from 'zustand'
import { db, now } from '@shared/db'
import { api } from '@shared/api/server'
import type { MealPlanEntry } from '@shared/types'

interface MealPlanStore {
  entries: MealPlanEntry[]
  isLoading: boolean
  load: () => Promise<void>
  add: (date: string, recipeUuid: string) => Promise<void>
  remove: (id: number) => Promise<void>
  clearRange: (fromDate: string, toDate: string) => Promise<void>
}

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  entries: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const entries = await db.mealPlan.orderBy('date').toArray()
    set({ entries, isLoading: false })
  },

  add: async (date, recipeUuid) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.mealPlan.add({ uuid, date, recipeUuid, createdAt: ts, updatedAt: ts })
    const entry = await db.mealPlan.get(id)
    if (entry) {
      set(s => ({ entries: [...s.entries, entry] }))
      api.upsert('meal-plan', entry).catch(() => {})
    }
  },

  remove: async (id) => {
    const entry = get().entries.find(e => e.id === id)
    await db.mealPlan.delete(id)
    set(s => ({ entries: s.entries.filter(e => e.id !== id) }))
    if (entry?.uuid) api.remove('meal-plan', entry.uuid).catch(() => {})
  },

  clearRange: async (fromDate, toDate) => {
    const doomed = get().entries.filter(e => e.date >= fromDate && e.date <= toDate)
    await Promise.all(doomed.map(e => db.mealPlan.delete(e.id!)))
    set(s => ({ entries: s.entries.filter(e => !(e.date >= fromDate && e.date <= toDate)) }))
    doomed.forEach(e => { if (e.uuid) api.remove('meal-plan', e.uuid).catch(() => {}) })
  },
}))

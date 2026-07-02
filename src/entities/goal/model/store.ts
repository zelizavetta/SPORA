import { create } from 'zustand'
import { db, now } from '@shared/db'
import { api } from '@shared/api/server'
import type { Goal, GoalCategory, GoalMilestone } from '@shared/types'

interface GoalStore {
  goals: Goal[]
  isLoading: boolean
  load: () => Promise<void>
  add: (title: string, description: string, category: GoalCategory, targetDate: string | null) => Promise<void>
  updateProgress: (id: number, progress: number) => Promise<void>
  toggleMilestone: (goalId: number, milestoneId: string) => Promise<void>
  addMilestone: (goalId: number, milestone: GoalMilestone) => Promise<void>
  complete: (id: number) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const goals = await db.goals.orderBy('createdAt').reverse().toArray()
    set({ goals, isLoading: false })
  },

  add: async (title, description, category, targetDate) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.goals.add({
      uuid, title, description, category, targetDate,
      progress: 0, isCompleted: false, milestones: [],
      createdAt: ts, updatedAt: ts,
    })
    const goal = await db.goals.get(id)
    if (goal) {
      set(s => ({ goals: [goal, ...s.goals] }))
      api.upsert('goals', goal).catch(() => {})
    }
  },

  updateProgress: async (id, progress) => {
    const ts = now()
    await db.goals.update(id, { progress, updatedAt: ts })
    set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, progress, updatedAt: ts } : g) }))
    const goal = get().goals.find(g => g.id === id)
    if (goal?.uuid) api.update('goals', goal.uuid, { progress, updatedAt: ts }).catch(() => {})
  },

  toggleMilestone: async (goalId, milestoneId) => {
    const goal = get().goals.find(g => g.id === goalId)
    if (!goal) return
    const milestones = goal.milestones.map(m =>
      m.id === milestoneId ? { ...m, isDone: !m.isDone } : m
    )
    const ts = now()
    await db.goals.update(goalId, { milestones, updatedAt: ts })
    set(s => ({ goals: s.goals.map(g => g.id === goalId ? { ...g, milestones, updatedAt: ts } : g) }))
    if (goal.uuid) api.update('goals', goal.uuid, { milestones, updatedAt: ts }).catch(() => {})
  },

  addMilestone: async (goalId, milestone) => {
    const goal = get().goals.find(g => g.id === goalId)
    if (!goal) return
    const milestones = [...goal.milestones, milestone]
    const ts = now()
    await db.goals.update(goalId, { milestones, updatedAt: ts })
    set(s => ({ goals: s.goals.map(g => g.id === goalId ? { ...g, milestones, updatedAt: ts } : g) }))
    if (goal.uuid) api.update('goals', goal.uuid, { milestones, updatedAt: ts }).catch(() => {})
  },

  complete: async (id) => {
    const ts = now()
    await db.goals.update(id, { isCompleted: true, progress: 100, updatedAt: ts })
    set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, isCompleted: true, progress: 100, updatedAt: ts } : g) }))
    const goal = get().goals.find(g => g.id === id)
    if (goal?.uuid) api.update('goals', goal.uuid, { isCompleted: true, progress: 100, updatedAt: ts }).catch(() => {})
  },

  remove: async (id) => {
    const goal = get().goals.find(g => g.id === id)
    await db.goals.delete(id)
    set(s => ({ goals: s.goals.filter(g => g.id !== id) }))
    if (goal?.uuid) api.remove('goals', goal.uuid).catch(() => {})
  },
}))

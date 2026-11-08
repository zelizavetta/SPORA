import { create } from 'zustand'
import { db, now, today } from '@shared/db'
import { api } from '@shared/api/server'
import type { WorkoutSession, WorkoutType } from '@shared/types'

interface WorkoutStore {
  sessions: WorkoutSession[]
  isLoading: boolean
  load: () => Promise<void>
  add: (type: WorkoutType, durationMin: number, note: string) => Promise<void>
  remove: (id: number) => Promise<void>
  todaySessions: () => WorkoutSession[]
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  sessions: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const sessions = await db.workouts.orderBy('createdAt').reverse().toArray()
    set({ sessions, isLoading: false })
  },

  add: async (type, durationMin, note) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.workouts.add({ uuid, type, durationMin, note, date: today(), createdAt: ts, updatedAt: ts })
    const session = await db.workouts.get(id)
    if (session) {
      set(s => ({ sessions: [session, ...s.sessions] }))
      api.upsert('workouts', session).catch(() => {})
    }
  },

  remove: async (id) => {
    const session = get().sessions.find(w => w.id === id)
    await db.workouts.delete(id)
    set(s => ({ sessions: s.sessions.filter(w => w.id !== id) }))
    if (session?.uuid) api.remove('workouts', session.uuid).catch(() => {})
  },

  todaySessions: () => get().sessions.filter(w => w.date === today()),
}))

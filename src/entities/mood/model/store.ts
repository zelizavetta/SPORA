import { create } from 'zustand'
import { db, now, today } from '@shared/db'
import type { MoodEntry, MoodScore, MoodEmotion } from '@shared/types'

interface MoodStore {
  entries: MoodEntry[]
  isLoading: boolean
  load: () => Promise<void>
  add: (score: MoodScore, emotions: MoodEmotion[], note: string) => Promise<void>
  remove: (id: number) => Promise<void>
  todayEntry: () => MoodEntry | undefined
}

export const useMoodStore = create<MoodStore>((set, get) => ({
  entries: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const entries = await db.moods.orderBy('createdAt').reverse().toArray()
    set({ entries, isLoading: false })
  },

  add: async (score, emotions, note) => {
    const ts = now()
    const id = await db.moods.add({ score, emotions, note, date: today(), createdAt: ts, updatedAt: ts })
    const entry = await db.moods.get(id)
    if (entry) set(s => ({ entries: [entry, ...s.entries] }))
  },

  remove: async (id) => {
    await db.moods.delete(id)
    set(s => ({ entries: s.entries.filter(e => e.id !== id) }))
  },

  todayEntry: () => get().entries.find(e => e.date === today()),
}))

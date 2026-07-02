import { create } from 'zustand'
import { db, now, today } from '@shared/db'
import { api } from '@shared/api/server'
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
    const uuid = crypto.randomUUID()
    const id = await db.moods.add({ uuid, score, emotions, note, date: today(), createdAt: ts, updatedAt: ts })
    const entry = await db.moods.get(id)
    if (entry) {
      set(s => ({ entries: [entry, ...s.entries] }))
      api.upsert('moods', entry).catch(() => {})
    }
  },

  remove: async (id) => {
    const entry = get().entries.find(e => e.id === id)
    await db.moods.delete(id)
    set(s => ({ entries: s.entries.filter(e => e.id !== id) }))
    if (entry?.uuid) api.remove('moods', entry.uuid).catch(() => {})
  },

  todayEntry: () => get().entries.find(e => e.date === today()),
}))

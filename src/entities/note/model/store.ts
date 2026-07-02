import { create } from 'zustand'
import { db, now } from '@shared/db'
import { api } from '@shared/api/server'
import type { Note, NoteColor } from '@shared/types'

interface NoteStore {
  notes: Note[]
  isLoading: boolean
  load: () => Promise<void>
  add: (title: string, body: string, color: NoteColor, tags: string[]) => Promise<void>
  update: (id: number, patch: Partial<Pick<Note, 'title' | 'body' | 'color' | 'tags' | 'isPinned'>>) => Promise<void>
  remove: (id: number) => Promise<void>
  togglePin: (id: number) => Promise<void>
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const notes = await db.notes.orderBy('createdAt').reverse().toArray()
    set({ notes, isLoading: false })
  },

  add: async (title, body, color, tags) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.notes.add({ uuid, title, body, color, tags, isPinned: false, createdAt: ts, updatedAt: ts })
    const note = await db.notes.get(id)
    if (note) {
      set(s => ({ notes: [note, ...s.notes] }))
      api.upsert('notes', note).catch(() => {})
    }
  },

  update: async (id, patch) => {
    const ts = now()
    await db.notes.update(id, { ...patch, updatedAt: ts })
    set(s => ({
      notes: s.notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: ts } : n),
    }))
    const note = get().notes.find(n => n.id === id)
    if (note?.uuid) api.update('notes', note.uuid, { ...patch, updatedAt: ts }).catch(() => {})
  },

  remove: async (id) => {
    const note = get().notes.find(n => n.id === id)
    await db.notes.delete(id)
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }))
    if (note?.uuid) api.remove('notes', note.uuid).catch(() => {})
  },

  togglePin: async (id) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return
    await get().update(id, { isPinned: !note.isPinned })
  },
}))

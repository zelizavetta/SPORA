import { create } from 'zustand'
import { db, now } from '@shared/db'
import type { Task, TaskPriority, TaskStatus } from '@shared/types'

interface TaskStore {
  tasks: Task[]
  isLoading: boolean
  load: () => Promise<void>
  add: (title: string, description: string, priority: TaskPriority, dueDate: string | null, tags: string[]) => Promise<void>
  updateStatus: (id: number, status: TaskStatus) => Promise<void>
  update: (id: number, patch: Partial<Task>) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const tasks = await db.tasks.orderBy('createdAt').reverse().toArray()
    set({ tasks, isLoading: false })
  },

  add: async (title, description, priority, dueDate, tags) => {
    const ts = now()
    const id = await db.tasks.add({
      title, description, priority, dueDate, tags,
      status: 'todo', createdAt: ts, updatedAt: ts,
    })
    const task = await db.tasks.get(id)
    if (task) set(s => ({ tasks: [task, ...s.tasks] }))
  },

  updateStatus: async (id, status) => {
    await db.tasks.update(id, { status, updatedAt: now() })
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t) }))
  },

  update: async (id, patch) => {
    await db.tasks.update(id, { ...patch, updatedAt: now() })
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }))
  },

  remove: async (id) => {
    await db.tasks.delete(id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
}))

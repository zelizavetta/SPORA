import { create } from 'zustand'
import { db, now } from '@shared/db'
import { api } from '@shared/api/server'
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

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const tasks = await db.tasks.orderBy('createdAt').reverse().toArray()
    set({ tasks, isLoading: false })
  },

  add: async (title, description, priority, dueDate, tags) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.tasks.add({
      uuid, title, description, priority, dueDate, tags,
      status: 'todo', createdAt: ts, updatedAt: ts,
    })
    const task = await db.tasks.get(id)
    if (task) {
      set(s => ({ tasks: [task, ...s.tasks] }))
      api.upsert('tasks', task).catch(() => {})
    }
  },

  updateStatus: async (id, status) => {
    const ts = now()
    await db.tasks.update(id, { status, updatedAt: ts })
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status, updatedAt: ts } : t) }))
    const task = get().tasks.find(t => t.id === id)
    if (task?.uuid) api.update('tasks', task.uuid, { status, updatedAt: ts }).catch(() => {})
  },

  update: async (id, patch) => {
    const ts = now()
    await db.tasks.update(id, { ...patch, updatedAt: ts })
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: ts } : t) }))
    const task = get().tasks.find(t => t.id === id)
    if (task?.uuid) api.update('tasks', task.uuid, { ...patch, updatedAt: ts }).catch(() => {})
  },

  remove: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    await db.tasks.delete(id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
    if (task?.uuid) api.remove('tasks', task.uuid).catch(() => {})
  },
}))

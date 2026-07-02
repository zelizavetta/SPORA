import { db } from '@shared/db'
import { api } from './server'
import type {
  MoodEntry, Note, Task, WorkoutSession,
  Goal, WeightEntry, MedicationEntry, Medication,
} from '@shared/types'

async function mergeTable<T extends { uuid: string }>(
  table: { where(field: string): { anyOf(uuids: string[]): { toArray(): Promise<T[]> } }; bulkAdd(items: T[]): Promise<unknown>; where(field: string): { equals(uuid: string): { modify(patch: Partial<T>): Promise<unknown> } } },
  items: T[],
) {
  if (!items.length) return
  const uuids = items.map(i => i.uuid)
  const existing = await (table as any).where('uuid').anyOf(uuids).toArray() as T[]
  const existingSet = new Set(existing.map(e => e.uuid))
  const toAdd = items.filter(i => !existingSet.has(i.uuid))
  if (toAdd.length) await (table as any).bulkAdd(toAdd)
  for (const item of items.filter(i => existingSet.has(i.uuid))) {
    await (table as any).where('uuid').equals(item.uuid).modify(item)
  }
}

export async function pullServerSync() {
  const data = await api.sync() as {
    moods: MoodEntry[]
    notes: Note[]
    tasks: Task[]
    workouts: WorkoutSession[]
    goals: Goal[]
    weights: WeightEntry[]
    medicationLogs: MedicationEntry[]
    medications: Medication[]
  }
  await Promise.all([
    mergeTable(db.moods as any, data.moods),
    mergeTable(db.notes as any, data.notes),
    mergeTable(db.tasks as any, data.tasks),
    mergeTable(db.workouts as any, data.workouts),
    mergeTable(db.goals as any, data.goals),
    mergeTable(db.weights as any, data.weights),
    mergeTable(db.medicationLogs as any, data.medicationLogs),
    mergeTable(db.medications as any, data.medications),
  ])
}

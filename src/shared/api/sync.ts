import { db } from '@shared/db'
import { api } from './server'
import { enqueue } from './outbox'
import type {
  MoodEntry, Note, Task, WorkoutSession,
  Goal, WeightEntry, MedicationEntry, Medication,
  Recipe, FridgeItem, MealPlanEntry,
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

const BACKFILL_KEY = 'spora_outbox_backfilled_v1'

/**
 * Разовая доотправка. Записи, созданные до появления очереди (или пока
 * сервер лежал, а промах просто проглатывался), живут только в IndexedDB.
 * Ставим их все в очередь — сервер разрулит по uuid, дублей не будет.
 */
export async function backfillOutbox() {
  if (localStorage.getItem(BACKFILL_KEY)) return

  const tables: [string, { toArray(): Promise<{ uuid: string }[]> }][] = [
    ['moods', db.moods], ['notes', db.notes], ['tasks', db.tasks],
    ['workouts', db.workouts], ['goals', db.goals], ['weights', db.weights],
    ['medication-logs', db.medicationLogs], ['medications', db.medications],
    ['recipes', db.recipes], ['fridge', db.fridge], ['meal-plan', db.mealPlan],
  ]

  for (const [entity, table] of tables) {
    const rows = await table.toArray()
    for (const row of rows) {
      if (!row.uuid) continue
      await enqueue('upsert', entity, row.uuid, row as unknown as Record<string, unknown>)
    }
  }

  localStorage.setItem(BACKFILL_KEY, String(Date.now()))
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
    recipes?: Recipe[]
    fridge?: FridgeItem[]
    mealPlan?: MealPlanEntry[]
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
    mergeTable(db.recipes as any, data.recipes ?? []),
    mergeTable(db.fridge as any, data.fridge ?? []),
    mergeTable(db.mealPlan as any, data.mealPlan ?? []),
  ])
}

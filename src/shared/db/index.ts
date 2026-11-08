import Dexie, { type EntityTable } from 'dexie'
import type {
  MoodEntry, Note, Task, WorkoutSession,
  Goal, WeightEntry, MedicationEntry, Medication,
  Recipe, FridgeItem, MealPlanEntry, OutboxEntry,
} from '@shared/types'

class SporaDB extends Dexie {
  moods!: EntityTable<MoodEntry, 'id'>
  notes!: EntityTable<Note, 'id'>
  tasks!: EntityTable<Task, 'id'>
  workouts!: EntityTable<WorkoutSession, 'id'>
  goals!: EntityTable<Goal, 'id'>
  weights!: EntityTable<WeightEntry, 'id'>
  medicationLogs!: EntityTable<MedicationEntry, 'id'>
  medications!: EntityTable<Medication, 'id'>
  recipes!: EntityTable<Recipe, 'id'>
  fridge!: EntityTable<FridgeItem, 'id'>
  mealPlan!: EntityTable<MealPlanEntry, 'id'>
  outbox!: EntityTable<OutboxEntry, 'id'>

  constructor() {
    super('spora')
    this.version(1).stores({
      moods: '++id, date, score, createdAt',
      notes: '++id, isPinned, createdAt, updatedAt, *tags',
      tasks: '++id, status, priority, dueDate, createdAt, *tags',
      workouts: '++id, type, date, createdAt',
      goals: '++id, category, isCompleted, createdAt',
      weights: '++id, date, createdAt',
      medicationLogs: '++id, date, name, takenAt',
      medications: '++id, isActive, name',
    })
    this.version(2).stores({
      moods: '++id, uuid, date, score, createdAt',
      notes: '++id, uuid, isPinned, createdAt, updatedAt, *tags',
      tasks: '++id, uuid, status, priority, dueDate, createdAt, *tags',
      workouts: '++id, uuid, type, date, createdAt',
      goals: '++id, uuid, category, isCompleted, createdAt',
      weights: '++id, uuid, date, createdAt',
      medicationLogs: '++id, uuid, date, name, takenAt',
      medications: '++id, uuid, isActive, name',
    })
    this.version(3).stores({
      medicationLogs: '++id, uuid, date, name, takenAt, createdAt',
    })
    // v4: добавляем medicationUuid для точного определения факта приёма
    this.version(4).stores({
      medicationLogs: '++id, uuid, medicationUuid, date, name, takenAt, createdAt',
    })
    // v6: добавляем linkedNoteUuids к заметкам
    this.version(6).stores({
      notes: '++id, uuid, isPinned, createdAt, updatedAt, *tags',
    }).upgrade(tx => {
      return tx.table('notes').toCollection().modify((note: any) => {
        if (!note.linkedNoteUuids) note.linkedNoteUuids = []
      })
    })
    // v7: добавляем dependsOnUuids к задачам
    this.version(7).stores({
      tasks: '++id, uuid, status, priority, dueDate, createdAt, *tags',
    }).upgrade(tx => {
      return tx.table('tasks').toCollection().modify((task: any) => {
        if (!task.dependsOnUuids) task.dependsOnUuids = []
      })
    })
    // v8: кросс-тип линки (note→task, task→note)
    this.version(8).stores({
      notes: '++id, uuid, isPinned, createdAt, updatedAt, *tags',
      tasks: '++id, uuid, status, priority, dueDate, createdAt, *tags',
    }).upgrade(tx => {
      tx.table('notes').toCollection().modify((n: any) => { if (!n.linkedTaskUuids) n.linkedTaskUuids = [] })
      return tx.table('tasks').toCollection().modify((t: any) => { if (!t.linkedNoteUuids) t.linkedNoteUuids = [] })
    })
    // v9: location on notes
    this.version(9).stores({
      notes: '++id, uuid, isPinned, createdAt, updatedAt, *tags',
    }).upgrade(tx => {
      return tx.table('notes').toCollection().modify((n: any) => {
        if (n.location === undefined) n.location = null
      })
    })
    // v10: cluster/folder for notes
    this.version(10).stores({
      notes: '++id, uuid, isPinned, createdAt, updatedAt, *tags, cluster',
    }).upgrade(tx => {
      return tx.table('notes').toCollection().modify((n: any) => {
        if (n.cluster === undefined) n.cluster = null
      })
    })
    // v11: рецепты и холодильник
    this.version(11).stores({
      recipes: '++id, uuid, type, createdAt, updatedAt',
      fridge:  '++id, uuid, category, name, updatedAt',
    })
    // v12: план рецептов на неделю
    this.version(12).stores({
      mealPlan: '++id, uuid, date, recipeUuid, createdAt',
    })
    // v13: очередь изменений, не доехавших до сервера
    this.version(13).stores({
      outbox: '++id, entity, uuid, createdAt',
    })
    // v5: scheduledTime → scheduledTimes[], + daysOfWeek[]
    this.version(5).stores({
      medications: '++id, uuid, isActive, name',
    }).upgrade(tx => {
      return tx.table('medications').toCollection().modify((med: any) => {
        if (!med.scheduledTimes) {
          med.scheduledTimes = [med.scheduledTime ?? '09:00']
        }
        if (!med.daysOfWeek) {
          med.daysOfWeek = []
        }
        delete med.scheduledTime
      })
    })
  }
}

export const db = new SporaDB()

export function now() {
  return Date.now()
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

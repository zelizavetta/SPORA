import Dexie, { type EntityTable } from 'dexie'
import type {
  MoodEntry, Note, Task, WorkoutSession,
  Goal, WeightEntry, MedicationEntry, Medication,
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

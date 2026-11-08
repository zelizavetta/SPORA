import { create } from 'zustand'
import { db, now, today } from '@shared/db'
import { api } from '@shared/api/server'
import type { WeightEntry, MedicationEntry, Medication } from '@shared/types'

interface HealthStore {
  weights: WeightEntry[]
  medicationLogs: MedicationEntry[]
  medications: Medication[]
  isLoading: boolean
  load: () => Promise<void>
  addWeight: (weightKg: number) => Promise<void>
  logMedication: (medicationUuid: string, name: string, dosage: string) => Promise<void>
  addMedication: (name: string, dosage: string, scheduledTimes: string[], daysOfWeek: number[]) => Promise<void>
  removeMedication: (id: number) => Promise<void>
  todayLogs: () => MedicationEntry[]
  latestWeight: () => WeightEntry | undefined
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  weights: [],
  medicationLogs: [],
  medications: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const [weights, medicationLogs, medications] = await Promise.all([
      db.weights.orderBy('createdAt').reverse().toArray(),
      db.medicationLogs.orderBy('createdAt').reverse().toArray(),
      db.medications.orderBy('name').toArray(),
    ])
    set({ weights, medicationLogs, medications, isLoading: false })
  },

  addWeight: async (weightKg) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.weights.add({ uuid, weightKg, date: today(), createdAt: ts, updatedAt: ts })
    const entry = await db.weights.get(id)
    if (entry) {
      set(s => ({ weights: [entry, ...s.weights] }))
      api.upsert('weights', entry).catch(() => {})
    }
  },

  logMedication: async (medicationUuid, name, dosage) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.medicationLogs.add({ uuid, medicationUuid, name, dosage, takenAt: ts, date: today(), createdAt: ts, updatedAt: ts })
    const entry = await db.medicationLogs.get(id)
    if (entry) {
      set(s => ({ medicationLogs: [entry, ...s.medicationLogs] }))
      api.upsert('medication-logs', entry).catch(() => {})
    }
  },

  addMedication: async (name, dosage, scheduledTimes, daysOfWeek) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.medications.add({ uuid, name, dosage, scheduledTimes, daysOfWeek, isActive: true, createdAt: ts, updatedAt: ts })
    const med = await db.medications.get(id)
    if (med) {
      set(s => ({ medications: [...s.medications, med] }))
      api.upsert('medications', med).catch(() => {})
    }
  },

  removeMedication: async (id) => {
    const med = get().medications.find(m => m.id === id)
    await db.medications.delete(id)
    set(s => ({ medications: s.medications.filter(m => m.id !== id) }))
    if (med?.uuid) api.remove('medications', med.uuid).catch(() => {})
  },

  todayLogs: () => get().medicationLogs.filter(l => l.date === today()),
  latestWeight: () => get().weights[0],
}))

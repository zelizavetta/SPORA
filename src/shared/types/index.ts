export type ID = number

export interface BaseRecord {
  id?: ID
  uuid: string
  createdAt: number
  updatedAt: number
}

// Mood
export type MoodScore = 1 | 2 | 3 | 4 | 5
export type MoodEmotion =
  | 'calm' | 'happy' | 'excited' | 'grateful'
  | 'anxious' | 'sad' | 'tired' | 'angry' | 'confused'

export interface MoodEntry extends BaseRecord {
  score: MoodScore
  emotions: MoodEmotion[]
  note: string
  date: string // YYYY-MM-DD
}

// Note
export type NoteColor = 'lavender' | 'sage' | 'peach' | 'sky' | 'vanilla'

export interface Note extends BaseRecord {
  title: string
  body: string
  color: NoteColor
  tags: string[]
  isPinned: boolean
}

// Task / Planning
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task extends BaseRecord {
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null // YYYY-MM-DD
  tags: string[]
}

// Workout
export type WorkoutType = 'yoga' | 'stretch' | 'walk' | 'run' | 'strength' | 'other'

export interface WorkoutSession extends BaseRecord {
  type: WorkoutType
  durationMin: number
  note: string
  date: string // YYYY-MM-DD
}

// Goal
export type GoalCategory = 'health' | 'study' | 'sport' | 'language' | 'personal' | 'other'

export interface Goal extends BaseRecord {
  title: string
  description: string
  category: GoalCategory
  targetDate: string | null
  progress: number // 0–100
  isCompleted: boolean
  milestones: GoalMilestone[]
}

export interface GoalMilestone {
  id: string
  title: string
  isDone: boolean
}

// Health
export interface WeightEntry extends BaseRecord {
  weightKg: number
  date: string // YYYY-MM-DD
}

export interface MedicationEntry extends BaseRecord {
  medicationUuid: string
  name: string
  dosage: string
  takenAt: number // timestamp
  date: string // YYYY-MM-DD
}

export interface Medication extends BaseRecord {
  name: string
  dosage: string
  scheduledTimes: string[] // HH:MM[]
  daysOfWeek: number[]     // 0=Вс 1=Пн 2=Вт 3=Ср 4=Чт 5=Пт 6=Сб; [] = каждый день
  isActive: boolean
}

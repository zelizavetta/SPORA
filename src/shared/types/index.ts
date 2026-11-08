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

export interface NoteLocation {
  lat: number
  lon: number
  name?: string
}

export interface Note extends BaseRecord {
  title: string
  body: string
  color: NoteColor
  tags: string[]
  isPinned: boolean
  linkedNoteUuids: string[]
  linkedTaskUuids: string[]
  location?: NoteLocation | null
  cluster?: string | null
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
  dependsOnUuids: string[]
  linkedNoteUuids: string[]
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

// Recipes & fridge
export type RecipeType =
  | 'breakfast' | 'soup' | 'hot' | 'salad' | 'sweet' | 'drink' | 'snack' | 'other'

export type ProductCategory =
  | 'meat' | 'dairy' | 'vegetable' | 'fruit'
  | 'grain' | 'spice' | 'drink' | 'sweet' | 'other'

export interface RecipeIngredient {
  id: string
  name: string
  amount: string // свободная форма: «200 г», «2 шт»
}

export interface Recipe extends BaseRecord {
  title: string
  description: string
  type: RecipeType
  ingredients: RecipeIngredient[]
}

export interface FridgeItem extends BaseRecord {
  name: string
  category: ProductCategory
  quantity: number
  unit: string // «шт», «г», «мл»
}

/** Изменение, не доехавшее до сервера — досылается при появлении связи. */
export type OutboxOp = 'upsert' | 'update' | 'remove'

export interface OutboxEntry {
  id?: ID
  op: OutboxOp
  entity: string // 'notes', 'recipes', …
  uuid: string
  payload: Record<string, unknown> | null
  createdAt: number
  attempts: number
  lastError?: string
}

/** Рецепт, запланированный на конкретный день недели. */
export interface MealPlanEntry extends BaseRecord {
  date: string // YYYY-MM-DD
  recipeUuid: string
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

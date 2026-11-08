import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moods (
      uuid        TEXT    PRIMARY KEY,
      score       INTEGER NOT NULL,
      emotions    JSONB   NOT NULL DEFAULT '[]',
      note        TEXT    NOT NULL DEFAULT '',
      date        TEXT    NOT NULL,
      created_at  BIGINT  NOT NULL,
      updated_at  BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      uuid               TEXT    PRIMARY KEY,
      title              TEXT    NOT NULL,
      body               TEXT    NOT NULL DEFAULT '',
      color              TEXT    NOT NULL DEFAULT 'lavender',
      tags               JSONB   NOT NULL DEFAULT '[]',
      is_pinned          BOOLEAN NOT NULL DEFAULT FALSE,
      linked_note_uuids  JSONB   NOT NULL DEFAULT '[]',
      linked_task_uuids  JSONB   NOT NULL DEFAULT '[]',
      location           JSONB,
      cluster            TEXT,
      created_at         BIGINT  NOT NULL,
      updated_at         BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      uuid               TEXT    PRIMARY KEY,
      title              TEXT    NOT NULL,
      description        TEXT    NOT NULL DEFAULT '',
      priority           TEXT    NOT NULL DEFAULT 'medium',
      status             TEXT    NOT NULL DEFAULT 'todo',
      due_date           TEXT,
      tags               JSONB   NOT NULL DEFAULT '[]',
      depends_on_uuids   JSONB   NOT NULL DEFAULT '[]',
      linked_note_uuids  JSONB   NOT NULL DEFAULT '[]',
      created_at         BIGINT  NOT NULL,
      updated_at         BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      uuid         TEXT    PRIMARY KEY,
      type         TEXT    NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 0,
      note         TEXT    NOT NULL DEFAULT '',
      date         TEXT    NOT NULL,
      created_at   BIGINT  NOT NULL,
      updated_at   BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      uuid         TEXT    PRIMARY KEY,
      title        TEXT    NOT NULL,
      description  TEXT    NOT NULL DEFAULT '',
      category     TEXT    NOT NULL DEFAULT 'personal',
      target_date  TEXT,
      progress     INTEGER NOT NULL DEFAULT 0,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      milestones   JSONB   NOT NULL DEFAULT '[]',
      created_at   BIGINT  NOT NULL,
      updated_at   BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weights (
      uuid        TEXT    PRIMARY KEY,
      weight_kg   NUMERIC NOT NULL,
      date        TEXT    NOT NULL,
      created_at  BIGINT  NOT NULL,
      updated_at  BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      uuid             TEXT    PRIMARY KEY,
      medication_uuid  TEXT    NOT NULL DEFAULT '',
      name             TEXT    NOT NULL,
      dosage           TEXT    NOT NULL DEFAULT '',
      taken_at         BIGINT  NOT NULL,
      date             TEXT    NOT NULL,
      created_at       BIGINT  NOT NULL,
      updated_at       BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      uuid             TEXT    PRIMARY KEY,
      name             TEXT    NOT NULL,
      dosage           TEXT    NOT NULL DEFAULT '',
      scheduled_times  JSONB   NOT NULL DEFAULT '["09:00"]',
      days_of_week     JSONB   NOT NULL DEFAULT '[]',
      is_active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at       BIGINT  NOT NULL,
      updated_at       BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      uuid         TEXT    PRIMARY KEY,
      title        TEXT    NOT NULL,
      description  TEXT    NOT NULL DEFAULT '',
      type         TEXT    NOT NULL DEFAULT 'other',
      ingredients  JSONB   NOT NULL DEFAULT '[]',
      created_at   BIGINT  NOT NULL,
      updated_at   BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fridge (
      uuid        TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL DEFAULT 'other',
      quantity    NUMERIC NOT NULL DEFAULT 0,
      unit        TEXT    NOT NULL DEFAULT 'шт',
      created_at  BIGINT  NOT NULL,
      updated_at  BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_plan (
      uuid        TEXT   PRIMARY KEY,
      date        TEXT   NOT NULL,
      recipe_uuid TEXT   NOT NULL,
      created_at  BIGINT NOT NULL,
      updated_at  BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id           SERIAL      PRIMARY KEY,
      endpoint     TEXT        NOT NULL UNIQUE,
      subscription JSONB       NOT NULL,
      timezone     TEXT        NOT NULL DEFAULT 'UTC',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await pool.query(`
    ALTER TABLE notes
      ADD COLUMN IF NOT EXISTS linked_note_uuids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE notes
      ADD COLUMN IF NOT EXISTS linked_task_uuids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE notes
      ADD COLUMN IF NOT EXISTS location JSONB;
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS depends_on_uuids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS linked_note_uuids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE notes
      ADD COLUMN IF NOT EXISTS cluster TEXT;
  `)
  await pool.query(`
    ALTER TABLE medication_logs
      ADD COLUMN IF NOT EXISTS medication_uuid TEXT NOT NULL DEFAULT '';
    ALTER TABLE push_subscriptions
      ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
    ALTER TABLE medications
      ADD COLUMN IF NOT EXISTS scheduled_times JSONB NOT NULL DEFAULT '["09:00"]';
    ALTER TABLE medications
      ADD COLUMN IF NOT EXISTS days_of_week JSONB NOT NULL DEFAULT '[]';
  `)
  console.log('DB schema ready')
}

// Схема инициализируется один раз, но если попытка провалилась (БД была
// недоступна на старте) — следующий запрос попробует снова.
let initPromise = null
export function ensureDb() {
  if (!initPromise) {
    initPromise = initDb().catch(e => { initPromise = null; throw e })
  }
  return initPromise
}

// BIGINT comes from pg as string — normalize to Number
const n = v => Number(v)

export const mapMood = r => ({
  uuid: r.uuid, score: r.score, emotions: r.emotions,
  note: r.note, date: r.date,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapNote = r => ({
  uuid: r.uuid, title: r.title, body: r.body,
  color: r.color, tags: r.tags, isPinned: r.is_pinned,
  linkedNoteUuids: r.linked_note_uuids ?? [],
  linkedTaskUuids: r.linked_task_uuids ?? [],
  location: r.location ?? null,
  cluster: r.cluster ?? null,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapTask = r => ({
  uuid: r.uuid, title: r.title, description: r.description,
  priority: r.priority, status: r.status, dueDate: r.due_date,
  tags: r.tags,
  dependsOnUuids: r.depends_on_uuids ?? [],
  linkedNoteUuids: r.linked_note_uuids ?? [],
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapWorkout = r => ({
  uuid: r.uuid, type: r.type, durationMin: r.duration_min,
  note: r.note, date: r.date,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapGoal = r => ({
  uuid: r.uuid, title: r.title, description: r.description,
  category: r.category, targetDate: r.target_date,
  progress: r.progress, isCompleted: r.is_completed,
  milestones: r.milestones,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapWeight = r => ({
  uuid: r.uuid, weightKg: Number(r.weight_kg), date: r.date,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapMedLog = r => ({
  uuid: r.uuid, medicationUuid: r.medication_uuid ?? '', name: r.name, dosage: r.dosage,
  takenAt: n(r.taken_at), date: r.date,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapRecipe = r => ({
  uuid: r.uuid, title: r.title, description: r.description,
  type: r.type, ingredients: r.ingredients ?? [],
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapFridgeItem = r => ({
  uuid: r.uuid, name: r.name, category: r.category,
  quantity: Number(r.quantity), unit: r.unit,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapMealPlan = r => ({
  uuid: r.uuid, date: r.date, recipeUuid: r.recipe_uuid,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapMed = r => ({
  uuid: r.uuid, name: r.name, dosage: r.dosage,
  scheduledTimes: r.scheduled_times ?? [r.scheduled_time ?? '09:00'],
  daysOfWeek: r.days_of_week ?? [],
  isActive: r.is_active,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

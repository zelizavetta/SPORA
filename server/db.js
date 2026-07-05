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
      uuid        TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      body        TEXT    NOT NULL DEFAULT '',
      color       TEXT    NOT NULL DEFAULT 'lavender',
      tags        JSONB   NOT NULL DEFAULT '[]',
      is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  BIGINT  NOT NULL,
      updated_at  BIGINT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      uuid        TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      priority    TEXT    NOT NULL DEFAULT 'medium',
      status      TEXT    NOT NULL DEFAULT 'todo',
      due_date    TEXT,
      tags        JSONB   NOT NULL DEFAULT '[]',
      created_at  BIGINT  NOT NULL,
      updated_at  BIGINT  NOT NULL
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
      uuid            TEXT    PRIMARY KEY,
      name            TEXT    NOT NULL,
      dosage          TEXT    NOT NULL DEFAULT '',
      scheduled_time  TEXT    NOT NULL DEFAULT '09:00',
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      BIGINT  NOT NULL,
      updated_at      BIGINT  NOT NULL
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
    ALTER TABLE medication_logs
      ADD COLUMN IF NOT EXISTS medication_uuid TEXT NOT NULL DEFAULT '';
    ALTER TABLE push_subscriptions
      ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
  `)
  console.log('DB schema ready')
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
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

export const mapTask = r => ({
  uuid: r.uuid, title: r.title, description: r.description,
  priority: r.priority, status: r.status, dueDate: r.due_date,
  tags: r.tags,
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

export const mapMed = r => ({
  uuid: r.uuid, name: r.name, dosage: r.dosage,
  scheduledTime: r.scheduled_time, isActive: r.is_active,
  createdAt: n(r.created_at), updatedAt: n(r.updated_at),
})

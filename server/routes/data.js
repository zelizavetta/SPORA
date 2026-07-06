import { Router } from 'express'
import {
  pool,
  mapMood, mapNote, mapTask, mapWorkout,
  mapGoal, mapWeight, mapMedLog, mapMed,
} from '../db.js'

const router = Router()

// ─── Full sync pull ──────────────────────────────────────────────────────────
router.get('/sync', async (_req, res) => {
  try {
    const [moods, notes, tasks, workouts, goals, weights, medLogs, meds] = await Promise.all([
      pool.query('SELECT * FROM moods ORDER BY created_at DESC'),
      pool.query('SELECT * FROM notes ORDER BY created_at DESC'),
      pool.query('SELECT * FROM tasks ORDER BY created_at DESC'),
      pool.query('SELECT * FROM workouts ORDER BY created_at DESC'),
      pool.query('SELECT * FROM goals ORDER BY created_at DESC'),
      pool.query('SELECT * FROM weights ORDER BY created_at DESC'),
      pool.query('SELECT * FROM medication_logs ORDER BY created_at DESC'),
      pool.query('SELECT * FROM medications ORDER BY name ASC'),
    ])
    res.json({
      moods:          moods.rows.map(mapMood),
      notes:          notes.rows.map(mapNote),
      tasks:          tasks.rows.map(mapTask),
      workouts:       workouts.rows.map(mapWorkout),
      goals:          goals.rows.map(mapGoal),
      weights:        weights.rows.map(mapWeight),
      medicationLogs: medLogs.rows.map(mapMedLog),
      medications:    meds.rows.map(mapMed),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Moods ──────────────────────────────────────────────────────────────────
router.post('/moods', async (req, res) => {
  const { uuid, score, emotions, note, date, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO moods (uuid, score, emotions, note, date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (uuid) DO UPDATE SET
         score=EXCLUDED.score, emotions=EXCLUDED.emotions,
         note=EXCLUDED.note, date=EXCLUDED.date, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, score, JSON.stringify(emotions ?? []), note ?? '', date, createdAt, updatedAt]
    )
    res.json(mapMood(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/moods/:uuid', async (req, res) => {
  await pool.query('DELETE FROM moods WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Notes ──────────────────────────────────────────────────────────────────
router.post('/notes', async (req, res) => {
  const { uuid, title, body, color, tags, isPinned, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO notes (uuid, title, body, color, tags, is_pinned, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (uuid) DO UPDATE SET
         title=EXCLUDED.title, body=EXCLUDED.body, color=EXCLUDED.color,
         tags=EXCLUDED.tags, is_pinned=EXCLUDED.is_pinned, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, title, body ?? '', color ?? 'lavender', JSON.stringify(tags ?? []), isPinned ?? false, createdAt, updatedAt]
    )
    res.json(mapNote(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/notes/:uuid', async (req, res) => {
  const { title, body, color, tags, isPinned, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE notes SET title=$1,body=$2,color=$3,tags=$4,is_pinned=$5,updated_at=$6 WHERE uuid=$7 RETURNING *`,
      [title, body ?? '', color, JSON.stringify(tags ?? []), isPinned ?? false, updatedAt, req.params.uuid]
    )
    res.json(mapNote(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/notes/:uuid', async (req, res) => {
  await pool.query('DELETE FROM notes WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Tasks ──────────────────────────────────────────────────────────────────
router.post('/tasks', async (req, res) => {
  const { uuid, title, description, priority, status, dueDate, tags, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (uuid, title, description, priority, status, due_date, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (uuid) DO UPDATE SET
         title=EXCLUDED.title, description=EXCLUDED.description, priority=EXCLUDED.priority,
         status=EXCLUDED.status, due_date=EXCLUDED.due_date, tags=EXCLUDED.tags, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, title, description ?? '', priority ?? 'medium', status ?? 'todo', dueDate ?? null, JSON.stringify(tags ?? []), createdAt, updatedAt]
    )
    res.json(mapTask(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/tasks/:uuid', async (req, res) => {
  const { title, description, priority, status, dueDate, tags, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET title=$1,description=$2,priority=$3,status=$4,due_date=$5,tags=$6,updated_at=$7 WHERE uuid=$8 RETURNING *`,
      [title, description ?? '', priority, status, dueDate ?? null, JSON.stringify(tags ?? []), updatedAt, req.params.uuid]
    )
    res.json(mapTask(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/tasks/:uuid', async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Workouts ────────────────────────────────────────────────────────────────
router.post('/workouts', async (req, res) => {
  const { uuid, type, durationMin, note, date, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO workouts (uuid, type, duration_min, note, date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (uuid) DO UPDATE SET
         type=EXCLUDED.type, duration_min=EXCLUDED.duration_min,
         note=EXCLUDED.note, date=EXCLUDED.date, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, type, durationMin ?? 0, note ?? '', date, createdAt, updatedAt]
    )
    res.json(mapWorkout(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/workouts/:uuid', async (req, res) => {
  await pool.query('DELETE FROM workouts WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Goals ──────────────────────────────────────────────────────────────────
router.post('/goals', async (req, res) => {
  const { uuid, title, description, category, targetDate, progress, isCompleted, milestones, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO goals (uuid, title, description, category, target_date, progress, is_completed, milestones, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (uuid) DO UPDATE SET
         title=EXCLUDED.title, description=EXCLUDED.description, category=EXCLUDED.category,
         target_date=EXCLUDED.target_date, progress=EXCLUDED.progress, is_completed=EXCLUDED.is_completed,
         milestones=EXCLUDED.milestones, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, title, description ?? '', category ?? 'personal', targetDate ?? null, progress ?? 0, isCompleted ?? false, JSON.stringify(milestones ?? []), createdAt, updatedAt]
    )
    res.json(mapGoal(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/goals/:uuid', async (req, res) => {
  const { title, description, category, targetDate, progress, isCompleted, milestones, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE goals SET title=$1,description=$2,category=$3,target_date=$4,progress=$5,is_completed=$6,milestones=$7,updated_at=$8 WHERE uuid=$9 RETURNING *`,
      [title, description ?? '', category, targetDate ?? null, progress ?? 0, isCompleted ?? false, JSON.stringify(milestones ?? []), updatedAt, req.params.uuid]
    )
    res.json(mapGoal(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/goals/:uuid', async (req, res) => {
  await pool.query('DELETE FROM goals WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Weights ─────────────────────────────────────────────────────────────────
router.post('/weights', async (req, res) => {
  const { uuid, weightKg, date, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO weights (uuid, weight_kg, date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (uuid) DO UPDATE SET weight_kg=EXCLUDED.weight_kg, date=EXCLUDED.date, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, weightKg, date, createdAt, updatedAt]
    )
    res.json(mapWeight(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/weights/:uuid', async (req, res) => {
  await pool.query('DELETE FROM weights WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Medication logs ──────────────────────────────────────────────────────────
router.post('/medication-logs', async (req, res) => {
  const { uuid, medicationUuid, name, dosage, takenAt, date, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO medication_logs (uuid, medication_uuid, name, dosage, taken_at, date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (uuid) DO UPDATE SET updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, medicationUuid ?? '', name, dosage ?? '', takenAt, date, createdAt, updatedAt]
    )
    res.json(mapMedLog(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Medications ──────────────────────────────────────────────────────────────
router.post('/medications', async (req, res) => {
  const { uuid, name, dosage, scheduledTimes, daysOfWeek, isActive, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO medications (uuid, name, dosage, scheduled_times, days_of_week, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (uuid) DO UPDATE SET
         name=EXCLUDED.name, dosage=EXCLUDED.dosage,
         scheduled_times=EXCLUDED.scheduled_times, days_of_week=EXCLUDED.days_of_week,
         is_active=EXCLUDED.is_active, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, name, dosage ?? '', JSON.stringify(scheduledTimes ?? ['09:00']), JSON.stringify(daysOfWeek ?? []), isActive !== false, createdAt, updatedAt]
    )
    res.json(mapMed(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/medications/:uuid', async (req, res) => {
  await pool.query('DELETE FROM medications WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

export default router

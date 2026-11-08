import { Router } from 'express'
import {
  pool, ensureDb,
  mapMood, mapNote, mapTask, mapWorkout,
  mapGoal, mapWeight, mapMedLog, mapMed,
  mapRecipe, mapFridgeItem, mapMealPlan,
} from '../db.js'

const router = Router()

// Схема могла не создаться на старте (БД была недоступна) — гарантируем её
// перед любой работой с данными. Повторный вызов бесплатный.
router.use(async (_req, res, next) => {
  try {
    await ensureDb()
    next()
  } catch (e) {
    res.status(503).json({ error: `DB unavailable: ${e.message}` })
  }
})

// ─── Full sync pull ──────────────────────────────────────────────────────────
/**
 * Таблицы тянем по отдельности: если одна сломана или ещё не создана,
 * клиент всё равно получает остальные, а не пустой ответ с 500.
 */
async function pullTable(sql, mapper) {
  try {
    const { rows } = await pool.query(sql)
    return rows.map(mapper)
  } catch (e) {
    console.warn(`sync: ${sql} — ${e.message}`)
    return []
  }
}

router.get('/sync', async (_req, res) => {
  const [moods, notes, tasks, workouts, goals, weights, medLogs, meds, recipes, fridge, mealPlan] = await Promise.all([
    pullTable('SELECT * FROM moods ORDER BY created_at DESC', mapMood),
    pullTable('SELECT * FROM notes ORDER BY created_at DESC', mapNote),
    pullTable('SELECT * FROM tasks ORDER BY created_at DESC', mapTask),
    pullTable('SELECT * FROM workouts ORDER BY created_at DESC', mapWorkout),
    pullTable('SELECT * FROM goals ORDER BY created_at DESC', mapGoal),
    pullTable('SELECT * FROM weights ORDER BY created_at DESC', mapWeight),
    pullTable('SELECT * FROM medication_logs ORDER BY created_at DESC', mapMedLog),
    pullTable('SELECT * FROM medications ORDER BY name ASC', mapMed),
    pullTable('SELECT * FROM recipes ORDER BY created_at DESC', mapRecipe),
    pullTable('SELECT * FROM fridge ORDER BY name ASC', mapFridgeItem),
    pullTable('SELECT * FROM meal_plan ORDER BY date ASC', mapMealPlan),
  ])

  res.json({
    moods, notes, tasks, workouts, goals, weights,
    medicationLogs: medLogs,
    medications: meds,
    recipes, fridge, mealPlan,
  })
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
  const { uuid, title, body, color, tags, isPinned, linkedNoteUuids, linkedTaskUuids, location, cluster, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO notes (uuid, title, body, color, tags, is_pinned, linked_note_uuids, linked_task_uuids, location, cluster, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (uuid) DO UPDATE SET
         title=EXCLUDED.title, body=EXCLUDED.body, color=EXCLUDED.color,
         tags=EXCLUDED.tags, is_pinned=EXCLUDED.is_pinned,
         linked_note_uuids=EXCLUDED.linked_note_uuids,
         linked_task_uuids=EXCLUDED.linked_task_uuids,
         location=EXCLUDED.location,
         cluster=EXCLUDED.cluster,
         updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, title, body ?? '', color ?? 'lavender', JSON.stringify(tags ?? []), isPinned ?? false, JSON.stringify(linkedNoteUuids ?? []), JSON.stringify(linkedTaskUuids ?? []), location ? JSON.stringify(location) : null, cluster ?? null, createdAt, updatedAt]
    )
    res.json(mapNote(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/notes/:uuid', async (req, res) => {
  const { title, body, color, tags, isPinned, linkedNoteUuids, linkedTaskUuids, location, cluster, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE notes SET title=$1,body=$2,color=$3,tags=$4,is_pinned=$5,linked_note_uuids=$6,linked_task_uuids=$7,location=$8,cluster=$9,updated_at=$10 WHERE uuid=$11 RETURNING *`,
      [title, body ?? '', color, JSON.stringify(tags ?? []), isPinned ?? false, JSON.stringify(linkedNoteUuids ?? []), JSON.stringify(linkedTaskUuids ?? []), location ? JSON.stringify(location) : null, cluster ?? null, updatedAt, req.params.uuid]
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
  const { uuid, title, description, priority, status, dueDate, tags, dependsOnUuids, linkedNoteUuids, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (uuid, title, description, priority, status, due_date, tags, depends_on_uuids, linked_note_uuids, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (uuid) DO UPDATE SET
         title=EXCLUDED.title, description=EXCLUDED.description, priority=EXCLUDED.priority,
         status=EXCLUDED.status, due_date=EXCLUDED.due_date, tags=EXCLUDED.tags,
         depends_on_uuids=EXCLUDED.depends_on_uuids,
         linked_note_uuids=EXCLUDED.linked_note_uuids,
         updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, title, description ?? '', priority ?? 'medium', status ?? 'todo', dueDate ?? null, JSON.stringify(tags ?? []), JSON.stringify(dependsOnUuids ?? []), JSON.stringify(linkedNoteUuids ?? []), createdAt, updatedAt]
    )
    res.json(mapTask(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/tasks/:uuid', async (req, res) => {
  const { title, description, priority, status, dueDate, tags, dependsOnUuids, linkedNoteUuids, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET title=$1,description=$2,priority=$3,status=$4,due_date=$5,tags=$6,depends_on_uuids=$7,linked_note_uuids=$8,updated_at=$9 WHERE uuid=$10 RETURNING *`,
      [title, description ?? '', priority, status, dueDate ?? null, JSON.stringify(tags ?? []), JSON.stringify(dependsOnUuids ?? []), JSON.stringify(linkedNoteUuids ?? []), updatedAt, req.params.uuid]
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

// ─── Recipes ─────────────────────────────────────────────────────────────────
router.post('/recipes', async (req, res) => {
  const { uuid, title, description, type, ingredients, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO recipes (uuid, title, description, type, ingredients, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (uuid) DO UPDATE SET
         title=EXCLUDED.title, description=EXCLUDED.description, type=EXCLUDED.type,
         ingredients=EXCLUDED.ingredients, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, title, description ?? '', type ?? 'other', JSON.stringify(ingredients ?? []), createdAt, updatedAt]
    )
    res.json(mapRecipe(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/recipes/:uuid', async (req, res) => {
  const { title, description, type, ingredients, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE recipes SET title=COALESCE($1,title), description=COALESCE($2,description),
         type=COALESCE($3,type), ingredients=COALESCE($4,ingredients), updated_at=$5
       WHERE uuid=$6 RETURNING *`,
      [title ?? null, description ?? null, type ?? null,
       ingredients ? JSON.stringify(ingredients) : null, updatedAt, req.params.uuid]
    )
    res.json(mapRecipe(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/recipes/:uuid', async (req, res) => {
  await pool.query('DELETE FROM recipes WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Fridge ──────────────────────────────────────────────────────────────────
router.post('/fridge', async (req, res) => {
  const { uuid, name, category, quantity, unit, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO fridge (uuid, name, category, quantity, unit, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (uuid) DO UPDATE SET
         name=EXCLUDED.name, category=EXCLUDED.category,
         quantity=EXCLUDED.quantity, unit=EXCLUDED.unit, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, name, category ?? 'other', quantity ?? 0, unit ?? 'шт', createdAt, updatedAt]
    )
    res.json(mapFridgeItem(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/fridge/:uuid', async (req, res) => {
  const { name, category, quantity, unit, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE fridge SET name=COALESCE($1,name), category=COALESCE($2,category),
         quantity=COALESCE($3,quantity), unit=COALESCE($4,unit), updated_at=$5
       WHERE uuid=$6 RETURNING *`,
      [name ?? null, category ?? null, quantity ?? null, unit ?? null, updatedAt, req.params.uuid]
    )
    res.json(mapFridgeItem(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/fridge/:uuid', async (req, res) => {
  await pool.query('DELETE FROM fridge WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

// ─── Meal plan ───────────────────────────────────────────────────────────────
router.post('/meal-plan', async (req, res) => {
  const { uuid, date, recipeUuid, createdAt, updatedAt } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO meal_plan (uuid, date, recipe_uuid, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (uuid) DO UPDATE SET
         date=EXCLUDED.date, recipe_uuid=EXCLUDED.recipe_uuid, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [uuid, date, recipeUuid, createdAt, updatedAt]
    )
    res.json(mapMealPlan(rows[0]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/meal-plan/:uuid', async (req, res) => {
  await pool.query('DELETE FROM meal_plan WHERE uuid=$1', [req.params.uuid])
  res.json({ ok: true })
})

export default router

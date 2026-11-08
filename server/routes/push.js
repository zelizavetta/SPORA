import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// Сохранить push-подписку
router.post('/push/subscribe', async (req, res) => {
  const { timezone, ...sub } = req.body
  if (!sub?.endpoint) return res.status(400).json({ error: 'Invalid subscription' })

  const tz = timezone || 'UTC'
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, subscription, timezone)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE
         SET subscription = EXCLUDED.subscription, timezone = EXCLUDED.timezone`,
      [sub.endpoint, sub, tz],
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Удалить push-подписку
router.delete('/push/subscribe', async (req, res) => {
  const { endpoint } = req.body ?? {}
  if (endpoint) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint=$1', [endpoint])
  }
  res.json({ ok: true })
})

// Вернуть VAPID public key клиенту
router.get('/push/vapid-public-key', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY })
})

// Тестовая отправка — сразу шлёт push всем подписчикам
router.post('/push/test', async (req, res) => {
  const { sendPushToAll } = await import('../push.js')
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM push_subscriptions')
    const count = Number(rows[0].count)
    if (count === 0) return res.status(400).json({ error: 'Нет подписчиков. Сначала включи уведомления в приложении.' })

    await sendPushToAll({
      title: 'SPORA тест 💊',
      body: 'Push-уведомления работают!',
      tag: 'spora-test',
    })
    res.json({ ok: true, subscribers: count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router

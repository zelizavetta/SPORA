import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// Сохранить push-подписку
router.post('/push/subscribe', async (req, res) => {
  const subscription = req.body
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' })

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, subscription)
       VALUES ($1, $2)
       ON CONFLICT (endpoint) DO UPDATE SET subscription = EXCLUDED.subscription`,
      [subscription.endpoint, subscription],
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

export default router

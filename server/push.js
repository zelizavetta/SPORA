import webpush from 'web-push'
import { pool } from './db.js'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? 'admin@spora.app'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

async function sendToRows(rows, payload) {
  for (const row of rows) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(payload))
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [row.id])
      }
    }
  }
}

export async function sendPushToAll(payload) {
  const { rows } = await pool.query('SELECT id, subscription FROM push_subscriptions')
  await sendToRows(rows, payload)
}

export async function sendPushToSubscribers(rows, payload) {
  await sendToRows(rows, payload)
}

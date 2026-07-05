import { pool } from './db.js'
import { sendPushToSubscribers } from './push.js'

function hhmmInTz(tz) {
  try {
    return new Intl.DateTimeFormat('en', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    }).format(new Date()).slice(0, 5)
  } catch {
    return new Intl.DateTimeFormat('en', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
    }).format(new Date()).slice(0, 5)
  }
}

const sent = new Set()
let lastCleanMinute = ''

export function startScheduler() {
  setInterval(async () => {
    const utcMinute = new Date().toISOString().slice(11, 16)
    if (utcMinute !== lastCleanMinute) {
      sent.clear()
      lastCleanMinute = utcMinute
    }

    try {
      // Получаем все уникальные timezone из активных подписок
      const { rows: tzRows } = await pool.query(
        'SELECT DISTINCT timezone FROM push_subscriptions',
      )
      if (tzRows.length === 0) return

      for (const { timezone } of tzRows) {
        const hhmm = hhmmInTz(timezone)
        const dedupKey = `${timezone}:${hhmm}`
        if (sent.has(dedupKey)) continue

        const { rows: meds } = await pool.query(
          'SELECT * FROM medications WHERE is_active = true AND scheduled_time = $1',
          [hhmm],
        )
        if (meds.length === 0) continue

        sent.add(dedupKey)
        console.log(`[scheduler] ${hhmm} (${timezone}) — ${meds.length} медикамент(ов)`)

        // Получаем подписки только с этим timezone
        const { rows: subs } = await pool.query(
          'SELECT id, subscription FROM push_subscriptions WHERE timezone = $1',
          [timezone],
        )

        for (const med of meds) {
          console.log(`[scheduler] push → ${med.name}`)
          await sendPushToSubscribers(subs, {
            title: `Время принять ${med.name}`,
            body: med.dosage ? `Дозировка: ${med.dosage}` : 'SPORA напоминает о таблетке 💊',
            tag: `med-${med.uuid}`,
          })
        }
      }
    } catch (e) {
      console.error('[scheduler] ошибка:', e.message)
    }
  }, 30_000)

  console.log('Medication scheduler started (device timezone mode)')
}

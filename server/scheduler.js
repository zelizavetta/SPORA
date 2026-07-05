import { pool } from './db.js'
import { sendPushToAll } from './push.js'

export function startScheduler() {
  // Проверяем каждую минуту, совпадает ли scheduled_time с текущим HH:MM
  setInterval(async () => {
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    try {
      const { rows } = await pool.query(
        'SELECT * FROM medications WHERE is_active = true AND scheduled_time = $1',
        [hhmm],
      )
      for (const med of rows) {
        await sendPushToAll({
          title: `Время принять ${med.name}`,
          body: med.dosage ? `Дозировка: ${med.dosage}` : 'SPORA напоминает о таблетке 💊',
          tag: `med-${med.uuid}`,
        })
      }
    } catch (e) {
      console.error('[scheduler]', e.message)
    }
  }, 60_000)

  console.log('Medication scheduler started')
}

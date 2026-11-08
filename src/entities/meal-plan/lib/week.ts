export const DAY_NAMES = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Понедельник недели, в которую попадает переданная дата. */
export function weekStart(d: Date): Date {
  const monday = new Date(d)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

/** Семь дат недели начиная с понедельника. */
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** «12 – 18 августа» / «29 сент. – 5 окт.» */
export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const sameMonth = monday.getMonth() === sunday.getMonth()
  const dayFmt   = new Intl.DateTimeFormat('ru-RU', { day: 'numeric' })
  const fullFmt  = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
  const shortFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
  return sameMonth
    ? `${dayFmt.format(monday)} – ${fullFmt.format(sunday)}`
    : `${shortFmt.format(monday)} – ${shortFmt.format(sunday)}`
}

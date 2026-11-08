import { useState, useMemo } from 'react'
import { useTaskStore } from '@entities/task'
import { Button, Card, Input, Modal, Textarea } from '@shared/ui'
import type { Task, TaskPriority, TaskStatus } from '@shared/types'
import styles from './PlanningPage.module.css'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'var(--color-success)', medium: 'var(--color-warning)', high: 'var(--color-danger)',
}
const PRIORITY_RU: Record<TaskPriority, string> = { low: 'низкий', medium: 'средний', high: 'высокий' }
const STATUS_RU: Record<TaskStatus, string> = { todo: 'К выполнению', in_progress: 'В процессе', done: 'Готово' }

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

// Monday-first day index (0=Mon … 6=Sun)
function mondayFirst(d: Date) { return (d.getDay() + 6) % 7 }

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ── Calendar view ────────────────────────────────────────────────────────────
function CalendarView({ tasks, onAddWithDate }: { tasks: Task[]; onAddWithDate: (date: string) => void }) {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(toYMD(today))

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (t.dueDate) {
        const list = map.get(t.dueDate) ?? []
        list.push(t)
        map.set(t.dueDate, list)
      }
    }
    return map
  }, [tasks])

  // Build calendar grid cells
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const last  = new Date(cursor.year, cursor.month + 1, 0)
    const startPad = mondayFirst(first)           // empty cells before 1st
    const endPad   = (7 - ((startPad + last.getDate()) % 7)) % 7

    const result: Array<{ date: string; day: number; cur: boolean }> = []

    // prev month tail
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(cursor.year, cursor.month, -i)
      result.push({ date: toYMD(d), day: d.getDate(), cur: false })
    }
    // current month
    for (let d = 1; d <= last.getDate(); d++) {
      result.push({ date: `${cursor.year}-${String(cursor.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, cur: true })
    }
    // next month head
    for (let d = 1; d <= endPad; d++) {
      const dt = new Date(cursor.year, cursor.month + 1, d)
      result.push({ date: toYMD(dt), day: d, cur: false })
    }
    return result
  }, [cursor])

  const todayStr = toYMD(today)
  const selectedTasks = selected ? (byDate.get(selected) ?? []) : []

  const prevMonth = () => setCursor(c => c.month === 0 ? { year: c.year-1, month: 11 } : { ...c, month: c.month-1 })
  const nextMonth = () => setCursor(c => c.month === 11 ? { year: c.year+1, month: 0 } : { ...c, month: c.month+1 })

  return (
    <div>
      {/* Month navigation */}
      <div className={styles.calNav}>
        <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
        <span className={styles.calMonth}>{MONTHS_RU[cursor.month]} {cursor.year}</span>
        <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
      </div>

      {/* Day names */}
      <div className={styles.calGrid}>
        {DAY_NAMES.map(d => (
          <div key={d} className={styles.calDayName}>{d}</div>
        ))}

        {/* Day cells */}
        {cells.map(cell => {
          const dayTasks = byDate.get(cell.date) ?? []
          const isToday    = cell.date === todayStr
          const isSelected = cell.date === selected
          return (
            <div
              key={cell.date}
              className={[
                styles.calCell,
                !cell.cur   ? styles.calCellOther    : '',
                isToday     ? styles.calCellToday    : '',
                isSelected  ? styles.calCellSelected : '',
              ].join(' ')}
              onClick={() => setSelected(cell.date)}
            >
              <span className={styles.calDayNum}>{cell.day}</span>
              {dayTasks.length > 0 && (
                <div className={styles.calDots}>
                  {dayTasks.slice(0, 3).map(t => (
                    <span
                      key={t.id}
                      className={styles.calDot}
                      style={{ background: PRIORITY_COLOR[t.priority] }}
                    />
                  ))}
                  {dayTasks.length > 3 && <span className={styles.calDotMore}>+{dayTasks.length-3}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day tasks */}
      {selected && (
        <div className={styles.calDetail}>
          <div className={styles.calDetailHeader}>
            <span className={styles.calDetailDate}>
              {new Date(selected + 'T00:00:00').toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
            </span>
            <button className={styles.calAddBtn} onClick={() => onAddWithDate(selected)}>+ задача</button>
          </div>
          {selectedTasks.length === 0 ? (
            <p className={styles.calEmpty}>Нет задач на этот день</p>
          ) : (
            <div className="stack stack-sm">
              {selectedTasks.map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shared task card ─────────────────────────────────────────────────────────
function TaskCard({ task }: { task: Task }) {
  const { updateStatus, remove } = useTaskStore()

  const nextStatus = (s: TaskStatus): TaskStatus =>
    s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo'
  const prevStatus = (s: TaskStatus): TaskStatus | null =>
    s === 'in_progress' ? 'todo' : s === 'done' ? 'in_progress' : null

  return (
    <Card className={task.status === 'done' ? styles.done : ''}>
      <div className="row row-between row-gap-md">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row row-gap-sm" style={{ marginBottom: '0.25rem' }}>
            <span className={styles.priority} style={{ background: PRIORITY_COLOR[task.priority] }} />
            <span className={styles.taskTitle}>{task.title}</span>
          </div>
          {task.description && <p className={styles.taskDesc}>{task.description}</p>}
          <div className="row row-gap-sm" style={{ marginTop: '0.4rem' }}>
            <span className={styles.statusBadge}>{STATUS_RU[task.status]}</span>
            {task.dueDate && <span className={styles.due}>до {task.dueDate}</span>}
          </div>
        </div>
        <div className="stack stack-sm">
          <button className={styles.iconBtn} onClick={() => updateStatus(task.id!, nextStatus(task.status))} title="Вперёд">▶</button>
          <button className={styles.iconBtn} onClick={() => { const p = prevStatus(task.status); if (p) updateStatus(task.id!, p) }} title="Назад" disabled={task.status === 'todo'}>◀</button>
          <button className={styles.iconBtn} onClick={() => remove(task.id!)} title="Удалить">🗑</button>
        </div>
      </div>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function PlanningPage() {
  const { tasks, add } = useTaskStore()
  const [view, setView]             = useState<'list' | 'calendar'>('list')
  const [open, setOpen]             = useState(false)
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority]     = useState<TaskPriority>('medium')
  const [dueDate, setDueDate]       = useState('')
  const [filter, setFilter]         = useState<TaskStatus | 'all'>('all')
  const [saving, setSaving]         = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await add(title.trim(), description.trim(), priority, dueDate || null, [])
    setSaving(false)
    setOpen(false)
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate('')
  }

  const openWithDate = (date: string) => {
    setDueDate(date)
    setOpen(true)
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Планы</h1>
        <div className="row row-gap-sm">
          <div className={styles.viewToggle}>
            <button
              className={[styles.viewBtn, view === 'list' ? styles.viewBtnActive : ''].join(' ')}
              onClick={() => setView('list')}
              title="Список"
            >☰</button>
            <button
              className={[styles.viewBtn, view === 'calendar' ? styles.viewBtnActive : ''].join(' ')}
              onClick={() => setView('calendar')}
              title="Календарь"
            >▦</button>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>+ Задача</Button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          <div className={styles.filters}>
            {(['all', 'todo', 'in_progress', 'done'] as const).map(f => (
              <button
                key={f}
                className={[styles.filterBtn, filter === f ? styles.filterActive : ''].join(' ')}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Все' : STATUS_RU[f]}
              </button>
            ))}
          </div>

          <div className="stack stack-md">
            {filtered.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                Нет задач
              </p>
            )}
            {filtered.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </>
      ) : (
        <CalendarView tasks={tasks} onAddWithDate={openWithDate} />
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Новая задача">
        <div className="stack stack-md">
          <Input label="Задача" value={title} onChange={e => setTitle(e.target.value)} placeholder="Что нужно сделать?" />
          <Textarea label="Описание" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <div>
            <p className={styles.label}>Приоритет</p>
            <div className={styles.priorityRow}>
              {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  className={[styles.priorityBtn, priority === p ? styles.priorityBtnActive : ''].join(' ')}
                  style={priority === p ? { background: PRIORITY_COLOR[p], color: '#fff', borderColor: PRIORITY_COLOR[p] } : {}}
                  onClick={() => setPriority(p)}
                >
                  {PRIORITY_RU[p]}
                </button>
              ))}
            </div>
          </div>
          <Input label="Срок" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Сохраняю...' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

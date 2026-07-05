import { useState } from 'react'
import { useTaskStore } from '@entities/task'
import { Button, Card, Input, Modal, Textarea } from '@shared/ui'
import type { TaskPriority, TaskStatus } from '@shared/types'
import styles from './PlanningPage.module.css'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'var(--color-success)', medium: 'var(--color-warning)', high: 'var(--color-danger)',
}
const PRIORITY_RU: Record<TaskPriority, string> = { low: 'низкий', medium: 'средний', high: 'высокий' }
const STATUS_RU: Record<TaskStatus, string> = { todo: 'К выполнению', in_progress: 'В процессе', done: 'Готово' }

export function PlanningPage() {
  const { tasks, add, updateStatus, remove } = useTaskStore()
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

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const nextStatus = (s: TaskStatus): TaskStatus =>
    s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo'

  const prevStatus = (s: TaskStatus): TaskStatus | null =>
    s === 'in_progress' ? 'todo' : s === 'done' ? 'in_progress' : null

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Планы</h1>
        <Button size="sm" onClick={() => setOpen(true)}>+ Задача</Button>
      </div>

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
        {filtered.map(task => (
          <Card key={task.id} className={task.status === 'done' ? styles.done : ''}>
            <div className="row row-between row-gap-md">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row row-gap-sm" style={{ marginBottom: '0.25rem' }}>
                  <span
                    className={styles.priority}
                    style={{ background: PRIORITY_COLOR[task.priority] }}
                  />
                  <span className={styles.taskTitle}>{task.title}</span>
                </div>
                {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                <div className="row row-gap-sm" style={{ marginTop: '0.4rem' }}>
                  <span className={styles.statusBadge}>{STATUS_RU[task.status]}</span>
                  {task.dueDate && <span className={styles.due}>до {task.dueDate}</span>}
                </div>
              </div>
              <div className="stack stack-sm">
                <button
                  className={styles.iconBtn}
                  onClick={() => updateStatus(task.id!, nextStatus(task.status))}
                  title="Следующий статус"
                >▶</button>
                <button
                  className={styles.iconBtn}
                  onClick={() => { const p = prevStatus(task.status); if (p) updateStatus(task.id!, p) }}
                  title="Предыдущий статус"
                  disabled={task.status === 'todo'}
                >◀</button>
                <button className={styles.iconBtn} onClick={() => remove(task.id!)} title="Удалить">🗑</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

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

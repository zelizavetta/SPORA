import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTaskStore } from '@entities/task'
import { useNoteStore } from '@entities/note'
import { Button } from '@shared/ui'
import type { Task, TaskPriority, TaskStatus, Note } from '@shared/types'
import styles from './TaskDetailPage.module.css'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'var(--color-success)', medium: 'var(--color-warning)', high: 'var(--color-danger)',
}
const PRIORITY_RU: Record<TaskPriority, string> = { low: 'низкий', medium: 'средний', high: 'высокий' }
const STATUS_RU: Record<TaskStatus, string> = { todo: 'К выполнению', in_progress: 'В процессе', done: 'Готово' }
const STATUS_NEXT: Record<TaskStatus, TaskStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Linked note chip ──────────────────────────────────────────────────────────
const NOTE_COLOR: Record<string, string> = {
  lavender: '#c4b5fd', sage: '#86efac', peach: '#fdba74', sky: '#93c5fd', vanilla: '#fde68a',
}

function LinkedNoteCard({ note, onNavigate }: { note: Note; onNavigate: () => void }) {
  return (
    <button className={styles.linkedNote} onClick={onNavigate}>
      <span className={styles.linkedNoteDot} style={{ background: NOTE_COLOR[note.color] ?? '#c4b5fd' }} />
      <span className={styles.linkedNoteTitle}>{note.title}</span>
      {note.body && <span className={styles.linkedNoteBody}>{note.body}</span>}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TaskDetailPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate  = useNavigate()
  const { tasks, update, remove } = useTaskStore()
  const { notes }  = useNoteStore()

  const task = tasks.find(t => t.uuid === uuid)

  const [title, setTitle]     = useState(task?.title ?? '')
  const [desc, setDesc]       = useState(task?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [status, setStatus]   = useState<TaskStatus>(task?.status ?? 'todo')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [tags, setTags]       = useState(task?.tags.join(', ') ?? '')

  // Sync if task loads late
  useEffect(() => {
    if (task) {
      setTitle(task.title); setDesc(task.description)
      setPriority(task.priority); setStatus(task.status)
      setDueDate(task.dueDate ?? ''); setTags(task.tags.join(', '))
    }
  }, [task?.uuid]) // eslint-disable-line react-hooks/exhaustive-deps

  const dTitle = useDebounce(title, 600)
  const dDesc  = useDebounce(desc, 600)
  const dTags  = useDebounce(tags, 800)

  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (!task) return
    update(task.id!, {
      title: dTitle.trim() || task.title,
      description: dDesc.trim(),
      priority, status,
      dueDate: dueDate || null,
      tags: dTags.split(',').map(t => t.trim()).filter(Boolean),
    })
  }, [dTitle, dDesc, priority, status, dueDate, dTags]) // eslint-disable-line react-hooks/exhaustive-deps

  const depNotes  = (task?.linkedNoteUuids ?? []).map(u => notes.find(n => n.uuid === u)).filter(Boolean) as Note[]
  const depTasks  = (task?.dependsOnUuids  ?? []).map(u => tasks.find(t => t.uuid === u)).filter(Boolean) as Task[]
  const blocked   = depTasks.some(t => t.status !== 'done')

  if (!task) return (
    <div className={styles.notFound}>
      <p>Задача не найдена</p>
      <Button onClick={() => navigate('/notes')}>← Назад</Button>
    </div>
  )

  const dateStr = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className={styles.root}>
      {/* ── Back bar ── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/notes')}>
          ← Идеи & Задачи
        </button>
        <div className={styles.topActions}>
          <button
            className={[styles.statusChip, styles[`status_${status}`]].join(' ')}
            onClick={() => setStatus(STATUS_NEXT[status])}
            title="Переключить статус"
          >
            {STATUS_RU[status]}
          </button>
          <button
            className={styles.deleteBtn}
            onClick={async () => { if (confirm('Удалить задачу?')) { await remove(task.id!); navigate('/notes') } }}
          >
            🗑
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Left column ── */}
        <div className={styles.main}>
          {/* Meta row */}
          <div className={styles.metaRow}>
            {dateStr && <span className={styles.metaDate}>{dateStr}</span>}
            {task.dueDate && (
              <span className={[styles.metaDue, new Date(task.dueDate) < new Date() && status !== 'done' ? styles.metaDueOverdue : ''].join(' ')}>
                до {new Date(task.dueDate+'T00:00:00').toLocaleDateString('ru',{day:'numeric',month:'long'})}
              </span>
            )}
            {(task.tags ?? []).map(t => (
              <span key={t} className={styles.metaTag}>#{t}</span>
            ))}
          </div>

          {/* Title */}
          <textarea
            className={styles.titleInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Что нужно сделать?"
            rows={1}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
          />

          {/* Description */}
          <textarea
            className={styles.descInput}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Описание задачи..."
            rows={4}
          />

          {/* Priority + due */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>ПРИОРИТЕТ</p>
            <div className={styles.priorityRow}>
              {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  className={[styles.priorityBtn, priority === p ? styles.priorityActive : ''].join(' ')}
                  style={priority === p ? { background: PRIORITY_COLOR[p], borderColor: PRIORITY_COLOR[p], color: '#04241a' } : {}}
                  onClick={() => setPriority(p)}
                >
                  {PRIORITY_RU[p]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>СРОК</p>
            <input
              type="date"
              className={styles.dateInput}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>ТЕГИ</p>
            <input
              className={styles.tagsInput}
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="работа, учёба..."
            />
          </div>

          {/* Deps */}
          {depTasks.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>
                ЗАВИСИТ ОТ{blocked ? ' · ⚠ есть незавершённые' : ''}
              </p>
              <div className={styles.depList}>
                {depTasks.map(d => (
                  <button key={d.uuid} className={styles.depChip} onClick={() => navigate(`/tasks/${d.uuid}`)}>
                    <span className={styles.depDot} style={{ background: PRIORITY_COLOR[d.priority] }} />
                    <span className={styles.depTitle}>{d.title}</span>
                    <span className={styles.depStatus}>{STATUS_RU[d.status]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className={styles.sidebar}>
          {/* Status card */}
          <div className={styles.sideCard}>
            <p className={styles.sideCardLabel}>СТАТУС</p>
            <div className={styles.statusRow}>
              {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(s => (
                <button
                  key={s}
                  className={[styles.statusBtn, status === s ? styles.statusBtnActive : ''].join(' ')}
                  onClick={() => setStatus(s)}
                >
                  {STATUS_RU[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Linked notes */}
          {depNotes.length > 0 && (
            <div className={styles.sideCard}>
              <p className={styles.sideCardLabel}>СВЯЗАННЫЕ ИДЕИ · {depNotes.length}</p>
              <div className={styles.linkedNotes}>
                {depNotes.map(n => (
                  <LinkedNoteCard key={n.uuid} note={n} onNavigate={() => {}} />
                ))}
              </div>
            </div>
          )}

          {/* Creation info */}
          <div className={styles.sideCard + ' ' + styles.sideCardMuted}>
            <p className={styles.sideCardLabel}>СОЗДАНА</p>
            <p className={styles.sideInfo}>{dateStr}</p>
            <p className={styles.sideCardLabel} style={{ marginTop: '0.75rem' }}>ПРИОРИТЕТ</p>
            <p className={styles.sideInfo} style={{ color: PRIORITY_COLOR[priority] }}>
              ● {PRIORITY_RU[priority]}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

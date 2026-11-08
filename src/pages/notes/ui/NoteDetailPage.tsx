import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNoteStore } from '@entities/note'
import { useTaskStore } from '@entities/task'
import { Button } from '@shared/ui'
import type { Note, NoteColor, Task, TaskPriority } from '@shared/types'
import styles from './NoteDetailPage.module.css'

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

const NOTE_COLORS: NoteColor[] = ['lavender', 'sage', 'peach', 'sky', 'vanilla']
const COLOR_HEX: Record<NoteColor, string> = {
  lavender: '#c4b5fd', sage: '#86efac', peach: '#fdba74', sky: '#93c5fd', vanilla: '#fde68a',
}
const COLOR_EMOJI: Record<NoteColor, string> = {
  lavender: '💜', sage: '💚', peach: '🧡', sky: '💙', vanilla: '💛',
}
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'var(--color-success)', medium: 'var(--color-warning)', high: 'var(--color-danger)',
}

export function NoteDetailPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate  = useNavigate()
  const { notes, update, remove, togglePin } = useNoteStore()
  const { tasks } = useTaskStore()

  const note = notes.find(n => n.uuid === uuid)

  const [title,   setTitle]   = useState(note?.title ?? '')
  const [body,    setBody]    = useState(note?.body ?? '')
  const [color,   setColor]   = useState<NoteColor>(note?.color ?? 'lavender')
  const [tags,    setTags]    = useState(note?.tags.join(', ') ?? '')
  const [cluster, setCluster] = useState(note?.cluster ?? '')

  useEffect(() => {
    if (note) {
      setTitle(note.title); setBody(note.body); setColor(note.color)
      setTags(note.tags.join(', ')); setCluster(note.cluster ?? '')
    }
  }, [note?.uuid]) // eslint-disable-line

  const dTitle   = useDebounce(title,   600)
  const dBody    = useDebounce(body,    600)
  const dColor   = useDebounce(color,   300)
  const dTags    = useDebounce(tags,    800)
  const dCluster = useDebounce(cluster, 800)

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (!note) return
    update(note.id!, {
      title:   dTitle.trim() || note.title,
      body:    dBody.trim(),
      color:   dColor,
      tags:    dTags.split(',').map(t => t.trim()).filter(Boolean),
      cluster: dCluster.trim() || null,
    })
  }, [dTitle, dBody, dColor, dTags, dCluster]) // eslint-disable-line

  const linkedNotes = (note?.linkedNoteUuids ?? []).map(u => notes.find(n => n.uuid === u)).filter(Boolean) as Note[]
  const linkedTasks = (note?.linkedTaskUuids ?? []).map(u => tasks.find(t => t.uuid === u)).filter(Boolean) as Task[]

  if (!note) return (
    <div className={styles.notFound}>
      <p>Идея не найдена</p>
      <Button onClick={() => navigate('/notes')}>← Назад</Button>
    </div>
  )

  const dateStr = note.createdAt
    ? new Date(note.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const loc = note.location

  return (
    <div className={styles.root}>
      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/notes')}>← Идеи & Задачи</button>
        <div className={styles.topActions}>
          <div className={styles.colorPicker}>
            {NOTE_COLORS.map(c => (
              <button
                key={c}
                className={[styles.colorBtn, color === c ? styles.colorBtnActive : ''].join(' ')}
                style={{ background: COLOR_HEX[c] }}
                onClick={() => setColor(c)}
                title={COLOR_EMOJI[c]}
              />
            ))}
          </div>
          <button className={styles.iconBtn} onClick={() => togglePin(note.id!)} title={note.isPinned ? 'Открепить' : 'Закрепить'}>
            {note.isPinned ? '📌' : '📍'}
          </button>
          <button
            className={styles.iconBtn}
            onClick={async () => { if (confirm('Удалить идею?')) { await remove(note.id!); navigate('/notes') } }}
          >🗑</button>
        </div>
      </div>

      {/* color accent line */}
      <div className={styles.colorBar} style={{ background: COLOR_HEX[color] }} />

      <div className={styles.layout}>
        {/* ── Main column ── */}
        <div className={styles.main}>
          <div className={styles.metaRow}>
            {dateStr && <span className={styles.metaDate}>{dateStr}</span>}
            {note.cluster && <span className={styles.metaCluster}>◆ {note.cluster}</span>}
            {note.tags.map(t => <span key={t} className={styles.metaTag}>#{t}</span>)}
          </div>

          <textarea
            className={styles.titleInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Заголовок идеи..."
            rows={1}
            onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
          />

          <textarea
            className={styles.bodyInput}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Мысли, детали, всё что угодно..."
            rows={8}
          />

          <div className={styles.section}>
            <p className={styles.sectionLabel}>ТЕГИ</p>
            <input className={styles.fieldInput} value={tags} onChange={e => setTags(e.target.value)} placeholder="учёба, идеи..." />
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>КЛАСТЕР</p>
            <input className={styles.fieldInput} value={cluster} onChange={e => setCluster(e.target.value)} placeholder="Папка или тема..." />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          {/* Location */}
          {loc && (
            <div className={styles.sideCard}>
              <p className={styles.sideCardLabel}>МЕСТО СОЗДАНИЯ</p>
              <div className={styles.locationRow}>
                <span className={styles.locationPin}>📍</span>
                <div>
                  {loc.name && <p className={styles.locationName}>{loc.name}</p>}
                  <p className={styles.locationCoords}>{loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}</p>
                </div>
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lon}#map=15/${loc.lat}/${loc.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.locationLink}
              >
                Открыть на карте →
              </a>
            </div>
          )}

          {/* Linked tasks */}
          {linkedTasks.length > 0 && (
            <div className={styles.sideCard}>
              <p className={styles.sideCardLabel}>ЗАДАЧИ · {linkedTasks.length}</p>
              <div className={styles.linkedList}>
                {linkedTasks.map(t => (
                  <button key={t.uuid} className={styles.linkedItem} onClick={() => navigate(`/tasks/${t.uuid}`)}>
                    <span className={styles.linkedDot} style={{ background: PRIORITY_COLOR[t.priority] }} />
                    <span className={styles.linkedTitle}>{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linked notes */}
          {linkedNotes.length > 0 && (
            <div className={styles.sideCard}>
              <p className={styles.sideCardLabel}>СВЯЗАННЫЕ ИДЕИ · {linkedNotes.length}</p>
              <div className={styles.linkedList}>
                {linkedNotes.map(n => (
                  <button key={n.uuid} className={styles.linkedItem} onClick={() => navigate(`/notes/${n.uuid}`)}>
                    <span className={styles.linkedDot} style={{ background: COLOR_HEX[n.color] }} />
                    <span className={styles.linkedTitle}>{n.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className={[styles.sideCard, styles.sideCardMuted].join(' ')}>
            <p className={styles.sideCardLabel}>СОЗДАНА</p>
            <p className={styles.sideInfo}>{dateStr}</p>
            {note.isPinned && <p className={styles.sideInfo} style={{ marginTop: '0.4rem' }}>📌 Закреплена</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

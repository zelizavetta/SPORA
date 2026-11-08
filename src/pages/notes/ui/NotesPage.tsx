import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNoteStore } from '@entities/note'
import { useTaskStore } from '@entities/task'
import { Button, Card, Input, Modal, Textarea } from '@shared/ui'
import type { Note, NoteColor, NoteLocation, Task, TaskPriority, TaskStatus } from '@shared/types'
import { GraphView } from './GraphView'
import { MapView } from './MapView'
import styles from './NotesPage.module.css'

export type SortMode = 'updated' | 'created' | 'priority' | 'status'
const SORT_LABELS: Record<SortMode, string> = {
  updated: 'По изменению', created: 'По созданию',
  priority: 'По важности', status: 'По статусу',
}
const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 }
const STATUS_ORDER: Record<TaskStatus, number>     = { todo: 3, in_progress: 2, done: 1 }

const CLUSTER_PALETTE = ['#c4b5fd','#86efac','#fdba74','#93c5fd','#fde68a','#f9a8d4','#6ee7b7','#fca5a5']
function clusterColor(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + h * 31
  return CLUSTER_PALETTE[Math.abs(h) % CLUSTER_PALETTE.length]
}

// ── Geolocation helper ────────────────────────────────────────────────────────
async function getLocation(): Promise<NoteLocation | undefined> {
  if (!navigator.geolocation) return undefined
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords
        let name: string | undefined
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          const d = await r.json()
          name = d.address?.city ?? d.address?.town ?? d.address?.village ?? d.address?.suburb
        } catch { /* offline — coords only */ }
        resolve({ lat, lon, name })
      },
      () => resolve(undefined),
      { timeout: 5000, maximumAge: 60000 }
    )
  })
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS: { value: NoteColor; label: string }[] = [
  { value: 'lavender', label: '💜' }, { value: 'sage', label: '💚' },
  { value: 'peach',    label: '🧡' }, { value: 'sky',  label: '💙' },
  { value: 'vanilla',  label: '💛' },
]
const COLOR_VAR: Record<NoteColor, string> = {
  lavender: 'var(--color-lavender)', sage: 'var(--color-sage)',
  peach: 'var(--color-peach)',       sky:  'var(--color-sky)',
  vanilla: 'var(--color-vanilla)',
}
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'var(--color-success)', medium: 'var(--color-warning)', high: 'var(--color-danger)',
}
const PRIORITY_RU: Record<TaskPriority, string> = { low: 'низкий', medium: 'средний', high: 'высокий' }
const STATUS_RU: Record<TaskStatus, string> = { todo: 'К выполнению', in_progress: 'В процессе', done: 'Готово' }

const DAY_NAMES  = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const MONTHS_RU  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
function mondayFirst(d: Date) { return (d.getDay() + 6) % 7 }
function toYMD(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }



// ── Cluster view ──────────────────────────────────────────────────────────────
function ClusterView({ notes, onOpen }: { notes: Note[]; onOpen: (n: Note) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const n of notes) {
      const key = n.cluster?.trim() || ''
      const arr = map.get(key) ?? []; arr.push(n); map.set(key, arr)
    }
    const named: Array<{ name: string; items: Note[] }> = []
    for (const [key, items] of map) if (key) named.push({ name: key, items })
    named.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    const none = map.get('')
    if (none?.length) named.push({ name: '', items: none })
    return named
  }, [notes])

  if (groups.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
      Нет идей. Добавьте идею и укажите кластер.
    </p>
  }

  return (
    <div className={styles.clusterGrid}>
      {groups.map(({ name, items }) => {
        const color = name ? clusterColor(name) : 'var(--color-text-muted)'
        return (
          <div key={name || '__none__'} className={styles.clusterCard}>
            <div className={styles.clusterHeader}>
              <span className={styles.clusterIcon} style={{ color }}>◆</span>
              <span className={styles.clusterName}>{name || 'Без кластера'}</span>
              <span className={styles.clusterCount}>{items.length} шт</span>
            </div>
            <div className={styles.clusterItems}>
              {items.map(n => (
                <button key={n.uuid} className={styles.clusterItem} onClick={() => onOpen(n)}>
                  <span className={styles.clusterDot} style={{ background: COLOR_VAR[n.color] }} />
                  <span className={styles.clusterItemTitle}>{n.title}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Calendar item type ────────────────────────────────────────────────────────
type CalItem =
  | { kind: 'note'; data: Note; accent: string }
  | { kind: 'task'; data: Task; accent: string }

// ── Inline cell chip ──────────────────────────────────────────────────────────
function CellChip({ item }: { item: CalItem }) {
  return (
    <div className={styles.cellChip} style={{ borderLeftColor: item.accent }}>
      <span className={styles.cellChipDot} style={{ background: item.accent }} />
      <span className={styles.cellChipTitle}>
        {item.data.title}
      </span>
    </div>
  )
}

// ── Detail panel row card ─────────────────────────────────────────────────────
function CalDetailCard({ item, onClick }: { item: CalItem; onClick: () => void }) {
  if (item.kind === 'note') {
    const n = item.data
    return (
      <button className={styles.calCard} onClick={onClick} style={{ borderLeftColor: item.accent }}>
        <span className={styles.calCardIcon}>📝</span>
        <span className={styles.calCardTitle}>{n.title}</span>
        <span className={styles.calCardFade} style={{ background: `linear-gradient(to right, transparent, var(--color-surface))` }} />
      </button>
    )
  }
  const t = item.data
  const STATUS_DOT: Record<TaskStatus, string> = { todo: 'var(--color-text-muted)', in_progress: 'var(--color-warning)', done: 'var(--color-success)' }
  return (
    <button className={[styles.calCard, t.status === 'done' ? styles.calCardDone : ''].join(' ')} onClick={onClick} style={{ borderLeftColor: item.accent }}>
      <span className={styles.calCardIcon}>✅</span>
      <span className={styles.calCardTitle}>{t.title}</span>
      <span className={styles.calCardFade} style={{ background: `linear-gradient(to right, transparent, var(--color-surface))` }} />
      <span className={styles.calCardStatus} style={{ background: STATUS_DOT[t.status] }} />
    </button>
  )
}

// ── Calendar view ─────────────────────────────────────────────────────────────
function CalendarView({ notes, tasks, onAddWithDate, onOpenNote, onOpenTask }: {
  notes: Note[]
  tasks: Task[]
  onAddWithDate: (date: string) => void
  onOpenNote: (note: Note) => void
  onOpenTask: (task: Task) => void
}) {
  const today  = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(toYMD(today))

  const byDate = useMemo(() => {
    const map = new Map<string, CalItem[]>()
    const push = (date: string, item: CalItem) => {
      const l = map.get(date) ?? []; l.push(item); map.set(date, l)
    }
    for (const n of notes) {
      const date = new Date(n.createdAt).toISOString().slice(0, 10)
      push(date, { kind: 'note', data: n, accent: COLOR_VAR[n.color] })
    }
    for (const t of tasks) {
      if (t.dueDate) push(t.dueDate, { kind: 'task', data: t, accent: PRIORITY_COLOR[t.priority] })
    }
    return map
  }, [notes, tasks])

  const cells = useMemo(() => {
    const first    = new Date(cursor.year, cursor.month, 1)
    const last     = new Date(cursor.year, cursor.month + 1, 0)
    const startPad = mondayFirst(first)
    const endPad   = (7 - ((startPad + last.getDate()) % 7)) % 7
    const result: Array<{ date: string; day: number; cur: boolean }> = []
    for (let i = startPad - 1; i >= 0; i--) { const d = new Date(cursor.year, cursor.month, -i); result.push({ date: toYMD(d), day: d.getDate(), cur: false }) }
    for (let d = 1; d <= last.getDate(); d++) result.push({ date: `${cursor.year}-${String(cursor.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, cur: true })
    for (let d = 1; d <= endPad; d++) { const dt = new Date(cursor.year, cursor.month+1, d); result.push({ date: toYMD(dt), day: d, cur: false }) }
    return result
  }, [cursor])

  const todayStr    = toYMD(today)
  const selectedItems = selected ? (byDate.get(selected) ?? []) : []
  const prev = () => setCursor(c => c.month === 0 ? { year: c.year-1, month: 11 } : { ...c, month: c.month-1 })
  const next = () => setCursor(c => c.month === 11 ? { year: c.year+1, month: 0 } : { ...c, month: c.month+1 })

  return (
    <div>
      <div className={styles.calNav}>
        <button className={styles.calNavBtn} onClick={prev}>‹</button>
        <span className={styles.calMonth}>{MONTHS_RU[cursor.month]} {cursor.year}</span>
        <button className={styles.calNavBtn} onClick={next}>›</button>
      </div>
      <div className={styles.calGrid}>
        {DAY_NAMES.map(d => <div key={d} className={styles.calDayName}>{d}</div>)}
        {cells.map(cell => {
          const items = byDate.get(cell.date) ?? []
          return (
            <div key={cell.date}
              className={[styles.calCell, !cell.cur ? styles.calCellOther : '', cell.date === todayStr ? styles.calCellToday : '', cell.date === selected ? styles.calCellSelected : ''].join(' ')}
              onClick={() => setSelected(cell.date)}
            >
              <span className={styles.calDayNum}>{cell.day}</span>
              {items.length > 0 && (
                <div className={styles.cellChips}>
                  {items.slice(0, 2).map((item, i) => <CellChip key={i} item={item} />)}
                  {items.length > 2 && <span className={styles.cellChipMore}>+{items.length - 2}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {selected && (
        <div className={styles.calDetail}>
          <div className={styles.calDetailHeader}>
            <span className={styles.calDetailDate}>{new Date(selected+'T00:00:00').toLocaleDateString('ru',{day:'numeric',month:'long'})}</span>
            <button className={styles.calAddBtn} onClick={() => onAddWithDate(selected)}>+ задача</button>
          </div>
          {selectedItems.length === 0
            ? <p className={styles.calEmpty}>Нет записей на этот день</p>
            : (
              <div className={styles.calCards}>
                {selectedItems.map((item, i) => (
                  <CalDetailCard
                    key={i}
                    item={item}
                    onClick={() => item.kind === 'note' ? onOpenNote(item.data) : onOpenTask(item.data)}
                  />
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
type TypeFilter   = 'all' | 'note' | 'task'
type StatusFilter = TaskStatus | 'all'
type ViewMode     = 'list' | 'cluster' | 'calendar' | 'graph' | 'map'

export function NotesPage() {
  const { notes, add: addNote }   = useNoteStore()
  const { tasks, add: addTask }   = useTaskStore()

  const [view, setView]           = useState<ViewMode>('list')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState<SortMode>('updated')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [clusterFilter, setClusterFilter] = useState<string>('all')

  // Create note state
  const [noteOpen, setNoteOpen]   = useState(false)
  const [nTitle, setNTitle]       = useState('')
  const [nBody, setNBody]         = useState('')
  const [nColor, setNColor]       = useState<NoteColor>('lavender')
  const [nTags, setNTags]         = useState('')
  const [nCluster, setNCluster]   = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Create task state
  const [taskOpen, setTaskOpen]   = useState(false)
  const [tTitle, setTTitle]       = useState('')
  const [tDesc, setTDesc]         = useState('')
  const [tPriority, setTPriority] = useState<TaskPriority>('medium')
  const [tDueDate, setTDueDate]   = useState('')
  const [savingTask, setSavingTask] = useState(false)

  // (note cards navigate to /notes/:uuid)

  const navigate = useNavigate()

  const handleCreateNote = async () => {
    if (!nTitle.trim()) return
    setSavingNote(true)
    const location = await getLocation()
    await addNote(nTitle.trim(), nBody.trim(), nColor, nTags.split(',').map(t => t.trim()).filter(Boolean), location, nCluster.trim() || null)
    setSavingNote(false); setNoteOpen(false)
    setNTitle(''); setNBody(''); setNTags(''); setNColor('lavender'); setNCluster('')
  }

  const handleCreateTask = async () => {
    if (!tTitle.trim()) return
    setSavingTask(true)
    await addTask(tTitle.trim(), tDesc.trim(), tPriority, tDueDate || null, [])
    setSavingTask(false); setTaskOpen(false)
    setTTitle(''); setTDesc(''); setTPriority('medium'); setTDueDate('')
  }

  const openTaskWithDate = (date: string) => { setTDueDate(date); setTaskOpen(true) }

  const openFromGraph = (uuid: string, type: 'note' | 'task') => {
    if (type === 'note') navigate(`/notes/${uuid}`)
    else navigate(`/tasks/${uuid}`)
  }

  // Derived: all unique tags and clusters
  const allTags = useMemo(() => {
    const s = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => s.add(t)))
    tasks.forEach(t => t.tags.forEach(tag => s.add(tag)))
    return Array.from(s).sort()
  }, [notes, tasks])

  const allClusters = useMemo(() => {
    const s = new Set<string>()
    notes.forEach(n => { if (n.cluster) s.add(n.cluster) })
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [notes])

  // Sort helpers
  const sortNotes = (arr: Note[]): Note[] => [...arr].sort((a, b) => {
    if (sort === 'created')  return b.createdAt - a.createdAt
    if (sort === 'priority') return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.updatedAt - a.updatedAt
    if (sort === 'status')   return b.updatedAt - a.updatedAt
    return b.updatedAt - a.updatedAt
  })
  const sortTasks = (arr: Task[]): Task[] => [...arr].sort((a, b) => {
    if (sort === 'created')  return b.createdAt - a.createdAt
    if (sort === 'priority') return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
    if (sort === 'status')   return STATUS_ORDER[b.status] - STATUS_ORDER[a.status]
    return b.updatedAt - a.updatedAt
  })

  // Shared filtered sets — used by list, calendar, graph, cluster views
  const { filteredNotes, filteredTasks } = useMemo(() => {
    const q = search.toLowerCase()
    const fn = typeFilter !== 'task'
      ? sortNotes(notes.filter(n => {
          const matchQ = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q))
          const matchTags = activeTags.length === 0 || activeTags.every(tag => n.tags.includes(tag))
          const matchCluster = clusterFilter === 'all' || (n.cluster ?? '') === clusterFilter
          return matchQ && matchTags && matchCluster
        }))
      : []
    const ft = typeFilter !== 'note'
      ? sortTasks(tasks.filter(t => {
          const matchStatus = statusFilter === 'all' || t.status === statusFilter
          const matchQ = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q))
          const matchTags = activeTags.length === 0 || activeTags.every(tag => t.tags.includes(tag))
          return matchStatus && matchQ && matchTags
        }))
      : []
    return { filteredNotes: fn, filteredTasks: ft }
  }, [notes, tasks, typeFilter, statusFilter, search, sort, activeTags, clusterFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // List view: merged + sorted
  type Item = { kind: 'note'; data: Note; key: string; updatedAt: number } | { kind: 'task'; data: Task; key: string; updatedAt: number }

  const items: Item[] = useMemo(() => {
    const noteItems = filteredNotes.map(n => ({ kind: 'note' as const, data: n, key: `n-${n.id}`, updatedAt: n.updatedAt }))
    const taskItems = filteredTasks.map(t => ({ kind: 'task' as const, data: t, key: `t-${t.id}`, updatedAt: t.updatedAt }))
    return [...noteItems, ...taskItems].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [filteredNotes, filteredTasks])

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Идеи & Задачи</h1>
        <div className="row row-gap-sm">
          <div className={styles.viewToggle}>
            <button className={[styles.viewBtn, view === 'list'    ? styles.viewBtnActive : ''].join(' ')} onClick={() => setView('list')}     title="Список">☰</button>
            <button className={[styles.viewBtn, view === 'cluster' ? styles.viewBtnActive : ''].join(' ')} onClick={() => setView('cluster')}  title="Кластеры">⬡</button>
            <button className={[styles.viewBtn, view === 'calendar'? styles.viewBtnActive : ''].join(' ')} onClick={() => setView('calendar')} title="Календарь">▦</button>
            <button className={[styles.viewBtn, view === 'map'     ? styles.viewBtnActive : ''].join(' ')} onClick={() => setView('map')}      title="Карта">⊙</button>
            <button className={[styles.viewBtn, view === 'graph'   ? styles.viewBtnActive : ''].join(' ')} onClick={() => setView('graph')}    title="Граф">◈</button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setNoteOpen(true)}>+ Идея</Button>
          <Button size="sm" onClick={() => setTaskOpen(true)}>+ Задача</Button>
        </div>
      </div>

      {view !== 'graph' && <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />}

      {/* Filters — visible in all except graph */}
      {view !== 'graph' && (
        <div className={styles.filtersBlock}>
          {/* Row 1: type + status */}
          <div className={styles.filters}>
            {([['all','Всё'],['note','📝 Идеи'],['task','✅ Задачи']] as [TypeFilter,string][]).map(([v,l]) => (
              <button key={v} className={[styles.filterBtn, typeFilter === v ? styles.filterActive : ''].join(' ')} onClick={() => setTypeFilter(v)}>{l}</button>
            ))}
            {typeFilter !== 'note' && (
              <>
                <span className={styles.filterSep}>·</span>
                {(['all','todo','in_progress','done'] as StatusFilter[]).map(s => (
                  <button key={s} className={[styles.filterBtn, statusFilter === s ? styles.filterActive : ''].join(' ')} onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? 'Все статусы' : STATUS_RU[s]}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Row 2: cluster filter (only when notes visible and clusters exist) */}
          {typeFilter !== 'task' && allClusters.length > 0 && (
            <div className={styles.filters}>
              <span className={styles.filterLabel}>Кластер</span>
              <button className={[styles.filterBtn, clusterFilter === 'all' ? styles.filterActive : ''].join(' ')} onClick={() => setClusterFilter('all')}>Все</button>
              {allClusters.map(c => (
                <button key={c} className={[styles.filterBtn, clusterFilter === c ? styles.filterActive : ''].join(' ')} onClick={() => setClusterFilter(c)}>
                  <span style={{ color: clusterColor(c), marginRight: '0.3em', fontSize: '0.65em' }}>◆</span>{c}
                </button>
              ))}
            </div>
          )}

          {/* Row 3: tag chips */}
          {allTags.length > 0 && (
            <div className={styles.filters}>
              <span className={styles.filterLabel}>Теги</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={[styles.filterBtn, styles.tagChip, activeTags.includes(tag) ? styles.filterActive : ''].join(' ')}
                  onClick={() => setActiveTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])}
                >#{tag}</button>
              ))}
              {activeTags.length > 0 && (
                <button className={styles.filterClear} onClick={() => setActiveTags([])}>× сбросить</button>
              )}
            </div>
          )}

          {/* Row 4: sort */}
          <div className={styles.filters}>
            <span className={styles.filterLabel}>Сортировка</span>
            {(Object.keys(SORT_LABELS) as SortMode[]).map(s => (
              <button key={s} className={[styles.filterBtn, sort === s ? styles.filterActive : ''].join(' ')} onClick={() => setSort(s)}>
                {SORT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'graph' ? (
        <GraphView notes={notes} tasks={tasks} onOpen={openFromGraph} />
      ) : view === 'map' ? (
        <MapView notes={notes} />
      ) : view === 'cluster' ? (
        <ClusterView notes={filteredNotes} onOpen={n => navigate(`/notes/${n.uuid}`)} />
      ) : view === 'list' ? (
        <div className="stack stack-md">
          {items.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>Ничего не найдено</p>
          )}
          {items.map(item => {
            if (item.kind === 'note') {
              const n = item.data
              const linkedNotes = (n.linkedNoteUuids ?? []).map(u => notes.find(x => x.uuid === u)).filter(Boolean) as Note[]
              return (
                <Card key={item.key} style={{ background: COLOR_VAR[n.color] }} className={styles.noteCard} onClick={() => navigate(`/notes/${n.uuid}`)}>
                  <div className="row row-between row-gap-md" style={{ marginBottom: '0.4rem' }}>
                    <div className="row row-gap-sm">
                      <span className={styles.typeBadge}>📝</span>
                      <h3 className={styles.noteTitle}>{n.title}</h3>
                    </div>
                    <span className={styles.editHint}>✎</span>
                  </div>
                  {n.body && <p className={styles.noteBody}>{n.body}</p>}
                  {n.tags.length > 0 && <div className={styles.tagRow}>{n.tags.map(t => <span key={t} className={styles.tag}>#{t}</span>)}</div>}
                  {n.location && (
                    <span className={styles.locationBadge} title={`${n.location.lat.toFixed(4)}, ${n.location.lon.toFixed(4)}`}>
                      📍 {n.location.name ?? `${n.location.lat.toFixed(2)}, ${n.location.lon.toFixed(2)}`}
                    </span>
                  )}
                  {linkedNotes.length > 0 && (
                    <div className={styles.linkedPreview}>
                      {linkedNotes.map(ln => (
                        <span key={ln.uuid} className={styles.linkedPreviewChip}>
                          <span className={styles.linkedDot} style={{ background: COLOR_VAR[ln.color] }} />{ln.title}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              )
            }

            // Task card
            const t = item.data
            const depTasks = (t.dependsOnUuids ?? []).map(u => tasks.find(x => x.uuid === u)).filter(Boolean) as Task[]
            const blocked  = depTasks.some(d => d.status !== 'done')
            return (
              <Card key={item.key} className={[styles.taskCard, t.status === 'done' ? styles.done : '', blocked ? styles.blocked : ''].join(' ')} onClick={() => navigate(`/tasks/${t.uuid}`)}>
                <div className="row row-between row-gap-md">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row row-gap-sm" style={{ marginBottom: '0.25rem' }}>
                      <span className={styles.typeBadge}>✅</span>
                      <span className={styles.dot} style={{ background: PRIORITY_COLOR[t.priority] }} />
                      <span className={styles.taskTitle}>{t.title}</span>
                    </div>
                    {t.description && <p className={styles.taskDesc}>{t.description}</p>}
                    <div className="row row-gap-sm" style={{ marginTop: '0.4rem' }}>
                      <span className={styles.statusBadge}>{STATUS_RU[t.status]}</span>
                      {t.dueDate && <span className={styles.due}>до {t.dueDate}</span>}
                      {blocked && <span className={styles.blockedBadge}>⏳ ожидает зависимостей</span>}
                    </div>
                  </div>
                  <span className={styles.editHint}>✎</span>
                </div>
                {depTasks.length > 0 && (
                  <div className={styles.linkedPreview} style={{ marginTop: '0.5rem' }}>
                    {depTasks.map(d => (
                      <span key={d.uuid} className={styles.linkedPreviewChip} style={{ opacity: d.status === 'done' ? 0.5 : 1 }}>
                        <span className={styles.linkedDot} style={{ background: PRIORITY_COLOR[d.priority] }} />
                        {d.title}{d.status === 'done' ? ' ✓' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <CalendarView
          notes={filteredNotes}
          tasks={filteredTasks}
          onAddWithDate={openTaskWithDate}
          onOpenNote={n => navigate(`/notes/${n.uuid}`)}
          onOpenTask={t => navigate(`/tasks/${t.uuid}`)}
        />
      ) }

      {/* Create note modal */}
      <Modal isOpen={noteOpen} onClose={() => setNoteOpen(false)} title="Новая идея">
        <div className="stack stack-md">
          <div className={styles.colorPicker}>
            {COLORS.map(c => (
              <button key={c.value} className={[styles.colorBtn, nColor === c.value ? styles.colorBtnActive : ''].join(' ')}
                style={{ background: COLOR_VAR[c.value] }} onClick={() => setNColor(c.value)}>{c.label}</button>
            ))}
          </div>
          <Input label="Заголовок" value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="О чём идея?" />
          <Textarea label="Текст" value={nBody} onChange={e => setNBody(e.target.value)} rows={4} />
          <div className={styles.clusterInputWrap}>
            <input
              className={styles.clusterInput}
              list="cluster-list-new"
              value={nCluster}
              onChange={e => setNCluster(e.target.value)}
              placeholder="Кластер (папка)..."
            />
            <datalist id="cluster-list-new">
              {allClusters.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <Input label="Теги (через запятую)" value={nTags} onChange={e => setNTags(e.target.value)} placeholder="учёба, идеи" />
          <Button onClick={handleCreateNote} disabled={savingNote || !nTitle.trim()}>{savingNote ? 'Сохраняю...' : 'Сохранить'}</Button>
        </div>
      </Modal>

      {/* Create task modal */}
      <Modal isOpen={taskOpen} onClose={() => setTaskOpen(false)} title="Новая задача">
        <div className="stack stack-md">
          <Input label="Задача" value={tTitle} onChange={e => setTTitle(e.target.value)} placeholder="Что нужно сделать?" />
          <Textarea label="Описание" value={tDesc} onChange={e => setTDesc(e.target.value)} rows={2} />
          <div>
            <p className={styles.fieldLabel}>Приоритет</p>
            <div className={styles.priorityRow}>
              {(['low','medium','high'] as TaskPriority[]).map(p => (
                <button key={p}
                  className={[styles.priorityBtn, tPriority === p ? styles.priorityBtnActive : ''].join(' ')}
                  style={tPriority === p ? { background: PRIORITY_COLOR[p], color: '#04241a', borderColor: PRIORITY_COLOR[p] } : {}}
                  onClick={() => setTPriority(p)}>{PRIORITY_RU[p]}</button>
              ))}
            </div>
          </div>
          <Input label="Срок" type="date" value={tDueDate} onChange={e => setTDueDate(e.target.value)} />
          <Button onClick={handleCreateTask} disabled={savingTask || !tTitle.trim()}>{savingTask ? 'Сохраняю...' : 'Добавить'}</Button>
        </div>
      </Modal>

    </div>
  )
}

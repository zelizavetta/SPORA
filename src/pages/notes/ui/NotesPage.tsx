import { useState } from 'react'
import { useNoteStore } from '@entities/note'
import { Button, Card, Input, Modal, Textarea } from '@shared/ui'
import type { NoteColor } from '@shared/types'
import styles from './NotesPage.module.css'

const COLORS: { value: NoteColor; label: string }[] = [
  { value: 'lavender', label: '💜' },
  { value: 'sage',     label: '💚' },
  { value: 'peach',    label: '🧡' },
  { value: 'sky',      label: '💙' },
  { value: 'vanilla',  label: '💛' },
]

const COLOR_VAR: Record<NoteColor, string> = {
  lavender: 'var(--color-lavender)',
  sage:     'var(--color-sage)',
  peach:    'var(--color-peach)',
  sky:      'var(--color-sky)',
  vanilla:  'var(--color-vanilla)',
}

export function NotesPage() {
  const { notes, add, remove, togglePin } = useNoteStore()
  const [open, setOpen]     = useState(false)
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [color, setColor]   = useState<NoteColor>('lavender')
  const [tags, setTags]     = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await add(title.trim(), body.trim(), color, tags.split(',').map(t => t.trim()).filter(Boolean))
    setSaving(false)
    setOpen(false)
    setTitle(''); setBody(''); setTags(''); setColor('lavender')
  }

  const pinned = notes.filter(n => n.isPinned)
  const rest   = notes.filter(n => !n.isPinned)
  const filtered = (arr: typeof notes) =>
    arr.filter(n =>
      !search || n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.body.toLowerCase().includes(search.toLowerCase())
    )

  const renderNote = (note: typeof notes[0]) => (
    <Card key={note.id} style={{ background: COLOR_VAR[note.color] }} className={styles.noteCard}>
      <div className="row row-between row-gap-md" style={{ marginBottom: '0.4rem' }}>
        <h3 className={styles.noteTitle}>{note.title}</h3>
        <div className="row row-gap-sm">
          <button className={styles.iconBtn} onClick={() => togglePin(note.id!)} title="Закрепить">
            {note.isPinned ? '📌' : '📍'}
          </button>
          <button className={styles.iconBtn} onClick={() => remove(note.id!)} title="Удалить">🗑</button>
        </div>
      </div>
      {note.body && <p className={styles.noteBody}>{note.body}</p>}
      {note.tags.length > 0 && (
        <div className={styles.tagRow}>
          {note.tags.map(t => <span key={t} className={styles.tag}>#{t}</span>)}
        </div>
      )}
    </Card>
  )

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Заметки</h1>
        <Button size="sm" onClick={() => setOpen(true)}>+ Новая</Button>
      </div>

      <Input
        placeholder="Поиск заметок..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {pinned.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Закреплённые</p>
          <div className="stack stack-md">{filtered(pinned).map(renderNote)}</div>
          <p className={styles.sectionLabel} style={{ marginTop: '1rem' }}>Остальные</p>
        </>
      )}
      <div className="stack stack-md">
        {filtered(rest).length === 0 && filtered(pinned).length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
            Нет заметок. Создай первую!
          </p>
        )}
        {filtered(rest).map(renderNote)}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Новая заметка">
        <div className="stack stack-md">
          <div className={styles.colorPicker}>
            {COLORS.map(c => (
              <button
                key={c.value}
                className={[styles.colorBtn, color === c.value ? styles.colorBtnActive : ''].join(' ')}
                style={{ background: COLOR_VAR[c.value] }}
                onClick={() => setColor(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Input label="Заголовок" value={title} onChange={e => setTitle(e.target.value)} placeholder="О чём заметка?" />
          <Textarea label="Текст" value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="..." />
          <Input label="Теги (через запятую)" value={tags} onChange={e => setTags(e.target.value)} placeholder="учёба, идеи, личное" />
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

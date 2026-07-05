import { useState } from 'react'
import { useWorkoutStore } from '@entities/workout'
import { Button, Card, Input, Modal, Textarea } from '@shared/ui'
import type { WorkoutType } from '@shared/types'
import styles from './WorkoutPage.module.css'

const TYPES: { value: WorkoutType; label: string; emoji: string }[] = [
  { value: 'yoga',     label: 'Йога',       emoji: '🧘' },
  { value: 'stretch',  label: 'Растяжка',   emoji: '🤸' },
  { value: 'walk',     label: 'Прогулка',   emoji: '🚶' },
  { value: 'run',      label: 'Бег',        emoji: '🏃' },
  { value: 'strength', label: 'Силовая',    emoji: '💪' },
  { value: 'other',    label: 'Другое',     emoji: '✨' },
]

export function WorkoutPage() {
  const { sessions, add, remove } = useWorkoutStore()
  const [open, setOpen]         = useState(false)
  const [type, setType]         = useState<WorkoutType>('yoga')
  const [duration, setDuration] = useState('30')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await add(type, Number(duration) || 30, note)
    setSaving(false)
    setOpen(false)
    setNote(''); setDuration('30'); setType('yoga')
  }

  const totalMin = sessions.reduce((s, w) => s + w.durationMin, 0)

  const byDate = sessions.reduce<Record<string, typeof sessions>>((acc, w) => {
    const d = w.date
    ;(acc[d] ??= []).push(w)
    return acc
  }, {})

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Спорт</h1>
        <Button size="sm" onClick={() => setOpen(true)}>+ Занятие</Button>
      </div>

      {sessions.length > 0 && (
        <Card className={styles.statsCard}>
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{sessions.length}</span>
              <span className={styles.statLabel}>занятий</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{totalMin}</span>
              <span className={styles.statLabel}>минут</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{Math.round(totalMin / sessions.length)}</span>
              <span className={styles.statLabel}>мин/занятие</span>
            </div>
          </div>
        </Card>
      )}

      <div className="stack stack-md" style={{ marginTop: '1rem' }}>
        {Object.keys(byDate).length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
            Нет занятий. Начни с йоги или растяжки 🧘
          </p>
        )}
        {Object.entries(byDate).map(([date, items]) => (
          <div key={date}>
            <p className={styles.dateLabel}>{date}</p>
            <div className="stack stack-sm">
              {items.map(session => {
                const t = TYPES.find(x => x.value === session.type)!
                return (
                  <Card key={session.id}>
                    <div className="row row-between row-gap-md">
                      <div className="row row-gap-md">
                        <span className={styles.typeIcon}>{t.emoji}</span>
                        <div>
                          <p className={styles.typeName}>{t.label}</p>
                          <p className={styles.duration}>{session.durationMin} мин</p>
                          {session.note && <p className={styles.noteText}>{session.note}</p>}
                        </div>
                      </div>
                      <button className={styles.iconBtn} onClick={() => remove(session.id!)}>🗑</button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Новое занятие">
        <div className="stack stack-md">
          <div>
            <p className={styles.formLabel}>Тип</p>
            <div className={styles.typeGrid}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  className={[styles.typeBtn, type === t.value ? styles.typeBtnActive : ''].join(' ')}
                  onClick={() => setType(t.value)}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Длительность (мин)"
            type="number"
            min="1"
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
          <Textarea
            label="Заметка"
            placeholder="Как прошло? Что сделала?"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

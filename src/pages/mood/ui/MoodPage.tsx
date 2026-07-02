import { useState } from 'react'
import { useMoodStore } from '@entities/mood'
import { Button, Card, Modal, Textarea } from '@shared/ui'
import type { MoodScore, MoodEmotion } from '@shared/types'
import styles from './MoodPage.module.css'

const SCORES: { value: MoodScore; label: string; emoji: string }[] = [
  { value: 1, label: 'Тяжело',      emoji: '😞' },
  { value: 2, label: 'Грустно',     emoji: '😔' },
  { value: 3, label: 'Нейтрально',  emoji: '😐' },
  { value: 4, label: 'Хорошо',      emoji: '🙂' },
  { value: 5, label: 'Отлично',     emoji: '😊' },
]

const EMOTIONS: MoodEmotion[] = [
  'calm', 'happy', 'excited', 'grateful',
  'anxious', 'sad', 'tired', 'angry', 'confused',
]

const EMOTION_RU: Record<MoodEmotion, string> = {
  calm: 'спокойно', happy: 'радостно', excited: 'воодушевлённо',
  grateful: 'благодарно', anxious: 'тревожно', sad: 'грустно',
  tired: 'устала', angry: 'злюсь', confused: 'растерянно',
}

export function MoodPage() {
  const { entries, add } = useMoodStore()
  const [open, setOpen]           = useState(false)
  const [score, setScore]         = useState<MoodScore>(3)
  const [selected, setSelected]   = useState<MoodEmotion[]>([])
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)

  const toggle = (e: MoodEmotion) =>
    setSelected(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])

  const handleSave = async () => {
    setSaving(true)
    await add(score, selected, note)
    setSaving(false)
    setOpen(false)
    setNote('')
    setSelected([])
    setScore(3)
  }

  const last7 = entries.slice(0, 7)

  return (
    <div className="page animate-in">
      <div className="page-header">
        <h1>Настроение</h1>
        <Button size="sm" onClick={() => setOpen(true)}>+ Отметить</Button>
      </div>

      {/* График последних 7 */}
      {last7.length > 0 && (
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Последние {last7.length} записей</h3>
          <div className={styles.bars}>
            {[...last7].reverse().map((e) => (
              <div key={e.id} className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{ height: `${e.score * 20}%`, background: `var(--mood-${e.score})` }}
                />
                <span className={styles.barDate}>{e.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="stack stack-md" style={{ marginTop: '1rem' }}>
        {entries.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
            Ещё нет записей. Отметь своё настроение!
          </p>
        )}
        {entries.map(entry => (
          <Card key={entry.id}>
            <div className="row row-between row-gap-md">
              <div>
                <div className="row row-gap-sm" style={{ marginBottom: '0.35rem' }}>
                  <span className={styles.scoreCircle} style={{ background: `var(--mood-${entry.score})` }}>
                    {SCORES.find(s => s.value === entry.score)?.emoji}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {SCORES.find(s => s.value === entry.score)?.label}
                  </span>
                </div>
                {entry.emotions.length > 0 && (
                  <div className={styles.emotionTags}>
                    {entry.emotions.map(e => (
                      <span key={e} className={styles.emotionTag}>{EMOTION_RU[e]}</span>
                    ))}
                  </div>
                )}
                {entry.note && <p className={styles.entryNote}>{entry.note}</p>}
              </div>
              <span className={styles.entryDate}>{entry.date}</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Как ты сейчас?">
        <div className="stack stack-lg">
          <div className={styles.scoreRow}>
            {SCORES.map(s => (
              <button
                key={s.value}
                className={[styles.scoreBtn, score === s.value ? styles.scoreBtnActive : ''].join(' ')}
                style={score === s.value ? { background: `var(--mood-${s.value})`, color: '#fff' } : {}}
                onClick={() => setScore(s.value)}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className={styles.label}>Что чувствуешь?</p>
            <div className={styles.emotionGrid}>
              {EMOTIONS.map(e => (
                <button
                  key={e}
                  className={[styles.emotionBtn, selected.includes(e) ? styles.emotionBtnActive : ''].join(' ')}
                  onClick={() => toggle(e)}
                >
                  {EMOTION_RU[e]}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Заметка (необязательно)"
            placeholder="Что происходит..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

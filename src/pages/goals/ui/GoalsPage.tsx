import { useState } from 'react'
import { useGoalStore } from '@entities/goal'
import { Button, Card, Input, Modal, Textarea } from '@shared/ui'
import type { GoalCategory } from '@shared/types'
import styles from './GoalsPage.module.css'

const CATEGORIES: { value: GoalCategory; label: string; emoji: string }[] = [
  { value: 'health',   label: 'Здоровье',  emoji: '💚' },
  { value: 'study',    label: 'Учёба',     emoji: '📚' },
  { value: 'sport',    label: 'Спорт',     emoji: '🏃' },
  { value: 'language', label: 'Языки',     emoji: '🌍' },
  { value: 'personal', label: 'Личное',    emoji: '🌸' },
  { value: 'other',    label: 'Другое',    emoji: '✨' },
]

export function GoalsPage() {
  const { goals, add, complete, updateProgress, remove, addMilestone, toggleMilestone } = useGoalStore()
  const [open, setOpen]           = useState(false)
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState<GoalCategory>('personal')
  const [targetDate, setTarget]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [expanded, setExpanded]   = useState<number | null>(null)
  const [milestoneInput, setMSInput] = useState('')

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await add(title.trim(), description.trim(), category, targetDate || null)
    setSaving(false)
    setOpen(false)
    setTitle(''); setDesc(''); setCategory('personal'); setTarget('')
  }

  const handleAddMilestone = async (goalId: number) => {
    if (!milestoneInput.trim()) return
    await addMilestone(goalId, {
      id: crypto.randomUUID(),
      title: milestoneInput.trim(),
      isDone: false,
    })
    setMSInput('')
  }

  const active    = goals.filter(g => !g.isCompleted)
  const completed = goals.filter(g => g.isCompleted)

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Цели</h1>
        <Button size="sm" onClick={() => setOpen(true)}>+ Цель</Button>
      </div>

      <div className="stack stack-md">
        {active.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
            Нет активных целей. Поставь первую! 🎯
          </p>
        )}
        {active.map(goal => {
          const cat = CATEGORIES.find(c => c.value === goal.category)!
          const isOpen = expanded === goal.id
          return (
            <Card key={goal.id} className={styles.goalCard}>
              <div
                className={styles.goalHeader}
                onClick={() => setExpanded(isOpen ? null : goal.id!)}
              >
                <span className={styles.catEmoji}>{cat.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className={styles.goalTitle}>{goal.title}</p>
                  {goal.targetDate && <p className={styles.goalDate}>до {goal.targetDate}</p>}
                </div>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </div>

              <div className={styles.progressRow}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${goal.progress}%` }} />
                </div>
                <span className={styles.progressLabel}>{goal.progress}%</span>
              </div>

              {isOpen && (
                <div className={styles.expanded}>
                  {goal.description && <p className={styles.desc}>{goal.description}</p>}

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={goal.progress}
                    className={styles.slider}
                    onChange={e => updateProgress(goal.id!, Number(e.target.value))}
                  />

                  {goal.milestones.length > 0 && (
                    <ul className={styles.milestones}>
                      {goal.milestones.map(m => (
                        <li key={m.id} className={styles.milestone}>
                          <label className={styles.msLabel}>
                            <input
                              type="checkbox"
                              checked={m.isDone}
                              onChange={() => toggleMilestone(goal.id!, m.id)}
                            />
                            <span className={m.isDone ? styles.msDone : ''}>{m.title}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className={styles.msInput}>
                    <Input
                      placeholder="Добавить шаг..."
                      value={milestoneInput}
                      onChange={e => setMSInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddMilestone(goal.id!) }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleAddMilestone(goal.id!)}>+</Button>
                  </div>

                  <div className="row row-gap-sm" style={{ marginTop: '0.75rem' }}>
                    <Button size="sm" variant="ghost" onClick={() => complete(goal.id!)}>Выполнено ✓</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(goal.id!)}>Удалить</Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {completed.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Достигнуто 🎉</p>
            {completed.map(goal => (
              <Card key={goal.id} className={styles.completedCard}>
                <div className="row row-gap-md">
                  <span>✅</span>
                  <span className={styles.goalTitle}>{goal.title}</span>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Новая цель">
        <div className="stack stack-md">
          <Input label="Название цели" value={title} onChange={e => setTitle(e.target.value)} placeholder="Чего хочешь достичь?" />
          <Textarea label="Описание" value={description} onChange={e => setDesc(e.target.value)} rows={2} />
          <div>
            <p className={styles.formLabel}>Категория</p>
            <div className={styles.catGrid}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={[styles.catBtn, category === c.value ? styles.catBtnActive : ''].join(' ')}
                  onClick={() => setCategory(c.value)}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <Input label="Дата достижения" type="date" value={targetDate} onChange={e => setTarget(e.target.value)} />
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Сохраняю...' : 'Создать цель'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

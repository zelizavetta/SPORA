import { useState, useEffect } from 'react'
import { useHealthStore } from '@entities/health'
import { Button, Card, Input, Modal } from '@shared/ui'
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@shared/lib/pushSubscription'
import styles from './HealthPage.module.css'

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function formatSchedule(times: string[], days: number[]): string {
  const t = times.join(', ')
  if (days.length === 0 || days.length === 7) return t
  return `${t} · ${days.map(d => DAY_LABELS[d]).join(' ')}`
}

export function HealthPage() {
  const medications    = useHealthStore(s => s.medications)
  const weights        = useHealthStore(s => s.weights)
  const medicationLogs = useHealthStore(s => s.medicationLogs)
  const addWeight      = useHealthStore(s => s.addWeight)
  const logMedication  = useHealthStore(s => s.logMedication)
  const addMedication  = useHealthStore(s => s.addMedication)
  const removeMedication = useHealthStore(s => s.removeMedication)

  const [weightInput, setWeightInput] = useState('')
  const [medOpen, setMedOpen]         = useState(false)
  const [medName, setMedName]         = useState('')
  const [medDosage, setMedDosage]     = useState('')
  const [medTimes, setMedTimes]       = useState<string[]>(['09:00'])
  const [medDays, setMedDays]         = useState<number[]>([])
  const [saving, setSaving]           = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [testStatus] = useState<string | null>(null)

  const latest = weights[0]
  const todayMedLogs = medicationLogs.filter(l => l.date === new Date().toISOString().slice(0, 10))

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled)
  }, [])

  const handleTogglePush = async () => {
    setPushLoading(true)
    if (pushEnabled) {
      await unsubscribeFromPush()
      setPushEnabled(false)
    } else {
      const ok = await subscribeToPush()
      setPushEnabled(ok)
    }
    setPushLoading(false)
  }

  const handleAddWeight = async () => {
    const kg = parseFloat(weightInput.replace(',', '.'))
    if (isNaN(kg) || kg <= 0) return
    await addWeight(kg)
    setWeightInput('')
  }

  const handleAddMed = async () => {
    const validTimes = medTimes.filter(t => t.trim())
    if (!medName.trim() || validTimes.length === 0) return
    setSaving(true)
    await addMedication(medName.trim(), medDosage.trim(), validTimes, medDays)
    setSaving(false)
    setMedOpen(false)
    setMedName(''); setMedDosage(''); setMedTimes(['09:00']); setMedDays([])
  }

  const toggleDay = (day: number) => {
    setMedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const toggleAllDays = () => {
    setMedDays(prev => prev.length === 7 ? [] : [...ALL_DAYS])
  }

  const last7weights = weights.slice(0, 7)

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Здоровье</h1>
      </div>

      {/* Медикаменты */}
      <section>
        <div className={styles.sectionHeader}>
          <h2>💊 Таблетки сегодня</h2>
          <Button size="sm" variant="ghost" onClick={() => setMedOpen(true)}>+ Добавить</Button>
        </div>

        {/* Уведомления */}
        <Card className={styles.notifCard}>
          <div className="row row-between row-gap-md">
            <div>
              <p className={styles.notifTitle}>Фоновые напоминания</p>
              <p className={styles.notifSub}>
                {pushEnabled
                  ? 'уведомления приходят даже когда приложение закрыто'
                  : 'Включи, чтобы получать напоминания в фоне'}
              </p>
              {testStatus && <p className={styles.testStatus}>{testStatus}</p>}
            </div>
            <div className="stack stack-sm" style={{ alignItems: 'flex-end' }}>
              <Button
                size="sm"
                variant={pushEnabled ? 'ghost' : 'primary'}
                onClick={handleTogglePush}
                disabled={pushLoading}
              >
                {pushLoading ? '...' : pushEnabled ? 'Выключить' : 'Включить'}
              </Button>
              {/* {pushEnabled && (
                <Button size="sm" variant="ghost" onClick={handleTestPush}>
                  Тест
                </Button>
              )} */}
            </div>
          </div>
        </Card>

        {medications.filter(m => m.isActive).length === 0 ? (
          <Card>
            <p className={styles.empty}>Нет добавленных медикаментов</p>
            <Button size="sm" variant="ghost" onClick={() => setMedOpen(true)} style={{ marginTop: '0.5rem' }}>
              Добавить таблетку
            </Button>
          </Card>
        ) : (
          <div className="stack stack-sm">
            {medications.filter(m => m.isActive).map(med => {
              const taken = todayMedLogs.some(l => l.medicationUuid === med.uuid)
              const times = med.scheduledTimes ?? []
              const days  = med.daysOfWeek ?? []
              return (
                <Card key={med.id} className={taken ? styles.taken : styles.pending}>
                  <div className="row row-between row-gap-md">
                    <div>
                      <p className={styles.medName}>{med.name}</p>
                      <p className={styles.medInfo}>
                        {med.dosage && <>{med.dosage} · </>}
                        {formatSchedule(times, days)}
                      </p>
                    </div>
                    <div className="row row-gap-sm">
                      {taken ? (
                        <span className={styles.takenBadge}>✓ принято</span>
                      ) : (
                        <Button size="sm" onClick={() => logMedication(med.uuid, med.name, med.dosage)}>
                          Принять
                        </Button>
                      )}
                      <button className={styles.iconBtn} onClick={() => removeMedication(med.id!)}>✕</button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {todayMedLogs.length > 0 && (
          <p className={styles.logSummary}>
            Принято сегодня: {todayMedLogs.map(l =>
              `${l.name} в ${new Date(l.takenAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`
            ).join(', ')}
          </p>
        )}
      </section>

      {/* Вес */}
      <section style={{ marginTop: '1.5rem' }}>
        <h2 className={styles.sectionTitle}>⚖️ Вес</h2>

        {latest && (
          <Card className={styles.weightCard}>
            <p className={styles.weightValue}>{latest.weightKg} кг</p>
            <p className={styles.weightDate}>последняя запись: {latest.date}</p>
          </Card>
        )}

        {last7weights.length > 1 && (
          <Card className={styles.weightChart}>
            <p className={styles.chartLabel}>Динамика</p>
            <div className={styles.weightBars}>
              {[...last7weights].reverse().map(w => {
                const min = Math.min(...last7weights.map(x => x.weightKg))
                const max = Math.max(...last7weights.map(x => x.weightKg))
                const range = max - min || 1
                const pct = ((w.weightKg - min) / range) * 70 + 30
                return (
                  <div key={w.id} className={styles.weightBar}>
                    <div className={styles.wBar} style={{ height: `${pct}%` }} />
                    <span className={styles.wLabel}>{w.weightKg}</span>
                    <span className={styles.wDate}>{w.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <div className={styles.weightInput}>
          <Input
            placeholder="Вес в кг (например, 66.5)"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            type="number"
            step="0.1"
          />
          <Button onClick={handleAddWeight} disabled={!weightInput}>Записать</Button>
        </div>
      </section>

      {/* Добавление медикамента */}
      <Modal isOpen={medOpen} onClose={() => setMedOpen(false)} title="Добавить медикамент">
        <div className="stack stack-md">
          <Input label="Название" value={medName} onChange={e => setMedName(e.target.value)} placeholder="Например, рисперидон" />
          <Input label="Дозировка" value={medDosage} onChange={e => setMedDosage(e.target.value)} placeholder="2 мг" />

          {/* Времена приёма */}
          <div>
            <p className={styles.fieldLabel}>Время приёма</p>
            <div className="stack stack-sm">
              {medTimes.map((t, i) => (
                <div key={i} className={styles.timeRow}>
                  <input
                    type="time"
                    value={t}
                    onChange={e => setMedTimes(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                    className={styles.timeInput}
                  />
                  {medTimes.length > 1 && (
                    <button
                      className={styles.iconBtn}
                      onClick={() => setMedTimes(prev => prev.filter((_, j) => j !== i))}
                    >✕</button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setMedTimes(prev => [...prev, '09:00'])}>
                + добавить время
              </Button>
            </div>
          </div>

          {/* Дни недели */}
          <div>
            <p className={styles.fieldLabel}>Дни приёма</p>
            <div className={styles.daysRow}>
              {ALL_DAYS.map(d => (
                <button
                  key={d}
                  className={`${styles.dayChip} ${(medDays.length === 0 || medDays.includes(d)) ? styles.dayActive : ''}`}
                  onClick={() => toggleDay(d)}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
            <button className={styles.everyDayBtn} onClick={toggleAllDays}>
              {medDays.length === 0 || medDays.length === 7 ? '✓ каждый день' : 'выбрать все'}
            </button>
          </div>

          <Button onClick={handleAddMed} disabled={saving || !medName.trim()}>
            {saving ? 'Сохраняю...' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

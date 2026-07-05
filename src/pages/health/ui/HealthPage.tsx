import { useState, useEffect } from 'react'
import { useHealthStore } from '@entities/health'
import { Button, Card, Input, Modal } from '@shared/ui'
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@shared/lib/pushSubscription'
import styles from './HealthPage.module.css'

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
  const [medTime, setMedTime]         = useState('09:00')
  const [saving, setSaving]           = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

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
    if (!medName.trim()) return
    setSaving(true)
    await addMedication(medName.trim(), medDosage.trim(), medTime)
    setSaving(false)
    setMedOpen(false)
    setMedName(''); setMedDosage(''); setMedTime('09:00')
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
                  ? '🔔 уведомления приходят даже когда приложение закрыто'
                  : 'Включи, чтобы получать напоминания в фоне'}
              </p>
            </div>
            <Button
              size="sm"
              variant={pushEnabled ? 'ghost' : 'primary'}
              onClick={handleTogglePush}
              disabled={pushLoading}
            >
              {pushLoading ? '...' : pushEnabled ? 'Выключить' : 'Включить'}
            </Button>
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
              const taken = todayMedLogs.some(l => l.name === med.name)
              return (
                <Card key={med.id} className={taken ? styles.taken : styles.pending}>
                  <div className="row row-between row-gap-md">
                    <div>
                      <p className={styles.medName}>{med.name}</p>
                      <p className={styles.medInfo}>{med.dosage} · {med.scheduledTime}</p>
                    </div>
                    <div className="row row-gap-sm">
                      {taken ? (
                        <span className={styles.takenBadge}>✓ принято</span>
                      ) : (
                        <Button size="sm" onClick={() => logMedication(med.name, med.dosage)}>
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
          <Input label="Время приёма" type="time" value={medTime} onChange={e => setMedTime(e.target.value)} />
          <Button onClick={handleAddMed} disabled={saving || !medName.trim()}>
            {saving ? 'Сохраняю...' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

import { useMoodStore } from '@entities/mood'
import { useTaskStore } from '@entities/task'
import { useWorkoutStore } from '@entities/workout'
import { useHealthStore } from '@entities/health'
import { Card } from '@shared/ui'
import { MoodChip } from './MoodChip'
import styles from './HomePage.module.css'

const GREETING = (() => {
  const h = new Date().getHours()
  if (h < 6)  return 'Доброй ночи 🌙'
  if (h < 12) return 'Доброе утро ☀️'
  if (h < 18) return 'Добрый день 🌤️'
  return 'Добрый вечер 🌆'
})()

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

export function HomePage() {
  const todayMood    = useMoodStore(s => s.todayEntry())
  const tasks        = useTaskStore(s => s.tasks)
  const todayWorkout = useWorkoutStore(s => s.todaySessions())
  const medications  = useHealthStore(s => s.medications)
  const todayLogs    = useHealthStore(s => s.todayLogs())

  const doneTasks   = tasks.filter(t => t.status === 'done').length
  const totalTasks  = tasks.filter(t => t.dueDate === new Date().toISOString().slice(0, 10)).length

  const pendingMeds = medications.filter(m =>
    m.isActive && !todayLogs.some(l => l.name === m.name)
  )

  return (
    <div className="page animate-in">
      <div className={styles.greeting}>
        <p className={styles.greetText}>{GREETING}</p>
        <p className={styles.date}>{DATE_FMT.format(new Date())}</p>
      </div>

      <div className="stack stack-md">
        {/* Настроение */}
        <Card>
          <div className="row row-between row-gap-md">
            <div>
              <h3>Настроение сегодня</h3>
              {todayMood
                ? <MoodChip score={todayMood.score} emotions={todayMood.emotions} />
                : <p className={styles.empty}>Ещё не отмечено</p>
              }
            </div>
            <a href="/mood" className={styles.link}>→</a>
          </div>
        </Card>

        {/* Задачи */}
        <Card>
          <div className="row row-between row-gap-md">
            <div>
              <h3>Задачи на сегодня</h3>
              {totalTasks > 0
                ? <p className={styles.stat}>{doneTasks} / {totalTasks} выполнено</p>
                : <p className={styles.empty}>Нет задач на сегодня</p>
              }
            </div>
            <a href="/planning" className={styles.link}>→</a>
          </div>
        </Card>

        {/* Тренировки */}
        <Card>
          <div className="row row-between row-gap-md">
            <div>
              <h3>Тренировки</h3>
              {todayWorkout.length > 0
                ? <p className={styles.stat}>{todayWorkout.length} занятий сегодня</p>
                : <p className={styles.empty}>Ещё не тренировалась</p>
              }
            </div>
            <a href="/workout" className={styles.link}>→</a>
          </div>
        </Card>

        {/* Медикаменты — критично */}
        {pendingMeds.length > 0 && (
          <Card glass>
            <div className={styles.medAlert}>
              <span>💊</span>
              <div>
                <h3>Не забудь про таблетки!</h3>
                <p className={styles.medList}>
                  {pendingMeds.map(m => `${m.name} (${m.scheduledTime})`).join(' · ')}
                </p>
              </div>
              <a href="/health" className={styles.link}>→</a>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

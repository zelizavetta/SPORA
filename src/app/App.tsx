import { useEffect } from 'react'
import { AppRouter } from './router'
import { useMoodStore } from '@entities/mood'
import { useNoteStore } from '@entities/note'
import { useTaskStore } from '@entities/task'
import { useWorkoutStore } from '@entities/workout'
import { useGoalStore } from '@entities/goal'
import { useHealthStore } from '@entities/health'
import { useRecipeStore } from '@entities/recipe'
import { useFridgeStore } from '@entities/fridge'
import { useMealPlanStore } from '@entities/meal-plan'
import { useAuthStore } from '@entities/auth'
import { pullServerSync, backfillOutbox } from '@shared/api/sync'
import { flushOutbox, startOutboxWatcher } from '@shared/api/outbox'
import { scheduleNotifications, getNotificationPermission } from '@shared/lib/notifications'

async function loadAll() {
  await Promise.all([
    useMoodStore.getState().load(),
    useNoteStore.getState().load(),
    useTaskStore.getState().load(),
    useWorkoutStore.getState().load(),
    useGoalStore.getState().load(),
    useHealthStore.getState().load(),
    useRecipeStore.getState().load(),
    useFridgeStore.getState().load(),
    useMealPlanStore.getState().load(),
  ])
}

export function App() {
  useEffect(() => {
    const isAuth = useAuthStore.getState().isAuthenticated
    const after = () => {
      // после загрузки данных — запланировать уведомления если разрешение уже есть
      if (getNotificationPermission() === 'granted') {
        scheduleNotifications(useHealthStore.getState().medications)
      }
    }
    if (isAuth) {
      startOutboxWatcher()
      // сначала отдаём накопленное локально, потом забираем серверное —
      // иначе свежие офлайн-правки затрутся старыми данными с сервера
      void backfillOutbox()
        .catch(() => {})
        .then(() => flushOutbox())
        .catch(() => {})
        .then(() => pullServerSync().catch(() => {}))
        .finally(() => { void loadAll().then(after) })
    } else {
      void loadAll().then(after)
    }
  }, [])

  return <AppRouter />
}

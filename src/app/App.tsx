import { useEffect } from 'react'
import { AppRouter } from './router'
import { useMoodStore } from '@entities/mood'
import { useNoteStore } from '@entities/note'
import { useTaskStore } from '@entities/task'
import { useWorkoutStore } from '@entities/workout'
import { useGoalStore } from '@entities/goal'
import { useHealthStore } from '@entities/health'
import { useAuthStore } from '@entities/auth'
import { pullServerSync } from '@shared/api/sync'
import { scheduleNotifications, getNotificationPermission } from '@shared/lib/notifications'

async function loadAll() {
  await Promise.all([
    useMoodStore.getState().load(),
    useNoteStore.getState().load(),
    useTaskStore.getState().load(),
    useWorkoutStore.getState().load(),
    useGoalStore.getState().load(),
    useHealthStore.getState().load(),
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
      pullServerSync()
        .catch(() => {})
        .finally(() => { void loadAll().then(after) })
    } else {
      void loadAll().then(after)
    }
  }, [])

  return <AppRouter />
}

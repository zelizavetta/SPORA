import { useEffect } from 'react'
import { AppRouter } from './router'
import { useMoodStore } from '@entities/mood'
import { useNoteStore } from '@entities/note'
import { useTaskStore } from '@entities/task'
import { useWorkoutStore } from '@entities/workout'
import { useGoalStore } from '@entities/goal'
import { useHealthStore } from '@entities/health'

export function App() {
  useEffect(() => {
    void Promise.all([
      useMoodStore.getState().load(),
      useNoteStore.getState().load(),
      useTaskStore.getState().load(),
      useWorkoutStore.getState().load(),
      useGoalStore.getState().load(),
      useHealthStore.getState().load(),
    ])
  }, [])

  return <AppRouter />
}

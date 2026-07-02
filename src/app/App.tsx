import { useEffect } from 'react'
import { AppRouter } from './router'
import { useMoodStore } from '@entities/mood'
import { useNoteStore } from '@entities/note'
import { useTaskStore } from '@entities/task'
import { useWorkoutStore } from '@entities/workout'
import { useGoalStore } from '@entities/goal'
import { useHealthStore } from '@entities/health'

export function App() {
  const loadMoods    = useMoodStore(s => s.load)
  const loadNotes    = useNoteStore(s => s.load)
  const loadTasks    = useTaskStore(s => s.load)
  const loadWorkouts = useWorkoutStore(s => s.load)
  const loadGoals    = useGoalStore(s => s.load)
  const loadHealth   = useHealthStore(s => s.load)

  useEffect(() => {
    void Promise.all([loadMoods(), loadNotes(), loadTasks(), loadWorkouts(), loadGoals(), loadHealth()])
  }, [loadMoods, loadNotes, loadTasks, loadWorkouts, loadGoals, loadHealth])

  return <AppRouter />
}

import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@widgets/app-layout'
import { useAuthStore } from '@entities/auth'

const LoginPage  = lazy(() => import('@pages/login').then(m => ({ default: m.LoginPage })))
const HomePage   = lazy(() => import('@pages/home').then(m => ({ default: m.HomePage })))
const MoodPage   = lazy(() => import('@pages/mood').then(m => ({ default: m.MoodPage })))
const NotesPage      = lazy(() => import('@pages/notes').then(m => ({ default: m.NotesPage })))
const TaskDetailPage = lazy(() => import('@pages/notes').then(m => ({ default: m.TaskDetailPage })))
const NoteDetailPage = lazy(() => import('@pages/notes').then(m => ({ default: m.NoteDetailPage })))
const WorkoutPage = lazy(() => import('@pages/workout').then(m => ({ default: m.WorkoutPage })))
const GoalsPage  = lazy(() => import('@pages/goals').then(m => ({ default: m.GoalsPage })))
const HealthPage = lazy(() => import('@pages/health').then(m => ({ default: m.HealthPage })))
const RecipesPage = lazy(() => import('@pages/recipes').then(m => ({ default: m.RecipesPage })))

function RequireAuth() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function RedirectIfAuth() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/home" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <RedirectIfAuth />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: 'home',     element: <HomePage /> },
          { path: 'mood',     element: <MoodPage /> },
          { path: 'notes',          element: <NotesPage /> },
          { path: 'notes/:uuid',   element: <NoteDetailPage /> },
          { path: 'tasks/:uuid',   element: <TaskDetailPage /> },
          { path: 'planning', element: <Navigate to="/notes" replace /> },
          { path: 'workout',  element: <WorkoutPage /> },
          { path: 'goals',    element: <GoalsPage /> },
          { path: 'health',   element: <HealthPage /> },
          { path: 'recipes',  element: <RecipesPage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>загрузка...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  )
}

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@entities/auth'
import { Card, Input, Button } from '@shared/ui'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await login(password)
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.logo}>SPORA</div>
        <p className={styles.subtitle}>твоя экосистема</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" disabled={isLoading || !password}>
            {isLoading ? 'Входим…' : 'Войти'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  children: ReactNode
  color?: 'primary' | 'sage' | 'peach' | 'sky' | 'muted'
}

export function Badge({ children, color = 'primary' }: BadgeProps) {
  return <span className={[styles.badge, styles[color]].join(' ')}>{children}</span>
}

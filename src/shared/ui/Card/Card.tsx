import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glass?: boolean
}

export function Card({ children, glass = false, className = '', ...rest }: CardProps) {
  return (
    <div className={[styles.card, glass ? styles.glass : '', className].join(' ')} {...rest}>
      {children}
    </div>
  )
}

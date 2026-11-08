import type { TextareaHTMLAttributes } from 'react'
import styles from './Textarea.module.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className = '', id, ...rest }: TextareaProps) {
  const elId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label} htmlFor={elId}>{label}</label>}
      <textarea id={elId} className={[styles.textarea, className].join(' ')} {...rest} />
    </div>
  )
}

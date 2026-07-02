import type { MoodScore, MoodEmotion } from '@shared/types'
import styles from './MoodChip.module.css'

const SCORE_LABEL: Record<MoodScore, string> = {
  1: 'Тяжело', 2: 'Грустно', 3: 'Нейтрально', 4: 'Хорошо', 5: 'Отлично',
}

interface Props { score: MoodScore; emotions: MoodEmotion[] }

export function MoodChip({ score, emotions }: Props) {
  return (
    <div className={styles.chip}>
      <span className={styles.dot} style={{ background: `var(--mood-${score})` }} />
      <span className={styles.label}>{SCORE_LABEL[score]}</span>
      {emotions.slice(0, 2).map(e => (
        <span key={e} className={styles.emotion}>{e}</span>
      ))}
    </div>
  )
}

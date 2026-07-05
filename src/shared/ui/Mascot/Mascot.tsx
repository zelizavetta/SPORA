import styles from './Mascot.module.css'

export type MascotMood = 'joy' | 'calm' | 'idea' | 'anxiety' | 'sad' | 'neutral'

interface MascotProps {
  mood?: MascotMood
  size?: number
  animate?: boolean
  className?: string
}

const BLUSH_COLOR: Record<MascotMood, string> = {
  joy:     '#FFC93C',
  calm:    '#6FD0E0',
  idea:    '#B99CFF',
  anxiety: '#FF9B6B',
  sad:     '#8FA8D8',
  neutral: '#a9bda3',
}

function Eyes({ type }: { type: 'arc' | 'dot' }) {
  if (type === 'arc') {
    return (
      <>
        <div className={`${styles.eyeArc} ${styles.eyeArcL}`} />
        <div className={`${styles.eyeArc} ${styles.eyeArcR}`} />
      </>
    )
  }
  return (
    <>
      <div className={`${styles.eyeDot} ${styles.eyeDotL}`} />
      <div className={`${styles.eyeDot} ${styles.eyeDotR}`} />
      <div className={`${styles.eyeGlint} ${styles.eyeGlintL}`} />
      <div className={`${styles.eyeGlint} ${styles.eyeGlintR}`} />
    </>
  )
}

function Mouth({ type }: { type: 'big' | 'small' | 'frown' | 'o' | 'wavy' }) {
  if (type === 'big')   return <div className={styles.mouthBig} />
  if (type === 'frown') return <div className={styles.mouthFrown} />
  if (type === 'o')     return <div className={styles.mouthO} />
  if (type === 'wavy')  return <><div className={styles.mouthWavyL} /><div className={styles.mouthWavyR} /></>
  return <div className={styles.mouthSmall} />
}

function MoodFx({ mood }: { mood: MascotMood }) {
  if (mood === 'idea')    return <div className={styles.ideaSpark} />
  if (mood === 'anxiety') return <div className={styles.anxDrop} />
  return null
}

const FACE_CONFIG: Record<MascotMood, { eyes: 'arc' | 'dot'; mouth: 'big' | 'small' | 'frown' | 'o' | 'wavy' }> = {
  joy:     { eyes: 'arc', mouth: 'big'   },
  calm:    { eyes: 'dot', mouth: 'small' },
  idea:    { eyes: 'dot', mouth: 'o'     },
  anxiety: { eyes: 'dot', mouth: 'wavy'  },
  sad:     { eyes: 'dot', mouth: 'frown' },
  neutral: { eyes: 'dot', mouth: 'small' },
}

export function Mascot({ mood = 'calm', size = 120, animate = true, className }: MascotProps) {
  const cfg = FACE_CONFIG[mood]
  const blush = BLUSH_COLOR[mood]
  const fontSize = size / 8

  return (
    <div className={`${styles.wrap}${className ? ` ${className}` : ''}`} style={{ fontSize }}>
      <div className={`${styles.anim}${animate ? '' : ` ${styles.still}`}`}>
        <div className={styles.bowL} />
        <div className={styles.bowR} />
        <div className={styles.bowC} />
        <div className={styles.body} />
        <Eyes type={cfg.eyes} />
        <div className={`${styles.blush} ${styles.blushL}`} style={{ background: blush }} />
        <div className={`${styles.blush} ${styles.blushR}`} style={{ background: blush }} />
        <Mouth type={cfg.mouth} />
        <MoodFx mood={mood} />
      </div>
    </div>
  )
}

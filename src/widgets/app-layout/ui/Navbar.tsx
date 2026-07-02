import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

const NAV = [
  { to: '/home',     icon: '🏠', label: 'Главная' },
  { to: '/mood',     icon: '🌸', label: 'Настроение' },
  { to: '/notes',    icon: '📝', label: 'Заметки' },
  { to: '/planning', icon: '✅', label: 'Планы' },
  { to: '/workout',  icon: '🧘', label: 'Спорт' },
  { to: '/goals',    icon: '🎯', label: 'Цели' },
  { to: '/health',   icon: '💊', label: 'Здоровье' },
]

export function Navbar() {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo}>SPORA</span>
      {NAV.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => [styles.item, isActive ? styles.active : ''].join(' ')}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

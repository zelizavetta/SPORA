import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'
import { Mascot } from '@shared/ui'
import { useState } from 'react'

const NAV = [
  { to: '/home',     icon: '🏠', label: 'Главная'},
  { to: '/mood',     icon: '🌸', label: 'Настроение'},
  { to: '/notes',    icon: '📝', label: 'Заметки'},
  { to: '/planning', icon: '✅', label: 'Планы'},
  { to: '/workout',  icon: '🧘', label: 'Спорт'},
  { to: '/goals',    icon: '🎯', label: 'Цели'},
  { to: '/health',   icon: '💊', label: 'Здоровье'},
]

export function Navbar() {
  const [navActive, setNavActive] = useState('/home');
  return (
    <nav className={styles.nav}>
      <div className="row row-gap-sm">
        <Mascot mood='joy' size={80} />
        <span className={styles.logo}>SPORA</span>
      </div>
      {NAV.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setNavActive(item.to)}
          className={({ isActive }) => [styles.item, isActive ? styles.active : ''].join(' ')}
        >
          <span className={["dot", navActive === item.to ? "dot-active" : ''].join(' ')}></span>
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

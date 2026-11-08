import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import styles from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={styles.root}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

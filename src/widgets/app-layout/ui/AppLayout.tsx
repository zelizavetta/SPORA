import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import styles from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <Navbar />
    </div>
  )
}

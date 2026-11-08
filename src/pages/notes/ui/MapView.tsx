import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Note } from '@shared/types'
import 'leaflet/dist/leaflet.css'
import styles from './MapView.module.css'

const COLOR_HEX: Record<string, string> = {
  lavender: '#c4b5fd', sage: '#86efac', peach: '#fdba74', sky: '#93c5fd', vanilla: '#fde68a',
}

const DEFAULT_CENTER: [number, number] = [55.0084, 82.9357] // Новосибирск

export function MapView({ notes }: { notes: Note[] }) {
  const navigate   = useNavigate()
  const mapEl      = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<any>(null)

  const located = notes.filter(n => n.location?.lat != null)

  useEffect(() => {
    if (!mapEl.current) return

    import('leaflet').then(({ default: L }) => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

      const center: [number, number] = located.length > 0
        ? [located[0].location!.lat, located[0].location!.lon]
        : DEFAULT_CENTER

      const map = L.map(mapEl.current!, { center, zoom: 13 })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      for (const note of located) {
        const { lat, lon, name } = note.location!
        const color = COLOR_HEX[note.color] ?? '#c4b5fd'

        const marker = L.circleMarker([lat, lon], {
          radius: 12,
          fillColor: color,
          color: 'rgba(0,0,0,0.25)',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.92,
        }).addTo(map)

        const el = document.createElement('div')
        el.innerHTML = `
          <div style="font:13px/1.4 system-ui,sans-serif;min-width:150px;max-width:220px">
            <p style="font-weight:700;margin:0 0 3px">${note.title}</p>
            ${name ? `<p style="font-size:11px;color:#888;margin:0 0 5px">📍 ${name}</p>` : ''}
            ${note.body ? `<p style="font-size:11px;color:#555;margin:0 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${note.body}</p>` : ''}
            <button id="map-open-${note.uuid}" style="font-size:11px;padding:3px 12px;border:1.5px solid #4ff2a6;border-radius:100px;background:none;color:#4ff2a6;cursor:pointer;font-family:monospace">Открыть →</button>
          </div>`
        const popup = L.popup({ closeButton: false, offset: [0, -6] }).setContent(el)
        marker.bindPopup(popup)

        marker.on('popupopen', () => {
          const btn = document.getElementById(`map-open-${note.uuid}`)
          btn?.addEventListener('click', () => navigate(`/notes/${note.uuid}`))
        })
      }

      if (located.length > 1) {
        const bounds = L.latLngBounds(located.map(n => [n.location!.lat, n.location!.lon] as [number, number]))
        map.fitBounds(bounds, { padding: [48, 48] })
      }

      mapRef.current = map
    })

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [located.map(n => n.uuid).join(',')]) // eslint-disable-line

  if (located.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon}>🗺</p>
        <p className={styles.emptyTitle}>Нет идей с геолокацией</p>
        <p className={styles.emptyHint}>Разрешите доступ к геолокации при создании идеи — она появится здесь</p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div ref={mapEl} className={styles.map} />
      <div className={styles.legend}>
        <p className={styles.legendLabel}>Идеи на карте · {located.length}</p>
        <div className={styles.legendItems}>
          {located.map(n => (
            <button key={n.uuid} className={styles.legendItem} onClick={() => navigate(`/notes/${n.uuid}`)}>
              <span className={styles.legendDot} style={{ background: COLOR_HEX[n.color] ?? '#c4b5fd' }} />
              <span className={styles.legendTitle}>{n.title}</span>
              {n.location?.name && <span className={styles.legendLoc}>{n.location.name}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

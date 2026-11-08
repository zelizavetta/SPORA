import { useEffect, useRef, useState, useMemo } from 'react'
import type { Note, NoteColor, Task, TaskPriority } from '@shared/types'
import styles from './GraphView.module.css'

// ── Color maps ────────────────────────────────────────────────────────────────
const NOTE_COLOR: Record<NoteColor, string> = {
  lavender: '#c4b5fd', sage: '#86efac', peach: '#fdba74', sky: '#93c5fd', vanilla: '#fde68a',
}
const TASK_COLOR: Record<TaskPriority, string> = {
  low: '#4ade80', medium: '#facc15', high: '#f87171',
}

// ── Graph data model ──────────────────────────────────────────────────────────
interface SimNode {
  uuid: string
  type: 'note' | 'task'
  label: string
  body: string
  color: string
  r: number
  x: number; y: number
  vx: number; vy: number
}

interface SimEdge { src: number; dst: number }

function buildGraph(notes: Note[], tasks: Task[]) {
  const nodes: SimNode[] = []
  const edges: SimEdge[] = []
  const idx = new Map<string, number>()

  for (const n of notes) {
    idx.set(n.uuid, nodes.length)
    nodes.push({ uuid: n.uuid, type: 'note', label: n.title, body: n.body, color: NOTE_COLOR[n.color] ?? '#c4b5fd', r: 28, x: 0, y: 0, vx: 0, vy: 0 })
  }
  for (const t of tasks) {
    idx.set(t.uuid, nodes.length)
    nodes.push({ uuid: t.uuid, type: 'task', label: t.title, body: t.description, color: TASK_COLOR[t.priority] ?? '#facc15', r: 28, x: 0, y: 0, vx: 0, vy: 0 })
  }

  const addEdge = (srcUuid: string, dstUuid: string) => {
    const s = idx.get(srcUuid), d = idx.get(dstUuid)
    if (s !== undefined && d !== undefined && s !== d) edges.push({ src: s, dst: d })
  }

  for (const n of notes) {
    for (const u of n.linkedNoteUuids ?? []) addEdge(n.uuid, u)
    for (const u of n.linkedTaskUuids ?? []) addEdge(n.uuid, u)
  }
  for (const t of tasks) {
    for (const u of t.dependsOnUuids ?? []) addEdge(t.uuid, u)
    for (const u of t.linkedNoteUuids ?? []) addEdge(t.uuid, u)
  }

  // Degree → radius
  const degree = new Array(nodes.length).fill(0)
  for (const e of edges) { degree[e.src]++; degree[e.dst]++ }
  for (let i = 0; i < nodes.length; i++) nodes[i].r = 39 + degree[i] * 14

  return { nodes, edges }
}

// ── Canvas word wrap helper ───────────────────────────────────────────────────
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  return lines.slice(0, 3) // max 3 lines
}

// ── Side panel ────────────────────────────────────────────────────────────────
function SidePanel({
  selected, nodes, notes, tasks, onOpen,
}: {
  selected: string | null
  nodes: SimNode[]
  notes: Note[]
  tasks: Task[]
  onOpen: (uuid: string, type: 'note' | 'task') => void
}) {
  const node = selected ? nodes.find(n => n.uuid === selected) : null

  // Collect all connected nodes (outgoing + incoming)
  const connected = useMemo(() => {
    if (!selected) return []
    const seen = new Set<string>()
    const result: SimNode[] = []

    const push = (uuid: string) => {
      if (seen.has(uuid) || uuid === selected) return
      seen.add(uuid)
      const nd = nodes.find(x => x.uuid === uuid)
      if (nd) result.push(nd)
    }

    // Outgoing from selected note
    for (const n of notes) {
      if (n.uuid !== selected) continue
      for (const u of [...(n.linkedNoteUuids ?? []), ...(n.linkedTaskUuids ?? [])]) push(u)
    }
    // Outgoing from selected task
    for (const t of tasks) {
      if (t.uuid !== selected) continue
      for (const u of [...(t.dependsOnUuids ?? []), ...(t.linkedNoteUuids ?? [])]) push(u)
    }
    // Incoming: notes that point to selected
    for (const n of notes) {
      if (n.uuid === selected) continue
      const refs = [...(n.linkedNoteUuids ?? []), ...(n.linkedTaskUuids ?? [])]
      if (refs.includes(selected)) push(n.uuid)
    }
    // Incoming: tasks that point to selected
    for (const t of tasks) {
      if (t.uuid === selected) continue
      const refs = [...(t.dependsOnUuids ?? []), ...(t.linkedNoteUuids ?? [])]
      if (refs.includes(selected)) push(t.uuid)
    }

    return result
  }, [selected, nodes, notes, tasks])

  if (!node) return (
    <div className={styles.panel}>
      <div className={styles.panelEmpty}>
        <p>Кликни на узел</p>
        <p className={styles.panelHint}>чтобы увидеть связи</p>
      </div>
    </div>
  )

  return (
    <div className={styles.panel}>
      <div className={styles.panelNode} style={{ borderColor: node.color }}>
        <span className={styles.panelType}>{node.type === 'note' ? '📝 ИДЕЯ' : '✅ ЗАДАЧА'}</span>
        <h2 className={styles.panelTitle}>{node.label}</h2>
        {node.body && <p className={styles.panelBody}>{node.body}</p>}
        <button className={styles.panelOpen} onClick={() => onOpen(node.uuid, node.type)}>
          Открыть →
        </button>
      </div>

      {connected.length > 0 && (
        <div className={styles.panelLinks}>
          <p className={styles.panelLinksLabel}>СВЯЗАННЫЕ  ·  {connected.length}</p>
          {connected.map(n => n && (
            <button key={n.uuid} className={styles.panelLinkRow} onClick={() => onOpen(n.uuid, n.type)}>
              <span className={styles.panelLinkDot} style={{ background: n.color }} />
              <span className={styles.panelLinkTitle}>{n.label}</span>
              <span className={styles.panelLinkArrow}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GraphView ─────────────────────────────────────────────────────────────────
export function GraphView({
  notes, tasks, onOpen,
}: {
  notes: Note[]
  tasks: Task[]
  onOpen: (uuid: string, type: 'note' | 'task') => void
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)

  const { nodes, edges } = useMemo(() => buildGraph(notes, tasks), [notes, tasks])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap || nodes.length === 0) return

    const dpr = window.devicePixelRatio || 1
    const W   = wrap.clientWidth
    const H   = wrap.clientHeight || 480

    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')!
    const cx = W / 2, cy = H / 2

    // ── Viewport (pan + zoom) ────────────────────────────────
    const vp = { scale: 1, tx: 0, ty: 0 }
    const toWorld = (sx: number, sy: number) => ({
      wx: (sx - vp.tx) / vp.scale,
      wy: (sy - vp.ty) / vp.scale,
    })
    const clampScale = (s: number) => Math.max(0.2, Math.min(6, s))

    // ── Initial placement ────────────────────────────────────
    const sim: SimNode[] = nodes.map((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2
      const spread = Math.min(W, H) * 0.35
      return { ...n, x: cx + Math.cos(a) * spread, y: cy + Math.sin(a) * spread, vx: 0, vy: 0 }
    })

    let dashOffset = 0
    let heat = 1.0
    let currentSelected = selectedUuid
    let rafId: number

    const tick = () => {
      // ── Physics ──────────────────────────────────────────

      // 1. Hard separation — always on, prevents nodes from touching
      for (let i = 0; i < sim.length; i++) {
        for (let j = i + 1; j < sim.length; j++) {
          const dx = sim[j].x - sim[i].x || 0.01
          const dy = sim[j].y - sim[i].y || 0.01
          const d  = Math.sqrt(dx * dx + dy * dy) || 0.01
          const minD = sim[i].r + sim[j].r + 40
          if (d < minD) {
            const push = (minD - d) * 0.6
            const ux = dx / d, uy = dy / d
            sim[i].vx -= ux * push; sim[i].vy -= uy * push
            sim[j].vx += ux * push; sim[j].vy += uy * push
          }
        }
      }

      // 2. Long-range repulsion + springs + gravity (cooling)
      if (heat > 0.008) {
        const rep = 14000
        for (let i = 0; i < sim.length; i++) {
          for (let j = i + 1; j < sim.length; j++) {
            const dx = sim[j].x - sim[i].x || 0.01
            const dy = sim[j].y - sim[i].y || 0.01
            const d2 = Math.max(dx * dx + dy * dy, 1)
            const d  = Math.sqrt(d2)
            const f  = (rep / d2) * heat
            const ux = dx / d, uy = dy / d
            sim[i].vx -= ux * f; sim[i].vy -= uy * f
            sim[j].vx += ux * f; sim[j].vy += uy * f
          }
        }
        const restLen = 260, springK = 0.04
        for (const e of edges) {
          const s = sim[e.src], t = sim[e.dst]
          const dx = t.x - s.x, dy = t.y - s.y
          const d  = Math.sqrt(dx * dx + dy * dy) || 1
          const f  = (d - restLen) * springK * heat
          const ux = dx / d, uy = dy / d
          s.vx += ux * f; s.vy += uy * f
          t.vx -= ux * f; t.vy -= uy * f
        }
        const grav = 0.018 * heat
        for (const n of sim) {
          n.vx += (cx - n.x) * grav
          n.vy += (cy - n.y) * grav
        }
        heat *= 0.994
      }

      // 3. Integrate + dampen (always)
      for (const n of sim) {
        n.vx *= 0.80; n.vy *= 0.80
        n.x  += n.vx;  n.y  += n.vy
      }

      // ── Draw ─────────────────────────────────────────────
      dashOffset -= 0.8

      // Clear in raw pixel space
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Apply viewport (zoom + pan + dpr)
      ctx.setTransform(vp.scale * dpr, 0, 0, vp.scale * dpr, vp.tx * dpr, vp.ty * dpr)

      // Edges
      for (const e of edges) {
        const s = sim[e.src], t = sim[e.dst]
        const isSel = s.uuid === currentSelected || t.uuid === currentSelected
        const dx = t.x - s.x, dy = t.y - s.y
        const d  = Math.sqrt(dx * dx + dy * dy) || 1
        ctx.save()
        ctx.strokeStyle = isSel ? 'rgba(79,242,166,0.75)' : 'rgba(79,242,166,0.22)'
        ctx.lineWidth   = isSel ? 2 : 1.2
        ctx.setLineDash([7, 9])
        ctx.lineDashOffset = dashOffset
        ctx.beginPath()
        ctx.moveTo(s.x + (dx / d) * s.r, s.y + (dy / d) * s.r)
        ctx.lineTo(t.x - (dx / d) * t.r, t.y - (dy / d) * t.r)
        ctx.stroke()
        ctx.restore()
      }

      // Nodes
      for (const n of sim) {
        const isSel = n.uuid === currentSelected
        ctx.save()
        if (isSel) { ctx.shadowColor = n.color; ctx.shadowBlur = 24 }
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = n.type === 'note' ? n.color + '28' : '#161e11'
        ctx.fill()
        ctx.strokeStyle = isSel ? '#4ff2a6' : n.color
        ctx.lineWidth   = isSel ? 3 : 1.8
        ctx.stroke()
        ctx.restore()

        ctx.save()
        const fs = Math.max(10, Math.min(14, n.r * 0.30))
        ctx.font = `600 ${fs}px "Space Grotesk", sans-serif`
        ctx.fillStyle = '#e9f1df'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const truncated = n.label.length > 15 ? n.label.slice(0, 14) + '…' : n.label
        const lines = wrapText(ctx, truncated, n.r * 1.6)
        const lh = fs + 3
        const startY = n.y - (lines.length - 1) * lh / 2
        for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], n.x, startY + i * lh)
        ctx.restore()
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    // ── Mouse drag pan ───────────────────────────────────────
    let dragStart: { x: number; y: number } | null = null
    let dragMoved = false

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const rect = canvas.getBoundingClientRect()
      dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      dragMoved = false
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragStart) return
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top
      const dx = cx - dragStart.x, dy = cy - dragStart.y
      if (!dragMoved && Math.sqrt(dx*dx + dy*dy) > 4) dragMoved = true
      if (dragMoved) {
        vp.tx += dx; vp.ty += dy
        dragStart = { x: cx, y: cy }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (!dragMoved) {
        // treat as click — select node
        const rect = canvas.getBoundingClientRect()
        const { wx, wy } = toWorld(e.clientX - rect.left, e.clientY - rect.top)
        let hit = false
        for (const n of sim) {
          if ((n.x - wx) ** 2 + (n.y - wy) ** 2 <= n.r ** 2) {
            currentSelected = n.uuid; setSelectedUuid(n.uuid); hit = true; break
          }
        }
        if (!hit) { currentSelected = null; setSelectedUuid(null) }
      }
      dragStart = null
    }

    const onMouseLeave = () => { dragStart = null }

    // ── Wheel zoom (desktop) — smooth ───────────────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left, py = e.clientY - rect.top
      // Normalise delta so trackpads and wheels feel similar
      const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY
      const ratio = Math.exp(-delta * 0.0018)
      const ns = clampScale(vp.scale * ratio)
      vp.tx = px - (px - vp.tx) * (ns / vp.scale)
      vp.ty = py - (py - vp.ty) * (ns / vp.scale)
      vp.scale = ns
    }

    // ── Touch pan + pinch zoom ───────────────────────────────
    type TPoint = { id: number; x: number; y: number }
    let prev: TPoint[] = []

    const getPoints = (e: TouchEvent): TPoint[] => {
      const rect = canvas.getBoundingClientRect()
      return Array.from(e.touches).map(t => ({
        id: t.identifier,
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
      }))
    }

    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); prev = getPoints(e) }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const cur = getPoints(e)

      if (cur.length === 1 && prev.length >= 1) {
        const p = prev.find(t => t.id === cur[0].id) ?? prev[0]
        vp.tx += cur[0].x - p.x
        vp.ty += cur[0].y - p.y
      } else if (cur.length >= 2 && prev.length >= 2) {
        const p0 = prev.find(t => t.id === cur[0].id) ?? prev[0]
        const p1 = prev.find(t => t.id === cur[1].id) ?? prev[1]
        // Midpoints
        const pmx = (p0.x + p1.x) / 2, pmy = (p0.y + p1.y) / 2
        const cmx = (cur[0].x + cur[1].x) / 2, cmy = (cur[0].y + cur[1].y) / 2
        // Distances
        const pd = Math.sqrt((p1.x-p0.x)**2 + (p1.y-p0.y)**2) || 1
        const cd = Math.sqrt((cur[1].x-cur[0].x)**2 + (cur[1].y-cur[0].y)**2)
        const ns = clampScale(vp.scale * (cd / pd))
        // Scale around previous midpoint, then shift by midpoint delta
        vp.tx = cmx - (pmx - vp.tx) * (ns / vp.scale)
        vp.ty = cmy - (pmy - vp.ty) * (ns / vp.scale)
        vp.scale = ns
      }

      prev = cur
    }

    const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); prev = getPoints(e) }

    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchstart',  onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',   onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',    onTouchEnd,   { passive: false })
    canvas.addEventListener('touchcancel', onTouchEnd,   { passive: false })

    return () => {
      cancelAnimationFrame(rafId)
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart',  onTouchStart)
      canvas.removeEventListener('touchmove',   onTouchMove)
      canvas.removeEventListener('touchend',    onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // Keep currentSelected in sync without restarting sim
  const selRef = useRef(selectedUuid)
  useEffect(() => { selRef.current = selectedUuid }, [selectedUuid])

  if (nodes.length === 0) return (
    <div className={styles.empty}>
      <p>Нет данных для графа</p>
      <p className={styles.emptyHint}>Добавь заметки и задачи, свяжи их между собой</p>
    </div>
  )

  return (
    <div className={styles.root}>
      <div className={styles.canvasWrap} ref={wrapRef}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <p className={styles.hint}>клик по узлу — раскрыть связь</p>
      </div>
      <SidePanel
        selected={selectedUuid}
        nodes={nodes}
        notes={notes}
        tasks={tasks}
        onOpen={onOpen}
      />
    </div>
  )
}

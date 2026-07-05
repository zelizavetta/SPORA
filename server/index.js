import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb } from './db.js'
import authRouter from './routes/auth.js'
import dataRouter from './routes/data.js'
import pushRouter from './routes/push.js'
import { requireAuth } from './middleware/auth.js'
import { startScheduler } from './scheduler.js'

const app = express()
const PORT = process.env.PORT ?? 3003

app.use(cors({ origin: '*' }))
app.use(express.json())

app.use('/api', authRouter)
app.get('/api/push/vapid-public-key', (_req, res) => res.json({ key: process.env.VAPID_PUBLIC_KEY }))
app.use('/api', requireAuth, dataRouter)
app.use('/api', requireAuth, pushRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

await initDb()
startScheduler()
app.listen(PORT, () => console.log(`SPORA server listening on :${PORT}`))

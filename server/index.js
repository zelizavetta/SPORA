import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb } from './db.js'
import authRouter from './routes/auth.js'
import dataRouter from './routes/data.js'
import { requireAuth } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT ?? 3003

app.use(cors({ origin: '*' }))
app.use(express.json())

app.use('/api', authRouter)
app.use('/api', requireAuth, dataRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

await initDb()
app.listen(PORT, () => console.log(`SPORA server listening on :${PORT}`))

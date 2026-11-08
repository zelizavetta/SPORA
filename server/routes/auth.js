import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', (req, res) => {
  const { password } = req.body ?? {}
  if (!password || password !== process.env.AUTH_PASSWORD) {
    return res.status(401).json({ error: 'Неверный пароль' })
  }
  const token = jwt.sign({ sub: 'spora' }, process.env.JWT_SECRET, { expiresIn: '90d' })
  res.json({ token })
})

export default router

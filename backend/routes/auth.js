// backend/routes/auth.js
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/**
 * POST /api/auth/login
 * Body: { userId: "WM@123", pin: "1234" }
 * Returns: { token, user: { userId, name, role } }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { userId, pin } = req.body

    if (!userId || !pin) {
      return res.status(400).json({ error: 'User ID and PIN are required.' })
    }

    const user = await User.findOne({ userId: userId.trim() })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Check your User ID.' })
    }

    const pinMatch = await user.verifyPin(String(pin))
    if (!pinMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Check your PIN.' })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    const token = jwt.sign(
      { userId: user.userId, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin,
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/auth/me
 * Returns current user info from token
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('-pin')
    if (!user) return res.status(404).json({ error: 'User not found.' })
    res.json({ user: { userId: user.userId, name: user.name, role: user.role, lastLogin: user.lastLogin } })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/logout
 * Client should discard the token. Returns confirmation.
 */
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully.' })
})

export default router

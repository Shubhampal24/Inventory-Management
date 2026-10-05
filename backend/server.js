// backend/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { connectDB } from './db/connection.js'
import { errorHandler } from './middleware/errorHandler.js'

// Route imports
import authRoutes      from './routes/auth.js'
import rackRoutes      from './routes/racks.js'
import materialRoutes  from './routes/materials.js'
import locationRoutes  from './routes/locations.js'
import movementRoutes  from './routes/movements.js'

const app = express()
const PORT = process.env.PORT || 5001

// ── Security middleware ──
app.use(helmet())
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Rate limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 500,                    // per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
})
app.use(limiter)

// Stricter rate limit on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
})

// ── Body parsing ──
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RackOS API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// ── Routes ──
app.use('/api/auth',      authLimiter, authRoutes)
app.use('/api/racks',     rackRoutes)
app.use('/api/materials', materialRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/movements', movementRoutes)

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` })
})

// ── Global error handler ──
app.use(errorHandler)

// ── Start ──
async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀 RackOS API running on http://localhost:${PORT}`)
    console.log(`📋 Health: http://localhost:${PORT}/api/health`)
  })
}

start()

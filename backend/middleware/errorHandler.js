// backend/middleware/errorHandler.js

export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ error: 'Validation failed', details: messages })
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field'
    return res.status(409).json({ error: `Duplicate value: ${field} already exists.` })
  }

  // Cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for field: ${err.path}` })
  }

  // Default internal error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
}

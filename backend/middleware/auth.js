// backend/middleware/auth.js
import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' })
  }
  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded   // { userId, name, role }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' })
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' })
    }
    next()
  }
}

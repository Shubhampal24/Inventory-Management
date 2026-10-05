import { Router } from 'express'
import Movement from '../models/Movement.js'
import Location from '../models/Location.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/movements
 * Optional query: ?materialId=MAT001&locationId=R01-B01-GL1-A&type=IN&from=2024-01-01&to=2024-12-31
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { materialId, locationId, type, from, to } = req.query
    const filter = {}

    if (materialId) filter.materialId = materialId.toUpperCase()
    if (locationId) filter.locationId = locationId
    if (type && ['IN', 'OUT'].includes(type)) filter.type = type
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = from
      if (to) filter.date.$lte = to
    }

    const movements = await Movement.find(filter).sort({ date: -1, createdAt: -1 }).lean()
    res.json(movements)
  } catch (err) { next(err) }
})

/**
 * POST /api/movements
 * Body: { id, date, materialId, locationId, type, quantity, unit, reference, user, notes }
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { id, date, materialId, locationId, type, quantity, unit, reference, user, notes } = req.body

    // Validations
    if (!materialId || !locationId || !type || quantity === undefined) {
      return res.status(400).json({ error: 'materialId, locationId, type, and quantity are all required.' })
    }
    if (!['IN', 'OUT'].includes(type)) {
      return res.status(400).json({ error: 'type must be "IN" or "OUT".' })
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0.' })
    }

    // Clean materialId (strip display suffix like " - Description")
    const rawId = (materialId || '').trim()
    const cleanId = rawId.includes(' - ')
      ? rawId.split(' - ')[0].trim()
      : rawId.includes(' (')
      ? rawId.split(' (')[0].trim()
      : rawId

    const movement = new Movement({
      id: id || `MOV${Date.now()}`,
      date: date || new Date().toISOString().slice(0, 10),
      materialId: cleanId.toUpperCase(),
      locationId,
      type,
      quantity: Number(quantity),
      unit: unit || 'PCS',
      reference: reference || '',
      user: user || req.user?.name || 'Warehouse Manager',
      notes: notes || '',
    })

    await movement.save()
    res.status(201).json(movement)
  } catch (err) { next(err) }
})

/**
 * POST /api/movements/transfer
 * Body: { materialId, fromLocationId, toLocationId, quantity, user, date }
 */
router.post('/transfer', requireAuth, async (req, res, next) => {
  try {
    const { materialId, fromLocationId, toLocationId, quantity, user, date } = req.body

    if (!materialId || !fromLocationId || !toLocationId || !quantity) {
      return res.status(400).json({ error: 'materialId, fromLocationId, toLocationId, quantity are required.' })
    }

    const qty = Number(quantity)
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be > 0' })

    const rawId = (materialId || '').trim()
    const cleanId = rawId.includes(' - ') ? rawId.split(' - ')[0].trim() : rawId.includes(' (') ? rawId.split(' (')[0].trim() : rawId

    // 1. Check stock at fromLocationId
    const [stockRes] = await Movement.aggregate([
      { $match: { locationId: fromLocationId, materialId: cleanId } },
      { $group: {
          _id: null,
          totalIn: { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$quantity', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0] } }
      }}
    ])
    
    const currentStock = stockRes ? stockRes.totalIn - stockRes.totalOut : 0
    if (currentStock < qty) {
      return res.status(400).json({ error: `Insufficient stock at ${fromLocationId}. Available: ${currentStock}` })
    }

    // 2. Check destination location
    const toLoc = await Location.findOne({ locationId: toLocationId })
    if (!toLoc) {
      return res.status(404).json({ error: `Destination location ${toLocationId} not found.` })
    }

    if (toLoc.materialId && toLoc.materialId !== cleanId) {
      return res.status(400).json({ error: `Destination occupied by a different material (${toLoc.materialId}). Use SWAP instead.` })
    }

    // 3. Auto-assign if empty
    if (!toLoc.materialId) {
      toLoc.materialId = cleanId
      await toLoc.save()
    }

    const baseData = {
      date: date || new Date().toISOString().slice(0, 10),
      materialId: cleanId,
      quantity: qty,
      unit: 'PCS', // fallback
      user: user || req.user?.name || 'Warehouse Manager',
      reference: 'TRANSFER',
      notes: `Transfer from ${fromLocationId} to ${toLocationId}`
    }

    // 4. Create movements
    const movOut = new Movement({ ...baseData, id: `TRX-OUT-${Date.now()}`, locationId: fromLocationId, type: 'OUT' })
    const movIn = new Movement({ ...baseData, id: `TRX-IN-${Date.now()}`, locationId: toLocationId, type: 'IN' })

    await movOut.save()
    await movIn.save()

    res.json({ message: 'Transfer successful', out: movOut, in: movIn })
  } catch (err) { next(err) }
})

/**
 * POST /api/movements/swap
 * Body: { locationA, locationB, user, date }
 */
router.post('/swap', requireAuth, async (req, res, next) => {
  try {
    const { locationA, locationB, user, date } = req.body
    if (!locationA || !locationB) return res.status(400).json({ error: 'locationA and locationB are required.' })

    const locA = await Location.findOne({ locationId: locationA })
    const locB = await Location.findOne({ locationId: locationB })

    if (!locA || !locB) return res.status(404).json({ error: 'One or both locations not found.' })
    if (!locA.materialId && !locB.materialId) return res.status(400).json({ error: 'At least one location must be assigned to a material to swap.' })

    const matA = locA.materialId
    const matB = locB.materialId

    // 1. Swap DB Assignments (can be empty string if one was unassigned)
    locA.materialId = matB || ""
    locB.materialId = matA || ""
    await locA.save()
    await locB.save()

    // 2. Update existing movements to reflect the new location
    // We update all movements for matA in locationA to point to locationB
    if (matA) {
      await Movement.updateMany(
        { materialId: matA, locationId: locationA },
        { $set: { locationId: locationB } }
      )
    }

    // We update all movements for matB in locationB to point to locationA
    if (matB) {
      await Movement.updateMany(
        { materialId: matB, locationId: locationB },
        { $set: { locationId: locationA } }
      )
    }

    res.json({ message: 'Swap successful' })
  } catch (err) { next(err) }
})

/**
 * DELETE /api/movements/:id
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await Movement.findOneAndDelete({ id: req.params.id })
    if (!deleted) return res.status(404).json({ error: `Movement ${req.params.id} not found.` })
    res.json({ message: `Movement ${req.params.id} deleted.` })
  } catch (err) { next(err) }
})

/**
 * GET /api/movements/stats
 * Returns aggregate summary: total IN, total OUT, total count
 */
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const [result] = await Movement.aggregate([
      {
        $group: {
          _id: null,
          totalIn:  { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$quantity', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0] } },
          count:    { $sum: 1 }
        }
      }
    ])
    res.json(result || { totalIn: 0, totalOut: 0, count: 0 })
  } catch (err) { next(err) }
})

export default router

// backend/routes/locations.js
import { Router } from 'express'
import Location from '../models/Location.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function computeLocationId(rack, bay, level, slot) {
  if (!rack || !bay || !level || !slot) return ''
  return `${rack}-B${String(bay).padStart(2, '0')}-${level}-${slot}`
}

/**
 * GET /api/locations
 * Returns all locations (raw base data — derived fields computed in frontend)
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rack } = req.query
    const filter = rack ? { rack: rack.toUpperCase() } : {}
    const locations = await Location.find(filter).sort({ rack: 1, bay: 1, level: 1, slot: 1 }).lean()
    res.json(locations)
  } catch (err) { next(err) }
})

/**
 * POST /api/locations
 * Manually add a single location
 * Body: { rack, bay, level, slot, materialId, batch, notes }
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { rack, bay, level, slot, materialId, batch, notes } = req.body

    if (!rack || !bay || !level || !slot) {
      return res.status(400).json({ error: 'Rack, Bay, Level, and Slot are all required.' })
    }

    const locationId = computeLocationId(rack.toUpperCase(), bay, level.toUpperCase(), slot.toUpperCase())

    const existing = await Location.findOne({ locationId })
    if (existing) {
      return res.status(409).json({ error: `Location ${locationId} already exists.` })
    }

    const location = new Location({
      rack: rack.toUpperCase(),
      bay: Number(bay),
      level: level.toUpperCase(),
      slot: slot.toUpperCase(),
      locationId,
      materialId: materialId || '',
      batch: batch || '',
      notes: notes || '',
    })

    await location.save()
    res.status(201).json(location)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/locations/:locationId/assign
 * Assign or unassign a material to a location
 * Body: { materialId }  (empty string to unassign)
 */
router.patch('/:locationId/assign', requireAuth, async (req, res, next) => {
  try {
    const { locationId } = req.params
    const { materialId } = req.body

    const location = await Location.findOne({ locationId })
    if (!location) return res.status(404).json({ error: `Location ${locationId} not found.` })

    // If changing the assigned material, ensure there is no stock of the OLD material left
    if (location.materialId && location.materialId !== materialId) {
      const Movement = (await import('../models/Movement.js')).default
      const [stockRes] = await Movement.aggregate([
        { $match: { locationId, materialId: location.materialId } },
        { $group: {
            _id: null,
            totalStock: { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$quantity', { $multiply: ['$quantity', -1] }] } }
        }}
      ])
      const currentStock = stockRes ? stockRes.totalStock : 0
      if (currentStock > 0) {
        return res.status(400).json({ error: `Cannot change assignment. Location still holds ${currentStock} units of ${location.materialId}.` })
      }
    }

    location.materialId = materialId || ''
    await location.save()
    res.json(location)
  } catch (err) { next(err) }
})

/**
 * PUT /api/locations/:locationId
 * Update notes/batch for a location
 */
router.put('/:locationId', requireAuth, async (req, res, next) => {
  try {
    const { locationId } = req.params
    const { batch, notes, materialId } = req.body

    const location = await Location.findOne({ locationId })
    if (!location) return res.status(404).json({ error: `Location ${locationId} not found.` })

    if (batch !== undefined) location.batch = batch
    if (notes !== undefined) location.notes = notes
    if (materialId !== undefined) location.materialId = materialId

    await location.save()
    res.json(location)
  } catch (err) { next(err) }
})

/**
 * DELETE /api/locations/:locationId
 * Only if unassigned
 */
router.delete('/:locationId', requireAuth, async (req, res, next) => {
  try {
    const { locationId } = req.params
    const location = await Location.findOne({ locationId })
    if (!location) return res.status(404).json({ error: `Location ${locationId} not found.` })

    if (location.materialId) {
      return res.status(400).json({ error: 'Cannot delete an assigned location. Unassign the material first.' })
    }

    await Location.deleteOne({ locationId })
    res.json({ message: `Location ${locationId} deleted.` })
  } catch (err) { next(err) }
})

export default router

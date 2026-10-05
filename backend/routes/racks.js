// backend/routes/racks.js
import { Router } from 'express'
import Rack from '../models/Rack.js'
import Location from '../models/Location.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/** Helper: compute locationId like the Excel formula */
function computeLocationId(rack, bay, level, slot) {
  if (!rack || !bay || !level || !slot) return ''
  return `${rack}-B${String(bay).padStart(2, '0')}-${level}-${slot}`
}

/** Helper: generate all locations for a rack config */
function generateLocations(rackId, bayCount, levels, slots) {
  const locs = []
  for (let bay = 1; bay <= bayCount; bay++) {
    for (const level of levels) {
      if (!level) continue
      for (const slot of slots) {
        if (!slot) continue
        const locationId = computeLocationId(rackId, bay, level, slot)
        locs.push({ rack: rackId, bay, level, slot, locationId })
      }
    }
  }
  return locs
}

/**
 * GET /api/racks
 * Returns all racks
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const racks = await Rack.find().sort({ id: 1 }).lean()
    res.json(racks)
  } catch (err) { next(err) }
})

/**
 * POST /api/racks
 * Body: { id, type, description, bayCount, levels, slots, side, notes }
 * Also auto-generates location entries
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { id, type, description, bayCount, levels, slots, side, notes } = req.body

    if (!id) return res.status(400).json({ error: 'Rack ID is required.' })

    // Normalize arrays
    const levelsArr = Array.isArray(levels)
      ? levels.map(l => l.trim()).filter(Boolean)
      : (levels || '').split(',').map(l => l.trim()).filter(Boolean)

    const slotsArr = Array.isArray(slots)
      ? slots.map(s => s.trim()).filter(Boolean)
      : (slots || 'A').split(',').map(s => s.trim()).filter(Boolean)

    const rack = new Rack({
      id: id.toUpperCase(),
      type: type || 'Pallet Rack',
      description: description || '',
      bayCount: Number(bayCount) || 1,
      levels: levelsArr,
      slots: slotsArr,
      side: side || 'Single-sided',
      notes: notes || '',
    })

    await rack.save()

    // Auto-generate locations
    const locDocs = generateLocations(rack.id, rack.bayCount, levelsArr, slotsArr)
    if (locDocs.length > 0) {
      // insertMany with ordered:false skips duplicates without failing
      await Location.insertMany(
        locDocs.map(l => ({ ...l, materialId: '', batch: '', notes: '' })),
        { ordered: false }
      ).catch(() => {}) // ignore duplicate key errors (locations already exist)
    }

    res.status(201).json(rack)
  } catch (err) { next(err) }
})

/**
 * PUT /api/racks/:id
 * Updates rack and prunes/expands locations to match new bounds
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { description, type, bayCount, levels, slots, side, status, notes } = req.body
    const rackId = req.params.id.toUpperCase()

    const rack = await Rack.findOne({ id: rackId })
    if (!rack) return res.status(404).json({ error: `Rack ${rackId} not found.` })

    // Normalize arrays
    const levelsArr = levels
      ? (Array.isArray(levels) ? levels : (levels || '').split(',')).map(l => l.trim()).filter(Boolean)
      : rack.levels

    const slotsArr = slots
      ? (Array.isArray(slots) ? slots : (slots || '').split(',')).map(s => s.trim()).filter(Boolean)
      : rack.slots

    const newBayCount = bayCount !== undefined ? Number(bayCount) : rack.bayCount

    // Validate bay count - cannot shrink below max occupied bay
    const occupiedLocations = await Location.find({
      rack: rackId,
      materialId: { $ne: '' }
    })
    const maxOccupiedBay = occupiedLocations.reduce((m, l) => Math.max(m, l.bay), 0)
    if (newBayCount < maxOccupiedBay) {
      return res.status(400).json({
        error: `Cannot reduce bays below ${maxOccupiedBay}. Bay ${maxOccupiedBay} has assigned materials.`
      })
    }

    // Update rack
    rack.description = description !== undefined ? description : rack.description
    rack.type = type !== undefined ? type : rack.type
    rack.bayCount = newBayCount
    rack.levels = levelsArr
    rack.slots = slotsArr
    rack.side = side !== undefined ? side : rack.side
    rack.status = status !== undefined ? status : rack.status
    rack.notes = notes !== undefined ? notes : rack.notes
    await rack.save()

    // Prune empty locations that fall outside new bounds
    await Location.deleteMany({
      rack: rackId,
      materialId: '',  // only prune unassigned
      $or: [
        { bay: { $gt: newBayCount } },
        { level: { $nin: levelsArr } },
        { slot: { $nin: slotsArr } },
      ]
    })

    // Generate missing locations within new bounds
    const newLocs = generateLocations(rackId, newBayCount, levelsArr, slotsArr)
    if (newLocs.length > 0) {
      await Location.insertMany(
        newLocs.map(l => ({ ...l, materialId: '', batch: '', notes: '' })),
        { ordered: false }
      ).catch(() => {})
    }

    res.json(rack)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/racks/:id/status
 * Toggle Active/Inactive
 */
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const rackId = req.params.id.toUpperCase()
    const rack = await Rack.findOne({ id: rackId })
    if (!rack) return res.status(404).json({ error: `Rack ${rackId} not found.` })

    rack.status = rack.status === 'Active' ? 'Inactive' : 'Active'
    await rack.save()
    res.json(rack)
  } catch (err) { next(err) }
})

/**
 * DELETE /api/racks/:id
 * Only if no assigned locations
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const rackId = req.params.id.toUpperCase()
    const assigned = await Location.findOne({ rack: rackId, materialId: { $ne: '' } })
    if (assigned) {
      return res.status(400).json({ error: 'Cannot delete rack with assigned materials. Unassign first.' })
    }
    await Rack.deleteOne({ id: rackId })
    await Location.deleteMany({ rack: rackId })
    res.json({ message: `Rack ${rackId} and all its locations deleted.` })
  } catch (err) { next(err) }
})

export default router

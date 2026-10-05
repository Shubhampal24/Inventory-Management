/**
 * useWarehouseStore.js
 * 
 * Backend-connected version.
 * Raw data is now loaded FROM the API and mutations go THROUGH the API.
 * All formula/derived logic remains identical (computeDerivedData).
 * 
 * FORMULA REPLICATIONS:
 * ─────────────────────────────────────────────────────────────────────
 * 1. LOCATION ID: rack + "-B" + String(bay).padStart(2,"0") + "-" + level + "-" + slot
 * 2. LOCATION QUANTITY: SUM(IN) - SUM(OUT) for locationId from movements
 * 3. LOCATION STATUS: qty > 0 ? "Occupied" : materialId ? "Allocated" : "Available"
 * 4-13. See computeDerivedData function comments
 * ─────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand'
import { rackService, materialService, locationService, movementService } from '../api/apiService.js'

// ─── Pure formula functions (unchanged from before) ──────────────────────────

export const computeLocationId = (rack, bay, level, slot) => {
  if (!rack || !bay || !level || !slot) return ''
  return `${rack}-B${String(bay).padStart(2, '0')}-${level}-${slot}`
}

export const computeLocationQty = (movements, locationId) => {
  if (!locationId) return 0
  return movements
    .filter(m => m.locationId === locationId)
    .reduce((sum, m) => sum + (m.type === 'IN' ? m.quantity : -m.quantity), 0)
}

export const computeLocationStatus = (quantity, materialId) => {
  if (quantity > 0) return 'Occupied'
  if (materialId)   return 'Allocated'
  return 'Available'
}

export const computeStockIn = (movements, materialId, locationId) =>
  movements
    .filter(m => m.materialId === materialId && m.locationId === locationId && m.type === 'IN')
    .reduce((sum, m) => sum + m.quantity, 0)

export const computeStockOut = (movements, materialId, locationId) =>
  movements
    .filter(m => m.materialId === materialId && m.locationId === locationId && m.type === 'OUT')
    .reduce((sum, m) => sum + m.quantity, 0)

export const computeCurrentStock = (openingStock, stockIn, stockOut) =>
  (openingStock || 0) + stockIn - stockOut

export const computeStockStatus = (currentStock, reorderLevel) => {
  if (currentStock <= 0) return 'EMPTY'
  if (currentStock <= reorderLevel) return 'REORDER'
  return 'OK'
}

export const findLocationForMaterial = (locations, materialId) => {
  const loc = locations.find(l => l.materialId === materialId)
  return loc?.locationId || ''
}

// ─── Derived data computer (identical to original) ────────────────────────────

export function computeDerivedData(locationMasterBase, materialMasterBase, movements) {
  if (!locationMasterBase || !materialMasterBase || !movements) {
    return { locations: [], inventory: [], rackLabels: [], enrichedMovements: [], materialMap: {}, locationByLocId: {}, locationByMatId: {} }
  }

  const materialMap = {}
  materialMasterBase.forEach(m => {
    materialMap[m.id] = m
    materialMap[m.name || m.description] = m
  })

  const locations = locationMasterBase.map(loc => {
    const locationId = loc.locationId || computeLocationId(loc.rack, loc.bay, loc.level, loc.slot)
    const quantity   = computeLocationQty(movements, locationId)
    const rawMaterialId = loc.materialId || ''
    const materialId = rawMaterialId.includes(' (') ? rawMaterialId.split(' (')[0] : rawMaterialId
    const status     = computeLocationStatus(quantity, materialId)
    const mat        = materialMap[materialId] || materialMap[rawMaterialId] || null
    const materialDesc = mat ? (mat.name || mat.description) : ''
    const category   = mat?.category || ''
    const unit       = mat?.unit || ''
    return { ...loc, locationId, materialId, materialDesc, category, unit, quantity, status }
  })

  const locationByLocId = {}
  const locationByMatId = {}
  locations.forEach(l => {
    locationByLocId[l.locationId] = l
    if (l.materialId) locationByMatId[l.materialId] = l
  })

  const inventoryMap = {}
  movements.forEach(m => {
    const key = `${m.materialId}::${m.locationId}`
    if (!inventoryMap[key]) inventoryMap[key] = { materialId: m.materialId, locationId: m.locationId, openingStock: 0 }
  })
  locations.forEach(l => {
    if (l.materialId) {
      const key = `${l.materialId}::${l.locationId}`
      if (!inventoryMap[key]) inventoryMap[key] = { materialId: l.materialId, locationId: l.locationId, openingStock: 0 }
    }
  })

  const inventory = Object.values(inventoryMap).map(item => {
    const { materialId, locationId, openingStock } = item
    const mat          = materialMap[materialId]
    const materialDesc = mat ? (mat.name || mat.description) : ''
    const category     = mat?.category || ''
    const unit         = mat?.unit || ''
    const reorderLevel = mat?.reorderLevel || 0
    const stockIn      = computeStockIn(movements, materialId, locationId)
    const stockOut     = computeStockOut(movements, materialId, locationId)
    const currentStock = computeCurrentStock(openingStock, stockIn, stockOut)
    const status       = computeStockStatus(currentStock, reorderLevel)
    return { materialId, materialDesc, category, locationId, openingStock, stockIn, stockOut, currentStock, unit, reorderLevel, status }
  }).filter(i => i.materialId && (i.currentStock > 0 || locationByLocId[i.locationId]?.materialId === i.materialId))

  const rackLabels = locations
    .filter(l => l.locationId)
    .map(l => ({ locationId: l.locationId, rack: l.rack, bay: l.bay, level: l.level, slot: l.slot, materialDesc: l.materialDesc, category: l.category, printStatus: 'READY' }))

  const enrichedMovements = movements.map(m => {
    const mat = materialMap[m.materialId]
    return {
      ...m,
      materialDesc: mat ? (mat.name || mat.description) : (m.materialDesc || ''),
      unit: mat?.unit || m.unit || '',
      locationId: m.locationId || findLocationForMaterial(locations, m.materialId),
    }
  })

  return { locations, inventory, rackLabels, enrichedMovements, materialMap, locationByLocId, locationByMatId }
}

// ─── Zustand Store ───────────────────────────────────────────────────────────

const useWarehouseStore = create((set, get) => ({
  // ── Raw base data ──
  locationMasterBase: [],
  materialMasterBase: [],
  movements: [],
  racks: [],

  // ── Derived/computed data ──
  locations: [],
  inventory: [],
  rackLabels: [],
  enrichedMovements: [],

  // ── UI State ──
  currentUser: 'Warehouse Manager',
  selectedRack: null,
  commandOpen: false,
  isLoading: false,
  apiError: null,

  // ─── INTERNAL: Recompute derived data ─────────────────────────────────
  _recompute: () => {
    const { locationMasterBase, materialMasterBase, movements } = get()
    const derived = computeDerivedData(locationMasterBase || [], materialMasterBase || [], movements || [])
    set({
      locations:        derived.locations || [],
      inventory:        derived.inventory || [],
      rackLabels:       derived.rackLabels || [],
      enrichedMovements: derived.enrichedMovements || [],
    })
  },

  // ─── LOAD ALL DATA FROM BACKEND ───────────────────────────────────────
  loadAll: async () => {
    set({ isLoading: true, apiError: null })
    try {
      const [racks, materials, locations, movements] = await Promise.all([
        rackService.getAll(),
        materialService.getAll(),
        locationService.getAll(),
        movementService.getAll(),
      ])
      set({
        racks:               racks || [],
        materialMasterBase:  materials || [],
        locationMasterBase:  locations || [],
        movements:           movements || [],
        selectedRack:        (racks && racks.length > 0) ? racks[0].id : null,
      })
      get()._recompute()
    } catch (err) {
      set({ apiError: err.message })
      console.error('[Store] loadAll failed:', err.message)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── STOCK MOVEMENT ACTIONS ───────────────────────────────────────────

  transferStock: async (payload) => {
    await movementService.transfer(payload)
    await get().loadAll() // reload to ensure locations and movements are fully synced
  },

  swapLocations: async (payload) => {
    await movementService.swap(payload)
    await get().loadAll() // reload to ensure locations and movements are fully synced
  },

  addMovement: async (movement) => {
    const rawId = (movement.materialId || '').trim()
    const cleanId = rawId.includes(' - ') ? rawId.split(' - ')[0].trim()
      : rawId.includes(' (') ? rawId.split(' (')[0].trim() : rawId
    const payload = {
      ...movement,
      materialId: cleanId,
      id: `MOV${Date.now()}`,
      date: movement.date || new Date().toISOString().slice(0, 10),
    }
    const newMov = await movementService.create(payload)
    set(state => ({ movements: [...state.movements, newMov] }))
    get()._recompute()
  },

  deleteMovement: async (id) => {
    await movementService.delete(id)
    set(state => ({ movements: state.movements.filter(m => m.id !== id) }))
    get()._recompute()
  },

  // ─── MATERIAL MASTER ACTIONS ──────────────────────────────────────────

  addMaterial: async (material) => {
    const newMat = await materialService.create(material)
    set(state => ({ materialMasterBase: [...state.materialMasterBase, newMat] }))
    get()._recompute()
  },

  updateMaterial: async (id, updates) => {
    const updated = await materialService.update(id, updates)
    set(state => ({
      materialMasterBase: state.materialMasterBase.map(m => m.id === id ? { ...m, ...updated } : m)
    }))
    get()._recompute()
  },

  deleteMaterial: async (id) => {
    await materialService.delete(id)
    set(state => ({
      materialMasterBase: state.materialMasterBase.filter(m => m.id !== id)
    }))
    get()._recompute()
  },

  // ─── LOCATION MASTER ACTIONS ──────────────────────────────────────────

  assignMaterial: async (locationId, materialId) => {
    await locationService.assign(locationId, materialId)
    set(state => ({
      locationMasterBase: state.locationMasterBase.map(l =>
        l.locationId === locationId ? { ...l, materialId } : l
      )
    }))
    get()._recompute()
  },

  unassignMaterial: async (locationId) => {
    await locationService.unassign(locationId)
    set(state => ({
      locationMasterBase: state.locationMasterBase.map(l =>
        l.locationId === locationId ? { ...l, materialId: '' } : l
      )
    }))
    get()._recompute()
  },

  addLocation: async (rack, bay, level, slot, materialId = '', batch = '', notes = '') => {
    const locationId = computeLocationId(rack, bay, level, slot)
    if (!locationId) return
    const newLoc = await locationService.create({ rack, bay, level, slot, locationId, materialId, batch, notes })
    set(state => ({ locationMasterBase: [...state.locationMasterBase, newLoc] }))
    get()._recompute()
  },

  updateLocation: async (locationId, updates) => {
    await locationService.update(locationId, updates)
    set(state => ({
      locationMasterBase: state.locationMasterBase.map(l =>
        l.locationId === locationId ? { ...l, ...updates } : l
      )
    }))
    get()._recompute()
  },

  // ─── RACK ACTIONS ─────────────────────────────────────────────────────

  addRack: async (rack) => {
    const levelsArr = Array.isArray(rack.levels) ? rack.levels : (rack.levels || '').split(',').map(s => s.trim())
    const slotsArr  = Array.isArray(rack.slots)  ? rack.slots  : (rack.slots  || 'A').split(',').map(s => s.trim())
    const newRack = await rackService.create({ ...rack, levels: levelsArr, slots: slotsArr })
    // Reload all locations (backend auto-generated them)
    const locations = await locationService.getAll()
    set(state => ({
      racks: [...state.racks, newRack],
      locationMasterBase: locations || [],
    }))
    get()._recompute()
  },

  updateRack: async (id, updates) => {
    const levelsArr = updates.levels
      ? (Array.isArray(updates.levels) ? updates.levels : updates.levels.split(',').map(s => s.trim()))
      : undefined
    const slotsArr  = updates.slots
      ? (Array.isArray(updates.slots)  ? updates.slots  : updates.slots.split(',').map(s => s.trim()))
      : undefined
    const payload = { ...updates }
    if (levelsArr) payload.levels = levelsArr
    if (slotsArr)  payload.slots  = slotsArr
    const updatedRack = await rackService.update(id, payload)
    // Reload locations (backend pruned/expanded them)
    const locations = await locationService.getAll()
    set(state => ({
      racks: state.racks.map(r => r.id === id ? { ...r, ...updatedRack } : r),
      locationMasterBase: locations || [],
    }))
    get()._recompute()
  },

  toggleRackStatus: async (id, currentStatus) => {
    const updated = await rackService.toggleStatus(id)
    set(state => ({
      racks: state.racks.map(r => r.id === id ? { ...r, status: updated.status } : r)
    }))
  },

  // ─── UI ACTIONS ────────────────────────────────────────────────────────

  theme: (typeof window !== 'undefined' && localStorage.getItem('warehouse-theme')) || 'dark',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.documentElement.classList.toggle('light', next === 'light')
      localStorage.setItem('warehouse-theme', next)
    }
    set({ theme: next })
  },
  setTheme: (next) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.documentElement.classList.toggle('light', next === 'light')
      localStorage.setItem('warehouse-theme', next)
    }
    set({ theme: next })
  },
  setCurrentUser: (name) => set({ currentUser: name }),
  setSelectedRack: (rackId) => set({ selectedRack: rackId }),
  setCommandOpen: (open) => set({ commandOpen: open }),

  // ─── GETTERS ──────────────────────────────────────────────────────────

  getInventoryStats: () => {
    const inv  = get().inventory  || []
    const locs = get().locations  || []
    const movs = get().movements  || []
    const today = new Date().toISOString().slice(0, 10)
    return {
      totalMaterials:     inv.length,
      totalLocations:     locs.length,
      occupiedLocations:  locs.filter(l => l.status === 'Occupied').length,
      availableLocations: locs.filter(l => l.status === 'Available').length,
      reorderAlerts:      inv.filter(i => i.status === 'REORDER').length,
      emptyAlerts:        inv.filter(i => i.status === 'EMPTY').length,
      todayMovements:     movs.filter(m => m.date === today).length,
      totalIn:            movs.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
      totalOut:           movs.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
    }
  },

  getLocationsForRack: (rackId) =>
    (get().locations || []).filter(l => l.rack === rackId),

  getMovementsForMaterial: (materialId) =>
    (get().enrichedMovements || []).filter(m => m.materialId === materialId),

  getInventoryForMaterial: (materialId) =>
    (get().inventory || []).find(i => i.materialId === materialId) || null,

  getRackCellState: (locationId) => {
    const invItem = (get().inventory || []).find(i => i.locationId === locationId)
    const loc     = (get().locations || []).find(l => l.locationId === locationId)
    if (!loc) return 'unassigned'
    if (!invItem || invItem.currentStock <= 0) {
      if (loc.materialId) return 'allocated'
      return 'available'
    }
    if (invItem.status === 'REORDER')   return 'reorder'
    if (invItem.status === 'EMPTY')     return 'empty-crit'
    return 'occupied'
  },

  getCategoryStats: () => {
    const catMap = {}
    ;(get().inventory || []).forEach(item => {
      const cat = item.category || 'Unknown'
      if (!catMap[cat]) catMap[cat] = { category: cat, count: 0, totalStock: 0 }
      catMap[cat].count++
      catMap[cat].totalStock += item.currentStock
    })
    return Object.values(catMap)
  },

  getMovementTrend: () => {
    const movements = get().movements || []
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayMovs = movements.filter(m => m.date === dateStr)
      days.push({
        date:  dateStr,
        label: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
        in:    dayMovs.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
        out:   dayMovs.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
      })
    }
    return days
  },
}))

export default useWarehouseStore

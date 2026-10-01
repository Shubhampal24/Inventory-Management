/**
 * useWarehouseStore.js
 * 
 * This Zustand store replicates ALL Excel formula logic from the workbook:
 * 
 * FORMULA REPLICATIONS:
 * ─────────────────────────────────────────────────────────────────────
 * 1. LOCATION ID (Location Master col E):
 *    Excel: =IF(COUNTA(A2:D2)=0,"",A2&"-"&"B"&TEXT(B2,"00")&"-"&C2&"-"&D2)
 *    JS:    rack + "-B" + String(bay).padStart(2,"0") + "-" + level + "-" + slot
 *
 * 2. LOCATION QUANTITY (Location Master col J):
 *    Excel: =SUMIFS(StockMov.Qty, StockMov.LocID, locID, StockMov.Type,"IN")
 *           - SUMIFS(StockMov.Qty, StockMov.LocID, locID, StockMov.Type,"OUT")
 *    JS:    movements.filter(m=>m.locationId===locId && m.type==="IN").sum
 *           - movements.filter(m=>m.locationId===locId && m.type==="OUT").sum
 *
 * 3. LOCATION STATUS (Location Master col F):
 *    Excel: =IF(E2="","",IF(J2>0,"Occupied","Available"))
 *    JS:    quantity > 0 ? "Occupied" : "Available"
 *
 * 4. MATERIAL DESC in Location (Location Master col H - Array Formula):
 *    Excel: INDEX(MatMaster.Desc, MATCH(G2, MatMaster.ColF, 0))
 *           where Col F = "MATXXX (Description)" format
 *    JS:    materialId ends with or startsWith — find in materials by id
 *
 * 5. INVENTORY: Material Description (Inventory col B):
 *    Excel: =VLOOKUP(A2, MaterialMaster.A:E, 2, FALSE)
 *    JS:    materials.find(m=>m.id===materialId)?.description
 *
 * 6. INVENTORY: Category (Inventory col C):
 *    Excel: =VLOOKUP(A2, MaterialMaster.A:E, 3, FALSE)
 *    JS:    materials.find(m=>m.id===materialId)?.category
 *
 * 7. INVENTORY: Location ID (Inventory col D - Array Formula):
 *    Excel: INDEX(LocMaster.LocID, MATCH(MaterialId, LocMaster.MaterialId, 0))
 *           with fallback: MATCH(A2&" (*", ...) or MATCH(A2&"*", ...)
 *    JS:    locationMaster.find(l=>l.materialId.startsWith(materialId))?.locationId
 *
 * 8. INVENTORY: Stock IN (Inventory col F):
 *    Excel: =SUMIFS(StockMov.Qty, StockMov.MatID, matId, StockMov.LocID, locId, StockMov.Type,"IN")
 *    JS:    movements.filter(m=>m.materialId===matId && m.locationId===locId && m.type==="IN").sum
 *
 * 9. INVENTORY: Stock OUT (Inventory col G):
 *    Excel: =SUMIFS(StockMov.Qty, StockMov.MatID, matId, StockMov.LocID, locId, StockMov.Type,"OUT")
 *    JS:    movements.filter(m=>m.materialId===matId && m.locationId===locId && m.type==="OUT").sum
 *
 * 10. INVENTORY: Current Stock (Inventory col H):
 *     Excel: =E2+F2-G2  (Opening + IN - OUT)
 *     JS:    openingStock + stockIn - stockOut
 *
 * 11. INVENTORY: Unit (Inventory col I):
 *     Excel: =VLOOKUP(A2, MaterialMaster.A:E, 4, FALSE)
 *     JS:    materials.find(m=>m.id===materialId)?.unit
 *
 * 12. INVENTORY: Reorder Level (Inventory col J):
 *     Excel: =VLOOKUP(A2, MaterialMaster.A:E, 5, FALSE)
 *     JS:    materials.find(m=>m.id===materialId)?.reorderLevel
 *
 * 13. INVENTORY: Stock Status (Inventory col K):
 *     Excel: =IF(H2<=J2,"REORDER","OK")
 *     JS:    currentStock <= reorderLevel ? "REORDER" : "OK"
 *
 * 14. MATERIAL MASTER: Material ID (Name) col F:
 *     Excel: =IF(A2="","",A2 & " (" & B2 & ")")
 *     JS:    id + " (" + description + ")"
 *
 * 15. STOCK MOVEMENT: Material Desc (col C):
 *     Excel: =VLOOKUP(B2, MaterialMaster.A:E, 2, FALSE)
 *     JS:    materials.find(m=>m.id===materialId)?.description
 *
 * 16. STOCK MOVEMENT: Unit (col G):
 *     Excel: =VLOOKUP(B2, MaterialMaster.A:E, 4, FALSE)
 *     JS:    materials.find(m=>m.id===materialId)?.unit
 *
 * 17. STOCK MOVEMENT: Location ID (col D - Array Formula):
 *     Excel: INDEX(LocMaster.LocID, MATCH(MaterialId, LocMaster.MatId, 0))
 *     JS:    locationMaster.find(l=>l.materialId.startsWith(materialId))?.locationId
 *
 * 18. RACK LABELS (all derived from Location Master + Inventory):
 *     locationId → lookup Location Master for Rack/Bay/Level/Slot
 *     locationId → lookup Inventory for Material Description + Category
 * ─────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { locations as locationMasterBase } from '../data/locations.js'
import { materials as materialMasterBase } from '../data/materials.js'
import { movements as movementsBase } from '../data/movements.js'
import { racks as racksBase } from '../data/racks.js'

// ─── Pure formula functions (mirroring Excel) ──────────────────────────────

/** Formula 1: Generate Location ID from Rack/Bay/Level/Slot */
export const computeLocationId = (rack, bay, level, slot) => {
  if (!rack || !bay || !level || !slot) return ''
  return `${rack}-B${String(bay).padStart(2, '0')}-${level}-${slot}`
}

/** Formula 2: Compute current stock at a specific location from movements */
export const computeLocationQty = (movements, locationId) => {
  if (!locationId) return 0
  return movements
    .filter(m => m.locationId === locationId)
    .reduce((sum, m) => sum + (m.type === 'IN' ? m.quantity : -m.quantity), 0)
}

/** Formula 3: Location status based on quantity and assignment */
export const computeLocationStatus = (quantity, materialId) => {
  if (quantity > 0) return 'Occupied'
  if (materialId) return 'Allocated' // Assigned to a material but empty stock
  return 'Available' // Completely free
}

/** Formula 8+9: Stock IN and OUT for a material at a location */
export const computeStockIn = (movements, materialId, locationId) =>
  movements
    .filter(m => m.materialId === materialId && m.locationId === locationId && m.type === 'IN')
    .reduce((sum, m) => sum + m.quantity, 0)

export const computeStockOut = (movements, materialId, locationId) =>
  movements
    .filter(m => m.materialId === materialId && m.locationId === locationId && m.type === 'OUT')
    .reduce((sum, m) => sum + m.quantity, 0)

/** Formula 10: Current Stock = Opening + IN - OUT */
export const computeCurrentStock = (openingStock, stockIn, stockOut) =>
  (openingStock || 0) + stockIn - stockOut

/** Formula 13: Stock Status */
export const computeStockStatus = (currentStock, reorderLevel) => {
  if (currentStock <= 0) return 'EMPTY'
  if (currentStock <= reorderLevel) return 'REORDER'
  return 'OK'
}

/** Formula 7/17: Find Location ID for a material (from location master) */
export const findLocationForMaterial = (locations, materialId) => {
  const loc = locations.find(l => l.materialId === materialId)
  return loc?.locationId || ''
}

// ─── Derived data computer ─────────────────────────────────────────────────

/**
 * computeDerivedData:
 * Takes raw base data and movements, returns fully computed derived state.
 * This is the JS equivalent of all Excel SUMIFS + VLOOKUP formulas running together.
 */
export function computeDerivedData(locationMasterBase, materialMasterBase, movements) {
  // Guard against undefined inputs (can happen during persist rehydration)
  if (!locationMasterBase || !materialMasterBase || !movements) {
    return { locations: [], inventory: [], rackLabels: [], enrichedMovements: [], materialMap: {}, locationByLocId: {}, locationByMatId: {} }
  }
  // Build material lookup map (like Excel VLOOKUP range)
  const materialMap = {}
  materialMasterBase.forEach(m => {
    materialMap[m.id] = m
    materialMap[m.name || m.description] = m
  })

  // Compute derived locations (Formula 2, 3, 4, 11)
  const locations = locationMasterBase.map(loc => {
    // Recalculate locationId from base fields (Formula 1)
    const locationId = loc.locationId || computeLocationId(loc.rack, loc.bay, loc.level, loc.slot)

    // Formula 2: quantity = SUMIFS IN - SUMIFS OUT by locationId
    const quantity = computeLocationQty(movements, locationId)

    // Formula 3: status = IF(qty > 0, "Occupied", "Allocated"/"Available")
    const status = computeLocationStatus(quantity, loc.materialId)

    // Resolve materialId (col G is stored as "MAT001 (BUBBLE WRAP)" or just "MAT001")
    const rawMaterialId = loc.materialId || ''
    const materialId = rawMaterialId.includes(' (') ? rawMaterialId.split(' (')[0] : rawMaterialId

    // Formula 4 (Array Formula): desc/category/unit via INDEX-MATCH on material master
    const mat = materialMap[materialId] || materialMap[rawMaterialId] || null
    const materialDesc = mat ? (mat.name || mat.description) : ''
    const category = mat?.category || ''
    const unit = mat?.unit || ''

    return {
      ...loc,
      locationId,
      materialId,
      materialDesc,
      category,
      unit,
      quantity,
      status,
    }
  })

  // Build location lookup map
  const locationByLocId = {}
  const locationByMatId = {}
  locations.forEach(l => {
    locationByLocId[l.locationId] = l
    if (l.materialId) locationByMatId[l.materialId] = l
  })

  // Compute inventory rows (like Inventory sheet)
  // The Inventory sheet has materialId as the key — we compute everything from movements
  const inventoryMap = {}

  // Get all unique material+location pairs from movements
  movements.forEach(m => {
    const key = `${m.materialId}::${m.locationId}`
    if (!inventoryMap[key]) {
      inventoryMap[key] = { materialId: m.materialId, locationId: m.locationId, openingStock: 0 }
    }
  })

  // Also include materials that are assigned in location master (even with 0 movements)
  locations.forEach(l => {
    if (l.materialId) {
      const key = `${l.materialId}::${l.locationId}`
      if (!inventoryMap[key]) {
        inventoryMap[key] = { materialId: l.materialId, locationId: l.locationId, openingStock: 0 }
      }
    }
  })

  const inventory = Object.values(inventoryMap).map(item => {
    const { materialId, locationId, openingStock } = item
    const mat = materialMap[materialId]

    // Formula 5: desc via VLOOKUP
    const materialDesc = mat ? (mat.name || mat.description) : ''
    // Formula 6: category via VLOOKUP
    const category = mat?.category || ''
    // Formula 11: unit via VLOOKUP
    const unit = mat?.unit || ''
    // Formula 12: reorderLevel via VLOOKUP
    const reorderLevel = mat?.reorderLevel || 0

    // Formula 8: Stock IN = SUMIFS by materialId + locationId + "IN"
    const stockIn = computeStockIn(movements, materialId, locationId)
    // Formula 9: Stock OUT = SUMIFS by materialId + locationId + "OUT"
    const stockOut = computeStockOut(movements, materialId, locationId)
    // Formula 10: Current = Opening + IN - OUT
    const currentStock = computeCurrentStock(openingStock, stockIn, stockOut)
    // Formula 13: Status = IF(current <= reorder, "REORDER", "OK")
    const status = computeStockStatus(currentStock, reorderLevel)

    return {
      materialId,
      materialDesc,
      category,
      locationId,
      openingStock,
      stockIn,
      stockOut,
      currentStock,
      unit,
      reorderLevel,
      status,
    }
  }).filter(i => i.materialId) // only rows with a material

  // Compute rack labels (Formula 18: derived from Location Master + Inventory)
  const rackLabels = locations
    .filter(l => l.locationId)
    .map(l => ({
      locationId: l.locationId,
      rack: l.rack,
      bay: l.bay,
      level: l.level,
      slot: l.slot,
      materialDesc: l.materialDesc,
      category: l.category,
      printStatus: 'READY',
    }))

  // Enrich movements with computed fields (Formula 15, 16, 17)
  const enrichedMovements = movements.map(m => {
    const mat = materialMap[m.materialId]
    return {
      ...m,
      materialDesc: mat ? (mat.name || mat.description) : (m.materialDesc || ''),
      unit: mat?.unit || m.unit || '',
      // Location ID is already stored; if missing, derive from location master (Formula 17)
      locationId: m.locationId || findLocationForMaterial(locations, m.materialId),
    }
  })

  return { locations, inventory, rackLabels, enrichedMovements, materialMap, locationByLocId, locationByMatId }
}

// ─── Zustand Store ─────────────────────────────────────────────────────────

const useWarehouseStore = create(
  persist(
    (set, get) => {
      // Initial derived state
      const initial = computeDerivedData(locationMasterBase, materialMasterBase, movementsBase)

      return {
        // ── Raw base data (user-editable, persisted) ──
        locationMasterBase: locationMasterBase,
        materialMasterBase: materialMasterBase,
        movements: movementsBase,
        racks: racksBase,

        // ── Computed/derived data (auto-recomputed, NOT persisted) ──
        // Safe defaults [] prevent .filter() crashes during persist rehydration gap
        locations: initial.locations || [],
        inventory: initial.inventory || [],
        rackLabels: initial.rackLabels || [],
        enrichedMovements: initial.enrichedMovements || [],

        // ── UI State ──
        currentUser: 'Warehouse Manager',
        selectedRack: 'R01',
        commandOpen: false,

        // ─── ACTIONS ───────────────────────────────────────────────

        /** Recompute all derived data after any change (like Excel recalculating) */
        _recompute: () => {
          const { locationMasterBase, materialMasterBase, movements } = get()
          const derived = computeDerivedData(
            locationMasterBase || [],
            materialMasterBase || [],
            movements || []
          )
          set({
            locations: derived.locations || [],
            inventory: derived.inventory || [],
            rackLabels: derived.rackLabels || [],
            enrichedMovements: derived.enrichedMovements || [],
          })
        },

        // ─── STOCK MOVEMENT ACTIONS ────────────────────────────────

        /** Add a new Stock Movement (IN or OUT) — triggers full recompute */
        addMovement: (movement) => {
          const newMov = {
            ...movement,
            id: `MOV${Date.now()}`,
            date: movement.date || new Date().toISOString().slice(0, 10),
          }
          set(state => ({ movements: [...state.movements, newMov] }))
          get()._recompute()
        },

        /** Delete a movement */
        deleteMovement: (id) => {
          set(state => ({ movements: state.movements.filter(m => m.id !== id) }))
          get()._recompute()
        },

        // ─── MATERIAL MASTER ACTIONS ───────────────────────────────

        /** Add a new material to Material Master */
        addMaterial: (material) => {
          const newMat = { ...material, id: material.id || `MAT${Date.now()}` }
          set(state => ({ materialMasterBase: [...state.materialMasterBase, newMat] }))
          get()._recompute()
        },

        /** Edit an existing material */
        updateMaterial: (id, updates) => {
          set(state => ({
            materialMasterBase: state.materialMasterBase.map(m => m.id === id ? { ...m, ...updates } : m)
          }))
          get()._recompute()
        },

        /** Delete a material */
        deleteMaterial: (id) => {
          set(state => ({
            materialMasterBase: state.materialMasterBase.filter(m => m.id !== id)
          }))
          get()._recompute()
        },

        // ─── LOCATION MASTER ACTIONS ───────────────────────────────

        /** Assign a material to a location */
        assignMaterial: (locationId, materialId) => {
          set(state => ({
            locationMasterBase: state.locationMasterBase.map(l =>
              l.locationId === locationId ? { ...l, materialId } : l
            )
          }))
          get()._recompute()
        },

        /** Unassign material from a location */
        unassignMaterial: (locationId) => {
          set(state => ({
            locationMasterBase: state.locationMasterBase.map(l =>
              l.locationId === locationId ? { ...l, materialId: '' } : l
            )
          }))
          get()._recompute()
        },

        /** Add a new location */
        addLocation: (rack, bay, level, slot, materialId = '', batch = '', notes = '') => {
          const locationId = computeLocationId(rack, bay, level, slot)
          if (!locationId) return
          set(state => ({
            locationMasterBase: [
              ...state.locationMasterBase,
              { rack, bay, level, slot, locationId, materialId, batch, notes }
            ]
          }))
          get()._recompute()
        },

        /** Update location notes/batch */
        updateLocation: (locationId, updates) => {
          set(state => ({
            locationMasterBase: state.locationMasterBase.map(l =>
              l.locationId === locationId ? { ...l, ...updates } : l
            )
          }))
          get()._recompute()
        },

        // ─── RACK ACTIONS ──────────────────────────────────────────

        addRack: (rack) => {
          set(state => {
            const newRacks = [...state.racks, rack]
            const newLocations = [...state.locationMasterBase]
            const levels = Array.isArray(rack.levels) ? rack.levels : (rack.levels || "").split(",").map(s => s.trim())
            const slots = Array.isArray(rack.slots) ? rack.slots : (rack.slots || "A, B").split(",").map(s => s.trim())
            
            for (let bay = 1; bay <= (rack.bayCount || 1); bay++) {
              for (const level of levels) {
                if (!level) continue
                for (const slot of slots) {
                  if (!slot) continue
                  const locationId = computeLocationId(rack.id, bay, level, slot)
                  if (!newLocations.find(l => l.locationId === locationId)) {
                    newLocations.push({ rack: rack.id, bay, level, slot, locationId, materialId: '', batch: '', notes: '' })
                  }
                }
              }
            }
            return { racks: newRacks, locationMasterBase: newLocations }
          })
          get()._recompute()
        },

        updateRack: (id, updates) => {
          set(state => {
            const newRacks = state.racks.map(r => r.id === id ? { ...r, ...updates } : r)
            let newLocations = [...state.locationMasterBase]
            const rack = newRacks.find(r => r.id === id)
            
            if (rack) {
              const newBayCount = Number(rack.bayCount || 1)
              const levels = Array.isArray(rack.levels) ? rack.levels : (rack.levels || "").split(",").map(s => s.trim())
              const slots = Array.isArray(rack.slots) ? rack.slots : (rack.slots || "A, B").split(",").map(s => s.trim())
              
              // Prune empty locations that fall outside the new bounds
              newLocations = newLocations.filter(l => {
                if (l.rack === id) {
                  const bayOutside = l.bay > newBayCount
                  const levelOutside = !levels.includes(l.level)
                  const slotOutside = !slots.includes(l.slot)
                  if ((bayOutside || levelOutside || slotOutside) && !l.materialId) return false 
                }
                return true
              })
              
              // Generate any missing locations within bounds
              for (let bay = 1; bay <= newBayCount; bay++) {
                for (const level of levels) {
                  if (!level) continue
                  for (const slot of slots) {
                    if (!slot) continue
                    const locationId = computeLocationId(id, bay, level, slot)
                    if (!newLocations.find(l => l.locationId === locationId)) {
                      newLocations.push({ rack: id, bay, level, slot, locationId, materialId: '', batch: '', notes: '' })
                    }
                  }
                }
              }
            }

            return { racks: newRacks, locationMasterBase: newLocations }
          })
          get()._recompute()
        },

        // ─── GOOGLE SHEETS SYNC ──────────────────────────────────────────
        isSyncing: false,
        syncToGoogleSheets: async () => {
          set({ isSyncing: true })
          try {
            const state = get()
            const payload = {
              action: "full_sync",
              // 1. Rack Master
              racks: (state.racks || []).map(r => ({
                "Rack ID": r.id,
                "Rack Type": r.type || "Pallet Rack",
                "Source Description": r.description || "",
                "Bay Count (VERIFY)": r.bayCount || 1,
                "Levels": Array.isArray(r.levels) ? r.levels.join(", ") : (r.levels || ""),
                "Side Requirement (VERIFY)": r.side || "Single-sided",
                "Status": r.status || "Active",
                "Source Note": r.notes || "Verified from actual rack layout sheet"
              })),

              // 2. Material Master
              materials: (state.materialMasterBase || []).map(m => ({
                "Material ID": m.id,
                "Material Description": m.name || m.description || "",
                "Category": m.category || "",
                "Unit": m.unit || "PCS",
                "Reorder Level": m.reorderLevel !== undefined ? m.reorderLevel : 0,
                "Material ID (Name)": `${m.id} (${m.name || m.description || ""})`
              })),

              // 3. Location Master
              locations: (state.locations || []).map(l => ({
                "Rack": l.rack || "",
                "Bay": l.bay || 1,
                "Level": l.level || "",
                "Slot": l.slot || "",
                "Location ID": l.locationId,
                "Status": l.status || "Available",
                "Material ID": l.materialId ? (l.materialDesc ? `${l.materialId} (${l.materialDesc})` : l.materialId) : "",
                "Material Description": l.materialDesc || "",
                "Category": l.category || "",
                "Quantity": l.quantity || 0,
                "Unit": l.unit || "",
                "Batch/Lot": l.batch || "",
                "Notes": l.notes || ""
              })),

              // 4. Stock Movement
              movements: (state.enrichedMovements || []).map(m => ({
                "Date": m.date || new Date().toISOString().slice(0, 10),
                "Material ID": m.materialId || "",
                "Material Description": m.materialDesc || "",
                "Location ID": m.locationId || "",
                "Transaction Type": m.type || "IN",
                "Quantity": m.quantity || 0,
                "Unit": m.unit || "PCS",
                "Reference": m.reference || "",
                "User": m.user || "System",
                "Notes": m.notes || ""
              })),

              // 5. Inventory
              inventory: (state.inventory || []).map(i => ({
                "Material ID": i.materialId,
                "Material Description": i.materialDesc || "",
                "Category": i.category || "",
                "Location ID": i.locationId || "",
                "Opening Stock": i.openingStock || 0,
                "Stock IN": i.stockIn || 0,
                "Stock OUT": i.stockOut || 0,
                "Current Stock": i.currentStock !== undefined ? i.currentStock : 0,
                "Unit": i.unit || "PCS",
                "Reorder Level": i.reorderLevel || 0,
                "Stock Status": i.status || "OK"
              })),

              // 6. Rack Labels
              rackLabels: (state.locations || []).filter(l => l.locationId).map(l => ({
                "Location ID": l.locationId,
                "Material Description": l.materialDesc || "",
                "Category": l.category || "",
                "Rack": l.rack || "",
                "Bay": l.bay || 1,
                "Level": l.level || "",
                "Slot": l.slot || "",
                "Print Status": "READY"
              }))
            }
            
            const response = await fetch("https://script.google.com/macros/s/AKfycbxTc727AygmMtFnXymhGpUfBFbo6pbpJlBY-0qhjHmL705YAqIQRnM-DQ5NIEqLGaWl/exec", {
              method: "POST",
              mode: "no-cors",
              headers: {
                "Content-Type": "text/plain;charset=utf-8"
              },
              body: JSON.stringify(payload)
            })
            
            set({ isSyncing: false })
            return true
          } catch (error) {
            console.error("Failed to sync to Google Sheets:", error)
            set({ isSyncing: false })
            return false
          }
        },

        // ─── UI ACTIONS ────────────────────────────────────────────

        setCurrentUser: (name) => set({ currentUser: name }),
        setSelectedRack: (rackId) => set({ selectedRack: rackId }),
        setCommandOpen: (open) => set({ commandOpen: open }),

        // ─── COMPUTED GETTERS (selector functions) ─────────────────

        /** Get inventory stats for dashboard KPIs */
        getInventoryStats: () => {
          const inv = get().inventory || []
          const locs = get().locations || []
          const movs = get().movements || []
          const today = new Date().toISOString().slice(0, 10)
          return {
            totalMaterials: inv.length,
            totalLocations: locs.length,
            occupiedLocations: locs.filter(l => l.status === 'Occupied').length,
            availableLocations: locs.filter(l => l.status === 'Available').length,
            reorderAlerts: inv.filter(i => i.status === 'REORDER').length,
            emptyAlerts: inv.filter(i => i.status === 'EMPTY').length,
            todayMovements: movs.filter(m => m.date === today).length,
            totalIn: movs.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
            totalOut: movs.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
          }
        },

        /** Get locations for a specific rack */
        getLocationsForRack: (rackId) => {
          return (get().locations || []).filter(l => l.rack === rackId)
        },

        /** Get movements for a specific material */
        getMovementsForMaterial: (materialId) => {
          return (get().enrichedMovements || []).filter(m => m.materialId === materialId)
        },

        /** Get inventory item for a material */
        getInventoryForMaterial: (materialId) => {
          return (get().inventory || []).find(i => i.materialId === materialId) || null
        },

        /** Get rack-cell state for rack map coloring */
        getRackCellState: (locationId) => {
          const invItem = (get().inventory || []).find(i => i.locationId === locationId)
          const loc = (get().locations || []).find(l => l.locationId === locationId)
          if (!loc) return 'unassigned'
          if (!invItem || invItem.currentStock <= 0) return 'available'
          if (invItem.status === 'REORDER') return 'reorder'
          if (invItem.status === 'EMPTY') return 'empty-crit'
          return 'occupied'
        },

        /** Category summary for charts */
        getCategoryStats: () => {
          const inventory = get().inventory || []
          const catMap = {}
          inventory.forEach(item => {
            const cat = item.category || 'Unknown'
            if (!catMap[cat]) catMap[cat] = { category: cat, count: 0, totalStock: 0 }
            catMap[cat].count++
            catMap[cat].totalStock += item.currentStock
          })
          return Object.values(catMap)
        },

        /** Movement trend (last 7 days) for chart */
        getMovementTrend: () => {
          const movements = get().movements || []
          const days = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().slice(0, 10)
            const dayMovs = movements.filter(m => m.date === dateStr)
            days.push({
              date: dateStr,
              label: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
              in: dayMovs.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
              out: dayMovs.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
            })
          }
          return days
        },
      }
    },
    {
      name: 'warehouse-store-v3',
      // Only persist raw base data, not derived (derived is recomputed on load)
      partialize: (state) => ({
        locationMasterBase: state.locationMasterBase,
        materialMasterBase: state.materialMasterBase,
        movements: state.movements,
        racks: state.racks,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, recompute derived data
        if (state) state._recompute()
      },
    }
  )
)

export default useWarehouseStore

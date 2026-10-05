import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardContent } from "@/components/ui/card"
import { StockBadge, CategoryBadge, LocationBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LEVEL_ORDER, LEVEL_LABELS } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { X, Package, Layers, ChevronRight, Activity, ArrowDownRight, ArrowUpRight, ShieldCheck } from "lucide-react"

function RackCell({ location, onClick, rackCellState }) {
  const isOccupied = rackCellState === "occupied"
  const isReorder = rackCellState === "reorder"
  const isCritical = rackCellState === "empty-crit"
  const isAvailable = rackCellState === "available"
  const isAllocated = rackCellState === "allocated"

  const stateStyles = {
    occupied:    "border-blue-500/40 bg-blue-500/10 hover:border-blue-400 hover:bg-blue-500/20 text-blue-950 dark:text-blue-100",
    available:   "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/60 hover:bg-emerald-500/15 text-emerald-950 dark:text-emerald-200",
    allocated:   "border-purple-500/40 bg-purple-500/8 hover:border-purple-400 hover:bg-purple-500/15 text-purple-950 dark:text-purple-100",
    reorder:     "border-amber-500/40 bg-amber-500/10 hover:border-amber-400 hover:bg-amber-500/20 text-amber-950 dark:text-amber-100",
    "empty-crit":"border-red-500/40 bg-red-500/10 hover:border-red-400 hover:bg-red-500/20 text-red-950 dark:text-red-100",
    unassigned:  "border-border/40 bg-secondary/10 hover:border-border text-muted-foreground",
  }[rackCellState] || "border-border/40 bg-secondary/10 hover:border-border text-muted-foreground"

  const dotColors = {
    occupied:    "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]",
    available:   "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    allocated:   "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]",
    reorder:     "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse",
    "empty-crit":"bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-pulse",
    unassigned:  "bg-muted-foreground/30",
  }[rackCellState] || "bg-muted-foreground/30"

  const slotLabel = location.slot.startsWith("A") || location.slot.startsWith("B") || location.slot.startsWith("C") || location.slot.startsWith("D")
    ? `Side ${location.slot}`
    : `Slot ${location.slot}`

  return (
    <div
      onClick={() => onClick(location)}
      className={cn(
        "group relative flex flex-col justify-between p-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none min-h-[76px]",
        stateStyles
      )}
    >
      {/* Top row: Slot / Side label + Status Dot */}
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-[11px] font-bold font-mono text-foreground/90 tracking-tight group-hover:text-foreground">
          {slotLabel}
        </span>
        <span className={cn("w-2 h-2 rounded-full shrink-0", dotColors)} />
      </div>

      {/* Middle row: Material Description or Available */}
      <div className="my-0.5">
        {location.materialDesc ? (
          <p className="text-[10px] font-medium text-foreground leading-tight line-clamp-1 group-hover:line-clamp-none transition-all">
            {location.materialDesc}
          </p>
        ) : (
          <p className="text-[10px] font-normal text-muted-foreground/60 italic">
            Available
          </p>
        )}
      </div>

      {/* Bottom row: Location Code / Quantity */}
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200 dark:border-white/5 text-[9px]">
        <span className="font-mono text-muted-foreground/70 truncate max-w-[85px]">
          {location.locationId}
        </span>
        {location.quantity > 0 && (
          <span className="font-mono font-bold text-foreground/90 shrink-0 ml-1">
            {location.quantity} {location.unit || ""}
          </span>
        )}
      </div>
    </div>
  )
}

export default function RackMap() {
  const racks = useWarehouseStore(s => s.racks ?? [])
  const selectedRack = useWarehouseStore(s => s.selectedRack)
  const setSelectedRack = useWarehouseStore(s => s.setSelectedRack)
  const getLocationsForRack = useWarehouseStore(s => s.getLocationsForRack)
  const getRackCellState = useWarehouseStore(s => s.getRackCellState)
  const inventory = useWarehouseStore(s => s.inventory ?? [])
  const movements = useWarehouseStore(s => s.enrichedMovements ?? [])

  const [selectedCell, setSelectedCell] = React.useState(null)
  const [selectedBay, setSelectedBay] = React.useState("all")

  // Handle ESC to close drawer
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedCell(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const rackLocations = getLocationsForRack(selectedRack)
  const currentRack = racks.find(r => r.id === selectedRack)

  // UX-003: Auto-select first rack if selectedRack doesn't exist (e.g. after archive/delete)
  React.useEffect(() => {
    if (racks.length > 0 && !currentRack) {
      setSelectedRack(racks[0].id)
    }
  }, [racks, currentRack, setSelectedRack])

  // Group: bay -> level -> slots (strictly derived from real locations)
  const bays = React.useMemo(() => {
    const map = {}
    rackLocations.forEach(loc => {
      const b = Number(loc.bay) || 1
      if (!map[b]) map[b] = {}
      if (!map[b][loc.level]) map[b][loc.level] = []
      map[b][loc.level].push(loc)
    })

    // Sort slots alphabetically within each level
    Object.keys(map).forEach(b => {
      Object.keys(map[b]).forEach(lvl => {
        map[b][lvl].sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true, sensitivity: 'base' }))
      })
    })

    return map
  }, [rackLocations])

  const bayNumbers = Object.keys(bays).map(Number).sort((a, b) => a - b)
  const filteredBays = selectedBay === "all" ? bayNumbers : [Number(selectedBay)]

  const cellInv = selectedCell ? inventory.find(i => i.locationId === selectedCell.locationId) : null
  const cellState = selectedCell ? getRackCellState(selectedCell.locationId) : null
  const cellMovements = selectedCell ? movements.filter(m => m.locationId === selectedCell.locationId) : []

  // Legend items
  const legend = [
    { label: "Available",   dot: "bg-emerald-400" },
    { label: "Allocated",   dot: "bg-purple-400" },
    { label: "Occupied",    dot: "bg-blue-400" },
    { label: "Reorder Alert",dot: "bg-amber-400" },
    { label: "Critical Empty",dot:"bg-red-400" },
  ]

  // Levels for this rack in standard descending order
  const activeLevels = React.useMemo(() => {
    const allLevels = new Set()
    bayNumbers.forEach(b => {
      Object.keys(bays[b] || {}).forEach(lvl => allLevels.add(lvl))
    })
    
    return Array.from(allLevels).sort((a, b) => {
      const idxA = LEVEL_ORDER.indexOf(a)
      const idxB = LEVEL_ORDER.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxB - idxA // Reverse standard order (highest level first)
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }) // Reverse alphabetical for unknown levels
    })
  }, [bays, bayNumbers])

  return (
    <div className="space-y-4 animate-fade-in-up pb-10">
      {/* Top Header Card: Rack selector & Global Controls */}
      <Card className="glass">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 no-scrollbar sm:flex-wrap">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mr-1 shrink-0">
                Select Rack:
              </span>
              {racks.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRack(r.id)
                    setSelectedCell(null)
                    setSelectedBay("all")
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 border shrink-0",
                    selectedRack === r.id
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:border-border"
                  )}
                >
                  {r.id}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 sm:gap-4 items-center bg-secondary/20 px-3 py-1.5 rounded-lg border border-border/40">
              {legend.map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", l.dot)} />
                  <span className="text-[11px] font-medium text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subheader: Rack info + Bay switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Layers size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-foreground">
                    Rack {selectedRack}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">
                    {currentRack?.type || "Pallet Rack"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({currentRack?.bayCount || bayNumbers.length} Bays · {activeLevels.length} Levels = {rackLocations.length} Total Locations)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {currentRack?.description || "Warehouse storage rack"} · Click any slot cell to open location details drawer
                </p>
              </div>
            </div>

            {/* Bay filter pills */}
            <div className="flex items-center gap-1.5 bg-secondary/30 p-1 rounded-lg border border-border/50 max-w-full overflow-x-auto no-scrollbar">
              <span className="text-[11px] text-muted-foreground font-medium px-2 shrink-0">Bay:</span>
              <button
                onClick={() => setSelectedBay("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0",
                  selectedBay === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {bayNumbers.map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBay(String(b))}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all font-mono shrink-0",
                    selectedBay === String(b)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  B{String(b).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Elevation Profile Matrix (Full Width) */}
      <Card className="glass overflow-hidden">
        <div className="p-4 border-b border-border/60 bg-secondary/10 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded bg-primary" />
            ELEVATION PROFILE: FRONT VIEW OF RACK {selectedRack}
          </h3>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="sm:hidden text-primary font-medium">⇄ Swipe to pan bays · </span>
            Showing {filteredBays.length} {filteredBays.length === 1 ? "Bay" : "Bays"} · Real warehouse configuration
          </span>
        </div>

        <div className="overflow-x-auto p-4 w-full touch-pan-x">
          <div className="min-w-max space-y-3">
            {/* Header Row: BAY \ LEVEL Column Headers */}
            <div className="flex gap-3 pb-2 border-b border-border/60">
              <div className="w-24 shrink-0 p-2 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider flex items-end justify-center">
                LEVEL \ BAY
              </div>
              {filteredBays.map(bay => (
                <div
                  key={bay}
                  className="w-[280px] shrink-0 rounded-lg bg-secondary/40 border border-border/50 p-2 text-center"
                >
                  <p className="text-xs font-bold text-foreground font-mono">
                    Bay B{String(bay).padStart(2, "0")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Vertical Column {bay}
                  </p>
                </div>
              ))}
            </div>

            {/* Rows: Levels from top to bottom (SL6 -> GL1) */}
            {activeLevels.map(level => {
              const isStilt = level.startsWith("SL")
              const levelTag = isStilt ? "STILT" : "GROUND"

              return (
                <div key={level} className="flex gap-3 items-stretch">
                  {/* Left Level Indicator Box */}
                  <div className={cn(
                    "w-24 shrink-0 rounded-lg p-2.5 flex flex-col items-center justify-center border font-mono transition-colors",
                    isStilt
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-300"
                  )}>
                    <p className="font-bold text-sm tracking-tight">{level}</p>
                    <p className="text-[9px] font-sans font-semibold uppercase tracking-wider opacity-80 mt-0.5">
                      {LEVEL_LABELS[level] || levelTag}
                    </p>
                  </div>

                  {/* Bays for this Level */}
                  {filteredBays.map(bay => {
                    const slots = bays[bay]?.[level] || []

                    return (
                      <div
                        key={bay}
                        className="w-[280px] shrink-0 rounded-lg border border-border/50 bg-secondary/15 p-2 flex flex-wrap gap-2 content-start min-h-[84px]"
                      >
                        {slots.map(loc => (
                          <div
                            key={loc.locationId}
                            className={cn(
                              "shrink-0",
                              slots.length === 1 ? "w-full" : "w-[126px]"
                            )}
                          >
                            <RackCell
                              location={loc}
                              rackCellState={getRackCellState(loc.locationId)}
                              onClick={setSelectedCell}
                            />
                          </div>
                        ))}

                        {slots.length === 0 && (
                          <div className="w-full h-full min-h-[64px] flex items-center justify-center text-muted-foreground/30 text-[10px] font-mono border border-dashed border-border/30 rounded">
                            Empty Level
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {activeLevels.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No location slots defined for this rack. Go to Rack Manager to add or generate slots.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Slide-Over Drawer for Location Details */}
      {selectedCell && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedCell(null)}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40 transition-opacity animate-fade-in-up"
          />

          {/* Drawer Sidebar */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 p-4 sm:p-6 flex flex-col shadow-2xl overflow-y-auto animate-slide-right">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  Location Profile
                </span>
                <h3 className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {selectedCell.locationId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="space-y-4 py-4 flex-1">
              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {[
                  ["Rack", selectedCell.rack],
                  ["Bay", `B${String(selectedCell.bay).padStart(2, "0")}`],
                  ["Level", selectedCell.level],
                  ["Slot", selectedCell.slot],
                ].map(([label, val]) => (
                  <div key={label} className="bg-secondary/30 border border-border/50 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                    <p className="text-xs font-bold font-mono text-foreground mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/60">
                <span className="text-xs text-muted-foreground">Location Status</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    cellState === "occupied" ? "bg-blue-400" :
                    cellState === "reorder" ? "bg-amber-400" :
                    cellState === "empty-crit" ? "bg-red-400" : "bg-emerald-400"
                  )} />
                  <span className="text-xs font-bold capitalize text-foreground">
                    {selectedCell.status || cellState || "Available"}
                  </span>
                </div>
              </div>

              {/* Material Information Card */}
              {selectedCell.materialDesc ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Material</p>
                      <h4 className="text-sm font-bold text-foreground leading-tight mt-0.5">
                        {selectedCell.materialDesc}
                      </h4>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {selectedCell.materialId}
                      </p>
                    </div>
                  </div>

                  {selectedCell.category && (
                    <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Category:</span>
                      <CategoryBadge category={selectedCell.category} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/60 bg-secondary/10">
                  <Package size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">No Material Assigned</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    This location slot is currently free and available for stock storage.
                  </p>
                </div>
              )}

              {/* Live Inventory & Formula Metrics */}
              {cellInv && (
                <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Activity size={14} className="text-primary" /> Stock Metrics
                    </span>
                    <StockBadge status={cellInv.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                      <p className="text-muted-foreground text-[10px]">Current Stock</p>
                      <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                        {cellInv.currentStock} {cellInv.unit}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                      <p className="text-muted-foreground text-[10px]">Reorder Threshold</p>
                      <p className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                        {cellInv.reorderLevel} {cellInv.unit}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                      <p className="text-muted-foreground text-[10px]">Total Stock IN</p>
                      <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                        <ArrowUpRight size={12} /> {cellInv.stockIn} {cellInv.unit}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                      <p className="text-muted-foreground text-[10px]">Total Stock OUT</p>
                      <p className="text-xs font-bold font-mono text-red-400 mt-0.5 flex items-center gap-1">
                        <ArrowDownRight size={12} /> {cellInv.stockOut} {cellInv.unit}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Location Activity */}
              {cellMovements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Recent Movements ({cellMovements.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {cellMovements.slice(0, 5).map(m => (
                      <div key={m.id || m.date + m.quantity} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/40 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold",
                            m.type === "IN" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {m.type}
                          </span>
                          <span className="font-mono text-muted-foreground text-[11px]">{m.date}</span>
                        </div>
                        <span className="font-mono font-bold text-foreground">
                          {m.type === "IN" ? "+" : "-"}{m.quantity} {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch & Notes */}
              {(selectedCell.batch || selectedCell.notes) && (
                <div className="rounded-lg bg-secondary/20 p-3 border border-border/40 text-xs space-y-1">
                  {selectedCell.batch && (
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Batch: </span>
                      {selectedCell.batch}
                    </p>
                  )}
                  {selectedCell.notes && (
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Notes: </span>
                      {selectedCell.notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-border flex gap-2">
              <Button
                variant="secondary"
                className="w-full text-xs"
                onClick={() => setSelectedCell(null)}
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


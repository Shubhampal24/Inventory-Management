import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StockBadge, CategoryBadge, LocationBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LEVEL_ORDER, LEVEL_LABELS, formatQty } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { X, Package, MapPin, Hash, Layers, Grid3x3 } from "lucide-react"

function RackCell({ location, onClick, rackCellState }) {
  const stateClass = {
    occupied:   "rack-cell occupied",
    available:  "rack-cell available",
    reorder:    "rack-cell reorder",
    "empty-crit":"rack-cell empty-crit",
    unassigned: "rack-cell unassigned",
  }[rackCellState] || "rack-cell unassigned"

  const icons = {
    occupied: <span className="w-2 h-2 rounded-full bg-blue-400" />,
    available: <span className="w-2 h-2 rounded-full bg-emerald-400" />,
    reorder: <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-slow" />,
    "empty-crit": <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />,
  }

  return (
    <div className={stateClass} onClick={() => onClick(location)}>
      <div className="flex items-center gap-1 mb-1">
        {icons[rackCellState]}
        <span className="text-[10px] font-mono font-bold text-foreground/80">{location.slot}</span>
      </div>
      {location.materialDesc ? (
        <p className="text-[9px] text-center text-foreground/60 leading-tight truncate w-full px-1">
          {location.materialDesc.slice(0, 14)}
        </p>
      ) : (
        <p className="text-[9px] text-muted-foreground/40">Empty</p>
      )}
      {location.quantity > 0 && (
        <p className="text-[9px] font-mono text-foreground/50 mt-0.5">{location.quantity}{location.unit ? " "+location.unit : ""}</p>
      )}
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

  const [selectedCell, setSelectedCell] = React.useState(null)
  const [selectedBay, setSelectedBay] = React.useState("all")

  const rackLocations = getLocationsForRack(selectedRack)
  const currentRack = racks.find(r => r.id === selectedRack)

  // Group: bay -> level -> slots
  const bays = React.useMemo(() => {
    const map = {}
    rackLocations.forEach(loc => {
      if (!map[loc.bay]) map[loc.bay] = {}
      if (!map[loc.bay][loc.level]) map[loc.bay][loc.level] = []
      map[loc.bay][loc.level].push(loc)
    })
    return map
  }, [rackLocations])

  const bayNumbers = Object.keys(bays).map(Number).sort((a, b) => a - b)
  const filteredBays = selectedBay === "all" ? bayNumbers : [Number(selectedBay)]

  const cellInv = selectedCell ? inventory.find(i => i.locationId === selectedCell.locationId) : null
  const cellState = selectedCell ? getRackCellState(selectedCell.locationId) : null

  // Legend
  const legend = [
    { label: "Occupied (OK)", cls: "rack-cell occupied w-4 h-4 !min-h-0 !p-0" },
    { label: "Reorder Needed", cls: "rack-cell reorder w-4 h-4 !min-h-0 !p-0" },
    { label: "Available", cls: "rack-cell available w-4 h-4 !min-h-0 !p-0" },
    { label: "Empty/Critical", cls: "rack-cell empty-crit w-4 h-4 !min-h-0 !p-0" },
  ]

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Rack selector */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium mr-2">Select Rack:</span>
            {racks.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedRack(r.id); setSelectedCell(null); setSelectedBay("all") }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  selectedRack === r.id
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {r.id}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Rack grid */}
        <div className="xl:col-span-3 space-y-4">
          {/* Rack info + bay filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">{selectedRack} — {currentRack?.description}</h2>
              <p className="text-xs text-muted-foreground">{rackLocations.length} locations · {currentRack?.type}</p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">Bay:</span>
              <button
                onClick={() => setSelectedBay("all")}
                className={cn("px-2.5 py-1 rounded-lg text-xs border transition-all", selectedBay === "all" ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground")}
              >All</button>
              {bayNumbers.map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBay(String(b))}
                  className={cn("px-2.5 py-1 rounded-lg text-xs border transition-all",
                    selectedBay === String(b) ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground")}
                >B{String(b).padStart(2,"0")}</button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filteredBays.map(bay => (
            <Card key={bay} className="glass overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Grid3x3 size={14} className="text-primary" />
                  Bay {String(bay).padStart(2, "0")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {LEVEL_ORDER.map(level => {
                    const slots = bays[bay]?.[level] || []
                    if (slots.length === 0) return null
                    return (
                      <div key={level}>
                        <div className="flex items-center gap-2 mb-2">
                          <Layers size={12} className="text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">{LEVEL_LABELS[level] || level}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {slots.map(loc => (
                            <div key={loc.locationId} className="w-[90px]">
                              <RackCell
                                location={loc}
                                rackCellState={getRackCellState(loc.locationId)}
                                onClick={setSelectedCell}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 items-center">
            {legend.map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={l.cls} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-1">
          {selectedCell ? (
            <Card className="glass sticky top-24 animate-slide-right">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">Location Detail</CardTitle>
                  <button onClick={() => setSelectedCell(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14}/>
                  </button>
                </div>
                <LocationBadge locationId={selectedCell.locationId} className="mt-1" />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Rack", selectedCell.rack],
                    ["Bay", String(selectedCell.bay).padStart(2,"0")],
                    ["Level", selectedCell.level],
                    ["Slot", selectedCell.slot],
                  ].map(([k,v]) => (
                    <div key={k} className="rounded-lg bg-secondary/30 p-2">
                      <p className="text-muted-foreground mb-0.5">{k}</p>
                      <p className="font-mono font-semibold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>

                {selectedCell.materialDesc ? (
                  <>
                    <div className="rounded-lg bg-secondary/30 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Package size={13} className="text-primary" />
                        <p className="text-xs font-semibold text-foreground">{selectedCell.materialDesc}</p>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground">{selectedCell.materialId}</p>
                      {selectedCell.category && <CategoryBadge category={selectedCell.category} />}
                    </div>

                    {cellInv && (
                      <div className="space-y-1.5 text-xs">
                        {[
                          ["Current Stock", `${cellInv.currentStock} ${cellInv.unit}`],
                          ["Stock IN",  `${cellInv.stockIn} ${cellInv.unit}`],
                          ["Stock OUT", `${cellInv.stockOut} ${cellInv.unit}`],
                          ["Reorder at", `${cellInv.reorderLevel} ${cellInv.unit}`],
                        ].map(([k,v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-mono font-semibold text-foreground">{v}</span>
                          </div>
                        ))}
                        <div className="pt-1">
                          <StockBadge status={cellInv.status} />
                        </div>
                      </div>
                    )}

                    {selectedCell.batch && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Batch: </span>{selectedCell.batch}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-4 rounded-lg bg-secondary/20 border border-border border-dashed">
                    No material assigned
                  </div>
                )}

                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  {selectedCell.notes || "—"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <MapPin size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Click any rack cell<br/>to see details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

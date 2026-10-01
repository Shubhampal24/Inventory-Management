import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CategoryBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Printer, Tag, CheckSquare, Square } from "lucide-react"

// Deterministic QR Code Generator seeded by Location ID (never changes on re-render)
function getDeterministicQRGrid(text = "", size = 15) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  let seed = Math.abs(hash) || 12345
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const grid = Array.from({ length: size }, () => Array(size).fill(false))

  // Draw 5x5 finder patterns in 3 corners
  const drawFinder = (r, c) => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (i === 0 || i === 4 || j === 0 || j === 4 || (i === 2 && j === 2)) {
          if (r + i < size && c + j < size) {
            grid[r + i][c + j] = true
          }
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 5)
  drawFinder(size - 5, 0)

  // Timing lines
  for (let i = 5; i < size - 5; i++) {
    grid[4][i] = i % 2 === 0
    grid[i][4] = i % 2 === 0
  }

  // Data modules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder1 = r < 5 && c < 5
      const inFinder2 = r < 5 && c >= size - 5
      const inFinder3 = r >= size - 5 && c < 5
      const inTiming = (r === 4 && c >= 5 && c < size - 5) || (c === 4 && r >= 5 && r < size - 5)
      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming) {
        grid[r][c] = rand() > 0.48
      }
    }
  }

  return grid
}

function LocationQRCode({ locationId }) {
  const grid = React.useMemo(() => getDeterministicQRGrid(locationId, 15), [locationId])
  const size = 56
  const moduleSize = size / 15

  return (
    <div className="w-16 h-16 rounded-lg bg-white border border-border/80 flex items-center justify-center mb-3 mx-auto p-1 shadow-sm">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {grid.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c * moduleSize}
                y={r * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="#111827"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  )
}

function LabelCard({ loc, selected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(loc.locationId)}
      className={`print-label relative rounded-xl border-2 p-4 cursor-pointer transition-all ${selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
    >
      <div className="absolute top-2 right-2 no-print">
        {selected ? <CheckSquare size={16} className="text-primary"/> : <Square size={16} className="text-muted-foreground"/>}
      </div>
      {/* Stable deterministic QR Code */}
      <LocationQRCode locationId={loc.locationId} />
      <p className="font-mono text-xs font-bold text-foreground text-center mb-2 tracking-wide">{loc.locationId}</p>
      <div className="text-center space-y-1">
        <p className="text-[10px] font-semibold text-foreground truncate">{loc.materialDesc || "—"}</p>
        {loc.category && <CategoryBadge category={loc.category} className="text-[9px]" />}
        <div className="flex justify-center gap-3 text-[9px] text-muted-foreground mt-1">
          <span>Rack: {loc.rack}</span>
          <span>Bay: {String(loc.bay).padStart(2,"0")}</span>
          <span>Lvl: {loc.level}</span>
          <span>Slot: {loc.slot}</span>
        </div>
        <span className="inline-block text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">READY</span>
      </div>
    </div>
  )
}

export default function RackLabels() {
  const rackLabels = useWarehouseStore(s => s.rackLabels ?? [])
  const racks = useWarehouseStore(s => s.racks ?? [])
  const [rackFilter, setRackFilter] = React.useState("all")
  const [selected, setSelected] = React.useState(new Set())

  const filtered = rackLabels.filter(l => rackFilter === "all" || l.rack === rackFilter)

  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })

  const selectAll = () => setSelected(new Set(filtered.map(l => l.locationId)))
  const clearAll = () => setSelected(new Set())

  const handlePrint = () => window.print()

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Card className="glass no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-primary"/>
              <span className="text-sm font-semibold">{filtered.length} labels · {selected.size} selected</span>
            </div>
            <div className="w-36">
              <Select value={rackFilter} onValueChange={setRackFilter}>
                <SelectTrigger><SelectValue placeholder="All Racks"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Racks</SelectItem>
                  {racks.map(r => <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={selectAll}>Select All</Button>
            <Button size="sm" variant="outline" onClick={clearAll}>Clear</Button>
            <Button size="sm" onClick={handlePrint} disabled={selected.size === 0}>
              <Printer size={14}/> Print {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.map(loc => (
          <LabelCard key={loc.locationId} loc={loc} selected={selected.has(loc.locationId)} onToggle={toggleSelect} />
        ))}
      </div>
    </div>
  )
}

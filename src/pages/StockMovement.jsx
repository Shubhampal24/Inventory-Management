import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LocationBadge, CategoryBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/input"
import { Textarea } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { cn, formatDate, UNITS, exportToCSV } from "@/lib/utils"
import { Plus, ArrowUpCircle, ArrowDownCircle, Search, Trash2, ArrowLeftRight, X, Download } from "lucide-react"
import { computeLocationId } from "@/lib/store/useWarehouseStore"
import { useLocation as useRouterLocation } from "react-router-dom"



const extractMaterialId = (text) => {
  if (!text) return ""
  const trimmed = text.trim()
  const match = trimmed.match(/^(MAT\d+)/i)
  if (match) return match[1].toUpperCase()
  if (trimmed.includes(" - ")) return trimmed.split(" - ")[0].trim().toUpperCase()
  if (trimmed.includes(" (")) return trimmed.split(" (")[0].trim().toUpperCase()
  return trimmed.toUpperCase()
}

export default function StockMovement() {
  const enrichedMovements = useWarehouseStore(s => s.enrichedMovements ?? [])
  const materials = useWarehouseStore(s => s.materialMasterBase ?? [])
  const locations = useWarehouseStore(s => s.locations ?? [])
  const inventory = useWarehouseStore(s => s.inventory ?? [])
  const addMovement = useWarehouseStore(s => s.addMovement)
  const deleteMovement = useWarehouseStore(s => s.deleteMovement)
  const { toast } = useToast()

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const currentUser = useWarehouseStore(s => s.currentUser || "")
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: "",
    materialText: "",
    locationId: "",
    type: "IN",
    quantity: "",
    unit: "",
    reference: "",
    user: currentUser,
    notes: ""
  })

  const routerLocation = useRouterLocation()

  // Pre-fill search filter if navigated from Inventory with a materialId
  React.useEffect(() => {
    const navState = routerLocation.state
    if (navState?.materialId) {
      setSearch(navState.materialId)
      // Clear the state so navigating back and forward doesn't re-trigger
      window.history.replaceState({}, '')
    }
  }, [routerLocation.state])

  React.useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, user: f.user || currentUser }))
    }
  }, [open, currentUser])

  const selectedMat = React.useMemo(() => {
    if (!form.materialId) return null
    return materials.find(m => m.id === form.materialId) || null
  }, [materials, form.materialId])

  const filtered = React.useMemo(() => {
    return [...enrichedMovements].reverse().filter(m => {
      const q = search.toLowerCase()
      const matchSearch = !q || m.materialId?.toLowerCase().includes(q) || m.materialDesc?.toLowerCase().includes(q) || m.locationId?.toLowerCase().includes(q) || m.reference?.toLowerCase().includes(q)
      const matchType = typeFilter === "all" || m.type === typeFilter
      return matchSearch && matchType
    })
  }, [enrichedMovements, search, typeFilter])

  // Compute live available stock for selected location & material
  const currentAvailableStock = React.useMemo(() => {
    if (!form.locationId) return 0
    if (form.materialId) {
      const invItem = inventory.find(i => i.materialId === form.materialId && i.locationId === form.locationId)
      if (invItem) return invItem.currentStock
    }
    const loc = locations.find(l => l.locationId === form.locationId)
    return loc ? Number(loc.quantity || 0) : 0
  }, [inventory, locations, form.materialId, form.locationId])

  // Context-aware location options for IN vs OUT
  const locationOptions = React.useMemo(() => {
    if (form.type === "OUT") {
      // For OUT: prioritize locations holding stock of selected material
      if (form.materialId) {
        const matchingWithStock = locations.filter(l => 
          (l.materialId === form.materialId || inventory.some(i => i.materialId === form.materialId && i.locationId === l.locationId && i.currentStock > 0)) &&
          (Number(l.quantity) > 0 || l.status === "Occupied")
        )
        if (matchingWithStock.length > 0) return matchingWithStock

        // If no stock anywhere, show the primary assigned location with 0 stock indication
        const assigned = locations.filter(l => l.materialId === form.materialId)
        if (assigned.length > 0) return assigned
      }
      // If no material selected yet, show any location currently holding stock
      return locations.filter(l => Number(l.quantity) > 0 || l.status === "Occupied")
    } else {
      // For IN: show assigned location first, then available empty slots
      if (form.materialId) {
        const assigned = locations.filter(l => l.materialId === form.materialId)
        const available = locations.filter(l => l.status === "Available" && l.materialId !== form.materialId)
        return [...assigned, ...available]
      }
      return locations
    }
  }, [locations, inventory, form.type, form.materialId])

  // Clear/cancel Material -> also clears Location and Unit
  const handleMaterialCancel = () => {
    setForm(f => ({
      ...f,
      materialId: "",
      materialText: "",
      locationId: "",
      unit: ""
    }))
  }

  // Clear/cancel Location -> also clears Material and Unit (per user requirement)
  const handleLocationCancel = () => {
    setForm(f => ({
      ...f,
      locationId: "",
      materialId: "",
      materialText: "",
      unit: ""
    }))
  }

  // Auto-fill unit and location when material selected, and show name in field
  const handleMaterialChange = (rawVal) => {
    if (!rawVal || rawVal.trim() === "") {
      handleMaterialCancel()
      return
    }

    const cleanId = extractMaterialId(rawVal)
    const mat = materials.find(m => 
      m.id.toUpperCase() === cleanId || 
      (m.name || m.description)?.toUpperCase() === rawVal.trim().toUpperCase()
    )

    if (mat) {
      const fullText = `${mat.id} - ${mat.name || mat.description}`
      let loc = null
      if (form.type === "OUT") {
        loc = locations.find(l => 
          (l.materialId === mat.id || inventory.some(i => i.materialId === mat.id && i.locationId === l.locationId && i.currentStock > 0)) &&
          (Number(l.quantity) > 0 || l.status === "Occupied")
        )
      }
      if (!loc) {
        loc = locations.find(l => l.materialId === mat.id)
      }

      setForm(f => ({
        ...f,
        materialId: mat.id,
        materialText: fullText,
        unit: mat.unit || f.unit || "PCS",
        locationId: loc?.locationId || f.locationId || ""
      }))
    } else {
      // User is currently typing
      setForm(f => ({
        ...f,
        materialId: cleanId,
        materialText: rawVal
      }))
    }
  }

  // Auto-fill material when location selected; if location is cleared, clear material automatically
  const handleLocationChange = (locId) => {
    if (!locId || locId.trim() === "") {
      handleLocationCancel()
      return
    }

    const loc = locations.find(l => l.locationId === locId)
    setForm(f => {
      const next = { ...f, locationId: locId }
      if (loc?.materialId) {
        const cleanMatId = extractMaterialId(loc.materialId)
        const mat = materials.find(m => m.id === cleanMatId)
        next.materialId = cleanMatId
        next.materialText = mat ? `${mat.id} - ${mat.name || mat.description}` : cleanMatId
        next.unit = loc.unit || mat?.unit || next.unit || "PCS"
      }
      return next
    })
  }

  // Handle switching between IN and OUT
  const handleTypeChange = (newType) => {
    setForm(f => {
      const next = { ...f, type: newType }
      if (newType === "OUT" && f.materialId) {
        const stockLoc = locations.find(l => 
          (l.materialId === f.materialId || inventory.some(i => i.materialId === f.materialId && i.locationId === l.locationId && i.currentStock > 0)) &&
          (Number(l.quantity) > 0 || l.status === "Occupied")
        )
        if (stockLoc) next.locationId = stockLoc.locationId
      } else if (newType === "IN" && f.materialId) {
        const assignedLoc = locations.find(l => l.materialId === f.materialId)
        if (assignedLoc) next.locationId = assignedLoc.locationId
      }
      return next
    })
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    const cleanMatId = extractMaterialId(form.materialId || form.materialText)
    const qty = parseFloat(form.quantity)
    if (!cleanMatId || !form.locationId || !form.quantity || isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid details", description: "Please enter a valid material, location, and positive quantity.", variant: "destructive" })
      return
    }
    if (form.type === "OUT" && qty > currentAvailableStock) {
      if (!confirm(`Warning: You are issuing ${qty} ${form.unit}, but only ${currentAvailableStock} ${form.unit} are available at ${form.locationId}. Proceed anyway?`)) {
        return
      }
    }
    addMovement({
      ...form,
      materialId: cleanMatId,
      quantity: qty,
    })
    toast({ title: "Movement recorded", description: `${form.type} of ${qty} ${form.unit} added successfully.`, variant: "success" })
    setOpen(false)
    setForm({ date: new Date().toISOString().slice(0, 10), materialId: "", materialText: "", locationId: "", type: "IN", quantity: "", unit: "", reference: "", user: currentUser || "User", notes: "" })
  }

  const totalIn = enrichedMovements.filter(m => m.type === "IN").reduce((s, m) => s + m.quantity, 0)
  const totalOut = enrichedMovements.filter(m => m.type === "OUT").reduce((s, m) => s + m.quantity, 0)

  const exportCSV = () => {
    const headers = [
      "Date",
      "Material ID",
      "Material Description",
      "Location ID",
      "Type",
      "Quantity",
      "Unit",
      "Reference",
      "User",
      "Notes"
    ]
    const rows = filtered.map(m => [
      m.date,
      m.materialId,
      m.materialDesc || "",
      m.locationId,
      m.type,
      m.quantity,
      m.unit || "",
      m.reference || "",
      m.user || "",
      m.notes || ""
    ])
    const dateStr = new Date().toISOString().slice(0, 10)
    exportToCSV(`stock_movements_${dateStr}.csv`, headers, rows)
    toast({ title: "Movements exported", description: `${filtered.length} transactions exported to CSV.`, variant: "success" })
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-hover rounded-xl border border-border p-4 flex flex-col justify-center">
          <p className="text-2xl font-bold text-foreground">{enrichedMovements.length}</p>
          <p className="text-xs text-muted-foreground">Total Movements</p>
        </div>
        <div className="glass-hover rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col justify-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalIn.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Total IN</p>
        </div>
        <div className="glass-hover rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex flex-col justify-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalOut.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Total OUT</p>
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-primary" />
              Stock Movements ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button size="sm" variant="outline" onClick={exportCSV} className="flex-1 sm:flex-none">
                <Download size={13} /> Export CSV
              </Button>
              <Button size="sm" onClick={() => setOpen(true)} className="flex-1 sm:flex-none">
                <Plus size={15} /> Add Movement
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search material, location, reference..." className="pl-9" />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              {["all","IN","OUT"].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 font-medium transition-colors ${typeFilter === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "all" ? "All" : t}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <div className="overflow-x-auto w-full">
            <table className="w-full wms-table min-w-[750px]">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Material</th>
                  <th className="text-left">Location</th>
                  <th className="text-center">Type</th>
                  <th className="text-right">Qty</th>
                  <th className="text-left">Reference</th>
                  <th className="text-left">User</th>
                  <th className="text-left">Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className={m.type === "IN" ? "bg-emerald-500/5 dark:!bg-emerald-500/3" : "bg-red-500/5 dark:!bg-red-500/3"}>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(m.date)}</td>
                    <td>
                      <p className="font-medium text-foreground text-xs">{m.materialDesc || m.materialId}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{m.materialId}</p>
                    </td>
                    <td><LocationBadge locationId={m.locationId} /></td>
                    <td className="text-center">
                      {m.type === "IN"
                        ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"><ArrowUpCircle size={12}/>IN</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400"><ArrowDownCircle size={12}/>OUT</span>
                      }
                    </td>
                    <td className="text-right font-mono text-sm">
                      <span className={m.type === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>{m.type === "OUT" ? "-" : "+"}{m.quantity}</span>
                      <span className="text-muted-foreground text-xs ml-1">{m.unit}</span>
                    </td>
                    <td className="text-xs font-mono text-muted-foreground">{m.reference || "—"}</td>
                    <td className="text-xs text-foreground">{m.user}</td>
                    <td className="text-xs text-muted-foreground max-w-[150px] truncate">{m.notes || "—"}</td>
                    <td>
                      <button
                        onClick={() => {
                          if (!confirm('Delete this movement? Inventory will update automatically.')) return
                          deleteMovement(m.id)
                          toast({ title: "Movement deleted", variant: "warning" })
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">No movements found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Movement Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Stock Movement</DialogTitle>
            <DialogDescription>Record a new IN or OUT transaction. Inventory will update automatically.</DialogDescription>
          </DialogHeader>
          <form id="sm-form" onSubmit={handleSubmit} className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Type toggle */}
            <div>
              <Label className="mb-2 block">Transaction Type</Label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {["IN","OUT"].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2.5 text-sm font-bold transition-all ${form.type === t
                      ? t === "IN" ? "bg-emerald-500/20 text-emerald-400 border-r border-emerald-500/30"
                                    : "bg-red-500/20 text-red-400"
                      : "text-muted-foreground hover:bg-secondary/50"}`}
                  >
                    {t === "IN" ? "⬆ IN (Receive Stock)" : "⬇ OUT (Issue Stock)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>User</Label>
                <Input value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Material <span className="text-destructive">*</span></Label>
                {selectedMat && (
                  <span className="text-[11px] font-medium text-primary truncate max-w-[220px]">
                    {selectedMat.name || selectedMat.description}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input 
                  list="sm-materials"
                  value={form.materialText || form.materialId}
                  onChange={e => handleMaterialChange(e.target.value)}
                  onBlur={() => {
                    if (selectedMat) {
                      setForm(f => ({ ...f, materialText: `${selectedMat.id} - ${selectedMat.name || selectedMat.description}` }))
                    }
                  }}
                  placeholder="Select material ID or name..."
                  className="pr-8"
                  required
                />
                {(form.materialText || form.materialId) && (
                  <button
                    type="button"
                    onClick={handleMaterialCancel}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title="Clear material and location"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <datalist id="sm-materials">
                {materials.map(m => (
                  <option 
                    key={m.id} 
                    value={`${m.id} - ${m.name || m.description}`}
                  >
                    {m.category ? `${m.category} · ` : ""}{m.unit ? `Unit: ${m.unit}` : ""}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label>Location ID <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input 
                  list="sm-locations"
                  value={form.locationId}
                  onChange={e => handleLocationChange(e.target.value.toUpperCase())}
                  placeholder="e.g. R01-B01-GL1-A" 
                  className="font-mono uppercase pr-8" 
                  required 
                />
                {form.locationId && (
                  <button
                    type="button"
                    onClick={handleLocationCancel}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title="Clear location and material"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <datalist id="sm-locations">
                {locationOptions.map(l => {
                  const invItem = inventory.find(i => i.locationId === l.locationId && (!form.materialId || i.materialId === form.materialId))
                  const stock = invItem ? invItem.currentStock : Number(l.quantity || 0)
                  return (
                    <option 
                      key={l.locationId} 
                      value={l.locationId}
                    >
                      {form.type === "OUT"
                        ? `Stock: ${stock} ${l.unit || form.unit || "PCS"} · ${l.materialDesc || l.materialId || "Occupied"}`
                        : l.materialId === form.materialId 
                          ? `Primary Assigned for ${form.materialId}` 
                          : l.status === "Available" 
                            ? `Available (Empty slot · Rack ${l.rack})` 
                            : `${l.status} · ${l.materialDesc || l.materialId || ""}`}
                    </option>
                  )
                })}
              </datalist>
              <p className="text-[11px] text-muted-foreground">
                {form.type === "OUT"
                  ? form.materialId
                    ? "Auto-filled location with available stock. Select another if issuing from a different bay/slot."
                    : "Showing locations currently holding stock to issue from."
                  : form.materialId
                    ? "Auto-filled primary assigned location. Select an empty slot if placing in another rack."
                    : "Showing assigned location and available empty rack slots."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <Input 
                  type="text" 
                  inputMode="decimal"
                  value={form.quantity} 
                  onChange={e => {
                    const val = e.target.value
                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setForm(f => ({ ...f, quantity: val }))
                    }
                  }} 
                  placeholder="Enter quantity (e.g. 10)" 
                  className="font-mono text-sm font-semibold"
                  autoComplete="off"
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue placeholder="Unit..." /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Available stock indicator for OUT transactions */}
            {form.type === "OUT" && form.locationId && (
              <div className="rounded-lg p-2.5 bg-secondary/40 border border-border/60 flex items-center justify-between text-xs animate-fade-in-up">
                <span className="text-muted-foreground">Available Stock at {form.locationId}:</span>
                <span className={cn(
                  "font-mono font-bold",
                  currentAvailableStock > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                )}>
                  {currentAvailableStock} {form.unit || "PCS"}
                </span>
              </div>
            )}
            {form.type === "OUT" && form.quantity && parseFloat(form.quantity) > currentAvailableStock && (
              <p className="text-xs text-red-500 dark:text-red-400 font-medium px-1 animate-fade-in-up">
                ⚠️ Warning: Quantity ({form.quantity}) exceeds available stock ({currentAvailableStock} {form.unit})
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Reference (PO / SO number)</Label>
              <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. PO-1234 or SO-5678" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={2} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              form="sm-form"
              variant={form.type === "IN" ? "success" : "destructive"}
            >
              {form.type === "IN" ? "Record IN" : "Record OUT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

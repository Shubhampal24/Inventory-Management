import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CategoryBadge, LocationBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { LEVELS, CATEGORIES, exportToCSV } from "@/lib/utils"
import { computeLocationId } from "@/lib/store/useWarehouseStore"
import { Plus, Search, MapPin, Link, Unlink, Download, ArrowLeftRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
export default function LocationMaster() {
  const locations = useWarehouseStore(s => s.locations ?? [])
  const materials = useWarehouseStore(s => s.materialMasterBase ?? [])
  const racks = useWarehouseStore(s => s.racks ?? [])
  const assignMaterial = useWarehouseStore(s => s.assignMaterial)
  const unassignMaterial = useWarehouseStore(s => s.unassignMaterial)
  const addLocation = useWarehouseStore(s => s.addLocation)
  const { toast } = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = React.useState("")
  const [rackFilter, setRackFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("NotAvailable")
  const [addOpen, setAddOpen] = React.useState(false)
  const [globalAssignOpen, setGlobalAssignOpen] = React.useState(false)
  const [assignOpen, setAssignOpen] = React.useState(null) // locationId
  const [assignMatId, setAssignMatId] = React.useState("")
  const [assignSearch, setAssignSearch] = React.useState("")
  const [newLoc, setNewLoc] = React.useState({ rack: "R01", bay: 1, level: "GL1", slot: "A", materialId: "", batch: "", notes: "" })
  const [page, setPage] = React.useState(1)
  const PAGE_SIZE = 25
  const cleanAssignMatId = assignMatId ? (assignMatId.includes(" (") ? assignMatId.split(" (")[0].trim() : assignMatId.trim()) : ""
  const selectedAssignMat = materials.find(m => m.id === cleanAssignMatId || m.id === assignMatId)

  const assignFilteredMaterials = materials.filter(m => {
    if (!assignSearch.trim()) return true
    const term = assignSearch.toLowerCase()
    const name = (m.name || m.description || "").toLowerCase()
    const id = (m.id || "").toLowerCase()
    const cat = (m.category || "").toLowerCase()
    return id.includes(term) || name.includes(term) || cat.includes(term)
  })

  // Global Assign State
  const [gaMat, setGaMat] = React.useState("")
  const [gaRack, setGaRack] = React.useState("")
  const [gaBay, setGaBay] = React.useState("")
  const [gaLevel, setGaLevel] = React.useState("")
  const [gaSlot, setGaSlot] = React.useState("")

  const gaSelectedMat = materials.find(m => m.id === gaMat)

  const filtered = locations.filter(l => {
    const q = search.toLowerCase()
    return (!q || l.locationId?.toLowerCase().includes(q) || l.materialDesc?.toLowerCase().includes(q) || l.materialId?.toLowerCase().includes(q)) &&
           (rackFilter === "all" || l.rack === rackFilter) &&
           (statusFilter === "all" ? true : statusFilter === "NotAvailable" ? l.status !== "Available" : l.status === statusFilter)
  })

  // Reset to page 1 whenever filters change
  React.useEffect(() => { setPage(1) }, [search, rackFilter, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Cascading lists for Global Assign
  const gaBays = [...new Set(locations.filter(l => l.rack === gaRack).map(l => l.bay))]
  const gaLevels = [...new Set(locations.filter(l => l.rack === gaRack && String(l.bay) === String(gaBay)).map(l => l.level))]
  const gaSlots = locations.filter(l => l.rack === gaRack && String(l.bay) === String(gaBay) && l.level === gaLevel && (l.status === "Available" || l.status === "Allocated"))

  const selectedAddRack = racks.find(r => r.id === newLoc.rack)
  const maxBays = selectedAddRack?.bayCount || 1
  const addLevels = selectedAddRack?.levels || LEVELS
  const addSlots = selectedAddRack?.slots || ["A", "B"]

  const previewId = computeLocationId(newLoc.rack, newLoc.bay, newLoc.level, newLoc.slot)

  const handleAddLocation = () => {
    if (!previewId) { toast({ title: "Invalid location fields", variant: "destructive" }); return }
    if (locations.find(l => l.locationId === previewId)) { toast({ title: "Location already exists", variant: "destructive" }); return }
    addLocation(newLoc.rack, Number(newLoc.bay), newLoc.level, newLoc.slot, newLoc.materialId, newLoc.batch, newLoc.notes)
    toast({ title: "Location added", description: previewId, variant: "success" })
    setAddOpen(false)
  }

  const handleAssign = () => {
    if (!assignMatId) { toast({ title: "Select a material", variant: "destructive" }); return }
    assignMaterial(assignOpen, assignMatId)
    toast({ title: "Material assigned", description: `${assignMatId} → ${assignOpen}`, variant: "success" })
    setAssignOpen(null); setAssignMatId("")
  }

  const handleGlobalAssign = () => {
    if (!gaMat || !gaSlot) { toast({ title: "Select material and location slot", variant: "destructive" }); return }
    assignMaterial(gaSlot, gaMat)
    toast({ title: "Material assigned", description: `${gaMat} → ${gaSlot}`, variant: "success" })
    setGlobalAssignOpen(false)
    setGaMat(""); setGaRack(""); setGaBay(""); setGaLevel(""); setGaSlot("")
  }

  const exportCSV = () => {
    const headers = [
      "Rack",
      "Bay",
      "Level",
      "Slot",
      "Location ID",
      "Status",
      "Material ID",
      "Material Description",
      "Category",
      "Quantity",
      "Unit"
    ]
    const rows = filtered.map(l => [
      l.rack,
      l.bay,
      l.level,
      l.slot,
      l.locationId,
      l.status,
      l.materialId || "",
      l.materialDesc || "",
      l.category || "",
      l.quantity || 0,
      l.unit || ""
    ])
    const dateStr = new Date().toISOString().slice(0, 10)
    exportToCSV(`location_master_${dateStr}.csv`, headers, rows)
    toast({ title: "Locations exported", description: `${filtered.length} locations exported to CSV.`, variant: "success" })
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin size={16} className="text-primary"/>
              Location Master ({filtered.length} shown)
            </CardTitle>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button size="sm" variant="outline" onClick={exportCSV} className="flex-1 sm:flex-none">
                <Download size={13}/> Export CSV
              </Button>
              <Button size="sm" onClick={() => setGlobalAssignOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white border-none"><Link size={15}/> Assign Material</Button>
              {/* <Button size="sm" onClick={() => setAddOpen(true)} className="flex-1 sm:flex-none"><Plus size={15}/> Add Location</Button> */}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search location or material..." className="pl-9" />
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
            <div className="w-36">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="NotAvailable">Assigned & Occupied (Hide Empty)</SelectItem>
                  <SelectItem value="Occupied">Occupied Only</SelectItem>
                  <SelectItem value="Allocated">Allocated (Empty Stock)</SelectItem>
                  <SelectItem value="Available">Available (Unassigned)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* UX-001: Active filter hint */}
          {statusFilter === "NotAvailable" && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Showing occupied &amp; assigned only — <button onClick={() => setStatusFilter("all")} className="underline underline-offset-2 font-semibold hover:text-amber-500 transition-colors">Show all slots</button>
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <div className="overflow-x-auto w-full">
            <table className="w-full wms-table min-w-[800px]">
              <thead>
                <tr>
                  <th className="text-left">Location ID<br/><span className="text-[9px] font-normal text-muted-foreground/60">Formula: Rack-B{"{"}Bay:00{"}"}-Level-Slot</span></th>
                  <th className="text-center">Rack</th><th className="text-center">Bay</th>
                  <th className="text-center">Level</th><th className="text-center">Slot</th>
                  <th className="text-center">Status<br/><span className="text-[9px] font-normal text-muted-foreground/60">IF(Qty{">"}0,"Occupied","Available")</span></th>
                  <th className="text-left">Material</th>
                  <th className="text-right">Qty<br/><span className="text-[9px] font-normal text-muted-foreground/60">SUMIFS IN - SUMIFS OUT</span></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(l => (
                  <tr key={l.locationId}>
                    <td><LocationBadge locationId={l.locationId} /></td>
                    <td className="text-center font-mono text-xs">{l.rack}</td>
                    <td className="text-center font-mono text-xs">{String(l.bay).padStart(2,"00")}</td>
                    <td className="text-center font-mono text-xs">{l.level}</td>
                    <td className="text-center font-mono text-xs">{l.slot}</td>
                    <td className="text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        l.status === "Occupied"
                          ? "bg-blue-500/15 text-blue-400"
                          : l.status === "Allocated"
                          ? "bg-purple-500/15 text-purple-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      {l.materialDesc ? (
                        <div>
                          <p className="text-xs font-medium text-foreground">{l.materialDesc}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{l.materialId}</p>
                          {l.category && <CategoryBadge category={l.category} className="mt-0.5" />}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right font-mono text-sm">
                      {l.quantity != null ? <><span className="text-foreground">{Number(l.quantity).toFixed(2)}</span><span className="text-muted-foreground text-xs ml-1">{l.unit}</span></> : "—"}
                    </td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        {!l.materialId ? (
                          <button title="Assign material" onClick={() => { setAssignOpen(l.locationId); setAssignMatId("") }}
                            className="text-muted-foreground hover:text-primary p-1 transition-colors"><Link size={13}/></button>
                        ) : (
                          <>
                            {l.status === "Occupied" && (
                              <button title="Transfer stock" onClick={() => {
                                navigate('/movements', { state: { materialId: l.materialId, type: 'TRANSFER' } })
                              }} className="text-muted-foreground hover:text-blue-500 p-1 transition-colors"><ArrowLeftRight size={13}/></button>
                            )}
                            <button title="Unassign material" onClick={() => {
                              if (l.quantity > 0) {
                                toast({ title: "Cannot Unassign", description: "Stock quantity must be 0 before unassigning a material.", variant: "destructive" })
                                return
                              }
                              if (confirm(`Are you sure you want to unassign ${l.materialId} from ${l.locationId}?`)) {
                                unassignMaterial(l.locationId)
                                toast({ title: "Material unassigned", variant: "success" })
                              }
                            }} className={l.quantity > 0 ? "text-muted-foreground/30 cursor-not-allowed p-1" : "text-muted-foreground hover:text-destructive p-1 transition-colors"}
                               disabled={l.quantity > 0}
                            ><Unlink size={13}/></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">No locations match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* UX-010: Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} locations
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground text-xs">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        p === page ? "bg-primary/20 border-primary/50 text-primary font-semibold" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >{p}</button>
                  </React.Fragment>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Next →</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Location */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>Location ID is auto-generated from Rack + Bay + Level + Slot</DialogDescription>
          </DialogHeader>
          <div className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rack</Label>
                <Select value={newLoc.rack} onValueChange={v => {
                  const r = racks.find(x => x.id === v)
                  setNewLoc(f => ({ ...f, rack: v, bay: 1, level: r?.levels?.[0] || "", slot: r?.slots?.[0] || "" }))
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{racks.filter(r => r.status !== "Inactive").map(r => <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bay (number)</Label>
                <Select value={String(newLoc.bay)} onValueChange={v => setNewLoc(f => ({ ...f, bay: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxBays }, (_, i) => i + 1).map(b => (
                      <SelectItem key={b} value={String(b)}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={newLoc.level} onValueChange={v => setNewLoc(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{addLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Slot</Label>
                <Select value={newLoc.slot} onValueChange={v => setNewLoc(f => ({ ...f, slot: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{addSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {previewId && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
                <p className="text-xs text-muted-foreground">Generated Location ID:</p>
                <p className="font-mono font-bold text-primary text-lg mt-0.5">{previewId}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Formula: {newLoc.rack}-B{String(newLoc.bay).padStart(2,"0")}-{newLoc.level}-{newLoc.slot}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={newLoc.notes} onChange={e => setNewLoc({ ...newLoc, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLocation}>Add Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Material */}
      <Dialog open={!!assignOpen} onOpenChange={() => { setAssignOpen(null); setAssignMatId(""); setAssignSearch("") }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Material</DialogTitle>
            <DialogDescription>
              Assign a material to <span className="font-mono font-semibold text-primary">{assignOpen}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Material</Label>
                {selectedAssignMat && (
                  <span className="text-xs text-primary font-mono font-medium">
                    {selectedAssignMat.id}
                  </span>
                )}
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Type to filter by name, ID or category..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-secondary/30"
                />
              </div>

              <Select value={assignMatId} onValueChange={setAssignMatId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose material...">
                    {selectedAssignMat
                      ? `${selectedAssignMat.id} — ${selectedAssignMat.name || selectedAssignMat.description}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {assignFilteredMaterials.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center justify-between gap-3 w-full py-0.5">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono font-semibold text-primary shrink-0">{m.id}</span>
                          <span className="text-foreground/90 truncate font-medium">{m.name || m.description}</span>
                        </div>
                        {m.category && (
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded shrink-0">
                            {m.category}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  {assignFilteredMaterials.length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No materials found matching "{assignSearch}"
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Material Details Card */}
            {selectedAssignMat ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Material Name & Info</span>
                  <CategoryBadge category={selectedAssignMat.category} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {selectedAssignMat.name || selectedAssignMat.description}
                  </p>
                  <p className="font-mono text-xs text-primary font-medium mt-0.5">
                    Code: {selectedAssignMat.id}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div>
                    <span>Unit: </span>
                    <span className="font-medium text-foreground">{selectedAssignMat.unit || "PCS"}</span>
                  </div>
                  <div>
                    <span>Reorder Level: </span>
                    <span className="font-mono font-medium text-foreground">{selectedAssignMat.reorderLevel ?? "—"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
                Select a material above to preview its full details
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignOpen(null); setAssignMatId(""); setAssignSearch("") }}>Cancel</Button>
            <Button onClick={handleAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Assign Material */}
      <Dialog open={globalAssignOpen} onOpenChange={setGlobalAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advanced Assign Material</DialogTitle>
            <DialogDescription>Select material and drill down to an available physical slot</DialogDescription>
          </DialogHeader>
          <div className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Select Material</Label>
              <Input 
                list="lm-materials"
                value={gaMat}
                onChange={e => setGaMat(e.target.value.toUpperCase())}
                placeholder="Type or select material ID..."
              />
              <datalist id="lm-materials">
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.description}</option>
                ))}
              </datalist>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>1. Rack</Label>
                <Select value={gaRack} onValueChange={v => { setGaRack(v); setGaBay(""); setGaLevel(""); setGaSlot("") }}>
                  <SelectTrigger><SelectValue placeholder="Select Rack..." /></SelectTrigger>
                  <SelectContent>
                    {racks.filter(r => r.status !== "Inactive").map(r => <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>2. Bay</Label>
                <Select value={gaBay} onValueChange={v => { setGaBay(v); setGaLevel(""); setGaSlot("") }} disabled={!gaRack}>
                  <SelectTrigger><SelectValue placeholder="Select Bay..." /></SelectTrigger>
                  <SelectContent>
                    {gaBays.map(b => <SelectItem key={String(b)} value={String(b)}>{String(b).padStart(2,"0")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>3. Level</Label>
                <Select value={gaLevel} onValueChange={v => { setGaLevel(v); setGaSlot("") }} disabled={!gaBay}>
                  <SelectTrigger><SelectValue placeholder="Select Level..." /></SelectTrigger>
                  <SelectContent>
                    {gaLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>4. Available Slot</Label>
                <Select value={gaSlot} onValueChange={setGaSlot} disabled={!gaLevel}>
                  <SelectTrigger><SelectValue placeholder="Select Slot..." /></SelectTrigger>
                  <SelectContent>
                    {gaSlots.length === 0 && <SelectItem value="none" disabled>No free slots here</SelectItem>}
                    {gaSlots.map(s => <SelectItem key={s.locationId} value={s.locationId}>{s.slot}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {gaSlot && gaSlot !== "none" && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 mt-2">
                <p className="text-xs text-muted-foreground">
                  Will assign <span className="font-semibold text-foreground">{gaMat}</span>
                  {gaSelectedMat ? ` (${gaSelectedMat.name || gaSelectedMat.description})` : ""} to:
                </p>
                <p className="font-mono font-bold text-emerald-400 text-lg mt-0.5">{gaSlot}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGlobalAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleGlobalAssign} disabled={!gaMat || !gaSlot || gaSlot === "none"}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

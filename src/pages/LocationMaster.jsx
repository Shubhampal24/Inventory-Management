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
import { LEVELS, CATEGORIES } from "@/lib/utils"
import { computeLocationId } from "@/lib/store/useWarehouseStore"
import { Plus, Search, MapPin, Link, Unlink } from "lucide-react"

export default function LocationMaster() {
  const locations = useWarehouseStore(s => s.locations ?? [])
  const materials = useWarehouseStore(s => s.materialMasterBase ?? [])
  const racks = useWarehouseStore(s => s.racks ?? [])
  const assignMaterial = useWarehouseStore(s => s.assignMaterial)
  const unassignMaterial = useWarehouseStore(s => s.unassignMaterial)
  const addLocation = useWarehouseStore(s => s.addLocation)
  const { toast } = useToast()

  const [search, setSearch] = React.useState("")
  const [rackFilter, setRackFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("NotAvailable")
  const [addOpen, setAddOpen] = React.useState(false)
  const [globalAssignOpen, setGlobalAssignOpen] = React.useState(false)
  const [assignOpen, setAssignOpen] = React.useState(null) // locationId
  const [assignMatId, setAssignMatId] = React.useState("")
  const [newLoc, setNewLoc] = React.useState({ rack: "R01", bay: 1, level: "GL1", slot: "A", materialId: "", batch: "", notes: "" })
  
  // Global Assign State
  const [gaMat, setGaMat] = React.useState("")
  const [gaRack, setGaRack] = React.useState("")
  const [gaBay, setGaBay] = React.useState("")
  const [gaLevel, setGaLevel] = React.useState("")
  const [gaSlot, setGaSlot] = React.useState("")

  const filtered = locations.filter(l => {
    const q = search.toLowerCase()
    return (!q || l.locationId?.toLowerCase().includes(q) || l.materialDesc?.toLowerCase().includes(q) || l.materialId?.toLowerCase().includes(q)) &&
           (rackFilter === "all" || l.rack === rackFilter) &&
           (statusFilter === "all" ? true : statusFilter === "NotAvailable" ? l.status !== "Available" : l.status === statusFilter)
  })

  // Cascading lists for Global Assign
  const gaBays = [...new Set(locations.filter(l => l.rack === gaRack).map(l => l.bay))]
  const gaLevels = [...new Set(locations.filter(l => l.rack === gaRack && String(l.bay) === String(gaBay)).map(l => l.level))]
  const gaSlots = locations.filter(l => l.rack === gaRack && String(l.bay) === String(gaBay) && l.level === gaLevel && l.status === "Available")

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
              <Button onClick={() => setGlobalAssignOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white border-none"><Link size={15}/> Assign Material</Button>
              <Button onClick={() => setAddOpen(true)} className="flex-1 sm:flex-none"><Plus size={15}/> Add Location</Button>
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
                {filtered.map(l => (
                  <tr key={l.locationId}>
                    <td><LocationBadge locationId={l.locationId} /></td>
                    <td className="text-center font-mono text-xs">{l.rack}</td>
                    <td className="text-center font-mono text-xs">{String(l.bay).padStart(2,"0")}</td>
                    <td className="text-center font-mono text-xs">{l.level}</td>
                    <td className="text-center font-mono text-xs">{l.slot}</td>
                    <td className="text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${l.status === "Occupied" ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"}`}>
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
                        <button title="Assign material" onClick={() => { setAssignOpen(l.locationId); setAssignMatId(l.materialId || "") }}
                          className="text-muted-foreground hover:text-primary p-1 transition-colors"><Link size={13}/></button>
                        {l.materialId && <button title="Unassign" onClick={() => { unassignMaterial(l.locationId); toast({ title: "Material unassigned", variant: "warning" }) }}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"><Unlink size={13}/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <Select value={newLoc.rack} onValueChange={v => setNewLoc(f => ({ ...f, rack: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{racks.filter(r => r.status !== "Inactive").map(r => <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bay (number)</Label>
                <Input type="number" min="1" value={newLoc.bay} onChange={e => setNewLoc(f => ({ ...f, bay: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={newLoc.level} onValueChange={v => setNewLoc(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Slot</Label>
                <Input value={newLoc.slot} onChange={e => setNewLoc(f => ({ ...f, slot: e.target.value.toUpperCase() }))} placeholder="A, A1, B..." className="font-mono uppercase" />
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
              <Input value={newLoc.notes} onChange={e => setNewLoc(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLocation}>Add Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Material */}
      <Dialog open={!!assignOpen} onOpenChange={() => { setAssignOpen(null); setAssignMatId("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Material</DialogTitle>
            <DialogDescription>Assign a material to <span className="font-mono text-primary">{assignOpen}</span></DialogDescription>
          </DialogHeader>
          <div className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Select Material</Label>
              <Select value={assignMatId} onValueChange={setAssignMatId}>
                <SelectTrigger><SelectValue placeholder="Choose material..." /></SelectTrigger>
                <SelectContent>
                  {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.id} — {m.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignOpen(null); setAssignMatId("") }}>Cancel</Button>
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
                <p className="text-xs text-muted-foreground">Will assign {gaMat} to:</p>
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

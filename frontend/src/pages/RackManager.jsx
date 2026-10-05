import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { Settings, Plus, CheckCircle2, Layers, Pencil } from "lucide-react"

const LEVELS_OPTIONS = ["GL1","GL2","GL3","SL4","SL5","SL6"]

export default function RackManager() {
  const racks = useWarehouseStore(s => s.racks ?? [])
  const addRack = useWarehouseStore(s => s.addRack)
  const updateRack = useWarehouseStore(s => s.updateRack)
  const toggleRackStatus = useWarehouseStore(s => s.toggleRackStatus)
  const locations = useWarehouseStore(s => s.locations ?? [])
  const { toast } = useToast()

  const [open, setOpen] = React.useState(false)
  const [editingRackId, setEditingRackId] = React.useState(null)
  
  const emptyForm = { id: "", type: "Pallet Rack", description: "", bayCount: 4, levels: "GL1, GL2, GL3", slots: "A, B", side: "Double-sided", status: "Active" }
  const [form, setForm] = React.useState(emptyForm)

  const getRackStats = (rackId) => {
    const locs = locations.filter(l => l.rack === rackId)
    return { total: locs.length, occupied: locs.filter(l => l.status === "Occupied").length }
  }

  const getMaxOccupiedBay = (rackId) => {
    const locs = locations.filter(l => l.rack === rackId && !!l.materialId)
    if (locs.length === 0) return 1
    return Math.max(...locs.map(l => l.bay))
  }

  const openAdd = () => { setEditingRackId(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (rack) => { 
    setEditingRackId(rack.id); 
    setForm({ 
      ...rack, 
      levels: Array.isArray(rack.levels) ? rack.levels.join(", ") : (rack.levels || "GL1, GL2"),
      slots: Array.isArray(rack.slots) ? rack.slots.join(", ") : (rack.slots || "A, B")
    }); 
    setOpen(true) 
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    try {
      if (editingRackId) {
        const minBay = getMaxOccupiedBay(editingRackId)
        if (Number(form.bayCount) < minBay) {
          toast({ title: "Cannot reduce bays", description: `Bay ${minBay} is currently occupied!`, variant: "destructive" })
          return
        }
        await updateRack(editingRackId, { ...form, bayCount: Number(form.bayCount), levels: form.levels?.split(",").map(s => s.trim()).filter(Boolean), slots: form.slots?.split(",").map(s => s.trim()).filter(Boolean) })
        toast({ title: "Rack updated", variant: "success" })
      } else {
        if (!form.id) { toast({ title: "Rack ID required", variant: "destructive" }); return }
        if (racks.find(r => r.id === form.id)) { toast({ title: "Rack ID already exists", variant: "destructive" }); return }
        await addRack({ ...form, bayCount: Number(form.bayCount), levels: form.levels?.split(",").map(s => s.trim()).filter(Boolean), slots: form.slots?.split(",").map(s => s.trim()).filter(Boolean) })
        toast({ title: "Rack added", description: form.id, variant: "success" })
      }
      setOpen(false)
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const handleToggleStatus = async (rackId, currentStatus) => {
    try {
      await toggleRackStatus(rackId, currentStatus)
      const next = currentStatus === "Active" ? "Inactive" : "Active"
      toast({ title: `Rack ${rackId} set to ${next}`, variant: "default" })
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-sm text-muted-foreground">{racks.length} racks configured</h2>
        </div>
        <Button onClick={openAdd}><Plus size={15}/> Add Rack</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {racks.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary/30 border border-border flex items-center justify-center mb-4">
              <Layers size={28} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-foreground">No racks configured</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Add your first physical rack to start building your warehouse layout.</p>
            <Button onClick={openAdd}><Plus size={14}/> Add First Rack</Button>
          </div>
        )}
        {racks.map(rack => {
          const stats = getRackStats(rack.id)
          const pct = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0
          return (
            <Card key={rack.id} className={`glass-hover ${rack.status === "Inactive" ? "opacity-50" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">{rack.id}</CardTitle>
                    <p className="text-xs text-muted-foreground">{rack.type} · {rack.side}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${rack.status === "Active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}`}>
                    {rack.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{rack.description}</p>

                {/* Occupancy bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Occupancy</span>
                    <span className="font-semibold text-foreground">{stats.occupied}/{stats.total} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Bays & Levels */}
                <div className="grid grid-cols-2 gap-2 text-xs items-stretch">
                  <div className="rounded-lg bg-secondary/30 p-2 h-full flex flex-col justify-center">
                    <p className="text-muted-foreground">Bays</p>
                    <p className="font-bold text-foreground text-lg leading-none mt-1">{rack.bayCount}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-2 h-full">
                    <p className="text-muted-foreground">Levels</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(Array.isArray(rack.levels) ? rack.levels : rack.levels?.split(", ") || []).map(l => (
                        <span key={l} className="text-[9px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">{l}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(rack)}>
                    <Pencil size={13} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleToggleStatus(rack.id, rack.status)}>
                    {rack.status === "Active" ? "Archive" : "Restore"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRackId ? "Edit Rack" : "Add New Rack"}</DialogTitle>
            <DialogDescription>{editingRackId ? `Updating configuration for ${editingRackId}` : "Configure a new physical rack row in the warehouse"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rack ID <span className="text-destructive">*</span></Label>
                <Input value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="e.g. R11" className="font-mono" required disabled={!!editingRackId} />
              </div>
              <div className="space-y-1.5">
                <Label>Bay Count</Label>
                <Input type="number" min="1" max="20" value={form.bayCount} onChange={e => setForm({ ...form, bayCount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Rack 11 (4 Bays, 6 Levels)" />
            </div>
            <div className="space-y-1.5">
              <Label>Levels (comma separated)</Label>
              <Input value={form.levels} onChange={e => setForm({ ...form, levels: e.target.value.toUpperCase() })} placeholder="e.g. GL1, GL2, SL3" />
            </div>
            <div className="space-y-1.5">
              <Label>Slots per Level (comma separated)</Label>
              <Input value={form.slots} onChange={e => setForm({ ...form, slots: e.target.value.toUpperCase() })} placeholder="e.g. A, B, C" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Auto-generates physical locations (e.g. {form.id || "R11"}-B01-{(form.levels||"").split(",")[0]?.trim() || "GL1"}-{(form.slots||"").split(",")[0]?.trim() || "A"})
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pallet Rack">Pallet Rack</SelectItem>
                    <SelectItem value="Shelving Rack">Shelving Rack</SelectItem>
                    <SelectItem value="Drive-In Rack">Drive-In Rack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Side Access</Label>
                <Select value={form.side} onValueChange={v => setForm(f => ({ ...f, side: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Double-sided">Double-sided</SelectItem>
                    <SelectItem value="Single-sided">Single-sided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingRackId ? "Save Changes" : "Add Rack"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

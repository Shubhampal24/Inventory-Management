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
import { formatDate, UNITS } from "@/lib/utils"
import { Plus, ArrowUpCircle, ArrowDownCircle, Search, Trash2, ArrowLeftRight } from "lucide-react"
import { computeLocationId } from "@/lib/store/useWarehouseStore"



export default function StockMovement() {
  const enrichedMovements = useWarehouseStore(s => s.enrichedMovements ?? [])
  const materialMasterBase = useWarehouseStore(s => s.materialMasterBase ?? [])
  const locationMasterBase = useWarehouseStore(s => s.locationMasterBase ?? [])
  const addMovement = useWarehouseStore(s => s.addMovement)
  const deleteMovement = useWarehouseStore(s => s.deleteMovement)
  const { toast } = useToast()

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const currentUser = useWarehouseStore(s => s.currentUser || "")
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: "", locationId: "", type: "IN",
    quantity: "", unit: "", reference: "", user: currentUser, notes: ""
  })

  React.useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, user: f.user || currentUser }))
    }
  }, [open, currentUser])

  const filtered = React.useMemo(() => {
    return [...enrichedMovements].reverse().filter(m => {
      const q = search.toLowerCase()
      const matchSearch = !q || m.materialId?.toLowerCase().includes(q) || m.materialDesc?.toLowerCase().includes(q) || m.locationId?.toLowerCase().includes(q) || m.reference?.toLowerCase().includes(q)
      const matchType = typeFilter === "all" || m.type === typeFilter
      return matchSearch && matchType
    })
  }, [enrichedMovements, search, typeFilter])

  // Auto-fill unit and location when material selected
  const handleMaterialChange = (matId) => {
    const mat = materialMasterBase.find(m => m.id === matId)
    const loc = locationMasterBase.find(l => l.materialId === matId)
    setForm(f => ({ ...f, materialId: matId, unit: mat?.unit || "", locationId: loc?.locationId || "" }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.materialId || !form.locationId || !form.quantity || !form.type) {
      toast({ title: "Missing fields", description: "Material, location, quantity and type are required.", variant: "destructive" })
      return
    }
    addMovement({
      ...form,
      quantity: parseFloat(form.quantity),
    })
    toast({ title: "Movement recorded", description: `${form.type} of ${form.quantity} ${form.unit} added successfully.`, variant: "success" })
    setOpen(false)
    setForm({ date: new Date().toISOString().slice(0, 10), materialId: "", locationId: "", type: "IN", quantity: "", unit: "", reference: "", user: "Sanika", notes: "" })
  }

  const totalIn = enrichedMovements.filter(m => m.type === "IN").reduce((s, m) => s + m.quantity, 0)
  const totalOut = enrichedMovements.filter(m => m.type === "OUT").reduce((s, m) => s + m.quantity, 0)

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
            <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
              <Plus size={15}/> Add Movement
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
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
                      <button onClick={() => { deleteMovement(m.id); toast({ title: "Movement deleted", variant: "warning" }) }}
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
          <form onSubmit={handleSubmit} className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Type toggle */}
            <div>
              <Label className="mb-2 block">Transaction Type</Label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {["IN","OUT"].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2.5 text-sm font-bold transition-all ${form.type === t
                      ? t === "IN" ? "bg-emerald-500/20 text-emerald-400 border-r border-emerald-500/30"
                                    : "bg-red-500/20 text-red-400"
                      : "text-muted-foreground hover:bg-secondary/50"}`}
                  >
                    {t === "IN" ? "⬆ IN" : "⬇ OUT"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>User</Label>
                <Input value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Material <span className="text-destructive">*</span></Label>
              <Input 
                list="sm-materials"
                value={form.materialId}
                onChange={e => handleMaterialChange(e.target.value.toUpperCase())}
                placeholder="Type or select material ID..."
                required
              />
              <datalist id="sm-materials">
                {materialMasterBase.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.description}</option>
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label>Location ID <span className="text-destructive">*</span></Label>
              <Input 
                list="sm-locations"
                value={form.locationId}
                onChange={e => setForm(f => ({ ...f, locationId: e.target.value.toUpperCase() }))}
                placeholder="e.g. R01-B01-GL1-A1" 
                className="font-mono" 
                required 
              />
              <datalist id="sm-locations">
                {locationMasterBase.map(l => (
                  <option key={l.locationId} value={l.locationId}>{l.status}</option>
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue placeholder="Unit..." /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reference (PO / SO number)</Label>
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. PO-1234 or SO-5678" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant={form.type === "IN" ? "success" : "destructive"}
              onClick={handleSubmit}
            >
              {form.type === "IN" ? "Record IN" : "Record OUT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

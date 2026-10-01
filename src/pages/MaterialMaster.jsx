import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CategoryBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { CATEGORIES, UNITS } from "@/lib/utils"
import { Plus, Search, Pencil, Trash2, Database } from "lucide-react"

const emptyForm = { id: "", name: "", description: "", category: "ELECTRIC", unit: "PCS", reorderLevel: 10 }

export default function MaterialMaster() {
  const materials = useWarehouseStore(s => s.materialMasterBase ?? [])
  const addMaterial = useWarehouseStore(s => s.addMaterial)
  const updateMaterial = useWarehouseStore(s => s.updateMaterial)
  const deleteMaterial = useWarehouseStore(s => s.deleteMaterial)
  const { toast } = useToast()

  const [search, setSearch] = React.useState("")
  const [catFilter, setCatFilter] = React.useState("all")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(null)
  const [form, setForm] = React.useState(emptyForm)

  const filtered = materials.filter(m => {
    const q = search.toLowerCase()
    return (!q || m.id.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) &&
           (catFilter === "all" || m.category === catFilter)
  })

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (m) => { setEditing(m.id); setForm({ id: m.id, name: m.name || m.description, description: m.description, category: m.category, unit: m.unit, reorderLevel: m.reorderLevel }); setOpen(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.id || !form.name) { toast({ title: "ID and Name required", variant: "destructive" }); return }
    if (editing) {
      updateMaterial(editing, { name: form.name, description: form.description, category: form.category, unit: form.unit, reorderLevel: Number(form.reorderLevel) })
      toast({ title: "Material updated", variant: "success" })
    } else {
      if (materials.find(m => m.id === form.id)) { toast({ title: "ID already exists", variant: "destructive" }); return }
      addMaterial({ ...form, reorderLevel: Number(form.reorderLevel) })
      toast({ title: "Material added", variant: "success" })
    }
    setOpen(false)
  }

  const handleDelete = (id) => {
    if (!confirm(`Delete material ${id}?`)) return
    deleteMaterial(id)
    toast({ title: "Material deleted", variant: "warning" })
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2 flex-1">
              <Database size={16} className="text-primary"/>
              Material Master ({filtered.length} materials)
            </CardTitle>
            <Button onClick={openAdd}><Plus size={15}/> Add Material</Button>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID or description..." className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setCatFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${catFilter === "all" ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >All</button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${catFilter === c ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >{c}</button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full wms-table min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left">Material ID</th>
                <th className="text-left">Name</th>
                <th className="text-left">Description</th>
                <th>Category</th>
                <th className="text-center">Unit</th>
                <th className="text-right">Reorder Level</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td className="font-mono text-xs text-primary">{m.id}</td>
                  <td className="font-medium text-foreground">{m.name || m.description}</td>
                  <td className="text-muted-foreground max-w-[200px] truncate text-xs">{m.description}</td>
                  <td className="text-center"><CategoryBadge category={m.category} /></td>
                  <td className="text-center font-mono text-xs text-muted-foreground">{m.unit}</td>
                  <td className="text-right font-mono text-sm text-amber-400">{m.reorderLevel}</td>
                  <td className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(m)} className="text-muted-foreground hover:text-primary p-1 transition-colors"><Pencil size={13}/></button>
                      <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive p-1 transition-colors"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Material" : "Add Material"}</DialogTitle>
            <DialogDescription>
              {editing ? `Editing ${editing}` : "New material will be added to the Material Master."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Material ID <span className="text-destructive">*</span></Label>
                <Input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))}
                  placeholder="e.g. MAT050" disabled={!!editing} className="font-mono" required />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Material Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="Material Name" required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional detailed description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input 
                  list="categories-list" 
                  value={form.category} 
                  onChange={e => setForm(f => ({ ...f, category: e.target.value.toUpperCase() }))} 
                  placeholder="Type or select category"
                  required
                />
                <datalist id="categories-list">
                  {CATEGORIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} />
              </div>
            </div>

          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? "Save Changes" : "Add Material"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

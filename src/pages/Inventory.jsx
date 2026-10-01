import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StockBadge, CategoryBadge, LocationBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { CATEGORIES } from "@/lib/utils"
import { Search, Download, Filter, Package } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Inventory() {
  const inventory = useWarehouseStore(s => s.inventory ?? [])
  const navigate = useNavigate()

  const [search, setSearch] = React.useState("")
  const [catFilter, setCatFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("materialId")

  const filtered = React.useMemo(() => {
    return inventory
      .filter(i => {
        const q = search.toLowerCase()
        const matchSearch = !q || i.materialId?.toLowerCase().includes(q) || i.materialDesc?.toLowerCase().includes(q) || i.locationId?.toLowerCase().includes(q)
        const matchCat = catFilter === "all" || i.category === catFilter
        const matchStatus = statusFilter === "all" || i.status === statusFilter
        return matchSearch && matchCat && matchStatus
      })
      .sort((a, b) => {
        if (sortBy === "stock") return b.currentStock - a.currentStock
        if (sortBy === "status") return a.status.localeCompare(b.status)
        return a.materialId.localeCompare(b.materialId)
      })
  }, [inventory, search, catFilter, statusFilter, sortBy])

  const exportCSV = () => {
    const headers = ["Material ID","Description","Category","Location","Stock IN","Stock OUT","Current","Unit","Reorder","Status"]
    const rows = filtered.map(i => [i.materialId,i.materialDesc,i.category,i.locationId,i.stockIn,i.stockOut,i.currentStock,i.unit,i.reorderLevel,i.status])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click()
  }

  const stats = React.useMemo(() => ({
    ok: inventory.filter(i => i.status === "OK").length,
    reorder: inventory.filter(i => i.status === "REORDER").length,
    empty: inventory.filter(i => i.status === "EMPTY").length,
  }), [inventory])

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Status summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "OK", count: stats.ok, color: "emerald" },
          { label: "REORDER", count: stats.reorder, color: "amber" },
          { label: "EMPTY", count: stats.empty, color: "red" },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.label ? "all" : s.label)}
            className={`rounded-xl border p-3 text-left transition-all ${statusFilter === s.label ? `bg-${s.color}-500/15 border-${s.color}-500/40` : "glass border-border hover:border-primary/30"}`}
          >
            <p className={`text-2xl font-bold text-${s.color}-600 dark:text-${s.color}-400`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              Inventory ({filtered.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={exportCSV} className="w-full sm:w-auto"><Download size={13}/> Export CSV</Button>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search material, ID, location..." className="pl-9" />
            </div>
            <div className="w-40">
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="REORDER">REORDER</SelectItem>
                  <SelectItem value="EMPTY">EMPTY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="materialId">Sort: ID</SelectItem>
                  <SelectItem value="stock">Sort: Stock</SelectItem>
                  <SelectItem value="status">Sort: Status</SelectItem>
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
                  <th className="text-left">Material</th>
                  <th className="text-left">Category</th>
                  <th className="text-left">Location</th>
                  <th className="text-right">Stock IN</th>
                  <th className="text-right">Stock OUT</th>
                  <th className="text-right">Current</th>
                  <th className="text-right">Reorder At</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.materialId} className="cursor-pointer" onClick={() => navigate("/movements")}>
                    <td>
                      <p className="font-medium text-foreground">{item.materialDesc}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{item.materialId}</p>
                    </td>
                    <td><CategoryBadge category={item.category} /></td>
                    <td><LocationBadge locationId={item.locationId} /></td>
                    <td className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">{item.stockIn}</td>
                    <td className="text-right font-mono text-sm text-red-600 dark:text-red-400">{item.stockOut}</td>
                    <td className="text-right">
                      <span className="font-mono font-bold text-foreground">{Number(item.currentStock).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                    </td>
                    <td className="text-right font-mono text-sm text-muted-foreground">{item.reorderLevel} {item.unit}</td>
                    <td className="text-center"><StockBadge status={item.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No items match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

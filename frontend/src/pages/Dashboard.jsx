import * as React from "react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StockBadge, CategoryBadge, LocationBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatQty, CATEGORY_COLORS } from "@/lib/utils"
import {
  Package, MapPin, AlertTriangle, ArrowLeftRight, TrendingUp, TrendingDown,
  ArrowUpRight, RefreshCw, CheckCircle2
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"

function KPICard({ title, value, sub, icon: Icon, color, trend, onClick }) {
  const colors = {
    blue:   { bg: "from-blue-500/10 to-blue-500/5 dark:from-blue-600/20 dark:to-blue-500/5",   icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",  border: "border-blue-500/20" },
    green:  { bg: "from-emerald-500/10 to-emerald-500/5 dark:from-emerald-600/20 dark:to-emerald-500/5", icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
    amber:  { bg: "from-amber-500/10 to-amber-500/5 dark:from-amber-600/20 dark:to-amber-500/5",  icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",  border: "border-amber-500/20" },
    cyan:   { bg: "from-cyan-500/10 to-cyan-500/5 dark:from-cyan-600/20 dark:to-cyan-500/5",    icon: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",    border: "border-cyan-500/20" },
  }
  const c = colors[color] || colors.blue
  return (
    <div
      onClick={onClick}
      className={`glass-hover rounded-2xl p-5 bg-gradient-to-br ${c.bg} border ${c.border} cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`rounded-xl p-2.5 ${c.icon}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground mb-0.5">{value}</p>
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

const CHART_COLORS = Object.values(CATEGORY_COLORS).map(c => c.dot)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs text-foreground">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}


export default function Dashboard() {
  const navigate = useNavigate()
  // Select raw primitives/arrays only — never call getter functions inside useWarehouseStore selectors
  const inventory        = useWarehouseStore(s => s.inventory ?? [])
  const enrichedMovements = useWarehouseStore(s => s.enrichedMovements ?? [])
  const locations        = useWarehouseStore(s => s.locations ?? [])
  const movements        = useWarehouseStore(s => s.movements ?? [])

  // Compute derived values with useMemo so they're stable between renders
  const stats = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      totalMaterials: inventory.length,
      totalLocations: locations.length,
      occupiedLocations: locations.filter(l => l.status === 'Occupied').length,
      availableLocations: locations.filter(l => l.status === 'Available').length,
      reorderAlerts: inventory.filter(i => i.status === 'REORDER' || i.status === 'EMPTY').length,
      emptyAlerts: inventory.filter(i => i.status === 'EMPTY').length,
      todayMovements: movements.filter(m => m.date === today).length,
      totalIn: movements.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
      totalOut: movements.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
    }
  }, [inventory, locations, movements])

  const trend = React.useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayMovs = movements.filter(m => m.date === dateStr)
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
        in:  dayMovs.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
        out: dayMovs.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
      })
    }
    return days
  }, [movements])

  const catData = React.useMemo(() => {
    const catMap = {}
    inventory.forEach(item => {
      const cat = item.category || 'Unknown'
      if (!catMap[cat]) catMap[cat] = { category: cat, count: 0, totalStock: 0 }
      catMap[cat].count++
      catMap[cat].totalStock += item.currentStock
    })
    return Object.values(catMap)
  }, [inventory])

  const reorderItems = React.useMemo(() => inventory.filter(i => i.status === 'REORDER' || i.status === 'EMPTY'), [inventory])
  const recentMovs   = React.useMemo(() => [...enrichedMovements].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6), [enrichedMovements])
  const topLocations = React.useMemo(() => locations.filter(l => l.status === 'Occupied').slice(0, 5), [locations])



  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <KPICard
          title="Active Materials" value={stats.totalMaterials} sub={`across ${stats.totalLocations} locations`}
          icon={Package} color="blue" onClick={() => navigate("/inventory")}
        />
        <KPICard
          title="Available Slots" value={stats.availableLocations} sub={`${stats.occupiedLocations} occupied`}
          icon={MapPin} color="green" onClick={() => navigate("/locations")}
        />
        <KPICard
          title="Reorder Alerts" value={stats.reorderAlerts} sub="need restocking now"
          icon={AlertTriangle} color="amber" onClick={() => navigate("/inventory")}
        />
        <KPICard
          title="Total Movements" value={enrichedMovements.length} sub={`${stats.totalIn.toFixed(0)} in / ${stats.totalOut.toFixed(0)} out`}
          icon={ArrowLeftRight} color="cyan" onClick={() => navigate("/movements")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Movement Trend */}
        <Card className="lg:col-span-2 glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-primary" />
              Movement Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="in"  name="IN"  stroke="#10b981" fill="url(#gradIn)"  strokeWidth={2} />
                <Area type="monotone" dataKey="out" name="OUT" stroke="#ef4444" fill="url(#gradOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={catData} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3}>
                  {catData.map((entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {catData.map((c, i) => (
                <div key={c.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground">{c.category}</span>
                  </div>
                  <span className="font-semibold text-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reorder Alerts */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={16} />
              Reorder Alerts ({reorderItems.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate("/inventory")}>
              View All <ArrowUpRight size={13}/>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {reorderItems.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm p-5">
                <CheckCircle2 size={16}/> All stock levels are healthy
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full wms-table">
                  <thead><tr><th className="text-left">Material</th><th>Stock</th><th>Status</th></tr></thead>
                  <tbody>
                    {reorderItems.slice(0, 6).map(item => (
                      <tr key={item.materialId}>
                        <td>
                          <p className="font-medium text-foreground truncate max-w-[150px]">{item.materialDesc}</p>
                          <LocationBadge locationId={item.locationId} className="mt-0.5" />
                        </td>
                        <td className="text-center font-mono text-sm">
                          {item.currentStock.toFixed(2)} <span className="text-muted-foreground">{item.unit}</span>
                        </td>
                        <td className="text-right"><StockBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-cyan-400"/>
              Recent Movements
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate("/movements")}>
              View All <ArrowUpRight size={13}/>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="w-full wms-table">
                <thead><tr><th className="text-left">Material</th><th>Qty</th><th>Type</th><th>Date</th></tr></thead>
                <tbody>
                  {recentMovs.map(m => (
                    <tr key={m.id}>
                      <td>
                        <p className="font-medium text-foreground truncate max-w-[130px]">{m.materialDesc || m.materialId}</p>
                        <p className="text-[11px] text-muted-foreground">{m.user}</p>
                      </td>
                      <td className="text-center font-mono text-sm">{m.quantity} <span className="text-muted-foreground text-xs">{m.unit}</span></td>
                      <td className="text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${m.type === "IN" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="text-right text-xs text-muted-foreground">{formatDate(m.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

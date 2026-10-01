import * as React from "react"
import { useLocation } from "react-router-dom"
import { Search, Bell, Warehouse, CloudUpload, Loader2, Menu, Sun, Moon } from "lucide-react"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const routeLabels = {
  "/":             { title: "Dashboard",       subtitle: "Overview of your warehouse" },
  "/rack-map":     { title: "Rack Map",        subtitle: "Visual warehouse layout" },
  "/inventory":    { title: "Inventory",       subtitle: "Stock levels & status" },
  "/movements":    { title: "Stock Movement",  subtitle: "IN/OUT transaction log" },
  "/materials":    { title: "Material Master", subtitle: "Material catalog management" },
  "/locations":    { title: "Location Master", subtitle: "Location configuration" },
  "/rack-manager": { title: "Rack Manager",    subtitle: "Rack & bay configuration" },
  "/labels":       { title: "Rack Labels",     subtitle: "Print location labels" },
  "/reference":    { title: "Reference",       subtitle: "Safety rules & data dictionary" },
}

export function TopBar({ collapsed, setMobileOpen }) {
  const location = useLocation()
  const setCommandOpen = useWarehouseStore(s => s.setCommandOpen)
  const theme = useWarehouseStore(s => s.theme)
  const toggleTheme = useWarehouseStore(s => s.toggleTheme)
  // Select a primitive directly — calling s.getInventoryStats() inside selector
  // returns a new object every render which triggers an infinite loop
  const reorderAlerts = useWarehouseStore(s => (s.inventory ?? []).filter(i => i.status === 'REORDER').length)
  const isSyncing = useWarehouseStore(s => s.isSyncing)
  const syncToGoogleSheets = useWarehouseStore(s => s.syncToGoogleSheets)
  const { toast } = useToast()
  
  const info = routeLabels[location.pathname] || { title: "RackOS", subtitle: "" }

  const handleSync = async () => {
    if (!window.confirm("Are you sure you want to sync and overwrite data in Google Sheets?")) return
    toast({ title: "Syncing...", description: "Pushing data to Google Sheets" })
    const success = await syncToGoogleSheets()
    if (success) {
      toast({ title: "Sync Complete", description: "All data successfully pushed to Google Sheets", variant: "success" })
    } else {
      toast({ title: "Sync Failed", description: "Could not reach Google Sheets", variant: "destructive" })
    }
  }

  return (
    <header className="shrink-0 z-30 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 border-b border-border bg-card/90 backdrop-blur-xl w-full">
      <button 
        className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50 shrink-0"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} />
      </button>
      <div className="flex-1 min-w-0 hidden sm:block">
        <h1 className="text-base font-semibold text-foreground truncate">{info.title}</h1>
        <p className="text-xs text-muted-foreground">{info.subtitle}</p>
      </div>
      <div className="flex-1 min-w-0 sm:hidden">
        <h1 className="text-sm font-bold text-foreground truncate">{info.title}</h1>
      </div>

      {/* Search */}
      <button
        onClick={() => setCommandOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-2 sm:px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors shrink-0"
      >
        <Search size={14} />
        <span className="hidden sm:block">Search...</span>
        <kbd className="hidden sm:block text-xs border border-border rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>

      {/* Cloud Sync */}
      <button 
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 sm:px-3 py-1.5 text-sm font-semibold text-emerald-400 transition-colors disabled:opacity-50 shrink-0"
      >
        {isSyncing ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
        <span className="hidden sm:block">Sync Sheets</span>
      </button>

      {/* Alert bell */}
      <button className="relative rounded-lg border border-border p-2 hover:bg-secondary/50 transition-colors shrink-0">
        <Bell size={16} className="text-muted-foreground" />
        {reorderAlerts > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
            {reorderAlerts}
          </span>
        )}
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="rounded-lg border border-border p-2 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {theme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-blue-600" />}
      </button>

      {/* User */}
      <div className="flex items-center gap-2 relative group shrink-0">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-md cursor-pointer shrink-0">
          {useWarehouseStore(s => s.currentUser || "U").charAt(0).toUpperCase()}
        </div>
        <input 
          type="text" 
          value={useWarehouseStore(s => s.currentUser)} 
          onChange={(e) => useWarehouseStore.getState().setCurrentUser(e.target.value)}
          className="hidden sm:block bg-transparent text-sm font-medium border-none outline-none w-28 placeholder:text-muted-foreground focus:w-36 transition-all duration-200"
          placeholder="Your Name..."
        />
      </div>
    </header>
  )
}

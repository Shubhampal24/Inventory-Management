import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { useAuth } from "@/context/AuthContext"
import {
  LayoutDashboard, Map, Package, ArrowLeftRight, Database,
  MapPin, Tag, Settings, BookOpen, Warehouse, ChevronLeft, ChevronRight,
  AlertTriangle, LogOut, UserCircle2
} from "lucide-react"

const navItems = [
  { path: "/",            icon: LayoutDashboard, label: "Dashboard",       group: "overview" },
  { path: "/rack-map",    icon: Map,             label: "Rack Map",        group: "overview" },
  { path: "/inventory",   icon: Package,         label: "Inventory",       group: "operations" },
  { path: "/movements",   icon: ArrowLeftRight,  label: "Stock Movement",  group: "operations" },
  { path: "/materials",   icon: Database,        label: "Material Master", group: "master" },
  { path: "/locations",   icon: MapPin,          label: "Location Master", group: "master" },
  { path: "/rack-manager",icon: Settings,        label: "Rack Manager",    group: "master" },
  { path: "/labels",      icon: Tag,             label: "Rack Labels",     group: "tools" },
  { path: "/reference",   icon: BookOpen,        label: "Reference",       group: "tools" },
]

const groups = {
  overview:   "Overview",
  operations: "Operations",
  master:     "Master Data",
  tools:      "Tools",
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const reorderAlerts = useWarehouseStore(s => (s.inventory ?? []).filter(i => i.status === 'REORDER' || i.status === 'EMPTY').length)

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 dark:bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-screen z-50 flex flex-col transition-transform duration-300",
        "border-r border-border bg-card/95 backdrop-blur-xl",
        collapsed ? "md:w-16" : "md:w-60",
        "w-64 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-border", collapsed && "md:justify-center md:px-2")}>
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Warehouse size={16} className="text-white" />
        </div>
        <div className={cn("min-w-0", collapsed && "md:hidden")}>
          <p className="text-sm font-bold gradient-text truncate">RackOS</p>
          <p className="text-[10px] text-muted-foreground truncate">Warehouse Management</p>
        </div>
      </div>

      {/* Alert pill */}
      {reorderAlerts > 0 && (
        <div className={cn("mx-3 mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2", collapsed && "md:hidden")}>
          <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{reorderAlerts} reorder alerts</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {Object.entries(groups).map(([gKey, gLabel]) => {
          const items = navItems.filter(n => n.group === gKey)
          return (
            <div key={gKey} className="mb-3">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1", collapsed && "md:hidden")}>{gLabel}</p>
              {items.map(item => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 mb-0.5 border border-transparent",
                      isActive ? "nav-item-active" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                      collapsed && "md:justify-center md:px-2"
                    )}
                    onClick={() => { if (window.innerWidth < 768) setMobileOpen(false) }}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className={cn("truncate", collapsed && "md:hidden")}>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User info + Logout */}
      <div className={cn("border-t border-border px-3 py-3", collapsed && "md:px-2")}>
        {!collapsed && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <UserCircle2 size={14} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'Warehouse Manager'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.userId || ''}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className={cn(
            "w-full flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && "md:justify-center"
          )}
        >
          <LogOut size={14} />
          <span className={cn(collapsed && "md:hidden")}>Logout</span>
        </button>
      </div>

      {/* Collapse toggle (Desktop only) */}
      <div className="border-t border-border p-2 hidden md:block">
        <button
          onClick={() => setCollapsed(v => !v)}
          className={cn("w-full flex items-center gap-2 rounded-lg px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-sm", collapsed && "justify-center")}
        >
          {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span className="text-xs">Collapse</span></>}
        </button>
      </div>
    </aside>
    </>
  )
}


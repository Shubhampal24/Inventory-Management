import * as React from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { cn } from "@/lib/utils"
import CommandPalette from "@/components/CommandPalette"

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Auto-close mobile menu on resize to desktop
  React.useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="h-screen h-[100dvh] bg-background flex w-full overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className={cn("flex-1 flex flex-col h-full min-w-0 overflow-hidden transition-all duration-300", collapsed ? "md:ml-16" : "md:ml-60")}>
        <TopBar collapsed={collapsed} setMobileOpen={setMobileOpen} />
        <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden min-h-0 w-full">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}

import * as React from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { cn } from "@/lib/utils"
import CommandPalette from "@/components/CommandPalette"

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={cn("flex-1 flex flex-col transition-all duration-300", collapsed ? "ml-16" : "ml-60")}>
        <TopBar collapsed={collapsed} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}

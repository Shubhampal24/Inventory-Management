import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext({})

export function Tabs({ value, onValueChange, defaultValue, children, className }) {
  const [internal, setInternal] = React.useState(defaultValue || "")
  const active = value ?? internal
  return (
    <TabsContext.Provider value={{ active, onChange: onValueChange ?? setInternal }}>
      <div className={cn("", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto no-scrollbar items-center gap-1 rounded-xl bg-secondary/50 p-1", className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }) {
  const { active, onChange } = React.useContext(TabsContext)
  const isActive = active === value
  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0",
        isActive
          ? "bg-card text-foreground shadow border border-border"
          : "text-muted-foreground hover:text-foreground hover:bg-card/50",
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }) {
  const { active } = React.useContext(TabsContext)
  if (active !== value) return null
  return <div className={cn("animate-fade-in-up", className)}>{children}</div>
}

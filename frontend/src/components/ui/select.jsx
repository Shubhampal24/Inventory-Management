import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

import { createPortal } from "react-dom"

export function Select({ value, onValueChange, children, disabled }) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef(null)
  const triggerRef = React.useRef(null)

  React.useEffect(() => {
    const handler = (e) => { 
      // Close if clicking outside the container and outside the portal content
      if (containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('[data-select-content]')) {
        setOpen(false) 
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const contextValue = React.useMemo(() => ({
    value, onValueChange: (v) => { onValueChange?.(v); setOpen(false) },
    open, setOpen, disabled, triggerRef
  }), [value, onValueChange, open, disabled])

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectContext = React.createContext({})

export function SelectTrigger({ className, children }) {
  const { open, setOpen, disabled, triggerRef } = React.useContext(SelectContext)
  return (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      onClick={() => setOpen(v => !v)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm",
        "hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
    </button>
  )
}

export function SelectValue({ placeholder, children, className }) {
  const { value } = React.useContext(SelectContext)
  const display = children !== undefined && children !== null ? children : (value || placeholder)
  return <span className={cn(!value && !children ? "text-muted-foreground" : "truncate", className)}>{display}</span>
}

export function SelectContent({ className, children }) {
  const { open, triggerRef } = React.useContext(SelectContext)
  const [style, setStyle] = React.useState({})

  React.useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [open, triggerRef])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div 
      data-select-content
      style={style}
      className={cn(
        "fixed z-[100] rounded-xl border border-border bg-popover shadow-xl",
        "max-h-64 overflow-y-auto animate-fade-in-up",
        className
      )}
    >
      {children}
    </div>,
    document.body
  )
}

export function SelectItem({ value, children, className }) {
  const ctx = React.useContext(SelectContext)
  const isSelected = ctx.value === value
  return (
    <div
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        "px-3 py-2 text-sm cursor-pointer transition-colors",
        isSelected ? "bg-primary/15 text-primary" : "hover:bg-secondary/50 text-foreground"
      )}
    >
      {children}
    </div>
  )
}
export function SelectGroup({ children }) { return <div>{children}</div> }
export function SelectLabel({ children }) { return <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{children}</div> }

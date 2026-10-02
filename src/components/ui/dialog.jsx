import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const DialogContext = React.createContext({})

export function Dialog({ open, onOpenChange, children }) {
  const value = React.useMemo(() => ({ open, onOpenChange }), [open, onOpenChange])
  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogContent({ className, children, ...props }) {
  const { open, onOpenChange } = React.useContext(DialogContext)
  if (!open) return null
  
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in-up"
        onClick={() => onOpenChange?.(false)}
      />
      {/* Modal Container */}
      <div
        className={cn(
          "relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg z-10",
          "animate-fade-in-up max-h-[90vh] overflow-y-auto",
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function DialogHeader({ className, children, ...props }) {
  return <div className={cn("flex flex-col gap-1.5 p-6 pb-4", className)} {...props}>{children}</div>
}
export function DialogTitle({ className, children, ...props }) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props}>{children}</h2>
}
export function DialogDescription({ className, children, ...props }) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props}>{children}</p>
}
export function DialogFooter({ className, children, ...props }) {
  return <div className={cn("flex justify-end gap-3 px-6 pb-6 pt-2", className)} {...props}>{children}</div>
}
export function DialogTrigger({ children, asChild, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext)
  if (asChild) {
    return React.cloneElement(children, { onClick: () => onOpenChange?.(true) })
  }
  return <button onClick={() => onOpenChange?.(true)} {...props}>{children}</button>
}

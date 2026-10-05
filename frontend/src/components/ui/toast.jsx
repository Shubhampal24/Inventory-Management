import * as React from "react"
import { cn } from "@/lib/utils"
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react"

const ToastContext = React.createContext({ toast: () => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const toast = React.useCallback(({ title, description, variant = "default", duration = 3500 }) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, title, description, variant }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons = { default: Info, success: CheckCircle2, warning: AlertTriangle, destructive: XCircle }
  const styles = {
    default: "border-border bg-card text-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    destructive: "border-red-500/30 bg-red-500/10 text-red-400",
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => {
          const Icon = icons[t.variant] || icons.default
          return (
            <div key={t.id} className={cn("flex items-start gap-3 rounded-xl border p-4 shadow-2xl animate-slide-right", styles[t.variant || "default"])}>
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-semibold">{t.title}</p>}
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return React.useContext(ToastContext)
}

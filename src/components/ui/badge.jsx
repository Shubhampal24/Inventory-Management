import { cn } from "@/lib/utils"
import { CATEGORY_COLORS, STATUS_CONFIG } from "@/lib/utils"

export function Badge({ children, variant = "default", className, ...props }) {
  const variants = {
    default:  "bg-primary/15 text-primary border border-primary/30",
    secondary:"bg-secondary text-secondary-foreground border border-border",
    outline:  "border border-border text-foreground bg-transparent",
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium", variants[variant], className)} {...props}>
      {children}
    </span>
  )
}

export function CategoryBadge({ category, className }) {
  const cfg = CATEGORY_COLORS[category] || { bg:"bg-muted", border:"border-border", text:"text-muted-foreground" }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold border", cfg.bg, cfg.border, cfg.text, className)}>
      {category}
    </span>
  )
}

export function StockBadge({ status, className }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OK
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-md px-2.5 py-0.5 text-xs font-semibold border", cfg.bg, cfg.border, cfg.text, className)}>
      <span className={cn("status-dot", cfg.dot)} />
      {cfg.label}
    </span>
  )
}

export function LocationBadge({ locationId, className }) {
  return (
    <span className={cn("font-mono text-xs bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/50 rounded px-2 py-0.5", className)}>
      {locationId || "—"}
    </span>
  )
}

import { cn } from "@/lib/utils"

const variants = {
  default:     "bg-primary text-primary-foreground hover:bg-primary/85 shadow-lg shadow-primary/20",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/85",
  outline:     "border border-border text-foreground bg-transparent hover:bg-secondary/50",
  secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/70",
  ghost:       "text-foreground hover:bg-secondary/50",
  link:        "text-primary underline-offset-4 hover:underline",
  success:     "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20",
  warning:     "bg-amber-500 text-white hover:bg-amber-400 shadow-lg shadow-amber-500/20",
}
const sizes = {
  default: "h-9 px-4 py-2 text-sm",
  sm:      "h-7 px-3 text-xs",
  lg:      "h-11 px-6 text-base",
  icon:    "h-9 w-9",
  "icon-sm":"h-7 w-7",
}

export function Button({ className, variant = "default", size = "default", children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

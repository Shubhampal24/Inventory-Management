import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const CATEGORY_COLORS = {
  AC:         { bg: "bg-cyan-500/15",   border: "border-cyan-500/40",   text: "text-cyan-400",   dot: "#06b6d4" },
  CARPENTER:  { bg: "bg-amber-500/15",  border: "border-amber-500/40",  text: "text-amber-400",  dot: "#f59e0b" },
  CIVIL:      { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-400", dot: "#f97316" },
  DECOR:      { bg: "bg-pink-500/15",   border: "border-pink-500/40",   text: "text-pink-400",   dot: "#ec4899" },
  ELECTRIC:   { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-400", dot: "#eab308" },
  FURNISHING: { bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-400", dot: "#a855f7" },
  PLUMBER:    { bg: "bg-blue-500/15",   border: "border-blue-500/40",   text: "text-blue-400",   dot: "#3b82f6" },
}

export const STATUS_CONFIG = {
  OK:      { label: "OK",      bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", dot: "ok" },
  REORDER: { label: "REORDER", bg: "bg-amber-500/15",   border: "border-amber-500/40",   text: "text-amber-400",   dot: "reorder" },
  EMPTY:   { label: "EMPTY",   bg: "bg-red-500/15",     border: "border-red-500/40",     text: "text-red-400",     dot: "empty" },
}

export const LEVEL_ORDER = ["GL1","GL2","GL3","SL4","SL5","SL6"]

export const LEVEL_LABELS = {
  GL1: "GL1 — Floor",
  GL2: "GL2 — Ground",
  GL3: "GL3 — Mid",
  SL4: "SL4 — Lower Stilt",
  SL5: "SL5 — Mid Stilt",
  SL6: "SL6 — Upper Stilt",
}

export function formatDate(dateStr) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatQty(qty, unit) {
  if (qty === null || qty === undefined) return "—"
  return `${Number(qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? " " + unit : ""}`
}

export const CATEGORIES = ["AC","CARPENTER","CIVIL","DECOR","ELECTRIC","FURNISHING","PLUMBER"]
export const LEVELS = ["GL1","GL2","GL3","SL4","SL5","SL6"]
export const UNITS = ["PCS","MTR","SQF","BAG","KG","LTR","SHT","ROL","NOS","BOX","CAN","BTL"]

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Command } from "cmdk"
import useWarehouseStore from "@/lib/store/useWarehouseStore"
import { Search, MapPin, Package, Home, LayoutGrid, LayoutList, Layers, ArrowLeftRight, Settings, FileText, MoveRight } from "lucide-react"

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

  const materials = useWarehouseStore(s => s.materialMasterBase ?? [])
  const locations = useWarehouseStore(s => s.locations ?? [])

  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command) => {
    setOpen(false)
    command()
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4 backdrop-blur-sm bg-black/40 dark:bg-background/80" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <Command className="w-full h-full flex flex-col" label="Global Command Menu">
          <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-5 w-5 shrink-0 text-muted-foreground" />
            <Command.Input 
              autoFocus
              placeholder="Search materials, locations, or pages..." 
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground" 
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Pages" className="text-xs font-medium text-muted-foreground px-2 py-1">
              {[
                { name: "Dashboard", path: "/", icon: Home },
                { name: "Inventory", path: "/inventory", icon: LayoutGrid },
                { name: "Stock Movement", path: "/movements", icon: ArrowLeftRight },
                { name: "Location Master", path: "/locations", icon: MapPin },
                { name: "Material Master", path: "/materials", icon: Package },
                { name: "Rack Manager", path: "/rack-manager", icon: Layers },
                { name: "Rack Labels", path: "/rack-labels", icon: FileText },
              ].map(page => (
                <Command.Item
                  key={page.path}
                  onSelect={() => runCommand(() => navigate(page.path))}
                  className="flex items-center gap-2 px-2 py-2 mt-1 rounded-md cursor-pointer text-sm text-foreground hover:bg-primary/20 hover:text-primary transition-colors aria-selected:bg-primary/20 aria-selected:text-primary"
                >
                  <page.icon size={15} />
                  <span>{page.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">Page</span>
                </Command.Item>
              ))}
            </Command.Group>

            {materials.length > 0 && (
              <Command.Group heading="Materials" className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2">
                {materials.slice(0, 10).map(mat => (
                  <Command.Item
                    key={mat.id}
                    value={mat.id + " " + mat.name + " " + mat.description}
                    onSelect={() => runCommand(() => navigate("/materials"))}
                    className="flex items-center gap-2 px-2 py-2 mt-1 rounded-md cursor-pointer text-sm text-foreground hover:bg-primary/20 hover:text-primary transition-colors aria-selected:bg-primary/20 aria-selected:text-primary"
                  >
                    <Package size={15} className="text-muted-foreground" />
                    <span>{mat.name || mat.description || mat.id}</span>
                    <span className="ml-auto font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{mat.id}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {locations.length > 0 && (
              <Command.Group heading="Locations" className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2">
                {locations.filter(l => l.status === "Occupied").slice(0, 10).map(loc => (
                  <Command.Item
                    key={loc.locationId}
                    value={loc.locationId + " " + loc.materialDesc + " " + loc.materialId}
                    onSelect={() => runCommand(() => navigate("/locations"))}
                    className="flex items-center gap-2 px-2 py-2 mt-1 rounded-md cursor-pointer text-sm text-foreground hover:bg-primary/20 hover:text-primary transition-colors aria-selected:bg-primary/20 aria-selected:text-primary"
                  >
                    <MapPin size={15} className="text-muted-foreground" />
                    <span>{loc.locationId}</span>
                    <MoveRight size={12} className="text-muted-foreground mx-1" />
                    <span className="text-muted-foreground text-xs truncate max-w-[200px]">{loc.materialDesc || loc.materialId}</span>
                    <span className="ml-auto font-mono text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">{loc.quantity} {loc.unit}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

          </Command.List>
        </Command>
      </div>
    </div>
  )
}

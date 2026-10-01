import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { ToastProvider } from "@/components/ui/toast"
import Dashboard from "@/pages/Dashboard"
import RackMap from "@/pages/RackMap"
import Inventory from "@/pages/Inventory"
import StockMovement from "@/pages/StockMovement"
import MaterialMaster from "@/pages/MaterialMaster"
import LocationMaster from "@/pages/LocationMaster"
import RackLabels from "@/pages/RackLabels"
import RackManager from "@/pages/RackManager"
import Reference from "@/pages/Reference"

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/rack-map"     element={<RackMap />} />
            <Route path="/inventory"    element={<Inventory />} />
            <Route path="/movements"    element={<StockMovement />} />
            <Route path="/materials"    element={<MaterialMaster />} />
            <Route path="/locations"    element={<LocationMaster />} />
            <Route path="/rack-manager" element={<RackManager />} />
            <Route path="/labels"       element={<RackLabels />} />
            <Route path="/reference"    element={<Reference />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

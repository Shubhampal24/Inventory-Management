import * as React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import useWarehouseStore from '@/lib/store/useWarehouseStore'

// Pages
import Login        from '@/pages/Login'
import Dashboard    from '@/pages/Dashboard'
import RackMap      from '@/pages/RackMap'
import Inventory    from '@/pages/Inventory'
import StockMovement from '@/pages/StockMovement'
import MaterialMaster from '@/pages/MaterialMaster'
import LocationMaster from '@/pages/LocationMaster'
import RackLabels   from '@/pages/RackLabels'
import RackManager  from '@/pages/RackManager'
import Reference    from '@/pages/Reference'

/** ProtectedRoute: redirects to /login if not authenticated */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

/** DataLoader: loads all data from backend after login */
function DataLoader({ children }) {
  const { isAuthenticated, user } = useAuth()
  const loadAll = useWarehouseStore(s => s.loadAll)
  const setCurrentUser = useWarehouseStore(s => s.setCurrentUser)
  const isLoading = useWarehouseStore(s => s.isLoading)
  const apiError = useWarehouseStore(s => s.apiError)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    if (isAuthenticated && !loaded) {
      if (user?.name) setCurrentUser(user.name)
      loadAll().then(() => setLoaded(true))
    }
    if (!isAuthenticated) setLoaded(false)
  }, [isAuthenticated, loaded, loadAll, setCurrentUser, user])

  if (isAuthenticated && isLoading && !loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading warehouse data...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && apiError && !loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl border border-destructive/30 p-8 max-w-md text-center space-y-4">
          <p className="text-lg font-semibold text-destructive">Failed to load data</p>
          <p className="text-sm text-muted-foreground">{apiError}</p>
          <p className="text-xs text-muted-foreground">Make sure the backend server is running on port 5003.</p>
          <button
            onClick={() => { setLoaded(false); loadAll() }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <DataLoader>
              <AppShell />
            </DataLoader>
          </ProtectedRoute>
        }
      >
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

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

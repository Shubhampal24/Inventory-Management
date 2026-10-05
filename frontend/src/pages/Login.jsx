// src/pages/Login.jsx
import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Warehouse, KeyRound, User, Eye, EyeOff, LogIn, ShieldCheck, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login, loading, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [userId, setUserId]           = React.useState('')
  const [pin, setPin]                 = React.useState('')
  const [showPin, setShowPin]         = React.useState(false)
  const [error, setError]             = React.useState('')
  const [submitting, setSubmitting]   = React.useState(false)

  const from = location.state?.from?.pathname || '/'

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!userId.trim()) { setError('Please enter your User ID.'); return }
    if (!pin.trim())    { setError('Please enter your PIN.'); return }
    if (!/^\d{4,8}$/.test(pin)) { setError('PIN must be 4–8 digits.'); return }

    setSubmitting(true)
    const result = await login(userId.trim(), pin.trim())
    setSubmitting(false)

    if (result.ok) {
      navigate(from, { replace: true })
    } else {
      setError(result.error || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-2xl shadow-blue-500/30 mb-4">
            <Warehouse size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">RackOS</h1>
          <p className="text-sm text-muted-foreground">Warehouse Management System</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-border p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">User ID</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  placeholder="e.g. WM@123"
                  autoComplete="username"
                  autoFocus
                  className="w-full pl-9 pr-4 h-11 rounded-lg border border-border bg-card/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* PIN */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">PIN</label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Enter your PIN"
                  autoComplete="current-password"
                  inputMode="numeric"
                  className="w-full pl-9 pr-12 h-11 rounded-lg border border-border bg-card/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 animate-fade-in-up">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {submitting || loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                : <><LogIn size={15} /> Sign In</>
              }
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Default credentials: <span className="font-mono text-foreground">WM@123</span> / <span className="font-mono text-foreground">1234</span>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          RackOS v1.0 — Warehouse Management
        </p>
      </div>
    </div>
  )
}

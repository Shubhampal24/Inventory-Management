import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check } from "lucide-react"

export function Combobox({ value, onChange, options, placeholder = "Select or type...", className = "" }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState(value || "")
  const wrapperRef = React.useRef(null)
  const dropdownRef = React.useRef(null)
  const [dropdownStyle, setDropdownStyle] = React.useState({})

  React.useEffect(() => {
    setQuery(value || "")
  }, [value])

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        (wrapperRef.current && wrapperRef.current.contains(e.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(e.target))
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = options.filter(o => {
    const text = typeof o === 'string' ? o : o.value
    return text.toLowerCase().includes(query.toLowerCase())
  })
  
  const handleChange = (e) => {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  const handleSelect = (val) => {
    setQuery(val)
    onChange(val)
    setOpen(false)
  }

  // Update portal position on scroll/resize and open
  React.useEffect(() => {
    if (!open || !wrapperRef.current) return
    const updatePosition = () => {
      const rect = wrapperRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const height = Math.min(240, filtered.length * 36 + 8) // max-h-60 approx 240px

      // if not enough space below, and more space above, open upwards
      if (spaceBelow < height && spaceAbove > spaceBelow) {
        setDropdownStyle({
          position: 'fixed',
          top: rect.top - height - 4,
          left: rect.left,
          width: rect.width,
        })
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        })
      }
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true) // true to catch modal scroll
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, filtered.length])

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <ChevronDown className="h-4 w-4 opacity-50 ml-2 cursor-pointer shrink-0" onClick={() => setOpen(!open)} />
      </div>
      {open && createPortal(
        <ul ref={dropdownRef} style={dropdownStyle} className="z-[9999] max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1 outline-none animate-in fade-in-0 zoom-in-95">
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground text-center">No matches found.</li>
          ) : (
            filtered.map((opt, i) => {
              const val = typeof opt === 'string' ? opt : opt.value
              const sub = typeof opt === 'object' ? opt.sub : null
              return (
                <li
                  key={i}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(val) }}
                  className={`relative flex flex-col w-full cursor-pointer select-none rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${value === val ? "bg-accent text-accent-foreground" : ""}`}
                >
                  <div className="flex items-center w-full">
                    <span className="truncate font-medium">{val}</span>
                    {value === val && (
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </span>
                    )}
                  </div>
                  {sub && <span className="text-[10px] text-muted-foreground truncate opacity-80">{sub}</span>}
                </li>
              )
            })
          )}
        </ul>,
        document.body
      )}
    </div>
  )
}

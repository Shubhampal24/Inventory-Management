import re

with open('c:/Users/DELL/OneDrive/Documents/GitHub/rack_management/src/pages/StockMovement.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State changes
content = content.replace(
    'const [open, setOpen] = React.useState(false)',
    'const [open, setOpen] = React.useState(false)\n  const [transferOpen, setTransferOpen] = React.useState(false)'
)

content = content.replace(
"""  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: "",
    materialText: "",
    locationId: "",
    toLocationId: "",
    type: "IN",
    quantity: "",
    unit: "",
    reference: "",
    user: currentUser,
    notes: ""
  })""",
"""  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: "",
    materialText: "",
    locationId: "",
    type: "IN",
    quantity: "",
    unit: "",
    reference: "",
    user: currentUser,
    notes: ""
  })

  const [transferForm, setTransferForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: "",
    materialText: "",
    locationId: "",
    toLocationId: "",
    quantity: "",
    unit: "",
    user: currentUser,
  })"""
)

# 2. useEffect for Router State
content = content.replace(
"""        setForm(f => ({
          ...f,
          type: 'TRANSFER',
          materialId: navState.materialId,
          materialText: fullText,
          locationId: stockLoc ? stockLoc.locationId : "",
          unit: mat ? mat.unit : f.unit
        }))
        setOpen(true)""",
"""        setTransferForm(f => ({
          ...f,
          materialId: navState.materialId,
          materialText: fullText,
          locationId: stockLoc ? stockLoc.locationId : "",
          toLocationId: "",
          unit: mat ? mat.unit : f.unit,
          quantity: "",
          date: new Date().toISOString().slice(0, 10),
          user: currentUser || "User"
        }))
        setTransferOpen(true)"""
)

content = content.replace(
"""  React.useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, user: f.user || currentUser }))
    }
  }, [open, currentUser])""",
"""  React.useEffect(() => {
    if (open) setForm(f => ({ ...f, user: f.user || currentUser }))
    if (transferOpen) setTransferForm(f => ({ ...f, user: f.user || currentUser }))
  }, [open, transferOpen, currentUser])"""
)

# 3. We need transfer handlers
handlers = """

  // --- TRANSFER FORM HANDLERS ---
  const handleTransferMaterialChange = (rawVal) => {
    if (!rawVal || rawVal.trim() === "") {
      setTransferForm(f => ({ ...f, materialId: "", materialText: "", locationId: "", toLocationId: "", unit: "" }))
      return
    }
    const cleanId = extractMaterialId(rawVal)
    const mat = materials.find(m => m.id.toUpperCase() === cleanId || (m.name || m.description)?.toUpperCase() === rawVal.trim().toUpperCase())
    if (mat) {
      const fullText = `${mat.id} - ${mat.name || mat.description}`
      const loc = locations.find(l => (l.materialId === mat.id || inventory.some(i => i.materialId === mat.id && i.locationId === l.locationId && i.currentStock > 0)) && (Number(l.quantity) > 0 || l.status === "Occupied")) || locations.find(l => l.materialId === mat.id)
      setTransferForm(f => ({ ...f, materialId: mat.id, materialText: fullText, unit: mat.unit || f.unit || "PCS", locationId: loc?.locationId || f.locationId || "", toLocationId: "" }))
    } else {
      setTransferForm(f => ({ ...f, materialId: cleanId, materialText: rawVal }))
    }
  }

  const handleTransferLocationChange = (locId) => {
    if (!locId || locId.trim() === "") {
      setTransferForm(f => ({ ...f, locationId: "", materialId: "", materialText: "", unit: "" }))
      return
    }
    const loc = locations.find(l => l.locationId === locId)
    setTransferForm(f => {
      const next = { ...f, locationId: locId }
      if (loc?.materialId) {
        const cleanMatId = extractMaterialId(loc.materialId)
        const mat = materials.find(m => m.id === cleanMatId)
        next.materialId = cleanMatId
        next.materialText = mat ? `${mat.id} - ${mat.name || mat.description}` : cleanMatId
        next.unit = loc.unit || mat?.unit || next.unit || "PCS"
      }
      return next
    })
  }

  const transferCurrentAvailableStock = React.useMemo(() => {
    if (!transferForm.locationId) return 0
    if (transferForm.materialId) {
      const invItem = inventory.find(i => i.materialId === transferForm.materialId && i.locationId === transferForm.locationId)
      if (invItem) return invItem.currentStock
    }
    const loc = locations.find(l => l.locationId === transferForm.locationId)
    return loc ? Number(loc.quantity || 0) : 0
  }, [inventory, locations, transferForm.materialId, transferForm.locationId])

  const transferDestinationLoc = React.useMemo(() => locations.find(l => l.locationId === transferForm.toLocationId), [locations, transferForm.toLocationId])
  const isSwapMode = React.useMemo(() => {
    if (!transferForm.toLocationId || !transferForm.locationId) return false
    return transferDestinationLoc && transferDestinationLoc.materialId && transferDestinationLoc.materialId !== transferForm.materialId && transferDestinationLoc.status === "Occupied"
  }, [transferForm.toLocationId, transferForm.locationId, transferDestinationLoc, transferForm.materialId])

  const handleTransferSubmit = async (e) => {
    e?.preventDefault()
    const cleanMatId = extractMaterialId(transferForm.materialId || transferForm.materialText)
    
    if (!cleanMatId || !transferForm.locationId || !transferForm.toLocationId) {
      toast({ title: "Invalid details", description: "Please select material, source, and destination.", variant: "destructive" })
      return
    }
    if (transferForm.locationId === transferForm.toLocationId) {
      toast({ title: "Same location", description: "Source and destination cannot be the same.", variant: "destructive" })
      return
    }

    if (isSwapMode) {
      if (!confirm(`You are about to swap all materials between ${transferForm.locationId} and ${transferForm.toLocationId}. Proceed?`)) return
      await swapLocations({ locationA: transferForm.locationId, locationB: transferForm.toLocationId, user: transferForm.user || currentUser, date: transferForm.date })
      toast({ title: "Swap executed", variant: "success" })
    } else {
      const qty = parseFloat(transferForm.quantity)
      if (isNaN(qty) || qty <= 0) {
        toast({ title: "Invalid quantity", description: "Quantity must be greater than 0.", variant: "destructive" })
        return
      }
      if (qty > transferCurrentAvailableStock) {
        if (!confirm(`Warning: You are transferring ${qty} ${transferForm.unit}, but only ${transferCurrentAvailableStock} ${transferForm.unit} are available. Proceed anyway?`)) return
      }
      await transferStock({ materialId: cleanMatId, fromLocationId: transferForm.locationId, toLocationId: transferForm.toLocationId, quantity: qty, user: transferForm.user || currentUser, date: transferForm.date })
      toast({ title: "Transfer executed", variant: "success" })
    }
    setTransferOpen(false)
  }

"""

# Let's insert handlers before `const handleMaterialCancel = () => {`
content = content.replace(
    '  // Clear/cancel Material -> also clears Location and Unit',
    handlers + '  // Clear/cancel Material -> also clears Location and Unit'
)

# 4. Remove TRANSFER logic from original handlers
content = content.replace(
"""  const handleToLocationCancel = () => {
    setForm(f => ({ ...f, toLocationId: "" }))
  }

""", "")

content = content.replace(
"""  // Handle switching between IN and OUT and TRANSFER
  const handleTypeChange = (newType) => {
    setForm(f => {
      const next = { ...f, type: newType, toLocationId: "" }
      if ((newType === "OUT" || newType === "TRANSFER") && f.materialId) {""",
"""  // Handle switching between IN and OUT
  const handleTypeChange = (newType) => {
    setForm(f => {
      const next = { ...f, type: newType }
      if (newType === "OUT" && f.materialId) {"""
)

# Replace handleSubmit completely
old_handle_submit_start = "const destinationLoc = React.useMemo(() => locations.find(l => l.locationId === form.toLocationId), [locations, form.toLocationId])"
old_handle_submit_end = "setForm({ date: new Date().toISOString().slice(0, 10), materialId: \"\", materialText: \"\", locationId: \"\", toLocationId: \"\", type: \"IN\", quantity: \"\", unit: \"\", reference: \"\", user: currentUser || \"User\", notes: \"\" })\n  }"

new_handle_submit = """const handleSubmit = async (e) => {
    e?.preventDefault()
    const cleanMatId = extractMaterialId(form.materialId || form.materialText)
    const qty = parseFloat(form.quantity)
    if (!cleanMatId || !form.locationId || !form.quantity || isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid details", description: "Please enter a valid material, location, and positive quantity.", variant: "destructive" })
      return
    }
    if (form.type === "OUT" && qty > currentAvailableStock) {
      if (!confirm(`Warning: You are issuing ${qty} ${form.unit}, but only ${currentAvailableStock} ${form.unit} are available at ${form.locationId}. Proceed anyway?`)) {
        return
      }
    }
    await addMovement({
      ...form,
      materialId: cleanMatId,
      quantity: qty,
    })
    toast({ title: "Movement recorded", description: `${form.type} of ${qty} ${form.unit} added successfully.`, variant: "success" })
    setOpen(false)
    setForm({ date: new Date().toISOString().slice(0, 10), materialId: "", materialText: "", locationId: "", type: "IN", quantity: "", unit: "", reference: "", user: currentUser || "User", notes: "" })
  }"""

s_idx = content.find(old_handle_submit_start)
e_idx = content.find(old_handle_submit_end) + len(old_handle_submit_end)
content = content[:s_idx] + new_handle_submit + content[e_idx:]

# 5. UI Updates
header_old = """              <Button size="sm" onClick={() => setOpen(true)} className="flex-1 sm:flex-none">
                <Plus size={15} /> Add Movement
              </Button>"""

header_new = """              <Button size="sm" variant="outline" className="flex-1 sm:flex-none border-blue-500/50 text-blue-500 hover:bg-blue-500/10" onClick={() => {
                setTransferForm({ date: new Date().toISOString().slice(0, 10), materialId: "", materialText: "", locationId: "", toLocationId: "", quantity: "", unit: "", user: currentUser || "User" })
                setTransferOpen(true)
              }}>
                <ArrowLeftRight size={15} className="mr-1" /> Transfer / Swap
              </Button>
              <Button size="sm" onClick={() => {
                setForm({ date: new Date().toISOString().slice(0, 10), materialId: "", materialText: "", locationId: "", type: "IN", quantity: "", unit: "", reference: "", user: currentUser || "User", notes: "" })
                setOpen(true)
              }} className="flex-1 sm:flex-none">
                <Plus size={15} /> Add Movement
              </Button>"""
content = content.replace(header_old, header_new)

# Revert normal form Dialog UI
dialog_old = """            {/* Type toggle */}
            <div>
              <Label className="mb-2 block">Transaction Type</Label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {["IN","OUT","TRANSFER"].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold transition-all ${form.type === t
                      ? t === "IN" ? "bg-emerald-500/20 text-emerald-400 border-r border-emerald-500/30"
                        : t === "OUT" ? "bg-red-500/20 text-red-400 border-r border-red-500/30"
                        : "bg-blue-500/20 text-blue-400"
                      : "text-muted-foreground hover:bg-secondary/50"}`}
                  >
                    {t === "IN" ? "⬆ IN" : t === "OUT" ? "⬇ OUT" : "⇄ TRANSFER/SWAP"}
                  </button>
                ))}
              </div>
            </div>"""

dialog_new = """            {/* Type toggle */}
            <div>
              <Label className="mb-2 block">Transaction Type</Label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {["IN","OUT"].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2.5 text-sm font-bold transition-all ${form.type === t
                      ? t === "IN" ? "bg-emerald-500/20 text-emerald-400 border-r border-emerald-500/30"
                                    : "bg-red-500/20 text-red-400"
                      : "text-muted-foreground hover:bg-secondary/50"}`}
                  >
                    {t === "IN" ? "⬆ IN (Receive Stock)" : "⬇ OUT (Issue Stock)"}
                  </button>
                ))}
              </div>
            </div>"""

content = content.replace(dialog_old, dialog_new)

# Remove transfer stuff from the normal form
content = content.replace("sub: form.type === \"OUT\" || form.type === \"TRANSFER\"", "sub: form.type === \"OUT\"")
content = content.replace("{form.type === \"OUT\" || form.type === \"TRANSFER\"", "{form.type === \"OUT\"")

transfer_dest_block = """            {/* Destination for Transfer */}
            {form.type === "TRANSFER" && (
              <div className="space-y-1.5 animate-fade-in-up">
                <Label>Destination Location <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Combobox
                    value={form.toLocationId}
                    onChange={val => setForm(f => ({ ...f, toLocationId: val.toUpperCase() }))}
                    placeholder="e.g. R02-B02-GL1-A"
                    className="font-mono uppercase w-full"
                    options={locations.filter(l => l.locationId !== form.locationId).map(l => ({
                      value: l.locationId,
                      sub: l.status === "Available" ? "Empty Slot" : l.materialId === form.materialId ? "Same Material" : `${l.status} · ${l.materialDesc || l.materialId}`
                    }))}
                  />
                  {form.toLocationId && (
                    <button type="button" onClick={handleToLocationCancel} className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors z-10 bg-background" title="Clear destination">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {form.toLocationId && destinationLoc && (
                  <div className="mt-1">
                    {destinationLoc.status === "Available" && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">Will auto-assign this location</span>}
                    {destinationLoc.materialId === form.materialId && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20">Will add to existing stock</span>}
                    {isSwapMode && <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded border border-amber-500/40">Destination occupied by {destinationLoc.materialId}. This will trigger a complete Swap.</span>}
                  </div>
                )}
              </div>
            )}"""
content = content.replace(transfer_dest_block, "")

# fix quantity input
qty_input_old = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity {isSwapMode ? "" : <span className="text-destructive">*</span>}</Label>
                <Input 
                  type="text" 
                  inputMode="decimal"
                  value={isSwapMode ? "100% (SWAP)" : form.quantity} 
                  onChange={e => {
                    if (isSwapMode) return
                    const val = e.target.value
                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setForm(f => ({ ...f, quantity: val }))
                    }
                  }} 
                  disabled={isSwapMode}
                  placeholder="Enter quantity" 
                  className={cn("font-mono text-sm font-semibold", isSwapMode && "bg-secondary/50 text-muted-foreground border-dashed")}
                  autoComplete="off"
                  required={!isSwapMode} 
                />
              </div>"""

qty_input_new = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <Input 
                  type="text" 
                  inputMode="decimal"
                  value={form.quantity} 
                  onChange={e => {
                    const val = e.target.value
                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setForm(f => ({ ...f, quantity: val }))
                    }
                  }} 
                  placeholder="Enter quantity (e.g. 10)" 
                  className="font-mono text-sm font-semibold"
                  autoComplete="off"
                  required 
                />
              </div>"""
content = content.replace(qty_input_old, qty_input_new)

# fix footer
footer_old = """            <Button
              type="submit"
              form="sm-form"
              variant={form.type === "IN" ? "success" : form.type === "OUT" ? "destructive" : isSwapMode ? "warning" : "default"}
              className={form.type === "TRANSFER" && !isSwapMode ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            >
              {form.type === "IN" ? "Record IN" : form.type === "OUT" ? "Record OUT" : isSwapMode ? "Execute Swap" : "Execute Transfer"}
            </Button>"""

footer_new = """            <Button
              type="submit"
              form="sm-form"
              variant={form.type === "IN" ? "success" : "destructive"}
            >
              {form.type === "IN" ? "Record IN" : "Record OUT"}
            </Button>"""
content = content.replace(footer_old, footer_new)

# Now, add the new Transfer Dialog entirely before the closing </div> of the component.
transfer_dialog = """
      {/* Transfer / Swap Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-lg border-blue-500/20">
          <DialogHeader>
            <DialogTitle className="text-blue-500 flex items-center gap-2">
              <ArrowLeftRight size={18} /> {isSwapMode ? "Swap Locations" : "Transfer Stock"}
            </DialogTitle>
            <DialogDescription>Move materials between racks or swap occupied slots.</DialogDescription>
          </DialogHeader>
          <form id="transfer-form" onSubmit={handleTransferSubmit} className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={transferForm.date} onChange={e => setTransferForm({ ...transferForm, date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>User</Label>
                <Input value={transferForm.user} onChange={e => setTransferForm({ ...transferForm, user: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Material to Move <span className="text-destructive">*</span></Label>
              </div>
              <div className="relative">
                <Combobox
                  value={transferForm.materialText || transferForm.materialId}
                  onChange={val => handleTransferMaterialChange(val.toUpperCase())}
                  placeholder="Select material..." 
                  className="font-mono uppercase w-full" 
                  options={materials.filter(m => inventory.some(i => i.materialId === m.id && i.currentStock > 0)).map(m => ({
                    value: `${m.id} - ${m.name || m.description}`,
                    sub: `${m.category ? `${m.category} · ` : ""}${m.unit ? `Unit: ${m.unit}` : ""}`
                  }))}
                />
                {(transferForm.materialText || transferForm.materialId) && (
                  <button type="button" onClick={() => handleTransferMaterialChange("")} className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 z-10 bg-background"><X size={14} /></button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Source Location (From) <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Combobox
                  value={transferForm.locationId}
                  onChange={val => handleTransferLocationChange(val.toUpperCase())}
                  placeholder="Select source location..." 
                  className="font-mono uppercase w-full border-blue-500/30" 
                  options={locations.filter(l => (l.materialId === transferForm.materialId || inventory.some(i => i.materialId === transferForm.materialId && i.locationId === l.locationId && i.currentStock > 0)) && (Number(l.quantity) > 0 || l.status === "Occupied")).map(l => {
                    const invItem = inventory.find(i => i.locationId === l.locationId && i.materialId === transferForm.materialId)
                    return { value: l.locationId, sub: `Stock: ${invItem ? invItem.currentStock : l.quantity} ${l.unit || transferForm.unit || "PCS"}` }
                  })}
                />
                {transferForm.locationId && (
                  <button type="button" onClick={() => handleTransferLocationChange("")} className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 z-10 bg-background"><X size={14} /></button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Destination Location (To) <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Combobox
                  value={transferForm.toLocationId}
                  onChange={val => setTransferForm(f => ({ ...f, toLocationId: val.toUpperCase() }))}
                  placeholder="Select destination location..."
                  className={cn("font-mono uppercase w-full", isSwapMode ? "border-amber-500" : "border-emerald-500/50")}
                  options={locations.filter(l => l.locationId !== transferForm.locationId).map(l => ({
                    value: l.locationId,
                    sub: l.status === "Available" ? "Empty Slot" : l.materialId === transferForm.materialId ? "Same Material" : `${l.status} · ${l.materialDesc || l.materialId}`
                  }))}
                />
                {transferForm.toLocationId && (
                  <button type="button" onClick={() => setTransferForm(f => ({ ...f, toLocationId: "" }))} className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 z-10 bg-background"><X size={14} /></button>
                )}
              </div>
              {transferForm.toLocationId && transferDestinationLoc && (
                <div className="mt-1 animate-fade-in-up">
                  {transferDestinationLoc.status === "Available" && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">Will auto-assign this location</span>}
                  {transferDestinationLoc.materialId === transferForm.materialId && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20">Will add to existing stock</span>}
                  {isSwapMode && <span className="text-[11px] font-bold bg-amber-500/20 text-amber-600 px-2.5 py-1 rounded border border-amber-500/40 block">⚠️ Destination is occupied by {transferDestinationLoc.materialId}. This will trigger a complete Swap between {transferForm.locationId} and {transferForm.toLocationId}.</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity {isSwapMode ? "" : <span className="text-destructive">*</span>}</Label>
                <Input 
                  type="text" 
                  inputMode="decimal"
                  value={isSwapMode ? "100% (SWAP)" : transferForm.quantity} 
                  onChange={e => {
                    if (isSwapMode) return
                    const val = e.target.value
                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) setTransferForm(f => ({ ...f, quantity: val }))
                  }} 
                  disabled={isSwapMode}
                  placeholder="Enter quantity" 
                  className={cn("font-mono text-sm font-semibold", isSwapMode && "bg-secondary/50 text-muted-foreground border-dashed")}
                  autoComplete="off"
                  required={!isSwapMode} 
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Combobox value={transferForm.unit} onChange={val => setTransferForm(f => ({ ...f, unit: val.toUpperCase() }))} options={UNITS} placeholder="e.g. PCS" className="w-full" />
              </div>
            </div>

            {transferForm.locationId && !isSwapMode && (
              <div className="rounded-lg p-2.5 bg-secondary/40 border border-border/60 flex items-center justify-between text-xs animate-fade-in-up">
                <span className="text-muted-foreground">Available to move:</span>
                <span className={cn("font-mono font-bold", transferCurrentAvailableStock > 0 ? "text-blue-500" : "text-red-500")}>
                  {transferCurrentAvailableStock} {transferForm.unit || "PCS"}
                </span>
              </div>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button type="submit" form="transfer-form" className={isSwapMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}>
              {isSwapMode ? "Execute Swap" : "Execute Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
"""

content = content.replace("    </div>\n  )\n}", transfer_dialog + "  )\n}")

with open('c:/Users/DELL/OneDrive/Documents/GitHub/rack_management/src/pages/StockMovement.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

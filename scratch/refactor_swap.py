import re

file_path = 'c:/Users/DELL/OneDrive/Documents/GitHub/rack_management/src/pages/StockMovement.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update transferForm state to include mode
content = content.replace(
"""  const [transferForm, setTransferForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    materialId: "",
    materialText: "",
    locationId: "",
    toLocationId: "",
    quantity: "",
    unit: "",
    user: currentUser,
  })""",
"""  const [transferForm, setTransferForm] = React.useState({
    mode: "TRANSFER",
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

# 2. Update all setTransferForm instances that reset state to include mode: "TRANSFER"
content = content.replace(
"""setTransferForm({ date: new Date().toISOString().slice(0, 10), materialId: "", materialText: "", locationId: "", toLocationId: "", quantity: "", unit: "", user: currentUser || "User" })""",
"""setTransferForm({ mode: "TRANSFER", date: new Date().toISOString().slice(0, 10), materialId: "", materialText: "", locationId: "", toLocationId: "", quantity: "", unit: "", user: currentUser || "User" })"""
)

# 3. Update handleTransferLocationChange etc to not overwrite mode
# Actually it uses f => ({ ...f, ... }) so mode is preserved.

# 4. Redefine isSwapMode and Options based on explicitly chosen mode.
old_swap_mode = """  const transferDestinationLoc = React.useMemo(() => locations.find(l => l.locationId === transferForm.toLocationId), [locations, transferForm.toLocationId])
  const isSwapMode = React.useMemo(() => {
    if (!transferForm.toLocationId || !transferForm.locationId) return false
    return transferDestinationLoc && transferDestinationLoc.materialId && transferDestinationLoc.materialId !== transferForm.materialId && transferDestinationLoc.status === "Occupied"
  }, [transferForm.toLocationId, transferForm.locationId, transferDestinationLoc, transferForm.materialId])"""

new_swap_mode = """  const transferDestinationLoc = React.useMemo(() => locations.find(l => l.locationId === transferForm.toLocationId), [locations, transferForm.toLocationId])
  const isSwapMode = transferForm.mode === "SWAP" """
content = content.replace(old_swap_mode, new_swap_mode)

# 5. Add the toggle UI to the Transfer form
dialog_header = """          <DialogHeader>
            <DialogTitle className="text-blue-500 flex items-center gap-2">
              <ArrowLeftRight size={18} /> {isSwapMode ? "Swap Locations" : "Transfer Stock"}
            </DialogTitle>
            <DialogDescription>Move materials between racks or swap occupied slots.</DialogDescription>
          </DialogHeader>
          <form id="transfer-form" onSubmit={handleTransferSubmit} className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">"""

dialog_header_with_toggle = """          <DialogHeader>
            <DialogTitle className="text-blue-500 flex items-center gap-2">
              <ArrowLeftRight size={18} /> {isSwapMode ? "Swap Locations" : "Transfer Stock"}
            </DialogTitle>
            <DialogDescription>Move materials between racks or swap occupied slots.</DialogDescription>
          </DialogHeader>
          <form id="transfer-form" onSubmit={handleTransferSubmit} className="px-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            {/* Mode toggle */}
            <div>
              <Label className="mb-2 block">Action Mode</Label>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {["TRANSFER","SWAP"].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => setTransferForm(f => ({ ...f, mode: t, toLocationId: "" }))}
                    className={`flex-1 py-2 text-sm font-bold transition-all ${transferForm.mode === t
                      ? t === "TRANSFER" ? "bg-blue-500/20 text-blue-500 border-r border-blue-500/30"
                                    : "bg-amber-500/20 text-amber-500"
                      : "text-muted-foreground hover:bg-secondary/50"}`}
                  >
                    {t === "TRANSFER" ? "Move Stock (Transfer)" : "Swap Entire Slots"}
                  </button>
                ))}
              </div>
            </div>"""

content = content.replace(dialog_header, dialog_header_with_toggle)

# 6. Destination Combobox options need to strictly follow the mode.
# If TRANSFER: can only select Available slots OR slots with SAME material.
# If SWAP: can select ANY slot (except source itself).
dest_combo_old = """                  options={locations.filter(l => l.locationId !== transferForm.locationId).map(l => ({
                    value: l.locationId,
                    sub: l.status === "Available" ? "Empty Slot" : l.materialId === transferForm.materialId ? "Same Material" : `${l.status} · ${l.materialDesc || l.materialId}`
                  }))}"""

dest_combo_new = """                  options={locations.filter(l => l.locationId !== transferForm.locationId).filter(l => {
                    if (isSwapMode) return true; // Can swap with anything
                    return l.status === "Available" || l.materialId === transferForm.materialId; // Transfer can only go to empty or same material
                  }).map(l => ({
                    value: l.locationId,
                    sub: l.status === "Available" ? "Empty Slot" : l.materialId === transferForm.materialId ? "Same Material" : `${l.status} · ${l.materialDesc || l.materialId}`
                  }))}"""

content = content.replace(dest_combo_old, dest_combo_new)

# 7. Destination hints
hints_old = """                <div className="mt-1 animate-fade-in-up">
                  {transferDestinationLoc.status === "Available" && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">Will auto-assign this location</span>}
                  {transferDestinationLoc.materialId === transferForm.materialId && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20">Will add to existing stock</span>}
                  {isSwapMode && <span className="text-[11px] font-bold bg-amber-500/20 text-amber-600 px-2.5 py-1 rounded border border-amber-500/40 block">⚠️ Destination is occupied by {transferDestinationLoc.materialId}. This will trigger a complete Swap between {transferForm.locationId} and {transferForm.toLocationId}.</span>}
                </div>"""

hints_new = """                <div className="mt-1 animate-fade-in-up">
                  {transferDestinationLoc.status === "Available" && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">Will auto-assign this location</span>}
                  {transferDestinationLoc.materialId === transferForm.materialId && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20">Will add to existing stock</span>}
                  {isSwapMode && transferDestinationLoc.materialId && transferDestinationLoc.materialId !== transferForm.materialId && <span className="text-[11px] font-bold bg-amber-500/20 text-amber-600 px-2.5 py-1 rounded border border-amber-500/40 block">⚠️ Destination is occupied by {transferDestinationLoc.materialId}. This will swap both slots entirely.</span>}
                  {isSwapMode && transferDestinationLoc.status === "Available" && <span className="text-[11px] font-bold bg-amber-500/20 text-amber-600 px-2.5 py-1 rounded border border-amber-500/40 block">⚠️ Swapping with an empty slot acts as a 100% transfer.</span>}
                </div>"""
content = content.replace(hints_old, hints_new)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

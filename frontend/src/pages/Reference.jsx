import * as React from "react"
import { useState } from "react"
import { safetyRules, dataDictionary } from "@/lib/data/reference.js"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  ShieldCheck, 
  Hash, 
  GitBranch, 
  Workflow, 
  Boxes, 
  Layers, 
  ArrowRight, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Database, 
  Info, 
  ArrowDownRight,
  PackagePlus,
  PackageMinus,
  RefreshCw,
  Sparkles,
  Check,
  Cpu,
  FileCode2,
  ListTree
} from "lucide-react"

// Real-world workflow steps based directly on the Express routes & Mongoose models
const WORKFLOW_STEPS = [
  {
    step: 1,
    id: "create-rack",
    title: "Create Rack",
    subtitle: "Define Rack & Auto-Generate Locations",
    icon: Layers,
    color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/40",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    endpoint: "POST /api/racks",
    model: "Rack & Location",
    summary: "Configures physical warehouse racks (bays, levels, slots) and auto-generates unique hierarchical Location IDs.",
    inputs: [
      { name: "id", type: "String", required: true, example: "R01", desc: "Unique Rack ID (Uppercased)" },
      { name: "type", type: "String", required: false, example: "Pallet Rack", desc: "Default 'Pallet Rack'" },
      { name: "bayCount", type: "Number", required: true, example: "5", desc: "Total vertical bays (min 1)" },
      { name: "levels", type: "Array", required: true, example: "GL1, GL2, SL4", desc: "Storage vertical tiers" },
      { name: "slots", type: "Array", required: false, example: "A, B, C", desc: "Positions per level (default A)" },
      { name: "side", type: "String", required: false, example: "Single-sided", desc: "Rack orientation" }
    ],
    backendLogic: [
      "Auto-uppercases Rack ID: `id.toUpperCase()`",
      "Calculates Cartesian product: Bays (1..N) × Levels × Slots",
      "Generates canonical Location ID formula: `${rack}-B${pad(bay,2)}-${level}-${slot}`",
      "Executes `Location.insertMany(locDocs, { ordered: false })` with empty `materialId: ''` and batch/notes",
      "Skips pre-existing duplicate locations gracefully without failing the entire rack creation"
    ],
    validations: [
      { rule: "Rack ID Required", condition: "if (!id)", status: "400 Bad Request", message: "'Rack ID is required.'" },
      { rule: "Bay Count >= 1", condition: "bayCount < 1", status: "400 / Fallback", message: "Defaults to 1 bay if not specified" },
      { rule: "Unique Constraint", condition: "Rack ID exists", status: "11000 Mongo", message: "Cannot create duplicate rack with same ID" }
    ],
    onHoverConditions: [
      "📌 Formula Output: R01 + Bay 1 + GL1 + Slot A -> R01-B01-GL1-A",
      "⚡ Bulk Auto-Generation: A rack with 5 bays × 3 levels × 2 slots immediately generates 30 Location records",
      "🛡️ Initial Status: Created as 'Available' with materialId: ''"
    ],
    codeSnippet: `// backend/routes/racks.js
const locDocs = generateLocations(rack.id, rack.bayCount, levelsArr, slotsArr)
await Location.insertMany(
  locDocs.map(l => ({ ...l, materialId: '', batch: '', notes: '' })),
  { ordered: false }
)`
  },
  {
    step: 2,
    id: "register-material",
    title: "Register Material",
    subtitle: "Create SKU in Material Master",
    icon: Boxes,
    color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/40",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    endpoint: "POST /api/materials",
    model: "Material",
    summary: "Registers an item catalog master with standard measurement unit, category zone, and safety reorder threshold.",
    inputs: [
      { name: "id", type: "String", required: true, example: "MAT001", desc: "Unique Material Code (Uppercased)" },
      { name: "name", type: "String", required: true, example: "CEMENT 50KG", desc: "Material Title" },
      { name: "category", type: "Enum", required: false, example: "CIVIL", desc: "AC, CIVIL, CARPENTER, ELECTRIC..." },
      { name: "unit", type: "String", required: false, example: "BAG", desc: "Standard unit (PCS, BAG, MTR...)" },
      { name: "reorderLevel", type: "Number", required: false, example: "15", desc: "Alert trigger threshold" }
    ],
    backendLogic: [
      "Checks for pre-existing material via `Material.findOne({ id })`",
      "Normalizes `id` and `name` to upper-case characters for case-insensitive indexing",
      "Initializes reorderLevel (defaults to 0 if omitted)",
      "Strict Deletion Guard: Cannot delete material if linked to any Location or referenced in Movement log"
    ],
    validations: [
      { rule: "Mandatory Fields", condition: "if (!id || !name)", status: "400 Bad Request", message: "'Material ID and Name are required.'" },
      { rule: "Uniqueness", condition: "existing material found", status: "409 Conflict", message: "'Material ID \"...\" already exists.'" },
      { rule: "Deletion Guard 1", condition: "Location.findOne({ materialId })", status: "400 Bad Request", message: "'Cannot delete: Material is currently assigned to location.'" },
      { rule: "Deletion Guard 2", condition: "Movement.findOne({ materialId })", status: "400 Bad Request", message: "'Cannot delete: Material has existing transaction history.'" }
    ],
    onHoverConditions: [
      "📌 Reorder Monitoring: When Current Stock <= reorderLevel, UI badges switch from OK to warning REORDER",
      "🛡️ Deletion Protection: Active materials cannot be accidentally purged if inventory or history exists",
      "🏷️ Categorization: Categories (AC, CIVIL, etc.) dictate warehouse rack safety placement rules"
    ],
    codeSnippet: `// backend/routes/materials.js
const existing = await Material.findOne({ id: id.toUpperCase() })
if (existing) return res.status(409).json({ error: 'Material ID already exists.' })

const material = new Material({ id, name, category, unit, reorderLevel })
await material.save()`
  },
  {
    step: 3,
    id: "assign-material",
    title: "Assign to Location",
    subtitle: "Map Material SKU to Slot Address",
    icon: Database,
    color: "from-cyan-500/20 to-teal-500/20 text-cyan-400 border-cyan-500/40",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    endpoint: "PATCH /api/locations/:id/assign",
    model: "Location & Movement",
    summary: "Binds a Material SKU to a designated Location ID. Enforces strict zero-stock rules before reassignment.",
    inputs: [
      { name: "locationId", type: "String (URL Param)", required: true, example: "R01-B01-GL1-A", desc: "Target location address" },
      { name: "materialId", type: "String (Body)", required: true, example: "MAT001", desc: "Material ID (or '' to unassign)" }
    ],
    backendLogic: [
      "Fetches location record: `Location.findOne({ locationId })`",
      "Crucial Stock Validation: If location is already assigned to a DIFFERENT material, it queries the Movement ledger aggregate",
      "Calculates `currentStock = SUM(IN) - SUM(OUT)` for that old material at this location",
      "If `currentStock > 0`, REJECTS the assignment change with HTTP 400",
      "If clean, writes `location.materialId = materialId` and updates status"
    ],
    validations: [
      { rule: "Location Exists", condition: "if (!location)", status: "404 Not Found", message: "'Location ... not found.'" },
      { rule: "Zero Stock Before Reassignment", condition: "currentStock > 0 on old material", status: "400 Bad Request", message: "'Cannot change assignment. Location still holds X units of OLD_MAT.'" },
      { rule: "Location Deletion Guard", condition: "DELETE location when materialId != ''", status: "400 Bad Request", message: "'Cannot delete an assigned location. Unassign the material first.'" }
    ],
    onHoverConditions: [
      "⚠️ Anti-Contamination Check: Prevents assigning MAT002 to a bin that still physically holds MAT001",
      "🔄 Unassignment: Sending empty string `materialId: ''` frees the bin back to 'Available'",
      "📦 Multiple Locations: A single material can be assigned to multiple locations across the warehouse"
    ],
    codeSnippet: `// backend/routes/locations.js
if (location.materialId && location.materialId !== materialId) {
  const [stockRes] = await Movement.aggregate([
    { $match: { locationId, materialId: location.materialId } },
    { $group: { _id: null, totalStock: { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$quantity', { $multiply: ['$quantity', -1] }] } } } }
  ])
  if (stockRes?.totalStock > 0) {
    return res.status(400).json({ error: \`Location still holds \${stockRes.totalStock} units.\` })
  }
}`
  },
  {
    step: 4,
    id: "stock-in",
    title: "Stock IN (Receive)",
    subtitle: "Inbound Purchase / Goods Receipt",
    icon: PackagePlus,
    color: "from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/40",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    endpoint: "POST /api/movements",
    model: "Movement",
    summary: "Records inbound inventory into a specific rack location with reference PO number and operator signature.",
    inputs: [
      { name: "materialId", type: "String", required: true, example: "MAT001", desc: "Material ID" },
      { name: "locationId", type: "String", required: true, example: "R01-B01-GL1-A", desc: "Target bin address" },
      { name: "type", type: "Enum", required: true, example: "IN", desc: "Must be 'IN'" },
      { name: "quantity", type: "Number", required: true, example: "50", desc: "Quantity received (> 0)" },
      { name: "reference", type: "String", required: false, example: "PO-2026-881", desc: "PO / Delivery slip number" },
      { name: "user", type: "String", required: false, example: "Admin", desc: "User audit logging" }
    ],
    backendLogic: [
      "Strips formatted display strings (e.g. 'MAT001 - Cement' -> 'MAT001')",
      "Generates unique tracking code: `id || MOV\${Date.now()}`",
      "Saves immutable transaction record with timestamp and authenticated user",
      "Location state automatically evaluates as 'Occupied' (`quantity > 0`) in live queries"
    ],
    validations: [
      { rule: "Required Parameters", condition: "!materialId || !locationId || !type || quantity === undefined", status: "400 Bad Request", message: "'materialId, locationId, type, and quantity are all required.'" },
      { rule: "Valid Type", condition: "type !== 'IN'", status: "400 Bad Request", message: "'type must be \"IN\" or \"OUT\".'" },
      { rule: "Positive Quantity", condition: "Number(quantity) <= 0", status: "400 Bad Request", message: "'Quantity must be greater than 0.'" }
    ],
    onHoverConditions: [
      "📊 Dynamic Formula: Current Stock = Opening Stock + SUM(IN) - SUM(OUT)",
      "🔒 Ledger Immutability: Stock movements are append-only audit entries for complete traceability",
      "✨ Live UI Sync: Rack visualizer immediately highlights slot as occupied and recalculates bay capacity"
    ],
    codeSnippet: `// backend/routes/movements.js
const movement = new Movement({
  id: id || \`MOV\${Date.now()}\`,
  date: date || new Date().toISOString().slice(0, 10),
  materialId: cleanId.toUpperCase(),
  locationId,
  type: 'IN',
  quantity: Number(quantity),
  reference, user, notes
})
await movement.save()`
  },
  {
    step: 5,
    id: "stock-out",
    title: "Stock OUT (Issue)",
    subtitle: "Outbound Dispatch / Requisition",
    icon: PackageMinus,
    color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    endpoint: "POST /api/movements",
    model: "Movement",
    summary: "Dispatches stock from a rack location for project usage, sales orders, or floor transfers.",
    inputs: [
      { name: "materialId", type: "String", required: true, example: "MAT001", desc: "Material ID" },
      { name: "locationId", type: "String", required: true, example: "R01-B01-GL1-A", desc: "Source location" },
      { name: "type", type: "Enum", required: true, example: "OUT", desc: "Must be 'OUT'" },
      { name: "quantity", type: "Number", required: true, example: "10", desc: "Quantity issued (> 0)" },
      { name: "reference", type: "String", required: false, example: "SO-9012", desc: "Requisition / Issue slip" },
      { name: "user", type: "String", required: false, example: "Warehouse Staff", desc: "Operator name" }
    ],
    backendLogic: [
      "Validates quantity > 0 and logs OUT movement entry",
      "Reduces net available balance at `locationId`",
      "If Net Quantity reaches 0: Location becomes 'Available' or 'EMPTY'",
      "If Material Total Stock <= `reorderLevel`: Status badge shifts to 'REORDER' alert"
    ],
    validations: [
      { rule: "Required Parameters", condition: "!materialId || !locationId || !type || quantity === undefined", status: "400 Bad Request", message: "'materialId, locationId, type, and quantity are all required.'" },
      { rule: "Valid Type", condition: "type !== 'OUT'", status: "400 Bad Request", message: "'type must be \"IN\" or \"OUT\".'" },
      { rule: "Sufficient Inventory", condition: "qtyRequested > currentStock", status: "Client / UI Guard", message: "Prevents negative inventory in warehouse location" }
    ],
    onHoverConditions: [
      "⚠️ Reorder Alert: Triggers instant notification when remaining stock <= reorder threshold",
      "📉 Balance Formula: Reduces location live balance: Loc_Qty = SUM(IN) - SUM(OUT)",
      "📋 Traceability: Requires Issue Reference (Job order / Dispatch slip) for accountability"
    ],
    codeSnippet: `// backend/routes/movements.js
const movOut = new Movement({
  id: id || \`MOV\${Date.now()}\`,
  materialId: cleanId.toUpperCase(),
  locationId,
  type: 'OUT',
  quantity: Number(quantity),
  reference, user
})
await movOut.save()`
  },
  {
    step: 6,
    id: "transfer",
    title: "Transfer Stock",
    subtitle: "Move Qty Between 2 Locations",
    icon: ArrowRight,
    color: "from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/40",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    endpoint: "POST /api/movements/transfer",
    model: "Movement & Location",
    summary: "Relocates a quantity of material from source location to target location with automatic assignment and stock validation.",
    inputs: [
      { name: "materialId", type: "String", required: true, example: "MAT001", desc: "Material being moved" },
      { name: "fromLocationId", type: "String", required: true, example: "R01-B01-GL1-A", desc: "Source location" },
      { name: "toLocationId", type: "String", required: true, example: "R02-B03-GL2-B", desc: "Destination location" },
      { name: "quantity", type: "Number", required: true, example: "20", desc: "Amount to transfer" },
      { name: "user", type: "String", required: false, example: "Manager", desc: "Operator name" }
    ],
    backendLogic: [
      "Step 1 - Stock Check: Aggregates `fromLocationId` movements. Rejects if `availableStock < quantity`",
      "Step 2 - Target Location Check: Ensures `toLocationId` exists in database",
      "Step 3 - Conflict Check: If `toLocation` already assigned to a DIFFERENT material, throws 400: 'Use SWAP instead'",
      "Step 4 - Auto-Assign: If destination is empty (`materialId == ''`), it automatically sets `toLoc.materialId = materialId`",
      "Step 5 - Atomic Movement Pair: Generates `TRX-OUT-...` on source and `TRX-IN-...` on target with reference 'TRANSFER'"
    ],
    validations: [
      { rule: "Source Stock Availability", condition: "currentStock < qty", status: "400 Bad Request", message: "'Insufficient stock at FROM_LOC. Available: X'" },
      { rule: "Destination Exists", condition: "!toLoc in DB", status: "404 Not Found", message: "'Destination location ... not found.'" },
      { rule: "Material Compatibility", condition: "toLoc.materialId && toLoc.materialId !== cleanId", status: "400 Bad Request", message: "'Destination occupied by a different material (MATXXX). Use SWAP instead.'" }
    ],
    onHoverConditions: [
      "⚡ Auto-Assign Feature: Empty target locations are automatically assigned to this material on transfer",
      "🛡️ Contamination Block: Cannot merge different materials into the same location — must use SWAP",
      "🔄 Ledger Symmetry: Creates matched TRX-OUT and TRX-IN movement pair preserving total warehouse balance"
    ],
    codeSnippet: `// backend/routes/movements.js (POST /transfer)
if (currentStock < qty) {
  return res.status(400).json({ error: \`Insufficient stock. Available: \${currentStock}\` })
}
if (toLoc.materialId && toLoc.materialId !== cleanId) {
  return res.status(400).json({ error: \`Destination occupied by \${toLoc.materialId}. Use SWAP instead.\` })
}
if (!toLoc.materialId) {
  toLoc.materialId = cleanId
  await toLoc.save()
}`
  },
  {
    step: 7,
    id: "swap",
    title: "Swap Locations",
    subtitle: "Exchange Materials Between 2 Slots",
    icon: ArrowLeftRight,
    color: "from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/40",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    endpoint: "POST /api/movements/swap",
    model: "Location & Movement",
    summary: "Exchanges materials and full inventory histories between two locations (e.g. moving heavy items to floor level).",
    inputs: [
      { name: "locationA", type: "String", required: true, example: "R01-B01-GL1-A", desc: "First slot (e.g. Floor)" },
      { name: "locationB", type: "String", required: true, example: "R01-B01-SL6-A", desc: "Second slot (e.g. Stilt)" },
      { name: "user", type: "String", required: false, example: "Supervisor", desc: "Operator name" }
    ],
    backendLogic: [
      "Validates both `locationA` and `locationB` exist in Location collection",
      "Ensures at least one of the locations has an assigned material (`!matA && !matB` is rejected)",
      "Swaps assigned `materialId` in Location documents (`locA.materialId = matB`, `locB.materialId = matA`)",
      "Executes historical ledger migration: updates all past movements for `matA` at `locationA` to point to `locationB`",
      "Simultaneously updates all past movements for `matB` at `locationB` to point to `locationA`"
    ],
    validations: [
      { rule: "Both Locations Required", condition: "!locationA || !locationB", status: "400 Bad Request", message: "'locationA and locationB are required.'" },
      { rule: "Existence Check", condition: "!locA || !locB", status: "404 Not Found", message: "'One or both locations not found.'" },
      { rule: "Meaningful Swap Check", condition: "!locA.materialId && !locB.materialId", status: "400 Bad Request", message: "'At least one location must be assigned to a material to swap.'" }
    ],
    onHoverConditions: [
      "🔄 Dual History Migration: Re-points all historical movements so inventory balances follow the physical swap",
      "🏗️ Safety Rebalancing: Ideal for moving heavy stone/tile down to GL1 or fast-moving items to eye-level",
      "⚡ Supports Partial Swap: One slot can be empty while the other is full; swap cleanly relocates the item"
    ],
    codeSnippet: `// backend/routes/movements.js (POST /swap)
locA.materialId = matB || ""
locB.materialId = matA || ""
await locA.save(); await locB.save();

if (matA) {
  await Movement.updateMany({ materialId: matA, locationId: locationA }, { $set: { locationId: locationB } })
}
if (matB) {
  await Movement.updateMany({ materialId: matB, locationId: locationB }, { $set: { locationId: locationA } })
}`
  }
]

export default function Reference() {
  const [selectedStep, setSelectedStep] = useState(WORKFLOW_STEPS[0])
  const [hoveredStep, setHoveredStep] = useState(null)
  const [simulationScenario, setSimulationScenario] = useState("valid-in")

  // Scenarios for testing the backend logic visually
  const SCENARIOS = [
    {
      id: "valid-in",
      title: "Normal Stock IN",
      stepTarget: "stock-in",
      desc: "Receiving 50 bags of Cement (MAT001) into R01-B01-GL1-A",
      conditions: ["Material exists: YES", "Location assigned: YES", "Quantity > 0: YES"],
      expectedResult: "201 Created — Movement logged, status becomes 'Occupied', live quantity increases +50",
      type: "success"
    },
    {
      id: "transfer-insufficient",
      title: "Transfer Insufficient Stock",
      stepTarget: "transfer",
      desc: "Trying to transfer 100 units from R01-B01-GL1-A when only 30 units are in stock",
      conditions: ["Current Stock = 30", "Requested Qty = 100", "currentStock < quantity: TRUE"],
      expectedResult: "400 Bad Request — 'Insufficient stock at R01-B01-GL1-A. Available: 30'",
      type: "error"
    },
    {
      id: "transfer-occupied-diff",
      title: "Transfer to Wrong Occupied Bin",
      stepTarget: "transfer",
      desc: "Transferring MAT001 (Cement) into R02-B01-GL1-A which is already holding MAT004 (Paint)",
      conditions: ["toLoc.materialId = 'MAT004'", "cleanId = 'MAT001'", "toLoc.materialId !== cleanId: TRUE"],
      expectedResult: "400 Bad Request — 'Destination occupied by a different material (MAT004). Use SWAP instead.'",
      type: "error"
    },
    {
      id: "reassign-blocked",
      title: "Reassign Slot with Remaining Stock",
      stepTarget: "assign-material",
      desc: "Changing assignment of R01-B01-GL1-A to MAT002 while 25 units of MAT001 are still physically stored",
      conditions: ["Old material has net stock: 25", "Current Stock > 0: TRUE"],
      expectedResult: "400 Bad Request — 'Cannot change assignment. Location still holds 25 units of MAT001.'",
      type: "error"
    },
    {
      id: "swap-empty-bins",
      title: "Swap Two Empty Bins",
      stepTarget: "swap",
      desc: "Attempting to swap R01-B01-GL1-A and R01-B02-GL1-A when neither has an assigned material",
      conditions: ["locA.materialId = ''", "locB.materialId = ''"],
      expectedResult: "400 Bad Request — 'At least one location must be assigned to a material to swap.'",
      type: "error"
    }
  ]

  const activeHover = hoveredStep || selectedStep

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900/20 via-indigo-950/20 to-purple-900/20 border border-blue-500/20 glass">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Workflow size={20} />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Warehouse Architecture & Process Reference
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Complete lifecycle map from physical rack topology generation to stock receipt, dispatch, inter-rack transfers, and dual-location swaps. Based strictly on backend database operations and validation gates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 py-1 px-3">
            <CheckCircle2 size={13} /> Codebase Verified
          </Badge>
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 flex items-center gap-1.5 py-1 px-3">
            <Cpu size={13} /> Real API Contracts
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-2 bg-slate-900/40 p-1.5 border border-slate-800 rounded-xl">
          <TabsTrigger value="workflow" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary py-2 px-4 rounded-lg">
            <Workflow size={15} /> Process Flow Graph & Logic
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary py-2 px-4 rounded-lg">
            <ShieldCheck size={15} /> Safety & Rules
          </TabsTrigger>
          <TabsTrigger value="dictionary" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary py-2 px-4 rounded-lg">
            <Hash size={15} /> Data Dictionary
          </TabsTrigger>
          <TabsTrigger value="formulas" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary py-2 px-4 rounded-lg">
            <GitBranch size={15} /> Formula Logic
          </TabsTrigger>
        </TabsList>

        {/* ----------------- TAB 1: WORKFLOW GRAPH & LOGIC ----------------- */}
        <TabsContent value="workflow" className="space-y-6">
          {/* Step Flow Pipeline (Horizontal on Desktop, Scrollable) */}
          <Card className="glass border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListTree size={18} className="text-primary" />
                    End-to-End Operational Pipeline
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click any node or hover to inspect database mutations, validation rules, and error handling.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800/80 text-muted-foreground border border-slate-700/60 hidden sm:inline-block">
                  7 Core Warehouse States
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {/* Pipeline Track */}
              <div className="overflow-x-auto pb-4 pt-2">
                <div className="flex items-center min-w-[920px] gap-2">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const StepIcon = step.icon
                    const isSelected = selectedStep.id === step.id
                    const isHovered = hoveredStep?.id === step.id
                    return (
                      <React.Fragment key={step.id}>
                        {/* Node Card */}
                        <div
                          onClick={() => setSelectedStep(step)}
                          onMouseEnter={() => setHoveredStep(step)}
                          onMouseLeave={() => setHoveredStep(null)}
                          className={`flex-1 relative cursor-pointer rounded-xl p-3.5 border transition-all duration-200 select-none ${
                            isSelected
                              ? "bg-slate-800/90 border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10 -translate-y-1"
                              : isHovered
                              ? "bg-slate-800/60 border-slate-600 -translate-y-0.5"
                              : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-800 text-muted-foreground border border-slate-700">
                              STEP 0{step.step}
                            </span>
                            <div className={`p-1.5 rounded-lg border bg-gradient-to-br ${step.color}`}>
                              <StepIcon size={14} />
                            </div>
                          </div>
                          <h4 className="font-semibold text-xs text-foreground truncate">{step.title}</h4>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{step.subtitle}</p>
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-primary truncate">{step.endpoint.split(" ")[0]}</span>
                            <span className="text-muted-foreground truncate">{step.model}</span>
                          </div>

                          {/* Pulsing indicator if active */}
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                            </span>
                          )}
                        </div>

                        {/* Arrow separator between nodes */}
                        {idx < WORKFLOW_STEPS.length - 1 && (
                          <div className="text-slate-600 flex-shrink-0 px-1">
                            <ArrowRight size={16} className="text-slate-600 animate-pulse" />
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Inspector Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Step Specifications & Validation Rules */}
            <div className="lg:col-span-8 space-y-6">
              {/* Selected Step Header Card */}
              <Card className="glass border-slate-800 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${selectedStep.color}`} />
                <CardHeader className="pb-3 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl border bg-gradient-to-br ${selectedStep.color}`}>
                        {React.createElement(selectedStep.icon, { size: 24 })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-primary">
                            STEP 0{selectedStep.step}
                          </span>
                          <h2 className="text-lg font-bold text-foreground">{selectedStep.title}</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedStep.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-amber-400 font-semibold">
                        {selectedStep.endpoint}
                      </code>
                      <Badge variant="outline" className={selectedStep.badgeColor}>
                        Model: {selectedStep.model}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <p className="text-sm text-foreground/90 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed">
                    {selectedStep.summary}
                  </p>

                  {/* Backend Logic Steps */}
                  <div>
                    <h3 className="text-xs font-bold text-primary tracking-wide uppercase mb-2 flex items-center gap-1.5">
                      <Cpu size={14} /> Execution Pipeline (Actual Codebase Logic)
                    </h3>
                    <div className="space-y-2">
                      {selectedStep.backendLogic.map((logic, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-foreground/80 bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/60">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center justify-center font-mono text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-snug">{logic}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Validation Rules Table */}
                  <div>
                    <h3 className="text-xs font-bold text-amber-400 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Validation Gates & Guard Conditions
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/80 text-muted-foreground font-mono text-[11px] border-b border-slate-800">
                          <tr>
                            <th className="p-2.5">Rule / Guard</th>
                            <th className="p-2.5">Evaluated Condition</th>
                            <th className="p-2.5">HTTP Status</th>
                            <th className="p-2.5">Returned Error Response</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedStep.validations.map((v, i) => (
                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-2.5 font-semibold text-foreground">{v.rule}</td>
                              <td className="p-2.5 font-mono text-[11px] text-cyan-400/90">{v.condition}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  v.status.startsWith("400") ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                                  v.status.startsWith("404") ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                                  "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                }`}>
                                  {v.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-muted-foreground font-mono text-[11px]">{v.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Backend Code Snippet */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 tracking-wide uppercase mb-2 flex items-center gap-1.5">
                      <FileCode2 size={14} /> Backend Controller Implementation
                    </h3>
                    <pre className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                      <code>{selectedStep.codeSnippet}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Interactive Validation Simulator */}
              <Card className="glass border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                      <Sparkles size={16} className="text-amber-400" />
                      Live Scenario Simulator (Test Real Guard Rules)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Interactive Edge Cases
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select a warehouse scenario to test how backend validations reject invalid operations or accept valid ones.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scenario selection buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {SCENARIOS.map(sc => (
                      <button
                        key={sc.id}
                        onClick={() => setSimulationScenario(sc.id)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                          simulationScenario === sc.id
                            ? "bg-primary/15 border-primary text-foreground font-semibold shadow-sm"
                            : "bg-slate-900/40 border-slate-800 text-muted-foreground hover:bg-slate-800/40 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs truncate">{sc.title}</span>
                          <span className={`w-2 h-2 rounded-full ${sc.type === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                        </div>
                        <p className="text-[10px] line-clamp-1 opacity-70">{sc.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Active Scenario Display */}
                  {(() => {
                    const activeSc = SCENARIOS.find(s => s.id === simulationScenario) || SCENARIOS[0]
                    return (
                      <div className={`p-4 rounded-xl border ${
                        activeSc.type === "success"
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          : "bg-red-950/20 border-red-500/30 text-red-300"
                      } space-y-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {activeSc.type === "success" ? (
                              <CheckCircle2 size={18} className="text-emerald-400" />
                            ) : (
                              <XCircle size={18} className="text-red-400" />
                            )}
                            <h4 className="font-bold text-xs uppercase tracking-wide">
                              Scenario: {activeSc.title}
                            </h4>
                          </div>
                          <Badge variant="outline" className={activeSc.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-red-500/40 text-red-400"}>
                            {activeSc.type === "success" ? "PASS / ACCEPTED" : "REJECTED BY GUARD"}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/90">{activeSc.desc}</p>

                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                          <div className="text-muted-foreground font-sans text-[10px] uppercase font-bold tracking-wider">
                            Guard Condition Checks:
                          </div>
                          {activeSc.conditions.map((c, i) => (
                            <div key={i} className="text-cyan-300 flex items-center gap-2">
                              <span className="text-primary font-bold">›</span> {c}
                            </div>
                          ))}
                        </div>

                        <div className="pt-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                            System Response:
                          </span>
                          <code className="block text-xs font-mono p-2 rounded bg-black/40 border border-slate-800 text-foreground break-all">
                            {activeSc.expectedResult}
                          </code>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Parameters & Live Context On-Hover Card */}
            <div className="lg:col-span-4 space-y-6">
              {/* Dynamic Hover Card & Rules */}
              <Card className="glass border-primary/30 sticky top-4 shadow-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase tracking-wider font-bold text-primary flex items-center gap-1.5">
                      <Info size={14} /> Live Context & On-Hover Insights
                    </CardTitle>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {hoveredStep ? "Hovering Node" : "Active Selection"}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-1">
                    {activeHover.title} — {activeHover.subtitle}
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* On Hover Conditions */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Warehouse Rules & Behavior:
                    </span>
                    <div className="space-y-2">
                      {activeHover.onHoverConditions.map((cond, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-foreground/90 leading-relaxed">
                          {cond}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Required Inputs for this Step */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Input Payload / Parameters:
                    </span>
                    <div className="space-y-1.5">
                      {activeHover.inputs.map((inp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs flex flex-col gap-0.5">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-cyan-400">{inp.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded ${inp.required ? "bg-red-500/10 text-red-400" : "bg-slate-800 text-muted-foreground"}`}>
                              {inp.required ? "Required" : "Optional"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="truncate">{inp.desc}</span>
                            <span className="font-mono text-[10px] text-amber-300">eg: {inp.example}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Decision Tree Helper */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-500/20 text-xs space-y-2">
                    <span className="font-bold text-[11px] text-indigo-300 flex items-center gap-1.5">
                      <GitBranch size={13} /> Operation Decision Rule:
                    </span>
                    <p className="text-[11px] text-foreground/80 leading-normal">
                      {activeHover.id === "transfer" && "Need to move an item to an empty slot? Transfer auto-assigns it. Slot already occupied by a different item? Transfer is BLOCKED; use SWAP instead."}
                      {activeHover.id === "swap" && "Swapping two locations switches their physical materials AND updates all past ledger movements so transaction history remains 100% consistent."}
                      {activeHover.id === "assign-material" && "A location cannot be assigned to another material until all physical stock of the previous material is completely zeroed out."}
                      {activeHover.id === "create-rack" && "Always generate racks first. Locations are generated hierarchically (R-B-L-S). Materials cannot exist in physical space without generated locations."}
                      {activeHover.id === "register-material" && "Set accurate reorderLevel so that warehouse operators get automated warnings when stock is depleted."}
                      {activeHover.id === "stock-in" && "Stock IN increases location stock balance. Stock is tracked per material and per location."}
                      {activeHover.id === "stock-out" && "Stock OUT decreases location balance. Cannot issue more stock than currently available in that location."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 2: SAFETY RULES ----------------- */}
        <TabsContent value="safety">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400"/> Safety & Storage Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full wms-table min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="text-left w-40">Topic</th>
                      <th className="text-left">Rule / Guidance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safetyRules.map((r, i) => (
                      <tr key={i}>
                        <td className="font-semibold text-primary text-xs align-top pt-3">{r.topic}</td>
                        <td className="text-sm text-foreground/80">{r.rule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 3: DATA DICTIONARY ----------------- */}
        <TabsContent value="dictionary">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash size={16} className="text-cyan-400"/> Data Dictionary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full wms-table min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="text-left">Field</th>
                      <th className="text-left">Meaning</th>
                      <th className="text-left">Example / Allowed Values</th>
                      <th className="text-center">Required?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataDictionary.map((d, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs font-bold text-primary">{d.field}</td>
                        <td className="text-sm text-foreground/80">{d.meaning}</td>
                        <td className="text-xs font-mono text-muted-foreground">{d.example}</td>
                        <td className="text-center text-xs text-muted-foreground">{d.required}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 4: FORMULAS ----------------- */}
        <TabsContent value="formulas">
          <div className="space-y-4">
            {[
              { 
                title: "Location ID Generation", 
                excel: '=IF(COUNTA(A2:D2)=0,"",A2&"-"&"B"&TEXT(B2,"00")&"-"&C2&"-"&D2)', 
                js: 'rack + "-B" + String(bay).padStart(2,"0") + "-" + level + "-" + slot', 
                desc: "Auto-generates the unique Location ID from 4 fields. Leading zeros are used for bay." 
              },
              { 
                title: "Location Quantity (Live)", 
                excel: '=SUMIFS(StockMov.Qty, StockMov.LocID, locID, Type,"IN") - SUMIFS(...,"OUT")', 
                js: 'movements.filter(m=>m.locationId===locId && m.type==="IN").reduce((s,m)=>s+m.qty,0) - OUT', 
                desc: "Calculates current qty by summing all IN movements minus all OUT movements for that location." 
              },
              { 
                title: "Location Status", 
                excel: '=IF(E2="","",IF(J2>0,"Occupied","Available"))', 
                js: 'quantity > 0 ? "Occupied" : "Available"', 
                desc: "Status is derived live from quantity — no manual update needed." 
              },
              { 
                title: "Inventory: Stock IN", 
                excel: '=SUMIFS(StockMov.Qty, MatID, A2, LocID, D2, Type,"IN")', 
                js: 'movements.filter(m=>m.materialId===id && m.locationId===locId && m.type==="IN").reduce(sum)', 
                desc: "Sums all IN transactions for this specific material at this specific location." 
              },
              { 
                title: "Inventory: Current Stock", 
                excel: "=E2+F2-G2 (Opening + IN - OUT)", 
                js: "openingStock + stockIn - stockOut", 
                desc: "Simple arithmetic: opening stock plus all received, minus all issued." 
              },
              { 
                title: "Inventory: Stock Status", 
                excel: '=IF(H2<=J2,"REORDER","OK")', 
                js: 'currentStock <= reorderLevel ? "REORDER" : "OK"', 
                desc: "When current stock drops to or below the reorder threshold, status becomes REORDER." 
              },
              { 
                title: "Material Desc Lookup", 
                excel: '=VLOOKUP(A2, MaterialMaster.A:E, 2, FALSE)', 
                js: 'materials.find(m=>m.id===materialId)?.description', 
                desc: "Fetches description from Material Master using Material ID as the key." 
              },
              { 
                title: "Material Name Formula", 
                excel: '=IF(A2="","",A2 & " (" & B2 & ")")', 
                js: '`${id} (${description})`', 
                desc: "Creates a combined display name used as lookup key in Location Master." 
              },
            ].map(f => (
              <Card key={f.title} className="glass">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1">Excel Formula</p>
                      <code className="block text-[11px] font-mono bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 dark:border-amber-500/20 rounded-lg p-3 text-amber-700 dark:text-amber-300 break-all">{f.excel}</code>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 mb-1">JavaScript Equivalent</p>
                      <code className="block text-[11px] font-mono bg-cyan-500/10 dark:bg-cyan-500/5 border border-cyan-500/25 dark:border-cyan-500/20 rounded-lg p-3 text-cyan-700 dark:text-cyan-300 break-all">{f.js}</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const xlsx = require("xlsx");
const fs = require("fs");

const wb = xlsx.readFile("C:/Users/DELL/Downloads/Warehouse Rack Inventory.xlsx", { cellDates: true });

// RACKS
const racksSheet = xlsx.utils.sheet_to_json(wb.Sheets["Rack Master"]);
const racks = racksSheet.map(r => ({
  id: r["Rack ID"] || "",
  type: r["Type"] || "Pallet Rack",
  description: r["Description"] || "",
  bayCount: Number(r["Bay Count"]) || 1,
  levels: r["Levels"] ? String(r["Levels"]).split(",").map(s => s.trim()) : [],
  slots: r["Slots"] ? String(r["Slots"]).split(",").map(s => s.trim()) : [],
  side: r["Side Access"] || "Single-sided",
  status: r["Status"] || "Active"
})).filter(r => r.id);
fs.writeFileSync("src/lib/data/racks.js", "export const racks = " + JSON.stringify(racks, null, 2));

// LOCATIONS
const locSheet = xlsx.utils.sheet_to_json(wb.Sheets["Location Master"]);
const locations = locSheet.map(l => ({
  locationId: l["Location ID"] || "",
  rack: l["Rack"] || "",
  bay: Number(l["Bay"]) || 1,
  level: l["Level"] || "",
  slot: String(l["Slot"]) || "",
  materialId: l["Material ID"] || "",
  batch: l["Batch"] || "",
  notes: ""
})).filter(l => l.locationId);
fs.writeFileSync("src/lib/data/locations.js", "export const locations = " + JSON.stringify(locations, null, 2));

// MATERIALS
const matSheet = xlsx.utils.sheet_to_json(wb.Sheets["Material Master"]);
const materials = matSheet.map(m => ({
  id: m["Material ID"] || "",
  name: m["Name / Description"] || "",
  category: m["Category"] || "",
  unit: m["Unit"] || "PCS",
  reorderLevel: Number(m["Reorder Level"]) || 0
})).filter(m => m.id);
fs.writeFileSync("src/lib/data/materials.js", "export const materials = " + JSON.stringify(materials, null, 2));

// MOVEMENTS
const movSheet = xlsx.utils.sheet_to_json(wb.Sheets["Stock Movement"] || wb.Sheets["Stock Movements"] || []);
const movements = movSheet.map((m, i) => {
  let d = m["Date"];
  if (d instanceof Date) { d = d.toISOString().split("T")[0] + " 10:00:00"; }
  else if (typeof d === "number") {
     d = new Date((d - 25569) * 86400 * 1000).toISOString().split("T")[0] + " 10:00:00";
  }
  const matIdRaw = String(m["Material ID"] || locSheet.find(l => l["Location ID"] === m["Location ID"])?.["Material ID"] || "UNKNOWN");
  const cleanMatId = matIdRaw.includes(" (") ? matIdRaw.split(" (")[0] : matIdRaw;
  return {
    id: "MOV" + (Date.now() + i),
    date: d || new Date().toISOString(),
    locationId: m["Location ID"] || "",
    materialId: cleanMatId,
    materialDesc: m["Material Description"] || "",
    type: m["Transaction Type"] || "IN",
    quantity: Number(m["Quantity"]) || 0,
    unit: m["Unit"] || "PCS",
    reference: m["Reference"] || "",
    user: m["User"] || "System",
    notes: m["Notes"] || ""
  };
}).filter(m => m.locationId);
fs.writeFileSync("src/lib/data/movements.js", "export const movements = " + JSON.stringify(movements, null, 2));

console.log(`Migration complete! Loaded ${racks.length} racks, ${locations.length} locations, ${materials.length} materials, ${movements.length} movements.`);


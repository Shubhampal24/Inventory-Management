const xlsx = require("xlsx");
const fs = require("fs");

const wb = xlsx.readFile("C:/Users/DELL/Downloads/Warehouse Rack Inventory.xlsx", { cellDates: true });

const matSheet = xlsx.utils.sheet_to_json(wb.Sheets["Material Master"]);
const materials = matSheet.map(m => ({
  id: m["Material ID"] || "",
  name: m["Material Description"] || m["Name / Description"] || "",
  category: m["Category"] || "",
  unit: m["Unit"] || "PCS",
  reorderLevel: Number(m["Reorder Level"]) || 0
})).filter(m => m.id);
fs.writeFileSync("src/lib/data/materials.js", "export const materials = " + JSON.stringify(materials, null, 2));

console.log("Materials fixed!");

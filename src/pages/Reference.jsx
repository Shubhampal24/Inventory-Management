import * as React from "react"
import { safetyRules, dataDictionary } from "@/lib/data/reference.js"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BookOpen, ShieldCheck, Hash, FileText, GitBranch } from "lucide-react"

export default function Reference() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <Tabs defaultValue="safety">
        <TabsList className="mb-4">
          <TabsTrigger value="safety"><ShieldCheck size={14}/> Safety & Rules</TabsTrigger>
          <TabsTrigger value="dictionary"><Hash size={14}/> Data Dictionary</TabsTrigger>
          <TabsTrigger value="formulas"><GitBranch size={14}/> Formula Logic</TabsTrigger>
        </TabsList>

        <TabsContent value="safety">
          <Card className="glass">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400"/> Safety & Storage Rules</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full wms-table min-w-[500px]">
                  <thead><tr><th className="text-left w-40">Topic</th><th className="text-left">Rule / Guidance</th></tr></thead>
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

        <TabsContent value="dictionary">
          <Card className="glass">
            <CardHeader><CardTitle className="flex items-center gap-2"><Hash size={16} className="text-cyan-400"/> Data Dictionary</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full wms-table min-w-[700px]">
                  <thead><tr><th className="text-left">Field</th><th className="text-left">Meaning</th><th className="text-left">Example / Allowed Values</th><th className="text-center">Required?</th></tr></thead>
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

        <TabsContent value="formulas">
          <div className="space-y-4">
            {[
              { title: "Location ID Generation", excel: '=IF(COUNTA(A2:D2)=0,"",A2&"-"&"B"&TEXT(B2,"00")&"-"&C2&"-"&D2)', js: 'rack + "-B" + String(bay).padStart(2,"0") + "-" + level + "-" + slot', desc: "Auto-generates the unique Location ID from 4 fields. Leading zeros are used for bay." },
              { title: "Location Quantity (Live)", excel: '=SUMIFS(StockMov.Qty, StockMov.LocID, locID, Type,"IN") - SUMIFS(...,"OUT")', js: 'movements.filter(m=>m.locationId===locId && m.type==="IN").reduce((s,m)=>s+m.qty,0) - OUT', desc: "Calculates current qty by summing all IN movements minus all OUT movements for that location." },
              { title: "Location Status", excel: '=IF(E2="","",IF(J2>0,"Occupied","Available"))', js: 'quantity > 0 ? "Occupied" : "Available"', desc: "Status is derived live from quantity — no manual update needed." },
              { title: "Inventory: Stock IN", excel: '=SUMIFS(StockMov.Qty, MatID, A2, LocID, D2, Type,"IN")', js: 'movements.filter(m=>m.materialId===id && m.locationId===locId && m.type==="IN").reduce(sum)', desc: "Sums all IN transactions for this specific material at this specific location." },
              { title: "Inventory: Current Stock", excel: "=E2+F2-G2 (Opening + IN - OUT)", js: "openingStock + stockIn - stockOut", desc: "Simple arithmetic: opening stock plus all received, minus all issued." },
              { title: "Inventory: Stock Status", excel: '=IF(H2<=J2,"REORDER","OK")', js: 'currentStock <= reorderLevel ? "REORDER" : "OK"', desc: "When current stock drops to or below the reorder threshold, status becomes REORDER." },
              { title: "Material Desc Lookup", excel: '=VLOOKUP(A2, MaterialMaster.A:E, 2, FALSE)', js: 'materials.find(m=>m.id===materialId)?.description', desc: "Fetches description from Material Master using Material ID as the key." },
              { title: "Material Name Formula", excel: '=IF(A2="","",A2 & " (" & B2 & ")")', js: '`${id} (${description})`', desc: "Creates a combined display name used as lookup key in Location Master." },
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

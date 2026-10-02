const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/RackManager.jsx',
  'src/pages/LocationMaster.jsx',
  'src/pages/MaterialMaster.jsx',
  'src/pages/StockMovement.jsx'
];

files.forEach(f => {
  const fp = path.join(__dirname, f);
  let content = fs.readFileSync(fp, 'utf8');
  
  // Replace: onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
  // With: onChange={e => setForm({ ...form, key: e.target.value })}
  
  // 1. RackManager, MaterialMaster, StockMovement
  content = content.replace(/onChange=\{e => setForm\(f => \(\{\s*\.\.\.f,\s*([a-zA-Z0-9_]+):\s*e\.target\.value(\.toUpperCase\(\))?\s*\}\)\)\}/g, 'onChange={e => setForm({ ...form, $1: e.target.value$2 })}');
  
  // 2. LocationMaster (newLoc)
  content = content.replace(/onChange=\{e => setNewLoc\(f => \(\{\s*\.\.\.f,\s*([a-zA-Z0-9_]+):\s*e\.target\.value(\.toUpperCase\(\))?\s*\}\)\)\}/g, 'onChange={e => setNewLoc({ ...newLoc, $1: e.target.value$2 })}');
  
  fs.writeFileSync(fp, content);
});

console.log('Fixed inputs successfully');

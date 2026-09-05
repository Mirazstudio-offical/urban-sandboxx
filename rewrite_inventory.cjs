const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryModal.tsx', 'utf8');

// Find the start of the grid
const gridStart = '<div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">';
const splitParts = content.split(gridStart);

if (splitParts.length === 2) {
  let bottom = splitParts[1];
  
  // bottom has `{activeTab === 'inventory' ? ( ... ) : ( ... surroundings ... )}`
  // Let's replace `{activeTab === 'inventory' ? (` with `{activeTab === 'inventory' && (`
  bottom = bottom.replace('{activeTab === \'inventory\' ? (', '{activeTab === \'inventory\' && (');
  
  // Now we need to find `) : (` which splits inventory and surroundings.
  // The surroundings block looks like:
  // `) : (\n            <div className="lg:col-span-12 flex flex-col gap-4">`
  
  // Let's just find `) : (` and hope it's the right one (there might be others inside the inventory, like for button text).
  // I will use regex or specifically search for `            ) : (\n                <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">`
  // Wait, let's use a simpler way.
}

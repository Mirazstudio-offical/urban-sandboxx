const fs = require('fs');
let lines = fs.readFileSync('src/components/InventoryModal.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{activeTab === 'clothing' && (")) {
    if (!lines[i-1].includes(")}")) {
      lines.splice(i, 0, "          )}");
      break;
    }
  }
}

fs.writeFileSync('src/components/InventoryModal.tsx', lines.join('\n'), 'utf8');

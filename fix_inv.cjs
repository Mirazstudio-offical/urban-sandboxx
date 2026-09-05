const fs = require('fs');
let code = fs.readFileSync('src/components/InventoryModal.tsx', 'utf8');

code = code.replace(
  ") : (\n            /* SURROUNDINGS / WORLD INTERACTION TAB */\n            <div className=\"lg:col-span-12 flex flex-col gap-4\">",
  ")}\n          {activeTab === 'surroundings' && (\n            <div className=\"lg:col-span-12 flex flex-col gap-4\">"
);

fs.writeFileSync('src/components/InventoryModal.tsx', code, 'utf8');

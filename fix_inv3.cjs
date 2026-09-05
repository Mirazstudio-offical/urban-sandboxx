const fs = require('fs');
let code = fs.readFileSync('src/components/InventoryModal.tsx', 'utf8');

code = code.replace(
  /              \)\}\n            <\/div>\n          \{activeTab === 'clothing' && \(/,
  "              )}\n            </div>\n          )}\n          {activeTab === 'clothing' && ("
);

fs.writeFileSync('src/components/InventoryModal.tsx', code, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'inventory: createDefaultPlayerInventory(),',
  `equippedClothing: {
      torso: { shirt: createItem('sweater_blue', 1) },
      legs: { shirt: createItem('jeans_blue', 1) },
      feet: { outerwear: createItem('work_boots', 1) }
    },
    inventory: createDefaultPlayerInventory(),`
);

fs.writeFileSync('src/App.tsx', content, 'utf8');

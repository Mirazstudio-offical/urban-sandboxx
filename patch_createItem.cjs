const fs = require('fs');
let content = fs.readFileSync('src/items.ts', 'utf8');

content = content.replace(
  'return {',
  'const stats = CLOTHING_STATS[def.itemId];\n  return {'
);
content = content.replace(
  'weight: def.weight,',
  'weight: def.weight,\n    clothingStats: stats,'
);

fs.writeFileSync('src/items.ts', content, 'utf8');

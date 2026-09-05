const fs = require('fs');
let code = fs.readFileSync('src/items.ts', 'utf8');

code = code.replace(
  "  // FACE\n    usable: true,\n  },\n  scarf_blue: {",
  "  // FACE\n  scarf_blue: {"
);

fs.writeFileSync('src/items.ts', code, 'utf8');

const fs = require('fs');
let code = fs.readFileSync('src/components/MobileTouchControls.tsx', 'utf8');

code = code.replace(
  "  Gauge\n  ChevronUp",
  "  Gauge,\n  ChevronUp"
);

fs.writeFileSync('src/components/MobileTouchControls.tsx', code);

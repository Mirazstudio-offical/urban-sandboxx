const fs = require('fs');
let code = fs.readFileSync('src/cityMap.ts', 'utf8');

// We want to increase the width/height of residential and commercial buildings.
// They are often hardcoded as 65 or 75. Let's make them 110 or 120.

code = code.replace(/const northH = 65;/g, 'const northH = 110;');
code = code.replace(/const westW = 65;/g, 'const westW = 110;');
code = code.replace(/const nH = 65;/g, 'const nH = 110;');
code = code.replace(/const sH = 65;/g, 'const sH = 110;');
code = code.replace(/const wW = 65;/g, 'const wW = 110;');
code = code.replace(/const atpW = 75;/g, 'const atpW = 120;');
code = code.replace(/const wH = 75;/g, 'const wH = 120;');
code = code.replace(/const repairH = 75;/g, 'const repairH = 120;');

code = code.replace(/const innerH - 125/g, 'const innerH - 170'); // Adjusting derived sizes

// Let's also fix cottage sizes
code = code.replace(/const cW = 65 \+ Math.random\(\) \* 15;/g, 'const cW = 100 + Math.random() * 20;');
code = code.replace(/const cH = 65 \+ Math.random\(\) \* 15;/g, 'const cH = 100 + Math.random() * 20;');

fs.writeFileSync('src/cityMap.ts', code);

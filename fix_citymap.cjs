const fs = require('fs');
let code = fs.readFileSync('src/cityMap.ts', 'utf8');

code = code.replace(/const northH = 65;/g, 'const northH = 110;');
code = code.replace(/const westW = 65;/g, 'const westW = 110;');
code = code.replace(/const nH = 65;/g, 'const nH = 110;');
code = code.replace(/const sH = 65;/g, 'const sH = 110;');
code = code.replace(/const wW = 65;/g, 'const wW = 110;');
code = code.replace(/const atpW = 75;/g, 'const atpW = 120;');
code = code.replace(/const wH = 75;/g, 'const wH = 120;');
code = code.replace(/const repairH = 75;/g, 'const repairH = 120;');
code = code.replace(/innerH - 125/g, 'innerH - 170'); 
code = code.replace(/const cW = 65 \+ Math.random\(\) \* 15;/g, 'const cW = 100 + Math.random() * 20;');
code = code.replace(/const cH = 65 \+ Math.random\(\) \* 15;/g, 'const cH = 100 + Math.random() * 20;');

fs.writeFileSync('src/cityMap.ts', code);

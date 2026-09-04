const fs = require('fs');
let code = fs.readFileSync('src/physics.ts', 'utf8');

code = code.replace(
  "const heatGen = 3.5 + (Math.abs(car.speed) / 100) * 8.0;\n    let cooling = 0;\n    if (eng.radiatorWater > 10) {\n      const coolingFactor = (eng.radiatorWater / 100) * (1 + (Math.abs(car.speed) / 80) * 0.5);\n      cooling = (eng.temperature - 88) * 0.15 * coolingFactor;",
  "const heatGen = 3.5 + (Math.abs(car.speed) / 100) * 8.0;\n    let cooling = 0;\n    if (eng.radiatorWater > 10) {\n      const coolingFactor = (eng.radiatorWater / 100) * (1 + (Math.abs(car.speed) / 80) * 0.5);\n      cooling = (eng.temperature - 85) * 0.8 * coolingFactor;"
);

fs.writeFileSync('src/physics.ts', code);

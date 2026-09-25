const fs = require('fs');
let code = fs.readFileSync('build_industrial_zone.cjs', 'utf8');

const replacement = `// 6. Timber Flatbed Truck at Sawmill
addVehicle('truck_flatbed', 7450, 280, 0);

// 7. Semi Tractor (Седельный тягач)
addVehicle('truck_semi', 7350, 1500, Math.PI / 2);

// 8. Semi Trailer (Полуприцеп)
addVehicle('trailer_semi', 7350, 1450, Math.PI / 2);
`;

code = code.replace("// 6. Timber Flatbed Truck at Sawmill\naddVehicle('truck_flatbed', 7450, 280, 0);", replacement);
fs.writeFileSync('build_industrial_zone.cjs', code);

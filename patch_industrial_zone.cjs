const fs = require('fs');
let code = fs.readFileSync('build_industrial_zone.cjs', 'utf8');

const anchor = "  // 6. Timber Flatbed Truck at Sawmill";
const insertion = `  // 7. Semi Tractor (Седельный тягач)
  addVehicle('truck_semi', 7350, 1500, Math.PI / 2);
  
  // 8. Semi Trailer (Полуприцеп)
  // Hitching the trailer: trailer is behind the tractor.
  // Tractor angle is PI/2 (facing South). Trailer should also be PI/2, positioned slightly north.
  addVehicle('trailer_semi', 7350, 1420, Math.PI / 2);

`;

code = code.replace(anchor, insertion + anchor);
fs.writeFileSync('build_industrial_zone.cjs', code);
console.log("Patched industrial zone spawn script!");

const fs = require('fs');
let code = fs.readFileSync('src/items.ts', 'utf8');
code = code.replace(
  "export function getVehicleRequiredKeyType(type: string): 'gold' | 'iron' | null {",
  `export function getVehicleRequiredKeyType(typeOrVehicle: string | Vehicle): 'gold' | 'iron' | null {
  let type = '';
  if (typeof typeOrVehicle === 'string') {
    type = typeOrVehicle;
  } else {
    // Unowned (parked/map-spawned) vehicles don't require keys
    if (!typeOrVehicle.ownerId && !typeOrVehicle.keyId) return null;
    type = typeOrVehicle.type;
  }`
);
code = code.replace(/getVehicleRequiredKeyType\(veh\.type\)/g, "getVehicleRequiredKeyType(veh)");
code = code.replace(/getVehicleRequiredKeyType\(targetVeh\.type\)/g, "getVehicleRequiredKeyType(targetVeh)");

fs.writeFileSync('src/items.ts', code);
console.log("Patched src/items.ts");

const fs = require('fs');

const current = fs.readFileSync('src/buildingInteriors.ts', 'utf8').split('\n');
const head = current.slice(0, 100).join('\n'); // Up to line 100

const missing = `export function getBuildingFloorsCount(bld: Building): number {
  switch (bld.type) {
    case 'business_center':
      return 16;
    case 'modern_residential':
      return 12;
    case 'panel_apartment':
      return 9;
    case 'office':
    case 'brick_residential':
      return 5;
    case 'hospital':
    case 'police_station':
      return 3;
    case 'shopping_mall':
    case 'commercial':
    case 'school_kindergarten':
    case 'suburban':
    case 'fire_station':
    case 'transit_hub':
    case 'cultural_center':
      return 2;
    case 'shop':
    case 'car_dealership':
    default:
      return 1;
  }
}
`;

// Extract newFunc from rewrite_interiors.cjs by doing split
const rewriteScript = fs.readFileSync('rewrite_interiors.cjs', 'utf8');
const parts = rewriteScript.split('const newFunc = `');
let newFuncPart = parts[1].split('`;\n\nfs.writeFileSync(')[0];

// Remove the escaping from the template literal!
newFuncPart = newFuncPart.replace(/\\\$/g, '$');
newFuncPart = newFuncPart.replace(/\\`/g, '`');

const constrainIdx = current.findIndex(line => line.includes('export function constrainPlayerToInterior'));
const tail = current.slice(constrainIdx).join('\n');

fs.writeFileSync('src/buildingInteriors.ts', head + '\n' + missing + '\n' + newFuncPart + '\n' + tail);

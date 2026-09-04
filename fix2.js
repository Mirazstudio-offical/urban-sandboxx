const fs = require('fs');

const current = fs.readFileSync('src/buildingInteriors.ts', 'utf8').split('\n');
// We need the head up to getBuildingFloorsCount
const countIdx = current.findIndex(line => line.includes('export function getBuildingFloorsCount'));
const head = current.slice(0, countIdx).join('\n');

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

const rewriteScript = fs.readFileSync('rewrite_interiors.cjs', 'utf8');
const startMatch = "const newFunc = `";
const endMatch = "`;\nfs.writeFileSync";
let startIndex = rewriteScript.indexOf(startMatch) + startMatch.length;
let endIndex = rewriteScript.indexOf(endMatch);
if (endIndex === -1) {
    endIndex = rewriteScript.lastIndexOf("`\nfs.writeFileSync");
    if (endIndex === -1) {
        endIndex = rewriteScript.lastIndexOf("`\n\nfs.writeFileSync");
    }
}
let newFuncPart = rewriteScript.substring(startIndex, endIndex);

// Unescape \$ and \`
newFuncPart = newFuncPart.replace(/\\\$/g, '$');
newFuncPart = newFuncPart.replace(/\\`/g, '`');

const constrainIdx = current.findIndex(line => line.includes('export function constrainPlayerToInterior'));
const tail = current.slice(constrainIdx).join('\n');

fs.writeFileSync('src/buildingInteriors.ts', head + '\n' + missing + '\n' + newFuncPart + '\n' + tail);

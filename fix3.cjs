const fs = require('fs');

// We need the head from the current file (up to getBuildingFloorsCount)
const current = fs.readFileSync('src/buildingInteriors.ts', 'utf8').split('\n');
const firstLineOfGetBuildingFloorsCount = current.findIndex(line => line.includes('export function getBuildingFloorsCount'));
const head = current.slice(0, firstLineOfGetBuildingFloorsCount === -1 ? 100 : firstLineOfGetBuildingFloorsCount).join('\n');

const getBuildingFloorsCountCode = `export function getBuildingFloorsCount(bld: Building): number {
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
}`;

// Get newFunc exactly from rewrite_interiors.cjs
let newFunc = '';
const oldWriteFileSync = fs.writeFileSync;
fs.writeFileSync = function(path, data) {
    if (path === 'src/buildingInteriors.ts') {
        // We do nothing, we just want newFunc
    } else {
        oldWriteFileSync(path, data);
    }
};

// Evaluate the script in a context to extract newFunc
const code = fs.readFileSync('rewrite_interiors.cjs', 'utf8');
const scriptContext = {
    require: require,
    console: console,
};
const vm = require('vm');
vm.createContext(scriptContext);
// We can't easily extract a local variable, let's just parse it manually correctly.

const startToken = 'const newFunc = `';
const endToken = '\n`\n\nfs.writeFileSync';
let start = code.indexOf(startToken);
let end = code.lastIndexOf(endToken);
if (end === -1) end = code.lastIndexOf('`\nfs.writeFileSync');

newFunc = code.substring(start + startToken.length, end);

// The tail is from constrainPlayerToInterior onwards
const constrainIdx = current.findIndex(line => line.includes('export function constrainPlayerToInterior'));
const tail = current.slice(constrainIdx).join('\n');

oldWriteFileSync('src/buildingInteriors.ts', head + '\n' + getBuildingFloorsCountCode + '\n' + newFunc + '\n' + tail);

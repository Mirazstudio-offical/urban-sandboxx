const fs = require('fs');

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

const constrainIdx = current.findIndex(line => line.includes('export function constrainPlayerToInterior'));
const tail = current.slice(constrainIdx).join('\n');

const oldWriteFileSync = fs.writeFileSync;
fs.writeFileSync = function(path, data) {
    if (path === 'src/buildingInteriors.ts') {
        // Here `data` is what rewrite_interiors.cjs TRIES to write.
        // `data` is `head + '\n' + newFunc + '\n' + tail` from rewrite_interiors.cjs
        // We only want `newFunc` from it.
        // Wait, since we are overriding it, let's just let it run, and extract newFunc from data.
        
        // Wait, why don't I just split the generated data?
        // Let's just find `export function generateBuildingLayout` in data, and `return {`...`}`
        
        // We can just extract newFunc from data string using index!
        const startIdx = data.indexOf('export function generateBuildingLayout');
        
        // It ends just before the old tail which started at `constrainPlayerToInterior`? No, old tail was from line 635!
        // We can just parse the data from rewrite_interiors.cjs which has `head + '\n' + newFunc + '\n' + tail`
        
        // Actually, we can just grab `newFunc` from the script by evaluating it directly!
        const rewriteCode = fs.readFileSync('rewrite_interiors.cjs', 'utf8');
        // Let's replace the fs.writeFileSync call with nothing, and just return newFunc
        const evalCode = rewriteCode.replace(/fs\.writeFileSync.*/g, 'module.exports = newFunc;');
        const m = {exports: {}};
        const f = new Function('require', 'module', 'exports', evalCode);
        f(require, m, m.exports);
        const actualNewFunc = m.exports;
        
        oldWriteFileSync('src/buildingInteriors.ts', head + '\n' + getBuildingFloorsCountCode + '\n' + actualNewFunc + '\n' + tail);
    }
};

require('./rewrite_interiors.cjs');

import { generateCityWorld } from '../src/cityMap.js';
import type { Building, StreetProp, Tree } from '../src/types.js';

export function checkAllCollisions() {
  const world = generateCityWorld();
  const { buildings, props, trees } = world;

  const buildingOverlaps: { b1: string; b2: string; xOverlap: number; yOverlap: number; details: string }[] = [];
  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const b1 = buildings[i];
      const b2 = buildings[j];

      const xOverlap = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
      const yOverlap = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));

      if (xOverlap > 0.001 && yOverlap > 0.001) {
        buildingOverlaps.push({
          b1: b1.id,
          b2: b2.id,
          xOverlap: Math.round(xOverlap * 10) / 10,
          yOverlap: Math.round(yOverlap * 10) / 10,
          details: `${b1.id} [${b1.x},${b1.y},${b1.width}x${b1.height}] vs ${b2.id} [${b2.x},${b2.y},${b2.width}x${b2.height}]`
        });
      }
    }
  }

  // Props vs Buildings
  // In game rendering: props have bounding sizes:
  // bench: ~16x8, trash_can: ~8x8, lamp: ~10x10, dumpster: ~24x16, flowerbed: ~16x16, kiosk: ~24x20, bus_stop: ~30x16
  const propCollisions: { propId: string; type: string; propPos: [number, number]; bldId: string; margin: number }[] = [];
  for (const prop of props) {
    const pMargin = 3; // at least 3px clearance from building walls
    for (const bld of buildings) {
      if (
        prop.x >= bld.x - pMargin &&
        prop.x <= bld.x + bld.width + pMargin &&
        prop.y >= bld.y - pMargin &&
        prop.y <= bld.y + bld.height + pMargin
      ) {
        propCollisions.push({
          propId: prop.id,
          type: prop.type,
          propPos: [Math.round(prop.x), Math.round(prop.y)],
          bldId: bld.id,
          margin: pMargin
        });
      }
    }
  }

  // Trees vs Buildings
  // Trees have a radius, trunk should be outside building with buffer
  const treeCollisions: { treeId: string; treePos: [number, number]; bldId: string }[] = [];
  for (const tree of trees) {
    const tMargin = 5; // trunk clearance
    for (const bld of buildings) {
      if (
        tree.x >= bld.x - tMargin &&
        tree.x <= bld.x + bld.width + tMargin &&
        tree.y >= bld.y - tMargin &&
        tree.y <= bld.y + bld.height + tMargin
      ) {
        treeCollisions.push({
          treeId: tree.id,
          treePos: [Math.round(tree.x), Math.round(tree.y)],
          bldId: bld.id
        });
      }
    }
  }

  return {
    buildingOverlaps,
    propCollisions,
    treeCollisions
  };
}

const res = checkAllCollisions();
console.log('=== BUILDING OVERLAPS ===');
console.log(`Count: ${res.buildingOverlaps.length}`);
res.buildingOverlaps.forEach(o => console.log(` - ${o.details} (overlap ${o.xOverlap}x${o.yOverlap})`));

console.log('\n=== PROP COLLISIONS ===');
console.log(`Count: ${res.propCollisions.length}`);
res.propCollisions.slice(0, 30).forEach(p => console.log(` - Prop ${p.propId} (${p.type}) at (${p.propPos[0]},${p.propPos[1]}) in ${p.bldId}`));
if (res.propCollisions.length > 30) console.log(` ... and ${res.propCollisions.length - 30} more`);

console.log('\n=== TREE COLLISIONS ===');
console.log(`Count: ${res.treeCollisions.length}`);
res.treeCollisions.forEach(t => console.log(` - Tree ${t.treeId} at (${t.treePos[0]},${t.treePos[1]}) in ${t.bldId}`));

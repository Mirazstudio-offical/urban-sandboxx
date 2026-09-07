const fs = require('fs');

function patchFile(file, patches) {
  let content = fs.readFileSync(file, 'utf8');
  for (const p of patches) {
    content = content.replace(p.search, p.replace);
  }
  fs.writeFileSync(file, content);
}

// 1. vehicleHelpers.ts: createDefaultVehicleDamage -> generate 20 points
const vehicleHelpersPatches = [
  {
    search: `const deformedVertices: DeformVertex[] = [
    { localX: halfL, localY: 0, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'bumper' },
    { localX: halfL - 0.5, localY: halfW * 0.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'bumper' },
    { localX: halfL - 2.5, localY: halfW - 1.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'fender' },
    { localX: halfL * 0.5, localY: halfW, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'fender' },
    { localX: 0, localY: halfW, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'door' },
    { localX: -halfL * 0.5, localY: halfW, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'door' },
    { localX: -halfL + 2.5, localY: halfW - 1.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'quarter' },
    { localX: -halfL + 0.5, localY: halfW * 0.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'bumper' },
    { localX: -halfL, localY: 0, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'bumper' },
    { localX: -halfL + 0.5, localY: -halfW * 0.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'bumper' },
    { localX: -halfL + 2.5, localY: -halfW + 1.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'quarter' },
    { localX: -halfL * 0.5, localY: -halfW, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'door' },
    { localX: 0, localY: -halfW, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'door' },
    { localX: halfL * 0.5, localY: -halfW, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'fender' },
    { localX: halfL - 2.5, localY: -halfW + 1.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'fender' },
    { localX: halfL - 0.5, localY: -halfW * 0.5, offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, structuralType: 'bumper' }
  ];`,
    replace: `const base16 = [
    { localX: halfL, localY: 0, structuralType: 'bumper' },
    { localX: halfL - 0.5, localY: halfW * 0.5, structuralType: 'bumper' },
    { localX: halfL - 2.5, localY: halfW - 1.5, structuralType: 'fender' },
    { localX: halfL * 0.5, localY: halfW, structuralType: 'fender' },
    { localX: 0, localY: halfW, structuralType: 'door' },
    { localX: -halfL * 0.5, localY: halfW, structuralType: 'door' },
    { localX: -halfL + 2.5, localY: halfW - 1.5, structuralType: 'quarter' },
    { localX: -halfL + 0.5, localY: halfW * 0.5, structuralType: 'bumper' },
    { localX: -halfL, localY: 0, structuralType: 'bumper' },
    { localX: -halfL + 0.5, localY: -halfW * 0.5, structuralType: 'bumper' },
    { localX: -halfL + 2.5, localY: -halfW + 1.5, structuralType: 'quarter' },
    { localX: -halfL * 0.5, localY: -halfW, structuralType: 'door' },
    { localX: 0, localY: -halfW, structuralType: 'door' },
    { localX: halfL * 0.5, localY: -halfW, structuralType: 'fender' },
    { localX: halfL - 2.5, localY: -halfW + 1.5, structuralType: 'fender' },
    { localX: halfL - 0.5, localY: -halfW * 0.5, structuralType: 'bumper' }
  ];
  const deformedVertices: DeformVertex[] = [];
  for (let i = 0; i < base16.length; i++) {
    deformedVertices.push({
      localX: base16[i].localX, localY: base16[i].localY, 
      offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, 
      structuralType: base16[i].structuralType as any
    });
    if (i === 15 || i === 0 || i === 7 || i === 8) {
      const nextIdx = (i + 1) % 16;
      deformedVertices.push({
        localX: (base16[i].localX + base16[nextIdx].localX) / 2, 
        localY: (base16[i].localY + base16[nextIdx].localY) / 2,
        offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, 
        structuralType: 'bumper'
      });
    }
  }`
  }
];
patchFile('src/vehicleHelpers.ts', vehicleHelpersPatches);

// 2. vehicleArchetypes.ts: subdivide the returned polygon
let archetypesContent = fs.readFileSync('src/vehicleArchetypes.ts', 'utf8');
archetypesContent = archetypesContent.replace(/export function getVehicleBasePolygon[^]*?\];\n  }\n/g, (match) => {
    return match;
});
// A better way: replace `return [` with `const poly = [` inside the function, then return subdivided at the end?
// No, getVehicleBasePolygon has early returns. 
// We can rename it to `getVehicleBasePolygonRaw`, then export `getVehicleBasePolygon` that calls it and subdivides!
const archetypesPatches = [
  {
    search: `export function getVehicleBasePolygon(`,
    replace: `function getVehicleBasePolygonRaw(`
  }
];
patchFile('src/vehicleArchetypes.ts', archetypesPatches);
fs.appendFileSync('src/vehicleArchetypes.ts', `
export function getVehicleBasePolygon(car: Vehicle, halfL: number, halfW: number, fc: number, rc: number, ld: number, rd: number, fld: number, frd: number, rld: number, rrd: number): { x: number; y: number }[] {
  const poly = getVehicleBasePolygonRaw(car, halfL, halfW, fc, rc, ld, rd, fld, frd, rld, rrd);
  const newPoly: {x: number, y: number}[] = [];
  for (let i = 0; i < poly.length; i++) {
    newPoly.push(poly[i]);
    if (i === 15 || i === 0 || i === 7 || i === 8) {
      const nextIdx = (i + 1) % poly.length;
      newPoly.push({
        x: (poly[i].x + poly[nextIdx].x) / 2,
        y: (poly[i].y + poly[nextIdx].y) / 2
      });
    }
  }
  return newPoly;
}
`);

// 3. physics.ts: fix hardcoded indices
const physicsPatches = [
  {
    search: `(dmg.deformedVertices[0].plasticStrain || 0) + (dmg.deformedVertices[1].plasticStrain || 0) + (dmg.deformedVertices[15].plasticStrain || 0);`,
    replace: `(dmg.deformedVertices[0].plasticStrain || 0) + (dmg.deformedVertices[1].plasticStrain || 0) + (dmg.deformedVertices[2].plasticStrain || 0) + (dmg.deformedVertices[18].plasticStrain || 0) + (dmg.deformedVertices[19].plasticStrain || 0);`
  },
  {
    search: `if ((dmg.deformedVertices[2].plasticStrain || 0) > 0.4) dmg.bumperSagLeft = Math.min(1.0, (dmg.deformedVertices[2].plasticStrain || 0) * 0.8);
    if ((dmg.deformedVertices[14].plasticStrain || 0) > 0.4) dmg.bumperSagRight = Math.min(1.0, (dmg.deformedVertices[14].plasticStrain || 0) * 0.8);`,
    replace: `if ((dmg.deformedVertices[3].plasticStrain || 0) > 0.4) dmg.bumperSagLeft = Math.min(1.0, (dmg.deformedVertices[3].plasticStrain || 0) * 0.8);
    if ((dmg.deformedVertices[17].plasticStrain || 0) > 0.4) dmg.bumperSagRight = Math.min(1.0, (dmg.deformedVertices[17].plasticStrain || 0) * 0.8);`
  },
  {
    search: `checkWheelRub(2);  // Front-Left wheel well
    checkWheelRub(14); // Front-Right wheel well
    checkWheelRub(6);  // Rear-Left wheel well
    checkWheelRub(10); // Rear-Right wheel well`,
    replace: `checkWheelRub(3);  // Front-Left wheel well
    checkWheelRub(17); // Front-Right wheel well
    checkWheelRub(7);  // Rear-Left wheel well
    checkWheelRub(13); // Rear-Right wheel well`
  },
  {
    search: `const frontTotalStrain =`,
    replace: `// Updated indices for 20-point polygon\n    const frontTotalStrain =`
  }
];
patchFile('src/physics.ts', physicsPatches);

// 4. renderer.ts: change length === 16 to length === 20
const rendererPatches = [
  {
    search: `dmg.deformedVertices.length === 16`,
    replace: `dmg.deformedVertices.length === 20`
  },
  {
    search: `for (let i = 0; i < 16; i++) {`,
    replace: `for (let i = 0; i < 20; i++) {`
  },
  {
    search: `dmg.deformedVertices.length === 16`,
    replace: `dmg.deformedVertices.length === 20`
  },
  {
    search: `for (let i = 0; i < 16; i++) {`,
    replace: `for (let i = 0; i < 20; i++) {`
  }
];
patchFile('src/renderer.ts', rendererPatches);

// 5. softbodyVisuals.ts: change length < 16 to length < 20
const softbodyPatches = [
  {
    search: `deformedVertices.length < 16`,
    replace: `deformedVertices.length < 20`
  },
  {
    search: `bodyPoly.length < 16`,
    replace: `bodyPoly.length < 20`
  }
];
patchFile('src/softbodyVisuals.ts', softbodyPatches);


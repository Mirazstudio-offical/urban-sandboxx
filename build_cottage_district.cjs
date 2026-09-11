const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('--- Rebuilding Cottage District & Restoring Gas Station / Metro Avenue ---');

// ========================================================
// 1. UPDATE ROADS & INTERSECTIONS IN SOUTHEAST SECTOR
// ========================================================
// - Metro Avenue (x = 5600): The grand central 4-lane avenue (width: 192, asphalt).
// - Gas Station Boundary Roads & Approaches: Normal city asphalt (width: 120, lanes: 2).
// - Internal Cottage Roads: Wide 2-lane country dirt roads (width: 96, lanes: 2).

for (const r of map.roads) {
  // Metro Avenue spine along x = 5600
  if (r.id && r.id.startsWith('road_v_6_')) {
    r.name = 'Metro Avenue';
    r.width = 192;
    r.lanes = 4;
    r.isAvenue = true;
    r.isDirt = false;
    r.isGravel = false;
    continue;
  }

  // Approaches and borders around Gas Station (block 6_6: [4800..5600, 4800..5600])
  if (r.id === 'road_h_5_5' || r.id === 'road_h_5_6') {
    r.name = 'Riverbed Lane';
    r.width = 120;
    r.lanes = 2;
    r.isAvenue = false;
    r.isDirt = false;
    r.isGravel = false;
    continue;
  }
  if (r.id === 'road_v_5_5' || r.id === 'road_v_5_6') {
    r.name = 'Commerce Drive';
    r.width = 120;
    r.lanes = 2;
    r.isAvenue = false;
    r.isDirt = false;
    r.isGravel = false;
    continue;
  }
  if (r.id === 'road_h_6_5' || r.id === 'road_h_6_6') {
    r.name = 'Meadow Lane';
    r.width = 120;
    r.lanes = 2;
    r.isAvenue = false;
    r.isDirt = false;
    r.isGravel = false;
    continue;
  }

  // Only consider roads in the southeast cottage sector
  const isCottageRoad = (r.x1 >= 4700 || r.x2 >= 4700) && (r.y1 >= 4700 || r.y2 >= 4700);
  if (!isCottageRoad) continue;

  // Internal cottage dirt roads: width 96 (spacious 2-lane dirt road for seamless passing)
  r.isDirt = true;
  r.isGravel = false;
  r.width = 96;
  r.lanes = 2;
  r.isAvenue = false;

  // Authentic rural street names
  if (r.direction === 'horizontal') {
    if (Math.abs(r.y1 - 4800) < 50) r.name = 'ул. Речная';
    else if (Math.abs(r.y1 - 5600) < 50) r.name = 'пер. Луговой';
    else if (Math.abs(r.y1 - 6400) < 50) r.name = 'ул. Дачная';
    else if (Math.abs(r.y1 - 7200) < 50) r.name = 'ул. Садовая';
  } else {
    if (Math.abs(r.x1 - 4800) < 50) r.name = 'ул. Лесная';
    else if (Math.abs(r.x1 - 6400) < 50) r.name = 'пер. Березовый';
    else if (Math.abs(r.x1 - 7200) < 50) r.name = 'пер. Кленовый';
  }
}

// Update intersections:
// - All intersections along Metro Avenue (x = 5600) MUST be asphalt
// - All intersections bordering the Gas Station MUST be asphalt
// - Internal cottage intersections connecting dirt roads MUST be dirt
for (const inter of map.intersections) {
  // Metro Avenue intersections
  if (Math.abs(inter.x - 5600) < 50) {
    inter.isDirt = false;
    inter.isGravel = false;
    continue;
  }
  // Gas station intersections (4800, 4800) and (4800, 5600)
  if (Math.abs(inter.x - 4800) < 50 && (Math.abs(inter.y - 4800) < 50 || Math.abs(inter.y - 5600) < 50)) {
    inter.isDirt = false;
    inter.isGravel = false;
    continue;
  }
  // Internal cottage intersections
  if (inter.x >= 4700 && inter.y >= 4700) {
    inter.isDirt = true;
    inter.isGravel = false;
  }
}

// ========================================================
// 2. CLEAN UP OLD COTTAGE ELEMENTS (Preserving Gas Station 100%)
// ========================================================
const isGasStationItem = (item) => {
  if (!item) return false;
  if (item.id && (item.id.includes('gas_station') || item.id.includes('_se'))) return true;
  if (item.x >= 4810 && item.x <= 5590 && item.y >= 4810 && item.y <= 5590) {
    return true; // Gas station block 6_6
  }
  return false;
};

// Filter buildings: keep Gas Station & non-cottage buildings
map.buildings = map.buildings.filter(b => {
  if (isGasStationItem(b)) return true;
  if (b.id && (b.id.startsWith('cottage_') || b.id.startsWith('garage_suburban_') || b.id.startsWith('banya_suburban_'))) {
    return false;
  }
  return true;
});

// Filter props: keep Gas Station & non-cottage props
map.props = map.props.filter(p => {
  const inCottageZone = p.x >= 4750 && p.y >= 4750;
  if (!inCottageZone) return true;
  if (isGasStationItem(p)) return true;
  return false;
});

// Filter trees: keep Gas Station & non-cottage trees
map.trees = map.trees.filter(t => {
  const inCottageZone = t.x >= 4750 && t.y >= 4750;
  if (!inCottageZone) return true;
  if (isGasStationItem(t)) return true;
  return false;
});

// Filter sidewalks: keep Gas Station sidewalk
if (map.sidewalks) {
  map.sidewalks = map.sidewalks.filter(sw => {
    const inCottageZone = sw.x >= 4750 && sw.y >= 4750;
    if (!inCottageZone) return true;
    if (sw.id === 'sidewalk_6_6') return true;
    return false;
  });
}

// Filter driveways: keep Gas Station driveways
if (!map.driveways) map.driveways = [];
map.driveways = map.driveways.filter(dw => {
  const inCottageZone = dw.x >= 4750 && dw.y >= 4750;
  if (!inCottageZone) return true;
  if (isGasStationItem(dw)) return true;
  return false;
});

// ========================================================
// 3. GENERATE AUTHENTIC PRIVATE COTTAGE PLOTS
// ========================================================
const newBuildings = [];
const newProps = [];
const newTrees = [];
const newDriveways = [];

// Helper to add perimeter fences along a line segment
function addFenceSegment(idPrefix, x1, y1, x2, y2, fenceType = 'fence_wood_vertical', step = 36, isBroken = false) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) return;
  const angle = Math.atan2(dy, dx);
  const count = Math.max(1, Math.round(dist / step));
  const actualStep = dist / count;

  for (let i = 0; i < count; i++) {
    const d = (i + 0.5) * actualStep;
    const px = x1 + (dx / dist) * d;
    const py = y1 + (dy / dist) * d;

    newProps.push({
      id: `${idPrefix}_f_${i}`,
      x: Math.round(px),
      y: Math.round(py),
      type: fenceType,
      angle: angle,
      isBroken: isBroken && (i % 2 === 0 || i === 1)
    });
  }
}

// 15 Cottage Blocks across the SE sector (Block 6_6 is the Gas Station)
const blocks = [
  // Row 1 (y = 4800) - East of Gas Station across Metro Avenue
  { bx: 5600, by: 4800, theme: 'pine_meadow' },
  { bx: 6400, by: 4800, theme: 'abandoned_edge' },
  { bx: 7200, by: 4800, theme: 'birch_grove' },

  // Row 2 (y = 5600)
  { bx: 4800, by: 5600, theme: 'orchard_gardens' }, // South of Gas Station
  { bx: 5600, by: 5600, theme: 'central_manors' },
  { bx: 6400, by: 5600, theme: 'cedar_homestead' },
  { bx: 7200, by: 5600, theme: 'woodland_retreat' },

  // Row 3 (y = 6400)
  { bx: 4800, by: 6400, theme: 'cozy_dacha' },
  { bx: 5600, by: 6400, theme: 'abandoned_farm' },
  { bx: 6400, by: 6400, theme: 'flower_court' },
  { bx: 7200, by: 6400, theme: 'spruce_estate' },

  // Row 4 (y = 7200)
  { bx: 4800, by: 7200, theme: 'riverbank_cabins' },
  { bx: 5600, by: 7200, theme: 'apple_orchard' },
  { bx: 6400, by: 7200, theme: 'modern_dacha' },
  { bx: 7200, by: 7200, theme: 'hunter_lodge' }
];

let plotGlobalId = 1;

// Roof colors catalog for cottages
const ROOF_PALETTES = [
  { roof: '#b91c1c', wall: '#5c2e0b', accent: '#fca5a5' }, // Terracotta Tile
  { roof: '#15803d', wall: '#451a03', accent: '#86efac' }, // Forest Green Metal
  { roof: '#854d0e', wall: '#3b1c04', accent: '#fde047' }, // Golden Pine
  { roof: '#334155', wall: '#292524', accent: '#94a3b8' }, // Slate Grey
  { roof: '#c2410c', wall: '#431407', accent: '#fdba74' }, // Copper Brown
  { roof: '#0f766e', wall: '#3f2212', accent: '#5eead4' }, // Nordic Teal
  { roof: '#78350f', wall: '#3b1a03', accent: '#fde68a' }, // Dark Oak Stain
];

// Track gate positions so power poles NEVER block gates
const gatePositions = [];

// Calculate safe outer block margins depending on bordering roads:
// - Metro Avenue (x = 5600): width 192 (half 96, outer lane 72). Margin = 140px (buffer to outer lane: 68px).
// - Meadow Lane (y = 5600, bx = 4800): width 120 (half 60). Margin = 100px.
// - Map perimeter (x = 8000 or y = 8000): Margin = 140px.
// - 2-lane dirt roads (width 96): Margin = 80px (half 48, buffer to lane: 56px, grass shoulder: 32px).
function getBlockMargins(bx, by) {
  let westMargin = 80;
  if (bx === 5600) {
    westMargin = 140; // Facing Metro Avenue on West
  }

  let eastMargin = 80;
  if (bx + 800 === 5600) {
    eastMargin = 140; // Facing Metro Avenue on East
  } else if (bx + 800 >= 8000) {
    eastMargin = 140; // Facing East Perimeter
  }

  let northMargin = 80;
  if (by === 5600 && bx < 5600) {
    northMargin = 100; // Facing Meadow Lane south of Gas Station
  }

  let southMargin = 80;
  if (by + 800 >= 8000) {
    southMargin = 140; // Facing South Perimeter
  }

  return { westMargin, eastMargin, northMargin, southMargin };
}

for (const b of blocks) {
  const blockW = 800;
  const blockH = 800;
  const { westMargin, eastMargin, northMargin, southMargin } = getBlockMargins(b.bx, b.by);

  const midX = b.bx + Math.round((westMargin + (blockW - eastMargin)) / 2);
  const midY = b.by + Math.round((northMargin + (blockH - southMargin)) / 2);

  // 4 individual spacious private plots per block
  const subPlots = [
    // NW Plot
    {
      x1: b.bx + westMargin,
      y1: b.by + northMargin,
      x2: midX - 12,
      y2: midY - 12,
      facing: 'north',
      quad: 'NW'
    },
    // NE Plot
    {
      x1: midX + 12,
      y1: b.by + northMargin,
      x2: b.bx + blockW - eastMargin,
      y2: midY - 12,
      facing: 'north',
      quad: 'NE'
    },
    // SW Plot
    {
      x1: b.bx + westMargin,
      y1: midY + 12,
      x2: midX - 12,
      y2: b.by + blockH - southMargin,
      facing: 'south',
      quad: 'SW'
    },
    // SE Plot
    {
      x1: midX + 12,
      y1: midY + 12,
      x2: b.bx + blockW - eastMargin,
      y2: b.by + blockH - southMargin,
      facing: 'south',
      quad: 'SE'
    }
  ];

  for (const p of subPlots) {
    const pid = `plot_${plotGlobalId++}`;
    const pW = p.x2 - p.x1;
    const pH = p.y2 - p.y1;

    // Check if this plot is designated as an abandoned plot (заброшка)
    const isAbandoned = (b.theme === 'abandoned_edge' && p.quad === 'NW') || 
                        (b.theme === 'abandoned_farm' && p.quad === 'SE') ||
                        (b.theme === 'woodland_retreat' && p.quad === 'SW');

    // Choose fence type: wooden picket fences, or metal profiled fences
    const fenceType = isAbandoned 
      ? 'fence_wood_vertical' 
      : (plotGlobalId % 3 === 0 ? 'fence_metal_vertical' : 'fence_wood_vertical');

    // === 1. FENCES, GATES, AND WICKETS ===
    const isNorthFacing = p.facing === 'north';
    const streetY = isNorthFacing ? p.y1 : p.y2;
    const backY = isNorthFacing ? p.y2 : p.y1;

    // Gate & Wicket placement along street edge
    const gateW = 72;
    const wicketW = 26;
    const gateX = p.x1 + 65;
    const wicketX = p.x1 + 130;

    gatePositions.push({ x: gateX, y: streetY });

    // Front fence: Left of gate
    addFenceSegment(`${pid}_fn_l`, p.x1, streetY, gateX - gateW / 2, streetY, fenceType, 36, isAbandoned);

    // Front Gate
    newProps.push({
      id: `${pid}_gate`,
      x: gateX,
      y: streetY,
      type: 'cottage_gate',
      angle: 0,
      isBroken: isAbandoned
    });

    // Fence between gate and wicket
    addFenceSegment(`${pid}_fn_m`, gateX + gateW / 2, streetY, wicketX - wicketW / 2, streetY, fenceType, 36, isAbandoned);

    // Front Wicket
    newProps.push({
      id: `${pid}_wicket`,
      x: wicketX,
      y: streetY,
      type: 'wicket_gate',
      angle: 0,
      isBroken: isAbandoned
    });

    // Front fence: Right of wicket to corner
    addFenceSegment(`${pid}_fn_r`, wicketX + wicketW / 2, streetY, p.x2, streetY, fenceType, 36, isAbandoned);

    // Left, Right, and Back Fences
    addFenceSegment(`${pid}_fl`, p.x1, p.y1, p.x1, p.y2, fenceType, 36, isAbandoned);
    addFenceSegment(`${pid}_fr`, p.x2, p.y1, p.x2, p.y2, fenceType, 36, isAbandoned);
    addFenceSegment(`${pid}_fb`, p.x1, backY, p.x2, backY, fenceType, 36, isAbandoned);

    // === 2. DRIVEWAY & WALKWAYS ===
    // Vehicular driveway connecting road edge through gate into garage
    const dwLen = 76;
    const dwY = isNorthFacing ? streetY - 34 : streetY - dwLen + 34;
    newDriveways.push({
      id: `${pid}_driveway`,
      x: gateX - 22,
      y: dwY,
      width: 44,
      height: dwLen,
      type: isAbandoned ? 'dirt' : 'gravel'
    });

    // Pedestrian stepping-stone walkway from wicket into the plot
    const walkSteps = 5;
    const stepDist = 14;
    for (let s = 1; s <= walkSteps; s++) {
      const wy = isNorthFacing ? streetY + s * stepDist : streetY - s * stepDist;
      newProps.push({
        id: `${pid}_path_${s}`,
        x: wicketX + (s % 2 === 0 ? 2 : -2),
        y: wy,
        type: 'garden_path_tile',
        angle: 0
      });
    }

    // === 3. BUILDINGS ON PLOT ===
    if (isAbandoned) {
      // Atmospheric abandoned ruined house
      const bW = 88;
      const bH = 68;
      const bX = p.x1 + 125;
      const bY = isNorthFacing ? p.y1 + 75 : p.y2 - 145;

      newBuildings.push({
        id: `cottage_abandoned_${pid}`,
        name: 'Заброшенная дача',
        nameRu: 'Заброшенная усадьба (аварийное состояние)',
        x: bX,
        y: bY,
        width: bW,
        height: bH,
        type: 'suburban',
        color: '#292524',
        roofColor: '#27170e',
        accentColor: '#452e1e',
        entranceSide: isNorthFacing ? 'north' : 'south',
        entrances: [{ side: isNorthFacing ? 'north' : 'south', offsetRatio: 0.5 }],
        roofDetails: [
          { type: 'antenna', rx: 0.8, ry: 0.2, rw: 8, rh: 8 }
        ]
      });

      // Abandoned car wreck overgrown in weeds
      newProps.push({
        id: `${pid}_wreck`,
        x: gateX,
        y: isNorthFacing ? streetY + 45 : streetY - 45,
        type: 'rustic_car_wreck',
        angle: (plotGlobalId % 5) * 0.3
      });

      // Scattered debris & wild pine
      newProps.push({
        id: `${pid}_scrap`,
        x: bX + bW + 20,
        y: bY + 20,
        type: 'woodpile',
        angle: 0.4,
        isBroken: true
      });

      newTrees.push({
        id: `tree_${pid}_wild_pine`,
        x: p.x1 + 45,
        y: isNorthFacing ? streetY + 120 : streetY - 120,
        radius: 28,
        color: '#14532d',
        shadowOffset: 6,
        type: 'pine'
      });

    } else {
      // Well-kept private dacha estate
      const palette = ROOF_PALETTES[plotGlobalId % ROOF_PALETTES.length];
      const hasGarage = plotGlobalId % 2 === 0;
      const hasBanya = (plotGlobalId + 1) % 3 === 0;

      // 1. Main Cottage House
      const bW = 100 + (plotGlobalId % 3) * 12;
      const bH = 82 + (plotGlobalId % 2) * 10;
      const bX = p.x1 + 140;
      const bY = isNorthFacing ? p.y1 + 75 : p.y2 - bH - 75;

      newBuildings.push({
        id: `cottage_house_${pid}`,
        name: `Дачный дом №${plotGlobalId}`,
        nameRu: `Коттеджный дом №${plotGlobalId}`,
        x: bX,
        y: bY,
        width: bW,
        height: bH,
        type: 'suburban',
        color: palette.wall,
        roofColor: palette.roof,
        accentColor: palette.accent,
        entranceSide: isNorthFacing ? 'north' : 'south',
        entrances: [
          { side: isNorthFacing ? 'north' : 'south', offsetRatio: 0.5 }
        ],
        roofDetails: [
          { type: 'chimney', rx: 0.25, ry: 0.25, rw: 12, rh: 12 },
          { type: 'antenna', rx: 0.8, ry: 0.75, rw: 8, rh: 8 }
        ]
      });

      // 2. Private Garage behind vehicular gate
      if (hasGarage) {
        const gW = 64;
        const gH = 76;
        const gX = gateX - gW / 2;
        const gY = isNorthFacing ? streetY + 45 : streetY - 45 - gH;

        newBuildings.push({
          id: `garage_suburban_${pid}`,
          name: `Гараж №${plotGlobalId}`,
          nameRu: `Капитальный гараж №${plotGlobalId}`,
          x: gX,
          y: gY,
          width: gW,
          height: gH,
          type: 'suburban',
          color: '#3f3f46',
          roofColor: palette.roof,
          accentColor: '#71717a',
          entranceSide: isNorthFacing ? 'north' : 'south',
          entrances: [
            { side: isNorthFacing ? 'north' : 'south', offsetRatio: 0.5 }
          ]
        });
      }

      // 3. Wooden Russian Banya (Bathhouse) in the backyard
      if (hasBanya) {
        const banyaW = 56;
        const banyaH = 50;
        const banyaX = p.x2 - banyaW - 25;
        const banyaY = isNorthFacing ? backY - banyaH - 25 : backY + 25;

        newBuildings.push({
          id: `banya_suburban_${pid}`,
          name: `Баня №${plotGlobalId}`,
          nameRu: `Бревенчатая баня №${plotGlobalId}`,
          x: banyaX,
          y: banyaY,
          width: banyaW,
          height: banyaH,
          type: 'suburban',
          color: '#451a03',
          roofColor: '#78350f',
          accentColor: '#b45309',
          entranceSide: isNorthFacing ? 'south' : 'north',
          entrances: [
            { side: isNorthFacing ? 'south' : 'north', offsetRatio: 0.5 }
          ],
          roofDetails: [
            { type: 'chimney', rx: 0.75, ry: 0.25, rw: 9, rh: 9 }
          ]
        });

        // Woodpile prop beside the banya
        newProps.push({
          id: `woodpile_${pid}`,
          x: banyaX - 16,
          y: banyaY + banyaH / 2,
          type: 'woodpile',
          angle: 0
        });
      }

      // 4. Garden Flowerbed & Outdoor Furniture
      const flowerX = wicketX + 35;
      const flowerY = isNorthFacing ? streetY + 45 : streetY - 45;
      newProps.push({
        id: `flower_${pid}`,
        x: flowerX,
        y: flowerY,
        type: 'flowerbed',
        angle: 0
      });

      newProps.push({
        id: `bench_${pid}`,
        x: flowerX + 35,
        y: flowerY,
        type: 'park_bench',
        angle: isNorthFacing ? 0 : Math.PI
      });

      // 5. Trees (Apple, Birch, Pine) inside the plot
      newTrees.push({
        id: `tree_${pid}_apple_1`,
        x: bX - 35,
        y: bY + 15,
        radius: 20,
        color: '#15803d',
        shadowOffset: 5,
        type: 'deciduous'
      });
      newTrees.push({
        id: `tree_${pid}_apple_2`,
        x: bX + bW + 25,
        y: bY + bH / 2,
        radius: 18,
        color: '#16a34a',
        shadowOffset: 4,
        type: 'deciduous'
      });
      newTrees.push({
        id: `tree_${pid}_birch_1`,
        x: p.x2 - 30,
        y: isNorthFacing ? streetY + 40 : streetY - 40,
        radius: 22,
        color: '#22c55e',
        shadowOffset: 5,
        type: 'birch'
      });
      newTrees.push({
        id: `tree_${pid}_pine_1`,
        x: p.x1 + 35,
        y: backY > streetY ? backY - 35 : backY + 35,
        radius: 26,
        color: '#14532d',
        shadowOffset: 6,
        type: 'pine'
      });
    }
  }
}

// ========================================================
// 4. POWER POLES (ЛЭП): SAFELY ON THE GRASS SHOULDER
// ========================================================
// Rules:
// 1. Located at 62px from road centerline (safely on grass between road edge at 48px and fence at 80px)
// 2. NEVER on Metro Avenue (x = 5600) or Gas Station block (6_6)
// 3. At least 110px AWAY from ANY intersection
// 4. At least 50px AWAY from any driveway / gate

const isNearIntersection = (coord) => {
  const rem = ((coord % 800) + 800) % 800;
  return rem < 110 || rem > 690;
};

const isNearGate = (x, y) => {
  for (const g of gatePositions) {
    if (Math.hypot(g.x - x, g.y - y) < 50) return true;
  }
  return false;
};

// Horizontal power lines along northern shoulder of horizontal dirt roads
for (let y = 4800; y <= 7200; y += 800) {
  const poleY = y - 62; // Grass shoulder between 48px road edge and 80px fence
  for (let x = 4900; x <= 7900; x += 150) {
    // Skip gas station block
    if (x <= 5600 && (y === 4800 || y === 5600)) continue;
    // Skip Metro Avenue crossing
    if (Math.abs(x - 5600) < 140) continue;
    if (isNearIntersection(x)) continue;
    if (isNearGate(x, poleY)) continue;

    newProps.push({
      id: `pole_cottage_h_${x}_${poleY}`,
      x: x,
      y: poleY,
      type: 'power_pole',
      angle: 0
    });
  }
}

// Vertical power lines along western shoulder of vertical dirt roads
for (let x of [4800, 6400, 7200]) {
  const poleX = x - 62; // Grass shoulder between 48px road edge and 80px fence
  for (let y = 4900; y <= 7900; y += 150) {
    // Skip gas station block and its bordering roads
    if (x === 4800 && y <= 5650) continue;
    if (isNearIntersection(y)) continue;
    if (isNearGate(poleX, y)) continue;

    newProps.push({
      id: `pole_cottage_v_${poleX}_${y}`,
      x: poleX,
      y: y,
      type: 'power_pole',
      angle: 0
    });
  }
}

// Add newly generated elements to map
map.buildings.push(...newBuildings);
map.props.push(...newProps);
map.trees.push(...newTrees);
map.driveways.push(...newDriveways);

console.log('Final updated buildings count:', map.buildings.length);
console.log('Final updated props count:', map.props.length);
console.log('Final updated trees count:', map.trees.length);
console.log('Final updated driveways count:', map.driveways.length);

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
console.log('Successfully wrote updated cottage district and asphalt gas station roads to map.json');

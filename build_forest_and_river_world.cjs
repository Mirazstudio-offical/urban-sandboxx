// Script to populate the forest, forestry plantation (лесопосадка), winding overgrown roads,
// river infrastructure, and props directly into public/map.json according to Strict Map First Policy.

const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// 1. ROADS & OVERGROWN TRAILS
const newRoads = [
  // A. Main winding forest road (Старый Лесной Тракт)
  // Connects from road_h_1_9 (x: 8000, y: 1600) winding through the pine woods to the ford and plantation
  {
    id: 'road_forest_main',
    name: 'Старый Лесной Тракт',
    direction: 'curved',
    x1: 8000,
    y1: 1600,
    x2: 12380,
    y2: 530,
    width: 48,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 40,
    curvePoints: [
      { x: 8000, y: 1600 },
      { x: 8280, y: 1590 },
      { x: 8600, y: 1530 },
      { x: 8950, y: 1440 },
      { x: 9350, y: 1380 },
      { x: 9800, y: 1360 },
      { x: 10250, y: 1390 }, // Passes near Forest Ranger Post
      { x: 10700, y: 1370 },
      { x: 11150, y: 1280 },
      { x: 11550, y: 1140 },
      { x: 11900, y: 940 },
      { x: 12150, y: 740 },
      { x: 12380, y: 530 }  // Reaches river ford
    ]
  },

  // B. Overgrown trail continuing across the river ford up the north bluff
  {
    id: 'road_forest_north_bluff',
    name: 'Тропа на Северный Яр',
    direction: 'curved',
    x1: 12420,
    y1: 510,
    x2: 13200,
    y2: 240,
    width: 40,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 35,
    curvePoints: [
      { x: 12420, y: 510 },
      { x: 12500, y: 430 },
      { x: 12620, y: 340 },
      { x: 12800, y: 280 },
      { x: 13000, y: 250 },
      { x: 13200, y: 240 }
    ]
  },

  // C. Northern road to old wooden bridge (Просека к Старому Мосту)
  // Connects from road_h_0_9 (x: 8000, y: 800) through birch and pine grove to the bridge at x: 9400
  {
    id: 'road_forest_bridge_approach',
    name: 'Просека к Старому Мосту',
    direction: 'curved',
    x1: 8000,
    y1: 800,
    x2: 9400,
    y2: 490,
    width: 44,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 40,
    curvePoints: [
      { x: 8000, y: 800 },
      { x: 8250, y: 770 },
      { x: 8550, y: 710 },
      { x: 8880, y: 620 },
      { x: 9180, y: 540 },
      { x: 9400, y: 490 }
    ]
  },

  // D. Road across and north of the timber bridge
  {
    id: 'road_forest_bridge_north',
    name: 'Северный Лесовозный Ус',
    direction: 'curved',
    x1: 9400,
    y1: 490,
    x2: 10800,
    y2: 290,
    width: 44,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 40,
    curvePoints: [
      { x: 9400, y: 490 },
      { x: 9460, y: 470 },
      { x: 9650, y: 390 },
      { x: 9950, y: 340 },
      { x: 10350, y: 310 },
      { x: 10800, y: 290 }
    ]
  },

  // E. Plantation Logging Arterial (Лесовозный тракт Гослесопосадки)
  // Branches from ranger post and cuts across the forestry plantation blocks
  {
    id: 'road_forest_plantation_main',
    name: 'Лесовозная дорога Гослесопосадки',
    direction: 'curved',
    x1: 10250,
    y1: 1390,
    x2: 17800,
    y2: 1450,
    width: 46,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 45,
    curvePoints: [
      { x: 10250, y: 1390 },
      { x: 10800, y: 1520 },
      { x: 11450, y: 1680 },
      { x: 12200, y: 1750 }, // Junction with Polynovka connector
      { x: 13050, y: 1720 },
      { x: 13850, y: 1640 }, // Passes Logging clearing (Делянка)
      { x: 14750, y: 1580 },
      { x: 15700, y: 1520 },
      { x: 16750, y: 1480 },
      { x: 17800, y: 1450 }
    ]
  },

  // F. Connector from Polynovka village (from forester's house area) to plantation
  {
    id: 'road_forest_village_connector',
    name: 'Лесной подъезд из Полыновки',
    direction: 'curved',
    x1: 12000,
    y1: 2500,
    x2: 12200,
    y2: 1750,
    width: 42,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 35,
    curvePoints: [
      { x: 12000, y: 2500 },
      { x: 12040, y: 2280 },
      { x: 12110, y: 2020 },
      { x: 12200, y: 1750 }
    ]
  },

  // G. Firebreak Corridor 1 (Противопожарная просека Кв. 12/13)
  {
    id: 'road_forest_firebreak_1',
    name: 'Противопожарная просека Кв. 12/13',
    direction: 'vertical',
    x1: 13500,
    y1: 720,
    x2: 13500,
    y2: 2750,
    width: 36,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 30
  },

  // H. Firebreak Corridor 2 (Противопожарная просека Кв. 14/15)
  {
    id: 'road_forest_firebreak_2',
    name: 'Противопожарная просека Кв. 14/15',
    direction: 'vertical',
    x1: 15500,
    y1: 720,
    x2: 15500,
    y2: 2750,
    width: 36,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 30
  },

  // I. Riverbank Walking Trail (Прибрежная рыболовная тропинка)
  {
    id: 'trail_riverbank_fishing',
    name: 'Прибрежная тропа к затону',
    direction: 'curved',
    x1: 12380,
    y1: 560,
    x2: 14200,
    y2: 500,
    width: 20,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 15,
    curvePoints: [
      { x: 12380, y: 560 },
      { x: 12700, y: 580 },
      { x: 13150, y: 590 },
      { x: 13600, y: 560 },
      { x: 13950, y: 530 },
      { x: 14200, y: 500 }
    ]
  },

  // J. Watchtower Access Path (Тропинка к пожарной вышке)
  {
    id: 'trail_watchtower_path',
    name: 'Тропа к пожарной вышке',
    direction: 'curved',
    x1: 10250,
    y1: 1360,
    x2: 11100,
    y2: 1020,
    width: 20,
    lanes: 1,
    isAvenue: false,
    isDirt: true,
    isGravel: false,
    speedLimit: 15,
    curvePoints: [
      { x: 10250, y: 1360 },
      { x: 10500, y: 1250 },
      { x: 10800, y: 1140 },
      { x: 11100, y: 1020 }
    ]
  }
];

// Add unique roads
for (const r of newRoads) {
  if (!map.roads.find(existing => existing.id === r.id)) {
    map.roads.push(r);
  }
}

// 2. BUILDINGS & FORESTRY STRUCTURES
const newBuildings = [
  // Forest Ranger Cabin & Post
  {
    id: 'bld_forest_ranger_cabin',
    name: 'Лесной кордон «Красный Ручей» (Сторожка лесника)',
    x: 10390,
    y: 1290,
    width: 90,
    height: 70,
    color: '#713f12', // Rich rustic log cabin wood
    roofColor: '#582d09',
    floors: 1,
    entrances: [{ x: 10435, y: 1360 }]
  },
  // Firewood Shed
  {
    id: 'bld_forest_wood_shed',
    name: 'Дровяной сарай кордона',
    x: 10520,
    y: 1290,
    width: 48,
    height: 38,
    color: '#52341b',
    roofColor: '#3d2512',
    floors: 1,
    entrances: [{ x: 10544, y: 1328 }]
  },
  // Firewatch Tower Base
  {
    id: 'bld_forest_watchtower',
    name: 'Пожарно-наблюдательная вышка Гослесфонда',
    x: 11080,
    y: 1000,
    width: 40,
    height: 40,
    color: '#334155',
    roofColor: '#1e293b',
    floors: 4,
    entrances: [{ x: 11100, y: 1040 }]
  },
  // Timber Logging Shed (Делянка №4)
  {
    id: 'bld_forest_logging_shed',
    name: 'Навес для инвентаря и трелёвочного троса (Делянка №4)',
    x: 13800,
    y: 1560,
    width: 80,
    height: 46,
    color: '#654321',
    roofColor: '#4a3014',
    floors: 1,
    entrances: [{ x: 13840, y: 1606 }]
  }
];

for (const b of newBuildings) {
  if (!map.buildings.find(existing => existing.id === b.id)) {
    map.buildings.push(b);
  }
}

// 3. PARKED VEHICLE AT RANGER POST
const newVehicle = {
  id: 'veh_forester_uaz',
  type: 'suv_classic_box', // Soviet UAZ-469
  x: 10490,
  y: 1375,
  vx: 0,
  vy: 0,
  angle: -0.15,
  steerAngle: 0,
  targetSteerAngle: 0,
  speed: 0,
  lateralVelocity: 0,
  angularVelocity: 0,
  isDrifting: false,
  driftFactor: 0,
  mass: 1650,
  width: 24,
  length: 48,
  wheelBase: 28,
  color: '#2e4726', // Forester Khaki / Camo olive
  roofColor: '#3a5430',
  headlightsOn: false,
  headlightMode: 'off',
  brakeLightsOn: false,
  turnSignal: 'none',
  turnSignalTimer: 0,
  requiredFuel: 'ai92',
  damage: {
    engine: 0,
    transmission: 0,
    wheels: 0,
    body: 0,
    radiatorPunctured: false,
    oilPanPunctured: false
  },
  isPlayerControlled: false,
  isParked: true
};

if (!map.vehicles.find(v => v.id === newVehicle.id)) {
  map.vehicles.push(newVehicle);
}

// 4. FORESTRY PROPS & RIVER FEATURES
const newProps = [
  // A. Forestry Boundary Pillars (Квартальные столбы)
  { id: 'prop_pillar_1', x: 10220, y: 1360, type: 'forestry_pillar', angle: 0 },
  { id: 'prop_pillar_2', x: 12200, y: 1720, type: 'forestry_pillar', angle: 0.2 },
  { id: 'prop_pillar_3', x: 13500, y: 1720, type: 'forestry_pillar', angle: 0 },
  { id: 'prop_pillar_4', x: 15500, y: 1520, type: 'forestry_pillar', angle: -0.1 },
  { id: 'prop_pillar_5', x: 13500, y: 740,  type: 'forestry_pillar', angle: 0 },
  { id: 'prop_pillar_6', x: 15500, y: 740,  type: 'forestry_pillar', angle: 0 },

  // B. Timber Log Stacks (Штабеля распиленных брёвен)
  { id: 'prop_logs_1', x: 10560, y: 1360, type: 'timber_log_stack', angle: 0.1 },
  { id: 'prop_logs_2', x: 13740, y: 1620, type: 'timber_log_stack', angle: -0.05 },
  { id: 'prop_logs_3', x: 13920, y: 1620, type: 'timber_log_stack', angle: 0.08 },
  { id: 'prop_logs_4', x: 13820, y: 1680, type: 'timber_log_stack', angle: 0 },
  { id: 'prop_logs_5', x: 11400, y: 1650, type: 'timber_log_stack', angle: 0.15 },
  { id: 'prop_logs_6', x: 8850,  y: 640,  type: 'timber_log_stack', angle: -0.2 },

  // C. Fallen Rotting Mossy Logs
  { id: 'prop_fallen_1', x: 8450,  y: 1420, type: 'fallen_log', angle: 0.45 },
  { id: 'prop_fallen_2', x: 9100,  y: 1100, type: 'fallen_log', angle: -0.8 },
  { id: 'prop_fallen_3', x: 9600,  y: 1600, type: 'fallen_log', angle: 1.1 },
  { id: 'prop_fallen_4', x: 10800, y: 920,  type: 'fallen_log', angle: 0.3 },
  { id: 'prop_fallen_5', x: 11800, y: 1350, type: 'fallen_log', angle: -0.6 },
  { id: 'prop_fallen_6', x: 12600, y: 780,  type: 'fallen_log', angle: 0.9 },
  { id: 'prop_fallen_7', x: 14400, y: 1200, type: 'fallen_log', angle: -0.35 },
  { id: 'prop_fallen_8', x: 16200, y: 1800, type: 'fallen_log', angle: 0.5 },

  // D. Mossy Forest & River Boulders (Валуны)
  { id: 'prop_rock_1', x: 9340,  y: 530,  type: 'mossy_rock', angle: 0.3 },
  { id: 'prop_rock_2', x: 9460,  y: 450,  type: 'mossy_rock', angle: -0.5 },
  { id: 'prop_rock_3', x: 12320, y: 550,  type: 'mossy_rock', angle: 0.8 },
  { id: 'prop_rock_4', x: 12460, y: 520,  type: 'mossy_rock', angle: -0.2 },
  { id: 'prop_rock_5', x: 10420, y: 1410, type: 'mossy_rock', angle: 0.1 },
  { id: 'prop_rock_6', x: 11150, y: 1050, type: 'mossy_rock', angle: 0.4 },
  { id: 'prop_rock_7', x: 14180, y: 470,  type: 'mossy_rock', angle: 0.6 },
  { id: 'prop_rock_8', x: 14320, y: 440,  type: 'mossy_rock', angle: -0.7 },

  // E. Campfire Pits (Костровища с углями и лавками)
  { id: 'prop_camp_1', x: 10470, y: 1420, type: 'camp_fire_pit', angle: 0 },
  { id: 'prop_camp_2', x: 14220, y: 530,  type: 'camp_fire_pit', angle: 0.2 },
  { id: 'prop_camp_3', x: 12850, y: 310,  type: 'camp_fire_pit', angle: -0.1 },

  // F. Fishing Piers (Рыбацкие мостки на сваях)
  { id: 'prop_pier_1', x: 14200, y: 440, type: 'fishing_pier', angle: 0 },
  { id: 'prop_pier_2', x: 10800, y: 430, type: 'fishing_pier', angle: 0.05 },

  // G. Wooden Rowboats (Лодки)
  { id: 'prop_boat_1', x: 14240, y: 435, type: 'wooden_boat', angle: 0.25 },
  { id: 'prop_boat_2', x: 10840, y: 425, type: 'wooden_boat', angle: -0.15 },

  // H. River Depth Gauge Marker at Ford (Водомерная рейка брода)
  { id: 'prop_depth_gauge_1', x: 12370, y: 520, type: 'prop_depth_gauge', angle: 0 },

  // I. Forest Signs (Щиты и знаки)
  { id: 'prop_sign_1', x: 8060,  y: 1560, type: 'prop_forest_sign', angle: 0, text: 'Урочище «Сосновый Бор»' },
  { id: 'prop_sign_2', x: 12150, y: 710,  type: 'prop_forest_sign', angle: 0, text: 'Внимание: Впереди брод 30м' },
  { id: 'prop_sign_3', x: 10280, y: 1370, type: 'prop_forest_sign', angle: 0, text: 'Кордон «Красный Ручей»' },
  { id: 'prop_sign_4', x: 11450, y: 1720, type: 'prop_forest_sign', angle: 0, text: 'Гослесопосадка: Берегите лес!' },

  // J. Old Wooden Logging Bridge Planks & Railings at x: 9400, y: 490
  { id: 'prop_bridge_1', x: 9400, y: 490, type: 'wooden_bridge_plank', angle: 0 },

  // K. River Reeds Clusters (Камыш и рогоз)
  { id: 'prop_reeds_1', x: 12290, y: 560, type: 'river_reeds', angle: 0.1 },
  { id: 'prop_reeds_2', x: 12490, y: 550, type: 'river_reeds', angle: -0.2 },
  { id: 'prop_reeds_3', x: 14120, y: 450, type: 'river_reeds', angle: 0.3 },
  { id: 'prop_reeds_4', x: 14350, y: 430, type: 'river_reeds', angle: -0.15 },
  { id: 'prop_reeds_5', x: 10720, y: 450, type: 'river_reeds', angle: 0.25 },
  { id: 'prop_reeds_6', x: 9320,  y: 510, type: 'river_reeds', angle: 0 },
  { id: 'prop_reeds_7', x: 9480,  y: 470, type: 'river_reeds', angle: 0.1 }
];

for (const p of newProps) {
  if (!map.props.find(existing => existing.id === p.id)) {
    map.props.push(p);
  }
}

// 5. TREES: WILD FOREST (x: 7800..11500) & MASSIVE FORESTRY PLANTATION (x: 11500..18500)
// Filter helper to check collision with roads and clearings
function isPointOnRoadOrBuilding(x, y, radius = 25) {
  // Check river channel
  if (y >= 350 && y <= 630 && x >= 6200 && x <= 49000) {
    return true; // inside river channel
  }
  // Check roads
  for (const r of map.roads) {
    if (r.direction === 'curved' && r.curvePoints) {
      for (let i = 0; i < r.curvePoints.length - 1; i++) {
        const p1 = r.curvePoints[i];
        const p2 = r.curvePoints[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = p1.x + t * dx;
        const py = p1.y + t * dy;
        const d = Math.hypot(x - px, y - py);
        if (d < (r.width / 2 + radius + 8)) return true;
      }
    } else {
      const minRx = Math.min(r.x1, r.x2) - (r.width / 2 + radius + 8);
      const maxRx = Math.max(r.x1, r.x2) + (r.width / 2 + radius + 8);
      const minRy = Math.min(r.y1, r.y2) - (r.width / 2 + radius + 8);
      const maxRy = Math.max(r.y1, r.y2) + (r.width / 2 + radius + 8);
      if (x >= minRx && x <= maxRx && y >= minRy && y <= maxRy) return true;
    }
  }
  // Check buildings & clearings
  for (const b of map.buildings) {
    if (x >= b.x - radius - 15 && x <= b.x + b.width + radius + 15 &&
        y >= b.y - radius - 15 && y <= b.y + b.height + radius + 15) {
      return true;
    }
  }
  return false;
}

// Pseudo-random deterministic generator
let seed = 1234567;
function rand() {
  seed = (seed * 16807 + 11) % 2147483647;
  return (seed - 1) / 2147483646;
}

const existingTreeIds = new Set(map.trees.map(t => t.id));
let treeIndex = 1;

// A. WILD PINE & BIRCH FOREST (x: 7800..11500, y: 600..2600)
// Clustered organic trees: Scots pines, European spruce, silver birches
const PINE_COLORS = ['#14532d', '#166534', '#0f3e24', '#124c2c', '#1b6138'];
const BIRCH_COLORS = ['#84cc16', '#a3e635', '#65a30d', '#4d7c0f'];

for (let x = 7900; x <= 11400; x += 55) {
  for (let y = 620; y <= 2550; y += 55) {
    const jitterX = (rand() - 0.5) * 38;
    const jitterY = (rand() - 0.5) * 38;
    const tx = x + jitterX;
    const ty = y + jitterY;

    // Density modulation (some clearings, some dense clusters)
    const clusterNoise = Math.sin(tx * 0.005) * Math.cos(ty * 0.005);
    if (clusterNoise < -0.35) continue; // Natural woodland clearing

    const isBirch = rand() < 0.28; // 28% birches, 72% pines/spruce
    const r = isBirch ? (18 + rand() * 10) : (24 + rand() * 14);

    if (isPointOnRoadOrBuilding(tx, ty, r)) continue;

    const id = `tree_wildforest_${Math.round(tx)}_${Math.round(ty)}_${treeIndex++}`;
    if (!existingTreeIds.has(id)) {
      map.trees.push({
        id,
        x: tx,
        y: ty,
        radius: r,
        color: isBirch ? BIRCH_COLORS[Math.floor(rand() * BIRCH_COLORS.length)] : PINE_COLORS[Math.floor(rand() * PINE_COLORS.length)],
        type: isBirch ? 'birch' : 'pine',
        shadowOffset: 7
      });
      existingTreeIds.add(id);
    }
  }
}

// B. MASSIVE FORESTRY PLANTATION (Гослесопосадка: x: 11500..18500, y: 650..3150)
// Structured protective shelterbelts (Лесополосы):
// Tree belts run in rows spaced by 34px, with clear firebreaks and tractor tracks
for (let blockX = 11500; blockX <= 18200; blockX += 450) {
  for (let blockY = 680; blockY <= 3050; blockY += 420) {
    // Within each block, generate 4-5 neat parallel plantation rows
    const rowCount = 7;
    const rowSpacing = 42;
    for (let row = 0; row < rowCount; row++) {
      const rowY = blockY + row * rowSpacing;
      for (let tx = blockX; tx < blockX + 380; tx += 48) {
        const jitterX = (rand() - 0.5) * 12;
        const jitterY = (rand() - 0.5) * 8;
        const finalX = tx + jitterX;
        const finalY = rowY + jitterY;

        const isBirch = rand() < 0.15; // occasional birch in pine shelterbelt
        const r = isBirch ? (19 + rand() * 7) : (22 + rand() * 10);

        if (isPointOnRoadOrBuilding(finalX, finalY, r)) continue;

        const id = `tree_plantation_${Math.round(finalX)}_${Math.round(finalY)}_${treeIndex++}`;
        if (!existingTreeIds.has(id)) {
          map.trees.push({
            id,
            x: finalX,
            y: finalY,
            radius: r,
            color: isBirch ? BIRCH_COLORS[Math.floor(rand() * BIRCH_COLORS.length)] : PINE_COLORS[Math.floor(rand() * PINE_COLORS.length)],
            type: isBirch ? 'birch' : 'pine',
            shadowOffset: 7
          });
          existingTreeIds.add(id);
        }
      }
    }
  }
}

// Write updated map.json
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');

console.log('Successfully baked forest, plantation, river trails, and props into public/map.json!');
console.log('New map stats:');
console.log({
  roads: map.roads.length,
  buildings: map.buildings.length,
  trees: map.trees.length,
  props: map.props.length,
  vehicles: map.vehicles.length
});

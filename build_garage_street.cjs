const fs = require('fs');

const map = JSON.parse(fs.readFileSync('public/map.json', 'utf8'));

console.log('=== BUILD GARAGE STREET & COOPERATIVES ===');
console.log('Initial buildings:', map.buildings.length);
console.log('Initial props:', map.props.length);
console.log('Initial trees:', map.trees.length);

// Clean up any previously added garage items to ensure idempotency
map.buildings = map.buildings.filter(b => !b.id.startsWith('garage_gsk_') && !b.id.startsWith('garage_workshop_'));
map.props = map.props.filter(p => !p.id.startsWith('prop_gsk_'));
map.driveways = (map.driveways || []).filter(d => !d.id.startsWith('dw_gsk_'));
map.roads.forEach(road => {
  if (road.id === 'road_h_1_0' || road.id === 'road_h_1_1') {
    road.name = 'ул. Старогаражная';
    road.isDirt = false;
    road.isGravel = false;
  } else if (road.id === 'road_h_0_0' || road.id === 'road_h_0_1') {
    road.name = 'Гаражный тупик';
    road.isDirt = false;
    road.isGravel = false;
  } else if (road.id === 'road_v_0_1') {
    road.name = 'Проезд Автомобилистов';
    road.isDirt = false;
  } else if (road.id === 'road_v_1_1') {
    road.name = 'Проезд Моторный';
    road.isDirt = false;
  }
});

// 2. HELPER FUNCTIONS FOR GENERATION
let nextBldId = 1000;
let nextPropId = 80000;
let nextDwId = 5000;

const newBuildings = [];
const newProps = [];
const newDriveways = [];

// Palette for authentic Soviet & post-Soviet garage doors
const doorColors = [
  '#1d4ed8', // Classic Soviet Cobalt Blue
  '#1e3a8a', // Deep Navy Blue
  '#831843', // Red Primer Oxide
  '#7f1d1d', // Dark Oxide Red
  '#15803d', // Forest Green Hammerite
  '#166534', // Dark Protective Green
  '#334155', // Slate Graphite
  '#1e293b', // Dark Charcoal Steel
  '#a16207', // Ochre / Yellow Oxide
  '#475569'  // Weathered Grey
];

// Helper: Add Garage Box
function addGarageBox(options) {
  const {
    id = `garage_gsk_${nextBldId++}`,
    name,
    x, y, width = 34, height = 48,
    subtype = 'brick',
    doorColor,
    number,
    entranceSide = 'south',
    sign = '',
    cooperative = ''
  } = options;

  let wallColor = '#854d0e'; // clay brick
  let roofColor = '#1c1917'; // dark bitumen
  let accentColor = '#3f3f46';

  if (subtype === 'silicate') {
    wallColor = '#cbd5e1';
    roofColor = '#18181b';
    accentColor = '#475569';
  } else if (subtype === 'concrete') {
    wallColor = '#64748b';
    roofColor = '#1e293b';
    accentColor = '#334155';
  } else if (subtype === 'metal') {
    wallColor = '#475569';
    roofColor = '#0f172a';
    accentColor = '#1e293b';
  } else if (subtype === 'workshop') {
    wallColor = '#78350f';
    roofColor = '#09090b';
    accentColor = '#f59e0b';
  }

  const selectedDoorColor = doorColor || doorColors[Math.floor(Math.random() * doorColors.length)];

  newBuildings.push({
    id,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    type: subtype === 'workshop' ? 'garage_workshop' : 'garage_box',
    name: name || `Гаражный бокс ${number ? '№' + number : ''}`,
    color: wallColor,
    roofColor,
    accentColor,
    entranceSide,
    garageSubtype: subtype,
    garageNumber: number,
    garageDoorColor: selectedDoorColor,
    garageSign: sign,
    cooperativeName: cooperative
  });
}

// Helper: Add PO-2 Concrete Fence Line
function addFenceLine(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) return;
  const angle = Math.atan2(dy, dx);
  const step = 38; // 38px matching visual size in propRenderer
  const count = Math.max(1, Math.round((dist - step) / step));
  const startOffset = (dist - count * step) / 2 + step / 2;
  const ux = dx / dist;
  const uy = dy / dist;

  for (let i = 0; i <= count; i++) {
    const d = startOffset + i * step;
    if (d > dist - step / 4) continue;
    const px = x1 + ux * d;
    const py = y1 + uy * d;
    newProps.push({
      id: `prop_gsk_fence_${nextPropId++}`,
      type: 'concrete_fence_po2',
      x: Math.round(px),
      y: Math.round(py),
      angle: Number(angle.toFixed(3))
    });
  }
}

// Helper: Add Prop
function addProp(type, x, y, angle = 0) {
  newProps.push({
    id: `prop_gsk_${nextPropId++}`,
    type,
    x: Math.round(x),
    y: Math.round(y),
    angle: Number(angle.toFixed(3))
  });
}

// Helper: Add Driveway
function addDriveway(x, y, width, height, type = 'gravel') {
  newDriveways.push({
    id: `dw_gsk_${nextDwId++}`,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    type
  });
}

// =========================================================================
// 3. SECTOR 1: ГСК «ЛАДА» (North Sector, x: 80..720, y: 880..1540)
// =========================================================================
console.log('Generating ГСК «Лада»...');

// Perimeter Fences (Gate opening: x: 340..460 at y=1540 -> 120px wide clear opening!)
addFenceLine(80, 880, 720, 880);   // North wall
addFenceLine(80, 880, 80, 1540);   // West wall
addFenceLine(720, 880, 720, 1540); // East wall
addFenceLine(80, 1540, 340, 1540); // South wall (west of gate)
addFenceLine(460, 1540, 720, 1540); // South wall (east of gate)

// Main Central Road & Entrance Connector (120px wide asphalt corridor)
addDriveway(340, 1386, 120, 160, 'asphalt');
// Central north-south artery inside cooperative
addDriveway(333, 900, 134, 490, 'concrete_slabs');

// Gatehouse Checkpoint (Positioned safely west of gate at x=295, clear of roadway)
newBuildings.push({
  id: `garage_gsk_gatehouse_lada`,
  x: 295,
  y: 1475,
  width: 32,
  height: 24,
  type: 'garage_gatehouse',
  name: 'Сторожка КПП ГСК «Лада»',
  color: '#854d0e',
  roofColor: '#1c1917',
  accentColor: '#451a03',
  entranceSide: 'east',
  garageSubtype: 'gatehouse',
  cooperativeName: 'ГСК «Лада»'
});

// Gate entrance lighting placed on fence boundary posts
addProp('lamp_concrete', 335, 1538, 0);
addProp('lamp_concrete', 465, 1538, 0);
addProp('trash_bin', 285, 1485, 0);

// Car Inspection Overpass Ramp (Positioned safely east of gate road at x=480, y=1460)
newBuildings.push({
  id: `garage_gsk_ramp_lada`,
  x: 480,
  y: 1460,
  width: 34,
  height: 64,
  type: 'garage_ramp',
  name: 'Эстакада ГСК «Лада»',
  color: '#334155',
  roofColor: '#1e293b',
  accentColor: '#eab308',
  garageSubtype: 'ramp',
  cooperativeName: 'ГСК «Лада»'
});

// Transformer Substation (In far southwest corner)
newBuildings.push({
  id: `garage_gsk_substation_lada`,
  x: 95,
  y: 1470,
  width: 28,
  height: 28,
  type: 'garage_substation',
  name: 'Трансформаторная подстанция ТП-18',
  color: '#64748b',
  roofColor: '#334155',
  accentColor: '#eab308',
  garageSubtype: 'substation',
  cooperativeName: 'ГСК «Лада»'
});
addFenceLine(90, 1465, 130, 1465);
addFenceLine(130, 1465, 130, 1505);

// Southeast Dumpster & Scrap Area (Along east fence)
addProp('trash_bin', 710, 1515, 0);
addProp('trash_bin', 710, 1495, 0);
addProp('trash_bin', 710, 1475, 0);
addProp('garage_trash_heap', 695, 1475, 0);
addProp('garage_tires_heap', 710, 1430, 0.4);
addProp('garage_scrap_metal', 105, 1520, 0.2);
addProp('oil_barrel_cluster', 125, 1475, 0);

// GARAGE LINES (4 spacious rows = 2 facing pairs with wide 130px alleys)
// West wing: x: 95..333 (7 boxes, 34px wide each)
// Center road: x: 333..467 (134px wide)
// East wing: x: 467..705 (7 boxes, 34px wide each)

// Alley 1: y = 948..1078 (Height = 130px!)
addDriveway(90, 948, 620, 130, 'concrete_slabs');
// Alley 2: y = 1208..1338 (Height = 130px!)
addDriveway(90, 1208, 620, 130, 'concrete_slabs');

const rowConfigsLada = [
  { y: 900, entranceSide: 'south', subtype: 'brick' },
  { y: 1078, entranceSide: 'north', subtype: 'silicate' },
  { y: 1160, entranceSide: 'south', subtype: 'concrete' },
  { y: 1338, entranceSide: 'north', subtype: 'metal' }
];

let boxNumLada = 1;
rowConfigsLada.forEach(rc => {
  // West wing boxes
  for (let b = 0; b < 7; b++) {
    const bx = 95 + b * 34;
    addGarageBox({
      x: bx,
      y: rc.y,
      width: 33,
      height: 48,
      subtype: rc.subtype,
      entranceSide: rc.entranceSide,
      number: `${boxNumLada++}`,
      cooperative: 'ГСК «Лада»'
    });
  }

  // East wing boxes
  for (let b = 0; b < 7; b++) {
    const bx = 467 + b * 34;
    addGarageBox({
      x: bx,
      y: rc.y,
      width: 33,
      height: 48,
      subtype: rc.subtype,
      entranceSide: rc.entranceSide,
      number: `${boxNumLada++}`,
      cooperative: 'ГСК «Лада»'
    });
  }
});

// Perimeter Power Poles (placed flush against outer fences, zero intrusion into lanes)
addProp('power_pole', 86, 924, 0);
addProp('power_pole', 86, 1143, 0);
addProp('power_pole', 86, 1362, 0);
addProp('power_pole', 714, 924, 0);
addProp('power_pole', 714, 1143, 0);
addProp('power_pole', 714, 1362, 0);

// Atmospheric Props placed safely in the back-to-back buffer (y = 1126..1160) and outer corners
addProp('garage_scrap_metal', 120, 1143, 0.2);
addProp('oil_barrel_cluster', 200, 1143, 0);
addProp('garage_tires_heap', 520, 1143, 0.3);
addProp('pallet_stack', 640, 1143, 0);
addProp('garage_dirt_pile', 88, 1013, 0);
addProp('garage_sand_pile', 712, 1013, 0);
addProp('garage_trash_heap', 88, 1273, 0);
addProp('garage_sofa', 712, 1273, 0);


// =========================================================================
// 4. SECTOR 2: ГСК «АВТОМОБИЛИСТ» (South Sector, x: 80..720, y: 1660..2260)
// =========================================================================
console.log('Generating ГСК «Автомобилист»...');

// Perimeter Fences (Gate opening: x: 340..460 at y=1660 -> 120px wide clear opening!)
addFenceLine(80, 1660, 340, 1660);  // North wall (west of gate)
addFenceLine(460, 1660, 720, 1660); // North wall (east of gate)
addFenceLine(80, 1660, 80, 2260);   // West wall
addFenceLine(720, 1660, 720, 2260); // East wall
addFenceLine(80, 2260, 720, 2260);  // South wall

// Main Entrance Connector Driveway
addDriveway(340, 1650, 120, 120, 'asphalt');
// Central north-south artery inside cooperative
addDriveway(333, 1760, 134, 490, 'concrete_slabs');

// Gatehouse Checkpoint (Positioned safely west of gate at x=295, y=1675)
newBuildings.push({
  id: `garage_gsk_gatehouse_auto`,
  x: 295,
  y: 1675,
  width: 32,
  height: 24,
  type: 'garage_gatehouse',
  name: 'Сторожка КПП ГСК «Автомобилист»',
  color: '#854d0e',
  roofColor: '#1c1917',
  accentColor: '#451a03',
  entranceSide: 'east',
  garageSubtype: 'gatehouse',
  cooperativeName: 'ГСК «Автомобилист»'
});

// Gate entrance lighting placed on fence boundary posts
addProp('lamp_concrete', 335, 1658, 0);
addProp('lamp_concrete', 465, 1658, 0);

// Car Inspection Overpass Ramp (Positioned safely east of gate road at x=480, y=1675)
newBuildings.push({
  id: `garage_gsk_ramp_auto`,
  x: 480,
  y: 1675,
  width: 34,
  height: 64,
  type: 'garage_ramp',
  name: 'Эстакада ГСК «Автомобилист»',
  color: '#334155',
  roofColor: '#1e293b',
  accentColor: '#eab308',
  garageSubtype: 'ramp',
  cooperativeName: 'ГСК «Автомобилист»'
});

// Dedicated Salvage & Project Yard Nook (Far east corner x: 570..710, y: 1680..1740, well clear of roadway)
addProp('rustic_car_wreck', 630, 1705, 0.25);
addProp('scrap_pile', 685, 1705, 0);
addProp('tarp_covered_car', 580, 1705, 0.1);
addProp('car_on_blocks', 630, 1740, 0);
addProp('oil_barrel_cluster', 685, 1740, 0.4);

// SPECIALIZED WORKSHOPS ROW (Row 1 West Wing, y: 1760..1808, doors facing South into Alley 1)
// Tire Repair Workshop (Шиномонтаж 24)
newBuildings.push({
  id: `garage_workshop_shina`,
  x: 95,
  y: 1760,
  width: 58,
  height: 48,
  type: 'garage_workshop',
  name: 'Шиномонтаж 24 (ГСК Автомобилист)',
  color: '#78350f',
  roofColor: '#09090b',
  accentColor: '#f59e0b',
  entranceSide: 'south',
  garageSubtype: 'workshop',
  garageDoorColor: '#1d4ed8',
  garageSign: 'ШИНОМОНТАЖ 24',
  cooperativeName: 'ГСК «Автомобилист»'
});
addProp('industrial_tires', 88, 1784, 0);
addProp('cable_spool', 88, 1765, 0);

// Auto Electrician Workshop
newBuildings.push({
  id: `garage_workshop_electric`,
  x: 155,
  y: 1760,
  width: 58,
  height: 48,
  type: 'garage_workshop',
  name: 'Автоэлектрик & Диагностика',
  color: '#78350f',
  roofColor: '#09090b',
  accentColor: '#f59e0b',
  entranceSide: 'south',
  garageSubtype: 'workshop',
  garageDoorColor: '#831843',
  garageSign: 'АВТОЭЛЕКТРИК',
  cooperativeName: 'ГСК «Автомобилист»'
});

// Engine Repair Workshop
newBuildings.push({
  id: `garage_workshop_engine`,
  x: 215,
  y: 1760,
  width: 58,
  height: 48,
  type: 'garage_workshop',
  name: 'Ремонт ДВС & Карбюраторов',
  color: '#78350f',
  roofColor: '#09090b',
  accentColor: '#f59e0b',
  entranceSide: 'south',
  garageSubtype: 'workshop',
  garageDoorColor: '#15803d',
  garageSign: 'РЕМОНТ ДВИГАТЕЛЕЙ',
  cooperativeName: 'ГСК «Автомобилист»'
});

// Welding & Body Shop
newBuildings.push({
  id: `garage_workshop_welding`,
  x: 275,
  y: 1760,
  width: 58,
  height: 48,
  type: 'garage_workshop',
  name: 'Сварка Аргон & Кузовной ремонт',
  color: '#78350f',
  roofColor: '#09090b',
  accentColor: '#f59e0b',
  entranceSide: 'south',
  garageSubtype: 'workshop',
  garageDoorColor: '#a16207',
  garageSign: 'СВАРКА / КУЗОВ',
  cooperativeName: 'ГСК «Автомобилист»'
});

// East wing boxes on Row 1 (doors facing South into Alley 1)
for (let b = 0; b < 7; b++) {
  const bx = 467 + b * 34;
  addGarageBox({
    x: bx,
    y: 1760,
    width: 33,
    height: 48,
    subtype: 'brick',
    entranceSide: 'south',
    number: `A-${b + 1}`,
    cooperative: 'ГСК «Автомобилист»'
  });
}

// Alley 1: y = 1808..1938 (Height = 130px!)
addDriveway(90, 1808, 620, 130, 'concrete_slabs');
// Alley 2: y = 2068..2198 (Height = 130px!)
addDriveway(90, 2068, 620, 130, 'concrete_slabs');

const rowConfigsAuto = [
  { y: 1938, entranceSide: 'north', subtype: 'silicate' },
  { y: 2020, entranceSide: 'south', subtype: 'concrete' },
  { y: 2198, entranceSide: 'north', subtype: 'metal' }
];

let boxNumAuto = 10;
rowConfigsAuto.forEach(rc => {
  // West wing
  for (let b = 0; b < 7; b++) {
    const bx = 95 + b * 34;
    addGarageBox({
      x: bx,
      y: rc.y,
      width: 33,
      height: 48,
      subtype: rc.subtype,
      entranceSide: rc.entranceSide,
      number: `A-${boxNumAuto++}`,
      cooperative: 'ГСК «Автомобилист»'
    });
  }

  // East wing
  for (let b = 0; b < 7; b++) {
    const bx = 467 + b * 34;
    addGarageBox({
      x: bx,
      y: rc.y,
      width: 33,
      height: 48,
      subtype: rc.subtype,
      entranceSide: rc.entranceSide,
      number: `A-${boxNumAuto++}`,
      cooperative: 'ГСК «Автомобилист»'
    });
  }
});

// Perimeter Power Poles (placed flush against outer fences)
addProp('power_pole', 86, 1784, 0);
addProp('power_pole', 86, 2003, 0);
addProp('power_pole', 86, 2222, 0);
addProp('power_pole', 714, 1784, 0);
addProp('power_pole', 714, 2003, 0);
addProp('power_pole', 714, 2222, 0);

// Props placed safely in the back-to-back buffer (y = 1986..2020) and outer corners
addProp('garage_scrap_metal', 120, 2003, 0.2);
addProp('oil_barrel_cluster', 220, 2003, 0);
addProp('pallet_stack', 520, 2003, 0);
addProp('garage_tires_heap', 620, 2003, 0.3);
addProp('garage_dirt_pile', 88, 1873, 0);
addProp('garage_sand_pile', 712, 1873, 0);
addProp('garage_trash_heap', 88, 2133, 0);
addProp('garage_sofa', 712, 2133, 0);


// =========================================================================
// 5. DEAD-END TURNAROUND OF УЛ. СТАРОГАРАЖНАЯ (x: 40..130, y: 1550..1650)
// =========================================================================
console.log('Generating dead-end turnaround barricade and signs...');
for (let by = 1560; by <= 1640; by += 26) {
  addProp('concrete_barrier', 52, by, Math.PI / 2);
}
addProp('lamp_concrete', 68, 1554, 0);
addProp('lamp_concrete', 68, 1646, 0);


// =========================================================================
// 6. SECTOR 3: ГСК «СИГНАЛ» (East Block, x: 880..1520, y: 880..1540)
// =========================================================================
console.log('Generating ГСК «Сигнал»...');

// Perimeter Fences (Gate opening on West Wall: y: 1140..1280 at x=880 -> 140px wide clear opening!)
addFenceLine(880, 880, 1520, 880);   // North wall along Гаражный тупик
addFenceLine(880, 880, 880, 1140);   // West wall (north of gate)
addFenceLine(880, 1280, 880, 1540);  // West wall (south of gate)
addFenceLine(1520, 880, 1520, 1540); // East wall
addFenceLine(880, 1540, 1520, 1540); // South wall along ул. Старогаражная

// Main Central Avenue & Entrance Connector (140px wide asphalt corridor)
addDriveway(840, 1140, 140, 140, 'asphalt');
// Central east-west plaza inside cooperative
addDriveway(980, 1126, 530, 154, 'concrete_slabs');

// Gatehouse Checkpoint (Positioned safely north of gate at x=890, y=1090)
newBuildings.push({
  id: `garage_gsk_gatehouse_signal`,
  x: 890,
  y: 1090,
  width: 32,
  height: 24,
  type: 'garage_gatehouse',
  name: 'Сторожка КПП ГСК «Сигнал»',
  color: '#854d0e',
  roofColor: '#1c1917',
  accentColor: '#451a03',
  entranceSide: 'south',
  garageSubtype: 'gatehouse',
  cooperativeName: 'ГСК «Сигнал»'
});

// Gate entrance lighting placed on fence boundary posts
addProp('lamp_concrete', 875, 1135, 0);
addProp('lamp_concrete', 875, 1285, 0);

// Car Inspection Ramp (Positioned safely south of gate road at x=890, y=1300)
newBuildings.push({
  id: `garage_gsk_ramp_signal`,
  x: 890,
  y: 1300,
  width: 34,
  height: 64,
  type: 'garage_ramp',
  name: 'Эстакада ГСК «Сигнал»',
  color: '#334155',
  roofColor: '#1e293b',
  accentColor: '#eab308',
  garageSubtype: 'ramp',
  cooperativeName: 'ГСК «Сигнал»'
});

// Alley 1: y = 948..1078 (Height = 130px!)
addDriveway(980, 948, 530, 130, 'concrete_slabs');
// Alley 2: y = 1328..1458 (Height = 130px!)
addDriveway(980, 1328, 530, 130, 'concrete_slabs');

// Rows of garages in ГСК «Сигнал» (4 rows, x: 990..1500)
// 15 boxes per row = 60 boxes!
const rowConfigsSignal = [
  { y: 900, entranceSide: 'south', subtype: 'concrete' },
  { y: 1078, entranceSide: 'north', subtype: 'silicate' },
  { y: 1280, entranceSide: 'south', subtype: 'brick' },
  { y: 1458, entranceSide: 'north', subtype: 'concrete' }
];

let boxNumSignal = 1;
rowConfigsSignal.forEach(rc => {
  for (let b = 0; b < 15; b++) {
    const bx = 990 + b * 34;
    addGarageBox({
      x: bx,
      y: rc.y,
      width: 33,
      height: 48,
      subtype: rc.subtype,
      entranceSide: rc.entranceSide,
      number: `С-${boxNumSignal++}`,
      cooperative: 'ГСК «Сигнал»'
    });
  }
});

// Perimeter Power Poles (flush against fences)
addProp('power_pole', 886, 924, 0);
addProp('power_pole', 886, 1482, 0);
addProp('power_pole', 1514, 924, 0);
addProp('power_pole', 1514, 1482, 0);

// Props placed safely in outer corners
addProp('oil_barrel_cluster', 950, 1090, 0);
addProp('garage_workbench', 950, 1290, 0);
addProp('garage_scrap_metal', 1512, 1013, 0.2);
addProp('garage_tires_heap', 1512, 1393, 0.3);


// =========================================================================
// 7. CLEAN UP TREES THAT OVERLAP GARAGE COOPERATIVES, ALLEYS OR ROADS
// =========================================================================
console.log('Filtering trees inside garage cooperative footprints...');
const clearedZones = [
  { x1: 65, y1: 865, x2: 735, y2: 1545 },  // ГСК «Лада»
  { x1: 65, y1: 1655, x2: 735, y2: 2275 }, // ГСК «Автомобилист»
  { x1: 865, y1: 865, x2: 1535, y2: 1545 }, // ГСК «Сигнал»
  { x1: 0, y1: 1545, x2: 1600, y2: 1655 }   // ул. Старогаражная road corridor
];

const preservedTrees = map.trees.filter(t => {
  for (const z of clearedZones) {
    if (t.x >= z.x1 && t.x <= z.x2 && t.y >= z.y1 && t.y <= z.y2) {
      return false; // Remove tree
    }
  }
  return true;
});

console.log(`Trees before: ${map.trees.length}, trees after: ${preservedTrees.length} (removed ${map.trees.length - preservedTrees.length})`);


// =========================================================================
// 8. COMBINE AND WRITE MAP DATA
// =========================================================================
map.buildings.push(...newBuildings);
map.props.push(...newProps);
map.driveways = (map.driveways || []).concat(newDriveways);
map.trees = preservedTrees;

console.log('Total buildings after:', map.buildings.length, `(+${newBuildings.length})`);
console.log('Total props after:', map.props.length, `(+${newProps.length})`);
console.log('Total driveways after:', map.driveways.length, `(+${newDriveways.length})`);

fs.writeFileSync('public/map.json', JSON.stringify(map, null, 2), 'utf8');
console.log('Saved public/map.json successfully!');

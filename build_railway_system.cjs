// Builder script for the Railway Network & Station Complex in the southern empty fields
// Coordinates: X = 7600..17200, Y = 4000..7000
const fs = require('fs');

const mapPath = './public/map.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('Current Map stats:');
console.log('Roads:', map.roads.length);
console.log('Intersections:', map.intersections.length);
console.log('Buildings:', map.buildings.length);
console.log('Props:', map.props.length);
console.log('Sidewalks:', (map.sidewalks || []).length);
console.log('Parkings:', (map.parkings || []).length);

// Ensure arrays exist
if (!map.railwayTracks) map.railwayTracks = [];
if (!map.railwayPlatforms) map.railwayPlatforms = [];
if (!map.rollingStock) map.rollingStock = [];
if (!map.sidewalks) map.sidewalks = [];
if (!map.parkings) map.parkings = [];

// Remove any existing railway objects if re-running
map.railwayTracks = map.railwayTracks.filter(t => !t.id.startsWith('rail_'));
map.railwayPlatforms = map.railwayPlatforms.filter(p => !p.id.startsWith('platform_'));
map.rollingStock = map.rollingStock.filter(c => !c.id.startsWith('train_'));
map.buildings = map.buildings.filter(b => !b.id.startsWith('bld_railway_'));
map.roads = map.roads.filter(r => !r.id.startsWith('road_station_') && !r.id.startsWith('road_rail_'));
map.intersections = map.intersections.filter(i => !i.id.startsWith('inter_station_') && !i.id.startsWith('inter_m12_station'));
map.props = map.props.filter(p => !p.id.startsWith('prop_rail_') && !p.id.startsWith('prop_station_'));
map.sidewalks = map.sidewalks.filter(s => !s.id.startsWith('sw_station_'));
map.parkings = map.parkings.filter(p => !p.id.startsWith('parking_station_'));

// ==========================================
// 1. RAILWAY TRACKS (ПУТЕВОЕ РАЗВИТИЕ)
// ==========================================
const tracks = [];

// Track 1: Mainline Track I (Главный путь I) - Eastbound
tracks.push({
  id: 'rail_main_1_west',
  name: 'Главный путь I (Западный перегон)',
  x1: 7600,
  y1: 5792,
  x2: 9200,
  y2: 5792,
  trackType: 'mainline',
  gauge: 16,
  ballastWidth: 42,
  sleepersType: 'concrete',
  isElectrified: true
});

tracks.push({
  id: 'rail_main_1_station',
  name: 'Главный путь I (Станционная секция)',
  x1: 9200,
  y1: 5792,
  x2: 13100,
  y2: 5792,
  trackType: 'mainline',
  gauge: 16,
  ballastWidth: 42,
  sleepersType: 'concrete',
  isElectrified: true,
  isSwitch: true,
  switchData: {
    branchDirection: 'left',
    pointX: 9200,
    pointY: 5792,
    frogX: 9280,
    frogY: 5786,
    divergingAngle: -0.12
  }
});

tracks.push({
  id: 'rail_main_1_east',
  name: 'Главный путь I (Восточный перегон)',
  x1: 13100,
  y1: 5792,
  x2: 17200,
  y2: 5792,
  trackType: 'mainline',
  gauge: 16,
  ballastWidth: 42,
  sleepersType: 'concrete',
  isElectrified: true
});

// Track 2: Mainline Track II (Главный путь II) - Westbound
tracks.push({
  id: 'rail_main_2_west',
  name: 'Главный путь II (Западный перегон)',
  x1: 7600,
  y1: 5888,
  x2: 9400,
  y2: 5888,
  trackType: 'mainline',
  gauge: 16,
  ballastWidth: 42,
  sleepersType: 'concrete',
  isElectrified: true
});

tracks.push({
  id: 'rail_main_2_station',
  name: 'Главный путь II (Станционная секция)',
  x1: 9400,
  y1: 5888,
  x2: 12900,
  y2: 5888,
  trackType: 'mainline',
  gauge: 16,
  ballastWidth: 42,
  sleepersType: 'concrete',
  isElectrified: true,
  isSwitch: true,
  switchData: {
    branchDirection: 'right',
    pointX: 9400,
    pointY: 5888,
    frogX: 9480,
    frogY: 5896,
    divergingAngle: 0.12
  }
});

tracks.push({
  id: 'rail_main_2_east',
  name: 'Главный путь II (Восточный перегон)',
  x1: 12900,
  y1: 5888,
  x2: 17200,
  y2: 5888,
  trackType: 'mainline',
  gauge: 16,
  ballastWidth: 42,
  sleepersType: 'concrete',
  isElectrified: true
});

// Track 3: Passenger Station Track 3 (Приемо-отправочный пассажирский путь 3 к Платформе 1)
// Diverges from Track 1 at X=9200, runs at Y=5752, merges at X=13100
tracks.push({
  id: 'rail_branch_3_entry',
  name: 'Стрелочный перевод пути 3 (Западная горловина)',
  x1: 9200,
  y1: 5792,
  x2: 9550,
  y2: 5752,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

tracks.push({
  id: 'rail_track_3_platform',
  name: 'Пассажирский путь 3 (Платформа 1 Вокзала)',
  x1: 9550,
  y1: 5752,
  x2: 12700,
  y2: 5752,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

tracks.push({
  id: 'rail_branch_3_exit',
  name: 'Стрелочный перевод пути 3 (Восточная горловина)',
  x1: 12700,
  y1: 5752,
  x2: 13100,
  y2: 5792,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

// Track 4: South Station Track 4 (Приемо-отправочный путь 4 к Платформе 2)
// Diverges from Track 2 at X=9400, runs at Y=5948, merges at X=12900
tracks.push({
  id: 'rail_branch_4_entry',
  name: 'Стрелочный перевод пути 4 (Западная горловина)',
  x1: 9400,
  y1: 5888,
  x2: 9750,
  y2: 5948,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

tracks.push({
  id: 'rail_track_4_station',
  name: 'Путь 4 (Южный станционный путь)',
  x1: 9750,
  y1: 5948,
  x2: 12550,
  y2: 5948,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

tracks.push({
  id: 'rail_branch_4_exit',
  name: 'Стрелочный перевод пути 4 (Восточная горловина)',
  x1: 12550,
  y1: 5948,
  x2: 12900,
  y2: 5888,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

// Crossover 1: Western Crossover (Западный съезд между Главным 1 и Главным 2)
tracks.push({
  id: 'rail_crossover_west',
  name: 'Съезд 1/3 (Западный межпутный съезд)',
  x1: 9600,
  y1: 5792,
  x2: 9900,
  y2: 5888,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

// Crossover 2: Eastern Crossover (Восточный съезд между Главным 2 и Главным 1)
tracks.push({
  id: 'rail_crossover_east',
  name: 'Съезд 2/4 (Восточный межпутный съезд)',
  x1: 12300,
  y1: 5888,
  x2: 12600,
  y2: 5792,
  trackType: 'station',
  gauge: 16,
  ballastWidth: 38,
  sleepersType: 'concrete',
  isElectrified: true
});

// DEAD-END SIDINGS WITH BUFFER STOPS (ТУПИКИ С ПУТЕВЫМИ УПОРАМИ)

// Dead-end 1: Passenger/Luggage Siding 1 (Пассажирско-багажный отстойный тупик 1)
// Diverges from Track 3 at X=11800, curves to Y=5712, ends at X=12450 with Buffer Stop
tracks.push({
  id: 'rail_siding_1_curve',
  name: 'Стрелка отстойного тупика 1',
  x1: 11800,
  y1: 5752,
  x2: 11980,
  y2: 5712,
  trackType: 'siding',
  gauge: 16,
  ballastWidth: 36,
  sleepersType: 'wood',
  isElectrified: false
});

tracks.push({
  id: 'rail_siding_1_deadend',
  name: 'Отстойный пассажирский тупик 1',
  x1: 11980,
  y1: 5712,
  x2: 12450,
  y2: 5712,
  trackType: 'deadend',
  gauge: 16,
  ballastWidth: 36,
  sleepersType: 'wood',
  isElectrified: false,
  hasBufferStop: true,
  bufferStopEnd: 'end'
});

// Dead-end 2: Freight Siding with Loading Ramp & Warehouse (Грузовой тупик 2 с рампой)
// Diverges from Track 4 at X=10400, curves down to Y=6030, runs to X=12150 with Buffer Stop
tracks.push({
  id: 'rail_siding_2_curve',
  name: 'Стрелка грузового вытяжного пути 2',
  x1: 10400,
  y1: 5948,
  x2: 10650,
  y2: 6030,
  trackType: 'siding',
  gauge: 16,
  ballastWidth: 36,
  sleepersType: 'wood',
  isElectrified: false
});

tracks.push({
  id: 'rail_siding_2_deadend',
  name: 'Грузовой тупик 2 (Погрузочно-выгрузочная рампа)',
  x1: 10650,
  y1: 6030,
  x2: 12150,
  y2: 6030,
  trackType: 'deadend',
  gauge: 16,
  ballastWidth: 36,
  sleepersType: 'wood',
  isElectrified: false,
  hasBufferStop: true,
  bufferStopEnd: 'end'
});

// Dead-end 3: MOW Maintenance Siding (Тупик путевых машин ПЧ-12)
// Diverges from Track 4 at X=9650 to Y=6010, ends at X=10100 with Buffer Stop
tracks.push({
  id: 'rail_siding_3_curve',
  name: 'Стрелка ремонтного тупика ПЧ',
  x1: 9650,
  y1: 5948,
  x2: 9800,
  y2: 6010,
  trackType: 'siding',
  gauge: 16,
  ballastWidth: 36,
  sleepersType: 'wood',
  isElectrified: false
});

tracks.push({
  id: 'rail_siding_3_deadend',
  name: 'Ремонтно-технический тупик 3',
  x1: 9800,
  y1: 6010,
  x2: 10120,
  y2: 6010,
  trackType: 'deadend',
  gauge: 16,
  ballastWidth: 36,
  sleepersType: 'wood',
  isElectrified: false,
  hasBufferStop: true,
  bufferStopEnd: 'end'
});

// Level Crossing on Level Crossing Road (X = 12700)
// Tag intersecting tracks with isCrossing: true
tracks.forEach(t => {
  if (t.x1 <= 12720 && t.x2 >= 12680) {
    t.isCrossing = true;
    t.crossingRoadName = 'Степной переезд';
  }
});

map.railwayTracks = tracks;

// ==========================================
// 2. PASSENGER PLATFORMS (ПЛАТФОРМЫ ВОКЗАЛА)
// ==========================================
const platforms = [];

// Platform 1: Shore Platform in front of Station Building (Береговая платформа №1)
// Length 900px, width 32px. Between station building (Y=5690) and Track 3 (Y=5752)
platforms.push({
  id: 'platform_station_1',
  name: 'Пассажирская платформа №1 (Береговая)',
  x: 10650,
  y: 5706,
  width: 950,
  height: 32,
  platformNumber: 1,
  trackSide: 'south',
  hasCanopy: true,
  canopySegments: [
    { x: 10920, y: 5706, w: 380, h: 28 },
    { x: 11350, y: 5706, w: 180, h: 28 }
  ]
});

// Platform 2: Island Platform between Mainline 1 & Mainline 2 (Островная платформа №2)
// Length 920px, width 32px. Between Track 1 (Y=5792) and Track 2 (Y=5888)
platforms.push({
  id: 'platform_station_2',
  name: 'Пассажирская платформа №2 (Островная)',
  x: 10680,
  y: 5824,
  width: 920,
  height: 32,
  platformNumber: 2,
  trackSide: 'island',
  hasCanopy: true,
  canopySegments: [
    { x: 10900, y: 5824, w: 320, h: 28 },
    { x: 11280, y: 5824, w: 220, h: 28 }
  ]
});

map.railwayPlatforms = platforms;

// ==========================================
// 3. STATIC ROLLING STOCK (ПОЕЗДА И ВАГОНЫ)
// ==========================================
const rollingStock = [];

// Train 1: Passenger Train on Track 3 (Platform 1)
// Locomotive + 4 RZD passenger coaches
rollingStock.push({
  id: 'train_loco_1',
  name: 'Тепловоз ТЭП70БС-0245',
  type: 'locomotive_diesel_chme3',
  x: 11460,
  y: 5752,
  angle: 0,
  length: 68,
  width: 13,
  color: '#dc2626'
});

rollingStock.push({
  id: 'train_coach_1',
  name: 'Купейный вагон РЖД №01',
  type: 'passenger_coach_rzhd',
  x: 11355,
  y: 5752,
  angle: 0,
  length: 96,
  width: 13,
  livery: 'rzhd'
});

rollingStock.push({
  id: 'train_coach_2',
  name: 'Плацкартный вагон РЖД №02',
  type: 'passenger_coach_rzhd',
  x: 11252,
  y: 5752,
  angle: 0,
  length: 96,
  width: 13,
  livery: 'rzhd'
});

rollingStock.push({
  id: 'train_coach_3',
  name: 'Купейный вагон РЖД №03',
  type: 'passenger_coach_rzhd',
  x: 11149,
  y: 5752,
  angle: 0,
  length: 96,
  width: 13,
  livery: 'rzhd'
});

rollingStock.push({
  id: 'train_coach_4',
  name: 'Штабной вагон РЖД №04',
  type: 'passenger_coach_rzhd',
  x: 11046,
  y: 5752,
  angle: 0,
  length: 96,
  width: 13,
  livery: 'rzhd'
});

// Train 2: Freight Shunter & Wagons on Freight Siding 2 (Ramp)
rollingStock.push({
  id: 'train_freight_loco',
  name: 'Маневровый тепловоз ЧМЭ3-4812',
  type: 'locomotive_diesel_chme3',
  x: 10980,
  y: 6030,
  angle: 0,
  length: 66,
  width: 13,
  color: '#15803d'
});

rollingStock.push({
  id: 'train_freight_hopper_1',
  name: 'Полувагон 12-132 с щебнем',
  type: 'freight_hopper',
  x: 11060,
  y: 6030,
  angle: 0,
  length: 64,
  width: 13
});

rollingStock.push({
  id: 'train_freight_hopper_2',
  name: 'Полувагон 12-132 с углем',
  type: 'freight_hopper',
  x: 11130,
  y: 6030,
  angle: 0,
  length: 64,
  width: 13
});

rollingStock.push({
  id: 'train_freight_flatcar',
  name: 'Лесовозная платформа 13-4012 с лесом',
  type: 'freight_flatcar_timber',
  x: 11202,
  y: 6030,
  angle: 0,
  length: 66,
  width: 13
});

map.rollingStock = rollingStock;

// ==========================================
// 4. BUILDINGS (ЗДАНИЯ ВОКЗАЛА И КОМПЛЕКСА)
// ==========================================
const stationBuildings = [];

// Main Station Building: Вокзал «Станция Степная»
stationBuildings.push({
  id: 'bld_railway_station_stepnaya',
  name: 'Вокзал Станция Степная',
  nameRu: 'Вокзал «Станция Степная»',
  address: 'Привокзальная площадь, д. 1',
  x: 10960,
  y: 5580,
  width: 320,
  height: 110,
  type: 'railway_station',
  color: '#e2e8f0',       // Light neoclassical limestone
  roofColor: '#334155',   // Slate & copper roof
  accentColor: '#ca8a04', // Gold details
  floors: 2,
  entranceSide: 'north',
  entrances: [
    { x: 11120, y: 5580, side: 'north' },
    { x: 11060, y: 5690, side: 'south' },
    { x: 11180, y: 5690, side: 'south' }
  ]
});

// Freight Depot Warehouse: Грузовой пакгауз
stationBuildings.push({
  id: 'bld_railway_freight_depot',
  name: 'Грузовой склад ПЧ-12',
  nameRu: 'Грузовой пакгауз станции Степная',
  address: 'Пристанционный проезд, к. 3',
  x: 11280,
  y: 6055,
  width: 240,
  height: 60,
  type: 'railway_warehouse',
  color: '#78350f',       // Red-brown industrial brick
  roofColor: '#475569',
  accentColor: '#eab308',
  floors: 1,
  entranceSide: 'north',
  entrances: [
    { x: 11400, y: 6055, side: 'north' }
  ]
});

// Level Crossing Guard Cabin: Пост дежурного по переезду
stationBuildings.push({
  id: 'bld_railway_crossing_post',
  name: 'Пост дежурного по переезду',
  nameRu: 'Пост дежурного по переезду №42',
  address: 'Степной переезд, пост 42',
  x: 12725,
  y: 5700,
  width: 48,
  height: 38,
  type: 'railway_crossing_post',
  color: '#cbd5e1',
  roofColor: '#9a3412',
  accentColor: '#dc2626',
  floors: 1,
  entranceSide: 'west',
  entrances: [
    { x: 12725, y: 5718, side: 'west' }
  ]
});

// Signal Box / Electrical Interlocking Tower (Пост ЭЦ)
stationBuildings.push({
  id: 'bld_railway_signal_tower',
  name: 'Пост ЭЦ Станции Степная',
  nameRu: 'Пост электрической централизации (ЭЦ)',
  address: 'Привокзальная площадь, д. 1А',
  x: 10860,
  y: 5610,
  width: 70,
  height: 70,
  type: 'commercial',
  color: '#94a3b8',
  roofColor: '#1e293b',
  accentColor: '#38bdf8',
  floors: 3,
  entranceSide: 'north',
  entrances: [
    { x: 10895, y: 5610, side: 'north' }
  ]
});

map.buildings.push(...stationBuildings);

// ==========================================
// 5. ROADS & INTERSECTIONS (АВТОДОРОЖНАЯ СЕТЬ)
// ==========================================
const newRoads = [];
const newIntersections = [];

// Intersection 1: Highway M-12 & Привокзальное шоссе
newIntersections.push({
  id: 'inter_m12_station',
  x: 11110,
  y: 4000,
  width: 60,
  height: 60,
  connectedRoads: ['road_station_highway_main']
});

// Intersection 2: Station Forecourt North Junction (Въезд на Привокзальную площадь)
newIntersections.push({
  id: 'inter_station_north_entry',
  x: 11110,
  y: 5360,
  width: 50,
  height: 50,
  connectedRoads: [
    'road_station_highway_main',
    'road_station_loop_west',
    'road_station_loop_east',
    'road_station_cottage_link'
  ]
});

// Intersection 3: Cottage Road Link Junction
newIntersections.push({
  id: 'inter_station_cottage_turn',
  x: 10700,
  y: 4800,
  width: 44,
  height: 44,
  connectedRoads: ['road_station_cottage_link', 'road_station_cottage_east']
});

// Intersection 4: Connection with Cottage ул. Речная (at X=8000, Y=4800)
newIntersections.push({
  id: 'inter_rechnaya_station_link',
  x: 8000,
  y: 4800,
  width: 44,
  height: 44,
  connectedRoads: ['road_station_cottage_east']
});

// Intersection 5: Station Loop South Junction
newIntersections.push({
  id: 'inter_station_south_dropoff',
  x: 11110,
  y: 5540,
  width: 50,
  height: 50,
  connectedRoads: ['road_station_loop_west', 'road_station_loop_east', 'road_station_to_crossing']
});

// Intersection 6: Level Crossing North Approach Junction
newIntersections.push({
  id: 'inter_crossing_north_appr',
  x: 12700,
  y: 5540,
  width: 44,
  height: 44,
  connectedRoads: ['road_station_to_crossing', 'road_rail_crossing_main']
});

// ROAD 1: Привокзальное шоссе (Highway M-12 -> Station Square)
newRoads.push({
  id: 'road_station_highway_main',
  name: 'Привокзальное шоссе',
  nameRu: 'Привокзальное шоссе',
  x1: 11110,
  y1: 4000,
  x2: 11110,
  y2: 5360,
  direction: 'vertical',
  lanes: 2,
  speedLimit: 60,
  isMain: true,
  hasSidewalk: true,
  hasStreetLights: true
});

// ROAD 2: Connecting road from Cottage ул. Речная (X=8000, Y=4800) to X=10700, Y=4800
newRoads.push({
  id: 'road_station_cottage_east',
  name: 'Пристанционная улица',
  nameRu: 'Пристанционная улица',
  x1: 8000,
  y1: 4800,
  x2: 10700,
  y2: 4800,
  direction: 'horizontal',
  lanes: 2,
  speedLimit: 50,
  isMain: false,
  hasSidewalk: true,
  hasStreetLights: true
});

// ROAD 3: Link from X=10700, Y=4800 down to Station Square at X=11110, Y=5360
newRoads.push({
  id: 'road_station_cottage_link',
  name: 'Пристанционный проезд',
  nameRu: 'Пристанционный проезд',
  x1: 10700,
  y1: 4800,
  x2: 11110,
  y2: 5360,
  direction: 'vertical',
  lanes: 2,
  speedLimit: 50,
  isMain: false,
  hasSidewalk: true,
  hasStreetLights: true
});

// ROAD 4 & 5: Station Square Forecourt Loop (Разворотное кольцо площади)
newRoads.push({
  id: 'road_station_loop_west',
  name: 'Привокзальная площадь (Западный проезд)',
  nameRu: 'Привокзальная площадь (Западный проезд)',
  x1: 11110,
  y1: 5360,
  x2: 10980,
  y2: 5450,
  direction: 'vertical',
  lanes: 2,
  speedLimit: 30,
  isMain: false,
  hasSidewalk: true,
  hasStreetLights: true
});

newRoads.push({
  id: 'road_station_loop_west_south',
  name: 'Привокзальная площадь (Подъезд к вокзалу)',
  nameRu: 'Привокзальная площадь (Подъезд к вокзалу)',
  x1: 10980,
  y1: 5450,
  x2: 11110,
  y2: 5540,
  direction: 'horizontal',
  lanes: 2,
  speedLimit: 30,
  isMain: false,
  hasSidewalk: true,
  hasStreetLights: true
});

newRoads.push({
  id: 'road_station_loop_east',
  name: 'Привокзальная площадь (Восточный проезд / Стоянка такси)',
  nameRu: 'Привокзальная площадь (Восточный проезд / Стоянка такси)',
  x1: 11110,
  y1: 5360,
  x2: 11240,
  y2: 5450,
  direction: 'vertical',
  lanes: 2,
  speedLimit: 30,
  isMain: false,
  hasSidewalk: true,
  hasStreetLights: true
});

newRoads.push({
  id: 'road_station_loop_east_south',
  name: 'Привокзальная площадь (Выезд)',
  nameRu: 'Привокзальная площадь (Выезд)',
  x1: 11240,
  y1: 5450,
  x2: 11110,
  y2: 5540,
  direction: 'horizontal',
  lanes: 2,
  speedLimit: 30,
  isMain: false,
  hasSidewalk: true,
  hasStreetLights: true
});

// ROAD 6: Road from Station Square East to Level Crossing (X=11110, Y=5540 -> X=12700, Y=5540)
newRoads.push({
  id: 'road_station_to_crossing',
  name: 'Завокзальная улица',
  nameRu: 'Завокзальная улица',
  x1: 11110,
  y1: 5540,
  x2: 12700,
  y2: 5540,
  direction: 'horizontal',
  lanes: 2,
  speedLimit: 50,
  isMain: false,
  hasSidewalk: true,
  hasStreetLights: true
});

// ROAD 7: Степной переезд (Level Crossing across railway tracks from Y=5540 down to Y=6700)
newRoads.push({
  id: 'road_rail_crossing_main',
  name: 'Степной переезд',
  nameRu: 'Степной переезд',
  x1: 12700,
  y1: 5540,
  x2: 12700,
  y2: 6700,
  direction: 'vertical',
  lanes: 2,
  speedLimit: 40,
  isMain: true,
  hasSidewalk: false,
  hasStreetLights: true
});

map.roads.push(...newRoads);
map.intersections.push(...newIntersections);

// ==========================================
// 6. SIDEWALKS & PARKING (ПЕШЕХОДНЫЕ ЗОНЫ И ПАРКОВКИ)
// ==========================================
// Station Forecourt Esplanade Sidewalk
map.sidewalks.push({
  id: 'sw_station_forecourt_main',
  x: 10950,
  y: 5550,
  width: 340,
  height: 32,
  type: 'concrete'
});

// Central Park Circle in Station Square
map.sidewalks.push({
  id: 'sw_station_square_circle',
  x: 11040,
  y: 5410,
  width: 140,
  height: 80,
  type: 'stone'
});

// Passenger Parking on Station Square
const parkingSpots = [];
for (let i = 0; i < 12; i++) {
  parkingSpots.push({
    x: 11160 + (i % 6) * 16,
    y: 5400 + Math.floor(i / 6) * 32,
    angle: 0,
    isOccupied: i % 3 === 0
  });
}
map.parkings.push({
  id: 'parking_station_passengers',
  x: 11150,
  y: 5390,
  width: 110,
  height: 70,
  spots: parkingSpots
});

// ==========================================
// 7. STREET PROPS & RAILWAY EQUIPMENT
// ==========================================
const newProps = [];

// Railway Signals (Светофоры)
// Mainline Track 1 Western Entry Signal
newProps.push({
  id: 'prop_rail_signal_m1_entry',
  x: 9140,
  y: 5772,
  type: 'railway_signal',
  angle: 0
});

// Mainline Track 2 Eastern Entry Signal
newProps.push({
  id: 'prop_rail_signal_m2_entry',
  x: 12960,
  y: 5908,
  type: 'railway_signal',
  angle: Math.PI
});

// Platform 1 Exit Signal (Выходной светофор Ч1)
newProps.push({
  id: 'prop_rail_signal_p1_exit',
  x: 12660,
  y: 5734,
  type: 'railway_signal',
  angle: 0
});

// Platform 2 Exit Signal (Выходной светофор Н2)
newProps.push({
  id: 'prop_rail_signal_p2_exit',
  x: 10620,
  y: 5806,
  type: 'railway_signal',
  angle: Math.PI
});

// Switch Boxes (Электроприводы СП-6М)
newProps.push({
  id: 'prop_rail_switch_1',
  x: 9210,
  y: 5772,
  type: 'railway_switch_box',
  angle: 0
});

newProps.push({
  id: 'prop_rail_switch_2',
  x: 9410,
  y: 5906,
  type: 'railway_switch_box',
  angle: 0
});

newProps.push({
  id: 'prop_rail_switch_3',
  x: 10410,
  y: 5966,
  type: 'railway_switch_box',
  angle: 0
});

newProps.push({
  id: 'prop_rail_switch_4',
  x: 11810,
  y: 5734,
  type: 'railway_switch_box',
  angle: 0
});

// Level Crossing Equipment (Светофоры и шлагбаумы переезда)
newProps.push({
  id: 'prop_rail_cross_light_north',
  x: 12680,
  y: 5690,
  type: 'railway_crossing_light',
  angle: 0
});

newProps.push({
  id: 'prop_rail_cross_gate_north',
  x: 12682,
  y: 5698,
  type: 'railway_crossing_gate',
  angle: 0
});

newProps.push({
  id: 'prop_rail_cross_light_south',
  x: 12720,
  y: 6060,
  type: 'railway_crossing_light',
  angle: Math.PI
});

newProps.push({
  id: 'prop_rail_cross_gate_south',
  x: 12718,
  y: 6052,
  type: 'railway_crossing_gate',
  angle: Math.PI
});

// Buffer Stops (Путевые упоры на тупиках)
newProps.push({
  id: 'prop_rail_buffer_siding_1',
  x: 12450,
  y: 5712,
  type: 'railway_buffer_stop',
  angle: 0
});

newProps.push({
  id: 'prop_rail_buffer_siding_2',
  x: 12150,
  y: 6030,
  type: 'railway_buffer_stop',
  angle: 0
});

newProps.push({
  id: 'prop_rail_buffer_siding_3',
  x: 10120,
  y: 6010,
  type: 'railway_buffer_stop',
  angle: 0
});

// Platform Clocks and Station Signs
newProps.push({
  id: 'prop_rail_clock_station_facade',
  x: 11120,
  y: 5576,
  type: 'railway_clock',
  angle: 0
});

newProps.push({
  id: 'prop_rail_clock_platform_1',
  x: 11120,
  y: 5704,
  type: 'railway_clock',
  angle: 0
});

newProps.push({
  id: 'prop_rail_sign_platform_1',
  x: 10900,
  y: 5710,
  type: 'railway_platform_sign',
  angle: 0
});

newProps.push({
  id: 'prop_rail_sign_platform_2',
  x: 10950,
  y: 5828,
  type: 'railway_platform_sign',
  angle: 0
});

// Picket Kilometer Posts (ПК) along the main line
for (let px = 8000; px <= 16000; px += 800) {
  newProps.push({
    id: `prop_rail_picket_${px}`,
    x: px,
    y: 5768,
    type: 'railway_picket_post',
    angle: 0
  });
}

// Station Square Lamps & Benches
for (let lx = 10960; lx <= 11280; lx += 40) {
  newProps.push({
    id: `prop_station_lamp_sq_${lx}`,
    x: lx,
    y: 5546,
    type: 'lamp',
    angle: 0
  });
}

for (let bx = 11050; bx <= 11170; bx += 30) {
  newProps.push({
    id: `prop_station_bench_sq_${bx}`,
    x: bx,
    y: 5542,
    type: 'bench',
    angle: 0
  });
}

// Highway M-12 & Привокзальное шоссе Lampposts
for (let ly = 4050; ly <= 5300; ly += 90) {
  newProps.push({
    id: `prop_station_highway_lamp_${ly}`,
    x: 11090,
    y: ly,
    type: 'lamp_highway',
    angle: 0
  });
}

map.props.push(...newProps);

// Save updated map to public/map.json
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));

console.log('Successfully injected Railway Network & Station Complex!');
console.log('Updated Map stats:');
console.log('Railway Tracks:', map.railwayTracks.length);
console.log('Railway Platforms:', map.railwayPlatforms.length);
console.log('Rolling Stock:', map.rollingStock.length);
console.log('Roads:', map.roads.length);
console.log('Intersections:', map.intersections.length);
console.log('Buildings:', map.buildings.length);
console.log('Props:', map.props.length);

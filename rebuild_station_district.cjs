const fs = require('fs');

const mapPath = 'public/map.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('--- REBUILDING RAILWAY STATION DISTRICT & SQUARE ---');

// 1. Remove orphaned old station assets from legacy y: 5200..5600 area
const oldPropsToRemove = new Set([
  'prop_station_lamp_sq_10960',
  'prop_station_lamp_sq_11000',
  'prop_station_lamp_sq_11040',
  'prop_station_lamp_sq_11080',
  'prop_station_lamp_sq_11120',
  'prop_station_lamp_sq_11160',
  'prop_station_lamp_sq_11200',
  'prop_station_lamp_sq_11240',
  'prop_station_lamp_sq_11280',
  'prop_station_bench_sq_11050',
  'prop_station_bench_sq_11080',
  'prop_station_bench_sq_11110',
  'prop_station_bench_sq_11140',
  'prop_station_bench_sq_11170'
]);

map.props = map.props.filter(p => !oldPropsToRemove.has(p.id) && !p.id.startsWith('prop_station_highway_lamp_') && !p.id.startsWith('prop_station_sq_'));
map.parkings = map.parkings.filter(p => p.id !== 'parking_station_passengers' && !p.id.startsWith('parking_station_'));
map.sidewalks = map.sidewalks.filter(s => s.id !== 'sw_station_forecourt_main' && s.id !== 'sw_station_square_circle' && !s.id.startsWith('sw_station_'));
map.intersections = map.intersections.filter(i => i.id !== 'inter_station_north_entry' && i.id !== 'inter_station_south_dropoff' && !i.id.startsWith('inter_station_'));

// 2. Configure Roads
const stationRoadIds = new Set([
  'road_station_highway_main',
  'road_station_cottage_east',
  'road_station_square_loop_west',
  'road_station_square_front',
  'road_station_square_loop_east',
  'road_station_square_west_wing',
  'road_station_square_east_wing',
  'road_station_square_west_south',
  'road_station_square_east_south',
  'road_station_to_crossing',
  'road_rail_crossing_main',
  'road_station_freight_access',
  'road_cottage_south_station_link'
]);

map.roads = map.roads.filter(r => !stationRoadIds.has(r.id));

const newRoads = [
  // 1. Main Station Avenue (4-lane grand approach aligned to station axis X = 11180)
  {
    id: 'road_station_highway_main',
    name: 'Привокзальный проспект (Магистральный подъезд к станции)',
    x1: 11180,
    y1: 4000,
    x2: 11180,
    y2: 7500,
    width: 140,
    lanes: 4,
    isAvenue: true,
    isDirt: false,
    isGravel: false,
    direction: 'vertical',
    speedLimit: 70
  },
  // 2. Link from Cottage Settlement east to Station Avenue
  {
    id: 'road_station_cottage_east',
    name: 'Пристанционная улица (Северный выезд из посёлка)',
    x1: 8000,
    y1: 4700,
    x2: 11180,
    y2: 4700,
    width: 80,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal',
    speedLimit: 60
  },
  // 3. Station Square Northern Distributor - West Arm
  {
    id: 'road_station_square_west_wing',
    name: 'Привокзальная площадь (Северный западный проезд)',
    x1: 10480,
    y1: 7500,
    x2: 11180,
    y2: 7500,
    width: 100,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal',
    speedLimit: 50
  },
  // 4. Station Square Northern Distributor - East Arm
  {
    id: 'road_station_square_east_wing',
    name: 'Привокзальная площадь (Северный восточный проезд)',
    x1: 11180,
    y1: 7500,
    x2: 11880,
    y2: 7500,
    width: 100,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal',
    speedLimit: 50
  },
  // 5. Station Square West Flank (Access to West Parking and Cottage Link)
  {
    id: 'road_station_square_west_south',
    name: 'Привокзальная площадь (Западный проезд к парковке)',
    x1: 10480,
    y1: 7500,
    x2: 10480,
    y2: 7880,
    width: 100,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'vertical',
    speedLimit: 40
  },
  // 6. Station Square East Flank (Access to East Parking and Rail Crossing)
  {
    id: 'road_station_square_east_south',
    name: 'Привокзальная площадь (Восточный проезд)',
    x1: 11880,
    y1: 7500,
    x2: 11880,
    y2: 7880,
    width: 100,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'vertical',
    speedLimit: 40
  },
  // 7. Station Square Main Boulevard & Passenger Drop-off / Kiss-and-Ride / Taxi
  {
    id: 'road_station_square_front',
    name: 'Привокзальная площадь (Парадный проезд и зона высадки)',
    x1: 10480,
    y1: 7880,
    x2: 11880,
    y2: 7880,
    width: 100,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal',
    speedLimit: 30
  },
  // 8. Cottage South Link Road
  {
    id: 'road_cottage_south_station_link',
    name: 'Южный пристанционный тракт (Связка с посёлком)',
    x1: 8000,
    y1: 8000,
    x2: 10480,
    y2: 8000,
    width: 96,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal',
    speedLimit: 60
  },
  // 9. West Short Connector between 7880 and 8000
  {
    id: 'road_station_west_connector',
    name: 'Западный съезд привокзальной площади',
    x1: 10480,
    y1: 7880,
    x2: 10480,
    y2: 8000,
    width: 96,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'vertical',
    speedLimit: 40
  },
  // 10. Road east to railway crossing
  {
    id: 'road_station_to_crossing',
    name: 'Завокзальная улица (Подъезд к переезду)',
    x1: 11880,
    y1: 7880,
    x2: 12600,
    y2: 8200,
    width: 100,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    speedLimit: 60
  },
  // 11. Railway crossing road across the tracks
  {
    id: 'road_rail_crossing_main',
    name: 'Степной переезд №42',
    x1: 12600,
    y1: 8200,
    x2: 12600,
    y2: 9460,
    width: 110,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'vertical',
    speedLimit: 40
  },
  // 12. Freight warehouse / depot access road south of the tracks
  {
    id: 'road_station_freight_access',
    name: 'Грузовой проезд к пакгаузу ПЧ-12',
    x1: 11150,
    y1: 9460,
    x2: 12600,
    y2: 9460,
    width: 90,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal',
    speedLimit: 40
  }
];

map.roads.push(...newRoads);

// 3. Configure Intersections
const newIntersections = [
  {
    id: 'inter_m12_station',
    x: 11180,
    y: 4000,
    width: 140,
    height: 140,
    type: '3way',
    hasLights: true,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_cottage_turn',
    x: 11180,
    y: 4700,
    width: 140,
    height: 100,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_square_main',
    x: 11180,
    y: 7500,
    width: 140,
    height: 140,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_square_nw',
    x: 10480,
    y: 7500,
    width: 100,
    height: 100,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_square_ne',
    x: 11880,
    y: 7500,
    width: 100,
    height: 100,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_square_sw',
    x: 10480,
    y: 7880,
    width: 100,
    height: 100,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_square_se',
    x: 11880,
    y: 7880,
    width: 100,
    height: 100,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_cottage_south_junc',
    x: 10480,
    y: 8000,
    width: 96,
    height: 96,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_crossing_north',
    x: 12600,
    y: 8200,
    width: 110,
    height: 110,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  },
  {
    id: 'inter_station_freight_junc',
    x: 12600,
    y: 9460,
    width: 110,
    height: 110,
    type: '3way',
    hasLights: false,
    currentPhaseIndex: 0,
    phaseTimer: 0,
    phases: [],
    stopLines: [],
    crosswalks: []
  }
];

map.intersections.push(...newIntersections);

// 4. Create Sidewalks & Pedestrian Plaza (Эспланада и площадь)
const newSidewalks = [
  // 1. Grand Station Forecourt Esplanade (Парадная привокзальная эспланада)
  {
    id: 'sw_station_grand_esplanade',
    x: 10700,
    y: 7930,
    width: 960,
    height: 310,
    sidewalkWidth: 36,
    style: 'tile',
    innerLawnColor: '#15803d',
    driveways: [],
    walkways: [
      // Central Grand Portal Promenade (towards station doors at 11180, 8240)
      { x: 11140, y: 7930, width: 80, height: 310, style: 'tile' },
      // Horizontal Cross Promenade
      { x: 10700, y: 8060, width: 960, height: 40, style: 'tile' },
      // West Approach Walkway
      { x: 10840, y: 7930, width: 30, height: 310, style: 'tile' },
      // East Approach Walkway
      { x: 11500, y: 7930, width: 30, height: 310, style: 'tile' }
    ],
    plazas: [
      // Central monument & fountain plaza
      { x: 11100, y: 8000, width: 160, height: 160, shape: 'circle', style: 'tile' },
      // West decorative garden plaza
      { x: 10760, y: 7960, width: 260, height: 250, shape: 'rect', style: 'tile' },
      // East decorative garden plaza
      { x: 11360, y: 7960, width: 260, height: 250, shape: 'rect', style: 'tile' }
    ]
  },
  // 2. West Parking Pedestrian Perimeter & Walkways
  {
    id: 'sw_station_west_parking_walk',
    x: 10220,
    y: 7530,
    width: 480,
    height: 360,
    sidewalkWidth: 28,
    style: 'urban',
    innerLawnColor: '#166534',
    walkways: [
      { x: 10560, y: 7530, width: 140, height: 28, style: 'urban' },
      { x: 10560, y: 7862, width: 140, height: 28, style: 'urban' }
    ],
    plazas: []
  },
  // 3. East Parking Pedestrian Perimeter & Walkways
  {
    id: 'sw_station_east_parking_walk',
    x: 11660,
    y: 7530,
    width: 480,
    height: 360,
    sidewalkWidth: 28,
    style: 'urban',
    innerLawnColor: '#166534',
    walkways: [
      { x: 11660, y: 7530, width: 140, height: 28, style: 'urban' },
      { x: 11660, y: 7862, width: 140, height: 28, style: 'urban' }
    ],
    plazas: []
  },
  // 4. Main Avenue West Sidewalk
  {
    id: 'sw_station_avenue_west',
    x: 11090,
    y: 4700,
    width: 20,
    height: 2800,
    sidewalkWidth: 20,
    style: 'urban'
  },
  // 5. Main Avenue East Sidewalk
  {
    id: 'sw_station_avenue_east',
    x: 11250,
    y: 4700,
    width: 20,
    height: 2800,
    sidewalkWidth: 20,
    style: 'urban'
  }
];

map.sidewalks.push(...newSidewalks);

// 5. Create Parkings (West Passenger Parking, East Staff/Long-term Parking, Freight Logistics Yard)
function generateParkingSpots(startX, startY, count, spacing, angle, openSide, isHandicapFirst = false) {
  const spots = [];
  for (let i = 0; i < count; i++) {
    spots.push({
      id: `spot_${startX}_${startY}_${i}`,
      x: startX + i * spacing,
      y: startY,
      angle: angle,
      width: 38,
      length: 54,
      openSide: openSide,
      isHandicap: isHandicapFirst && i < 2,
      occupied: Math.random() > 0.45
    });
  }
  return spots;
}

const westSpots = [
  // North row (facing south)
  ...generateParkingSpots(10270, 7580, 9, 44, 0, 'south', true),
  // Middle double row (aisle at y=7690..7730)
  ...generateParkingSpots(10270, 7670, 9, 44, Math.PI, 'north', false),
  ...generateParkingSpots(10270, 7750, 9, 44, 0, 'south', false),
  // South row (facing north)
  ...generateParkingSpots(10270, 7840, 9, 44, Math.PI, 'north', false)
];

const eastSpots = [
  // North row (facing south)
  ...generateParkingSpots(11710, 7580, 9, 44, 0, 'south', false),
  // Middle double row
  ...generateParkingSpots(11710, 7670, 9, 44, Math.PI, 'north', false),
  ...generateParkingSpots(11710, 7750, 9, 44, 0, 'south', false),
  // South row (facing north)
  ...generateParkingSpots(11710, 7840, 9, 44, Math.PI, 'north', false)
];

const freightSpots = [
  // Heavy truck loading berths along freight warehouse
  { id: 'spot_freight_1', x: 11250, y: 9380, angle: 0, width: 50, length: 75, openSide: 'south', occupied: true },
  { id: 'spot_freight_2', x: 11330, y: 9380, angle: 0, width: 50, length: 75, openSide: 'south', occupied: false },
  { id: 'spot_freight_3', x: 11410, y: 9380, angle: 0, width: 50, length: 75, openSide: 'south', occupied: true },
  { id: 'spot_freight_4', x: 11490, y: 9380, angle: 0, width: 50, length: 75, openSide: 'south', occupied: false },
  { id: 'spot_freight_5', x: 11570, y: 9380, angle: 0, width: 50, length: 75, openSide: 'south', occupied: false }
];

const newParkings = [
  // 1. West Main Passenger Parking
  {
    id: 'parking_station_passengers_west',
    name: 'Главная парковка ст. Степная (Краткосрочная и Долгосрочная)',
    x: 10240,
    y: 7550,
    width: 440,
    height: 320,
    spots: westSpots,
    arrows: [
      { x: 10630, y: 7625, angle: Math.PI, type: 'straight' },
      { x: 10300, y: 7625, angle: Math.PI / 2, type: 'left' },
      { x: 10300, y: 7710, angle: 0, type: 'straight' },
      { x: 10630, y: 7710, angle: -Math.PI / 2, type: 'right' },
      { x: 10630, y: 7795, angle: Math.PI, type: 'straight' }
    ]
  },
  // 2. East Railway Service & Taxi Pool Parking
  {
    id: 'parking_station_passengers_east',
    name: 'Служебная парковка РЖД и накопитель такси',
    x: 11680,
    y: 7550,
    width: 440,
    height: 320,
    spots: eastSpots,
    arrows: [
      { x: 11720, y: 7625, angle: 0, type: 'straight' },
      { x: 12050, y: 7625, angle: -Math.PI / 2, type: 'right' },
      { x: 12050, y: 7710, angle: Math.PI, type: 'straight' },
      { x: 11720, y: 7710, angle: Math.PI / 2, type: 'left' },
      { x: 11720, y: 7795, angle: 0, type: 'straight' }
    ]
  },
  // 3. Freight Depot Logistics Yard
  {
    id: 'parking_station_freight_depot',
    name: 'Грузовой терминал и зона погрузки ПЧ-12',
    x: 11200,
    y: 9340,
    width: 500,
    height: 180,
    spots: freightSpots,
    arrows: [
      { x: 11620, y: 9460, angle: Math.PI, type: 'straight' },
      { x: 11300, y: 9460, angle: 0, type: 'straight' }
    ]
  }
];

map.parkings.push(...newParkings);

// 6. Create Street Furniture, Lighting, Benches, Flowerbeds, Signage & Props
const newProps = [];

// Avenue street lamps along X=11100 and X=11260
for (let y = 4060; y <= 7460; y += 100) {
  newProps.push({
    id: `prop_station_ave_lamp_w_${y}`,
    x: 11100,
    y: y,
    type: 'lamp_highway',
    rotation: 0
  });
  newProps.push({
    id: `prop_station_ave_lamp_e_${y}`,
    x: 11260,
    y: y,
    type: 'lamp_highway',
    rotation: Math.PI
  });
}

// Station Esplanade Ornamental Lamps (Grand classical lanterns)
const esplanadeLampCoords = [
  // Along drop-off sidewalk (y = 7945)
  [10720, 7945], [10820, 7945], [10920, 7945], [11020, 7945], [11120, 7945], [11240, 7945], [11340, 7945], [11440, 7945], [11540, 7945], [11640, 7945],
  // Along central portal walkway
  [11130, 8020], [11230, 8020], [11130, 8100], [11230, 8100], [11130, 8180], [11230, 8180],
  // Along facade promenade (y = 8225)
  [10820, 8225], [10940, 8225], [11060, 8225], [11300, 8225], [11420, 8225], [11540, 8225]
];

esplanadeLampCoords.forEach(([x, y], idx) => {
  newProps.push({
    id: `prop_station_esp_lamp_${idx}`,
    x: x,
    y: y,
    type: 'lamp',
    rotation: 0
  });
});

// Classical Park Benches along the esplanade
const benchCoords = [
  // West garden benches
  [10780, 8000], [10860, 8000], [10940, 8000], [10780, 8120], [10860, 8120], [10940, 8120],
  // East garden benches
  [11420, 8000], [11500, 8000], [11580, 8000], [11420, 8120], [11500, 8120], [11580, 8120],
  // Central portal benches
  [11115, 8050], [11245, 8050], [11115, 8140], [11245, 8140]
];

benchCoords.forEach(([x, y], idx) => {
  newProps.push({
    id: `prop_station_bench_${idx}`,
    x: x,
    y: y,
    type: 'bench',
    rotation: x < 11180 ? 0 : Math.PI
  });
});

// Flowerbeds on Esplanade
const flowerbedCoords = [
  [10820, 8060], [10900, 8060], [11460, 8060], [11540, 8060],
  [11100, 7960], [11260, 7960]
];
flowerbedCoords.forEach(([x, y], idx) => {
  newProps.push({
    id: `prop_station_flowerbed_${idx}`,
    x: x,
    y: y,
    type: 'flowerbed',
    rotation: 0
  });
});

// Litter Bins along the esplanade
const trashCoords = [
  [10770, 8010], [10950, 8010], [11410, 8010], [11590, 8010],
  [11110, 8060], [11250, 8060], [11110, 8150], [11250, 8150],
  [11160, 8225], [11200, 8225]
];
trashCoords.forEach(([x, y], idx) => {
  newProps.push({
    id: `prop_station_trash_${idx}`,
    x: x,
    y: y,
    type: 'trash_can',
    rotation: 0
  });
});

// Bus Stop Pavilion at (11480, 7925)
newProps.push({
  id: 'prop_station_bus_stop_main',
  x: 11480,
  y: 7925,
  type: 'bus_stop',
  rotation: 0,
  name: 'Остановка «Вокзал Станция Степная»'
});

// News / Ticket Kiosk at (10880, 7950)
newProps.push({
  id: 'prop_station_kiosk_press',
  x: 10880,
  y: 7950,
  type: 'kiosk',
  rotation: 0,
  name: 'Киоск «Печать и Сувениры»'
});

// Information Pillar / Monument at center of esplanade (11180, 8080)
newProps.push({
  id: 'prop_station_central_clock_monument',
  x: 11180,
  y: 8080,
  type: 'village_well', // clean stone monument pedestal
  rotation: 0,
  name: 'Памятный обелиск первостроителям Степной магистрали'
});

// Parking Lot Floodlight Poles (West and East Parkings)
const parkingLamps = [
  [10250, 7560], [10450, 7560], [10670, 7560],
  [10250, 7860], [10450, 7860], [10670, 7860],
  [11690, 7560], [11890, 7560], [12110, 7560],
  [11690, 7860], [11890, 7860], [12110, 7860]
];
parkingLamps.forEach(([x, y], idx) => {
  newProps.push({
    id: `prop_station_pk_lamp_${idx}`,
    x: x,
    y: y,
    type: 'lamp_concrete',
    rotation: 0
  });
});

// Freight Depot Props (Pallets, Floodlights, Dumpster)
newProps.push(
  { id: 'prop_freight_floodlight_1', x: 11210, y: 9350, type: 'industrial_floodlight', rotation: 0 },
  { id: 'prop_freight_floodlight_2', x: 11700, y: 9350, type: 'industrial_floodlight', rotation: 0 },
  { id: 'prop_freight_pallets_1', x: 11240, y: 9360, type: 'pallet_stack', rotation: 0 },
  { id: 'prop_freight_pallets_2', x: 11600, y: 9360, type: 'pallet_stack', rotation: 0 },
  { id: 'prop_freight_dumpster', x: 11680, y: 9480, type: 'dumpster', rotation: 0 }
);

map.props.push(...newProps);

// 7. Add Parked Vehicles in the New Station Parking
const newVehicles = [
  // Taxi waiting at drop-off / taxi rank
  {
    id: 'veh_station_taxi_queue',
    type: 'taxi',
    x: 10920,
    y: 7890,
    angle: 0,
    speed: 0,
    color: '#eab308',
    isParked: true
  },
  // Bus waiting at the bus stop
  {
    id: 'veh_station_bus_waiting',
    type: 'bus',
    x: 11480,
    y: 7890,
    angle: 0,
    speed: 0,
    color: '#0284c7',
    isParked: true
  },
  // Civilian parked cars in West Parking
  {
    id: 'veh_station_pk_car_1',
    type: 'sedan_compact',
    x: 10358,
    y: 7580,
    angle: 0,
    speed: 0,
    color: '#dc2626',
    isParked: true
  },
  {
    id: 'veh_station_pk_car_2',
    type: 'crossover_compact',
    x: 10446,
    y: 7580,
    angle: 0,
    speed: 0,
    color: '#475569',
    isParked: true
  },
  {
    id: 'veh_station_pk_car_3',
    type: 'hatch_samara',
    x: 10402,
    y: 7670,
    angle: Math.PI,
    speed: 0,
    color: '#16a34a',
    isParked: true
  },
  {
    id: 'veh_station_pk_car_4',
    type: 'sedan_accent',
    x: 10490,
    y: 7750,
    angle: 0,
    speed: 0,
    color: '#2563eb',
    isParked: true
  },
  // Service vehicle in East Parking
  {
    id: 'veh_station_pk_service_wagon',
    type: 'wagon_modern',
    x: 11754,
    y: 7580,
    angle: 0,
    speed: 0,
    color: '#334155',
    isParked: true
  },
  // Delivery truck at Freight Depot loading bay
  {
    id: 'veh_station_freight_truck',
    type: 'truck_box',
    x: 11250,
    y: 9380,
    angle: 0,
    speed: 0,
    color: '#b45309',
    isParked: true
  }
];

// Remove any existing test vehicles with these ids
const newVehIds = new Set(newVehicles.map(v => v.id));
map.vehicles = map.vehicles.filter(v => !newVehIds.has(v.id));
map.vehicles.push(...newVehicles);

// Write back to public/map.json
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');

console.log('--- REBUILD COMPLETE ---');
console.log('Total buildings:', map.buildings.length);
console.log('Total roads:', map.roads.length);
console.log('Total parkings:', map.parkings.length);
console.log('Total sidewalks:', map.sidewalks.length);
console.log('Total props:', map.props.length);
console.log('Total intersections:', map.intersections.length);
console.log('Total vehicles:', map.vehicles.length);

// Script to build the continuous transcontinental railway and relocate Station Stepnaya to the open steppe
const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('--- RELOCATING STATION STEPNAYA TO OPEN STEPPE & EXTENDING TO WORLD EDGES ---');

const DELTA_Y = 3000;

// Helper for Bezier curve points
function computeBezierPoints(x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2, steps = 30) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * x1 + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * x2;
    const y = mt * mt * mt * y1 + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * y2;
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }
  return pts;
}

// 1. UPDATE BUILDINGS
map.buildings = map.buildings.map(b => {
  if (b.id === 'bld_railway_station_stepnaya') {
    return {
      ...b,
      x: 10800,
      y: 8240,
      width: 760,
      height: 220,
      entranceX: 11180,
      entranceY: 8460, // Leads straight to Platform 1
      secondEntranceX: 11180,
      secondEntranceY: 8240 // Leads from Station Square
    };
  }
  if (b.id === 'bld_railway_freight_depot') {
    return {
      ...b,
      x: 11200,
      y: 9220,
      width: 520,
      height: 120,
      entranceX: 11460,
      entranceY: 9220
    };
  }
  if (b.id === 'bld_crossing_post_steppe_14km') {
    return {
      ...b,
      x: 12650,
      y: 8600,
      width: 52,
      height: 42
    };
  }
  return b;
});

// 2. UPDATE PLATFORMS
map.railwayPlatforms = [
  {
    id: 'platform_station_1',
    name: 'Пассажирская платформа №1 (Береговая у вокзала)',
    x: 10000,
    y: 8460,
    width: 2500,
    height: 110,
    platformNumber: 1,
    trackSide: 'north',
    hasCanopy: true,
    canopySegments: [
      { x: 10800, y: 8470, w: 500, h: 40 },
      { x: 11500, y: 8470, w: 300, h: 40 }
    ]
  },
  {
    id: 'platform_station_2',
    name: 'Пассажирская платформа №2 (Островная, между Главным I и Главным II)',
    x: 10100,
    y: 8770,
    width: 2400,
    height: 80,
    platformNumber: 2,
    trackSide: 'island',
    hasCanopy: true,
    canopySegments: [
      { x: 10800, y: 8780, w: 450, h: 36 },
      { x: 11450, y: 8780, w: 350, h: 36 }
    ]
  },
  {
    id: 'platform_freight_ramp',
    name: 'Грузовая платформа пакгауза',
    x: 10900,
    y: 9050,
    width: 1400,
    height: 90,
    platformNumber: 3,
    trackSide: 'south',
    hasCanopy: false
  }
];

// 3. CONTINUOUS TRANSCONTINENTAL RAILWAY TRACKS (EXTENDING TO WORLD EDGES X = -2000 to X = 54000)
const newTracks = [
  // --- MAIN TRACK I (Главный путь I, нечетный сквозной, Y = 8740) ---
  {
    id: 'rail_main_1_west',
    name: 'Главный путь I (Западный трансконтинентальный перегон, выход за карту)',
    x1: -2000,
    y1: 8740,
    x2: 9100,
    y2: 8740,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_1_station',
    name: 'Главный путь I (Станционная секция ст. Степная, Островная платформа)',
    x1: 9100,
    y1: 8740,
    x2: 13400,
    y2: 8740,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_1_east',
    name: 'Главный путь I (Восточный степной магистральный перегон, выход за карту)',
    x1: 13400,
    y1: 8740,
    x2: 54000,
    y2: 8740,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },

  // --- MAIN TRACK II (Главный путь II, четный сквозной, Y = 8880) ---
  {
    id: 'rail_main_2_west',
    name: 'Главный путь II (Западный трансконтинентальный перегон, выход за карту)',
    x1: -2000,
    y1: 8880,
    x2: 9100,
    y2: 8880,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_2_station',
    name: 'Главный путь II (Станционная секция ст. Степная, Островная платформа)',
    x1: 9100,
    y1: 8880,
    x2: 13400,
    y2: 8880,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_2_east',
    name: 'Главный путь II (Восточный степной магистральный перегон, выход за карту)',
    x1: 13400,
    y1: 8880,
    x2: 54000,
    y2: 8880,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },

  // --- NORTH STATION TRACK 3 (Путь 3, береговая пассажирская платформа, Y = 8600) ---
  {
    id: 'rail_bezier_turnout_track3_west',
    name: 'Стрелочный перевод №1 (Главный I -> Путь 3, Западная горловина)',
    x1: 9100,
    y1: 8740,
    x2: 9600,
    y2: 8600,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(9100, 8740, 9300, 8740, 9420, 8600, 9600, 8600)
  },
  {
    id: 'rail_track_3_platform',
    name: 'Путь 3 (Приемо-отправочный пассажирский, Платформа №1)',
    x1: 9600,
    y1: 8600,
    x2: 12900,
    y2: 8600,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_bezier_turnout_track3_east',
    name: 'Стрелочный перевод №3 (Путь 3 -> Главный I, Восточная горловина)',
    x1: 12900,
    y1: 8600,
    x2: 13400,
    y2: 8740,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(12900, 8600, 13080, 8600, 13200, 8740, 13400, 8740)
  },

  // --- SOUTH STATION TRACK 4 (Путь 4, южный приемо-отправочный, Y = 9020) ---
  {
    id: 'rail_bezier_turnout_track4_west',
    name: 'Стрелочный перевод №2 (Главный II -> Путь 4, Западная горловина)',
    x1: 9100,
    y1: 8880,
    x2: 9600,
    y2: 9020,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(9100, 8880, 9300, 8880, 9420, 9020, 9600, 9020)
  },
  {
    id: 'rail_track_4_station',
    name: 'Путь 4 (Южный приемо-отправочный грузопассажирский)',
    x1: 9600,
    y1: 9020,
    x2: 12900,
    y2: 9020,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_bezier_turnout_track4_east',
    name: 'Стрелочный перевод №4 (Путь 4 -> Главный II, Восточная горловина)',
    x1: 12900,
    y1: 9020,
    x2: 13400,
    y2: 8880,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(12900, 9020, 13080, 9020, 13200, 8880, 13400, 8880)
  },

  // --- CROSSOVERS (Межпутные съезды) ---
  {
    id: 'rail_bezier_crossover_west',
    name: 'Западный съезд №5/6 (Главный I <-> Главный II)',
    x1: 8600,
    y1: 8740,
    x2: 9000,
    y2: 8880,
    trackType: 'crossover',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(8600, 8740, 8760, 8740, 8840, 8880, 9000, 8880)
  },
  {
    id: 'rail_bezier_crossover_east',
    name: 'Восточный съезд №7/8 (Главный II <-> Главный I)',
    x1: 13500,
    y1: 8880,
    x2: 13900,
    y2: 8740,
    trackType: 'crossover',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(13500, 8880, 13660, 8880, 13740, 8740, 13900, 8740)
  },

  // --- FREIGHT SIDING (Погрузочный путь у пакгауза, Y = 9180) ---
  {
    id: 'rail_bezier_siding_freight_curve',
    name: 'Стрелочный перевод погрузочного пути (Путь 4 -> Пакгауз)',
    x1: 10600,
    y1: 9020,
    x2: 11000,
    y2: 9180,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 80,
    sleepersType: 'wood',
    isElectrified: false,
    curvePoints: computeBezierPoints(10600, 9020, 10760, 9020, 10840, 9180, 11000, 9180)
  },
  {
    id: 'rail_siding_freight_ramp',
    name: 'Погрузочно-выгрузочный путь пакгауза станции Степная',
    x1: 11000,
    y1: 9180,
    x2: 12500,
    y2: 9180,
    trackType: 'deadend',
    gauge: 34,
    ballastWidth: 80,
    sleepersType: 'wood',
    isElectrified: false,
    hasBufferStop: true,
    bufferStopEnd: 'end'
  }
];

// Mark crossings
newTracks.forEach(t => {
  // Station Crossing X = 12600
  if ((t.x1 <= 12620 && t.x2 >= 12580) || (t.x2 <= 12620 && t.x1 >= 12580)) {
    t.isCrossing = true;
    t.crossingRoadName = 'Степной переезд №42';
  }
  // Canyon Crossing X = 24000
  if ((t.x1 <= 24020 && t.x2 >= 23980) || (t.x2 <= 24020 && t.x1 >= 23980)) {
    t.isCrossing = true;
    t.crossingRoadName = 'Каньонный железнодорожный переезд';
  }
  // Dunes Crossing X = 33700
  if ((t.x1 <= 33950 && t.x2 >= 33500) || (t.x2 <= 33950 && t.x1 >= 33500)) {
    t.isCrossing = true;
    t.crossingRoadName = 'Барханный железнодорожный переезд';
  }
  // East Border Crossing X = 48580
  if ((t.x1 <= 48600 && t.x2 >= 48560) || (t.x2 <= 48600 && t.x1 >= 48560)) {
    t.isCrossing = true;
    t.crossingRoadName = 'Пограничный переезд «Восточный»';
  }
});

map.railwayTracks = newTracks;

// 4. ROADS & INFRASTRUCTURE
// Update / extend roads to reach the new station location
map.roads = map.roads.filter(r => {
  if (r.id === 'road_station_highway_main' ||
      r.id === 'road_station_square_loop_west' ||
      r.id === 'road_station_square_front' ||
      r.id === 'road_station_square_loop_east' ||
      r.id === 'road_station_to_crossing' ||
      r.id === 'road_rail_crossing_main' ||
      r.id === 'road_cottage_south_station_link') {
    return false;
  }
  return true;
});

// Add updated station road network
map.roads.push(
  // Привокзальное шоссе (Магистральный подъезд к станции от М-12)
  {
    id: 'road_station_highway_main',
    name: 'Привокзальное шоссе (Магистральный подъезд к станции)',
    x1: 11280,
    y1: 4000,
    x2: 11280,
    y2: 8120,
    width: 140,
    lanes: 2,
    isAvenue: true,
    isDirt: false,
    isGravel: false,
    direction: 'vertical'
  },
  // Привокзальная площадь (Западный полукруг)
  {
    id: 'road_station_square_loop_west',
    name: 'Привокзальная площадь (Западный полукруг)',
    x1: 11280,
    y1: 8120,
    x2: 10920,
    y2: 8200,
    width: 120,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal'
  },
  // Привокзальная площадь (Парадный проезд перед вокзалом)
  {
    id: 'road_station_square_front',
    name: 'Привокзальная площадь (Парадный проезд перед вокзалом)',
    x1: 10920,
    y1: 8200,
    x2: 11640,
    y2: 8200,
    width: 130,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal'
  },
  // Привокзальная площадь (Восточный выезд)
  {
    id: 'road_station_square_loop_east',
    name: 'Привокзальная площадь (Восточный выезд)',
    x1: 11640,
    y1: 8200,
    x2: 11280,
    y2: 8120,
    width: 120,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal'
  },
  // Завокзальная улица (Подъезд к переезду)
  {
    id: 'road_station_to_crossing',
    name: 'Завокзальная улица (Подъезд к переезду)',
    x1: 11640,
    y1: 8200,
    x2: 12600,
    y2: 8200,
    width: 110,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal'
  },
  // Степной железнодорожный переезд №42
  {
    id: 'road_rail_crossing_main',
    name: 'Степной переезд №42',
    x1: 12600,
    y1: 8200,
    x2: 12600,
    y2: 9600,
    width: 120,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'vertical'
  },
  // Связка от южного края коттеджного поселка напрямую к вокзалу
  {
    id: 'road_cottage_south_station_link',
    name: 'Южный пристанционный тракт (Связка с посёлком)',
    x1: 8000,
    y1: 8000,
    x2: 10920,
    y2: 8200,
    width: 100,
    lanes: 2,
    isAvenue: false,
    isDirt: false,
    isGravel: false,
    direction: 'horizontal'
  }
);

// 5. UPDATE ROLLING STOCK
map.rollingStock = [
  // Пассажирский поезд «Степной Экспресс» (на платформенном пути I)
  {
    id: 'train_loco_1',
    name: 'Магистральный тепловоз ТЭП70БС-316',
    type: 'locomotive_diesel',
    x: 10800,
    y: 8740,
    length: 270,
    width: 62,
    angle: 0,
    livery: 'rzd_pid',
    roadNumber: 'ТЭП70БС-316',
    hasHeadlight: true,
    headlightColor: '#fffbeb',
    speed: 0,
    direction: 1
  },
  {
    id: 'train_coach_1',
    name: 'Фирменный вагон РЖД №01 (СВ)',
    type: 'passenger_coach_rzhd',
    x: 10525,
    y: 8740,
    length: 260,
    width: 60,
    angle: 0,
    livery: 'rzd_classic',
    roadNumber: '018 24519'
  },
  {
    id: 'train_coach_2',
    name: 'Фирменный плацкартный вагон РЖД №02',
    type: 'passenger_coach_rzhd',
    x: 10255,
    y: 8740,
    length: 260,
    width: 60,
    angle: 0,
    livery: 'rzd_classic',
    roadNumber: '018 24527'
  },
  {
    id: 'train_coach_3',
    name: 'Фирменный купейный вагон РЖД №03',
    type: 'passenger_coach_rzhd',
    x: 9985,
    y: 8740,
    length: 260,
    width: 60,
    angle: 0,
    livery: 'rzd_classic',
    roadNumber: '018 24535'
  },
  {
    id: 'train_coach_4',
    name: 'Штабной вагон №04',
    type: 'passenger_coach_rzhd',
    x: 9715,
    y: 8740,
    length: 260,
    width: 60,
    angle: 0,
    livery: 'rzd_classic',
    roadNumber: '018 24501'
  },

  // Маневровый ЧМЭ3 на грузовом пути 4
  {
    id: 'train_freight_loco',
    name: 'Маневровый тепловоз ЧМЭ3-4812',
    type: 'locomotive_diesel_chme3',
    x: 11500,
    y: 9020,
    length: 220,
    width: 60,
    angle: 0,
    livery: 'chme3_green',
    roadNumber: 'ЧМЭ3-4812',
    hasHeadlight: true,
    headlightColor: '#fef08a'
  },
  {
    id: 'train_freight_hopper_1',
    name: 'Полувагон со щебнем',
    type: 'freight_hopper',
    x: 11270,
    y: 9020,
    length: 200,
    width: 60,
    angle: 0,
    livery: 'freight_rust_brown',
    roadNumber: '5482 1092',
    cargoType: 'gravel'
  },
  {
    id: 'train_freight_hopper_2',
    name: 'Полувагон с углем',
    type: 'freight_hopper',
    x: 11060,
    y: 9020,
    length: 200,
    width: 60,
    angle: 0,
    livery: 'freight_rust_brown',
    roadNumber: '5482 1141',
    cargoType: 'coal'
  },
  {
    id: 'train_freight_flatcar',
    name: 'Лесовозная платформа с хвойным кругляком',
    type: 'freight_flatcar_timber',
    x: 10840,
    y: 9020,
    length: 220,
    width: 60,
    angle: 0,
    livery: 'freight_timber',
    roadNumber: '4291 0038',
    cargoType: 'timber'
  }
];

// 6. CANONICAL RAILWAY SIGNALS (ИСИ И ПТЭ)
const canonicalSignals = [
  // --- ВХОДНЫЕ СВЕТОФОРЫ ---
  {
    id: 'sig_entry_N',
    name: 'Входной светофор «Н» (Западный подход, Главный I путь)',
    nameRu: 'Входной «Н»',
    type: 'entry',
    mastType: 'mast',
    designation: 'Н',
    targetTrack: 'Главный I путь',
    x: 8400,
    y: 8768,
    angle: Math.PI,
    lenses: ['yellow', 'green', 'red', 'yellow', 'white'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_1_west',
    nextSignalId: 'sig_exit_N1'
  },
  {
    id: 'sig_entry_ND',
    name: 'Дополнительный входной светофор «НД» (Западный подход, II путь)',
    nameRu: 'Входной «НД»',
    type: 'entry',
    mastType: 'mast',
    designation: 'НД',
    targetTrack: 'II неправильный путь',
    x: 8400,
    y: 8908,
    angle: Math.PI,
    lenses: ['red', 'yellow', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_2_west'
  },
  {
    id: 'sig_entry_Ch',
    name: 'Входной светофор «Ч» (Восточный подход, Главный II путь)',
    nameRu: 'Входной «Ч»',
    type: 'entry',
    mastType: 'mast',
    designation: 'Ч',
    targetTrack: 'Главный II путь',
    x: 14100,
    y: 8852,
    angle: 0,
    lenses: ['yellow', 'green', 'red', 'yellow', 'white'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_2_east',
    nextSignalId: 'sig_exit_Ch2'
  },
  {
    id: 'sig_entry_ChD',
    name: 'Дополнительный входной светофор «ЧД» (Восточный подход, I путь)',
    nameRu: 'Входной «ЧД»',
    type: 'entry',
    mastType: 'mast',
    designation: 'ЧД',
    targetTrack: 'I неправильный путь',
    x: 14100,
    y: 8712,
    angle: 0,
    lenses: ['red', 'yellow', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_1_east'
  },

  // --- ВЫХОДНЫЕ СВЕТОФОРЫ (НА ВОСТОК +X) ---
  {
    id: 'sig_exit_N3',
    name: 'Выходной светофор «Н3» (Путь 3, отправление на восток)',
    nameRu: 'Выходной «Н3»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Н3',
    targetTrack: 'Путь 3 (Платформа 1)',
    x: 12850,
    y: 8626,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    nextSignalId: 'sig_block_e_1'
  },
  {
    id: 'sig_exit_N1',
    name: 'Выходной светофор «Н1» (Главный I путь, отправление на восток)',
    nameRu: 'Выходной «Н1»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Н1',
    targetTrack: 'Главный I путь',
    x: 12850,
    y: 8768,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'green',
    nextSignalId: 'sig_block_e_1'
  },
  {
    id: 'sig_exit_N2',
    name: 'Выходной светофор «Н2» (Главный II путь, отправление на восток)',
    nameRu: 'Выходной «Н2»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Н2',
    targetTrack: 'Главный II путь',
    x: 12850,
    y: 8908,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red'
  },
  {
    id: 'sig_exit_N4',
    name: 'Выходной светофор «Н4» (Путь 4, отправление на восток)',
    nameRu: 'Выходной «Н4»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Н4',
    targetTrack: 'Путь 4 (Грузовой)',
    x: 12850,
    y: 9048,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red'
  },

  // --- ВЫХОДНЫЕ СВЕТОФОРЫ (НА ЗАПАД -X) ---
  {
    id: 'sig_exit_Ch3',
    name: 'Выходной светофор «Ч3» (Путь 3, отправление на запад)',
    nameRu: 'Выходной «Ч3»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Ч3',
    targetTrack: 'Путь 3 (Платформа 1)',
    x: 9650,
    y: 8572,
    angle: 0,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red'
  },
  {
    id: 'sig_exit_Ch1',
    name: 'Выходной светофор «Ч1» (Главный I путь, отправление на запад)',
    nameRu: 'Выходной «Ч1»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Ч1',
    targetTrack: 'Главный I путь',
    x: 9650,
    y: 8712,
    angle: 0,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red'
  },
  {
    id: 'sig_exit_Ch2',
    name: 'Выходной светофор «Ч2» (Главный II путь, отправление на запад)',
    nameRu: 'Выходной «Ч2»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Ч2',
    targetTrack: 'Главный II путь',
    x: 9650,
    y: 8852,
    angle: 0,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'green',
    nextSignalId: 'sig_block_w_2'
  },
  {
    id: 'sig_exit_Ch4',
    name: 'Выходной светофор «Ч4» (Путь 4, отправление на запад)',
    nameRu: 'Выходной «Ч4»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Ч4',
    targetTrack: 'Путь 4 (Грузовой)',
    x: 9650,
    y: 8992,
    angle: 0,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red'
  },

  // --- МАНЕВРОВЫЕ КАРЛИКОВЫЕ СВЕТОФОРЫ М1..М14 ---
  { id: 'sig_shunt_M1', name: 'Маневровый светофор «М1»', nameRu: 'Маневровый «М1»', type: 'shunting', mastType: 'dwarf', designation: 'М1', x: 8620, y: 8768, angle: Math.PI, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M2', name: 'Маневровый светофор «М2»', nameRu: 'Маневровый «М2»', type: 'shunting', mastType: 'dwarf', designation: 'М2', x: 8980, y: 8852, angle: 0, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M3', name: 'Маневровый светофор «М3»', nameRu: 'Маневровый «М3»', type: 'shunting', mastType: 'dwarf', designation: 'М3', x: 9120, y: 8768, angle: Math.PI, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M4', name: 'Маневровый светофор «М4»', nameRu: 'Маневровый «М4»', type: 'shunting', mastType: 'dwarf', designation: 'М4', x: 9580, y: 8572, angle: 0, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M5', name: 'Маневровый светофор «М5»', nameRu: 'Маневровый «М5»', type: 'shunting', mastType: 'dwarf', designation: 'М5', x: 9120, y: 8852, angle: Math.PI, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M6', name: 'Маневровый светофор «М6»', nameRu: 'Маневровый «М6»', type: 'shunting', mastType: 'dwarf', designation: 'М6', x: 9580, y: 9048, angle: 0, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M7', name: 'Маневровый светофор «М7»', nameRu: 'Маневровый «М7»', type: 'shunting', mastType: 'dwarf', designation: 'М7', x: 12880, y: 8626, angle: Math.PI, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M8', name: 'Маневровый светофор «М8»', nameRu: 'Маневровый «М8»', type: 'shunting', mastType: 'dwarf', designation: 'М8', x: 13380, y: 8712, angle: 0, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M9', name: 'Маневровый светофор «М9»', nameRu: 'Маневровый «М9»', type: 'shunting', mastType: 'dwarf', designation: 'М9', x: 12880, y: 9048, angle: Math.PI, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M10', name: 'Маневровый светофор «М10»', nameRu: 'Маневровый «М10»', type: 'shunting', mastType: 'dwarf', designation: 'М10', x: 13380, y: 8852, angle: 0, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M11', name: 'Маневровый светофор «М11»', nameRu: 'Маневровый «М11»', type: 'shunting', mastType: 'dwarf', designation: 'М11', x: 13520, y: 8908, angle: Math.PI, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M12', name: 'Маневровый светофор «М12»', nameRu: 'Маневровый «М12»', type: 'shunting', mastType: 'dwarf', designation: 'М12', x: 13880, y: 8712, angle: 0, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M13', name: 'Маневровый светофор «М13»', nameRu: 'Маневровый «М13»', type: 'shunting', mastType: 'dwarf', designation: 'М13', x: 10620, y: 9048, angle: Math.PI, lenses: ['white', 'blue'], currentAspect: 'blue' },
  { id: 'sig_shunt_M14', name: 'Маневровый светофор «М14»', nameRu: 'Маневровый «М14»', type: 'shunting', mastType: 'dwarf', designation: 'М14', x: 10980, y: 9152, angle: 0, lenses: ['white', 'blue'], currentAspect: 'white' },

  // --- ПРОХОДНЫЕ СВЕТОФОРЫ АВТОБЛОКИРОВКИ (АБ) ПО ВСЕЙ ПРОТЯЖЕННОСТИ ЛИНИИ ---
  // Западный перегон (X = -2000..8400)
  { id: 'sig_block_w_1', name: 'Проходной светофор 1 (Западный перегон, Путь I)', nameRu: 'Проходной 1', type: 'block', mastType: 'mast', designation: '1', x: 6000, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_w_2', name: 'Проходной светофор 2 (Западный перегон, Путь II)', nameRu: 'Проходной 2', type: 'block', mastType: 'mast', designation: '2', x: 6000, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_w_3', name: 'Проходной светофор 3 (Западный перегон, Путь I)', nameRu: 'Проходной 3', type: 'block', mastType: 'mast', designation: '3', x: 3000, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_w_4', name: 'Проходной светофор 4 (Западный перегон, Путь II)', nameRu: 'Проходной 4', type: 'block', mastType: 'mast', designation: '4', x: 3000, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_w_5', name: 'Проходной светофор 5 (Западный перегон, Путь I)', nameRu: 'Проходной 5', type: 'block', mastType: 'mast', designation: '5', x: 500, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_w_6', name: 'Проходной светофор 6 (Западный перегон, Путь II)', nameRu: 'Проходной 6', type: 'block', mastType: 'mast', designation: '6', x: 500, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_w_7', name: 'Проходной светофор 7 (Западная граница карты, Путь I)', nameRu: 'Проходной 7', type: 'block', mastType: 'mast', designation: '7', x: -1200, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_w_8', name: 'Проходной светофор 8 (Западная граница карты, Путь II)', nameRu: 'Проходной 8', type: 'block', mastType: 'mast', designation: '8', x: -1200, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },

  // Восточный перегон (X = 14100..54000)
  { id: 'sig_block_e_1', name: 'Проходной светофор 1 (Восточный перегон, Путь I)', nameRu: 'Проходной 1', type: 'block', mastType: 'mast', designation: '1', x: 18000, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_2', name: 'Проходной светофор 2 (Восточный перегон, Путь II)', nameRu: 'Проходной 2', type: 'block', mastType: 'mast', designation: '2', x: 18000, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_3', name: 'Проходной светофор 3 (Восточный перегон, Путь I)', nameRu: 'Проходной 3', type: 'block', mastType: 'mast', designation: '3', x: 23500, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_4', name: 'Проходной светофор 4 (Восточный перегон, Путь II)', nameRu: 'Проходной 4', type: 'block', mastType: 'mast', designation: '4', x: 23500, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_5', name: 'Проходной светофор 5 (Восточный перегон, Путь I)', nameRu: 'Проходной 5', type: 'block', mastType: 'mast', designation: '5', x: 29000, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_6', name: 'Проходной светофор 6 (Восточный перегон, Путь II)', nameRu: 'Проходной 6', type: 'block', mastType: 'mast', designation: '6', x: 29000, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_7', name: 'Проходной светофор 7 (Восточный перегон, Путь I)', nameRu: 'Проходной 7', type: 'block', mastType: 'mast', designation: '7', x: 35000, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_8', name: 'Проходной светофор 8 (Восточный перегон, Путь II)', nameRu: 'Проходной 8', type: 'block', mastType: 'mast', designation: '8', x: 35000, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_9', name: 'Проходной светофор 9 (Восточный перегон, Путь I)', nameRu: 'Проходной 9', type: 'block', mastType: 'mast', designation: '9', x: 41000, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_10', name: 'Проходной светофор 10 (Восточный перегон, Путь II)', nameRu: 'Проходной 10', type: 'block', mastType: 'mast', designation: '10', x: 41000, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_11', name: 'Проходной светофор 11 (Восточный перегон, Путь I)', nameRu: 'Проходной 11', type: 'block', mastType: 'mast', designation: '11', x: 47500, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_12', name: 'Проходной светофор 12 (Восточный перегон, Путь II)', nameRu: 'Проходной 12', type: 'block', mastType: 'mast', designation: '12', x: 47500, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_13', name: 'Проходной светофор 13 (Восточная граница карты, Путь I)', nameRu: 'Проходной 13', type: 'block', mastType: 'mast', designation: '13', x: 53000, y: 8768, angle: Math.PI, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' },
  { id: 'sig_block_e_14', name: 'Проходной светофор 14 (Восточная граница карты, Путь II)', nameRu: 'Проходной 14', type: 'block', mastType: 'mast', designation: '14', x: 53000, y: 8852, angle: 0, lenses: ['green', 'yellow', 'red'], currentAspect: 'green' }
];

map.railwaySignals = canonicalSignals;

// 7. CLEAN & UPDATE PROPS (Опоры контактной сети, стрелочные электроприводы, знаки, километраж)
// Remove old railway props that were around the old station or old railway location
map.props = map.props.filter(p => {
  if (p.id.startsWith('prop_rail_') || p.id.startsWith('prop_catenary_') || p.id.startsWith('prop_km_post_rail_') || p.id.startsWith('prop_station_sq_')) {
    return false;
  }
  // Check if it was an old station prop in y: 4900..6500, x: 8000..18500
  if (p.x >= 8000 && p.x <= 18500 && p.y >= 5000 && p.y <= 6500 && (p.type === 'railway_clock' || p.type === 'railway_platform_sign' || p.type === 'railway_picket_post' || p.type === 'railway_crossing_light' || p.type === 'railway_crossing_gate')) {
    return false;
  }
  return true;
});

const newProps = [];

// A. CATENARY MASTS (Опоры контактной сети КС-160 с консолями)
// Spaced every 150px along the entire 56-km route (from -2000 to 54000)
for (let x = -2000; x <= 54000; x += 160) {
  // North side mast (outside Track I)
  newProps.push({
    id: `prop_catenary_n_${x}`,
    type: 'catenary_pole',
    name: `Опора контактной сети КС-160 (ПК ${Math.floor((x + 2000) / 100)})`,
    x: x,
    y: 8690,
    width: 14,
    height: 14,
    angle: 0
  });

  // South side mast (outside Track II / Track 4)
  const southY = (x >= 9500 && x <= 13000) ? 9080 : 8930;
  newProps.push({
    id: `prop_catenary_s_${x}`,
    type: 'catenary_pole',
    name: `Опора контактной сети КС-160 (ПК ${Math.floor((x + 2000) / 100)})`,
    x: x,
    y: southY,
    width: 14,
    height: 14,
    angle: Math.PI
  });
}

// B. KILOMETER POSTS (Километровые столбы через каждые 1000px)
for (let x = 0; x <= 52000; x += 1000) {
  const kmNumber = Math.floor(x / 1000);
  newProps.push({
    id: `prop_km_post_rail_${kmNumber}`,
    type: 'railway_km_post',
    name: `Километровый столб ${kmNumber} км`,
    x: x,
    y: 8670,
    width: 10,
    height: 10,
    angle: 0
  });
}

// C. TURNOUT POINT MACHINES (Стрелочные электроприводы СП-6)
const switchLocations = [
  { id: 'sp1', x: 9110, y: 8715, name: 'Стрелочный электропривод СП-6 №1' },
  { id: 'sp2', x: 9110, y: 8905, name: 'Стрелочный электропривод СП-6 №2' },
  { id: 'sp3', x: 13390, y: 8715, name: 'Стрелочный электропривод СП-6 №3' },
  { id: 'sp4', x: 13390, y: 8905, name: 'Стрелочный электропривод СП-6 №4' },
  { id: 'sp5', x: 8610, y: 8715, name: 'Стрелочный электропривод СП-6 №5' },
  { id: 'sp6', x: 8990, y: 8905, name: 'Стрелочный электропривод СП-6 №6' },
  { id: 'sp7', x: 13510, y: 8905, name: 'Стрелочный электропривод СП-6 №7' },
  { id: 'sp8', x: 13890, y: 8715, name: 'Стрелочный электропривод СП-6 №8' },
  { id: 'sp14', x: 10610, y: 9045, name: 'Стрелочный электропривод СП-6 №14' }
];

switchLocations.forEach(sw => {
  newProps.push({
    id: `prop_rail_switch_${sw.id}`,
    type: 'rail_switch',
    name: sw.name,
    x: sw.x,
    y: sw.y,
    width: 18,
    height: 12,
    angle: 0
  });
});

// D. BUFFER STOP (Путевой упор ПУ-3 на тупиковом погрузочном пути)
newProps.push({
  id: 'prop_rail_buffer_siding_end',
  type: 'rail_buffer',
  name: 'Тупиковый упор ПУ-3 (Конец погрузочного пути пакгауза)',
  x: 12500,
  y: 9180,
  width: 24,
  height: 38,
  angle: 0
});

// E. STATION SQUARE PROPS (Фонари, лавки, часы, указатели)
const squareProps = [
  // Фонари на площади
  { id: 'sq_lamp_1', type: 'lamp', name: 'Парковый торшер', x: 10950, y: 8180 },
  { id: 'sq_lamp_2', type: 'lamp', name: 'Парковый торшер', x: 11100, y: 8180 },
  { id: 'sq_lamp_3', type: 'lamp', name: 'Парковый торшер', x: 11250, y: 8180 },
  { id: 'sq_lamp_4', type: 'lamp', name: 'Парковый торшер', x: 11400, y: 8180 },
  { id: 'sq_lamp_5', type: 'lamp', name: 'Парковый торшер', x: 11550, y: 8180 },
  // Лавки перед вокзалом
  { id: 'sq_bench_1', type: 'bench', name: 'Чугунная скамья', x: 11000, y: 8210 },
  { id: 'sq_bench_2', type: 'bench', name: 'Чугунная скамья', x: 11150, y: 8210 },
  { id: 'sq_bench_3', type: 'bench', name: 'Чугунная скамья', x: 11350, y: 8210 },
  { id: 'sq_bench_4', type: 'bench', name: 'Чугунная скамья', x: 11500, y: 8210 },
  // Вокзальные часы на платформе
  { id: 'sq_clock_1', type: 'railway_clock', name: 'Двусторонние станционные часы', x: 11180, y: 8465 },
  // Указатели платформ
  { id: 'sq_sign_p1', type: 'railway_platform_sign', name: 'Указатель «Платформа №1»', x: 10800, y: 8465 },
  { id: 'sq_sign_p2', type: 'railway_platform_sign', name: 'Указатель «Платформа №2»', x: 10800, y: 8775 },
  // Переездные светофоры и шлагбаумы на переезде №42 (X = 12600)
  { id: 'cross_sig_north', type: 'railway_crossing_light', name: 'Переездной светофор СП-1 (Север)', x: 12560, y: 8550 },
  { id: 'cross_sig_south', type: 'railway_crossing_light', name: 'Переездной светофор СП-2 (Юг)', x: 12640, y: 9230 },
  { id: 'cross_gate_north', type: 'railway_crossing_gate', name: 'Автошлагбаум ША-4 (Север)', x: 12560, y: 8570 },
  { id: 'cross_gate_south', type: 'railway_crossing_gate', name: 'Автошлагбаум ША-4 (Юг)', x: 12640, y: 9210 }
];

squareProps.forEach(sp => {
  newProps.push({
    id: `prop_station_sq_${sp.id}`,
    type: sp.type,
    name: sp.name,
    x: sp.x,
    y: sp.y,
    width: 16,
    height: 16,
    angle: 0
  });
});

map.props.push(...newProps);

console.log('New tracks count:', map.railwayTracks.length);
console.log('New signals count:', map.railwaySignals.length);
console.log('New props count:', map.props.length);
console.log('New rolling stock count:', map.rollingStock.length);
console.log('New platforms count:', map.railwayPlatforms.length);

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
console.log('Successfully written updated map.json!');

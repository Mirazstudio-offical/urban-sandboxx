// Canonical Railway & Signaling Rebuilder
// Fixes:
// 1. Removes all railway tracks, signals, and props from cottage district (X < 8200)
// 2. Implements canonical track layout: 2 main through tracks + 2 station side tracks merging back into mains
// 3. Implements standard bidirectional signalling according to PTE / ISI:
//    - Entry signals (Н, НД, Ч, ЧД) before throat switches
//    - Exit signals (Н1, Н2, Н3, Н4 and Ч1, Ч2, Ч3, Ч4) at station track ends
//    - Shunting signals (М1..М14) directly in front of every switch with clear track/switch indicators
//    - Level crossing signals & auto-block signals
// 4. Clean rolling stock placement

const fs = require('fs');

const mapPath = 'public/map.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('Original stats:');
console.log('Tracks:', map.railwayTracks.length);
console.log('Signals:', (map.railwaySignals || []).length);
console.log('Props:', map.props.length);

// 1. CLEANUP OLD RAIL OBJECTS
// Filter out old railway tracks
map.railwayTracks = [];

// Filter out railway props in cottage district (x < 8200) and old switch/signal props
map.props = map.props.filter(p => {
  if (p.x < 8200 && (p.id.includes('rail') || p.id.includes('mast') || p.id.includes('signal') || (p.name && p.name.includes('Опора')))) {
    return false;
  }
  if (p.id.startsWith('prop_rail_switch_') || p.id.startsWith('prop_rail_buffer_') || p.id.startsWith('prop_railway_sig_')) {
    return false;
  }
  return true;
});

// Helper for Bezier curve interpolation
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

// =========================================================================
// 2. CANONICAL TRACK GEOMETRY
// =========================================================================
// Elevations:
// Track 3 (North station track, platform 1): Y = 5600
// Main Track I (Through eastbound): Y = 5740
// Island Platform 2: Y = 5770..5850 (between Main I and Main II)
// Main Track II (Through westbound): Y = 5880
// Track 4 (South station track, freight/loop): Y = 6020
// Freight Siding 5 (Pacgauz): Y = 6180

const newTracks = [
  // --- MAIN TRACK I (Главный путь I, нечетный сквозной) ---
  {
    id: 'rail_main_1_west',
    name: 'Главный путь I (Западный открытый перегон)',
    x1: 8300,
    y1: 5740,
    x2: 9100,
    y2: 5740,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_1_station',
    name: 'Главный путь I (Станционная секция, Островная платформа)',
    x1: 9100,
    y1: 5740,
    x2: 13400,
    y2: 5740,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_1_east',
    name: 'Главный путь I (Восточный открытый перегон)',
    x1: 13400,
    y1: 5740,
    x2: 18000,
    y2: 5740,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },

  // --- MAIN TRACK II (Главный путь II, четный сквозной) ---
  {
    id: 'rail_main_2_west',
    name: 'Главный путь II (Западный открытый перегон)',
    x1: 8300,
    y1: 5880,
    x2: 9100,
    y2: 5880,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_2_station',
    name: 'Главный путь II (Станционная секция, Островная платформа)',
    x1: 9100,
    y1: 5880,
    x2: 13400,
    y2: 5880,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },
  {
    id: 'rail_main_2_east',
    name: 'Главный путь II (Восточный открытый перегон)',
    x1: 13400,
    y1: 5880,
    x2: 18000,
    y2: 5880,
    trackType: 'mainline',
    gauge: 34,
    ballastWidth: 92,
    sleepersType: 'concrete',
    isElectrified: true
  },

  // --- NORTH STATION TRACK 3 (Путь 3, береговая пассажирская платформа) ---
  {
    id: 'rail_bezier_turnout_track3_west',
    name: 'Стрелочный перевод №1 (Главный I -> Путь 3, Западная горловина)',
    x1: 9100,
    y1: 5740,
    x2: 9600,
    y2: 5600,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(9100, 5740, 9300, 5740, 9420, 5600, 9600, 5600)
  },
  {
    id: 'rail_track_3_platform',
    name: 'Путь 3 (Приемо-отправочный пассажирский, Платформа №1)',
    x1: 9600,
    y1: 5600,
    x2: 12900,
    y2: 5600,
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
    y1: 5600,
    x2: 13400,
    y2: 5740,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(12900, 5600, 13080, 5600, 13200, 5740, 13400, 5740)
  },

  // --- SOUTH STATION TRACK 4 (Путь 4, южный приемо-отправочный) ---
  {
    id: 'rail_bezier_turnout_track4_west',
    name: 'Стрелочный перевод №2 (Главный II -> Путь 4, Западная горловина)',
    x1: 9100,
    y1: 5880,
    x2: 9600,
    y2: 6020,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(9100, 5880, 9300, 5880, 9420, 6020, 9600, 6020)
  },
  {
    id: 'rail_track_4_station',
    name: 'Путь 4 (Южный приемо-отправочный грузопассажирский)',
    x1: 9600,
    y1: 6020,
    x2: 12900,
    y2: 6020,
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
    y1: 6020,
    x2: 13400,
    y2: 5880,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(12900, 6020, 13080, 6020, 13200, 5880, 13400, 5880)
  },

  // --- CROSSOVERS (Межпутные съезды) ---
  {
    id: 'rail_bezier_crossover_west',
    name: 'Западный съезд №5/6 (Главный I <-> Главный II)',
    x1: 8600,
    y1: 5740,
    x2: 9000,
    y2: 5880,
    trackType: 'crossover',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(8600, 5740, 8760, 5740, 8840, 5880, 9000, 5880)
  },
  {
    id: 'rail_bezier_crossover_east',
    name: 'Восточный съезд №7/8 (Главный II <-> Главный I)',
    x1: 13500,
    y1: 5880,
    x2: 13900,
    y2: 5740,
    trackType: 'crossover',
    gauge: 34,
    ballastWidth: 90,
    sleepersType: 'wood',
    isElectrified: true,
    curvePoints: computeBezierPoints(13500, 5880, 13660, 5880, 13740, 5740, 13900, 5740)
  },

  // --- FREIGHT SIDING (Погрузочный путь у пакгауза) ---
  {
    id: 'rail_bezier_siding_freight_curve',
    name: 'Стрелочный перевод погрузочного пути (Путь 4 -> Пакгауз)',
    x1: 10600,
    y1: 6020,
    x2: 11000,
    y2: 6180,
    trackType: 'siding',
    gauge: 34,
    ballastWidth: 80,
    sleepersType: 'wood',
    isElectrified: false,
    curvePoints: computeBezierPoints(10600, 6020, 10760, 6020, 10840, 6180, 11000, 6180)
  },
  {
    id: 'rail_siding_freight_ramp',
    name: 'Погрузочно-выгрузочный путь пакгауза станции Степная',
    x1: 11000,
    y1: 6180,
    x2: 12500,
    y2: 6180,
    trackType: 'deadend',
    gauge: 34,
    ballastWidth: 80,
    sleepersType: 'wood',
    isElectrified: false,
    hasBufferStop: true,
    bufferStopEnd: 'end'
  }
];

// Tag crossing tracks at X = 12600
newTracks.forEach(t => {
  if ((t.x1 <= 12620 && t.x2 >= 12580) || (t.x2 <= 12620 && t.x1 >= 12580)) {
    t.isCrossing = true;
    t.crossingRoadName = 'Степной переезд №42';
  }
});

map.railwayTracks = newTracks;

// =========================================================================
// 3. PASSENGER PLATFORMS
// =========================================================================
map.railwayPlatforms = [
  {
    id: 'platform_station_1',
    name: 'Пассажирская платформа №1 (Береговая у вокзала)',
    x: 10000,
    y: 5460,
    width: 2500,
    height: 110,
    platformNumber: 1,
    trackSide: 'north',
    hasCanopy: true,
    canopySegments: [
      { x: 10800, y: 5470, w: 500, h: 40 },
      { x: 11500, y: 5470, w: 300, h: 40 }
    ]
  },
  {
    id: 'platform_station_2',
    name: 'Пассажирская платформа №2 (Островная, между Главным I и Главным II)',
    x: 10100,
    y: 5770,
    width: 2400,
    height: 80,
    platformNumber: 2,
    trackSide: 'island',
    hasCanopy: true,
    canopySegments: [
      { x: 10800, y: 5780, w: 450, h: 36 },
      { x: 11450, y: 5780, w: 350, h: 36 }
    ]
  },
  {
    id: 'platform_freight_ramp',
    name: 'Грузовая платформа пакгауза',
    x: 10900,
    y: 6050,
    width: 1400,
    height: 90,
    platformNumber: 3,
    trackSide: 'south',
    hasCanopy: false
  }
];

// =========================================================================
// 4. CANONICAL RAILWAY SIGNALS (ИСИ И ПТЭ РЖД)
// =========================================================================
const canonicalSignals = [
  // -----------------------------------------------------------------------
  // А. ВХОДНЫЕ СВЕТОФОРЫ (Entry Signals)
  // -----------------------------------------------------------------------
  // С Запада: стоят на западном перегоне перед первой стрелкой горловины (X=8600)
  {
    id: 'sig_entry_N',
    name: 'Входной светофор «Н» (Западный подход, Главный I путь)',
    nameRu: 'Входной «Н»',
    type: 'entry',
    mastType: 'mast',
    designation: 'Н',
    targetTrack: 'Главный I путь',
    x: 8400,
    y: 5768,
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
    y: 5908,
    angle: Math.PI,
    lenses: ['red', 'yellow', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_2_west'
  },
  // С Востока: стоят на восточном перегоне перед первой стрелкой восточной горловины (X=13900)
  {
    id: 'sig_entry_Ch',
    name: 'Входной светофор «Ч» (Восточный подход, Главный II путь)',
    nameRu: 'Входной «Ч»',
    type: 'entry',
    mastType: 'mast',
    designation: 'Ч',
    targetTrack: 'Главный II путь',
    x: 14100,
    y: 5852,
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
    y: 5712,
    angle: 0,
    lenses: ['red', 'yellow', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_1_east'
  },

  // -----------------------------------------------------------------------
  // Б. ВЫХОДНЫЕ СВЕТОФОРЫ СО СТАНЦИОННЫХ ПУТЕЙ (Exit Signals)
  // -----------------------------------------------------------------------
  // Отправление на ВОСТОК (+X): стоят у восточных торцов путей (X=12850), светят на ЗАПАД (angle: Math.PI)
  {
    id: 'sig_exit_N3',
    name: 'Выходной светофор «Н3» (Путь 3, отправление на восток)',
    nameRu: 'Выходной «Н3»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Н3',
    targetTrack: 'Путь 3 (Платформа 1)',
    x: 12850,
    y: 5626,
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
    y: 5768,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'green',
    nextSignalId: 'sig_block_e_1'
  },
  {
    id: 'sig_exit_N2',
    name: 'Выходной светофор «Н2» (Главный II путь, отправление на восток по съезду)',
    nameRu: 'Выходной «Н2»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Н2',
    targetTrack: 'Главный II путь',
    x: 12850,
    y: 5908,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    nextSignalId: 'sig_block_e_1'
  },
  {
    id: 'sig_exit_N4',
    name: 'Выходной светофор «Н4» (Путь 4, отправление на восток)',
    nameRu: 'Выходной «Н4»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Н4',
    targetTrack: 'Путь 4 (Южный)',
    x: 12850,
    y: 6048,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    nextSignalId: 'sig_block_e_1'
  },

  // Отправление на ЗАПАД (-X): стоят у западных торцов путей (X=9650), светят на ВОСТОК (angle: 0)
  {
    id: 'sig_exit_Ch3',
    name: 'Выходной светофор «Ч3» (Путь 3, отправление на запад)',
    nameRu: 'Выходной «Ч3»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Ч3',
    targetTrack: 'Путь 3 (Платформа 1)',
    x: 9650,
    y: 5572,
    angle: 0,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red'
  },
  {
    id: 'sig_exit_Ch1',
    name: 'Выходной светофор «Ч1» (Главный I путь, отправление на запад по съезду)',
    nameRu: 'Выходной «Ч1»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Ч1',
    targetTrack: 'Главный I путь',
    x: 9650,
    y: 5712,
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
    y: 5852,
    angle: 0,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'green'
  },
  {
    id: 'sig_exit_Ch4',
    name: 'Выходной светофор «Ч4» (Путь 4, отправление на запад)',
    nameRu: 'Выходной «Ч4»',
    type: 'exit',
    mastType: 'dwarf',
    designation: 'Ч4',
    targetTrack: 'Путь 4 (Южный)',
    x: 9650,
    y: 5992,
    angle: 0,
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red'
  },

  // -----------------------------------------------------------------------
  // В. МАНЕВРОВЫЕ СВЕТОФОРЫ ПЕРЕД СТРЕЛКАМИ (Shunting Signals)
  // "маневровые должны быть перед стрелкой и чтоб машинист понимал для кого он"
  // -----------------------------------------------------------------------
  // 1. Западная горловина:
  // Перед стрелкой съезда 5/6 на I пути (со стороны запада)
  {
    id: 'sig_shunt_M5',
    name: 'Маневровый светофор «М5» (Главный I, перед съездом №5/6)',
    nameRu: 'Маневровый «М5»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М5',
    targetTrack: 'Съезд 5/6 (I путь -> II путь)',
    switchNumber: '5/6',
    x: 8570,
    y: 5768,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой съезда 5/6 на II пути (со стороны станции)
  {
    id: 'sig_shunt_M6',
    name: 'Маневровый светофор «М6» (Главный II, перед съездом №5/6)',
    nameRu: 'Маневровый «М6»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М6',
    targetTrack: 'Съезд 5/6 (II путь -> I путь)',
    switchNumber: '5/6',
    x: 9030,
    y: 5852,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой №1 (Главный I -> Путь 3) со стороны запада
  {
    id: 'sig_shunt_M1',
    name: 'Маневровый светофор «М1» (Главный I, перед стрелкой №1 на Путь 3)',
    nameRu: 'Маневровый «М1»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М1',
    targetTrack: 'Стрелка 1 (Главный I -> Путь 3)',
    switchNumber: '1',
    x: 9070,
    y: 5768,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой №1 со стороны Пути 3
  {
    id: 'sig_shunt_M3',
    name: 'Маневровый светофор «М3» (Путь 3, перед стрелкой №1 в горловину)',
    nameRu: 'Маневровый «М3»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М3',
    targetTrack: 'Путь 3 -> Горловина (Стрелка 1)',
    switchNumber: '1',
    x: 9630,
    y: 5572,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой №2 (Главный II -> Путь 4) со стороны запада
  {
    id: 'sig_shunt_M2',
    name: 'Маневровый светофор «М2» (Главный II, перед стрелкой №2 на Путь 4)',
    nameRu: 'Маневровый «М2»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М2',
    targetTrack: 'Стрелка 2 (Главный II -> Путь 4)',
    switchNumber: '2',
    x: 9070,
    y: 5852,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой №2 со стороны Пути 4
  {
    id: 'sig_shunt_M4',
    name: 'Маневровый светофор «М4» (Путь 4, перед стрелкой №2 в горловину)',
    nameRu: 'Маневровый «М4»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М4',
    targetTrack: 'Путь 4 -> Горловина (Стрелка 2)',
    switchNumber: '2',
    x: 9630,
    y: 6048,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },

  // 2. Восточная горловина:
  // Перед стрелкой №3 со стороны Пути 3
  {
    id: 'sig_shunt_M7',
    name: 'Маневровый светофор «М7» (Путь 3, перед стрелкой №3 на Главный I)',
    nameRu: 'Маневровый «М7»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М7',
    targetTrack: 'Путь 3 -> Главный I (Стрелка 3)',
    switchNumber: '3',
    x: 12870,
    y: 5626,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой №3 со стороны Главного I (движение на запад)
  {
    id: 'sig_shunt_M8',
    name: 'Маневровый светофор «М8» (Главный I, перед стрелкой №3 на Путь 3)',
    nameRu: 'Маневровый «М8»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М8',
    targetTrack: 'Главный I -> Путь 3 (Стрелка 3)',
    switchNumber: '3',
    x: 13430,
    y: 5712,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой №4 со стороны Пути 4
  {
    id: 'sig_shunt_M9',
    name: 'Маневровый светофор «М9» (Путь 4, перед стрелкой №4 на Главный II)',
    nameRu: 'Маневровый «М9»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М9',
    targetTrack: 'Путь 4 -> Главный II (Стрелка 4)',
    switchNumber: '4',
    x: 12870,
    y: 6048,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой №4 со стороны Главного II (движение на запад)
  {
    id: 'sig_shunt_M10',
    name: 'Маневровый светофор «М10» (Главный II, перед стрелкой №4 на Путь 4)',
    nameRu: 'Маневровый «М10»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М10',
    targetTrack: 'Главный II -> Путь 4 (Стрелка 4)',
    switchNumber: '4',
    x: 13430,
    y: 5852,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед восточным съездом 7/8 на Главном II
  {
    id: 'sig_shunt_M11',
    name: 'Маневровый светофор «М11» (Главный II, перед съездом №7/8)',
    nameRu: 'Маневровый «М11»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М11',
    targetTrack: 'Съезд 7/8 (II путь -> I путь)',
    switchNumber: '7/8',
    x: 13470,
    y: 5908,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед восточным съездом 7/8 на Главном I
  {
    id: 'sig_shunt_M12',
    name: 'Маневровый светофор «М12» (Главный I, перед съездом №7/8)',
    nameRu: 'Маневровый «М12»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М12',
    targetTrack: 'Съезд 7/8 (I путь -> II путь)',
    switchNumber: '7/8',
    x: 13930,
    y: 5712,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  // Перед стрелкой погрузочного района пакгауза на Пути 4
  {
    id: 'sig_shunt_M14',
    name: 'Маневровый светофор «М14» (Путь 4, стрелка пакгауза)',
    nameRu: 'Маневровый «М14»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М14',
    targetTrack: 'Погрузочный район пакгауза',
    switchNumber: 'пакгауз',
    x: 10570,
    y: 6048,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },

  // -----------------------------------------------------------------------
  // Г. ПЕРЕГОННЫЕ И ПРЕДВХОДНЫЕ СВЕТОФОРЫ АБ (Block Signals)
  // -----------------------------------------------------------------------
  // Восточный перегон:
  {
    id: 'sig_block_e_1',
    name: 'Проходной светофор «1» (Восточный перегон, I путь)',
    nameRu: 'Проходной «1»',
    type: 'block',
    mastType: 'mast',
    designation: '1',
    targetTrack: 'Главный I путь (на восток)',
    x: 15200,
    y: 5768,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    nextSignalId: 'sig_block_e_3'
  },
  {
    id: 'sig_block_e_3',
    name: 'Проходной светофор «3» (Восточный перегон, I путь)',
    nameRu: 'Проходной «3»',
    type: 'block',
    mastType: 'mast',
    designation: '3',
    targetTrack: 'Главный I путь (на восток)',
    x: 16800,
    y: 5768,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green'
  },
  {
    id: 'sig_block_e_4',
    name: 'Предвходной светофор «4» (Восточный перегон, II путь к станции)',
    nameRu: 'Предвходной «4»',
    type: 'block',
    mastType: 'mast',
    designation: '4',
    targetTrack: 'Главный II путь (к станции)',
    x: 15200,
    y: 5852,
    angle: 0,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    nextSignalId: 'sig_entry_Ch',
    isApproachSignal: true
  },
  {
    id: 'sig_block_e_6',
    name: 'Проходной светофор «6» (Восточный перегон, II путь)',
    nameRu: 'Проходной «6»',
    type: 'block',
    mastType: 'mast',
    designation: '6',
    targetTrack: 'Главный II путь (к станции)',
    x: 16800,
    y: 5852,
    angle: 0,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    nextSignalId: 'sig_block_e_4'
  },

  // -----------------------------------------------------------------------
  // Д. ПЕРЕЕЗД И ЗАГРАДИТЕЛЬНЫЕ (Level Crossing X=12600)
  // -----------------------------------------------------------------------
  {
    id: 'sig_obst_Z1',
    name: 'Заградительный светофор «З1» (Степной переезд, I путь)',
    nameRu: 'Заградительный «З1»',
    type: 'obstacle',
    mastType: 'mast',
    designation: 'З1',
    targetTrack: 'Главный I путь (переезд)',
    x: 12450,
    y: 5768,
    angle: Math.PI,
    lenses: ['red'],
    currentAspect: 'dark'
  },
  {
    id: 'sig_obst_Z2',
    name: 'Заградительный светофор «З2» (Степной переезд, II путь)',
    nameRu: 'Заградительный «З2»',
    type: 'obstacle',
    mastType: 'mast',
    designation: 'З2',
    targetTrack: 'Главный II путь (переезд)',
    x: 12750,
    y: 5852,
    angle: 0,
    lenses: ['red'],
    currentAspect: 'dark'
  },
  {
    id: 'sig_cross_north',
    name: 'Переездный светофор «СП1» (Северный шлагбаум)',
    nameRu: 'Переездный «СП1»',
    type: 'crossing',
    mastType: 'crossing',
    designation: 'СП1',
    targetTrack: 'Автодорога переезда',
    x: 12560,
    y: 5500,
    angle: -Math.PI / 2,
    lenses: ['white', 'red'],
    currentAspect: 'lunar_white_flashing',
    isCrossingGate: true
  },
  {
    id: 'sig_cross_south',
    name: 'Переездный светофор «СП2» (Южный шлагбаум)',
    nameRu: 'Переездный «СП2»',
    type: 'crossing',
    mastType: 'crossing',
    designation: 'СП2',
    targetTrack: 'Автодорога переезда',
    x: 12640,
    y: 6120,
    angle: Math.PI / 2,
    lenses: ['white', 'red'],
    currentAspect: 'lunar_white_flashing',
    isCrossingGate: true
  }
];

map.railwaySignals = canonicalSignals;

// =========================================================================
// 5. RAILWAY PROPS (Pickets, switch levers, relay cabinets outside cottage area)
// =========================================================================
const newProps = [
  // Switch point machines (Электроприводы стрелочных переводов СП-6М)
  { id: 'prop_rail_switch_1', name: 'Электропривод стрелки №1', x: 9110, y: 5756, type: 'rail_switch' },
  { id: 'prop_rail_switch_2', name: 'Электропривод стрелки №2', x: 9110, y: 5866, type: 'rail_switch' },
  { id: 'prop_rail_switch_3', name: 'Электропривод стрелки №3', x: 13390, y: 5756, type: 'rail_switch' },
  { id: 'prop_rail_switch_4', name: 'Электропривод стрелки №4', x: 13390, y: 5866, type: 'rail_switch' },
  { id: 'prop_rail_switch_5', name: 'Электропривод стрелки №5 (съезд)', x: 8610, y: 5756, type: 'rail_switch' },
  { id: 'prop_rail_switch_6', name: 'Электропривод стрелки №6 (съезд)', x: 8990, y: 5866, type: 'rail_switch' },
  { id: 'prop_rail_switch_7', name: 'Электропривод стрелки №7 (съезд)', x: 13510, y: 5866, type: 'rail_switch' },
  { id: 'prop_rail_switch_8', name: 'Электропривод стрелки №8 (съезд)', x: 13890, y: 5756, type: 'rail_switch' },
  { id: 'prop_rail_switch_14', name: 'Электропривод стрелки №14 (пакгауз)', x: 10610, y: 6036, type: 'rail_switch' },

  // Relay Cabinets (Релейные шкафы ШРУ-М у светофоров)
  { id: 'prop_rail_relay_N', name: 'Релейный шкаф входного «Н»', x: 8415, y: 5780, type: 'rail_relay_box' },
  { id: 'prop_rail_relay_Ch', name: 'Релейный шкаф входного «Ч»', x: 14085, y: 5840, type: 'rail_relay_box' },
  { id: 'prop_rail_relay_cross', name: 'Релейный шкаф переезда №42', x: 12590, y: 5490, type: 'rail_relay_box' },

  // Buffer stop at Pacgauz dead end
  { id: 'prop_rail_buffer_pacgauz', name: 'Путевой упор пакгауза', x: 12500, y: 6180, type: 'rail_buffer' },

  // Picket posts along mainline (only X >= 8400)
  { id: 'prop_rail_picket_8800', name: 'Пикетный столбик ПК 88', x: 8800, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_9600', name: 'Пикетный столбик ПК 96', x: 9600, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_10400', name: 'Пикетный столбик ПК 104', x: 10400, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_11200', name: 'Пикетный столбик ПК 112', x: 11200, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_12000', name: 'Пикетный столбик ПК 120', x: 12000, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_12800', name: 'Пикетный столбик ПК 128', x: 12800, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_13600', name: 'Пикетный столбик ПК 136', x: 13600, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_14400', name: 'Пикетный столбик ПК 144', x: 14400, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_15200', name: 'Пикетный столбик ПК 152', x: 15200, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_16000', name: 'Пикетный столбик ПК 160', x: 16000, y: 5768, type: 'rail_picket' },
  { id: 'prop_rail_picket_16800', name: 'Пикетный столбик ПК 168', x: 16800, y: 5768, type: 'rail_picket' }
];

map.props.push(...newProps);

// =========================================================================
// 6. ROLLING STOCK INITIAL POSITIONS (Safe outside cottages)
// =========================================================================
// Update rollingStock positions to match canonical tracks
map.rollingStock = (map.rollingStock || []).map(car => {
  if (car.id === 'train_loco_1') {
    return { ...car, x: 10800, y: 5740, speed: 120, direction: 1 };
  }
  if (car.id === 'train_coach_1') return { ...car, x: 10525, y: 5740, speed: 120, direction: 1 };
  if (car.id === 'train_coach_2') return { ...car, x: 10255, y: 5740, speed: 120, direction: 1 };
  if (car.id === 'train_coach_3') return { ...car, x: 9985, y: 5740, speed: 120, direction: 1 };
  if (car.id === 'train_coach_4') return { ...car, x: 9715, y: 5740, speed: 120, direction: 1 };

  if (car.id === 'train_vl80_head') {
    return { ...car, x: 16500, y: 5880, speed: 110, direction: -1 };
  }
  if (car.id === 'train_tanker_1') return { ...car, x: 16785, y: 5880, speed: 110, direction: -1 };
  if (car.id === 'train_tanker_2') return { ...car, x: 17015, y: 5880, speed: 110, direction: -1 };
  if (car.id === 'train_hopper_heavy_1') return { ...car, x: 17235, y: 5880, speed: 110, direction: -1 };
  if (car.id === 'train_hopper_heavy_2') return { ...car, x: 17445, y: 5880, speed: 110, direction: -1 };
  if (car.id === 'train_timber_heavy_1') return { ...car, x: 17675, y: 5880, speed: 110, direction: -1 };

  if (car.id === 'train_freight_loco') {
    return { ...car, x: 11500, y: 6020, speed: 35, direction: 1 };
  }
  if (car.id === 'train_freight_hopper_1') return { ...car, x: 11270, y: 6020, speed: 35, direction: 1 };
  if (car.id === 'train_freight_hopper_2') return { ...car, x: 11060, y: 6020, speed: 35, direction: 1 };
  if (car.id === 'train_freight_flatcar') return { ...car, x: 10840, y: 6020, speed: 35, direction: 1 };

  return car;
});

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');

console.log('Updated stats:');
console.log('Tracks:', map.railwayTracks.length);
console.log('Signals:', map.railwaySignals.length);
console.log('Props:', map.props.length);
console.log('Done!');

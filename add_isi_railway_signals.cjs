// Script to generate complete Russian/Soviet Railway Signals according to ИСИ into public/map.json
const fs = require('fs');

const mapPath = './public/map.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('Original props count:', map.props ? map.props.length : 0);
console.log('Original railwaySignals count:', map.railwaySignals ? map.railwaySignals.length : 0);

// 1. Remove any old phantom railway signal props
map.props = (map.props || []).filter(p => {
  if (p.type === 'railway_signal') return false;
  if (p.id && (p.id.startsWith('prop_rail_signal') || p.id.startsWith('sig_'))) return false;
  return true;
});

// 2. Define the complete 35-signal system according to ИСИ
const signals = [
  // =========================================================================
  // 1. ВХОДНЫЕ СВЕТОФОРЫ (ENTRY SIGNALS - 5-значные и 3-значные дополнительные)
  // =========================================================================
  {
    id: 'sig_entry_N',
    name: 'Входной светофор Н (Западная горловина, I путь)',
    nameRu: 'Входной светофор «Н»',
    type: 'entry',
    mastType: 'mast',
    designation: 'Н',
    x: 8350,
    y: 5712,
    angle: 0, // Faces west
    lenses: ['yellow', 'green', 'red', 'yellow', 'white'],
    currentAspect: 'green', // Open route into Mainline I
    linkedTrackId: 'rail_main_1_mid_west',
    nextSignalId: 'sig_exit_Ch1',
    isApproachSignal: false
  },
  {
    id: 'sig_entry_Ch',
    name: 'Входной светофор Ч (Восточная горловина, II путь)',
    nameRu: 'Входной светофор «Ч»',
    type: 'entry',
    mastType: 'mast',
    designation: 'Ч',
    x: 14250,
    y: 5908,
    angle: Math.PI, // Faces east
    lenses: ['yellow', 'green', 'red', 'yellow', 'white'],
    currentAspect: 'yellow', // Approach to station with stop at H2
    linkedTrackId: 'rail_main_2_station',
    nextSignalId: 'sig_exit_N2',
    isApproachSignal: false
  },
  {
    id: 'sig_entry_ND',
    name: 'Дополнительный входной светофор НД (Неправильный путь II с запада)',
    nameRu: 'Дополнительный входной «НД»',
    type: 'entry',
    mastType: 'mast',
    designation: 'НД',
    x: 8350,
    y: 5908,
    angle: 0, // Faces west
    lenses: ['red', 'yellow', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_2_west',
    isApproachSignal: false
  },
  {
    id: 'sig_entry_ChD',
    name: 'Дополнительный входной светофор ЧД (Неправильный путь I с востока)',
    nameRu: 'Дополнительный входной «ЧД»',
    type: 'entry',
    mastType: 'mast',
    designation: 'ЧД',
    x: 14250,
    y: 5712,
    angle: Math.PI, // Faces east
    lenses: ['red', 'yellow', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_1_east',
    isApproachSignal: false
  },

  // =========================================================================
  // 2. ВЫХОДНЫЕ СВЕТОФОРЫ (EXIT SIGNALS - 4-значные станционные)
  // =========================================================================
  {
    id: 'sig_exit_Ch1',
    name: 'Выходной светофор Ч1 (I Главный путь, восточный выезд)',
    nameRu: 'Выходной светофор «Ч1»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Ч1',
    x: 13260,
    y: 5712,
    angle: 0, // Faces west
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'green', // Route clear into Eastern open line
    linkedTrackId: 'rail_main_1_station',
    nextSignalId: 'sig_block_1'
  },
  {
    id: 'sig_exit_N1',
    name: 'Выходной светофор Н1 (I Главный путь, западный выезд)',
    nameRu: 'Выходной светофор «Н1»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Н1',
    x: 9140,
    y: 5768,
    angle: Math.PI, // Faces east
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_1_station'
  },
  {
    id: 'sig_exit_Ch2',
    name: 'Выходной светофор Ч2 (II Главный путь, восточный выезд)',
    nameRu: 'Выходной светофор «Ч2»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Ч2',
    x: 13460,
    y: 5852,
    angle: 0, // Faces west
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_main_2_station'
  },
  {
    id: 'sig_exit_N2',
    name: 'Выходной светофор Н2 (II Главный путь, западный выезд)',
    nameRu: 'Выходной светофор «Н2»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Н2',
    x: 9340,
    y: 5908,
    angle: Math.PI, // Faces east
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red', // Closed while train decelerates/stops at platform
    linkedTrackId: 'rail_main_2_station',
    nextSignalId: 'sig_block_2w'
  },
  {
    id: 'sig_exit_Ch3',
    name: 'Выходной светофор Ч3 (Пассажирский путь 3, Береговая платформа)',
    nameRu: 'Выходной светофор «Ч3»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Ч3',
    x: 12860,
    y: 5572,
    angle: 0, // Faces west
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red', // Passenger train parked along platform
    linkedTrackId: 'rail_track_3_platform'
  },
  {
    id: 'sig_exit_N3',
    name: 'Выходной светофор Н3 (Пассажирский путь 3, западная горловина)',
    nameRu: 'Выходной светофор «Н3»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Н3',
    x: 9640,
    y: 5628,
    angle: Math.PI, // Faces east
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_track_3_platform'
  },
  {
    id: 'sig_exit_Ch4',
    name: 'Выходной светофор Ч4 (Южный станционный путь 4)',
    nameRu: 'Выходной светофор «Ч4»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Ч4',
    x: 12760,
    y: 5992,
    angle: 0, // Faces west
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_track_4_station'
  },
  {
    id: 'sig_exit_N4',
    name: 'Выходной светофор Н4 (Южный станционный путь 4, западный выезд)',
    nameRu: 'Выходной светофор «Н4»',
    type: 'exit',
    mastType: 'mast',
    designation: 'Н4',
    x: 9840,
    y: 6048,
    angle: Math.PI, // Faces east
    lenses: ['green', 'yellow', 'red', 'white'],
    currentAspect: 'red',
    linkedTrackId: 'rail_track_4_station'
  },

  // =========================================================================
  // 3. ПРОХОДНЫЕ СВЕТОФОРЫ АВТОБЛОКИРОВКИ (BLOCK SIGNALS - 3-значная АБ)
  // =========================================================================
  // Путь I (нечетное направление, на восток)
  {
    id: 'sig_block_5',
    name: 'Проходной светофор 5 (Западный перегон, I путь)',
    nameRu: 'Проходной светофор «5»',
    type: 'block',
    mastType: 'mast',
    designation: '5',
    x: 6750,
    y: 5712,
    angle: 0,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_1_west',
    nextSignalId: 'sig_block_3'
  },
  {
    id: 'sig_block_3',
    name: 'Предвходной светофор 3 (Западный перегон перед светофором Н)',
    nameRu: 'Предвходной светофор «3»',
    type: 'block',
    mastType: 'mast',
    designation: '3',
    x: 7550,
    y: 5712,
    angle: 0,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green', // Green because Entry N is Green
    linkedTrackId: 'rail_main_1_west',
    nextSignalId: 'sig_entry_N',
    isApproachSignal: true // Has warning striped approach shield
  },
  {
    id: 'sig_block_1',
    name: 'Проходной светофор 1 (Восточный перегон, I путь)',
    nameRu: 'Проходной светофор «1»',
    type: 'block',
    mastType: 'mast',
    designation: '1',
    x: 15200,
    y: 5712,
    angle: 0,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_1_east',
    nextSignalId: 'sig_block_1a'
  },
  {
    id: 'sig_block_1a',
    name: 'Проходной светофор 1а (Восточный перегон, дальний блок-участок)',
    nameRu: 'Проходной светофор «1а»',
    type: 'block',
    mastType: 'mast',
    designation: '1а',
    x: 16800,
    y: 5712,
    angle: 0,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_1_east'
  },

  // Путь II (четное направление, на запад)
  {
    id: 'sig_block_6',
    name: 'Проходной светофор 6 (Восточный перегон, II путь)',
    nameRu: 'Проходной светофор «6»',
    type: 'block',
    mastType: 'mast',
    designation: '6',
    x: 17500,
    y: 5908,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_2_east',
    nextSignalId: 'sig_block_4'
  },
  {
    id: 'sig_block_4',
    name: 'Проходной светофор 4 (Восточный перегон, II путь)',
    nameRu: 'Проходной светофор «4»',
    type: 'block',
    mastType: 'mast',
    designation: '4',
    x: 16100,
    y: 5908,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_2_east',
    nextSignalId: 'sig_block_2'
  },
  {
    id: 'sig_block_2',
    name: 'Предвходной светофор 2 (Восточный перегон перед светофором Ч)',
    nameRu: 'Предвходной светофор «2»',
    type: 'block',
    mastType: 'mast',
    designation: '2',
    x: 14950,
    y: 5908,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'yellow', // Yellow because Entry Ch is Yellow
    linkedTrackId: 'rail_main_2_east',
    nextSignalId: 'sig_entry_Ch',
    isApproachSignal: true
  },
  {
    id: 'sig_block_2w',
    name: 'Проходной светофор 2з (Западный перегон, II путь выездной)',
    nameRu: 'Проходной светофор «2з»',
    type: 'block',
    mastType: 'mast',
    designation: '2з',
    x: 7650,
    y: 5908,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_2_west',
    nextSignalId: 'sig_block_4w'
  },
  {
    id: 'sig_block_4w',
    name: 'Проходной светофор 4з (Западный перегон, дальний блок-участок)',
    nameRu: 'Проходной светофор «4з»',
    type: 'block',
    mastType: 'mast',
    designation: '4з',
    x: 6650,
    y: 5908,
    angle: Math.PI,
    lenses: ['green', 'yellow', 'red'],
    currentAspect: 'green',
    linkedTrackId: 'rail_main_2_west'
  },

  // =========================================================================
  // 4. МАНЕВРОВЫЕ СВЕТОФОРЫ (SHUNTING SIGNALS - синий / лунно-белый)
  // =========================================================================
  {
    id: 'sig_shunt_M1',
    name: 'Карликовый маневровый светофор М1 (Стрелка отстойного тупика 1)',
    nameRu: 'Маневровый светофор «М1»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М1',
    x: 9680,
    y: 5626,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  {
    id: 'sig_shunt_M2',
    name: 'Мачтовый маневровый светофор М2 (Выезд из пассажирского тупика)',
    nameRu: 'Маневровый светофор «М2»',
    type: 'shunting',
    mastType: 'mast',
    designation: 'М2',
    x: 8340,
    y: 5474,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  {
    id: 'sig_shunt_M3',
    name: 'Карликовый маневровый светофор М3 (Западный межпутный съезд)',
    nameRu: 'Маневровый светофор «М3»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М3',
    x: 8620,
    y: 5768,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  {
    id: 'sig_shunt_M4',
    name: 'Карликовый маневровый светофор М4 (Стрелочный перевод грузового района)',
    nameRu: 'Маневровый светофор «М4»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М4',
    x: 10420,
    y: 5994,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  {
    id: 'sig_shunt_M5',
    name: 'Мачтовый маневровый светофор М5 (Выезд с рампы пакгауза, ЧМЭ3)',
    nameRu: 'Маневровый светофор «М5»',
    type: 'shunting',
    mastType: 'mast',
    designation: 'М5',
    x: 10880,
    y: 6154,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue' // Siding occupied by ЧМЭ3 shunter
  },
  {
    id: 'sig_shunt_M6',
    name: 'Карликовый маневровый светофор М6 (Восточная горловина, стрелка ПЧ)',
    nameRu: 'Маневровый светофор «М6»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М6',
    x: 13320,
    y: 5906,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  {
    id: 'sig_shunt_M7',
    name: 'Мачтовый маневровый светофор М7 (Выезд из тупика путевой техники ПЧ-12)',
    nameRu: 'Маневровый светофор «М7»',
    type: 'shunting',
    mastType: 'mast',
    designation: 'М7',
    x: 13820,
    y: 5994,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  {
    id: 'sig_shunt_M8',
    name: 'Карликовый маневровый светофор М8 (Западная горловина, путь 4)',
    nameRu: 'Маневровый светофор «М8»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М8',
    x: 9320,
    y: 5854,
    angle: 0,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },
  {
    id: 'sig_shunt_M10',
    name: 'Карликовый маневровый светофор М10 (Восточный межпутный съезд)',
    nameRu: 'Маневровый светофор «М10»',
    type: 'shunting',
    mastType: 'dwarf',
    designation: 'М10',
    x: 13520,
    y: 5854,
    angle: Math.PI,
    lenses: ['blue', 'white'],
    currentAspect: 'blue'
  },

  // =========================================================================
  // 5. ЗАГРАДИТЕЛЬНЫЕ СВЕТОФОРЫ ПЕРЕЕЗДА (OBSTACLE SIGNALS - ромбовидный щит)
  // =========================================================================
  {
    id: 'sig_obst_Z1',
    name: 'Заградительный светофор З1 переезда (Путь I)',
    nameRu: 'Заградительный светофор «З1»',
    type: 'obstacle',
    mastType: 'mast',
    designation: 'З1',
    x: 12420,
    y: 5712,
    angle: 0,
    lenses: ['red'],
    currentAspect: 'dark' // Dark in normal non-emergency state
  },
  {
    id: 'sig_obst_Z2',
    name: 'Заградительный светофор З2 переезда (Путь II)',
    nameRu: 'Заградительный светофор «З2»',
    type: 'obstacle',
    mastType: 'mast',
    designation: 'З2',
    x: 12780,
    y: 5908,
    angle: Math.PI,
    lenses: ['red'],
    currentAspect: 'dark' // Dark in normal non-emergency state
  },

  // =========================================================================
  // 6. ПОВТОРИТЕЛЬНЫЙ СВЕТОФОР (REPEATER SIGNAL - ромбовидный щит)
  // =========================================================================
  {
    id: 'sig_rep_PCh3',
    name: 'Повторительный светофор ПЧ3 (Платформа 1, видимость за навесом)',
    nameRu: 'Повторительный светофор «ПЧ3»',
    type: 'repeater',
    mastType: 'mast',
    designation: 'ПЧ3',
    x: 11950,
    y: 5572,
    angle: 0,
    lenses: ['green'],
    currentAspect: 'dark' // Dark because exit signal Ch3 is Red
  },

  // =========================================================================
  // 7. ПЕРЕЕЗДНАЯ СВЕТОФОРНАЯ СИГНАЛИЗАЦИЯ (LEVEL CROSSING SIGNALS)
  // =========================================================================
  {
    id: 'sig_cross_north',
    name: 'Переездный светофор СП1 (Северная сторона переезда)',
    nameRu: 'Переездный светофор «СП1»',
    type: 'crossing',
    mastType: 'crossing',
    designation: 'СП1',
    x: 12618,
    y: 5530,
    angle: 0,
    lenses: ['white', 'red'],
    currentAspect: 'lunar_white_flashing', // Permissive lunar white flashing
    isCrossingGate: true
  },
  {
    id: 'sig_cross_south',
    name: 'Переездный светофор СП2 (Южная сторона переезда)',
    nameRu: 'Переездный светофор «СП2»',
    type: 'crossing',
    mastType: 'crossing',
    designation: 'СП2',
    x: 12582,
    y: 6250,
    angle: Math.PI,
    lenses: ['white', 'red'],
    currentAspect: 'lunar_white_flashing',
    isCrossingGate: true
  }
];

map.railwaySignals = signals;

// Also add them to map.props as 'railway_signal' props with signal metadata for prop queries
signals.forEach(sig => {
  map.props.push({
    id: `prop_railway_${sig.id}`,
    x: sig.x,
    y: sig.y,
    type: 'railway_signal',
    angle: sig.angle,
    railwaySignalId: sig.id
  });
});

console.log('New railwaySignals count:', map.railwaySignals.length);
console.log('Total map.props count after adding railway signals:', map.props.length);

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
console.log('Saved to public/map.json successfully!');

if (fs.existsSync('./dist/map.json')) {
  fs.writeFileSync('./dist/map.json', JSON.stringify(map, null, 2), 'utf8');
  console.log('Saved copy to dist/map.json!');
}

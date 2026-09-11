const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('Original map dimensions:', map.width, map.height);
console.log('Original roads count:', map.roads.length);

// 1. World dimensions: 16000 x 8000
map.width = 16000;
map.height = 8000;

// 2. Clean ALL previous steppe and village elements
map.roads = map.roads.filter(r => !r.id.startsWith('road_steppe_') && !r.id.startsWith('road_village_'));
map.intersections = map.intersections.filter(i => !i.id.startsWith('inter_steppe_') && !i.id.startsWith('inter_village_'));
map.buildings = map.buildings.filter(b => !b.id.startsWith('bld_steppe_') && !b.id.startsWith('bld_village_'));
map.trees = map.trees.filter(t => !t.id.startsWith('tree_steppe_') && !t.id.startsWith('tree_village_') && !t.id.startsWith('tree_pine_'));
map.props = map.props.filter(p => !p.id.startsWith('prop_steppe_') && !p.id.startsWith('prop_village_') && !p.id.startsWith('km_post_') && !p.id.startsWith('lamp_steppe_') && !p.id.startsWith('pole_village_') && !p.id.startsWith('rest_') && !p.id.startsWith('gas_oasis_') && !p.id.startsWith('hay_bale_'));
map.roundabouts = [];

// Clean connections on city exit road road_h_4_9
const cityExitRoad = map.roads.find(r => r.id === 'road_h_4_9');
if (cityExitRoad) {
  for (const lp of cityExitRoad.lanePaths) {
    lp.connections = (lp.connections || []).filter(c => !c.targetLaneId.startsWith('road_steppe_'));
  }
}

// 3. Build Steppe Highway (road_steppe_0)
const hwX1 = 8000;
const hwX2 = 14400;
const hwY = 4000;
const hwWidth = 192;
const laneOffsetOuter = 72;
const laneOffsetInner = 24;

const waypointsX = [];
for (let x = hwX1 + 20; x < hwX2; x += 320) {
  waypointsX.push(x);
}
if (waypointsX[waypointsX.length - 1] !== hwX2) {
  waypointsX.push(hwX2);
}

const wpEastOuter = waypointsX.map(x => ({ x, y: hwY + laneOffsetOuter }));
const wpEastInner = waypointsX.map(x => ({ x, y: hwY + laneOffsetInner }));
const wpWestInner = [...waypointsX].reverse().map(x => ({ x, y: hwY - laneOffsetInner }));
const wpWestOuter = [...waypointsX].reverse().map(x => ({ x, y: hwY - laneOffsetOuter }));

function generateTurnaroundArc(startX, startY, endX, endY, apexX, steps = 7) {
  const pts = [];
  const midY = (startY + endY) / 2;
  const radiusY = Math.abs(startY - endY) / 2;
  const radiusX = Math.abs(apexX - startX);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = (Math.PI / 2) - t * Math.PI;
    const px = startX + Math.cos(angle) * radiusX;
    const py = midY + Math.sin(angle) * radiusY;
    pts.push({ x: Math.round(px), y: Math.round(py) });
  }
  return pts;
}

const innerTurnaroundArc = generateTurnaroundArc(
  hwX2, hwY + laneOffsetInner,
  hwX2, hwY - laneOffsetInner,
  hwX2 + 45,
  7
);

const outerTurnaroundArc = generateTurnaroundArc(
  hwX2, hwY + laneOffsetOuter,
  hwX2, hwY - laneOffsetOuter,
  hwX2 + 95,
  9
);

const steppeHighway = {
  id: 'road_steppe_0',
  x1: hwX1,
  y1: hwY,
  x2: hwX2,
  y2: hwY,
  lanes: 4,
  width: hwWidth,
  isAvenue: true,
  isDirt: false,
  isGravel: false,
  direction: 'horizontal',
  name: 'Степное Шоссе',
  lanePaths: [
    {
      laneId: 'road_steppe_0_w0',
      laneIndex: 0,
      direction: Math.PI,
      waypoints: wpWestOuter,
      connections: []
    },
    {
      laneId: 'road_steppe_0_w1',
      laneIndex: 1,
      direction: Math.PI,
      waypoints: wpWestInner,
      connections: []
    },
    {
      laneId: 'road_steppe_0_e1',
      laneIndex: 2,
      direction: 0,
      waypoints: wpEastInner,
      connections: [
        {
          targetLaneId: 'road_steppe_0_w1',
          turnType: 'turnaround',
          pathWaypoints: innerTurnaroundArc
        }
      ]
    },
    {
      laneId: 'road_steppe_0_e0',
      laneIndex: 3,
      direction: 0,
      waypoints: wpEastOuter,
      connections: [
        {
          targetLaneId: 'road_steppe_0_w0',
          turnType: 'turnaround',
          pathWaypoints: outerTurnaroundArc
        }
      ]
    }
  ]
};

// Connect city exit road into steppe highway
if (cityExitRoad) {
  const cityEastOuter = cityExitRoad.lanePaths.find(lp => lp.laneIndex === 3 || lp.laneId.endsWith('_e0'));
  const cityEastInner = cityExitRoad.lanePaths.find(lp => lp.laneIndex === 2 || lp.laneId.endsWith('_e1'));
  const cityWestInner = cityExitRoad.lanePaths.find(lp => lp.laneIndex === 1 || lp.laneId.endsWith('_w1'));
  const cityWestOuter = cityExitRoad.lanePaths.find(lp => lp.laneIndex === 0 || lp.laneId.endsWith('_w0'));

  if (cityEastOuter) {
    cityEastOuter.connections = cityEastOuter.connections || [];
    cityEastOuter.connections.push({
      targetLaneId: 'road_steppe_0_e0',
      turnType: 'straight',
      pathWaypoints: [{ x: 8000, y: hwY + laneOffsetOuter }, { x: 8020, y: hwY + laneOffsetOuter }]
    });
  }
  if (cityEastInner) {
    cityEastInner.connections = cityEastInner.connections || [];
    cityEastInner.connections.push({
      targetLaneId: 'road_steppe_0_e1',
      turnType: 'straight',
      pathWaypoints: [{ x: 8000, y: hwY + laneOffsetInner }, { x: 8020, y: hwY + laneOffsetInner }]
    });
  }
  if (cityWestInner) {
    steppeHighway.lanePaths[1].connections.push({
      targetLaneId: cityWestInner.laneId,
      turnType: 'straight',
      pathWaypoints: [{ x: 8000, y: hwY - laneOffsetInner }, { x: 7980, y: hwY - laneOffsetInner }]
    });
  }
  if (cityWestOuter) {
    steppeHighway.lanePaths[0].connections.push({
      targetLaneId: cityWestOuter.laneId,
      turnType: 'straight',
      pathWaypoints: [{ x: 8000, y: hwY - laneOffsetOuter }, { x: 7980, y: hwY - laneOffsetOuter }]
    });
  }
}

map.roads.push(steppeHighway);

// 4. Village Dirt Roads (Organic rustic tracks for player exploration)
// Access Road: from Highway (x=11400, y=3904) to Village Main Street (x=11400, y=2524)
const accessWpNorth = [];
for (let y = 3900; y >= 2524; y -= 160) {
  accessWpNorth.push({ x: 11410, y });
}
const accessWpSouth = [...accessWpNorth].reverse().map(p => ({ x: 11390, y: p.y }));

const roadVillageAccess = {
  id: 'road_village_access',
  x1: 11400,
  y1: 2524,
  x2: 11400,
  y2: 3904,
  lanes: 2,
  width: 44,
  isAvenue: false,
  isDirt: true,
  isGravel: false,
  direction: 'vertical',
  name: 'Подъезд к деревне Полыновка',
  lanePaths: [
    {
      laneId: 'road_village_access_s',
      laneIndex: 0,
      direction: Math.PI / 2,
      waypoints: accessWpSouth,
      connections: [
        {
          targetLaneId: 'road_steppe_0_w0',
          turnType: 'right',
          pathWaypoints: [
            { x: 11390, y: 3904 },
            { x: 11380, y: 3920 },
            { x: 11350, y: hwY - laneOffsetOuter }
          ]
        }
      ]
    },
    {
      laneId: 'road_village_access_n',
      laneIndex: 1,
      direction: -Math.PI / 2,
      waypoints: accessWpNorth,
      connections: []
    }
  ]
};

// Village Main Street
const mainWpEast = [];
for (let x = 10650; x <= 12350; x += 150) {
  mainWpEast.push({ x, y: 2512 });
}
const mainWpWest = [...mainWpEast].reverse().map(p => ({ x: p.x, y: 2488 }));

const roadVillageMain = {
  id: 'road_village_main',
  x1: 10650,
  y1: 2500,
  x2: 12350,
  y2: 2500,
  lanes: 2,
  width: 48,
  isAvenue: false,
  isDirt: true,
  isGravel: false,
  direction: 'horizontal',
  name: 'ул. Центральная (Полыновка)',
  lanePaths: [
    {
      laneId: 'road_village_main_w',
      laneIndex: 0,
      direction: Math.PI,
      waypoints: mainWpWest,
      connections: [
        {
          targetLaneId: 'road_village_main_e',
          turnType: 'turnaround',
          pathWaypoints: [
            { x: 10650, y: 2488 },
            { x: 10630, y: 2500 },
            { x: 10650, y: 2512 }
          ]
        }
      ]
    },
    {
      laneId: 'road_village_main_e',
      laneIndex: 1,
      direction: 0,
      waypoints: mainWpEast,
      connections: [
        {
          targetLaneId: 'road_village_main_w',
          turnType: 'turnaround',
          pathWaypoints: [
            { x: 12350, y: 2512 },
            { x: 12370, y: 2500 },
            { x: 12350, y: 2488 }
          ]
        }
      ]
    }
  ]
};

roadVillageAccess.lanePaths[1].connections.push(
  {
    targetLaneId: 'road_village_main_w',
    turnType: 'left',
    pathWaypoints: [{ x: 11410, y: 2524 }, { x: 11390, y: 2500 }, { x: 11350, y: 2488 }]
  },
  {
    targetLaneId: 'road_village_main_e',
    turnType: 'right',
    pathWaypoints: [{ x: 11410, y: 2524 }, { x: 11420, y: 2505 }, { x: 11450, y: 2512 }]
  }
);
roadVillageMain.lanePaths[0].connections.push({
  targetLaneId: 'road_village_access_s',
  turnType: 'left',
  pathWaypoints: [{ x: 11420, y: 2488 }, { x: 11400, y: 2505 }, { x: 11390, y: 2530 }]
});
roadVillageMain.lanePaths[1].connections.push({
  targetLaneId: 'road_village_access_s',
  turnType: 'right',
  pathWaypoints: [{ x: 11380, y: 2512 }, { x: 11395, y: 2515 }, { x: 11390, y: 2530 }]
});

// Kolkhoz Barn / Yard Dirt Spur
const barnWpSouth = [];
for (let y = 2524; y <= 2750; y += 75) {
  barnWpSouth.push({ x: 10890, y });
}
const barnWpNorth = [...barnWpSouth].reverse().map(p => ({ x: 10910, y: p.y }));

const roadVillageBarnLane = {
  id: 'road_village_barn_lane',
  x1: 10900,
  y1: 2524,
  x2: 10900,
  y2: 2750,
  lanes: 2,
  width: 40,
  isAvenue: false,
  isDirt: true,
  isGravel: false,
  direction: 'vertical',
  name: 'Проезд к МТС и зернотоку',
  lanePaths: [
    {
      laneId: 'road_village_barn_lane_s',
      laneIndex: 0,
      direction: Math.PI / 2,
      waypoints: barnWpSouth,
      connections: [
        {
          targetLaneId: 'road_village_barn_lane_n',
          turnType: 'turnaround',
          pathWaypoints: [
            { x: 10890, y: 2750 },
            { x: 10900, y: 2770 },
            { x: 10910, y: 2750 }
          ]
        }
      ]
    },
    {
      laneId: 'road_village_barn_lane_n',
      laneIndex: 1,
      direction: -Math.PI / 2,
      waypoints: barnWpNorth,
      connections: [
        {
          targetLaneId: 'road_village_main_w',
          turnType: 'left',
          pathWaypoints: [{ x: 10910, y: 2524 }, { x: 10890, y: 2500 }, { x: 10860, y: 2488 }]
        },
        {
          targetLaneId: 'road_village_main_e',
          turnType: 'right',
          pathWaypoints: [{ x: 10910, y: 2524 }, { x: 10920, y: 2505 }, { x: 10940, y: 2512 }]
        }
      ]
    }
  ]
};

map.roads.push(roadVillageAccess, roadVillageMain, roadVillageBarnLane);

// 5. Intersections in the village
map.intersections.push({
  id: 'inter_village_main_access',
  x: 11400,
  y: 2500,
  width: 48,
  height: 48,
  type: '3way_T_south',
  hasLights: false,
  currentPhaseIndex: 0,
  phaseTimer: 0,
  phases: [],
  stopLines: [],
  crosswalks: [],
  isDirt: true,
  isGravel: false,
  connectedRoadIds: ['road_village_main', 'road_village_access'],
  signalState: 'green_h',
  timer: 0,
  duration: 0
});

map.intersections.push({
  id: 'inter_village_barn_junction',
  x: 10900,
  y: 2500,
  width: 44,
  height: 44,
  type: '3way_T_south',
  hasLights: false,
  currentPhaseIndex: 0,
  phaseTimer: 0,
  phases: [],
  stopLines: [],
  crosswalks: [],
  isDirt: true,
  isGravel: false,
  connectedRoadIds: ['road_village_main', 'road_village_barn_lane'],
  signalState: 'green_h',
  timer: 0,
  duration: 0
});

// 6. Village Buildings (Precisely placed with zero overlaps with roads or each other)
const villageBuildings = [
  // North side of main street (y: 2330 .. 2420, street is at y=2500, width=48)
  {
    id: 'bld_village_izba_1',
    name: 'Изба деда Егора',
    type: 'suburban',
    x: 10680,
    y: 2350,
    width: 76,
    height: 60,
    roofColor: '#543d2b',
    accentColor: '#422e1e',
    entrances: [{ x: 10718, y: 2410, side: 'south' }]
  },
  {
    id: 'bld_village_izba_2',
    name: 'Дом с резным крыльцом',
    type: 'suburban',
    x: 10800,
    y: 2345,
    width: 82,
    height: 64,
    roofColor: '#4a3321',
    accentColor: '#3a2618',
    entrances: [{ x: 10841, y: 2409, side: 'south' }]
  },
  {
    id: 'bld_village_abandoned_1',
    name: 'Заброшенная изба',
    type: 'suburban',
    x: 10940,
    y: 2355,
    width: 72,
    height: 54,
    roofColor: '#2b1b11',
    accentColor: '#20130b',
    entrances: [{ x: 10976, y: 2409, side: 'south' }]
  },
  {
    id: 'bld_village_selpo',
    name: 'Сельский магазин "Сельпо"',
    type: 'suburban',
    x: 11060,
    y: 2335,
    width: 96,
    height: 68,
    roofColor: '#1e3a5f',
    accentColor: '#162c48',
    entrances: [{ x: 11108, y: 2403, side: 'south' }]
  },
  {
    id: 'bld_village_club',
    name: 'Сельский клуб & Почта',
    type: 'suburban',
    x: 11200,
    y: 2330,
    width: 108,
    height: 75,
    roofColor: '#6e2714',
    accentColor: '#541c0c',
    entrances: [{ x: 11254, y: 2405, side: 'south' }]
  },
  {
    id: 'bld_village_izba_3',
    name: 'Изба с голубыми ставнями',
    type: 'suburban',
    x: 11480,
    y: 2350,
    width: 80,
    height: 60,
    roofColor: '#5c4033',
    accentColor: '#452f24',
    entrances: [{ x: 11520, y: 2410, side: 'south' }]
  },
  {
    id: 'bld_village_izba_4',
    name: 'Дом пасечника',
    type: 'suburban',
    x: 11610,
    y: 2350,
    width: 78,
    height: 60,
    roofColor: '#4a3319',
    accentColor: '#372410',
    entrances: [{ x: 11649, y: 2410, side: 'south' }]
  },
  {
    id: 'bld_village_abandoned_2',
    name: 'Сгоревший остов дома',
    type: 'suburban',
    x: 11740,
    y: 2355,
    width: 78,
    height: 54,
    roofColor: '#1c1917',
    accentColor: '#141210',
    entrances: [{ x: 11779, y: 2409, side: 'south' }]
  },
  {
    id: 'bld_village_izba_5',
    name: 'Изба фельдшера',
    type: 'suburban',
    x: 11870,
    y: 2345,
    width: 82,
    height: 62,
    roofColor: '#3b2719',
    accentColor: '#2c1b10',
    entrances: [{ x: 11911, y: 2407, side: 'south' }]
  },
  {
    id: 'bld_village_izba_6',
    name: 'Крайняя изба у сосен',
    type: 'suburban',
    x: 12010,
    y: 2350,
    width: 80,
    height: 60,
    roofColor: '#543d2b',
    accentColor: '#3d2b1d',
    entrances: [{ x: 12050, y: 2410, side: 'south' }]
  },

  // South side of main street (y: 2630 .. 2720)
  {
    id: 'bld_village_barn',
    name: 'Колхозный амбар (МТС & Зерноток)',
    type: 'suburban',
    x: 10720,
    y: 2630,
    width: 120,
    height: 70,
    roofColor: '#633112',
    accentColor: '#4a230a',
    entrances: [{ x: 10780, y: 2630, side: 'north' }]
  },
  {
    id: 'bld_village_shed_1',
    name: 'Бревенчатый сарай с сеновалом',
    type: 'suburban',
    x: 10970,
    y: 2640,
    width: 64,
    height: 48,
    roofColor: '#382416',
    accentColor: '#2a190d',
    entrances: [{ x: 11002, y: 2640, side: 'north' }]
  },
  {
    id: 'bld_village_izba_7',
    name: 'Дом кузнеца',
    type: 'suburban',
    x: 11140,
    y: 2630,
    width: 82,
    height: 62,
    roofColor: '#452e1e',
    accentColor: '#342114',
    entrances: [{ x: 11181, y: 2630, side: 'north' }]
  },
  {
    id: 'bld_village_bathhouse_1',
    name: 'Старая банька по-чёрному',
    type: 'suburban',
    x: 11270,
    y: 2645,
    width: 48,
    height: 42,
    roofColor: '#27170e',
    accentColor: '#1a0e07',
    entrances: [{ x: 11294, y: 2645, side: 'north' }]
  },
  {
    id: 'bld_village_izba_8',
    name: 'Старая усадьба с садом',
    type: 'suburban',
    x: 11480,
    y: 2625,
    width: 84,
    height: 64,
    roofColor: '#5c4033',
    accentColor: '#452e24',
    entrances: [{ x: 11522, y: 2625, side: 'north' }]
  },
  {
    id: 'bld_village_shed_2',
    name: 'Дровяной навес',
    type: 'suburban',
    x: 11640,
    y: 2640,
    width: 58,
    height: 46,
    roofColor: '#3e2723',
    accentColor: '#2d1b17',
    entrances: [{ x: 11669, y: 2640, side: 'north' }]
  },
  {
    id: 'bld_village_izba_9',
    name: 'Дом лесника',
    type: 'suburban',
    x: 11780,
    y: 2630,
    width: 82,
    height: 62,
    roofColor: '#452e1e',
    accentColor: '#332014',
    entrances: [{ x: 11821, y: 2630, side: 'north' }]
  }
];

map.buildings.push(...villageBuildings);

// 7. Street Props
const newProps = [];

// A. Village Well (On the spacious green square near the center)
newProps.push({
  id: 'prop_village_well',
  x: 11355,
  y: 2435,
  type: 'village_well',
  angle: 0
});

// B. Village Signs
newProps.push({
  id: 'prop_village_sign_highway',
  x: 11370,
  y: 3915,
  type: 'village_sign',
  angle: 0
});
newProps.push({
  id: 'prop_village_sign_entrance',
  x: 11435,
  y: 2570,
  type: 'village_sign',
  angle: -Math.PI / 2
});

// C. Bus Stop Pavilion at highway turnoff
newProps.push({
  id: 'prop_village_bus_stop',
  x: 11340,
  y: 3910,
  type: 'bus_stop',
  angle: 0
});

// D. Rustic Car Wrecks in yards
newProps.push({
  id: 'prop_village_car_wreck_1',
  x: 10890,
  y: 2435,
  type: 'rustic_car_wreck',
  angle: 0.18
});
newProps.push({
  id: 'prop_village_car_wreck_2',
  x: 10770,
  y: 2715,
  type: 'rustic_car_wreck',
  angle: -0.35
});
newProps.push({
  id: 'prop_village_car_wreck_3',
  x: 12130,
  y: 2435,
  type: 'rustic_car_wreck',
  angle: 0.42
});

// E. Woodpiles
const woodpileCoords = [
  { x: 10765, y: 2360, angle: 0 },
  { x: 10895, y: 2360, angle: 0 },
  { x: 11570, y: 2360, angle: 0 },
  { x: 11700, y: 2360, angle: 0 },
  { x: 11235, y: 2650, angle: 0 },
  { x: 11580, y: 2640, angle: 0 }
];
woodpileCoords.forEach((c, idx) => {
  newProps.push({
    id: `prop_village_woodpile_${idx}`,
    x: c.x,
    y: c.y,
    type: 'woodpile',
    angle: c.angle
  });
});

// F. Haystacks
const haystackCoords = [
  { x: 10630, y: 2300 },
  { x: 10760, y: 2270 },
  { x: 10920, y: 2280 },
  { x: 11130, y: 2260 },
  { x: 11330, y: 2270 },
  { x: 11500, y: 2250 },
  { x: 11700, y: 2260 },
  { x: 11930, y: 2270 },
  { x: 12150, y: 2290 },
  { x: 10610, y: 2730 },
  { x: 10950, y: 2750 },
  { x: 11110, y: 2740 },
  { x: 11450, y: 2730 },
  { x: 11610, y: 2740 },
  { x: 11760, y: 2750 },
  { x: 11950, y: 2740 },
  // Steppe Haystacks
  { x: 9200, y: 3720 },
  { x: 9800, y: 4280 },
  { x: 10400, y: 3700 },
  { x: 12500, y: 3700 },
  { x: 13100, y: 4300 },
  { x: 13800, y: 3750 }
];
haystackCoords.forEach((c, idx) => {
  newProps.push({
    id: `prop_village_haystack_${idx}`,
    x: c.x,
    y: c.y,
    type: 'haystack',
    angle: (idx * 0.7) % (Math.PI * 2)
  });
});

// G. Wooden Telegraph / Power Poles
// Along access road
for (let y = 3880; y >= 2540; y -= 120) {
  newProps.push({
    id: `pole_village_access_${y}`,
    x: 11432,
    y: y,
    type: 'power_pole',
    angle: 0
  });
}
// Along village main street (at y=2466, safe from road and houses)
for (let x = 10680; x <= 12250; x += 150) {
  newProps.push({
    id: `pole_village_main_${x}`,
    x: x,
    y: 2466,
    type: 'power_pole',
    angle: Math.PI / 2
  });
}

// Concrete Barriers at Highway End
const barrierY = [3890, 3920, 3950, 3980, 4010, 4040, 4070, 4100];
barrierY.forEach((by, idx) => {
  newProps.push({
    id: `prop_steppe_barrier_${idx}`,
    x: 14460,
    y: by,
    type: 'concrete_barrier',
    angle: Math.PI / 2
  });
});

// Benches in Village
const benchCoords = [
  { x: 11110, y: 2420, angle: 0 },
  { x: 11260, y: 2420, angle: 0 },
  { x: 11335, y: 2435, angle: Math.PI / 2 },
  { x: 11500, y: 2420, angle: 0 }
];
benchCoords.forEach((b, idx) => {
  newProps.push({
    id: `prop_village_bench_${idx}`,
    x: b.x,
    y: b.y,
    type: 'bench',
    angle: b.angle
  });
});

// Highway Median Lamps along Steppe Highway
for (let x = 8100; x <= 14300; x += 220) {
  newProps.push({
    id: `lamp_steppe_highway_${x}`,
    x: x,
    y: hwY,
    type: 'lamp_highway',
    angle: 0
  });
}

// Kilometer Posts
for (let x = 8500; x <= 14000; x += 500) {
  newProps.push({
    id: `km_post_${x}`,
    x: x,
    y: hwY + 104,
    type: 'bollard',
    angle: 0
  });
}

map.props.push(...newProps);

// 8. Robust Collision-Aware Tree Generation
const allObstacles = [];

// Add all buildings
for (const bld of map.buildings) {
  allObstacles.push({
    minX: bld.x - 24,
    maxX: bld.x + bld.width + 24,
    minY: bld.y - 24,
    maxY: bld.y + bld.height + 24
  });
}

// Add all roads
for (const road of map.roads) {
  if (road.direction === 'horizontal') {
    allObstacles.push({
      minX: Math.min(road.x1, road.x2) - 15,
      maxX: Math.max(road.x1, road.x2) + 15,
      minY: road.y1 - road.width / 2 - 20,
      maxY: road.y1 + road.width / 2 + 20
    });
  } else {
    allObstacles.push({
      minX: road.x1 - road.width / 2 - 20,
      maxX: road.x1 + road.width / 2 + 20,
      minY: Math.min(road.y1, road.y2) - 15,
      maxY: Math.max(road.y1, road.y2) + 15
    });
  }
}

// Add all props as circular/square obstacles
for (const prop of map.props) {
  allObstacles.push({
    minX: prop.x - 22,
    maxX: prop.x + 22,
    minY: prop.y - 22,
    maxY: prop.y + 22
  });
}

function isTreePositionValid(x, y, radius, existingTrees) {
  // Check world bounds
  if (x < 50 || x > map.width - 50 || y < 50 || y > map.height - 50) return false;

  // Check obstacles
  for (const obs of allObstacles) {
    if (x + radius >= obs.minX && x - radius <= obs.maxX &&
        y + radius >= obs.minY && y - radius <= obs.maxY) {
      return false;
    }
  }

  // Check other trees to avoid ugly crowded clipping
  for (const t of existingTrees) {
    const distSq = (x - t.x) ** 2 + (y - t.y) ** 2;
    const minDist = radius + t.radius - 4; // allow tiny pleasant overlap
    if (distSq < minDist ** 2) return false;
  }

  return true;
}

const newTrees = [];

// A. Village Birches
const birchPalette = ['#84cc16', '#a3e635', '#65a30d', '#4d7c0f'];
let birchAttempts = 0;
let birchCount = 0;
while (birchCount < 70 && birchAttempts < 600) {
  birchAttempts++;
  const seed = (birchAttempts * 997 + 101) % 10000;
  const x = 10600 + (seed * 1.75) % 1800;
  const ySide = (birchAttempts % 2 === 0) ? 1 : -1;
  const yDist = 90 + ((seed * 3.3) % 240);
  const y = 2500 + ySide * yDist;
  const radius = 18 + (seed % 14);

  if (isTreePositionValid(x, y, radius, newTrees)) {
    newTrees.push({
      id: `tree_village_birch_${birchCount}`,
      x: Math.round(x),
      y: Math.round(y),
      radius: radius,
      color: birchPalette[birchCount % birchPalette.length],
      shadowOffset: Math.round(radius * 0.35),
      type: 'birch'
    });
    birchCount++;
  }
}

// B. Steppe Pines along Highway
const pinePalette = ['#0f3e24', '#124c2c', '#165732', '#1b6138'];
let pineAttempts = 0;
let pineCount = 0;
while (pineCount < 120 && pineAttempts < 800) {
  pineAttempts++;
  const seed = (pineAttempts * 733 + 47) % 10000;
  const x = 8100 + (seed * 6.2) % 6200;
  const ySide = (pineAttempts % 2 === 0) ? -1 : 1;
  const dist = 145 + ((seed * 1.9) % 360);
  const y = hwY + ySide * dist;
  const radius = 22 + (seed % 18);

  if (isTreePositionValid(x, y, radius, newTrees)) {
    newTrees.push({
      id: `tree_steppe_pine_${pineCount}`,
      x: Math.round(x),
      y: Math.round(y),
      radius: radius,
      color: pinePalette[pineCount % pinePalette.length],
      shadowOffset: Math.round(radius * 0.4),
      type: 'pine'
    });
    pineCount++;
  }
}

map.trees.push(...newTrees);

// Write updated map.json
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');

console.log('--- MAP GENERATION COMPLETE ---');
console.log('Total roads:', map.roads.length);
console.log('Total buildings:', map.buildings.length);
console.log('Total trees:', map.trees.length);
console.log('Total props:', map.props.length);

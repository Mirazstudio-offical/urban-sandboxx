const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('Original map dimensions:', map.width, map.height);
console.log('Original roads count:', map.roads.length);

// 1. Expand world dimensions to 16000 x 8000
map.width = 16000;
map.height = 8000;

// 2. Clean prior steppe elements (no weird roadside buildings, no disconnected side roads, no rectangular loops)
map.roads = map.roads.filter(r => !r.id.startsWith('road_steppe_'));
map.intersections = map.intersections.filter(i => !i.id.startsWith('inter_steppe_'));
map.buildings = map.buildings.filter(b => !b.id.startsWith('bld_steppe_'));
map.trees = map.trees.filter(t => !t.id.startsWith('tree_pine_') && !t.id.startsWith('tree_steppe_'));
map.props = map.props.filter(p => !p.id.startsWith('lamp_steppe_') && !p.id.startsWith('km_post_') && !p.id.startsWith('rest_') && !p.id.startsWith('gas_oasis_') && !p.id.startsWith('hay_bale_') && !p.id.startsWith('prop_steppe_'));
map.roundabouts = [];

// Clean previous connections on city road road_h_4_9
const cityExitRoad = map.roads.find(r => r.id === 'road_h_4_9');
if (cityExitRoad) {
  for (const lp of cityExitRoad.lanePaths) {
    lp.connections = (lp.connections || []).filter(c => !c.targetLaneId.startsWith('road_steppe_'));
  }
}

// 3. Build Steppe Highway (road_steppe_0)
// Continuous 4-lane avenue from x1=8000 to x2=15150, width=192, y=4000
const highwayX1 = 8000;
const highwayX2 = 15150;
const highwayY = 4000;
const highwayWidth = 192;
const laneOffsetOuter = 72; // 192 * 3 / 8
const laneOffsetInner = 24; // 192 * 1 / 8

// Sample waypoints every ~350px so AI traffic can spawn and smoothly drive along the full length
const waypointsX = [];
for (let x = highwayX1 + 20; x < highwayX2; x += 350) {
  waypointsX.push(x);
}
if (waypointsX[waypointsX.length - 1] !== highwayX2) {
  waypointsX.push(highwayX2);
}

const wpEastOuter = waypointsX.map(x => ({ x, y: highwayY + laneOffsetOuter }));
const wpEastInner = waypointsX.map(x => ({ x, y: highwayY + laneOffsetInner }));
const wpWestInner = [...waypointsX].reverse().map(x => ({ x, y: highwayY - laneOffsetInner }));
const wpWestOuter = [...waypointsX].reverse().map(x => ({ x, y: highwayY - laneOffsetOuter }));

const steppeHighway = {
  id: 'road_steppe_0',
  x1: highwayX1,
  y1: highwayY,
  x2: highwayX2,
  y2: highwayY,
  lanes: 4,
  width: highwayWidth,
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
      connections: []
    },
    {
      laneId: 'road_steppe_0_e0',
      laneIndex: 3,
      direction: 0,
      waypoints: wpEastOuter,
      connections: []
    }
  ]
};

// 4. Build True Circular Roundabout ("Степное Кольцо")
const rbCenterX = 15350;
const rbCenterY = 4000;
const rbOuterRadius = 220;
const rbInnerRadius = 100;

// Add to map.roundabouts
map.roundabouts.push({
  id: 'roundabout_steppe',
  x: rbCenterX,
  y: rbCenterY,
  radius: rbOuterRadius,
  innerRadius: rbInnerRadius,
  name: 'Степное Кольцо'
});

// Calculate circular waypoints for outer (R=185) and inner (R=135) lanes
const R0 = 185;
const a_entry0 = Math.PI - Math.asin(laneOffsetOuter / R0); // ~2.7418
const a_exit0 = -Math.PI + Math.asin(laneOffsetOuter / R0); // ~-2.7418

const numWp = 20;
const wpRoundaboutOuter = [];
for (let i = 0; i <= numWp; i++) {
  const t = i / numWp;
  const a = a_entry0 - t * (a_entry0 - a_exit0);
  wpRoundaboutOuter.push({
    x: Math.round((rbCenterX + R0 * Math.cos(a)) * 10) / 10,
    y: Math.round((rbCenterY + R0 * Math.sin(a)) * 10) / 10
  });
}

const R1 = 135;
const a_entry1 = Math.PI - Math.asin(laneOffsetInner / R1); // ~2.9629
const a_exit1 = -Math.PI + Math.asin(laneOffsetInner / R1); // ~-2.9629

const wpRoundaboutInner = [];
for (let i = 0; i <= numWp; i++) {
  const t = i / numWp;
  const a = a_entry1 - t * (a_entry1 - a_exit1);
  wpRoundaboutInner.push({
    x: Math.round((rbCenterX + R1 * Math.cos(a)) * 10) / 10,
    y: Math.round((rbCenterY + R1 * Math.sin(a)) * 10) / 10
  });
}

const ptExit0 = wpRoundaboutOuter[wpRoundaboutOuter.length - 1]; // (15179.6, 3928)
const ptEntry0 = wpRoundaboutOuter[0]; // (15179.6, 4072)
const ptExit1 = wpRoundaboutInner[wpRoundaboutInner.length - 1]; // (15217.2, 3976)
const ptEntry1 = wpRoundaboutInner[0]; // (15217.2, 4024)

const roundaboutRoad = {
  id: 'road_steppe_roundabout',
  x1: rbCenterX - rbOuterRadius,
  y1: rbCenterY - rbOuterRadius,
  x2: rbCenterX + rbOuterRadius,
  y2: rbCenterY + rbOuterRadius,
  lanes: 2,
  width: rbOuterRadius - rbInnerRadius, // 120
  isAvenue: false,
  isDirt: false,
  isGravel: false,
  isRoundabout: true,
  direction: 'horizontal',
  name: 'Степное Кольцо',
  lanePaths: [
    {
      laneId: 'road_steppe_roundabout_outer',
      laneIndex: 0,
      direction: 0,
      waypoints: wpRoundaboutOuter,
      connections: [
        // Exit from roundabout onto westbound outer lane of highway
        {
          targetLaneId: 'road_steppe_0_w0',
          turnType: 'turnaround',
          pathWaypoints: [
            ptExit0,
            { x: 15165, y: highwayY - laneOffsetOuter },
            { x: highwayX2, y: highwayY - laneOffsetOuter }
          ]
        },
        // Continue circulating around the roundabout
        {
          targetLaneId: 'road_steppe_roundabout_outer',
          turnType: 'straight',
          pathWaypoints: [
            ptExit0,
            { x: 15155, y: highwayY },
            ptEntry0
          ]
        }
      ]
    },
    {
      laneId: 'road_steppe_roundabout_inner',
      laneIndex: 1,
      direction: 0,
      waypoints: wpRoundaboutInner,
      connections: [
        // Exit from roundabout onto westbound inner lane of highway
        {
          targetLaneId: 'road_steppe_0_w1',
          turnType: 'turnaround',
          pathWaypoints: [
            ptExit1,
            { x: 15180, y: highwayY - laneOffsetInner },
            { x: highwayX2, y: highwayY - laneOffsetInner }
          ]
        },
        // Continue circulating around the roundabout
        {
          targetLaneId: 'road_steppe_roundabout_inner',
          turnType: 'straight',
          pathWaypoints: [
            ptExit1,
            { x: 15195, y: highwayY },
            ptEntry1
          ]
        }
      ]
    }
  ]
};

// 5. Connect Highway Eastbound into Roundabout
const e0Lane = steppeHighway.lanePaths.find(lp => lp.laneId === 'road_steppe_0_e0');
if (e0Lane) {
  e0Lane.connections.push({
    targetLaneId: 'road_steppe_roundabout_outer',
    turnType: 'straight',
    pathWaypoints: [
      { x: highwayX2, y: highwayY + laneOffsetOuter },
      { x: 15165, y: highwayY + laneOffsetOuter },
      ptEntry0
    ]
  });
}

const e1Lane = steppeHighway.lanePaths.find(lp => lp.laneId === 'road_steppe_0_e1');
if (e1Lane) {
  e1Lane.connections.push({
    targetLaneId: 'road_steppe_roundabout_inner',
    turnType: 'straight',
    pathWaypoints: [
      { x: highwayX2, y: highwayY + laneOffsetInner },
      { x: 15180, y: highwayY + laneOffsetInner },
      ptEntry1
    ]
  });
}

// 6. Connect City Road (`road_h_4_9`) to Highway (`road_steppe_0`)
if (cityExitRoad) {
  const cityE0 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_e0');
  const cityE1 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_e1');
  const cityW0 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_w0');
  const cityW1 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_w1');

  if (cityE0) {
    cityE0.connections = cityE0.connections || [];
    cityE0.connections.push({
      targetLaneId: 'road_steppe_0_e0',
      turnType: 'straight',
      pathWaypoints: [
        { x: 7870, y: 4072 },
        { x: 7945, y: 4072 },
        { x: 8020, y: 4072 }
      ],
      intersectionId: 'inter_steppe_city_exit'
    });
  }
  if (cityE1) {
    cityE1.connections = cityE1.connections || [];
    cityE1.connections.push({
      targetLaneId: 'road_steppe_0_e1',
      turnType: 'straight',
      pathWaypoints: [
        { x: 7870, y: 4024 },
        { x: 7945, y: 4024 },
        { x: 8020, y: 4024 }
      ],
      intersectionId: 'inter_steppe_city_exit'
    });
  }

  const w0Lane = steppeHighway.lanePaths.find(lp => lp.laneId === 'road_steppe_0_w0');
  if (w0Lane && cityW0) {
    w0Lane.connections.push({
      targetLaneId: 'road_h_4_9_w0',
      turnType: 'straight',
      pathWaypoints: [
        { x: 8020, y: 3928 },
        { x: 7945, y: 3928 },
        { x: 7870, y: 3928 }
      ],
      intersectionId: 'inter_steppe_city_exit'
    });
  }

  const w1Lane = steppeHighway.lanePaths.find(lp => lp.laneId === 'road_steppe_0_w1');
  if (w1Lane && cityW1) {
    w1Lane.connections.push({
      targetLaneId: 'road_h_4_9_w1',
      turnType: 'straight',
      pathWaypoints: [
        { x: 8020, y: 3976 },
        { x: 7945, y: 3976 },
        { x: 7870, y: 3976 }
      ],
      intersectionId: 'inter_steppe_city_exit'
    });
  }
}

// 7. City Exit Intersection
const cityExitIntersection = {
  id: 'inter_steppe_city_exit',
  x: 8000,
  y: 4000,
  width: 192,
  height: 192,
  type: '4way',
  hasLights: false,
  currentPhaseIndex: 0,
  phaseTimer: 0,
  phases: [],
  stopLines: [],
  crosswalks: []
};

// 8. Generate Pine Trees (flanking highway north and south, well clear of asphalt)
const pineColors = ['#0f3e24', '#124c2c', '#165732', '#1b6138'];
const newTrees = [];

let seed = 12345;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

// Pine Grove #1 around x: 9800..11200
for (let i = 0; i < 180; i++) {
  const x = 9800 + random() * 1400;
  const isNorth = random() > 0.5;
  const y = isNorth ? (3000 + random() * 750) : (4250 + random() * 750);
  if (Math.abs(y - 4000) > 140) {
    newTrees.push({
      id: `tree_pine_1_${i}`,
      x: Math.round(x),
      y: Math.round(y),
      radius: Math.round(18 + random() * 16),
      color: pineColors[Math.floor(random() * pineColors.length)],
      shadowOffset: 7,
      type: 'pine'
    });
  }
}

// Pine Grove #2 around x: 13600..15000
for (let i = 0; i < 200; i++) {
  const x = 13600 + random() * 1400;
  const isNorth = random() > 0.5;
  const y = isNorth ? (2800 + random() * 950) : (4250 + random() * 950);
  if (Math.abs(y - 4000) > 140 && Math.hypot(x - rbCenterX, y - rbCenterY) > rbOuterRadius + 40) {
    newTrees.push({
      id: `tree_pine_2_${i}`,
      x: Math.round(x),
      y: Math.round(y),
      radius: Math.round(18 + random() * 18),
      color: pineColors[Math.floor(random() * pineColors.length)],
      shadowOffset: 8,
      type: 'pine'
    });
  }
}

// Scattered steppe pines in open steppe
for (let i = 0; i < 90; i++) {
  const x = 8300 + random() * 7200;
  const y = 800 + random() * 6400;
  if (Math.abs(y - 4000) > 300 && Math.hypot(x - rbCenterX, y - rbCenterY) > rbOuterRadius + 40) {
    newTrees.push({
      id: `tree_steppe_pine_${i}`,
      x: Math.round(x),
      y: Math.round(y),
      radius: Math.round(16 + random() * 14),
      color: pineColors[Math.floor(random() * pineColors.length)],
      shadowOffset: 6,
      type: 'pine'
    });
  }
}

// 9. Highway median lamps and kilometre posts
const newProps = [];
for (let x = 8100; x < 15120; x += 180) {
  newProps.push({
    id: `lamp_steppe_median_${x}`,
    x,
    y: 4000,
    type: 'lamp_highway',
    angle: 0
  });
}

const kmMarkers = [
  { km: 1, x: 9000 },
  { km: 3, x: 11000 },
  { km: 5, x: 13000 },
  { km: 7, x: 15000 }
];
kmMarkers.forEach(({ km, x }) => {
  newProps.push({
    id: `km_post_${km}`,
    x,
    y: 3880,
    type: 'kiosk',
    color: '#1e293b'
  });
});

// Central monument flowerbed in the center of the roundabout island
newProps.push({
  id: 'prop_steppe_roundabout_monument',
  x: rbCenterX,
  y: rbCenterY,
  type: 'flowerbed',
  color: '#eab308'
});

// Hay bales in distant open fields
for (let i = 0; i < 40; i++) {
  const x = 8500 + random() * 6800;
  const isNorth = random() > 0.5;
  const y = isNorth ? (1200 + random() * 1400) : (5400 + random() * 1400);
  newProps.push({
    id: `hay_bale_${i}`,
    x: Math.round(x),
    y: Math.round(y),
    type: 'flowerbed',
    color: '#ca8a04'
  });
}

// Add roads, intersections, trees, props to map
map.roads.push(steppeHighway, roundaboutRoad);
map.intersections.push(cityExitIntersection);
map.trees.push(...newTrees);
map.props.push(...newProps);

console.log('Updated map width:', map.width);
console.log('New total roads:', map.roads.length);
console.log('New total trees:', map.trees.length);
console.log('New total props:', map.props.length);
console.log('New total buildings:', map.buildings.length);
console.log('Roundabouts:', map.roundabouts);

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
console.log('Successfully updated map.json!');

const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('=== BUILDING PERFECT DELTA JUNCTION & CANYON-DUNES HIGHWAY SYSTEM ===');

function getDist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function sampleSegment(p1, p2, step = 28) {
  const dist = getDist(p1, p2);
  const count = Math.max(2, Math.ceil(dist / step));
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    pts.push({
      x: Math.round((p1.x + t * (p2.x - p1.x)) * 10) / 10,
      y: Math.round((p1.y + t * (p2.y - p1.y)) * 10) / 10
    });
  }
  return pts;
}

function bezier2(p0, p1, p2, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    pts.push({
      x: Math.round((inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x) * 10) / 10,
      y: Math.round((inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y) * 10) / 10
    });
  }
  return pts;
}

function bezier3(p0, p1, p2, p3, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    pts.push({
      x: Math.round((inv * inv * inv * p0.x + 3 * inv * inv * t * p1.x + 3 * inv * t * t * p2.x + t * t * t * p3.x) * 10) / 10,
      y: Math.round((inv * inv * inv * p0.y + 3 * inv * inv * t * p1.y + 3 * inv * t * t * p2.y + t * t * t * p3.y) * 10) / 10
    });
  }
  return pts;
}

function generateCatmullRomSpline(points, stepLength = 28) {
  if (points.length < 2) return points;
  if (points.length === 2) return sampleSegment(points[0], points[1], stepLength);

  const splinePoints = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : points[i + 1];

    const cp1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6
    };

    const chordLen = getDist(p1, p2);
    const steps = Math.max(6, Math.ceil(chordLen / stepLength));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const inv = 1 - t;
      const x = inv * inv * inv * p1.x + 3 * inv * inv * t * cp1.x + 3 * inv * t * t * cp2.x + t * t * t * p2.x;
      const y = inv * inv * inv * p1.y + 3 * inv * inv * t * cp1.y + 3 * inv * t * t * cp2.y + t * t * t * p2.y;
      splinePoints.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10
      });
    }
  }

  const lastPt = points[points.length - 1];
  splinePoints.push({
    x: Math.round(lastPt.x * 10) / 10,
    y: Math.round(lastPt.y * 10) / 10
  });

  return splinePoints;
}

function generateTurnaroundLoop(startPt, endPt, apexPt, steps = 14) {
  const dirX = apexPt.x - (startPt.x + endPt.x) / 2;
  const dirY = apexPt.y - (startPt.y + endPt.y) / 2;
  const cp1 = { x: startPt.x + dirX * 0.95, y: startPt.y + dirY * 0.95 };
  const cp2 = { x: endPt.x + dirX * 0.95, y: endPt.y + dirY * 0.95 };
  return bezier3(startPt, cp1, cp2, endPt, steps);
}

function connectLanes(sourceLane, targetLane, turnType, pathWaypoints, interId) {
  if (!sourceLane.connections) sourceLane.connections = [];
  sourceLane.connections.push({
    targetLaneId: targetLane.laneId,
    turnType,
    pathWaypoints,
    intersectionId: interId
  });
}

function angleDiff(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

function create2LaneRoute(routeId, routeName, keypoints, options = {}) {
  const width = options.width || 96;
  const isDirt = !!options.isDirt;
  const isGravel = !!options.isGravel;
  const speedLimit = options.speedLimit || 85;
  const laneOffset = width / 4;

  const curvePoints = generateCatmullRomSpline(keypoints, 28);
  const n = curvePoints.length;

  const fWaypoints = [];
  const rWaypoints = [];

  for (let i = 0; i < n; i++) {
    let dx = 0, dy = 0;
    if (i === 0) {
      dx = curvePoints[1].x - curvePoints[0].x;
      dy = curvePoints[1].y - curvePoints[0].y;
    } else if (i === n - 1) {
      dx = curvePoints[n - 1].x - curvePoints[n - 2].x;
      dy = curvePoints[n - 1].y - curvePoints[n - 2].y;
    } else {
      dx = curvePoints[i + 1].x - curvePoints[i - 1].x;
      dy = curvePoints[i + 1].y - curvePoints[i - 1].y;
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const fx = curvePoints[i].x + nx * laneOffset;
    const fy = curvePoints[i].y + ny * laneOffset;
    const rx = curvePoints[i].x - nx * laneOffset;
    const ry = curvePoints[i].y - ny * laneOffset;

    fWaypoints.push({ x: Math.round(fx * 10) / 10, y: Math.round(fy * 10) / 10 });
    rWaypoints.push({ x: Math.round(rx * 10) / 10, y: Math.round(ry * 10) / 10 });
  }

  rWaypoints.reverse();

  const startPt = curvePoints[0];
  const endPt = curvePoints[n - 1];
  const forwardAngle = Math.atan2(curvePoints[1].y - curvePoints[0].y, curvePoints[1].x - curvePoints[0].x);
  const returnAngle = Math.atan2(curvePoints[n - 2].y - curvePoints[n - 1].y, curvePoints[n - 2].x - curvePoints[n - 1].x);

  return {
    id: routeId,
    name: routeName,
    direction: 'curved',
    x1: startPt.x,
    y1: startPt.y,
    x2: endPt.x,
    y2: endPt.y,
    width,
    lanes: 2,
    isAvenue: false,
    isDirt,
    isGravel,
    speedLimit,
    curvePoints,
    lanePaths: [
      {
        laneId: `${routeId}_f`,
        laneIndex: 0,
        direction: forwardAngle,
        waypoints: fWaypoints,
        connections: []
      },
      {
        laneId: `${routeId}_r`,
        laneIndex: 0,
        direction: returnAngle,
        waypoints: rWaypoints,
        connections: []
      }
    ]
  };
}

// 1. Remove obsolete roads and intersections
const oldRoadIds = ['road_canyon_circuit', 'road_deadend_canyon', 'road_dunes_express'];
const oldInterIds = ['inter_canyon_dunes_fork'];

map.roads = map.roads.filter(r => !oldRoadIds.includes(r.id));
map.intersections = map.intersections.filter(i => !oldInterIds.includes(i.id));

// Remove any existing connections pointing to old lanes on remaining roads
const oldLaneIds = [
  'road_canyon_circuit_f', 'road_canyon_circuit_r',
  'road_deadend_canyon_f', 'road_deadend_canyon_r',
  'road_dunes_express_f', 'road_dunes_express_r'
];
map.roads.forEach(r => {
  if (r.lanePaths) {
    r.lanePaths.forEach(lp => {
      if (lp.connections) {
        lp.connections = lp.connections.filter(c => !oldLaneIds.includes(c.targetLaneId));
      }
    });
  }
});

// 2. Define Delta Vertices (Intersections)
const interDeltaWest = {
  id: 'inter_canyon_delta_west',
  x: 24000,
  y: 12000,
  width: 160,
  height: 160,
  type: 'fork',
  trafficLight: false,
  phases: []
};

const interDeltaNorth = {
  id: 'inter_canyon_delta_north',
  x: 24500,
  y: 11940,
  width: 160,
  height: 160,
  type: '4way',
  trafficLight: false,
  phases: []
};

const interDeltaSouth = {
  id: 'inter_canyon_delta_south',
  x: 24250,
  y: 12360,
  width: 160,
  height: 160,
  type: '4way',
  trafficLight: false,
  phases: []
};

map.intersections.push(interDeltaWest, interDeltaNorth, interDeltaSouth);

// 3. Build Road Segments
// A. Peripheral Roads
const roadCanyonWest = create2LaneRoute(
  'road_canyon_circuit_west',
  'Каньонное Шоссе «Красные Скалы» (Западный сектор)',
  [
    { x: 14400, y: 4120 }, // Hub 1 South
    { x: 16200, y: 6500 },
    { x: 19500, y: 9800 },
    { x: 24000, y: 12000 } // Delta West
  ],
  { width: 96, speedLimit: 85 }
);

const roadCanyonEast = create2LaneRoute(
  'road_canyon_circuit_east',
  'Каньонное Шоссе «Красные Скалы» (Восточный сектор)',
  [
    { x: 24500, y: 11940 }, // Delta North
    { x: 29000, y: 9500 },
    { x: 33000, y: 6200 },
    { x: 36000, y: 4120 }   // Hub 3 South
  ],
  { width: 96, speedLimit: 85 }
);

const roadCanyonNorth = create2LaneRoute(
  'road_canyon_north',
  'Спуск в Карьер (Северный подъезд от М-12)',
  [
    { x: 24000, y: 4120 },  // Hub 2 South
    { x: 23200, y: 7200 },
    { x: 25000, y: 10500 },
    { x: 24500, y: 11940 }  // Delta North
  ],
  { width: 96, speedLimit: 65 }
);

const roadCanyonSouth = create2LaneRoute(
  'road_canyon_south',
  'Спуск в Карьер (Серпантин «Глинистые Обрывы»)',
  [
    { x: 24250, y: 12360 }, // Delta South
    { x: 23400, y: 14200 },
    { x: 24800, y: 16800 },
    { x: 24000, y: 18500 }  // Quarry Plateau
  ],
  { width: 96, speedLimit: 65 }
);

const roadDunesExpress = create2LaneRoute(
  'road_dunes_express',
  'Барханная Трасса «Золотые Пески»',
  [
    { x: 24250, y: 12360 }, // Delta South
    { x: 28000, y: 17500 },
    { x: 33000, y: 22000 },
    { x: 39000, y: 24500 },
    { x: 44500, y: 20000 },
    { x: 48000, y: 4120 }   // Hub 4 South
  ],
  { width: 96, speedLimit: 90 }
);

// B. Delta Triangle Connector Roads
const roadDeltaNorth = create2LaneRoute(
  'road_delta_north',
  'Северная перемычка Каньонной развязки',
  [
    { x: 24000, y: 12000 }, // Delta West
    { x: 24250, y: 11970 },
    { x: 24500, y: 11940 }  // Delta North
  ],
  { width: 96, speedLimit: 60 }
);

const roadDeltaEast = create2LaneRoute(
  'road_delta_east',
  'Восточная перемычка Каньонной развязки',
  [
    { x: 24500, y: 11940 }, // Delta North
    { x: 24375, y: 12150 },
    { x: 24250, y: 12360 }  // Delta South
  ],
  { width: 96, speedLimit: 60 }
);

const roadDeltaSouthwest = create2LaneRoute(
  'road_delta_southwest',
  'Западная перемычка Каньонной развязки',
  [
    { x: 24000, y: 12000 }, // Delta West
    { x: 24125, y: 12180 },
    { x: 24250, y: 12360 }  // Delta South
  ],
  { width: 96, speedLimit: 60 }
);

const newDeltaRoads = [
  roadCanyonWest,
  roadCanyonEast,
  roadCanyonNorth,
  roadCanyonSouth,
  roadDunesExpress,
  roadDeltaNorth,
  roadDeltaEast,
  roadDeltaSouthwest
];

// Add roads to map
map.roads.push(...newDeltaRoads);

// 4. Wire Peripheral Hubs
const hw1 = map.roads.find(r => r.id === 'road_highway_m12_seg1');
const hw2 = map.roads.find(r => r.id === 'road_highway_m12_seg2');
const hw3 = map.roads.find(r => r.id === 'road_highway_m12_seg3');
const hw4 = map.roads.find(r => r.id === 'road_highway_m12_seg4');

function wire2LaneTo4LaneHub(twoLaneRoad, hwWest, hwEast, interId, isNorthOfHw = false) {
  const fLane = twoLaneRoad.lanePaths[0];
  const rLane = twoLaneRoad.lanePaths[1];

  const dStart = Math.hypot(twoLaneRoad.x1 - hwWest.x2, twoLaneRoad.y1 - hwWest.y2);
  const dEnd = Math.hypot(twoLaneRoad.x2 - hwWest.x2, twoLaneRoad.y2 - hwWest.y2);
  const entersAtEnd = dEnd < dStart;

  const incomingLane = entersAtEnd ? fLane : rLane;
  const outgoingLane = entersAtEnd ? rLane : fLane;

  const inWp = incomingLane.waypoints[incomingLane.waypoints.length - 1];
  const outWp = outgoingLane.waypoints[0];

  const hwWestF0 = hwWest.lanePaths.find(l => l.laneIndex === 3);
  const hwWestR0 = hwWest.lanePaths.find(l => l.laneIndex === 0);
  const hwEastF0 = hwEast.lanePaths.find(l => l.laneIndex === 3);
  const hwEastR0 = hwEast.lanePaths.find(l => l.laneIndex === 0);

  if (isNorthOfHw) {
    if (hwWestR0) {
      const targetWp = hwWestR0.waypoints[0];
      const turnWps = bezier2(inWp, { x: inWp.x - 50, y: inWp.y + 50 }, targetWp, 8);
      connectLanes(incomingLane, hwWestR0, 'right', turnWps, interId);
    }
    if (hwEastF0) {
      const targetWp = hwEastF0.waypoints[0];
      const turnWps = bezier2(inWp, { x: inWp.x + 40, y: inWp.y + 60 }, targetWp, 8);
      connectLanes(incomingLane, hwEastF0, 'left', turnWps, interId);
    }
    if (hwWestF0) {
      const startWp = hwWestF0.waypoints[hwWestF0.waypoints.length - 1];
      const turnWps = bezier2(startWp, { x: outWp.x - 40, y: startWp.y - 50 }, outWp, 8);
      connectLanes(hwWestF0, outgoingLane, 'left', turnWps, interId);
    }
    if (hwEastR0) {
      const startWp = hwEastR0.waypoints[hwEastR0.waypoints.length - 1];
      const turnWps = bezier2(startWp, { x: outWp.x + 40, y: startWp.y - 40 }, outWp, 8);
      connectLanes(hwEastR0, outgoingLane, 'right', turnWps, interId);
    }
  } else {
    if (hwEastF0) {
      const targetWp = hwEastF0.waypoints[0];
      const turnWps = bezier2(inWp, { x: inWp.x + 50, y: inWp.y - 50 }, targetWp, 8);
      connectLanes(incomingLane, hwEastF0, 'right', turnWps, interId);
    }
    if (hwWestR0) {
      const targetWp = hwWestR0.waypoints[0];
      const turnWps = bezier2(inWp, { x: inWp.x - 40, y: inWp.y - 60 }, targetWp, 8);
      connectLanes(incomingLane, hwWestR0, 'left', turnWps, interId);
    }
    if (hwWestF0) {
      const startWp = hwWestF0.waypoints[hwWestF0.waypoints.length - 1];
      const turnWps = bezier2(startWp, { x: outWp.x - 40, y: startWp.y + 40 }, outWp, 8);
      connectLanes(hwWestF0, outgoingLane, 'right', turnWps, interId);
    }
    if (hwEastR0) {
      const startWp = hwEastR0.waypoints[hwEastR0.waypoints.length - 1];
      const turnWps = bezier2(startWp, { x: outWp.x + 40, y: startWp.y + 50 }, outWp, 8);
      connectLanes(hwEastR0, outgoingLane, 'left', turnWps, interId);
    }
  }
}

// Wire Hub 1 (West entrance of Canyon Circuit)
wire2LaneTo4LaneHub(roadCanyonWest, hw1, hw2, 'inter_highway_hub1', false);

// Wire Hub 2 (North entrance of Canyon descent)
wire2LaneTo4LaneHub(roadCanyonNorth, hw2, hw3, 'inter_highway_hub2', false);

// Wire Hub 3 (East entrance of Canyon Circuit)
wire2LaneTo4LaneHub(roadCanyonEast, hw3, hw4, 'inter_highway_hub3', false);

// Wire Hub 4 (Dunes Express eastern terminus)
wire2LaneTo4LaneHub(roadDunesExpress, hw3, hw4, 'inter_highway_hub4', false);

// Wire Canyon Quarry Terminal turnaround
const cFWp = roadCanyonSouth.lanePaths[0].waypoints[roadCanyonSouth.lanePaths[0].waypoints.length - 1];
const cRWp = roadCanyonSouth.lanePaths[1].waypoints[0];
const canyonTurnaroundArc = generateTurnaroundLoop(cFWp, cRWp, { x: 24000, y: 18700 }, 14);
connectLanes(roadCanyonSouth.lanePaths[0], roadCanyonSouth.lanePaths[1], 'turnaround', canyonTurnaroundArc, 'inter_deadend_canyon_terminal');

// 5. General Multi-Arm Intersection Connector
function connectIntersectionArms(arms, interId) {
  // Extract incoming and outgoing lane info for each arm
  const armInfos = arms.map(arm => {
    const isStart = arm.isStart;
    const incomingLane = isStart ? arm.road.lanePaths[1] : arm.road.lanePaths[0];
    const outgoingLane = isStart ? arm.road.lanePaths[0] : arm.road.lanePaths[1];

    const inPts = incomingLane.waypoints;
    const inWp = inPts[inPts.length - 1];
    const inPrevWp = inPts[Math.max(0, inPts.length - 2)];
    const inAngle = Math.atan2(inWp.y - inPrevWp.y, inWp.x - inPrevWp.x);

    const outPts = outgoingLane.waypoints;
    const outWp = outPts[0];
    const outNextWp = outPts[Math.min(outPts.length - 1, 1)];
    const outAngle = Math.atan2(outNextWp.y - outWp.y, outNextWp.x - outWp.x);

    return {
      road: arm.road,
      incomingLane,
      outgoingLane,
      inWp,
      inAngle,
      outWp,
      outAngle
    };
  });

  // Connect all pairs
  for (let i = 0; i < armInfos.length; i++) {
    for (let j = 0; j < armInfos.length; j++) {
      if (i === j) continue; // No U-turn back onto same road

      const src = armInfos[i];
      const dst = armInfos[j];

      const p0 = src.inWp;
      const theta0 = src.inAngle;
      const p3 = dst.outWp;
      const theta3 = dst.outAngle;

      const dist = getDist(p0, p3);
      const cpDist = Math.max(15, dist * 0.38);

      const p1 = {
        x: p0.x + Math.cos(theta0) * cpDist,
        y: p0.y + Math.sin(theta0) * cpDist
      };
      const p2 = {
        x: p3.x - Math.cos(theta3) * cpDist,
        y: p3.y - Math.sin(theta3) * cpDist
      };

      const pathWps = bezier3(p0, p1, p2, p3, 10);

      // Determine turn type based on angle diff
      const diff = angleDiff(theta3, theta0);
      let turnType = 'straight';
      if (Math.abs(diff) < 0.40) {
        turnType = 'straight';
      } else if (diff > 0) {
        turnType = 'right';
      } else {
        turnType = 'left';
      }

      connectLanes(src.incomingLane, dst.outgoingLane, turnType, pathWps, interId);
    }
  }
}

// 6. Connect the 3 Delta Intersections
// Vertex 1: Delta West (24000, 12000)
// Arms:
// 1) roadCanyonWest (ends at Delta West -> isStart = false)
// 2) roadDeltaNorth (starts at Delta West -> isStart = true)
// 3) roadDeltaSouthwest (starts at Delta West -> isStart = true)
connectIntersectionArms([
  { road: roadCanyonWest, isStart: false },
  { road: roadDeltaNorth, isStart: true },
  { road: roadDeltaSouthwest, isStart: true }
], 'inter_canyon_delta_west');

// Vertex 2: Delta North (24500, 11940)
// Arms:
// 1) roadCanyonNorth (ends at Delta North -> isStart = false)
// 2) roadDeltaNorth (ends at Delta North -> isStart = false)
// 3) roadCanyonEast (starts at Delta North -> isStart = true)
// 4) roadDeltaEast (starts at Delta North -> isStart = true)
connectIntersectionArms([
  { road: roadCanyonNorth, isStart: false },
  { road: roadDeltaNorth, isStart: false },
  { road: roadCanyonEast, isStart: true },
  { road: roadDeltaEast, isStart: true }
], 'inter_canyon_delta_north');

// Vertex 3: Delta South (24250, 12360)
// Arms:
// 1) roadDeltaSouthwest (ends at Delta South -> isStart = false)
// 2) roadDeltaEast (ends at Delta South -> isStart = false)
// 3) roadDunesExpress (starts at Delta South -> isStart = true)
// 4) roadCanyonSouth (starts at Delta South -> isStart = true)
connectIntersectionArms([
  { road: roadDeltaSouthwest, isStart: false },
  { road: roadDeltaEast, isStart: false },
  { road: roadDunesExpress, isStart: true },
  { road: roadCanyonSouth, isStart: true }
], 'inter_canyon_delta_south');

// Write out updated map
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');

// Also update dist/map.json if dist directory exists
const distMapPath = path.join(__dirname, 'dist', 'map.json');
if (fs.existsSync(distMapPath)) {
  fs.writeFileSync(distMapPath, JSON.stringify(map, null, 2), 'utf8');
}

console.log('=== DELTA JUNCTION SUCCESSFULLY GENERATED ===');
console.log('Total roads in map:', map.roads.length);
console.log('Total intersections in map:', map.intersections.length);

const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('=== CLEANING & REBUILDING COUNTRY HIGHWAY & SCENIC ROAD NETWORK ===');

// 1. Maintain world dimensions (52000 x 30000 px)
map.width = 52000;
map.height = 30000;

// 2. Remove all existing country/highway roads outside city and village
map.roads = map.roads.filter(r => 
  !r.id.startsWith('road_highway_') &&
  !r.id.startsWith('road_alpine_') &&
  !r.id.startsWith('road_canyon_') &&
  !r.id.startsWith('road_dunes_') &&
  !r.id.startsWith('road_deadend_') &&
  !r.id.startsWith('road_steppe_') &&
  !r.id.startsWith('road_valley_') &&
  !r.id.startsWith('road_taiga_') &&
  !r.id.startsWith('road_oasis_') &&
  !r.id.startsWith('road_north_') &&
  !r.id.startsWith('road_south_') &&
  !r.id.startsWith('road_east_') &&
  r.id !== 'road_steppe_roundabout'
);

// 3. Remove all existing country/highway/fake-bend intersections
map.intersections = map.intersections.filter(i => 
  !i.id.startsWith('inter_highway_') &&
  !i.id.startsWith('inter_deadend_') &&
  !i.id.startsWith('inter_road_') &&
  !i.id.startsWith('inter_steppe_') &&
  !i.id.startsWith('inter_lake_') &&
  !i.id.startsWith('inter_canyon_') &&
  !i.id.startsWith('inter_dunes_') &&
  !i.id.startsWith('inter_alpine_') &&
  i.id !== 'inter_village_turnoff'
);

// 4. Remove procedural country props
map.props = map.props.filter(p => 
  !p.id.startsWith('km_post_') &&
  !p.id.startsWith('sign_highway_') &&
  !p.id.startsWith('prop_highway_') &&
  !p.id.startsWith('prop_deadend') &&
  !p.id.startsWith('guardrail_')
);

// Helper math
function getDist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function sampleSegment(p1, p2, step = 100) {
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

const newRoads = [];
const newIntersections = [];
const newProps = [];

// =========================================================================
// 1. BEZIER-CURVED 2-LANE ROAD GENERATOR (Scenic routes)
// =========================================================================
function createBezierCurvedRoute(routeId, routeName, keypoints, options = {}) {
  const width = options.width || 96;
  const isDirt = !!options.isDirt;
  const isGravel = !!options.isGravel;
  const speedLimit = options.speedLimit || 85;
  const laneOffset = width / 4; // 24 for 96 width

  const curvePoints = generateCatmullRomSpline(keypoints, 28);
  const n = curvePoints.length;

  if (n < 2) return null;

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

  const road = {
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

  newRoads.push(road);
  return road;
}

// =========================================================================
// 2. 4-LANE HIGHWAY SEGMENT GENERATOR (M-12 Arterial)
// =========================================================================
function create4LaneHighway(id, name, x1, y1, x2, y2, width = 192) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;

  const fAngle = Math.atan2(dy, dx);
  const rAngle = Math.atan2(-dy, -dx);

  const laneOuter = width * 3 / 8; // 72 for 192
  const laneInner = width * 1 / 8; // 24 for 192

  // Forward lanes (Eastbound)
  const f0Start = { x: x1 + nx * laneOuter, y: y1 + ny * laneOuter };
  const f0End = { x: x2 + nx * laneOuter, y: y2 + ny * laneOuter };
  const f1Start = { x: x1 + nx * laneInner, y: y1 + ny * laneInner };
  const f1End = { x: x2 + nx * laneInner, y: y2 + ny * laneInner };

  // Return lanes (Westbound)
  const r0Start = { x: x2 - nx * laneOuter, y: y2 - ny * laneOuter };
  const r0End = { x: x1 - nx * laneOuter, y: y1 - ny * laneOuter };
  const r1Start = { x: x2 - nx * laneInner, y: y2 - ny * laneInner };
  const r1End = { x: x1 - nx * laneInner, y: y1 - ny * laneInner };

  const road = {
    id,
    name,
    direction: Math.abs(y1 - y2) < 2 ? 'horizontal' : (Math.abs(x1 - x2) < 2 ? 'vertical' : 'diagonal'),
    x1,
    y1,
    x2,
    y2,
    width,
    lanes: 4,
    isAvenue: true,
    speedLimit: 130,
    lanePaths: [
      {
        laneId: `${id}_f0`,
        laneIndex: 3,
        direction: fAngle,
        waypoints: sampleSegment(f0Start, f0End, 120),
        connections: []
      },
      {
        laneId: `${id}_f1`,
        laneIndex: 2,
        direction: fAngle,
        waypoints: sampleSegment(f1Start, f1End, 120),
        connections: []
      },
      {
        laneId: `${id}_r1`,
        laneIndex: 1,
        direction: rAngle,
        waypoints: sampleSegment(r1Start, r1End, 120),
        connections: []
      },
      {
        laneId: `${id}_r0`,
        laneIndex: 0,
        direction: rAngle,
        waypoints: sampleSegment(r0Start, r0End, 120),
        connections: []
      }
    ]
  };

  newRoads.push(road);
  return road;
}

function wire4LaneStraight(westRoad, eastRoad, interId) {
  const wF0 = westRoad.lanePaths.find(l => l.laneIndex === 3);
  const wF1 = westRoad.lanePaths.find(l => l.laneIndex === 2);
  const eF0 = eastRoad.lanePaths.find(l => l.laneIndex === 3);
  const eF1 = eastRoad.lanePaths.find(l => l.laneIndex === 2);

  const eR0 = eastRoad.lanePaths.find(l => l.laneIndex === 0);
  const eR1 = eastRoad.lanePaths.find(l => l.laneIndex === 1);
  const wR0 = westRoad.lanePaths.find(l => l.laneIndex === 0);
  const wR1 = westRoad.lanePaths.find(l => l.laneIndex === 1);

  if (wF0 && eF0) {
    const pA = wF0.waypoints[wF0.waypoints.length - 1];
    const pB = eF0.waypoints[0];
    connectLanes(wF0, eF0, 'straight', sampleSegment(pA, pB, 40), interId);
  }
  if (wF1 && eF1) {
    const pA = wF1.waypoints[wF1.waypoints.length - 1];
    const pB = eF1.waypoints[0];
    connectLanes(wF1, eF1, 'straight', sampleSegment(pA, pB, 40), interId);
  }
  if (eR0 && wR0) {
    const pA = eR0.waypoints[eR0.waypoints.length - 1];
    const pB = wR0.waypoints[0];
    connectLanes(eR0, wR0, 'straight', sampleSegment(pA, pB, 40), interId);
  }
  if (eR1 && wR1) {
    const pA = eR1.waypoints[eR1.waypoints.length - 1];
    const pB = wR1.waypoints[0];
    connectLanes(eR1, wR1, 'straight', sampleSegment(pA, pB, 40), interId);
  }
}

function wire2LaneTo4LaneHub(twoLaneRoad, hwWest, hwEast, interId, isNorthOfHw = true) {
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
    // Coming from North:
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
    // Coming from South:
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

// =========================================================================
// 3. BUILD THE CENTRAL HIGHWAY ARTERIAL M-12
// =========================================================================
const hw1 = create4LaneHighway('road_highway_m12_seg1', 'Трасса М-12 «Степной Вектор»', 8080, 4000, 14320, 4000);
const hw2 = create4LaneHighway('road_highway_m12_seg2', 'Трасса М-12 «Степной Вектор»', 14480, 4000, 23920, 4000);
const hw3 = create4LaneHighway('road_highway_m12_seg3', 'Трасса М-12 «Степной Вектор»', 24080, 4000, 35920, 4000);
const hw4 = create4LaneHighway('road_highway_m12_seg4', 'Трасса М-12 «Степной Вектор»', 36080, 4000, 47920, 4000);

wire4LaneStraight(hw1, hw2, 'inter_highway_hub1');
wire4LaneStraight(hw2, hw3, 'inter_highway_hub2');
wire4LaneStraight(hw3, hw4, 'inter_highway_hub3');

// 5 Highway Interchanges (Clean geometric nodes)
newIntersections.push(
  { id: 'inter_steppe_city_exit', x: 8000, y: 4000, width: 220, height: 220, type: '4way', trafficLight: true, phases: [] },
  { id: 'inter_highway_hub1', x: 14400, y: 4000, width: 240, height: 240, type: '4way', trafficLight: true, phases: [] },
  { id: 'inter_highway_hub2', x: 24000, y: 4000, width: 240, height: 240, type: '4way', trafficLight: true, phases: [] },
  { id: 'inter_highway_hub3', x: 36000, y: 4000, width: 240, height: 240, type: '4way', trafficLight: true, phases: [] },
  { id: 'inter_highway_hub4', x: 48000, y: 4000, width: 240, height: 240, type: '4way', trafficLight: true, phases: [] }
);

// Connect City Exit Road `road_h_4_9` with `hw1`
const cityExitRoad = map.roads.find(r => r.id === 'road_h_4_9');
if (cityExitRoad) {
  const cityE0 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_e0');
  const cityE1 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_e1');
  const cityW0 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_w0');
  const cityW1 = cityExitRoad.lanePaths.find(lp => lp.laneId === 'road_h_4_9_w1');

  const hwF0 = hw1.lanePaths.find(lp => lp.laneId === 'road_highway_m12_seg1_f0');
  const hwF1 = hw1.lanePaths.find(lp => lp.laneId === 'road_highway_m12_seg1_f1');
  const hwR0 = hw1.lanePaths.find(lp => lp.laneId === 'road_highway_m12_seg1_r0');
  const hwR1 = hw1.lanePaths.find(lp => lp.laneId === 'road_highway_m12_seg1_r1');

  if (cityE0 && hwF0) connectLanes(cityE0, hwF0, 'straight', [{ x: 7920, y: 4072 }, { x: 8080, y: 4072 }], 'inter_steppe_city_exit');
  if (cityE1 && hwF1) connectLanes(cityE1, hwF1, 'straight', [{ x: 7920, y: 4024 }, { x: 8080, y: 4024 }], 'inter_steppe_city_exit');
  if (hwR0 && cityW0) connectLanes(hwR0, cityW0, 'straight', [{ x: 8080, y: 3928 }, { x: 7920, y: 3928 }], 'inter_steppe_city_exit');
  if (hwR1 && cityW1) connectLanes(hwR1, cityW1, 'straight', [{ x: 8080, y: 3976 }, { x: 7920, y: 3976 }], 'inter_steppe_city_exit');
}

// =========================================================================
// 4. SCENIC ROUTES
// =========================================================================

// A. Northern Taiga & Alpine Serpentine (Hub 1 -> Summit -> Hub 3)
const alpinePassRoad = createBezierCurvedRoute(
  'road_alpine_pass',
  'Северный Тракт «Орлиный Пик» (Горный Серпантин)',
  [
    { x: 14400, y: 3880 },  // Hub 1 North
    { x: 15600, y: 2800 },  // Foothills
    { x: 17800, y: 1900 },  // Mountain gorge
    { x: 21000, y: 1100 },  // Pine switchback
    { x: 25500, y: 700 },   // Summit Crest
    { x: 30000, y: 1200 },  // East ridge descent
    { x: 33500, y: 2300 },  // Valley entry
    { x: 36000, y: 3880 }   // Hub 3 North
  ],
  { width: 96, speedLimit: 85 }
);

wire2LaneTo4LaneHub(alpinePassRoad, hw1, hw2, 'inter_highway_hub1', true);
wire2LaneTo4LaneHub(alpinePassRoad, hw3, hw4, 'inter_highway_hub3', true);

// B. Dead-End 1: Summit Meteo Station (Hub 2 North -> 23600, 450)
const deadEndNorth = createBezierCurvedRoute(
  'road_deadend_north',
  'Подъём на Сопку-7 (Тупик: Метеостанция)',
  [
    { x: 24000, y: 3880 },  // Hub 2 North
    { x: 23200, y: 3000 },
    { x: 24600, y: 2100 },
    { x: 22800, y: 1350 },
    { x: 24200, y: 800 },
    { x: 23600, y: 450 }    // Summit
  ],
  { width: 96, speedLimit: 65 }
);

wire2LaneTo4LaneHub(deadEndNorth, hw2, hw3, 'inter_highway_hub2', true);

const nFWp = deadEndNorth.lanePaths[0].waypoints[deadEndNorth.lanePaths[0].waypoints.length - 1];
const nRWp = deadEndNorth.lanePaths[1].waypoints[0];
const northTurnaroundArc = generateTurnaroundLoop(nFWp, nRWp, { x: 23600, y: 280 }, 14);
connectLanes(deadEndNorth.lanePaths[0], deadEndNorth.lanePaths[1], 'turnaround', northTurnaroundArc, 'inter_deadend_north_summit');

newIntersections.push({
  id: 'inter_deadend_north_summit',
  x: 23600,
  y: 450,
  width: 180,
  height: 180,
  type: 'turnaround',
  trafficLight: false,
  phases: []
});

// C. Southern Canyon Bypass Circuit (Hub 1 South -> Canyon Rim -> Hub 3 South)
const canyonCircuit = createBezierCurvedRoute(
  'road_canyon_circuit',
  'Каньонное Шоссе «Красные Скалы»',
  [
    { x: 14400, y: 4120 },  // Hub 1 South
    { x: 16200, y: 6500 },
    { x: 19500, y: 9800 },
    { x: 24000, y: 12000 }, // Canyon central fork
    { x: 29000, y: 9500 },
    { x: 33000, y: 6200 },
    { x: 36000, y: 4120 }   // Hub 3 South
  ],
  { width: 96, speedLimit: 85 }
);

wire2LaneTo4LaneHub(canyonCircuit, hw1, hw2, 'inter_highway_hub1', false);
wire2LaneTo4LaneHub(canyonCircuit, hw3, hw4, 'inter_highway_hub3', false);

// D. Dead-End 2: Red Canyon Quarry Descent (Hub 2 South -> 24000, 18500)
const deadEndCanyon = createBezierCurvedRoute(
  'road_deadend_canyon',
  'Спуск в Карьер (Тупик: Красный Каньон)',
  [
    { x: 24000, y: 4120 },   // Hub 2 South
    { x: 23200, y: 7200 },
    { x: 25000, y: 10500 },
    { x: 23400, y: 14200 },
    { x: 24800, y: 16800 },
    { x: 24000, y: 18500 }   // Quarry Plateau
  ],
  { width: 96, speedLimit: 65 }
);

wire2LaneTo4LaneHub(deadEndCanyon, hw2, hw3, 'inter_highway_hub2', false);

const cFWp = deadEndCanyon.lanePaths[0].waypoints[deadEndCanyon.lanePaths[0].waypoints.length - 1];
const cRWp = deadEndCanyon.lanePaths[1].waypoints[0];
const canyonTurnaroundArc = generateTurnaroundLoop(cFWp, cRWp, { x: 24000, y: 18700 }, 14);
connectLanes(deadEndCanyon.lanePaths[0], deadEndCanyon.lanePaths[1], 'turnaround', canyonTurnaroundArc, 'inter_deadend_canyon_terminal');

newIntersections.push({
  id: 'inter_deadend_canyon_terminal',
  x: 24000,
  y: 18500,
  width: 180,
  height: 180,
  type: 'turnaround',
  trafficLight: false,
  phases: []
});

// E. Southern Dunes Loop (Canyon Center 24000, 12000 -> Dunes -> Hub 4)
const dunesLoop = createBezierCurvedRoute(
  'road_dunes_express',
  'Барханная Трасса «Золотые Пески»',
  [
    { x: 24000, y: 12000 }, // Canyon central junction
    { x: 28000, y: 17500 },
    { x: 33000, y: 22000 },
    { x: 39000, y: 24500 },
    { x: 44500, y: 20000 },
    { x: 48000, y: 4120 }   // Hub 4 South
  ],
  { width: 96, speedLimit: 90 }
);

wire2LaneTo4LaneHub(dunesLoop, hw3, hw4, 'inter_highway_hub4', false);

// Wire fork between canyonCircuit and dunesLoop at (24000, 12000)
newIntersections.push({
  id: 'inter_canyon_dunes_fork',
  x: 24000,
  y: 12000,
  width: 160,
  height: 160,
  type: 'fork',
  trafficLight: false,
  phases: []
});

// Connect dunesLoop start to canyonCircuit forward/return
const dLF = dunesLoop.lanePaths[0];
const dLR = dunesLoop.lanePaths[1];
const cCF = canyonCircuit.lanePaths[0];
const cCR = canyonCircuit.lanePaths[1];

// Find closest waypoints on canyonCircuit near (24000, 12000)
let closestCFIdx = 0, minCFDist = Infinity;
cCF.waypoints.forEach((wp, idx) => {
  const d = Math.hypot(wp.x - 24000, wp.y - 12000);
  if (d < minCFDist) { minCFDist = d; closestCFIdx = idx; }
});

if (dLF.waypoints.length > 0 && closestCFIdx < cCF.waypoints.length) {
  const midWp = cCF.waypoints[closestCFIdx];
  const turnWps = bezier2(midWp, { x: 24000, y: 12100 }, dLF.waypoints[0], 6);
  connectLanes(cCF, dLF, 'right', turnWps, 'inter_canyon_dunes_fork');
}
if (dLR.waypoints.length > 0 && closestCFIdx < cCR.waypoints.length) {
  const startWp = dLR.waypoints[dLR.waypoints.length - 1];
  const targetWp = cCR.waypoints[closestCFIdx];
  const turnWps = bezier2(startWp, { x: 24000, y: 12100 }, targetWp, 6);
  connectLanes(dLR, cCR, 'left', turnWps, 'inter_canyon_dunes_fork');
}

// F. Dead-End 3: Far East Border Gate (Hub 4 -> 50800, 27500)
const deadEndEast = createBezierCurvedRoute(
  'road_deadend_east',
  'Восточный Рубеж (Тупик: Погранзастава)',
  [
    { x: 48000, y: 3880 },  // Hub 4 North
    { x: 49800, y: 8500 },
    { x: 48600, y: 14000 },
    { x: 50400, y: 19500 },
    { x: 49200, y: 24000 },
    { x: 50800, y: 27500 }  // Remote Border Gate
  ],
  { width: 96, speedLimit: 75 }
);

wire2LaneTo4LaneHub(deadEndEast, hw3, hw4, 'inter_highway_hub4', true);

const eFWp = deadEndEast.lanePaths[0].waypoints[deadEndEast.lanePaths[0].waypoints.length - 1];
const eRWp = deadEndEast.lanePaths[1].waypoints[0];
const eastTurnaroundArc = generateTurnaroundLoop(eFWp, eRWp, { x: 51000, y: 27500 }, 14);
connectLanes(deadEndEast.lanePaths[0], deadEndEast.lanePaths[1], 'turnaround', eastTurnaroundArc, 'inter_deadend_east_terminal');

newIntersections.push({
  id: 'inter_deadend_east_terminal',
  x: 50800,
  y: 27500,
  width: 180,
  height: 180,
  type: 'turnaround',
  trafficLight: false,
  phases: []
});

// G. Village Polynovka Connection
const villageAccess = map.roads.find(r => r.id === 'road_village_access');
if (villageAccess) {
  villageAccess.y2 = 4000;
  const vS = villageAccess.lanePaths.find(lp => lp.laneId === 'road_village_access_s');
  const vN = villageAccess.lanePaths.find(lp => lp.laneId === 'road_village_access_n');
  if (vS && vS.waypoints.length > 0) {
    vS.waypoints[vS.waypoints.length - 1] = { x: 11376, y: 4000 };
  }
  if (vN && vN.waypoints.length > 0) {
    vN.waypoints[0] = { x: 11424, y: 4000 };
  }

  const hwR0 = hw1.lanePaths.find(lp => lp.laneId === 'road_highway_m12_seg1_r0');
  const hwF0 = hw1.lanePaths.find(lp => lp.laneId === 'road_highway_m12_seg1_f0');
  if (vS && hwR0) {
    const turnWps = bezier2({ x: 11376, y: 3900 }, { x: 11350, y: 3930 }, { x: 11200, y: 3928 }, 8);
    connectLanes(vS, hwR0, 'right', turnWps, 'inter_village_turnoff');
  }
  if (hwF0 && vN) {
    const turnWps = bezier2({ x: 11200, y: 4072 }, { x: 11350, y: 4070 }, { x: 11424, y: 3900 }, 8);
    connectLanes(hwF0, vN, 'left', turnWps, 'inter_village_turnoff');
  }
}

newIntersections.push({
  id: 'inter_village_turnoff',
  x: 11400,
  y: 4000,
  width: 200,
  height: 200,
  type: '3way',
  trafficLight: false,
  phases: []
});

// Kilometer markers
for (let km = 10; km <= 46; km += 2) {
  const x = km * 1000;
  newProps.push({
    id: `km_post_${km}`,
    type: 'road_sign_km',
    x,
    y: 3890,
    width: 14,
    height: 14,
    kmNumber: km
  });
}

// Assemble final map
map.roads = [...map.roads, ...newRoads];
map.intersections = [...map.intersections, ...newIntersections];
map.props = [...map.props, ...newProps];

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');

console.log('=== NETWORK CLEANED & REBUILT ===');
console.log('Total roads:', map.roads.length);
console.log('Total intersections:', map.intersections.length);
console.log('Non-city intersections:');
map.intersections.filter(i => i.x > 7900 || i.y > 7900).forEach(i => console.log('  -', i.id, i.x, i.y, i.type));

import { 
  Bird,
  Building, 
  CarConfig,
  CarType, 
  GameWorld, 
  Intersection, 
  LitterItem,
  ParkingArea, 
  Pedestrian, 
  Puddle,
  RoadSegment, 
  StreetProp, 
  Tree, 
  Vector2D, 
  Vehicle,
  VehicleDamage 
} from './types';

export function createDefaultVehicleDamage(length: number = 42, width: number = 20): VehicleDamage {
  const halfL = length / 2;
  const halfW = width / 2;

  // 16 points surrounding the perimeter of the car in local coordinates
  const deformedVertices = [
    { localX: halfL, localY: 0, offsetX: 0, offsetY: 0 },
    { localX: halfL - 0.5, localY: halfW * 0.5, offsetX: 0, offsetY: 0 },
    { localX: halfL - 2.5, localY: halfW - 1.5, offsetX: 0, offsetY: 0 },
    { localX: halfL * 0.5, localY: halfW, offsetX: 0, offsetY: 0 },
    { localX: 0, localY: halfW, offsetX: 0, offsetY: 0 },
    { localX: -halfL * 0.5, localY: halfW, offsetX: 0, offsetY: 0 },
    { localX: -halfL + 2.5, localY: halfW - 1.5, offsetX: 0, offsetY: 0 },
    { localX: -halfL + 0.5, localY: halfW * 0.5, offsetX: 0, offsetY: 0 },
    { localX: -halfL, localY: 0, offsetX: 0, offsetY: 0 },
    { localX: -halfL + 0.5, localY: -halfW * 0.5, offsetX: 0, offsetY: 0 },
    { localX: -halfL + 2.5, localY: -halfW + 1.5, offsetX: 0, offsetY: 0 },
    { localX: -halfL * 0.5, localY: -halfW, offsetX: 0, offsetY: 0 },
    { localX: 0, localY: -halfW, offsetX: 0, offsetY: 0 },
    { localX: halfL * 0.5, localY: -halfW, offsetX: 0, offsetY: 0 },
    { localX: halfL - 2.5, localY: -halfW + 1.5, offsetX: 0, offsetY: 0 },
    { localX: halfL - 0.5, localY: -halfW * 0.5, offsetX: 0, offsetY: 0 }
  ];

  return {
    health: 100,
    frontCrumple: 0,
    rearCrumple: 0,
    leftDent: 0,
    rightDent: 0,
    frontLeftDent: 0,
    frontRightDent: 0,
    rearLeftDent: 0,
    rearRightDent: 0,
    hoodBuckled: false,
    windshieldCracked: false,
    rearGlassCracked: false,
    leftHeadlightBroken: false,
    rightHeadlightBroken: false,
    leftTaillightBroken: false,
    rightTaillightBroken: false,
    engineSmoking: false,
    engineFire: false,
    scratches: [],
    deformedVertices
  };
}

export const CAR_CONFIGS: Record<CarType, CarConfig> = {
  sedan: {
    type: 'sedan',
    width: 20,
    length: 42,
    wheelBase: 26,
    mass: 1400,
    maxSpeed: 210,
    reverseMaxSpeed: 80,
    acceleration: 115,
    brakingForce: 240,
    friction: 0.988,
    turnSpeed: 4.2,
    maxSteerAngle: 0.75,
    minSteerAngle: 0.14,
    grip: 0.985,
    driftGrip: 0.38,
    name: 'Executive Sedan'
  },
  hatchback: {
    type: 'hatchback',
    width: 19,
    length: 38,
    wheelBase: 23,
    mass: 1150,
    maxSpeed: 200,
    reverseMaxSpeed: 75,
    acceleration: 125,
    brakingForce: 250,
    friction: 0.988,
    turnSpeed: 4.5,
    maxSteerAngle: 0.78,
    minSteerAngle: 0.15,
    grip: 0.988,
    driftGrip: 0.40,
    name: 'Compact Hatch'
  },
  pickup: {
    type: 'pickup',
    width: 22,
    length: 48,
    wheelBase: 30,
    mass: 2200,
    maxSpeed: 185,
    reverseMaxSpeed: 70,
    acceleration: 95,
    brakingForce: 220,
    friction: 0.985,
    turnSpeed: 3.6,
    maxSteerAngle: 0.68,
    minSteerAngle: 0.12,
    grip: 0.975,
    driftGrip: 0.32,
    name: 'Heavy Duty 4x4'
  },
  sports: {
    type: 'sports',
    width: 21,
    length: 44,
    wheelBase: 27,
    mass: 1320,
    maxSpeed: 260,
    reverseMaxSpeed: 95,
    acceleration: 155,
    brakingForce: 290,
    friction: 0.990,
    turnSpeed: 4.6,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.13,
    grip: 0.990,
    driftGrip: 0.44,
    name: 'Apex GT Turbo'
  },
  suv: {
    type: 'suv',
    width: 22,
    length: 46,
    wheelBase: 28,
    mass: 1950,
    maxSpeed: 195,
    reverseMaxSpeed: 75,
    acceleration: 105,
    brakingForce: 230,
    friction: 0.986,
    turnSpeed: 3.8,
    maxSteerAngle: 0.70,
    minSteerAngle: 0.13,
    grip: 0.980,
    driftGrip: 0.34,
    name: 'Vanguard SUV'
  },
  taxi: {
    type: 'taxi',
    width: 20,
    length: 42,
    wheelBase: 26,
    mass: 1450,
    maxSpeed: 205,
    reverseMaxSpeed: 80,
    acceleration: 120,
    brakingForce: 245,
    friction: 0.988,
    turnSpeed: 4.2,
    maxSteerAngle: 0.75,
    minSteerAngle: 0.14,
    grip: 0.985,
    driftGrip: 0.38,
    name: 'City Yellow Cab'
  },
  police: {
    type: 'police',
    width: 21,
    length: 44,
    wheelBase: 27,
    mass: 1650,
    maxSpeed: 245,
    reverseMaxSpeed: 90,
    acceleration: 140,
    brakingForce: 275,
    friction: 0.989,
    turnSpeed: 4.4,
    maxSteerAngle: 0.74,
    minSteerAngle: 0.13,
    grip: 0.988,
    driftGrip: 0.40,
    name: 'Interceptor Cruiser'
  }
};

const CAR_PALETTE = [
  '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', 
  '#0891b2', '#e11d48', '#4b5563', '#1e293b', '#f8fafc',
  '#f59e0b', '#059669', '#3b82f6', '#6366f1', '#84cc16'
];

const PED_SKIN_COLORS = ['#ffd1b3', '#fcd5b5', '#e0ac69', '#c68642', '#8d5524', '#59381e'];
const PED_SHIRT_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6', '#ffffff', '#1e293b'];
const PED_PANTS_COLORS = ['#1e293b', '#334155', '#1e3a8a', '#475569', '#78350f', '#0f172a'];
const PED_HAIR_COLORS = ['#18181b', '#451a03', '#78350f', '#ca8a04', '#71717a', '#b45309'];

// Helper: Cubic Bezier curve generator
export function generateBezierCurve(
  p0: Vector2D,
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D,
  steps: number = 8
): Vector2D[] {
  const points: Vector2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    const x = mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x;
    const y = mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y;
    points.push({ x, y });
  }
  return points;
}

// Helper: Semi-circular turnaround arc generator (adapted for 8000px size)
export function generateTurnaroundArc(
  fromPt: Vector2D,
  toPt: Vector2D,
  normalDir: Vector2D,
  steps: number = 12,
  worldSize: number = 8000
): Vector2D[] {
  const dist = Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y);
  const bulge = Math.max(45, Math.min(65, dist * 0.9));

  const p0 = fromPt;
  const p1 = { x: fromPt.x + normalDir.x * bulge, y: fromPt.y + normalDir.y * bulge };
  const p2 = { x: toPt.x + normalDir.x * bulge, y: toPt.y + normalDir.y * bulge };
  const p3 = toPt;

  const rawPoints = generateBezierCurve(p0, p1, p2, p3, steps);
  return rawPoints.map((pt) => ({
    x: Math.max(45, Math.min(worldSize - 45, pt.x)),
    y: Math.max(45, Math.min(worldSize - 45, pt.y))
  }));
}

export function generateCityWorld(): GameWorld {
  const WORLD_SIZE = 8000;
  
  // 9x9 grid coordinates creating potential intersections
  const vertRoadXs = [800, 1600, 2400, 3200, 4000, 4800, 5600, 6400, 7200];
  const horizRoadYs = [800, 1600, 2400, 3200, 4000, 4800, 5600, 6400, 7200];
  
  const roads: RoadSegment[] = [];
  const intersections: Intersection[] = [];
  const buildings: Building[] = [];
  const parkings: ParkingArea[] = [];
  const trees: Tree[] = [];
  const props: StreetProp[] = [];
  const vehicles: Vehicle[] = [];
  const pedestrians: Pedestrian[] = [];
  const puddles: Puddle[] = [];
  const pedestrianPaths: { id: string; waypoints: Vector2D[]; isCrosswalk?: boolean; crosswalkRef?: string }[] = [];

  const getRoadWidth = (isAvenue: boolean) => (isAvenue ? 144 : 84);

  const getRoadWidthAtCol = (colIdx: number) => {
    if (colIdx < 0 || colIdx >= vertRoadXs.length) return 84;
    const colIsAvenue = colIdx === 4 || colIdx === 6; // Silicon Highway (4), Metro Ave (6)
    return colIsAvenue ? 144 : 84;
  };

  const getRoadWidthAtRow = (rowIdx: number) => {
    if (rowIdx < 0 || rowIdx >= horizRoadYs.length) return 84;
    const rowIsAvenue = rowIdx === 2 || rowIdx === 4; // Grand Boulevard (2), Central Avenue (4)
    return rowIsAvenue ? 144 : 84;
  };

  // Organic layout layout checks to break grid patterns into forest trails & country lanes
  const shouldRoadExist = (type: 'h' | 'v', lineIdx: number, segIdx: number): boolean => {
    if (type === 'h') {
      const r = lineIdx;
      const c = segIdx;
      
      // Forest Winding Trail segments
      if (r === 0 && c === 1) return true;
      if (r === 1 && c === 1) return true;
      if (r === 1 && c === 2) return true;
      
      // Standard horizontal segments
      if (r === 0) return c >= 4; // Downtown
      if (r === 1) return c >= 4; // Downtown
      if (r === 2) return c >= 1; // Major artery Grand Boulevard (reaches Forest edge)
      if (r === 3) return c >= 3; // Downtown transition
      if (r === 4) return true;   // Central Avenue (everywhere)
      if (r === 5) return c <= 6; // West/Center connection
      if (r === 6) return c >= 2; // Southern connection / Village
      if (r === 7) return c >= 5; // Village
      if (r === 8) return c >= 4; // Village bottom
      return false;
    } else {
      const c = lineIdx;
      const r = segIdx;
      
      // Forest Winding Trail segments
      if (c === 1 && (r === 0 || r === 1)) return true;
      
      // Standard vertical segments
      if (c === 0) return r >= 2 && r <= 6; // West boundary highway
      if (c === 1) return r >= 4;           // Southwest country connection
      if (c === 2) return r >= 1 && r <= 8; // Mid-West corridor
      if (c === 3) return r >= 2 && r <= 7; // Mid-West transition
      if (c === 4) return true;             // Silicon Highway (everywhere)
      if (c === 5) return r >= 1 && r <= 8; // Downtown/Village
      if (c === 6) return r >= 0 && r <= 8; // Downtown/Village
      if (c === 7) return r >= 1 && r <= 9; // Downtown/Village
      if (c === 8) return r >= 0 && r <= 8; // Downtown/Village
      return false;
    }
  };

  const shouldIntersectionExist = (r: number, c: number): boolean => {
    const west = shouldRoadExist('h', r, c);
    const east = shouldRoadExist('h', r, c + 1);
    const north = shouldRoadExist('v', c, r);
    const south = shouldRoadExist('v', c, r + 1);
    return west || east || north || south;
  };

  const hRoadNames = [
    'Pine Ridge Trail',
    'Whispering Woods Road',
    'Grand Boulevard',
    'Broadway Avenue',
    'Central Avenue',
    'Riverbed Lane',
    'Meadow Lane',
    'Cottage Road',
    'Daisy Lane'
  ];

  const vRoadNames = [
    'Pacific Highway',
    'Forest Trail',
    'Oak Ridge Road',
    'Parkside Road',
    'Silicon Highway',
    'Commerce Drive',
    'Metro Avenue',
    'Financial Way',
    'Maple Drive'
  ];

  // 1. GENERATE INTERSECTIONS
  for (let r = 0; r < horizRoadYs.length; r++) {
    for (let c = 0; c < vertRoadXs.length; c++) {
      if (!shouldIntersectionExist(r, c)) continue;

      const cx = vertRoadXs[c];
      const cy = horizRoadYs[r];
      const isAvenueH = r === 2 || r === 4;
      const isAvenueV = c === 4 || c === 6;
      const width = getRoadWidth(isAvenueV);
      const height = getRoadWidth(isAvenueH);

      const intersectionId = `inter_${r}_${c}`;
      
      const halfW = width / 2;
      const halfH = height / 2;
      const stopLineOffset = 18;
      const crosswalkWidth = 22;

      const stopLines: Intersection['stopLines'] = [
        { direction: 'north', x1: cx - halfW, y1: cy - halfH - stopLineOffset, x2: cx, y2: cy - halfH - stopLineOffset, lightState: 'green' },
        { direction: 'south', x1: cx, y1: cy + halfH + stopLineOffset, x2: cx + halfW, y2: cy + halfH + stopLineOffset, lightState: 'green' },
        { direction: 'east', x1: cx + halfW + stopLineOffset, y1: cy - halfH, x2: cx + halfW + stopLineOffset, y2: cy, lightState: 'red' },
        { direction: 'west', x1: cx - halfW - stopLineOffset, y1: cy, x2: cx - halfW - stopLineOffset, y2: cy + halfH, lightState: 'red' }
      ];

      const crosswalks: Intersection['crosswalks'] = [
        { id: `cw_${intersectionId}_n`, direction: 'north', x: cx - halfW, y: cy - halfH - crosswalkWidth, width: width, height: crosswalkWidth, pedestrianSignal: 'wait' },
        { id: `cw_${intersectionId}_s`, direction: 'south', x: cx - halfW, y: cy + halfH, width: width, height: crosswalkWidth, pedestrianSignal: 'wait' },
        { id: `cw_${intersectionId}_w`, direction: 'west', x: cx - halfW - crosswalkWidth, y: cy - halfH, width: crosswalkWidth, height: height, pedestrianSignal: 'walk' },
        { id: `cw_${intersectionId}_e`, direction: 'east', x: cx + halfW, y: cy - halfH, width: crosswalkWidth, height: height, pedestrianSignal: 'walk' }
      ];

      const initialPhaseIndex = (r + c) % 4;

      intersections.push({
        id: intersectionId,
        x: cx,
        y: cy,
        width,
        height,
        type: '4way',
        hasLights: !((cx < 3800 && cy < 3800) || (cx > 3800 && cy > 3800)), // No traffic lights deep in the Forest or Country Village!
        currentPhaseIndex: initialPhaseIndex,
        phaseTimer: Math.random() * 4,
        phases: [
          { nsState: 'green', ewState: 'red', duration: 10.0 },
          { nsState: 'yellow', ewState: 'red', duration: 3.0 },
          { nsState: 'red', ewState: 'red_yellow', duration: 1.5 },
          { nsState: 'red', ewState: 'green', duration: 10.0 },
          { nsState: 'red', ewState: 'yellow', duration: 3.0 },
          { nsState: 'red_yellow', ewState: 'red', duration: 1.5 }
        ],
        stopLines,
        crosswalks
      });

      // Generate 4 breakable traffic light props at the corners of this intersection (only if it has lights!)
      if (!((cx < 3800 && cy < 3800) || (cx > 3800 && cy > 3800))) {
        props.push(
          { id: `traffic_light_${intersectionId}_north`, x: cx - halfW - 6, y: cy - halfH - 6, type: 'traffic_light', angle: -Math.PI / 2, intersectionId, direction: 'north' },
          { id: `traffic_light_${intersectionId}_south`, x: cx + halfW + 6, y: cy + halfH + 6, type: 'traffic_light', angle: Math.PI / 2, intersectionId, direction: 'south' },
          { id: `traffic_light_${intersectionId}_east`, x: cx + halfW + 6, y: cy - halfH - 6, type: 'traffic_light', angle: 0, intersectionId, direction: 'east' },
          { id: `traffic_light_${intersectionId}_west`, x: cx - halfW - 6, y: cy + halfH + 6, type: 'traffic_light', angle: Math.PI, intersectionId, direction: 'west' }
        );
      }
    }
  }

  // 2. GENERATE ROAD SEGMENTS
  // Horizontal Road Segments
  for (let r = 0; r < horizRoadYs.length; r++) {
    const y = horizRoadYs[r];
    const isAvenue = r === 2 || r === 4; // Grand Boulevard, Central Avenue
    const roadName = hRoadNames[r];

    const xPoints = [0, ...vertRoadXs, WORLD_SIZE];
    for (let i = 0; i < xPoints.length - 1; i++) {
      if (!shouldRoadExist('h', r, i)) continue;

      const segX1 = xPoints[i];
      const segX2 = xPoints[i + 1];
      const segmentId = `road_h_${r}_${i}`;

      // Check if dirt or gravel
      const isDirt = r < 3 && i < 4;
      const isGravel = r >= 5 && i >= 4;
      const roadWidth = isAvenue ? 144 : (isDirt || isGravel ? 64 : 84);
      const lanes = isAvenue ? 4 : 2;

      const lanePaths: RoadSegment['lanePaths'] = [];
      const laneWidth = roadWidth / lanes;

      const startBoundaryPad = i === 0 ? 130 : getRoadWidthAtCol(i - 1) / 2;
      const endBoundaryPad = i === xPoints.length - 2 ? 130 : getRoadWidthAtCol(i) / 2;

      const laneX1 = segX1 + startBoundaryPad;
      const laneX2 = segX2 - endBoundaryPad;

      if (lanes === 4) {
        // Upper 2 lanes go West (-X)
        lanePaths.push({
          laneId: `${segmentId}_w0`,
          laneIndex: 0,
          direction: Math.PI,
          waypoints: [{ x: laneX2, y: y - laneWidth * 1.5 }, { x: laneX1, y: y - laneWidth * 1.5 }]
        });
        lanePaths.push({
          laneId: `${segmentId}_w1`,
          laneIndex: 1,
          direction: Math.PI,
          waypoints: [{ x: laneX2, y: y - laneWidth * 0.5 }, { x: laneX1, y: y - laneWidth * 0.5 }]
        });
        // Lower 2 lanes go East (+X)
        lanePaths.push({
          laneId: `${segmentId}_e1`,
          laneIndex: 2,
          direction: 0,
          waypoints: [{ x: laneX1, y: y + laneWidth * 0.5 }, { x: laneX2, y: y + laneWidth * 0.5 }]
        });
        lanePaths.push({
          laneId: `${segmentId}_e0`,
          laneIndex: 3,
          direction: 0,
          waypoints: [{ x: laneX1, y: y + laneWidth * 1.5 }, { x: laneX2, y: y + laneWidth * 1.5 }]
        });
      } else {
        // 2 lanes: Upper goes West, Lower goes East
        lanePaths.push({
          laneId: `${segmentId}_w0`,
          laneIndex: 0,
          direction: Math.PI,
          waypoints: [{ x: laneX2, y: y - laneWidth * 0.5 }, { x: laneX1, y: y - laneWidth * 0.5 }]
        });
        lanePaths.push({
          laneId: `${segmentId}_e0`,
          laneIndex: 1,
          direction: 0,
          waypoints: [{ x: laneX1, y: y + laneWidth * 0.5 }, { x: laneX2, y: y + laneWidth * 0.5 }]
        });
      }

      roads.push({
        id: segmentId,
        x1: segX1,
        y1: y,
        x2: segX2,
        y2: y,
        lanes,
        width: roadWidth,
        isAvenue,
        isDirt,
        isGravel,
        direction: 'horizontal',
        name: roadName,
        lanePaths
      });
    }
  }

  // Vertical Road Segments
  for (let c = 0; c < vertRoadXs.length; c++) {
    const x = vertRoadXs[c];
    const isAvenue = c === 4 || c === 6; // Silicon Highway, Commerce Drive
    const roadName = vRoadNames[c];

    const yPoints = [0, ...horizRoadYs, WORLD_SIZE];
    for (let i = 0; i < yPoints.length - 1; i++) {
      if (!shouldRoadExist('v', c, i)) continue;

      const segY1 = yPoints[i];
      const segY2 = yPoints[i + 1];
      const segmentId = `road_v_${c}_${i}`;

      // Check if dirt or gravel
      const isDirt = c < 3 && i < 4;
      const isGravel = c >= 5 && i >= 4;
      const roadWidth = isAvenue ? 144 : (isDirt || isGravel ? 64 : 84);
      const lanes = isAvenue ? 4 : 2;

      const lanePaths: RoadSegment['lanePaths'] = [];
      const laneWidth = roadWidth / lanes;

      const startBoundaryPad = i === 0 ? 130 : getRoadWidthAtRow(i - 1) / 2;
      const endBoundaryPad = i === yPoints.length - 2 ? 130 : getRoadWidthAtRow(i) / 2;

      const laneY1 = segY1 + startBoundaryPad;
      const laneY2 = segY2 - endBoundaryPad;

      if (lanes === 4) {
        // In Right-Hand Traffic:
        // Left 2 lanes go South (+Y, from top to bottom) on West side (x - laneWidth)
        lanePaths.push({
          laneId: `${segmentId}_s0`,
          laneIndex: 0,
          direction: Math.PI / 2,
          waypoints: [{ x: x - laneWidth * 1.5, y: laneY1 }, { x: x - laneWidth * 1.5, y: laneY2 }]
        });
        lanePaths.push({
          laneId: `${segmentId}_s1`,
          laneIndex: 1,
          direction: Math.PI / 2,
          waypoints: [{ x: x - laneWidth * 0.5, y: laneY1 }, { x: x - laneWidth * 0.5, y: laneY2 }]
        });
        // Right 2 lanes go North (-Y, from bottom to top) on East side (x + laneWidth)
        lanePaths.push({
          laneId: `${segmentId}_n1`,
          laneIndex: 2,
          direction: -Math.PI / 2,
          waypoints: [{ x: x + laneWidth * 0.5, y: laneY2 }, { x: x + laneWidth * 0.5, y: laneY1 }]
        });
        lanePaths.push({
          laneId: `${segmentId}_n0`,
          laneIndex: 3,
          direction: -Math.PI / 2,
          waypoints: [{ x: x + laneWidth * 1.5, y: laneY2 }, { x: x + laneWidth * 1.5, y: laneY1 }]
        });
      } else {
        // 2 lanes: West side goes South (+Y), East side goes North (-Y)
        lanePaths.push({
          laneId: `${segmentId}_s0`,
          laneIndex: 0,
          direction: Math.PI / 2,
          waypoints: [{ x: x - laneWidth * 0.5, y: laneY1 }, { x: x - laneWidth * 0.5, y: laneY2 }]
        });
        lanePaths.push({
          laneId: `${segmentId}_n0`,
          laneIndex: 1,
          direction: -Math.PI / 2,
          waypoints: [{ x: x + laneWidth * 0.5, y: laneY2 }, { x: x + laneWidth * 0.5, y: laneY1 }]
        });
      }

      roads.push({
        id: segmentId,
        x1: x,
        y1: segY1,
        x2: x,
        y2: segY2,
        lanes,
        width: roadWidth,
        isAvenue,
        isDirt,
        isGravel,
        direction: 'vertical',
        name: roadName,
        lanePaths
      });
    }
  }

  // 2.5 BUILD EXPLICIT LANE CONNECTIONS & INTERSECTION TURNS
  const laneMap = new Map<string, RoadSegment['lanePaths'][0]>();
  roads.forEach((r) => r.lanePaths.forEach((lp) => laneMap.set(lp.laneId, lp)));

  // Generate intersection connections
  for (let r = 0; r < horizRoadYs.length; r++) {
    for (let c = 0; c < vertRoadXs.length; c++) {
      const cx = vertRoadXs[c];
      const cy = horizRoadYs[r];
      const isAvenueH = r === 2 || r === 4;
      const isAvenueV = c === 4 || c === 6;
      const width = getRoadWidth(isAvenueV);
      const height = getRoadWidth(isAvenueH);
      const halfW = width / 2;
      const halfH = height / 2;
      const interId = `inter_${r}_${c}`;

      const westRoad = roads.find((rd) => rd.id === `road_h_${r}_${c}`);
      const eastRoad = roads.find((rd) => rd.id === `road_h_${r}_${c + 1}`);
      const northRoad = roads.find((rd) => rd.id === `road_v_${c}_${r}`);
      const southRoad = roads.find((rd) => rd.id === `road_v_${c}_${r + 1}`);

      // --- DEAD-END TURNAROUND LOGIC ---
      // If only one road meets at this grid point, it's a dead end!
      // We dynamically inject 180-degree loops so AI vehicles turn around smoothly.
      const presentCount = (westRoad ? 1 : 0) + (eastRoad ? 1 : 0) + (northRoad ? 1 : 0) + (southRoad ? 1 : 0);
      if (presentCount === 1) {
        if (westRoad) {
          const inLanes = westRoad.lanePaths.filter((lp) => lp.direction === 0);
          const outLanes = westRoad.lanePaths.filter((lp) => lp.direction === Math.PI);
          inLanes.forEach((inLane, idx) => {
            const outLane = outLanes[idx % outLanes.length];
            const pStart = inLane.waypoints[inLane.waypoints.length - 1];
            const pEnd = outLane.waypoints[0];
            const arc = generateTurnaroundArc(pStart, pEnd, { x: 1, y: 0 }, 8, WORLD_SIZE);
            inLane.connections = inLane.connections || [];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'turnaround',
              pathWaypoints: arc
            });
          });
        } else if (eastRoad) {
          const inLanes = eastRoad.lanePaths.filter((lp) => lp.direction === Math.PI);
          const outLanes = eastRoad.lanePaths.filter((lp) => lp.direction === 0);
          inLanes.forEach((inLane, idx) => {
            const outLane = outLanes[idx % outLanes.length];
            const pStart = inLane.waypoints[inLane.waypoints.length - 1];
            const pEnd = outLane.waypoints[0];
            const arc = generateTurnaroundArc(pStart, pEnd, { x: -1, y: 0 }, 8, WORLD_SIZE);
            inLane.connections = inLane.connections || [];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'turnaround',
              pathWaypoints: arc
            });
          });
        } else if (northRoad) {
          const inLanes = northRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2);
          const outLanes = northRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2);
          inLanes.forEach((inLane, idx) => {
            const outLane = outLanes[idx % outLanes.length];
            const pStart = inLane.waypoints[inLane.waypoints.length - 1];
            const pEnd = outLane.waypoints[0];
            const arc = generateTurnaroundArc(pStart, pEnd, { x: 0, y: 1 }, 8, WORLD_SIZE);
            inLane.connections = inLane.connections || [];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'turnaround',
              pathWaypoints: arc
            });
          });
        } else if (southRoad) {
          const inLanes = southRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2);
          const outLanes = southRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2);
          inLanes.forEach((inLane, idx) => {
            const outLane = outLanes[idx % outLanes.length];
            const pStart = inLane.waypoints[inLane.waypoints.length - 1];
            const pEnd = outLane.waypoints[0];
            const arc = generateTurnaroundArc(pStart, pEnd, { x: 0, y: -1 }, 8, WORLD_SIZE);
            inLane.connections = inLane.connections || [];
            inLane.connections.push({
              targetLaneId: outLane.laneId,
              turnType: 'turnaround',
              pathWaypoints: arc
            });
          });
        }
        continue;
      }

      // --- WEST APPROACH: Eastbound traffic entering intersection from left ---
      if (westRoad) {
        westRoad.lanePaths.filter((lp) => lp.direction === 0).forEach((inLane) => {
          inLane.connections = inLane.connections || [];
          const pStart = inLane.waypoints[inLane.waypoints.length - 1];
          const isInnerLane = inLane.laneIndex === 2; // e1 inner on 4-lane
          const isOuterLane = inLane.laneIndex === 3; // e0 outer on 4-lane
          const isSingleLane = inLane.laneIndex === 1; // e0 single on 2-lane

          // 1. Straight to East Road (available to all lanes)
          if (eastRoad) {
            const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0 && lp.laneIndex === inLane.laneIndex) ||
                            eastRoad.lanePaths.find((lp) => lp.direction === 0);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'straight',
                pathWaypoints: [pStart, { x: (pStart.x + pEnd.x) / 2, y: pStart.y }, pEnd],
                intersectionId: interId,
                stopLineDirection: 'west'
              });
            }
          }

          // 2. Right Turn into South Road
          if ((isOuterLane || isSingleLane) && southRoad) {
            const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2 && (lp.laneIndex === 0 || lp.laneIndex === 2)) ||
                            southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: pStart.x + halfW * 0.55, y: pStart.y },
                { x: pEnd.x, y: pEnd.y - halfH * 0.55 },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'right',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'west'
              });
            }
          }

          // 3. Left Turn into North Road
          if ((isInnerLane || isSingleLane) && northRoad) {
            const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2 && lp.laneIndex === 1) ||
                            northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: cx - halfW * 0.1, y: pStart.y },
                { x: pEnd.x, y: cy + halfH * 0.1 },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'left',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'west'
              });
            }
          }
        });
      }

      // --- EAST APPROACH: Westbound traffic entering intersection from right ---
      if (eastRoad) {
        eastRoad.lanePaths.filter((lp) => lp.direction === Math.PI).forEach((inLane) => {
          inLane.connections = inLane.connections || [];
          const pStart = inLane.waypoints[inLane.waypoints.length - 1];
          const isInnerLane = inLane.laneIndex === 1; // w1 inner on 4-lane
          const isOuterLane = inLane.laneIndex === 0; // w0 outer on 4-lane
          const isSingleLane = inLane.laneIndex === 0; // w0 single on 2-lane

          // 1. Straight to West Road
          if (westRoad) {
            const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI && lp.laneIndex === inLane.laneIndex) ||
                            westRoad.lanePaths.find((lp) => lp.direction === Math.PI);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'straight',
                pathWaypoints: [pStart, { x: (pStart.x + pEnd.x) / 2, y: pStart.y }, pEnd],
                intersectionId: interId,
                stopLineDirection: 'east'
              });
            }
          }

          // 2. Right Turn into North Road
          if ((isOuterLane || isSingleLane) && northRoad) {
            const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2 && (lp.laneIndex === 3 || lp.laneIndex === 1)) ||
                            northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: pStart.x - halfW * 0.55, y: pStart.y },
                { x: pEnd.x, y: pEnd.y + halfH * 0.55 },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'right',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'east'
              });
            }
          }

          // 3. Left Turn into South Road
          if ((isInnerLane || isSingleLane) && southRoad) {
            const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2 && lp.laneIndex === 1) ||
                            southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: cx + halfW * 0.1, y: pStart.y },
                { x: pEnd.x, y: cy - halfH * 0.1 },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'left',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'east'
              });
            }
          }
        });
      }

      // --- NORTH APPROACH: Southbound traffic entering intersection from top ---
      if (northRoad) {
        northRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2).forEach((inLane) => {
          inLane.connections = inLane.connections || [];
          const pStart = inLane.waypoints[inLane.waypoints.length - 1];
          const isInnerLane = inLane.laneIndex === 1; // s1 inner on 4-lane
          const isOuterLane = inLane.laneIndex === 0; // s0 outer on 4-lane
          const isSingleLane = inLane.laneIndex === 0; // s0 single on 2-lane

          // 1. Straight to South Road
          if (southRoad) {
            const outLane = southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2 && lp.laneIndex === inLane.laneIndex) ||
                            southRoad.lanePaths.find((lp) => lp.direction === Math.PI / 2);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'straight',
                pathWaypoints: [pStart, { x: pStart.x, y: (pStart.y + pEnd.y) / 2 }, pEnd],
                intersectionId: interId,
                stopLineDirection: 'north'
              });
            }
          }

          // 2. Right Turn into West Road
          if ((isOuterLane || isSingleLane) && westRoad) {
            const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI && (lp.laneIndex === 3 || lp.laneIndex === 1)) ||
                            westRoad.lanePaths.find((lp) => lp.direction === Math.PI);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: pStart.x, y: pStart.y + halfH * 0.55 },
                { x: pEnd.x + halfW * 0.55, y: pEnd.y },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'right',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'north'
              });
            }
          }

          // 3. Left Turn into East Road
          if ((isInnerLane || isSingleLane) && eastRoad) {
            const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0 && lp.laneIndex === 1) ||
                            eastRoad.lanePaths.find((lp) => lp.direction === 0);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: pStart.x, y: cy - halfH * 0.1 },
                { x: cx + halfW * 0.1, y: pEnd.y },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'left',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'north'
              });
            }
          }
        });
      }

      // --- SOUTH APPROACH: Northbound traffic entering intersection from bottom ---
      if (southRoad) {
        southRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2).forEach((inLane) => {
          inLane.connections = inLane.connections || [];
          const pStart = inLane.waypoints[inLane.waypoints.length - 1];
          const isInnerLane = inLane.laneIndex === 2; // n1 inner on 4-lane
          const isOuterLane = inLane.laneIndex === 3; // n0 outer on 4-lane
          const isSingleLane = inLane.laneIndex === 1; // n0 single on 2-lane

          // 1. Straight to North Road
          if (northRoad) {
            const outLane = northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2 && lp.laneIndex === inLane.laneIndex) ||
                            northRoad.lanePaths.find((lp) => lp.direction === -Math.PI / 2);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'straight',
                pathWaypoints: [pStart, { x: pStart.x, y: (pStart.y + pEnd.y) / 2 }, pEnd],
                intersectionId: interId,
                stopLineDirection: 'south'
              });
            }
          }

          // 2. Right Turn into East Road (Outer lane or single lane)
          if ((isOuterLane || isSingleLane) && eastRoad) {
            const outLane = eastRoad.lanePaths.find((lp) => lp.direction === 0 && (lp.laneIndex === 3 || lp.laneIndex === 1)) ||
                            eastRoad.lanePaths.find((lp) => lp.direction === 0);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: pStart.x, y: pStart.y - halfH * 0.55 },
                { x: pEnd.x - halfW * 0.55, y: pEnd.y },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'right',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'south'
              });
            }
          }

          // 3. Left Turn into West Road (Inner lane or single lane)
          if ((isInnerLane || isSingleLane) && westRoad) {
            const outLane = westRoad.lanePaths.find((lp) => lp.direction === Math.PI && lp.laneIndex === 1) ||
                            westRoad.lanePaths.find((lp) => lp.direction === Math.PI);
            if (outLane) {
              const pEnd = outLane.waypoints[0];
              const curve = generateBezierCurve(
                pStart,
                { x: pStart.x, y: cy - halfH * 0.1 },
                { x: cx - halfW * 0.1, y: pEnd.y },
                pEnd,
                8
              );
              inLane.connections.push({
                targetLaneId: outLane.laneId,
                turnType: 'left',
                pathWaypoints: curve,
                intersectionId: interId,
                stopLineDirection: 'south'
              });
            }
          }
        });
      }
    }
  }

  // Generate Seamless 180-degree Turnaround Loops at World Boundaries
  // 1. Horizontal Roads West (x=0) and East (x=8000)
  for (let r = 0; r < horizRoadYs.length; r++) {
    // West Boundary (i=0): Westbound lanes terminate, loop to Eastbound lanes
    const westRoad = roads.find((rd) => rd.id === `road_h_${r}_0`);
    if (westRoad) {
      const inLanes = westRoad.lanePaths.filter((lp) => lp.direction === Math.PI);
      const outLanes = westRoad.lanePaths.filter((lp) => lp.direction === 0);
      inLanes.forEach((inLane, idx) => {
        const outLane = outLanes[idx % outLanes.length];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const arc = generateTurnaroundArc(pStart, pEnd, { x: -1, y: 0 }, 8, WORLD_SIZE);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({
          targetLaneId: outLane.laneId,
          turnType: 'turnaround',
          pathWaypoints: arc
        });
      });
    }

    // East Boundary (i=8): Eastbound lanes terminate, loop to Westbound lanes
    const eastRoad = roads.find((rd) => rd.id === `road_h_${r}_${vertRoadXs.length}`);
    if (eastRoad) {
      const inLanes = eastRoad.lanePaths.filter((lp) => lp.direction === 0);
      const outLanes = eastRoad.lanePaths.filter((lp) => lp.direction === Math.PI);
      inLanes.forEach((inLane, idx) => {
        const outLane = outLanes[idx % outLanes.length];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const arc = generateTurnaroundArc(pStart, pEnd, { x: 1, y: 0 }, 8, WORLD_SIZE);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({
          targetLaneId: outLane.laneId,
          turnType: 'turnaround',
          pathWaypoints: arc
        });
      });
    }
  }

  // 2. Vertical Roads North (y=0) and South (y=8000)
  for (let c = 0; c < vertRoadXs.length; c++) {
    // North Boundary (i=0): Northbound lanes terminate, loop to Southbound lanes
    const northRoad = roads.find((rd) => rd.id === `road_v_${c}_0`);
    if (northRoad) {
      const inLanes = northRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2);
      const outLanes = northRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2);
      inLanes.forEach((inLane, idx) => {
        const outLane = outLanes[idx % outLanes.length];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const arc = generateTurnaroundArc(pStart, pEnd, { x: 0, y: -1 }, 8, WORLD_SIZE);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({
          targetLaneId: outLane.laneId,
          turnType: 'turnaround',
          pathWaypoints: arc
        });
      });
    }

    // South Boundary (i=8): Southbound lanes terminate, loop to Northbound lanes
    const southRoad = roads.find((rd) => rd.id === `road_v_${c}_${horizRoadYs.length}`);
    if (southRoad) {
      const inLanes = southRoad.lanePaths.filter((lp) => lp.direction === Math.PI / 2);
      const outLanes = southRoad.lanePaths.filter((lp) => lp.direction === -Math.PI / 2);
      inLanes.forEach((inLane, idx) => {
        const outLane = outLanes[idx % outLanes.length];
        const pStart = inLane.waypoints[inLane.waypoints.length - 1];
        const pEnd = outLane.waypoints[0];
        const arc = generateTurnaroundArc(pStart, pEnd, { x: 0, y: 1 }, 8, WORLD_SIZE);
        inLane.connections = inLane.connections || [];
        inLane.connections.push({
          targetLaneId: outLane.laneId,
          turnType: 'turnaround',
          pathWaypoints: arc
        });
      });
    }
  }

  // 3. GENERATE SIDEWALK WALKWAYS & BUILDINGS WITHIN BLOCKS
  const allXBounds = [0, ...vertRoadXs, WORLD_SIZE];
  const allYBounds = [0, ...horizRoadYs, WORLD_SIZE];

  for (let by = 0; by < allYBounds.length - 1; by++) {
    for (let bx = 0; bx < allXBounds.length - 1; bx++) {
      const minX = allXBounds[bx];
      const maxX = allXBounds[bx + 1];
      const minY = allYBounds[by];
      const maxY = allYBounds[by + 1];

      const padLeft = (bx === 0 ? 55 : getRoadWidthAtCol(bx - 1) / 2 + 45);
      const padRight = (bx === allXBounds.length - 2 ? 55 : getRoadWidthAtCol(bx) / 2 + 45);
      const padTop = (by === 0 ? 55 : getRoadWidthAtRow(by - 1) / 2 + 45);
      const padBottom = (by === allYBounds.length - 2 ? 55 : getRoadWidthAtRow(by) / 2 + 45);

      const blockX = minX + padLeft;
      const blockY = minY + padTop;
      const blockW = (maxX - padRight) - blockX;
      const blockH = (maxY - padBottom) - blockY;

      if (blockW < 80 || blockH < 80) continue;

      const sidewalkOffset = 18;
      const swX1 = blockX - sidewalkOffset;
      const swY1 = blockY - sidewalkOffset;
      const swX2 = blockX + blockW + sidewalkOffset;
      const swY2 = blockY + blockH + sidewalkOffset;

      // --- FOREST ZONE (North-West) ---
      if (bx < 4 && by < 4) {
        // Populated with dense, rich natural tree canopies instead of roads or buildings
        const treeSpacing = 42;
        for (let tx = minX + 25; tx < maxX - 25; tx += treeSpacing) {
          for (let ty = minY + 25; ty < maxY - 25; ty += treeSpacing) {
            // Ensure trees do not overlap with active road segments
            let tooCloseToRoad = false;
            for (const r of roads) {
              const isH = r.direction === 'horizontal';
              if (isH) {
                if (tx >= r.x1 - 10 && tx <= r.x2 + 10 && Math.abs(ty - r.y1) < r.width / 2 + 35) tooCloseToRoad = true;
              } else {
                if (ty >= r.y1 - 10 && ty <= r.y2 + 10 && Math.abs(tx - r.x1) < r.width / 2 + 35) tooCloseToRoad = true;
              }
            }
            if (tooCloseToRoad) continue;

            if (Math.random() > 0.15) {
              const rRad = 15 + Math.random() * 15;
              const rX = tx + (Math.random() * 12 - 6);
              const rY = ty + (Math.random() * 12 - 6);
              // Multi-colored forest trees (shades of dark greens and golds)
              const rCol = Math.random() < 0.4 ? '#14532d' : (Math.random() < 0.75 ? '#166534' : (Math.random() < 0.9 ? '#15803d' : '#854d0e'));
              trees.push({
                id: `tree_forest_${rX.toFixed(0)}_${rY.toFixed(0)}`,
                x: rX,
                y: rY,
                radius: rRad,
                color: rCol,
                shadowOffset: 7
              });
            }
          }
        }

        // Add scenic clearings with campsite features in specific blocks
        if ((bx === 1 && by === 1) || (bx === 2 && by === 1)) {
          const clX = blockX + blockW / 2;
          const clY = blockY + blockH / 2;
          props.push(
            { id: `forest_bench_${bx}_${by}_1`, x: clX - 25, y: clY - 20, type: 'bench', angle: 0 },
            { id: `forest_bench_${bx}_${by}_2`, x: clX + 25, y: clY + 20, type: 'bench', angle: Math.PI }
          );
        }

        // Add majestic wildlife ponds deep in the woods
        if (bx === 1 && by === 2) {
          const cx = blockX + blockW / 2;
          const cy = blockY + blockH / 2;
          puddles.push({
            id: `pond_${bx}_${by}`,
            x: cx,
            y: cy,
            radiusX: 85 + Math.random() * 20,
            radiusY: 55 + Math.random() * 15,
            angle: Math.random() * Math.PI,
            rippleTimer: Math.random() * 10
          });
        }
        continue;
      }

      // --- COZY VILLAGE ZONE (South-East) ---
      if (bx >= 5 && by >= 6) {
        pedestrianPaths.push({
          id: `sidewalk_block_${bx}_${by}`,
          waypoints: [
            { x: swX1, y: swY1 },
            { x: swX2, y: swY1 },
            { x: swX2, y: swY2 },
            { x: swX1, y: swY2 },
            { x: swX1, y: swY1 }
          ]
        });

        // Cozy rustic cottage houses nestled with orchards & gardens
        const cW = 55 + Math.random() * 15;
        const cH = 55 + Math.random() * 15;

        // Cottage 1: Top-Left
        buildings.push({
          id: `cottage_${bx}_${by}_1`,
          x: blockX + 20,
          y: blockY + 20,
          width: cW,
          height: cH,
          type: 'suburban',
          color: '#fafaf9',
          roofColor: '#b91c1c',
          accentColor: '#f59e0b',
          windows: [],
          roofDetails: [],
          entranceSide: 'south'
        });

        // Cottage 2: Bottom-Right (Only if block is big enough)
        if (blockW > 160 && blockH > 160) {
          buildings.push({
            id: `cottage_${bx}_${by}_2`,
            x: blockX + blockW - cW - 20,
            y: blockY + blockH - cH - 20,
            width: cW,
            height: cH,
            type: 'suburban',
            color: '#7c2d12', // wood logs color
            roofColor: '#451a03',
            accentColor: '#d97706',
            windows: [],
            roofDetails: [],
            entranceSide: 'north'
          });
        }

        // Populate beautiful village orchard gardens
        for (let tx = blockX + 15; tx < blockX + blockW - 15; tx += 45) {
          for (let ty = blockY + 15; ty < blockY + blockH - 15; ty += 45) {
            // Don't overlap with cottages
            if (tx < blockX + cW + 40 && ty < blockY + cH + 40) continue;
            if (tx > blockX + blockW - cW - 45 && ty > blockY + blockH - cH - 45) continue;

            if (Math.random() > 0.4) {
              trees.push({
                id: `village_tree_${tx}_${ty}`,
                x: tx + (Math.random() * 10 - 5),
                y: ty + (Math.random() * 10 - 5),
                radius: 12 + Math.random() * 6,
                color: Math.random() > 0.5 ? '#22c55e' : '#15803d',
                shadowOffset: 5
              });
            }
          }
        }
        continue;
      }

      // --- MODERN DOWNTOWN ZONE (All other blocks) ---
      pedestrianPaths.push({
        id: `sidewalk_block_${bx}_${by}`,
        waypoints: [
          { x: swX1, y: swY1 },
          { x: swX2, y: swY1 },
          { x: swX2, y: swY2 },
          { x: swX1, y: swY2 },
          { x: swX1, y: swY1 }
        ]
      });

      // Majestic Central Plaza Park located in the middle of Downtown
      if (bx === 5 && by === 3) {
        const cx = blockX + blockW / 2;
        const cy = blockY + blockH / 2;

        buildings.push({
          id: `park_fountain_${bx}_${by}`,
          x: cx - 40,
          y: cy - 40,
          width: 80,
          height: 80,
          type: 'park_monument',
          color: '#38bdf8',
          roofColor: '#0284c7',
          accentColor: '#e0f2fe',
          roofDetails: [{ type: 'pool', rx: 0.1, ry: 0.1, rw: 0.8, rh: 0.8 }],
          windows: []
        });

        // Rows of park trees
        for (let tx = blockX + 40; tx < blockX + blockW - 40; tx += 60) {
          for (let ty = blockY + 40; ty < blockY + blockH - 40; ty += 60) {
            if (Math.hypot(tx - cx, ty - cy) > 70 && Math.random() > 0.3) {
              trees.push({
                id: `tree_${tx}_${ty}`,
                x: tx + (Math.random() * 16 - 8),
                y: ty + (Math.random() * 16 - 8),
                radius: 14 + Math.random() * 10,
                color: Math.random() > 0.5 ? '#15803d' : '#166534',
                shadowOffset: 6
              });
            }
          }
        }

        props.push(
          { id: `bench_${bx}_${by}_1`, x: cx - 90, y: cy, type: 'bench', angle: 0 },
          { id: `bench_${bx}_${by}_2`, x: cx + 90, y: cy, type: 'bench', angle: Math.PI },
          { id: `lamp_${bx}_${by}_1`, x: cx - 70, y: cy - 70, type: 'lamp', angle: 0 },
          { id: `lamp_${bx}_${by}_2`, x: cx + 70, y: cy + 70, type: 'lamp', angle: 0 },
          { id: `hydrant_${bx}_${by}_park`, x: cx - 110, y: cy - 30, type: 'hydrant', angle: 0 },
          { id: `kiosk_${bx}_${by}_park`, x: cx + 110, y: cy - 30, type: 'kiosk', angle: 0 }
        );
        continue;
      }

      // Parking plazas next to commercial skyscraper clusters
      if ((bx === 4 && by === 2) || (bx === 6 && by === 4)) {
        const parkW = blockW * 0.45;
        const parkH = blockH * 0.8;
        const pkX = blockX + 20;
        const pkY = blockY + 20;

        const spots: ParkingArea['spots'] = [];
        const numSpots = Math.floor(parkH / 45);
        for (let s = 0; s < numSpots; s++) {
          const sy = pkY + 25 + s * 40;
          spots.push({
            x: pkX + 35,
            y: sy,
            angle: 0,
            occupied: Math.random() > 0.35
          });
          spots.push({
            x: pkX + parkW - 35,
            y: sy,
            angle: Math.PI,
            occupied: Math.random() > 0.35
          });
        }

        parkings.push({
          id: `parking_${bx}_${by}`,
          x: pkX,
          y: pkY,
          width: parkW,
          height: parkH,
          spots
        });
      }

      // Tall high-density Downtown skyscrapers (Office, Commercial Shop, Residential, Industrial)
      const bCols = 2;
      const bRows = 2;
      const bSlotW = blockW / bCols;
      const bSlotH = blockH / bRows;

      for (let r = 0; r < bRows; r++) {
        for (let c = 0; c < bCols; c++) {
          let bxLocal = 0;
          let byLocal = 0;
          const bWidth = bSlotW - 28;
          const bHeight = bSlotH - 28;

          if (c === 0) {
            bxLocal = blockX + 10;
          } else {
            bxLocal = blockX + bSlotW + 18;
          }

          if (r === 0) {
            byLocal = blockY + 10;
          } else {
            byLocal = blockY + bSlotH + 18;
          }

          if (bWidth < 50 || bHeight < 50) continue;

          let bType: Building['type'] = 'residential';
          let color = '#334155';
          let roofColor = '#1e293b';
          let accent = '#94a3b8';

          const rand = Math.random();
          if (rand < 0.3) {
            bType = 'office';
            color = '#1e293b';
            roofColor = '#0f172a';
            accent = '#38bdf8';
          } else if (rand < 0.65) {
            bType = 'residential';
            color = '#475569';
            roofColor = '#334155';
            accent = '#f59e0b';
          } else if (rand < 0.85) {
            bType = 'shop';
            color = '#3f3f46';
            roofColor = '#27272a';
            accent = '#ef4444';
          } else {
            bType = 'industrial';
            color = '#52525b';
            roofColor = '#3f3f46';
            accent = '#10b981';
          }

          let entSide: 'north' | 'south' | 'east' | 'west' = 'north';
          if (r === 0 && c === 0) entSide = 'north';
          else if (r === 0 && c === 1) entSide = 'east';
          else if (r === 1 && c === 0) entSide = 'west';
          else if (r === 1 && c === 1) entSide = 'south';

          const balconies: Building['balconies'] = [];
          if (bType === 'residential') {
            const balLength = Math.max(12, bWidth * 0.18);
            balconies.push(
              { side: entSide, offset: 0.25, length: balLength, depth: 6 },
              { side: entSide, offset: 0.75, length: balLength, depth: 6 }
            );
          }

          const fireEscapes: Building['fireEscapes'] = [];
          if (bType === 'office' || bType === 'residential' || bType === 'industrial') {
            let oppositeSide: 'north' | 'south' | 'east' | 'west' = 'south';
            if (entSide === 'north') oppositeSide = 'south';
            else if (entSide === 'south') oppositeSide = 'north';
            else if (entSide === 'east') oppositeSide = 'west';
            else if (entSide === 'west') oppositeSide = 'east';

            fireEscapes.push({
              side: oppositeSide,
              offset: 0.5,
              length: Math.max(14, bWidth * 0.2),
              depth: 5
            });
          }

          buildings.push({
            id: `bld_${bx}_${by}_${r}_${c}`,
            x: bxLocal,
            y: byLocal,
            width: bWidth,
            height: bHeight,
            type: bType,
            color,
            roofColor,
            accentColor: accent,
            windows: [], // generated dynamically inside renderer
            balconies,
            fireEscapes,
            entranceSide: entSide,
            roofDetails: [] // filled dynamically with AC units/water towers in renderer
          });

          // Sidewalk trees
          if (Math.random() > 0.45) {
            trees.push({
              id: `tree_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth / 2 + (Math.random() * 10 - 5),
              y: byLocal + bHeight + 12,
              radius: 11 + Math.random() * 5,
              color: '#15803d',
              shadowOffset: 4
            });
          }

          // Scattered urban sidewalk elements
          if (Math.random() > 0.5) {
            props.push({
              id: `lamp_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth + 10,
              y: byLocal + bHeight + 10,
              type: 'lamp',
              angle: 0
            });
          }

          if (bType === 'shop' && c === 0 && r === 1) {
            props.push({
              id: `kiosk_${bxLocal}_${byLocal}`,
              x: bxLocal - 22,
              y: byLocal + 20,
              type: 'kiosk',
              angle: Math.PI / 2
            });
          }
        }
      }
    }
  }

  // Spawn the Player's Starting Off-Road Pickup Truck nearby!
  vehicles.push({
    id: `veh_player_starter`,
    type: 'pickup',
    x: 550,
    y: 550,
    vx: 0,
    vy: 0,
    angle: 0.8, // facing the trail
    steerAngle: 0,
    targetSteerAngle: 0,
    speed: 0,
    lateralVelocity: 0,
    angularVelocity: 0,
    isDrifting: false,
    driftFactor: 0,
    mass: CAR_CONFIGS['pickup'].mass,
    width: CAR_CONFIGS['pickup'].width,
    length: CAR_CONFIGS['pickup'].length,
    wheelBase: CAR_CONFIGS['pickup'].wheelBase,
    color: '#b45309', // beautiful amber-orange earth tone
    roofColor: '#b45309',
    headlightsOn: false,
    headlightMode: 'off',
    brakeLightsOn: false,
    isReversing: false,
    turnSignal: 'none',
    turnSignalTimer: 0,
    damage: createDefaultVehicleDamage(),
    isPlayerControlled: false,
    isParked: true,
    targetSpeed: 0,
    currentLaneId: null,
    targetWaypointIndex: 0,
    routeWaypoints: [],
    aiState: 'parked',
    inIntersection: false,
    plannedTurn: 'straight',
    stuckTimer: 0,
    honkTimer: 0,
    isHonking: false,
    hornEffectTimer: 0
  });

  // 4. SPAWN INITIAL VEHICLES (Moving AI vehicles + parked vehicles)
  const carTypes: CarType[] = ['sedan', 'hatchback', 'pickup', 'sports', 'suv', 'taxi', 'police'];
  let vehicleCounter = 0;

  roads.forEach((road) => {
    road.lanePaths.forEach((lane) => {
      const wp1 = lane.waypoints[0];
      const isForest = wp1.x < 3800 && wp1.y < 3800;
      // Spawn vehicles with appropriate gaps to avoid crashes on spawn
      // Keep forest roads mostly peaceful by spawning very few cars there
      const spawnChance = isForest ? 0.95 : 0.28;
      const shouldSpawn = Math.random() > spawnChance;
      if (!shouldSpawn) return;

      const wp2 = lane.waypoints[1];
      const progress = 0.25 + Math.random() * 0.5;
      const posX = wp1.x + (wp2.x - wp1.x) * progress;
      const posY = wp1.y + (wp2.y - wp1.y) * progress;

      const cType = carTypes[vehicleCounter % carTypes.length];
      const cfg = CAR_CONFIGS[cType];
      const color = cType === 'taxi' ? '#eab308' : (cType === 'police' ? '#0f172a' : CAR_PALETTE[vehicleCounter % CAR_PALETTE.length]);
      const roofColor = cType === 'police' ? '#f8fafc' : color;

      vehicles.push({
        id: `veh_traffic_${vehicleCounter++}`,
        type: cType,
        x: posX,
        y: posY,
        vx: Math.cos(lane.direction) * 105,
        vy: Math.sin(lane.direction) * 105,
        angle: lane.direction,
        steerAngle: 0,
        targetSteerAngle: 0,
        speed: 105,
        lateralVelocity: 0,
        angularVelocity: 0,
        isDrifting: false,
        driftFactor: 0,
        mass: cfg.mass,
        width: cfg.width,
        length: cfg.length,
        wheelBase: cfg.wheelBase,
        color,
        roofColor,
        headlightsOn: true,
        headlightMode: 'low',
        brakeLightsOn: false,
        isReversing: false,
        turnSignal: 'none',
        turnSignalTimer: 0,
        damage: createDefaultVehicleDamage(),
        isPlayerControlled: false,
        isParked: false,
        targetSpeed: 110 + Math.random() * 35,
        currentLaneId: lane.laneId,
        targetWaypointIndex: 1,
        routeWaypoints: [wp1, wp2],
        aiState: 'driving',
        inIntersection: false,
        plannedTurn: 'straight',
        recentTurns: [],
        justTurnedAround: false,
        ghostingAlpha: 1.0,
        stuckTimer: 0,
        honkTimer: 0,
        isHonking: false,
        hornEffectTimer: 0
      });
    });
  });

  // Parked vehicles in parking lots
  parkings.forEach((parking) => {
    parking.spots.forEach((spot) => {
      if (spot.occupied) {
        const cType = carTypes[Math.floor(Math.random() * (carTypes.length - 2))];
        const cfg = CAR_CONFIGS[cType];
        const color = CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
        const vehId = `veh_parked_${vehicleCounter++}`;
        spot.vehicleId = vehId;

        vehicles.push({
          id: vehId,
          type: cType,
          x: spot.x,
          y: spot.y,
          vx: 0,
          vy: 0,
          angle: spot.angle,
          steerAngle: 0,
          targetSteerAngle: 0,
          speed: 0,
          lateralVelocity: 0,
          angularVelocity: 0,
          isDrifting: false,
          driftFactor: 0,
          mass: cfg.mass,
          width: cfg.width,
          length: cfg.length,
          wheelBase: cfg.wheelBase,
          color,
          roofColor: color,
          headlightsOn: false,
          headlightMode: 'off',
          brakeLightsOn: false,
          isReversing: false,
          turnSignal: 'none',
          turnSignalTimer: 0,
          damage: createDefaultVehicleDamage(),
          isPlayerControlled: false,
          isParked: true,
          targetSpeed: 0,
          currentLaneId: null,
          targetWaypointIndex: 0,
          routeWaypoints: [],
          aiState: 'parked',
          inIntersection: false,
          plannedTurn: 'straight',
          stuckTimer: 0,
          honkTimer: 0,
          isHonking: false,
          hornEffectTimer: 0
        });
      }
    });
  });

  // 5. SPAWN INITIAL PEDESTRIANS (on sidewalks)
  let pedCounter = 0;
  pedestrianPaths.forEach((path) => {
    const numPeds = 2 + Math.floor(Math.random() * 2);
    for (let p = 0; p < numPeds; p++) {
      const wpIdx = Math.floor(Math.random() * (path.waypoints.length - 1));
      const wp1 = path.waypoints[wpIdx];
      const wp2 = path.waypoints[wpIdx + 1];
      const prog = Math.random();
      const px = wp1.x + (wp2.x - wp1.x) * prog;
      const py = wp1.y + (wp2.y - wp1.y) * prog;
      const angle = Math.atan2(wp2.y - wp1.y, wp2.x - wp1.x);

      const isCyclist = Math.random() < 0.08;
      const isScooter = !isCyclist && Math.random() < 0.06;
      const hasDog = !isCyclist && !isScooter && Math.random() < 0.07;
      const isChild = !isCyclist && !isScooter && Math.random() < 0.12;
      const hasBackpack = Math.random() < 0.3;
      const baseSpeed = isCyclist ? 110 : (isScooter ? 90 : (isChild ? 30 : 40));

      pedestrians.push({
        id: `ped_${pedCounter++}`,
        x: px,
        y: py,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        angle,
        speed: baseSpeed + Math.random() * 10,
        targetSpeed: baseSpeed + Math.random() * 15,
        skinColor: PED_SKIN_COLORS[Math.floor(Math.random() * PED_SKIN_COLORS.length)],
        shirtColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)],
        pantsColor: PED_PANTS_COLORS[Math.floor(Math.random() * PED_PANTS_COLORS.length)],
        hairColor: PED_HAIR_COLORS[Math.floor(Math.random() * PED_HAIR_COLORS.length)],
        walkCycle: Math.random() * Math.PI * 2,
        targetPathId: path.id,
        targetWaypointIndex: wpIdx + 1,
        routeWaypoints: path.waypoints,
        isCrossingRoad: false,
        waitingAtCurb: false,
        crosswalkWaitTimer: 0,
        crosswalkCooldownTimer: 8 + Math.random() * 12,
        targetCrosswalkId: null,
        state: 'walking',
        panicTimer: 0,
        behaviorTimer: 0,
        alertBubbleText: null,
        alertBubbleTimer: 0,
        isCyclist,
        isScooter,
        hasDog,
        isChild,
        hasBackpack,
        backpackColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)]
      });
    }
  });

  // 6. SPAWN INITIAL BIRDS (Pigeons & Sparrows nesting in gardens, lawns, and clearings)
  const birds: Bird[] = [];
  const parkCx = 4600;
  const parkCy = 2200;
  for (let b = 0; b < 40; b++) {
    // Some near Downtown Park, some near the village and forest camps
    const isForestBird = b % 3 === 0;
    const isVillageBird = b % 3 === 1;
    let rx = parkCx + (Math.random() * 600 - 300);
    let ry = parkCy + (Math.random() * 600 - 300);
    
    if (isForestBird) {
      rx = 1800 + (Math.random() * 1000 - 500);
      ry = 1800 + (Math.random() * 1000 - 500);
    } else if (isVillageBird) {
      rx = 6200 + (Math.random() * 800 - 400);
      ry = 6200 + (Math.random() * 800 - 400);
    }

    birds.push({
      id: `bird_${b}`,
      x: rx,
      y: ry,
      type: b % 2 === 0 ? 'pigeon' : 'sparrow',
      angle: Math.random() * Math.PI * 2,
      state: 'ground',
      altitude: 0,
      flyVX: 0,
      flyVY: 0,
      wingCycle: Math.random() * Math.PI * 2
    });
  }

  // 7. SPAWN ROAD PUDDLES
  roads.forEach((road, rIdx) => {
    if (rIdx % 2 === 0) {
      const px = road.direction === 'horizontal' ? (road.x1 + road.x2) / 2 + (Math.random() * 200 - 100) : road.x1;
      const py = road.direction === 'vertical' ? (road.y1 + road.y2) / 2 + (Math.random() * 200 - 100) : road.y1;
      puddles.push({
        id: `puddle_${rIdx}`,
        x: px,
        y: py,
        radiusX: 18 + Math.random() * 14,
        radiusY: 10 + Math.random() * 8,
        angle: Math.random() * Math.PI,
        rippleTimer: 0
      });
    }
  });

  // 8. SPAWN STREET LITTER & WIND DEBRIS
  const litter: LitterItem[] = [];
  let litterId = 0;

  // Scatter litter around buildings
  buildings.forEach((bld) => {
    for (let l = 0; l < 2; l++) {
      const lType: LitterItem['type'] = Math.random() < 0.35 ? 'paper' : 
                                       (Math.random() < 0.65 ? 'newspaper' : 
                                       (Math.random() < 0.8 ? 'cup' : 'can'));
      const lx = bld.x + Math.random() * (bld.width + 40) - 20;
      const ly = bld.y + bld.height + 15 + Math.random() * 20;

      litter.push({
        id: `litter_${litterId++}`,
        x: lx,
        y: ly,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
        type: lType,
        color: lType === 'newspaper' ? '#f1f5f9' : (lType === 'cup' ? '#ef4444' : (lType === 'can' ? '#2563eb' : '#ffffff')),
        size: lType === 'newspaper' ? 8 : (lType === 'paper' ? 6 : 4),
        isAirborne: false,
        airborneTimer: 0,
        altitude: 0
      });
    }
  });

  // Swirling autumn leaves all over the Forest zone & Central Park
  for (let lf = 0; lf < 150; lf++) {
    const lx = Math.random() * WORLD_SIZE;
    const ly = Math.random() * WORLD_SIZE;
    
    const isInForest = lx < 3800 && ly < 3800;
    if (isInForest || Math.random() < 0.25) {
      litter.push({
        id: `litter_leaf_${litterId++}`,
        x: lx,
        y: ly,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
        type: 'leaf',
        color: Math.random() > 0.5 ? '#d97706' : (Math.random() > 0.5 ? '#b45309' : '#15803d'),
        size: 4 + Math.random() * 3,
        isAirborne: false,
        airborneTimer: 0,
        altitude: 0
      });
    }
  }

  return {
    width: WORLD_SIZE,
    height: WORLD_SIZE,
    roads,
    intersections,
    buildings,
    parkings,
    trees,
    props,
    vehicles,
    pedestrians,
    birds,
    puddles,
    litter,
    skidMarks: [],
    particles: [],
    weather: 'clear',
    pedestrianPaths
  };
}

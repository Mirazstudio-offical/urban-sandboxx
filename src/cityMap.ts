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
  SidewalkBlock,
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
    maxSpeed: 165,
    reverseMaxSpeed: 60,
    acceleration: 105,
    brakingForce: 240,
    friction: 0.988,
    turnSpeed: 4.2,
    maxSteerAngle: 0.75,
    minSteerAngle: 0.14,
    grip: 0.985,
    driftGrip: 0.38,
    name: 'Седан'
  },
  hatchback: {
    type: 'hatchback',
    width: 19,
    length: 38,
    wheelBase: 23,
    mass: 1150,
    maxSpeed: 175,
    reverseMaxSpeed: 65,
    acceleration: 115,
    brakingForce: 250,
    friction: 0.988,
    turnSpeed: 4.5,
    maxSteerAngle: 0.78,
    minSteerAngle: 0.15,
    grip: 0.988,
    driftGrip: 0.40,
    name: 'Хэтчбек'
  },
  pickup: {
    type: 'pickup',
    width: 22,
    length: 48,
    wheelBase: 30,
    mass: 2200,
    maxSpeed: 155,
    reverseMaxSpeed: 55,
    acceleration: 85,
    brakingForce: 220,
    friction: 0.985,
    turnSpeed: 3.6,
    maxSteerAngle: 0.68,
    minSteerAngle: 0.12,
    grip: 0.975,
    driftGrip: 0.32,
    name: 'Пикап'
  },
  sports: {
    type: 'sports',
    width: 21,
    length: 44,
    wheelBase: 27,
    mass: 1320,
    maxSpeed: 240,
    reverseMaxSpeed: 85,
    acceleration: 145,
    brakingForce: 290,
    friction: 0.990,
    turnSpeed: 4.6,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.13,
    grip: 0.990,
    driftGrip: 0.44,
    name: 'Спорткар'
  },
  suv: {
    type: 'suv',
    width: 21,
    length: 42,
    wheelBase: 26,
    mass: 1450,
    maxSpeed: 160,
    reverseMaxSpeed: 60,
    acceleration: 95,
    brakingForce: 230,
    friction: 0.986,
    turnSpeed: 3.8,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.13,
    grip: 0.980,
    driftGrip: 0.36,
    name: 'Внедорожник'
  },
  taxi: {
    type: 'taxi',
    width: 21,
    length: 46,
    wheelBase: 28,
    mass: 1450,
    maxSpeed: 170,
    reverseMaxSpeed: 65,
    acceleration: 105,
    brakingForce: 245,
    friction: 0.988,
    turnSpeed: 4.2,
    maxSteerAngle: 0.75,
    minSteerAngle: 0.14,
    grip: 0.985,
    driftGrip: 0.38,
    name: 'Такси'
  },
  police: {
    type: 'police',
    width: 21,
    length: 46,
    wheelBase: 28,
    mass: 1550,
    maxSpeed: 195,
    reverseMaxSpeed: 75,
    acceleration: 130,
    brakingForce: 275,
    friction: 0.989,
    turnSpeed: 4.4,
    maxSteerAngle: 0.74,
    minSteerAngle: 0.13,
    grip: 0.988,
    driftGrip: 0.40,
    name: 'Полицейский автомобиль'
  },
  fire_engine: {
    type: 'fire_engine',
    width: 29,
    length: 74,
    wheelBase: 44,
    mass: 5400,
    maxSpeed: 145,
    reverseMaxSpeed: 40,
    acceleration: 70,
    brakingForce: 290,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.08,
    grip: 0.97,
    driftGrip: 0.28,
    name: 'Пожарный автомобиль'
  },
  bus: {
    type: 'bus',
    width: 30,
    length: 92,
    wheelBase: 58,
    mass: 6800,
    maxSpeed: 110,
    reverseMaxSpeed: 35,
    acceleration: 55,
    brakingForce: 270,
    friction: 0.985,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.08,
    grip: 0.97,
    driftGrip: 0.28,
    name: 'Городской автобус'
  },
  van: {
    type: 'van',
    width: 21,
    length: 44,
    wheelBase: 27,
    mass: 1720,
    maxSpeed: 155,
    reverseMaxSpeed: 55,
    acceleration: 90,
    brakingForce: 230,
    friction: 0.986,
    turnSpeed: 3.9,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.12,
    grip: 0.98,
    driftGrip: 0.35,
    name: 'Микроавтобус'
  },
  muscle: {
    type: 'muscle',
    width: 21,
    length: 46,
    wheelBase: 29,
    mass: 1420,
    maxSpeed: 175,
    reverseMaxSpeed: 65,
    acceleration: 110,
    brakingForce: 240,
    friction: 0.988,
    turnSpeed: 4.2,
    maxSteerAngle: 0.75,
    minSteerAngle: 0.14,
    grip: 0.982,
    driftGrip: 0.40,
    name: 'Классический седан'
  },
  ambulance: {
    type: 'ambulance',
    width: 23,
    length: 54,
    wheelBase: 34,
    mass: 2400,
    maxSpeed: 165,
    reverseMaxSpeed: 60,
    acceleration: 105,
    brakingForce: 280,
    friction: 0.988,
    turnSpeed: 3.7,
    maxSteerAngle: 0.68,
    minSteerAngle: 0.11,
    grip: 0.985,
    driftGrip: 0.35,
    name: 'Скорая помощь'
  },
  truck_box: {
    type: 'truck_box',
    width: 28,
    length: 82,
    wheelBase: 50,
    mass: 5200,
    maxSpeed: 145,
    reverseMaxSpeed: 40,
    acceleration: 70,
    brakingForce: 270,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.08,
    grip: 0.965,
    driftGrip: 0.28,
    name: 'Грузовой фургон'
  },
  truck_dump: {
    type: 'truck_dump',
    width: 29,
    length: 78,
    wheelBase: 48,
    mass: 5600,
    maxSpeed: 140,
    reverseMaxSpeed: 38,
    acceleration: 68,
    brakingForce: 285,
    friction: 0.983,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.08,
    grip: 0.960,
    driftGrip: 0.26,
    name: 'Самосвал'
  },
  truck_tanker: {
    type: 'truck_tanker',
    width: 28,
    length: 84,
    wheelBase: 52,
    mass: 5500,
    maxSpeed: 145,
    reverseMaxSpeed: 38,
    acceleration: 65,
    brakingForce: 275,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.07,
    grip: 0.955,
    driftGrip: 0.25,
    name: 'Автоцистерна'
  },
  truck_flatbed: {
    type: 'truck_flatbed',
    width: 28,
    length: 84,
    wheelBase: 52,
    mass: 4900,
    maxSpeed: 150,
    reverseMaxSpeed: 42,
    acceleration: 75,
    brakingForce: 270,
    friction: 0.985,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.08,
    grip: 0.970,
    driftGrip: 0.29,
    name: 'Бортовой грузовик'
  },
  cement_mixer: {
    type: 'cement_mixer',
    width: 29,
    length: 80,
    wheelBase: 50,
    mass: 5900,
    maxSpeed: 135,
    reverseMaxSpeed: 35,
    acceleration: 62,
    brakingForce: 290,
    friction: 0.982,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.07,
    grip: 0.950,
    driftGrip: 0.24,
    name: 'Автобетономешалка'
  },
  garbage_truck: {
    type: 'garbage_truck',
    width: 29,
    length: 78,
    wheelBase: 48,
    mass: 5200,
    maxSpeed: 140,
    reverseMaxSpeed: 40,
    acceleration: 70,
    brakingForce: 280,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.08,
    grip: 0.965,
    driftGrip: 0.27,
    name: 'Мусоровоз'
  }
};

export const CAR_PALETTE = [
  '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', 
  '#0891b2', '#e11d48', '#4b5563', '#1e293b', '#f8fafc',
  '#f59e0b', '#059669', '#3b82f6', '#6366f1', '#84cc16'
];

const PED_SKIN_COLORS = ['#ffd1b3', '#fcd5b5', '#e0ac69', '#c68642', '#8d5524', '#59381e'];
const PED_SHIRT_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6', '#ffffff', '#1e293b', '#22c55e', '#a855f7', '#fb923c'];
const PED_PANTS_COLORS = ['#1e293b', '#334155', '#1e3a8a', '#475569', '#78350f', '#0f172a', '#64748b', '#000000', '#f1f5f9', '#94a3b8'];
const PED_HAIR_COLORS = ['#18181b', '#451a03', '#78350f', '#ca8a04', '#71717a', '#b45309', '#fef3c7', '#dc2626'];

export function generateRandomPedestrianAppearance() {
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  
  const ageRoll = Math.random();
  let ageGroup: 'child' | 'adult' | 'elderly' = 'adult';
  if (ageRoll < 0.15) ageGroup = 'child';
  else if (ageRoll < 0.25) ageGroup = 'elderly';
  
  const hairStylesMale = ['short', 'bald', 'spiky'];
  const hairStylesFemale = ['short', 'long', 'bun', 'ponytail'];
  const hairStyle = gender === 'male' ? hairStylesMale[Math.floor(Math.random() * hairStylesMale.length)] : hairStylesFemale[Math.floor(Math.random() * hairStylesFemale.length)];
  
  const hasHat = Math.random() < 0.2;
  const hatType = ['cap', 'beanie', 'sunhat'][Math.floor(Math.random() * 3)] as 'cap' | 'beanie' | 'sunhat';
  
  const handheldProps = ['phone', 'coffee', 'bag', 'box', null];
  const handheldProp = handheldProps[Math.floor(Math.random() * handheldProps.length)] as 'phone' | 'coffee' | 'bag' | 'box' | null;

  return {
    gender: gender as 'male' | 'female',
    ageGroup,
    skinColor: PED_SKIN_COLORS[Math.floor(Math.random() * PED_SKIN_COLORS.length)],
    shirtColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)],
    pantsColor: PED_PANTS_COLORS[Math.floor(Math.random() * PED_PANTS_COLORS.length)],
    hairColor: PED_HAIR_COLORS[Math.floor(Math.random() * PED_HAIR_COLORS.length)],
    hairStyle: hairStyle as 'short' | 'long' | 'bald' | 'bun' | 'spiky' | 'ponytail',
    hasHat,
    hatColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)],
    hatType,
    handheldProp,
    propColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)],
    hasDroppedProp: false
  };
}

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
  
  // 9x9 grid coordinates creating complete interconnected city network
  const vertRoadXs = [800, 1600, 2400, 3200, 4000, 4800, 5600, 6400, 7200];
  const horizRoadYs = [800, 1600, 2400, 3200, 4000, 4800, 5600, 6400, 7200];
  
  const roads: RoadSegment[] = [];
  const intersections: Intersection[] = [];
  const sidewalks: SidewalkBlock[] = [];
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

  // Complete, fully-connected road network across all rows and columns
  const shouldRoadExist = (_type: 'h' | 'v', _lineIdx: number, _segIdx: number): boolean => {
    return true;
  };

  const shouldIntersectionExist = (_r: number, _c: number): boolean => {
    return true;
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
      const crosswalkWidth = 22;
      const stopLineOffset = crosswalkWidth + 12; // 34 - safely behind the crosswalk

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
          { nsState: 'green', ewState: 'red', duration: 8.0 },
          { nsState: 'green_flashing', ewState: 'red', duration: 3.0 },
          { nsState: 'yellow', ewState: 'red', duration: 3.0 },
          { nsState: 'red', ewState: 'red_yellow', duration: 1.5 },
          { nsState: 'red', ewState: 'green', duration: 8.0 },
          { nsState: 'red', ewState: 'green_flashing', duration: 3.0 },
          { nsState: 'red', ewState: 'yellow', duration: 3.0 },
          { nsState: 'red_yellow', ewState: 'red', duration: 1.5 }
        ],
        stopLines,
        crosswalks,
        isDirt: cx <= 3200 && cy <= 3200
      });

      // Generate 4 breakable traffic light props at the corners of this intersection (only if it has lights!)
      if (!((cx < 3800 && cy < 3800) || (cx > 3800 && cy > 3800))) {
        props.push(
          { id: `traffic_light_${intersectionId}_north`, x: cx - halfW - 20, y: cy - halfH - 20, type: 'traffic_light', angle: -Math.PI / 2, intersectionId, direction: 'north', isMasterLight: true },
          { id: `traffic_light_${intersectionId}_south`, x: cx + halfW + 20, y: cy + halfH + 20, type: 'traffic_light', angle: Math.PI / 2, intersectionId, direction: 'south' },
          { id: `traffic_light_${intersectionId}_east`, x: cx + halfW + 20, y: cy - halfH - 20, type: 'traffic_light', angle: 0, intersectionId, direction: 'east' },
          { id: `traffic_light_${intersectionId}_west`, x: cx - halfW - 20, y: cy + halfH + 20, type: 'traffic_light', angle: Math.PI, intersectionId, direction: 'west' }
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
  // 3. GENERATE SIDEWALK WALKWAYS, PARKING PLAZAS & BUILDINGS WITHIN BLOCKS
  const allXBounds = [0, ...vertRoadXs, WORLD_SIZE];
  const allYBounds = [0, ...horizRoadYs, WORLD_SIZE];

  for (let by = 0; by < allYBounds.length - 1; by++) {
    for (let bx = 0; bx < allXBounds.length - 1; bx++) {
      const minX = allXBounds[bx];
      const maxX = allXBounds[bx + 1];
      const minY = allYBounds[by];
      const maxY = allYBounds[by + 1];

      const padLeft = (bx === 0 ? 30 : getRoadWidthAtCol(bx - 1) / 2 + 10);
      const padRight = (bx === allXBounds.length - 2 ? 30 : getRoadWidthAtCol(bx) / 2 + 10);
      const padTop = (by === 0 ? 30 : getRoadWidthAtRow(by - 1) / 2 + 10);
      const padBottom = (by === allYBounds.length - 2 ? 30 : getRoadWidthAtRow(by) / 2 + 10);

      const blockX = minX + padLeft;
      const blockY = minY + padTop;
      const blockW = (maxX - padRight) - blockX;
      const blockH = (maxY - padBottom) - blockY;

      if (blockW < 80 || blockH < 80) continue;

      const sidewalkWidth = 32;
      const isForest = bx < 3 && by < 3;
      const isVillage = bx >= 6 && by >= 6;
      const isCentralPark = bx === 5 && by === 3;
      const isCommercial = bx >= 3 && bx <= 6 && by >= 2 && by <= 5;
      const isDedicatedParking = (bx === 4 && by === 2) || (bx === 6 && by === 4) || (bx === 3 && by === 5) || (bx === 2 && by === 7) || (bx === 5 && by === 4);
      const isCourtyardBlock = (bx === 2 && by === 3) || (bx === 3 && by === 3) || (bx === 4 && by === 4) || 
                               (bx === 5 && by === 5) || (bx === 3 && by === 6) || (bx === 6 && by === 3) || 
                               (bx === 4 && by === 6) || (bx === 5 && by === 2);

      let swStyle: SidewalkBlock['style'] = 'urban';
      if (isForest) swStyle = 'park';
      else if (isVillage) swStyle = 'village';
      else if (isCentralPark) swStyle = 'park';
      else if (isCommercial) swStyle = 'commercial';

      // Register Sidewalk geometry for this block (only outside forest zone)
      if (!isForest) {
        const driveways: SidewalkBlock['driveways'] = [];
        if (isDedicatedParking) {
          driveways.push({
            side: 'north',
            offset: Math.floor(blockW / 2 - 20),
            width: 40
          });
          driveways.push({
            side: 'south',
            offset: Math.floor(blockW / 2 - 20),
            width: 40
          });
        } else if (isCourtyardBlock) {
          driveways.push({
            side: 'south',
            offset: Math.floor(blockW - 100),
            width: 50
          });
          driveways.push({
            side: 'east',
            offset: Math.floor(blockH - 100),
            width: 50
          });
        }

        sidewalks.push({
          id: `sidewalk_${bx}_${by}`,
          x: blockX,
          y: blockY,
          width: blockW,
          height: blockH,
          sidewalkWidth,
          style: swStyle,
          innerLawnColor: isForest ? '#14532d' : (isVillage ? '#16a34a' : '#15803d'),
          driveways
        });

        // Pedestrian navigation path runs down the centerline of the paved sidewalk corridor
        const swWalkCenter = sidewalkWidth / 2;
        const swX1 = blockX + swWalkCenter;
        const swY1 = blockY + swWalkCenter;
        const swX2 = blockX + blockW - swWalkCenter;
        const swY2 = blockY + blockH - swWalkCenter;

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
      }

      // --- 1. FOREST ZONE (North-West) ---
      if (isForest) {
        // Populated with natural tree canopies, ponds, and clearings
        const treeSpacing = 44;
        for (let tx = blockX + 20; tx < blockX + blockW - 20; tx += treeSpacing) {
          for (let ty = blockY + 20; ty < blockY + blockH - 20; ty += treeSpacing) {
            if (Math.random() > 0.2) {
              const rRad = 15 + Math.random() * 15;
              const rX = tx + (Math.random() * 12 - 6);
              const rY = ty + (Math.random() * 12 - 6);
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

        if (bx === 1 && by === 1) {
          const clX = blockX + blockW / 2;
          const clY = blockY + blockH / 2;
          props.push(
            { id: `forest_bench_${bx}_${by}_1`, x: clX - 25, y: clY - 20, type: 'bench', angle: 0 },
            { id: `forest_bench_${bx}_${by}_2`, x: clX + 25, y: clY + 20, type: 'bench', angle: Math.PI }
          );
        }

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
            rippleTimer: Math.random() * 10,
            isPond: true
          });
        }
        continue;
      }

      // --- 2. CENTRAL PARK PROMENADE ---
      if (isCentralPark) {
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

        // Lush park greenery & pathways
        for (let tx = blockX + 45; tx < blockX + blockW - 45; tx += 55) {
          for (let ty = blockY + 45; ty < blockY + blockH - 45; ty += 55) {
            if (Math.hypot(tx - cx, ty - cy) > 70 && Math.random() > 0.25) {
              trees.push({
                id: `tree_${tx}_${ty}`,
                x: tx + (Math.random() * 14 - 7),
                y: ty + (Math.random() * 14 - 7),
                radius: 14 + Math.random() * 10,
                color: Math.random() > 0.5 ? '#15803d' : '#166534',
                shadowOffset: 6
              });
            }
          }
        }

        // Promenade benches, stainless trash urns, flowerbeds, and lighting
        props.push(
          // Fountain square seating & amenities
          { id: `bench_${bx}_${by}_1`, x: cx - 85, y: cy - 20, type: 'bench', angle: 0 },
          { id: `urn_${bx}_${by}_1`, x: cx - 85, y: cy - 35, type: 'trash_can', angle: 0 },
          { id: `flower_${bx}_${by}_1`, x: cx - 85, y: cy + 15, type: 'flowerbed', angle: 0 },

          { id: `bench_${bx}_${by}_2`, x: cx + 85, y: cy - 20, type: 'bench', angle: Math.PI },
          { id: `urn_${bx}_${by}_2`, x: cx + 85, y: cy - 35, type: 'trash_can', angle: Math.PI },
          { id: `flower_${bx}_${by}_2`, x: cx + 85, y: cy + 15, type: 'flowerbed', angle: 0 },

          { id: `bench_${bx}_${by}_3`, x: cx - 20, y: cy - 85, type: 'bench', angle: Math.PI / 2 },
          { id: `urn_${bx}_${by}_3`, x: cx - 35, y: cy - 85, type: 'trash_can', angle: Math.PI / 2 },
          { id: `flower_${bx}_${by}_3`, x: cx + 20, y: cy - 85, type: 'flowerbed', angle: 0 },

          { id: `bench_${bx}_${by}_4`, x: cx - 20, y: cy + 85, type: 'bench', angle: -Math.PI / 2 },
          { id: `urn_${bx}_${by}_4`, x: cx - 35, y: cy + 85, type: 'trash_can', angle: -Math.PI / 2 },
          { id: `flower_${bx}_${by}_4`, x: cx + 20, y: cy + 85, type: 'flowerbed', angle: 0 },

          // Park perimeter walkways
          { id: `bench_${bx}_${by}_5`, x: blockX + 70, y: blockY + 50, type: 'bench', angle: 0 },
          { id: `urn_${bx}_${by}_5`, x: blockX + 70, y: blockY + 36, type: 'trash_can', angle: 0 },
          { id: `bench_${bx}_${by}_6`, x: blockX + blockW - 70, y: blockY + 50, type: 'bench', angle: Math.PI },
          { id: `urn_${bx}_${by}_6`, x: blockX + blockW - 70, y: blockY + 36, type: 'trash_can', angle: Math.PI },

          { id: `bench_${bx}_${by}_7`, x: blockX + 70, y: blockY + blockH - 50, type: 'bench', angle: 0 },
          { id: `urn_${bx}_${by}_7`, x: blockX + 70, y: blockY + blockH - 36, type: 'trash_can', angle: 0 },
          { id: `bench_${bx}_${by}_8`, x: blockX + blockW - 70, y: blockY + blockH - 50, type: 'bench', angle: Math.PI },
          { id: `urn_${bx}_${by}_8`, x: blockX + blockW - 70, y: blockY + blockH - 36, type: 'trash_can', angle: Math.PI },

          // Illumination and kiosks
          { id: `lamp_${bx}_${by}_1`, x: cx - 70, y: cy - 70, type: 'lamp', angle: 0 },
          { id: `lamp_${bx}_${by}_2`, x: cx + 70, y: cy + 70, type: 'lamp', angle: 0 },
          { id: `lamp_${bx}_${by}_3`, x: cx + 70, y: cy - 70, type: 'lamp', angle: 0 },
          { id: `lamp_${bx}_${by}_4`, x: cx - 70, y: cy + 70, type: 'lamp', angle: 0 },
          { id: `hydrant_${bx}_${by}_park`, x: cx - 110, y: cy - 30, type: 'hydrant', angle: 0 },
          { id: `kiosk_${bx}_${by}_park`, x: cx + 110, y: cy - 30, type: 'kiosk', angle: 0 }
        );
        continue;
      }

      // --- 3. DEDICATED OPEN-AIR PARKING PLAZAS (NO BUILDINGS INSIDE) ---
      if (isDedicatedParking) {
        const pkX = blockX + sidewalkWidth + 10;
        const pkY = blockY + sidewalkWidth + 10;
        const parkW = blockW - (sidewalkWidth * 2 + 20);
        const parkH = blockH - (sidewalkWidth * 2 + 20);

        const spots: ParkingArea['spots'] = [];
        const numRows = Math.floor((parkH - 30) / 48);
        for (let s = 0; s < numRows; s++) {
          const sy = pkY + 28 + s * 48;
          // Left stall row
          spots.push({
            x: pkX + 45,
            y: sy,
            angle: 0,
            occupied: Math.random() < 0.0225
          });
          // Right stall row
          spots.push({
            x: pkX + parkW - 45,
            y: sy,
            angle: Math.PI,
            occupied: Math.random() < 0.0225
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

        // Add parking lighting fixtures, bollards, waste enclosure, benches, and perimeter planters
        props.push(
          { id: `pk_lamp_${bx}_${by}_1`, x: pkX + 20, y: pkY + 15, type: 'lamp', angle: 0 },
          { id: `pk_lamp_${bx}_${by}_2`, x: pkX + parkW - 20, y: pkY + 15, type: 'lamp', angle: 0 },
          { id: `pk_lamp_${bx}_${by}_3`, x: pkX + 20, y: pkY + parkH - 15, type: 'lamp', angle: 0 },
          { id: `pk_lamp_${bx}_${by}_4`, x: pkX + parkW - 20, y: pkY + parkH - 15, type: 'lamp', angle: 0 },
          
          // Dumpster station for the parking plaza
          { id: `pk_dump_${bx}_${by}_1`, x: pkX + 22, y: pkY + parkH / 2 - 12, type: 'dumpster', angle: 0 },
          { id: `pk_dump_${bx}_${by}_2`, x: pkX + 22, y: pkY + parkH / 2 + 12, type: 'dumpster', angle: 0 },
          { id: `pk_urn_${bx}_${by}_1`, x: pkX + 22, y: pkY + parkH / 2 + 30, type: 'trash_can', angle: 0 },

          // Waiting benches with trash cans & decorative flowerbeds
          { id: `pk_bench_${bx}_${by}_1`, x: pkX + parkW / 2 - 25, y: pkY + 14, type: 'bench', angle: Math.PI / 2 },
          { id: `pk_urn_${bx}_${by}_2`, x: pkX + parkW / 2 - 40, y: pkY + 14, type: 'trash_can', angle: 0 },
          { id: `pk_flower_${bx}_${by}_1`, x: pkX + parkW / 2 + 25, y: pkY + 14, type: 'flowerbed', angle: 0 },

          { id: `pk_bench_${bx}_${by}_2`, x: pkX + parkW / 2 - 25, y: pkY + parkH - 14, type: 'bench', angle: -Math.PI / 2 },
          { id: `pk_urn_${bx}_${by}_3`, x: pkX + parkW / 2 - 40, y: pkY + parkH - 14, type: 'trash_can', angle: 0 },
          { id: `pk_flower_${bx}_${by}_2`, x: pkX + parkW / 2 + 25, y: pkY + parkH - 14, type: 'flowerbed', angle: 0 },

          // Safety bollards along parking entrance
          { id: `pk_boll_${bx}_${by}_1`, x: pkX + parkW / 2 - 22, y: pkY + parkH / 2, type: 'bollard', angle: 0 },
          { id: `pk_boll_${bx}_${by}_2`, x: pkX + parkW / 2 + 22, y: pkY + parkH / 2, type: 'bollard', angle: 0 }
        );

        trees.push(
          { id: `pk_tree_${bx}_${by}_1`, x: pkX + parkW / 2, y: pkY + 15, radius: 12, color: '#15803d', shadowOffset: 4 },
          { id: `pk_tree_${bx}_${by}_2`, x: pkX + parkW / 2, y: pkY + parkH - 15, radius: 12, color: '#15803d', shadowOffset: 4 }
        );

        continue;
      }

      // --- 4. COZY RESIDENTIAL COURTYARD BLOCKS (ДВОРЫ С ПАРКОВКАМИ И ЗОНАМИ ОТДЫХА) ---
      if (isCourtyardBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        // 3-Wing Perimeter U-Shaped Residential Apartment Complex
        // 1. North Wing (Horizontal apartment block)
        const northW = innerW - 10;
        const northH = 55;
        buildings.push({
          id: `court_bld_n_${bx}_${by}`,
          x: innerX + 5,
          y: innerY + 5,
          width: northW,
          height: northH,
          type: 'residential',
          color: '#475569',
          roofColor: '#334155',
          accentColor: '#f59e0b',
          windows: [],
          balconies: [
            { side: 'south', offset: 0.2, length: 16, depth: 6 },
            { side: 'south', offset: 0.5, length: 16, depth: 6 },
            { side: 'south', offset: 0.8, length: 16, depth: 6 }
          ],
          fireEscapes: [{ side: 'north', offset: 0.5, length: 20, depth: 5 }],
          entranceSide: 'south',
          roofDetails: [{ type: 'ac', rx: 0.3, ry: 0.3, rw: 0.15, rh: 0.4 }]
        });

        // 2. West Wing (Vertical apartment block)
        const westW = 55;
        const westH = innerH - 75;
        buildings.push({
          id: `court_bld_w_${bx}_${by}`,
          x: innerX + 5,
          y: innerY + 68,
          width: westW,
          height: westH,
          type: 'residential',
          color: '#334155',
          roofColor: '#1e293b',
          accentColor: '#38bdf8',
          windows: [],
          balconies: [
            { side: 'east', offset: 0.3, length: 16, depth: 6 },
            { side: 'east', offset: 0.7, length: 16, depth: 6 }
          ],
          fireEscapes: [{ side: 'west', offset: 0.5, length: 20, depth: 5 }],
          entranceSide: 'east',
          roofDetails: []
        });

        // 3. East Wing (Shorter vertical block leaving driveway entrance on South-East)
        const eastW = 55;
        const eastH = innerH - 110;
        buildings.push({
          id: `court_bld_e_${bx}_${by}`,
          x: innerX + innerW - 60,
          y: innerY + 68,
          width: eastW,
          height: eastH,
          type: 'residential',
          color: '#52525b',
          roofColor: '#3f3f46',
          accentColor: '#10b981',
          windows: [],
          balconies: [
            { side: 'west', offset: 0.4, length: 16, depth: 6 }
          ],
          fireEscapes: [{ side: 'east', offset: 0.5, length: 20, depth: 5 }],
          entranceSide: 'west',
          roofDetails: []
        });

        // --- COURTYARD INTERIOR AMENITIES (ДВОРОВАЯ ТЕРРИТОРИЯ) ---
        const courtLeft = innerX + 70;
        const courtTop = innerY + 70;
        const courtW = innerW - 140;
        const courtH = innerH - 85;

        // Courtyard Residential Parking Lot (Парковка во дворе)
        const courtPkW = courtW * 0.48;
        const courtPkH = courtH - 20;
        const courtPkX = courtLeft + courtW - courtPkW;
        const courtPkY = courtTop + 10;

        const courtSpots: ParkingArea['spots'] = [];
        const numCourtRows = Math.floor(courtPkH / 42);
        for (let cs = 0; cs < numCourtRows; cs++) {
          courtSpots.push({
            x: courtPkX + courtPkW / 2,
            y: courtPkY + 18 + cs * 42,
            angle: 0,
            occupied: Math.random() < 0.0225
          });
        }

        parkings.push({
          id: `court_parking_${bx}_${by}`,
          x: courtPkX,
          y: courtPkY,
          width: courtPkW,
          height: courtPkH,
          spots: courtSpots
        });

        // Green Courtyard Garden / Leisure Zone (Зона отдыха, лавочки, урны, клумбы)
        const gardenX = courtLeft + 5;
        const gardenY = courtTop + 10;
        const gardenW = courtW * 0.45;
        const gardenH = courtH - 20;

        // Courtyard Trees
        trees.push(
          { id: `court_tree_${bx}_${by}_1`, x: gardenX + gardenW * 0.35, y: gardenY + gardenH * 0.3, radius: 13, color: '#15803d', shadowOffset: 4 },
          { id: `court_tree_${bx}_${by}_2`, x: gardenX + gardenW * 0.65, y: gardenY + gardenH * 0.7, radius: 12, color: '#166534', shadowOffset: 4 }
        );

        // Benches and Trash Cans around the courtyard garden & entrances
        props.push(
          // Benches facing the garden lawn
          { id: `court_bench_${bx}_${by}_1`, x: gardenX + 18, y: gardenY + 25, type: 'bench', angle: 0 },
          { id: `court_urn_${bx}_${by}_1`, x: gardenX + 18, y: gardenY + 12, type: 'trash_can', angle: 0 },
          { id: `court_flower_${bx}_${by}_1`, x: gardenX + 18, y: gardenY + 40, type: 'flowerbed', angle: 0 },

          { id: `court_bench_${bx}_${by}_2`, x: gardenX + gardenW - 18, y: gardenY + 25, type: 'bench', angle: Math.PI },
          { id: `court_urn_${bx}_${by}_2`, x: gardenX + gardenW - 18, y: gardenY + 12, type: 'trash_can', angle: Math.PI },
          { id: `court_flower_${bx}_${by}_2`, x: gardenX + gardenW - 18, y: gardenY + 40, type: 'flowerbed', angle: 0 },

          { id: `court_bench_${bx}_${by}_3`, x: gardenX + gardenW / 2, y: gardenY + gardenH - 18, type: 'bench', angle: -Math.PI / 2 },
          { id: `court_urn_${bx}_${by}_3`, x: gardenX + gardenW / 2 - 16, y: gardenY + gardenH - 18, type: 'trash_can', angle: -Math.PI / 2 },
          { id: `court_flower_${bx}_${by}_3`, x: gardenX + gardenW / 2 + 18, y: gardenY + gardenH - 18, type: 'flowerbed', angle: 0 },

          // Waste Disposal Area (Контейнерная площадка / Мусорные баки)
          { id: `court_dump_${bx}_${by}_1`, x: courtPkX + courtPkW - 15, y: courtPkY + courtPkH - 24, type: 'dumpster', angle: Math.PI / 2 },
          { id: `court_dump_${bx}_${by}_2`, x: courtPkX + courtPkW - 15, y: courtPkY + courtPkH - 6, type: 'dumpster', angle: Math.PI / 2 },
          { id: `court_urn_${bx}_${by}_4`, x: courtPkX + courtPkW - 15, y: courtPkY + courtPkH + 10, type: 'trash_can', angle: 0 },

          // Cast-iron safety bollards separating parking from pedestrian walkway
          { id: `court_boll_${bx}_${by}_1`, x: courtPkX - 6, y: gardenY + 25, type: 'bollard', angle: 0 },
          { id: `court_boll_${bx}_${by}_2`, x: courtPkX - 6, y: gardenY + gardenH / 2, type: 'bollard', angle: 0 },
          { id: `court_boll_${bx}_${by}_3`, x: courtPkX - 6, y: gardenY + gardenH - 25, type: 'bollard', angle: 0 },

          // Entrance benches & urns for residents
          { id: `court_bench_${bx}_${by}_ent_n`, x: innerX + northW * 0.5, y: innerY + northH + 10, type: 'bench', angle: -Math.PI / 2 },
          { id: `court_urn_${bx}_${by}_ent_n`, x: innerX + northW * 0.5 + 16, y: innerY + northH + 10, type: 'trash_can', angle: 0 },

          // Night illumination lamps
          { id: `court_lamp_${bx}_${by}_1`, x: gardenX + 15, y: gardenY + gardenH / 2, type: 'lamp', angle: 0 },
          { id: `court_lamp_${bx}_${by}_2`, x: courtPkX + courtPkW / 2, y: courtPkY + 6, type: 'lamp', angle: 0 },

          // Outer sidewalk street furniture along the block edge
          { id: `sw_bench_${bx}_${by}_1`, x: blockX + 25, y: blockY + sidewalkWidth / 2, type: 'bench', angle: 0 },
          { id: `sw_urn_${bx}_${by}_1`, x: blockX + 40, y: blockY + sidewalkWidth / 2, type: 'trash_can', angle: 0 },
          { id: `sw_bench_${bx}_${by}_2`, x: blockX + blockW - 35, y: blockY + sidewalkWidth / 2, type: 'bench', angle: 0 },
          { id: `sw_urn_${bx}_${by}_2`, x: blockX + blockW - 20, y: blockY + sidewalkWidth / 2, type: 'trash_can', angle: 0 }
        );

        continue;
      }

      // --- 5. COZY VILLAGE ZONE (South-East) ---
      if (isVillage) {
        const cW = 60 + Math.random() * 15;
        const cH = 60 + Math.random() * 15;

        // Cottage 1: Top-Left
        buildings.push({
          id: `cottage_${bx}_${by}_1`,
          x: blockX + sidewalkWidth + 15,
          y: blockY + sidewalkWidth + 15,
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

        // Cottage 2: Bottom-Right
        if (blockW > 180 && blockH > 180) {
          buildings.push({
            id: `cottage_${bx}_${by}_2`,
            x: blockX + blockW - sidewalkWidth - cW - 15,
            y: blockY + blockH - sidewalkWidth - cH - 15,
            width: cW,
            height: cH,
            type: 'suburban',
            color: '#7c2d12',
            roofColor: '#451a03',
            accentColor: '#d97706',
            windows: [],
            roofDetails: [],
            entranceSide: 'north'
          });
        }

        // Populate beautiful village orchard gardens & rustic benches
        for (let tx = blockX + sidewalkWidth + 10; tx < blockX + blockW - sidewalkWidth - 10; tx += 45) {
          for (let ty = blockY + sidewalkWidth + 10; ty < blockY + blockH - sidewalkWidth - 10; ty += 45) {
            if (tx < blockX + sidewalkWidth + cW + 35 && ty < blockY + sidewalkWidth + cH + 35) continue;
            if (tx > blockX + blockW - sidewalkWidth - cW - 35 && ty > blockY + blockH - sidewalkWidth - cH - 35) continue;

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

        props.push(
          { id: `v_bench_${bx}_${by}_1`, x: blockX + sidewalkWidth + cW + 25, y: blockY + sidewalkWidth + 25, type: 'bench', angle: 0 },
          { id: `v_urn_${bx}_${by}_1`, x: blockX + sidewalkWidth + cW + 40, y: blockY + sidewalkWidth + 25, type: 'trash_can', angle: 0 },
          { id: `v_flower_${bx}_${by}_1`, x: blockX + sidewalkWidth + cW + 25, y: blockY + sidewalkWidth + 42, type: 'flowerbed', angle: 0 }
        );
        continue;
      }

      // --- 6. URBAN DOWNTOWN & COMMERCIAL SKYSCRAPERS ---
      const innerX = blockX + sidewalkWidth + 12;
      const innerY = blockY + sidewalkWidth + 12;
      const innerW = blockW - (sidewalkWidth * 2 + 24);
      const innerH = blockH - (sidewalkWidth * 2 + 24);

      const bCols = 2;
      const bRows = 2;
      const bSlotW = innerW / bCols;
      const bSlotH = innerH / bRows;

      for (let r = 0; r < bRows; r++) {
        for (let c = 0; c < bCols; c++) {
          const bWidth = bSlotW - 20;
          const bHeight = bSlotH - 20;
          const bxLocal = innerX + c * bSlotW + 10;
          const byLocal = innerY + r * bSlotH + 10;

          if (bWidth < 45 || bHeight < 45) continue;

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
            windows: [],
            balconies,
            fireEscapes,
            entranceSide: entSide,
            roofDetails: []
          });

          // Sidewalk trees
          if (Math.random() > 0.4) {
            trees.push({
              id: `tree_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth / 2 + (Math.random() * 10 - 5),
              y: byLocal + bHeight + 14,
              radius: 11 + Math.random() * 5,
              color: '#15803d',
              shadowOffset: 4
            });
          }

          // Dense sidewalk amenities: benches, trash urns, street lamps, and planters
          props.push({
            id: `sw_bench_${bxLocal}_${byLocal}`,
            x: bxLocal + bWidth * 0.3,
            y: byLocal + bHeight + 8,
            type: 'bench',
            angle: 0
          });
          props.push({
            id: `sw_urn_${bxLocal}_${byLocal}`,
            x: bxLocal + bWidth * 0.3 + 16,
            y: byLocal + bHeight + 8,
            type: 'trash_can',
            angle: 0
          });

          if (Math.random() > 0.5) {
            props.push({
              id: `lamp_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth + 12,
              y: byLocal + bHeight + 12,
              type: 'lamp',
              angle: 0
            });
          }

          if (bType === 'shop' || bType === 'office') {
            props.push({
              id: `flower_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth * 0.75,
              y: byLocal + bHeight + 8,
              type: 'flowerbed',
              angle: 0
            });
            props.push({
              id: `boll_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth + 6,
              y: byLocal + bHeight + 8,
              type: 'bollard',
              angle: 0
            });
          }

          if (bType === 'industrial') {
            props.push({
              id: `dump_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth - 12,
              y: byLocal - 10,
              type: 'dumpster',
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

  // Spawn the Player's Starting Off-Road Pickup Truck and Showcased Heavy Trucks at Central Park Promenade!
  vehicles.push({
    id: `veh_player_starter`,
    type: 'pickup',
    x: 4430,
    y: 2800,
    vx: 0,
    vy: 0,
    angle: 0, // facing East along the Promenade
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
    damage: createDefaultVehicleDamage(CAR_CONFIGS['pickup'].length, CAR_CONFIGS['pickup'].width),
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
  const carTypes: CarType[] = [
    'sedan', 'hatchback', 'pickup', 'sports', 'suv', 'taxi', 'police', 
    'fire_engine', 'bus', 'van', 'muscle', 'ambulance',
    'truck_box', 'truck_dump', 'truck_tanker', 'truck_flatbed', 'cement_mixer', 'garbage_truck'
  ];
  let vehicleCounter = 0;

  // Place a showcased heavy KamAZ-5320 Box Truck and Heavy Tipper right next to Central Park Promenade!
  const starterBoxTruckCfg = CAR_CONFIGS['truck_box'];
  vehicles.push({
    id: `veh_showcase_truck_box`,
    type: 'truck_box',
    x: 4490,
    y: 2840,
    vx: 0,
    vy: 0,
    angle: 0,
    steerAngle: 0,
    targetSteerAngle: 0,
    speed: 0,
    lateralVelocity: 0,
    angularVelocity: 0,
    isDrifting: false,
    driftFactor: 0,
    mass: starterBoxTruckCfg.mass,
    width: starterBoxTruckCfg.width,
    length: starterBoxTruckCfg.length,
    wheelBase: starterBoxTruckCfg.wheelBase,
    color: '#0284c7', // vibrant transport blue cab
    roofColor: '#0284c7',
    headlightsOn: false,
    headlightMode: 'off',
    brakeLightsOn: false,
    isReversing: false,
    turnSignal: 'none',
    turnSignalTimer: 0,
    damage: createDefaultVehicleDamage(starterBoxTruckCfg.length, starterBoxTruckCfg.width),
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

  const starterTipperCfg = CAR_CONFIGS['truck_dump'];
  vehicles.push({
    id: `veh_showcase_truck_dump`,
    type: 'truck_dump',
    x: 4490,
    y: 2760,
    vx: 0,
    vy: 0,
    angle: 0,
    steerAngle: 0,
    targetSteerAngle: 0,
    speed: 0,
    lateralVelocity: 0,
    angularVelocity: 0,
    isDrifting: false,
    driftFactor: 0,
    mass: starterTipperCfg.mass,
    width: starterTipperCfg.width,
    length: starterTipperCfg.length,
    wheelBase: starterTipperCfg.wheelBase,
    color: '#d97706', // industrial ochre/orange tipper cab
    roofColor: '#d97706',
    headlightsOn: false,
    headlightMode: 'off',
    brakeLightsOn: false,
    isReversing: false,
    turnSignal: 'none',
    turnSignalTimer: 0,
    damage: createDefaultVehicleDamage(starterTipperCfg.length, starterTipperCfg.width),
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
      const color = cType === 'taxi' ? '#eab308' : 
                    (cType === 'police' ? '#0f172a' : 
                    (cType === 'fire_engine' ? '#cc2222' : 
                    (cType === 'bus' ? '#eab308' : 
                    (cType === 'ambulance' ? '#f8fafc' : 
                    (cType === 'van' ? '#6ee7b7' : 
                    (cType === 'muscle' ? '#991b1b' : 
                    (cType === 'garbage_truck' ? '#16a34a' : 
                    (cType === 'truck_dump' ? '#d97706' : 
                    (cType === 'cement_mixer' ? '#2563eb' : 
                    (cType === 'truck_box' ? '#0284c7' : 
                    (cType === 'truck_tanker' ? '#0369a1' : 
                    (cType === 'truck_flatbed' ? '#475569' : 
                    CAR_PALETTE[vehicleCounter % CAR_PALETTE.length]))))))))))));
      const roofColor = cType === 'police' || cType === 'ambulance' ? '#f8fafc' : (cType === 'fire_engine' ? '#ffffff' : color);

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
        damage: createDefaultVehicleDamage(cfg.length, cfg.width),
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
          damage: createDefaultVehicleDamage(cfg.length, cfg.width),
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
    if (Math.random() > 0.35) return;
    
    // Sometimes spawn a group (family, friends)
    const isGroup = Math.random() < 0.3;
    const groupSize = isGroup ? Math.floor(Math.random() * 3) + 2 : 1;
    const groupId = isGroup ? `group_${pedCounter}` : undefined;
    
    const wpIdx = Math.floor(Math.random() * (path.waypoints.length - 1));
    const wp1 = path.waypoints[wpIdx];
    const wp2 = path.waypoints[wpIdx + 1];
    const prog = Math.random();
    const basePathX = wp1.x + (wp2.x - wp1.x) * prog;
    const basePathY = wp1.y + (wp2.y - wp1.y) * prog;
    const baseAngle = Math.atan2(wp2.y - wp1.y, wp2.x - wp1.x);

    // Give the group a shared base speed, except bikes which are usually solo or group bikes
    const isCyclistGroup = Math.random() < 0.1;
    const groupSpeed = isCyclistGroup ? 110 + Math.random() * 20 : 35 + Math.random() * 15;

    for (let p = 0; p < groupSize; p++) {
      const isCyclist = isCyclistGroup;
      const isScooter = !isCyclist && Math.random() < 0.06;
      
      const app = generateRandomPedestrianAppearance();
      
      // If it's a family group, make sure at least one is adult and some might be children
      if (isGroup && groupSize >= 2) {
        if (p === 0) app.ageGroup = 'adult';
        else if (p > 0 && Math.random() < 0.5) app.ageGroup = 'child';
      }

      const hasDog = !isCyclist && !isScooter && Math.random() < 0.07;
      const isChild = app.ageGroup === 'child';
      const isElderly = app.ageGroup === 'elderly';
      const hasBackpack = Math.random() < 0.3;
      
      const isJanitor = !isGroup && !isCyclist && !isScooter && !isChild && !isElderly && Math.random() < 0.05;
      const hasBroom = isJanitor;
      
      if (isJanitor) {
        app.shirtColor = '#ca8a04'; // Yellowish janitor vest
        app.pantsColor = '#1e3a8a'; // Blue overalls/pants
        app.handheldProp = null; // Hold broom instead
      }
      
      let individualSpeed = groupSpeed;
      if (!isGroup) {
        individualSpeed = isCyclist ? 110 + Math.random() * 20 : (isScooter ? 90 : (isChild ? 35 : (isElderly ? 25 : (isJanitor ? 20 : 40 + Math.random() * 10))));
      }
      
      // Add slight offset for group members
      const offsetX = isGroup ? (Math.random() * 15 - 7.5) : 0;
      const offsetY = isGroup ? (Math.random() * 15 - 7.5) : 0;

      pedestrians.push({
        id: `ped_${pedCounter++}`,
        x: basePathX + offsetX,
        y: basePathY + offsetY,
        vx: Math.cos(baseAngle) * individualSpeed,
        vy: Math.sin(baseAngle) * individualSpeed,
        angle: baseAngle,
        speed: individualSpeed,
        targetSpeed: individualSpeed,
        ...app,
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
        groupId,
        hasBackpack,
        backpackColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)]
      });
    }
  });

  // 6. SPAWN INITIAL BIRDS (Pigeons & Sparrows nesting in gardens, lawns, and clearings)
  const birds: Bird[] = [];
  const birdGroups = 15;
  let bCounter = 0;

  for (let g = 0; g < birdGroups; g++) {
    // Determine group location: 30% park, 30% near props (trash cans/dumpsters), 40% random
    let cx = 0;
    let cy = 0;
    const r = Math.random();
    
    if (r < 0.3) {
      // Park
      cx = 4600 + (Math.random() * 600 - 300);
      cy = 2200 + (Math.random() * 600 - 300);
    } else if (r < 0.6 && props.length > 0) {
      // Near a prop (preferably a trash can, dumpster, or bench)
      const targetProps = props.filter(p => ['trash_can', 'dumpster', 'bench'].includes(p.type));
      const p = targetProps.length > 0 ? targetProps[Math.floor(Math.random() * targetProps.length)] : props[Math.floor(Math.random() * props.length)];
      cx = p.x + (Math.random() * 60 - 30);
      cy = p.y + (Math.random() * 60 - 30);
    } else {
      // Random
      cx = Math.random() * WORLD_SIZE;
      cy = Math.random() * WORLD_SIZE;
    }

    const groupSize = 2 + Math.floor(Math.random() * 6);
    const groupId = `birdGroup_${g}`;
    const groupType = Math.random() < 0.5 ? 'pigeon' : 'sparrow'; // Groups tend to be same species
    
    for (let i = 0; i < groupSize; i++) {
      birds.push({
        id: `bird_${bCounter++}`,
        x: cx + (Math.random() * 40 - 20),
        y: cy + (Math.random() * 40 - 20),
        type: groupType,
        angle: Math.random() * Math.PI * 2,
        state: 'ground',
        altitude: 0,
        flyVX: 0,
        flyVY: 0,
        wingCycle: Math.random() * Math.PI * 2,
        walkTimer: Math.random() * 5,
        groupId
      });
    }
  }


  // 8. SPAWN STREET LITTER & WIND DEBRIS
  const litter: LitterItem[] = [];
  let litterId = 0;

  // Scatter litter around buildings
  buildings.forEach((bld) => {
    for (let l = 0; l < 2; l++) {
      const lType: LitterItem['type'] = Math.random() < 0.25 ? 'paper' : 
                                       (Math.random() < 0.45 ? 'newspaper' : 
                                       (Math.random() < 0.6 ? 'cup' : 
                                       (Math.random() < 0.75 ? 'can' : 
                                       (Math.random() < 0.85 ? 'bottle' : 
                                       (Math.random() < 0.9 ? 'wrapper' : 
                                       (Math.random() < 0.95 ? 'mask' : 'butt'))))));
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

  // Spawn litter on roads
  roads.forEach((road) => {
      if (Math.random() < 0.3) {
          const lType: LitterItem['type'] = Math.random() < 0.2 ? 'paper' : 
                                         (Math.random() < 0.4 ? 'newspaper' : 
                                         (Math.random() < 0.55 ? 'cup' : 
                                         (Math.random() < 0.7 ? 'can' : 
                                         (Math.random() < 0.8 ? 'bottle' : 
                                         (Math.random() < 0.85 ? 'wrapper' : 
                                         (Math.random() < 0.9 ? 'mask' : 'butt'))))));
          const lx = (road.x1 + road.x2) / 2 + (Math.random() * road.width - road.width / 2);
          const ly = (road.y1 + road.y2) / 2 + (Math.random() * road.width - road.width / 2);

          litter.push({
              id: `litter_road_${litterId++}`,
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
    sidewalks,
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

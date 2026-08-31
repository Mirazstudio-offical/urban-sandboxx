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
    name: 'Пожарная автоцистерна'
  },
  fire_ladder: {
    type: 'fire_ladder',
    width: 30,
    length: 86,
    wheelBase: 54,
    mass: 6400,
    maxSpeed: 140,
    reverseMaxSpeed: 38,
    acceleration: 68,
    brakingForce: 290,
    friction: 0.983,
    turnSpeed: 4.0,
    maxSteerAngle: 1.18,
    minSteerAngle: 0.08,
    grip: 0.965,
    driftGrip: 0.27,
    name: 'Пожарная автолестница'
  },
  fire_rescue: {
    type: 'fire_rescue',
    width: 27,
    length: 64,
    wheelBase: 40,
    mass: 4500,
    maxSpeed: 160,
    reverseMaxSpeed: 50,
    acceleration: 88,
    brakingForce: 285,
    friction: 0.986,
    turnSpeed: 4.2,
    maxSteerAngle: 0.85,
    minSteerAngle: 0.11,
    grip: 0.975,
    driftGrip: 0.32,
    name: 'Пожарно-спасательный штаб'
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
  bus_articulated: {
    type: 'bus_articulated',
    width: 30,
    length: 128,
    wheelBase: 82,
    mass: 11500,
    maxSpeed: 105,
    reverseMaxSpeed: 30,
    acceleration: 50,
    brakingForce: 280,
    friction: 0.985,
    turnSpeed: 3.8,
    maxSteerAngle: 1.15,
    minSteerAngle: 0.07,
    grip: 0.965,
    driftGrip: 0.25,
    name: 'Сочленённый автобус «гармошка»'
  },
  bus_minibus: {
    type: 'bus_minibus',
    width: 21,
    length: 42,
    wheelBase: 26,
    mass: 2100,
    maxSpeed: 150,
    reverseMaxSpeed: 55,
    acceleration: 92,
    brakingForce: 240,
    friction: 0.986,
    turnSpeed: 4.3,
    maxSteerAngle: 0.76,
    minSteerAngle: 0.13,
    grip: 0.982,
    driftGrip: 0.36,
    name: 'Маршрутное такси (микроавтобус)'
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
  ambulance_van: {
    type: 'ambulance_van',
    width: 23,
    length: 52,
    wheelBase: 33,
    mass: 2600,
    maxSpeed: 170,
    reverseMaxSpeed: 60,
    acceleration: 108,
    brakingForce: 280,
    friction: 0.988,
    turnSpeed: 4.0,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.12,
    grip: 0.985,
    driftGrip: 0.35,
    name: 'Реанимационный фургон'
  },
  ambulance_suv: {
    type: 'ambulance_suv',
    width: 21,
    length: 46,
    wheelBase: 28,
    mass: 1950,
    maxSpeed: 185,
    reverseMaxSpeed: 70,
    acceleration: 120,
    brakingForce: 270,
    friction: 0.988,
    turnSpeed: 4.3,
    maxSteerAngle: 0.74,
    minSteerAngle: 0.13,
    grip: 0.986,
    driftGrip: 0.38,
    name: 'Фельдшерский внедорожник'
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
    mass: 5800,
    maxSpeed: 140,
    reverseMaxSpeed: 38,
    acceleration: 72,
    brakingForce: 290,
    friction: 0.983,
    turnSpeed: 4.2,
    maxSteerAngle: 1.22,
    minSteerAngle: 0.08,
    grip: 0.965,
    driftGrip: 0.26,
    name: 'Карьерный самосвал'
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
  truck_water: {
    type: 'truck_water',
    width: 27,
    length: 68,
    wheelBase: 42,
    mass: 4600,
    maxSpeed: 135,
    reverseMaxSpeed: 38,
    acceleration: 72,
    brakingForce: 275,
    friction: 0.984,
    turnSpeed: 4.1,
    maxSteerAngle: 1.10,
    minSteerAngle: 0.09,
    grip: 0.965,
    driftGrip: 0.28,
    name: 'Капотный водовоз «ВОДА»'
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

const JACKET_COLORS = ['#1e293b', '#334155', '#475569', '#78350f', '#0f172a', '#1e3a8a', '#14532d', '#701a75', '#312e81'];
const INNER_SHIRT_COLORS = ['#ffffff', '#f8fafc', '#38bdf8', '#f43f5e', '#f59e0b', '#10b981', '#a855f7'];

export function generateRandomPedestrianAppearance() {
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  
  const ageRoll = Math.random();
  let ageGroup: 'child' | 'adult' | 'elderly' = 'adult';
  if (ageRoll < 0.15) ageGroup = 'child';
  else if (ageRoll < 0.25) ageGroup = 'elderly';
  
  const hairStylesMale = ['short', 'bald', 'spiky', 'curly', 'afro'];
  const hairStylesFemale = ['short', 'long', 'bun', 'ponytail', 'curly', 'afro'];
  const hairStyle = gender === 'male' 
    ? hairStylesMale[Math.floor(Math.random() * hairStylesMale.length)] 
    : hairStylesFemale[Math.floor(Math.random() * hairStylesFemale.length)];
  
  const clothingTypes = ['tshirt', 'button_shirt', 'open_jacket', 'hoodie', 'suit', 'vest'];
  if (gender === 'female') clothingTypes.push('dress');
  const clothingType = clothingTypes[Math.floor(Math.random() * clothingTypes.length)] as 'tshirt' | 'button_shirt' | 'open_jacket' | 'hoodie' | 'dress' | 'suit' | 'vest';

  const jacketColor = JACKET_COLORS[Math.floor(Math.random() * JACKET_COLORS.length)];
  const innerShirtColor = INNER_SHIRT_COLORS[Math.floor(Math.random() * INNER_SHIRT_COLORS.length)];

  const hasHat = Math.random() < 0.22;
  const hatType = ['cap', 'beanie', 'sunhat', 'fedora'][Math.floor(Math.random() * 4)] as 'cap' | 'beanie' | 'sunhat' | 'fedora';
  
  const hasGlasses = Math.random() < 0.25;
  const hasHeadphones = Math.random() < 0.18;

  const handheldProps = ['phone', 'coffee', 'bag', 'box', null, null];
  const handheldProp = handheldProps[Math.floor(Math.random() * handheldProps.length)] as 'phone' | 'coffee' | 'bag' | 'box' | null;

  return {
    gender: gender as 'male' | 'female',
    ageGroup,
    clothingType,
    jacketColor,
    innerShirtColor,
    skinColor: PED_SKIN_COLORS[Math.floor(Math.random() * PED_SKIN_COLORS.length)],
    shirtColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)],
    pantsColor: PED_PANTS_COLORS[Math.floor(Math.random() * PED_PANTS_COLORS.length)],
    hairColor: PED_HAIR_COLORS[Math.floor(Math.random() * PED_HAIR_COLORS.length)],
    hairStyle: hairStyle as 'short' | 'long' | 'bald' | 'bun' | 'spiky' | 'ponytail' | 'curly' | 'afro',
    hasHat,
    hatColor: PED_SHIRT_COLORS[Math.floor(Math.random() * PED_SHIRT_COLORS.length)],
    hatType,
    hasGlasses,
    hasHeadphones,
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

  // 3. GENERATE SIDEWALK WALKWAYS, PARKING PLAZAS, REALISTIC COURTYARDS & BUILDINGS WITHIN BLOCKS
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
      const isAutoCenter = bx === 4 && by === 2;
      const isPoliceStation = bx === 3 && by === 1;
      const isHospital = bx === 4 && by === 1;
      const isFireStation = bx === 5 && by === 1;
      const isIndustrial = (bx < 3 && by >= 6) || (bx >= 7 && by < 4);
      const isCommercialDowntown = (bx === 4 && by === 3) || (bx === 5 && by === 4) || (bx === 6 && by === 3) || (bx === 6 && by === 4) || (bx === 3 && by === 2);
      const isCourtyardBlock = (bx === 2 && by === 3) || (bx === 3 && by === 3) || (bx === 4 && by === 4) || 
                               (bx === 5 && by === 5) || (bx === 3 && by === 5) || (bx === 5 && by === 2) || 
                               (bx === 2 && by === 4) || (bx === 3 && by === 4) || (bx === 4 && by === 5) || 
                               (bx === 2 && by === 6) || (bx === 3 && by === 6) || (bx === 4 && by === 6) || 
                               (bx === 5 && by === 6);

      let swStyle: SidewalkBlock['style'] = 'urban';
      if (isForest) swStyle = 'park';
      else if (isVillage) swStyle = 'village';
      else if (isCentralPark) swStyle = 'park';
      else if (isCommercialDowntown || isAutoCenter) swStyle = 'commercial';

      const blockWalkways: SidewalkBlock['walkways'] = [];
      const blockPlazas: SidewalkBlock['plazas'] = [];
      const driveways: SidewalkBlock['driveways'] = [];

      // Configure block driveways
      if (isAutoCenter) {
        driveways.push({ side: 'south', offset: Math.floor(blockW - 140), width: 60 });
        driveways.push({ side: 'west', offset: Math.floor(blockH - 140), width: 60 });
      } else if (isCourtyardBlock) {
        driveways.push({ side: 'south', offset: Math.floor(blockW - 120), width: 60 });
        driveways.push({ side: 'east', offset: Math.floor(blockH - 120), width: 60 });
      } else if (isPoliceStation || isHospital || isFireStation) {
        driveways.push({ side: 'south', offset: Math.floor(blockW / 2 - 30), width: 60 });
      } else if (isIndustrial) {
        driveways.push({ side: 'north', offset: 80, width: 70 });
        driveways.push({ side: 'south', offset: Math.floor(blockW - 150), width: 70 });
      }

      // 1. Register outer perimeter Sidewalk block geometry
      if (!isForest) {
        sidewalks.push({
          id: `sidewalk_${bx}_${by}`,
          x: blockX,
          y: blockY,
          width: blockW,
          height: blockH,
          sidewalkWidth,
          style: swStyle,
          innerLawnColor: isVillage ? '#16a34a' : '#15803d',
          driveways,
          walkways: blockWalkways,
          plazas: blockPlazas
        });

        // Outer perimeter pedestrian navigation path
        const swWalkCenter = sidewalkWidth / 2;
        pedestrianPaths.push({
          id: `sidewalk_block_${bx}_${by}`,
          waypoints: [
            { x: blockX + swWalkCenter, y: blockY + swWalkCenter },
            { x: blockX + blockW - swWalkCenter, y: blockY + swWalkCenter },
            { x: blockX + blockW - swWalkCenter, y: blockY + blockH - swWalkCenter },
            { x: blockX + swWalkCenter, y: blockY + blockH - swWalkCenter },
            { x: blockX + swWalkCenter, y: blockY + swWalkCenter }
          ]
        });
      }

      // Add regular street lamps and perimeter sidewalk amenities (ensuring clear driveway margins)
      if (!isForest) {
        const lampSpacing = 95;
        // North edge lamps
        for (let lx = blockX + 45; lx < blockX + blockW - 40; lx += lampSpacing) {
          props.push({ id: `lamp_n_${bx}_${by}_${lx.toFixed(0)}`, x: lx, y: blockY + sidewalkWidth / 2, type: 'lamp', angle: 0 });
        }
        // South edge lamps (skip driveway corridor)
        for (let lx = blockX + 45; lx < blockX + blockW - 40; lx += lampSpacing) {
          const isNearDriveway = driveways.some(d => d.side === 'south' && Math.abs(lx - (blockX + d.offset + d.width / 2)) < 55);
          if (!isNearDriveway) {
            props.push({ id: `lamp_s_${bx}_${by}_${lx.toFixed(0)}`, x: lx, y: blockY + blockH - sidewalkWidth / 2, type: 'lamp', angle: 0 });
          }
        }
        // West edge lamps
        for (let ly = blockY + 55; ly < blockY + blockH - 50; ly += lampSpacing) {
          const isNearDriveway = driveways.some(d => d.side === 'west' && Math.abs(ly - (blockY + d.offset + d.width / 2)) < 55);
          if (!isNearDriveway) {
            props.push({ id: `lamp_w_${bx}_${by}_${ly.toFixed(0)}`, x: blockX + sidewalkWidth / 2, y: ly, type: 'lamp', angle: Math.PI / 2 });
          }
        }
        // East edge lamps
        for (let ly = blockY + 55; ly < blockY + blockH - 50; ly += lampSpacing) {
          const isNearDriveway = driveways.some(d => d.side === 'east' && Math.abs(ly - (blockY + d.offset + d.width / 2)) < 55);
          if (!isNearDriveway) {
            props.push({ id: `lamp_e_${bx}_${by}_${ly.toFixed(0)}`, x: blockX + blockW - sidewalkWidth / 2, y: ly, type: 'lamp', angle: -Math.PI / 2 });
          }
        }

        // Sidewalk resting benches (with trash cans) along outer sidewalks
        if (blockW > 200) {
          props.push(
            { id: `sw_bench_${bx}_${by}_n`, x: blockX + 80, y: blockY + sidewalkWidth / 2, type: 'bench', angle: 0 },
            { id: `sw_urn_${bx}_${by}_n`, x: blockX + 96, y: blockY + sidewalkWidth / 2, type: 'trash_can', angle: 0 },
            { id: `sw_bench_${bx}_${by}_s`, x: blockX + 80, y: blockY + blockH - sidewalkWidth / 2, type: 'bench', angle: Math.PI },
            { id: `sw_urn_${bx}_${by}_s`, x: blockX + 96, y: blockY + blockH - sidewalkWidth / 2, type: 'trash_can', angle: Math.PI }
          );
        }
      }

      // =========================================================================
      // --- 1. FOREST ZONE (North-West) ---
      // =========================================================================
      if (isForest) {
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
            { id: `forest_urn_${bx}_${by}_1`, x: clX - 40, y: clY - 20, type: 'trash_can', angle: 0 },
            { id: `forest_bench_${bx}_${by}_2`, x: clX + 25, y: clY + 20, type: 'bench', angle: Math.PI },
            { id: `forest_urn_${bx}_${by}_2`, x: clX + 40, y: clY + 20, type: 'trash_can', angle: Math.PI }
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

      // =========================================================================
      // --- 2. CENTRAL PARK PROMENADE (NO CARS, COMPLETE PAVED WALKWAY NETWORK) ---
      // =========================================================================
      if (isCentralPark) {
        const cx = blockX + blockW / 2;
        const cy = blockY + blockH / 2;

        // Paved Central Fountain Plaza
        blockPlazas.push(
          { x: cx - 75, y: cy - 75, width: 150, height: 150, shape: 'circle', style: 'tile' },
          { x: cx - 40, y: blockY + sidewalkWidth, width: 80, height: 35, shape: 'rect', style: 'stone' },
          { x: cx - 40, y: blockY + blockH - sidewalkWidth - 35, width: 80, height: 35, shape: 'rect', style: 'stone' },
          { x: blockX + sidewalkWidth, y: cy - 40, width: 35, height: 80, shape: 'rect', style: 'stone' },
          { x: blockX + blockW - sidewalkWidth - 35, y: cy - 40, width: 35, height: 80, shape: 'rect', style: 'stone' }
        );

        // Paved Axial Promenades (Connecting all entrances to central fountain)
        blockWalkways.push(
          // North-South Central Promenade
          { x: cx - 18, y: blockY + sidewalkWidth, width: 36, height: blockH - sidewalkWidth * 2, style: 'stone' },
          // East-West Central Promenade
          { x: blockX + sidewalkWidth, y: cy - 18, width: blockW - sidewalkWidth * 2, height: 36, style: 'stone' },
          // Diagonal garden paths
          { x: blockX + 60, y: blockY + 60, width: 120, height: 20, style: 'stone' },
          { x: blockX + blockW - 180, y: blockY + 60, width: 120, height: 20, style: 'stone' },
          { x: blockX + 60, y: blockY + blockH - 80, width: 120, height: 20, style: 'stone' },
          { x: blockX + blockW - 180, y: blockY + blockH - 80, width: 120, height: 20, style: 'stone' }
        );

        // Grand Central Park Fountain
        buildings.push({
          id: `park_fountain_${bx}_${by}`,
          x: cx - 38,
          y: cy - 38,
          width: 76,
          height: 76,
          type: 'park_monument',
          color: '#38bdf8',
          roofColor: '#0284c7',
          accentColor: '#e0f2fe',
          roofDetails: [{ type: 'pool', rx: 0.12, ry: 0.12, rw: 0.76, rh: 0.76 }],
          windows: []
        });

        // Lush trees planted strictly on garden lawn areas (away from promenades)
        for (let tx = blockX + 50; tx < blockX + blockW - 50; tx += 60) {
          for (let ty = blockY + 50; ty < blockY + blockH - 50; ty += 60) {
            const distCenter = Math.hypot(tx - cx, ty - cy);
            const isAxialX = Math.abs(tx - cx) < 35;
            const isAxialY = Math.abs(ty - cy) < 35;
            if (distCenter > 85 && !isAxialX && !isAxialY && Math.random() > 0.2) {
              trees.push({
                id: `park_tree_${tx}_${ty}`,
                x: tx + (Math.random() * 12 - 6),
                y: ty + (Math.random() * 12 - 6),
                radius: 14 + Math.random() * 10,
                color: Math.random() > 0.5 ? '#15803d' : '#166534',
                shadowOffset: 6
              });
            }
          }
        }

        // Benches, Trash Cans, Flowerbeds & Street Lamps strictly along the paved promenades
        // Central Fountain circular perimeter benches
        props.push(
          { id: `pk_bench_c1`, x: cx - 85, y: cy - 20, type: 'bench', angle: 0 },
          { id: `pk_urn_c1`, x: cx - 85, y: cy - 36, type: 'trash_can', angle: 0 },
          { id: `pk_fl_c1`, x: cx - 85, y: cy + 18, type: 'flowerbed', angle: 0 },

          { id: `pk_bench_c2`, x: cx + 85, y: cy - 20, type: 'bench', angle: Math.PI },
          { id: `pk_urn_c2`, x: cx + 85, y: cy - 36, type: 'trash_can', angle: Math.PI },
          { id: `pk_fl_c2`, x: cx + 85, y: cy + 18, type: 'flowerbed', angle: 0 },

          { id: `pk_bench_c3`, x: cx - 20, y: cy - 85, type: 'bench', angle: Math.PI / 2 },
          { id: `pk_urn_c3`, x: cx - 36, y: cy - 85, type: 'trash_can', angle: Math.PI / 2 },
          { id: `pk_fl_c3`, x: cx + 18, y: cy - 85, type: 'flowerbed', angle: 0 },

          { id: `pk_bench_c4`, x: cx - 20, y: cy + 85, type: 'bench', angle: -Math.PI / 2 },
          { id: `pk_urn_c4`, x: cx - 36, y: cy + 85, type: 'trash_can', angle: -Math.PI / 2 },
          { id: `pk_fl_c4`, x: cx + 18, y: cy + 85, type: 'flowerbed', angle: 0 },

          // North Promenade Walkway Benches & Lamps
          { id: `pk_bench_n1`, x: cx - 26, y: cy - 140, type: 'bench', angle: 0 },
          { id: `pk_urn_n1`, x: cx - 26, y: cy - 156, type: 'trash_can', angle: 0 },
          { id: `pk_lamp_n1`, x: cx + 24, y: cy - 140, type: 'lamp', angle: 0 },

          // South Promenade Walkway Benches & Lamps
          { id: `pk_bench_s1`, x: cx - 26, y: cy + 140, type: 'bench', angle: 0 },
          { id: `pk_urn_s1`, x: cx - 26, y: cy + 156, type: 'trash_can', angle: 0 },
          { id: `pk_lamp_s1`, x: cx + 24, y: cy + 140, type: 'lamp', angle: 0 },

          // West Promenade Walkway Benches & Lamps
          { id: `pk_bench_w1`, x: cx - 140, y: cy - 26, type: 'bench', angle: Math.PI / 2 },
          { id: `pk_urn_w1`, x: cx - 156, y: cy - 26, type: 'trash_can', angle: Math.PI / 2 },
          { id: `pk_lamp_w1`, x: cx - 140, y: cy + 24, type: 'lamp', angle: 0 },

          // East Promenade Walkway Benches & Lamps
          { id: `pk_bench_e1`, x: cx + 140, y: cy - 26, type: 'bench', angle: -Math.PI / 2 },
          { id: `pk_urn_e1`, x: cx + 156, y: cy - 26, type: 'trash_can', angle: -Math.PI / 2 },
          { id: `pk_lamp_e1`, x: cx + 140, y: cy + 24, type: 'lamp', angle: 0 },

          // Park Kiosks & Amenities on entry plazas
          { id: `pk_kiosk_cafe`, x: cx + 55, y: blockY + sidewalkWidth + 18, type: 'kiosk', angle: Math.PI },
          { id: `pk_kiosk_icecream`, x: blockX + sidewalkWidth + 18, y: cy + 55, type: 'kiosk', angle: -Math.PI / 2 }
        );

        // Pedestrian navigation routes along the paved promenades (circling safely around the central fountain)
        pedestrianPaths.push(
          // North-South Promenade Route with Fountain Bypass
          {
            id: `park_path_ns_${bx}_${by}`,
            waypoints: [
              { x: cx, y: blockY + sidewalkWidth },
              { x: cx, y: cy - 58 },
              { x: cx + 41, y: cy - 41 },
              { x: cx + 58, y: cy },
              { x: cx + 41, y: cy + 41 },
              { x: cx, y: cy + 58 },
              { x: cx, y: blockY + blockH - sidewalkWidth },
              { x: cx, y: cy + 58 },
              { x: cx - 41, y: cy + 41 },
              { x: cx - 58, y: cy },
              { x: cx - 41, y: cy - 41 },
              { x: cx, y: cy - 58 }
            ]
          },
          // East-West Promenade Route with Fountain Bypass
          {
            id: `park_path_ew_${bx}_${by}`,
            waypoints: [
              { x: blockX + sidewalkWidth, y: cy },
              { x: cx - 58, y: cy },
              { x: cx - 41, y: cy + 41 },
              { x: cx, y: cy + 58 },
              { x: cx + 41, y: cy + 41 },
              { x: cx + 58, y: cy },
              { x: blockX + blockW - sidewalkWidth, y: cy },
              { x: cx + 58, y: cy },
              { x: cx + 41, y: cy - 41 },
              { x: cx, y: cy - 58 },
              { x: cx - 41, y: cy - 41 },
              { x: cx - 58, y: cy }
            ]
          },
          // Central Fountain Circular Plaza Ring Walkway
          {
            id: `park_path_ring_${bx}_${by}`,
            waypoints: [
              { x: cx, y: cy - 58 },
              { x: cx + 41, y: cy - 41 },
              { x: cx + 58, y: cy },
              { x: cx + 41, y: cy + 41 },
              { x: cx, y: cy + 58 },
              { x: cx - 41, y: cy + 41 },
              { x: cx - 58, y: cy },
              { x: cx - 41, y: cy - 41 }
            ]
          },
          // Diagonal Garden Promenade NW to SE
          {
            id: `park_path_diag1_${bx}_${by}`,
            waypoints: [
              { x: blockX + 70, y: blockY + 70 },
              { x: cx - 41, y: cy - 41 },
              { x: cx, y: cy - 58 },
              { x: cx + 41, y: cy - 41 },
              { x: cx + 58, y: cy },
              { x: cx + 41, y: cy + 41 },
              { x: blockX + blockW - 70, y: blockY + blockH - 70 }
            ]
          },
          // Diagonal Garden Promenade NE to SW
          {
            id: `park_path_diag2_${bx}_${by}`,
            waypoints: [
              { x: blockX + blockW - 70, y: blockY + 70 },
              { x: cx + 41, y: cy - 41 },
              { x: cx + 58, y: cy },
              { x: cx + 41, y: cy + 41 },
              { x: cx, y: cy + 58 },
              { x: cx - 41, y: cy + 41 },
              { x: blockX + 70, y: blockY + blockH - 70 }
            ]
          }
        );

        continue;
      }

      // =========================================================================
      // --- 3. CENTRAL AUTO DEALERSHIP & SHOWROOM PLAZA (bx: 4, by: 2) ---
      // =========================================================================
      if (isAutoCenter) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        // Modern Glass Showroom Building (North-West)
        const showW = Math.min(260, innerW * 0.55);
        const showH = 75;
        buildings.push({
          id: `auto_showroom_${bx}_${by}`,
          x: innerX + 10,
          y: innerY + 10,
          width: showW,
          height: showH,
          type: 'shop',
          color: '#1e293b',
          roofColor: '#0f172a',
          accentColor: '#38bdf8',
          windows: [],
          entranceSide: 'south',
          roofDetails: [{ type: 'ac', rx: 0.2, ry: 0.2, rw: 0.15, rh: 0.4 }]
        });

        // Paved Dealership Entrance Plaza
        blockPlazas.push({
          x: innerX + 10,
          y: innerY + 90,
          width: showW,
          height: 35,
          shape: 'rect',
          style: 'tile'
        });

        // Customer walkway from showroom to test drive lot
        blockWalkways.push({
          x: innerX + 20,
          y: innerY + 125,
          width: 24,
          height: innerH - 145,
          style: 'concrete'
        });

        // Large Organized Dealership Parking Lot (Stalls for Showcase Vehicles)
        const pkX = innerX + showW + 20;
        const pkY = innerY + 10;
        const pkW = innerW - showW - 30;
        const pkH = innerH - 20;

        const autoSpots: ParkingArea['spots'] = [];
        const numRows = Math.floor(pkH / 50);
        for (let s = 0; s < numRows; s++) {
          const sy = pkY + 25 + s * 50;
          autoSpots.push(
            { x: pkX + 45, y: sy, angle: 0, occupied: false },
            { x: pkX + pkW - 45, y: sy, angle: Math.PI, occupied: false }
          );
        }

        parkings.push({
          id: `dealership_parking_${bx}_${by}`,
          x: pkX,
          y: pkY,
          width: pkW,
          height: pkH,
          spots: autoSpots
        });

        // Dealership lighting, customer benches, urns & waste area
        props.push(
          { id: `dl_lamp_1`, x: pkX + 20, y: pkY + 15, type: 'lamp', angle: 0 },
          { id: `dl_lamp_2`, x: pkX + pkW - 20, y: pkY + 15, type: 'lamp', angle: 0 },
          { id: `dl_lamp_3`, x: pkX + 20, y: pkY + pkH - 20, type: 'lamp', angle: 0 },
          { id: `dl_lamp_4`, x: pkX + pkW - 20, y: pkY + pkH - 20, type: 'lamp', angle: 0 },

          // Showroom customer entrance benches & urns
          { id: `dl_bench_1`, x: innerX + 45, y: innerY + 105, type: 'bench', angle: -Math.PI / 2 },
          { id: `dl_urn_1`, x: innerX + 65, y: innerY + 105, type: 'trash_can', angle: 0 },
          { id: `dl_flower_1`, x: innerX + 90, y: innerY + 105, type: 'flowerbed', angle: 0 },

          // Dealership waste station (far corner, clear of driving path)
          { id: `dl_dump_1`, x: innerX + showW - 20, y: innerY + innerH - 25, type: 'dumpster', angle: 0 },
          { id: `dl_dump_2`, x: innerX + showW + 15, y: innerY + innerH - 25, type: 'dumpster', angle: 0 }
        );

        // SPAWN THE PLAYER STARTER VEHICLE & SHOWCASE TEST-DRIVE VEHICLES HERE IN THE DEALERSHIP!
        const starterTruckX = pkX + 45;
        const starterTruckY = pkY + 25;

        vehicles.push({
          id: `veh_player_starter`,
          type: 'pickup',
          x: starterTruckX,
          y: starterTruckY,
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
          mass: CAR_CONFIGS['pickup'].mass,
          width: CAR_CONFIGS['pickup'].width,
          length: CAR_CONFIGS['pickup'].length,
          wheelBase: CAR_CONFIGS['pickup'].wheelBase,
          color: '#b45309',
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

        // Showcase Heavy Vehicles cleanly parked in dealership stalls
        const showcaseVehiclesList: { type: CarType; color: string; roofColor: string }[] = [
          { type: 'truck_box', color: '#0284c7', roofColor: '#0284c7' },
          { type: 'truck_dump', color: '#d97706', roofColor: '#d97706' },
          { type: 'truck_water', color: '#0284c7', roofColor: '#0284c7' },
          { type: 'bus_articulated', color: '#eab308', roofColor: '#ffffff' },
          { type: 'fire_ladder', color: '#dc2626', roofColor: '#ffffff' }
        ];

        showcaseVehiclesList.forEach((sc, idx) => {
          const cfg = CAR_CONFIGS[sc.type];
          const vy = pkY + 25 + (idx + 1) * 50;
          if (vy < pkY + pkH - 20) {
            vehicles.push({
              id: `veh_showcase_${sc.type}`,
              type: sc.type,
              x: pkX + pkW - 45,
              y: vy,
              vx: 0,
              vy: 0,
              angle: Math.PI,
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
              color: sc.color,
              roofColor: sc.roofColor,
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

        continue;
      }

      // =========================================================================
      // --- 4. COZY RESIDENTIAL COURTYARD BLOCKS (ЖИЛЫЕ ДВОРЫ С ТРОТУАРАМИ) ---
      // =========================================================================
      if (isCourtyardBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        // 1. North Residential Wing (Multi-entrance apartment block)
        const northW = innerW - 90;
        const northH = 60;
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
            { side: 'south', offset: 0.2, length: 18, depth: 6 },
            { side: 'south', offset: 0.5, length: 18, depth: 6 },
            { side: 'south', offset: 0.8, length: 18, depth: 6 }
          ],
          fireEscapes: [{ side: 'north', offset: 0.5, length: 20, depth: 5 }],
          entranceSide: 'south',
          roofDetails: [{ type: 'ac', rx: 0.3, ry: 0.3, rw: 0.15, rh: 0.4 }]
        });

        // 2. West Residential Wing (Vertical apartment block)
        const westW = 60;
        const westH = innerH - 120;
        buildings.push({
          id: `court_bld_w_${bx}_${by}`,
          x: innerX + 5,
          y: innerY + 75,
          width: westW,
          height: westH,
          type: 'residential',
          color: '#334155',
          roofColor: '#1e293b',
          accentColor: '#38bdf8',
          windows: [],
          balconies: [
            { side: 'east', offset: 0.3, length: 18, depth: 6 },
            { side: 'east', offset: 0.7, length: 18, depth: 6 }
          ],
          fireEscapes: [{ side: 'west', offset: 0.5, length: 20, depth: 5 }],
          entranceSide: 'east',
          roofDetails: []
        });

        // Courtyard Geometry Bounds
        const courtLeft = innerX + 75;
        const courtTop = innerY + 75;
        const courtW = innerW - 90;
        const courtH = innerH - 85;

        // Paved Walkways (Тротуары во дворе):
        // Main corridor walkway linking North entrances, West entrances, recreation square and street sidewalk
        blockWalkways.push(
          // Paved walkway along North building entrances
          { x: innerX + 5, y: innerY + northH + 5, width: northW, height: 18, style: 'concrete' },
          // Paved walkway along West building entrances
          { x: innerX + westW + 5, y: innerY + 75, width: 18, height: westH, style: 'concrete' },
          // Transverse connecting walkway to courtyard center
          { x: courtLeft, y: courtTop + 40, width: courtW - 130, height: 16, style: 'concrete' },
          // Walkway connecting to South street sidewalk
          { x: innerX + 30, y: innerY + 75 + westH, width: 18, height: innerH - (75 + westH), style: 'concrete' }
        );

        // Central Courtyard Recreation Plaza (Зона отдыха с плиткой, лавочками и клумбами)
        const plazaW = 90;
        const plazaH = 70;
        const plazaX = courtLeft + 15;
        const plazaY = courtTop + 15;
        blockPlazas.push({
          x: plazaX,
          y: plazaY,
          width: plazaW,
          height: plazaH,
          shape: 'rect',
          style: 'tile'
        });

        // Courtyard Residential Parking Lot (Парковка во дворе со свободным въездом)
        const pkW = 120;
        const pkH = courtH - 20;
        const pkX = innerX + innerW - pkW - 10;
        const pkY = courtTop + 10;

        const courtSpots: ParkingArea['spots'] = [];
        const numCourtRows = Math.floor(pkH / 44);
        for (let cs = 0; cs < numCourtRows; cs++) {
          courtSpots.push({
            x: pkX + pkW / 2,
            y: pkY + 20 + cs * 44,
            angle: 0,
            occupied: cs === 0 && (bx + by) % 3 === 0
          });
        }

        parkings.push({
          id: `court_parking_${bx}_${by}`,
          x: pkX,
          y: pkY,
          width: pkW,
          height: pkH,
          spots: courtSpots
        });

        // Courtyard Greenery Trees
        trees.push(
          { id: `court_tree_${bx}_${by}_1`, x: plazaX + plazaW / 2, y: plazaY - 20, radius: 13, color: '#15803d', shadowOffset: 4 },
          { id: `court_tree_${bx}_${by}_2`, x: plazaX + plazaW / 2, y: plazaY + plazaH + 20, radius: 12, color: '#166534', shadowOffset: 4 }
        );

        // Courtyard Amenities: Benches strictly on paved walkways, streetlamps, flowerbeds, and corner dumpster corral
        props.push(
          // Benches & Urns on Central Recreation Plaza
          { id: `c_bench_${bx}_${by}_1`, x: plazaX + 16, y: plazaY + 20, type: 'bench', angle: 0 },
          { id: `c_urn_${bx}_${by}_1`, x: plazaX + 16, y: plazaY + 36, type: 'trash_can', angle: 0 },
          { id: `c_flower_${bx}_${by}_1`, x: plazaX + 16, y: plazaY + 54, type: 'flowerbed', angle: 0 },

          { id: `c_bench_${bx}_${by}_2`, x: plazaX + plazaW - 16, y: plazaY + 20, type: 'bench', angle: Math.PI },
          { id: `c_urn_${bx}_${by}_2`, x: plazaX + plazaW - 16, y: plazaY + 36, type: 'trash_can', angle: Math.PI },
          { id: `c_flower_${bx}_${by}_2`, x: plazaX + plazaW - 16, y: plazaY + 54, type: 'flowerbed', angle: 0 },

          // Entrance benches & urns for building residents (on concrete entrance walkway)
          { id: `c_ent_bench_n`, x: innerX + northW * 0.35, y: innerY + northH + 12, type: 'bench', angle: -Math.PI / 2 },
          { id: `c_ent_urn_n`, x: innerX + northW * 0.35 + 16, y: innerY + northH + 12, type: 'trash_can', angle: 0 },

          { id: `c_ent_bench_w`, x: innerX + westW + 12, y: innerY + 75 + westH * 0.4, type: 'bench', angle: 0 },
          { id: `c_ent_urn_w`, x: innerX + westW + 12, y: innerY + 75 + westH * 0.4 + 16, type: 'trash_can', angle: 0 },

          // Courtyard Night Illumination Streetlamps
          { id: `c_lamp_${bx}_${by}_1`, x: plazaX + plazaW / 2, y: plazaY + plazaH / 2, type: 'lamp', angle: 0 },
          { id: `c_lamp_${bx}_${by}_2`, x: pkX - 12, y: pkY + 25, type: 'lamp', angle: 0 },
          { id: `c_lamp_${bx}_${by}_3`, x: pkX - 12, y: pkY + pkH - 25, type: 'lamp', angle: 0 },

          // Waste Disposal Area (Площадка ТБО) strictly in far corner, 100% clear of all driveways!
          { id: `c_dump_${bx}_${by}_1`, x: innerX + innerW - 35, y: innerY + 25, type: 'dumpster', angle: Math.PI / 2 },
          { id: `c_dump_${bx}_${by}_2`, x: innerX + innerW - 35, y: innerY + 48, type: 'dumpster', angle: Math.PI / 2 },
          { id: `c_dump_urn`, x: innerX + innerW - 35, y: innerY + 68, type: 'trash_can', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 5. PUBLIC SERVICES & MUNICIPAL BUILDINGS (POLICE, HOSPITAL, FIRE) ---
      // =========================================================================
      if (isPoliceStation || isHospital || isFireStation) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        let bType: Building['type'] = 'office';
        let bColor = '#0f172a';
        let bRoof = '#1e293b';
        let bAccent = '#38bdf8';

        if (isHospital) {
          bColor = '#f8fafc';
          bRoof = '#e2e8f0';
          bAccent = '#ef4444';
        } else if (isFireStation) {
          bColor = '#7f1d1d';
          bRoof = '#991b1b';
          bAccent = '#f59e0b';
        }

        const bW = innerW - 140;
        const bH = 80;
        buildings.push({
          id: `mun_bld_${bx}_${by}`,
          x: innerX + 10,
          y: innerY + 10,
          width: bW,
          height: bH,
          type: bType,
          color: bColor,
          roofColor: bRoof,
          accentColor: bAccent,
          windows: [],
          entranceSide: 'south',
          roofDetails: isHospital ? [{ type: 'helipad', rx: 0.6, ry: 0.15, rw: 0.35, rh: 0.7 }] : []
        });

        // Entrance Plaza & Walkways
        blockPlazas.push({
          x: innerX + 10,
          y: innerY + 95,
          width: bW,
          height: 35,
          shape: 'rect',
          style: 'tile'
        });

        // Emergency Parking Lot
        const pkX = innerX + bW + 20;
        const pkY = innerY + 10;
        const pkW = innerW - bW - 30;
        const pkH = innerH - 20;

        const munSpots: ParkingArea['spots'] = [];
        const numRows = Math.floor(pkH / 45);
        for (let s = 0; s < numRows; s++) {
          munSpots.push({ x: pkX + pkW / 2, y: pkY + 20 + s * 45, angle: 0, occupied: s === 0 && (bx + by) % 2 === 0 });
        }

        parkings.push({
          id: `mun_parking_${bx}_${by}`,
          x: pkX,
          y: pkY,
          width: pkW,
          height: pkH,
          spots: munSpots
        });

        props.push(
          { id: `mun_lamp_1`, x: pkX + pkW / 2, y: pkY + 15, type: 'lamp', angle: 0 },
          { id: `mun_lamp_2`, x: innerX + 35, y: innerY + 110, type: 'lamp', angle: 0 },
          { id: `mun_bench_1`, x: innerX + 60, y: innerY + 110, type: 'bench', angle: -Math.PI / 2 },
          { id: `mun_urn_1`, x: innerX + 76, y: innerY + 110, type: 'trash_can', angle: 0 },
          { id: `mun_flower_1`, x: innerX + 105, y: innerY + 110, type: 'flowerbed', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 6. COZY SUBURBAN & VILLAGE ZONE (South-East) ---
      // =========================================================================
      if (isVillage) {
        const cW = 65 + Math.random() * 15;
        const cH = 65 + Math.random() * 15;

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

        // Village Cobblestone Walkways
        blockWalkways.push({
          x: blockX + sidewalkWidth + cW + 15,
          y: blockY + sidewalkWidth + 25,
          width: blockW - sidewalkWidth * 2 - cW * 2 - 30,
          height: 16,
          style: 'cobblestone'
        });

        // Orchard gardens & rustic benches on stone pads
        for (let tx = blockX + sidewalkWidth + 15; tx < blockX + blockW - sidewalkWidth - 15; tx += 45) {
          for (let ty = blockY + sidewalkWidth + 15; ty < blockY + blockH - sidewalkWidth - 15; ty += 45) {
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
          { id: `v_flower_${bx}_${by}_1`, x: blockX + sidewalkWidth + cW + 25, y: blockY + sidewalkWidth + 44, type: 'flowerbed', angle: 0 }
        );
        continue;
      }

      // =========================================================================
      // --- 7. INDUSTRIAL & LOGISTICS FLEET DEPOT ---
      // =========================================================================
      if (isIndustrial) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        // Logistics Warehouse
        const wW = innerW - 120;
        const wH = 75;
        buildings.push({
          id: `ind_wh_${bx}_${by}`,
          x: innerX + 10,
          y: innerY + 10,
          width: wW,
          height: wH,
          type: 'industrial',
          color: '#52525b',
          roofColor: '#3f3f46',
          accentColor: '#eab308',
          windows: [],
          entranceSide: 'south',
          roofDetails: [{ type: 'ac', rx: 0.3, ry: 0.3, rw: 0.15, rh: 0.4 }]
        });

        // Industrial loading yard & truck staging parking
        const pkX = innerX + wW + 20;
        const pkY = innerY + 10;
        const pkW = innerW - wW - 30;
        const pkH = innerH - 20;

        const indSpots: ParkingArea['spots'] = [];
        const numRowsInd = Math.floor(pkH / 48);
        for (let s = 0; s < numRowsInd; s++) {
          indSpots.push({ x: pkX + pkW / 2, y: pkY + 22 + s * 48, angle: 0, occupied: s === 0 && bx % 2 === 0 });
        }

        parkings.push({
          id: `ind_parking_${bx}_${by}`,
          x: pkX,
          y: pkY,
          width: pkW,
          height: pkH,
          spots: indSpots
        });

        // Logistics walkways & heavy dumpsters
        blockWalkways.push({
          x: innerX + 10,
          y: innerY + wH + 10,
          width: wW,
          height: 20,
          style: 'asphalt'
        });

        props.push(
          { id: `ind_dump_1`, x: innerX + 25, y: innerY + innerH - 25, type: 'dumpster', angle: 0 },
          { id: `ind_dump_2`, x: innerX + 60, y: innerY + innerH - 25, type: 'dumpster', angle: 0 },
          { id: `ind_lamp_1`, x: pkX + pkW / 2, y: pkY + 15, type: 'lamp', angle: 0 },
          { id: `ind_lamp_2`, x: innerX + 25, y: innerY + wH + 20, type: 'lamp', angle: 0 },
          { id: `ind_kiosk_guard`, x: innerX + wW - 25, y: innerY + wH + 20, type: 'kiosk', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 8. URBAN DOWNTOWN & HIGH-RISE COMMERCIAL SKYSCRAPERS ---
      // =========================================================================
      const innerX = blockX + sidewalkWidth + 12;
      const innerY = blockY + sidewalkWidth + 12;
      const innerW = blockW - (sidewalkWidth * 2 + 24);
      const innerH = blockH - (sidewalkWidth * 2 + 24);

      const bCols = 2;
      const bRows = 2;
      const bSlotW = innerW / bCols;
      const bSlotH = innerH / bRows;

      // Central Plaza connecting commercial towers
      blockPlazas.push({
        x: innerX + bSlotW - 25,
        y: innerY + bSlotH - 25,
        width: 50,
        height: 50,
        shape: 'rect',
        style: 'tile'
      });

      for (let r = 0; r < bRows; r++) {
        for (let c = 0; c < bCols; c++) {
          const bWidth = bSlotW - 24;
          const bHeight = bSlotH - 24;
          const bxLocal = innerX + c * bSlotW + 12;
          const byLocal = innerY + r * bSlotH + 12;

          if (bWidth < 45 || bHeight < 45) continue;

          let bType: Building['type'] = 'office';
          let color = '#1e293b';
          let roofColor = '#0f172a';
          let accent = '#38bdf8';

          const rand = Math.random();
          if (rand < 0.45) {
            bType = 'office';
            color = '#1e293b';
            roofColor = '#0f172a';
            accent = '#38bdf8';
          } else if (rand < 0.75) {
            bType = 'shop';
            color = '#3f3f46';
            roofColor = '#27272a';
            accent = '#ef4444';
          } else {
            bType = 'residential';
            color = '#475569';
            roofColor = '#334155';
            accent = '#f59e0b';
          }

          let entSide: 'north' | 'south' | 'east' | 'west' = 'north';
          if (r === 0 && c === 0) entSide = 'north';
          else if (r === 0 && c === 1) entSide = 'east';
          else if (r === 1 && c === 0) entSide = 'west';
          else if (r === 1 && c === 1) entSide = 'south';

          const balconies: Building['balconies'] = [];
          if (bType === 'residential') {
            balconies.push(
              { side: entSide, offset: 0.25, length: Math.max(14, bWidth * 0.2), depth: 6 },
              { side: entSide, offset: 0.75, length: Math.max(14, bWidth * 0.2), depth: 6 }
            );
          }

          const fireEscapes: Building['fireEscapes'] = [];
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
            roofDetails: [{ type: 'ac', rx: 0.25, ry: 0.25, rw: 0.2, rh: 0.4 }]
          });

          // Paved walkway to entrance
          blockWalkways.push({
            x: bxLocal,
            y: byLocal + bHeight,
            width: bWidth,
            height: 14,
            style: 'concrete'
          });

          // Commercial storefront benches, trash urns, flowerbeds & streetlamps
          props.push({
            id: `sw_bench_${bxLocal}_${byLocal}`,
            x: bxLocal + bWidth * 0.25,
            y: byLocal + bHeight + 7,
            type: 'bench',
            angle: 0
          });
          props.push({
            id: `sw_urn_${bxLocal}_${byLocal}`,
            x: bxLocal + bWidth * 0.25 + 16,
            y: byLocal + bHeight + 7,
            type: 'trash_can',
            angle: 0
          });

          if (bType === 'shop') {
            props.push({
              id: `flower_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth * 0.75,
              y: byLocal + bHeight + 7,
              type: 'flowerbed',
              angle: 0
            });
            props.push({
              id: `boll_${bxLocal}_${byLocal}`,
              x: bxLocal + bWidth + 5,
              y: byLocal + bHeight + 7,
              type: 'bollard',
              angle: 0
            });
          }
        }
      }
    }
  }

  // 4. SPAWN INITIAL MOVING AI TRAFFIC VEHICLES ON ROADS
  const carTypes: CarType[] = [
    'sedan', 'hatchback', 'pickup', 'sports', 'suv', 'taxi', 'police', 
    'fire_engine', 'fire_ladder', 'fire_rescue',
    'bus', 'bus_articulated', 'bus_minibus', 
    'van', 'muscle', 
    'ambulance', 'ambulance_van', 'ambulance_suv',
    'truck_box', 'truck_dump', 'truck_tanker', 'truck_water', 'truck_flatbed', 'cement_mixer', 'garbage_truck'
  ];
  let vehicleCounter = 0;

  roads.forEach((road, rIdx) => {
    road.lanePaths.forEach((lane, lIdx) => {
      const wp1 = lane.waypoints[0];
      const isForest = wp1.x < 3800 && wp1.y < 3800;
      // Spawn vehicles with appropriate gaps to avoid crashes on spawn
      // Keep forest roads mostly peaceful by spawning very few cars there
      if (isForest) {
        if ((rIdx + lIdx) % 18 !== 0) return;
      } else {
        if ((rIdx * 3 + lIdx) % 14 !== 0) return;
      }
      if (vehicleCounter >= 26) return;

      const wp2 = lane.waypoints[1];
      const progress = 0.25 + Math.random() * 0.5;
      const posX = wp1.x + (wp2.x - wp1.x) * progress;
      const posY = wp1.y + (wp2.y - wp1.y) * progress;

      const cType = carTypes[vehicleCounter % carTypes.length];
      const cfg = CAR_CONFIGS[cType];
      let color = CAR_PALETTE[vehicleCounter % CAR_PALETTE.length];
      if (cType === 'taxi') color = '#eab308';
      else if (cType === 'police') color = '#0f172a';
      else if (cType === 'fire_engine' || cType === 'fire_ladder' || cType === 'fire_rescue') color = '#dc2626';
      else if (cType === 'bus' || cType === 'bus_articulated') color = '#eab308';
      else if (cType === 'bus_minibus') color = '#f59e0b';
      else if (cType === 'ambulance' || cType === 'ambulance_van' || cType === 'ambulance_suv') color = '#f8fafc';
      else if (cType === 'van') color = '#6ee7b7';
      else if (cType === 'muscle') color = '#991b1b';
      else if (cType === 'garbage_truck') color = '#16a34a';
      else if (cType === 'truck_dump') color = '#d97706';
      else if (cType === 'cement_mixer') color = '#2563eb';
      else if (cType === 'truck_box') color = '#0284c7';
      else if (cType === 'truck_water') color = '#0284c7';
      else if (cType === 'truck_tanker') color = '#0369a1';
      else if (cType === 'truck_flatbed') color = '#475569';

      const roofColor = (cType === 'police' || cType === 'ambulance' || cType === 'ambulance_van' || cType === 'ambulance_suv' || cType === 'fire_engine' || cType === 'fire_ladder' || cType === 'fire_rescue') ? '#f8fafc' : color;

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

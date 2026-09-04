import { 
  Bird,
  Building, 
  CarConfig,
  CarType, 
  EngineState,
  FuelSystem,
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

export function createDefaultEngineState(
  type: CarType = 'sedan',
  isDrivingTraffic: boolean = false, 
  isParkedOnStreet: boolean = false
): EngineState {
  const radiatorWater = isParkedOnStreet ? Math.round(75 + Math.random() * 25) : 100;
  const oilLevel = isParkedOnStreet ? Math.round(65 + Math.random() * 35) : 100;
  const batteryCharge = isParkedOnStreet ? Math.round(80 + Math.random() * 20) : 100;
  const temperature = isDrivingTraffic ? Math.round(82 + Math.random() * 10) : 20;
  const engineRunning = isDrivingTraffic;
  const engineRPM = isDrivingTraffic ? 850 : 0;

  const configTransmission = CAR_CONFIGS[type]?.transmission;
  const isManual = configTransmission ? configTransmission === 'MANUAL' : [
    'hatchback', 'pickup', 'wagon_classic', 'sedan_classic', 'sedan_compact',
    'hatch_hot', 'micro_car', 'classic_compact', 'retro_bubble', 'offroad_hardcore',
    'suv_classic_box', 'muscle_classic', 'van_camper', 'van_cargo_old', 'truck_tow',
    'delivery_truck', 'truck_box', 'truck_dump', 'truck_tanker', 'truck_water',
    'truck_flatbed', 'cement_mixer', 'garbage_truck', 'bus'
  ].includes(type);
  const transmissionType: 'MANUAL' | 'AUTO' = configTransmission || (isManual ? 'MANUAL' : 'AUTO');

  return {
    radiatorWater,
    radiatorPunctured: false,
    oilLevel,
    oilPunctured: false,
    oilPressure: engineRunning ? oilLevel : 0,
    batteryCharge,
    starterWorking: true,
    temperature,
    engineRunning,
    engineKnocking: false,
    engineStalled: false,
    overheatingSteam: false,
    engineRPM,
    transmissionType,
    autoGearMode: transmissionType === 'AUTO' ? (isParkedOnStreet ? 'P' : 'D') : undefined,
    currentGear: transmissionType === 'AUTO' ? (engineRunning ? 1 : 0) : (engineRunning ? 1 : 0),
    gearRatios: [-3.5, 0, 3.6, 2.1, 1.4, 1.0, 0.8],
    finalDriveRatio: 3.9,
    clutchPedal: 1.0,
    isStalled: false,
    engineHealth: 100,
    isSeized: false,
    transmissionHealth: 100,
    transmissionJammed: false
  };
}

export function createDefaultFuelSystem(type: CarType = 'sedan', isParkedOnStreet: boolean = false): FuelSystem {
  const isDiesel = [
    'bus', 'fire_engine', 'fire_ladder', 'truck_box', 'truck_dump', 'truck_tanker', 
    'truck_water', 'truck_flatbed', 'cement_mixer', 'garbage_truck', 'pickup_heavy', 
    'truck_tow', 'truck_armored', 'delivery_truck', 'van_camper'
  ].includes(type);
  const isVintage92 = [
    'wagon_classic', 'sedan_classic', 'classic_compact', 'retro_bubble', 
    'van_cargo_old', 'muscle_classic'
  ].includes(type);

  // Realistic random tank level if parked on street (15% to 85%), else 100% (or 35%-95% for traffic)
  let tankLevel = 100;
  if (isParkedOnStreet) {
    tankLevel = Math.round(15 + Math.random() * 70);
  } else if (Math.random() < 0.9) { // Driving traffic
    // Some traffic vehicles might have less fuel, but mostly healthy
    tankLevel = Math.round(35 + Math.random() * 55);
  }

  return {
    fuelType: isDiesel ? 'diesel' : (isVintage92 ? 'ai92' : 'ai95'),
    tankLevel,
    tankCapacity: isDiesel ? 120 : (['supercar', 'suv_luxury', 'pickup_heavy', 'offroad_hardcore'].includes(type) ? 80 : 55),
    tankPunctured: false,
    fuelQuality: 100,
    detonation: false,
    octaneNumber: isDiesel ? 45 : (isVintage92 ? 92 : 95)
  };
}

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
    frontCrumple: 0,
    rearCrumple: 0,
    leftDent: 0,
    rightDent: 0,
    frontLeftDent: 0,
    frontRightDent: 0,
    rearLeftDent: 0,
    rearRightDent: 0,
    frontLeftSuspensionDamage: 0,
    frontRightSuspensionDamage: 0,
    rearLeftSuspensionDamage: 0,
    rearRightSuspensionDamage: 0,
    steeringDrift: 0,
    wheelRubResistance: 0,
    hoodBuckled: false,
    windshieldCracked: false,
    rearGlassCracked: false,
    leftHeadlightBroken: false,
    rightHeadlightBroken: false,
    leftTaillightBroken: false,
    rightTaillightBroken: false,
    engineSmoking: false,
    underHoodSmolder: false,
    engineFire: false,
    fuelTankFire: false,
    cabinFire: false,
    fireOrigin: 'front',
    fireProgress: 0,
    fireIntensity: 0,
    fireTimer: 0,
    groundPuddleIgnited: false,
    fuelTankBurntThrough: false,
    isFullyBurnt: false,
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
    name: 'Седан',
    transmission: 'AUTO'
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
    name: 'Хэтчбек',
    transmission: 'MANUAL'
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
    name: 'Пикап',
    transmission: 'MANUAL'
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
    name: 'Спорткар',
    transmission: 'AUTO'
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
    name: 'Внедорожник',
    transmission: 'AUTO'
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
    name: 'Такси',
    transmission: 'AUTO'
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
    name: 'Полицейский автомобиль',
    transmission: 'AUTO'
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
    name: 'Пожарная автоцистерна',
    transmission: 'AUTO'
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
    name: 'Пожарная автолестница',
    transmission: 'AUTO'
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
    name: 'Пожарно-спасательный штаб',
    transmission: 'AUTO'
  },
  bus: {
    type: 'bus',
    width: 27,
    length: 72,
    wheelBase: 44,
    mass: 5800,
    maxSpeed: 110,
    reverseMaxSpeed: 35,
    acceleration: 55,
    brakingForce: 270,
    friction: 0.985,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.08,
    grip: 0.97,
    driftGrip: 0.28,
    name: 'Городской автобус',
    transmission: 'MANUAL'
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
    name: 'Маршрутное такси (микроавтобус)',
    transmission: 'AUTO'
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
    name: 'Микроавтобус',
    transmission: 'AUTO'
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
    name: 'Классический седан',
    transmission: 'AUTO'
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
    name: 'Скорая помощь',
    transmission: 'AUTO'
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
    name: 'Реанимационный фургон',
    transmission: 'AUTO'
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
    name: 'Фельдшерский внедорожник',
    transmission: 'AUTO'
  },
  truck_box: {
    type: 'truck_box',
    width: 26,
    length: 68,
    wheelBase: 42,
    mass: 4800,
    maxSpeed: 145,
    reverseMaxSpeed: 40,
    acceleration: 70,
    brakingForce: 270,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.08,
    grip: 0.965,
    driftGrip: 0.28,
    name: 'Грузовой фургон',
    transmission: 'MANUAL'
  },
  truck_dump: {
    type: 'truck_dump',
    width: 26,
    length: 66,
    wheelBase: 42,
    mass: 5200,
    maxSpeed: 140,
    reverseMaxSpeed: 38,
    acceleration: 72,
    brakingForce: 290,
    friction: 0.983,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.08,
    grip: 0.965,
    driftGrip: 0.26,
    name: 'Карьерный самосвал',
    transmission: 'MANUAL'
  },
  truck_tanker: {
    type: 'truck_tanker',
    width: 26,
    length: 68,
    wheelBase: 42,
    mass: 5000,
    maxSpeed: 145,
    reverseMaxSpeed: 38,
    acceleration: 65,
    brakingForce: 275,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.07,
    grip: 0.955,
    driftGrip: 0.25,
    name: 'Автоцистерна (бензовоз)',
    transmission: 'MANUAL'
  },
  truck_water: {
    type: 'truck_water',
    width: 26,
    length: 68,
    wheelBase: 42,
    mass: 4800,
    maxSpeed: 140,
    reverseMaxSpeed: 38,
    acceleration: 68,
    brakingForce: 275,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.07,
    grip: 0.955,
    driftGrip: 0.25,
    name: 'Водовоз «ВОДА»',
    transmission: 'MANUAL'
  },
  truck_flatbed: {
    type: 'truck_flatbed',
    width: 26,
    length: 68,
    wheelBase: 42,
    mass: 4600,
    maxSpeed: 150,
    reverseMaxSpeed: 42,
    acceleration: 75,
    brakingForce: 270,
    friction: 0.985,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.08,
    grip: 0.970,
    driftGrip: 0.29,
    name: 'Бортовой грузовик',
    transmission: 'MANUAL'
  },
  cement_mixer: {
    type: 'cement_mixer',
    width: 26,
    length: 66,
    wheelBase: 42,
    mass: 5400,
    maxSpeed: 135,
    reverseMaxSpeed: 35,
    acceleration: 62,
    brakingForce: 290,
    friction: 0.982,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.07,
    grip: 0.950,
    driftGrip: 0.24,
    name: 'Автобетономешалка',
    transmission: 'MANUAL'
  },
  garbage_truck: {
    type: 'garbage_truck',
    width: 26,
    length: 66,
    wheelBase: 42,
    mass: 5000,
    maxSpeed: 140,
    reverseMaxSpeed: 40,
    acceleration: 70,
    brakingForce: 280,
    friction: 0.984,
    turnSpeed: 4.2,
    maxSteerAngle: 1.05,
    minSteerAngle: 0.08,
    grip: 0.965,
    driftGrip: 0.27,
    name: 'Мусоровоз',
    transmission: 'MANUAL'
  },
  wagon_classic: {
    type: 'wagon_classic',
    width: 20,
    length: 44,
    wheelBase: 26,
    mass: 1180,
    maxSpeed: 148,
    reverseMaxSpeed: 52,
    acceleration: 88,
    brakingForce: 215,
    friction: 0.987,
    turnSpeed: 4.1,
    maxSteerAngle: 0.74,
    minSteerAngle: 0.14,
    grip: 0.976,
    driftGrip: 0.38,
    name: 'Классический универсал (ВАЗ-2104)',
    transmission: 'MANUAL'
  },
  wagon_modern: {
    type: 'wagon_modern',
    width: 21,
    length: 47,
    wheelBase: 29,
    mass: 1550,
    maxSpeed: 210,
    reverseMaxSpeed: 75,
    acceleration: 125,
    brakingForce: 275,
    friction: 0.989,
    turnSpeed: 4.4,
    maxSteerAngle: 0.73,
    minSteerAngle: 0.13,
    grip: 0.988,
    driftGrip: 0.40,
    name: 'Современный универсал (Touring)',
    transmission: 'AUTO'
  },
  wagon_allroad: {
    type: 'wagon_allroad',
    width: 22,
    length: 47,
    wheelBase: 29,
    mass: 1680,
    maxSpeed: 195,
    reverseMaxSpeed: 70,
    acceleration: 115,
    brakingForce: 265,
    friction: 0.988,
    turnSpeed: 4.2,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.13,
    grip: 0.984,
    driftGrip: 0.37,
    name: 'Внедорожный универсал (Cross Country)',
    transmission: 'AUTO'
  },
  sedan_classic: {
    type: 'sedan_classic',
    width: 20,
    length: 43,
    wheelBase: 26,
    mass: 1100,
    maxSpeed: 152,
    reverseMaxSpeed: 52,
    acceleration: 92,
    brakingForce: 220,
    friction: 0.987,
    turnSpeed: 4.2,
    maxSteerAngle: 0.75,
    minSteerAngle: 0.14,
    grip: 0.975,
    driftGrip: 0.39,
    name: 'Ретро-седан (Жигули / ВАЗ-2106)',
    transmission: 'MANUAL'
  },
  sedan_luxury: {
    type: 'sedan_luxury',
    width: 22,
    length: 52,
    wheelBase: 33,
    mass: 2100,
    maxSpeed: 235,
    reverseMaxSpeed: 80,
    acceleration: 135,
    brakingForce: 285,
    friction: 0.990,
    turnSpeed: 4.1,
    maxSteerAngle: 0.70,
    minSteerAngle: 0.12,
    grip: 0.990,
    driftGrip: 0.36,
    name: 'Представительский седан (Executive L)',
    transmission: 'AUTO'
  },
  sedan_compact: {
    type: 'sedan_compact',
    width: 20,
    length: 43,
    wheelBase: 26,
    mass: 1220,
    maxSpeed: 175,
    reverseMaxSpeed: 65,
    acceleration: 110,
    brakingForce: 250,
    friction: 0.988,
    turnSpeed: 4.3,
    maxSteerAngle: 0.76,
    minSteerAngle: 0.14,
    grip: 0.985,
    driftGrip: 0.38,
    name: 'Городской компакт-седан',
    transmission: 'MANUAL'
  },
  hatch_hot: {
    type: 'hatch_hot',
    width: 21,
    length: 39,
    wheelBase: 24,
    mass: 1280,
    maxSpeed: 235,
    reverseMaxSpeed: 80,
    acceleration: 145,
    brakingForce: 285,
    friction: 0.990,
    turnSpeed: 4.7,
    maxSteerAngle: 0.78,
    minSteerAngle: 0.14,
    grip: 0.992,
    driftGrip: 0.44,
    name: 'Спортивный хот-хэтч (Hot Hatch)',
    transmission: 'MANUAL'
  },
  micro_car: {
    type: 'micro_car',
    width: 17,
    length: 28,
    wheelBase: 18,
    mass: 820,
    maxSpeed: 140,
    reverseMaxSpeed: 50,
    acceleration: 98,
    brakingForce: 235,
    friction: 0.987,
    turnSpeed: 5.2,
    maxSteerAngle: 0.88,
    minSteerAngle: 0.16,
    grip: 0.980,
    driftGrip: 0.35,
    name: 'Микрокар (City Smart)',
    transmission: 'MANUAL'
  },
  classic_compact: {
    type: 'classic_compact',
    width: 19,
    length: 41,
    wheelBase: 25,
    mass: 1040,
    maxSpeed: 142,
    reverseMaxSpeed: 48,
    acceleration: 85,
    brakingForce: 205,
    friction: 0.987,
    turnSpeed: 4.1,
    maxSteerAngle: 0.75,
    minSteerAngle: 0.14,
    grip: 0.970,
    driftGrip: 0.40,
    name: 'Винтажная малолитражка («Копейка» / ВАЗ-2101)',
    transmission: 'MANUAL'
  },
  retro_bubble: {
    type: 'retro_bubble',
    width: 18,
    length: 34,
    wheelBase: 21,
    mass: 760,
    maxSpeed: 125,
    reverseMaxSpeed: 45,
    acceleration: 78,
    brakingForce: 195,
    friction: 0.986,
    turnSpeed: 4.6,
    maxSteerAngle: 0.82,
    minSteerAngle: 0.15,
    grip: 0.965,
    driftGrip: 0.42,
    name: 'Ретро-микрокар («Горбатый» ЗАЗ-965)',
    transmission: 'MANUAL'
  },
  suv_luxury: {
    type: 'suv_luxury',
    width: 23,
    length: 50,
    wheelBase: 31,
    mass: 2450,
    maxSpeed: 220,
    reverseMaxSpeed: 75,
    acceleration: 130,
    brakingForce: 280,
    friction: 0.988,
    turnSpeed: 4.0,
    maxSteerAngle: 0.70,
    minSteerAngle: 0.12,
    grip: 0.986,
    driftGrip: 0.36,
    name: 'Премиальный внедорожник (Luxury 4x4)',
    transmission: 'AUTO'
  },
  offroad_hardcore: {
    type: 'offroad_hardcore',
    width: 23,
    length: 49,
    wheelBase: 29,
    mass: 2350,
    maxSpeed: 150,
    reverseMaxSpeed: 55,
    acceleration: 95,
    brakingForce: 245,
    friction: 0.985,
    turnSpeed: 3.8,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.12,
    grip: 0.980,
    driftGrip: 0.34,
    name: 'Экспедиционный внедорожник (Expedition 4x4)',
    transmission: 'MANUAL'
  },
  crossover_compact: {
    type: 'crossover_compact',
    width: 21,
    length: 44,
    wheelBase: 27,
    mass: 1460,
    maxSpeed: 180,
    reverseMaxSpeed: 65,
    acceleration: 108,
    brakingForce: 255,
    friction: 0.988,
    turnSpeed: 4.2,
    maxSteerAngle: 0.74,
    minSteerAngle: 0.13,
    grip: 0.985,
    driftGrip: 0.37,
    name: 'Городской кроссовер',
    transmission: 'AUTO'
  },
  suv_classic_box: {
    type: 'suv_classic_box',
    width: 22,
    length: 47,
    wheelBase: 28,
    mass: 2550,
    maxSpeed: 190,
    reverseMaxSpeed: 65,
    acceleration: 118,
    brakingForce: 265,
    friction: 0.987,
    turnSpeed: 3.9,
    maxSteerAngle: 0.71,
    minSteerAngle: 0.12,
    grip: 0.982,
    driftGrip: 0.35,
    name: 'Легендарный рамный внедорожник («Гелик»)',
    transmission: 'MANUAL'
  },
  supercar: {
    type: 'supercar',
    width: 23,
    length: 46,
    wheelBase: 28,
    mass: 1380,
    maxSpeed: 285,
    reverseMaxSpeed: 95,
    acceleration: 175,
    brakingForce: 330,
    friction: 0.992,
    turnSpeed: 4.9,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.12,
    grip: 0.995,
    driftGrip: 0.48,
    name: 'Гиперкар (Exotic Supercar)',
    transmission: 'AUTO'
  },
  muscle_classic: {
    type: 'muscle_classic',
    width: 22,
    length: 48,
    wheelBase: 29,
    mass: 1580,
    maxSpeed: 205,
    reverseMaxSpeed: 70,
    acceleration: 138,
    brakingForce: 235,
    friction: 0.988,
    turnSpeed: 4.0,
    maxSteerAngle: 0.73,
    minSteerAngle: 0.13,
    grip: 0.978,
    driftGrip: 0.46,
    name: 'Винтажный маслкар 1969 (Blower SS)',
    transmission: 'MANUAL'
  },
  coupe_gt: {
    type: 'coupe_gt',
    width: 21,
    length: 47,
    wheelBase: 28,
    mass: 1620,
    maxSpeed: 250,
    reverseMaxSpeed: 85,
    acceleration: 150,
    brakingForce: 300,
    friction: 0.991,
    turnSpeed: 4.5,
    maxSteerAngle: 0.73,
    minSteerAngle: 0.13,
    grip: 0.992,
    driftGrip: 0.42,
    name: 'Спорт-купе Gran Turismo',
    transmission: 'AUTO'
  },
  pickup_heavy: {
    type: 'pickup_heavy',
    width: 25,
    length: 58,
    wheelBase: 37,
    mass: 3400,
    maxSpeed: 160,
    reverseMaxSpeed: 55,
    acceleration: 90,
    brakingForce: 260,
    friction: 0.985,
    turnSpeed: 3.4,
    maxSteerAngle: 0.65,
    minSteerAngle: 0.10,
    grip: 0.978,
    driftGrip: 0.30,
    name: 'Тяжёлый пикап (Heavy Duty Dually 4x4)',
    transmission: 'AUTO'
  },
  van_camper: {
    type: 'van_camper',
    width: 23,
    length: 54,
    wheelBase: 34,
    mass: 2800,
    maxSpeed: 145,
    reverseMaxSpeed: 50,
    acceleration: 82,
    brakingForce: 240,
    friction: 0.985,
    turnSpeed: 3.7,
    maxSteerAngle: 0.70,
    minSteerAngle: 0.11,
    grip: 0.978,
    driftGrip: 0.33,
    name: 'Кемпер / Автодом (Campervan)',
    transmission: 'MANUAL'
  },
  van_cargo_old: {
    type: 'van_cargo_old',
    width: 21,
    length: 44,
    wheelBase: 26,
    mass: 1850,
    maxSpeed: 125,
    reverseMaxSpeed: 45,
    acceleration: 75,
    brakingForce: 215,
    friction: 0.985,
    turnSpeed: 4.0,
    maxSteerAngle: 0.74,
    minSteerAngle: 0.13,
    grip: 0.972,
    driftGrip: 0.35,
    name: 'Ретро-микроавтобус («Буханка»)',
    transmission: 'MANUAL'
  },
  truck_tow: {
    type: 'truck_tow',
    width: 24,
    length: 56,
    wheelBase: 36,
    mass: 3600,
    maxSpeed: 140,
    reverseMaxSpeed: 45,
    acceleration: 78,
    brakingForce: 260,
    friction: 0.984,
    turnSpeed: 3.6,
    maxSteerAngle: 0.68,
    minSteerAngle: 0.10,
    grip: 0.972,
    driftGrip: 0.30,
    name: 'Эвакуатор (Tow Truck)',
    transmission: 'MANUAL'
  },
  truck_armored: {
    type: 'truck_armored',
    width: 24,
    length: 52,
    wheelBase: 32,
    mass: 4500,
    maxSpeed: 145,
    reverseMaxSpeed: 50,
    acceleration: 85,
    brakingForce: 275,
    friction: 0.985,
    turnSpeed: 3.7,
    maxSteerAngle: 0.68,
    minSteerAngle: 0.11,
    grip: 0.980,
    driftGrip: 0.31,
    name: 'Инкассаторский броневик (Armored Bank Transit)',
    transmission: 'AUTO'
  },
  delivery_truck: {
    type: 'delivery_truck',
    width: 24,
    length: 56,
    wheelBase: 35,
    mass: 3100,
    maxSpeed: 135,
    reverseMaxSpeed: 48,
    acceleration: 80,
    brakingForce: 250,
    friction: 0.984,
    turnSpeed: 3.8,
    maxSteerAngle: 0.72,
    minSteerAngle: 0.11,
    grip: 0.975,
    driftGrip: 0.32,
    name: 'Фургон экспресс-доставки (Delivery Stepvan)',
    transmission: 'MANUAL'
  }
};

// Programmatically scale up vehicle performance for realistic, dynamic driving speeds (realistic km/h representation)
Object.keys(CAR_CONFIGS).forEach((key) => {
  const cfg = CAR_CONFIGS[key as CarType];
  if (cfg) {
    const isSports = cfg.type === 'sports' || cfg.type === 'supercar' || cfg.type === 'police';
    const isHeavy = cfg.type && (cfg.type.includes('truck') || cfg.type.includes('bus') || cfg.type === 'cement_mixer' || cfg.type === 'garbage_truck' || cfg.type.includes('fire_'));
    const scaleFactor = isSports ? 2.1 : (isHeavy ? 1.6 : 1.85);
    
    cfg.maxSpeed = Math.round(cfg.maxSpeed * scaleFactor);
    cfg.reverseMaxSpeed = Math.round(cfg.reverseMaxSpeed * scaleFactor);
    
    // Scale acceleration and braking to keep up with the increased velocity bounds
    cfg.acceleration = Math.round(cfg.acceleration * (isSports ? 2.2 : (isHeavy ? 1.5 : 1.9)));
    cfg.brakingForce = Math.round(cfg.brakingForce * (isSports ? 2.4 : (isHeavy ? 1.6 : 2.1)));
    
    // Smooth high speed handling: scale turn speed slightly and bump lateral grip to prevent ice-sliding at 150+ km/h
    cfg.turnSpeed = cfg.turnSpeed * (isSports ? 1.15 : 1.1);
    cfg.grip = Math.min(0.993, cfg.grip * 1.006);
  }
});

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

      // Unique South-West Landmark Districts
      const isStadiumBlock = bx === 0 && by === 6;
      const isTransitHubBlock = bx === 1 && by === 6;
      const isCarDealershipBlock = bx === 0 && by === 7;
      const isCulturalCenterBlock = bx === 1 && by === 7;

      const isIndustrial = (bx === 2 && by === 7) || (bx >= 7 && by < 4);
      const isSchoolBlock = bx === 2 && by === 5;
      const isShoppingMallBlock = bx === 4 && by === 3;
      const isBusinessCenterBlock = bx === 6 && by === 3;
      const isCommercialDowntown = (bx === 5 && by === 4) || (bx === 6 && by === 4) || (bx === 3 && by === 2) || isShoppingMallBlock || isBusinessCenterBlock;
      const isCourtyardBlock = ((bx === 2 && by === 3) || (bx === 3 && by === 3) || (bx === 4 && by === 4) || 
                               (bx === 5 && by === 5) || (bx === 3 && by === 5) || (bx === 5 && by === 2) || 
                               (bx === 2 && by === 4) || (bx === 3 && by === 4) || (bx === 4 && by === 5) || 
                               (bx === 2 && by === 6) || (bx === 3 && by === 6) || (bx === 4 && by === 6) || 
                               (bx === 5 && by === 6)) && !isSchoolBlock && !isStadiumBlock && !isTransitHubBlock && !isCarDealershipBlock && !isCulturalCenterBlock;

      let swStyle: SidewalkBlock['style'] = 'urban';
      if (isForest) swStyle = 'park';
      else if (isVillage) swStyle = 'village';
      else if (isCentralPark || isStadiumBlock || isCulturalCenterBlock) swStyle = 'park';
      else if (isCommercialDowntown || isAutoCenter || isTransitHubBlock || isCarDealershipBlock) swStyle = 'commercial';

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
      } else if (isPoliceStation || isHospital || isFireStation || isSchoolBlock || isStadiumBlock || isTransitHubBlock || isCulturalCenterBlock) {
        driveways.push({ side: 'south', offset: Math.floor(blockW / 2 - 30), width: 60 });
      } else if (isCarDealershipBlock) {
        driveways.push({ side: 'south', offset: Math.floor(blockW - 140), width: 60 });
      } else if (isShoppingMallBlock) {
        driveways.push({ side: 'south', offset: 80, width: 70 });
        driveways.push({ side: 'south', offset: Math.floor(blockW - 150), width: 70 });
      } else if (isBusinessCenterBlock) {
        driveways.push({ side: 'east', offset: Math.floor(blockH / 2 - 30), width: 60 });
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
      // --- 3. CENTRAL AUTO DEALERSHIP & AUTO SERVICE SECTOR (bx: 4, by: 2) ---
      // =========================================================================
      if (isAutoCenter) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        // A. NORTH SECTION: AUTO SHOWROOM (MODERN GLASS COMPLEX - SQUARE FORMAT)
        const showW = 180;
        const showH = 140;
        buildings.push({
          id: `auto_showroom_${bx}_${by}`,
          nameRu: 'Автосалон "Центральный"',
          x: innerX + 15,
          y: innerY + 15,
          width: showW,
          height: showH,
          type: 'shop',
          color: '#1e293b',
          roofColor: '#0f172a',
          accentColor: '#38bdf8',
          windows: [],
          entranceSide: 'south',
          roofDetails: [{ type: 'ac', rx: 0.2, ry: 0.2, rw: 24, rh: 20 }]
        });

        // Showroom Tiled Entrance Plaza
        blockPlazas.push({
          x: innerX + 15,
          y: innerY + 15 + showH + 5,
          width: showW,
          height: 35,
          shape: 'rect',
          style: 'tile'
        });

        // Showcase Vehicle Parking Lot (North-East)
        const pkX = innerX + showW + 25;
        const pkY = innerY + 15;
        const pkW = innerW - showW - 40;
        const pkH = showH;

        const autoSpots: ParkingArea['spots'] = [];
        const numShowcaseRows = Math.floor(pkH / 45);
        for (let s = 0; s < numShowcaseRows; s++) {
          const sy = pkY + 25 + s * 45;
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

        // B. SOUTH SECTION: PIT-STOP AUTO SERVICE & CAR WASH
        const repairW = 180;
        const repairH = 140;
        buildings.push({
          id: `auto_service_${bx}_${by}`,
          nameRu: 'Автомастерская & Сервис "PIT-STOP"',
          shopBrand: 'pitstop_service',
          x: innerX + 15,
          y: innerY + 300,
          width: repairW,
          height: repairH,
          type: 'auto_service_center',
          color: '#1e293b',
          roofColor: '#0f172a',
          accentColor: '#0284c7',
          windows: [],
          entrances: [
            { side: 'south', offsetRatio: 0.3, number: 1 },
            { side: 'south', offsetRatio: 0.7, number: 2 }
          ],
          roofDetails: [{ type: 'ac', rx: 0.2, ry: 0.2, rw: 24, rh: 24 }]
        });

        // Car Wash / Detail Bay (Slightly more square format)
        const washW = 140;
        const washH = 110;
        buildings.push({
          id: `auto_wash_${bx}_${by}`,
          nameRu: 'Автомойка & Детейлинг 24/7',
          x: innerX + repairW + 25,
          y: innerY + 300,
          width: washW,
          height: washH,
          type: 'car_wash_station',
          color: '#0284c7',
          roofColor: '#0369a1',
          accentColor: '#38bdf8',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: []
        });

        // Asphalt Maneuvering Area & Driveways separating North & South
        blockWalkways.push({
          x: innerX + 15,
          y: innerY + showH + 60,
          width: innerW - 30,
          height: 80,
          style: 'asphalt'
        });

        // Service & Customer Parking Lot (South-East)
        const spkX = innerX + repairW + washW + 35;
        const spkY = innerY + 300;
        const spkW = innerW - repairW - washW - 50;
        const spkH = repairH;

        if (spkW > 60) {
          const serviceSpots: ParkingArea['spots'] = [];
          const numServiceRows = Math.floor(spkH / 45);
          for (let s = 0; s < numServiceRows; s++) {
            const sy = spkY + 25 + s * 45;
            serviceSpots.push({ x: spkX + spkW / 2, y: sy, angle: 0, occupied: s % 2 === 0 });
          }
          parkings.push({
            id: `auto_service_parking_${bx}_${by}`,
            x: spkX,
            y: spkY,
            width: spkW,
            height: spkH,
            spots: serviceSpots
          });
        }

        // C. PROPS AND LANDSCAPING
        props.push(
          { id: `dl_lamp_1`, x: pkX + 5, y: pkY - 8, type: 'lamp', angle: 0 },
          { id: `dl_lamp_2`, x: pkX + pkW - 5, y: pkY - 8, type: 'lamp', angle: 0 },
          { id: `dl_lamp_3`, x: spkX + 5, y: spkY - 8, type: 'lamp', angle: 0 },
          { id: `dl_lamp_4`, x: spkX + spkW - 5, y: spkY + spkH + 8, type: 'lamp', angle: 0 },
          { id: `dl_bench_1`, x: innerX + 45, y: innerY + 165, type: 'bench', angle: -Math.PI / 2 },
          { id: `dl_urn_1`, x: innerX + 65, y: innerY + 165, type: 'trash_can', angle: 0 },
          { id: `dl_flower_1`, x: innerX + 90, y: innerY + 165, type: 'flowerbed', angle: 0 },
          { id: `dl_dump_1`, x: innerX + innerW - 35, y: innerY + innerH - 25, type: 'dumpster', angle: 0 }
        );

        // D. SPAWN PLAYER STARTER PICKUP & SHOWCASE VEHICLES
        // Starter pickup inside the main dealership slots
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
          requiredFuel: createDefaultFuelSystem('pickup').fuelType === 'diesel' ? 'diesel' : (createDefaultFuelSystem('pickup').octaneNumber === 92 ? 'ai92' : 'ai95'),
          engineState: createDefaultEngineState('pickup', false, true),
          fuelSystem: createDefaultFuelSystem('pickup'),
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

        // Showcase vehicles parked in dealership slots
        const showcaseVehiclesList: { type: CarType; color: string; roofColor: string }[] = [
          { type: 'truck_box', color: '#0284c7', roofColor: '#0284c7' },
          { type: 'truck_dump', color: '#d97706', roofColor: '#d97706' },
          { type: 'truck_water', color: '#0284c7', roofColor: '#0284c7' },
          { type: 'truck_tanker', color: '#0369a1', roofColor: '#0369a1' }
        ];

        showcaseVehiclesList.forEach((sc, idx) => {
          const cfg = CAR_CONFIGS[sc.type];
          const vy = pkY + 25 + (idx + 1) * 45;
          if (vy < pkY + pkH - 15) {
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
              requiredFuel: createDefaultFuelSystem(sc.type).fuelType === 'diesel' ? 'diesel' : (createDefaultFuelSystem(sc.type).octaneNumber === 92 ? 'ai92' : 'ai95'),
              engineState: createDefaultEngineState(sc.type, false, true),
              fuelSystem: createDefaultFuelSystem(sc.type),
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
      // --- 4. COZY RESIDENTIAL COURTYARD BLOCKS (ЖИЛЫЕ ДВОРЫ С ТРОТУАРАМИ И ПОДЪЕЗДАМИ) ---
      // =========================================================================
      if (isCourtyardBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        // Determine residential archetype based on block grid coordinates
        const isPanelBlock = (bx + by) % 3 === 0;
        const isBrickBlock = (bx + by) % 3 === 1;

        // 1. North Residential Building
        const northW = innerW - 90;
        const northH = 110;
        buildings.push({
          id: `court_bld_n_${bx}_${by}`,
          x: innerX + 5,
          y: innerY + 5,
          width: northW,
          height: northH,
          type: isPanelBlock ? 'panel_apartment' : (isBrickBlock ? 'brick_residential' : 'modern_residential'),
          color: isPanelBlock ? '#e2e8f0' : (isBrickBlock ? '#9a3412' : '#1e293b'),
          roofColor: isPanelBlock ? '#cbd5e1' : (isBrickBlock ? '#7c2d12' : '#0f172a'),
          accentColor: isPanelBlock ? '#f59e0b' : (isBrickBlock ? '#d97706' : '#38bdf8'),
          windows: [],
          balconies: [
            { side: 'south', offset: 0.2, length: 22, depth: 6, isGlazed: true },
            { side: 'south', offset: 0.5, length: 22, depth: 6, isGlazed: isPanelBlock },
            { side: 'south', offset: 0.8, length: 22, depth: 6, isGlazed: true },
            { side: 'north', offset: 0.35, length: 20, depth: 6, isGlazed: false },
            { side: 'north', offset: 0.65, length: 20, depth: 6, isGlazed: false }
          ],
          entrances: [
            { side: 'south', offsetRatio: 0.25, number: 1 },
            { side: 'south', offsetRatio: 0.50, number: 2 },
            { side: 'south', offsetRatio: 0.75, number: 3 }
          ],
          roofDetails: [{ type: 'ac', rx: 0.3, ry: 0.3, rw: 0.15, rh: 0.4 }]
        });

        // 2. West Residential Building
        const westW = 110;
        const westY = innerY + northH + 15;
        const westH = innerH - (northH + 25);
        buildings.push({
          id: `court_bld_w_${bx}_${by}`,
          x: innerX + 5,
          y: westY,
          width: westW,
          height: westH,
          type: isPanelBlock ? 'brick_residential' : 'panel_apartment',
          color: isPanelBlock ? '#c2410c' : '#cbd5e1',
          roofColor: isPanelBlock ? '#9a3412' : '#94a3b8',
          accentColor: isPanelBlock ? '#f59e0b' : '#38bdf8',
          windows: [],
          balconies: [
            { side: 'east', offset: 0.28, length: 20, depth: 6, isGlazed: true },
            { side: 'east', offset: 0.72, length: 20, depth: 6, isGlazed: false },
            { side: 'west', offset: 0.5, length: 22, depth: 6, isGlazed: true }
          ],
          entrances: [
            { side: 'east', offsetRatio: 0.3, number: 1 },
            { side: 'east', offsetRatio: 0.7, number: 2 }
          ],
          roofDetails: []
        });

        // Courtyard Geometry Bounds
        const courtLeft = innerX + westW + 20;
        const courtTop = innerY + northH + 20;
        const courtW = innerW - westW - 35;
        const courtH = innerH - northH - 35;

        // Paved Walkways & Access Driveways (Тротуары и внутридворовой проезд):
        blockWalkways.push(
          // Asphalt access road connecting South driveway to parking & entrance drop-off
          { x: innerX + innerW - 120, y: innerY + innerH, width: 50, height: blockH - innerH, style: 'asphalt' },
          { x: courtLeft, y: courtTop + 40, width: courtW, height: 28, style: 'asphalt' },
          // Paved sidewalk along North building entrances
          { x: innerX + 5, y: innerY + northH + 2, width: northW, height: 18, style: 'concrete' },
          // Paved sidewalk along West building entrances
          { x: innerX + westW + 2, y: westY, width: 18, height: westH, style: 'concrete' },
          // Walkway connecting to South street sidewalk
          { x: innerX + 25, y: westY + westH, width: 18, height: Math.max(10, innerH - (westY - innerY + westH)), style: 'concrete' }
        );

        // Central Courtyard Recreation Plaza (Зона отдыха с плиткой, лавочками и детской площадкой)
        const plazaW = Math.min(100, Math.max(70, courtW - 140));
        const plazaH = Math.min(80, Math.max(60, courtH - 30));
        const plazaX = courtLeft + 10;
        const plazaY = courtTop + 10;
        blockPlazas.push({
          x: plazaX,
          y: plazaY,
          width: plazaW,
          height: plazaH,
          shape: 'rect',
          style: 'tile'
        });

        // Courtyard Residential Parking Lot (Парковка во дворе со свободным въездом)
        const pkW = Math.min(120, courtW - plazaW - 30);
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
          { id: `court_tree_${bx}_${by}_1`, x: plazaX + plazaW / 2, y: plazaY + plazaH + 18, radius: 14, color: '#15803d', shadowOffset: 4 },
          { id: `court_tree_${bx}_${by}_2`, x: plazaX + plazaW + 18, y: plazaY + plazaH / 2, radius: 13, color: '#166534', shadowOffset: 4 }
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
          { id: `c_ent_bench_${bx}_${by}_n`, x: innerX + northW * 0.35, y: innerY + northH + 11, type: 'bench', angle: -Math.PI / 2 },
          { id: `c_ent_urn_${bx}_${by}_n`, x: innerX + northW * 0.35 + 16, y: innerY + northH + 11, type: 'trash_can', angle: 0 },

          { id: `c_ent_bench_${bx}_${by}_w`, x: innerX + westW + 11, y: westY + westH * 0.4, type: 'bench', angle: 0 },
          { id: `c_ent_urn_${bx}_${by}_w`, x: innerX + westW + 11, y: westY + westH * 0.4 + 16, type: 'trash_can', angle: 0 },

          // Courtyard Night Illumination Streetlamps
          { id: `c_lamp_${bx}_${by}_1`, x: plazaX + plazaW / 2, y: plazaY + plazaH / 2, type: 'lamp', angle: 0 },
          { id: `c_lamp_${bx}_${by}_2`, x: pkX - 12, y: pkY + 25, type: 'lamp', angle: 0 },
          { id: `c_lamp_${bx}_${by}_3`, x: pkX - 12, y: pkY + pkH - 25, type: 'lamp', angle: 0 },

          // Waste Disposal Area (Площадка ТБО) strictly in far corner, 100% clear of all driveways!
          { id: `c_dump_${bx}_${by}_1`, x: innerX + innerW - 35, y: innerY + 25, type: 'dumpster', angle: Math.PI / 2 },
          { id: `c_dump_${bx}_${by}_2`, x: innerX + innerW - 35, y: innerY + 48, type: 'dumpster', angle: Math.PI / 2 },
          { id: `c_dump_urn_${bx}_${by}`, x: innerX + innerW - 35, y: innerY + 68, type: 'trash_can', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 4.5 SCHOOL & KINDERGARTEN CAMPUS (ШКОЛА И ДЕТСКИЙ САД) ---
      // =========================================================================
      if (isSchoolBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        // Main School Building (Classical 3-story brick/panel educational building)
        const schW = innerW - 120;
        const schH = 80;
        buildings.push({
          id: `sch_main_${bx}_${by}`,
          x: innerX + 10,
          y: innerY + 10,
          width: schW,
          height: schH,
          type: 'school_kindergarten',
          color: '#d97706',
          roofColor: '#b45309',
          accentColor: '#fef08a',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'ac', rx: 0.4, ry: 0.3, rw: 0.2, rh: 0.4 }]
        });

        // Kindergarten extension building
        const kgW = 90;
        const kgH = 60;
        buildings.push({
          id: `sch_kg_${bx}_${by}`,
          x: innerX + innerW - kgW - 10,
          y: innerY + 10,
          width: kgW,
          height: kgH,
          type: 'school_kindergarten',
          color: '#0284c7',
          roofColor: '#0369a1',
          accentColor: '#bae6fd',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: []
        });

        // School Asphalt Driveway from South road to entrance drop-off loop
        blockWalkways.push({
          x: innerX + innerW / 2 - 25,
          y: innerY + schH + 5,
          width: 50,
          height: innerH - schH - 5,
          style: 'asphalt'
        });

        // School Sports Court / Basketball Yard Plaza
        const sportsW = 120;
        const sportsH = 80;
        const sportsX = innerX + 20;
        const sportsY = innerY + schH + 35;
        blockPlazas.push({
          x: sportsX,
          y: sportsY,
          width: sportsW,
          height: sportsH,
          shape: 'rect',
          style: 'tile'
        });

        // School Yard Trees & Benches
        trees.push(
          { id: `sch_tree_1`, x: sportsX - 10, y: sportsY + sportsH / 2, radius: 14, color: '#15803d', shadowOffset: 4 },
          { id: `sch_tree_2`, x: sportsX + sportsW + 15, y: sportsY + sportsH / 2, radius: 14, color: '#166534', shadowOffset: 4 }
        );

        props.push(
          { id: `sch_bench_1`, x: sportsX + 15, y: sportsY + 15, type: 'bench', angle: 0 },
          { id: `sch_urn_1`, x: sportsX + 32, y: sportsY + 15, type: 'trash_can', angle: 0 },
          { id: `sch_bench_2`, x: sportsX + sportsW - 35, y: sportsY + 15, type: 'bench', angle: 0 },
          { id: `sch_urn_2`, x: sportsX + sportsW - 18, y: sportsY + 15, type: 'trash_can', angle: 0 },
          { id: `sch_lamp_1`, x: sportsX + sportsW / 2, y: sportsY + 15, type: 'lamp', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 4.6 COMMERCIAL PROMENADE DISTRICT (STANDALONE FLAGSHIP STORES) ---
      // =========================================================================
      if (isShoppingMallBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        const bldW1 = Math.floor((innerW - 30) / 2);
        const bldW2 = innerW - bldW1 - 30;
        const bldH = Math.min(125, Math.floor((innerH - 70) / 2));

        // 1. Supermarket "Perekrestok 24/7" (North-West)
        buildings.push({
          id: `perekrestok_main_${bx}_${by}`,
          nameRu: 'Супермаркет "Перекрёсток 24/7"',
          shopBrand: 'perekrestok',
          x: innerX + 10,
          y: innerY + 10,
          width: bldW1,
          height: bldH,
          type: 'supermarket_store',
          color: '#14532d',
          roofColor: '#052e16',
          accentColor: '#22c55e',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [
            { type: 'ac', rx: 0.15, ry: 0.25, rw: 0.2, rh: 0.5 },
            { type: 'ac', rx: 0.65, ry: 0.25, rw: 0.2, rh: 0.5 }
          ]
        });

        // 2. Pizzeria "Dodo Pizza" (North-East)
        buildings.push({
          id: `dodo_main_${bx}_${by}`,
          nameRu: 'Пиццерия "Додо Пицца"',
          shopBrand: 'dodo_pizza',
          x: innerX + bldW1 + 20,
          y: innerY + 10,
          width: bldW2,
          height: bldH,
          type: 'pizzeria_restaurant',
          color: '#7c2d12',
          roofColor: '#431407',
          accentColor: '#ea580c',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [
            { type: 'ac', rx: 0.2, ry: 0.3, rw: 0.25, rh: 0.4 }
          ]
        });

        // Central Pedestrian Promenade & Plaza
        const plazaY = innerY + bldH + 12;
        const plazaH = Math.max(36, innerH - (bldH * 2 + 24));
        blockPlazas.push({
          x: innerX + 10,
          y: plazaY,
          width: innerW - 20,
          height: plazaH,
          shape: 'rect',
          style: 'tile'
        });

        // 3. Electronics Flagship "M.Video" (South-West)
        const row2Y = plazaY + plazaH + 12;
        buildings.push({
          id: `mvideo_main_${bx}_${by}`,
          nameRu: 'Гипермаркет электроники "М.Видео"',
          shopBrand: 'mvideo',
          x: innerX + 10,
          y: row2Y,
          width: bldW1,
          height: bldH,
          type: 'electronics_store',
          color: '#1e3a8a',
          roofColor: '#0f172a',
          accentColor: '#ef4444',
          windows: [],
          entrances: [{ side: 'north', offsetRatio: 0.5, number: 1 }],
          roofDetails: [
            { type: 'ac', rx: 0.2, ry: 0.3, rw: 0.3, rh: 0.4 }
          ]
        });

        // 4. Restaurant "Vkusno — i tochka" (South-East)
        buildings.push({
          id: `vkusno_main_${bx}_${by}`,
          nameRu: 'Ресторан "Вкусно — и точка"',
          shopBrand: 'vkusno_tochka',
          x: innerX + bldW1 + 20,
          y: row2Y,
          width: bldW2,
          height: bldH,
          type: 'fast_food_restaurant',
          color: '#7f1d1d',
          roofColor: '#450a0a',
          accentColor: '#eab308',
          windows: [],
          entrances: [{ side: 'north', offsetRatio: 0.5, number: 1 }],
          roofDetails: [
            { type: 'ac', rx: 0.3, ry: 0.25, rw: 0.3, rh: 0.5 }
          ]
        });

        // Street furniture, lamps, and trees on the central promenade
        props.push(
          { id: `comm_bench_1`, x: innerX + 30, y: plazaY + plazaH / 2 - 8, type: 'bench', angle: 0 },
          { id: `comm_urn_1`, x: innerX + 48, y: plazaY + plazaH / 2 - 8, type: 'trash_can', angle: 0 },
          { id: `comm_bench_2`, x: innerX + innerW - 50, y: plazaY + plazaH / 2 - 8, type: 'bench', angle: 0 },
          { id: `comm_urn_2`, x: innerX + innerW - 32, y: plazaY + plazaH / 2 - 8, type: 'trash_can', angle: 0 },
          { id: `comm_lamp_1`, x: innerX + innerW / 2 - 40, y: plazaY + plazaH / 2 - 8, type: 'lamp', angle: 0 },
          { id: `comm_lamp_2`, x: innerX + innerW / 2 + 40, y: plazaY + plazaH / 2 - 8, type: 'lamp', angle: 0 },
          { id: `comm_flower_1`, x: innerX + innerW / 2, y: plazaY + plazaH / 2 - 8, type: 'flowerbed', angle: 0 }
        );

        trees.push(
          { id: `comm_tree_1`, x: innerX + bldW1 / 2, y: plazaY + plazaH / 2, radius: 12, color: '#16a34a', shadowOffset: 4 },
          { id: `comm_tree_2`, x: innerX + bldW1 + 20 + bldW2 / 2, y: plazaY + plazaH / 2, radius: 12, color: '#16a34a', shadowOffset: 4 }
        );

        continue;
      }

      // =========================================================================
      // --- 4.7 BUSINESS CENTER HIGH-RISE TOWER (БИЗНЕС-ЦЕНТР "SKYLINE") ---
      // =========================================================================
      if (isBusinessCenterBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        const bcW = Math.min(220, innerW - 100);
        const bcH = Math.min(140, innerH - 30);
        buildings.push({
          id: `bc_tower_${bx}_${by}`,
          x: innerX + 10,
          y: innerY + 10,
          width: bcW,
          height: bcH,
          type: 'business_center',
          color: '#0f172a',
          roofColor: '#0284c7',
          accentColor: '#38bdf8',
          windows: [],
          entrances: [{ side: 'east', offsetRatio: 0.5, number: 1 }],
          roofDetails: [
            { type: 'helipad', rx: 0.25, ry: 0.2, rw: 0.5, rh: 0.6 }
          ]
        });

        // Entrance Plaza
        blockPlazas.push({
          x: innerX + bcW + 10,
          y: innerY + 10,
          width: innerW - bcW - 20,
          height: bcH,
          shape: 'rect',
          style: 'tile'
        });

        props.push(
          { id: `bc_bench_1`, x: innerX + bcW + 25, y: innerY + 30, type: 'bench', angle: Math.PI / 2 },
          { id: `bc_urn_1`, x: innerX + bcW + 25, y: innerY + 48, type: 'trash_can', angle: 0 },
          { id: `bc_lamp_1`, x: innerX + bcW + 25, y: innerY + bcH / 2, type: 'lamp', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 4.8 SPORTS STADIUM & ARENA QUARTER (СПОРТКОМПЛЕКС ARENA) ---
      // =========================================================================
      if (isStadiumBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        const arenaW = innerW - 100;
        const arenaH = 100;
        buildings.push({
          id: `stadium_main_${bx}_${by}`,
          x: innerX + 10,
          y: innerY + 10,
          width: arenaW,
          height: arenaH,
          type: 'sports_stadium',
          color: '#15803d',
          roofColor: '#166534',
          accentColor: '#86efac',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'ac', rx: 0.1, ry: 0.2, rw: 0.1, rh: 0.6 }, { type: 'ac', rx: 0.8, ry: 0.2, rw: 0.1, rh: 0.6 }]
        });

        // Sports plaza & fan promenade
        blockPlazas.push({
          x: innerX + 10,
          y: innerY + arenaH + 10,
          width: arenaW,
          height: 40,
          shape: 'rect',
          style: 'tile'
        });

        // Fan Parking
        const pkX = innerX + arenaW + 20;
        const pkY = innerY + 10;
        const pkW = innerW - arenaW - 30;
        const pkH = innerH - 20;
        if (pkW > 40) {
          const stadSpots: ParkingArea['spots'] = [];
          const numRows = Math.floor(pkH / 40);
          for (let s = 0; s < numRows; s++) {
            stadSpots.push({ x: pkX + pkW / 2, y: pkY + 20 + s * 40, angle: 0, occupied: s % 2 === 0 });
          }
          parkings.push({
            id: `stadium_parking_${bx}_${by}`,
            x: pkX,
            y: pkY,
            width: pkW,
            height: pkH,
            spots: stadSpots
          });
        }

        props.push(
          { id: `st_bench_1`, x: innerX + 30, y: innerY + arenaH + 25, type: 'bench', angle: 0 },
          { id: `st_urn_1`, x: innerX + 48, y: innerY + arenaH + 25, type: 'trash_can', angle: 0 },
          { id: `st_bench_2`, x: innerX + arenaW - 50, y: innerY + arenaH + 25, type: 'bench', angle: 0 },
          { id: `st_urn_2`, x: innerX + arenaW - 32, y: innerY + arenaH + 25, type: 'trash_can', angle: 0 },
          { id: `st_lamp_1`, x: innerX + arenaW / 2, y: innerY + arenaH + 25, type: 'lamp', angle: 0 },
          { id: `st_kiosk_ticket`, x: innerX + 10, y: innerY + arenaH + 25, type: 'kiosk', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 4.9 RAILWAY STATION & TRANSIT HUB (ВОКЗАЛ TERMINAL) ---
      // =========================================================================
      if (isTransitHubBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        const hubW = innerW - 80;
        const hubH = 90;
        buildings.push({
          id: `transit_main_${bx}_${by}`,
          x: innerX + 10,
          y: innerY + 10,
          width: hubW,
          height: hubH,
          type: 'transit_hub',
          color: '#1e293b',
          roofColor: '#0f172a',
          accentColor: '#f59e0b',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'skylight', rx: 0.2, ry: 0.2, rw: 0.6, rh: 0.5 }]
        });

        // Passenger Drop-Off Asphalt Lane & Paved Station Square
        blockWalkways.push({
          x: innerX + 10,
          y: innerY + hubH + 5,
          width: hubW,
          height: 25,
          style: 'asphalt'
        });

        blockPlazas.push({
          x: innerX + 10,
          y: innerY + hubH + 32,
          width: hubW,
          height: 40,
          shape: 'rect',
          style: 'tile'
        });

        props.push(
          { id: `hub_bench_1`, x: innerX + 30, y: innerY + hubH + 45, type: 'bench', angle: 0 },
          { id: `hub_urn_1`, x: innerX + 48, y: innerY + hubH + 45, type: 'trash_can', angle: 0 },
          { id: `hub_bench_2`, x: innerX + hubW - 50, y: innerY + hubH + 45, type: 'bench', angle: 0 },
          { id: `hub_urn_2`, x: innerX + hubW - 32, y: innerY + hubH + 45, type: 'trash_can', angle: 0 },
          { id: `hub_lamp_1`, x: innerX + hubW / 2, y: innerY + hubH + 45, type: 'lamp', angle: 0 },
          { id: `hub_kiosk_news`, x: innerX + 15, y: innerY + hubH + 45, type: 'kiosk', angle: 0 },
          { id: `hub_bus_stop`, x: innerX + hubW - 15, y: innerY + hubH + 15, type: 'bus_stop', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 4.10 CAR DEALERSHIP & AUTO SHOWROOM (АВТОСАЛОН MOTORS) ---
      // =========================================================================
      if (isCarDealershipBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        const dealW = 150;
        const dealH = 80;
        buildings.push({
          id: `deal_main_${bx}_${by}`,
          nameRu: 'Автосалон & PIT-STOP',
          shopBrand: 'pitstop_service',
          x: innerX + 10,
          y: innerY + 10,
          width: dealW,
          height: dealH,
          type: 'car_dealership',
          color: '#0284c7',
          roofColor: '#0369a1',
          accentColor: '#38bdf8',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'ac', rx: 0.2, ry: 0.3, rw: 0.2, rh: 0.4 }]
        });

        // Display Pad Plaza for New Vehicles
        const dispW = innerW - dealW - 30;
        blockPlazas.push({
          x: innerX + dealW + 20,
          y: innerY + 10,
          width: dispW,
          height: dealH + 40,
          shape: 'rect',
          style: 'tile'
        });

        // Customer & Test-Drive Parking Lot
        const pkX = innerX + 10;
        const pkY = innerY + dealH + 20;
        const pkW = dealW;
        const pkH = innerH - dealH - 30;
        if (pkH > 40) {
          const dealSpots: ParkingArea['spots'] = [];
          const numCols = Math.floor(pkW / 45);
          for (let c = 0; c < numCols; c++) {
            dealSpots.push({ x: pkX + 22 + c * 45, y: pkY + pkH / 2, angle: Math.PI / 2, occupied: true });
          }
          parkings.push({
            id: `deal_parking_${bx}_${by}`,
            x: pkX,
            y: pkY,
            width: pkW,
            height: pkH,
            spots: dealSpots
          });
        }

        props.push(
          { id: `deal_lamp_1`, x: innerX + dealW + 35, y: innerY + dealH + 20, type: 'lamp', angle: 0 },
          { id: `deal_lamp_2`, x: innerX + dealW + dispW - 15, y: innerY + dealH + 20, type: 'lamp', angle: 0 }
        );

        continue;
      }

      // =========================================================================
      // --- 4.11 CULTURAL CENTER & PALACE OF ARTS (ДВОРЕЦ КУЛЬТУРЫ) ---
      // =========================================================================
      if (isCulturalCenterBlock) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        const cultW = innerW - 60;
        const cultH = 95;
        buildings.push({
          id: `cultural_main_${bx}_${by}`,
          x: innerX + 30,
          y: innerY + 10,
          width: cultW,
          height: cultH,
          type: 'cultural_center',
          color: '#7c2d12',
          roofColor: '#451a03',
          accentColor: '#fef08a',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'skylight', rx: 0.3, ry: 0.2, rw: 0.4, rh: 0.5 }]
        });

        // Marble Plaza in front with Statue Monument
        const plazaY = innerY + cultH + 15;
        const plazaH = innerH - cultH - 25;
        blockPlazas.push({
          x: innerX + 20,
          y: plazaY,
          width: cultW + 20,
          height: plazaH,
          shape: 'rect',
          style: 'tile'
        });

        // Monument prop in plaza center
        props.push(
          { id: `cult_monument`, x: innerX + 30 + cultW / 2, y: plazaY + plazaH / 2, type: 'flowerbed', angle: 0 },
          { id: `cult_bench_1`, x: innerX + 40, y: plazaY + plazaH / 2, type: 'bench', angle: Math.PI / 2 },
          { id: `cult_urn_1`, x: innerX + 40, y: plazaY + plazaH / 2 + 18, type: 'trash_can', angle: 0 },
          { id: `cult_bench_2`, x: innerX + cultW + 10, y: plazaY + plazaH / 2, type: 'bench', angle: -Math.PI / 2 },
          { id: `cult_urn_2`, x: innerX + cultW + 10, y: plazaY + plazaH / 2 + 18, type: 'trash_can', angle: 0 },
          { id: `cult_lamp_1`, x: innerX + 40, y: plazaY + 15, type: 'lamp', angle: 0 },
          { id: `cult_lamp_2`, x: innerX + cultW + 10, y: plazaY + 15, type: 'lamp', angle: 0 }
        );

        trees.push(
          { id: `cult_tree_1`, x: innerX + 15, y: plazaY + plazaH / 2, radius: 13, color: '#15803d', shadowOffset: 4 },
          { id: `cult_tree_2`, x: innerX + cultW + 35, y: plazaY + plazaH / 2, radius: 13, color: '#15803d', shadowOffset: 4 }
        );

        continue;
      }

      // Block 4.12 is fully integrated into Block 3 (Central Dealership & Auto Service Plaza)

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

        if (isPoliceStation) bType = 'police_station';
        if (isPoliceStation) bType = 'police_station';
        if (isHospital) {
          bType = 'hospital';
          bType = 'hospital';
          bColor = '#f8fafc';
          bRoof = '#e2e8f0';
          bAccent = '#ef4444';
        } else if (isFireStation) {
          bType = 'fire_station';
          bType = 'fire_station';
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
        const cW = 100 + Math.random() * 20;
        const cH = 100 + Math.random() * 20;

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
      // --- 7. INDUSTRIAL & LOGISTICS FLEET DEPOT (РАЗНООБРАЗНЫЕ ЛОГИСТИЧЕСКИЕ ХАБЫ И ПРОМЗОНЫ) ---
      // =========================================================================
      if (isIndustrial) {
        const innerX = blockX + sidewalkWidth + 10;
        const innerY = blockY + sidewalkWidth + 10;
        const innerW = blockW - (sidewalkWidth * 2 + 20);
        const innerH = blockH - (sidewalkWidth * 2 + 20);

        const indVariant = (bx * 5 + by * 3) % 4;

        if (indVariant === 0) {
          // --- VARIANT 0: HEAVY CARGO DISTRIBUTION HUB (КАРГО ТЕРМИНАЛ HANGAR & SORTING ANNEX) ---
          const wW = innerW - 130;
          const wH = 120;
          buildings.push({
            id: `ind_hub_main_${bx}_${by}`,
            x: innerX + 10,
            y: innerY + 10,
            width: wW,
            height: wH,
            type: 'industrial',
            color: '#52525b',
            roofColor: '#3f3f46',
            accentColor: '#eab308',
            windows: [],
            entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
            roofDetails: [
              { type: 'ac', rx: 0.2, ry: 0.3, rw: 0.15, rh: 0.4 },
              { type: 'ac', rx: 0.7, ry: 0.3, rw: 0.15, rh: 0.4 }
            ]
          });

          const w2W = 110;
          const w2H = 75;
          const w2Y = innerY + wH + 25;
          buildings.push({
            id: `ind_hub_annex_${bx}_${by}`,
            x: innerX + 10,
            y: w2Y,
            width: w2W,
            height: w2H,
            type: 'industrial',
            color: '#3f3f46',
            roofColor: '#27272a',
            accentColor: '#f59e0b',
            windows: [],
            entrances: [{ side: 'east', offsetRatio: 0.5, number: 1 }],
            roofDetails: []
          });

          // Asphalt Maneuvering Yard & Loading Corridor
          blockWalkways.push(
            { x: innerX + 10, y: innerY + wH + 5, width: wW, height: 18, style: 'asphalt' },
            { x: innerX + w2W + 5, y: w2Y, width: wW - w2W, height: w2H, style: 'asphalt' }
          );

          // Fleet Truck Staging Parking Lot
          const pkX = innerX + wW + 20;
          const pkY = innerY + 10;
          const pkW = innerW - wW - 30;
          const pkH = innerH - 20;

          if (pkW > 40) {
            const indSpots: ParkingArea['spots'] = [];
            const numRowsInd = Math.floor(pkH / 48);
            for (let s = 0; s < numRowsInd; s++) {
              indSpots.push({ x: pkX + pkW / 2, y: pkY + 22 + s * 48, angle: 0, occupied: s % 2 === 0 });
            }

            parkings.push({
              id: `ind_parking_${bx}_${by}`,
              x: pkX,
              y: pkY,
              width: pkW,
              height: pkH,
              spots: indSpots
            });
          }

          props.push(
            { id: `ind_dump_0_${bx}_${by}_1`, x: innerX + w2W + 25, y: w2Y + w2H / 2, type: 'dumpster', angle: 0 },
            { id: `ind_lamp_0_${bx}_${by}_1`, x: pkX + pkW / 2, y: pkY + 15, type: 'lamp', angle: 0 },
            { id: `ind_lamp_0_${bx}_${by}_2`, x: pkX + 10, y: pkY + pkH - 25, type: 'lamp', angle: 0 },
            { id: `ind_kiosk_0_${bx}_${by}`, x: pkX + 10, y: pkY + 35, type: 'kiosk', angle: 0 }
          );
        } else if (indVariant === 1) {
          // --- VARIANT 1: INDUSTRIAL MANUFACTURING PLANT (ЗАВОДСКОЙ КОМПЛЕКС С ДВУМЯ КОРПУСАМИ) ---
          const nW = innerW - 20;
          const nH = 110;
          buildings.push({
            id: `ind_mfg_n_${bx}_${by}`,
            x: innerX + 10,
            y: innerY + 10,
            width: nW,
            height: nH,
            type: 'industrial',
            color: '#334155',
            roofColor: '#1e293b',
            accentColor: '#38bdf8',
            windows: [],
            entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
            roofDetails: [{ type: 'skylight', rx: 0.2, ry: 0.2, rw: 0.6, rh: 0.5 }]
          });

          const sW = innerW - 120;
          const sH = 110;
          const sY = innerY + innerH - sH - 10;
          buildings.push({
            id: `ind_mfg_s_${bx}_${by}`,
            x: innerX + 10,
            y: sY,
            width: sW,
            height: sH,
            type: 'industrial',
            color: '#475569',
            roofColor: '#334155',
            accentColor: '#eab308',
            windows: [],
            entrances: [{ side: 'north', offsetRatio: 0.5, number: 1 }],
            roofDetails: []
          });

          // Central Asphalt Transport Corridor
          const blvdY = innerY + nH + 10;
          const blvdH = sY - (innerY + nH + 10) - 10;
          blockWalkways.push({
            x: innerX + 10,
            y: blvdY,
            width: nW,
            height: blvdH,
            style: 'asphalt'
          });

          // Factory Delivery Truck Parking
          const pkX = innerX + sW + 20;
          const pkY = sY;
          const pkW = innerW - sW - 30;
          const pkH = sH;

          if (pkW > 40) {
            const mfgSpots: ParkingArea['spots'] = [];
            mfgSpots.push(
              { x: pkX + pkW / 2, y: pkY + 20, angle: 0, occupied: true },
              { x: pkX + pkW / 2, y: pkY + pkH - 20, angle: 0, occupied: false }
            );

            parkings.push({
              id: `ind_mfg_pk_${bx}_${by}`,
              x: pkX,
              y: pkY,
              width: pkW,
              height: pkH,
              spots: mfgSpots
            });
          }

          props.push(
            { id: `ind_dump_1_${bx}_${by}_1`, x: innerX + nW - 30, y: blvdY + 10, type: 'dumpster', angle: 0 },
            { id: `ind_lamp_1_${bx}_${by}_1`, x: innerX + nW / 2, y: blvdY + blvdH / 2, type: 'lamp', angle: 0 },
            { id: `ind_kiosk_1_${bx}_${by}`, x: innerX + 25, y: blvdY + 10, type: 'kiosk', angle: 0 }
          );
        } else if (indVariant === 2) {
          // --- VARIANT 2: FLEET DEPOT & MOTOR TRANSPORT ENTERPRISE (АВТОТРАНСПОРТНОЕ ПРЕДПРИЯТИЕ АТП) ---
          const atpW = 120;
          const atpH = innerH - 20;
          buildings.push({
            id: `ind_atp_main_${bx}_${by}`,
            x: innerX + 10,
            y: innerY + 10,
            width: atpW,
            height: atpH,
            type: 'industrial',
            color: '#1e293b',
            roofColor: '#0f172a',
            accentColor: '#ef4444',
            windows: [],
            entrances: [{ side: 'east', offsetRatio: 0.5, number: 1 }],
            roofDetails: [{ type: 'ac', rx: 0.3, ry: 0.2, rw: 0.4, rh: 0.6 }]
          });

          // Paved Entrance & Maneuvering Apron
          blockWalkways.push({
            x: innerX + atpW + 2,
            y: innerY + 10,
            width: 30,
            height: atpH,
            style: 'asphalt'
          });

          // Large Heavy Vehicle & Fleet Parking
          const pkX = innerX + atpW + 35;
          const pkY = innerY + 10;
          const pkW = innerW - atpW - 45;
          const pkH = innerH - 20;

          if (pkW > 40) {
            const atpSpots: ParkingArea['spots'] = [];
            const numRows = Math.floor(pkH / 44);
            for (let r = 0; r < numRows; r++) {
              atpSpots.push({ x: pkX + pkW / 2, y: pkY + 20 + r * 44, angle: 0, occupied: r % 2 === 0 });
            }

            parkings.push({
              id: `ind_atp_pk_${bx}_${by}`,
              x: pkX,
              y: pkY,
              width: pkW,
              height: pkH,
              spots: atpSpots
            });
          }

          props.push(
            { id: `ind_dump_2_${bx}_${by}_1`, x: innerX + atpW + 22, y: innerY + atpH - 25, type: 'dumpster', angle: Math.PI / 2 },
            { id: `ind_lamp_2_${bx}_${by}_1`, x: innerX + atpW + 22, y: innerY + 25, type: 'lamp', angle: 0 },
            { id: `ind_kiosk_2_${bx}_${by}`, x: innerX + atpW + 22, y: innerY + atpH / 2, type: 'kiosk', angle: 0 }
          );
        } else {
          // --- VARIANT 3: CLASS-A LOGISTICS TERMINAL & DOCK GATE (СПО КЛАССА A) ---
          const termW = innerW - 20;
          const termH = 80;
          buildings.push({
            id: `ind_term_main_${bx}_${by}`,
            x: innerX + 10,
            y: innerY + 10,
            width: termW,
            height: termH,
            type: 'industrial',
            color: '#0f172a',
            roofColor: '#1e293b',
            accentColor: '#38bdf8',
            windows: [],
            entrances: [
              { side: 'south', offsetRatio: 0.25, number: 1 },
              { side: 'south', offsetRatio: 0.75, number: 2 }
            ],
            roofDetails: [
              { type: 'skylight', rx: 0.15, ry: 0.2, rw: 0.7, rh: 0.5 }
            ]
          });

          // Dock Ramps & Cargo Apron
          blockWalkways.push({
            x: innerX + 10,
            y: innerY + termH + 5,
            width: termW,
            height: 30,
            style: 'asphalt'
          });

          // Visitor & Delivery Truck Parking
          const pkX = innerX + 10;
          const pkY = innerY + termH + 45;
          const pkW = termW;
          const pkH = innerH - termH - 55;

          if (pkH > 35) {
            const termSpots: ParkingArea['spots'] = [];
            const numCols = Math.floor(pkW / 50);
            for (let col = 0; col < numCols; col++) {
              termSpots.push({ x: pkX + 25 + col * 50, y: pkY + pkH / 2, angle: Math.PI / 2, occupied: col % 2 === 0 });
            }

            parkings.push({
              id: `ind_term_pk_${bx}_${by}`,
              x: pkX,
              y: pkY,
              width: pkW,
              height: pkH,
              spots: termSpots
            });
          }

          props.push(
            { id: `ind_dump_3_1`, x: innerX + termW - 20, y: innerY + termH + 20, type: 'dumpster', angle: 0 },
            { id: `ind_lamp_3_1`, x: innerX + 30, y: innerY + termH + 20, type: 'lamp', angle: 0 },
            { id: `ind_lamp_3_2`, x: innerX + termW - 50, y: innerY + termH + 20, type: 'lamp', angle: 0 },
            { id: `ind_kiosk_3`, x: innerX + termW / 2, y: innerY + termH + 20, type: 'kiosk', angle: 0 }
          );
        }

        continue;
      }

      // =========================================================================
      // --- 8. URBAN DOWNTOWN & VARIED ARCHITECTURAL BLOCK LAYOUTS ---
      // =========================================================================
      const innerX = blockX + sidewalkWidth + 12;
      const innerY = blockY + sidewalkWidth + 12;
      const innerW = blockW - (sidewalkWidth * 2 + 24);
      const innerH = blockH - (sidewalkWidth * 2 + 24);

      const layoutVariant = (bx * 3 + by * 7) % 3;

      if (layoutVariant === 0) {
        // --- LAYOUT 0: L-SHAPED CORNER ENSEMBLE WITH LARGE PAVED CORNER PLAZA ---
        const nW = innerW - 70;
        const nH = 110;
        buildings.push({
          id: `urb_l0_n_${bx}_${by}`,
          x: innerX + 5,
          y: innerY + 5,
          width: nW,
          height: nH,
          type: 'business_center',
          color: '#0f172a',
          roofColor: '#0284c7',
          accentColor: '#38bdf8',
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'helipad', rx: 0.2, ry: 0.2, rw: 0.4, rh: 0.6 }]
        });

        const wW = 110;
        const wY = innerY + nH + 15;
        const wH = innerH - (nH + 25);
        buildings.push({
          id: `urb_l0_w_${bx}_${by}`,
          x: innerX + 5,
          y: wY,
          width: wW,
          height: wH,
          type: 'modern_residential',
          color: '#1e293b',
          roofColor: '#0f172a',
          accentColor: '#f59e0b',
          windows: [],
          balconies: [
            { side: 'east', offset: 0.3, length: 22, depth: 6, isGlazed: true },
            { side: 'east', offset: 0.7, length: 22, depth: 6, isGlazed: true }
          ],
          entrances: [{ side: 'east', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'ac', rx: 0.2, ry: 0.2, rw: 0.3, rh: 0.4 }]
        });

        // Continuous paved walkway connecting entrances to corner plaza
        blockWalkways.push(
          { x: innerX + 5, y: innerY + nH + 2, width: nW, height: 18, style: 'concrete' },
          { x: innerX + wW + 2, y: wY, width: 18, height: wH, style: 'concrete' }
        );

        // Large Paved Corner Plaza in SE
        const plazaX = innerX + wW + 20;
        const plazaY = innerY + nH + 20;
        const plazaW = innerW - wW - 35;
        const plazaH = innerH - nH - 35;
        blockPlazas.push({
          x: plazaX,
          y: plazaY,
          width: plazaW,
          height: plazaH,
          shape: 'rect',
          style: 'tile'
        });

        // Props neatly placed ON paved walkways and plaza
        props.push(
          { id: `urb_bench_l0_${bx}_${by}_1`, x: innerX + nW * 0.3, y: innerY + nH + 11, type: 'bench', angle: 0 },
          { id: `urb_urn_l0_${bx}_${by}_1`, x: innerX + nW * 0.3 + 18, y: innerY + nH + 11, type: 'trash_can', angle: 0 },
          { id: `urb_bench_l0_${bx}_${by}_2`, x: innerX + wW + 11, y: wY + wH * 0.5, type: 'bench', angle: Math.PI / 2 },
          { id: `urb_urn_l0_${bx}_${by}_2`, x: innerX + wW + 11, y: wY + wH * 0.5 + 18, type: 'trash_can', angle: 0 },
          { id: `urb_flower_l0_${bx}_${by}_1`, x: plazaX + plazaW / 2, y: plazaY + plazaH / 2, type: 'flowerbed', angle: 0 },
          { id: `urb_lamp_l0_${bx}_${by}_1`, x: plazaX + 25, y: plazaY + 25, type: 'lamp', angle: 0 },
          { id: `urb_kiosk_l0_${bx}_${by}_1`, x: plazaX + plazaW - 25, y: plazaY + 25, type: 'kiosk', angle: 0 }
        );
      } else if (layoutVariant === 1) {
        // --- LAYOUT 1: CENTRAL PEDESTRIAN BOULEVARD & DUAL PARALLEL WINGS ---
        let shopBrand: Building['shopBrand'] = undefined;
        let bldNameRu = 'Коммерческий пассаж';
        let bldColor = '#3f3f46';
        let bldRoofColor = '#27272a';
        let bldAccentColor = '#38bdf8';
        let bldType: Building['type'] = 'commercial_gallery';

        if (bx === 0 && by === 4) {
          shopBrand = 'bean_bistro';
          bldNameRu = 'Кафе & Кофейня "Bean & Bistro"';
          bldColor = '#78350f';
          bldRoofColor = '#451a03';
          bldAccentColor = '#f59e0b';
          bldType = 'coffee_bistro';
        } else if (bx === 1 && by === 4) {
          shopBrand = 'pharmacy_36_6';
          bldNameRu = 'Аптека "36.6" (Западный филиал)';
          bldColor = '#065f46';
          bldRoofColor = '#022c22';
          bldAccentColor = '#10b981';
          bldType = 'pharmacy_store';
        } else if (bx === 5 && by === 4) {
          shopBrand = 'cofix_bakery';
          bldNameRu = 'Кафе & Пекарня "Cofix & Bakery"';
          bldColor = '#18181b';
          bldRoofColor = '#09090b';
          bldAccentColor = '#ea580c';
          bldType = 'bakery_cafe';
        } else if (bx === 7 && by === 4) {
          shopBrand = 'pharmacy_36_6';
          bldNameRu = 'Аптека "36.6" (Восточный филиал)';
          bldColor = '#065f46';
          bldRoofColor = '#022c22';
          bldAccentColor = '#10b981';
          bldType = 'pharmacy_store';
        } else if (bx === 9 && by === 4) {
          shopBrand = 'pyaterochka';
          bldNameRu = 'Супермаркет "Пятёрочка 24/7"';
          bldColor = '#15803d';
          bldRoofColor = '#14532d';
          bldAccentColor = '#dc2626';
          bldType = 'supermarket_store';
        } else if (bx === 3 && by === 7) {
          shopBrand = 'pharmacy_36_6';
          bldNameRu = 'Аптека "36.6" (Южный филиал)';
          bldColor = '#065f46';
          bldRoofColor = '#022c22';
          bldAccentColor = '#10b981';
          bldType = 'pharmacy_store';
        } else if (bx === 6 && by === 4) {
          shopBrand = 'splav_gear';
          bldNameRu = 'Магазин "Охота & Туризм Сплав"';
          bldColor = '#365314';
          bldRoofColor = '#1a2e05';
          bldAccentColor = '#84cc16';
          bldType = 'tactical_store';
        } else if (bx === 8 && by === 4) {
          shopBrand = 'cofix_bakery';
          bldNameRu = 'Кафе & Пекарня "Cofix"';
          bldColor = '#18181b';
          bldRoofColor = '#09090b';
          bldAccentColor = '#ea580c';
          bldType = 'bakery_cafe';
        } else if (bx === 4 && by === 7) {
          shopBrand = 'pyaterochka';
          bldNameRu = 'Супермаркет "Пятёрочка" (Южный)';
          bldColor = '#15803d';
          bldRoofColor = '#14532d';
          bldAccentColor = '#dc2626';
          bldType = 'supermarket_store';
        } else if (bx === 5 && by === 7) {
          shopBrand = 'bean_bistro';
          bldNameRu = 'Кафе "Bean & Bistro"';
          bldColor = '#78350f';
          bldRoofColor = '#451a03';
          bldAccentColor = '#f59e0b';
          bldType = 'coffee_bistro';
        }

        const nW = innerW - 10;
        const nH = 110;
        buildings.push({
          id: `urb_l1_n_${bx}_${by}`,
          nameRu: bldNameRu,
          shopBrand: shopBrand,
          x: innerX + 5,
          y: innerY + 5,
          width: nW,
          height: nH,
          type: bldType,
          color: bldColor,
          roofColor: bldRoofColor,
          accentColor: bldAccentColor,
          windows: [],
          entrances: [{ side: 'south', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'ac', rx: 0.2, ry: 0.3, rw: 0.15, rh: 0.4 }]
        });

        const sW = innerW - 10;
        const sH = 110;
        const sY = innerY + innerH - sH - 5;
        buildings.push({
          id: `urb_l1_s_${bx}_${by}`,
          x: innerX + 5,
          y: sY,
          width: sW,
          height: sH,
          type: (bx + by) % 2 === 0 ? 'panel_apartment' : 'brick_residential',
          color: (bx + by) % 2 === 0 ? '#e2e8f0' : '#9a3412',
          roofColor: (bx + by) % 2 === 0 ? '#cbd5e1' : '#7c2d12',
          accentColor: '#f59e0b',
          windows: [],
          balconies: [
            { side: 'north', offset: 0.25, length: 22, depth: 6, isGlazed: true },
            { side: 'north', offset: 0.75, length: 22, depth: 6, isGlazed: false }
          ],
          entrances: [{ side: 'north', offsetRatio: 0.5, number: 1 }],
          roofDetails: []
        });

        // Wide Central Pedestrian Boulevard running East-West
        const blvdY = innerY + nH + 10;
        const blvdH = sY - (innerY + nH + 10) - 10;
        blockWalkways.push({
          x: innerX + 5,
          y: blvdY,
          width: nW,
          height: blvdH,
          style: 'concrete'
        });

        // Props on the central boulevard
        props.push(
          { id: `blvd_bench_1_${bx}_${by}`, x: innerX + nW * 0.25, y: blvdY + blvdH / 2 - 8, type: 'bench', angle: 0 },
          { id: `blvd_urn_1_${bx}_${by}`, x: innerX + nW * 0.25 + 18, y: blvdY + blvdH / 2 - 8, type: 'trash_can', angle: 0 },
          { id: `blvd_bench_2_${bx}_${by}`, x: innerX + nW * 0.75, y: blvdY + blvdH / 2 - 8, type: 'bench', angle: 0 },
          { id: `blvd_urn_2_${bx}_${by}`, x: innerX + nW * 0.75 + 18, y: blvdY + blvdH / 2 - 8, type: 'trash_can', angle: 0 },
          { id: `blvd_lamp_1_${bx}_${by}`, x: innerX + nW * 0.5, y: blvdY + blvdH / 2 - 8, type: 'lamp', angle: 0 },
          { id: `blvd_flower_1_${bx}_${by}`, x: innerX + nW * 0.5 + 20, y: blvdY + blvdH / 2 - 8, type: 'flowerbed', angle: 0 }
        );

        trees.push({
          id: `blvd_tree_1_${bx}_${by}`, x: innerX + 25, y: blvdY + blvdH / 2, radius: 12, color: '#15803d', shadowOffset: 4
        }, {
          id: `blvd_tree_2_${bx}_${by}`, x: innerX + nW - 25, y: blvdY + blvdH / 2, radius: 12, color: '#15803d', shadowOffset: 4
        });
      } else {
        // --- LAYOUT 2: CENTERPIECE HIGH-RISE TOWER & LANDSCAPED QUAD WITH PARKING ---
        let l2Brand: Building['shopBrand'] = undefined;
        let l2NameRu = 'Деловой центр';
        let l2Color = '#0f172a';
        let l2RoofColor = '#0284c7';
        let l2AccentColor = '#38bdf8';
        let l2Type: Building['type'] = 'business_center';
        if (bx === 3 && by === 2) {
          l2Brand = 'splav_gear';
          l2NameRu = 'Магазин "Охота & Туризм Сплав"';
          l2Color = '#365314';
          l2RoofColor = '#1a2e05';
          l2AccentColor = '#84cc16';
          l2Type = 'tactical_store';
        }

        const towerW = Math.min(200, innerW - 100);
        const towerH = Math.min(130, innerH - 40);
        buildings.push({
          id: `urb_l2_main_${bx}_${by}`,
          nameRu: l2NameRu,
          shopBrand: l2Brand,
          x: innerX + 5,
          y: innerY + 5,
          width: towerW,
          height: towerH,
          type: l2Type,
          color: l2Color,
          roofColor: l2RoofColor,
          accentColor: l2AccentColor,
          windows: [],
          entrances: [{ side: 'east', offsetRatio: 0.5, number: 1 }],
          roofDetails: [{ type: 'helipad', rx: 0.2, ry: 0.2, rw: 0.5, rh: 0.6 }]
        });

        // Landscaped Quad Plaza next to tower
        const quadX = innerX + towerW + 15;
        const quadW = innerW - towerW - 20;
        blockPlazas.push({
          x: quadX,
          y: innerY + 5,
          width: quadW,
          height: towerH,
          shape: 'rect',
          style: 'tile'
        });

        // Visitor Parking below
        const pkY = innerY + towerH + 15;
        const pkH = innerH - towerH - 20;
        if (pkH > 35) {
          const quadSpots: ParkingArea['spots'] = [];
          const numCols = Math.floor(innerW / 45);
          for (let c = 0; c < numCols; c++) {
            quadSpots.push({ x: innerX + 20 + c * 45, y: pkY + pkH / 2, angle: Math.PI / 2, occupied: c % 2 === 0 });
          }
          parkings.push({
            id: `urb_parking_${bx}_${by}`,
            x: innerX + 5,
            y: pkY,
            width: innerW - 10,
            height: pkH,
            spots: quadSpots
          });
        }

        props.push(
          { id: `quad_bench_1_${bx}_${by}`, x: quadX + 15, y: innerY + 25, type: 'bench', angle: Math.PI / 2 },
          { id: `quad_urn_1_${bx}_${by}`, x: quadX + 15, y: innerY + 43, type: 'trash_can', angle: 0 },
          { id: `quad_lamp_1_${bx}_${by}`, x: quadX + quadW / 2, y: innerY + towerH / 2, type: 'lamp', angle: 0 },
          { id: `quad_kiosk_1_${bx}_${by}`, x: quadX + quadW - 20, y: innerY + 25, type: 'kiosk', angle: 0 }
        );
      }
    }
  }

  // 4. SPAWN INITIAL MOVING AI TRAFFIC VEHICLES ON ROADS
  const carTypes: CarType[] = [
    // Standard civilian & everyday
    'sedan', 'sedan_compact', 'sedan_luxury', 'sedan_classic', 'classic_compact',
    'hatchback', 'hatch_hot', 'micro_car', 'retro_bubble',
    'wagon_classic', 'wagon_modern', 'wagon_allroad',
    // Crossovers & SUVs
    'suv', 'suv_luxury', 'suv_classic_box', 'offroad_hardcore', 'crossover_compact',
    // Performance & Muscle
    'sports', 'supercar', 'muscle', 'muscle_classic', 'coupe_gt',
    // Pickups & Vans
    'pickup', 'pickup_heavy', 'van', 'van_camper', 'van_cargo_old',
    // Public & City services
    'taxi', 'bus', 'bus_minibus',
    // Emergency services
    'police', 'fire_engine', 'fire_ladder', 'fire_rescue',
    'ambulance', 'ambulance_van', 'ambulance_suv',
    // Commercial & Heavy trucks
    'delivery_truck', 'truck_tow', 'truck_armored',
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
        if ((rIdx * 3 + lIdx) % 10 !== 0) return;
      }
      if (vehicleCounter >= 42) return;

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
      else if (cType === 'bus') color = '#eab308';
      else if (cType === 'bus_minibus') color = '#f59e0b';
      else if (cType === 'ambulance' || cType === 'ambulance_van' || cType === 'ambulance_suv') color = '#f8fafc';
      else if (cType === 'van') color = '#6ee7b7';
      else if (cType === 'van_camper') color = '#fef08a';
      else if (cType === 'van_cargo_old') color = '#94a3b8';
      else if (cType === 'muscle' || cType === 'muscle_classic') color = '#991b1b';
      else if (cType === 'garbage_truck') color = '#16a34a';
      else if (cType === 'truck_dump') color = '#d97706';
      else if (cType === 'cement_mixer') color = '#2563eb';
      else if (cType === 'truck_box') color = '#0284c7';
      else if (cType === 'truck_water') color = '#0284c7';
      else if (cType === 'truck_tanker') color = '#0369a1';
      else if (cType === 'truck_flatbed') color = '#475569';
      else if (cType === 'truck_tow') color = '#eab308';
      else if (cType === 'truck_armored') color = '#334155';
      else if (cType === 'delivery_truck') color = '#78350f';
      else if (cType === 'supercar') color = '#ef4444';
      else if (cType === 'retro_bubble') color = '#38bdf8';
      else if (cType === 'sedan_luxury') color = '#1e293b';

      const isEmergency = cType === 'police' || cType === 'ambulance' || cType === 'ambulance_van' || 
                          cType === 'ambulance_suv' || cType === 'fire_engine' || cType === 'fire_ladder' || 
                          cType === 'fire_rescue';
      let roofColor = isEmergency ? '#f8fafc' : color;
      if (cType === 'suv_classic_box') roofColor = '#ffffff';
      if (cType === 'classic_compact') roofColor = '#f1f5f9';
      if (cType === 'wagon_allroad') roofColor = '#0f172a';

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
        requiredFuel: createDefaultFuelSystem(cType).fuelType === 'diesel' ? 'diesel' : (createDefaultFuelSystem(cType).octaneNumber === 92 ? 'ai92' : 'ai95'),
        engineState: createDefaultEngineState(cType, true, false),
        fuelSystem: createDefaultFuelSystem(cType, false),
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
  const parkableCarTypes: CarType[] = [
    'sedan', 'sedan_compact', 'sedan_luxury', 'sedan_classic', 'classic_compact',
    'hatchback', 'hatch_hot', 'micro_car', 'retro_bubble',
    'wagon_classic', 'wagon_modern', 'wagon_allroad',
    'suv', 'suv_luxury', 'suv_classic_box', 'offroad_hardcore', 'crossover_compact',
    'sports', 'supercar', 'muscle', 'muscle_classic', 'coupe_gt',
    'pickup', 'pickup_heavy', 'van', 'van_camper', 'van_cargo_old',
    'taxi'
  ];

  parkings.forEach((parking) => {
    parking.spots.forEach((spot) => {
      if (spot.occupied && vehicleCounter < 68) {
        const cType = parkableCarTypes[Math.floor(Math.random() * parkableCarTypes.length)];
        const cfg = CAR_CONFIGS[cType];
        let color = CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
        if (cType === 'taxi') color = '#eab308';
        else if (cType === 'van_camper') color = '#fef08a';
        else if (cType === 'retro_bubble') color = '#38bdf8';
        else if (cType === 'supercar') color = '#ef4444';
        else if (cType === 'sedan_luxury') color = '#1e293b';
        else if (cType === 'muscle_classic') color = '#b91c1c';

        let roofColor = color;
        if (cType === 'suv_classic_box') roofColor = '#ffffff';
        if (cType === 'classic_compact') roofColor = '#f1f5f9';
        if (cType === 'wagon_allroad') roofColor = '#0f172a';

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
          roofColor,
          headlightsOn: false,
          headlightMode: 'off',
          brakeLightsOn: false,
          isReversing: false,
          turnSignal: 'none',
          turnSignalTimer: 0,
          requiredFuel: createDefaultFuelSystem(cType, true).fuelType === 'diesel' ? 'diesel' : (createDefaultFuelSystem(cType, true).octaneNumber === 92 ? 'ai92' : 'ai95'),
          engineState: createDefaultEngineState(cType, false, true),
          fuelSystem: createDefaultFuelSystem(cType, true),
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
  const MAX_PEDESTRIANS = 20;
  
  // Shuffle paths for variety so they aren't all clustered at the start of the array
  const shuffledPaths = [...pedestrianPaths].sort(() => Math.random() - 0.5);
  
  shuffledPaths.forEach((path) => {
    if (pedestrians.length >= MAX_PEDESTRIANS) return;
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
      if (pedestrians.length >= MAX_PEDESTRIANS) break;
      
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
    stains: [],
    particles: [],
    weather: 'clear',
    pedestrianPaths
  };
}

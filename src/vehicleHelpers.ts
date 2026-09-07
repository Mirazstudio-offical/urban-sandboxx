import { 
  CarConfig,
  CarType, 
  DeformVertex,
  EngineState,
  FuelSystem,
  Vector2D, 
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

  let tankLevel = 100;
  if (isParkedOnStreet) {
    tankLevel = Math.round(15 + Math.random() * 70);
  } else if (Math.random() < 0.9) {
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

  const base16 = [
    { localX: halfL, localY: 0, structuralType: 'bumper' },
    { localX: halfL - 0.5, localY: halfW * 0.5, structuralType: 'bumper' },
    { localX: halfL - 2.5, localY: halfW - 1.5, structuralType: 'fender' },
    { localX: halfL * 0.5, localY: halfW, structuralType: 'fender' },
    { localX: 0, localY: halfW, structuralType: 'door' },
    { localX: -halfL * 0.5, localY: halfW, structuralType: 'door' },
    { localX: -halfL + 2.5, localY: halfW - 1.5, structuralType: 'quarter' },
    { localX: -halfL + 0.5, localY: halfW * 0.5, structuralType: 'bumper' },
    { localX: -halfL, localY: 0, structuralType: 'bumper' },
    { localX: -halfL + 0.5, localY: -halfW * 0.5, structuralType: 'bumper' },
    { localX: -halfL + 2.5, localY: -halfW + 1.5, structuralType: 'quarter' },
    { localX: -halfL * 0.5, localY: -halfW, structuralType: 'door' },
    { localX: 0, localY: -halfW, structuralType: 'door' },
    { localX: halfL * 0.5, localY: -halfW, structuralType: 'fender' },
    { localX: halfL - 2.5, localY: -halfW + 1.5, structuralType: 'fender' },
    { localX: halfL - 0.5, localY: -halfW * 0.5, structuralType: 'bumper' }
  ];
  const deformedVertices: DeformVertex[] = [];
  for (let i = 0; i < base16.length; i++) {
    deformedVertices.push({
      localX: base16[i].localX, localY: base16[i].localY, 
      offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, 
      structuralType: base16[i].structuralType as any
    });
    if (i === 15 || i === 0 || i === 7 || i === 8) {
      const nextIdx = (i + 1) % 16;
      deformedVertices.push({
        localX: (base16[i].localX + base16[nextIdx].localX) / 2, 
        localY: (base16[i].localY + base16[nextIdx].localY) / 2,
        offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, 
        structuralType: 'bumper'
      });
    }
  }

  // Volumetric internal nodes for roof, cabin, windshield, rear glass, hood & trunk skeleton (indices 20 to 27)
  const internalNodes = [
    { localX: halfL * 0.4, localY: 0, structuralType: 'hood' },         // 20: Hood center
    { localX: halfL * 0.15, localY: 0, structuralType: 'windshield' },   // 21: Windshield top
    { localX: 0, localY: 0, structuralType: 'roof' },                    // 22: Roof center
    { localX: 0, localY: -halfW * 0.45, structuralType: 'roof' },         // 23: Roof left
    { localX: 0, localY: halfW * 0.45, structuralType: 'roof' },          // 24: Roof right
    { localX: -halfL * 0.2, localY: 0, structuralType: 'glass' },        // 25: Rear window top
    { localX: -halfL * 0.5, localY: 0, structuralType: 'trunk' },        // 26: Trunk center
    { localX: -halfL * 0.05, localY: 0, structuralType: 'cabin' }        // 27: Cabin center
  ];
  for (const node of internalNodes) {
    deformedVertices.push({
      localX: node.localX, localY: node.localY,
      offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0,
      structuralType: node.structuralType as any
    });
  }

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
    underHoodSteam: 'none',
    underHoodSmoke: 'none',
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

export function ensureVehicleDamage(veh: { length?: number; width?: number; damage?: VehicleDamage }): VehicleDamage {
  const targetLen = veh.length || 42;
  const targetWid = veh.width || 20;
  if (!veh.damage) {
    return createDefaultVehicleDamage(targetLen, targetWid);
  }

  const dmg = veh.damage;
  if (!Array.isArray(dmg.deformedVertices) || dmg.deformedVertices.length < 28) {
    const fresh = createDefaultVehicleDamage(targetLen, targetWid);
    if (Array.isArray(dmg.deformedVertices)) {
      const copyCount = Math.min(dmg.deformedVertices.length, fresh.deformedVertices.length);
      for (let i = 0; i < copyCount; i++) {
        const srcV = dmg.deformedVertices[i];
        if (srcV) {
          fresh.deformedVertices[i].offsetX = srcV.offsetX || 0;
          fresh.deformedVertices[i].offsetY = srcV.offsetY || 0;
          fresh.deformedVertices[i].plasticStrain = srcV.plasticStrain || 0;
          fresh.deformedVertices[i].elasticX = srcV.elasticX || 0;
          fresh.deformedVertices[i].elasticY = srcV.elasticY || 0;
          fresh.deformedVertices[i].velX = srcV.velX || 0;
          fresh.deformedVertices[i].velY = srcV.velY || 0;
        }
      }
    }
    return {
      ...fresh,
      ...dmg,
      deformedVertices: fresh.deformedVertices
    };
  }

  return dmg;
}

export const CAR_CONFIGS: Record<string, CarConfig> = {
  sedan: { type: 'sedan', width: 20, length: 42, wheelBase: 26, mass: 1400, maxSpeed: 180, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 240, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.75, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Седан', transmission: 'AUTO' },
  hatchback: { type: 'hatchback', width: 19, length: 38, wheelBase: 23, mass: 1150, maxSpeed: 175, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 250, friction: 0.988, turnSpeed: 4.5, maxSteerAngle: 0.78, minSteerAngle: 0.15, grip: 0.988, driftGrip: 0.40, name: 'Хэтчбек', transmission: 'MANUAL' },
  pickup: { type: 'pickup', width: 22, length: 48, wheelBase: 30, mass: 2200, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 24, brakingForce: 220, friction: 0.985, turnSpeed: 3.6, maxSteerAngle: 0.68, minSteerAngle: 0.12, grip: 0.975, driftGrip: 0.32, name: 'Пикап', transmission: 'MANUAL' },
  sports: { type: 'sports', width: 21, length: 44, wheelBase: 27, mass: 1320, maxSpeed: 280, reverseMaxSpeed: 55, acceleration: 55, brakingForce: 290, friction: 0.990, turnSpeed: 4.6, maxSteerAngle: 0.72, minSteerAngle: 0.13, grip: 0.990, driftGrip: 0.44, name: 'Спорткар', transmission: 'AUTO' },
  suv: { type: 'suv', width: 21, length: 42, wheelBase: 26, mass: 1450, maxSpeed: 170, reverseMaxSpeed: 45, acceleration: 26, brakingForce: 230, friction: 0.986, turnSpeed: 3.8, maxSteerAngle: 0.72, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.36, name: 'Внедорожник', transmission: 'AUTO' },
  taxi: { type: 'taxi', width: 21, length: 46, wheelBase: 28, mass: 1450, maxSpeed: 175, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 245, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.75, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Такси', transmission: 'AUTO' },
  police: { type: 'police', width: 21, length: 46, wheelBase: 28, mass: 1550, maxSpeed: 220, reverseMaxSpeed: 55, acceleration: 45, brakingForce: 275, friction: 0.989, turnSpeed: 4.4, maxSteerAngle: 0.74, minSteerAngle: 0.13, grip: 0.988, driftGrip: 0.40, name: 'Полиция', transmission: 'AUTO' },
  ambulance: { type: 'ambulance', width: 24, length: 54, wheelBase: 32, mass: 2800, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 210, friction: 0.984, turnSpeed: 3.6, maxSteerAngle: 1.20, minSteerAngle: 0.11, grip: 0.970, driftGrip: 0.30, name: 'Скорая Помощь', transmission: 'AUTO' },
  bus: { type: 'bus', width: 26, length: 85, wheelBase: 52, mass: 9500, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 12, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 1.30, minSteerAngle: 0.08, grip: 0.950, driftGrip: 0.22, name: 'Автобус', transmission: 'MANUAL' },
  supercar: { type: 'supercar', width: 22, length: 45, wheelBase: 27, mass: 1250, maxSpeed: 320, reverseMaxSpeed: 60, acceleration: 70, brakingForce: 330, friction: 0.992, turnSpeed: 4.8, maxSteerAngle: 0.70, minSteerAngle: 0.12, grip: 0.994, driftGrip: 0.48, name: 'Гиперкар', transmission: 'AUTO' },
  wagon_classic: { type: 'wagon_classic', width: 20, length: 44, wheelBase: 26, mass: 1350, maxSpeed: 155, reverseMaxSpeed: 40, acceleration: 24, brakingForce: 210, friction: 0.986, turnSpeed: 3.8, maxSteerAngle: 0.72, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.35, name: 'Универсал 80-х', transmission: 'MANUAL' },
  sedan_classic: { type: 'sedan_classic', width: 19, length: 42, wheelBase: 25, mass: 1200, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 200, friction: 0.986, turnSpeed: 3.9, maxSteerAngle: 0.74, minSteerAngle: 0.14, grip: 0.978, driftGrip: 0.34, name: 'Классический седан', transmission: 'MANUAL' },
  sedan_compact: { type: 'sedan_compact', width: 18, length: 39, wheelBase: 24, mass: 1050, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 230, friction: 0.988, turnSpeed: 4.3, maxSteerAngle: 0.76, minSteerAngle: 0.15, grip: 0.985, driftGrip: 0.39, name: 'Компактный седан', transmission: 'MANUAL' },
  suv_luxury: { type: 'suv_luxury', width: 23, length: 50, wheelBase: 31, mass: 2400, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 48, brakingForce: 280, friction: 0.989, turnSpeed: 4.0, maxSteerAngle: 0.70, minSteerAngle: 0.12, grip: 0.988, driftGrip: 0.41, name: 'Люкс Внедорожник', transmission: 'AUTO' },
  pickup_heavy: { type: 'pickup_heavy', width: 24, length: 54, wheelBase: 34, mass: 3100, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 32, brakingForce: 240, friction: 0.984, turnSpeed: 3.6, maxSteerAngle: 1.20, minSteerAngle: 0.10, grip: 0.972, driftGrip: 0.30, name: 'Тяжелый пикап 4x4', transmission: 'AUTO' },
  hatch_hot: { type: 'hatch_hot', width: 19, length: 39, wheelBase: 24, mass: 1220, maxSpeed: 240, reverseMaxSpeed: 50, acceleration: 52, brakingForce: 290, friction: 0.990, turnSpeed: 4.7, maxSteerAngle: 0.78, minSteerAngle: 0.15, grip: 0.990, driftGrip: 0.43, name: 'Хот-хэтч', transmission: 'MANUAL' },
  micro_car: { type: 'micro_car', width: 16, length: 30, wheelBase: 19, mass: 800, maxSpeed: 135, reverseMaxSpeed: 35, acceleration: 26, brakingForce: 220, friction: 0.988, turnSpeed: 5.2, maxSteerAngle: 0.85, minSteerAngle: 0.18, grip: 0.982, driftGrip: 0.36, name: 'Микрокар', transmission: 'MANUAL' },
  van: { type: 'van', width: 22, length: 50, wheelBase: 30, mass: 2100, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 220, friction: 0.985, turnSpeed: 3.6, maxSteerAngle: 1.15, minSteerAngle: 0.11, grip: 0.975, driftGrip: 0.32, name: 'Пассажирский вэн', transmission: 'AUTO' },
  coupe_gt: { type: 'coupe_gt', width: 21, length: 46, wheelBase: 28, mass: 1650, maxSpeed: 270, reverseMaxSpeed: 55, acceleration: 58, brakingForce: 300, friction: 0.991, turnSpeed: 4.5, maxSteerAngle: 0.72, minSteerAngle: 0.13, grip: 0.991, driftGrip: 0.45, name: 'Гран Туризмо Купе', transmission: 'AUTO' },
  fire_engine: { type: 'fire_engine', width: 27, length: 88, wheelBase: 50, mass: 11000, maxSpeed: 130, reverseMaxSpeed: 35, acceleration: 22, brakingForce: 220, friction: 0.982, turnSpeed: 3.2, maxSteerAngle: 1.32, minSteerAngle: 0.09, grip: 0.965, driftGrip: 0.25, name: 'Пожарный автомобиль', transmission: 'AUTO' },
  fire_ladder: { type: 'fire_ladder', width: 28, length: 98, wheelBase: 58, mass: 13500, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 18, brakingForce: 210, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 1.30, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.22, name: 'Пожарная автолестница', transmission: 'AUTO' },
  truck_tow: { type: 'truck_tow', width: 24, length: 62, wheelBase: 38, mass: 4200, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 20, brakingForce: 210, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 1.32, minSteerAngle: 0.10, grip: 0.968, driftGrip: 0.28, name: 'Эвакуатор', transmission: 'MANUAL' },
  truck_armored: { type: 'truck_armored', width: 25, length: 58, wheelBase: 36, mass: 5500, maxSpeed: 140, reverseMaxSpeed: 35, acceleration: 20, brakingForce: 220, friction: 0.984, turnSpeed: 3.4, maxSteerAngle: 1.30, minSteerAngle: 0.09, grip: 0.970, driftGrip: 0.28, name: 'Инкассаторский броневик', transmission: 'AUTO' },
  delivery_truck: { type: 'delivery_truck', width: 23, length: 56, wheelBase: 35, mass: 3200, maxSpeed: 145, reverseMaxSpeed: 38, acceleration: 22, brakingForce: 220, friction: 0.984, turnSpeed: 3.8, maxSteerAngle: 1.32, minSteerAngle: 0.10, grip: 0.970, driftGrip: 0.30, name: 'Развозочный фургон', transmission: 'MANUAL' },
  van_camper: { type: 'van_camper', width: 22, length: 52, wheelBase: 32, mass: 2600, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 18, brakingForce: 200, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 1.25, minSteerAngle: 0.10, grip: 0.968, driftGrip: 0.29, name: 'Автодом Кемпер', transmission: 'MANUAL' },
  classic_compact: { type: 'classic_compact', width: 18, length: 36, wheelBase: 22, mass: 900, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 22, brakingForce: 190, friction: 0.986, turnSpeed: 4.4, maxSteerAngle: 0.78, minSteerAngle: 0.15, grip: 0.975, driftGrip: 0.33, name: 'Классический Жук', transmission: 'MANUAL' },
  retro_bubble: { type: 'retro_bubble', width: 17, length: 32, wheelBase: 20, mass: 750, maxSpeed: 120, reverseMaxSpeed: 32, acceleration: 20, brakingForce: 180, friction: 0.986, turnSpeed: 4.8, maxSteerAngle: 0.82, minSteerAngle: 0.16, grip: 0.972, driftGrip: 0.32, name: 'Ретро Баббл-кар', transmission: 'MANUAL' },
  offroad_hardcore: { type: 'offroad_hardcore', width: 22, length: 44, wheelBase: 26, mass: 1950, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 28, brakingForce: 230, friction: 0.984, turnSpeed: 3.8, maxSteerAngle: 0.72, minSteerAngle: 0.12, grip: 0.982, driftGrip: 0.35, name: 'Экстрим Внедорожник', transmission: 'MANUAL' },
  suv_classic_box: { type: 'suv_classic_box', width: 21, length: 45, wheelBase: 27, mass: 1800, maxSpeed: 160, reverseMaxSpeed: 42, acceleration: 26, brakingForce: 220, friction: 0.985, turnSpeed: 3.8, maxSteerAngle: 0.72, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.34, name: 'Рамный Внедорожник', transmission: 'MANUAL' },
  muscle_classic: { type: 'muscle_classic', width: 21, length: 48, wheelBase: 29, mass: 1650, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 50, brakingForce: 240, friction: 0.988, turnSpeed: 3.9, maxSteerAngle: 0.70, minSteerAngle: 0.12, grip: 0.978, driftGrip: 0.42, name: 'Маслкар 70-х', transmission: 'MANUAL' },
  van_cargo_old: { type: 'van_cargo_old', width: 21, length: 46, wheelBase: 28, mass: 1700, maxSpeed: 135, reverseMaxSpeed: 35, acceleration: 18, brakingForce: 190, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 1.25, minSteerAngle: 0.11, grip: 0.968, driftGrip: 0.30, name: 'Старый фургон', transmission: 'MANUAL' },
  truck_box: { type: 'truck_box', width: 25, length: 68, wheelBase: 42, mass: 6200, maxSpeed: 125, reverseMaxSpeed: 32, acceleration: 15, brakingForce: 185, friction: 0.981, turnSpeed: 3.2, maxSteerAngle: 1.32, minSteerAngle: 0.09, grip: 0.958, driftGrip: 0.24, name: 'Фургон-Будка', transmission: 'MANUAL' },
  truck_dump: { type: 'truck_dump', width: 26, length: 72, wheelBase: 44, mass: 8500, maxSpeed: 115, reverseMaxSpeed: 30, acceleration: 14, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 1.32, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.23, name: 'Самосвал', transmission: 'MANUAL' },
  truck_tanker: { type: 'truck_tanker', width: 26, length: 76, wheelBase: 46, mass: 9200, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 12, brakingForce: 175, friction: 0.979, turnSpeed: 3.0, maxSteerAngle: 1.32, minSteerAngle: 0.08, grip: 0.950, driftGrip: 0.22, name: 'Бензовоз', transmission: 'MANUAL' },
  truck_water: { type: 'truck_water', width: 25, length: 70, wheelBase: 43, mass: 8000, maxSpeed: 118, reverseMaxSpeed: 30, acceleration: 13, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 1.32, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.23, name: 'Водовоз', transmission: 'MANUAL' },
  truck_flatbed: { type: 'truck_flatbed', width: 25, length: 74, wheelBase: 45, mass: 7000, maxSpeed: 120, reverseMaxSpeed: 32, acceleration: 14, brakingForce: 185, friction: 0.981, turnSpeed: 3.2, maxSteerAngle: 1.32, minSteerAngle: 0.08, grip: 0.958, driftGrip: 0.24, name: 'Бортовой грузовик', transmission: 'MANUAL' },
  cement_mixer: { type: 'cement_mixer', width: 26, length: 72, wheelBase: 44, mass: 9800, maxSpeed: 105, reverseMaxSpeed: 28, acceleration: 11, brakingForce: 170, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 1.30, minSteerAngle: 0.07, grip: 0.948, driftGrip: 0.21, name: 'Бетономешалка', transmission: 'MANUAL' },
  garbage_truck: { type: 'garbage_truck', width: 26, length: 78, wheelBase: 46, mass: 10500, maxSpeed: 100, reverseMaxSpeed: 28, acceleration: 10, brakingForce: 175, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 1.30, minSteerAngle: 0.07, grip: 0.945, driftGrip: 0.20, name: 'Мусоровоз', transmission: 'MANUAL' }
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

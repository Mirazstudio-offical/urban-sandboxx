import { 
  CarConfig,
  CarType, 
  DeformVertex,
  EngineState,
  FuelSystem,
  FluidStorageTank,
  StoredLiquidType,
  FluidStainType,
  Vector2D, 
  Vehicle,
  VehicleDamage,
  VehicleDiffLockState 
} from './types';

export const SPEED_KMH_TO_PX_S = 4.4444; // 1.6x speedup for realistic screen motion (formerly 2.7778)
export const PX_S_TO_SPEED_KMH = 0.225;  // 1 / 4.4444 (formerly 0.36)

export function isTrailerVehicle(car: Vehicle | { type?: string; isTrailer?: boolean } | null | undefined): boolean {
  if (!car) return false;
  if (car.isTrailer) return true;
  const t = car.type;
  if (!t) return false;
  return t.startsWith('trailer_') || t === 'trailer_barrel' || t === 'trailer_flatbed_2axle';
}

export function createDefaultEngineState(
  type: CarType = 'sedan',
  isDrivingTraffic: boolean = false, 
  isParkedOnStreet: boolean = false
): EngineState {
  if (type.startsWith('trailer_') || type === 'trailer_barrel' || type === 'trailer_flatbed_2axle') {
    return {
      radiatorWater: 0,
      radiatorPunctured: false,
      oilLevel: 0,
      oilPunctured: false,
      oilPressure: 0,
      batteryCharge: 0,
      starterWorking: false,
      temperature: 20,
      engineRunning: false,
      engineKnocking: false,
      engineStalled: false,
      overheatingSteam: false,
      engineRPM: 0,
      transmissionType: 'MANUAL',
      currentGear: 0,
      gearRatios: [0],
      finalDriveRatio: 1,
      clutchPedal: 1.0,
      isStalled: false,
      engineHealth: 100,
      isSeized: false,
      transmissionHealth: 100,
      transmissionJammed: false,
      hoodOpen: false
    };
  }

  const radiatorWater = isParkedOnStreet ? Math.round(75 + Math.random() * 25) : 100;
  const oilLevel = isParkedOnStreet ? Math.round(65 + Math.random() * 35) : 100;
  const batteryCharge = isParkedOnStreet ? Math.round(80 + Math.random() * 20) : 100;
  const temperature = isDrivingTraffic ? Math.round(82 + Math.random() * 10) : 20;
  const engineRunning = isDrivingTraffic;
  const engineRPM = isDrivingTraffic ? 850 : 0;

  const configTransmission = CAR_CONFIGS[type]?.transmission;
  const isManual = configTransmission ? configTransmission === 'MANUAL' : [
    'hatchback', 'pickup', 'wagon_classic', 'sedan_classic', 'sedan_compact',
    'compact_matiz', 'sedan_logan', 'sedan_nexia', 'liftback_tavria', 'sedan_accent',
    'hatch_samara', 'sedan_samara',
    'hatch_hot', 'micro_car', 'classic_compact', 'retro_bubble', 'offroad_hardcore',
    'suv_classic_box', 'muscle_classic', 'van_camper', 'van_cargo_old', 'truck_tow',
    'delivery_truck', 'truck_box', 'truck_dump', 'truck_semi', 'truck_tanker', 'truck_water',
    'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'bus',
    'tractor_mtz82', 'tractor_mtz80', 'tractor_mtz80_old',
    'moto_izh_jupiter', 'moto_ural_sidecar', 'moto_jawa350', 'moto_sport', 'moto_chopper', 'moped_soviet'
  ].includes(type);
  const transmissionType: 'MANUAL' | 'AUTO' = configTransmission || (isManual ? 'MANUAL' : 'AUTO');
  const hasTransferCase = type.startsWith('tractor_') || ['truck_box', 'truck_dump', 'truck_semi', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'truck_armored', 'fire_engine', 'fire_ladder'].includes(type);

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
    hasTransferCase,
    transferCaseMode: 'HIGH',
    tractorRange: type.startsWith('tractor_') ? 1 : undefined,
    gearRatios: (function() {
      if (['paver_asphalt_wheeled', 'roller_heavy_tandem', 'roller_compact_sidewalk', 'roller_pneumatic'].includes(type)) {
        return [-3.6, 0, 5.2, 2.0]; // Hydrostatic 2-Range (R: Реверс, N: Нейтраль, 1: Рабочий режим 0-5 км/ч, 2: Транспортный 0-14 км/ч)
      } else if (['truck_box', 'truck_dump', 'truck_semi', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'bus', 'delivery_truck', 'truck_tow', 'fire_engine', 'fire_ladder', 'fire_rescue', 'pickup_heavy', 'truck_armored'].includes(type)) {
        return [-4.5, 0, 4.8, 3.1, 2.0, 1.42, 1.00, 0.75]; // Heavy 6-speed commercial
      } else if (type.startsWith('tractor_')) {
        return [-4.5, 0, 5.5, 4.3, 3.3, 2.5, 1.9, 1.4, 1.0, 0.8, 0.65]; // Heavy tractor 9-speed base (18 total with multiplier)
      } else if (['supercar', 'sports', 'hatch_hot', 'coupe_gt', 'moto_sport'].includes(type)) {
        return [-3.2, 0, 3.1, 2.1, 1.55, 1.22, 1.00, 0.80]; // Sport 6-speed close-ratio
      } else if (['retro_bubble', 'classic_compact', 'sedan_classic', 'wagon_classic', 'micro_car'].includes(type)) {
        return [-3.5, 0, 3.6, 2.1, 1.36, 0.96]; // Vintage 4-speed
      } else if (type === 'moped_soviet') {
        return [-3.0, 0, 3.2, 1.8, 1.10]; // Soviet 3-speed moped
      } else if (type.startsWith('moto_')) {
        return [-2.8, 0, 2.7, 1.85, 1.35, 1.05, 0.85]; // Motorcycle 5-speed
      }
      return [-3.4, 0, 3.5, 2.05, 1.38, 1.00, 0.78]; // Standard passenger car 5-speed
    })(),
    finalDriveRatio: (function() {
      if (['paver_asphalt_wheeled', 'roller_heavy_tandem', 'roller_compact_sidewalk', 'roller_pneumatic'].includes(type)) return 6.2;
      if (['truck_box', 'truck_dump', 'truck_semi', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'bus', 'fire_engine'].includes(type)) return 4.8;
      if (type.startsWith('tractor_')) return 5.4;
      if (['supercar', 'sports'].includes(type)) return 3.4;
      return 3.9;
    })(),
    clutchPedal: 1.0,
    clutchTemperature: temperature,
    clutchWear: 0,
    transmissionTemp: temperature,
    isStalled: false,
    engineHealth: 100,
    isSeized: false,
    transmissionHealth: 100,
    transmissionJammed: false
  };
}

export function ensureVehicleEngineState(veh: Vehicle): EngineState {
  if (!veh.engineState) {
    veh.engineState = createDefaultEngineState(veh.type, !veh.isParked, veh.isParked);
    return veh.engineState;
  }
  const eng = veh.engineState;
  
  const defaultEng = createDefaultEngineState(veh.type);
  
  // Force update to ensure correct length for 9-speed/6-speed configs if mismatched
  if (!eng.gearRatios || !Array.isArray(eng.gearRatios) || eng.gearRatios.length !== defaultEng.gearRatios.length) {
    eng.gearRatios = defaultEng.gearRatios;
    eng.finalDriveRatio = defaultEng.finalDriveRatio;
    // ensure currentGear is within bounds
    if (eng.currentGear > eng.gearRatios.length - 2) {
      eng.currentGear = eng.gearRatios.length - 2;
    }
  }

  // Force update transfer case attributes
  if (eng.hasTransferCase === undefined) {
    eng.hasTransferCase = defaultEng.hasTransferCase;
    eng.transferCaseMode = defaultEng.transferCaseMode || 'HIGH';
  }

  const isMachinery = isRoadMachinery(veh.type);
  if (isMachinery) {
    // Road machinery is strictly hydrostatic drive (ГСТ): AUTO, F/N/R, no manual clutch or stepped gears
    eng.transmissionType = 'AUTO';
    if (!eng.autoGearMode) eng.autoGearMode = veh.isParked ? 'P' : 'D';
    eng.gearRatios = defaultEng.gearRatios;
    eng.finalDriveRatio = defaultEng.finalDriveRatio;
    eng.tractorRange = undefined;
    eng.clutchPedal = 1.0;
  } else if (veh.type.startsWith('tractor_') && eng.tractorRange === undefined) {
    eng.tractorRange = 1;
  }

  if (eng.clutchPedal === undefined) eng.clutchPedal = 1.0;
  if (eng.engineHealth === undefined) eng.engineHealth = 100;
  if (eng.transmissionHealth === undefined) eng.transmissionHealth = 100;
  if (eng.transmissionType === undefined) {
    eng.transmissionType = CAR_CONFIGS[veh.type]?.transmission || 'AUTO';
  }
  return eng;
}

export function createDefaultFuelSystem(type: CarType = 'sedan', isParkedOnStreet: boolean = false): FuelSystem {
  if (type.startsWith('trailer_') || type === 'trailer_barrel' || type === 'trailer_flatbed_2axle') {
    return {
      fuelType: 'ai95',
      tankLevel: 0,
      tankCapacity: 0,
      tankPunctured: false,
      fuelQuality: 100,
      detonation: false,
      octaneNumber: 0
    };
  }

  const isDiesel = [
    'bus', 'fire_engine', 'fire_ladder', 'truck_box', 'truck_dump', 'truck_tanker', 
    'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'pickup_heavy', 
    'truck_tow', 'truck_armored', 'delivery_truck', 'van_camper',
    'tractor_mtz82', 'tractor_mtz80', 'tractor_mtz80_old', 'truck_semi',
    'paver_asphalt_wheeled', 'roller_heavy_tandem', 'roller_compact_sidewalk', 'roller_pneumatic'
  ].includes(type);
  const isVintage92 = [
    'wagon_classic', 'sedan_classic', 'classic_compact', 'retro_bubble', 
    'van_cargo_old', 'muscle_classic',
    'compact_matiz', 'sedan_logan', 'sedan_nexia', 'liftback_tavria', 'sedan_accent',
    'hatch_samara', 'sedan_samara', 'micro_car',
    'moto_izh_jupiter', 'moto_ural_sidecar', 'moto_jawa350', 'moto_chopper', 'moped_soviet'
  ].includes(type);
  const isBike = [
    'moto_izh_jupiter', 'moto_ural_sidecar', 'moto_jawa350', 'moto_sport', 'moto_chopper', 'moped_soviet'
  ].includes(type);

  let tankLevel = 100;
  if (isParkedOnStreet) {
    tankLevel = Math.round(15 + Math.random() * 70);
  } else if (Math.random() < 0.9) {
    tankLevel = Math.round(35 + Math.random() * 55);
  }

  let tankCapacity = 55;
  if (isDiesel) {
    tankCapacity = type === 'truck_semi' ? 350 : (type.startsWith('tractor_') ? 130 : 120);
  } else if (isBike) {
    tankCapacity = type === 'moped_soviet' ? 8 : (type === 'moto_ural_sidecar' ? 19 : 14);
  } else if (['supercar', 'suv_luxury', 'pickup_heavy', 'offroad_hardcore'].includes(type)) {
    tankCapacity = 80;
  } else if (type === 'compact_matiz') {
    tankCapacity = 35;
  } else if (type === 'liftback_tavria') {
    tankCapacity = 39;
  } else if (type === 'micro_car' || type === 'retro_bubble') {
    tankCapacity = 30;
  } else if (type === 'hatch_samara' || type === 'sedan_samara') {
    tankCapacity = 43;
  } else if (type === 'sedan_accent') {
    tankCapacity = 45;
  } else if (type === 'sedan_logan' || type === 'sedan_nexia' || type === 'sedan_compact' || type === 'hatchback') {
    tankCapacity = 50;
  }

  return {
    fuelType: isDiesel ? 'diesel' : (isVintage92 ? 'ai92' : 'ai95'),
    tankLevel,
    tankCapacity,
    tankPunctured: false,
    fuelQuality: 100,
    detonation: false,
    octaneNumber: isDiesel ? 45 : (isVintage92 ? 92 : 95)
  };
}

export function isRoadMachinery(type?: string): boolean {
  if (!type) return false;
  return (
    type === 'paver_asphalt_wheeled' ||
    type === 'roller_heavy_tandem' ||
    type === 'roller_compact_sidewalk' ||
    type === 'roller_pneumatic'
  );
}

export function getLPGDefaultCapacity(type: string): number {
  if (['truck_semi', 'truck_dump', 'truck_box', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'bus', 'fire_engine', 'fire_ladder'].includes(type) || type.includes('semi')) {
    return 200;
  }
  if (['delivery_truck', 'van_cargo_old', 'van', 'bus_minibus', 'truck_armored', 'truck_tow'].includes(type)) {
    return 120;
  }
  if (type.startsWith('tractor_')) {
    return 100;
  }
  if (['pickup_heavy', 'pickup', 'suv_luxury', 'suv_classic_box', 'offroad_hardcore', 'crossover_compact', 'van_camper', 'ambulance_suv'].includes(type) || type.includes('suv') || type.includes('pickup')) {
    return 85;
  }
  if (['sedan_luxury', 'wagon_allroad', 'classic_black', 'wagon_modern', 'coupe_gt', 'muscle', 'muscle_classic'].includes(type)) {
    return 65;
  }
  if (['sedan', 'sedan_classic', 'wagon_classic', 'sedan_logan', 'sedan_nexia', 'sedan_polo', 'sedan_accent', 'sedan_samara', 'hatch_samara', 'liftback_tavria', 'taxi', 'police'].includes(type)) {
    return 55;
  }
  if (['compact_matiz', 'micro_car', 'retro_bubble', 'sports', 'supercar', 'hatch_hot', 'hatchback'].includes(type)) {
    return 45;
  }
  return 55;
}

export function createDefaultFluidTank(type: CarType): FluidStorageTank | undefined {
  if (type === 'truck_tanker') {
    return {
      capacity: 4800,
      currentVolume: 4800,
      currentAmount: 4800,
      liquidType: 'fuel_ai95',
      isHermetic: true,
      leakProbabilityPerSec: 0,
      dripRatePerSec: 0,
      isPunctured: false,
      punctureRatePerSec: 25.0,
      drainValveOpen: false,
      hasWaterHose: false,
      isWaterHoseDeployed: false
    };
  }
  if (type === 'truck_water') {
    return {
      capacity: 3000,
      currentVolume: 3000,
      currentAmount: 3000,
      liquidType: 'water',
      isHermetic: false, // Old municipal tanker with worn rubber seals
      leakProbabilityPerSec: 0.20,
      dripRatePerSec: 0.10,
      isPunctured: false,
      punctureRatePerSec: 16.0,
      drainValveOpen: false,
      hasWaterHose: true,
      isWaterHoseDeployed: false
    };
  }
  if (type === 'trailer_barrel') {
    return {
      capacity: 800,
      currentVolume: 800,
      currentAmount: 800,
      liquidType: 'water',
      isHermetic: false, // Vintage rural barrel trailer with leaky petcock
      leakProbabilityPerSec: 0.25,
      dripRatePerSec: 0.08,
      isPunctured: false,
      punctureRatePerSec: 12.0,
      drainValveOpen: false,
      hasWaterHose: true,
      isWaterHoseDeployed: false
    };
  }
  if (type === 'trailer_vacuum') {
    return {
      capacity: 800,
      currentVolume: 800,
      currentAmount: 800,
      liquidType: 'water',
      isHermetic: true, // Vacuum barrels are hermetically sealed (airtight) to hold vacuum!
      leakProbabilityPerSec: 0,
      dripRatePerSec: 0,
      isPunctured: false,
      punctureRatePerSec: 12.0,
      drainValveOpen: false,
      hasWaterHose: true,
      isWaterHoseDeployed: false
    };
  }
  return undefined;
}

export function ensureVehicleFluidTank(car: Vehicle): FluidStorageTank | undefined {
  if (!car.fluidTank) {
    car.fluidTank = createDefaultFluidTank(car.type);
  } else {
    // Keep aliases synced to prevent NaN
    if (car.fluidTank.currentAmount === undefined) {
      car.fluidTank.currentAmount = car.fluidTank.currentVolume;
    }
    if (car.fluidTank.currentVolume === undefined) {
      car.fluidTank.currentVolume = car.fluidTank.currentAmount ?? 0;
    }
    if (car.type === 'truck_water' || car.type === 'trailer_barrel' || car.type === 'trailer_vacuum') {
      if (car.fluidTank.hasWaterHose === undefined) {
        car.fluidTank.hasWaterHose = true;
      }
    }
  }
  return car.fluidTank;
}

/**
 * Calculates world coordinates of the water hose connection point on a vehicle.
 */
export function getVehicleWaterHoseAnchor(car: Vehicle): { x: number; y: number } | null {
  if (!car.fluidTank || !car.fluidTank.hasWaterHose) return null;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  if (car.type === 'truck_water') {
    // Space between cabin and tank on the right equipment platform
    // In truck_water, cabin is forward, tank starts at x ~ 2
    const localX = halfL * 0.08;
    const localY = halfW * 0.76;
    return {
      x: car.x + cosA * localX - sinA * localY,
      y: car.y + sinA * localX + cosA * localY
    };
  }

  if (car.type === 'trailer_barrel') {
    // End of small brass discharge tap
    const localX = -halfL * 0.88 - 4.2;
    const localY = 0;
    return {
      x: car.x + cosA * localX,
      y: car.y + sinA * localX
    };
  }

  if (car.type === 'trailer_vacuum') {
    // End of brass receiving snout nozzle (ANM-53)
    const localX = -halfL * 0.88 - 6.3;
    const localY = 0;
    return {
      x: car.x + cosA * localX,
      y: car.y + sinA * localX
    };
  }

  return null;
}

export function liquidTypeToStainType(liquid: StoredLiquidType): FluidStainType {
  switch (liquid) {
    case 'water':
      return 'water';
    case 'oil':
      return 'oil';
    case 'coolant':
      return 'coolant';
    case 'fuel_ai95':
    case 'fuel_ai92':
    case 'fuel_ai98':
    case 'fuel_ai100':
    case 'diesel':
    default:
      return 'fuel';
  }
}

export function getLiquidNameRu(liquid: StoredLiquidType): string {
  switch (liquid) {
    case 'water': return 'Вода';
    case 'fuel_ai95': return 'Бензин АИ-95';
    case 'fuel_ai92': return 'Бензин АИ-92';
    case 'fuel_ai98': return 'Бензин АИ-98';
    case 'fuel_ai100': return 'Бензин АИ-100';
    case 'diesel': return 'Дизельное топливо';
    case 'oil': return 'Моторное масло';
    case 'coolant': return 'Антифриз (ОЖ)';
    default: return 'Жидкость';
  }
}

export function getLiquidColor(liquid: StoredLiquidType): string {
  switch (liquid) {
    case 'water': return '#38bdf8';
    case 'fuel_ai95': return '#f59e0b';
    case 'fuel_ai92': return '#fbbf24';
    case 'fuel_ai98': return '#ef4444';
    case 'fuel_ai100': return '#dc2626';
    case 'diesel': return '#d97706';
    case 'oil': return '#334155';
    case 'coolant': return '#22c55e';
    default: return '#94a3b8';
  }
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
  // Indices:
  // 20: Hood center
  // 21: Windshield center (base of front glass)
  // 22: Roof center
  // 23: Roof front-left (A-pillar left top)
  // 24: Roof front-right (A-pillar right top)
  // 25: Roof rear-left (C-pillar left top)
  // 26: Roof rear-right (C-pillar right top)
  // 27: Rear window / trunk deck center
  const roofHalfL = halfL * 0.28;
  const roofHalfW = halfW * 0.42;
  const cabinCenterX = -halfL * 0.04;

  const internalNodes = [
    { localX: halfL * 0.42, localY: 0, structuralType: 'hood' },                  // 20: Hood center
    { localX: cabinCenterX + roofHalfL * 1.5, localY: 0, structuralType: 'windshield' }, // 21: Windshield base/cowl center
    { localX: cabinCenterX, localY: 0, structuralType: 'roof' },                  // 22: Roof center
    { localX: cabinCenterX + roofHalfL, localY: -roofHalfW, structuralType: 'roof' }, // 23: Roof front-left corner
    { localX: cabinCenterX + roofHalfL, localY: roofHalfW, structuralType: 'roof' },  // 24: Roof front-right corner
    { localX: cabinCenterX - roofHalfL, localY: -roofHalfW, structuralType: 'roof' }, // 25: Roof rear-left corner
    { localX: cabinCenterX - roofHalfL, localY: roofHalfW, structuralType: 'roof' },  // 26: Roof rear-right corner
    { localX: cabinCenterX - roofHalfL * 1.6, localY: 0, structuralType: 'trunk' }    // 27: Rear glass base / trunk deck
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
          fresh.deformedVertices[i].targetOffsetX = srcV.targetOffsetX !== undefined ? srcV.targetOffsetX : (srcV.offsetX || 0);
          fresh.deformedVertices[i].targetOffsetY = srcV.targetOffsetY !== undefined ? srcV.targetOffsetY : (srcV.offsetY || 0);
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

export function getVehicleDriveType(type: string): 'FWD' | 'RWD' | 'AWD' {
  const cfg = CAR_CONFIGS[type];
  if (cfg && cfg.driveType) return cfg.driveType;

  // Defaults based on type mapping
  if (type.startsWith('moto_') || type === 'moped_soviet') {
    return 'RWD';
  }
  if (type.startsWith('tractor_')) {
    return type === 'tractor_mtz82' ? 'AWD' : 'RWD';
  }
  if (type.startsWith('trailer_')) {
    return 'RWD'; // trailers are passive anyway
  }
  
  const rwdTypes = [
    'sports', 'supercar', 'sedan_luxury', 'coupe_gt', 'muscle_classic', 
    'sedan_classic', 'classic_compact', 'retro_bubble', 'wagon_classic', 
    'ambulance', 'bus', 'fire_engine', 'fire_ladder', 'truck_tow', 'van_camper', 
    'truck_box', 'truck_dump', 'truck_semi', 'truck_tanker', 'truck_water', 
    'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck'
  ];
  if (rwdTypes.includes(type)) return 'RWD';

  const awdTypes = [
    'pickup', 'pickup_heavy', 'suv', 'suv_luxury', 'offroad_hardcore', 
    'suv_classic_box', 'van_cargo_old', 'truck_armored',
    'paver_asphalt_wheeled', 'roller_heavy_tandem', 'roller_compact_sidewalk', 'roller_pneumatic'
  ];
  if (awdTypes.includes(type)) return 'AWD';

  return 'FWD'; // default for sedan, hatchback, taxi, police, compacts, micro, delivery
}

export function getVehicleAxleGeometry(car: { type: string; length?: number }) {
  const cfg = CAR_CONFIGS[car.type] || CAR_CONFIGS.sedan;
  const length = car.length || cfg.length || 42;
  const halfL = length / 2;

  const isTractor = car.type === 'tractor_mtz82' || car.type === 'tractor_mtz80' || car.type === 'tractor_mtz80_old';
  const isThreeAxle = car.type === 'truck_dump' || car.type === 'truck_semi' || car.type === 'truck_tanker' || car.type === 'truck_flatbed' || car.type === 'truck_covered' || car.type === 'cement_mixer' || car.type === 'garbage_truck';
  const isDually = car.type === 'pickup_heavy';
  const isMoto = car.type.startsWith('moto_') || car.type === 'moped_soviet';
  const isHeavyTruck = isThreeAxle || car.type === 'truck_box' || car.type === 'truck_water' || car.type === 'truck_tow' || car.type === 'truck_armored' || car.type === 'delivery_truck' || car.type === 'fire_engine' || car.type === 'fire_ladder' || car.type === 'bus';

  let rearAxleOffsetRatio = 0.65;
  let frontAxleOffsetRatio = 0.65;

  if (isTractor) {
    rearAxleOffsetRatio = 0.48;
    frontAxleOffsetRatio = 0.70;
  } else if (isThreeAxle) {
    rearAxleOffsetRatio = 0.55; // center of tandem rear bogies
    frontAxleOffsetRatio = 0.72;
  } else if (isDually) {
    rearAxleOffsetRatio = 0.62;
    frontAxleOffsetRatio = 0.65;
  } else if (isMoto) {
    rearAxleOffsetRatio = 0.68;
    frontAxleOffsetRatio = 0.70;
  } else if (isHeavyTruck) {
    rearAxleOffsetRatio = 0.65;
    frontAxleOffsetRatio = 0.72;
  }

  const rearAxleDist = halfL * rearAxleOffsetRatio;
  const frontAxleDist = halfL * frontAxleOffsetRatio;
  const wheelBase = rearAxleDist + frontAxleDist;

  return { rearAxleDist, frontAxleDist, wheelBase };
}

export const CAR_CONFIGS: Record<string, CarConfig> = {
  sedan: { type: 'sedan', width: 20, length: 42, wheelBase: 26, mass: 1400, maxSpeed: 180, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 240, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Седан', transmission: 'AUTO' },
  hatchback: { type: 'hatchback', width: 19, length: 38, wheelBase: 23, mass: 1150, maxSpeed: 175, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 250, friction: 0.988, turnSpeed: 4.5, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.988, driftGrip: 0.40, name: 'Хэтчбек', transmission: 'MANUAL' },
  pickup: { type: 'pickup', width: 22, length: 48, wheelBase: 30, mass: 2200, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 24, brakingForce: 220, friction: 0.985, turnSpeed: 3.6, maxSteerAngle: 0.64, minSteerAngle: 0.12, grip: 0.975, driftGrip: 0.32, name: 'Пикап 4x4', transmission: 'MANUAL' },
  sports: { type: 'sports', width: 21, length: 44, wheelBase: 27, mass: 1320, maxSpeed: 280, reverseMaxSpeed: 55, acceleration: 55, brakingForce: 290, friction: 0.990, turnSpeed: 4.6, maxSteerAngle: 0.65, minSteerAngle: 0.13, grip: 0.990, driftGrip: 0.44, name: 'Спорткар', transmission: 'AUTO' },
  suv: { type: 'suv', width: 21, length: 42, wheelBase: 26, mass: 1450, maxSpeed: 170, reverseMaxSpeed: 45, acceleration: 26, brakingForce: 230, friction: 0.986, turnSpeed: 3.8, maxSteerAngle: 0.65, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.36, name: 'Кроссовер SUV', transmission: 'AUTO' },
  taxi: { type: 'taxi', width: 21, length: 46, wheelBase: 28, mass: 1450, maxSpeed: 175, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 245, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Такси', transmission: 'AUTO' },
  police: { type: 'police', width: 21, length: 46, wheelBase: 28, mass: 1550, maxSpeed: 220, reverseMaxSpeed: 55, acceleration: 45, brakingForce: 275, friction: 0.989, turnSpeed: 4.4, maxSteerAngle: 0.68, minSteerAngle: 0.13, grip: 0.988, driftGrip: 0.40, name: 'Полиция', transmission: 'AUTO' },
  ambulance: { type: 'ambulance', width: 24, length: 54, wheelBase: 32, mass: 2800, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 210, friction: 0.984, turnSpeed: 3.6, maxSteerAngle: 0.64, minSteerAngle: 0.11, grip: 0.970, driftGrip: 0.30, name: 'Скорая Помощь', transmission: 'AUTO' },
  bus: { type: 'bus', width: 26, length: 85, wheelBase: 52, mass: 9500, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 12, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.950, driftGrip: 0.22, name: 'Городской автобус', transmission: 'MANUAL' },
  supercar: { type: 'supercar', width: 22, length: 45, wheelBase: 27, mass: 1250, maxSpeed: 320, reverseMaxSpeed: 60, acceleration: 70, brakingForce: 330, friction: 0.992, turnSpeed: 4.8, maxSteerAngle: 0.65, minSteerAngle: 0.12, grip: 0.994, driftGrip: 0.48, name: 'Гиперкар', transmission: 'AUTO' },
  wagon_classic: { type: 'wagon_classic', width: 20, length: 44, wheelBase: 26, mass: 1350, maxSpeed: 155, reverseMaxSpeed: 40, acceleration: 24, brakingForce: 210, friction: 0.986, turnSpeed: 3.8, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.35, name: 'Классический универсал', transmission: 'MANUAL' },
  wagon_modern: { type: 'wagon_modern', width: 20, length: 45, wheelBase: 27, mass: 1320, maxSpeed: 185, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 250, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.986, driftGrip: 0.38, name: 'Семейный универсал', transmission: 'AUTO' },
  crossover_compact: { type: 'crossover_compact', width: 21, length: 43, wheelBase: 26, mass: 1420, maxSpeed: 180, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 240, friction: 0.987, turnSpeed: 4.0, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.984, driftGrip: 0.36, name: 'Компактный кроссовер', transmission: 'AUTO' },
  sedan_classic: { type: 'sedan_classic', width: 19, length: 42, wheelBase: 25, mass: 1200, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 200, friction: 0.986, turnSpeed: 3.9, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.978, driftGrip: 0.34, name: 'Классический седан', transmission: 'MANUAL' },
  sedan_compact: { type: 'sedan_compact', width: 18, length: 39, wheelBase: 24, mass: 1050, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 230, friction: 0.988, turnSpeed: 4.3, maxSteerAngle: 0.68, minSteerAngle: 0.15, grip: 0.985, driftGrip: 0.39, name: 'Компактный седан', transmission: 'MANUAL' },
  compact_matiz: { type: 'compact_matiz', width: 17, length: 33, wheelBase: 21, mass: 770, maxSpeed: 145, reverseMaxSpeed: 35, acceleration: 26, brakingForce: 220, friction: 0.988, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.984, driftGrip: 0.38, name: 'Субкомпактный хэтчбек (Matiz)', transmission: 'MANUAL' },
  sedan_logan: { type: 'sedan_logan', width: 19, length: 42, wheelBase: 26, mass: 980, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 230, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Бюджетный седан (Logan)', transmission: 'MANUAL' },
  sedan_nexia: { type: 'sedan_nexia', width: 18, length: 44, wheelBase: 25, mass: 1020, maxSpeed: 170, reverseMaxSpeed: 45, acceleration: 29, brakingForce: 230, friction: 0.988, turnSpeed: 4.1, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Седан 90-х (Nexia)', transmission: 'MANUAL' },
  liftback_tavria: { type: 'liftback_tavria', width: 17, length: 35, wheelBase: 22, mass: 710, maxSpeed: 140, reverseMaxSpeed: 36, acceleration: 25, brakingForce: 200, friction: 0.987, turnSpeed: 4.6, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.980, driftGrip: 0.36, name: 'Компактный лифтбек (Таврия)', transmission: 'MANUAL' },
  sedan_accent: { type: 'sedan_accent', width: 18, length: 41, wheelBase: 24, mass: 1030, maxSpeed: 180, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 240, friction: 0.988, turnSpeed: 4.3, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.986, driftGrip: 0.39, name: 'Городской седан (Accent)', transmission: 'MANUAL' },
  sedan_polo: { type: 'sedan_polo', width: 19, length: 43, wheelBase: 25, mass: 1160, maxSpeed: 190, reverseMaxSpeed: 48, acceleration: 33, brakingForce: 250, friction: 0.988, turnSpeed: 4.3, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.987, driftGrip: 0.39, name: 'Седан B+ (Polo Sedan)', transmission: 'AUTO' },
  hatch_samara: { type: 'hatch_samara', width: 18, length: 39, wheelBase: 24, mass: 945, maxSpeed: 160, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 220, friction: 0.988, turnSpeed: 4.4, maxSteerAngle: 0.69, minSteerAngle: 0.15, grip: 0.983, driftGrip: 0.38, name: 'Хэтчбек «Самара» (ВАЗ-2109)', transmission: 'MANUAL' },
  sedan_samara: { type: 'sedan_samara', width: 18, length: 42, wheelBase: 25, mass: 970, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 220, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.984, driftGrip: 0.38, name: 'Седан «Самара» (ВАЗ-21099)', transmission: 'MANUAL' },
  sedan_luxury: { type: 'sedan_luxury', width: 21, length: 46, wheelBase: 28, mass: 1650, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 45, brakingForce: 270, friction: 0.989, turnSpeed: 4.1, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.988, driftGrip: 0.40, name: 'Бизнес-седан', transmission: 'AUTO' },
  suv_luxury: { type: 'suv_luxury', width: 23, length: 50, wheelBase: 31, mass: 2400, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 48, brakingForce: 280, friction: 0.989, turnSpeed: 4.0, maxSteerAngle: 0.64, minSteerAngle: 0.12, grip: 0.988, driftGrip: 0.41, name: 'Люкс Внедорожник', transmission: 'AUTO' },
  pickup_heavy: { type: 'pickup_heavy', width: 24, length: 54, wheelBase: 34, mass: 3100, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 32, brakingForce: 240, friction: 0.984, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.10, grip: 0.972, driftGrip: 0.30, name: 'Тяжелый пикап 4x4', transmission: 'AUTO' },
  hatch_hot: { type: 'hatch_hot', width: 19, length: 39, wheelBase: 24, mass: 1220, maxSpeed: 240, reverseMaxSpeed: 50, acceleration: 52, brakingForce: 290, friction: 0.990, turnSpeed: 4.7, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.990, driftGrip: 0.43, name: 'Хот-хэтч', transmission: 'MANUAL' },
  micro_car: { type: 'micro_car', width: 16, length: 30, wheelBase: 19, mass: 800, maxSpeed: 135, reverseMaxSpeed: 35, acceleration: 26, brakingForce: 220, friction: 0.988, turnSpeed: 5.2, maxSteerAngle: 0.74, minSteerAngle: 0.18, grip: 0.982, driftGrip: 0.36, name: 'Микрокар', transmission: 'MANUAL' },
  van: { type: 'van', width: 22, length: 50, wheelBase: 30, mass: 2100, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 220, friction: 0.985, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.11, grip: 0.975, driftGrip: 0.32, name: 'Бизнес-фургон', transmission: 'AUTO' },
  coupe_gt: { type: 'coupe_gt', width: 21, length: 46, wheelBase: 28, mass: 1650, maxSpeed: 270, reverseMaxSpeed: 55, acceleration: 58, brakingForce: 300, friction: 0.991, turnSpeed: 4.5, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.991, driftGrip: 0.45, name: 'Гран Туризмо Купе', transmission: 'AUTO' },
  fire_engine: { type: 'fire_engine', width: 27, length: 88, wheelBase: 50, mass: 11000, maxSpeed: 130, reverseMaxSpeed: 35, acceleration: 22, brakingForce: 220, friction: 0.982, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.09, grip: 0.965, driftGrip: 0.25, name: 'Пожарный автомобиль', transmission: 'AUTO' },
  fire_ladder: { type: 'fire_ladder', width: 28, length: 98, wheelBase: 58, mass: 13500, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 18, brakingForce: 210, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.22, name: 'Пожарная автолестница', transmission: 'AUTO' },
  truck_tow: { type: 'truck_tow', width: 24, length: 62, wheelBase: 38, mass: 4200, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 20, brakingForce: 210, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.10, grip: 0.968, driftGrip: 0.28, name: 'Эвакуатор', transmission: 'MANUAL' },
  truck_armored: { type: 'truck_armored', width: 25, length: 58, wheelBase: 36, mass: 5500, maxSpeed: 140, reverseMaxSpeed: 35, acceleration: 20, brakingForce: 220, friction: 0.984, turnSpeed: 3.4, maxSteerAngle: 0.62, minSteerAngle: 0.09, grip: 0.970, driftGrip: 0.28, name: 'Инкассаторский броневик', transmission: 'AUTO' },
  delivery_truck: { type: 'delivery_truck', width: 23, length: 56, wheelBase: 35, mass: 3200, maxSpeed: 145, reverseMaxSpeed: 38, acceleration: 22, brakingForce: 220, friction: 0.984, turnSpeed: 3.8, maxSteerAngle: 0.64, minSteerAngle: 0.10, grip: 0.970, driftGrip: 0.30, name: 'Экспедиторский степвэн', transmission: 'MANUAL' },
  van_camper: { type: 'van_camper', width: 22, length: 52, wheelBase: 32, mass: 2600, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 18, brakingForce: 200, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.10, grip: 0.968, driftGrip: 0.29, name: 'Автодом Кемпер', transmission: 'MANUAL' },
  classic_compact: { type: 'classic_compact', width: 18, length: 36, wheelBase: 22, mass: 900, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 22, brakingForce: 190, friction: 0.986, turnSpeed: 4.4, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.975, driftGrip: 0.33, name: 'Винтажный седан (ВАЗ-2101)', transmission: 'MANUAL' },
  retro_bubble: { type: 'retro_bubble', width: 17, length: 32, wheelBase: 20, mass: 750, maxSpeed: 120, reverseMaxSpeed: 32, acceleration: 20, brakingForce: 180, friction: 0.986, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.972, driftGrip: 0.32, name: 'Ретро микрокар («Горбатый»)', transmission: 'MANUAL' },
  offroad_hardcore: { type: 'offroad_hardcore', width: 22, length: 44, wheelBase: 26, mass: 1950, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 28, brakingForce: 230, friction: 0.984, turnSpeed: 3.8, maxSteerAngle: 0.65, minSteerAngle: 0.12, grip: 0.982, driftGrip: 0.35, name: 'Экспедиционный 4x4 «Тайга»', transmission: 'MANUAL' },
  suv_classic_box: { type: 'suv_classic_box', width: 21, length: 45, wheelBase: 27, mass: 1800, maxSpeed: 160, reverseMaxSpeed: 42, acceleration: 26, brakingForce: 220, friction: 0.985, turnSpeed: 3.8, maxSteerAngle: 0.65, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.34, name: 'Брутальный внедорожник 4x4', transmission: 'MANUAL' },
  muscle_classic: { type: 'muscle_classic', width: 21, length: 48, wheelBase: 29, mass: 1650, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 50, brakingForce: 240, friction: 0.988, turnSpeed: 3.9, maxSteerAngle: 0.64, minSteerAngle: 0.12, grip: 0.978, driftGrip: 0.42, name: 'Маслкар 70-х', transmission: 'MANUAL' },
  van_cargo_old: { type: 'van_cargo_old', width: 21, length: 46, wheelBase: 28, mass: 1700, maxSpeed: 135, reverseMaxSpeed: 35, acceleration: 18, brakingForce: 190, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.11, grip: 0.968, driftGrip: 0.30, name: 'Вездеходный фургон («Буханка»)', transmission: 'MANUAL' },
  truck_box: { type: 'truck_box', width: 25, length: 68, wheelBase: 42, mass: 6200, maxSpeed: 125, reverseMaxSpeed: 32, acceleration: 15, brakingForce: 185, friction: 0.981, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.09, grip: 0.958, driftGrip: 0.24, name: 'Фургон-Будка', transmission: 'MANUAL' },
  truck_dump: { type: 'truck_dump', width: 26, length: 72, wheelBase: 44, mass: 8500, maxSpeed: 115, reverseMaxSpeed: 30, acceleration: 14, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.23, name: 'Самосвал', transmission: 'MANUAL' },
  truck_semi: { type: 'truck_semi', width: 26, length: 64, wheelBase: 38, mass: 7500, maxSpeed: 125, reverseMaxSpeed: 30, acceleration: 18, brakingForce: 210, friction: 0.980, turnSpeed: 3.4, maxSteerAngle: 0.62, minSteerAngle: 0.08, grip: 0.960, driftGrip: 0.25, name: 'Седельный тягач КАМАЗ-5410', transmission: 'MANUAL', hitchOffset: -12, color: '#d94e16' },
  trailer_semi: { type: 'trailer_semi', width: 26, length: 120, wheelBase: 80, mass: 6500, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 300, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.975, driftGrip: 0.30, name: 'Полуприцеп бортовой НЕФАЗ', transmission: 'MANUAL', couplerOffset: 50, color: '#1e3a8a' },
  trailer_semi_box: { type: 'trailer_semi_box', width: 26, length: 124, wheelBase: 82, mass: 7200, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 320, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.975, driftGrip: 0.30, name: 'Полуприцеп-рефрижератор «Совтрансавто»', transmission: 'MANUAL', couplerOffset: 50, color: '#f8fafc' },
  trailer_semi_tanker: { type: 'trailer_semi_tanker', width: 26, length: 120, wheelBase: 80, mass: 7800, massEmpty: 7800, maxSpeed: 115, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 340, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.970, driftGrip: 0.28, name: 'Полуприцеп-цистерна ГСМ НЕФАЗ', transmission: 'MANUAL', couplerOffset: 50, color: '#ea580c' },
  trailer_semi_container: { type: 'trailer_semi_container', width: 26, length: 126, wheelBase: 82, mass: 8500, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 330, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.975, driftGrip: 0.30, name: 'Контейнеровоз (40ft MAERSK)', transmission: 'MANUAL', couplerOffset: 50, color: '#991b1b' },
  trailer_semi_lowboy: { type: 'trailer_semi_lowboy', width: 28, length: 130, wheelBase: 86, mass: 8900, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 350, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.970, driftGrip: 0.28, name: 'Низкорамный трал-тяжеловоз ЧМЗАП', transmission: 'MANUAL', couplerOffset: 54, color: '#d97706' },
  truck_tanker: { type: 'truck_tanker', width: 26, length: 76, wheelBase: 46, mass: 9200, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 12, brakingForce: 175, friction: 0.979, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.08, grip: 0.950, driftGrip: 0.22, name: 'Бензовоз', transmission: 'MANUAL' },
  truck_water: { type: 'truck_water', width: 25, length: 70, wheelBase: 43, mass: 8000, maxSpeed: 118, reverseMaxSpeed: 30, acceleration: 13, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.23, name: 'Водовоз', transmission: 'MANUAL' },
  truck_flatbed: { type: 'truck_flatbed', width: 25, length: 74, wheelBase: 45, mass: 7000, maxSpeed: 120, reverseMaxSpeed: 32, acceleration: 14, brakingForce: 185, friction: 0.981, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.958, driftGrip: 0.24, name: 'Бортовой грузовик (ГАЗ-53)', transmission: 'MANUAL', color: '#0284c7' },
  truck_covered: { type: 'truck_covered', width: 25, length: 74, wheelBase: 45, mass: 7400, maxSpeed: 118, reverseMaxSpeed: 30, acceleration: 13, brakingForce: 180, friction: 0.981, turnSpeed: 3.1, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.956, driftGrip: 0.23, name: 'Крытый грузовик (ГАЗ-53, шифер)', transmission: 'MANUAL', color: '#0284c7' },
  cement_mixer: { type: 'cement_mixer', width: 26, length: 72, wheelBase: 44, mass: 9800, maxSpeed: 105, reverseMaxSpeed: 28, acceleration: 11, brakingForce: 170, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.07, grip: 0.948, driftGrip: 0.21, name: 'Бетономешалка', transmission: 'MANUAL' },
  garbage_truck: { type: 'garbage_truck', width: 26, length: 78, wheelBase: 46, mass: 10500, maxSpeed: 100, reverseMaxSpeed: 28, acceleration: 10, brakingForce: 175, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.07, grip: 0.945, driftGrip: 0.20, name: 'Мусоровоз', transmission: 'MANUAL' },
  // TRACTORS
  tractor_mtz82: { type: 'tractor_mtz82', width: 27, length: 54, wheelBase: 29, mass: 4000, maxSpeed: 70, reverseMaxSpeed: 25, acceleration: 42, brakingForce: 250, friction: 0.982, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.25, grip: 0.995, driftGrip: 0.45, name: 'МТЗ-82.1 «Беларус» (4x4)', transmission: 'MANUAL' },
  tractor_mtz80: { type: 'tractor_mtz80', width: 26, length: 52, wheelBase: 28, mass: 3800, maxSpeed: 70, reverseMaxSpeed: 25, acceleration: 38, brakingForce: 240, friction: 0.982, turnSpeed: 5.0, maxSteerAngle: 0.72, minSteerAngle: 0.25, grip: 0.988, driftGrip: 0.40, name: 'МТЗ-80 «Беларус» (4x2)', transmission: 'MANUAL' },
  tractor_mtz80_old: { type: 'tractor_mtz80_old', width: 25, length: 50, wheelBase: 27, mass: 3700, maxSpeed: 64, reverseMaxSpeed: 22, acceleration: 34, brakingForce: 220, friction: 0.980, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.25, grip: 0.980, driftGrip: 0.38, name: 'МТЗ-80 «Колхозный ветеран»', transmission: 'MANUAL' },
  // MOTORCYCLES
  moto_izh_jupiter: { type: 'moto_izh_jupiter', width: 10, length: 24, wheelBase: 15, mass: 175, maxSpeed: 165, reverseMaxSpeed: 20, acceleration: 50, brakingForce: 260, friction: 0.990, turnSpeed: 6.2, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.985, driftGrip: 0.40, name: 'Иж Юпитер-5', transmission: 'MANUAL' },
  moto_ural_sidecar: { type: 'moto_ural_sidecar', width: 19, length: 26, wheelBase: 16, mass: 350, maxSpeed: 145, reverseMaxSpeed: 25, acceleration: 42, brakingForce: 240, friction: 0.988, turnSpeed: 4.8, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.978, driftGrip: 0.36, name: 'Урал М-67 с коляской', transmission: 'MANUAL' },
  moto_jawa350: { type: 'moto_jawa350', width: 10, length: 24, wheelBase: 15, mass: 160, maxSpeed: 175, reverseMaxSpeed: 20, acceleration: 55, brakingForce: 270, friction: 0.990, turnSpeed: 6.4, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.988, driftGrip: 0.42, name: 'Ява 350 (Jawa 638)', transmission: 'MANUAL' },
  moto_sport: { type: 'moto_sport', width: 10, length: 23, wheelBase: 14, mass: 195, maxSpeed: 310, reverseMaxSpeed: 20, acceleration: 90, brakingForce: 350, friction: 0.994, turnSpeed: 7.2, maxSteerAngle: 0.65, minSteerAngle: 0.12, grip: 0.996, driftGrip: 0.50, name: 'Спортбайк 1000cc', transmission: 'MANUAL' },
  moto_chopper: { type: 'moto_chopper', width: 12, length: 28, wheelBase: 19, mass: 310, maxSpeed: 190, reverseMaxSpeed: 20, acceleration: 52, brakingForce: 260, friction: 0.990, turnSpeed: 5.0, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.982, driftGrip: 0.42, name: 'Чоппер V-Twin', transmission: 'MANUAL' },
  moped_soviet: { type: 'moped_soviet', width: 8, length: 20, wheelBase: 13, mass: 55, maxSpeed: 95, reverseMaxSpeed: 15, acceleration: 24, brakingForce: 190, friction: 0.988, turnSpeed: 6.8, maxSteerAngle: 0.75, minSteerAngle: 0.20, grip: 0.975, driftGrip: 0.35, name: 'Мопед «Карпаты»', transmission: 'MANUAL' },
  trailer_barrel: { type: 'trailer_barrel', width: 22, length: 38, wheelBase: 16, mass: 1400, maxSpeed: 110, reverseMaxSpeed: 35, acceleration: 0, brakingForce: 140, friction: 0.986, turnSpeed: 3.5, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.982, driftGrip: 0.36, name: 'Тракторная бочка-цистерна', transmission: 'MANUAL' },
  trailer_vacuum: { type: 'trailer_vacuum', width: 22, length: 45, wheelBase: 18, mass: 1480, maxSpeed: 110, reverseMaxSpeed: 35, acceleration: 0, brakingForce: 140, friction: 0.986, turnSpeed: 3.5, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.982, driftGrip: 0.36, name: 'Тракторная вакуумная бочка', transmission: 'MANUAL' },
  trailer_flatbed_2axle: { type: 'trailer_flatbed_2axle', width: 26, length: 68, wheelBase: 38, mass: 2400, maxSpeed: 110, reverseMaxSpeed: 35, acceleration: 0, brakingForce: 200, friction: 0.985, turnSpeed: 3.5, maxSteerAngle: 0.65, minSteerAngle: 0.1, grip: 0.980, driftGrip: 0.35, name: 'Прицеп 2-ПТС-4 (2-осный бортовой)', transmission: 'MANUAL' },
  // ROAD CONSTRUCTION MACHINERY (Hydrostatic Transmission: Forward / Neutral / Reverse, no clutch)
  paver_asphalt_wheeled: { type: 'paver_asphalt_wheeled', width: 32, length: 64, wheelBase: 36, mass: 18500, maxSpeed: 16, reverseMaxSpeed: 10, acceleration: 12, brakingForce: 360, friction: 0.985, turnSpeed: 2.0, maxSteerAngle: 0.65, minSteerAngle: 0.25, grip: 0.999, driftGrip: 0.995, name: 'Асфальтоукладчик колесный (ГСТ)', transmission: 'AUTO' },
  roller_heavy_tandem: { type: 'roller_heavy_tandem', width: 28, length: 56, wheelBase: 34, mass: 12500, maxSpeed: 12, reverseMaxSpeed: 12, acceleration: 10, brakingForce: 380, friction: 0.988, turnSpeed: 1.8, maxSteerAngle: 0.70, minSteerAngle: 0.30, grip: 0.999, driftGrip: 0.995, name: 'Дорожный каток (ломаная рама, ГСТ)', transmission: 'AUTO' },
  roller_compact_sidewalk: { type: 'roller_compact_sidewalk', width: 18, length: 32, wheelBase: 18, mass: 2200, maxSpeed: 10, reverseMaxSpeed: 10, acceleration: 14, brakingForce: 320, friction: 0.990, turnSpeed: 2.4, maxSteerAngle: 0.75, minSteerAngle: 0.35, grip: 0.999, driftGrip: 0.995, name: 'Тротуарный каток (ломаная рама, ГСТ)', transmission: 'AUTO' },
  roller_pneumatic: { type: 'roller_pneumatic', width: 28, length: 58, wheelBase: 36, mass: 14000, maxSpeed: 16, reverseMaxSpeed: 16, acceleration: 11, brakingForce: 350, friction: 0.988, turnSpeed: 1.9, maxSteerAngle: 0.65, minSteerAngle: 0.28, grip: 0.999, driftGrip: 0.995, name: 'Пневмоколесный каток (ломаная рама, ГСТ)', transmission: 'AUTO' }
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

export function canVehicleHaveHitch(car: Vehicle | { type: string }): boolean {
  if (!car || !car.type) return false;
  const t = car.type;
  return t.startsWith('tractor_') || 
         t.startsWith('truck_') || 
         t === 'pickup' || 
         t === 'pickup_heavy' || 
         t === 'cement_mixer' || 
         t === 'garbage_truck' || 
         t === 'delivery_truck' ||
         t === 'trailer_flatbed_2axle';
}

export function getVehicleFuelCapPosition(veh: Vehicle): { x: number; y: number; localF: number; localR: number } {
  if (isTrailerVehicle(veh)) {
    return { x: -999999, y: -999999, localF: -999999, localR: -999999 };
  }

  const type = veh.type || 'sedan';
  const cosA = Math.cos(veh.angle);
  const sinA = Math.sin(veh.angle);
  const L = veh.length;
  const W = veh.width;

  let localF = -0.35 * L;
  let localR = 0.45 * W; // Default: passenger car rear-right quarter panel

  const isTruck = type.startsWith('truck_') || type === 'cement_mixer' || type === 'garbage_truck' || type === 'pickup_heavy' || type === 'delivery_truck';
  const isTractor = type.startsWith('tractor_');
  const isBike = type.startsWith('moto_') || type.startsWith('moped_');
  const isBus = type === 'bus' || type === 'bus_minibus';

  if (isTruck) {
    // Heavy trucks & pickups: Fuel cap is on the side fuel tank right behind cab
    localF = 0.05 * L;
    localR = 0.48 * W;
  } else if (isTractor) {
    // Tractors (MTZ style): Fuel tank & cap are behind/under rear window on rear fender casing
    localF = -0.42 * L;
    localR = 0.28 * W;
  } else if (isBike) {
    // Motorcycles: Center top of teardrop fuel tank in front of seat
    localF = 0.08 * L;
    localR = 0;
  } else if (isBus) {
    // Buses: Right side panel filler hatch
    localF = -0.15 * L;
    localR = 0.48 * W;
  }

  const x = veh.x + cosA * localF - sinA * localR;
  const y = veh.y + sinA * localF + cosA * localR;

  return { x, y, localF, localR };
}

export function hasRoadTrainLights(car: Vehicle | CarType | string | null | undefined): boolean {
  if (!car) return false;
  const typeStr = typeof car === 'string' ? car : (car.type || '');
  if (typeStr.startsWith('trailer_')) return false;

  const heavyTypes = [
    'truck_water', 'truck_tanker', 'truck_flatbed', 'truck_covered', 'truck_dump', 
    'truck_box', 'truck_semi', 'truck_tow', 'truck_armored',
    'cement_mixer', 'garbage_truck',
    'fire_engine', 'fire_ladder', 'fire_rescue',
    'tractor_mtz82', 'tractor_mtz80', 'tractor_mtz80_old',
    'bus', 'bus_minibus', 'delivery_truck'
  ];
  if (heavyTypes.includes(typeStr)) return true;
  if (typeStr.startsWith('tractor_')) return true;

  if (typeof car === 'object' && car !== null) {
    if (car.trailerId || car.roadTrainLightsOn) return true;
  }
  return false;
}

export interface VehicleDiffLockCapabilities {
  supported: boolean;
  hasCenter: boolean; // Межосевая блокировка (МОБ - раздатка 50:50)
  hasRear: boolean;   // Межколесная блокировка задней оси (МКБ-З)
  hasFront: boolean;  // Межколесная блокировка передней оси (МКБ-П)
  systemNameRu: string;
  driveLayoutRu: string;
}

/**
 * Returns differential lock capabilities by vehicle archetype.
 * Strictly available ONLY for supported real-world offroaders, heavy commercial trucks, and tractors.
 */
export function getVehicleDiffCapabilities(carType: string): VehicleDiffLockCapabilities {
  const type = carType || '';

  // 1. Extreme Offroaders (UAZ, Hunter, G-Wagen, Defender): Full 3 Lockers (МОБ + МКБ-З + МКБ-П)
  if (type === 'offroad_hardcore') {
    return {
      supported: true,
      hasCenter: true,
      hasRear: true,
      hasFront: true,
      systemNameRu: 'Тройная блокировка 4x4 (МОБ + МКБ-З + МКБ-П)',
      driveLayoutRu: '4WD с жестким подключением и 3 принудительными блокировками'
    };
  }

  // 2. Classic Boxy SUV (Lada Niva 4x4): Transfer case center diff lock + rear cross-axle locker
  if (type === 'suv_classic_box') {
    return {
      supported: true,
      hasCenter: true,
      hasRear: true,
      hasFront: false,
      systemNameRu: 'Блокировка раздатки и заднего моста (МОБ + МКБ-З)',
      driveLayoutRu: 'Постоянный полный привод (Full-time 4WD) с блокировкой МОБ и МКБ'
    };
  }

  // 3. Full-size SUV & Luxury Offroaders (Land Cruiser, Patrol, Touareg)
  if (type === 'suv' || type === 'suv_luxury' || type === 'crossover_compact' || type === 'truck_armored') {
    return {
      supported: true,
      hasCenter: true,
      hasRear: true,
      hasFront: false,
      systemNameRu: 'Блокировка межосевая и заднего дифференциала (МОБ + МКБ-З)',
      driveLayoutRu: '4WD / AWD с электро-пневматической блокировкой мостов'
    };
  }

  // 4. Heavy Duty Pickups (Part-time transfer lock + Rear axle E-Locker)
  if (type === 'pickup' || type === 'pickup_heavy') {
    return {
      supported: true,
      hasCenter: true,
      hasRear: true,
      hasFront: false,
      systemNameRu: 'Блокировка раздатки и заднего моста (МОБ + МКБ-З)',
      driveLayoutRu: 'Part-time 4WD с принудительной блокировкой заднего моста'
    };
  }

  // 5. MTZ-82 Belarus Tractor (4x4): Rear axle hydraulic lock pedal + Front driving axle
  if (type === 'tractor_mtz82') {
    return {
      supported: true,
      hasCenter: true,
      hasRear: true,
      hasFront: true,
      systemNameRu: 'Блокировка МТЗ-82 (МКБ-З педаль + ПВМ самоблок)',
      driveLayoutRu: 'Сельхозтрактор 4x4: гидромеханическая блокировка заднего моста и ПВМ'
    };
  }

  // 6. MTZ-80 Belarus Tractor (4x2): Rear axle mechanical/hydraulic lock pedal
  if (type === 'tractor_mtz80' || type === 'tractor_mtz80_old') {
    return {
      supported: true,
      hasCenter: false,
      hasRear: true,
      hasFront: false,
      systemNameRu: 'Педаль блокировки заднего дифференциала МТЗ-80 (МКБ-З)',
      driveLayoutRu: 'Заднеприводный трактор: педальная блокировка заднего моста'
    };
  }

  // 7. Heavy Commercial Trucks & Construction Vehicles (KamAZ, MAZ, Ural, Dump, Tanker, Mixer, etc.)
  if (
    type === 'truck_dump' || 
    type === 'truck_semi' || 
    type === 'truck_box' || 
    type === 'truck_tanker' || 
    type === 'truck_water' || 
    type === 'truck_flatbed' || 
    type === 'truck_covered' || 
    type === 'cement_mixer' || 
    type === 'garbage_truck' || 
    type === 'fire_engine' || 
    type === 'fire_ladder' || 
    type === 'fire_rescue'
  ) {
    return {
      supported: true,
      hasCenter: true,
      hasRear: true,
      hasFront: false,
      systemNameRu: 'Пневмоблокировка грузовика (МОБ + МКБ)',
      driveLayoutRu: 'Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)'
    };
  }

  // Passenger sedans, hatchbacks, vans, sports cars, supercars, bikes, trailers: OPEN DIFF ONLY
  return {
    supported: false,
    hasCenter: false,
    hasRear: false,
    hasFront: false,
    systemNameRu: 'Свободный дифференциал',
    driveLayoutRu: 'Стандартный открытый дифференциал'
  };
}

/**
 * Ensures a vehicle has initialized differential lock state.
 */
export function ensureVehicleDiffLock(car: Vehicle): VehicleDiffLockState {
  if (!car.diffLock) {
    car.diffLock = {
      center: false,
      rear: false,
      front: false
    };
  }
  return car.diffLock;
}

/**
 * Cycles differential lock modes sequentially:
 * Free -> Center (МОБ) -> Center + Rear (МОБ+МКБ-З) -> All (МОБ+МКБ-З+МКБ-П) -> Free
 */
export function cycleVehicleDiffLock(car: Vehicle): {
  changed: boolean;
  message: string;
  stateDesc: string;
  isEngaged: boolean;
} {
  const caps = getVehicleDiffCapabilities(car.type);
  if (!caps.supported) {
    return {
      changed: false,
      message: 'На данном автомобиле установлен свободный дифференциал без принудительной блокировки.',
      stateDesc: 'СВОБОДНЫЙ',
      isEngaged: false
    };
  }

  const dl = ensureVehicleDiffLock(car);
  const speedKmh = Math.abs(car.speed) * PX_S_TO_SPEED_KMH;
  const isCurrentlyLocked = dl.center || dl.rear || dl.front;

  // Realistic mechanical safety interlock: cannot engage dog clutches at speeds over 40 km/h
  if (!isCurrentlyLocked && speedKmh > 40) {
    return {
      changed: false,
      message: `Слишком высокая скорость (${Math.round(speedKmh)} км/ч)! Сбросьте скорость ниже 40 км/ч для включения блокировки.`,
      stateDesc: 'СВОБОДНЫЙ',
      isEngaged: false
    };
  }

  // State 0: All free
  if (!dl.center && !dl.rear && !dl.front) {
    if (caps.hasCenter) {
      dl.center = true;
      dl.rear = false;
      dl.front = false;
      return {
        changed: true,
        message: 'Блокировка: МЕЖОСЕВАЯ [МОБ] ВКЛ (Крутящий момент 50:50 между осями)',
        stateDesc: 'МОБ',
        isEngaged: true
      };
    } else {
      dl.rear = true;
      return {
        changed: true,
        message: 'Блокировка: ЗАДНЯЯ МЕЖКОЛЕСНАЯ [МКБ-З] ВКЛ (Оба задних колеса заблокированы)',
        stateDesc: 'МКБ-З',
        isEngaged: true
      };
    }
  }

  // State 1: Center only
  if (dl.center && !dl.rear && !dl.front) {
    if (caps.hasRear) {
      dl.center = true;
      dl.rear = true;
      dl.front = false;
      return {
        changed: true,
        message: 'Блокировка: МЕЖОСЕВАЯ + ЗАДНЯЯ [МОБ + МКБ-З] ВКЛ (3 колеса жестко связаны)',
        stateDesc: 'МОБ+МКБ',
        isEngaged: true
      };
    } else {
      dl.center = false;
      dl.rear = false;
      dl.front = false;
      return {
        changed: true,
        message: 'Блокировка дифференциала: ВЫКЛЮЧЕНА (Все дифференциалы свободные)',
        stateDesc: 'СВОБОДНЫЙ',
        isEngaged: false
      };
    }
  }

  // State 2: Center + Rear
  if (dl.rear && (!caps.hasCenter || dl.center) && !dl.front) {
    if (caps.hasFront) {
      dl.center = caps.hasCenter;
      dl.rear = true;
      dl.front = true;
      return {
        changed: true,
        message: 'Блокировка: ПОЛНАЯ ТРОЙНАЯ [МОБ + МКБ-З + МКБ-П] ВКЛ (Все 4 колеса заблокированы)',
        stateDesc: 'ПОЛНАЯ (100%)',
        isEngaged: true
      };
    } else {
      dl.center = false;
      dl.rear = false;
      dl.front = false;
      return {
        changed: true,
        message: 'Блокировка дифференциала: ВЫКЛЮЧЕНА (Все дифференциалы свободные)',
        stateDesc: 'СВОБОДНЫЙ',
        isEngaged: false
      };
    }
  }

  // State 3: Disengage everything
  dl.center = false;
  dl.rear = false;
  dl.front = false;
  return {
    changed: true,
    message: 'Блокировка дифференциала: ВЫКЛЮЧЕНА (Все дифференциалы свободные)',
    stateDesc: 'СВОБОДНЫЙ',
    isEngaged: false
  };
}

/**
 * Directly toggles a specific axle's differential lock.
 */
export function toggleAxleDiffLock(
  car: Vehicle, 
  axle: 'center' | 'rear' | 'front'
): { success: boolean; state: boolean; message: string } {
  const caps = getVehicleDiffCapabilities(car.type);
  if (!caps.supported) {
    return {
      success: false,
      state: false,
      message: 'На данном ТС нет принудительной блокировки дифференциала.'
    };
  }

  const dl = ensureVehicleDiffLock(car);
  const speedKmh = Math.abs(car.speed) * PX_S_TO_SPEED_KMH;

  if (axle === 'center') {
    if (!caps.hasCenter) return { success: false, state: false, message: 'Межосевая блокировка отсутствует на данном ТС' };
    if (!dl.center && speedKmh > 40) return { success: false, state: false, message: 'Сбросьте скорость ниже 40 км/ч для блокировки МОБ!' };
    dl.center = !dl.center;
    return {
      success: true,
      state: dl.center,
      message: dl.center ? 'Межосевая блокировка [МОБ]: ВКЛ' : 'Межосевая блокировка [МОБ]: ВЫКЛ'
    };
  }

  if (axle === 'rear') {
    if (!caps.hasRear) return { success: false, state: false, message: 'Блокировка заднего моста отсутствует на данном ТС' };
    if (!dl.rear && speedKmh > 40) return { success: false, state: false, message: 'Сбросьте скорость ниже 40 км/ч для блокировки заднего моста!' };
    dl.rear = !dl.rear;
    return {
      success: true,
      state: dl.rear,
      message: dl.rear ? 'Межколесная задняя блокировка [МКБ-З]: ВКЛ' : 'Межколесная задняя блокировка [МКБ-З]: ВЫКЛ'
    };
  }

  if (axle === 'front') {
    if (!caps.hasFront) return { success: false, state: false, message: 'Блокировка переднего моста отсутствует на данном ТС' };
    if (!dl.front && speedKmh > 30) return { success: false, state: false, message: 'Сбросьте скорость ниже 30 км/ч для блокировки передка!' };
    dl.front = !dl.front;
    return {
      success: true,
      state: dl.front,
      message: dl.front ? 'Межколесная передняя блокировка [МКБ-П]: ВКЛ (Внимание: управляемость ограничена!)' : 'Межколесная передняя блокировка [МКБ-П]: ВЫКЛ'
    };
  }

  return { success: false, state: false, message: 'Неизвестная ось' };
}



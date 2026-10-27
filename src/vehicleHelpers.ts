import { 
  CarConfig,
  CarType, 
  DeformVertex,
  EngineState,
  FuelSystem,
  FluidStorageTank,
  StoredLiquidType,
  FluidStainType,
  TurnSignalType,
  TurnSignalSoundType,
  VehicleTurnSignalConfig,
  Vector2D, 
  Vehicle,
  VehicleDamage,
  VehicleDiffLockState 
} from './types';
import { getVehicleNodeBeamDefinition } from './vehicleMeshConfigs';
import { getPowertrainPickByIds, TRANSMISSION_VARIANTS } from './powertrainVariants';
import { getVehicleCatalogItem } from './vehicleCatalog';
import { isTrailerVehicle, isRoadMachinery, isMotorcycle, isTractorVehicle } from './vehicleArchetypes';

export { isTrailerVehicle, isRoadMachinery, isMotorcycle, isTractorVehicle };

let _nodeBeamBuilder: ((car: any) => any) | null = null;
export function registerNodeBeamBuilder(builder: (car: any) => any) {
  _nodeBeamBuilder = builder;
}
export function createNodeBeamForVehicle(car: any) {
  if (_nodeBeamBuilder) return _nodeBeamBuilder(car);
  return null;
}

export const SPEED_KMH_TO_PX_S = 4.4444; // 1.6x speedup for realistic screen motion (formerly 2.7778)
export const PX_S_TO_SPEED_KMH = 0.225;  // 1 / 4.4444 (formerly 0.36)


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

  const catalogItem = getVehicleCatalogItem(type);
  const transmissionType: 'AUTO' | 'MANUAL' = catalogItem?.transmissionType || 'AUTO';
  const hasTransferCase = catalogItem?.hasTransferCase || false;
  const gearRatios = catalogItem?.gearRatios || [-3.4, 0, 3.5, 2.05, 1.38, 1.00, 0.78];
  const finalDriveRatio = catalogItem?.finalDriveRatio || 3.9;

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
    gearRatios,
    finalDriveRatio,
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
  
  // Resolve defaults from the vehicle's stored powertrain variant (if any), otherwise from type
  const storedPick = getPowertrainPickByIds({
    engineId: eng.engineId,
    transmissionId: eng.transmissionId,
    tuneId: eng.tuneId,
    tireSetId: eng.tireSetId,
    turboKitId: eng.turboKitId
  });
  const hasVariant = storedPick !== null;

  // Force update to ensure correct length for 9-speed/6-speed/config if mismatched
  const expectedRatioLen = hasVariant ? storedPick!.transmission.ratios.length : createDefaultEngineState(veh.type).gearRatios?.length;
  if (!eng.gearRatios || !Array.isArray(eng.gearRatios) || eng.gearRatios.length !== expectedRatioLen) {
    if (hasVariant) {
      eng.gearRatios = storedPick!.transmission.ratios.slice();
      eng.finalDriveRatio = storedPick!.transmission.finalDrive;
    } else {
      const defaultEng = createDefaultEngineState(veh.type);
      eng.gearRatios = defaultEng.gearRatios;
      eng.finalDriveRatio = defaultEng.finalDriveRatio;
    }
    // ensure currentGear is within bounds
    if (eng.currentGear > eng.gearRatios.length - 2) {
      eng.currentGear = eng.gearRatios.length - 2;
    }
  }

  // Force update transfer case attributes
  if (eng.hasTransferCase === undefined) {
    eng.hasTransferCase = hasVariant
      ? storedPick!.transmission.divider === 'divider'
      : createDefaultEngineState(veh.type).hasTransferCase;
    eng.transferCaseMode = eng.transferCaseMode || 'HIGH';
  }

  // Restore variant RPM/power overlays if lost (e.g. older save without variant fields)
  if (hasVariant) {
    const { engine, tune } = storedPick!;
    if (eng.idleRPM === undefined) {
      eng.idleRPM = engine.idleRPM;
      eng.redlineRPM = Math.round(engine.redlineRPM * tune.redlineMult);
      eng.maxRPMLimit = Math.round(engine.maxRPM * Math.max(1.0, tune.redlineMult));
      eng.powerMult = engine.powerMult * tune.powerMult;
      eng.consumptionMult = engine.consumptionMult * tune.consumptionMult;
      eng.heatMult = engine.heatMult * tune.heatMult;
      eng.rpmResponseMult = engine.rpmResponseMult * tune.rpmResponseMult;
      eng.minOctaneRequirement = engine.fuel === 'diesel' ? 0 : Math.max(
        engine.fuel === 'ai98' ? 98 : engine.fuel === 'ai100' ? 100 : engine.fuel === 'ai95' ? 95 : 92,
        tune.minOctane
      );
      eng.knockRisk = tune.knockRisk;
      eng.chipLevel = tune.chipLevel;
    }
    if (eng.turboSpec === undefined) eng.turboSpec = null;
    if (eng.turboBoost === undefined) eng.turboBoost = 0;
    if (eng.tireGripMult === undefined) eng.tireGripMult = storedPick!.tires.gripMult;
    if (eng.tireWetGripMult === undefined) eng.tireWetGripMult = storedPick!.tires.wetGripMult;
    if (eng.tireIceGripMult === undefined) eng.tireIceGripMult = storedPick!.tires.iceGripMult;
    if (eng.tireRollingMult === undefined) eng.tireRollingMult = storedPick!.tires.rollingMult;
    if (eng.tireTopSpeedMult === undefined) eng.tireTopSpeedMult = storedPick!.tires.topSpeedMult;
    if (eng.transmissionKind === undefined) {
      eng.transmissionKind = storedPick!.transmission.kind;
      eng.transmissionEfficiency = storedPick!.transmission.efficiency;
    }
  }

  const isMachinery = isRoadMachinery(veh.type);
  if (isMachinery) {
    // Road machinery is strictly hydrostatic drive (ГСТ): AUTO, F/N/R, no manual clutch or stepped gears
    const hydroTrn = TRANSMISSION_VARIANTS.find(t => t.id === 'trn_hydro_2r');
    eng.transmissionType = 'AUTO';
    if (!eng.autoGearMode) eng.autoGearMode = veh.isParked ? 'P' : 'D';
    eng.gearRatios = hydroTrn ? hydroTrn.ratios.slice() : [-3.6, 0, 5.2, 2.0];
    eng.finalDriveRatio = hydroTrn ? hydroTrn.finalDrive : 6.2;
    eng.transmissionKind = 'HYDRO';
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

  const catalogItem = getVehicleCatalogItem(type);
  const fuelType = catalogItem?.fuelType || 'ai95';
  const tankCapacity = catalogItem?.tankCapacity || 55;

  let tankLevel = 100;
  if (isParkedOnStreet) {
    tankLevel = Math.round(15 + Math.random() * 70);
  } else if (Math.random() < 0.9) {
    tankLevel = Math.round(35 + Math.random() * 55);
  }

  const octaneNumber = fuelType === 'diesel' ? 45 : (fuelType === 'ai92' ? 92 : 95);

  return {
    fuelType,
    tankLevel,
    tankCapacity,
    tankPunctured: false,
    fuelQuality: 100,
    detonation: false,
    octaneNumber
  };
}


export interface VehicleBodyPanelsConfig {
  hasHood: boolean;           // Front hood / bonnet (passenger cars, trucks, vans)
  hasFrontBumper: boolean;    // Front bumper fascia (cars, trucks, vans)
  hasRearBumper: boolean;     // Rear bumper fascia (cars, trucks, vans)
  hasFenders: boolean;        // Front left/right wings/fenders (cars, pickups, vans, trucks)
  hasDoors: boolean;          // Cab/side passenger doors (cars, trucks, vans, tractors)
  hasTrunk: boolean;          // Rear trunk lid / bootlid (sedans, coupes, compacts)
  isTractorBonnet?: boolean;  // Tractor narrow engine cowl / bonnet
  isTractorDoors?: boolean;   // Tractor cab left/right doors
}

export function getVehicleBodyPanelsConfig(type?: string): VehicleBodyPanelsConfig {
  if (!type) {
    return { hasHood: true, hasFrontBumper: true, hasRearBumper: true, hasFenders: true, hasDoors: true, hasTrunk: true };
  }
  if (isTrailerVehicle({ type } as any)) {
    return { hasHood: false, hasFrontBumper: false, hasRearBumper: false, hasFenders: false, hasDoors: false, hasTrunk: false };
  }
  if (isMotorcycle(type)) {
    return { hasHood: false, hasFrontBumper: false, hasRearBumper: false, hasFenders: false, hasDoors: false, hasTrunk: false };
  }
  if (isRoadMachinery(type)) {
    return { hasHood: false, hasFrontBumper: false, hasRearBumper: false, hasFenders: false, hasDoors: false, hasTrunk: false };
  }
  if (isTractorVehicle(type)) {
    // Tractors have a narrow engine bonnet and cab doors, but NO car bumpers, NO car front fenders, NO car trunk!
    return { hasHood: true, hasFrontBumper: false, hasRearBumper: false, hasFenders: false, hasDoors: true, hasTrunk: false, isTractorBonnet: true, isTractorDoors: true };
  }
  // Buses & Heavy trucks (ZIL, semi) have no car trunk
  if (type === 'bus' || type === 'bus_minibus' || type === 'truck_semi' || type === 'truck_box' || type === 'truck_dump' || type === 'truck_zil_dump' || type === 'truck_tanker' || type === 'truck_water' || type === 'truck_flatbed' || type === 'truck_covered' || type === 'cement_mixer' || type === 'garbage_truck' || type === 'truck_tow' || type === 'fire_engine' || type === 'fire_ladder' || type === 'fire_rescue') {
    return { hasHood: type !== 'bus' && type !== 'bus_minibus', hasFrontBumper: true, hasRearBumper: false, hasFenders: true, hasDoors: true, hasTrunk: false };
  }
  // Sedans, coupes, classic compacts have trunks
  const hasTrunkLid = type.includes('sedan') || type === 'coupe_gt' || type === 'muscle' || type === 'muscle_classic' || type === 'classic_compact' || type === 'micro_car' || type === 'taxi' || type === 'police';

  return {
    hasHood: true,
    hasFrontBumper: true,
    hasRearBumper: true,
    hasFenders: true,
    hasDoors: true,
    hasTrunk: hasTrunkLid
  };
}

export function getLPGDefaultCapacity(type: string): number {
  if (['truck_semi', 'truck_dump', 'truck_zil_dump', 'truck_box', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'bus', 'fire_engine', 'fire_ladder'].includes(type) || type.includes('semi')) {
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

  // 16 Perimeter nodes matching 1:1 with basePoly perimeter vertices (0 = front center, 1..7 = right side (+halfW), 8 = rear center, 9..15 = left side (-halfW))
  const base16 = [
    // Front Bumper & Grill (nodes 0..1)
    { localX: halfL, localY: 0, structuralType: 'bumper' },                           // 0: Front center
    { localX: halfL - 0.8, localY: halfW * 0.78, structuralType: 'bumper' },           // 1: Front-Right corner

    // Right Side Flank (nodes 2..6)
    { localX: halfL - 2.0, localY: halfW, structuralType: 'fender' },                  // 2: Front-Right fender
    { localX: halfL * 0.45, localY: halfW, structuralType: 'door' },                   // 3: Right front door
    { localX: 0, localY: halfW, structuralType: 'door' },                              // 4: Right B-pillar
    { localX: -halfL * 0.45, localY: halfW, structuralType: 'door' },                  // 5: Right rear door
    { localX: -halfL + 1.2, localY: halfW * 0.95, structuralType: 'quarter' },         // 6: Rear-Right quarter

    // Rear Bumper & Tailgate (nodes 7..9)
    { localX: -halfL + 0.4, localY: halfW * 0.62, structuralType: 'bumper' },          // 7: Rear-Right bumper
    { localX: -halfL, localY: 0, structuralType: 'bumper' },                           // 8: Rear center
    { localX: -halfL + 0.4, localY: -halfW * 0.62, structuralType: 'bumper' },         // 9: Rear-Left bumper

    // Left Side Flank (nodes 10..14)
    { localX: -halfL + 1.2, localY: -halfW * 0.95, structuralType: 'quarter' },        // 10: Rear-Left quarter
    { localX: -halfL * 0.45, localY: -halfW, structuralType: 'door' },                 // 11: Left rear door
    { localX: 0, localY: -halfW, structuralType: 'door' },                             // 12: Left B-pillar
    { localX: halfL * 0.45, localY: -halfW, structuralType: 'door' },                  // 13: Left front door
    { localX: halfL - 2.0, localY: -halfW, structuralType: 'fender' },                 // 14: Front-Left fender

    // Front-Left Corner (node 15)
    { localX: halfL - 0.8, localY: -halfW * 0.78, structuralType: 'bumper' }          // 15: Front-Left corner
  ];

  const deformedVertices: DeformVertex[] = [];
  for (let i = 0; i < base16.length; i++) {
    deformedVertices.push({
      localX: base16[i].localX, localY: base16[i].localY, 
      offsetX: 0, offsetY: 0, plasticStrain: 0, elasticX: 0, elasticY: 0, velX: 0, velY: 0, 
      structuralType: base16[i].structuralType as any
    });
  }

  // Volumetric internal nodes for roof, cabin, windshield, rear glass, hood & trunk skeleton (indices 16 to 23)
  const roofHalfL = halfL * 0.28;
  const roofHalfW = halfW * 0.42;
  const cabinCenterX = -halfL * 0.04;

  const internalNodes = [
    { localX: halfL * 0.42, localY: 0, structuralType: 'hood' },                          // 16: Hood center
    { localX: cabinCenterX + roofHalfL * 1.5, localY: 0, structuralType: 'windshield' },         // 17: Windshield base/cowl center
    { localX: cabinCenterX, localY: 0, structuralType: 'roof' },                          // 18: Roof center
    { localX: cabinCenterX + roofHalfL, localY: -roofHalfW, structuralType: 'roof' },         // 19: Roof front-left corner
    { localX: cabinCenterX + roofHalfL, localY: roofHalfW, structuralType: 'roof' },          // 20: Roof front-right corner
    { localX: cabinCenterX - roofHalfL, localY: -roofHalfW, structuralType: 'roof' },         // 21: Roof rear-left corner
    { localX: cabinCenterX - roofHalfL, localY: roofHalfW, structuralType: 'roof' },          // 22: Roof rear-right corner
    { localX: cabinCenterX - roofHalfL * 1.6, localY: 0, structuralType: 'trunk' }            // 23: Rear glass base / trunk deck
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
    deformedVertices,
    nodeBeam: createNodeBeamForVehicle({ type: 'sedan', length, width })
  };
}

export function ensureVehicleDamage(veh: { length?: number; width?: number; damage?: VehicleDamage; type?: string; mass?: number }): VehicleDamage {
  const targetLen = veh.length || 42;
  const targetWid = veh.width || 20;
  if (!veh.damage) {
    const fresh = createDefaultVehicleDamage(targetLen, targetWid);
    if (veh.type) {
      fresh.nodeBeam = createNodeBeamForVehicle({
        type: veh.type,
        length: targetLen,
        width: targetWid,
        mass: veh.mass,
        customMeshConfig: (veh as any).customMeshConfig
      });
    }
    return fresh;
  }

  const dmg = veh.damage;
  // Старые сохранения (и createDefaultVehicleDamage) могли создать сетку
  // седана для грузовика/автобуса/мотоцикла. Проверяем presetId и при
  // несовпадении пересобираем сетку под реальный тип и массу машины.
  let expectedPresetId: string | undefined;
  if (veh.type) {
    try {
      expectedPresetId = getVehicleNodeBeamDefinition(veh.type, (veh as any).customMeshConfig).presetId;
    } catch {
      expectedPresetId = undefined;
    }
  }
  const presetMismatch = !!expectedPresetId && !!dmg.nodeBeam && dmg.nodeBeam.presetId !== expectedPresetId;
  // Старые сохранения содержат сетку без колёсных узлов и с одним анкером —
  // именно она давала «краба». Такие сетки пересобираем под новую версию.
  const meshOutdated = !!dmg.nodeBeam && (
    !Array.isArray(dmg.nodeBeam.nodes) ||
    !dmg.nodeBeam.nodes.some(n => n.group === 'wheel') ||
    (dmg.nodeBeam.fixedNodeCount || 0) < 3
  );
  if (!dmg.nodeBeam || !Array.isArray(dmg.nodeBeam.nodes) || dmg.nodeBeam.nodes.length < 8 || presetMismatch || meshOutdated) {
    dmg.nodeBeam = createNodeBeamForVehicle({
      type: veh.type || 'sedan',
      length: targetLen,
      width: targetWid,
      mass: veh.mass,
      customMeshConfig: (veh as any).customMeshConfig
    });
  }

  if (!Array.isArray(dmg.deformedVertices) || dmg.deformedVertices.length < 8) {
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
      deformedVertices: fresh.deformedVertices,
      nodeBeam: dmg.nodeBeam || fresh.nodeBeam
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
    'truck_box', 'truck_dump', 'truck_zil_dump', 'truck_semi', 'truck_tanker', 'truck_water', 
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
  const isHeavyTruck = isThreeAxle || car.type === 'truck_box' || car.type === 'truck_zil_dump' || car.type === 'truck_water' || car.type === 'truck_tow' || car.type === 'truck_armored' || car.type === 'delivery_truck' || car.type === 'fire_engine' || car.type === 'fire_ladder' || car.type === 'bus';

  let rearAxleOffsetRatio = 0.65;
  let frontAxleOffsetRatio = 0.65;

  if (isTractor) {
    rearAxleOffsetRatio = 0.48;
    frontAxleOffsetRatio = 0.70;
  } else if (car.type === 'truck_zil_dump') {
    rearAxleOffsetRatio = 0.58; // Short 3300mm wheelbase tipper rear axle
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
  sedan: { type: 'sedan', width: 20, length: 42, wheelBase: 26, mass: 1400, maxSpeed: 180, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 240, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Vortex Solstice 1.6', transmission: 'AUTO' },
  hatchback: { type: 'hatchback', width: 19, length: 38, wheelBase: 23, mass: 1150, maxSpeed: 175, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 250, friction: 0.988, turnSpeed: 4.5, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.988, driftGrip: 0.40, name: 'Vortex Nova 1.6', transmission: 'MANUAL' },
  pickup: { type: 'pickup', width: 22, length: 48, wheelBase: 30, mass: 2200, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 24, brakingForce: 220, friction: 0.985, turnSpeed: 3.6, maxSteerAngle: 0.64, minSteerAngle: 0.12, grip: 0.975, driftGrip: 0.32, name: 'Bison Utility 4x4', transmission: 'MANUAL' },
  sports: { type: 'sports', width: 21, length: 44, wheelBase: 27, mass: 1320, maxSpeed: 280, reverseMaxSpeed: 55, acceleration: 55, brakingForce: 290, friction: 0.990, turnSpeed: 4.6, maxSteerAngle: 0.65, minSteerAngle: 0.13, grip: 0.990, driftGrip: 0.44, name: 'Apex GT-Coupe 3.0', transmission: 'AUTO' },
  suv: { type: 'suv', width: 21, length: 42, wheelBase: 26, mass: 1450, maxSpeed: 170, reverseMaxSpeed: 45, acceleration: 26, brakingForce: 230, friction: 0.986, turnSpeed: 3.8, maxSteerAngle: 0.65, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.36, name: 'Nordic Nomad 2.0', transmission: 'AUTO' },
  taxi: { type: 'taxi', width: 21, length: 46, wheelBase: 28, mass: 1450, maxSpeed: 175, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 245, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Vortex Solstice Taxi', transmission: 'AUTO' },
  police: { type: 'police', width: 21, length: 46, wheelBase: 28, mass: 1550, maxSpeed: 220, reverseMaxSpeed: 55, acceleration: 45, brakingForce: 275, friction: 0.989, turnSpeed: 4.4, maxSteerAngle: 0.68, minSteerAngle: 0.13, grip: 0.988, driftGrip: 0.40, name: 'Sentinel Patrol Cruiser', transmission: 'AUTO' },
  ambulance: { type: 'ambulance', width: 24, length: 54, wheelBase: 32, mass: 2800, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 210, friction: 0.984, turnSpeed: 3.6, maxSteerAngle: 0.64, minSteerAngle: 0.11, grip: 0.970, driftGrip: 0.30, name: 'Sentinel Medic Van', transmission: 'AUTO' },
  bus: { type: 'bus', width: 26, length: 85, wheelBase: 52, mass: 9500, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 12, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.950, driftGrip: 0.22, name: 'Metro Linemaster CityBus', transmission: 'MANUAL' },
  supercar: { type: 'supercar', width: 22, length: 45, wheelBase: 27, mass: 1250, maxSpeed: 320, reverseMaxSpeed: 60, acceleration: 70, brakingForce: 330, friction: 0.992, turnSpeed: 4.8, maxSteerAngle: 0.65, minSteerAngle: 0.12, grip: 0.994, driftGrip: 0.48, name: 'Apex Venom GT 4.0', transmission: 'AUTO' },
  wagon_classic: { type: 'wagon_classic', width: 20, length: 44, wheelBase: 26, mass: 1350, maxSpeed: 155, reverseMaxSpeed: 40, acceleration: 24, brakingForce: 210, friction: 0.986, turnSpeed: 3.8, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.35, name: 'Kestrel Tour 1.5', transmission: 'MANUAL' },
  wagon_modern: { type: 'wagon_modern', width: 20, length: 45, wheelBase: 27, mass: 1320, maxSpeed: 185, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 250, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.986, driftGrip: 0.38, name: 'Nordic Trail SW 2.0', transmission: 'AUTO' },
  crossover_compact: { type: 'crossover_compact', width: 21, length: 43, wheelBase: 26, mass: 1420, maxSpeed: 180, reverseMaxSpeed: 45, acceleration: 30, brakingForce: 240, friction: 0.987, turnSpeed: 4.0, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.984, driftGrip: 0.36, name: 'Nordic Scout 1.8', transmission: 'AUTO' },
  sedan_classic: { type: 'sedan_classic', width: 19, length: 42, wheelBase: 25, mass: 1200, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 200, friction: 0.986, turnSpeed: 3.9, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.978, driftGrip: 0.34, name: 'Kestrel Aero 1.3', transmission: 'MANUAL' },
  sedan_compact: { type: 'sedan_compact', width: 18, length: 39, wheelBase: 24, mass: 1050, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 230, friction: 0.988, turnSpeed: 4.3, maxSteerAngle: 0.68, minSteerAngle: 0.15, grip: 0.985, driftGrip: 0.39, name: 'Kestrel Vector 1.4', transmission: 'MANUAL' },
  compact_matiz: { type: 'compact_matiz', width: 17, length: 33, wheelBase: 21, mass: 770, maxSpeed: 145, reverseMaxSpeed: 35, acceleration: 26, brakingForce: 220, friction: 0.988, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.984, driftGrip: 0.38, name: 'Micro Zest 0.8', transmission: 'MANUAL' },
  sedan_logan: { type: 'sedan_logan', width: 19, length: 42, wheelBase: 26, mass: 980, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 230, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Kestrel Meridian 1.6', transmission: 'MANUAL' },
  sedan_nexia: { type: 'sedan_nexia', width: 18, length: 44, wheelBase: 25, mass: 1020, maxSpeed: 170, reverseMaxSpeed: 45, acceleration: 29, brakingForce: 230, friction: 0.988, turnSpeed: 4.1, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.985, driftGrip: 0.38, name: 'Kestrel Zenith 1.5', transmission: 'MANUAL' },
  liftback_tavria: { type: 'liftback_tavria', width: 17, length: 35, wheelBase: 22, mass: 710, maxSpeed: 140, reverseMaxSpeed: 36, acceleration: 25, brakingForce: 200, friction: 0.987, turnSpeed: 4.6, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.980, driftGrip: 0.36, name: 'Vortex Era 1.1', transmission: 'MANUAL' },
  sedan_accent: { type: 'sedan_accent', width: 18, length: 41, wheelBase: 24, mass: 1030, maxSpeed: 180, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 240, friction: 0.988, turnSpeed: 4.3, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.986, driftGrip: 0.39, name: 'Kestrel Pulse 1.5', transmission: 'MANUAL' },
  sedan_polo: { type: 'sedan_polo', width: 19, length: 43, wheelBase: 25, mass: 1160, maxSpeed: 190, reverseMaxSpeed: 48, acceleration: 33, brakingForce: 250, friction: 0.988, turnSpeed: 4.3, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.987, driftGrip: 0.39, name: 'Kestrel Apex 1.6', transmission: 'AUTO' },
  hatch_samara: { type: 'hatch_samara', width: 18, length: 39, wheelBase: 24, mass: 945, maxSpeed: 160, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 220, friction: 0.988, turnSpeed: 4.4, maxSteerAngle: 0.69, minSteerAngle: 0.15, grip: 0.983, driftGrip: 0.38, name: 'Vortex Sprint 1.5', transmission: 'MANUAL' },
  sedan_samara: { type: 'sedan_samara', width: 18, length: 42, wheelBase: 25, mass: 970, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 220, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.984, driftGrip: 0.38, name: 'Vortex Vesper 1.5', transmission: 'MANUAL' },
  sedan_luxury: { type: 'sedan_luxury', width: 21, length: 46, wheelBase: 28, mass: 1650, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 45, brakingForce: 270, friction: 0.989, turnSpeed: 4.1, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.988, driftGrip: 0.40, name: 'Zenith Sovereign V8', transmission: 'AUTO' },
  suv_luxury: { type: 'suv_luxury', width: 23, length: 50, wheelBase: 31, mass: 2400, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 48, brakingForce: 280, friction: 0.989, turnSpeed: 4.0, maxSteerAngle: 0.64, minSteerAngle: 0.12, grip: 0.988, driftGrip: 0.41, name: 'Nordic Sovereign V8', transmission: 'AUTO' },
  pickup_heavy: { type: 'pickup_heavy', width: 24, length: 54, wheelBase: 34, mass: 3100, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 32, brakingForce: 240, friction: 0.984, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.10, grip: 0.972, driftGrip: 0.30, name: 'Bison Heavy Duty V8', transmission: 'AUTO' },
  hatch_hot: { type: 'hatch_hot', width: 19, length: 39, wheelBase: 24, mass: 1220, maxSpeed: 240, reverseMaxSpeed: 50, acceleration: 52, brakingForce: 290, friction: 0.990, turnSpeed: 4.7, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.990, driftGrip: 0.43, name: 'Apex Storm Turbo', transmission: 'MANUAL' },
  micro_car: { type: 'micro_car', width: 16, length: 30, wheelBase: 19, mass: 800, maxSpeed: 135, reverseMaxSpeed: 35, acceleration: 26, brakingForce: 220, friction: 0.988, turnSpeed: 5.2, maxSteerAngle: 0.74, minSteerAngle: 0.18, grip: 0.982, driftGrip: 0.36, name: 'Micro Atom City', transmission: 'MANUAL' },
  van: { type: 'van', width: 22, length: 50, wheelBase: 30, mass: 2100, maxSpeed: 160, reverseMaxSpeed: 40, acceleration: 22, brakingForce: 220, friction: 0.985, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.11, grip: 0.975, driftGrip: 0.32, name: 'Bison Transporter Van', transmission: 'AUTO' },
  coupe_gt: { type: 'coupe_gt', width: 21, length: 46, wheelBase: 28, mass: 1650, maxSpeed: 270, reverseMaxSpeed: 55, acceleration: 58, brakingForce: 300, friction: 0.991, turnSpeed: 4.5, maxSteerAngle: 0.66, minSteerAngle: 0.13, grip: 0.991, driftGrip: 0.45, name: 'Apex Grand Tourer 3.8', transmission: 'AUTO' },
  fire_engine: { type: 'fire_engine', width: 27, length: 88, wheelBase: 50, mass: 11000, maxSpeed: 130, reverseMaxSpeed: 35, acceleration: 22, brakingForce: 220, friction: 0.982, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.09, grip: 0.965, driftGrip: 0.25, name: 'Sentinel Fire Engine Pumper', transmission: 'AUTO' },
  fire_ladder: { type: 'fire_ladder', width: 28, length: 98, wheelBase: 58, mass: 13500, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 18, brakingForce: 210, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.22, name: 'Sentinel 30m Aerial Ladder', transmission: 'AUTO' },
  truck_tow: { type: 'truck_tow', width: 24, length: 62, wheelBase: 38, mass: 4200, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 20, brakingForce: 210, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.10, grip: 0.968, driftGrip: 0.28, name: 'Bison TowMaster Platform', transmission: 'MANUAL' },
  truck_armored: { type: 'truck_armored', width: 25, length: 58, wheelBase: 36, mass: 5500, maxSpeed: 140, reverseMaxSpeed: 35, acceleration: 20, brakingForce: 220, friction: 0.984, turnSpeed: 3.4, maxSteerAngle: 0.62, minSteerAngle: 0.09, grip: 0.970, driftGrip: 0.28, name: 'Bison Vault Guard', transmission: 'AUTO' },
  delivery_truck: { type: 'delivery_truck', width: 23, length: 56, wheelBase: 35, mass: 3200, maxSpeed: 145, reverseMaxSpeed: 38, acceleration: 22, brakingForce: 220, friction: 0.984, turnSpeed: 3.8, maxSteerAngle: 0.64, minSteerAngle: 0.10, grip: 0.970, driftGrip: 0.30, name: 'Bison Express Stepvan', transmission: 'MANUAL' },
  van_camper: { type: 'van_camper', width: 22, length: 52, wheelBase: 32, mass: 2600, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 18, brakingForce: 200, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.10, grip: 0.968, driftGrip: 0.29, name: 'Bison Nomad Camper', transmission: 'MANUAL' },
  classic_compact: { type: 'classic_compact', width: 18, length: 36, wheelBase: 22, mass: 900, maxSpeed: 140, reverseMaxSpeed: 38, acceleration: 22, brakingForce: 190, friction: 0.986, turnSpeed: 4.4, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.975, driftGrip: 0.33, name: 'Kestrel Prime 1.2', transmission: 'MANUAL' },
  retro_bubble: { type: 'retro_bubble', width: 17, length: 32, wheelBase: 20, mass: 750, maxSpeed: 120, reverseMaxSpeed: 32, acceleration: 20, brakingForce: 180, friction: 0.986, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.972, driftGrip: 0.32, name: 'Micro Bubble 900', transmission: 'MANUAL' },
  offroad_hardcore: { type: 'offroad_hardcore', width: 22, length: 44, wheelBase: 26, mass: 1950, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 28, brakingForce: 230, friction: 0.984, turnSpeed: 3.8, maxSteerAngle: 0.65, minSteerAngle: 0.12, grip: 0.982, driftGrip: 0.35, name: 'Nordic Taiga 4x4', transmission: 'MANUAL' },
  suv_classic_box: { type: 'suv_classic_box', width: 21, length: 45, wheelBase: 27, mass: 1800, maxSpeed: 160, reverseMaxSpeed: 42, acceleration: 26, brakingForce: 220, friction: 0.985, turnSpeed: 3.8, maxSteerAngle: 0.65, minSteerAngle: 0.13, grip: 0.980, driftGrip: 0.34, name: 'Nordic Titan 4x4', transmission: 'MANUAL' },
  muscle_classic: { type: 'muscle_classic', width: 21, length: 48, wheelBase: 29, mass: 1650, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 50, brakingForce: 240, friction: 0.988, turnSpeed: 3.9, maxSteerAngle: 0.64, minSteerAngle: 0.12, grip: 0.978, driftGrip: 0.42, name: 'Detroit Viper V8 1971', transmission: 'MANUAL' },
  van_cargo_old: { type: 'van_cargo_old', width: 21, length: 46, wheelBase: 28, mass: 1700, maxSpeed: 135, reverseMaxSpeed: 35, acceleration: 18, brakingForce: 190, friction: 0.983, turnSpeed: 3.6, maxSteerAngle: 0.62, minSteerAngle: 0.11, grip: 0.968, driftGrip: 0.30, name: 'Bison Pathfinder Van', transmission: 'MANUAL' },
  truck_box: { type: 'truck_box', width: 25, length: 68, wheelBase: 42, mass: 6200, maxSpeed: 125, reverseMaxSpeed: 32, acceleration: 15, brakingForce: 185, friction: 0.981, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.09, grip: 0.958, driftGrip: 0.24, name: 'Titan Cargo Box 5T', transmission: 'MANUAL' },
  truck_dump: { type: 'truck_dump', width: 26, length: 72, wheelBase: 44, mass: 8500, maxSpeed: 115, reverseMaxSpeed: 30, acceleration: 14, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.23, name: 'Titan Dump 10T', transmission: 'MANUAL' },
  truck_zil_dump: { type: 'truck_zil_dump', width: 25, length: 58, wheelBase: 35, mass: 4800, maxSpeed: 110, reverseMaxSpeed: 28, acceleration: 18, brakingForce: 195, friction: 0.981, turnSpeed: 3.6, maxSteerAngle: 0.64, minSteerAngle: 0.09, grip: 0.965, driftGrip: 0.25, name: 'Titan Quarry V8', transmission: 'MANUAL', color: '#0284c7', roofColor: '#f8fafc', dumpColor: '#d97706' },
  truck_semi: { type: 'truck_semi', width: 26, length: 64, wheelBase: 38, mass: 7500, maxSpeed: 125, reverseMaxSpeed: 30, acceleration: 18, brakingForce: 210, friction: 0.980, turnSpeed: 3.4, maxSteerAngle: 0.62, minSteerAngle: 0.08, grip: 0.960, driftGrip: 0.25, name: 'Titan Atlas 6x4 Prime Mover', transmission: 'MANUAL', hitchOffset: -12, color: '#d94e16' },
  trailer_semi: { type: 'trailer_semi', width: 26, length: 120, wheelBase: 80, mass: 6500, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 300, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.975, driftGrip: 0.30, name: 'IronForge Prime Flatbed Trailer', transmission: 'MANUAL', couplerOffset: 50, color: '#1e3a8a' },
  trailer_semi_box: { type: 'trailer_semi_box', width: 26, length: 124, wheelBase: 82, mass: 7200, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 320, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.975, driftGrip: 0.30, name: 'IronForge Thermo Reefer Trailer', transmission: 'MANUAL', couplerOffset: 50, color: '#f8fafc' },
  trailer_semi_tanker: { type: 'trailer_semi_tanker', width: 26, length: 120, wheelBase: 80, mass: 7800, massEmpty: 7800, maxSpeed: 115, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 340, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.970, driftGrip: 0.28, name: 'IronForge Hazmat Fuel Tanker 30m³', transmission: 'MANUAL', couplerOffset: 50, color: '#ea580c' },
  trailer_semi_container: { type: 'trailer_semi_container', width: 26, length: 126, wheelBase: 82, mass: 8500, maxSpeed: 120, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 330, friction: 0.980, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.975, driftGrip: 0.30, name: 'IronForge Intermodal Container 40ft', transmission: 'MANUAL', couplerOffset: 50, color: '#991b1b' },
  trailer_semi_lowboy: { type: 'trailer_semi_lowboy', width: 28, length: 130, wheelBase: 86, mass: 8900, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 0, brakingForce: 350, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.970, driftGrip: 0.28, name: 'IronForge Titan Lowboy 40T', transmission: 'MANUAL', couplerOffset: 54, color: '#d97706' },
  truck_tanker: { type: 'truck_tanker', width: 26, length: 76, wheelBase: 46, mass: 9200, maxSpeed: 110, reverseMaxSpeed: 30, acceleration: 12, brakingForce: 175, friction: 0.979, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.08, grip: 0.950, driftGrip: 0.22, name: 'Titan Fuel Tanker Hazmat', transmission: 'MANUAL' },
  truck_water: { type: 'truck_water', width: 25, length: 70, wheelBase: 43, mass: 8000, maxSpeed: 118, reverseMaxSpeed: 30, acceleration: 13, brakingForce: 180, friction: 0.980, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.955, driftGrip: 0.23, name: 'Titan Aqua Sprinkler', transmission: 'MANUAL' },
  truck_flatbed: { type: 'truck_flatbed', width: 25, length: 74, wheelBase: 45, mass: 7000, maxSpeed: 120, reverseMaxSpeed: 32, acceleration: 14, brakingForce: 185, friction: 0.981, turnSpeed: 3.2, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.958, driftGrip: 0.24, name: 'Titan Flatbed Cargo', transmission: 'MANUAL', color: '#0284c7' },
  truck_covered: { type: 'truck_covered', width: 25, length: 74, wheelBase: 45, mass: 7400, maxSpeed: 118, reverseMaxSpeed: 30, acceleration: 13, brakingForce: 180, friction: 0.981, turnSpeed: 3.1, maxSteerAngle: 0.60, minSteerAngle: 0.08, grip: 0.956, driftGrip: 0.23, name: 'Titan Canvas Transport', transmission: 'MANUAL', color: '#0284c7' },
  cement_mixer: { type: 'cement_mixer', width: 26, length: 72, wheelBase: 44, mass: 9800, maxSpeed: 105, reverseMaxSpeed: 28, acceleration: 11, brakingForce: 170, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.07, grip: 0.948, driftGrip: 0.21, name: 'Titan MixMaster 7m³', transmission: 'MANUAL' },
  garbage_truck: { type: 'garbage_truck', width: 26, length: 78, wheelBase: 46, mass: 10500, maxSpeed: 100, reverseMaxSpeed: 28, acceleration: 10, brakingForce: 175, friction: 0.978, turnSpeed: 3.0, maxSteerAngle: 0.58, minSteerAngle: 0.07, grip: 0.945, driftGrip: 0.20, name: 'Titan EcoPress Compactor', transmission: 'MANUAL' },
  // TRACTORS
  tractor_mtz82: { type: 'tractor_mtz82', width: 27, length: 54, wheelBase: 29, mass: 4000, maxSpeed: 70, reverseMaxSpeed: 25, acceleration: 42, brakingForce: 250, friction: 0.982, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.25, grip: 0.995, driftGrip: 0.45, name: 'AgriTech Fieldmaster 82 (4x4)', transmission: 'MANUAL' },
  tractor_mtz80: { type: 'tractor_mtz80', width: 26, length: 52, wheelBase: 28, mass: 3800, maxSpeed: 70, reverseMaxSpeed: 25, acceleration: 38, brakingForce: 240, friction: 0.982, turnSpeed: 5.0, maxSteerAngle: 0.72, minSteerAngle: 0.25, grip: 0.988, driftGrip: 0.40, name: 'AgriTech Workhorse 80', transmission: 'MANUAL' },
  tractor_mtz80_old: { type: 'tractor_mtz80_old', width: 25, length: 50, wheelBase: 27, mass: 3700, maxSpeed: 64, reverseMaxSpeed: 22, acceleration: 34, brakingForce: 220, friction: 0.980, turnSpeed: 4.8, maxSteerAngle: 0.72, minSteerAngle: 0.25, grip: 0.980, driftGrip: 0.38, name: 'AgriTech Veteran 80', transmission: 'MANUAL' },
  // MOTORCYCLES
  moto_izh_jupiter: { type: 'moto_izh_jupiter', width: 10, length: 24, wheelBase: 15, mass: 175, maxSpeed: 165, reverseMaxSpeed: 20, acceleration: 50, brakingForce: 260, friction: 0.990, turnSpeed: 6.2, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.985, driftGrip: 0.40, name: 'Stellar Cruiser 350', transmission: 'MANUAL' },
  moto_ural_sidecar: { type: 'moto_ural_sidecar', width: 19, length: 26, wheelBase: 16, mass: 350, maxSpeed: 145, reverseMaxSpeed: 25, acceleration: 42, brakingForce: 240, friction: 0.988, turnSpeed: 4.8, maxSteerAngle: 0.70, minSteerAngle: 0.15, grip: 0.978, driftGrip: 0.36, name: 'Stellar Outback Sidecar', transmission: 'MANUAL' },
  moto_jawa350: { type: 'moto_jawa350', width: 10, length: 24, wheelBase: 15, mass: 160, maxSpeed: 175, reverseMaxSpeed: 20, acceleration: 55, brakingForce: 270, friction: 0.990, turnSpeed: 6.4, maxSteerAngle: 0.72, minSteerAngle: 0.16, grip: 0.988, driftGrip: 0.42, name: 'Stellar Classic 350', transmission: 'MANUAL' },
  moto_sport: { type: 'moto_sport', width: 10, length: 23, wheelBase: 14, mass: 195, maxSpeed: 310, reverseMaxSpeed: 20, acceleration: 90, brakingForce: 350, friction: 0.994, turnSpeed: 7.2, maxSteerAngle: 0.65, minSteerAngle: 0.12, grip: 0.996, driftGrip: 0.50, name: 'Stellar Superbike 1000', transmission: 'MANUAL' },
  moto_chopper: { type: 'moto_chopper', width: 12, length: 28, wheelBase: 19, mass: 310, maxSpeed: 190, reverseMaxSpeed: 20, acceleration: 52, brakingForce: 260, friction: 0.990, turnSpeed: 5.0, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.982, driftGrip: 0.42, name: 'Stellar V-Twin Cruiser', transmission: 'MANUAL' },
  moped_soviet: { type: 'moped_soviet', width: 8, length: 20, wheelBase: 13, mass: 55, maxSpeed: 95, reverseMaxSpeed: 15, acceleration: 24, brakingForce: 190, friction: 0.988, turnSpeed: 6.8, maxSteerAngle: 0.75, minSteerAngle: 0.20, grip: 0.975, driftGrip: 0.35, name: 'Stellar Cub Moped 50cc', transmission: 'MANUAL' },
  trailer_barrel: { type: 'trailer_barrel', width: 22, length: 38, wheelBase: 16, mass: 1400, maxSpeed: 110, reverseMaxSpeed: 35, acceleration: 0, brakingForce: 140, friction: 0.986, turnSpeed: 3.5, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.982, driftGrip: 0.36, name: 'AgriTech FarmTank 3.5m³', transmission: 'MANUAL' },
  trailer_vacuum: { type: 'trailer_vacuum', width: 22, length: 45, wheelBase: 18, mass: 1480, maxSpeed: 110, reverseMaxSpeed: 35, acceleration: 0, brakingForce: 140, friction: 0.986, turnSpeed: 3.5, maxSteerAngle: 0, minSteerAngle: 0, grip: 0.982, driftGrip: 0.36, name: 'AgriTech SlurryVac Tanker', transmission: 'MANUAL' },
  trailer_flatbed_2axle: { type: 'trailer_flatbed_2axle', width: 26, length: 68, wheelBase: 38, mass: 2400, maxSpeed: 110, reverseMaxSpeed: 35, acceleration: 0, brakingForce: 200, friction: 0.985, turnSpeed: 3.5, maxSteerAngle: 0.65, minSteerAngle: 0.1, grip: 0.980, driftGrip: 0.35, name: 'AgriTech AgriDump 4T', transmission: 'MANUAL' },
  // ROAD CONSTRUCTION MACHINERY (Hydrostatic Transmission: Forward / Neutral / Reverse, no clutch)
  paver_asphalt_wheeled: { type: 'paver_asphalt_wheeled', width: 32, length: 64, wheelBase: 36, mass: 18500, maxSpeed: 16, reverseMaxSpeed: 10, acceleration: 12, brakingForce: 360, friction: 0.985, turnSpeed: 2.0, maxSteerAngle: 0.65, minSteerAngle: 0.25, grip: 0.999, driftGrip: 0.995, name: 'IronForge PaveMaster Hydro', transmission: 'AUTO' },
  roller_heavy_tandem: { type: 'roller_heavy_tandem', width: 28, length: 56, wheelBase: 34, mass: 12500, maxSpeed: 12, reverseMaxSpeed: 12, acceleration: 10, brakingForce: 380, friction: 0.988, turnSpeed: 1.8, maxSteerAngle: 0.70, minSteerAngle: 0.30, grip: 0.999, driftGrip: 0.995, name: 'IronForge Tandem Roll 12T', transmission: 'AUTO' },
  roller_compact_sidewalk: { type: 'roller_compact_sidewalk', width: 18, length: 32, wheelBase: 18, mass: 2200, maxSpeed: 10, reverseMaxSpeed: 10, acceleration: 14, brakingForce: 320, friction: 0.990, turnSpeed: 2.4, maxSteerAngle: 0.75, minSteerAngle: 0.35, grip: 0.999, driftGrip: 0.995, name: 'IronForge Sidewalk Compactor', transmission: 'AUTO' },
  roller_pneumatic: { type: 'roller_pneumatic', width: 28, length: 58, wheelBase: 36, mass: 14000, maxSpeed: 16, reverseMaxSpeed: 16, acceleration: 11, brakingForce: 350, friction: 0.988, turnSpeed: 1.9, maxSteerAngle: 0.65, minSteerAngle: 0.28, grip: 0.999, driftGrip: 0.995, name: 'IronForge Pneumatic Tire Roller', transmission: 'AUTO' },
  // ADDITIONAL CATALOG & SPECIAL VEHICLE TYPES
  wagon_allroad: { type: 'wagon_allroad', width: 21, length: 45, wheelBase: 27, mass: 1300, maxSpeed: 182, reverseMaxSpeed: 45, acceleration: 32, brakingForce: 250, friction: 0.988, turnSpeed: 4.2, maxSteerAngle: 0.68, minSteerAngle: 0.14, grip: 0.986, driftGrip: 0.38, name: 'Nordic Cross Country SW', transmission: 'MANUAL' },
  bus_minibus: { type: 'bus_minibus', width: 24, length: 62, wheelBase: 38, mass: 2900, maxSpeed: 135, reverseMaxSpeed: 38, acceleration: 20, brakingForce: 220, friction: 0.984, turnSpeed: 3.6, maxSteerAngle: 0.64, minSteerAngle: 0.10, grip: 0.970, driftGrip: 0.28, name: 'Metro Shuttle 18-Seater', transmission: 'MANUAL' },
  muscle: { type: 'muscle', width: 22, length: 49, wheelBase: 30, mass: 1650, maxSpeed: 230, reverseMaxSpeed: 50, acceleration: 52, brakingForce: 250, friction: 0.988, turnSpeed: 4.0, maxSteerAngle: 0.65, minSteerAngle: 0.12, grip: 0.980, driftGrip: 0.44, name: 'Detroit Rebel V8 1969', transmission: 'MANUAL' },
  fire_rescue: { type: 'fire_rescue', width: 24, length: 58, wheelBase: 34, mass: 3500, maxSpeed: 150, reverseMaxSpeed: 40, acceleration: 26, brakingForce: 240, friction: 0.985, turnSpeed: 3.8, maxSteerAngle: 0.65, minSteerAngle: 0.11, grip: 0.975, driftGrip: 0.32, name: 'Sentinel Rapid Response Unit', transmission: 'MANUAL' },
  ambulance_van: { type: 'ambulance_van', width: 23, length: 54, wheelBase: 32, mass: 2800, maxSpeed: 155, reverseMaxSpeed: 40, acceleration: 24, brakingForce: 220, friction: 0.984, turnSpeed: 3.7, maxSteerAngle: 0.64, minSteerAngle: 0.11, grip: 0.972, driftGrip: 0.30, name: 'Sentinel Critical Care Van', transmission: 'MANUAL' },
  ambulance_suv: { type: 'ambulance_suv', width: 22, length: 48, wheelBase: 29, mass: 2200, maxSpeed: 165, reverseMaxSpeed: 42, acceleration: 28, brakingForce: 230, friction: 0.985, turnSpeed: 3.9, maxSteerAngle: 0.66, minSteerAngle: 0.12, grip: 0.978, driftGrip: 0.34, name: 'Sentinel Rescue 4x4', transmission: 'MANUAL' }
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
    'truck_water', 'truck_tanker', 'truck_flatbed', 'truck_covered', 'truck_dump', 'truck_zil_dump', 
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
    type === 'truck_zil_dump' || 
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

/**
 * Returns authentic turn signal specifications per vehicle model/archetype
 */
export function getVehicleTurnSignalConfig(type?: CarType): VehicleTurnSignalConfig {
  const t = type || 'sedan';

  // 1. Dynamic Sequential Sweeping LED ("Светодиодная змейка") - Luxury & Modern High-End
  if (['sedan_luxury', 'suv_luxury', 'wagon_modern', 'wagon_allroad', 'supercar', 'coupe_gt'].includes(t)) {
    return {
      type: 'dynamic_sequential_led',
      baseFrequency: 1.30, // ~78 BPM luxury sweeping cadence
      dutyCycle: 0.54,
      sweepDuration: 0.28, // 280ms progressive outward cascade
      hasSideMirrorRepeaters: true,
      hasFenderRepeaters: false,
      repeaterStyle: 'mirror_led_dynamic',
      soundType: 'luxury_acoustic'
    };
  }

  // 2. Crisp Instant Digital LED Matrix - Sports cars, modern crossovers, emergency vehicles
  if (['sports', 'hatch_hot', 'police', 'ambulance', 'ambulance_van', 'ambulance_suv', 'suv', 'crossover_compact', 'sedan_compact', 'moto_sport'].includes(t)) {
    return {
      type: 'led_crisp',
      baseFrequency: 1.62, // ~97 BPM modern crisp strobe
      dutyCycle: 0.50,
      sweepDuration: 0,
      hasSideMirrorRepeaters: ['sports', 'police', 'ambulance_suv', 'crossover_compact', 'suv'].includes(t),
      hasFenderRepeaters: ['ambulance', 'ambulance_van', 'sedan_compact'].includes(t),
      repeaterStyle: ['sports', 'police', 'ambulance_suv', 'crossover_compact', 'suv'].includes(t) ? 'mirror_led_static' : 'fender_rect',
      soundType: 'electronic_click'
    };
  }

  // 3. Vintage / Classic Incandescent Filament Bulbs (Теплый нагрев и плавное угасание вольфрамовой нити, биметаллическое реле)
  if ([
    'sedan_classic', 'wagon_classic', 'classic_compact', 'retro_bubble', 'liftback_tavria',
    'sedan_samara', 'hatch_samara', 'sedan_nexia', 'van_cargo_old', 'micro_car', 'muscle_classic',
    'tractor_mtz80', 'tractor_mtz80_old', 'tractor_mtz82',
    'moto_izh_jupiter', 'moto_ural_sidecar', 'moto_jawa350', 'moto_chopper'
  ].includes(t)) {
    const isTractorOrBike = t.startsWith('tractor_') || t.startsWith('moto_');
    return {
      type: 'incandescent_classic',
      baseFrequency: isTractorOrBike ? 1.36 : 1.44, // ~82-86 BPM warm analog relay cadence
      dutyCycle: 0.56, // Characteristic longer glow phase
      sweepDuration: 0,
      hasSideMirrorRepeaters: false,
      hasFenderRepeaters: !isTractorOrBike,
      repeaterStyle: ['classic_compact', 'retro_bubble', 'sedan_classic', 'wagon_classic'].includes(t) ? 'fender_round' : 'fender_rect',
      soundType: 'bimetal_relay'
    };
  }

  // 4. Modern Halogen/Incandescent with Electronic BCM Relay (Стандартные иномарки 2000-2015, коммерческие грузовики, автобусы)
  return {
    type: 'incandescent_modern',
    baseFrequency: 1.52, // ~91 BPM standard automotive cadence
    dutyCycle: 0.50,
    sweepDuration: 0,
    hasSideMirrorRepeaters: ['sedan_polo', 'taxi'].includes(t),
    hasFenderRepeaters: !['sedan_polo'].includes(t) && !t.startsWith('trailer_'),
    repeaterStyle: ['sedan_polo', 'taxi'].includes(t) ? 'mirror_led_static' : 'fender_rect',
    soundType: 'bcm_relay'
  };
}

export interface VehicleTurnSignalDynamicState {
  intensity: number;          // 0.0 to 1.0 (actual optical brightness with filament thermal inertia)
  sweepProgress: number;      // 0.0 to 1.0 (for dynamic sequential LED "snake" sweep)
  isBlinkingActive: boolean;  // whether turnSignal is active ('left' | 'right' | 'hazard')
  isPhaseOn: boolean;         // logical high in flash cycle
  isTick: boolean;            // frame where relay switches ON
  isTock: boolean;            // frame where relay switches OFF
  frequency: number;          // actual effective frequency in Hz (includes hyperflash & voltage)
  config: VehicleTurnSignalConfig;
}

/**
 * Computes instantaneous turn signal optical intensity, sweeping animation progress,
 * and audio relay tick/tock events based on real vehicle physics and lighting technology.
 */
export function getVehicleTurnSignalDynamicState(
  car: Vehicle,
  externalTimer?: number
): VehicleTurnSignalDynamicState {
  const config = getVehicleTurnSignalConfig(car.type);
  const isBlinkingActive = car.turnSignal !== 'none';

  if (!isBlinkingActive) {
    return {
      intensity: 0,
      sweepProgress: 0,
      isBlinkingActive: false,
      isPhaseOn: false,
      isTick: false,
      isTock: false,
      frequency: config.baseFrequency,
      config
    };
  }

  // 1. Subtle per-vehicle ID hash variance (+-4%) to avoid synchronized robotic NPC flashing
  let idHash = 0;
  if (car.id) {
    for (let i = 0; i < car.id.length; i++) {
      idHash = (idHash * 31 + car.id.charCodeAt(i)) % 1000;
    }
  }
  const varianceFactor = 0.96 + (idHash / 1000) * 0.08;

  // 2. Realistic Hyper-Flash (Частое мигание при перегорании одной из ламп в цепи)
  let isHyperflash = false;
  if (car.turnSignal === 'left' && (car.damage?.leftHeadlightBroken || car.damage?.leftTaillightBroken)) {
    isHyperflash = true;
  } else if (car.turnSignal === 'right' && (car.damage?.rightHeadlightBroken || car.damage?.rightTaillightBroken)) {
    isHyperflash = true;
  }

  const effectiveFrequency = (config.baseFrequency * varianceFactor) * (isHyperflash ? 2.15 : 1.0);
  const period = 1.0 / effectiveFrequency;

  const timer = externalTimer !== undefined ? externalTimer : (car.turnSignalTimer || 0);
  const cyclePhase = ((timer % period) + period) % period; // 0 to period
  const normalizedPhase = cyclePhase / period;              // 0.0 to 1.0

  const onDuration = period * config.dutyCycle;
  const isPhaseOn = cyclePhase < onDuration;

  let intensity = 0;
  let sweepProgress = 0;

  if (config.type === 'dynamic_sequential_led') {
    // Dynamic Sweeping Sequential LED ("Змейка")
    if (isPhaseOn) {
      const sweepDur = Math.min(config.sweepDuration, onDuration * 0.85);
      sweepProgress = Math.max(0, Math.min(1.0, cyclePhase / Math.max(0.01, sweepDur)));
      intensity = 1.0;
    } else {
      sweepProgress = 0;
      intensity = 0;
    }
  } else if (config.type === 'led_crisp') {
    // Instant Crisp Digital Square Wave (0ms rise / 0ms decay)
    intensity = isPhaseOn ? 1.0 : 0.0;
    sweepProgress = isPhaseOn ? 1.0 : 0.0;
  } else if (config.type === 'incandescent_classic') {
    // Classic Incandescent Filament (Thermal inertia: ~60ms rise, ~110ms decay)
    if (isPhaseOn) {
      const tRise = cyclePhase;
      intensity = Math.min(1.0, 1.0 - Math.exp(-tRise / 0.055));
    } else {
      const tDecay = cyclePhase - onDuration;
      intensity = Math.max(0.0, Math.exp(-tDecay / 0.085));
    }
    sweepProgress = intensity;
  } else {
    // Modern Incandescent / Halogen (Fast rise ~30ms, fast decay ~50ms)
    if (isPhaseOn) {
      const tRise = cyclePhase;
      intensity = Math.min(1.0, 1.0 - Math.exp(-tRise / 0.030));
    } else {
      const tDecay = cyclePhase - onDuration;
      intensity = Math.max(0.0, Math.exp(-tDecay / 0.050));
    }
    sweepProgress = intensity;
  }

  // Edge detection for audio clicks
  const prevPhase = (((timer - 0.016) % period) + period) % period;
  const prevIsOn = prevPhase < onDuration;
  const isTick = isPhaseOn && !prevIsOn;
  const isTock = !isPhaseOn && prevIsOn;

  return {
    intensity,
    sweepProgress,
    isBlinkingActive: true,
    isPhaseOn,
    isTick,
    isTock,
    frequency: effectiveFrequency,
    config
  };
}

export type HeadlightBulbType = 'vintage_sealed_beam' | 'halogen_standard' | 'hid_xenon' | 'led_matrix';

export interface VehicleHeadlightConfig {
  bulbType: HeadlightBulbType;
  riseTime: number;   // seconds to warm up / fade in
  decayTime: number;  // seconds to cool down / fade out
  colorTemp: string;
  hasIgnitionFlicker: boolean;
}

export interface VehicleHeadlightDynamicState {
  intensity: number;      // 0.0 to 1.0 optical brightness with thermal inertia
  isOn: boolean;
  config: VehicleHeadlightConfig;
}

export function getVehicleHeadlightConfig(type?: CarType): VehicleHeadlightConfig {
  const t = type || 'sedan';
  if (['tractor_mtz80', 'tractor_mtz80_old', 'tractor_mtz82', 'sedan_classic', 'classic_compact', 'retro_bubble', 'van_cargo_old', 'suv_classic_box', 'muscle_classic'].includes(t)) {
    return {
      bulbType: 'vintage_sealed_beam',
      riseTime: 0.28,
      decayTime: 0.40,
      colorTemp: '#fef08a',
      hasIgnitionFlicker: false
    };
  }
  if (['sedan_luxury', 'supercar', 'sports', 'coupe_gt', 'police'].includes(t)) {
    return {
      bulbType: 'hid_xenon',
      riseTime: 0.35,
      decayTime: 0.22,
      colorTemp: '#f0fdf4',
      hasIgnitionFlicker: true
    };
  }
  if (['hatch_hot', 'crossover_compact', 'suv', 'van', 'sedan_compact', 'wagon_allroad'].includes(t)) {
    return {
      bulbType: 'led_matrix',
      riseTime: 0.04,
      decayTime: 0.06,
      colorTemp: '#ffffff',
      hasIgnitionFlicker: false
    };
  }
  return {
    bulbType: 'halogen_standard',
    riseTime: 0.18,
    decayTime: 0.26,
    colorTemp: '#fef3c7',
    hasIgnitionFlicker: false
  };
}

export function getVehicleHeadlightDynamicState(car: Vehicle, dt: number = 0.016): VehicleHeadlightDynamicState {
  const config = getVehicleHeadlightConfig(car.type);
  const targetOn = !!car.headlightsOn;

  if (car.headlightIntensity === undefined) {
    car.headlightIntensity = targetOn ? 1.0 : 0.0;
  }

  let intensity = car.headlightIntensity;

  if (targetOn) {
    const rate = 1.0 / Math.max(0.01, config.riseTime);
    intensity = Math.min(1.0, intensity + rate * dt);

    if (config.hasIgnitionFlicker && intensity > 0.12 && intensity < 0.82) {
      const flicker = Math.sin(Date.now() * 0.04) * 0.14;
      intensity = Math.max(0.05, Math.min(1.0, intensity + flicker));
    }
  } else {
    const rate = 1.0 / Math.max(0.01, config.decayTime);
    intensity = Math.max(0.0, intensity - rate * dt);
  }

  car.headlightIntensity = intensity;

  return {
    intensity,
    isOn: targetOn,
    config
  };
}



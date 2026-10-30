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
import { createNodeBeamForVehicle, registerNodeBeamBuilder } from './nodeBeamRegistry';
import {
  MASTER_VEHICLE_CONFIGS,
  type MasterVehicleConfig,
  getMasterVehicleConfig,
  type VehicleBodyPanelsConfig,
  type VehicleDiffLockCapabilities,
  type VehicleHeadlightConfig,
  type HeadlightBulbType
} from './vehicleMasterRegistry';

export {
  isTrailerVehicle,
  isRoadMachinery,
  isMotorcycle,
  isTractorVehicle,
  createNodeBeamForVehicle,
  registerNodeBeamBuilder,
  MASTER_VEHICLE_CONFIGS,
  type MasterVehicleConfig,
  getMasterVehicleConfig,
  type VehicleBodyPanelsConfig,
  type VehicleDiffLockCapabilities,
  type VehicleHeadlightConfig,
  type HeadlightBulbType
};

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


export function getVehicleBodyPanelsConfig(type?: string): VehicleBodyPanelsConfig {
  if (!type) {
    return { hasHood: true, hasFrontBumper: true, hasRearBumper: true, hasFenders: true, hasDoors: true, hasTrunk: true };
  }
  const cfg = MASTER_VEHICLE_CONFIGS[type as CarType];
  return cfg?.bodyPanels || {
    hasHood: true,
    hasFrontBumper: true,
    hasRearBumper: true,
    hasFenders: true,
    hasDoors: true,
    hasTrunk: true
  };
}

export function getLPGDefaultCapacity(type: string): number {
  const cfg = MASTER_VEHICLE_CONFIGS[type as CarType];
  return cfg?.lpgCapacity ?? 55;
}

export function createDefaultFluidTank(type: CarType): FluidStorageTank | undefined {
  const cfg = MASTER_VEHICLE_CONFIGS[type];
  if (cfg?.fluidTank) {
    return { ...cfg.fluidTank };
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
  const cfg = MASTER_VEHICLE_CONFIGS[type as CarType];
  return cfg?.driveType || 'FWD';
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

export const CAR_CONFIGS: Record<string, CarConfig> = MASTER_VEHICLE_CONFIGS;

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
  const cfg = MASTER_VEHICLE_CONFIGS[type as CarType];
  const cosA = Math.cos(veh.angle);
  const sinA = Math.sin(veh.angle);
  const L = veh.length;
  const W = veh.width;

  const localF = (cfg?.fuelCapOffset?.localFFrac ?? -0.35) * L;
  const localR = (cfg?.fuelCapOffset?.localRFrac ?? 0.45) * W;

  const x = veh.x + cosA * localF - sinA * localR;
  const y = veh.y + sinA * localF + cosA * localR;

  return { x, y, localF, localR };
}

export function hasRoadTrainLights(car: Vehicle | CarType | string | null | undefined): boolean {
  if (!car) return false;
  const typeStr = typeof car === 'string' ? car : (car.type || '');
  if (typeStr.startsWith('trailer_')) return false;

  const cfg = MASTER_VEHICLE_CONFIGS[typeStr as CarType];
  if (cfg?.hasRoadTrainLights) return true;

  if (typeof car === 'object' && car !== null) {
    if (car.trailerId || car.roadTrainLightsOn) return true;
  }
  return false;
}

/**
 * Returns differential lock capabilities by vehicle archetype.
 * Strictly available ONLY for supported real-world offroaders, heavy commercial trucks, and tractors.
 */
export function getVehicleDiffCapabilities(carType: string): VehicleDiffLockCapabilities {
  const cfg = MASTER_VEHICLE_CONFIGS[carType as CarType];
  return cfg?.diffCapabilities || {
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
  const cfg = MASTER_VEHICLE_CONFIGS[t];
  return cfg?.turnSignalConfig || {
    type: 'incandescent_modern',
    baseFrequency: 1.52,
    dutyCycle: 0.50,
    sweepDuration: 0,
    hasSideMirrorRepeaters: false,
    hasFenderRepeaters: true,
    repeaterStyle: 'fender_rect',
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



export interface VehicleHeadlightDynamicState {
  intensity: number;      // 0.0 to 1.0 optical brightness with thermal inertia
  isOn: boolean;
  config: VehicleHeadlightConfig;
}

export function getVehicleHeadlightConfig(type?: CarType): VehicleHeadlightConfig {
  const t = type || 'sedan';
  const cfg = MASTER_VEHICLE_CONFIGS[t];
  return cfg?.headlightConfig || {
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



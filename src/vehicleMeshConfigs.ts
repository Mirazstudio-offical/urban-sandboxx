import { densifyClosedPerimeter } from './perimeterDensify';
import { VehicleNodeBeamDefinition, CarType } from './types';
import { generateBodyMesh } from './meshes/bodyMeshGenerator';
import { MASTER_VEHICLE_CONFIGS } from './vehicleMasterRegistry';

// Re-export common stiffness factors
export {
  DEFAULT_K_STRUCTURAL,
  DEFAULT_C_STRUCTURAL,
  DEFAULT_K_CHASSIS,
  DEFAULT_C_CHASSIS,
  DEFAULT_K_CROSS,
  DEFAULT_C_CROSS,
  DEFAULT_K_SUPPORT,
  DEFAULT_C_SUPPORT,
  DEFAULT_K_LATCH,
  DEFAULT_C_LATCH
} from './meshes/meshCommon';

export {
  PRESET_MOTO_SIDECAR,
  PRESET_MOTORCYCLE,
  PRESET_TRAILER
} from './meshes/meshSpecial';

import {
  PRESET_MOTO_SIDECAR,
  PRESET_MOTORCYCLE,
  PRESET_TRAILER
} from './meshes/meshSpecial';

/**
 * ============================================================================
 * INDIVIDUAL VEHICLE SOFTBODY REGISTRY
 * ============================================================================
 *
 * Каждое транспортное средство строится по СВОЕМУ СОБСТВЕННОМУ контуру
 * и индивидуальной силовой схеме chassisAnatomy.
 * Никаких обобщенных групп пресетов или принудительного разделения одной топологии.
 */
const MESH_CACHE = new Map<string, VehicleNodeBeamDefinition>();

/**
 * Resolves the Node-Beam definition for a vehicle.
 * Directly builds or retrieves the vehicle's unique softbody mesh from its master configuration.
 */
export function getVehicleNodeBeamDefinition(
  carType?: string,
  customOverride?: Partial<VehicleNodeBeamDefinition>
): VehicleNodeBeamDefinition {
  const typeKey = (carType || 'sedan') as CarType;

  let baseDef = MESH_CACHE.get(typeKey);
  if (!baseDef) {
    const cfg = MASTER_VEHICLE_CONFIGS[typeKey] || MASTER_VEHICLE_CONFIGS['sedan'];
    const anatomy = cfg.chassisAnatomy;

    if (anatomy?.specialPreset === 'moto_sidecar') {
      baseDef = densifyClosedPerimeter(PRESET_MOTO_SIDECAR);
    } else if (anatomy?.specialPreset === 'motorcycle') {
      baseDef = densifyClosedPerimeter(PRESET_MOTORCYCLE);
    } else if (anatomy?.specialPreset === 'trailer') {
      baseDef = densifyClosedPerimeter(PRESET_TRAILER);
    } else {
      const generated = generateBodyMesh({
        presetId: typeKey,
        name: cfg.nameRu || cfg.name,
        repType: typeKey,
        length: cfg.length,
        width: cfg.width,
        xNose: anatomy.xNose ?? 0.50,
        xCowl: anatomy.xCowl ?? 0.15,
        xA: anatomy.xA ?? 0.07,
        xB: anatomy.xB ?? -0.03,
        xC: anatomy.xC ?? -0.12,
        xRearHeader: anatomy.xRearHeader ?? -0.21,
        xTail: anatomy.xTail ?? -0.50,
        xFrontAxle: anatomy.xFrontAxle ?? 0.29,
        xRearAxle: anatomy.xRearAxle ?? -0.28,
        xEngine: anatomy.xEngine ?? 0.21,
        xCore: anatomy.xCore ?? -0.02,
        frameRatio: anatomy.frameRatio,
        railRatio: anatomy.railRatio,
        frameMaxHalfWidth: anatomy.frameMaxHalfWidth
      });
      baseDef = generated.def;
    }
    MESH_CACHE.set(typeKey, baseDef);
  }

  if (!customOverride) {
    return baseDef;
  }

  // Merge custom overrides
  return {
    ...baseDef,
    ...customOverride,
    nodes: customOverride.nodes ? customOverride.nodes : baseDef.nodes,
    beams: customOverride.beams ? customOverride.beams : baseDef.beams,
    tracking: {
      ...baseDef.tracking,
      ...(customOverride.tracking || {})
    }
  };
}

/**
 * Registers or updates a vehicle mesh preset in the runtime registry.
 */
export function registerVehicleMeshPreset(presetId: string, definition: VehicleNodeBeamDefinition): void {
  MESH_CACHE.set(presetId, definition);
}

/**
 * Returns a list of all currently registered mesh presets.
 */
export function listAllMeshPresets(): VehicleNodeBeamDefinition[] {
  for (const key of Object.keys(MASTER_VEHICLE_CONFIGS)) {
    getVehicleNodeBeamDefinition(key);
  }
  return Array.from(MESH_CACHE.values());
}

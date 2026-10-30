import { densifyClosedPerimeter } from './perimeterDensify';
import { VehicleNodeBeamDefinition } from './types';

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

// Re-export all model-based presets
export {
  PRESET_SEDAN,
  PRESET_WAGON,
  PRESET_HATCHBACK_COMPACT,
  PRESET_MUSCLE,
  PRESET_SUPERCAR
} from './meshes/meshPassenger';

export {
  PRESET_PICKUP,
  PRESET_SUV_4X4,
  PRESET_VAN,
  PRESET_CAMPERVAN,
  PRESET_TRUCK_HOODED_GAZ53,
  PRESET_TRUCK_ZIL_DUMP,
  PRESET_TRUCK_CABOVER,
  PRESET_SEMI_TRACTOR,
  PRESET_BUS
} from './meshes/meshCommercial';

export {
  PRESET_TRACTOR,
  PRESET_PAVER,
  PRESET_ROLLER,
  PRESET_MOTO_SIDECAR,
  PRESET_MOTORCYCLE,
  PRESET_TRAILER
} from './meshes/meshSpecial';

import {
  PRESET_SEDAN,
  PRESET_WAGON,
  PRESET_HATCHBACK_COMPACT,
  PRESET_MUSCLE,
  PRESET_SUPERCAR
} from './meshes/meshPassenger';

import {
  PRESET_PICKUP,
  PRESET_SUV_4X4,
  PRESET_VAN,
  PRESET_CAMPERVAN,
  PRESET_TRUCK_HOODED_GAZ53,
  PRESET_TRUCK_ZIL_DUMP,
  PRESET_TRUCK_CABOVER,
  PRESET_SEMI_TRACTOR,
  PRESET_BUS
} from './meshes/meshCommercial';

import {
  PRESET_TRACTOR,
  PRESET_PAVER,
  PRESET_ROLLER,
  PRESET_MOTO_SIDECAR,
  PRESET_MOTORCYCLE,
  PRESET_TRAILER
} from './meshes/meshSpecial';

/**
 * ============================================================================
 * PRESET REGISTRY & VEHICLE TYPE RESOLVER
 * ============================================================================
 */
const MESH_PRESET_REGISTRY = new Map<string, VehicleNodeBeamDefinition>();

// Register all archetype presets
const ALL_RAW_PRESETS: VehicleNodeBeamDefinition[] = [
  PRESET_SEDAN,
  PRESET_WAGON,
  PRESET_HATCHBACK_COMPACT,
  PRESET_MUSCLE,
  PRESET_SUPERCAR,
  PRESET_PICKUP,
  PRESET_SUV_4X4,
  PRESET_VAN,
  PRESET_CAMPERVAN,
  PRESET_TRUCK_HOODED_GAZ53,
  PRESET_TRUCK_ZIL_DUMP,
  PRESET_TRUCK_CABOVER,
  PRESET_SEMI_TRACTOR,
  PRESET_BUS,
  PRESET_TRACTOR,
  PRESET_PAVER,
  PRESET_ROLLER,
  PRESET_MOTO_SIDECAR,
  PRESET_MOTORCYCLE,
  PRESET_TRAILER
];

for (const preset of ALL_RAW_PRESETS) {
  MESH_PRESET_REGISTRY.set(preset.presetId, densifyClosedPerimeter(preset));
}

/**
 * Maps every game vehicle model type (carType) to its anatomically accurate softbody preset.
 */
export const VEHICLE_TYPE_TO_PRESET_MAP: Record<string, string> = {
  // 1. Sedans (3-Box Notchback Unibody)
  sedan: 'sedan_standard',
  sedan_classic: 'sedan_standard',
  sedan_luxury: 'sedan_standard',
  sedan_compact: 'sedan_standard',
  classic_compact: 'sedan_standard',
  taxi: 'sedan_standard',
  police: 'sedan_standard',
  sedan_logan: 'sedan_standard',
  sedan_nexia: 'sedan_standard',
  sedan_accent: 'sedan_standard',
  sedan_polo: 'sedan_standard',
  sedan_samara: 'sedan_standard',

  // 2. Station Wagons / Estates (2-Box Full Estate)
  wagon_classic: 'wagon_estate',
  wagon_modern: 'wagon_estate',
  wagon_allroad: 'wagon_estate',

  // 3. Compact Hatchbacks & 2-Box Monocoque
  hatchback: 'hatchback_compact',
  hatch_hot: 'hatchback_compact',
  compact_matiz: 'hatchback_compact',
  liftback_tavria: 'hatchback_compact',
  hatch_samara: 'hatchback_compact',
  micro_car: 'hatchback_compact',
  retro_bubble: 'hatchback_compact',

  // 4. Pickup Trucks (Body-on-frame with recessed open bed)
  pickup: 'pickup_truck',
  pickup_heavy: 'pickup_truck',

  // 5. SUVs & Hardcore 4x4 Off-Roaders (High stance & upright body)
  suv: 'suv_boxy_4x4',
  suv_luxury: 'suv_boxy_4x4',
  suv_classic_box: 'suv_boxy_4x4',
  offroad_hardcore: 'suv_boxy_4x4',
  crossover_compact: 'suv_boxy_4x4',
  ambulance_suv: 'suv_boxy_4x4',

  // 6. Vans, Minibuses & Delivery (1-Box Cabover Vault)
  van: 'van_cabover_box',
  bus_minibus: 'van_cabover_box',
  van_cargo_old: 'van_cabover_box',
  ambulance_van: 'van_cabover_box',
  ambulance: 'van_cabover_box',
  delivery_truck: 'van_cabover_box',
  truck_armored: 'van_cabover_box',

  // 7. Campervan Motorhome RV
  van_camper: 'van_camper_rv',

  // 8. Muscle Cars (Long Snout, Huge V8, Flared Rear Quarters)
  muscle: 'muscle_long_hood',
  muscle_classic: 'muscle_long_hood',

  // 9. Supercars & Sportscars (Mid-Rear Engine Carbon Monocoque)
  supercar: 'supercar_mid_engine',
  sports: 'supercar_mid_engine',
  coupe_gt: 'supercar_mid_engine',

  // 10. Medium Hooded Trucks (GAZ-53 Tapered Hood & Flatbed Platform)
  truck_flatbed: 'truck_hooded_gaz53',
  truck_covered: 'truck_hooded_gaz53',
  truck_tow: 'truck_hooded_gaz53',

  // 11. Short-Wheelbase Tipper Dump Truck (ZIL-130 Rounded Snout & Tipper)
  truck_zil_dump: 'truck_zil_dump',

  // 12. Heavy Commercial Cabover Trucks (Dual C-Channel Ladder Frame)
  truck_dump: 'truck_cabover_heavy',
  truck_box: 'truck_cabover_heavy',
  truck_tanker: 'truck_cabover_heavy',
  truck_water: 'truck_cabover_heavy',
  cement_mixer: 'truck_cabover_heavy',
  garbage_truck: 'truck_cabover_heavy',
  fire_engine: 'truck_cabover_heavy',
  fire_ladder: 'truck_cabover_heavy',
  fire_rescue: 'truck_cabover_heavy',

  // 13. Semi-Truck Tractor (KAMAZ-5410 Sleeper Cab & Open 5th-Wheel Frame)
  truck_semi: 'truck_semi_tractor',

  // 14. Full-Length Transit Bus
  bus: 'bus_transit_monocoque',

  // 15. Agricultural Tractors (Cast Iron Backbone MTZ)
  tractor_mtz80: 'tractor_backbone',
  tractor_mtz82: 'tractor_backbone',
  tractor_mtz80_old: 'tractor_backbone',

  // 16. Wheeled Asphalt Paver
  paver_asphalt_wheeled: 'paver_asphalt_wheeled',

  // 17. Articulated Road Rollers
  roller_heavy_tandem: 'roller_articulated_tandem',
  roller_compact_sidewalk: 'roller_articulated_tandem',
  roller_pneumatic: 'roller_articulated_tandem',

  // 18. Ural Motorcycle with Sidecar (Asymmetric 2-Track)
  moto_ural_sidecar: 'moto_ural_sidecar',

  // 19. Solo Motorcycles & Mopeds
  moto_izh_jupiter: 'motorcycle_cradle',
  moto_jawa350: 'motorcycle_cradle',
  moto_sport: 'motorcycle_cradle',
  moto_chopper: 'motorcycle_cradle',
  moped_soviet: 'motorcycle_cradle',

  // 20. Trailers
  trailer_flatbed_2axle: 'trailer_chassis',
  trailer_barrel: 'trailer_chassis',
  trailer_vacuum: 'trailer_chassis',
  trailer_semi: 'trailer_chassis',
  trailer_semi_box: 'trailer_chassis',
  trailer_semi_tanker: 'trailer_chassis',
  trailer_semi_container: 'trailer_chassis',
  trailer_semi_lowboy: 'trailer_chassis'
};

/**
 * Registers or updates a vehicle mesh preset in the runtime registry.
 */
export function registerVehicleMeshPreset(presetId: string, definition: VehicleNodeBeamDefinition): void {
  MESH_PRESET_REGISTRY.set(presetId, definition);
}

/**
 * Returns a list of all currently registered mesh presets.
 */
export function listAllMeshPresets(): VehicleNodeBeamDefinition[] {
  return Array.from(MESH_PRESET_REGISTRY.values());
}

/**
 * Resolves the Node-Beam definition for a vehicle.
 * Checks for per-vehicle custom override first, then archetype mapping, falling back to sedan.
 */
export function getVehicleNodeBeamDefinition(
  carType?: string,
  customOverride?: Partial<VehicleNodeBeamDefinition>
): VehicleNodeBeamDefinition {
  const presetKey = carType ? VEHICLE_TYPE_TO_PRESET_MAP[carType] || carType : 'sedan_standard';
  const baseDef = MESH_PRESET_REGISTRY.get(presetKey) || densifyClosedPerimeter(PRESET_SEDAN);

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

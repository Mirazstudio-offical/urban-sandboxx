import type { BodyFamilySpec } from './bodyMeshGenerator';

/**
 * Якоря семейств кузовов для генератора сеток. Для каждого семейства задаются только
 * продольные положения ключевых элементов (доли длины, +0.5 перед), остальное сетка берёт
 * из контура модели (getVehicleBasePolygon для repType).
 *
 * Семейства, которые не рисуются контуром легковых/грузовых кузовов (мотоциклы, прицепы),
 * здесь не перечислены — для них сохранены прежние пресеты.
 */
export const BODY_FAMILIES: BodyFamilySpec[] = [
  // --- Легковые ---
  { presetId: 'sedan_standard', name: 'Sedan (3-box notchback)', repType: 'sedan', length: 42, width: 20,
    xNose: 0.50, xCowl: 0.15, xA: 0.07, xB: -0.03, xC: -0.12, xRearHeader: -0.21, xTail: -0.50,
    xFrontAxle: 0.29, xRearAxle: -0.28, xEngine: 0.21, xCore: -0.02 },
  { presetId: 'wagon_estate', name: 'Estate wagon (2-box)', repType: 'wagon_classic', length: 44, width: 20,
    xNose: 0.50, xCowl: 0.15, xA: 0.07, xB: -0.04, xC: -0.22, xRearHeader: -0.26, xTail: -0.50,
    xFrontAxle: 0.28, xRearAxle: -0.3, xEngine: 0.20, xCore: -0.04 },
  { presetId: 'hatchback_compact', name: 'Compact hatchback', repType: 'hatchback', length: 38, width: 19,
    xNose: 0.50, xCowl: 0.20, xA: 0.08, xB: -0.06, xC: -0.20, xRearHeader: -0.30, xTail: -0.50,
    xFrontAxle: 0.30, xRearAxle: -0.30, xEngine: 0.25, xCore: -0.04 },
  { presetId: 'muscle_long_hood', name: 'Muscle car (long hood, fastback)', repType: 'muscle', length: 49, width: 22,
    xNose: 0.50, xCowl: 0.08, xA: 0.02, xB: -0.12, xC: -0.22, xRearHeader: -0.26, xTail: -0.50,
    xFrontAxle: 0.30, xRearAxle: -0.3, xEngine: 0.22, xCore: -0.08 },
  { presetId: 'supercar_mid_engine', name: 'Supercar (mid engine)', repType: 'supercar', length: 45, width: 22,
    xNose: 0.50, xCowl: 0.26, xA: 0.16, xB: -0.06, xC: -0.16, xRearHeader: -0.24, xTail: -0.50,
    xFrontAxle: 0.30, xRearAxle: -0.28, xEngine: -0.17, xCore: -0.02, frameRatio: 0.70 },
  { presetId: 'suv_boxy_4x4', name: 'Boxy SUV / 4x4', repType: 'suv', length: 42, width: 21,
    xNose: 0.50, xCowl: 0.22, xA: 0.17, xB: -0.02, xC: -0.30, xRearHeader: -0.36, xTail: -0.50,
    xFrontAxle: 0.30, xRearAxle: -0.29, xEngine: 0.26, xCore: -0.06, frameRatio: 0.80 },
  { presetId: 'pickup_truck', name: 'Pickup (cab + open bed)', repType: 'pickup', length: 48, width: 22,
    xNose: 0.50, xCowl: 0.25, xA: 0.14, xB: -0.07, xC: -0.09, xRearHeader: -0.12, xTail: -0.50,
    xFrontAxle: 0.30, xRearAxle: -0.3, xEngine: 0.21, xCore: -0.2, frameRatio: 0.80 },

  // --- Фургоны и автобусы ---
  { presetId: 'van_cabover_box', name: 'Cab-over van / minibus', repType: 'van', length: 50, width: 22,
    xNose: 0.50, xCowl: 0.46, xA: 0.44, xB: 0.05, xC: -0.25, xRearHeader: -0.36, xTail: -0.50,
    xFrontAxle: 0.36, xRearAxle: -0.22, xEngine: 0.30, xCore: -0.05, frameRatio: 0.86 },
  { presetId: 'van_camper_rv', name: 'Campervan / motorhome', repType: 'van_camper', length: 52, width: 22,
    xNose: 0.50, xCowl: 0.26, xA: 0.2, xB: -0.02, xC: -0.28, xRearHeader: -0.40, xTail: -0.50,
    xFrontAxle: 0.30, xRearAxle: -0.26, xEngine: 0.21, xCore: -0.04, frameRatio: 0.85 },
  { presetId: 'bus_transit_monocoque', name: 'Transit city bus', repType: 'bus', length: 85, width: 26,
    xNose: 0.50, xCowl: 0.46, xA: 0.42, xB: 0.10, xC: -0.35, xRearHeader: -0.42, xTail: -0.50,
    xFrontAxle: 0.42, xRearAxle: -0.30, xEngine: -0.38, xCore: -0.05, frameRatio: 0.90 },

  // --- Грузовики ---
  { presetId: 'truck_hooded_gaz53', name: 'Hooded flatbed truck (GAZ-53 type)', repType: 'truck_flatbed', length: 74, width: 25,
    xNose: 0.50, xCowl: 0.24, xA: 0.22, xB: 0.2, xC: 0.18, xRearHeader: 0.14, xTail: -0.50,
    xFrontAxle: 0.28, xRearAxle: -0.27, xEngine: 0.37, xCore: -0.10, frameRatio: 0.80 },
  { presetId: 'truck_zil_dump', name: 'Short-wheelbase tipper (ZIL-130 type)', repType: 'truck_zil_dump', length: 58, width: 25,
    xNose: 0.50, xCowl: 0.24, xA: 0.20, xB: 0.16, xC: 0.12, xRearHeader: 0.08, xTail: -0.50,
    xFrontAxle: 0.28, xRearAxle: -0.22, xEngine: 0.37, xCore: -0.02, frameRatio: 0.80 },
  { presetId: 'truck_cabover_heavy', name: 'Heavy cab-over truck', repType: 'truck_dump', length: 72, width: 26,
    xNose: 0.50, xCowl: 0.46, xA: 0.42, xB: 0.24, xC: 0.18, xRearHeader: 0.1, xTail: -0.50,
    xFrontAxle: 0.36, xRearAxle: -0.20, xEngine: 0.36, xCore: -0.10, frameRatio: 0.85 },
  { presetId: 'truck_semi_tractor', name: 'Semi tractor (sleeper cab)', repType: 'truck_semi', length: 64, width: 26,
    xNose: 0.50, xCowl: 0.44, xA: 0.42, xB: 0.24, xC: 0.1, xRearHeader: -0.02, xTail: -0.50,
    xFrontAxle: 0.40, xRearAxle: -0.10, xEngine: 0.32, xCore: -0.12, frameRatio: 0.8, frameMaxHalfWidth: 0.15 },

  // --- Сельхоз и дорожная техника (контур тягача/катка/укладчика из их визуала) ---
  { presetId: 'tractor_backbone', name: 'Row-crop tractor (MTZ type)', repType: 'tractor_mtz80', length: 52, width: 26,
    xNose: 0.50, xCowl: 0.02, xA: -0.02, xB: -0.14, xC: -0.22, xRearHeader: -0.3, xTail: -0.50,
    xFrontAxle: 0.30, xRearAxle: -0.34, xEngine: 0.35, xCore: -0.10, frameRatio: 0.75, railRatio: 0.36 },

  { presetId: 'paver_asphalt_wheeled', name: 'Wheeled asphalt paver', repType: 'paver_asphalt_wheeled', length: 64, width: 32,
    xNose: 0.50, xCowl: 0.28, xA: 0.24, xB: 0.05, xC: -0.05, xRearHeader: -0.32, xTail: -0.50,
    xFrontAxle: 0.33, xRearAxle: -0.36, xEngine: 0.20, xCore: 0.00, frameRatio: 0.75 },
  { presetId: 'roller_articulated_tandem', name: 'Articulated tandem roller', repType: 'roller_heavy_tandem', length: 56, width: 28,
    xNose: 0.50, xCowl: 0.30, xA: 0.25, xB: 0.05, xC: -0.10, xRearHeader: -0.30, xTail: -0.50,
    xFrontAxle: 0.32, xRearAxle: -0.34, xEngine: 0.18, xCore: 0.00, frameRatio: 0.6 }
];

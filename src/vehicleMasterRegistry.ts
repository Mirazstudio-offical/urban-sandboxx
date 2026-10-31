/**
 * ============================================================================
 * MASTER VEHICLE REGISTRY (Единая база данных транспортных средств)
 * ----------------------------------------------------------------------------
 * Полная сводная таблица всех характеристик транспорта в игре:
 * 1. Идентификация, лор, каталог, цены в автосалоне
 * 2. Физика, масса, габариты, рулевое управление, сцепление
 * 3. Силовая линия (ДВС, тип привода FWD/RWD/AWD, КПП, передаточные числа)
 * 4. Топливная система (тип топлива, бак, ГБО, положение лючка бензобака)
 * 5. Блокировки дифференциалов (МОБ, МКБ-З, МКБ-П)
 * 6. Оптика и электрика (фары, тепловая инерция, тип поворотников, автопоезд)
 * 7. Кузовные панели (капот, багажник, двери, бамперы)
 * 8. Ключи и безопасность (уровень чип-ключа, доступ)
 * 9. Индивидуальная анатомия кузова и силовой клетки (chassisAnatomy)
 * 10. Точные координаты оптики (opticsMounts: стопари, фары, CHMSL)
 * ============================================================================
 */

import {
  CarType,
  CarConfig,
  FluidStorageTank,
  TurnSignalType,
  TurnSignalSoundType,
  VehicleTurnSignalConfig
} from './types';

export type VehicleCategory = 
  | 'passenger' 
  | 'sport' 
  | 'suv' 
  | 'commercial' 
  | 'special' 
  | 'emergency' 
  | 'bus'
  | 'moto'
  | 'trailers';

export type HeadlightBulbType = 'vintage_sealed_beam' | 'halogen_standard' | 'hid_xenon' | 'led_matrix';

export interface VehicleHeadlightConfig {
  bulbType: HeadlightBulbType;
  riseTime: number;   // seconds to warm up / fade in
  decayTime: number;  // seconds to cool down / fade out
  colorTemp: string;
  hasIgnitionFlicker: boolean;
}

export interface VehicleDiffLockCapabilities {
  supported: boolean;
  hasCenter: boolean; // Межосевая блокировка (МОБ - раздатка 50:50)
  hasRear: boolean;   // Межколесная блокировка задней оси (МКБ-З)
  hasFront: boolean;  // Межколесная блокировка передней оси (МКБ-П)
  systemNameRu: string;
  driveLayoutRu: string;
}

export interface VehicleBodyPanelsConfig {
  hasHood: boolean;
  hasFrontBumper: boolean;
  hasRearBumper: boolean;
  hasFenders: boolean;
  hasDoors: boolean;
  hasTrunk: boolean;
  isTractorBonnet?: boolean;
  isTractorDoors?: boolean;
}

export interface FuelCapOffset {
  localFFrac: number;
  localRFrac: number;
  isTrailer: boolean;
}

export interface VehicleChassisAnatomy {
  xNose?: number;
  xCowl?: number;
  xA?: number;
  xB?: number;
  xC?: number;
  xRearHeader?: number;
  xTail?: number;
  xFrontAxle?: number;
  xRearAxle?: number;
  xEngine?: number;
  xCore?: number;
  frameRatio?: number;
  railRatio?: number;
  frameMaxHalfWidth?: number;
  specialPreset?: 'moto_sidecar' | 'motorcycle' | 'trailer';
}

export interface VehicleThirdBrakeLight {
  enabled: boolean;
  xFrac: number;
  yFrac: number;
  width: number;
  height: number;
  type: 'led_strip' | 'incandescent' | 'oled_bar';
}

export interface VehicleOpticsMounts {
  headlightLeft: { xFrac: number; yFrac: number };
  headlightRight: { xFrac: number; yFrac: number };
  taillightLeft: { xFrac: number; yFrac: number };
  taillightRight: { xFrac: number; yFrac: number };
  fogLightLeft?: { xFrac: number; yFrac: number };
  fogLightRight?: { xFrac: number; yFrac: number };
  thirdBrakeLight?: VehicleThirdBrakeLight;
}

export interface MasterVehicleConfig extends CarConfig {
  id: string;
  nameRu: string;
  brand: string;
  category: VehicleCategory;
  classType: string;
  year?: number;
  descriptionRu: string;
  priceRub?: number;
  powerHp: number;
  topSpeedKmh: number;
  accelSec?: number;
  displacementL?: number;
  engineSpec?: string;
  driveType: 'FWD' | 'RWD' | 'AWD';
  transmission: 'AUTO' | 'MANUAL';
  gearRatios: number[];
  finalDriveRatio: number;
  hasTransferCase: boolean;
  powertrainCategory: string;
  fuelType: 'ai92' | 'ai95' | 'diesel';
  fuelTypeLabel: string;
  tankCapacity: number;
  lpgCapacity: number;
  fuelCapOffset: FuelCapOffset;
  diffCapabilities: VehicleDiffLockCapabilities;
  headlightConfig: VehicleHeadlightConfig;
  turnSignalConfig: VehicleTurnSignalConfig;
  hasRoadTrainLights: boolean;
  bodyPanels: VehicleBodyPanelsConfig;
  keyTier: 'classic' | 'flip' | 'smart' | 'display';
  requiredKeyType: 'gold' | 'iron' | null;
  availableColors?: { name: string; hex: string; roofHex?: string }[];
  fluidTank?: FluidStorageTank;
  chassisAnatomy: VehicleChassisAnatomy;
  opticsMounts: VehicleOpticsMounts;
}

export const MASTER_VEHICLE_CONFIGS: Record<CarType, MasterVehicleConfig> = {
  "sedan": {
    "id": "cat_sedan",
    "type": "sedan",
    "name": "Vortex Solstice 1.6",
    "nameRu": "Vortex Solstice 1.6",
    "brand": "Vortex",
    "category": "passenger",
    "classType": "Family Sedan",
    "year": 2020,
    "descriptionRu": "Comfortable modern urban sedan designed for daily commuting and reliability.",
    "width": 20,
    "length": 42,
    "wheelBase": 26,
    "mass": 1400,
    "maxSpeed": 180,
    "reverseMaxSpeed": 45,
    "acceleration": 30,
    "brakingForce": 240,
    "friction": 0.988,
    "turnSpeed": 4.2,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.985,
    "driftGrip": 0.38,
    "topSpeedKmh": 180,
    "powerHp": 123,
    "engineSpec": "1.6L MPI DOHC 16V",
    "driveType": "FWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 50,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Охра Тракт",
        "hex": "#c68a35"
      },
      {
        "name": "Белое облако",
        "hex": "#f8fafc"
      },
      {
        "name": "Мокрый асфальт",
        "hex": "#334155"
      },
      {
        "name": "Черный обсидиан",
        "hex": "#0f172a"
      },
      {
        "name": "Коррида (красный)",
        "hex": "#dc2626"
      },
      {
        "name": "Океан (синий)",
        "hex": "#1d4ed8"
      },
      {
        "name": "Изумруд",
        "hex": "#15803d"
      },
      {
        "name": "Песочный",
        "hex": "#ca8a04"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "hatchback": {
    "id": "deal_hatchback",
    "type": "hatchback",
    "name": "Vortex Nova 1.6",
    "nameRu": "Apex Swift",
    "brand": "Apex",
    "category": "passenger",
    "classType": "City Hatchback",
    "year": 2020,
    "descriptionRu": "Compact 5-door hatchback. Extremely convenient for tight city parking and nimble traffic maneuvering.",
    "priceRub": 430000,
    "width": 19,
    "length": 38,
    "wheelBase": 23,
    "mass": 1150,
    "maxSpeed": 175,
    "reverseMaxSpeed": 45,
    "acceleration": 32,
    "brakingForce": 250,
    "friction": 0.988,
    "turnSpeed": 4.5,
    "maxSteerAngle": 0.7,
    "minSteerAngle": 0.15,
    "grip": 0.988,
    "driftGrip": 0.4,
    "topSpeedKmh": 175,
    "powerHp": 106,
    "accelSec": 11.2,
    "displacementL": 1.6,
    "engineSpec": "1.6L 16V EFI Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 45,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Vibrant Red",
        "hex": "#ef4444"
      },
      {
        "name": "Cobalt Blue",
        "hex": "#3b82f6"
      },
      {
        "name": "Alpine White",
        "hex": "#ffffff"
      },
      {
        "name": "Graphite Gray",
        "hex": "#64748b"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.2,
      "xA": 0.08,
      "xB": -0.06,
      "xC": -0.2,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.25,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.4,
        "yFrac": 0,
        "width": 4.5,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "pickup": {
    "id": "deal_pickup",
    "type": "pickup",
    "name": "Bison Utility 4x4",
    "nameRu": "Titan HeavyDuty",
    "brand": "Titan",
    "category": "suv",
    "classType": "Double Cab 4WD Pickup",
    "year": 2021,
    "descriptionRu": "Robust dual-cab cargo-passenger pickup truck with selectable 4WD and spacious cargo bed.",
    "priceRub": 880000,
    "width": 22,
    "length": 48,
    "wheelBase": 30,
    "mass": 2200,
    "maxSpeed": 150,
    "reverseMaxSpeed": 40,
    "acceleration": 24,
    "brakingForce": 220,
    "friction": 0.985,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.12,
    "grip": 0.975,
    "driftGrip": 0.32,
    "topSpeedKmh": 160,
    "powerHp": 143,
    "accelSec": 12,
    "displacementL": 2.5,
    "engineSpec": "2.5L Turbo Diesel Inline-4",
    "driveType": "AWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "offroad",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 70,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Блокировка раздатки и заднего моста (МОБ + МКБ-З)",
      "driveLayoutRu": "Part-time 4WD с принудительной блокировкой заднего моста"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Titanium Gray",
        "hex": "#475569"
      },
      {
        "name": "Midnight Black",
        "hex": "#020617"
      },
      {
        "name": "Matte Khaki",
        "hex": "#3f6212"
      },
      {
        "name": "Alpine White",
        "hex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.25,
      "xA": 0.14,
      "xB": -0.07,
      "xC": -0.09,
      "xRearHeader": -0.12,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.21,
      "xCore": -0.2,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.1,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "sports": {
    "id": "cat_sports",
    "type": "sports",
    "name": "Apex GT-Coupe 3.0",
    "nameRu": "Apex GT-Coupe 3.0",
    "brand": "Apex Motors",
    "category": "sport",
    "classType": "Sports Coupe",
    "year": 2021,
    "descriptionRu": "Rear-wheel-drive sports coupe featuring 50:50 weight distribution and sharp track handling.",
    "width": 21,
    "length": 44,
    "wheelBase": 27,
    "mass": 1320,
    "maxSpeed": 280,
    "reverseMaxSpeed": 55,
    "acceleration": 55,
    "brakingForce": 290,
    "friction": 0.99,
    "turnSpeed": 4.6,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.13,
    "grip": 0.99,
    "driftGrip": 0.44,
    "topSpeedKmh": 280,
    "powerHp": 380,
    "engineSpec": "3.0L Twin-Turbo Inline-6",
    "driveType": "RWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.2,
      0,
      3.1,
      2.1,
      1.55,
      1.22,
      1,
      0.8
    ],
    "finalDriveRatio": 3.4,
    "hasTransferCase": false,
    "powertrainCategory": "sport",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 75,
    "lpgCapacity": 45,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "hid_xenon",
      "riseTime": 0.35,
      "decayTime": 0.22,
      "colorTemp": "#f0fdf4",
      "hasIgnitionFlicker": true
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_static",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "smart",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Scarlet Metallic",
        "hex": "#dc2626"
      },
      {
        "name": "Solar Yellow",
        "hex": "#eab308"
      },
      {
        "name": "Ultramarine Blue",
        "hex": "#2563eb"
      },
      {
        "name": "Midnight Graphite",
        "hex": "#0f172a"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.26,
      "xA": 0.16,
      "xB": -0.06,
      "xC": -0.16,
      "xRearHeader": -0.24,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.28,
      "xEngine": -0.17,
      "xCore": -0.02,
      "frameRatio": 0.7
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "suv": {
    "id": "cat_suv",
    "type": "suv",
    "name": "Nordic Nomad 2.0",
    "nameRu": "Nordic Nomad 2.0",
    "brand": "Nordic Auto",
    "category": "suv",
    "classType": "Crossover 4x4",
    "year": 2021,
    "descriptionRu": "Versatile family crossover equipped with raised ground clearance and intelligent all-wheel drive.",
    "width": 21,
    "length": 42,
    "wheelBase": 26,
    "mass": 1450,
    "maxSpeed": 170,
    "reverseMaxSpeed": 45,
    "acceleration": 26,
    "brakingForce": 230,
    "friction": 0.986,
    "turnSpeed": 3.8,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.13,
    "grip": 0.98,
    "driftGrip": 0.36,
    "topSpeedKmh": 170,
    "powerHp": 150,
    "engineSpec": "2.0L Turbo 16V AWD",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "suv",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 50,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Блокировка межосевая и заднего дифференциала (МОБ + МКБ-З)",
      "driveLayoutRu": "4WD / AWD с электро-пневматической блокировкой мостов"
    },
    "headlightConfig": {
      "bulbType": "led_matrix",
      "riseTime": 0.04,
      "decayTime": 0.06,
      "colorTemp": "#ffffff",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_static",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Охра Тракт",
        "hex": "#c68a35"
      },
      {
        "name": "Белое облако",
        "hex": "#f8fafc"
      },
      {
        "name": "Мокрый асфальт",
        "hex": "#334155"
      },
      {
        "name": "Черный обсидиан",
        "hex": "#0f172a"
      },
      {
        "name": "Коррида (красный)",
        "hex": "#dc2626"
      },
      {
        "name": "Океан (синий)",
        "hex": "#1d4ed8"
      },
      {
        "name": "Изумруд",
        "hex": "#15803d"
      },
      {
        "name": "Песочный",
        "hex": "#ca8a04"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.22,
      "xA": 0.17,
      "xB": -0.02,
      "xC": -0.3,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.29,
      "xEngine": 0.26,
      "xCore": -0.06,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.42,
        "yFrac": 0,
        "width": 5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "taxi": {
    "id": "cat_taxi",
    "type": "taxi",
    "name": "Vortex Solstice Taxi",
    "nameRu": "Vortex Solstice Taxi",
    "brand": "Vortex",
    "category": "passenger",
    "classType": "City Taxi Fleet",
    "year": 2021,
    "descriptionRu": "City taxi cab equipped with dispatch navigation terminal and economical LPG system.",
    "width": 21,
    "length": 46,
    "wheelBase": 28,
    "mass": 1450,
    "maxSpeed": 175,
    "reverseMaxSpeed": 45,
    "acceleration": 30,
    "brakingForce": 245,
    "friction": 0.988,
    "turnSpeed": 4.2,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.985,
    "driftGrip": 0.38,
    "topSpeedKmh": 175,
    "powerHp": 106,
    "engineSpec": "1.6L 16V Gasoline + LPG",
    "driveType": "FWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": true,
      "repeaterStyle": "mirror_led_static",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Taxi Yellow",
        "hex": "#facc15"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "police": {
    "id": "cat_police",
    "type": "police",
    "name": "Sentinel Patrol Cruiser",
    "nameRu": "Sentinel Patrol Cruiser",
    "brand": "Sentinel Emergency",
    "category": "emergency",
    "classType": "Police Interceptor",
    "year": 2014,
    "descriptionRu": "Tactical law enforcement patrol cruiser equipped with emergency lightbar and siren system.",
    "width": 21,
    "length": 46,
    "wheelBase": 28,
    "mass": 1550,
    "maxSpeed": 220,
    "reverseMaxSpeed": 55,
    "acceleration": 45,
    "brakingForce": 275,
    "friction": 0.989,
    "turnSpeed": 4.4,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.13,
    "grip": 0.988,
    "driftGrip": 0.4,
    "topSpeedKmh": 185,
    "powerHp": 98,
    "engineSpec": "1.6L 16V Turbo Police Spec",
    "driveType": "FWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "emergency",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 50,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "hid_xenon",
      "riseTime": 0.35,
      "decayTime": 0.22,
      "colorTemp": "#f0fdf4",
      "hasIgnitionFlicker": true
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_static",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Patrol White/Blue",
        "hex": "#f8fafc",
        "roofHex": "#2563eb"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.34,
        "yFrac": 0,
        "width": 4,
        "height": 1,
        "type": "led_strip"
      }
    }
  },
  "ambulance": {
    "id": "cat_ambulance",
    "type": "ambulance",
    "name": "Sentinel Medic Van",
    "nameRu": "Sentinel Medic Van",
    "brand": "Sentinel Emergency",
    "category": "emergency",
    "classType": "Advanced Life Support",
    "year": 2018,
    "descriptionRu": "Emergency medical services ambulance with optical sirens and fully equipped medical cabin.",
    "width": 24,
    "length": 54,
    "wheelBase": 32,
    "mass": 2800,
    "maxSpeed": 160,
    "reverseMaxSpeed": 40,
    "acceleration": 22,
    "brakingForce": 210,
    "friction": 0.984,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.11,
    "grip": 0.97,
    "driftGrip": 0.3,
    "topSpeedKmh": 130,
    "powerHp": 107,
    "engineSpec": "2.8L Turbo Diesel ALS",
    "driveType": "RWD",
    "transmission": "AUTO",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "emergency",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Medic Yellow",
        "hex": "#fef08a",
        "roofHex": "#f8fafc"
      },
      {
        "name": "Medic White",
        "hex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.44,
      "xB": 0.05,
      "xC": -0.25,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.22,
      "xEngine": 0.3,
      "xCore": -0.05,
      "frameRatio": 0.86
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "bus": {
    "id": "cat_bus",
    "type": "bus",
    "name": "Metro Linemaster CityBus",
    "nameRu": "Metro Linemaster CityBus",
    "brand": "Metro Transit",
    "category": "bus",
    "classType": "Transit City Bus",
    "year": 2013,
    "descriptionRu": "Spacious high-capacity city transit bus with air suspension and three wide passenger doors.",
    "width": 26,
    "length": 85,
    "wheelBase": 52,
    "mass": 9500,
    "maxSpeed": 110,
    "reverseMaxSpeed": 30,
    "acceleration": 12,
    "brakingForce": 180,
    "friction": 0.98,
    "turnSpeed": 3.2,
    "maxSteerAngle": 0.6,
    "minSteerAngle": 0.08,
    "grip": 0.95,
    "driftGrip": 0.22,
    "topSpeedKmh": 110,
    "powerHp": 245,
    "engineSpec": "6.7L Cummins Diesel Turbo",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "bus",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": -0.15,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Transit Blue",
        "hex": "#2563eb",
        "roofHex": "#f8fafc"
      },
      {
        "name": "Suburban Orange",
        "hex": "#ea580c",
        "roofHex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.1,
      "xC": -0.35,
      "xRearHeader": -0.42,
      "xTail": -0.5,
      "xFrontAxle": 0.42,
      "xRearAxle": -0.3,
      "xEngine": -0.38,
      "xCore": -0.05,
      "frameRatio": 0.9
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "supercar": {
    "id": "cat_supercar",
    "type": "supercar",
    "name": "Apex Venom GT 4.0",
    "nameRu": "Apex Venom GT 4.0",
    "brand": "Apex Motors",
    "category": "sport",
    "classType": "Mid-Engine Supercar",
    "year": 2023,
    "descriptionRu": "Uncompromising carbon-fiber mid-engine supercar with aggressive aerodynamic downforce.",
    "width": 22,
    "length": 45,
    "wheelBase": 27,
    "mass": 1250,
    "maxSpeed": 320,
    "reverseMaxSpeed": 60,
    "acceleration": 70,
    "brakingForce": 330,
    "friction": 0.992,
    "turnSpeed": 4.8,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.12,
    "grip": 0.994,
    "driftGrip": 0.48,
    "topSpeedKmh": 320,
    "powerHp": 720,
    "engineSpec": "4.0L V8 Twin-Turbo Mid-Engine",
    "driveType": "RWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.2,
      0,
      3.1,
      2.1,
      1.55,
      1.22,
      1,
      0.8
    ],
    "finalDriveRatio": 3.4,
    "hasTransferCase": false,
    "powertrainCategory": "sport",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 75,
    "lpgCapacity": 45,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "hid_xenon",
      "riseTime": 0.35,
      "decayTime": 0.22,
      "colorTemp": "#f0fdf4",
      "hasIgnitionFlicker": true
    },
    "turnSignalConfig": {
      "type": "dynamic_sequential_led",
      "baseFrequency": 1.3,
      "dutyCycle": 0.54,
      "sweepDuration": 0.28,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_dynamic",
      "soundType": "luxury_acoustic"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "display",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Neon Lime",
        "hex": "#84cc16"
      },
      {
        "name": "Carbon Black",
        "hex": "#09090b"
      },
      {
        "name": "Blood Orange",
        "hex": "#ea580c"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.26,
      "xA": 0.16,
      "xB": -0.06,
      "xC": -0.16,
      "xRearHeader": -0.24,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.28,
      "xEngine": -0.17,
      "xCore": -0.02,
      "frameRatio": 0.7
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "wagon_classic": {
    "id": "deal_wagon_classic",
    "type": "wagon_classic",
    "name": "Kestrel Tour 1.5",
    "nameRu": "Aegis Estate W210",
    "brand": "Aegis",
    "category": "passenger",
    "classType": "Family Station Wagon",
    "year": 2008,
    "descriptionRu": "Practical family station wagon with a large tailgate. Indispensable helper for country trips and cargo hauling.",
    "priceRub": 210000,
    "width": 20,
    "length": 44,
    "wheelBase": 26,
    "mass": 1350,
    "maxSpeed": 155,
    "reverseMaxSpeed": 40,
    "acceleration": 24,
    "brakingForce": 210,
    "friction": 0.986,
    "turnSpeed": 3.8,
    "maxSteerAngle": 0.66,
    "minSteerAngle": 0.13,
    "grip": 0.98,
    "driftGrip": 0.35,
    "topSpeedKmh": 165,
    "powerHp": 89,
    "accelSec": 12.5,
    "displacementL": 1.6,
    "engineSpec": "1.6L 16V Inline-4",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_round",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Snow Queen Silver",
        "hex": "#e2e8f0"
      },
      {
        "name": "Ruby Garnet",
        "hex": "#991b1b"
      },
      {
        "name": "Franconia Wine",
        "hex": "#831843"
      },
      {
        "name": "Crystal Dark Gray",
        "hex": "#334155"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.04,
      "xC": -0.22,
      "xRearHeader": -0.26,
      "xTail": -0.5,
      "xFrontAxle": 0.28,
      "xRearAxle": -0.3,
      "xEngine": 0.2,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.44,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "wagon_modern": {
    "id": "deal_wagon_modern",
    "type": "wagon_modern",
    "name": "Nordic Trail SW 2.0",
    "nameRu": "Apex Tourer",
    "brand": "Apex",
    "category": "passenger",
    "classType": "Modern Estate Wagon",
    "year": 2022,
    "descriptionRu": "Spacious family wagon featuring roof rails, massive cargo capacity and practical interior.",
    "priceRub": 640000,
    "width": 20,
    "length": 45,
    "wheelBase": 27,
    "mass": 1320,
    "maxSpeed": 185,
    "reverseMaxSpeed": 45,
    "acceleration": 32,
    "brakingForce": 250,
    "friction": 0.988,
    "turnSpeed": 4.2,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.986,
    "driftGrip": 0.38,
    "topSpeedKmh": 185,
    "powerHp": 122,
    "accelSec": 10.2,
    "displacementL": 1.8,
    "engineSpec": "1.8L 16V Inline-4",
    "driveType": "FWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "suv",
    "fuelType": "ai95",
    "fuelTypeLabel": "Premium 95",
    "tankCapacity": 50,
    "lpgCapacity": 65,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "dynamic_sequential_led",
      "baseFrequency": 1.3,
      "dutyCycle": 0.54,
      "sweepDuration": 0.28,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_dynamic",
      "soundType": "luxury_acoustic"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Mars Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Carthage Silver",
        "hex": "#e2e8f0"
      },
      {
        "name": "Ankor Metallic Black",
        "hex": "#1e293b"
      },
      {
        "name": "Amazon Green",
        "hex": "#166534"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.04,
      "xC": -0.22,
      "xRearHeader": -0.26,
      "xTail": -0.5,
      "xFrontAxle": 0.28,
      "xRearAxle": -0.3,
      "xEngine": 0.2,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.44,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "crossover_compact": {
    "id": "deal_crossover_compact",
    "type": "crossover_compact",
    "name": "Nordic Scout 1.8",
    "nameRu": "Apex Trailblazer",
    "brand": "Apex",
    "category": "suv",
    "classType": "Compact 4WD Crossover",
    "year": 2021,
    "descriptionRu": "All-wheel-drive crossover with high off-road capability, elevated wheel arches and smooth automatic gearbox.",
    "priceRub": 750000,
    "width": 21,
    "length": 43,
    "wheelBase": 26,
    "mass": 1420,
    "maxSpeed": 180,
    "reverseMaxSpeed": 45,
    "acceleration": 30,
    "brakingForce": 240,
    "friction": 0.987,
    "turnSpeed": 4,
    "maxSteerAngle": 0.66,
    "minSteerAngle": 0.13,
    "grip": 0.984,
    "driftGrip": 0.36,
    "topSpeedKmh": 180,
    "powerHp": 143,
    "accelSec": 10.4,
    "displacementL": 2,
    "engineSpec": "2.0L 16V Inline-4",
    "driveType": "FWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "suv",
    "fuelType": "ai95",
    "fuelTypeLabel": "Premium 95",
    "tankCapacity": 50,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Блокировка межосевая и заднего дифференциала (МОБ + МКБ-З)",
      "driveLayoutRu": "4WD / AWD с электро-пневматической блокировкой мостов"
    },
    "headlightConfig": {
      "bulbType": "led_matrix",
      "riseTime": 0.04,
      "decayTime": 0.06,
      "colorTemp": "#ffffff",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_static",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Khaki Orange",
        "hex": "#f97316"
      },
      {
        "name": "Dark Emerald",
        "hex": "#065f46"
      },
      {
        "name": "Pearl White",
        "hex": "#f8fafc"
      },
      {
        "name": "Wet Asphalt",
        "hex": "#475569"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.22,
      "xA": 0.17,
      "xB": -0.02,
      "xC": -0.3,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.29,
      "xEngine": 0.26,
      "xCore": -0.06,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.42,
        "yFrac": 0,
        "width": 5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "sedan_classic": {
    "id": "deal_sedan_classic",
    "type": "sedan_classic",
    "name": "Kestrel Aero 1.3",
    "nameRu": "Aegis Classic B100",
    "brand": "Aegis",
    "category": "passenger",
    "classType": "Classic B-Class Sedan",
    "year": 2011,
    "descriptionRu": "Folk classic model. Rear-wheel drive, straightforward bulletproof mechanics, cheap parts available everywhere.",
    "priceRub": 180000,
    "width": 19,
    "length": 42,
    "wheelBase": 25,
    "mass": 1200,
    "maxSpeed": 150,
    "reverseMaxSpeed": 40,
    "acceleration": 22,
    "brakingForce": 200,
    "friction": 0.986,
    "turnSpeed": 3.9,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.978,
    "driftGrip": 0.34,
    "topSpeedKmh": 150,
    "powerHp": 74,
    "accelSec": 14.5,
    "displacementL": 1.6,
    "engineSpec": "1.6L EFI Inline-4",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_round",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Cherry Red",
        "hex": "#881337"
      },
      {
        "name": "Teal Green",
        "hex": "#0f766e"
      },
      {
        "name": "Baltic Navy",
        "hex": "#1e3a8a"
      },
      {
        "name": "Cloud White",
        "hex": "#f8fafc"
      },
      {
        "name": "Jasper Wine",
        "hex": "#9f1239"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "sedan_compact": {
    "id": "deal_sedan_compact",
    "type": "sedan_compact",
    "name": "Kestrel Vector 1.4",
    "nameRu": "Stellar Prime",
    "brand": "Stellar",
    "category": "passenger",
    "classType": "Compact Sedan",
    "year": 2021,
    "descriptionRu": "Mass-market favorite sedan. Inexpensive maintenance, efficient 1.6L engine, choice of manual or automatic transmission.",
    "priceRub": 390000,
    "width": 18,
    "length": 39,
    "wheelBase": 24,
    "mass": 1050,
    "maxSpeed": 165,
    "reverseMaxSpeed": 42,
    "acceleration": 28,
    "brakingForce": 230,
    "friction": 0.988,
    "turnSpeed": 4.3,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.15,
    "grip": 0.985,
    "driftGrip": 0.39,
    "topSpeedKmh": 180,
    "powerHp": 106,
    "accelSec": 10.8,
    "displacementL": 1.6,
    "engineSpec": "1.6L 16V EFI Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "led_matrix",
      "riseTime": 0.04,
      "decayTime": 0.06,
      "colorTemp": "#ffffff",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Cloud White",
        "hex": "#f8fafc"
      },
      {
        "name": "Obsidian Pearl",
        "hex": "#0f172a"
      },
      {
        "name": "Borneo Silver",
        "hex": "#94a3b8"
      },
      {
        "name": "Platinum Metallic",
        "hex": "#cbd5e1"
      },
      {
        "name": "Coriander Gold",
        "hex": "#d97706"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.32,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "compact_matiz": {
    "id": "deal_compact_matiz",
    "type": "compact_matiz",
    "name": "Micro Zest 0.8",
    "nameRu": "Kestrel Sprite",
    "brand": "Kestrel",
    "category": "passenger",
    "classType": "A-Class Microcar",
    "year": 2012,
    "descriptionRu": "Compact, nimble and exceptionally fuel-efficient urban microcar. Fits into any parking spot with minimal fuel consumption.",
    "priceRub": 145000,
    "width": 17,
    "length": 33,
    "wheelBase": 21,
    "mass": 770,
    "maxSpeed": 145,
    "reverseMaxSpeed": 35,
    "acceleration": 26,
    "brakingForce": 220,
    "friction": 0.988,
    "turnSpeed": 4.8,
    "maxSteerAngle": 0.72,
    "minSteerAngle": 0.16,
    "grip": 0.984,
    "driftGrip": 0.38,
    "topSpeedKmh": 144,
    "powerHp": 52,
    "accelSec": 17,
    "displacementL": 0.8,
    "engineSpec": "0.8L 3-Cylinder SOHC",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 45,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Lime Green",
        "hex": "#84cc16"
      },
      {
        "name": "Sunburst Yellow",
        "hex": "#facc15"
      },
      {
        "name": "Cornflower Blue",
        "hex": "#2563eb"
      },
      {
        "name": "Silver Metallic",
        "hex": "#cbd5e1"
      },
      {
        "name": "Ripe Cherry",
        "hex": "#991b1b"
      },
      {
        "name": "Snow White",
        "hex": "#ffffff"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.2,
      "xA": 0.08,
      "xB": -0.06,
      "xC": -0.2,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.25,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.4,
        "yFrac": 0,
        "width": 4.5,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "sedan_logan": {
    "id": "deal_sedan_logan",
    "type": "sedan_logan",
    "name": "Kestrel Meridian 1.6",
    "nameRu": "Stellar Nomad",
    "brand": "Stellar",
    "category": "passenger",
    "classType": "Budget B-Class Sedan",
    "year": 2011,
    "descriptionRu": "Legendary commuter with bulletproof heavy-duty suspension, high ground clearance and spacious cabin.",
    "priceRub": 295000,
    "width": 19,
    "length": 42,
    "wheelBase": 26,
    "mass": 980,
    "maxSpeed": 165,
    "reverseMaxSpeed": 42,
    "acceleration": 28,
    "brakingForce": 230,
    "friction": 0.988,
    "turnSpeed": 4.2,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.985,
    "driftGrip": 0.38,
    "topSpeedKmh": 175,
    "powerHp": 87,
    "accelSec": 11.5,
    "displacementL": 1.6,
    "engineSpec": "1.6L 8V Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Light Basalt Metallic",
        "hex": "#d4c5b9"
      },
      {
        "name": "Glacial White",
        "hex": "#f8fafc"
      },
      {
        "name": "Pearl Black",
        "hex": "#0f172a"
      },
      {
        "name": "Mineral Blue",
        "hex": "#1d4ed8"
      },
      {
        "name": "Titanium Silver",
        "hex": "#94a3b8"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "sedan_nexia": {
    "id": "deal_sedan_nexia",
    "type": "sedan_nexia",
    "name": "Kestrel Zenith 1.5",
    "nameRu": "Kestrel Meridian",
    "brand": "Kestrel",
    "category": "passenger",
    "classType": "C-Class Sedan",
    "year": 2007,
    "descriptionRu": "Time-tested comfortable sedan with a massive trunk, plush suspension and a robust 16-valve engine.",
    "priceRub": 160000,
    "width": 18,
    "length": 44,
    "wheelBase": 25,
    "mass": 1020,
    "maxSpeed": 170,
    "reverseMaxSpeed": 45,
    "acceleration": 29,
    "brakingForce": 230,
    "friction": 0.988,
    "turnSpeed": 4.1,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.985,
    "driftGrip": 0.38,
    "topSpeedKmh": 172,
    "powerHp": 85,
    "accelSec": 12.2,
    "displacementL": 1.5,
    "engineSpec": "1.5L 16V DOHC Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Sterling Silver",
        "hex": "#cbd5e1"
      },
      {
        "name": "Deep Ocean Blue",
        "hex": "#1e3a8a"
      },
      {
        "name": "Golden Sand",
        "hex": "#d97706"
      },
      {
        "name": "Burgundy Garnet",
        "hex": "#881337"
      },
      {
        "name": "Gloss White",
        "hex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "liftback_tavria": {
    "id": "deal_liftback_tavria",
    "type": "liftback_tavria",
    "name": "Vortex Era 1.1",
    "nameRu": "Vanguard Nova",
    "brand": "Vanguard",
    "category": "passenger",
    "classType": "Ultra-Budget Liftback",
    "year": 1998,
    "descriptionRu": "Lightweight and nimble front-wheel-drive liftback with a single windshield wiper and unpretentious carburetor engine. Weighs only 710 kg!",
    "priceRub": 68000,
    "width": 17,
    "length": 35,
    "wheelBase": 22,
    "mass": 710,
    "maxSpeed": 140,
    "reverseMaxSpeed": 36,
    "acceleration": 25,
    "brakingForce": 200,
    "friction": 0.987,
    "turnSpeed": 4.6,
    "maxSteerAngle": 0.7,
    "minSteerAngle": 0.15,
    "grip": 0.98,
    "driftGrip": 0.36,
    "topSpeedKmh": 145,
    "powerHp": 53,
    "accelSec": 16.2,
    "displacementL": 1.1,
    "engineSpec": "1.1L Carburetor Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Alpine White",
        "hex": "#f8fafc"
      },
      {
        "name": "Ocean Blue",
        "hex": "#1d4ed8"
      },
      {
        "name": "Matador Red",
        "hex": "#dc2626"
      },
      {
        "name": "Teal Green",
        "hex": "#0f766e"
      },
      {
        "name": "Desert Sand",
        "hex": "#ca8a04"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.2,
      "xA": 0.08,
      "xB": -0.06,
      "xC": -0.2,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.25,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.4,
        "yFrac": 0,
        "width": 4.5,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "sedan_accent": {
    "id": "deal_sedan_accent",
    "type": "sedan_accent",
    "name": "Kestrel Pulse 1.5",
    "nameRu": "Kestrel Horizon",
    "brand": "Kestrel",
    "category": "passenger",
    "classType": "B-Class Urban Sedan",
    "year": 2008,
    "descriptionRu": "Reliable, responsive and smooth sedan featuring independent multi-link rear suspension and 102 hp power.",
    "priceRub": 270000,
    "width": 18,
    "length": 41,
    "wheelBase": 24,
    "mass": 1030,
    "maxSpeed": 180,
    "reverseMaxSpeed": 45,
    "acceleration": 32,
    "brakingForce": 240,
    "friction": 0.988,
    "turnSpeed": 4.3,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.986,
    "driftGrip": 0.39,
    "topSpeedKmh": 180,
    "powerHp": 102,
    "accelSec": 10.5,
    "displacementL": 1.5,
    "engineSpec": "1.5L 16V DOHC Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Platinum Quartz",
        "hex": "#cbd5e1"
      },
      {
        "name": "Obsidian Black",
        "hex": "#0f172a"
      },
      {
        "name": "Sapphire Blue",
        "hex": "#1e3a8a"
      },
      {
        "name": "Ruby Garnet",
        "hex": "#991b1b"
      },
      {
        "name": "Pure White",
        "hex": "#ffffff"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "sedan_polo": {
    "id": "deal_sedan_polo",
    "type": "sedan_polo",
    "name": "Kestrel Apex 1.6",
    "nameRu": "Stellar Aero",
    "brand": "Stellar",
    "category": "passenger",
    "classType": "B+ Class Comfort Sedan",
    "year": 2016,
    "descriptionRu": "Crisp engineering, refined ergonomics, reliable 110 hp 1.6 MPI motor and excellent high-speed stability.",
    "priceRub": 520000,
    "width": 19,
    "length": 43,
    "wheelBase": 25,
    "mass": 1160,
    "maxSpeed": 190,
    "reverseMaxSpeed": 48,
    "acceleration": 33,
    "brakingForce": 250,
    "friction": 0.988,
    "turnSpeed": 4.3,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.987,
    "driftGrip": 0.39,
    "topSpeedKmh": 191,
    "powerHp": 110,
    "accelSec": 10.4,
    "displacementL": 1.6,
    "engineSpec": "1.6L 16V MPI Inline-4",
    "driveType": "FWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "city",
    "fuelType": "ai95",
    "fuelTypeLabel": "Premium 95",
    "tankCapacity": 50,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_static",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Candy White",
        "hex": "#ffffff"
      },
      {
        "name": "Urano Gray",
        "hex": "#475569"
      },
      {
        "name": "Reflex Silver",
        "hex": "#cbd5e1"
      },
      {
        "name": "Deep Black Pearl",
        "hex": "#0f172a"
      },
      {
        "name": "Toffee Brown",
        "hex": "#78350f"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "hatch_samara": {
    "id": "deal_hatch_samara",
    "type": "hatch_samara",
    "name": "Vortex Sprint 1.5",
    "nameRu": "Vanguard Apex",
    "brand": "Vanguard",
    "category": "passenger",
    "classType": "B-Class Hatchback",
    "year": 2002,
    "descriptionRu": "Wedge-shaped 5-door hatchback with a rear spoiler and reliable 8-valve electronic fuel injection motor.",
    "priceRub": 120000,
    "width": 18,
    "length": 39,
    "wheelBase": 24,
    "mass": 945,
    "maxSpeed": 160,
    "reverseMaxSpeed": 42,
    "acceleration": 28,
    "brakingForce": 220,
    "friction": 0.988,
    "turnSpeed": 4.4,
    "maxSteerAngle": 0.69,
    "minSteerAngle": 0.15,
    "grip": 0.983,
    "driftGrip": 0.38,
    "topSpeedKmh": 160,
    "powerHp": 78,
    "accelSec": 13,
    "displacementL": 1.5,
    "engineSpec": "1.5L 8V EFI Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Dark Slate Gray",
        "hex": "#334155"
      },
      {
        "name": "Silver Metallic",
        "hex": "#cbd5e1"
      },
      {
        "name": "Cherry Burgundy",
        "hex": "#991b1b"
      },
      {
        "name": "Baltic Blue",
        "hex": "#1e40af"
      },
      {
        "name": "Cloud White",
        "hex": "#f8fafc"
      },
      {
        "name": "Deep Purple",
        "hex": "#4c1d95"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.2,
      "xA": 0.08,
      "xB": -0.06,
      "xC": -0.2,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.25,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.4,
        "yFrac": 0,
        "width": 4.5,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "sedan_samara": {
    "id": "deal_sedan_samara",
    "type": "sedan_samara",
    "name": "Vortex Vesper 1.5",
    "nameRu": "Vanguard Envoy",
    "brand": "Vanguard",
    "category": "passenger",
    "classType": "B-Class Sedan",
    "year": 2003,
    "descriptionRu": "Aerodynamic sleek sedan featuring a factory trunklid spoiler and spacious cargo compartment.",
    "priceRub": 135000,
    "width": 18,
    "length": 42,
    "wheelBase": 25,
    "mass": 970,
    "maxSpeed": 165,
    "reverseMaxSpeed": 42,
    "acceleration": 28,
    "brakingForce": 220,
    "friction": 0.988,
    "turnSpeed": 4.2,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.984,
    "driftGrip": 0.38,
    "topSpeedKmh": 165,
    "powerHp": 78,
    "accelSec": 13.2,
    "displacementL": 1.5,
    "engineSpec": "1.5L 8V EFI Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Silver Frost",
        "hex": "#cbd5e1"
      },
      {
        "name": "Graphite Metallic",
        "hex": "#1e293b"
      },
      {
        "name": "Seafoam Teal",
        "hex": "#0f766e"
      },
      {
        "name": "Ruby Red",
        "hex": "#b91c1c"
      },
      {
        "name": "Ice Blue",
        "hex": "#93c5fd"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "sedan_luxury": {
    "id": "cat_sedan_luxury",
    "type": "sedan_luxury",
    "name": "Zenith Sovereign V8",
    "nameRu": "Zenith Sovereign V8",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 21,
    "length": 46,
    "wheelBase": 28,
    "mass": 1650,
    "maxSpeed": 230,
    "reverseMaxSpeed": 50,
    "acceleration": 45,
    "brakingForce": 270,
    "friction": 0.989,
    "turnSpeed": 4.1,
    "maxSteerAngle": 0.66,
    "minSteerAngle": 0.13,
    "grip": 0.988,
    "driftGrip": 0.4,
    "topSpeedKmh": 52,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "RWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "luxury",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 65,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "hid_xenon",
      "riseTime": 0.35,
      "decayTime": 0.22,
      "colorTemp": "#f0fdf4",
      "hasIgnitionFlicker": true
    },
    "turnSignalConfig": {
      "type": "dynamic_sequential_led",
      "baseFrequency": 1.3,
      "dutyCycle": 0.54,
      "sweepDuration": 0.28,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_dynamic",
      "soundType": "luxury_acoustic"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "smart",
    "requiredKeyType": null,
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "suv_luxury": {
    "id": "deal_suv_luxury",
    "type": "suv_luxury",
    "name": "Nordic Sovereign V8",
    "nameRu": "Titan Overland",
    "brand": "Titan",
    "category": "suv",
    "classType": "Framed Luxury SUV",
    "year": 2022,
    "descriptionRu": "Flagship body-on-frame SUV with automatic transmission, leather interior and touchscreen multimedia.",
    "priceRub": 1150000,
    "width": 23,
    "length": 50,
    "wheelBase": 31,
    "mass": 2400,
    "maxSpeed": 230,
    "reverseMaxSpeed": 50,
    "acceleration": 48,
    "brakingForce": 280,
    "friction": 0.989,
    "turnSpeed": 4,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.12,
    "grip": 0.988,
    "driftGrip": 0.41,
    "topSpeedKmh": 150,
    "powerHp": 150,
    "accelSec": 12.7,
    "displacementL": 2.7,
    "engineSpec": "2.7L PRO Inline-4",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "luxury",
    "fuelType": "ai95",
    "fuelTypeLabel": "Premium 95",
    "tankCapacity": 70,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Блокировка межосевая и заднего дифференциала (МОБ + МКБ-З)",
      "driveLayoutRu": "4WD / AWD с электро-пневматической блокировкой мостов"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "dynamic_sequential_led",
      "baseFrequency": 1.3,
      "dutyCycle": 0.54,
      "sweepDuration": 0.28,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_dynamic",
      "soundType": "luxury_acoustic"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "smart",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Obsidian Black",
        "hex": "#020617"
      },
      {
        "name": "Asteroid Gray",
        "hex": "#475569"
      },
      {
        "name": "Pearl White",
        "hex": "#ffffff"
      },
      {
        "name": "Pine Green",
        "hex": "#166534"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.22,
      "xA": 0.17,
      "xB": -0.02,
      "xC": -0.3,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.29,
      "xEngine": 0.26,
      "xCore": -0.06,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.42,
        "yFrac": 0,
        "width": 5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "pickup_heavy": {
    "id": "cat_pickup_heavy",
    "type": "pickup_heavy",
    "name": "Bison Heavy Duty V8",
    "nameRu": "Bison Heavy Duty V8",
    "brand": "Bison Trucks",
    "category": "suv",
    "classType": "Heavy Frame Pickup",
    "year": 2022,
    "descriptionRu": "Heavy-duty utility truck with dual rear wheels and robust fifth-wheel towing capacity.",
    "width": 24,
    "length": 54,
    "wheelBase": 34,
    "mass": 3100,
    "maxSpeed": 160,
    "reverseMaxSpeed": 40,
    "acceleration": 32,
    "brakingForce": 240,
    "friction": 0.984,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.62,
    "minSteerAngle": 0.1,
    "grip": 0.972,
    "driftGrip": 0.3,
    "topSpeedKmh": 160,
    "powerHp": 385,
    "engineSpec": "6.7L V8 Turbo Diesel PowerStroke",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "offroad",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 70,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Блокировка раздатки и заднего моста (МОБ + МКБ-З)",
      "driveLayoutRu": "Part-time 4WD с принудительной блокировкой заднего моста"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Desert Coyote",
        "hex": "#b45309"
      },
      {
        "name": "Granite Black",
        "hex": "#0f172a"
      },
      {
        "name": "Arctic White",
        "hex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.25,
      "xA": 0.14,
      "xB": -0.07,
      "xC": -0.09,
      "xRearHeader": -0.12,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.21,
      "xCore": -0.2,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.1,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "hatch_hot": {
    "id": "deal_hatch_hot",
    "type": "hatch_hot",
    "name": "Apex Storm Turbo",
    "nameRu": "Titan Vanguard GT",
    "brand": "Titan",
    "category": "sport",
    "classType": "Sport Hot Hatch",
    "year": 2021,
    "descriptionRu": "Dynamic turbocharged hot hatch featuring sports suspension, upgraded brakes and razor-sharp steering.",
    "priceRub": 980000,
    "width": 19,
    "length": 39,
    "wheelBase": 24,
    "mass": 1220,
    "maxSpeed": 240,
    "reverseMaxSpeed": 50,
    "acceleration": 52,
    "brakingForce": 290,
    "friction": 0.99,
    "turnSpeed": 4.7,
    "maxSteerAngle": 0.7,
    "minSteerAngle": 0.15,
    "grip": 0.99,
    "driftGrip": 0.43,
    "topSpeedKmh": 240,
    "powerHp": 220,
    "accelSec": 6.2,
    "displacementL": 2,
    "engineSpec": "2.0L Turbocharged Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.2,
      0,
      3.1,
      2.1,
      1.55,
      1.22,
      1,
      0.8
    ],
    "finalDriveRatio": 3.4,
    "hasTransferCase": false,
    "powertrainCategory": "sport",
    "fuelType": "ai95",
    "fuelTypeLabel": "Premium 95",
    "tankCapacity": 75,
    "lpgCapacity": 45,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "led_matrix",
      "riseTime": 0.04,
      "decayTime": 0.06,
      "colorTemp": "#ffffff",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "smart",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Venom Yellow",
        "hex": "#eab308"
      },
      {
        "name": "Scarlet Metallic",
        "hex": "#dc2626"
      },
      {
        "name": "Cobalt Blue",
        "hex": "#2563eb"
      },
      {
        "name": "Tuner Black",
        "hex": "#09090b"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.2,
      "xA": 0.08,
      "xB": -0.06,
      "xC": -0.2,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.25,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.4,
        "yFrac": 0,
        "width": 4.5,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "micro_car": {
    "id": "deal_micro_car",
    "type": "micro_car",
    "name": "Micro Atom City",
    "nameRu": "Aegis Micro M75",
    "brand": "Aegis",
    "category": "passenger",
    "classType": "City Microcar",
    "year": 2006,
    "descriptionRu": "Supercompact microcar with minuscule fuel consumption. Ideal for narrow alleys and minimal upkeep budget.",
    "priceRub": 140000,
    "width": 16,
    "length": 30,
    "wheelBase": 19,
    "mass": 800,
    "maxSpeed": 135,
    "reverseMaxSpeed": 35,
    "acceleration": 26,
    "brakingForce": 220,
    "friction": 0.988,
    "turnSpeed": 5.2,
    "maxSteerAngle": 0.74,
    "minSteerAngle": 0.18,
    "grip": 0.982,
    "driftGrip": 0.36,
    "topSpeedKmh": 130,
    "powerHp": 33,
    "accelSec": 18,
    "displacementL": 0.75,
    "engineSpec": "0.75L 2-Cylinder Engine",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 45,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Cornflower Blue",
        "hex": "#2563eb"
      },
      {
        "name": "Lemon Yellow",
        "hex": "#eab308"
      },
      {
        "name": "Lime Green",
        "hex": "#16a34a"
      },
      {
        "name": "Snow White",
        "hex": "#ffffff"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.2,
      "xA": 0.08,
      "xB": -0.06,
      "xC": -0.2,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.25,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.4,
        "yFrac": 0,
        "width": 4.5,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "van": {
    "id": "deal_van",
    "type": "van",
    "name": "Bison Transporter Van",
    "nameRu": "Horizon Express",
    "brand": "Horizon",
    "category": "commercial",
    "classType": "Business Cargo Van",
    "year": 2022,
    "descriptionRu": "Spacious and stylish business van with aerodynamic styling, sliding side doors, rear swing doors and refined cabin.",
    "priceRub": 1250000,
    "width": 22,
    "length": 50,
    "wheelBase": 30,
    "mass": 2100,
    "maxSpeed": 160,
    "reverseMaxSpeed": 40,
    "acceleration": 22,
    "brakingForce": 220,
    "friction": 0.985,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.62,
    "minSteerAngle": 0.11,
    "grip": 0.975,
    "driftGrip": 0.32,
    "topSpeedKmh": 165,
    "powerHp": 150,
    "accelSec": 12.8,
    "displacementL": 2,
    "engineSpec": "2.0L TDI Turbo Diesel",
    "driveType": "FWD",
    "transmission": "AUTO",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "van",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 120,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "led_matrix",
      "riseTime": 0.04,
      "decayTime": 0.06,
      "colorTemp": "#ffffff",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "smart",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Snow White",
        "hex": "#ffffff"
      },
      {
        "name": "Silver Metallic",
        "hex": "#cbd5e1"
      },
      {
        "name": "Deep Sapphire",
        "hex": "#1e3a8a"
      },
      {
        "name": "Executive Black",
        "hex": "#1e293b"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.44,
      "xB": 0.05,
      "xC": -0.25,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.22,
      "xEngine": 0.3,
      "xCore": -0.05,
      "frameRatio": 0.86
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.46,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "coupe_gt": {
    "id": "cat_coupe_gt",
    "type": "coupe_gt",
    "name": "Apex Grand Tourer 3.8",
    "nameRu": "Apex Grand Tourer 3.8",
    "brand": "Apex Motors",
    "category": "sport",
    "classType": "Luxury GT Coupe",
    "year": 2022,
    "descriptionRu": "Luxurious high-speed grand touring coupe built for effortless high-velocity highway cruising.",
    "width": 21,
    "length": 46,
    "wheelBase": 28,
    "mass": 1650,
    "maxSpeed": 270,
    "reverseMaxSpeed": 55,
    "acceleration": 58,
    "brakingForce": 300,
    "friction": 0.991,
    "turnSpeed": 4.5,
    "maxSteerAngle": 0.66,
    "minSteerAngle": 0.13,
    "grip": 0.991,
    "driftGrip": 0.45,
    "topSpeedKmh": 270,
    "powerHp": 450,
    "engineSpec": "3.8L Twin-Turbo V6",
    "driveType": "RWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.2,
      0,
      3.1,
      2.1,
      1.55,
      1.22,
      1,
      0.8
    ],
    "finalDriveRatio": 3.4,
    "hasTransferCase": false,
    "powertrainCategory": "sport",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 75,
    "lpgCapacity": 65,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "hid_xenon",
      "riseTime": 0.35,
      "decayTime": 0.22,
      "colorTemp": "#f0fdf4",
      "hasIgnitionFlicker": true
    },
    "turnSignalConfig": {
      "type": "dynamic_sequential_led",
      "baseFrequency": 1.3,
      "dutyCycle": 0.54,
      "sweepDuration": 0.28,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_dynamic",
      "soundType": "luxury_acoustic"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "display",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Titanium Silver",
        "hex": "#94a3b8"
      },
      {
        "name": "Deep Sapphire",
        "hex": "#1e3a8a"
      },
      {
        "name": "Gloss Black",
        "hex": "#09090b"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.26,
      "xA": 0.16,
      "xB": -0.06,
      "xC": -0.16,
      "xRearHeader": -0.24,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.28,
      "xEngine": -0.17,
      "xCore": -0.02,
      "frameRatio": 0.7
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "fire_engine": {
    "id": "cat_fire_engine",
    "type": "fire_engine",
    "name": "Sentinel Fire Engine Pumper",
    "nameRu": "Sentinel Fire Engine Pumper",
    "brand": "Sentinel Emergency",
    "category": "emergency",
    "classType": "Heavy Fire Pumper",
    "year": 2005,
    "descriptionRu": "Heavy-duty all-terrain fire pumper equipped with high-pressure water pump and acoustic sirens.",
    "width": 27,
    "length": 88,
    "wheelBase": 50,
    "mass": 11000,
    "maxSpeed": 130,
    "reverseMaxSpeed": 35,
    "acceleration": 22,
    "brakingForce": 220,
    "friction": 0.982,
    "turnSpeed": 3.2,
    "maxSteerAngle": 0.6,
    "minSteerAngle": 0.09,
    "grip": 0.965,
    "driftGrip": 0.25,
    "topSpeedKmh": 90,
    "powerHp": 150,
    "engineSpec": "6.0L V8 Carbureted Heavy Duty",
    "driveType": "RWD",
    "transmission": "AUTO",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "emergency",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Fire Engine Red",
        "hex": "#dc2626",
        "roofHex": "#ffffff"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "fire_ladder": {
    "id": "cat_fire_ladder",
    "type": "fire_ladder",
    "name": "Sentinel 30m Aerial Ladder",
    "nameRu": "Sentinel 30m Aerial Ladder",
    "brand": "Sentinel Emergency",
    "category": "emergency",
    "classType": "Fire Aerial Ladder Truck",
    "year": 2016,
    "descriptionRu": "Telescopic 30-meter extendable fire rescue aerial ladder on heavy multi-axle chassis.",
    "width": 28,
    "length": 98,
    "wheelBase": 58,
    "mass": 13500,
    "maxSpeed": 120,
    "reverseMaxSpeed": 30,
    "acceleration": 18,
    "brakingForce": 210,
    "friction": 0.98,
    "turnSpeed": 3,
    "maxSteerAngle": 0.58,
    "minSteerAngle": 0.08,
    "grip": 0.955,
    "driftGrip": 0.22,
    "topSpeedKmh": 120,
    "powerHp": 260,
    "engineSpec": "11.76L V8 Turbo Diesel Heavy",
    "driveType": "RWD",
    "transmission": "AUTO",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "emergency",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Fire Ladder Red",
        "hex": "#dc2626",
        "roofHex": "#ffffff"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_tow": {
    "id": "cat_truck_tow",
    "type": "truck_tow",
    "name": "Bison TowMaster Platform",
    "nameRu": "Bison TowMaster Platform",
    "brand": "Bison Trucks",
    "category": "commercial",
    "classType": "Recovery Tow Truck",
    "year": 2017,
    "descriptionRu": "Specialized recovery tow truck featuring hydraulic slide bed and heavy-duty winch.",
    "width": 24,
    "length": 62,
    "wheelBase": 38,
    "mass": 4200,
    "maxSpeed": 140,
    "reverseMaxSpeed": 38,
    "acceleration": 20,
    "brakingForce": 210,
    "friction": 0.983,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.62,
    "minSteerAngle": 0.1,
    "grip": 0.968,
    "driftGrip": 0.28,
    "topSpeedKmh": 140,
    "powerHp": 152,
    "engineSpec": "3.8L Turbo Diesel Hydraulic",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 120,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Warning Amber",
        "hex": "#eab308"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.24,
      "xA": 0.22,
      "xB": 0.2,
      "xC": 0.18,
      "xRearHeader": 0.14,
      "xTail": -0.5,
      "xFrontAxle": 0.28,
      "xRearAxle": -0.27,
      "xEngine": 0.37,
      "xCore": -0.1,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_armored": {
    "id": "cat_truck_armored",
    "type": "truck_armored",
    "name": "Bison Vault Guard",
    "nameRu": "Bison Vault Guard",
    "brand": "Bison Trucks",
    "category": "commercial",
    "classType": "Armored Cash-In-Transit",
    "year": 2019,
    "descriptionRu": "Heavy armored security van with bulletproof ballistic plating and secure cash vault.",
    "width": 25,
    "length": 58,
    "wheelBase": 36,
    "mass": 5500,
    "maxSpeed": 140,
    "reverseMaxSpeed": 35,
    "acceleration": 20,
    "brakingForce": 220,
    "friction": 0.984,
    "turnSpeed": 3.4,
    "maxSteerAngle": 0.62,
    "minSteerAngle": 0.09,
    "grip": 0.97,
    "driftGrip": 0.28,
    "topSpeedKmh": 140,
    "powerHp": 180,
    "engineSpec": "4.5L V8 Diesel Heavy Guard",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 120,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Блокировка межосевая и заднего дифференциала (МОБ + МКБ-З)",
      "driveLayoutRu": "4WD / AWD с электро-пневматической блокировкой мостов"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Vault Sand",
        "hex": "#ca8a04",
        "roofHex": "#15803d"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.44,
      "xB": 0.05,
      "xC": -0.25,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.22,
      "xEngine": 0.3,
      "xCore": -0.05,
      "frameRatio": 0.86
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "delivery_truck": {
    "id": "cat_delivery_truck",
    "type": "delivery_truck",
    "name": "Bison Express Stepvan",
    "nameRu": "Bison Express Stepvan",
    "brand": "Bison Trucks",
    "category": "commercial",
    "classType": "Express Delivery Van",
    "year": 2020,
    "descriptionRu": "Dedicated delivery stepvan with sliding cabin doors for rapid package distribution.",
    "width": 23,
    "length": 56,
    "wheelBase": 35,
    "mass": 3200,
    "maxSpeed": 145,
    "reverseMaxSpeed": 38,
    "acceleration": 22,
    "brakingForce": 220,
    "friction": 0.984,
    "turnSpeed": 3.8,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.1,
    "grip": 0.97,
    "driftGrip": 0.3,
    "topSpeedKmh": 145,
    "powerHp": 125,
    "engineSpec": "2.7L EFI Commercial",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "van",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 170,
    "lpgCapacity": 120,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Express Yellow",
        "hex": "#facc15"
      },
      {
        "name": "Courier White",
        "hex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.44,
      "xB": 0.05,
      "xC": -0.25,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.22,
      "xEngine": 0.3,
      "xCore": -0.05,
      "frameRatio": 0.86
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.46,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "van_camper": {
    "id": "deal_van_camper",
    "type": "van_camper",
    "name": "Bison Nomad Camper",
    "nameRu": "Horizon Voyager",
    "brand": "Horizon",
    "category": "commercial",
    "classType": "4x4 Expedition Camper",
    "year": 2022,
    "descriptionRu": "All-terrain camper van built for autonomous wilderness travel: rooftop A/C, solar panels, bike rack and awning.",
    "priceRub": 1380000,
    "width": 22,
    "length": 52,
    "wheelBase": 32,
    "mass": 2600,
    "maxSpeed": 140,
    "reverseMaxSpeed": 38,
    "acceleration": 18,
    "brakingForce": 200,
    "friction": 0.983,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.62,
    "minSteerAngle": 0.1,
    "grip": 0.968,
    "driftGrip": 0.29,
    "topSpeedKmh": 140,
    "powerHp": 150,
    "accelSec": 15.2,
    "displacementL": 2.7,
    "engineSpec": "2.7L PRO Inline-4",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "van",
    "fuelType": "ai95",
    "fuelTypeLabel": "Premium 95",
    "tankCapacity": 170,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "smart",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Sand Expedition",
        "hex": "#d97706"
      },
      {
        "name": "Tactical Khaki",
        "hex": "#3f6212"
      },
      {
        "name": "Glacial White",
        "hex": "#ffffff"
      },
      {
        "name": "Graphite Gray",
        "hex": "#334155"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.26,
      "xA": 0.2,
      "xB": -0.02,
      "xC": -0.28,
      "xRearHeader": -0.4,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.26,
      "xEngine": 0.21,
      "xCore": -0.04,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.46,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "classic_compact": {
    "id": "deal_classic_compact",
    "type": "classic_compact",
    "name": "Kestrel Prime 1.2",
    "nameRu": "Aegis Compact H210",
    "brand": "Aegis",
    "category": "passenger",
    "classType": "Compact Hatchback",
    "year": 2004,
    "descriptionRu": "Cult front-wheel-drive hatchback. Lightweight, nimble in city traffic and well known to every enthusiast.",
    "priceRub": 220000,
    "width": 18,
    "length": 36,
    "wheelBase": 22,
    "mass": 900,
    "maxSpeed": 140,
    "reverseMaxSpeed": 38,
    "acceleration": 22,
    "brakingForce": 190,
    "friction": 0.986,
    "turnSpeed": 4.4,
    "maxSteerAngle": 0.7,
    "minSteerAngle": 0.15,
    "grip": 0.975,
    "driftGrip": 0.33,
    "topSpeedKmh": 156,
    "powerHp": 78,
    "accelSec": 13.2,
    "displacementL": 1.5,
    "engineSpec": "1.5L 8V EFI Inline-4",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_round",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "classic",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Wet Asphalt",
        "hex": "#475569"
      },
      {
        "name": "Iguana Metallic",
        "hex": "#15803d"
      },
      {
        "name": "Currency Silver",
        "hex": "#cbd5e1"
      },
      {
        "name": "Pearl Black",
        "hex": "#09090b"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.03,
      "xC": -0.12,
      "xRearHeader": -0.21,
      "xTail": -0.5,
      "xFrontAxle": 0.29,
      "xRearAxle": -0.28,
      "xEngine": 0.21,
      "xCore": -0.02
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "retro_bubble": {
    "id": "deal_retro_bubble",
    "type": "retro_bubble",
    "name": "Micro Bubble 900",
    "nameRu": "Aegis Vintage R40",
    "brand": "Aegis Retro",
    "category": "passenger",
    "classType": "Vintage Bubble Car",
    "year": 1982,
    "descriptionRu": "Compact retro automobile with rear-engine layout and air cooling. A soulful classic vehicle!",
    "priceRub": 110000,
    "width": 17,
    "length": 32,
    "wheelBase": 20,
    "mass": 750,
    "maxSpeed": 120,
    "reverseMaxSpeed": 32,
    "acceleration": 20,
    "brakingForce": 180,
    "friction": 0.986,
    "turnSpeed": 4.8,
    "maxSteerAngle": 0.72,
    "minSteerAngle": 0.16,
    "grip": 0.972,
    "driftGrip": 0.32,
    "topSpeedKmh": 120,
    "powerHp": 40,
    "accelSec": 22,
    "displacementL": 1.2,
    "engineSpec": "1.2L V4 Air-Cooled",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 45,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_round",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Matador Red",
        "hex": "#dc2626"
      },
      {
        "name": "Retro Turquoise",
        "hex": "#0891b2"
      },
      {
        "name": "Lemon Yellow",
        "hex": "#f59e0b"
      },
      {
        "name": "Cream Beige",
        "hex": "#fef08a"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.2,
      "xA": 0.08,
      "xB": -0.06,
      "xC": -0.2,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.25,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "offroad_hardcore": {
    "id": "deal_offroad_hardcore",
    "type": "offroad_hardcore",
    "name": "Nordic Taiga 4x4",
    "nameRu": "Titan Pathfinder",
    "brand": "Titan",
    "category": "suv",
    "classType": "4x4 Hardcore Offroader",
    "year": 2022,
    "descriptionRu": "Legendary compact 4x4 offroader featuring permanent four-wheel drive, low-range transfer case and center differential lock.",
    "priceRub": 490000,
    "width": 22,
    "length": 44,
    "wheelBase": 26,
    "mass": 1950,
    "maxSpeed": 150,
    "reverseMaxSpeed": 40,
    "acceleration": 28,
    "brakingForce": 230,
    "friction": 0.984,
    "turnSpeed": 3.8,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.12,
    "grip": 0.982,
    "driftGrip": 0.35,
    "topSpeedKmh": 142,
    "powerHp": 83,
    "accelSec": 17,
    "displacementL": 1.7,
    "engineSpec": "1.7L EFI Inline-4",
    "driveType": "AWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "offroad",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 45,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": true,
      "systemNameRu": "Тройная блокировка 4x4 (МОБ + МКБ-З + МКБ-П)",
      "driveLayoutRu": "4WD с жестким подключением и 3 принудительными блокировками"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Tactical Khaki",
        "hex": "#3f6212"
      },
      {
        "name": "Deep Forest Green",
        "hex": "#14532d"
      },
      {
        "name": "Snow White",
        "hex": "#f8fafc"
      },
      {
        "name": "Nessie Navy",
        "hex": "#1e3a8a"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.22,
      "xA": 0.17,
      "xB": -0.02,
      "xC": -0.3,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.29,
      "xEngine": 0.26,
      "xCore": -0.06,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.42,
        "yFrac": 0,
        "width": 5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "suv_classic_box": {
    "id": "deal_suv_classic_box",
    "type": "suv_classic_box",
    "name": "Nordic Titan 4x4",
    "nameRu": "Aegis Defender 4x4",
    "brand": "Aegis",
    "category": "suv",
    "classType": "Framed Utility 4x4",
    "year": 2021,
    "descriptionRu": "Authentic body-on-frame utility 4x4 with selectable front axle, low-range gearing and solid live axles.",
    "priceRub": 520000,
    "width": 21,
    "length": 45,
    "wheelBase": 27,
    "mass": 1800,
    "maxSpeed": 160,
    "reverseMaxSpeed": 42,
    "acceleration": 26,
    "brakingForce": 220,
    "friction": 0.985,
    "turnSpeed": 3.8,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.13,
    "grip": 0.98,
    "driftGrip": 0.34,
    "topSpeedKmh": 140,
    "powerHp": 112,
    "accelSec": 16.5,
    "displacementL": 2.7,
    "engineSpec": "2.7L Inline-4 Engine",
    "driveType": "AWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.5,
      0,
      3.6,
      2.1,
      1.36,
      0.96
    ],
    "finalDriveRatio": 4.1,
    "hasTransferCase": false,
    "powertrainCategory": "offroad",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 65,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Блокировка раздатки и заднего моста (МОБ + МКБ-З)",
      "driveLayoutRu": "Постоянный полный привод (Full-time 4WD) с блокировкой МОБ и МКБ"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Military Olive Khaki",
        "hex": "#3f6212"
      },
      {
        "name": "White Night",
        "hex": "#f8fafc"
      },
      {
        "name": "Obsidian Black",
        "hex": "#09090b"
      },
      {
        "name": "Deep Forest Green",
        "hex": "#14532d"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.22,
      "xA": 0.17,
      "xB": -0.02,
      "xC": -0.3,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.29,
      "xEngine": 0.26,
      "xCore": -0.06,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.42,
        "yFrac": 0,
        "width": 5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "muscle_classic": {
    "id": "cat_muscle_classic",
    "type": "muscle_classic",
    "name": "Detroit Viper V8 1971",
    "nameRu": "Detroit Viper V8 1971",
    "brand": "Detroit Motor Co.",
    "category": "sport",
    "classType": "V8 Muscle Car",
    "year": 1971,
    "descriptionRu": "Golden era muscle car featuring dual-carburetor induction and wide rear stance.",
    "width": 21,
    "length": 48,
    "wheelBase": 29,
    "mass": 1650,
    "maxSpeed": 230,
    "reverseMaxSpeed": 50,
    "acceleration": 50,
    "brakingForce": 240,
    "friction": 0.988,
    "turnSpeed": 3.9,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.12,
    "grip": 0.978,
    "driftGrip": 0.42,
    "topSpeedKmh": 230,
    "powerHp": 375,
    "engineSpec": "6.6L Big-Block V8 4-BBL",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.2,
      0,
      3.1,
      2.1,
      1.55,
      1.22,
      1,
      0.8
    ],
    "finalDriveRatio": 3.4,
    "hasTransferCase": false,
    "powertrainCategory": "muscle",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 75,
    "lpgCapacity": 65,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "flip",
    "requiredKeyType": "gold",
    "availableColors": [
      {
        "name": "Purple Metallic",
        "hex": "#7c3aed"
      },
      {
        "name": "Satin Black",
        "hex": "#0f172a"
      },
      {
        "name": "Racing Yellow",
        "hex": "#eab308"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.08,
      "xA": 0.02,
      "xB": -0.12,
      "xC": -0.22,
      "xRearHeader": -0.26,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.22,
      "xCore": -0.08
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "van_cargo_old": {
    "id": "cat_van_cargo_old",
    "type": "van_cargo_old",
    "name": "Bison Pathfinder Van",
    "nameRu": "Bison Pathfinder Van",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 21,
    "length": 46,
    "wheelBase": 28,
    "mass": 1700,
    "maxSpeed": 135,
    "reverseMaxSpeed": 35,
    "acceleration": 18,
    "brakingForce": 190,
    "friction": 0.983,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.62,
    "minSteerAngle": 0.11,
    "grip": 0.968,
    "driftGrip": 0.3,
    "topSpeedKmh": 30,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "AWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 120,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.44,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": "iron",
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.44,
      "xB": 0.05,
      "xC": -0.25,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.22,
      "xEngine": 0.3,
      "xCore": -0.05,
      "frameRatio": 0.86
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.46,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "truck_box": {
    "id": "cat_truck_box",
    "type": "truck_box",
    "name": "Titan Cargo Box 5T",
    "nameRu": "Titan Cargo Box 5T",
    "brand": "Titan Heavy",
    "category": "commercial",
    "classType": "Medium Duty Box Truck",
    "year": 2019,
    "descriptionRu": "Classic medium-duty cargo truck featuring rigid insulated box body.",
    "width": 25,
    "length": 68,
    "wheelBase": 42,
    "mass": 6200,
    "maxSpeed": 125,
    "reverseMaxSpeed": 32,
    "acceleration": 15,
    "brakingForce": 185,
    "friction": 0.981,
    "turnSpeed": 3.2,
    "maxSteerAngle": 0.6,
    "minSteerAngle": 0.09,
    "grip": 0.958,
    "driftGrip": 0.24,
    "topSpeedKmh": 125,
    "powerHp": 170,
    "engineSpec": "4.43L Turbo Diesel 5T",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "White Cab + Blue Box",
        "hex": "#0284c7",
        "roofHex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_dump": {
    "id": "cat_truck_dump",
    "type": "truck_dump",
    "name": "Titan Dump 10T",
    "nameRu": "Titan Dump 10T",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 26,
    "length": 72,
    "wheelBase": 44,
    "mass": 8500,
    "maxSpeed": 115,
    "reverseMaxSpeed": 30,
    "acceleration": 14,
    "brakingForce": 180,
    "friction": 0.98,
    "turnSpeed": 3.2,
    "maxSteerAngle": 0.6,
    "minSteerAngle": 0.08,
    "grip": 0.955,
    "driftGrip": 0.23,
    "topSpeedKmh": 26,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "truck",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_zil_dump": {
    "id": "cat_truck_zil_dump",
    "type": "truck_zil_dump",
    "name": "Titan Quarry V8",
    "nameRu": "Titan Quarry V8",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 25,
    "length": 58,
    "wheelBase": 35,
    "mass": 4800,
    "maxSpeed": 110,
    "reverseMaxSpeed": 28,
    "acceleration": 18,
    "brakingForce": 195,
    "friction": 0.981,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.09,
    "grip": 0.965,
    "driftGrip": 0.25,
    "topSpeedKmh": 25,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "retro",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "color": "#0284c7",
    "roofColor": "#f8fafc",
    "dumpColor": "#d97706",
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.24,
      "xA": 0.2,
      "xB": 0.16,
      "xC": 0.12,
      "xRearHeader": 0.08,
      "xTail": -0.5,
      "xFrontAxle": 0.28,
      "xRearAxle": -0.22,
      "xEngine": 0.37,
      "xCore": -0.02,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_semi": {
    "id": "cat_truck_semi",
    "type": "truck_semi",
    "name": "Titan Atlas 6x4 Prime Mover",
    "nameRu": "Titan Atlas 6x4 Prime Mover",
    "brand": "Titan Heavy",
    "category": "commercial",
    "classType": "Heavy Semi-Tractor",
    "year": 2004,
    "descriptionRu": "Triple-axle semi-tractor equipped with sleeper cab for long-haul semi-trailer operations.",
    "width": 26,
    "length": 64,
    "wheelBase": 38,
    "mass": 7500,
    "maxSpeed": 125,
    "reverseMaxSpeed": 30,
    "acceleration": 18,
    "brakingForce": 210,
    "friction": 0.98,
    "turnSpeed": 3.4,
    "maxSteerAngle": 0.62,
    "minSteerAngle": 0.08,
    "grip": 0.96,
    "driftGrip": 0.25,
    "topSpeedKmh": 110,
    "powerHp": 240,
    "engineSpec": "10.85L V8 Turbo Diesel Heavy",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 350,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "hitchOffset": -12,
    "color": "#d94e16",
    "availableColors": [
      {
        "name": "Atlas Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Atlas Blue",
        "hex": "#1e40af"
      },
      {
        "name": "Arctic White",
        "hex": "#f8fafc"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.44,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.1,
      "xRearHeader": -0.02,
      "xTail": -0.5,
      "xFrontAxle": 0.4,
      "xRearAxle": -0.1,
      "xEngine": 0.32,
      "xCore": -0.12,
      "frameRatio": 0.8,
      "frameMaxHalfWidth": 0.15
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_semi": {
    "id": "cat_trailer_semi",
    "type": "trailer_semi",
    "name": "IronForge Prime Flatbed Trailer",
    "nameRu": "IronForge Prime Flatbed Trailer",
    "brand": "IronForge",
    "category": "trailers",
    "classType": "3-Axle Semi Flatbed",
    "year": 2016,
    "descriptionRu": "Heavy-duty tri-axle semi-flatbed trailer for general cargo and freight transport.",
    "width": 26,
    "length": 120,
    "wheelBase": 80,
    "mass": 6500,
    "maxSpeed": 120,
    "reverseMaxSpeed": 30,
    "acceleration": 0,
    "brakingForce": 300,
    "friction": 0.98,
    "turnSpeed": 3,
    "maxSteerAngle": 0,
    "minSteerAngle": 0,
    "grip": 0.975,
    "driftGrip": 0.3,
    "topSpeedKmh": 120,
    "powerHp": 100,
    "engineSpec": "Kingpin 2\" (50mm)",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "couplerOffset": 50,
    "color": "#1e3a8a",
    "availableColors": [
      {
        "name": "Flatbed Blue",
        "hex": "#1d4ed8"
      },
      {
        "name": "Industrial Gray",
        "hex": "#475569"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.48,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.48,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_semi_box": {
    "id": "cat_trailer_semi_box",
    "type": "trailer_semi_box",
    "name": "IronForge Thermo Reefer Trailer",
    "nameRu": "IronForge Thermo Reefer Trailer",
    "brand": "IronForge",
    "category": "trailers",
    "classType": "Isothermal Reefer Trailer",
    "year": 2015,
    "descriptionRu": "Insulated refrigerated semi-trailer designed for temperature-controlled cargo logistics.",
    "width": 26,
    "length": 124,
    "wheelBase": 82,
    "mass": 7200,
    "maxSpeed": 120,
    "reverseMaxSpeed": 30,
    "acceleration": 0,
    "brakingForce": 320,
    "friction": 0.98,
    "turnSpeed": 3,
    "maxSteerAngle": 0,
    "minSteerAngle": 0,
    "grip": 0.975,
    "driftGrip": 0.3,
    "topSpeedKmh": 120,
    "powerHp": 100,
    "engineSpec": "Thermo Unit Refrigeration",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "couplerOffset": 50,
    "color": "#f8fafc",
    "availableColors": [
      {
        "name": "Reefer White",
        "hex": "#f8fafc",
        "roofHex": "#dc2626"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.48,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.48,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_semi_tanker": {
    "id": "cat_trailer_semi_tanker",
    "type": "trailer_semi_tanker",
    "name": "IronForge Hazmat Fuel Tanker 30m³",
    "nameRu": "IronForge Hazmat Fuel Tanker 30m³",
    "brand": "IronForge",
    "category": "trailers",
    "classType": "Fuel Semi-Tanker",
    "year": 2018,
    "descriptionRu": "Large-capacity triple-compartment fuel tanker semi-trailer for bulk fuel distribution.",
    "width": 26,
    "length": 120,
    "wheelBase": 80,
    "mass": 7800,
    "massEmpty": 7800,
    "maxSpeed": 115,
    "reverseMaxSpeed": 30,
    "acceleration": 0,
    "brakingForce": 340,
    "friction": 0.98,
    "turnSpeed": 3,
    "maxSteerAngle": 0,
    "minSteerAngle": 0,
    "grip": 0.97,
    "driftGrip": 0.28,
    "topSpeedKmh": 115,
    "powerHp": 100,
    "engineSpec": "3-Compartment 30m³ Tank",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "couplerOffset": 50,
    "color": "#ea580c",
    "availableColors": [
      {
        "name": "Hazmat Orange",
        "hex": "#ea580c"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.48,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.48,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_semi_container": {
    "id": "cat_trailer_semi_container",
    "type": "trailer_semi_container",
    "name": "IronForge Intermodal Container 40ft",
    "nameRu": "IronForge Intermodal Container 40ft",
    "brand": "IronForge",
    "category": "trailers",
    "classType": "Container Chassis Trailer",
    "year": 2017,
    "descriptionRu": "Container chassis semi-trailer equipped with secured 40-foot intermodal shipping container.",
    "width": 26,
    "length": 126,
    "wheelBase": 82,
    "mass": 8500,
    "maxSpeed": 120,
    "reverseMaxSpeed": 30,
    "acceleration": 0,
    "brakingForce": 330,
    "friction": 0.98,
    "turnSpeed": 3,
    "maxSteerAngle": 0,
    "minSteerAngle": 0,
    "grip": 0.975,
    "driftGrip": 0.3,
    "topSpeedKmh": 120,
    "powerHp": 100,
    "engineSpec": "Twist-Lock 40ft Locks",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "couplerOffset": 50,
    "color": "#991b1b",
    "availableColors": [
      {
        "name": "Container Red",
        "hex": "#991b1b"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.48,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.48,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_semi_lowboy": {
    "id": "cat_trailer_semi_lowboy",
    "type": "trailer_semi_lowboy",
    "name": "IronForge Titan Lowboy 40T",
    "nameRu": "IronForge Titan Lowboy 40T",
    "brand": "IronForge",
    "category": "trailers",
    "classType": "Heavy Lowboy Trailer",
    "year": 2019,
    "descriptionRu": "Heavy-duty low-deck drop-deck trailer for transporting road rollers, pavers, and tractors.",
    "width": 28,
    "length": 130,
    "wheelBase": 86,
    "mass": 8900,
    "maxSpeed": 110,
    "reverseMaxSpeed": 30,
    "acceleration": 0,
    "brakingForce": 350,
    "friction": 0.978,
    "turnSpeed": 3,
    "maxSteerAngle": 0,
    "minSteerAngle": 0,
    "grip": 0.97,
    "driftGrip": 0.28,
    "topSpeedKmh": 110,
    "powerHp": 100,
    "engineSpec": "Ramps 40-Ton Capacity",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "couplerOffset": 54,
    "color": "#d97706",
    "availableColors": [
      {
        "name": "Lowboy Amber",
        "hex": "#d97706"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.48,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.48,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_tanker": {
    "id": "cat_truck_tanker",
    "type": "truck_tanker",
    "name": "Titan Fuel Tanker Hazmat",
    "nameRu": "Titan Fuel Tanker Hazmat",
    "brand": "Titan Heavy",
    "category": "commercial",
    "classType": "Fuel Tanker Truck",
    "year": 2015,
    "descriptionRu": "Hazardous material fuel tanker truck with delivery pump and flow meter for gas stations.",
    "width": 26,
    "length": 76,
    "wheelBase": 46,
    "mass": 9200,
    "maxSpeed": 110,
    "reverseMaxSpeed": 30,
    "acceleration": 12,
    "brakingForce": 175,
    "friction": 0.979,
    "turnSpeed": 3,
    "maxSteerAngle": 0.58,
    "minSteerAngle": 0.08,
    "grip": 0.95,
    "driftGrip": 0.22,
    "topSpeedKmh": 110,
    "powerHp": 240,
    "engineSpec": "10.85L V8 Turbo Diesel Tanker",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Hazmat Orange",
        "hex": "#ea580c"
      }
    ],
    "fluidTank": {
      "capacity": 4800,
      "currentVolume": 4800,
      "currentAmount": 4800,
      "liquidType": "fuel_ai95",
      "isHermetic": true,
      "leakProbabilityPerSec": 0,
      "dripRatePerSec": 0,
      "isPunctured": false,
      "punctureRatePerSec": 25,
      "drainValveOpen": false,
      "hasWaterHose": false,
      "isWaterHoseDeployed": false
    },
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_water": {
    "id": "cat_truck_water",
    "type": "truck_water",
    "name": "Titan Aqua Sprinkler",
    "nameRu": "Titan Aqua Sprinkler",
    "brand": "Titan Heavy",
    "category": "commercial",
    "classType": "Municipal Water Tanker",
    "year": 1991,
    "descriptionRu": "Municipal utility water tanker with rear spray nozzles for street cleaning and dust control.",
    "width": 25,
    "length": 70,
    "wheelBase": 43,
    "mass": 8000,
    "maxSpeed": 118,
    "reverseMaxSpeed": 30,
    "acceleration": 13,
    "brakingForce": 180,
    "friction": 0.98,
    "turnSpeed": 3.2,
    "maxSteerAngle": 0.6,
    "minSteerAngle": 0.08,
    "grip": 0.955,
    "driftGrip": 0.23,
    "topSpeedKmh": 118,
    "powerHp": 150,
    "engineSpec": "6.0L V8 Municipal Spec",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Municipal Orange",
        "hex": "#ea580c",
        "roofHex": "#0284c7"
      }
    ],
    "fluidTank": {
      "capacity": 3000,
      "currentVolume": 3000,
      "currentAmount": 3000,
      "liquidType": "water",
      "isHermetic": false,
      "leakProbabilityPerSec": 0.2,
      "dripRatePerSec": 0.1,
      "isPunctured": false,
      "punctureRatePerSec": 16,
      "drainValveOpen": false,
      "hasWaterHose": true,
      "isWaterHoseDeployed": false
    },
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_flatbed": {
    "id": "cat_truck_flatbed",
    "type": "truck_flatbed",
    "name": "Titan Flatbed Cargo",
    "nameRu": "Titan Flatbed Cargo",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 25,
    "length": 74,
    "wheelBase": 45,
    "mass": 7000,
    "maxSpeed": 120,
    "reverseMaxSpeed": 32,
    "acceleration": 14,
    "brakingForce": 185,
    "friction": 0.981,
    "turnSpeed": 3.2,
    "maxSteerAngle": 0.6,
    "minSteerAngle": 0.08,
    "grip": 0.958,
    "driftGrip": 0.24,
    "topSpeedKmh": 27,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "truck",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "color": "#0284c7",
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.24,
      "xA": 0.22,
      "xB": 0.2,
      "xC": 0.18,
      "xRearHeader": 0.14,
      "xTail": -0.5,
      "xFrontAxle": 0.28,
      "xRearAxle": -0.27,
      "xEngine": 0.37,
      "xCore": -0.1,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "truck_covered": {
    "id": "cat_truck_covered",
    "type": "truck_covered",
    "name": "Titan Canvas Transport",
    "nameRu": "Titan Canvas Transport",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 25,
    "length": 74,
    "wheelBase": 45,
    "mass": 7400,
    "maxSpeed": 118,
    "reverseMaxSpeed": 30,
    "acceleration": 13,
    "brakingForce": 180,
    "friction": 0.981,
    "turnSpeed": 3.1,
    "maxSteerAngle": 0.6,
    "minSteerAngle": 0.08,
    "grip": 0.956,
    "driftGrip": 0.23,
    "topSpeedKmh": 27,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "truck",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "color": "#0284c7",
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.24,
      "xA": 0.22,
      "xB": 0.2,
      "xC": 0.18,
      "xRearHeader": 0.14,
      "xTail": -0.5,
      "xFrontAxle": 0.28,
      "xRearAxle": -0.27,
      "xEngine": 0.37,
      "xCore": -0.1,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "cement_mixer": {
    "id": "cat_cement_mixer",
    "type": "cement_mixer",
    "name": "Titan MixMaster 7m³",
    "nameRu": "Titan MixMaster 7m³",
    "brand": "Titan Heavy",
    "category": "commercial",
    "classType": "Concrete Mixer Truck",
    "year": 2014,
    "descriptionRu": "Heavy construction mixer truck with rotating gravity mixing drum for fresh concrete delivery.",
    "width": 26,
    "length": 72,
    "wheelBase": 44,
    "mass": 9800,
    "maxSpeed": 105,
    "reverseMaxSpeed": 28,
    "acceleration": 11,
    "brakingForce": 170,
    "friction": 0.978,
    "turnSpeed": 3,
    "maxSteerAngle": 0.58,
    "minSteerAngle": 0.07,
    "grip": 0.948,
    "driftGrip": 0.21,
    "topSpeedKmh": 105,
    "powerHp": 280,
    "engineSpec": "11.76L V8 Turbo Diesel Drum",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "White Drum",
        "hex": "#f8fafc",
        "roofHex": "#ea580c"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "garbage_truck": {
    "id": "cat_garbage_truck",
    "type": "garbage_truck",
    "name": "Titan EcoPress Compactor",
    "nameRu": "Titan EcoPress Compactor",
    "brand": "Titan Heavy",
    "category": "commercial",
    "classType": "Municipal Garbage Truck",
    "year": 2018,
    "descriptionRu": "Municipal waste collection truck with rear mechanical loader and hydraulic compaction plate.",
    "width": 26,
    "length": 78,
    "wheelBase": 46,
    "mass": 10500,
    "maxSpeed": 100,
    "reverseMaxSpeed": 28,
    "acceleration": 10,
    "brakingForce": 175,
    "friction": 0.978,
    "turnSpeed": 3,
    "maxSteerAngle": 0.58,
    "minSteerAngle": 0.07,
    "grip": 0.945,
    "driftGrip": 0.2,
    "topSpeedKmh": 100,
    "powerHp": 240,
    "engineSpec": "6.7L Cummins Diesel Compactor",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "truck",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 170,
    "lpgCapacity": 200,
    "fuelCapOffset": {
      "localFFrac": 0.05,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Sanitation Orange",
        "hex": "#ea580c"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "tractor_mtz82": {
    "id": "cat_tractor_mtz82",
    "type": "tractor_mtz82",
    "name": "AgriTech Fieldmaster 82 (4x4)",
    "nameRu": "AgriTech Fieldmaster 82 (4x4)",
    "brand": "AgriTech",
    "category": "special",
    "classType": "AWD Utility Tractor",
    "year": 1994,
    "descriptionRu": "Reliable all-wheel-drive agricultural row-crop tractor with PTO and drawbar hitch.",
    "width": 27,
    "length": 54,
    "wheelBase": 29,
    "mass": 4000,
    "maxSpeed": 70,
    "reverseMaxSpeed": 25,
    "acceleration": 42,
    "brakingForce": 250,
    "friction": 0.982,
    "turnSpeed": 4.8,
    "maxSteerAngle": 0.72,
    "minSteerAngle": 0.25,
    "grip": 0.995,
    "driftGrip": 0.45,
    "topSpeedKmh": 70,
    "powerHp": 81,
    "engineSpec": "4.75L 4-Cyl Diesel 4WD",
    "driveType": "AWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      5.5,
      4.3,
      3.3,
      2.5,
      1.9,
      1.4,
      1,
      0.8,
      0.65
    ],
    "finalDriveRatio": 5.4,
    "hasTransferCase": true,
    "powertrainCategory": "tractor",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 130,
    "lpgCapacity": 100,
    "fuelCapOffset": {
      "localFFrac": -0.42,
      "localRFrac": 0.28,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": true,
      "systemNameRu": "Блокировка МТЗ-82 (МКБ-З педаль + ПВМ самоблок)",
      "driveLayoutRu": "Сельхозтрактор 4x4: гидромеханическая блокировка заднего моста и ПВМ"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.36,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": true,
      "hasTrunk": false,
      "isTractorBonnet": true,
      "isTractorDoors": true
    },
    "keyTier": "classic",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Agri Blue",
        "hex": "#1d4ed8"
      },
      {
        "name": "Agri Red",
        "hex": "#dc2626"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.02,
      "xA": -0.02,
      "xB": -0.14,
      "xC": -0.22,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.34,
      "xEngine": 0.35,
      "xCore": -0.1,
      "frameRatio": 0.75,
      "railRatio": 0.36
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.12
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.12
      },
      "taillightLeft": {
        "xFrac": -0.32,
        "yFrac": -0.41
      },
      "taillightRight": {
        "xFrac": -0.32,
        "yFrac": 0.41
      },
      "fogLightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.12
      },
      "fogLightRight": {
        "xFrac": 0.47,
        "yFrac": 0.12
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "tractor_mtz80": {
    "id": "cat_tractor_mtz80",
    "type": "tractor_mtz80",
    "name": "AgriTech Workhorse 80",
    "nameRu": "AgriTech Workhorse 80",
    "brand": "AgriTech",
    "category": "special",
    "classType": "Row-Crop Tractor 2WD",
    "year": 1988,
    "descriptionRu": "Classic rear-wheel-drive farm tractor with narrow front steering axle for field operations.",
    "width": 26,
    "length": 52,
    "wheelBase": 28,
    "mass": 3800,
    "maxSpeed": 70,
    "reverseMaxSpeed": 25,
    "acceleration": 38,
    "brakingForce": 240,
    "friction": 0.982,
    "turnSpeed": 5,
    "maxSteerAngle": 0.72,
    "minSteerAngle": 0.25,
    "grip": 0.988,
    "driftGrip": 0.4,
    "topSpeedKmh": 70,
    "powerHp": 75,
    "engineSpec": "4.75L 4-Cyl Diesel 2WD",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      5.5,
      4.3,
      3.3,
      2.5,
      1.9,
      1.4,
      1,
      0.8,
      0.65
    ],
    "finalDriveRatio": 5.4,
    "hasTransferCase": true,
    "powertrainCategory": "tractor",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 130,
    "lpgCapacity": 100,
    "fuelCapOffset": {
      "localFFrac": -0.42,
      "localRFrac": 0.28,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": false,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Педаль блокировки заднего дифференциала МТЗ-80 (МКБ-З)",
      "driveLayoutRu": "Заднеприводный трактор: педальная блокировка заднего моста"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.36,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": true,
      "hasTrunk": false,
      "isTractorBonnet": true,
      "isTractorDoors": true
    },
    "keyTier": "classic",
    "requiredKeyType": "iron",
    "availableColors": [
      {
        "name": "Agri Blue",
        "hex": "#1d4ed8"
      },
      {
        "name": "Agri Red",
        "hex": "#dc2626"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.02,
      "xA": -0.02,
      "xB": -0.14,
      "xC": -0.22,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.34,
      "xEngine": 0.35,
      "xCore": -0.1,
      "frameRatio": 0.75,
      "railRatio": 0.36
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.12
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.12
      },
      "taillightLeft": {
        "xFrac": -0.32,
        "yFrac": -0.41
      },
      "taillightRight": {
        "xFrac": -0.32,
        "yFrac": 0.41
      },
      "fogLightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.12
      },
      "fogLightRight": {
        "xFrac": 0.47,
        "yFrac": 0.12
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "tractor_mtz80_old": {
    "id": "cat_tractor_mtz80_old",
    "type": "tractor_mtz80_old",
    "name": "AgriTech Veteran 80",
    "nameRu": "AgriTech Veteran 80",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 25,
    "length": 50,
    "wheelBase": 27,
    "mass": 3700,
    "maxSpeed": 64,
    "reverseMaxSpeed": 22,
    "acceleration": 34,
    "brakingForce": 220,
    "friction": 0.98,
    "turnSpeed": 4.8,
    "maxSteerAngle": 0.72,
    "minSteerAngle": 0.25,
    "grip": 0.98,
    "driftGrip": 0.38,
    "topSpeedKmh": 14,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "tractor",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 100,
    "fuelCapOffset": {
      "localFFrac": -0.42,
      "localRFrac": 0.28,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": false,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Педаль блокировки заднего дифференциала МТЗ-80 (МКБ-З)",
      "driveLayoutRu": "Заднеприводный трактор: педальная блокировка заднего моста"
    },
    "headlightConfig": {
      "bulbType": "vintage_sealed_beam",
      "riseTime": 0.28,
      "decayTime": 0.4,
      "colorTemp": "#fef08a",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.36,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": true,
      "hasTrunk": false,
      "isTractorBonnet": true,
      "isTractorDoors": true
    },
    "keyTier": "flip",
    "requiredKeyType": "iron",
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.02,
      "xA": -0.02,
      "xB": -0.14,
      "xC": -0.22,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.34,
      "xEngine": 0.35,
      "xCore": -0.1,
      "frameRatio": 0.75,
      "railRatio": 0.36
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.12
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.12
      },
      "taillightLeft": {
        "xFrac": -0.32,
        "yFrac": -0.41
      },
      "taillightRight": {
        "xFrac": -0.32,
        "yFrac": 0.41
      },
      "fogLightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.12
      },
      "fogLightRight": {
        "xFrac": 0.47,
        "yFrac": 0.12
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "moto_izh_jupiter": {
    "id": "cat_moto_izh_jupiter",
    "type": "moto_izh_jupiter",
    "name": "Stellar Cruiser 350",
    "nameRu": "Stellar Cruiser 350",
    "brand": "Stellar Moto",
    "category": "moto",
    "classType": "Classic Road Motorcycle",
    "year": 1992,
    "descriptionRu": "Twin-cylinder classic road motorcycle with distinctive dual-exhaust note.",
    "width": 10,
    "length": 24,
    "wheelBase": 15,
    "mass": 175,
    "maxSpeed": 165,
    "reverseMaxSpeed": 20,
    "acceleration": 50,
    "brakingForce": 260,
    "friction": 0.99,
    "turnSpeed": 6.2,
    "maxSteerAngle": 0.72,
    "minSteerAngle": 0.16,
    "grip": 0.985,
    "driftGrip": 0.4,
    "topSpeedKmh": 165,
    "powerHp": 24,
    "engineSpec": "348cc 2-Stroke Twin",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -2.8,
      0,
      2.7,
      1.85,
      1.35,
      1.05,
      0.85
    ],
    "finalDriveRatio": 3.2,
    "hasTransferCase": false,
    "powertrainCategory": "moto",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 14,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0.08,
      "localRFrac": 0,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.36,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Stellar Red",
        "hex": "#dc2626"
      },
      {
        "name": "Stellar Azure",
        "hex": "#0284c7"
      },
      {
        "name": "Stellar Black",
        "hex": "#0f172a"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "motorcycle"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "taillightRight": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "fogLightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "moto_ural_sidecar": {
    "id": "cat_moto_ural_sidecar",
    "type": "moto_ural_sidecar",
    "name": "Stellar Outback Sidecar",
    "nameRu": "Stellar Outback Sidecar",
    "brand": "Stellar Moto",
    "category": "moto",
    "classType": "Heavy Sidecar Motorcycle",
    "year": 1985,
    "descriptionRu": "Heavy-duty boxer twin motorcycle featuring shaft drive and passenger sidecar.",
    "width": 19,
    "length": 26,
    "wheelBase": 16,
    "mass": 350,
    "maxSpeed": 145,
    "reverseMaxSpeed": 25,
    "acceleration": 42,
    "brakingForce": 240,
    "friction": 0.988,
    "turnSpeed": 4.8,
    "maxSteerAngle": 0.7,
    "minSteerAngle": 0.15,
    "grip": 0.978,
    "driftGrip": 0.36,
    "topSpeedKmh": 145,
    "powerHp": 36,
    "engineSpec": "649cc 4-Stroke Boxer Twin",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -2.8,
      0,
      2.7,
      1.85,
      1.35,
      1.05,
      0.85
    ],
    "finalDriveRatio": 3.2,
    "hasTransferCase": false,
    "powertrainCategory": "moto",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 19,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0.08,
      "localRFrac": 0,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.36,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Militia Khaki",
        "hex": "#4d5b38"
      },
      {
        "name": "Gloss Blue",
        "hex": "#1d4ed8"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "moto_sidecar"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.44,
        "yFrac": -0.225
      },
      "headlightRight": {
        "xFrac": 0.125,
        "yFrac": 0.39
      },
      "taillightLeft": {
        "xFrac": -0.45,
        "yFrac": -0.225
      },
      "taillightRight": {
        "xFrac": -0.275,
        "yFrac": 0.425
      },
      "fogLightLeft": {
        "xFrac": 0.44,
        "yFrac": -0.225
      },
      "fogLightRight": {
        "xFrac": 0.125,
        "yFrac": 0.39
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "moto_jawa350": {
    "id": "cat_moto_jawa350",
    "type": "moto_jawa350",
    "name": "Stellar Classic 350",
    "nameRu": "Stellar Classic 350",
    "brand": "Stellar Moto",
    "category": "moto",
    "classType": "Vintage Two-Stroke Moto",
    "year": 1989,
    "descriptionRu": "Iconic retro motorcycle with exceptional agility and classic cigar-pipe exhausts.",
    "width": 10,
    "length": 24,
    "wheelBase": 15,
    "mass": 160,
    "maxSpeed": 175,
    "reverseMaxSpeed": 20,
    "acceleration": 55,
    "brakingForce": 270,
    "friction": 0.99,
    "turnSpeed": 6.4,
    "maxSteerAngle": 0.72,
    "minSteerAngle": 0.16,
    "grip": 0.988,
    "driftGrip": 0.42,
    "topSpeedKmh": 175,
    "powerHp": 26,
    "engineSpec": "343cc 2-Stroke Twin Oil-Inject",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -2.8,
      0,
      2.7,
      1.85,
      1.35,
      1.05,
      0.85
    ],
    "finalDriveRatio": 3.2,
    "hasTransferCase": false,
    "powertrainCategory": "moto",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 14,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0.08,
      "localRFrac": 0,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.36,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Cherry Red",
        "hex": "#881337"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "motorcycle"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "taillightRight": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "fogLightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "moto_sport": {
    "id": "cat_moto_sport",
    "type": "moto_sport",
    "name": "Stellar Superbike 1000",
    "nameRu": "Stellar Superbike 1000",
    "brand": "Stellar Moto",
    "category": "moto",
    "classType": "High-Speed Sportbike",
    "year": 2022,
    "descriptionRu": "Lightning-fast superbike delivering blistering acceleration up to 300+ km/h.",
    "width": 10,
    "length": 23,
    "wheelBase": 14,
    "mass": 195,
    "maxSpeed": 310,
    "reverseMaxSpeed": 20,
    "acceleration": 90,
    "brakingForce": 350,
    "friction": 0.994,
    "turnSpeed": 7.2,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.12,
    "grip": 0.996,
    "driftGrip": 0.5,
    "topSpeedKmh": 310,
    "powerHp": 180,
    "engineSpec": "998cc 16V DOHC Inline-4",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -2.8,
      0,
      2.7,
      1.85,
      1.35,
      1.05,
      0.85
    ],
    "finalDriveRatio": 3.2,
    "hasTransferCase": false,
    "powertrainCategory": "moto",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 14,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0.08,
      "localRFrac": 0,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Racing Blue",
        "hex": "#2563eb"
      },
      {
        "name": "Black / Red",
        "hex": "#dc2626"
      },
      {
        "name": "Acid Green",
        "hex": "#16a34a"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "motorcycle"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "taillightRight": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "fogLightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "moto_chopper": {
    "id": "cat_moto_chopper",
    "type": "moto_chopper",
    "name": "Stellar V-Twin Cruiser",
    "nameRu": "Stellar V-Twin Cruiser",
    "brand": "Stellar Moto",
    "category": "moto",
    "classType": "Custom V-Twin Chopper",
    "year": 2018,
    "descriptionRu": "Custom cruiser with relaxed forward foot controls and deep low-frequency exhaust roar.",
    "width": 12,
    "length": 28,
    "wheelBase": 19,
    "mass": 310,
    "maxSpeed": 190,
    "reverseMaxSpeed": 20,
    "acceleration": 52,
    "brakingForce": 260,
    "friction": 0.99,
    "turnSpeed": 5,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.982,
    "driftGrip": 0.42,
    "topSpeedKmh": 190,
    "powerHp": 78,
    "engineSpec": "1200cc V-Twin Air-Cooled",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -2.8,
      0,
      2.7,
      1.85,
      1.35,
      1.05,
      0.85
    ],
    "finalDriveRatio": 3.2,
    "hasTransferCase": false,
    "powertrainCategory": "moto",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 14,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0.08,
      "localRFrac": 0,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_classic",
      "baseFrequency": 1.36,
      "dutyCycle": 0.56,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bimetal_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Chrome Black",
        "hex": "#09090b"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "motorcycle"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "taillightRight": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "fogLightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "moped_soviet": {
    "id": "cat_moped_soviet",
    "type": "moped_soviet",
    "name": "Stellar Cub Moped 50cc",
    "nameRu": "Stellar Cub Moped 50cc",
    "brand": "Stellar Moto",
    "category": "moto",
    "classType": "Light Utility Moped",
    "year": 1989,
    "descriptionRu": "Lightweight two-speed step-through utility moped with auxiliary pedal assist.",
    "width": 8,
    "length": 20,
    "wheelBase": 13,
    "mass": 55,
    "maxSpeed": 95,
    "reverseMaxSpeed": 15,
    "acceleration": 24,
    "brakingForce": 190,
    "friction": 0.988,
    "turnSpeed": 6.8,
    "maxSteerAngle": 0.75,
    "minSteerAngle": 0.2,
    "grip": 0.975,
    "driftGrip": 0.35,
    "topSpeedKmh": 95,
    "powerHp": 2,
    "engineSpec": "49.8cc 2-Stroke Single",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3,
      0,
      3.2,
      1.8,
      1.1
    ],
    "finalDriveRatio": 3.2,
    "hasTransferCase": false,
    "powertrainCategory": "moped",
    "fuelType": "ai92",
    "fuelTypeLabel": "AI-92",
    "tankCapacity": 8,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0.08,
      "localRFrac": 0,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "classic",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Cub Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Cub Green",
        "hex": "#15803d"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "motorcycle"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "taillightRight": {
        "xFrac": -0.45,
        "yFrac": 0
      },
      "fogLightLeft": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0.46,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_barrel": {
    "id": "cat_trailer_barrel",
    "type": "trailer_barrel",
    "name": "AgriTech FarmTank 3.5m³",
    "nameRu": "AgriTech FarmTank 3.5m³",
    "brand": "AgriTech",
    "category": "trailers",
    "classType": "Tractor Water Tanker",
    "year": 2010,
    "descriptionRu": "Tractor-pulled cylindrical tank trailer for transporting water and liquid fertilizers.",
    "width": 22,
    "length": 38,
    "wheelBase": 16,
    "mass": 1400,
    "maxSpeed": 110,
    "reverseMaxSpeed": 35,
    "acceleration": 0,
    "brakingForce": 140,
    "friction": 0.986,
    "turnSpeed": 3.5,
    "maxSteerAngle": 0,
    "minSteerAngle": 0,
    "grip": 0.982,
    "driftGrip": 0.36,
    "topSpeedKmh": 110,
    "powerHp": 100,
    "engineSpec": "Tractor Drawbar Hitch",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Tank Yellow",
        "hex": "#ca8a04"
      }
    ],
    "fluidTank": {
      "capacity": 800,
      "currentVolume": 800,
      "currentAmount": 800,
      "liquidType": "water",
      "isHermetic": false,
      "leakProbabilityPerSec": 0.25,
      "dripRatePerSec": 0.08,
      "isPunctured": false,
      "punctureRatePerSec": 12,
      "drainValveOpen": false,
      "hasWaterHose": true,
      "isWaterHoseDeployed": false
    },
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.48,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.48,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_vacuum": {
    "id": "cat_trailer_vacuum",
    "type": "trailer_vacuum",
    "name": "AgriTech SlurryVac Tanker",
    "nameRu": "AgriTech SlurryVac Tanker",
    "brand": "AgriTech",
    "category": "trailers",
    "classType": "Vacuum Slurry Tanker",
    "year": 2012,
    "descriptionRu": "Tractor vacuum tank trailer equipped with PTO-driven pump for liquid waste extraction.",
    "width": 22,
    "length": 45,
    "wheelBase": 18,
    "mass": 1480,
    "maxSpeed": 110,
    "reverseMaxSpeed": 35,
    "acceleration": 0,
    "brakingForce": 140,
    "friction": 0.986,
    "turnSpeed": 3.5,
    "maxSteerAngle": 0,
    "minSteerAngle": 0,
    "grip": 0.982,
    "driftGrip": 0.36,
    "topSpeedKmh": 110,
    "powerHp": 100,
    "engineSpec": "PTO Vacuum Pump System",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Slurry Orange",
        "hex": "#ea580c"
      }
    ],
    "fluidTank": {
      "capacity": 800,
      "currentVolume": 800,
      "currentAmount": 800,
      "liquidType": "water",
      "isHermetic": true,
      "leakProbabilityPerSec": 0,
      "dripRatePerSec": 0,
      "isPunctured": false,
      "punctureRatePerSec": 12,
      "drainValveOpen": false,
      "hasWaterHose": true,
      "isWaterHoseDeployed": false
    },
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.37,
        "yFrac": -0.49
      },
      "taillightRight": {
        "xFrac": -0.37,
        "yFrac": 0.49
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "trailer_flatbed_2axle": {
    "id": "cat_trailer_flatbed_2axle",
    "type": "trailer_flatbed_2axle",
    "name": "AgriTech AgriDump 4T",
    "nameRu": "AgriTech AgriDump 4T",
    "brand": "AgriTech",
    "category": "trailers",
    "classType": "2-Axle Farm Trailer",
    "year": 1995,
    "descriptionRu": "Universal 2-axle agricultural tipping trailer with 4-ton payload capacity.",
    "width": 26,
    "length": 68,
    "wheelBase": 38,
    "mass": 2400,
    "maxSpeed": 110,
    "reverseMaxSpeed": 35,
    "acceleration": 0,
    "brakingForce": 200,
    "friction": 0.985,
    "turnSpeed": 3.5,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.1,
    "grip": 0.98,
    "driftGrip": 0.35,
    "topSpeedKmh": 110,
    "powerHp": 100,
    "engineSpec": "Turntable Steering & Hydraulic Lift",
    "driveType": "RWD",
    "transmission": "MANUAL",
    "gearRatios": [
      0
    ],
    "finalDriveRatio": 1,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Trailer",
    "tankCapacity": 55,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": 0,
      "localRFrac": 0,
      "isTrailer": true
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": false,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Farm Green",
        "hex": "#166534"
      },
      {
        "name": "Flatbed Blue",
        "hex": "#1d4ed8"
      }
    ],
    "chassisAnatomy": {
      "specialPreset": "trailer"
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "headlightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "taillightLeft": {
        "xFrac": -0.48,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.48,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0,
        "yFrac": 0
      },
      "fogLightRight": {
        "xFrac": 0,
        "yFrac": 0
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "paver_asphalt_wheeled": {
    "id": "deal_paver_asphalt_wheeled",
    "type": "paver_asphalt_wheeled",
    "name": "IronForge PaveMaster Hydro",
    "nameRu": "IronForge PaveMaster 1800",
    "brand": "IronForge",
    "category": "special",
    "classType": "6x4 Wheeled Asphalt Paver",
    "year": 2021,
    "descriptionRu": "High-performance wheeled asphalt paver with hydraulic material hopper, screed with extensions and dual swivel operator stations.",
    "priceRub": 4800000,
    "width": 32,
    "length": 64,
    "wheelBase": 36,
    "mass": 18500,
    "maxSpeed": 16,
    "reverseMaxSpeed": 10,
    "acceleration": 12,
    "brakingForce": 360,
    "friction": 0.985,
    "turnSpeed": 2,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.25,
    "grip": 0.999,
    "driftGrip": 0.995,
    "topSpeedKmh": 30,
    "powerHp": 175,
    "accelSec": 18,
    "displacementL": 6.7,
    "engineSpec": "6.7L Turbo Diesel (175 hp)",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.6,
      0,
      5.2,
      2
    ],
    "finalDriveRatio": 6.2,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 90,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "display",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Signal Yellow",
        "hex": "#eab308"
      },
      {
        "name": "Construction Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Industrial Gray",
        "hex": "#475569"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.28,
      "xA": 0.24,
      "xB": 0.05,
      "xC": -0.05,
      "xRearHeader": -0.32,
      "xTail": -0.5,
      "xFrontAxle": 0.33,
      "xRearAxle": -0.36,
      "xEngine": 0.2,
      "xCore": 0,
      "frameRatio": 0.75
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "roller_heavy_tandem": {
    "id": "deal_roller_heavy_tandem",
    "type": "roller_heavy_tandem",
    "name": "IronForge Tandem Roll 12T",
    "nameRu": "IronForge TandemRoll 161",
    "brand": "IronForge",
    "category": "special",
    "classType": "12T Articulated Tandem Roller",
    "year": 2022,
    "descriptionRu": "Heavy 12-ton double-drum asphalt roller featuring articulated steering frame, water sprinkler system and hydrostatic drive.",
    "priceRub": 3200000,
    "width": 28,
    "length": 56,
    "wheelBase": 34,
    "mass": 12500,
    "maxSpeed": 12,
    "reverseMaxSpeed": 12,
    "acceleration": 10,
    "brakingForce": 380,
    "friction": 0.988,
    "turnSpeed": 1.8,
    "maxSteerAngle": 0.7,
    "minSteerAngle": 0.3,
    "grip": 0.999,
    "driftGrip": 0.995,
    "topSpeedKmh": 25,
    "powerHp": 130,
    "accelSec": 15,
    "displacementL": 3.6,
    "engineSpec": "3.6L Turbo Diesel (130 hp)",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.6,
      0,
      5.2,
      2
    ],
    "finalDriveRatio": 6.2,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 90,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "display",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Bright Yellow",
        "hex": "#eab308"
      },
      {
        "name": "Builder Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Industrial Green",
        "hex": "#15803d"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.3,
      "xA": 0.25,
      "xB": 0.05,
      "xC": -0.1,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.32,
      "xRearAxle": -0.34,
      "xEngine": 0.18,
      "xCore": 0,
      "frameRatio": 0.6
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "roller_compact_sidewalk": {
    "id": "deal_roller_compact_sidewalk",
    "type": "roller_compact_sidewalk",
    "name": "IronForge Sidewalk Compactor",
    "nameRu": "IronForge SidewalkComp 90",
    "brand": "IronForge",
    "category": "special",
    "classType": "2.2T Articulated Sidewalk Roller",
    "year": 2023,
    "descriptionRu": "Nimble sidewalk roller with articulated frame for compacting asphalt on pedestrian paths, walkways, parking lots and tight alleys.",
    "priceRub": 1450000,
    "width": 18,
    "length": 32,
    "wheelBase": 18,
    "mass": 2200,
    "maxSpeed": 10,
    "reverseMaxSpeed": 10,
    "acceleration": 14,
    "brakingForce": 320,
    "friction": 0.99,
    "turnSpeed": 2.4,
    "maxSteerAngle": 0.75,
    "minSteerAngle": 0.35,
    "grip": 0.999,
    "driftGrip": 0.995,
    "topSpeedKmh": 22,
    "powerHp": 25,
    "accelSec": 12,
    "displacementL": 1.7,
    "engineSpec": "1.7L 3-Cyl Diesel (25 hp)",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.6,
      0,
      5.2,
      2
    ],
    "finalDriveRatio": 6.2,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 90,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "smart",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Vibrant Orange",
        "hex": "#f97316"
      },
      {
        "name": "Signal Yellow",
        "hex": "#facc15"
      },
      {
        "name": "Snow White",
        "hex": "#ffffff"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.3,
      "xA": 0.25,
      "xB": 0.05,
      "xC": -0.1,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.32,
      "xRearAxle": -0.34,
      "xEngine": 0.18,
      "xCore": 0,
      "frameRatio": 0.52
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "roller_pneumatic": {
    "id": "deal_roller_pneumatic",
    "type": "roller_pneumatic",
    "name": "IronForge Pneumatic Tire Roller",
    "nameRu": "IronForge PneumoRoll 24",
    "brand": "IronForge",
    "category": "special",
    "classType": "14-24T Pneumatic Tire Roller",
    "year": 2020,
    "descriptionRu": "Pneumatic tire roller with staggered 8-smooth-tire overlap for pristine finishing compaction on asphalt wearing courses.",
    "priceRub": 3600000,
    "width": 28,
    "length": 58,
    "wheelBase": 36,
    "mass": 14000,
    "maxSpeed": 16,
    "reverseMaxSpeed": 16,
    "acceleration": 11,
    "brakingForce": 350,
    "friction": 0.988,
    "turnSpeed": 1.9,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.28,
    "grip": 0.999,
    "driftGrip": 0.995,
    "topSpeedKmh": 28,
    "powerHp": 100,
    "accelSec": 16,
    "displacementL": 4.1,
    "engineSpec": "4.1L Turbo Diesel (100 hp)",
    "driveType": "AWD",
    "transmission": "AUTO",
    "gearRatios": [
      -3.6,
      0,
      5.2,
      2
    ],
    "finalDriveRatio": 6.2,
    "hasTransferCase": false,
    "powertrainCategory": "machinery",
    "fuelType": "diesel",
    "fuelTypeLabel": "Diesel",
    "tankCapacity": 90,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": false,
      "hasRearBumper": false,
      "hasFenders": false,
      "hasDoors": false,
      "hasTrunk": false
    },
    "keyTier": "display",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Deep Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Signature Yellow",
        "hex": "#eab308"
      },
      {
        "name": "Highway Gray",
        "hex": "#334155"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.3,
      "xA": 0.25,
      "xB": 0.05,
      "xC": -0.1,
      "xRearHeader": -0.3,
      "xTail": -0.5,
      "xFrontAxle": 0.32,
      "xRearAxle": -0.34,
      "xEngine": 0.18,
      "xCore": 0,
      "frameRatio": 0.6
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "wagon_allroad": {
    "id": "deal_wagon_allroad",
    "type": "wagon_allroad",
    "name": "Nordic Cross Country SW",
    "nameRu": "Aegis Allroad W4WD",
    "brand": "Aegis",
    "category": "passenger",
    "classType": "Rugged Station Wagon",
    "year": 2022,
    "descriptionRu": "All-terrain family wagon with protective plastic body cladding, elevated 203 mm ground clearance and disc brakes.",
    "priceRub": 720000,
    "width": 21,
    "length": 45,
    "wheelBase": 27,
    "mass": 1300,
    "maxSpeed": 182,
    "reverseMaxSpeed": 45,
    "acceleration": 32,
    "brakingForce": 250,
    "friction": 0.988,
    "turnSpeed": 4.2,
    "maxSteerAngle": 0.68,
    "minSteerAngle": 0.14,
    "grip": 0.986,
    "driftGrip": 0.38,
    "topSpeedKmh": 180,
    "powerHp": 122,
    "accelSec": 10.5,
    "displacementL": 1.8,
    "engineSpec": "1.8L 16V Inline-4",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "suv",
    "fuelType": "ai95",
    "fuelTypeLabel": "Premium 95",
    "tankCapacity": 50,
    "lpgCapacity": 65,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "led_matrix",
      "riseTime": 0.04,
      "decayTime": 0.06,
      "colorTemp": "#ffffff",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "dynamic_sequential_led",
      "baseFrequency": 1.3,
      "dutyCycle": 0.54,
      "sweepDuration": 0.28,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_dynamic",
      "soundType": "luxury_acoustic"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Mars Metallic Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Diving Blue Pearl",
        "hex": "#2563eb"
      },
      {
        "name": "Carnelian Red",
        "hex": "#dc2626"
      },
      {
        "name": "Platinum Silver",
        "hex": "#cbd5e1"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.15,
      "xA": 0.07,
      "xB": -0.04,
      "xC": -0.22,
      "xRearHeader": -0.26,
      "xTail": -0.5,
      "xFrontAxle": 0.28,
      "xRearAxle": -0.3,
      "xEngine": 0.2,
      "xCore": -0.04
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.44,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "bus_minibus": {
    "id": "deal_bus_minibus",
    "type": "bus_minibus",
    "name": "Metro Shuttle 18-Seater",
    "nameRu": "Horizon Shuttle",
    "brand": "Horizon",
    "category": "bus",
    "classType": "Urban Minibus",
    "year": 2021,
    "descriptionRu": "Reliable passenger minibus. Perfect solution for scheduled municipal passenger transit and small shuttle businesses.",
    "priceRub": 820000,
    "width": 24,
    "length": 62,
    "wheelBase": 38,
    "mass": 2900,
    "maxSpeed": 135,
    "reverseMaxSpeed": 38,
    "acceleration": 20,
    "brakingForce": 220,
    "friction": 0.984,
    "turnSpeed": 3.6,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.1,
    "grip": 0.97,
    "driftGrip": 0.28,
    "topSpeedKmh": 135,
    "powerHp": 107,
    "accelSec": 16,
    "displacementL": 2.7,
    "engineSpec": "2.7L Inline-4 Engine",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -4.5,
      0,
      4.8,
      3.1,
      2,
      1.42,
      1,
      0.75
    ],
    "finalDriveRatio": 4.8,
    "hasTransferCase": true,
    "powertrainCategory": "bus",
    "fuelType": "ai92",
    "fuelTypeLabel": "Regular 92",
    "tankCapacity": 170,
    "lpgCapacity": 120,
    "fuelCapOffset": {
      "localFFrac": -0.15,
      "localRFrac": 0.48,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": false,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Transit Yellow",
        "hex": "#eab308"
      },
      {
        "name": "Glacial White",
        "hex": "#ffffff"
      },
      {
        "name": "Baltic Blue",
        "hex": "#1e3a8a"
      },
      {
        "name": "Titanium Gray",
        "hex": "#64748b"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.44,
      "xB": 0.05,
      "xC": -0.25,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.22,
      "xEngine": 0.3,
      "xCore": -0.05,
      "frameRatio": 0.86
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.46,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "muscle": {
    "id": "cat_muscle",
    "type": "muscle",
    "name": "Detroit Rebel V8 1969",
    "nameRu": "Detroit Rebel V8 1969",
    "brand": "Detroit Legend",
    "category": "sport",
    "classType": "Classic Muscle Car",
    "year": 1969,
    "descriptionRu": "American legend powered by a roaring 7-liter naturally aspirated V8 with explosive straight-line acceleration.",
    "width": 22,
    "length": 49,
    "wheelBase": 30,
    "mass": 1650,
    "maxSpeed": 230,
    "reverseMaxSpeed": 50,
    "acceleration": 52,
    "brakingForce": 250,
    "friction": 0.988,
    "turnSpeed": 4,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.12,
    "grip": 0.98,
    "driftGrip": 0.44,
    "topSpeedKmh": 230,
    "powerHp": 425,
    "engineSpec": "7.0L Big Block V8",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.2,
      0,
      3.1,
      2.1,
      1.55,
      1.22,
      1,
      0.8
    ],
    "finalDriveRatio": 3.4,
    "hasTransferCase": false,
    "powertrainCategory": "muscle",
    "fuelType": "ai95",
    "fuelTypeLabel": "AI-95",
    "tankCapacity": 75,
    "lpgCapacity": 65,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": true
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "availableColors": [
      {
        "name": "Volcano Orange",
        "hex": "#ea580c"
      },
      {
        "name": "Striped Black",
        "hex": "#09090b"
      },
      {
        "name": "Cobalt Blue",
        "hex": "#1d4ed8"
      },
      {
        "name": "Dark Burgundy",
        "hex": "#881337"
      }
    ],
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.08,
      "xA": 0.02,
      "xB": -0.12,
      "xC": -0.22,
      "xRearHeader": -0.26,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.3,
      "xEngine": 0.22,
      "xCore": -0.08
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.28,
        "yFrac": 0,
        "width": 4,
        "height": 1.2,
        "type": "led_strip"
      }
    }
  },
  "fire_rescue": {
    "id": "cat_fire_rescue",
    "type": "fire_rescue",
    "name": "Sentinel Rapid Response Unit",
    "nameRu": "Sentinel Rapid Response Unit",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 24,
    "length": 58,
    "wheelBase": 34,
    "mass": 3500,
    "maxSpeed": 150,
    "reverseMaxSpeed": 40,
    "acceleration": 26,
    "brakingForce": 240,
    "friction": 0.985,
    "turnSpeed": 3.8,
    "maxSteerAngle": 0.65,
    "minSteerAngle": 0.11,
    "grip": 0.975,
    "driftGrip": 0.32,
    "topSpeedKmh": 34,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "emergency",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": true,
      "hasCenter": true,
      "hasRear": true,
      "hasFront": false,
      "systemNameRu": "Пневмоблокировка грузовика (МОБ + МКБ)",
      "driveLayoutRu": "Тяжелый грузовик: межосевая блокировка (МОБ) и межколесная задняя (МКБ)"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "incandescent_modern",
      "baseFrequency": 1.52,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "bcm_relay"
    },
    "hasRoadTrainLights": true,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": false,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.42,
      "xB": 0.24,
      "xC": 0.18,
      "xRearHeader": 0.1,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.2,
      "xEngine": 0.36,
      "xCore": -0.1,
      "frameRatio": 0.85
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": false,
        "xFrac": 0,
        "yFrac": 0,
        "width": 0,
        "height": 0,
        "type": "incandescent"
      }
    }
  },
  "ambulance_van": {
    "id": "cat_ambulance_van",
    "type": "ambulance_van",
    "name": "Sentinel Critical Care Van",
    "nameRu": "Sentinel Critical Care Van",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 23,
    "length": 54,
    "wheelBase": 32,
    "mass": 2800,
    "maxSpeed": 155,
    "reverseMaxSpeed": 40,
    "acceleration": 24,
    "brakingForce": 220,
    "friction": 0.984,
    "turnSpeed": 3.7,
    "maxSteerAngle": 0.64,
    "minSteerAngle": 0.11,
    "grip": 0.972,
    "driftGrip": 0.3,
    "topSpeedKmh": 35,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "emergency",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 55,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": false,
      "hasFenderRepeaters": true,
      "repeaterStyle": "fender_rect",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.46,
      "xA": 0.44,
      "xB": 0.05,
      "xC": -0.25,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.36,
      "xRearAxle": -0.22,
      "xEngine": 0.3,
      "xCore": -0.05,
      "frameRatio": 0.86
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.46,
        "yFrac": 0,
        "width": 5.5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  },
  "ambulance_suv": {
    "id": "cat_ambulance_suv",
    "type": "ambulance_suv",
    "name": "Sentinel Rescue 4x4",
    "nameRu": "Sentinel Rescue 4x4",
    "brand": "Авто",
    "category": "passenger",
    "classType": "Транспорт",
    "year": 2020,
    "descriptionRu": "Надежный транспорт для любых дорог.",
    "width": 22,
    "length": 48,
    "wheelBase": 29,
    "mass": 2200,
    "maxSpeed": 165,
    "reverseMaxSpeed": 42,
    "acceleration": 28,
    "brakingForce": 230,
    "friction": 0.985,
    "turnSpeed": 3.9,
    "maxSteerAngle": 0.66,
    "minSteerAngle": 0.12,
    "grip": 0.978,
    "driftGrip": 0.34,
    "topSpeedKmh": 37,
    "powerHp": 100,
    "engineSpec": "ДВС",
    "driveType": "FWD",
    "transmission": "MANUAL",
    "gearRatios": [
      -3.4,
      0,
      3.5,
      2.05,
      1.38,
      1,
      0.78
    ],
    "finalDriveRatio": 3.9,
    "hasTransferCase": false,
    "powertrainCategory": "emergency",
    "fuelType": "ai95",
    "fuelTypeLabel": "АИ-95",
    "tankCapacity": 55,
    "lpgCapacity": 85,
    "fuelCapOffset": {
      "localFFrac": -0.35,
      "localRFrac": 0.45,
      "isTrailer": false
    },
    "diffCapabilities": {
      "supported": false,
      "hasCenter": false,
      "hasRear": false,
      "hasFront": false,
      "systemNameRu": "Свободный дифференциал",
      "driveLayoutRu": "Стандартный открытый дифференциал"
    },
    "headlightConfig": {
      "bulbType": "halogen_standard",
      "riseTime": 0.18,
      "decayTime": 0.26,
      "colorTemp": "#fef3c7",
      "hasIgnitionFlicker": false
    },
    "turnSignalConfig": {
      "type": "led_crisp",
      "baseFrequency": 1.62,
      "dutyCycle": 0.5,
      "sweepDuration": 0,
      "hasSideMirrorRepeaters": true,
      "hasFenderRepeaters": false,
      "repeaterStyle": "mirror_led_static",
      "soundType": "electronic_click"
    },
    "hasRoadTrainLights": false,
    "bodyPanels": {
      "hasHood": true,
      "hasFrontBumper": true,
      "hasRearBumper": true,
      "hasFenders": true,
      "hasDoors": true,
      "hasTrunk": false
    },
    "keyTier": "flip",
    "requiredKeyType": null,
    "chassisAnatomy": {
      "xNose": 0.5,
      "xCowl": 0.22,
      "xA": 0.17,
      "xB": -0.02,
      "xC": -0.3,
      "xRearHeader": -0.36,
      "xTail": -0.5,
      "xFrontAxle": 0.3,
      "xRearAxle": -0.29,
      "xEngine": 0.26,
      "xCore": -0.06,
      "frameRatio": 0.8
    },
    "opticsMounts": {
      "headlightLeft": {
        "xFrac": 0.47,
        "yFrac": -0.37
      },
      "headlightRight": {
        "xFrac": 0.47,
        "yFrac": 0.37
      },
      "taillightLeft": {
        "xFrac": -0.47,
        "yFrac": -0.38
      },
      "taillightRight": {
        "xFrac": -0.47,
        "yFrac": 0.38
      },
      "fogLightLeft": {
        "xFrac": 0.48,
        "yFrac": -0.31
      },
      "fogLightRight": {
        "xFrac": 0.48,
        "yFrac": 0.31
      },
      "thirdBrakeLight": {
        "enabled": true,
        "xFrac": -0.42,
        "yFrac": 0,
        "width": 5,
        "height": 1.4,
        "type": "led_strip"
      }
    }
  }
};

export function getMasterVehicleConfig(type: CarType | string): MasterVehicleConfig {
  return MASTER_VEHICLE_CONFIGS[type as CarType] || MASTER_VEHICLE_CONFIGS['sedan'];
}

export function getVehicleOpticsMounts(typeOrCar: CarType | string | { type: CarType | string }): VehicleOpticsMounts {
  const type = typeof typeOrCar === 'string' ? typeOrCar : (typeOrCar as any)?.type;
  return getMasterVehicleConfig(type).opticsMounts;
}

export function getVehicleChassisAnatomy(typeOrCar: CarType | string | { type: CarType | string }): VehicleChassisAnatomy {
  const type = typeof typeOrCar === 'string' ? typeOrCar : (typeOrCar as any)?.type;
  return getMasterVehicleConfig(type).chassisAnatomy;
}

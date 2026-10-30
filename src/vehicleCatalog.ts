import { CarType } from './types';
import {
  MASTER_VEHICLE_CONFIGS,
  MasterVehicleConfig,
  VehicleCategory
} from './vehicleMasterRegistry';

export type { VehicleCategory };

export interface VehicleCatalogEntry {
  id: string;
  type: CarType;
  nameRu: string;
  brand: string;
  category: VehicleCategory;
  classType: string;
  year?: number;
  powerHp: number;
  topSpeedKmh: number;
  weightKg: number;
  engineSpec?: string;
  fuelType: 'ai92' | 'ai95' | 'diesel';
  fuelTypeLabel: string;
  colors: { name: string; hex: string; roofHex?: string }[];
  descriptionRu: string;
  gearRatios?: number[];
  finalDriveRatio?: number;
  transmissionType?: 'AUTO' | 'MANUAL';
  hasTransferCase?: boolean;
  tankCapacity?: number;
}

export const DEFAULT_PALETTE = [
  { name: 'Охра Тракт', hex: '#c68a35' },
  { name: 'Белое облако', hex: '#f8fafc' },
  { name: 'Мокрый асфальт', hex: '#334155' },
  { name: 'Черный обсидиан', hex: '#0f172a' },
  { name: 'Коррида (красный)', hex: '#dc2626' },
  { name: 'Океан (синий)', hex: '#1d4ed8' },
  { name: 'Изумруд', hex: '#15803d' },
  { name: 'Песочный', hex: '#ca8a04' }
];

export function deduceCategory(type: string, classType?: string): VehicleCategory {
  const cfg = (MASTER_VEHICLE_CONFIGS as any)[type];
  if (cfg?.category) return cfg.category;
  return 'passenger';
}

function toCatalogEntry(cfg: MasterVehicleConfig): VehicleCatalogEntry {
  return {
    id: cfg.id,
    type: cfg.type,
    nameRu: cfg.nameRu,
    brand: cfg.brand,
    category: cfg.category,
    classType: cfg.classType,
    year: cfg.year,
    powerHp: cfg.powerHp,
    topSpeedKmh: cfg.topSpeedKmh,
    weightKg: cfg.mass,
    engineSpec: cfg.engineSpec,
    fuelType: cfg.fuelType,
    fuelTypeLabel: cfg.fuelTypeLabel,
    colors: (cfg.availableColors && cfg.availableColors.length > 0) ? cfg.availableColors : DEFAULT_PALETTE,
    descriptionRu: cfg.descriptionRu,
    gearRatios: cfg.gearRatios,
    finalDriveRatio: cfg.finalDriveRatio,
    transmissionType: cfg.transmission,
    hasTransferCase: cfg.hasTransferCase,
    tankCapacity: cfg.tankCapacity
  };
}

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = Object.values(MASTER_VEHICLE_CONFIGS).map(toCatalogEntry);

const catalogCache = new Map<string, VehicleCatalogEntry>();
for (const entry of VEHICLE_CATALOG) {
  catalogCache.set(entry.type, entry);
}

export function getVehicleCatalogItem(type: string): VehicleCatalogEntry | undefined {
  return catalogCache.get(type);
}

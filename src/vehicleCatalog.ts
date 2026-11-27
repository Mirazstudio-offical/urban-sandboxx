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

export const DEFAULT_PALETTE: { name: string; hex: string; roofHex?: string }[] = [
  { name: 'Белое облако', hex: '#f8fafc' },
  { name: 'Слоновая кость', hex: '#f3ead6' },
  { name: 'Серебристый металлик', hex: '#cbd5e1' },
  { name: 'Кварц (серый)', hex: '#64748b' },
  { name: 'Мокрый асфальт', hex: '#334155' },
  { name: 'Антрацит', hex: '#1e293b' },
  { name: 'Чёрный обсидиан', hex: '#0f172a' },
  { name: 'Коррида (красный)', hex: '#dc2626' },
  { name: 'Рубин', hex: '#b91c1c' },
  { name: 'Спелая вишня', hex: '#881337' },
  { name: 'Апельсин', hex: '#ea580c' },
  { name: 'Охра Тракт', hex: '#c68a35' },
  { name: 'Шафран (жёлтый)', hex: '#eab308' },
  { name: 'Песочный', hex: '#ca8a04' },
  { name: 'Сафари (бежевый)', hex: '#d6c3a5' },
  { name: 'Изумруд', hex: '#15803d' },
  { name: 'Мурена (тёмно-зелёный)', hex: '#065f46' },
  { name: 'Защитный хаки', hex: '#4d5d3b' },
  { name: 'Бирюза', hex: '#0d9488' },
  { name: 'Голубая Адриатика', hex: '#0284c7' },
  { name: 'Океан (синий)', hex: '#1d4ed8' },
  { name: 'Дипломат (тёмно-синий)', hex: '#1e3a8a' },
  { name: 'Баклажан', hex: '#4c1d95' },
  { name: 'Каштан (коричневый)', hex: '#5c3a21' }
];

function mergeVehiclePalette(
  factoryColors?: { name: string; hex: string; roofHex?: string }[]
): { name: string; hex: string; roofHex?: string }[] {
  const result: { name: string; hex: string; roofHex?: string }[] = [];
  const seen = new Set<string>();

  if (factoryColors && factoryColors.length > 0) {
    for (const c of factoryColors) {
      const key = `${c.hex.toLowerCase()}|${(c.roofHex || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        seen.add(c.hex.toLowerCase());
        result.push(c);
      }
    }
  }

  for (const c of DEFAULT_PALETTE) {
    const hexKey = c.hex.toLowerCase();
    if (!seen.has(hexKey)) {
      seen.add(hexKey);
      result.push(c);
    }
  }

  return result;
}

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
    colors: mergeVehiclePalette(cfg.availableColors),
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


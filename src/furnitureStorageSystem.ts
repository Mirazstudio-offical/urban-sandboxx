import { InventoryItem, ItemCategory, Player } from './types';
import { ITEM_CATALOG, isRegisteredItemId, createItem, getItemTotalWeight, getItemTotalVolume } from './items';
import { sound } from './audio';
import {
  syncFurnitureStorageThermodynamics,
  tickStoveStateThermodynamics,
  tickSinkStateThermodynamics,
  WashingMachineThermalStateLike,
  tickWashingMachineThermodynamics,
  MicrowaveThermalStateLike,
  isMetallicItemForMicrowave,
  tickMicrowaveThermodynamics,
  CoolerThermalStateLike,
  tickCoolerThermodynamics,
  applyConsumptionThermodynamics,
} from './itemThermalSystem';
import {
  fillContainerWithLiquid,
  openFluidContainerIfNeeded,
  isFluidContainerClosed,
  getContainerFreeVolumeMl,
  getContainerConfig,
  syncItemContainerProperties,
  ensureHybridContainerProps,
  updateHybridContainerInteraction,
  isFluidStorageDryForm,
  LIQUID_REGISTRY,
} from './liquidSystem';

export interface FurnitureStorageConfig {
  type: string;
  nameRu: string;
  capacityL: number;
  maxWeightKg: number;
  maxItemVolumeL: number;
  allowedCategories?: ItemCategory[];
  isCold?: boolean; // Fridge / freezer preservation
  isHot?: boolean;  // Heating radiator / convector drying & warming (+65°C)
  heatingTemp?: number;
  iconName?: string;
}

export const FURNITURE_STORAGE_CONFIGS: Record<string, FurnitureStorageConfig> = {
  radiator: {
    type: 'radiator',
    nameRu: 'Радиатор отопления (Сушка +65°C)',
    capacityL: 25.0,
    maxWeightKg: 15.0,
    maxItemVolumeL: 15.0,
    isHot: true,
    heatingTemp: 65.0,
    iconName: 'Flame'
  },
  wardrobe: {
    type: 'wardrobe',
    nameRu: 'Платяной шкаф / Гардероб',
    capacityL: 350.0,
    maxWeightKg: 120.0,
    maxItemVolumeL: 80.0,
    iconName: 'Shirt'
  },
  fridge: {
    type: 'fridge',
    nameRu: 'Холодильник «Бирюса» (+4°C)',
    capacityL: 220.0,
    maxWeightKg: 90.0,
    maxItemVolumeL: 30.0,
    isCold: true,
    allowedCategories: ['food', 'drink', 'med'],
    iconName: 'Snowflake'
  },
  kitchen_counter: {
    type: 'kitchen_counter',
    nameRu: 'Кухонный стол / Гарнитур',
    capacityL: 180.0,
    maxWeightKg: 75.0,
    maxItemVolumeL: 25.0,
    iconName: 'Utensils'
  },
  nightstand: {
    type: 'nightstand',
    nameRu: 'Прикроватная тумбочка',
    capacityL: 35.0,
    maxWeightKg: 18.0,
    maxItemVolumeL: 10.0,
    iconName: 'Archive'
  },
  bookshelf: {
    type: 'bookshelf',
    nameRu: 'Книжный шкаф / Стеллаж',
    capacityL: 120.0,
    maxWeightKg: 80.0,
    maxItemVolumeL: 15.0,
    iconName: 'BookOpen'
  },
  file_cabinet: {
    type: 'file_cabinet',
    nameRu: 'Комод / Тумба для бумаг',
    capacityL: 90.0,
    maxWeightKg: 50.0,
    maxItemVolumeL: 20.0,
    iconName: 'Folder'
  },
  toy_chest: {
    type: 'toy_chest',
    nameRu: 'Сундук для вещей',
    capacityL: 150.0,
    maxWeightKg: 60.0,
    maxItemVolumeL: 40.0,
    iconName: 'Box'
  },
  desk: {
    type: 'desk',
    nameRu: 'Письменный стол (Выдвижные ящики)',
    capacityL: 50.0,
    maxWeightKg: 40.0,
    maxItemVolumeL: 20.0,
    iconName: 'PenTool'
  },
  table: {
    type: 'table',
    nameRu: 'Обеденный / Рабочий стол',
    capacityL: 40.0,
    maxWeightKg: 35.0,
    maxItemVolumeL: 20.0,
    iconName: 'Table'
  },
  lockers: {
    type: 'lockers',
    nameRu: 'Шкафчики для личных вещей',
    capacityL: 160.0,
    maxWeightKg: 90.0,
    maxItemVolumeL: 40.0,
    iconName: 'Lock'
  },
  shelf: {
    type: 'shelf',
    nameRu: 'Навесная полка',
    capacityL: 45.0,
    maxWeightKg: 30.0,
    maxItemVolumeL: 15.0,
    iconName: 'Layers'
  },
  tv_cabinet: {
    type: 'tv_cabinet',
    nameRu: 'Тумба под ТВ / Медиацентр',
    capacityL: 85.0,
    maxWeightKg: 50.0,
    maxItemVolumeL: 30.0,
    iconName: 'Archive'
  },
  sink: {
    type: 'sink',
    nameRu: 'Раковина и смеситель',
    capacityL: 45.0,
    maxWeightKg: 25.0,
    maxItemVolumeL: 15.0,
    iconName: 'Droplets'
  },
  dresser: {
    type: 'dresser',
    nameRu: 'Комод для белья и вещей',
    capacityL: 150.0,
    maxWeightKg: 80.0,
    maxItemVolumeL: 35.0,
    iconName: 'Archive'
  },
  safe: {
    type: 'safe',
    nameRu: 'Бронированный сейф',
    capacityL: 45.0,
    maxWeightKg: 150.0,
    maxItemVolumeL: 20.0,
    iconName: 'Lock'
  },
  washing_machine: {
    type: 'washing_machine',
    nameRu: 'Стиральная машина',
    capacityL: 60.0,
    maxWeightKg: 35.0,
    maxItemVolumeL: 25.0,
    iconName: 'RotateCw'
  },
  stove: {
    type: 'stove',
    nameRu: 'Кухонная плита',
    capacityL: 65.0,
    maxWeightKg: 40.0,
    maxItemVolumeL: 25.0,
    iconName: 'Flame'
  },
  microwave: {
    type: 'microwave',
    nameRu: 'Микроволновая печь',
    capacityL: 25.0,
    maxWeightKg: 15.0,
    maxItemVolumeL: 12.0,
    iconName: 'Zap'
  },
  bath: {
    type: 'bath',
    nameRu: 'Ванна и смеситель',
    capacityL: 180.0,
    maxWeightKg: 140.0,
    maxItemVolumeL: 65.0,
    iconName: 'Bath'
  },
  cooler: {
    type: 'cooler',
    nameRu: 'Кулер для воды (19 л)',
    capacityL: 24.0,
    maxWeightKg: 18.0,
    maxItemVolumeL: 10.0,
    iconName: 'Droplets'
  }
};

export interface StoveBurnerState {
  item: InventoryItem | null;
  gasOn: boolean;
  temperature: number;
  lastUpdatedSec?: number;
}

export interface StoveOvenState {
  items: InventoryItem[];
  gasOn: boolean;
  temperature: number;
  lastUpdatedSec?: number;
}

export interface StoveState {
  burners: [StoveBurnerState, StoveBurnerState, StoveBurnerState, StoveBurnerState];
  oven: StoveOvenState;
}

export const STOVE_OVEN_CONFIG = {
  capacityL: 45.0,
  maxWeightKg: 35.0,
  maxItemVolumeL: 25.0,
  maxTempC: 195.0,
};

export const STOVE_BURNER_MAX_TEMP_C = 215.0;

export interface SinkState {
  waterOn: boolean;
  coldValve: number;        // 0..100
  hotValve: number;         // 0..100
  plugClosed: boolean;      // false = drain open, true = basin fills
  basinWaterMl: number;     // 0..18000
  basinMaxMl: number;       // 18000
  waterTemperature: number; // °C
  lastUpdatedSec?: number;
}

export const SINK_CONFIG = {
  capacityL: 45.0,
  maxWeightKg: 25.0,
  maxItemVolumeL: 15.0,
  basinMaxMl: 18000,
  coldTempC: 8.0,
  hotTempC: 66.0,
  maxFlowMlPerSec: 280.0,
};

export const BATH_CONFIG = {
  capacityL: 180.0,
  maxWeightKg: 140.0,
  maxItemVolumeL: 65.0,
  basinMaxMl: 160000,
  coldTempC: 8.0,
  hotTempC: 68.0,
  maxFlowMlPerSec: 950.0,
};

export type WashingProgramId = WashingMachineThermalStateLike['program'];

export interface WashingProgramDef {
  id: WashingProgramId;
  nameRu: string;
  tempC: number;
  durationSec: number;
  rpm: number;
  descRu: string;
}

export const WASHING_PROGRAMS: WashingProgramDef[] = [
  { id: 'cold', nameRu: 'Холодная 20°', tempC: 20, durationSec: 28, rpm: 800, descRu: 'Деликатная стирка в холодной воде' },
  { id: 'quick', nameRu: 'Быстрая 40°', tempC: 40, durationSec: 24, rpm: 1000, descRu: 'Ежедневная стирка за 24 сек' },
  { id: 'cotton', nameRu: 'Хлопок 60°', tempC: 60, durationSec: 36, rpm: 1200, descRu: 'Глубокая отстирка плотных тканей' },
  { id: 'boil', nameRu: 'Кипячение 90°', tempC: 90, durationSec: 44, rpm: 1200, descRu: 'Дезинфекция кипятком и отжим' },
  { id: 'rinse', nameRu: 'Полоскание', tempC: 18, durationSec: 16, rpm: 1000, descRu: 'Смыв загрязнений чистой водой' },
  { id: 'spin', nameRu: 'Отжим', tempC: 21, durationSec: 14, rpm: 1400, descRu: 'Удаление влаги до ~22%' },
];

export type WashingMachineState = WashingMachineThermalStateLike;
export type MicrowaveState = MicrowaveThermalStateLike;
export type CoolerState = CoolerThermalStateLike;

export const COOLER_CONFIG = {
  capacityL: 24.0,
  maxWeightKg: 18.0,
  bottleMaxMl: 19000,
  coldTempC: 6.0,
  hotTempC: 88.0,
  cupServeMl: 250,
};

export interface FurnitureStorage {
  id: string;
  buildingId: string;
  floor: number;
  furnitureIndex: number;
  furnitureType: string;
  customTitle?: string;
  apartmentId?: string;
  items: InventoryItem[];
  stoveState?: StoveState;
  sinkState?: SinkState;
  washingState?: WashingMachineState;
  microwaveState?: MicrowaveState;
  coolerState?: CoolerState;
}

// Persistent database of all apartment & building furniture storage containers
const furnitureStorageDb = new Map<string, FurnitureStorage>();
const STORAGE_KEY = 'urban_sandbox_furniture_storages_v1';

export function saveFurnitureStoragesToLocalStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const entries = Array.from(furnitureStorageDb.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Failed to save furniture storages to localStorage:', e);
  }
}

export function loadFurnitureStoragesFromLocalStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const [key, val] of parsed) {
          if (key && val && Array.isArray(val.items)) {
            furnitureStorageDb.set(key, val);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load furniture storages from localStorage:', e);
  }
}

export function resetFurnitureStorages(): void {
  furnitureStorageDb.clear();
  saveFurnitureStoragesToLocalStorage();
}

export function exportFurnitureStorageData(): Record<string, FurnitureStorage> {
  const result: Record<string, FurnitureStorage> = {};
  furnitureStorageDb.forEach((val, key) => {
    result[key] = JSON.parse(JSON.stringify(val));
  });
  return result;
}

export function importFurnitureStorageData(data?: Record<string, FurnitureStorage> | null): void {
  // Strictly clear previous world's containers so saves never bleed into each other
  furnitureStorageDb.clear();
  if (data && typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      if (key && val && Array.isArray((val as any).items)) {
        furnitureStorageDb.set(key, JSON.parse(JSON.stringify(val)));
      }
    }
  }
  saveFurnitureStoragesToLocalStorage();
}

// Initialize from local storage on module load
if (typeof window !== 'undefined') {
  loadFurnitureStoragesFromLocalStorage();
}

/**
 * Builds a deterministic storage ID
 */
export function buildFurnitureStorageId(
  buildingId: string,
  floor: number,
  furnitureIndex: number,
  aptId?: string,
  subSlot?: string
): string {
  const base = aptId
    ? `storage_apt_${aptId}_${furnitureIndex}`
    : `storage_bld_${buildingId}_f${floor}_${furnitureIndex}`;
  return subSlot ? `${base}_${subSlot}` : base;
}

/**
 * Seeds initial realistic items for apartment furniture,
 * automatically validating against ITEM_CATALOG and merging ItemDefinition.furnitureSpawns.
 */
function seedApartmentFurnitureItems(
  storageId: string,
  furnitureType: string,
  aptId?: string
): InventoryItem[] {
  const items: InventoryItem[] = [];
  const pushValid = (id: string, count: number = 1) => {
    if (!isRegisteredItemId(id)) return;
    for (let i = 0; i < count; i++) {
      items.push(createItem(id, 1));
    }
  };

  if (furnitureType === 'wardrobe') {
    pushValid('thermal_coat');
    pushValid('beanie_black');
    pushValid('tshirt_white');
    pushValid('jeans_classic');
    pushValid('shoes_sneakers');
    if (aptId?.includes('lenina') || aptId?.includes('cottage')) {
      pushValid('ushanka_hat');
      pushValid('jacket_leather');
      pushValid('backpack');
    }
  } else if (furnitureType === 'fridge') {
    pushValid('drinking_water', 2);
    pushValid('apple', 3);
    pushValid('energy_drink');
    if (aptId?.includes('cottage')) {
      pushValid('camp_flask');
    }
  } else if (furnitureType === 'kitchen_counter') {
    pushValid('pocket_knife');
    pushValid('duct_tape');
    pushValid('rag', 2);
  } else if (furnitureType === 'nightstand') {
    pushValid('flashlight_police');
    pushValid('zippo_lighter');
    pushValid('painkillers');
    pushValid('coin_10');
  } else if (furnitureType === 'bookshelf') {
    pushValid('compass');
    pushValid('cash_500');
  } else if (furnitureType === 'file_cabinet') {
    pushValid('duct_tape');
    pushValid('bandage', 2);
  } else if (furnitureType === 'desk') {
    pushValid('phone');
    pushValid('cash_1000');
    pushValid('vitamins');
  } else if (furnitureType === 'tv_cabinet') {
    pushValid('screwdriver');
    pushValid('duct_tape');
    pushValid('cash_500');
  } else if (furnitureType === 'sink') {
    pushValid('rag', 2);
    pushValid('bandage');
  } else if (furnitureType === 'bath') {
    pushValid('rag');
  } else if (furnitureType === 'washing_machine') {
    pushValid('tshirt_white');
  }

  // Also include any items in ITEM_CATALOG that declare furnitureSpawns for this furnitureType
  for (const def of Object.values(ITEM_CATALOG)) {
    if (!def.furnitureSpawns) continue;
    for (const spawn of def.furnitureSpawns) {
      if (spawn.furnitureType !== furnitureType) continue;
      if (spawn.aptFilter && (!aptId || !aptId.includes(spawn.aptFilter))) continue;
      pushValid(def.itemId, spawn.count || 1);
    }
  }

  return items;
}

export function getExistingFurnitureStorage(storageId: string): FurnitureStorage | undefined {
  return furnitureStorageDb.get(storageId);
}

export function deleteFurnitureStorage(storageId: string): boolean {
  const deleted = furnitureStorageDb.delete(storageId);
  if (deleted) {
    saveFurnitureStoragesToLocalStorage();
  }
  return deleted;
}

/**
 * Retrieves or initializes a furniture storage container
 */
export function getFurnitureStorage(
  buildingId: string,
  floor: number,
  furnitureIndex: number,
  furnitureType: string,
  aptId?: string,
  customTitle?: string,
  subSlot?: string
): FurnitureStorage {
  const id = buildFurnitureStorageId(buildingId, floor, furnitureIndex, aptId, subSlot);
  let storage = furnitureStorageDb.get(id);

  if (!storage) {
    const initialItems = seedApartmentFurnitureItems(id, furnitureType, aptId);
    storage = {
      id,
      buildingId,
      floor,
      furnitureIndex,
      furnitureType,
      customTitle,
      apartmentId: aptId,
      items: initialItems,
      stoveState: furnitureType === 'stove' ? createDefaultStoveState() : undefined,
      sinkState:
        furnitureType === 'sink' || furnitureType === 'bath'
          ? createDefaultSinkState(furnitureType === 'bath')
          : undefined,
      washingState: furnitureType === 'washing_machine' ? createDefaultWashingState() : undefined,
      microwaveState: furnitureType === 'microwave' ? createDefaultMicrowaveState() : undefined,
      coolerState: furnitureType === 'cooler' ? createDefaultCoolerState() : undefined,
    };
    furnitureStorageDb.set(id, storage);
    saveFurnitureStoragesToLocalStorage();
  }

  if (furnitureType === 'stove') {
    ensureStoveState(storage);
  } else if (furnitureType === 'sink' || furnitureType === 'bath') {
    ensureSinkState(storage);
  } else if (furnitureType === 'washing_machine') {
    ensureWashingState(storage);
  } else if (furnitureType === 'microwave') {
    ensureMicrowaveState(storage);
  } else if (furnitureType === 'cooler') {
    ensureCoolerState(storage);
  }

  // Synchronize thermodynamics based on elapsed time since last inspection
  syncFurnitureStorageThermodynamics(storage);

  return storage;
}

function createDefaultSinkState(isBath: boolean = false): SinkState {
  const cfg = isBath ? BATH_CONFIG : SINK_CONFIG;
  return {
    waterOn: false,
    coldValve: 50,
    hotValve: 50,
    plugClosed: false,
    basinWaterMl: 0,
    basinMaxMl: cfg.basinMaxMl,
    waterTemperature: 21.0,
    lastUpdatedSec: Date.now() / 1000,
  };
}

export function ensureSinkState(storage: FurnitureStorage): SinkState {
  const isBath = storage.furnitureType === 'bath';
  const cfg = isBath ? BATH_CONFIG : SINK_CONFIG;
  if (!storage.sinkState) {
    storage.sinkState = createDefaultSinkState(isBath);
    saveFurnitureStoragesToLocalStorage();
  } else {
    storage.sinkState.waterOn = Boolean(storage.sinkState.waterOn);
    storage.sinkState.coldValve = Math.max(0, Math.min(100, Number(storage.sinkState.coldValve ?? 50)));
    storage.sinkState.hotValve = Math.max(0, Math.min(100, Number(storage.sinkState.hotValve ?? 50)));
    storage.sinkState.plugClosed = Boolean(storage.sinkState.plugClosed);
    storage.sinkState.basinMaxMl = storage.sinkState.basinMaxMl || cfg.basinMaxMl;
    storage.sinkState.basinWaterMl = Math.max(
      0,
      Math.min(storage.sinkState.basinMaxMl, Number(storage.sinkState.basinWaterMl ?? 0))
    );
    storage.sinkState.waterTemperature =
      typeof storage.sinkState.waterTemperature === 'number'
        ? storage.sinkState.waterTemperature
        : 21.0;
    if (typeof storage.sinkState.lastUpdatedSec !== 'number') {
      storage.sinkState.lastUpdatedSec = Date.now() / 1000;
    }
  }
  return storage.sinkState;
}

export function getSinkStreamMetrics(
  st: SinkState,
  isBath: boolean = false
): {
  flowing: boolean;
  flowMlPerSec: number;
  streamTempC: number;
  coldSharePct: number;
  hotSharePct: number;
} {
  const cfg = isBath ? BATH_CONFIG : SINK_CONFIG;
  const cold = Math.max(0, Math.min(100, st.coldValve));
  const hot = Math.max(0, Math.min(100, st.hotValve));
  const sum = cold + hot;
  const flowing = Boolean(st.waterOn && sum > 0);
  const flowFactor = Math.min(1.5, sum / 100);
  const flowMlPerSec = flowing ? Math.round(cfg.maxFlowMlPerSec * flowFactor) : 0;
  const streamTempC =
    sum > 0
      ? Number(((cold * cfg.coldTempC + hot * cfg.hotTempC) / sum).toFixed(1))
      : 21.0;
  const coldSharePct = sum > 0 ? Math.round((cold / sum) * 100) : 50;
  const hotSharePct = sum > 0 ? 100 - coldSharePct : 50;
  return { flowing, flowMlPerSec, streamTempC, coldSharePct, hotSharePct };
}

export function getBathStreamMetrics(st: SinkState) {
  return getSinkStreamMetrics(st, true);
}

export function getAllActiveSinkStorages(): FurnitureStorage[] {
  const result: FurnitureStorage[] = [];
  furnitureStorageDb.forEach(st => {
    if ((st.furnitureType === 'sink' || st.furnitureType === 'bath') && st.sinkState) {
      const active =
        st.sinkState.waterOn ||
        st.sinkState.basinWaterMl > 0 ||
        st.items.length > 0 ||
        Math.abs(st.sinkState.waterTemperature - 21.0) > 0.5;
      if (active) {
        result.push(st);
      }
    }
  });
  return result;
}

let sinkBgAccum = 0;
let sinkSaveAccum = 0;

/**
 * Ticks all active sinks, bathtubs, washing machines, microwaves, and water coolers in the background.
 */
export function tickActiveAppliancesInBackground(dt: number): void {
  sinkBgAccum += dt;
  if (sinkBgAccum < 0.5) return;
  const stepDt = sinkBgAccum;
  sinkBgAccum = 0;

  const nowSec = Date.now() / 1000;
  let anyChanged = false;

  furnitureStorageDb.forEach(st => {
    if ((st.furnitureType === 'sink' || st.furnitureType === 'bath') && st.sinkState) {
      const active =
        st.sinkState.waterOn ||
        st.sinkState.basinWaterMl > 0 ||
        st.items.length > 0 ||
        Math.abs(st.sinkState.waterTemperature - 21.0) > 0.5;
      if (active && tickSinkStateThermodynamics(st, stepDt, nowSec)) {
        anyChanged = true;
      }
    } else if (st.furnitureType === 'washing_machine' && st.washingState) {
      if (
        st.washingState.isRunning ||
        st.washingState.waterTempC > 22 ||
        st.items.some(i => i && (i.wetness || 0) > 0)
      ) {
        if (tickWashingMachineThermodynamics(st, stepDt, nowSec)) {
          anyChanged = true;
        }
      }
    } else if (st.furnitureType === 'microwave' && st.microwaveState) {
      if (
        st.microwaveState.isRunning ||
        st.microwaveState.chamberTempC > 22 ||
        st.items.length > 0
      ) {
        if (tickMicrowaveThermodynamics(st, stepDt, nowSec)) {
          anyChanged = true;
        }
      }
    } else if (st.furnitureType === 'cooler' && st.coolerState) {
      if (
        st.coolerState.coldOn ||
        st.coolerState.hotOn ||
        Math.abs(st.coolerState.coldTempC - 21) > 0.4 ||
        Math.abs(st.coolerState.hotTempC - 21) > 0.4
      ) {
        if (tickCoolerThermodynamics(st, stepDt, nowSec)) {
          anyChanged = true;
        }
      }
    }
  });

  if (anyChanged) {
    sinkSaveAccum += stepDt;
    if (sinkSaveAccum >= 4.0) {
      sinkSaveAccum = 0;
      saveFurnitureStoragesToLocalStorage();
    }
  }
}

export function tickActiveSinksInBackground(dt: number): void {
  tickActiveAppliancesInBackground(dt);
}

export function toggleSinkWater(storage: FurnitureStorage): boolean {
  const st = ensureSinkState(storage);
  st.waterOn = !st.waterOn;
  if (st.waterOn && st.coldValve <= 0 && st.hotValve <= 0) {
    st.coldValve = 50;
  }
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return st.waterOn;
}

export function setSinkValves(
  storage: FurnitureStorage,
  coldValve: number,
  hotValve: number
): SinkState {
  const st = ensureSinkState(storage);
  st.coldValve = Math.max(0, Math.min(100, Math.round(coldValve)));
  st.hotValve = Math.max(0, Math.min(100, Math.round(hotValve)));
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return st;
}

export function toggleSinkPlug(storage: FurnitureStorage): boolean {
  const st = ensureSinkState(storage);
  st.plugClosed = !st.plugClosed;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return st.plugClosed;
}

export function drainSinkBasin(storage: FurnitureStorage): number {
  const st = ensureSinkState(storage);
  const drained = st.basinWaterMl;
  st.basinWaterMl = 0;
  st.plugClosed = false;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return drained;
}

export function fillItemAtSink(
  storage: FurnitureStorage,
  item: InventoryItem,
  player?: Player
): { success: boolean; message: string; filledMl: number } {
  const st = ensureSinkState(storage);
  const metrics = getSinkStreamMetrics(st, storage.furnitureType === 'bath');
  const hasWaterSource = metrics.flowing || st.basinWaterMl >= 25;
  if (!hasWaterSource) {
    return {
      success: false,
      message: storage.furnitureType === 'bath'
        ? 'Сначала включите кран или наберите воду в ванну'
        : 'Сначала включите воду или наберите воду в чашу раковины',
      filledMl: 0,
    };
  }
  if (!item.fluidStorage) {
    return { success: false, message: `«${item.nameRu}» не является ёмкостью для жидкости`, filledMl: 0 };
  }
  const cfg = getContainerConfig(item.itemId);
  const isGranularOnly = Boolean(
    (cfg as any)?.isGranularOnly ||
      item.itemId.startsWith('sack_') ||
      item.itemId === 'sandbag' ||
      item.itemId === 'package_bag'
  );
  if (isGranularOnly) {
    return { success: false, message: `«${item.nameRu}» подходит только для сыпучих веществ`, filledMl: 0 };
  }

  if (isFluidContainerClosed(item)) {
    if ((cfg as any)?.requiresKnife || (cfg as any)?.requiresCanOpener) {
      return { success: false, message: `Тара «${item.nameRu}» запаяна — нужен нож или открывашка`, filledMl: 0 };
    }
    if (player) {
      openFluidContainerIfNeeded(player, item);
    } else {
      item.isOpen = true;
      if (item.fluidStorage.attributes) item.fluidStorage.attributes.isOpened = true;
      syncItemContainerProperties(item);
    }
  }

  ensureHybridContainerProps(item);
  const freeMl = getContainerFreeVolumeMl(item);
  if (freeMl <= 0) {
    return { success: false, message: `Ёмкость «${item.nameRu}» уже полностью заполнена`, filledMl: 0 };
  }

  const maxAvailable = metrics.flowing ? freeMl : Math.min(freeMl, st.basinWaterMl);
  const sourceTemp = metrics.flowing ? metrics.streamTempC : st.waterTemperature;
  const prevMl = item.fluidStorage.currentMl || 0;
  const prevTemp = item.temperature ?? 21.0;

  const res = fillContainerWithLiquid(item, 'water', maxAvailable);
  if (!res.success || res.filledMl <= 0) {
    return { success: false, message: res.message, filledMl: 0 };
  }

  if (!metrics.flowing) {
    st.basinWaterMl = Math.max(0, Math.round((st.basinWaterMl - res.filledMl) * 10) / 10);
  }
  const mixedTemp = (prevMl * prevTemp + res.filledMl * sourceTemp) / Math.max(1, prevMl + res.filledMl);
  item.temperature = Math.round(mixedTemp * 10) / 10;
  item.surfaceTemperature = item.temperature;

  saveFurnitureStoragesToLocalStorage();
  return {
    success: true,
    message: `Набрано ${Math.round(res.filledMl)} мл воды (${Math.round(item.temperature)}°C)`,
    filledMl: res.filledMl,
  };
}

export function wetOrRinseItemAtSink(
  storage: FurnitureStorage,
  item: InventoryItem
): { success: boolean; message: string } {
  const st = ensureSinkState(storage);
  const metrics = getSinkStreamMetrics(st, storage.furnitureType === 'bath');
  const hasWaterSource = metrics.flowing || st.basinWaterMl >= 25;
  if (!hasWaterSource) {
    return {
      success: false,
      message: storage.furnitureType === 'bath'
        ? 'Сначала включите кран или наберите воду в ванну'
        : 'Сначала включите воду или наберите воду в чашу раковины',
    };
  }

  const waterTemp = metrics.flowing ? metrics.streamTempC : st.waterTemperature;
  const wasDirty = Boolean(item.soakedLiquidId && item.soakedLiquidId !== 'water' && (item.wetness || 0) > 5);
  const prevLiquid = item.soakedLiquidNameRu;

  item.wetness = 100;
  item.soakedLiquidId = 'water';
  item.soakedLiquidNameRu = 'Вода';
  item.soakedColor = '#60a5fa';
  if (item.clothingStats) {
    item.clothingStats.wetness = 100;
  }

  if (item.contents && item.contents.length > 0 && !isFluidContainerClosed(item)) {
    for (const child of item.contents) {
      if (!child) continue;
      child.wetness = 100;
      child.soakedLiquidId = 'water';
      child.soakedLiquidNameRu = 'Вода';
      child.soakedColor = '#60a5fa';
    }
  }

  const curTemp = item.temperature ?? 21.0;
  item.temperature = Math.round((curTemp * 0.35 + waterTemp * 0.65) * 10) / 10;
  item.surfaceTemperature = item.temperature;

  saveFurnitureStoragesToLocalStorage();
  return {
    success: true,
    message: wasDirty
      ? `Отмыто от «${prevLiquid || 'загрязнения'}» и намочено водой (${Math.round(waterTemp)}°C)`
      : `Намочено водой: ${item.nameRu} (${Math.round(waterTemp)}°C)`,
  };
}

export function emptyContainerInSink(
  storage: FurnitureStorage,
  item: InventoryItem
): { success: boolean; message: string } {
  if (!item.fluidStorage || (item.fluidStorage.currentMl || 0) <= 0) {
    return { success: false, message: 'В этой таре нет жидкости' };
  }
  const st = ensureSinkState(storage);
  const drainedMl = Math.round(item.fluidStorage.currentMl);
  const liqName = item.fluidStorage.attributes?.varietyRu || item.fluidStorage.liquidId || 'жидкость';

  if (st.plugClosed && item.fluidStorage.liquidId === 'water') {
    st.basinWaterMl = Math.min(st.basinMaxMl, st.basinWaterMl + drainedMl);
  }

  item.fluidStorage.currentMl = 0;
  item.fluidStorage.liquidId = null;
  item.fluidStorage.components = undefined;
  item.fluidStorage.infusedItems = undefined;
  if (item.fluidStorage.attributes) {
    delete item.fluidStorage.attributes.varietyRu;
    delete item.fluidStorage.attributes.customColor;
    delete item.fluidStorage.attributes.visuals;
  }
  updateHybridContainerInteraction(item, 0);
  syncItemContainerProperties(item);
  saveFurnitureStoragesToLocalStorage();

  return {
    success: true,
    message: `Слито в раковину: ${drainedMl} мл (${liqName})`,
  };
}

function createDefaultStoveState(): StoveState {
  const nowSec = Date.now() / 1000;
  const mkBurner = (): StoveBurnerState => ({
    item: null,
    gasOn: false,
    temperature: 21.0,
    lastUpdatedSec: nowSec,
  });
  return {
    burners: [mkBurner(), mkBurner(), mkBurner(), mkBurner()],
    oven: {
      items: [],
      gasOn: false,
      temperature: 21.0,
      lastUpdatedSec: nowSec,
    },
  };
}

/**
 * Ensures a stove FurnitureStorage has a valid 4-burner + unified oven state.
 * Migrates any legacy items stored directly in storage.items into the oven chamber.
 */
export function ensureStoveState(storage: FurnitureStorage): StoveState {
  if (!storage.stoveState) {
    storage.stoveState = createDefaultStoveState();
    if (storage.items && storage.items.length > 0) {
      storage.stoveState.oven.items.push(...storage.items);
      storage.items = [];
      saveFurnitureStoragesToLocalStorage();
    }
  } else {
    const nowSec = Date.now() / 1000;
    if (!Array.isArray(storage.stoveState.burners) || storage.stoveState.burners.length !== 4) {
      const existing = Array.isArray(storage.stoveState.burners) ? storage.stoveState.burners : [];
      storage.stoveState.burners = [0, 1, 2, 3].map(i =>
        existing[i]
          ? {
              item: existing[i].item || null,
              gasOn: Boolean(existing[i].gasOn),
              temperature: typeof existing[i].temperature === 'number' ? existing[i].temperature : 21.0,
              lastUpdatedSec: existing[i].lastUpdatedSec ?? nowSec,
            }
          : { item: null, gasOn: false, temperature: 21.0, lastUpdatedSec: nowSec }
      ) as StoveState['burners'];
    }
    if (!storage.stoveState.oven) {
      storage.stoveState.oven = { items: [], gasOn: false, temperature: 21.0, lastUpdatedSec: nowSec };
    }
    if (!Array.isArray(storage.stoveState.oven.items)) {
      storage.stoveState.oven.items = [];
    }
  }
  return storage.stoveState;
}

export function getAllActiveStoveStorages(): FurnitureStorage[] {
  const result: FurnitureStorage[] = [];
  furnitureStorageDb.forEach(st => {
    if (st.furnitureType === 'stove' && st.stoveState) {
      const hasHotOrGas =
        st.stoveState.oven.gasOn ||
        st.stoveState.oven.temperature > 22.5 ||
        st.stoveState.oven.items.length > 0 ||
        st.stoveState.burners.some(b => b.gasOn || b.temperature > 22.5 || Boolean(b.item));
      if (hasHotOrGas) {
        result.push(st);
      }
    }
  });
  return result;
}

let stoveBgAccum = 0;
let stoveSaveAccum = 0;

/**
 * Ticks all active stoves in the background (burners/oven with gas ON or still warm/occupied).
 * Throttled to 0.5s steps and saves periodically so cooking continues seamlessly while playing.
 */
export function tickActiveStovesInBackground(dt: number): void {
  stoveBgAccum += dt;
  if (stoveBgAccum < 0.5) return;
  const stepDt = stoveBgAccum;
  stoveBgAccum = 0;

  const active = getAllActiveStoveStorages();
  if (active.length === 0) return;

  const nowSec = Date.now() / 1000;
  let anyChanged = false;
  for (const st of active) {
    if (st.stoveState && tickStoveStateThermodynamics(st.stoveState, stepDt, nowSec)) {
      anyChanged = true;
    }
  }
  if (anyChanged) {
    stoveSaveAccum += stepDt;
    if (stoveSaveAccum >= 4.0) {
      stoveSaveAccum = 0;
      saveFurnitureStoragesToLocalStorage();
    }
  }
}

export function toggleStoveBurnerGas(storage: FurnitureStorage, burnerIdx: number): boolean {
  const st = ensureStoveState(storage);
  const burner = st.burners[burnerIdx];
  if (!burner) return false;
  burner.gasOn = !burner.gasOn;
  burner.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return burner.gasOn;
}

export function placeItemOnStoveBurner(
  storage: FurnitureStorage,
  burnerIdx: number,
  item: InventoryItem
): { success: boolean; message: string } {
  const st = ensureStoveState(storage);
  const burner = st.burners[burnerIdx];
  if (!burner) return { success: false, message: 'Неверный номер конфорки' };
  if (burner.item) {
    return { success: false, message: 'Конфорка уже занята — сначала снимите предмет' };
  }
  const singleVol = item.volume ?? (item.weight ? Math.max(0.2, item.weight * 0.9) : 0.5);
  if (singleVol > 18.0) {
    return { success: false, message: `Предмет «${item.nameRu}» слишком габаритный для конфорки` };
  }
  burner.item = {
    ...item,
    count: 1,
    maxStack: item.maxStack ?? 1,
  };
  burner.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return { success: true, message: `Поставлено на конфорку ${burnerIdx + 1}: ${item.nameRu}` };
}

export function removeItemFromStoveBurner(storage: FurnitureStorage, burnerIdx: number): InventoryItem | null {
  const st = ensureStoveState(storage);
  const burner = st.burners[burnerIdx];
  if (!burner || !burner.item) return null;
  const taken = burner.item;
  burner.item = null;
  burner.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return taken;
}

export function toggleStoveOvenGas(storage: FurnitureStorage): boolean {
  const st = ensureStoveState(storage);
  st.oven.gasOn = !st.oven.gasOn;
  st.oven.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return st.oven.gasOn;
}

export function getStoveOvenTotalVolume(storage: FurnitureStorage): number {
  const st = ensureStoveState(storage);
  return st.oven.items.reduce((sum, it) => sum + getItemTotalVolume(it), 0);
}

export function getStoveOvenTotalWeight(storage: FurnitureStorage): number {
  const st = ensureStoveState(storage);
  return st.oven.items.reduce((sum, it) => sum + getItemTotalWeight(it), 0);
}

export function canItemFitInStoveOven(
  storage: FurnitureStorage,
  itemToAdd: InventoryItem
): { fits: boolean; reason?: string } {
  const singleVol = itemToAdd.volume ?? (itemToAdd.weight ? Math.max(0.2, itemToAdd.weight * 0.9) : 0.5);
  if (singleVol > STOVE_OVEN_CONFIG.maxItemVolumeL) {
    return {
      fits: false,
      reason: `Предмет «${itemToAdd.nameRu}» слишком габаритный (${singleVol.toFixed(1)} л > ${STOVE_OVEN_CONFIG.maxItemVolumeL} л)`,
    };
  }
  const curVol = getStoveOvenTotalVolume(storage);
  const addVol = getItemTotalVolume(itemToAdd);
  if (curVol + addVol > STOVE_OVEN_CONFIG.capacityL) {
    const freeVol = Math.max(0, STOVE_OVEN_CONFIG.capacityL - curVol);
    return {
      fits: false,
      reason: `В духовке нет места: свободно ${freeVol.toFixed(1)} л из ${STOVE_OVEN_CONFIG.capacityL} л`,
    };
  }
  const curWt = getStoveOvenTotalWeight(storage);
  const addWt = getItemTotalWeight(itemToAdd);
  if (curWt + addWt > STOVE_OVEN_CONFIG.maxWeightKg) {
    const freeWt = Math.max(0, STOVE_OVEN_CONFIG.maxWeightKg - curWt);
    return {
      fits: false,
      reason: `Превышен вес в духовке: свободно ${freeWt.toFixed(1)} кг`,
    };
  }
  return { fits: true };
}

export function addItemToStoveOven(
  storage: FurnitureStorage,
  itemToAdd: InventoryItem
): { success: boolean; message: string } {
  const check = canItemFitInStoveOven(storage, itemToAdd);
  if (!check.fits) {
    return { success: false, message: check.reason || 'Предмет не помещается в духовку' };
  }
  const st = ensureStoveState(storage);
  st.oven.items.push({
    ...itemToAdd,
    id: `oven_item_${itemToAdd.itemId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    count: 1,
    maxStack: itemToAdd.maxStack ?? 1,
  });
  st.oven.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return { success: true, message: `Поставлено в духовку: ${itemToAdd.nameRu}` };
}

export function removeItemFromStoveOven(storage: FurnitureStorage, itemIndex: number): InventoryItem | null {
  const st = ensureStoveState(storage);
  if (itemIndex < 0 || itemIndex >= st.oven.items.length) return null;
  const [removed] = st.oven.items.splice(itemIndex, 1);
  st.oven.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return removed || null;
}

/**
 * Calculates total weight of items stored in the furniture container in kg
 */
export function getFurnitureStorageTotalWeight(storage: FurnitureStorage): number {
  if (!storage.items || storage.items.length === 0) return 0;
  return storage.items.reduce((sum, it) => sum + getItemTotalWeight(it), 0);
}

/**
 * Calculates total volume of items stored in the furniture container in Liters
 */
export function getFurnitureStorageTotalVolume(storage: FurnitureStorage): number {
  if (!storage.items || storage.items.length === 0) return 0;
  return storage.items.reduce((sum, it) => sum + getItemTotalVolume(it), 0);
}

/**
 * Checks if a specific item can fit inside the furniture container based on physical capacity, weight, and volume
 */
export function canItemFitInFurniture(
  storage: FurnitureStorage,
  itemToAdd: InventoryItem
): { fits: boolean; reason?: string } {
  const cfg = FURNITURE_STORAGE_CONFIGS[storage.furnitureType] || FURNITURE_STORAGE_CONFIGS.wardrobe;

  // 1. Category check
  if (cfg.allowedCategories && cfg.allowedCategories.length > 0) {
    if (!cfg.allowedCategories.includes(itemToAdd.category)) {
      return {
        fits: false,
        reason: `${cfg.nameRu} не предназначен для хранения предметов категории "${itemToAdd.category}".`
      };
    }
  }

  // 2. Single item volume dimension check (does it physically fit through opening / shelves)
  const singleUnitVol = itemToAdd.volume ?? (itemToAdd.weight ? Math.max(0.2, itemToAdd.weight * 0.9) : 0.5);
  if (singleUnitVol > cfg.maxItemVolumeL) {
    return {
      fits: false,
      reason: `Предмет "${itemToAdd.nameRu}" слишком габаритный (${singleUnitVol.toFixed(1)}л > макс. ${cfg.maxItemVolumeL}л) и не помещается на полках.`
    };
  }

  // 3. Total capacity volume check
  const currentVol = getFurnitureStorageTotalVolume(storage);
  const addTotalVol = getItemTotalVolume(itemToAdd);
  if (currentVol + addTotalVol > cfg.capacityL) {
    const freeVol = Math.max(0, cfg.capacityL - currentVol);
    return {
      fits: false,
      reason: `Вместимость исчерпана: свободно ${freeVol.toFixed(1)} л из ${cfg.capacityL} л (требуется ${addTotalVol.toFixed(1)} л).`
    };
  }

  // 4. Max weight capacity check
  const currentWeight = getFurnitureStorageTotalWeight(storage);
  const addTotalWeight = getItemTotalWeight(itemToAdd);
  if (currentWeight + addTotalWeight > cfg.maxWeightKg) {
    const freeWeight = Math.max(0, cfg.maxWeightKg - currentWeight);
    return {
      fits: false,
      reason: `Превышена грузоподъемность: свободно ${freeWeight.toFixed(1)} кг (вес предметов: ${addTotalWeight.toFixed(1)} кг).`
    };
  }

  return { fits: true };
}

/**
 * Transfers an item from player inventory into the furniture storage
 */
export function addItemToFurnitureStorage(
  storage: FurnitureStorage,
  itemToAdd: InventoryItem,
  countToTransfer: number = 1
): { success: boolean; message: string; transferredCount: number } {
  if (countToTransfer <= 0) return { success: false, message: 'Количество должно быть больше нуля', transferredCount: 0 };

  const check = canItemFitInFurniture(storage, itemToAdd);
  if (!check.fits) {
    return { success: false, message: check.reason || 'Предмет не помещается', transferredCount: 0 };
  }

  if (!storage.items) storage.items = [];

  const actualCount = Math.max(1, countToTransfer);

  for (let i = 0; i < actualCount; i++) {
    storage.items.push({
      ...itemToAdd,
      id: `storage_item_${itemToAdd.itemId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      count: 1,
      maxStack: 1
    });
  }

  saveFurnitureStoragesToLocalStorage();
  return {
    success: true,
    message: `Помещено в хранилище: ${itemToAdd.nameRu}`,
    transferredCount: actualCount
  };
}

/**
 * Removes an item from the furniture storage
 */
export function removeItemFromFurnitureStorage(
  storage: FurnitureStorage,
  itemIndex: number,
  count: number = 1
): InventoryItem | null {
  if (!storage.items || itemIndex < 0 || itemIndex >= storage.items.length) return null;
  const target = storage.items[itemIndex];
  if (!target) return null;

  storage.items.splice(itemIndex, 1);
  saveFurnitureStoragesToLocalStorage();
  return { ...target, count: 1, maxStack: 1 };
}

export function takeBathWashPlayer(
  storage: FurnitureStorage,
  player: Player
): { success: boolean; message: string } {
  const st = ensureSinkState(storage);
  const metrics = getBathStreamMetrics(st);
  const hasWater = metrics.flowing || st.basinWaterMl >= 15000;
  if (!hasWater) {
    return {
      success: false,
      message: 'Наберите минимум 15 л воды в ванну или включите кран',
    };
  }

  const waterTemp = metrics.flowing ? metrics.streamTempC : st.waterTemperature;
  if (!metrics.flowing && st.basinWaterMl >= 4000) {
    st.basinWaterMl = Math.max(0, Math.round(st.basinWaterMl - 4000));
  }

  const bs = player.bodyState;
  if (bs) {
    bs.wetness = Math.max(bs.wetness || 0, 45);
    if (waterTemp >= 54) {
      bs.temperature = Math.min(39.0, Number((bs.temperature + 0.45).toFixed(2)));
      bs.comfort = Math.max(0, (bs.comfort || 50) - 18);
      bs.painLevel = Math.min(100, (bs.painLevel || 0) + 12);
    } else if (waterTemp >= 33) {
      const targetTemp = Math.min(36.9, Math.max(bs.temperature, 36.7));
      bs.temperature = Number((bs.temperature * 0.4 + targetTemp * 0.6).toFixed(2));
      bs.comfort = Math.min(100, (bs.comfort || 50) + 28);
      bs.panicLevel = Math.max(0, (bs.panicLevel || 0) - 22);
      bs.shiverIntensity = 0;
      player.needs.energy = Math.min(100, player.needs.energy + 12);
    } else {
      const targetTemp = Math.max(35.8, Math.min(bs.temperature, 36.3));
      bs.temperature = Number((bs.temperature * 0.55 + targetTemp * 0.45).toFixed(2));
      bs.comfort = Math.min(100, (bs.comfort || 50) + 8);
      player.needs.energy = Math.min(100, player.needs.energy + 16);
    }
  }

  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();

  if (waterTemp >= 54) {
    return { success: true, message: `Кипяток обжигает кожу (+${Math.round(waterTemp)}°C) — добавьте холодной воды` };
  }
  if (waterTemp >= 33) {
    return { success: true, message: `Тёплая ванна (+${Math.round(waterTemp)}°C) сняла усталость и согрела` };
  }
  return { success: true, message: `Бодрящий прохладный душ (+${Math.round(waterTemp)}°C) освежил и прибавил сил` };
}

export const WASHING_DETERGENT_MAX_ML = 250;

function createDefaultWashingState(): WashingMachineState {
  const quick = WASHING_PROGRAMS.find(p => p.id === 'quick') || WASHING_PROGRAMS[0];
  return {
    program: quick.id,
    isRunning: false,
    phase: 'idle',
    remainingSec: quick.durationSec,
    totalDurationSec: quick.durationSec,
    waterTempC: 21.0,
    waterLevelPct: 0,
    hasDetergent: false,
    detergentMl: 0,
    detergentMaxMl: WASHING_DETERGENT_MAX_ML,
    spinRpm: 0,
    lastUpdatedSec: Date.now() / 1000,
  };
}

export function ensureWashingState(storage: FurnitureStorage): WashingMachineState {
  if (!storage.washingState) {
    storage.washingState = createDefaultWashingState();
    saveFurnitureStoragesToLocalStorage();
  } else {
    const def = WASHING_PROGRAMS.find(p => p.id === storage.washingState!.program) || WASHING_PROGRAMS[1];
    storage.washingState.program = def.id;
    storage.washingState.isRunning = Boolean(storage.washingState.isRunning);
    storage.washingState.totalDurationSec = storage.washingState.totalDurationSec || def.durationSec;
    storage.washingState.remainingSec = Math.max(0, Number(storage.washingState.remainingSec ?? def.durationSec));
    storage.washingState.waterTempC = Number(storage.washingState.waterTempC ?? 21.0);
    storage.washingState.waterLevelPct = Math.max(0, Math.min(100, Number(storage.washingState.waterLevelPct ?? 0)));
    const maxMl = Math.max(100, Number(storage.washingState.detergentMaxMl ?? WASHING_DETERGENT_MAX_ML));
    const curMl =
      typeof storage.washingState.detergentMl === 'number'
        ? Math.max(0, Math.min(maxMl, storage.washingState.detergentMl))
        : storage.washingState.hasDetergent
        ? 100
        : 0;
    storage.washingState.detergentMaxMl = maxMl;
    storage.washingState.detergentMl = curMl;
    storage.washingState.hasDetergent = curMl > 0;
    storage.washingState.spinRpm = Number(storage.washingState.spinRpm ?? 0);
    if (typeof storage.washingState.lastUpdatedSec !== 'number') {
      storage.washingState.lastUpdatedSec = Date.now() / 1000;
    }
  }
  return storage.washingState;
}

export function setWashingProgram(
  storage: FurnitureStorage,
  programId: WashingProgramId
): { success: boolean; message: string } {
  const st = ensureWashingState(storage);
  if (st.isRunning) {
    return { success: false, message: 'Поставьте стирку на паузу или сбросьте цикл' };
  }
  const def = WASHING_PROGRAMS.find(p => p.id === programId);
  if (!def) return { success: false, message: 'Неизвестная программа стирки' };
  st.program = def.id;
  st.phase = 'idle';
  st.totalDurationSec = def.durationSec;
  st.remainingSec = def.durationSec;
  st.waterLevelPct = 0;
  st.spinRpm = 0;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return { success: true, message: `Выбран режим: ${def.nameRu}` };
}

export function pourDetergentIntoWashingMachine(
  storage: FurnitureStorage,
  item: InventoryItem | null | undefined
): { success: boolean; pouredMl?: number; isDry?: boolean; message: string } {
  const st = ensureWashingState(storage);
  if (st.isRunning) {
    return { success: false, message: 'Остановите стирку перед закладкой средства в отсек' };
  }
  if (!item?.fluidStorage || item.fluidStorage.liquidId !== 'detergent') {
    return { success: false, message: 'В отсек СМС можно добавить только стиральный порошок или гель' };
  }
  const curSrcMl = item.fluidStorage.currentMl || 0;
  if (curSrcMl <= 0) {
    return { success: false, message: 'Упаковка со средством пуста' };
  }
  const maxCompMl = st.detergentMaxMl ?? WASHING_DETERGENT_MAX_ML;
  const curCompMl = st.detergentMl ?? 0;
  const freeCompMl = Math.max(0, maxCompMl - curCompMl);
  if (freeCompMl <= 0) {
    return { success: false, message: 'Отсек СМС уже полностью заполнен' };
  }

  if (isFluidContainerClosed(item)) {
    openFluidContainerIfNeeded(null, item);
  }

  const doseMl = Math.min(curSrcMl, 100, freeCompMl);
  const isDry = isFluidStorageDryForm(item.fluidStorage);
  const attrs = item.fluidStorage.attributes || item.attributes;
  const color =
    attrs?.customColor ||
    attrs?.visuals?.color ||
    (isDry ? '#f8fafc' : '#38bdf8');
  const colorNameRu =
    attrs?.visuals?.colorNameRu ||
    attrs?.substanceColorRu ||
    (isDry ? 'Белый порошок' : 'Голубой гель');
  const rawIng = attrs?.ingredients ?? attrs?.sourceIngredients;
  const ingText = Array.isArray(rawIng) ? rawIng.filter(Boolean).join(', ') : rawIng;
  const varietyRu = attrs?.varietyRu || item.nameRu;

  st.detergentMl = Math.round((curCompMl + doseMl) * 10) / 10;
  st.detergentMaxMl = maxCompMl;
  st.hasDetergent = st.detergentMl > 0;
  st.detergentForm = isDry ? 'dry' : 'liquid';
  st.detergentColor = color;
  st.detergentColorNameRu = colorNameRu;
  st.detergentIngredients = ingText || st.detergentIngredients;
  st.detergentVarietyRu = varietyRu;
  st.lastUpdatedSec = Date.now() / 1000;

  item.fluidStorage.currentMl = Math.max(0, Math.round((curSrcMl - doseMl) * 10) / 10);
  if (item.fluidStorage.currentMl <= 0) {
    item.fluidStorage.liquidId = null;
    item.fluidStorage.attributes = undefined;
  }
  syncItemContainerProperties(item);
  saveFurnitureStoragesToLocalStorage();

  const density = LIQUID_REGISTRY.detergent?.densityKgPerL || 0.92;
  const displayQty = Math.round(isDry ? doseMl * density : doseMl);
  return {
    success: true,
    pouredMl: doseMl,
    isDry,
    message: `${isDry ? 'Засыпано' : 'Залито'} ${displayQty} ${isDry ? 'г' : 'мл'} — ${varietyRu}`,
  };
}

export function clearWashingDetergent(
  storage: FurnitureStorage
): { success: boolean; message: string } {
  const st = ensureWashingState(storage);
  if (st.isRunning) {
    return { success: false, message: 'Нельзя очистить отсек СМС во время стирки' };
  }
  st.detergentMl = 0;
  st.hasDetergent = false;
  st.detergentForm = undefined;
  st.detergentColor = undefined;
  st.detergentColorNameRu = undefined;
  st.detergentIngredients = undefined;
  st.detergentVarietyRu = undefined;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return { success: true, message: 'Отсек для моющего средства очищен' };
}

export function startPauseWashingMachine(
  storage: FurnitureStorage
): { success: boolean; isRunning: boolean; message: string } {
  const st = ensureWashingState(storage);
  if (st.isRunning) {
    st.isRunning = false;
    st.spinRpm = 0;
    st.lastUpdatedSec = Date.now() / 1000;
    saveFurnitureStoragesToLocalStorage();
    return { success: true, isRunning: false, message: 'Стирка поставлена на паузу' };
  }
  if (st.phase === 'done' || st.remainingSec <= 0) {
    const def = WASHING_PROGRAMS.find(p => p.id === st.program) || WASHING_PROGRAMS[1];
    st.remainingSec = def.durationSec;
    st.totalDurationSec = def.durationSec;
    st.phase = 'fill';
  }
  st.isRunning = true;
  if (st.phase === 'idle') {
    st.phase = st.program === 'spin' ? 'spin' : 'fill';
  }
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return { success: true, isRunning: true, message: 'Стирка запущена — люк заблокирован' };
}

export function resetWashingMachine(storage: FurnitureStorage): void {
  const st = ensureWashingState(storage);
  const def = WASHING_PROGRAMS.find(p => p.id === st.program) || WASHING_PROGRAMS[1];
  st.isRunning = false;
  st.phase = 'idle';
  st.remainingSec = def.durationSec;
  st.totalDurationSec = def.durationSec;
  st.waterLevelPct = 0;
  st.spinRpm = 0;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
}

function createDefaultMicrowaveState(): MicrowaveState {
  return {
    powerWatts: 600,
    isRunning: false,
    remainingSec: 30,
    totalDurationSec: 30,
    chamberTempC: 21.0,
    hasMetalWarning: false,
    lastUpdatedSec: Date.now() / 1000,
  };
}

export function ensureMicrowaveState(storage: FurnitureStorage): MicrowaveState {
  if (!storage.microwaveState) {
    storage.microwaveState = createDefaultMicrowaveState();
    saveFurnitureStoragesToLocalStorage();
  } else {
    const pw = storage.microwaveState.powerWatts;
    storage.microwaveState.powerWatts = pw === 300 || pw === 600 || pw === 900 ? pw : 600;
    storage.microwaveState.isRunning = Boolean(storage.microwaveState.isRunning);
    storage.microwaveState.remainingSec = Math.max(0, Number(storage.microwaveState.remainingSec ?? 0));
    storage.microwaveState.totalDurationSec = Math.max(1, Number(storage.microwaveState.totalDurationSec ?? 30));
    storage.microwaveState.chamberTempC = Number(storage.microwaveState.chamberTempC ?? 21.0);
    storage.microwaveState.hasMetalWarning = (storage.items || []).some(it => isMetallicItemForMicrowave(it));
    if (typeof storage.microwaveState.lastUpdatedSec !== 'number') {
      storage.microwaveState.lastUpdatedSec = Date.now() / 1000;
    }
  }
  return storage.microwaveState;
}

export function setMicrowavePower(storage: FurnitureStorage, watts: 300 | 600 | 900): void {
  const st = ensureMicrowaveState(storage);
  st.powerWatts = watts;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
}

export function addMicrowaveTimer(storage: FurnitureStorage, addSec: number): number {
  const st = ensureMicrowaveState(storage);
  st.remainingSec = Math.min(300, Math.max(0, Math.round(st.remainingSec + addSec)));
  st.totalDurationSec = Math.max(st.totalDurationSec, st.remainingSec, 15);
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return st.remainingSec;
}

export function resetMicrowaveTimer(storage: FurnitureStorage): void {
  const st = ensureMicrowaveState(storage);
  st.isRunning = false;
  st.remainingSec = 0;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
}

export function startStopMicrowave(
  storage: FurnitureStorage
): { success: boolean; isRunning: boolean; message: string } {
  const st = ensureMicrowaveState(storage);
  if (st.isRunning) {
    st.isRunning = false;
    st.lastUpdatedSec = Date.now() / 1000;
    saveFurnitureStoragesToLocalStorage();
    return { success: true, isRunning: false, message: 'Микроволновка остановлена' };
  }
  st.hasMetalWarning = (storage.items || []).some(it => isMetallicItemForMicrowave(it));
  if (st.hasMetalWarning) {
    return {
      success: false,
      isRunning: false,
      message: 'Внутри металлический предмет — достаньте металл перед запуском',
    };
  }
  if (st.remainingSec <= 0) {
    st.remainingSec = 30;
    st.totalDurationSec = 30;
  }
  st.isRunning = true;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return { success: true, isRunning: true, message: `Разогрев запущен (${st.powerWatts} Вт)` };
}

function createDefaultCoolerState(): CoolerState {
  return {
    bottleWaterMl: COOLER_CONFIG.bottleMaxMl,
    bottleMaxMl: COOLER_CONFIG.bottleMaxMl,
    coldOn: true,
    hotOn: true,
    coldTempC: 7.0,
    hotTempC: 85.0,
    lastUpdatedSec: Date.now() / 1000,
  };
}

export function ensureCoolerState(storage: FurnitureStorage): CoolerState {
  if (!storage.coolerState) {
    storage.coolerState = createDefaultCoolerState();
    saveFurnitureStoragesToLocalStorage();
  } else {
    storage.coolerState.bottleMaxMl = storage.coolerState.bottleMaxMl || COOLER_CONFIG.bottleMaxMl;
    storage.coolerState.bottleWaterMl = Math.max(
      0,
      Math.min(storage.coolerState.bottleMaxMl, Number(storage.coolerState.bottleWaterMl ?? 0))
    );
    storage.coolerState.coldOn = Boolean(storage.coolerState.coldOn);
    storage.coolerState.hotOn = Boolean(storage.coolerState.hotOn);
    storage.coolerState.coldTempC = Number(storage.coolerState.coldTempC ?? 7.0);
    storage.coolerState.hotTempC = Number(storage.coolerState.hotTempC ?? 85.0);
    if (typeof storage.coolerState.lastUpdatedSec !== 'number') {
      storage.coolerState.lastUpdatedSec = Date.now() / 1000;
    }
  }
  return storage.coolerState;
}

export function toggleCoolerCold(storage: FurnitureStorage): boolean {
  const st = ensureCoolerState(storage);
  st.coldOn = !st.coldOn;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return st.coldOn;
}

export function toggleCoolerHot(storage: FurnitureStorage): boolean {
  const st = ensureCoolerState(storage);
  st.hotOn = !st.hotOn;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return st.hotOn;
}

export function dispenseCoolerIntoItem(
  storage: FurnitureStorage,
  item: InventoryItem,
  tap: 'cold' | 'hot',
  player?: Player
): { success: boolean; message: string; filledMl: number } {
  const st = ensureCoolerState(storage);
  if (st.bottleWaterMl < 25) {
    return { success: false, message: 'В 19-литровой бутыли кулера закончилась вода', filledMl: 0 };
  }
  if (!item.fluidStorage) {
    return { success: false, message: `«${item.nameRu}» не является ёмкостью для воды`, filledMl: 0 };
  }
  const cfg = getContainerConfig(item.itemId);
  const isGranularOnly = Boolean(
    (cfg as any)?.isGranularOnly ||
      item.itemId.startsWith('sack_') ||
      item.itemId === 'sandbag' ||
      item.itemId === 'package_bag'
  );
  if (isGranularOnly) {
    return { success: false, message: `«${item.nameRu}» не подходит для жидкостей`, filledMl: 0 };
  }
  if (isFluidContainerClosed(item)) {
    if ((cfg as any)?.requiresKnife || (cfg as any)?.requiresCanOpener) {
      return { success: false, message: `Тара «${item.nameRu}» запаяна — откройте перед наливом`, filledMl: 0 };
    }
    if (player) {
      openFluidContainerIfNeeded(player, item);
    } else {
      item.isOpen = true;
      if (item.fluidStorage.attributes) item.fluidStorage.attributes.isOpened = true;
      syncItemContainerProperties(item);
    }
  }
  ensureHybridContainerProps(item);
  const freeMl = getContainerFreeVolumeMl(item);
  if (freeMl <= 0) {
    return { success: false, message: `Ёмкость «${item.nameRu}» уже заполнена`, filledMl: 0 };
  }

  const maxPour = Math.min(freeMl, st.bottleWaterMl);
  const prevMl = item.fluidStorage.currentMl || 0;
  const prevTemp = item.temperature ?? 21.0;
  const tapTemp = tap === 'hot' ? st.hotTempC : st.coldTempC;

  const res = fillContainerWithLiquid(item, 'water', maxPour);
  if (!res.success || res.filledMl <= 0) {
    return { success: false, message: res.message, filledMl: 0 };
  }

  st.bottleWaterMl = Math.max(0, Math.round(st.bottleWaterMl - res.filledMl));
  const mixedTemp = (prevMl * prevTemp + res.filledMl * tapTemp) / Math.max(1, prevMl + res.filledMl);
  item.temperature = Math.round(mixedTemp * 10) / 10;
  item.surfaceTemperature = item.temperature;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();

  return {
    success: true,
    message: `Налито ${Math.round(res.filledMl)} мл из ${tap === 'hot' ? 'горячего' : 'холодного'} крана (${Math.round(item.temperature)}°C)`,
    filledMl: res.filledMl,
  };
}

export function drinkFromCooler(
  storage: FurnitureStorage,
  player: Player,
  tap: 'cold' | 'hot'
): { success: boolean; message: string } {
  const st = ensureCoolerState(storage);
  if (st.bottleWaterMl < COOLER_CONFIG.cupServeMl) {
    return { success: false, message: 'В бутыли кулера недостаточно воды для стакана' };
  }
  const tapTemp = tap === 'hot' ? st.hotTempC : st.coldTempC;
  st.bottleWaterMl = Math.max(0, st.bottleWaterMl - COOLER_CONFIG.cupServeMl);

  player.needs.thirst = Math.min(100, player.needs.thirst + 18);
  applyConsumptionThermodynamics(player, tapTemp, 'вода из кулера', true);

  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return {
    success: true,
    message: `Выпито 250 мл ${tap === 'hot' ? 'горячей' : 'охлаждённой'} воды (+${Math.round(tapTemp)}°C)`,
  };
}

export function replaceCoolerBottle(storage: FurnitureStorage): void {
  const st = ensureCoolerState(storage);
  st.bottleWaterMl = st.bottleMaxMl;
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
}

export function refillCoolerBottleFromItem(
  storage: FurnitureStorage,
  item: InventoryItem
): { success: boolean; message: string } {
  const st = ensureCoolerState(storage);
  if (!item.fluidStorage || (item.fluidStorage.currentMl || 0) <= 0) {
    return { success: false, message: 'В этой таре нет жидкости' };
  }
  if (item.fluidStorage.liquidId && item.fluidStorage.liquidId !== 'water') {
    return { success: false, message: 'В бутыль кулера можно заливать только чистую воду' };
  }
  const freeMl = Math.max(0, st.bottleMaxMl - st.bottleWaterMl);
  if (freeMl <= 0) {
    return { success: false, message: 'Бутыль кулера уже полная (19 л)' };
  }
  const pourMl = Math.min(freeMl, item.fluidStorage.currentMl);
  item.fluidStorage.currentMl = Math.max(0, Math.round(item.fluidStorage.currentMl - pourMl));
  if (item.fluidStorage.currentMl <= 0) {
    item.fluidStorage.liquidId = null;
  }
  st.bottleWaterMl = Math.min(st.bottleMaxMl, Math.round(st.bottleWaterMl + pourMl));
  updateHybridContainerInteraction(item, 0);
  syncItemContainerProperties(item);
  st.lastUpdatedSec = Date.now() / 1000;
  saveFurnitureStoragesToLocalStorage();
  return {
    success: true,
    message: `Долито в бутыль кулера: ${Math.round(pourMl)} мл`,
  };
}

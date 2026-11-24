import { InventoryItem, ItemCategory, Player } from './types';
import { ITEM_CATALOG, isRegisteredItemId, createItem, getItemTotalWeight, getItemTotalVolume } from './items';
import { sound } from './audio';
import { syncFurnitureStorageThermodynamics, tickStoveStateThermodynamics } from './itemThermalSystem';

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
    nameRu: 'Тумба под раковиной / Умывальник',
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
  aptId?: string
): string {
  if (aptId) {
    return `storage_apt_${aptId}_${furnitureIndex}`;
  }
  return `storage_bld_${buildingId}_f${floor}_${furnitureIndex}`;
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
    pushValid('smartphone');
    pushValid('cash_1000');
    pushValid('vitamins');
  } else if (furnitureType === 'tv_cabinet') {
    pushValid('screwdriver');
    pushValid('duct_tape');
    pushValid('cash_500');
  } else if (furnitureType === 'sink') {
    pushValid('rag', 2);
    pushValid('bandage');
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
  customTitle?: string
): FurnitureStorage {
  const id = buildFurnitureStorageId(buildingId, floor, furnitureIndex, aptId);
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
      stoveState: furnitureType === 'stove' ? createDefaultStoveState() : undefined
    };
    furnitureStorageDb.set(id, storage);
    saveFurnitureStoragesToLocalStorage();
  }

  if (furnitureType === 'stove') {
    ensureStoveState(storage);
  }

  // Synchronize thermodynamics based on elapsed time since last inspection
  syncFurnitureStorageThermodynamics(storage);

  return storage;
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

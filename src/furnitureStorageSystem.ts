import { InventoryItem, ItemCategory, Player } from './types';
import { createItem, getItemTotalWeight, getItemTotalVolume } from './items';
import { sound } from './audio';

export interface FurnitureStorageConfig {
  type: string;
  nameRu: string;
  capacityL: number;
  maxWeightKg: number;
  maxItemVolumeL: number;
  allowedCategories?: ItemCategory[];
  isCold?: boolean; // Fridge / freezer preservation
  iconName?: string;
}

export const FURNITURE_STORAGE_CONFIGS: Record<string, FurnitureStorageConfig> = {
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
    nameRu: 'Кухонный гарнитур / Тумбы',
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
    nameRu: 'Духовой шкаф / Плита',
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

export interface FurnitureStorage {
  id: string;
  buildingId: string;
  floor: number;
  furnitureIndex: number;
  furnitureType: string;
  customTitle?: string;
  apartmentId?: string;
  items: InventoryItem[];
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

export function exportFurnitureStorageData(): Record<string, FurnitureStorage> {
  const result: Record<string, FurnitureStorage> = {};
  furnitureStorageDb.forEach((val, key) => {
    result[key] = JSON.parse(JSON.stringify(val));
  });
  return result;
}

export function importFurnitureStorageData(data: Record<string, FurnitureStorage>): void {
  if (!data || typeof data !== 'object') return;
  for (const [key, val] of Object.entries(data)) {
    if (key && val && Array.isArray((val as any).items)) {
      furnitureStorageDb.set(key, JSON.parse(JSON.stringify(val)));
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
 * Seeds initial realistic items for apartment furniture
 */
function seedApartmentFurnitureItems(
  storageId: string,
  furnitureType: string,
  aptId?: string
): InventoryItem[] {
  const items: InventoryItem[] = [];

  if (furnitureType === 'wardrobe') {
    items.push(createItem('thermal_coat', 1));
    items.push(createItem('beanie_black', 1));
    items.push(createItem('tshirt_white', 1));
    items.push(createItem('jeans_classic', 1));
    items.push(createItem('shoes_sneakers', 1));
    if (aptId?.includes('lenina') || aptId?.includes('cottage')) {
      items.push(createItem('ushanka_hat', 1));
      items.push(createItem('jacket_leather', 1));
      items.push(createItem('backpack', 1));
    }
  } else if (furnitureType === 'fridge') {
    items.push(createItem('water_bottle', 2));
    items.push(createItem('apple', 3));
    items.push(createItem('sandwich', 2));
    items.push(createItem('energy_drink', 1));
    if (aptId?.includes('cottage')) {
      items.push(createItem('burger', 2));
      items.push(createItem('camp_flask', 1));
    }
  } else if (furnitureType === 'kitchen_counter') {
    items.push(createItem('military_ration', 1));
    items.push(createItem('pocket_knife', 1));
    items.push(createItem('duct_tape', 1));
    items.push(createItem('rag', 2));
  } else if (furnitureType === 'nightstand') {
    items.push(createItem('flashlight_police', 1));
    items.push(createItem('zippo_lighter', 1));
    items.push(createItem('painkillers', 1));
    items.push(createItem('coin_10', 5));
  } else if (furnitureType === 'bookshelf') {
    items.push(createItem('compass', 1));
    items.push(createItem('cash_500', 2));
  } else if (furnitureType === 'file_cabinet') {
    items.push(createItem('duct_tape', 1));
    items.push(createItem('bandage', 2));
  } else if (furnitureType === 'desk') {
    items.push(createItem('smartphone', 1));
    items.push(createItem('cash_1000', 1));
    items.push(createItem('vitamins', 1));
  } else if (furnitureType === 'tv_cabinet') {
    items.push(createItem('screwdriver', 1));
    items.push(createItem('duct_tape', 1));
    items.push(createItem('cash_500', 1));
  } else if (furnitureType === 'sink') {
    items.push(createItem('rag', 2));
    items.push(createItem('bandage', 1));
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
      items: initialItems
    };
    furnitureStorageDb.set(id, storage);
    saveFurnitureStoragesToLocalStorage();
  }

  return storage;
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
  countToTransfer: number = itemToAdd.count
): { success: boolean; message: string; transferredCount: number } {
  if (countToTransfer <= 0) return { success: false, message: 'Количество должно быть больше нуля', transferredCount: 0 };

  const check = canItemFitInFurniture(storage, itemToAdd);
  if (!check.fits) {
    return { success: false, message: check.reason || 'Предмет не помещается', transferredCount: 0 };
  }

  if (!storage.items) storage.items = [];

  const actualCount = Math.min(itemToAdd.count, countToTransfer);

  // Try stacking into existing stack
  if (itemToAdd.maxStack > 1) {
    const existing = storage.items.find(i => i.itemId === itemToAdd.itemId && i.count < i.maxStack);
    if (existing) {
      const space = existing.maxStack - existing.count;
      const addCount = Math.min(space, actualCount);
      existing.count += addCount;
      const remaining = actualCount - addCount;
      if (remaining <= 0) {
        return { success: true, message: `Помещено в хранилище: ${itemToAdd.nameRu} (x${addCount})`, transferredCount: addCount };
      }
      // If some left, continue to push new stack
      const splitItem = { ...itemToAdd, count: remaining, id: `item_${itemToAdd.itemId}_${Date.now()}` };
      storage.items.push(splitItem);
      saveFurnitureStoragesToLocalStorage();
      return { success: true, message: `Помещено в хранилище: ${itemToAdd.nameRu} (x${actualCount})`, transferredCount: actualCount };
    }
  }

  if (actualCount === itemToAdd.count) {
    storage.items.push(itemToAdd);
  } else {
    const splitItem = { ...itemToAdd, count: actualCount, id: `item_${itemToAdd.itemId}_${Date.now()}` };
    storage.items.push(splitItem);
  }

  saveFurnitureStoragesToLocalStorage();
  return {
    success: true,
    message: `Помещено в хранилище: ${itemToAdd.nameRu} (x${actualCount})`,
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

  let removedItem: InventoryItem;
  if (target.count <= count) {
    storage.items.splice(itemIndex, 1);
    removedItem = target;
  } else {
    target.count -= count;
    removedItem = { ...target, count };
  }

  saveFurnitureStoragesToLocalStorage();
  return removedItem;
}

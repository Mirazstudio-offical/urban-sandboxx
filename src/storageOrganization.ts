import { GameWorld, InventoryItem, ItemCategory, Player } from './types';
import {
  addItemToPlayer,
  createItem,
  getItemTotalVolume,
  getItemTotalWeight,
  getPlayerCompartments,
  isPlayerNearEcoVending,
  isPlayerNearTrashBin,
  removeItemFromPlayer,
  takeItemFromHand,
} from './items';
import {
  FurnitureStorage,
  FURNITURE_STORAGE_CONFIGS,
  canItemFitInFurniture,
  saveFurnitureStoragesToLocalStorage,
} from './furnitureStorageSystem';
import { LIQUID_REGISTRY, LiquidId } from './liquidSystem';

export type StorageFilterCategory = 'all' | 'food' | 'drink' | 'kitchenware' | 'gear' | 'trash';

export interface LogicalItemGroup {
  id:
    | 'meat'
    | 'dairy'
    | 'produce'
    | 'bakery_dry'
    | 'prepared'
    | 'drink'
    | 'kitchenware'
    | 'med'
    | 'clothing'
    | 'tool'
    | 'valuable'
    | 'container'
    | 'misc'
    | 'trash';
  order: number;
  filterCat: Exclude<StorageFilterCategory, 'all'>;
  labelRu: string;
}

const KITCHENWARE_KEYWORDS = [
  'skillet',
  'frying_pan',
  'pan_',
  'pot_',
  'cooking_pot',
  'saucepan',
  'kettle',
  'plate',
  'bowl',
  'mug',
  'cup_',
  'glass_',
  'jar_',
  'jar',
  'cutting_board',
  'knife_kitchen',
  'chef_knife',
  'kitchen_knife',
  'ladle',
  'spatula',
  'spoon',
  'fork',
  'whisk',
  'colander',
  'grater',
  'baking_',
  'casserole',
  'thermos',
  'flask',
  'teapot',
  'tray_',
  'container_food',
  'lunchbox',
];

const MEAT_KEYWORDS = [
  'beef',
  'pork',
  'chicken',
  'turkey',
  'duck',
  'lamb',
  'steak',
  'meat',
  'mince',
  'sausage',
  'bacon',
  'ham',
  'salami',
  'fish',
  'salmon',
  'trout',
  'cod',
  'herring',
  'mackerel',
  'shrimp',
  'crab',
  'caviar',
  'egg',
  'cutlet',
  'patty',
  'fillet',
  'rib',
  'wing',
  'drumstick',
  'liver',
  'stew_meat',
  'tushonka',
];

const DAIRY_KEYWORDS = [
  'cheese',
  'mozzarella',
  'cheddar',
  'parmesan',
  'gouda',
  'brie',
  'feta',
  'suluguni',
  'milk',
  'cream',
  'butter',
  'yogurt',
  'kefir',
  'sour_cream',
  'smetana',
  'tvorog',
  'cottage_cheese',
  'ryazhenka',
  'margarine',
  'ice_cream',
];

const PRODUCE_KEYWORDS = [
  'apple',
  'banana',
  'orange',
  'lemon',
  'lime',
  'pear',
  'peach',
  'plum',
  'berry',
  'strawberry',
  'blueberry',
  'raspberry',
  'cherry',
  'grape',
  'watermelon',
  'melon',
  'tomato',
  'cucumber',
  'potato',
  'carrot',
  'onion',
  'garlic',
  'cabbage',
  'broccoli',
  'pepper',
  'bell_pepper',
  'chili',
  'zucchini',
  'eggplant',
  'beet',
  'radish',
  'lettuce',
  'spinach',
  'dill',
  'parsley',
  'basil',
  'cilantro',
  'green_onion',
  'mushroom',
  'champignon',
  'porcini',
  'chanterelle',
  'boletus',
  'oyster_mushroom',
  'avocado',
  'corn',
  'peas',
  'beans_fresh',
  'pumpkin',
  'celery',
];

const DRY_FOOD_KEYWORDS = [
  'bread',
  'loaf',
  'bun',
  'baguette',
  'croissant',
  'cracker',
  'biscuit',
  'cookie',
  'pasta',
  'spaghetti',
  'macaroni',
  'noodle',
  'rice',
  'buckwheat',
  'oat',
  'semolina',
  'millet',
  'barley',
  'lentil',
  'flour',
  'sugar',
  'salt',
  'spice',
  'seasoning',
  'peppercorn',
  'paprika',
  'cinnamon',
  'bay_leaf',
  'oil',
  'vinegar',
  'ketchup',
  'mayo',
  'mustard',
  'soy_sauce',
  'sauce',
  'honey',
  'jam',
  'tea_',
  'coffee_',
  'cocoa',
  'cereal',
  'chips',
  'nuts',
  'seeds',
  'chocolate',
  'candy',
  'canned',
  'tin_',
];

const CARRY_BAG_KEYWORDS = [
  'bag',
  'backpack',
  'duffel',
  'tote',
  'satchel',
  'briefcase',
  'suitcase',
  'luggage',
  'sack',
  'crate',
  'box',
  'basket',
  'lukoshko',
  'pouch',
];

const KEEP_ON_PLAYER_IDS = new Set([
  'wallet',
  'leather_wallet',
  'phone',
  'smartphone',
  'keys',
  'key_ring',
  'car_keys',
  'apt_keys',
  'apartment_keys',
  'passport',
  'driver_license',
  'id_card',
]);

function matchesAnyKeyword(haystack: string, keywords: string[]): boolean {
  for (let i = 0; i < keywords.length; i++) {
    if (haystack.includes(keywords[i])) return true;
  }
  return false;
}

const FOOD_PACKAGING_PREFIXES = [
  'paper_packaging',
  'tray_sealed_food',
  'vacuum_pack',
  'pouch_sealed',
  'egg_carton',
  'takeout_box',
  'blister_pack',
  'foil_pack',
];

export function isPaperPackagingItem(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  const id = item.itemId.toLowerCase();
  for (let i = 0; i < FOOD_PACKAGING_PREFIXES.length; i++) {
    if (id.startsWith(FOOD_PACKAGING_PREFIXES[i])) return true;
  }
  const hasLiquid = Boolean(item.fluidStorage && (item.fluidStorage.currentMl || 0) > 0);
  if (item.singleUseContainer && !hasLiquid && !isReusableVesselOrContainer(item)) {
    return true;
  }
  return false;
}

export function getPackagedInnerItem(item: InventoryItem | null | undefined): InventoryItem | null {
  if (!item || !isPaperPackagingItem(item)) return null;
  if (!item.contents || item.contents.length === 0) return null;
  for (let i = 0; i < item.contents.length; i++) {
    if (item.contents[i]) return item.contents[i];
  }
  return null;
}

/**
 * Unwraps single-use food packaging (paper wrap, sealed tray, vacuum pack, pouch, carton)
 * to inspect the real product inside. For regular items or empty packaging, returns the item itself.
 */
export function getEffectiveSubjectItem(item: InventoryItem): InventoryItem {
  return getPackagedInnerItem(item) || item;
}

/**
 * Human-readable title that reveals what is inside wrapped/sealed packaging.
 */
export function getItemReadableTitleRu(item: InventoryItem): string {
  if (isPaperPackagingItem(item)) {
    const filled = (item.contents || []).filter(Boolean);
    if (filled.length === 0) {
      return `${item.nameRu} (пустая)`;
    }
    const first = filled[0];
    // If item.nameRu already includes the inner product name (e.g. "Сыр Чеддер (упаковка)"), don't duplicate
    const lowerOuter = (item.nameRu || '').toLowerCase();
    const lowerInner = (first.nameRu || '').toLowerCase();
    if (lowerInner && lowerOuter.includes(lowerInner)) {
      return filled.length > 1 ? `${item.nameRu} (${filled.length} шт.)` : item.nameRu;
    }
    if (filled.length === 1) {
      return `${first.nameRu} · в упаковке`;
    }
    return `${first.nameRu} (+${filled.length - 1}) · в упаковке`;
  }
  if (item.fluidStorage && item.fluidStorage.currentMl > 0 && item.fluidStorage.liquidId) {
    const liqDef = LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId];
    const liqName = item.fluidStorage.attributes?.varietyRu || liqDef?.nameRu;
    if (liqName && !item.nameRu.toLowerCase().includes(liqName.toLowerCase())) {
      return `${item.nameRu} (${liqName})`;
    }
  }
  return item.nameRu;
}

export function isCookwareOrTablewareItem(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  const id = item.itemId.toLowerCase();
  const name = (item.nameRu || '').toLowerCase();
  if (
    matchesAnyKeyword(id, KITCHENWARE_KEYWORDS) ||
    name.includes('сковород') ||
    name.includes('кастрюл') ||
    name.includes('сотейник') ||
    name.includes('чайник') ||
    name.includes('тарелк') ||
    name.includes('миск') ||
    name.includes('кружк') ||
    name.includes('стакан') ||
    name.includes('банка') ||
    name.includes('бокал') ||
    name.includes('доска разделоч') ||
    name.includes('лопатк') ||
    name.includes('половник') ||
    name.includes('термос') ||
    name.includes('фляг')
  ) {
    return true;
  }
  return false;
}

export function isReusableVesselOrContainer(item: InventoryItem): boolean {
  const id = item.itemId.toLowerCase();
  if (isCookwareOrTablewareItem(item)) return true;
  if (
    id.includes('bottle') ||
    id.includes('jar') ||
    id.includes('canister') ||
    id.includes('jerrycan') ||
    id.includes('bucket') ||
    id.includes('thermos') ||
    id.includes('flask') ||
    id.includes('backpack') ||
    id.includes('wallet') ||
    id.includes('duffel') ||
    id.includes('suitcase') ||
    id.includes('shopping_bag') ||
    id.includes('plastic_bag') ||
    id.includes('package_bag') ||
    id.includes('tote') ||
    id.includes('crate') ||
    id.includes('lukoshko') ||
    id.startsWith('box_cardboard') ||
    id.startsWith('sack_') ||
    id === 'sandbag' ||
    id.startsWith('detergent_') ||
    id === 'tube_ointment_small' ||
    id === 'aerosol_can_small' ||
    id === 'can_alu_330' ||
    id === 'tetra_pack_1000' ||
    id.startsWith('cup_plastic_dairy') ||
    id === 'paper_cup'
  ) {
    return true;
  }
  return false;
}

/**
 * Detects disposable trash, empty paper wrappers, empty single-use pouches/trays,
 * and spoiled/charred inedible scraps.
 * NEVER flags reusable containers (jars, bottles, cookware, bags, wallets) or non-empty packages.
 */
export function isDisposableTrashOrEmptyPackaging(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  const id = item.itemId.toLowerCase();

  if (id === 'litter_trash' || id.startsWith('trash_') || id.endsWith('_trash') || id.startsWith('garbage_')) {
    return true;
  }

  // Empty paper packaging (from butcher / grocery / market)
  if (isPaperPackagingItem(item)) {
    const filled = (item.contents || []).filter(Boolean);
    return filled.length === 0;
  }

  // Empty single-use wrapper / torn snack pouch / empty egg carton / disposable tray
  const hasLiquid = Boolean(item.fluidStorage && (item.fluidStorage.currentMl || 0) > 0);
  if (item.singleUseContainer && !hasLiquid && !isReusableVesselOrContainer(item)) {
    const filled = (item.contents || []).filter(Boolean);
    if (filled.length === 0) return true;
  }

  if (
    (id === 'pouch_sealed_snack_torn' ||
      id === 'egg_carton_10_open' ||
      id.includes('wrapper') ||
      id.includes('peel') ||
      id.includes('eggshell') ||
      id.includes('fish_bone') ||
      id.includes('scrap_burnt')) &&
    !hasLiquid &&
    (!item.contents || item.contents.filter(Boolean).length === 0)
  ) {
    return true;
  }

  // Spoiled or burnt-to-charcoal loose/wrapped food (never inside reusable cookware/jars)
  const subject = getEffectiveSubjectItem(item);
  if (
    subject.category === 'food' &&
    !hasLiquid &&
    (!item.isContainer || isPaperPackagingItem(item))
  ) {
    const st = String(subject.attributes?.state || '').toLowerCase();
    if (st === 'spoiled' || st === 'rotten' || st === 'charred') {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a container item is a shopping bag / backpack / box carrying loose items
 * that can safely be unloaded onto shelves in one click.
 * Never treats cookware, drinkware, wallets, or paper_packaging as an unloadable carry bag.
 */
export function isCarryBagWithItems(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  const hasLiquid = Boolean(item.fluidStorage && (item.fluidStorage.currentMl || 0) > 0);
  if (!item.isContainer || hasLiquid) return false;
  if (isPaperPackagingItem(item)) return false;
  if (isCookwareOrTablewareItem(item)) return false;

  const id = item.itemId.toLowerCase();
  if (id.includes('wallet') || id.includes('purse') || id.includes('key')) return false;

  const filled = (item.contents || []).filter(Boolean);
  if (filled.length === 0) return false;

  if (matchesAnyKeyword(id, CARRY_BAG_KEYWORDS)) return true;
  // Also allow generic non-fluid storage containers with >= 1.5L capacity (e.g. food boxes / hampers)
  if ((item.containerCapacityL || 0) >= 1.5 && !item.singleUseContainer) return true;
  return false;
}

export function getItemLogicalGroup(item: InventoryItem): LogicalItemGroup {
  if (isDisposableTrashOrEmptyPackaging(item)) {
    return { id: 'trash', order: 140, filterCat: 'trash', labelRu: 'Мусор и пустая упаковка' };
  }

  const subject = getEffectiveSubjectItem(item);
  const id = subject.itemId.toLowerCase();
  const name = (subject.nameRu || '').toLowerCase();

  // Check cookware/tableware before generic tool/misc
  if (isCookwareOrTablewareItem(item)) {
    // If cookware currently holds food or potable liquid, keep it in cookware for sorting
    // (filterCat = 'kitchenware'), while fridge/suitability checks contents separately.
    return { id: 'kitchenware', order: 70, filterCat: 'kitchenware', labelRu: 'Посуда и утварь' };
  }

  // Potable drinks / filled drink bottles
  if (subject.category === 'drink') {
    return { id: 'drink', order: 60, filterCat: 'drink', labelRu: 'Напитки' };
  }
  if (item.fluidStorage && item.fluidStorage.currentMl > 0 && item.fluidStorage.liquidId) {
    const liqDef = LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId];
    if (liqDef && !liqDef.isToxic && !liqDef.isFlammable) {
      if (liqDef.id.includes('oil') || liqDef.id.includes('sauce') || liqDef.id.includes('vinegar')) {
        return { id: 'bakery_dry', order: 40, filterCat: 'food', labelRu: 'Бакалея и соусы' };
      }
      return { id: 'drink', order: 60, filterCat: 'drink', labelRu: 'Напитки' };
    }
  }

  // Food sub-groups (meat -> dairy -> produce -> bakery/dry -> prepared)
  if (subject.category === 'food') {
    if (
      matchesAnyKeyword(id, MEAT_KEYWORDS) ||
      name.includes('говяд') ||
      name.includes('свинин') ||
      name.includes('куриц') ||
      name.includes('курин') ||
      name.includes('индейк') ||
      name.includes('рыб') ||
      name.includes('стейк') ||
      name.includes('фарш') ||
      name.includes('колбас') ||
      name.includes('сосиск') ||
      name.includes('яйц')
    ) {
      return { id: 'meat', order: 10, filterCat: 'food', labelRu: 'Мясо, рыба и яйца' };
    }
    if (
      matchesAnyKeyword(id, DAIRY_KEYWORDS) ||
      name.includes('сыр') ||
      name.includes('молок') ||
      name.includes('сливк') ||
      name.includes('творог') ||
      name.includes('сметан') ||
      name.includes('йогурт') ||
      name.includes('кефир') ||
      name.includes('масло сливоч')
    ) {
      return { id: 'dairy', order: 20, filterCat: 'food', labelRu: 'Молочное и сыр' };
    }
    if (
      matchesAnyKeyword(id, PRODUCE_KEYWORDS) ||
      name.includes('гриб') ||
      name.includes('шампиньон') ||
      name.includes('лук') ||
      name.includes('чеснок') ||
      name.includes('картоф') ||
      name.includes('томат') ||
      name.includes('помидор') ||
      name.includes('огур') ||
      name.includes('морков') ||
      name.includes('яблок') ||
      name.includes('зелен')
    ) {
      return { id: 'produce', order: 30, filterCat: 'food', labelRu: 'Овощи, фрукты и грибы' };
    }
    if (
      matchesAnyKeyword(id, DRY_FOOD_KEYWORDS) ||
      name.includes('хлеб') ||
      name.includes('круп') ||
      name.includes('макарон') ||
      name.includes('мука') ||
      name.includes('соль') ||
      name.includes('сахар') ||
      name.includes('спец') ||
      name.includes('масло ')
    ) {
      return { id: 'bakery_dry', order: 40, filterCat: 'food', labelRu: 'Хлеб и бакалея' };
    }
    return { id: 'prepared', order: 50, filterCat: 'food', labelRu: 'Готовая еда' };
  }

  if (subject.category === 'med') {
    return { id: 'med', order: 80, filterCat: 'gear', labelRu: 'Медицина и гигиена' };
  }
  if (subject.category === 'clothing' || subject.clothingSlot) {
    return { id: 'clothing', order: 90, filterCat: 'gear', labelRu: 'Одежда и обувь' };
  }
  if (subject.category === 'tool' || subject.category === 'weapon') {
    return { id: 'tool', order: 100, filterCat: 'gear', labelRu: 'Инструменты и снаряжение' };
  }
  if (subject.category === 'valuable') {
    return { id: 'valuable', order: 110, filterCat: 'gear', labelRu: 'Ценности и документы' };
  }
  if (item.isContainer && !isPaperPackagingItem(item)) {
    return { id: 'container', order: 120, filterCat: 'gear', labelRu: 'Сумки и тара' };
  }

  return { id: 'misc', order: 130, filterCat: 'gear', labelRu: 'Прочие вещи' };
}

export function itemMatchesStorageFilter(
  item: InventoryItem | null | undefined,
  filter: StorageFilterCategory,
  searchQuery: string
): boolean {
  if (!item) return false;
  if (filter !== 'all') {
    const grp = getItemLogicalGroup(item);
    if (grp.filterCat !== filter) {
      // Allow cookware that currently contains food/drink to also show up in food/drink filter
      if (
        !(
          grp.id === 'kitchenware' &&
          ((filter === 'food' && (item.contents || []).some(c => c && getEffectiveSubjectItem(c).category === 'food')) ||
            (filter === 'drink' && item.fluidStorage && item.fluidStorage.currentMl > 0))
        )
      ) {
        return false;
      }
    }
  }

  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;

  const subject = getEffectiveSubjectItem(item);
  const parts: string[] = [
    item.nameRu || '',
    subject.nameRu || '',
    item.itemId || '',
    subject.itemId || '',
    item.attributes?.varietyRu || '',
    subject.attributes?.varietyRu || '',
    item.attributes?.stateNameRu || '',
    subject.attributes?.stateNameRu || '',
  ];

  if (item.fluidStorage?.liquidId) {
    const liq = LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId];
    if (liq?.nameRu) parts.push(liq.nameRu);
    if (item.fluidStorage.attributes?.varietyRu) parts.push(item.fluidStorage.attributes.varietyRu);
  }

  if (item.contents && item.contents.length > 0) {
    for (const c of item.contents) {
      if (c?.nameRu) parts.push(c.nameRu);
    }
  }

  const haystack = parts.join(' ').toLowerCase();
  return haystack.includes(q);
}

/**
 * Checks whether two inventory items are physically identical enough to merge into a stack.
 */
export function canItemsStackSafely(a: InventoryItem, b: InventoryItem): boolean {
  if (a.itemId !== b.itemId) return false;
  if (a.isContainer || b.isContainer) return false;
  if (a.fluidStorage || b.fluidStorage) return false;
  const maxStack = Math.min(a.maxStack || 1, b.maxStack || 1);
  if (maxStack <= 1) return false;
  if (a.clothingSlot || b.clothingSlot) return false;

  const aState = a.attributes?.state || '';
  const bState = b.attributes?.state || '';
  if (aState !== bState) return false;

  const aCook = a.attributes?.cookMethod || '';
  const bCook = b.attributes?.cookMethod || '';
  if (aCook !== bCook) return false;

  const aVar = a.attributes?.varietyRu || '';
  const bVar = b.attributes?.varietyRu || '';
  if (aVar !== bVar) return false;

  if (Boolean(a.cheeseGlazed) !== Boolean(b.cheeseGlazed)) return false;

  const aTemp = a.temperature ?? a.surfaceTemperature ?? 20;
  const bTemp = b.temperature ?? b.surfaceTemperature ?? 20;
  if (Math.abs(aTemp - bTemp) > 10) return false;

  const aWet = a.wetness ?? 0;
  const bWet = b.wetness ?? 0;
  if (Math.abs(aWet - bWet) > 15) return false;

  return true;
}

/**
 * Merges compatible stacks, removes empty gaps, and sorts items into logical real-world groups.
 */
export function organizeItemList(
  sourceList: (InventoryItem | null | undefined)[]
): { items: InventoryItem[]; mergedCount: number; changed: boolean } {
  const present: InventoryItem[] = [];
  for (let i = 0; i < sourceList.length; i++) {
    const it = sourceList[i];
    if (it) present.push(it);
  }

  if (present.length === 0) {
    return { items: [], mergedCount: 0, changed: false };
  }

  // 1. Merge compatible stacks
  const merged: InventoryItem[] = [];
  let mergedCount = 0;
  for (const item of present) {
    let remaining = item.count || 1;
    let absorbed = false;

    if (!item.isContainer && !item.fluidStorage && (item.maxStack || 1) > 1) {
      for (const target of merged) {
        if (remaining <= 0) break;
        const maxSt = target.maxStack || 1;
        if (target.count < maxSt && canItemsStackSafely(target, item)) {
          const add = Math.min(remaining, maxSt - target.count);
          target.count += add;
          remaining -= add;
          mergedCount += 1;
        }
      }
      if (remaining <= 0) {
        absorbed = true;
      } else {
        item.count = remaining;
      }
    }

    if (!absorbed) {
      merged.push(item);
    }
  }

  // 2. Sort by logical group -> readable name -> count desc -> temperature desc
  const sorted = [...merged].sort((a, b) => {
    const ga = getItemLogicalGroup(a);
    const gb = getItemLogicalGroup(b);
    if (ga.order !== gb.order) return ga.order - gb.order;

    const nameA = getItemReadableTitleRu(a);
    const nameB = getItemReadableTitleRu(b);
    const cmp = nameA.localeCompare(nameB, 'ru');
    if (cmp !== 0) return cmp;

    if ((b.count || 1) !== (a.count || 1)) return (b.count || 1) - (a.count || 1);

    const ta = a.temperature ?? a.surfaceTemperature ?? 20;
    const tb = b.temperature ?? b.surfaceTemperature ?? 20;
    return tb - ta;
  });

  // Detect whether order, stacking, or leading gaps changed
  let changed = mergedCount > 0;
  if (!changed) {
    for (let i = 0; i < sorted.length; i++) {
      if (sourceList[i] !== sorted[i]) {
        changed = true;
        break;
      }
    }
  }

  return { items: sorted, mergedCount, changed };
}

/**
 * Organizes a FurnitureStorage's items array in place and persists to localStorage.
 */
export function organizeFurnitureStorageInPlace(storage: FurnitureStorage): {
  mergedCount: number;
  changed: boolean;
  totalItems: number;
} {
  if (!storage.items) storage.items = [];
  const res = organizeItemList(storage.items);
  storage.items = res.items;
  if (res.changed) {
    saveFurnitureStoragesToLocalStorage();
  }
  return { mergedCount: res.mergedCount, changed: res.changed, totalItems: res.items.length };
}

/**
 * Organizes a container's contents in place (shopping bag, backpack, crate, etc.).
 */
export function organizeContainerInPlace(container: InventoryItem): {
  mergedCount: number;
  changed: boolean;
  totalItems: number;
} {
  if (!container.contents) container.contents = [];
  const res = organizeItemList(container.contents);
  container.contents = res.items;
  return { mergedCount: res.mergedCount, changed: res.changed, totalItems: res.items.length };
}

/**
 * Organizes player pockets strictly per compartment so every item stays inside
 * a compartment that physically supports its volume and weight limits.
 */
export function organizePlayerInventoryInPlace(player: Player): {
  mergedCount: number;
  changed: boolean;
} {
  if (!player.inventory) return { mergedCount: 0, changed: false };
  const compartments = getPlayerCompartments(player);
  let totalMerged = 0;
  let anyChanged = false;

  for (const comp of compartments) {
    const slice: (InventoryItem | null | undefined)[] = [];
    for (let i = 0; i < comp.slotCount; i++) {
      slice.push(player.inventory[comp.startIndex + i]);
    }
    const res = organizeItemList(slice);
    totalMerged += res.mergedCount;
    if (res.changed) anyChanged = true;

    for (let i = 0; i < comp.slotCount; i++) {
      player.inventory[comp.startIndex + i] = (res.items[i] ?? null) as any;
    }
  }

  return { mergedCount: totalMerged, changed: anyChanged };
}

/**
 * Checks whether an item naturally belongs in a given furniture type based on real-world usage.
 */
export function doesItemSuitFurnitureType(item: InventoryItem, furnitureType: string): boolean {
  if (!item) return false;
  if (isDisposableTrashOrEmptyPackaging(item)) return false;

  const id = item.itemId.toLowerCase();
  if (KEEP_ON_PLAYER_IDS.has(id) || id.includes('wallet') || id.includes('apt_key') || id.includes('car_key')) {
    return false;
  }

  const grp = getItemLogicalGroup(item);

  switch (furnitureType) {
    case 'fridge': {
      // Perishable foods, dairy, meat, produce, prepared dishes, drinks, cold meds
      if (grp.id === 'meat' || grp.id === 'dairy' || grp.id === 'produce' || grp.id === 'prepared') {
        return true;
      }
      if (grp.id === 'drink') return true;
      if (grp.id === 'kitchenware') {
        // Cookware containing food or liquid (e.g. pot of soup, plate with dinner) belongs in fridge!
        const hasFoodInside = (item.contents || []).some(c => c && getEffectiveSubjectItem(c).category === 'food');
        const hasDrinkInside = Boolean(item.fluidStorage && item.fluidStorage.currentMl > 0);
        return hasFoodInside || hasDrinkInside;
      }
      return false;
    }

    case 'kitchen_counter':
    case 'table': {
      // Dry groceries, condiments/oil, cookware/tableware, shelf-stable produce
      if (grp.id === 'bakery_dry' || grp.id === 'kitchenware') return true;
      if (grp.id === 'drink' && !item.itemId.includes('milk')) return true;
      return false;
    }

    case 'wardrobe':
    case 'dresser': {
      return grp.id === 'clothing';
    }

    case 'radiator': {
      // Realistic: wet clothes, rags, or damp items go on the radiator to dry
      return (item.wetness ?? 0) >= 8;
    }

    case 'safe': {
      return grp.id === 'valuable' && !id.includes('wallet');
    }

    case 'bookshelf':
    case 'desk':
    case 'file_cabinet': {
      if (grp.id === 'valuable' && !id.includes('wallet')) return true;
      if (
        id.includes('book') ||
        id.includes('note') ||
        id.includes('paper') ||
        id.includes('pen') ||
        id.includes('doc') ||
        id.includes('newspaper') ||
        id.includes('magazine') ||
        id.includes('battery') ||
        id.includes('compass')
      ) {
        return true;
      }
      return grp.id === 'tool' && getItemTotalVolume(item) <= 1.2;
    }

    case 'nightstand':
    case 'tv_cabinet': {
      return grp.id === 'med' || (grp.id === 'tool' && getItemTotalVolume(item) <= 2.0);
    }

    case 'lockers':
    case 'toy_chest':
    case 'shelf': {
      return grp.id === 'tool' || grp.id === 'clothing' || grp.id === 'med' || grp.id === 'misc';
    }

    default:
      return false;
  }
}

export function getSuitableButtonLabelRu(furnitureType: string): string {
  switch (furnitureType) {
    case 'fridge':
      return 'Продукты в холод';
    case 'kitchen_counter':
    case 'table':
      return 'Посуду и бакалею';
    case 'wardrobe':
    case 'dresser':
      return 'Одежду в шкаф';
    case 'radiator':
      return 'Мокрое на сушку';
    case 'safe':
      return 'Ценности в сейф';
    case 'bookshelf':
    case 'desk':
    case 'file_cabinet':
      return 'Вещи и бумаги';
    default:
      return 'Подходящее';
  }
}

export interface CarryBagRef {
  source: { type: 'hand'; hand: 'left' | 'right' } | { type: 'inv'; idx: number };
  bag: InventoryItem;
  itemCount: number;
}

export function findCarryBagsWithItems(player: Player): CarryBagRef[] {
  const result: CarryBagRef[] = [];
  // Hands first (most natural: player just walked in carrying a grocery bag)
  if (player.rightHandItem && isCarryBagWithItems(player.rightHandItem)) {
    result.push({
      source: { type: 'hand', hand: 'right' },
      bag: player.rightHandItem,
      itemCount: (player.rightHandItem.contents || []).filter(Boolean).length,
    });
  }
  if (player.leftHandItem && isCarryBagWithItems(player.leftHandItem)) {
    result.push({
      source: { type: 'hand', hand: 'left' },
      bag: player.leftHandItem,
      itemCount: (player.leftHandItem.contents || []).filter(Boolean).length,
    });
  }
  if (player.inventory) {
    for (let i = 0; i < player.inventory.length; i++) {
      const it = player.inventory[i];
      if (it && isCarryBagWithItems(it)) {
        result.push({
          source: { type: 'inv', idx: i },
          bag: it,
          itemCount: (it.contents || []).filter(Boolean).length,
        });
      }
    }
  }
  return result;
}

/**
 * Helper: inserts a single item into FurnitureStorage (stacking if safe, otherwise first empty slot or push).
 */
function tryInsertItemIntoStorage(
  storage: FurnitureStorage,
  item: InventoryItem,
  maxSlots?: number
): { ok: boolean; partialMoved: number } {
  const fit = canItemFitInFurniture(storage, item);
  if (!fit.fits) return { ok: false, partialMoved: 0 };

  if (!storage.items) storage.items = [];

  // 1. Try merging into existing stack
  if (!item.isContainer && !item.fluidStorage && (item.maxStack || 1) > 1) {
    let moved = 0;
    for (let i = 0; i < storage.items.length; i++) {
      const st = storage.items[i];
      if (!st) continue;
      if (st.count < (st.maxStack || 1) && canItemsStackSafely(st, item)) {
        const add = Math.min(item.count, (st.maxStack || 1) - st.count);
        if (add > 0) {
          st.count += add;
          item.count -= add;
          moved += add;
          if (item.count <= 0) {
            return { ok: true, partialMoved: moved };
          }
        }
      }
    }
  }

  // 2. First null hole inside storage.items
  for (let i = 0; i < storage.items.length; i++) {
    if (!storage.items[i]) {
      storage.items[i] = item;
      return { ok: true, partialMoved: item.count || 1 };
    }
  }

  // 3. Append if within slot limit (when provided)
  if (maxSlots !== undefined && storage.items.length >= maxSlots) {
    return { ok: false, partialMoved: 0 };
  }
  storage.items.push(item);
  return { ok: true, partialMoved: item.count || 1 };
}

export interface BatchTransferResult {
  movedCount: number;
  skippedCount: number;
  bagNames: string[];
  messageRu: string;
}

/**
 * Batch-transfers items from player pockets/hands/carry-bags into a FurnitureStorage.
 * - 'matching': only items whose itemId (or inner packaged itemId) already exists in storage
 * - 'suitable': items matching the furniture's physical role (fridge -> perishables, wardrobe -> clothes, etc.)
 * - 'unload_bags': unloads contents of carried shopping bags / backpacks into storage, leaving bags intact
 */
export function quickTransferToStorage(
  player: Player,
  storage: FurnitureStorage,
  mode: 'matching' | 'suitable' | 'unload_bags',
  maxSlots?: number
): BatchTransferResult {
  const cfg = FURNITURE_STORAGE_CONFIGS[storage.furnitureType] || FURNITURE_STORAGE_CONFIGS.wardrobe;
  if (!storage.items) storage.items = [];

  let movedCount = 0;
  let skippedCount = 0;
  const bagNames: string[] = [];

  if (mode === 'unload_bags') {
    const bags = findCarryBagsWithItems(player);
    if (bags.length === 0) {
      return {
        movedCount: 0,
        skippedCount: 0,
        bagNames: [],
        messageRu: 'Нет пакетов или сумок с вещами для выгрузки',
      };
    }

    // Prioritize first bag with items (usually the shopping bag in hand)
    // Unload all bags in hands first; if none in hands, unload bags in inventory
    const handBags = bags.filter(b => b.source.type === 'hand');
    const targetBags = handBags.length > 0 ? handBags : [bags[0]];

    for (const ref of targetBags) {
      const contents = ref.bag.contents || [];
      const remaining: InventoryItem[] = [];
      let movedFromThisBag = 0;

      for (const inner of contents) {
        if (!inner) continue;
        const ins = tryInsertItemIntoStorage(storage, inner, maxSlots);
        if (ins.ok) {
          movedCount += 1;
          movedFromThisBag += 1;
        } else {
          remaining.push(inner);
          skippedCount += 1;
        }
      }

      ref.bag.contents = remaining;
      if (movedFromThisBag > 0) {
        bagNames.push(ref.bag.nameRu);
      }
    }

    if (movedCount > 0) {
      saveFurnitureStoragesToLocalStorage();
    }

    const bagLabel = bagNames[0] || targetBags[0].bag.nameRu;
    const messageRu =
      movedCount > 0
        ? skippedCount > 0
          ? `Выгружено ${movedCount} предм. из «${bagLabel}» (не поместилось: ${skippedCount})`
          : `Выгружено ${movedCount} предм. из «${bagLabel}»`
        : `Не удалось выгрузить из «${bagLabel}» — предметы не подходят или нет места`;

    return { movedCount, skippedCount, bagNames, messageRu };
  }

  // Collect matching item IDs if mode === 'matching'
  const existingKeys = new Set<string>();
  if (mode === 'matching') {
    for (const st of storage.items) {
      if (!st) continue;
      const subj = getEffectiveSubjectItem(st);
      existingKeys.add(subj.itemId);
      if (!isPaperPackagingItem(st)) {
        existingKeys.add(st.itemId);
      }
    }
    if (existingKeys.size === 0) {
      return {
        movedCount: 0,
        skippedCount: 0,
        bagNames: [],
        messageRu: 'В хранилище пока нет предметов для докладывания похожих',
      };
    }
  }

  const shouldTransfer = (it: InventoryItem): boolean => {
    if (isDisposableTrashOrEmptyPackaging(it)) return false;
    const subj = getEffectiveSubjectItem(it);
    if (mode === 'matching') {
      if (KEEP_ON_PLAYER_IDS.has(it.itemId.toLowerCase())) return false;
      return existingKeys.has(subj.itemId) || (!isPaperPackagingItem(it) && existingKeys.has(it.itemId));
    }
    return doesItemSuitFurnitureType(it, storage.furnitureType);
  };

  // Scan inventory slots
  if (player.inventory) {
    for (let i = 0; i < player.inventory.length; i++) {
      const it = player.inventory[i];
      if (!it || !shouldTransfer(it)) continue;
      // Don't auto-store a non-empty carry bag during matching/suitable
      if (isCarryBagWithItems(it)) continue;

      const ins = tryInsertItemIntoStorage(storage, it, maxSlots);
      if (ins.ok) {
        player.inventory[i] = null as any;
        movedCount += 1;
      } else {
        skippedCount += 1;
      }
    }
  }

  // Also check loose non-bag items in hands
  for (const hand of ['left', 'right'] as const) {
    const hItem = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (!hItem || isCarryBagWithItems(hItem) || !shouldTransfer(hItem)) continue;

    const ins = tryInsertItemIntoStorage(storage, hItem, maxSlots);
    if (ins.ok) {
      takeItemFromHand(player, hand);
      movedCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  if (movedCount > 0) {
    saveFurnitureStoragesToLocalStorage();
  }

  let messageRu: string;
  if (movedCount > 0) {
    const base =
      mode === 'matching'
        ? `Доложено похожих предметов: ${movedCount}`
        : `Сложено подходящих предметов: ${movedCount}`;
    messageRu = skippedCount > 0 ? `${base} (не поместилось: ${skippedCount})` : base;
  } else if (skippedCount > 0) {
    messageRu = `Не хватает места или грузоподъёмности (${cfg.maxWeightKg} кг)`;
  } else {
    messageRu =
      mode === 'matching'
        ? 'В карманах нет предметов, похожих на лежащие здесь'
        : 'В карманах нет подходящих для этого хранилища предметов';
  }

  return { movedCount, skippedCount, bagNames, messageRu };
}

export function countDisposableTrashInList(items: (InventoryItem | null | undefined)[] | undefined): number {
  if (!items || items.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it && isDisposableTrashOrEmptyPackaging(it)) {
      total += 1;
    }
  }
  return total;
}

export function countDisposableTrashOnPlayer(player: Player): number {
  let total = 0;
  if (player.leftHandItem && isDisposableTrashOrEmptyPackaging(player.leftHandItem)) total += 1;
  if (player.rightHandItem && isDisposableTrashOrEmptyPackaging(player.rightHandItem)) total += 1;
  if (player.inventory) {
    for (let i = 0; i < player.inventory.length; i++) {
      const it = player.inventory[i];
      if (!it) continue;
      if (isDisposableTrashOrEmptyPackaging(it)) {
        total += 1;
      } else if (isCarryBagWithItems(it) && it.contents) {
        total += countDisposableTrashInList(it.contents);
      }
    }
  }
  return total;
}

export function sweepTrashFromStorage(storage: FurnitureStorage): {
  removedCount: number;
  messageRu: string;
} {
  if (!storage.items || storage.items.length === 0) {
    return { removedCount: 0, messageRu: 'Мусор и пустые упаковки не найдены' };
  }

  let removedCount = 0;
  for (let i = 0; i < storage.items.length; i++) {
    const it = storage.items[i];
    if (it && isDisposableTrashOrEmptyPackaging(it)) {
      storage.items[i] = null as any;
      removedCount += 1;
    }
  }

  // Trim trailing nulls and keep list clean
  storage.items = storage.items.filter(Boolean);

  if (removedCount > 0) {
    saveFurnitureStoragesToLocalStorage();
    return {
      removedCount,
      messageRu: `Убрано пустых упаковок и мусора: ${removedCount}`,
    };
  }
  return { removedCount: 0, messageRu: 'Мусор и пустые упаковки не найдены' };
}

export function sweepTrashFromContainer(container: InventoryItem): {
  removedCount: number;
  messageRu: string;
} {
  if (!container.contents || container.contents.length === 0) {
    return { removedCount: 0, messageRu: 'Внутри нет мусора или пустых упаковок' };
  }
  let removedCount = 0;
  const kept: InventoryItem[] = [];
  for (const it of container.contents) {
    if (!it) continue;
    if (isDisposableTrashOrEmptyPackaging(it)) {
      removedCount += 1;
    } else {
      kept.push(it);
    }
  }
  container.contents = kept;
  return {
    removedCount,
    messageRu:
      removedCount > 0
        ? `Убрано пустых упаковок и мусора: ${removedCount}`
        : 'Внутри нет мусора или пустых упаковок',
  };
}

/**
 * Disposes all empty packaging, wrappers, spoiled scraps, and litter_trash
 * from player pockets, hands, and carried bags into a nearby trash bin / dumpster.
 */
export function sweepTrashFromPlayerToBin(
  player: Player,
  world: GameWorld
): { removedCount: number; ecoReward: number; messageRu: string } {
  if (!isPlayerNearTrashBin(player, world)) {
    return {
      removedCount: 0,
      ecoReward: 0,
      messageRu: 'Подойдите ближе к урне или мусорному контейнеру',
    };
  }

  const isEco = isPlayerNearEcoVending(player, world);
  let removedCount = 0;
  let ecoReward = 0;

  // Hands
  for (const hand of ['left', 'right'] as const) {
    const it = hand === 'left' ? player.leftHandItem : player.rightHandItem;
    if (it && isDisposableTrashOrEmptyPackaging(it)) {
      if (isEco && it.itemId === 'litter_trash') ecoReward += (it.count || 1) * 5;
      takeItemFromHand(player, hand);
      removedCount += 1;
    }
  }

  // Inventory + trash inside carried shopping bags
  if (player.inventory) {
    for (let i = player.inventory.length - 1; i >= 0; i--) {
      const it = player.inventory[i];
      if (!it) continue;
      if (isDisposableTrashOrEmptyPackaging(it)) {
        if (isEco && it.itemId === 'litter_trash') ecoReward += (it.count || 1) * 5;
        removeItemFromPlayer(player, i, it.count || 1);
        removedCount += 1;
      } else if (isCarryBagWithItems(it) && it.contents) {
        const kept: InventoryItem[] = [];
        for (const inner of it.contents) {
          if (!inner) continue;
          if (isDisposableTrashOrEmptyPackaging(inner)) {
            if (isEco && inner.itemId === 'litter_trash') ecoReward += (inner.count || 1) * 5;
            removedCount += 1;
          } else {
            kept.push(inner);
          }
        }
        it.contents = kept;
      }
    }
  }

  if (ecoReward > 0) {
    addItemToPlayer(player, createItem('cash', ecoReward));
  }

  if (removedCount === 0) {
    return { removedCount: 0, ecoReward: 0, messageRu: 'Мусор и пустые упаковки не найдены' };
  }

  const messageRu =
    ecoReward > 0
      ? `Выброшено в контейнер: ${removedCount} предм. (возврат за вторсырьё: +$${ecoReward})`
      : `Выброшено в урну: ${removedCount} предм.`;

  return { removedCount, ecoReward, messageRu };
}

/**
 * Counts how many items on the player would be transferred by 'matching' or 'suitable'
 * (for subtle count hints or disabling buttons when nothing applies).
 */
export function countTransferCandidates(
  player: Player,
  storage: FurnitureStorage,
  mode: 'matching' | 'suitable'
): number {
  const existingKeys = new Set<string>();
  if (mode === 'matching') {
    for (const st of storage.items || []) {
      if (!st) continue;
      const subj = getEffectiveSubjectItem(st);
      existingKeys.add(subj.itemId);
      if (!isPaperPackagingItem(st)) existingKeys.add(st.itemId);
    }
    if (existingKeys.size === 0) return 0;
  }

  let count = 0;
  const checkItem = (it: InventoryItem | null | undefined) => {
    if (!it || isCarryBagWithItems(it) || isDisposableTrashOrEmptyPackaging(it)) return;
    if (mode === 'matching') {
      if (KEEP_ON_PLAYER_IDS.has(it.itemId.toLowerCase())) return;
      const subj = getEffectiveSubjectItem(it);
      if (existingKeys.has(subj.itemId) || (!isPaperPackagingItem(it) && existingKeys.has(it.itemId))) {
        count += 1;
      }
    } else if (doesItemSuitFurnitureType(it, storage.furnitureType)) {
      count += 1;
    }
  };

  if (player.inventory) {
    for (let i = 0; i < player.inventory.length; i++) checkItem(player.inventory[i]);
  }
  checkItem(player.leftHandItem);
  checkItem(player.rightHandItem);
  return count;
}

export function getStorageItemSummaryWeight(item: InventoryItem): number {
  return getItemTotalWeight(item);
}

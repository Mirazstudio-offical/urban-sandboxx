// =====================================================================
// FIRST-PRINCIPLES CULINARY ENGINE (HARDCORE THERMODYNAMICS & BIOCHEMISTRY)
// =====================================================================
// Strict Realism Architecture:
// - Physical objects only: cookware, knives, salt shakers, oil bottles must physically exist!
// - Stoves have burners. Wooden tables & counters DO NOT have burners!
// - Zero abstract arcade UI: No grams HUD, no sci-fi lab nutritional overlays while cooking.
// - Diegetic sensory feedback: Sight (cut, crust, char), Hearing (sizzle, boil, crackle), Smell/Smoke.
// =====================================================================

import { InventoryItem } from './types';
import { COOKING_INGREDIENTS_CATALOG } from './cookingIngredients';

export interface NutrientProfile {
  calories: number; // kcal
  proteins: number; // g
  fats: number;     // g
  carbs: number;    // g
  sugars: number;   // g
  fiber: number;    // g
  salt: number;     // g
  water: number;    // g
}

export interface BiochemicalState {
  denaturation: number;   // 0.0 (raw) -> 1.0 (optimally cooked) -> >1.4 (overcooked/rubbery)
  maillard: number;       // 0.0 (none) -> 0.4 (golden crust) -> 1.0 (deep caramel/crust)
  charring: number;       // 0.0 (clean) -> 0.15 (light burn) -> 0.45 (bitter char) -> 1.0 (pure carbon ash)
  hydrolysis: number;     // 0.0 (firm) -> 0.6 (tender) -> >1.2 (mushy/overboiled)
  cutLevel: number;       // 0 = whole, 1 = sliced/diced, 2 = minced/pureed
  cutPieces: number;      // Number of physical cuts/pieces
  surfaceAreaMult: number;// Multiplier for heat conduction & flavor extraction
  isStirredRecently: boolean;
}

export interface CulinaryIngredient {
  id: string;
  sourceItemId: string;
  name: string;
  nameRu: string;
  massGrams: number;
  initialMassGrams: number;
  nutrients: NutrientProfile;
  bioState: BiochemicalState;
  surfaceTemp: number; // °C
  coreTemp: number;    // °C
  icon: string;
}

export interface LiquidPortion {
  liquidId: string;
  nameRu: string;
  volumeMl: number;
  temperature: number; // °C
  isFatOrOil: boolean;
  smokePointTemp: number; // °C
}

export interface CookwareVessel {
  id: string;
  vesselType: 'surface' | 'pan' | 'pot' | 'kettle' | 'bowl';
  nameRu: string;
  sourceItem?: InventoryItem; // Physical cookware item placed by the player
  hasBurner: boolean;        // True ONLY if placed on a stove!
  capacityMl: number;
  temperature: number;       // Vessel metal/surface temperature in °C
  heatSourcePower: number;   // 0 to 6 (0 = off, 6 = max burner ~260-290°C)
  hasLid: boolean;
  ingredients: CulinaryIngredient[];
  liquids: LiquidPortion[];
  smokeIntensity: number;    // 0.0 to 1.0
  isFlaming: boolean;
  saltGrams: number;
  seasoningNotes: string[];
}

// Physical Item Filters
export function isCookwareItem(itemId?: string | null): boolean {
  if (!itemId) return false;
  return (
    itemId.startsWith('kitchen_pan_') ||
    itemId.startsWith('kitchen_pot_') ||
    itemId.startsWith('kitchen_kettle_') ||
    itemId === 'kitchen_plate_enamel' ||
    itemId === 'kitchen_bowl_wooden'
  );
}

export function isKnifeItem(itemId?: string | null): boolean {
  if (!itemId) return false;
  return itemId === 'kitchen_knife_chef' || itemId === 'pocket_knife';
}

export function isSaltItem(itemId?: string | null): boolean {
  if (!itemId) return false;
  return itemId === 'salt_shaker' || itemId === 'salt';
}

export function isOilOrFatItem(itemId?: string | null): boolean {
  if (!itemId) return false;
  return (
    itemId.includes('oil') ||
    itemId.includes('butter') ||
    itemId.includes('tallow') ||
    itemId.includes('lard') ||
    itemId.includes('fat')
  );
}

export function isPlateOrBowlItem(itemId?: string | null): boolean {
  if (!itemId) return false;
  return (
    itemId.startsWith('kitchen_plate_') ||
    itemId.startsWith('kitchen_bowl_')
  );
}

// Baseline nutrient database per 100g of raw product
interface FoodNutrientRef {
  kcal: number;
  p: number;
  f: number;
  c: number;
  sugar: number;
  fiber: number;
  salt: number;
  water: number;
  type: 'meat' | 'fish' | 'poultry' | 'veggie' | 'grain' | 'dairy' | 'fat' | 'condiment';
}

export const NUTRIENT_REFERENCE_PER_100G: Record<string, FoodNutrientRef> = {
  // Meats
  beef: { kcal: 250, p: 26.0, f: 17.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 57.0, type: 'meat' },
  pork: { kcal: 242, p: 27.0, f: 14.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 59.0, type: 'meat' },
  mutton: { kcal: 294, p: 25.0, f: 21.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.15, water: 54.0, type: 'meat' },
  venison: { kcal: 158, p: 30.0, f: 3.2, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 66.0, type: 'meat' },
  chicken: { kcal: 165, p: 31.0, f: 3.6, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 65.0, type: 'poultry' },
  turkey: { kcal: 189, p: 29.0, f: 7.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 64.0, type: 'poultry' },
  duck: { kcal: 337, p: 19.0, f: 28.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.15, water: 52.0, type: 'poultry' },
  
  // Fish & Seafood
  salmon: { kcal: 208, p: 20.0, f: 13.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 67.0, type: 'fish' },
  perch: { kcal: 91, p: 18.5, f: 0.9, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 79.0, type: 'fish' },
  pike: { kcal: 84, p: 18.4, f: 1.1, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 80.0, type: 'fish' },
  carp: { kcal: 127, p: 17.8, f: 5.6, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.1, water: 76.0, type: 'fish' },
  shrimp: { kcal: 99, p: 24.0, f: 0.3, c: 0.2, sugar: 0.0, fiber: 0.0, salt: 0.3, water: 75.0, type: 'fish' },

  // Vegetables & Herbs
  potato: { kcal: 77, p: 2.0, f: 0.1, c: 17.5, sugar: 0.8, fiber: 2.2, salt: 0.02, water: 79.0, type: 'veggie' },
  onion: { kcal: 40, p: 1.1, f: 0.1, c: 9.3, sugar: 4.2, fiber: 1.7, salt: 0.01, water: 88.0, type: 'veggie' },
  garlic: { kcal: 149, p: 6.4, f: 0.5, c: 33.0, sugar: 1.0, fiber: 2.1, salt: 0.03, water: 59.0, type: 'veggie' },
  carrot: { kcal: 41, p: 0.9, f: 0.2, c: 9.6, sugar: 4.7, fiber: 2.8, salt: 0.07, water: 88.0, type: 'veggie' },
  tomato: { kcal: 18, p: 0.9, f: 0.2, c: 3.9, sugar: 2.6, fiber: 1.2, salt: 0.01, water: 94.0, type: 'veggie' },
  cucumber: { kcal: 15, p: 0.7, f: 0.1, c: 3.6, sugar: 1.7, fiber: 0.5, salt: 0.01, water: 95.0, type: 'veggie' },
  cabbage: { kcal: 25, p: 1.3, f: 0.1, c: 5.8, sugar: 3.2, fiber: 2.5, salt: 0.02, water: 92.0, type: 'veggie' },
  beetroot: { kcal: 43, p: 1.6, f: 0.2, c: 9.6, sugar: 6.8, fiber: 2.8, salt: 0.08, water: 87.0, type: 'veggie' },
  bell_pepper: { kcal: 31, p: 1.0, f: 0.3, c: 6.0, sugar: 4.2, fiber: 2.1, salt: 0.01, water: 92.0, type: 'veggie' },
  mushroom: { kcal: 22, p: 3.1, f: 0.3, c: 3.3, sugar: 2.0, fiber: 1.0, salt: 0.01, water: 92.0, type: 'veggie' },

  // Grains, Pasta & Bakery
  rice: { kcal: 130, p: 2.7, f: 0.3, c: 28.0, sugar: 0.1, fiber: 0.4, salt: 0.01, water: 68.0, type: 'grain' },
  pasta: { kcal: 158, p: 5.8, f: 0.9, c: 31.0, sugar: 0.6, fiber: 1.8, salt: 0.02, water: 61.0, type: 'grain' },
  bread: { kcal: 265, p: 9.0, f: 3.2, c: 49.0, sugar: 5.0, fiber: 2.7, salt: 1.2, water: 36.0, type: 'grain' },
  flour: { kcal: 364, p: 10.3, f: 1.0, c: 76.0, sugar: 0.3, fiber: 2.7, salt: 0.01, water: 11.0, type: 'grain' },

  // Dairy & Fats
  egg: { kcal: 143, p: 12.6, f: 9.5, c: 0.7, sugar: 0.4, fiber: 0.0, salt: 0.35, water: 76.0, type: 'dairy' },
  milk: { kcal: 60, p: 3.2, f: 3.5, c: 4.8, sugar: 4.8, fiber: 0.0, salt: 0.1, water: 88.0, type: 'dairy' },
  cheese: { kcal: 402, p: 25.0, f: 33.0, c: 1.3, sugar: 0.5, fiber: 0.0, salt: 1.8, water: 39.0, type: 'dairy' },
  butter: { kcal: 717, p: 0.9, f: 81.0, c: 0.1, sugar: 0.1, fiber: 0.0, salt: 0.05, water: 16.0, type: 'fat' },
  sunflower_oil: { kcal: 884, p: 0.0, f: 100.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.0, water: 0.0, type: 'fat' },
  tallow: { kcal: 902, p: 0.0, f: 100.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.0, water: 0.0, type: 'fat' },

  // Condiments & Spices
  sugar: { kcal: 387, p: 0.0, f: 0.0, c: 100.0, sugar: 100.0, fiber: 0.0, salt: 0.0, water: 0.0, type: 'condiment' },
  salt: { kcal: 0, p: 0.0, f: 0.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 100.0, water: 0.0, type: 'condiment' },
  water: { kcal: 0, p: 0.0, f: 0.0, c: 0.0, sugar: 0.0, fiber: 0.0, salt: 0.0, water: 100.0, type: 'condiment' },
  broth: { kcal: 15, p: 2.5, f: 0.5, c: 0.2, sugar: 0.1, fiber: 0.0, salt: 0.8, water: 96.0, type: 'condiment' }
};

/**
 * Extracts or infers realistic nutrients for any given item
 */
export function inferNutrientsFromItem(item: InventoryItem, massGrams?: number): NutrientProfile {
  const mass = massGrams || (item.weight ? item.weight * 1000 : 250);
  const factor = mass / 100;

  if (item.nutrients) {
    const scale = massGrams ? massGrams / ((item.nutrients.proteins + item.nutrients.fats + item.nutrients.carbs + (item.nutrients.water || 50)) || 100) : 1;
    return {
      calories: Math.round(item.nutrients.calories * scale),
      proteins: Number((item.nutrients.proteins * scale).toFixed(1)),
      fats: Number((item.nutrients.fats * scale).toFixed(1)),
      carbs: Number((item.nutrients.carbs * scale).toFixed(1)),
      sugars: Number((item.nutrients.sugars * scale).toFixed(1)),
      fiber: Number(((item.nutrients.fiber || 0) * scale).toFixed(1)),
      salt: Number(((item.nutrients.salt || 0) * scale).toFixed(2)),
      water: Number(((item.nutrients.water || mass * 0.6) * scale).toFixed(1))
    };
  }

  const id = item.itemId.toLowerCase();
  let ref: FoodNutrientRef = NUTRIENT_REFERENCE_PER_100G.beef;

  if (id.includes('pork') || id.includes('свинин')) ref = NUTRIENT_REFERENCE_PER_100G.pork;
  else if (id.includes('mutton') || id.includes('баран')) ref = NUTRIENT_REFERENCE_PER_100G.mutton;
  else if (id.includes('chicken') || id.includes('куриц') || id.includes('цыпл')) ref = NUTRIENT_REFERENCE_PER_100G.chicken;
  else if (id.includes('turkey') || id.includes('индейк')) ref = NUTRIENT_REFERENCE_PER_100G.turkey;
  else if (id.includes('duck') || id.includes('утк')) ref = NUTRIENT_REFERENCE_PER_100G.duck;
  else if (id.includes('salmon') || id.includes('лосос') || id.includes('форел')) ref = NUTRIENT_REFERENCE_PER_100G.salmon;
  else if (id.includes('fish') || id.includes('рыб') || id.includes('pike') || id.includes('perch')) ref = NUTRIENT_REFERENCE_PER_100G.perch;
  else if (id.includes('shrimp') || id.includes('кревет')) ref = NUTRIENT_REFERENCE_PER_100G.shrimp;
  else if (id.includes('potato') || id.includes('картоф')) ref = NUTRIENT_REFERENCE_PER_100G.potato;
  else if (id.includes('onion') || id.includes('лук')) ref = NUTRIENT_REFERENCE_PER_100G.onion;
  else if (id.includes('garlic') || id.includes('чеснок')) ref = NUTRIENT_REFERENCE_PER_100G.garlic;
  else if (id.includes('carrot') || id.includes('морков')) ref = NUTRIENT_REFERENCE_PER_100G.carrot;
  else if (id.includes('tomato') || id.includes('томат') || id.includes('помидор')) ref = NUTRIENT_REFERENCE_PER_100G.tomato;
  else if (id.includes('cucumber') || id.includes('огурец')) ref = NUTRIENT_REFERENCE_PER_100G.cucumber;
  else if (id.includes('cabbage') || id.includes('капуст')) ref = NUTRIENT_REFERENCE_PER_100G.cabbage;
  else if (id.includes('beet') || id.includes('свекл')) ref = NUTRIENT_REFERENCE_PER_100G.beetroot;
  else if (id.includes('pepper') || id.includes('перец')) ref = NUTRIENT_REFERENCE_PER_100G.bell_pepper;
  else if (id.includes('mushroom') || id.includes('гриб')) ref = NUTRIENT_REFERENCE_PER_100G.mushroom;
  else if (id.includes('rice') || id.includes('рис')) ref = NUTRIENT_REFERENCE_PER_100G.rice;
  else if (id.includes('pasta') || id.includes('макарон')) ref = NUTRIENT_REFERENCE_PER_100G.pasta;
  else if (id.includes('bread') || id.includes('хлеб') || id.includes('булк') || id.includes('батон')) ref = NUTRIENT_REFERENCE_PER_100G.bread;
  else if (id.includes('egg') || id.includes('яйц')) ref = NUTRIENT_REFERENCE_PER_100G.egg;
  else if (id.includes('cheese') || id.includes('сыр')) ref = NUTRIENT_REFERENCE_PER_100G.cheese;
  else if (id.includes('butter') || id.includes('масло_слив')) ref = NUTRIENT_REFERENCE_PER_100G.butter;
  else if (id.includes('oil') || id.includes('масло')) ref = NUTRIENT_REFERENCE_PER_100G.sunflower_oil;
  else if (id.includes('sugar') || id.includes('сахар')) ref = NUTRIENT_REFERENCE_PER_100G.sugar;
  else if (id.includes('salt') || id.includes('соль')) ref = NUTRIENT_REFERENCE_PER_100G.salt;

  return {
    calories: Math.round(ref.kcal * factor),
    proteins: Number((ref.p * factor).toFixed(1)),
    fats: Number((ref.f * factor).toFixed(1)),
    carbs: Number((ref.c * factor).toFixed(1)),
    sugars: Number((ref.sugar * factor).toFixed(1)),
    fiber: Number((ref.fiber * factor).toFixed(1)),
    salt: Number((ref.salt * factor).toFixed(2)),
    water: Number((ref.water * factor).toFixed(1))
  };
}

/**
 * Creates Stove vessel state (burner with or without placed physical cookware)
 */
export function createStoveCookwareVessel(placedCookwareItem?: InventoryItem): CookwareVessel {
  let vesselType: 'surface' | 'pan' | 'pot' | 'kettle' | 'bowl' = 'surface';
  let nameRu = 'Пустая конфорка плиты (посуда не поставлена)';
  let capacityMl = 0;

  if (placedCookwareItem) {
    if (placedCookwareItem.itemId.startsWith('kitchen_pan_')) {
      vesselType = 'pan';
      capacityMl = 2500;
      nameRu = placedCookwareItem.nameRu;
    } else if (placedCookwareItem.itemId.startsWith('kitchen_pot_')) {
      vesselType = 'pot';
      capacityMl = 4500;
      nameRu = placedCookwareItem.nameRu;
    } else if (placedCookwareItem.itemId.startsWith('kitchen_kettle_')) {
      vesselType = 'kettle';
      capacityMl = 2200;
      nameRu = placedCookwareItem.nameRu;
    } else if (placedCookwareItem.itemId.includes('bowl')) {
      vesselType = 'bowl';
      capacityMl = 2000;
      nameRu = placedCookwareItem.nameRu;
    }
  }

  return {
    id: `stove_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    vesselType,
    nameRu,
    sourceItem: placedCookwareItem,
    hasBurner: true,
    capacityMl,
    temperature: 20.0,
    heatSourcePower: 0,
    hasLid: false,
    ingredients: [],
    liquids: [],
    smokeIntensity: 0.0,
    isFlaming: false,
    saltGrams: 0,
    seasoningNotes: []
  };
}

/**
 * Creates Countertop / Table preparation surface (NO BURNERS!)
 */
export function createCountertopVessel(nameRu: string = 'Кухонная столешница / Разделочная зона'): CookwareVessel {
  return {
    id: `counter_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    vesselType: 'surface',
    nameRu,
    hasBurner: false,
    capacityMl: 5000,
    temperature: 20.0,
    heatSourcePower: 0,
    hasLid: false,
    ingredients: [],
    liquids: [],
    smokeIntensity: 0.0,
    isFlaming: false,
    saltGrams: 0,
    seasoningNotes: []
  };
}

/**
 * Converts InventoryItem to a CulinaryIngredient
 */
export function itemToCulinaryIngredient(item: InventoryItem): CulinaryIngredient {
  const catDef = COOKING_INGREDIENTS_CATALOG[item.itemId];
  const massGrams = Math.max(20, Math.round((item.weight || 0.25) * 1000));
  const nutrients = inferNutrientsFromItem(item, massGrams);

  const isMinced = item.itemId.includes('minced') || item.itemId.includes('фарш');
  const cutLevel = isMinced ? 2 : 0;
  const cutPieces = isMinced ? 50 : 1;

  const bioState: BiochemicalState = {
    denaturation: item.culinaryData?.denaturation ?? (item.itemId.includes('raw') ? 0.0 : (isMinced ? 0.0 : 0.05)),
    maillard: item.culinaryData?.maillard ?? 0.0,
    charring: item.culinaryData?.charring ?? 0.0,
    hydrolysis: item.culinaryData?.hydrolysis ?? 0.0,
    cutLevel,
    cutPieces,
    surfaceAreaMult: isMinced ? 2.8 : 1.0,
    isStirredRecently: false
  };

  return {
    id: `ing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sourceItemId: item.itemId,
    name: item.name,
    nameRu: catDef?.nameRu || item.nameRu,
    massGrams,
    initialMassGrams: massGrams,
    nutrients,
    bioState,
    surfaceTemp: item.surfaceTemperature ?? item.temperature ?? 18.0,
    coreTemp: item.temperature ?? 18.0,
    icon: item.icon || ''
  };
}

/**
 * Direct tactile action: Cutting / Slicing an ingredient (Requires Knife!)
 */
export function cutIngredientAction(
  ing: CulinaryIngredient,
  hasKnife: boolean
): { success: boolean; message: string } {
  if (!hasKnife) {
    return {
      success: false,
      message: 'У вас нет ножа! Для нарезки нужен кухонный нож шеф-повара или складной нож в инвентаре.'
    };
  }

  if (ing.bioState.cutLevel >= 2) {
    return {
      success: false,
      message: `«${ing.nameRu}» уже порублено(а) в мелкий фарш/пюре. Дальше резать некуда.`
    };
  }

  if (ing.bioState.cutLevel === 0) {
    ing.bioState.cutLevel = 1;
    ing.bioState.cutPieces = Math.max(6, Math.round(ing.massGrams / 35));
    ing.bioState.surfaceAreaMult = 1.9;
    return {
      success: true,
      message: `Острым лезвием ножа кусок нарезан на аккуратные ломти: «${ing.nameRu}».`
    };
  } else {
    ing.bioState.cutLevel = 2;
    ing.bioState.cutPieces = Math.max(25, Math.round(ing.massGrams / 8));
    ing.bioState.surfaceAreaMult = 2.9;
    return {
      success: true,
      message: `Ножом мелко порублено: «${ing.nameRu}» превратилась в рубленую массу.`
    };
  }
}

/**
 * Direct tactile action: Stirring / flipping with spatula
 */
export function stirVesselAction(vessel: CookwareVessel): string {
  if (vessel.ingredients.length === 0) {
    return 'В посуде пусто — перемешивать нечего.';
  }

  for (const ing of vessel.ingredients) {
    ing.bioState.isStirredRecently = true;
    const avg = (ing.surfaceTemp * 2 + ing.coreTemp) / 3;
    ing.surfaceTemp = avg;
    ing.coreTemp = (ing.coreTemp * 2 + avg) / 3;
  }

  vessel.smokeIntensity = Math.max(0, vessel.smokeIntensity - 0.2);
  return 'Лопаткой перевернуты куски со дна: жар перераспределен, прилипание устранено.';
}

/**
 * Direct tactile action: Add seasoning from real salt shaker or spice item
 */
export function addRealSeasoningAction(
  vessel: CookwareVessel,
  seasoningItemName: string,
  isSalt: boolean
): string {
  vessel.seasoningNotes.push(seasoningItemName);

  if (isSalt) {
    vessel.saltGrams += 3.5;
    for (const ing of vessel.ingredients) {
      ing.nutrients.salt += 0.7;
    }
    return `Посолено из солонки: «${seasoningItemName}».`;
  }

  return `Добавлена приправа: «${seasoningItemName}».`;
}

/**
 * Direct tactile action: Pour real liquid from carried container
 */
export function pourRealLiquidToVessel(
  vessel: CookwareVessel,
  liquidId: string,
  liquidNameRu: string,
  volumeMl: number
): void {
  const isOil = isOilOrFatItem(liquidId);
  const smokePt = isOil ? 210 : 100;

  const existing = vessel.liquids.find(l => l.liquidId === liquidId);
  if (existing) {
    existing.volumeMl += volumeMl;
  } else {
    vessel.liquids.push({
      liquidId,
      nameRu: liquidNameRu,
      volumeMl,
      temperature: 20.0,
      isFatOrOil: isOil,
      smokePointTemp: smokePt
    });
  }
}

/**
 * FIRST-PRINCIPLES SIMULATION TICK
 */
export function simulateCookwareTick(
  vessel: CookwareVessel,
  dtSeconds: number,
  ambientTemp: number = 22.0
): void {
  if (dtSeconds <= 0) return;

  // Stoves heat up according to burner power. Tables/counters ALWAYS cool to ambient!
  if (vessel.hasBurner && vessel.vesselType !== 'surface') {
    const burnerTargetTemps = [ambientTemp, 55.0, 85.0, 105.0, 155.0, 195.0, 265.0];
    const targetBurnerTemp = burnerTargetTemps[vessel.heatSourcePower] ?? ambientTemp;
    const thermalInertia = vessel.vesselType === 'pot' ? 0.08 : 0.15;

    if (vessel.heatSourcePower > 0) {
      vessel.temperature += (targetBurnerTemp - vessel.temperature) * thermalInertia * dtSeconds;
    } else {
      vessel.temperature += (ambientTemp - vessel.temperature) * 0.04 * dtSeconds;
    }
  } else {
    // No burner: surface naturally settles to ambient room temperature
    vessel.temperature += (ambientTemp - vessel.temperature) * 0.08 * dtSeconds;
    vessel.heatSourcePower = 0;
  }

  // Liquid Phase
  let totalWaterVolumeMl = 0;
  let totalOilVolumeMl = 0;

  for (const liq of vessel.liquids) {
    if (liq.isFatOrOil) {
      totalOilVolumeMl += liq.volumeMl;
      liq.temperature += (vessel.temperature - liq.temperature) * 0.3 * dtSeconds;
    } else {
      totalWaterVolumeMl += liq.volumeMl;
      const maxWaterT = 100.0;
      if (liq.temperature < maxWaterT) {
        liq.temperature += (vessel.temperature - liq.temperature) * 0.25 * dtSeconds;
        liq.temperature = Math.min(maxWaterT, liq.temperature);
      } else {
        liq.temperature = maxWaterT;
        if (vessel.temperature > 100.0) {
          const excessHeat = vessel.temperature - 100.0;
          const boilRate = (excessHeat * 0.45 * (vessel.hasLid ? 0.12 : 1.0)) * dtSeconds;
          liq.volumeMl = Math.max(0, liq.volumeMl - boilRate);
        }
      }
    }
  }

  vessel.liquids = vessel.liquids.filter(l => l.volumeMl > 0.5);

  const isWetSubmerged = totalWaterVolumeMl > 15;
  const isOilFrying = !isWetSubmerged && totalOilVolumeMl > 5;

  let maxSmoke = 0.0;
  let hasActivePyrolysis = false;

  for (const ing of vessel.ingredients) {
    const area = ing.bioState.surfaceAreaMult;

    let mediumTemp = vessel.temperature;
    if (isWetSubmerged) {
      mediumTemp = Math.min(100.0, vessel.temperature);
    } else if (isOilFrying) {
      mediumTemp = Math.min(vessel.temperature, 215.0);
    }

    const surfaceConductivity = (isOilFrying ? 0.35 : (isWetSubmerged ? 0.25 : 0.20)) * area;
    ing.surfaceTemp += (mediumTemp - ing.surfaceTemp) * surfaceConductivity * dtSeconds;

    const internalDiffusion = 0.10 * area;
    ing.coreTemp += (ing.surfaceTemp - ing.coreTemp) * internalDiffusion * dtSeconds;

    // A. Denaturation (52-80°C)
    if (ing.coreTemp >= 52.0 && ing.bioState.denaturation < 1.0) {
      const denatRate = Math.min(1.0, (ing.coreTemp - 50.0) / 25.0) * 0.08 * dtSeconds;
      ing.bioState.denaturation = Math.min(1.0, ing.bioState.denaturation + denatRate);
    } else if (ing.coreTemp >= 82.0 && ing.bioState.denaturation >= 1.0) {
      ing.bioState.denaturation = Math.min(1.6, ing.bioState.denaturation + 0.015 * dtSeconds);
    }

    // B. Maillard Reaction (>= 135°C without deep water)
    if (!isWetSubmerged && ing.surfaceTemp >= 135.0 && ing.bioState.charring < 0.6) {
      const maillardIntensity = Math.min(1.0, (ing.surfaceTemp - 130.0) / 45.0);
      const rate = maillardIntensity * (isOilFrying ? 0.05 : 0.035) * dtSeconds;
      ing.bioState.maillard = Math.min(1.0, ing.bioState.maillard + rate);
    }

    // C. Hydrolysis / Tenderness in liquid
    if (isWetSubmerged && ing.coreTemp >= 80.0) {
      const tenderRate = 0.02 * (vessel.hasLid ? 1.4 : 1.0) * dtSeconds;
      ing.bioState.hydrolysis = Math.min(1.5, ing.bioState.hydrolysis + tenderRate);
    }

    // D. Pyrolysis / Charring (>= 185-205°C)
    const isStationaryBottom = !ing.bioState.isStirredRecently;
    const charThreshold = isOilFrying ? 205.0 : 185.0;

    if (!isWetSubmerged && ing.surfaceTemp >= charThreshold) {
      const excessCharHeat = ing.surfaceTemp - charThreshold;
      const stirDefense = isStationaryBottom ? 1.8 : 0.4;
      const charRate = (excessCharHeat / 60.0) * 0.06 * stirDefense * dtSeconds;

      ing.bioState.charring = Math.min(1.0, ing.bioState.charring + charRate);
      hasActivePyrolysis = true;

      ing.nutrients.water = Math.max(0, ing.nutrients.water - charRate * 25);
      ing.nutrients.calories = Math.max(10, ing.nutrients.calories - charRate * 15);

      const smokeFromIng = Math.min(1.0, (ing.bioState.charring * 0.7) + (excessCharHeat / 80.0));
      maxSmoke = Math.max(maxSmoke, smokeFromIng);
    }

    if (ing.bioState.isStirredRecently) {
      ing.bioState.isStirredRecently = false;
    }
  }

  if (hasActivePyrolysis) {
    vessel.smokeIntensity = Math.min(1.0, vessel.smokeIntensity + maxSmoke * 0.2 * dtSeconds);
  } else {
    vessel.smokeIntensity = Math.max(0, vessel.smokeIntensity - 0.1 * dtSeconds);
  }

  if (totalOilVolumeMl > 0 && vessel.temperature >= 295.0 && vessel.heatSourcePower >= 5) {
    vessel.isFlaming = true;
    vessel.smokeIntensity = 1.0;
  } else if (vessel.temperature < 200.0) {
    vessel.isFlaming = false;
  }
}

/**
 * Diegetic Sensory Visual Description of an ingredient
 */
export function getVisualAppearanceDescription(ing: CulinaryIngredient): string {
  const isCut = ing.bioState.cutLevel;
  const cutText = isCut === 0 ? 'Цельный кусок' : (isCut === 1 ? 'Нарезанные ломтики' : 'Рубленая масса');

  const char = ing.bioState.charring;
  const maillard = ing.bioState.maillard;
  const denat = ing.bioState.denaturation;

  let stateText = 'сырое';
  if (char >= 0.5) stateText = 'черный обугленный нагар (горький уголь)';
  else if (char >= 0.2) stateText = 'потемневшие пригоревшие края';
  else if (maillard >= 0.35) stateText = 'золотисто-румяная зажаристая корочка';
  else if (denat >= 0.6) stateText = 'схватившийся серый срез (сварено)';
  else if (denat >= 0.25) stateText = 'начало белеть от жара';
  else stateText = 'сырой бледно-розовый срез';

  return `${cutText}: ${stateText}`;
}

/**
 * Diegetic Sensory Sound, Surface & Atmosphere Descriptors
 */
export function getSensoryObservations(vessel: CookwareVessel): {
  soundText: string;
  panSurfaceText: string;
  smokeText: string;
} {
  const hasOil = vessel.liquids.some(l => l.isFatOrOil);
  const hasWater = vessel.liquids.some(l => !l.isFatOrOil);
  const hasItems = vessel.ingredients.length > 0;

  let soundText = 'Тишина';
  let panSurfaceText = vessel.vesselType === 'surface' ? 'Сухая чистая столешница' : 'Сухое чистое дно';
  let smokeText = 'Воздух чистый, запаха нет';

  if (!vessel.hasBurner || vessel.heatSourcePower === 0) {
    if (vessel.temperature > 50) {
      soundText = 'Тихое остывание металла';
      panSurfaceText = 'Посуда горячая на ощупь, медленно остывает';
    }
  } else {
    if (vessel.temperature > 80 && hasWater) {
      if (vessel.temperature >= 100) {
        soundText = 'Бурное кипение ключом, рокот воды';
        panSurfaceText = 'Вода кипит и бурлит, клубы белого пара';
      } else {
        soundText = 'Редкое глухое бульканье со дна';
        panSurfaceText = 'Вода согрелась, поднимаются первые пузырьки';
      }
    } else if (vessel.temperature >= 130 && hasOil) {
      if (vessel.temperature >= 170) {
        soundText = 'Яростное шкворчание и треск раскаленного масла';
        panSurfaceText = 'Масло мерцает рябью, брызги жира шипят';
      } else {
        soundText = 'Ровное шипение сока на масле';
        panSurfaceText = 'Масло прогрелось, медленно шкворчит';
      }
    } else if (vessel.temperature >= 180 && !hasWater && !hasOil && hasItems) {
      soundText = 'Сухой треск и шкворчание пригара';
      panSurfaceText = 'Дно раскалено, сухой контакт с металлом';
    } else if (vessel.temperature >= 100) {
      soundText = 'Гул разогретого металла';
      panSurfaceText = 'Сухое дно раскаляется от пламени конфорки';
    }

    if (vessel.smokeIntensity > 0.6) {
      smokeText = 'Густой сизый дым! Едкий чад режет глаза и першит в горле';
    } else if (vessel.smokeIntensity > 0.25) {
      smokeText = 'Тонкая струйка серого дымка, запах пригара';
    } else if (hasWater && vessel.temperature >= 95) {
      smokeText = 'Клубится влажный белый пар';
    } else if (hasItems && vessel.temperature > 120) {
      smokeText = 'Аппетитный аромат поджаристой еды';
    }
  }

  return { soundText, panSurfaceText, smokeText };
}

/**
 * Creates a finished, dynamic composite dish item from cookware contents
 */
export function finishCookwareToInventoryItem(
  vessel: CookwareVessel,
  platingItem?: InventoryItem
): InventoryItem | null {
  if (vessel.ingredients.length === 0 && vessel.liquids.length === 0) {
    return null;
  }

  let totalKcal = 0;
  let totalP = 0;
  let totalF = 0;
  let totalC = 0;
  let totalSugar = 0;
  let totalFiber = 0;
  let totalSalt = vessel.saltGrams;
  let totalWater = 0;
  let totalMassGrams = 0;

  let sumDenat = 0;
  let sumMaillard = 0;
  let sumChar = 0;
  let sumHydrolysis = 0;

  const namesList: string[] = [];

  for (const ing of vessel.ingredients) {
    totalKcal += ing.nutrients.calories;
    totalP += ing.nutrients.proteins;
    totalF += ing.nutrients.fats;
    totalC += ing.nutrients.carbs;
    totalSugar += ing.nutrients.sugars;
    totalFiber += ing.nutrients.fiber;
    totalSalt += ing.nutrients.salt;
    totalWater += ing.nutrients.water;
    totalMassGrams += ing.massGrams;

    sumDenat += ing.bioState.denaturation;
    sumMaillard += ing.bioState.maillard;
    sumChar += ing.bioState.charring;
    sumHydrolysis += ing.bioState.hydrolysis;

    namesList.push(ing.nameRu);
  }

  for (const liq of vessel.liquids) {
    totalMassGrams += liq.volumeMl;
    if (liq.isFatOrOil) {
      totalF += (liq.volumeMl * 0.9);
      totalKcal += Math.round(liq.volumeMl * 8.5);
    } else {
      totalWater += liq.volumeMl;
    }
  }

  const ingCount = Math.max(1, vessel.ingredients.length);
  const avgDenat = sumDenat / ingCount;
  const avgMaillard = sumMaillard / ingCount;
  const avgChar = sumChar / ingCount;
  const avgHydrolysis = sumHydrolysis / ingCount;

  const isCharred = avgChar >= 0.35;
  const isSoup = totalWater > 200 && vessel.vesselType === 'pot';
  const isFried = avgMaillard >= 0.3 && !isSoup;
  const isRaw = avgDenat < 0.45;

  let mainBaseName = 'Блюдо';
  const hasMeat = namesList.some(n => n.includes('Говядина') || n.includes('Свинина') || n.includes('мяс') || n.includes('фарш'));
  const hasPoultry = namesList.some(n => n.includes('Куриц') || n.includes('цыпл') || n.includes('Индейк'));
  const hasFish = namesList.some(n => n.includes('Рыб') || n.includes('Лосос') || n.includes('Окунь'));
  const hasPotato = namesList.some(n => n.includes('Картоф'));

  if (isSoup) {
    if (hasMeat) mainBaseName = 'Наваристый мясной суп';
    else if (hasFish) mainBaseName = 'Рыбная уха';
    else if (hasPoultry) mainBaseName = 'Куриный бульон с заправкой';
    else mainBaseName = 'Домашняя овощная похлебка';
  } else if (isFried) {
    if (hasMeat && hasPotato) mainBaseName = 'Жареное мясо с картофелем';
    else if (hasMeat) mainBaseName = 'Жареное румяное мясо';
    else if (hasPoultry) mainBaseName = 'Поджаристое куриное филе';
    else if (hasFish) mainBaseName = 'Жареная рыба с корочкой';
    else if (hasPotato) mainBaseName = 'Жареный хрустящий картофель';
    else mainBaseName = 'Жареная смесь ингредиентов';
  } else if (avgHydrolysis >= 0.6) {
    mainBaseName = hasMeat ? 'Мясное рагу долгого томления' : 'Тушеные овощи в собственном соку';
  } else if (isRaw) {
    mainBaseName = 'Сырая заготовка / Тартар';
  } else {
    mainBaseName = 'Приготовленное домашнее блюдо';
  }

  if (avgChar >= 0.65) {
    mainBaseName = `Обуглившийся ${mainBaseName.toLowerCase()}`;
  } else if (avgChar >= 0.35) {
    mainBaseName = `Подгоревший(-ая) ${mainBaseName.toLowerCase()}`;
  } else if (avgMaillard >= 0.6 && avgChar < 0.15) {
    mainBaseName = `Золотистый(-ая) ${mainBaseName.toLowerCase()}`;
  }

  const tasteNotes: string[] = [];
  if (isCharred) {
    tasteNotes.push('Едкая горечь пригоревшего нагара...');
    tasteNotes.push('Хрустят черные обугленные кусочки...');
  } else if (isFried) {
    tasteNotes.push('Аппетитная зажаристая корочка...');
    tasteNotes.push('Насыщенный мясной аромат реакции Майяра...');
  } else if (isSoup) {
    tasteNotes.push('Горячий наваристый бульон согревает...');
    tasteNotes.push('Мягкие разваренные ингредиенты тают во рту...');
  }
  if (totalSalt > 8.0) {
    tasteNotes.push('Сильный пересол! Язык вяжет от соли...');
  } else if (totalSalt < 1.0) {
    tasteNotes.push('Пресный вкус, не хватает соли...');
  }

  const totalWeightKg = Number((totalMassGrams / 1000).toFixed(2));
  const portions = Math.max(3, Math.min(20, Math.round(totalMassGrams / 70)));

  let hpEffect = 5;
  if (avgChar >= 0.5) hpEffect = -12;
  else if (isRaw && (hasMeat || hasPoultry)) hpEffect = -15;
  else if (avgDenat >= 0.8 && avgChar < 0.25) hpEffect = 18;

  const hungerEffect = Math.min(100, Math.round(totalKcal / 7));
  const thirstEffect = isSoup ? 45 : (totalSalt > 6.0 ? -25 : -5);

  const containerSuffix = platingItem ? ` (на ${platingItem.nameRu.toLowerCase()})` : '';

  const dishItem: InventoryItem = {
    id: `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    itemId: 'custom_cooked_dish',
    name: `${mainBaseName}${containerSuffix}`,
    nameRu: `${mainBaseName}${containerSuffix}`,
    category: 'food',
    count: 1,
    maxStack: 1,
    icon: '',
    description: `Freshly prepared dish: ${namesList.join(', ')}.`,
    descriptionRu: `Свежеприготовленное блюдо на кухне. Содержит: ${namesList.slice(0, 4).join(', ')}${namesList.length > 4 ? ' и др.' : ''}.`,
    effects: {
      health: hpEffect,
      hunger: hungerEffect,
      thirst: thirstEffect,
      energy: Math.min(60, Math.round(totalKcal / 18))
    },
    weight: totalWeightKg,
    volume: Number((totalWeightKg * 1.1).toFixed(2)),
    usable: true,
    portions,
    maxPortions: portions,
    temperature: Math.round(vessel.temperature),
    surfaceTemperature: Math.round(vessel.temperature * 0.85),
    nutrients: {
      calories: Math.round(totalKcal),
      proteins: Number(totalP.toFixed(1)),
      fats: Number(totalF.toFixed(1)),
      carbs: Number(totalC.toFixed(1)),
      sugars: Number(totalSugar.toFixed(1)),
      fiber: Number(totalFiber.toFixed(1)),
      salt: Number(totalSalt.toFixed(2)),
      water: Number(totalWater.toFixed(1))
    },
    culinaryData: {
      isPreparedDish: true,
      dishType: isCharred ? 'burnt_mess' : (isSoup ? 'soup' : (isFried ? 'fried' : 'stew')),
      denaturation: Number(avgDenat.toFixed(2)),
      maillard: Number(avgMaillard.toFixed(2)),
      charring: Number(avgChar.toFixed(2)),
      hydrolysis: Number(avgHydrolysis.toFixed(2)),
      ingredientsCount: vessel.ingredients.length,
      ingredientsList: namesList,
      tasteNotes
    }
  };

  return dishItem;
}

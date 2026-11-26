import { InventoryItem } from './types';
import {
  LIQUID_REGISTRY,
  LiquidId,
  FluidContainerState,
  FluidMixComponent,
  FluidSubstanceAttributes,
  CONTAINER_CONFIGS,
  getContainerConfig,
  syncItemContainerProperties,
  isFluidContainerClosed,
  ensureHybridContainerProps,
  getContainerFreeVolumeMl,
  getContainerSolidVolumeMl,
  getContainerCapacityBreakdown,
  updateHybridContainerInteraction,
  isFluidStorageDryForm,
} from './liquidSystem';
import { isRegisteredItemId, createItem, createProduceItem, canItemFitInContainer, getItemTotalWeight, resolveCanonicalSubstanceId } from './items';
import { computeKnifeCutForProduce, computeBranchPluck, PRODUCE_SPECIES_SPECS } from './produceData';
import { isCuttableMeatItem, computeKnifeCutForMeat } from './meatData';
import {
  applyDoughAttributesToItem,
  buildFillingEntryFromItem,
  cutDoughWithKnife,
  getDoughShapeSpecForSlot,
  getFluidDoughProfile,
  getSolidDoughProfile,
  isOpenReceivableShape,
  isRollingPinItem,
  rollDoughWithPin,
  shapeDoughBySlot,
  synthesizeDoughAttributes,
} from './doughData';
import { DoughFillingEntry, DoughIngredientEntry } from './types';

function recalculateContainerWeight(container: InventoryItem): void {
  if (!container.isContainer) return;
  // Base weight is preserved; getItemTotalWeight computes base + contents weight dynamically
  getItemTotalWeight(container);
}

export type InteractionSlotGrid4 = [
  InventoryItem | null,
  InventoryItem | null,
  InventoryItem | null,
  InventoryItem | null
];

export type InteractionCategory =
  | 'all'
  | 'pouring'
  | 'mixing'
  | 'cooking'
  | 'workshop'
  | 'medical';

export interface InteractionRecipeIngredient {
  /** Allowed item catalog IDs (`item.itemId` or `item.originalCatalogId`) */
  itemIds?: string[];
  /** Optional liquid ID if checking container fluid */
  liquidIds?: string[];
  /** Minimum ml required if liquid container */
  minMl?: number;
  /** Human-readable name for the recipe table */
  label: string;
  /** Whether this item is a reusable tool (returned to output unconsumed) */
  isTool?: boolean;
  /** Optional placement hint: 'top' | 'bottom' | 'any' */
  rowHint?: 'top' | 'bottom' | 'any';
}

export interface InteractionCraftRecipe {
  id: string;
  title: string;
  category: Exclude<InteractionCategory, 'all'>;
  description: string;
  actionLabel: string;
  ingredients: InteractionRecipeIngredient[];
  resultsSummary: string[];
  /** Optional custom matcher & generator for special recipes */
  matchAndPreview?: (inputs: InteractionSlotGrid4) => InteractionEvaluationResult | null;
}

export interface InteractionTransferDetail {
  fromSlot: number;
  toSlot: number;
  sourceName: string;
  targetName: string;
  transferredAmountLabel: string;
  remainingSourceLabel: string;
  resultingTargetLabel: string;
  isMixture?: boolean;
  mixtureName?: string;
  mixtureColor?: string;
  dosagePct?: number;
  isApproximate?: boolean;
}

export interface InteractionEvalOptions {
  /** When true (at commit/execution time), applies realistic human hand-pour imprecision to partial-dosage pours. */
  applyPourJitter?: boolean;
}

export interface InteractionEvaluationResult {
  isValid: boolean;
  kind: 'none' | 'pour_liquid' | 'mix_liquid' | 'transfer_items' | 'craft_recipe';
  title: string;
  subtitle: string;
  actionLabel: string;
  previewOutputs: InteractionSlotGrid4;
  transferDetails: InteractionTransferDetail[];
  matchedRecipeId?: string;
}

/**
 * Returns the nominal pour dosage fraction in (0, 1] based on source slot index.
 * Top-left slot (0) always pours 100% (everything that fits).
 * Each subsequent slot left-to-right, top-to-bottom down to the penultimate row rightmost slot steps down evenly.
 */
export function getSlotPourDosageFraction(slotIndex: number, gridSize: 4 | 16): number {
  const sourceSlotCount = gridSize === 16 ? 12 : 2;
  if (slotIndex <= 0) return 1.0;
  const clamped = Math.min(sourceSlotCount - 1, slotIndex);
  return (sourceSlotCount - clamped) / sourceSlotCount;
}

/**
 * Compact UI badge label for a source slot's nominal dosage ("Всё" for slot 0, "~92%".."~8%" for partial slots).
 */
export function getSlotPourDosageLabel(slotIndex: number, gridSize: 4 | 16): string | null {
  const sourceSlotCount = gridSize === 16 ? 12 : 2;
  if (slotIndex < 0 || slotIndex >= sourceSlotCount) return null;
  if (slotIndex === 0) return 'Всё';
  const pct = Math.round(getSlotPourDosageFraction(slotIndex, gridSize) * 100);
  return `~${pct}%`;
}

function computeDosedPourMl(
  maxPossibleMl: number,
  dosageFraction: number,
  applyJitter: boolean
): { amountMl: number; isApproximate: boolean } {
  if (maxPossibleMl <= 0) return { amountMl: 0, isApproximate: false };
  if (dosageFraction >= 0.999) {
    return { amountMl: maxPossibleMl, isApproximate: false };
  }

  const nominal = Math.max(1, Math.min(maxPossibleMl, Math.round(maxPossibleMl * dosageFraction)));
  if (!applyJitter) {
    return { amountMl: nominal, isApproximate: true };
  }

  // Organic human hand-pour imprecision: triangular noise (~ +/-13%) + small splash wobble
  const tri = Math.random() + Math.random() - 1;
  const relDelta = nominal * tri * 0.13;
  const splashDelta = (Math.random() * 2 - 1) * (maxPossibleMl <= 40 ? 1.8 : 3.5);
  let actual = Math.round(nominal + relDelta + splashDelta);

  // Avoid sterile exact multiples of 5 ml when eyeballing partial pours from larger vessels
  if (maxPossibleMl >= 25 && actual > 3 && actual < maxPossibleMl - 2 && actual % 5 === 0) {
    actual += Math.random() < 0.5 ? -1 : 1;
  }

  actual = Math.max(1, Math.min(maxPossibleMl, actual));
  if (maxPossibleMl - actual < 1) actual = maxPossibleMl;
  return { amountMl: actual, isApproximate: false };
}

/**
 * Legacy item <-> fluid container bridge so that ANY bottle, cup, can, canister, pot, mug, or sack
 * in the game can participate in top-to-bottom pouring and mixing even if it wasn't spawned with `fluidStorage`.
 */
interface LegacyContainerBridge {
  maxMl: number;
  emptyWeightKg: number;
  baseItemNameRu: string;
  isGranular?: boolean;
  emptyItemId: string;
  defaultLiquidId?: LiquidId;
  defaultCurrentMl?: number;
  defaultTemperatureC?: number;
}

const LEGACY_CONTAINER_BRIDGES: Record<string, LegacyContainerBridge> = {
  drinking_water: {
    maxMl: 500,
    emptyWeightKg: 0.03,
    baseItemNameRu: 'Пластиковая бутылка (0.5 л)',
    emptyItemId: 'bottle_empty',
    defaultLiquidId: 'water',
    defaultCurrentMl: 500,
    defaultTemperatureC: 16,
  },
  water_bottle: {
    maxMl: 500,
    emptyWeightKg: 0.03,
    baseItemNameRu: 'Пластиковая бутылка (0.5 л)',
    emptyItemId: 'bottle_empty',
    defaultLiquidId: 'water',
    defaultCurrentMl: 500,
    defaultTemperatureC: 16,
  },
  bottle_empty: {
    maxMl: 500,
    emptyWeightKg: 0.03,
    baseItemNameRu: 'Пластиковая бутылка (0.5 л)',
    emptyItemId: 'bottle_empty',
  },
  coffee: {
    maxMl: 250,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Стаканчик (0.25 л)',
    emptyItemId: 'cup_disposable',
    defaultLiquidId: 'coffee',
    defaultCurrentMl: 250,
    defaultTemperatureC: 72,
  },
  hot_coffee: {
    maxMl: 250,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Стаканчик (0.25 л)',
    emptyItemId: 'cup_disposable',
    defaultLiquidId: 'coffee',
    defaultCurrentMl: 250,
    defaultTemperatureC: 72,
  },
  cup_disposable: {
    maxMl: 250,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Стаканчик (0.25 л)',
    emptyItemId: 'cup_disposable',
  },
  cola: {
    maxMl: 330,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Алюминиевая банка (0.33 л)',
    emptyItemId: 'can_empty',
    defaultLiquidId: 'cola',
    defaultCurrentMl: 330,
    defaultTemperatureC: 10,
  },
  soda_can: {
    maxMl: 330,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Алюминиевая банка (0.33 л)',
    emptyItemId: 'can_empty',
    defaultLiquidId: 'cola',
    defaultCurrentMl: 330,
    defaultTemperatureC: 10,
  },
  can_empty: {
    maxMl: 330,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Алюминиевая банка (0.33 л)',
    emptyItemId: 'can_empty',
  },
  energy_drink: {
    maxMl: 330,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Банка из-под энергетика (0.33 л)',
    emptyItemId: 'energy_can_empty',
    defaultLiquidId: 'energy_drink',
    defaultCurrentMl: 330,
    defaultTemperatureC: 10,
  },
  energy_can_empty: {
    maxMl: 330,
    emptyWeightKg: 0.02,
    baseItemNameRu: 'Банка из-под энергетика (0.33 л)',
    emptyItemId: 'energy_can_empty',
  },
  fresh_juice: {
    maxMl: 500,
    emptyWeightKg: 0.04,
    baseItemNameRu: 'Пакет из-под сока (0.5 л)',
    emptyItemId: 'juice_box',
    defaultLiquidId: 'juice',
    defaultCurrentMl: 500,
    defaultTemperatureC: 12,
  },
  juice_box: {
    maxMl: 500,
    emptyWeightKg: 0.04,
    baseItemNameRu: 'Пакет из-под сока (0.5 л)',
    emptyItemId: 'juice_box',
  },
  camp_flask: {
    maxMl: 750,
    emptyWeightKg: 0.18,
    baseItemNameRu: 'Походная фляга (0.75 л)',
    emptyItemId: 'camp_flask_empty',
    defaultLiquidId: 'water',
    defaultCurrentMl: 750,
    defaultTemperatureC: 18,
  },
  camp_flask_empty: {
    maxMl: 750,
    emptyWeightKg: 0.18,
    baseItemNameRu: 'Походная фляга (0.75 л)',
    emptyItemId: 'camp_flask_empty',
  },
  bowl: {
    maxMl: 650,
    emptyWeightKg: 0.25,
    baseItemNameRu: 'Миска',
    emptyItemId: 'bowl',
  },
  plate: {
    maxMl: 450,
    emptyWeightKg: 0.38,
    baseItemNameRu: 'Тарелка',
    emptyItemId: 'plate',
  },
  gasoline_95: {
    maxMl: 20000,
    emptyWeightKg: 2.5,
    baseItemNameRu: 'Стальная канистра (20 л)',
    emptyItemId: 'canister_empty',
    defaultLiquidId: 'gasoline_95',
    defaultCurrentMl: 20000,
    defaultTemperatureC: 20,
  },
  fuel_canister: {
    maxMl: 20000,
    emptyWeightKg: 2.5,
    baseItemNameRu: 'Стальная канистра (20 л)',
    emptyItemId: 'canister_empty',
    defaultLiquidId: 'gasoline_92',
    defaultCurrentMl: 20000,
    defaultTemperatureC: 20,
  },
  canister_empty: {
    maxMl: 20000,
    emptyWeightKg: 2.5,
    baseItemNameRu: 'Стальная канистра (20 л)',
    emptyItemId: 'canister_empty',
  },
  sandbag: {
    maxMl: 1000,
    emptyWeightKg: 0.08,
    baseItemNameRu: 'Холщовый мешок (1 кг)',
    isGranular: true,
    emptyItemId: 'sack_empty',
    defaultLiquidId: 'sand',
    defaultCurrentMl: 1000,
    defaultTemperatureC: 20,
  },
  sack_empty: {
    maxMl: 1000,
    emptyWeightKg: 0.08,
    baseItemNameRu: 'Холщовый мешок (1 кг)',
    isGranular: true,
    emptyItemId: 'sack_empty',
  },
  mug: {
    maxMl: 350,
    emptyWeightKg: 0.28,
    baseItemNameRu: 'Кружка',
    emptyItemId: 'mug',
  },
  cup: {
    maxMl: 220,
    emptyWeightKg: 0.22,
    baseItemNameRu: 'Чашка',
    emptyItemId: 'cup',
  },
  pot: {
    maxMl: 3500,
    emptyWeightKg: 1.35,
    baseItemNameRu: 'Кастрюля',
    emptyItemId: 'pot',
  },
  saute_pan: {
    maxMl: 2400,
    emptyWeightKg: 1.15,
    baseItemNameRu: 'Сотейник',
    emptyItemId: 'saute_pan',
  },
  frying_pan: {
    maxMl: 1800,
    emptyWeightKg: 1.6,
    baseItemNameRu: 'Сковорода',
    emptyItemId: 'frying_pan',
  },
  kettle: {
    maxMl: 2200,
    emptyWeightKg: 1.15,
    baseItemNameRu: 'Чайник',
    emptyItemId: 'kettle',
  },
  tin_can_empty: {
    maxMl: 400,
    emptyWeightKg: 0.06,
    baseItemNameRu: 'Жестяная банка (0.4 л)',
    emptyItemId: 'tin_can_empty',
  },
  spoon: {
    maxMl: 20,
    emptyWeightKg: 0.06,
    baseItemNameRu: 'Ложка',
    emptyItemId: 'spoon',
  },
  kitchen_spoon_steel: {
    maxMl: 20,
    emptyWeightKg: 0.06,
    baseItemNameRu: 'Ложка',
    emptyItemId: 'spoon',
  },
  kitchen_spoon_wooden: {
    maxMl: 25,
    emptyWeightKg: 0.04,
    baseItemNameRu: 'Деревянная ложка',
    emptyItemId: 'spoon',
  },
};

interface NamedMixtureRule {
  id: string;
  liquids: [string, string];
  nameRu: string;
  colorHex: string;
  descriptionRu: string;
  resultLiquidId?: LiquidId;
  culinaryEquivalentId?: string;
  isHomemade?: boolean;
  bonusEffects?: {
    hunger?: number;
    thirst?: number;
    energy?: number;
    health?: number;
    sleepiness?: number;
    soothePanic?: number;
  };
}

export const NAMED_MIXTURE_RULES: NamedMixtureRule[] = [
  {
    id: 'mix_coffee_milk',
    liquids: ['coffee', 'milk'],
    nameRu: 'Кофе с молоком (Латте)',
    colorHex: '#8d6e63',
    descriptionRu: 'Мягкий бодрящий напиток из свежего кофе и молока. Снимает усталость и утоляет жажду.',
    bonusEffects: { energy: 8, thirst: 6, soothePanic: 5 },
  },
  {
    id: 'mix_coffee_cream',
    liquids: ['coffee', 'cream_heavy'],
    nameRu: 'Кофе со сливками (Раф)',
    colorHex: '#a1887f',
    descriptionRu: 'Питательный и густой кофе со сливками. Отлично согревает и бодрит.',
    bonusEffects: { energy: 10, hunger: 6, soothePanic: 6 },
  },
  {
    id: 'mix_coffee_condensed',
    liquids: ['coffee', 'condensed_milk'],
    nameRu: 'Кофе со сгущёнкой по-походному',
    colorHex: '#9c786c',
    descriptionRu: 'Сладкий и калорийный походный кофе со сгущённым молоком.',
    bonusEffects: { energy: 12, hunger: 10, soothePanic: 8 },
  },
  {
    id: 'mix_tea_honey',
    liquids: ['tea', 'honey'],
    nameRu: 'Чай с натуральным мёдом',
    colorHex: '#c87d28',
    descriptionRu: 'Целебный согревающий чай с цветочным мёдом. Укрепляет здоровье и успокаивает нервы.',
    bonusEffects: { health: 6, soothePanic: 10, thirst: 8 },
  },
  {
    id: 'mix_tea_jam',
    liquids: ['tea', 'jam'],
    nameRu: 'Чай с домашним вареньем',
    colorHex: '#9e2a3b',
    descriptionRu: 'Ароматный ягодный чай со сладким вареньем.',
    bonusEffects: { energy: 5, soothePanic: 8, thirst: 6 },
  },
  {
    id: 'mix_tea_sugar',
    liquids: ['tea', 'sugar'],
    nameRu: 'Сладкий крепкий чай',
    colorHex: '#a85d22',
    descriptionRu: 'Крепкий чай с сахаром — классическое средство для восстановления сил.',
    bonusEffects: { energy: 6, soothePanic: 5 },
  },
  {
    id: 'mix_water_jam',
    liquids: ['water', 'jam'],
    nameRu: 'Домашний ягодный морс',
    colorHex: '#b71c1c',
    descriptionRu: 'Освежающий напиток из чистой воды и ягодного варенья.',
    bonusEffects: { thirst: 10, energy: 4 },
  },
  {
    id: 'mix_water_honey',
    liquids: ['water', 'honey'],
    nameRu: 'Медовая сыта (вода с мёдом)',
    colorHex: '#eab308',
    descriptionRu: 'Традиционный тонизирующий напиток из воды и пчелиного мёда.',
    bonusEffects: { thirst: 8, health: 4, energy: 5 },
  },
  {
    id: 'mix_water_berries',
    liquids: ['water', 'berries'],
    nameRu: 'Настой из лесных ягод',
    colorHex: '#881337',
    descriptionRu: 'Витаминный ягодный настой на родниковой воде.',
    bonusEffects: { thirst: 8, health: 4 },
  },
  {
    id: 'mix_cola_vodka',
    liquids: ['cola', 'vodka'],
    nameRu: 'Коктейль «Водка-Кола»',
    colorHex: '#3e2723',
    descriptionRu: 'Сладкий газированный алкогольный коктейль. Быстро снимает панику, но кружит голову.',
    bonusEffects: { soothePanic: 15, energy: 4 },
  },
  {
    id: 'mix_juice_vodka',
    liquids: ['juice', 'vodka'],
    nameRu: 'Коктейль «Отвёртка»',
    colorHex: '#f59e0b',
    descriptionRu: 'Цитрусовый алкогольный коктейль из фруктового сока и водки.',
    bonusEffects: { soothePanic: 14, thirst: 5 },
  },
  {
    id: 'mix_beer_vodka',
    liquids: ['beer', 'vodka'],
    nameRu: 'Коктейль «Ёрш»',
    colorHex: '#d97706',
    descriptionRu: 'Убойная смесь светлого пива и водки. Мгновенно притупляет страх.',
    bonusEffects: { soothePanic: 22 },
  },
  {
    id: 'mix_gas92_oil',
    liquids: ['gasoline_92', 'motor_oil'],
    nameRu: 'Топливная смесь 2Т (АИ-92 + Масло)',
    colorHex: '#b45309',
    descriptionRu: 'Двухтактная бензомасляная топливная смесь для генераторов, бензопил и мототехники.',
  },
  {
    id: 'mix_gas95_oil',
    liquids: ['gasoline_95', 'motor_oil'],
    nameRu: 'Топливная смесь 2Т (АИ-95 + Масло)',
    colorHex: '#92400e',
    descriptionRu: 'Высокооктановая двухтактная бензомасляная топливная смесь.',
  },
  {
    id: 'mix_flour_water',
    liquids: ['flour', 'water'],
    nameRu: 'Пшеничное тесто / закваска',
    colorHex: '#f5f5dc',
    descriptionRu: 'Замешанное тесто из муки и воды, готовое к выпечке или жарке.',
    bonusEffects: { hunger: 12 },
  },
  {
    id: 'mix_flour_milk',
    liquids: ['flour', 'milk'],
    nameRu: 'Сдобное блинное тесто',
    colorHex: '#fef3c7',
    descriptionRu: 'Питательное тесто на молоке для блинов и оладий.',
    bonusEffects: { hunger: 16, soothePanic: 4 },
  },
  {
    id: 'mix_cottage_sourcream',
    liquids: ['cottage_cheese', 'sour_cream'],
    nameRu: 'Творог с деревенской сметаной',
    colorHex: '#fffbeb',
    descriptionRu: 'Сытное и полезное блюдо из домашнего творога со сметаной.',
    bonusEffects: { hunger: 15, health: 4 },
  },
  {
    id: 'mix_cottage_jam',
    liquids: ['cottage_cheese', 'jam'],
    nameRu: 'Творожный десерт с вареньем',
    colorHex: '#fbcfe8',
    descriptionRu: 'Сладкий творог с ягодным вареньем.',
    bonusEffects: { hunger: 14, soothePanic: 8 },
  },
  {
    id: 'mix_cottage_honey',
    liquids: ['cottage_cheese', 'honey'],
    nameRu: 'Творог с цветочным мёдом',
    colorHex: '#fef08a',
    descriptionRu: 'Калорийный завтрак из творога и натурального мёда.',
    bonusEffects: { hunger: 14, health: 5, soothePanic: 6 },
  },
  {
    id: 'mix_water_salt',
    liquids: ['water', 'salt'],
    nameRu: 'Солевой раствор (регидратация / промывание)',
    colorHex: '#e0f2fe',
    descriptionRu: 'Водно-солевой раствор для промывания и восполнения электролитов.',
    bonusEffects: { health: 4, thirst: 5 },
  },
  {
    id: 'mix_buckwheat_broth',
    liquids: ['buckwheat', 'broth_chicken'],
    nameRu: 'Гречневая каша на курином бульоне',
    colorHex: '#78350f',
    descriptionRu: 'Наваристая гречка, пропитанная горячим куриным бульоном.',
    bonusEffects: { hunger: 18, energy: 8, health: 4 },
  },
  {
    id: 'mix_rice_broth',
    liquids: ['rice', 'broth_beef'],
    nameRu: 'Рис на говяжьем бульоне',
    colorHex: '#a16207',
    descriptionRu: 'Сытный рис на крепком мясном бульоне.',
    bonusEffects: { hunger: 18, energy: 8 },
  },
  {
    id: 'mix_oil_vinegar_dressing',
    liquids: ['oil_culinary', 'vinegar'],
    nameRu: 'Домашняя салатная заправка (Винегрет)',
    colorHex: '#eab308',
    descriptionRu: 'Домашняя эмульсия из растительного масла и уксуса без промышленных стабилизаторов.',
    resultLiquidId: 'sauce',
    isHomemade: true,
    bonusEffects: { hunger: 10, health: 4 },
  },
  {
    id: 'mix_water_vinegar_marinade',
    liquids: ['water', 'vinegar'],
    nameRu: 'Домашний уксусный маринад (база)',
    colorHex: '#d9f99d',
    descriptionRu: 'Домашняя маринадная заливка на воде и уксусе. Добавьте соль, специи и овощи или грибы для солений.',
    bonusEffects: { thirst: -4 },
  },
  {
    id: 'mix_milk_sugar_base',
    liquids: ['milk', 'sugar'],
    nameRu: 'Сладкое молоко (база для домашней сгущёнки)',
    colorHex: '#fef9c3',
    descriptionRu: 'Молоко с сахаром. Поставьте кастрюлю на плиту и уварите — получится домашнее сгущённое молоко.',
    bonusEffects: { hunger: 12, energy: 10, soothePanic: 6 },
  },
  {
    id: 'mix_water_sugar_base',
    liquids: ['water', 'sugar'],
    nameRu: 'Сладкая вода (база для сиропа / варенья)',
    colorHex: '#fef08a',
    descriptionRu: 'Вода с растворённым сахаром. Уварите на плите для домашнего сиропа или добавьте ягоды для варенья.',
    bonusEffects: { energy: 8, thirst: 6 },
  },
  {
    id: 'mix_soy_sugar_teriyaki_base',
    liquids: ['sauce_soy', 'sugar'],
    nameRu: 'Соево-сахарная основа для Терияки',
    colorHex: '#451a03',
    descriptionRu: 'Соевый соус с сахаром. Прогрейте на плите (можно добавить имбирь и чеснок) — выйдет домашний Терияки.',
    bonusEffects: { hunger: 8, energy: 6 },
  },
  {
    id: 'mix_soy_honey_teriyaki_base',
    liquids: ['sauce_soy', 'honey'],
    nameRu: 'Соево-медовая основа для Терияки',
    colorHex: '#5c2606',
    descriptionRu: 'Соевый соус с натуральным мёдом. Уварите на плите до домашнего соуса Терияки.',
    bonusEffects: { hunger: 10, energy: 8 },
  },
];

function cloneInventoryItem(item: InventoryItem): InventoryItem {
  return JSON.parse(JSON.stringify(item));
}

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [isNaN(r) ? 128 : r, isNaN(g) ? 128 : g, isNaN(b) ? 128 : b];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [isNaN(r) ? 128 : r, isNaN(g) ? 128 : g, isNaN(b) ? 128 : b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function blendHexColors(hex1: string, weight1: number, hex2: string, weight2: number): string {
  const total = Math.max(1, weight1 + weight2);
  const [r1, g1, b1] = parseHexToRgb(hex1 || '#3b82f6');
  const [r2, g2, b2] = parseHexToRgb(hex2 || '#3b82f6');
  return rgbToHex(
    (r1 * weight1 + r2 * weight2) / total,
    (g1 * weight1 + g2 * weight2) / total,
    (b1 * weight1 + b2 * weight2) / total
  );
}

export interface EffectiveFluidWrapper {
  state: FluidContainerState;
  temperatureC: number;
  isOpened: boolean;
  isGranularContainer: boolean;
  isLegacyBridged: boolean;
  bridgeConfig?: LegacyContainerBridge;
}

/**
 * Extracts or synthesizes a `FluidContainerState` for any item that holds or can receive liquids/granular substances.
 */
export function getEffectiveFluidWrapper(item: InventoryItem | null): EffectiveFluidWrapper | null {
  if (!item) return null;
  if (!item.fluidStorage) {
    ensureHybridContainerProps(item);
  }

  if (item.fluidStorage) {
    const state: FluidContainerState = JSON.parse(JSON.stringify(item.fluidStorage));
    const closed = isFluidContainerClosed(item);
    const cfg = getContainerConfig(item.itemId);
    return {
      state,
      temperatureC: item.temperature ?? item.surfaceTemperature ?? 20,
      isOpened: !closed,
      isGranularContainer: Boolean(
        (cfg as any)?.isGranularOnly ||
          item.itemId.startsWith('sack_') ||
          item.itemId === 'sandbag' ||
          item.itemId === 'package_bag'
      ),
      isLegacyBridged: false,
    };
  }

  const key = item.originalCatalogId || item.itemId;
  const bridge = LEGACY_CONTAINER_BRIDGES[key] || LEGACY_CONTAINER_BRIDGES[item.itemId];
  if (!bridge) return null;

  const currentMl = bridge.defaultLiquidId ? (bridge.defaultCurrentMl ?? bridge.maxMl) : 0;
  return {
    state: {
      maxMl: bridge.maxMl,
      currentMl,
      liquidId: bridge.defaultLiquidId ?? null,
      emptyWeightKg: bridge.emptyWeightKg,
      baseItemNameRu: bridge.baseItemNameRu,
      baseItemNameEn: item.name,
    },
    temperatureC: item.temperature ?? bridge.defaultTemperatureC ?? 20,
    isOpened: true,
    isGranularContainer: Boolean(bridge.isGranular),
    isLegacyBridged: true,
    bridgeConfig: bridge,
  };
}

/**
 * Applies an updated `FluidContainerState` back onto an `InventoryItem`.
 */
export function applyEffectiveFluidToItem(
  originalItem: InventoryItem,
  nextState: FluidContainerState,
  nextTemperatureC?: number
): InventoryItem {
  const item = cloneInventoryItem(originalItem);
  const key = item.originalCatalogId || item.itemId;
  const bridge = LEGACY_CONTAINER_BRIDGES[key] || LEGACY_CONTAINER_BRIDGES[item.itemId];

  // Auto-open container in-place if it was a sealed variant
  const cfg = getContainerConfig(item.itemId);
  if (cfg?.requiresOpening) {
    item.isOpen = true;
    if (nextState.attributes) nextState.attributes.isOpened = true;
  }

  // Special case: empty sandbag becomes `sack_empty` if completely drained
  if (nextState.currentMl <= 0) {
    if (bridge && bridge.emptyItemId && bridge.emptyItemId !== item.itemId) {
      const emptyTemplate = createItem(bridge.emptyItemId, 1);
      if (emptyTemplate) {
        if (bridge.emptyItemId === 'sack_empty') {
          return emptyTemplate;
        }
        emptyTemplate.fluidStorage = {
          ...nextState,
          currentMl: 0,
          liquidId: null,
          attributes: undefined,
        };
        syncItemContainerProperties(emptyTemplate);
        return emptyTemplate;
      }
    }
  }

  // Special case: filling `sack_empty` with `sand` up to full capacity becomes `sandbag`
  if (
    item.itemId === 'sack_empty' &&
    nextState.liquidId === 'sand' &&
    nextState.currentMl >= 950 &&
    !nextState.attributes
  ) {
    const fullSandbag = createItem('sandbag', 1);
    if (fullSandbag) {
      return fullSandbag;
    }
  }

  item.fluidStorage = nextState;
  if (nextTemperatureC !== undefined) {
    item.temperature = nextTemperatureC;
    item.surfaceTemperature = nextTemperatureC;
  }
  syncItemContainerProperties(item);

  // If item wasn't in CONTAINER_CONFIGS (e.g. a kitchen mug or pot), ensure its Russian display name reflects the contents!
  if (!getContainerConfig(item.itemId)) {
    const baseName = nextState.baseItemNameRu || originalItem.nameRu;
    if (nextState.currentMl <= 0 || !nextState.liquidId) {
      item.nameRu = `${baseName} (Пусто)`;
      item.weight = nextState.emptyWeightKg || originalItem.weight || 0.25;
    } else {
      const liqSpec = LIQUID_REGISTRY[nextState.liquidId as LiquidId];
      const subName = nextState.attributes?.varietyRu || liqSpec?.nameRu || nextState.liquidId;
      const unit = isFluidStorageDryForm(nextState) ? 'г' : 'мл';
      item.nameRu = `${baseName}: ${subName} (${Math.round(nextState.currentMl)}/${nextState.maxMl} ${unit})`;
      const density = liqSpec?.densityKgPerL || 1.0;
      item.weight = Number(
        ((nextState.emptyWeightKg || 0.25) + (nextState.currentMl / 1000) * density).toFixed(3)
      );
      item.usable = true;
    }
  }

  return item;
}

function getSubstanceDisplayName(state: FluidContainerState): string {
  if (state.currentMl <= 0 || !state.liquidId) return 'Пусто';
  if (state.attributes?.varietyRu) {
    return state.attributes.varietyRu;
  }
  const spec = LIQUID_REGISTRY[state.liquidId as LiquidId];
  return spec ? spec.nameRu : state.liquidId;
}

function getSubstanceColor(state: FluidContainerState): string {
  if (state.attributes?.customColor) {
    return state.attributes.customColor;
  }
  const spec = state.liquidId ? LIQUID_REGISTRY[state.liquidId as LiquidId] : undefined;
  if (spec) {
    return spec.color;
  }
  return '#38bdf8';
}

function findNamedMixture(stateA: FluidContainerState, stateB: FluidContainerState): NamedMixtureRule | undefined {
  const keysA = [stateA.liquidId, stateA.attributes?.culinaryEquivalentId].filter(Boolean) as string[];
  const keysB = [stateB.liquidId, stateB.attributes?.culinaryEquivalentId].filter(Boolean) as string[];
  return NAMED_MIXTURE_RULES.find((r) =>
    keysA.some((a) =>
      keysB.some(
        (b) =>
          (r.liquids[0] === a && r.liquids[1] === b) ||
          (r.liquids[0] === b && r.liquids[1] === a)
      )
    )
  );
}

/**
 * Performs top-to-bottom pouring/mixing from `topItem` into `bottomItem`.
 * Returns `{ updatedTop, updatedBottom, detail }` or `null` if pouring is not possible.
 */
export function tryPourOrMixTopToBottom(
  topItem: InventoryItem,
  bottomItem: InventoryItem,
  fromSlot: number,
  toSlot: number,
  dosageFraction: number = 1.0,
  applyPourJitter: boolean = false
): {
  updatedTop: InventoryItem;
  updatedBottom: InventoryItem;
  detail: InteractionTransferDetail;
  isMixture: boolean;
} | null {
  const topWrap = getEffectiveFluidWrapper(topItem);
  const bottomWrap = getEffectiveFluidWrapper(bottomItem);
  if (!topWrap || !bottomWrap) return null;

  const topState = topWrap.state;
  const bottomState = bottomWrap.state;

  // Source must have content and not be a sealed tin can requiring an opener
  if (!topWrap.isOpened || topState.currentMl <= 0 || !topState.liquidId) {
    return null;
  }
  // Target must not be sealed
  if (!bottomWrap.isOpened) {
    return null;
  }

  // Respect shared unified capacity: solid items inside bottomItem occupy part of maxMl!
  const bottomSolidMl = getContainerSolidVolumeMl(bottomItem);
  const freeSpaceMl = Math.max(0, bottomState.maxMl - bottomState.currentMl - bottomSolidMl);
  if (freeSpaceMl <= 0) {
    return null;
  }

  const topSpec = LIQUID_REGISTRY[topState.liquidId as LiquidId];
  if (!topSpec) return null;

  // Check if target container is a soft dry sack (`isGranularContainer`) trying to hold pure liquid when empty
  const topIsDry = isFluidStorageDryForm(topState);
  if (bottomWrap.isGranularContainer && !topIsDry && bottomState.currentMl === 0) {
    return null;
  }

  const maxPossibleMl = Math.min(topState.currentMl, freeSpaceMl);
  if (maxPossibleMl <= 0) return null;

  const { amountMl: transferMl, isApproximate } = computeDosedPourMl(
    maxPossibleMl,
    dosageFraction,
    applyPourJitter
  );
  if (transferMl <= 0) return null;

  const dosagePct = Math.round(Math.max(0, Math.min(1, dosageFraction)) * 100);
  const topNameBefore = getSubstanceDisplayName(topState);
  const bottomNameBefore = getSubstanceDisplayName(bottomState);
  const unit = topIsDry ? 'г' : 'мл';

  // Build proportional FluidMixComponent slices from source so thermal & homemade cooking know exact composition
  const sourceBaseComponents: FluidMixComponent[] =
    Array.isArray(topState.components) && topState.components.length > 0
      ? topState.components.filter((c) => c && c.ml > 0.1)
      : [
          {
            liquidId: topState.liquidId,
            ml: topState.currentMl,
            labelRu: topNameBefore,
            color: getSubstanceColor(topState),
          },
        ];
  const transferRatio = topState.currentMl > 0 ? Math.min(1, transferMl / topState.currentMl) : 1;
  const movedComponents: FluidMixComponent[] = sourceBaseComponents
    .map((c) => ({
      ...c,
      ml: Math.max(0.1, Number((c.ml * transferRatio).toFixed(1))),
    }))
    .filter((c) => c.ml > 0.1);

  // Update top state
  const remainRatio = Math.max(0, 1 - transferRatio);
  const nextTopState: FluidContainerState = {
    ...topState,
    currentMl: topState.currentMl - transferMl,
    components:
      topState.currentMl - transferMl > 0
        ? sourceBaseComponents
            .map((c) => ({ ...c, ml: Number((c.ml * remainRatio).toFixed(1)) }))
            .filter((c) => c.ml > 0.1)
        : undefined,
  };
  if (nextTopState.currentMl <= 0) {
    nextTopState.currentMl = 0;
    nextTopState.liquidId = null;
    nextTopState.attributes = undefined;
    nextTopState.components = undefined;
    nextTopState.homemadeProgress = undefined;
    nextTopState.homemadeRecipeId = undefined;
  }

  // Update bottom state
  const prevBottomMl = bottomState.currentMl;
  const newBottomMl = prevBottomMl + transferMl;
  const nextBottomTemperature =
    prevBottomMl > 0
      ? Math.round(
          (prevBottomMl * bottomWrap.temperatureC + transferMl * topWrap.temperatureC) /
            newBottomMl
        )
      : topWrap.temperatureC;

  let isMixture = false;
  let mixtureName: string | undefined;
  let mixtureColor: string | undefined;

  const mergeComponents = (
    existing: FluidMixComponent[],
    incoming: FluidMixComponent[]
  ): FluidMixComponent[] => {
    const out: FluidMixComponent[] = existing.map((c) => ({ ...c }));
    for (const inc of incoming) {
      const found = out.find(
        (c) => c.liquidId === inc.liquidId && (c.labelRu || '') === (inc.labelRu || '')
      );
      if (found) {
        found.ml = Number((found.ml + inc.ml).toFixed(1));
      } else {
        out.push({ ...inc });
      }
    }
    return out;
  };

  const nextBottomState: FluidContainerState = {
    ...bottomState,
    currentMl: newBottomMl,
  };

  if (prevBottomMl === 0 || !bottomState.liquidId) {
    // Empty receiver -> pure transfer
    nextBottomState.liquidId = topState.liquidId;
    nextBottomState.attributes = topState.attributes
      ? { ...JSON.parse(JSON.stringify(topState.attributes)), isOpened: true }
      : undefined;
    nextBottomState.components = movedComponents;
    nextBottomState.homemadeProgress = undefined;
    nextBottomState.homemadeRecipeId = topState.homemadeRecipeId;
  } else {
    // Receiver already has substance! Check if identical or different
    const sameLiquidId = bottomState.liquidId === topState.liquidId;
    const sameVariety =
      (bottomState.attributes?.varietyRu || '') === (topState.attributes?.varietyRu || '');
    const bottomBaseComponents: FluidMixComponent[] =
      Array.isArray(bottomState.components) && bottomState.components.length > 0
        ? bottomState.components.filter((c) => c && c.ml > 0.1)
        : [
            {
              liquidId: bottomState.liquidId,
              ml: prevBottomMl,
              labelRu: bottomNameBefore,
              color: getSubstanceColor(bottomState),
            },
          ];

    if (sameLiquidId && sameVariety) {
      // Same substance -> volume + temperature merge
      nextBottomState.liquidId = bottomState.liquidId;
      nextBottomState.components = mergeComponents(bottomBaseComponents, movedComponents);
    } else {
      // MIXING TWO DIFFERENT SUBSTANCES!
      isMixture = true;
      const bottomSpec = LIQUID_REGISTRY[bottomState.liquidId as LiquidId] || topSpec;
      const colorBottom = getSubstanceColor(bottomState);
      const colorTop = getSubstanceColor(topState);
      const blendedColor = blendHexColors(colorBottom, prevBottomMl, colorTop, transferMl);

      const namedRule = findNamedMixture(bottomState, topState);

      // Compute weighted nutritional/status effects
      const bEff = bottomState.attributes?.customEffects || bottomSpec.effects || {};
      const tEff = topState.attributes?.customEffects || topSpec.effects || {};

      const mixHunger = Math.round(
        ((bEff.hunger || 0) * prevBottomMl + (tEff.hunger || 0) * transferMl) / newBottomMl +
          (namedRule?.bonusEffects?.hunger || 0)
      );
      const mixThirst = Math.round(
        ((bEff.thirst || 0) * prevBottomMl + (tEff.thirst || 0) * transferMl) / newBottomMl +
          (namedRule?.bonusEffects?.thirst || 0)
      );
      const mixEnergy = Math.round(
        ((bEff.energy || 0) * prevBottomMl + (tEff.energy || 0) * transferMl) / newBottomMl +
          (namedRule?.bonusEffects?.energy || 0)
      );
      const mixHealth = Math.round(
        ((bEff.health || 0) * prevBottomMl + (tEff.health || 0) * transferMl) / newBottomMl +
          (namedRule?.bonusEffects?.health || 0)
      );
      const mixSleepiness = Math.round(
        ((bEff.sleepiness || 0) * prevBottomMl + (tEff.sleepiness || 0) * transferMl) /
          newBottomMl +
          (namedRule?.bonusEffects?.sleepiness || 0)
      );
      const mixSoothePanic = Math.round(
        ((bEff.soothePanic || 0) * prevBottomMl + (tEff.soothePanic || 0) * transferMl) /
          newBottomMl +
          (namedRule?.bonusEffects?.soothePanic || 0)
      );

      const rawBIngs = bottomState.attributes?.ingredients ?? bottomState.attributes?.sourceIngredients;
      const bIngs = Array.isArray(rawBIngs)
        ? rawBIngs
        : rawBIngs
        ? [rawBIngs]
        : [bottomNameBefore];

      const rawTIngs = topState.attributes?.ingredients ?? topState.attributes?.sourceIngredients;
      const tIngs = Array.isArray(rawTIngs)
        ? rawTIngs
        : rawTIngs
        ? [rawTIngs]
        : [topNameBefore];

      const uniqueIngredients = Array.from(new Set([...bIngs, ...tIngs]));

      const pctBottom = Math.round((prevBottomMl / newBottomMl) * 100);
      const pctTop = Math.max(1, 100 - pctBottom);

      const computedVarietyRu = namedRule
        ? namedRule.nameRu
        : uniqueIngredients.length >= 3 || bottomNameBefore.startsWith('Смесь')
        ? `Смесь: ${uniqueIngredients.slice(0, 3).join(' + ')}${uniqueIngredients.length > 3 ? ` (+${uniqueIngredients.length - 3})` : ''}`
        : `Смесь: ${bottomNameBefore} (${pctBottom}%) + ${topNameBefore} (${pctTop}%)`;

      const computedColor = namedRule ? namedRule.colorHex : blendedColor;
      mixtureName = computedVarietyRu;
      mixtureColor = computedColor;

      const bottomIsDry = isFluidStorageDryForm(bottomState);
      const hasLiquidPhase = !bottomIsDry || !topIsDry;

      // Dominant base liquid ID for mechanics (keep toxic/flammable if either is dangerous, prefer liquid over dry granular!)
      const dominantLiquidId: LiquidId = (
        namedRule?.resultLiquidId
          ? namedRule.resultLiquidId
          : !bottomSpec.isDrinkable || bottomSpec.isFlammable
          ? bottomState.liquidId
          : !topSpec.isDrinkable || topSpec.isFlammable
          ? topState.liquidId
          : !bottomIsDry && topIsDry
          ? bottomState.liquidId
          : bottomIsDry && !topIsDry
          ? topState.liquidId
          : prevBottomMl >= transferMl
          ? bottomState.liquidId
          : topState.liquidId
      ) as LiquidId;

      const mergedComponents = mergeComponents(bottomBaseComponents, movedComponents);

      const customAttr: FluidSubstanceAttributes = {
        varietyRu: computedVarietyRu,
        ingredients: uniqueIngredients,
        sourceIngredients: uniqueIngredients,
        preparationMethod: namedRule?.isHomemade
          ? 'Домашнее смешивание в кухонной посуде'
          : 'Смешивание в сетке взаимодействия (Верх → Низ)',
        purpose: namedRule
          ? namedRule.descriptionRu
          : `Смешанный состав (${uniqueIngredients.join(' + ')})`,
        reasonAndOrigin: namedRule?.isHomemade
          ? 'Приготовлено дома вручную без фабричных стабилизаторов и консервантов.'
          : 'Приготовлено игроком путём переливания и смешивания компонентов.',
        culinaryEquivalentId:
          namedRule?.culinaryEquivalentId ||
          (dominantLiquidId === bottomState.liquidId
            ? bottomState.attributes?.culinaryEquivalentId
            : topState.attributes?.culinaryEquivalentId),
        physicalForm: hasLiquidPhase ? 'liquid' : 'dry',
        isHomemade: namedRule?.isHomemade || undefined,
        customColor: computedColor,
        visuals: {
          ...(bottomState.attributes?.visuals || {}),
          color: computedColor
        },
        isOpened: true,
        customEffects: {
          hunger: mixHunger,
          thirst: mixThirst,
          energy: mixEnergy,
          health: mixHealth,
          sleepiness: mixSleepiness,
          soothePanic: mixSoothePanic,
        },
      };

      nextBottomState.liquidId = dominantLiquidId;
      nextBottomState.attributes = customAttr;
      nextBottomState.components = mergedComponents;
      nextBottomState.homemadeProgress = 0;
      nextBottomState.homemadeRecipeId = namedRule?.isHomemade ? namedRule.id : undefined;
    }
  }

  const updatedTop = applyEffectiveFluidToItem(topItem, nextTopState, topWrap.temperatureC);
  const updatedBottom = applyEffectiveFluidToItem(
    bottomItem,
    nextBottomState,
    nextBottomTemperature
  );

  // Immediately run liquid-solid immersion & infusion if either container also holds solid items
  if (updatedTop.fluidStorage) {
    updateHybridContainerInteraction(updatedTop, 0);
    syncItemContainerProperties(updatedTop);
  }
  if (updatedBottom.fluidStorage) {
    updateHybridContainerInteraction(updatedBottom, 1.0);
    syncItemContainerProperties(updatedBottom);
  }

  const approxPrefix = isApproximate ? '~' : '';
  const doseTag = dosageFraction < 0.999 ? (isApproximate ? `, ~${dosagePct}%` : `, на глаз`) : '';
  const remainingSourceLabel =
    nextTopState.currentMl > 0
      ? `Остаток: ${approxPrefix}${Math.round(nextTopState.currentMl)} / ${nextTopState.maxMl} ${unit}`
      : 'Верхняя тара опустошена (0 мл)';

  const bottomBreakdown = getContainerCapacityBreakdown(updatedBottom);
  const hasBottomSolids = Boolean(updatedBottom.contents && updatedBottom.contents.length > 0);
  const resultingTargetLabel = hasBottomSolids
    ? `${getSubstanceDisplayName(nextBottomState)} + ${updatedBottom.contents!.length} предм. (${approxPrefix}${Math.round(
        bottomBreakdown.usedMl
      )} / ${bottomBreakdown.totalCapacityMl} мл)`
    : `${getSubstanceDisplayName(nextBottomState)} (${approxPrefix}${Math.round(
        nextBottomState.currentMl
      )} / ${nextBottomState.maxMl} ${unit})`;

  return {
    updatedTop,
    updatedBottom,
    isMixture,
    detail: {
      fromSlot,
      toSlot,
      sourceName: topItem.nameRu,
      targetName: bottomItem.nameRu,
      transferredAmountLabel: `${approxPrefix}${Math.round(transferMl)} ${unit} (${topNameBefore}${doseTag})`,
      remainingSourceLabel,
      resultingTargetLabel,
      isMixture,
      mixtureName,
      mixtureColor,
      dosagePct,
      isApproximate,
    },
  };
}

/**
 * Attempts to transfer discrete items from `topItem` (either a multi-item container with `contents`
 * or a single item) into `bottomItem` (an open container with `isContainer: true`).
 */
export function tryTransferDiscreteTopToBottom(
  topItem: InventoryItem,
  bottomItem: InventoryItem,
  fromSlot: number,
  toSlot: number
): {
  updatedTop: InventoryItem | null;
  updatedBottom: InventoryItem;
  detail: InteractionTransferDetail;
} | null {
  const probeBottom = cloneInventoryItem(bottomItem);
  ensureHybridContainerProps(probeBottom);
  if (!probeBottom.isContainer || probeBottom.singleUseContainer) return null;
  if (isFluidContainerClosed(probeBottom)) return null;

  const probeTop = cloneInventoryItem(topItem);
  ensureHybridContainerProps(probeTop);

  // Case A: Top item is also a container with items inside (`topItem.contents.length > 0`) -> pour items from top container into bottom container!
  if (probeTop.isContainer && probeTop.contents && probeTop.contents.length > 0) {
    const nextTop = probeTop;
    const nextBottom = probeBottom;
    nextBottom.contents = nextBottom.contents ? [...nextBottom.contents] : [];
    nextTop.contents = nextTop.contents ? [...nextTop.contents] : [];

    let movedCount = 0;
    const remainingInTop: InventoryItem[] = [];

    for (const child of nextTop.contents) {
      const check = canItemFitInContainer(nextBottom, child);
      if (check.fits) {
        const existingIdx = nextBottom.contents.findIndex(
          (c) =>
            c.itemId === child.itemId &&
            c.maxStack > 1 &&
            c.count + child.count <= c.maxStack &&
            !c.fluidStorage &&
            !c.contents?.length
        );
        if (existingIdx >= 0) {
          nextBottom.contents[existingIdx].count += child.count;
        } else {
          nextBottom.contents.push({ ...child, submersionLevel: 0 });
        }
        movedCount += child.count;
      } else {
        remainingInTop.push(child);
      }
    }

    if (movedCount === 0) return null;

    nextTop.contents = remainingInTop;
    if (nextTop.fluidStorage) {
      updateHybridContainerInteraction(nextTop, 0);
      syncItemContainerProperties(nextTop);
    } else {
      recalculateContainerWeight(nextTop);
    }
    if (nextBottom.fluidStorage) {
      updateHybridContainerInteraction(nextBottom, 1.0);
      syncItemContainerProperties(nextBottom);
    } else {
      recalculateContainerWeight(nextBottom);
    }

    return {
      updatedTop: nextTop,
      updatedBottom: nextBottom,
      detail: {
        fromSlot,
        toSlot,
        sourceName: topItem.nameRu,
        targetName: bottomItem.nameRu,
        transferredAmountLabel: `Пересыпано: ${movedCount} шт.`,
        remainingSourceLabel:
          remainingInTop.length > 0
            ? `Осталось в верхней таре: ${remainingInTop.length} поз.`
            : 'Верхняя тара полностью опустошена',
        resultingTargetLabel: `${nextBottom.nameRu}`,
      },
    };
  }

  // Case B: Top item is a regular item (or empty small item) that fits inside bottom container
  if (!probeTop.isContainer || (!probeTop.contents?.length && !probeTop.fluidStorage?.currentMl)) {
    const nextBottom = probeBottom;
    nextBottom.contents = nextBottom.contents ? [...nextBottom.contents] : [];
    const check = canItemFitInContainer(nextBottom, probeTop);
    if (!check.fits) return null;

    const itemToInsert = cloneInventoryItem(probeTop);
    const existingIdx = nextBottom.contents.findIndex(
      (c) =>
        c.itemId === itemToInsert.itemId &&
        c.maxStack > 1 &&
        c.count + itemToInsert.count <= c.maxStack &&
        !c.fluidStorage
    );
    if (existingIdx >= 0) {
      nextBottom.contents[existingIdx].count += itemToInsert.count;
    } else {
      nextBottom.contents.push(itemToInsert);
    }

    const submergedInLiquid = Boolean(nextBottom.fluidStorage && nextBottom.fluidStorage.currentMl > 0 && nextBottom.fluidStorage.liquidId);
    if (nextBottom.fluidStorage) {
      updateHybridContainerInteraction(nextBottom, 1.0);
      syncItemContainerProperties(nextBottom);
    } else {
      recalculateContainerWeight(nextBottom);
    }

    return {
      updatedTop: null,
      updatedBottom: nextBottom,
      detail: {
        fromSlot,
        toSlot,
        sourceName: topItem.nameRu,
        targetName: bottomItem.nameRu,
        transferredAmountLabel: submergedInLiquid
          ? `Погружено в жидкость: ${topItem.nameRu} (${topItem.count} шт.)`
          : `Уложено: ${topItem.nameRu} (${topItem.count} шт.)`,
        remainingSourceLabel: submergedInLiquid ? 'Смешано с жидкостью в таре' : 'Упаковано полностью',
        resultingTargetLabel: `${nextBottom.nameRu}`,
      },
    };
  }

  return null;
}

const KNIFE_IDS = [
  'knife',
  'pocket_knife',
  'kitchen_knife',
  'kitchen_knife_chef',
  'kitchen_knife_bread',
  'kitchen_knife_paring',
  'kitchen_cleaver',
  'multitool_leatherman',
];

function isKnifeTool(item: InventoryItem | null): boolean {
  if (!item) return false;
  return (
    item.itemId === 'kitchen_knife' ||
    item.kitchenwareAttributes?.kind === 'kitchen_knife' ||
    itemMatchesAnyId(item, KNIFE_IDS)
  );
}

function getItemCatalogKeys(item: InventoryItem | null): string[] {
  if (!item) return [];
  const keys = new Set<string>([item.itemId, resolveCanonicalSubstanceId(item.itemId)]);
  if (item.originalCatalogId) {
    keys.add(item.originalCatalogId);
    keys.add(resolveCanonicalSubstanceId(item.originalCatalogId));
  }
  return Array.from(keys);
}

function itemMatchesAnyId(item: InventoryItem | null, allowedIds: string[]): boolean {
  if (!item) return false;
  const keys = getItemCatalogKeys(item);
  return keys.some((k) => allowedIds.includes(k));
}

function isKnifeOrOpener(item: InventoryItem | null): boolean {
  if (!item) return false;
  return itemMatchesAnyId(
    item,
    KNIFE_IDS.concat(['kitchen_can_opener', 'scissors_medical'])
  );
}

/**
 * Built-in Crafting & Interaction Recipe Table ("Таблица своеобразных крафтов").
 * Includes both dynamic pouring/mixing rules and discrete item combinations.
 */
export const INTERACTION_CRAFT_RECIPES: InteractionCraftRecipe[] = [
  {
    id: 'guide_pour_transfer',
    title: 'Переливание и пересыпание (Верх → Низ)',
    category: 'pouring',
    description:
      'Поставьте полную тару в верхний ряд, а пустую или неполную ёмкость под неё в нижний ряд. Верхняя тара опустошится ровно на столько, сколько вмещает нижняя.',
    actionLabel: 'Перелить / Пересыпать',
    ingredients: [
      {
        itemIds: ['drinking_water', 'gasoline_95', 'sandbag', 'thermos', 'bottle_plastic_1500'],
        label: 'Верхний ряд: Полная тара (бутылка, канистра, мешок, термос)',
        rowHint: 'top',
      },
      {
        itemIds: ['cup_disposable', 'bottle_empty', 'mug', 'sack_empty', 'canister_empty'],
        label: 'Нижний ряд: Приёмная тара (стакан, кружка, пустая бутылка, мешок)',
        rowHint: 'bottom',
      },
    ],
    resultsSummary: [
      'Верхняя тара (с оставшимся объёмом или пустая)',
      'Нижняя тара (наполненная до краёв или на объём верхней тары)',
    ],
  },
  {
    id: 'guide_mix_coffee_milk',
    title: 'Кофе с молоком / сливками / сгущёнкой',
    category: 'mixing',
    description:
      'Перелейте горячий кофе из верхней тары в ёмкость с молоком, сливками или сгущёнкой (или наоборот), чтобы получить бодрящий кофейный напиток.',
    actionLabel: 'Смешать напиток',
    ingredients: [
      {
        itemIds: ['coffee', 'thermos', 'mug', 'paper_cup'],
        liquidIds: ['coffee'],
        label: 'Верх: Тара с кофе',
        rowHint: 'top',
      },
      {
        itemIds: ['bottle_glass_large', 'mug', 'paper_cup', 'can_metal_medium_open'],
        liquidIds: ['milk', 'cream_heavy', 'condensed_milk'],
        label: 'Низ: Ёмкость с молоком / сливками / сгущёнкой',
        rowHint: 'bottom',
      },
    ],
    resultsSummary: [
      'Опустошённая верхняя тара',
      'Кофе с молоком (Латте / Раф) с повышенным эффектом бодрости',
    ],
  },
  {
    id: 'guide_mix_tea_sweet',
    title: 'Целебный чай с мёдом или вареньем',
    category: 'mixing',
    description:
      'Добавьте мёд, варенье или сахар к чаю путём переливания/пересыпания из верхнего слота в нижний.',
    actionLabel: 'Смешать чай',
    ingredients: [
      {
        itemIds: ['jar_glass_medium', 'jar_glass_large', 'paper_cup', 'mug'],
        liquidIds: ['honey', 'jam', 'sugar'],
        label: 'Верх: Мёд / Варенье / Сахар',
        rowHint: 'top',
      },
      {
        itemIds: ['thermos', 'mug', 'cup', 'paper_cup'],
        liquidIds: ['tea'],
        label: 'Низ: Кружка или термос с чаем',
        rowHint: 'bottom',
      },
    ],
    resultsSummary: ['Тара из-под добавки', 'Чай с мёдом / вареньем (+Здоровье, -Паника)'],
  },
  {
    id: 'guide_mix_2t_fuel',
    title: 'Двухтактная топливная смесь 2Т (Бензин + Масло)',
    category: 'workshop',
    description:
      'Смешайте бензин АИ-92/95 и моторное масло в одной канистре или бутылке для заправки двухтактных двигателей и бензоинструмента.',
    actionLabel: 'Смешать топливо 2Т',
    ingredients: [
      {
        itemIds: ['canister_plastic_5l', 'motor_oil', 'gasoline_95'],
        liquidIds: ['motor_oil'],
        label: 'Верх: Моторное масло',
        rowHint: 'top',
      },
      {
        itemIds: [
          'gasoline_95',
          'canister_plastic_5l',
          'canister_metal_20l',
          'bottle_plastic_1500',
        ],
        liquidIds: ['gasoline_92', 'gasoline_95'],
        label: 'Низ: Канистра или тара с бензином',
        rowHint: 'bottom',
      },
    ],
    resultsSummary: ['Тара из-под масла', 'Канистра с топливной смесью 2Т'],
  },
  {
    id: 'craft_open_sealed_container',
    title: 'Вскрытие консервной банки или запаянной упаковки',
    category: 'cooking',
    description:
      'Используйте нож, мультитул или консервный нож, чтобы аккуратно вскрыть закрытую консервную банку или запаянный пакет без потери содержимого.',
    actionLabel: 'Вскрыть тару',
    ingredients: [
      {
        itemIds: KNIFE_IDS.concat(['kitchen_can_opener']),
        label: 'Нож / Консервный нож / Мультитул',
        isTool: true,
      },
      {
        itemIds: [
          'can_metal_medium',
          'can_alu_330',
          'stew_meat',
          'fish_preserves',
          'beans_tomato',
          'sweet_corn',
          'green_peas',
          'olives_green',
          'peach_halves',
          'pickles',
          'sun_dried_tomatoes',
          'candy_pouch_sealed',
          'paper_packaging_sealed',
          'tetra_pack_1000',
          'egg_carton_10_closed',
        ],
        label: 'Закрытая банка или запечатанная упаковка',
      },
    ],
    resultsSummary: [
      'Инструмент (сохраняется)',
      'Открытая банка / упаковка, готовая к употреблению и переливанию',
    ],
    matchAndPreview: (inputs) => {
      const present = inputs
        .map((item, idx) => ({ item, idx }))
        .filter((x): x is { item: InventoryItem; idx: number } => x.item !== null);
      if (present.length !== 2) return null;

      const toolEntry = present.find((x) => isKnifeOrOpener(x.item));
      const targetEntry = present.find((x) => x !== toolEntry);
      if (!toolEntry || !targetEntry) return null;

      const target = targetEntry.item;

      // Case 1: Fluid container that is sealed (`isFluidContainerClosed(target)`)
      if (isFluidContainerClosed(target) && target.fluidStorage) {
        const openedItem = cloneInventoryItem(target);
        openedItem.isOpen = true;
        if (openedItem.fluidStorage!.attributes) {
          openedItem.fluidStorage!.attributes.isOpened = true;
        }
        syncItemContainerProperties(openedItem);

        return {
          isValid: true,
          kind: 'craft_recipe',
          title: 'Вскрытие герметичной тары',
          subtitle: `${toolEntry.item.nameRu} вскрывает «${target.nameRu}»`,
          actionLabel: 'Вскрыть банку',
          previewOutputs: [cloneInventoryItem(toolEntry.item), openedItem, null, null],
          transferDetails: [],
          matchedRecipeId: 'craft_open_sealed_container',
        };
      }

      // Case 2: Sealed packaging items with open counterparts
      const sealedToOpenMap: Record<string, string> = {
        candy_pouch_sealed: 'candy_pouch_open',
        paper_packaging_sealed: 'paper_packaging_open',
        milk_carton_sealed: 'milk_carton_open',
        egg_carton_10_closed: 'egg_carton_10_open',
      };
      const mappedOpenId =
        sealedToOpenMap[target.itemId] ||
        (target.originalCatalogId ? sealedToOpenMap[target.originalCatalogId] : undefined);
      if (mappedOpenId) {
        const openedPkg = createItem(mappedOpenId, 1);
        if (openedPkg) {
          if (target.contents && target.contents.length > 0) {
            openedPkg.contents = JSON.parse(JSON.stringify(target.contents));
            recalculateContainerWeight(openedPkg);
          }
          return {
            isValid: true,
            kind: 'craft_recipe',
            title: 'Распечатывание упаковки',
            subtitle: `Аккуратное вскрытие «${target.nameRu}» без разрыва`,
            actionLabel: 'Вскрыть упаковку',
            previewOutputs: [cloneInventoryItem(toolEntry.item), openedPkg, null, null],
            transferDetails: [],
            matchedRecipeId: 'craft_open_sealed_container',
          };
        }
      }

      return null;
    },
  },
  {
    id: 'craft_knife_cut_produce',
    title: 'Нарезка и очистка продуктов ножом (по процентным клеткам)',
    category: 'cooking',
    description:
      'Положите любой нож и один или несколько овощей, фруктов, цитрусов, ягод, грибов, веток с плодами или кусков мяса, птицы и рыбы. Процентная клетка задаёт степень нарезки: слот «Всё» очищает или разделяет продукт целиком, а клетки от ~92% до ~8% режут от крупных кусков и половинок до стейков, ломтиков, соломки, кубиков и рубки.',
    actionLabel: 'Нарезать ножом',
    ingredients: [
      { itemIds: KNIFE_IDS, label: 'Любой нож', isTool: true },
      { itemIds: ['apple', 'potato_whole', 'tomato_whole', 'champignon_white_whole'], label: 'Любой овощ, фрукт, гриб, ягода, ветка, мясо, птица или рыба' },
    ],
    resultsSummary: ['Нож (сохраняется)', 'Нарезанные / очищенные части с обновлённым весом, размером и формой'],
  },
  {
    id: 'craft_knife_cut_meat',
    title: 'Нарезка и разделка мяса, птицы и рыбы ножом',
    category: 'cooking',
    description:
      'Положите нож и любой отруб мяса, птицы, рыбы, морепродуктов или фарша в сетку 2×2 или 4×4. Слот «Всё» разделывает тушу/рыбу, обваливает с кости или режет на стейки; ~92%..~67% отрезает нужную долю; ~58%..~45% делит пополам; ~42%..~33% режет на стейки; ~25% — на ломтики/медальоны; ~17% — на соломку или кубики; ~8% — рубит в фарш/тартар.',
    actionLabel: 'Нарезать мясо',
    ingredients: [
      { itemIds: KNIFE_IDS, label: 'Любой нож', isTool: true },
      { itemIds: ['beef_rump_large', 'chicken_breast_large', 'salmon_fillet', 'pork_ribs_medium'], label: 'Любое мясо, птица, рыба, морепродукты или фарш' },
    ],
    resultsSummary: ['Нож (сохраняется)', 'Отрезанные куски, стейки, ломтики, соломка, кубики или рубленый фарш с сохранением прожарки и температуры'],
  },
  {
    id: 'craft_pluck_plant_branch',
    title: 'Снятие плодов с ветки, грозди или пучка',
    category: 'cooking',
    description:
      'Положите ветку с плодами (виноград, томаты черри, редис, бананы, смородина, вешенки и др.) в процентную клетку сетки (с ножом или руками), чтобы снять все плоды или нужную часть — остаток останется на ветке.',
    actionLabel: 'Снять плоды с ветки',
    ingredients: [
      { itemIds: ['plant_branch'], label: 'Ветка / гроздь / пучок с плодами' },
    ],
    resultsSummary: ['Отдельные штучные плоды', 'Ветка с оставшимися плодами или пустая ветка'],
  },
  {
    id: 'craft_refill_zippo',
    title: 'Заправка бензиновой зажигалки Zippo',
    category: 'workshop',
    description:
      'Заправьте пустую зажигалку Zippo из канистры или ёмкости с бензином (расходуется 50 мл топлива).',
    actionLabel: 'Заправить Zippo',
    ingredients: [
      {
        itemIds: [
          'gasoline_95',
          'canister_plastic_5l',
          'canister_metal_20l',
          'bottle_plastic_500',
        ],
        liquidIds: ['gasoline_92', 'gasoline_95'],
        minMl: 50,
        label: 'Канистра или тара с бензином (не менее 50 мл)',
        rowHint: 'top',
      },
      {
        itemIds: ['zippo_empty'],
        label: 'Пустая зажигалка Zippo',
        rowHint: 'bottom',
      },
    ],
    resultsSummary: ['Заправленная зажигалка Zippo', 'Канистра с оставшимся топливом'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length !== 2) return null;
      const zippo = present.find((x) => itemMatchesAnyId(x, ['zippo_empty']));
      const fuelSource = present.find((x) => x !== zippo);
      if (!zippo || !fuelSource) return null;

      const wrap = getEffectiveFluidWrapper(fuelSource);
      if (!wrap) return null;
      const isGasoline =
        wrap.state.liquidId === 'gasoline_92' ||
        wrap.state.liquidId === 'gasoline_95' ||
        wrap.state.liquidId === 'gasoline_98';
      if (!isGasoline || wrap.state.currentMl < 50) return null;

      const nextState: FluidContainerState = {
        ...wrap.state,
        currentMl: wrap.state.currentMl - 50,
      };
      if (nextState.currentMl <= 0) {
        nextState.currentMl = 0;
        nextState.liquidId = null;
      }
      const updatedContainer = applyEffectiveFluidToItem(
        fuelSource,
        nextState,
        wrap.temperatureC
      );
      const filledZippo = createItem('zippo_lighter', 1);

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Заправка зажигалки Zippo',
        subtitle: `Расход: 50 мл бензина (остаток в таре: ${Math.round(nextState.currentMl)} мл)`,
        actionLabel: 'Заправить Zippo',
        previewOutputs: [updatedContainer, filledZippo, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_refill_zippo',
      };
    },
  },
  {
    id: 'craft_assemble_medkit',
    title: 'Комплектация полной аптечки первой помощи',
    category: 'medical',
    description:
      'Уложите бинты и обезболивающее или антисептик в пустой футляр аптечки, чтобы получить укомплектованную аптечку.',
    actionLabel: 'Укомплектовать аптечку',
    ingredients: [
      { itemIds: ['medkit_empty'], label: 'Пустой бокс аптечки' },
      { itemIds: ['bandage', 'FirstAidBandage'], label: 'Стерильный бинт' },
      {
        itemIds: [
          'painkillers',
          'antibiotics',
          'antiseptic',
          'iodine',
          'hydrogen_peroxide',
        ],
        label: 'Обезболивающее / Антисептик / Антибиотики',
      },
    ],
    resultsSummary: ['Укомплектованная аптечка (Medkit)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length < 2 || present.length > 3) return null;
      const box = present.find((x) => itemMatchesAnyId(x, ['medkit_empty']));
      const bandage = present.find((x) =>
        itemMatchesAnyId(x, ['bandage', 'FirstAidBandage'])
      );
      const medIds = [
        'painkillers',
        'antibiotics',
        'antiseptic',
        'iodine',
        'hydrogen_peroxide',
      ];
      const med = present.find((x) => itemMatchesAnyId(x, medIds));
      if (!box || (!bandage && !med)) return null;
      if (present.length === 2 && !(box && bandage)) return null;

      const medkit = createItem('medkit', 1);
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Комплектация аптечки первой помощи',
        subtitle: 'Сборка полного медицинского набора в защитном футляре',
        actionLabel: 'Собрать аптечку',
        previewOutputs: [medkit, null, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_assemble_medkit',
      };
    },
  },
  {
    id: 'craft_sterilize_rag',
    title: 'Дезинфекция ветоши (Чистая перевязка)',
    category: 'medical',
    description:
      'Пропитайте чистую тряпку или ветошь медицинским антисептиком, перекисью или водкой, чтобы получить стерильный перевязочный бинт.',
    actionLabel: 'Продезинфицировать ткань',
    ingredients: [
      {
        itemIds: ['antiseptic', 'hydrogen_peroxide', 'iodine', 'vodka'],
        liquidIds: ['vodka', 'antiseptic', 'peroxide'],
        label: 'Антисептик / Перекись / Водка',
      },
      { itemIds: ['rag', 'cloth_napkin'], label: 'Тряпка или тканевая салфетка' },
    ],
    resultsSummary: ['Стерильный бинт (2 шт.)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length !== 2) return null;
      const rag = present.find((x) => itemMatchesAnyId(x, ['rag', 'cloth_napkin']));
      const other = present.find((x) => x !== rag);
      if (!rag || !other) return null;

      const isMedBottle = itemMatchesAnyId(other, [
        'antiseptic',
        'hydrogen_peroxide',
        'iodine',
      ]);
      const wrap = getEffectiveFluidWrapper(other);
      const isLiquidDisinfectant =
        wrap &&
        (wrap.state.liquidId === 'vodka' ||
          wrap.state.liquidId === 'medical_solution' ||
          wrap.state.attributes?.medicalEffectId === 'antiseptic' ||
          wrap.state.attributes?.medicalEffectId === 'peroxide') &&
        wrap.state.currentMl >= 50;

      if (!isMedBottle && !isLiquidDisinfectant) return null;

      const bandage = createItem('bandage', 2);

      let leftoverContainer: InventoryItem | null = null;
      if (isLiquidDisinfectant && wrap) {
        const nextState: FluidContainerState = {
          ...wrap.state,
          currentMl: Math.max(0, wrap.state.currentMl - 50),
        };
        if (nextState.currentMl === 0) nextState.liquidId = null;
        leftoverContainer = applyEffectiveFluidToItem(other, nextState, wrap.temperatureC);
      }

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Стерилизация перевязочного материала',
        subtitle: `${rag.nameRu} + ${other.nameRu} → 2 стерильных бинта`,
        actionLabel: 'Сделать стерильный бинт',
        previewOutputs: [bandage, leftoverContainer, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_sterilize_rag',
      };
    },
  },
  {
    id: 'craft_cut_cloth_to_rags',
    title: 'Нарезка ткани и одежды на лоскуты и бинты',
    category: 'medical',
    description:
      'Разрежьте ненужную футболку, рубашку или полотенце ножом или медицинскими ножницами на перевязочные бинты и ветошь.',
    actionLabel: 'Разрезать на лоскуты',
    ingredients: [
      {
        itemIds: KNIFE_IDS.concat(['scissors_medical']),
        label: 'Нож или медицинские ножницы',
        isTool: true,
      },
      {
        itemIds: [
          'tshirt_white',
          'shirt_flannel',
          'towel_kitchen',
          'bedsheet_cotton',
          'pillowcase_cotton',
        ],
        label: 'Тканевая одежда / Полотенце / Простыня',
      },
    ],
    resultsSummary: ['Инструмент (сохраняется)', 'Стерильный бинт', 'Ветошь (2 шт.)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length !== 2) return null;
      const tool = present.find((x) =>
        itemMatchesAnyId(x, KNIFE_IDS.concat(['scissors_medical']))
      );
      const clothIds = [
        'tshirt_white',
        'shirt_flannel',
        'towel_kitchen',
        'bedsheet_cotton',
        'pillowcase_cotton',
      ];
      const cloth = present.find((x) => itemMatchesAnyId(x, clothIds));
      if (!tool || !cloth) return null;

      const bandage = createItem('bandage', 1);
      const rags = createItem('rag', 2);
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Раскрой ткани на перевязку и ветошь',
        subtitle: `${tool.nameRu} разрезает «${cloth.nameRu}»`,
        actionLabel: 'Разрезать ткань',
        previewOutputs: [cloneInventoryItem(tool), bandage, rags, null],
        transferDetails: [],
        matchedRecipeId: 'craft_cut_cloth_to_rags',
      };
    },
  },
  {
    id: 'craft_improvised_splint',
    title: 'Импровизированная медицинская шина',
    category: 'medical',
    description:
      'Скрепите плотную ткань/ветошь армированным скотчем или изолентой для создания фиксирующей шины.',
    actionLabel: 'Скрутить шину',
    ingredients: [
      { itemIds: ['duct_tape', 'electrical_tape'], label: 'Армированный скотч / Изолента' },
      { itemIds: ['rag', 'bandage', 'towel_kitchen'], label: 'Ветошь / Бинт / Полотенце' },
    ],
    resultsSummary: ['Медицинская шина (Splint)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length !== 2) return null;
      const tape = present.find((x) =>
        itemMatchesAnyId(x, ['duct_tape', 'electrical_tape'])
      );
      const pad = present.find((x) =>
        itemMatchesAnyId(x, ['rag', 'bandage', 'towel_kitchen'])
      );
      if (!tape || !pad) return null;

      const splint = createItem('splint', 1);
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Сборка фиксирующей шины',
        subtitle: `${tape.nameRu} + ${pad.nameRu} → Медицинская шина`,
        actionLabel: 'Сделать шину',
        previewOutputs: [splint, null, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_improvised_splint',
      };
    },
  },
  {
    id: 'craft_repair_packaging_tape',
    title: 'Заклеивание порванной упаковки скотчем',
    category: 'workshop',
    description:
      'Восстановите разорванную бумажную упаковку или пакет с помощью армированного скотча или изоленты.',
    actionLabel: 'Заклеить упаковку',
    ingredients: [
      { itemIds: ['duct_tape', 'electrical_tape'], label: 'Скотч / Изолента', isTool: true },
      {
        itemIds: ['paper_packaging_torn', 'candy_pouch_torn', 'milk_carton_torn'],
        label: 'Порванная упаковка / пакет',
      },
    ],
    resultsSummary: ['Скотч (сохраняется)', 'Целая открытая упаковка'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length !== 2) return null;
      const tape = present.find((x) =>
        itemMatchesAnyId(x, ['duct_tape', 'electrical_tape'])
      );
      const tornMap: Record<string, string> = {
        paper_packaging_torn: 'paper_packaging_open',
        candy_pouch_torn: 'candy_pouch_open',
        milk_carton_torn: 'milk_carton_open',
      };
      const torn = present.find((x) => Boolean(tornMap[x.itemId]));
      if (!tape || !torn) return null;

      const repaired = createItem(tornMap[torn.itemId], 1);
      if (torn.contents && torn.contents.length > 0) {
        repaired.contents = JSON.parse(JSON.stringify(torn.contents));
        recalculateContainerWeight(repaired);
      }

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Ремонт порванной тары',
        subtitle: `${tape.nameRu} восстанавливает «${torn.nameRu}»`,
        actionLabel: 'Заклеить тару',
        previewOutputs: [cloneInventoryItem(tape), repaired, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_repair_packaging_tape',
      };
    },
  },
  {
    id: 'craft_homemade_mayo',
    title: 'Домашний майонез (взбивание яйца и масла)',
    category: 'cooking',
    description:
      'Взбейте свежее яйцо с растительным маслом в миске, банке или кружке (или в любой посуде с ложкой). По желанию добавьте лимон, уксус, соль или горчицу — состав майонеза точно отразит добавленные продукты.',
    actionLabel: 'Взбить домашний майонез',
    ingredients: [
      {
        itemIds: ['bowl', 'jar_glass_medium', 'jar_glass_large', 'mug', 'cup'],
        liquidIds: ['oil_culinary'],
        label: 'Ёмкость с растительным маслом (от 40 мл)',
      },
      {
        itemIds: ['egg_chicken_single', 'egg_quail_single'],
        label: 'Свежее сырое яйцо (куриное или перепелиное)',
      },
    ],
    resultsSummary: ['Домашний майонез (состав строго из ваших продуктов, без консервантов)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length < 2 || present.length > 4) return null;

      const isEgg = (x: InventoryItem) =>
        (x.itemId === 'egg_chicken_single' || x.itemId === 'egg_quail_single') &&
        x.attributes?.state !== 'boiled' &&
        x.attributes?.state !== 'fried' &&
        x.attributes?.state !== 'burnt';

      const eggs = present.filter(isEgg);
      if (eggs.length === 0) return null;

      const whiskTool = present.find((x) =>
        itemMatchesAnyId(x, ['spoon', 'kitchen_spoon_steel', 'kitchen_spoon_wooden', 'fork'])
      );

      const oilVessel = present.find((x) => {
        const w = getEffectiveFluidWrapper(x);
        if (!w || !w.isOpened || w.state.liquidId !== 'oil_culinary' || w.state.currentMl < 40) return false;
        // Avoid colliding with placing an egg into a frying pan for frying unless a spoon/whisk is also placed
        const isFryingPan = x.itemId.includes('pan') || x.itemId === 'frying_pan';
        if (isFryingPan && !whiskTool) return false;
        return true;
      });
      if (!oilVessel) return null;

      const usedSet = new Set<InventoryItem>([oilVessel, ...eggs]);
      if (whiskTool) usedSet.add(whiskTool);

      const extras = present.filter((x) => !usedSet.has(x));
      const extraIngredients: string[] = [];
      const preservedOutputs: InventoryItem[] = [];
      let extraMl = 0;

      for (const ex of extras) {
        const exWrap = getEffectiveFluidWrapper(ex);
        const exId = (ex.itemId || '').toLowerCase();
        const exSpecies = (ex.produceAttributes?.speciesId || exId).toLowerCase();
        if (
          exSpecies === 'lemon_whole' ||
          exSpecies === 'lime_whole' ||
          exId.includes('lemon') ||
          exId.includes('lime')
        ) {
          extraIngredients.push(ex.nameRu.replace(/\s*\([^)]*\)\s*/g, '').trim());
          extraMl += 15;
          continue;
        }
        if (
          exWrap &&
          exWrap.isOpened &&
          exWrap.state.currentMl >= 5 &&
          (exWrap.state.liquidId === 'salt' ||
            exWrap.state.liquidId === 'vinegar' ||
            exWrap.state.liquidId === 'food_acid' ||
            exWrap.state.liquidId === 'sugar' ||
            exWrap.state.liquidId === 'spice_dry' ||
            (exWrap.state.liquidId === 'sauce' &&
              (exWrap.state.attributes?.culinaryEquivalentId === 'mustard_dijon' ||
                (exWrap.state.attributes?.varietyRu || '').toLowerCase().includes('горчиц'))))
        ) {
          const takeMl = Math.min(exWrap.state.currentMl, exWrap.state.liquidId === 'salt' ? 8 : 20);
          const nextEx = cloneInventoryItem(ex);
          const nextExWrap = getEffectiveFluidWrapper(nextEx)!;
          nextExWrap.state.currentMl = Math.max(0, nextExWrap.state.currentMl - takeMl);
          if (nextExWrap.state.currentMl <= 0) {
            nextExWrap.state.liquidId = null;
            nextExWrap.state.attributes = undefined;
            nextExWrap.state.components = undefined;
          }
          const updatedEx = applyEffectiveFluidToItem(nextEx, nextExWrap.state, nextExWrap.temperatureC);
          if (updatedEx.fluidStorage) syncItemContainerProperties(updatedEx);
          preservedOutputs.push(updatedEx);
          extraIngredients.push(
            exWrap.state.attributes?.varietyRu ||
              LIQUID_REGISTRY[exWrap.state.liquidId as LiquidId]?.nameRu ||
              ex.nameRu
          );
          extraMl += takeMl;
          continue;
        }
        // Unrelated extra item -> do not trigger mayo craft
        return null;
      }

      const oilWrap = getEffectiveFluidWrapper(oilVessel)!;
      const oilBaseLabel =
        oilWrap.state.attributes?.varietyRu ||
        LIQUID_REGISTRY.oil_culinary?.nameRu ||
        'Растительное масло';
      const eggLabels = Array.from(
        new Set(eggs.map((e) => e.nameRu.replace(/\s*\([^)]*\)\s*/g, '').trim()))
      );
      const ingredients = Array.from(new Set([oilBaseLabel, ...eggLabels, ...extraIngredients]));
      const eggMl = eggs.reduce((s, e) => s + (e.itemId === 'egg_quail_single' ? 14 : 52), 0);
      const finalMl = Math.min(oilWrap.state.maxMl, Math.round(oilWrap.state.currentMl + eggMl + extraMl));

      const nextVesselState: FluidContainerState = {
        ...oilWrap.state,
        liquidId: 'sauce',
        currentMl: finalMl,
        components: [{ liquidId: 'sauce', ml: finalMl, labelRu: 'Домашний майонез', color: '#fef9c3' }],
        homemadeRecipeId: 'homemade_mayo',
        homemadeProgress: 1,
        attributes: {
          varietyRu: 'Домашний майонез',
          ingredients,
          sourceIngredients: ingredients,
          preparationMethod: 'Домашнее ручное эмульгирование яиц с растительным маслом',
          purpose: 'Заправка салатов, подача к пельменям, бутербродам и запеканию',
          reasonAndOrigin: 'Взбито дома из свежих яиц и масла без фабричных загустителей, крахмала и консервантов.',
          culinaryEquivalentId: 'sauce_mayo',
          physicalForm: 'liquid',
          physicalFormRu: 'Домашнее приготовление',
          isHomemade: true,
          customColor: '#fef9c3',
          visuals: {
            ...(oilWrap.state.attributes?.visuals || {}),
            color: '#fef9c3',
          },
          isOpened: true,
          customEffects: { hunger: 40, energy: 18, soothePanic: 18 },
          customTasteMessages: ['Нежный густой домашний майонез из свежих яиц и масла.'],
        },
      };

      const updatedVessel = applyEffectiveFluidToItem(oilVessel, nextVesselState, oilWrap.temperatureC);
      if (updatedVessel.fluidStorage) syncItemContainerProperties(updatedVessel);

      const outs: InteractionSlotGrid4 = [updatedVessel, null, null, null];
      let slotPtr = 1;
      if (whiskTool && slotPtr < 4) {
        outs[slotPtr++] = cloneInventoryItem(whiskTool);
      }
      for (const p of preservedOutputs) {
        if (slotPtr < 4) outs[slotPtr++] = p;
      }

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Взбивание домашнего майонеза',
        subtitle: `Состав: ${ingredients.join(', ')} (${finalMl} мл)`,
        actionLabel: 'Взбить домашний майонез',
        previewOutputs: outs,
        transferDetails: [],
        matchedRecipeId: 'craft_homemade_mayo',
      };
    },
  },
  {
    id: 'craft_homemade_fresh_juice',
    title: 'Домашний свежевыжатый сок (ручной отжим)',
    category: 'cooking',
    description:
      'Выжмите сочные цитрусовые, ягоды, гранат или фрукты в стакан, кружку или бутылку (либо в любую ёмкость с помощью ножа/ложки). Состав и цвет сока зависят строго от отжатых плодов.',
    actionLabel: 'Отжать свежий сок',
    ingredients: [
      {
        itemIds: ['cup', 'mug', 'cup_disposable', 'paper_cup', 'bottle_plastic_500', 'bottle_glass_large'],
        label: 'Пустая (или с соком) кружка / стакан / бутылка',
      },
      {
        itemIds: ['orange_whole', 'lemon_whole', 'apple_whole', 'pomegranate_whole', 'watermelon_whole', 'tomato_whole'],
        label: 'Сочный свежий плод (цитрус, ягода, фрукт, томат)',
      },
    ],
    resultsSummary: ['Домашний свежевыжатый сок (100% прямой ручной отжим без сахара и концентрата)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length < 2 || present.length > 4) return null;

      const pressTool = present.find((x) =>
        itemMatchesAnyId(x, ['kitchen_knife', 'knife_hunting', 'spoon', 'kitchen_spoon_steel', 'kitchen_spoon_wooden'])
      );

      const isDrinkCupOrBottle = (id: string) =>
        id === 'cup' ||
        id === 'mug' ||
        id === 'cup_disposable' ||
        id === 'paper_cup' ||
        id.includes('mug') ||
        id.includes('cup') ||
        id.includes('bottle');

      const vessel = present.find((x) => {
        const w = getEffectiveFluidWrapper(x);
        if (!w || !w.isOpened || w.isGranularContainer) return false;
        if (w.state.currentMl > 0 && w.state.liquidId !== 'juice') return false;
        const freeMl = w.state.maxMl - w.state.currentMl - getContainerSolidVolumeMl(x);
        if (freeMl < 15) return false;
        // Without a pressing tool, only squeeze directly into drinking vessels (cups/mugs/bottles)
        // so placing apples/berries into a pot or jar still lets you boil compote/jam/puree!
        if (!pressTool && !isDrinkCupOrBottle(x.itemId)) return false;
        return true;
      });
      if (!vessel) return null;

      const juicyFruits: InventoryItem[] = [];
      for (const item of present) {
        if (item === vessel || item === pressTool) continue;
        if (item.fluidStorage) return null;
        const prod = item.produceAttributes;
        const speciesId = (prod?.speciesId || item.itemId || '').toLowerCase();
        const spec = PRODUCE_SPECIES_SPECS[speciesId];
        const juiciness = prod?.juiciness ?? spec?.defaultJuiciness ?? 0;
        const cat = prod?.produceCategory || spec?.produceCategory;
        const isJuicyAllowed =
          juiciness >= 45 &&
          !prod?.isDried &&
          (cat === 'citrus' ||
            cat === 'berry' ||
            cat === 'fruit' ||
            speciesId === 'tomato_whole' ||
            speciesId === 'tomato_cherry_single' ||
            speciesId === 'carrot_whole');
        if (!isJuicyAllowed) return null;
        juicyFruits.push(item);
      }

      if (juicyFruits.length === 0) return null;

      const wrap = getEffectiveFluidWrapper(vessel)!;
      const freeMl = Math.max(0, wrap.state.maxMl - wrap.state.currentMl - getContainerSolidVolumeMl(vessel));
      let yieldMl = 0;
      const fruitNames: string[] = [];
      let juiceColor = wrap.state.attributes?.customColor || '#f59e0b';
      let colorPicked = wrap.state.currentMl > 0;

      for (const f of juicyFruits) {
        const prod = f.produceAttributes;
        const speciesId = (prod?.speciesId || f.itemId || '').toLowerCase();
        const spec = PRODUCE_SPECIES_SPECS[speciesId];
        const grams = prod?.weightGrams || Math.round((f.weight || 0.12) * 1000);
        const juiciness = prod?.juiciness ?? spec?.defaultJuiciness ?? 65;
        yieldMl += Math.max(12, Math.round(grams * (juiciness / 100) * 0.62));
        const clean = f.nameRu.replace(/\s*\([^)]*\)\s*/g, '').trim();
        fruitNames.push(clean);
        if (!colorPicked) {
          const c = prod?.color || spec?.fleshColor || spec?.color || f.attributes?.customColor;
          if (c) {
            juiceColor = c;
            colorPicked = true;
          }
        }
      }

      const addedMl = Math.min(freeMl, Math.max(12, yieldMl));
      const finalMl = wrap.state.currentMl + addedMl;
      const uniqueFruits = Array.from(new Set(fruitNames));
      const prevIngs = Array.isArray(wrap.state.attributes?.ingredients)
        ? wrap.state.attributes!.ingredients!
        : [];
      const allIngs = Array.from(
        new Set([...prevIngs, ...uniqueFruits.map((n) => `${n} (прямой ручной отжим)`)])
      );
      const varietyRu = `Домашний свежевыжатый сок (${uniqueFruits.slice(0, 2).join(', ')})`;

      const nextState: FluidContainerState = {
        ...wrap.state,
        liquidId: 'juice',
        currentMl: finalMl,
        components: [{ liquidId: 'juice', ml: finalMl, labelRu: varietyRu, color: juiceColor }],
        homemadeRecipeId: 'homemade_fresh_juice',
        homemadeProgress: 1,
        attributes: {
          varietyRu,
          ingredients: allIngs,
          sourceIngredients: allIngs,
          preparationMethod: 'Домашний ручной холодный отжим свежих плодов',
          purpose: 'Натуральный витаминный напиток прямого отжима',
          reasonAndOrigin: 'Отжато дома вручную из свежих плодов без сахара, воды, пастеризации и концентратов.',
          physicalForm: 'liquid',
          physicalFormRu: 'Свежевыжатый домашний сок',
          isHomemade: true,
          customColor: juiceColor,
          visuals: {
            ...(wrap.state.attributes?.visuals || {}),
            color: juiceColor,
          },
          isOpened: true,
          customEffects: { thirst: 48, hunger: 12, health: 14, energy: 16, soothePanic: 22 },
          customTasteMessages: [`Яркий свежий вкус натурального домашнего сока (${uniqueFruits.join(', ')}).`],
        },
      };

      const updatedVessel = applyEffectiveFluidToItem(vessel, nextState, wrap.temperatureC);
      if (updatedVessel.fluidStorage) syncItemContainerProperties(updatedVessel);

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Ручной отжим свежего сока',
        subtitle: `${uniqueFruits.join(' + ')} → ${varietyRu} (+${addedMl} мл)`,
        actionLabel: 'Отжать свежий сок',
        previewOutputs: [updatedVessel, pressTool ? cloneInventoryItem(pressTool) : null, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_homemade_fresh_juice',
      };
    },
  },
  {
    id: 'guide_homemade_stove_liquids',
    title: 'Домашняя варка жидкостей на плите (бульоны, варенье, сгущёнка, гхи, соусы)',
    category: 'cooking',
    description:
      'Соберите продукты в кастрюле или сковороде и поставьте на плиту: вода + мясо/кости/рыба/грибы/овощи → домашний бульон; ягоды/фрукты + сахар → варенье; молоко + сахар → домашняя сгущёнка; сливочное масло или жир на сухой сковороде → топлёное масло Гхи / смалец; кабачки или баклажаны → овощная икра; томаты + специи → домашний кетчуп или томатная паста; соевый соус + сахар/мёд → Терияки; вода + ягоды/фрукты → компот/морс; вода + чай/травы/кофе → заваренный чай и кофе.',
    actionLabel: 'Варить на плите',
    ingredients: [
      { itemIds: ['pot', 'frying_pan', 'kettle'], label: 'Кастрюля / Сковорода / Чайник' },
      { itemIds: ['drinking_water', 'milk', 'sugar', 'butter_brick_salted'], label: 'Натуральные продукты без фабричных добавок' },
    ],
    resultsSummary: ['Домашняя жидкость с составом строго из ваших продуктов'],
  },
  {
    id: 'guide_homemade_ferment_pickles',
    title: 'Домашние соленья, квашения, квас, простокваша и закваска',
    category: 'cooking',
    description:
      'Без плиты или в тепле: капуста + соль → квашеная капуста в собственном соку; вода + соль/уксус + огурцы/грибы/овощи → домашние соленья и маринады; вода + хлеб + сахар/мёд → домашний хлебный квас; молоко + сметана/кефир/лимон → простокваша (а её подогрев до 65–80°C даёт домашний творог); мука + вода в тепле → живая хлебная закваска.',
    actionLabel: 'Настаивать в таре',
    ingredients: [
      { itemIds: ['jar_glass_large', 'jar_glass_medium', 'pot', 'bowl'], label: 'Банка / Кастрюля / Миска' },
      { itemIds: ['drinking_water', 'salt', 'vinegar_table', 'dough'], label: 'Вода, соль, уксус, хлеб, молоко или овощи' },
    ],
    resultsSummary: ['Домашние заготовки и ферментированные напитки с натуральным составом'],
  },
  {
    id: 'guide_dough_kneading',
    title: 'Замес домашнего теста из любых продуктов и пропорций',
    category: 'cooking',
    description:
      'Положите в сетку муку (пшеничную, ржаную, кукурузную, рисовую, овсянку, манку, крахмал, творог или отварной картофель) + любую жидкость/связку (воду, молоко, кефир, простоквашу, сметану, закваску, яйца, масло, бульон, пиво, квас, сок) и любые добавки (сахар, соль, шоколад/какао, ягоды, свёклу, морковь, зелень, сыр). От пропорций и слотов дозировки напрямую зависят тип теста (блинное, крутое пельменное, яичное, песочное, сдобное, ржаное, творожное), цвет, гидратация, эластичность и подъём. Можно также замесить из миски с уже налитой смесью или вмесить добавки в готовый комок.',
    actionLabel: 'Замесить тесто',
    ingredients: [
      { itemIds: ['flour_wheat', 'flour_rye', 'flour_corn', 'flour_rice'], label: 'Мука / основа (в любом количестве)' },
      { itemIds: ['drinking_water', 'milk', 'eggs_chicken', 'butter_brick_salted'], label: 'Вода, молоко, яйца, масло, закваска и добавки' },
    ],
    resultsSummary: ['Домашнее тесто с реальным составом, цветом, весом и характеристиками'],
  },
  {
    id: 'guide_dough_rolling_shaping_filling',
    title: 'Скалка, формовка по слотам, нарезка, начинка и выпечка',
    category: 'cooking',
    description:
      '1) Скалка + тесто — раскатывает пласт тоньше и шире (узорная скалка отпечатывает орнамент) и увеличивает вместимость начинки. 2) Нож + тесто — режет по процентным клеткам (тонкий пласт в слоте «Всё» → домашняя лапша). 3) Положите сырое тесто одно в разные слоты сетки 2×2 или 4×4, чтобы вылепить нужную форму (колобок, лепёшка, пласт, булочка, буханка, косичка, бублик, рогалик, открытый пирог, рулет, пирожок, вареник, хинкали, клёцки). 4) Положите начинку к раскатанному тесту (если вместится по весу), затем переложите в слот сворачивания и сварите, пожарьте или испеките в духовке.',
    actionLabel: 'Формовать и готовить',
    ingredients: [
      { itemIds: ['dough'], label: 'Домашнее тесто' },
      { itemIds: ['rolling_pin', 'kitchen_knife'], label: 'Скалка / Нож / Начинка' },
    ],
    resultsSummary: ['Готовые пирожки, вареники, хлеб, пицца, лапша, блины, рулеты и булочки'],
  },
];

export function getActiveInteractionCraftRecipes(): InteractionCraftRecipe[] {
  return INTERACTION_CRAFT_RECIPES.filter((recipe) =>
    recipe.ingredients.every(
      (ing) => !ing.itemIds || ing.itemIds.length === 0 || ing.itemIds.some((id) => isRegisteredItemId(id))
    )
  );
}

function canItemActAsTargetReceiver(item: InventoryItem | null): boolean {
  if (!item) return false;
  const fluidWrap = getEffectiveFluidWrapper(item);
  if (fluidWrap && fluidWrap.isOpened) return true;
  const probe = cloneInventoryItem(item);
  ensureHybridContainerProps(probe);
  return Boolean(probe.isContainer && !probe.singleUseContainer && !isFluidContainerClosed(probe));
}

/**
 * Pairs ALL occupied source slots strictly above the bottom-most receiver row
 * with their matching target container (same column first, otherwise nearest receiver).
 * When a single receiver sits below multiple items/containers, EVERY upper source transfers into it in one action.
 */
function buildTransferPairsForGrid(
  inputs: (InventoryItem | null)[],
  cols: number,
  rows: number
): [number, number][] {
  const occupied: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    if (inputs[i]) occupied.push(i);
  }
  if (occupied.length < 2) return [];

  let targetRow = -1;
  let targetSlots: number[] = [];
  for (let r = rows - 1; r >= 1; r--) {
    const rowReceivers: number[] = [];
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (inputs[idx] && canItemActAsTargetReceiver(inputs[idx])) {
        rowReceivers.push(idx);
      }
    }
    if (rowReceivers.length > 0 && occupied.some((idx) => Math.floor(idx / cols) < r)) {
      targetRow = r;
      targetSlots = rowReceivers;
      break;
    }
  }
  if (targetRow < 1 || targetSlots.length === 0) return [];

  const pairs: [number, number][] = [];
  for (const srcIdx of occupied) {
    const srcRow = Math.floor(srcIdx / cols);
    if (srcRow >= targetRow) continue;
    const srcCol = srcIdx % cols;

    let bestTarget = targetSlots.find((tIdx) => tIdx % cols === srcCol);
    if (bestTarget === undefined) {
      bestTarget = targetSlots.reduce((best, cand) => {
        const dCand = Math.abs((cand % cols) - srcCol);
        const dBest = Math.abs((best % cols) - srcCol);
        return dCand < dBest ? cand : best;
      }, targetSlots[0]);
    }
    pairs.push([srcIdx, bestTarget]);
  }
  return pairs;
}

function summarizeBatchTransfers(
  details: InteractionTransferDetail[],
  anyMixture: boolean,
  anyLiquidPour: boolean,
  anyDiscreteTransfer: boolean
): {
  kind: 'pour_liquid' | 'mix_liquid' | 'transfer_items';
  title: string;
  subtitle: string;
  actionLabel: string;
} {
  const firstDetail = details[0];
  const lastDetail = details[details.length - 1];
  const multi = details.length > 1;
  const shownAmounts = details
    .slice(0, 3)
    .map((d) => d.transferredAmountLabel)
    .join(' · ');
  const moreSuffix = details.length > 3 ? ` (+${details.length - 3})` : '';

  if (anyMixture) {
    return {
      kind: 'mix_liquid',
      title: multi
        ? `Смешивание и наполнение (${details.length})`
        : lastDetail.mixtureName
        ? `Смешивание: ${lastDetail.mixtureName}`
        : 'Смешивание жидкостей / сыпучих веществ',
      subtitle: `${shownAmounts}${moreSuffix} → ${lastDetail.resultingTargetLabel}`,
      actionLabel: 'Перелить и смешать',
    };
  }
  if (anyLiquidPour && anyDiscreteTransfer) {
    return {
      kind: 'pour_liquid',
      title: `Переливание и укладка в тару (${details.length})`,
      subtitle: `${shownAmounts}${moreSuffix} → ${lastDetail.resultingTargetLabel}`,
      actionLabel: 'Перелить и уложить',
    };
  }
  if (anyLiquidPour) {
    return {
      kind: 'pour_liquid',
      title: multi
        ? `Переливание из ${details.length} ёмкостей`
        : 'Переливание / пересыпание из верхней тары в нижнюю',
      subtitle: multi
        ? `${shownAmounts}${moreSuffix} → ${lastDetail.resultingTargetLabel}`
        : `${firstDetail.transferredAmountLabel} · ${firstDetail.remainingSourceLabel}`,
      actionLabel: 'Перелить / Пересыпать',
    };
  }
  return {
    kind: 'transfer_items',
    title: multi
      ? `Укладка в тару (${details.length} поз.)`
      : 'Пересыпание / укладка предметов в нижнюю тару',
    subtitle: `${shownAmounts}${moreSuffix} → ${lastDetail.resultingTargetLabel}`,
    actionLabel: 'Пересыпать в тару',
  };
}

function isCuttableProduceItem(item: InventoryItem | null): boolean {
  if (!item?.produceAttributes) return false;
  if (item.produceAttributes.edible === false) return false;
  return item.produceAttributes.cutForm !== 'peel' && item.produceAttributes.cutForm !== 'core';
}

function isPluckableBranchItem(item: InventoryItem | null): boolean {
  return Boolean(
    item &&
      item.itemId === 'plant_branch' &&
      item.branchAttributes?.attachedFruit &&
      item.branchAttributes.attachedFruit.count > 0
  );
}

function packOutputsIntoSlots(items: InventoryItem[], gridSize: 4 | 16): (InventoryItem | null)[] {
  const result: (InventoryItem | null)[] = Array.from({ length: gridSize }, () => null);
  let list = items;
  if (list.length > gridSize) {
    // Merge identical cut pieces into grouped counts so nothing is lost when output count exceeds grid slots;
    // addItemToPlayer automatically unstacks count > 1 into standalone items with cloned attributes.
    const compacted: InventoryItem[] = [];
    for (const it of list) {
      const existing = it.produceAttributes
        ? compacted.find(
            (c) =>
              c.itemId === it.itemId &&
              c.produceAttributes?.cutForm === it.produceAttributes?.cutForm &&
              c.produceAttributes?.part === it.produceAttributes?.part &&
              c.produceAttributes?.varietyRu === it.produceAttributes?.varietyRu
          )
        : it.meatAttributes
        ? compacted.find(
            (c) =>
              c.itemId === it.itemId &&
              c.meatAttributes?.cutForm === it.meatAttributes?.cutForm &&
              c.meatAttributes?.hasBone === it.meatAttributes?.hasBone &&
              c.meatAttributes?.hasSkin === it.meatAttributes?.hasSkin &&
              Math.abs((c.meatAttributes?.weightGrams || 0) - (it.meatAttributes?.weightGrams || 0)) <=
                Math.max(25, Math.round((it.meatAttributes?.weightGrams || 0) * 0.2))
          )
        : it.doughAttributes
        ? compacted.find(
            (c) =>
              c.itemId === it.itemId &&
              c.doughAttributes?.shape === it.doughAttributes?.shape &&
              c.doughAttributes?.cookState === it.doughAttributes?.cookState &&
              c.doughAttributes?.doughType === it.doughAttributes?.doughType &&
              Math.abs((c.doughAttributes?.weightGrams || 0) - (it.doughAttributes?.weightGrams || 0)) <= 15
          )
        : !it.isContainer && !it.fluidStorage
        ? compacted.find(
            (c) =>
              c.itemId === it.itemId &&
              !c.produceAttributes &&
              !c.meatAttributes &&
              !c.doughAttributes &&
              !c.isContainer &&
              !c.fluidStorage &&
              Math.abs((c.weight || 0) - (it.weight || 0)) <= 0.025
          )
        : undefined;
      if (existing) {
        existing.count = (existing.count || 1) + (it.count || 1);
        existing.maxStack = Math.max(existing.maxStack || 1, existing.count);
      } else {
        compacted.push(it);
      }
    }
    list = compacted;
  }
  for (let i = 0; i < Math.min(gridSize, list.length); i++) {
    result[i] = list[i];
  }
  return result;
}

function isCuttableDoughItem(item: InventoryItem | null): boolean {
  return Boolean(item && item.itemId === 'dough' && item.doughAttributes && item.doughAttributes.weightGrams >= 25);
}

/**
 * Solid food blocks that can be sliced with a knife (butter bricks, cheese blocks/wheels/wedges/balls/braids,
 * bread loaves, chocolate bars, boiled eggs, beeswax bars, and other solid non-container food items >= 15 g).
 */
function isCuttableSolidFoodItem(item: InventoryItem | null): boolean {
  if (!item) return false;
  if (
    item.produceAttributes ||
    item.meatAttributes ||
    item.doughAttributes ||
    item.itemId === 'dough' ||
    item.itemId === 'plant_branch'
  ) {
    return false;
  }
  if (item.isContainer || item.fluidStorage) return false;
  if (item.itemId === 'egg_raw') return false;
  const isFoodOrWax = item.category === 'food' || item.itemId === 'beeswax_bar';
  if (!isFoodOrWax) return false;
  const weightGrams = Math.round((item.weight || 0) * 1000);
  return weightGrams >= 15;
}

/**
 * Single-item food packaging (e.g. paper_packaging_small with butter_brick_salted, paper_packaging with cheese,
 * chocolate_pack, vacuum_pack, tray_sealed_food) that contains 1 cuttable food item inside.
 */
function isCuttablePackagedFoodItem(item: InventoryItem | null): boolean {
  if (!item || !item.isContainer || item.fluidStorage) return false;
  if (!item.contents || item.contents.length !== 1) return false;
  const id = item.itemId;
  const isFoodPackage =
    Boolean(item.singleUseContainer) ||
    id.startsWith('paper_packaging') ||
    id.startsWith('chocolate_pack') ||
    id.startsWith('vacuum_pack') ||
    id.startsWith('tray_sealed_food');
  if (!isFoodPackage) return false;
  const inner = item.contents[0];
  return (
    isCuttableSolidFoodItem(inner) ||
    isCuttableProduceItem(inner) ||
    isCuttableMeatItem(inner) ||
    isCuttableDoughItem(inner)
  );
}

function getCleanSolidFoodBaseNameRu(item: InventoryItem): string {
  let raw = (item.nameRu || '').trim();
  // Remove trailing cut/weight parentheticals like "(ломтик, 40 г)", "(кусок, 150 г)", "(200 г)", "(брусок)", "(косичка)"
  for (let i = 0; i < 3; i++) {
    const next = raw
      .replace(
        /\s*\((?:(?:ломтик|кусок|кусочек|брусок|долька|плитка|половинка|часть|косичка|шарик|клин|блок|круг)(?:[,\s]+\d+\s*г)?|\d+\s*г)\)\s*$/i,
        ''
      )
      .trim();
    if (next === raw) break;
    raw = next;
  }
  raw = raw.replace(/^(?:Круг|Клин|Шарик|Блок|Головка|Брусок)\s+сыра\s+/i, 'Сыр ');
  return raw || (item.nameRu || '').trim();
}

function scaleSolidFoodPiece(
  source: InventoryItem,
  targetGrams: number,
  mode: 'slice' | 'remainder'
): InventoryItem {
  const curGrams = Math.max(1, Math.round((source.weight || 0.1) * 1000));
  const clampedGrams = Math.max(5, Math.round(targetGrams));
  const ratio = Math.max(0.02, Math.min(1, clampedGrams / curGrams));

  const piece = cloneInventoryItem(source);
  piece.count = 1;
  piece.weight = Number((clampedGrams / 1000).toFixed(3));
  piece.volume = Number(Math.max(0.01, (source.volume || 0.1) * ratio).toFixed(3));

  if (piece.effects) {
    const nextEffects = { ...piece.effects };
    if (typeof nextEffects.hunger === 'number') {
      nextEffects.hunger = Math.max(1, Math.round(nextEffects.hunger * ratio));
    }
    if (typeof nextEffects.thirst === 'number') {
      nextEffects.thirst = Math.round(nextEffects.thirst * ratio);
    }
    if (typeof nextEffects.health === 'number') {
      nextEffects.health = Math.round(nextEffects.health * ratio);
    }
    if (typeof nextEffects.fatigue === 'number') {
      nextEffects.fatigue = Math.round(nextEffects.fatigue * ratio);
    }
    if (typeof nextEffects.stress === 'number') {
      nextEffects.stress = Math.round(nextEffects.stress * ratio);
    }
    piece.effects = nextEffects;
  }

  if (piece.nutrients) {
    piece.nutrients = {
      calories: Math.max(1, Math.round(piece.nutrients.calories * ratio)),
      proteins: Number((piece.nutrients.proteins * ratio).toFixed(1)),
      fats: Number((piece.nutrients.fats * ratio).toFixed(1)),
      carbs: Number((piece.nutrients.carbs * ratio).toFixed(1)),
      ...(typeof piece.nutrients.sugar === 'number'
        ? { sugar: Number((piece.nutrients.sugar * ratio).toFixed(1)) }
        : {}),
      ...(typeof piece.nutrients.salt === 'number'
        ? { salt: Number((piece.nutrients.salt * ratio).toFixed(1)) }
        : {}),
    };
  }

  if (typeof piece.portions === 'number') {
    const nextPortions = clampedGrams <= 45 ? 1 : Math.max(1, Math.round(piece.portions * ratio));
    piece.portions = nextPortions;
    piece.maxPortions = Math.max(1, nextPortions);
  }

  if (piece.chocolateAttributes) {
    const remP = Math.max(1, Math.round((piece.chocolateAttributes.remainingPieces || 1) * ratio));
    piece.chocolateAttributes = {
      ...piece.chocolateAttributes,
      weightGrams: clampedGrams,
      remainingPieces: remP,
      totalPieces: Math.max(remP, piece.chocolateAttributes.totalPieces || remP),
    };
  }

  const baseName = getCleanSolidFoodBaseNameRu(source);
  const idLow = (source.originalCatalogId || source.itemId || '').toLowerCase();
  const nameLow = baseName.toLowerCase();

  let formWord = mode === 'slice' && clampedGrams <= 85 ? 'кусочек' : 'кусок';
  if (idLow.includes('butter') || nameLow.includes('масло сливоч') || nameLow.includes('сливочное масло')) {
    formWord = clampedGrams <= 75 ? 'ломтик' : 'брусок';
  } else if (idLow.includes('cheese') || nameLow.includes('сыр')) {
    formWord = clampedGrams <= 95 ? 'ломтик' : 'кусок';
  } else if (idLow.includes('choc') || piece.chocolateAttributes || nameLow.includes('шоколад')) {
    formWord = clampedGrams <= 55 ? 'долька' : 'плитка';
  } else if (idLow === 'egg_boiled' || nameLow.includes('яйцо')) {
    formWord = 'долька';
  }

  piece.nameRu = `${baseName} (${formWord}, ${clampedGrams} г)`;
  piece.attributes = {
    ...(piece.attributes || {}),
    cutFormRu: formWord,
    weightGrams: clampedGrams,
  };

  return piece;
}

function computeKnifeCutForSolidFood(
  source: InventoryItem,
  dosageFraction: number,
  applyJitter: boolean
): {
  outputs: InventoryItem[];
  title: string;
  subtitle: string;
  actionLabel: string;
} | null {
  if (!isCuttableSolidFoodItem(source)) return null;
  const curW = Math.max(1, Math.round((source.weight || 0.1) * 1000));
  if (curW < 15) return null;

  const baseName = getCleanSolidFoodBaseNameRu(source);
  const isFullCut = dosageFraction >= 0.999;

  if (isFullCut) {
    const pieceCount = curW >= 320 ? 4 : curW >= 90 ? 4 : curW >= 45 ? 3 : 2;
    const basePieceG = Math.max(5, Math.floor(curW / pieceCount));
    const outputs: InventoryItem[] = [];
    let allocated = 0;
    for (let i = 0; i < pieceCount; i++) {
      const g = i === pieceCount - 1 ? Math.max(5, curW - allocated) : basePieceG;
      allocated += g;
      outputs.push(scaleSolidFoodPiece(source, g, 'slice'));
    }
    return {
      outputs,
      title: `Нарезка: ${baseName} → ×${pieceCount}`,
      subtitle: `${pieceCount} шт. по ~${basePieceG} г`,
      actionLabel: `Нарезать (×${pieceCount})`,
    };
  }

  let effFrac = Math.max(0.08, Math.min(0.92, dosageFraction));
  if (applyJitter) {
    const jitter = 1 + (Math.random() * 0.1 - 0.05);
    effFrac = Math.max(0.05, Math.min(0.95, effFrac * jitter));
  }

  const cutGrams = Math.max(5, Math.min(curW - 5, Math.round(curW * effFrac)));
  const remGrams = Math.max(5, curW - cutGrams);

  const slicePiece = scaleSolidFoodPiece(source, cutGrams, 'slice');
  const remPiece = scaleSolidFoodPiece(source, remGrams, 'remainder');
  const pctLabel = Math.round(dosageFraction * 100);

  return {
    outputs: [slicePiece, remPiece],
    title: `Отрезать ~${pctLabel}%: ${baseName}`,
    subtitle: `Отрезано: ${cutGrams} г · Остаток: ${remGrams} г`,
    actionLabel: `Отрезать (${cutGrams} г)`,
  };
}

function computeKnifeCutForPackagedFood(
  wrapperItem: InventoryItem,
  dosageFraction: number,
  applyJitter: boolean
): {
  outputs: InventoryItem[];
  title: string;
  subtitle: string;
  actionLabel: string;
  isMeat: boolean;
  isDough: boolean;
} | null {
  if (!isCuttablePackagedFoodItem(wrapperItem) || !wrapperItem.contents || wrapperItem.contents.length !== 1) {
    return null;
  }
  const inner = wrapperItem.contents[0];
  const isMeat = isCuttableMeatItem(inner);
  const isDough = !isMeat && isCuttableDoughItem(inner);
  const isProduce = !isMeat && !isDough && isCuttableProduceItem(inner);

  const innerRes = isMeat
    ? computeKnifeCutForMeat(inner, dosageFraction, applyJitter, (id) => createItem(id, 1, undefined, true))
    : isDough
    ? cutDoughWithKnife(inner, dosageFraction, applyJitter)
    : isProduce
    ? computeKnifeCutForProduce(inner, dosageFraction, applyJitter)
    : computeKnifeCutForSolidFood(inner, dosageFraction, applyJitter);

  if (!innerRes || innerRes.outputs.length === 0) return null;

  const isFullCut = dosageFraction >= 0.999;
  if (!isFullCut && innerRes.outputs.length === 2) {
    // Partial cut from package: return the sliced piece out of the package + keep the remaining block inside the opened package
    const [cutSlice, remBlock] = innerRes.outputs;
    const openedWrapper = cloneInventoryItem(wrapperItem);
    openedWrapper.isOpen = true;
    openedWrapper.contents = [remBlock];
    recalculateContainerWeight(openedWrapper);
    syncItemContainerProperties(openedWrapper);
    return {
      outputs: [cutSlice, openedWrapper],
      title: innerRes.title,
      subtitle: `${innerRes.subtitle} (остаток в упаковке)`,
      actionLabel: innerRes.actionLabel,
      isMeat,
      isDough,
    };
  }

  // Full cut (Slot 0 "Всё"): unpack and slice all pieces
  return {
    outputs: innerRes.outputs,
    title: innerRes.title,
    subtitle: innerRes.subtitle,
    actionLabel: innerRes.actionLabel,
    isMeat,
    isDough,
  };
}

function tryEvaluateKnifeCuttingAndBranchPlucking(
  inputs: (InventoryItem | null)[],
  gridSize: 4 | 16,
  applyPourJitter: boolean
): {
  isValid: true;
  kind: 'craft_recipe';
  title: string;
  subtitle: string;
  actionLabel: string;
  previewOutputs: (InventoryItem | null)[];
  transferDetails: InteractionTransferDetail[];
  matchedRecipeId: string;
} | null {
  const dosageLimit = gridSize === 4 ? 2 : 12;
  const entries: { slot: number; item: InventoryItem }[] = [];
  for (let i = 0; i < gridSize; i++) {
    if (inputs[i]) entries.push({ slot: i, item: inputs[i]! });
  }
  if (entries.length === 0) return null;

  const knives = entries.filter((e) => isKnifeTool(e.item));
  const others = entries.filter((e) => !isKnifeTool(e.item));

  // Case 1: Knife + 1 or more produce items, meat/poultry/fish/seafood cuts, dough items, solid food blocks (butter/cheese/bread/chocolate), packaged foods, or pluckable plant_branches
  if (knives.length === 1 && others.length >= 1) {
    const allTargetsValid = others.every(
      (e) =>
        isCuttableProduceItem(e.item) ||
        isPluckableBranchItem(e.item) ||
        isCuttableMeatItem(e.item) ||
        isCuttableDoughItem(e.item) ||
        isCuttableSolidFoodItem(e.item) ||
        isCuttablePackagedFoodItem(e.item)
    );
    if (!allTargetsValid) return null;

    const knifeEntry = knives[0];
    const produced: InventoryItem[] = [cloneInventoryItem(knifeEntry.item)];
    const subtitles: string[] = [];
    const cutDetails: InteractionTransferDetail[] = [];
    let singleRes: ReturnType<typeof computeKnifeCutForProduce> = null;
    let hasMeatTarget = false;
    let hasDoughTarget = false;

    for (const target of others) {
      const activeDosageSlot =
        target.slot < dosageLimit
          ? target.slot
          : knifeEntry.slot < dosageLimit
          ? knifeEntry.slot
          : null;
      const dosageFraction =
        activeDosageSlot !== null ? getSlotPourDosageFraction(activeDosageSlot, gridSize) : 0.5;

      const isBranch = isPluckableBranchItem(target.item);
      const isPackaged = !isBranch && isCuttablePackagedFoodItem(target.item);
      const isMeat = !isBranch && !isPackaged && isCuttableMeatItem(target.item);
      const isDough = !isBranch && !isPackaged && !isMeat && isCuttableDoughItem(target.item);
      const isSolidFood =
        !isBranch && !isPackaged && !isMeat && !isDough && isCuttableSolidFoodItem(target.item);
      if (isMeat) hasMeatTarget = true;
      if (isDough) hasDoughTarget = true;

      let cutRes: ReturnType<typeof computeKnifeCutForProduce> = null;
      if (isBranch) {
        cutRes = computeBranchPluck(target.item, dosageFraction, applyPourJitter, true, (spId, attrs) =>
          createProduceItem(spId, attrs)
        );
      } else if (isPackaged) {
        const pkgRes = computeKnifeCutForPackagedFood(target.item, dosageFraction, applyPourJitter);
        if (pkgRes) {
          if (pkgRes.isMeat) hasMeatTarget = true;
          if (pkgRes.isDough) hasDoughTarget = true;
          cutRes = pkgRes;
        }
      } else if (isMeat) {
        cutRes = computeKnifeCutForMeat(target.item, dosageFraction, applyPourJitter, (id) =>
          createItem(id, 1, undefined, true)
        );
      } else if (isDough) {
        cutRes = cutDoughWithKnife(target.item, dosageFraction, applyPourJitter);
      } else if (isSolidFood) {
        cutRes = computeKnifeCutForSolidFood(target.item, dosageFraction, applyPourJitter);
      } else {
        cutRes = computeKnifeCutForProduce(target.item, dosageFraction, applyPourJitter);
      }

      if (!cutRes) return null;
      singleRes = cutRes;
      produced.push(...cutRes.outputs);
      subtitles.push(cutRes.subtitle);
      if (activeDosageSlot !== null) {
        const pctVal = Math.round(dosageFraction * 100);
        cutDetails.push({
          fromSlot: activeDosageSlot,
          toSlot: target.slot,
          sourceName: target.item.nameRu,
          targetName: knifeEntry.item.nameRu,
          transferredAmountLabel: dosageFraction >= 0.999 ? 'Всё' : `~${pctVal}%`,
          remainingSourceLabel: cutRes.actionLabel,
          resultingTargetLabel: cutRes.subtitle,
          dosagePct: pctVal,
          isApproximate: dosageFraction < 0.999,
        });
      }
    }

    const previewOutputs = packOutputsIntoSlots(produced, gridSize);
    if (others.length === 1 && singleRes) {
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: singleRes.title,
        subtitle: singleRes.subtitle,
        actionLabel: singleRes.actionLabel,
        previewOutputs,
        transferDetails: cutDetails,
        matchedRecipeId: isPluckableBranchItem(others[0].item)
          ? 'craft_pluck_plant_branch'
          : hasDoughTarget
          ? 'craft_knife_cut_dough'
          : hasMeatTarget
          ? 'craft_knife_cut_meat'
          : 'craft_knife_cut_produce',
      };
    }

    return {
      isValid: true,
      kind: 'craft_recipe',
      title: `Массовая нарезка ножом (${others.length} шт.)`,
      subtitle: subtitles.slice(0, 2).join(' · ') + (subtitles.length > 2 ? ` · ещё ${subtitles.length - 2}` : ''),
      actionLabel: `Нарезать всё (${others.length})`,
      previewOutputs,
      transferDetails: cutDetails,
      matchedRecipeId: hasDoughTarget
        ? 'craft_knife_cut_dough'
        : hasMeatTarget
        ? 'craft_knife_cut_meat'
        : 'craft_knife_cut_produce',
    };
  }

  // Case 2: Bare-hand plucking of plant_branch(es) without a knife
  if (knives.length === 0 && entries.length >= 1 && entries.every((e) => isPluckableBranchItem(e.item))) {
    const produced: InventoryItem[] = [];
    const subtitles: string[] = [];
    const pluckDetails: InteractionTransferDetail[] = [];
    let singleRes: ReturnType<typeof computeBranchPluck> = null;

    for (const target of entries) {
      const hasDosageSlot = target.slot < dosageLimit;
      const dosageFraction = hasDosageSlot ? getSlotPourDosageFraction(target.slot, gridSize) : 1.0;
      const pluckRes = computeBranchPluck(target.item, dosageFraction, applyPourJitter, false, (spId, attrs) =>
        createProduceItem(spId, attrs)
      );
      if (!pluckRes) return null;
      singleRes = pluckRes;
      produced.push(...pluckRes.outputs);
      subtitles.push(pluckRes.subtitle);
      if (hasDosageSlot) {
        const pctVal = Math.round(dosageFraction * 100);
        pluckDetails.push({
          fromSlot: target.slot,
          toSlot: target.slot,
          sourceName: target.item.nameRu,
          targetName: target.item.nameRu,
          transferredAmountLabel: dosageFraction >= 0.999 ? 'Всё' : `~${pctVal}%`,
          remainingSourceLabel: pluckRes.actionLabel,
          resultingTargetLabel: pluckRes.subtitle,
          dosagePct: pctVal,
          isApproximate: dosageFraction < 0.999,
        });
      }
    }

    const previewOutputs = packOutputsIntoSlots(produced, gridSize);
    if (entries.length === 1 && singleRes) {
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: singleRes.title,
        subtitle: singleRes.subtitle,
        actionLabel: singleRes.actionLabel,
        previewOutputs,
        transferDetails: pluckDetails,
        matchedRecipeId: 'craft_pluck_plant_branch',
      };
    }

    return {
      isValid: true,
      kind: 'craft_recipe',
      title: `Снятие плодов с веток (${entries.length} шт.)`,
      subtitle: subtitles.slice(0, 2).join(' · '),
      actionLabel: 'Сорвать плоды',
      previewOutputs,
      transferDetails: pluckDetails,
      matchedRecipeId: 'craft_pluck_plant_branch',
    };
  }

  return null;
}

const DOUGH_MIXING_VESSEL_IDS = new Set([
  'bowl',
  'pot',
  'saute_pan',
  'frying_pan',
  'plate',
  'mug',
  'cup',
  'pot_clay_small',
  'pot_clay_medium',
  'pot_clay_large',
  'jar_glass_small',
  'jar_glass_medium',
  'jar_glass_large',
  'bottle_empty',
  'soup_bowl_empty',
]);

function isRawDoughItem(item: InventoryItem | null | undefined): boolean {
  return Boolean(item && item.itemId === 'dough' && item.doughAttributes && item.doughAttributes.cookState === 'raw');
}

function getKneadingSlotFraction(slot: number, gridSize: 4 | 16): number {
  const dosageLimit = gridSize === 4 ? 2 : 12;
  if (slot < dosageLimit) {
    return getSlotPourDosageFraction(slot, gridSize);
  }
  return gridSize === 4 ? 0.5 : 0.25;
}

/**
 * Extracts dough ingredient contributions from a single grid entry (container/bottle/pack/egg-carton or solid item).
 * Returns `null` if the item is not a valid dough kneading ingredient (or is sealed/empty).
 */
function extractDoughIngredientFromEntry(
  item: InventoryItem,
  slot: number,
  gridSize: 4 | 16,
  applyPourJitter: boolean
): {
  entries: DoughIngredientEntry[];
  leftoverItem: InventoryItem | null;
  hasFlourBase: boolean;
  hasWetBinder: boolean;
  summaryLabel: string;
} | null {
  // Open egg carton -> take 1 egg (or 2 in slot 0)
  if (item.itemId === 'egg_carton_10' || item.itemId === 'egg_carton_10_open') {
    if (!item.isOpen && item.itemId !== 'egg_carton_10_open') return null;
    if (!item.contents || item.contents.length === 0) return null;
    const copy = cloneInventoryItem(item);
    const takeCount = slot === 0 && copy.contents!.length >= 2 ? 2 : 1;
    copy.contents!.splice(0, takeCount);
    recalculateContainerWeight(copy);
    return {
      entries: [
        {
          itemId: 'egg_raw',
          nameRu: 'Куриное яйцо',
          grams: takeCount * 55,
          role: 'egg',
          colorHex: '#f59e0b',
        },
      ],
      leftoverItem: copy,
      hasFlourBase: false,
      hasWetBinder: true,
      summaryLabel: `Яйцо ×${takeCount} (${takeCount * 55} г)`,
    };
  }

  // Fluid or dry granular container (flour bag, milk carton, water bottle, oil bottle, sugar pack, salt shaker, sourdough jar, etc.)
  const wrap = getEffectiveFluidWrapper(item);
  if (wrap && wrap.state.currentMl >= 3 && wrap.state.liquidId) {
    if (!wrap.isOpened) return null;
    const frac = getKneadingSlotFraction(slot, gridSize);
    const { amountMl } = computeDosedPourMl(wrap.state.currentMl, frac, applyPourJitter);
    if (amountMl < 3) return null;

    const comps =
      wrap.state.components && wrap.state.components.length > 0
        ? wrap.state.components
        : [
            {
              liquidId: wrap.state.liquidId,
              ml: wrap.state.currentMl,
              labelRu:
                wrap.state.attributes?.varietyRu ||
                LIQUID_REGISTRY[wrap.state.liquidId as LiquidId]?.nameRu ||
                item.nameRu,
              color:
                wrap.state.attributes?.customColor ||
                LIQUID_REGISTRY[wrap.state.liquidId as LiquidId]?.color ||
                '#f6eedb',
            },
          ];

    const totalCompMl = Math.max(1, comps.reduce((s, c) => s + Math.max(0, c.ml), 0));
    const entries: DoughIngredientEntry[] = [];
    let hasFlourBase = false;
    let hasWetBinder = false;

    for (const c of comps) {
      if (c.ml <= 0) continue;
      const portionMl = (amountMl * c.ml) / totalCompMl;
      if (portionMl < 1) continue;
      const singleOrigId =
        wrap.state.attributes?.culinaryEquivalentId || item.originalCatalogId || item.itemId;
      const prof = getFluidDoughProfile(
        c.liquidId,
        comps.length === 1 ? singleOrigId : c.liquidId,
        c.color,
        c.labelRu
      );
      if (!prof) return null;
      const isDry = isFluidStorageDryForm(wrap.state) || prof.role === 'flour' || prof.role === 'starch' || prof.role === 'sugar' || prof.role === 'salt';
      const grams = Math.max(1, Math.round(portionMl * (isDry ? 0.72 : 1.0)));
      if (prof.flourPct >= 30) hasFlourBase = true;
      if (prof.waterPct >= 15 || prof.fatPct >= 40 || prof.eggPct >= 50) hasWetBinder = true;
      entries.push({
        itemId: comps.length === 1 ? singleOrigId : c.liquidId,
        nameRu: (c.labelRu || LIQUID_REGISTRY[c.liquidId as LiquidId]?.nameRu || c.liquidId).replace(/\s*\([^)]*\)\s*$/g, '').trim(),
        grams,
        role: prof.role,
        colorHex: prof.colorHex,
      });
    }

    if (entries.length === 0) return null;

    const nextState: FluidContainerState = JSON.parse(JSON.stringify(wrap.state));
    const remMl = Math.max(0, Math.round(wrap.state.currentMl - amountMl));
    if (remMl <= 1) {
      nextState.currentMl = 0;
      nextState.liquidId = null;
      nextState.components = undefined;
      nextState.attributes = undefined;
    } else {
      const remRatio = remMl / Math.max(1, wrap.state.currentMl);
      nextState.currentMl = remMl;
      if (nextState.components) {
        nextState.components = nextState.components
          .map((c) => ({ ...c, ml: Math.max(0, Math.round(c.ml * remRatio)) }))
          .filter((c) => c.ml > 0);
      }
    }

    const updatedContainer = applyEffectiveFluidToItem(item, nextState, wrap.temperatureC);
    const totalUsedG = Math.round(entries.reduce((s, e) => s + e.grams, 0));
    return {
      entries,
      leftoverItem: updatedContainer,
      hasFlourBase,
      hasWetBinder,
      summaryLabel: `${entries[0].nameRu} (~${totalUsedG} г)`,
    };
  }

  // Opened wrapper/pack containing solid dough ingredients (e.g. opened butter pack, cheese wrap, chocolate foil)
  if (item.isContainer && item.isOpen && item.contents && item.contents.length > 0 && !item.fluidStorage) {
    const inner = item.contents[0];
    const innerProf = getSolidDoughProfile(inner);
    if (innerProf) {
      const dosageLimit = gridSize === 4 ? 2 : 12;
      const isPartialDosageSlot = slot > 0 && slot < dosageLimit;
      const frac = getKneadingSlotFraction(slot, gridSize);

      if (item.contents.length === 1 && isPartialDosageSlot && isCuttableSolidFoodItem(inner) && innerProf.role !== 'egg') {
        const innerG = Math.max(10, Math.round((inner.weight || 0.1) * 1000));
        if (innerG >= 25) {
          let effFrac = frac;
          if (applyPourJitter) {
            effFrac = Math.max(0.05, Math.min(0.95, effFrac * (1 + (Math.random() * 0.1 - 0.05))));
          }
          const takeG = Math.max(10, Math.min(innerG - 10, Math.round(innerG * effFrac)));
          const remG = innerG - takeG;
          const remPiece = scaleSolidFoodPiece(inner, remG, 'remainder');
          const copy = cloneInventoryItem(item);
          copy.contents = [remPiece];
          recalculateContainerWeight(copy);
          syncItemContainerProperties(copy);
          const cleanName = getCleanSolidFoodBaseNameRu(inner);
          return {
            entries: [
              {
                itemId: inner.originalCatalogId || inner.itemId,
                nameRu: cleanName,
                grams: takeG,
                role: innerProf.role,
                colorHex: innerProf.colorHex,
              },
            ],
            leftoverItem: copy,
            hasFlourBase: innerProf.flourPct >= 25,
            hasWetBinder: innerProf.waterPct >= 15 || innerProf.fatPct >= 40 || innerProf.eggPct >= 50,
            summaryLabel: `${cleanName} (~${takeG} г)`,
          };
        }
      }

      const takeCount = Math.max(1, Math.min(item.contents.length, Math.round(item.contents.length * frac)));
      const copy = cloneInventoryItem(item);
      const taken = copy.contents!.splice(0, takeCount);
      recalculateContainerWeight(copy);
      const totalG = taken.reduce(
        (sum, ch) =>
          sum +
          Math.max(
            10,
            Math.round(ch.produceAttributes?.weightGrams ?? (ch.weight ? ch.weight * 1000 : 100))
          ),
        0
      );
      const cleanName = getCleanSolidFoodBaseNameRu(inner);
      return {
        entries: [
          {
            itemId: inner.originalCatalogId || inner.itemId,
            nameRu: cleanName,
            grams: totalG,
            role: innerProf.role,
            colorHex: innerProf.colorHex,
          },
        ],
        leftoverItem: copy.contents && copy.contents.length > 0 ? copy : null,
        hasFlourBase: innerProf.flourPct >= 25,
        hasWetBinder: innerProf.waterPct >= 15 || innerProf.fatPct >= 40 || innerProf.eggPct >= 50,
        summaryLabel: `${cleanName} (${totalG} г)`,
      };
    }
  }

  // Discrete solid ingredient (egg, butter, cottage cheese, chocolate, cheese, berries, beet, carrot, boiled potato, herbs, etc.)
  const solidProf = getSolidDoughProfile(item);
  if (!solidProf) return null;
  if (item.isContainer && !item.isOpen && item.singleUseContainer) return null;

  const baseG = Math.max(
    10,
    Math.round(
      item.produceAttributes?.weightGrams ??
        (item.weight ? item.weight * 1000 : solidProf.role === 'egg' ? 55 : 100)
    )
  );
  const cleanName = getCleanSolidFoodBaseNameRu(item);
  const dosageLimit = gridSize === 4 ? 2 : 12;
  const isPartialDosageSlot = slot > 0 && slot < dosageLimit;

  if (isPartialDosageSlot && isCuttableSolidFoodItem(item) && solidProf.role !== 'egg' && baseG >= 25) {
    let effFrac = getSlotPourDosageFraction(slot, gridSize);
    if (applyPourJitter) {
      effFrac = Math.max(0.05, Math.min(0.95, effFrac * (1 + (Math.random() * 0.1 - 0.05))));
    }
    const takeG = Math.max(10, Math.min(baseG - 10, Math.round(baseG * effFrac)));
    const remG = baseG - takeG;
    const leftoverPiece = scaleSolidFoodPiece(item, remG, 'remainder');
    return {
      entries: [
        {
          itemId: item.originalCatalogId || item.itemId,
          nameRu: cleanName,
          grams: takeG,
          role: solidProf.role,
          colorHex: solidProf.colorHex,
        },
      ],
      leftoverItem: leftoverPiece,
      hasFlourBase: solidProf.flourPct >= 25,
      hasWetBinder: solidProf.waterPct >= 15 || solidProf.fatPct >= 40 || solidProf.eggPct >= 50,
      summaryLabel: `${cleanName} (~${takeG} г)`,
    };
  }

  return {
    entries: [
      {
        itemId: item.originalCatalogId || item.itemId,
        nameRu: cleanName,
        grams: baseG,
        role: solidProf.role,
        colorHex: solidProf.colorHex,
      },
    ],
    leftoverItem: null,
    hasFlourBase: solidProf.flourPct >= 25,
    hasWetBinder: solidProf.waterPct >= 15 || solidProf.fatPct >= 40 || solidProf.eggPct >= 50,
    summaryLabel: `${cleanName} (${baseG} г)`,
  };
}

function tryEvaluateDoughSystem(
  inputs: (InventoryItem | null)[],
  gridSize: 4 | 16,
  applyPourJitter: boolean
): {
  isValid: boolean;
  kind: 'none' | 'craft_recipe';
  title: string;
  subtitle: string;
  actionLabel: string;
  previewOutputs: (InventoryItem | null)[];
  transferDetails: InteractionTransferDetail[];
  matchedRecipeId?: string;
} | null {
  const dosageLimit = gridSize === 4 ? 2 : 12;
  const entries: { slot: number; item: InventoryItem }[] = [];
  for (let i = 0; i < gridSize; i++) {
    if (inputs[i]) entries.push({ slot: i, item: inputs[i]! });
  }
  if (entries.length === 0) return null;

  // Never hijack knife cutting
  if (entries.some((e) => isKnifeTool(e.item))) return null;

  const pins = entries.filter((e) => isRollingPinItem(e.item));
  const doughs = entries.filter((e) => e.item.itemId === 'dough' && Boolean(e.item.doughAttributes));
  const others = entries.filter((e) => !isRollingPinItem(e.item) && !(e.item.itemId === 'dough' && Boolean(e.item.doughAttributes)));

  // 1. ROLLING PIN + DOUGH (Раскатка скалкой по процентным слотам + узор!)
  if (pins.length === 1 && doughs.length >= 1 && others.length === 0) {
    const pinEntry = pins[0];
    const produced: InventoryItem[] = [cloneInventoryItem(pinEntry.item)];
    const subtitles: string[] = [];
    let singleRes: ReturnType<typeof rollDoughWithPin> = null;

    for (const d of doughs) {
      if (d.item.doughAttributes!.cookState !== 'raw') {
        return {
          isValid: false,
          kind: 'none',
          title: 'Готовую выпечку нельзя раскатать',
          subtitle: 'Скалка работает только с сырым незапечатанным тестом.',
          actionLabel: 'Нельзя раскатать',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }
      if (d.item.doughAttributes!.consistency === 'batter') {
        return {
          isValid: false,
          kind: 'none',
          title: 'Тесто слишком жидкое для скалки',
          subtitle: `Гидратация ${d.item.doughAttributes!.hydrationPct}% — вмешайте больше муки или сразу жарьте на сковороде как блины/оладьи.`,
          actionLabel: 'Слишком жидкое',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }
      if (d.item.doughAttributes!.isFolded) {
        return {
          isValid: false,
          kind: 'none',
          title: 'Свёрнутое изделие нельзя раскатать',
          subtitle: 'Изделие уже запечатано. Чтобы изменить заготовку, переформуйте или разрежьте ножом.',
          actionLabel: 'Уже свёрнуто',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }
      const activeSlot = d.slot < dosageLimit ? d.slot : pinEntry.slot < dosageLimit ? pinEntry.slot : null;
      const frac = activeSlot !== null ? getSlotPourDosageFraction(activeSlot, gridSize) : 0.65;
      const res = rollDoughWithPin(d.item, pinEntry.item, frac, applyPourJitter);
      if (!res) return null;
      singleRes = res;
      produced.push(res.result);
      subtitles.push(res.subtitle);
    }

    return {
      isValid: true,
      kind: 'craft_recipe',
      title: doughs.length === 1 && singleRes ? singleRes.title : `Раскатка теста скалкой (${doughs.length} шт.)`,
      subtitle: subtitles.slice(0, 2).join(' · '),
      actionLabel: doughs.length === 1 && singleRes ? singleRes.actionLabel : 'Раскатать всё',
      previewOutputs: packOutputsIntoSlots(produced, gridSize),
      transferDetails: [],
      matchedRecipeId: 'craft_roll_dough_pin',
    };
  }

  // 2. SOLO RAW DOUGH -> SHAPE OR FOLD ACCORDING TO SLOT INDEX!
  if (entries.length === 1 && doughs.length === 1 && isRawDoughItem(doughs[0].item)) {
    const da = doughs[0].item.doughAttributes!;
    if (da.consistency === 'batter') {
      return {
        isValid: false,
        kind: 'none',
        title: 'Жидковатое тесто нельзя вылепить руками',
        subtitle: `Сейчас гидратация ${da.hydrationPct}% (${da.doughTypeRu}) — вмешайте больше муки (тесто + мука в сетку), чтобы оно стало плотнее и держало форму пиццы или пирога, либо жарьте как оладьи/блины.`,
        actionLabel: 'Нужно больше муки',
        previewOutputs: Array.from({ length: gridSize }, () => null),
        transferDetails: [],
      };
    }
    const shaped = shapeDoughBySlot(doughs[0].item, doughs[0].slot, gridSize);
    if (shaped) {
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: shaped.title,
        subtitle: shaped.subtitle,
        actionLabel: shaped.actionLabel,
        previewOutputs: packOutputsIntoSlots([shaped.result], gridSize),
        transferDetails: [],
        matchedRecipeId: 'craft_shape_dough_slot',
      };
    }
    const spec = getDoughShapeSpecForSlot(doughs[0].slot, gridSize, da);
    if (da.shape === spec.shape) {
      return {
        isValid: false,
        kind: 'none',
        title: `Тесто уже в форме «${spec.labelRu}»`,
        subtitle:
          da.shape === 'open_pie' || da.shape === 'flatbread'
            ? 'Можно раскатать скалкой, положить рядом начинку (томаты, сыр, грибы) или переложить в другой слот для другой формы.'
            : 'Переложите тесто в другой слот сетки, чтобы придать иную форму.',
        actionLabel: 'Форма уже задана',
        previewOutputs: Array.from({ length: gridSize }, () => null),
        transferDetails: [],
      };
    }
    return null;
  }

  // 3. SOLO BOWL / POT ALREADY CONTAINING MIXED FLOUR + LIQUID -> KNEAD DOUGH OUT OF VESSEL!
  if (entries.length === 1 && doughs.length === 0 && pins.length === 0) {
    const vessel = entries[0].item;
    const wrap = getEffectiveFluidWrapper(vessel);
    if (
      wrap &&
      wrap.isOpened &&
      DOUGH_MIXING_VESSEL_IDS.has(vessel.itemId) &&
      (wrap.state.currentMl >= 30 || (vessel.contents && vessel.contents.length > 0))
    ) {
      const ingList: DoughIngredientEntry[] = [];
      let hasFlour = false;
      let hasWet = false;
      let validAll = true;

      if (wrap.state.currentMl >= 5 && wrap.state.liquidId) {
        const comps =
          wrap.state.components && wrap.state.components.length > 0
            ? wrap.state.components
            : [
                {
                  liquidId: wrap.state.liquidId,
                  ml: wrap.state.currentMl,
                  labelRu: wrap.state.attributes?.varietyRu || LIQUID_REGISTRY[wrap.state.liquidId as LiquidId]?.nameRu || wrap.state.liquidId,
                  color: wrap.state.attributes?.customColor || LIQUID_REGISTRY[wrap.state.liquidId as LiquidId]?.color || '#f6eedb',
                },
              ];
        for (const c of comps) {
          if (c.ml <= 0) continue;
          const prof = getFluidDoughProfile(c.liquidId, c.liquidId, c.color, c.labelRu);
          if (!prof) {
            validAll = false;
            break;
          }
          const isDry = prof.role === 'flour' || prof.role === 'starch' || prof.role === 'sugar' || prof.role === 'salt';
          const grams = Math.max(1, Math.round(c.ml * (isDry ? 0.72 : 1.0)));
          if (prof.flourPct >= 30) hasFlour = true;
          if (prof.waterPct >= 15 || prof.fatPct >= 40 || prof.eggPct >= 50) hasWet = true;
          ingList.push({
            itemId: c.liquidId,
            nameRu: (c.labelRu || c.liquidId).replace(/\s*\([^)]*\)\s*$/g, '').trim(),
            grams,
            role: prof.role,
            colorHex: prof.colorHex,
          });
        }
      }

      if (validAll && vessel.contents && vessel.contents.length > 0) {
        for (const ch of vessel.contents) {
          const sp = getSolidDoughProfile(ch);
          if (!sp) {
            validAll = false;
            break;
          }
          const g = Math.max(10, Math.round(ch.produceAttributes?.weightGrams ?? (ch.weight ? ch.weight * 1000 : 60)));
          if (sp.flourPct >= 25) hasFlour = true;
          if (sp.waterPct >= 15 || sp.fatPct >= 40 || sp.eggPct >= 50) hasWet = true;
          ingList.push({
            itemId: ch.originalCatalogId || ch.itemId,
            nameRu: ch.nameRu.replace(/\s*\([^)]*\)\s*$/g, '').trim(),
            grams: g,
            role: sp.role,
            colorHex: sp.colorHex,
          });
        }
      }

      if (validAll && hasFlour && hasWet && ingList.length >= 2) {
        const cleanVessel = cloneInventoryItem(vessel);
        if (cleanVessel.fluidStorage) {
          cleanVessel.fluidStorage.currentMl = 0;
          cleanVessel.fluidStorage.liquidId = null;
          cleanVessel.fluidStorage.components = undefined;
          cleanVessel.fluidStorage.attributes = undefined;
          cleanVessel.fluidStorage.infusedItems = undefined;
        }
        if (cleanVessel.contents) cleanVessel.contents = [];
        syncItemContainerProperties(cleanVessel);

        const newDough = createItem('dough', 1, undefined, true);
        const attrs = synthesizeDoughAttributes(ingList);
        applyDoughAttributesToItem(newDough, attrs);

        return {
          isValid: true,
          kind: 'craft_recipe',
          title: `Замесить: ${attrs.doughTypeRu}`,
          subtitle: `${attrs.weightGrams} г · гидратация ${attrs.hydrationPct}% · ${attrs.colorNameRu.toLowerCase()} · ${attrs.consistencyRu.toLowerCase()}`,
          actionLabel: 'Замесить из посуды',
          previewOutputs: packOutputsIntoSlots([newDough, cleanVessel], gridSize),
          transferDetails: [],
          matchedRecipeId: 'craft_knead_dough_bowl',
        };
      }
    }
  }

  // 4. MERGING 2+ RAW DOUGH PIECES TOGETHER
  if (doughs.length >= 2 && others.length === 0 && pins.length === 0 && doughs.every((d) => isRawDoughItem(d.item))) {
    const combinedIngs: DoughIngredientEntry[] = [];
    const combinedFillings: DoughFillingEntry[] = [];
    for (const d of doughs) {
      combinedIngs.push(...d.item.doughAttributes!.ingredients);
      combinedFillings.push(...d.item.doughAttributes!.fillings);
    }
    const merged = createItem('dough', 1, undefined, true);
    const attrs = synthesizeDoughAttributes(combinedIngs, {
      shape: combinedFillings.length > 0 ? 'flatbread' : 'lump',
      fillings: combinedFillings,
    });
    applyDoughAttributesToItem(merged, attrs);
    return {
      isValid: true,
      kind: 'craft_recipe',
      title: `Слепить тесто вместе (${doughs.length} куска)`,
      subtitle: `${attrs.doughTypeRu} · ${attrs.weightGrams + attrs.fillingGrams} г · ${attrs.colorNameRu.toLowerCase()}`,
      actionLabel: 'Слепить в один ком',
      previewOutputs: packOutputsIntoSlots([merged], gridSize),
      transferDetails: [],
      matchedRecipeId: 'craft_merge_dough',
    };
  }

  // 5. EXISTING RAW DOUGH + FILLINGS OR EXTRA KNEADING INGREDIENTS
  if (doughs.length === 1 && others.length >= 1 && pins.length === 0 && isRawDoughItem(doughs[0].item)) {
    const baseDough = doughs[0].item;
    const da = baseDough.doughAttributes!;

    // Check if ALL other items are pure core kneading adjustments (flour, water, milk, oil, butter, salt, sugar, sourdough, cocoa, egg)
    // AND either dough is still unrolled/batter, has no fillings, or an ingredient is a core dough modifier!
    const extractedAll = others.map((o) => extractDoughIngredientFromEntry(o.item, o.slot, gridSize, applyPourJitter));
    const allExtractableForKnead = extractedAll.every((x) => x !== null);
    const hasCoreDoughModifier = extractedAll.some(
      (x) =>
        x &&
        x.entries.some(
          (e) =>
            e.role === 'flour' ||
            e.role === 'starch' ||
            e.role === 'liquid' ||
            e.role === 'leavening' ||
            e.role === 'salt' ||
            (da.consistency === 'batter' &&
              (e.role === 'fat' || e.role === 'egg' || e.role === 'sugar' || e.role === 'dairy' || e.role === 'flavor' || e.role === 'colorant'))
        )
    );
    const preferKneadIntoDough =
      allExtractableForKnead &&
      !da.isFolded &&
      (da.consistency === 'batter' ||
        (da.fillings.length === 0 && !isOpenReceivableShape(da.shape)) ||
        hasCoreDoughModifier);

    if (preferKneadIntoDough) {
      const nextIngs: DoughIngredientEntry[] = [...da.ingredients];
      const leftovers: InventoryItem[] = [];
      const addedLabels: string[] = [];
      for (const ext of extractedAll) {
        if (!ext) continue;
        nextIngs.push(...ext.entries);
        if (ext.leftoverItem) leftovers.push(ext.leftoverItem);
        addedLabels.push(ext.summaryLabel);
      }
      const updated = cloneInventoryItem(baseDough);
      const attrs = synthesizeDoughAttributes(nextIngs, {
        shape: da.shape,
        rolledPasses: da.rolledPasses,
        embossedPattern: da.embossedPattern,
        embossedPatternRu: da.embossedPatternRu,
        fillings: da.fillings,
      });
      applyDoughAttributesToItem(updated, attrs);
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: `Вмесить в тесто: ${attrs.doughTypeRu}`,
        subtitle: `Добавлено: ${addedLabels.slice(0, 2).join(', ')} · вес ${attrs.weightGrams} г, гидратация ${attrs.hydrationPct}%, цвет: ${attrs.colorNameRu.toLowerCase()}`,
        actionLabel: 'Вмесить в тесто',
        previewOutputs: packOutputsIntoSlots([updated, ...leftovers], gridSize),
        transferDetails: [],
        matchedRecipeId: 'craft_knead_add_to_dough',
      };
    }

    // Check if kneading or filling failed because a bottle, carton, jar, or food wrapper is still sealed/closed
    for (let i = 0; i < others.length; i++) {
      if (extractedAll[i] !== null) continue;
      const o = others[i];
      const w = getEffectiveFluidWrapper(o.item);
      if (w && !w.isOpened && w.state.currentMl >= 3 && w.state.liquidId) {
        return {
          isValid: false,
          kind: 'none',
          title: `Тара закрыта: «${o.item.nameRu}»`,
          subtitle: 'Сначала откройте крышку или упаковку в инвентаре («Открыть крышку / упаковку»), затем повторите действие.',
          actionLabel: 'Тара закрыта',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }
      if (isCuttablePackagedFoodItem(o.item) && !o.item.isOpen) {
        const innerName = o.item.contents?.[0]?.nameRu || o.item.nameRu;
        return {
          isValid: false,
          kind: 'none',
          title: `Упаковка закрыта: «${innerName}»`,
          subtitle: 'Сначала вскройте упаковку в инвентаре или отрежьте нужный кусочек ножом (положите нож и упаковку в сетку).',
          actionLabel: 'Упаковка закрыта',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }
    }

    // Otherwise: try placing edible items / spreads (including opened single-item food wrappers) as FILLING inside the dough
    const allFoodOrSpread = others.every((o) => {
      if (DOUGH_MIXING_VESSEL_IDS.has(o.item.itemId)) return false;
      if (
        (o.item.category === 'food' || o.item.category === 'drink') &&
        o.item.produceAttributes?.edible !== false
      ) {
        return true;
      }
      if (
        o.item.isContainer &&
        o.item.isOpen &&
        o.item.contents &&
        o.item.contents.length === 1 &&
        !o.item.fluidStorage
      ) {
        const inner = o.item.contents[0];
        return inner.category === 'food' && inner.produceAttributes?.edible !== false;
      }
      return false;
    });

    if (allFoodOrSpread) {
      if (da.consistency === 'batter') {
        return {
          isValid: false,
          kind: 'none',
          title: 'На жидкое тесто нельзя положить начинку',
          subtitle: `Сейчас гидратация ${da.hydrationPct}% (${da.doughTypeRu}) — сначала вмешайте больше муки (тесто + мука в сетку), а затем сформуйте лепёшку или пиццу и добавьте начинку.`,
          actionLabel: 'Нужно больше муки',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }
      if (da.isFolded) {
        return {
          isValid: false,
          kind: 'none',
          title: 'Изделие уже свёрнуто',
          subtitle: 'В запечатанный пирожок/вареник нельзя доложить начинку — положите начинку на лепёшку, пласт или открытый пирог.',
          actionLabel: 'Тесто закрыто',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }
      const availCap = Math.max(0, da.maxFillingGrams - da.fillingGrams);
      if (availCap <= 0) {
        return {
          isValid: false,
          kind: 'none',
          title: 'Начинка не вместится в эту форму',
          subtitle:
            da.maxFillingGrams === 0
              ? `В форму «${da.shapeNameRu}» нельзя положить начинку — разомните в лепёшку или раскатайте скалкой.`
              : `Тесто уже заполнено начинкой (${da.fillingGrams}/${da.maxFillingGrams} г). Раскатайте пласт шире или сверните изделие.`,
          actionLabel: 'Нет места под начинку',
          previewOutputs: Array.from({ length: gridSize }, () => null),
          transferDetails: [],
        };
      }

      let remainingCap = availCap;
      const newFillings: DoughFillingEntry[] = [...da.fillings];
      const leftovers: InventoryItem[] = [];
      const addedNames: string[] = [];

      for (const o of others) {
        const wrap = getEffectiveFluidWrapper(o.item);
        // Spread / sauce / jam / honey / sour cream / condensed milk container -> dose what fits!
        if (wrap && wrap.state.currentMl >= 5 && wrap.state.liquidId) {
          if (!wrap.isOpened) {
            return {
              isValid: false,
              kind: 'none',
              title: 'Банка с начинкой закрыта',
              subtitle: `Сначала откройте «${o.item.nameRu}», чтобы выложить начинку на тесто.`,
              actionLabel: 'Тара закрыта',
              previewOutputs: Array.from({ length: gridSize }, () => null),
              transferDetails: [],
            };
          }
          const frac = getKneadingSlotFraction(o.slot, gridSize);
          const desired = computeDosedPourMl(wrap.state.currentMl, frac, applyPourJitter).amountMl;
          const takeG = Math.min(remainingCap, desired);
          if (takeG < 5) {
            return {
              isValid: false,
              kind: 'none',
              title: 'Начинка не помещается',
              subtitle: `Осталось места всего ${remainingCap} г из ${da.maxFillingGrams} г. Раскатайте тесто шире или добавьте больше теста.`,
              actionLabel: 'Не вмещается',
              previewOutputs: Array.from({ length: gridSize }, () => null),
              transferDetails: [],
            };
          }
          const fillEntry = buildFillingEntryFromItem(o.item, takeG);
          if (!fillEntry) return null;
          newFillings.push(fillEntry);
          addedNames.push(`${fillEntry.nameRu} (${takeG} г)`);
          remainingCap -= takeG;

          const nextSt: FluidContainerState = JSON.parse(JSON.stringify(wrap.state));
          nextSt.currentMl = Math.max(0, Math.round(wrap.state.currentMl - takeG));
          if (nextSt.currentMl <= 1) {
            nextSt.currentMl = 0;
            nextSt.liquidId = null;
            nextSt.components = undefined;
          }
          leftovers.push(applyEffectiveFluidToItem(o.item, nextSt, wrap.temperatureC));
          continue;
        }

        // Check if this is an opened single-item food wrapper (e.g. opened paper_packaging with cheese/butter)
        const isOpenedSinglePack =
          o.item.isContainer &&
          o.item.isOpen &&
          o.item.contents &&
          o.item.contents.length === 1 &&
          !o.item.fluidStorage;
        const targetFood = isOpenedSinglePack ? o.item.contents![0] : o.item;

        // Discrete solid filling (meat cut, minced meat, cheese, sliced produce, mushrooms, berries, etc.)
        const fullGrams = Math.max(
          5,
          Math.round(
            targetFood.produceAttributes?.weightGrams ??
              targetFood.meatAttributes?.weightGrams ??
              (targetFood.weight ? targetFood.weight * 1000 : 60)
          )
        );

        const isPartialDosageSlot = o.slot > 0 && o.slot < dosageLimit;
        let itemGrams = fullGrams;
        let hasRemainderPiece = false;

        if (isPartialDosageSlot && isCuttableSolidFoodItem(targetFood) && fullGrams >= 25) {
          let effFrac = getSlotPourDosageFraction(o.slot, gridSize);
          if (applyPourJitter) {
            effFrac = Math.max(0.05, Math.min(0.95, effFrac * (1 + (Math.random() * 0.1 - 0.05))));
          }
          itemGrams = Math.max(10, Math.min(fullGrams - 10, Math.round(fullGrams * effFrac)));
          hasRemainderPiece = true;
        }

        if (itemGrams > remainingCap) {
          return {
            isValid: false,
            kind: 'none',
            title: `Начинка слишком велика (${itemGrams} г > ${remainingCap} г)`,
            subtitle: `В «${da.shapeNameRu}» (Ø${da.diameterCm} см) помещается ещё ${remainingCap} г начинки. Нарежьте «${getCleanSolidFoodBaseNameRu(targetFood)}» ножом (нож + продукт в сетку) или раскатайте тесто шире скалкой.`,
            actionLabel: 'Не вмещается',
            previewOutputs: Array.from({ length: gridSize }, () => null),
            transferDetails: [],
          };
        }

        const fillEntry = buildFillingEntryFromItem(targetFood, itemGrams);
        if (!fillEntry) return null;
        newFillings.push(fillEntry);
        addedNames.push(`${fillEntry.nameRu} (${itemGrams} г)`);
        remainingCap -= itemGrams;

        if (hasRemainderPiece) {
          const remPiece = scaleSolidFoodPiece(targetFood, fullGrams - itemGrams, 'remainder');
          if (isOpenedSinglePack) {
            const packCopy = cloneInventoryItem(o.item);
            packCopy.contents = [remPiece];
            recalculateContainerWeight(packCopy);
            syncItemContainerProperties(packCopy);
            leftovers.push(packCopy);
          } else {
            leftovers.push(remPiece);
          }
        }
      }

      const updated = cloneInventoryItem(baseDough);
      const nextShape = da.shape === 'lump' || da.shape === 'ball' ? 'flatbread' : da.shape;
      const attrs = synthesizeDoughAttributes(da.ingredients, {
        shape: nextShape,
        rolledPasses: da.rolledPasses,
        overrideThicknessMm: nextShape === da.shape ? da.thicknessMm : undefined,
        embossedPattern: da.embossedPattern,
        embossedPatternRu: da.embossedPatternRu,
        fillings: newFillings,
        baseMassGrams: da.baseMassGrams,
      });
      applyDoughAttributesToItem(updated, attrs);

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: `Уложить начинку в тесто (${attrs.fillingGrams}/${attrs.maxFillingGrams} г)`,
        subtitle: `Начинка: ${addedNames.slice(0, 2).join(', ')}. После укладки можно запечь открытым или свернуть в слоте сетки.`,
        actionLabel: 'Положить начинку',
        previewOutputs: packOutputsIntoSlots([updated, ...leftovers], gridSize),
        transferDetails: [],
        matchedRecipeId: 'craft_fill_dough',
      };
    }
  }

  // 6. FRESH DOUGH KNEADING FROM ANY SUITABLE INGREDIENTS IN ANY PROPORTION!
  if (doughs.length === 0 && pins.length === 0 && entries.length >= 2) {
    // Non-collision guard: if user put an empty/open mixing bowl/pot/cup in the bottom row specifically to pour into it, let pouring run!
    const cols = gridSize === 16 ? 4 : 2;
    const rows = gridSize === 16 ? 4 : 2;
    const bottomRowStart = (rows - 1) * cols;
    const hasBottomMixingVessel = entries.some(
      (e) => e.slot >= bottomRowStart && DOUGH_MIXING_VESSEL_IDS.has(e.item.itemId) && canItemActAsTargetReceiver(e.item)
    );
    if (hasBottomMixingVessel) {
      return null;
    }

    const allIngs: DoughIngredientEntry[] = [];
    const leftovers: InventoryItem[] = [];
    const labels: string[] = [];
    let hasFlourBase = false;
    let hasWetBinder = false;
    let closedIngredient: InventoryItem | null = null;
    let invalidFound = false;

    for (const e of entries) {
      const ext = extractDoughIngredientFromEntry(e.item, e.slot, gridSize, applyPourJitter);
      if (!ext) {
        const w = getEffectiveFluidWrapper(e.item);
        if (w && !w.isOpened && w.state.currentMl >= 3 && w.state.liquidId && !closedIngredient) {
          closedIngredient = e.item;
        } else if (
          isCuttablePackagedFoodItem(e.item) &&
          !e.item.isOpen &&
          e.item.contents?.[0] &&
          getSolidDoughProfile(e.item.contents[0]) &&
          !closedIngredient
        ) {
          closedIngredient = e.item;
        } else {
          invalidFound = true;
        }
        continue;
      }
      allIngs.push(...ext.entries);
      if (ext.leftoverItem) leftovers.push(ext.leftoverItem);
      labels.push(ext.summaryLabel);
      if (ext.hasFlourBase) hasFlourBase = true;
      if (ext.hasWetBinder) hasWetBinder = true;
    }

    if (closedIngredient && !invalidFound && (hasFlourBase || hasWetBinder)) {
      return {
        isValid: false,
        kind: 'none',
        title: `Тара закрыта: «${closedIngredient.nameRu}»`,
        subtitle: 'Сначала откройте крышку или упаковку в инвентаре («Открыть крышку / упаковку»), затем повторите замес.',
        actionLabel: 'Тара закрыта',
        previewOutputs: Array.from({ length: gridSize }, () => null),
        transferDetails: [],
      };
    }

    if (!closedIngredient && !invalidFound && hasFlourBase && hasWetBinder && allIngs.length >= 2) {
      const freshDough = createItem('dough', 1, undefined, true);
      const attrs = synthesizeDoughAttributes(allIngs);
      applyDoughAttributesToItem(freshDough, attrs);

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: `Замесить: ${attrs.doughTypeRu}`,
        subtitle: `${labels.slice(0, 3).join(' + ')} → ${attrs.weightGrams} г, гидратация ${attrs.hydrationPct}%, ${attrs.colorNameRu.toLowerCase()}`,
        actionLabel: 'Замесить тесто',
        previewOutputs: packOutputsIntoSlots([freshDough, ...leftovers], gridSize),
        transferDetails: [],
        matchedRecipeId: 'craft_knead_dough_free',
      };
    }
  }

  return null;
}

/**
 * Evaluates the 4 input slots (`[0, 1]` = Top Row, `[2, 3]` = Bottom Row) and returns
 * the resulting 4 output slots (`previewOutputs`) along with detailed transfer/craft info.
 */
export function evaluateInteractionGrid(
  inputs: InteractionSlotGrid4,
  options?: InteractionEvalOptions
): InteractionEvaluationResult {
  const applyPourJitter = Boolean(options?.applyPourJitter);
  const hasAnyInput = inputs.some((item) => item !== null);
  if (!hasAnyInput) {
    return {
      isValid: false,
      kind: 'none',
      title: 'Сетка ввода пуста',
      subtitle:
        'Положите предметы в сетку (2×2). Слот «Всё» выливает или очищает/разделывает целиком, слот «~50%» — делит или сливает примерно пополам.',
      actionLabel: 'Ожидание предметов',
      previewOutputs: [null, null, null, null],
      transferDetails: [],
    };
  }

  // 1. Check concrete crafting/tool recipes first
  for (const recipe of getActiveInteractionCraftRecipes()) {
    if (recipe.matchAndPreview) {
      const matched = recipe.matchAndPreview(inputs);
      if (matched && matched.isValid) {
        return matched;
      }
    }
  }

  // 1.5. Universal slot-percentage knife cutting & branch plucking
  const cutOrPluck = tryEvaluateKnifeCuttingAndBranchPlucking(inputs, 4, applyPourJitter);
  if (cutOrPluck) {
    return {
      ...cutOrPluck,
      previewOutputs: [
        cutOrPluck.previewOutputs[0] || null,
        cutOrPluck.previewOutputs[1] || null,
        cutOrPluck.previewOutputs[2] || null,
        cutOrPluck.previewOutputs[3] || null,
      ],
    };
  }

  // 1.6. Universal Dough System (kneading in any proportion, rolling pin, slot shaping/folding, capacity-checked filling)
  const doughRes = tryEvaluateDoughSystem(inputs, 4, applyPourJitter);
  if (doughRes) {
    return {
      ...doughRes,
      previewOutputs: [
        doughRes.previewOutputs[0] || null,
        doughRes.previewOutputs[1] || null,
        doughRes.previewOutputs[2] || null,
        doughRes.previewOutputs[3] || null,
      ],
    };
  }

  // 2. Multi-source top-to-bottom pouring / mixing / discrete transfer with slot dosage
  const pairsToEvaluate = buildTransferPairsForGrid(inputs, 2, 2);

  if (pairsToEvaluate.length > 0) {
    const previewOutputs: InteractionSlotGrid4 = [
      inputs[0] ? cloneInventoryItem(inputs[0]) : null,
      inputs[1] ? cloneInventoryItem(inputs[1]) : null,
      inputs[2] ? cloneInventoryItem(inputs[2]) : null,
      inputs[3] ? cloneInventoryItem(inputs[3]) : null,
    ];
    const details: InteractionTransferDetail[] = [];
    let anyMixture = false;
    let anyLiquidPour = false;
    let anyDiscreteTransfer = false;

    for (const [topIdx, bottomIdx] of pairsToEvaluate) {
      const topItem = previewOutputs[topIdx];
      const bottomItem = previewOutputs[bottomIdx];
      if (!topItem || !bottomItem) continue;

      const dosageFraction = getSlotPourDosageFraction(topIdx, 4);

      const pourRes = tryPourOrMixTopToBottom(
        topItem,
        bottomItem,
        topIdx,
        bottomIdx,
        dosageFraction,
        applyPourJitter
      );
      if (pourRes) {
        previewOutputs[topIdx] = pourRes.updatedTop;
        previewOutputs[bottomIdx] = pourRes.updatedBottom;
        details.push(pourRes.detail);
        anyLiquidPour = true;
        if (pourRes.isMixture) anyMixture = true;

        // If full dump (slot 0) and top hybrid container also holds solid contents, tip them out too
        if (
          dosageFraction >= 0.999 &&
          previewOutputs[topIdx]?.contents &&
          previewOutputs[topIdx]!.contents!.length > 0 &&
          previewOutputs[bottomIdx]
        ) {
          const extraDiscrete = tryTransferDiscreteTopToBottom(
            previewOutputs[topIdx]!,
            previewOutputs[bottomIdx]!,
            topIdx,
            bottomIdx
          );
          if (extraDiscrete) {
            previewOutputs[topIdx] = extraDiscrete.updatedTop;
            previewOutputs[bottomIdx] = extraDiscrete.updatedBottom;
            details.push(extraDiscrete.detail);
            anyDiscreteTransfer = true;
          }
        }
        continue;
      }

      const discreteRes = tryTransferDiscreteTopToBottom(topItem, bottomItem, topIdx, bottomIdx);
      if (discreteRes) {
        previewOutputs[topIdx] = discreteRes.updatedTop;
        previewOutputs[bottomIdx] = discreteRes.updatedBottom;
        details.push(discreteRes.detail);
        anyDiscreteTransfer = true;
      }
    }

    if (details.length > 0) {
      const summary = summarizeBatchTransfers(details, anyMixture, anyLiquidPour, anyDiscreteTransfer);
      return {
        isValid: true,
        kind: summary.kind,
        title: summary.title,
        subtitle: summary.subtitle,
        actionLabel: summary.actionLabel,
        previewOutputs,
        transferDetails: details,
      };
    }
  }

  // Provide helpful diagnostic hint if user placed containers but pouring couldn't happen
  const topOccupied = [inputs[0], inputs[1]].filter(Boolean) as InventoryItem[];
  const bottomOccupied = [inputs[2], inputs[3]].filter(Boolean) as InventoryItem[];

  if (topOccupied.length > 0 && bottomOccupied.length > 0) {
    const topWrap = getEffectiveFluidWrapper(topOccupied[0]);
    const bottomWrap = getEffectiveFluidWrapper(bottomOccupied[0]);
    if (topWrap && bottomWrap) {
      if (!topWrap.isOpened || !bottomWrap.isOpened) {
        return {
          isValid: false,
          kind: 'none',
          title: 'Тара герметично закрыта',
          subtitle:
            'Одна из ёмкостей закрыта крышкой или запаяна. Откройте тару в инвентаре или положите рядом нож для вскрытия.',
          actionLabel: 'Тара закрыта',
          previewOutputs: [null, null, null, null],
          transferDetails: [],
        };
      }
      if (topWrap.state.currentMl <= 0) {
        return {
          isValid: false,
          kind: 'none',
          title: 'Верхняя тара пуста',
          subtitle:
            'В верхней ёмкости нет жидкости или сыпучего вещества. Поменяйте верх и низ местами, если полная тара стоит снизу.',
          actionLabel: 'Верхняя тара пуста',
          previewOutputs: [null, null, null, null],
          transferDetails: [],
        };
      }
      const bottomFreeMl = Math.max(
        0,
        bottomWrap.state.maxMl - bottomWrap.state.currentMl - getContainerSolidVolumeMl(bottomOccupied[0])
      );
      if (bottomFreeMl <= 0) {
        const bd = getContainerCapacityBreakdown(bottomOccupied[0]);
        return {
          isValid: false,
          kind: 'none',
          title: 'Нижняя тара заполнена до краёв',
          subtitle: `В нижней ёмкости (${bottomOccupied[0].nameRu}) нет свободного места (предметы ${Math.round(bd.solidMl)} мл + жидкость ${Math.round(bd.liquidMl)} мл из ${bd.totalCapacityMl} мл).`,
          actionLabel: 'Нижняя тара полна',
          previewOutputs: [null, null, null, null],
          transferDetails: [],
        };
      }
    }
  }

  return {
    isValid: false,
    kind: 'none',
    title: 'Комбинация не распознана',
    subtitle:
      'Поставьте приёмную тару в нижний ряд, а один или несколько источников выше — они перельются или уложатся вместе.',
    actionLabel: 'Нет доступного действия',
    previewOutputs: [null, null, null, null],
    transferDetails: [],
  };
}

export type InteractionSlotGrid16 = (InventoryItem | null)[];

export interface InteractionEvaluationResult16 {
  isValid: boolean;
  kind: 'none' | 'pour_liquid' | 'mix_liquid' | 'transfer_items' | 'craft_recipe';
  title: string;
  subtitle: string;
  actionLabel: string;
  previewOutputs: InteractionSlotGrid16;
  transferDetails: InteractionTransferDetail[];
  matchedRecipeId?: string;
}

export function createEmptyInteractionGrid16(): InteractionSlotGrid16 {
  return Array.from({ length: 16 }, () => null);
}

/**
 * Evaluates a 4x4 (16-slot) input grid (`row * 4 + col`) for the Kitchen Table workbench
 * and returns a 4x4 (16-slot) previewOutputs grid plus transfer/recipe metadata.
 * Supports:
 * - Slot-position pouring dosage (slot 0 = 100%, stepping down evenly to slot 11 = ~8%, with natural hand jitter on commit)
 * - Multi-source batch transfers (multiple containers and/or solid items above a target container all pour/place together)
 */
export function evaluateInteractionGrid4x4(
  inputs: InteractionSlotGrid16,
  options?: InteractionEvalOptions
): InteractionEvaluationResult16 {
  const applyPourJitter = Boolean(options?.applyPourJitter);
  const occupiedIndices: number[] = [];
  for (let i = 0; i < 16; i++) {
    if (inputs[i]) occupiedIndices.push(i);
  }

  if (occupiedIndices.length === 0) {
    return {
      isValid: false,
      kind: 'none',
      title: 'Сетка ввода пуста',
      subtitle:
        'Положите приёмную тару вниз, а источники выше. Дозировка слива убывает от верхнего левого слота (всё) к правому краю предпоследнего ряда (~8%).',
      actionLabel: 'Ожидание предметов',
      previewOutputs: createEmptyInteractionGrid16(),
      transferDetails: [],
    };
  }

  // 1. Check concrete crafting/tool recipes when 1..4 items are placed anywhere on the 4x4 grid
  if (occupiedIndices.length <= 4) {
    const packed4: InteractionSlotGrid4 = [
      inputs[occupiedIndices[0]] || null,
      occupiedIndices[1] !== undefined ? inputs[occupiedIndices[1]] : null,
      occupiedIndices[2] !== undefined ? inputs[occupiedIndices[2]] : null,
      occupiedIndices[3] !== undefined ? inputs[occupiedIndices[3]] : null,
    ];
    for (const recipe of getActiveInteractionCraftRecipes()) {
      if (recipe.matchAndPreview) {
        const matched = recipe.matchAndPreview(packed4);
        if (matched && matched.isValid) {
          const previewOutputs = createEmptyInteractionGrid16();
          for (let k = 0; k < 4; k++) {
            previewOutputs[k] = matched.previewOutputs[k] ? cloneInventoryItem(matched.previewOutputs[k]!) : null;
          }
          return {
            isValid: true,
            kind: matched.kind,
            title: matched.title,
            subtitle: matched.subtitle,
            actionLabel: matched.actionLabel,
            previewOutputs,
            transferDetails: matched.transferDetails,
            matchedRecipeId: matched.matchedRecipeId,
          };
        }
      }
    }
  }

  // 1.5. Universal slot-percentage knife cutting & branch plucking across 4x4 (supports multi-produce batch cutting)
  const cutOrPluck16 = tryEvaluateKnifeCuttingAndBranchPlucking(inputs, 16, applyPourJitter);
  if (cutOrPluck16) {
    return cutOrPluck16;
  }

  // 1.6. Universal Dough System across 4x4 (kneading, rolling pin, 16-slot artisan shaping/folding, fillings)
  const doughRes16 = tryEvaluateDoughSystem(inputs, 16, applyPourJitter);
  if (doughRes16) {
    return doughRes16;
  }

  // 2. Multi-source top-to-bottom pouring / mixing / discrete transfers across 4x4 with slot dosage
  const pairsToEvaluate = buildTransferPairsForGrid(inputs, 4, 4);

  if (pairsToEvaluate.length > 0) {
    const previewOutputs: InteractionSlotGrid16 = Array.from({ length: 16 }, (_, i) =>
      inputs[i] ? cloneInventoryItem(inputs[i]!) : null
    );
    const details: InteractionTransferDetail[] = [];
    let anyMixture = false;
    let anyLiquidPour = false;
    let anyDiscreteTransfer = false;

    for (const [topIdx, bottomIdx] of pairsToEvaluate) {
      const topItem = previewOutputs[topIdx];
      const bottomItem = previewOutputs[bottomIdx];
      if (!topItem || !bottomItem) continue;

      const dosageFraction = getSlotPourDosageFraction(topIdx, 16);

      const pourRes = tryPourOrMixTopToBottom(
        topItem,
        bottomItem,
        topIdx,
        bottomIdx,
        dosageFraction,
        applyPourJitter
      );
      if (pourRes) {
        previewOutputs[topIdx] = pourRes.updatedTop;
        previewOutputs[bottomIdx] = pourRes.updatedBottom;
        details.push(pourRes.detail);
        anyLiquidPour = true;
        if (pourRes.isMixture) anyMixture = true;

        // If full dump (slot 0) and top hybrid container also holds solid contents, tip them out too
        if (
          dosageFraction >= 0.999 &&
          previewOutputs[topIdx]?.contents &&
          previewOutputs[topIdx]!.contents!.length > 0 &&
          previewOutputs[bottomIdx]
        ) {
          const extraDiscrete = tryTransferDiscreteTopToBottom(
            previewOutputs[topIdx]!,
            previewOutputs[bottomIdx]!,
            topIdx,
            bottomIdx
          );
          if (extraDiscrete) {
            previewOutputs[topIdx] = extraDiscrete.updatedTop;
            previewOutputs[bottomIdx] = extraDiscrete.updatedBottom;
            details.push(extraDiscrete.detail);
            anyDiscreteTransfer = true;
          }
        }
        continue;
      }

      const discreteRes = tryTransferDiscreteTopToBottom(topItem, bottomItem, topIdx, bottomIdx);
      if (discreteRes) {
        previewOutputs[topIdx] = discreteRes.updatedTop;
        previewOutputs[bottomIdx] = discreteRes.updatedBottom;
        details.push(discreteRes.detail);
        anyDiscreteTransfer = true;
      }
    }

    if (details.length > 0) {
      const summary = summarizeBatchTransfers(details, anyMixture, anyLiquidPour, anyDiscreteTransfer);
      return {
        isValid: true,
        kind: summary.kind,
        title: summary.title,
        subtitle: summary.subtitle,
        actionLabel: summary.actionLabel,
        previewOutputs,
        transferDetails: details,
      };
    }
  }

  // Diagnostic hint for closed/empty/full containers when placed upper & lower
  if (occupiedIndices.length >= 2) {
    const sorted = [...occupiedIndices].sort((a, b) => a - b);
    const first = inputs[sorted[0]];
    const last = inputs[sorted[sorted.length - 1]];
    if (first && last && Math.floor(sorted[0] / 4) < Math.floor(sorted[sorted.length - 1] / 4)) {
      const topWrap = getEffectiveFluidWrapper(first);
      const bottomWrap = getEffectiveFluidWrapper(last);
      if (topWrap && bottomWrap) {
        if (!topWrap.isOpened || !bottomWrap.isOpened) {
          return {
            isValid: false,
            kind: 'none',
            title: 'Тара герметично закрыта',
            subtitle:
              'Одна из ёмкостей закрыта крышкой или запаяна. Откройте тару или положите рядом нож для вскрытия.',
            actionLabel: 'Тара закрыта',
            previewOutputs: createEmptyInteractionGrid16(),
            transferDetails: [],
          };
        }
        if (topWrap.state.currentMl <= 0) {
          return {
            isValid: false,
            kind: 'none',
            title: 'Верхняя тара пуста',
            subtitle: 'В верхней ёмкости нет жидкости или сыпучего вещества.',
            actionLabel: 'Верхняя тара пуста',
            previewOutputs: createEmptyInteractionGrid16(),
            transferDetails: [],
          };
        }
        const bottomFreeMl = Math.max(
          0,
          bottomWrap.state.maxMl - bottomWrap.state.currentMl - getContainerSolidVolumeMl(last)
        );
        if (bottomFreeMl <= 0) {
          const bd = getContainerCapacityBreakdown(last);
          return {
            isValid: false,
            kind: 'none',
            title: 'Нижняя тара заполнена до краёв',
            subtitle: `В нижней ёмкости (${last.nameRu}) нет свободного места (${Math.round(bd.solidMl + bd.liquidMl)} / ${bd.totalCapacityMl} мл).`,
            actionLabel: 'Нижняя тара полна',
            previewOutputs: createEmptyInteractionGrid16(),
            transferDetails: [],
          };
        }
      }
    }
  }

  return {
    isValid: false,
    kind: 'none',
    title: 'Комбинация не распознана',
    subtitle:
      'Поставьте приёмную тару в нижний ряд (4×4), а один или несколько источников выше — дозировка убывает от слота 1 (всё) к правому краю 3-го ряда (~8%).',
    actionLabel: 'Нет доступного действия',
    previewOutputs: createEmptyInteractionGrid16(),
    transferDetails: [],
  };
}


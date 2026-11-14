import { InventoryItem } from './types';
import {
  LIQUID_REGISTRY,
  LiquidId,
  FluidContainerState,
  FluidSubstanceAttributes,
  CONTAINER_CONFIGS,
  syncItemContainerProperties,
  isFluidContainerClosed,
} from './liquidSystem';
import { createItem, canItemFitInContainer, getItemTotalWeight } from './items';

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
  soup_bowl: {
    maxMl: 500,
    emptyWeightKg: 0.25,
    baseItemNameRu: 'Суповая миска (0.5 л)',
    emptyItemId: 'soup_bowl_empty',
    defaultLiquidId: 'broth_chicken',
    defaultCurrentMl: 450,
    defaultTemperatureC: 65,
  },
  soup_bowl_empty: {
    maxMl: 500,
    emptyWeightKg: 0.25,
    baseItemNameRu: 'Суповая миска (0.5 л)',
    emptyItemId: 'soup_bowl_empty',
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
  kitchen_mug_ceramic: {
    maxMl: 350,
    emptyWeightKg: 0.28,
    baseItemNameRu: 'Керамическая кружка (0.35 л)',
    emptyItemId: 'kitchen_mug_ceramic',
  },
  kitchen_mug_enamel: {
    maxMl: 400,
    emptyWeightKg: 0.2,
    baseItemNameRu: 'Эмалированная кружка (0.4 л)',
    emptyItemId: 'kitchen_mug_enamel',
  },
  kitchen_mug_glass: {
    maxMl: 350,
    emptyWeightKg: 0.25,
    baseItemNameRu: 'Стеклянная кружка (0.35 л)',
    emptyItemId: 'kitchen_mug_glass',
  },
  kitchen_cup_porcelain: {
    maxMl: 220,
    emptyWeightKg: 0.16,
    baseItemNameRu: 'Фарфоровая чашка (0.22 л)',
    emptyItemId: 'kitchen_cup_porcelain',
  },
  kitchen_pot_enamel: {
    maxMl: 3000,
    emptyWeightKg: 1.1,
    baseItemNameRu: 'Эмалированная кастрюля (3 л)',
    emptyItemId: 'kitchen_pot_enamel',
  },
  kitchen_pot_steel: {
    maxMl: 3500,
    emptyWeightKg: 1.2,
    baseItemNameRu: 'Стальная кастрюля (3.5 л)',
    emptyItemId: 'kitchen_pot_steel',
  },
  kitchen_pot_aluminum: {
    maxMl: 2500,
    emptyWeightKg: 0.7,
    baseItemNameRu: 'Алюминиевая кастрюля (2.5 л)',
    emptyItemId: 'kitchen_pot_aluminum',
  },
  kitchen_pot_cast_iron: {
    maxMl: 4000,
    emptyWeightKg: 3.2,
    baseItemNameRu: 'Чугунный котелок (4 л)',
    emptyItemId: 'kitchen_pot_cast_iron',
  },
  kitchen_kettle_enamel: {
    maxMl: 2000,
    emptyWeightKg: 0.85,
    baseItemNameRu: 'Эмалированный чайник (2 л)',
    emptyItemId: 'kitchen_kettle_enamel',
  },
  kitchen_kettle_electric: {
    maxMl: 1700,
    emptyWeightKg: 0.9,
    baseItemNameRu: 'Электрочайник (1.7 л)',
    emptyItemId: 'kitchen_kettle_electric',
  },
  tin_can_empty: {
    maxMl: 400,
    emptyWeightKg: 0.06,
    baseItemNameRu: 'Жестяная банка (0.4 л)',
    emptyItemId: 'tin_can_empty',
  },
};

interface NamedMixtureRule {
  id: string;
  liquids: [string, string];
  nameRu: string;
  colorHex: string;
  descriptionRu: string;
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

  if (item.fluidStorage) {
    const state: FluidContainerState = JSON.parse(JSON.stringify(item.fluidStorage));
    const closed = isFluidContainerClosed(item);
    const cfg = CONTAINER_CONFIGS[item.itemId];
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

  // Auto-open container variant if it was a sealed variant
  const cfg = CONTAINER_CONFIGS[item.itemId];
  if (cfg?.openedVariantId && CONTAINER_CONFIGS[cfg.openedVariantId]) {
    item.itemId = cfg.openedVariantId;
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
  if (!CONTAINER_CONFIGS[item.itemId]) {
    const baseName = nextState.baseItemNameRu || originalItem.nameRu;
    if (nextState.currentMl <= 0 || !nextState.liquidId) {
      item.nameRu = `${baseName} (Пусто)`;
      item.weight = nextState.emptyWeightKg || originalItem.weight || 0.25;
    } else {
      const liqSpec = LIQUID_REGISTRY[nextState.liquidId as LiquidId];
      const subName = nextState.attributes?.varietyRu || liqSpec?.nameRu || nextState.liquidId;
      const unit = liqSpec?.isGranular ? 'г' : 'мл';
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

function findNamedMixture(liqA: string, liqB: string): NamedMixtureRule | undefined {
  return NAMED_MIXTURE_RULES.find(
    (r) =>
      (r.liquids[0] === liqA && r.liquids[1] === liqB) ||
      (r.liquids[0] === liqB && r.liquids[1] === liqA)
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
  toSlot: number
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

  const freeSpaceMl = bottomState.maxMl - bottomState.currentMl;
  if (freeSpaceMl <= 0) {
    return null;
  }

  const topSpec = LIQUID_REGISTRY[topState.liquidId as LiquidId];
  if (!topSpec) return null;

  // Check if target container is a soft dry sack (`isGranularContainer`) trying to hold pure liquid when empty
  if (bottomWrap.isGranularContainer && !topSpec.isGranular && bottomState.currentMl === 0) {
    return null;
  }

  const transferMl = Math.min(topState.currentMl, freeSpaceMl);
  if (transferMl <= 0) return null;

  const topNameBefore = getSubstanceDisplayName(topState);
  const bottomNameBefore = getSubstanceDisplayName(bottomState);
  const unit = topSpec.isGranular ? 'г' : 'мл';

  // Update top state
  const nextTopState: FluidContainerState = {
    ...topState,
    currentMl: topState.currentMl - transferMl,
  };
  if (nextTopState.currentMl <= 0) {
    nextTopState.currentMl = 0;
    nextTopState.liquidId = null;
    nextTopState.attributes = undefined;
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
  } else {
    // Receiver already has substance! Check if identical or different
    const sameLiquidId = bottomState.liquidId === topState.liquidId;
    const sameVariety =
      (bottomState.attributes?.varietyRu || '') === (topState.attributes?.varietyRu || '');

    if (sameLiquidId && sameVariety) {
      // Same substance -> volume + temperature merge
      nextBottomState.liquidId = bottomState.liquidId;
    } else {
      // MIXING TWO DIFFERENT SUBSTANCES!
      isMixture = true;
      const bottomSpec = LIQUID_REGISTRY[bottomState.liquidId as LiquidId] || topSpec;
      const colorBottom = getSubstanceColor(bottomState);
      const colorTop = getSubstanceColor(topState);
      const blendedColor = blendHexColors(colorBottom, prevBottomMl, colorTop, transferMl);

      const namedRule = findNamedMixture(bottomState.liquidId, topState.liquidId);

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

      const pctBottom = Math.round((prevBottomMl / newBottomMl) * 100);
      const pctTop = Math.max(1, 100 - pctBottom);

      const computedVarietyRu = namedRule
        ? namedRule.nameRu
        : `Смесь: ${bottomNameBefore} (${pctBottom}%) + ${topNameBefore} (${pctTop}%)`;

      const computedColor = namedRule ? namedRule.colorHex : blendedColor;
      mixtureName = computedVarietyRu;
      mixtureColor = computedColor;

      // Dominant base liquid ID for mechanics (keep toxic/flammable if either is dangerous)
      const dominantLiquidId: LiquidId = (
        !bottomSpec.isDrinkable || bottomSpec.isFlammable
          ? bottomState.liquidId
          : !topSpec.isDrinkable || topSpec.isFlammable
          ? topState.liquidId
          : prevBottomMl >= transferMl
          ? bottomState.liquidId
          : topState.liquidId
      ) as LiquidId;

      const bIngs = Array.isArray(bottomState.attributes?.sourceIngredients)
        ? bottomState.attributes!.sourceIngredients
        : bottomState.attributes?.sourceIngredients
        ? [bottomState.attributes.sourceIngredients]
        : [bottomNameBefore];

      const tIngs = Array.isArray(topState.attributes?.sourceIngredients)
        ? topState.attributes!.sourceIngredients
        : topState.attributes?.sourceIngredients
        ? [topState.attributes.sourceIngredients]
        : [topNameBefore];

      const uniqueIngredients = Array.from(new Set([...bIngs, ...tIngs]));

      const customAttr: FluidSubstanceAttributes = {
        varietyRu: computedVarietyRu,
        sourceIngredients: uniqueIngredients,
        preparationMethod: 'Смешивание в сетке взаимодействия (Верх → Низ)',
        purpose: namedRule
          ? namedRule.descriptionRu
          : `Смешанный состав (${uniqueIngredients.join(' + ')})`,
        reasonAndOrigin: 'Приготовлено игроком путём переливания и смешивания компонентов.',
        customColor: computedColor,
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
    }
  }

  const updatedTop = applyEffectiveFluidToItem(topItem, nextTopState, topWrap.temperatureC);
  const updatedBottom = applyEffectiveFluidToItem(
    bottomItem,
    nextBottomState,
    nextBottomTemperature
  );

  const remainingSourceLabel =
    nextTopState.currentMl > 0
      ? `Остаток в верхней таре: ${Math.round(nextTopState.currentMl)} / ${nextTopState.maxMl} ${unit}`
      : 'Верхняя тара полностью опустошена (0 мл)';

  const resultingTargetLabel = `${getSubstanceDisplayName(nextBottomState)} (${Math.round(
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
      transferredAmountLabel: `${Math.round(transferMl)} ${unit} (${topNameBefore})`,
      remainingSourceLabel,
      resultingTargetLabel,
      isMixture,
      mixtureName,
      mixtureColor,
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
  if (!bottomItem.isContainer || bottomItem.singleUseContainer) return null;

  // Case A: Top item is also a container with items inside (`topItem.contents.length > 0`) -> pour items from top container into bottom container!
  if (topItem.isContainer && topItem.contents && topItem.contents.length > 0) {
    const nextTop = cloneInventoryItem(topItem);
    const nextBottom = cloneInventoryItem(bottomItem);
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
          nextBottom.contents.push(child);
        }
        movedCount += child.count;
      } else {
        remainingInTop.push(child);
      }
    }

    if (movedCount === 0) return null;

    nextTop.contents = remainingInTop;
    recalculateContainerWeight(nextTop);
    recalculateContainerWeight(nextBottom);

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
        resultingTargetLabel: `${nextBottom.nameRu} (${nextBottom.contents.length} поз.)`,
      },
    };
  }

  // Case B: Top item is a regular item that fits inside bottom container
  if (!topItem.isContainer) {
    const nextBottom = cloneInventoryItem(bottomItem);
    nextBottom.contents = nextBottom.contents ? [...nextBottom.contents] : [];
    const check = canItemFitInContainer(nextBottom, topItem);
    if (!check.fits) return null;

    const itemToInsert = cloneInventoryItem(topItem);
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
    recalculateContainerWeight(nextBottom);

    return {
      updatedTop: null,
      updatedBottom: nextBottom,
      detail: {
        fromSlot,
        toSlot,
        sourceName: topItem.nameRu,
        targetName: bottomItem.nameRu,
        transferredAmountLabel: `Уложено: ${topItem.nameRu} (${topItem.count} шт.)`,
        remainingSourceLabel: 'Упаковано полностью',
        resultingTargetLabel: `${nextBottom.nameRu} (${nextBottom.contents.length} поз.)`,
      },
    };
  }

  return null;
}

const KNIFE_IDS = [
  'pocket_knife',
  'kitchen_knife_chef',
  'kitchen_knife_bread',
  'kitchen_knife_paring',
  'kitchen_cleaver',
  'multitool_leatherman',
];

function getItemCatalogKeys(item: InventoryItem | null): string[] {
  if (!item) return [];
  const keys = [item.itemId];
  if (item.originalCatalogId && item.originalCatalogId !== item.itemId) {
    keys.push(item.originalCatalogId);
  }
  return keys;
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
        itemIds: ['water_bottle', 'fuel_canister', 'sandbag', 'thermos', 'bottle_plastic_1500'],
        label: 'Верхний ряд: Полная тара (бутылка, канистра, мешок, термос)',
        rowHint: 'top',
      },
      {
        itemIds: ['cup_disposable', 'bottle_empty', 'glass_mug', 'sack_empty', 'canister_empty'],
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
        itemIds: ['hot_coffee', 'thermos', 'glass_mug', 'paper_cup'],
        liquidIds: ['coffee'],
        label: 'Верх: Тара с кофе',
        rowHint: 'top',
      },
      {
        itemIds: ['bottle_milk_glass', 'glass_mug', 'paper_cup', 'can_metal_400_open'],
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
        itemIds: ['jar_glass_500', 'jar_glass_1000', 'paper_cup', 'glass_mug'],
        liquidIds: ['honey', 'jam', 'sugar'],
        label: 'Верх: Мёд / Варенье / Сахар',
        rowHint: 'top',
      },
      {
        itemIds: ['thermos', 'glass_mug', 'paper_cup', 'kitchen_mug_ceramic'],
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
        itemIds: ['bottle_oil_1l', 'canister_plastic_5l', 'fuel_canister'],
        liquidIds: ['motor_oil'],
        label: 'Верх: Моторное масло',
        rowHint: 'top',
      },
      {
        itemIds: [
          'fuel_canister',
          'canister_plastic_5l',
          'canister_steel_20l',
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
          'can_metal_400',
          'can_metal_330',
          'canned_meat',
          'canned_fish',
          'canned_beans',
          'canned_corn',
          'canned_peas',
          'canned_olives',
          'canned_peaches',
          'canned_pickles',
          'canned_tomatoes',
          'candy_pouch_sealed',
          'paper_packaging_sealed',
          'milk_carton_sealed',
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
        const cfg = CONTAINER_CONFIGS[openedItem.itemId];
        if (cfg?.openedVariantId && CONTAINER_CONFIGS[cfg.openedVariantId]) {
          const openCfg = CONTAINER_CONFIGS[cfg.openedVariantId];
          openedItem.itemId = openCfg.itemId;
          openedItem.name = openCfg.name;
          openedItem.fluidStorage!.baseItemNameRu = openCfg.nameRu;
          openedItem.fluidStorage!.baseItemNameEn = openCfg.name;
        }
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
    id: 'craft_slice_apple',
    title: 'Нарезка яблока дольками',
    category: 'cooking',
    description: 'Нарежьте свежее яблоко ножом на аккуратные дольки.',
    actionLabel: 'Нарезать яблоко',
    ingredients: [
      { itemIds: KNIFE_IDS, label: 'Любой нож', isTool: true },
      { itemIds: ['apple'], label: 'Свежее яблоко' },
    ],
    resultsSummary: ['Нож (сохраняется)', 'Дольки яблока (2 порции)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length !== 2) return null;
      const knife = present.find((x) => itemMatchesAnyId(x, KNIFE_IDS));
      const apple = present.find((x) => itemMatchesAnyId(x, ['apple']));
      if (!knife || !apple) return null;

      const sliced = createItem('apple_sliced', 2);
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Нарезка яблока дольками',
        subtitle: `${knife.nameRu} + ${apple.nameRu} → 2 порции яблочных долек`,
        actionLabel: 'Нарезать яблоко',
        previewOutputs: [cloneInventoryItem(knife), sliced, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_slice_apple',
      };
    },
  },
  {
    id: 'craft_peel_carrot',
    title: 'Очистка свежей моркови',
    category: 'cooking',
    description: 'Очистите свежую морковь ножом перед готовкой или едой.',
    actionLabel: 'Очистить морковь',
    ingredients: [
      { itemIds: KNIFE_IDS, label: 'Любой нож', isTool: true },
      { itemIds: ['carrot_fresh'], label: 'Свежая морковь' },
    ],
    resultsSummary: ['Нож (сохраняется)', 'Очищенная морковь'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length !== 2) return null;
      const knife = present.find((x) => itemMatchesAnyId(x, KNIFE_IDS));
      const carrot = present.find((x) => itemMatchesAnyId(x, ['carrot_fresh']));
      if (!knife || !carrot) return null;

      const peeled = createItem('carrot_peeled', 1);
      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Очистка свежей моркови',
        subtitle: `${knife.nameRu} + ${carrot.nameRu} → Очищенная морковь`,
        actionLabel: 'Очистить морковь',
        previewOutputs: [cloneInventoryItem(knife), peeled, null, null],
        transferDetails: [],
        matchedRecipeId: 'craft_peel_carrot',
      };
    },
  },
  {
    id: 'craft_make_sandwich',
    title: 'Сытный дорожный сэндвич / бутерброд',
    category: 'cooking',
    description:
      'Соберите питательный сэндвич из хлеба и мясной/сырной начинки (колбаса, ветчина, сыр, тушёнка или бекон).',
    actionLabel: 'Сделать сэндвич',
    ingredients: [
      {
        itemIds: ['bread_loaf', 'bread_white', 'bread_rye', 'baguette_french', 'bun_sweet'],
        label: 'Хлеб / Батон / Багет',
      },
      {
        itemIds: [
          'sausage_cooked',
          'sausage_smoked',
          'salami_sliced',
          'ham_sliced',
          'bacon_strips',
          'cheese_cheddar',
          'cheese_gouda',
          'cheese_mozzarella',
          'canned_meat',
          'canned_fish',
        ],
        label: 'Колбаса / Ветчина / Сыр / Тушёнка',
      },
    ],
    resultsSummary: ['Сытный сэндвич (2 шт.)'],
    matchAndPreview: (inputs) => {
      const present = inputs.filter((x): x is InventoryItem => x !== null);
      if (present.length < 2 || present.length > 3) return null;
      const breadIds = ['bread_loaf', 'bread_white', 'bread_rye', 'baguette_french', 'bun_sweet'];
      const fillingIds = [
        'sausage_cooked',
        'sausage_smoked',
        'salami_sliced',
        'ham_sliced',
        'bacon_strips',
        'cheese_cheddar',
        'cheese_gouda',
        'cheese_mozzarella',
        'canned_meat',
        'canned_fish',
      ];
      const bread = present.find((x) => itemMatchesAnyId(x, breadIds));
      const filling = present.find((x) => itemMatchesAnyId(x, fillingIds));
      const optionalKnife = present.find((x) => itemMatchesAnyId(x, KNIFE_IDS));
      if (!bread || !filling) return null;
      if (present.length === 3 && !optionalKnife) return null;

      const sandwich = createItem('sandwich', 2);
      const isCanned = itemMatchesAnyId(filling, ['canned_meat', 'canned_fish']);
      const emptyTin = isCanned ? createItem('tin_can_empty', 1) : null;

      return {
        isValid: true,
        kind: 'craft_recipe',
        title: 'Приготовление дорожного сэндвича',
        subtitle: `${bread.nameRu} + ${filling.nameRu} → 2 сытных сэндвича`,
        actionLabel: 'Собрать сэндвич',
        previewOutputs: [
          sandwich,
          optionalKnife ? cloneInventoryItem(optionalKnife) : emptyTin,
          optionalKnife && emptyTin ? emptyTin : null,
          null,
        ],
        transferDetails: [],
        matchedRecipeId: 'craft_make_sandwich',
      };
    },
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
          'fuel_canister',
          'canister_plastic_5l',
          'canister_steel_20l',
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
          'iodine_bottle',
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
        'iodine_bottle',
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
        itemIds: ['antiseptic', 'hydrogen_peroxide', 'iodine_bottle', 'bottle_vodka'],
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
        'iodine_bottle',
      ]);
      const wrap = getEffectiveFluidWrapper(other);
      const isLiquidDisinfectant =
        wrap &&
        (wrap.state.liquidId === 'vodka' ||
          wrap.state.liquidId === 'antiseptic' ||
          wrap.state.liquidId === 'peroxide') &&
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
];

/**
 * Evaluates the 4 input slots (`[0, 1]` = Top Row, `[2, 3]` = Bottom Row) and returns
 * the resulting 4 output slots (`previewOutputs`) along with detailed transfer/craft info.
 */
export function evaluateInteractionGrid(inputs: InteractionSlotGrid4): InteractionEvaluationResult {
  const hasAnyInput = inputs.some((item) => item !== null);
  if (!hasAnyInput) {
    return {
      isValid: false,
      kind: 'none',
      title: 'Сетка ввода пуста',
      subtitle:
        'Положите 2 предмета из рук или карманов в сетку ввода (2×2). Верхний ряд — источник, нижний ряд — приёмная тара.',
      actionLabel: 'Ожидание предметов',
      previewOutputs: [null, null, null, null],
      transferDetails: [],
    };
  }

  // 1. Check concrete crafting/tool recipes first
  for (const recipe of INTERACTION_CRAFT_RECIPES) {
    if (recipe.matchAndPreview) {
      const matched = recipe.matchAndPreview(inputs);
      if (matched && matched.isValid) {
        return matched;
      }
    }
  }

  // 2. Check Top-to-Bottom Pouring / Mixing / Discrete Transfer!
  // Primary pairs: Left Column (0 -> 2), Right Column (1 -> 3).
  // Cross-column fallback: if only ONE top slot is occupied and ONE bottom slot is occupied in diagonal (0 -> 3 or 1 -> 2), pair them automatically!
  const pairsToEvaluate: [number, number][] = [];

  if (inputs[0] && inputs[2]) {
    pairsToEvaluate.push([0, 2]);
  }
  if (inputs[1] && inputs[3]) {
    pairsToEvaluate.push([1, 3]);
  }

  if (pairsToEvaluate.length === 0) {
    const topIndices = [0, 1].filter((i) => inputs[i] !== null);
    const bottomIndices = [2, 3].filter((i) => inputs[i] !== null);
    if (topIndices.length === 1 && bottomIndices.length === 1) {
      pairsToEvaluate.push([topIndices[0], bottomIndices[0]]);
    }
  }

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

      // Try liquid / granular pouring & mixing first
      const pourRes = tryPourOrMixTopToBottom(topItem, bottomItem, topIdx, bottomIdx);
      if (pourRes) {
        previewOutputs[topIdx] = pourRes.updatedTop;
        previewOutputs[bottomIdx] = pourRes.updatedBottom;
        details.push(pourRes.detail);
        anyLiquidPour = true;
        if (pourRes.isMixture) anyMixture = true;
        continue;
      }

      // Otherwise try discrete item/container pouring (e.g. pouring candies/items from top bag into bottom box/bag)
      const discreteRes = tryTransferDiscreteTopToBottom(topItem, bottomItem, topIdx, bottomIdx);
      if (discreteRes) {
        previewOutputs[topIdx] = discreteRes.updatedTop;
        previewOutputs[bottomIdx] = discreteRes.updatedBottom;
        details.push(discreteRes.detail);
        anyDiscreteTransfer = true;
      }
    }

    if (details.length > 0) {
      const firstDetail = details[0];
      if (anyMixture) {
        return {
          isValid: true,
          kind: 'mix_liquid',
          title: firstDetail.mixtureName
            ? `Смешивание: ${firstDetail.mixtureName}`
            : 'Смешивание жидкостей / сыпучих веществ',
          subtitle: `${firstDetail.transferredAmountLabel} → ${firstDetail.resultingTargetLabel}`,
          actionLabel: 'Перелить и смешать',
          previewOutputs,
          transferDetails: details,
        };
      }
      if (anyLiquidPour) {
        return {
          isValid: true,
          kind: 'pour_liquid',
          title: 'Переливание / пересыпание из верхней тары в нижнюю',
          subtitle: `${firstDetail.transferredAmountLabel} · ${firstDetail.remainingSourceLabel}`,
          actionLabel: 'Перелить / Пересыпать',
          previewOutputs,
          transferDetails: details,
        };
      }
      if (anyDiscreteTransfer) {
        return {
          isValid: true,
          kind: 'transfer_items',
          title: 'Пересыпание / укладка предметов в нижнюю тару',
          subtitle: `${firstDetail.transferredAmountLabel} → ${firstDetail.resultingTargetLabel}`,
          actionLabel: 'Пересыпать в тару',
          previewOutputs,
          transferDetails: details,
        };
      }
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
            'В верхней ёмкости нет жидкости или сыпучего вещества. Нажмите «Поменять верх и низ», если полная тара стоит снизу.',
          actionLabel: 'Верхняя тара пуста',
          previewOutputs: [null, null, null, null],
          transferDetails: [],
        };
      }
      if (bottomWrap.state.currentMl >= bottomWrap.state.maxMl) {
        return {
          isValid: false,
          kind: 'none',
          title: 'Нижняя тара заполнена до краёв',
          subtitle: `В нижней ёмкости (${bottomOccupied[0].nameRu}) нет свободного места (${Math.round(
            bottomWrap.state.currentMl
          )}/${bottomWrap.state.maxMl} мл).`,
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
      'Для переливания поставьте полную тару в верхний ряд, а приёмную — под неё в нижний ряд, либо совместите подходящие предметы в слотах ввода.',
    actionLabel: 'Нет доступного действия',
    previewOutputs: [null, null, null, null],
    transferDetails: [],
  };
}

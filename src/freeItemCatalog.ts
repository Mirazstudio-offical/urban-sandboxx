import {
  ITEM_CATALOG,
  LEGACY_KITCHENWARE_PRESETS,
  createItem,
  createKitchenware,
  createPhone,
  createGummyCandy,
  createChocolate,
  createPelmen,
  createProduceItem,
  createPlantBranch,
  normalizeItemAttributes,
} from './items';
import {
  LIQUID_REGISTRY,
  LiquidId,
  FluidSubstanceAttributes,
  syncItemContainerProperties,
} from './liquidSystem';
import { PHONE_MODELS } from './phoneData';
import {
  ROLLING_PIN_PRESETS,
  applyRollingPinAttributesToItem,
  buildDefaultDoughAttributes,
  applyDoughAttributesToItem,
} from './doughData';
import { LEGACY_PRODUCE_PRESETS, LEGACY_BRANCH_PRESETS } from './produceData';
import { EXTENDED_LEGACY_CONTAINER_MAP } from './unifiedSubstanceCatalog';
import { AMMO_SPECS, MAGAZINE_SPECS, WEAPON_SPECS } from './weaponData';
import {
  InventoryItem,
  ContainerVisualAttributes,
  GummyCandyAttributes,
  ChocolateAttributes,
  PelmenAttributes,
  KitchenwareAttributes,
  KitchenwareKind,
  DoughShape,
  DoughCookState,
  DoughIngredientEntry,
  RollingPinModel,
} from './types';

export type FreeCatalogEntryKind = 'base' | 'preset' | 'liquid_jar';

/** One entry of the freeroam "give any item" catalog (base item, attribute preset, or liquid in a glass jar). */
export interface FreeCatalogEntry {
  /** Unique catalog entry ID (for base items = itemId; for presets/jars = unique preset ID). */
  id: string;
  /** Underlying ITEM_CATALOG key used for icon fallback. */
  key: string;
  kind: FreeCatalogEntryKind;
  presetGroup?: string;
  nameRu: string;
  name: string;
  descriptionRu: string;
  category: string;
  maxStack: number;
  weight: number;
  /** True for raw unpackaged base items from ITEM_CATALOG. */
  isRawBase?: boolean;
  /** Optional accent color (e.g. liquid color for subtle jar indicator in the grid). */
  accentColor?: string;
  /** Search keywords (materials, colors, varieties, etc.). */
  searchTags?: string;
  /** Factory creating a fresh normalized InventoryItem instance. */
  create: (count?: number) => InventoryItem;
  /** Lazily instantiated preview item for rendering real colors/materials/liquids in the catalog grid. */
  previewItem?: InventoryItem;
}

let cachedEntries: FreeCatalogEntry[] | null = null;

function mapLiquidCategoryToCatalog(liquidCat: string): string {
  switch (liquidCat) {
    case 'water':
    case 'beverage':
    case 'alcohol':
      return 'drink';
    case 'food':
      return 'food';
    case 'medical':
      return 'med';
    case 'fuel':
    case 'lubricant':
      return 'auto';
    default:
      return 'other';
  }
}

/** Creates a glass jar filled with any liquid or granular substance. */
export function createLiquidJarItem(
  liquidId: LiquidId,
  options?: {
    containerId?: 'jar_glass_small' | 'jar_glass_medium' | 'jar_glass_large';
    amountMl?: number;
    attributes?: Partial<FluidSubstanceAttributes>;
    containerVisuals?: Partial<ContainerVisualAttributes>;
    originalCatalogId?: string;
    categoryOverride?: string;
  }
): InventoryItem {
  const def = LIQUID_REGISTRY[liquidId];
  const containerId = options?.containerId || 'jar_glass_medium';
  const item = createItem(containerId, 1, undefined, true);
  const maxMl = item.fluidStorage?.maxMl || (containerId === 'jar_glass_small' ? 200 : containerId === 'jar_glass_large' ? 1000 : 500);
  const fillMl = Math.max(0, Math.min(maxMl, options?.amountMl ?? maxMl));
  const attrs: FluidSubstanceAttributes = {
    varietyRu: def?.nameRu || liquidId,
    customColor: def?.color || '#38bdf8',
    ...(options?.attributes || {}),
  };

  item.fluidStorage = {
    ...(item.fluidStorage || {
      maxMl,
      emptyWeightKg: containerId === 'jar_glass_small' ? 0.14 : containerId === 'jar_glass_large' ? 0.42 : 0.25,
      baseItemNameRu: item.nameRu,
      baseItemNameEn: item.name,
    }),
    liquidId,
    currentMl: fillMl,
    maxMl,
    attributes: attrs,
  };
  if (options?.originalCatalogId) {
    item.originalCatalogId = options.originalCatalogId;
  }
  if (options?.containerVisuals) {
    item.containerVisuals = {
      shape: options.containerVisuals.shape || 'classic',
      shapeNameRu: options.containerVisuals.shapeNameRu,
      materialRgb: options.containerVisuals.materialRgb || [224, 242, 254],
      materialNameRu: options.containerVisuals.materialNameRu,
      labelRgb: options.containerVisuals.labelRgb !== undefined ? options.containerVisuals.labelRgb : null,
      labelAccentRgb: options.containerVisuals.labelAccentRgb,
      capRgb: options.containerVisuals.capRgb,
    };
    item.fluidStorage.containerVisuals = { ...item.containerVisuals };
  }
  if (options?.categoryOverride) {
    item.category = options.categoryOverride as any;
  } else if (def) {
    item.category = (attrs.medicalEffectId ? 'med' : mapLiquidCategoryToCatalog(def.category)) as any;
  }

  syncItemContainerProperties(item);
  return normalizeItemAttributes(item);
}

function makePresetEntry(
  id: string,
  presetGroup: string,
  factory: (count?: number) => InventoryItem,
  opts?: {
    kind?: FreeCatalogEntryKind;
    nameRuOverride?: string;
    categoryOverride?: string;
    accentColor?: string;
    searchTags?: string;
  }
): FreeCatalogEntry {
  const sample = factory(1);
  return {
    id,
    key: sample.itemId,
    kind: opts?.kind || 'preset',
    presetGroup,
    nameRu: opts?.nameRuOverride || sample.nameRu || sample.name,
    name: sample.name,
    descriptionRu: sample.descriptionRu || sample.description || '',
    category: opts?.categoryOverride || sample.category || 'misc',
    maxStack: Math.max(1, sample.maxStack || 1),
    weight: sample.weight || 0,
    isRawBase: false,
    accentColor: opts?.accentColor,
    searchTags: opts?.searchTags,
    create: factory,
    previewItem: sample,
  };
}

const EXTRA_KITCHENWARE_PRESETS: Array<{
  id: string;
  kind: KitchenwareKind;
  weight: number;
  category?: 'tool' | 'valuable' | 'electronics';
  label: string;
  attrs: Partial<KitchenwareAttributes>;
}> = [
  {
    id: 'preset_kw_pot_copper',
    kind: 'pot',
    weight: 2.1,
    label: 'Кастрюля медная французская',
    attrs: {
      material: 'copper',
      materialRu: 'Полированная медь с лужением',
      coatingRu: 'Пищевое олово внутри',
      capacityMl: 3500,
      shape: 'cylindrical',
      shapeNameRu: 'Цилиндрическая шефская',
      color: '#c26d3a',
      colorNameRu: 'Медный блеск',
      accentColor: '#eab308',
      pattern: 'brushed',
      patternNameRu: 'Сатинированная медь',
      lidRu: 'Медная с латунной дужкой',
      handleRu: 'Клёпаные латунные ручки',
      dimensionCm: 22,
    },
  },
  {
    id: 'preset_kw_pan_copper',
    kind: 'frying_pan',
    weight: 1.7,
    label: 'Сковорода медная с латунной ручкой',
    attrs: {
      material: 'copper',
      materialRu: 'Кованая медь',
      coatingRu: 'Нержавеющая сталь внутри',
      capacityMl: 1600,
      shape: 'round_shallow',
      shapeNameRu: 'Классическая с высоким бортом',
      color: '#b45309',
      colorNameRu: 'Красная медь',
      accentColor: '#facc15',
      pattern: 'none',
      patternNameRu: 'Зеркальная полировка',
      handleRu: 'Длинная литая латунная',
      dimensionCm: 24,
    },
  },
  {
    id: 'preset_kw_kettle_cast_iron',
    kind: 'kettle',
    weight: 1.9,
    label: 'Чайник чугунный японский Тэцубин',
    attrs: {
      material: 'cast_iron',
      materialRu: 'Литой чугун',
      coatingRu: 'Чёрная эмаль внутри',
      capacityMl: 1100,
      shape: 'teapot_round',
      shapeNameRu: 'Приземистый заварочный',
      color: '#18181b',
      colorNameRu: 'Графитово-чёрный',
      accentColor: '#a16207',
      pattern: 'polka_dots',
      patternNameRu: 'Рельефные капли-шипы',
      patternColor: '#3f3f46',
      lidRu: 'Чугунная с бронзовой шишкой',
      handleRu: 'Кованая дугообразная',
      dimensionCm: 16,
    },
  },
  {
    id: 'preset_kw_mug_khokhloma',
    kind: 'mug',
    weight: 0.28,
    label: 'Кружка фарфоровая с золотой каймой',
    attrs: {
      material: 'porcelain',
      materialRu: 'Тонкий костяной фарфор',
      coatingRu: 'Глянцевая глазурь',
      capacityMl: 320,
      shape: 'cylindrical',
      shapeNameRu: 'Изящная столовая',
      color: '#1e3a5f',
      colorNameRu: 'Кобальтово-синий',
      accentColor: '#eab308',
      pattern: 'gold_rim',
      patternNameRu: 'Золотая кайма по ободку',
      patternColor: '#facc15',
      dimensionCm: 10,
    },
  },
  {
    id: 'preset_kw_saute_emerald',
    kind: 'saute_pan',
    weight: 1.6,
    label: 'Сотейник эмалированный изумрудный',
    attrs: {
      material: 'enamel_steel',
      materialRu: 'Эмалированная сталь',
      coatingRu: 'Тёмная стеклоэмаль',
      capacityMl: 2800,
      shape: 'cylindrical',
      shapeNameRu: 'Глубокий сотейник',
      color: '#047857',
      colorNameRu: 'Изумрудно-зелёный',
      accentColor: '#f8fafc',
      pattern: 'polka_dots',
      patternNameRu: 'Белый горошек',
      patternColor: '#ffffff',
      lidRu: 'Стеклянная с паровыпуском',
      handleRu: 'Длинная бакелитовая',
      dimensionCm: 24,
    },
  },
];

const GUMMY_PRESETS: Array<{ id: string; attrs: Partial<GummyCandyAttributes> }> = [
  {
    id: 'preset_gummy_bear_strawberry',
    attrs: {
      shape: 'bear',
      color: '#ef4444',
      colorNameRu: 'Рубиново-красный',
      flavorRu: 'Спелая клубника',
      sourDust: false,
    },
  },
  {
    id: 'preset_gummy_worm_sour_apple',
    attrs: {
      shape: 'worm',
      color: '#22c55e',
      colorNameRu: 'Ярко-зелёный',
      flavorRu: 'Кислое зелёное яблоко',
      sourDust: true,
    },
  },
  {
    id: 'preset_gummy_cola_bottle',
    attrs: {
      shape: 'cola_bottle',
      color: '#78350f',
      colorNameRu: 'Карамельно-коричневый',
      flavorRu: 'Классическая кола',
      sourDust: false,
    },
  },
  {
    id: 'preset_gummy_berry_blackberry',
    attrs: {
      shape: 'berry',
      color: '#6d28d9',
      colorNameRu: 'Ежевично-фиолетовый',
      flavorRu: 'Лесная ежевика',
      sourDust: false,
    },
  },
  {
    id: 'preset_gummy_ring_peach',
    attrs: {
      shape: 'ring',
      color: '#fb923c',
      colorNameRu: 'Персиково-оранжевый',
      flavorRu: 'Сочный персик',
      sourDust: true,
    },
  },
  {
    id: 'preset_gummy_star_lemon',
    attrs: {
      shape: 'star',
      color: '#facc15',
      colorNameRu: 'Лимонно-жёлтый',
      flavorRu: 'Кислый лимон и лайм',
      sourDust: true,
    },
  },
  {
    id: 'preset_gummy_heart_cherry',
    attrs: {
      shape: 'heart',
      color: '#be123c',
      colorNameRu: 'Вишнёвый',
      flavorRu: 'Спелая вишня',
      sourDust: false,
    },
  },
  {
    id: 'preset_gummy_cube_blueberry',
    attrs: {
      shape: 'cube',
      color: '#0284c7',
      colorNameRu: 'Голубично-синий',
      flavorRu: 'Голубика и мята',
      sourDust: false,
    },
  },
];

const CHOCOLATE_PRESETS: Array<{ id: string; label: string; attrs: Partial<ChocolateAttributes> }> = [
  {
    id: 'preset_choco_milk_classic',
    label: 'Шоколад молочный классический (36%)',
    attrs: {
      shape: 'classic_bar',
      size: 'medium',
      cocoaPercent: 36,
      outerMaterialRu: 'Молочный шоколад 36% какао',
      outerColor: '#6f4324',
      outerColorNameRu: 'Тёплый молочно-коричневый',
      innerMaterialRu: 'Цельный молочный шоколад',
      innerColor: '#6f4324',
      innerColorNameRu: 'Тёплый молочно-коричневый',
      hasFilling: false,
      surfaceTexture: 'smooth',
      flavorRu: 'Сливочно-ванильный',
    },
  },
  {
    id: 'preset_choco_dark_85',
    label: 'Шоколад горький экстра (85% какао)',
    attrs: {
      shape: 'square_tile',
      size: 'medium',
      cocoaPercent: 85,
      outerMaterialRu: 'Горький шоколад 85% какао-бобов',
      outerColor: '#29150b',
      outerColorNameRu: 'Глубокий тёмно-шоколадный',
      innerMaterialRu: 'Тёмный шоколад без начинки',
      innerColor: '#29150b',
      innerColorNameRu: 'Глубокий тёмно-шоколадный',
      hasFilling: false,
      surfaceTexture: 'smooth',
      flavorRu: 'Терпкий обжаренный какао',
    },
  },
  {
    id: 'preset_choco_white_nuts',
    label: 'Шоколад белый с цельным фундуком',
    attrs: {
      shape: 'classic_bar',
      size: 'medium',
      cocoaPercent: 28,
      outerMaterialRu: 'Белый шоколад на какао-масле',
      outerColor: '#f5ebd1',
      outerColorNameRu: 'Сливочно-кремовый',
      innerMaterialRu: 'Цельный обжаренный фундук',
      innerColor: '#b45309',
      innerColorNameRu: 'Орехово-янтарный',
      hasFilling: true,
      surfaceTexture: 'nuts',
      flavorRu: 'Ваниль и жареный фундук',
    },
  },
  {
    id: 'preset_choco_dubai_pistachio',
    label: 'Шоколад с фисташковой пастой и катаифи',
    attrs: {
      shape: 'chunky_bar',
      size: 'large',
      cocoaPercent: 42,
      outerMaterialRu: 'Молочный бельгийский шоколад',
      outerColor: '#5c3317',
      outerColorNameRu: 'Карамельно-коричневый',
      innerMaterialRu: 'Фисташковая паста с хрустящим тестом катаифи',
      innerColor: '#84cc16',
      innerColorNameRu: 'Фисташково-зелёный',
      hasFilling: true,
      surfaceTexture: 'crisps',
      flavorRu: 'Жареная фисташка и карамель',
    },
  },
  {
    id: 'preset_choco_ruby_berry',
    label: 'Шоколад рубиновый ягодный (Ruby)',
    attrs: {
      shape: 'wave_bar',
      size: 'medium',
      cocoaPercent: 47,
      outerMaterialRu: 'Рубиновый шоколад из розовых какао-бобов',
      outerColor: '#db7093',
      outerColorNameRu: 'Розово-рубиновый',
      innerMaterialRu: 'Малиновый ганаш',
      innerColor: '#be123c',
      innerColorNameRu: 'Малиново-красный',
      hasFilling: true,
      surfaceTexture: 'marbled',
      flavorRu: 'Ягодная кислинка и сливки',
    },
  },
  {
    id: 'preset_choco_caramel_bar',
    label: 'Шоколадный батончик с мягкой карамелью',
    attrs: {
      shape: 'chunky_bar',
      size: 'small',
      cocoaPercent: 34,
      outerMaterialRu: 'Молочный шоколад',
      outerColor: '#6b3e26',
      outerColorNameRu: 'Молочно-коричневый',
      innerMaterialRu: 'Тягучая солёная карамель и нуга',
      innerColor: '#d97706',
      innerColorNameRu: 'Янтарно-карамельный',
      hasFilling: true,
      surfaceTexture: 'smooth',
      flavorRu: 'Солёная карамель',
    },
  },
  {
    id: 'preset_choco_truffle_cocoa',
    label: 'Конфета трюфель в какао-пудре',
    attrs: {
      shape: 'truffle_dome',
      size: 'mini',
      cocoaPercent: 70,
      outerMaterialRu: 'Тёмный шоколад в обсыпке какао',
      outerColor: '#3b1f10',
      outerColorNameRu: 'Тёмно-какао',
      innerMaterialRu: 'Сливочный коньячный ганаш',
      innerColor: '#5c2d16',
      innerColorNameRu: 'Шоколадно-кремовый',
      hasFilling: true,
      surfaceTexture: 'dusted',
      flavorRu: 'Классический трюфель',
    },
  },
  {
    id: 'preset_choco_praline_heart',
    label: 'Шоколадное сердечко пралине',
    attrs: {
      shape: 'praline_heart',
      size: 'mini',
      cocoaPercent: 40,
      outerMaterialRu: 'Молочный шоколад',
      outerColor: '#7c4724',
      outerColorNameRu: 'Тёплый коричневый',
      innerMaterialRu: 'Ореховое пралине с миндалём',
      innerColor: '#ca8a04',
      innerColorNameRu: 'Золотисто-ореховый',
      hasFilling: true,
      surfaceTexture: 'smooth',
      flavorRu: 'Миндальное пралине',
    },
  },
  {
    id: 'preset_choco_prism_honey',
    label: 'Шоколадная призма с медовой нугой',
    attrs: {
      shape: 'triangle_prism',
      size: 'large',
      cocoaPercent: 38,
      outerMaterialRu: 'Альпийский молочный шоколад',
      outerColor: '#6a3c1f',
      outerColorNameRu: 'Шоколадный',
      innerMaterialRu: 'Медово-миндальная нуга',
      innerColor: '#fde68a',
      innerColorNameRu: 'Медово-кремовый',
      hasFilling: true,
      surfaceTexture: 'nuts',
      flavorRu: 'Мёд и миндаль',
    },
  },
  {
    id: 'preset_choco_wafer_stick',
    label: 'Вафельная палочка в молочном шоколаде',
    attrs: {
      shape: 'wafer_stick',
      size: 'small',
      cocoaPercent: 35,
      outerMaterialRu: 'Молочная шоколадная глазурь',
      outerColor: '#724222',
      outerColorNameRu: 'Молочно-коричневый',
      innerMaterialRu: 'Хрустящие вафли с какао-кремом',
      innerColor: '#e7d2a7',
      innerColorNameRu: 'Вафельно-кремовый',
      hasFilling: true,
      surfaceTexture: 'crisps',
      flavorRu: 'Хрустящая вафля и какао',
    },
  },
  {
    id: 'preset_choco_seashell',
    label: 'Мраморная ракушка пралине',
    attrs: {
      shape: 'shell_seashell',
      size: 'mini',
      cocoaPercent: 38,
      outerMaterialRu: 'Мраморный молочный и белый шоколад',
      outerColor: '#b07b50',
      outerColorNameRu: 'Мраморный кремово-коричневый',
      innerMaterialRu: 'Нежное фундучное пралине',
      innerColor: '#8c552d',
      innerColorNameRu: 'Ореховый',
      hasFilling: true,
      surfaceTexture: 'marbled',
      flavorRu: 'Фундучное пралине',
    },
  },
];

const PELMEN_PRESETS: Array<{ id: string; label: string; attrs: Partial<PelmenAttributes> }> = [
  {
    id: 'preset_pelmen_siberian_ear',
    label: 'Пельмешек сибирский (говядина-свинина)',
    attrs: {
      shape: 'ear',
      size: 'medium',
      state: 'raw',
      doughColor: '#fef3c7',
      doughNameRu: 'Пшеничное на яйцах',
      doughThicknessMm: 1.2,
      fillingRu: 'Говядина и свинина с репчатым луком',
      fillingColor: '#991b1b',
      fillingRatioPercent: 62,
      flourDusting: true,
    },
  },
  {
    id: 'preset_pelmen_lamb_crescent',
    label: 'Пельмешек-полумесяц с бараниной и зирой',
    attrs: {
      shape: 'crescent',
      size: 'large',
      state: 'raw',
      doughColor: '#fde68a',
      doughNameRu: 'Заварное пшеничное тесто',
      doughThicknessMm: 1.4,
      fillingRu: 'Рубленая баранина с луком, кинзой и зирой',
      fillingColor: '#7f1d1d',
      fillingRatioPercent: 66,
      flourDusting: true,
    },
  },
  {
    id: 'preset_pelmen_black_salmon',
    label: 'Пельмешек чёрный с чернилами каракатицы и лососем',
    attrs: {
      shape: 'rose',
      size: 'medium',
      state: 'raw',
      doughColor: '#27272a',
      doughNameRu: 'Тесто с чернилами каракатицы',
      doughThicknessMm: 1.1,
      fillingRu: 'Филе лосося со сливочным сыром и укропом',
      fillingColor: '#fb7185',
      fillingRatioPercent: 60,
      flourDusting: false,
    },
  },
  {
    id: 'preset_pelmen_spinach_chicken',
    label: 'Пельмешек зелёный шпинатный с курицей',
    attrs: {
      shape: 'saturn',
      size: 'small',
      state: 'raw',
      doughColor: '#65a30d',
      doughNameRu: 'Тесто со свежим шпинатом',
      doughThicknessMm: 1.0,
      fillingRu: 'Куриное филе со сливками и зеленью',
      fillingColor: '#fde68a',
      fillingRatioPercent: 58,
      flourDusting: true,
    },
  },
  {
    id: 'preset_pelmen_khinkali_beef',
    label: 'Хинкали ручной лепки с пряным фаршем',
    attrs: {
      shape: 'khinkali',
      size: 'large',
      state: 'raw',
      doughColor: '#f5f0e1',
      doughNameRu: 'Плотное пресное тесто',
      doughThicknessMm: 1.6,
      fillingRu: 'Рубленая говядина с бульоном, кинзой и чесноком',
      fillingColor: '#881337',
      fillingRatioPercent: 68,
      flourDusting: true,
    },
  },
  {
    id: 'preset_pelmen_pillow_mushroom',
    label: 'Равиоли-подушечка с лесными грибами',
    attrs: {
      shape: 'pillow',
      size: 'medium',
      state: 'raw',
      doughColor: '#fcd34d',
      doughNameRu: 'Яичное тесто из твёрдой пшеницы',
      doughThicknessMm: 1.0,
      fillingRu: 'Белые грибы, шампиньоны и жареный лук',
      fillingColor: '#78350f',
      fillingRatioPercent: 55,
      flourDusting: true,
    },
  },
  {
    id: 'preset_pelmen_beet_mini',
    label: 'Пельмешек свекольный розовый (малютка)',
    attrs: {
      shape: 'ear',
      size: 'mini',
      state: 'raw',
      doughColor: '#e11d48',
      doughNameRu: 'Тесто на свекольном соке',
      doughThicknessMm: 0.9,
      fillingRu: 'Нежная телятина со сливками',
      fillingColor: '#b91c1c',
      fillingRatioPercent: 56,
      flourDusting: false,
    },
  },
];

interface DoughPresetSpec {
  id: string;
  label: string;
  shape: DoughShape;
  cookState?: DoughCookState;
  riseFactor?: number;
  ingredients: DoughIngredientEntry[];
}

const DOUGH_PRESETS: DoughPresetSpec[] = [
  {
    id: 'preset_dough_pelmeni_stiff',
    label: 'Тесто пресное пельменное',
    shape: 'ball',
    ingredients: [
      { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 220, role: 'flour', colorHex: '#f6eedb' },
      { itemId: 'water', nameRu: 'Вода', grams: 95, role: 'liquid', colorHex: '#f8fafc' },
      { itemId: 'egg_chicken', nameRu: 'Яйцо куриное', grams: 50, role: 'egg', colorHex: '#facc15' },
      { itemId: 'salt', nameRu: 'Соль', grams: 5, role: 'salt', colorHex: '#f8fafc' },
    ],
  },
  {
    id: 'preset_dough_rye_sourdough',
    label: 'Тесто ржаное на закваске',
    shape: 'loaf',
    ingredients: [
      { itemId: 'flour_rye', nameRu: 'Мука ржаная', grams: 230, role: 'flour', colorHex: '#9a7b5c' },
      { itemId: 'water', nameRu: 'Вода', grams: 145, role: 'liquid', colorHex: '#f8fafc' },
      { itemId: 'sourdough', nameRu: 'Закваска', grams: 50, role: 'leavening', colorHex: '#d6c3a5' },
      { itemId: 'salt', nameRu: 'Соль', grams: 6, role: 'salt', colorHex: '#f8fafc' },
    ],
  },
  {
    id: 'preset_dough_shortcrust',
    label: 'Тесто песочное сливочное',
    shape: 'sheet',
    ingredients: [
      { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 200, role: 'flour', colorHex: '#f6eedb' },
      { itemId: 'butter', nameRu: 'Сливочное масло', grams: 110, role: 'fat', colorHex: '#fde047' },
      { itemId: 'sugar', nameRu: 'Сахар', grams: 65, role: 'sugar', colorHex: '#ffffff' },
      { itemId: 'egg_chicken', nameRu: 'Яйцо куриное', grams: 50, role: 'egg', colorHex: '#facc15' },
    ],
  },
  {
    id: 'preset_dough_chocolate',
    label: 'Тесто шоколадное с какао',
    shape: 'bun',
    ingredients: [
      { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 180, role: 'flour', colorHex: '#f6eedb' },
      { itemId: 'cocoa_powder', nameRu: 'Какао-порошок', grams: 45, role: 'colorant', colorHex: '#5c2d16' },
      { itemId: 'milk', nameRu: 'Молоко', grams: 110, role: 'dairy', colorHex: '#f8fafc' },
      { itemId: 'butter', nameRu: 'Сливочное масло', grams: 60, role: 'fat', colorHex: '#fde047' },
      { itemId: 'sugar', nameRu: 'Сахар', grams: 75, role: 'sugar', colorHex: '#ffffff' },
    ],
  },
  {
    id: 'preset_dough_croissant_puff',
    label: 'Слоёная заготовка (круассан)',
    shape: 'croissant_crescent',
    ingredients: [
      { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 200, role: 'flour', colorHex: '#f6eedb' },
      { itemId: 'butter', nameRu: 'Сливочное масло', grams: 95, role: 'fat', colorHex: '#fde047' },
      { itemId: 'milk', nameRu: 'Молоко', grams: 95, role: 'dairy', colorHex: '#f8fafc' },
      { itemId: 'yeast_dry', nameRu: 'Дрожжи', grams: 8, role: 'leavening', colorHex: '#e7d7b8' },
      { itemId: 'sugar', nameRu: 'Сахар', grams: 25, role: 'sugar', colorHex: '#ffffff' },
    ],
  },
  {
    id: 'preset_dough_corn_flatbread',
    label: 'Тесто кукурузное золотистое (лепёшка)',
    shape: 'flatbread',
    ingredients: [
      { itemId: 'flour_corn', nameRu: 'Мука кукурузная', grams: 210, role: 'flour', colorHex: '#facc15' },
      { itemId: 'water', nameRu: 'Вода', grams: 135, role: 'liquid', colorHex: '#f8fafc' },
      { itemId: 'oil_sunflower', nameRu: 'Масло растительное', grams: 18, role: 'fat', colorHex: '#fde047' },
      { itemId: 'salt', nameRu: 'Соль', grams: 5, role: 'salt', colorHex: '#f8fafc' },
    ],
  },
  {
    id: 'preset_dough_braid_sweet',
    label: 'Сдобная плетёнка-косичка',
    shape: 'braid',
    ingredients: [
      { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 220, role: 'flour', colorHex: '#f6eedb' },
      { itemId: 'milk', nameRu: 'Молоко', grams: 110, role: 'dairy', colorHex: '#f8fafc' },
      { itemId: 'butter', nameRu: 'Сливочное масло', grams: 45, role: 'fat', colorHex: '#fde047' },
      { itemId: 'egg_chicken', nameRu: 'Яйцо куриное', grams: 55, role: 'egg', colorHex: '#facc15' },
      { itemId: 'sugar', nameRu: 'Сахар', grams: 55, role: 'sugar', colorHex: '#ffffff' },
      { itemId: 'yeast_dry', nameRu: 'Дрожжи', grams: 7, role: 'leavening', colorHex: '#e7d7b8' },
    ],
  },
  {
    id: 'preset_dough_noodles_egg',
    label: 'Домашняя яичная лапша',
    shape: 'noodles',
    ingredients: [
      { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 180, role: 'flour', colorHex: '#f6eedb' },
      { itemId: 'egg_chicken', nameRu: 'Яйцо куриное', grams: 100, role: 'egg', colorHex: '#facc15' },
      { itemId: 'salt', nameRu: 'Соль', grams: 4, role: 'salt', colorHex: '#f8fafc' },
    ],
  },
  {
    id: 'preset_dough_bagel_ring',
    label: 'Заготовка бублик-кольцо',
    shape: 'bagel_ring',
    ingredients: [
      { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 210, role: 'flour', colorHex: '#f6eedb' },
      { itemId: 'water', nameRu: 'Вода', grams: 105, role: 'liquid', colorHex: '#f8fafc' },
      { itemId: 'sugar', nameRu: 'Сахар', grams: 20, role: 'sugar', colorHex: '#ffffff' },
      { itemId: 'yeast_dry', nameRu: 'Дрожжи', grams: 6, role: 'leavening', colorHex: '#e7d7b8' },
    ],
  },
];

const EMPTY_CONTAINER_VISUAL_PRESETS: Array<{
  id: string;
  containerId: string;
  label: string;
  visuals: ContainerVisualAttributes;
}> = [
  {
    id: 'preset_jar_amber_hex',
    containerId: 'jar_glass_medium',
    label: 'Банка 0.5л шестигранная (янтарное стекло)',
    visuals: {
      shape: 'hexagonal',
      shapeNameRu: 'Шестигранная',
      materialRgb: [180, 83, 9],
      materialNameRu: 'Янтарное аптечное стекло',
      labelRgb: [254, 243, 199],
      labelAccentRgb: [120, 53, 15],
      capRgb: [234, 179, 8],
    },
  },
  {
    id: 'preset_jar_emerald_barrel',
    containerId: 'jar_glass_medium',
    label: 'Банка 0.5л бочонок (изумрудное стекло)',
    visuals: {
      shape: 'barrel',
      shapeNameRu: 'Бочонок',
      materialRgb: [16, 185, 129],
      materialNameRu: 'Изумрудное толстостенное стекло',
      labelRgb: [248, 250, 252],
      labelAccentRgb: [4, 120, 87],
      capRgb: [22, 163, 74],
    },
  },
  {
    id: 'preset_jar_cobalt_amphora',
    containerId: 'jar_glass_small',
    label: 'Баночка 0.2л амфора (кобальтовое стекло)',
    visuals: {
      shape: 'amphora',
      shapeNameRu: 'Амфора',
      materialRgb: [37, 99, 235],
      materialNameRu: 'Кобальтовое стекло',
      labelRgb: [254, 249, 195],
      labelAccentRgb: [30, 58, 138],
      capRgb: [234, 179, 8],
    },
  },
  {
    id: 'preset_jar_square_crimson',
    containerId: 'jar_glass_large',
    label: 'Банка 1.0л квадратная с красной крышкой',
    visuals: {
      shape: 'square',
      shapeNameRu: 'Квадратная',
      materialRgb: [224, 242, 254],
      materialNameRu: 'Хрустальное прозрачное стекло',
      labelRgb: [220, 38, 38],
      labelAccentRgb: [254, 226, 226],
      capRgb: [185, 28, 28],
    },
  },
  {
    id: 'preset_bottle_olive_bordeaux',
    containerId: 'bottle_glass_750',
    label: 'Бутылка 0.75л бордо (тёмно-оливковое стекло)',
    visuals: {
      shape: 'bordeaux',
      shapeNameRu: 'Бордоская',
      materialRgb: [54, 83, 20],
      materialNameRu: 'Тёмно-оливковое стекло',
      labelRgb: [245, 240, 230],
      labelAccentRgb: [136, 19, 55],
      capRgb: [136, 19, 55],
    },
  },
];

/**
 * Returns every base item from ITEM_CATALOG plus curated & registry-derived
 * attribute presets (materials, colors, shapes, models, cuts, varieties)
 * and all liquids/substances in glass jars for the Freeroam Catalog.
 */
export function getAllFreeCatalogItems(): FreeCatalogEntry[] {
  if (cachedEntries) return cachedEntries;

  const entries: FreeCatalogEntry[] = [];

  // 1. All raw base items from ITEM_CATALOG
  for (const [key, def] of Object.entries(ITEM_CATALOG)) {
    const wSpec = WEAPON_SPECS[key];
    const mSpec = MAGAZINE_SPECS[key];
    const aSpec = AMMO_SPECS[key];
    const searchTags = wSpec
      ? `оружие ${wSpec.weaponClass === 'pneumatic' ? 'пневматика воздушка' : 'огнестрел огнестрельное'} ${wSpec.caliberRu} ${wSpec.caliber} ${wSpec.category} ${wSpec.propellant}`
      : mSpec
      ? `магазин обойма барабанчик ${mSpec.caliber} ${mSpec.capacity}`
      : aSpec
      ? `патроны боеприпасы пульки шарики ${aSpec.caliberRu} ${aSpec.caliber} ${aSpec.bulletType} ${aSpec.weaponClass === 'pneumatic' ? 'пневматика' : 'огнестрел'}`
      : undefined;
    entries.push({
      id: key,
      key,
      kind: 'base',
      nameRu: def.nameRu || def.name,
      name: def.name,
      descriptionRu: def.descriptionRu || def.description || '',
      category: def.category,
      maxStack: Math.max(1, def.maxStack || 1),
      weight: def.weight || 0,
      isRawBase: true,
      searchTags,
      create: (count = 1) => {
        if (aSpec) {
          const spawnCount = count <= 1 ? aSpec.defaultPackCount : Math.min(aSpec.maxStack, count);
          return createItem(key, spawnCount, undefined, true);
        }
        return createItem(key, count, undefined, true);
      },
    });
  }

  // 2. All liquids & substances from LIQUID_REGISTRY in glass jars (0.5L)
  for (const [liqKey, liqDef] of Object.entries(LIQUID_REGISTRY)) {
    const liquidId = liqKey as LiquidId;
    const isSmallConcentrate =
      liquidId === 'food_dye' ||
      liquidId === 'botanical_extract' ||
      liquidId === 'essential_oil' ||
      liquidId === 'medical_solution' ||
      liquidId === 'spice_dry' ||
      liquidId === 'caviar' ||
      liquidId === 'food_acid';
    const jarId = isSmallConcentrate ? 'jar_glass_small' : 'jar_glass_medium';
    const jarMl = isSmallConcentrate ? 200 : 500;
    const labelRu = `Баночка: ${liqDef.nameRu}`;

    entries.push(
      makePresetEntry(
        `liquid_jar_${liquidId}`,
        'Жидкости в баночках',
        () =>
          createLiquidJarItem(liquidId, {
            containerId: jarId,
            amountMl: jarMl,
          }),
        {
          kind: 'liquid_jar',
          nameRuOverride: labelRu,
          accentColor: liqDef.color,
          searchTags: `баночка банка жидкость ${liqDef.nameRu} ${liqDef.name} ${liquidId} ${liqDef.category}`,
        }
      )
    );
  }

  // 3. Extended named liquid varieties from EXTENDED_LEGACY_CONTAINER_MAP in glass jars
  const seenLiquidVarietyNames = new Set<string>(
    Object.values(LIQUID_REGISTRY).map(d => d.nameRu.trim().toLowerCase())
  );
  for (const [subKey, cfg] of Object.entries(EXTENDED_LEGACY_CONTAINER_MAP)) {
    if (!cfg.liquidId) continue;
    const baseLiq = LIQUID_REGISTRY[cfg.liquidId];
    if (!baseLiq) continue;
    // Include liquid (non-granular) varieties + caviar/preserves so every liquid variety is available in a jar
    if (baseLiq.isGranular && cfg.liquidId !== 'caviar') continue;
    const varietyRu = cfg.attributes?.varietyRu?.trim();
    if (!varietyRu) continue;
    const normName = varietyRu.toLowerCase();
    if (seenLiquidVarietyNames.has(normName)) continue;
    seenLiquidVarietyNames.add(normName);

    const jarId: 'jar_glass_small' | 'jar_glass_medium' =
      cfg.amountMl <= 250 ? 'jar_glass_small' : 'jar_glass_medium';
    const jarMl = jarId === 'jar_glass_small' ? 200 : 500;

    entries.push(
      makePresetEntry(
        `liquid_jar_var_${subKey}`,
        'Сорта жидкостей в баночках',
        () =>
          createLiquidJarItem(cfg.liquidId as LiquidId, {
            containerId: jarId,
            amountMl: jarMl,
            attributes: cfg.attributes ? { ...cfg.attributes } : undefined,
            originalCatalogId: subKey,
          }),
        {
          kind: 'liquid_jar',
          nameRuOverride: `Баночка: ${varietyRu}`,
          accentColor: cfg.attributes?.customColor || baseLiq.color,
          searchTags: `баночка банка жидкость ${varietyRu} ${baseLiq.nameRu} ${subKey} ${cfg.liquidId}`,
        }
      )
    );
  }

  // 4. Kitchenware presets (materials, colors, patterns, shapes)
  const skippedKwAliases = new Set(['soup_bowl_empty', 'glass_mug']);
  for (const [presetId, kw] of Object.entries(LEGACY_KITCHENWARE_PRESETS)) {
    if (skippedKwAliases.has(presetId)) continue;
    const baseName = ITEM_CATALOG[kw.kind]?.nameRu || kw.kind;
    const matShort = kw.attrs.materialRu || kw.attrs.material || '';
    const colShort = kw.attrs.colorNameRu || '';
    const label = `${baseName} (${[matShort, colShort].filter(Boolean).join(', ')})`;
    entries.push(
      makePresetEntry(
        `preset_kw_${presetId}`,
        'Посуда и утварь',
        (count = 1) => {
          const it = createKitchenware(kw.kind, kw.attrs, {
            weight: kw.weight,
            category: kw.category,
          });
          it.count = Math.max(1, count);
          return it;
        },
        {
          nameRuOverride: label,
          accentColor: kw.attrs.color,
          searchTags: `посуда ${baseName} ${matShort} ${colShort} ${kw.attrs.patternNameRu || ''} ${presetId}`,
        }
      )
    );
  }
  for (const extra of EXTRA_KITCHENWARE_PRESETS) {
    entries.push(
      makePresetEntry(
        extra.id,
        'Посуда и утварь',
        (count = 1) => {
          const it = createKitchenware(extra.kind, extra.attrs, {
            weight: extra.weight,
            category: extra.category,
          });
          it.count = Math.max(1, count);
          return it;
        },
        {
          nameRuOverride: extra.label,
          accentColor: extra.attrs.color,
          searchTags: `посуда ${extra.label} ${extra.attrs.materialRu || ''} ${extra.attrs.colorNameRu || ''} ${extra.attrs.patternNameRu || ''}`,
        }
      )
    );
  }

  // 5. Phone presets (every model & color finish)
  for (const [modelId, model] of Object.entries(PHONE_MODELS)) {
    model.colors.forEach((col, idx) => {
      entries.push(
        makePresetEntry(
          `preset_phone_${modelId}_${idx}`,
          'Смартфоны и телефоны',
          () =>
            createPhone(modelId, {
              colorHex: col.colorHex,
              colorNameRu: col.colorNameRu,
              accentHex: col.accentHex,
              cameraPlateColor: col.cameraPlateColor,
            }),
          {
            nameRuOverride: `${model.brand} ${model.modelName} (${col.colorNameRu})`,
            accentColor: col.colorHex,
            searchTags: `телефон смартфон ${model.brand} ${model.modelName} ${model.seriesName} ${col.colorNameRu} ${model.materialRu}`,
          }
        )
      );
    });
  }

  // 6. Rolling pin presets (materials, shapes, patterns)
  for (const [modelKey, rpAttrs] of Object.entries(ROLLING_PIN_PRESETS)) {
    entries.push(
      makePresetEntry(
        `preset_rp_${modelKey}`,
        'Скалки',
        () => {
          const it = createItem('rolling_pin', 1, undefined, true);
          applyRollingPinAttributesToItem(it, { modelId: modelKey as RollingPinModel });
          return normalizeItemAttributes(it);
        },
        {
          accentColor: rpAttrs.color,
          searchTags: `скалка ${rpAttrs.modelNameRu} ${rpAttrs.materialRu} ${rpAttrs.colorNameRu} ${rpAttrs.patternNameRu}`,
        }
      )
    );
  }

  // 7. Gummy candy presets (shapes, colors, flavors, sour dust)
  for (const gp of GUMMY_PRESETS) {
    entries.push(
      makePresetEntry(
        gp.id,
        'Мармелад',
        (count = 1) => {
          const it = createGummyCandy(gp.attrs);
          it.count = Math.max(1, count);
          return it;
        },
        {
          accentColor: gp.attrs.color,
          searchTags: `мармелад мармеладка ${gp.attrs.colorNameRu || ''} ${gp.attrs.flavorRu || ''} ${gp.attrs.sourDust ? 'кислый' : ''}`,
        }
      )
    );
  }

  // 8. Chocolate presets (shapes, sizes, cocoa %, fillings, textures)
  for (const cp of CHOCOLATE_PRESETS) {
    entries.push(
      makePresetEntry(
        cp.id,
        'Шоколад и конфеты',
        (count = 1) => {
          const it = createChocolate(cp.attrs);
          it.count = Math.max(1, count);
          return it;
        },
        {
          nameRuOverride: cp.label,
          accentColor: cp.attrs.outerColor,
          searchTags: `шоколад конфета ${cp.label} ${cp.attrs.outerMaterialRu || ''} ${cp.attrs.innerMaterialRu || ''} ${cp.attrs.flavorRu || ''}`,
        }
      )
    );
  }

  // 9. Pelmeni presets (shapes, sizes, dough colors, fillings — raw neutral state)
  for (const pp of PELMEN_PRESETS) {
    entries.push(
      makePresetEntry(
        pp.id,
        'Пельмени и хинкали',
        (count = 1) => {
          const it = createPelmen(pp.attrs);
          it.count = Math.max(1, count);
          return it;
        },
        {
          nameRuOverride: pp.label,
          accentColor: pp.attrs.doughColor,
          searchTags: `пельмень пельмени хинкали равиоли ${pp.label} ${pp.attrs.doughNameRu || ''} ${pp.attrs.fillingRu || ''}`,
        }
      )
    );
  }

  // 10. Dough presets (types, shapes, ingredients, colors)
  for (const dp of DOUGH_PRESETS) {
    entries.push(
      makePresetEntry(
        dp.id,
        'Тесто и заготовки',
        (count = 1) => {
          const it = createItem('dough', count, undefined, true);
          const attrs = buildDefaultDoughAttributes({
            shape: dp.shape,
            cookState: dp.cookState || 'raw',
            riseFactor: dp.riseFactor ?? 1.0,
            ingredients: dp.ingredients.map(x => ({ ...x })),
          });
          applyDoughAttributesToItem(it, attrs);
          return normalizeItemAttributes(it);
        },
        {
          nameRuOverride: dp.label,
          searchTags: `тесто выпечка ${dp.label} ${dp.shape}`,
        }
      )
    );
  }

  // 11. Plant branch presets (bunches, clusters, vines)
  for (const branchKey of Object.keys(LEGACY_BRANCH_PRESETS)) {
    entries.push(
      makePresetEntry(
        `preset_branch_${branchKey}`,
        'Ветки и гроздья',
        () => createPlantBranch(branchKey),
        {
          searchTags: `ветка гроздь пучок ${branchKey}`,
        }
      )
    );
  }

  // 12. Produce cut/peeled/variety presets (skip any keys already in ITEM_CATALOG or temperature-boiled variants)
  for (const [prodKey, lp] of Object.entries(LEGACY_PRODUCE_PRESETS)) {
    if (ITEM_CATALOG[prodKey]) continue;
    if (lp.overrides?.isBoiled) continue;
    entries.push(
      makePresetEntry(
        `preset_prod_${prodKey}`,
        'Плоды и нарезка',
        (count = 1) => {
          const it = createProduceItem(lp.speciesId, lp.overrides);
          it.count = Math.max(1, count);
          return it;
        },
        {
          accentColor: lp.overrides?.color,
          searchTags: `овощи фрукты нарезка ${prodKey} ${lp.speciesId} ${lp.overrides?.varietyRu || ''}`,
        }
      )
    );
  }

  // 13. Decorative empty glass containers (different shapes, glass materials, caps & labels)
  for (const cp of EMPTY_CONTAINER_VISUAL_PRESETS) {
    entries.push(
      makePresetEntry(
        cp.id,
        'Тара и стекло',
        () => {
          const it = createItem(cp.containerId, 1, undefined, true);
          it.containerVisuals = { ...cp.visuals };
          if (it.fluidStorage) {
            it.fluidStorage.containerVisuals = { ...cp.visuals };
          }
          syncItemContainerProperties(it);
          return normalizeItemAttributes(it);
        },
        {
          nameRuOverride: cp.label,
          accentColor: `rgb(${cp.visuals.materialRgb.join(',')})`,
          searchTags: `банка бутылка тара стекло ${cp.label} ${cp.visuals.shapeNameRu || ''} ${cp.visuals.materialNameRu || ''}`,
        }
      )
    );
  }

  cachedEntries = entries;
  return entries;
}

export const FREE_CATALOG_CATEGORIES: { id: string; label: string; match: (entry: FreeCatalogEntry) => boolean }[] = [
  { id: 'all', label: 'Все', match: () => true },
  { id: 'weapon', label: 'Оружие', match: e => e.category === 'weapon' },
  { id: 'ammo', label: 'Боеприпасы', match: e => e.category === 'ammo' },
  { id: 'presets', label: 'Пресеты', match: e => e.kind === 'preset' },
  { id: 'liquids', label: 'Жидкости', match: e => e.kind === 'liquid_jar' },
  { id: 'food', label: 'Еда', match: e => e.category === 'food' },
  { id: 'drink', label: 'Напитки', match: e => e.category === 'drink' },
  { id: 'med', label: 'Медицина', match: e => e.category === 'med' || e.category === 'medical' },
  { id: 'tool', label: 'Инструменты', match: e => e.category === 'tool' || e.category === 'gear' },
  { id: 'clothing', label: 'Одежда', match: e => e.category === 'clothing' },
  { id: 'electronics', label: 'Электроника', match: e => e.category === 'electronics' },
  { id: 'valuable', label: 'Ценности', match: e => e.category === 'valuable' },
  {
    id: 'other',
    label: 'Прочее',
    match: e =>
      !['weapon', 'ammo', 'food', 'drink', 'med', 'medical', 'tool', 'gear', 'clothing', 'electronics', 'valuable'].includes(e.category),
  },
];

export function getFreeCategoryLabelRu(category: string): string {
  switch (category) {
    case 'weapon':
      return 'Оружие';
    case 'ammo':
      return 'Боеприпасы';
    case 'food':
      return 'Еда';
    case 'drink':
      return 'Напиток';
    case 'med':
    case 'medical':
      return 'Медицина';
    case 'tool':
      return 'Инструмент';
    case 'gear':
      return 'Снаряжение';
    case 'clothing':
      return 'Одежда';
    case 'electronics':
      return 'Электроника';
    case 'valuable':
      return 'Ценность';
    case 'furniture':
      return 'Мебель';
    case 'auto':
      return 'Авто';
    case 'trash':
      return 'Мусор';
    default:
      return 'Предмет';
  }
}

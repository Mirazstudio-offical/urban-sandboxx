import {
  InventoryItem,
  PlantBranchAttributes,
  PlantBranchKind,
  ProduceAttributes,
  ProduceCategory,
  ProduceCutForm,
  ProducePartKind,
  ProduceSizeTier,
} from './types';

export interface ProduceSpeciesSpec {
  speciesId: string;
  produceCategory: ProduceCategory;
  baseName: string;
  baseNameRu: string;
  defaultVarietyRu: string;
  defaultWeightGrams: number;
  defaultDimensionCm: number;
  defaultSize: ProduceSizeTier;
  defaultJuiciness: number; // 0..100
  color: string;
  colorNameRu: string;
  fleshColor: string;
  peelable?: boolean;
  peelWeightFraction?: number; // e.g. 0.14
  peelNameRu?: string;
  peelModelKey?: string;
  coreModelKey?: string;
  defaultPart?: ProducePartKind;
  defaultPartNameRu?: string;
  defaultCutForm?: ProduceCutForm;
  defaultIsDried?: boolean;
  preferredSliceCut?: 'slice' | 'wedge' | 'ring' | 'strips';
  preferredFineCut?: 'grated' | 'shredded' | 'crushed' | 'diced';
  separablePart?: {
    part: ProducePartKind;
    partNameRu: string;
    cutFormRu: string;
    count: number;
    isPeeled?: boolean;
    modelKey?: string;
  };
  /** Mapping of state keys ('peeled', 'half', 'chunk', 'wedge', 'slice', 'ring', 'strips', 'diced', 'shredded', 'grated', 'crushed', 'part', 'dried', 'peel', 'core') -> pre-drawn 2.5D modelKey */
  variantModelKeys?: Partial<Record<string, string>>;
}

export const PRODUCE_CUT_FORM_NAMES_RU: Record<ProduceCutForm, string> = {
  whole: 'Целый',
  peeled: 'Очищенный',
  half: 'Половинка',
  quarter: 'Четвертинка',
  chunk: 'Крупный кусок',
  wedge: 'Долька',
  slice: 'Кружок / ломтик',
  ring: 'Кольца',
  strips: 'Соломка / брусочки',
  diced: 'Кубики',
  shredded: 'Шинкованный',
  grated: 'Тёртый',
  crushed: 'Раздавленный (паста)',
  part: 'Отдельная часть',
  peel: 'Кожура',
  core: 'Огрызок',
};

export const PRODUCE_PART_NAMES_RU: Record<ProducePartKind, string> = {
  whole_fruit: 'Целый плод',
  flesh: 'Очищенная мякоть',
  piece: 'Отрезанная часть',
  clove: 'Зубчик',
  leaf: 'Лист',
  floret: 'Соцветие',
  cap: 'Шляпка',
  stem: 'Стебель / ножка',
  segment: 'Долька-сегмент',
  seeds: 'Зёрна',
  peel: 'Кожура / шкурка',
  core: 'Огрызок / сердцевина',
};

export const PRODUCE_SIZE_NAMES_RU: Record<ProduceSizeTier, string> = {
  tiny: 'Мелкий',
  small: 'Малый',
  medium: 'Средний',
  large: 'Крупный',
  giant: 'Очень крупный',
};

export const BRANCH_KIND_NAMES_RU: Record<PlantBranchKind, string> = {
  twig: 'Веточка',
  cluster: 'Гроздь / кисть',
  bunch: 'Пучок / связка',
  mycelium: 'Грибной сросток',
};

export function inferSizeTierFromCm(cm: number): ProduceSizeTier {
  if (cm < 2.2) return 'tiny';
  if (cm < 5.0) return 'small';
  if (cm < 11.0) return 'medium';
  if (cm < 20.0) return 'large';
  return 'giant';
}

export function formatSizeNameRu(tier: ProduceSizeTier, dimensionCm: number): string {
  const rounded = dimensionCm >= 10 ? Math.round(dimensionCm) : Number(dimensionCm.toFixed(1));
  return `${PRODUCE_SIZE_NAMES_RU[tier]} · ~${rounded} см`;
}

// =============================================================================
// 1. CANONICAL SINGLE-PIECE PRODUCE SPECIES REGISTRY
// =============================================================================
export const PRODUCE_SPECIES_SPECS: Record<string, ProduceSpeciesSpec> = {
  // --- VEGETABLES (21) ---
  potato_whole: {
    speciesId: 'potato_whole',
    produceCategory: 'vegetable',
    baseName: 'Potato',
    baseNameRu: 'Картофель',
    defaultVarietyRu: 'Жёлтый клубень',
    defaultWeightGrams: 150,
    defaultDimensionCm: 7.5,
    defaultSize: 'medium',
    defaultJuiciness: 68,
    color: '#ca8a04',
    colorNameRu: 'Золотисто-коричневый',
    fleshColor: '#fef3c7',
    peelable: true,
    peelWeightFraction: 0.13,
    peelNameRu: 'Картофельная кожура',
    preferredSliceCut: 'wedge',
    preferredFineCut: 'grated',
    variantModelKeys: {
      whole: 'potato_whole',
      peeled: 'potato_peeled',
      wedge: 'potato_sliced',
      slice: 'potato_sliced',
      strips: 'potato_sliced',
      grated: 'potato_grated',
      shredded: 'potato_grated',
    },
  },
  carrot_whole: {
    speciesId: 'carrot_whole',
    produceCategory: 'vegetable',
    baseName: 'Carrot',
    baseNameRu: 'Морковь',
    defaultVarietyRu: 'Сладкая оранжевая',
    defaultWeightGrams: 120,
    defaultDimensionCm: 15.0,
    defaultSize: 'medium',
    defaultJuiciness: 74,
    color: '#ea580c',
    colorNameRu: 'Ярко-оранжевый',
    fleshColor: '#fb923c',
    peelable: true,
    peelWeightFraction: 0.14,
    peelNameRu: 'Морковная шкурка',
    preferredSliceCut: 'slice',
    preferredFineCut: 'grated',
    variantModelKeys: {
      whole: 'carrot_whole',
      peeled: 'carrot_peeled',
      diced: 'carrot_diced',
      grated: 'carrot_grated',
      shredded: 'carrot_grated',
    },
  },
  beet_whole: {
    speciesId: 'beet_whole',
    produceCategory: 'vegetable',
    baseName: 'Beetroot',
    baseNameRu: 'Свёкла',
    defaultVarietyRu: 'Красная столовая',
    defaultWeightGrams: 250,
    defaultDimensionCm: 9.0,
    defaultSize: 'medium',
    defaultJuiciness: 78,
    color: '#881337',
    colorNameRu: 'Тёмно-бордовый',
    fleshColor: '#be123c',
    peelable: true,
    peelWeightFraction: 0.15,
    peelNameRu: 'Свекольная кожура',
    preferredSliceCut: 'slice',
    preferredFineCut: 'grated',
    variantModelKeys: {
      whole: 'beet_whole',
      peeled: 'beet_peeled_boiled',
      slice: 'beet_sliced',
      wedge: 'beet_sliced',
      grated: 'beet_grated',
      shredded: 'beet_grated',
    },
  },
  turnip_whole: {
    speciesId: 'turnip_whole',
    produceCategory: 'vegetable',
    baseName: 'Turnip',
    baseNameRu: 'Репа',
    defaultVarietyRu: 'Жёлтая столовая',
    defaultWeightGrams: 200,
    defaultDimensionCm: 8.5,
    defaultSize: 'medium',
    defaultJuiciness: 70,
    color: '#eab308',
    colorNameRu: 'Жёлтый',
    fleshColor: '#fef9c3',
    peelable: true,
    peelWeightFraction: 0.14,
    preferredSliceCut: 'strips',
    preferredFineCut: 'grated',
    variantModelKeys: {
      whole: 'turnip_whole',
      strips: 'turnip_sliced',
      wedge: 'turnip_sliced',
      slice: 'turnip_sliced',
    },
  },
  onion_bulb: {
    speciesId: 'onion_bulb',
    produceCategory: 'vegetable',
    baseName: 'Onion',
    baseNameRu: 'Репчатый лук',
    defaultVarietyRu: 'Золотистая головка',
    defaultWeightGrams: 100,
    defaultDimensionCm: 6.5,
    defaultSize: 'medium',
    defaultJuiciness: 82,
    color: '#b45309',
    colorNameRu: 'Золотисто-медный',
    fleshColor: '#fefce8',
    peelable: true,
    peelWeightFraction: 0.1,
    peelNameRu: 'Луковая шелуха',
    preferredSliceCut: 'ring',
    preferredFineCut: 'shredded',
    variantModelKeys: {
      whole: 'onion_bulb',
      peeled: 'onion_peeled',
      ring: 'onion_rings',
      slice: 'onion_rings',
      shredded: 'onion_chopped',
      diced: 'onion_chopped',
    },
  },
  leek_stalk: {
    speciesId: 'leek_stalk',
    produceCategory: 'vegetable',
    baseName: 'Leek',
    baseNameRu: 'Лук-порей',
    defaultVarietyRu: 'Свежий стебель',
    defaultWeightGrams: 250,
    defaultDimensionCm: 28.0,
    defaultSize: 'large',
    defaultJuiciness: 76,
    color: '#4d7c0f',
    colorNameRu: 'Бело-зелёный',
    fleshColor: '#ecfccb',
    defaultPart: 'stem',
    defaultPartNameRu: 'Стебель',
    preferredSliceCut: 'ring',
    preferredFineCut: 'shredded',
    variantModelKeys: {
      whole: 'leek_stalk',
      ring: 'leek_sliced',
      slice: 'leek_sliced',
    },
  },
  shallot_bulb: {
    speciesId: 'shallot_bulb',
    produceCategory: 'vegetable',
    baseName: 'Shallot',
    baseNameRu: 'Лук-шалот',
    defaultVarietyRu: 'Сладковатый розовый',
    defaultWeightGrams: 38,
    defaultDimensionCm: 4.2,
    defaultSize: 'small',
    defaultJuiciness: 79,
    color: '#a16207',
    colorNameRu: 'Медно-сиреневый',
    fleshColor: '#f5d0fe',
    peelable: true,
    peelWeightFraction: 0.1,
    preferredSliceCut: 'ring',
    preferredFineCut: 'shredded',
    variantModelKeys: {
      whole: 'shallot_bulb',
    },
  },
  garlic_bulb: {
    speciesId: 'garlic_bulb',
    produceCategory: 'vegetable',
    baseName: 'Garlic',
    baseNameRu: 'Чеснок',
    defaultVarietyRu: 'Яровой ароматный',
    defaultWeightGrams: 50,
    defaultDimensionCm: 5.0,
    defaultSize: 'small',
    defaultJuiciness: 62,
    color: '#e7e5e4',
    colorNameRu: 'Бело-кремовый',
    fleshColor: '#fef9c3',
    peelable: false,
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    separablePart: {
      part: 'clove',
      partNameRu: 'Очищенный зубчик',
      cutFormRu: 'Зубчик',
      count: 6,
      isPeeled: true,
      modelKey: 'garlic_clove',
    },
    variantModelKeys: {
      whole: 'garlic_bulb',
      part: 'garlic_clove',
      peeled: 'garlic_clove',
      crushed: 'garlic_crushed',
      grated: 'garlic_crushed',
    },
  },
  tomato_whole: {
    speciesId: 'tomato_whole',
    produceCategory: 'vegetable',
    baseName: 'Tomato',
    baseNameRu: 'Томат',
    defaultVarietyRu: 'Грунтовой красный',
    defaultWeightGrams: 150,
    defaultDimensionCm: 7.0,
    defaultSize: 'medium',
    defaultJuiciness: 93,
    color: '#dc2626',
    colorNameRu: 'Ало-красный',
    fleshColor: '#ef4444',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'tomato_whole',
      slice: 'tomato_sliced',
      diced: 'tomato_diced',
    },
  },
  tomato_cherry_single: {
    speciesId: 'tomato_cherry_single',
    produceCategory: 'vegetable',
    baseName: 'Cherry Tomato',
    baseNameRu: 'Томат черри',
    defaultVarietyRu: 'Сладкий мини-томат',
    defaultWeightGrams: 20,
    defaultDimensionCm: 2.6,
    defaultSize: 'tiny',
    defaultJuiciness: 92,
    color: '#ef4444',
    colorNameRu: 'Ярко-красный',
    fleshColor: '#f87171',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'tomato_cherry_single',
      half: 'tomato_cherry_sliced',
      slice: 'tomato_cherry_sliced',
    },
  },
  cucumber_whole: {
    speciesId: 'cucumber_whole',
    produceCategory: 'vegetable',
    baseName: 'Cucumber',
    baseNameRu: 'Огурец',
    defaultVarietyRu: 'Грунтовой хрустящий',
    defaultWeightGrams: 120,
    defaultDimensionCm: 14.0,
    defaultSize: 'medium',
    defaultJuiciness: 95,
    color: '#16a34a',
    colorNameRu: 'Насыщенно-зелёный',
    fleshColor: '#dcfce7',
    peelable: true,
    peelWeightFraction: 0.12,
    peelNameRu: 'Огуречная кожура',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'cucumber_whole',
      peeled: 'cucumber_peeled',
      slice: 'cucumber_sliced',
    },
  },
  eggplant_whole: {
    speciesId: 'eggplant_whole',
    produceCategory: 'vegetable',
    baseName: 'Eggplant',
    baseNameRu: 'Баклажан',
    defaultVarietyRu: 'Фиолетовый классический',
    defaultWeightGrams: 350,
    defaultDimensionCm: 18.0,
    defaultSize: 'large',
    defaultJuiciness: 72,
    color: '#581c87',
    colorNameRu: 'Глубокий фиолетовый',
    fleshColor: '#fef9c3',
    peelable: true,
    peelWeightFraction: 0.11,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'eggplant_whole',
      slice: 'eggplant_sliced',
    },
  },
  zucchini_whole: {
    speciesId: 'zucchini_whole',
    produceCategory: 'vegetable',
    baseName: 'Zucchini',
    baseNameRu: 'Кабачок цукини',
    defaultVarietyRu: 'Нежный зелёный',
    defaultWeightGrams: 400,
    defaultDimensionCm: 20.0,
    defaultSize: 'large',
    defaultJuiciness: 85,
    color: '#15803d',
    colorNameRu: 'Изумрудно-зелёный',
    fleshColor: '#ecfccb',
    peelable: true,
    peelWeightFraction: 0.1,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'zucchini_whole',
      slice: 'zucchini_sliced',
    },
  },
  pumpkin_whole: {
    speciesId: 'pumpkin_whole',
    produceCategory: 'vegetable',
    baseName: 'Pumpkin',
    baseNameRu: 'Тыква',
    defaultVarietyRu: 'Рыжая столовая',
    defaultWeightGrams: 5000,
    defaultDimensionCm: 32.0,
    defaultSize: 'giant',
    defaultJuiciness: 76,
    color: '#ea580c',
    colorNameRu: 'Ярко-рыжий',
    fleshColor: '#fb923c',
    peelable: true,
    peelWeightFraction: 0.16,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'pumpkin_whole',
      chunk: 'pumpkin_cut',
      half: 'pumpkin_cut',
      quarter: 'pumpkin_cut',
      wedge: 'pumpkin_cut',
      diced: 'pumpkin_diced',
    },
  },
  cabbage_white_head: {
    speciesId: 'cabbage_white_head',
    produceCategory: 'vegetable',
    baseName: 'White Cabbage',
    baseNameRu: 'Капуста белокочанная',
    defaultVarietyRu: 'Плотный кочан',
    defaultWeightGrams: 2000,
    defaultDimensionCm: 22.0,
    defaultSize: 'giant',
    defaultJuiciness: 84,
    color: '#86efac',
    colorNameRu: 'Светло-салатовый',
    fleshColor: '#f0fdf4',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    separablePart: {
      part: 'leaf',
      partNameRu: 'Капустный лист',
      cutFormRu: 'Листья',
      count: 6,
      modelKey: 'cabbage_leaves',
    },
    variantModelKeys: {
      whole: 'cabbage_white_head',
      half: 'cabbage_half',
      chunk: 'cabbage_half',
      quarter: 'cabbage_half',
      part: 'cabbage_leaves',
      shredded: 'cabbage_shredded',
      strips: 'cabbage_shredded',
    },
  },
  cauliflower_head: {
    speciesId: 'cauliflower_head',
    produceCategory: 'vegetable',
    baseName: 'Cauliflower',
    baseNameRu: 'Цветная капуста',
    defaultVarietyRu: 'Белый кочан',
    defaultWeightGrams: 800,
    defaultDimensionCm: 17.0,
    defaultSize: 'large',
    defaultJuiciness: 74,
    color: '#f5f5f4',
    colorNameRu: 'Молочно-белый',
    fleshColor: '#fafaf9',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    separablePart: {
      part: 'floret',
      partNameRu: 'Соцветие цветной капусты',
      cutFormRu: 'Соцветия',
      count: 4,
      modelKey: 'cauliflower_florets',
    },
    variantModelKeys: {
      whole: 'cauliflower_head',
      part: 'cauliflower_florets',
    },
  },
  broccoli_head: {
    speciesId: 'broccoli_head',
    produceCategory: 'vegetable',
    baseName: 'Broccoli',
    baseNameRu: 'Брокколи',
    defaultVarietyRu: 'Зелёный кочан',
    defaultWeightGrams: 600,
    defaultDimensionCm: 15.0,
    defaultSize: 'large',
    defaultJuiciness: 77,
    color: '#15803d',
    colorNameRu: 'Тёмно-зелёный',
    fleshColor: '#4ade80',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    separablePart: {
      part: 'floret',
      partNameRu: 'Соцветие брокколи',
      cutFormRu: 'Соцветия',
      count: 4,
      modelKey: 'broccoli_florets',
    },
    variantModelKeys: {
      whole: 'broccoli_head',
      part: 'broccoli_florets',
    },
  },
  bell_pepper_red: {
    speciesId: 'bell_pepper_red',
    produceCategory: 'vegetable',
    baseName: 'Bell Pepper',
    baseNameRu: 'Болгарский перец',
    defaultVarietyRu: 'Сладкий красный',
    defaultWeightGrams: 180,
    defaultDimensionCm: 10.5,
    defaultSize: 'medium',
    defaultJuiciness: 88,
    color: '#dc2626',
    colorNameRu: 'Насыщенно-красный',
    fleshColor: '#f87171',
    preferredSliceCut: 'strips',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'bell_pepper_red',
      strips: 'bell_pepper_sliced',
      slice: 'bell_pepper_sliced',
    },
  },
  chili_pepper_fresh: {
    speciesId: 'chili_pepper_fresh',
    produceCategory: 'vegetable',
    baseName: 'Chili Pepper',
    baseNameRu: 'Острый перец чили',
    defaultVarietyRu: 'Красный жгучий стручок',
    defaultWeightGrams: 20,
    defaultDimensionCm: 9.0,
    defaultSize: 'small',
    defaultJuiciness: 70,
    color: '#b91c1c',
    colorNameRu: 'Огненно-красный',
    fleshColor: '#ef4444',
    preferredSliceCut: 'ring',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'chili_pepper_fresh',
      ring: 'chili_pepper_sliced',
      slice: 'chili_pepper_sliced',
      dried: 'chili_pepper_dried',
    },
  },
  radish_single: {
    speciesId: 'radish_single',
    produceCategory: 'vegetable',
    baseName: 'Radish',
    baseNameRu: 'Редис',
    defaultVarietyRu: 'Красный хрустящий',
    defaultWeightGrams: 28,
    defaultDimensionCm: 3.4,
    defaultSize: 'small',
    defaultJuiciness: 86,
    color: '#e11d48',
    colorNameRu: 'Малиново-красный',
    fleshColor: '#f8fafc',
    preferredSliceCut: 'slice',
    preferredFineCut: 'grated',
    variantModelKeys: {
      whole: 'radish_single',
    },
  },
  ginger_root_fresh: {
    speciesId: 'ginger_root_fresh',
    produceCategory: 'vegetable',
    baseName: 'Ginger Root',
    baseNameRu: 'Корень имбиря',
    defaultVarietyRu: 'Пряный свежий',
    defaultWeightGrams: 150,
    defaultDimensionCm: 11.0,
    defaultSize: 'medium',
    defaultJuiciness: 65,
    color: '#d97706',
    colorNameRu: 'Охристо-золотистый',
    fleshColor: '#fef08a',
    peelable: true,
    peelWeightFraction: 0.14,
    preferredSliceCut: 'slice',
    preferredFineCut: 'grated',
    variantModelKeys: {
      whole: 'ginger_root_fresh',
      grated: 'ginger_grated',
      shredded: 'ginger_grated',
      crushed: 'ginger_grated',
    },
  },

  // --- FRUITS, CITRUSES & LARGE BERRIES (24) ---
  apple: {
    speciesId: 'apple',
    produceCategory: 'fruit',
    baseName: 'Apple',
    baseNameRu: 'Яблоко',
    defaultVarietyRu: 'Красное спелое',
    defaultWeightGrams: 165,
    defaultDimensionCm: 7.5,
    defaultSize: 'medium',
    defaultJuiciness: 86,
    color: '#dc2626',
    colorNameRu: 'Румяно-красный',
    fleshColor: '#fefce8',
    peelable: true,
    peelWeightFraction: 0.1,
    coreModelKey: 'apple_core',
    preferredSliceCut: 'wedge',
    preferredFineCut: 'grated',
    variantModelKeys: {
      whole: 'apple',
      wedge: 'apple_sliced',
      slice: 'apple_sliced',
      core: 'apple_core',
    },
  },
  pear_yellow: {
    speciesId: 'pear_yellow',
    produceCategory: 'fruit',
    baseName: 'Pear',
    baseNameRu: 'Груша',
    defaultVarietyRu: 'Дюшес медовая',
    defaultWeightGrams: 180,
    defaultDimensionCm: 9.0,
    defaultSize: 'medium',
    defaultJuiciness: 91,
    color: '#eab308',
    colorNameRu: 'Золотисто-жёлтый',
    fleshColor: '#fefce8',
    peelable: true,
    peelWeightFraction: 0.1,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'pear_yellow',
      wedge: 'pear_sliced',
      slice: 'pear_sliced',
    },
  },
  plum_purple: {
    speciesId: 'plum_purple',
    produceCategory: 'fruit',
    baseName: 'Plum',
    baseNameRu: 'Слива',
    defaultVarietyRu: 'Синяя сладкая',
    defaultWeightGrams: 45,
    defaultDimensionCm: 4.5,
    defaultSize: 'small',
    defaultJuiciness: 85,
    color: '#6b21a8',
    colorNameRu: 'Сине-фиолетовый',
    fleshColor: '#facc15',
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'plum_purple',
      half: 'plum_halves',
    },
  },
  apricot_orange: {
    speciesId: 'apricot_orange',
    produceCategory: 'fruit',
    baseName: 'Apricot',
    baseNameRu: 'Абрикос',
    defaultVarietyRu: 'Бархатистый спелый',
    defaultWeightGrams: 40,
    defaultDimensionCm: 4.3,
    defaultSize: 'small',
    defaultJuiciness: 82,
    color: '#f97316',
    colorNameRu: 'Солнечно-абрикосовый',
    fleshColor: '#fdba74',
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'apricot_orange',
      half: 'apricot_halves',
    },
  },
  peach_velvet: {
    speciesId: 'peach_velvet',
    produceCategory: 'fruit',
    baseName: 'Peach',
    baseNameRu: 'Персик',
    defaultVarietyRu: 'Бархатистый южный',
    defaultWeightGrams: 150,
    defaultDimensionCm: 7.2,
    defaultSize: 'medium',
    defaultJuiciness: 92,
    color: '#fb7185',
    colorNameRu: 'Персиково-румяный',
    fleshColor: '#fed7aa',
    peelable: true,
    peelWeightFraction: 0.09,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'peach_velvet',
    },
  },
  orange_citrus: {
    speciesId: 'orange_citrus',
    produceCategory: 'citrus',
    baseName: 'Orange',
    baseNameRu: 'Апельсин',
    defaultVarietyRu: 'Сладкий сочный',
    defaultWeightGrams: 200,
    defaultDimensionCm: 8.0,
    defaultSize: 'medium',
    defaultJuiciness: 93,
    color: '#f97316',
    colorNameRu: 'Оранжевый',
    fleshColor: '#fb923c',
    peelable: true,
    peelWeightFraction: 0.22,
    peelNameRu: 'Апельсиновая цедра',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    separablePart: {
      part: 'segment',
      partNameRu: 'Долька апельсина',
      cutFormRu: 'Очищенные дольки',
      count: 6,
      isPeeled: true,
      modelKey: 'orange_segments',
    },
    variantModelKeys: {
      whole: 'orange_citrus',
      peeled: 'orange_segments',
      part: 'orange_segments',
      wedge: 'orange_segments',
    },
  },
  blood_orange_citrus: {
    speciesId: 'blood_orange_citrus',
    produceCategory: 'citrus',
    baseName: 'Blood Orange',
    baseNameRu: 'Красный апельсин',
    defaultVarietyRu: 'Сицилийский',
    defaultWeightGrams: 190,
    defaultDimensionCm: 7.8,
    defaultSize: 'medium',
    defaultJuiciness: 94,
    color: '#c2410c',
    colorNameRu: 'Багрово-оранжевый',
    fleshColor: '#be123c',
    peelable: true,
    peelWeightFraction: 0.22,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    separablePart: {
      part: 'segment',
      partNameRu: 'Долька красного апельсина',
      cutFormRu: 'Очищенные дольки',
      count: 6,
      isPeeled: true,
    },
    variantModelKeys: {
      whole: 'blood_orange_citrus',
    },
  },
  mandarin_citrus: {
    speciesId: 'mandarin_citrus',
    produceCategory: 'citrus',
    baseName: 'Mandarin',
    baseNameRu: 'Мандарин',
    defaultVarietyRu: 'Сладкий тонкокорый',
    defaultWeightGrams: 90,
    defaultDimensionCm: 5.8,
    defaultSize: 'small',
    defaultJuiciness: 91,
    color: '#fb923c',
    colorNameRu: 'Ярко-мандариновый',
    fleshColor: '#fdba74',
    peelable: true,
    peelWeightFraction: 0.2,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    separablePart: {
      part: 'segment',
      partNameRu: 'Долька мандарина',
      cutFormRu: 'Очищенные дольки',
      count: 6,
      isPeeled: true,
    },
    variantModelKeys: {
      whole: 'mandarin_citrus',
    },
  },
  grapefruit_pink: {
    speciesId: 'grapefruit_pink',
    produceCategory: 'citrus',
    baseName: 'Grapefruit',
    baseNameRu: 'Грейпфрут',
    defaultVarietyRu: 'Рубиновый розовый',
    defaultWeightGrams: 340,
    defaultDimensionCm: 10.5,
    defaultSize: 'medium',
    defaultJuiciness: 94,
    color: '#fb7185',
    colorNameRu: 'Розово-золотистый',
    fleshColor: '#e11d48',
    peelable: true,
    peelWeightFraction: 0.25,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    separablePart: {
      part: 'segment',
      partNameRu: 'Долька грейпфрута',
      cutFormRu: 'Очищенные дольки',
      count: 6,
      isPeeled: true,
    },
    variantModelKeys: {
      whole: 'grapefruit_pink',
    },
  },
  yuzu_citrus: {
    speciesId: 'yuzu_citrus',
    produceCategory: 'citrus',
    baseName: 'Yuzu Citrus',
    baseNameRu: 'Цитрус юзу',
    defaultVarietyRu: 'Японский ароматный',
    defaultWeightGrams: 140,
    defaultDimensionCm: 6.5,
    defaultSize: 'medium',
    defaultJuiciness: 87,
    color: '#eab308',
    colorNameRu: 'Жёлто-золотистый',
    fleshColor: '#fef08a',
    peelable: true,
    peelWeightFraction: 0.26,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'yuzu_citrus',
    },
  },
  lemon_whole: {
    speciesId: 'lemon_whole',
    produceCategory: 'citrus',
    baseName: 'Lemon',
    baseNameRu: 'Лимон',
    defaultVarietyRu: 'Кислый жёлтый',
    defaultWeightGrams: 120,
    defaultDimensionCm: 7.5,
    defaultSize: 'medium',
    defaultJuiciness: 90,
    color: '#facc15',
    colorNameRu: 'Лимонно-жёлтый',
    fleshColor: '#fef9c3',
    peelable: true,
    peelWeightFraction: 0.24,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'lemon_whole',
      slice: 'lemon_slice',
      wedge: 'lemon_slice',
    },
  },
  lime_whole: {
    speciesId: 'lime_whole',
    produceCategory: 'citrus',
    baseName: 'Lime',
    baseNameRu: 'Лайм',
    defaultVarietyRu: 'Зелёный ароматный',
    defaultWeightGrams: 80,
    defaultDimensionCm: 5.5,
    defaultSize: 'small',
    defaultJuiciness: 89,
    color: '#65a30d',
    colorNameRu: 'Лаймово-зелёный',
    fleshColor: '#d9f99d',
    peelable: true,
    peelWeightFraction: 0.22,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'lime_whole',
      slice: 'lime_slice',
      wedge: 'lime_slice',
    },
  },
  banana: {
    speciesId: 'banana',
    produceCategory: 'fruit',
    baseName: 'Banana',
    baseNameRu: 'Банан',
    defaultVarietyRu: 'Спелый десертный',
    defaultWeightGrams: 150,
    defaultDimensionCm: 18.0,
    defaultSize: 'large',
    defaultJuiciness: 68,
    color: '#facc15',
    colorNameRu: 'Солнечно-жёлтый',
    fleshColor: '#fef9c3',
    peelable: true,
    peelWeightFraction: 0.24,
    peelNameRu: 'Банановая кожура',
    peelModelKey: 'banana_peel',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: {
      whole: 'banana',
      peeled: 'banana_peeled',
      peel: 'banana_peel',
    },
  },
  melon_cantaloupe: {
    speciesId: 'melon_cantaloupe',
    produceCategory: 'large_berry',
    baseName: 'Cantaloupe Melon',
    baseNameRu: 'Дыня Канталупа',
    defaultVarietyRu: 'Медовая круглая',
    defaultWeightGrams: 2200,
    defaultDimensionCm: 20.0,
    defaultSize: 'giant',
    defaultJuiciness: 92,
    color: '#d97706',
    colorNameRu: 'Золотисто-песочный',
    fleshColor: '#fb923c',
    peelable: true,
    peelWeightFraction: 0.2,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'melon_cantaloupe',
      chunk: 'melon_slice',
      wedge: 'melon_slice',
      slice: 'melon_slice',
    },
  },
  watermelon_whole: {
    speciesId: 'watermelon_whole',
    produceCategory: 'large_berry',
    baseName: 'Watermelon',
    baseNameRu: 'Арбуз',
    defaultVarietyRu: 'Полосатый сахарный',
    defaultWeightGrams: 6500,
    defaultDimensionCm: 30.0,
    defaultSize: 'giant',
    defaultJuiciness: 97,
    color: '#15803d',
    colorNameRu: 'Полосато-зелёный',
    fleshColor: '#f43f5e',
    peelable: true,
    peelWeightFraction: 0.28,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'watermelon_whole',
      chunk: 'watermelon_slice',
      wedge: 'watermelon_slice',
      slice: 'watermelon_slice',
    },
  },
  pomegranate_whole: {
    speciesId: 'pomegranate_whole',
    produceCategory: 'large_berry',
    baseName: 'Pomegranate',
    baseNameRu: 'Гранат',
    defaultVarietyRu: 'Королевский рубиновый',
    defaultWeightGrams: 400,
    defaultDimensionCm: 10.0,
    defaultSize: 'medium',
    defaultJuiciness: 90,
    color: '#b91c1c',
    colorNameRu: 'Гранатово-рубиновый',
    fleshColor: '#e11d48',
    peelable: false,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    separablePart: {
      part: 'seeds',
      partNameRu: 'Рубиновые зёрна граната',
      cutFormRu: 'Зёрна',
      count: 4,
      isPeeled: true,
    },
    variantModelKeys: {
      whole: 'pomegranate_whole',
    },
  },
  kiwi_fruit: {
    speciesId: 'kiwi_fruit',
    produceCategory: 'large_berry',
    baseName: 'Kiwi',
    baseNameRu: 'Киви',
    defaultVarietyRu: 'Изумрудный спелый',
    defaultWeightGrams: 80,
    defaultDimensionCm: 6.2,
    defaultSize: 'small',
    defaultJuiciness: 88,
    color: '#92400e',
    colorNameRu: 'Орехово-бурый',
    fleshColor: '#4ade80',
    peelable: true,
    peelWeightFraction: 0.14,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'kiwi_fruit',
      peeled: 'kiwi_peeled',
      slice: 'kiwi_sliced',
    },
  },
  grape_single: {
    speciesId: 'grape_single',
    produceCategory: 'large_berry',
    baseName: 'Grape',
    baseNameRu: 'Виноград',
    defaultVarietyRu: 'Зелёный кишмиш',
    defaultWeightGrams: 8,
    defaultDimensionCm: 1.8,
    defaultSize: 'tiny',
    defaultJuiciness: 91,
    color: '#84cc16',
    colorNameRu: 'Светло-зелёный',
    fleshColor: '#d9f99d',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: {
      whole: 'grape_single',
    },
  },
  pineapple_whole: {
    speciesId: 'pineapple_whole',
    produceCategory: 'fruit',
    baseName: 'Pineapple',
    baseNameRu: 'Ананас',
    defaultVarietyRu: 'Золотой тропический',
    defaultWeightGrams: 1400,
    defaultDimensionCm: 24.0,
    defaultSize: 'giant',
    defaultJuiciness: 92,
    color: '#ca8a04',
    colorNameRu: 'Золотисто-янтарный',
    fleshColor: '#fde047',
    peelable: true,
    peelWeightFraction: 0.3,
    preferredSliceCut: 'ring',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'pineapple_whole',
    },
  },
  mango_whole: {
    speciesId: 'mango_whole',
    produceCategory: 'fruit',
    baseName: 'Mango',
    baseNameRu: 'Манго',
    defaultVarietyRu: 'Медовое красно-золотое',
    defaultWeightGrams: 380,
    defaultDimensionCm: 12.0,
    defaultSize: 'large',
    defaultJuiciness: 93,
    color: '#ea580c',
    colorNameRu: 'Красно-золотистый',
    fleshColor: '#fbbf24',
    peelable: true,
    peelWeightFraction: 0.16,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'mango_whole',
    },
  },
  passionfruit_whole: {
    speciesId: 'passionfruit_whole',
    produceCategory: 'fruit',
    baseName: 'Passionfruit',
    baseNameRu: 'Маракуйя',
    defaultVarietyRu: 'Фиолетовая ароматная',
    defaultWeightGrams: 90,
    defaultDimensionCm: 6.0,
    defaultSize: 'small',
    defaultJuiciness: 91,
    color: '#6b21a8',
    colorNameRu: 'Фиолетово-бордовый',
    fleshColor: '#f59e0b',
    peelable: false,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'crushed',
    variantModelKeys: {
      whole: 'passionfruit_whole',
    },
  },
  guava_whole: {
    speciesId: 'guava_whole',
    produceCategory: 'fruit',
    baseName: 'Guava',
    baseNameRu: 'Гуава',
    defaultVarietyRu: 'Розовая тропическая',
    defaultWeightGrams: 180,
    defaultDimensionCm: 7.5,
    defaultSize: 'medium',
    defaultJuiciness: 85,
    color: '#84cc16',
    colorNameRu: 'Салатово-жёлтый',
    fleshColor: '#fb7185',
    peelable: true,
    peelWeightFraction: 0.1,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'guava_whole',
    },
  },
  papaya_whole: {
    speciesId: 'papaya_whole',
    produceCategory: 'fruit',
    baseName: 'Papaya',
    baseNameRu: 'Папайя',
    defaultVarietyRu: 'Янтарная спелая',
    defaultWeightGrams: 750,
    defaultDimensionCm: 18.0,
    defaultSize: 'large',
    defaultJuiciness: 89,
    color: '#f59e0b',
    colorNameRu: 'Янтарно-оранжевый',
    fleshColor: '#fb923c',
    peelable: true,
    peelWeightFraction: 0.18,
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'papaya_whole',
    },
  },
  dragonfruit_whole: {
    speciesId: 'dragonfruit_whole',
    produceCategory: 'fruit',
    baseName: 'Dragonfruit',
    baseNameRu: 'Питахайя (драгонфрут)',
    defaultVarietyRu: 'Малиновая спелая',
    defaultWeightGrams: 420,
    defaultDimensionCm: 13.0,
    defaultSize: 'large',
    defaultJuiciness: 88,
    color: '#db2777',
    colorNameRu: 'Ярко-малиновый',
    fleshColor: '#f8fafc',
    peelable: true,
    peelWeightFraction: 0.25,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'dragonfruit_whole',
    },
  },
  lychee_single: {
    speciesId: 'lychee_single',
    produceCategory: 'fruit',
    baseName: 'Lychee',
    baseNameRu: 'Личи',
    defaultVarietyRu: 'Сладкий цветочный',
    defaultWeightGrams: 22,
    defaultDimensionCm: 3.2,
    defaultSize: 'small',
    defaultJuiciness: 90,
    color: '#e11d48',
    colorNameRu: 'Розово-малиновый',
    fleshColor: '#f8fafc',
    peelable: true,
    peelWeightFraction: 0.22,
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'lychee_single',
    },
  },

  // --- MUSHROOMS (15) ---
  cep_mushroom_whole: {
    speciesId: 'cep_mushroom_whole',
    produceCategory: 'mushroom',
    baseName: 'Porcini Mushroom',
    baseNameRu: 'Белый гриб (боровик)',
    defaultVarietyRu: 'Лесной благородный',
    defaultWeightGrams: 100,
    defaultDimensionCm: 10.0,
    defaultSize: 'medium',
    defaultJuiciness: 76,
    color: '#78350f',
    colorNameRu: 'Каштаново-коричневый',
    fleshColor: '#fef9c3',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'cep_mushroom_whole',
      dried: 'cep_mushroom_dried',
    },
  },
  boletus_mushroom_whole: {
    speciesId: 'boletus_mushroom_whole',
    produceCategory: 'mushroom',
    baseName: 'Birch Boletus',
    baseNameRu: 'Подберёзовик',
    defaultVarietyRu: 'Лесной свежий',
    defaultWeightGrams: 80,
    defaultDimensionCm: 9.5,
    defaultSize: 'medium',
    defaultJuiciness: 74,
    color: '#92400e',
    colorNameRu: 'Буро-ореховый',
    fleshColor: '#f5f5f4',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'boletus_mushroom_whole' },
  },
  aspen_boletus_whole: {
    speciesId: 'aspen_boletus_whole',
    produceCategory: 'mushroom',
    baseName: 'Aspen Boletus',
    baseNameRu: 'Подосиновик',
    defaultVarietyRu: 'Красноголовик лесной',
    defaultWeightGrams: 90,
    defaultDimensionCm: 10.5,
    defaultSize: 'medium',
    defaultJuiciness: 75,
    color: '#c2410c',
    colorNameRu: 'Рыже-оранжевый',
    fleshColor: '#f5f5f4',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'aspen_boletus_whole' },
  },
  butter_boletus_whole: {
    speciesId: 'butter_boletus_whole',
    produceCategory: 'mushroom',
    baseName: 'Butter Boletus',
    baseNameRu: 'Маслёнок',
    defaultVarietyRu: 'Хвойный свежий',
    defaultWeightGrams: 60,
    defaultDimensionCm: 7.0,
    defaultSize: 'medium',
    defaultJuiciness: 80,
    color: '#a16207',
    colorNameRu: 'Маслянисто-шоколадный',
    fleshColor: '#fef08a',
    peelable: true,
    peelWeightFraction: 0.1,
    peelNameRu: 'Плёнка со шляпки маслёнка',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'butter_boletus_whole' },
  },
  mushroom_chanterelle_single: {
    speciesId: 'mushroom_chanterelle_single',
    produceCategory: 'mushroom',
    baseName: 'Chanterelle',
    baseNameRu: 'Лисичка',
    defaultVarietyRu: 'Золотистая лесная',
    defaultWeightGrams: 25,
    defaultDimensionCm: 5.5,
    defaultSize: 'small',
    defaultJuiciness: 72,
    color: '#f59e0b',
    colorNameRu: 'Яично-рыжий',
    fleshColor: '#fef08a',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'mushroom_chanterelle_single' },
  },
  mushroom_honey_agaric_single: {
    speciesId: 'mushroom_honey_agaric_single',
    produceCategory: 'mushroom',
    baseName: 'Honey Agaric',
    baseNameRu: 'Опёнок',
    defaultVarietyRu: 'Осенний лесной',
    defaultWeightGrams: 18,
    defaultDimensionCm: 5.0,
    defaultSize: 'small',
    defaultJuiciness: 73,
    color: '#b45309',
    colorNameRu: 'Медово-охристый',
    fleshColor: '#fef3c7',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'mushroom_honey_agaric_single' },
  },
  morel_spring_mushroom: {
    speciesId: 'morel_spring_mushroom',
    produceCategory: 'mushroom',
    baseName: 'Spring Morel',
    baseNameRu: 'Сморчок',
    defaultVarietyRu: 'Весенний деликатесный',
    defaultWeightGrams: 50,
    defaultDimensionCm: 8.0,
    defaultSize: 'medium',
    defaultJuiciness: 68,
    color: '#78350f',
    colorNameRu: 'Тёмно-медовый',
    fleshColor: '#e7e5e4',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'morel_spring_mushroom' },
  },
  truffle_black_rare: {
    speciesId: 'truffle_black_rare',
    produceCategory: 'mushroom',
    baseName: 'Black Truffle',
    baseNameRu: 'Чёрный трюфель',
    defaultVarietyRu: 'Перигорский редкий',
    defaultWeightGrams: 30,
    defaultDimensionCm: 4.5,
    defaultSize: 'small',
    defaultJuiciness: 54,
    color: '#292524',
    colorNameRu: 'Угольно-чёрный',
    fleshColor: '#57534e',
    preferredSliceCut: 'slice',
    preferredFineCut: 'grated',
    variantModelKeys: { whole: 'truffle_black_rare' },
  },
  champignon_white_whole: {
    speciesId: 'champignon_white_whole',
    produceCategory: 'mushroom',
    baseName: 'Champignon',
    baseNameRu: 'Шампиньон',
    defaultVarietyRu: 'Белый культивируемый',
    defaultWeightGrams: 32,
    defaultDimensionCm: 4.8,
    defaultSize: 'small',
    defaultJuiciness: 82,
    color: '#f5f5f4',
    colorNameRu: 'Снежно-белый',
    fleshColor: '#fafaf9',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: {
      whole: 'champignon_white_whole',
      slice: 'champignon_sliced',
      wedge: 'champignon_sliced',
    },
  },
  oyster_mushroom_whole: {
    speciesId: 'oyster_mushroom_whole',
    produceCategory: 'mushroom',
    baseName: 'Oyster Mushroom',
    baseNameRu: 'Вешенка',
    defaultVarietyRu: 'Свежая мясистая',
    defaultWeightGrams: 48,
    defaultDimensionCm: 7.5,
    defaultSize: 'medium',
    defaultJuiciness: 78,
    color: '#a8a29e',
    colorNameRu: 'Пепельно-серый',
    fleshColor: '#f5f5f4',
    preferredSliceCut: 'strips',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'oyster_mushroom_whole' },
  },
  shiitake_fresh: {
    speciesId: 'shiitake_fresh',
    produceCategory: 'mushroom',
    baseName: 'Shiitake',
    baseNameRu: 'Шиитаке',
    defaultVarietyRu: 'Азиатский свежий',
    defaultWeightGrams: 40,
    defaultDimensionCm: 6.5,
    defaultSize: 'medium',
    defaultJuiciness: 74,
    color: '#78350f',
    colorNameRu: 'Шоколадно-бурый',
    fleshColor: '#fef3c7',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'shiitake_fresh' },
  },
  enoki_mushroom_whole: {
    speciesId: 'enoki_mushroom_whole',
    produceCategory: 'mushroom',
    baseName: 'Enoki Mushroom',
    baseNameRu: 'Гриб эноки',
    defaultVarietyRu: 'Белый нитевидный',
    defaultWeightGrams: 11,
    defaultDimensionCm: 9.0,
    defaultSize: 'small',
    defaultJuiciness: 77,
    color: '#fefce8',
    colorNameRu: 'Кремово-белый',
    fleshColor: '#ffffff',
    preferredSliceCut: 'slice',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'enoki_mushroom_whole' },
  },
  portobello_mushroom: {
    speciesId: 'portobello_mushroom',
    produceCategory: 'mushroom',
    baseName: 'Portobello',
    baseNameRu: 'Гриб Портобелло',
    defaultVarietyRu: 'Крупный мясистый',
    defaultWeightGrams: 120,
    defaultDimensionCm: 11.5,
    defaultSize: 'large',
    defaultJuiciness: 80,
    color: '#78350f',
    colorNameRu: 'Тёмно-коричневый',
    fleshColor: '#d6d3d1',
    defaultPart: 'cap',
    defaultPartNameRu: 'Шляпка',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'portobello_mushroom' },
  },
  wood_ear_mushroom_dried: {
    speciesId: 'wood_ear_mushroom_dried',
    produceCategory: 'mushroom',
    baseName: 'Wood Ear Mushroom',
    baseNameRu: 'Древесный гриб Муэр',
    defaultVarietyRu: 'Чёрный сушёный',
    defaultWeightGrams: 20,
    defaultDimensionCm: 5.0,
    defaultSize: 'small',
    defaultJuiciness: 14,
    color: '#292524',
    colorNameRu: 'Графитово-чёрный',
    fleshColor: '#44403c',
    defaultIsDried: true,
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'wood_ear_mushroom_dried', dried: 'wood_ear_mushroom_dried' },
  },
  parasol_mushroom_cap: {
    speciesId: 'parasol_mushroom_cap',
    produceCategory: 'mushroom',
    baseName: 'Parasol Mushroom',
    baseNameRu: 'Гриб-зонтик',
    defaultVarietyRu: 'Пёстрый лесной',
    defaultWeightGrams: 60,
    defaultDimensionCm: 13.0,
    defaultSize: 'large',
    defaultJuiciness: 72,
    color: '#d6d3d1',
    colorNameRu: 'Кремово-пёстрый',
    fleshColor: '#fafaf9',
    defaultPart: 'cap',
    defaultPartNameRu: 'Шляпка',
    preferredSliceCut: 'wedge',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'parasol_mushroom_cap' },
  },

  // --- BERRIES (12) ---
  berry_forest_single: {
    speciesId: 'berry_forest_single',
    produceCategory: 'berry',
    baseName: 'Wild Forest Berry',
    baseNameRu: 'Лесная ягода',
    defaultVarietyRu: 'Дикорастущая спелая',
    defaultWeightGrams: 5,
    defaultDimensionCm: 1.4,
    defaultSize: 'tiny',
    defaultJuiciness: 88,
    color: '#be123c',
    colorNameRu: 'Рубиново-ягодный',
    fleshColor: '#fb7185',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_forest_single' },
  },
  berry_blueberry_single: {
    speciesId: 'berry_blueberry_single',
    produceCategory: 'berry',
    baseName: 'Blueberry',
    baseNameRu: 'Черника',
    defaultVarietyRu: 'Лесная сизая',
    defaultWeightGrams: 3,
    defaultDimensionCm: 1.1,
    defaultSize: 'tiny',
    defaultJuiciness: 89,
    color: '#312e81',
    colorNameRu: 'Сине-сизый',
    fleshColor: '#6366f1',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_blueberry_single' },
  },
  berry_lingonberry_single: {
    speciesId: 'berry_lingonberry_single',
    produceCategory: 'berry',
    baseName: 'Lingonberry',
    baseNameRu: 'Брусника',
    defaultVarietyRu: 'Таёжная кисло-сладкая',
    defaultWeightGrams: 3,
    defaultDimensionCm: 1.0,
    defaultSize: 'tiny',
    defaultJuiciness: 85,
    color: '#dc2626',
    colorNameRu: 'Алый',
    fleshColor: '#fca5a5',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_lingonberry_single' },
  },
  berry_cranberry_single: {
    speciesId: 'berry_cranberry_single',
    produceCategory: 'berry',
    baseName: 'Cranberry',
    baseNameRu: 'Клюква',
    defaultVarietyRu: 'Болотная кислая',
    defaultWeightGrams: 4,
    defaultDimensionCm: 1.3,
    defaultSize: 'tiny',
    defaultJuiciness: 87,
    color: '#991b1b',
    colorNameRu: 'Тёмно-рубиновый',
    fleshColor: '#f87171',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_cranberry_single' },
  },
  berry_raspberry_single: {
    speciesId: 'berry_raspberry_single',
    produceCategory: 'berry',
    baseName: 'Raspberry',
    baseNameRu: 'Малина',
    defaultVarietyRu: 'Садовая душистая',
    defaultWeightGrams: 5,
    defaultDimensionCm: 1.8,
    defaultSize: 'tiny',
    defaultJuiciness: 92,
    color: '#e11d48',
    colorNameRu: 'Малиновый',
    fleshColor: '#fb7185',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_raspberry_single' },
  },
  berry_strawberry_single: {
    speciesId: 'berry_strawberry_single',
    produceCategory: 'berry',
    baseName: 'Strawberry',
    baseNameRu: 'Клубника',
    defaultVarietyRu: 'Садовая сладкая',
    defaultWeightGrams: 18,
    defaultDimensionCm: 3.2,
    defaultSize: 'small',
    defaultJuiciness: 93,
    color: '#dc2626',
    colorNameRu: 'Ярко-алый',
    fleshColor: '#fda4af',
    preferredSliceCut: 'slice',
    preferredFineCut: 'diced',
    variantModelKeys: { whole: 'berry_strawberry_single' },
  },
  berry_blackcurrant_single: {
    speciesId: 'berry_blackcurrant_single',
    produceCategory: 'berry',
    baseName: 'Blackcurrant',
    baseNameRu: 'Чёрная смородина',
    defaultVarietyRu: 'Душистая садовая',
    defaultWeightGrams: 3,
    defaultDimensionCm: 1.2,
    defaultSize: 'tiny',
    defaultJuiciness: 88,
    color: '#1e1b4b',
    colorNameRu: 'Иссиня-чёрный',
    fleshColor: '#7e22ce',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_blackcurrant_single' },
  },
  berry_redcurrant_single: {
    speciesId: 'berry_redcurrant_single',
    produceCategory: 'berry',
    baseName: 'Redcurrant',
    baseNameRu: 'Красная смородина',
    defaultVarietyRu: 'Прозрачная рубиновая',
    defaultWeightGrams: 2,
    defaultDimensionCm: 0.9,
    defaultSize: 'tiny',
    defaultJuiciness: 91,
    color: '#ef4444',
    colorNameRu: 'Полупрозрачно-красный',
    fleshColor: '#fca5a5',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_redcurrant_single' },
  },
  berry_cherry_single: {
    speciesId: 'berry_cherry_single',
    produceCategory: 'berry',
    baseName: 'Cherry',
    baseNameRu: 'Вишня',
    defaultVarietyRu: 'Спелая садовая',
    defaultWeightGrams: 8,
    defaultDimensionCm: 2.0,
    defaultSize: 'tiny',
    defaultJuiciness: 90,
    color: '#881337',
    colorNameRu: 'Тёмно-вишнёвый',
    fleshColor: '#be123c',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_cherry_single' },
  },
  berry_blackberry_single: {
    speciesId: 'berry_blackberry_single',
    produceCategory: 'berry',
    baseName: 'Blackberry',
    baseNameRu: 'Ежевика',
    defaultVarietyRu: 'Лесная глянцевая',
    defaultWeightGrams: 6,
    defaultDimensionCm: 2.0,
    defaultSize: 'tiny',
    defaultJuiciness: 91,
    color: '#18181b',
    colorNameRu: 'Глянцево-чёрный',
    fleshColor: '#581c87',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_blackberry_single' },
  },
  berry_sea_buckthorn_single: {
    speciesId: 'berry_sea_buckthorn_single',
    produceCategory: 'berry',
    baseName: 'Sea Buckthorn',
    baseNameRu: 'Облепиха',
    defaultVarietyRu: 'Янтарная витаминная',
    defaultWeightGrams: 2,
    defaultDimensionCm: 1.0,
    defaultSize: 'tiny',
    defaultJuiciness: 86,
    color: '#f59e0b',
    colorNameRu: 'Янтарно-оранжевый',
    fleshColor: '#fde047',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_sea_buckthorn_single' },
  },
  berry_elderberry_single: {
    speciesId: 'berry_elderberry_single',
    produceCategory: 'berry',
    baseName: 'Black Elderberry',
    baseNameRu: 'Чёрная бузина',
    defaultVarietyRu: 'Спелая лесная',
    defaultWeightGrams: 2,
    defaultDimensionCm: 0.8,
    defaultSize: 'tiny',
    defaultJuiciness: 84,
    color: '#1e1b4b',
    colorNameRu: 'Чёрно-фиолетовый',
    fleshColor: '#6b21a8',
    preferredSliceCut: 'slice',
    preferredFineCut: 'crushed',
    variantModelKeys: { whole: 'berry_elderberry_single' },
  },

  // --- FRESH HERBS (cuttable too!) ---
  rosemary_sprigs_fresh: {
    speciesId: 'rosemary_sprigs_fresh',
    produceCategory: 'herb',
    baseName: 'Rosemary',
    baseNameRu: 'Розмарин',
    defaultVarietyRu: 'Свежий хвойный',
    defaultWeightGrams: 30,
    defaultDimensionCm: 14.0,
    defaultSize: 'medium',
    defaultJuiciness: 55,
    color: '#15803d',
    colorNameRu: 'Хвойно-зелёный',
    fleshColor: '#4ade80',
    defaultPart: 'stem',
    defaultPartNameRu: 'Веточка',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'rosemary_sprigs_fresh', shredded: 'greens_chopped_mix' },
  },
  thyme_sprigs_fresh: {
    speciesId: 'thyme_sprigs_fresh',
    produceCategory: 'herb',
    baseName: 'Thyme',
    baseNameRu: 'Тимьян (чабрец)',
    defaultVarietyRu: 'Душистый свежий',
    defaultWeightGrams: 20,
    defaultDimensionCm: 12.0,
    defaultSize: 'medium',
    defaultJuiciness: 52,
    color: '#166534',
    colorNameRu: 'Травянисто-зелёный',
    fleshColor: '#4ade80',
    defaultPart: 'stem',
    defaultPartNameRu: 'Веточка',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'thyme_sprigs_fresh', shredded: 'greens_chopped_mix' },
  },
  basil_leaves_fresh: {
    speciesId: 'basil_leaves_fresh',
    produceCategory: 'herb',
    baseName: 'Basil',
    baseNameRu: 'Базилик',
    defaultVarietyRu: 'Зелёный душистый',
    defaultWeightGrams: 30,
    defaultDimensionCm: 10.0,
    defaultSize: 'medium',
    defaultJuiciness: 74,
    color: '#16a34a',
    colorNameRu: 'Изумрудно-зелёный',
    fleshColor: '#86efac',
    defaultPart: 'leaf',
    defaultPartNameRu: 'Листья',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'basil_leaves_fresh', shredded: 'greens_chopped_mix' },
  },
  dill_bunch_fresh: {
    speciesId: 'dill_bunch_fresh',
    produceCategory: 'herb',
    baseName: 'Dill',
    baseNameRu: 'Укроп',
    defaultVarietyRu: 'Огородный свежий',
    defaultWeightGrams: 50,
    defaultDimensionCm: 18.0,
    defaultSize: 'large',
    defaultJuiciness: 72,
    color: '#15803d',
    colorNameRu: 'Сочно-зелёный',
    fleshColor: '#4ade80',
    defaultPart: 'stem',
    defaultPartNameRu: 'Пучок зелени',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'dill_bunch_fresh', shredded: 'greens_chopped_mix' },
  },
  parsley_bunch_fresh: {
    speciesId: 'parsley_bunch_fresh',
    produceCategory: 'herb',
    baseName: 'Parsley',
    baseNameRu: 'Петрушка',
    defaultVarietyRu: 'Кудрявая свежая',
    defaultWeightGrams: 50,
    defaultDimensionCm: 16.0,
    defaultSize: 'large',
    defaultJuiciness: 70,
    color: '#166534',
    colorNameRu: 'Тёмно-зелёный',
    fleshColor: '#4ade80',
    defaultPart: 'leaf',
    defaultPartNameRu: 'Листья',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'parsley_bunch_fresh', shredded: 'greens_chopped_mix' },
  },
  cilantro_bunch_fresh: {
    speciesId: 'cilantro_bunch_fresh',
    produceCategory: 'herb',
    baseName: 'Cilantro',
    baseNameRu: 'Кинза',
    defaultVarietyRu: 'Ароматная свежая',
    defaultWeightGrams: 50,
    defaultDimensionCm: 16.0,
    defaultSize: 'large',
    defaultJuiciness: 72,
    color: '#15803d',
    colorNameRu: 'Ярко-зелёный',
    fleshColor: '#4ade80',
    defaultPart: 'leaf',
    defaultPartNameRu: 'Листья',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'cilantro_bunch_fresh', shredded: 'greens_chopped_mix' },
  },
  mint_leaves_fresh: {
    speciesId: 'mint_leaves_fresh',
    produceCategory: 'herb',
    baseName: 'Peppermint',
    baseNameRu: 'Мята перечная',
    defaultVarietyRu: 'Освежающая ментоловая',
    defaultWeightGrams: 40,
    defaultDimensionCm: 12.0,
    defaultSize: 'medium',
    defaultJuiciness: 76,
    color: '#059669',
    colorNameRu: 'Мятно-зелёный',
    fleshColor: '#6ee7b7',
    defaultPart: 'leaf',
    defaultPartNameRu: 'Листья',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'mint_leaves_fresh', shredded: 'greens_chopped_mix' },
  },
  tarragon_sprigs_fresh: {
    speciesId: 'tarragon_sprigs_fresh',
    produceCategory: 'herb',
    baseName: 'Tarragon',
    baseNameRu: 'Тархун (эстрагон)',
    defaultVarietyRu: 'Кавказский анисовый',
    defaultWeightGrams: 40,
    defaultDimensionCm: 16.0,
    defaultSize: 'large',
    defaultJuiciness: 68,
    color: '#16a34a',
    colorNameRu: 'Изумрудный',
    fleshColor: '#4ade80',
    defaultPart: 'stem',
    defaultPartNameRu: 'Веточки',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'tarragon_sprigs_fresh', shredded: 'greens_chopped_mix' },
  },
  eucalyptus_leaves_fresh: {
    speciesId: 'eucalyptus_leaves_fresh',
    produceCategory: 'herb',
    baseName: 'Eucalyptus',
    baseNameRu: 'Эвкалипт',
    defaultVarietyRu: 'Бальзамический сизый',
    defaultWeightGrams: 50,
    defaultDimensionCm: 15.0,
    defaultSize: 'large',
    defaultJuiciness: 60,
    color: '#0f766e',
    colorNameRu: 'Сизо-зелёный',
    fleshColor: '#5eead4',
    defaultPart: 'leaf',
    defaultPartNameRu: 'Листья',
    preferredSliceCut: 'strips',
    preferredFineCut: 'shredded',
    variantModelKeys: { whole: 'eucalyptus_leaves_fresh', shredded: 'greens_chopped_mix' },
  },
};

export function isProduceSpeciesId(itemId: string): boolean {
  return Boolean(PRODUCE_SPECIES_SPECS[itemId]);
}

// =============================================================================
// 2. LEGACY PRODUCE PRESETS (ABSORBED VARIANTS -> UNIFIED SINGLE PIECE)
// =============================================================================
export interface LegacyProducePreset {
  speciesId: string;
  overrides: Partial<ProduceAttributes>;
}

export const LEGACY_PRODUCE_PRESETS: Record<string, LegacyProducePreset> = {
  // Potato
  potato_peeled: {
    speciesId: 'potato_whole',
    overrides: { cutForm: 'peeled', part: 'flesh', isPeeled: true, weightGrams: 130, remainingFraction: 0.87, modelKey: 'potato_peeled' },
  },
  potato_sliced: {
    speciesId: 'potato_whole',
    overrides: { cutForm: 'wedge', cutFormRu: 'Дольки', part: 'piece', isPeeled: true, weightGrams: 40, remainingFraction: 0.27, dimensionCm: 4.5, modelKey: 'potato_sliced' },
  },
  potato_grated: {
    speciesId: 'potato_whole',
    overrides: { cutForm: 'grated', cutFormRu: 'Тёртый', part: 'flesh', isPeeled: true, weightGrams: 130, remainingFraction: 0.87, dimensionCm: 4.0, juiciness: 76, modelKey: 'potato_grated' },
  },

  // Carrot
  carrot_fresh: {
    speciesId: 'carrot_whole',
    overrides: { varietyRu: 'Свежая мытая оранжевая' },
  },
  carrot_peeled: {
    speciesId: 'carrot_whole',
    overrides: { cutForm: 'peeled', part: 'flesh', isPeeled: true, weightGrams: 100, remainingFraction: 0.84, modelKey: 'carrot_peeled' },
  },
  carrot_diced: {
    speciesId: 'carrot_whole',
    overrides: { cutForm: 'diced', cutFormRu: 'Кубики', part: 'piece', isPeeled: true, weightGrams: 50, remainingFraction: 0.42, dimensionCm: 3.5, modelKey: 'carrot_diced' },
  },
  carrot_grated: {
    speciesId: 'carrot_whole',
    overrides: { cutForm: 'grated', cutFormRu: 'Тёртая (салатная)', part: 'flesh', isPeeled: true, weightGrams: 100, remainingFraction: 0.84, dimensionCm: 4.5, juiciness: 80, modelKey: 'carrot_grated' },
  },

  // Beet
  beet_fresh: {
    speciesId: 'beet_whole',
    overrides: { varietyRu: 'Свежая столовая бордовая' },
  },
  beet_peeled_boiled: {
    speciesId: 'beet_whole',
    overrides: { cutForm: 'peeled', cutFormRu: 'Отварная очищенная', part: 'flesh', isPeeled: true, isBoiled: true, weightGrams: 200, remainingFraction: 0.82, juiciness: 82, modelKey: 'beet_peeled_boiled' },
  },
  beet_sliced: {
    speciesId: 'beet_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Ломтики', part: 'piece', isPeeled: true, weightGrams: 65, remainingFraction: 0.26, dimensionCm: 5.5, modelKey: 'beet_sliced' },
  },
  beet_grated: {
    speciesId: 'beet_whole',
    overrides: { cutForm: 'grated', cutFormRu: 'Тёртая варёная', part: 'flesh', isPeeled: true, isBoiled: true, weightGrams: 180, remainingFraction: 0.72, dimensionCm: 4.5, juiciness: 86, modelKey: 'beet_grated' },
  },

  // Turnip
  turnip_sliced: {
    speciesId: 'turnip_whole',
    overrides: { cutForm: 'strips', cutFormRu: 'Брусочки', part: 'piece', isPeeled: true, weightGrams: 60, remainingFraction: 0.3, dimensionCm: 5.0, modelKey: 'turnip_sliced' },
  },

  // Onion & Leek
  onion_peeled: {
    speciesId: 'onion_bulb',
    overrides: { cutForm: 'peeled', part: 'flesh', isPeeled: true, weightGrams: 90, remainingFraction: 0.9, modelKey: 'onion_peeled' },
  },
  onion_chopped: {
    speciesId: 'onion_bulb',
    overrides: { cutForm: 'shredded', cutFormRu: 'Шинкованный', part: 'piece', isPeeled: true, weightGrams: 85, remainingFraction: 0.85, dimensionCm: 3.5, juiciness: 86, modelKey: 'onion_chopped' },
  },
  onion_rings: {
    speciesId: 'onion_bulb',
    overrides: { cutForm: 'ring', cutFormRu: 'Кольца', part: 'piece', isPeeled: true, weightGrams: 45, remainingFraction: 0.45, dimensionCm: 5.0, modelKey: 'onion_rings' },
  },
  leek_sliced: {
    speciesId: 'leek_stalk',
    overrides: { cutForm: 'ring', cutFormRu: 'Кольца', part: 'piece', weightGrams: 60, remainingFraction: 0.25, dimensionCm: 4.0, modelKey: 'leek_sliced' },
  },

  // Garlic
  garlic_clove: {
    speciesId: 'garlic_bulb',
    overrides: { cutForm: 'part', cutFormRu: 'Зубчик', part: 'clove', partNameRu: 'Очищенный зубчик', isPeeled: true, weightGrams: 6, remainingFraction: 0.12, dimensionCm: 2.0, modelKey: 'garlic_clove' },
  },
  garlic_crushed: {
    speciesId: 'garlic_bulb',
    overrides: { cutForm: 'crushed', cutFormRu: 'Раздавленный (паста)', part: 'flesh', isPeeled: true, weightGrams: 20, remainingFraction: 0.4, dimensionCm: 2.5, juiciness: 72, modelKey: 'garlic_crushed' },
  },

  // Tomatoes & Cucumber & Eggplant & Zucchini
  tomato_sliced: {
    speciesId: 'tomato_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Кружки', part: 'piece', weightGrams: 35, remainingFraction: 0.24, dimensionCm: 5.5, modelKey: 'tomato_sliced' },
  },
  tomato_diced: {
    speciesId: 'tomato_whole',
    overrides: { cutForm: 'diced', cutFormRu: 'Кубики', part: 'piece', weightGrams: 75, remainingFraction: 0.5, dimensionCm: 3.5, modelKey: 'tomato_diced' },
  },
  tomato_cherry_sliced: {
    speciesId: 'tomato_cherry_single',
    overrides: { cutForm: 'half', cutFormRu: 'Половинка', part: 'piece', weightGrams: 10, remainingFraction: 0.5, dimensionCm: 2.0, modelKey: 'tomato_cherry_sliced' },
  },
  cucumber_peeled: {
    speciesId: 'cucumber_whole',
    overrides: { cutForm: 'peeled', part: 'flesh', isPeeled: true, weightGrams: 105, remainingFraction: 0.88, modelKey: 'cucumber_peeled' },
  },
  cucumber_sliced: {
    speciesId: 'cucumber_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Ломтики', part: 'piece', weightGrams: 30, remainingFraction: 0.25, dimensionCm: 3.8, modelKey: 'cucumber_sliced' },
  },
  eggplant_sliced: {
    speciesId: 'eggplant_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Кружки', part: 'piece', weightGrams: 75, remainingFraction: 0.22, dimensionCm: 6.0, modelKey: 'eggplant_sliced' },
  },
  zucchini_sliced: {
    speciesId: 'zucchini_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Кружки', part: 'piece', weightGrams: 80, remainingFraction: 0.2, dimensionCm: 5.5, modelKey: 'zucchini_sliced' },
  },

  // Pumpkin & Cabbages
  pumpkin_cut: {
    speciesId: 'pumpkin_whole',
    overrides: { cutForm: 'chunk', cutFormRu: 'Крупный ломоть', part: 'piece', weightGrams: 1000, remainingFraction: 0.2, dimensionCm: 15.0, modelKey: 'pumpkin_cut' },
  },
  pumpkin_diced: {
    speciesId: 'pumpkin_whole',
    overrides: { cutForm: 'diced', cutFormRu: 'Кубики', part: 'piece', isPeeled: true, weightGrams: 350, remainingFraction: 0.07, dimensionCm: 6.0, modelKey: 'pumpkin_diced' },
  },
  cabbage_half: {
    speciesId: 'cabbage_white_head',
    overrides: { cutForm: 'half', cutFormRu: 'Половина кочана', part: 'piece', weightGrams: 1000, remainingFraction: 0.5, dimensionCm: 17.0, modelKey: 'cabbage_half' },
  },
  cabbage_leaves: {
    speciesId: 'cabbage_white_head',
    overrides: { cutForm: 'part', cutFormRu: 'Листья', part: 'leaf', partNameRu: 'Капустный лист', weightGrams: 280, remainingFraction: 0.14, dimensionCm: 14.0, modelKey: 'cabbage_leaves' },
  },
  cabbage_shredded: {
    speciesId: 'cabbage_white_head',
    overrides: { cutForm: 'shredded', cutFormRu: 'Шинкованная', part: 'piece', weightGrams: 450, remainingFraction: 0.23, dimensionCm: 8.0, modelKey: 'cabbage_shredded' },
  },
  cauliflower_florets: {
    speciesId: 'cauliflower_head',
    overrides: { cutForm: 'part', cutFormRu: 'Соцветия', part: 'floret', partNameRu: 'Соцветие цветной капусты', weightGrams: 200, remainingFraction: 0.25, dimensionCm: 7.0, modelKey: 'cauliflower_florets' },
  },
  broccoli_florets: {
    speciesId: 'broccoli_head',
    overrides: { cutForm: 'part', cutFormRu: 'Соцветия', part: 'floret', partNameRu: 'Соцветие брокколи', weightGrams: 150, remainingFraction: 0.25, dimensionCm: 6.5, modelKey: 'broccoli_florets' },
  },

  // Peppers & Ginger
  bell_pepper_yellow: {
    speciesId: 'bell_pepper_red',
    overrides: { varietyRu: 'Сладкий жёлтый', color: '#eab308', colorNameRu: 'Солнечно-жёлтый', fleshColor: '#fef08a', modelKey: 'bell_pepper_yellow' },
  },
  bell_pepper_sliced: {
    speciesId: 'bell_pepper_red',
    overrides: { cutForm: 'strips', cutFormRu: 'Соломка', part: 'piece', weightGrams: 45, remainingFraction: 0.25, dimensionCm: 6.0, modelKey: 'bell_pepper_sliced' },
  },
  chili_pepper_sliced: {
    speciesId: 'chili_pepper_fresh',
    overrides: { cutForm: 'ring', cutFormRu: 'Колечки', part: 'piece', weightGrams: 10, remainingFraction: 0.5, dimensionCm: 2.5, modelKey: 'chili_pepper_sliced' },
  },
  chili_pepper_dried: {
    speciesId: 'chili_pepper_fresh',
    overrides: { varietyRu: 'Сушёный жгучий стручок', isDried: true, juiciness: 10, weightGrams: 6, remainingFraction: 0.3, dimensionCm: 7.5, color: '#7f1d1d', colorNameRu: 'Тёмно-рубиновый сухой', modelKey: 'chili_pepper_dried' },
  },
  ginger_grated: {
    speciesId: 'ginger_root_fresh',
    overrides: { cutForm: 'grated', cutFormRu: 'Тёртый', part: 'flesh', isPeeled: true, weightGrams: 50, remainingFraction: 0.33, dimensionCm: 3.5, juiciness: 72, modelKey: 'ginger_grated' },
  },

  // Fruits & Citruses & Melons
  apple_green: {
    speciesId: 'apple',
    overrides: { varietyRu: 'Зелёное кислое (Гренни Смит)', color: '#65a30d', colorNameRu: 'Ярко-зелёный', fleshColor: '#f7fee7', juiciness: 88, modelKey: 'apple_green' },
  },
  apple_sliced: {
    speciesId: 'apple',
    overrides: { cutForm: 'wedge', cutFormRu: 'Дольки', part: 'piece', weightGrams: 40, remainingFraction: 0.25, dimensionCm: 5.0, modelKey: 'apple_sliced' },
  },
  apple_core: {
    speciesId: 'apple',
    overrides: { cutForm: 'core', cutFormRu: 'Огрызок', part: 'core', partNameRu: 'Огрызок яблока', weightGrams: 22, remainingFraction: 0.13, dimensionCm: 4.5, juiciness: 22, edible: false, modelKey: 'apple_core' },
  },
  pear_sliced: {
    speciesId: 'pear_yellow',
    overrides: { cutForm: 'wedge', cutFormRu: 'Дольки', part: 'piece', weightGrams: 45, remainingFraction: 0.25, dimensionCm: 5.5, modelKey: 'pear_sliced' },
  },
  plum_halves: {
    speciesId: 'plum_purple',
    overrides: { cutForm: 'half', cutFormRu: 'Половинка (без косточки)', part: 'piece', weightGrams: 20, remainingFraction: 0.45, dimensionCm: 3.5, modelKey: 'plum_halves' },
  },
  apricot_halves: {
    speciesId: 'apricot_orange',
    overrides: { cutForm: 'half', cutFormRu: 'Половинка (без косточки)', part: 'piece', weightGrams: 18, remainingFraction: 0.45, dimensionCm: 3.2, modelKey: 'apricot_halves' },
  },
  orange_segments: {
    speciesId: 'orange_citrus',
    overrides: { cutForm: 'part', cutFormRu: 'Очищенные дольки', part: 'segment', partNameRu: 'Долька апельсина', isPeeled: true, weightGrams: 30, remainingFraction: 0.15, dimensionCm: 4.2, modelKey: 'orange_segments' },
  },
  lemon_slice: {
    speciesId: 'lemon_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Долька', part: 'piece', weightGrams: 15, remainingFraction: 0.13, dimensionCm: 4.5, modelKey: 'lemon_slice' },
  },
  lime_slice: {
    speciesId: 'lime_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Долька', part: 'piece', weightGrams: 12, remainingFraction: 0.15, dimensionCm: 3.8, modelKey: 'lime_slice' },
  },
  banana_peeled: {
    speciesId: 'banana',
    overrides: { cutForm: 'peeled', part: 'flesh', isPeeled: true, weightGrams: 115, remainingFraction: 0.76, dimensionCm: 15.0, modelKey: 'banana_peeled' },
  },
  banana_peel: {
    speciesId: 'banana',
    overrides: { cutForm: 'peel', cutFormRu: 'Кожура', part: 'peel', partNameRu: 'Банановая кожура', weightGrams: 35, remainingFraction: 0.24, dimensionCm: 14.0, juiciness: 12, edible: false, modelKey: 'banana_peel' },
  },
  melon_slice: {
    speciesId: 'melon_cantaloupe',
    overrides: { cutForm: 'wedge', cutFormRu: 'Ломоть', part: 'piece', weightGrams: 350, remainingFraction: 0.16, dimensionCm: 14.0, modelKey: 'melon_slice' },
  },
  watermelon_slice: {
    speciesId: 'watermelon_whole',
    overrides: { cutForm: 'wedge', cutFormRu: 'Ломоть', part: 'piece', weightGrams: 500, remainingFraction: 0.08, dimensionCm: 16.0, modelKey: 'watermelon_slice' },
  },
  kiwi_peeled: {
    speciesId: 'kiwi_fruit',
    overrides: { cutForm: 'peeled', part: 'flesh', isPeeled: true, weightGrams: 68, remainingFraction: 0.85, dimensionCm: 5.5, modelKey: 'kiwi_peeled' },
  },
  kiwi_sliced: {
    speciesId: 'kiwi_fruit',
    overrides: { cutForm: 'slice', cutFormRu: 'Кружочки', part: 'piece', isPeeled: true, weightGrams: 16, remainingFraction: 0.2, dimensionCm: 4.0, modelKey: 'kiwi_sliced' },
  },

  // Mushrooms
  cep_mushroom_dried: {
    speciesId: 'cep_mushroom_whole',
    overrides: { varietyRu: 'Сушёный боровик', isDried: true, juiciness: 9, weightGrams: 18, remainingFraction: 0.18, dimensionCm: 6.5, color: '#92400e', colorNameRu: 'Сушёно-янтарный', modelKey: 'cep_mushroom_dried' },
  },
  champignon_brown_whole: {
    speciesId: 'champignon_white_whole',
    overrides: { varietyRu: 'Королевский бурый', color: '#92400e', colorNameRu: 'Буро-коричневый', fleshColor: '#e7e5e4', modelKey: 'champignon_brown_whole' },
  },
  champignon_sliced: {
    speciesId: 'champignon_white_whole',
    overrides: { cutForm: 'slice', cutFormRu: 'Ломтики', part: 'piece', weightGrams: 16, remainingFraction: 0.5, dimensionCm: 4.0, modelKey: 'champignon_sliced' },
  },
};

// =============================================================================
// 3. PLANT BRANCH ITEM PRESETS (ВЕТКА / ГРОЗДЬ / ПУЧОК / СВЯЗКА / СРОСТОК)
// =============================================================================
export interface PlantBranchPreset {
  branchKind: PlantBranchKind;
  branchKindRu: string;
  lengthCm: number;
  branchWeightGrams: number;
  color: string;
  colorNameRu: string;
  materialRu: string;
  freshness: number;
  fruitSpeciesId?: string;
  fruitCount?: number;
  fruitOverrides?: Partial<ProduceAttributes>;
}

export const LEGACY_BRANCH_PRESETS: Record<string, PlantBranchPreset> = {
  grapes_green_bunch: {
    branchKind: 'cluster',
    branchKindRu: 'Гроздь винограда',
    lengthCm: 18,
    branchWeightGrams: 14,
    color: '#65a30d',
    colorNameRu: 'Зелёно-древесный',
    materialRu: 'Гибкий зелёный гребень лозы',
    freshness: 94,
    fruitSpeciesId: 'grape_single',
    fruitCount: 16,
    fruitOverrides: {
      varietyRu: 'Зелёный кишмиш',
      color: '#84cc16',
      colorNameRu: 'Светло-зелёный',
      fleshColor: '#d9f99d',
    },
  },
  grapes_red_bunch: {
    branchKind: 'cluster',
    branchKindRu: 'Гроздь винограда',
    lengthCm: 19,
    branchWeightGrams: 15,
    color: '#713f12',
    colorNameRu: 'Оливково-бурый',
    materialRu: 'Ветвистый гребень виноградной лозы',
    freshness: 93,
    fruitSpeciesId: 'grape_single',
    fruitCount: 16,
    fruitOverrides: {
      varietyRu: 'Красный мускатный',
      color: '#9f1239',
      colorNameRu: 'Рубиново-бордовый',
      fleshColor: '#fda4af',
    },
  },
  banana_single: {
    branchKind: 'bunch',
    branchKindRu: 'Связка на плодоножке',
    lengthCm: 21,
    branchWeightGrams: 35,
    color: '#65a30d',
    colorNameRu: 'Жёлто-зелёный',
    materialRu: 'Плотная волокнистая плодоножка',
    freshness: 92,
    fruitSpeciesId: 'banana',
    fruitCount: 4,
  },
  radish_bunch_fresh: {
    branchKind: 'bunch',
    branchKindRu: 'Пучок с ботвой',
    lengthCm: 20,
    branchWeightGrams: 42,
    color: '#15803d',
    colorNameRu: 'Сочно-зелёный',
    materialRu: 'Свежие зелёные стебли и листья ботвы',
    freshness: 95,
    fruitSpeciesId: 'radish_single',
    fruitCount: 6,
  },
  shallot_bulbs: {
    branchKind: 'bunch',
    branchKindRu: 'Пучок луковиц',
    lengthCm: 16,
    branchWeightGrams: 12,
    color: '#a16207',
    colorNameRu: 'Золотисто-сухой',
    materialRu: 'Переплетённые сухие стебли лука',
    freshness: 90,
    fruitSpeciesId: 'shallot_bulb',
    fruitCount: 4,
  },
  tomato_cherry_vine: {
    branchKind: 'cluster',
    branchKindRu: 'Кисть на ветке',
    lengthCm: 22,
    branchWeightGrams: 18,
    color: '#16a34a',
    colorNameRu: 'Ярко-зелёный',
    materialRu: 'Душистая зелёная томатная веточка',
    freshness: 96,
    fruitSpeciesId: 'tomato_cherry_single',
    fruitCount: 8,
  },
  redcurrant_sprig: {
    branchKind: 'twig',
    branchKindRu: 'Ягодная веточка',
    lengthCm: 10,
    branchWeightGrams: 3,
    color: '#65a30d',
    colorNameRu: 'Светло-зелёный',
    materialRu: 'Тонкая зелёная кисточка смородины',
    freshness: 95,
    fruitSpeciesId: 'berry_redcurrant_single',
    fruitCount: 8,
  },
  elderberry_sprig: {
    branchKind: 'cluster',
    branchKindRu: 'Зонтик бузины',
    lengthCm: 12,
    branchWeightGrams: 6,
    color: '#881337',
    colorNameRu: 'Бордово-зелёный',
    materialRu: 'Тонкие разветвлённые плодоножки бузины',
    freshness: 91,
    fruitSpeciesId: 'berry_elderberry_single',
    fruitCount: 12,
  },
  oyster_mushroom_cluster: {
    branchKind: 'mycelium',
    branchKindRu: 'Грибной сросток',
    lengthCm: 16,
    branchWeightGrams: 24,
    color: '#d6d3d1',
    colorNameRu: 'Светло-кремовый',
    materialRu: 'Плотное сростковое основание грибницы',
    freshness: 93,
    fruitSpeciesId: 'oyster_mushroom_whole',
    fruitCount: 6,
  },
  enoki_mushroom_bunch: {
    branchKind: 'mycelium',
    branchKindRu: 'Грибной пучок',
    lengthCm: 14,
    branchWeightGrams: 14,
    color: '#f5f5f4',
    colorNameRu: 'Молочно-белый',
    materialRu: 'Плотный корневой сросток эноки',
    freshness: 94,
    fruitSpeciesId: 'enoki_mushroom_whole',
    fruitCount: 12,
  },
};

export function isLegacyProduceOrBranchId(itemId: string): boolean {
  return Boolean(LEGACY_PRODUCE_PRESETS[itemId] || LEGACY_BRANCH_PRESETS[itemId]);
}

// =============================================================================
// 4. ATTRIBUTE BUILDERS & SYNC HELPERS
// =============================================================================
export function resolveProduceModelKey(attrs: ProduceAttributes): string {
  const spec = PRODUCE_SPECIES_SPECS[attrs.speciesId];
  if (!spec) return attrs.modelKey || attrs.speciesId;
  if (attrs.cutForm === 'peel' && spec.peelModelKey) return spec.peelModelKey;
  if (attrs.cutForm === 'core' && spec.coreModelKey) return spec.coreModelKey;
  if (attrs.isDried && spec.variantModelKeys?.dried) return spec.variantModelKeys.dried;
  if (attrs.cutForm === 'whole') {
    // Keep explicit variety modelKey (e.g. apple_green, bell_pepper_yellow, champignon_brown_whole)
    if (attrs.modelKey && attrs.modelKey !== attrs.speciesId) return attrs.modelKey;
    return spec.variantModelKeys?.whole || attrs.speciesId;
  }
  const byCut = spec.variantModelKeys?.[attrs.cutForm];
  if (byCut) return byCut;
  if (attrs.isPeeled && spec.variantModelKeys?.peeled && attrs.cutForm === 'peeled') {
    return spec.variantModelKeys.peeled;
  }
  return attrs.speciesId;
}

export function buildProduceAttributes(
  speciesId: string,
  overrides?: Partial<ProduceAttributes>
): ProduceAttributes {
  const spec = PRODUCE_SPECIES_SPECS[speciesId];
  const baseWeight = spec?.defaultWeightGrams ?? 100;
  const baseCm = spec?.defaultDimensionCm ?? 7.0;
  const cutForm: ProduceCutForm = overrides?.cutForm ?? spec?.defaultCutForm ?? 'whole';
  const remainingFraction = Math.max(
    0.02,
    Math.min(
      1,
      overrides?.remainingFraction ??
        (overrides?.weightGrams ? overrides.weightGrams / Math.max(1, baseWeight) : 1.0)
    )
  );
  const weightGrams = Math.max(
    1,
    Math.round(overrides?.weightGrams ?? baseWeight * remainingFraction)
  );
  const dimensionCm = Number(
    Math.max(
      0.6,
      overrides?.dimensionCm ?? baseCm * Math.cbrt(Math.max(0.05, remainingFraction))
    ).toFixed(1)
  );
  const size: ProduceSizeTier = overrides?.size ?? inferSizeTierFromCm(dimensionCm);
  const isPeeled =
    overrides?.isPeeled ??
    (cutForm === 'peeled' || cutForm === 'grated' || cutForm === 'crushed');
  const defaultPart: ProducePartKind =
    cutForm === 'whole'
      ? spec?.defaultPart ?? 'whole_fruit'
      : cutForm === 'peeled'
      ? 'flesh'
      : cutForm === 'peel'
      ? 'peel'
      : cutForm === 'core'
      ? 'core'
      : 'piece';
  const part: ProducePartKind = overrides?.part ?? defaultPart;

  const cutFormRu =
    overrides?.cutFormRu ??
    (cutForm === 'whole' && (overrides?.isDried ?? spec?.defaultIsDried)
      ? 'Целый (сушёный)'
      : PRODUCE_CUT_FORM_NAMES_RU[cutForm]);
  const partNameRu =
    overrides?.partNameRu ??
    (cutForm === 'whole' && spec?.defaultPartNameRu
      ? spec.defaultPartNameRu
      : PRODUCE_PART_NAMES_RU[part]);

  const attrs: ProduceAttributes = {
    speciesId,
    produceCategory: overrides?.produceCategory ?? spec?.produceCategory ?? 'vegetable',
    varietyRu: overrides?.varietyRu ?? spec?.defaultVarietyRu ?? 'Свежий',
    juiciness: Math.max(0, Math.min(100, Math.round(overrides?.juiciness ?? spec?.defaultJuiciness ?? 75))),
    weightGrams,
    baseWholeWeightGrams: overrides?.baseWholeWeightGrams ?? baseWeight,
    remainingFraction: Number(remainingFraction.toFixed(3)),
    size,
    sizeNameRu: overrides?.sizeNameRu ?? formatSizeNameRu(size, dimensionCm),
    dimensionCm,
    cutForm,
    cutFormRu,
    part,
    partNameRu,
    modelKey: overrides?.modelKey ?? spec?.variantModelKeys?.whole ?? speciesId,
    color: overrides?.color ?? spec?.color ?? '#22c55e',
    colorNameRu: overrides?.colorNameRu ?? spec?.colorNameRu ?? 'Натуральный',
    fleshColor: overrides?.fleshColor ?? spec?.fleshColor ?? '#fefce8',
    isPeeled,
    isDried: overrides?.isDried ?? spec?.defaultIsDried ?? false,
    isBoiled: overrides?.isBoiled ?? false,
    edible: overrides?.edible ?? (cutForm !== 'peel' && cutForm !== 'core'),
  };

  attrs.modelKey = overrides?.modelKey || resolveProduceModelKey(attrs);
  return attrs;
}

export function buildProduceDisplayName(attrs: ProduceAttributes): string {
  const spec = PRODUCE_SPECIES_SPECS[attrs.speciesId];
  const baseRu = spec?.baseNameRu || attrs.speciesId;
  if (attrs.cutForm === 'peel') {
    return spec?.peelNameRu || `Кожура (${baseRu.toLowerCase()})`;
  }
  if (attrs.cutForm === 'core') {
    return attrs.partNameRu === 'Огрызок яблока' ? 'Огрызок яблока' : `Огрызок (${baseRu.toLowerCase()})`;
  }
  const tags: string[] = [];
  if (attrs.isDried && !attrs.cutFormRu.toLowerCase().includes('суш')) {
    tags.push('сушёный');
  }
  if (attrs.isBoiled && !attrs.cutFormRu.toLowerCase().includes('вар')) {
    tags.push('отварная');
  }
  if (attrs.cutForm !== 'whole') {
    tags.push(attrs.cutFormRu.toLowerCase());
  } else if (
    attrs.varietyRu &&
    spec &&
    attrs.varietyRu !== spec.defaultVarietyRu &&
    !baseRu.toLowerCase().includes(attrs.varietyRu.toLowerCase())
  ) {
    tags.push(attrs.varietyRu.toLowerCase());
  }
  if (tags.length === 0) return baseRu;
  return `${baseRu} (${tags.join(', ')})`;
}

export function buildProduceDescriptionRu(attrs: ProduceAttributes): string {
  const spec = PRODUCE_SPECIES_SPECS[attrs.speciesId];
  const baseRu = spec?.baseNameRu || attrs.speciesId;
  const peelTxt = attrs.isPeeled ? 'очищен от кожуры' : 'в кожуре';
  const pct = Math.round(attrs.remainingFraction * 100);
  if (attrs.edible === false) {
    return `${attrs.partNameRu} от «${baseRu}». Вес: ${attrs.weightGrams} г, размер: ${attrs.sizeNameRu}. Несъедобный остаток.`;
  }
  return `${baseRu} · сорт: ${attrs.varietyRu}. Форма: ${attrs.cutFormRu} (${attrs.partNameRu}, ${peelTxt}). Сочность: ${attrs.juiciness}%, вес: ${attrs.weightGrams} г (${pct}% от целого), размер: ${attrs.sizeNameRu}.`;
}

export function applyProduceAttributesToItem(
  item: InventoryItem,
  overrides?: Partial<ProduceAttributes>
): InventoryItem {
  const prev = item.produceAttributes;
  const speciesId = overrides?.speciesId || prev?.speciesId || item.itemId;
  const basePrev: Partial<ProduceAttributes> = prev ? { ...prev } : {};
  if (overrides) {
    if (overrides.weightGrams !== undefined || overrides.remainingFraction !== undefined || overrides.dimensionCm !== undefined) {
      if (overrides.dimensionCm === undefined) delete basePrev.dimensionCm;
      if (overrides.size === undefined) delete basePrev.size;
      if (overrides.sizeNameRu === undefined) delete basePrev.sizeNameRu;
    }
    if (overrides.cutForm !== undefined) {
      if (overrides.cutFormRu === undefined) delete basePrev.cutFormRu;
      if (overrides.part === undefined) delete basePrev.part;
      if (overrides.partNameRu === undefined) delete basePrev.partNameRu;
      if (overrides.edible === undefined) delete basePrev.edible;
    }
    if (overrides.part !== undefined && overrides.partNameRu === undefined) {
      delete basePrev.partNameRu;
    }
    if (
      (overrides.cutForm !== undefined ||
        overrides.part !== undefined ||
        overrides.isPeeled !== undefined ||
        overrides.isDried !== undefined ||
        overrides.varietyRu !== undefined) &&
      overrides.modelKey === undefined
    ) {
      delete basePrev.modelKey;
    }
  }
  const merged = buildProduceAttributes(speciesId, {
    ...basePrev,
    ...(overrides || {}),
  });
  const prevFraction = prev?.remainingFraction || 1;
  const ratio = merged.remainingFraction / Math.max(0.02, prevFraction);

  item.itemId = speciesId;
  item.produceAttributes = merged;
  item.nameRu = buildProduceDisplayName(merged);
  item.descriptionRu = buildProduceDescriptionRu(merged);
  item.weight = Number(Math.max(0.002, merged.weightGrams / 1000).toFixed(4));
  item.volume = Number(Math.max(0.002, (merged.weightGrams / 1000) * 1.05).toFixed(4));
  item.usable = merged.edible !== false;
  if (merged.edible === false) {
    item.category = 'misc';
    item.effects = {};
    item.portions = 1;
    item.maxPortions = 1;
  } else {
    item.category = 'food';
    if (Math.abs(ratio - 1) > 0.02 && item.effects) {
      const scaled: InventoryItem['effects'] = {};
      if (item.effects.hunger) scaled.hunger = Math.max(1, Math.round(item.effects.hunger * ratio));
      if (item.effects.thirst) scaled.thirst = Math.max(1, Math.round(item.effects.thirst * ratio));
      if (item.effects.health) scaled.health = Math.round(item.effects.health * ratio);
      if (item.effects.energy) scaled.energy = Math.round(item.effects.energy * ratio);
      if (item.effects.sleepiness) scaled.sleepiness = Math.round(item.effects.sleepiness * ratio);
      item.effects = scaled;
    }
    const targetPortions = Math.max(1, Math.min(12, Math.round((item.maxPortions || 4) * ratio)));
    item.maxPortions = targetPortions;
    item.portions = Math.min(targetPortions, Math.max(1, Math.round((item.portions || targetPortions) * ratio)));
  }
  return item;
}

// =============================================================================
// 5. PLANT BRANCH BUILDERS & SYNC HELPERS
// =============================================================================
export function buildBranchAttributes(
  presetId?: string,
  overrides?: Partial<PlantBranchAttributes>
): PlantBranchAttributes {
  const preset = presetId ? LEGACY_BRANCH_PRESETS[presetId] : undefined;
  const branchKind: PlantBranchKind = overrides?.branchKind ?? preset?.branchKind ?? 'twig';
  const lengthCm = Number((overrides?.lengthCm ?? preset?.lengthCm ?? 14).toFixed(1));
  const size: ProduceSizeTier = overrides?.size ?? inferSizeTierFromCm(lengthCm);

  let attachedFruit = overrides?.attachedFruit !== undefined ? overrides.attachedFruit : null;
  if (attachedFruit === null && overrides?.attachedFruit === undefined && preset?.fruitSpeciesId) {
    const fAttrs = buildProduceAttributes(preset.fruitSpeciesId, preset.fruitOverrides);
    const fSpec = PRODUCE_SPECIES_SPECS[preset.fruitSpeciesId];
    const cnt = preset.fruitCount ?? 6;
    attachedFruit = {
      itemId: preset.fruitSpeciesId,
      nameRu: fSpec?.baseNameRu || preset.fruitSpeciesId,
      count: cnt,
      maxCount: cnt,
      fruitAttributes: fAttrs,
    };
  }
  if (attachedFruit && attachedFruit.count <= 0) {
    attachedFruit = null;
  }

  return {
    branchKind,
    branchKindRu: overrides?.branchKindRu ?? preset?.branchKindRu ?? BRANCH_KIND_NAMES_RU[branchKind],
    size,
    sizeNameRu: overrides?.sizeNameRu ?? formatSizeNameRu(size, lengthCm),
    lengthCm,
    branchWeightGrams: Math.max(1, Math.round(overrides?.branchWeightGrams ?? preset?.branchWeightGrams ?? 8)),
    color: overrides?.color ?? preset?.color ?? '#65a30d',
    colorNameRu: overrides?.colorNameRu ?? preset?.colorNameRu ?? 'Зелёно-коричневый',
    materialRu: overrides?.materialRu ?? preset?.materialRu ?? 'Гибкая растительная веточка',
    freshness: Math.max(0, Math.min(100, Math.round(overrides?.freshness ?? preset?.freshness ?? 90))),
    attachedFruit,
  };
}

export function computeBranchTotalWeightKg(attrs: PlantBranchAttributes): number {
  const fruitGrams = attrs.attachedFruit
    ? attrs.attachedFruit.count * attrs.attachedFruit.fruitAttributes.weightGrams
    : 0;
  return Number(Math.max(0.003, (attrs.branchWeightGrams + fruitGrams) / 1000).toFixed(4));
}

export function buildBranchDisplayName(attrs: PlantBranchAttributes): string {
  if (!attrs.attachedFruit || attrs.attachedFruit.count <= 0) {
    return `Ветка (${attrs.branchKindRu.toLowerCase()}, пустая)`;
  }
  const f = attrs.attachedFruit;
  const varietyPart =
    f.fruitAttributes.varietyRu &&
    f.fruitAttributes.speciesId === 'grape_single'
      ? ` ${f.fruitAttributes.varietyRu.toLowerCase()}`
      : '';
  return `${attrs.branchKindRu}: ${f.nameRu}${varietyPart} (${f.count} шт.)`;
}

export function buildBranchDescriptionRu(attrs: PlantBranchAttributes): string {
  const totalG = Math.round(computeBranchTotalWeightKg(attrs) * 1000);
  if (!attrs.attachedFruit || attrs.attachedFruit.count <= 0) {
    return `${attrs.branchKindRu} без плодов (${attrs.materialRu}). Размер: ${attrs.sizeNameRu}, вес: ${totalG} г.`;
  }
  const f = attrs.attachedFruit;
  return `${attrs.branchKindRu} с плодами «${f.nameRu}» (${f.fruitAttributes.varietyRu}): ${f.count} из ${f.maxCount} шт. Размер ветки: ${attrs.sizeNameRu}, общий вес: ${totalG} г. Сорвите плоды в сетке крафта или ножом.`;
}

export function applyBranchAttributesToItem(
  item: InventoryItem,
  overrides?: Partial<PlantBranchAttributes>,
  presetId?: string
): InventoryItem {
  const basePrev: Partial<PlantBranchAttributes> =
    !presetId && item.branchAttributes ? { ...item.branchAttributes } : {};
  if (overrides?.lengthCm !== undefined) {
    if (overrides.size === undefined) delete basePrev.size;
    if (overrides.sizeNameRu === undefined) delete basePrev.sizeNameRu;
  }
  const merged = buildBranchAttributes(presetId, {
    ...basePrev,
    ...(overrides || {}),
  });
  item.itemId = 'plant_branch';
  item.branchAttributes = merged;
  item.name = merged.attachedFruit
    ? `Plant Branch (${merged.attachedFruit.nameRu} x${merged.attachedFruit.count})`
    : 'Empty Plant Branch';
  item.nameRu = buildBranchDisplayName(merged);
  item.descriptionRu = buildBranchDescriptionRu(merged);
  const totalKg = computeBranchTotalWeightKg(merged);
  item.weight = totalKg;
  item.volume = Number(Math.max(0.01, totalKg * 1.15).toFixed(4));
  if (merged.attachedFruit && merged.attachedFruit.count > 0) {
    item.category = 'food';
    item.usable = true;
    item.maxPortions = merged.attachedFruit.maxCount;
    item.portions = merged.attachedFruit.count;
    item.effects = {
      hunger: Math.max(2, Math.round(merged.attachedFruit.fruitAttributes.weightGrams * 0.08)),
      thirst: Math.max(1, Math.round((merged.attachedFruit.fruitAttributes.juiciness / 100) * 6)),
    };
  } else {
    item.category = 'misc';
    item.usable = false;
    item.effects = {};
    item.portions = 1;
    item.maxPortions = 1;
  }
  return item;
}

// =============================================================================
// 6. SLOT-PERCENTAGE KNIFE CUTTING ENGINE (2x2 & 4x4)
// =============================================================================
export interface KnifeCutResult {
  outputs: InventoryItem[];
  title: string;
  subtitle: string;
  actionLabel: string;
}

function jitterRatio(nominal: number, applyJitter: boolean, maxDelta: number = 0.07): number {
  if (!applyJitter) return nominal;
  const tri = Math.random() + Math.random() - 1; // [-1, 1] triangular
  return Math.max(0.04, Math.min(0.96, nominal + tri * maxDelta));
}

function cloneForCut(
  source: InventoryItem,
  overrides: Partial<ProduceAttributes>,
  uidSuffix: string
): InventoryItem {
  const copy: InventoryItem = JSON.parse(JSON.stringify(source));
  copy.id = `item_${source.itemId}_cut_${Date.now()}_${uidSuffix}_${Math.random().toString(36).slice(2, 6)}`;
  copy.count = 1;
  copy.maxStack = 1;
  return applyProduceAttributesToItem(copy, overrides);
}

/**
 * Cuts ANY produce item with a knife using the same percentage grid slots as pouring:
 * - dosageFraction === 1.0 (slot 0 "Всё"):
 *   - If whole & separable (garlic -> cloves, cabbage -> leaves, broccoli/cauliflower -> florets, pomegranate -> seeds, citrus -> segments) -> separates into parts
 *   - Else if unpeeled & peelable -> peels cleanly (and yields peel piece if peelModelKey exists, e.g. banana)
 *   - Else -> processes entire piece to next culinary stage (whole -> slices/wedges -> diced -> grated/shredded/crushed)
 * - Partial dosageFraction (0 < dosageFraction < 1, e.g. ~92%..~8% in 4x4 or ~50% in 2x2):
 *   - >= 0.72 (~92%..~75%): отрезать край / крупный кусок (~dosageFraction + остаток)
 *   - >= 0.45 (~67%..~50%): разрезать на 2 части (половинки, с естественной ручной погрешностью)
 *   - >= 0.30 (~42%..~33%): дольки / четвертинки (3–4 шт.)
 *   - >= 0.20 (~25%): кружки / кольца / ломтики (4–5 шт.)
 *   - >= 0.12 (~17%): кубики / соломка (5–6 шт.)
 *   - < 0.12 (~8%): мелкая шинковка / тёртый / паста
 */
export function computeKnifeCutForProduce(
  source: InventoryItem,
  dosageFraction: number,
  applyJitter: boolean
): KnifeCutResult | null {
  const attrs = source.produceAttributes;
  if (!attrs) return null;
  if (attrs.edible === false || attrs.cutForm === 'peel' || attrs.cutForm === 'core') {
    return null;
  }
  const spec = PRODUCE_SPECIES_SPECS[attrs.speciesId];
  if (!spec) return null;

  const curW = attrs.weightGrams;
  const curFrac = attrs.remainingFraction;
  const pct = Math.round(dosageFraction * 100);

  // Can't keep splitting microscopic crumbs infinitely
  const isAlreadyFinest =
    attrs.cutForm === 'grated' ||
    attrs.cutForm === 'shredded' ||
    attrs.cutForm === 'crushed';
  if (isAlreadyFinest && curW <= 6) return null;

  // --- CASE A: Slot 0 ("Всё" / 100%) ---
  if (dosageFraction >= 0.999) {
    // 1. Separable natural parts when whole (garlic -> cloves, cabbage -> leaves, broccoli/cauliflower -> florets, pomegranate -> seeds, citrus -> segments)
    if (attrs.cutForm === 'whole' && spec.separablePart) {
      const sep = spec.separablePart;
      const partCount = sep.count;
      const usableFactor = sep.isPeeled && spec.peelWeightFraction ? 1 - spec.peelWeightFraction : 0.92;
      const totalPartW = Math.max(partCount, Math.round(curW * usableFactor));
      const outputs: InventoryItem[] = [];
      let assigned = 0;
      for (let i = 0; i < partCount; i++) {
        const share = i === partCount - 1
          ? Math.max(1, totalPartW - assigned)
          : Math.max(1, Math.round((totalPartW / partCount) * jitterRatio(1, applyJitter, 0.09)));
        assigned += share;
        outputs.push(
          cloneForCut(
            source,
            {
              cutForm: 'part',
              cutFormRu: sep.cutFormRu,
              part: sep.part,
              partNameRu: sep.partNameRu,
              isPeeled: sep.isPeeled ?? attrs.isPeeled,
              weightGrams: share,
              remainingFraction: Math.max(0.02, (share / Math.max(1, attrs.baseWholeWeightGrams))),
              modelKey: sep.modelKey,
            },
            `part${i}`
          )
        );
      }
      return {
        outputs,
        title: `Разделка: ${spec.baseNameRu}`,
        subtitle: `Слот «Всё» → ${partCount} × ${sep.partNameRu.toLowerCase()} (~${Math.round(totalPartW / partCount)} г)`,
        actionLabel: 'Разделать ножом',
      };
    }

    // 2. Peel unpeeled peelable whole produce
    if (!attrs.isPeeled && spec.peelable && attrs.cutForm === 'whole') {
      const peelFrac = jitterRatio(spec.peelWeightFraction ?? 0.14, applyJitter, 0.025);
      const peelW = Math.max(2, Math.round(curW * peelFrac));
      const fleshW = Math.max(2, curW - peelW);
      const peeled = cloneForCut(
        source,
        {
          cutForm: 'peeled',
          cutFormRu: 'Очищенный',
          part: 'flesh',
          partNameRu: 'Очищенная мякоть',
          isPeeled: true,
          weightGrams: fleshW,
          remainingFraction: Math.max(0.05, fleshW / Math.max(1, attrs.baseWholeWeightGrams)),
          juiciness: Math.min(100, attrs.juiciness + 2),
          modelKey: spec.variantModelKeys?.peeled,
        },
        'peeled'
      );
      const outputs: InventoryItem[] = [peeled];
      if (spec.peelModelKey) {
        outputs.push(
          cloneForCut(
            source,
            {
              cutForm: 'peel',
              cutFormRu: 'Кожура',
              part: 'peel',
              partNameRu: spec.peelNameRu || 'Кожура',
              isPeeled: false,
              edible: false,
              juiciness: 12,
              weightGrams: peelW,
              remainingFraction: Math.max(0.04, peelW / Math.max(1, attrs.baseWholeWeightGrams)),
              modelKey: spec.peelModelKey,
            },
            'peel'
          )
        );
      }
      return {
        outputs,
        title: `Очистка: ${spec.baseNameRu}`,
        subtitle: `Слот «Всё» → ${peeled.nameRu} (${fleshW} г)${spec.peelModelKey ? ` + ${spec.peelNameRu}` : ''}`,
        actionLabel: 'Очистить ножом',
      };
    }

    // 3. Full-stage progression (whole/peeled -> preferred slices -> diced -> finely grated/shredded/crushed)
    if (attrs.cutForm === 'whole' || attrs.cutForm === 'peeled' || attrs.cutForm === 'half' || attrs.cutForm === 'chunk') {
      const sliceCut = spec.preferredSliceCut || 'slice';
      const pieceCount = curW >= 600 ? 4 : curW >= 120 ? 3 : 2;
      const outputs: InventoryItem[] = [];
      let remW = curW;
      for (let i = 0; i < pieceCount; i++) {
        const w = i === pieceCount - 1
          ? Math.max(1, remW)
          : Math.max(1, Math.round((curW / pieceCount) * jitterRatio(1, applyJitter, 0.08)));
        remW = Math.max(1, remW - w);
        outputs.push(
          cloneForCut(
            source,
            {
              cutForm: sliceCut,
              cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[sliceCut],
              part: 'piece',
              partNameRu: PRODUCE_CUT_FORM_NAMES_RU[sliceCut],
              weightGrams: w,
              remainingFraction: Math.max(0.02, w / Math.max(1, attrs.baseWholeWeightGrams)),
              juiciness: Math.min(100, attrs.juiciness + 3),
              modelKey: spec.variantModelKeys?.[sliceCut],
            },
            `sl${i}`
          )
        );
      }
      return {
        outputs,
        title: `Нарезка: ${spec.baseNameRu}`,
        subtitle: `Слот «Всё» → ${pieceCount} × ${PRODUCE_CUT_FORM_NAMES_RU[sliceCut].toLowerCase()} (~${Math.round(curW / pieceCount)} г)`,
        actionLabel: 'Нарезать ножом',
      };
    }

    if (attrs.cutForm !== 'diced' && !isAlreadyFinest) {
      const diced = cloneForCut(
        source,
        {
          cutForm: 'diced',
          cutFormRu: 'Кубики',
          part: 'piece',
          partNameRu: 'Нарезанные кубики',
          weightGrams: curW,
          remainingFraction: curFrac,
          dimensionCm: Math.max(1.2, Number((attrs.dimensionCm * 0.65).toFixed(1))),
          juiciness: Math.min(100, attrs.juiciness + 3),
          modelKey: spec.variantModelKeys?.diced,
        },
        'diced'
      );
      return {
        outputs: [diced],
        title: `Нарезка кубиками: ${spec.baseNameRu}`,
        subtitle: `Слот «Всё» → ${diced.nameRu} (${curW} г)`,
        actionLabel: 'Нарезать кубиками',
      };
    }

    if (!isAlreadyFinest) {
      const fineCut = spec.preferredFineCut || 'shredded';
      const fine = cloneForCut(
        source,
        {
          cutForm: fineCut,
          cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[fineCut],
          part: 'flesh',
          partNameRu: PRODUCE_CUT_FORM_NAMES_RU[fineCut],
          weightGrams: curW,
          remainingFraction: curFrac,
          dimensionCm: Math.max(0.8, Number((attrs.dimensionCm * 0.5).toFixed(1))),
          juiciness: Math.min(100, attrs.juiciness + 5),
          modelKey: spec.variantModelKeys?.[fineCut],
        },
        'fine'
      );
      return {
        outputs: [fine],
        title: `Мелкое измельчение: ${spec.baseNameRu}`,
        subtitle: `Слот «Всё» → ${fine.nameRu} (${curW} г)`,
        actionLabel: 'Измельчить ножом',
      };
    }
    return null;
  }

  // --- CASE B: Partial Percentage Cells (~92% .. ~8%) ---
  // 1. High fraction (~92%..~67%): Cut off a proportional large chunk + smaller cut piece
  if (dosageFraction >= 0.64) {
    if (curW < 4) return null;
    const mainShare = jitterRatio(dosageFraction, applyJitter, 0.055);
    const bigW = Math.max(1, Math.min(curW - 1, Math.round(curW * mainShare)));
    const smallW = Math.max(1, curW - bigW);
    const bigCut: ProduceCutForm = bigW / Math.max(1, attrs.baseWholeWeightGrams) >= 0.6 ? 'chunk' : 'half';
    const smallCut: ProduceCutForm = spec.preferredSliceCut || 'slice';

    const bigPiece = cloneForCut(
      source,
      {
        cutForm: bigCut,
        cutFormRu: bigCut === 'chunk' ? 'Отрезанная часть' : 'Крупный кусок',
        part: 'piece',
        partNameRu: 'Отрезанная часть',
        weightGrams: bigW,
        remainingFraction: Math.max(0.02, bigW / Math.max(1, attrs.baseWholeWeightGrams)),
        modelKey: spec.variantModelKeys?.[bigCut],
      },
      'big'
    );
    const smallPiece = cloneForCut(
      source,
      {
        cutForm: smallCut,
        cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[smallCut],
        part: 'piece',
        partNameRu: PRODUCE_CUT_FORM_NAMES_RU[smallCut],
        weightGrams: smallW,
        remainingFraction: Math.max(0.02, smallW / Math.max(1, attrs.baseWholeWeightGrams)),
        juiciness: Math.min(100, attrs.juiciness + 2),
        modelKey: spec.variantModelKeys?.[smallCut],
      },
      'sm'
    );
    return {
      outputs: [bigPiece, smallPiece],
      title: `Отрезание куска (~${pct}%): ${spec.baseNameRu}`,
      subtitle: `${applyJitter ? '' : '~'}${bigW} г (${Math.round((bigW / curW) * 100)}%) + ${applyJitter ? '' : '~'}${smallW} г (${Math.round((smallW / curW) * 100)}%)`,
      actionLabel: 'Отрезать ножом',
    };
  }

  // 2. ~58%..~45% (includes slot 1 in 2x2 = ~50%!): Split cleanly in halves (with natural hand-cut variance)
  if (dosageFraction >= 0.45) {
    if (curW < 2) return null;
    const splitA = jitterRatio(dosageFraction, applyJitter, 0.065);
    const wA = Math.max(1, Math.min(curW - 1, Math.round(curW * splitA)));
    const wB = Math.max(1, curW - wA);
    const nextCut: ProduceCutForm =
      attrs.cutForm === 'whole' || attrs.cutForm === 'peeled'
        ? 'half'
        : attrs.cutForm === 'half'
        ? 'quarter'
        : attrs.cutForm === 'quarter'
        ? spec.preferredSliceCut || 'wedge'
        : attrs.cutForm;

    const pA = cloneForCut(
      source,
      {
        cutForm: nextCut,
        cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[nextCut],
        part: 'piece',
        partNameRu: PRODUCE_CUT_FORM_NAMES_RU[nextCut],
        weightGrams: wA,
        remainingFraction: Math.max(0.02, wA / Math.max(1, attrs.baseWholeWeightGrams)),
        juiciness: Math.min(100, attrs.juiciness + 2),
        modelKey: spec.variantModelKeys?.[nextCut],
      },
      'hA'
    );
    const pB = cloneForCut(
      source,
      {
        cutForm: nextCut,
        cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[nextCut],
        part: 'piece',
        partNameRu: PRODUCE_CUT_FORM_NAMES_RU[nextCut],
        weightGrams: wB,
        remainingFraction: Math.max(0.02, wB / Math.max(1, attrs.baseWholeWeightGrams)),
        juiciness: Math.min(100, attrs.juiciness + 2),
        modelKey: spec.variantModelKeys?.[nextCut],
      },
      'hB'
    );
    return {
      outputs: [pA, pB],
      title: `Разрез пополам (~${pct}%): ${spec.baseNameRu}`,
      subtitle: `${PRODUCE_CUT_FORM_NAMES_RU[nextCut]}: ${applyJitter ? '' : '~'}${wA} г + ${applyJitter ? '' : '~'}${wB} г`,
      actionLabel: 'Разрезать пополам',
    };
  }

  // 3. ~42%..~30%: Cut into 3–4 wedges / quarters
  if (dosageFraction >= 0.30) {
    if (curW < 4) return null;
    const count = dosageFraction >= 0.38 ? 3 : 4;
    const cutForm: ProduceCutForm = count === 4 ? 'quarter' : 'wedge';
    const outputs: InventoryItem[] = [];
    let rem = curW;
    for (let i = 0; i < count; i++) {
      const w = i === count - 1
        ? Math.max(1, rem)
        : Math.max(1, Math.min(rem - (count - 1 - i), Math.round((curW / count) * jitterRatio(1, applyJitter, 0.09))));
      rem = Math.max(1, rem - w);
      outputs.push(
        cloneForCut(
          source,
          {
            cutForm,
            cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[cutForm],
            part: 'piece',
            partNameRu: PRODUCE_CUT_FORM_NAMES_RU[cutForm],
            weightGrams: w,
            remainingFraction: Math.max(0.02, w / Math.max(1, attrs.baseWholeWeightGrams)),
            juiciness: Math.min(100, attrs.juiciness + 3),
            modelKey: spec.variantModelKeys?.[cutForm] || spec.variantModelKeys?.wedge,
          },
          `w${i}`
        )
      );
    }
    return {
      outputs,
      title: `Нарезка на ${count} части (~${pct}%): ${spec.baseNameRu}`,
      subtitle: `${count} × ${PRODUCE_CUT_FORM_NAMES_RU[cutForm].toLowerCase()} (~${Math.round(curW / count)} г)`,
      actionLabel: 'Нарезать дольками',
    };
  }

  // 4. ~25%: Cut into slices / rings / strips (4 pieces)
  if (dosageFraction >= 0.20) {
    if (curW < 4) return null;
    const sliceCut = spec.preferredSliceCut || 'slice';
    const count = Math.min(4, Math.max(2, Math.round(curW / Math.max(5, curW * 0.25))));
    const outputs: InventoryItem[] = [];
    let rem = curW;
    for (let i = 0; i < count; i++) {
      const w = i === count - 1
        ? Math.max(1, rem)
        : Math.max(1, Math.min(rem - (count - 1 - i), Math.round((curW / count) * jitterRatio(1, applyJitter, 0.1))));
      rem = Math.max(1, rem - w);
      outputs.push(
        cloneForCut(
          source,
          {
            cutForm: sliceCut,
            cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[sliceCut],
            part: 'piece',
            partNameRu: PRODUCE_CUT_FORM_NAMES_RU[sliceCut],
            weightGrams: w,
            remainingFraction: Math.max(0.02, w / Math.max(1, attrs.baseWholeWeightGrams)),
            juiciness: Math.min(100, attrs.juiciness + 4),
            modelKey: spec.variantModelKeys?.[sliceCut],
          },
          `s${i}`
        )
      );
    }
    return {
      outputs,
      title: `Нарезка (~${pct}%): ${spec.baseNameRu}`,
      subtitle: `${count} × ${PRODUCE_CUT_FORM_NAMES_RU[sliceCut].toLowerCase()} (~${Math.round(curW / count)} г)`,
      actionLabel: `Нарезать (${PRODUCE_CUT_FORM_NAMES_RU[sliceCut].toLowerCase()})`,
    };
  }

  // 5. ~17%: Diced cubes / fine strips (2 portions)
  if (dosageFraction >= 0.12) {
    const cutForm: ProduceCutForm = spec.preferredSliceCut === 'strips' ? 'strips' : 'diced';
    const portionCount = curW >= 60 ? 2 : 1;
    const outputs: InventoryItem[] = [];
    let rem = curW;
    for (let i = 0; i < portionCount; i++) {
      const w = i === portionCount - 1
        ? Math.max(1, rem)
        : Math.max(1, Math.round((curW / portionCount) * jitterRatio(1, applyJitter, 0.08)));
      rem = Math.max(1, rem - w);
      outputs.push(
        cloneForCut(
          source,
          {
            cutForm,
            cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[cutForm],
            part: 'piece',
            partNameRu: PRODUCE_CUT_FORM_NAMES_RU[cutForm],
            weightGrams: w,
            remainingFraction: Math.max(0.02, w / Math.max(1, attrs.baseWholeWeightGrams)),
            dimensionCm: Math.max(1.2, Number((attrs.dimensionCm * 0.55).toFixed(1))),
            juiciness: Math.min(100, attrs.juiciness + 4),
            modelKey: spec.variantModelKeys?.[cutForm],
          },
          `d${i}`
        )
      );
    }
    return {
      outputs,
      title: `Мелкая нарезка (~${pct}%): ${spec.baseNameRu}`,
      subtitle: `${portionCount > 1 ? `${portionCount} порции · ` : ''}${PRODUCE_CUT_FORM_NAMES_RU[cutForm]} (${curW} г)`,
      actionLabel: cutForm === 'strips' ? 'Нарезать соломкой' : 'Нарезать кубиками',
    };
  }

  // 6. ~8% (finest cell): Finely shredded / grated / crushed paste
  const fineCut = spec.preferredFineCut || 'shredded';
  const finePiece = cloneForCut(
    source,
    {
      cutForm: fineCut,
      cutFormRu: PRODUCE_CUT_FORM_NAMES_RU[fineCut],
      part: 'flesh',
      partNameRu: PRODUCE_CUT_FORM_NAMES_RU[fineCut],
      weightGrams: curW,
      remainingFraction: curFrac,
      dimensionCm: Math.max(0.8, Number((attrs.dimensionCm * 0.4).toFixed(1))),
      juiciness: Math.min(100, attrs.juiciness + 6),
      modelKey: spec.variantModelKeys?.[fineCut],
    },
    'finest'
  );
  return {
    outputs: [finePiece],
    title: `Тонкое измельчение (~${pct}%): ${spec.baseNameRu}`,
    subtitle: `${PRODUCE_CUT_FORM_NAMES_RU[fineCut]} (${curW} г)`,
    actionLabel: 'Мелко нашинковать / натереть',
  };
}

/**
 * Plucks/cuts fruits off a `plant_branch` using the same percentage slots:
 * - Slot 0 ("Всё"): removes ALL fruits -> bare empty branch + fruits
 * - Partial slot: removes ~dosageFraction of fruits -> branch with remaining fruits + plucked fruits
 */
export function computeBranchPluck(
  branchItem: InventoryItem,
  dosageFraction: number,
  applyJitter: boolean,
  withKnife: boolean,
  createSingleFruitItem: (speciesId: string, attrs: ProduceAttributes) => InventoryItem
): KnifeCutResult | null {
  const bAttrs = branchItem.branchAttributes;
  if (!bAttrs || !bAttrs.attachedFruit || bAttrs.attachedFruit.count <= 0) {
    return null;
  }
  const attached = bAttrs.attachedFruit;
  const totalCount = attached.count;

  let takeCount: number;
  if (dosageFraction >= 0.999) {
    takeCount = totalCount;
  } else {
    const raw = totalCount * jitterRatio(dosageFraction, applyJitter, 0.08);
    takeCount = Math.max(1, Math.min(totalCount, Math.round(raw)));
  }

  const remainingCount = totalCount - takeCount;
  const updatedBranch: InventoryItem = JSON.parse(JSON.stringify(branchItem));
  updatedBranch.id = `item_plant_branch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  applyBranchAttributesToItem(updatedBranch, {
    ...bAttrs,
    attachedFruit:
      remainingCount > 0
        ? { ...attached, count: remainingCount }
        : null,
  });

  // Produce individual fruit items (grouped by stack count = takeCount so they fit cleanly in grid preview,
  // and addItemToPlayer automatically splits count > 1 into standalone items when placed in inventory!)
  const plucked = createSingleFruitItem(attached.itemId, { ...attached.fruitAttributes });
  plucked.count = takeCount;
  plucked.maxStack = Math.max(takeCount, 1);

  const verb = withKnife ? 'Срезка с ветки' : 'Снятие с ветки';
  const pct = Math.round(dosageFraction * 100);
  return {
    outputs: [updatedBranch, plucked],
    title: `${verb}: ${attached.nameRu}`,
    subtitle:
      remainingCount > 0
        ? `Снято ${takeCount} из ${totalCount} шт. (${dosageFraction >= 0.999 ? 'всё' : `~${pct}%`}), осталось на ветке: ${remainingCount} шт.`
        : `Сняты все ${takeCount} шт. · осталась пустая ${bAttrs.branchKindRu.toLowerCase()}`,
    actionLabel: withKnife ? 'Срезать с ветки' : 'Сорвать плоды',
  };
}

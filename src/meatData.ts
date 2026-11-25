import {
  InventoryItem,
  MeatAttributes,
  MeatCategory,
  MeatCutForm,
  ProduceSizeTier,
} from './types';
import {
  KnifeCutResult,
  inferSizeTierFromCm,
  formatSizeNameRu,
} from './produceData';

// =============================================================================
// 1. SPECIES PALETTES & METADATA
// =============================================================================

interface MeatSpeciesMeta {
  speciesId: string;
  speciesNameRu: string;
  meatCategory: MeatCategory;
  color: string;
  colorNameRu: string;
  fatColor: string;
  baseJuiciness: number;
  baseFatContent: number;
  factor: number;
}

const MAMMAL_SPECIES: Record<string, MeatSpeciesMeta> = {
  beef: {
    speciesId: 'beef',
    speciesNameRu: 'Говядина',
    meatCategory: 'meat',
    color: '#9e1c20',
    colorNameRu: 'Насыщенно-рубиновый',
    fatColor: '#fef6db',
    baseJuiciness: 74,
    baseFatContent: 18,
    factor: 1.0,
  },
  pork: {
    speciesId: 'pork',
    speciesNameRu: 'Свинина',
    meatCategory: 'meat',
    color: '#dc637f',
    colorNameRu: 'Нежно-розовый',
    fatColor: '#fff8f9',
    baseJuiciness: 80,
    baseFatContent: 28,
    factor: 0.8,
  },
  mutton: {
    speciesId: 'mutton',
    speciesNameRu: 'Баранина',
    meatCategory: 'meat',
    color: '#8e2319',
    colorNameRu: 'Тёмно-красный',
    fatColor: '#fef3c7',
    baseJuiciness: 72,
    baseFatContent: 24,
    factor: 0.7,
  },
  venison: {
    speciesId: 'venison',
    speciesNameRu: 'Оленина',
    meatCategory: 'meat',
    color: '#6e112b',
    colorNameRu: 'Глубокий вишнёвый',
    fatColor: '#f1f5f9',
    baseJuiciness: 66,
    baseFatContent: 7,
    factor: 0.9,
  },
  goat: {
    speciesId: 'goat',
    speciesNameRu: 'Козлятина',
    meatCategory: 'meat',
    color: '#9d3417',
    colorNameRu: 'Красно-терракотовый',
    fatColor: '#fef9d6',
    baseJuiciness: 68,
    baseFatContent: 12,
    factor: 0.6,
  },
};

const BIRD_SPECIES: Record<string, MeatSpeciesMeta> = {
  chicken: {
    speciesId: 'chicken',
    speciesNameRu: 'Курица',
    meatCategory: 'poultry',
    color: '#f0939b',
    colorNameRu: 'Светло-розовый',
    fatColor: '#fde68a',
    baseJuiciness: 76,
    baseFatContent: 11,
    factor: 1.0,
  },
  duck: {
    speciesId: 'duck',
    speciesNameRu: 'Утка',
    meatCategory: 'poultry',
    color: '#bd2b33',
    colorNameRu: 'Красно-бордовый',
    fatColor: '#fcd34d',
    baseJuiciness: 82,
    baseFatContent: 26,
    factor: 1.2,
  },
  goose: {
    speciesId: 'goose',
    speciesNameRu: 'Гусь',
    meatCategory: 'poultry',
    color: '#a82228',
    colorNameRu: 'Тёмно-красный',
    fatColor: '#fde047',
    baseJuiciness: 80,
    baseFatContent: 30,
    factor: 2.0,
  },
  turkey: {
    speciesId: 'turkey',
    speciesNameRu: 'Индейка',
    meatCategory: 'poultry',
    color: '#e8a2a8',
    colorNameRu: 'Бледно-розовый',
    fatColor: '#fef3c7',
    baseJuiciness: 72,
    baseFatContent: 8,
    factor: 3.5,
  },
  pheasant: {
    speciesId: 'pheasant',
    speciesNameRu: 'Фазан',
    meatCategory: 'poultry',
    color: '#c45b63',
    colorNameRu: 'Розово-красный',
    fatColor: '#fde68a',
    baseJuiciness: 68,
    baseFatContent: 9,
    factor: 0.8,
  },
  quail: {
    speciesId: 'quail',
    speciesNameRu: 'Перепел',
    meatCategory: 'poultry',
    color: '#cf6b73',
    colorNameRu: 'Розовато-красный',
    fatColor: '#fef3c7',
    baseJuiciness: 70,
    baseFatContent: 10,
    factor: 0.15,
  },
};

const FISH_SPECIES: Record<string, MeatSpeciesMeta> = {
  salmon: {
    speciesId: 'salmon',
    speciesNameRu: 'Лосось',
    meatCategory: 'fish',
    color: '#f97316',
    colorNameRu: 'Янтарно-лососёвый',
    fatColor: '#ffedd5',
    baseJuiciness: 84,
    baseFatContent: 15,
    factor: 1.8,
  },
  tuna: {
    speciesId: 'tuna',
    speciesNameRu: 'Тунец',
    meatCategory: 'fish',
    color: '#be123c',
    colorNameRu: 'Рубиново-красный',
    fatColor: '#fda4af',
    baseJuiciness: 76,
    baseFatContent: 6,
    factor: 8.0,
  },
  cod: {
    speciesId: 'cod',
    speciesNameRu: 'Треска',
    meatCategory: 'fish',
    color: '#f1f5f9',
    colorNameRu: 'Жемчужно-белый',
    fatColor: '#cbd5e1',
    baseJuiciness: 78,
    baseFatContent: 3,
    factor: 1.5,
  },
  perch: {
    speciesId: 'perch',
    speciesNameRu: 'Окунь',
    meatCategory: 'fish',
    color: '#ffe4e6',
    colorNameRu: 'Светло-кремовый',
    fatColor: '#e2e8f0',
    baseJuiciness: 74,
    baseFatContent: 4,
    factor: 0.4,
  },
  herring: {
    speciesId: 'herring',
    speciesNameRu: 'Сельдь',
    meatCategory: 'fish',
    color: '#fda4af',
    colorNameRu: 'Розовато-серебристый',
    fatColor: '#f8fafc',
    baseJuiciness: 82,
    baseFatContent: 16,
    factor: 0.3,
  },
  pike: {
    speciesId: 'pike',
    speciesNameRu: 'Щука',
    meatCategory: 'fish',
    color: '#f8fafc',
    colorNameRu: 'Белоснежный',
    fatColor: '#cbd5e1',
    baseJuiciness: 70,
    baseFatContent: 3,
    factor: 1.2,
  },
  eel: {
    speciesId: 'eel',
    speciesNameRu: 'Угорь',
    meatCategory: 'fish',
    color: '#fdba74',
    colorNameRu: 'Кремово-золотистый',
    fatColor: '#fef3c7',
    baseJuiciness: 86,
    baseFatContent: 26,
    factor: 0.6,
  },
  catfish: {
    speciesId: 'catfish',
    speciesNameRu: 'Сом',
    meatCategory: 'fish',
    color: '#fecaca',
    colorNameRu: 'Светло-розовый',
    fatColor: '#fef3c7',
    baseJuiciness: 82,
    baseFatContent: 14,
    factor: 3.5,
  },
};

interface CutSuffixMeta {
  anatomicalPartRu: string;
  meatCategoryOverride?: MeatCategory;
  hasBone: boolean;
  hasSkin: boolean;
  fatDelta?: number;
  juicinessDelta?: number;
  cuttable: boolean;
  defaultCutForm?: MeatCutForm;
  preferredFineCut?: 'strips' | 'cubes';
  defaultWeightGrams?: number;
  colorOverride?: string;
  colorNameOverride?: string;
}

const MAMMAL_CUT_META: Record<string, CutSuffixMeta> = {
  carcass: { anatomicalPartRu: 'Целая туша', hasBone: true, hasSkin: false, cuttable: true },
  side: { anatomicalPartRu: 'Полутуша', hasBone: true, hasSkin: false, cuttable: true },
  quarter: { anatomicalPartRu: 'Четвертина туши', hasBone: true, hasSkin: false, cuttable: true },
  tenderloin_huge: { anatomicalPartRu: 'Вырезка', hasBone: false, hasSkin: false, fatDelta: -8, juicinessDelta: 8, cuttable: true, preferredFineCut: 'strips' },
  brisket_large: { anatomicalPartRu: 'Грудинка', hasBone: false, hasSkin: false, fatDelta: 12, juicinessDelta: 4, cuttable: true, preferredFineCut: 'cubes' },
  rump_large: { anatomicalPartRu: 'Окорок', hasBone: false, hasSkin: false, fatDelta: -2, juicinessDelta: 3, cuttable: true, preferredFineCut: 'cubes' },
  neck_medium: { anatomicalPartRu: 'Шея', hasBone: false, hasSkin: false, fatDelta: 6, juicinessDelta: 5, cuttable: true, preferredFineCut: 'cubes' },
  ribs_medium: { anatomicalPartRu: 'Рёбра', hasBone: true, hasSkin: false, fatDelta: 8, juicinessDelta: 2, cuttable: true, preferredFineCut: 'cubes' },
  scraps_small: { anatomicalPartRu: 'Обрезки (поджарка)', hasBone: false, hasSkin: false, fatDelta: 4, cuttable: true, defaultCutForm: 'chunk', preferredFineCut: 'strips' },
  liver: { anatomicalPartRu: 'Печень', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, fatDelta: -12, juicinessDelta: 10, cuttable: true, preferredFineCut: 'strips', colorOverride: '#6a121b', colorNameOverride: 'Тёмно-бордовый' },
  heart: { anatomicalPartRu: 'Сердце', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, fatDelta: -10, cuttable: true, preferredFineCut: 'strips', colorOverride: '#7f1d1d', colorNameOverride: 'Тёмно-рубиновый' },
  kidney: { anatomicalPartRu: 'Почка', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, fatDelta: -12, cuttable: true, preferredFineCut: 'cubes', colorOverride: '#7c2d12', colorNameOverride: 'Красно-коричневый' },
  brain: { anatomicalPartRu: 'Мозг', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, fatDelta: 4, juicinessDelta: 12, cuttable: true, preferredFineCut: 'cubes', colorOverride: '#f5d0c5', colorNameOverride: 'Светло-розовый' },
  tongue: { anatomicalPartRu: 'Язык', meatCategoryOverride: 'offal', hasBone: false, hasSkin: true, fatDelta: -4, juicinessDelta: 8, cuttable: true, preferredFineCut: 'strips', colorOverride: '#a84452', colorNameOverride: 'Розово-лиловый' },
  tripe: { anatomicalPartRu: 'Рубец', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, fatDelta: -10, cuttable: true, preferredFineCut: 'strips', colorOverride: '#e5d4b7', colorNameOverride: 'Кремово-бежевый' },
  intestines: { anatomicalPartRu: 'Кишки очищенные', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, fatDelta: -8, cuttable: true, preferredFineCut: 'strips', colorOverride: '#f3d5d5', colorNameOverride: 'Светло-розовый' },
  bone_marrow: { anatomicalPartRu: 'Мозговая кость', hasBone: true, hasSkin: false, cuttable: false, colorOverride: '#f3f1e8', colorNameOverride: 'Костяной' },
  bone_soup: { anatomicalPartRu: 'Суповая кость', hasBone: true, hasSkin: false, cuttable: false, colorOverride: '#f3f1e8', colorNameOverride: 'Костяной' },
  tallow: { anatomicalPartRu: 'Нутряной жир', hasBone: false, hasSkin: false, fatDelta: 75, juicinessDelta: -20, cuttable: true, preferredFineCut: 'cubes', colorOverride: '#fef3c7', colorNameOverride: 'Сливочно-кремовый' },
  minced: { anatomicalPartRu: 'Фарш', hasBone: false, hasSkin: false, cuttable: true, defaultCutForm: 'minced' },
};

const BIRD_CUT_META: Record<string, CutSuffixMeta> = {
  carcass_raw: { anatomicalPartRu: 'Целая сырая тушка', hasBone: true, hasSkin: true, cuttable: true },
  carcass_dressed: { anatomicalPartRu: 'Потрошёная тушка', hasBone: true, hasSkin: true, cuttable: true },
  breast_large: { anatomicalPartRu: 'Филе грудки', hasBone: false, hasSkin: false, fatDelta: -7, juicinessDelta: -2, cuttable: true, preferredFineCut: 'strips' },
  thighs_medium: { anatomicalPartRu: 'Бедро', hasBone: true, hasSkin: true, fatDelta: 5, juicinessDelta: 8, cuttable: true, preferredFineCut: 'cubes' },
  drumsticks_medium: { anatomicalPartRu: 'Голень', hasBone: true, hasSkin: true, fatDelta: 3, juicinessDelta: 6, cuttable: true, preferredFineCut: 'cubes' },
  wings_small: { anatomicalPartRu: 'Крылышко', hasBone: true, hasSkin: true, fatDelta: 6, cuttable: true, preferredFineCut: 'cubes' },
  necks_small: { anatomicalPartRu: 'Шея', hasBone: true, hasSkin: true, cuttable: true, preferredFineCut: 'cubes' },
  liver: { anatomicalPartRu: 'Печень', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, fatDelta: -6, juicinessDelta: 10, cuttable: true, preferredFineCut: 'cubes', colorOverride: '#6b1c23', colorNameOverride: 'Бордово-коричневый' },
  giblets: { anatomicalPartRu: 'Потроха', meatCategoryOverride: 'offal', hasBone: false, hasSkin: false, cuttable: true, preferredFineCut: 'cubes', colorOverride: '#7f1d1d', colorNameOverride: 'Тёмно-красный' },
  bones: { anatomicalPartRu: 'Кости остова', hasBone: true, hasSkin: false, cuttable: false, colorOverride: '#f3f1e8', colorNameOverride: 'Костяной' },
  minced: { anatomicalPartRu: 'Фарш из птицы', hasBone: false, hasSkin: false, cuttable: true, defaultCutForm: 'minced' },
};

const FISH_CUT_META: Record<string, CutSuffixMeta> = {
  whole: { anatomicalPartRu: 'Цельная рыба', hasBone: true, hasSkin: true, cuttable: true },
  fillet: { anatomicalPartRu: 'Филе', hasBone: false, hasSkin: true, cuttable: true, defaultCutForm: 'whole', preferredFineCut: 'strips' },
  steak: { anatomicalPartRu: 'Стейк', hasBone: true, hasSkin: true, cuttable: true, defaultCutForm: 'steak', preferredFineCut: 'cubes' },
  head: { anatomicalPartRu: 'Рыбья голова', hasBone: true, hasSkin: true, cuttable: false },
  skeleton: { anatomicalPartRu: 'Хребет и плавники', hasBone: true, hasSkin: false, cuttable: false },
  minced: { anatomicalPartRu: 'Рыбный фарш', hasBone: false, hasSkin: false, cuttable: true, defaultCutForm: 'minced' },
};

interface SeafoodSpec {
  itemId: string;
  speciesId: string;
  speciesNameRu: string;
  anatomicalPartRu: string;
  weightGrams: number;
  juiciness: number;
  fatContent: number;
  hasBone: boolean;
  hasSkin: boolean;
  color: string;
  colorNameRu: string;
  fatColor: string;
  preferredSliceRu?: string;
  preferredFineCut: 'strips' | 'cubes';
  defaultCutForm?: MeatCutForm;
}

const SEAFOOD_SPECS: Record<string, SeafoodSpec> = {
  minced_meat_mixed: {
    itemId: 'minced_meat_mixed',
    speciesId: 'mixed_meat',
    speciesNameRu: 'Говядина + свинина',
    anatomicalPartRu: 'Домашний фарш',
    weightGrams: 1000,
    juiciness: 78,
    fatContent: 23,
    hasBone: false,
    hasSkin: false,
    color: '#b83b4a',
    colorNameRu: 'Розово-рубиновый',
    fatColor: '#fef2f2',
    preferredFineCut: 'cubes',
    defaultCutForm: 'minced',
  },
  squid_tubes: {
    itemId: 'squid_tubes',
    speciesId: 'squid',
    speciesNameRu: 'Кальмар',
    anatomicalPartRu: 'Тушка кальмара',
    weightGrams: 500,
    juiciness: 80,
    fatContent: 2,
    hasBone: false,
    hasSkin: false,
    color: '#f8fafc',
    colorNameRu: 'Жемчужно-белый',
    fatColor: '#e2e8f0',
    preferredSliceRu: 'Кольца',
    preferredFineCut: 'strips',
  },
  squid_tentacles: {
    itemId: 'squid_tentacles',
    speciesId: 'squid',
    speciesNameRu: 'Кальмар',
    anatomicalPartRu: 'Щупальца кальмара',
    weightGrams: 300,
    juiciness: 78,
    fatContent: 2,
    hasBone: false,
    hasSkin: false,
    color: '#f1f5f9',
    colorNameRu: 'Перламутрово-розовый',
    fatColor: '#e2e8f0',
    preferredFineCut: 'cubes',
  },
  octopus_whole: {
    itemId: 'octopus_whole',
    speciesId: 'octopus',
    speciesNameRu: 'Осьминог',
    anatomicalPartRu: 'Цельный осьминог',
    weightGrams: 1500,
    juiciness: 76,
    fatContent: 2,
    hasBone: false,
    hasSkin: true,
    color: '#c08497',
    colorNameRu: 'Лилово-розовый',
    fatColor: '#f8fafc',
    preferredFineCut: 'cubes',
  },
  octopus_tentacles: {
    itemId: 'octopus_tentacles',
    speciesId: 'octopus',
    speciesNameRu: 'Осьминог',
    anatomicalPartRu: 'Щупальца осьминога',
    weightGrams: 500,
    juiciness: 76,
    fatContent: 2,
    hasBone: false,
    hasSkin: true,
    color: '#c08497',
    colorNameRu: 'Лилово-розовый',
    fatColor: '#f8fafc',
    preferredFineCut: 'cubes',
  },
  shrimp_king: {
    itemId: 'shrimp_king',
    speciesId: 'shrimp',
    speciesNameRu: 'Креветки',
    anatomicalPartRu: 'Королевские креветки',
    weightGrams: 500,
    juiciness: 82,
    fatContent: 2,
    hasBone: false,
    hasSkin: true,
    color: '#fb7185',
    colorNameRu: 'Кораллово-розовый',
    fatColor: '#fff1f2',
    preferredFineCut: 'cubes',
  },
  mussels_half_shell: {
    itemId: 'mussels_half_shell',
    speciesId: 'mussels',
    speciesNameRu: 'Мидии',
    anatomicalPartRu: 'Мидии в полуракушках',
    weightGrams: 400,
    juiciness: 86,
    fatContent: 3,
    hasBone: false,
    hasSkin: true,
    color: '#f59e0b',
    colorNameRu: 'Янтарно-кремовый',
    fatColor: '#334155',
    preferredFineCut: 'cubes',
  },
  scallops_fresh: {
    itemId: 'scallops_fresh',
    speciesId: 'scallops',
    speciesNameRu: 'Морской гребешок',
    anatomicalPartRu: 'Филе гребешка',
    weightGrams: 300,
    juiciness: 85,
    fatContent: 1,
    hasBone: false,
    hasSkin: false,
    color: '#fef3c7',
    colorNameRu: 'Сливочно-белый',
    fatColor: '#fde68a',
    preferredFineCut: 'cubes',
  },
  crab_legs: {
    itemId: 'crab_legs',
    speciesId: 'crab',
    speciesNameRu: 'Краб',
    anatomicalPartRu: 'Ноги королевского краба',
    weightGrams: 800,
    juiciness: 80,
    fatContent: 2,
    hasBone: false,
    hasSkin: true,
    color: '#ef4444',
    colorNameRu: 'Красно-белый',
    fatColor: '#f8fafc',
    preferredFineCut: 'cubes',
  },
};

export const MEAT_CUT_FORM_NAMES_RU: Record<MeatCutForm, string> = {
  whole: 'Целый отруб',
  chunk: 'Крупный кусок',
  half: 'Половинка',
  steak: 'Стейк / порция',
  medallion: 'Ломтики / медальоны',
  strips: 'Соломка',
  cubes: 'Кубики',
  minced: 'Рубленый фарш',
  fillet: 'Филе (без кости)',
  separated: 'Разделённые части',
};

// =============================================================================
// 2. RESOLUTION & ATTRIBUTE BUILDERS
// =============================================================================

interface ResolvedMeatTemplate {
  baseItemId: string;
  speciesId: string;
  speciesNameRu: string;
  meatCategory: MeatCategory;
  anatomicalPartRu: string;
  juiciness: number;
  fatContent: number;
  hasBone: boolean;
  hasSkin: boolean;
  color: string;
  colorNameRu: string;
  fatColor: string;
  cuttable: boolean;
  defaultCutForm: MeatCutForm;
  preferredFineCut: 'strips' | 'cubes';
  preferredSliceRu?: string;
  suffix: string;
  defaultWeightGrams: number;
}

function resolveMeatTemplate(itemId: string): ResolvedMeatTemplate | null {
  if (!itemId) return null;

  if (SEAFOOD_SPECS[itemId]) {
    const s = SEAFOOD_SPECS[itemId];
    return {
      baseItemId: itemId,
      speciesId: s.speciesId,
      speciesNameRu: s.speciesNameRu,
      meatCategory: itemId === 'minced_meat_mixed' ? 'meat' : 'seafood',
      anatomicalPartRu: s.anatomicalPartRu,
      juiciness: s.juiciness,
      fatContent: s.fatContent,
      hasBone: s.hasBone,
      hasSkin: s.hasSkin,
      color: s.color,
      colorNameRu: s.colorNameRu,
      fatColor: s.fatColor,
      cuttable: true,
      defaultCutForm: s.defaultCutForm || 'whole',
      preferredFineCut: s.preferredFineCut,
      preferredSliceRu: s.preferredSliceRu,
      suffix: itemId,
      defaultWeightGrams: s.weightGrams,
    };
  }

  const idx = itemId.indexOf('_');
  if (idx <= 0) return null;
  const prefix = itemId.slice(0, idx);
  const suffix = itemId.slice(idx + 1);

  if (MAMMAL_SPECIES[prefix] && MAMMAL_CUT_META[suffix]) {
    const sp = MAMMAL_SPECIES[prefix];
    const cm = MAMMAL_CUT_META[suffix];
    return {
      baseItemId: itemId,
      speciesId: sp.speciesId,
      speciesNameRu: sp.speciesNameRu,
      meatCategory: cm.meatCategoryOverride || sp.meatCategory,
      anatomicalPartRu: cm.anatomicalPartRu,
      juiciness: Math.max(15, Math.min(98, sp.baseJuiciness + (cm.juicinessDelta || 0))),
      fatContent: Math.max(1, Math.min(95, sp.baseFatContent + (cm.fatDelta || 0))),
      hasBone: cm.hasBone,
      hasSkin: cm.hasSkin,
      color: cm.colorOverride || sp.color,
      colorNameRu: cm.colorNameOverride || sp.colorNameRu,
      fatColor: sp.fatColor,
      cuttable: cm.cuttable,
      defaultCutForm: cm.defaultCutForm || 'whole',
      preferredFineCut: cm.preferredFineCut || 'cubes',
      suffix,
      defaultWeightGrams: Math.round(1000 * sp.factor),
    };
  }

  if (BIRD_SPECIES[prefix] && BIRD_CUT_META[suffix]) {
    const sp = BIRD_SPECIES[prefix];
    const cm = BIRD_CUT_META[suffix];
    return {
      baseItemId: itemId,
      speciesId: sp.speciesId,
      speciesNameRu: sp.speciesNameRu,
      meatCategory: cm.meatCategoryOverride || sp.meatCategory,
      anatomicalPartRu: cm.anatomicalPartRu,
      juiciness: Math.max(15, Math.min(98, sp.baseJuiciness + (cm.juicinessDelta || 0))),
      fatContent: Math.max(1, Math.min(90, sp.baseFatContent + (cm.fatDelta || 0))),
      hasBone: cm.hasBone,
      hasSkin: cm.hasSkin,
      color: cm.colorOverride || sp.color,
      colorNameRu: cm.colorNameOverride || sp.colorNameRu,
      fatColor: sp.fatColor,
      cuttable: cm.cuttable,
      defaultCutForm: cm.defaultCutForm || 'whole',
      preferredFineCut: cm.preferredFineCut || 'cubes',
      suffix,
      defaultWeightGrams: Math.round(500 * sp.factor),
    };
  }

  if (FISH_SPECIES[prefix] && FISH_CUT_META[suffix]) {
    const sp = FISH_SPECIES[prefix];
    const cm = FISH_CUT_META[suffix];
    return {
      baseItemId: itemId,
      speciesId: sp.speciesId,
      speciesNameRu: sp.speciesNameRu,
      meatCategory: sp.meatCategory,
      anatomicalPartRu: cm.anatomicalPartRu,
      juiciness: sp.baseJuiciness,
      fatContent: sp.baseFatContent,
      hasBone: cm.hasBone,
      hasSkin: cm.hasSkin,
      color: sp.color,
      colorNameRu: sp.colorNameRu,
      fatColor: sp.fatColor,
      cuttable: cm.cuttable,
      defaultCutForm: cm.defaultCutForm || 'whole',
      preferredFineCut: cm.preferredFineCut || 'cubes',
      suffix,
      defaultWeightGrams: Math.round(600 * sp.factor),
    };
  }

  return null;
}

export function isMeatOrFishItemId(itemId: string): boolean {
  return resolveMeatTemplate(itemId) !== null;
}

export function isCuttableMeatItem(item: InventoryItem | null): boolean {
  if (!item) return false;
  if (item.meatAttributes) {
    if (item.meatAttributes.cuttable === false) return false;
    return item.meatAttributes.weightGrams >= 15;
  }
  const tpl = resolveMeatTemplate(item.itemId);
  return Boolean(tpl && tpl.cuttable);
}

function estimateMeatDimensionCm(weightGrams: number, cutForm: MeatCutForm): number {
  const baseCm = Math.max(1.5, Math.pow(Math.max(5, weightGrams), 1 / 3) * 1.45);
  let mult = 1.0;
  if (cutForm === 'steak') mult = 0.92;
  else if (cutForm === 'medallion') mult = 0.65;
  else if (cutForm === 'strips') mult = 0.55;
  else if (cutForm === 'cubes') mult = 0.42;
  else if (cutForm === 'minced') mult = 0.28;
  const val = Math.max(0.8, baseCm * mult);
  return val >= 10 ? Math.round(val) : Number(val.toFixed(1));
}

export function formatMeatWeightLabel(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${Number(kg.toFixed(kg >= 10 ? 1 : 2))} кг`;
  }
  return `${Math.max(1, Math.round(grams))} г`;
}

export function buildMeatAttributes(
  itemId: string,
  weightKg?: number,
  overrides?: Partial<MeatAttributes>
): MeatAttributes | null {
  const tpl = resolveMeatTemplate(itemId);
  if (!tpl) return null;

  const baseWholeWeightGrams = Math.max(
    1,
    Math.round(
      overrides?.baseWholeWeightGrams ??
        (weightKg && weightKg > 0 ? weightKg * 1000 : tpl.defaultWeightGrams)
    )
  );
  const weightGrams = Math.max(
    1,
    Math.round(overrides?.weightGrams ?? baseWholeWeightGrams)
  );
  const remainingFraction = Math.max(
    0.01,
    Math.min(1, overrides?.remainingFraction ?? weightGrams / Math.max(1, baseWholeWeightGrams))
  );
  const cutForm: MeatCutForm = overrides?.cutForm ?? tpl.defaultCutForm;
  const cutFormRu =
    overrides?.cutFormRu ??
    (cutForm === 'medallion' && tpl.preferredSliceRu
      ? tpl.preferredSliceRu
      : MEAT_CUT_FORM_NAMES_RU[cutForm]);
  const dimensionCm =
    overrides?.dimensionCm ?? estimateMeatDimensionCm(weightGrams, cutForm);
  const size: ProduceSizeTier = overrides?.size ?? inferSizeTierFromCm(dimensionCm);
  const sizeNameRu = overrides?.sizeNameRu ?? formatSizeNameRu(size, dimensionCm);

  return {
    baseItemId: overrides?.baseItemId ?? tpl.baseItemId,
    speciesId: overrides?.speciesId ?? tpl.speciesId,
    speciesNameRu: overrides?.speciesNameRu ?? tpl.speciesNameRu,
    meatCategory: overrides?.meatCategory ?? tpl.meatCategory,
    anatomicalPartRu: overrides?.anatomicalPartRu ?? tpl.anatomicalPartRu,
    juiciness: overrides?.juiciness ?? tpl.juiciness,
    fatContent: overrides?.fatContent ?? tpl.fatContent,
    weightGrams,
    baseWholeWeightGrams,
    remainingFraction,
    size,
    sizeNameRu,
    dimensionCm,
    cutForm,
    cutFormRu,
    hasBone: overrides?.hasBone ?? tpl.hasBone,
    hasSkin: overrides?.hasSkin ?? tpl.hasSkin,
    color: overrides?.color ?? tpl.color,
    colorNameRu: overrides?.colorNameRu ?? tpl.colorNameRu,
    fatColor: overrides?.fatColor ?? tpl.fatColor,
    cuttable: overrides?.cuttable ?? tpl.cuttable,
  };
}

export function buildMeatDisplayName(attrs: MeatAttributes, originalNameRu?: string): string {
  const tpl = resolveMeatTemplate(attrs.baseItemId);
  const isUntouchedDefault =
    tpl &&
    attrs.cutForm === tpl.defaultCutForm &&
    attrs.remainingFraction >= 0.99 &&
    attrs.hasBone === tpl.hasBone &&
    attrs.hasSkin === tpl.hasSkin;

  if (isUntouchedDefault && originalNameRu) {
    return originalNameRu;
  }

  const wLabel = formatMeatWeightLabel(attrs.weightGrams);
  const baseLabel =
    attrs.anatomicalPartRu.toLowerCase().includes(attrs.speciesNameRu.toLowerCase())
      ? attrs.anatomicalPartRu
      : `${attrs.speciesNameRu}: ${attrs.anatomicalPartRu.toLowerCase()}`;

  if (attrs.cuttable === false) {
    return `${baseLabel} (${wLabel})`;
  }

  if (attrs.cutForm === 'minced') {
    const label = tpl?.defaultCutForm === 'minced'
      ? `${attrs.anatomicalPartRu} (${attrs.speciesNameRu.toLowerCase()})`
      : `${baseLabel} · ${attrs.cutFormRu.toLowerCase()}`;
    return `${label} (${wLabel})`;
  }

  if (attrs.cutForm === 'fillet') {
    return `${baseLabel} · ${attrs.cutFormRu.toLowerCase()} (${wLabel})`;
  }

  if (attrs.cutForm === 'whole' && !attrs.hasSkin && tpl?.hasSkin) {
    return `${baseLabel} · очищ. (${wLabel})`;
  }

  return `${baseLabel} · ${attrs.cutFormRu.toLowerCase()} (${wLabel})`;
}

export function buildMeatDescriptionRu(attrs: MeatAttributes): string {
  const boneStr = attrs.hasBone ? 'на кости' : 'без кости';
  const skinStr = attrs.hasSkin ? ', с кожей/панцирем' : '';
  return `${attrs.speciesNameRu} (${attrs.anatomicalPartRu.toLowerCase()}) — ${attrs.cutFormRu.toLowerCase()}, ${boneStr}${skinStr}. Вес ~${formatMeatWeightLabel(attrs.weightGrams)}, размер ${attrs.sizeNameRu.toLowerCase()}, сочность ${attrs.juiciness}%, жирность ${attrs.fatContent}%.`;
}

export function applyMeatAttributesToItem(
  item: InventoryItem,
  overrides?: Partial<MeatAttributes>
): InventoryItem {
  const tpl = resolveMeatTemplate(item.itemId);
  if (!tpl) return item;

  const prev = item.meatAttributes;
  const oldWeightGrams = prev?.weightGrams ?? Math.max(1, Math.round((item.weight || tpl.defaultWeightGrams / 1000) * 1000));

  const basePrev: Partial<MeatAttributes> = prev ? { ...prev } : {};
  // Clear derived fields when weight/cutForm changes so they recompute cleanly
  if (overrides && (overrides.weightGrams !== undefined || overrides.cutForm !== undefined)) {
    if (overrides.dimensionCm === undefined) delete basePrev.dimensionCm;
    if (overrides.size === undefined) delete basePrev.size;
    if (overrides.sizeNameRu === undefined) delete basePrev.sizeNameRu;
    if (overrides.cutForm !== undefined && overrides.cutFormRu === undefined) {
      delete basePrev.cutFormRu;
    }
    if (overrides.weightGrams !== undefined && overrides.remainingFraction === undefined) {
      delete basePrev.remainingFraction;
    }
  }

  const merged = buildMeatAttributes(item.itemId, item.weight, {
    ...basePrev,
    ...overrides,
  });
  if (!merged) return item;

  const isModified =
    merged.cutForm !== tpl.defaultCutForm ||
    merged.remainingFraction < 0.99 ||
    merged.hasBone !== tpl.hasBone ||
    merged.hasSkin !== tpl.hasSkin;

  item.meatAttributes = merged;
  item.weight = Math.max(0.005, Number((merged.weightGrams / 1000).toFixed(3)));
  item.volume = Math.max(0.005, Number((item.weight * 0.95).toFixed(3)));

  if (isModified) {
    item.nameRu = buildMeatDisplayName(merged, item.nameRu);
    item.descriptionRu = buildMeatDescriptionRu(merged);
  }

  // Scale nutrition / effects / portions proportionally when cut to a different weight
  if (prev && oldWeightGrams > 0 && merged.weightGrams !== oldWeightGrams) {
    const ratio = merged.weightGrams / oldWeightGrams;
    if (item.effects) {
      if (typeof item.effects.hunger === 'number') {
        item.effects.hunger = Math.max(1, Math.round(item.effects.hunger * ratio));
      }
      if (typeof item.effects.energy === 'number') {
        item.effects.energy = Math.round(item.effects.energy * ratio);
      }
      if (typeof item.effects.health === 'number') {
        const scaledH = Math.round(item.effects.health * ratio);
        item.effects.health = item.effects.health < 0 ? Math.min(-1, scaledH) : scaledH;
      }
    }
    if (typeof item.portions === 'number') {
      item.portions = Math.max(1, Math.round(item.portions * ratio));
    }
    if (typeof item.maxPortions === 'number') {
      item.maxPortions = Math.max(item.portions || 1, Math.round(item.maxPortions * ratio));
    }
    if (item.nutrients) {
      item.nutrients = {
        calories: Math.max(1, Math.round(item.nutrients.calories * ratio)),
        proteins: Number((item.nutrients.proteins * ratio).toFixed(1)),
        fats: Number((item.nutrients.fats * ratio).toFixed(1)),
        carbs: Number((item.nutrients.carbs * ratio).toFixed(1)),
        sugars: Number((item.nutrients.sugars * ratio).toFixed(1)),
        ...(item.nutrients.fiber !== undefined ? { fiber: Number((item.nutrients.fiber * ratio).toFixed(1)) } : {}),
        ...(item.nutrients.salt !== undefined ? { salt: Number((item.nutrients.salt * ratio).toFixed(2)) } : {}),
        ...(item.nutrients.water !== undefined ? { water: Number((item.nutrients.water * ratio).toFixed(1)) } : {}),
      };
    }
    // Smaller cut pieces heat and cool faster
    if (typeof item.heatLossRate === 'number' && ratio < 1) {
      item.heatLossRate = Math.min(0.18, Number((item.heatLossRate * (1 + (1 - ratio) * 0.45)).toFixed(4)));
    }
  }

  return item;
}

// =============================================================================
// 3. SLOT-PERCENTAGE KNIFE CUTTING ENGINE FOR MEAT, POULTRY, FISH & SEAFOOD
// =============================================================================

function jitterRatio(nominal: number, applyJitter: boolean, maxDelta: number = 0.065): number {
  if (!applyJitter) return nominal;
  const tri = Math.random() + Math.random() - 1;
  return Math.max(0.04, Math.min(0.96, nominal + tri * maxDelta));
}

function copyThermalAndCookState(from: InventoryItem, to: InventoryItem): void {
  if (from.temperature !== undefined) to.temperature = from.temperature;
  if (from.surfaceTemperature !== undefined) to.surfaceTemperature = from.surfaceTemperature;
  if (from.cookProgress !== undefined) to.cookProgress = from.cookProgress;
  if (from.brownLevel !== undefined) to.brownLevel = from.brownLevel;
  if (from.charLevel !== undefined) to.charLevel = from.charLevel;
  if (from.cookMethod !== undefined) to.cookMethod = from.cookMethod;
  if (from.wetness !== undefined) to.wetness = from.wetness;
  if (from.soakedLiquidId !== undefined) to.soakedLiquidId = from.soakedLiquidId;
  if (from.soakedLiquidNameRu !== undefined) to.soakedLiquidNameRu = from.soakedLiquidNameRu;
  if (from.soakedColor !== undefined) to.soakedColor = from.soakedColor;
}

function cloneMeatForCut(
  source: InventoryItem,
  overrides: Partial<MeatAttributes>,
  uidSuffix: string
): InventoryItem {
  const copy: InventoryItem = JSON.parse(JSON.stringify(source));
  copy.id = `item_${source.itemId}_mcut_${Date.now()}_${uidSuffix}_${Math.random().toString(36).slice(2, 6)}`;
  copy.count = 1;
  copy.maxStack = 1;
  return applyMeatAttributesToItem(copy, overrides);
}

/**
 * Cuts ANY meat, poultry, fish, offal, or seafood item with a knife using the same
 * percentage dosage cells as liquid pouring & produce cutting:
 *
 * - Slot 0 ("Всё" / 100%):
 *   - Whole carcass / side / quarter / whole bird / whole fish / whole octopus -> full anatomical butchery
 *   - Bone-in thighs / drumsticks (whole) -> deboning (boneless fillet + bones)
 *   - Bone-in ribs (whole) -> separates rack into individual ribs
 *   - Shell-on seafood (shrimp / crab / mussels) -> peels/shells cleanly
 *   - Minced meat -> splits into patty portions (~250g)
 *   - Boneless cuts/fillets -> progresses stage: whole/chunk/half/fillet -> steaks -> medallions -> cubes -> minced
 *
 * - Partial cells (~92% .. ~8% in 4x4, ~50% in 2x2) with organic hand-cut variance:
 *   - Minced meat: splits off ~pct% + remainder ~(100-pct)% for exact-ish dosing
 *   - Whole fish: slices crosswise into fish steaks
 *   - Solid meat / poultry / fish / seafood:
 *     - >= 0.64 (~92%..~67%): cuts off proportional slab (~pct%) + smaller steak/slice
 *     - >= 0.45 (~58%..~45%, incl. 2x2 ~50%): splits in half
 *     - >= 0.30 (~42%..~33%): cuts into 3–4 steaks / portion cuts
 *     - >= 0.20 (~25%): cuts into 4 medallions / slices (or squid rings)
 *     - >= 0.12 (~17%): cuts into strips (stroganoff) or cubes (goulash / shashlik)
 *     - < 0.12 (~8%): finely chops with knife into hand-chopped mince / tartare
 */
export function computeKnifeCutForMeat(
  source: InventoryItem,
  dosageFraction: number,
  applyJitter: boolean,
  createCatalogItem: (itemId: string) => InventoryItem
): KnifeCutResult | null {
  const tpl = resolveMeatTemplate(source.itemId);
  if (!tpl || !tpl.cuttable) return null;

  const attrs = source.meatAttributes || buildMeatAttributes(source.itemId, source.weight);
  if (!attrs || attrs.cuttable === false) return null;

  // Ensure source clone carries initialized meatAttributes
  const ensuredSource: InventoryItem = source.meatAttributes
    ? source
    : { ...source, meatAttributes: attrs };

  const curW = attrs.weightGrams;
  if (curW < 15) return null;
  const pct = Math.round(dosageFraction * 100);

  const spawnSubPart = (id: string, customWeightGrams?: number): InventoryItem => {
    const it = createCatalogItem(id);
    copyThermalAndCookState(source, it);
    if (customWeightGrams !== undefined && it.meatAttributes) {
      applyMeatAttributesToItem(it, {
        weightGrams: Math.max(10, Math.round(customWeightGrams)),
      });
    }
    return it;
  };

  // --- SPECIAL 1: Whole carcasses, sides, quarters, whole birds, whole fish, whole octopus ---
  const isMammalCarcass = MAMMAL_SPECIES[tpl.speciesId] && ['carcass', 'side', 'quarter'].includes(tpl.suffix);
  const isBirdCarcass = BIRD_SPECIES[tpl.speciesId] && ['carcass_raw', 'carcass_dressed'].includes(tpl.suffix);
  const isWholeFish = FISH_SPECIES[tpl.speciesId] && tpl.suffix === 'whole';
  const isWholeOctopus = source.itemId === 'octopus_whole';

  if (isMammalCarcass && dosageFraction >= 0.999) {
    if (tpl.suffix === 'carcass') {
      return {
        outputs: [spawnSubPart(`${tpl.speciesId}_side`), spawnSubPart(`${tpl.speciesId}_side`)],
        title: `Разделка туши: ${tpl.speciesNameRu}`,
        subtitle: 'Слот «Всё» → 2 полутуши',
        actionLabel: 'Разделать тушу',
      };
    }
    if (tpl.suffix === 'side') {
      return {
        outputs: [spawnSubPart(`${tpl.speciesId}_quarter`), spawnSubPart(`${tpl.speciesId}_quarter`)],
        title: `Разделка полутуши: ${tpl.speciesNameRu}`,
        subtitle: 'Слот «Всё» → 2 четвертины',
        actionLabel: 'Разделать полутушу',
      };
    }
    const subCuts = [
      'tenderloin_huge',
      'brisket_large',
      'rump_large',
      'neck_medium',
      'ribs_medium',
      'liver',
      'bone_marrow',
      'tallow',
    ];
    return {
      outputs: subCuts.map((sc) => spawnSubPart(`${tpl.speciesId}_${sc}`)),
      title: `Обвалка четвертины: ${tpl.speciesNameRu}`,
      subtitle: 'Вырезка, грудинка, окорок, шея, рёбра, печень, кость, жир',
      actionLabel: 'Разделать на отрубы',
    };
  }

  if (isBirdCarcass && dosageFraction >= 0.999) {
    if (tpl.suffix === 'carcass_raw') {
      return {
        outputs: [
          spawnSubPart(`${tpl.speciesId}_carcass_dressed`),
          spawnSubPart(`${tpl.speciesId}_giblets`),
          spawnSubPart(`${tpl.speciesId}_necks_small`),
        ],
        title: `Потрошение птицы: ${tpl.speciesNameRu}`,
        subtitle: 'Потрошёная тушка, потроха и шея',
        actionLabel: 'Выпотрошить',
      };
    }
    return {
      outputs: [
        spawnSubPart(`${tpl.speciesId}_breast_large`),
        spawnSubPart(`${tpl.speciesId}_breast_large`),
        spawnSubPart(`${tpl.speciesId}_thighs_medium`),
        spawnSubPart(`${tpl.speciesId}_thighs_medium`),
        spawnSubPart(`${tpl.speciesId}_drumsticks_medium`),
        spawnSubPart(`${tpl.speciesId}_drumsticks_medium`),
        spawnSubPart(`${tpl.speciesId}_wings_small`),
        spawnSubPart(`${tpl.speciesId}_wings_small`),
        spawnSubPart(`${tpl.speciesId}_bones`),
      ],
      title: `Разделка птицы: ${tpl.speciesNameRu}`,
      subtitle: 'Грудки, бёдра, голени, крылышки и остов',
      actionLabel: 'Разделать птицу',
    };
  }

  if (isWholeFish) {
    if (dosageFraction >= 0.999) {
      return {
        outputs: [
          spawnSubPart(`${tpl.speciesId}_fillet`),
          spawnSubPart(`${tpl.speciesId}_fillet`),
          spawnSubPart(`${tpl.speciesId}_head`),
          spawnSubPart(`${tpl.speciesId}_skeleton`),
        ],
        title: `Филирование рыбы: ${tpl.speciesNameRu}`,
        subtitle: '2 филе, голова и хребет',
        actionLabel: 'Разделать на филе',
      };
    }
    // Partial cell on whole fish -> slice crosswise into fish steaks + head/tail remainder
    const steakCount = dosageFraction >= 0.45 ? 2 : dosageFraction >= 0.30 ? 3 : 4;
    const edibleW = Math.max(40, Math.round(curW * 0.72));
    const headW = Math.max(20, curW - edibleW);
    const outputs: InventoryItem[] = [];
    let rem = edibleW;
    for (let i = 0; i < steakCount; i++) {
      const w =
        i === steakCount - 1
          ? Math.max(15, rem)
          : Math.max(15, Math.round((edibleW / steakCount) * jitterRatio(1, applyJitter, 0.08)));
      rem = Math.max(15, rem - w);
      const steak = spawnSubPart(`${tpl.speciesId}_steak`, w);
      outputs.push(steak);
    }
    outputs.push(spawnSubPart(`${tpl.speciesId}_head`, headW));
    return {
      outputs,
      title: `Нарезка рыбы на стейки (~${pct}%): ${tpl.speciesNameRu}`,
      subtitle: `${steakCount} × стейк (~${formatMeatWeightLabel(Math.round(edibleW / steakCount))}) + голова`,
      actionLabel: 'Нарезать стейками',
    };
  }

  if (isWholeOctopus && dosageFraction >= 0.999) {
    const count = 3;
    const eachW = Math.max(80, Math.round((curW * 0.9) / count));
    return {
      outputs: Array.from({ length: count }, () => spawnSubPart('octopus_tentacles', eachW)),
      title: 'Разделка осьминога',
      subtitle: `Слот «Всё» → ${count} × щупальца осьминога (~${formatMeatWeightLabel(eachW)})`,
      actionLabel: 'Разделать осьминога',
    };
  }

  // --- SPECIAL 2: Minced meat portioning ---
  if (attrs.cutForm === 'minced') {
    if (curW < 30) return null;
    if (dosageFraction >= 0.999) {
      if (curW < 120) return null;
      const portions = curW >= 800 ? 4 : curW >= 400 ? 3 : 2;
      const outputs: InventoryItem[] = [];
      let rem = curW;
      for (let i = 0; i < portions; i++) {
        const w =
          i === portions - 1
            ? Math.max(15, rem)
            : Math.max(15, Math.round((curW / portions) * jitterRatio(1, applyJitter, 0.07)));
        rem = Math.max(15, rem - w);
        outputs.push(
          cloneMeatForCut(
            ensuredSource,
            {
              cutForm: 'minced',
              cutFormRu: 'Порция фарша',
              weightGrams: w,
              remainingFraction: Math.max(0.01, w / Math.max(1, attrs.baseWholeWeightGrams)),
            },
            `mp${i}`
          )
        );
      }
      return {
        outputs,
        title: `Порционирование фарша: ${attrs.speciesNameRu}`,
        subtitle: `Слот «Всё» → ${portions} порций по ~${formatMeatWeightLabel(Math.round(curW / portions))}`,
        actionLabel: 'Разделить на порции',
      };
    }

    // Partial slot on minced meat: split off ~dosageFraction + remainder
    const share = jitterRatio(dosageFraction, applyJitter, 0.055);
    const partA = Math.max(10, Math.min(curW - 10, Math.round(curW * share)));
    const partB = Math.max(10, curW - partA);
    const outA = cloneMeatForCut(
      ensuredSource,
      {
        cutForm: 'minced',
        cutFormRu: 'Порция фарша',
        weightGrams: partA,
        remainingFraction: Math.max(0.01, partA / Math.max(1, attrs.baseWholeWeightGrams)),
      },
      'mA'
    );
    const outB = cloneMeatForCut(
      ensuredSource,
      {
        cutForm: 'minced',
        cutFormRu: 'Порция фарша',
        weightGrams: partB,
        remainingFraction: Math.max(0.01, partB / Math.max(1, attrs.baseWholeWeightGrams)),
      },
      'mB'
    );
    return {
      outputs: [outA, outB],
      title: `Отделение фарша (~${pct}%): ${attrs.speciesNameRu}`,
      subtitle: `${applyJitter ? '' : '~'}${formatMeatWeightLabel(partA)} + ${applyJitter ? '' : '~'}${formatMeatWeightLabel(partB)}`,
      actionLabel: 'Разделить фарш',
    };
  }

  // --- CASE A: Slot 0 ("Всё" / 100%) on solid meat / poultry / fish / seafood ---
  if (dosageFraction >= 0.999) {
    // 1. Shell-on seafood -> clean/shell
    if (attrs.hasSkin && ['shrimp_king', 'crab_legs', 'mussels_half_shell'].includes(source.itemId)) {
      const meatRatio = source.itemId === 'crab_legs' ? 0.58 : source.itemId === 'mussels_half_shell' ? 0.55 : 0.72;
      const cleanW = Math.max(15, Math.round(curW * jitterRatio(meatRatio, applyJitter, 0.03)));
      const cleaned = cloneMeatForCut(
        ensuredSource,
        {
          hasSkin: false,
          cutForm: 'fillet',
          cutFormRu: 'Очищенное мясо',
          weightGrams: cleanW,
          remainingFraction: Math.max(0.02, cleanW / Math.max(1, attrs.baseWholeWeightGrams)),
          juiciness: Math.min(100, attrs.juiciness + 3),
        },
        'clean'
      );
      return {
        outputs: [cleaned],
        title: `Очистка от панциря: ${attrs.speciesNameRu}`,
        subtitle: `Слот «Всё» → ${cleaned.nameRu}`,
        actionLabel: 'Очистить ножом',
      };
    }

    // 2. Bone-in poultry thighs / drumsticks (whole) -> debone into boneless fillet + bird bones
    if (
      BIRD_SPECIES[tpl.speciesId] &&
      (tpl.suffix === 'thighs_medium' || tpl.suffix === 'drumsticks_medium') &&
      attrs.hasBone &&
      attrs.cutForm === 'whole'
    ) {
      const meatRatio = tpl.suffix === 'thighs_medium' ? 0.78 : 0.70;
      const filletW = Math.max(20, Math.round(curW * jitterRatio(meatRatio, applyJitter, 0.03)));
      const boneW = Math.max(15, curW - filletW);
      const fillet = cloneMeatForCut(
        ensuredSource,
        {
          hasBone: false,
          hasSkin: false,
          cutForm: 'fillet',
          cutFormRu: 'Филе (без кости)',
          weightGrams: filletW,
          remainingFraction: Math.max(0.02, filletW / Math.max(1, attrs.baseWholeWeightGrams)),
          juiciness: Math.min(100, attrs.juiciness + 2),
        },
        'debone'
      );
      const bones = spawnSubPart(`${tpl.speciesId}_bones`, boneW);
      return {
        outputs: [fillet, bones],
        title: `Обвалка с кости: ${attrs.speciesNameRu}`,
        subtitle: `Филе без кости (${formatMeatWeightLabel(filletW)}) + кости (${formatMeatWeightLabel(boneW)})`,
        actionLabel: 'Снять мясо с кости',
      };
    }

    // 3. Bone-in ribs (whole) -> separate rack into individual ribs
    if (MAMMAL_SPECIES[tpl.speciesId] && tpl.suffix === 'ribs_medium' && attrs.cutForm === 'whole') {
      const ribCount = curW >= 1000 ? 4 : 3;
      const outputs: InventoryItem[] = [];
      let rem = curW;
      for (let i = 0; i < ribCount; i++) {
        const w =
          i === ribCount - 1
            ? Math.max(20, rem)
            : Math.max(20, Math.round((curW / ribCount) * jitterRatio(1, applyJitter, 0.08)));
        rem = Math.max(20, rem - w);
        outputs.push(
          cloneMeatForCut(
            ensuredSource,
            {
              cutForm: 'separated',
              cutFormRu: 'Отдельные рёбрышки',
              weightGrams: w,
              remainingFraction: Math.max(0.02, w / Math.max(1, attrs.baseWholeWeightGrams)),
            },
            `rib${i}`
          )
        );
      }
      return {
        outputs,
        title: `Разделка рёбер: ${attrs.speciesNameRu}`,
        subtitle: `Слот «Всё» → ${ribCount} порций рёбрышек (~${formatMeatWeightLabel(Math.round(curW / ribCount))})`,
        actionLabel: 'Разделить рёбра',
      };
    }

    // 4. Whole / chunk / half / fillet -> slice into steaks / portion cuts
    if (
      attrs.cutForm === 'whole' ||
      attrs.cutForm === 'chunk' ||
      attrs.cutForm === 'half' ||
      attrs.cutForm === 'fillet'
    ) {
      const pieceCount = curW >= 2000 ? 4 : curW >= 650 ? 3 : 2;
      const nextCut: MeatCutForm = source.itemId === 'squid_tubes' ? 'medallion' : 'steak';
      const nextCutRu =
        nextCut === 'medallion' && tpl.preferredSliceRu
          ? tpl.preferredSliceRu
          : MEAT_CUT_FORM_NAMES_RU[nextCut];
      const outputs: InventoryItem[] = [];
      let rem = curW;
      for (let i = 0; i < pieceCount; i++) {
        const w =
          i === pieceCount - 1
            ? Math.max(15, rem)
            : Math.max(15, Math.round((curW / pieceCount) * jitterRatio(1, applyJitter, 0.08)));
        rem = Math.max(15, rem - w);
        outputs.push(
          cloneMeatForCut(
            ensuredSource,
            {
              cutForm: nextCut,
              cutFormRu: nextCutRu,
              weightGrams: w,
              remainingFraction: Math.max(0.01, w / Math.max(1, attrs.baseWholeWeightGrams)),
              juiciness: Math.min(100, attrs.juiciness + 2),
            },
            `st${i}`
          )
        );
      }
      return {
        outputs,
        title: `Нарезка на порции: ${attrs.speciesNameRu}`,
        subtitle: `Слот «Всё» → ${pieceCount} × ${nextCutRu.toLowerCase()} (~${formatMeatWeightLabel(Math.round(curW / pieceCount))})`,
        actionLabel: nextCut === 'medallion' ? 'Нарезать кольцами' : 'Нарезать стейками',
      };
    }

    // 5. Steak / separated -> medallions or cubes
    if (attrs.cutForm === 'steak' || attrs.cutForm === 'separated') {
      const nextCut: MeatCutForm = attrs.hasBone ? 'cubes' : 'medallion';
      const nextCutRu =
        nextCut === 'medallion' && tpl.preferredSliceRu
          ? tpl.preferredSliceRu
          : MEAT_CUT_FORM_NAMES_RU[nextCut];
      const sliced = cloneMeatForCut(
        ensuredSource,
        {
          cutForm: nextCut,
          cutFormRu: nextCutRu,
          hasBone: false,
          weightGrams: attrs.hasBone ? Math.max(15, Math.round(curW * 0.82)) : curW,
          remainingFraction: attrs.remainingFraction * (attrs.hasBone ? 0.82 : 1),
          juiciness: Math.min(100, attrs.juiciness + 2),
        },
        'med'
      );
      return {
        outputs: [sliced],
        title: `Нарезка: ${attrs.speciesNameRu}`,
        subtitle: `Слот «Всё» → ${sliced.nameRu}`,
        actionLabel: 'Нарезать ножом',
      };
    }

    // 6. Medallion / strips -> cubes
    if (attrs.cutForm === 'medallion' || attrs.cutForm === 'strips') {
      const cubed = cloneMeatForCut(
        ensuredSource,
        {
          cutForm: 'cubes',
          cutFormRu: 'Кубики',
          hasBone: false,
          weightGrams: curW,
          remainingFraction: attrs.remainingFraction,
          juiciness: Math.min(100, attrs.juiciness + 2),
        },
        'cub'
      );
      return {
        outputs: [cubed],
        title: `Нарезка кубиками: ${attrs.speciesNameRu}`,
        subtitle: `Слот «Всё» → ${cubed.nameRu}`,
        actionLabel: 'Нарезать кубиками',
      };
    }

    // 7. Cubes -> hand-chopped mince / tartare
    if (attrs.cutForm === 'cubes') {
      const isFish = attrs.meatCategory === 'fish';
      const minced = cloneMeatForCut(
        ensuredSource,
        {
          cutForm: 'minced',
          cutFormRu: isFish ? 'Рубленый тартар' : 'Рубленый фарш',
          hasBone: false,
          hasSkin: false,
          weightGrams: curW,
          remainingFraction: attrs.remainingFraction,
          juiciness: Math.min(100, attrs.juiciness + 4),
        },
        'mince'
      );
      return {
        outputs: [minced],
        title: isFish ? `Рубка на тартар: ${attrs.speciesNameRu}` : `Рубка фарша ножом: ${attrs.speciesNameRu}`,
        subtitle: `Слот «Всё» → ${minced.nameRu}`,
        actionLabel: 'Нарубить ножом',
      };
    }
  }

  // --- CASE B: Partial Percentage Cells (~92% .. ~8% in 4x4, ~50% in 2x2) ---

  // 1. High fraction (~92%..~67%): Cut off a proportional large slab + smaller steak/chunk
  if (dosageFraction >= 0.64) {
    if (curW < 30) return null;
    const mainShare = jitterRatio(dosageFraction, applyJitter, 0.055);
    const bigW = Math.max(15, Math.min(curW - 15, Math.round(curW * mainShare)));
    const smallW = Math.max(15, curW - bigW);
    const bigCut: MeatCutForm = bigW / Math.max(1, attrs.baseWholeWeightGrams) >= 0.58 ? 'chunk' : 'half';
    const smallCut: MeatCutForm = smallW <= 450 ? 'steak' : 'chunk';

    const bigPiece = cloneMeatForCut(
      ensuredSource,
      {
        cutForm: bigCut,
        cutFormRu: bigCut === 'chunk' ? 'Отрезанный отруб' : 'Крупный кусок',
        weightGrams: bigW,
        remainingFraction: Math.max(0.01, bigW / Math.max(1, attrs.baseWholeWeightGrams)),
      },
      'big'
    );
    const smallPiece = cloneMeatForCut(
      ensuredSource,
      {
        cutForm: smallCut,
        cutFormRu: MEAT_CUT_FORM_NAMES_RU[smallCut],
        weightGrams: smallW,
        remainingFraction: Math.max(0.01, smallW / Math.max(1, attrs.baseWholeWeightGrams)),
        juiciness: Math.min(100, attrs.juiciness + 2),
      },
      'sm'
    );
    return {
      outputs: [bigPiece, smallPiece],
      title: `Отрезание куска (~${pct}%): ${attrs.speciesNameRu}`,
      subtitle: `${applyJitter ? '' : '~'}${formatMeatWeightLabel(bigW)} (${Math.round((bigW / curW) * 100)}%) + ${applyJitter ? '' : '~'}${formatMeatWeightLabel(smallW)} (${Math.round((smallW / curW) * 100)}%)`,
      actionLabel: 'Отрезать кусок',
    };
  }

  // 2. ~58%..~45% (includes slot 1 in 2x2 = ~50%): Split cleanly in half
  if (dosageFraction >= 0.45) {
    if (curW < 30) return null;
    const splitA = jitterRatio(dosageFraction, applyJitter, 0.065);
    const wA = Math.max(15, Math.min(curW - 15, Math.round(curW * splitA)));
    const wB = Math.max(15, curW - wA);
    const nextCut: MeatCutForm =
      attrs.cutForm === 'whole' || attrs.cutForm === 'fillet'
        ? curW <= 700
          ? 'steak'
          : 'half'
        : attrs.cutForm === 'half' || attrs.cutForm === 'chunk'
        ? 'steak'
        : attrs.cutForm === 'steak' || attrs.cutForm === 'separated'
        ? 'medallion'
        : attrs.cutForm === 'medallion' || attrs.cutForm === 'strips'
        ? 'cubes'
        : attrs.cutForm;
    const nextCutRu =
      nextCut === 'medallion' && tpl.preferredSliceRu
        ? tpl.preferredSliceRu
        : MEAT_CUT_FORM_NAMES_RU[nextCut];

    const pA = cloneMeatForCut(
      ensuredSource,
      {
        cutForm: nextCut,
        cutFormRu: nextCutRu,
        weightGrams: wA,
        remainingFraction: Math.max(0.01, wA / Math.max(1, attrs.baseWholeWeightGrams)),
        juiciness: Math.min(100, attrs.juiciness + 2),
      },
      'hA'
    );
    const pB = cloneMeatForCut(
      ensuredSource,
      {
        cutForm: nextCut,
        cutFormRu: nextCutRu,
        weightGrams: wB,
        remainingFraction: Math.max(0.01, wB / Math.max(1, attrs.baseWholeWeightGrams)),
        juiciness: Math.min(100, attrs.juiciness + 2),
      },
      'hB'
    );
    return {
      outputs: [pA, pB],
      title: `Разрез пополам (~${pct}%): ${attrs.speciesNameRu}`,
      subtitle: `${nextCutRu}: ${applyJitter ? '' : '~'}${formatMeatWeightLabel(wA)} + ${applyJitter ? '' : '~'}${formatMeatWeightLabel(wB)}`,
      actionLabel: 'Разрезать пополам',
    };
  }

  // 3. ~42%..~30%: Cut into 3–4 steaks / portion cuts
  if (dosageFraction >= 0.30) {
    if (curW < 45) return null;
    const count = dosageFraction >= 0.38 ? 3 : 4;
    const cutForm: MeatCutForm = 'steak';
    const cutFormRu = MEAT_CUT_FORM_NAMES_RU[cutForm];
    const outputs: InventoryItem[] = [];
    let rem = curW;
    for (let i = 0; i < count; i++) {
      const w =
        i === count - 1
          ? Math.max(15, rem)
          : Math.max(15, Math.min(rem - (count - 1 - i) * 15, Math.round((curW / count) * jitterRatio(1, applyJitter, 0.085))));
      rem = Math.max(15, rem - w);
      outputs.push(
        cloneMeatForCut(
          ensuredSource,
          {
            cutForm,
            cutFormRu,
            weightGrams: w,
            remainingFraction: Math.max(0.01, w / Math.max(1, attrs.baseWholeWeightGrams)),
            juiciness: Math.min(100, attrs.juiciness + 2),
          },
          `st${i}`
        )
      );
    }
    return {
      outputs,
      title: `Нарезка на ${count} стейка (~${pct}%): ${attrs.speciesNameRu}`,
      subtitle: `${count} × ${cutFormRu.toLowerCase()} (~${formatMeatWeightLabel(Math.round(curW / count))})`,
      actionLabel: 'Нарезать стейками',
    };
  }

  // 4. ~25%: Cut into 4 medallions / thin slices (or squid rings)
  if (dosageFraction >= 0.20) {
    if (curW < 40) return null;
    const count = Math.min(4, Math.max(2, Math.round(curW / Math.max(30, curW * 0.25))));
    const cutForm: MeatCutForm = 'medallion';
    const cutFormRu = tpl.preferredSliceRu || MEAT_CUT_FORM_NAMES_RU[cutForm];
    const outputs: InventoryItem[] = [];
    let rem = curW;
    for (let i = 0; i < count; i++) {
      const w =
        i === count - 1
          ? Math.max(12, rem)
          : Math.max(12, Math.min(rem - (count - 1 - i) * 12, Math.round((curW / count) * jitterRatio(1, applyJitter, 0.095))));
      rem = Math.max(12, rem - w);
      outputs.push(
        cloneMeatForCut(
          ensuredSource,
          {
            cutForm,
            cutFormRu,
            hasBone: false,
            weightGrams: w,
            remainingFraction: Math.max(0.01, w / Math.max(1, attrs.baseWholeWeightGrams)),
            juiciness: Math.min(100, attrs.juiciness + 3),
          },
          `md${i}`
        )
      );
    }
    return {
      outputs,
      title: `Тонкая нарезка (~${pct}%): ${attrs.speciesNameRu}`,
      subtitle: `${count} × ${cutFormRu.toLowerCase()} (~${formatMeatWeightLabel(Math.round(curW / count))})`,
      actionLabel: tpl.preferredSliceRu ? `Нарезать (${tpl.preferredSliceRu.toLowerCase()})` : 'Нарезать ломтиками',
    };
  }

  // 5. ~17%: Strips (stroganoff / wok) or cubes (goulash / shashlik)
  if (dosageFraction >= 0.12) {
    const cutForm: MeatCutForm = tpl.preferredFineCut;
    const cutFormRu = MEAT_CUT_FORM_NAMES_RU[cutForm];
    const portionCount = curW >= 300 ? 2 : 1;
    const edibleW = attrs.hasBone ? Math.max(15, Math.round(curW * 0.84)) : curW;
    const outputs: InventoryItem[] = [];
    let rem = edibleW;
    for (let i = 0; i < portionCount; i++) {
      const w =
        i === portionCount - 1
          ? Math.max(12, rem)
          : Math.max(12, Math.round((edibleW / portionCount) * jitterRatio(1, applyJitter, 0.08)));
      rem = Math.max(12, rem - w);
      outputs.push(
        cloneMeatForCut(
          ensuredSource,
          {
            cutForm,
            cutFormRu,
            hasBone: false,
            weightGrams: w,
            remainingFraction: Math.max(0.01, w / Math.max(1, attrs.baseWholeWeightGrams)),
            juiciness: Math.min(100, attrs.juiciness + 3),
          },
          `fc${i}`
        )
      );
    }
    return {
      outputs,
      title: `Мелкая нарезка (~${pct}%): ${attrs.speciesNameRu}`,
      subtitle: `${portionCount > 1 ? `${portionCount} порции · ` : ''}${cutFormRu} (${formatMeatWeightLabel(edibleW)})`,
      actionLabel: cutForm === 'strips' ? 'Нарезать соломкой' : 'Нарезать кубиками',
    };
  }

  // 6. ~8% (finest cell): Finely hand-chopped mince / tartare
  const isFish = attrs.meatCategory === 'fish';
  const edibleW = attrs.hasBone ? Math.max(15, Math.round(curW * 0.80)) : curW;
  const fineRu = isFish ? 'Рубленый тартар' : 'Рубленый фарш';
  const mincedPiece = cloneMeatForCut(
    ensuredSource,
    {
      cutForm: 'minced',
      cutFormRu: fineRu,
      hasBone: false,
      hasSkin: false,
      weightGrams: edibleW,
      remainingFraction: Math.max(0.01, edibleW / Math.max(1, attrs.baseWholeWeightGrams)),
      juiciness: Math.min(100, attrs.juiciness + 5),
    },
    'chop'
  );
  return {
    outputs: [mincedPiece],
    title: isFish ? `Рубка на тартар (~${pct}%): ${attrs.speciesNameRu}` : `Мелкая рубка (~${pct}%): ${attrs.speciesNameRu}`,
    subtitle: `${fineRu} (${formatMeatWeightLabel(edibleW)})`,
    actionLabel: isFish ? 'Нарубить тартар' : 'Нарубить фарш ножом',
  };
}

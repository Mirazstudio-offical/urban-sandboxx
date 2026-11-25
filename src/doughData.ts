import {
  DoughAttributes,
  DoughConsistency,
  DoughCookState,
  DoughFillingEntry,
  DoughIngredientEntry,
  DoughShape,
  DoughType,
  InventoryItem,
  RollingPinAttributes,
  RollingPinModel,
  RollingPinPattern,
  RollingPinShape,
} from './types';

// ============================================================================
// 1. ROLLING PIN PRESETS & BUILDERS (Скалка с атрибутами формы, модели, узора)
// ============================================================================

export const ROLLING_PIN_PRESETS: Record<RollingPinModel, RollingPinAttributes> = {
  classic_handles: {
    modelId: 'classic_handles',
    modelNameRu: 'Классическая с вращающимися ручками',
    shape: 'cylindrical_handles',
    shapeNameRu: 'Цилиндр с ручками',
    material: 'beech_wood',
    materialRu: 'Массив бука',
    color: '#d4a373',
    colorNameRu: 'Тёплый натуральный бук',
    accentColor: '#9c6644',
    pattern: 'wood_grain',
    patternNameRu: 'Натуральная текстура древесины',
    patternColor: '#b07d50',
    embossPatternOnDough: false,
    lengthCm: 44,
    diameterMm: 52,
    handleStyleRu: 'Точёные вращающиеся ручки на стальной оси',
    rollingEfficiency: 1.0,
  },
  french_tapered: {
    modelId: 'french_tapered',
    modelNameRu: 'Французская конусная',
    shape: 'tapered_french',
    shapeNameRu: 'Конусная цельная без ручек',
    material: 'walnut_wood',
    materialRu: 'Массив тёмного ореха',
    color: '#7f5539',
    colorNameRu: 'Тёмный орех',
    accentColor: '#582f0e',
    pattern: 'wood_grain',
    patternNameRu: 'Волокна ореха (ручная полировка)',
    patternColor: '#5c3a21',
    embossPatternOnDough: false,
    lengthCm: 48,
    diameterMm: 44,
    handleStyleRu: 'Плавные зауженные концы без ручек',
    rollingEfficiency: 1.12,
  },
  straight_dowel: {
    modelId: 'straight_dowel',
    modelNameRu: 'Прямая скалка-валик',
    shape: 'straight_cylinder',
    shapeNameRu: 'Прямой цилиндр',
    material: 'birch_wood',
    materialRu: 'Карельская берёза',
    color: '#e6ccb2',
    colorNameRu: 'Светлая берёза',
    accentColor: '#ddb892',
    pattern: 'none',
    patternNameRu: 'Гладкая шлифовка',
    embossPatternOnDough: false,
    lengthCm: 40,
    diameterMm: 38,
    handleStyleRu: 'Цельный гладкий валик',
    rollingEfficiency: 0.96,
  },
  marble_heavy: {
    modelId: 'marble_heavy',
    modelNameRu: 'Тяжёлая кондитерская мраморная',
    shape: 'cylindrical_handles',
    shapeNameRu: 'Тяжёлый цилиндр с ручками',
    material: 'marble',
    materialRu: 'Натуральный белый мрамор',
    color: '#e5e7eb',
    colorNameRu: 'Бело-серый мрамор',
    accentColor: '#78350f',
    pattern: 'marble_veins',
    patternNameRu: 'Природные мраморные прожилки',
    patternColor: '#9ca3af',
    embossPatternOnDough: false,
    lengthCm: 46,
    diameterMm: 60,
    handleStyleRu: 'Массивные деревянные ручки на подшипниках',
    rollingEfficiency: 1.32,
  },
  silicone_nonstick: {
    modelId: 'silicone_nonstick',
    modelNameRu: 'Силиконовая антипригарная',
    shape: 'stepped_rings',
    shapeNameRu: 'Цилиндр с кольцами-ограничителями',
    material: 'silicone',
    materialRu: 'Пищевой силикон и сталь',
    color: '#38bdf8',
    colorNameRu: 'Небесно-голубой силикон',
    accentColor: '#f8fafc',
    pattern: 'pastel_speckle',
    patternNameRu: 'Матовое антипригарное покрытие',
    patternColor: '#0284c7',
    embossPatternOnDough: false,
    lengthCm: 42,
    diameterMm: 50,
    handleStyleRu: 'Эргономичные ручки со съёмными кольцами толщины',
    rollingEfficiency: 1.08,
  },
  textured_carved: {
    modelId: 'textured_carved',
    modelNameRu: 'Резная узорная (для пряников и печенья)',
    shape: 'cylindrical_handles',
    shapeNameRu: 'Рельефный цилиндр с ручками',
    material: 'oak_wood',
    materialRu: 'Выдержанный дуб с лазерной резьбой',
    color: '#b08968',
    colorNameRu: 'Медовый дуб',
    accentColor: '#6f4e37',
    pattern: 'carved_floral',
    patternNameRu: 'Резной цветочный орнамент',
    patternColor: '#5c3a21',
    embossPatternOnDough: true,
    lengthCm: 38,
    diameterMm: 48,
    handleStyleRu: 'Укороченные точёные ручки',
    rollingEfficiency: 0.92,
  },
  mini_pastry: {
    modelId: 'mini_pastry',
    modelNameRu: 'Мини-скалка для пельменей и вареников',
    shape: 'mini_dowel',
    shapeNameRu: 'Короткая тонкая палочка',
    material: 'beech_wood',
    materialRu: 'Полированный бук',
    color: '#deb887',
    colorNameRu: 'Светло-золотистый бук',
    accentColor: '#a47148',
    pattern: 'wood_grain',
    patternNameRu: 'Тонкие волокна бука',
    patternColor: '#b5835a',
    embossPatternOnDough: false,
    lengthCm: 24,
    diameterMm: 28,
    handleStyleRu: 'Компактный цельный стержень',
    rollingEfficiency: 0.85,
  },
};

export function buildRollingPinAttributes(
  overrides?: Partial<RollingPinAttributes>
): RollingPinAttributes {
  const modelKey: RollingPinModel =
    overrides?.modelId && ROLLING_PIN_PRESETS[overrides.modelId]
      ? overrides.modelId
      : 'classic_handles';
  const base = ROLLING_PIN_PRESETS[modelKey];
  return {
    ...base,
    ...(overrides || {}),
  };
}

export function applyRollingPinAttributesToItem(
  item: InventoryItem,
  overrides?: Partial<RollingPinAttributes>
): InventoryItem {
  const switchingModel = Boolean(
    overrides?.modelId &&
      ROLLING_PIN_PRESETS[overrides.modelId] &&
      item.rollingPinAttributes?.modelId !== overrides.modelId
  );
  const attrs = buildRollingPinAttributes(
    switchingModel
      ? { ...(overrides || {}) }
      : { ...(item.rollingPinAttributes || {}), ...(overrides || {}) }
  );
  item.rollingPinAttributes = attrs;
  item.nameRu = `Скалка (${attrs.modelNameRu.toLowerCase()})`;
  item.descriptionRu = `${attrs.modelNameRu}. Материал: ${attrs.materialRu}, форма: ${attrs.shapeNameRu.toLowerCase()}, длина ${attrs.lengthCm} см, диаметр ${attrs.diameterMm} мм. Узор: ${attrs.patternNameRu.toLowerCase()}. Положите рядом с тестом в сетке взаимодействия для раскатки.`;
  item.weight =
    attrs.material === 'marble'
      ? 1.45
      : attrs.material === 'stainless_steel'
      ? 0.95
      : attrs.modelId === 'mini_pastry'
      ? 0.16
      : 0.42;
  item.volume = attrs.modelId === 'mini_pastry' ? 0.16 : 0.45;
  item.usable = false;
  return item;
}

export function isRollingPinItem(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  return item.itemId === 'rolling_pin' || Boolean(item.rollingPinAttributes);
}

// ============================================================================
// 2. COLOR & NUTRIENT UTILITIES
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#f5ead6').replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 245,
      parseInt(clean[1] + clean[1], 16) || 234,
      parseInt(clean[2] + clean[2], 16) || 214,
    ];
  }
  const num = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(num)) return [245, 234, 214];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function blendHexColors(
  samples: Array<{ hex: string; weight: number }>
): string {
  let wSum = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  for (const s of samples) {
    const w = Math.max(0.01, s.weight);
    const [r, g, b] = hexToRgb(s.hex);
    rSum += r * w;
    gSum += g * w;
    bSum += b * w;
    wSum += w;
  }
  if (wSum <= 0) return '#f5ead6';
  return rgbToHex(rSum / wSum, gSum / wSum, bSum / wSum);
}

export function describeDoughColorRu(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 510;
  const sat = max === min ? 0 : (max - min) / (l > 0.5 ? 510 - max - min : max + min);

  if (l < 0.24) return 'Тёмно-шоколадное';
  if (l < 0.42 && r > g && g >= b) return r - b > 35 ? 'Шоколадно-коричневое' : 'Тёмно-ржаное';
  if (g > r + 12 && g > b + 12) return l > 0.65 ? 'Светло-зелёное (травяное)' : 'Шпинатно-зелёное';
  if (r > g + 28 && b > g + 5) return l > 0.62 ? 'Розово-ягодное' : 'Рубиново-свекольное';
  if (r > g + 28 && g > b + 14) return l > 0.68 ? 'Персиково-морковное' : 'Янтарно-оранжевое';
  if (l > 0.92 && sat < 0.22) return 'Белоснежное';
  if (r > 220 && g > 195 && b < 145) return 'Золотисто-жёлтое';
  if (r > 235 && g > 218 && b < 185) return 'Сливочно-золотистое';
  if (l > 0.82 && r >= g && g >= b) return 'Кремово-белое';
  if (l > 0.65 && r > g && g > b) return 'Пшенично-бежевое';
  if (l >= 0.42 && r > g) return 'Ржано-бежевое';
  if (b > r + 15 && b > g + 10) return 'Чернично-сиреневое';
  return 'Кремовое натуральное';
}

// ============================================================================
// 3. INGREDIENT CLASSIFICATION (ANY SUITABLE INGREDIENTS IN ANY PROPORTION)
// ============================================================================

export interface DoughIngredientProfile {
  role: DoughIngredientEntry['role'];
  /** Effective water contribution per 100g (0..100) */
  waterPct: number;
  /** Flour/starch solid binding contribution per 100g (0..100) */
  flourPct: number;
  /** Fat contribution per 100g (0..100) */
  fatPct: number;
  /** Sugar/sweetener contribution per 100g (0..100) */
  sugarPct: number;
  /** Salt contribution per 100g (0..100) */
  saltPct: number;
  /** Egg contribution per 100g (0..100) */
  eggPct: number;
  /** Leavening / fermentation boost per 100g of ingredient */
  leaveningPower: number;
  /** Gluten / elasticity modifier (-20..+30) */
  glutenFactor: number;
  /** Visual color hex & pigment strength */
  colorHex: string;
  pigmentStrength: number;
  /** Optional visible flecks in dough */
  fleckColor?: string;
  /** Optional short flavor note */
  flavorNoteRu?: string;
  /** Special subtype hint */
  flourKind?: 'wheat' | 'rye' | 'corn' | 'rice' | 'oat' | 'starch' | 'cottage' | 'potato';
}

const LIQUID_DOUGH_PROFILES: Record<string, DoughIngredientProfile> = {
  water: { role: 'liquid', waterPct: 100, flourPct: 0, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 6, colorHex: '#f8fafc', pigmentStrength: 0.12 },
  milk: { role: 'dairy', waterPct: 87, flourPct: 0, fatPct: 3.5, sugarPct: 4.5, saltPct: 0, eggPct: 0, leaveningPower: 4, glutenFactor: 8, colorHex: '#fffbeb', pigmentStrength: 0.35 },
  coconut_milk: { role: 'dairy', waterPct: 76, flourPct: 0, fatPct: 19, sugarPct: 3, saltPct: 0, eggPct: 0, leaveningPower: 2, glutenFactor: 4, colorHex: '#fafaf9', pigmentStrength: 0.4, flavorNoteRu: 'с кокосом' },
  kefir: { role: 'leavening', waterPct: 88, flourPct: 0, fatPct: 2.5, sugarPct: 4, saltPct: 0, eggPct: 0, leaveningPower: 48, glutenFactor: 10, colorHex: '#fffdf5', pigmentStrength: 0.35 },
  prostokvasha: { role: 'leavening', waterPct: 87, flourPct: 0, fatPct: 3.2, sugarPct: 4, saltPct: 0, eggPct: 0, leaveningPower: 52, glutenFactor: 10, colorHex: '#fefce8', pigmentStrength: 0.35 },
  sour_cream: { role: 'dairy', waterPct: 68, flourPct: 0, fatPct: 20, sugarPct: 3, saltPct: 0, eggPct: 0, leaveningPower: 34, glutenFactor: 6, colorHex: '#fefce8', pigmentStrength: 0.42 },
  sourdough: { role: 'leavening', waterPct: 55, flourPct: 45, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 95, glutenFactor: 18, colorHex: '#efe6d0', pigmentStrength: 0.65, flavorNoteRu: 'на закваске' },
  beer: { role: 'leavening', waterPct: 92, flourPct: 0, fatPct: 0, sugarPct: 3, saltPct: 0, eggPct: 0, leaveningPower: 62, glutenFactor: 8, colorHex: '#d97706', pigmentStrength: 0.48, flavorNoteRu: 'на пиве' },
  kvas: { role: 'leavening', waterPct: 91, flourPct: 0, fatPct: 0, sugarPct: 6, saltPct: 0, eggPct: 0, leaveningPower: 58, glutenFactor: 6, colorHex: '#92400e', pigmentStrength: 0.65, flavorNoteRu: 'на квасе' },
  broth: { role: 'liquid', waterPct: 96, flourPct: 0, fatPct: 2, sugarPct: 0, saltPct: 1.5, eggPct: 0, leaveningPower: 0, glutenFactor: 6, colorHex: '#eab308', pigmentStrength: 0.35, flavorNoteRu: 'на бульоне' },
  oil_culinary: { role: 'fat', waterPct: 0, flourPct: 0, fatPct: 100, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -4, colorHex: '#facc15', pigmentStrength: 0.38 },
  oil_sunflower: { role: 'fat', waterPct: 0, flourPct: 0, fatPct: 100, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -4, colorHex: '#fde047', pigmentStrength: 0.35 },
  oil_olive: { role: 'fat', waterPct: 0, flourPct: 0, fatPct: 100, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -3, colorHex: '#a3e635', pigmentStrength: 0.42, flavorNoteRu: 'на оливковом масле' },
  ghee: { role: 'fat', waterPct: 0, flourPct: 0, fatPct: 99, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -6, colorHex: '#f59e0b', pigmentStrength: 0.52, flavorNoteRu: 'на топлёном масле' },
  rendered_fat: { role: 'fat', waterPct: 0, flourPct: 0, fatPct: 98, sugarPct: 0, saltPct: 0.5, eggPct: 0, leaveningPower: 0, glutenFactor: -6, colorHex: '#fef3c7', pigmentStrength: 0.35 },
  honey: { role: 'sugar', waterPct: 18, flourPct: 0, fatPct: 0, sugarPct: 82, saltPct: 0, eggPct: 0, leaveningPower: 5, glutenFactor: -2, colorHex: '#d97706', pigmentStrength: 0.65, flavorNoteRu: 'медовое' },
  syrup: { role: 'sugar', waterPct: 28, flourPct: 0, fatPct: 0, sugarPct: 72, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -2, colorHex: '#b45309', pigmentStrength: 0.58 },
  syrup_sweet: { role: 'sugar', waterPct: 28, flourPct: 0, fatPct: 0, sugarPct: 72, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -2, colorHex: '#b45309', pigmentStrength: 0.58 },
  wine: { role: 'liquid', waterPct: 86, flourPct: 0, fatPct: 0, sugarPct: 5, saltPct: 0, eggPct: 0, leaveningPower: 18, glutenFactor: 4, colorHex: '#9f1239', pigmentStrength: 0.95, flavorNoteRu: 'на вине' },
  cottage_cheese: { role: 'dairy', waterPct: 62, flourPct: 32, fatPct: 9, sugarPct: 3, saltPct: 0.3, eggPct: 0, leaveningPower: 14, glutenFactor: 4, colorHex: '#fffdf7', pigmentStrength: 0.55, flourKind: 'cottage', flavorNoteRu: 'творожное' },
  dairy_fermented: { role: 'leavening', waterPct: 84, flourPct: 4, fatPct: 5, sugarPct: 4, saltPct: 0.2, eggPct: 0, leaveningPower: 42, glutenFactor: 8, colorHex: '#fffdf5', pigmentStrength: 0.42 },
  botanical_extract: { role: 'flavor', waterPct: 65, flourPct: 0, fatPct: 0, sugarPct: 8, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#78350f', pigmentStrength: 0.45, flavorNoteRu: 'с ванилью' },
  food_acid: { role: 'leavening', waterPct: 0, flourPct: 0, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 65, glutenFactor: 4, colorHex: '#f8fafc', pigmentStrength: 0.05 },
  condensed_milk: { role: 'sugar', waterPct: 27, flourPct: 0, fatPct: 8.5, sugarPct: 55, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#fef08a', pigmentStrength: 0.45, flavorNoteRu: 'со сгущёнкой' },
  jam: { role: 'sugar', waterPct: 35, flourPct: 0, fatPct: 0, sugarPct: 62, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -3, colorHex: '#be123c', pigmentStrength: 1.15, fleckColor: '#881337', flavorNoteRu: 'с вареньем' },
  juice: { role: 'liquid', waterPct: 88, flourPct: 0, fatPct: 0, sugarPct: 11, saltPct: 0, eggPct: 0, leaveningPower: 4, glutenFactor: 4, colorHex: '#fb923c', pigmentStrength: 0.85, flavorNoteRu: 'на соке' },
  coffee: { role: 'liquid', waterPct: 98, flourPct: 0, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 4, colorHex: '#5c3317', pigmentStrength: 1.1, flavorNoteRu: 'кофейное' },
  tea: { role: 'liquid', waterPct: 99, flourPct: 0, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 4, colorHex: '#b45309', pigmentStrength: 0.65, flavorNoteRu: 'на чае' },
  puree: { role: 'colorant', waterPct: 80, flourPct: 8, fatPct: 0, sugarPct: 8, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 2, colorHex: '#f59e0b', pigmentStrength: 1.1 },
  sauce: { role: 'flavor', waterPct: 65, flourPct: 0, fatPct: 15, sugarPct: 5, saltPct: 3, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#dc2626', pigmentStrength: 1.0 },
  soy_sauce: { role: 'salt', waterPct: 78, flourPct: 0, fatPct: 0, sugarPct: 2, saltPct: 14, eggPct: 0, leaveningPower: 0, glutenFactor: 2, colorHex: '#451a03', pigmentStrength: 1.25 },
  vinegar: { role: 'leavening', waterPct: 94, flourPct: 0, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 25, glutenFactor: 4, colorHex: '#fefce8', pigmentStrength: 0.1 },
  cocoa: { role: 'colorant', waterPct: 0, flourPct: 60, fatPct: 14, sugarPct: 8, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -4, colorHex: '#4a2511', pigmentStrength: 2.8, fleckColor: '#3b1d0d', flavorNoteRu: 'шоколадное' },
  flour: { role: 'flour', waterPct: 0, flourPct: 100, fatPct: 1, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 22, colorHex: '#f6eedb', pigmentStrength: 1.0, flourKind: 'wheat' },
  flour_wheat: { role: 'flour', waterPct: 0, flourPct: 100, fatPct: 1, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 24, colorHex: '#f6eedb', pigmentStrength: 1.0, flourKind: 'wheat' },
  flour_rye: { role: 'flour', waterPct: 0, flourPct: 100, fatPct: 1.5, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 6, glutenFactor: 10, colorHex: '#a18262', pigmentStrength: 1.45, fleckColor: '#6b4f35', flourKind: 'rye' },
  grain_rye: { role: 'flour', waterPct: 0, flourPct: 94, fatPct: 1.5, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 6, glutenFactor: 10, colorHex: '#a18262', pigmentStrength: 1.45, fleckColor: '#6b4f35', flourKind: 'rye' },
  flour_corn: { role: 'flour', waterPct: 0, flourPct: 100, fatPct: 3.5, sugarPct: 1, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 4, colorHex: '#f2c94c', pigmentStrength: 1.55, fleckColor: '#d97706', flourKind: 'corn' },
  corn_grits: { role: 'flour', waterPct: 0, flourPct: 92, fatPct: 3.5, sugarPct: 1, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 4, colorHex: '#f2c94c', pigmentStrength: 1.5, fleckColor: '#d97706', flourKind: 'corn' },
  buckwheat: { role: 'flour', waterPct: 0, flourPct: 88, fatPct: 3.0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 4, colorHex: '#8d6e53', pigmentStrength: 1.5, fleckColor: '#5c4028', flourKind: 'rye', flavorNoteRu: 'гречневое' },
  flour_rice: { role: 'flour', waterPct: 0, flourPct: 100, fatPct: 0.8, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 6, colorHex: '#fafaf9', pigmentStrength: 1.15, flourKind: 'rice' },
  starch_corn: { role: 'starch', waterPct: 0, flourPct: 92, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -6, colorHex: '#ffffff', pigmentStrength: 1.1, flourKind: 'starch' },
  semolina_wheat: { role: 'flour', waterPct: 0, flourPct: 95, fatPct: 1, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 18, colorHex: '#f5e1a4', pigmentStrength: 1.1, flourKind: 'wheat' },
  grain_oats: { role: 'flour', waterPct: 0, flourPct: 88, fatPct: 6, sugarPct: 1, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 6, colorHex: '#e2d2b5', pigmentStrength: 1.15, fleckColor: '#a8906e', flourKind: 'oat', flavorNoteRu: 'овсяное' },
  sugar: { role: 'sugar', waterPct: 0, flourPct: 0, fatPct: 0, sugarPct: 100, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -4, colorHex: '#ffffff', pigmentStrength: 0.15 },
  salt: { role: 'salt', waterPct: 0, flourPct: 0, fatPct: 0, sugarPct: 0, saltPct: 100, eggPct: 0, leaveningPower: 0, glutenFactor: 8, colorHex: '#f8fafc', pigmentStrength: 0.08 },
};

/**
 * Classifies a liquid ID or dry-form fluidStorage ID for dough kneading.
 */
export function getFluidDoughProfile(
  liquidId: string | null | undefined,
  origCatalogId?: string | null,
  customColor?: string | null,
  varietyRu?: string | null
): DoughIngredientProfile | null {
  const orig = (origCatalogId || '').toLowerCase();
  const lid = (liquidId || '').toLowerCase();
  const varLow = (varietyRu || '').toLowerCase();

  let base: DoughIngredientProfile | null = null;
  if (orig.includes('flour_rye') || varLow.includes('ржан')) base = LIQUID_DOUGH_PROFILES.flour_rye;
  else if (orig.includes('flour_corn') || varLow.includes('кукуруз')) base = LIQUID_DOUGH_PROFILES.flour_corn;
  else if (orig.includes('flour_rice') || varLow.includes('рисов')) base = LIQUID_DOUGH_PROFILES.flour_rice;
  else if (orig.includes('starch') || varLow.includes('крахмал')) base = LIQUID_DOUGH_PROFILES.starch_corn;
  else if (orig.includes('semolina') || varLow.includes('манн')) base = LIQUID_DOUGH_PROFILES.semolina_wheat;
  else if (orig.includes('grain_oats') || varLow.includes('овсян') || varLow.includes('геркулес')) base = LIQUID_DOUGH_PROFILES.grain_oats;
  else if (orig.includes('flour') || varLow.includes('мука')) base = LIQUID_DOUGH_PROFILES.flour_wheat;
  else if (orig.includes('cottage_cheese') || varLow.includes('творог')) base = LIQUID_DOUGH_PROFILES.cottage_cheese;
  else if (orig.includes('kefir') || varLow.includes('кефир')) base = LIQUID_DOUGH_PROFILES.kefir;
  else if (orig.includes('sour_cream') || varLow.includes('сметан')) base = LIQUID_DOUGH_PROFILES.sour_cream;
  else if (orig.includes('ghee') || varLow.includes('гхи') || varLow.includes('топлен')) base = LIQUID_DOUGH_PROFILES.ghee;
  else if (orig.includes('coconut_milk') || varLow.includes('кокосов')) base = LIQUID_DOUGH_PROFILES.coconut_milk;
  else if (orig.includes('cocoa') || varLow.includes('какао')) base = LIQUID_DOUGH_PROFILES.cocoa;
  else if (orig.includes('oil_olive') || varLow.includes('оливк')) base = LIQUID_DOUGH_PROFILES.oil_olive;
  else if (orig.includes('sugar') || lid === 'sugar' || varLow.includes('сахар')) base = LIQUID_DOUGH_PROFILES.sugar;
  else if (orig.includes('salt') || lid === 'salt' || varLow.includes('соль')) base = LIQUID_DOUGH_PROFILES.salt;
  else if (LIQUID_DOUGH_PROFILES[lid]) base = LIQUID_DOUGH_PROFILES[lid];
  else if (lid === 'grain' || lid === 'flour') base = LIQUID_DOUGH_PROFILES.flour_wheat;

  if (!base) return null;
  const allowCustomColor =
    Boolean(customColor) &&
    lid !== 'water' &&
    lid !== 'flour' &&
    lid !== 'sugar' &&
    lid !== 'salt' &&
    lid !== 'milk' &&
    base.role !== 'flour' &&
    base.role !== 'starch' &&
    base.role !== 'salt' &&
    base.pigmentStrength >= 0.55;
  if (allowCustomColor && customColor) {
    return { ...base, colorHex: customColor };
  }
  return base;
}

/**
 * Classifies a solid/discrete InventoryItem for dough kneading (if suitable as a dough ingredient).
 * Returns null if the item is not suitable for kneading into dough (e.g. tools, non-food, raw meat cuts).
 */
export function getSolidDoughProfile(item: InventoryItem | null | undefined): DoughIngredientProfile | null {
  if (!item || item.category !== 'food' && item.category !== 'drink') return null;
  if (item.itemId === 'dough' || item.doughAttributes) return null;
  // Raw meat/fish are fillings, not dough kneading bases
  if (item.meatAttributes) return null;

  const id = (item.originalCatalogId || item.itemId || '').toLowerCase();
  const name = (item.nameRu || '').toLowerCase();

  if (id.includes('flour_rye') || name.includes('мука ржан')) return LIQUID_DOUGH_PROFILES.flour_rye;
  if (id.includes('flour_corn') || name.includes('мука кукуруз')) return LIQUID_DOUGH_PROFILES.flour_corn;
  if (id.includes('flour_rice') || name.includes('мука рисов')) return LIQUID_DOUGH_PROFILES.flour_rice;
  if (id.includes('flour') || name.includes('мука')) return LIQUID_DOUGH_PROFILES.flour_wheat;
  if (id.includes('starch') || name.includes('крахмал')) return LIQUID_DOUGH_PROFILES.starch_corn;
  if (id.includes('semolina') || name.includes('манн')) return LIQUID_DOUGH_PROFILES.semolina_wheat;
  if (id.includes('grain_oats') || name.includes('овсян') || name.includes('геркулес')) return LIQUID_DOUGH_PROFILES.grain_oats;

  if (id.includes('egg') || name.includes('яйц')) {
    return {
      role: 'egg',
      waterPct: 74,
      flourPct: 0,
      fatPct: 11,
      sugarPct: 0,
      saltPct: 0.4,
      eggPct: 100,
      leaveningPower: 22,
      glutenFactor: 16,
      colorHex: '#f59e0b',
      pigmentStrength: 1.35,
    };
  }
  if (id.includes('ghee') || name.includes('гхи') || name.includes('топлен')) {
    return LIQUID_DOUGH_PROFILES.ghee;
  }
  if (id.includes('butter') || name.includes('масло сливоч')) {
    return {
      role: 'fat',
      waterPct: 16,
      flourPct: 0,
      fatPct: 82.5,
      sugarPct: 0,
      saltPct: 0.6,
      eggPct: 0,
      leaveningPower: 6,
      glutenFactor: -5,
      colorHex: '#fde047',
      pigmentStrength: 0.85,
      flavorNoteRu: 'сливочное',
    };
  }
  if (id.includes('cottage_cheese') || name.includes('творог')) {
    return {
      role: 'dairy',
      waterPct: 62,
      flourPct: 32,
      fatPct: 9,
      sugarPct: 3,
      saltPct: 0.3,
      eggPct: 0,
      leaveningPower: 14,
      glutenFactor: 4,
      colorHex: '#fefce8',
      pigmentStrength: 0.85,
      fleckColor: '#ffffff',
      flavorNoteRu: 'творожное',
      flourKind: 'cottage',
    };
  }
  if (id.includes('sour_cream') || name.includes('сметан')) {
    return LIQUID_DOUGH_PROFILES.sour_cream;
  }
  if (id.includes('cheese') || name.includes('сыр')) {
    return {
      role: 'flavor',
      waterPct: 38,
      flourPct: 0,
      fatPct: 30,
      sugarPct: 0,
      saltPct: 2.5,
      eggPct: 0,
      leaveningPower: 0,
      glutenFactor: -2,
      colorHex: '#fbbf24',
      pigmentStrength: 0.9,
      fleckColor: '#f59e0b',
      flavorNoteRu: 'сырное',
    };
  }
  if (id.includes('sugar') || name.includes('сахар')) return LIQUID_DOUGH_PROFILES.sugar;
  if (id.includes('salt') || name.includes('соль')) return LIQUID_DOUGH_PROFILES.salt;
  if (id.includes('choc') || id.includes('cocoa') || name.includes('шоколад') || name.includes('какао')) {
    const chColor = item.chocolateAttributes?.outerColor || '#4a2511';
    return {
      role: 'colorant',
      waterPct: 2,
      flourPct: 25,
      fatPct: 34,
      sugarPct: 38,
      saltPct: 0,
      eggPct: 0,
      leaveningPower: 0,
      glutenFactor: -4,
      colorHex: chColor,
      pigmentStrength: 2.4,
      fleckColor: '#3b1d0d',
      flavorNoteRu: 'шоколадное',
    };
  }
  if (id.includes('citric') || name.includes('лимонн')) {
    return {
      role: 'leavening',
      waterPct: 0,
      flourPct: 0,
      fatPct: 0,
      sugarPct: 0,
      saltPct: 0,
      eggPct: 0,
      leaveningPower: 40,
      glutenFactor: 2,
      colorHex: '#fef9c3',
      pigmentStrength: 0.1,
    };
  }
  if (id.includes('vanilla') || name.includes('ванил')) {
    return {
      role: 'flavor',
      waterPct: 30,
      flourPct: 0,
      fatPct: 0,
      sugarPct: 10,
      saltPct: 0,
      eggPct: 0,
      leaveningPower: 0,
      glutenFactor: 0,
      colorHex: '#78350f',
      pigmentStrength: 0.35,
      fleckColor: '#451a03',
      flavorNoteRu: 'ванильное',
    };
  }
  // Boiled/mashed potato can form potato dough (gnocchi / zrazy)
  if ((id.includes('potato') || name.includes('картоф')) && (item.attributes?.state === 'boiled' || item.produceAttributes?.isBoiled)) {
    return {
      role: 'flour',
      waterPct: 72,
      flourPct: 26,
      fatPct: 0,
      sugarPct: 1,
      saltPct: 0,
      eggPct: 0,
      leaveningPower: 0,
      glutenFactor: 2,
      colorHex: '#fef3c7',
      pigmentStrength: 0.9,
      flavorNoteRu: 'картофельное',
      flourKind: 'potato',
    };
  }
  // Natural coloring / flavoring herbs, spices, berries, beets, carrots, pumpkin, banana
  if (id.includes('hibiscus') || name.includes('каркаде') || name.includes('гибискус')) {
    return { role: 'colorant', waterPct: 5, flourPct: 0, fatPct: 0, sugarPct: 5, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#be123c', pigmentStrength: 3.2, fleckColor: '#881337', flavorNoteRu: 'с каркаде' };
  }
  if (id.includes('beet') || name.includes('свекл') || name.includes('свёкл')) {
    return { role: 'colorant', waterPct: 86, flourPct: 0, fatPct: 0, sugarPct: 9, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#9f1239', pigmentStrength: 2.8, flavorNoteRu: 'свекольное' };
  }
  if (id.includes('carrot') || name.includes('морков')) {
    return { role: 'colorant', waterPct: 86, flourPct: 0, fatPct: 0, sugarPct: 7, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#ea580c', pigmentStrength: 2.0, fleckColor: '#c2410c', flavorNoteRu: 'морковное' };
  }
  if (id.includes('banana') || name.includes('банан')) {
    return { role: 'flavor', waterPct: 74, flourPct: 10, fatPct: 0, sugarPct: 14, saltPct: 0, eggPct: 0, leaveningPower: 4, glutenFactor: 2, colorHex: '#fde68a', pigmentStrength: 0.85, flavorNoteRu: 'банановое' };
  }
  if (id.includes('dill') || id.includes('basil') || id.includes('mint') || id.includes('greens') || id.includes('tarragon') || id.includes('spinach') || id.includes('parsley') || name.includes('зелен') || name.includes('укроп') || name.includes('базилик') || name.includes('мят') || name.includes('шпинат')) {
    return { role: 'colorant', waterPct: 35, flourPct: 0, fatPct: 0, sugarPct: 0, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#4d7c0f', pigmentStrength: 2.4, fleckColor: '#365314', flavorNoteRu: 'с зеленью' };
  }
  if (item.produceAttributes?.produceCategory === 'berry' || id.includes('berr') || id.includes('strawberr') || id.includes('raspberr') || id.includes('blueberr')) {
    const col = item.produceAttributes?.color || '#be123c';
    return { role: 'colorant', waterPct: 85, flourPct: 0, fatPct: 0, sugarPct: 10, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: -2, colorHex: col, pigmentStrength: 2.2, fleckColor: col, flavorNoteRu: 'ягодное' };
  }
  if (id.includes('garlic') || name.includes('чеснок')) {
    return { role: 'flavor', waterPct: 60, flourPct: 0, fatPct: 0, sugarPct: 1, saltPct: 0, eggPct: 0, leaveningPower: 0, glutenFactor: 0, colorHex: '#fef3c7', pigmentStrength: 0.25, flavorNoteRu: 'чесночное' };
  }
  if (id.includes('lemon') || id.includes('orange') || id.includes('lime') || id.includes('mandarin') || id.includes('yuzu')) {
    const col = item.produceAttributes?.color || '#facc15';
    return { role: 'flavor', waterPct: 88, flourPct: 0, fatPct: 0, sugarPct: 7, saltPct: 0, eggPct: 0, leaveningPower: 6, glutenFactor: 2, colorHex: col, pigmentStrength: 1.2, flavorNoteRu: 'цитрусовое' };
  }
  return null;
}

// ============================================================================
// 4. SHAPES & GEOMETRY CALCULATIONS
// ============================================================================

export const DOUGH_SHAPE_NAMES_RU: Record<DoughShape, string> = {
  lump: 'Комок',
  ball: 'Колобок / шар',
  flatbread: 'Лепёшка',
  sheet: 'Раскатанный пласт',
  square_sheet: 'Квадратный пласт',
  strip: 'Ленты / полоски',
  rope: 'Жгут / багет',
  loaf: 'Буханка / батон',
  bun: 'Булочка',
  bagel_ring: 'Бублик / кольцо',
  braid: 'Косичка / плетёнка',
  croissant_crescent: 'Рогалик / круассан',
  pocket_pirozhok: 'Пирожок',
  dumpling_crescent: 'Вареник / пельмень',
  pouch_khinkali: 'Мешочек / хинкали',
  roll_strudel: 'Рулет / штрудель',
  open_pie: 'Открытый пирог / пицца',
  noodles: 'Домашняя лапша',
  cubes_pieces: 'Клёцки / кусочки',
};

export const DOUGH_COOK_STATE_RU: Record<DoughCookState, string> = {
  raw: 'Сырое',
  boiled: 'Варёное',
  steamed: 'На пару',
  fried: 'Жареное',
  deep_fried: 'Во фритюре',
  baked: 'Запечённое',
  burnt: 'Подгорелое',
};

export function isFoldedDoughShape(shape: DoughShape): boolean {
  return (
    shape === 'pocket_pirozhok' ||
    shape === 'dumpling_crescent' ||
    shape === 'pouch_khinkali' ||
    shape === 'roll_strudel' ||
    shape === 'croissant_crescent'
  );
}

export function isOpenReceivableShape(shape: DoughShape): boolean {
  return (
    shape === 'flatbread' ||
    shape === 'sheet' ||
    shape === 'square_sheet' ||
    shape === 'open_pie'
  );
}

/**
 * Computes realistic thickness (mm), diameter/length (cm), and filling capacity (g)
 * strictly from dough mass (g), shape, rolledPasses, and elasticity.
 */
export function computeDoughGeometry(
  weightGrams: number,
  shape: DoughShape,
  rolledPasses: number,
  elasticity: number,
  overrideThicknessMm?: number
): { thicknessMm: number; diameterCm: number; maxFillingGrams: number } {
  const mass = Math.max(10, weightGrams);
  // Dough density ~ 1.08 g/cm³
  const volCm3 = mass / 1.08;

  let thicknessMm = overrideThicknessMm ?? 45;
  if (overrideThicknessMm === undefined) {
    switch (shape) {
      case 'lump':
      case 'ball':
        thicknessMm = Math.max(18, Math.round(Math.cbrt((6 * volCm3) / Math.PI) * 10));
        break;
      case 'bun':
        thicknessMm = Math.max(22, Math.round(Math.cbrt((6 * volCm3) / Math.PI) * 8.2));
        break;
      case 'loaf':
        thicknessMm = Math.max(32, Math.round(Math.cbrt(volCm3) * 6.5));
        break;
      case 'flatbread':
        thicknessMm = Math.max(6, Math.round(14 - Math.min(6, rolledPasses * 3)));
        break;
      case 'sheet':
      case 'square_sheet':
        thicknessMm = Math.max(1.2, Number((5.5 / Math.pow(1.45, Math.max(0, rolledPasses - 1))).toFixed(1)));
        break;
      case 'open_pie':
        thicknessMm = Math.max(5, Math.round(10 - Math.min(4, rolledPasses * 2)));
        break;
      case 'rope':
      case 'braid':
        thicknessMm = Math.max(14, Math.round(Math.cbrt(volCm3) * 3.8));
        break;
      case 'bagel_ring':
        thicknessMm = Math.max(16, Math.round(Math.cbrt(volCm3) * 4.2));
        break;
      case 'croissant_crescent':
        thicknessMm = Math.max(18, Math.round(Math.cbrt(volCm3) * 4.8));
        break;
      case 'pocket_pirozhok':
      case 'pouch_khinkali':
        thicknessMm = Math.max(18, Math.round(Math.cbrt(volCm3) * 5.2));
        break;
      case 'dumpling_crescent':
        thicknessMm = Math.max(10, Math.round(Math.cbrt(volCm3) * 3.5));
        break;
      case 'roll_strudel':
        thicknessMm = Math.max(24, Math.round(Math.cbrt(volCm3) * 5.5));
        break;
      case 'strip':
        thicknessMm = Math.max(2, Math.min(6, overrideThicknessMm ?? 3));
        break;
      case 'noodles':
        thicknessMm = 1.5;
        break;
      case 'cubes_pieces':
        thicknessMm = 14;
        break;
    }
  }

  const thicknessCm = Math.max(0.1, thicknessMm / 10);
  let diameterCm: number;
  if (shape === 'rope' || shape === 'braid' || shape === 'loaf') {
    const crossArea = Math.PI * Math.pow(thicknessCm / 2, 2);
    diameterCm = Math.min(55, Math.max(6, Number((volCm3 / Math.max(0.8, crossArea)).toFixed(1))));
  } else if (shape === 'noodles' || shape === 'strip') {
    diameterCm = Math.min(35, Math.max(8, Number((Math.sqrt(volCm3 / thicknessCm) * 1.4).toFixed(1))));
  } else {
    diameterCm = Math.min(52, Math.max(3.5, Number((2 * Math.sqrt(volCm3 / (Math.PI * thicknessCm))).toFixed(1))));
  }

  // Filling capacity depends on shape, sheet surface area, and elasticity
  const elastMult = 0.78 + (Math.max(0, Math.min(100, elasticity)) / 100) * 0.42;
  let capRatio = 0;
  if (shape === 'sheet' || shape === 'square_sheet') {
    const thinBoost = thicknessMm <= 3 ? 1.15 : thicknessMm <= 6 ? 1.0 : 0.85;
    capRatio = 0.85 * thinBoost * elastMult;
  } else if (shape === 'open_pie') {
    capRatio = 1.05 * elastMult;
  } else if (shape === 'flatbread') {
    capRatio = 0.65 * elastMult;
  } else if (shape === 'lump' || shape === 'ball' || shape === 'bun') {
    capRatio = 0.25 * elastMult;
  } else if (isFoldedDoughShape(shape)) {
    capRatio = 0; // Already sealed/folded!
  } else {
    capRatio = 0;
  }

  const maxFillingGrams = capRatio > 0 ? Math.max(15, Math.round(mass * capRatio)) : 0;
  return {
    thicknessMm: Number(thicknessMm.toFixed(1)),
    diameterCm: Number(diameterCm.toFixed(1)),
    maxFillingGrams,
  };
}

// ============================================================================
// 5. CORE PROPORTIONAL DOUGH SYNTHESIS
// ============================================================================

export function synthesizeDoughAttributes(
  rawEntries: DoughIngredientEntry[],
  options?: {
    shape?: DoughShape;
    rolledPasses?: number;
    overrideThicknessMm?: number;
    embossedPattern?: RollingPinPattern;
    embossedPatternRu?: string;
    fillings?: DoughFillingEntry[];
    cookState?: DoughCookState;
    riseFactor?: number;
    baseMassGrams?: number;
  }
): DoughAttributes {
  // Merge duplicate itemId/name entries cleanly
  const mergedMap = new Map<string, DoughIngredientEntry>();
  for (const e of rawEntries) {
    if (!e || e.grams <= 0.1) continue;
    const key = `${e.itemId}|${e.nameRu}`;
    const prev = mergedMap.get(key);
    if (prev) {
      prev.grams = Math.round((prev.grams + e.grams) * 10) / 10;
    } else {
      mergedMap.set(key, { ...e, grams: Math.round(e.grams * 10) / 10 });
    }
  }
  const ingredients = Array.from(mergedMap.values()).sort((a, b) => b.grams - a.grams);

  let totalMass = 0;
  let flourGrams = 0;
  let liquidGrams = 0;
  let fatGrams = 0;
  let eggGrams = 0;
  let sugarGrams = 0;
  let saltGrams = 0;
  let leaveningWeighted = 0;
  let glutenWeighted = 0;

  let wheatMass = 0;
  let ryeMass = 0;
  let cornMass = 0;
  let riceMass = 0;
  let cottageMass = 0;
  let potatoMass = 0;
  let cocoaMass = 0;

  const colorSamples: Array<{ hex: string; weight: number }> = [];
  let fleckColor: string | undefined;
  let fleckStrength = 0;
  const flavorNotes = new Set<string>();

  for (const ing of ingredients) {
    totalMass += ing.grams;
    const prof =
      getFluidDoughProfile(ing.itemId, ing.itemId, ing.colorHex, ing.nameRu) ||
      ({
        role: ing.role,
        waterPct: ing.role === 'liquid' || ing.role === 'dairy' ? 85 : ing.role === 'egg' ? 74 : 20,
        flourPct: ing.role === 'flour' || ing.role === 'starch' ? 100 : 0,
        fatPct: ing.role === 'fat' ? 95 : 0,
        sugarPct: ing.role === 'sugar' ? 85 : 0,
        saltPct: ing.role === 'salt' ? 95 : 0,
        eggPct: ing.role === 'egg' ? 100 : 0,
        leaveningPower: ing.role === 'leavening' ? 50 : 0,
        glutenFactor: ing.role === 'flour' ? 18 : 0,
        colorHex: ing.colorHex || '#f6eedb',
        pigmentStrength: ing.role === 'colorant' ? 2.2 : 0.8,
      } as DoughIngredientProfile);

    flourGrams += (ing.grams * prof.flourPct) / 100;
    liquidGrams += (ing.grams * prof.waterPct) / 100;
    fatGrams += (ing.grams * prof.fatPct) / 100;
    eggGrams += (ing.grams * prof.eggPct) / 100;
    sugarGrams += (ing.grams * prof.sugarPct) / 100;
    saltGrams += (ing.grams * prof.saltPct) / 100;
    leaveningWeighted += (ing.grams * prof.leaveningPower) / 100;
    glutenWeighted += (ing.grams * prof.glutenFactor) / 100;

    if (prof.flourKind === 'wheat') wheatMass += ing.grams;
    if (prof.flourKind === 'rye') ryeMass += ing.grams;
    if (prof.flourKind === 'corn') cornMass += ing.grams;
    if (prof.flourKind === 'rice') riceMass += ing.grams;
    if (prof.flourKind === 'cottage') cottageMass += ing.grams;
    if (prof.flourKind === 'potato') potatoMass += ing.grams;
    if (ing.itemId.includes('choc') || ing.itemId.includes('cocoa') || ing.nameRu.toLowerCase().includes('какао') || ing.nameRu.toLowerCase().includes('шоколад')) {
      cocoaMass += ing.grams;
    }

    colorSamples.push({
      hex: ing.colorHex || prof.colorHex,
      weight: ing.grams * Math.max(0.1, prof.pigmentStrength),
    });

    if (prof.fleckColor && ing.grams > fleckStrength) {
      fleckStrength = ing.grams;
      fleckColor = prof.fleckColor;
    }
    if (prof.flavorNoteRu && ing.grams >= Math.max(4, totalMass * 0.02)) {
      flavorNotes.add(prof.flavorNoteRu);
    }
  }

  const weightGrams = Math.max(10, Math.round(totalMass));
  const effFlour = Math.max(10, flourGrams);
  const hydrationPct = Math.round((liquidGrams / effFlour) * 100);
  const fatPct = Math.round((fatGrams / effFlour) * 100);
  const sugarPct = Math.round((sugarGrams / effFlour) * 100);
  const eggPct = Math.round((eggGrams / effFlour) * 100);
  const saltPct = Number(((saltGrams / effFlour) * 100).toFixed(1));

  const leaveningLevel = Math.max(
    0,
    Math.min(100, Math.round((leaveningWeighted / Math.max(40, weightGrams * 0.35)) * 100))
  );

  // Elasticity (0..100): high for wheat+water+egg+salt at 45-70% hydration, low for crumbly shortcrust or runny batter
  let elasticity = 45 + (glutenWeighted / Math.max(40, effFlour)) * 140;
  if (hydrationPct > 105) elasticity -= (hydrationPct - 105) * 0.9;
  if (hydrationPct < 35) elasticity -= (35 - hydrationPct) * 1.1;
  if (fatPct > 28) elasticity -= (fatPct - 28) * 0.8;
  elasticity = Math.max(5, Math.min(100, Math.round(elasticity)));

  const richness = Math.max(0, Math.min(100, Math.round(fatPct * 2.1 + eggPct * 1.4)));
  const sweetness = Math.max(0, Math.min(100, Math.round(sugarPct * 2.8)));
  const saltiness = Math.max(0, Math.min(100, Math.round(saltPct * 18)));

  // Determine consistency
  let consistency: DoughConsistency = 'elastic';
  let consistencyRu = 'Эластичное';
  if (hydrationPct >= 105) {
    consistency = 'batter';
    consistencyRu = hydrationPct >= 135 ? 'Жидкое (льётся)' : 'Густое текучее';
  } else if (fatPct >= 26 && hydrationPct <= 48) {
    consistency = 'crumbly';
    consistencyRu = 'Рассыпчатое песочное';
  } else if (hydrationPct < 52) {
    consistency = 'stiff';
    consistencyRu = 'Крутое плотное';
  } else if (hydrationPct >= 74) {
    consistency = 'soft';
    consistencyRu = 'Мягкое воздушное';
  }

  // Classify dough type from actual ingredient proportions!
  let doughType: DoughType = 'classic_soft';
  let doughTypeRu = 'Универсальное домашнее тесто';

  const totalBaseSolids = Math.max(1, wheatMass + ryeMass + cornMass + riceMass + cottageMass + potatoMass);
  if (hydrationPct >= 128) {
    doughType = 'liquid_batter';
    doughTypeRu = 'Жидкое блинное тесто';
  } else if (hydrationPct >= 98) {
    doughType = 'pancake_batter';
    doughTypeRu = 'Густое тесто (оладьи / вафли)';
  } else if (cottageMass / totalBaseSolids >= 0.38) {
    doughType = 'cottage_cheese';
    doughTypeRu = 'Творожное тесто';
  } else if (potatoMass / totalBaseSolids >= 0.42) {
    doughType = 'potato_gnocchi';
    doughTypeRu = 'Картофельное тесто';
  } else if (cocoaMass / Math.max(1, weightGrams) >= 0.05) {
    doughType = 'cocoa_chocolate';
    doughTypeRu = 'Шоколадное тесто';
  } else if (ryeMass / totalBaseSolids >= 0.45) {
    doughType = 'rye_bread';
    doughTypeRu = leaveningLevel >= 22 ? 'Ржаное заквасочное тесто' : 'Ржаное хлебное тесто';
  } else if (cornMass / totalBaseSolids >= 0.45) {
    doughType = 'corn_dough';
    doughTypeRu = 'Кукурузное тесто';
  } else if (riceMass / totalBaseSolids >= 0.5) {
    doughType = 'rice_mochi';
    doughTypeRu = 'Рисовое тесто';
  } else if (fatPct >= 25 && hydrationPct <= 50) {
    doughType = 'shortcrust';
    doughTypeRu = sugarPct >= 12 ? 'Сладкое песочное тесто' : 'Песочное тесто';
  } else if (sugarPct >= 14 && (fatPct >= 10 || eggPct >= 10)) {
    doughType = 'rich_sweet';
    doughTypeRu = 'Сдобное сладкое тесто';
  } else if (eggPct >= 18 && hydrationPct <= 64 && sugarPct < 10) {
    doughType = 'egg_pasta';
    doughTypeRu = 'Яичное тесто (лапша / равиоли)';
  } else if (hydrationPct < 52 && sugarPct < 8 && fatPct < 12) {
    doughType = 'unleavened_stiff';
    doughTypeRu = 'Крутое пельменное тесто';
  } else if (leaveningLevel >= 25) {
    doughType = 'sourdough_bread';
    doughTypeRu = 'Хлебное тесто на закваске';
  }

  let leaveningRu = 'Пресное (без закваски)';
  if (leaveningLevel >= 55) leaveningRu = 'Сильное брожение (закваска)';
  else if (leaveningLevel >= 25) leaveningRu = 'Кисломолочный / лёгкий подъём';
  else if (eggPct >= 16) leaveningRu = 'Яичная пышность';

  const color = blendHexColors(colorSamples);
  const colorNameRu = describeDoughColorRu(color);

  const shape: DoughShape =
    options?.shape || (consistency === 'batter' ? 'flatbread' : 'lump');
  const rolledPasses = options?.rolledPasses ?? 0;
  const fillings = options?.fillings ? options.fillings.map((f) => ({ ...f })) : [];
  const fillingGrams = Math.round(fillings.reduce((acc, f) => acc + f.weightGrams, 0));

  const geom = computeDoughGeometry(
    weightGrams,
    shape,
    rolledPasses,
    elasticity,
    options?.overrideThicknessMm
  );

  const cookState: DoughCookState = options?.cookState || 'raw';
  const riseFactor = options?.riseFactor ?? 1.0;

  return {
    doughType,
    doughTypeRu,
    consistency,
    consistencyRu,
    shape,
    shapeNameRu: DOUGH_SHAPE_NAMES_RU[shape],
    color,
    colorNameRu,
    fleckColor,
    embossedPattern: options?.embossedPattern,
    embossedPatternRu: options?.embossedPatternRu,
    weightGrams,
    baseMassGrams: options?.baseMassGrams ?? weightGrams,
    thicknessMm: geom.thicknessMm,
    diameterCm: geom.diameterCm,
    rolledPasses,
    isFolded: isFoldedDoughShape(shape),
    isOpenTop: shape === 'open_pie',
    flourGrams: Math.round(flourGrams),
    liquidGrams: Math.round(liquidGrams),
    fatGrams: Math.round(fatGrams),
    eggGrams: Math.round(eggGrams),
    sugarGrams: Math.round(sugarGrams),
    saltGrams: Number(saltGrams.toFixed(1)),
    hydrationPct,
    fatPct,
    sugarPct,
    eggPct,
    elasticity,
    richness,
    sweetness,
    saltiness,
    leaveningLevel,
    leaveningRu,
    riseFactor,
    maxFillingGrams: geom.maxFillingGrams,
    fillingGrams,
    fillings,
    ingredients,
    cookState,
    cookStateRu: DOUGH_COOK_STATE_RU[cookState],
    flavorNotesRu: Array.from(flavorNotes).slice(0, 3),
  };
}

export function buildDefaultDoughAttributes(
  overrides?: Partial<DoughAttributes>
): DoughAttributes {
  const ings =
    overrides?.ingredients && overrides.ingredients.length > 0
      ? overrides.ingredients
      : [
          { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 250, role: 'flour' as const, colorHex: '#f6eedb' },
          { itemId: 'water', nameRu: 'Вода', grams: 145, role: 'liquid' as const, colorHex: '#f8fafc' },
          { itemId: 'salt', nameRu: 'Соль', grams: 5, role: 'salt' as const, colorHex: '#f8fafc' },
        ];
  const base = synthesizeDoughAttributes(ings, {
    shape: overrides?.shape,
    rolledPasses: overrides?.rolledPasses,
    overrideThicknessMm: overrides?.thicknessMm,
    embossedPattern: overrides?.embossedPattern,
    embossedPatternRu: overrides?.embossedPatternRu,
    fillings: overrides?.fillings,
    cookState: overrides?.cookState,
    riseFactor: overrides?.riseFactor,
    baseMassGrams: overrides?.baseMassGrams,
  });
  return {
    ...base,
    ...(overrides || {}),
  };
}

// ============================================================================
// 6. DYNAMIC DISPLAY NAMING, NUTRITION & ITEM SYNC
// ============================================================================

export function buildDoughDisplayNameRu(attrs: DoughAttributes): string {
  const fillingShort =
    attrs.fillings.length > 0
      ? ` с начинкой (${attrs.fillings
          .slice(0, 2)
          .map((f) => f.nameRu.split('(')[0].trim().toLowerCase())
          .join(', ')})`
      : '';

  if (attrs.cookState === 'raw') {
    const baseLabel = /(?:^|\s)тест[оауеы]?(?=\s|$)/i.test(attrs.doughTypeRu)
      ? attrs.doughTypeRu.trim()
      : `${attrs.doughTypeRu.trim()} тесто`;
    const shapeLabel = DOUGH_SHAPE_NAMES_RU[attrs.shape].toLowerCase();
    return `${baseLabel} (${shapeLabel})${fillingShort}`;
  }

  const statePrefix =
    attrs.cookState === 'burnt'
      ? 'Подгорелая выпечка'
      : attrs.cookState === 'baked'
      ? 'Печён.'
      : attrs.cookState === 'fried' || attrs.cookState === 'deep_fried'
      ? 'Жарен.'
      : attrs.cookState === 'boiled'
      ? 'Варён.'
      : 'Паров.';

  if (attrs.cookState === 'burnt') {
    return `Подгорелое изделие (${DOUGH_SHAPE_NAMES_RU[attrs.shape].toLowerCase()})${fillingShort}`;
  }

  // Culinary dish names when cooked!
  if (attrs.doughType === 'liquid_batter' && (attrs.cookState === 'fried' || attrs.cookState === 'deep_fried')) {
    return `Домашний блин${fillingShort}`;
  }
  if (attrs.doughType === 'pancake_batter' && (attrs.cookState === 'fried' || attrs.cookState === 'deep_fried')) {
    return `Домашние оладьи${fillingShort}`;
  }
  if (attrs.doughType === 'cottage_cheese' && (attrs.cookState === 'fried' || attrs.cookState === 'baked')) {
    return `${attrs.cookState === 'baked' ? 'Творожная запеканка / сырник' : 'Домашние сырники'}${fillingShort}`;
  }

  switch (attrs.shape) {
    case 'loaf':
      return attrs.cookState === 'baked'
        ? `Домашний хлеб (${attrs.doughType === 'rye_bread' ? 'ржаной' : attrs.doughType === 'corn_dough' ? 'кукурузный' : 'свежий'})${fillingShort}`
        : `${statePrefix} батон${fillingShort}`;
    case 'bun':
    case 'ball':
      return `${attrs.cookState === 'baked' ? 'Печёная булочка' : attrs.cookState === 'steamed' ? 'Паровая булочка' : `${statePrefix} колобок`}${fillingShort}`;
    case 'braid':
      return `${attrs.cookState === 'baked' ? 'Сдобная плетёнка' : `${statePrefix} косичка`}${fillingShort}`;
    case 'bagel_ring':
      return `${attrs.cookState === 'baked' ? 'Печёный бублик' : attrs.cookState === 'boiled' ? 'Отварной бублик' : 'Пончик / бублик'}${fillingShort}`;
    case 'croissant_crescent':
      return `${attrs.cookState === 'baked' ? 'Домашний рогалик' : `${statePrefix} рогалик`}${fillingShort}`;
    case 'pocket_pirozhok':
      return `${attrs.cookState === 'baked' ? 'Печёный пирожок' : attrs.cookState === 'deep_fried' ? 'Пирожок во фритюре' : attrs.cookState === 'fried' ? 'Жареный пирожок' : 'Отварной пирожок'}${fillingShort}`;
    case 'dumpling_crescent':
      return `${attrs.cookState === 'boiled' ? 'Варёные вареники / пельмени' : attrs.cookState === 'fried' || attrs.cookState === 'deep_fried' ? 'Жареные пельмени / чебурек' : 'Печёный вареник'}${fillingShort}`;
    case 'pouch_khinkali':
      return `${attrs.cookState === 'boiled' ? 'Варёные хинкали' : attrs.cookState === 'fried' || attrs.cookState === 'deep_fried' ? 'Жареный беляш' : 'Печёный мешочек'}${fillingShort}`;
    case 'roll_strudel':
      return `${attrs.cookState === 'baked' ? 'Печёный рулет / штрудель' : `${statePrefix} рулет`}${fillingShort}`;
    case 'open_pie':
      return `${attrs.cookState === 'baked' ? (attrs.sweetness >= 35 ? 'Открытый сладкий пирог' : 'Домашняя пицца / открытый пирог') : `${statePrefix} открытая лепёшка`}${fillingShort}`;
    case 'noodles':
    case 'strip':
      return `${attrs.cookState === 'boiled' ? 'Варёная домашняя лапша' : attrs.cookState === 'fried' ? 'Жареная лапша' : 'Печёные полоски теста'}${fillingShort}`;
    case 'cubes_pieces':
      return `${attrs.cookState === 'boiled' ? 'Варёные клёцки / галушки' : attrs.cookState === 'baked' ? 'Печенье / сухарики' : 'Жареные кусочки теста'}${fillingShort}`;
    case 'flatbread':
    case 'sheet':
    case 'square_sheet':
      return `${attrs.cookState === 'baked' ? (attrs.doughType === 'shortcrust' ? 'Песочный корж / печенье' : 'Печёная лепёшка') : attrs.cookState === 'fried' || attrs.cookState === 'deep_fried' ? 'Жареная лепёшка' : 'Отварной пласт теста'}${fillingShort}`;
    default:
      return `${statePrefix} тесто (${DOUGH_SHAPE_NAMES_RU[attrs.shape].toLowerCase()})${fillingShort}`;
  }
}

export function applyDoughAttributesToItem(
  item: InventoryItem,
  attrs: DoughAttributes
): InventoryItem {
  item.doughAttributes = attrs;
  const totalGrams = Math.max(10, attrs.weightGrams + attrs.fillingGrams);
  const totalWeightKg = Number((totalGrams / 1000).toFixed(3));
  item.weight = totalWeightKg;
  item.volume = Number(Math.max(0.05, (totalWeightKg * attrs.riseFactor) / 0.95).toFixed(2));
  item.nameRu = buildDoughDisplayNameRu(attrs);

  const ingList = attrs.ingredients
    .slice(0, 5)
    .map((i) => `${i.nameRu} (${Math.round(i.grams)} г)`)
    .join(', ');
  const fillingDesc =
    attrs.fillings.length > 0
      ? ` Начинка (${attrs.fillingGrams} г): ${attrs.fillings.map((f) => f.nameRu).join(', ')}.`
      : '';
  const embossDesc = attrs.embossedPatternRu ? ` Рельефный узор: ${attrs.embossedPatternRu}.` : '';
  item.descriptionRu = `${attrs.doughTypeRu} (${attrs.cookStateRu.toLowerCase()}, ${attrs.shapeNameRu.toLowerCase()}, ${attrs.thicknessMm} мм, Ø${attrs.diameterCm} см). Вес: ${totalGrams} г (тесто ${attrs.weightGrams} г${attrs.fillingGrams > 0 ? ` + начинка ${attrs.fillingGrams} г` : ''}). Состав: ${ingList}.${fillingDesc}${embossDesc}`;

  // Nutrition & effects scaled strictly by mass, richness, sweetness, fillings, and cooking state
  const caloriesDough = Math.round(
    attrs.flourGrams * 3.55 +
      attrs.fatGrams * 8.9 +
      attrs.sugarGrams * 3.9 +
      attrs.eggGrams * 1.45
  );
  const fillingHunger = attrs.fillings.reduce((acc, f) => acc + f.hunger, 0);
  const fillingEnergy = attrs.fillings.reduce((acc, f) => acc + f.energy, 0);
  const fillingHealth = attrs.fillings.reduce((acc, f) => acc + f.health, 0);

  const baseDoughHunger = Math.max(4, Math.min(85, Math.round((caloriesDough / 100) * 4.4)));
  const cookMult =
    attrs.cookState === 'raw'
      ? 0.42
      : attrs.cookState === 'burnt'
      ? 0.35
      : attrs.cookState === 'baked'
      ? 1.25
      : attrs.cookState === 'fried' || attrs.cookState === 'deep_fried'
      ? 1.22
      : 1.15;

  const hungerTotal = Math.max(
    3,
    Math.min(100, Math.round(baseDoughHunger * cookMult + fillingHunger * (attrs.cookState === 'raw' ? 0.6 : 1.05)))
  );
  const energyTotal = Math.max(
    0,
    Math.min(
      60,
      Math.round(
        (attrs.sweetness * 0.22 + attrs.richness * 0.1) * (attrs.cookState === 'raw' ? 0.3 : 1.0) +
          fillingEnergy
      )
    )
  );
  const healthDelta =
    attrs.cookState === 'burnt'
      ? -8
      : attrs.cookState === 'raw'
      ? attrs.fillings.some((f) => f.isRawMeat)
        ? -14
        : -3
      : Math.min(18, Math.max(0, Math.round(fillingHealth + (attrs.cookState === 'boiled' ? 4 : 2))));

  const portions = Math.max(1, Math.min(12, Math.round(totalGrams / 85)));
  item.portions = item.portions && item.maxPortions ? Math.min(portions, item.portions) : portions;
  item.maxPortions = portions;
  item.effects = {
    hunger: hungerTotal,
    ...(energyTotal > 0 ? { energy: energyTotal } : {}),
    ...(healthDelta !== 0 ? { health: healthDelta } : {}),
  };
  item.usable = true;
  item.nutrients = {
    calories: Math.max(25, caloriesDough + Math.round(attrs.fillingGrams * 1.8)),
    proteins: Math.round(attrs.flourGrams * 0.1 + attrs.eggGrams * 0.13 + attrs.fillingGrams * 0.1),
    fats: Math.round(attrs.fatGrams + attrs.eggGrams * 0.11 + attrs.fillingGrams * 0.08),
    carbs: Math.round(attrs.flourGrams * 0.72 + attrs.sugarGrams),
    sugars: Math.round(attrs.sugarGrams),
    salt: Number(attrs.saltGrams.toFixed(1)),
    water: Math.round(attrs.liquidGrams),
  };

  item.attributes = {
    ...(item.attributes || {}),
    varietyRu: attrs.doughTypeRu,
    visuals: {
      ...(item.attributes?.visuals || {}),
      color: attrs.color,
      colorNameRu: attrs.colorNameRu,
      ...(attrs.embossedPatternRu ? { patternNameRu: attrs.embossedPatternRu } : {}),
    },
    isHomemade: true,
    state: attrs.cookState === 'raw' ? 'raw' : attrs.cookState === 'deep_fried' ? 'fried' : attrs.cookState,
    stateNameRu: attrs.cookStateRu,
    preparationMethod:
      attrs.cookState === 'raw'
        ? `Домашний замес (${attrs.shapeNameRu.toLowerCase()})`
        : `${attrs.cookStateRu} (${attrs.shapeNameRu.toLowerCase()})`,
    ingredients: [
      ...attrs.ingredients.map((i) => `${i.nameRu} (${Math.round(i.grams)} г)`),
      ...attrs.fillings.map((f) => `Начинка: ${f.nameRu} (${Math.round(f.weightGrams)} г)`),
    ],
  };

  return item;
}

// ============================================================================
// 7. ROLLING PIN, KNIFE CUTTING, SLOT SHAPING, FILLING & COOKING OPERATIONS
// ============================================================================

export function rollDoughWithPin(
  doughItem: InventoryItem,
  pinItem: InventoryItem,
  dosageFraction: number,
  applyJitter: boolean
): {
  result: InventoryItem;
  title: string;
  subtitle: string;
  actionLabel: string;
} | null {
  const da = doughItem.doughAttributes;
  if (!da || da.cookState !== 'raw') return null;
  if (da.consistency === 'batter') return null;
  if (da.isFolded) return null;

  const pin = pinItem.rollingPinAttributes || buildRollingPinAttributes();
  const next = JSON.parse(JSON.stringify(doughItem)) as InventoryItem;
  const attrs = next.doughAttributes!;

  // Higher dosageFraction (slot 0 = 1.0) rolls thinner & wider in one pass; lower slots gently press
  const strength = Math.max(0.2, Math.min(1.0, dosageFraction)) * (pin.rollingEfficiency || 1.0);
  const jitter = applyJitter ? 0.94 + Math.random() * 0.12 : 1.0;

  const minThickness = Math.max(0.9, 1.8 - (attrs.elasticity / 100) * 0.8);
  const reductionFactor = Math.max(0.22, Math.min(0.84, 1 - 0.62 * Math.min(1.15, strength) * jitter));
  const nextThickness = Math.max(
    minThickness,
    Number((attrs.thicknessMm * reductionFactor).toFixed(1))
  );

  const nextPasses = (attrs.rolledPasses || 0) + 1;
  let nextShape: DoughShape = attrs.shape;
  if (nextThickness <= 6.5) {
    nextShape = attrs.shape === 'square_sheet' ? 'square_sheet' : 'sheet';
  } else {
    nextShape = 'flatbread';
  }

  const geom = computeDoughGeometry(
    attrs.weightGrams,
    nextShape,
    nextPasses,
    attrs.elasticity,
    nextThickness
  );

  attrs.shape = nextShape;
  attrs.shapeNameRu = DOUGH_SHAPE_NAMES_RU[nextShape];
  attrs.rolledPasses = nextPasses;
  attrs.thicknessMm = geom.thicknessMm;
  attrs.diameterCm = geom.diameterCm;
  attrs.maxFillingGrams = geom.maxFillingGrams;
  attrs.isOpenTop = false;
  attrs.isFolded = false;

  if (pin.embossPatternOnDough && pin.pattern !== 'none') {
    attrs.embossedPattern = pin.pattern;
    attrs.embossedPatternRu = pin.patternNameRu;
  }

  applyDoughAttributesToItem(next, attrs);

  const embossNote =
    pin.embossPatternOnDough && attrs.embossedPatternRu
      ? ` · отпечатан узор (${attrs.embossedPatternRu})`
      : '';
  return {
    result: next,
    title: `Раскатка скалкой: ${attrs.shapeNameRu}`,
    subtitle: `Толщина ${da.thicknessMm} → ${attrs.thicknessMm} мм · Ø${attrs.diameterCm} см · вместимость начинки до ${attrs.maxFillingGrams} г${embossNote}`,
    actionLabel: 'Раскатать тесто',
  };
}

export function cutDoughWithKnife(
  doughItem: InventoryItem,
  dosageFraction: number,
  applyJitter: boolean
): {
  outputs: InventoryItem[];
  title: string;
  subtitle: string;
  actionLabel: string;
} | null {
  const da = doughItem.doughAttributes;
  if (!da || da.weightGrams < 25) return null;

  const clonePiece = (
    ratio: number,
    forcedShape?: DoughShape,
    forcedThicknessMm?: number
  ): InventoryItem => {
    const copy = JSON.parse(JSON.stringify(doughItem)) as InventoryItem;
    copy.id = `${doughItem.id}_cut_${Math.random().toString(36).slice(2, 7)}`;
    const scaledIngredients = da.ingredients.map((i) => ({
      ...i,
      grams: Math.max(0.5, Number((i.grams * ratio).toFixed(1))),
    }));
    const scaledFillings = da.fillings.map((f) => ({
      ...f,
      weightGrams: Math.max(1, Math.round(f.weightGrams * ratio)),
      hunger: Math.max(1, Math.round(f.hunger * ratio)),
      energy: Math.round(f.energy * ratio),
      health: Math.round(f.health * ratio),
    }));
    const targetShape = forcedShape || da.shape;
    const rebuilt = synthesizeDoughAttributes(scaledIngredients, {
      shape: targetShape,
      rolledPasses: da.rolledPasses,
      overrideThicknessMm: forcedThicknessMm ?? (targetShape === da.shape ? da.thicknessMm : undefined),
      embossedPattern: da.embossedPattern,
      embossedPatternRu: da.embossedPatternRu,
      fillings: scaledFillings,
      cookState: da.cookState,
      riseFactor: da.riseFactor,
      baseMassGrams: da.baseMassGrams,
    });
    copy.cookProgress = doughItem.cookProgress;
    copy.brownLevel = doughItem.brownLevel;
    copy.charLevel = doughItem.charLevel;
    copy.cookMethod = doughItem.cookMethod;
    copy.temperature = doughItem.temperature;
    copy.surfaceTemperature = doughItem.surfaceTemperature;
    applyDoughAttributesToItem(copy, rebuilt);
    return copy;
  };

  // Full cut (slot 0: 100%)
  if (dosageFraction >= 0.999) {
    // Thin rolled sheet -> cut into homemade noodles or pastry strips!
    if (da.cookState === 'raw' && (da.shape === 'sheet' || da.shape === 'square_sheet') && da.fillings.length === 0) {
      const targetShape: DoughShape = da.thicknessMm <= 3.5 ? 'noodles' : 'strip';
      const pieceCount = da.weightGrams >= 300 ? 3 : da.weightGrams >= 140 ? 2 : 1;
      const outputs: InventoryItem[] = [];
      for (let i = 0; i < pieceCount; i++) {
        outputs.push(clonePiece(1 / pieceCount, targetShape, da.thicknessMm));
      }
      return {
        outputs,
        title: targetShape === 'noodles' ? 'Нарезка домашней лапши' : 'Нарезка теста полосками',
        subtitle: `${pieceCount} порц. × ~${Math.round(da.weightGrams / pieceCount)} г (${DOUGH_SHAPE_NAMES_RU[targetShape].toLowerCase()})`,
        actionLabel: targetShape === 'noodles' ? 'Нарезать лапшу' : 'Нарезать полосками',
      };
    }

    // Divide loaf/roll/lump/pie into equal pieces (2..4)
    const pieceCount = da.weightGrams >= 480 ? 4 : da.weightGrams >= 220 ? 3 : 2;
    const pieceShape: DoughShape =
      da.cookState === 'raw' && da.fillings.length === 0
        ? da.shape === 'rope' || da.shape === 'lump' || da.shape === 'ball'
          ? 'cubes_pieces'
          : da.shape
        : da.shape;
    const outputs: InventoryItem[] = [];
    for (let i = 0; i < pieceCount; i++) {
      outputs.push(clonePiece(1 / pieceCount, pieceShape));
    }
    return {
      outputs,
      title: `Нарезка теста на ${pieceCount} части`,
      subtitle: `${pieceCount} шт. по ~${Math.round((da.weightGrams + da.fillingGrams) / pieceCount)} г`,
      actionLabel: `Разрезать на ${pieceCount}`,
    };
  }

  // Partial slot-percentage cut (~X% piece + remainder)
  let frac = Math.max(0.08, Math.min(0.92, dosageFraction));
  if (applyJitter) {
    const jitter = (Math.random() + Math.random() - 1) * 0.08;
    frac = Math.max(0.07, Math.min(0.93, frac + jitter));
  }
  const cutGrams = Math.round(da.weightGrams * frac);
  const remGrams = da.weightGrams - cutGrams;
  if (cutGrams < 12 || remGrams < 12) return null;

  const pieceA = clonePiece(frac);
  const pieceB = clonePiece(1 - frac);
  const pct = Math.round(frac * 100);
  return {
    outputs: [pieceA, pieceB],
    title: `Отрезать ~${pct}% от теста`,
    subtitle: `${Math.round(pieceA.doughAttributes!.weightGrams + pieceA.doughAttributes!.fillingGrams)} г + остаток ${Math.round(pieceB.doughAttributes!.weightGrams + pieceB.doughAttributes!.fillingGrams)} г`,
    actionLabel: `Отрезать ~${pct}%`,
  };
}

// ============================================================================
// 8. SLOT-BASED HAND SHAPING & FOLDING (Предание формы через слоты сетки!)
// ============================================================================

export interface SlotDoughShapeSpec {
  shape: DoughShape;
  labelRu: string;
  hintRu: string;
  requiresFilling?: boolean;
  isFoldingAction?: boolean;
}

const GRID_4X4_SLOT_SHAPES: SlotDoughShapeSpec[] = [
  // Row 0 — базовые заготовки
  { shape: 'ball', labelRu: 'Колобок / шар', hintRu: 'Скатать ровный шар руками' },
  { shape: 'flatbread', labelRu: 'Круглая лепёшка', hintRu: 'Размять руками — удобно для начинки и жарки' },
  { shape: 'square_sheet', labelRu: 'Квадратный пласт', hintRu: 'Растянуть прямоугольником под рулет или конверт' },
  { shape: 'sheet', labelRu: 'Тонкий пласт', hintRu: 'Растянуть тонко руками под чебуреки или пиццу' },
  // Row 1 — хлеб и булочки
  { shape: 'bun', labelRu: 'Булочка / пампушка', hintRu: 'Сформовать округлую булочку для выпечки' },
  { shape: 'loaf', labelRu: 'Батон / буханка', hintRu: 'Вытянуть в хлебную буханку с надрезами' },
  { shape: 'rope', labelRu: 'Жгут / багет', hintRu: 'Раскатать ладонями в длинный жгут' },
  { shape: 'braid', labelRu: 'Косичка / плетёнка', hintRu: 'Сплести из трёх жгутов для выпечки' },
  // Row 2 — фигурная выпечка и открытый пирог
  { shape: 'bagel_ring', labelRu: 'Бублик / кольцо', hintRu: 'Сформировать кольцо с отверстием' },
  { shape: 'croissant_crescent', labelRu: 'Рогалик / круассан', hintRu: 'Свернуть изогнутым рогаликом', isFoldingAction: true },
  { shape: 'open_pie', labelRu: 'Открытый пирог / пицца', hintRu: 'Сделать бортики — максимальная вместимость начинки сверху' },
  { shape: 'roll_strudel', labelRu: 'Рулет / штрудель', hintRu: 'Свернуть плотным рулетом (заворачивает начинку)', isFoldingAction: true },
  // Row 3 — лепка и закрытые формы
  { shape: 'pocket_pirozhok', labelRu: 'Пирожок (свернуть)', hintRu: 'Свернуть и защипать шов в закрытый пирожок', isFoldingAction: true },
  { shape: 'dumpling_crescent', labelRu: 'Вареник / пельмень (свернуть)', hintRu: 'Свернуть полумесяцем с защипнутым краем', isFoldingAction: true },
  { shape: 'pouch_khinkali', labelRu: 'Мешочек / хинкали (свернуть)', hintRu: 'Собрать складками в узелок сверху', isFoldingAction: true },
  { shape: 'cubes_pieces', labelRu: 'Клёцки / галушки', hintRu: 'Нарвать руками на небольшие кусочки для варки' },
];

export function getDoughShapeSpecForSlot(
  slotIndex: number,
  gridSize: 4 | 16,
  currentAttrs: DoughAttributes
): SlotDoughShapeSpec {
  if (gridSize === 16) {
    return GRID_4X4_SLOT_SHAPES[Math.max(0, Math.min(15, slotIndex))];
  }
  // Compact 2x2 grid: 4 essential everyday shapes + smart folding in slot 3!
  const hasFillings = currentAttrs.fillings.length > 0;
  switch (slotIndex) {
    case 0:
      return currentAttrs.shape === 'ball'
        ? { shape: 'bun', labelRu: 'Булочка', hintRu: 'Сформовать булочку из колобка' }
        : { shape: 'ball', labelRu: 'Колобок / шар', hintRu: 'Скатать ровный колобок' };
    case 1:
      return currentAttrs.shape === 'flatbread'
        ? { shape: 'open_pie', labelRu: 'Открытый пирог / пицца', hintRu: 'Поднять бортики под открытую начинку' }
        : { shape: 'flatbread', labelRu: 'Лепёшка', hintRu: 'Размять в лепёшку — готова для начинки' };
    case 2:
      return currentAttrs.weightGrams >= 200
        ? { shape: 'loaf', labelRu: 'Буханка / батон', hintRu: 'Сформовать буханку для выпечки' }
        : { shape: 'rope', labelRu: 'Жгут / багет', hintRu: 'Скрутить в жгут' };
    default:
      if (hasFillings) {
        return currentAttrs.weightGrams <= 95
          ? { shape: 'dumpling_crescent', labelRu: 'Свернуть в вареник / пельмень', hintRu: 'Запечатать начинку полумесяцем', isFoldingAction: true }
          : { shape: 'pocket_pirozhok', labelRu: 'Свернуть в пирожок', hintRu: 'Завернуть и защипать начинку внутри', isFoldingAction: true };
      }
      return currentAttrs.shape === 'bagel_ring'
        ? { shape: 'roll_strudel', labelRu: 'Рулет', hintRu: 'Свернуть рулетом', isFoldingAction: true }
        : { shape: 'bagel_ring', labelRu: 'Бублик / кольцо', hintRu: 'Сформировать кольцо с отверстием' };
  }
}

export function shapeDoughBySlot(
  doughItem: InventoryItem,
  slotIndex: number,
  gridSize: 4 | 16
): {
  result: InventoryItem;
  title: string;
  subtitle: string;
  actionLabel: string;
} | null {
  const da = doughItem.doughAttributes;
  if (!da || da.cookState !== 'raw') return null;
  if (da.consistency === 'batter' && da.shape === 'flatbread') return null;

  const spec = getDoughShapeSpecForSlot(slotIndex, gridSize, da);
  if (da.shape === spec.shape) return null;
  // Cannot unfold already-sealed filled dough into noodles/rope/cubes without cutting
  if (da.fillings.length > 0 && (spec.shape === 'noodles' || spec.shape === 'rope' || spec.shape === 'bagel_ring' || spec.shape === 'braid' || spec.shape === 'cubes_pieces')) {
    return null;
  }

  const next = JSON.parse(JSON.stringify(doughItem)) as InventoryItem;
  const attrs = next.doughAttributes!;
  const geom = computeDoughGeometry(
    attrs.weightGrams,
    spec.shape,
    spec.shape === 'sheet' || spec.shape === 'square_sheet' ? Math.max(1, attrs.rolledPasses) : attrs.rolledPasses,
    attrs.elasticity
  );

  attrs.shape = spec.shape;
  attrs.shapeNameRu = DOUGH_SHAPE_NAMES_RU[spec.shape];
  attrs.thicknessMm = geom.thicknessMm;
  attrs.diameterCm = geom.diameterCm;
  attrs.maxFillingGrams = geom.maxFillingGrams;
  attrs.isFolded = isFoldedDoughShape(spec.shape);
  attrs.isOpenTop = spec.shape === 'open_pie';
  if (spec.shape === 'sheet' || spec.shape === 'square_sheet') {
    attrs.rolledPasses = Math.max(1, attrs.rolledPasses);
  }

  applyDoughAttributesToItem(next, attrs);

  const isFold = Boolean(spec.isFoldingAction && attrs.fillings.length > 0);
  return {
    result: next,
    title: isFold
      ? `Свернуть с начинкой: ${spec.labelRu}`
      : `Формовка (слот ${slotIndex + 1}): ${spec.labelRu}`,
    subtitle: `${spec.hintRu} · Ø${attrs.diameterCm} см, толщина ${attrs.thicknessMm} мм${attrs.maxFillingGrams > 0 ? ` · вместимость начинки ${attrs.maxFillingGrams} г` : ''}`,
    actionLabel: isFold ? `Свернуть (${DOUGH_SHAPE_NAMES_RU[spec.shape]})` : `Слепить: ${DOUGH_SHAPE_NAMES_RU[spec.shape]}`,
  };
}

// ============================================================================
// 9. FILLING EXTRACTION & CAPACITY CHECK (Ложить начинку, если вместится!)
// ============================================================================

export function buildFillingEntryFromItem(
  item: InventoryItem,
  gramsOverride?: number
): DoughFillingEntry | null {
  if (!item || (item.category !== 'food' && item.category !== 'drink')) return null;
  if (item.itemId === 'dough' || item.doughAttributes) return null;
  if (item.produceAttributes?.edible === false) return null;

  const weightGrams = Math.max(
    5,
    Math.round(gramsOverride ?? (item.weight ? item.weight * 1000 : 60))
  );
  const ratio = item.weight && item.weight > 0 ? Math.min(1, weightGrams / (item.weight * 1000)) : 1;

  const colorHex =
    item.produceAttributes?.fleshColor ||
    item.produceAttributes?.color ||
    item.meatAttributes?.color ||
    item.chocolateAttributes?.outerColor ||
    item.fluidStorage?.attributes?.customColor ||
    item.attributes?.visuals?.color ||
    '#d97706';

  const isRawMeat = Boolean(
    item.meatAttributes &&
      item.attributes?.state !== 'fried' &&
      item.attributes?.state !== 'boiled' &&
      item.attributes?.state !== 'baked' &&
      item.attributes?.state !== 'cooked'
  );
  const isCooked = Boolean(
    item.attributes?.state === 'fried' ||
      item.attributes?.state === 'boiled' ||
      item.attributes?.state === 'baked' ||
      item.attributes?.state === 'cooked'
  );

  const cleanName = item.nameRu.replace(/\s*\([^)]*\)\s*$/g, '').trim() || item.nameRu;
  return {
    itemId: item.originalCatalogId || item.itemId,
    nameRu: cleanName,
    weightGrams,
    colorHex,
    stateRu: item.attributes?.stateNameRu,
    hunger: Math.max(2, Math.round((item.effects?.hunger ?? 12) * ratio)),
    energy: Math.round((item.effects?.energy ?? 0) * ratio),
    health: Math.round((item.effects?.health ?? 0) * ratio),
    isRawMeat,
    isCooked,
  };
}

// ============================================================================
// 10. THERMAL COOKING SYNC (Варить, жарить, во фритюре, печь, на пару)
// ============================================================================

export function syncDoughCookedState(
  item: InventoryItem,
  cookState: DoughCookState,
  options?: { isDeepOil?: boolean }
): boolean {
  const attrs = item.doughAttributes;
  if (!attrs) return false;

  const targetState: DoughCookState =
    cookState === 'fried' && options?.isDeepOil ? 'deep_fried' : cookState;
  const changed = attrs.cookState !== targetState;

  attrs.cookState = targetState;
  attrs.cookStateRu = DOUGH_COOK_STATE_RU[targetState];

  // Leavening & steam rise during baking / frying / boiling!
  if (targetState === 'baked') {
    attrs.riseFactor = Number((1.12 + (attrs.leaveningLevel / 100) * 0.55 + (attrs.eggPct / 100) * 0.12).toFixed(2));
  } else if (targetState === 'deep_fried' || targetState === 'fried') {
    attrs.riseFactor = Number((1.08 + (attrs.leaveningLevel / 100) * 0.35).toFixed(2));
  } else if (targetState === 'boiled' || targetState === 'steamed') {
    attrs.riseFactor = Number((1.14 + (attrs.leaveningLevel / 100) * 0.22).toFixed(2));
  }

  // Cooking the dough also cooks raw fillings sealed or baked inside it!
  if (targetState !== 'raw' && attrs.fillings.length > 0) {
    for (const f of attrs.fillings) {
      f.isRawMeat = false;
      f.isCooked = true;
      f.stateRu =
        targetState === 'boiled'
          ? 'Варёная'
          : targetState === 'baked'
          ? 'Запечённая'
          : targetState === 'burnt'
          ? 'Подгорелая'
          : 'Обжаренная';
    }
  }

  applyDoughAttributesToItem(item, attrs);
  return changed;
}

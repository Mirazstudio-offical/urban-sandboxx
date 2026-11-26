import { InventoryItem, Player, GameWorld, Vehicle, ContainerVisualShape, ContainerVisualAttributes, UnifiedAttributes } from './types';
export type { ContainerVisualShape, ContainerVisualAttributes, UnifiedAttributes };
import { sound } from './audio';
import { addPlayerNotification } from './items';
import { soothePanic } from './bodySystem';
import { getBuildingLayout } from './buildingInteriors';
import { applyConsumptionThermodynamics } from './itemThermalSystem';
import { tickHomemadeLiquidTransformations } from './homemadeLiquids';
import { syncDoughCookedState } from './doughData';

export type LiquidId =
  | 'water'
  | 'tea'
  | 'coffee'
  | 'energy_drink'
  | 'cola'
  | 'juice'
  | 'milk'
  | 'dairy_fermented'
  | 'kvas'
  | 'beer'
  | 'vodka'
  | 'wine'
  | 'honey'
  | 'broth'
  | 'caviar'
  | 'jam'
  | 'pickles'
  | 'canned_preserve'
  | 'puree'
  | 'rendered_fat'
  | 'oil_culinary'
  | 'vinegar'
  | 'sauce'
  | 'syrup_sweet'
  | 'dry_mix'
  | 'grain'
  | 'grain_wheat'
  | 'grain_rye'
  | 'grain_oats'
  | 'grain_spelt'
  | 'rice'
  | 'buckwheat'
  | 'barley_pearl'
  | 'barley_crushed'
  | 'millet'
  | 'semolina'
  | 'bulgur'
  | 'couscous'
  | 'corn_grits'
  | 'quinoa'
  | 'peas_dry'
  | 'beans_dry'
  | 'lentils'
  | 'chickpeas'
  | 'mung_beans'
  | 'pasta'
  | 'spice_dry'
  | 'sugar'
  | 'flour'
  | 'salt'
  | 'food_acid'
  | 'food_dye'
  | 'botanical_extract'
  | 'essential_oil'
  | 'medical_solution'
  | 'gasoline_95'
  | 'gasoline_92'
  | 'gasoline_98'
  | 'gasoline_100'
  | 'diesel'
  | 'motor_oil'
  | 'antifreeze'
  | 'brake_fluid'
  | 'washer_fluid'
  | 'detergent'
  | 'sand';

export type FluidSubstanceAttributes = UnifiedAttributes;

export interface LiquidDef {
  id: LiquidId;
  name: string;
  nameRu: string;
  category: 'water' | 'beverage' | 'alcohol' | 'fuel' | 'chemical' | 'lubricant' | 'granular' | 'medical' | 'food';
  densityKgPerL: number; // Density in kg/L (or g/ml)
  isDrinkable: boolean;
  isFlammable: boolean;
  isGranular?: boolean;  // True for sand, silica, grains
  color: string;
  effects?: {
    thirst?: number;
    hunger?: number;
    energy?: number;
    sleepiness?: number;
    health?: number;
    alcohol?: number;
    nausea?: number;
    soothePanic?: number;
  };
  tasteMessages?: string[];
  toxicWarning?: string;
  stainType?: 'fuel' | 'oil' | 'sand' | 'water' | 'antifreeze';
}

export type LiquidCookingMedium = 'water' | 'oil' | 'alcohol' | 'sugar' | 'acid' | 'non_culinary' | 'granular';

export interface LiquidThermalProfile {
  boilingPointC: number;      // Boiling / vaporization plateau temperature (°C)
  freezingPointC: number;     // Freezing / solidification point (°C)
  smokePointC?: number;       // Smoke / thermal degradation point (°C) for oils, fats, sugars, fuels
  specificHeatFactor: number; // Heat capacity relative to water (1.0 = water; ~0.48 = oil heats ~2x faster)
  evaporationRate: number;    // Relative boil-off speed at/above boilingPointC (1.0 = water, 0.06 = oil, 2.1 = vodka)
  microwaveFactor: number;    // Dielectric microwave heating efficiency (1.0 = water, 0.55 = oil)
  cookingMedium: LiquidCookingMedium;
}

export const LIQUID_REGISTRY: Record<LiquidId, LiquidDef> = {
  water: {
    id: 'water',
    name: 'Water',
    nameRu: 'Вода',
    category: 'water',
    densityKgPerL: 1.00,
    isDrinkable: true,
    isFlammable: false,
    color: '#38bdf8',
    effects: { thirst: 35, soothePanic: 25 },
    tasteMessages: ['Чистая прохладная вода', 'Освежающий глоток чистой воды', 'Утоляющая жажду вода'],
    stainType: 'water'
  },
  tea: {
    id: 'tea',
    name: 'Tea',
    nameRu: 'Чай',
    category: 'beverage',
    densityKgPerL: 1.00,
    isDrinkable: true,
    isFlammable: false,
    color: '#b45309',
    effects: { thirst: 35, energy: 10, sleepiness: -5, soothePanic: 35 },
    tasteMessages: ['Ароматный заваренный чай', 'Приятный терпкий вкус чая'],
    stainType: 'water'
  },
  coffee: {
    id: 'coffee',
    name: 'Coffee',
    nameRu: 'Кофе',
    category: 'beverage',
    densityKgPerL: 1.00,
    isDrinkable: true,
    isFlammable: false,
    color: '#78350f',
    effects: { thirst: 15, energy: 35, sleepiness: -35, soothePanic: 20 },
    tasteMessages: ['Бодрящий крепкий кофе с плотной пенкой', 'Насыщенный аромат свежесваренной арабики'],
    stainType: 'water'
  },
  energy_drink: {
    id: 'energy_drink',
    name: 'Energy Drink',
    nameRu: 'Энергетик',
    category: 'beverage',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#84cc16',
    effects: { thirst: 20, energy: 55, sleepiness: -50, hunger: 5, soothePanic: 10 },
    tasteMessages: ['Кисло-сладкий цитрусовый вкус энергетика', 'Взрывной заряд таурина и кофеина'],
    stainType: 'water'
  },
  cola: {
    id: 'cola',
    name: 'Cola',
    nameRu: 'Кола',
    category: 'beverage',
    densityKgPerL: 1.04,
    isDrinkable: true,
    isFlammable: false,
    color: '#451a03',
    effects: { thirst: 25, energy: 15, hunger: 10, soothePanic: 15 },
    tasteMessages: ['Сладкая шипящая кола', 'Классический карамельно-газированный вкус'],
    stainType: 'water'
  },
  juice: {
    id: 'juice',
    name: 'Juice',
    nameRu: 'Сок',
    category: 'beverage',
    densityKgPerL: 1.04,
    isDrinkable: true,
    isFlammable: false,
    color: '#ea580c',
    effects: { thirst: 30, hunger: 15, health: 5, soothePanic: 20 },
    tasteMessages: ['Натуральный сладкий фруктово-ягодный сок', 'Сочный витаминный вкус мякоти'],
    stainType: 'water'
  },
  milk: {
    id: 'milk',
    name: 'Milk',
    nameRu: 'Молоко',
    category: 'beverage',
    densityKgPerL: 1.03,
    isDrinkable: true,
    isFlammable: false,
    color: '#f8fafc',
    effects: { thirst: 25, hunger: 30, health: 5, soothePanic: 30 },
    tasteMessages: ['Нежное свежее цельное молоко', 'Мягкий сливочный вкус молока'],
    stainType: 'water'
  },
  dairy_fermented: {
    id: 'dairy_fermented',
    name: 'Fermented Dairy',
    nameRu: 'Кисломолочный продукт',
    category: 'food',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#f8fafc',
    effects: { thirst: 20, hunger: 32, health: 10, energy: 18, soothePanic: 22 },
    tasteMessages: ['Натуральный кисломолочный продукт со сливочной кислинкой'],
    stainType: 'water'
  },
  kvas: {
    id: 'kvas',
    name: 'Kvass',
    nameRu: 'Квас',
    category: 'beverage',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#92400e',
    effects: { thirst: 35, energy: 10, hunger: 10, soothePanic: 25 },
    tasteMessages: ['Освежающий ядреный квас из бочки', 'Хлебная кислинка и плотная пена'],
    stainType: 'water'
  },
  beer: {
    id: 'beer',
    name: 'Beer',
    nameRu: 'Пиво',
    category: 'alcohol',
    densityKgPerL: 1.01,
    isDrinkable: true,
    isFlammable: false,
    color: '#eab308',
    effects: { thirst: 15, alcohol: 15, sleepiness: 15, soothePanic: 40 },
    tasteMessages: ['Освежающее хмельное пиво с легкой солодовой горчинкой'],
    stainType: 'water'
  },
  vodka: {
    id: 'vodka',
    name: 'Vodka',
    nameRu: 'Водка',
    category: 'alcohol',
    densityKgPerL: 0.94,
    isDrinkable: true,
    isFlammable: true,
    color: '#e2e8f0',
    effects: { alcohol: 45, health: -5, soothePanic: 60 },
    tasteMessages: ['Обжигающий крепкий глоток спиртного'],
    stainType: 'water'
  },
  wine: {
    id: 'wine',
    name: 'Wine',
    nameRu: 'Вино',
    category: 'alcohol',
    densityKgPerL: 0.99,
    isDrinkable: true,
    isFlammable: false,
    color: '#881337',
    effects: { thirst: 15, alcohol: 12, soothePanic: 35 },
    tasteMessages: ['Благородный букет виноградного вина'],
    stainType: 'water'
  },
  honey: {
    id: 'honey',
    name: 'Honey',
    nameRu: 'Мёд',
    category: 'food',
    densityKgPerL: 1.42,
    isDrinkable: true,
    isFlammable: false,
    color: '#d97706',
    effects: { hunger: 45, energy: 35, thirst: 5, health: 14, soothePanic: 30 },
    tasteMessages: ['Густой ароматный натуральный мёд тает на языке...', 'Сладкий тягучий мёд согревает горло.'],
    stainType: 'water'
  },
  broth: {
    id: 'broth',
    name: 'Broth',
    nameRu: 'Бульон',
    category: 'food',
    densityKgPerL: 1.04,
    isDrinkable: true,
    isFlammable: false,
    color: '#b45309',
    effects: { hunger: 55, thirst: 35, energy: 20, health: 15, soothePanic: 40 },
    tasteMessages: ['Наваристый горячий бульон с пряностями и кореньями...', 'Сытный согревающий суповой бульон.'],
    stainType: 'water'
  },
  caviar: {
    id: 'caviar',
    name: 'Caviar',
    nameRu: 'Икра',
    category: 'food',
    densityKgPerL: 1.14,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#ea580c',
    effects: { hunger: 58, energy: 28, health: 22, soothePanic: 45 },
    tasteMessages: ['Нежная отборная икра с насыщенным деликатесным вкусом...'],
    stainType: 'water'
  },
  jam: {
    id: 'jam',
    name: 'Jam',
    nameRu: 'Варенье',
    category: 'food',
    densityKgPerL: 1.35,
    isDrinkable: true,
    isFlammable: false,
    color: '#be123c',
    effects: { hunger: 40, energy: 30, thirst: 5, health: 12, soothePanic: 28 },
    tasteMessages: ['Сладкое ароматное домашнее варенье на сахарном сиропе...'],
    stainType: 'water'
  },
  pickles: {
    id: 'pickles',
    name: 'Pickles & Preserves',
    nameRu: 'Соленье',
    category: 'food',
    densityKgPerL: 1.08,
    isDrinkable: true,
    isFlammable: false,
    color: '#84cc16',
    effects: { hunger: 32, thirst: 15, health: 12, soothePanic: 25 },
    tasteMessages: ['Хрустящее домашнее соленье в пряном рассоле и маринаде!'],
    stainType: 'water'
  },
  canned_preserve: {
    id: 'canned_preserve',
    name: 'Canned Preserve',
    nameRu: 'Консервы',
    category: 'food',
    densityKgPerL: 1.12,
    isDrinkable: true,
    isFlammable: false,
    color: '#b45309',
    effects: { hunger: 55, energy: 22, health: 12, soothePanic: 25 },
    tasteMessages: ['Сытные консервы автоклавной стерилизации в собственном соку.'],
    stainType: 'oil'
  },
  puree: {
    id: 'puree',
    name: 'Puree & Paste',
    nameRu: 'Пюре / Паста',
    category: 'food',
    densityKgPerL: 1.14,
    isDrinkable: true,
    isFlammable: false,
    color: '#dc2626',
    effects: { hunger: 38, energy: 20, health: 10, soothePanic: 20 },
    tasteMessages: ['Густая однородная кулинарная паста и уваренное пюре.'],
    stainType: 'water'
  },
  rendered_fat: {
    id: 'rendered_fat',
    name: 'Rendered Fat',
    nameRu: 'Топлёный жир',
    category: 'food',
    densityKgPerL: 0.91,
    isDrinkable: true,
    isFlammable: true,
    color: '#fef3c7',
    effects: { hunger: 45, energy: 22, health: 6 },
    tasteMessages: ['Сытный вытопленный кулинарный жир для жарки и заправки блюд.'],
    stainType: 'oil'
  },
  oil_culinary: {
    id: 'oil_culinary',
    name: 'Culinary Oil',
    nameRu: 'Растительное масло',
    category: 'lubricant',
    densityKgPerL: 0.92,
    isDrinkable: true,
    isFlammable: true,
    color: '#eab308',
    effects: { hunger: 22, health: 4 },
    tasteMessages: ['Маслянистое растительное масло отжима для жарки и заправки.'],
    stainType: 'oil'
  },
  vinegar: {
    id: 'vinegar',
    name: 'Vinegar',
    nameRu: 'Уксус',
    category: 'chemical',
    densityKgPerL: 1.01,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef08a',
    effects: { thirst: -8, hunger: 4 },
    tasteMessages: ['Кисло-пряный кулинарный уксус для маринадов и заправок.'],
    stainType: 'water'
  },
  sauce: {
    id: 'sauce',
    name: 'Sauce',
    nameRu: 'Соус',
    category: 'food',
    densityKgPerL: 1.15,
    isDrinkable: true,
    isFlammable: false,
    color: '#dc2626',
    effects: { hunger: 18, energy: 10, soothePanic: 15 },
    tasteMessages: ['Насыщенный пряный соус для заправки и подачи блюд.'],
    stainType: 'water'
  },
  syrup_sweet: {
    id: 'syrup_sweet',
    name: 'Sweet Syrup',
    nameRu: 'Сироп / Сгущёнка',
    category: 'food',
    densityKgPerL: 1.32,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef9c3',
    effects: { hunger: 40, energy: 32, soothePanic: 35 },
    tasteMessages: ['Густой сладкий уваренный сироп и сгущённое лакомство.'],
    stainType: 'water'
  },
  dry_mix: {
    id: 'dry_mix',
    name: 'Culinary Dry Mix',
    nameRu: 'Сухая смесь',
    category: 'food',
    densityKgPerL: 0.68,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fef3c7',
    effects: { hunger: 14, energy: 6 },
    tasteMessages: ['Сухая кулинарная смесь, крахмал или желирующий компонент.'],
    stainType: 'sand'
  },
  grain: {
    id: 'grain',
    name: 'Grain & Legumes',
    nameRu: 'Крупа',
    category: 'food',
    densityKgPerL: 0.82,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fde047',
    effects: { hunger: 22, thirst: -10 },
    tasteMessages: ['Отборная сухая крупа и зернобобовые для варки гарниров и супов.'],
    stainType: 'sand'
  },
  grain_wheat: {
    id: 'grain_wheat',
    name: 'Whole Wheat Grain',
    nameRu: 'Пшеница (зерно)',
    category: 'food',
    densityKgPerL: 0.78,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#d97706',
    effects: { hunger: 20, thirst: -12 },
    tasteMessages: ['Твёрдые цельные зёрна пшеницы с хлебным ароматом.'],
    stainType: 'sand'
  },
  grain_rye: {
    id: 'grain_rye',
    name: 'Whole Rye Grain',
    nameRu: 'Рожь (зерно)',
    category: 'food',
    densityKgPerL: 0.74,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#a16207',
    effects: { hunger: 18, thirst: -12 },
    tasteMessages: ['Сухие продолговатые зёрна северной ржи со слегка солодовым вкусом.'],
    stainType: 'sand'
  },
  grain_oats: {
    id: 'grain_oats',
    name: 'Rolled Oats',
    nameRu: 'Овсяные хлопья',
    category: 'food',
    densityKgPerL: 0.46,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fde68a',
    effects: { hunger: 24, energy: 10, thirst: -8 },
    tasteMessages: ['Нежные плющеные хлопья геркулеса с мягким молочно-злаковым вкусом.'],
    stainType: 'sand'
  },
  grain_spelt: {
    id: 'grain_spelt',
    name: 'Spelt Grain',
    nameRu: 'Полба (спельта)',
    category: 'food',
    densityKgPerL: 0.76,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#b45309',
    effects: { hunger: 24, energy: 8, thirst: -10 },
    tasteMessages: ['Древнее зерно полбы с выраженным орехово-зерновым привкусом.'],
    stainType: 'sand'
  },
  rice: {
    id: 'rice',
    name: 'Rice',
    nameRu: 'Рис',
    category: 'food',
    densityKgPerL: 0.85,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#f8fafc',
    effects: { hunger: 22, thirst: -10 },
    tasteMessages: ['Отборные сухие рисовые зёрна — идеально для плова, ризотто и гарниров.'],
    stainType: 'sand'
  },
  buckwheat: {
    id: 'buckwheat',
    name: 'Buckwheat',
    nameRu: 'Гречневая крупа',
    category: 'food',
    densityKgPerL: 0.80,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#92400e',
    effects: { hunger: 25, energy: 8, thirst: -10 },
    tasteMessages: ['Душистая трёхгранная гречневая ядрица с насыщенным ореховым ароматом.'],
    stainType: 'sand'
  },
  barley_pearl: {
    id: 'barley_pearl',
    name: 'Pearl Barley',
    nameRu: 'Перловая крупа',
    category: 'food',
    densityKgPerL: 0.82,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#e7e5e4',
    effects: { hunger: 22, thirst: -12 },
    tasteMessages: ['Гладкие жемчужные ядра шлифованного ячменя.'],
    stainType: 'sand'
  },
  barley_crushed: {
    id: 'barley_crushed',
    name: 'Crushed Barley Groats',
    nameRu: 'Ячневая крупа',
    category: 'food',
    densityKgPerL: 0.72,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#d6d3d1',
    effects: { hunger: 21, thirst: -11 },
    tasteMessages: ['Дроблёная ячневая крупка из нешлифованного ячменя.'],
    stainType: 'sand'
  },
  millet: {
    id: 'millet',
    name: 'Millet Groats',
    nameRu: 'Пшено',
    category: 'food',
    densityKgPerL: 0.84,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#facc15',
    effects: { hunger: 22, thirst: -10 },
    tasteMessages: ['Ярко-золотистые круглые зёрнышки шлифованного проса.'],
    stainType: 'sand'
  },
  semolina: {
    id: 'semolina',
    name: 'Semolina',
    nameRu: 'Манная крупа',
    category: 'food',
    densityKgPerL: 0.70,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fef9c3',
    effects: { hunger: 20, thirst: -14 },
    tasteMessages: ['Мелкая светло-кремовая пшеничная крупка для молочной каши и выпечки.'],
    stainType: 'sand'
  },
  bulgur: {
    id: 'bulgur',
    name: 'Bulgur',
    nameRu: 'Булгур',
    category: 'food',
    densityKgPerL: 0.80,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#eab308',
    effects: { hunger: 24, energy: 6, thirst: -9 },
    tasteMessages: ['Янтарный пропаренный дроблёный булгур из твёрдой пшеницы.'],
    stainType: 'sand'
  },
  couscous: {
    id: 'couscous',
    name: 'Couscous',
    nameRu: 'Кускус',
    category: 'food',
    densityKgPerL: 0.72,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fde047',
    effects: { hunger: 22, energy: 6, thirst: -9 },
    tasteMessages: ['Рассыпчатые скатанные гранулы марокканского кускуса из семолины.'],
    stainType: 'sand'
  },
  corn_grits: {
    id: 'corn_grits',
    name: 'Corn Grits (Polenta)',
    nameRu: 'Кукурузная крупа',
    category: 'food',
    densityKgPerL: 0.75,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#f59e0b',
    effects: { hunger: 21, thirst: -10 },
    tasteMessages: ['Солнечная дроблёная кукурузная крупа для поленты и мамалыги.'],
    stainType: 'sand'
  },
  quinoa: {
    id: 'quinoa',
    name: 'Quinoa',
    nameRu: 'Киноа',
    category: 'food',
    densityKgPerL: 0.76,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fef3c7',
    effects: { hunger: 25, energy: 12, health: 4, thirst: -8 },
    tasteMessages: ['Мелкие дискообразные семена киноа с ореховым вкусом и полным набором аминокислот.'],
    stainType: 'sand'
  },
  peas_dry: {
    id: 'peas_dry',
    name: 'Split Dry Peas',
    nameRu: 'Горох колотый',
    category: 'food',
    densityKgPerL: 0.82,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#eab308',
    effects: { hunger: 24, thirst: -12 },
    tasteMessages: ['Сухие колотые половинки жёлтого посевного гороха.'],
    stainType: 'sand'
  },
  beans_dry: {
    id: 'beans_dry',
    name: 'Dry Beans',
    nameRu: 'Фасоль зерновая',
    category: 'food',
    densityKgPerL: 0.80,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#7f1d1d',
    effects: { hunger: 24, thirst: -12 },
    tasteMessages: ['Плотные сухие бобы зерновой фасоли, богатые растительным белком.'],
    stainType: 'sand'
  },
  lentils: {
    id: 'lentils',
    name: 'Lentils',
    nameRu: 'Чечевица',
    category: 'food',
    densityKgPerL: 0.82,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#ea580c',
    effects: { hunger: 25, energy: 8, thirst: -10 },
    tasteMessages: ['Плоские линзовидные зёрна чечевицы для супов-пюре и пряных гарниров.'],
    stainType: 'sand'
  },
  chickpeas: {
    id: 'chickpeas',
    name: 'Chickpeas',
    nameRu: 'Нут',
    category: 'food',
    densityKgPerL: 0.78,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fcd34d',
    effects: { hunger: 25, energy: 8, thirst: -11 },
    tasteMessages: ['Крупные ореховые зёрна среднеазиатского нута.'],
    stainType: 'sand'
  },
  mung_beans: {
    id: 'mung_beans',
    name: 'Mung Beans',
    nameRu: 'Маш',
    category: 'food',
    densityKgPerL: 0.80,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#4d7c0f',
    effects: { hunger: 24, energy: 10, health: 4, thirst: -9 },
    tasteMessages: ['Мелкие изумрудно-зелёные бобы маш со сладковато-травяным послевкусием.'],
    stainType: 'sand'
  },
  pasta: {
    id: 'pasta',
    name: 'Pasta',
    nameRu: 'Макаронные изделия',
    category: 'food',
    densityKgPerL: 0.56,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fde047',
    effects: { hunger: 24, energy: 10, thirst: -12 },
    tasteMessages: ['Сухие макаронные изделия — похрустывают на зубах, требуют варки в подсоленной воде.'],
    stainType: 'sand'
  },
  spice_dry: {
    id: 'spice_dry',
    name: 'Dry Spice & Herbs',
    nameRu: 'Специи',
    category: 'food',
    densityKgPerL: 0.50,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#b45309',
    effects: { hunger: 5, energy: 8 },
    tasteMessages: ['Пряная ароматная молотая специя и сушёные травы.'],
    stainType: 'sand'
  },
  sugar: {
    id: 'sugar',
    name: 'Granulated Sugar',
    nameRu: 'Сахар-песок',
    category: 'food',
    densityKgPerL: 0.85,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#f8fafc',
    effects: { hunger: 18, energy: 20, soothePanic: 15 },
    tasteMessages: ['Сладкие кристаллы белого сахара-песка'],
    stainType: 'sand'
  },
  flour: {
    id: 'flour',
    name: 'Wheat Flour',
    nameRu: 'Пшеничная мука',
    category: 'food',
    densityKgPerL: 0.60,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fefce8',
    effects: { hunger: 15, thirst: -15 },
    tasteMessages: ['Сухая мука тонкого помола'],
    stainType: 'sand'
  },
  salt: {
    id: 'salt',
    name: 'Table Salt',
    nameRu: 'Поваренная соль',
    category: 'food',
    densityKgPerL: 1.20,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#e2e8f0',
    effects: { thirst: -35, nausea: 10 },
    tasteMessages: ['Соленые кристаллы каменной поваренной соли'],
    stainType: 'sand'
  },
  food_acid: {
    id: 'food_acid',
    name: 'Culinary Acid',
    nameRu: 'Пищевая кислота',
    category: 'food',
    densityKgPerL: 0.95,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#f8fafc',
    effects: { thirst: 8, energy: 5 },
    tasteMessages: ['Яркая освежающая кислинка органической пищевой кислоты.'],
    stainType: 'sand'
  },
  food_dye: {
    id: 'food_dye',
    name: 'Natural Food Dye',
    nameRu: 'Пищевой краситель',
    category: 'food',
    densityKgPerL: 1.05,
    isDrinkable: true,
    isFlammable: false,
    color: '#be123c',
    effects: { health: 2 },
    tasteMessages: ['Концентрированный натуральный пищевой пигмент.'],
    stainType: 'water'
  },
  botanical_extract: {
    id: 'botanical_extract',
    name: 'Botanical Extract',
    nameRu: 'Растительный экстракт',
    category: 'food',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#991b1b',
    effects: { thirst: 8, health: 10, energy: 8, soothePanic: 15 },
    tasteMessages: ['Концентрированная растительная вытяжка из плодов и трав.'],
    stainType: 'water'
  },
  essential_oil: {
    id: 'essential_oil',
    name: 'Essential Oil',
    nameRu: 'Эфирное масло',
    category: 'food',
    densityKgPerL: 0.89,
    isDrinkable: true,
    isFlammable: true,
    color: '#fbbf24',
    effects: { energy: 10, soothePanic: 25 },
    tasteMessages: ['Высококонцентрированное душистое эфирное масло.'],
    stainType: 'oil'
  },
  medical_solution: {
    id: 'medical_solution',
    name: 'Medical Preparation',
    nameRu: 'Медицинский состав',
    category: 'medical',
    densityKgPerL: 1.00,
    isDrinkable: false,
    isFlammable: false,
    color: '#e0f2fe',
    effects: { health: 20, soothePanic: 20 },
    tasteMessages: ['Фармацевтический препарат для первой помощи и лечения.'],
    toxicWarning: 'Медицинский препарат. Применять согласно назначению.',
    stainType: 'water'
  },
  gasoline_95: {
    id: 'gasoline_95',
    name: 'Gasoline A-95',
    nameRu: 'Бензин АИ-95',
    category: 'fuel',
    densityKgPerL: 0.75,
    isDrinkable: false,
    isFlammable: true,
    color: '#eab308',
    toxicWarning: 'Едкий запах бензина! Пить бензин смертельно опасно!',
    stainType: 'fuel'
  },
  gasoline_92: {
    id: 'gasoline_92',
    name: 'Gasoline A-92',
    nameRu: 'Бензин АИ-92',
    category: 'fuel',
    densityKgPerL: 0.74,
    isDrinkable: false,
    isFlammable: true,
    color: '#ca8a04',
    toxicWarning: 'Едкий запах бензина! Пить бензин смертельно опасно!',
    stainType: 'fuel'
  },
  gasoline_98: {
    id: 'gasoline_98',
    name: 'Gasoline A-98',
    nameRu: 'Бензин АИ-98',
    category: 'fuel',
    densityKgPerL: 0.76,
    isDrinkable: false,
    isFlammable: true,
    color: '#f59e0b',
    toxicWarning: 'Высокооктановый бензин! Непригоден для питья!',
    stainType: 'fuel'
  },
  gasoline_100: {
    id: 'gasoline_100',
    name: 'Gasoline A-100 Sport',
    nameRu: 'Бензин АИ-100',
    category: 'fuel',
    densityKgPerL: 0.76,
    isDrinkable: false,
    isFlammable: true,
    color: '#d97706',
    toxicWarning: 'Спортивный бензин! Яд!',
    stainType: 'fuel'
  },
  diesel: {
    id: 'diesel',
    name: 'Diesel Fuel',
    nameRu: 'Дизтопливо',
    category: 'fuel',
    densityKgPerL: 0.84,
    isDrinkable: false,
    isFlammable: true,
    color: '#a16207',
    toxicWarning: 'Тяжелое дизельное топливо! Не предназначено для питья.',
    stainType: 'fuel'
  },
  motor_oil: {
    id: 'motor_oil',
    name: 'Motor Oil 5W-40',
    nameRu: 'Моторное масло',
    category: 'lubricant',
    densityKgPerL: 0.88,
    isDrinkable: false,
    isFlammable: true,
    color: '#713f12',
    toxicWarning: 'Вязкое синтетическое моторное масло! Токсично.',
    stainType: 'oil'
  },
  antifreeze: {
    id: 'antifreeze',
    name: 'Antifreeze Coolant G12+',
    nameRu: 'Антифриз G12+',
    category: 'chemical',
    densityKgPerL: 1.08,
    isDrinkable: false,
    isFlammable: false,
    color: '#ec4899',
    toxicWarning: 'Осторожно: антифриз на основе этиленгликоля — СМЕРТЕЛЬНЫЙ ЯД!',
    stainType: 'antifreeze'
  },
  brake_fluid: {
    id: 'brake_fluid',
    name: 'Brake Fluid DOT-4',
    nameRu: 'Тормозная жидкость',
    category: 'chemical',
    densityKgPerL: 1.05,
    isDrinkable: false,
    isFlammable: false,
    color: '#facc15',
    toxicWarning: 'Химически агрессивная тормозная жидкость! ЯД!',
    stainType: 'antifreeze'
  },
  washer_fluid: {
    id: 'washer_fluid',
    name: 'Windshield Washer Fluid',
    nameRu: 'Стеклоомыватель',
    category: 'chemical',
    densityKgPerL: 0.96,
    isDrinkable: false,
    isFlammable: false,
    color: '#3b82f6',
    toxicWarning: 'Незамерзающая жидкость со спиртом и ПАВ! Пить нельзя.',
    stainType: 'water'
  },
  detergent: {
    id: 'detergent',
    name: 'Laundry Detergent',
    nameRu: 'Стиральный порошок / гель',
    category: 'chemical',
    densityKgPerL: 0.92,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#e0f2fe',
    toxicWarning: 'Бытовое моющее средство. Предназначено для стиральной машины.',
    stainType: 'water'
  },
  sand: {
    id: 'sand',
    name: 'Silica Sand',
    nameRu: 'Кварцевый песок',
    category: 'granular',
    densityKgPerL: 1.60,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#eab308',
    toxicWarning: 'Сухой сыпучий кварцевый песок! Используется для тушения и абсорбции.',
    stainType: 'sand'
  }
};

export function isFluidStorageDryForm(
  storage: { liquidId?: string | null; attributes?: FluidSubstanceAttributes } | null | undefined
): boolean {
  if (!storage || !storage.liquidId) return false;
  if (storage.attributes?.physicalForm === 'liquid') return false;
  if (storage.attributes?.physicalForm === 'dry') return true;
  const liq = LIQUID_REGISTRY[storage.liquidId as LiquidId];
  return Boolean(liq?.isGranular);
}

const GRANULAR_THERMAL_PROFILE: LiquidThermalProfile = {
  boilingPointC: 260,
  freezingPointC: -50,
  specificHeatFactor: 0.45,
  evaporationRate: 0,
  microwaveFactor: 0.35,
  cookingMedium: 'granular',
};

const DEFAULT_WATER_THERMAL_PROFILE: LiquidThermalProfile = {
  boilingPointC: 100.0,
  freezingPointC: 0.0,
  specificHeatFactor: 1.0,
  evaporationRate: 1.0,
  microwaveFactor: 1.0,
  cookingMedium: 'water',
};

export const LIQUID_THERMAL_PROFILES: Partial<Record<LiquidId, LiquidThermalProfile>> = {
  // Water & water-based beverages
  water:            { boilingPointC: 100.0, freezingPointC: 0.0,   specificHeatFactor: 1.00, evaporationRate: 1.00, microwaveFactor: 1.00, cookingMedium: 'water' },
  tea:              { boilingPointC: 100.2, freezingPointC: -0.3,  specificHeatFactor: 0.99, evaporationRate: 1.00, microwaveFactor: 1.00, cookingMedium: 'water' },
  coffee:           { boilingPointC: 100.3, freezingPointC: -0.4,  specificHeatFactor: 0.99, evaporationRate: 1.00, microwaveFactor: 1.00, cookingMedium: 'water' },
  energy_drink:     { boilingPointC: 100.8, freezingPointC: -1.6,  specificHeatFactor: 0.95, evaporationRate: 1.04, microwaveFactor: 1.00, cookingMedium: 'water' },
  cola:             { boilingPointC: 101.0, freezingPointC: -1.8,  specificHeatFactor: 0.95, evaporationRate: 1.05, microwaveFactor: 1.00, cookingMedium: 'water' },
  juice:            { boilingPointC: 101.2, freezingPointC: -2.0,  specificHeatFactor: 0.94, evaporationRate: 0.96, microwaveFactor: 0.98, cookingMedium: 'water' },
  kvas:             { boilingPointC: 99.0,  freezingPointC: -2.2,  specificHeatFactor: 0.96, evaporationRate: 1.08, microwaveFactor: 0.98, cookingMedium: 'water' },
  milk:             { boilingPointC: 100.5, freezingPointC: -0.5,  smokePointC: 106, specificHeatFactor: 0.93, evaporationRate: 0.92, microwaveFactor: 0.96, cookingMedium: 'water' },
  dairy_fermented:  { boilingPointC: 100.6, freezingPointC: -0.8,  smokePointC: 108, specificHeatFactor: 0.91, evaporationRate: 0.85, microwaveFactor: 0.94, cookingMedium: 'water' },

  // Alcohols (lower boiling point, lower freezing point, faster evaporation)
  beer:             { boilingPointC: 95.0,  freezingPointC: -2.5,  specificHeatFactor: 0.94, evaporationRate: 1.25, microwaveFactor: 0.95, cookingMedium: 'alcohol' },
  wine:             { boilingPointC: 91.0,  freezingPointC: -5.5,  specificHeatFactor: 0.88, evaporationRate: 1.48, microwaveFactor: 0.92, cookingMedium: 'alcohol' },
  vodka:            { boilingPointC: 83.5,  freezingPointC: -27.0, smokePointC: 82,  specificHeatFactor: 0.78, evaporationRate: 2.15, microwaveFactor: 0.86, cookingMedium: 'alcohol' },

  // Culinary oils & fats (high boiling/smoke point, low heat capacity -> rapid hot frying!)
  oil_culinary:     { boilingPointC: 245.0, freezingPointC: -10.0, smokePointC: 205, specificHeatFactor: 0.48, evaporationRate: 0.06, microwaveFactor: 0.52, cookingMedium: 'oil' },
  rendered_fat:     { boilingPointC: 235.0, freezingPointC: 26.0,  smokePointC: 195, specificHeatFactor: 0.50, evaporationRate: 0.07, microwaveFactor: 0.54, cookingMedium: 'oil' },

  // Broths, sauces, preserves, acid
  broth:            { boilingPointC: 101.2, freezingPointC: -1.2,  specificHeatFactor: 0.96, evaporationRate: 0.94, microwaveFactor: 1.00, cookingMedium: 'water' },
  pickles:          { boilingPointC: 102.5, freezingPointC: -4.5,  specificHeatFactor: 0.93, evaporationRate: 0.90, microwaveFactor: 1.02, cookingMedium: 'water' },
  sauce:            { boilingPointC: 103.0, freezingPointC: -3.0,  smokePointC: 135, specificHeatFactor: 0.84, evaporationRate: 0.26, microwaveFactor: 0.95, cookingMedium: 'water' },
  puree:            { boilingPointC: 102.5, freezingPointC: -2.0,  smokePointC: 130, specificHeatFactor: 0.86, evaporationRate: 0.18, microwaveFactor: 0.94, cookingMedium: 'water' },
  canned_preserve:  { boilingPointC: 103.5, freezingPointC: -2.2,  smokePointC: 145, specificHeatFactor: 0.88, evaporationRate: 0.10, microwaveFactor: 0.95, cookingMedium: 'water' },
  caviar:           { boilingPointC: 102.0, freezingPointC: -3.5,  smokePointC: 135, specificHeatFactor: 0.84, evaporationRate: 0.14, microwaveFactor: 0.90, cookingMedium: 'water' },
  vinegar:          { boilingPointC: 100.8, freezingPointC: -2.0,  specificHeatFactor: 0.94, evaporationRate: 1.15, microwaveFactor: 0.98, cookingMedium: 'acid' },

  // Sugars, honey, syrups & jams (higher boil point, caramelize above ~105°C)
  honey:            { boilingPointC: 108.0, freezingPointC: -12.0, smokePointC: 155, specificHeatFactor: 0.60, evaporationRate: 0.14, microwaveFactor: 0.88, cookingMedium: 'sugar' },
  syrup_sweet:      { boilingPointC: 106.0, freezingPointC: -9.0,  smokePointC: 150, specificHeatFactor: 0.68, evaporationRate: 0.28, microwaveFactor: 0.90, cookingMedium: 'sugar' },
  jam:              { boilingPointC: 105.0, freezingPointC: -7.0,  smokePointC: 148, specificHeatFactor: 0.72, evaporationRate: 0.16, microwaveFactor: 0.92, cookingMedium: 'sugar' },

  // Extracts, acids, dyes, essential oil, medical
  food_acid:        { boilingPointC: 102.0, freezingPointC: -3.0,  specificHeatFactor: 0.90, evaporationRate: 0.95, microwaveFactor: 0.96, cookingMedium: 'acid' },
  food_dye:         { boilingPointC: 100.5, freezingPointC: -1.0,  specificHeatFactor: 0.98, evaporationRate: 1.00, microwaveFactor: 1.00, cookingMedium: 'water' },
  botanical_extract:{ boilingPointC: 86.0,  freezingPointC: -18.0, specificHeatFactor: 0.74, evaporationRate: 1.75, microwaveFactor: 0.85, cookingMedium: 'alcohol' },
  essential_oil:    { boilingPointC: 185.0, freezingPointC: -14.0, smokePointC: 145, specificHeatFactor: 0.52, evaporationRate: 0.42, microwaveFactor: 0.55, cookingMedium: 'non_culinary' },
  medical_solution: { boilingPointC: 82.0,  freezingPointC: -24.0, specificHeatFactor: 0.76, evaporationRate: 1.90, microwaveFactor: 0.86, cookingMedium: 'non_culinary' },

  // Fuels, automotive lubricants & chemicals
  gasoline_92:      { boilingPointC: 68.0,  freezingPointC: -60.0, smokePointC: 65,  specificHeatFactor: 0.50, evaporationRate: 3.20, microwaveFactor: 0.40, cookingMedium: 'non_culinary' },
  gasoline_95:      { boilingPointC: 70.0,  freezingPointC: -60.0, smokePointC: 68,  specificHeatFactor: 0.50, evaporationRate: 3.10, microwaveFactor: 0.40, cookingMedium: 'non_culinary' },
  gasoline_98:      { boilingPointC: 72.0,  freezingPointC: -60.0, smokePointC: 70,  specificHeatFactor: 0.50, evaporationRate: 3.00, microwaveFactor: 0.40, cookingMedium: 'non_culinary' },
  gasoline_100:     { boilingPointC: 74.0,  freezingPointC: -60.0, smokePointC: 72,  specificHeatFactor: 0.50, evaporationRate: 2.90, microwaveFactor: 0.40, cookingMedium: 'non_culinary' },
  diesel:           { boilingPointC: 185.0, freezingPointC: -22.0, smokePointC: 160, specificHeatFactor: 0.49, evaporationRate: 0.45, microwaveFactor: 0.42, cookingMedium: 'non_culinary' },
  motor_oil:        { boilingPointC: 290.0, freezingPointC: -38.0, smokePointC: 225, specificHeatFactor: 0.46, evaporationRate: 0.04, microwaveFactor: 0.42, cookingMedium: 'non_culinary' },
  antifreeze:       { boilingPointC: 108.0, freezingPointC: -40.0, specificHeatFactor: 0.82, evaporationRate: 0.62, microwaveFactor: 0.90, cookingMedium: 'non_culinary' },
  brake_fluid:      { boilingPointC: 230.0, freezingPointC: -50.0, smokePointC: 205, specificHeatFactor: 0.56, evaporationRate: 0.08, microwaveFactor: 0.65, cookingMedium: 'non_culinary' },
  washer_fluid:     { boilingPointC: 86.0,  freezingPointC: -25.0, specificHeatFactor: 0.82, evaporationRate: 1.55, microwaveFactor: 0.92, cookingMedium: 'non_culinary' },
  detergent:        { boilingPointC: 101.5, freezingPointC: -4.0,  specificHeatFactor: 0.92, evaporationRate: 0.85, microwaveFactor: 0.95, cookingMedium: 'non_culinary' },
};

export function getLiquidThermalProfile(
  liquidId: string | null | undefined,
  storage?: { liquidId?: string | null; attributes?: FluidSubstanceAttributes } | null
): LiquidThermalProfile {
  if (!liquidId) return DEFAULT_WATER_THERMAL_PROFILE;
  if (storage && isFluidStorageDryForm(storage)) return GRANULAR_THERMAL_PROFILE;
  const exact = LIQUID_THERMAL_PROFILES[liquidId as LiquidId];
  if (exact) return exact;
  const def = LIQUID_REGISTRY[liquidId as LiquidId];
  if (def?.isGranular) return GRANULAR_THERMAL_PROFILE;
  return DEFAULT_WATER_THERMAL_PROFILE;
}

export interface ResolvedContainerThermalLiquid extends LiquidThermalProfile {
  liquidId: string;
  currentMl: number;
  nameRu: string;
}

/**
 * Resolves the effective thermodynamic profile of liquid inside a container,
 * supporting both single liquids and volume-weighted multi-liquid mixtures.
 * Returns null if the container is dry or holds only dry granular material.
 */
export function getContainerLiquidThermalProfile(
  container: InventoryItem | null | undefined
): ResolvedContainerThermalLiquid | null {
  if (!container || !container.fluidStorage) return null;
  const st = container.fluidStorage;
  const currentMl = Math.max(0, st.currentMl || 0);
  if (currentMl < 3 || !st.liquidId) return null;
  if (isFluidStorageDryForm(st)) return null;

  const baseDef = LIQUID_REGISTRY[st.liquidId as LiquidId];
  const comps = Array.isArray(st.components) ? st.components.filter(c => c && c.ml > 0.5 && c.liquidId) : [];

  if (comps.length <= 1) {
    const prof = getLiquidThermalProfile(st.liquidId, st);
    if (prof.cookingMedium === 'granular') return null;
    return {
      ...prof,
      liquidId: st.liquidId,
      currentMl,
      nameRu: st.attributes?.varietyRu || baseDef?.nameRu || st.liquidId,
    };
  }

  // Volume-weighted mixture properties
  let totalMl = 0;
  let boilSum = 0;
  let freezeSum = 0;
  let shSum = 0;
  let evapSum = 0;
  let mwSum = 0;
  let smokeMin: number | undefined = undefined;
  let waterLikeMl = 0;
  let oilMl = 0;
  let alcoholMl = 0;
  let sugarMl = 0;
  let nonCulMl = 0;

  for (const c of comps) {
    const p = getLiquidThermalProfile(c.liquidId);
    if (p.cookingMedium === 'granular') continue;
    totalMl += c.ml;
    boilSum += p.boilingPointC * c.ml;
    freezeSum += p.freezingPointC * c.ml;
    shSum += p.specificHeatFactor * c.ml;
    evapSum += p.evaporationRate * c.ml;
    mwSum += p.microwaveFactor * c.ml;
    if (typeof p.smokePointC === 'number') {
      smokeMin = smokeMin === undefined ? p.smokePointC : Math.min(smokeMin, p.smokePointC);
    }
    if (p.cookingMedium === 'oil') oilMl += c.ml;
    else if (p.cookingMedium === 'alcohol') alcoholMl += c.ml;
    else if (p.cookingMedium === 'sugar') sugarMl += c.ml;
    else if (p.cookingMedium === 'non_culinary') nonCulMl += c.ml;
    else waterLikeMl += c.ml;
  }

  if (totalMl <= 0) return null;

  let cookingMedium: LiquidCookingMedium = 'water';
  if (nonCulMl / totalMl >= 0.2) cookingMedium = 'non_culinary';
  else if (oilMl / totalMl >= 0.65 && waterLikeMl < 15) cookingMedium = 'oil';
  else if (sugarMl / totalMl >= 0.55) cookingMedium = 'sugar';
  else if (alcoholMl / totalMl >= 0.5) cookingMedium = 'alcohol';

  // If significant water is mixed with oil, boiling point stays capped near water until water boils off
  const blendedBoil =
    waterLikeMl >= 15 && oilMl > 0
      ? Math.min(104, boilSum / totalMl)
      : Number((boilSum / totalMl).toFixed(1));

  return {
    boilingPointC: blendedBoil,
    freezingPointC: Number((freezeSum / totalMl).toFixed(1)),
    smokePointC: cookingMedium === 'oil' || cookingMedium === 'sugar' ? smokeMin : undefined,
    specificHeatFactor: Number((shSum / totalMl).toFixed(2)),
    evaporationRate: Number((evapSum / totalMl).toFixed(2)),
    microwaveFactor: Number((mwSum / totalMl).toFixed(2)),
    cookingMedium,
    liquidId: st.liquidId,
    currentMl,
    nameRu: st.attributes?.varietyRu || baseDef?.nameRu || st.liquidId,
  };
}

/**
 * Returns a concise Russian thermal phase label for a liquid at the given temperature.
 */
export function getLiquidThermalPhaseLabelRu(
  tempC: number,
  profile: ResolvedContainerThermalLiquid | LiquidThermalProfile | null | undefined,
  liquidId?: string | null
): string | null {
  if (!profile) return null;
  if (tempC <= profile.freezingPointC) {
    return liquidId === 'rendered_fat' ? 'Застыло' : 'Замёрзло';
  }
  if (typeof profile.smokePointC === 'number' && tempC >= profile.smokePointC) {
    return 'Дымится';
  }
  if (tempC >= profile.boilingPointC - 1.5) {
    return 'Кипит';
  }
  if (profile.cookingMedium === 'oil' && tempC >= 120) {
    return 'Жарка в масле';
  }
  if (profile.cookingMedium === 'sugar' && tempC >= 102) {
    return 'Карамелизация';
  }
  if (profile.cookingMedium !== 'oil' && tempC >= profile.boilingPointC - 14) {
    return 'Закипает';
  }
  return null;
}

/**
 * Simulates gradual boil-off evaporation for an open heated container based on the
 * liquid's specific boiling point and evaporation rate.
 */
const NON_VOLATILE_SOLIDS_FRACTION: Partial<Record<LiquidId, number>> = {
  canned_preserve: 0.65,
  caviar: 0.58,
  jam: 0.55,
  honey: 0.72,
  puree: 0.45,
  sauce: 0.32,
};

export function tickContainerLiquidBoilOff(
  container: InventoryItem | null | undefined,
  dtSeconds: number
): boolean {
  if (!container || !container.fluidStorage || dtSeconds <= 0) return false;
  const prof = getContainerLiquidThermalProfile(container);
  if (!prof || prof.evaporationRate <= 0) return false;

  const isOpen = Boolean(container.isOpen || !getContainerConfig(container.itemId)?.requiresOpening);
  if (!isOpen) return false;

  const tempC = container.temperature ?? 20;
  if (tempC < prof.boilingPointC - 2.0) return false;

  const excess = Math.max(0, tempC - (prof.boilingPointC - 2.0));
  const boilOffMl = (0.85 + excess * 0.22) * prof.evaporationRate * Math.min(dtSeconds, 60);
  if (boilOffMl <= 0.05) return false;

  const st = container.fluidStorage;
  const prevMl = Math.max(0, st.currentMl || 0);

  // Thick solids-rich culinary substances (stew/preserves, caviar, jam, puree, sauce, honey)
  // lose only excess moisture and NEVER evaporate completely into 0g of vapor.
  const solidFrac = st.liquidId ? NON_VOLATILE_SOLIDS_FRACTION[st.liquidId as LiquidId] : undefined;
  let floorMl = 0;
  if (solidFrac && solidFrac > 0) {
    if (typeof st.nonVolatileFloorMl !== 'number' || st.nonVolatileFloorMl <= 0 || st.nonVolatileFloorMl > prevMl) {
      st.nonVolatileFloorMl = Math.max(20, Number((prevMl * solidFrac).toFixed(1)));
    }
    floorMl = Math.min(prevMl, st.nonVolatileFloorMl);
  }

  const nextMl = Math.max(floorMl, Number((prevMl - boilOffMl).toFixed(1)));
  if (nextMl === prevMl) return false;

  st.currentMl = nextMl;
  if (Array.isArray(st.components) && st.components.length > 0 && prevMl > 0) {
    const ratio = nextMl / prevMl;
    st.components = st.components
      .map(c => ({ ...c, ml: Math.max(0, Number((c.ml * ratio).toFixed(1))) }))
      .filter(c => c.ml > 0.2);
  }
  if (nextMl <= 0.5 && floorMl <= 0) {
    st.currentMl = 0;
    st.liquidId = null;
    st.components = [];
    st.nonVolatileFloorMl = undefined;
  }
  return true;
}

export const DEFAULT_GENERIC_LIQUID_ATTRIBUTES: Partial<Record<LiquidId, FluidSubstanceAttributes>> = {
  detergent: {
    varietyRu: 'Универсальный стиральный порошок',
    ingredients: 'Анионные ПАВ 5–15%, неионогенные ПАВ <5%, карбонат натрия, цеолиты, кислородный отбеливатель, энзимы',
    preparationMethod: 'Смешивание и распылительная сушка гранулированного моющего концентрата',
    purpose: 'Машинная и ручная стирка тканей — растворяет масляные, топливные и бытовые загрязнения',
    customColor: '#f8fafc',
    secondaryColor: '#38bdf8',
    physicalForm: 'dry',
    physicalFormRu: 'Сухой гранулированный порошок',
    substanceColorRu: 'Белый с голубыми гранулами',
    visuals: {
      color: '#f8fafc',
      secondaryColor: '#38bdf8',
      colorNameRu: 'Белый с голубыми гранулами'
    }
  },
  water: {
    varietyRu: 'Пресная питьевая',
    ingredients: 'Природная родниковая или очищенная артезианская вода',
    preparationMethod: 'Механическая фильтрация и отстаивание',
    purpose: 'Утоление жажды, основа для супов, бульонов, чая и маринадов'
  },
  tea: {
    varietyRu: 'Чёрный байховый листовой',
    ingredients: 'Ферментированный чайный лист (Camellia sinensis), горячая вода',
    preparationMethod: 'Заваривание сухого чайного листа крутым кипятком',
    purpose: 'Согревающий и тонизирующий напиток'
  },
  coffee: {
    varietyRu: 'Чёрный заварной (Арабика)',
    ingredients: 'Обжаренные молотые зёрна кофе арабика, горячая вода',
    preparationMethod: 'Экстракция молотого зерна горячей водой',
    purpose: 'Бодрящий напиток, снимающий сонливость и усталость'
  },
  energy_drink: {
    varietyRu: 'Таурин-кофеиновый тоник',
    ingredients: 'Газированная вода, сахароза, кофеин, таурин, витамины группы B',
    preparationMethod: 'Промышленное купажирование и карбонизация',
    purpose: 'Экстренное восстановление бодрости и снятие сонливости'
  },
  cola: {
    varietyRu: 'Классическая карамельная',
    ingredients: 'Газированная вода, сахар, карамельный колер, ортофосфорная кислота, экстракт ореха кола и ванили',
    preparationMethod: 'Смешивание пряно-карамельного сиропа с сатурированной водой',
    purpose: 'Освежающий сладкий газированный напиток'
  },
  juice: {
    varietyRu: 'Фруктово-ягодный прямого отжима',
    ingredients: 'Спелые садовые яблоки, апельсины, лесные и садовые ягоды',
    preparationMethod: 'Холодный прессовый отжим с мягкой пастеризацией',
    purpose: 'Утоление жажды, восполнение витаминов и приготовление мармелада'
  },
  milk: {
    varietyRu: 'Цельное коровье (3.2%)',
    ingredients: 'Натуральное цельное коровье молоко',
    preparationMethod: 'Бережная пастеризация и охлаждение',
    purpose: 'Питьё, варка молочных каш, замешивание теста и кремов'
  },
  dairy_fermented: {
    varietyRu: 'Домашняя сметана / Кефир',
    ingredients: 'Цельное коровье молоко, сливки, живая молочнокислая закваска',
    preparationMethod: 'Молочнокислое сквашивание и термостатное созревание',
    purpose: 'Заправка супов и пельменей, выпечка и прямое употребление'
  },
  kvas: {
    varietyRu: 'Хлебный бочковой',
    ingredients: 'Вода, ржаной и ячменный солод, ржаные сухари, сахар, хлебопекарные дрожжи',
    preparationMethod: 'Двойное молочнокислое и спиртовое брожение сусла',
    purpose: 'Освежающий славянский напиток и основа для окрошки'
  },
  beer: {
    varietyRu: 'Светлое ячменное (Лагер)',
    ingredients: 'Вода, светлый ячменный солод, шишковой хмель, пивные дрожжи',
    preparationMethod: 'Затирание солодового сусла и низовое брожение',
    purpose: 'Слабоалкогольный пенный напиток для снятия стресса'
  },
  vodka: {
    varietyRu: 'Пшеничная классическая 40%',
    ingredients: 'Исправленная вода, спирт этиловый ректификованный «Люкс» из пшеничного зерна',
    preparationMethod: 'Ректификация зернового спирта и угольная фильтрация',
    purpose: 'Крепкий алкогольный напиток, антисептик и основа для настоек'
  },
  wine: {
    varietyRu: 'Сухое виноградное выдержанное',
    ingredients: 'Ферментированный сок спелого технического винограда',
    preparationMethod: 'Сбраживание виноградного сусла и выдержка в дубовой таре',
    purpose: 'Благородный напиток, основа для глинтвейна, маринадов и соусов'
  },
  honey: {
    varietyRu: 'Цветочный луговой',
    ingredients: 'Цветочный нектар разнотравья и липы, переработанный медоносными пчёлами',
    preparationMethod: 'Сбор запечатанных медовых сот и холодная откачка в медогонке',
    purpose: 'Природный источник быстрой энергии, лечение простуды и выпечка',
    culinaryEquivalentId: 'honey'
  },
  broth: {
    varietyRu: 'Домашний мясной на кореньях',
    ingredients: 'Вода, мясо на кости, репчатый лук, морковь, лавровый лист, чёрный перец, соль',
    preparationMethod: 'Долгое медленное томление мяса и кореньев на слабом огне',
    purpose: 'Горячее первое блюдо и питательная основа для супов и соусов',
    culinaryEquivalentId: 'broth'
  },
  caviar: {
    varietyRu: 'Лососевая зернистая малосольная',
    ingredients: 'Отборная икра тихоокеанских лососевых рыб, каменная соль, капля растительного масла',
    preparationMethod: 'Пробивка ястыков через грохотку и охлаждённый посол в тузлуке',
    purpose: 'Высококалорийный деликатес для бутербродов, блинов и закусок',
    culinaryEquivalentId: 'caviar_red'
  },
  jam: {
    varietyRu: 'Домашнее ягодное на сиропе',
    ingredients: 'Спелые садовые и лесные ягоды, сахар-песок, родниковая вода',
    preparationMethod: 'Многократная томлёная варка ягод в густом сахарном сиропе',
    purpose: 'Сладкое лакомство к чаю, начинка для пирогов и блинов',
    culinaryEquivalentId: 'jam'
  },
  pickles: {
    varietyRu: 'Огурцы и томаты бочкового посола',
    ingredients: 'Свежие огурцы и томаты, вода, каменная соль, зонтики укропа, чеснок, лист хрена и смородины',
    preparationMethod: 'Молочнокислое квашение и пряный рассольный посол',
    purpose: 'Хрустящая закуска, восполняющая водно-солевой баланс',
    culinaryEquivalentId: 'pickles'
  },
  canned_preserve: {
    varietyRu: 'Мясные и овощные консервы ГОСТ',
    ingredients: 'Крупнокусковое мясо или отборные овощи, собственный сок, соль, перец, лавровый лист',
    preparationMethod: 'Герметичная закатка и высокотемпературная стерилизация в автоклаве',
    purpose: 'Длительное хранение, готовое сытное блюдо или основа для супа и каши',
    culinaryEquivalentId: 'stew_meat'
  },
  puree: {
    varietyRu: 'Томатная и орехово-овощная паста',
    ingredients: 'Уваренная протёртая мякоть спелых плодов и обжаренных семян, щепотка соли',
    preparationMethod: 'Тонкое протирание через сито и вакуумное уваривание до густоты',
    purpose: 'Заправка супов, подлив, соусов и сытных бутербродов',
    culinaryEquivalentId: 'tomato_paste'
  },
  rendered_fat: {
    varietyRu: 'Топлёный кулинарный жир (смалец / гхи)',
    ingredients: 'Отборный нутряной животный жир или сливочное масло высшего сорта',
    preparationMethod: 'Медленное вытапливание на водяной бане с фильтрацией шкварок и белка',
    purpose: 'Жарка без пригорания, заправка каш и защита от холода',
    culinaryEquivalentId: 'lard_pork'
  },
  oil_culinary: {
    varietyRu: 'Подсолнечное нерафинированное первого отжима',
    ingredients: 'Обжаренные и сырые семена масличного подсолнечника',
    preparationMethod: 'Шнековый прессовый отжим и механическая фильтрация',
    purpose: 'Жарка на сковороде, фритюр, заправка салатов и выпечка',
    culinaryEquivalentId: 'oil_sunflower'
  },
  vinegar: {
    varietyRu: 'Столовый спиртовой 9%',
    ingredients: 'Вода питьевая, пищевая уксусная кислота биохимического брожения',
    preparationMethod: 'Уксуснокислое окисление спиртового сусла и разведение до 9%',
    purpose: 'Консервация, маринование шашлыка и подача к пельменям',
    culinaryEquivalentId: 'vinegar_table'
  },
  sauce: {
    varietyRu: 'Кулинарный пряный соус',
    ingredients: 'Уваренные томаты, соевые бобы или горчичное зерно, уксус, сахар, соль, букет специй',
    preparationMethod: 'Купажирование и томление основы с пряностями и специями',
    purpose: 'Приправление горячих мясных, рыбных блюд, гарниров и пельменей',
    culinaryEquivalentId: 'sauce_ketchup'
  },
  syrup_sweet: {
    varietyRu: 'Сгущённое молоко с сахаром ГОСТ',
    ingredients: 'Цельное коровье молоко, нормализованные сливки, свекловичный сахар',
    preparationMethod: 'Вакуумное выпаривание влаги при щадящей температуре с кристаллизацией лактозы',
    purpose: 'Добавка в чай и кофе, начинка для выпечки и быстрый источник углеводов',
    culinaryEquivalentId: 'condensed_milk'
  },
  dry_mix: {
    varietyRu: 'Кулинарный загуститель / Сухая смесь',
    ingredients: 'Очищенный крахмал, природный желатин или пектин из растительного сырья',
    preparationMethod: 'Экстракция, вакуумная сушка и тонкий ситовой помол',
    purpose: 'Приготовление домашнего мармелада, киселей, желе и соусов',
    culinaryEquivalentId: 'starch'
  },
  grain: {
    varietyRu: 'Крупа зерновая отборная',
    ingredients: 'Очищенное и шлифованное зерно злаковых или бобовых культур',
    preparationMethod: 'Шелушение семенной оболочки, шлифовка и калибровка зерна',
    purpose: 'Варка рассыпчатых гарниров, густых похлёбок, плова и каш',
    culinaryEquivalentId: 'rice'
  },
  grain_wheat: {
    varietyRu: 'Пшеница цельнозерновая отборная',
    ingredients: 'Цельное очищенное зерно яровой и озимой пшеницы твёрдых и мягких сортов',
    preparationMethod: 'Обмолот колосьев, отвеивание и калибровка зерна',
    purpose: 'Помол в муку, проращивание, варка кутьи и пшеничной каши',
    productShapeRu: 'Цельные овальные зёрна с бороздкой',
    grainGradeRu: 'Цельное зерно, 1 класс',
    cookingTimeMin: '40–50 мин (с замачиванием)',
    proteinPer100g: 13.0,
    culinaryEquivalentId: 'grain_wheat_raw'
  },
  grain_rye: {
    varietyRu: 'Рожь озимая цельнозерновая',
    ingredients: 'Цельное зерно северной озимой ржи (Secale cereale)',
    preparationMethod: 'Сушка в зерносушилке и очистка от половы',
    purpose: 'Помол ржаной муки, приготовление солода и хлебного кваса',
    productShapeRu: 'Удлинённые заострённые зёрна',
    grainGradeRu: 'Цельнозерновая озимая рожь',
    cookingTimeMin: '45–55 мин (с замачиванием)',
    proteinPer100g: 10.3,
    culinaryEquivalentId: 'grain_rye_raw'
  },
  grain_oats: {
    varietyRu: 'Овсяные хлопья «Геркулес»',
    ingredients: 'Цельное пропаренное и плющеное зерно голозёрного овса',
    preparationMethod: 'Пропаривание овсяного ядра и плющение вальцами в лепестки',
    purpose: 'Варка утренней овсяной каши, гранолы, овсяного печенья и киселя',
    productShapeRu: 'Тонкие плющеные овальные хлопья-лепестки',
    grainGradeRu: 'Традиционные хлопья №1 (долгого варения)',
    cookingTimeMin: '12–15 мин',
    proteinPer100g: 12.3,
    culinaryEquivalentId: 'grain_oats'
  },
  grain_spelt: {
    varietyRu: 'Полба дроблёная (древняя пшеница спельта)',
    ingredients: 'Зерно полудикой пшеницы спельты (Triticum spelta)',
    preparationMethod: 'Бережное шелушение твёрдой плёнки и крупное дробление',
    purpose: 'Варка ароматной полбяной каши с маслом, грибами или тыквой',
    productShapeRu: 'Крупнодроблёные янтарные зёрна с оболочкой',
    grainGradeRu: 'Цельнозерновая дроблёная спельта',
    cookingTimeMin: '25–30 мин',
    proteinPer100g: 14.6,
    culinaryEquivalentId: 'spelt_whole_grain'
  },
  rice: {
    varietyRu: 'Рис шлифованный отборный',
    ingredients: 'Очищенное и отшлифованное зерно посевного риса (Oryza sativa)',
    preparationMethod: 'Шелушение шелухи и бережная шлифовка зерна',
    purpose: 'Приготовление плова, ризотто, роллов, гарниров и молочной каши',
    productShapeRu: 'Гладкие полупрозрачные зёрна',
    grainGradeRu: 'Высший сорт',
    cookingTimeMin: '15–18 мин',
    glutenFree: true,
    proteinPer100g: 7.3,
    culinaryEquivalentId: 'rice_white'
  },
  buckwheat: {
    varietyRu: 'Гречневая крупа ядрица',
    ingredients: 'Цельное трёхгранное ядро плодов гречихи посевной (Fagopyrum esculentum)',
    preparationMethod: 'Калибровка, пропаривание и обжарка до золотисто-коричневого цвета',
    purpose: 'Варка рассыпчатой гречневой каши с маслом, грибами или тушёнкой',
    productShapeRu: 'Цельные трёхгранные пирамидки-ядра',
    grainGradeRu: 'Ядрица высшего сорта',
    cookingTimeMin: '15–18 мин',
    glutenFree: true,
    proteinPer100g: 12.6,
    culinaryEquivalentId: 'buckwheat_roasted'
  },
  barley_pearl: {
    varietyRu: 'Перловая крупа шлифованная',
    ingredients: 'Цельное зерно ячменя, очищенное от цветочных плёнок и отшлифованное',
    preparationMethod: 'Шелушение и многоступенчатая круглая шлифовка ядра',
    purpose: 'Варка классического рассольника, грибного супа и сытной каши',
    productShapeRu: 'Округлые гладкие жемчужины-зёрна',
    grainGradeRu: '№1, шлифованная высшего сорта',
    cookingTimeMin: '45–50 мин',
    proteinPer100g: 9.3,
    culinaryEquivalentId: 'barley_pearl'
  },
  barley_crushed: {
    varietyRu: 'Ячневая крупа дроблёная',
    ingredients: 'Дроблёные частицы нешлифованного ядра ячменя',
    preparationMethod: 'Очистка от цветочной плёнки и дробление без шлифовки',
    purpose: 'Варка нежной вязкой ячневой каши и заправка домашних супов',
    productShapeRu: 'Мелкие угловатые дроблёные крупинки №2',
    grainGradeRu: 'Дроблёная нешлифованная №2',
    cookingTimeMin: '15–20 мин',
    proteinPer100g: 10.0,
    culinaryEquivalentId: 'barley_crushed_yachka'
  },
  millet: {
    varietyRu: 'Пшено шлифованное золотистое',
    ingredients: 'Очищенные от оболочек зёрна культурного проса',
    preparationMethod: 'Обрушивание плёнок проса и полировка ядра',
    purpose: 'Варка полевого кулеша и сладкой тыквенно-пшённой каши на молоке',
    productShapeRu: 'Мелкие круглые шарики ярко-жёлтого цвета',
    grainGradeRu: 'Высший сорт, шлифованное',
    cookingTimeMin: '20–25 мин',
    glutenFree: true,
    proteinPer100g: 11.5,
    culinaryEquivalentId: 'millet_yellow'
  },
  semolina: {
    varietyRu: 'Манная крупа пшеничная (марка Т)',
    ingredients: 'Крупка из центральной части эндосперма твёрдой пшеницы (0.25–0.75 мм)',
    preparationMethod: 'Сортовой помол пшеницы с ситовым отбором крупки',
    purpose: 'Варка молочной манной каши, манника, запеканок, клёцек и панировки',
    productShapeRu: 'Сверхмелкая однородная светло-кремовая крупка',
    grainGradeRu: 'Марка Т (из твёрдой пшеницы)',
    cookingTimeMin: '3–5 мин',
    proteinPer100g: 10.3,
    culinaryEquivalentId: 'semolina_wheat'
  },
  bulgur: {
    varietyRu: 'Булгур золотистый крупный',
    ingredients: 'Пропаренное, высушенное и дроблёное зерно твёрдой пшеницы (дурум)',
    preparationMethod: 'Пропаривание цельного зерна, солнечная сушка и калиброванное дробление',
    purpose: 'Восточный плов из булгура, салат табуле, фаршированные перцы и гарниры',
    productShapeRu: 'Крупные янтарные дроблёные гранулы (Пилавлик)',
    grainGradeRu: 'Крупный для плова (Pilavlik)',
    cookingTimeMin: '12–15 мин',
    proteinPer100g: 12.3,
    culinaryEquivalentId: 'bulgur_golden'
  },
  couscous: {
    varietyRu: 'Кускус марокканский пшеничный',
    ingredients: 'Семолина (крупка твёрдой пшеницы), фильтрованная вода',
    preparationMethod: 'Увлажнение семолины, скатывание в мелкие шарики, пропаривание и сушка',
    purpose: 'Мгновенный рассыпчатый гарнир к мясу, овощам и тажинам (заваривается кипятком)',
    productShapeRu: 'Мелкие равномерные золотистые шарики (Ø 1.2 мм)',
    grainGradeRu: 'Средний калибр (Medium), быстрого приготовления',
    cookingTimeMin: '5 мин (запаривание кипятком)',
    proteinPer100g: 12.8,
    culinaryEquivalentId: 'couscous_moroccan'
  },
  corn_grits: {
    varietyRu: 'Кукурузная крупа шлифованная (Полента)',
    ingredients: 'Дроблёный эндосперм спелых зёрен жёлтой кремнистой кукурузы',
    preparationMethod: 'Отделение зародыша и оболочки, дробление и ситовая шлифовка',
    purpose: 'Итальянская полента с сыром, молдавская мамалыга, каша банош и хрустящая панировка',
    productShapeRu: 'Ярко-жёлтые шлифованные крупинки среднего помола',
    grainGradeRu: 'Шлифованная №4, без глютена',
    cookingTimeMin: '15–20 мин',
    glutenFree: true,
    proteinPer100g: 8.3,
    culinaryEquivalentId: 'corn_grits_polenta'
  },
  quinoa: {
    varietyRu: 'Киноа триколор отборная',
    ingredients: 'Семена высокогорной псевдозлаковой культуры киноа (белая, красная, чёрная)',
    preparationMethod: 'Промывка от природных сапонинов, сушка и купажирование трёх сортов',
    purpose: 'Белковые гарниры, боулы, тёплые салаты и диетические каши',
    productShapeRu: 'Крошечные плоские диски-семена с белым «хвостиком» при варке',
    grainGradeRu: 'Премиум Триколор, без глютена',
    cookingTimeMin: '15 мин',
    glutenFree: true,
    proteinPer100g: 14.1,
    culinaryEquivalentId: 'quinoa_white_tricolor'
  },
  peas_dry: {
    varietyRu: 'Горох колотый шлифованный жёлтый',
    ingredients: 'Очищенные сушёные семядоли спелого посевного гороха',
    preparationMethod: 'Шелушение кожуры, скалывание на половинки и полировка',
    purpose: 'Наваристый гороховый суп с копчёностями и густая гороховая каша-пюре',
    productShapeRu: 'Колотые гладкие полусферы жёлтого цвета',
    grainGradeRu: 'Высший сорт, колотый шлифованный',
    cookingTimeMin: '40–50 мин',
    glutenFree: true,
    proteinPer100g: 23.0,
    culinaryEquivalentId: 'peas_split_yellow'
  },
  beans_dry: {
    varietyRu: 'Фасоль зерновая сухая',
    ingredients: 'Зрелые высушенные бобы пищевой фасоли (Phaseolus vulgaris)',
    preparationMethod: 'Обмолот стручков, сушка и калибровка отборных бобов',
    purpose: 'Борщ с фасолью, лобио, чили кон карне, рагу и белковые салаты',
    productShapeRu: 'Крупные гладкие почковидные бобы',
    grainGradeRu: 'Отборная калиброванная, без глютена',
    cookingTimeMin: '60–75 мин (после замачивания)',
    glutenFree: true,
    proteinPer100g: 21.6,
    culinaryEquivalentId: 'beans_red_kidney'
  },
  lentils: {
    varietyRu: 'Чечевица пищевая отборная',
    ingredients: 'Плоские сушёные семена чечевицы пищевой',
    preparationMethod: 'Очистка, калибровка и бережная шлифовка',
    purpose: 'Густые чечевичные супы-пюре, индийский дал и сытные гарниры',
    productShapeRu: 'Плоские линзовидные зёрна',
    grainGradeRu: 'Отборная, богата белком и железом',
    cookingTimeMin: '15–25 мин',
    glutenFree: true,
    proteinPer100g: 24.2,
    culinaryEquivalentId: 'lentils_red_dry'
  },
  chickpeas: {
    varietyRu: 'Нут крупный турецкий (Гарбанзо)',
    ingredients: 'Крупные зёрна бараньего гороха (Cicer arietinum)',
    preparationMethod: 'Солнечная сушка и калибровка крупных зёрен (8–9 мм)',
    purpose: 'Узбекский плов, шурпа, домашний хумус с тахини и фалафель',
    productShapeRu: 'Крупные округлые бугристые зёрна с характерным «носиком»',
    grainGradeRu: 'Крупнокалиберный (8–9 мм), без глютена',
    cookingTimeMin: '60–80 мин (после замачивания)',
    glutenFree: true,
    proteinPer100g: 19.3,
    culinaryEquivalentId: 'chickpeas_garbanzo_dry'
  },
  mung_beans: {
    varietyRu: 'Маш зелёный отборный (бобы мунг)',
    ingredients: 'Цельные мелкие семена золотистой фасоли (Vigna radiata)',
    preparationMethod: 'Обмолот, очистка и естественная сушка бобов',
    purpose: 'Среднеазиатский суп машхурда, плов машкичири, проращивание и овощные карри',
    productShapeRu: 'Мелкие глянцевые бочонки насыщенного зелёного цвета',
    grainGradeRu: 'Отборный цельный, без глютена',
    cookingTimeMin: '30–35 мин (без замачивания)',
    glutenFree: true,
    proteinPer100g: 23.8,
    culinaryEquivalentId: 'mung_beans_green'
  },
  pasta: {
    varietyRu: 'Макаронные изделия из твёрдой пшеницы',
    ingredients: 'Мука из твёрдых сортов пшеницы (дурум), очищенная питьевая вода',
    preparationMethod: 'Замес крутого пресного теста, экструзия через матрицы и низкотемпературная сушка',
    purpose: 'Варка гарниров аль денте, пасты с соусами, запеканок и домашних супов',
    productShapeRu: 'Классическая формованная паста',
    pastaShapeId: 'penne',
    grainGradeRu: 'Группа А, высший сорт (дурум)',
    surfaceTextureRu: 'Плотная упругая, не разваривается',
    cookingTimeMin: '8–10 мин',
    proteinPer100g: 13.0,
    culinaryEquivalentId: 'pasta_penne_rigate'
  },
  spice_dry: {
    varietyRu: 'Молотая пряность и сушёные травы',
    ingredients: 'Высушенные плоды перца, коренья, кора и душистые огородные травы',
    preparationMethod: 'Теневая сушка и холодный жерновой помол для сохранения эфирных масел',
    purpose: 'Придание блюдам, супам и фаршу яркого аромата и остроты',
    culinaryEquivalentId: 'black_pepper_ground'
  },
  sugar: {
    varietyRu: 'Белый кристаллический свекловичный',
    ingredients: 'Корнеплоды сахарной свёклы (сахароза 99.8%)',
    preparationMethod: 'Диффузионная вытяжка, очистка сиропа и вакуумная кристаллизация',
    purpose: 'Подслащивание напитков, выпечка, варка варенья и мармелада',
    culinaryEquivalentId: 'sugar'
  },
  flour: {
    varietyRu: 'Пшеничная хлебопекарная высшего сорта',
    ingredients: 'Отборное эндоспермовое зерно мягкой и твёрдой пшеницы',
    preparationMethod: 'Вальцовый многоступенчатый помол и просеивание через шёлковые сита',
    purpose: 'Замешивание пельменного, хлебного и сдобного теста',
    culinaryEquivalentId: 'flour'
  },
  salt: {
    varietyRu: 'Каменная поваренная пищевая (помол №1)',
    ingredients: 'Природный минерал галит (хлорид натрия NaCl 98.5%)',
    preparationMethod: 'Шахтная добыча каменной соли, дробление и грохочение',
    purpose: 'Базовая приправа ко всем блюдам, засолка рыбы, сала, икры и овощей',
    culinaryEquivalentId: 'salt'
  },
  food_acid: {
    varietyRu: 'Лимонная кристаллическая (E330)',
    ingredients: 'Очищенная лимонная или яблочная органическая кислота пищевой чистоты',
    preparationMethod: 'Биосинтез из сахаристого сырья и перекристаллизация в гранулы',
    purpose: 'Регулирование кислотности мармелада, напитков и домашних консерваций',
    culinaryEquivalentId: 'citric_acid'
  },
  food_dye: {
    varietyRu: 'Натуральный растительный пигмент',
    ingredients: 'Концентрированная вытяжка красящих антоцианов, каротина или хлорофилла из ягод и трав',
    preparationMethod: 'Водно-спиртовая экстракция и бережное сгущение пигмента',
    purpose: 'Окрашивание домашнего мармелада, кремов, глазури и напитков',
    culinaryEquivalentId: 'dye_carmine'
  },
  botanical_extract: {
    varietyRu: 'Натуральная плодово-травяная вытяжка',
    ingredients: 'Плоды, ягоды, хвоя, мята и целебные коренья на водно-глицериновой основе',
    preparationMethod: 'Мацерация и перколяция растительного сырья с вакуумным концентрированием',
    purpose: 'Ароматизация и обогащение мармелада, чая и десертов витаминами'
  },
  essential_oil: {
    varietyRu: 'Натуральное эфирное масло первого отжима',
    ingredients: 'Цедра цитрусовых, листья перечной мяты, хвоя пихты или бутоны гвоздики',
    preparationMethod: 'Паровая дистилляция и холодное прессование эфиромасличного сырья',
    purpose: 'Придание яркого природного аромата кондитерским изделиям и напиткам'
  },
  medical_solution: {
    varietyRu: 'Антисептический и перевязочный раствор',
    ingredients: 'Очищенная вода, фармакопейное действующее вещество (антисептик / анальгетик)',
    preparationMethod: 'Стерильное фармацевтическое приготовление по аптечной прописи',
    purpose: 'Оказание первой медицинской помощи, дезинфекция ран и снятие боли',
    medicalEffectId: 'antiseptic'
  }
};

export const LEGACY_LIQUID_TO_GENERIC_MAP: Record<string, { liquidId: LiquidId; attributes: FluidSubstanceAttributes }> = {
  mineral_water: {
    liquidId: 'water',
    attributes: {
      varietyRu: 'Минеральная лечебно-столовая газированная',
      ingredients: 'Природная подземная минеральная вода скважинного розлива, природный углекислый газ',
      preparationMethod: 'Добыча с глубинного водоносного горизонта и сатурация',
      purpose: 'Утоление жажды и восстановление солевого баланса',
      customEffects: { thirst: 40, energy: 5, soothePanic: 25 },
      customTasteMessages: ['Освежающая минералка с колючими пузырьками газа!']
    }
  },
  tea_green: {
    liquidId: 'tea',
    attributes: {
      varietyRu: 'Зелёный листовой (Сенча)',
      ingredients: 'Неферментированный зелёный чайный лист пропаренной фиксации, мягкая вода',
      preparationMethod: 'Заваривание при температуре 80°C для сохранения антиоксидантов',
      purpose: 'Тонизирующий напиток, мягко снимающий усталость и стресс',
      culinaryEquivalentId: 'tea_green',
      customEffects: { thirst: 40, energy: 15, health: 5, soothePanic: 30 },
      customTasteMessages: ['Тонкий травянистый аромат свежезаваренного зелёного чая.']
    }
  },
  milk_raw: {
    liquidId: 'milk',
    attributes: {
      varietyRu: 'Парное деревенское цельное (4.5%)',
      ingredients: 'Свежевыдоенное цельное фермерское коровье молоко со сливками',
      preparationMethod: 'Утренняя дойка и процеживание через марлю без сепарации',
      purpose: 'Сытное питьё, сбивание масла, варка каш и приготовление творога',
      culinaryEquivalentId: 'milk_raw',
      customEffects: { thirst: 35, hunger: 22, health: 10, energy: 15, soothePanic: 25 },
      customTasteMessages: ['Густое деревенское парное молоко со сливочной пенкой!']
    }
  },
  coconut_milk: {
    liquidId: 'milk',
    attributes: {
      varietyRu: 'Кокосовое сливочное молоко (18%)',
      ingredients: 'Перетёртая белая мякоть зрелого кокосового ореха, фильтрованная вода',
      preparationMethod: 'Горячее прессование кокосовой копры с получением густой эмульсии',
      purpose: 'Приготовление сливочных супов, карри, десертов и нежного мармелада',
      culinaryEquivalentId: 'coconut_milk',
      customEffects: { thirst: 25, hunger: 20, energy: 12, soothePanic: 20 },
      customTasteMessages: ['Нежное бархатистое кокосовое молоко со сливочным тропическим вкусом!']
    }
  },
  cream_heavy: {
    liquidId: 'dairy_fermented',
    attributes: {
      varietyRu: 'Сливки деревенские густые (33%)',
      ingredients: 'Высокожирные сливки из цельного коровьего молока',
      preparationMethod: 'Сепарирование парного молока и охлаждение для созревания',
      purpose: 'Добавление в кофе, взбивание крема, сливочные соусы и супы-пюре',
      culinaryEquivalentId: 'cream_heavy',
      customEffects: { thirst: 15, hunger: 40, energy: 25, health: 8, soothePanic: 25 },
      customTasteMessages: ['Густые сладкие деревенские сливки 33% жирности.']
    }
  },
  sour_cream: {
    liquidId: 'dairy_fermented',
    attributes: {
      varietyRu: 'Сметана домашняя густая (20%)',
      ingredients: 'Пастеризованные коровьи сливки, закваска молочнокислых стрептококков',
      preparationMethod: 'Ферментация густых сливок и холодное созревание до густоты ложки',
      purpose: 'Подача к пельменям, борщу, щам, блинам и тушение мяса или грибов',
      culinaryEquivalentId: 'sour_cream',
      customEffects: { thirst: 10, hunger: 35, energy: 20, health: 8, soothePanic: 25 },
      customTasteMessages: ['Густая прохладная сметана со сливочной кислинкой!']
    }
  },
  kefir: {
    liquidId: 'dairy_fermented',
    attributes: {
      varietyRu: 'Кефир живой на кефирных грибках (3.2%)',
      ingredients: 'Цельное коровье молоко, симбиотическая закваска кефирных грибков',
      preparationMethod: 'Смешанное молочнокислое и спиртовое брожение молока',
      purpose: 'Освежающий кисломолочный напиток, улучшающий пищеварение, и основа для оладий',
      culinaryEquivalentId: 'kefir',
      customEffects: { thirst: 35, hunger: 20, health: 12, soothePanic: 25 },
      customTasteMessages: ['Густой освежающий кефир приятно покалывает язык.']
    }
  },
  cottage_cheese: {
    liquidId: 'dairy_fermented',
    attributes: {
      varietyRu: 'Творог домашний рассыпчатый (9%)',
      ingredients: 'Цельное сквашенное коровье молоко (простокваша)',
      preparationMethod: 'Томление простокваши в печи и отцеживание сыворотки в полотняном мешочке',
      purpose: 'Сытный белковый завтрак, начинка для вареников и сырников',
      culinaryEquivalentId: 'cottage_cheese',
      customEffects: { hunger: 35, energy: 18, health: 10, soothePanic: 20 },
      customTasteMessages: ['Нежный кисловато-сливочный вкус рассыпчатого домашнего творога.']
    }
  },
  yogurt: {
    liquidId: 'dairy_fermented',
    attributes: {
      varietyRu: 'Йогурт натуральный греческий',
      ingredients: 'Отборное коровье молоко, культуры болгарской палочки и термофильного стрептококка',
      preparationMethod: 'Термостатное сквашивание с отцеживанием лишней сыворотки',
      purpose: 'Лёгкий перекус, заправка фруктовых и овощных салатов, основа для соусов',
      culinaryEquivalentId: 'yogurt',
      customEffects: { hunger: 24, thirst: 18, health: 10, energy: 12 },
      customTasteMessages: ['Нежный сливочный йогурт с приятной освежающей кислинкой.']
    }
  },
  yeast_liquid: {
    liquidId: 'dairy_fermented',
    attributes: {
      varietyRu: 'Живая хлебная дрожжевая закваска',
      ingredients: 'Ржаная и пшеничная обдирная мука, тёплая родниковая вода, дикие культуры дрожжей (Saccharomyces)',
      preparationMethod: 'Многодневное спонтанное сбраживание мучной болтушки с подкормкой',
      purpose: 'Выпечка пышного домашнего хлеба, пирогов и блинов, постановка браги',
      culinaryEquivalentId: 'yeast_liquid'
    }
  },
  wine_white: {
    liquidId: 'wine',
    attributes: {
      varietyRu: 'Белое сухое (Совиньон Блан / Шардоне)',
      ingredients: 'Ферментированный сок светлых сортов винограда без кожицы',
      preparationMethod: 'Холодное брожение осветлённого виноградного сусла в стальных чанах',
      purpose: 'Подача к рыбе и птице, приготовление ризотто и белых соусов',
      culinaryEquivalentId: 'wine_white',
      customEffects: { thirst: 20, alcohol: 12, soothePanic: 35 },
      customTasteMessages: ['Освежающий букет белого сухого вина с цитрусовой кислинкой.']
    }
  },
  wine_red: {
    liquidId: 'wine',
    attributes: {
      varietyRu: 'Красное сухое (Каберне / Саперави)',
      ingredients: 'Ферментированный виноград тёмных сортов с косточкой и кожицей',
      preparationMethod: 'Мацерация на мезге и длительная выдержка в дубовых бочках',
      purpose: 'Подача к стейкам и дичи, тушение говядины и варка пряного глинтвейна',
      culinaryEquivalentId: 'wine_red',
      customEffects: { thirst: 15, alcohol: 12, soothePanic: 35 },
      customTasteMessages: ['Терпкий рубиновый вкус выдержанного красного сухого вина.']
    }
  },
  honey_wild: {
    liquidId: 'honey',
    attributes: {
      varietyRu: 'Дикий бортевой таёжный мёд',
      ingredients: 'Нектар лесного кипрея, малины, вереска и хвойная падь диких пчёл',
      preparationMethod: 'Ручной сбор диких сотов из бортей и отжим без нагрева',
      purpose: 'Укрепление иммунитета, лечение простуды и целебное лакомство',
      culinaryEquivalentId: 'honey_wild',
      customEffects: { hunger: 50, energy: 40, health: 18, soothePanic: 35 },
      customTasteMessages: ['Терпкий дикий бортевой мёд с ароматом таёжного разнотравья и смолы!']
    }
  },
  honey_buckwheat: {
    liquidId: 'honey',
    attributes: {
      varietyRu: 'Гречишный тёмный пасечный мёд',
      ingredients: 'Нектар цветущих полей посевной гречихи (богат железом и белком)',
      preparationMethod: 'Центробежная откачка тёмных запечатанных рамок',
      purpose: 'Восстановление сил при малокровии, пряная выпечка и медовые маринады',
      culinaryEquivalentId: 'honey_buckwheat',
      customEffects: { hunger: 48, energy: 38, health: 16, soothePanic: 30 },
      customTasteMessages: ['Густой тёмный гречишный мёд с благородной горчинкой приятно першит в горле.']
    }
  },
  maple_syrup: {
    liquidId: 'syrup_sweet',
    attributes: {
      varietyRu: 'Кленовый янтарный сироп (Grade A)',
      ingredients: 'Уваренный весенний сок сахарного и остролистного клёна (100%)',
      preparationMethod: 'Собирание кленового сока и выпаривание в 40 раз на дровяном огне',
      purpose: 'Поливка блинов, оладий, каш и карамельная глазурь для запекания мяса',
      culinaryEquivalentId: 'maple_syrup',
      customEffects: { hunger: 40, energy: 35, soothePanic: 25 },
      customTasteMessages: ['Сладкий древесно-карамельный кленовый сироп.']
    }
  },
  condensed_milk: {
    liquidId: 'syrup_sweet',
    attributes: {
      varietyRu: 'Сгущённое цельное молоко с сахаром (8.5%)',
      ingredients: 'Цельное коровье молоко, сливки, сахар-песок (сахароза 43.5%)',
      preparationMethod: 'Вакуумное сгущение молока с сахаром по классическому ГОСТу',
      purpose: 'Лакомство в походах, добавка в горячий чай и кофе, крем для тортов',
      culinaryEquivalentId: 'condensed_milk',
      customEffects: { hunger: 50, energy: 35, health: 6, soothePanic: 40 },
      customTasteMessages: ['Тягучая кремовая сгущёнка ГОСТ — любимое сладкое лакомство!']
    }
  },
  glucose_syrup: {
    liquidId: 'syrup_sweet',
    attributes: {
      varietyRu: 'Кондитерский глюкозный сироп (DE 42)',
      ingredients: 'Очищенный кукурузный и пшеничный крахмал, артезианская вода',
      preparationMethod: 'Ферментативный гидролиз крахмала и вакуумное уваривание до прозрачной вязкости',
      purpose: 'Предотвращение засахаривания мармелада, карамели и глянцевой глазури',
      culinaryEquivalentId: 'glucose_syrup'
    }
  },
  corn_molasses: {
    liquidId: 'syrup_sweet',
    attributes: {
      varietyRu: 'Крахмальная карамельная патока',
      ingredients: 'Кукурузный крахмал, мальтоза, декстрины, глюкоза',
      preparationMethod: 'Кислотно-ферментативное осахаривание крахмального молока',
      purpose: 'Придание тягучести и упругости жевательному мармеладу, нуге и пряникам',
      culinaryEquivalentId: 'corn_molasses'
    }
  },
  topinambur_syrup: {
    liquidId: 'syrup_sweet',
    attributes: {
      varietyRu: 'Натуральный инулиновый сироп топинамбура',
      ingredients: 'Клубни земляной груши (топинамбура), родниковая вода, лимонный сок',
      preparationMethod: 'Холодный отжим сока клубней и бережное вакуумное выпаривание при 55°C',
      purpose: 'Полезный природный подсластитель с низким гликемическим индексом для десертов и мармелада',
      culinaryEquivalentId: 'topinambur_syrup'
    }
  },
  broth_beef: {
    liquidId: 'broth',
    attributes: {
      varietyRu: 'Говяжий костный наваристый бульон',
      ingredients: 'Мозговые говяжьи кости, грудинка, лук, печёная морковь, сельдерей, лавровый лист, чёрный перец',
      preparationMethod: 'Шестичасовое томление обожжённых костей и мяса со снятием пены',
      purpose: 'Сытное горячее блюдо и основа для борща, солянки и пельменей',
      culinaryEquivalentId: 'broth_beef',
      customEffects: { hunger: 60, thirst: 35, energy: 25, health: 18, soothePanic: 45 },
      customTasteMessages: ['Густой наваристый костный говяжий бульон с янтарным жирком!']
    }
  },
  broth_chicken: {
    liquidId: 'broth',
    attributes: {
      varietyRu: 'Куриный золотистый домашний бульон',
      ingredients: 'Домашняя курица на кости, репчатый лук, морковь, свежий укроп, душистый перец, соль',
      preparationMethod: 'Медленная варка при едва заметном кипении для прозрачности бульона',
      purpose: 'Лечебное согревающее питьё при простуде и основа для лапши',
      culinaryEquivalentId: 'broth_chicken',
      customEffects: { hunger: 50, thirst: 40, energy: 20, health: 16, soothePanic: 40 },
      customTasteMessages: ['Прозрачный золотистый куриный бульон с укропом согревает изнутри!']
    }
  },
  broth_fish: {
    liquidId: 'broth',
    attributes: {
      varietyRu: 'Рыбный бульон (Костровая юшка / Уха)',
      ingredients: 'Головы, плавники и филе речной щуки, окуня и судака, лук, корень петрушки, лавровый лист, перец горошком',
      preparationMethod: 'Двойная варка мелкой и крупной речной рыбы в котелке с дымком',
      purpose: 'Ароматная рыбацкая уха и основа для рыбных супов и заливного',
      culinaryEquivalentId: 'broth_fish',
      customEffects: { hunger: 50, thirst: 35, energy: 18, health: 15, soothePanic: 35 },
      customTasteMessages: ['Наваристая костровая уха из свежей рыбы с лавровым листом и дымком!']
    }
  },
  broth_vegetable: {
    liquidId: 'broth',
    attributes: {
      varietyRu: 'Овощной пряный отвар на кореньях',
      ingredients: 'Морковь, корень сельдерея и пастернака, репчатый лук, чеснок, стебли петрушки и укропа',
      preparationMethod: 'Томление запечённых корнеплодов и свежей зелени в родниковой воде',
      purpose: 'Лёгкая диетическая основа для овощных супов, ризотто и тушения',
      culinaryEquivalentId: 'broth_vegetable',
      customEffects: { hunger: 35, thirst: 45, energy: 15, health: 12, soothePanic: 30 },
      customTasteMessages: ['Лёгкий ароматный отвар моркови, сельдерея, лука и пряных трав.']
    }
  },
  broth_mushroom: {
    liquidId: 'broth',
    attributes: {
      varietyRu: 'Грибной лесной бульон из белых грибов',
      ingredients: 'Сушёные и свежие белые грибы (боровики), подосиновики, лук, тимьян, сметана и соль',
      preparationMethod: 'Замачивание и долгое вываривание лесных грибов для тёмного навара',
      purpose: 'Душистая грибная похлёбка и основа для лесных соусов и жульенов',
      culinaryEquivalentId: 'broth_mushroom',
      customEffects: { hunger: 55, thirst: 30, energy: 20, health: 15, soothePanic: 40 },
      customTasteMessages: ['Тёмный густой бульон с неповторимым лесным ароматом белых грибов!']
    }
  },
  caviar_red: {
    liquidId: 'caviar',
    attributes: {
      varietyRu: 'Красная лососевая зернистая (Горбуша / Кета)',
      ingredients: 'Зернистая икра дальневосточных лососевых рыб (кета, горбуша), соль поваренная 3.2%, масло растительное',
      preparationMethod: 'Малосольный бочковой посол свежей икры первого сорта',
      purpose: 'Праздничный деликатес для бутербродов со сливочным маслом и блинов',
      culinaryEquivalentId: 'caviar_red',
      customEffects: { hunger: 65, energy: 30, health: 25, soothePanic: 50 },
      customTasteMessages: ['Крупные янтарные икринки лосося упруго лопаются на языке!']
    }
  },
  caviar_black: {
    liquidId: 'caviar',
    attributes: {
      varietyRu: 'Чёрная осетровая зернистая (Белуга / Осётр)',
      ingredients: 'Отборная зернистая икра каспийского осетра и белуги, соль мелкого помола',
      preparationMethod: 'Традиционный малосольный астраханский посол через решётку-грохотку',
      purpose: 'Редчайший питательный деликатес, восстанавливающий силы и настроение',
      culinaryEquivalentId: 'caviar_black',
      customEffects: { hunger: 70, energy: 35, health: 30, soothePanic: 60 },
      customTasteMessages: ['Изысканный бархатный орехово-сливочный вкус чёрной осетровой икры!']
    }
  },
  caviar_pike: {
    liquidId: 'caviar',
    attributes: {
      varietyRu: 'Щучья янтарная речная икра',
      ingredients: 'Зернистая икра речной щуки весеннего улова, каменная соль, капля подсолнечного масла',
      preparationMethod: 'Ошпаривание горячим рассолом и холодное созревание с маслом',
      purpose: 'Традиционная русская закуска на гренках со сметаной и зелёным луком',
      culinaryEquivalentId: 'caviar_pike',
      customEffects: { hunger: 55, energy: 25, health: 20, soothePanic: 40 },
      customTasteMessages: ['Мелкая золотистая щучья икра с нежным малосольным вкусом!']
    }
  },
  caviar_cod: {
    liquidId: 'caviar',
    attributes: {
      varietyRu: 'Пробойная солёная икра трески и минтая',
      ingredients: 'Икра северной трески и охотоморского минтая, соль, подсолнечное масло',
      preparationMethod: 'Пробивка зрелых ястыков и пастеризация в банках с растительным маслом',
      purpose: 'Сытная белковая намазка на хлеб и ингредиент для рыбных закусок',
      culinaryEquivalentId: 'caviar_cod',
      customEffects: { hunger: 50, energy: 22, health: 18, soothePanic: 35 },
      customTasteMessages: ['Нежная паштетная текстура икры трески с морским солоноватым вкусом.']
    }
  },
  caviar_squash: {
    liquidId: 'caviar',
    attributes: {
      varietyRu: 'Кабачковая овощная икра (ГОСТ)',
      ingredients: 'Обжаренные молодые кабачки, пассерованная морковь, репчатый лук, томатная паста, подсолнечное масло, чеснок, соль, перец',
      preparationMethod: 'Обжарка овощей в масле, тонкое протирание и долгое уваривание в котле',
      purpose: 'Готовая овощная закуска, намазка на свежий хлеб и гарнир к мясу',
      culinaryEquivalentId: 'caviar_squash',
      customEffects: { hunger: 45, energy: 20, health: 12, soothePanic: 30 },
      customTasteMessages: ['Любимая с детства нежная уваренная кабачковая икра с морковью и томатом!']
    }
  },
  caviar_eggplant: {
    liquidId: 'caviar',
    attributes: {
      varietyRu: 'Баклажанная икра томлёная («Заморская»)',
      ingredients: 'Печёные на углях баклажаны, сладкий болгарский перец, спелые томаты, лук, чеснок, кинза, подсолнечное масло',
      preparationMethod: 'Запекание баклажанов до дымной корочки, рубка и томление с томатами',
      purpose: 'Пряная овощная закуска и сытный гарнир к шашлыку и горячим блюдам',
      culinaryEquivalentId: 'caviar_eggplant',
      customEffects: { hunger: 48, energy: 22, health: 14, soothePanic: 30 },
      customTasteMessages: ['Пряная баклажанная икра с печёным перцем, томатом и чесночком!']
    }
  },
  vegetable_caviar: {
    liquidId: 'caviar',
    attributes: {
      varietyRu: 'Икра овощная/грибная домашнего томления',
      ingredients: 'Томлёные овощи и лесные грибы, жареный лук, морковь, томатная паста, растительное масло, пряности',
      preparationMethod: 'Медленное уваривание измельчённых овощей и грибов с пряным маслом',
      purpose: 'Сытная домашняя закуска в банке для бутербродов и гарниров',
      culinaryEquivalentId: 'caviar_squash'
    }
  },
  jam_raspberry: {
    liquidId: 'jam',
    attributes: {
      varietyRu: 'Малиновое домашнее варенье',
      ingredients: 'Свежая лесная и садовая малина (60%), сахарный песок (40%)',
      preparationMethod: 'Бережная варка-пятиминутка в собственном малиновом соку с сахаром',
      purpose: 'Первое средство от простуды и переохлаждения с горячим чаем',
      culinaryEquivalentId: 'jam_raspberry',
      customEffects: { hunger: 42, energy: 32, health: 16, soothePanic: 35 },
      customTasteMessages: ['Душистое малиновое варенье отлично сбивает простуду и согревает!']
    }
  },
  jam_strawberry: {
    liquidId: 'jam',
    attributes: {
      varietyRu: 'Клубничное варенье с цельными ягодами',
      ingredients: 'Отборная садовая земляника (клубника), сахар-песок, капля лимонного сока',
      preparationMethod: 'Трёхкратная выстойка ягод в сиропе с коротким увариванием для сохранения формы ягод',
      purpose: 'Десерт к чаю, начинка для пирогов, блинов и оладий',
      culinaryEquivalentId: 'jam_strawberry',
      customEffects: { hunger: 42, energy: 30, health: 10, soothePanic: 35 },
      customTasteMessages: ['Цельные сладкие ягоды клубники в густом рубиновом сиропе!']
    }
  },
  jam_blueberry: {
    liquidId: 'jam',
    attributes: {
      varietyRu: 'Черничное таёжное густое варенье',
      ingredients: 'Дикорастущая таёжная черника ручного сбора, сахар-песок',
      preparationMethod: 'Уваривание черники на медленном огне до желирования природного пектина',
      purpose: 'Восстановление сил и остроты зрения, сладкая начинка для выпечки',
      culinaryEquivalentId: 'jam_blueberry',
      customEffects: { hunger: 40, energy: 30, health: 15, soothePanic: 35 },
      customTasteMessages: ['Густое тёмное варенье из дикой лесной черники с терпкой сладостью!']
    }
  },
  berries: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Свежие дикие лесные ягоды (ассорти)',
      ingredients: 'Свежесобранная лесная черника, таёжная брусника, земляника и костяника',
      preparationMethod: 'Ручной сбор спелых лесных ягод в плетёное лукошко и переборка от хвои',
      purpose: 'Еда в свежем виде, варка варенья, компотов, морсов и начинки для пирогов',
      culinaryEquivalentId: 'berries',
      customEffects: { hunger: 25, thirst: 20, health: 15, energy: 15, soothePanic: 25 },
      customTasteMessages: ['Горсть сочных сладких лесных ягод освежает и бодрит!']
    }
  },
  berries_blueberry: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Свежая лесная черника',
      ingredients: 'Спелые тёмно-синие ягоды дикорастущей лесной черники с сизым налётом',
      preparationMethod: 'Бережный сбор в сосновом бору без повреждения нежной кожицы',
      purpose: 'Еда горстями, приготовление черничного варенья, вареников и мармелада',
      culinaryEquivalentId: 'berries_blueberry',
      customEffects: { hunger: 25, thirst: 20, health: 16, energy: 15, soothePanic: 25 },
      customTasteMessages: ['Горсть сладкой лесной черники приятно красит язык в фиолетовый цвет!']
    }
  },
  berries_lingonberry: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Таёжная брусника (свежая / мочёная)',
      ingredients: 'Плотные алые ягоды дикой брусники, богатые природной бензойной кислотой',
      preparationMethod: 'Сбор зрелой осенней брусники и хранение в собственном соку',
      purpose: 'Витаминный перекус, соус к дичи и мясу, морсы и пироги',
      culinaryEquivalentId: 'berries_lingonberry',
      customEffects: { hunger: 22, thirst: 22, health: 18, energy: 15, soothePanic: 25 },
      customTasteMessages: ['Горьковато-кислый освежающий дикий вкус таёжной брусники!']
    }
  },
  berries_cranberry: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Болотная крупная клюква',
      ingredients: 'Свежие упругие ягоды верховой болотной клюквы (источник витамина C)',
      preparationMethod: 'Осенний сбор на торфяных мхах после первых заморозков',
      purpose: 'Приготовление кислых морсов от жара, киселей, соусов и мармелада',
      culinaryEquivalentId: 'berries_cranberry',
      customEffects: { hunger: 20, thirst: 25, health: 20, energy: 18, soothePanic: 25 },
      customTasteMessages: ['Резкий пронзительно-кислый витаминный взрыв болотной клюквы!']
    }
  },
  berries_raspberry: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Спелая лесная и садовая малина',
      ingredients: 'Душистые бархатистые ягоды спелой красной малины',
      preparationMethod: 'Сбор в сухую солнечную погоду прямо с куста в туесок',
      purpose: 'Лакомство в свежем виде, варка целебного малинового варенья и чая',
      culinaryEquivalentId: 'berries_raspberry',
      customEffects: { hunger: 28, thirst: 18, health: 16, energy: 16, soothePanic: 28 },
      customTasteMessages: ['Нежнейшие ароматные ягоды спелой малины тают во рту!']
    }
  },
  berries_strawberry: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Сочная садовая клубника и лесная земляника',
      ingredients: 'Спелые душистые ягоды красной клубники и полянной земляники',
      preparationMethod: 'Сбор спелых ягод с чашелистиками для сохранения сочности',
      purpose: 'Десерт со сливками и сметаной, варка клубничного варенья и джемов',
      culinaryEquivalentId: 'berries_strawberry',
      customEffects: { hunger: 30, thirst: 20, health: 14, energy: 16, soothePanic: 30 },
      customTasteMessages: ['Роскошный летний вкус спелой сладкой клубники!']
    }
  },
  mushrooms_chanterelle: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Свежие лесные рыжие лисички',
      ingredients: 'Плотные упругие плодовые тела лесных лисичек (Cantharellus cibarius)',
      preparationMethod: 'Сбор во мху хвойно-берёзового леса и сухая очистка от лесного сора',
      purpose: 'Жарка с картошкой и сметаной, грибные супы и маринование на зиму',
      culinaryEquivalentId: 'mushrooms_chanterelle',
      customEffects: { hunger: 25, health: 12, energy: 12, soothePanic: 20 },
      customTasteMessages: ['Упругие рыжие лисички с тонким фруктово-лесным ароматом.']
    }
  },
  mushrooms_honey_agaric: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Осенние лесные опята',
      ingredients: 'Молодые шляпки и ножки осенних пнёвых опят с нежной плёночкой',
      preparationMethod: 'Срезка дружных семейств с берёзовых пней и валежника',
      purpose: 'Засолка и маринование в банках, жарка с луком и варка грибной лапши',
      culinaryEquivalentId: 'mushrooms_honey_agaric',
      customEffects: { hunger: 25, health: 10, energy: 12, soothePanic: 20 },
      customTasteMessages: ['Упругие лесные опята с насыщенным грибным духом.']
    }
  },
  pickles_salted_mushrooms: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Грузди белые солёные в пряном рассоле',
      ingredients: 'Отборные белые и чёрные грузди, каменная соль, чеснок, зонтики укропа, лист смородины и дуба',
      preparationMethod: 'Трёхдневное вымачивание и сорокадневный холодный посол под гнётом',
      purpose: 'Царская лесная закуска под сметану с лучком и горячую картошку',
      culinaryEquivalentId: 'pickles_salted_mushrooms',
      customEffects: { hunger: 35, thirst: 15, health: 12, soothePanic: 25 },
      customTasteMessages: ['Хрустящий солёный груздь с пряным укропно-чесночным рассолом!']
    }
  },
  marinade: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Маринованные овощи и грибы',
      ingredients: 'Овощи или грибы, вода, уксус 9%, сахар, соль, лавровый лист, гвоздика, душистый перец, чеснок',
      preparationMethod: 'Заливка кипящим пряно-уксусным маринадом с герметичной закаткой',
      purpose: 'Пикантная кисло-пряная закуска к мясным блюдам и гарнирам',
      culinaryEquivalentId: 'pickles'
    }
  },
  olives: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Оливки и маслины в пряном рассоле',
      ingredients: 'Крупные плоды средиземноморской оливы без косточки, вода, морская соль, лимонная кислота',
      preparationMethod: 'Удаление природной горечи вымачиванием и ферментация в солевом рассоле',
      purpose: 'Ингредиент для мясной солянки, пиццы, салатов и самостоятельная закуска',
      culinaryEquivalentId: 'olives',
      customEffects: { hunger: 22, thirst: 4, soothePanic: 12 },
      customTasteMessages: ['Маслянистая упругая оливка в пикантном пряном рассоле!']
    }
  },
  capers: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Каперсы бутонные маринованные',
      ingredients: 'Нераспустившиеся цветочные бутоны колючего каперсника, винный уксус, вода, морская соль',
      preparationMethod: 'Подвяливание бутонов и выдержка в крепком винно-солевом маринаде',
      purpose: 'Острая пикантная приправа к солянке, тартару, рыбе и соусам',
      culinaryEquivalentId: 'capers',
      customEffects: { hunger: 12, thirst: -4, energy: 4 },
      customTasteMessages: ['Яркий горчично-винный взрыв маринованного бутона каперса!']
    }
  },
  sauerkraut: {
    liquidId: 'pickles',
    attributes: {
      varietyRu: 'Капуста белокочанная квашеная с морковью',
      ingredients: 'Тонко шинкованная поздняя белокочанная капуста, тёртая морковь, каменная соль, ягоды клюквы и тмин',
      preparationMethod: 'Молочнокислое брожение в собственном капустном соку под деревянным гнётом',
      purpose: 'Витаминная хрустящая закуска, основа для кислых щей, бигуса и пирогов',
      culinaryEquivalentId: 'sauerkraut',
      customEffects: { hunger: 26, thirst: 8, health: 10, energy: 6 },
      customTasteMessages: ['Хрустящая квашеная капуста с морковью и бодрящим кислым рассолом!']
    }
  },
  stew_meat: {
    liquidId: 'canned_preserve',
    attributes: {
      varietyRu: 'Говядина тушёная высший сорт (ГОСТ)',
      ingredients: 'Крупнокусковая жилованная говядина (87%), говяжий жир-сырец, лук репчатый, соль, лист лавровый, перец чёрный',
      preparationMethod: 'Закладка сырого мяса со специями в банки и автоклавное томление при 120°C',
      purpose: 'Сытное готовое мясное блюдо, основа для макарон по-флотски, каш и походного супа',
      culinaryEquivalentId: 'stew_meat',
      customEffects: { hunger: 75, energy: 25, health: 15, soothePanic: 35 },
      customTasteMessages: ['Сытные волокна тушёного мяса в ароматном желе и топлёном жирке!']
    }
  },
  fish_preserves: {
    liquidId: 'canned_preserve',
    attributes: {
      varietyRu: 'Рыба натуральная с добавлением масла (Сайра / Горбуша)',
      ingredients: 'Куски тихоокеанской сайры или горбуши, рафинированное растительное масло, соль, душистый перец, кориандр',
      preparationMethod: 'Бланширование рыбы паром, заливка пряным маслом и автоклавная стерилизация',
      purpose: 'Готовая рыбная закуска, основа для рыбного супа и салатов',
      culinaryEquivalentId: 'fish_preserves',
      customEffects: { hunger: 65, energy: 20, health: 14, soothePanic: 30 },
      customTasteMessages: ['Нежные кусочки рыбы в пряном ароматном масле!']
    }
  },
  canned_corn: {
    liquidId: 'canned_preserve',
    attributes: {
      varietyRu: 'Кукуруза сахарная консервированная в зёрнах',
      ingredients: 'Цельные зёрна сахарной кукурузы молочной спелости, питьевая вода, сахар, соль',
      preparationMethod: 'Бланширование свежих зёрен и вакуумная стерилизация в сладковатой заливке',
      purpose: 'Добавка в салаты, гарниры, супы и самостоятельный сочный перекус',
      culinaryEquivalentId: 'sweet_corn',
      customEffects: { hunger: 32, thirst: 12, energy: 8 },
      customTasteMessages: ['Сладкие сочные зёрнышки консервированной кукурузы лопаются на зубах!']
    }
  },
  canned_peas: {
    liquidId: 'canned_preserve',
    attributes: {
      varietyRu: 'Горошек зелёный мозговых сортов консервированный',
      ingredients: 'Свежий зелёный горошек мозговых сортов, вода, сахар, соль',
      preparationMethod: 'Щадящая стерилизация в банках в день сбора урожая',
      purpose: 'Классический ингредиент для салата Оливье, винегрета и гарнир к сосискам и мясу',
      culinaryEquivalentId: 'green_peas',
      customEffects: { hunger: 34, thirst: 10, energy: 6 },
      customTasteMessages: ['Нежный сладковатый зелёный горошек мозговых сортов в лёгкой заливке!']
    }
  },
  canned_beans: {
    liquidId: 'canned_preserve',
    attributes: {
      varietyRu: 'Фасоль красная в густом томатном соусе',
      ingredients: 'Отборная красная фасоль, томатная паста, вода, сахар, соль, паприка, чеснок, чёрный перец',
      preparationMethod: 'Томление набухшей фасоли под давлением в пряной томатной заливке',
      purpose: 'Сытный белковый гарнир, заправка для борща, лобио и чили',
      culinaryEquivalentId: 'beans_tomato',
      customEffects: { hunger: 48, thirst: 6, energy: 10 },
      customTasteMessages: ['Сытная мягкая фасоль в густом пряном томатном соусе!']
    }
  },
  peanut_butter: {
    liquidId: 'puree',
    attributes: {
      varietyRu: 'Арахисовая паста кремовая обжаренная',
      ingredients: 'Обжаренные ядра отборного арахиса (95%), капля арахисового масла, морская соль, мёд',
      preparationMethod: 'Сухая обжарка ядер арахиса и многократное перетирание на каменных жерновах до кремовой пасты',
      purpose: 'Высококалорийная питательная паста для тостов, каш и энергетических перекусов',
      culinaryEquivalentId: 'peanut_butter',
      customEffects: { hunger: 65, thirst: -10, energy: 18, soothePanic: 15 },
      customTasteMessages: ['Густая калорийная арахисовая паста обволакивает нёбо насыщенным ореховым вкусом!']
    }
  },
  tahini: {
    liquidId: 'puree',
    attributes: {
      varietyRu: 'Кунжутная паста Тахини (урбеч)',
      ingredients: 'Очищенные и бережно обжаренные семена белого кунжута (100%)',
      preparationMethod: 'Жерновое перетирание семян кунжута до выделения природного масла',
      purpose: 'Основа для хумуса, восточных соусов, халвы и сытных заправок',
      culinaryEquivalentId: 'tahini',
      customEffects: { hunger: 55, thirst: -8, energy: 14 },
      customTasteMessages: ['Бархатистая орехово-кунжутная паста с благородной горчинкой.']
    }
  },
  miso_paste: {
    liquidId: 'puree',
    attributes: {
      varietyRu: 'Паста Мисо соевая ферментированная (Ака-мисо)',
      ingredients: 'Отварные соевые бобы, рис и ячмень, морская соль, заквасочная культура кодзи (Aspergillus oryzae)',
      preparationMethod: 'Многомесячная ферментация размятых соевых бобов с солодовым грибком кодзи в кедровых бочках',
      purpose: 'Основа для согревающего мисо-супа, маринадов для рыбы и мяса, соусов умами',
      culinaryEquivalentId: 'miso_paste',
      customEffects: { hunger: 28, thirst: -12, health: 4 },
      customTasteMessages: ['Насыщенная солёно-умами паста мисо из ферментированных соевых бобов.']
    }
  },
  tomato_paste: {
    liquidId: 'puree',
    attributes: {
      varietyRu: 'Томатная паста концентрированная (25% сухих веществ)',
      ingredients: 'Уваренная протёртая мякоть спелых красных томатов без кожицы и семян, щепотка соли',
      preparationMethod: 'Протирание томатной пульпы и шестикратное вакуумное уваривание',
      purpose: 'База для борща, харчо, голубцов, тушёного мяса, пиццы и домашних соусов',
      culinaryEquivalentId: 'tomato_paste',
      customEffects: { hunger: 25, thirst: 4, health: 4 },
      customTasteMessages: ['Густая кисло-сладкая уваренная мякоть спелых томатов.']
    }
  },
  lard_pork: {
    liquidId: 'rendered_fat',
    attributes: {
      varietyRu: 'Свиной топлёный смалец (лярд)',
      ingredients: 'Нутряной и подкожный свиной жир-сырец, щепотка соли, чеснок и лавровый лист',
      preparationMethod: 'Медленное вытапливание сала в чугунке и процеживание белоснежного смальца',
      purpose: 'Жарка картофеля и мяса, смазка форм, сытная намазка на чёрный хлеб с чесноком',
      culinaryEquivalentId: 'lard_pork',
      customEffects: { hunger: 45, energy: 20 },
      customTasteMessages: ['Сытный домашний топлёный свиной смалец.']
    }
  },
  beef_tallow: {
    liquidId: 'rendered_fat',
    attributes: {
      varietyRu: 'Топлёный говяжий кулинарный жир',
      ingredients: 'Околопочечный говяжий жир-сырец высшего сорта',
      preparationMethod: 'Длительное вытапливание при умеренном нагреве и тонкая фильтрация',
      purpose: 'Жарка во фритюре при высоких температурах, приготовление плова и теста для самсы',
      culinaryEquivalentId: 'beef_tallow',
      customEffects: { hunger: 40, energy: 18 },
      customTasteMessages: ['Густой наваристый топлёный говяжий жир.']
    }
  },
  ghee: {
    liquidId: 'rendered_fat',
    attributes: {
      varietyRu: 'Топлёное сливочное масло Гхи (99% молочного жира)',
      ingredients: 'Натуральное сладкосливочное коровье масло 82.5% жирности',
      preparationMethod: 'Медленное томление сливочного масла с полным выпариванием воды и снятием молочного белка',
      purpose: 'Идеальное масло для жарки без дыма, заправки каш, пельменей и блинов',
      culinaryEquivalentId: 'ghee',
      customEffects: { hunger: 45, energy: 25, health: 8 },
      customTasteMessages: ['Благородный сливочно-ореховый вкус янтарного топлёного масла Гхи!']
    }
  },
  oil_sunflower: {
    liquidId: 'oil_culinary',
    attributes: {
      varietyRu: 'Подсолнечное масло золотистое',
      ingredients: 'Отборные семена масличного подсолнечника (100%)',
      preparationMethod: 'Прессовый отжим семян подсолнечника и бережная очистка',
      purpose: 'Жарка на сковороде, пассеровка овощей, заправка салатов и квашеной капусты',
      culinaryEquivalentId: 'oil_sunflower'
    }
  },
  oil_olive: {
    liquidId: 'oil_culinary',
    attributes: {
      varietyRu: 'Оливковое масло первого холодного отжима (Extra Virgin)',
      ingredients: 'Свежесобранные плоды средиземноморской оливы (Olea europaea)',
      preparationMethod: 'Первое механическое холодное прессование при температуре до 27°C',
      purpose: 'Заправка свежих салатов, пасты, маринадов и бережное томление блюд',
      culinaryEquivalentId: 'oil_olive',
      customEffects: { hunger: 25, health: 8 },
      customTasteMessages: ['Густой оливковый вкус с травянистым ароматом и благородной горчинкой.']
    }
  },
  oil_linseed: {
    liquidId: 'oil_culinary',
    attributes: {
      varietyRu: 'Льняное сыродавленное масло',
      ingredients: 'Семена масличного бурого и золотистого льна (богаты Омега-3)',
      preparationMethod: 'Холодный дубовый прессовый отжим без нагрева',
      purpose: 'Заправка варёного картофеля, каш, винегрета и укрепление сосудов',
      culinaryEquivalentId: 'oil_linseed',
      customEffects: { hunger: 20, health: 10 },
      customTasteMessages: ['Насыщенное льняное масло с характерной орехово-травяной терпкостью.']
    }
  },
  oil_sesame: {
    liquidId: 'oil_culinary',
    attributes: {
      varietyRu: 'Кунжутное ароматное масло из обжаренных семян',
      ingredients: 'Карамелизованные обжаренные семена кунжута (сезама)',
      preparationMethod: 'Обжарка кунжутного семени до золотистого цвета и шнековый отжим',
      purpose: 'Финишная ароматизация лапши вок, жареного риса, пельменей и маринадов',
      culinaryEquivalentId: 'oil_sesame',
      customEffects: { hunger: 22, energy: 8 },
      customTasteMessages: ['Яркий насыщенный ореховый вкус масла из жареного кунжута!']
    }
  },
  vinegar_table: {
    liquidId: 'vinegar',
    attributes: {
      varietyRu: 'Столовый спиртовой уксус 9%',
      ingredients: 'Очищенная вода, пищевая уксусная кислота (9%)',
      preparationMethod: 'Биохимическое сбраживание пищевого спирта уксуснокислыми бактериями',
      purpose: 'Подача к горячим пельменям с перцем, маринование лука, шашлыка и заготовок на зиму',
      culinaryEquivalentId: 'vinegar_table'
    }
  },
  vinegar_apple: {
    liquidId: 'vinegar',
    attributes: {
      varietyRu: 'Яблочный натуральный уксус 6%',
      ingredients: 'Сброженный яблочный сидр из спелых садовых яблок, родниковая вода',
      preparationMethod: 'Естественное аэробное скисание яблочного сидра в деревянных чанах',
      purpose: 'Мягкие маринады для птицы и свинины, заправка салатов и соусов',
      culinaryEquivalentId: 'vinegar_apple'
    }
  },
  vinegar_balsamic: {
    liquidId: 'vinegar',
    attributes: {
      varietyRu: 'Бальзамический выдержанный уксус из Модены',
      ingredients: 'Уваренное виноградное сусло сортов Треббьяно и Ламбруско, винный уксус',
      preparationMethod: 'Многолетняя выдержка уваренного виноградного сусла в каскаде бочек из дуба, каштана и вишни',
      purpose: 'Глазирование стейков, заправка томатов, сыров и изысканных соусов',
      culinaryEquivalentId: 'vinegar_balsamic',
      customEffects: { hunger: 8, soothePanic: 10 },
      customTasteMessages: ['Густой кисло-сладкий виноградный вкус выдержанного бальзамического уксуса!']
    }
  },
  vinegar_rice: {
    liquidId: 'vinegar',
    attributes: {
      varietyRu: 'Рисовый мягкий кулинарный уксус (Мицукан)',
      ingredients: 'Ферментированный шлифованный рис, родниковая вода, тростниковый сахар, морская соль',
      preparationMethod: 'Осахаривание пропаренного риса культурой кодзи и мягкое уксусное брожение',
      purpose: 'Заправка отварного риса, приготовление кисло-сладких соусов и быстрых маринадов',
      culinaryEquivalentId: 'vinegar_rice'
    }
  },
  vinegar_wine: {
    liquidId: 'vinegar',
    attributes: {
      varietyRu: 'Винный красный виноградный уксус 6%',
      ingredients: 'Выдержанное красное сухое виноградное вино',
      preparationMethod: 'Медленное уксуснокислое окисление красного вина по орлеанскому методу',
      purpose: 'Маринование говядины и баранины для шашлыка, деглазирование сковороды и винегретные заправки',
      culinaryEquivalentId: 'vinegar_wine'
    }
  },
  sauce_soy: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Соевый соус натурального брожения',
      ingredients: 'Соевые бобы, обжаренная пшеница, вода, морская соль, культура кодзи',
      preparationMethod: 'Шестимесячная естественная ферментация соево-пшеничного затора и прессование',
      purpose: 'Приправа умами к пельменям, рису, лапше, рыбе и основа для маринадов',
      culinaryEquivalentId: 'sauce_soy',
      customEffects: { hunger: 8, thirst: -20 },
      customTasteMessages: ['Солёный ферментированный соевый соус с глубоким вкусом умами.']
    }
  },
  sauce_ketchup: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Кетчуп томатный пряный («Шашлычный»)',
      ingredients: 'Уваренная мякоть спелых томатов, сахар, яблочный уксус, соль, чеснок, кориандр, гвоздика, душистый и красный перец',
      preparationMethod: 'Уваривание томатного пюре с карамелизированным сахаром и пряным букетом специй',
      purpose: 'Подача к жареному мясу, пельменям, сосискам, картофелю и макаронам',
      culinaryEquivalentId: 'sauce_ketchup',
      customEffects: { hunger: 22, thirst: 5, soothePanic: 15 },
      customTasteMessages: ['Густой пряный кетчуп из спелых солнечных томатов!']
    }
  },
  sauce_mayo: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Майонез классический «Провансаль» 67%',
      ingredients: 'Подсолнечное рафинированное масло, свежие яичные желтки, русская горчица, уксус, сахар, соль',
      preparationMethod: 'Тонкое эмульгирование яичных желтков с горчицей и растительным маслом',
      purpose: 'Заправка салатов, подача к пельменям, вареникам, яйцам и запекание блюд под румяной корочкой',
      culinaryEquivalentId: 'sauce_mayo',
      customEffects: { hunger: 38, energy: 18, soothePanic: 20 },
      customTasteMessages: ['Густой калорийный майонез «Провансаль» на яичных желтках и горчице!']
    }
  },
  sauce_fish: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Рыбный ферментированный соус (Нам Пла)',
      ingredients: 'Свежие морские анчоусы, морская соль, вода',
      preparationMethod: 'Годичная выдержка солёных анчоусов под прессом в бочках с фильтрацией янтарного сока',
      purpose: 'Придание супам, лапше и жареным блюдам глубокого солёного вкуса умами',
      culinaryEquivalentId: 'sauce_fish'
    }
  },
  sauce_worcestershire: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Вустерширский выдержанный соус',
      ingredients: 'Солодовый уксус, патока, анчоусы, мякоть тамаринда, лук-шалот, чеснок, гвоздика, перец чили',
      preparationMethod: 'Двухлетняя бочковая ферментация пряно-рыбного настоя с уксусом и патокой',
      purpose: 'Приправление стейков, бургеров, мясного фарша, рагу и томатных напитков',
      culinaryEquivalentId: 'sauce_worcestershire'
    }
  },
  sauce_narsharab: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Гранатовый уваренный соус «Наршараб»',
      ingredients: 'Сок дикого и садового граната прямого отжима, кориандр, базилик, корица, лавровый лист, чёрный перец',
      preparationMethod: 'Медленное выпаривание гранатового сока в медном котле до густоты тягучего рубинового нектара',
      purpose: 'Идеальный кисло-сладкий соус к шашлыку из баранины, говядины и запечённой рыбе',
      culinaryEquivalentId: 'sauce_narsharab',
      customEffects: { hunger: 18, thirst: 5, energy: 12 },
      customTasteMessages: ['Терпкий кисло-сладкий концентрированный гранатовый соус Наршараб!']
    }
  },
  sauce_teriyaki: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Соус-глазурь Терияки с имбирём и мёдом',
      ingredients: 'Натуральный соевый соус, тростниковый сахар, цветочный мёд, рисовое мирин-вино, свежий корень имбиря, чеснок',
      preparationMethod: 'Карамелизация соевого соуса с мёдом и имбирным соком до глянцевой густоты',
      purpose: 'Глазирование жареной курицы, рыбы, свинины и заправка лапши с овощами',
      culinaryEquivalentId: 'sauce_teriyaki'
    }
  },
  sauce_sriracha: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Острый перечно-чесночный соус Шрирача',
      ingredients: 'Спелый красный перец чили Халапеньо и Серрано, чеснок, тростниковый сахар, дистиллированный уксус, морская соль',
      preparationMethod: 'Трёхмесячная ферментация перечного пюре с чесноком и тонкий помол',
      purpose: 'Придание огненной остроты пельменям, супам, мясу на углях и бургерам',
      culinaryEquivalentId: 'sauce_sriracha',
      customEffects: { hunger: 16, energy: 25, sleepiness: -20, soothePanic: 15 },
      customTasteMessages: ['Огненно-жгучий перечно-чесночный соус Шрирача пробирает до слёз!']
    }
  },
  mustard_dijon: {
    liquidId: 'sauce',
    attributes: {
      varietyRu: 'Горчица столовая ядрёная и зернистая',
      ingredients: 'Молотые и цельные семена белой, сарептской и чёрной горчицы, винный уксус, подсолнечное масло, сахар, соль, куркума',
      preparationMethod: 'Заваривание горчичного порошка и зёрен пряным рассолом с созреванием в тепле',
      purpose: 'Традиционная острая приправа к холодцу, салу, сосискам, пельменям и буженине',
      culinaryEquivalentId: 'mustard_dijon',
      customEffects: { hunger: 15, energy: 20, sleepiness: -15, soothePanic: 15 },
      customTasteMessages: ['Крепкая ядрёная горчица приятно обжигает и прочищает дыхание!']
    }
  },
  gelatin: {
    liquidId: 'dry_mix',
    attributes: {
      varietyRu: 'Желатин пищевой кристаллический (П-11 / 220 Bloom)',
      ingredients: 'Натуральный очищенный коллагеновый белок животного происхождения (100%)',
      preparationMethod: 'Выварка, многоступенчатая фильтрация и вакуумная сушка в прозрачные гранулы',
      purpose: 'Базовый желирующий агент для классического упругого жевательного мармелада, холодца и заливного',
      culinaryEquivalentId: 'gelatin'
    }
  },
  pectin: {
    liquidId: 'dry_mix',
    attributes: {
      varietyRu: 'Пектин яблочно-цитрусовый (NH / Жёлтый)',
      ingredients: 'Выжимки печёных яблок и белая цедра цитрусовых плодов (полигалактуроновая кислота)',
      preparationMethod: 'Кислотная экстракция растительных волокон, осаждение и тонкий помол',
      purpose: 'Приготовление французского пластового мармелада, конфитюров, зефира и пастилы',
      culinaryEquivalentId: 'pectin'
    }
  },
  agar_agar: {
    liquidId: 'dry_mix',
    attributes: {
      varietyRu: 'Агар-агар морской водорослевый (сила геля 900)',
      ingredients: 'Красные тихоокеанские водоросли анфельция и грацилярия (100%)',
      preparationMethod: 'Горячая вытяжка морских водорослей, вымораживание и распылительная сушка',
      purpose: 'Термообратимое плотное желирование ягодного мармелада, суфле «Птичье молоко» и желе',
      culinaryEquivalentId: 'agar_agar'
    }
  },
  starch: {
    liquidId: 'dry_mix',
    attributes: {
      varietyRu: 'Крахмал пищевой высшего сорта (картофельный / кукурузный)',
      ingredients: 'Отмытые крахмальные зёрна спелого картофеля и сахарной кукурузы',
      preparationMethod: 'Тонкое измельчение сырья, гидроциклонная промывка и бережная сушка',
      purpose: 'Формовка мармеладных фигурок, варка густых ягодных киселей и загущение подлив',
      culinaryEquivalentId: 'starch'
    }
  },
  carnauba_wax: {
    liquidId: 'dry_mix',
    attributes: {
      varietyRu: 'Карнаубский пальмовый воск в хлопьях (E903)',
      ingredients: 'Восковой налёт листьев бразильской восконосной пальмы (Copernicia prunifera)',
      preparationMethod: 'Сбор восковой пыльцы с пальмовых листьев, рафинация и охлаждение в чешуйки',
      purpose: 'Глянцевое защитное глазирование жевательного мармелада и драже против слипания',
      culinaryEquivalentId: 'carnauba_wax'
    }
  },
  citric_acid: {
    liquidId: 'food_acid',
    attributes: {
      varietyRu: 'Лимонная кислота кристаллическая (моногидрат E330)',
      ingredients: 'Чистая кристаллическая трёхосновная лимонная кислота пищевой квалификации',
      preparationMethod: 'Глубинная ферментация свекловичной мелассы и кристаллизация',
      purpose: 'Придание яркой кислинки мармеладу, лимонадам, варенью и консервации',
      culinaryEquivalentId: 'citric_acid'
    }
  },
  malic_acid: {
    liquidId: 'food_acid',
    attributes: {
      varietyRu: 'Яблочная кислота пищевая (E296)',
      ingredients: 'Органическая оксиянтарная (яблочная) кислота из зелёных яблок и рябины',
      preparationMethod: 'Выделение и кристаллизация в мелкий белый порошок',
      purpose: 'Создание экстремально кислой сахарной обсыпки для кислых мармеладных червячков и ремешков',
      culinaryEquivalentId: 'malic_acid'
    }
  },
  tartaric_acid: {
    liquidId: 'food_acid',
    attributes: {
      varietyRu: 'Винная (виннокаменная) кислота (E334)',
      ingredients: 'Природный винный камень из винных бочек после выдержки виноградного вина',
      preparationMethod: 'Очистка винного камня и перекристаллизация в прозрачные гранулы',
      purpose: 'Стабилизация взбитых белков, шипучих напитков и виноградно-ягодного мармелада',
      culinaryEquivalentId: 'tartaric_acid'
    }
  },
  lactic_acid: {
    liquidId: 'food_acid',
    attributes: {
      varietyRu: 'Молочная пищевая кислота 80% (E270)',
      ingredients: 'Продукт молочнокислого брожения сыворотки и кукурузного сахара, вода 20%',
      preparationMethod: 'Ферментация лактобактериями и вакуумное концентрирование до прозрачного сиропа',
      purpose: 'Мягкое сливочно-кислое подкисление йогуртового мармелада, сыров и рассолов',
      culinaryEquivalentId: 'lactic_acid'
    }
  },
  sodium_citrate: {
    liquidId: 'food_acid',
    attributes: {
      varietyRu: 'Цитрат натрия буферный (тринатрийцитрат E331)',
      ingredients: 'Натриевая соль лимонной кислоты высокой пищевой чистоты',
      preparationMethod: 'Нейтрализация лимонной кислоты содой с последующей сушкой кристаллов',
      purpose: 'Контроль точки схватывания пектинового мармелада и плавления сырных соусов',
      culinaryEquivalentId: 'sodium_citrate'
    }
  },
  menthol: {
    liquidId: 'botanical_extract',
    attributes: {
      varietyRu: 'Ментол натуральный кристаллический (L-ментол)',
      ingredients: 'Эфирное масло японской и перечной холодной мяты (Mentha arvensis)',
      preparationMethod: 'Вымораживание мятного эфирного масла при -20°C с ростом прозрачных кристаллов-игл',
      purpose: 'Придание морозной ледяной свежести эвкалиптово-мятному мармеладу, пастилкам и напиткам',
      culinaryEquivalentId: 'menthol'
    }
  },
  dye_carmine: {
    liquidId: 'food_dye',
    attributes: {
      varietyRu: 'Кармин рубиново-алый натуральный (E120)',
      ingredients: 'Карминовая кислота природного происхождения, очищенная вода',
      preparationMethod: 'Водная экстракция природного пигмента и стабилизация раствора',
      purpose: 'Окрашивание клубничного, малинового и вишнёвого мармелада и кремов в сочный рубиновый цвет',
      culinaryEquivalentId: 'dye_carmine'
    }
  },
  dye_chlorophyllin: {
    liquidId: 'food_dye',
    attributes: {
      varietyRu: 'Хлорофиллин изумрудно-зелёный (E141)',
      ingredients: 'Листья молодой крапивы, люцерны и шпината (медный комплекс хлорофилла)',
      preparationMethod: 'Бережная вытяжка зелёного пигмента из листьев крапивы и стабилизация от выцветания',
      purpose: 'Натуральное окрашивание яблочного, мятного и тархунового мармелада и напитков',
      culinaryEquivalentId: 'dye_chlorophyllin'
    }
  },
  dye_anthocyanin: {
    liquidId: 'food_dye',
    attributes: {
      varietyRu: 'Антоцианы тёмно-ягодные фиолетовые (E163)',
      ingredients: 'Кожица тёмного винограда, ягоды черники, чёрной бузины и корнеплоды чёрной моркови',
      preparationMethod: 'Холодное прессование и мембранная фильтрация клеточного сока ягод',
      purpose: 'Придание глубокого чернично-ежевичного и фиолетового оттенка десертам и мармеладу',
      culinaryEquivalentId: 'dye_anthocyanin'
    }
  },
  dye_spirulina: {
    liquidId: 'food_dye',
    attributes: {
      varietyRu: 'Фикоцианин голубой спирулины (Лазурный пигмент)',
      ingredients: 'Микроводоросль спирулина платенсис (Arthrospira platensis), родниковая вода',
      preparationMethod: 'Холодная водная вытяжка белкового синего пигмента фикоцианина из спирулины',
      purpose: 'Единственный натуральный ярко-голубой и бирюзовый краситель для мармелада и глазури',
      culinaryEquivalentId: 'dye_spirulina'
    }
  },
  dye_beta_carotene: {
    liquidId: 'food_dye',
    attributes: {
      varietyRu: 'Бета-каротин солнечно-оранжевый (Провитамин А / E160a)',
      ingredients: 'Сок сладкой моркови, мякоть облепихи и тыквы в тонкой масляно-водной эмульсии',
      preparationMethod: 'Экстракция каротиноидов из моркови и облепихи с микроэмульгированием',
      purpose: 'Окрашивание апельсинового, мангового и персикового мармелада, масла и выпечки',
      culinaryEquivalentId: 'dye_beta_carotene'
    }
  },
  dye_caramel: {
    liquidId: 'food_dye',
    attributes: {
      varietyRu: 'Карамельный колер тёмно-янтарный (Жжёнка E150)',
      ingredients: 'Тростниковый и свекловичный сахар, патока, питьевая вода',
      preparationMethod: 'Контролируемая термическая карамелизация сахара в медном котле до тёмного колера',
      purpose: 'Придание насыщенного цвета коле, квасу, пряникам, соусам и кофейно-кольному мармеладу',
      culinaryEquivalentId: 'dye_caramel'
    }
  },
  dye_lycopene: {
    liquidId: 'food_dye',
    attributes: {
      varietyRu: 'Ликопин томатно-арбузный алый (E160d)',
      ingredients: 'Спелые красные томаты, мякоть арбуза и плоды шиповника',
      preparationMethod: 'Выделение природного антиоксидантного пигмента ликопина из томатной кожицы',
      purpose: 'Стойкое алое и коралловое окрашивание мармелада, желе и соусов',
      culinaryEquivalentId: 'dye_lycopene'
    }
  },
  barley: {
    liquidId: 'barley_pearl',
    attributes: {
      varietyRu: 'Перловая ячменная крупа шлифованная',
      ingredients: 'Цельное зерно ячменя, очищенное от цветочных плёнок и отшлифованное до гладкости жемчуга',
      preparationMethod: 'Шелушение и многократная круглая шлифовка ячменного ядра',
      purpose: 'Варка классического рассольника, грибных супов и сытной армейской перловой каши с тушёнкой',
      culinaryEquivalentId: 'barley_pearl'
    }
  },
  peas: {
    liquidId: 'peas_dry',
    attributes: {
      varietyRu: 'Горох колотый лущёный жёлтый',
      ingredients: 'Сушёные очищенные семядоли спелого посевного гороха (100% растительный белок)',
      preparationMethod: 'Сушка гороха, скалывание семенной кожуры и разделение на половинки',
      purpose: 'Варка наваристого горохового супа с копчёностями и густой гороховой каши',
      culinaryEquivalentId: 'peas_split_yellow'
    }
  },
  beans: {
    liquidId: 'beans_dry',
    attributes: {
      varietyRu: 'Фасоль зерновая сухая (Красная Рубиновая)',
      ingredients: 'Крупные сухие семена кустовой красной фасоли',
      preparationMethod: 'Обмолот вызревших стручков, естественная сушка и ручная переборка',
      purpose: 'Варка сытного борща, лобио с орехами и чесноком, рагу и мясных похлёбок',
      culinaryEquivalentId: 'beans_red_kidney'
    }
  },
  black_pepper_ground: {
    liquidId: 'spice_dry',
    attributes: {
      varietyRu: 'Перец чёрный молотый душистый',
      ingredients: 'Высушенные на солнце незрелые плоды тропической лианы Piper nigrum (100%)',
      preparationMethod: 'Ферментация горошин на солнце до почернения и свежий жерновой помол',
      purpose: 'Главная пряность для пельменного фарша, бульонов, стейков и горячих блюд',
      culinaryEquivalentId: 'black_pepper_ground'
    }
  },
  chili_powder: {
    liquidId: 'spice_dry',
    attributes: {
      varietyRu: 'Перец красный острый чили (Кайенский молотый)',
      ingredients: 'Высушенные стручки жгучего красного перца чили с семенами (высокий капсаицин)',
      preparationMethod: 'Огневая и солнечная сушка стручков с последующим тонким размолом',
      purpose: 'Придание жгучей согревающей остроты мясу, супам харчо, гуляшу и соусам',
      culinaryEquivalentId: 'chili_powder'
    }
  },
  paprika: {
    liquidId: 'spice_dry',
    attributes: {
      varietyRu: 'Паприка красная сладкая копчёная',
      ingredients: 'Мясистые спелые плоды сладкого красного перца сортов Капия и Паприка',
      preparationMethod: 'Медленное копчение стручков над дубовыми дровами и тонкий помол без семян',
      purpose: 'Придание гуляшу, птице, картофелю и колбаскам рубинового цвета и аромата дымка',
      culinaryEquivalentId: 'paprika'
    }
  },
  cinnamon: {
    liquidId: 'spice_dry',
    attributes: {
      varietyRu: 'Корица цейлонская молотая ароматная',
      ingredients: 'Тонкий внутренний слой коры молодых побегов вечнозелёного коричного дерева',
      preparationMethod: 'Снятие внутренней коры, скручивание в трубочки на солнце и пудровый помол',
      purpose: 'Ароматизация сдобных булочек, яблочных пирогов, глинтвейна, кофе и каш',
      culinaryEquivalentId: 'cinnamon'
    }
  },
  turmeric: {
    liquidId: 'spice_dry',
    attributes: {
      varietyRu: 'Куркума индийская золотая молотая',
      ingredients: 'Высушенные корневища куркумы длинной (Curcuma longa, богата куркумином)',
      preparationMethod: 'Варка корневищ на пару, сушка на солнце и размол в ярко-золотистую пудру',
      purpose: 'Окрашивание и пряная заправка плова, куриного бульона, риса и соусов',
      culinaryEquivalentId: 'turmeric'
    }
  },
  garlic_powder: {
    liquidId: 'spice_dry',
    attributes: {
      varietyRu: 'Чеснок сушёный гранулированный',
      ingredients: 'Отборные зубчики свежего ярового чеснока без шелухи (100%)',
      preparationMethod: 'Нарезка чесночных долек, бережная конвекционная сушка и дробление в мелкую крупку',
      purpose: 'Пряная приправа для пельменного фарша, домашних колбас, супов и жареного мяса',
      culinaryEquivalentId: 'garlic_powder'
    }
  },
  dried_herbs: {
    liquidId: 'spice_dry',
    attributes: {
      varietyRu: 'Сбор сушёных пряных трав (Укроп, Петрушка, Чабрец, Душица)',
      ingredients: 'Листья и соцветия огородного укропа, петрушки, базилика, лесного чабреца и мяты',
      preparationMethod: 'Сбор в период цветения и сушка пучками в тени на чердачном сквозняке',
      purpose: 'Добавление в горячие супы, бульоны, тушёное мясо и заваривание душистого лесного чая',
      culinaryEquivalentId: 'dried_herbs'
    }
  },
  antiseptic: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Спиртовой кожный антисептик 70%',
      ingredients: 'Спирт этиловый медицинский 70%, вода очищенная, хлоргексидина биглюконат, глицерин',
      preparationMethod: 'Фармацевтическое смешивание спиртового антисептического раствора',
      purpose: 'Экстренная обработка рук, краёв ран, ссадин и медицинских инструментов',
      medicalEffectId: 'antiseptic'
    }
  },
  saline: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Физраствор стерильный изотонический (0.9% NaCl)',
      ingredients: 'Хлорид натрия фармакопейный 9 г/л, вода для инъекций бидистиллированная',
      preparationMethod: 'Растворение и автоклавная стерилизация при 121°C',
      purpose: 'Промывание открытых ран, глаз, слизистых и разведение лекарств',
      medicalEffectId: 'saline_solution'
    }
  },
  saline_solution: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Физраствор стерильный изотонический (0.9% NaCl)',
      ingredients: 'Хлорид натрия фармакопейный 9 г/л, вода для инъекций бидистиллированная',
      preparationMethod: 'Растворение и автоклавная стерилизация при 121°C',
      purpose: 'Промывание открытых ран, глаз, слизистых и разведение лекарств',
      medicalEffectId: 'saline_solution'
    }
  },
  zelenka: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Раствор бриллиантового зелёного 1% («Зелёнка»)',
      ingredients: 'Бриллиантовый зелёный (тетраэтил-4,4-диаминотрифенилметана оксалат) 1%, этанол 60%, вода',
      preparationMethod: 'Растворение анилинового антисептического красителя в водно-спиртовой основе',
      purpose: 'Наружное обеззараживание свежих порезов, царапин и ссадин с подсушивающим эффектом',
      medicalEffectId: 'zelenka'
    }
  },
  iodine: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Раствор йода спиртовой 5%',
      ingredients: 'Йод кристаллический 5%, калия йодид 2%, спирт этиловый 95% и очищенная вода',
      preparationMethod: 'Растворение кристаллического йода в комплексе с йодидом калия в водно-спиртовой среде',
      purpose: 'Дезинфекция краёв ран, ссадин и нанесение согревающей йодной сетки при ушибах',
      medicalEffectId: 'iodine'
    }
  },
  peroxide: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Перекись водорода медицинская 3%',
      ingredients: 'Пероксид водорода медицинский (H2O2) 3%, бензоат натрия (стабилизатор), очищенная вода',
      preparationMethod: 'Разведение пергидроля бидистиллированной водой со стабилизацией',
      purpose: 'Первичное пенное промывание загрязнённых ран и остановка капиллярных кровотечений',
      medicalEffectId: 'peroxide'
    }
  },
  valerian_tincture: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Настойка корневищ валерианы лекарственной',
      ingredients: 'Дроблёные корневища с корнями валерианы лекарственной (Valeriana officinalis), этанол 70%',
      preparationMethod: 'Настаивание (перколяция) валерианового корня на 70% спирте в соотношении 1:5',
      purpose: 'Быстрое снятие паники, тревоги, тахикардии и помощь при бессоннице',
      medicalEffectId: 'valerian_tincture'
    }
  },
  ammonia_solution: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Нашатырный спирт (Раствор аммиака 10%)',
      ingredients: 'Аммиака водный раствор концентрированный 10% (NH4OH), очищенная вода',
      preparationMethod: 'Насыщение дистиллированной воды очищенным газообразным аммиаком',
      purpose: 'Экстренная стимуляция дыхательного центра при обмороке, шоке и алкогольном опьянении',
      medicalEffectId: 'ammonia_solution'
    }
  },
  ointment_healing: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Бальзам-мазь ранозаживляющая («Спасатель»)',
      ingredients: 'Топлёное масло Гхи, облепиховое и пихтовое масло, пчелиный воск, экстракт календулы, пантенол, витамин Е',
      preparationMethod: 'Гомогенизация природных масел, пчелиного воска и фитоэкстрактов на водяной бане',
      purpose: 'Заживление глубоких ссадин, ожогов, обморожений, трещин и гематом',
      medicalEffectId: 'ointment_healing'
    }
  },
  ointment_diclofenac: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Гель противовоспалительный «Диклофенак» 5%',
      ingredients: 'Диклофенак натрия 50 мг/г, изопропанол, пропиленгликоль, карбомер, масло лаванды, вода',
      preparationMethod: 'Фармацевтическое диспергирование НПВС в проникающей гидрогелевой основе',
      purpose: 'Снятие острой боли и воспаления при растяжениях связок, ушибах и болях в спине',
      medicalEffectId: 'ointment_diclofenac'
    }
  },
  panthenol_foam: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Пена противоожоговая с декспантенолом («Пантенол» 5%)',
      ingredients: 'Декспантенол (провитамин B5) 5%, аллантоин, витамин Е, эмульсионный воск, вода, пропеллент',
      preparationMethod: 'Приготовление стерильной охлаждающей эмульсии под давлением в аэрозольном баллоне',
      purpose: 'Экстренная помощь при термических и солнечных ожогах, регенерация повреждённой кожи',
      medicalEffectId: 'panthenol_foam'
    }
  },
  balm_star: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Бальзам ароматический «Золотая Звезда» («Звёздочка»)',
      ingredients: 'Кристаллический ментол, камфора, эфирные масла перечной мяты, эвкалипта, гвоздики и корицы, пчелиный воск, вазелин',
      preparationMethod: 'Сплавление пчелиного воска и вазелина с концентрированными восточными эфирными маслами',
      purpose: 'Снятие головной боли, заложенности носа, простуды, сонливости и зуда от укусов насекомых',
      medicalEffectId: 'balm_star'
    }
  },
  eye_drops: {
    liquidId: 'medical_solution',
    attributes: {
      varietyRu: 'Капли глазные увлажняющие и противовоспалительные',
      ingredients: 'Таурин 4%, гиалуронат натрия, борная кислота, стерильная вода для инъекций',
      preparationMethod: 'Ультрафильтрация и асептический розлив изотонического офтальмологического раствора',
      purpose: 'Промывание глаз от пыли, дыма и песка, снятие рези и усталости зрения',
      medicalEffectId: 'eye_drops'
    }
  }
};

/**
 * Normalizes any FluidContainerState so that legacy specific liquidIds
 * (e.g. 'caviar_red', 'pickles_salted_mushrooms', 'honey_buckwheat', 'jam_raspberry')
 * are automatically converted to their unified generic LiquidId ('caviar', 'pickles', 'honey', 'jam', etc.)
 * and their specific origin/composition ('из чего оно') is preserved in `storage.attributes`.
 */
export function normalizeFluidStorageState(
  storage: FluidContainerState | { liquidId: string | null; attributes?: FluidSubstanceAttributes } | undefined | null
): void {
  if (!storage || !storage.liquidId) return;
  const rawId = String(storage.liquidId);
  const legacyMapped = LEGACY_LIQUID_TO_GENERIC_MAP[rawId];
  if (legacyMapped) {
    (storage as FluidContainerState).liquidId = legacyMapped.liquidId;
    const prevAttrs = storage.attributes || {};
    const prevIng = prevAttrs.ingredients ?? prevAttrs.sourceIngredients;
    const mappedIng = legacyMapped.attributes.ingredients ?? legacyMapped.attributes.sourceIngredients;
    storage.attributes = {
      ...DEFAULT_GENERIC_LIQUID_ATTRIBUTES[legacyMapped.liquidId],
      ...legacyMapped.attributes,
      ...prevAttrs,
      varietyRu: prevAttrs.varietyRu || legacyMapped.attributes.varietyRu,
      ingredients: prevIng || mappedIng,
      preparationMethod: prevAttrs.preparationMethod || legacyMapped.attributes.preparationMethod,
      purpose: prevAttrs.purpose || legacyMapped.attributes.purpose,
      culinaryEquivalentId: prevAttrs.culinaryEquivalentId || legacyMapped.attributes.culinaryEquivalentId,
      medicalEffectId: prevAttrs.medicalEffectId || legacyMapped.attributes.medicalEffectId
    };
    if (storage.attributes.sourceIngredients && !storage.attributes.ingredients) {
      storage.attributes.ingredients = storage.attributes.sourceIngredients;
    }
    delete storage.attributes.sourceIngredients;
    return;
  }

  // Fallback for unknown legacy prefixes if any
  if (!(rawId in LIQUID_REGISTRY)) {
    if (rawId.startsWith('caviar_')) storage.liquidId = 'caviar';
    else if (rawId.startsWith('jam_')) storage.liquidId = 'jam';
    else if (rawId.startsWith('honey_')) storage.liquidId = 'honey';
    else if (rawId.startsWith('broth_')) storage.liquidId = 'broth';
    else if (rawId.startsWith('pickles_') || rawId.startsWith('berries_') || rawId.startsWith('mushrooms_')) storage.liquidId = 'pickles';
    else if (rawId.startsWith('oil_')) storage.liquidId = 'oil_culinary';
    else if (rawId.startsWith('vinegar_')) storage.liquidId = 'vinegar';
    else if (rawId.startsWith('sauce_')) storage.liquidId = 'sauce';
    else if (rawId.startsWith('wine_')) storage.liquidId = 'wine';
    else if (rawId.startsWith('grain_')) storage.liquidId = 'grain';
    else if (rawId.startsWith('pasta_')) storage.liquidId = 'pasta';
    else if (rawId.startsWith('dye_')) storage.liquidId = 'food_dye';
    else if (rawId.startsWith('detergent_')) storage.liquidId = 'detergent';
    else storage.liquidId = 'water';
  }

  const defAttrs = DEFAULT_GENERIC_LIQUID_ATTRIBUTES[storage.liquidId as LiquidId];
  if (!storage.attributes) {
    storage.attributes = defAttrs ? { ...defAttrs } : {};
  } else {
    if (!storage.attributes.ingredients && storage.attributes.sourceIngredients) {
      storage.attributes.ingredients = storage.attributes.sourceIngredients;
    }
    delete storage.attributes.sourceIngredients;
    if (defAttrs) {
      if (!storage.attributes.varietyRu && defAttrs.varietyRu) storage.attributes.varietyRu = defAttrs.varietyRu;
      if (!storage.attributes.ingredients && defAttrs.ingredients) storage.attributes.ingredients = defAttrs.ingredients;
      if (!storage.attributes.preparationMethod && defAttrs.preparationMethod) storage.attributes.preparationMethod = defAttrs.preparationMethod;
      if (!storage.attributes.purpose && defAttrs.purpose) storage.attributes.purpose = defAttrs.purpose;
      if (!storage.attributes.productShapeRu && defAttrs.productShapeRu) storage.attributes.productShapeRu = defAttrs.productShapeRu;
      if (!storage.attributes.pastaShapeId && defAttrs.pastaShapeId) storage.attributes.pastaShapeId = defAttrs.pastaShapeId;
      if (!storage.attributes.grainGradeRu && defAttrs.grainGradeRu) storage.attributes.grainGradeRu = defAttrs.grainGradeRu;
      if (!storage.attributes.surfaceTextureRu && defAttrs.surfaceTextureRu) storage.attributes.surfaceTextureRu = defAttrs.surfaceTextureRu;
      if (!storage.attributes.cookingTimeMin && defAttrs.cookingTimeMin) storage.attributes.cookingTimeMin = defAttrs.cookingTimeMin;
      if (storage.attributes.glutenFree === undefined && defAttrs.glutenFree !== undefined) storage.attributes.glutenFree = defAttrs.glutenFree;
      if (storage.attributes.proteinPer100g === undefined && defAttrs.proteinPer100g !== undefined) storage.attributes.proteinPer100g = defAttrs.proteinPer100g;
      if (storage.attributes.physicalForm === undefined && defAttrs.physicalForm !== undefined) storage.attributes.physicalForm = defAttrs.physicalForm;
      if (!storage.attributes.physicalFormRu && defAttrs.physicalFormRu) storage.attributes.physicalFormRu = defAttrs.physicalFormRu;
      if (!storage.attributes.substanceColorRu && defAttrs.substanceColorRu) storage.attributes.substanceColorRu = defAttrs.substanceColorRu;
      if (!storage.attributes.customColor && defAttrs.customColor) storage.attributes.customColor = defAttrs.customColor;
      if (!storage.attributes.secondaryColor && defAttrs.secondaryColor) storage.attributes.secondaryColor = defAttrs.secondaryColor;
      if (!storage.attributes.culinaryEquivalentId && defAttrs.culinaryEquivalentId) storage.attributes.culinaryEquivalentId = defAttrs.culinaryEquivalentId;
      if (!storage.attributes.medicalEffectId && defAttrs.medicalEffectId) storage.attributes.medicalEffectId = defAttrs.medicalEffectId;
    }
  }
}

export interface FluidMixComponent {
  liquidId: string;
  ml: number;
  labelRu?: string;
  color?: string;
}

export interface InfusedSolidRecord {
  itemId: string;
  nameRu: string;
  intensity: number; // 0.0..1.0
  color?: string;
  dissolved?: boolean;
}

export interface FluidContainerState {
  liquidId: LiquidId | null;
  currentMl: number;
  maxMl: number;
  emptyWeightKg: number;
  baseItemNameRu: string;
  baseItemNameEn?: string;
  containerVisuals?: ContainerVisualAttributes;
  attributes?: FluidSubstanceAttributes;
  components?: FluidMixComponent[];
  infusedItems?: InfusedSolidRecord[];
  homemadeProgress?: number;
  homemadeRecipeId?: string;
}

export interface ContainerDefConfig {
  itemId: string;
  name: string;
  nameRu: string;
  maxMl: number;
  emptyWeightKg: number;
  emptyVolumeL: number;
  category: 'gear' | 'drink' | 'food';
  icon: string;
  descriptionRu: string;
  descriptionEn: string;
  defaultLiquidId?: LiquidId | null;
  defaultAmountMl?: number;
  requiresOpening?: boolean;
  openedVariantId?: string;
  isSealedByDefault?: boolean;
  isGranularOnly?: boolean;
  supportsHybridContents?: boolean;
  maxItemVolumeL?: number;
  defaultVisuals?: ContainerVisualAttributes;
}

const LEGACY_KITCHENWARE_CONTAINER_ALIASES: Record<string, string> = {
  kitchen_pot_enamel: 'pot',
  kitchen_pot_steel: 'pot',
  kitchen_pot_aluminum: 'pot',
  kitchen_pot_cast_iron: 'pot',
  kitchen_kettle_enamel: 'kettle',
  kitchen_kettle_steel: 'kettle',
  kitchen_kettle_electric: 'kettle',
  kitchen_kettle_clay: 'kettle',
  kitchen_pan_cast_iron: 'frying_pan',
  kitchen_pan_teflon: 'frying_pan',
  kitchen_plate_ceramic: 'plate',
  kitchen_plate_porcelain: 'plate',
  kitchen_plate_enamel: 'bowl',
  kitchen_bowl_wooden: 'bowl',
  soup_bowl: 'bowl',
  soup_bowl_empty: 'bowl',
  kitchen_mug_ceramic: 'mug',
  kitchen_mug_enamel: 'mug',
  kitchen_mug_glass: 'mug',
  glass_mug: 'mug',
  kitchen_cup_porcelain: 'cup',
  kitchen_spoon_steel: 'spoon',
  kitchen_spoon_wooden: 'spoon'
};

export function getContainerConfig(itemId: string | undefined | null): ContainerDefConfig | undefined {
  if (!itemId) return undefined;
  const clean = itemId.replace(/_open$/, '');
  const canonical = LEGACY_KITCHENWARE_CONTAINER_ALIASES[clean] || clean;
  return CONTAINER_CONFIGS[itemId] || CONTAINER_CONFIGS[clean] || CONTAINER_CONFIGS[canonical];
}

export const CONTAINER_CONFIGS: Record<string, ContainerDefConfig> = {
  bottle_plastic_500: {
    itemId: 'bottle_plastic_500',
    name: 'Plastic Bottle (0.5L)',
    nameRu: 'Бутылка 0.5л',
    maxMl: 500,
    emptyWeightKg: 0.03,
    emptyVolumeL: 0.55,
    category: 'drink',
    icon: 'Bottle',
    descriptionRu: 'Универсальная пластиковая ПЭТ-бутылка объемом 0.5 литра. Можно наполнять любой жидкостью или сыпучим веществом.',
    descriptionEn: 'Universal 0.5L PET plastic bottle. Can hold any liquid or sand.'
  },
  bottle_plastic_1500: {
    itemId: 'bottle_plastic_1500',
    name: 'Plastic Bottle (1.5L)',
    nameRu: 'Бутылка 1.5л',
    maxMl: 1500,
    emptyWeightKg: 0.06,
    emptyVolumeL: 1.6,
    category: 'drink',
    icon: 'Bottle',
    descriptionRu: 'Большая пластиковая ПЭТ-бутылка на 1.5 литра. Подходит для воды, кваса, молока, топлива и сыпучих продуктов.',
    descriptionEn: 'Large 1.5L PET bottle for fluids and granular materials.'
  },
  bottle_sauce_squeeze: {
    itemId: 'bottle_sauce_squeeze',
    name: 'Squeeze Dispenser Bottle (0.35L)',
    nameRu: 'Бутылка с дозатором 0.35л',
    maxMl: 350,
    emptyWeightKg: 0.03,
    emptyVolumeL: 0.38,
    category: 'food',
    icon: 'Bottle',
    descriptionRu: 'Мягкая полимерная бутылочка с узким носиком-дозатором для соусов, горчицы, кетчупа и топпингов (0.35л).',
    descriptionEn: 'Squeeze plastic dispenser bottle for sauces and condiments (0.35L).'
  },
  canister_metal_20l: {
    itemId: 'canister_metal_20l',
    name: 'Metal Canister (20L)',
    nameRu: 'Канистра 20л',
    maxMl: 20000,
    emptyWeightKg: 3.20,
    emptyVolumeL: 22.0,
    category: 'gear',
    icon: 'Fuel',
    descriptionRu: 'Прочная стальная 20-литровая канистра с герметичной крышкой. Подходит для бензина, дизеля, воды или песка.',
    descriptionEn: 'Durable 20-liter steel canister with airtight latch. Can store fuel, water, or sand.'
  },
  canister_plastic_10l: {
    itemId: 'canister_plastic_10l',
    name: 'Plastic Canister (10L)',
    nameRu: 'Канистра 10л',
    maxMl: 10000,
    emptyWeightKg: 0.75,
    emptyVolumeL: 11.0,
    category: 'gear',
    icon: 'Fuel',
    descriptionRu: 'Ударопрочная пластиковая канистра на 10 литров с удобной ручкой.',
    descriptionEn: 'Impact-resistant 10L plastic canister with ergonomic handle.'
  },
  canister_plastic_5l: {
    itemId: 'canister_plastic_5l',
    name: 'Plastic Canister (5L)',
    nameRu: 'Канистра 5л',
    maxMl: 5000,
    emptyWeightKg: 0.40,
    emptyVolumeL: 5.5,
    category: 'gear',
    icon: 'Fuel',
    descriptionRu: 'Компактная пластиковая канистра на 5 литров для технических жидкостей, антифриза, масла или топлива.',
    descriptionEn: 'Compact 5L plastic canister for fluids, oil, coolant, or fuel.'
  },
  camp_flask: {
    itemId: 'camp_flask',
    name: 'Camp Flask (0.8L)',
    nameRu: 'Походная фляга 0.8л',
    maxMl: 800,
    emptyWeightKg: 0.22,
    emptyVolumeL: 0.9,
    category: 'gear',
    icon: 'FlaskConical',
    descriptionRu: 'Армейская стальная походная фляжка в матерчатом чехле. Вмещает 800 мл жидкости.',
    descriptionEn: 'Field camp canteen flask in fabric case (800 ml).'
  },
  thermos: {
    itemId: 'thermos',
    name: 'Thermos (1.0L)',
    nameRu: 'Термос 1.0л',
    maxMl: 1000,
    emptyWeightKg: 0.45,
    emptyVolumeL: 1.2,
    category: 'gear',
    icon: 'Coffee',
    descriptionRu: 'Вакуумный стальной термос на 1 литр. Сохраняет напитки горячими или холодными.',
    descriptionEn: 'Vacuum insulated stainless steel thermos (1.0L).'
  },
  paper_cup: {
    itemId: 'paper_cup',
    name: 'Paper Cup (0.25L)',
    nameRu: 'Бумажный стаканчик 0.25л',
    maxMl: 250,
    emptyWeightKg: 0.01,
    emptyVolumeL: 0.28,
    category: 'drink',
    icon: 'CupSoda',
    descriptionRu: 'Одноразовый бумажный стаканчик для кофе, чая или воды.',
    descriptionEn: 'Disposable paper cup for beverages (250 ml).'
  },
  can_alu_330: {
    itemId: 'can_alu_330',
    name: 'Aluminum Can (0.33L)',
    nameRu: 'Алюминиевая банка 0.33л',
    maxMl: 330,
    emptyWeightKg: 0.015,
    emptyVolumeL: 0.35,
    category: 'drink',
    icon: 'CupSoda',
    descriptionRu: 'Алюминиевая банка с ключом-кольцом (0.33 л).',
    descriptionEn: 'Aluminum beverage can (330 ml).',
    requiresOpening: true
  },
  glass_bottle_500: {
    itemId: 'glass_bottle_500',
    name: 'Glass Bottle (0.5L)',
    nameRu: 'Стеклянная бутылка 0.5л',
    maxMl: 500,
    emptyWeightKg: 0.35,
    emptyVolumeL: 0.55,
    category: 'drink',
    icon: 'Wine',
    descriptionRu: 'Стеклянная бутылка на 0.5 литра с винтовой крышкой.',
    descriptionEn: 'Glass bottle (0.5L) with screw cap.'
  },
  tetra_pack_1000: {
    itemId: 'tetra_pack_1000',
    name: 'Tetra Pak (1.0L)',
    nameRu: 'Тетрапак 1.0л',
    maxMl: 1000,
    emptyWeightKg: 0.04,
    emptyVolumeL: 1.05,
    category: 'drink',
    icon: 'Box',
    descriptionRu: 'Картонная упаковка тетрапак с пластиковым клапаном объемом 1 литр.',
    descriptionEn: '1-liter carton Tetra Pak packaging.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  // === UNIFIED GLASS JARS ===
  jar_glass_3l: {
    itemId: 'jar_glass_3l',
    name: 'Large Glass Jar (3.0L)',
    nameRu: 'Стеклянная банка 3.0л',
    maxMl: 3000,
    emptyWeightKg: 0.85,
    emptyVolumeL: 3.3,
    category: 'gear',
    icon: 'GlassWater',
    descriptionRu: 'Большая трёхлитровая стеклянная банка под закатку для солений, маринадов и компотов.',
    descriptionEn: 'Large 3.0L glass canning jar.',
    requiresOpening: true
  },
  jar_glass_large: {
    itemId: 'jar_glass_large',
    name: 'Glass Jar (1.0L)',
    nameRu: 'Стеклянная банка 1.0л',
    maxMl: 1000,
    emptyWeightKg: 0.40,
    emptyVolumeL: 1.1,
    category: 'gear',
    icon: 'GlassWater',
    descriptionRu: 'Унифицированная стеклянная банка объемом 1 литр с винтовой крышкой.',
    descriptionEn: 'Unified 1.0L glass jar.',
    requiresOpening: true
  },
  jar_glass_medium: {
    itemId: 'jar_glass_medium',
    name: 'Glass Jar (0.5L)',
    nameRu: 'Стеклянная банка 0.5л',
    maxMl: 500,
    emptyWeightKg: 0.25,
    emptyVolumeL: 0.55,
    category: 'gear',
    icon: 'GlassWater',
    descriptionRu: 'Унифицированная стеклянная банка объемом 0.5 литра с винтовой крышкой.',
    descriptionEn: 'Unified 0.5L glass jar.',
    requiresOpening: true
  },
  jar_glass_small: {
    itemId: 'jar_glass_small',
    name: 'Glass Jar (0.2L)',
    nameRu: 'Стеклянная банка 0.2л',
    maxMl: 200,
    emptyWeightKg: 0.12,
    emptyVolumeL: 0.22,
    category: 'gear',
    icon: 'GlassWater',
    descriptionRu: 'Малая стеклянная баночка объемом 0.2 литра с крышкой твист-офф.',
    descriptionEn: 'Unified 0.2L small glass jar.',
    requiresOpening: true
  },
  jar_spice_small: {
    itemId: 'jar_spice_small',
    name: 'Spice Shaker Jar (0.1L)',
    nameRu: 'Баночка для специй 0.1л',
    maxMl: 100,
    emptyWeightKg: 0.08,
    emptyVolumeL: 0.12,
    category: 'gear',
    icon: 'GlassWater',
    descriptionRu: 'Узкая стеклянная баночка с крышкой-мельницей/дозатором для соли, перца и сухих специй (100 мл).',
    descriptionEn: 'Small glass spice shaker/grinder jar (100 ml).',
    requiresOpening: true
  },
  // === UNIFIED METAL TIN CANS ===
  can_metal_large: {
    itemId: 'can_metal_large',
    name: 'Large Tin Can (0.8L)',
    nameRu: 'Консервная банка большая 0.8л',
    maxMl: 800,
    emptyWeightKg: 0.10,
    emptyVolumeL: 0.85,
    category: 'gear',
    icon: 'CupSoda',
    descriptionRu: 'Большая цилиндрическая жестяная консервная банка объемом 0.8 литра.',
    descriptionEn: 'Large 0.8L cylindrical tin can.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  can_metal_medium: {
    itemId: 'can_metal_medium',
    name: 'Standard Tin Can (0.4L)',
    nameRu: 'Консервная банка средняя 0.4л',
    maxMl: 400,
    emptyWeightKg: 0.06,
    emptyVolumeL: 0.45,
    category: 'gear',
    icon: 'CupSoda',
    descriptionRu: 'Стандартная высокая жестяная консервная банка объемом 0.4 литра.',
    descriptionEn: 'Standard 0.4L tin can.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  can_metal_small: {
    itemId: 'can_metal_small',
    name: 'Small Tin Can (0.25L)',
    nameRu: 'Консервная банка малая 0.25л',
    maxMl: 250,
    emptyWeightKg: 0.04,
    emptyVolumeL: 0.28,
    category: 'gear',
    icon: 'CupSoda',
    descriptionRu: 'Малая цилиндрическая консервная банка объемом 0.25 литра.',
    descriptionEn: 'Small 0.25L cylindrical tin can.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  can_metal_flat: {
    itemId: 'can_metal_flat',
    name: 'Flat Round Tin Can (0.18L)',
    nameRu: 'Консервная банка плоская 0.18л',
    maxMl: 180,
    emptyWeightKg: 0.03,
    emptyVolumeL: 0.20,
    category: 'gear',
    icon: 'Disc',
    descriptionRu: 'Низкая широкая круглая консервная банка-шайба с ключом-кольцом под рыбу, паштеты или икру (0.18 л).',
    descriptionEn: 'Flat round fish/caviar tin can (0.18L).',
    requiresOpening: true,
    isSealedByDefault: true
  },
  can_metal_oval: {
    itemId: 'can_metal_oval',
    name: 'Oval Sprat Tin Can (0.20L)',
    nameRu: 'Консервная банка овальная 0.20л',
    maxMl: 200,
    emptyWeightKg: 0.035,
    emptyVolumeL: 0.22,
    category: 'gear',
    icon: 'Disc',
    descriptionRu: 'Продолговатая овальная жестяная банка («шпротная») с ключом-кольцом (0.20 л).',
    descriptionEn: 'Oval sprat-style tin can with pull tab (0.20L).',
    requiresOpening: true,
    isSealedByDefault: true
  },
  tin_round_mini: {
    itemId: 'tin_round_mini',
    name: 'Mini Metal Balm Tin (30ml)',
    nameRu: 'Жестяная шайба-футляр 30мл',
    maxMl: 30,
    emptyWeightKg: 0.01,
    emptyVolumeL: 0.04,
    category: 'gear',
    icon: 'Disc',
    descriptionRu: 'Миниатюрная круглая жестяная баночка с плотной крышкой для бальзамов, воска и густых мазей (30 мл).',
    descriptionEn: 'Mini round metal tin box for balms and wax (30 ml).',
    requiresOpening: true
  },
  // === UNIFIED CLAY POTS ===
  pot_clay_small: {
    itemId: 'pot_clay_small',
    name: 'Small Clay Pot (0.25L)',
    nameRu: 'Глиняный горшочек малый 0.25л',
    maxMl: 250,
    emptyWeightKg: 0.20,
    emptyVolumeL: 0.32,
    category: 'food',
    icon: 'Utensils',
    descriptionRu: 'Малый обожжённый глиняный горшочек с вощаной обвязкой (0.25 л).',
    descriptionEn: 'Small earthenware clay pot (250 ml).',
    requiresOpening: true
  },
  pot_clay_medium: {
    itemId: 'pot_clay_medium',
    name: 'Clay Pot (0.5L)',
    nameRu: 'Глиняный горшок средний 0.5л',
    maxMl: 500,
    emptyWeightKg: 0.35,
    emptyVolumeL: 0.6,
    category: 'food',
    icon: 'Utensils',
    descriptionRu: 'Обожжённый глиняный горшок на 0.5 литра для смальца, топлёного масла, мёда или жаркого.',
    descriptionEn: 'Medium earthenware clay pot for lard, ghee, or stews (500 ml).',
    requiresOpening: true
  },
  pot_clay_large: {
    itemId: 'pot_clay_large',
    name: 'Large Clay Pot (1.0L)',
    nameRu: 'Глиняный горшок большой 1.0л',
    maxMl: 1000,
    emptyWeightKg: 0.65,
    emptyVolumeL: 1.15,
    category: 'food',
    icon: 'Utensils',
    descriptionRu: 'Большой толстостенный глиняный корчага-горшок на 1.0 литр для заготовок, топлёного жира и томления в печи.',
    descriptionEn: 'Large thick-walled earthenware clay pot (1.0L).',
    requiresOpening: true
  },
  // === UNIFIED PLASTIC DAIRY CUPS / TUBS ===
  cup_plastic_dairy_small: {
    itemId: 'cup_plastic_dairy_small',
    name: 'Foil-Sealed Plastic Dairy Cup (0.20L)',
    nameRu: 'Пластиковый стаканчик с фольгой 0.2л',
    maxMl: 200,
    emptyWeightKg: 0.01,
    emptyVolumeL: 0.22,
    category: 'food',
    icon: 'CupSoda',
    descriptionRu: 'Пластиковый стаканчик на 200 мл, запаянный сверху алюминиевой мембраной (под йогурт, сметану или десерт).',
    descriptionEn: 'Foil-sealed 200ml plastic dairy cup.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  cup_plastic_dairy_medium: {
    itemId: 'cup_plastic_dairy_medium',
    name: 'Plastic Dairy Tub (0.40L)',
    nameRu: 'Пластиковая ванночка-стакан 0.4л',
    maxMl: 400,
    emptyWeightKg: 0.018,
    emptyVolumeL: 0.45,
    category: 'food',
    icon: 'CupSoda',
    descriptionRu: 'Широкий пластиковый стакан-ванночка на 400 мл с крышкой и защитной фольгой.',
    descriptionEn: '400ml plastic dairy tub with lid.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  // === UNIFIED MEDICAL / CULINARY TUBES, AMPOULES & AEROSOLS ===
  tube_ointment_small: {
    itemId: 'tube_ointment_small',
    name: 'Ointment / Paste Tube (50ml)',
    nameRu: 'Тюбик металлический 50мл',
    maxMl: 50,
    emptyWeightKg: 0.012,
    emptyVolumeL: 0.06,
    category: 'gear',
    icon: 'FlaskConical',
    descriptionRu: 'Мягкая алюминиевая туба с винтовым колпачком для мазей, гелей, бальзамов или густых паст (50 мл).',
    descriptionEn: 'Collapsible aluminum tube with screw cap (50 ml).'
  },
  ampoule_glass_small: {
    itemId: 'ampoule_glass_small',
    name: 'Glass Medical Ampoule (10ml)',
    nameRu: 'Стеклянная ампула 10мл',
    maxMl: 10,
    emptyWeightKg: 0.005,
    emptyVolumeL: 0.015,
    category: 'gear',
    icon: 'FlaskConical',
    descriptionRu: 'Герметичная тонкостенная стеклянная ампула для инъекционных и стерильных растворов (10 мл).',
    descriptionEn: 'Hermetic glass medical ampoule (10 ml).'
  },
  aerosol_can_small: {
    itemId: 'aerosol_can_small',
    name: 'Aerosol Spray Can (150ml)',
    nameRu: 'Аэрозольный баллончик 150мл',
    maxMl: 150,
    emptyWeightKg: 0.04,
    emptyVolumeL: 0.18,
    category: 'gear',
    icon: 'FlaskConical',
    descriptionRu: 'Металлический аэрозольный баллончик под давлением с клапаном-распылителем (150 мл).',
    descriptionEn: 'Pressurized metal aerosol spray can (150 ml).'
  },
  bottle_glass_large: {
    itemId: 'bottle_glass_large',
    name: 'Glass Bottle (1.0L)',
    nameRu: 'Стеклянная бутылка 1.0л',
    maxMl: 1000,
    emptyWeightKg: 0.50,
    emptyVolumeL: 1.05,
    category: 'drink',
    icon: 'Wine',
    descriptionRu: 'Унифицированная стеклянная бутылка объемом 1 литр.',
    descriptionEn: 'Unified 1.0L glass bottle.'
  },
  bottle_glass_750: {
    itemId: 'bottle_glass_750',
    name: 'Wine Glass Bottle (0.75L)',
    nameRu: 'Стеклянная винная бутылка 0.75л',
    maxMl: 750,
    emptyWeightKg: 0.42,
    emptyVolumeL: 0.8,
    category: 'drink',
    icon: 'Wine',
    descriptionRu: 'Стандартная винная стеклянная бутылка объемом 0.75 литра.',
    descriptionEn: 'Standard 0.75L wine glass bottle.'
  },
  bottle_glass_medium: {
    itemId: 'bottle_glass_medium',
    name: 'Glass Bottle (0.5L)',
    nameRu: 'Стеклянная бутылка 0.5л',
    maxMl: 500,
    emptyWeightKg: 0.35,
    emptyVolumeL: 0.55,
    category: 'drink',
    icon: 'Wine',
    descriptionRu: 'Унифицированная стеклянная бутылка объемом 0.5 литра.',
    descriptionEn: 'Unified 0.5L glass bottle.'
  },
  sack_cloth_large: {
    itemId: 'sack_cloth_large',
    name: 'Cloth Sack (10L)',
    nameRu: 'Тканевый мешок 10л',
    maxMl: 10000,
    emptyWeightKg: 0.10,
    emptyVolumeL: 10.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Унифицированный тканевый мешок объемом 10 литров.',
    descriptionEn: 'Unified 10L cloth sack.'
  },
  sack_cloth_medium: {
    itemId: 'sack_cloth_medium',
    name: 'Cloth Sack (5L)',
    nameRu: 'Тканевый мешок 5л',
    maxMl: 5000,
    emptyWeightKg: 0.06,
    emptyVolumeL: 5.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Унифицированный тканевый мешок объемом 5 литров.',
    descriptionEn: 'Unified 5L cloth sack.'
  },
  sack_cloth_small: {
    itemId: 'sack_cloth_small',
    name: 'Cloth Sack (1L)',
    nameRu: 'Тканевый мешок 1л',
    maxMl: 1000,
    emptyWeightKg: 0.02,
    emptyVolumeL: 1.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Унифицированный тканевый мешок объемом 1 литр.',
    descriptionEn: 'Unified 1L cloth sack.'
  },
  sandbag: {
    itemId: 'sandbag',
    name: 'Sandbag (1kg)',
    nameRu: 'Мешок с песком',
    maxMl: 1000,
    emptyWeightKg: 0.05,
    emptyVolumeL: 1.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Плотный джутовый мешок с сухим кварцевым песком (1 кг). Используется для тушения пожаров и впитывания горюче-смазочных пятен.',
    descriptionEn: 'Durable burlap sack with dry quartz sand (1 kg). Extinguishes fires and absorbs liquid spills.',
    defaultLiquidId: 'sand',
    defaultAmountMl: 1000
  },
  sack_empty: {
    itemId: 'sack_empty',
    name: 'Empty Burlap Sack',
    nameRu: 'Пустой джутовый мешок',
    maxMl: 1000,
    emptyWeightKg: 0.05,
    emptyVolumeL: 1.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Прочный пустой мешок из грубой мешковины. Можно наполнять песком или использовать как ветошь.',
    descriptionEn: 'Empty durable burlap canvas sack. Can store granular materials or be used as cloth.',
    defaultLiquidId: null,
    defaultAmountMl: 0
  },
  lukoshko: {
    itemId: 'lukoshko',
    name: 'Wicker Basket (2.0L)',
    nameRu: 'Плетёное лукошко',
    maxMl: 2000,
    emptyWeightKg: 0.15,
    emptyVolumeL: 2.2,
    category: 'gear',
    icon: 'ShoppingBag',
    descriptionRu: 'Легкое плетеное берестяное лукошко с ручкой для сбора лесных ягод, грибов и припасов.',
    descriptionEn: 'Lightweight woven wicker basket with handle for forest berries, mushrooms, and provisions.',
    defaultLiquidId: null,
    defaultAmountMl: 0
  },
  package_bag: {
    itemId: 'package_bag',
    name: 'Plastic Bag (2.5L)',
    nameRu: 'Фасовочный пакет',
    maxMl: 2500,
    emptyWeightKg: 0.005,
    emptyVolumeL: 0.03,
    category: 'gear',
    icon: 'ShoppingBag',
    descriptionRu: 'Прозрачный тонкий полиэтиленовый фасовочный пакет для овощей, фруктов, ягод, грибов и сыпучих продуктов.',
    descriptionEn: 'Transparent thin polyethylene bag for produce, berries, mushrooms, and granular products.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    supportsHybridContents: true,
    maxItemVolumeL: 2.2
  },
  plastic_bag: {
    itemId: 'plastic_bag',
    name: 'Carrier Bag (12.0L)',
    nameRu: 'Пакет-майка',
    maxMl: 12000,
    emptyWeightKg: 0.02,
    emptyVolumeL: 0.08,
    category: 'gear',
    icon: 'ShoppingBag',
    descriptionRu: 'Универсальный вместительный пластиковый пакет-майка с ручками для переноски покупок и предметов.',
    descriptionEn: 'Universal spacious plastic grocery shopping bag with handles.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    supportsHybridContents: true,
    maxItemVolumeL: 10.0
  },
  bottle_glass_small: {
    itemId: 'bottle_glass_small',
    name: 'Small Glass Bottle (0.25L)',
    nameRu: 'Стеклянная бутылочка 0.25л',
    maxMl: 250,
    emptyWeightKg: 0.18,
    emptyVolumeL: 0.28,
    category: 'drink',
    icon: 'Wine',
    descriptionRu: 'Компактная стеклянная бутылочка объемом 250 мл для соусов, масел и сиропов.',
    descriptionEn: 'Small 250ml glass bottle for sauces, oils, and syrups.'
  },
  bottle_plastic_100: {
    itemId: 'bottle_plastic_100',
    name: 'Small Plastic Dropper Bottle (100ml)',
    nameRu: 'Пластиковый флакон 100мл',
    maxMl: 100,
    emptyWeightKg: 0.015,
    emptyVolumeL: 0.12,
    category: 'gear',
    icon: 'FlaskConical',
    descriptionRu: 'Малый медицинский пластиковый флакон с дозатором объемом 100 мл.',
    descriptionEn: 'Small 100ml medical plastic dropper bottle.'
  },
  tetra_pack_250: {
    itemId: 'tetra_pack_250',
    name: 'Small Tetra Pak (0.25L)',
    nameRu: 'Тетрапак 0.25л',
    maxMl: 250,
    emptyWeightKg: 0.012,
    emptyVolumeL: 0.28,
    category: 'drink',
    icon: 'Box',
    descriptionRu: 'Компактный картонный тетрапак на 250 мл с трубочкой для сока или молока.',
    descriptionEn: 'Compact 250ml Tetra Pak carton with straw.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  package_sachet: {
    itemId: 'package_sachet',
    name: 'Seasoning Sachet (100ml)',
    nameRu: 'Пакетик-саше',
    maxMl: 100,
    emptyWeightKg: 0.002,
    emptyVolumeL: 0.1,
    category: 'gear',
    icon: 'ShoppingBag',
    descriptionRu: 'Герметичный фольгированный пакетик-саше для молотых пряностей, специй и сухих смесей.',
    descriptionEn: 'Airtight foil sachet pack for spices, seasonings, and dry mixes.',
    requiresOpening: true,
    isSealedByDefault: true
  },
  box_cardboard_large: {
    itemId: 'box_cardboard_large',
    name: 'Large Cardboard Box (15L)',
    nameRu: 'Большая картонная коробка 15л',
    maxMl: 15000,
    emptyWeightKg: 0.25,
    emptyVolumeL: 15.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Большая прочная картонная коробка для хранения и транспортировки предметов.',
    descriptionEn: 'Large heavy-duty cardboard storage box (15L).'
  },
  box_cardboard_medium: {
    itemId: 'box_cardboard_medium',
    name: 'Medium Cardboard Box (5L)',
    nameRu: 'Средняя картонная коробка 5л',
    maxMl: 5000,
    emptyWeightKg: 0.12,
    emptyVolumeL: 5.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Универсальная картонная коробка на 5 литров для припасов и продуктов.',
    descriptionEn: 'Medium cardboard box for provisions and gear (5L).'
  },
  box_cardboard_small: {
    itemId: 'box_cardboard_small',
    name: 'Small Cardboard Box (1L)',
    nameRu: 'Малая картонная коробка 1л',
    maxMl: 1000,
    emptyWeightKg: 0.05,
    emptyVolumeL: 1.0,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Компактная картонная коробочка на 1 литр для мелких предметов, чая или выпечки.',
    descriptionEn: 'Small 1L cardboard box for small items, tea, or meals.'
  },
  grain_pack_pouch: {
    itemId: 'grain_pack_pouch',
    name: 'Grocery Grain Pouch (1.0L)',
    nameRu: 'Упаковка для круп (пакет)',
    maxMl: 1000,
    emptyWeightKg: 0.012,
    emptyVolumeL: 1.05,
    category: 'food',
    icon: 'Package',
    descriptionRu: 'Заводской стоячий бакалейный пакет с прозрачным окном и герметичным швом для круп, зерновых культур и бобовых.',
    descriptionEn: 'Retail stand-up grocery pouch with viewing window for grains, groats, and legumes.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true,
    isGranularOnly: true
  },
  grain_pack_box: {
    itemId: 'grain_pack_box',
    name: 'Grocery Grain Carton Box (0.8L)',
    nameRu: 'Пачка для круп (картон)',
    maxMl: 800,
    emptyWeightKg: 0.032,
    emptyVolumeL: 0.85,
    category: 'food',
    icon: 'Package',
    descriptionRu: 'Плотная картонная бакалейная пачка с прозрачным окошком и клапаном для дозирования хлопьев, круп и гнёзд пасты.',
    descriptionEn: 'Cardboard grocery carton with viewing window and pour spout for oats, grains, and pasta nests.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true,
    isGranularOnly: true
  },
  pasta_pack_bag: {
    itemId: 'pasta_pack_bag',
    name: 'Pasta Window Bag (0.9L)',
    nameRu: 'Упаковка для макарон (пакет)',
    maxMl: 900,
    emptyWeightKg: 0.014,
    emptyVolumeL: 0.95,
    category: 'food',
    icon: 'Package',
    descriptionRu: 'Прочный заводской полипропиленовый пакет с панорамным окном для фигурных и коротких макаронных изделий.',
    descriptionEn: 'Factory polypropylene bag with panoramic window for shaped and short pasta.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true,
    isGranularOnly: true
  },
  pasta_pack_long: {
    itemId: 'pasta_pack_long',
    name: 'Long Pasta Sleeve Pack (0.85L)',
    nameRu: 'Упаковка для спагетти и лапши',
    maxMl: 850,
    emptyWeightKg: 0.015,
    emptyVolumeL: 0.9,
    category: 'food',
    icon: 'Package',
    descriptionRu: 'Вытянутая заводская упаковка с длинным прозрачным окном для спагетти, лапши соба и длинных макарон.',
    descriptionEn: 'Elongated factory sleeve pack with clear vertical window for spaghetti and long noodles.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true,
    isGranularOnly: true
  },
  detergent_box: {
    itemId: 'detergent_box',
    name: 'Detergent Cardboard Box (0.9L)',
    nameRu: 'Картонная коробка порошка',
    maxMl: 900,
    emptyWeightKg: 0.045,
    emptyVolumeL: 0.95,
    category: 'gear',
    icon: 'Box',
    descriptionRu: 'Плотная влагостойкая картонная коробка с перфорированным носиком для сухого стирального порошка.',
    descriptionEn: 'Moisture-resistant cardboard laundry detergent carton with pour spout.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true,
    isGranularOnly: true
  },
  detergent_bag_3l: {
    itemId: 'detergent_bag_3l',
    name: 'Large Detergent Bag (3.0L)',
    nameRu: 'Семейный пакет порошка',
    maxMl: 3000,
    emptyWeightKg: 0.035,
    emptyVolumeL: 3.1,
    category: 'gear',
    icon: 'ShoppingBag',
    descriptionRu: 'Большой прочный полимерный пакет с прорезной ручкой для хранения 3 кг стирального порошка.',
    descriptionEn: 'Large heavy-duty 3L retail carry bag for laundry powder.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true,
    isGranularOnly: true
  },
  detergent_jug_1500: {
    itemId: 'detergent_jug_1500',
    name: 'Detergent Gel Jug (1.5L)',
    nameRu: 'Канистра-кувшин для геля (1.5л)',
    maxMl: 1500,
    emptyWeightKg: 0.085,
    emptyVolumeL: 1.65,
    category: 'gear',
    icon: 'FlaskConical',
    descriptionRu: 'Эргономичный кувшин с боковой ручкой, носиком-дозатором и мерным колпачком для жидкого геля для стирки.',
    descriptionEn: 'Ergonomic 1.5L HDPE jug with integrated handle and measuring cap for liquid detergent.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true
  },
  detergent_bottle_1000: {
    itemId: 'detergent_bottle_1000',
    name: 'Detergent Balm Bottle (1.0L)',
    nameRu: 'Флакон для жидкого средства (1.0л)',
    maxMl: 1000,
    emptyWeightKg: 0.06,
    emptyVolumeL: 1.1,
    category: 'gear',
    icon: 'FlaskConical',
    descriptionRu: 'Узкий флакон с мерным колпачком и окошком уровня для деликатного бальзама и жидкого порошка.',
    descriptionEn: 'Contoured 1.0L bottle with measuring cap for liquid laundry balm.',
    defaultLiquidId: null,
    defaultAmountMl: 0,
    requiresOpening: true,
    isSealedByDefault: true
  },
  // === UNIFIED KITCHENWARE & TABLEWARE (HYBRID LIQUID + SOLID CONTAINERS) ===
  pot: {
    itemId: 'pot',
    name: 'Pot',
    nameRu: 'Кастрюля',
    maxMl: 3500,
    emptyWeightKg: 1.35,
    emptyVolumeL: 4.0,
    category: 'gear',
    icon: 'Utensils',
    descriptionRu: 'Кухонная кастрюля для варки, тушения и хранения жидкостей и продуктов в едином объёме.',
    descriptionEn: 'Cooking pot supporting both liquids and solid ingredients in shared volume.',
    supportsHybridContents: true,
    maxItemVolumeL: 2.5
  },
  saute_pan: {
    itemId: 'saute_pan',
    name: 'Sauté Pan',
    nameRu: 'Сотейник',
    maxMl: 2400,
    emptyWeightKg: 1.15,
    emptyVolumeL: 2.8,
    category: 'gear',
    icon: 'Utensils',
    descriptionRu: 'Глубокий сотейник с высокими прямыми бортами и длинной ручкой для пассерования, тушения и соусов.',
    descriptionEn: 'Deep straight-walled sauté pan for searing, braising, and sauces.',
    supportsHybridContents: true,
    maxItemVolumeL: 1.8
  },
  frying_pan: {
    itemId: 'frying_pan',
    name: 'Frying Pan',
    nameRu: 'Сковорода',
    maxMl: 1800,
    emptyWeightKg: 1.6,
    emptyVolumeL: 2.2,
    category: 'gear',
    icon: 'Utensils',
    descriptionRu: 'Кухонная сковорода для жарки и тушения — вмещает масло, соус и продукты одновременно.',
    descriptionEn: 'Frying skillet supporting oils, sauces, and solid ingredients.',
    supportsHybridContents: true,
    maxItemVolumeL: 1.4
  },
  kettle: {
    itemId: 'kettle',
    name: 'Kettle',
    nameRu: 'Чайник',
    maxMl: 2200,
    emptyWeightKg: 1.15,
    emptyVolumeL: 2.6,
    category: 'gear',
    icon: 'Coffee',
    descriptionRu: 'Кухонный чайник для кипячения воды и заваривания чая, трав или ягод.',
    descriptionEn: 'Kitchen kettle for boiling water and brewing tea.',
    supportsHybridContents: true,
    maxItemVolumeL: 0.45
  },
  plate: {
    itemId: 'plate',
    name: 'Plate',
    nameRu: 'Тарелка',
    maxMl: 450,
    emptyWeightKg: 0.38,
    emptyVolumeL: 0.55,
    category: 'food',
    icon: 'Utensils',
    descriptionRu: 'Столовая тарелка для подачи готовых блюд, гарниров, салатов и соусов.',
    descriptionEn: 'Dinner plate for serving dishes and meals.',
    supportsHybridContents: true,
    maxItemVolumeL: 0.4
  },
  bowl: {
    itemId: 'bowl',
    name: 'Bowl',
    nameRu: 'Миска',
    maxMl: 650,
    emptyWeightKg: 0.25,
    emptyVolumeL: 0.75,
    category: 'food',
    icon: 'Utensils',
    descriptionRu: 'Глубокая миска для супов, бульонов, салатов, каш и смешивания продуктов.',
    descriptionEn: 'Deep bowl for soups, broths, salads, and mixing.',
    supportsHybridContents: true,
    maxItemVolumeL: 0.6
  },
  mug: {
    itemId: 'mug',
    name: 'Mug',
    nameRu: 'Кружка',
    maxMl: 350,
    emptyWeightKg: 0.28,
    emptyVolumeL: 0.4,
    category: 'drink',
    icon: 'Coffee',
    descriptionRu: 'Кружка для горячих и холодных напитков, чая, кофе и заваривания.',
    descriptionEn: 'Everyday mug for tea, coffee, and drinks.',
    supportsHybridContents: true,
    maxItemVolumeL: 0.28
  },
  cup: {
    itemId: 'cup',
    name: 'Cup',
    nameRu: 'Чашка',
    maxMl: 220,
    emptyWeightKg: 0.22,
    emptyVolumeL: 0.28,
    category: 'drink',
    icon: 'Coffee',
    descriptionRu: 'Изящная чашка для чая, эспрессо и ароматных напитков.',
    descriptionEn: 'Delicate tea or coffee cup.',
    supportsHybridContents: true,
    maxItemVolumeL: 0.18
  },
  spoon: {
    itemId: 'spoon',
    name: 'Spoon',
    nameRu: 'Ложка',
    maxMl: 20,
    emptyWeightKg: 0.06,
    emptyVolumeL: 0.05,
    category: 'misc',
    icon: 'Utensils',
    descriptionRu: 'Столовая или кухонная ложка — вмещает жидкости, сыпучие продукты (сахар, соль, порошок) и мелкие кусочки еды.',
    descriptionEn: 'Table or kitchen spoon holding liquids, powders, spices, or tiny food pieces.',
    supportsHybridContents: true,
    maxItemVolumeL: 0.025
  }
};

// ============================================================================
// HYBRID CONTAINER UNIFIED CAPACITY & FLUID-SOLID MIXING ENGINE
// ============================================================================

const NON_HYBRID_FLUID_CONTAINER_IDS = new Set([
  'tube_ointment_small',
  'ampoule_glass_small',
  'aerosol_can_small',
  'package_sachet',
  'bottle_sauce_squeeze',
  'bottle_plastic_100',
  'tetra_pack_250',
  'tetra_pack_1000',
  'can_alu_330',
  'sandbag',
  'grain_pack_pouch',
  'grain_pack_box',
  'pasta_pack_bag',
  'pasta_pack_long',
  'detergent_box',
  'detergent_bag_3l',
  'detergent_jug_1500',
  'detergent_bottle_1000'
]);

/**
 * Determines whether a fluid container itemId supports holding BOTH liquids and solid items
 * inside one shared volume meter (jars, pots, bowls, mugs, cups, bottles, cans, canisters, kettles).
 */
export function canContainerHoldHybridContents(itemId: string | undefined | null): boolean {
  if (!itemId) return false;
  const cleanId = itemId.replace(/_open$/, '');
  const cfg = getContainerConfig(cleanId);
  if (!cfg) return false;
  if (cfg.supportsHybridContents !== undefined) return cfg.supportsHybridContents;
  if (cfg.isGranularOnly) return false;
  if (NON_HYBRID_FLUID_CONTAINER_IDS.has(cleanId)) return false;
  return true;
}

/**
 * Computes realistic maximum single-item volume (mouth/opening width constraint) for a hybrid vessel.
 */
export function getHybridMaxItemVolumeL(itemId: string | undefined | null, maxMl: number): number {
  const capL = Math.max(0.01, maxMl / 1000);
  const cleanId = (itemId || '').replace(/_open$/, '');
  const cfg = getContainerConfig(cleanId);
  if (cfg?.maxItemVolumeL !== undefined) return cfg.maxItemVolumeL;

  // Wide-mouth vessels (pots, sauté pans, frying pans, bowls, plates)
  if (
    cleanId === 'pot' ||
    cleanId === 'saute_pan' ||
    cleanId === 'frying_pan' ||
    cleanId === 'bowl' ||
    cleanId === 'plate' ||
    cleanId.startsWith('pot_') ||
    cleanId.startsWith('kitchen_pot_') ||
    cleanId.startsWith('kitchen_pan_') ||
    cleanId.startsWith('kitchen_bowl_') ||
    cleanId.startsWith('kitchen_plate_') ||
    cleanId === 'soup_bowl'
  ) {
    return Number(Math.min(capL, Math.max(0.35, capL * 0.85)).toFixed(3));
  }
  if (
    cleanId === 'mug' ||
    cleanId === 'cup' ||
    cleanId === 'kettle' ||
    cleanId.startsWith('jar_glass_') ||
    cleanId.startsWith('can_metal_') ||
    cleanId.startsWith('cup_plastic_') ||
    cleanId.startsWith('kitchen_mug_') ||
    cleanId.startsWith('kitchen_cup_') ||
    cleanId === 'glass_mug' ||
    cleanId === 'paper_cup' ||
    cleanId === 'tin_round_mini'
  ) {
    return Number(Math.min(capL, Math.max(0.18, capL * 0.72)).toFixed(3));
  }
  if (cleanId === 'thermos' || cleanId.startsWith('canister_')) {
    return Number(Math.min(capL, Math.max(0.25, capL * 0.35)).toFixed(3));
  }
  // Narrow-neck bottles / flasks: berries, herbs, diced pieces, small objects
  if (cleanId.startsWith('bottle_') || cleanId === 'glass_bottle_500' || cleanId === 'camp_flask' || cleanId === 'jar_spice_small') {
    return Number(Math.min(capL, Math.max(0.12, Math.min(0.28, capL * 0.35))).toFixed(3));
  }
  return Number(Math.min(capL, Math.max(0.15, capL * 0.65)).toFixed(3));
}

export function isHybridFluidContainer(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  return Boolean(item.fluidStorage && item.isContainer);
}

/**
 * Ensures any eligible fluid container (including items loaded from older saves) has
 * unified hybrid container properties (`isContainer`, `contents`, `containerCapacityL`, `maxContainedItemVolumeL`).
 */
export function ensureHybridContainerProps(item: InventoryItem | null | undefined): void {
  if (!item) return;

  // Forks can hold a bite-sized solid food morsel on their tines (no liquids)
  const isForkUtensil =
    item.itemId === 'fork' ||
    item.itemId === 'kitchen_fork_steel' ||
    item.itemId === 'kitchen_fork_silver' ||
    item.kitchenwareAttributes?.kind === 'fork';
  if (isForkUtensil) {
    item.isContainer = true;
    if (!Array.isArray(item.contents)) item.contents = [];
    if (!item.containerCapacityL) item.containerCapacityL = 0.08;
    if (!item.maxContainedItemVolumeL) item.maxContainedItemVolumeL = 0.08;
    if (!item.maxContainedWeightKg) item.maxContainedWeightKg = 0.35;
    if (!item.allowedItemCategories || item.allowedItemCategories.length === 0) {
      item.allowedItemCategories = ['food'];
    }
    return;
  }

  if (!item.fluidStorage) {
    const directCfg = getContainerConfig(item.itemId);
    if (directCfg && canContainerHoldHybridContents(item.itemId)) {
      const kwCapMl = item.kitchenwareAttributes?.capacityMl;
      const resolvedMaxMl = kwCapMl && kwCapMl > 0 ? kwCapMl : directCfg.maxMl;
      item.fluidStorage = {
        maxMl: resolvedMaxMl,
        currentMl: 0,
        liquidId: null,
        emptyWeightKg: directCfg.emptyWeightKg,
        baseItemNameRu: directCfg.nameRu,
        baseItemNameEn: directCfg.name,
      };
      item.usable = true;
    } else {
      return;
    }
  }
  if (!canContainerHoldHybridContents(item.itemId)) return;
  const maxMl = Math.max(10, item.fluidStorage.maxMl || 500);
  const capL = Number((maxMl / 1000).toFixed(3));
  item.isContainer = true;
  if (!Array.isArray(item.contents)) {
    item.contents = [];
  }
  item.containerCapacityL = capL;
  const maxItemVol = getHybridMaxItemVolumeL(item.itemId, maxMl);
  if (!item.maxContainedItemVolumeL || (capL >= 0.05 && item.maxContainedItemVolumeL > capL)) {
    item.maxContainedItemVolumeL = maxItemVol;
  }
  if (!item.maxContainedWeightKg) {
    item.maxContainedWeightKg = Number(Math.max(0.5, capL * 2.5).toFixed(2));
  }
}

function estimateSingleSolidItemVolumeMl(child: InventoryItem): number {
  const count = Math.max(1, child.count || 1);
  let unitVolL = child.volume;
  if (unitVolL === undefined || !Number.isFinite(unitVolL) || unitVolL <= 0) {
    if (child.fluidStorage) {
      unitVolL = getFluidContainerVolume(child);
    } else {
      unitVolL = Math.max(0.015, (child.weight || 0.1) * 1.0);
    }
  }
  return unitVolL * count * 1000;
}

export function getContainerCapacityMl(container: InventoryItem | null | undefined): number {
  if (!container) return 0;
  if (container.fluidStorage && container.fluidStorage.maxMl > 0) {
    return container.fluidStorage.maxMl;
  }
  if (container.containerCapacityL && container.containerCapacityL > 0) {
    return Math.round(container.containerCapacityL * 1000);
  }
  return 0;
}

export function getContainerSolidVolumeMl(container: InventoryItem | null | undefined): number {
  if (!container || !container.contents || container.contents.length === 0) return 0;
  let totalMl = 0;
  for (const child of container.contents) {
    if (child) {
      totalMl += estimateSingleSolidItemVolumeMl(child);
    }
  }
  return Math.round(totalMl);
}

export function getContainerLiquidVolumeMl(container: InventoryItem | null | undefined): number {
  if (!container || !container.fluidStorage) return 0;
  return Math.max(0, Math.round(container.fluidStorage.currentMl || 0));
}

export function getContainerFreeVolumeMl(container: InventoryItem | null | undefined): number {
  const capMl = getContainerCapacityMl(container);
  if (capMl <= 0) return 0;
  const usedMl = getContainerSolidVolumeMl(container) + getContainerLiquidVolumeMl(container);
  return Math.max(0, capMl - usedMl);
}

export interface ContainerCapacityBreakdown {
  totalCapacityMl: number;
  solidMl: number;
  liquidMl: number;
  usedMl: number;
  freeMl: number;
  solidPct: number;
  liquidPct: number;
  totalPct: number;
  liquidColor: string;
}

export function getContainerCapacityBreakdown(container: InventoryItem | null | undefined): ContainerCapacityBreakdown {
  const totalCapacityMl = getContainerCapacityMl(container);
  const solidMl = getContainerSolidVolumeMl(container);
  const liquidMl = getContainerLiquidVolumeMl(container);
  const usedMl = solidMl + liquidMl;
  const freeMl = Math.max(0, totalCapacityMl - usedMl);
  const denom = Math.max(1, totalCapacityMl);
  const solidPct = Math.min(100, (solidMl / denom) * 100);
  const liquidPct = Math.min(100 - solidPct, (liquidMl / denom) * 100);
  const totalPct = Math.min(100, (usedMl / denom) * 100);
  const liqDef = container?.fluidStorage?.liquidId
    ? LIQUID_REGISTRY[container.fluidStorage.liquidId as LiquidId]
    : undefined;
  const liquidColor =
    container?.fluidStorage?.attributes?.customColor ||
    liqDef?.color ||
    '#38bdf8';

  return {
    totalCapacityMl,
    solidMl,
    liquidMl,
    usedMl,
    freeMl,
    solidPct,
    liquidPct,
    totalPct,
    liquidColor
  };
}

function parseSimpleHex(hex: string | undefined, fallback: [number, number, number] = [56, 189, 248]): [number, number, number] {
  if (!hex || typeof hex !== 'string') return fallback;
  const cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
  } else if (cleaned.length >= 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
  }
  return fallback;
}

function rgbToHexStr(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function blendColorHex(hexA: string, weightA: number, hexB: string, weightB: number): string {
  const total = weightA + weightB;
  if (total <= 0) return hexA;
  const a = parseSimpleHex(hexA);
  const b = parseSimpleHex(hexB);
  return rgbToHexStr(
    (a[0] * weightA + b[0] * weightB) / total,
    (a[1] * weightA + b[1] * weightB) / total,
    (a[2] * weightA + b[2] * weightB) / total
  );
}

function inferSolidInfusionTint(item: InventoryItem): string {
  const explicit = item.attributes?.customColor || item.attributes?.visuals?.color;
  if (explicit && explicit.startsWith('#')) return explicit;
  const id = (item.originalCatalogId || item.itemId || '').toLowerCase();
  const name = (item.nameRu || '').toLowerCase();
  if (id.includes('carrot') || name.includes('морков')) return '#f97316';
  if (id.includes('beet') || name.includes('свёкл') || name.includes('свекл')) return '#9f1239';
  if (id.includes('tomato') || name.includes('томат') || name.includes('помидор')) return '#dc2626';
  if (id.includes('potato') || name.includes('картоф') || name.includes('картош')) return '#fde68a';
  if (id.includes('onion') || name.includes('лук')) return '#d97706';
  if (id.includes('cucumber') || id.includes('cabbage') || id.includes('herb') || id.includes('dill') || id.includes('parsley') || name.includes('огур') || name.includes('капуст') || name.includes('зелен') || name.includes('укроп')) return '#65a30d';
  if (id.includes('berry') || id.includes('strawberr') || id.includes('raspberr') || id.includes('cranberr') || id.includes('cherr') || name.includes('ягод') || name.includes('клубник') || name.includes('малин') || name.includes('вишн')) return '#be123c';
  if (id.includes('blueberr') || id.includes('currant') || name.includes('черник') || name.includes('смородин')) return '#581c87';
  if (id.includes('apple') || id.includes('pear') || id.includes('lemon') || name.includes('яблок') || name.includes('лимон')) return '#eab308';
  if (id.includes('meat') || id.includes('beef') || id.includes('pork') || id.includes('chicken') || id.includes('pelmen') || id.includes('sausage') || name.includes('мяс') || name.includes('куриц') || name.includes('говяд') || name.includes('свинин') || name.includes('пельмен')) return '#b45309';
  if (id.includes('mushroom') || name.includes('гриб')) return '#78350f';
  if (id.includes('tea') || id.includes('coffee') || id.includes('chocolate') || name.includes('чай') || name.includes('кофе') || name.includes('шоколад')) return '#78350f';
  if (id.includes('salt') || id.includes('sugar') || name.includes('соль') || name.includes('сахар')) return '#e2e8f0';
  return '#d97706';
}

function isSolubleSolidItem(item: InventoryItem): boolean {
  const id = (item.originalCatalogId || item.itemId || '').toLowerCase();
  return (
    id === 'salt' ||
    id === 'salt_fine' ||
    id === 'sugar' ||
    id === 'sugar_cube' ||
    id.includes('tea_bag') ||
    id.includes('instant_coffee') ||
    id.includes('bouillon_cube')
  );
}

/**
 * Simulates physical & culinary interaction between the liquid phase and submerged solid items
 * inside a hybrid container: submersion, wetting/coating, heat exchange, steeping/infusion,
 * color/nutrition transfer into the liquid, and hot boiling/cooking.
 */
export interface CheeseMeltingProfile {
  meltStartC: number;
  fullMeltC: number;
  meltSpeed: number;
  colorHex: string;
  labelRu: string;
}

export function isMeltableCheeseItem(item: InventoryItem | null | undefined): boolean {
  if (!item || item.category !== 'food') return false;
  if (item.fluidStorage || (item.containerVisuals && !item.isOpen)) return false;
  const id = (item.itemId || '').toLowerCase();
  const name = (item.nameRu || '').toLowerCase();
  if (
    id.includes('cottage_cheese') ||
    name.includes('творог') ||
    name.includes('творож') ||
    name.includes('сырник') ||
    name.includes('сырок')
  ) {
    return false;
  }
  return id.startsWith('cheese_') || id.includes('cheese') || /\bсыр/.test(name) || name.includes('моцарелл') || name.includes('чеддер') || name.includes('гауда') || name.includes('пармезан') || name.includes('сулугуни') || name.includes('фета');
}

export function getCheeseMeltingProfile(item: InventoryItem): CheeseMeltingProfile {
  const id = (item.itemId || '').toLowerCase();
  const name = (item.nameRu || '').toLowerCase();
  if (id.includes('mozzarella') || name.includes('моцарелл')) {
    return { meltStartC: 50, fullMeltC: 70, meltSpeed: 1.35, colorHex: '#fef3c7', labelRu: 'моцареллой' };
  }
  if (id.includes('suluguni') || name.includes('сулугуни')) {
    return { meltStartC: 54, fullMeltC: 74, meltSpeed: 1.25, colorHex: '#fde68a', labelRu: 'сулугуни' };
  }
  if (id.includes('cheddar') || name.includes('чеддер')) {
    return { meltStartC: 56, fullMeltC: 78, meltSpeed: 1.15, colorHex: '#f59e0b', labelRu: 'чеддером' };
  }
  if (id.includes('gouda') || name.includes('гауд')) {
    return { meltStartC: 56, fullMeltC: 78, meltSpeed: 1.15, colorHex: '#fbbf24', labelRu: 'гаудой' };
  }
  if (id.includes('feta') || name.includes('фет')) {
    return { meltStartC: 65, fullMeltC: 88, meltSpeed: 0.78, colorHex: '#fef9c3', labelRu: 'фетой' };
  }
  if (id.includes('parmesan') || name.includes('пармезан')) {
    return { meltStartC: 70, fullMeltC: 94, meltSpeed: 0.72, colorHex: '#fcd34d', labelRu: 'пармезаном' };
  }
  return { meltStartC: 55, fullMeltC: 76, meltSpeed: 1.1, colorHex: '#fbbf24', labelRu: 'сыром' };
}

function isFinelyCutFood(item: InventoryItem): boolean {
  const cut = String(item.produceAttributes?.cutForm || '').toLowerCase();
  if (
    cut === 'diced' ||
    cut === 'minced' ||
    cut === 'sliced' ||
    cut === 'strips' ||
    cut === 'shredded' ||
    cut === 'grated' ||
    cut === 'crushed' ||
    cut === 'chopped' ||
    cut === 'rings' ||
    cut === 'wedges' ||
    cut === 'quartered' ||
    cut === 'halved' ||
    cut === 'clove'
  ) {
    return true;
  }
  const name = (item.nameRu || '').toLowerCase();
  if (
    name.includes('нарез') ||
    name.includes('мелк') ||
    name.includes('измельч') ||
    name.includes('рублен') ||
    name.includes('тёрт') ||
    name.includes('терт') ||
    name.includes('кубик') ||
    name.includes('кольц') ||
    name.includes('ломт') ||
    name.includes('дольк') ||
    name.includes('зубчик') ||
    name.includes('стружк')
  ) {
    return true;
  }
  return typeof item.weight === 'number' && item.weight > 0 && item.weight <= 0.085;
}

export function applyCheeseMeltingStep(
  item: InventoryItem,
  effTemp: number,
  dtSeconds: number,
  medium: 'oil' | 'dry' | 'oven' | 'microwave' | 'water'
): boolean {
  if (!isMeltableCheeseItem(item) || dtSeconds <= 0) return false;
  const prof = getCheeseMeltingProfile(item);
  if (effTemp < prof.meltStartC) return false;

  let changed = false;
  const cutMult = isFinelyCutFood(item) ? 1.55 : 1.0;
  const rate = Math.max(0.025, ((effTemp - (prof.meltStartC - 8)) / 34) * 0.095 * prof.meltSpeed * cutMult);
  const prevMelt = item.meltLevel || 0;
  const nextMelt = Math.min(1.0, Number((prevMelt + rate * dtSeconds).toFixed(3)));
  if (nextMelt !== prevMelt) {
    item.meltLevel = nextMelt;
    item.cookProgress = Math.max(item.cookProgress || 0, nextMelt);
    changed = true;
  }

  const curState = item.attributes?.state;
  const isBurnt = curState === 'burnt' || (item.charLevel || 0) >= 0.55;
  if (!isBurnt && nextMelt >= 0.28) {
    const isFullyMelted = nextMelt >= 0.72;
    const prevStateRu = item.attributes?.stateNameRu;
    const nextStateRu = isFullyMelted ? 'Расплавленный' : 'Плавящийся';
    if (curState !== 'melted' || prevStateRu !== nextStateRu) {
      const wasCookedOrMelted =
        curState === 'melted' || curState === 'fried' || curState === 'baked' || curState === 'boiled' || curState === 'cooked';
      item.cookMethod = medium === 'oven' ? 'baked' : medium === 'microwave' ? 'microwaved' : 'fried';
      item.attributes = {
        ...(item.attributes || {}),
        state: 'melted',
        stateNameRu: nextStateRu,
        preparationMethod:
          medium === 'oven'
            ? 'Расплавлено в духовке'
            : medium === 'microwave'
            ? 'Расплавлено в микроволновке'
            : medium === 'oil'
            ? 'Расплавлено на сковороде'
            : 'Расплавлено при нагреве',
      };
      if (!wasCookedOrMelted && item.effects && typeof item.effects.hunger === 'number') {
        item.effects.hunger = Math.round(item.effects.hunger * 1.14);
      }
      changed = true;
    }
  }

  // Once fully melted, high dry/oil/oven heat (>= 142°C) forms a golden crispy melted cheese crust
  if (nextMelt >= 0.88 && effTemp >= 142 && medium !== 'water' && medium !== 'microwave') {
    const prevBrown = item.brownLevel || 0;
    const brownRate = ((effTemp - 132) / 90) * 0.042;
    const nextBrown = Math.min(0.85, Number((prevBrown + brownRate * dtSeconds).toFixed(3)));
    if (nextBrown !== prevBrown) {
      item.brownLevel = nextBrown;
      changed = true;
    }
    if (nextBrown >= 0.45 && !isBurnt && item.attributes?.stateNameRu !== 'Запечённый расплавленный') {
      item.attributes = {
        ...(item.attributes || {}),
        state: 'melted',
        stateNameRu: 'Запечённый расплавленный',
        preparationMethod: 'Расплавлено до румяной сырной корочки',
      };
      changed = true;
    }
    // Scorching only if left very hot (>= 192°C) after browning deeply
    if (nextBrown >= 0.78 && effTemp >= 192) {
      const prevChar = item.charLevel || 0;
      const nextChar = Math.min(1.0, Number((prevChar + ((effTemp - 182) / 65) * 0.018 * dtSeconds).toFixed(3)));
      if (nextChar !== prevChar) {
        item.charLevel = nextChar;
        changed = true;
      }
      if (nextChar >= 0.55 && item.attributes?.state !== 'burnt') {
        item.attributes = {
          ...(item.attributes || {}),
          state: 'burnt',
          stateNameRu: 'Подгорелый',
          preparationMethod: 'Сыр подгорел при перегреве',
        };
        changed = true;
      }
    }
  }

  return changed;
}

export function isPanAromaticItem(item: InventoryItem | null | undefined): {
  isAromatic: boolean;
  isFinelyCut: boolean;
  labelRu: string;
} {
  if (!item || item.category !== 'food') {
    return { isAromatic: false, isFinelyCut: false, labelRu: '' };
  }
  if (item.fluidStorage || (item.containerVisuals && !item.isOpen)) {
    return { isAromatic: false, isFinelyCut: false, labelRu: '' };
  }
  const id = (item.itemId || '').toLowerCase();
  const name = (item.nameRu || '').toLowerCase();
  const fine = isFinelyCutFood(item);

  if (id.includes('garlic') || name.includes('чеснок')) {
    return { isAromatic: true, isFinelyCut: fine, labelRu: 'чесноком' };
  }
  if (id.includes('onion') || id.includes('shallot') || id.includes('leek') || /\bлук/.test(name) || name.includes('луков')) {
    return { isAromatic: true, isFinelyCut: fine, labelRu: 'луком' };
  }
  if (
    id.includes('herb') ||
    id.includes('dill') ||
    id.includes('parsley') ||
    id.includes('basil') ||
    id.includes('cilantro') ||
    id.includes('thyme') ||
    id.includes('rosemary') ||
    name.includes('укроп') ||
    name.includes('петрушк') ||
    name.includes('базилик') ||
    name.includes('кинз') ||
    name.includes('тимьян') ||
    name.includes('розмарин') ||
    name.includes('зелень')
  ) {
    return { isAromatic: true, isFinelyCut: true, labelRu: 'зеленью' };
  }
  if (id.includes('ginger') || name.includes('имбир')) {
    return { isAromatic: true, isFinelyCut: fine, labelRu: 'имбирём' };
  }
  if (id.includes('chili') || name.includes('чили') || name.includes('острый перец')) {
    return { isAromatic: true, isFinelyCut: fine, labelRu: 'перцем чили' };
  }
  return { isAromatic: false, isFinelyCut: false, labelRu: '' };
}

function formatPanPreparationMethod(
  baseMethod: string,
  seasonings: string[],
  cheeseGlazed: boolean
): string {
  const cleanBase = baseMethod
    .replace(/\s+с\s+[^()]+$/i, '')
    .replace(/\s+под расплавленным сыром.*$/i, '')
    .trim() || 'Обжарено в масле';
  const extras: string[] = [];
  if (seasonings.length > 0) {
    const uniq = Array.from(new Set(seasonings));
    const joined = uniq.length > 1
      ? `${uniq.slice(0, -1).join(', ')} и ${uniq[uniq.length - 1]}`
      : uniq[0];
    extras.push(`с ${joined}`);
  }
  if (cheeseGlazed) {
    extras.push('под расплавленным сыром');
  }
  return extras.length > 0 ? `${cleanBase} ${extras.join(' ')}` : cleanBase;
}

/**
 * Automatically blends melted cheese glaze and sautéed aromatic seasonings (onion, garlic, herbs)
 * onto neighboring hot solid foods cooking together in the same pan/pot/baking vessel.
 */
export function blendPanCheeseAndAromatics(
  container: InventoryItem | null | undefined,
  medium: 'oil' | 'dry' | 'oven' = 'oil'
): boolean {
  if (!container || !Array.isArray(container.contents) || container.contents.length < 2) return false;
  const contents = container.contents;

  let meltedCheeseColor: string | null = null;
  let hasMeltedCheese = false;
  const activeAromatics: string[] = [];

  for (const ch of contents) {
    if (!ch || ch.category !== 'food') continue;
    const t = ch.surfaceTemperature ?? ch.temperature ?? container.temperature ?? 20;
    if (isMeltableCheeseItem(ch) && (ch.meltLevel || 0) >= 0.45 && t >= 55) {
      hasMeltedCheese = true;
      if (!meltedCheeseColor) {
        meltedCheeseColor = getCheeseMeltingProfile(ch).colorHex;
      }
    }
    const arom = isPanAromaticItem(ch);
    if (arom.isAromatic && t >= 75 && ((ch.cookProgress || 0) >= 0.18 || arom.isFinelyCut)) {
      if (!activeAromatics.includes(arom.labelRu)) {
        activeAromatics.push(arom.labelRu);
      }
    }
  }

  if (!hasMeltedCheese && activeAromatics.length === 0) return false;

  let changed = false;
  for (const target of contents) {
    if (!target || target.category !== 'food') continue;
    if (target.fluidStorage || (target.containerVisuals && !target.isOpen)) continue;
    if (isMeltableCheeseItem(target)) continue;

    const targetTemp = target.surfaceTemperature ?? target.temperature ?? container.temperature ?? 20;
    if (targetTemp < 55) continue;

    const targetArom = isPanAromaticItem(target);
    let targetModified = false;

    // 1. Melted cheese coats adjacent hot solid foods (steaks, mushrooms, veg, etc.)
    if (hasMeltedCheese && !target.cheeseGlazed) {
      target.cheeseGlazed = true;
      target.cheeseGlazeColor = meltedCheeseColor || '#fbbf24';
      if (target.effects && typeof target.effects.hunger === 'number') {
        target.effects.hunger = Math.round(target.effects.hunger * 1.14);
      }
      targetModified = true;
    }

    // 2. Sautéed aromatics (onion, garlic, herbs) infuse & season neighboring foods
    const relevantAromatics = activeAromatics.filter(lbl => !targetArom.isAromatic || lbl !== targetArom.labelRu);
    if (relevantAromatics.length > 0) {
      const existing = Array.isArray(target.sauteSeasonings) ? target.sauteSeasonings : [];
      const merged = Array.from(new Set([...existing, ...relevantAromatics]));
      if (merged.length > existing.length) {
        const addedCount = merged.length - existing.length;
        target.sauteSeasonings = merged;
        if (target.effects && typeof target.effects.hunger === 'number') {
          target.effects.hunger = Math.round(target.effects.hunger * (1 + Math.min(0.16, addedCount * 0.07)));
        }
        targetModified = true;
      }
    }

    if (targetModified) {
      const baseMethod =
        target.attributes?.preparationMethod ||
        (medium === 'oil'
          ? 'Обжарено в горячем масле'
          : medium === 'oven'
          ? 'Запечено в духовке'
          : 'Обжарено на сковороде');
      target.attributes = {
        ...(target.attributes || {}),
        preparationMethod: formatPanPreparationMethod(
          baseMethod,
          target.sauteSeasonings || [],
          Boolean(target.cheeseGlazed)
        ),
      };
      changed = true;
    }
  }

  return changed;
}

/**
 * Actively stirs/tosses the contents of a cooking vessel (skillet, pot, sauté pan):
 * - Equalizes temperature across ingredients and prevents early bottom scorching
 * - Evenly mixes melted cheese and finely chopped aromatics (onion, garlic, herbs) over main foods
 * - Folds finely minced sautéed aromatics and modest melted cheese portions directly onto the main
 *   foods (preserving 100% of mass & satiety), leaving whole pieces intact and glazed.
 */
export function stirCookwareContainer(
  container: InventoryItem | null | undefined
): { stirred: boolean; messageRu: string } {
  if (!container || !Array.isArray(container.contents) || container.contents.length === 0) {
    return { stirred: false, messageRu: 'В посуде нет продуктов для перемешивания' };
  }

  const contents = container.contents;
  const containerTemp = container.temperature ?? 20;
  const liqProf = getContainerLiquidThermalProfile(container);
  const isOil = liqProf?.cookingMedium === 'oil';

  // 1. Equalize temperature across contents & ease early scorching from bottom contact
  let tempSum = containerTemp;
  let tempCount = 1;
  for (const ch of contents) {
    if (!ch) continue;
    tempSum += ch.temperature ?? containerTemp;
    tempCount++;
  }
  const meanTemp = Math.round((tempSum / tempCount) * 10) / 10;
  for (const ch of contents) {
    if (!ch) continue;
    const prevT = ch.temperature ?? containerTemp;
    ch.temperature = Math.round((prevT * 0.4 + meanTemp * 0.6) * 10) / 10;
    ch.surfaceTemperature = ch.temperature;
    if ((ch.charLevel || 0) > 0 && (ch.charLevel || 0) < 0.4) {
      ch.charLevel = Math.max(0, Number(((ch.charLevel || 0) - 0.08).toFixed(3)));
    }
  }

  // 2. Identify main solid foods vs meltable cheese vs finely chopped aromatics
  const mainFoods: InventoryItem[] = [];
  const meltedCheeses: Array<{ idx: number; item: InventoryItem; prof: CheeseMeltingProfile }> = [];
  const fineAromatics: Array<{ idx: number; item: InventoryItem; labelRu: string }> = [];
  const allAromaticLabels: string[] = [];

  for (let i = 0; i < contents.length; i++) {
    const ch = contents[i];
    if (!ch || ch.category !== 'food') continue;
    if (ch.fluidStorage || (ch.containerVisuals && !ch.isOpen)) continue;

    if (isMeltableCheeseItem(ch)) {
      const t = ch.temperature ?? containerTemp;
      // Stirring hot pan helps cheese soften/melt rapidly if pan is already hot
      if (t >= 52 && (ch.meltLevel || 0) < 0.75) {
        applyCheeseMeltingStep(ch, Math.max(t, containerTemp), 3.0, isOil ? 'oil' : 'dry');
      }
      if ((ch.meltLevel || 0) >= 0.4) {
        meltedCheeses.push({ idx: i, item: ch, prof: getCheeseMeltingProfile(ch) });
      }
      continue;
    }

    const arom = isPanAromaticItem(ch);
    if (arom.isAromatic) {
      if (!allAromaticLabels.includes(arom.labelRu)) {
        allAromaticLabels.push(arom.labelRu);
      }
      if (arom.isFinelyCut) {
        fineAromatics.push({ idx: i, item: ch, labelRu: arom.labelRu });
      } else {
        mainFoods.push(ch);
      }
      continue;
    }

    mainFoods.push(ch);
  }

  // 3. Apply cheese glaze & aromatic seasonings across all main foods
  const foldedIndices = new Set<number>();
  const foldedLabels: string[] = [];

  if (mainFoods.length > 0) {
    const mainWeightKg = mainFoods.reduce((sum, it) => sum + Math.max(0.02, (it.weight || 0.1) * (it.count || 1)), 0);

    // Fold finely chopped aromatics into the sauté coating on the main foods when warm/hot
    for (const aromEntry of fineAromatics) {
      const aromWeight = (aromEntry.item.weight || 0.03) * (aromEntry.item.count || 1);
      const t = Math.max(aromEntry.item.temperature ?? 20, containerTemp);
      if (t >= 60 && aromWeight <= Math.max(0.15, mainWeightKg * 0.55)) {
        const extraHungerPerMain = Math.round(((aromEntry.item.effects?.hunger || 4) * (aromEntry.item.count || 1)) / mainFoods.length);
        const extraWeightPerMain = aromWeight / mainFoods.length;
        for (const mf of mainFoods) {
          mf.weight = Number(((mf.weight || 0.1) + extraWeightPerMain).toFixed(3));
          if (mf.effects && typeof mf.effects.hunger === 'number') {
            mf.effects.hunger = Math.min(100, mf.effects.hunger + Math.max(2, extraHungerPerMain));
          }
          const existing = Array.isArray(mf.sauteSeasonings) ? mf.sauteSeasonings : [];
          mf.sauteSeasonings = Array.from(new Set([...existing, aromEntry.labelRu]));
        }
        foldedIndices.add(aromEntry.idx);
        if (!foldedLabels.includes(aromEntry.labelRu)) foldedLabels.push(aromEntry.labelRu);
      }
    }

    // Coat main foods with melted cheese (and fold melted cheese if its mass is reasonable relative to main foods)
    for (const cheeseEntry of meltedCheeses) {
      const cheeseWeight = (cheeseEntry.item.weight || 0.08) * (cheeseEntry.item.count || 1);
      const isFullyMelted = (cheeseEntry.item.meltLevel || 0) >= 0.65;
      for (const mf of mainFoods) {
        if (!mf.cheeseGlazed) {
          mf.cheeseGlazed = true;
          mf.cheeseGlazeColor = cheeseEntry.prof.colorHex;
        }
      }
      if (isFullyMelted && cheeseWeight <= Math.max(0.22, mainWeightKg * 0.65)) {
        const extraHungerPerMain = Math.round(((cheeseEntry.item.effects?.hunger || 14) * (cheeseEntry.item.count || 1)) / mainFoods.length);
        const extraWeightPerMain = cheeseWeight / mainFoods.length;
        for (const mf of mainFoods) {
          mf.weight = Number(((mf.weight || 0.1) + extraWeightPerMain).toFixed(3));
          if (mf.effects && typeof mf.effects.hunger === 'number') {
            mf.effects.hunger = Math.min(100, mf.effects.hunger + Math.max(4, extraHungerPerMain));
          }
        }
        foldedIndices.add(cheeseEntry.idx);
        if (!foldedLabels.includes('расплавленным сыром')) foldedLabels.push('расплавленным сыром');
      } else if (!foldedLabels.includes('сыром')) {
        foldedLabels.push('сыром');
      }
    }

    // Apply any remaining aromatic labels & refresh preparationMethod on every main food
    for (const mf of mainFoods) {
      if (allAromaticLabels.length > 0) {
        const existing = Array.isArray(mf.sauteSeasonings) ? mf.sauteSeasonings : [];
        mf.sauteSeasonings = Array.from(new Set([...existing, ...allAromaticLabels]));
      }
      const baseMethod =
        mf.attributes?.preparationMethod ||
        (isOil ? 'Обжарено в горячем масле' : 'Обжарено на сковороде');
      mf.attributes = {
        ...(mf.attributes || {}),
        preparationMethod: formatPanPreparationMethod(
          baseMethod,
          mf.sauteSeasonings || [],
          Boolean(mf.cheeseGlazed)
        ),
      };
    }
  } else {
    // Still blend passive cheese/aromatics even if no separate main foods
    blendPanCheeseAndAromatics(container, isOil ? 'oil' : 'dry');
  }

  // Remove folded finely-chopped aromatics / melted cheese (their weight & satiety are now on the main foods)
  if (foldedIndices.size > 0) {
    const sorted = Array.from(foldedIndices).sort((a, b) => b - a);
    for (const idx of sorted) {
      contents.splice(idx, 1);
    }
  }

  // Rotate remaining order gently to represent tossing/stirring
  if (contents.length > 1) {
    const first = contents.shift();
    if (first) contents.push(first);
  }

  syncItemContainerProperties(container);

  if (foldedLabels.length > 0) {
    const listStr = foldedLabels.length > 1
      ? `${foldedLabels.slice(0, -1).join(', ')} и ${foldedLabels[foldedLabels.length - 1]}`
      : foldedLabels[0];
    return {
      stirred: true,
      messageRu: `Перемешано: блюда равномерно покрыты ${listStr}`,
    };
  }
  return {
    stirred: true,
    messageRu: 'Содержимое посуды равномерно перемешано',
  };
}

export function updateHybridContainerInteraction(
  container: InventoryItem | null | undefined,
  dtSeconds: number = 0
): boolean {
  if (!container || !container.fluidStorage) return false;
  ensureHybridContainerProps(container);

  const storage = container.fluidStorage;
  const contents = container.contents;
  if (!contents || contents.length === 0) {
    if (dtSeconds > 0 && tickHomemadeLiquidTransformations(container, dtSeconds)) {
      syncItemContainerProperties(container);
      return true;
    }
    return false;
  }

  const liquidMl = Math.max(0, storage.currentMl || 0);
  const liqDef = storage.liquidId ? LIQUID_REGISTRY[storage.liquidId as LiquidId] : undefined;
  const hasRealLiquid = liquidMl >= 3 && Boolean(storage.liquidId) && !isFluidStorageDryForm(storage);
  const thermalProf = hasRealLiquid ? getContainerLiquidThermalProfile(container) : null;

  let changed = false;

  if (!hasRealLiquid) {
    // Container is dry or holds only dry granular material -> clear submersion & slowly dry wet items if open
    const isDryOpen = Boolean(container.isOpen || !getContainerConfig(container.itemId)?.requiresOpening);
    for (const child of contents) {
      if (!child) continue;
      if (child.submersionLevel && child.submersionLevel > 0) {
        child.submersionLevel = 0;
        changed = true;
      }
      if (dtSeconds > 0 && isDryOpen && (child.wetness || 0) > 0) {
        const tempC = container.temperature ?? 20;
        const dryRate = Math.max(0.15, (tempC - 5) * 0.04);
        child.wetness = Math.max(0, (child.wetness || 0) - dryRate * dtSeconds);
        if (child.wetness <= 1) {
          child.wetness = 0;
          child.soapyLevel = 0;
          child.soakedLiquidId = undefined;
          child.soakedLiquidNameRu = undefined;
          child.soakedColor = undefined;
        }
        changed = true;
      }
      // Dry-pan cheese melting & aromatic blending
      if (dtSeconds > 0 && isMeltableCheeseItem(child)) {
        const effTemp = Math.max(child.surfaceTemperature ?? child.temperature ?? 20, container.temperature ?? 20);
        if (applyCheeseMeltingStep(child, effTemp, dtSeconds, 'dry')) {
          changed = true;
        }
      }
    }
    if (dtSeconds > 0 && blendPanCheeseAndAromatics(container, 'dry')) {
      changed = true;
    }
    // Still allow dry-vessel homemade transformations (butter -> ghee, tallow -> rendered_fat, cabbage+salt -> sauerkraut, fruit+sugar -> jam, tomato/zucchini stewing, etc.)
    if (dtSeconds > 0 && tickHomemadeLiquidTransformations(container, dtSeconds)) {
      changed = true;
    }
    if (changed) {
      syncItemContainerProperties(container);
    }
    return changed;
  }

  const solidMl = Math.max(1, getContainerSolidVolumeMl(container));
  const submersion = Math.max(0.2, Math.min(1.0, liquidMl / (solidMl + liquidMl * 0.4)));
  const fluidTemp = container.temperature ?? 20.0;
  const fluidBaseColor = storage.attributes?.customColor || liqDef?.color || '#38bdf8';
  const fluidDisplayName = storage.attributes?.varietyRu || liqDef?.nameRu || storage.liquidId || 'Жидкость';
  const cookingMedium: LiquidCookingMedium = thermalProf?.cookingMedium || 'water';
  const isOilMedium = cookingMedium === 'oil';
  const isSugarMedium = cookingMedium === 'sugar';
  const isCulinaryMedium = cookingMedium !== 'non_culinary' && cookingMedium !== 'granular';

  if (!storage.infusedItems) {
    storage.infusedItems = [];
  }

  let avgChildTempSum = 0;
  let avgChildTempCount = 0;
  const dissolvedIndices: number[] = [];

  for (let idx = 0; idx < contents.length; idx++) {
    const child = contents[idx];
    if (!child) continue;

    // 1. Submersion & Wetting / Coating
    const prevWet = child.wetness || 0;
    const wetGain = dtSeconds > 0 ? Math.min(100 - prevWet, (35 + 45 * submersion) * Math.min(dtSeconds, 2.0)) : Math.max(35, 65 * submersion);
    const nextWet = Math.min(100, Math.max(prevWet, Math.round((prevWet + wetGain) * 10) / 10));
    const isDetergentFluid = storage.liquidId === 'detergent';
    if (nextWet !== prevWet || child.soakedLiquidId !== storage.liquidId || child.submersionLevel !== submersion) {
      child.wetness = nextWet;
      child.soakedLiquidId = storage.liquidId || undefined;
      child.soakedLiquidNameRu = liqDef?.nameRu || fluidDisplayName;
      // Culinary oils coat food with a subtle golden sheen rather than dyeing food dark brown
      child.soakedColor = isOilMedium ? '#f5d061' : fluidBaseColor;
      child.submersionLevel = Number(submersion.toFixed(2));
      if (isDetergentFluid) {
        child.soapyLevel = Math.min(1, Math.max(child.soapyLevel || 0, nextWet / 100));
      } else if (storage.liquidId === 'water' && (child.soapyLevel || 0) > 0 && dtSeconds > 0) {
        child.soapyLevel = Math.max(0, Number(((child.soapyLevel || 0) - 0.3 * dtSeconds).toFixed(2)));
      }
      changed = true;
    }

    // 2. Rapid thermal conduction between liquid and submerged/coated solid item
    const childTemp = child.temperature ?? 20.0;
    if (dtSeconds > 0 && Math.abs(fluidTemp - childTemp) > 0.25) {
      // Hot oil transfers surface searing heat even faster than standing water
      const kLiquidCond = (isOilMedium ? 0.38 : 0.28) * Math.max(0.45, submersion);
      const alpha = Math.min(0.7, kLiquidCond * dtSeconds);
      const nextChildTemp = childTemp + (fluidTemp - childTemp) * alpha;
      child.temperature = Math.round(nextChildTemp * 10) / 10;
      child.surfaceTemperature = child.temperature;
      child.isThermalStable = false;
      changed = true;
    }
    avgChildTempSum += (child.temperature ?? fluidTemp);
    avgChildTempCount++;

    // 3. Steeping / Infusion / Thermal Cooking inside culinary liquids
    const isEdibleSolid = child.category === 'food' || child.category === 'drink' || isSolubleSolidItem(child);
    const isCulinaryLiquid = Boolean(liqDef?.isDrinkable) && isCulinaryMedium;
    const isSealedPack = Boolean(child.fluidStorage || (child.containerVisuals && !child.isOpen));
    const isCheese = isMeltableCheeseItem(child);

    if (isEdibleSolid && isCulinaryLiquid) {
      const heatBoost = fluidTemp >= 120 ? 4.0 : fluidTemp >= 80 ? 3.5 : fluidTemp >= 55 ? 2.0 : fluidTemp >= 30 ? 1.0 : 0.45;
      const baseInfuseStep = dtSeconds > 0 ? 0.018 * heatBoost * submersion * dtSeconds : 0.08 * submersion;
      const prevInf = child.infusionProgress || 0;
      const nextInf = Math.min(1.0, Number((prevInf + baseInfuseStep).toFixed(3)));
      if (nextInf !== prevInf) {
        child.infusionProgress = nextInf;
        changed = true;
      }

      const cleanSolidName = child.nameRu.replace(/\s*\([^)]*\)\s*$/g, '').trim() || child.nameRu;
      const tint = inferSolidInfusionTint(child);
      let rec = storage.infusedItems.find(r => r.itemId === child.itemId && r.nameRu === cleanSolidName);
      if (!rec) {
        rec = {
          itemId: child.itemId,
          nameRu: cleanSolidName,
          intensity: nextInf,
          color: tint
        };
        storage.infusedItems.push(rec);
        changed = true;
      } else if (nextInf > rec.intensity) {
        rec.intensity = nextInf;
        changed = true;
      }

      // 3-CHEESE: Meltable cheeses melt smoothly in hot oil, sauces, or warm broths instead of boiling/frying raw!
      if (isCheese && !isSealedPack && dtSeconds > 0) {
        const effTemp = Math.max(child.surfaceTemperature ?? child.temperature ?? 20, fluidTemp);
        if (applyCheeseMeltingStep(child, effTemp, dtSeconds, isOilMedium ? 'oil' : 'water')) {
          changed = true;
        }
      }
      // 3A. OIL & RENDERED FAT FRYING (Жарка в масле / жире — до ~205°C, золотистая корочка и защита от подгорания!)
      else if (isOilMedium && child.category === 'food' && !isSealedPack && dtSeconds > 0) {
        const effTemp = Math.max(child.surfaceTemperature ?? child.temperature ?? 20, fluidTemp);
        if (effTemp >= 65) {
          const cookRate = Math.max(0.018, ((effTemp - 55) / 80) * 0.085);
          const prevCook = child.cookProgress || 0;
          const nextCook = Math.min(1.0, Number((prevCook + cookRate * dtSeconds).toFixed(3)));
          if (nextCook !== prevCook) {
            child.cookProgress = nextCook;
            child.cookMethod = 'fried';
            changed = true;
          }

          // Rich even Maillard browning in hot oil (>= 95°C)
          if (effTemp >= 95) {
            const prevBrown = child.brownLevel || 0;
            const brownRate = ((effTemp - 85) / 85) * 0.075;
            const nextBrown = Math.min(1.0, Number((prevBrown + brownRate * dtSeconds).toFixed(3)));
            if (nextBrown !== prevBrown) {
              child.brownLevel = nextBrown;
              changed = true;
            }
          }

          const curState = child.attributes?.state;
          const isBurnt = curState === 'burnt' || (child.charLevel || 0) >= 0.55;
          const alreadyFried = curState === 'fried' && child.attributes?.stateNameRu === 'Жареный в масле';
          const alreadyAnyCooked =
            curState === 'fried' || curState === 'baked' || curState === 'boiled' || curState === 'cooked';

          if (!isBurnt && !alreadyFried && ((child.cookProgress || 0) >= 0.42 || (child.brownLevel || 0) >= 0.28)) {
            child.cookMethod = 'fried';
            child.attributes = {
              ...(child.attributes || {}),
              state: 'fried',
              stateNameRu: 'Жареный в масле',
              preparationMethod: formatPanPreparationMethod(
                'Обжарено в горячем масле',
                child.sauteSeasonings || [],
                Boolean(child.cheeseGlazed)
              ),
            };
            if (!alreadyAnyCooked && child.effects && typeof child.effects.hunger === 'number') {
              child.effects.hunger = Math.round(child.effects.hunger * 1.24);
            }
            if (child.doughAttributes) {
              syncDoughCookedState(child, 'fried', { isDeepOil: submersion >= 0.72 });
            }
            changed = true;
          }

          // Oil protects from premature burning up to ~182°C (vs 132°C dry); above smokePoint chars faster
          const oilCharThreshold = Math.max(175, (thermalProf?.smokePointC ?? 205) - 22);
          if ((child.cookProgress || 0) >= 0.94 && (child.brownLevel || 0) >= 0.78 && effTemp >= oilCharThreshold) {
            const overSmoke = effTemp >= (thermalProf?.smokePointC ?? 205);
            const charRate = ((effTemp - (oilCharThreshold - 10)) / 70) * (overSmoke ? 0.032 : 0.016);
            const prevChar = child.charLevel || 0;
            const nextChar = Math.min(1.0, Number((prevChar + charRate * dtSeconds).toFixed(3)));
            if (nextChar !== prevChar) {
              child.charLevel = nextChar;
              changed = true;
            }
            if (nextChar >= 0.55 && child.attributes?.state !== 'burnt') {
              child.attributes = {
                ...(child.attributes || {}),
                state: 'burnt',
                stateNameRu: 'Подгорелый',
                preparationMethod: 'Пережарено в раскалённом масле',
              };
              if (child.doughAttributes) {
                syncDoughCookedState(child, 'burnt');
              }
              changed = true;
            }
          }
        }
      }
      // 3B. SUGAR / HONEY / SYRUP CARAMELIZING (Карамелизация)
      else if (isSugarMedium && child.category === 'food' && !isSealedPack && dtSeconds > 0) {
        if (fluidTemp >= 78) {
          const rate = ((fluidTemp - 70) / 38) * 0.055 * submersion;
          child.cookProgress = Math.min(1.0, Number(((child.cookProgress || 0) + rate * dtSeconds).toFixed(3)));
          child.cookMethod = 'baked';
          if (fluidTemp >= 100) {
            child.brownLevel = Math.min(0.85, Number(((child.brownLevel || 0) + 0.042 * dtSeconds).toFixed(3)));
          }
          if ((child.cookProgress || 0) >= 0.6 && child.attributes?.state !== 'baked' && child.attributes?.state !== 'burnt') {
            child.attributes = {
              ...(child.attributes || {}),
              state: 'baked',
              stateNameRu: 'Карамелизированный',
              preparationMethod: 'Томление и карамелизация в сиропе / мёде',
            };
            if (child.effects && typeof child.effects.hunger === 'number') {
              child.effects.hunger = Math.round(child.effects.hunger * 1.18);
            }
          }
          changed = true;
        }
      }
      // 3C. WATER / BROTH / ALCOHOL / ACID BOILING (Варка / томление)
      else if (child.category === 'food' && !isSealedPack) {
        const boilStartTemp = Math.min(72, (thermalProf?.boilingPointC ?? 100) - 18);
        const boilDoneTemp = Math.min(85, (thermalProf?.boilingPointC ?? 100) - 8);
        if (fluidTemp >= boilStartTemp && dtSeconds > 0) {
          const boilRate = ((fluidTemp - (boilStartTemp - 8)) / 35) * 0.055 * submersion;
          const prevCook = child.cookProgress || 0;
          const nextCook = Math.min(1.0, Number((prevCook + boilRate * dtSeconds).toFixed(3)));
          if (nextCook !== prevCook) {
            child.cookProgress = nextCook;
            if (!child.cookMethod || child.cookMethod === 'boiled') {
              child.cookMethod = 'boiled';
            }
            changed = true;
          }
        }
        if (fluidTemp >= boilDoneTemp && submersion >= 0.35 && (nextInf >= 0.45 || (child.cookProgress || 0) >= 0.65)) {
          const curState = child.attributes?.stateNameRu;
          if (
            storage.liquidId !== 'pickles' &&
            child.attributes?.state !== 'pickled' &&
            child.attributes?.state !== 'melted' &&
            curState !== 'Варёный' &&
            child.attributes?.state !== 'boiled'
          ) {
            child.cookProgress = Math.max(child.cookProgress || 0, 0.85);
            child.cookMethod = 'boiled';
            child.attributes = {
              ...(child.attributes || {}),
              state: 'boiled',
              stateNameRu: 'Варёный',
              preparationMethod: 'Сварено в жидкости'
            };
            if (child.effects && typeof child.effects.hunger === 'number') {
              child.effects.hunger = Math.round(child.effects.hunger * 1.15);
            }
            if (child.doughAttributes) {
              syncDoughCookedState(child, 'boiled');
            }
            changed = true;
          }
        }
      }

      // Soluble small solids (salt, sugar, bouillon cubes) can fully dissolve when warm & infused
      if (!isOilMedium && isSolubleSolidItem(child) && nextInf >= 0.95 && fluidTemp >= 35) {
        rec.dissolved = true;
        rec.intensity = 1.0;
        dissolvedIndices.push(idx);
        changed = true;
      }
    }
  }

  // Remove fully dissolved soluble items from contents
  if (dissolvedIndices.length > 0) {
    for (let i = dissolvedIndices.length - 1; i >= 0; i--) {
      contents.splice(dissolvedIndices[i], 1);
    }
  }

  // Automatically blend melted cheese & sautéed aromatics onto adjacent hot foods in the pan
  if (dtSeconds > 0 && blendPanCheeseAndAromatics(container, isOilMedium ? 'oil' : 'dry')) {
    changed = true;
  }

  // Pull liquid temperature slightly toward average solid item temperature
  if (dtSeconds > 0 && avgChildTempCount > 0) {
    const avgSolidTemp = avgChildTempSum / avgChildTempCount;
    const solidMassRatio = Math.min(0.45, solidMl / Math.max(1, solidMl + liquidMl));
    if (Math.abs(avgSolidTemp - fluidTemp) > 0.3) {
      const nextLiquidTemp = fluidTemp + (avgSolidTemp - fluidTemp) * Math.min(0.35, 0.12 * solidMassRatio * dtSeconds);
      container.temperature = Math.round(nextLiquidTemp * 10) / 10;
      container.surfaceTemperature = container.temperature;
    }
  }

  // Update liquid color, ingredients, and nutrition from active infusions
  if (storage.infusedItems.length > 0 && liqDef?.isDrinkable) {
    const existingAttrs = storage.attributes || {};
    const baseOilColor = isOilMedium ? (existingAttrs.customColor || liqDef.color || '#eab308') : (liqDef.color || '#38bdf8');
    let blendedColor = baseOilColor;
    const infusedNames: string[] = [];
    let bonusHunger = 0;
    let bonusHealth = 0;
    let bonusEnergy = 0;
    let maxIntensity = 0;

    for (const inf of storage.infusedItems) {
      if (inf.intensity > maxIntensity) maxIntensity = inf.intensity;
      if (!infusedNames.includes(inf.nameRu)) infusedNames.push(inf.nameRu);
      if (inf.color && inf.intensity > 0.05) {
        // Oils absorb only a subtle warm golden aromatic tint rather than turning muddy brown
        const tintWeight = isOilMedium
          ? Math.min(0.14, inf.intensity * 0.16)
          : Math.min(0.42, inf.intensity * 0.45);
        blendedColor = blendColorHex(blendedColor, 1.0 - tintWeight, inf.color, tintWeight);
      }
      bonusHunger += Math.round(6 * inf.intensity);
      bonusHealth += Math.round(3 * inf.intensity);
      bonusEnergy += Math.round(3 * inf.intensity);
    }

    const baseEffects = liqDef.effects || {};
    const baseIngs = Array.isArray(existingAttrs.ingredients)
      ? existingAttrs.ingredients
      : existingAttrs.ingredients
      ? [existingAttrs.ingredients]
      : [liqDef.nameRu];

    const mergedIngs = Array.from(new Set([...baseIngs, ...infusedNames]));
    if (existingAttrs.isHomemade) {
      // Preserve authentic homemade varietyRu, preparationMethod, purpose & reasonAndOrigin; only append any newly added infused solids
      storage.attributes = {
        ...existingAttrs,
        ingredients: mergedIngs,
        sourceIngredients: mergedIngs,
      };
    } else {
      const shortList = infusedNames.slice(0, 3).join(', ') + (infusedNames.length > 3 ? ` и ещё ${infusedNames.length - 3}` : '');
      const isBrothLike = (storage.liquidId === 'water' || storage.liquidId === 'broth') && fluidTemp >= 75 && maxIntensity >= 0.45;
      const baseVariety = (existingAttrs.varietyRu || liqDef.nameRu).replace(/\s*\([^)]*\)\s*$/g, '').trim() || liqDef.nameRu;
      const infusionVariety = isBrothLike
        ? `Отвар / Бульон (${shortList})`
        : isOilMedium
        ? `${baseVariety} (аромат: ${shortList})`
        : `${baseVariety} (${shortList})`;

      storage.attributes = {
        ...existingAttrs,
        varietyRu: infusionVariety,
        ingredients: mergedIngs,
        customColor: blendedColor,
        visuals: {
          ...(existingAttrs.visuals || {}),
          color: blendedColor
        },
        purpose: isOilMedium
          ? `Ароматное масло для жарки (${shortList})`
          : `Жидкость с погружёнными продуктами (${shortList})`,
        customEffects: {
          thirst: baseEffects.thirst ?? 25,
          hunger: Math.min(65, (baseEffects.hunger || 0) + bonusHunger),
          health: Math.min(35, (baseEffects.health || 0) + bonusHealth),
          energy: Math.min(45, (baseEffects.energy || 0) + bonusEnergy),
          sleepiness: baseEffects.sleepiness,
          soothePanic: baseEffects.soothePanic
        }
      };
    }
  }

  // Advance homemade liquid cooking / steeping / pickling / fermentation transformations
  if (dtSeconds > 0 && tickHomemadeLiquidTransformations(container, dtSeconds)) {
    changed = true;
  }

  if (changed) {
    syncItemContainerProperties(container);
  }

  return changed;
}

/**
 * Drains ONLY the liquid phase from a hybrid container, leaving all solid items inside (still wet/coated!).
 */
export function drainLiquidFromContainer(
  container: InventoryItem
): { drainedMl: number; liquidNameRu: string } {
  if (!container.fluidStorage) {
    return { drainedMl: 0, liquidNameRu: '' };
  }
  const storage = container.fluidStorage;
  const drainedMl = Math.round(storage.currentMl || 0);
  const liqDef = storage.liquidId ? LIQUID_REGISTRY[storage.liquidId as LiquidId] : undefined;
  const liquidNameRu = storage.attributes?.varietyRu || liqDef?.nameRu || storage.liquidId || 'Жидкость';

  storage.currentMl = 0;
  storage.liquidId = null;
  storage.attributes = undefined;
  storage.components = undefined;
  storage.infusedItems = undefined;
  storage.homemadeProgress = undefined;
  storage.homemadeRecipeId = undefined;

  updateHybridContainerInteraction(container, 0);
  syncItemContainerProperties(container);

  return { drainedMl, liquidNameRu };
}

export function isFluidContainer(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  return Boolean(item.fluidStorage && item.fluidStorage.maxMl > 0);
}

export function getFluidContainerWeight(item: InventoryItem): number {
  if (!item.fluidStorage) return item.weight || 0.2;
  const storage = item.fluidStorage;
  normalizeFluidStorageState(storage);
  const emptyWeight = storage.emptyWeightKg ?? 0.05;
  if (!storage.liquidId || storage.currentMl <= 0) {
    return Math.round(emptyWeight * 100) / 100;
  }
  if (storage.components && storage.components.length > 0) {
    let mixWeight = 0;
    for (const comp of storage.components) {
      const lDef = LIQUID_REGISTRY[comp.liquidId as LiquidId] || LIQUID_REGISTRY.water;
      mixWeight += (comp.ml / 1000) * (lDef.densityKgPerL || 1.0);
    }
    return Math.round((emptyWeight + mixWeight) * 100) / 100;
  }
  const liquid = LIQUID_REGISTRY[storage.liquidId as LiquidId] || LIQUID_REGISTRY.water;
  const liquidWeight = (storage.currentMl / 1000) * (liquid.densityKgPerL || 1.0);
  return Math.round((emptyWeight + liquidWeight) * 100) / 100;
}

export function getFluidContainerVolume(item: InventoryItem): number {
  if (item.itemId === 'plastic_bag' || item.itemId === 'package_bag') {
    const baseShell = item.itemId === 'plastic_bag' ? 0.08 : 0.03;
    const liquidVolL = Math.max(0, (item.fluidStorage?.currentMl || 0) / 1000);
    const solidVolL = getContainerSolidVolumeMl(item) / 1000;
    return Number((baseShell + liquidVolL + solidVolL).toFixed(4));
  }
  const cfg = getContainerConfig(item.itemId);
  if (cfg?.emptyVolumeL) return cfg.emptyVolumeL;
  if (item.volume !== undefined) return item.volume;
  if (!item.fluidStorage) return 0.5;
  return Math.max(0.05, Math.round((item.fluidStorage.maxMl / 1000) * 1.15 * 100) / 100);
}

export function getFluidContainerDisplayName(item: InventoryItem): string {
  if (!item.fluidStorage) return item.nameRu;
  const storage = item.fluidStorage;
  normalizeFluidStorageState(storage);
  const cfg = getContainerConfig(item.itemId);
  const baseName = cfg?.nameRu || storage.baseItemNameRu || item.nameRu;

  const cleanBaseName = baseName.replace(/\s*\([\d\.\,\s]+(?:L|л|ml|мл)\)\s*$/i, '').trim();
  const isOpened = Boolean(item.isOpen || storage.attributes?.isOpened || item.itemId.endsWith('_open'));
  const openedSuffix = cfg?.requiresOpening && isOpened ? ' (вскрыто)' : '';

  const solidItems = item.contents || [];
  const hasSolids = solidItems.length > 0;
  const hasLiquid = Boolean(storage.liquidId && storage.currentMl > 0);
  const breakdown = getContainerCapacityBreakdown(item);

  function formatLiters(ml: number): string {
    const liters = ml / 1000;
    if (Number.isInteger(liters)) return liters.toString();
    return parseFloat(liters.toFixed(2)).toString();
  }

  function formatSharedVol(usedMl: number, maxMl: number, isGranular?: boolean, density?: number): string {
    if (isGranular && !hasSolids) {
      const curGrams = Math.round((usedMl / 1000) * (density || 1.0) * 1000);
      const maxGrams = Math.round((maxMl / 1000) * (density || 1.0) * 1000);
      return `${curGrams}/${maxGrams} г`;
    }
    return maxMl >= 1000
      ? `${formatLiters(usedMl)}/${formatLiters(maxMl)} л`
      : `${Math.round(usedMl)}/${Math.round(maxMl)} мл`;
  }

  if (!hasLiquid && !hasSolids) {
    return `${cleanBaseName}${openedSuffix} (Пусто)`;
  }

  const solidSummary = hasSolids
    ? (() => {
        const names = Array.from(new Set(solidItems.map(c => c.nameRu.replace(/\s*\([^)]*\)\s*$/g, '').trim()).filter(Boolean)));
        if (names.length === 1 && solidItems.length === 1) return names[0];
        if (names.length === 1) return `${names[0]} ×${solidItems.length}`;
        if (names.length === 2) return `${names[0]}, ${names[1]}`;
        return `${names[0]} и ещё ${solidItems.length - 1}`;
      })()
    : '';

  if (!hasLiquid && hasSolids) {
    const volLabel = formatSharedVol(breakdown.usedMl, breakdown.totalCapacityMl);
    return `${cleanBaseName}${openedSuffix} [${solidSummary}, ${volLabel}]`;
  }

  const liquid = LIQUID_REGISTRY[storage.liquidId as LiquidId] || LIQUID_REGISTRY.water;
  const isDry = isFluidStorageDryForm(storage);
  const substanceLabel =
    (storage.liquidId === 'pasta' || storage.liquidId === 'detergent') && storage.attributes?.varietyRu
      ? storage.attributes.varietyRu
      : (storage.attributes?.varietyRu && (storage.components?.length || 0) > 1
        ? storage.attributes.varietyRu
        : liquid.nameRu);

  const volLabel = formatSharedVol(breakdown.usedMl, breakdown.totalCapacityMl, isDry, liquid.densityKgPerL);

  if (hasSolids) {
    return `${cleanBaseName}${openedSuffix} [${substanceLabel} + ${solidSummary}, ${volLabel}]`;
  }

  return `${cleanBaseName}${openedSuffix} [${substanceLabel}, ${volLabel}]`;
}

export const SHAPE_NAMES_RU: Record<ContainerVisualShape, string> = {
  classic: 'Классическая цилиндрическая',
  cylinder: 'Цилиндрическая гладкая',
  hexagonal: 'Шестигранная гранёная',
  octagonal: 'Восьмигранная фигурная',
  barrel: 'Пузатая бочкообразная',
  square: 'Квадратная прямостенная («Мараска»)',
  amphora: 'Приталенная амфорная',
  rectangular: 'Прямоугольная трапециевидная',
  ribbed_drum: 'Гофрированная усиленная',
  oval: 'Овальная плоская',
  sleek: 'Высокая узкая',
  bordeaux: 'Прямостенная с крутым плечом («Бордо»)',
  burgundy: 'Покатая коническая («Бургундия»)',
  flask: 'Плоская фляжная (штоф)',
  bulbous: 'Пузатая графинная',
  pinched: 'Фигурная с перехватом'
};

export function hexToRgbTuple(hex: string, fallback: [number, number, number] = [203, 213, 225]): [number, number, number] {
  if (!hex || typeof hex !== 'string') return fallback;
  const cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  } else if (cleaned.length >= 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  return fallback;
}

export function rgbTupleToCss(rgb: [number, number, number], alpha?: number): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0])));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1])));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2])));
  if (alpha !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function shiftRgbTuple(rgb: [number, number, number], delta: number): [number, number, number] {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] + delta))),
    Math.max(0, Math.min(255, Math.round(rgb[1] + delta))),
    Math.max(0, Math.min(255, Math.round(rgb[2] + delta)))
  ];
}

export function isJarCanOrBottleContainer(containerId: string): boolean {
  if (typeof containerId !== 'string' || !containerId) return false;
  return (
    containerId.startsWith('jar_glass_') ||
    containerId.startsWith('jar_spice_') ||
    containerId.startsWith('can_metal_') ||
    containerId.startsWith('can_alu_') ||
    containerId.startsWith('tin_round_') ||
    containerId.startsWith('bottle_plastic_') ||
    containerId.startsWith('bottle_glass_') ||
    containerId === 'detergent_jug_1500' ||
    containerId === 'detergent_bottle_1000' ||
    containerId === 'glass_bottle_500' ||
    containerId === 'bottle_sauce_squeeze' ||
    containerId === 'bottle_med_glass_brown'
  );
}

function hashStringDeterministic(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function resolveContainerVisualAttributes(
  containerId: string,
  liquidId?: LiquidId | string | null,
  attributes?: FluidSubstanceAttributes,
  originalCatalogId?: string,
  existingVisuals?: Partial<ContainerVisualAttributes>
): ContainerVisualAttributes {
  const safeId = typeof containerId === 'string' ? containerId : '';
  containerId = safeId;
  const seedKey = `${originalCatalogId || ''}_${attributes?.culinaryEquivalentId || ''}_${attributes?.varietyRu || ''}_${liquidId || ''}_${containerId}`;
  const hash = hashStringDeterministic(seedKey);
  const eqId = (originalCatalogId || attributes?.culinaryEquivalentId || '').toLowerCase();

  let shape: ContainerVisualShape = 'classic';
  let materialRgb: [number, number, number] = [224, 242, 254];
  let materialNameRu = 'Прозрачное стекло';
  let labelRgb: [number, number, number] | null = attributes?.customColor
    ? hexToRgbTuple(attributes.customColor, [2, 132, 199])
    : null;
  let labelAccentRgb: [number, number, number] | undefined = attributes?.secondaryColor
    ? hexToRgbTuple(attributes.secondaryColor, [254, 240, 138])
    : undefined;
  let capRgb: [number, number, number] | undefined;

  // 1. GLASS JARS (jar_glass_*, jar_spice_*)
  if (containerId.startsWith('jar_glass_') || containerId.startsWith('jar_spice_')) {
    const is3L = containerId.startsWith('jar_glass_3l');
    const isSpice = containerId.startsWith('jar_spice_');
    const isMenthol = eqId.includes('menthol');
    const isCitric = liquidId === 'food_acid' || eqId.includes('citric') || eqId.includes('acid');

    if (isSpice) {
      const spiceShapes: ContainerVisualShape[] = ['square', 'hexagonal', 'classic'];
      shape = spiceShapes[hash % spiceShapes.length];
      materialRgb = isMenthol ? [180, 83, 9] : hash % 3 === 0 ? [180, 83, 9] : [224, 242, 254];
      materialNameRu = isMenthol ? 'Янтарное аптечное стекло' : hash % 3 === 0 ? 'Янтарное аптечное стекло' : 'Прозрачное силикатное стекло';
      if (isCitric && !labelRgb) labelRgb = [250, 204, 21];
      if (isMenthol && !labelRgb) labelRgb = [13, 148, 136];
      capRgb = isMenthol ? [15, 118, 110] : isCitric ? [234, 179, 8] : [220, 38, 38];
    } else if (is3L) {
      shape = hash % 2 === 0 ? 'barrel' : 'classic';
      materialRgb = [167, 243, 208];
      materialNameRu = 'Зеленоватое баночное стекло';
      capRgb = [234, 179, 8];
    } else if (liquidId === 'honey' || eqId.includes('molasses')) {
      if (eqId.includes('molasses')) {
        shape = 'barrel';
        materialRgb = [254, 243, 199];
        materialNameRu = 'Прозрачное толстостенное стекло';
        if (!labelRgb) labelRgb = [217, 119, 6];
        labelAccentRgb = [254, 240, 138];
      } else if (eqId.includes('wild')) {
        shape = 'barrel';
        materialRgb = [209, 250, 229];
        materialNameRu = 'Лесное зеленоватое стекло';
        labelRgb = [217, 119, 6];
        labelAccentRgb = [254, 240, 138];
      } else if (eqId.includes('buckwheat')) {
        shape = 'amphora';
        materialRgb = [254, 243, 199];
        materialNameRu = 'Тёплое медовое стекло';
        labelRgb = [120, 53, 15];
        labelAccentRgb = [251, 191, 36];
      } else {
        shape = 'hexagonal';
        materialRgb = [254, 249, 195];
        materialNameRu = 'Хрустальное золотистое стекло';
        labelRgb = [245, 158, 11];
        labelAccentRgb = [120, 53, 15];
      }
      capRgb = [234, 179, 8];
    } else if (liquidId === 'jam') {
      const jamShapes: ContainerVisualShape[] = ['hexagonal', 'barrel', 'amphora', 'square'];
      shape = jamShapes[hash % jamShapes.length];
      materialRgb = [224, 242, 254];
      materialNameRu = 'Прозрачное бесцветное стекло';
      if (!labelRgb) labelRgb = [225, 29, 72];
      labelAccentRgb = [254, 226, 226];
      capRgb = [225, 29, 72];
    } else if (liquidId === 'pickles') {
      const pickleShapes: ContainerVisualShape[] = ['barrel', 'classic', 'amphora', 'hexagonal'];
      shape = pickleShapes[hash % pickleShapes.length];
      materialRgb = [167, 243, 208];
      materialNameRu = 'Полубелое зеленоватое стекло';
      if (!labelRgb) labelRgb = [101, 163, 13];
      labelAccentRgb = [236, 252, 203];
      capRgb = [234, 179, 8];
    } else if (liquidId === 'caviar') {
      if (eqId.includes('squash') || eqId.includes('eggplant') || eqId.includes('vegetable') || eqId.includes('mushroom') || eqId.includes('beet') || eqId.includes('zucchini')) {
        const sqShapes: ContainerVisualShape[] = ['square', 'hexagonal', 'barrel', 'classic'];
        shape = sqShapes[hash % sqShapes.length];
        materialRgb = [224, 242, 254];
        materialNameRu = 'Прозрачное тарное стекло';
        if (!labelRgb) labelRgb = [217, 119, 6];
        capRgb = [234, 179, 8];
      } else {
        shape = hash % 2 === 0 ? 'hexagonal' : 'amphora';
        materialRgb = [224, 242, 254];
        materialNameRu = 'Оптическое хрустальное стекло';
        labelRgb = eqId.includes('black') ? [29, 78, 216] : [220, 38, 38];
        labelAccentRgb = [250, 204, 21];
        capRgb = [234, 179, 8];
      }
    } else if (liquidId === 'puree' || liquidId === 'sauce') {
      const sqShapes: ContainerVisualShape[] = ['square', 'hexagonal', 'barrel', 'classic'];
      shape = sqShapes[hash % sqShapes.length];
      materialRgb = [224, 242, 254];
      materialNameRu = 'Прозрачное тарное стекло';
      if (!labelRgb) labelRgb = [217, 119, 6];
      capRgb = [234, 179, 8];
    } else {
      const jarShapes: ContainerVisualShape[] = ['classic', 'hexagonal', 'barrel', 'square', 'amphora'];
      shape = jarShapes[hash % jarShapes.length];
      const glassTints: Array<{ rgb: [number, number, number]; name: string }> = [
        { rgb: [224, 242, 254], name: 'Прозрачное силикатное стекло' },
        { rgb: [167, 243, 208], name: 'Зеленоватое бутылочное стекло' },
        { rgb: [186, 230, 253], name: 'Голубоватое кварцевое стекло' }
      ];
      const picked = glassTints[hash % glassTints.length];
      materialRgb = picked.rgb;
      materialNameRu = picked.name;
      capRgb = [234, 179, 8];
    }
  }
  // 2. METAL TIN & ALUMINUM CANS (can_metal_*, can_alu_*, tin_round_*)
  else if (
    containerId.startsWith('can_metal_') ||
    containerId.startsWith('can_alu_') ||
    containerId.startsWith('tin_round_')
  ) {
    if (containerId.startsWith('can_alu_')) {
      if (liquidId === 'energy_drink' || eqId.includes('energy')) {
        shape = 'sleek';
        materialRgb = [30, 41, 59];
        materialNameRu = 'Воронёный анодированный алюминий';
        labelRgb = [16, 185, 129];
        labelAccentRgb = [163, 230, 53];
      } else if (liquidId === 'beer' || eqId.includes('beer')) {
        shape = 'barrel';
        materialRgb = [234, 179, 8];
        materialNameRu = 'Золотистый пищевой алюминий';
        labelRgb = [21, 128, 61];
        labelAccentRgb = [250, 204, 21];
      } else {
        shape = 'classic';
        materialRgb = [203, 213, 225];
        materialNameRu = 'Полированный пищевой алюминий';
        labelRgb = eqId.includes('zero') ? [24, 24, 27] : [220, 38, 38];
        labelAccentRgb = [255, 255, 255];
      }
    } else if (containerId.startsWith('can_metal_oval')) {
      shape = 'oval';
      materialRgb = [234, 179, 8];
      materialNameRu = 'Золотистая лакированная жесть';
      if (!labelRgb) labelRgb = [30, 58, 138];
      labelAccentRgb = [251, 191, 36];
    } else if (containerId.startsWith('can_metal_flat')) {
      shape = hash % 2 === 0 ? 'octagonal' : 'cylinder';
      materialRgb = hash % 2 === 0 ? [234, 179, 8] : [203, 213, 225];
      materialNameRu = hash % 2 === 0 ? 'Латунно-золочёная жесть' : 'Белая лужёная жесть';
      if (!labelRgb) labelRgb = [2, 132, 199];
      labelAccentRgb = [254, 240, 138];
    } else if (containerId.startsWith('tin_round_')) {
      shape = 'classic';
      if (eqId.includes('menthol')) {
        materialRgb = [13, 148, 136];
        materialNameRu = 'Матовая ментоловая жесть';
        labelRgb = [204, 251, 241];
        labelAccentRgb = [15, 118, 110];
      } else {
        materialRgb = [220, 38, 38];
        materialNameRu = 'Эмалированная штампованная жесть';
        labelRgb = [250, 204, 21];
      }
    } else {
      // Large, medium, small metal cans
      if (eqId.includes('coconut')) {
        shape = 'classic';
        materialRgb = [241, 245, 249];
        materialNameRu = 'Лакированная белая жесть';
        if (!labelRgb) labelRgb = [13, 148, 136];
        labelAccentRgb = [254, 243, 199];
      } else if (eqId.includes('pork') || eqId.includes('ham') || eqId.includes('pate') || eqId.includes('spam')) {
        shape = 'rectangular';
        materialRgb = [234, 179, 8];
        materialNameRu = 'Золотистая консервная жесть';
        if (!labelRgb) labelRgb = [185, 28, 28];
      } else if (eqId.includes('beef') || eqId.includes('tushonka') || eqId.includes('army') || eqId.includes('stew')) {
        shape = 'ribbed_drum';
        materialRgb = hash % 2 === 0 ? [101, 130, 66] : [203, 213, 225];
        materialNameRu = hash % 2 === 0 ? 'Армейская защитно-оливковая жесть' : 'Белая лужёная жесть ГОСТ';
        if (!labelRgb) labelRgb = [153, 27, 27];
      } else if (eqId.includes('condensed') || eqId.includes('sgush')) {
        shape = 'classic';
        materialRgb = [226, 232, 240];
        materialNameRu = 'Светлая лужёная жесть';
        labelRgb = [37, 99, 235];
        labelAccentRgb = [248, 250, 252];
      } else {
        const canShapes: ContainerVisualShape[] = ['classic', 'ribbed_drum', 'rectangular', 'octagonal'];
        shape = canShapes[hash % canShapes.length];
        const canMetals: Array<{ rgb: [number, number, number]; name: string }> = [
          { rgb: [203, 213, 225], name: 'Белая лужёная жесть' },
          { rgb: [234, 179, 8], name: 'Золотистая лакированная жесть' },
          { rgb: [148, 163, 184], name: 'Матовая хромированная сталь' }
        ];
        const picked = canMetals[hash % canMetals.length];
        materialRgb = picked.rgb;
        materialNameRu = picked.name;
        if (!labelRgb && liquidId) labelRgb = [185, 28, 28];
      }
    }
  }
  // 3. PLASTIC & GLASS BOTTLES
  else if (
    containerId.startsWith('bottle_plastic_') ||
    containerId.startsWith('bottle_glass_') ||
    containerId === 'detergent_jug_1500' ||
    containerId === 'detergent_bottle_1000' ||
    containerId === 'glass_bottle_500' ||
    containerId === 'bottle_sauce_squeeze' ||
    containerId === 'bottle_med_glass_brown'
  ) {
    const isPlastic =
      containerId.startsWith('bottle_plastic_') ||
      containerId === 'bottle_sauce_squeeze' ||
      containerId === 'detergent_jug_1500' ||
      containerId === 'detergent_bottle_1000';
    if (containerId === 'detergent_jug_1500' || containerId === 'detergent_bottle_1000' || liquidId === 'detergent') {
      shape = containerId === 'detergent_jug_1500' ? 'flask' : 'pinched';
      materialRgb = [241, 245, 249];
      materialNameRu = 'Плотный матовый полиэтилен HDPE';
      if (!labelRgb) labelRgb = [6, 182, 212];
      labelAccentRgb = labelAccentRgb || [255, 255, 255];
      capRgb = labelAccentRgb || labelRgb;
    } else if (containerId === 'bottle_sauce_squeeze') {
      shape = 'pinched';
      materialRgb = labelRgb || [220, 38, 38];
      materialNameRu = 'Мягкий пищевой полиэтилен';
      labelRgb = [254, 249, 195];
      capRgb = [255, 255, 255];
    } else if (isPlastic) {
      if (liquidId === 'kvas' || eqId.includes('kvas')) {
        shape = 'bulbous';
        materialRgb = [146, 64, 14];
        materialNameRu = 'Тёмно-коричневый ПЭТ-пластик';
        labelRgb = [217, 119, 6];
        labelAccentRgb = [254, 240, 138];
        capRgb = [120, 53, 15];
      } else if (liquidId === 'milk' || liquidId === 'dairy_fermented') {
        shape = 'burgundy';
        materialRgb = [248, 250, 252];
        materialNameRu = 'Матовый белый полиэтилен HDPE';
        labelRgb = [56, 189, 248];
        labelAccentRgb = [255, 255, 255];
        capRgb = [2, 132, 199];
      } else if (eqId.includes('mineral')) {
        shape = 'bordeaux';
        materialRgb = [74, 222, 128];
        materialNameRu = 'Изумрудно-зелёный ПЭТ-пластик';
        labelRgb = [16, 185, 129];
        labelAccentRgb = [255, 255, 255];
        capRgb = [5, 150, 105];
      } else if (liquidId === 'brake_fluid' || liquidId === 'motor_oil' || liquidId === 'antifreeze') {
        shape = 'flask';
        materialRgb = [203, 213, 225];
        materialNameRu = 'Технический химстойкий пластик';
        labelRgb = [234, 179, 8];
        labelAccentRgb = [24, 24, 27];
        capRgb = [220, 38, 38];
      } else if (liquidId === 'oil_culinary') {
        shape = 'pinched';
        materialRgb = [254, 249, 195];
        materialNameRu = 'Прозрачный пищевой ПЭТ';
        labelRgb = [234, 179, 8];
        capRgb = [202, 138, 4];
      } else if (liquidId === 'water') {
        shape = 'pinched';
        materialRgb = [186, 230, 253];
        materialNameRu = 'Голубоватый прозрачный ПЭТ';
        labelRgb = [2, 132, 199];
        labelAccentRgb = [255, 255, 255];
        capRgb = [2, 132, 199];
      } else if (
        containerId === 'bottle_plastic_100' &&
        liquidId &&
        (liquidId === 'food_dye' || liquidId === 'botanical_extract' || liquidId === 'essential_oil')
      ) {
        shape = 'classic';
        materialRgb = liquidId === 'essential_oil' ? [120, 53, 15] : [224, 242, 254];
        materialNameRu = liquidId === 'essential_oil' ? 'Светозащитный янтарный ПЭТ-флакон' : 'Прозрачный флакон-капельница ПЭТ';
        if (!labelRgb) labelRgb = [2, 132, 199];
        labelAccentRgb = [248, 250, 252];
        capRgb = liquidId === 'essential_oil' ? [24, 24, 27] : [255, 255, 255];
      } else if (liquidId === 'syrup_sweet') {
        shape = 'pinched';
        materialRgb = [254, 249, 195];
        materialNameRu = 'Плотный пищевой ПЭТ для сиропов';
        if (!labelRgb) labelRgb = [217, 119, 6];
        labelAccentRgb = [254, 243, 199];
        capRgb = [217, 119, 6];
      } else {
        const petShapes: ContainerVisualShape[] = ['pinched', 'classic', 'bordeaux', 'bulbous', 'flask'];
        shape = petShapes[hash % petShapes.length];
        materialRgb = [186, 230, 253];
        materialNameRu = 'Прозрачный ПЭТ-пластик';
        if (liquidId && !labelRgb) labelRgb = [2, 132, 199];
        capRgb = [2, 132, 199];
      }
    } else {
      // Glass bottles
      if (liquidId === 'beer' || eqId.includes('beer')) {
        shape = 'burgundy';
        materialRgb = [120, 53, 15];
        materialNameRu = 'Тёмно-янтарное пивное стекло';
        labelRgb = [217, 119, 6];
        labelAccentRgb = [254, 243, 199];
        capRgb = [234, 179, 8];
      } else if (liquidId === 'vodka' || eqId.includes('vodka')) {
        shape = hash % 2 === 0 ? 'bordeaux' : 'flask';
        materialRgb = [226, 232, 240];
        materialNameRu = 'Бесцветное водочное стекло';
        labelRgb = [220, 38, 38];
        labelAccentRgb = [255, 255, 255];
        capRgb = [203, 213, 225];
      } else if (liquidId === 'wine' && (eqId.includes('white') || attributes?.varietyRu?.toLowerCase().includes('бел'))) {
        shape = 'burgundy';
        materialRgb = [16, 185, 129];
        materialNameRu = 'Оливково-зелёное винное стекло';
        labelRgb = [254, 243, 199];
        labelAccentRgb = [21, 128, 61];
        capRgb = [234, 179, 8];
      } else if (liquidId === 'wine' || eqId === 'wine_red' || eqId === 'wine_white' || eqId === 'wine_bottle' || eqId === 'bottle_wine') {
        shape = 'bordeaux';
        materialRgb = [6, 78, 59];
        materialNameRu = 'Тёмно-изумрудное винное стекло';
        labelRgb = [153, 27, 27];
        labelAccentRgb = [254, 243, 199];
        capRgb = [127, 29, 29];
      } else if (liquidId === 'oil_culinary') {
        if (eqId.includes('olive') || eqId.includes('sesame') || eqId.includes('truffle') || eqId.includes('flax')) {
          shape = 'square';
          materialRgb = eqId.includes('sesame') || eqId.includes('flax') ? [120, 53, 15] : [21, 128, 61];
          materialNameRu = eqId.includes('sesame') || eqId.includes('flax')
            ? 'Янтарное светозащитное стекло'
            : 'Тёмно-оливковое стекло «Мараска»';
          if (!labelRgb) labelRgb = [101, 163, 13];
        } else {
          shape = 'bordeaux';
          materialRgb = [224, 242, 254];
          materialNameRu = 'Прозрачное бутылочное стекло';
          if (!labelRgb) labelRgb = [234, 179, 8];
        }
        capRgb = [234, 179, 8];
      } else if (liquidId === 'vinegar' || liquidId === 'sauce') {
        const vsShapes: ContainerVisualShape[] = ['square', 'bulbous', 'flask', 'bordeaux'];
        shape = vsShapes[hash % vsShapes.length];
        materialRgb = eqId.includes('balsamic') || eqId.includes('soy') ? [68, 64, 60] : [207, 250, 254];
        materialNameRu = eqId.includes('balsamic') || eqId.includes('soy')
          ? 'Дымчатое тёмное стекло'
          : 'Прозрачное бутылочное стекло';
        if (!labelRgb) labelRgb = [185, 28, 28];
        capRgb = [220, 38, 38];
      } else if (liquidId === 'syrup_sweet' || eqId.includes('caramel')) {
        shape = 'bulbous';
        materialRgb = eqId.includes('caramel') ? [120, 53, 15] : [254, 243, 199];
        materialNameRu = eqId.includes('caramel') ? 'Янтарное сиропное стекло' : 'Тёплое графинное стекло';
        if (!labelRgb) labelRgb = [217, 119, 6];
        capRgb = [180, 83, 9];
      } else if (liquidId === 'food_acid' || liquidId === 'botanical_extract' || liquidId === 'essential_oil') {
        shape = 'square';
        materialRgb = [120, 53, 15];
        materialNameRu = 'Тёмно-янтарное экстракционное стекло';
        if (!labelRgb) labelRgb = [16, 185, 129];
        labelAccentRgb = [254, 249, 195];
        capRgb = [24, 24, 27];
      } else if (liquidId === 'medical_solution' || containerId === 'bottle_med_glass_brown') {
        shape = 'flask';
        materialRgb = [120, 53, 15];
        materialNameRu = 'Тёмно-янтарное аптечное стекло';
        if (!labelRgb) labelRgb = [248, 250, 252];
        labelAccentRgb = [22, 163, 74];
        capRgb = [248, 250, 252];
      } else {
        const glassBottleShapes: ContainerVisualShape[] = ['classic', 'bordeaux', 'burgundy', 'square', 'flask', 'bulbous'];
        shape = glassBottleShapes[hash % glassBottleShapes.length];
        const bottleTints: Array<{ rgb: [number, number, number]; name: string }> = [
          { rgb: [207, 250, 254], name: 'Прозрачное бутылочное стекло' },
          { rgb: [16, 185, 129], name: 'Зелёное бутылочное стекло' },
          { rgb: [120, 53, 15], name: 'Янтарное коричневое стекло' }
        ];
        const picked = bottleTints[hash % bottleTints.length];
        materialRgb = picked.rgb;
        materialNameRu = picked.name;
        capRgb = [148, 163, 184];
      }
    }
  }

  const finalShape = existingVisuals?.shape || attributes?.containerVisuals?.shape || shape;
  const finalMaterialRgb = existingVisuals?.materialRgb || attributes?.containerVisuals?.materialRgb || materialRgb;
  const finalLabelRgb =
    existingVisuals?.labelRgb !== undefined
      ? existingVisuals.labelRgb
      : attributes?.containerVisuals?.labelRgb !== undefined
        ? attributes.containerVisuals.labelRgb
        : labelRgb;

  return {
    shape: finalShape,
    shapeNameRu: existingVisuals?.shapeNameRu || SHAPE_NAMES_RU[finalShape] || 'Классическая',
    materialRgb: finalMaterialRgb,
    materialNameRu: existingVisuals?.materialNameRu || attributes?.containerVisuals?.materialNameRu || materialNameRu,
    labelRgb: finalLabelRgb,
    labelAccentRgb: existingVisuals?.labelAccentRgb || attributes?.containerVisuals?.labelAccentRgb || labelAccentRgb,
    capRgb: existingVisuals?.capRgb || attributes?.containerVisuals?.capRgb || capRgb
  };
}

export function syncItemContainerProperties(item: InventoryItem): void {
  if (!item.fluidStorage) return;
  const storage = item.fluidStorage;
  normalizeFluidStorageState(storage);
  ensureHybridContainerProps(item);

  const cfg = getContainerConfig(item.itemId);
  if (cfg) {
    storage.baseItemNameRu = cfg.nameRu;
    storage.baseItemNameEn = cfg.name;
  }

  if (item.itemId.endsWith('_open')) {
    item.itemId = item.itemId.replace(/_open$/, '');
    item.isOpen = true;
    if (storage.attributes) storage.attributes.isOpened = true;
  }

  // Ensure visual attributes (shape, materialRgb, labelRgb) are resolved & persisted on the container
  // Visual attributes NEVER alter physical volume, weight, or capacity
  if (isJarCanOrBottleContainer(item.itemId)) {
    const resolvedVis = resolveContainerVisualAttributes(
      item.itemId,
      storage.liquidId,
      storage.attributes,
      item.originalCatalogId,
      item.containerVisuals || storage.containerVisuals
    );
    item.containerVisuals = resolvedVis;
    storage.containerVisuals = resolvedVis;
  }

  const isOpened = Boolean(item.isOpen || storage.attributes?.isOpened);
  if (isOpened) {
    item.isOpen = true;
    if (storage.attributes) storage.attributes.isOpened = true;
  }

  item.weight = getFluidContainerWeight(item);
  item.volume = getFluidContainerVolume(item);
  item.nameRu = getFluidContainerDisplayName(item);

  const breakdown = getContainerCapacityBreakdown(item);
  const solidItems = item.contents || [];
  const hasSolids = solidItems.length > 0;
  const solidNamesStr = hasSolids
    ? solidItems.map(c => c.nameRu).join(', ')
    : '';

  const vis = item.containerVisuals || storage.containerVisuals;
  const visBadge = vis
    ? ` Параметры модели тары: форма — ${vis.shapeNameRu || vis.shape}, материал — ${vis.materialNameRu || 'Стандарт'} (RGB: ${vis.materialRgb.join(', ')}), этикетка — ${vis.labelRgb ? `RGB(${vis.labelRgb.join(', ')})` : 'нет'}.`
    : '';

  if (cfg?.requiresOpening && !isOpened) {
    item.usable = true;
  } else if ((item.itemId === 'package_bag' || item.itemId === 'plastic_bag') && (!storage.liquidId || storage.currentMl <= 0)) {
    item.usable = hasSolids;
  }

  if (storage.currentMl > 0 && storage.liquidId) {
    const liquid = LIQUID_REGISTRY[storage.liquidId as LiquidId];
    if (liquid?.isDrinkable || storage.attributes?.medicalEffectId || cfg?.requiresOpening) {
      item.usable = true;
    }
    const solidInfoPart = hasSolids
      ? ` Погружённые предметы (${solidItems.length} шт., ${(breakdown.solidMl / 1000).toFixed(2)} л): ${solidNamesStr}. Общая заполненность: ${(breakdown.usedMl / 1000).toFixed(2)} / ${(breakdown.totalCapacityMl / 1000).toFixed(2)} л.`
      : '';
    if (storage.attributes) {
      const a = storage.attributes;
      const openBadge = isOpened
        ? ' (Тара вскрыта)'
        : (cfg?.requiresOpening ? ' (Закрыто — активируйте в активной руке или нажмите «Вскрыть»)' : '');
      const isDry = isFluidStorageDryForm(storage);
      const volText = isDry
        ? `${Math.round((storage.currentMl / 1000) * (liquid?.densityKgPerL || 1.0) * 1000)} г`
        : (storage.maxMl >= 1000
          ? `${(storage.currentMl / 1000).toFixed(2)} л`
          : `${Math.round(storage.currentMl)} мл`);
      const rawIng = a.ingredients ?? a.sourceIngredients;
      const ingredientsText = Array.isArray(rawIng)
        ? rawIng.join(', ')
        : (rawIng || 'Не указаны');
      item.descriptionRu =
        `Унифицированная тара: ${cfg?.nameRu || storage.baseItemNameRu}${openBadge}.${visBadge} ` +
        `Содержимое: ${liquid?.nameRu || storage.liquidId}${a.varietyRu ? ` (${a.varietyRu})` : ''} (${volText}).${solidInfoPart} ` +
        (a.physicalFormRu ? `Форма средства: ${a.physicalFormRu}. ` : '') +
        ((vis as any)?.colorNameRu || a.visuals?.colorNameRu || a.substanceColorRu
          ? `Цвет: ${a.visuals?.colorNameRu || a.substanceColorRu}. `
          : '') +
        (a.productShapeRu ? `Форма: ${a.productShapeRu}. ` : '') +
        (a.grainGradeRu ? `Сорт/категория: ${a.grainGradeRu}. ` : '') +
        `Из чего: ${ingredientsText}. ` +
        (a.surfaceTextureRu ? `Текстура: ${a.surfaceTextureRu}. ` : '') +
        (a.cookingTimeMin ? `Время варки: ${a.cookingTimeMin}. ` : '') +
        (a.preparationMethod ? `Способ производства: ${a.preparationMethod}. ` : '') +
        (a.purpose ? `Назначение: ${a.purpose}.` : '');

      // Sync identical unified attributes structure to item.attributes
      item.attributes = {
        ...(item.attributes || {}),
        ...a,
        ingredients: rawIng,
        state: cfg?.requiresOpening ? (isOpened ? 'opened' : 'sealed') : (a.state || 'contained'),
        stateNameRu: cfg?.requiresOpening ? (isOpened ? 'Вскрыта' : 'Запаяна') : a.stateNameRu,
        customColor: a.customColor || liquid?.color,
        visuals: {
          ...(item.attributes?.visuals || {}),
          ...(a.visuals || {}),
          ...(vis ? {
            shape: vis.shape,
            shapeNameRu: vis.shapeNameRu,
            materialRgb: vis.materialRgb,
            materialNameRu: vis.materialNameRu,
            labelRgb: vis.labelRgb,
            labelAccentRgb: vis.labelAccentRgb,
            capRgb: vis.capRgb
          } : {}),
          color: a.visuals?.color || a.customColor || liquid?.color
        }
      };
    } else {
      const baseDesc = cfg?.descriptionRu || 'Унифицированная ёмкость.';
      item.descriptionRu = `${baseDesc}${visBadge}${solidInfoPart}`;
    }
  } else if (hasSolids) {
    const baseDesc = cfg?.descriptionRu || 'Унифицированная ёмкость.';
    item.descriptionRu =
      `${baseDesc}${visBadge} Внутри предметы (${solidItems.length} шт., ${(breakdown.solidMl / 1000).toFixed(2)} л): ${solidNamesStr}. ` +
      `Жидкости нет — свободно ${(breakdown.freeMl / 1000).toFixed(2)} из ${(breakdown.totalCapacityMl / 1000).toFixed(2)} л.`;
    item.attributes = {
      ...(item.attributes || {}),
      varietyRu: `${cfg?.nameRu || storage.baseItemNameRu}: ${solidNamesStr}`,
      ingredients: solidItems.map(c => c.nameRu),
      state: 'filled_solids',
      stateNameRu: `${solidItems.length} предм. (без жидкости)`
    };
  } else {
    const baseDesc = cfg?.descriptionRu || 'Пустая унифицированная ёмкость.';
    item.descriptionRu = `${baseDesc}${visBadge} Сейчас пуста (0 мл).`;
    item.attributes = {
      ...(item.attributes || {}),
      varietyRu: cfg?.nameRu || storage.baseItemNameRu || item.nameRu,
      preparationMethod: vis?.materialNameRu ? `Тара (${vis.materialNameRu})` : 'Унифицированная тара',
      purpose: cfg?.descriptionRu || 'Хранение жидкостей и предметов в общем объёме',
      state: cfg?.requiresOpening ? (isOpened ? 'opened' : 'sealed') : 'empty',
      stateNameRu: 'Пусто',
      visuals: {
        ...(item.attributes?.visuals || {}),
        ...(vis ? {
          shape: vis.shape,
          shapeNameRu: vis.shapeNameRu,
          materialRgb: vis.materialRgb,
          materialNameRu: vis.materialNameRu,
          labelRgb: vis.labelRgb,
          labelAccentRgb: vis.labelAccentRgb,
          capRgb: vis.capRgb
        } : {})
      }
    };
  }
}

export function isFluidContainerClosed(item: InventoryItem | null | undefined): boolean {
  if (!item || !item.fluidStorage) return false;
  const cfg = getContainerConfig(item.itemId);
  const isOpened = Boolean(item.isOpen || item.fluidStorage.attributes?.isOpened || item.itemId.endsWith('_open'));
  return Boolean(cfg?.requiresOpening && !isOpened);
}

export function openFluidContainerIfNeeded(
  playerOrContainer: Player | InventoryItem | null | undefined,
  maybeContainer?: InventoryItem | null
): { justOpened: boolean; message: string } {
  const isFirstArgItem =
    Boolean(playerOrContainer) &&
    typeof (playerOrContainer as InventoryItem).itemId === 'string' &&
    !maybeContainer;
  const player = isFirstArgItem ? null : (playerOrContainer as Player | null | undefined);
  const container = isFirstArgItem ? (playerOrContainer as InventoryItem) : maybeContainer;
  if (!container) {
    return { justOpened: false, message: '' };
  }
  const storage = container.fluidStorage;
  const cfg = getContainerConfig(container.itemId);
  const alreadyOpen = Boolean(container.isOpen || storage?.attributes?.isOpened || container.itemId.endsWith('_open'));
  if (!storage || !cfg?.requiresOpening || alreadyOpen) {
    if (alreadyOpen) {
      container.isOpen = true;
      if (storage?.attributes) storage.attributes.isOpened = true;
      syncItemContainerProperties(container);
    }
    return { justOpened: false, message: '' };
  }

  container.isOpen = true;
  if (storage.attributes) {
    storage.attributes.isOpened = true;
  }
  syncItemContainerProperties(container);

  sound.playUseItem();
  const msg = `Тара вскрыта: ${cfg.nameRu}. Теперь содержимое можно употреблять или переливать!`;
  if (player) {
    addPlayerNotification(player, msg, 'info');
  }
  return { justOpened: true, message: msg };
}

export function pourLiquidBetweenContainers(
  source: InventoryItem,
  target: InventoryItem,
  amountMl?: number
): { success: boolean; message: string; transferredMl: number } {
  if (!source.fluidStorage || !target.fluidStorage) {
    return { success: false, message: 'Один из предметов не является емкостью', transferredMl: 0 };
  }

  ensureHybridContainerProps(source);
  ensureHybridContainerProps(target);

  const srcStorage = source.fluidStorage;
  const tgtStorage = target.fluidStorage;

  if (srcStorage.currentMl <= 0 || !srcStorage.liquidId) {
    return { success: false, message: `${srcStorage.baseItemNameRu} пуста`, transferredMl: 0 };
  }

  // Respect unified capacity: solid items inside target take up volume!
  const availableSpace = getContainerFreeVolumeMl(target);
  if (availableSpace <= 0) {
    const bd = getContainerCapacityBreakdown(target);
    return {
      success: false,
      message: `${tgtStorage.baseItemNameRu} уже заполнена (предметы ${Math.round(bd.solidMl)} мл + жидкость ${Math.round(bd.liquidMl)} мл)!`,
      transferredMl: 0
    };
  }

  const transfer = Math.min(amountMl ?? srcStorage.currentMl, Math.min(srcStorage.currentMl, availableSpace));
  if (transfer <= 0) {
    return { success: false, message: 'Не удалось перелить жидкость', transferredMl: 0 };
  }

  // Auto-open sealed source or target containers in-place when pouring
  const srcCfg = getContainerConfig(source.itemId);
  if (srcCfg?.requiresOpening) {
    source.isOpen = true;
    if (srcStorage.attributes) srcStorage.attributes.isOpened = true;
  }
  const tgtCfg = getContainerConfig(target.itemId);
  if (tgtCfg?.requiresOpening) {
    target.isOpen = true;
    if (tgtStorage.attributes) tgtStorage.attributes.isOpened = true;
  }

  // Realistic spillage waste: ~1.5% to 4% is spilled on walls or drips down the neck
  const spillRate = 0.015 + Math.random() * 0.025;
  const wasteMl = Math.max(1, Math.round(transfer * spillRate));
  const actualReceived = Math.max(1, transfer - wasteMl);

  const prevTgtMl = tgtStorage.currentMl;
  const srcSpec = LIQUID_REGISTRY[srcStorage.liquidId as LiquidId] || LIQUID_REGISTRY.water;
  const tgtSpec = tgtStorage.liquidId ? (LIQUID_REGISTRY[tgtStorage.liquidId as LiquidId] || LIQUID_REGISTRY.water) : srcSpec;

  const sameSubstance =
    prevTgtMl <= 0 ||
    !tgtStorage.liquidId ||
    (tgtStorage.liquidId === srcStorage.liquidId &&
      (!tgtStorage.attributes?.varietyRu ||
        !srcStorage.attributes?.varietyRu ||
        tgtStorage.attributes.varietyRu === srcStorage.attributes.varietyRu));

  if (prevTgtMl <= 0 || !tgtStorage.liquidId) {
    tgtStorage.liquidId = srcStorage.liquidId;
    if (srcStorage.attributes) {
      tgtStorage.attributes = { ...srcStorage.attributes, isOpened: true };
    }
    tgtStorage.components = [{
      liquidId: srcStorage.liquidId,
      ml: actualReceived,
      labelRu: srcStorage.attributes?.varietyRu || srcSpec.nameRu,
      color: srcStorage.attributes?.customColor || srcSpec.color
    }];
    if (srcStorage.infusedItems && srcStorage.infusedItems.length > 0) {
      tgtStorage.infusedItems = srcStorage.infusedItems.map(inf => ({ ...inf }));
    }
  } else if (sameSubstance) {
    if (!tgtStorage.components || tgtStorage.components.length === 0) {
      tgtStorage.components = [{
        liquidId: tgtStorage.liquidId,
        ml: prevTgtMl,
        labelRu: tgtStorage.attributes?.varietyRu || tgtSpec.nameRu,
        color: tgtStorage.attributes?.customColor || tgtSpec.color
      }];
    }
    const existingComp = tgtStorage.components.find(c => c.liquidId === srcStorage.liquidId);
    if (existingComp) existingComp.ml += actualReceived;
    else tgtStorage.components.push({ liquidId: srcStorage.liquidId, ml: actualReceived, labelRu: srcSpec.nameRu, color: srcSpec.color });
  } else {
    // Mix the two different liquids smoothly into a unified mixture!
    const totalMl = prevTgtMl + actualReceived;
    const prevColor = tgtStorage.attributes?.customColor || tgtSpec.color || '#38bdf8';
    const incColor = srcStorage.attributes?.customColor || srcSpec.color || '#38bdf8';
    const mixedColor = blendColorHex(prevColor, prevTgtMl, incColor, actualReceived);

    const tgtName = tgtStorage.attributes?.varietyRu || tgtSpec.nameRu;
    const srcName = srcStorage.attributes?.varietyRu || srcSpec.nameRu;

    if (!tgtStorage.components || tgtStorage.components.length === 0) {
      tgtStorage.components = [{ liquidId: tgtStorage.liquidId, ml: prevTgtMl, labelRu: tgtName, color: prevColor }];
    }
    const existingComp = tgtStorage.components.find(c => c.liquidId === srcStorage.liquidId);
    if (existingComp) existingComp.ml += actualReceived;
    else tgtStorage.components.push({ liquidId: srcStorage.liquidId, ml: actualReceived, labelRu: srcName, color: incColor });

    const dominantId: LiquidId = (
      !tgtSpec.isDrinkable || tgtSpec.isFlammable
        ? tgtStorage.liquidId
        : !srcSpec.isDrinkable || srcSpec.isFlammable
        ? srcStorage.liquidId
        : prevTgtMl >= actualReceived
        ? tgtStorage.liquidId
        : srcStorage.liquidId
    ) as LiquidId;

    const bEff = tgtStorage.attributes?.customEffects || tgtSpec.effects || {};
    const tEff = srcStorage.attributes?.customEffects || srcSpec.effects || {};
    const mixLabel = tgtStorage.components
      .map(c => `${c.labelRu || LIQUID_REGISTRY[c.liquidId as LiquidId]?.nameRu || c.liquidId} ${Math.round((c.ml / totalMl) * 100)}%`)
      .join(' + ');

    tgtStorage.liquidId = dominantId;
    tgtStorage.attributes = {
      ...(tgtStorage.attributes || {}),
      varietyRu: `Смесь (${mixLabel})`,
      ingredients: Array.from(new Set(tgtStorage.components.map(c => c.labelRu || c.liquidId))),
      customColor: mixedColor,
      visuals: { ...(tgtStorage.attributes?.visuals || {}), color: mixedColor },
      isOpened: true,
      customEffects: {
        thirst: Math.round(((bEff.thirst || 0) * prevTgtMl + (tEff.thirst || 0) * actualReceived) / totalMl),
        hunger: Math.round(((bEff.hunger || 0) * prevTgtMl + (tEff.hunger || 0) * actualReceived) / totalMl),
        energy: Math.round(((bEff.energy || 0) * prevTgtMl + (tEff.energy || 0) * actualReceived) / totalMl),
        health: Math.round(((bEff.health || 0) * prevTgtMl + (tEff.health || 0) * actualReceived) / totalMl),
        sleepiness: Math.round(((bEff.sleepiness || 0) * prevTgtMl + (tEff.sleepiness || 0) * actualReceived) / totalMl),
        soothePanic: Math.round(((bEff.soothePanic || 0) * prevTgtMl + (tEff.soothePanic || 0) * actualReceived) / totalMl)
      }
    };
  }

  // Blend liquid temperature
  const srcTemp = source.temperature ?? 20;
  const tgtTemp = target.temperature ?? 20;
  const newTgtMl = prevTgtMl + actualReceived;
  target.temperature = prevTgtMl > 0
    ? Math.round(((tgtTemp * prevTgtMl + srcTemp * actualReceived) / newTgtMl) * 10) / 10
    : srcTemp;
  target.surfaceTemperature = target.temperature;

  tgtStorage.currentMl = newTgtMl;
  srcStorage.currentMl -= transfer;

  if (srcStorage.currentMl <= 0) {
    srcStorage.currentMl = 0;
    srcStorage.liquidId = null;
    srcStorage.attributes = undefined;
    srcStorage.components = undefined;
    srcStorage.infusedItems = undefined;
  } else if (srcStorage.components && srcStorage.components.length > 0) {
    const keepRatio = srcStorage.currentMl / (srcStorage.currentMl + transfer);
    for (const c of srcStorage.components) {
      c.ml = Math.max(1, Math.round(c.ml * keepRatio));
    }
  }

  updateHybridContainerInteraction(source, 0);
  updateHybridContainerInteraction(target, 1.0);
  syncItemContainerProperties(source);
  syncItemContainerProperties(target);

  const liquidName = tgtStorage.attributes?.varietyRu || LIQUID_REGISTRY[tgtStorage.liquidId as LiquidId]?.nameRu || 'Жидкость';
  const spillInfo = wasteMl > 0 ? ` (пролилось мимо: ${wasteMl} мл)` : '';
  return {
    success: true,
    message: `Перелито ${Math.round(actualReceived)} мл (${liquidName}) из ${srcStorage.baseItemNameRu} в ${tgtStorage.baseItemNameRu}${spillInfo}`,
    transferredMl: actualReceived
  };
}

export function fillContainerWithLiquid(
  container: InventoryItem,
  liquidId: LiquidId,
  amountMl?: number
): { success: boolean; message: string; filledMl: number } {
  if (!container.fluidStorage) {
    return { success: false, message: 'Предмет не может хранить жидкости', filledMl: 0 };
  }

  ensureHybridContainerProps(container);
  const storage = container.fluidStorage;

  const space = getContainerFreeVolumeMl(container);
  if (space <= 0) {
    return { success: false, message: 'В ёмкости больше нет свободного объёма!', filledMl: 0 };
  }

  const add = Math.min(amountMl ?? space, space);
  const prevMl = storage.currentMl || 0;
  const incomingDef = LIQUID_REGISTRY[liquidId] || LIQUID_REGISTRY.water;

  if (prevMl > 0 && storage.liquidId && storage.liquidId !== liquidId) {
    // Mix incoming liquid with existing liquid
    const prevDef = LIQUID_REGISTRY[storage.liquidId as LiquidId] || LIQUID_REGISTRY.water;
    const totalMl = prevMl + add;
    const mixedColor = blendColorHex(
      storage.attributes?.customColor || prevDef.color || '#38bdf8',
      prevMl,
      incomingDef.color || '#38bdf8',
      add
    );
    if (!storage.components || storage.components.length === 0) {
      storage.components = [{ liquidId: storage.liquidId, ml: prevMl, labelRu: prevDef.nameRu, color: prevDef.color }];
    }
    const comp = storage.components.find(c => c.liquidId === liquidId);
    if (comp) comp.ml += add;
    else storage.components.push({ liquidId, ml: add, labelRu: incomingDef.nameRu, color: incomingDef.color });

    const dominantId: LiquidId = (
      !prevDef.isDrinkable || prevDef.isFlammable
        ? storage.liquidId
        : !incomingDef.isDrinkable || incomingDef.isFlammable
        ? liquidId
        : prevMl >= add
        ? storage.liquidId
        : liquidId
    ) as LiquidId;

    storage.liquidId = dominantId;
    storage.currentMl = totalMl;
    storage.attributes = {
      ...(storage.attributes || {}),
      varietyRu: `Смесь (${storage.components.map(c => c.labelRu || c.liquidId).join(' + ')})`,
      customColor: mixedColor,
      visuals: { ...(storage.attributes?.visuals || {}), color: mixedColor }
    };
  } else {
    storage.liquidId = liquidId;
    storage.currentMl = prevMl + add;
    if (!storage.components || storage.components.length === 0) {
      storage.components = [{ liquidId, ml: storage.currentMl, labelRu: incomingDef.nameRu, color: incomingDef.color }];
    } else {
      const comp = storage.components.find(c => c.liquidId === liquidId);
      if (comp) comp.ml += add;
      else storage.components.push({ liquidId, ml: add, labelRu: incomingDef.nameRu, color: incomingDef.color });
    }
  }

  updateHybridContainerInteraction(container, 1.0);
  syncItemContainerProperties(container);

  return {
    success: true,
    message: `Набрано ${Math.round(add)} мл (${incomingDef.nameRu || liquidId})`,
    filledMl: add
  };
}

export function handleConsumeFluid(
  player: Player,
  container: InventoryItem,
  world?: GameWorld
): { success: boolean; message: string } {
  if (!container.fluidStorage) {
    return { success: false, message: 'Предмет не является емкостью' };
  }

  const storage = container.fluidStorage;
  normalizeFluidStorageState(storage);
  if (storage.currentMl <= 0 || !storage.liquidId) {
    addPlayerNotification(player, `${storage.baseItemNameRu} пуста! Наберите жидкость или сыпучее вещество.`, 'info');
    return { success: false, message: 'Емкость пуста' };
  }

  // If this is a sealed metal tin can or sealed dairy cup, first action opens the lid into its _open form!
  const openResult = openFluidContainerIfNeeded(player, container);
  if (openResult.justOpened) {
    return { success: true, message: openResult.message };
  }

  const liquid = LIQUID_REGISTRY[storage.liquidId as LiquidId] || LIQUID_REGISTRY.water;
  const attrs = storage.attributes;

  // 1. Sand substance -> Pour out onto ground / extinguish fires
  if (storage.liquidId === 'sand') {
    return handlePourSandFromContainer(player, container, world);
  }

  // 2. Toxic or Flammable substances or raw dry cooking ingredients (Detergent, Gasoline, Diesel, Oil, Antifreeze, Sugar, Flour, Salt, Dry Mix, Grain, Spice)
  if (!liquid.isDrinkable && !attrs?.customEffects) {
    if (storage.liquidId === 'detergent') {
      const formLabel = attrs?.physicalForm === 'liquid' ? 'Гель для стирки' : 'Стиральный порошок';
      const msg = `${attrs?.varietyRu || formLabel}: засыпьте или залейте средство в отсек стиральной машины`;
      addPlayerNotification(player, msg, 'info');
      return { success: false, message: msg };
    }
    if (liquid.toxicWarning) {
      const warnMsg = attrs
        ? `${attrs.varietyRu}: ${attrs.purpose} (${attrs.preparationMethod}). Употреблять в сухом/сыром виде напрямую нельзя.`
        : liquid.toxicWarning;
      addPlayerNotification(player, warnMsg, 'warning');
      return { success: false, message: warnMsg };
    }
    return handlePourNonDrinkableFluid(player, container, world);
  }

  // 3. Drinkable / Edible substance in container
  if ((player.needs.fullness || 0) >= 98) {
    addPlayerNotification(player, 'Желудок полон! Больше не лезет...', 'warning');
    return { success: false, message: 'Слишком сытно' };
  }

  if ((player.needs.nausea || 0) > 65) {
    addPlayerNotification(player, 'Вас тошнит! Нельзя есть или пить.', 'warning');
    return { success: false, message: 'Тошнит' };
  }

  const baseSip = storage.maxMl <= 250 ? 60 : (storage.maxMl <= 500 ? 120 : 200);
  const thirstFactor = player.needs.thirst < 45 ? 1.3 : 1.0;
  const panicFactor = player.bodyState?.panicLevel && player.bodyState.panicLevel > 50 ? 0.75 : 1.0;
  const bioVariance = 0.8 + Math.random() * 0.4;

  const targetSipMl = baseSip * thirstFactor * panicFactor * bioVariance;
  const sipMl = Math.min(storage.currentMl, Math.max(20, Math.round(targetSipMl)));
  const ratio = sipMl / (storage.maxMl || 500);

  const fx = attrs?.customEffects || liquid.effects;
  if (fx) {
    if (fx.thirst) {
      const tGain = Math.round(fx.thirst * ratio * 2 * 10) / 10;
      player.needs.thirst = Math.min(100, Math.max(0, player.needs.thirst + tGain));
      if (player.bodyState) player.bodyState.hydration = Math.min(100, player.bodyState.hydration + tGain);
    }
    if (fx.hunger) {
      const hGain = Math.round(fx.hunger * ratio * 2 * 10) / 10;
      player.needs.hunger = Math.min(100, Math.max(0, player.needs.hunger + hGain));
    }
    if (fx.energy) {
      const eGain = Math.round(fx.energy * ratio * 2 * 10) / 10;
      player.needs.energy = Math.min(100, Math.max(0, player.needs.energy + eGain));
    }
    if (fx.sleepiness) {
      const sGain = Math.round(fx.sleepiness * ratio * 2 * 10) / 10;
      player.needs.sleepiness = Math.min(100, Math.max(0, player.needs.sleepiness + sGain));
    }
    if (fx.health) {
      player.needs.health = Math.min(100, Math.max(0, player.needs.health + fx.health * ratio));
    }
    if (fx.soothePanic) {
      soothePanic(player, fx.soothePanic * ratio);
    }
  }

  const fGain = Math.round(15 * ratio);
  player.needs.fullness = Math.min(100, (player.needs.fullness || 0) + fGain);

  const consumedDisplayName = attrs?.varietyRu ? `${liquid.nameRu} (${attrs.varietyRu})` : liquid.nameRu;
  const tasteList = attrs?.customTasteMessages || liquid.tasteMessages;
  let taste = '';
  if (tasteList && tasteList.length > 0) {
    taste = tasteList[Math.floor(Math.random() * tasteList.length)];
  }

  storage.currentMl -= sipMl;
  if (storage.currentMl <= 0) {
    storage.currentMl = 0;
    storage.liquidId = null;
    storage.attributes = undefined;
    storage.components = undefined;
    storage.infusedItems = undefined;
  } else if (storage.components && storage.components.length > 0) {
    const keepRatio = storage.currentMl / (storage.currentMl + sipMl);
    for (const c of storage.components) {
      c.ml = Math.max(1, Math.round(c.ml * keepRatio));
    }
  }

  updateHybridContainerInteraction(container, 0);
  syncItemContainerProperties(container);

  const liquidTemp = container.temperature ?? 20.0;
  applyConsumptionThermodynamics(player, liquidTemp, consumedDisplayName, liquid.category !== 'food');

  if (liquid.category === 'food') {
    sound.playEat();
  } else {
    sound.playDrink();
  }

  const remainingSolids = container.contents?.length || 0;
  const remainingInfo = storage.currentMl > 0
    ? `(Осталось жидкости: ${Math.round(storage.currentMl)} мл${remainingSolids > 0 ? `, внутри предм.: ${remainingSolids}` : ''})`
    : remainingSolids > 0
    ? `(Жидкость выпита, внутри осталось предм.: ${remainingSolids})`
    : `(Тара опустела: ${container.nameRu})`;
  addPlayerNotification(player, `${taste || consumedDisplayName} ${remainingInfo}`, liquid.category === 'food' ? 'food' : 'drink');

  return { success: true, message: `Употреблено: ${consumedDisplayName}` };
}

export function handlePourSandFromContainer(
  player: Player,
  container: InventoryItem,
  world?: GameWorld
): { success: boolean; message: string } {
  if (!container.fluidStorage) return { success: false, message: 'Не емкость' };
  const storage = container.fluidStorage;
  if (storage.currentMl <= 0) return { success: false, message: 'Пусто' };

  sound.playWaterSpray();

  const angle = player.aimAngle !== undefined ? player.aimAngle : (player.angle || 0);
  const distance = 35;
  const sandX = player.x + Math.cos(angle) * distance;
  const sandY = player.y + Math.sin(angle) * distance;

  const basePour = Math.min(storage.currentMl, storage.maxMl <= 1000 ? 500 : 2000);
  // Imperfect transfer: ~6% to 12% is scattered or blown away by wind during pouring
  const sandLossRate = 0.06 + Math.random() * 0.06;
  const sandWastedMl = Math.round(basePour * sandLossRate);
  const actualPouredMl = Math.max(0, basePour - sandWastedMl);

  let driedSpillsCount = 0;
  let extinguishedFiresCount = 0;

  if (world) {
    if (!world.stains) world.stains = [];

    // 1. Spawn flying sand particle arc (multi-grain silica clusters)
    for (let i = 0; i < 12; i++) {
      const pAngle = angle + (Math.random() * 0.75 - 0.375);
      const pSpeed = 26 + Math.random() * 52;
      const colors = ['#eab308', '#d97706', '#fef08a', '#b45309'];
      world.particles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: 1.8 + Math.random() * 1.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        secondaryColor: '#92400e',
        alpha: 0.95,
        life: 0,
        maxLife: 0.38 + Math.random() * 0.22,
        type: 'debris',
        debrisSubtype: 'sand_grain',
        z: 0.9 + Math.random() * 0.7,
        vz: 10 + Math.random() * 18
      });
    }

    // 2. Spawn / expand sand stain realistically using volume logic
    let existingSand = world.stains.find(st => st.type === 'sand' && Math.hypot(st.x - sandX, st.y - sandY) < 35);
    if (existingSand) {
      const oldVol = Math.pow(existingSand.radius, 2.1) * 3;
      const newVol = Math.min(60000, oldVol + actualPouredMl); // cap at 60L
      existingSand.radius = Math.min(85, Math.pow(newVol / 3, 1 / 2.1));
      existingSand.alpha = Math.min(1.0, existingSand.alpha + 0.2);
      existingSand.life = 0;
    } else {
      const radius = Math.pow(actualPouredMl / 3, 1 / 2.1);
      world.stains.push({
        id: `stain_sand_${Date.now()}_${Math.random()}`,
        x: sandX,
        y: sandY,
        radius: Math.min(75, Math.max(12, radius)),
        maxRadius: 75,
        type: 'sand',
        alpha: 0.95,
        life: 0,
        maxLife: 1200,
        onFire: false,
        fireIntensity: 0
      });
    }

    // 3. Dry up spills and extinguish fires in area
    for (let i = world.stains.length - 1; i >= 0; i--) {
      const st = world.stains[i];
      if (st.type === 'sand') continue;
      const dist = Math.hypot(st.x - sandX, st.y - sandY);
      if (dist <= 70) {
        if (st.onFire) {
          st.onFire = false;
          st.fireIntensity = 0;
          extinguishedFiresCount++;
        }
        st.alpha -= 0.6;
        st.radius -= 18;
        if (st.alpha <= 0.05 || st.radius <= 4) {
          world.stains.splice(i, 1);
        }
        driedSpillsCount++;
      }
    }

    // 4. Extinguish vehicle fires
    for (const veh of world.vehicles) {
      const dist = Math.hypot(veh.x - sandX, veh.y - sandY);
      if (dist <= 85 && veh.damage) {
        if (veh.damage.engineFire || veh.damage.fuelTankFire || veh.damage.underHoodSmolder || veh.damage.cabinFire) {
          veh.damage.engineFire = false;
          veh.damage.fuelTankFire = false;
          veh.damage.underHoodSmolder = false;
          veh.damage.cabinFire = false;
          veh.damage.groundPuddleIgnited = false;
          veh.damage.fireProgress = Math.max(0, (veh.damage.fireProgress || 0) - 0.5);
          veh.damage.fireIntensity = 0;
          extinguishedFiresCount++;
        }
      }
    }
  }

  storage.currentMl -= basePour;
  if (storage.currentMl <= 0) {
    storage.currentMl = 0;
    storage.liquidId = null;
  }

  syncItemContainerProperties(container);

  const lossText = sandWastedMl > 0 ? ` (рассыпалось ветром: ${sandWastedMl} мл)` : '';
  if (extinguishedFiresCount > 0) {
    addPlayerNotification(player, `Вы рассыпали песок и потушили огонь!${lossText}`, 'heal');
  } else if (driedSpillsCount > 0) {
    addPlayerNotification(player, `Вы рассыпали песок, осушив разлитые жидкости!${lossText}`, 'heal');
  } else {
    addPlayerNotification(player, `Вы насыпали горку песка на землю.${lossText}`, 'info');
  }

  return { success: true, message: 'Песок высыпан' };
}

export function handlePourNonDrinkableFluid(
  player: Player,
  container: InventoryItem,
  world?: GameWorld
): { success: boolean; message: string } {
  if (!container.fluidStorage) return { success: false, message: 'Не емкость' };
  const storage = container.fluidStorage;
  if (storage.currentMl <= 0 || !storage.liquidId) return { success: false, message: 'Пусто' };

  const liquid = LIQUID_REGISTRY[storage.liquidId];
  const isFuel = storage.liquidId.startsWith('gasoline') || storage.liquidId === 'diesel';
  const isOil = storage.liquidId === 'motor_oil';
  const isCoolant = storage.liquidId === 'antifreeze' || storage.liquidId === 'water';

  sound.playWaterSpray();

  let targetVehicleName: string | null = null;

  if (world) {
    for (const veh of world.vehicles) {
      const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
      if (dist < 110 || (player.isInVehicle && player.currentVehicleId === veh.id)) {
        // 1. Check vehicle fluid tank (cistern, barrel trailer)
        if (veh.fluidTank && veh.fluidTank.currentVolume < veh.fluidTank.capacity) {
          const availLiters = veh.fluidTank.capacity - veh.fluidTank.currentVolume;
          const pourLiters = Math.min(storage.currentMl / 1000, availLiters);
          veh.fluidTank.currentVolume += pourLiters;
          targetVehicleName = `цистерну (${veh.type.toUpperCase()}) (+${pourLiters.toFixed(1)}л ${liquid.nameRu})`;
          storage.currentMl -= Math.round(pourLiters * 1000);
          break;
        }

        // 2. Refuel vehicle fuel tank
        if (isFuel && veh.fuelSystem && veh.fuelSystem.tankLevel < 100) {
          const capacity = veh.fuelSystem.tankCapacity || 50;
          const currentLiters = (veh.fuelSystem.tankLevel / 100) * capacity;
          const availLiters = capacity - currentLiters;
          const pourLiters = Math.min(storage.currentMl / 1000, availLiters);
          veh.fuelSystem.tankLevel = Math.min(100, ((currentLiters + pourLiters) / capacity) * 100);
          targetVehicleName = `бак автомобиля (+${pourLiters.toFixed(1)}л ${liquid.nameRu})`;
          storage.currentMl -= Math.round(pourLiters * 1000);
          break;
        }

        // 3. Engine oil fill
        if (isOil && veh.engineState && (veh.engineState.oilLevel || 0) < 100) {
          const MAX_OIL_ML = 4000;
          const curOilMl = ((veh.engineState.oilLevel || 0) / 100) * MAX_OIL_ML;
          const pourMl = Math.min(storage.currentMl, MAX_OIL_ML - curOilMl);
          veh.engineState.oilLevel = Math.min(100, ((curOilMl + pourMl) / MAX_OIL_ML) * 100);
          veh.engineState.oilPunctured = false;
          targetVehicleName = `двигатель (+${Math.round(pourMl)} мл моторного масла)`;
          storage.currentMl -= pourMl;
          break;
        }

        // 4. Coolant fill
        if (isCoolant && veh.engineState && (veh.engineState.radiatorWater || 0) < 100) {
          const MAX_COOLANT_ML = 5000;
          const curCoolantMl = ((veh.engineState.radiatorWater || 0) / 100) * MAX_COOLANT_ML;
          const pourMl = Math.min(storage.currentMl, MAX_COOLANT_ML - curCoolantMl);
          veh.engineState.radiatorWater = Math.min(100, ((curCoolantMl + pourMl) / MAX_COOLANT_ML) * 100);
          veh.engineState.radiatorPunctured = false;
          targetVehicleName = `радиатор (+${Math.round(pourMl)} мл охлаждающей жидкости)`;
          storage.currentMl -= pourMl;
          break;
        }
      }
    }

    // If not poured into vehicle, spill puddle on ground
    if (!targetVehicleName) {
      const angle = player.aimAngle !== undefined ? player.aimAngle : (player.angle || 0);
      const stainX = player.x + Math.cos(angle) * 22;
      const stainY = player.y + Math.sin(angle) * 22;
      const stainType = liquid.stainType === 'oil'
        ? 'oil'
        : (liquid.stainType === 'fuel'
          ? 'fuel'
          : (liquid.stainType === 'antifreeze' ? 'coolant' : 'water'));

      if (!world.stains) world.stains = [];

      let existingStain = world.stains.find(st => st.type === stainType && Math.hypot(st.x - stainX, st.y - stainY) < 40);
      if (existingStain) {
        existingStain.radius = Math.min(85, existingStain.radius + 15);
        existingStain.life = 0;
      } else {
        world.stains.push({
          id: `stain_${stainType}_${Date.now()}_${Math.random()}`,
          x: stainX,
          y: stainY,
          radius: 24,
          maxRadius: 75,
          type: stainType as any,
          alpha: 0.85,
          life: 0,
          maxLife: 600,
          onFire: false,
          fireIntensity: 0
        });
      }

      // Splash liquid droplets
      for (let i = 0; i < 8; i++) {
        const pAngle = angle + (Math.random() * 0.75 - 0.375);
        const pSpeed = 30 + Math.random() * 50;
        world.particles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          radius: 1.8 + Math.random() * 1.8,
          color: liquid.color || '#eab308',
          alpha: 0.9,
          life: 0,
          maxLife: 0.36,
          type: 'debris',
          debrisSubtype: 'liquid_drop',
          z: 0.8 + Math.random() * 0.6,
          vz: 8 + Math.random() * 14
        });
      }

      const spillMl = Math.min(storage.currentMl, storage.maxMl <= 1000 ? 500 : 2000);
      storage.currentMl -= spillMl;
    }
  }

  if (storage.currentMl <= 0) {
    storage.currentMl = 0;
    storage.liquidId = null;
  }

  syncItemContainerProperties(container);

  if (targetVehicleName) {
    addPlayerNotification(player, `Залито в ${targetVehicleName}!`, 'heal');
  } else {
    addPlayerNotification(player, `Вы разлили ${liquid.nameRu} на землю!`, 'warning');
  }

  return { success: true, message: 'Жидкость залита/разлита' };
}

export function isPlayerNearWaterSource(player: Player, world?: GameWorld): boolean {
  if (!world) return false;

  // 1. Check nearby water stains or puddles
  if (world.stains) {
    const waterStain = world.stains.find(st => st.type === 'water' && Math.hypot(st.x - player.x, st.y - player.y) < 70);
    if (waterStain) return true;
  }

  // 2. Check nearby vehicle with water tank
  if (world.vehicles) {
    for (const veh of world.vehicles) {
      const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
      if ((dist < 115 || (player.isInVehicle && player.currentVehicleId === veh.id)) && veh.fluidTank) {
        if (veh.fluidTank.liquidType === 'water' && veh.fluidTank.currentVolume > 0.1) {
          return true;
        }
      }
    }
  }

  // 3. Check nearby buildings with sinks or plumbing (gas station, apartments, shops)
  if (world.buildings) {
    for (const b of world.buildings) {
      const dist = Math.hypot(b.x - player.x, b.y - player.y);
      if (dist < 160) {
        // Safe check using getBuildingLayout
        try {
          const layout = getBuildingLayout(b, player.currentFloor || 1, player.insideApartmentId);
          if (layout && layout.furniture) {
            const sink = layout.furniture.find(obj =>
              (obj.type === 'sink' || obj.type === 'bath' || obj.type === 'kitchen_counter' || obj.type === 'toilet' || obj.type === 'washing_machine') &&
              Math.hypot((b.x + (obj.x || 0)) - player.x, (b.y + (obj.y || 0)) - player.y) < 95
            );
            if (sink) return true;
          }
        } catch (e) {
          // ignore layout generation errors
        }

        // Fallback for buildings with plumbing/sinks based on b.type
        const isPlumbedBuilding =
          b.type === 'gas_station_shop' ||
          b.type === 'panel_apartment' ||
          b.type === 'brick_residential' ||
          b.type === 'modern_residential' ||
          b.type === 'residential' ||
          b.type === 'suburban' ||
          b.type === 'shop' ||
          b.type === 'shopping_mall' ||
          b.type === 'commercial' ||
          b.type === 'auto_service_center' ||
          b.type === 'car_wash_station' ||
          b.type === 'pharmacy_store' ||
          b.type === 'supermarket_store' ||
          b.type === 'bakery_cafe' ||
          b.type === 'coffee_bistro' ||
          b.type === 'fast_food_restaurant' ||
          b.type === 'pizzeria_restaurant' ||
          b.type === 'hospital' ||
          b.type === 'police_station' ||
          b.type === 'fire_station' ||
          b.type === 'school_kindergarten' ||
          b.type === 'office' ||
          b.type === 'business_center';

        if (isPlumbedBuilding && dist < 85) {
          return true;
        }
      }
    }
  }

  return false;
}

export function tryFillOrUseFluidContainer(
  player: Player,
  container: InventoryItem,
  world?: GameWorld
): { success: boolean; message: string } {
  if (!container.fluidStorage) {
    return { success: false, message: 'Не емкость' };
  }

  const storage = container.fluidStorage;

  // If container is sealed/closed and has an openedVariantId, opening it works even if empty!
  if (isFluidContainerClosed(container)) {
    const openResult = openFluidContainerIfNeeded(player, container);
    if (openResult.justOpened) {
      // If it contains a drinkable beverage, auto-drink on the same action instead of requiring a second press
      if (storage.currentMl > 0 && storage.liquidId && LIQUID_REGISTRY[storage.liquidId]?.isDrinkable) {
        return handleConsumeFluid(player, container, world);
      }
      return { success: true, message: openResult.message };
    }
  }

  // If container is not empty -> handle consumption / pouring / refueling
  if (storage.currentMl > 0 && storage.liquidId) {
    return handleConsumeFluid(player, container, world);
  }

  // If container has no liquid -> try to fill remaining free volume from surrounding world sources!
  const freeSpaceMl = getContainerFreeVolumeMl(container);
  if (freeSpaceMl <= 0) {
    addPlayerNotification(player, `${storage.baseItemNameRu} полностью заполнена предметами — нет места для жидкости!`, 'warning');
    return { success: false, message: 'Нет свободного места' };
  }

  if (world) {
    // 0. Check nearby water source (river, fountain, sink, plumbed building)
    if (isPlayerNearWaterSource(player, world)) {
      const fillRes = fillContainerWithLiquid(container, 'water', freeSpaceMl);
      if (fillRes.success) {
        sound.playWaterSpray();
        const solidNote = container.contents && container.contents.length > 0
          ? ` (погружено предметов: ${container.contents.length})`
          : '';
        addPlayerNotification(player, `Набрано ${Math.round(fillRes.filledMl)} мл чистой воды${solidNote}!`, 'drink');
        return { success: true, message: fillRes.message };
      }
    }

    // 1. Check nearby vehicle fluid tanks (cistern / tanker / water truck / barrel)
    for (const veh of world.vehicles) {
      const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
      if (dist < 115 || (player.isInVehicle && player.currentVehicleId === veh.id)) {
        if (veh.fluidTank && veh.fluidTank.currentVolume > 0.1) {
          const liquidType = (veh.fluidTank.liquidType === 'water' ? 'water' : (veh.fluidTank.liquidType === 'diesel' ? 'diesel' : 'gasoline_95')) as LiquidId;
          const availMl = veh.fluidTank.currentVolume * 1000;
          const drawMl = Math.min(availMl, freeSpaceMl);
          if (drawMl > 0) {
            veh.fluidTank.currentVolume = Math.max(0, veh.fluidTank.currentVolume - (drawMl / 1000));
            fillContainerWithLiquid(container, liquidType, drawMl);
            sound.playWaterSpray();

            const lName = LIQUID_REGISTRY[liquidType]?.nameRu || liquidType;
            addPlayerNotification(player, `Набрано ${Math.round(drawMl)} мл (${lName}) из цистерны!`, 'heal');
            return { success: true, message: `Набрано ${lName}` };
          }
        }

        // Check vehicle fuel tank (siphon fuel)
        if (veh.fuelSystem && (veh.fuelSystem.tankLevel || 0) > 0) {
          const cap = veh.fuelSystem.tankCapacity || 50;
          const curLiters = (veh.fuelSystem.tankLevel / 100) * cap;
          if (curLiters > 0.1) {
            const fuelLiquid: LiquidId = veh.requiredFuel === 'diesel' ? 'diesel' : 'gasoline_95';
            const drawLiters = Math.min(curLiters, freeSpaceMl / 1000);
            const drawMl = Math.round(drawLiters * 1000);
            if (drawMl > 0) {
              veh.fuelSystem.tankLevel = Math.max(0, ((curLiters - drawLiters) / cap) * 100);
              fillContainerWithLiquid(container, fuelLiquid, drawMl);
              sound.playWaterSpray();

              const lName = LIQUID_REGISTRY[fuelLiquid]?.nameRu || fuelLiquid;
              addPlayerNotification(player, `Слито ${drawMl} мл (${lName}) из бака автомобиля!`, 'heal');
              return { success: true, message: `Слито топливо: ${lName}` };
            }
          }
        }
      }
    }

    // 2. Check nearby sand stains
    if (world.stains) {
      const sandIndex = world.stains.findIndex(st => st.type === 'sand' && Math.hypot(st.x - player.x, st.y - player.y) < 65);
      if (sandIndex !== -1) {
        const stain = world.stains[sandIndex];
        const pileVolumeMl = Math.round(Math.pow(stain.radius, 2.1) * 3);
        if (pileVolumeMl > 100) {
          if (freeSpaceMl > 0) {
            const baseScoop = Math.min(freeSpaceMl, 1500); // max scoop per click
            const scoopMl = Math.min(pileVolumeMl, baseScoop);
            
            // Imperfection loss: ~10% to 18% is lost and falls back into the dirt/asphalt
            const lossRate = 0.10 + Math.random() * 0.08;
            const wastedMl = Math.round(scoopMl * lossRate);
            const actualAddedMl = Math.max(0, scoopMl - wastedMl);
            
            // Reduce sand pile radius correspondingly
            const remainingPileVolume = Math.max(0, pileVolumeMl - scoopMl);
            stain.radius = Math.pow(remainingPileVolume / 3, 1 / 2.1);
            
            storage.liquidId = 'sand';
            storage.currentMl += actualAddedMl;
            syncItemContainerProperties(container);
            sound.playUseItem();
            
            if (stain.radius < 8 || remainingPileVolume < 100) {
              world.stains.splice(sandIndex, 1);
              addPlayerNotification(player, `Вы выгребли всю кучку песка подчистую! Из-за просыпания набрано: +${Math.round(actualAddedMl)} мл песка (просыпалось: ${wastedMl} мл)`, 'pickup');
            } else {
              addPlayerNotification(player, `Вы собрали песок в ${storage.baseItemNameRu}! Набрано: +${Math.round(actualAddedMl)} мл песка (просыпалось: ${wastedMl} мл)`, 'pickup');
            }
            return { success: true, message: 'Песок набран' };
          }
        }
      }
    }
  }

  const hasSolids = container.contents && container.contents.length > 0;
  addPlayerNotification(
    player,
    hasSolids
      ? `В ${storage.baseItemNameRu} нет жидкости (внутри предм.: ${container.contents!.length}). Подойдите к воде или откройте в инвентаре.`
      : `${storage.baseItemNameRu} пуста! Можно набрать воду у источника или положить предметы внутрь.`,
    'info'
  );
  return { success: false, message: 'Емкость пуста' };
}

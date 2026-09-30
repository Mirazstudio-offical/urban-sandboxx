import { InventoryItem, Player, GameWorld, Vehicle } from './types';
import { sound } from './audio';
import { addPlayerNotification } from './items';
import { soothePanic } from './bodySystem';
import { getBuildingLayout } from './buildingInteriors';

export type LiquidId =
  | 'water'
  | 'mineral_water'
  | 'tea'
  | 'tea_green'
  | 'coffee'
  | 'energy_drink'
  | 'cola'
  | 'juice'
  | 'milk'
  | 'milk_raw'
  | 'cream_heavy'
  | 'sour_cream'
  | 'kefir'
  | 'kvas'
  | 'beer'
  | 'vodka'
  | 'wine_white'
  | 'wine_red'
  | 'gasoline_95'
  | 'gasoline_92'
  | 'gasoline_98'
  | 'gasoline_100'
  | 'diesel'
  | 'motor_oil'
  | 'antifreeze'
  | 'brake_fluid'
  | 'washer_fluid'
  | 'sand'
  | 'antiseptic'
  | 'saline'
  | 'saline_solution'
  | 'zelenka'
  | 'iodine'
  | 'peroxide'
  | 'valerian_tincture'
  | 'ammonia_solution'
  | 'honey'
  | 'honey_wild'
  | 'honey_buckwheat'
  | 'maple_syrup'
  | 'broth'
  | 'broth_beef'
  | 'broth_chicken'
  | 'broth_fish'
  | 'broth_vegetable'
  | 'broth_mushroom'
  | 'caviar'
  | 'caviar_red'
  | 'caviar_black'
  | 'caviar_pike'
  | 'caviar_cod'
  | 'caviar_squash'
  | 'caviar_eggplant'
  | 'jam'
  | 'jam_raspberry'
  | 'jam_strawberry'
  | 'jam_blueberry'
  | 'condensed_milk'
  | 'pickles'
  | 'pickles_salted_mushrooms'
  | 'stew_meat'
  | 'fish_preserves'
  | 'berries'
  | 'berries_blueberry'
  | 'berries_lingonberry'
  | 'berries_cranberry'
  | 'berries_raspberry'
  | 'berries_strawberry'
  | 'mushrooms_chanterelle'
  | 'mushrooms_honey_agaric'
  | 'oil_sunflower'
  | 'oil_olive'
  | 'oil_linseed'
  | 'oil_sesame'
  | 'vinegar_table'
  | 'vinegar_apple'
  | 'vinegar_balsamic'
  | 'sauce_soy'
  | 'sauce_fish'
  | 'sauce_worcestershire'
  | 'sauce_narsharab'
  | 'sauce_teriyaki'
  | 'mustard_dijon'
  | 'lard_pork'
  | 'beef_tallow'
  | 'ghee'
  | 'cottage_cheese'
  | 'yogurt'
  | 'yeast_liquid'
  | 'black_pepper_ground'
  | 'chili_powder'
  | 'paprika'
  | 'cinnamon'
  | 'turmeric'
  | 'grain_wheat'
  | 'grain_rye'
  | 'grain_oats'
  | 'rice'
  | 'buckwheat'
  | 'barley'
  | 'millet'
  | 'semolina'
  | 'peas'
  | 'beans'
  | 'lentils'
  | 'chickpeas'
  | 'sugar'
  | 'flour'
  | 'salt';

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
  mineral_water: {
    id: 'mineral_water',
    name: 'Mineral Water',
    nameRu: 'Минералка',
    category: 'water',
    densityKgPerL: 1.00,
    isDrinkable: true,
    isFlammable: false,
    color: '#0284c7',
    effects: { thirst: 40, energy: 5, soothePanic: 25 },
    tasteMessages: ['Освежающая минералка с газом', 'Приятные покалывающие пузырьки газа'],
    stainType: 'water'
  },
  tea: {
    id: 'tea',
    name: 'Hot Tea',
    nameRu: 'Горячий чай',
    category: 'beverage',
    densityKgPerL: 1.00,
    isDrinkable: true,
    isFlammable: false,
    color: '#b45309',
    effects: { thirst: 30, energy: 10, sleepiness: -5, soothePanic: 35 },
    tasteMessages: ['Ароматный крепкий чай', 'Согревающий теплый черный чай с легкой терпкостью'],
    stainType: 'water'
  },
  coffee: {
    id: 'coffee',
    name: 'Fresh Coffee',
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
    name: 'Fruit Juice',
    nameRu: 'Сок',
    category: 'beverage',
    densityKgPerL: 1.04,
    isDrinkable: true,
    isFlammable: false,
    color: '#ea580c',
    effects: { thirst: 30, hunger: 15, health: 5, soothePanic: 20 },
    tasteMessages: ['Натуральный сладкий фруктовый сок', 'Сочный витаминный вкус мякоти'],
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
    tasteMessages: ['Нежное свежее цельное молоко', 'Мягкий сливочный вкус деревенского молока'],
    stainType: 'water'
  },
  kvas: {
    id: 'kvas',
    name: 'Bread Kvas',
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
    name: 'Lager Beer',
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
    name: 'Vodka 40%',
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
  },
  antiseptic: {
    id: 'antiseptic',
    name: 'Medical Antiseptic 70%',
    nameRu: 'Антисептик спиртовой',
    category: 'medical',
    densityKgPerL: 0.87,
    isDrinkable: false,
    isFlammable: true,
    color: '#10b981',
    toxicWarning: 'Концентрированный медицинский антисептик для наружного применения.',
    stainType: 'water'
  },
  saline: {
    id: 'saline',
    name: 'Saline Solution 0.9%',
    nameRu: 'Физраствор',
    category: 'medical',
    densityKgPerL: 1.01,
    isDrinkable: true,
    isFlammable: false,
    color: '#e0f2fe',
    effects: { thirst: 20 },
    tasteMessages: ['Слабосоленый медицинский раствор натрия хлорида'],
    stainType: 'water'
  },
  // === DAIRY ===
  milk_raw: {
    id: 'milk_raw',
    name: 'Raw Farm Milk',
    nameRu: 'Парное деревенское молоко',
    category: 'beverage',
    densityKgPerL: 1.03,
    isDrinkable: true,
    isFlammable: false,
    color: '#fffbeb',
    effects: { thirst: 35, hunger: 20, health: 10, energy: 15, soothePanic: 20 },
    tasteMessages: ['Сладкий, жирный вкус парного молока!', 'Насыщенный домашний сливочный вкус цельного молока.'],
    stainType: 'water'
  },
  cream_heavy: {
    id: 'cream_heavy',
    name: 'Heavy Cream 30%',
    nameRu: 'Деревенские густые сливки',
    category: 'food',
    densityKgPerL: 1.01,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef3c7',
    effects: { hunger: 40, energy: 25, health: 8, soothePanic: 25 },
    tasteMessages: ['Густые сладкие деревенские сливки...', 'Нежнейшая сливочная текстура натуральных сливок.'],
    stainType: 'water'
  },
  sour_cream: {
    id: 'sour_cream',
    name: 'Sour Cream 20%',
    nameRu: 'Густая сметана',
    category: 'food',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#ffffff',
    effects: { hunger: 35, energy: 20, health: 8, soothePanic: 20 },
    tasteMessages: ['Густая, нежная сметана со сливочной кислинкой! Классический вкус.'],
    stainType: 'water'
  },
  kefir: {
    id: 'kefir',
    name: 'Kefir 2.5%',
    nameRu: 'Кисломолочный кефир',
    category: 'beverage',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#f8fafc',
    effects: { thirst: 35, hunger: 20, health: 12, soothePanic: 20 },
    tasteMessages: ['Густой освежающий кефир приятно покалывает язык кисломолочным вкусом.'],
    stainType: 'water'
  },

  // === HONEYS & SYRUPS ===
  honey: {
    id: 'honey',
    name: 'Natural Flower Honey',
    nameRu: 'Натуральный мёд',
    category: 'food',
    densityKgPerL: 1.42,
    isDrinkable: true,
    isFlammable: false,
    color: '#d97706',
    effects: { hunger: 45, energy: 35, thirst: 5, health: 12, soothePanic: 30 },
    tasteMessages: ['Густой ароматный цветочный мёд тает на языке...', 'Сладкий тягучий золотистый мёд согревает горло.', 'Натуральный липовый мёд дарит силы и тепло.'],
    stainType: 'water'
  },
  honey_wild: {
    id: 'honey_wild',
    name: 'Wild Forest Honey',
    nameRu: 'Дикий лесной мёд',
    category: 'food',
    densityKgPerL: 1.44,
    isDrinkable: true,
    isFlammable: false,
    color: '#b45309',
    effects: { hunger: 50, energy: 40, health: 18, soothePanic: 35 },
    tasteMessages: ['Терпкий дикий бортевой мёд с ароматом таежного разнотравья!', 'Густой темный мёд с нотками смолы и диких цветов.'],
    stainType: 'water'
  },
  honey_buckwheat: {
    id: 'honey_buckwheat',
    name: 'Dark Buckwheat Honey',
    nameRu: 'Гречишный тёмный мёд',
    category: 'food',
    densityKgPerL: 1.45,
    isDrinkable: true,
    isFlammable: false,
    color: '#78350f',
    effects: { hunger: 48, energy: 38, health: 16, soothePanic: 30 },
    tasteMessages: ['Глубокий, терпкий вкус гречишного мёда слегка першит в горле...', 'Богатый железом и микроэлементами темный мёд.'],
    stainType: 'water'
  },
  maple_syrup: {
    id: 'maple_syrup',
    name: 'Pure Maple Syrup',
    nameRu: 'Кленовый сироп',
    category: 'food',
    densityKgPerL: 1.33,
    isDrinkable: true,
    isFlammable: false,
    color: '#9a3412',
    effects: { hunger: 40, energy: 35, soothePanic: 20 },
    tasteMessages: ['Сладкий древесно-карамельный кленовый сироп...', 'Насыщенная янтарная сладость кленового сока.'],
    stainType: 'water'
  },

  // === BROTHS & SOUPS ===
  broth: {
    id: 'broth',
    name: 'Rich Hot Broth',
    nameRu: 'Горячий бульон',
    category: 'food',
    densityKgPerL: 1.05,
    isDrinkable: true,
    isFlammable: false,
    color: '#b45309',
    effects: { hunger: 55, thirst: 35, energy: 20, health: 14, soothePanic: 40 },
    tasteMessages: ['Наваристый горячий мясной бульон с травами...', 'Сытный согревающий суповой бульон.', 'Пряный ароматный суп утоляет голод и согревает.'],
    stainType: 'water'
  },
  broth_beef: {
    id: 'broth_beef',
    name: 'Rich Beef Bone Broth',
    nameRu: 'Наваристый говяжий бульон',
    category: 'food',
    densityKgPerL: 1.06,
    isDrinkable: true,
    isFlammable: false,
    color: '#78350f',
    effects: { hunger: 60, thirst: 35, energy: 25, health: 18, soothePanic: 45 },
    tasteMessages: ['Густой наваристый костный говяжий бульон с жирком...', 'Глубокий вкус томленого мяса и кореньев согревает изнутри.'],
    stainType: 'water'
  },
  broth_chicken: {
    id: 'broth_chicken',
    name: 'Golden Chicken Broth',
    nameRu: 'Золотистый куриный бульон',
    category: 'food',
    densityKgPerL: 1.04,
    isDrinkable: true,
    isFlammable: false,
    color: '#d97706',
    effects: { hunger: 50, thirst: 40, energy: 20, health: 16, soothePanic: 40 },
    tasteMessages: ['Прозрачный золотистый куриный бульон с укропом...', 'Легкий и целебный домашний куриный суп.'],
    stainType: 'water'
  },
  broth_fish: {
    id: 'broth_fish',
    name: 'Fish Soup / Ukha',
    nameRu: 'Рыбная уха',
    category: 'food',
    densityKgPerL: 1.03,
    isDrinkable: true,
    isFlammable: false,
    color: '#ca8a04',
    effects: { hunger: 50, thirst: 35, energy: 18, health: 15, soothePanic: 35 },
    tasteMessages: ['Наваристая костровая уха из свежей рыбы с дымком...', 'Ароматный рыбный навар с лавровым листом и перцем.'],
    stainType: 'water'
  },
  broth_vegetable: {
    id: 'broth_vegetable',
    name: 'Vegetable Root Broth',
    nameRu: 'Овощной пряный бульон',
    category: 'food',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#65a30d',
    effects: { hunger: 35, thirst: 45, energy: 15, health: 12, soothePanic: 30 },
    tasteMessages: ['Легкий ароматный отвар моркови, сельдерея, лука и трав...', 'Чистый витаминный овощной настой.'],
    stainType: 'water'
  },
  broth_mushroom: {
    id: 'broth_mushroom',
    name: 'Wild Mushroom Soup',
    nameRu: 'Грибной суп-бульон',
    category: 'food',
    densityKgPerL: 1.04,
    isDrinkable: true,
    isFlammable: false,
    color: '#57534e',
    effects: { hunger: 55, thirst: 30, energy: 20, health: 15, soothePanic: 40 },
    tasteMessages: ['Темный густой бульон из белых лесных грибов...', 'Неповторимый лесной аромат боровиков и подосиновиков.'],
    stainType: 'water'
  },

  // === CAVIARS ===
  caviar: {
    id: 'caviar',
    name: 'Granular Caviar',
    nameRu: 'Зернистая икра',
    category: 'food',
    densityKgPerL: 1.15,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#dc2626',
    effects: { hunger: 60, energy: 30, health: 25, soothePanic: 45 },
    tasteMessages: ['Нежные икринки приятно лопаются на языке...', 'Изысканный солоноватый вкус благородного деликатеса.', 'Богатый насыщенный вкус отборной икры.'],
    stainType: 'water'
  },
  caviar_red: {
    id: 'caviar_red',
    name: 'Red Salmon Caviar',
    nameRu: 'Красная икра (лососевая)',
    category: 'food',
    densityKgPerL: 1.15,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#ea580c',
    effects: { hunger: 65, energy: 30, health: 25, soothePanic: 50 },
    tasteMessages: ['Крупные янтарные икринки лосося упруго лопаются на языке!', 'Роскошный сливочно-соленый вкус отборной красной икры.'],
    stainType: 'water'
  },
  caviar_black: {
    id: 'caviar_black',
    name: 'Black Sturgeon Caviar',
    nameRu: 'Чёрная икра (осетровая)',
    category: 'food',
    densityKgPerL: 1.16,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#18181b',
    effects: { hunger: 70, energy: 35, health: 30, soothePanic: 60 },
    tasteMessages: ['Изысканный бархатный ореховый привкус черной осетровой икры...', 'Царский деликатес высшей пробы.'],
    stainType: 'water'
  },
  caviar_pike: {
    id: 'caviar_pike',
    name: 'Pike Caviar',
    nameRu: 'Щучья икра',
    category: 'food',
    densityKgPerL: 1.12,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#facc15',
    effects: { hunger: 55, energy: 25, health: 20, soothePanic: 40 },
    tasteMessages: ['Мелкая золотистая щучья икра с нежным малосольным вкусом...'],
    stainType: 'water'
  },
  caviar_cod: {
    id: 'caviar_cod',
    name: 'Cod Caviar',
    nameRu: 'Икра трески',
    category: 'food',
    densityKgPerL: 1.13,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#fed7aa',
    effects: { hunger: 50, energy: 22, health: 18, soothePanic: 35 },
    tasteMessages: ['Нежная паштетная текстура икры трески с морским солоноватым вкусом.'],
    stainType: 'water'
  },
  caviar_squash: {
    id: 'caviar_squash',
    name: 'Squash Caviar',
    nameRu: 'Кабачковая икра',
    category: 'food',
    densityKgPerL: 1.08,
    isDrinkable: true,
    isFlammable: false,
    color: '#ea580c',
    effects: { hunger: 45, energy: 20, health: 12, soothePanic: 30 },
    tasteMessages: ['Нежная обжаренная кабачковая икра с томатом и морковью...', 'Любимый домашний вкус заготовок.'],
    stainType: 'water'
  },
  caviar_eggplant: {
    id: 'caviar_eggplant',
    name: 'Eggplant Caviar',
    nameRu: 'Баклажанная икра',
    category: 'food',
    densityKgPerL: 1.09,
    isDrinkable: true,
    isFlammable: false,
    color: '#7c2d12',
    effects: { hunger: 48, energy: 22, health: 14, soothePanic: 30 },
    tasteMessages: ['Пряная баклажанная икра с чесночком и сладким перцем...'],
    stainType: 'water'
  },

  // === JAMS ===
  jam: {
    id: 'jam',
    name: 'Berry Jam',
    nameRu: 'Домашнее варенье',
    category: 'food',
    densityKgPerL: 1.35,
    isDrinkable: true,
    isFlammable: false,
    color: '#991b1b',
    effects: { hunger: 40, energy: 30, thirst: 5, health: 8, soothePanic: 25 },
    tasteMessages: ['Сладкое ароматное домашнее ягодное варенье...', 'Кусочки спелых ягод в густом сахарном сиропе.'],
    stainType: 'water'
  },
  jam_raspberry: {
    id: 'jam_raspberry',
    name: 'Raspberry Jam',
    nameRu: 'Малиновое варенье',
    category: 'food',
    densityKgPerL: 1.35,
    isDrinkable: true,
    isFlammable: false,
    color: '#be123c',
    effects: { hunger: 42, energy: 32, health: 15, soothePanic: 30 },
    tasteMessages: ['Душистое малиновое варенье отлично сбивает простуду и согревает!', 'Сладкие зернышки спелой садовой малины в сиропе.'],
    stainType: 'water'
  },
  jam_strawberry: {
    id: 'jam_strawberry',
    name: 'Strawberry Jam',
    nameRu: 'Клубничное варенье',
    category: 'food',
    densityKgPerL: 1.36,
    isDrinkable: true,
    isFlammable: false,
    color: '#dc2626',
    effects: { hunger: 42, energy: 30, health: 10, soothePanic: 28 },
    tasteMessages: ['Цельные сладкие ягоды клубники в густом прозрачном рубиновом сиропе.'],
    stainType: 'water'
  },
  jam_blueberry: {
    id: 'jam_blueberry',
    name: 'Wild Blueberry Jam',
    nameRu: 'Черничное варенье',
    category: 'food',
    densityKgPerL: 1.37,
    isDrinkable: true,
    isFlammable: false,
    color: '#312e81',
    effects: { hunger: 40, energy: 30, health: 14, soothePanic: 25 },
    tasteMessages: ['Густое темное варенье из дикой лесной черники... Полезно для зрения.'],
    stainType: 'water'
  },

  // === BERRIES & MUSHROOMS IN BASKETS ===
  berries: {
    id: 'berries',
    name: 'Wild Forest Berries',
    nameRu: 'Лесные ягоды',
    category: 'food',
    densityKgPerL: 0.85,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#701a75',
    effects: { hunger: 25, thirst: 20, health: 15, energy: 15, soothePanic: 25 },
    tasteMessages: ['Свежие лесные ягоды: черника, брусника и земляника...', 'Сладкий сок спелых диких ягод освежает рецепторы.'],
    stainType: 'water'
  },
  berries_blueberry: {
    id: 'berries_blueberry',
    name: 'Fresh Blueberries',
    nameRu: 'Свежая черника',
    category: 'food',
    densityKgPerL: 0.85,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#3730a3',
    effects: { hunger: 25, thirst: 20, health: 16, energy: 15, soothePanic: 25 },
    tasteMessages: ['Горсть сладкой лесной черники приятно красит язык в фиолетовый цвет...'],
    stainType: 'water'
  },
  berries_lingonberry: {
    id: 'berries_lingonberry',
    name: 'Fresh Lingonberries',
    nameRu: 'Таёжная брусника',
    category: 'food',
    densityKgPerL: 0.86,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#dc2626',
    effects: { hunger: 22, thirst: 22, health: 18, energy: 15, soothePanic: 25 },
    tasteMessages: ['Горьковато-кислый, освежающий дикий вкус таежной брусники!'],
    stainType: 'water'
  },
  berries_cranberry: {
    id: 'berries_cranberry',
    name: 'Wild Cranberries',
    nameRu: 'Болотная клюква',
    category: 'food',
    densityKgPerL: 0.86,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#e11d48',
    effects: { hunger: 20, thirst: 25, health: 20, energy: 18, soothePanic: 25 },
    tasteMessages: ['Резкий, пронзительно-кислый витаминный взрыв болотной клюквы!'],
    stainType: 'water'
  },
  berries_raspberry: {
    id: 'berries_raspberry',
    name: 'Garden Raspberries',
    nameRu: 'Спелая малина',
    category: 'food',
    densityKgPerL: 0.82,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#e11d48',
    effects: { hunger: 28, thirst: 18, health: 16, energy: 16, soothePanic: 28 },
    tasteMessages: ['Нежнейшие, ароматные сладкие ягоды садовой малины тают во рту...'],
    stainType: 'water'
  },
  berries_strawberry: {
    id: 'berries_strawberry',
    name: 'Juicy Strawberries',
    nameRu: 'Сочная клубника',
    category: 'food',
    densityKgPerL: 0.84,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#ef4444',
    effects: { hunger: 30, thirst: 20, health: 14, energy: 16, soothePanic: 30 },
    tasteMessages: ['Роскошный летний вкус спелой сладкой клубники!'],
    stainType: 'water'
  },
  mushrooms_chanterelle: {
    id: 'mushrooms_chanterelle',
    name: 'Fresh Chanterelles',
    nameRu: 'Свежие лисички',
    category: 'food',
    densityKgPerL: 0.75,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#f59e0b',
    effects: { hunger: 25, health: 12, energy: 12, soothePanic: 20 },
    tasteMessages: ['Упругие рыжие лисички с приятным ароматом соснового леса...'],
    stainType: 'water'
  },
  mushrooms_honey_agaric: {
    id: 'mushrooms_honey_agaric',
    name: 'Forest Honey Agarics',
    nameRu: 'Осенние опята',
    category: 'food',
    densityKgPerL: 0.78,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#b45309',
    effects: { hunger: 25, health: 10, energy: 12, soothePanic: 20 },
    tasteMessages: ['Упругие лесные опята...'],
    stainType: 'water'
  },

  // === CULINARY OILS, SAUCES & VINEGARS ===
  oil_sunflower: {
    id: 'oil_sunflower',
    name: 'Sunflower Oil',
    nameRu: 'Подсолнечное масло',
    category: 'lubricant',
    densityKgPerL: 0.92,
    isDrinkable: true,
    isFlammable: true,
    color: '#eab308',
    effects: { hunger: 20 },
    tasteMessages: ['Вязкий, жирный глоток подсолнечного масла... Слишком маслянисто.'],
    stainType: 'oil'
  },
  oil_olive: {
    id: 'oil_olive',
    name: 'Extra Virgin Olive Oil',
    nameRu: 'Оливковое масло',
    category: 'lubricant',
    densityKgPerL: 0.91,
    isDrinkable: true,
    isFlammable: true,
    color: '#84cc16',
    effects: { hunger: 22, health: 5 },
    tasteMessages: ['Густой оливковый вкус с благородной горчинкой в горле.'],
    stainType: 'oil'
  },
  oil_linseed: {
    id: 'oil_linseed',
    name: 'Linseed Oil',
    nameRu: 'Льняное масло',
    category: 'lubricant',
    densityKgPerL: 0.93,
    isDrinkable: true,
    isFlammable: true,
    color: '#ca8a04',
    effects: { hunger: 18, health: 8 },
    tasteMessages: ['Специфический масляный вкус льняного масла.'],
    stainType: 'oil'
  },
  oil_sesame: {
    id: 'oil_sesame',
    name: 'Toasted Sesame Oil',
    nameRu: 'Кунжутное масло',
    category: 'lubricant',
    densityKgPerL: 0.92,
    isDrinkable: true,
    isFlammable: true,
    color: '#92400e',
    effects: { hunger: 20 },
    tasteMessages: ['Яркий, насыщенный ореховый привкус жареного кунжута.'],
    stainType: 'oil'
  },
  vinegar_table: {
    id: 'vinegar_table',
    name: 'Table Vinegar 9%',
    nameRu: 'Столовый уксус 9%',
    category: 'chemical',
    densityKgPerL: 1.01,
    isDrinkable: true,
    isFlammable: false,
    color: '#e2e8f0',
    effects: { health: -15, thirst: -10 },
    tasteMessages: ['Обжигающая уксусная кислота перехватывает дыхание!'],
    stainType: 'water'
  },
  vinegar_apple: {
    id: 'vinegar_apple',
    name: 'Apple Cider Vinegar',
    nameRu: 'Яблочный уксус',
    category: 'chemical',
    densityKgPerL: 1.01,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef08a',
    effects: { health: -8, thirst: -5 },
    tasteMessages: ['Кислый яблочный вкус со жгучей уксусной остротой...'],
    stainType: 'water'
  },
  vinegar_balsamic: {
    id: 'vinegar_balsamic',
    name: 'Balsamic Vinegar',
    nameRu: 'Бальзамический уксус',
    category: 'chemical',
    densityKgPerL: 1.07,
    isDrinkable: true,
    isFlammable: false,
    color: '#451a03',
    effects: { hunger: 5 },
    tasteMessages: ['Кисло-сладкий, сложный виноградный вкус выдержанного бальзамика.'],
    stainType: 'water'
  },
  sauce_soy: {
    id: 'sauce_soy',
    name: 'Soy Sauce',
    nameRu: 'Соевый соус',
    category: 'food',
    densityKgPerL: 1.15,
    isDrinkable: true,
    isFlammable: false,
    color: '#1c1917',
    effects: { hunger: 5, thirst: -25 },
    tasteMessages: ['Очень соленый, насыщенный вкус умами... Срочно нужна вода!'],
    stainType: 'water'
  },
  sauce_fish: {
    id: 'sauce_fish',
    name: 'Fish Sauce',
    nameRu: 'Азиатский рыбный соус',
    category: 'food',
    densityKgPerL: 1.18,
    isDrinkable: true,
    isFlammable: false,
    color: '#78350f',
    effects: { hunger: 5, thirst: -25 },
    tasteMessages: ['Резкий соленый анчоусный вкус концентрированного рыбного соуса.'],
    stainType: 'water'
  },
  sauce_worcestershire: {
    id: 'sauce_worcestershire',
    name: 'Worcestershire Sauce',
    nameRu: 'Соус Ворчестер',
    category: 'food',
    densityKgPerL: 1.16,
    isDrinkable: true,
    isFlammable: false,
    color: '#3b0764',
    effects: { hunger: 6, thirst: -15 },
    tasteMessages: ['Сложный кисло-сладкий пряный вкус ворчестершира...'],
    stainType: 'water'
  },
  sauce_narsharab: {
    id: 'sauce_narsharab',
    name: 'Narsharab Pomegranate Sauce',
    nameRu: 'Гранатовый соус Наршараб',
    category: 'food',
    densityKgPerL: 1.25,
    isDrinkable: true,
    isFlammable: false,
    color: '#881337',
    effects: { hunger: 15, thirst: 5, energy: 10 },
    tasteMessages: ['Терпкий, кисло-сладкий концентрированный гранатовый соус.'],
    stainType: 'water'
  },
  sauce_teriyaki: {
    id: 'sauce_teriyaki',
    name: 'Teriyaki Sauce',
    nameRu: 'Соус Терияки',
    category: 'food',
    densityKgPerL: 1.20,
    isDrinkable: true,
    isFlammable: false,
    color: '#451a03',
    effects: { hunger: 15, energy: 8 },
    tasteMessages: ['Сладковато-соленый соус с карамельными нотками и имбирем.'],
    stainType: 'water'
  },
  mustard_dijon: {
    id: 'mustard_dijon',
    name: 'Dijon Mustard',
    nameRu: 'Дижонская горчица',
    category: 'food',
    densityKgPerL: 1.15,
    isDrinkable: true,
    isFlammable: false,
    color: '#ca8a04',
    effects: { hunger: 10, energy: 10, soothePanic: 15 },
    tasteMessages: ['Пикантный пряный вкус цельных горчичных зерен приятно бодрит!'],
    stainType: 'water'
  },
  tea_green: {
    id: 'tea_green',
    name: 'Green Sencha Tea',
    nameRu: 'Зеленый чай Сенча',
    category: 'beverage',
    densityKgPerL: 1.00,
    isDrinkable: true,
    isFlammable: false,
    color: '#65a30d',
    effects: { thirst: 35, energy: 15, health: 5, soothePanic: 20 },
    tasteMessages: ['Тонкий травяной вкус свежезаваренного зеленого чая.', 'Приятное умиротворяющее тепло.'],
    stainType: 'water'
  },
  wine_white: {
    id: 'wine_white',
    name: 'Dry White Wine',
    nameRu: 'Белое сухое вино',
    category: 'alcohol',
    densityKgPerL: 0.99,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef08a',
    effects: { thirst: 15, alcohol: 12, soothePanic: 30 },
    tasteMessages: ['Освежающий виноградный вкус белого вина с легкой кислинкой.'],
    stainType: 'water'
  },
  wine_red: {
    id: 'wine_red',
    name: 'Dry Red Wine',
    nameRu: 'Красное сухое вино',
    category: 'alcohol',
    densityKgPerL: 0.99,
    isDrinkable: true,
    isFlammable: false,
    color: '#881337',
    effects: { thirst: 15, alcohol: 12, soothePanic: 35 },
    tasteMessages: ['Терпкий ягодный вкус выдержанного красного сухого вина.'],
    stainType: 'water'
  },
  saline_solution: {
    id: 'saline_solution',
    name: 'Sterile Saline Solution',
    nameRu: 'Физраствор (0.9% NaCl)',
    category: 'medical',
    densityKgPerL: 1.00,
    isDrinkable: true,
    isFlammable: false,
    color: '#e0f2fe',
    effects: { thirst: 20, health: 5 },
    tasteMessages: ['Слабосоленый стерильный раствор для промывания глаз и ран.'],
    stainType: 'water'
  },
  zelenka: {
    id: 'zelenka',
    name: 'Brilliant Green (Zelenka)',
    nameRu: 'Раствор бриллиантового зелёного',
    category: 'medical',
    densityKgPerL: 0.95,
    isDrinkable: false,
    isFlammable: true,
    color: '#15803d',
    toxicWarning: 'Спиртовой антисептик для наружного применения! Не пить!',
    stainType: 'water'
  },
  iodine: {
    id: 'iodine',
    name: 'Iodine Tincture 5%',
    nameRu: 'Спиртовой раствор йода 5%',
    category: 'medical',
    densityKgPerL: 0.96,
    isDrinkable: false,
    isFlammable: true,
    color: '#78350f',
    toxicWarning: 'Спиртовой раствор йода предназначен строго для наружной дезинфекции!',
    stainType: 'water'
  },
  peroxide: {
    id: 'peroxide',
    name: 'Hydrogen Peroxide 3%',
    nameRu: 'Перекись водорода 3%',
    category: 'medical',
    densityKgPerL: 1.01,
    isDrinkable: false,
    isFlammable: false,
    color: '#f0fdf4',
    toxicWarning: 'Медицинский антисептик для промывания ран! Не принимать внутрь!',
    stainType: 'water'
  },
  valerian_tincture: {
    id: 'valerian_tincture',
    name: 'Valerian Drops',
    nameRu: 'Настойка валерианы',
    category: 'medical',
    densityKgPerL: 0.98,
    isDrinkable: true,
    isFlammable: false,
    color: '#854d0e',
    effects: { sleepiness: 25, soothePanic: 60 },
    tasteMessages: ['Характерный травяной вкус валерианы быстро успокаивает пульс и тревогу.'],
    stainType: 'water'
  },
  ammonia_solution: {
    id: 'ammonia_solution',
    name: 'Ammonia Spirit 10%',
    nameRu: 'Нашатырный спирт 10%',
    category: 'medical',
    densityKgPerL: 0.96,
    isDrinkable: false,
    isFlammable: false,
    color: '#f8fafc',
    toxicWarning: 'Резкий раствор аммиака для ингаляционной стимуляции дыхания при обмороке!',
    stainType: 'water'
  },
  pickles_salted_mushrooms: {
    id: 'pickles_salted_mushrooms',
    name: 'Salted White Milk Mushrooms',
    nameRu: 'Соленые грузди с рассолом',
    category: 'food',
    densityKgPerL: 1.10,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef08a',
    effects: { hunger: 35, thirst: 15, health: 12, soothePanic: 25 },
    tasteMessages: ['Хрустящий соленый груздь с пряным укропно-чесночным рассолом!'],
    stainType: 'water'
  },
  lard_pork: {
    id: 'lard_pork',
    name: 'Rendered Pork Lard',
    nameRu: 'Свиной смалец (лярд)',
    category: 'food',
    densityKgPerL: 0.92,
    isDrinkable: true,
    isFlammable: true,
    color: '#fef3c7',
    effects: { hunger: 45, energy: 20 },
    tasteMessages: ['Сытный топленый смалец...', 'Наваристый мясной жир.'],
    stainType: 'oil'
  },
  beef_tallow: {
    id: 'beef_tallow',
    name: 'Rendered Beef Tallow',
    nameRu: 'Топленый говяжий жир',
    category: 'food',
    densityKgPerL: 0.91,
    isDrinkable: true,
    isFlammable: true,
    color: '#fef9c3',
    effects: { hunger: 40, energy: 18 },
    tasteMessages: ['Густой топленый говяжий жир.'],
    stainType: 'oil'
  },
  ghee: {
    id: 'ghee',
    name: 'Ghee Clarified Butter',
    nameRu: 'Топленое масло Гхи',
    category: 'food',
    densityKgPerL: 0.90,
    isDrinkable: true,
    isFlammable: true,
    color: '#fbbf24',
    effects: { hunger: 45, energy: 25, health: 8 },
    tasteMessages: ['Благородный сливочно-ореховый вкус топленого масла Гхи.'],
    stainType: 'oil'
  },
  cottage_cheese: {
    id: 'cottage_cheese',
    name: 'Fresh Cottage Cheese',
    nameRu: 'Творог рассыпчатый',
    category: 'food',
    densityKgPerL: 0.88,
    isDrinkable: true,
    isFlammable: false,
    isGranular: true,
    color: '#ffffff',
    effects: { hunger: 30, energy: 15, health: 10 },
    tasteMessages: ['Нежный кисловато-сливочный вкус рассыпчатого домашнего творога.'],
    stainType: 'water'
  },
  yogurt: {
    id: 'yogurt',
    name: 'Natural Yogurt',
    nameRu: 'Натуральный йогурт',
    category: 'food',
    densityKgPerL: 1.05,
    isDrinkable: true,
    isFlammable: false,
    color: '#f8fafc',
    effects: { hunger: 20, thirst: 15, health: 8, energy: 12 },
    tasteMessages: ['Легкий йогурт со сливочной текстурой и освежающим вкусом.'],
    stainType: 'water'
  },
  yeast_liquid: {
    id: 'yeast_liquid',
    name: 'Liquid Sourdough Yeast',
    nameRu: 'Жидкая дрожжевая закваска',
    category: 'food',
    densityKgPerL: 1.02,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef3c7',
    effects: { hunger: 8 },
    tasteMessages: ['Кислый бродящий хлебный вкус живой дрожжевой закваски.'],
    stainType: 'water'
  },
  black_pepper_ground: {
    id: 'black_pepper_ground',
    name: 'Ground Black Pepper',
    nameRu: 'Молотый черный перец',
    category: 'granular',
    densityKgPerL: 0.55,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#27272a',
    toxicWarning: 'Ароматный пряный черный перец для кулинарных блюд.',
    stainType: 'sand'
  },
  chili_powder: {
    id: 'chili_powder',
    name: 'Ground Chili Powder',
    nameRu: 'Молотый перец чили',
    category: 'granular',
    densityKgPerL: 0.50,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#dc2626',
    toxicWarning: 'Обжигающий молотый перец чили! Берегите глаза!',
    stainType: 'sand'
  },
  paprika: {
    id: 'paprika',
    name: 'Sweet Smoked Paprika',
    nameRu: 'Сладкая паприка',
    category: 'granular',
    densityKgPerL: 0.52,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#b91c1c',
    toxicWarning: 'Ароматная сладкая копченая паприка.',
    stainType: 'sand'
  },
  cinnamon: {
    id: 'cinnamon',
    name: 'Ground Cinnamon',
    nameRu: 'Молотая корица',
    category: 'granular',
    densityKgPerL: 0.55,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#9a3412',
    toxicWarning: 'Душистая молотая корица для выпечки и десертов.',
    stainType: 'sand'
  },
  turmeric: {
    id: 'turmeric',
    name: 'Golden Turmeric',
    nameRu: 'Молотая куркума',
    category: 'granular',
    densityKgPerL: 0.60,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#f59e0b',
    toxicWarning: 'Пряная золотистая молотая куркума.',
    stainType: 'sand'
  },
  grain_wheat: {
    id: 'grain_wheat',
    name: 'Raw Wheat Grain',
    nameRu: 'Цельное зерно пшеницы',
    category: 'granular',
    densityKgPerL: 0.78,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#fde047',
    toxicWarning: 'Твердые отборные зерна пшеницы для помола или каши.',
    stainType: 'sand'
  },
  grain_rye: {
    id: 'grain_rye',
    name: 'Raw Rye Grain',
    nameRu: 'Цельное зерно ржи',
    category: 'granular',
    densityKgPerL: 0.72,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#a16207',
    toxicWarning: 'Фуражное и пищевое цельное зерно ржи.',
    stainType: 'sand'
  },
  grain_oats: {
    id: 'grain_oats',
    name: 'Rolled Oats',
    nameRu: 'Овсяные хлопья',
    category: 'granular',
    densityKgPerL: 0.45,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#fef08a',
    toxicWarning: 'Овсяные хлопья Геркулес для варки сытной каши.',
    stainType: 'sand'
  },
  rice: {
    id: 'rice',
    name: 'Rice Grains',
    nameRu: 'Рисовая крупа',
    category: 'granular',
    densityKgPerL: 0.85,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#ffffff',
    toxicWarning: 'Белый шлифованный рис для плова и гарниров.',
    stainType: 'sand'
  },
  buckwheat: {
    id: 'buckwheat',
    name: 'Roasted Buckwheat',
    nameRu: 'Гречневая крупа ядрица',
    category: 'granular',
    densityKgPerL: 0.80,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#78350f',
    toxicWarning: 'Отборная обжаренная гречневая крупа.',
    stainType: 'sand'
  },
  barley: {
    id: 'barley',
    name: 'Pearl Barley',
    nameRu: 'Перловая крупа',
    category: 'granular',
    densityKgPerL: 0.82,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#e2e8f0',
    toxicWarning: 'Шлифованная перловая ячменная крупа.',
    stainType: 'sand'
  },
  millet: {
    id: 'millet',
    name: 'Yellow Millet',
    nameRu: 'Золотое пшено',
    category: 'granular',
    densityKgPerL: 0.80,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#eab308',
    toxicWarning: 'Шлифованное круглое золотистое пшено.',
    stainType: 'sand'
  },
  semolina: {
    id: 'semolina',
    name: 'Semolina Groats',
    nameRu: 'Манная крупа',
    category: 'granular',
    densityKgPerL: 0.70,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#fef3c7',
    toxicWarning: 'Манная крупа из пшеницы тонкого помола.',
    stainType: 'sand'
  },
  peas: {
    id: 'peas',
    name: 'Split Yellow Peas',
    nameRu: 'Колотый горох',
    category: 'granular',
    densityKgPerL: 0.85,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#facc15',
    toxicWarning: 'Сушеный колотый желтый горох для супов.',
    stainType: 'sand'
  },
  beans: {
    id: 'beans',
    name: 'Dry Beans',
    nameRu: 'Сухая фасоль',
    category: 'granular',
    densityKgPerL: 0.85,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#991b1b',
    toxicWarning: 'Сухая фасоль для тушения и супов.',
    stainType: 'sand'
  },
  lentils: {
    id: 'lentils',
    name: 'Dry Lentils',
    nameRu: 'Чечевица',
    category: 'granular',
    densityKgPerL: 0.85,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#ea580c',
    toxicWarning: 'Сушеная чечевица для гарниров.',
    stainType: 'sand'
  },
  chickpeas: {
    id: 'chickpeas',
    name: 'Garbanzo Chickpeas',
    nameRu: 'Нут сухой',
    category: 'granular',
    densityKgPerL: 0.80,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#fef08a',
    toxicWarning: 'Крупный сухой турецкий горох нут.',
    stainType: 'sand'
  },
  condensed_milk: {
    id: 'condensed_milk',
    name: 'Condensed Milk',
    nameRu: 'Сгущённое молоко',
    category: 'food',
    densityKgPerL: 1.30,
    isDrinkable: true,
    isFlammable: false,
    color: '#fef3c7',
    effects: { hunger: 50, energy: 35, health: 6, soothePanic: 30 },
    tasteMessages: ['Тягучая сладкая сгущенка по ГОСТу...', 'Нежный сливочно-карамельный вкус сгущенного молока.'],
    stainType: 'water'
  },
  pickles: {
    id: 'pickles',
    name: 'Pickled Cucumbers & Brine',
    nameRu: 'Соленья с рассолом',
    category: 'food',
    densityKgPerL: 1.10,
    isDrinkable: true,
    isFlammable: false,
    color: '#15803d',
    effects: { hunger: 30, thirst: 30, energy: 10, health: 8, soothePanic: 25 },
    tasteMessages: ['Хрустящий соленый огурчик и ядреный пряный рассол...', 'Освежающий соленый рассол с укропом и чесноком.'],
    stainType: 'water'
  },
  stew_meat: {
    id: 'stew_meat',
    name: 'Stewed Beef',
    nameRu: 'Тушёная говядина',
    category: 'food',
    densityKgPerL: 1.15,
    isDrinkable: true,
    isFlammable: false,
    color: '#7f1d1d',
    effects: { hunger: 75, energy: 25, health: 15, soothePanic: 35 },
    tasteMessages: ['Сытные волокна тушеного мяса в ароматном соку...', 'Настоящая армейская тушенка высшего сорта.'],
    stainType: 'water'
  },
  fish_preserves: {
    id: 'fish_preserves',
    name: 'Fish Preserves in Oil',
    nameRu: 'Рыбные консервы',
    category: 'food',
    densityKgPerL: 1.12,
    isDrinkable: true,
    isFlammable: false,
    color: '#b45309',
    effects: { hunger: 65, energy: 20, health: 14, soothePanic: 30 },
    tasteMessages: ['Нежные кусочки рыбы в пряном ароматном масле...', 'Сытный вкус натуральных рыбных консервов.'],
    stainType: 'water'
  },
  sugar: {
    id: 'sugar',
    name: 'Granulated Sugar',
    nameRu: 'Сахар-песок',
    category: 'granular',
    densityKgPerL: 0.85,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#f8fafc',
    toxicWarning: 'Сухой сыпучий сахар-песок для кулинарии и заготовок.',
    stainType: 'sand'
  },
  flour: {
    id: 'flour',
    name: 'Wheat Flour',
    nameRu: 'Пшеничная мука',
    category: 'granular',
    densityKgPerL: 0.60,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#f1f5f9',
    toxicWarning: 'Пшеничная мука высшего сорта для выпечки.',
    stainType: 'sand'
  },
  salt: {
    id: 'salt',
    name: 'Table Salt',
    nameRu: 'Поваренная соль',
    category: 'granular',
    densityKgPerL: 1.20,
    isDrinkable: false,
    isFlammable: false,
    isGranular: true,
    color: '#e2e8f0',
    toxicWarning: 'Пищевая поваренная соль для блюд и консервации.',
    stainType: 'sand'
  }
};

export interface FluidContainerState {
  liquidId: LiquidId | null;
  currentMl: number;
  maxMl: number;
  emptyWeightKg: number;
  baseItemNameRu: string;
  baseItemNameEn?: string;
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
    descriptionRu: 'Универсальная пластиковая ПЭТ-бутылка объемом 0.5 литра. Можно наполнять любой жидкостью или песком.',
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
    descriptionRu: 'Большая пластиковая ПЭТ-бутылка на 1.5 литра. Подходит для воды, кваса, молока, топлива и песка.',
    descriptionEn: 'Large 1.5L PET bottle for fluids and granular materials.'
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
  glass_mug: {
    itemId: 'glass_mug',
    name: 'Glass Mug (0.35L)',
    nameRu: 'Стеклянная кружка 0.35л',
    maxMl: 350,
    emptyWeightKg: 0.28,
    emptyVolumeL: 0.4,
    category: 'gear',
    icon: 'Coffee',
    descriptionRu: 'Увесистая стеклянная чайная кружка объемом 350 мл.',
    descriptionEn: 'Heavy glass mug for tea and beverages (350 ml).'
  },
  can_alu_330: {
    itemId: 'can_alu_330',
    name: 'Aluminum Can (0.33L)',
    nameRu: 'Банка 0.33л',
    maxMl: 330,
    emptyWeightKg: 0.015,
    emptyVolumeL: 0.35,
    category: 'drink',
    icon: 'CupSoda',
    descriptionRu: 'Алюминиевая банка для газировки или энергетика.',
    descriptionEn: 'Aluminum can for beverages (330 ml).'
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
    descriptionEn: '1-liter carton Tetra Pak packaging.'
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
    descriptionRu: 'Унифицированная стеклянная банка объемом 1 литр.',
    descriptionEn: 'Unified 1.0L glass jar.'
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
    descriptionRu: 'Унифицированная стеклянная банка объемом 0.5 литра.',
    descriptionEn: 'Unified 0.5L glass jar.'
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
    descriptionRu: 'Унифицированная стеклянная банка объемом 0.2 литра.',
    descriptionEn: 'Unified 0.2L glass jar.'
  },
  can_metal_large: {
    itemId: 'can_metal_large',
    name: 'Tin Can (0.8L)',
    nameRu: 'Жестяная банка 0.8л',
    maxMl: 800,
    emptyWeightKg: 0.10,
    emptyVolumeL: 0.85,
    category: 'gear',
    icon: 'CupSoda',
    descriptionRu: 'Унифицированная жестяная банка объемом 0.8 литра.',
    descriptionEn: 'Unified 0.8L tin can.'
  },
  can_metal_medium: {
    itemId: 'can_metal_medium',
    name: 'Tin Can (0.4L)',
    nameRu: 'Жестяная банка 0.4л',
    maxMl: 400,
    emptyWeightKg: 0.06,
    emptyVolumeL: 0.45,
    category: 'gear',
    icon: 'CupSoda',
    descriptionRu: 'Унифицированная жестяная банка объемом 0.4 литра.',
    descriptionEn: 'Unified 0.4L tin can.'
  },
  can_metal_small: {
    itemId: 'can_metal_small',
    name: 'Tin Can (0.15L)',
    nameRu: 'Жестяная банка 0.15л',
    maxMl: 150,
    emptyWeightKg: 0.03,
    emptyVolumeL: 0.18,
    category: 'gear',
    icon: 'CupSoda',
    descriptionRu: 'Унифицированная жестяная банка объемом 0.15 литра.',
    descriptionEn: 'Unified 0.15L tin can.'
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
    name: 'Plastic Bag (1.5L)',
    nameRu: 'Фасовочный пакет',
    maxMl: 1500,
    emptyWeightKg: 0.005,
    emptyVolumeL: 1.5,
    category: 'gear',
    icon: 'ShoppingBag',
    descriptionRu: 'Прозрачный тонкий полиэтиленовый фасовочный пакет для сыпучих продуктов, круп и сахара.',
    descriptionEn: 'Transparent thin polyethylene bag for granular products, grains, and sugar.',
    defaultLiquidId: null,
    defaultAmountMl: 0
  },
  plastic_bag: {
    itemId: 'plastic_bag',
    name: 'Carrier Bag (5.0L)',
    nameRu: 'Пакет-майка',
    maxMl: 5000,
    emptyWeightKg: 0.015,
    emptyVolumeL: 5.0,
    category: 'gear',
    icon: 'ShoppingBag',
    descriptionRu: 'Универсальный пластиковый пакет-майка с ручками для переноски продуктов и предметов.',
    descriptionEn: 'Universal plastic grocery shopping bag with handles.',
    defaultLiquidId: null,
    defaultAmountMl: 0
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
    descriptionEn: 'Compact 250ml Tetra Pak carton with straw.'
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
    descriptionRu: 'Герметичный фольгированный пакетик-саше для молотых пряностей, специй и сухих дрожжей.',
    descriptionEn: 'Airtight foil sachet pack for spices, seasonings, and yeast.'
  },
  pot_clay_medium: {
    itemId: 'pot_clay_medium',
    name: 'Clay Pot (0.5L)',
    nameRu: 'Глиняный горшочек 0.5л',
    maxMl: 500,
    emptyWeightKg: 0.35,
    emptyVolumeL: 0.6,
    category: 'food',
    icon: 'Utensils',
    descriptionRu: 'Обожженный глиняный горшочек для смальца, топленого масла или тушеных блюд.',
    descriptionEn: 'Earthenware clay pot for lard, ghee, or stews (500 ml).'
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
  soup_bowl: {
    itemId: 'soup_bowl',
    name: 'Soup Bowl (0.5L)',
    nameRu: 'Суповая пиала',
    maxMl: 500,
    emptyWeightKg: 0.20,
    emptyVolumeL: 0.6,
    category: 'food',
    icon: 'Utensils',
    descriptionRu: 'Глубокая керамическая суповая тарелка-пиала для горячего бульона, рагу и ухи.',
    descriptionEn: 'Deep ceramic soup bowl for hot broths, stews, and soups.',
    defaultLiquidId: null,
    defaultAmountMl: 0
  }
};

export function isFluidContainer(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  return Boolean(item.fluidStorage && item.fluidStorage.maxMl > 0);
}

export function getFluidContainerWeight(item: InventoryItem): number {
  if (!item.fluidStorage) return item.weight || 0.2;
  const storage = item.fluidStorage;
  const emptyWeight = storage.emptyWeightKg ?? 0.05;
  if (!storage.liquidId || storage.currentMl <= 0) {
    return Math.round(emptyWeight * 100) / 100;
  }
  const liquid = LIQUID_REGISTRY[storage.liquidId] || LIQUID_REGISTRY.water;
  const liquidWeight = (storage.currentMl / 1000) * (liquid.densityKgPerL || 1.0);
  return Math.round((emptyWeight + liquidWeight) * 100) / 100;
}

export function getFluidContainerVolume(item: InventoryItem): number {
  if (item.volume !== undefined) return item.volume;
  if (!item.fluidStorage) return 0.5;
  return Math.max(0.2, Math.round((item.fluidStorage.maxMl / 1000) * 1.15 * 10) / 10);
}

export function getFluidContainerDisplayName(item: InventoryItem): string {
  if (!item.fluidStorage) return item.nameRu;
  const storage = item.fluidStorage;
  const baseName = storage.baseItemNameRu || item.nameRu;

  if (!storage.liquidId || storage.currentMl <= 0) {
    return `${baseName} (Пусто)`;
  }

  const liquid = LIQUID_REGISTRY[storage.liquidId] || LIQUID_REGISTRY.water;
  const liquidName = liquid.nameRu;

  const baseLower = baseName.toLowerCase();
  const liquidLower = liquidName.toLowerCase();
  const alreadyMentionsLiquid = baseLower.includes(liquidLower) || liquidLower.includes(baseLower);

  const displayPrefix = alreadyMentionsLiquid ? '' : `${liquidName} `;

  if (storage.maxMl >= 1000) {
    const curL = (storage.currentMl / 1000).toFixed(1);
    const maxL = (storage.maxMl / 1000).toFixed(0);
    return `${baseName} (${displayPrefix}${curL}/${maxL} л)`;
  } else {
    return `${baseName} (${displayPrefix}${Math.round(storage.currentMl)}/${storage.maxMl} мл)`;
  }
}

export function syncItemContainerProperties(item: InventoryItem): void {
  if (!item.fluidStorage) return;
  item.weight = getFluidContainerWeight(item);
  item.volume = getFluidContainerVolume(item);
  item.nameRu = getFluidContainerDisplayName(item);
  if (item.fluidStorage.currentMl > 0 && item.fluidStorage.liquidId) {
    const liquid = LIQUID_REGISTRY[item.fluidStorage.liquidId];
    if (liquid?.isDrinkable) {
      item.usable = true;
    }
  }
}

export function pourLiquidBetweenContainers(
  source: InventoryItem,
  target: InventoryItem,
  amountMl?: number
): { success: boolean; message: string; transferredMl: number } {
  if (!source.fluidStorage || !target.fluidStorage) {
    return { success: false, message: 'Один из предметов не является емкостью', transferredMl: 0 };
  }

  const srcStorage = source.fluidStorage;
  const tgtStorage = target.fluidStorage;

  if (srcStorage.currentMl <= 0 || !srcStorage.liquidId) {
    return { success: false, message: `${srcStorage.baseItemNameRu} пуста`, transferredMl: 0 };
  }

  if (tgtStorage.currentMl > 0 && tgtStorage.liquidId && tgtStorage.liquidId !== srcStorage.liquidId) {
    const srcLiquid = LIQUID_REGISTRY[srcStorage.liquidId]?.nameRu || srcStorage.liquidId;
    const tgtLiquid = LIQUID_REGISTRY[tgtStorage.liquidId]?.nameRu || tgtStorage.liquidId;
    return {
      success: false,
      message: `Нельзя смешивать разные жидкости: в емкости уже есть ${tgtLiquid}, а переливается ${srcLiquid}`,
      transferredMl: 0
    };
  }

  const availableSpace = tgtStorage.maxMl - tgtStorage.currentMl;
  if (availableSpace <= 0) {
    return { success: false, message: `${tgtStorage.baseItemNameRu} уже заполнена до краев!`, transferredMl: 0 };
  }

  const transfer = Math.min(amountMl ?? srcStorage.currentMl, Math.min(srcStorage.currentMl, availableSpace));
  if (transfer <= 0) {
    return { success: false, message: 'Не удалось перелить жидкость', transferredMl: 0 };
  }

  // Realistic spillage waste: ~1.5% to 4% is spilled on walls or drips down the neck
  const spillRate = 0.015 + Math.random() * 0.025;
  const wasteMl = Math.max(1, Math.round(transfer * spillRate));
  const actualReceived = Math.max(0, transfer - wasteMl);

  tgtStorage.liquidId = srcStorage.liquidId;
  tgtStorage.currentMl += actualReceived;
  srcStorage.currentMl -= transfer;

  if (srcStorage.currentMl <= 0) {
    srcStorage.currentMl = 0;
    srcStorage.liquidId = null;
  }

  syncItemContainerProperties(source);
  syncItemContainerProperties(target);

  const liquidName = LIQUID_REGISTRY[tgtStorage.liquidId]?.nameRu || 'Жидкость';
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

  const storage = container.fluidStorage;
  if (storage.currentMl > 0 && storage.liquidId && storage.liquidId !== liquidId) {
    const existing = LIQUID_REGISTRY[storage.liquidId]?.nameRu || storage.liquidId;
    const incoming = LIQUID_REGISTRY[liquidId]?.nameRu || liquidId;
    return {
      success: false,
      message: `В емкости уже налит(а) ${existing}! Сначала вылейте ее перед заполнением ${incoming}.`,
      filledMl: 0
    };
  }

  const space = storage.maxMl - storage.currentMl;
  if (space <= 0) {
    return { success: false, message: 'Емкость уже полна!', filledMl: 0 };
  }

  const add = Math.min(amountMl ?? space, space);
  storage.liquidId = liquidId;
  storage.currentMl += add;

  syncItemContainerProperties(container);

  const liquid = LIQUID_REGISTRY[liquidId];
  return {
    success: true,
    message: `Набрано ${Math.round(add)} мл (${liquid?.nameRu || liquidId})`,
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
  if (storage.currentMl <= 0 || !storage.liquidId) {
    addPlayerNotification(player, `${storage.baseItemNameRu} пуста! Наберите жидкость или песок.`, 'info');
    return { success: false, message: 'Емкость пуста' };
  }

  const liquid = LIQUID_REGISTRY[storage.liquidId] || LIQUID_REGISTRY.water;

  // 1. Sand substance -> Pour out onto ground / extinguish fires
  if (storage.liquidId === 'sand') {
    return handlePourSandFromContainer(player, container, world);
  }

  // 2. Toxic or Flammable substances or raw dry cooking ingredients (Gasoline, Diesel, Oil, Antifreeze, Sugar, Flour, Salt)
  if (!liquid.isDrinkable) {
    if (liquid.toxicWarning) {
      addPlayerNotification(player, liquid.toxicWarning, 'warning');
      return { success: false, message: liquid.toxicWarning };
    }
    // If holding near a vehicle or ground, try vehicle refuel / ground spill
    return handlePourNonDrinkableFluid(player, container, world);
  }

  // 3. Drinkable liquid (Water, Coffee, Tea, Cola, Juice, Milk, Beer, Vodka, etc.)
  if ((player.needs.fullness || 0) >= 98) {
    addPlayerNotification(player, 'Желудок полон! Больше не лезет...', 'warning');
    return { success: false, message: 'Слишком сытно' };
  }

  if ((player.needs.nausea || 0) > 65) {
    addPlayerNotification(player, 'Вас тошнит! Нельзя пить.', 'warning');
    return { success: false, message: 'Тошнит' };
  }

  // Human swallow size has biomechanical variation and is not a uniform robotic metric.
  const baseSip = storage.maxMl <= 500 ? 120 : 200;
  
  // High thirst -> drinking larger gulps; panic or shivering -> smaller, irregular sips
  const thirstFactor = player.needs.thirst < 45 ? 1.3 : 1.0;
  const panicFactor = player.bodyState?.panicLevel && player.bodyState.panicLevel > 50 ? 0.75 : 1.0;
  
  // Normal human swallowing variance (e.g. +/- 20%)
  const bioVariance = 0.8 + Math.random() * 0.4;
  
  const targetSipMl = baseSip * thirstFactor * panicFactor * bioVariance;
  const sipMl = Math.min(storage.currentMl, Math.max(25, Math.round(targetSipMl)));
  const ratio = sipMl / (storage.maxMl || 500);

  // Apply biological effects based on actual liquid chemistry
  if (liquid.effects) {
    if (liquid.effects.thirst) {
      const tGain = Math.round(liquid.effects.thirst * ratio * 2 * 10) / 10;
      player.needs.thirst = Math.min(100, Math.max(0, player.needs.thirst + tGain));
      if (player.bodyState) player.bodyState.hydration = Math.min(100, player.bodyState.hydration + tGain);
    }
    if (liquid.effects.hunger) {
      const hGain = Math.round(liquid.effects.hunger * ratio * 2 * 10) / 10;
      player.needs.hunger = Math.min(100, Math.max(0, player.needs.hunger + hGain));
    }
    if (liquid.effects.energy) {
      const eGain = Math.round(liquid.effects.energy * ratio * 2 * 10) / 10;
      player.needs.energy = Math.min(100, Math.max(0, player.needs.energy + eGain));
    }
    if (liquid.effects.sleepiness) {
      const sGain = Math.round(liquid.effects.sleepiness * ratio * 2 * 10) / 10;
      player.needs.sleepiness = Math.min(100, Math.max(0, player.needs.sleepiness + sGain));
    }
    if (liquid.effects.health) {
      player.needs.health = Math.min(100, Math.max(0, player.needs.health + liquid.effects.health * ratio));
    }
    if (liquid.effects.soothePanic) {
      soothePanic(player, liquid.effects.soothePanic * ratio);
    }
  }

  const fGain = Math.round(15 * ratio);
  player.needs.fullness = Math.min(100, (player.needs.fullness || 0) + fGain);

  storage.currentMl -= sipMl;
  if (storage.currentMl <= 0) {
    storage.currentMl = 0;
    storage.liquidId = null;
  }

  syncItemContainerProperties(container);

  sound.playDrink();

  let taste = '';
  if (liquid.tasteMessages && liquid.tasteMessages.length > 0) {
    taste = liquid.tasteMessages[Math.floor(Math.random() * liquid.tasteMessages.length)];
  }

  const remainingInfo = storage.currentMl > 0 ? `(Осталось: ${Math.round(storage.currentMl)} мл)` : '(Емкость опустела)';
  addPlayerNotification(player, `${taste || liquid.nameRu} ${remainingInfo}`, 'drink');

  return { success: true, message: `Вы выпили ${liquid.nameRu}` };
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

    // 1. Spawn flying sand particle arc
    for (let i = 0; i < 20; i++) {
      const pAngle = angle + (Math.random() * 0.8 - 0.4);
      const pSpeed = 25 + Math.random() * 50;
      const colors = ['#eab308', '#d97706', '#fef08a', '#b45309'];
      world.particles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: 1.8 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.95,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        type: 'debris'
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
      const stainType = liquid.stainType === 'oil' ? 'oil' : (liquid.stainType === 'fuel' ? 'fuel' : 'water');

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

      // Splash particles
      for (let i = 0; i < 10; i++) {
        const pAngle = angle + (Math.random() * 0.8 - 0.4);
        const pSpeed = 30 + Math.random() * 50;
        world.particles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          radius: 2 + Math.random() * 2.5,
          color: liquid.color || '#eab308',
          alpha: 0.9,
          life: 0,
          maxLife: 0.35,
          type: 'debris'
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

  // If container is not empty -> handle consumption / pouring / refueling
  if (storage.currentMl > 0 && storage.liquidId) {
    return handleConsumeFluid(player, container, world);
  }

  // If container is empty -> try to fill from surrounding world sources!
  if (world) {
    // 1. Check nearby vehicle fluid tanks (cistern / tanker / water truck / barrel)
    for (const veh of world.vehicles) {
      const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
      if (dist < 115 || (player.isInVehicle && player.currentVehicleId === veh.id)) {
        if (veh.fluidTank && veh.fluidTank.currentVolume > 0.1) {
          const liquidType = (veh.fluidTank.liquidType === 'water' ? 'water' : (veh.fluidTank.liquidType === 'diesel' ? 'diesel' : 'gasoline_95')) as LiquidId;
          const availMl = veh.fluidTank.currentVolume * 1000;
          const spaceMl = storage.maxMl - storage.currentMl;
          const drawMl = Math.min(availMl, spaceMl);
          veh.fluidTank.currentVolume = Math.max(0, veh.fluidTank.currentVolume - (drawMl / 1000));
          
          storage.liquidId = liquidType;
          storage.currentMl = drawMl;
          syncItemContainerProperties(container);
          sound.playWaterSpray();

          const lName = LIQUID_REGISTRY[liquidType]?.nameRu || liquidType;
          addPlayerNotification(player, `Набрано ${Math.round(drawMl)} мл (${lName}) из цистерны!`, 'heal');
          return { success: true, message: `Набрано ${lName}` };
        }

        // Check vehicle fuel tank (siphon fuel)
        if (veh.fuelSystem && (veh.fuelSystem.tankLevel || 0) > 0) {
          const cap = veh.fuelSystem.tankCapacity || 50;
          const curLiters = (veh.fuelSystem.tankLevel / 100) * cap;
          if (curLiters > 0.1) {
            const fuelLiquid: LiquidId = veh.requiredFuel === 'diesel' ? 'diesel' : 'gasoline_95';
            const spaceMl = storage.maxMl - storage.currentMl;
            const drawLiters = Math.min(curLiters, spaceMl / 1000);
            const drawMl = Math.round(drawLiters * 1000);
            
            veh.fuelSystem.tankLevel = Math.max(0, ((curLiters - drawLiters) / cap) * 100);
            storage.liquidId = fuelLiquid;
            storage.currentMl = drawMl;
            syncItemContainerProperties(container);
            sound.playWaterSpray();

            const lName = LIQUID_REGISTRY[fuelLiquid]?.nameRu || fuelLiquid;
            addPlayerNotification(player, `Слито ${drawMl} мл (${lName}) из бака автомобиля!`, 'heal');
            return { success: true, message: `Слито топливо: ${lName}` };
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
          const spaceMl = storage.maxMl - storage.currentMl;
          if (spaceMl > 0) {
            const baseScoop = Math.min(spaceMl, 1500); // max scoop per click
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

  addPlayerNotification(player, `${storage.baseItemNameRu} пуста!`, 'info');
  return { success: false, message: 'Емкость пуста' };
}

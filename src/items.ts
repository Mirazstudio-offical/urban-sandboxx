import { GameWorld, GroundItem, InventoryItem, ItemCategory, Player } from './types';
import { sound } from './audio';

export interface ItemDefinition {
  itemId: string;
  name: string;
  nameRu: string;
  category: ItemCategory;
  maxStack: number;
  icon: string;
  description: string;
  descriptionRu: string;
  effects: {
    health?: number;
    hunger?: number;
    thirst?: number;
    energy?: number;
    sleepiness?: number;
  };
  weight: number;
  usable: boolean;
  biteCount?: number;          // number of bites/sips to finish (multi-step consumption)
  biteDuration?: number;       // seconds per bite
  leftoverId?: string;         // item spawned after fully consumed (wrapper, plate, core...)
  leftoverNameRu?: string;
  tasteMessages?: string[];    // random taste sensations shown while eating
  fullnessPerBite?: number;    // how much fullness each bite adds
}

export const ITEM_CATALOG: Record<string, ItemDefinition> = {
  // === FOOD (ЕДА) ===
  sandwich: {
    itemId: 'sandwich',
    name: 'Ham & Cheese Sandwich',
    nameRu: 'Сэндвич с ветчиной и сыром',
    category: 'food',
    maxStack: 10,
    icon: '🥪',
    description: 'Fresh toasted sandwich with smoked ham, cheddar and greens. Restores food and slight health.',
    descriptionRu: 'Свежий тост с копченой ветчиной, чеддером и зеленью. Утоляет голод и восстанавливает здоровье.',
    effects: { hunger: 40, health: 8, energy: 10 },
    weight: 0.25,
    usable: true,
    biteCount: 4,
    biteDuration: 1.2,
    leftoverId: 'sandwich_bag',
    leftoverNameRu: 'Пакет от сэндвича',
    fullnessPerBite: 8,
    tasteMessages: ['Хрустящий тост с ветчиной...', 'Сыр тает на языке...', 'Свежий хруст салата...', 'Копченая ветчина — классика!']
  },
  burger: {
    itemId: 'burger',
    name: 'Juicy Cheeseburger',
    nameRu: 'Сочный чизбургер',
    category: 'food',
    maxStack: 8,
    icon: '🍔',
    description: 'Hearty grilled beef patty with cheese, tomato and sesame bun. High satiety.',
    descriptionRu: 'Сытная котлета из говядины на гриле с сыром, томатом и кунжутной булочкой. Высокая сытность.',
    effects: { hunger: 60, health: 12, energy: 15 },
    weight: 0.35,
    usable: true,
    biteCount: 5,
    biteDuration: 1.4,
    leftoverId: 'burger_wrapper',
    leftoverNameRu: 'Обёртка от бургера',
    fullnessPerBite: 10,
    tasteMessages: ['Сочная котлета с гриля...', 'Плавленый сыр стекает по булочке...', 'Хрустящий кунжут...', 'Свежий томат оттеняет мясо...', 'Баунти булочка — идеальна!']
  },
  pizza_slice: {
    itemId: 'pizza_slice',
    name: 'Pepperoni Pizza Slice',
    nameRu: 'Кусок пиццы Пепперони',
    category: 'food',
    maxStack: 12,
    icon: '🍕',
    description: 'Hot slice with crispy mozzarella and spicy sausage.',
    descriptionRu: 'Горячий кусок пиццы с хрустящей моцареллой и пикантной колбасой.',
    effects: { hunger: 35, health: 6, energy: 8 },
    weight: 0.2,
    usable: true,
    biteCount: 3,
    biteDuration: 1.1,
    leftoverId: 'pizza_plate',
    leftoverNameRu: 'Бумажная тарелка',
    fullnessPerBite: 8,
    tasteMessages: ['Тягучий сыр тянется за укусом...', 'Хрустящая корочка...', 'Пикантная пепперони!']
  },
  apple: {
    itemId: 'apple',
    name: 'Crisp Red Apple',
    nameRu: 'Спелое яблоко',
    category: 'food',
    maxStack: 20,
    icon: '🍎',
    description: 'Juicy natural fruit. Restores a bit of hunger and thirst.',
    descriptionRu: 'Сочный натуральный фрукт. Восстанавливает немного сытости и утоляет легкую жажду.',
    effects: { hunger: 18, thirst: 12, health: 4 },
    weight: 0.15,
    usable: true,
    biteCount: 3,
    biteDuration: 1.0,
    leftoverId: 'apple_core',
    leftoverNameRu: 'Огрызок яблока',
    fullnessPerBite: 5,
    tasteMessages: ['Хрустящее, сочное яблоко...', 'Сладкий натуральный вкус...', 'Кислинка освежает!']
  },
  chocolate: {
    itemId: 'chocolate',
    name: 'Dark Chocolate Bar',
    nameRu: 'Шоколадный батончик',
    category: 'food',
    maxStack: 15,
    icon: '🍫',
    description: 'Rich dark cocoa bar. Provides a fast burst of stamina and calories.',
    descriptionRu: 'Плитка шоколада. Дает быстрый прилив бодрости, энергии и калорий.',
    effects: { hunger: 22, energy: 25, sleepiness: -10 },
    weight: 0.1,
    usable: true,
    biteCount: 3,
    biteDuration: 0.9,
    leftoverId: 'chocolate_wrapper',
    leftoverNameRu: 'Фольга от шоколада',
    fullnessPerBite: 6,
    tasteMessages: ['Горьковатый какао тает во рту...', 'Нежный шоколадный вкус...', 'Прилив энергии от какао!']
  },
  chips: {
    itemId: 'chips',
    name: 'Crunchy Potato Chips',
    nameRu: 'Картофельные чипсы',
    category: 'food',
    maxStack: 10,
    icon: '🥔',
    description: 'Salty snack. Gives quick energy but slightly increases thirst.',
    descriptionRu: 'Хрустящие соленые чипсы. Быстрый перекус, но слегка усиливает жажду.',
    effects: { hunger: 25, energy: 12, thirst: -8 },
    weight: 0.15,
    usable: true,
    biteCount: 4,
    biteDuration: 0.6,
    leftoverId: 'chips_bag',
    leftoverNameRu: 'Пустой пакет от чипсов',
    fullnessPerBite: 5,
    tasteMessages: ['Хруст! Солёные картофельные дольки...', 'Слишком много соли... жажда нарастает...', 'Легкий перекус, но аппетит растёт...']
  },
  canned_meat: {
    itemId: 'canned_meat',
    name: 'Canned Beef Stew',
    nameRu: 'Армейская тушёнка',
    category: 'food',
    maxStack: 8,
    icon: '🥫',
    description: 'High-calorie canned preserved meat with long shelf life.',
    descriptionRu: 'Высококалорийные мясные консервы длительного хранения.',
    effects: { hunger: 70, health: 15, energy: 20 },
    weight: 0.5,
    usable: true,
    biteCount: 5,
    biteDuration: 1.5,
    leftoverId: 'can_empty',
    leftoverNameRu: 'Пустая жестяная банка',
    fullnessPerBite: 12,
    tasteMessages: ['Густой мясной бульон...', 'Нежное мясо тушёное...', 'Сытно и горячо...', 'Классическая армейская тушёнка!', 'Прямое тепло домашнего очага...']
  },

  // === DRINKS (НАПИТКИ) ===
  water_bottle: {
    itemId: 'water_bottle',
    name: 'Mineral Water (0.5L)',
    nameRu: 'Бутылка минеральной воды',
    category: 'drink',
    maxStack: 10,
    icon: '💧',
    description: 'Clean pure spring water. Essential for hydration and survival.',
    descriptionRu: 'Чистая родниковая вода. Главное средство от жажды и обезвоживания.',
    effects: { thirst: 50, health: 5, energy: 10 },
    weight: 0.5,
    usable: true,
    biteCount: 4,
    biteDuration: 0.8,
    leftoverId: 'bottle_empty',
    leftoverNameRu: 'Пустая пластиковая бутылка',
    fullnessPerBite: 3,
    tasteMessages: ['Чистая холодная вода...', 'Освежающий глоток...', 'Здорово утоляет жажду!', 'Прекрасный родниковый вкус...']
  },
  soda_can: {
    itemId: 'soda_can',
    name: 'Cola Soda Can',
    nameRu: 'Баночка Колы',
    category: 'drink',
    maxStack: 12,
    icon: '🥤',
    description: 'Carbonated chilled soda with sweet caramel taste and light caffeine.',
    descriptionRu: 'Освежающая газировка со сладким вкусом и легким тонизирующим эффектом.',
    effects: { thirst: 35, energy: 20, sleepiness: -8 },
    weight: 0.35,
    usable: true,
    biteCount: 4,
    biteDuration: 0.7,
    leftoverId: 'can_empty',
    leftoverNameRu: 'Пустая жестяная банка',
    fullnessPerBite: 2,
    tasteMessages: ['Шипение газировки...', 'Сладкий вкус колы...', 'Холодные пузырьки!', 'Кофейный послевкусие...']
  },
  hot_coffee: {
    itemId: 'hot_coffee',
    name: 'Hot Espresso Coffee',
    nameRu: 'Горячий кофе Эспрессо',
    category: 'drink',
    maxStack: 8,
    icon: '☕',
    description: 'Freshly brewed strong coffee. Dramatically banishes drowsiness and restores stamina.',
    descriptionRu: 'Крепкий свежесваренный кофе. Эффективно снимает сонливость и возвращает бодрость.',
    effects: { thirst: 25, energy: 40, sleepiness: -40 },
    weight: 0.25,
    usable: true,
    biteCount: 3,
    biteDuration: 1.2,
    leftoverId: 'cup_disposable',
    leftoverNameRu: 'Одноразовый стаканчик',
    fullnessPerBite: 2,
    tasteMessages: ['Горьковатый аромат свежего эспрессо...', 'Крепкий кофейный вкус бодрит!', 'Тёплый глоток — и сонливость уходит...']
  },
  energy_drink: {
    itemId: 'energy_drink',
    name: 'Turbo Energy Drink',
    nameRu: 'Энергетик «Турбо-Драйв»',
    category: 'drink',
    maxStack: 10,
    icon: '⚡',
    description: 'High-octane taurine and caffeine booster for maximum alertness.',
    descriptionRu: 'Мощный энергетик с таурином и кофеином для мгновенного снятия усталости.',
    effects: { thirst: 35, energy: 55, sleepiness: -50, health: -2 },
    weight: 0.35,
    usable: true,
    biteCount: 3,
    biteDuration: 0.8,
    leftoverId: 'can_empty',
    leftoverNameRu: 'Пустая жестяная банка',
    fullnessPerBite: 2,
    tasteMessages: ['Химический привкус таурина...', 'Мощный заряд энергии!', 'Кофеин врезает в мозг...']
  },
  fresh_juice: {
    itemId: 'fresh_juice',
    name: 'Fresh Orange Juice',
    nameRu: 'Апельсиновый сок',
    category: 'drink',
    maxStack: 8,
    icon: '🧃',
    description: 'Vitamin C rich citrus juice. Quenches thirst and supports health.',
    descriptionRu: 'Натуральный сок с витамином C. Отлично утоляет жажду и укрепляет здоровье.',
    effects: { thirst: 45, hunger: 15, health: 10, energy: 15 },
    weight: 0.35,
    usable: true,
    biteCount: 3,
    biteDuration: 0.9,
    leftoverId: 'juice_box',
    leftoverNameRu: 'Пустой пакетик от сока',
    fullnessPerBite: 3,
    tasteMessages: ['Свежий апельсиновый вкус!', 'Витамин C — это здорово...', 'Натуральная кислинка освежает...']
  },

  // === MEDICAL (МЕДИЦИНА) ===
  medkit: {
    itemId: 'medkit',
    name: 'First Aid Medical Kit',
    nameRu: 'Большая автомобильная аптечка',
    category: 'med',
    maxStack: 4,
    icon: '🩹',
    description: 'Complete emergency trauma kit with bandages, antiseptic and coagulants.',
    descriptionRu: 'Комплект первой помощи: бинты, антисептик, жгут и обеззараживатель.',
    effects: { health: 65, energy: 20 },
    weight: 0.8,
    usable: true
  },
  bandage: {
    itemId: 'bandage',
    name: 'Sterile Gauze Bandage',
    nameRu: 'Стерильный медицинский бинт',
    category: 'med',
    maxStack: 16,
    icon: '🩹',
    description: 'Quick dressing to patch minor scrapes and car collision cuts.',
    descriptionRu: 'Быстрая повязка для остановки кровотечения и лечения ушибов.',
    effects: { health: 25 },
    weight: 0.1,
    usable: true
  },
  painkillers: {
    itemId: 'painkillers',
    name: 'Painkiller Tablets',
    nameRu: 'Обезболивающие таблетки',
    category: 'med',
    maxStack: 10,
    icon: '💊',
    description: 'Alleviates pain and fatigue, helping restore mobility.',
    descriptionRu: 'Снимают болевой синдром при авариях и восстанавливают выносливость.',
    effects: { health: 15, energy: 30, sleepiness: 10 },
    weight: 0.05,
    usable: true,
    biteCount: 1,
    biteDuration: 0.5,
    leftoverId: 'pill_pack',
    leftoverNameRu: 'Блистер из-под таблеток'
  },
  vitamins: {
    itemId: 'vitamins',
    name: 'Multivitamin Complex',
    nameRu: 'Комплекс витаминов',
    category: 'med',
    maxStack: 10,
    icon: '🧪',
    description: 'Daily essential micronutrients. Improves metabolism and natural healing.',
    descriptionRu: 'Комплекс микроэлементов. Улучшает самочувствие и бодрость.',
    effects: { health: 10, energy: 20, sleepiness: -15 },
    weight: 0.05,
    usable: true
  },
  splint: {
    itemId: 'splint',
    name: 'Medical Splint',
    nameRu: 'Медицинская фиксирующая шина',
    category: 'med',
    maxStack: 6,
    icon: '🪵',
    description: 'Rigid orthopedic splint designed to immobilize and treat bone fractures.',
    descriptionRu: 'Жесткая медицинская шина для фиксации и лечения переломов костей.',
    effects: { health: 10 },
    weight: 0.4,
    usable: true
  },

  // === TOOLS & VALUABLES (ИНСТРУМЕНТЫ И ЦЕННОСТИ) ===
  cash: {
    itemId: 'cash',
    name: 'Banknotes Cash ($)',
    nameRu: 'Наличные деньги ($)',
    category: 'valuable',
    maxStack: 9999,
    icon: '💵',
    description: 'Currency used to buy drinks and snacks from vending machines and city kiosks.',
    descriptionRu: 'Деньги для покупок в торговых автоматах, кафе и уличных ларьках.',
    effects: {},
    weight: 0.0,
    usable: false
  },
  repair_kit: {
    itemId: 'repair_kit',
    name: 'Vehicle Repair Toolbox',
    nameRu: 'Набор автоинструментов',
    category: 'tool',
    maxStack: 2,
    icon: '🔧',
    description: 'Wrench and auto parts kit to repair engine damage and body crumple.',
    descriptionRu: 'Набор ключей и запчастей для полевого ремонта кузова и двигателя авто.',
    effects: {},
    weight: 2.5,
    usable: true
  },
  flashlight: {
    itemId: 'flashlight',
    name: 'LED Flashlight',
    nameRu: 'Тактический LED-фонарик',
    category: 'tool',
    maxStack: 1,
    icon: '🔦',
    description: 'Handheld bright flashlight for navigating dark alleyways and buildings at night.',
    descriptionRu: 'Яркий ручной фонарь для темных улиц, переулков и подъездов ночью.',
    effects: {},
    weight: 0.3,
    usable: true
  },
  antiseptic: {
    itemId: 'antiseptic',
    name: 'Wound Antiseptic',
    nameRu: 'Антисептик для ран',
    category: 'med',
    maxStack: 12,
    icon: '🧴',
    description: 'Disinfects deep cuts and scrapes to prevent infection.',
    descriptionRu: 'Обеззараживает глубокие царапины и предотвращает инфекцию.',
    effects: { health: 15 },
    weight: 0.1,
    usable: true
  },
  motor_oil: {
    itemId: 'motor_oil',
    name: 'Motor Oil Canister',
    nameRu: 'Канистра моторного масла',
    category: 'tool',
    maxStack: 4,
    icon: '🛢️',
    description: 'High-grade synthetic engine oil for engine protection and smooth operation.',
    descriptionRu: 'Высококачественное синтетическое масло для защиты двигателя.',
    effects: {},
    weight: 1.2,
    usable: true
  },
  car_battery: {
    itemId: 'car_battery',
    name: 'Spare Car Battery',
    nameRu: 'Запасной аккумулятор',
    category: 'tool',
    maxStack: 2,
    icon: '🔋',
    description: 'Heavy duty lead-acid battery to power vehicle electronics.',
    descriptionRu: 'Надежный свинцово-кислотный аккумулятор для бортовой сети авто.',
    effects: {},
    weight: 12.0,
    usable: true
  },
  extinguisher: {
    itemId: 'extinguisher',
    name: 'Car Fire Extinguisher',
    nameRu: 'Автоогнетушитель',
    category: 'tool',
    maxStack: 2,
    icon: '🧯',
    description: 'Compact dry chemical fire extinguisher for emergency safety.',
    descriptionRu: 'Компактный порошковый огнетушитель для экстренных ситуаций.',
    effects: {},
    weight: 2.0,
    usable: true
  },
  cappuccino: {
    itemId: 'cappuccino',
    name: 'Creamy Cappuccino',
    nameRu: 'Сливочный Капучино',
    category: 'drink',
    maxStack: 8,
    icon: '☕',
    description: 'Delicious coffee with whipped cream. Warms up and restores stamina.',
    descriptionRu: 'Вкусный кофейный напиток со сливочной пенкой. Согревает и бодрит.',
    effects: { thirst: 30, energy: 30, sleepiness: -25 },
    weight: 0.3,
    usable: true,
    biteCount: 3,
    biteDuration: 1.1,
    leftoverId: 'cup_disposable',
    leftoverNameRu: 'Одноразовый стаканчик',
    fullnessPerBite: 2,
    tasteMessages: ['Нежная сливочная пенка...', 'Мягкий кофейный вкус...', 'Идеальное утреннее тепло...']
  },
  croissant: {
    itemId: 'croissant',
    name: 'Butter Croissant',
    nameRu: 'Свежий круассан',
    category: 'food',
    maxStack: 15,
    icon: '🥐',
    description: 'Crispy and buttery French pastry.',
    descriptionRu: 'Хрустящая французская выпечка из слоеного теста.',
    effects: { hunger: 25, energy: 10 },
    weight: 0.1,
    usable: true,
    biteCount: 3,
    biteDuration: 0.8,
    leftoverId: 'sandwich_bag',
    leftoverNameRu: 'Пакет от выпечки',
    fullnessPerBite: 6,
    tasteMessages: ['Хрустящее слоёное тесто...', 'Масляный аромат...', 'Нежная начинка!']
  },
  soup: {
    itemId: 'soup',
    name: 'Hot Chicken Soup',
    nameRu: 'Горячий куриный бульон',
    category: 'food',
    maxStack: 6,
    icon: '🥣',
    description: 'Warming and highly nutritious soup.',
    descriptionRu: 'Питательный домашний суп. Отлично согревает.',
    effects: { hunger: 45, thirst: 15, health: 10, energy: 15 },
    weight: 0.4,
    usable: true,
    biteCount: 4,
    biteDuration: 1.3,
    leftoverId: 'pizza_plate',
    leftoverNameRu: 'Пустая тарелка',
    fullnessPerBite: 9,
    tasteMessages: ['Горячий куриный бульон согревает...', 'Нежное куриное мясо...', 'Аромат домашнего супа...', 'Каждый глоток — как утешение...']
  },

  // === LEFTOVERS (ОСТАТКИ ПОСЛЕ ЕДЫ) ===
  apple_core: {
    itemId: 'apple_core',
    name: 'Apple Core',
    nameRu: 'Огрызок яблока',
    category: 'misc',
    maxStack: 20,
    icon: '🍎',
    description: 'Brown oxidized apple core. Throw in trash.',
    descriptionRu: 'Бурый окислившийся огрызок. Выбросьте в урну.',
    effects: {},
    weight: 0.02,
    usable: false
  },
  burger_wrapper: {
    itemId: 'burger_wrapper',
    name: 'Burger Wrapper',
    nameRu: 'Обёртка от бургера',
    category: 'misc',
    maxStack: 20,
    icon: '🍔',
    description: 'Greasy paper wrapper from a cheeseburger.',
    descriptionRu: 'Жирная бумажная обёртка от чизбургера.',
    effects: {},
    weight: 0.01,
    usable: false
  },
  pizza_plate: {
    itemId: 'pizza_plate',
    name: 'Paper Plate',
    nameRu: 'Бумажная тарелка',
    category: 'misc',
    maxStack: 20,
    icon: '🍽️',
    description: 'Greasy paper plate with pizza crumbs.',
    descriptionRu: 'Жирная бумажная тарелка с крошками пиццы.',
    effects: {},
    weight: 0.02,
    usable: false
  },
  sandwich_bag: {
    itemId: 'sandwich_bag',
    name: 'Sandwich Bag',
    nameRu: 'Пакет от сэндвича',
    category: 'misc',
    maxStack: 20,
    icon: '🥪',
    description: 'Empty plastic sandwich bag.',
    descriptionRu: 'Пустой пластиковый пакет из-под сэндвича.',
    effects: {},
    weight: 0.005,
    usable: false
  },
  chocolate_wrapper: {
    itemId: 'chocolate_wrapper',
    name: 'Chocolate Foil',
    nameRu: 'Фольга от шоколада',
    category: 'misc',
    maxStack: 20,
    icon: '🍫',
    description: 'Torn foil wrapper from a chocolate bar.',
    descriptionRu: 'Рваная фольга от шоколадного батончика.',
    effects: {},
    weight: 0.005,
    usable: false
  },
  chips_bag: {
    itemId: 'chips_bag',
    name: 'Empty Chips Bag',
    nameRu: 'Пустой пакет от чипсов',
    category: 'misc',
    maxStack: 20,
    icon: '🥔',
    description: 'Crinkled empty potato chips bag.',
    descriptionRu: 'Мятый пустой пакет от картофельных чипсов.',
    effects: {},
    weight: 0.005,
    usable: false
  },
  can_empty: {
    itemId: 'can_empty',
    name: 'Empty Can',
    nameRu: 'Пустая жестяная банка',
    category: 'misc',
    maxStack: 20,
    icon: '🥫',
    description: 'Empty crushed tin can.',
    descriptionRu: 'Пустая сплющенная жестяная банка.',
    effects: {},
    weight: 0.03,
    usable: false
  },
  bottle_empty: {
    itemId: 'bottle_empty',
    name: 'Empty Bottle',
    nameRu: 'Пустая пластиковая бутылка',
    category: 'misc',
    maxStack: 20,
    icon: '💧',
    description: 'Empty clear plastic water bottle.',
    descriptionRu: 'Пустая прозрачная пластиковая бутылка.',
    effects: {},
    weight: 0.015,
    usable: false
  },
  cup_disposable: {
    itemId: 'cup_disposable',
    name: 'Disposable Cup',
    nameRu: 'Одноразовый стаканчик',
    category: 'misc',
    maxStack: 20,
    icon: '☕',
    description: 'Empty paper coffee cup.',
    descriptionRu: 'Пустой бумажный стаканчик из-под кофе.',
    effects: {},
    weight: 0.01,
    usable: false
  },
  juice_box: {
    itemId: 'juice_box',
    name: 'Empty Juice Box',
    nameRu: 'Пустой пакетик от сока',
    category: 'misc',
    maxStack: 20,
    icon: '🧃',
    description: 'Empty tetra pak juice container.',
    descriptionRu: 'Пустой тетрапак от апельсинового сока.',
    effects: {},
    weight: 0.01,
    usable: false
  },
  pill_pack: {
    itemId: 'pill_pack',
    name: 'Blister Pack',
    nameRu: 'Блистер из-под таблеток',
    category: 'misc',
    maxStack: 20,
    icon: '💊',
    description: 'Empty medicine blister pack.',
    descriptionRu: 'Пустой блистер из-под лекарства.',
    effects: {},
    weight: 0.005,
    usable: false
  },

  pocket_knife: {
    itemId: 'pocket_knife',
    name: 'Folding Pocket Knife',
    nameRu: 'Туристический нож',
    category: 'tool',
    maxStack: 2,
    icon: '🔪',
    description: 'Stainless steel folding utility knife.',
    descriptionRu: 'Складной нож из нержавеющей стали для хозяйственных нужд.',
    effects: {},
    weight: 0.2,
    usable: false
  },
  thermal_coat: {
    itemId: 'thermal_coat',
    name: 'Thermal Coat',
    nameRu: 'Термокуртка "Arctix"',
    category: 'misc',
    maxStack: 1,
    icon: '🧥',
    description: 'Heavy duty windproof and insulated coat to keep you warm.',
    descriptionRu: 'Плотная ветрозащитная куртка с утеплителем для защиты от холода.',
    effects: {},
    weight: 1.5,
    usable: false
  },
  duct_tape: {
    itemId: 'duct_tape',
    name: 'Heavy Duty Duct Tape',
    nameRu: 'Армированный скотч',
    category: 'tool',
    maxStack: 10,
    icon: '🩹',
    description: 'Strong reinforced adhesive tape for quick fixes.',
    descriptionRu: 'Прочный армированный скотч для быстрого ремонта подручных вещей.',
    effects: {},
    weight: 0.15,
    usable: true
  },
  litter_trash: {
    itemId: 'litter_trash',
    name: 'Recyclable Street Litter',
    nameRu: 'Уличный мусор (Вторсырье)',
    category: 'misc',
    maxStack: 20,
    icon: '🗑️',
    description: 'Empty bottles, tin cans or crumpled paper gathered from city sidewalks. Throw into dumpster for cash reward.',
    descriptionRu: 'Смятые жестянные банки, пластик и бумаги с уличных тротуаров. Выбросьте в урну или контейнер за вознаграждение.',
    effects: {},
    weight: 0.1,
    usable: false
  }
};

let itemCounter = 100;

export function createItem(itemId: string, count: number = 1): InventoryItem {
  const def = ITEM_CATALOG[itemId] || ITEM_CATALOG.water_bottle;
  itemCounter++;
  return {
    id: `item_${itemId}_${Date.now()}_${itemCounter}`,
    itemId: def.itemId,
    name: def.name,
    nameRu: def.nameRu,
    category: def.category,
    count: Math.min(count, def.maxStack),
    maxStack: def.maxStack,
    icon: def.icon,
    description: def.description,
    descriptionRu: def.descriptionRu,
    effects: { ...def.effects },
    weight: def.weight,
    usable: def.usable
  };
}

// Start multi-step consumption (eating/drinking)
export function startConsumption(
  player: Player,
  itemIndex: number
): { success: boolean; message: string } {
  if (!player.inventory || itemIndex < 0 || itemIndex >= player.inventory.length) {
    return { success: false, message: 'Предмет не найден' };
  }

  const item = player.inventory[itemIndex];
  if (!item.usable) {
    return { success: false, message: 'Этот предмет нельзя использовать' };
  }

  // Already consuming something
  if (player.consumption && player.consumption.isConsuming) {
    return { success: false, message: 'Вы уже吃什么喝什么! Подождите...' };
  }

  // Too full - nausea blocks eating
  if ((player.needs.fullness || 0) >= 95) {
    addPlayerNotification(player, 'Вы слишком сыты! Подождите, пока переварится...', 'warning');
    return { success: false, message: 'Слишком сытно' };
  }

  // Too nauseous - can't eat
  if ((player.needs.nausea || 0) >= 60) {
    addPlayerNotification(player, 'Вас тошнит! Нельзя есть.', 'warning');
    return { success: false, message: 'Тошнит' };
  }

  // Non-food/non-med special items use instant mode
  if (item.itemId === 'repair_kit' || item.itemId === 'flashlight' || item.category === 'tool') {
    return useItemOnPlayer(player, itemIndex);
  }

  // Medical items are instant
  if (item.category === 'med') {
    return useItemOnPlayer(player, itemIndex);
  }

  const def = ITEM_CATALOG[item.itemId];
  if (!def || !def.biteCount) {
    // Fallback: instant consumption for items without biteCount
    return useItemOnPlayer(player, itemIndex);
  }

  // Check fullness per bite would overfill
  const fullnessGain = def.fullnessPerBite || 5;
  if ((player.needs.fullness || 0) + fullnessGain > 100) {
    addPlayerNotification(player, 'Стоп! Слишком много. Вы почувствовали тяжесть...', 'warning');
    player.needs.nausea = Math.min(100, (player.needs.nausea || 0) + 15);
    return { success: false, message: 'Слишком сытно для этого' };
  }

  // Start consumption
  const effectsPerBite = {
    hunger: def.effects.hunger ? Math.round(def.effects.hunger / def.biteCount) : 0,
    thirst: def.effects.thirst ? Math.round(def.effects.thirst / def.biteCount) : 0,
    health: def.effects.health ? Math.round(def.effects.health / def.biteCount) : 0,
    energy: def.effects.energy ? Math.round(def.effects.energy / def.biteCount) : 0,
    sleepiness: def.effects.sleepiness ? Math.round(def.effects.sleepiness / def.biteCount) : 0,
  };

  player.consumption = {
    isConsuming: true,
    itemId: item.itemId,
    itemNameRu: item.nameRu,
    category: item.category as 'food' | 'drink',
    totalBites: def.biteCount,
    bitesRemaining: def.biteCount,
    currentBiteTimer: 0,
    biteDuration: def.biteDuration || 1.0,
    effectsPerBite,
    leftoverId: def.leftoverId,
    leftoverNameRu: def.leftoverNameRu,
    tasteMessage: def.tasteMessages ? def.tasteMessages[Math.floor(Math.random() * def.tasteMessages.length)] : undefined,
    fullnessPerBite: fullnessGain,
  };

  const firstTaste = def.tasteMessages ? def.tasteMessages[0] : 'Едите...';
  addPlayerNotification(player, `${def.category === 'food' ? '🍽️' : '🥤'} ${firstTaste}`, 'food');
  return { success: true, message: 'Начали есть' };
}

// Called each frame to advance consumption
export function updateConsumption(player: Player, dt: number): void {
  if (!player.consumption || !player.consumption.isConsuming) return;

  const c = player.consumption;
  c.currentBiteTimer += dt;

  if (c.currentBiteTimer >= c.biteDuration) {
    // Bite completed
    c.currentBiteTimer = 0;
    c.bitesRemaining--;

    // Apply effects per bite
    if (c.effectsPerBite.hunger) {
      player.needs.hunger = Math.min(100, Math.max(0, player.needs.hunger + c.effectsPerBite.hunger));
    }
    if (c.effectsPerBite.thirst) {
      player.needs.thirst = Math.min(100, Math.max(0, player.needs.thirst + c.effectsPerBite.thirst));
      if (player.bodyState) {
        player.bodyState.hydration = Math.min(100, player.bodyState.hydration + c.effectsPerBite.thirst);
      }
    }
    if (c.effectsPerBite.health) {
      player.needs.health = Math.min(100, Math.max(0, player.needs.health + c.effectsPerBite.health));
    }
    if (c.effectsPerBite.energy) {
      player.needs.energy = Math.min(100, Math.max(0, player.needs.energy + c.effectsPerBite.energy));
    }
    if (c.effectsPerBite.sleepiness) {
      player.needs.sleepiness = Math.min(100, Math.max(0, player.needs.sleepiness + c.effectsPerBite.sleepiness));
    }

    // Increase fullness
    if (c.fullnessPerBite) {
      player.needs.fullness = Math.min(100, (player.needs.fullness || 0) + c.fullnessPerBite);
    }

    // Nausea from eating too much
    if ((player.needs.fullness || 0) > 85) {
      player.needs.nausea = Math.min(100, (player.needs.nausea || 0) + 5);
    }

    // Pick next taste message
    if (c.bitesRemaining > 0) {
      const def = ITEM_CATALOG[c.itemId];
      if (def && def.tasteMessages && def.tasteMessages.length > 0) {
        c.tasteMessage = def.tasteMessages[Math.floor(Math.random() * def.tasteMessages.length)];
      }
      addPlayerNotification(player, `${c.tasteMessage || '...'} (${c.bitesRemaining} укусов осталось)`, 'food');
    }

    // Finished?
    if (c.bitesRemaining <= 0) {
      finishConsumption(player);
    }
  }
}

// Finish consumption: remove item, spawn leftover
function finishConsumption(player: Player): void {
  const c = player.consumption;
  if (!c) return;

  // Find the item in inventory and remove 1
  const itemIdx = player.inventory.findIndex(i => i.itemId === c.itemId);
  if (itemIdx >= 0) {
    removeItemFromPlayer(player, itemIdx, 1);
  }

  // Spawn leftover if exists
  if (c.leftoverId) {
    const leftover = createItem(c.leftoverId, 1);
    addItemToPlayer(player, leftover);
    addPlayerNotification(player, `Осталось: ${c.leftoverNameRu || leftover.nameRu}`, 'info');
  }

  // Show satiety feedback
  const fullness = player.needs.fullness || 0;
  if (fullness > 90) {
    addPlayerNotification(player, '🤢 Вы очень сыты! Больше есть не стоит...', 'warning');
  } else if (fullness > 70) {
    addPlayerNotification(player, '😊 Вы сыты.', 'food');
  } else if (fullness > 40) {
    addPlayerNotification(player, '👍 Голод утолён.', 'food');
  }

  // Play sound
  if (c.category === 'food') {
    sound.playEat();
  } else {
    sound.playDrink();
  }

  player.consumption = null;
}

// Cancel ongoing consumption (player pressed wrong key or moved)
export function cancelConsumption(player: Player): void {
  if (!player.consumption || !player.consumption.isConsuming) return;

  const c = player.consumption;
  const bitesEaten = c.totalBites - c.bitesRemaining;

  // If they ate at least 1 bite, still give partial effects and leftover
  if (bitesEaten > 0 && c.leftoverId) {
    const leftover = createItem(c.leftoverId, 1);
    addItemToPlayer(player, leftover);
    addPlayerNotification(player, `Остановились. Осталось: ${c.leftoverNameRu || leftover.nameRu}`, 'info');
  }

  // Remove the partially eaten item
  const itemIdx = player.inventory.findIndex(i => i.itemId === c.itemId);
  if (itemIdx >= 0) {
    removeItemFromPlayer(player, itemIdx, 1);
  }

  addPlayerNotification(player, 'Прекратили есть.', 'info');
  player.consumption = null;
}

export function getPlayerCash(player: Player | null): number {
  if (!player || !player.inventory) return 0;
  return player.inventory
    .filter(i => i.itemId === 'cash')
    .reduce((sum, i) => sum + i.count, 0);
}

export function deductPlayerCash(player: Player | null, amount: number): boolean {
  if (!player || !player.inventory) return false;
  const currentCash = getPlayerCash(player);
  if (currentCash < amount) return false;

  let remaining = amount;
  for (let i = player.inventory.length - 1; i >= 0; i--) {
    if (player.inventory[i].itemId === 'cash') {
      if (player.inventory[i].count <= remaining) {
        remaining -= player.inventory[i].count;
        player.inventory.splice(i, 1);
      } else {
        player.inventory[i].count -= remaining;
        remaining = 0;
      }
      if (remaining <= 0) break;
    }
  }
  return true;
}

export function addPlayerCash(player: Player | null, amount: number): boolean {
  if (!player) return false;
  const cashItem = createItem('cash', amount);
  return addItemToPlayer(player, cashItem);
}

export function createDefaultPlayerInventory(): InventoryItem[] {
  return [
    createItem('water_bottle', 2),
    createItem('sandwich', 2),
    createItem('hot_coffee', 1),
    createItem('medkit', 1),
    createItem('splint', 1),
    createItem('chocolate', 2),
    createItem('cash', 150)
  ];
}

export function addItemToPlayer(player: Player, itemToAdd: InventoryItem): boolean {
  if (!player.inventory) {
    player.inventory = [];
  }

  // 1. Try to stack onto existing item of same itemId
  const existing = player.inventory.find(i => i.itemId === itemToAdd.itemId && i.count < i.maxStack);
  if (existing) {
    const space = existing.maxStack - existing.count;
    const addCount = Math.min(space, itemToAdd.count);
    existing.count += addCount;
    itemToAdd.count -= addCount;
    if (itemToAdd.count <= 0) {
      addPlayerNotification(player, `+${addCount} ${itemToAdd.nameRu}`, 'pickup');
      return true;
    }
  }

  // 2. Add as new inventory slot if space permits
  const maxSlots = player.maxInventorySlots || 18;
  if (player.inventory.length < maxSlots) {
    player.inventory.push(itemToAdd);
    addPlayerNotification(player, `Подобрано: ${itemToAdd.nameRu} (x${itemToAdd.count})`, 'pickup');
    return true;
  }

  addPlayerNotification(player, 'Инвентарь полон!', 'warning');
  return false;
}

export function removeItemFromPlayer(player: Player, itemIndex: number, count: number = 1): InventoryItem | null {
  if (!player.inventory || itemIndex < 0 || itemIndex >= player.inventory.length) {
    return null;
  }
  const item = player.inventory[itemIndex];
  if (item.count <= count) {
    player.inventory.splice(itemIndex, 1);
    return item;
  } else {
    item.count -= count;
    return { ...item, count };
  }
}

export function useItemOnPlayer(
  player: Player,
  itemIndex: number,
  world?: GameWorld,
  targetInjuryId?: string
): { success: boolean; message: string } {
  if (!player.inventory || itemIndex < 0 || itemIndex >= player.inventory.length) {
    return { success: false, message: 'Предмет не найден' };
  }

  const item = player.inventory[itemIndex];
  if (!item.usable) {
    return { success: false, message: 'Этот предмет нельзя использовать напрямую' };
  }

  // Food and drinks now use multi-step consumption
  if ((item.category === 'food' || item.category === 'drink') && ITEM_CATALOG[item.itemId]?.biteCount) {
    return startConsumption(player, itemIndex);
  }

  // Special repair tool usage
  if (item.itemId === 'repair_kit') {
    if (player.isInVehicle && player.currentVehicleId && world) {
      const veh = world.vehicles.find(v => v.id === player.currentVehicleId);
      if (veh && veh.damage) {
        veh.damage.health = 100;
        veh.damage.engineSmoking = false;
        veh.damage.engineFire = false;
        veh.damage.frontCrumple = 0;
        veh.damage.rearCrumple = 0;
        veh.damage.leftDent = 0;
        veh.damage.rightDent = 0;
        veh.damage.windshieldCracked = false;
        veh.damage.hoodBuckled = false;
        removeItemFromPlayer(player, itemIndex, 1);
        sound.playPropBreak('hydrant');
        addPlayerNotification(player, '🔧 Автомобиль полностью отремонтирован!', 'heal');
        return { success: true, message: 'Автомобиль отремонтирован' };
      }
    } else {
      addPlayerNotification(player, 'Сядьте в поврежденный автомобиль для ремонта!', 'warning');
      return { success: false, message: 'Нужно быть в авто' };
    }
  }

  // Flashlight toggle
  if (item.itemId === 'flashlight') {
    player.heldItemId = player.heldItemId === 'flashlight' ? null : 'flashlight';
    sound.playAlert();
    addPlayerNotification(player, player.heldItemId ? '🔦 Фонарик включен' : '🔦 Фонарик выключен', 'info');
    return { success: true, message: 'Фонарик переключен' };
  }

  const fx = item.effects;
  let appliedSomething = false;

  // Apply Health
  if (fx.health) {
    player.needs.health = Math.min(100, Math.max(0, player.needs.health + fx.health));
    appliedSomething = true;
  }

  // Apply Hunger
  if (fx.hunger) {
    player.needs.hunger = Math.min(100, Math.max(0, player.needs.hunger + fx.hunger));
    appliedSomething = true;
  }

  // Apply Thirst
  if (fx.thirst) {
    player.needs.thirst = Math.min(100, Math.max(0, player.needs.thirst + fx.thirst));
    if (player.bodyState) {
      player.bodyState.hydration = Math.min(100, player.bodyState.hydration + fx.thirst);
    }
    appliedSomething = true;
  }

  // Body State medical treatment
  if (player.bodyState && item.category === 'med') {
    const parts = player.bodyState.bodyParts;
    if (item.itemId === 'bandage') {
      // Bandage stops bleeding, treats bruises, abrasions
      let treated = false;
      for (const k in parts) {
        const key = k as keyof typeof parts;
        const part = parts[key] as any[]; // Injury[]
        const injuryToTreat = targetInjuryId 
          ? part.find(i => i.id === targetInjuryId && !i.treated && (i.type === 'bleeding' || i.type === 'bruise' || i.type === 'abrasion'))
          : part.find(i => !i.treated && (i.type === 'bleeding' || i.type === 'bruise' || i.type === 'abrasion'));
        
        if (injuryToTreat) {
          injuryToTreat.treated = true;
          treated = true;
          addPlayerNotification(player, `🩹 Обработана рана (${injuryToTreat.type})`, 'heal');
          break;
        }
      }
      if (!treated) {
        if (targetInjuryId) return { success: false, message: 'Этот бинт нельзя применить к этой травме' };
        addPlayerNotification(player, 'Нет кровотечений или ушибов для бинта (Откройте меню осмотра для точного применения)', 'info');
      }
    } else if (item.itemId === 'splint') {
      // Splint immobilizes bone fractures
      let fixed = false;
      for (const k in parts) {
        const key = k as keyof typeof parts;
        const part = parts[key] as any[];
        const fractureToFix = targetInjuryId
          ? part.find(i => i.id === targetInjuryId && !i.treated && i.type === 'fracture')
          : part.find(i => !i.treated && i.type === 'fracture');
          
        if (fractureToFix) {
          fractureToFix.treated = true;
          fixed = true;
          addPlayerNotification(player, '🪵 Шина наложена, перелом зафиксирован', 'heal');
          break;
        }
      }
      if (!fixed) {
        if (targetInjuryId) return { success: false, message: 'Шину можно наложить только на свежий перелом' };
        addPlayerNotification(player, 'Нет переломов, требующих шины', 'info');
      }
    } else if (item.itemId === 'medkit') {
      // Medkit restores health and stabilizes injuries (stops bleeding, treats bruises)
      player.needs.health = Math.min(100, player.needs.health + 45);
      for (const k in parts) {
        const key = k as keyof typeof parts;
        const part = parts[key] as any[];
        part.forEach(injury => {
          if (injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'abrasion' || injury.type === 'sprain') {
            injury.treated = true;
          }
        });
      }
      player.bodyState.temperature = 36.6;
      player.bodyState.wetness = Math.max(0, player.bodyState.wetness - 30);
      addPlayerNotification(player, '🧰 Аптечка применена: здоровье восстановлено, раны обработаны', 'heal');
    } else if (item.itemId === 'painkillers') {
      // Painkillers temporarily suppress pain
      player.bodyState.painLevel = Math.max(0, player.bodyState.painLevel - 50);
      addPlayerNotification(player, '💊 Обезболивающее принято, боль утихла', 'info');
    }
  }

  // Apply Energy
  if (fx.energy) {
    player.needs.energy = Math.min(100, Math.max(0, player.needs.energy + fx.energy));
    appliedSomething = true;
  }

  // Apply Sleepiness
  if (fx.sleepiness) {
    player.needs.sleepiness = Math.min(100, Math.max(0, player.needs.sleepiness + fx.sleepiness));
    appliedSomething = true;
  }

  // Play appropriate procedural sound
  if (item.category === 'food') {
    sound.playEat();
    addPlayerNotification(player, `Съедено: ${item.nameRu} (+${fx.hunger || 0}% сытости)`, 'food');
  } else if (item.category === 'drink') {
    sound.playDrink();
    addPlayerNotification(player, `Выпито: ${item.nameRu} (+${fx.thirst || 0}% жажды)`, 'drink');
  } else if (item.category === 'med') {
    sound.playUseItem();
    addPlayerNotification(player, `Использовано: ${item.nameRu} (+${fx.health || 0} HP)`, 'heal');
  }

  // Consume 1 item from stack
  removeItemFromPlayer(player, itemIndex, 1);

  return { success: true, message: `Использовано: ${item.nameRu}` };
}

export function dropItemFromPlayer(
  player: Player,
  itemIndex: number,
  world: GameWorld,
  count: number = 1
): boolean {
  if (!player.inventory || itemIndex < 0 || itemIndex >= player.inventory.length) return false;
  
  const removed = removeItemFromPlayer(player, itemIndex, count);
  if (!removed) return false;

  if (!world.groundItems) {
    world.groundItems = [];
  }

  // Spawn slightly in front of player
  const angle = player.angle || 0;
  const gx = player.x + Math.cos(angle) * 22;
  const gy = player.y + Math.sin(angle) * 22;

  world.groundItems.push({
    id: `ground_${removed.id}_${Date.now()}`,
    x: gx,
    y: gy,
    item: removed,
    spawnTime: Date.now()
  });

  sound.playPickup();
  addPlayerNotification(player, `Выброшено: ${removed.nameRu}`, 'info');
  return true;
}

export function pickupGroundItem(
  player: Player,
  world: GameWorld,
  groundItem: GroundItem
): boolean {
  if (!world.groundItems) return false;
  const idx = world.groundItems.findIndex(gi => gi.id === groundItem.id);
  if (idx === -1) return false;

  const added = addItemToPlayer(player, groundItem.item);
  if (added) {
    world.groundItems.splice(idx, 1);
    sound.playPickup();
    return true;
  }
  return false;
}

export function seedInitialGroundItems(world: GameWorld) {
  if (!world.groundItems || world.groundItems.length === 0) {
    world.groundItems = [
      {
        id: 'ground_seed_1',
        x: 4420,
        y: 2790,
        item: createItem('water_bottle', 2),
        spawnTime: Date.now()
      },
      {
        id: 'ground_seed_2',
        x: 4450,
        y: 2820,
        item: createItem('apple', 3),
        spawnTime: Date.now()
      },
      {
        id: 'ground_seed_3',
        x: 4380,
        y: 2830,
        item: createItem('energy_drink', 1),
        spawnTime: Date.now()
      },
      {
        id: 'ground_seed_4',
        x: 4350,
        y: 2010,
        item: createItem('burger', 1),
        spawnTime: Date.now()
      },
      {
        id: 'ground_seed_5',
        x: 2770,
        y: 2760,
        item: createItem('bandage', 2),
        spawnTime: Date.now()
      },
      {
        id: 'ground_seed_6',
        x: 5220,
        y: 4410,
        item: createItem('repair_kit', 1),
        spawnTime: Date.now()
      }
    ];
  }
}

export function addPlayerNotification(
  player: Player,
  text: string,
  type: 'heal' | 'food' | 'drink' | 'energy' | 'sleep' | 'warning' | 'pickup' | 'info' = 'info'
) {
  if (!player.notifications) {
    player.notifications = [];
  }
  player.notifications.push({
    id: `notif_${Date.now()}_${Math.random()}`,
    text,
    type,
    timer: 3.2 // Display for 3.2 seconds
  });

  // Cap at 4 simultaneous notifications
  if (player.notifications.length > 4) {
    player.notifications.shift();
  }
}

export function isPlayerNearTrashBin(player: Player, world: GameWorld): boolean {
  if (!world.props) return false;
  for (const prop of world.props) {
    if (prop.type === 'trash_can' || prop.type === 'dumpster') {
      const dist = Math.hypot(player.x - prop.x, player.y - prop.y);
      if (dist < 50) {
        return true;
      }
    }
  }
  return false;
}

export function isPlayerNearEcoVending(player: Player, world: GameWorld): boolean {
  if (!world.props) return false;
  for (const prop of world.props) {
    if (prop.type === 'dumpster') {
      const dist = Math.hypot(player.x - prop.x, player.y - prop.y);
      if (dist < 55) {
        return true;
      }
    }
  }
  return false;
}

export function pickupNearbyLitter(player: Player, world: GameWorld): boolean {
  if (!world.litter || world.litter.length === 0) return false;

  let closestIdx = -1;
  let minDist = 45;
  for (let i = 0; i < world.litter.length; i++) {
    const lit = world.litter[i];
    const dist = Math.hypot(player.x - lit.x, player.y - lit.y);
    if (dist < minDist && !lit.isAirborne) {
      minDist = dist;
      closestIdx = i;
    }
  }

  if (closestIdx !== -1) {
    const removedLit = world.litter.splice(closestIdx, 1)[0];
    const trashItem = createItem('litter_trash', 1);
    const added = addItemToPlayer(player, trashItem);
    if (added) {
      sound.playPickup();
      addPlayerNotification(player, 'Подобран уличный мусор (Вторсырье)', 'pickup');
      return true;
    }
  }
  return false;
}

export function disposeTrashInBin(player: Player, world: GameWorld, targetItemIdx?: number): boolean {
  if (!isPlayerNearTrashBin(player, world)) {
    addPlayerNotification(player, 'Подойдите ближе к урне или мусорному контейнеру!', 'warning');
    return false;
  }

  const isEco = isPlayerNearEcoVending(player, world);

  if (!player.inventory || player.inventory.length === 0) {
    addPlayerNotification(player, 'В инвентаре нет предметов для утилизации', 'info');
    return false;
  }

  // If specific item index provided
  if (targetItemIdx !== undefined && targetItemIdx >= 0 && targetItemIdx < player.inventory.length) {
    const item = player.inventory[targetItemIdx];
    const count = item.count;
    const isLitter = item.itemId === 'litter_trash';
    const cashReward = (isEco && isLitter) ? count * 5 : 0;

    removeItemFromPlayer(player, targetItemIdx, count);

    if (cashReward > 0) {
      const cashItem = createItem('cash', cashReward);
      addItemToPlayer(player, cashItem);
      sound.playPickup();
      addPlayerNotification(player, `Тара сдана в эко-фантомат! Возврат: +$${cashReward}`, 'heal');
    } else {
      sound.playUseItem();
      addPlayerNotification(player, 'Предмет выброшен в урну', 'info');
    }
    return true;
  }

  // Otherwise dispose all litter_trash automatically
  let totalReward = 0;
  let discardedCount = 0;
  for (let i = player.inventory.length - 1; i >= 0; i--) {
    if (player.inventory[i].itemId === 'litter_trash') {
      const count = player.inventory[i].count;
      removeItemFromPlayer(player, i, count);
      if (isEco) {
        totalReward += count * 5;
      } else {
        discardedCount += count;
      }
    }
  }

  if (totalReward > 0) {
    const cashItem = createItem('cash', totalReward);
    addItemToPlayer(player, cashItem);
    sound.playPickup();
    addPlayerNotification(player, `Вторсырье сдано в эко-фантомат! Возврат: +$${totalReward}`, 'heal');
    return true;
  } else if (discardedCount > 0) {
    sound.playUseItem();
    addPlayerNotification(player, `Мусор (${discardedCount} шт.) выброшен в урну`, 'info');
    return true;
  } else {
    addPlayerNotification(player, 'В инвентаре нет предметов для утилизации', 'info');
    return false;
  }
}


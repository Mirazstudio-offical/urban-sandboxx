import { GameWorld, GroundItem, InventoryItem, ItemCategory, Player } from './types';
import { sound } from './audio';
import {
  administerMedication,
  applySplint,
  applyBandage,
  applyMedkit,
  applyMedicalPatch,
  applyAntiseptic,
  applyPanthenolSpray,
  applySpasatelOintment,
  applyZelenka,
  applyIodine,
  applyDiclofenacGel,
  applyHydrogenPeroxide,
  applyAmmoniaSpirit,
  applyBalmStar,
  applyActivatedCharcoal,
  applyValerianDrops
} from './medicineSystem';
import { soothePanic } from './bodySystem';

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
    biteCount: 8,
    biteDuration: 1.0,
    leftoverId: 'sandwich_bag',
    leftoverNameRu: 'Пакет от сэндвича',
    fullnessPerBite: 4,
    tasteMessages: ['Хрустящий тост с ветчиной...', 'Сыр тает на языке...', 'Свежий хруст салата...', 'Копченая ветчина — классика!', 'Приятный хрустящий кусочек...', 'Сливочный соус и зелень...', 'Вкусно и сытно...', 'Последний сытный кусочек сэндвича!']
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
    biteCount: 10,
    biteDuration: 1.0,
    leftoverId: 'burger_wrapper',
    leftoverNameRu: 'Обёртка от бургера',
    fullnessPerBite: 5,
    tasteMessages: ['Сочный укус котлеты с гриля...', 'Плавленый сыр чеддер...', 'Хрустящий маринованный огурчик...', 'Свежий томат оттеняет мясо...', 'Ароматная булочка с кунжутом...', 'Пряный фирменный соус...', 'Мясистый сытный укус...', 'Сок течет по пальцам...', 'Насыщенный вкус говядины...', 'Финальный сытный укус бургера!']
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
    biteCount: 6,
    biteDuration: 0.9,
    leftoverId: 'pizza_plate',
    leftoverNameRu: 'Тарелка от пиццы',
    fullnessPerBite: 4,
    tasteMessages: ['Тягучий сыр моцарелла...', 'Пикантная пепперони с перчинкой...', 'Хрустящая корочка теста...', 'Сочный томатный соус...', 'Ароматные орегано и базилик...', 'Хрустящий бортик пиццы!']
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
    biteCount: 8,
    biteDuration: 0.8,
    leftoverId: 'apple_core',
    leftoverNameRu: 'Огрызок яблока',
    fullnessPerBite: 2,
    tasteMessages: ['Хрустящий сладкий укус...', 'Сок брызжет при укусе...', 'Сладкий натуральный вкус...', 'Кислинка освежает рецепторы...', 'Сочная мякоть яблока...', 'Хруст свежести...', 'Приятная сладость...', 'Остался только огрызок!']
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
    biteCount: 10,
    biteDuration: 0.7,
    leftoverId: 'chocolate_wrapper',
    leftoverNameRu: 'Фольга от шоколада',
    fullnessPerBite: 2,
    tasteMessages: ['Долька шоколада тает во рту...', 'Глубокий вкус какао...', 'Сладкая бодрость...', 'Нежная шоколадная текстура...', 'Прилив энергии от какао-бобов...', 'Приятное сладкое послевкусие...']
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
    biteCount: 15,
    biteDuration: 0.5,
    leftoverId: 'chips_bag',
    leftoverNameRu: 'Пустой пакет от чипсов',
    fullnessPerBite: 2,
    tasteMessages: ['Хрустящий ломтик с солью...', 'Золотистая картофельная чипсина...', 'Аппетитный хруст...', 'Соль щиплет язык, хочется пить...', 'Хруст-хруст! Вкус паприки...', 'Еще горсточка чипсов...']
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
    biteCount: 12,
    biteDuration: 1.0,
    leftoverId: 'tin_can_empty',
    leftoverNameRu: 'Банка из-под тушёнки',
    fullnessPerBite: 5,
    tasteMessages: ['Густой мясной бульон...', 'Нежная тушеная говядина...', 'Пряный лавровый лист и перец...', 'Сытный кусок мяса...', 'Классическая армейская тушёнка!', 'Очень сытно и калорийно...']
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
    descriptionRu: 'Чистая родниковая вода (0.5 л). Главное средство от жажды и обезвоживания.',
    effects: { thirst: 50, health: 5, energy: 10 },
    weight: 0.5,
    usable: true,
    biteCount: 12,
    biteDuration: 0.6,
    leftoverId: 'bottle_empty',
    leftoverNameRu: 'Пустая пластиковая бутылка',
    fullnessPerBite: 1,
    tasteMessages: ['Чистый прохладный глоток воды...', 'Освежающая минеральная влага...', 'Жажда постепенно отступает...', 'Родниковая свежесть...', 'Приятная прохлада в горле...', 'Бодрящий глоток чистоты...']
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
    biteCount: 10,
    biteDuration: 0.6,
    leftoverId: 'can_empty',
    leftoverNameRu: 'Пустая жестяная банка',
    fullnessPerBite: 1,
    tasteMessages: ['Шипящие сладкие пузырьки колы...', 'Холодный карамельный вкус...', 'Бодрящий сладкий глоток...', 'Газировка приятно покалывает язык...']
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
    biteCount: 8,
    biteDuration: 0.8,
    leftoverId: 'cup_disposable',
    leftoverNameRu: 'Одноразовый стаканчик',
    fullnessPerBite: 1,
    tasteMessages: ['Ароматный горячий глоток эспрессо...', 'Крепкий кофе разгоняет сонливость...', 'Тёплый глоток — и голова проясняется...', 'Насыщенный вкус свежей арабики...']
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
    biteCount: 10,
    biteDuration: 0.6,
    leftoverId: 'energy_can_empty',
    leftoverNameRu: 'Смятая банка энергетика',
    fullnessPerBite: 1,
    tasteMessages: ['Кислый бодрящий вкус таурина...', 'Мощный всплеск кофеина в крови!', 'Взрыв энергии и учащение пульса...', 'Усталость отступает на второй план!']
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
    biteCount: 10,
    biteDuration: 0.7,
    leftoverId: 'juice_box',
    leftoverNameRu: 'Пустой пакетик от сока',
    fullnessPerBite: 1,
    tasteMessages: ['Свежевыжатый цитрусовый вкус!', 'Витамин C бодрит тело...', 'Натуральная сладкая кислинка сока...']
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
    usable: true,
    biteCount: 4,
    leftoverId: 'medkit_empty',
    leftoverNameRu: 'Пустая коробка аптечки'
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
    usable: true,
    biteCount: 4
  },
  painkillers: {
    itemId: 'painkillers',
    name: 'Painkiller Tablets',
    nameRu: 'Обезболивающие таблетки',
    category: 'med',
    maxStack: 10,
    icon: '💊',
    description: 'Alleviates pain and fatigue, helping restore mobility.',
    descriptionRu: 'Снимают болевой синдром при авариях и восстанавливают выносливость (10 таблеток в блистере).',
    effects: { health: 20, energy: 30, sleepiness: 10 },
    weight: 0.05,
    usable: true,
    biteCount: 10,
    biteDuration: 0.4,
    leftoverId: 'pill_pack',
    leftoverNameRu: 'Пустой блистер из-под таблеток',
    tasteMessages: ['Таблетка обезболивающего запита водой...', 'Боль постепенно притупляется...', 'Мышечный спазм отпускает...', 'Лекарство начинает действовать...']
  },
  vitamins: {
    itemId: 'vitamins',
    name: 'Multivitamin Complex',
    nameRu: 'Комплекс витаминов',
    category: 'med',
    maxStack: 10,
    icon: '🧪',
    description: 'Daily essential micronutrients. Improves metabolism and natural healing.',
    descriptionRu: 'Комплекс микроэлементов (12 драже в баночке). Улучшает самочувствие и бодрость.',
    effects: { health: 15, energy: 24, sleepiness: -15 },
    weight: 0.05,
    usable: true,
    biteCount: 12,
    biteDuration: 0.4,
    leftoverId: 'pill_bottle_empty',
    leftoverNameRu: 'Пустая баночка от витаминов',
    tasteMessages: ['Принята витаминка с цитрусовым вкусом...', 'Прилив микроэлементов и тонуса...', 'Иммунитет укрепляется...']
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
    usable: true,
    biteCount: 1
  },
  panthenol_spray: {
    itemId: 'panthenol_spray',
    name: 'Panthenol Aerosol Foam Spray',
    nameRu: 'Аэрозоль Пантенол от ожогов',
    category: 'med',
    maxStack: 6,
    icon: '🧴',
    description: 'Specialized burn foam with D-panthenol. Stimulates rapid epidermal regeneration and relieves severe burn pain (10 doses).',
    descriptionRu: 'Специализированная регенерирующая пена при термических ожогах 1-3 степени. Ускоряет заживление и мгновенно охлаждает (10 применений).',
    effects: { health: 30 },
    weight: 0.18,
    usable: true,
    biteCount: 10,
    biteDuration: 0.6,
    leftoverId: 'panthenol_empty',
    leftoverNameRu: 'Пустой баллончик Пантенола',
    tasteMessages: ['Охлаждающая пена Пантенола покрыла ожог...', 'Боль и саднящее жжение быстро отступают...', 'Защитная пена ускоряет регенерацию кожи...']
  },
  spasatel_ointment: {
    itemId: 'spasatel_ointment',
    name: 'Rescuer Healing Balm',
    nameRu: 'Бальзам «Спасатель»',
    category: 'med',
    maxStack: 8,
    icon: '🧪',
    description: 'Natural regenerative balm based on sea buckthorn and propolis for treating burns, wounds and bruises (8 doses).',
    descriptionRu: 'Натуральный регенерирующий бальзам на основе облепихи и прополиса для ожогов, ран и глубоких ссадин (туба на 8 нанесений).',
    effects: { health: 25 },
    weight: 0.08,
    usable: true,
    biteCount: 8,
    biteDuration: 0.6,
    leftoverId: 'ointment_tube_empty',
    leftoverNameRu: 'Пустой тюбик «Спасателя»',
    tasteMessages: ['Маслянистый бальзам нанесен на поврежденное место...', 'Натуральный прополис и облепиха затягивают рану...']
  },
  zelenka: {
    itemId: 'zelenka',
    name: 'Brilliant Green Solution (Zelenka)',
    nameRu: 'Раствор бриллиантового зелёного (Зелёнка)',
    category: 'med',
    maxStack: 12,
    icon: '🟢',
    description: 'Classic pharmacy antiseptic. Dries and sterilizes abrasions and edges of wounds (15 doses).',
    descriptionRu: 'Народный аптечный антисептик. Прижигает и дезинфицирует раны, ссадины и ожоги (флакон на 15 обработок).',
    effects: { health: 18 },
    weight: 0.05,
    usable: true,
    biteCount: 15,
    biteDuration: 0.4,
    leftoverId: 'zelenka_bottle_empty',
    leftoverNameRu: 'Пустой пузырек из-под зелёнки',
    tasteMessages: ['Зелёнка щиплет рану, образуя зеленый защитный слой...', 'Антисептическая дезинфекция завершена...']
  },
  iodine: {
    itemId: 'iodine',
    name: 'Iodine Tincture 5%',
    nameRu: 'Раствор йода спиртовой 5%',
    category: 'med',
    maxStack: 12,
    icon: '🟤',
    description: 'Iodine antiseptic. Warms deep bruises and sprains through iodine grid, disinfects cuts (15 doses).',
    descriptionRu: 'Спиртовой раствор йода. Йодная сетка снимает отек при ушибах и растяжениях, дезинфицирует ссадины (15 применений).',
    effects: { health: 18 },
    weight: 0.05,
    usable: true,
    biteCount: 15,
    biteDuration: 0.4,
    leftoverId: 'iodine_bottle_empty',
    leftoverNameRu: 'Пустой пузырек из-под йода',
    tasteMessages: ['Йодная сетка нанесена на место ушиба...', 'Глубокое согревающее действие снимает воспаление...']
  },
  diclofenac_gel: {
    itemId: 'diclofenac_gel',
    name: 'Diclofenac Anti-Inflammatory Gel',
    nameRu: 'Гель Диклофенак 5%',
    category: 'med',
    maxStack: 8,
    icon: '🧴',
    description: 'Potent NSAID gel for joint sprains, tendon injuries and muscular pain from impacts (10 doses).',
    descriptionRu: 'Сильное обезболивающее и противовоспалительное средство при растяжениях связок и ушибах суставов (10 доз).',
    effects: { health: 20 },
    weight: 0.09,
    usable: true,
    biteCount: 10,
    biteDuration: 0.5,
    leftoverId: 'diclofenac_tube_empty',
    leftoverNameRu: 'Пустой тюбик Диклофенака',
    tasteMessages: ['Гель Диклофенак втерт в растянутую связку...', 'Отек и скованность в суставе заметно уменьшаются...']
  },
  hydrogen_peroxide: {
    itemId: 'hydrogen_peroxide',
    name: 'Hydrogen Peroxide 3%',
    nameRu: 'Перекись водорода 3%',
    category: 'med',
    maxStack: 10,
    icon: '💧',
    description: 'Foaming hemostatic antiseptic. Cleans wounds and halts capillary bleeding (12 doses).',
    descriptionRu: 'Пенообразующий антисептик. Останавливает капиллярное кровотечение и механически вымывает грязь (12 доз).',
    effects: { health: 22 },
    weight: 0.1,
    usable: true,
    biteCount: 12,
    biteDuration: 0.5,
    leftoverId: 'peroxide_bottle_empty',
    leftoverNameRu: 'Пустой флакон от перекиси',
    tasteMessages: ['Перекись зашипела и обильно запенилась на ране...', 'Пена смыла загрязнения и остановила кровь!']
  },
  ammonia_spirit: {
    itemId: 'ammonia_spirit',
    name: 'Ammonia Spirit 10%',
    nameRu: 'Нашатырный спирт (Аммиак 10%)',
    category: 'med',
    maxStack: 10,
    icon: '🧪',
    description: 'Pungent smelling salts. Instantly stimulates the respiratory center, preventing syncope and shock (20 uses).',
    descriptionRu: 'Резкий раствор для вдыхания. Мгновенно выводит из полуобморока, снимает шок и сонливость (20 применений).',
    effects: { energy: 35, sleepiness: -40 },
    weight: 0.05,
    usable: true,
    biteCount: 20,
    biteDuration: 0.3,
    leftoverId: 'ammonia_bottle_empty',
    leftoverNameRu: 'Пустой флакон от нашатыря',
    tasteMessages: ['Резкий запах аммиака ударил в нос!', 'Дыхание перехватило, зрение мгновенно прояснилось!']
  },
  balm_star: {
    itemId: 'balm_star',
    name: 'Golden Star Balm (Zvezdochka)',
    nameRu: 'Бальзам «Золотая Звезда» (Звёздочка)',
    category: 'med',
    maxStack: 15,
    icon: '⭐',
    description: 'Legendary Vietnamese aromatic balm with essential oils. Relieves headaches, clears mind and reduces panic (25 uses).',
    descriptionRu: 'Легендарный аптечный бальзам с маслами мяты, гвоздики и корицы. Снимает головную боль и успокаивает (25 применений).',
    effects: { energy: 20, sleepiness: -25 },
    weight: 0.02,
    usable: true,
    biteCount: 25,
    biteDuration: 0.3,
    leftoverId: 'star_tin_empty',
    leftoverNameRu: 'Пустая металлическая баночка «Звёздочки»',
    tasteMessages: ['Ментол и гвоздика нанесены на виски...', 'Освежающий холодок снимает спазм и головную боль...']
  },
  activated_charcoal: {
    itemId: 'activated_charcoal',
    name: 'Activated Charcoal Tablets',
    nameRu: 'Активированный уголь',
    category: 'med',
    maxStack: 15,
    icon: '⬛',
    description: 'Natural enterosorbent. Absorbs stomach toxins, eliminates nausea and indigestion (10 tablets).',
    descriptionRu: 'Природный сорбент. Связывает токсины в желудочно-кишечном тракте, снимает тошноту и отравление (10 таблеток).',
    effects: { health: 15 },
    weight: 0.03,
    usable: true,
    biteCount: 10,
    biteDuration: 0.4,
    leftoverId: 'pill_pack',
    leftoverNameRu: 'Пустой блистер угля',
    tasteMessages: ['Таблетки черного угля запиты водой...', 'Тошнота и дискомфорт в животе проходят...']
  },
  valerian_drops: {
    itemId: 'valerian_drops',
    name: 'Valerian Tincture Drops',
    nameRu: 'Капли настойки валерианы',
    category: 'med',
    maxStack: 10,
    icon: '🌿',
    description: 'Natural sedative tincture. Rapidly lowers heart rate, panic, fear and physical tremor (15 doses).',
    descriptionRu: 'Натуральное седативное средство. Успокаивает учащенный пульс, снимает страх и панику после аварии (15 доз).',
    effects: { sleepiness: 15 },
    weight: 0.05,
    usable: true,
    biteCount: 15,
    biteDuration: 0.4,
    leftoverId: 'valerian_bottle_empty',
    leftoverNameRu: 'Пустой флакон от валерианы',
    tasteMessages: ['Приняты капли валерианы с характерным травяным вкусом...', 'Пульс замедляется, дыхание становится ровным...']
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
  cash_5000: {
    itemId: 'cash_5000',
    name: 'Banknote $5000',
    nameRu: 'Купюра $5000',
    category: 'valuable',
    maxStack: 100,
    icon: '💵',
    description: 'Large banknote of $5000. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Крупная купюра номиналом в $5000. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.001,
    usable: true
  },
  cash_1000: {
    itemId: 'cash_1000',
    name: 'Banknote $1000',
    nameRu: 'Купюра $1000',
    category: 'valuable',
    maxStack: 100,
    icon: '💵',
    description: 'Banknote of $1000. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Купюра номиналом в $1000. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.001,
    usable: true
  },
  cash_500: {
    itemId: 'cash_500',
    name: 'Banknote $500',
    nameRu: 'Купюра $500',
    category: 'valuable',
    maxStack: 100,
    icon: '💵',
    description: 'Banknote of $500. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Купюра номиналом в $500. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.001,
    usable: true
  },
  cash_100: {
    itemId: 'cash_100',
    name: 'Banknote $100',
    nameRu: 'Купюра $100',
    category: 'valuable',
    maxStack: 100,
    icon: '💵',
    description: 'Banknote of $100. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Купюра номиналом в $100. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.001,
    usable: true
  },
  cash_50: {
    itemId: 'cash_50',
    name: 'Banknote $50',
    nameRu: 'Купюра $50',
    category: 'valuable',
    maxStack: 100,
    icon: '💵',
    description: 'Banknote of $50. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Купюра номиналом в $50. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.001,
    usable: true
  },
  cash_10: {
    itemId: 'cash_10',
    name: 'Banknote $10',
    nameRu: 'Купюра $10',
    category: 'valuable',
    maxStack: 100,
    icon: '💵',
    description: 'Small banknote of $10. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Купюра номиналом в $10. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.001,
    usable: true
  },
  coin_10: {
    itemId: 'coin_10',
    name: 'Coin $10',
    nameRu: 'Монета $10',
    category: 'valuable',
    maxStack: 100,
    icon: '🪙',
    description: 'Heavy metallic coin of $10. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Тяжелая металлическая монета номиналом в $10. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.01,
    usable: true
  },
  coin_5: {
    itemId: 'coin_5',
    name: 'Coin $5',
    nameRu: 'Монета $5',
    category: 'valuable',
    maxStack: 100,
    icon: '🪙',
    description: 'Metallic coin of $5. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Металлическая монета номиналом в $5. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.008,
    usable: true
  },
  coin_2: {
    itemId: 'coin_2',
    name: 'Coin $2',
    nameRu: 'Монета $2',
    category: 'valuable',
    maxStack: 100,
    icon: '🪙',
    description: 'Metallic coin of $2. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Металлическая монета номиналом в $2. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.006,
    usable: true
  },
  coin_1: {
    itemId: 'coin_1',
    name: 'Coin $1',
    nameRu: 'Монета $1',
    category: 'valuable',
    maxStack: 100,
    icon: '🪙',
    description: 'Metallic coin of $1. Double click or use to deposit into your cash wallet.',
    descriptionRu: 'Металлическая монета номиналом в $1. Используйте, чтобы положить её в кошелёк.',
    effects: {},
    weight: 0.005,
    usable: true
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
    description: 'Disinfects deep cuts and scrapes to prevent infection (8 doses).',
    descriptionRu: 'Обеззараживает глубокие царапины и предотвращает инфекцию (флакон на 8 обработок).',
    effects: { health: 15 },
    weight: 0.1,
    usable: true,
    biteCount: 8,
    biteDuration: 0.5,
    leftoverId: 'antiseptic_empty',
    leftoverNameRu: 'Пустой флакон антисептика'
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
    description: 'Dry chemical foam extinguisher (100 foam charges). Hold down use/attack button to spray a continuous foam stream to extinguish fires.',
    descriptionRu: 'Порошковый автоогнетушитель (100 зарядов пены). Удерживайте кнопку применения/атаки для непрерывной струи пены и тушения огня.',
    effects: {},
    weight: 2.0,
    usable: true,
    biteCount: 100,
    biteDuration: 0.1,
    leftoverId: 'extinguisher_empty',
    leftoverNameRu: 'Пустой огнетушитель'
  },
  extinguisher_empty: {
    itemId: 'extinguisher_empty',
    name: 'Empty Fire Extinguisher',
    nameRu: 'Пустой огнетушитель',
    category: 'misc',
    maxStack: 2,
    icon: '🧯',
    description: 'Depleted steel fire extinguisher cylinder.',
    descriptionRu: 'Пустой стальной баллон из-под огнетушителя.',
    effects: {},
    weight: 1.2,
    usable: false
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
    biteCount: 8,
    biteDuration: 0.8,
    leftoverId: 'cup_disposable',
    leftoverNameRu: 'Одноразовый стаканчик',
    fullnessPerBite: 1,
    tasteMessages: ['Нежная сливочная пенка...', 'Мягкий кофейный вкус...', 'Идеальное утреннее тепло...', 'Сладковатый кофейный аромат...']
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
    biteCount: 6,
    biteDuration: 0.7,
    fullnessPerBite: 3,
    tasteMessages: ['Хрустящее слоёное тесто...', 'Масляный аромат выпечки...', 'Нежная мягкая серединка!', 'Золотистая корочка круассана...']
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
    biteCount: 12,
    biteDuration: 0.9,
    leftoverId: 'soup_bowl_empty',
    leftoverNameRu: 'Пустая тарелка из-под супа',
    fullnessPerBite: 3,
    tasteMessages: ['Горячий куриный бульон согревает...', 'Нежное куриное мясо...', 'Аромат домашней зелени...', 'Ложка наваристого супа...']
  },

  // === NEW FAST FOOD & RESTAURANT ITEMS ===
  french_fries: {
    itemId: 'french_fries',
    name: 'Crispy French Fries',
    nameRu: 'Картофель фри',
    category: 'food',
    maxStack: 10,
    icon: '🍟',
    description: 'Golden crispy potato fries with sea salt.',
    descriptionRu: 'Хрустящий золотистый картофель фри с морской солью.',
    effects: { hunger: 30, energy: 15 },
    weight: 0.15,
    usable: true,
    biteCount: 10,
    biteDuration: 0.5,
    leftoverId: 'fries_box',
    leftoverNameRu: 'Пустая коробочка от фри',
    fullnessPerBite: 2,
    tasteMessages: ['Хрустящая картофельная соломка...', 'Горячая соленая корочка...', 'Аромат жареного картофеля...', 'Вкусная порция фри!']
  },
  nuggets: {
    itemId: 'nuggets',
    name: 'Crispy Chicken Nuggets',
    nameRu: 'Куриные наггетсы (6 шт)',
    category: 'food',
    maxStack: 10,
    icon: '🍗',
    description: 'Tender chicken nuggets in crispy batter.',
    descriptionRu: 'Нежное куриное филе в хрустящей золотистой панировке.',
    effects: { hunger: 35, energy: 20 },
    weight: 0.2,
    usable: true,
    biteCount: 6,
    biteDuration: 0.6,
    leftoverId: 'fries_box',
    leftoverNameRu: 'Пустая коробка из-под наггетсов',
    fullnessPerBite: 3,
    tasteMessages: ['Хрустящий сочный наггетс...', 'Нежное куриное мясо...', 'Горячая золотистая панировка...']
  },
  hot_dog: {
    itemId: 'hot_dog',
    name: 'Classic Hot Dog',
    nameRu: 'Датский хот-дог',
    category: 'food',
    maxStack: 10,
    icon: '🌭',
    description: 'Juicy sausage in a toasted bun with mustard and crispy onions.',
    descriptionRu: 'Сочная сосиска в булочке с горчицей, кетчупом и хрустящим луком.',
    effects: { hunger: 40, energy: 20 },
    weight: 0.22,
    usable: true,
    biteCount: 8,
    biteDuration: 0.8,
    leftoverId: 'hot_dog_wrapper',
    leftoverNameRu: 'Обёртка от хот-дога',
    fullnessPerBite: 3,
    tasteMessages: ['Сочная поджаристая сосиска...', 'Хрустящий жареный лук и горчица...', 'Теплая мягкая булочка...', 'Сытный укус хот-дога!']
  },
  cola_zero: {
    itemId: 'cola_zero',
    name: 'Cola Zero (Can)',
    nameRu: 'Кола Зеро (0.33L)',
    category: 'food',
    maxStack: 15,
    icon: '🥤',
    description: 'Sugar-free refreshing iced cola soda.',
    descriptionRu: 'Освежающая газировка без сахара со льдом.',
    effects: { thirst: 28, energy: 15 },
    weight: 0.35,
    usable: true,
    biteCount: 7,
    biteDuration: 0.5,
    leftoverId: 'cola_zero_empty',
    leftoverNameRu: 'Смятая банка Колы Зеро',
    fullnessPerBite: 1,
    tasteMessages: ['Освежающие шипящие пузырьки...', 'Ледяной вкус Колы...', 'Приятная бодрость без сахара...']
  },
  milkshake: {
    itemId: 'milkshake',
    name: 'Vanilla Milkshake',
    nameRu: 'Ванильный милкшейк',
    category: 'food',
    maxStack: 10,
    icon: '🍦',
    description: 'Thick cold milkshake with real vanilla ice cream.',
    descriptionRu: 'Густой молочный коктейль с натуральным пломбиром и сливками.',
    effects: { thirst: 35, hunger: 20, energy: 25 },
    weight: 0.4,
    usable: true,
    biteCount: 10,
    biteDuration: 0.6,
    leftoverId: 'shake_cup',
    leftoverNameRu: 'Пустой стакан с соломинкой',
    fullnessPerBite: 2,
    tasteMessages: ['Густой сливочно-ванильный глоток...', 'Холодный сладкий пломбир...', 'Нежнейший молочный шейк!']
  },
  tea_green: {
    itemId: 'tea_green',
    name: 'Green Sencha Tea',
    nameRu: 'Зеленый чай Сенча',
    category: 'food',
    maxStack: 12,
    icon: '🍵',
    description: 'Hot fragrant green tea with antioxidants.',
    descriptionRu: 'Горячий зеленый чай с антиоксидантами. Снимает стресс и бодрит.',
    effects: { thirst: 35, energy: 15, health: 5 },
    weight: 0.3,
    usable: true,
    biteCount: 8,
    biteDuration: 0.7,
    leftoverId: 'cup_disposable',
    leftoverNameRu: 'Бумажный стаканчик',
    fullnessPerBite: 1,
    tasteMessages: ['Теплый травяной вкус...', 'Тонкий аромат зеленого чая...', 'Умиротворяющее тепло...']
  },
  donut: {
    itemId: 'donut',
    name: 'Pink Glazed Donut',
    nameRu: 'Пончик с розовой глазурью',
    category: 'food',
    maxStack: 15,
    icon: '🍩',
    description: 'Fresh donut with sweet strawberry glaze and sprinkles.',
    descriptionRu: 'Пышный пончик с клубничной глазурью и цветной посыпкой.',
    effects: { hunger: 25, energy: 20 },
    weight: 0.1,
    usable: true,
    biteCount: 5,
    biteDuration: 0.6,
    leftoverId: 'sandwich_bag',
    leftoverNameRu: 'Пакетик от пончика',
    fullnessPerBite: 2,
    tasteMessages: ['Сладкая клубничная глазурь...', 'Нежное воздушное тесто...', 'Хрустящая сладкая посыпка!']
  },
  sushi_set: {
    itemId: 'sushi_set',
    name: 'Philadelphia Rolls Set',
    nameRu: 'Сет роллов Филадельфия',
    category: 'food',
    maxStack: 5,
    icon: '🍣',
    description: 'Fresh Atlantic salmon, cream cheese, sushi rice and avocado.',
    descriptionRu: 'Свежий атлантический лосось, сливочный сыр и рис. Соевый соус и имбирь.',
    effects: { hunger: 55, thirst: 10, health: 15, energy: 25 },
    weight: 0.35,
    usable: true,
    biteCount: 8,
    biteDuration: 0.8,
    leftoverId: 'sushi_tray_empty',
    leftoverNameRu: 'Пустой лоток от суши',
    fullnessPerBite: 3,
    tasteMessages: ['Нежный свежий лосось...', 'Сливочный сыр с рисом...', 'Пикантный соевый соус с васаби!']
  },
  wok_box: {
    itemId: 'wok_box',
    name: 'Teriyaki Chicken WOK',
    nameRu: 'WOK-лапша с курицей Терияки',
    category: 'food',
    maxStack: 5,
    icon: '🥡',
    description: 'Stir-fried egg noodles with vegetables, tender chicken and sweet soy glaze.',
    descriptionRu: 'Яичная лапша вок с овощами, куриным филе и сладковатым соусом терияки.',
    effects: { hunger: 60, thirst: 10, energy: 30 },
    weight: 0.45,
    usable: true,
    biteCount: 12,
    biteDuration: 0.8,
    leftoverId: 'wok_box_empty',
    leftoverNameRu: 'Пустая вок-коробочка',
    fullnessPerBite: 3,
    tasteMessages: ['Ароматная горячая лапша...', 'Нежная курица в соусе терияки...', 'Хрустящие овощи вок!']
  },
  banana: {
    itemId: 'banana',
    name: 'Fresh Banana',
    nameRu: 'Спелый банан',
    category: 'food',
    maxStack: 20,
    icon: '🍌',
    description: 'Rich in potassium and natural energy.',
    descriptionRu: 'Сладкий спелый банан. Быстро насыщает организм калием и энергией.',
    effects: { hunger: 20, energy: 15 },
    weight: 0.15,
    usable: true,
    biteCount: 5,
    biteDuration: 0.6,
    leftoverId: 'banana_peel',
    leftoverNameRu: 'Банановая кожура',
    fullnessPerBite: 2,
    tasteMessages: ['Сладкая банановая мякоть...', 'Мягкий питательный фрукт...']
  },
  bread_loaf: {
    itemId: 'bread_loaf',
    name: 'Fresh Bakery Loaf',
    nameRu: 'Батон нарезной',
    category: 'food',
    maxStack: 10,
    icon: '🍞',
    description: 'Crusty loaf of white bakery bread.',
    descriptionRu: 'Свежий мягкий белый хлеб с хрустящей корочкой.',
    effects: { hunger: 35, energy: 15 },
    weight: 0.4,
    usable: true,
    biteCount: 10,
    biteDuration: 0.7,
    leftoverId: 'sandwich_bag',
    leftoverNameRu: 'Пакет от хлеба',
    fullnessPerBite: 3,
    tasteMessages: ['Хрустящая корочка свежего хлеба...', 'Мягкий теплый мякиш...']
  },
  cookie_pack: {
    itemId: 'cookie_pack',
    name: 'Chocolate Chip Cookies',
    nameRu: 'Печенье с шоколадной крошкой',
    category: 'food',
    maxStack: 15,
    icon: '🍪',
    description: 'Sweet cookies with rich Belgian chocolate drops.',
    descriptionRu: 'Хрустящее печенье с кусочками темного шоколада.',
    effects: { hunger: 25, energy: 20 },
    weight: 0.2,
    usable: true,
    biteCount: 6,
    biteDuration: 0.6,
    leftoverId: 'chips_bag',
    leftoverNameRu: 'Упаковка от печенья',
    fullnessPerBite: 2,
    tasteMessages: ['Хрустящее сладкое печенье...', 'Тающие кусочки шоколада...']
  },
  popcorn_caramel: {
    itemId: 'popcorn_caramel',
    name: 'Caramel Cinema Popcorn',
    nameRu: 'Карамельный попкорн',
    category: 'food',
    maxStack: 8,
    icon: '🍿',
    description: 'Crispy sweet popcorn bucket from cinema snack bar.',
    descriptionRu: 'Большое ведерко сладкого попкорна в золотистой карамели.',
    effects: { hunger: 25, energy: 18 },
    weight: 0.2,
    usable: true,
    biteCount: 12,
    biteDuration: 0.4,
    leftoverId: 'popcorn_bucket',
    leftoverNameRu: 'Пустое ведерко из-под попкорна',
    fullnessPerBite: 1,
    tasteMessages: ['Хрустящие карамельные зерна...', 'Сладкий кинотеатральный вкус!']
  },
  nachos: {
    itemId: 'nachos',
    name: 'Cheese Nachos',
    nameRu: 'Начос с сырным соусом',
    category: 'food',
    maxStack: 8,
    icon: '🧀',
    description: 'Crispy Mexican corn tortilla chips with warm cheddar dip.',
    descriptionRu: 'Хрустящие кукурузные чипсы начос с теплым сырным соусом чеддер.',
    effects: { hunger: 32, energy: 15 },
    weight: 0.25,
    usable: true,
    biteCount: 10,
    biteDuration: 0.5,
    leftoverId: 'nachos_tray_empty',
    leftoverNameRu: 'Лоток из-под начос',
    fullnessPerBite: 2,
    tasteMessages: ['Хрустящий кукурузный начос...', 'Пикантный сырный соус чеддер!']
  },

  // === NEW PHARMACY ITEMS ===
  antipyretic: {
    itemId: 'antipyretic',
    name: 'Antipyretic Fever Reducer',
    nameRu: 'Жаропонижающее "Парацетамол"',
    category: 'medical',
    maxStack: 10,
    icon: '🌡️',
    description: 'Reduces fever and stabilizes core body temperature.',
    descriptionRu: 'Снижает температуру, устраняет озноб и жар при простуде.',
    effects: { health: 15 },
    weight: 0.05,
    usable: true,
    biteCount: 6,
    biteDuration: 0.5,
    leftoverId: 'pill_pack',
    leftoverNameRu: 'Пустой блистер жаропонижающего',
    fullnessPerBite: 0,
    tasteMessages: ['Таблетка жаропонижающего снижает температуру...']
  },
  eye_drops: {
    itemId: 'eye_drops',
    name: 'Moisturizing Eye Drops',
    nameRu: 'Глазные капли "Чистый Взор"',
    category: 'medical',
    maxStack: 5,
    icon: '👁️',
    description: 'Relieves eye strain and clears vision fatigue.',
    descriptionRu: 'Снимает сухость и усталость глаз, восстанавливает четкость зрения.',
    effects: { energy: 10, health: 5 },
    weight: 0.04,
    usable: true,
    biteCount: 8,
    biteDuration: 0.4,
    fullnessPerBite: 0,
    tasteMessages: ['Капли увлажняют глаза, зрение становится кристально четким!']
  },
  medical_patch: {
    itemId: 'medical_patch',
    name: 'Adhesive Plaster Pack',
    nameRu: 'Набор бактерицидных пластырей',
    category: 'medical',
    maxStack: 20,
    icon: '🩹',
    description: 'Protective plaster for small scratches and blisters.',
    descriptionRu: 'Быстро заклеивает порезы и царапины, предотвращая попадание грязи.',
    effects: { health: 10 },
    weight: 0.02,
    usable: true,
    biteCount: 5,
    biteDuration: 0.5,
    fullnessPerBite: 0,
    tasteMessages: ['Пластырь надежно защищает поврежденную кожу.']
  },
  thermometer: {
    itemId: 'thermometer',
    name: 'Digital Medical Thermometer',
    nameRu: 'Электронный термометр',
    category: 'medical',
    maxStack: 2,
    icon: '🌡️',
    description: 'Accurately measures body temperature in Celsius.',
    descriptionRu: 'Быстро измеряет точную температуру тела.',
    effects: {},
    weight: 0.05,
    usable: false
  },

  // === NEW ELECTRONICS & GADGETS ===
  powerbank: {
    itemId: 'powerbank',
    name: '20000mAh Power Bank',
    nameRu: 'Повербанк 20 000 мАч',
    category: 'tool',
    maxStack: 2,
    icon: '🔋',
    description: 'High capacity battery for charging portable devices.',
    descriptionRu: 'Портативный аккумулятор высокой емкости с быстрой зарядкой.',
    effects: {},
    weight: 0.4,
    usable: false
  },
  smart_watch: {
    itemId: 'smart_watch',
    name: 'Smart Tactical Watch',
    nameRu: 'Тактические смарт-часы',
    category: 'tool',
    maxStack: 1,
    icon: '⌚',
    description: 'Waterproof watch tracking pulse, steps, and ambient temperature.',
    descriptionRu: 'Ударопрочные часы с датчиками пульса, температуры и шагомером.',
    effects: {},
    weight: 0.1,
    usable: false
  },
  walkie_talkie: {
    itemId: 'walkie_talkie',
    name: 'Long-Range Walkie Talkie',
    nameRu: 'Рация дальнего действия',
    category: 'tool',
    maxStack: 4,
    icon: '📻',
    description: 'Two-way radio for shortwave city communications.',
    descriptionRu: 'Портативная рация с чистым сигналом на расстоянии до 5 км.',
    effects: {},
    weight: 0.25,
    usable: false
  },
  headphones: {
    itemId: 'headphones',
    name: 'Wireless ANC Headphones',
    nameRu: 'Беспроводные наушники ANC',
    category: 'misc',
    maxStack: 1,
    icon: '🎧',
    description: 'High-fidelity audio with active noise cancellation.',
    descriptionRu: 'Накладные наушники с активным шумоподавлением и чистым звуком.',
    effects: {},
    weight: 0.25,
    usable: false
  },

  // === NEW CLOTHING & GEAR ===
  sneakers: {
    itemId: 'sneakers',
    name: 'Athletic Running Sneakers',
    nameRu: 'Кроссовки "Urban Sprint"',
    category: 'misc',
    maxStack: 1,
    icon: '👟',
    description: 'Lightweight cushioned shoes for fast sprinting and comfort.',
    descriptionRu: 'Легкие кроссовки с амортизацией для быстрого бега по асфальту.',
    effects: {},
    weight: 0.6,
    usable: false
  },
  sunglasses: {
    itemId: 'sunglasses',
    name: 'Polarized Sunglasses',
    nameRu: 'Поляризационные очки',
    category: 'misc',
    maxStack: 2,
    icon: '🕶️',
    description: 'Protects vision from harsh sunlight and glare.',
    descriptionRu: 'Стильные темные очки с защитой от ультрафиолета и бликов.',
    effects: {},
    weight: 0.05,
    usable: false
  },
  backpack_travel: {
    itemId: 'backpack_travel',
    name: 'Urban Tactical Backpack',
    nameRu: 'Городской рюкзак (35L)',
    category: 'misc',
    maxStack: 1,
    icon: '🎒',
    description: 'Heavy duty waterproof backpack with reinforced straps.',
    descriptionRu: 'Вместительный прочный рюкзак с водоотталкивающей пропиткой.',
    effects: {},
    weight: 0.8,
    usable: false
  },
  military_ration: {
    itemId: 'military_ration',
    name: 'Army Combat Ration (MRE)',
    nameRu: 'Армейский сухпай (ИРП)',
    category: 'food',
    maxStack: 4,
    icon: '🍱',
    description: 'Complete balanced combat ration with entrees, crackers and sweets.',
    descriptionRu: 'Сбалансированный армейский рацион питания: тушеное мясо, галеты, чай и джем.',
    effects: { hunger: 85, thirst: 30, health: 20, energy: 50 },
    weight: 1.2,
    usable: true,
    biteCount: 16,
    biteDuration: 0.9,
    leftoverId: 'ration_box',
    leftoverNameRu: 'Пустая коробка от сухпайка',
    fullnessPerBite: 3,
    tasteMessages: ['Питательное армейское рагу...', 'Хрустящие армейские галеты...', 'Густой сладкий джем...']
  },
  zippo_lighter: {
    itemId: 'zippo_lighter',
    name: 'Windproof Brass Lighter',
    nameRu: 'Бензиновая зажигалка Zippo',
    category: 'tool',
    maxStack: 2,
    icon: '🔥',
    description: 'Reliable windproof flint lighter with metal flip top. Can ignite fuel, oil puddles or leaks (30 uses).',
    descriptionRu: 'Надежная бензиновая зажигалка (30 использования). Позволяет поджигать пролитый бензин, масло и горючие подтёки.',
    effects: {},
    weight: 0.08,
    usable: true,
    biteCount: 30,
    biteDuration: 0.3,
    leftoverId: 'zippo_empty',
    leftoverNameRu: 'Пустая зажигалка Zippo'
  },
  zippo_empty: {
    itemId: 'zippo_empty',
    name: 'Empty Zippo Lighter',
    nameRu: 'Пустая зажигалка Zippo',
    category: 'misc',
    maxStack: 5,
    icon: '🔥',
    description: 'Zippo lighter out of fuel and flint.',
    descriptionRu: 'Пустая зажигалка Zippo без бензина и кремня.',
    effects: {},
    weight: 0.08,
    usable: false
  },
  fuel_canister: {
    itemId: 'fuel_canister',
    name: 'Gasoline Canister (20L)',
    nameRu: 'Канистра с бензином (20л)',
    category: 'tool',
    maxStack: 2,
    icon: '⛽',
    description: 'Metal canister filled with A-95 gasoline (20 portions). Use to pour fuel puddles or refuel vehicles.',
    descriptionRu: 'Металлическая канистра с бензином АИ-95 (20 порций/литров). Разливает лужи бензина на землю или заправляет автомобили.',
    effects: {},
    weight: 15.0,
    usable: true,
    biteCount: 20,
    biteDuration: 0.3,
    leftoverId: 'canister_empty',
    leftoverNameRu: 'Пустая канистра (20л)'
  },
  canister_empty: {
    itemId: 'canister_empty',
    name: 'Empty Canister (20L)',
    nameRu: 'Пустая канистра (20л)',
    category: 'misc',
    maxStack: 4,
    icon: '🛢️',
    description: 'Empty metal fuel canister.',
    descriptionRu: 'Пустая металлическая канистра из-под бензина.',
    effects: {},
    weight: 2.5,
    usable: false
  },
  camp_flask: {
    itemId: 'camp_flask',
    name: 'Stainless Steel Flask',
    nameRu: 'Стальная фляга (0.75L)',
    category: 'food',
    maxStack: 2,
    icon: '🍶',
    description: 'Durable metal flask filled with pure mountain water.',
    descriptionRu: 'Надежная металлическая фляга с чистой родниковой водой.',
    effects: { thirst: 50, energy: 10 },
    weight: 0.85,
    usable: true,
    biteCount: 12,
    biteDuration: 0.5,
    leftoverId: 'camp_flask_empty',
    leftoverNameRu: 'Пустая стальная фляга',
    fullnessPerBite: 1,
    tasteMessages: ['Глоток ледяной чистой воды из стальной фляги...', 'Освежающая влага утоляет жажду!']
  },
  compass: {
    itemId: 'compass',
    name: 'Military Magnetic Compass',
    nameRu: 'Тактический компас',
    category: 'tool',
    maxStack: 2,
    icon: '🧭',
    description: 'Liquid-filled compass for precise geographic navigation.',
    descriptionRu: 'Жидкостный компас для точного ориентирования на местности.',
    effects: {},
    weight: 0.08,
    usable: false
  },
  sleeping_bag: {
    itemId: 'sleeping_bag',
    name: 'Thermal Sleeping Bag',
    nameRu: 'Спальный мешок (-15°C)',
    category: 'misc',
    maxStack: 1,
    icon: '🛌',
    description: 'Compact roll-up sleeping bag for cold weather shelter.',
    descriptionRu: 'Теплый походный спальник с защитой от сырости и заморозков.',
    effects: {},
    weight: 1.4,
    usable: false
  },
  city_guide: {
    itemId: 'city_guide',
    name: 'Illustrated City Guide',
    nameRu: 'Путеводитель по городу',
    category: 'misc',
    maxStack: 5,
    icon: '📖',
    description: 'Detailed tourist handbook with city landmarks and streets.',
    descriptionRu: 'Глянцевый справочник с картой ключевых мест и описанием кварталов.',
    effects: {},
    weight: 0.2,
    usable: false
  },
  notebook: {
    itemId: 'notebook',
    name: 'Leatherbound Notebook',
    nameRu: 'Блокнот для заметок',
    category: 'misc',
    maxStack: 10,
    icon: '📓',
    description: 'Blank lined paper notebook for journal records.',
    descriptionRu: 'Компактный блокнот в плотной обложке для записей.',
    effects: {},
    weight: 0.15,
    usable: false
  },
  pen_stationery: {
    itemId: 'pen_stationery',
    name: 'Ballpoint Pen',
    nameRu: 'Шариковая ручка',
    category: 'misc',
    maxStack: 20,
    icon: '🖊️',
    description: 'Blue ink smooth ballpoint pen.',
    descriptionRu: 'Классическая шариковая ручка с синей пастой.',
    effects: {},
    weight: 0.01,
    usable: false
  },

  // === NEW AUTO GOODS ===
  antifreeze: {
    itemId: 'antifreeze',
    name: 'G12+ Coolant Antifreeze (5L)',
    nameRu: 'Канистра антифриза G12+',
    category: 'auto',
    maxStack: 2,
    icon: '🛢️',
    description: 'High performance engine coolant prevents overheating and freezing.',
    descriptionRu: 'Охлаждающая жидкость для радиатора. Предотвращает перегрев двигателя.',
    effects: {},
    weight: 5.2,
    usable: false
  },
  tow_rope: {
    itemId: 'tow_rope',
    name: 'Reinforced Towing Rope (5T)',
    nameRu: 'Буксировочный трос 5т',
    category: 'tool',
    maxStack: 2,
    icon: '🪢',
    description: 'Heavy duty strap with steel carabiners for emergency vehicle recovery.',
    descriptionRu: 'Прочный капроновый трос со стальными крюками для эвакуации авто.',
    effects: {},
    weight: 0.9,
    usable: false
  },

  // === LEFTOVERS (ОСТАТКИ ПОСЛЕ ЕДЫ) ===
  banana_peel: {
    itemId: 'banana_peel',
    name: 'Banana Peel',
    nameRu: 'Банановая кожура',
    category: 'misc',
    maxStack: 20,
    icon: '🍌',
    description: 'Slippery yellow banana peel. Throw into trash bin.',
    descriptionRu: 'Скользкая банановая кожура. Выбросьте в урну.',
    effects: {},
    weight: 0.03,
    usable: false
  },
  fries_box: {
    itemId: 'fries_box',
    name: 'Empty Fries Box',
    nameRu: 'Коробочка от картошки фри',
    category: 'misc',
    maxStack: 20,
    icon: '🍟',
    description: 'Red cardboard fries container.',
    descriptionRu: 'Пустая красная картонная коробочка от картофеля фри.',
    effects: {},
    weight: 0.01,
    usable: false
  },
  shake_cup: {
    itemId: 'shake_cup',
    name: 'Empty Milkshake Cup',
    nameRu: 'Пустой стакан от коктейля',
    category: 'misc',
    maxStack: 20,
    icon: '🥤',
    description: 'Clear plastic cup with domed lid and straw.',
    descriptionRu: 'Прозрачный пластиковый стаканчик с купольной крышкой и соломинкой.',
    effects: {},
    weight: 0.015,
    usable: false
  },
  popcorn_bucket: {
    itemId: 'popcorn_bucket',
    name: 'Empty Popcorn Bucket',
    nameRu: 'Ведерко от попкорна',
    category: 'misc',
    maxStack: 20,
    icon: '🍿',
    description: 'Striped cardboard cinema popcorn bucket.',
    descriptionRu: 'Полосатое картонное ведерко из-под попкорна.',
    effects: {},
    weight: 0.02,
    usable: false
  },
  wok_box_empty: {
    itemId: 'wok_box_empty',
    name: 'Empty WOK Container',
    nameRu: 'Пустая коробочка ВОК',
    category: 'misc',
    maxStack: 20,
    icon: '🥡',
    description: 'Empty Chinese food container with wooden chopsticks.',
    descriptionRu: 'Пустая картонная коробочка вок с деревянными палочками.',
    effects: {},
    weight: 0.02,
    usable: false
  },
  ration_box: {
    itemId: 'ration_box',
    name: 'Empty MRE Packaging',
    nameRu: 'Пустая упаковка сухпайка',
    category: 'misc',
    maxStack: 10,
    icon: '🍱',
    description: 'Discarded green military ration container.',
    descriptionRu: 'Пустая зеленая полимерная упаковка от армейского сухого пайка.',
    effects: {},
    weight: 0.05,
    usable: false
  },
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
  tin_can_empty: {
    itemId: 'tin_can_empty',
    name: 'Empty Stew Can',
    nameRu: 'Банка из-под тушёнки',
    category: 'misc',
    maxStack: 20,
    icon: '🥫',
    description: 'Empty tin can with curled lid.',
    descriptionRu: 'Пустая жестяная консервная банка с отогнутой крышкой.',
    effects: {},
    weight: 0.04,
    usable: false
  },
  cola_zero_empty: {
    itemId: 'cola_zero_empty',
    name: 'Crushed Cola Zero Can',
    nameRu: 'Смятая банка Колы Зеро',
    category: 'misc',
    maxStack: 20,
    icon: '🥤',
    description: 'Crushed black aluminum cola can.',
    descriptionRu: 'Смятая черная алюминиевая банка из-под диетической колы.',
    effects: {},
    weight: 0.015,
    usable: false
  },
  energy_can_empty: {
    itemId: 'energy_can_empty',
    name: 'Crushed Energy Drink Can',
    nameRu: 'Смятая банка энергетика',
    category: 'misc',
    maxStack: 20,
    icon: '⚡',
    description: 'Crushed navy energy drink can with open pull tab.',
    descriptionRu: 'Смятая синяя банка из-под энергетического напитка.',
    effects: {},
    weight: 0.015,
    usable: false
  },
  camp_flask_empty: {
    itemId: 'camp_flask_empty',
    name: 'Empty Steel Flask',
    nameRu: 'Пустая стальная фляга',
    category: 'misc',
    maxStack: 5,
    icon: '🍶',
    description: 'Empty stainless steel hip flask with dangling cap.',
    descriptionRu: 'Пустая походная металлическая фляга с отвинченной крышкой.',
    effects: {},
    weight: 0.25,
    usable: false
  },
  soup_bowl_empty: {
    itemId: 'soup_bowl_empty',
    name: 'Empty Soup Bowl',
    nameRu: 'Пустая суповая тарелка',
    category: 'misc',
    maxStack: 10,
    icon: '🥣',
    description: 'Empty ceramic bowl with spoon and broth sheen.',
    descriptionRu: 'Пустая глубокая тарелка из-под горячего бульона с ложкой.',
    effects: {},
    weight: 0.15,
    usable: false
  },
  hot_dog_wrapper: {
    itemId: 'hot_dog_wrapper',
    name: 'Hot Dog Paper Tray',
    nameRu: 'Обёртка от хот-дога',
    category: 'misc',
    maxStack: 20,
    icon: '🌭',
    description: 'Paper food boat with mustard smear.',
    descriptionRu: 'Бумажный лоток из-под хот-дога со следами горчицы.',
    effects: {},
    weight: 0.01,
    usable: false
  },
  sushi_tray_empty: {
    itemId: 'sushi_tray_empty',
    name: 'Empty Bento Sushi Tray',
    nameRu: 'Пустой лоток от суши',
    category: 'misc',
    maxStack: 15,
    icon: '🍱',
    description: 'Black sushi bento tray with decorative grass divider.',
    descriptionRu: 'Черный лоток из-под роллов с зеленой перегородкой и следами соевого соуса.',
    effects: {},
    weight: 0.02,
    usable: false
  },
  nachos_tray_empty: {
    itemId: 'nachos_tray_empty',
    name: 'Empty Nachos Boat',
    nameRu: 'Лоток из-под начос',
    category: 'misc',
    maxStack: 20,
    icon: '🧀',
    description: 'Cardboard boat with cheese dip residue.',
    descriptionRu: 'Картонный лоток из-под чипсов начос с пустым соусником.',
    effects: {},
    weight: 0.015,
    usable: false
  },
  pill_bottle_empty: {
    itemId: 'pill_bottle_empty',
    name: 'Empty Vitamin Bottle',
    nameRu: 'Пустая баночка от витаминов',
    category: 'misc',
    maxStack: 20,
    icon: '🧪',
    description: 'Empty amber pill bottle with open cap.',
    descriptionRu: 'Пустая янтарная пластиковая баночка из-под поливитаминов.',
    effects: {},
    weight: 0.02,
    usable: false
  },
  antiseptic_empty: {
    itemId: 'antiseptic_empty',
    name: 'Empty Antiseptic Spray',
    nameRu: 'Пустой флакон антисептика',
    category: 'misc',
    maxStack: 20,
    icon: '🧴',
    description: 'Depleted green antiseptic spray bottle.',
    descriptionRu: 'Пустой зеленый флакон с распылителем от антисептика.',
    effects: {},
    weight: 0.02,
    usable: false
  },
  medkit_empty: {
    itemId: 'medkit_empty',
    name: 'Empty First Aid Box',
    nameRu: 'Пустая коробка аптечки',
    category: 'misc',
    maxStack: 6,
    icon: '🧰',
    description: 'Open plastic medical emergency case with empty compartments.',
    descriptionRu: 'Пустой красный пластиковый кейс автомобильной аптечки.',
    effects: {},
    weight: 0.2,
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
  
  // === CLOTHING (ОДЕЖДА) ===
  // HEAD
  
  backpack: {
    itemId: 'backpack',
    name: 'Canvas Backpack',
    nameRu: 'Брезентовый рюкзак',
    category: 'clothing',
    maxStack: 1,
    icon: '🎒',
    description: 'Increases inventory space.',
    descriptionRu: 'Увеличивает вместимость инвентаря.',
    effects: {},
    weight: 0.5,
    usable: true,
  },
  beanie_black: {
    itemId: 'beanie_black',
    name: 'Black Beanie',
    nameRu: 'Черная шапка',
    category: 'clothing',
    maxStack: 1,
    icon: '🧢',
    description: 'A warm woolen black beanie.',
    descriptionRu: 'Теплая шерстяная черная шапка.',
    effects: {},
    weight: 0.1,
    usable: true,
  },
  cap_red: {
    itemId: 'cap_red',
    name: 'Red Cap',
    nameRu: 'Красная кепка',
    category: 'clothing',
    maxStack: 1,
    icon: '🧢',
    description: 'A simple red baseball cap. Protects from the sun.',
    descriptionRu: 'Простая красная бейсболка. Защищает от солнца.',
    effects: {},
    weight: 0.1,
    usable: true,
  },
  ushanka_hat: {
    itemId: 'ushanka_hat',
    name: 'Ushanka Hat',
    nameRu: 'Шапка-ушанка',
    category: 'clothing',
    maxStack: 1,
    icon: '🎩',
    description: 'Very warm fur hat for severe frosts.',
    descriptionRu: 'Очень теплая меховая шапка для суровых морозов.',
    effects: {},
    weight: 0.3,
    usable: true,
  },

  // FACE
  scarf_blue: {
    itemId: 'scarf_blue',
    name: 'Blue Scarf',
    nameRu: 'Синий шарф',
    category: 'clothing',
    maxStack: 1,
    icon: '🧣',
    description: 'Knitted warm blue scarf.',
    descriptionRu: 'Вязаный теплый синий шарф.',
    effects: {},
    weight: 0.15,
    usable: true,
  },

  // UNDERWEAR
  tshirt_white: {
    itemId: 'tshirt_white',
    name: 'White T-Shirt',
    nameRu: 'Белая футболка',
    category: 'clothing',
    maxStack: 1,
    icon: '👕',
    description: 'Light breathable cotton t-shirt.',
    descriptionRu: 'Легкая дышащая хлопковая футболка.',
    effects: {},
    weight: 0.1,
    usable: true,
  },
  tshirt_black: {
    itemId: 'tshirt_black',
    name: 'Black T-Shirt',
    nameRu: 'Черная футболка',
    category: 'clothing',
    maxStack: 1,
    icon: '👕',
    description: 'Simple black cotton t-shirt.',
    descriptionRu: 'Простая черная хлопковая футболка.',
    effects: {},
    weight: 0.1,
    usable: true,
  },
  long_johns: {
    itemId: 'long_johns',
    name: 'Thermal Underwear',
    nameRu: 'Термобелье',
    category: 'clothing',
    maxStack: 1,
    icon: '🩲',
    description: 'Warm base layer for cold weather.',
    descriptionRu: 'Теплый базовый слой для холодной погоды.',
    effects: {},
    weight: 0.2,
    usable: true,
  },

  // SHIRTS
  sweater_blue: {
    itemId: 'sweater_blue',
    name: 'Blue Sweater',
    nameRu: 'Синяя кофта',
    category: 'clothing',
    maxStack: 1,
    icon: '🧥',
    description: 'Comfortable blue knitted sweater.',
    descriptionRu: 'Удобная синяя вязаная кофта.',
    effects: {},
    weight: 0.4,
    usable: true,
  },
  plaid_shirt: {
    itemId: 'plaid_shirt',
    name: 'Plaid Shirt',
    nameRu: 'Клетчатая рубашка',
    category: 'clothing',
    maxStack: 1,
    icon: '👔',
    description: 'Flannel plaid shirt. Classic.',
    descriptionRu: 'Фланелевая клетчатая рубашка. Классика.',
    effects: {},
    weight: 0.3,
    usable: true,
  },

  // JACKETS
  leather_jacket: {
    itemId: 'leather_jacket',
    name: 'Leather Jacket',
    nameRu: 'Кожаная куртка',
    category: 'clothing',
    maxStack: 1,
    icon: '🧥',
    description: 'Tough leather jacket. Good wind protection.',
    descriptionRu: 'Прочная кожаная куртка. Хорошо защищает от ветра.',
    effects: {},
    weight: 1.2,
    usable: true,
  },
  winter_jacket: {
    itemId: 'winter_jacket',
    name: 'Winter Down Jacket',
    nameRu: 'Зимний пуховик',
    category: 'clothing',
    maxStack: 1,
    icon: '🧥',
    description: 'Heavy insulated jacket for extreme cold.',
    descriptionRu: 'Тяжелая утепленная куртка для сильных морозов.',
    effects: {},
    weight: 1.5,
    usable: true,
  },
  raincoat_yellow: {
    itemId: 'raincoat_yellow',
    name: 'Yellow Raincoat',
    nameRu: 'Желтый дождевик',
    category: 'clothing',
    maxStack: 1,
    icon: '🧥',
    description: 'Waterproof raincoat. Keeps you dry but not very breathable.',
    descriptionRu: 'Водонепроницаемый плащ. Сохранит сухим, но почти не дышит.',
    effects: {},
    weight: 0.3,
    usable: true,
  },

  // LEGS
  jeans_blue: {
    itemId: 'jeans_blue',
    name: 'Blue Jeans',
    nameRu: 'Синие джинсы',
    category: 'clothing',
    maxStack: 1,
    icon: '👖',
    description: 'Classic durable denim jeans.',
    descriptionRu: 'Классические прочные джинсы.',
    effects: {},
    weight: 0.6,
    usable: true,
  },
  cargo_pants: {
    itemId: 'cargo_pants',
    name: 'Cargo Pants',
    nameRu: 'Штаны карго',
    category: 'clothing',
    maxStack: 1,
    icon: '👖',
    description: 'Practical pants with many pockets.',
    descriptionRu: 'Практичные штаны с множеством карманов.',
    effects: {},
    weight: 0.7,
    usable: true,
  },
  shorts_khaki: {
    itemId: 'shorts_khaki',
    name: 'Khaki Shorts',
    nameRu: 'Шорты хаки',
    category: 'clothing',
    maxStack: 1,
    icon: '🩳',
    description: 'Lightweight shorts for hot weather.',
    descriptionRu: 'Легкие шорты для жаркой погоды.',
    effects: {},
    weight: 0.2,
    usable: true,
  },

  // FEET
  sneakers_white: {
    itemId: 'sneakers_white',
    name: 'White Sneakers',
    nameRu: 'Белые кроссовки',
    category: 'clothing',
    maxStack: 1,
    icon: '👟',
    description: 'Comfortable sports shoes.',
    descriptionRu: 'Удобная спортивная обувь.',
    effects: {},
    weight: 0.5,
    usable: true,
  },
  work_boots: {
    itemId: 'work_boots',
    name: 'Work Boots',
    nameRu: 'Рабочие ботинки',
    category: 'clothing',
    maxStack: 1,
    icon: '👢',
    description: 'Heavy duty leather boots.',
    descriptionRu: 'Тяжелые кожаные рабочие ботинки.',
    effects: {},
    weight: 1.2,
    usable: true,
  },
  winter_boots: {
    itemId: 'winter_boots',
    name: 'Winter Boots',
    nameRu: 'Зимние ботинки',
    category: 'clothing',
    maxStack: 1,
    icon: '👢',
    description: 'Insulated boots for snow.',
    descriptionRu: 'Утепленные ботинки для снега.',
    effects: {},
    weight: 1.5,
    usable: true,
  },
  socks_white: {
    itemId: 'socks_white',
    name: 'Cotton Socks',
    nameRu: 'Хлопковые носки',
    category: 'clothing',
    maxStack: 1,
    icon: '🧦',
    description: 'Simple white socks.',
    descriptionRu: 'Простые белые носки.',
    effects: {},
    weight: 0.05,
    usable: true,
  },
  socks_wool: {
    itemId: 'socks_wool',
    name: 'Woolen Socks',
    nameRu: 'Шерстяные носки',
    category: 'clothing',
    maxStack: 1,
    icon: '🧦',
    description: 'Warm thick knitted socks.',
    descriptionRu: 'Теплые толстые вязаные носки.',
    effects: {},
    weight: 0.1,
    usable: true,
  },

  // HANDS
  gloves_leather: {
    itemId: 'gloves_leather',
    name: 'Leather Gloves',
    nameRu: 'Кожаные перчатки',
    category: 'clothing',
    maxStack: 1,
    icon: '🧤',
    description: 'Protects hands from cold and scratches.',
    descriptionRu: 'Защищают руки от холода и царапин.',
    effects: {},
    weight: 0.1,
    usable: true,
  },
  gloves_winter: {
    itemId: 'gloves_winter',
    name: 'Winter Gloves',
    nameRu: 'Зимние перчатки',
    category: 'clothing',
    maxStack: 1,
    icon: '🧤',
    description: 'Thick insulated gloves.',
    descriptionRu: 'Толстые утепленные перчатки.',
    effects: {},
    weight: 0.2,
    usable: true,
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


export const CLOTHING_STATS: Record<string, import('./types').ClothingStats> = {
  
  backpack: { slot: 'back', layer: 'outerwear', insulation: 5, windResistance: 5, waterResistance: 5, breathability: 90, mobilityPenalty: 2, color: '#4a5568' },
  beanie_black: { slot: 'head', layer: 'outerwear', insulation: 30, windResistance: 20, waterResistance: 10, breathability: 40, mobilityPenalty: 2, color: '#222' },
  cap_red: { slot: 'head', layer: 'outerwear', insulation: 5, windResistance: 5, waterResistance: 5, breathability: 60, mobilityPenalty: 0, color: '#e53e3e' },
  ushanka_hat: { slot: 'head', layer: 'outerwear', insulation: 70, windResistance: 80, waterResistance: 30, breathability: 20, mobilityPenalty: 5, color: '#5a4d41' },

  sunglasses: { slot: 'face', layer: 'outerwear', insulation: 0, windResistance: 5, waterResistance: 0, breathability: 100, mobilityPenalty: 0, color: '#111' },
  scarf_blue: { slot: 'face', layer: 'outerwear', insulation: 20, windResistance: 30, waterResistance: 10, breathability: 50, mobilityPenalty: 2, color: '#3182ce' },

  tshirt_white: { slot: 'torso', layer: 'underwear', insulation: 10, windResistance: 5, waterResistance: 0, breathability: 80, mobilityPenalty: 1, color: '#f8fafc' },
  tshirt_black: { slot: 'torso', layer: 'underwear', insulation: 10, windResistance: 5, waterResistance: 0, breathability: 80, mobilityPenalty: 1, color: '#1a202c' },
  long_johns: { slot: 'legs', layer: 'underwear', insulation: 40, windResistance: 10, waterResistance: 5, breathability: 60, mobilityPenalty: 3, color: '#e2e8f0' },

  sweater_blue: { slot: 'torso', layer: 'shirt', insulation: 45, windResistance: 15, waterResistance: 10, breathability: 40, mobilityPenalty: 5, color: '#2b6cb0' },
  plaid_shirt: { slot: 'torso', layer: 'shirt', insulation: 20, windResistance: 10, waterResistance: 5, breathability: 60, mobilityPenalty: 2, color: '#c53030', secondaryColor: '#2d3748' },

  leather_jacket: { slot: 'torso', layer: 'jacket', insulation: 30, windResistance: 90, waterResistance: 60, breathability: 15, mobilityPenalty: 10, color: '#4a3f35' },
  winter_jacket: { slot: 'torso', layer: 'jacket', insulation: 90, windResistance: 80, waterResistance: 70, breathability: 20, mobilityPenalty: 20, color: '#2b6cb0' },
  raincoat_yellow: { slot: 'torso', layer: 'outerwear', insulation: 10, windResistance: 100, waterResistance: 100, breathability: 5, mobilityPenalty: 5, color: '#ecc94b' },

  jeans_blue: { slot: 'legs', layer: 'shirt', insulation: 20, windResistance: 30, waterResistance: 10, breathability: 50, mobilityPenalty: 5, color: '#2b6cb0' },
  cargo_pants: { slot: 'legs', layer: 'shirt', insulation: 25, windResistance: 40, waterResistance: 20, breathability: 45, mobilityPenalty: 6, color: '#718096' },
  shorts_khaki: { slot: 'legs', layer: 'shirt', insulation: 5, windResistance: 5, waterResistance: 5, breathability: 90, mobilityPenalty: 0, color: '#d6bcfa' }, // wait khaki color
  
  sneakers_white: { slot: 'feet', layer: 'outerwear', insulation: 15, windResistance: 20, waterResistance: 15, breathability: 60, mobilityPenalty: 2, color: '#f8fafc' },
  work_boots: { slot: 'feet', layer: 'outerwear', insulation: 30, windResistance: 50, waterResistance: 60, breathability: 30, mobilityPenalty: 12, color: '#7b341e' },
  winter_boots: { slot: 'feet', layer: 'outerwear', insulation: 80, windResistance: 70, waterResistance: 80, breathability: 20, mobilityPenalty: 15, color: '#4a5568' },
  socks_white: { slot: 'feet', layer: 'underwear', insulation: 10, windResistance: 5, waterResistance: 0, breathability: 70, mobilityPenalty: 1, color: '#f8fafc' },
  socks_wool: { slot: 'feet', layer: 'underwear', insulation: 40, windResistance: 10, waterResistance: 10, breathability: 40, mobilityPenalty: 2, color: '#a0aec0' },

  gloves_leather: { slot: 'hands', layer: 'outerwear', insulation: 20, windResistance: 60, waterResistance: 40, breathability: 30, mobilityPenalty: 5, color: '#4a3f35' },
  gloves_winter: { slot: 'hands', layer: 'outerwear', insulation: 60, windResistance: 50, waterResistance: 50, breathability: 20, mobilityPenalty: 10, color: '#2d3748' },
};

export function createItem(itemId: string, count: number = 1, initialPortions?: number): InventoryItem {
  const def = ITEM_CATALOG[itemId] || ITEM_CATALOG.water_bottle;
  itemCounter++;
  const maxPortions = def.biteCount || 1;
  const portions = initialPortions !== undefined ? initialPortions : maxPortions;
  const stats = CLOTHING_STATS[def.itemId];
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
    clothingStats: stats,
    usable: def.usable,
    portions: portions,
    maxPortions: maxPortions
  };
}

// Start multi-step consumption (eating/drinking) - kept for backward compatibility if used
export function startConsumption(
  player: Player,
  itemIndex: number
): { success: boolean; message: string } {
  return useItemOnPlayer(player, itemIndex);
}

// Called each frame to advance consumption (if any continuous consumption state active)
export function updateConsumption(player: Player, dt: number): void {
  if (!player.consumption || !player.consumption.isConsuming) return;

  const c = player.consumption;
  c.currentBiteTimer += dt;

  if (c.currentBiteTimer >= c.biteDuration) {
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

    if (c.fullnessPerBite) {
      player.needs.fullness = Math.min(100, (player.needs.fullness || 0) + c.fullnessPerBite);
    }

    if (c.bitesRemaining <= 0) {
      finishConsumption(player);
    }
  }
}

// Finish consumption: remove item, spawn leftover
function finishConsumption(player: Player): void {
  const c = player.consumption;
  if (!c) return;

  const itemIdx = player.inventory.findIndex(i => i && i.itemId === c.itemId);
  if (itemIdx >= 0) {
    removeItemFromPlayer(player, itemIdx, 1);
  }

  if (c.leftoverId) {
    const leftover = createItem(c.leftoverId, 1);
    addItemToPlayer(player, leftover);
    addPlayerNotification(player, `Осталась пустая тара: ${c.leftoverNameRu || leftover.nameRu}`, 'info');
  }

  if (c.category === 'food') {
    sound.playEat();
  } else {
    sound.playDrink();
  }

  player.consumption = null;
}

// Cancel ongoing consumption
export function cancelConsumption(player: Player): void {
  if (!player.consumption || !player.consumption.isConsuming) return;
  player.consumption = null;
  addPlayerNotification(player, 'Прекратили употребление.', 'info');
}

export function getPlayerCash(player: Player | null): number {
  if (!player || !player.inventory) return 0;
  return player.inventory.reduce((sum, i) => {
    if (!i) return sum;
    if (i.itemId === 'cash') return sum + i.count;
    if (i.itemId === 'cash_5000') return sum + (5000 * i.count);
    if (i.itemId === 'cash_1000') return sum + (1000 * i.count);
    if (i.itemId === 'cash_500') return sum + (500 * i.count);
    if (i.itemId === 'cash_100') return sum + (100 * i.count);
    if (i.itemId === 'cash_50') return sum + (50 * i.count);
    if (i.itemId === 'cash_10') return sum + (10 * i.count);
    if (i.itemId === 'coin_10') return sum + (10 * i.count);
    if (i.itemId === 'coin_5') return sum + (5 * i.count);
    if (i.itemId === 'coin_2') return sum + (2 * i.count);
    if (i.itemId === 'coin_1') return sum + (1 * i.count);
    return sum;
  }, 0);
}

export function deductPlayerCash(player: Player | null, amount: number): boolean {
  if (!player || !player.inventory) return false;
  const currentCash = getPlayerCash(player);
  if (currentCash < amount) return false;

  let remaining = amount;
  for (let i = player.inventory.length - 1; i >= 0; i--) {
    const item = player.inventory[i];
    if (item && item.itemId === 'cash') {
      if (item.count <= remaining) {
        remaining -= item.count;
        player.inventory.splice(i, 1);
      } else {
        item.count -= remaining;
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
    createItem('zippo_lighter', 1),
    createItem('extinguisher', 1),
    createItem('fuel_canister', 1),
    createItem('cash_5000', 1),
    createItem('cash_1000', 2),
    createItem('cash_500', 2),
    createItem('cash_100', 5),
    createItem('cash_50', 5),
    createItem('cash_10', 10),
    createItem('coin_10', 5),
    createItem('coin_5', 5),
    createItem('coin_2', 5),
    createItem('coin_1', 10),
    createItem('cash', 5000) // Lowered starting general cash slightly to account for the physical pile
  ];
}

export function addItemToPlayer(player: Player, itemToAdd: InventoryItem): boolean {
  if (!player.inventory) {
    player.inventory = [];
  }
  const maxSlots = player.maxInventorySlots || 18;

  // 1. Try to stack onto existing item of same itemId
  const existing = player.inventory.find(i => i && i.itemId === itemToAdd.itemId && i.count < i.maxStack);
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

  // 2. Find first empty slot from 0 to maxSlots - 1
  for (let i = 0; i < maxSlots; i++) {
    if (!player.inventory[i]) {
      player.inventory[i] = itemToAdd;
      addPlayerNotification(player, `Подобрано: ${itemToAdd.nameRu} (x${itemToAdd.count})`, 'pickup');
      return true;
    }
  }

  // 3. Push if array length < maxSlots
  if (player.inventory.length < maxSlots) {
    player.inventory.push(itemToAdd);
    addPlayerNotification(player, `Подобрано: ${itemToAdd.nameRu} (x${itemToAdd.count})`, 'pickup');
    return true;
  }

  addPlayerNotification(player, 'Инвентарь полон!', 'warning');
  return false;
}

export function moveInventoryItem(player: Player, fromIdx: number, toIdx: number): boolean {
  if (!player.inventory) player.inventory = [];
  const maxSlots = player.maxInventorySlots || 18;
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= maxSlots || toIdx >= maxSlots) {
    return false;
  }

  while (player.inventory.length < maxSlots) {
    player.inventory.push(undefined as any);
  }

  const itemFrom = player.inventory[fromIdx];
  const itemTo = player.inventory[toIdx];

  if (!itemFrom) return false;

  if (itemTo && itemTo.itemId === itemFrom.itemId && itemTo.maxStack > 1 && itemTo.count < itemTo.maxStack) {
    const spaceLeft = itemTo.maxStack - itemTo.count;
    const transferCount = Math.min(spaceLeft, itemFrom.count);
    itemTo.count += transferCount;
    itemFrom.count -= transferCount;
    if (itemFrom.count <= 0) {
      player.inventory[fromIdx] = undefined as any;
    }
  } else {
    player.inventory[fromIdx] = itemTo;
    player.inventory[toIdx] = itemFrom;
  }

  while (player.inventory.length > 0 && player.inventory[player.inventory.length - 1] === undefined) {
    player.inventory.pop();
  }

  return true;
}

export function removeItemFromPlayer(player: Player, itemIndex: number, count: number = 1): InventoryItem | null {
  if (!player.inventory || itemIndex < 0 || itemIndex >= player.inventory.length) {
    return null;
  }
  const item = player.inventory[itemIndex];
  if (!item) return null;
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
  if (!item || !item.usable) {
    return { success: false, message: 'Этот предмет нельзя использовать напрямую' };
  }

  // Physical banknotes & coins deposits
  if (item.itemId.startsWith('cash_') || item.itemId.startsWith('coin_')) {
    let value = 0;
    if (item.itemId === 'cash_5000') value = 5000;
    else if (item.itemId === 'cash_1000') value = 1000;
    else if (item.itemId === 'cash_500') value = 500;
    else if (item.itemId === 'cash_100') value = 100;
    else if (item.itemId === 'cash_50') value = 50;
    else if (item.itemId === 'cash_10') value = 10;
    else if (item.itemId === 'coin_10') value = 10;
    else if (item.itemId === 'coin_5') value = 5;
    else if (item.itemId === 'coin_2') value = 2;
    else if (item.itemId === 'coin_1') value = 1;

    if (value > 0) {
      const count = item.count;
      addPlayerCash(player, value * count);
      removeItemFromPlayer(player, itemIndex, count);
      sound.playPickup();
      addPlayerNotification(player, `Зачислено в кошелёк: +$${value * count}`, 'pickup');
      return { success: true, message: `Зачислено в кошелёк: +$${value * count}` };
    }
  }

  const def = ITEM_CATALOG[item.itemId];

  // Special repair tool usage
  if (item.itemId === 'repair_kit') {
    if (player.isInVehicle && player.currentVehicleId && world) {
      const veh = world.vehicles.find(v => v.id === player.currentVehicleId);
      if (veh) {
        if (veh.damage) {
          veh.damage.engineSmoking = false;
          veh.damage.underHoodSmolder = false;
          veh.damage.engineFire = false;
          veh.damage.fuelTankFire = false;
          veh.damage.fuelTankBurntThrough = false;
          veh.damage.cabinFire = false;
          veh.damage.fireTimer = 0;
          veh.damage.fireProgress = 0;
          veh.damage.fireIntensity = 0;
          veh.damage.groundPuddleIgnited = false;
          veh.cabinSmoke = 0;
          veh.damage.frontCrumple = 0;
          veh.damage.rearCrumple = 0;
          veh.damage.leftDent = 0;
          veh.damage.rightDent = 0;
          veh.damage.frontLeftDent = 0;
          veh.damage.frontRightDent = 0;
          veh.damage.rearLeftDent = 0;
          veh.damage.rearRightDent = 0;
          veh.damage.frontLeftSuspensionDamage = 0;
          veh.damage.frontRightSuspensionDamage = 0;
          veh.damage.rearLeftSuspensionDamage = 0;
          veh.damage.rearRightSuspensionDamage = 0;
          veh.damage.steeringDrift = 0;
          veh.damage.wheelRubResistance = 0;
          veh.damage.windshieldCracked = false;
          veh.damage.rearGlassCracked = false;
          veh.damage.hoodBuckled = false;
          veh.damage.scratches = [];
        }
        if (veh.engineState) {
          veh.engineState.radiatorWater = 100;
          veh.engineState.radiatorPunctured = false;
          veh.engineState.oilLevel = 100;
          veh.engineState.oilPunctured = false;
          veh.engineState.oilPressure = 100;
          veh.engineState.batteryCharge = 100;
          veh.engineState.starterWorking = true;
          veh.engineState.temperature = 88;
          veh.engineState.engineKnocking = false;
          veh.engineState.engineStalled = false;
          veh.engineState.overheatingSteam = false;
        }
        if (veh.fuelSystem) {
          veh.fuelSystem.tankPunctured = false;
        }
        removeItemFromPlayer(player, itemIndex, 1);
        sound.playPropBreak('hydrant');
        addPlayerNotification(player, '🔧 Узлы двигателя, подвеска и кузов автомобиля полностью отремонтированы!', 'heal');
        return { success: true, message: 'Автомобиль отремонтирован' };
      }
    } else {
      addPlayerNotification(player, 'Сядьте в поврежденный автомобиль для ремонта!', 'warning');
      return { success: false, message: 'Нужно быть в авто' };
    }
  }

  // Gasoline Canister usage (spills fuel puddles on ground or refuels nearby vehicle)
  if (item.itemId === 'fuel_canister') {
    const maxPortions = item.maxPortions || def?.biteCount || 20;
    const currentPortions = item.portions !== undefined ? item.portions : maxPortions;

    sound.playWaterSpray();

    let refueledVehicleName: string | null = null;

    if (world) {
      // 1. Check if standing near/in a vehicle needing fuel
      for (const veh of world.vehicles) {
        const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
        if (dist < 100 || (player.isInVehicle && player.currentVehicleId === veh.id)) {
          if (veh.fuelSystem && veh.fuelSystem.tankLevel < 100) {
            const capacity = veh.fuelSystem.tankCapacity || 50;
            const currentLiters = (veh.fuelSystem.tankLevel / 100) * capacity;
            const newLiters = Math.min(capacity, currentLiters + 5); // add 5 liters
            veh.fuelSystem.tankLevel = Math.min(100, (newLiters / capacity) * 100);
            refueledVehicleName = veh.type ? `автомобиль (${veh.type.toUpperCase()})` : 'автомобиль';
            break;
          }
        }
      }

      // 2. If not refueling a car, spill a fuel puddle (FluidStain) on ground
      if (!refueledVehicleName) {
        const angle = player.aimAngle !== undefined ? player.aimAngle : player.angle;
        const stainX = player.x + Math.cos(angle) * 22;
        const stainY = player.y + Math.sin(angle) * 22;

        if (!world.stains) world.stains = [];

        // Check if expanding an existing nearby fuel stain
        let existingStain = world.stains.find(st => st.type === 'fuel' && Math.hypot(st.x - stainX, st.y - stainY) < 45);
        if (existingStain) {
          existingStain.radius = Math.min(90, existingStain.radius + 15);
          existingStain.life = 0; // reset decay timer
        } else {
          world.stains.push({
            id: `stain_fuel_${Date.now()}_${Math.random()}`,
            x: stainX,
            y: stainY,
            radius: 24,
            maxRadius: 75,
            type: 'fuel',
            alpha: 0.85,
            life: 0,
            maxLife: 600,
            onFire: false,
            fireIntensity: 0
          });
        }

        // Spawn splash golden fuel droplets
        for (let i = 0; i < 12; i++) {
          const pAngle = angle + (Math.random() * 0.9 - 0.45);
          const pSpeed = 35 + Math.random() * 55;
          world.particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            radius: 2 + Math.random() * 3,
            color: Math.random() < 0.7 ? '#eab308' : '#ca8a04',
            alpha: 0.95,
            life: 0,
            maxLife: 0.35,
            type: 'debris'
          });
        }
      }
    }

    const remaining = currentPortions - 1;
    item.portions = remaining;
    item.maxPortions = maxPortions;

    if (remaining % 5 === 0 || remaining === maxPortions - 1) {
      if (refueledVehicleName) {
        addPlayerNotification(player, `⛽ Вы заправили ${refueledVehicleName}! (Осталось: ${remaining}/${maxPortions}л)`, 'heal');
      } else {
        addPlayerNotification(player, `⛽ Вы разлили бензин на землю! (Осталось: ${remaining}/${maxPortions}л)`, 'info');
      }
    }

    if (remaining <= 0) {
      if (item.count > 1) {
        item.count -= 1;
        item.portions = maxPortions;
      } else {
        removeItemFromPlayer(player, itemIndex, 1);
      }
      const leftover = createItem('canister_empty', 1);
      addItemToPlayer(player, leftover);
      addPlayerNotification(player, '🛢️ В канистре полностью закончился бензин!', 'warning');
    }

    return { success: true, message: 'Бензин залит/разлит' };
  }

  // Zippo Lighter usage (finite charges, ignites puddles & leaks)
  if (item.itemId === 'zippo_lighter') {
    const maxPortions = item.maxPortions || def?.biteCount || 10;
    const currentPortions = item.portions !== undefined ? item.portions : maxPortions;

    // Spawn sparks / flame particles
    if (world) {
      for (let i = 0; i < 10; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = 15 + Math.random() * 40;
        world.particles.push({
          x: player.x + (Math.random() * 10 - 5),
          y: player.y + (Math.random() * 10 - 5),
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed - 15,
          radius: 2 + Math.random() * 3,
          color: Math.random() < 0.6 ? '#f97316' : '#ef4444',
          alpha: 0.95,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.2,
          type: 'flame'
        });
      }
    }

    sound.playPropBreak('fire');

    let ignitedStainsCount = 0;
    let ignitedCarFuel = false;

    if (world) {
      // 1. Check unignited stains nearby (oil / fuel)
      if (world.stains) {
        for (const st of world.stains) {
          if (!st.onFire && Math.hypot(st.x - player.x, st.y - player.y) < 120) {
            if (st.type === 'fuel' || st.type === 'oil') {
              st.onFire = true;
              st.fireIntensity = 1.0;
              ignitedStainsCount++;

              // Burst of flames
              for (let f = 0; f < 12; f++) {
                world.particles.push({
                  x: st.x + (Math.random() * st.radius - st.radius / 2),
                  y: st.y + (Math.random() * st.radius - st.radius / 2),
                  vx: (Math.random() - 0.5) * 35,
                  vy: -25 - Math.random() * 35,
                  radius: 3 + Math.random() * 4,
                  color: '#f97316',
                  alpha: 0.9,
                  life: 0,
                  maxLife: 0.45,
                  type: 'flame'
                });
              }
            }
          }
        }
      }

      // 2. Check nearby vehicles with fuel/oil leaks
      for (const veh of world.vehicles) {
        const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
        if (dist < 120 || (player.isInVehicle && player.currentVehicleId === veh.id)) {
          if (veh.damage) {
            const hasLeak = veh.fuelSystem?.tankPunctured || veh.engineState?.oilPunctured || veh.damage.underHoodSmolder;
            if (hasLeak && !veh.damage.fuelTankFire && !veh.damage.engineFire) {
              veh.damage.fuelTankFire = true;
              veh.damage.engineFire = true;
              veh.damage.fireIntensity = 0.8;
              veh.damage.fireProgress = 0.2;
              veh.damage.groundPuddleIgnited = true;
              ignitedCarFuel = true;
            }
          }
        }
      }
    }

    const remaining = currentPortions - 1;
    item.portions = remaining;
    item.maxPortions = maxPortions;

    let msg = '';
    if (ignitedCarFuel) {
      msg = `🔥 Вы поджгли вытекающее топливо автомобиля! (Осталось зажиганий: ${remaining}/${maxPortions})`;
      addPlayerNotification(player, msg, 'warning');
    } else if (ignitedStainsCount > 0) {
      msg = `🔥 Вы поджгли лужу бензина/масла! (Осталось зажиганий: ${remaining}/${maxPortions})`;
      addPlayerNotification(player, msg, 'warning');
    } else {
      msg = `🔥 Вспышка Zippo! Поблизости нет горючих жидкостей. (Осталось зажиганий: ${remaining}/${maxPortions})`;
      addPlayerNotification(player, msg, 'info');
    }

    if (remaining <= 0) {
      if (item.count > 1) {
        item.count -= 1;
        item.portions = maxPortions;
      } else {
        removeItemFromPlayer(player, itemIndex, 1);
      }
      const leftover = createItem('zippo_empty', 1);
      addItemToPlayer(player, leftover);
      addPlayerNotification(player, '🔥 В зажигалке Zippo закончился бензин и кремень!', 'warning');
    }

    return { success: true, message: 'Зажигалка Zippo использована' };
  }

  // Fire extinguisher usage (volume/capacity, foam spray, gradual/partial fire suppression)
  if (item.itemId === 'extinguisher') {
    const maxPortions = item.maxPortions || def?.biteCount || 10;
    const currentPortions = item.portions !== undefined ? item.portions : maxPortions;

    // Spawn foam powder stream particles
    if (world) {
      const sprayAngle = player.aimAngle !== undefined ? player.aimAngle : player.angle;
      for (let i = 0; i < 7; i++) {
        const pAngle = sprayAngle + (Math.random() * 0.7 - 0.35);
        const pSpeed = 80 + Math.random() * 120;
        world.particles.push({
          x: player.x + Math.cos(sprayAngle) * 16,
          y: player.y + Math.sin(sprayAngle) * 16,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          radius: 4 + Math.random() * 3,
          color: '#f8fafc',
          alpha: 0.85,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
          type: 'tire_smoke'
        });
      }
    }

    sound.playPropBreak('hydrant');

    let extinguishedStainsCount = 0;
    let carFireReduced = false;
    let carFireExtinguished = false;

    if (world) {
      // 1. Extinguish ground stains nearby (small ground fires put out easily)
      if (world.stains) {
        for (const st of world.stains) {
          if (st.onFire && Math.hypot(st.x - player.x, st.y - player.y) < 130) {
            st.onFire = false;
            st.fireIntensity = 0;
            extinguishedStainsCount++;
          }
        }
      }

      // 2. Reduce or extinguish vehicle fires nearby
      for (const veh of world.vehicles) {
        const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
        if (dist < 130 || (player.isInVehicle && player.currentVehicleId === veh.id)) {
          if (veh.damage && (veh.damage.engineFire || veh.damage.fuelTankFire || veh.damage.cabinFire || veh.damage.underHoodSmolder || (veh.damage.fireIntensity || 0) > 0)) {
            veh.damage.fireIntensity = Math.max(0, (veh.damage.fireIntensity || 1.0) - 0.35);
            veh.damage.fireProgress = Math.max(0, (veh.damage.fireProgress || 1.0) - 0.25);
            if (veh.cabinSmoke) {
              veh.cabinSmoke = Math.max(0, veh.cabinSmoke - 35);
            }

            if (veh.damage.fireIntensity <= 0 && veh.damage.fireProgress <= 0) {
              veh.damage.engineFire = false;
              veh.damage.fuelTankFire = false;
              veh.damage.cabinFire = false;
              veh.damage.underHoodSmolder = false;
              veh.damage.engineSmoking = false;
              veh.damage.fireTimer = 0;
              veh.damage.fireProgress = 0;
              veh.damage.fireIntensity = 0;
              veh.damage.groundPuddleIgnited = false;
              carFireExtinguished = true;
            } else {
              carFireReduced = true;
            }
          }
        }
      }
    }

    const remaining = currentPortions - 1;
    item.portions = remaining;
    item.maxPortions = maxPortions;

    let msg = '';
    if (carFireExtinguished) {
      msg = `🧯 Пожар автомобиля полностью потушен! (Осталось пены: ${remaining}/${maxPortions})`;
      addPlayerNotification(player, msg, 'heal');
    } else if (carFireReduced) {
      msg = `🧯 Вы сбили пламя пеной, но машина всё ещё пылает! Потребуется ещё пена. (${remaining}/${maxPortions})`;
      addPlayerNotification(player, msg, 'warning');
    } else if (extinguishedStainsCount > 0) {
      msg = `🧯 Затушено горевших луж: ${extinguishedStainsCount}. (${remaining}/${maxPortions})`;
      addPlayerNotification(player, msg, 'heal');
    } else {
      msg = `🧯 Выпустили струю пены. Поблизости нет огня. (${remaining}/${maxPortions})`;
      addPlayerNotification(player, msg, 'info');
    }

    if (remaining <= 0) {
      if (item.count > 1) {
        item.count -= 1;
        item.portions = maxPortions;
      } else {
        removeItemFromPlayer(player, itemIndex, 1);
      }
      const leftover = createItem('extinguisher_empty', 1);
      addItemToPlayer(player, leftover);
      addPlayerNotification(player, '🧯 В огнетушителе закончился заряд пены!', 'warning');
    }

    return { success: true, message: 'Огнетушитель использован' };
  }

  // Flashlight toggle
  if (item.itemId === 'flashlight') {
    player.heldItemId = player.heldItemId === 'flashlight' ? null : 'flashlight';
    sound.playAlert();
    addPlayerNotification(player, player.heldItemId ? '🔦 Фонарик включен' : '🔦 Фонарик выключен', 'info');
    return { success: true, message: 'Фонарик переключен' };
  }

  // Multi-portion / Bite-by-Bite logic for consumables (food, drink, medicine with multiple doses)
  const maxPortions = item.maxPortions || def?.biteCount || 1;
  const currentPortions = item.portions !== undefined ? item.portions : maxPortions;

  // Check fullness & nausea
  if ((item.category === 'food' || item.category === 'drink') && (player.needs.fullness || 0) >= 98) {
    if (item.category === 'food') {
      addPlayerNotification(player, 'Вы слишком сыты! Подождите, пока переварится...', 'warning');
      return { success: false, message: 'Слишком сытно' };
    } else {
      addPlayerNotification(player, 'Желудок полон! Больше не лезет...', 'warning');
      return { success: false, message: 'Желудок полон' };
    }
  }
  if ((player.needs.nausea || 0) >= 65) {
    addPlayerNotification(player, 'Вас тошнит! Нельзя есть или пить.', 'warning');
    return { success: false, message: 'Тошнит' };
  }

  if (maxPortions > 1) {

    const ratio = 1 / maxPortions;
    const hungerGain = item.effects.hunger ? Math.round((item.effects.hunger * ratio) * 10) / 10 : 0;
    const thirstGain = item.effects.thirst ? Math.round((item.effects.thirst * ratio) * 10) / 10 : 0;
    const healthGain = item.effects.health ? Math.round((item.effects.health * ratio) * 10) / 10 : 0;
    const energyGain = item.effects.energy ? Math.round((item.effects.energy * ratio) * 10) / 10 : 0;
    const sleepinessGain = item.effects.sleepiness ? Math.round((item.effects.sleepiness * ratio) * 10) / 10 : 0;

    if (hungerGain) player.needs.hunger = Math.min(100, Math.max(0, player.needs.hunger + hungerGain));
    if (thirstGain) {
      player.needs.thirst = Math.min(100, Math.max(0, player.needs.thirst + thirstGain));
      if (player.bodyState) player.bodyState.hydration = Math.min(100, player.bodyState.hydration + thirstGain);
    }
    if (healthGain) player.needs.health = Math.min(100, Math.max(0, player.needs.health + healthGain));
    if (energyGain) player.needs.energy = Math.min(100, Math.max(0, player.needs.energy + energyGain));
    if (sleepinessGain) player.needs.sleepiness = Math.min(100, Math.max(0, player.needs.sleepiness + sleepinessGain));

    const fGain = def?.fullnessPerBite !== undefined ? def.fullnessPerBite : (item.category === 'food' ? 3 : 1);
    player.needs.fullness = Math.min(100, (player.needs.fullness || 0) + fGain);
    if ((player.needs.fullness || 0) > 88) {
      player.needs.nausea = Math.min(100, (player.needs.nausea || 0) + 4);
    }

    // Specific item effects
    if (item.itemId === 'painkillers' || item.itemId === 'morphine') {
      administerMedication(player, item.itemId);
    } else if (item.itemId === 'vitamins') {
      player.needs.energy = Math.min(100, player.needs.energy + 4);
      administerMedication(player, 'vitamins');
    } else if (item.itemId === 'panthenol_spray') {
      applyPanthenolSpray(player, targetInjuryId);
    } else if (item.itemId === 'spasatel_ointment') {
      applySpasatelOintment(player, targetInjuryId);
    } else if (item.itemId === 'zelenka') {
      applyZelenka(player, targetInjuryId);
    } else if (item.itemId === 'iodine') {
      applyIodine(player, targetInjuryId);
    } else if (item.itemId === 'diclofenac_gel') {
      applyDiclofenacGel(player, targetInjuryId);
    } else if (item.itemId === 'hydrogen_peroxide') {
      applyHydrogenPeroxide(player, targetInjuryId);
    } else if (item.itemId === 'ammonia_spirit') {
      applyAmmoniaSpirit(player);
    } else if (item.itemId === 'balm_star') {
      applyBalmStar(player);
    } else if (item.itemId === 'activated_charcoal') {
      applyActivatedCharcoal(player);
    } else if (item.itemId === 'valerian_drops') {
      applyValerianDrops(player);
    } else if (item.itemId === 'antiseptic' && player.bodyState) {
      applyAntiseptic(player, targetInjuryId);
    }

    // Soothe panic & fear when eating, drinking, or taking medicine
    if (item.category === 'food') soothePanic(player, 18);
    else if (item.category === 'drink') soothePanic(player, 25);
    else soothePanic(player, 35);

    // Play sound
    if (item.category === 'food') {
      sound.playEat();
    } else if (item.category === 'drink') {
      sound.playDrink();
    } else {
      sound.playUseItem();
    }

    const remaining = currentPortions - 1;
    item.portions = remaining;
    item.maxPortions = maxPortions;

    let taste = '';
    if (def?.tasteMessages && def.tasteMessages.length > 0) {
      taste = def.tasteMessages[Math.floor(Math.random() * def.tasteMessages.length)];
    }

    const unitLabel = item.category === 'drink' ? 'глотков' : item.category === 'food' ? 'укусов' : (item.itemId === 'painkillers' || item.itemId === 'vitamins' ? 'таблеток' : 'применений');

    if (remaining <= 0) {
      // Completely finished!
      if (item.count > 1) {
        item.count -= 1;
        item.portions = maxPortions;
      } else {
        removeItemFromPlayer(player, itemIndex, 1);
      }

      if (def?.leftoverId) {
        const leftover = createItem(def.leftoverId, 1);
        addItemToPlayer(player, leftover);
        addPlayerNotification(player, `🗑️ Вы закончили ${item.nameRu}. Осталась упаковка: ${def.leftoverNameRu || leftover.nameRu}`, 'info');
      } else {
        addPlayerNotification(player, `✅ ${item.nameRu} полностью закончен!`, 'food');
      }
    } else {
      // Throttle notifications for high-charge rapid items (e.g. extinguisher)
      if (item.itemId !== 'extinguisher' || remaining % 10 === 0 || remaining === maxPortions - 1) {
        addPlayerNotification(
          player,
          `${item.category === 'drink' ? '🥤' : item.category === 'food' ? '🍽️' : '🧯'} ${taste || item.nameRu} (${remaining}/${maxPortions} ${unitLabel})`,
          item.category === 'drink' ? 'drink' : item.category === 'food' ? 'food' : 'heal'
        );
      }
    }

    return { success: true, message: `Использовано: ${item.nameRu}` };
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

  // Apply Fullness for single portion items
  if (item.category === 'food' || item.category === 'drink') {
    const fGain = def?.fullnessPerBite !== undefined ? def.fullnessPerBite : (item.category === 'food' ? 20 : 15);
    player.needs.fullness = Math.min(100, (player.needs.fullness || 0) + fGain);
    if ((player.needs.fullness || 0) > 88) {
      player.needs.nausea = Math.min(100, (player.needs.nausea || 0) + 4);
    }
  }

  // Body State medical treatment
  if (player.bodyState && item.category === 'med') {
    if (item.itemId === 'bandage') {
      const res = applyBandage(player, targetInjuryId);
      if (!res && targetInjuryId) {
        return { success: false, message: 'Этот бинт нельзя применить к этой травме' };
      }
    } else if (item.itemId === 'splint') {
      const res = applySplint(player, targetInjuryId);
      if (!res && targetInjuryId) {
        return { success: false, message: 'Шину можно наложить только на свежий перелом' };
      }
    } else if (item.itemId === 'medical_patch') {
      const res = applyMedicalPatch(player, targetInjuryId);
      if (!res && targetInjuryId) {
        return { success: false, message: 'Пластырь не подходит для этой травмы' };
      }
    } else if (item.itemId === 'antiseptic') {
      const res = applyAntiseptic(player, targetInjuryId);
      if (!res && targetInjuryId) {
        return { success: false, message: 'Антисептик не подходит для этой травмы' };
      }
    } else if (item.itemId === 'panthenol_spray') {
      applyPanthenolSpray(player, targetInjuryId);
    } else if (item.itemId === 'spasatel_ointment') {
      applySpasatelOintment(player, targetInjuryId);
    } else if (item.itemId === 'zelenka') {
      applyZelenka(player, targetInjuryId);
    } else if (item.itemId === 'iodine') {
      applyIodine(player, targetInjuryId);
    } else if (item.itemId === 'diclofenac_gel') {
      applyDiclofenacGel(player, targetInjuryId);
    } else if (item.itemId === 'hydrogen_peroxide') {
      applyHydrogenPeroxide(player, targetInjuryId);
    } else if (item.itemId === 'ammonia_spirit') {
      applyAmmoniaSpirit(player);
    } else if (item.itemId === 'balm_star') {
      applyBalmStar(player);
    } else if (item.itemId === 'activated_charcoal') {
      applyActivatedCharcoal(player);
    } else if (item.itemId === 'valerian_drops') {
      applyValerianDrops(player);
    } else if (item.itemId === 'medkit') {
      applyMedkit(player);
    } else if (item.itemId === 'painkillers' || item.itemId === 'morphine') {
      administerMedication(player, item.itemId);
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

  // Soothe panic & fear when consuming single portion items
  if (item.category === 'food') soothePanic(player, 30);
  else if (item.category === 'drink') soothePanic(player, 40);
  else soothePanic(player, 50);

  // Play appropriate procedural sound
  if (item.category === 'med') {
    sound.playUseItem();
    addPlayerNotification(player, `Использовано: ${item.nameRu}`, 'heal');
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
  _player: Player,
  _text: string,
  _type: 'heal' | 'food' | 'drink' | 'energy' | 'sleep' | 'warning' | 'pickup' | 'info' = 'info'
) {
  // Notifications removed per user request
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
    if (!item) return false;
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
    const item = player.inventory[i];
    if (item && item.itemId === 'litter_trash') {
      const count = item.count;
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



export function equipClothing(player: Player, inventoryIndex: number) {
  const item = player.inventory[inventoryIndex];
  if (!item || !item.clothingStats) return { success: false, message: 'Это не одежда' };
  
  const stats = item.clothingStats;
  player.equippedClothing = player.equippedClothing || {};
  player.equippedClothing[stats.slot] = player.equippedClothing[stats.slot] || {};
  
  // If there is already something in this layer, we should probably swap it, 
  // but for now let's just unequip it and put it in inventory
  if (player.equippedClothing[stats.slot]![stats.layer]) {
    const existing = player.equippedClothing[stats.slot]![stats.layer]!;
    player.inventory[inventoryIndex] = existing;
  } else {
    // Remove from inventory
    player.inventory.splice(inventoryIndex, 1);
  }
  player.equippedClothing[stats.slot]![stats.layer] = item;
  return { success: true, message: 'Одежда надета' };
}

export function unequipClothing(player: Player, slot: import('./types').ClothingSlot, layer: import('./types').ClothingLayer) {
  if (!player.equippedClothing || !player.equippedClothing[slot] || !player.equippedClothing[slot]![layer]) return { success: false };
  
  const item = player.equippedClothing[slot]![layer]!;
  
  if (player.inventory.length >= player.maxInventorySlots) {
    return { success: false, message: 'Инвентарь полон' };
  }
  
  player.inventory.push(item);
  delete player.equippedClothing[slot]![layer];
  return { success: true, message: 'Одежда снята' };
}

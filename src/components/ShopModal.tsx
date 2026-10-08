import React, { useState, useEffect, useRef } from 'react';
import { Player, GasPumpDispenser, FuelType, Vehicle } from '../types';
import { ItemIconCanvas } from './ItemIconCanvas';
import { 
  ShoppingBag, 
  X, 
  DollarSign, 
  Wrench, 
  ShoppingCart, 
  Plus, 
  Minus, 
  ArrowLeft, 
  Video, 
  Check, 
  Trash2, 
  Coins, 
  Sparkles, 
  Info,
  Fuel,
  Flame,
  Zap,
  Droplets,
  Activity,
  Gauge,
  Palette,
  Car,
  AlertTriangle,
  Lightbulb,
  Receipt,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Package,
  RefreshCw,
  Cpu,
  Eye,
  Disc
} from 'lucide-react';
import { sound } from '../audio';
import { 
  getPlayerCash, 
  getAllPlayerItemsFlat, 
  deductPlayerCash, 
  getPlayerDenominations, 
  calcOptimalTrayPayment,
  PlayerDenomInfo 
} from '../items';
import { FUEL_GRADES } from '../gasStationSystem';
import { createDefaultVehicleDamage, isTrailerVehicle } from '../vehicleHelpers';

export interface ShopItem {
  id: string;
  itemId: string;
  nameRu: string;
  price: number;
  description: string;
  category: 'food' | 'medical' | 'auto';
  effectText: string;
  fuelPumpId?: string;
  fuelLiters?: number;
  fuelType?: FuelType;
}

export interface CityShop {
  id: string;
  nameRu: string;
  type: 
    | 'supermarket' 
    | 'pharmacy' 
    | 'auto_shop' 
    | 'cafe' 
    | 'gear_shop'
    | 'fast_food'
    | 'pizzeria'
    | 'sushi_asian'
    | 'cinema_bar'
    | 'electronics'
    | 'clothing'
    | 'bookstore'
    | 'sports_shop'
    | 'car_dealership'
    | 'furniture_shop'
    | 'gas_station_shop';
  x: number;
  y: number;
  icon: string;
  badgeColor: string;
  description: string;
}

export const CITY_SHOPS: CityShop[] = [
  {
    id: 'shop_perekrestok_main',
    nameRu: 'Супермаркет "Спутник 24/7"',
    type: 'supermarket',
    x: 3442,
    y: 2685,
    icon: '[ТОРГ]',
    badgeColor: '#16a34a',
    description: 'Флагманский продуктовый супермаркет: свежие продукты, бакалея, напитки и готовая кулинария.'
  },
  {
    id: 'shop_furniture_mall',
    nameRu: 'Гипермаркет мебели "Комфорт & Уютный Дом"',
    type: 'furniture_shop',
    x: 3650,
    y: 2955,
    icon: '[МЕБЕЛЬ]',
    badgeColor: '#b45309',
    description: 'Диваны, кровати, столы, стулья, бытовые холодильники, ЖК-телевизоры, стеллажи и декор для квартир.'
  },
  {
    id: 'shop_fastfood_mall',
    nameRu: 'Ресторан "Экспресс-Бургер"',
    type: 'fast_food',
    x: 3728,
    y: 2955,
    icon: '[ЕДА]',
    badgeColor: '#dc2626',
    description: 'Горячие бургеры, картофель фри, хрустящие наггетсы и прохладительные напитки.'
  },
  {
    id: 'shop_pizzeria_mall',
    nameRu: 'Пиццерия "Пицца-Империя"',
    type: 'pizzeria',
    x: 3728,
    y: 2685,
    icon: '[ПИЦЦА]',
    badgeColor: '#ea580c',
    description: 'Свежая горячая пицца Пепперони, чикен-роллы, морсы и десерты.'
  },
  {
    id: 'shop_sushi_mall',
    nameRu: 'Суши & WOK "Сакура"',
    type: 'sushi_asian',
    x: 3800,
    y: 2685,
    icon: '[СУШИ]',
    badgeColor: '#e11d48',
    description: 'Сеты роллов Филадельфия, горячая вок-лапша с курицей и зеленый чай.'
  },
  {
    id: 'shop_cinema_mall',
    nameRu: 'Кинобар "Горизонт"',
    type: 'cinema_bar',
    x: 3880,
    y: 2685,
    icon: '[КИНО]',
    badgeColor: '#9333ea',
    description: 'Карамельный попкорн, начос с сырным соусом чеддер и прохладительные напитки.'
  },
  {
    id: 'shop_electronics_mall',
    nameRu: 'Гипермаркет электроники "Техно-Мир"',
    type: 'electronics',
    x: 3442,
    y: 2955,
    icon: '[ТЕХ]',
    badgeColor: '#2563eb',
    description: 'Повербанки высокой емкости, смарт-часы, рации дальнего действия, фонари и гаджеты.'
  },
  {
    id: 'shop_clothing_mall',
    nameRu: 'Магазин одежды "Империя Стиля"',
    type: 'clothing',
    x: 3500,
    y: 2685,
    icon: '[ОДЕЖДА]',
    badgeColor: '#4f46e5',
    description: 'Городская одежда, куртки мембранные, беговые кроссовки и защитные аксессуары.'
  },
  {
    id: 'shop_books_mall',
    nameRu: 'Книжная лавка "Слово"',
    type: 'bookstore',
    x: 3550,
    y: 2685,
    icon: '[КНИГИ]',
    badgeColor: '#0891b2',
    description: 'Путеводители, атласы дорог, блокноты и письменные принадлежности.'
  },
  {
    id: 'shop_sports_mall',
    nameRu: 'Спорттовары "Атлет"',
    type: 'sports_shop',
    x: 3600,
    y: 2685,
    icon: '[СПОРТ]',
    badgeColor: '#0284c7',
    description: 'Спортивная обувь, изотоники, термобелье, бандажи и туризм.'
  },
  {
    id: 'shop_pharmacy_downtown',
    nameRu: 'Аптека "Пульс 24/7"',
    type: 'pharmacy',
    x: 3950,
    y: 2150,
    icon: '[МЕД]',
    badgeColor: '#059669',
    description: 'Медикаменты, перевязочные средства, антисептики и анальгетики.'
  },
  {
    id: 'shop_autoshop_industrial',
    nameRu: 'Автозапчасти "PIT-STOP"',
    type: 'auto_shop',
    x: 2500,
    y: 3500,
    icon: '[АВТО]',
    badgeColor: '#d97706',
    description: 'Масла, антифриз, аккумуляторы, огнетушители, инструменты и тросы.'
  },
  {
    id: 'shop_gear_forest',
    nameRu: 'Магазин "Охота & Рыбалка"',
    type: 'gear_shop',
    x: 1200,
    y: 1800,
    icon: '[СНАР]',
    badgeColor: '#15803d',
    description: 'Сухпайки, фляги, фонари, термокуртки, спальники и компасы.'
  },
  {
    id: 'shop_gas_station_main',
    nameRu: 'Минимаркет АЗС "ПраймНефть"',
    type: 'gas_station_shop',
    x: 4300,
    y: 3300,
    icon: '[АЗС]',
    badgeColor: '#0284c7',
    description: 'Экспресс-товары: хот-доги, свежий кофе, автохимия, канистры и энергетики.'
  }
];

export function getLPGConfigForVehicle(carType: string) {
  const isBike = carType.startsWith('moto_') || carType.startsWith('moped_');
  if (isBike) {
    return {
      isAvailable: false,
      kitName: 'ГБО не поддерживается',
      kitSubName: 'Двухколесный мототранспорт',
      capacity: 0,
      description: 'На мотоциклах и мопедах отсутствует необходимое рамное пространство для монтажа баллонов высокого давления и редуктора подогрева.',
      price: 0,
      removePrice: 0,
      advantagesTitle: 'Ограничение установки:',
      advantages: [
        { title: 'Габариты рамы:', text: 'Конструкция мототехники не предусматривает безопасного размещения сертифицированного баллона.' },
        { title: 'Рекомендация:', text: 'Используйте бензин АИ-92/95 с добавлением двухтактного масла (для 2Т) или чистое топливо.' }
      ],
      installAnimationText: ''
    };
  }

  const isHeavyTruck = [
    'truck_dump', 'truck_box', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered',
    'cement_mixer', 'garbage_truck', 'bus', 'fire_engine', 'fire_ladder', 'truck_semi'
  ].includes(carType) || carType.includes('semi') || carType.startsWith('truck_') && !['truck_tow', 'truck_armored'].includes(carType);

  if (isHeavyTruck) {
    return {
      isAvailable: true,
      kitName: 'Магистральное ГБО "Титан-Трак 200L"',
      kitSubName: 'Грузовые автомобили, Тягачи & Автобусы',
      capacity: 200,
      description: 'Сверхъемкий цилиндрический баллон 200л на шасси рамы, сдвоенный редуктор высокого давления "Титан-Макс" (до 500 л.с.), газодизельный/газовый впрыск и армированные стальные магистрали.',
      price: 78000,
      removePrice: 7800,
      advantagesTitle: 'Преимущества тяжелого ГБО "Титан-Трак":',
      advantages: [
        { title: 'Автономия до 1200+ км:', text: 'Два бака обеспечивают колоссальный запас хода для дальних грузовых рейсов и рейсов с прицепом.' },
        { title: 'Экономия до 50%:', text: 'Кардинальное снижение себестоимости километра пробега для коммерческих перевозок.' },
        { title: 'Защита поршневой группы:', text: 'Мягкое бездетонационное сгорание газа продлевает ресурс масла и шатунно-поршневой группы.' }
      ],
      installAnimationText: 'Идет монтаж тяжелого рамного баллона 200L, сдвоенного редуктора "Титан-Макс" и опрессовка магистралей...'
    };
  }

  const isCommercialVan = [
    'delivery_truck', 'van_cargo_old', 'van', 'bus_minibus', 'truck_armored', 'truck_tow'
  ].includes(carType);

  if (isCommercialVan) {
    return {
      isAvailable: true,
      kitName: 'Коммерческое ГБО "Газель-Мастер 120L"',
      kitSubName: 'Фургоны, Газели, Инкассация & Эвакуаторы',
      capacity: 120,
      description: 'Усиленный рамный баллон 120л под грузовую платформу, редуктор с подогревом от контура охлаждения ДВС, скоростные форсунки и фильтр с циклонным сепаратором.',
      price: 54000,
      removePrice: 5400,
      advantagesTitle: 'Преимущества коммерческого ГБО:',
      advantages: [
        { title: 'Удвоенный пробег:', text: 'Объем 120л позволяет работать целую рабочую смену без необходимости заездов на АЗС.' },
        { title: 'Быстрая окупаемость:', text: 'При активной коммерческой эксплуатации комплект окупается всего за 2-3 недели.' },
        { title: 'Стабильное давление:', text: 'Обогреваемый редуктор гарантирует стабильную подачу газа даже в сильные морозы.' }
      ],
      installAnimationText: 'Идет монтаж рамного баллона 120L, подогреваемого редуктора и настройка коммерческого ЭБУ впрыска...'
    };
  }

  const isTractor = carType.startsWith('tractor_');
  if (isTractor) {
    return {
      isAvailable: true,
      kitName: 'Агро-ГБО "Беларус-Газ 100L"',
      kitSubName: 'Тракторы МТЗ & Сельхозтехника',
      capacity: 100,
      description: 'Боковой бронированный ресивер 100л на полураму трактора, виброустойчивый редуктор, фильтр грубой очистки газа и защита от пыли.',
      price: 48000,
      removePrice: 4800,
      advantagesTitle: 'Преимущества Агро-ГБО:',
      advantages: [
        { title: 'Работа в поле без простоев:', text: 'Дополнительные 100л газа обеспечивают длительную непрерывную вспашку и буксировку.' },
        { title: 'Виброустойчивость:', text: 'Специальные демпферные крепления баллона и магистралей выдерживают тяжелые полевые вибрации.' },
        { title: 'Чистый выхлоп:', text: 'Минимум копоти и сажи при работе навесного оборудования.' }
      ],
      installAnimationText: 'Идет монтаж виброустойчивого ресивера 100L на полураму МТЗ и подключение газодизельного смесителя...'
    };
  }

  const isSUVOrPickup = [
    'suv_luxury', 'crossover_compact', 'offroad_hardcore', 'pickup', 'pickup_heavy', 'ambulance_suv', 'van_camper', 'suv_classic_box'
  ].includes(carType) || carType.includes('suv') || carType.includes('pickup');

  if (isSUVOrPickup) {
    return {
      isAvailable: true,
      kitName: 'Тяжелое ГБО "Вектор Плюс 85L"',
      kitSubName: 'Внедорожники, Пикапы 4x4 & Кроссоверы',
      capacity: 85,
      description: 'Включает усиленный тороидальный/цилиндрический баллон 85л под днище, 2-ступенчатый редуктор "Вектор Макс" и армированные газовые магистрали со стальной защитой.',
      price: 65000,
      removePrice: 6500,
      advantagesTitle: 'Преимущества тяжелого ГБО "Вектор":',
      advantages: [
        { title: 'Запас хода до 950 км:', text: 'Два бака (бензин + пропан) дают максимальную автономию в дальних экспедициях.' },
        { title: 'Защищенный баллон:', text: 'Устанавливается под днище с сохранением клиренса и защитным стальным кожухом.' },
        { title: 'Мощный редуктор:', text: 'Обеспечивает уверенную тягу на бездорожье и при обгонах без просадок давления.' }
      ],
      installAnimationText: 'Идет монтаж защищенного баллона 85л под днище SUV и настройка редуктора "Вектор"...'
    };
  }

  const isSportOrSupercar = [
    'sports', 'muscle', 'supercar', 'muscle_classic', 'coupe_gt', 'hatch_hot'
  ].includes(carType) || carType.includes('sports') || carType.includes('supercar');

  if (isSportOrSupercar) {
    return {
      isAvailable: true,
      kitName: 'Спортивное ГБО "Спринт Турбо 50L"',
      kitSubName: 'Спорткары, V8 & High-Performance',
      capacity: 50,
      description: 'Облегченный композитный баллон 50л, сдвоенный турбо-редуктор "Спринт" (до 400+ л.с.), скоростные форсунки "Асахи" с временем открытия 1.8 мс.',
      price: 95000,
      removePrice: 9500,
      advantagesTitle: 'Преимущества спортивного ГБО "Спринт":',
      advantages: [
        { title: 'Нулевая потеря мощности:', text: 'Форсунки "Асахи" и турбо-редуктор сохраняют динамику разгона на 100%.' },
        { title: 'Композитный баллон:', text: 'Минимальный добавочный вес для идеальной развесовки кузова спорткара.' },
        { title: 'Высокое октановое число:', text: 'Пропан-бутан (105+ RON) предотвращает детонацию на высоких оборотах ДВС.' }
      ],
      installAnimationText: 'Идет установка высокоскоростных форсунок "Асахи", турбо-редуктора "Спринт" и калибровка впрыска...'
    };
  }

  const isLuxurySedan = ['sedan_luxury', 'wagon_allroad', 'classic_black', 'wagon_modern'].includes(carType);
  if (isLuxurySedan) {
    return {
      isAvailable: true,
      kitName: 'Премиум ГБО "Вектор OBD 65L"',
      kitSubName: 'Бизнес & Люкс автомобили',
      capacity: 65,
      description: 'Тороидальный баллон 65л в нишу запаски, редуктор "Вектор-М", ЭБУ с автоматической коррекцией по протоколу OBD-II.',
      price: 55000,
      removePrice: 5500,
      advantagesTitle: 'Преимущества "Вектор OBD":',
      advantages: [
        { title: 'OBD-II Автоадаптация:', text: 'ЭБУ ГБО непрерывно читает штатные топливные коррекции для идеальной смеси.' },
        { title: 'Бесшумная работа:', text: 'Мягкие мембраны редуктора и акустическая изоляция газовых форсунок.' },
        { title: 'Тихий комфорт:', text: 'Плавный неприметный переход с бензина на газ без дерганий и провалов.' }
      ],
      installAnimationText: 'Идет подсоединение ЭБУ ГБО к шине OBD-II, монтаж тихих форсунок и калибровка системы...'
    };
  }

  return {
    isAvailable: true,
    kitName: 'Комплект ГБО "Ловато / Лорен 4 55L"',
    kitSubName: 'Легковой автомобиль & Таксопарк',
    capacity: 55,
    description: 'Включает тороидальный баллон 55л на место запаски, электромагнитный редуктор "Лорен", рампу скоростных форсунок и ЭБУ газового впрыска 4-го поколения.',
    price: 42000,
    removePrice: 4200,
    advantagesTitle: 'Преимущества перехода на ГБО "Лорен":',
    advantages: [
      { title: 'Экономия более 50%:', text: 'Стоимость LPG пропан-бутана всего около 32 ₽/литр против 58 ₽ за бензин.' },
      { title: 'Антидетонация:', text: 'Октановое число газа — 105-110, двигатель работает мягче, исключен износ клапанов.' },
      { title: 'Двухтопливность:', text: 'Автоматический и ручной переход бензин / газ по одной кнопке.' }
    ],
    installAnimationText: 'Идет монтаж редуктора "Лорен", тороидального баллона 55л и прокладка магистралей...'
  };
}

export const SHOP_CATALOGS: Record<string, ShopItem[]> = {
  gas_station_shop: [
    { id: 'gas_canister_full', itemId: 'canister_metal_20l', nameRu: 'Канистра с бензином АИ-95 (20л)', price: 2360, description: 'Стальная 20-литровая канистра, заправленная бензином АИ-95.', category: 'auto', effectText: 'Заправка авто / 20L' },
    { id: 'gas_canister_empty', itemId: 'canister_plastic_10l', nameRu: 'Пластиковая канистра (10л)', price: 850, description: 'Ударопрочная канистра для набора топлива или спецжидкостей.', category: 'auto', effectText: 'Емкость 10L' },
    { id: 'gas_oil', itemId: 'motor_oil', nameRu: 'Моторное масло 5W-40 (4L)', price: 110, description: 'Синтетическое масло высокой вязкости для защиты двигателя.', category: 'auto', effectText: 'Защита двигателя' },
    { id: 'gas_antifreeze', itemId: 'antifreeze', nameRu: 'Канистра антифриза G12+ (5L)', price: 140, description: 'Охлаждающая жидкость для радиатора.', category: 'auto', effectText: 'Охлаждение двигателя' },
    { id: 'gas_washer', itemId: 'washer_fluid', nameRu: 'Стеклоомыватель зимний (-25°C)', price: 120, description: 'Канистра незамерзающей жидкости для бачка омывателя.', category: 'auto', effectText: 'Чистота стекол' },
    { id: 'gas_battery', itemId: 'car_battery', nameRu: 'Запасной аккумулятор 12V', price: 180, description: 'Свинцово-кислотная батарея высокой пусковой мощности.', category: 'auto', effectText: 'Питание авто' },
    { id: 'gas_repair_kit', itemId: 'repair_kit', nameRu: 'Набор автоинструментов', price: 220, description: 'Тяжелый кейс: ключи, головки, отвертки.', category: 'auto', effectText: 'Ремонт авто' },
    { id: 'gas_rope', itemId: 'tow_rope', nameRu: 'Буксировочный трос 5т', price: 95, description: 'Прочный капроновый трос для буксировки.', category: 'auto', effectText: 'Буксировка' },
    { id: 'gas_extinguisher', itemId: 'extinguisher', nameRu: 'Автоогнетушитель ОП-2', price: 130, description: 'Красный металлический баллон с чекой и манометром.', category: 'auto', effectText: 'Безопасность' },
    { id: 'gas_sandbag', itemId: 'sandbag', nameRu: 'Мешок песка (1 кг)', price: 30, description: 'Сухой кварцевый песок для тушения огня и впитывания ГСМ.', category: 'auto', effectText: 'Тушение & Впитывание' },
    { id: 'gas_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Влагостойкая клейкая лента повышенной прочности.', category: 'auto', effectText: 'Быстрый ремонт' },
    { id: 'gas_hotdog', itemId: 'hot_dog', nameRu: 'Датский хот-дог АЗС', price: 65, description: 'Хрустящая булка, поджаристая сосиска, кетчуп и горчица.', category: 'food', effectText: '+40% Сытость' },
    { id: 'gas_sandwich', itemId: 'sandwich', nameRu: 'Сэндвич с ветчиной и сыром', price: 70, description: 'Треугольный сэндвич в пластиковом боксе.', category: 'food', effectText: '+40% Сытость' },
    { id: 'gas_cappuccino', itemId: 'cappuccino', nameRu: 'Кофе Капучино АЗС (0.35L)', price: 65, description: 'Свежесваренный зерновой кофе в стакане с крышкой.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'gas_espresso', itemId: 'hot_coffee', nameRu: 'Горячий Эспрессо', price: 50, description: 'Крепкий бодрящий согревающий напиток.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'gas_energy', itemId: 'energy_drink', nameRu: 'Энергетик "Вспышка" (0.5L)', price: 65, description: 'Банка ледяного энергетика с таурином и кофеином.', category: 'food', effectText: '+35% Энергия' },
    { id: 'gas_apple', itemId: 'apple', nameRu: 'Яблоко мытое (в дорогу)', price: 25, description: 'Свежее спелое хрустящее яблоко.', category: 'food', effectText: '+15% Сытость, +10% Гидратация' },
    { id: 'gas_banana', itemId: 'banana_single', nameRu: 'Бананы спелые (связка)', price: 50, description: 'Сытный быстрый перекус для водителя.', category: 'food', effectText: '+30% Сытость, +20% Энергия' },
    { id: 'gas_banana_chips', itemId: 'banana_dried_chips', nameRu: 'Банановые чипсы', price: 45, description: 'Хрустящие сушеные ломтики банана в дорогу.', category: 'food', effectText: '+20% Сытость' },
    { id: 'gas_cranberry', itemId: 'cranberry_dried_bag', nameRu: 'Сушеная клюква (снек)', price: 60, description: 'Кисло-сладкая сушеная клюква в дорогу.', category: 'food', effectText: '+18% Сытость' },
    { id: 'gas_water', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в пластиковой бутылке.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'gas_water_15', itemId: 'bottle_plastic_1500', nameRu: 'Питьевая вода (1.5L)', price: 55, description: 'Большая бутылка чистой питьевой воды.', category: 'food', effectText: '+80% Гидратация' },
    { id: 'gas_chips', itemId: 'chips', nameRu: 'Картофельные чипсы', price: 40, description: 'Хрустящие чипсы с паприкой.', category: 'food', effectText: '+20% Сытость' },
    { id: 'gas_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Батончик с карамелью и арахисом.', category: 'food', effectText: '+20% Энергия' },
    { id: 'gas_canned', itemId: 'canned_meat', nameRu: 'Армейская тушёнка (0.4L)', price: 110, description: 'Мясные консервы в банке с ключом открытия.', category: 'food', effectText: '+70% Сытость' },
    { id: 'gas_plastic_bag', itemId: 'plastic_bag', nameRu: 'Пакет-майка АЗС', price: 5, description: 'Пластиковый пакет с ручками для покупок.', category: 'auto', effectText: 'Пакет 5.0L' }
  ],
  supermarket: [
    // 1. НАПИТКИ И ВОДА В БУТЫЛКАХ И БАНКАХ
    { id: 'sup_water_05', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в ПЭТ бутылке 0.5л.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'sup_water_15', itemId: 'bottle_plastic_1500', nameRu: 'Минеральная вода (1.5L)', price: 55, description: 'Большая бутылка чистой природной воды 1.5л.', category: 'food', effectText: '+80% Гидратация' },
    { id: 'sup_juice_tetra', itemId: 'fresh_juice', nameRu: 'Сок апельсиновый Тетрапак (1.0L)', price: 95, description: 'Пастеризованный 100% сок с мякотью в литровом тетрапаке.', category: 'food', effectText: '+60% Гидратация, +15% Энергия' },
    { id: 'sup_kvas', itemId: 'kvas', nameRu: 'Хлебный квас "Старорусский" (1.5L)', price: 85, description: 'Освежающий квас живого брожения в пластиковой бутылке 1.5л.', category: 'food', effectText: '+50% Гидратация, +20% Сытость' },
    { id: 'sup_cola_can', itemId: 'cola', nameRu: 'Баночка Колы (0.33L)', price: 45, description: 'Алюминиевая банка сильногазированной колы.', category: 'food', effectText: '+30% Гидратация, +15% Энергия' },
    { id: 'sup_energy_can', itemId: 'energy_drink', nameRu: 'Энергетик Drive (0.5L)', price: 75, description: 'Тонизирующий напиток с таурином и витаминами B.', category: 'food', effectText: '+35% Энергия' },
    { id: 'sup_beer_can', itemId: 'beer', nameRu: 'Пиво светлое фильтрованное (0.5L)', price: 65, description: 'Алюминиевая банка классического светлого лагера 4.8%.', category: 'food', effectText: '+Алкоголь, расслабление' },

    // 2. БАНКИ, КОНСЕРВЫ И ЗАГОТОВКИ
    { id: 'sup_canned_stew', itemId: 'canned_meat', nameRu: 'Тушёнка говяжья высший сорт (0.4L)', price: 125, description: 'Армейская тушёнка ГОСТ в герметичной жестяной банке с ключом.', category: 'food', effectText: '+75% Сытость' },
    { id: 'sup_canned_fish', itemId: 'canned_fish', nameRu: 'Рыбные консервы в масле (0.15L)', price: 95, description: 'Шпроты и сардины в пряном масле в банке.', category: 'food', effectText: '+65% Сытость' },
    { id: 'sup_condensed_milk', itemId: 'condensed_milk', nameRu: 'Сгущённое молоко цельное (0.4L)', price: 85, description: 'Классическая сладкая сгущенка в сине-белой банке.', category: 'food', effectText: '+50% Сытость, +35% Энергия' },
    { id: 'sup_pickles_jar', itemId: 'jar_pickles', nameRu: 'Огурчики маринованные в банке (0.5L)', price: 110, description: 'Хрустящие корнишоны с пряным рассолом и укропом в стекле.', category: 'food', effectText: '+30% Сытость, +30% Гидратация' },
    { id: 'sup_jam_raspberry', itemId: 'jam_raspberry', nameRu: 'Малиновое варенье в банке (0.2L)', price: 130, description: 'Домашнее варенье из спелой малины в стеклянной баночке.', category: 'food', effectText: '+42% Сытость, целебное' },
    { id: 'sup_jam_strawberry', itemId: 'jam_strawberry', nameRu: 'Клубничный джем в стекле (0.2L)', price: 125, description: 'Сладкий джем из отборной клубники в баночке с винтовой крышкой.', category: 'food', effectText: '+42% Сытость' },
    { id: 'sup_honey_jar', itemId: 'jar_honey', nameRu: 'Натуральный цветочный мёд (0.2L)', price: 160, description: 'Золотистый липовый мёд в стеклянной баночке.', category: 'food', effectText: '+45% Сытость, иммунитет' },
    { id: 'sup_caviar_red', itemId: 'salmon_caviar_jar', nameRu: 'Икра лососевая зернистая (140г)', price: 480, description: 'Красная икра лосося премиум в стеклянной баночке под вакуумом.', category: 'food', effectText: '+65% Сытость, деликатес' },
    { id: 'sup_caviar_squash', itemId: 'caviar_squash_jar', nameRu: 'Кабачковая икра в банке (0.5L)', price: 75, description: 'Нежная обжаренная кабачковая икра по-домашнему.', category: 'food', effectText: '+45% Сытость' },
    { id: 'sup_caviar_eggplant', itemId: 'caviar_eggplant_jar', nameRu: 'Баклажанная икра в банке (0.5L)', price: 85, description: 'Пикантная баклажанная икра с томатом и чесноком.', category: 'food', effectText: '+48% Сытость' },
    { id: 'sup_broth_beef', itemId: 'broth_beef_jar', nameRu: 'Говяжий бульон концентрированный (0.45L)', price: 90, description: 'Стеклянная баночка наваристого мясного бульона для супов.', category: 'food', effectText: '+60% Сытость, тепло' },
    { id: 'sup_broth_chicken', itemId: 'broth_chicken_jar', nameRu: 'Куриный бульон в банке (0.45L)', price: 80, description: 'Золотистый куриный бульон с травами.', category: 'food', effectText: '+50% Сытость' },

    // 3. ПОРЦИОННОЕ СВЕЖЕЕ МЯСО И РЫБА (РЕАЛИСТИЧНЫЕ ЛОТКИ И ВАКУУМ)
    { id: 'sup_chicken_breast', itemId: 'chicken_breast_large', nameRu: 'Филе грудки цыпленка (лоток 400г)', price: 145, description: 'Охлажденное бескостное филе куриной грудки в лотке под пленкой.', category: 'food', effectText: 'Свежее мясо птицы' },
    { id: 'sup_chicken_thighs', itemId: 'chicken_thighs_medium', nameRu: 'Бедра цыпленка (лоток 300г)', price: 115, description: 'Охлажденные сочные куриные бедра для жарки и варки.', category: 'food', effectText: 'Свежее мясо птицы' },
    { id: 'sup_beef_steak', itemId: 'beef_rump_large', nameRu: 'Стейк из говядины (вакуум 500г)', price: 340, description: 'Отборная мраморная говяжья вырезка в вакуумной упаковке.', category: 'food', effectText: 'Мраморная говядина' },
    { id: 'sup_pork_ribs', itemId: 'pork_ribs_medium', nameRu: 'Ребрышки свиные охлажденные (800г)', price: 260, description: 'Мясные свиные ребра для запекания в термопакете.', category: 'food', effectText: 'Свежая свинина' },
    { id: 'sup_salmon_steak', itemId: 'salmon_steak', nameRu: 'Стейк лосося охлажденный (250г)', price: 290, description: 'Порционный стейк атлантического лосося на ледяной подложке.', category: 'food', effectText: 'Красная рыба' },
    { id: 'sup_cod_fillet', itemId: 'cod_fillet', nameRu: 'Филе трески без кожи (500г)', price: 210, description: 'Свежее белое филе северной трески в вакууме.', category: 'food', effectText: 'Дикая рыба' },

    // 4. СВЕЖИЕ ГРИБЫ (В УНИФИЦИРОВАННЫХ ЛОТКАХ)
    { id: 'sup_champignon', itemId: 'champignon_white_whole', nameRu: 'Шампиньоны (лоток 6 шт.)', price: 75, description: 'Свежие белые шампиньоны в пищевом лотке под герметичной пленкой (6 шт.).', category: 'food', effectText: 'Свежие грибы (6 шт.)' },

    // 5. ОВОЩИ И КОРНЕПЛОДЫ
    { id: 'sup_potato', itemId: 'potato_whole', nameRu: 'Картофель', price: 20, description: 'Свежий картофельный клубень.', category: 'food', effectText: 'Овощи' },
    { id: 'sup_beet', itemId: 'beet_fresh', nameRu: 'Свекла', price: 20, description: 'Свежая красная свекла.', category: 'food', effectText: 'Овощи' },
    { id: 'sup_carrot_fresh', itemId: 'carrot_fresh', nameRu: 'Морковь свежая (1 шт.)', price: 18, description: 'Сочная мытая сладкая морковь поштучно.', category: 'food', effectText: '+12% Сытость, каротин' },
    { id: 'sup_onion', itemId: 'onion_bulb', nameRu: 'Лук репчатый (1 шт.)', price: 15, description: 'Головка репчатого золотистого лука поштучно.', category: 'food', effectText: 'Кулинария' },
    { id: 'sup_garlic', itemId: 'garlic_bulb', nameRu: 'Чеснок свежий (1 головка)', price: 20, description: 'Плотная цельная головка свежего чеснока.', category: 'food', effectText: 'Фитонциды / специя' },
    { id: 'sup_tomato_fresh', itemId: 'tomato_whole', nameRu: 'Помидор грунтовой (1 шт.)', price: 30, description: 'Сочный красный спелый томат поштучно.', category: 'food', effectText: '+15% Сытость, сок' },
    { id: 'sup_cherry_bunch', itemId: 'tomato_cherry_bunch', nameRu: 'Ветка томатов черри (250г)', price: 85, description: 'Сладкие томаты черри на ветке в картонном боксе.', category: 'food', effectText: '+20% Сытость, сладость' },
    { id: 'sup_tomato_sundried', itemId: 'tomato_sundried_jar', nameRu: 'Вяленые томаты в оливковом масле', price: 165, description: 'Баночка пряных вяленых томатов с травами.', category: 'food', effectText: '+25% Сытость, деликатес' },
    { id: 'sup_cucumber', itemId: 'cucumber_whole', nameRu: 'Огурец короткоплодный (1 шт.)', price: 25, description: 'Свежий хрустящий пупырчатый огурец поштучно.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'sup_cucumber_sliced', itemId: 'cucumber_sliced', nameRu: 'Огурец нарезанный ломтиками (лоток)', price: 30, description: 'Свежие ломтики огурца в пищевом лотке.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'sup_bell_pepper', itemId: 'bell_pepper_red', nameRu: 'Перец болгарский красный (1 шт.)', price: 45, description: 'Крупный толстостенный сочный перец поштучно.', category: 'food', effectText: '+18% Сытость, витамины' },
    { id: 'sup_bell_pepper_sliced', itemId: 'bell_pepper_sliced', nameRu: 'Перец болгарский соломкой (лоток)', price: 50, description: 'Нарезанный соломкой сладкий перец в лотке под пленкой.', category: 'food', effectText: '+18% Сытость' },
    { id: 'sup_cabbage', itemId: 'cabbage_white_head', nameRu: 'Капуста белокочанная (1 кочан)', price: 45, description: 'Плотный кочан свежей капусты поштучно.', category: 'food', effectText: '+12% Сытость' },
    { id: 'sup_cabbage_shredded', itemId: 'cabbage_shredded', nameRu: 'Капуста нашинкованная (лоток)', price: 35, description: 'Свежая сочная салатная капуста в лотке под пленкой.', category: 'food', effectText: '+10% Сытость' },
    { id: 'sup_sauerkraut', itemId: 'cabbage_sauerkraut_jar', nameRu: 'Квашеная капуста в банке', price: 65, description: 'Хрустящая квашеная капуста с морковью.', category: 'food', effectText: '+22% Сытость, витамин C' },
    { id: 'sup_broccoli', itemId: 'broccoli_head', nameRu: 'Брокколи свежая (1 кочан)', price: 75, description: 'Зеленый свежий кочан брокколи поштучно.', category: 'food', effectText: '+15% Сытость' },
    { id: 'sup_veg_frozen', itemId: 'vegetable_mix_frozen', nameRu: 'Замороженная смесь овощей (400г)', price: 70, description: 'Смесь брокколи, цветной капусты и моркови.', category: 'food', effectText: 'Заморозка' },
    { id: 'sup_jalapeno_jar', itemId: 'jalapeno_pickled_jar', nameRu: 'Маринованный халапеньо в банке', price: 95, description: 'Острые маринованные колечки перца.', category: 'food', effectText: '+12% Энергия, острота' },

    // 5.1. СВЕЖИЕ ФРУКТЫ, БАХЧЕВЫЕ, ЯГОДЫ И СУХОФРУКТЫ
    { id: 'sup_apple', itemId: 'apple', nameRu: 'Яблоко сочное', price: 20, description: 'Свежее красно-зеленое яблоко.', category: 'food', effectText: '+15% Сытость, +10% Гидратация' },
    { id: 'sup_apple_sliced', itemId: 'apple_sliced', nameRu: 'Яблочные дольки в стаканчике', price: 30, description: 'Очищенные дольки спелого яблока.', category: 'food', effectText: '+15% Сытость' },
    { id: 'sup_apple_dried', itemId: 'apple_dried_rings', nameRu: 'Сушеные яблочные кольца', price: 45, description: 'Пакетик сладких сушеных яблочных колец.', category: 'food', effectText: '+18% Сытость' },
    { id: 'sup_apple_puree', itemId: 'apple_puree_jar', nameRu: 'Яблочное пюре в баночке', price: 55, description: 'Нежное натуральное яблочное пюре.', category: 'food', effectText: '+20% Сытость, сладость' },
    { id: 'sup_pear_yellow', itemId: 'pear_yellow', nameRu: 'Груша Дюшес сладкая', price: 30, description: 'Медовая сочная груша.', category: 'food', effectText: '+20% Сытость, сок' },
    { id: 'sup_pear_sliced', itemId: 'pear_sliced', nameRu: 'Груша нарезанная (дольки)', price: 40, description: 'Нежные очищенные грушевые дольки.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_plum', itemId: 'plum_purple', nameRu: 'Слива синяя десертная', price: 15, description: 'Спелая сладкая слива.', category: 'food', effectText: '+8% Сытость' },
    { id: 'sup_prunes', itemId: 'prune_dried_bag', nameRu: 'Чернослив отборный (200г)', price: 85, description: 'Пакетик мягкого сладкого чернослива.', category: 'food', effectText: '+25% Сытость' },
    { id: 'sup_apricot_dried', itemId: 'apricot_dried_bag', nameRu: 'Курага золотистая (200г)', price: 95, description: 'Пакетик отборной сладкой кураги.', category: 'food', effectText: '+28% Сытость' },
    { id: 'sup_peaches_canned', itemId: 'peach_halves_canned', nameRu: 'Персики в сиропе (половинки)', price: 110, description: 'Консервированные половинки персиков.', category: 'food', effectText: '+35% Сытость, десерт' },
    { id: 'sup_orange', itemId: 'orange_citrus', nameRu: 'Апельсин сочный (1 шт.)', price: 25, description: 'Спелый сочный цитрус с мякотью поштучно.', category: 'food', effectText: '+20% Гидратация, витамин C' },
    { id: 'sup_orange_segments', itemId: 'orange_segments', nameRu: 'Очищенные дольки апельсина', price: 45, description: 'Свежие очищенные апельсиновые дольки в боксе.', category: 'food', effectText: '+20% Гидратация' },
    { id: 'sup_lemon', itemId: 'lemon_whole', nameRu: 'Лимон желтый', price: 20, description: 'Кислый ароматный лимон.', category: 'food', effectText: 'Бодрость, витамин C' },
    { id: 'sup_lime', itemId: 'lime_whole', nameRu: 'Лайм зеленый', price: 25, description: 'Ароматный кислый лайм.', category: 'food', effectText: 'Бодрость' },
    { id: 'sup_banana', itemId: 'banana_single', nameRu: 'Бананы спелые (связка)', price: 45, description: 'Связка сладких питательных бананов.', category: 'food', effectText: '+30% Сытость, +20% Энергия' },
    { id: 'sup_banana_chips', itemId: 'banana_dried_chips', nameRu: 'Банановые чипсы хрустящие', price: 50, description: 'Пакетик хрустящих сушеных бананов.', category: 'food', effectText: '+22% Сытость, энергия' },
    { id: 'sup_melon_slice', itemId: 'melon_slice', nameRu: 'Ломоть дыни Канталупа', price: 55, description: 'Сочный медовый ломоть дыни.', category: 'food', effectText: '+22% Сытость, +25% Гидратация' },
    { id: 'sup_melon_diced', itemId: 'melon_diced', nameRu: 'Кубики дыни в лотке', price: 65, description: 'Очищенные кубики дыни в боксе.', category: 'food', effectText: '+20% Сытость, +25% Гидратация' },
    { id: 'sup_watermelon_slice', itemId: 'watermelon_slice', nameRu: 'Ломоть арбуза сочный', price: 40, description: 'Отрезанный кусок сахарного арбуза.', category: 'food', effectText: '+15% Сытость, +50% Гидратация' },
    { id: 'sup_watermelon_diced', itemId: 'watermelon_diced', nameRu: 'Кубики арбуза в стаканчике', price: 50, description: 'Свежие кубики арбуза без косточек.', category: 'food', effectText: '+45% Гидратация' },
    { id: 'sup_pomegranate_seeds', itemId: 'pomegranate_seeds_cup', nameRu: 'Зерна граната в стаканчике', price: 75, description: 'Очищенные рубиновые зерна спелого граната.', category: 'food', effectText: '+15% Сытость, витамины' },
    { id: 'sup_kiwi_fruit', itemId: 'kiwi_fruit', nameRu: 'Киви спелый', price: 25, description: 'Спелый кисло-сладкий киви.', category: 'food', effectText: '+10% Сытость, витамин C' },
    { id: 'sup_kiwi_sliced', itemId: 'kiwi_sliced', nameRu: 'Киви нарезанный кружочками', price: 35, description: 'Очищенные сочные кружки киви.', category: 'food', effectText: '+10% Сытость' },
    { id: 'sup_grapes_green', itemId: 'grapes_green_bunch', nameRu: 'Виноград зеленый кишмиш', price: 80, description: 'Гроздь сладкого бескосточкового винограда.', category: 'food', effectText: '+20% Сытость, сок' },
    { id: 'sup_grapes_cup', itemId: 'grapes_berries_cup', nameRu: 'Виноград россыпью в стаканчике', price: 55, description: 'Отборные ягоды винограда в стаканчике.', category: 'food', effectText: '+15% Сытость, +15% Гидратация' },
    { id: 'sup_raisins', itemId: 'raisins_dried_bag', nameRu: 'Изюм сушеный сладкий', price: 50, description: 'Пакетик отборного изюма без косточек.', category: 'food', effectText: '+25% Сытость' },
    { id: 'sup_berries_tray', itemId: 'berries_tray_fresh', nameRu: 'Свежие ягоды (лоток)', price: 140, description: 'Отборная спелая клубника в пищевом лотке под герметичной пленкой (8 шт.).', category: 'food', effectText: '+20% Сытость, витамины' },
    { id: 'sup_berries_frozen', itemId: 'berries_mixed_frozen', nameRu: 'Замороженные лесные ягоды', price: 110, description: 'Пакет замороженных ягод (черника, малина).', category: 'food', effectText: 'Заморозка' },
    { id: 'sup_cranberry_dried', itemId: 'cranberry_dried_bag', nameRu: 'Вяленая клюква (пакетик)', price: 70, description: 'Сладкая вяленая клюква.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_greens_chopped', itemId: 'greens_chopped_mix', nameRu: 'Свежая рубленая зелень (укроп/петрушка)', price: 30, description: 'Нарубленная свежая зелень в боксе.', category: 'food', effectText: 'Свежая зелень' },
    { id: 'sup_dill_jar', itemId: 'dill_dried_jar', nameRu: 'Сушеный укроп в баночке', price: 40, description: 'Баночка душистого сушеного укропа.', category: 'food', effectText: 'Пряность' },
    { id: 'sup_basil_jar', itemId: 'basil_dried_jar', nameRu: 'Сушеный базилик в баночке', price: 45, description: 'Баночка ароматного сушеного базилика.', category: 'food', effectText: 'Пряность' },
    { id: 'sup_mint_jar', itemId: 'mint_dried_jar', nameRu: 'Сушеная мята для чая', price: 45, description: 'Баночка сушеной перечной мяты.', category: 'food', effectText: 'Травяной чай' },

    // 6. МЯСНОЙ И МОЛОЧНЫЙ ОТДЕЛ, МАСЛА И БАКАЛЕЯ
    { id: 'sup_minced_beef', itemId: 'beef_minced', nameRu: 'Фарш говяжий (1 кг)', price: 420, description: 'Свежий прокрученный говяжий фарш на подложке (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_pork', itemId: 'pork_minced', nameRu: 'Фарш свиной (1 кг)', price: 340, description: 'Свежий свиной фарш на подложке (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_mixed', itemId: 'minced_meat_mixed', nameRu: 'Фарш домашний (1 кг)', price: 380, description: 'Классический фарш 50/50 говядина и свинина (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_chicken', itemId: 'chicken_minced', nameRu: 'Фарш куриный (1 кг)', price: 290, description: 'Нежный нежирный куриный фарш (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_turkey', itemId: 'turkey_minced', nameRu: 'Фарш индюшачий (1 кг)', price: 390, description: 'Диетический фарш из филе индейки (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_milk_carton', itemId: 'carton_milk', nameRu: 'Молоко пастеризованное 3.2% (1.0L)', price: 65, description: 'Пакет питьевого пастеризованного молока.', category: 'food', effectText: '+35% Гидратация, +20% Сытость' },
    { id: 'sup_sour_cream', itemId: 'sour_cream_pot', nameRu: 'Сметана 20% (стаканчик 400г)', price: 75, description: 'Густая натуральная сметана с нежной кислинкой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_butter', itemId: 'butter_brick_salted', nameRu: 'Масло сливочное 82.5% (200г)', price: 95, description: 'Брикет натурального сладко-сливочного масла в крафтовой бумажной упаковке с золотистой этикеткой.', category: 'food', effectText: '+30% Сытость' },
    { id: 'sup_ghee_butter', itemId: 'ghee_butter_pot', nameRu: 'Топленое масло Гхи (400г)', price: 180, description: 'Топленое сливочное масло Гхи в бумажном эко-боксе с янтарной этикеткой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_cheese', itemId: 'cheese_cheddar_block', nameRu: 'Сыр Чеддер (брусок 300г)', price: 160, description: 'Выдержанный полутвердый сыр Чеддер в бумажной упаковке с оранжевой этикеткой.', category: 'food', effectText: '+40% Сытость' },
    { id: 'sup_cheese_gouda', itemId: 'cheese_gouda_wheel', nameRu: 'Круг сыра Гауда (1.2 кг)', price: 480, description: 'Цельный круг сыра Гауда в большой бумажной упаковке с желтой этикеткой.', category: 'food', effectText: '+50% Сытость' },
    { id: 'sup_cheese_parmesan', itemId: 'cheese_parmesan_wedge', nameRu: 'Сыр Пармезан (кусок 250г)', price: 210, description: 'Твердый выдержанный Пармезан в крафтовом боксе с янтарной этикеткой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_cheese_mozzarella', itemId: 'cheese_mozzarella_ball', nameRu: 'Сыр Моцарелла (шарик 150г)', price: 110, description: 'Свежий нежный шарик Моцареллы в эко-боксе с небесно-голубой этикеткой.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_cheese_suluguni', itemId: 'cheese_suluguni_braid', nameRu: 'Сыр Сулугуни копченый (косичка 300г)', price: 175, description: 'Плетёная косичка копченого Сулугуни в бумажной упаковке с бронзовой этикеткой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_cheese_feta', itemId: 'cheese_feta_block', nameRu: 'Сыр Фета греческий (200г)', price: 140, description: 'Соленый рассыпчатый сыр Фета в эко-боксе с изумрудной этикеткой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'sup_cottage_cheese', itemId: 'cottage_cheese_pack', nameRu: 'Творог рассыпчатый 9% (250г)', price: 85, description: 'Свежий натуральный творог в бумажной упаковке с васильковой этикеткой.', category: 'food', effectText: '+30% Сытость' },
    { id: 'sup_eggs', itemId: 'eggs_chicken_carton', nameRu: 'Яйца куриные С1 (лоток 10 шт)', price: 90, description: 'Упаковка столовых отборных куриных яиц.', category: 'food', effectText: 'Кулинария / 10 шт' },
    { id: 'sup_oil_sunflower', itemId: 'oil_sunflower_bottle', nameRu: 'Масло подсолнечное (1.0L)', price: 95, description: 'Рафинированное подсолнечное масло в пластиковой бутылке.', category: 'food', effectText: 'Масло для жарки' },
    { id: 'sup_oil_olive', itemId: 'oil_olive_extra_virgin', nameRu: 'Оливковое масло Extra Virgin (0.5L)', price: 240, description: 'Стеклянная бутылка нерафинированного оливкового масла.', category: 'food', effectText: 'Салатная заправка' },
    { id: 'sup_soy_sauce', itemId: 'soy_sauce_classic', nameRu: 'Соевый соус в бутылочке (0.25L)', price: 65, description: 'Соус натурального брожения в стеклянной бутылке.', category: 'food', effectText: 'Соевая заправка' },
    { id: 'sup_sugar', itemId: 'sugar', nameRu: 'Сахар-песок в пакете (1 кг)', price: 55, description: 'Пакет белоснежного сахара-песка.', category: 'food', effectText: 'Бакалея' },
    { id: 'sup_flour', itemId: 'flour_wheat_bag_1k', nameRu: 'Мука пшеничная в/с (1 кг)', price: 50, description: 'Пакет муки высшего сорта для выпечки.', category: 'food', effectText: 'Бакалея' },
    { id: 'sup_salt', itemId: 'salt_shaker', nameRu: 'Соль поваренная в солонке (150г)', price: 30, description: 'Удобная кухонная солонка с мелкой солью.', category: 'food', effectText: 'Специя' },
    { id: 'sup_bread', itemId: 'bread_loaf', nameRu: 'Батон нарезной "Утренний"', price: 35, description: 'Свежий пшеничный хлеб в нарезке.', category: 'food', effectText: '+35% Сытость' },

    // 7. СНЕКИ, СЛАДОСТИ И ТАРА
    { id: 'sup_chocolate', itemId: 'chocolate', nameRu: 'Шоколад темный 75%', price: 45, description: 'Плитка горького шоколада с кусочками какао.', category: 'food', effectText: '+25% Энергия' },
    { id: 'sup_cookies', itemId: 'cookie_pack', nameRu: 'Печенье с шоколадными каплями', price: 50, description: 'Пачка рассыпчатого песочного печенья.', category: 'food', effectText: '+25% Сытость' },
    { id: 'sup_chips', itemId: 'chips', nameRu: 'Картофельные чипсы (пачка 150г)', price: 55, description: 'Хрустящие ломтики картофеля с морской солью.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_plastic_bag', itemId: 'plastic_bag', nameRu: 'Пакет-майка с ручками', price: 5, description: 'Вместительный прочный полиэтиленовый пакет 5.0L.', category: 'auto', effectText: 'Пакет 5.0L' },
    { id: 'sup_package_bag', itemId: 'package_bag', nameRu: 'Фасовочные пакеты (1.5L)', price: 3, description: 'Тонкий прозрачный полиэтиленовый пакетик.', category: 'auto', effectText: 'Пакет 1.5L' },
    { id: 'sup_jar_empty', itemId: 'jar_glass_medium', nameRu: 'Банка стеклянная с крышкой (0.5L)', price: 35, description: 'Унифицированная чистая банка твист-офф для консервации.', category: 'auto', effectText: 'Емкость 0.5L' },
    { id: 'sup_phone_retro', itemId: 'phone_retro', nameRu: 'Телефон Matrix Classic (Кнопочный)', price: 3500, description: 'Неубиваемый кнопочный телефон с фонариком.', category: 'auto', effectText: 'Связь & SMS' },
    { id: 'sup_phone_nord', itemId: 'phone_nord', nameRu: 'Смартфон Nord Lite 5G', price: 38000, description: 'Доступный смартфон с дисплеем 90 Гц.', category: 'auto', effectText: 'Смартфон & GPS' }
  ],
  fast_food: [
    { id: 'ff_burger', itemId: 'burger', nameRu: 'Двойной Чизбургер', price: 95, description: 'Бургер в картонной коробке: кунжутная булка, две котлеты, сыр.', category: 'food', effectText: '+50% Сытость, +25% Энергия' },
    { id: 'ff_fries', itemId: 'french_fries', nameRu: 'Картофель фри (Крупный)', price: 55, description: 'Картонный кулек горячей соленой картофельной соломки.', category: 'food', effectText: '+30% Сытость, +15% Энергия' },
    { id: 'ff_nuggets', itemId: 'nuggets', nameRu: 'Куриные наггетсы (6 шт)', price: 70, description: 'Хрустящие куриные кусочки в панировке из фритюра.', category: 'food', effectText: '+35% Сытость, +20% Энергия' },
    { id: 'ff_hotdog', itemId: 'hot_dog', nameRu: 'Датский хот-дог', price: 65, description: 'Длинная булка с поджаристой сосиской, кетчупом и горчицей.', category: 'food', effectText: '+40% Сытость' },
    { id: 'ff_jalapeno', itemId: 'jalapeno_pickled_jar', nameRu: 'Острый халапеньо (топпинг)', price: 45, description: 'Порция острых маринованных колечек халапеньо.', category: 'food', effectText: '+10% Энергия, капсаицин' },
    { id: 'ff_apple_slices', itemId: 'apple_sliced', nameRu: 'Яблочные дольки (Снек)', price: 30, description: 'Свежие хрустящие дольки спелого яблока.', category: 'food', effectText: '+15% Сытость, витамины' },
    { id: 'ff_banana_chips', itemId: 'banana_dried_chips', nameRu: 'Банановые чипсы (Снек)', price: 35, description: 'Хрустящие ломтики сушеного банана.', category: 'food', effectText: '+18% Сытость, сладость' },
    { id: 'ff_colazero', itemId: 'cola_zero', nameRu: 'Кола Зеро (0.33L)', price: 40, description: 'Жестяная баночка черного газированного напитка, без сахара.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'ff_milkshake', itemId: 'milkshake', nameRu: 'Ванильный милкшейк', price: 60, description: 'Пластиковый стаканчик густого холодного молочного коктейля.', category: 'food', effectText: '+35% Гидратация, +20% Сытость' }
  ],
  pizzeria: [
    { id: 'piz_pepperoni', itemId: 'pizza_slice', nameRu: 'Кусок пиццы Пепперони', price: 60, description: 'Треугольный кусок горячего теста с пикантной колбасой.', category: 'food', effectText: '+35% Сытость, +10% Энергия' },
    { id: 'piz_croissant', itemId: 'croissant', nameRu: 'Сырный чесночный круассан', price: 45, description: 'Золотистая слоеная выпечка с пикантной начинкой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'piz_sundried', itemId: 'tomato_sundried_jar', nameRu: 'Вяленые томаты с травами', price: 95, description: 'Итальянские вяленые томаты в оливковом масле.', category: 'food', effectText: '+22% Сытость, умами' },
    { id: 'piz_cherry', itemId: 'tomato_cherry_bunch', nameRu: 'Томаты черри свежие (порция)', price: 50, description: 'Сладкие маленькие томаты черри.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'piz_jalapeno', itemId: 'jalapeno_pickled_jar', nameRu: 'Острый халапеньо к пицце', price: 45, description: 'Порция маринованного перца халапеньо.', category: 'food', effectText: '+10% Энергия, острота' },
    { id: 'piz_grape_cup', itemId: 'grapes_berries_cup', nameRu: 'Виноградный десерт (стаканчик)', price: 50, description: 'Сладкие спелые ягоды винограда.', category: 'food', effectText: '+15% Сытость, сок' },
    { id: 'piz_juice', itemId: 'fresh_juice', nameRu: 'Фруктовый морс', price: 40, description: 'Стакан кисленького ягодного морса из клюквы и брусники.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'piz_colazero', itemId: 'cola_zero', nameRu: 'Банка Колы', price: 40, description: 'Баночка сильногазированной колы из холодильника.', category: 'food', effectText: '+28% Гидратация' }
  ],
  sushi_asian: [
    { id: 'sush_phila', itemId: 'sushi_set', nameRu: 'Сет роллов Филадельфия', price: 160, description: 'Пластиковый контейнер: 8 роллов с лососем, сыром и огурцом.', category: 'food', effectText: '+55% Сытость, +15 HP' },
    { id: 'sush_wok', itemId: 'wok_box', nameRu: 'WOK-лапша Терияки с курицей', price: 130, description: 'Картонная коробочка горячей пшеничной лапши с соусом.', category: 'food', effectText: '+60% Сытость, +30% Энергия' },
    { id: 'sush_paper_packaging_mini', itemId: 'paper_packaging_mini', nameRu: 'Бумажная упаковка (Мини 0.4L)', price: 25, description: 'Компактный мини-бокс для порционных снеков и соусов с пломбой.', category: 'food', effectText: 'Эко-бокс 0.4L' },
    { id: 'sush_paper_packaging_small', itemId: 'paper_packaging_small', nameRu: 'Бумажная упаковка (Малая 0.8L)', price: 35, description: 'Малый крафтовый бокс для стандартных порций риса и лапши.', category: 'food', effectText: 'Эко-бокс 0.8L' },
    { id: 'sush_paper_packaging', itemId: 'paper_packaging', nameRu: 'Бумажная упаковка (Стандарт 1.2L)', price: 45, description: 'Плотный крафтовый эко-бокс с фирменной рубиновой пломбой.', category: 'food', effectText: 'Эко-бокс 1.2L' },
    { id: 'sush_paper_packaging_large', itemId: 'paper_packaging_large', nameRu: 'Бумажная упаковка (Большая 2.4L)', price: 70, description: 'Большой макси-бокс для комбо-наборов и семейных порций.', category: 'food', effectText: 'Макси-бокс 2.4L' },
    { id: 'sush_paper_packaging_open', itemId: 'paper_packaging_open', nameRu: 'Открытая бумажная упаковка', price: 30, description: 'Вскрытая крафтовая упаковка с разорванной этикеткой.', category: 'food', effectText: 'Контейнер 1.2L' },
    { id: 'sush_paper_packaging_green', itemId: 'paper_packaging_green', nameRu: 'Бумажная упаковка (зеленая этикетка)', price: 45, description: 'Крафтовый эко-бокс с изумрудной пломбой.', category: 'food', effectText: 'Эко-бокс 1.2L' },
    { id: 'sush_paper_packaging_amber', itemId: 'paper_packaging_amber', nameRu: 'Бумажная упаковка (золотая этикетка)', price: 50, description: 'Премиальный крафтовый бокс с янтарно-золотой пломбой.', category: 'food', effectText: 'Премиум бокс 1.2L' },
    { id: 'sush_ginger', itemId: 'ginger_pickled_box', nameRu: 'Маринованный имбирь Гари (лоток)', price: 35, description: 'Лепестки розового маринованного имбиря.', category: 'food', effectText: '+5% Сытость, очищение вкуса' },
    { id: 'sush_shiitake', itemId: 'shiitake_fresh', nameRu: 'Грибы Шиитаке свежие', price: 50, description: 'Азиатские грибы шиитаке с пряным ароматом.', category: 'food', effectText: '+10% Сытость' },
    { id: 'sush_enoki', itemId: 'enoki_mushroom_bunch', nameRu: 'Грибы Эноки (пучок)', price: 60, description: 'Хрустящие нитевидные грибы эноки для супов.', category: 'food', effectText: '+12% Сытость' },
    { id: 'sush_cucumber_sliced', itemId: 'cucumber_sliced', nameRu: 'Огуречная нарезка (роллы/салат)', price: 25, description: 'Тонкие свежие ломтики огурца.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'sush_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча', price: 40, description: 'Бумажный стакан заваренного крупнолистового зеленого чая.', category: 'food', effectText: '+35% Гидратация, +5 HP' }
  ],
  cinema_bar: [
    { id: 'cin_popcorn', itemId: 'popcorn_caramel', nameRu: 'Карамельный попкорн', price: 70, description: 'Бумажное ведро хрустящего попкорна в сладкой карамели.', category: 'food', effectText: '+25% Сытость, +18% Энергия' },
    { id: 'cin_nachos', itemId: 'nachos', nameRu: 'Начос с сырным соусом', price: 80, description: 'Коробка кукурузных чипсов с пластиковой баночкой соуса чеддер.', category: 'food', effectText: '+32% Сытость, +15% Энергия' },
    { id: 'cin_watermelon_cup', itemId: 'watermelon_diced', nameRu: 'Кубики арбуза в стаканчике', price: 50, description: 'Освежающие сладкие кусочки арбуза.', category: 'food', effectText: '+45% Гидратация' },
    { id: 'cin_melon_cup', itemId: 'melon_diced', nameRu: 'Кубики дыни в боксе', price: 60, description: 'Медовые сладкие кубики канталупы.', category: 'food', effectText: '+20% Сытость, +25% Гидратация' },
    { id: 'cin_grape_cup', itemId: 'grapes_berries_cup', nameRu: 'Виноградный стаканчик снек', price: 50, description: 'Отборные ягоды сладкого винограда.', category: 'food', effectText: '+15% Сытость, +15% Гидратация' },
    { id: 'cin_pomegranate_cup', itemId: 'pomegranate_seeds_cup', nameRu: 'Зерна граната в стаканчике', price: 65, description: 'Сочные рубиновые зерна спелого граната.', category: 'food', effectText: '+15% Сытость, витамины' },
    { id: 'cin_banana_chips', itemId: 'banana_dried_chips', nameRu: 'Банановые чипсы снек', price: 40, description: 'Хрустящие сушеные ломтики банана.', category: 'food', effectText: '+20% Сытость' },
    { id: 'cin_raisins', itemId: 'raisins_dried_bag', nameRu: 'Изюм сладкий (пакетик)', price: 40, description: 'Пакетик сладкого бескосточкового изюма.', category: 'food', effectText: '+22% Сытость' },
    { id: 'cin_cranberry', itemId: 'cranberry_dried_bag', nameRu: 'Вяленая клюква снек', price: 55, description: 'Кисло-сладкая вяленая клюква.', category: 'food', effectText: '+18% Сытость' },
    { id: 'cin_colazero', itemId: 'cola_zero', nameRu: 'Большой стакан Колы', price: 45, description: 'Полулитровый картонный стакан ледяного газированного напитка.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'cin_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Шоколадка с карамелью и арахисом.', category: 'food', effectText: '+20% Энергия' }
  ],
  electronics: [
    { id: 'elec_phone_nova15', itemId: 'phone_nova15', nameRu: 'Смартфон Nova 15 Ultra (Флагман)', price: 120000, description: 'Премиальный флагман с 6.8" 120Hz AMOLED, 200MP камерой и спутниковой связью.', category: 'auto', effectText: 'Топ-флагман & 200MP' },
    { id: 'elec_phone_pixel', itemId: 'phone_pixel', nameRu: 'Смартфон Pixel Horizon 9', price: 89000, description: 'Умный камерофон с чистым Android и продвинутым ночным режимом.', category: 'auto', effectText: 'AI Камера & 120Hz' },
    { id: 'elec_phone_fold', itemId: 'phone_fold', nameRu: 'Гибкий смартфон CyberFold Neo', price: 145000, description: 'Футуристический раскладной гибкий дисплей 7.6" и титановый шарнир.', category: 'auto', effectText: 'Гибкий Fold & 120Hz' },
    { id: 'elec_phone_nord', itemId: 'phone_nord', nameRu: 'Смартфон Nord Lite 5G', price: 38000, description: 'Доступный смартфон с 90 Гц дисплеем и тройной камерой.', category: 'auto', effectText: 'Смартфон & GPS' },
    { id: 'elec_phone_retro', itemId: 'phone_retro', nameRu: 'Телефон Matrix Classic (Кнопочный)', price: 3500, description: 'Неубиваемый кнопочный телефон с фонариком и недельной батареей.', category: 'auto', effectText: 'Связь & SMS' },
    { id: 'elec_pbank', itemId: 'powerbank', nameRu: 'Повербанк 20 000 мАч', price: 3500, description: 'Фирменная коробка с тяжелым литий-полимерным аккумулятором.', category: 'auto', effectText: 'Зарядка гаджетов' },
    { id: 'elec_watch', itemId: 'smart_watch', nameRu: 'Тактические смарт-часы', price: 28000, description: 'Коробка с часами в титановом ударопрочном корпусе.', category: 'auto', effectText: 'Мониторинг здоровья' },
    { id: 'elec_radio', itemId: 'walkie_talkie', nameRu: 'Рация дальнего действия', price: 6800, description: 'Пылевлагозащитная радиостанция с длинной гибкой антенной.', category: 'auto', effectText: 'Связь в эфире' },
    { id: 'elec_phones', itemId: 'headphones', nameRu: 'Беспроводные наушники ANC', price: 15000, description: 'Кейс с наушниками, имеющими гибридное шумоподавление.', category: 'auto', effectText: 'Шумоизоляция' },
    { id: 'elec_flash', itemId: 'flashlight', nameRu: 'LED-фонарь со стробоскостом', price: 1800, description: 'Металлический тактический фонарик в пластиковом боксе.', category: 'auto', effectText: 'Освещение в темноте' },
    { id: 'elec_tv', itemId: 'furn_tv', nameRu: 'ЖК-Телевизор 55" 4K', price: 42000, description: 'Большая настенная/напольная плазменная панель для дома.', category: 'auto', effectText: 'Бытовая техника' },
    { id: 'elec_fridge', itemId: 'furn_fridge', nameRu: 'Двухкамерный холодильник', price: 32000, description: 'Бытовой холодильник для продуктов с морозильной камерой.', category: 'auto', effectText: 'Бытовая техника' }
  ],
  clothing: [
    { id: 'clo_beanie', itemId: 'beanie_black', nameRu: 'Черная шапка', price: 120, description: 'Теплая шерстяная черная шапка.', category: 'auto', effectText: 'Теплоизоляция +30%' },
    { id: 'clo_cap', itemId: 'cap_red', nameRu: 'Красная кепка', price: 80, description: 'Простая красная бейсболка. Защищает от солнца.', category: 'auto', effectText: 'Защита от солнца' },
    { id: 'clo_ushanka', itemId: 'ushanka_hat', nameRu: 'Шапка-ушанка', price: 250, description: 'Очень теплая меховая шапка для суровых морозов.', category: 'auto', effectText: 'Теплоизоляция +70%' },
    { id: 'clo_glasses', itemId: 'sunglasses', nameRu: 'Поляризационные очки', price: 110, description: 'Черный футляр с очками против ультрафиолета и бликов.', category: 'auto', effectText: 'Защита зрения' },
    { id: 'clo_scarf', itemId: 'scarf_blue', nameRu: 'Синий шарф', price: 130, description: 'Вязаный теплый синий шарф.', category: 'auto', effectText: 'Теплоизоляция +20%' },
    { id: 'clo_twhite', itemId: 'tshirt_white', nameRu: 'Белая футболка', price: 90, description: 'Легкая дышащая хлопковая футболка.', category: 'auto', effectText: 'Дыхание +80%' },
    { id: 'clo_tblack', itemId: 'tshirt_black', nameRu: 'Черная футболка', price: 90, description: 'Простая черная хлопковая футболка.', category: 'auto', effectText: 'Дыхание +80%' },
    { id: 'clo_ljohns', itemId: 'long_johns', nameRu: 'Термобелье', price: 220, description: 'Теплый базовый слой для холодной погоды.', category: 'auto', effectText: 'Теплоизоляция +40%' },
    { id: 'clo_sweater', itemId: 'sweater_blue', nameRu: 'Синяя кофта', price: 250, description: 'Удобная синяя вязаная кофта.', category: 'auto', effectText: 'Теплоизоляция +45%' },
    { id: 'clo_plaid', itemId: 'plaid_shirt', nameRu: 'Клетчатая рубашка', price: 180, description: 'Фланелевая клетчатая рубашка. Классика.', category: 'auto', effectText: 'Теплоизоляция +20%' },
    { id: 'clo_leather', itemId: 'leather_jacket', nameRu: 'Кожаная куртка', price: 450, description: 'Прочная кожаная куртка. Хорошо защищает от ветра.', category: 'auto', effectText: 'Ветрозащита +90%' },
    { id: 'clo_winter', itemId: 'winter_jacket', nameRu: 'Зимний пуховик', price: 500, description: 'Тяжелая утепленная куртка для сильных морозов.', category: 'auto', effectText: 'Теплоизоляция +90%' },
    { id: 'clo_raincoat', itemId: 'raincoat_yellow', nameRu: 'Желтый дождевик', price: 200, description: 'Водонепроницаемый плащ. Сохранит сухим.', category: 'auto', effectText: 'Влагозащита 100%' },
    { id: 'clo_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Полюс"', price: 350, description: 'Фирменная куртка на вешалке с мембраной и гусиным пухом.', category: 'auto', effectText: 'Защита от холода (-15°C)' },
    { id: 'clo_jeans', itemId: 'jeans_blue', nameRu: 'Синие джинсы', price: 280, description: 'Классические прочные джинсы.', category: 'auto', effectText: 'Вместительные карманы' },
    { id: 'clo_cargo', itemId: 'cargo_pants', nameRu: 'Штаны карго', price: 320, description: 'Практичные штаны с множеством карманов.', category: 'auto', effectText: 'Карманы 4.5L' },
    { id: 'clo_shorts', itemId: 'shorts_khaki', nameRu: 'Шорты хаки', price: 150, description: 'Легкие шорты для жаркой погоды.', category: 'auto', effectText: 'Дыхание +90%' },
    { id: 'clo_socks_w', itemId: 'socks_white', nameRu: 'Хлопковые носки', price: 30, description: 'Простые белые носки.', category: 'auto', effectText: 'Базовый слой' },
    { id: 'clo_socks_wool', itemId: 'socks_wool', nameRu: 'Шерстяные носки', price: 60, description: 'Теплая толстая вязочка.', category: 'auto', effectText: 'Теплоизоляция +40%' },
    { id: 'clo_sneakers_w', itemId: 'sneakers_white', nameRu: 'Белые кроссовки', price: 250, description: 'Удобная спортивная обувь.', category: 'auto', effectText: 'Легкая обувь' },
    { id: 'clo_sneakers', itemId: 'sneakers', nameRu: 'Кроссовки "Urban Sprint"', price: 280, description: 'Коробка с кроссовками: текстильная сетка, пенная подошва.', category: 'auto', effectText: '+20% Скорость бега' },
    { id: 'clo_work_boots', itemId: 'work_boots', nameRu: 'Рабочие ботинки', price: 380, description: 'Тяжелые кожаные рабочие ботинки.', category: 'auto', effectText: 'Влагозащита +60%' },
    { id: 'clo_winter_boots', itemId: 'winter_boots', nameRu: 'Зимние ботинки', price: 420, description: 'Утепленные ботинки для снега.', category: 'auto', effectText: 'Теплоизоляция +80%' },
    { id: 'clo_gloves_l', itemId: 'gloves_leather', nameRu: 'Кожаные перчатки', price: 160, description: 'Защищают руки от холода и царапин.', category: 'auto', effectText: 'Ветрозащита +60%' },
    { id: 'clo_gloves_w', itemId: 'gloves_winter', nameRu: 'Зимние перчатки', price: 220, description: 'Толстые утепленные перчатки.', category: 'auto', effectText: 'Теплоизоляция +60%' },
    { id: 'clo_pack_canvas', itemId: 'backpack', nameRu: 'Брезентовый рюкзак (28L)', price: 3500, description: 'Простой брезентовый походный рюкзак.', category: 'auto', effectText: 'Емкость 28L' },
    { id: 'clo_pack', itemId: 'backpack_travel', nameRu: 'Городской рюкзак (35L)', price: 6500, description: 'Плотный нейлоновый рюкзак с защищенным отсеком под ноутбук.', category: 'auto', effectText: 'Емкость 35L' }
  ],
  bookstore: [
    { id: 'bk_guide', itemId: 'city_guide', nameRu: 'Путеводитель по городу', price: 60, description: 'Глянцевая книжка карманного формата с подробной картой кварталов.', category: 'auto', effectText: 'Знание города' },
    { id: 'bk_note', itemId: 'notebook', nameRu: 'Блокнот для заметок', price: 35, description: 'Записная книжка в клетку, стянута эластичной резинкой.', category: 'auto', effectText: 'Записи' },
    { id: 'bk_pen', itemId: 'pen_stationery', nameRu: 'Шариковая ручка', price: 15, description: 'Прозрачный корпус, синие чернила повышенной укрывистости.', category: 'auto', effectText: 'Канцтовары' },
    { id: 'bk_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Рулон плотного серого сантехнического скотча на картонной втулке.', category: 'auto', effectText: 'Починка вещей' }
  ],
  sports_shop: [
    { id: 'spt_sneakers', itemId: 'sneakers', nameRu: 'Беговые кроссовки', price: 280, description: 'Эргономичная обувь для фитнеса с гелевыми амортизаторами.', category: 'auto', effectText: '+20% Скорость' },
    { id: 'spt_sneakers_w', itemId: 'sneakers_white', nameRu: 'Белые кроссовки', price: 250, description: 'Удобная спортивная обувь.', category: 'auto', effectText: 'Легкая обувь' },
    { id: 'spt_cap', itemId: 'cap_red', nameRu: 'Красная кепка', price: 80, description: 'Простая спортивная бейсболка.', category: 'auto', effectText: 'Защита от солнца' },
    { id: 'spt_tshirt', itemId: 'tshirt_white', nameRu: 'Белая спортивная футболка', price: 90, description: 'Дышащая хлопковая футболка.', category: 'auto', effectText: 'Дыхание +80%' },
    { id: 'spt_shorts', itemId: 'shorts_khaki', nameRu: 'Шорты хаки', price: 150, description: 'Легкие шорты для спорта и тренингов.', category: 'auto', effectText: 'Дыхание +90%' },
    { id: 'spt_ljohns', itemId: 'long_johns', nameRu: 'Термобелье', price: 220, description: 'Теплый базовый спортивный слой.', category: 'auto', effectText: 'Теплоизоляция +40%' },
    { id: 'spt_flask', itemId: 'camp_flask', nameRu: 'Стальная фляга (0.75L)', price: 90, description: 'Питьевая фляжка из пищевой стали, закручивающаяся пробка.', category: 'food', effectText: '+50% Гидратация' },
    { id: 'spt_bag', itemId: 'backpack_travel', nameRu: 'Спортивный рюкзак', price: 6500, description: 'Влагозащитный рюкзак со свистком на нагрудной стяжке.', category: 'auto', effectText: '+Слоты инвентаря' },
    { id: 'spt_energy', itemId: 'energy_drink', nameRu: 'Изотоник "Вспышка"', price: 65, description: 'Бутылочка спортивного энергетика с электролитами и таурином.', category: 'food', effectText: '+35% Энергия' },
    { id: 'spt_splint', itemId: 'splint', nameRu: 'Эластичный бандаж / Шина', price: 120, description: 'Коробка с неопреновым фиксатором на липучке.', category: 'medical', effectText: 'Лечение растяжений' }
  ],
  pharmacy: [
    { id: 'pha_panthenol', itemId: 'panthenol_spray', nameRu: 'Спрей Пантенол от ожогов', price: 450, description: 'Алюминиевый баллончик с пеной для заживления повреждений эпидермиса.', category: 'medical', effectText: 'Заживление ожогов 1-3 ст.' },
    { id: 'pha_spasatel', itemId: 'spasatel_ointment', nameRu: 'Бальзам «Спасатель»', price: 320, description: 'Тюбик в картонной пачке, натуральная мазь с облепиховым маслом.', category: 'medical', effectText: 'Регенерация тканей' },
    { id: 'pha_zelenka', itemId: 'zelenka', nameRu: 'Раствор Бриллиантового зеленого', price: 120, description: 'Стеклянный флакончик со спиртовым раствором яркого красителя.', category: 'medical', effectText: 'Стерилизация и сушка' },
    { id: 'pha_iodine', itemId: 'iodine', nameRu: 'Спиртовой раствор Йода 5%', price: 140, description: 'Флакон из темного стекла для дезинфекции кожи.', category: 'medical', effectText: 'Йодная сетка / Ушибы' },
    { id: 'pha_diclofenac', itemId: 'diclofenac_gel', nameRu: 'Гель Диклофенак 5%', price: 350, description: 'Алюминиевая туба с противовоспалительным охлаждающим гелем.', category: 'medical', effectText: 'Лечение растяжений' },
    { id: 'pha_peroxide', itemId: 'hydrogen_peroxide', nameRu: 'Перекись водорода 3%', price: 110, description: 'Пластиковый флакон с дозатором: шипит и коагулирует кровь в ране.', category: 'medical', effectText: 'Остановка крови и промывка' },
    { id: 'pha_ammonia', itemId: 'ammonia_spirit', nameRu: 'Нашатырный спирт (Аммиак 10%)', price: 150, description: 'Флакончик с летучим веществом с резким специфическим запахом.', category: 'medical', effectText: 'Снятие шока и обморока' },
    { id: 'pha_balm_star', itemId: 'balm_star', nameRu: 'Бальзам «Золотая Звезда»', price: 130, description: 'Легендарная крошечная жестяная круглая баночка с пахучей мазью.', category: 'medical', effectText: 'Головная боль и паника' },
    { id: 'pha_charcoal', itemId: 'activated_charcoal', nameRu: 'Активированный уголь', price: 80, description: 'Бумажная контурная упаковка: 10 черных пористых абсорбирующих таблеток.', category: 'medical', effectText: 'Снятие тошноты' },
    { id: 'pha_valerian', itemId: 'valerian_drops', nameRu: 'Капли настойки валерианы', price: 160, description: 'Флакон-капельница с ароматной спиртовой настойкой корня растения.', category: 'medical', effectText: 'Снятие паники и пульса' },
    { id: 'pha_bandage', itemId: 'bandage', nameRu: 'Стерильный бинт', price: 120, description: 'Медицинский марлевый бинт в герметичной бумажной обертке.', category: 'medical', effectText: 'Лечение кровотечений' },
    { id: 'pha_painkillers', itemId: 'painkillers', nameRu: 'Сильное обезболивающее', price: 380, description: 'Алюминиевый блистер с таблетками анальгетика быстрого действия.', category: 'medical', effectText: '-40 Уровень боли' },
    { id: 'pha_medkit', itemId: 'medkit', nameRu: 'Большая медицинская аптечка', price: 1500, description: 'Красный пластиковый чемоданчик с перевязочными и шинами.', category: 'medical', effectText: '+60 HP, Лечение ран' },
    { id: 'pha_antiseptic', itemId: 'antiseptic', nameRu: 'Антисептик для ран', price: 75, description: 'Флакон с распылителем, бесцветная жидкость без жжения.', category: 'medical', effectText: 'Дезинфекция' },
    { id: 'pha_vitamins', itemId: 'vitamins', nameRu: 'Витаминный комплекс', price: 85, description: 'Баночка с разноцветными драже поливитаминов.', category: 'medical', effectText: '+15 HP, Восстановление' },
    { id: 'pha_fever', itemId: 'antipyretic', nameRu: 'Жаропонижающее "Парацетамол"', price: 60, description: 'Таблетки в картонной пачке от высокой температуры и простуды.', category: 'medical', effectText: '+15 HP, Снятие жара' },
    { id: 'pha_patch', itemId: 'medical_patch', nameRu: 'Бактерицидные пластыри', price: 40, description: 'Набор дышащих телесных пластырей на полимерной основе.', category: 'medical', effectText: '+10 HP' },
    { id: 'pha_drops', itemId: 'eye_drops', nameRu: 'Глазные капли', price: 50, description: 'Флакон-капельница со стерильным успокаивающим раствором.', category: 'medical', effectText: '+10% Энергия' }
  ],
  auto_shop: [
    { id: 'aut_repair_kit', itemId: 'repair_kit', nameRu: 'Набор автоинструментов', price: 220, description: 'Тяжелый пластиковый кейс: торцевые головки, отвертки, ключи.', category: 'auto', effectText: 'Ремонт кузова/двигателя' },
    { id: 'aut_oil', itemId: 'motor_oil', nameRu: 'Канистра моторного масла', price: 110, description: 'Пластиковая канистра с оригинальным моторным маслом 5W-40.', category: 'auto', effectText: 'Защита двигателя' },
    { id: 'aut_antifreeze', itemId: 'antifreeze', nameRu: 'Канистра антифриза G12+ (5L)', price: 140, description: 'Канистра с охлаждающей жидкостью малинового цвета.', category: 'auto', effectText: 'Охлаждение двигателя' },
    { id: 'aut_rope', itemId: 'tow_rope', nameRu: 'Буксировочный трос 5т', price: 95, description: 'Оранжевая капроновая лента с массивными стальными крюками.', category: 'auto', effectText: 'Буксировка' },
    { id: 'aut_battery', itemId: 'car_battery', nameRu: 'Запасной аккумулятор', price: 180, description: 'Свинцово-кислотная герметичная батарея высокой пусковой мощности.', category: 'auto', effectText: 'Питание электроники' },
    { id: 'aut_extinguisher', itemId: 'extinguisher', nameRu: 'Автоогнетушитель', price: 130, description: 'Красный металлический баллон с чекой и манометром.', category: 'auto', effectText: 'Безопасность' },
    { id: 'aut_sandbag', itemId: 'sandbag', nameRu: 'Мешок песка (1 кг)', price: 30, description: 'Мешок с песком для тушения огня и впитывания топлива/масла/антифриза.', category: 'auto', effectText: 'Тушение & Впитывание' },
    { id: 'aut_sack_empty', itemId: 'sack_empty', nameRu: 'Пустой брезентовый мешок', price: 15, description: 'Прочный пустой мешок для наполнения песком или хранения вещей.', category: 'auto', effectText: 'Контейнер/Песок' },
    { id: 'aut_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Широкая клейкая лента с тканевым армированием.', category: 'auto', effectText: 'Починка' }
  ],
  cafe: [
    { id: 'caf_cappuccino', itemId: 'cappuccino', nameRu: 'Сливочный Cappuccino (0.35L)', price: 65, description: 'Бумажный стакан с плотной бархатистой молочной пенкой.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'caf_espresso', itemId: 'hot_coffee', nameRu: 'Горячий Espresso (Double)', price: 50, description: 'Крепчайший согревающий бодрящий напиток.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'caf_mint_tea', itemId: 'mint_leaves_fresh', nameRu: 'Чай со свежей мятой и лимоном', price: 45, description: 'Ароматный освежающий настой со свежими листьями мяты.', category: 'food', effectText: '+35% Гидратация, снятие стресса' },
    { id: 'caf_tea', itemId: 'tea_green', nameRu: 'Зеленый листовой чай Сенча', price: 40, description: 'Стаканчик китайского зеленого чая с жасмином.', category: 'food', effectText: '+35% Гидратация' },
    { id: 'caf_croissant', itemId: 'croissant', nameRu: 'Французский масляный круассан', price: 45, description: 'Хрустящая слоеная выпечка с нежным сливочным маслом.', category: 'food', effectText: '+25% Сытость' },
    { id: 'caf_donut', itemId: 'donut', nameRu: 'Пончик с ягодной глазурью', price: 40, description: 'Дрожжевой пончик в ароматной розовой помадке.', category: 'food', effectText: '+25% Сытость, +20% Энергия' },
    { id: 'caf_apple_puree', itemId: 'apple_puree_jar', nameRu: 'Яблочный мусс-десерт', price: 55, description: 'Нежнейшее яблочное пюре в стеклянной креманке.', category: 'food', effectText: '+20% Сытость, сладость' },
    { id: 'caf_melon_slice', itemId: 'melon_slice', nameRu: 'Летний ломоть дыни Канталупа', price: 50, description: 'Нарезанный сочный охлажденный ломоть сладкой дыни.', category: 'food', effectText: '+22% Сытость, +25% Гидратация' },
    { id: 'caf_watermelon_cup', itemId: 'watermelon_diced', nameRu: 'Стаканчик кубиков арбуза', price: 45, description: 'Холодные сочные кубики арбуза с трубочкой/вилкой.', category: 'food', effectText: '+45% Гидратация' },
    { id: 'caf_berries_tray', itemId: 'berries_tray_fresh', nameRu: 'Ягодный микс (клубника & черника)', price: 120, description: 'Лоток отборных свежих ягод к кофе.', category: 'food', effectText: '+20% Сытость, витамины' },
    { id: 'caf_kiwi_slice', itemId: 'kiwi_sliced', nameRu: 'Нарезка сочного киви', price: 35, description: 'Изумрудные сочные кружочки спелого киви.', category: 'food', effectText: '+10% Сытость, витамин C' },
    { id: 'caf_soup', itemId: 'soup', nameRu: 'Горячий куриный бульон с зеленью', price: 110, description: 'Контейнер согревающего куриного бульона с лапшой.', category: 'food', effectText: '+45% Сытость, +8°C Тепло' }
  ],
  gear_shop: [
    { id: 'gea_ration', itemId: 'military_ration', nameRu: 'Армейский сухпай (ИРП)', price: 220, description: 'Зеленая герметичная коробка с пайком на сутки, спичками и ложками.', category: 'food', effectText: '+85% Сытость, +50% Энергия' },
    { id: 'gea_lukoshko', itemId: 'lukoshko', nameRu: 'Плетёное берестяное лукошко (2.0L)', price: 90, description: 'Легкая плетеная корзинка с ручкой для сбора лесных ягод и грибов.', category: 'food', effectText: 'Тара для сбора ягод/грибов' },
    { id: 'gea_blueberry_basket', itemId: 'blueberry_basket', nameRu: 'Лукошко лесной черники (1.5L)', price: 180, description: 'Свежесобранная спелая черника в берестяном лукошке.', category: 'food', effectText: '+35% Сытость, витамины' },
    { id: 'gea_chanterelle_basket', itemId: 'chanterelle_basket', nameRu: 'Лукошко свежих лисичек (1.5L)', price: 210, description: 'Отборные рыжие лесные лисички в плетёном лукошке.', category: 'food', effectText: 'Свежие лесные грибы' },
    { id: 'gea_wild_honey', itemId: 'honey_wild_jar', nameRu: 'Дикий таёжный мёд (0.35L)', price: 240, description: 'Баночка концентрированного темного таежного бортевого меда.', category: 'food', effectText: '+50% Сытость, иммунитет' },
    { id: 'gea_thermos', itemId: 'thermos', nameRu: 'Походный термос с чаем (1.0L)', price: 260, description: 'Вакуумный термос из нержавеющей стали с горячим чаем.', category: 'food', effectText: '+50% Гидратация, +8°C Тепло' },
    { id: 'gea_soup_bowl', itemId: 'soup_bowl', nameRu: 'Походная суповая пиала с ложкой', price: 60, description: 'Глубокая походная миска для горячих супов и бульонов.', category: 'food', effectText: 'Тара для супа (0.5L)' },
    { id: 'gea_flask', itemId: 'camp_flask', nameRu: 'Стальная фляга (0.75L)', price: 90, description: 'Окрашенная в хаки металлическая походная бутылка с чехлом.', category: 'food', effectText: '+50% Гидратация' },
    { id: 'gea_flashlight', itemId: 'flashlight', nameRu: 'Яркий LED-фонарь', price: 1800, description: 'Алюминиевый герметичный фонарь с зубчатой короной линзы.', category: 'auto', effectText: 'Освещение в темноте' },
    { id: 'gea_knife', itemId: 'pocket_knife', nameRu: 'Туристический нож', price: 2000, description: 'Черная рукоять со стеклобоем, клинок с серрейтором.', category: 'auto', effectText: 'Инструмент' },
    { id: 'gea_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Arctix"', price: 350, description: 'Плотная горная парка со штормовым капюшоном.', category: 'auto', effectText: 'Защита от холода' },
    { id: 'gea_raincoat', itemId: 'raincoat_yellow', nameRu: 'Штормовой дождевик', price: 200, description: 'Плотный непромокаемый плащ для походов.', category: 'auto', effectText: 'Влагозащита 100%' },
    { id: 'gea_ushanka', itemId: 'ushanka_hat', nameRu: 'Тактическая шапка-ушанка', price: 250, description: 'Очень теплая меховая шапка.', category: 'auto', effectText: 'Теплоизоляция +70%' },
    { id: 'gea_cargo', itemId: 'cargo_pants', nameRu: 'Штаны карго', price: 320, description: 'Прочные полевые штаны с карманами.', category: 'auto', effectText: 'Карманы 4.5L' },
    { id: 'gea_wboots', itemId: 'winter_boots', nameRu: 'Зимние походные ботинки', price: 420, description: 'Тяжелые утепленные ботинки.', category: 'auto', effectText: 'Теплоизоляция +80%' },
    { id: 'gea_gloves_w', itemId: 'gloves_winter', nameRu: 'Зимние тактические перчатки', price: 220, description: 'Утепленные прочные перчатки.', category: 'auto', effectText: 'Теплоизоляция +60%' },
    { id: 'gea_sleep', itemId: 'sleeping_bag', nameRu: 'Спальный мешок (-15°C)', price: 4500, description: 'Компрессионный чехол с теплым туристическим коконом.', category: 'auto', effectText: 'Ночлег на природе' },
    { id: 'gea_zippo', itemId: 'zippo_lighter', nameRu: 'Зажигалка Zippo', price: 80, description: 'Хромированный металлический бензиновый девайс с характерным щелчком.', category: 'auto', effectText: 'Розжиг огня' },
    { id: 'gea_compass', itemId: 'compass', nameRu: 'Тактический компас', price: 1500, description: 'Металлический корпус с визиром и светящейся шкалой.', category: 'auto', effectText: 'Навигация' },
    { id: 'gea_pack_canvas', itemId: 'backpack', nameRu: 'Брезентовый походный рюкзак (28L)', price: 3500, description: 'Надежный брезентовый рюкзак.', category: 'auto', effectText: 'Емкость 28L' },
    { id: 'gea_pack', itemId: 'backpack_travel', nameRu: 'Тактический рюкзак (35L)', price: 6500, description: 'Рюкзак из плотной ткани Cordura с системой крепления итогов.', category: 'auto', effectText: '+Слоты инвентаря' }
  ],
  furniture_shop: [
    { id: 'furn_item_chair', itemId: 'furn_chair', nameRu: 'Деревянный стул со спинкой', price: 1800, description: 'Удобный деревянный стул. Устанавливается в собственной квартире на [E].', category: 'auto', effectText: 'Мебель / Интерьер' },
    { id: 'furn_item_table', itemId: 'furn_table', nameRu: 'Обеденный стол', price: 4500, description: 'Деревянный обеденный стол для кухни или гостиной.', category: 'auto', effectText: 'Мебель / Интерьер' },
    { id: 'furn_item_sofa', itemId: 'furn_sofa', nameRu: 'Мягкий диван-кровать', price: 16500, description: 'Уютный двухместный мягкий диван для гостиной и отдыха.', category: 'auto', effectText: 'Мебель / Отдых' },
    { id: 'furn_item_bed', itemId: 'furn_bed', nameRu: 'Двуспальная кровать с матрасом', price: 24000, description: 'Комфортная кровать с ортопедическим матрасом.', category: 'auto', effectText: 'Мебель / Сон и отдых' },
    { id: 'furn_item_fridge', itemId: 'furn_fridge', nameRu: 'Двухкамерный холодильник', price: 32000, description: 'Вместительный бытовой холодильник для хранения продуктов.', category: 'auto', effectText: 'Мебель / Хранилище' },
    { id: 'furn_item_tv', itemId: 'furn_tv', nameRu: 'ЖК-Телевизор 55" 4K', price: 42000, description: 'Большая настенная/напольная плазменная панель.', category: 'auto', effectText: 'Мебель / Техника' },
    { id: 'furn_item_shelf', itemId: 'furn_shelf', nameRu: 'Книжный стеллаж', price: 6500, description: 'Вместительный открытый стеллаж для вещей и книг.', category: 'auto', effectText: 'Мебель / Хранилище' },
    { id: 'furn_item_plant', itemId: 'furn_plant', nameRu: 'Комнатный фикус в горшке', price: 1200, description: 'Декоративное комнатное растение для уюта.', category: 'auto', effectText: 'Декор / Уют' }
  ]
};

// Procedural Audio Synthesizers using Web Audio API
const playCoinDrop = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(1400 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(900 + Math.random() * 100, now + 0.12);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.15);
  } catch (e) {}
};

const playCashRustle = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.04;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, ctx.currentTime);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start();
  } catch (e) {}
};

const playTerminalBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
};

const playCashRegister = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1760, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2200, now);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
  } catch (e) {}
};

export interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop?: CityShop | null;
  shopTitle?: string;
  shopType?: CityShop['type'];
  player: Player | null;
  world?: any;
  onBuyItem?: (item: ShopItem, count?: number) => void;
  onBuyItems?: (items: ShopItem[], totalCost: number) => void;
  onRepairVehicle?: (alreadyPaid?: boolean, customCost?: number) => void;
  canRepairVehicle?: boolean;
  currentVehicle?: Vehicle | null;
  vehicles?: Vehicle[];
  gasPumps?: any[];
  onTuningVehicle?: (action: string, metadata?: any) => void;
}

export const ShopModal: React.FC<ShopModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    player,
    onRepairVehicle,
    canRepairVehicle,
    vehicles,
    onTuningVehicle
  } = props;

  const [cart, setCart] = useState<{ item: ShopItem; count: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'diagnostics' | 'repair' | 'tuning' | 'cart' | 'pos' | 'lpg'>('catalog');
  const [trayDenoms, setTrayDenoms] = useState<Record<string, number>>({});
  const [posSuccess, setPosSuccess] = useState<boolean>(false);

  // Diagnostics states
  const [isScanningEcu, setIsScanningEcu] = useState<boolean>(false);
  const [hasScannedEcu, setHasScannedEcu] = useState<boolean>(false);

  // Repair states
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairActionMessage, setRepairActionMessage] = useState<string | null>(null);
  const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const [currentRepairStep, setCurrentRepairStep] = useState<number>(0);
  const [totalRepairStepsCount, setTotalRepairStepsCount] = useState<number>(0);

  // Tuning states
  const [installingChiptuning, setInstallingChiptuning] = useState<boolean>(false);
  const [chiptuningProgress, setChiptuningProgress] = useState<number>(0);

  const [installingSuspension, setInstallingSuspension] = useState<boolean>(false);
  const [suspensionProgress, setSuspensionProgress] = useState<number>(0);

  const [installingLpg, setInstallingLpg] = useState<boolean>(false);
  const [lpgProgress, setLpgProgress] = useState<number>(0);

  const [installingCamera, setInstallingCamera] = useState<boolean>(false);
  const [cameraProgress, setCameraProgress] = useState<number>(0);

  // Paint Shop states
  const [selectedPaintTarget, setSelectedPaintTarget] = useState<'body' | 'roof'>('body');
  const [selectedColor, setSelectedColor] = useState<string>('#18181b');
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const [paintProgress, setPaintProgress] = useState<number>(0);

  // Resolve shop dynamically
  const shopTypeResolved = props.shop?.type || props.shopType || 'supermarket';
  const shopTitleResolved = props.shop?.nameRu || props.shopTitle || 'Магазин';

  const shop = props.shop || CITY_SHOPS.find(s => s.type === shopTypeResolved) || {
    id: 'dynamic_shop',
    nameRu: shopTitleResolved,
    type: shopTypeResolved,
    x: player?.x || 0,
    y: player?.y || 0,
    icon: '[МАГАЗИН]',
    badgeColor: '#10b981',
    description: 'Магазин товаров и услуг.'
  };

  // Resolve current vehicle dynamically based on proximity or player state (240px range)
  const vehiclesList = vehicles || [];
  let currentVehicleResolved = props.currentVehicle || null;
  if (!currentVehicleResolved && player && vehiclesList.length > 0) {
    if (player.isInVehicle && player.currentVehicleId) {
      currentVehicleResolved = vehiclesList.find((v: any) => v.id === player.currentVehicleId) || null;
    } else {
      currentVehicleResolved = vehiclesList
        .filter((v: any) => Math.hypot(v.x - player.x, v.y - player.y) < 240)
        .sort((a: any, b: any) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] || null;
    }
  }
  const currentVehicle = currentVehicleResolved;

  // Initialize selected color from vehicle
  useEffect(() => {
    if (currentVehicle) {
      if (selectedPaintTarget === 'roof') {
        setSelectedColor(currentVehicle.roofColor || currentVehicle.color || '#18181b');
      } else {
        setSelectedColor(currentVehicle.color || '#18181b');
      }
    }
  }, [currentVehicle?.id, selectedPaintTarget]);

  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setActiveTab('catalog');
      setTrayDenoms({});
      setPosSuccess(false);
      setInstallingLpg(false);
      setInstallingCamera(false);
      setIsScanningEcu(false);
      setHasScannedEcu(false);
      setIsRepairing(false);
      setRepairActionMessage(null);
    }
  }, [isOpen, shop?.id]);

  if (!isOpen || !shop || !player) return null;

  const playerCash = getPlayerCash(player);
  const catalog = SHOP_CATALOGS[shop.type] || SHOP_CATALOGS.supermarket;
  const isAutoShopOrGas = shop.type === 'auto_shop' 
    || shop.type === 'gas_station_shop'
    || shop.id.includes('pitstop')
    || shop.nameRu.toLowerCase().includes('авто')
    || shop.nameRu.toLowerCase().includes('сервис')
    || shop.nameRu.toLowerCase().includes('pit-stop')
    || shop.nameRu.toLowerCase().includes('мастерск')
    || shop.nameRu.toLowerCase().includes('сто')
    || shop.nameRu.toLowerCase().includes('гараж');

  const cartTotal = cart.reduce((acc, entry) => acc + entry.item.price * entry.count, 0);
  const totalCartItemsCount = cart.reduce((acc, entry) => acc + entry.count, 0);

  const handleAddToCart = (item: ShopItem) => {
    sound.playUseItem();
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, count: i.count + 1 } : i);
      }
      return [...prev, { item, count: 1 }];
    });
  };

  const handleRemoveOneFromCart = (itemId: string) => {
    sound.playUseItem();
    setCart(prev => {
      const existing = prev.find(i => i.item.id === itemId);
      if (!existing) return prev;
      if (existing.count > 1) {
        return prev.map(i => i.item.id === itemId ? { ...i, count: i.count - 1 } : i);
      }
      return prev.filter(i => i.item.id !== itemId);
    });
  };

  const playerDenoms = getPlayerDenominations(player);

  const inTrayMoney = Object.entries(trayDenoms).reduce((sum, [id, count]) => {
    const found = playerDenoms.find(d => d.itemId === id);
    return sum + (found ? found.nominal * count : 0);
  }, 0);

  const handleClearCart = () => {
    sound.playUseItem();
    setCart([]);
    setTrayDenoms({});
  };

  const handleAddTrayDenom = (itemId: string) => {
    const d = playerDenoms.find(p => p.itemId === itemId);
    if (!d) return;
    const currentInTray = trayDenoms[itemId] || 0;
    if (currentInTray < d.count) {
      if (d.type === 'coin') {
        sound.playCoinDrop();
      } else {
        sound.playCashRustle();
      }
      setTrayDenoms(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1
      }));
    }
  };

  const handleRemoveTrayDenom = (itemId: string) => {
    const currentInTray = trayDenoms[itemId] || 0;
    if (currentInTray > 0) {
      sound.playCashRustle();
      setTrayDenoms(prev => {
        const next = { ...prev };
        if (next[itemId] <= 1) {
          delete next[itemId];
        } else {
          next[itemId] -= 1;
        }
        return next;
      });
    }
  };

  const handleExactTrayMoney = () => {
    sound.playCashRustle();
    const optimal = calcOptimalTrayPayment(player, cartTotal);
    setTrayDenoms(optimal);
  };

  const handleClearTray = () => {
    sound.playCashRustle();
    setTrayDenoms({});
  };

  const handleExecutePOSPayment = () => {
    if (inTrayMoney < cartTotal) return;
    if (playerCash < cartTotal) return;

    sound.playTurnSignalTick(true);
    sound.playBuySell();

    // Process all items in cart
    if (props.onBuyItems) {
      const flatItems: ShopItem[] = [];
      cart.forEach(entry => {
        for (let i = 0; i < entry.count; i++) {
          flatItems.push(entry.item);
        }
      });
      props.onBuyItems(flatItems, cartTotal);
    } else if (props.onBuyItem) {
      cart.forEach(entry => {
        props.onBuyItem!(entry.item, entry.count);
      });
    }

    setPosSuccess(true);
    setTimeout(() => {
      setCart([]);
      setTrayDenoms({});
      setPosSuccess(false);
      setActiveTab('catalog');
    }, 1200);
  };

  // --- DIAGNOSTICS LOGIC ---
  const handleScanEcu = () => {
    if (!currentVehicle) return;
    sound.playUseItem();
    setIsScanningEcu(true);
    setTimeout(() => {
      setIsScanningEcu(false);
      setHasScannedEcu(true);
      sound.playPickup();
    }, 1200);
  };

  // DTC Diagnostic trouble codes calculation
  const dtcErrors: { code: string; title: string; desc: string; severity: 'critical' | 'warning' }[] = [];
  if (currentVehicle) {
    if (currentVehicle.engineState?.isSeized) {
      dtcErrors.push({
        code: 'P0219',
        title: 'Заклинивание блока цилиндров',
        desc: 'ДВС заклинен вследствие масляного голодания или критического перегрева.',
        severity: 'critical'
      });
    }
    if (currentVehicle.engineState?.radiatorPunctured || (currentVehicle.engineState?.radiatorWater ?? 100) < 30) {
      dtcErrors.push({
        code: 'P0117',
        title: 'Утечка контура охлаждения ДВС',
        desc: 'Радиатор пробит или уровень антифриза критически низок. Опасность термического заклинивания.',
        severity: 'critical'
      });
    }
    if (currentVehicle.engineState?.oilPunctured || (currentVehicle.engineState?.oilLevel ?? 100) < 25) {
      dtcErrors.push({
        code: 'P0524',
        title: 'Критическое падение давления масла',
        desc: 'Пробит масляный картер. Уровень масла недопустимо мал, повреждение вкладышей коленвала.',
        severity: 'critical'
      });
    }
    if ((currentVehicle.engineState?.engineHealth ?? 100) < 70) {
      dtcErrors.push({
        code: 'P0300',
        title: 'Множественные пропуски зажигания / Износ ЦПГ',
        desc: `Ресурс ДВС снижен до ${Math.round(currentVehicle.engineState?.engineHealth ?? 100)}%. Падение компрессии.`,
        severity: 'warning'
      });
    }
    if ((currentVehicle.engineState?.batteryCharge ?? 100) < 40) {
      dtcErrors.push({
        code: 'P0562',
        title: 'Глубокий разряд аккумуляторной батареи (АКБ)',
        desc: `Заряд АКБ ${Math.round(currentVehicle.engineState?.batteryCharge ?? 100)}%. Прокрутка стартера затруднена.`,
        severity: 'warning'
      });
    }
    if (Math.abs(currentVehicle.damage?.steeringDrift || 0) > 0.05) {
      const dir = (currentVehicle.damage?.steeringDrift || 0) < 0 ? 'влево' : 'вправо';
      dtcErrors.push({
        code: 'C1100',
        title: 'Нарушение углов установки колес (Сход-развал)',
        desc: `Отклонение рулевой геометрии: постоянный увод автомобиля ${dir}. Необходима 3D юстировка.`,
        severity: 'warning'
      });
    }
    if (currentVehicle.fuelSystem?.tankPunctured || currentVehicle.fuelSystem?.fuelRailBroken) {
      dtcErrors.push({
        code: 'P0087',
        title: 'Разгерметизация топливной системы',
        desc: 'Пробит топливный бак или повреждена рампа впрыска. Утечка горючего.',
        severity: 'critical'
      });
    }
    if ((currentVehicle.damage?.frontCrumple || 0) > 4 || currentVehicle.damage?.windshieldCracked) {
      dtcErrors.push({
        code: 'B1004',
        title: 'Деформация силовых элементов кузова',
        desc: 'Смятие лонжеронов / повреждение остекления. Требуются стапельные и малярные работы.',
        severity: 'warning'
      });
    }
  }

  // --- DYNAMIC WORK-ORDER (НАРЯД-ЗАКАЗ) SYSTEM ---
  const getActiveRepairs = () => {
    if (!currentVehicle) return [];
    
    const list: {
      id: string;
      title: string;
      desc: string;
      price: number;
      needsRepair: boolean;
      apply: (v: Vehicle) => void;
    }[] = [
      {
        id: 'engine_health',
        title: 'Капитальный ремонт цилиндро-поршневой группы (ЦПГ)',
        desc: 'Проточка блока цилиндров, хонингование гильз, замена поршневых колец, шатунных вкладышей и прокладки ГБЦ. Устраняет критический износ и восстанавливает компрессию до 100%.',
        price: Math.round((100 - (currentVehicle.engineState?.engineHealth ?? 100)) * 320) + 2500,
        needsRepair: (currentVehicle.engineState?.engineHealth ?? 100) < 95,
        apply: (v) => {
          if (v.engineState) {
            v.engineState.engineHealth = 100;
            v.engineState.engineKnocking = false;
            v.engineState.engineStalled = false;
            v.engineState.isSeized = false;
          }
        }
      },
      {
        id: 'leaks_and_fluids',
        title: 'Аргонная сварка картера и замена техжидкостей ДВС',
        desc: 'Аргонно-дуговая сварка трещин поддона картера, пайка поврежденных сот радиатора охлаждения. Полная замена моторного масла 5W-40 и антифриза G12+.',
        price: (currentVehicle.engineState?.radiatorPunctured ? 4500 : 0) + (currentVehicle.engineState?.oilPunctured ? 3800 : 0) + 1200,
        needsRepair: !!(currentVehicle.engineState?.radiatorPunctured || currentVehicle.engineState?.oilPunctured || (currentVehicle.engineState?.oilLevel ?? 100) < 90 || (currentVehicle.engineState?.radiatorWater ?? 100) < 90),
        apply: (v) => {
          if (v.engineState) {
            v.engineState.radiatorPunctured = false;
            v.engineState.oilPunctured = false;
            v.engineState.oilLevel = 100;
            v.engineState.radiatorWater = 100;
            v.engineState.overheatingSteam = false;
          }
        }
      },
      {
        id: 'alignment',
        title: 'Сход-развал 3D и юстировка рычагов подвески',
        desc: 'Лазерная 3D регулировка углов установки колес на стенде Hunter, замена деформированных сайлентблоков, регулировка рулевых тяг и наконечников. Устраняет боковой увод руля.',
        price: Math.round(
          ((currentVehicle.damage?.frontLeftSuspensionDamage || 0) + 
           (currentVehicle.damage?.frontRightSuspensionDamage || 0) + 
           (currentVehicle.damage?.rearLeftSuspensionDamage || 0) + 
           (currentVehicle.damage?.rearRightSuspensionDamage || 0)) * 5000 + 
          (Math.abs(currentVehicle.damage?.steeringDrift || 0) > 0.01 ? 1800 : 0)
        ),
        needsRepair: Math.abs(currentVehicle.damage?.steeringDrift || 0) > 0.01 || 
                     (currentVehicle.damage?.frontLeftSuspensionDamage || 0) > 0.05 ||
                     (currentVehicle.damage?.frontRightSuspensionDamage || 0) > 0.05 ||
                     (currentVehicle.damage?.rearLeftSuspensionDamage || 0) > 0.05 ||
                     (currentVehicle.damage?.rearRightSuspensionDamage || 0) > 0.05,
        apply: (v) => {
          if (v.damage) {
            v.damage.steeringDrift = 0;
            v.damage.frontLeftSuspensionDamage = 0;
            v.damage.frontRightSuspensionDamage = 0;
            v.damage.rearLeftSuspensionDamage = 0;
            v.damage.rearRightSuspensionDamage = 0;
          }
        }
      },
      {
        id: 'starter_battery',
        title: 'Зарядка АКБ, десульфатация и переборка стартера',
        desc: 'Глубокий десульфатирующий заряд батареи, очистка клемм от окислов. Замена изношенного втягивающего реле, бендикса и щеточного узла стартера.',
        price: (!currentVehicle.engineState?.starterWorking ? 1800 : 0) + Math.round((100 - (currentVehicle.engineState?.batteryCharge ?? 100)) * 25) + 500,
        needsRepair: (currentVehicle.engineState?.batteryCharge ?? 100) < 95 || !currentVehicle.engineState?.starterWorking,
        apply: (v) => {
          if (v.engineState) {
            v.engineState.batteryCharge = 100;
            v.engineState.starterWorking = true;
          }
        }
      },
      {
        id: 'bodywork',
        title: 'Стапельные работы кузовного цеха и замена триплекс остекления',
        desc: 'Выравнивание лонжеронов на гидравлическом стапеле по контрольным точкам кузова, рихтовка навесных панелей, вклейка лобового/заднего остекления триплекс, замена разбитой оптики.',
        price: Math.round(
          ((currentVehicle.damage?.frontCrumple || 0) + 
           (currentVehicle.damage?.rearCrumple || 0) + 
           (currentVehicle.damage?.leftDent || 0) + 
           (currentVehicle.damage?.rightDent || 0)) * 3000 + 
          (currentVehicle.damage?.windshieldCracked ? 6500 : 0) + 
          (currentVehicle.damage?.rearGlassCracked ? 4500 : 0) + 
          ((currentVehicle.damage?.leftHeadlightBroken ? 1 : 0) + 
           (currentVehicle.damage?.rightHeadlightBroken ? 1 : 0) + 
           (currentVehicle.damage?.leftTaillightBroken ? 1 : 0) + 
           (currentVehicle.damage?.rightTaillightBroken ? 1 : 0)) * 2500
        ),
        needsRepair: !!((currentVehicle.damage?.frontCrumple || 0) > 0.05 || 
                      (currentVehicle.damage?.rearCrumple || 0) > 0.05 || 
                      (currentVehicle.damage?.leftDent || 0) > 0.05 || 
                      (currentVehicle.damage?.rightDent || 0) > 0.05 ||
                      currentVehicle.damage?.windshieldCracked || 
                      currentVehicle.damage?.rearGlassCracked ||
                      currentVehicle.damage?.leftHeadlightBroken ||
                      currentVehicle.damage?.rightHeadlightBroken ||
                      currentVehicle.damage?.leftTaillightBroken ||
                      currentVehicle.damage?.rightTaillightBroken),
        apply: (v) => {
          if (v.damage) {
            v.damage.frontCrumple = 0;
            v.damage.rearCrumple = 0;
            v.damage.leftDent = 0;
            v.damage.rightDent = 0;
            v.damage.frontLeftDent = 0;
            v.damage.frontRightDent = 0;
            v.damage.rearLeftDent = 0;
            v.damage.rearRightDent = 0;
            v.damage.hoodBuckled = false;
            v.damage.windshieldCracked = false;
            v.damage.rearGlassCracked = false;
            v.damage.leftHeadlightBroken = false;
            v.damage.rightHeadlightBroken = false;
            v.damage.leftTaillightBroken = false;
            v.damage.rightTaillightBroken = false;
          }
        }
      },
      {
        id: 'fuel_system',
        title: 'Устранение разгерметизации топливной рампы и бака',
        desc: 'Выявление утечек бензобака, заварка пробоин бензостойким шовным герметиком, замена топливных магистралей высокого давления и топливной рампы впрыска.',
        price: (currentVehicle.fuelSystem?.tankPunctured ? 4800 : 0) + (currentVehicle.fuelSystem?.fuelRailBroken ? 3500 : 0) + 800,
        needsRepair: !!(currentVehicle.fuelSystem?.tankPunctured || currentVehicle.fuelSystem?.fuelRailBroken),
        apply: (v) => {
          if (v.fuelSystem) {
            v.fuelSystem.tankPunctured = false;
            v.fuelSystem.fuelRailBroken = false;
          }
        }
      }
    ];

    return list.filter(item => item.needsRepair);
  };

  const handleFullRepair = () => {
    if (!onRepairVehicle || !currentVehicle) return;
    
    const activeRepairs = getActiveRepairs();
    if (activeRepairs.length === 0) {
      setRepairActionMessage('Компьютерная диагностика не обнаружила дефектов. Все системы автомобиля в норме!');
      setTimeout(() => setRepairActionMessage(null), 3500);
      return;
    }

    const totalCost = activeRepairs.reduce((sum, r) => sum + r.price, 0);
    if (playerCash < totalCost) {
      setRepairActionMessage(`Недостаточно средств! Требуется ${totalCost.toLocaleString()} ₽, у вас ${playerCash.toLocaleString()} ₽`);
      setTimeout(() => setRepairActionMessage(null), 4000);
      return;
    }

    sound.playUseItem();
    setIsRepairing(true);
    setRepairLogs([]);
    setCurrentRepairStep(0);
    
    // Mark vehicle under repair to prevent entry/use
    (currentVehicle as any).isUnderRepair = true;

    // Compile dynamic, realistic mechanic terminal logs
    const logSteps: string[] = [
      `>>> ИНИЦИАЛИЗАЦИЯ ТЕХНИЧЕСКОГО ЦИКЛА РЕМОНТА ДЛЯ ТС: ${currentVehicle.nameRu || currentVehicle.type}...`,
      `[1/4] Считывание ошибок OBD-II, подготовка ремонтного поста и инструмента...`,
      `[1/4] Позиционирование ТС на двухстоечном подъемнике, блокировка осей...`
    ];

    if (activeRepairs.some(r => r.id === 'engine_health')) {
      logSteps.push(`[2/4] ДВС: Слив технических жидкостей, снятие клапанной крышки и ГБЦ...`);
      logSteps.push(`[2/4] ДВС: Расточка блока цилиндров под ремонтный размер, плоскостное хонингование гильз...`);
      logSteps.push(`[2/4] ДВС: Замена поршневых колец, упорных полуколец, шатунных вкладышей и прокладки ГБЦ...`);
      logSteps.push(`[2/4] ДВС: Сборка агрегата, динамометрическая затяжка болтов головки по схеме завода...`);
    }

    if (activeRepairs.some(r => r.id === 'leaks_and_fluids')) {
      logSteps.push(`[2/4] ТЕЧИ: Демонтаж поддона, аргонно-дуговая сварка трещин картера...`);
      logSteps.push(`[2/4] ОХЛАЖДЕНИЕ: Опрессовка системы под давлением, герметизация и пайка сот радиатора...`);
      logSteps.push(`[2/4] ЖИДКОСТИ: Промывка каналов, заправка моторного масла 5W-40 и антифриза G12+...`);
    }

    if (activeRepairs.some(r => r.id === 'fuel_system')) {
      logSteps.push(`[2/4] ТОПЛИВО: Герметизация пробоин бензобака, замена магистралей высокого давления...`);
    }

    if (activeRepairs.some(r => r.id === 'alignment')) {
      logSteps.push(`[3/4] ПОДВЕСКА: Прессовка новых сайлентблоков, замена деформированных рычагов и тяг...`);
      logSteps.push(`[3/4] СХОД-РАЗВАЛ: Лазерная компенсация биения дисков, юстировка углов на 3D-стенде Hunter...`);
    }

    if (activeRepairs.some(r => r.id === 'starter_battery')) {
      logSteps.push(`[3/4] ЭЛЕКТРИКА: Зачистка окисления клемм АКБ, замена щеток и втягивающего реле стартера...`);
      logSteps.push(`[3/4] АКБ: Проведение цикла десульфатации пластин, зарядка батареи импульсным током до 100%...`);
    }

    if (activeRepairs.some(r => r.id === 'bodywork')) {
      logSteps.push(`[4/4] КУЗОВ: Установка кузова на стапель, гидравлическая вытяжка лонжеронов по геометрии...`);
      logSteps.push(`[4/4] КУЗОВ: Срезка старого герметика стекла, профессиональная вклейка лобового стекла триплекс...`);
      logSteps.push(`[4/4] КУЗОВ: Замена разбитых блок-фар на новые, калибровка направления световых пучков...`);
    }

    logSteps.push(`[СХЕМА] Полная очистка буфера ошибок ЭБУ по протоколу OBD-II, калибровка датчиков...`);
    logSteps.push(`>>> НАРЯД-ЗАКАЗ ЗАКРЫТ. ТС СНЯТО С ПОДЪЕМНИКА И ГОТОВО К СДАЧЕ КЛИЕНТУ!`);

    setTotalRepairStepsCount(logSteps.length);

    let step = 0;
    const interval = setInterval(() => {
      setRepairLogs(prev => [...prev, logSteps[step]]);
      setCurrentRepairStep(step + 1);
      sound.playUseItem();

      step++;
      if (step >= logSteps.length) {
        clearInterval(interval);
        
        // Execute physical logic for each repair item
        activeRepairs.forEach(r => r.apply(currentVehicle));

        // Submit the repair with custom cost to App.tsx
        onRepairVehicle?.(false, totalCost);
        
        setIsRepairing(false);
        (currentVehicle as any).isUnderRepair = false;
        setRepairActionMessage('Техническое обслуживание и ремонт по наряд-заказу успешно завершены!');
        setTimeout(() => setRepairActionMessage(null), 3000);
      }
    }, 600); // 600ms per step
  };

  // --- TUNING HANDLERS ---
  // 1. Stage 1 Chiptuning
  const CHIPTUNING_PRICE = 15000;
  const isChiptuned = Boolean(
    (currentVehicle as any)?.isChiptuned || 
    (currentVehicle as any)?.hasChiptuning || 
    currentVehicle?.engineState?.isChiptuned
  );

  const handleInstallChiptuning = () => {
    if (!currentVehicle || playerCash < CHIPTUNING_PRICE || isChiptuned) return;
    sound.playUseItem();
    setInstallingChiptuning(true);
    setChiptuningProgress(0);

    const interval = setInterval(() => {
      setChiptuningProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          deductPlayerCash(player, CHIPTUNING_PRICE);
          (currentVehicle as any).isChiptuned = true;
          (currentVehicle as any).hasChiptuning = true;
          if (currentVehicle.engineState) {
            (currentVehicle.engineState as any).isChiptuned = true;
          }
          setInstallingChiptuning(false);
          if (onTuningVehicle) onTuningVehicle('chiptuning');
          sound.playPickup();
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  // 2. Bilstein HD Suspension
  const SUSPENSION_PRICE = 25000;
  const isHeavySuspended = Boolean(
    (currentVehicle as any)?.isHeavySuspended || 
    (currentVehicle as any)?.hasHeavySuspension || 
    currentVehicle?.engineState?.isHeavySuspended
  );

  const handleInstallSuspension = () => {
    if (!currentVehicle || playerCash < SUSPENSION_PRICE || isHeavySuspended) return;
    sound.playUseItem();
    setInstallingSuspension(true);
    setSuspensionProgress(0);

    const interval = setInterval(() => {
      setSuspensionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          deductPlayerCash(player, SUSPENSION_PRICE);
          (currentVehicle as any).isHeavySuspended = true;
          (currentVehicle as any).hasHeavySuspension = true;
          if (currentVehicle.engineState) {
            (currentVehicle.engineState as any).isHeavySuspended = true;
          }
          setInstallingSuspension(false);
          if (onTuningVehicle) onTuningVehicle('suspension');
          sound.playPickup();
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  // 3. LPG System Installer
  const lpgConfig = currentVehicle ? getLPGConfigForVehicle(currentVehicle.type) : null;
  const hasLpgInstalled = currentVehicle?.fuelSystem?.hasLPG;

  const handleInstallLPG = () => {
    if (!currentVehicle || !lpgConfig || !lpgConfig.isAvailable) return;
    if (playerCash < lpgConfig.price) return;

    sound.playUseItem();
    setInstallingLpg(true);
    setLpgProgress(0);

    const interval = setInterval(() => {
      setLpgProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          deductPlayerCash(player, lpgConfig.price);
          const capacity = lpgConfig.capacity || 55;
          if (currentVehicle.fuelSystem) {
            currentVehicle.fuelSystem.hasLPG = true;
            currentVehicle.fuelSystem.gboInstalled = true;
            currentVehicle.fuelSystem.gboActive = true;
            currentVehicle.fuelSystem.lpgTankCapacity = capacity;
            currentVehicle.fuelSystem.gboCapacity = capacity;
            currentVehicle.fuelSystem.lpgTankLevel = 100;
            currentVehicle.fuelSystem.gboLevel = 100;
            currentVehicle.fuelSystem.activeFuelSource = 'petrol';
          }
          currentVehicle.hasGBO = true;
          setInstallingLpg(false);
          if (onTuningVehicle) onTuningVehicle('gbo_install');
          sound.playPickup();
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const handleRemoveLPG = () => {
    if (!currentVehicle || !lpgConfig) return;
    sound.playUseItem();
    if (currentVehicle.fuelSystem) {
      currentVehicle.fuelSystem.hasLPG = false;
      currentVehicle.fuelSystem.gboInstalled = false;
      currentVehicle.fuelSystem.gboActive = false;
      currentVehicle.fuelSystem.gboLevel = 0;
      currentVehicle.fuelSystem.activeFuelSource = 'petrol';
    }
    currentVehicle.hasGBO = false;
    if (onTuningVehicle) onTuningVehicle('gbo_remove');
    sound.playPickup();
  };

  // 4. Rearview Camera
  const CAMERA_PRICE = 12000;
  const isCameraFactoryInstalled = currentVehicle ? ['sports', 'sedan_luxury', 'suv_luxury', 'supercar', 'coupe_gt', 'wagon_modern', 'wagon_allroad'].includes(currentVehicle.type) : false;
  const hasCameraInstalled = currentVehicle ? (!!currentVehicle.hasRearviewCamera || isCameraFactoryInstalled) : false;

  const handleInstallCamera = () => {
    if (!currentVehicle) return;
    if (playerCash < CAMERA_PRICE) return;

    sound.playUseItem();
    setInstallingCamera(true);
    setCameraProgress(0);

    const interval = setInterval(() => {
      setCameraProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          deductPlayerCash(player, CAMERA_PRICE);
          currentVehicle.hasRearviewCamera = true;
          setInstallingCamera(false);
          if (onTuningVehicle) {
            onTuningVehicle('rearview_camera');
          }
          sound.playPickup();
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleRemoveCamera = () => {
    if (!currentVehicle) return;
    sound.playUseItem();
    currentVehicle.hasRearviewCamera = false;
    if (onTuningVehicle) {
      onTuningVehicle('rearview_camera_remove');
    }
    sound.playPickup();
  };

  // 5. Paint Shop
  const PAINT_PRICE = 8000;
  const PAINT_COLORS = [
    { name: 'Черный глубокий', value: '#18181b' },
    { name: 'Белоснежный перламутр', value: '#f4f4f5' },
    { name: 'Королевский сапфир', value: '#1d4ed8' },
    { name: 'Изумрудный темно-зеленый', value: '#14532d' },
    { name: 'Алый спорт', value: '#b91c1c' },
    { name: 'Глубокий бордо', value: '#881337' },
    { name: 'Мокрый графит', value: '#374151' },
    { name: 'Серебристый титан', value: '#94a3b8' },
    { name: 'Золотистый янтарь', value: '#ca8a04' },
    { name: 'Оранжевый трек', value: '#ea580c' },
  ];

  const handlePaintVehicle = () => {
    if (!currentVehicle || playerCash < PAINT_PRICE || !selectedColor) return;
    sound.playUseItem();
    setIsPainting(true);
    setPaintProgress(0);

    const interval = setInterval(() => {
      setPaintProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          deductPlayerCash(player, PAINT_PRICE);
          if (selectedPaintTarget === 'roof') {
            currentVehicle.roofColor = selectedColor;
          } else {
            currentVehicle.color = selectedColor;
          }
          setIsPainting(false);
          if (onTuningVehicle) {
            onTuningVehicle('paint', { paintTarget: selectedPaintTarget, color: selectedColor });
          }
          sound.playPickup();
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c0e]/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 font-mono">
      <div className="relative w-full max-w-4xl h-[92vh] sm:h-[85vh] bg-[#14161a] text-[#f0f3f6] rounded-[2px] border border-[#2a2e38] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-4 py-3 bg-[#0b0c0e] border-b border-[#2a2e38] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#1c1f26] border border-[#2a2e38] text-[#c68a35]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#f0f3f6] uppercase tracking-wider">{shop.nameRu}</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] border border-[#c68a35]/40 bg-[#c68a35]/15 text-[#c68a35] font-bold">
                  Торговля 24/7
                </span>
              </div>
              <p className="text-xs text-[#9ba3af] hidden sm:block">{shop.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Player Cash Balance Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#0b0c0e] border border-[#2a2e38]">
              <Coins className="w-4 h-4 text-[#c68a35]" />
              <span className="text-sm font-mono font-bold text-[#c68a35]">{playerCash.toLocaleString()} ₽</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-[2px] bg-[#14161a] border border-[#2a2e38] text-[#9ba3af] hover:text-[#f0f3f6] hover:bg-[#1c1f26] transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Bar / Tabs */}
        <div className="px-4 py-2 bg-[#0b0c0e]/60 border-b border-[#2a2e38] flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#c68a35] text-[#0b0c0e] shadow-sm'
                  : 'bg-[#14161a] text-[#9ba3af] hover:bg-[#1c1f26] hover:text-[#f0f3f6] border border-[#2a2e38]'
              }`}
            >
              <Package className="w-4 h-4" />
              {isAutoShopOrGas ? 'Автозапчасти' : 'Каталог товаров'}
            </button>

            {isAutoShopOrGas && (
              <>
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'diagnostics'
                      ? 'bg-[#c68a35] text-[#0b0c0e] shadow-sm'
                      : 'bg-[#14161a] text-[#9ba3af] hover:bg-[#1c1f26] hover:text-[#f0f3f6] border border-[#2a2e38]'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Диагностика
                  {dtcErrors.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-[2px] bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {dtcErrors.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('repair')}
                  className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'repair'
                      ? 'bg-[#c68a35] text-[#0b0c0e] shadow-sm'
                      : 'bg-[#14161a] text-[#9ba3af] hover:bg-[#1c1f26] hover:text-[#f0f3f6] border border-[#2a2e38]'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  Починка & ТО
                </button>

                <button
                  onClick={() => setActiveTab('tuning')}
                  className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'tuning' || activeTab === 'lpg'
                      ? 'bg-[#c68a35] text-[#0b0c0e] shadow-sm'
                      : 'bg-[#14161a] text-[#9ba3af] hover:bg-[#1c1f26] hover:text-[#f0f3f6] border border-[#2a2e38]'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Тюнинг
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('cart')}
              className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all relative cursor-pointer ${
                activeTab === 'cart' || activeTab === 'pos'
                  ? 'bg-[#c68a35] text-[#0b0c0e] shadow-sm'
                  : 'bg-[#14161a] text-[#9ba3af] hover:bg-[#1c1f26] hover:text-[#f0f3f6] border border-[#2a2e38]'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Корзина
              {totalCartItemsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] bg-[#c68a35] text-[#0b0c0e] font-mono">
                  {totalCartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Cart Summary Header Widget */}
          {cartTotal > 0 && (
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-[#2a2e38]">
              <span className="text-xs text-[#9ba3af]">Итого в корзине:</span>
              <span className="text-sm font-mono font-bold text-[#c68a35]">{cartTotal.toLocaleString()} ₽</span>
              <button
                onClick={() => setActiveTab('pos')}
                className="px-3 py-1.5 bg-[#c68a35] hover:bg-[#d99a41] text-[#0b0c0e] font-bold text-xs rounded-[2px] flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
              >
                К оплате <Receipt className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {/* CATALOG TAB */}
          {activeTab === 'catalog' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalog.map(item => {
                const inCart = cart.find(i => i.item.id === item.id);
                const countInCart = inCart ? inCart.count : 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-[#0b0c0e] border border-[#2a2e38] rounded-[2px] flex flex-col justify-between gap-3 hover:border-[#c68a35]/40 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-[2px] bg-[#14161a] border border-[#2a2e38] flex items-center justify-center shrink-0 p-1">
                        <ItemIconCanvas itemId={item.itemId} size={52} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-sm font-bold text-[#f0f3f6] truncate">{item.nameRu}</h3>
                        </div>
                        <p className="text-xs text-[#9ba3af] line-clamp-2 mt-0.5">{item.description}</p>
                        {item.effectText && (
                          <div className="inline-block mt-1 px-1.5 py-0.5 rounded-[2px] text-[10px] bg-[#14161a] text-[#c68a35] font-mono border border-[#2a2e38]">
                            {item.effectText}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2a2e38]">
                      <div className="text-base font-mono font-bold text-[#c68a35]">
                        {item.price.toLocaleString()} ₽
                      </div>

                      {countInCart > 0 ? (
                        <div className="flex items-center gap-2 bg-[#14161a] border border-[#2a2e38] rounded-[2px] p-1">
                          <button
                            onClick={() => handleRemoveOneFromCart(item.id)}
                            className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[2px] bg-[#1c1f26] text-[#cbd5e1] hover:text-[#f0f3f6] cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-2 text-xs font-mono font-bold text-[#f0f3f6]">{countInCart}</span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[2px] bg-[#c68a35] text-[#0b0c0e] hover:bg-[#d99a41] cursor-pointer font-bold"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="px-3 py-1.5 bg-[#14161a] hover:bg-[#c68a35] text-[#cbd5e1] hover:text-[#0b0c0e] font-bold text-xs rounded-[2px] border border-[#2a2e38] hover:border-[#c68a35] flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          <Plus className="w-4 h-4" />
                          В корзину
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DIAGNOSTICS TAB */}
          {activeTab === 'diagnostics' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Vehicle Connection Card */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-100">
                        {currentVehicle ? (currentVehicle.nameRu || currentVehicle.type) : 'Автомобиль не подключен'}
                      </h3>
                      {currentVehicle && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {currentVehicle.licensePlate || 'БЕЗ НОМЕРА'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {currentVehicle
                        ? 'Электронный блок управления (ECU) подключен через разъем OBD-II'
                        : 'Подгоните автомобиль к боксу мастерской для сканирования'}
                    </p>
                  </div>
                </div>

                {currentVehicle && (
                  <button
                    disabled={isScanningEcu}
                    onClick={handleScanEcu}
                    className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanningEcu ? 'animate-spin' : ''}`} />
                    {isScanningEcu ? 'Сканирование ECU...' : 'Сканировать OBD-II'}
                  </button>
                )}
              </div>

              {!currentVehicle ? (
                <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center space-y-3">
                  <Car className="w-12 h-12 mx-auto text-zinc-600" />
                  <p className="text-sm text-zinc-300 font-medium">Транспортное средство не обнаружено в рабочей зоне</p>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Загоните ваш автомобиль на эстакаду или припаркуйтесь у ворот сервиса, чтобы считать показания датчиков и коды неисправностей.
                  </p>
                </div>
              ) : (
                <>
                  {/* OBD-II Fault Codes / DTC Section */}
                  <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-sky-400" />
                        <h4 className="text-sm font-bold text-zinc-100">Журнал ошибок OBD-II (DTC)</h4>
                      </div>
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                        dtcErrors.length === 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {dtcErrors.length === 0 ? 'Ошибок нет' : `Кодов: ${dtcErrors.length}`}
                      </span>
                    </div>

                    {dtcErrors.length === 0 ? (
                      <div className="py-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Все электронные системы, датчики и исполнительные механизмы функционируют штатно.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dtcErrors.map((err, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-start gap-3 ${
                              err.severity === 'critical'
                                ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                                : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                            }`}
                          >
                            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                              err.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800 text-white">
                                  {err.code}
                                </span>
                                <span className="font-bold text-xs">{err.title}</span>
                              </div>
                              <p className="text-[11px] text-zinc-300 mt-1">{err.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Diagnostic Modules Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Engine & Fluids */}
                    <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <Gauge className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">ДВС и Техжидкости</h4>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Здоровье цилиндро-поршневой:</span>
                          <span className={`font-mono font-bold ${(currentVehicle.engineState?.engineHealth ?? 100) < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {Math.round(currentVehicle.engineState?.engineHealth ?? 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              (currentVehicle.engineState?.engineHealth ?? 100) < 50 ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, Math.min(100, currentVehicle.engineState?.engineHealth ?? 100))}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Моторное масло:</span>
                          <span className="font-mono font-bold text-zinc-200">
                            {Math.round(currentVehicle.engineState?.oilLevel ?? 100)}% 
                            {currentVehicle.engineState?.oilPunctured && ' (ПРОБОЙ КАРТЕРА)'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Охлаждающая жидкость:</span>
                          <span className="font-mono font-bold text-zinc-200">
                            {Math.round(currentVehicle.engineState?.radiatorWater ?? 100)}%
                            {currentVehicle.engineState?.radiatorPunctured && ' (ТЕЧЬ РАДИАТОРА)'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Состояние блока:</span>
                          <span className={`font-bold ${currentVehicle.engineState?.isSeized ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {currentVehicle.engineState?.isSeized ? 'КЛИН ДВИГАТЕЛЯ' : 'Исправен, не заклинен'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Suspension & Alignment */}
                    <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <Disc className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Подвеска и Рулевое</h4>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Увод руля (Сход-развал):</span>
                          <span className={`font-mono font-bold ${Math.abs(currentVehicle.damage?.steeringDrift || 0) > 0.05 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {Math.abs(currentVehicle.damage?.steeringDrift || 0) < 0.01
                              ? 'Идеально (0.0°)'
                              : `${((currentVehicle.damage?.steeringDrift || 0) * 10).toFixed(1)}° ${
                                  (currentVehicle.damage?.steeringDrift || 0) < 0 ? 'влево' : 'вправо'
                                }`}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Стойка передняя левая:</span>
                          <span className="font-mono text-zinc-200">
                            {100 - Math.round((currentVehicle.damage?.frontLeftSuspensionDamage || 0) * 100)}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Стойка передняя правая:</span>
                          <span className="font-mono text-zinc-200">
                            {100 - Math.round((currentVehicle.damage?.frontRightSuspensionDamage || 0) * 100)}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Модификация шасси:</span>
                          <span className="font-bold text-amber-400">
                            {isHeavySuspended ? 'Bilstein HD (Усиленная)' : 'Стандартная подвеска'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Electrical & Fuel */}
                    <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <Zap className="w-4 h-4 text-sky-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Электрика и Топливо</h4>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Заряд аккумулятора (АКБ):</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {Math.round(currentVehicle.engineState?.batteryCharge ?? 100)}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Состояние стартера:</span>
                          <span className="font-bold text-zinc-200">
                            {currentVehicle.engineState?.starterWorking === false ? 'Неисправен' : 'Штатный'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Топливная система:</span>
                          <span className="font-bold text-zinc-200">
                            {currentVehicle.fuelSystem?.hasLPG ? 'Бензин + Газ (ГБО Lovato 4)' : 'Бензин/Дизель'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Прошивка ЭБУ:</span>
                          <span className="font-bold text-amber-400">
                            {isChiptuned ? 'Stage 1 ECU (+15% л.с.)' : 'Заводская прошивка'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Body & Optics */}
                    <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Кузов и Оптика</h4>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Деформация кузова:</span>
                          <span className={`font-mono font-bold ${
                            ((currentVehicle.damage?.frontCrumple || 0) + (currentVehicle.damage?.rearCrumple || 0)) > 2
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}>
                            {((currentVehicle.damage?.frontCrumple || 0) + (currentVehicle.damage?.rearCrumple || 0)) > 2
                              ? 'Есть повреждения'
                              : 'Геометрия в норме'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Остекление:</span>
                          <span className="font-bold text-zinc-200">
                            {currentVehicle.damage?.windshieldCracked ? 'Трещина лобового стекла' : 'Целое'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Передние фары:</span>
                          <span className="font-bold text-zinc-200">
                            {currentVehicle.damage?.leftHeadlightBroken || currentVehicle.damage?.rightHeadlightBroken
                              ? 'Повреждена фара'
                              : 'Исправны'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-zinc-400">Камера заднего вида:</span>
                          <span className="font-bold text-zinc-200">
                            {hasCameraInstalled ? 'Подключена' : 'Отсутствует'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fast Action Shortcuts */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-400">
                      Обнаружены неисправности или хотите улучшить характеристики?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('repair')}
                        className="px-3 py-1.5 min-h-[36px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" /> В раздел починки
                      </button>
                      <button
                        onClick={() => setActiveTab('tuning')}
                        className="px-3 py-1.5 min-h-[36px] bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" /> В тюнинг
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* REPAIR & SERVICE TAB */}
          {activeTab === 'repair' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Status Message Notification */}
              {repairActionMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {repairActionMessage}
                </div>
              )}

              {/* Connected Vehicle Header */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">Починка & Техническое обслуживание</h3>
                    <p className="text-xs text-zinc-400">
                      {currentVehicle
                        ? `Автомобиль: ${currentVehicle.nameRu || currentVehicle.type}`
                        : 'Подгоните ТС в бокс СТО для калькуляции наряд-заказа'}
                    </p>
                  </div>
                </div>

                {currentVehicle && (
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-zinc-400 block">Баланс:</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {playerCash.toLocaleString()} ₽
                    </span>
                  </div>
                )}
              </div>

              {!currentVehicle ? (
                <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center space-y-3">
                  <Car className="w-12 h-12 mx-auto text-zinc-600" />
                  <p className="text-sm text-zinc-300 font-medium">Транспортное средство не обнаружено на подъемнике</p>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Загоните вашу машину на двухстоечный подъемник автосервиса PIT-STOP, чтобы компьютерная диагностика могла составить дефектовочную ведомость и рассчитать наряд-заказ.
                  </p>
                </div>
              ) : isRepairing ? (
                /* IMMERSIVE MECHANIC LOG TERMINAL CONSOLE */
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4 shadow-inner">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-sky-400 animate-pulse" />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                        СТЕНД СТО PIT-STOP — ЦИКЛ РЕМОНТА ТС
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      Шаг {currentRepairStep} из {totalRepairStepsCount}
                    </span>
                  </div>

                  {/* Terminal Screen */}
                  <div className="h-64 overflow-y-auto bg-black/90 p-4 rounded-xl border border-zinc-900 font-mono text-[11px] leading-relaxed text-zinc-300 space-y-1.5 shadow-inner select-none scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {repairLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`transition-all duration-300 ${
                          log.startsWith('>>>')
                            ? 'text-sky-400 font-bold'
                            : log.includes('[ОК]') || log.includes('УСПЕШНО')
                            ? 'text-emerald-400'
                            : 'text-zinc-300'
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                    {/* Blinking green prompt */}
                    <div className="flex items-center gap-1 text-sky-400 animate-pulse">
                      <span>_</span>
                    </div>
                  </div>

                  {/* Analog Physical Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>ПРОГРЕСС РЕМОНТНЫХ РАБОТ</span>
                      <span>{Math.round((currentRepairStep / (totalRepairStepsCount || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                        style={{ width: `${(currentRepairStep / (totalRepairStepsCount || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500 text-center italic">
                    Камера заблокирована. Механики производят работы согласно регламенту наряд-заказа СТО.
                  </p>
                </div>
              ) : (
                /* WORK ORDER PREVIEW */
                <div className="space-y-4">
                  {getActiveRepairs().length === 0 ? (
                    <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center space-y-4">
                      <div className="p-3 w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-zinc-100">Дефектовка завершена. Проблем нет!</h4>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto">
                          Компьютерная диагностика ЭБУ и механический осмотр подвески не выявили никаких отклонений или повреждений. Ваш автомобиль находится в безупречном состоянии!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                        <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
                          ОБНАРУЖЕННЫЕ НЕИСПРАВНОСТИ К ОПЛАТЕ:
                        </span>
                        <span className="text-xs font-mono text-zinc-500">
                          {getActiveRepairs().length} позиций
                        </span>
                      </div>

                      <div className="space-y-3">
                        {getActiveRepairs().map((rep) => (
                          <div
                            key={rep.id}
                            className="p-4 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 max-w-xl">
                              <h4 className="text-sm font-bold text-zinc-200">{rep.title}</h4>
                              <p className="text-xs text-zinc-400 leading-relaxed">{rep.desc}</p>
                            </div>
                            <div className="font-mono font-bold text-sm text-emerald-400 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800/50 shrink-0">
                              {rep.price.toLocaleString()} ₽
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* SUMMARY COMPILATION & SUBMIT CARD */}
                      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-zinc-800/80">
                          <span className="text-xs font-bold text-zinc-400 uppercase">ИТОГО К ОПЛАТЕ (ЗАПЧАСТИ + РАБОТЫ):</span>
                          <span className="text-lg font-mono font-black text-emerald-400">
                            {getActiveRepairs().reduce((sum, r) => sum + r.price, 0).toLocaleString()} ₽
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="text-zinc-400">
                            Ваш кошелек: <span className="font-mono text-zinc-200">{playerCash.toLocaleString()} ₽</span>
                          </div>
                          {playerCash < getActiveRepairs().reduce((sum, r) => sum + r.price, 0) && (
                            <span className="text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                              Недостаточно средств на балансе!
                            </span>
                          )}
                        </div>

                        <button
                          disabled={playerCash < getActiveRepairs().reduce((sum, r) => sum + r.price, 0)}
                          onClick={handleFullRepair}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                          <Wrench className="w-4 h-4" />
                          Утвердить наряд-заказ и начать ремонт
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TUNING & UPGRADES TAB */}
          {(activeTab === 'tuning' || activeTab === 'lpg') && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Header */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">Тюнинг, Апгрейды & Малярный цех</h3>
                    <p className="text-xs text-zinc-400">
                      {currentVehicle
                        ? `Модификация: ${currentVehicle.nameRu || currentVehicle.type}`
                        : 'Подгоните автомобиль к боксу тюнинга для установки опций'}
                    </p>
                  </div>
                </div>

                {currentVehicle && (
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-zinc-400 block">Баланс:</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {playerCash.toLocaleString()} ₽
                    </span>
                  </div>
                )}
              </div>

              {!currentVehicle ? (
                <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center space-y-3">
                  <Car className="w-12 h-12 mx-auto text-zinc-600" />
                  <p className="text-sm text-zinc-300 font-medium">Транспортное средство не обнаружено в боксе</p>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Припаркуйте автомобиль в боксе автомастерской, чтобы выполнить прошивку Stage 1, установить подвеску Bilstein HD, ГБО или покрасить кузов.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Tuning 1: Stage 1 ECU Remap */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        <Gauge className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">Чип-тюнинг ECU (Stage 1 Прошивка)</h4>
                          {isChiptuned && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Установлено
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Оптимизация карт впрыска и угла зажигания. Прирост мощности и крутящего момента +15%, мгновенный отклик на педаль газа.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {CHIPTUNING_PRICE.toLocaleString()} ₽
                      </span>
                      <button
                        disabled={installingChiptuning || isChiptuned || playerCash < CHIPTUNING_PRICE}
                        onClick={handleInstallChiptuning}
                        className="px-4 py-2 min-h-[44px] bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        {installingChiptuning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> {chiptuningProgress}%
                          </>
                        ) : isChiptuned ? (
                          <>
                            <Check className="w-4 h-4" /> Прошито
                          </>
                        ) : (
                          'Прошить Stage 1'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tuning 2: Bilstein HD Suspension */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                        <Disc className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">Усиленная подвеска Bilstein HD</h4>
                          {isHeavySuspended && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Установлено
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Однотрубные газомасляные стойки и пружины с прогрессивной навивкой. Поглощает удары на грунте, снижает износ подвески на 40%.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {SUSPENSION_PRICE.toLocaleString()} ₽
                      </span>
                      <button
                        disabled={installingSuspension || isHeavySuspended || playerCash < SUSPENSION_PRICE}
                        onClick={handleInstallSuspension}
                        className="px-4 py-2 min-h-[44px] bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        {installingSuspension ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> {suspensionProgress}%
                          </>
                        ) : isHeavySuspended ? (
                          <>
                            <Check className="w-4 h-4" /> Установлено
                          </>
                        ) : (
                          'Установить Bilstein'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tuning 3: LPG System (Lovato 4) */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">Установка ГБО Lovato 4 (Пропан 50L)</h4>
                          {hasLpgInstalled && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Баллон 50L установлен
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Перевод на сжиженный пропан-бутан. Переключение на газ клавишей на приборной панели, экономия на стоимости топлива в 2 раза.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {lpgConfig ? `${lpgConfig.price.toLocaleString()} ₽` : '35,000 ₽'}
                      </span>
                      {hasLpgInstalled ? (
                        <button
                          onClick={handleRemoveLPG}
                          className="px-4 py-2 min-h-[44px] bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          Демонтировать
                        </button>
                      ) : (
                        <button
                          disabled={installingLpg || !lpgConfig?.isAvailable || playerCash < (lpgConfig?.price || 35000)}
                          onClick={handleInstallLPG}
                          className="px-4 py-2 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                          {installingLpg ? `Монтаж (${lpgProgress}%)` : 'Установить ГБО'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tuning 4: Rearview Camera */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">Камера заднего вида с разметкой</h4>
                          {hasCameraInstalled && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {isCameraFactoryInstalled ? 'Заводская опция' : 'Установлена'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Широкоугольный объектив с подсветкой и динамическими траекторными линиями, поворачивающимися вместе с рулем при движении назад.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {isCameraFactoryInstalled ? 'Бесплатно' : `${CAMERA_PRICE.toLocaleString()} ₽`}
                      </span>
                      {isCameraFactoryInstalled ? (
                        <span className="text-xs text-emerald-400 font-bold px-3 py-2">В базе</span>
                      ) : hasCameraInstalled ? (
                        <button
                          onClick={handleRemoveCamera}
                          className="px-4 py-2 min-h-[44px] bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          Демонтировать
                        </button>
                      ) : (
                        <button
                          disabled={installingCamera || playerCash < CAMERA_PRICE}
                          onClick={handleInstallCamera}
                          className="px-4 py-2 min-h-[44px] bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                          {installingCamera ? `Монтаж (${cameraProgress}%)` : 'Установить камеру'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tuning 5: Custom Spray Paint Booth */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-4 hover:border-zinc-700 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                          <Palette className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-100">Покрасочная камера (Малярный цех)</h4>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Профессиональная сушка и нанесение эмали. Выберите элемент кузова и оттенок.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                        <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {PAINT_PRICE.toLocaleString()} ₽
                        </span>

                        <button
                          disabled={isPainting || playerCash < PAINT_PRICE}
                          onClick={handlePaintVehicle}
                          className="px-5 py-2 min-h-[44px] bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shadow-md"
                        >
                          {isPainting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" /> {paintProgress}%
                            </>
                          ) : (
                            <>
                              <Palette className="w-4 h-4" /> Покрасить
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Paint Target Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 mr-2">Элемент:</span>
                      <button
                        onClick={() => setSelectedPaintTarget('body')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                          selectedPaintTarget === 'body'
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        Основной кузов
                      </button>
                      <button
                        onClick={() => setSelectedPaintTarget('roof')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                          selectedPaintTarget === 'roof'
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        Крыша (Контраст)
                      </button>
                    </div>

                    {/* Color Swatches Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Палитра заводских эмалей:</span>
                        <div className="flex items-center gap-2">
                          <span>Кастомный цвет:</span>
                          <input
                            type="color"
                            value={selectedColor}
                            onChange={e => setSelectedColor(e.target.value)}
                            className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {PAINT_COLORS.map(c => (
                          <button
                            key={c.value}
                            onClick={() => setSelectedColor(c.value)}
                            className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all min-h-[44px] ${
                              selectedColor.toLowerCase() === c.value.toLowerCase()
                                ? 'bg-zinc-800 border-purple-500 shadow-md ring-1 ring-purple-500'
                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full border border-zinc-700 shrink-0 shadow-sm"
                              style={{ backgroundColor: c.value }}
                            />
                            <span className="text-[11px] font-medium text-zinc-200 truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Color Swatch Preview */}
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border-2 border-zinc-700 shadow-inner"
                          style={{ backgroundColor: selectedColor }}
                        />
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">
                            Выбранный оттенок: {selectedColor.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Цель нанесения: {selectedPaintTarget === 'roof' ? 'Крыша' : 'Кузов'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CART VIEW */}
          {activeTab === 'cart' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  Ваша покупочная корзина ({totalCartItemsCount})
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Очистить
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2">
                  <ShoppingCart className="w-12 h-12 mx-auto text-zinc-700" />
                  <p className="text-sm">Корзина пуста. Выберите товары в каталоге.</p>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="px-4 py-2 bg-zinc-800 text-zinc-200 text-xs font-bold rounded-xl mt-2"
                  >
                    Перейти в каталог
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(entry => (
                    <div
                      key={entry.item.id}
                      className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                          <ItemIconCanvas itemId={entry.item.itemId} size={40} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-100">{entry.item.nameRu}</div>
                          <div className="text-xs font-mono text-emerald-400">
                            {entry.item.price.toLocaleString()} ₽ / шт
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                          <button
                            onClick={() => handleRemoveOneFromCart(entry.item.id)}
                            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:text-white"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-2 text-xs font-mono font-bold text-zinc-100">{entry.count}</span>
                          <button
                            onClick={() => handleAddToCart(entry.item)}
                            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-sm font-mono font-bold text-zinc-100 min-w-[70px] text-right">
                          {(entry.item.price * entry.count).toLocaleString()} ₽
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between mt-4">
                    <div>
                      <span className="text-xs text-zinc-400 block">К оплате:</span>
                      <span className="text-xl font-mono font-bold text-emerald-400">
                        {cartTotal.toLocaleString()} ₽
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveTab('pos')}
                      className="px-6 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg transition-colors"
                    >
                      Перейти к кассе <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* POS CASHIER PAYMENT TERMINAL */}
          {activeTab === 'pos' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" /> POS Кассовый терминал
                  </h3>
                  <button
                    onClick={() => setActiveTab('cart')}
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Назад к корзине
                  </button>
                </div>

                {/* Digital Cashier Display */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 font-mono">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Сумма покупки:</span>
                    <span className="text-amber-400 font-bold">{cartTotal.toLocaleString()} ₽</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Внесено наличными:</span>
                    <span className="text-emerald-400 font-bold">{inTrayMoney.toLocaleString()} ₽</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                    <span className="text-zinc-200">Сдача:</span>
                    <span className={`font-bold ${inTrayMoney >= cartTotal ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {inTrayMoney >= cartTotal ? `${(inTrayMoney - cartTotal).toLocaleString()} ₽` : '0 ₽'}
                    </span>
                  </div>
                </div>

                {/* Cashier Money Tray (Внесенные в лоток деньги) */}
                <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" /> Лоток кассы (Внесено):
                    </span>
                    {Object.keys(trayDenoms).length > 0 && (
                      <button
                        onClick={handleClearTray}
                        className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Забрать все
                      </button>
                    )}
                  </div>

                  {Object.keys(trayDenoms).length === 0 ? (
                    <div className="text-[11px] text-zinc-500 italic py-1 text-center">
                      Лоток пуст. Нажмите на банкноту или монету ниже, чтобы положить её кассиру.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(trayDenoms).map(([itemId, count]) => {
                        const denom = playerDenoms.find(d => d.itemId === itemId);
                        if (!denom || count <= 0) return null;
                        return (
                          <div
                            key={itemId}
                            className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-emerald-500/30 rounded-lg text-xs"
                          >
                            <ItemIconCanvas itemId={itemId} size={22} />
                            <span className="font-mono font-bold text-emerald-400">{denom.nameRu}</span>
                            <span className="text-[11px] text-zinc-400 font-mono">×{count}</span>
                            <button
                              onClick={() => handleRemoveTrayDenom(itemId)}
                              className="ml-1 p-0.5 rounded bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 transition-colors"
                              title="Забрать одну штуку назад в кошелек"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Auto-Pay Trays */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={playerCash < cartTotal}
                    onClick={handleExactTrayMoney}
                    className="flex-1 py-2.5 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Внести ровно ({cartTotal.toLocaleString()} ₽)
                  </button>
                  <button
                    onClick={handleClearTray}
                    className="px-4 py-2.5 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium rounded-xl transition-colors"
                  >
                    Забрать купюры
                  </button>
                </div>

                {/* Banknotes Tray */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Банкноты в кошельке:</span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Баланс: {playerCash.toLocaleString()} ₽
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {playerDenoms
                      .filter(d => d.type === 'banknote')
                      .map(denom => {
                        const inTray = trayDenoms[denom.itemId] || 0;
                        const remaining = Math.max(0, denom.count - inTray);
                        const canAdd = remaining > 0;

                        return (
                          <button
                            key={denom.itemId}
                            disabled={!canAdd}
                            onClick={() => handleAddTrayDenom(denom.itemId)}
                            className={`p-2 min-h-[58px] rounded-xl border flex flex-col items-center justify-between transition-all group relative ${
                              canAdd
                                ? 'bg-zinc-950 hover:bg-zinc-800/90 border-zinc-800 hover:border-emerald-500/60 cursor-pointer'
                                : 'bg-zinc-950/40 border-zinc-900/80 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 w-full justify-center">
                              <ItemIconCanvas itemId={denom.itemId} size={30} />
                              <span className={`text-xs font-mono font-bold ${canAdd ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                {denom.nameRu}
                              </span>
                            </div>

                            <div className="flex items-center justify-between w-full text-[10px] pt-1 border-t border-zinc-800/40 mt-1">
                              <span className="text-zinc-400">В наличии:</span>
                              <span className={`font-mono font-bold ${remaining > 0 ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                {remaining} шт
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Coins Tray */}
                <div className="space-y-2 pt-1 border-t border-zinc-800/60">
                  <span className="text-xs font-semibold text-zinc-300 block">Монеты в карманах:</span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {playerDenoms
                      .filter(d => d.type === 'coin')
                      .map(denom => {
                        const inTray = trayDenoms[denom.itemId] || 0;
                        const remaining = Math.max(0, denom.count - inTray);
                        const canAdd = remaining > 0;

                        return (
                          <button
                            key={denom.itemId}
                            disabled={!canAdd}
                            onClick={() => handleAddTrayDenom(denom.itemId)}
                            className={`p-2 min-h-[52px] rounded-xl border flex flex-col items-center justify-between transition-all group ${
                              canAdd
                                ? 'bg-zinc-950 hover:bg-zinc-800/90 border-zinc-800 hover:border-amber-500/60 cursor-pointer'
                                : 'bg-zinc-950/40 border-zinc-900/80 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 w-full justify-center">
                              <ItemIconCanvas itemId={denom.itemId} size={24} />
                              <span className={`text-xs font-mono font-bold ${canAdd ? 'text-amber-400' : 'text-zinc-500'}`}>
                                {denom.nameRu}
                              </span>
                            </div>

                            <div className="flex items-center justify-between w-full text-[10px] pt-1 border-t border-zinc-800/40 mt-1">
                              <span className="text-zinc-400">В наличии:</span>
                              <span className={`font-mono font-bold ${remaining > 0 ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                {remaining} шт
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Pay Action Button */}
                <button
                  disabled={inTrayMoney < cartTotal || posSuccess}
                  onClick={handleExecutePOSPayment}
                  className={`w-full py-3.5 min-h-[50px] font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all ${
                    posSuccess
                      ? 'bg-emerald-500 text-zinc-950'
                      : inTrayMoney >= cartTotal
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {posSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-zinc-950" /> Оплата прошла успешно!
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" /> Оплатить и забрать покупки
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Navigation Bar */}
        {cartTotal > 0 && activeTab !== 'pos' && (
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3 sm:hidden shrink-0">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Итого в корзине</span>
              <span className="text-base font-mono font-bold text-emerald-400">{cartTotal.toLocaleString()} ₽</span>
            </div>

            <button
              onClick={() => setActiveTab('pos')}
              className="px-5 py-2.5 min-h-[44px] bg-emerald-600 active:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg"
            >
              К оплате ({totalCartItemsCount}) <Receipt className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

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
import { getPlayerCash, getAllPlayerItemsFlat, deductPlayerCash } from '../items';
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
    { id: 'gas_canister_full', itemId: 'fuel_canister', nameRu: 'Канистра с бензином (20л)', price: 2360, description: 'Стальная канистра, заправленная бензином АИ-95.', category: 'auto', effectText: 'Заправка авто / 20L' },
    { id: 'gas_canister_empty', itemId: 'canister_empty', nameRu: 'Пустая канистра (20л)', price: 1200, description: 'Металлическая канистра для набора топлива на АЗС.', category: 'auto', effectText: 'Емкость 20L' },
    { id: 'gas_oil', itemId: 'motor_oil', nameRu: 'Моторное масло 5W-40 (4L)', price: 110, description: 'Синтетическое масло высокой вязкости для защиты двигателя.', category: 'auto', effectText: 'Защита двигателя' },
    { id: 'gas_antifreeze', itemId: 'antifreeze', nameRu: 'Канистра антифриза G12+ (5L)', price: 140, description: 'Охлаждающая жидкость для радиатора.', category: 'auto', effectText: 'Охлаждение двигателя' },
    { id: 'gas_battery', itemId: 'car_battery', nameRu: 'Запасной аккумулятор 12V', price: 180, description: 'Свинцово-кислотная батарея высокой пусковой мощности.', category: 'auto', effectText: 'Питание авто' },
    { id: 'gas_repair_kit', itemId: 'repair_kit', nameRu: 'Набор автоинструментов', price: 220, description: 'Тяжелый кейс: ключи, головки, отвертки.', category: 'auto', effectText: 'Ремонт авто' },
    { id: 'gas_rope', itemId: 'tow_rope', nameRu: 'Буксировочный трос 5т', price: 95, description: 'Прочный капроновый трос для буксировки.', category: 'auto', effectText: 'Буксировка' },
    { id: 'gas_extinguisher', itemId: 'extinguisher', nameRu: 'Автоогнетушитель', price: 130, description: 'Красный металлический баллон с чекой и манометром.', category: 'auto', effectText: 'Безопасность' },
    { id: 'gas_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Влагостойкая клейкая лента повышенной прочности.', category: 'auto', effectText: 'Быстрый ремонт' },
    { id: 'gas_hotdog', itemId: 'hot_dog', nameRu: 'Датский хот-дог АЗС', price: 65, description: 'Хрустящая булка, поджаристая сосиска, кетчуп и горчица.', category: 'food', effectText: '+40% Сытость' },
    { id: 'gas_cappuccino', itemId: 'cappuccino', nameRu: 'Кофе Капучино АЗС', price: 65, description: 'Свежесваренный зерновой кофе с плотной молочной пенкой.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'gas_espresso', itemId: 'hot_coffee', nameRu: 'Горячий Эспрессо', price: 50, description: 'Крепкий бодрящий согревающий напиток.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'gas_energy', itemId: 'energy_drink', nameRu: 'Энергетик "Вспышка"', price: 65, description: 'Банка ледяного энергетика с таурином и кофеином.', category: 'food', effectText: '+35% Энергия' },
    { id: 'gas_water', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в пластиковой бутылке.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'gas_chips', itemId: 'chips', nameRu: 'Картофельные чипсы', price: 40, description: 'Хрустящие чипсы с паприкой.', category: 'food', effectText: '+20% Сытость' },
    { id: 'gas_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Батончик с карамелью и арахисом.', category: 'food', effectText: '+20% Энергия' }
  ],
  supermarket: [
    { id: 'sup_water', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в пластиковой бутылке.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'sup_bread', itemId: 'bread_loaf', nameRu: 'Батон нарезной', price: 35, description: 'Свежий белый хлеб, упакован в хрустящий целлофан.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_banana', itemId: 'banana', nameRu: 'Спелый банан', price: 25, description: 'Сладкий желтый тропический фрукт.', category: 'food', effectText: '+20% Сытость, +15% Энергия' },
    { id: 'sup_apple', itemId: 'apple', nameRu: 'Сочное яблоко', price: 20, description: 'Спелое красно-зеленое яблоко, богато витаминами.', category: 'food', effectText: '+15% Сытость, +10% Гидратация' },
    { id: 'sup_juice', itemId: 'fresh_juice', nameRu: 'Апельсиновый сок (0.5L)', price: 45, description: 'Картонная коробка пастеризованного сока с мякотью.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'sup_cookies', itemId: 'cookie_pack', nameRu: 'Печенье с шоколадом', price: 50, description: 'Упаковка песочного печенья с темными каплями какао.', category: 'food', effectText: '+25% Сытость, +20% Энергия' },
    { id: 'sup_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Энергетический батончик в фольгированной обертке.', category: 'food', effectText: '+20% Энергия' },
    { id: 'sup_chips', itemId: 'chips', nameRu: 'Хрустящие картофельные чипсы', price: 40, description: 'Герметичная шуршащая пачка со вкусом паприки и соли.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_canned', itemId: 'canned_meat', nameRu: 'Армейская тушенка', price: 90, description: 'Свиной тушеный консерв в жестяной банке по ГОСТу.', category: 'food', effectText: '+60% Сытость' },
    { id: 'sup_phone_retro', itemId: 'phone_retro', nameRu: 'Телефон Matrix Classic (Кнопочный)', price: 3500, description: 'Неубиваемый кнопочный монохромный телефон с фонариком и антенной.', category: 'auto', effectText: 'Связь & SMS' },
    { id: 'sup_phone_nord', itemId: 'phone_nord', nameRu: 'Смартфон Nord Lite 5G', price: 38000, description: 'Доступный смартфон с 90 Гц дисплеем и тройной камерой.', category: 'auto', effectText: 'Смартфон & GPS' },
    { id: 'sup_furn_chair', itemId: 'furn_chair', nameRu: 'Стул деревянный со спинкой', price: 1800, description: 'Удобный стул для квартиры.', category: 'auto', effectText: 'Мебель для дома' },
    { id: 'sup_furn_plant', itemId: 'furn_plant', nameRu: 'Комнатный фикус в горшке', price: 1200, description: 'Декоративное растение для уюта в доме.', category: 'auto', effectText: 'Уют и декор' },
    { id: 'sup_furn_shelf', itemId: 'furn_shelf', nameRu: 'Книжный стеллаж', price: 6500, description: 'Стеллаж для хранения вещей и книг.', category: 'auto', effectText: 'Хранилище вещей' }
  ],
  fast_food: [
    { id: 'ff_burger', itemId: 'burger', nameRu: 'Двойной Чизбургер', price: 95, description: 'Бургер в картонной коробке: кунжутная булка, две котлеты, сыр.', category: 'food', effectText: '+50% Сытость, +25% Энергия' },
    { id: 'ff_fries', itemId: 'french_fries', nameRu: 'Картофель фри (Крупный)', price: 55, description: 'Картонный кулек горячей соленой картофельной соломки.', category: 'food', effectText: '+30% Сытость, +15% Энергия' },
    { id: 'ff_nuggets', itemId: 'nuggets', nameRu: 'Куриные наггетсы (6 шт)', price: 70, description: 'Хрустящие куриные кусочки в панировке из фритюра.', category: 'food', effectText: '+35% Сытость, +20% Энергия' },
    { id: 'ff_hotdog', itemId: 'hot_dog', nameRu: 'Датский хот-дог', price: 65, description: 'Длинная булка с поджаристой сосиской, кетчупом и горчицей.', category: 'food', effectText: '+40% Сытость' },
    { id: 'ff_colazero', itemId: 'cola_zero', nameRu: 'Кола Зеро (0.33L)', price: 40, description: 'Жестяная баночка черного газированного напитка, без сахара.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'ff_milkshake', itemId: 'milkshake', nameRu: 'Ванильный милкшейк', price: 60, description: 'Пластиковый стаканчик густого холодного молочного коктейля.', category: 'food', effectText: '+35% Гидратация, +20% Сытость' }
  ],
  pizzeria: [
    { id: 'piz_pepperoni', itemId: 'pizza_slice', nameRu: 'Кусок пиццы Пепперони', price: 60, description: 'Треугольный кусок горячего теста с пикантной колбасой.', category: 'food', effectText: '+35% Сытость, +10% Энергия' },
    { id: 'piz_croissant', itemId: 'croissant', nameRu: 'Сырный чесночный круассан', price: 45, description: 'Золотистая слоеная выпечка с пикантной начинкой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'piz_juice', itemId: 'fresh_juice', nameRu: 'Фруктовый морс', price: 40, description: 'Стакан кисленького ягодного морса из клюквы и брусники.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'piz_colazero', itemId: 'cola_zero', nameRu: 'Банка Колы', price: 40, description: 'Баночка сильногазированной колы из холодильника.', category: 'food', effectText: '+28% Гидратация' }
  ],
  sushi_asian: [
    { id: 'sush_phila', itemId: 'sushi_set', nameRu: 'Сет роллов Филадельфия', price: 160, description: 'Пластиковый контейнер: 8 роллов с лососем, сыром и огурцом.', category: 'food', effectText: '+55% Сытость, +15 HP' },
    { id: 'sush_wok', itemId: 'wok_box', nameRu: 'WOK-лапша Терияки с курицей', price: 130, description: 'Картонная коробочка горячей пшеничной лапши с соусом.', category: 'food', effectText: '+60% Сытость, +30% Энергия' },
    { id: 'sush_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча', price: 40, description: 'Бумажный стакан заваренного крупнолистового зеленого чая.', category: 'food', effectText: '+35% Гидратация, +5 HP' }
  ],
  cinema_bar: [
    { id: 'cin_popcorn', itemId: 'popcorn_caramel', nameRu: 'Карамельный попкорн', price: 70, description: 'Бумажное ведро хрустящего попкорна в сладкой карамели.', category: 'food', effectText: '+25% Сытость, +18% Энергия' },
    { id: 'cin_nachos', itemId: 'nachos', nameRu: 'Начос с сырным соусом', price: 80, description: 'Коробка кукурузных чипсов с пластиковой баночкой соуса чеддер.', category: 'food', effectText: '+32% Сытость, +15% Энергия' },
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
    { id: 'caf_cappuccino', itemId: 'cappuccino', nameRu: 'Сливочный Cappuccino', price: 65, description: 'Бумажный стакан с пластиковой крышкой, плотная молочная пена.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'caf_espresso', itemId: 'hot_coffee', nameRu: 'Горячий Espresso', price: 50, description: 'Крошечный стакан крепчайшего бодрящего согревающего напитка.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'caf_croissant', itemId: 'croissant', nameRu: 'Свежий масляный круассан', price: 45, description: 'Французская выпечка с хрустящей слоеной текстурой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'caf_donut', itemId: 'donut', nameRu: 'Пончик с клубничной глазурью', price: 40, description: 'Ароматный дрожжевой пончик в розовой помадке.', category: 'food', effectText: '+25% Сытость, +20% Энергия' },
    { id: 'caf_soup', itemId: 'soup', nameRu: 'Горячий куриный бульон', price: 110, description: 'Контейнер согревающего бульона с лапшой и зеленью.', category: 'food', effectText: '+45% Сытость, +8°C Тепло' },
    { id: 'caf_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча', price: 40, description: 'Стаканчик китайского зеленого чая с жасминовыми лепестками.', category: 'food', effectText: '+35% Гидратация' }
  ],
  gear_shop: [
    { id: 'gea_ration', itemId: 'military_ration', nameRu: 'Армейский сухпай (ИРП)', price: 220, description: 'Зеленая герметичная коробка с пайком на сутки, спичками и ложками.', category: 'food', effectText: '+85% Сытость, +50% Энергия' },
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
  onRepairVehicle?: (alreadyPaid?: boolean) => void;
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
  const [inTrayMoney, setInTrayMoney] = useState<number>(0);
  const [posSuccess, setPosSuccess] = useState<boolean>(false);

  // Diagnostics states
  const [isScanningEcu, setIsScanningEcu] = useState<boolean>(false);
  const [hasScannedEcu, setHasScannedEcu] = useState<boolean>(false);

  // Repair states
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairActionMessage, setRepairActionMessage] = useState<string | null>(null);

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
      setInTrayMoney(0);
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

  const handleClearCart = () => {
    sound.playUseItem();
    setCart([]);
    setInTrayMoney(0);
  };

  const handleAddTrayMoney = (amount: number) => {
    playCashRustle();
    playCoinDrop();
    setInTrayMoney(prev => Math.min(playerCash, prev + amount));
  };

  const handleExactTrayMoney = () => {
    playCashRustle();
    setInTrayMoney(Math.min(playerCash, cartTotal));
  };

  const handleClearTray = () => {
    playCashRustle();
    setInTrayMoney(0);
  };

  const handleExecutePOSPayment = () => {
    if (inTrayMoney < cartTotal) return;
    if (playerCash < cartTotal) return;

    playTerminalBeep();
    playCashRegister();

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
      setInTrayMoney(0);
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

  // --- REPAIR HANDLERS ---
  const handleFullRepair = () => {
    if (!onRepairVehicle) return;
    if (playerCash < 300) return;
    sound.playUseItem();
    setIsRepairing(true);
    setTimeout(() => {
      onRepairVehicle(false);
      setIsRepairing(false);
      setRepairActionMessage('Комплексный ремонт успешно завершен!');
      setTimeout(() => setRepairActionMessage(null), 3000);
    }, 800);
  };

  const handleAlignmentRepair = () => {
    if (!currentVehicle || playerCash < 1500) return;
    sound.playUseItem();
    deductPlayerCash(player, 1500);
    if (currentVehicle.damage) {
      currentVehicle.damage.steeringDrift = 0;
      currentVehicle.damage.frontLeftSuspensionDamage = 0;
      currentVehicle.damage.frontRightSuspensionDamage = 0;
      currentVehicle.damage.rearLeftSuspensionDamage = 0;
      currentVehicle.damage.rearRightSuspensionDamage = 0;
    }
    if (onTuningVehicle) onTuningVehicle('alignment');
    sound.playPickup();
    setRepairActionMessage('Сход-развал 3D откалиброван. Увод руля устранен!');
    setTimeout(() => setRepairActionMessage(null), 3000);
  };

  const handleFluidsService = () => {
    if (!currentVehicle || playerCash < 800) return;
    sound.playUseItem();
    deductPlayerCash(player, 800);
    if (currentVehicle.engineState) {
      currentVehicle.engineState.radiatorPunctured = false;
      currentVehicle.engineState.oilPunctured = false;
      currentVehicle.engineState.oilLevel = 100;
      currentVehicle.engineState.radiatorWater = 100;
      currentVehicle.engineState.overheatingSteam = false;
    }
    sound.playPickup();
    setRepairActionMessage('Масло 5W-40 и антифриз G12+ заменены, течи устранены!');
    setTimeout(() => setRepairActionMessage(null), 3000);
  };

  const handleBatteryService = () => {
    if (!currentVehicle || playerCash < 300) return;
    sound.playUseItem();
    deductPlayerCash(player, 300);
    if (currentVehicle.engineState) {
      currentVehicle.engineState.batteryCharge = 100;
      currentVehicle.engineState.starterWorking = true;
    }
    sound.playPickup();
    setRepairActionMessage('Аккумулятор заряжен на 100%, клеммы очищены!');
    setTimeout(() => setRepairActionMessage(null), 3000);
  };

  const handleBodyworkService = () => {
    if (!currentVehicle || playerCash < 2000) return;
    sound.playUseItem();
    deductPlayerCash(player, 2000);
    if (currentVehicle.damage) {
      currentVehicle.damage.frontCrumple = 0;
      currentVehicle.damage.rearCrumple = 0;
      currentVehicle.damage.leftDent = 0;
      currentVehicle.damage.rightDent = 0;
      currentVehicle.damage.frontLeftDent = 0;
      currentVehicle.damage.frontRightDent = 0;
      currentVehicle.damage.rearLeftDent = 0;
      currentVehicle.damage.rearRightDent = 0;
      currentVehicle.damage.hoodBuckled = false;
      currentVehicle.damage.windshieldCracked = false;
      currentVehicle.damage.rearGlassCracked = false;
      currentVehicle.damage.leftHeadlightBroken = false;
      currentVehicle.damage.rightHeadlightBroken = false;
      currentVehicle.damage.leftTaillightBroken = false;
      currentVehicle.damage.rightTaillightBroken = false;
    }
    sound.playPickup();
    setRepairActionMessage('Кузовные панели выправлены, остекление и оптика заменены!');
    setTimeout(() => setRepairActionMessage(null), 3000);
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
            currentVehicle.fuelSystem.activeFuelSource = 'gasoline';
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
      currentVehicle.fuelSystem.activeFuelSource = 'gasoline';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[92vh] sm:h-[85vh] bg-zinc-950 text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">{shop.nameRu}</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold">
                  Торговля 24/7
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">{shop.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Player Cash Balance Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-mono font-bold text-emerald-400">{playerCash.toLocaleString()} ₽</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Bar / Tabs */}
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 min-h-[44px] rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all ${
                activeTab === 'catalog'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Package className="w-4 h-4" />
              {isAutoShopOrGas ? 'Автозапчасти' : 'Каталог товаров'}
            </button>

            {isAutoShopOrGas && (
              <>
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`px-4 py-2 min-h-[44px] rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all ${
                    activeTab === 'diagnostics'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Activity className="w-4 h-4 text-sky-400" />
                  Диагностика
                  {dtcErrors.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {dtcErrors.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('repair')}
                  className={`px-4 py-2 min-h-[44px] rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all ${
                    activeTab === 'repair'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  Починка & ТО
                </button>

                <button
                  onClick={() => setActiveTab('tuning')}
                  className={`px-4 py-2 min-h-[44px] rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all ${
                    activeTab === 'tuning' || activeTab === 'lpg'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Тюнинг
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('cart')}
              className={`px-4 py-2 min-h-[44px] rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all relative ${
                activeTab === 'cart' || activeTab === 'pos'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Корзина
              {totalCartItemsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-zinc-950 font-mono">
                  {totalCartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Cart Summary Header Widget */}
          {cartTotal > 0 && (
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-zinc-800">
              <span className="text-xs text-zinc-400">Итого в корзине:</span>
              <span className="text-sm font-mono font-bold text-amber-400">{cartTotal.toLocaleString()} ₽</span>
              <button
                onClick={() => setActiveTab('pos')}
                className="px-3 py-1.5 min-h-[36px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
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
                    className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col justify-between gap-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center shrink-0 p-1">
                        <ItemIconCanvas itemId={item.itemId} size={52} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-sm font-bold text-zinc-100 truncate">{item.nameRu}</h3>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{item.description}</p>
                        {item.effectText && (
                          <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-emerald-400 font-mono">
                            {item.effectText}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <div className="text-base font-mono font-bold text-emerald-400">
                        {item.price.toLocaleString()} ₽
                      </div>

                      {countInCart > 0 ? (
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                          <button
                            onClick={() => handleRemoveOneFromCart(item.id)}
                            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:text-white"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-2 text-xs font-mono font-bold text-zinc-100">{countInCart}</span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="px-3 py-2 min-h-[42px] bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
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
                        : 'Подгоните автомобиль к воротам мастерской для выполнения работ'}
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
                    Загоните вашу машину в зону автосервиса, чтобы получить доступ к регулировке сход-развала, замене масел и кузовному ремонту.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Service 1: Comprehensive Capital Repair */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">Комплексный капитальный ремонт</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Все включено
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Полное восстановление ДВС до 100%, устранение всех пробоин картера и радиатора, замена жидкостей, выправление кузова и новая оптика.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        300 ₽
                      </span>
                      <button
                        disabled={isRepairing || playerCash < 300}
                        onClick={handleFullRepair}
                        className="px-4 py-2 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        {isRepairing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                        {isRepairing ? 'Ремонт...' : 'Ремонтировать'}
                      </button>
                    </div>
                  </div>

                  {/* Service 2: 3D Wheel Alignment */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        <Disc className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">Регулировка сход-развала 3D (Калибровка)</h4>
                          {Math.abs(currentVehicle.damage?.steeringDrift || 0) > 0.02 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Требуется
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Точная лазерная юстировка подвески. Полностью устраняет боковой увод руля и стабилизирует прямолинейный выбег.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        1,500 ₽
                      </span>
                      <button
                        disabled={playerCash < 1500 || Math.abs(currentVehicle.damage?.steeringDrift || 0) < 0.005}
                        onClick={handleAlignmentRepair}
                        className="px-4 py-2 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        {Math.abs(currentVehicle.damage?.steeringDrift || 0) < 0.005 ? 'В норме' : 'Отрегулировать'}
                      </button>
                    </div>
                  </div>

                  {/* Service 3: Fluids & Leak Sealing */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">Замена масла и антифриза (Герметизация)</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Запайка пробоин поддона и радиатора, доливка синтетического масла 5W-40 и охлаждающей жидкости G12+ до 100%.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        800 ₽
                      </span>
                      <button
                        disabled={playerCash < 800}
                        onClick={handleFluidsService}
                        className="px-4 py-2 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        Залить и запаять
                      </button>
                    </div>
                  </div>

                  {/* Service 4: Battery & Starter */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">Обслуживание АКБ и ремонт стартера</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Глубокий заряд аккумулятора постоянным током до 100%, очистка клемм от окислов и ремонт втягивающего реле стартера.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        300 ₽
                      </span>
                      <button
                        disabled={playerCash < 300}
                        onClick={handleBatteryService}
                        className="px-4 py-2 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        Зарядить АКБ
                      </button>
                    </div>
                  </div>

                  {/* Service 5: Bodywork & Glass */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">Кузовные работы и замена остекления</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Стапельная вытяжка вмятин передка и кормы, установка целых стекол триплекс и замена разбитых фар.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="text-base font-mono font-bold text-emerald-400 whitespace-nowrap">
                        2,000 ₽
                      </span>
                      <button
                        disabled={playerCash < 2000}
                        onClick={handleBodyworkService}
                        className="px-4 py-2 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        Выправить кузов
                      </button>
                    </div>
                  </div>
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
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" /> POS Кассовый терминал
                  </h3>
                  <button
                    onClick={() => setActiveTab('cart')}
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
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

                {/* Quick Auto-Pay Trays */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExactTrayMoney}
                    className="flex-1 py-2.5 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors"
                  >
                    Внести ровно ({cartTotal} ₽)
                  </button>
                  <button
                    onClick={handleClearTray}
                    className="px-4 py-2.5 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium rounded-xl transition-colors"
                  >
                    Забрать купюры
                  </button>
                </div>

                {/* Banknotes / Coins Tray */}
                <div className="pt-2">
                  <span className="text-xs font-medium text-zinc-400 mb-2 block">Кошелек: Выберите купюры для внесения</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[50, 100, 500, 1000, 2000, 5000].map(denom => (
                      <button
                        key={denom}
                        onClick={() => handleAddTrayMoney(denom)}
                        className="py-2.5 min-h-[44px] bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center transition-all group"
                      >
                        <span className="text-xs font-mono font-bold text-emerald-400 group-hover:scale-105 transition-transform">
                          +{denom} ₽
                        </span>
                      </button>
                    ))}
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
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                      : 'bg-zinc-800 text-zinc-500 opacity-60'
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

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
  Disc,
  Search
} from 'lucide-react';
import { sound } from '../audio';
import { createVehicleNodeBeamSystem, syncNodeBeamToVehicle } from '../nodeBeamPhysics';
import { 
  ITEM_CATALOG,
  isRegisteredItemId,
  formatItemEffectSummary,
  getPlayerCash, 
  getAllPlayerItemsFlat, 
  deductPlayerCash, 
  getPlayerDenominations, 
  calcOptimalTrayPayment,
  PlayerDenomInfo,
  createItemFromShopEntry,
  getItemTotalWeight,
  getUnifiedItemAttributes
} from '../items';
import { InventoryItem, GameWorld, MapShopCatalogEntry, ShopCatalogOverrideConfig } from '../types';
import { SHAPE_NAMES_RU, LIQUID_REGISTRY, LiquidId, isFluidStorageDryForm } from '../liquidSystem';
import { formatRgbString } from '../phoneData';
import { ModalShell, Tabs, Seg, TabItem } from './gameUi';

const shopPreviewCache: Record<string, InventoryItem> = {};
function getShopPreviewCacheKey(item: ShopItem): string {
  const firstInner = item.contents?.[0]?.itemId || '';
  const innerCount = item.contents ? item.contents.reduce((s, c) => s + (c.count ?? 1), 0) : 0;
  const fl = item.fluidStorage ? `${item.fluidStorage.liquidId || ''}:${item.fluidStorage.currentMl || 0}` : '';
  const kw = item.kitchenwareAttributes
    ? `${item.kitchenwareAttributes.material || ''}:${item.kitchenwareAttributes.color || ''}:${item.kitchenwareAttributes.pattern || ''}:${item.kitchenwareAttributes.capacityMl || ''}:${item.kitchenwareAttributes.shape || ''}`
    : '';
  const ph = item.phonePresetId || item.phoneAttributes
    ? `${item.phonePresetId || ''}:${item.phoneAttributes?.modelId || ''}:${item.phoneAttributes?.colorHex || ''}:${item.phoneAttributes?.chassisStyle || ''}`
    : '';
  const hw = item.hardwareAttributes
    ? `${item.hardwareAttributes.kind || ''}:${item.hardwareAttributes.model || ''}:${item.hardwareAttributes.colorHex || ''}`
    : '';
  const pr = item.produceAttributes
    ? `${item.produceAttributes.cutForm || ''}:${item.produceAttributes.part || ''}:${item.produceAttributes.varietyRu || ''}:${item.produceAttributes.color || ''}`
    : '';
  const br = item.branchAttributes
    ? `${item.branchAttributes.branchKind || ''}:${item.branchAttributes.attachedFruit?.itemId || ''}:${item.branchAttributes.attachedFruit?.count || 0}`
    : '';
  const mt = item.meatAttributes
    ? `${item.meatAttributes.cutForm || ''}:${item.meatAttributes.weightGrams || 0}:${item.meatAttributes.hasBone ? 1 : 0}:${item.meatAttributes.hasSkin ? 1 : 0}`
    : '';
  const innerDg = item.contents?.[0]?.doughAttributes;
  const dg = item.doughAttributes || innerDg;
  const dgKey = dg
    ? `${dg.doughType || ''}:${dg.shape || ''}:${dg.color || ''}:${dg.weightGrams || 0}`
    : '';
  const rp = item.rollingPinAttributes
    ? `${item.rollingPinAttributes.modelId || ''}:${item.rollingPinAttributes.shape || ''}:${item.rollingPinAttributes.material || ''}:${item.rollingPinAttributes.pattern || ''}:${item.rollingPinAttributes.color || ''}`
    : '';
  return `${item.id}|${item.itemId}|${firstInner}:${innerCount}|${fl}|${kw}|${ph}|${hw}|${pr}|${br}|${mt}|${dgKey}|${rp}|${item.labelColor || ''}|${item.containerTintColor || ''}`;
}
function getShopPreviewItem(item: ShopItem): InventoryItem {
  const cacheKey = getShopPreviewCacheKey(item);
  if (!shopPreviewCache[cacheKey]) {
    shopPreviewCache[cacheKey] = createItemFromShopEntry(item);
  }
  return shopPreviewCache[cacheKey];
}

function formatShopWeight(weightKg: number): string {
  if (!weightKg || weightKg <= 0) return '';
  if (weightKg < 1) {
    const grams = weightKg < 0.01
      ? Number((weightKg * 1000).toFixed(1))
      : Math.round(weightKg * 1000);
    return `${grams} г`;
  }
  return `${Number(weightKg.toFixed(2))} кг`;
}
import { FUEL_GRADES } from '../gasStationSystem';
import { createDefaultVehicleDamage, isTrailerVehicle } from '../vehicleHelpers';

export interface ShopItem extends MapShopCatalogEntry {
  description: string;
  effectText: string;
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
    { id: 'gas_canister_full', itemId: 'gasoline_95', nameRu: 'Канистра с бензином АИ-95 (20л)', price: 2360, description: 'Стальная 20-литровая канистра, заправленная бензином АИ-95.', category: 'auto', effectText: 'Заправка авто / 20L' },
    { id: 'gas_canister_empty', itemId: 'canister_plastic_10l', nameRu: 'Пластиковая канистра (10л)', price: 850, description: 'Ударопрочная канистра для набора топлива или спецжидкостей.', category: 'auto', effectText: 'Емкость 10L' },
    { id: 'gas_oil', itemId: 'motor_oil', nameRu: 'Моторное масло 5W-40 (5L)', price: 110, description: 'Канистра 5л синтетического масла высокой вязкости для защиты двигателя.', category: 'auto', effectText: 'Защита двигателя' },
    { id: 'gas_antifreeze', itemId: 'antifreeze', nameRu: 'Канистра антифриза G12+ (5L)', price: 140, description: 'Канистра 5л охлаждающей жидкости для радиатора.', category: 'auto', effectText: 'Охлаждение двигателя' },
    { id: 'gas_washer', itemId: 'washer_fluid', nameRu: 'Стеклоомыватель зимний (-25°C)', price: 120, description: 'Канистра 5л незамерзающей жидкости для бачка омывателя.', category: 'auto', effectText: 'Чистота стекол' },
    { id: 'gas_battery', itemId: 'car_battery', nameRu: 'Запасной аккумулятор 12V', price: 180, description: 'Свинцово-кислотная батарея высокой пусковой мощности.', category: 'auto', effectText: 'Питание авто' },
    { id: 'gas_repair_kit', itemId: 'repair_kit', nameRu: 'Набор автоинструментов', price: 220, description: 'Тяжелый кейс: ключи, головки, отвертки.', category: 'auto', effectText: 'Ремонт авто' },
    { id: 'gas_rope', itemId: 'tow_rope', nameRu: 'Буксировочный трос 5т', price: 95, description: 'Прочный капроновый трос для буксировки.', category: 'auto', effectText: 'Буксировка' },
    { id: 'gas_extinguisher', itemId: 'extinguisher', nameRu: 'Автоогнетушитель ОП-2', price: 130, description: 'Красный металлический баллон с чекой и манометром.', category: 'auto', effectText: 'Безопасность' },
    { id: 'gas_sandbag', itemId: 'sandbag', nameRu: 'Мешок песка (1 кг)', price: 30, description: 'Сухой кварцевый песок для тушения огня и впитывания ГСМ.', category: 'auto', effectText: 'Тушение & Впитывание' },
    { id: 'gas_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Влагостойкая клейкая лента повышенной прочности.', category: 'auto', effectText: 'Быстрый ремонт' },
    { id: 'gas_cappuccino', itemId: 'cappuccino', nameRu: 'Кофе Капучино АЗС (0.25L)', price: 65, description: 'Свежесваренный зерновой кофе в бумажном стаканчике.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'gas_espresso', itemId: 'coffee', nameRu: 'Горячий Эспрессо (0.25L)', price: 50, description: 'Крепкий бодрящий согревающий кофе в стаканчике.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'gas_energy', itemId: 'energy_drink', nameRu: 'Энергетик "Вспышка" (0.33L)', price: 65, description: 'Алюминиевая банка ледяного энергетика с таурином и кофеином.', category: 'food', effectText: '+35% Энергия' },
    { id: 'gas_apple', itemId: 'apple', nameRu: 'Яблоко мытое (в дорогу)', price: 25, description: 'Свежее спелое хрустящее яблоко.', category: 'food', effectText: '+15% Сытость, +10% Гидратация' },
    { id: 'gas_banana', itemId: 'banana_single', nameRu: 'Бананы спелые (связка)', price: 50, description: 'Сытный быстрый перекус для водителя.', category: 'food', effectText: '+30% Сытость, +20% Энергия' },
    { id: 'gas_water', itemId: 'drinking_water', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в пластиковой бутылке 0.5л.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'gas_water_15', itemId: 'drinking_water_1500', nameRu: 'Питьевая вода (1.5L)', price: 55, description: 'Большая ПЭТ бутылка 1.5л чистой питьевой воды.', category: 'food', effectText: '+80% Гидратация' },
    { id: 'gas_chips', itemId: 'chips', nameRu: 'Картофельные чипсы (дой-пак)', price: 40, description: 'Герметичный пакет хрустящих чипсов с паприкой (8 шт.).', category: 'food', effectText: '+32% Сытость' },
    { id: 'gas_gummy_mini', itemId: 'gummy_pack_mini_bears', nameRu: 'Мармелад «Фруктовые мишки» (саше 12 шт., 30г)', price: 45, description: 'Компактный плоский саше-пакет с 12 жевательными мишками (клубника, лимон, яблоко, апельсин).', category: 'food', effectText: '30г · +12% Сытость, +14% Энергия' },
    { id: 'gas_gummy_mint', itemId: 'gummy_pack_mini_mint_hearts', nameRu: 'Мармелад «Мята и Эвкалипт» (саше 10 шт., 40г)', price: 55, description: 'Освежающие дорожные мармеладные сердечки с мятой, лаймом и эвкалиптом.', category: 'food', effectText: '40г · +16% Сытость, свежесть' },
    { id: 'gas_gummy_cola', itemId: 'gummy_pack_flow_cola', nameRu: 'Мармелад «Шипучая Кола» (флоу-пак 16 шт., 80г)', price: 75, description: 'Пакет-подушечка с 16 кислыми мармеладными бутылочками колы в шипучей обсыпке.', category: 'food', effectText: '80г · +32% Сытость, +40% Энергия' },
    { id: 'gas_gummy_gold', itemId: 'gummy_pack_flow_bears_gold', nameRu: 'Мармелад «Золотые мишки» (флоу-пак 28 шт., 70г)', price: 70, description: 'Классический карманный пакет: 28 фруктовых мишек пяти вкусов.', category: 'food', effectText: '70г · +28% Сытость, +34% Энергия' },
    { id: 'gas_gummy_worms', itemId: 'gummy_pack_euro_worms', nameRu: 'Мармелад «Кислые червячки» (евро-пакет 22 шт., 132г)', price: 110, description: 'Прозрачный евро-пакет с подвесом: 22 разноцветных кислых червячка.', category: 'food', effectText: '132г · +53% Сытость, бодрость' },
    { id: 'gas_gummy_soda', itemId: 'gummy_pack_euro_soda_bottles', nameRu: 'Мармелад «Лимонадный бар» (евро-пакет 26 шт., 130г)', price: 115, description: 'Евро-пакет с шипучими бутылочками: тархун, крем-сода, апельсин и кола-лайм.', category: 'food', effectText: '130г · +52% Сытость, +65% Энергия' },
    { id: 'gas_gummy_rings', itemId: 'gummy_pack_doypack_rings', nameRu: 'Мармелад «Фруктовые колечки» (дой-пак 28 шт., 196г)', price: 155, description: 'Стоячий дой-пак с зип-локом и двухслойными персиковыми, арбузными и яблочными колечками.', category: 'food', effectText: '196г · +78% Сытость, зип-лок' },
    { id: 'gas_gummy_sour_mix', itemId: 'gummy_pack_doypack_sour_mix', nameRu: 'Мармелад «Ультра-кислый микс» (дой-пак 40 шт., 195г)', price: 165, description: 'Бодрящий дой-пак для долгой дороги: 40 кислых мармеладок разных форм.', category: 'food', effectText: '195г · +78% Сытость, +90% Энергия' },
    { id: 'gas_canned', itemId: 'stew_meat', nameRu: 'Армейская тушёнка в банке (0.4L)', price: 110, description: 'Мясные консервы в жестяной банке 0.4л с ключом открытия.', category: 'food', effectText: '+70% Сытость' },
    { id: 'gas_detergent_sachet', itemId: 'detergent_sachet_120', nameRu: 'Порошок «Свежесть 2-в-1» (саше 100г)', price: 38, description: 'Порционное саше сухого мелкодисперсного стирального порошка на 1 стирку.', category: 'auto', effectText: '100 г · Сухой порошок' },
    { id: 'gas_detergent_box', itemId: 'detergent_powder_box_450', nameRu: 'Порошок «Морозный Бриз Автомат» (450г)', price: 165, description: 'Коробка гранулированного порошка с активным кислородом и энзимами против масляных пятен.', category: 'auto', effectText: '450 г · Сухой порошок' },
    { id: 'gas_plastic_bag', itemId: 'plastic_bag', nameRu: 'Пакет-майка АЗС', price: 5, description: 'Пластиковый пакет с ручками для покупок.', category: 'auto', effectText: 'Пакет 12.0L' }
  ],
  supermarket: [
    // 1. НАПИТКИ И ВОДА В БУТЫЛКАХ И БАНКАХ
    { id: 'sup_water_05', itemId: 'drinking_water', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в ПЭТ бутылке 0.5л.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'sup_water_15', itemId: 'drinking_water_1500', nameRu: 'Минеральная вода (1.5L)', price: 55, description: 'Большая ПЭТ бутылка чистой природной воды 1.5л.', category: 'food', effectText: '+80% Гидратация' },
    { id: 'sup_juice_tetra', itemId: 'fresh_juice', nameRu: 'Сок апельсиновый Тетрапак (1.0L)', price: 95, description: 'Пастеризованный 100% сок с мякотью в литровом тетрапаке.', category: 'food', effectText: '+60% Гидратация, +15% Энергия' },
    { id: 'sup_kvas', itemId: 'kvas', nameRu: 'Хлебный квас "Старорусский" (1.5L)', price: 85, description: 'Освежающий квас живого брожения в пластиковой бутылке 1.5л.', category: 'food', effectText: '+50% Гидратация, +20% Сытость' },
    { id: 'sup_cola_can', itemId: 'cola', nameRu: 'Баночка Колы (0.33L)', price: 45, description: 'Алюминиевая банка сильногазированной колы.', category: 'food', effectText: '+30% Гидратация, +15% Энергия' },
    { id: 'sup_energy_can', itemId: 'energy_drink', nameRu: 'Энергетик Drive (0.5L)', price: 75, description: 'Тонизирующий напиток с таурином и витаминами B.', category: 'food', effectText: '+35% Энергия' },
    { id: 'sup_beer_can', itemId: 'beer', nameRu: 'Пиво светлое фильтрованное (0.5L)', price: 65, description: 'Алюминиевая банка классического светлого лагера 4.8%.', category: 'food', effectText: '+Алкоголь, расслабление' },

    // 2. БАНКИ, КОНСЕРВЫ И ЗАГОТОВКИ
    { id: 'sup_canned_stew', itemId: 'stew_meat', nameRu: 'Тушёнка говяжья высший сорт (0.4L)', price: 125, description: 'Армейская тушёнка ГОСТ в герметичной жестяной банке с ключом.', category: 'food', effectText: '+75% Сытость' },
    { id: 'sup_canned_fish', itemId: 'fish_preserves', nameRu: 'Рыбные консервы в масле (0.15L)', price: 95, description: 'Шпроты и сардины в пряном масле в банке.', category: 'food', effectText: '+65% Сытость' },
    { id: 'sup_condensed_milk', itemId: 'condensed_milk', nameRu: 'Сгущённое молоко цельное (0.4L)', price: 85, description: 'Классическая сладкая сгущенка в сине-белой банке.', category: 'food', effectText: '+50% Сытость, +35% Энергия' },
    { id: 'sup_pickles_jar', itemId: 'pickles', nameRu: 'Огурчики маринованные в банке (0.5L)', price: 110, description: 'Хрустящие корнишоны с пряным рассолом и укропом в стекле.', category: 'food', effectText: '+30% Сытость, +30% Гидратация' },
    { id: 'sup_jam_raspberry', itemId: 'jam_raspberry', nameRu: 'Малиновое варенье в банке (0.2L)', price: 130, description: 'Домашнее варенье из спелой малины в стеклянной баночке.', category: 'food', effectText: '+42% Сытость, целебное' },
    { id: 'sup_jam_strawberry', itemId: 'jam_strawberry', nameRu: 'Клубничный джем в стекле (0.2L)', price: 125, description: 'Сладкий джем из отборной клубники в баночке с винтовой крышкой.', category: 'food', effectText: '+42% Сытость' },
    { id: 'sup_honey_jar', itemId: 'honey', nameRu: 'Натуральный цветочный мёд (0.2L)', price: 160, description: 'Золотистый липовый мёд в стеклянной баночке.', category: 'food', effectText: '+45% Сытость, иммунитет' },
    { id: 'sup_caviar_red', itemId: 'salmon_caviar', nameRu: 'Икра лососевая зернистая (140г)', price: 480, description: 'Красная икра лосося премиум в стеклянной баночке под вакуумом.', category: 'food', effectText: '+65% Сытость, деликатес' },
    { id: 'sup_caviar_squash', itemId: 'caviar_squash', nameRu: 'Кабачковая икра в банке (0.5L)', price: 75, description: 'Нежная обжаренная кабачковая икра по-домашнему.', category: 'food', effectText: '+45% Сытость' },
    { id: 'sup_caviar_eggplant', itemId: 'caviar_eggplant', nameRu: 'Баклажанная икра в банке (0.5L)', price: 85, description: 'Пикантная баклажанная икра с томатом и чесноком.', category: 'food', effectText: '+48% Сытость' },
    { id: 'sup_broth_beef', itemId: 'broth_beef', nameRu: 'Говяжий бульон концентрированный (0.45L)', price: 90, description: 'Стеклянная баночка наваристого мясного бульона для супов.', category: 'food', effectText: '+60% Сытость, тепло' },
    { id: 'sup_broth_chicken', itemId: 'broth_chicken', nameRu: 'Куриный бульон в банке (0.45L)', price: 80, description: 'Золотистый куриный бульон с травами.', category: 'food', effectText: '+50% Сытость' },

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
    { id: 'sup_tomato_sundried', itemId: 'sun_dried_tomatoes', nameRu: 'Вяленые томаты в оливковом масле', price: 165, description: 'Баночка пряных вяленых томатов с травами.', category: 'food', effectText: '+25% Сытость, деликатес' },
    { id: 'sup_cucumber', itemId: 'cucumber_whole', nameRu: 'Огурец короткоплодный (1 шт.)', price: 25, description: 'Свежий хрустящий пупырчатый огурец поштучно.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'sup_cucumber_sliced', itemId: 'cucumber_sliced', nameRu: 'Огурец нарезанный ломтиками (лоток)', price: 30, description: 'Свежие ломтики огурца в пищевом лотке.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'sup_bell_pepper', itemId: 'bell_pepper_red', nameRu: 'Перец болгарский красный (1 шт.)', price: 45, description: 'Крупный толстостенный сочный перец поштучно.', category: 'food', effectText: '+18% Сытость, витамины' },
    { id: 'sup_bell_pepper_sliced', itemId: 'bell_pepper_sliced', nameRu: 'Перец болгарский соломкой (лоток)', price: 50, description: 'Нарезанный соломкой сладкий перец в лотке под пленкой.', category: 'food', effectText: '+18% Сытость' },
    { id: 'sup_cabbage', itemId: 'cabbage_white_head', nameRu: 'Капуста белокочанная (1 кочан)', price: 45, description: 'Плотный кочан свежей капусты поштучно.', category: 'food', effectText: '+12% Сытость' },
    { id: 'sup_cabbage_shredded', itemId: 'cabbage_shredded', nameRu: 'Капуста нашинкованная (лоток)', price: 35, description: 'Свежая сочная салатная капуста в лотке под пленкой.', category: 'food', effectText: '+10% Сытость' },
    { id: 'sup_sauerkraut', itemId: 'cabbage_sauerkraut', nameRu: 'Квашеная капуста в банке', price: 65, description: 'Хрустящая квашеная капуста с морковью.', category: 'food', effectText: '+22% Сытость, витамин C' },
    { id: 'sup_broccoli', itemId: 'broccoli_head', nameRu: 'Брокколи свежая (1 кочан)', price: 75, description: 'Зеленый свежий кочан брокколи поштучно.', category: 'food', effectText: '+15% Сытость' },
    { id: 'sup_veg_frozen', itemId: 'vegetable_mix_frozen', nameRu: 'Замороженная смесь овощей (400г)', price: 70, description: 'Смесь брокколи, цветной капусты и моркови.', category: 'food', effectText: 'Заморозка' },
    { id: 'sup_jalapeno_jar', itemId: 'jalapeno_pickled', nameRu: 'Маринованный халапеньо в банке', price: 95, description: 'Острые маринованные колечки перца.', category: 'food', effectText: '+12% Энергия, острота' },

    // 5.1. СВЕЖИЕ ФРУКТЫ, БАХЧЕВЫЕ И ЯГОДЫ
    { id: 'sup_apple', itemId: 'apple', nameRu: 'Яблоко сочное', price: 20, description: 'Свежее красно-зеленое яблоко.', category: 'food', effectText: '+15% Сытость, +10% Гидратация' },
    { id: 'sup_apple_sliced', itemId: 'apple_sliced', nameRu: 'Яблочные дольки в стаканчике', price: 30, description: 'Очищенные дольки спелого яблока.', category: 'food', effectText: '+15% Сытость' },
    { id: 'sup_apple_puree', itemId: 'apple_puree', nameRu: 'Яблочное пюре в баночке', price: 55, description: 'Нежное натуральное яблочное пюре.', category: 'food', effectText: '+20% Сытость, сладость' },
    { id: 'sup_pear_yellow', itemId: 'pear_yellow', nameRu: 'Груша Дюшес сладкая', price: 30, description: 'Медовая сочная груша.', category: 'food', effectText: '+20% Сытость, сок' },
    { id: 'sup_pear_sliced', itemId: 'pear_sliced', nameRu: 'Груша нарезанная (дольки)', price: 40, description: 'Нежные очищенные грушевые дольки.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_plum', itemId: 'plum_purple', nameRu: 'Слива синяя десертная', price: 15, description: 'Спелая сладкая слива.', category: 'food', effectText: '+8% Сытость' },
    { id: 'sup_peaches_canned', itemId: 'peach_halves', nameRu: 'Персики в сиропе (половинки)', price: 110, description: 'Консервированные половинки персиков.', category: 'food', effectText: '+35% Сытость, десерт' },
    { id: 'sup_orange', itemId: 'orange_citrus', nameRu: 'Апельсин сочный (1 шт.)', price: 25, description: 'Спелый сочный цитрус с мякотью поштучно.', category: 'food', effectText: '+20% Гидратация, витамин C' },
    { id: 'sup_orange_segments', itemId: 'orange_segments', nameRu: 'Очищенные дольки апельсина', price: 45, description: 'Свежие очищенные апельсиновые дольки в боксе.', category: 'food', effectText: '+20% Гидратация' },
    { id: 'sup_lemon', itemId: 'lemon_whole', nameRu: 'Лимон желтый', price: 20, description: 'Кислый ароматный лимон.', category: 'food', effectText: 'Бодрость, витамин C' },
    { id: 'sup_lime', itemId: 'lime_whole', nameRu: 'Лайм зеленый', price: 25, description: 'Ароматный кислый лайм.', category: 'food', effectText: 'Бодрость' },
    { id: 'sup_banana', itemId: 'banana_single', nameRu: 'Бананы спелые (связка)', price: 45, description: 'Связка сладких питательных бананов.', category: 'food', effectText: '+30% Сытость, +20% Энергия' },
    { id: 'sup_melon_slice', itemId: 'melon_slice', nameRu: 'Ломоть дыни Канталупа', price: 55, description: 'Сочный медовый ломоть дыни.', category: 'food', effectText: '+22% Сытость, +25% Гидратация' },
    { id: 'sup_melon_diced', itemId: 'melon_diced', nameRu: 'Кубики дыни в лотке', price: 65, description: 'Очищенные кубики дыни в боксе.', category: 'food', effectText: '+20% Сытость, +25% Гидратация' },
    { id: 'sup_watermelon_slice', itemId: 'watermelon_slice', nameRu: 'Ломоть арбуза сочный', price: 40, description: 'Отрезанный кусок сахарного арбуза.', category: 'food', effectText: '+15% Сытость, +50% Гидратация' },
    { id: 'sup_watermelon_diced', itemId: 'watermelon_diced', nameRu: 'Кубики арбуза в стаканчике', price: 50, description: 'Свежие кубики арбуза без косточек.', category: 'food', effectText: '+45% Гидратация' },
    { id: 'sup_pomegranate_seeds', itemId: 'pomegranate_seeds', nameRu: 'Зерна граната в стаканчике', price: 75, description: 'Очищенные рубиновые зерна спелого граната.', category: 'food', effectText: '+15% Сытость, витамины' },
    { id: 'sup_kiwi_fruit', itemId: 'kiwi_fruit', nameRu: 'Киви спелый', price: 25, description: 'Спелый кисло-сладкий киви.', category: 'food', effectText: '+10% Сытость, витамин C' },
    { id: 'sup_kiwi_sliced', itemId: 'kiwi_sliced', nameRu: 'Киви нарезанный кружочками', price: 35, description: 'Очищенные сочные кружки киви.', category: 'food', effectText: '+10% Сытость' },
    { id: 'sup_grapes_green', itemId: 'grapes_green_bunch', nameRu: 'Виноград зеленый кишмиш', price: 80, description: 'Гроздь сладкого бескосточкового винограда.', category: 'food', effectText: '+20% Сытость, сок' },
    { id: 'sup_grapes_cup', itemId: 'grapes_berries', nameRu: 'Виноград россыпью в стаканчике', price: 55, description: 'Отборные ягоды винограда в стаканчике.', category: 'food', effectText: '+15% Сытость, +15% Гидратация' },
    { id: 'sup_berries_tray', itemId: 'berries_fresh', nameRu: 'Свежие ягоды (лоток)', price: 140, description: 'Отборная спелая клубника в пищевом лотке под герметичной пленкой (8 шт.).', category: 'food', effectText: '+20% Сытость, витамины' },
    { id: 'sup_berries_frozen', itemId: 'berries_mixed_frozen', nameRu: 'Замороженные лесные ягоды', price: 110, description: 'Пакет замороженных ягод (черника, малина).', category: 'food', effectText: 'Заморозка' },
    { id: 'sup_greens_chopped', itemId: 'greens_chopped_mix', nameRu: 'Свежая рубленая зелень (укроп/петрушка)', price: 30, description: 'Нарубленная свежая зелень в боксе.', category: 'food', effectText: 'Свежая зелень' },
    { id: 'sup_dill_jar', itemId: 'dill_dried', nameRu: 'Сушеный укроп в баночке', price: 40, description: 'Баночка душистого сушеного укропа.', category: 'food', effectText: 'Пряность' },
    { id: 'sup_basil_jar', itemId: 'basil_dried', nameRu: 'Сушеный базилик в баночке', price: 45, description: 'Баночка ароматного сушеного базилика.', category: 'food', effectText: 'Пряность' },
    { id: 'sup_mint_jar', itemId: 'mint_dried', nameRu: 'Сушеная мята для чая', price: 45, description: 'Баночка сушеной перечной мяты.', category: 'food', effectText: 'Травяной чай' },
    { id: 'sup_pineapple', itemId: 'pineapple_whole', nameRu: 'Ананас спелый тропический', price: 185, description: 'Цельный сочный золотистый ананас с зелёной короной.', category: 'food', effectText: '+28% Сытость, +26% Гидратация' },
    { id: 'sup_mango', itemId: 'mango_whole', nameRu: 'Манго спелое (1 шт.)', price: 120, description: 'Сладкое тропическое манго с нежной медовой мякотью.', category: 'food', effectText: '+18% Сытость, +14% Гидратация' },
    { id: 'sup_passionfruit', itemId: 'passionfruit_whole', nameRu: 'Маракуйя фиолетовая', price: 75, description: 'Ароматный экзотический плод маракуйи с кисло-сладкой мякотью.', category: 'food', effectText: '+7% Сытость, витамины' },
    { id: 'sup_guava', itemId: 'guava_whole', nameRu: 'Гуава розовая свежая', price: 90, description: 'Сладкий тропический плод гуавы с нежно-розовой мякотью.', category: 'food', effectText: '+10% Сытость, аромат' },
    { id: 'sup_papaya', itemId: 'papaya_whole', nameRu: 'Папайя спелая', price: 165, description: 'Крупная сладкая тропическая папайя.', category: 'food', effectText: '+22% Сытость, +18% Гидратация' },
    { id: 'sup_dragonfruit', itemId: 'dragonfruit_whole', nameRu: 'Питахайя (драгонфрут)', price: 155, description: 'Малиновый плод питахайи с нежной освежающей мякотью.', category: 'food', effectText: '+15% Сытость, +16% Гидратация' },
    { id: 'sup_lychee', itemId: 'lychee_fruit', nameRu: 'Личи свежие (упаковка 220г)', price: 135, description: 'Отборные плоды личи с цветочным вкусом.', category: 'food', effectText: '+12% Сытость, +12% Гидратация' },
    { id: 'sup_yuzu', itemId: 'yuzu_citrus', nameRu: 'Цитрус юзу свежий', price: 95, description: 'Редкий ароматный японский цитрус с нотами мандарина и лайма.', category: 'food', effectText: 'Бодрость, аромат' },
    { id: 'sup_grapefruit', itemId: 'grapefruit_pink', nameRu: 'Грейпфрут розовый', price: 65, description: 'Крупный рубиновый грейпфрут.', category: 'food', effectText: '+12% Сытость, +18% Гидратация' },
    { id: 'sup_mandarin', itemId: 'mandarin_citrus', nameRu: 'Мандарин сладкий', price: 30, description: 'Душистый сладкий мандарин.', category: 'food', effectText: '+6% Сытость, +7% Гидратация' },
    { id: 'sup_blood_orange', itemId: 'blood_orange_citrus', nameRu: 'Красный апельсин сицилийский', price: 55, description: 'Сочный кровавый апельсин с рубиновой мякотью.', category: 'food', effectText: '+9% Сытость, +14% Гидратация' },
    { id: 'sup_radish_bunch', itemId: 'radish_bunch_fresh', nameRu: 'Редис красный (пучок)', price: 40, description: 'Свежий хрустящий редис с зелёной ботвой.', category: 'food', effectText: '+8% Сытость, витамины' },
    { id: 'sup_tarragon_fresh', itemId: 'tarragon_sprigs_fresh', nameRu: 'Тархун (эстрагон) пучок', price: 45, description: 'Свежие пряные веточки кавказского эстрагона.', category: 'food', effectText: 'Пряная зелень' },
    { id: 'sup_hibiscus_sachet', itemId: 'hibiscus_dried', nameRu: 'Цветки гибискуса каркаде (саше 60г)', price: 55, description: 'Сушёные лепестки суданской розы для настоя и окрашивания.', category: 'food', effectText: 'Природный краситель' },

    // 6. МЯСНОЙ И МОЛОЧНЫЙ ОТДЕЛ, МАСЛА И БАКАЛЕЯ
    { id: 'sup_minced_beef', itemId: 'beef_minced', nameRu: 'Фарш говяжий (1 кг)', price: 420, description: 'Свежий прокрученный говяжий фарш на подложке (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_pork', itemId: 'pork_minced', nameRu: 'Фарш свиной (1 кг)', price: 340, description: 'Свежий свиной фарш на подложке (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_mixed', itemId: 'minced_meat_mixed', nameRu: 'Фарш домашний (1 кг)', price: 380, description: 'Классический фарш 50/50 говядина и свинина (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_chicken', itemId: 'chicken_minced', nameRu: 'Фарш куриный (1 кг)', price: 290, description: 'Нежный нежирный куриный фарш (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_minced_turkey', itemId: 'turkey_minced', nameRu: 'Фарш индюшачий (1 кг)', price: 390, description: 'Диетический фарш из филе индейки (1 кг). 100 порций по 10г.', category: 'food', effectText: '1 кг / 100 укусов' },
    { id: 'sup_milk_carton', itemId: 'milk', nameRu: 'Молоко пастеризованное 3.2% (1.0L)', price: 65, description: 'Пакет питьевого пастеризованного молока.', category: 'food', effectText: '+35% Гидратация, +20% Сытость' },
    { id: 'sup_sour_cream', itemId: 'sour_cream', nameRu: 'Сметана 20% (стаканчик 400г)', price: 75, description: 'Густая натуральная сметана с нежной кислинкой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_butter', itemId: 'butter_brick_salted', nameRu: 'Масло сливочное 82.5% (200г)', price: 95, description: 'Брикет натурального сладко-сливочного масла в крафтовой бумажной упаковке с золотистой этикеткой.', category: 'food', effectText: '+30% Сытость' },
    { id: 'sup_ghee_butter', itemId: 'ghee_butter', nameRu: 'Топленое масло Гхи (400г)', price: 180, description: 'Топленое сливочное масло Гхи в бумажном эко-боксе с янтарной этикеткой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_cheese', itemId: 'cheese_cheddar_block', nameRu: 'Сыр Чеддер (брусок 300г)', price: 160, description: 'Выдержанный полутвердый сыр Чеддер в бумажной упаковке с оранжевой этикеткой.', category: 'food', effectText: '+40% Сытость' },
    { id: 'sup_cheese_gouda', itemId: 'cheese_gouda_wheel', nameRu: 'Круг сыра Гауда (1.2 кг)', price: 480, description: 'Цельный круг сыра Гауда в большой бумажной упаковке с желтой этикеткой.', category: 'food', effectText: '+50% Сытость' },
    { id: 'sup_cheese_parmesan', itemId: 'cheese_parmesan_wedge', nameRu: 'Сыр Пармезан (кусок 250г)', price: 210, description: 'Твердый выдержанный Пармезан в крафтовом боксе с янтарной этикеткой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_cheese_mozzarella', itemId: 'cheese_mozzarella_ball', nameRu: 'Сыр Моцарелла (шарик 150г)', price: 110, description: 'Свежий нежный шарик Моцареллы в эко-боксе с небесно-голубой этикеткой.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_cheese_suluguni', itemId: 'cheese_suluguni_braid', nameRu: 'Сыр Сулугуни копченый (косичка 300г)', price: 175, description: 'Плетёная косичка копченого Сулугуни в бумажной упаковке с бронзовой этикеткой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_cheese_feta', itemId: 'cheese_feta_block', nameRu: 'Сыр Фета греческий (200г)', price: 140, description: 'Соленый рассыпчатый сыр Фета в эко-боксе с изумрудной этикеткой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'sup_cottage_cheese', itemId: 'cottage_cheese', nameRu: 'Творог рассыпчатый 9% (250г)', price: 85, description: 'Свежий натуральный творог в бумажной упаковке с васильковой этикеткой.', category: 'food', effectText: '+30% Сытость' },
    { id: 'sup_eggs', itemId: 'eggs_chicken', nameRu: 'Яйца куриные С1 (лоток 10 шт)', price: 90, description: 'Упаковка столовых отборных куриных яиц.', category: 'food', effectText: 'Кулинария / 10 шт' },
    { id: 'sup_oil_sunflower', itemId: 'oil_sunflower', nameRu: 'Масло подсолнечное (1.0L)', price: 95, description: 'Рафинированное подсолнечное масло в пластиковой бутылке.', category: 'food', effectText: 'Масло для жарки' },
    { id: 'sup_oil_olive', itemId: 'oil_olive', nameRu: 'Оливковое масло Extra Virgin (0.5L)', price: 240, description: 'Стеклянная бутылка нерафинированного оливкового масла.', category: 'food', effectText: 'Салатная заправка' },
    { id: 'sup_soy_sauce', itemId: 'soy_sauce_classic', nameRu: 'Соевый соус в бутылочке (0.25L)', price: 65, description: 'Соус натурального брожения в стеклянной бутылке.', category: 'food', effectText: 'Соевая заправка' },
    { id: 'sup_sugar', itemId: 'sugar', nameRu: 'Сахар-песок в пакете (1 кг)', price: 55, description: 'Пакет белоснежного сахара-песка.', category: 'food', effectText: 'Бакалея' },
    { id: 'sup_flour', itemId: 'flour_wheat', nameRu: 'Мука пшеничная в/с (1 кг)', price: 50, description: 'Пакет муки высшего сорта для выпечки.', category: 'food', effectText: 'Бакалея' },
    { id: 'sup_flour_rye', itemId: 'flour_rye', nameRu: 'Мука ржаная обдирная (1 кг)', price: 55, description: 'Цельная обдирная ржаная мука для домашнего хлеба и закваски.', category: 'food', effectText: 'Бакалея' },
    { id: 'sup_flour_corn', itemId: 'flour_corn', nameRu: 'Мука кукурузная жёлтая (0.5 кг)', price: 65, description: 'Солнечная кукурузная мука для лепёшек, мамалыги и выпечки без глютена.', category: 'food', effectText: 'Без глютена' },
    { id: 'sup_flour_rice', itemId: 'flour_rice', nameRu: 'Мука рисовая белая (0.5 кг)', price: 75, description: 'Тонкая белоснежная рисовая мука для сырников, кляра темпура и моти.', category: 'food', effectText: 'Без глютена' },
    { id: 'sup_salt', itemId: 'salt_fine', nameRu: 'Соль поваренная в солонке (150г)', price: 30, description: 'Удобная кухонная солонка с мелкой солью.', category: 'food', effectText: 'Специя' },
    {
      id: 'sup_bread',
      itemId: 'dough',
      nameRu: 'Домашний хлеб на закваске (буханка 400г)',
      price: 45,
      description: 'Свежевыпеченная пшеничная буханка хлеба на живой закваске с румяной корочкой.',
      category: 'food',
      effectText: '400 г · Выпечка из теста на закваске',
      doughAttributes: {
        shape: 'loaf',
        cookState: 'baked',
        riseFactor: 1.38,
        ingredients: [
          { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 245, role: 'flour', colorHex: '#f6eedb' },
          { itemId: 'water', nameRu: 'Вода', grams: 120, role: 'liquid', colorHex: '#f8fafc' },
          { itemId: 'sourdough', nameRu: 'Закваска', grams: 35, role: 'leavening', colorHex: '#efe6d0' },
          { itemId: 'oil_sunflower', nameRu: 'Подсолнечное масло', grams: 10, role: 'fat', colorHex: '#fde047' },
          { itemId: 'sugar', nameRu: 'Сахар', grams: 8, role: 'sugar', colorHex: '#ffffff' },
          { itemId: 'salt', nameRu: 'Соль', grams: 5, role: 'salt', colorHex: '#f8fafc' }
        ]
      }
    },

    // 6.05. КРУПЫ, ЗЕРНОВЫЕ КУЛЬТУРЫ И БОБОВЫЕ (В ПАЧКАХ С СЫПУЧИМ СОДЕРЖИМЫМ)
    { id: 'sup_grain_buckwheat', itemId: 'buckwheat_roasted', nameRu: 'Гречка ядрица обжаренная (пачка ~720г)', price: 95, description: 'Заводская пачка-пакет с окошком: цельные пропаренные и обжаренные ядра гречихи 1 сорта.', category: 'food', effectText: 'Крупа · Варка 15–18 мин' },
    { id: 'sup_grain_buckwheat_green', itemId: 'buckwheat_green', nameRu: 'Гречка зелёная живая (коробка ~580г)', price: 135, description: 'Картонная пачка: сырые необжаренные ядра зелёной гречихи для каши и проращивания.', category: 'food', effectText: 'Крупа · Без глютена' },
    { id: 'sup_grain_rice_basmati', itemId: 'rice_basmati', nameRu: 'Рис Басмати длиннозёрный (пачка ~820г)', price: 145, description: 'Пачка выдержанного ароматного индийского риса Басмати для рассыпчатого плова.', category: 'food', effectText: 'Крупа · Варка 12–15 мин' },
    { id: 'sup_grain_rice_arborio', itemId: 'rice_arborio', nameRu: 'Рис Арборио для ризотто (коробка ~615г)', price: 165, description: 'Картонная пачка итальянского круглозёрного риса Арборио с бархатистым крахмалом.', category: 'food', effectText: 'Крупа · Для ризотто' },
    { id: 'sup_grain_rice_white', itemId: 'rice_white', nameRu: 'Рис круглозёрный японский (пачка ~820г)', price: 125, description: 'Пачка полированного клейкого риса Косихикари для суши, роллов и молочных каш.', category: 'food', effectText: 'Крупа · Для суши' },
    { id: 'sup_grain_rice_brown', itemId: 'rice_brown_whole', nameRu: 'Рис бурый цельнозерновой (пачка ~740г)', price: 130, description: 'Нешлифованный длиннозёрный рис в природной отрубевой оболочке.', category: 'food', effectText: 'Крупа · Цельнозерновой' },
    { id: 'sup_grain_rice_jasmine', itemId: 'rice_jasmine', nameRu: 'Рис Жасмин тайский ароматный (пачка ~740г)', price: 150, description: 'Тонкий белоснежный тайский рис Хом Мали с цветочным ароматом.', category: 'food', effectText: 'Крупа · Варка 12–15 мин' },
    { id: 'sup_grain_rice_wild', itemId: 'rice_wild_black', nameRu: 'Рис дикий чёрный деликатесный (коробка ~490г)', price: 245, description: 'Картонная пачка отборных семян дикого чёрного водного злака Zizania.', category: 'food', effectText: 'Крупа · Белок 14.7г' },
    { id: 'sup_grain_oats', itemId: 'grain_oats', nameRu: 'Хлопья овсяные «Геркулес» (коробка ~440г)', price: 68, description: 'Картонная пачка традиционных плющеных хлопьев из цельного овса №1.', category: 'food', effectText: 'Хлопья · Варка 15–20 мин' },
    { id: 'sup_grain_wheat', itemId: 'grain_wheat_raw', nameRu: 'Зерно пшеницы цельное (пачка ~790г)', price: 72, description: 'Нешлифованные цельные зёрна твёрдой пшеницы для каши, проращивания и помола.', category: 'food', effectText: 'Культура · Цельное зерно' },
    { id: 'sup_grain_rye', itemId: 'grain_rye_raw', nameRu: 'Зерно ржи озимой цельное (пачка ~740г)', price: 68, description: 'Очищенные цельные зёрна озимой ржи для солода, кваса и деревенских каш.', category: 'food', effectText: 'Культура · Цельное зерно' },
    { id: 'sup_grain_spelt', itemId: 'spelt_whole_grain', nameRu: 'Полба цельнозерновая / Спельта (коробка ~570г)', price: 140, description: 'Картонная пачка древней пшеницы-полбы с ореховым вкусом и 14.6% белка.', category: 'food', effectText: 'Культура · Белок 14.6г' },
    { id: 'sup_grain_barley_pearl', itemId: 'barley_pearl', nameRu: 'Крупа перловая шлифованная №1 (пачка ~780г)', price: 55, description: 'Шлифованные ячменные «жемчужины» для рассольника, перлотто и каши.', category: 'food', effectText: 'Крупа · Ячмень' },
    { id: 'sup_grain_barley_yachka', itemId: 'barley_crushed_yachka', nameRu: 'Крупа ячневая дроблёная №2 (пачка ~650г)', price: 48, description: 'Нешлифованные дроблёные ядра ячменя — быстрая вязкая каша.', category: 'food', effectText: 'Крупа · Варка 15–20 мин' },
    { id: 'sup_grain_millet', itemId: 'millet_yellow', nameRu: 'Пшено шлифованное золотистое (пачка ~700г)', price: 62, description: 'Очищенные круглые ядра культурного проса для тыквенной каши и кулеша.', category: 'food', effectText: 'Крупа · Без глютена' },
    { id: 'sup_grain_semolina', itemId: 'semolina_wheat', nameRu: 'Крупа манная из твёрдой пшеницы (пачка ~590г)', price: 58, description: 'Сыпучая янтарная крупка марки Т для нежной каши и манника за 4 минуты.', category: 'food', effectText: 'Крупа · Варка 4–5 мин' },
    { id: 'sup_grain_bulgur', itemId: 'bulgur_golden', nameRu: 'Булгур золотистый средний (пачка ~700г)', price: 115, description: 'Пропаренная и дроблёная твёрдая пшеница для турецкого плова и табуле.', category: 'food', effectText: 'Крупа · Варка 15–18 мин' },
    { id: 'sup_grain_couscous', itemId: 'couscous_moroccan', nameRu: 'Кускус марокканский средний (коробка ~570г)', price: 128, description: 'Картонная пачка пропаренных гранул семолины — запаривается кипятком за 5 минут.', category: 'food', effectText: 'Крупа · Запарить 5 мин' },
    { id: 'sup_grain_corn_polenta', itemId: 'corn_grits_polenta', nameRu: 'Крупа кукурузная для поленты (пачка ~675г)', price: 68, description: 'Солнечная дроблёная кукурузная крупка №4 для итальянской поленты и мамалыги.', category: 'food', effectText: 'Крупа · Без глютена' },
    { id: 'sup_grain_quinoa', itemId: 'quinoa_white_tricolor', nameRu: 'Киноа трёхцветная перуанская (коробка ~525г)', price: 220, description: 'Картонная пачка микса белой, красной и чёрной киноа с полным аминокислотным профилем.', category: 'food', effectText: 'Суперфуд · Без глютена' },
    { id: 'sup_grain_peas', itemId: 'peas_split_yellow', nameRu: 'Горох колотый жёлтый шлифованный (пачка ~760г)', price: 58, description: 'Отборные половинки жёлтого гороха для наваристого супа и горохового пюре.', category: 'food', effectText: 'Бобовые · Белок 23г' },
    { id: 'sup_grain_beans_red', itemId: 'beans_red_kidney', nameRu: 'Фасоль красная сухая Кидни (пачка ~700г)', price: 110, description: 'Крупные бордовые почковидные бобы для лобио, чили и красного борща.', category: 'food', effectText: 'Бобовые · Белок 21.6г' },
    { id: 'sup_grain_beans_white', itemId: 'beans_white_lima', nameRu: 'Фасоль белая крупная Лима (пачка ~700г)', price: 120, description: 'Крупные маслянистые белые бобы со сливочной сердцевиной.', category: 'food', effectText: 'Бобовые · Белок 21.5г' },
    { id: 'sup_grain_lentils_red', itemId: 'lentils_red_dry', nameRu: 'Чечевица красная колотая (пачка ~650г)', price: 125, description: 'Оранжевая колотая чечевица — варится за 12 минут без замачивания.', category: 'food', effectText: 'Бобовые · Белок 24.6г' },
    { id: 'sup_grain_lentils_green', itemId: 'lentils_green_dry', nameRu: 'Чечевица зелёная тарелочная (пачка ~650г)', price: 120, description: 'Цельные зелёные зёрна чечевицы, сохраняющие форму в гарнирах и салатах.', category: 'food', effectText: 'Бобовые · Белок 24г' },
    { id: 'sup_grain_chickpeas', itemId: 'chickpeas_garbanzo_dry', nameRu: 'Нут крупный турецкий (пачка ~700г)', price: 130, description: 'Крупный бараний горох калибра 9 мм для узбекского плова, хумуса и фалафеля.', category: 'food', effectText: 'Бобовые · Белок 19.3г' },
    { id: 'sup_grain_mung', itemId: 'mung_beans_green', nameRu: 'Маш зелёный отборный (пачка ~680г)', price: 135, description: 'Мелкие зелёные бобы мунг для машхурды, кичари и свежих проростков.', category: 'food', effectText: 'Бобовые · Белок 23.9г' },

    // 6.06. МАКАРОННЫЕ ИЗДЕЛИЯ (СЫПУЧИЕ В ФИРМЕННЫХ УПАКОВКАХ)
    { id: 'sup_pasta_spaghetti', itemId: 'pasta_spaghetti_durum', nameRu: 'Спагетти №5 Дурум (пачка ~475г)', price: 85, description: 'Удлинённая пачка длинных круглых спагетти из 100% твёрдой пшеницы группы А.', category: 'food', effectText: 'Нити · Дурум · 8–9 мин' },
    { id: 'sup_pasta_penne', itemId: 'pasta_penne_rigate', nameRu: 'Пенне Ригате / Перья рифлёные (пачка ~475г)', price: 85, description: 'Полые рифлёные трубочки с косым срезом из твёрдой пшеницы — отлично держат густой соус.', category: 'food', effectText: 'Перья · Рифлёные · 10–11 мин' },
    { id: 'sup_pasta_fusilli_tri', itemId: 'pasta_fusilli_tricolor', nameRu: 'Фузилли триколор со шпинатом и томатом (~475г)', price: 105, description: 'Разноцветные витые спиральки из дурума с натуральным шпинатом и томатом.', category: 'food', effectText: 'Спиральки · Триколор · 9–10 мин' },
    { id: 'sup_pasta_farfalle', itemId: 'pasta_farfalle_bow', nameRu: 'Фарфалле / Бантики из дурума (пачка ~475г)', price: 95, description: 'Фигурные бантики с зубчатым краем и плотной серединкой для сливочных соусов.', category: 'food', effectText: 'Бантики · Дурум · 10–11 мин' },
    { id: 'sup_pasta_conchiglie', itemId: 'pasta_conchiglie_shells', nameRu: 'Конкилье Ригате / Ракушки (пачка ~475г)', price: 90, description: 'Полые ребристые ракушки из твёрдой пшеницы — захватывают фарш и сырный соус.', category: 'food', effectText: 'Ракушки · Рифлёные · 10–12 мин' },
    { id: 'sup_pasta_macaroni', itemId: 'pasta_macaroni_elbows', nameRu: 'Рожки классические Макарони (пачка ~500г)', price: 78, description: 'Изогнутые гладкие рожки из твёрдой пшеницы для макарон по-флотски и с сыром.', category: 'food', effectText: 'Рожки · Дурум · 7–8 мин' },
    { id: 'sup_pasta_vermicelli', itemId: 'pasta_vermicelli_fine', nameRu: 'Вермишель тонкая яичная «Паутинка» (~450г)', price: 88, description: 'Тонкие короткие нити на свежих куриных яйцах (15%) для прозрачного бульона.', category: 'food', effectText: 'Паутинка · Яичная · 3–4 мин' },
    { id: 'sup_pasta_tagliatelle', itemId: 'pasta_tagliatelle_nests', nameRu: 'Тальятелле яичные в гнёздах (коробка ~420г)', price: 165, description: 'Картонная пачка с окошком: широкие плоские ленты-гнёзда на 28% свежих яиц.', category: 'food', effectText: 'Гнёзда · 28% яиц · 6–7 мин' },
    { id: 'sup_pasta_rigatoni', itemId: 'pasta_rigatoni_bronze', nameRu: 'Ригатони Al Bronzo крупные (пачка ~475г)', price: 145, description: 'Ремесленные крупные рифлёные цилиндры, отпрессованные через бронзовые матрицы.', category: 'food', effectText: 'Трубы · Бронзовая матрица' },
    { id: 'sup_pasta_orzo', itemId: 'pasta_orzo_risoni', nameRu: 'Орзо / Ризони паста-рис (пачка ~475г)', price: 110, description: 'Мелкие макароны в форме рисовых зёрен из твёрдой пшеницы для супов и паста-ризотто.', category: 'food', effectText: 'Зёрнышки · Дурум · 8–9 мин' },
    { id: 'sup_pasta_wholewheat', itemId: 'pasta_spaghetti_wholewheat', nameRu: 'Спагетти цельнозерновые Integrale (~475г)', price: 115, description: 'Удлинённая пачка тёмных спагетти из цельного зерна твёрдой пшеницы с отрубями.', category: 'food', effectText: 'Нити · Цельнозерновые' },
    { id: 'sup_pasta_black_ink', itemId: 'pasta_spaghetti_black_ink', nameRu: 'Спагетти чёрные с чернилами каракатицы (~450г)', price: 215, description: 'Деликатесные угольно-чёрные спагетти Nero di Seppia для пасты с морепродуктами.', category: 'food', effectText: 'Нити · Чернила каракатицы' },
    { id: 'sup_pasta_soba', itemId: 'pasta_soba_buckwheat', nameRu: 'Лапша гречневая Соба японская (~450г)', price: 135, description: 'Длинные плоские ленты лапши из 65% гречневой и 35% пшеничной муки.', category: 'food', effectText: 'Лапша · 65% гречки · 4–5 мин' },
    { id: 'sup_pasta_red_lentil', itemId: 'pasta_fusilli_red_lentil', nameRu: 'Фузилли из красной чечевицы (пачка ~420г)', price: 175, description: 'Безглютеновые спиральки из 100% муки красной чечевицы — 25 г белка на 100 г.', category: 'food', effectText: 'Без глютена · Белок 25г' },
    { id: 'sup_pasta_corn_rice', itemId: 'pasta_penne_corn_rice', nameRu: 'Пенне кукурузно-рисовые без глютена (~450г)', price: 155, description: 'Золотистые рифлёные перья из 70% кукурузной и 30% рисовой муки.', category: 'food', effectText: 'Перья · Без глютена' },
    { id: 'sup_pasta_stelline', itemId: 'pasta_stelline_stars', nameRu: 'Стеллине / Звёздочки суповые (пачка ~450г)', price: 82, description: 'Миниатюрные звёздочки с отверстием из твёрдой пшеницы для супов и бульонов.', category: 'food', effectText: 'Звёздочки · Суповые · 5–6 мин' },

    // 6.1. БАЗОВЫЕ ЗАГУСТИТЕЛИ, СИРОПЫ И КУЛИНАРНЫЕ ДОБАВКИ
    { id: 'sup_gelatin_sachet', itemId: 'gelatin_powder', nameRu: 'Желатин пищевой (саше 50г)', price: 45, description: 'Быстрорастворимый пищевой желатин для мармелада и заливного.', category: 'food', effectText: 'Загуститель' },
    { id: 'sup_pectin_apple', itemId: 'pectin_apple', nameRu: 'Пектин яблочный (саше 50г)', price: 75, description: 'Натуральный яблочный загуститель для ягодного мармелада и джема.', category: 'food', effectText: 'Растительный гель' },
    { id: 'sup_agar_agar', itemId: 'agar_agar', nameRu: 'Агар-агар 900 (саше 40г)', price: 90, description: 'Сильный растительный желирующий агент из красных водорослей.', category: 'food', effectText: 'Загуститель 900' },
    { id: 'sup_starch_corn', itemId: 'starch_corn', nameRu: 'Крахмал кукурузный (400г)', price: 55, description: 'Мелкий белоснежный кукурузный крахмал для отливки сладостей и соусов.', category: 'food', effectText: 'Бакалея' },
    { id: 'sup_topinambur_syrup', itemId: 'topinambur_syrup', nameRu: 'Сироп топинамбура (0.25L)', price: 145, description: 'Натуральный пребиотический сироп из клубней топинамбура.', category: 'food', effectText: '+18% Сытость, полезный' },
    { id: 'sup_coconut_milk', itemId: 'coconut_milk', nameRu: 'Кокосовое молоко 19% (банка 0.4L)', price: 135, description: 'Натуральное кокосовое молоко для тропических десертов и карри.', category: 'food', effectText: '+22% Гидратация, +16% Сытость' },
    { id: 'sup_citric_sachet', itemId: 'citric_acid', nameRu: 'Лимонная кислота (саше 80г)', price: 25, description: 'Пищевая кристаллическая лимонная кислота.', category: 'food', effectText: 'Регулятор кислотности' },
    { id: 'sup_citric_jar', itemId: 'citric_acid_coarse', nameRu: 'Лимонная кислота крупная в банке (100г)', price: 45, description: 'Крупные кристаллы лимонной кислоты для кислой посыпки.', category: 'food', effectText: 'Кислая обсыпка' },
    { id: 'sup_vanilla_extract', itemId: 'extract_vanilla', nameRu: 'Экстракт бурбонской ванили (100мл)', price: 165, description: 'Настоящая ванильная вытяжка для крем-соды и десертов.', category: 'food', effectText: 'Ваниль натуральная' },

    // 7. ПЕЛЬМЕНИ, СНЕКИ, СЛАДОСТИ И ТАРА
    { id: 'sup_pelmeni_siberian', itemId: 'pelmeni_siberian_pack', nameRu: 'Пельмени «Сибирские отборные» (пачка с клипсой 45 шт., 675г)', price: 290, description: 'Пакет со скрепкой-клипсой и смотровым окном: 45 пельменей ручной лепки «ушко» с говядиной и свининой.', category: 'food', effectText: '675г · 45 шт., лепка «ушко»' },
    { id: 'sup_pelmeni_mini', itemId: 'pelmeni_mini_bullion_pack', nameRu: 'Пельмени «Бульонные Малютки» (малая пачка 55 шт., 385г)', price: 230, description: 'Малый пакет с клипсой: 55 миниатюрных пельмешек «Сатурн» с пояском из телятины и индейки со сливками.', category: 'food', effectText: '385г · 55 шт., мини 7г' },
    { id: 'sup_pelmeni_ural_box', itemId: 'pelmeni_ural_box', nameRu: 'Пельмени «Уральские по ГОСТу» (картонная пачка 32 шт., 480г)', price: 260, description: 'Картонная коробка с окошком и перфорацией: 32 пельменя полумесяцем с косичкой из говядины, свинины и баранины.', category: 'food', effectText: '480г · 32 шт., полумесяц' },
    { id: 'sup_pelmeni_bogatyr', itemId: 'pelmeni_bogatyr_large_pack', nameRu: 'Пельмени «Богатырские Крупные» (семейный мешок 40 шт., 880г)', price: 390, description: 'Большой семейный мешок со скрепкой: 40 крупных пельменей по 22г (категория А, 68% рубленого мяса).', category: 'food', effectText: '880г · 40 шт., крупные 22г' },
    { id: 'sup_pelmeni_khinkali', itemId: 'pelmeni_khinkali_lamb_pack', nameRu: 'Пельмени-буузы «Восточные мешочки» (пачка 28 шт., 616г)', price: 340, description: 'Пакет с клипсой: 28 фигурных пельменей-мешочков со складками, рубленой бараниной, зирой и кинзой.', category: 'food', effectText: '616г · 28 шт., мешочки' },
    { id: 'sup_pelmeni_colored', itemId: 'pelmeni_colored_kids_pack', nameRu: 'Пельмешки «Радужные Розочки и Подушечки» (36 шт., 396г)', price: 275, description: 'Пачка цветных фигурных пельмешек на шпинатном, свекольном и морковном соке с индейкой, телятиной и кроликом.', category: 'food', effectText: '396г · 36 шт., 3 вида теста' },
    { id: 'sup_gummy_mini', itemId: 'gummy_pack_mini_bears', nameRu: 'Мармелад «Фруктовые мишки» (саше 12 шт., 30г)', price: 40, description: 'Четырёхшовный мини-саше с прозрачным окном: 12 мишек (клубника, лимон, яблоко, апельсин).', category: 'food', effectText: '30г · +12% Сытость, +14% Энергия' },
    { id: 'sup_gummy_mint', itemId: 'gummy_pack_mini_mint_hearts', nameRu: 'Мармелад «Мята и Эвкалипт» (саше 10 шт., 40г)', price: 50, description: 'Дорожный мини-саше с освежающими сердечками: перечная мята, лайм и эвкалипт с мёдом.', category: 'food', effectText: '40г · +16% Сытость, свежесть' },
    { id: 'sup_gummy_gold', itemId: 'gummy_pack_flow_bears_gold', nameRu: 'Мармелад «Золотые мишки» (флоу-пак 28 шт., 70г)', price: 65, description: 'Пакет-подушечка: 28 классических фруктовых мишек пяти вкусов на натуральном соке.', category: 'food', effectText: '70г · +28% Сытость, +34% Энергия' },
    { id: 'sup_gummy_cola', itemId: 'gummy_pack_flow_cola', nameRu: 'Мармелад «Шипучая Кола» (флоу-пак 16 шт., 80г)', price: 70, description: 'Пакет-подушечка: 16 мармеладных бутылочек колы и вишнёвой колы в кислой обсыпке.', category: 'food', effectText: '80г · +32% Сытость, +40% Энергия' },
    { id: 'sup_gummy_citrus', itemId: 'gummy_pack_flow_citrus_stars', nameRu: 'Мармелад «Цитрусовый микс» (флоу-пак 24 шт., 84г)', price: 78, description: 'Флоу-пак с 24 звёздочками в цитрусовой посыпке: юзу, грейпфрут, красный апельсин, лайм.', category: 'food', effectText: '84г · +34% Сытость, +38% Энергия' },
    { id: 'sup_gummy_soda', itemId: 'gummy_pack_euro_soda_bottles', nameRu: 'Мармелад «Лимонадный бар» (евро-пакет 26 шт., 130г)', price: 105, description: 'Евро-пакет с шипучими бутылочками: тархун, крем-сода, апельсиновая содовая и кола-лайм.', category: 'food', effectText: '130г · +52% Сытость, +65% Энергия' },
    { id: 'sup_gummy_worms', itemId: 'gummy_pack_euro_worms', nameRu: 'Мармелад «Кислые червячки» (евро-пакет 22 шт., 132г)', price: 105, description: 'Евро-пакет с подвесом: 22 двухцветных червячка с кислой кристаллической посыпкой.', category: 'food', effectText: '132г · +53% Сытость, +62% Энергия' },
    { id: 'sup_gummy_tropical', itemId: 'gummy_pack_euro_tropical_cubes', nameRu: 'Мармелад «Тропические кубики» (евро-пакет 28 шт., 140г)', price: 120, description: 'Евро-пакет на пектине и агар-агаре: манго-маракуйя, гуава, ананас-кокос и личи.', category: 'food', effectText: '140г · +56% Сытость, на пектине' },
    { id: 'sup_gummy_berries', itemId: 'gummy_pack_doypack_berries', nameRu: 'Мармелад «Лесные ягоды и сердца» (дой-пак 48 шт., 176г)', price: 145, description: 'Стоячий дой-пак: 48 ягод малины, ежевики и вишнёвых сердечек на натуральном соке.', category: 'food', effectText: '176г · +70% Сытость, на соке' },
    { id: 'sup_gummy_sour_mix', itemId: 'gummy_pack_doypack_sour_mix', nameRu: 'Мармелад «Ультра-кислый микс» (дой-пак 40 шт., 195г)', price: 155, description: 'Дой-пак с зип-локом: 40 кислых червячков, кубиков, звёздочек и бутылочек.', category: 'food', effectText: '195г · +78% Сытость, +90% Энергия' },
    { id: 'sup_gummy_rings', itemId: 'gummy_pack_doypack_rings', nameRu: 'Мармелад «Фруктовые колечки» (дой-пак 28 шт., 196г)', price: 150, description: 'Стоячий дой-пак с зип-локом и 28 двухслойными персиковыми, арбузными и яблочными колечками.', category: 'food', effectText: '196г · +78% Сытость, зип-лок' },
    { id: 'sup_gummy_bears_xl', itemId: 'gummy_pack_doypack_bears_xl', nameRu: 'Мармелад «Медвежья семья» (дой-пак 80 шт., 200г)', price: 155, description: 'Большой стоячий дой-пак с зип-локом: 80 фруктовых мишек шести вкусов.', category: 'food', effectText: '200г · +80% Сытость, +96% Энергия' },
    { id: 'sup_gummy_orchard', itemId: 'gummy_pack_large_berry_orchard', nameRu: 'Мармелад «Ягодно-фруктовый сад» (пакет 100 шт., 400г)', price: 295, description: 'Большая пачка с фальцами: 100 мармеладок на пектине и фруктово-ягодном соке.', category: 'food', effectText: '400г · На пектине, семейный' },
    { id: 'sup_gummy_party', itemId: 'gummy_pack_large_party', nameRu: 'Мармелад «Мега-Ассорти» (пакет 96 шт., 438г)', price: 310, description: 'Большой пакет с боковыми фальцами: 96 разноцветных мармеладок всех 8 форм и вкусов.', category: 'food', effectText: '438г · Семейная пачка' },
    { id: 'sup_choc_truffle', itemId: 'choc_mini_truffle_hazelnut', nameRu: 'Конфета «Золотой трюфель» (мини-обёртка, 12г)', price: 28, description: 'Мини-обёртка из фольги с манжетой: купольный трюфель из тёмного шоколада 64% с фундучным пралине.', category: 'food', effectText: '12г · Трюфель с фундуком' },
    { id: 'sup_choc_ruby_heart', itemId: 'choc_mini_ruby_heart', nameRu: 'Сердечко «Рубиновая малина» (мини-обёртка, 12г)', price: 32, description: 'Мини-обёртка с рубиновым шоколадом Ruby и воздушным малиновым кремом внутри.', category: 'food', effectText: '12г · Шоколад Ruby' },
    { id: 'sup_choc_caramel', itemId: 'choc_bar_caramel_chunky', nameRu: 'Батончик «Солёная карамель и арахис» (флоу-пак, 45г)', price: 65, description: 'Флоу-пак: батончик с округлыми сегментами, тягучей солёной карамелью и дроблёным арахисом.', category: 'food', effectText: '45г · +12% Сытость, +14% Энергия' },
    { id: 'sup_choc_coconut', itemId: 'choc_bar_coconut_bounty', nameRu: 'Батончик «Тропический кокос» (флоу-пак, 45г)', price: 62, description: 'Флоу-пак: молочный шоколад 35% с белоснежной сочной кокосовой стружкой внутри.', category: 'food', effectText: '45г · Кокос и шоколад' },
    { id: 'sup_choc_wafer', itemId: 'choc_bar_wafer_crispy', nameRu: 'Вафельные палочки в шоколаде (флоу-пак, 2 шт.)', price: 58, description: 'Флоу-пак: 2 хрустящие вафельные палочки с ореховым пралине под молочной глазурью.', category: 'food', effectText: '24г · Хрустящая вафля' },
    { id: 'sup_choc_milk', itemId: 'choc_foil_milk_classic', nameRu: 'Шоколад «Альпийское молоко» (фольга+бумага, 95г)', price: 95, description: 'Классическая двухслойная упаковка: дольчатая плитка цельного молочного шоколада 36%.', category: 'food', effectText: '95г · +24% Сытость, +26% Энергия' },
    { id: 'sup_choc_dark85', itemId: 'choc_foil_dark_bitter_85', nameRu: 'Шоколад горький 85% «Эквадор» (фольга+бумага, 95г)', price: 135, description: 'Золотая фольга и бумажный рукав: элитный горький шоколад 85% с обжаренной какао-крупкой.', category: 'food', effectText: '95г · 85% какао' },
    { id: 'sup_choc_dubai', itemId: 'choc_foil_dubai_pistachio', nameRu: 'Шоколад «Дубайский фисташковый катаифи» (95г)', price: 240, description: 'Рельефная волнистая плитка из молочного шоколада с изумрудной пастой фисташки, тахини и хрустящим катаифи.', category: 'food', effectText: '95г · Фисташка и катаифи' },
    { id: 'sup_choc_mint_sq', itemId: 'choc_square_mint_fondant', nameRu: 'Шоколад квадратный «Мятная прохлада» (кник-пак, 95г)', price: 110, description: 'Квадратный кник-пак: плитка 3×3 из тёмного шоколада 62% с освежающей мятной помадкой.', category: 'food', effectText: '95г · Мятная начинка' },
    { id: 'sup_choc_white_sq', itemId: 'choc_square_white_strawberry', nameRu: 'Шоколад квадратный «Белый с клубникой» (кник-пак, 95г)', price: 115, description: 'Квадратный кник-пак: белый шоколад на масле какао со сливочно-клубничным кремом.', category: 'food', effectText: '95г · Белый + клубника' },
    { id: 'sup_choc_prism', itemId: 'choc_prism_honey_nougat', nameRu: 'Шоколад-призма «Альпийский пик с нугой» (180г)', price: 220, description: 'Треугольная картонная призма: зубчатый молочный шоколад с медово-миндальной нугой.', category: 'food', effectText: '180г · +42% Сытость, мёд и нуга' },
    { id: 'sup_choc_king_nut', itemId: 'choc_king_whole_hazelnut', nameRu: 'Шоколад XXL «Цельный лесной орех» (крафт, 300г)', price: 320, description: 'Большой крафт-конверт XXL с золочёной фольгой: гигантская плитка 300г с цельным жареным фундуком.', category: 'food', effectText: '300г · +68% Сытость, XXL' },
    { id: 'sup_choc_king_matcha', itemId: 'choc_king_matcha_yuzu', nameRu: 'Шоколад XXL «Матча Удзи и Юзу» (крафт, 180г)', price: 290, description: 'Крупный крафт-конверт: волнистая плитка с чаем Матча снаружи и цитрусовым ганашем юзу внутри.', category: 'food', effectText: '180г · Матча + Юзу' },
    { id: 'sup_choc_gift_box', itemId: 'choc_gift_box_assorted', nameRu: 'Коробка конфет «Ассорти Гранд Пралине» (16 шт., 192г)', price: 460, description: 'Подарочная коробка с окном и золотым коррексом: 16 фигурных конфет (ракушки, ромбы, медальоны, сердечки, трюфели).', category: 'food', effectText: '192г · 16 конфет пралине' },
    { id: 'sup_cookies', itemId: 'cookies', nameRu: 'Печенье с шоколадными каплями (дой-пак)', price: 50, description: 'Герметичный дой-пак рассыпчатого песочного печенья (6 шт.).', category: 'food', effectText: '+25% Сытость' },
    { id: 'sup_chips', itemId: 'chips', nameRu: 'Картофельные чипсы (дой-пак 8 шт.)', price: 55, description: 'Герметичный дой-пак хрустящих ломтиков картофеля с морской солью.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_plastic_bag', itemId: 'plastic_bag', nameRu: 'Пакет-майка с ручками', price: 5, description: 'Вместительный прочный полиэтиленовый пакет 12.0L.', category: 'auto', effectText: 'Пакет 12.0L' },
    { id: 'sup_package_bag', itemId: 'package_bag', nameRu: 'Фасовочные пакеты (2.5L)', price: 3, description: 'Тонкий прозрачный полиэтиленовый пакетик.', category: 'auto', effectText: 'Пакет 2.5L' },
    { id: 'sup_grain_pack_pouch', itemId: 'grain_pack_pouch', nameRu: 'Пачка-пакет для круп пустая (1.0L)', price: 6, description: 'Пустая пачка-пакет с прозрачным окном для пересыпания и хранения круп и бобовых.', category: 'auto', effectText: 'Тара сыпучих 1.0L' },
    { id: 'sup_grain_pack_box', itemId: 'grain_pack_box', nameRu: 'Картонная пачка для круп пустая (0.8L)', price: 10, description: 'Пустая картонная пачка с окошком для хлопьев, киноа, кускуса и сыпучих продуктов.', category: 'auto', effectText: 'Тара сыпучих 0.8L' },
    { id: 'sup_pasta_pack_bag', itemId: 'pasta_pack_bag', nameRu: 'Упаковка для макарон пустая (0.9L)', price: 7, description: 'Пустой прозрачный пакет с лентой-этикеткой для фигурных макаронных изделий.', category: 'auto', effectText: 'Тара макарон 0.9L' },
    { id: 'sup_pasta_pack_long', itemId: 'pasta_pack_long', nameRu: 'Упаковка для спагетти пустая (0.85L)', price: 7, description: 'Пустая удлинённая пачка с окном для спагетти и длинной лапши.', category: 'auto', effectText: 'Тара спагетти 0.85L' },
    { id: 'sup_jar_empty', itemId: 'jar_glass_medium', nameRu: 'Банка стеклянная с крышкой (0.5L)', price: 35, description: 'Унифицированная чистая банка твист-офф для консервации.', category: 'auto', effectText: 'Емкость 0.5L' },

    // 7. БЫТОВАЯ ХИМИЯ И СРЕДСТВА ДЛЯ СТИРКИ
    { id: 'sup_detergent_sachet', itemId: 'detergent_sachet_120', nameRu: 'Порошок «Свежесть 2-в-1» (саше 100г)', price: 35, description: 'Порционное герметичное саше сухого мелкодисперсного стирального порошка на одну закладку.', category: 'auto', effectText: '100 г · Сухой порошок' },
    { id: 'sup_detergent_box_450', itemId: 'detergent_powder_box_450', nameRu: 'Порошок «Морозный Бриз Автомат» (коробка 450г)', price: 155, description: 'Картонная коробка с перфорированным носиком: белый гранулированный порошок с бирюзовыми кислородными активаторами.', category: 'auto', effectText: '450 г · Сухой порошок' },
    { id: 'sup_detergent_eco_900', itemId: 'detergent_powder_eco_900', nameRu: 'Эко-порошок «Мыльный Орех и Сода» (коробка 900г)', price: 295, description: 'Натуральный безфосфатный порошок на мыльной стружке, соде и сапиндусе без синтетических красителей.', category: 'auto', effectText: '900 г · Эко-порошок' },
    { id: 'sup_detergent_bag_3000', itemId: 'detergent_powder_color_3000', nameRu: 'Порошок «Колор-Защита Семейный» (пакет 3000г)', price: 680, description: 'Большой 3-литровый пакет с прорезной ручкой: сухой порошок с розовыми и изумрудными био-энзимами для цветных тканей.', category: 'auto', effectText: '3000 г · Для цветного' },
    { id: 'sup_detergent_gel_1500', itemId: 'detergent_gel_aqua_1500', nameRu: 'Гель-концентрат «Аква-Сила» (канистра 1.5L)', price: 420, description: 'Эргономичная канистра HDPE с боковой ручкой и мерным колпачком: концентрированный бирюзовый жидкий гель с энзимами.', category: 'auto', effectText: '1500 мл · Жидкий гель' },
    { id: 'sup_detergent_lavender_1000', itemId: 'detergent_gel_lavender_1000', nameRu: 'Бальзам-гель «Лаванда Шерсть и Шёлк» (флакон 1.0L)', price: 340, description: 'Фигурный флакон 1.0л с колпачком-дозатором: мягкий перламутровый лавандовый гель с ланолином для деликатных тканей.', category: 'auto', effectText: '1000 мл · Бальзам-гель' },

    // 8. КУХОННЫЙ ИНВЕНТАРЬ ДЛЯ ВЫПЕЧКИ (СКАЛКИ)
    {
      id: 'sup_rolling_pin_classic',
      itemId: 'rolling_pin',
      nameRu: 'Скалка деревянная классическая (бук, 44 см)',
      price: 390,
      description: 'Точёная скалка из массива бука с вращающимися ручками на стальной оси для раскатки любого теста.',
      category: 'auto',
      effectText: 'Бук · 44 см · Раскатка теста',
      rollingPinAttributes: { modelId: 'classic_handles' }
    },
    {
      id: 'sup_rolling_pin_french',
      itemId: 'rolling_pin',
      nameRu: 'Скалка французская конусная (тёмный орех, 48 см)',
      price: 540,
      description: 'Цельная конусная скалка из тёмного ореха без ручек — идеально чувствует толщину пласта.',
      category: 'auto',
      effectText: 'Орех · 48 см · Точная раскатка ×1.12',
      rollingPinAttributes: { modelId: 'french_tapered' }
    },
    {
      id: 'sup_rolling_pin_marble',
      itemId: 'rolling_pin',
      nameRu: 'Скалка мраморная кондитерская (тяжёлая, 46 см)',
      price: 1150,
      description: 'Тяжёлая скалка из натурального мрамора на подшипниках — сама раскатывает слоёное и песочное тесто без усилий.',
      category: 'auto',
      effectText: 'Мрамор · 46 см · Тяжёлая ×1.32',
      rollingPinAttributes: { modelId: 'marble_heavy' }
    },
    {
      id: 'sup_rolling_pin_silicone',
      itemId: 'rolling_pin',
      nameRu: 'Скалка силиконовая с кольцами толщины (42 см)',
      price: 680,
      description: 'Антипригарная скалка из пищевого силикона со съёмными кольцами-ограничителями.',
      category: 'auto',
      effectText: 'Силикон · 42 см · Антипригарная',
      rollingPinAttributes: { modelId: 'silicone_nonstick' }
    },
    {
      id: 'sup_rolling_pin_carved',
      itemId: 'rolling_pin',
      nameRu: 'Скалка резная узорная «Цветочный орнамент» (дуб, 38 см)',
      price: 890,
      description: 'Дубовая скалка с глубокой лазерной резьбой: оставляет декоративный цветочный оттиск на пряниках, печенье и пирогах.',
      category: 'auto',
      effectText: 'Дуб · Резной оттиск на тесте',
      rollingPinAttributes: { modelId: 'textured_carved' }
    },

    // 9. ОХЛАЖДЁННОЕ ГОТОВОЕ ТЕСТО В УПАКОВКЕ
    {
      id: 'sup_dough_puff_yeast',
      itemId: 'vacuum_pack_medium',
      nameRu: 'Тесто слоёное дрожжевое (пласт 500г)',
      price: 145,
      description: 'Охлаждённый квадратный пласт слоёного дрожжевого теста на сливочном масле в вакуумном пакете — для круассанов, слоек и пирогов.',
      category: 'food',
      effectText: '500 г · Квадратный пласт, дрожжевое',
      labelColor: '#e11d48',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            doughType: 'puff_pastry',
            doughTypeRu: 'Слоёное дрожжевое тесто',
            shape: 'square_sheet',
            rolledPasses: 2,
            thicknessMm: 5.5,
            ingredients: [
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 255, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'water', nameRu: 'Вода', grams: 105, role: 'liquid', colorHex: '#f8fafc' },
              { itemId: 'butter_brick_salted', nameRu: 'Сливочное масло', grams: 105, role: 'fat', colorHex: '#fde047' },
              { itemId: 'sourdough', nameRu: 'Закваска / дрожжи', grams: 22, role: 'leavening', colorHex: '#efe6d0' },
              { itemId: 'sugar', nameRu: 'Сахар', grams: 12, role: 'sugar', colorHex: '#ffffff' },
              { itemId: 'salt', nameRu: 'Соль', grams: 4, role: 'salt', colorHex: '#f8fafc' }
            ]
          }
        }
      ]
    },
    {
      id: 'sup_dough_puff_plain',
      itemId: 'vacuum_pack_medium',
      nameRu: 'Тесто слоёное бездрожжевое (пласт 450г)',
      price: 135,
      description: 'Хрустящее слоёное бездрожжевое тесто на сливочном масле в вакуумной упаковке для наполеона, язычков и открытых тартов.',
      category: 'food',
      effectText: '450 г · Квадратный пласт, бездрожжевое',
      labelColor: '#0284c7',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            doughType: 'puff_pastry',
            doughTypeRu: 'Слоёное бездрожжевое тесто',
            shape: 'square_sheet',
            rolledPasses: 2,
            thicknessMm: 5.0,
            ingredients: [
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 230, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'butter_brick_salted', nameRu: 'Сливочное масло', grams: 125, role: 'fat', colorHex: '#fde047' },
              { itemId: 'water', nameRu: 'Вода', grams: 92, role: 'liquid', colorHex: '#f8fafc' },
              { itemId: 'salt', nameRu: 'Соль', grams: 4, role: 'salt', colorHex: '#f8fafc' }
            ]
          }
        }
      ]
    },
    {
      id: 'sup_dough_yeast_rich',
      itemId: 'vacuum_pack_medium',
      nameRu: 'Тесто сдобное дрожжевое для пирогов (500г)',
      price: 120,
      description: 'Мягкое сдобное тесто на молоке, яйцах и масле для домашних пирожков, булочек, рогаликов и ватрушек.',
      category: 'food',
      effectText: '500 г · Пышное сдобное для выпечки',
      labelColor: '#d97706',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            shape: 'lump',
            ingredients: [
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 265, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'milk', nameRu: 'Молоко', grams: 125, role: 'dairy', colorHex: '#fffbeb' },
              { itemId: 'egg_raw', nameRu: 'Куриное яйцо', grams: 50, role: 'egg', colorHex: '#f59e0b' },
              { itemId: 'butter_brick_salted', nameRu: 'Сливочное масло', grams: 35, role: 'fat', colorHex: '#fde047' },
              { itemId: 'sugar', nameRu: 'Сахар', grams: 38, role: 'sugar', colorHex: '#ffffff' },
              { itemId: 'sourdough', nameRu: 'Дрожжевая опара', grams: 30, role: 'leavening', colorHex: '#efe6d0' },
              { itemId: 'salt', nameRu: 'Соль', grams: 4, role: 'salt', colorHex: '#f8fafc' }
            ]
          }
        }
      ]
    },
    {
      id: 'sup_dough_pizza',
      itemId: 'tray_sealed_food',
      nameRu: 'Основа-тесто для пиццы на оливковом масле (350г)',
      price: 115,
      description: 'Тонко раскатанный круг дрожжевого теста с оливковым маслом Extra Virgin в запаянном лотке — выложите начинку и запекайте.',
      category: 'food',
      effectText: '350 г · Тонкий пласт Ø26 см',
      labelColor: '#16a34a',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            doughType: 'classic_soft',
            doughTypeRu: 'Дрожжевое тесто для пиццы',
            shape: 'sheet',
            rolledPasses: 2,
            thicknessMm: 4.0,
            ingredients: [
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 205, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'water', nameRu: 'Вода', grams: 118, role: 'liquid', colorHex: '#f8fafc' },
              { itemId: 'oil_olive', nameRu: 'Оливковое масло', grams: 20, role: 'fat', colorHex: '#a3e635' },
              { itemId: 'sourdough', nameRu: 'Закваска', grams: 18, role: 'leavening', colorHex: '#efe6d0' },
              { itemId: 'salt', nameRu: 'Соль', grams: 5, role: 'salt', colorHex: '#f8fafc' }
            ]
          }
        }
      ]
    },
    {
      id: 'sup_dough_shortcrust',
      itemId: 'paper_packaging',
      nameRu: 'Тесто песочное сливочное (брикет 400г)',
      price: 140,
      description: 'Золотистое рассыпчатое песочное тесто в пергаментной обёртке — для домашнего печенья, тартов и сладких коржей.',
      category: 'food',
      effectText: '400 г · Сладкое песочное',
      labelColor: '#f59e0b',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            doughType: 'shortcrust',
            doughTypeRu: 'Песочное сливочное тесто',
            shape: 'ball',
            ingredients: [
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 195, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'butter_brick_salted', nameRu: 'Сливочное масло', grams: 110, role: 'fat', colorHex: '#fde047' },
              { itemId: 'sugar', nameRu: 'Сахар', grams: 68, role: 'sugar', colorHex: '#ffffff' },
              { itemId: 'egg_raw', nameRu: 'Куриное яйцо', grams: 52, role: 'egg', colorHex: '#f59e0b' },
              { itemId: 'salt', nameRu: 'Соль', grams: 2, role: 'salt', colorHex: '#f8fafc' }
            ]
          }
        }
      ]
    },
    {
      id: 'sup_dough_chocolate',
      itemId: 'paper_packaging',
      nameRu: 'Тесто шоколадное с какао (брикет 400г)',
      price: 155,
      description: 'Ароматное тёмно-шоколадное тесто на сливочном масле и какао в пергаменте — для шоколадного печенья, брауни и рогаликов.',
      category: 'food',
      effectText: '400 г · Шоколадное сладкое',
      labelColor: '#78350f',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            shape: 'ball',
            ingredients: [
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 175, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'butter_brick_salted', nameRu: 'Сливочное масло', grams: 98, role: 'fat', colorHex: '#fde047' },
              { itemId: 'sugar', nameRu: 'Сахар', grams: 76, role: 'sugar', colorHex: '#ffffff' },
              { itemId: 'cocoa', nameRu: 'Какао-порошок', grams: 35, role: 'colorant', colorHex: '#4a2511' },
              { itemId: 'egg_raw', nameRu: 'Куриное яйцо', grams: 50, role: 'egg', colorHex: '#f59e0b' }
            ]
          }
        }
      ]
    },
    {
      id: 'sup_dough_dumpling',
      itemId: 'vacuum_pack_medium',
      nameRu: 'Тесто пельменно-вареничное крутое (500г)',
      price: 105,
      description: 'Плотный эластичный ком крутого теста на яйце в вакуумном пакете — для лепки пельменей, вареников, мантов и домашней лапши.',
      category: 'food',
      effectText: '500 г · Крутое, для варки и лапши',
      labelColor: '#475569',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            shape: 'lump',
            ingredients: [
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 320, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'water', nameRu: 'Вода', grams: 122, role: 'liquid', colorHex: '#f8fafc' },
              { itemId: 'egg_raw', nameRu: 'Куриное яйцо', grams: 52, role: 'egg', colorHex: '#f59e0b' },
              { itemId: 'salt', nameRu: 'Соль', grams: 6, role: 'salt', colorHex: '#f8fafc' }
            ]
          }
        }
      ]
    },
    {
      id: 'sup_dough_rye',
      itemId: 'vacuum_pack_medium',
      nameRu: 'Тесто ржано-пшеничное на закваске (550г)',
      price: 125,
      description: 'Тёмное ароматное хлебное тесто из обдирной ржаной и пшеничной муки на живой закваске в вакууме — готово к формовке и выпечке хлеба.',
      category: 'food',
      effectText: '550 г · Ржаное на закваске',
      labelColor: '#92400e',
      contents: [
        {
          itemId: 'dough',
          count: 1,
          doughAttributes: {
            shape: 'lump',
            ingredients: [
              { itemId: 'flour_rye', nameRu: 'Мука ржаная обдирная', grams: 190, role: 'flour', colorHex: '#a18262' },
              { itemId: 'flour_wheat', nameRu: 'Мука пшеничная', grams: 120, role: 'flour', colorHex: '#f6eedb' },
              { itemId: 'water', nameRu: 'Вода', grams: 185, role: 'liquid', colorHex: '#f8fafc' },
              { itemId: 'sourdough', nameRu: 'Ржаная закваска', grams: 52, role: 'leavening', colorHex: '#efe6d0' },
              { itemId: 'salt', nameRu: 'Соль', grams: 7, role: 'salt', colorHex: '#f8fafc' }
            ]
          }
        }
      ]
    }
  ],
  fast_food: [
    { id: 'ff_jalapeno', itemId: 'jalapeno_pickled', nameRu: 'Маринованный халапеньо в баночке (0.2L)', price: 45, description: 'Стеклянная баночка острых маринованных колечек халапеньо в уксусном маринаде.', category: 'food', effectText: '+10% Энергия, капсаицин' },
    { id: 'ff_apple_slices', itemId: 'apple_sliced', nameRu: 'Яблочные дольки в лотке (6 шт.)', price: 30, description: 'Пищевой лоток под пленкой со свежими хрустящими дольками яблока.', category: 'food', effectText: '+15% Сытость, витамины' },
    { id: 'ff_colazero', itemId: 'cola_zero', nameRu: 'Кола Зеро (0.33L)', price: 40, description: 'Алюминиевая баночка газированного напитка без сахара.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'ff_gummy_mini', itemId: 'gummy_pack_mini_bears', nameRu: 'Мармелад «Фруктовые мишки» (саше 12 шт., 30г)', price: 45, description: 'Карманный плоский саше-пакетик со сладкими жевательными мишками.', category: 'food', effectText: '30г · +12% Сытость, десерт' },
    { id: 'ff_gummy_cola', itemId: 'gummy_pack_flow_cola', nameRu: 'Мармелад «Шипучая Кола» (флоу-пак 16 шт., 80г)', price: 75, description: 'Пакет-подушечка с 16 кислыми мармеладными бутылочками колы.', category: 'food', effectText: '80г · +32% Сытость, +40% Энергия' },
    { id: 'ff_gummy_citrus', itemId: 'gummy_pack_flow_citrus_stars', nameRu: 'Мармелад «Цитрусовый микс» (флоу-пак 24 шт., 84г)', price: 85, description: 'Кисло-сладкие мармеладные звёздочки в цитрусовой сахарной посыпке.', category: 'food', effectText: '84г · +34% Сытость, бодрость' },
    { id: 'ff_gummy_soda', itemId: 'gummy_pack_euro_soda_bottles', nameRu: 'Мармелад «Лимонадный бар» (евро-пакет 26 шт., 130г)', price: 115, description: 'Евро-пакет шипучих бутылочек: тархун, крем-сода, апельсин и кола-лайм.', category: 'food', effectText: '130г · +52% Сытость, +65% Энергия' },
    { id: 'ff_choc_caramel', itemId: 'choc_bar_caramel_chunky', nameRu: 'Батончик «Солёная карамель и арахис» (флоу-пак, 45г)', price: 70, description: 'Узкий флоу-пак с шоколадным батончиком, тягучей карамелью и арахисом.', category: 'food', effectText: '45г · +12% Сытость, +14% Энергия' },
    { id: 'ff_choc_wafer', itemId: 'choc_bar_wafer_crispy', nameRu: 'Вафельные палочки в шоколаде (флоу-пак, 2 шт.)', price: 62, description: 'Хрустящие вафельно-шоколадные палочки с прослойкой пралине.', category: 'food', effectText: '24г · Вафля и пралине' }
  ],
  pizzeria: [
    { id: 'piz_sundried', itemId: 'sun_dried_tomatoes', nameRu: 'Вяленые томаты в баночке (0.2L)', price: 95, description: 'Стеклянная баночка итальянских вяленых томатов в оливковом масле с травами.', category: 'food', effectText: '+22% Сытость, умами' },
    { id: 'piz_cherry', itemId: 'tomato_cherry_bunch', nameRu: 'Томаты черри свежие (ветка)', price: 50, description: 'Сладкие маленькие томаты черри на ветке.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'piz_jalapeno', itemId: 'jalapeno_pickled', nameRu: 'Острый халапеньо в баночке (0.2L)', price: 45, description: 'Стеклянная баночка маринованного перца халапеньо колечками.', category: 'food', effectText: '+10% Энергия, острота' },
    { id: 'piz_grape_cup', itemId: 'grapes_berries', nameRu: 'Виноградный десерт в лотке', price: 50, description: 'Пищевой лоток под пленкой со сладкими гроздьями винограда.', category: 'food', effectText: '+15% Сытость, сок' },
    { id: 'piz_gummy_tropical', itemId: 'gummy_pack_euro_tropical_cubes', nameRu: 'Мармелад «Тропические кубики» (евро-пакет 28 шт., 140г)', price: 125, description: 'Мармеладные кубики манго-маракуйя, гуава и личи на натуральном пектине.', category: 'food', effectText: '140г · +56% Сытость, десерт' },
    { id: 'piz_gummy_berries', itemId: 'gummy_pack_doypack_berries', nameRu: 'Мармелад «Лесные ягоды и сердца» (дой-пак 48 шт., 176г)', price: 155, description: 'Стоячий дой-пак с натуральным ягодным мармеладом на десерт.', category: 'food', effectText: '176г · +70% Сытость, десерт' },
    { id: 'piz_juice', itemId: 'fresh_juice', nameRu: 'Сок / Фруктовый морс (Тетрапак 1.0L)', price: 40, description: 'Тетрапак освежающего сока и ягодного морса.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'piz_colazero', itemId: 'cola_zero', nameRu: 'Банка Колы (0.33L)', price: 40, description: 'Алюминиевая баночка сильногазированной колы из холодильника.', category: 'food', effectText: '+28% Гидратация' }
  ],
  sushi_asian: [
    { id: 'sush_soy_sauce', itemId: 'soy_sauce_classic', nameRu: 'Соевый соус в бутылочке (0.25L)', price: 65, description: 'Граненая стеклянная бутылочка классического соевого соуса естественного брожения.', category: 'food', effectText: 'Соус / Умами' },
    { id: 'sush_teriyaki', itemId: 'sauce_teriyaki', nameRu: 'Соус Терияки густой в бутылочке (0.25L)', price: 85, description: 'Стеклянная бутылочка густого карамельно-соевого соуса Терияки с имбирем.', category: 'food', effectText: 'Глазировка & WOK' },
    { id: 'sush_miso_paste', itemId: 'miso_paste', nameRu: 'Мисо-паста ферментированная в банке (0.2L)', price: 110, description: 'Стеклянная баночка густой соевой пасты Ака-мисо для мисо-супа и бульонов.', category: 'food', effectText: 'Основа мисо-супа' },
    { id: 'sush_rice_vinegar', itemId: 'vinegar_rice', nameRu: 'Рисовый уксус Мицукан в бутылке (0.5L)', price: 90, description: 'Стеклянная бутылка мягкого японского рисового уксуса для заправки риса суши.', category: 'food', effectText: 'Для риса и маринадов' },
    { id: 'sush_sesame_oil', itemId: 'oil_sesame', nameRu: 'Кунжутное масло темное (0.25L)', price: 140, description: 'Стеклянная бутылочка ароматного масла из обжаренного кунжута.', category: 'food', effectText: 'Азиатская заправка' },
    { id: 'sush_rice_bag', itemId: 'rice_white', nameRu: 'Рис круглозёрный для суши (пачка ~820г)', price: 95, description: 'Пачка клейкого белого японского риса Косихикари для суши и роллов.', category: 'food', effectText: 'Крупа · Для суши' },
    { id: 'sush_soba_pack', itemId: 'pasta_soba_buckwheat', nameRu: 'Лапша гречневая Соба японская (~450г)', price: 130, description: 'Удлинённая пачка тонкой гречневой лапши Соба (65% гречки) для вока и супов.', category: 'food', effectText: 'Лапша · 65% гречки' },
    { id: 'sush_ginger', itemId: 'ginger_pickled', nameRu: 'Маринованный имбирь Гари в баночке (0.2L)', price: 35, description: 'Стеклянная баночка розовых лепестков маринованного имбиря в рисовом уксусе.', category: 'food', effectText: '+8% Сытость, свежесть' },
    { id: 'sush_shiitake', itemId: 'shiitake_fresh', nameRu: 'Грибы Шиитаке свежие (лоток 5 шт.)', price: 50, description: 'Пищевой лоток под пленкой с ароматными грибами шиитаке.', category: 'food', effectText: '+10% Сытость' },
    { id: 'sush_enoki', itemId: 'enoki_mushroom_bunch', nameRu: 'Грибы Эноки в лотке (2 пучка)', price: 60, description: 'Пищевой лоток под пленкой с пучками хрустящих грибов эноки.', category: 'food', effectText: '+12% Сытость' },
    { id: 'sush_cucumber_sliced', itemId: 'cucumber_sliced', nameRu: 'Огуречная нарезка в лотке (6 шт.)', price: 25, description: 'Пищевой лоток под пленкой со свежими ломтиками огурца.', category: 'food', effectText: '+15% Гидратация' },
    { id: 'sush_gummy_citrus', itemId: 'gummy_pack_flow_citrus_stars', nameRu: 'Мармелад «Цитрусовый микс Юзу» (флоу-пак 24 шт., 84г)', price: 90, description: 'Японский цитрус юзу, грейпфрут и лайм в виде мармеладных звёздочек.', category: 'food', effectText: '84г · Юзу, десерт' },
    { id: 'sush_gummy_tropical', itemId: 'gummy_pack_euro_tropical_cubes', nameRu: 'Мармелад «Тропические кубики» (евро-пакет 28 шт., 140г)', price: 130, description: 'Экзотический мармелад на агар-агаре: манго, личи, драгонфрут и кокос.', category: 'food', effectText: '140г · Личи и манго' },
    { id: 'sush_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча в стаканчике (0.25L)', price: 40, description: 'Бумажный стаканчик горячего заваренного зеленого чая.', category: 'food', effectText: '+35% Гидратация, +5 HP' }
  ],
  cinema_bar: [
    { id: 'cin_popcorn', itemId: 'popcorn_caramel', nameRu: 'Карамельный попкорн в боксе (6 горстей)', price: 70, description: 'Высокий картонный бокс хрустящего попкорна в сладкой карамели.', category: 'food', effectText: '+25% Сытость, +18% Энергия' },
    { id: 'cin_nachos', itemId: 'nachos', nameRu: 'Чипсы Начос в дой-паке (8 шт.)', price: 80, description: 'Герметичный пакет кукурузных треугольных чипсов начос.', category: 'food', effectText: '+32% Сытость, +15% Энергия' },
    { id: 'cin_watermelon_cup', itemId: 'watermelon_diced', nameRu: 'Ломтики арбуза в лотке (4 шт.)', price: 50, description: 'Пищевой лоток под пленкой со сладкими кусочками арбуза.', category: 'food', effectText: '+45% Гидратация' },
    { id: 'cin_melon_cup', itemId: 'melon_diced', nameRu: 'Ломтики дыни в лотке (4 шт.)', price: 60, description: 'Пищевой лоток под пленкой с медовыми ломтиками дыни.', category: 'food', effectText: '+20% Сытость, +25% Гидратация' },
    { id: 'cin_grape_cup', itemId: 'grapes_berries', nameRu: 'Виноград в лотке под пленкой', price: 50, description: 'Пищевой лоток с гроздьями сладкого винограда без косточек.', category: 'food', effectText: '+15% Сытость, +15% Гидратация' },
    { id: 'cin_pomegranate_cup', itemId: 'pomegranate_seeds', nameRu: 'Спелый гранат в лотке (2 шт.)', price: 65, description: 'Пищевой лоток под пленкой со спелыми рубиновыми гранатами.', category: 'food', effectText: '+15% Сытость, витамины' },
    { id: 'cin_colazero', itemId: 'cola_zero', nameRu: 'Баночка Колы (0.33L)', price: 45, description: 'Алюминиевая банка ледяного газированного напитка.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'cin_gummy_gold', itemId: 'gummy_pack_flow_bears_gold', nameRu: 'Мармелад «Золотые мишки» (флоу-пак 28 шт., 70г)', price: 75, description: '28 классических фруктовых мишек на весь сеанс кино.', category: 'food', effectText: '70г · +28% Сытость' },
    { id: 'cin_gummy_cola', itemId: 'gummy_pack_flow_cola', nameRu: 'Мармелад «Шипучая Кола» (флоу-пак 16 шт., 80г)', price: 80, description: '16 бутылочек колы в шипучей кислой посыпке в пакете-подушечке.', category: 'food', effectText: '80г · +32% Сытость, +40% Энергия' },
    { id: 'cin_gummy_soda', itemId: 'gummy_pack_euro_soda_bottles', nameRu: 'Мармелад «Лимонадный бар» (евро-пакет 26 шт., 130г)', price: 120, description: '26 мармеладных бутылочек со вкусом лимонадов и крем-соды.', category: 'food', effectText: '130г · +52% Сытость' },
    { id: 'cin_gummy_worms', itemId: 'gummy_pack_euro_worms', nameRu: 'Мармелад «Кислые червячки» (евро-пакет 22 шт., 132г)', price: 120, description: '22 разноцветных кислых жевательных червячка на сеанс кино.', category: 'food', effectText: '132г · +53% Сытость, +62% Энергия' },
    { id: 'cin_gummy_sour_mix', itemId: 'gummy_pack_doypack_sour_mix', nameRu: 'Мармелад «Ультра-кислый микс» (дой-пак 40 шт., 195г)', price: 175, description: 'Большой стоячий дой-пак с кислым ассорти на 40 штук.', category: 'food', effectText: '195г · +78% Сытость, зип-лок' },
    { id: 'cin_gummy_rings', itemId: 'gummy_pack_doypack_rings', nameRu: 'Мармелад «Фруктовые колечки» (дой-пак 28 шт., 196г)', price: 170, description: 'Удобный дой-пак с зип-локом и 28 мягкими фруктовыми колечками.', category: 'food', effectText: '196г · +78% Сытость, зип-лок' },
    { id: 'cin_gummy_orchard', itemId: 'gummy_pack_large_berry_orchard', nameRu: 'Мармелад «Ягодно-фруктовый сад» (пакет 100 шт., 400г)', price: 320, description: 'Огромный пакет ягодно-фруктового мармелада на пектине для компании.', category: 'food', effectText: '400г · На компанию' },
    { id: 'cin_gummy_party', itemId: 'gummy_pack_large_party', nameRu: 'Мармелад «Мега-Ассорти» (пакет 96 шт., 438г)', price: 340, description: 'Большой объёмный пакет с фальцами: ассорти из 96 мармеладок.', category: 'food', effectText: '438г · Для компании' },
    { id: 'cin_choc_caramel', itemId: 'choc_bar_caramel_chunky', nameRu: 'Батончик «Солёная карамель и арахис» (флоу-пак, 45г)', price: 75, description: 'Хрустящий батончик с солёной карамелью к сеансу кино.', category: 'food', effectText: '45г · +12% Сытость' },
    { id: 'cin_choc_dubai', itemId: 'choc_foil_dubai_pistachio', nameRu: 'Шоколад «Дубайский фисташковый катаифи» (95г)', price: 260, description: 'Хрустящая плитка с фисташковой начинкой и нитями катаифи.', category: 'food', effectText: '95г · Фисташка и катаифи' },
    { id: 'cin_choc_prism', itemId: 'choc_prism_honey_nougat', nameRu: 'Шоколад-призма «Альпийский пик с нугой» (180г)', price: 240, description: 'Треугольная призма швейцарского молочного шоколада с мёдом и миндалём.', category: 'food', effectText: '180г · +42% Сытость' }
  ],
  electronics: [
    { id: 'elec_phone_nova15', itemId: 'phone', phonePresetId: 'phone_nova15', nameRu: 'Телефон Nova 15 Ultra (Флагман)', price: 120000, description: 'Флагманский смартфон с 6.8" 120Hz LTPO AMOLED, 200MP оптикой и титановым корпусом.', category: 'auto', effectText: 'Флагман · 200MP · 512 ГБ' },
    { id: 'elec_phone_pixel', itemId: 'phone', phonePresetId: 'phone_pixel', nameRu: 'Телефон Pixel Horizon 9', price: 89000, description: 'Умный камерофон с чистой системой и продвинутым ночным режимом.', category: 'auto', effectText: 'Камерофон · 120Hz · 256 ГБ' },
    { id: 'elec_phone_fold', itemId: 'phone', phonePresetId: 'phone_fold', nameRu: 'Телефон CyberFold Neo (Складной)', price: 145000, description: 'Складной смартфон с гибким дисплеем 7.6" и титановым шарниром.', category: 'auto', effectText: 'Складной 7.6" · 1 ТБ' },
    { id: 'elec_phone_nord', itemId: 'phone', phonePresetId: 'phone_nord', nameRu: 'Телефон Nord Lite 5G', price: 38000, description: 'Доступный смартфон с 90 Гц дисплеем и тройной камерой.', category: 'auto', effectText: 'Смартфон · 5G · 128 ГБ' },
    { id: 'elec_phone_retro', itemId: 'phone', phonePresetId: 'phone_retro', nameRu: 'Телефон Matrix Classic (Кнопочный)', price: 3500, description: 'Ударопрочный кнопочный телефон с фонариком и недельной батареей.', category: 'auto', effectText: 'Кнопочный · Связь и SMS' },
    { id: 'elec_hw_display', itemId: 'hw_display', nameRu: 'Дисплей LTPO OLED 6.7"', price: 18500, description: 'Сменный безрамочный дисплейный модуль с закалённым стеклом и шлейфом MIPI DSI.', category: 'auto', effectText: 'Комплектующее · 120 Гц' },
    { id: 'elec_hw_cpu', itemId: 'hw_cpu', nameRu: 'Процессор SoC Bionic A18 Pro', price: 24000, description: 'Мобильная однокристальная система (3 нм, 6 ядер) под пайку BGA.', category: 'auto', effectText: 'Комплектующее · 3.8 ГГц' },
    { id: 'elec_hw_ram', itemId: 'hw_ram', nameRu: 'Оперативная память LPDDR5X 12 ГБ', price: 6200, description: 'Высокоскоростной чип оперативной памяти LPDDR5X 8533 МТ/с (PoP BGA).', category: 'auto', effectText: 'Комплектующее · 12 ГБ' },
    { id: 'elec_hw_ssd', itemId: 'hw_ssd', nameRu: 'SSD-накопитель UFS 4.0 512 ГБ', price: 7800, description: 'Твердотельный флеш-накопитель 3D TLC NAND со скоростью чтения до 4200 МБ/с.', category: 'auto', effectText: 'Комплектующее · 512 ГБ' },
    { id: 'elec_hw_hdd', itemId: 'hw_hdd', nameRu: 'Жёсткий диск HDD 2.5" 2 ТБ', price: 6900, description: 'Классический магнитный накопитель формата 2.5" с интерфейсом SATA III.', category: 'auto', effectText: 'Комплектующее · 2 ТБ SATA' },
    { id: 'elec_hw_battery', itemId: 'hw_battery', nameRu: 'Аккумулятор Li-Ion 4680 мАч', price: 3400, description: 'Литий-ионная полимерная батарея с контроллером BMS и шлейфом FPC.', category: 'auto', effectText: 'Комплектующее · 4680 мАч' },
    { id: 'elec_hw_motherboard', itemId: 'hw_motherboard', nameRu: 'Системная плата HDI (10 слоёв)', price: 14500, description: 'Многослойная печатная плата с экранированными коннекторами B2B.', category: 'auto', effectText: 'Комплектующее · Плата' },
    { id: 'elec_hw_camera', itemId: 'hw_camera', nameRu: 'Модуль камеры 48 МП OIS', price: 9600, description: 'Оптический блок камер со стеклянной линзой, CMOS-матрицей и OIS.', category: 'auto', effectText: 'Комплектующее · 48 МП' },
    { id: 'elec_hw_modem', itemId: 'hw_modem', nameRu: 'Модем 5G / Wi-Fi 7 / GNSS', price: 5400, description: 'Интегрированный радиомодуль сотовой связи, Wi-Fi и спутниковой навигации.', category: 'auto', effectText: 'Комплектующее · 5G' },
    { id: 'elec_hw_speaker', itemId: 'hw_speaker', nameRu: 'Динамик и вибромотор Taptic', price: 2100, description: 'Акустический стереодинамик с линейным виброприводом X-Axis.', category: 'auto', effectText: 'Комплектующее · Аудио' },
    { id: 'elec_hw_charging_port', itemId: 'hw_charging_port', nameRu: 'Разъём питания USB-C 3.2', price: 1400, description: 'Субплата с портом USB-C (PD 65 Вт), микрофоном и резиновым уплотнителем.', category: 'auto', effectText: 'Комплектующее · USB-C' },
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
    { id: 'pha_panthenol', itemId: 'panthenol', nameRu: 'Спрей Пантенол от ожогов', price: 450, description: 'Алюминиевый баллончик с пеной для заживления повреждений эпидермиса.', category: 'medical', effectText: 'Заживление ожогов 1-3 ст.' },
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
    { id: 'pha_drops', itemId: 'eye_drops', nameRu: 'Глазные капли', price: 50, description: 'Флакон-капельница со стерильным успокаивающим раствором.', category: 'medical', effectText: '+10% Энергия' },
    { id: 'pha_menthol_tin', itemId: 'menthol_crystals', nameRu: 'Кристаллы натурального ментола (шайба 30мл)', price: 115, description: 'Чистые игольчатые кристаллы L-ментола в жестяной шайбе для ингаляций и кулинарии.', category: 'medical', effectText: '+8% Бодрость, свежесть' },
    { id: 'pha_eucalyptus_ext', itemId: 'extract_eucalyptus', nameRu: 'Экстракт листьев эвкалипта (100мл)', price: 135, description: 'Концентрированная вытяжка эвкалипта с цинеолом для дыхания и леденцов.', category: 'medical', effectText: '+4 HP, +4% Энергия' },
    { id: 'pha_peppermint_oil', itemId: 'oil_peppermint', nameRu: 'Эфирное масло перечной мяты (50мл)', price: 145, description: '100% натуральное пищевое и аптечное масло перечной мяты в капельном флаконе.', category: 'medical', effectText: 'Эфирное масло' }
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
    { id: 'caf_cappuccino', itemId: 'cappuccino', nameRu: 'Сливочный Cappuccino (0.25L)', price: 65, description: 'Бумажный стакан с плотной бархатистой молочной пенкой.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'caf_espresso', itemId: 'coffee', nameRu: 'Горячий Espresso (0.25L)', price: 50, description: 'Крепчайший согревающий бодрящий напиток в стаканчике.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'caf_mint_tea', itemId: 'tea', nameRu: 'Горячий чай с мятой и лимоном (0.25L)', price: 45, description: 'Бумажный стаканчик ароматного горячего чая.', category: 'food', effectText: '+35% Гидратация, снятие стресса' },
    { id: 'caf_tea', itemId: 'tea_green', nameRu: 'Зеленый листовой чай Сенча (0.25L)', price: 40, description: 'Бумажный стаканчик китайского зеленого чая с жасмином.', category: 'food', effectText: '+35% Гидратация' },
    { id: 'caf_apple_puree', itemId: 'apple_puree', nameRu: 'Яблочное пюре «Неженка» в баночке (0.2L)', price: 55, description: 'Нежнейшее натуральное яблочное пюре в стеклянной баночке.', category: 'food', effectText: '+20% Сытость, сладость' },
    { id: 'caf_melon_slice', itemId: 'melon_slice', nameRu: 'Летний ломоть дыни Канталупа', price: 50, description: 'Нарезанный сочный охлажденный ломоть сладкой дыни.', category: 'food', effectText: '+22% Сытость, +25% Гидратация' },
    { id: 'caf_watermelon_cup', itemId: 'watermelon_diced', nameRu: 'Ломтики арбуза в лотке (4 шт.)', price: 45, description: 'Пищевой лоток под пленкой с сочными ломтиками арбуза.', category: 'food', effectText: '+45% Гидратация' },
    { id: 'caf_berries_tray', itemId: 'berries_fresh', nameRu: 'Свежая клубника в лотке (8 шт.)', price: 120, description: 'Пищевой лоток под пленкой с отборными ягодами к кофе.', category: 'food', effectText: '+20% Сытость, витамины' },
    { id: 'caf_kiwi_slice', itemId: 'kiwi_sliced', nameRu: 'Нарезка киви в лотке (6 кружков)', price: 35, description: 'Пищевой лоток под пленкой с изумрудными кружочками спелого киви.', category: 'food', effectText: '+10% Сытость, витамин C' },
    { id: 'caf_gummy_mini', itemId: 'gummy_pack_mini_bears', nameRu: 'Мармелад «Фруктовые мишки» (саше 12 шт., 30г)', price: 45, description: 'Сладкие мармеладные мишки в плоском мини-саше к чаю или кофе.', category: 'food', effectText: '30г · +12% Сытость, к чаю' },
    { id: 'caf_gummy_mint', itemId: 'gummy_pack_mini_mint_hearts', nameRu: 'Мармелад «Мята и Эвкалипт» (саше 10 шт., 40г)', price: 55, description: 'Нежные мармеладные сердечки с перечной мятой, лаймом и липовым мёдом.', category: 'food', effectText: '40г · Освежающий' },
    { id: 'caf_gummy_tropical', itemId: 'gummy_pack_euro_tropical_cubes', nameRu: 'Мармелад «Тропические кубики» (евро-пакет 28 шт., 140г)', price: 125, description: 'Нежные желейные кубики манго-маракуйя и гуавы на натуральном пектине.', category: 'food', effectText: '140г · На пектине' },
    { id: 'caf_gummy_berries', itemId: 'gummy_pack_doypack_berries', nameRu: 'Мармелад «Лесные ягоды и сердца» (дой-пак 48 шт., 176г)', price: 155, description: 'Натуральный ягодный мармелад на пектине и агар-агаре в дой-паке.', category: 'food', effectText: '176г · +70% Сытость, ягодный' },
    { id: 'caf_choc_truffle', itemId: 'choc_mini_truffle_hazelnut', nameRu: 'Конфета «Золотой трюфель» к кофе (12г)', price: 35, description: 'Купольный трюфель из тёмного шоколада 64% с фундучным пралине в мини-обёртке.', category: 'food', effectText: '12г · К эспрессо' },
    { id: 'caf_choc_ruby', itemId: 'choc_mini_ruby_heart', nameRu: 'Сердечко «Рубиновая малина» (12г)', price: 38, description: 'Шоколад Ruby с нежным малиновым муссом в мини-обёртке.', category: 'food', effectText: '12г · К чаю' },
    { id: 'caf_choc_dark85', itemId: 'choc_foil_dark_bitter_85', nameRu: 'Шоколад горький 85% «Эквадор» (95г)', price: 145, description: 'Элитная плитка горького шоколада с какао-крупкой к капучино или эспрессо.', category: 'food', effectText: '95г · 85% какао' },
    { id: 'caf_choc_mint_sq', itemId: 'choc_square_mint_fondant', nameRu: 'Шоколад квадратный «Мятная прохлада» (95г)', price: 120, description: 'Тёмный шоколад с охлаждающей мятной помадной начинкой.', category: 'food', effectText: '95г · Мятная помадка' },
    { id: 'caf_choc_matcha', itemId: 'choc_king_matcha_yuzu', nameRu: 'Ремесленный шоколад XXL «Матча Удзи и Юзу» (180г)', price: 310, description: 'Авторская плитка белого шоколада с японским чаем Матча и начинкой юзу.', category: 'food', effectText: '180г · Матча + Юзу' },
    { id: 'caf_soup', itemId: 'soup', nameRu: 'Горячий бульон в суповой пиале (0.5L)', price: 110, description: 'Глубокая суповая пиала согревающего наваристого бульона.', category: 'food', effectText: '+45% Сытость, +8°C Тепло' }
  ],
  gear_shop: [
    { id: 'gea_gummy_mint', itemId: 'gummy_pack_mini_mint_hearts', nameRu: 'Мармелад «Мята и Эвкалипт» (саше 10 шт., 40г)', price: 55, description: 'Компактный герметичный саше с мятой, эвкалиптом и мёдом в карман рюкзака.', category: 'food', effectText: '40г · Энергия в пути' },
    { id: 'gea_gummy_bears_xl', itemId: 'gummy_pack_doypack_bears_xl', nameRu: 'Мармелад «Медвежья семья» (дой-пак 80 шт., 200г)', price: 165, description: 'Герметичный зип-лок дой-пак: 200г быстрых углеводов для похода и вылазок.', category: 'food', effectText: '200г · +80% Сытость, +96% Энергия' },
    { id: 'gea_choc_caramel', itemId: 'choc_bar_caramel_chunky', nameRu: 'Батончик «Солёная карамель и арахис» (флоу-пак, 45г)', price: 68, description: 'Компактный высококалорийный батончик в герметичном флоу-паке для перекуса в дороге.', category: 'food', effectText: '45г · Энергия в пути' },
    { id: 'gea_choc_dark85', itemId: 'choc_foil_dark_bitter_85', nameRu: 'Шоколад горький 85% «Эквадор» (95г)', price: 140, description: 'Не тающий в рюкзаке горький шоколад 85% — классический походный энергетик.', category: 'food', effectText: '95г · 85% какао, рацион' },
    { id: 'gea_choc_king_nut', itemId: 'choc_king_whole_hazelnut', nameRu: 'Шоколад XXL «Цельный лесной орех» (крафт, 300г)', price: 330, description: 'Питательная большая плитка 300г с цельным фундуком в плотном крафт-конверте.', category: 'food', effectText: '300г · +68% Сытость' },
    { id: 'gea_lukoshko', itemId: 'lukoshko', nameRu: 'Плетёное берестяное лукошко (2.0L)', price: 90, description: 'Легкая плетеная корзинка с ручкой для сбора лесных ягод и грибов.', category: 'food', effectText: 'Тара для сбора ягод/грибов' },
    { id: 'gea_blueberry_basket', itemId: 'berries_blueberry', nameRu: 'Лукошко лесной черники (1.5L)', price: 180, description: 'Свежесобранная спелая черника в берестяном лукошке.', category: 'food', effectText: '+35% Сытость, витамины' },
    { id: 'gea_blackberry_basket', itemId: 'berries_blackberry', nameRu: 'Лукошко лесной ежевики (1.5L)', price: 195, description: 'Спелая глянцевая ежевика в берестяном лукошке.', category: 'food', effectText: '14 ягод, витамины' },
    { id: 'gea_sea_buckthorn_basket', itemId: 'berries_sea_buckthorn', nameRu: 'Лукошко золотой облепихи (1.5L)', price: 185, description: 'Янтарная таёжная облепиха в берестяном лукошке.', category: 'food', effectText: '15 ягод, витамин C' },
    { id: 'gea_elderberry_basket', itemId: 'berries_elderberry', nameRu: 'Лукошко чёрной бузины (1.5L)', price: 175, description: 'Грозди спелой чёрной бузины в плетёном лукошке.', category: 'food', effectText: '15 ягод, здоровье' },
    { id: 'gea_chanterelle_basket', itemId: 'mushrooms_chanterelle', nameRu: 'Лукошко свежих лисичек (1.5L)', price: 210, description: 'Отборные рыжие лесные лисички в плетёном лукошке.', category: 'food', effectText: 'Свежие лесные грибы' },
    { id: 'gea_wild_honey', itemId: 'honey_wild', nameRu: 'Дикий таёжный мёд (0.35L)', price: 240, description: 'Баночка концентрированного темного таежного бортевого меда.', category: 'food', effectText: '+50% Сытость, иммунитет' },
    { id: 'gea_thermos', itemId: 'thermos', nameRu: 'Походный термос с чаем (1.0L)', price: 260, description: 'Вакуумный термос из нержавеющей стали с горячим чаем.', category: 'food', effectText: '+50% Гидратация, +8°C Тепло' },
    {
      id: 'gea_soup_bowl',
      itemId: 'bowl',
      nameRu: 'Миска',
      price: 60,
      description: 'Походная глубокая эмалированная миска для горячих супов и бульонов.',
      category: 'food',
      effectText: '0.5 л · Эмаль',
      kitchenwareAttributes: {
        kind: 'bowl',
        material: 'enamel_steel',
        materialRu: 'Эмалированная сталь',
        coatingRu: 'Белая стеклоэмаль',
        capacityMl: 500,
        dimensionCm: 16,
        shape: 'deep_round',
        shapeNameRu: 'Глубокая походная',
        color: '#f8fafc',
        colorNameRu: 'Белый с синим ободком',
        accentColor: '#1d4ed8',
        pattern: 'blue_rim',
        patternNameRu: 'Синяя кайма по краю',
        patternColor: '#1d4ed8',
        featureRu: 'Устойчива к костру и походным условиям'
      }
    },
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
    { id: 'furn_item_chair', itemId: 'furn_chair', nameRu: 'Деревянный стул со спинкой', price: 1800, description: 'Удобный деревянный стул. Устанавливается в собственной квартире.', category: 'auto', effectText: 'Мебель / Интерьер' },
    { id: 'furn_item_table', itemId: 'furn_table', nameRu: 'Обеденный стол', price: 4500, description: 'Деревянный обеденный стол для кухни или гостиной.', category: 'auto', effectText: 'Мебель / Интерьер' },
    { id: 'furn_item_sofa', itemId: 'furn_sofa', nameRu: 'Мягкий диван-кровать', price: 16500, description: 'Уютный двухместный мягкий диван для гостиной и отдыха.', category: 'auto', effectText: 'Мебель / Отдых' },
    { id: 'furn_item_bed', itemId: 'furn_bed', nameRu: 'Двуспальная кровать с матрасом', price: 24000, description: 'Комфортная кровать с ортопедическим матрасом.', category: 'auto', effectText: 'Мебель / Сон и отдых' },
    { id: 'furn_item_fridge', itemId: 'furn_fridge', nameRu: 'Двухкамерный холодильник', price: 32000, description: 'Вместительный бытовой холодильник для хранения продуктов.', category: 'auto', effectText: 'Мебель / Хранилище' },
    { id: 'furn_item_tv', itemId: 'furn_tv', nameRu: 'ЖК-Телевизор 55" 4K', price: 42000, description: 'Большая настенная/напольная плазменная панель.', category: 'auto', effectText: 'Мебель / Техника' },
    { id: 'furn_item_shelf', itemId: 'furn_shelf', nameRu: 'Книжный стеллаж', price: 6500, description: 'Вместительный открытый стеллаж для вещей и книг.', category: 'auto', effectText: 'Мебель / Хранилище' },
    { id: 'furn_item_plant', itemId: 'furn_plant', nameRu: 'Комнатный фикус в горшке', price: 1200, description: 'Декоративное комнатное растение для уюта.', category: 'auto', effectText: 'Декор / Уют' },
    {
      id: 'furn_rolling_pin_classic',
      itemId: 'rolling_pin',
      nameRu: 'Скалка классическая из бука (44 см)',
      price: 390,
      description: 'Классическая деревянная скалка с вращающимися ручками для домашней кухни.',
      category: 'auto',
      effectText: 'Кухня · Бук 44 см',
      rollingPinAttributes: { modelId: 'classic_handles' }
    },
    {
      id: 'furn_rolling_pin_french',
      itemId: 'rolling_pin',
      nameRu: 'Скалка французская из ореха (48 см)',
      price: 540,
      description: 'Конусная скалка ручной полировки из массива тёмного ореха.',
      category: 'auto',
      effectText: 'Кухня · Орех 48 см',
      rollingPinAttributes: { modelId: 'french_tapered' }
    },
    {
      id: 'furn_rolling_pin_marble',
      itemId: 'rolling_pin',
      nameRu: 'Скалка кондитерская мраморная (46 см)',
      price: 1150,
      description: 'Тяжёлая скалка из натурального белого мрамора на подшипниках.',
      category: 'auto',
      effectText: 'Кухня · Мрамор ×1.32',
      rollingPinAttributes: { modelId: 'marble_heavy' }
    },
    {
      id: 'furn_rolling_pin_silicone',
      itemId: 'rolling_pin',
      nameRu: 'Скалка силиконовая с кольцами толщины (42 см)',
      price: 680,
      description: 'Антипригарная скалка с регулировочными кольцами для ровных коржей.',
      category: 'auto',
      effectText: 'Кухня · Силикон 42 см',
      rollingPinAttributes: { modelId: 'silicone_nonstick' }
    },
    {
      id: 'furn_rolling_pin_carved',
      itemId: 'rolling_pin',
      nameRu: 'Скалка резная узорная (дуб, 38 см)',
      price: 890,
      description: 'Дубовая скалка с рельефным цветочным орнаментом для оттиска на тесте.',
      category: 'auto',
      effectText: 'Кухня · Оттиск узора',
      rollingPinAttributes: { modelId: 'textured_carved' }
    }
  ]
};

function normalizeShopEntry(entry: MapShopCatalogEntry, priceMultiplier: number = 1): ShopItem | null {
  if (!entry || !entry.itemId) return null;
  const hasExplicitComposite = Boolean((entry.contents && entry.contents.length > 0) || entry.fluidStorage);
  if (!hasExplicitComposite && !isRegisteredItemId(entry.itemId)) return null;
  if (hasExplicitComposite && !ITEM_CATALOG[entry.itemId]) return null;

  const catDef = ITEM_CATALOG[entry.itemId];
  const innerId = entry.contents?.[0]?.itemId;
  const innerDef = innerId ? ITEM_CATALOG[innerId] : undefined;
  const adjustedPrice = priceMultiplier !== 1
    ? Math.max(1, Math.round(entry.price * priceMultiplier))
    : entry.price;

  let autoEffect = entry.effectText || '';
  if (!autoEffect) {
    if (entry.contents && entry.contents.length > 0) {
      const totalInner = entry.contents.reduce((acc, c) => acc + Math.max(1, c.count ?? 1), 0);
      autoEffect = innerDef
        ? `${innerDef.nameRu}${totalInner > 1 ? ` (${totalInner} шт.)` : ''}`
        : formatItemEffectSummary(entry.originalCatalogId || entry.itemId);
    } else if (entry.fluidStorage?.liquidId && LIQUID_REGISTRY[entry.fluidStorage.liquidId as LiquidId]) {
      const liq = LIQUID_REGISTRY[entry.fluidStorage.liquidId as LiquidId];
      const unit = isFluidStorageDryForm(entry.fluidStorage) ? 'г' : 'мл';
      autoEffect = `${liq.nameRu} (${entry.fluidStorage.currentMl} ${unit})`;
    } else {
      autoEffect = formatItemEffectSummary(entry.originalCatalogId || entry.itemId);
    }
  }

  return {
    ...entry,
    price: adjustedPrice,
    nameRu: entry.nameRu || catDef?.nameRu || entry.itemId,
    description: entry.description || catDef?.descriptionRu || '',
    effectText: autoEffect
  };
}

/**
 * Resolves the shop catalog from the map (per-building `building.shopConfig` + `world.shopCatalogPresets`),
 * falling back to built-in `SHOP_CATALOGS` only when a custom/legacy map lacks `shopCatalogPresets`.
 */
export function getResolvedShopCatalog(
  shopType: string,
  world?: GameWorld | null,
  buildingId?: string | null,
  roomName?: string | null
): ShopItem[] {
  const presets = world?.shopCatalogPresets;
  const bld = buildingId && world?.buildings
    ? world.buildings.find(b => b.id === buildingId)
    : undefined;

  let activeConfig: ShopCatalogOverrideConfig | undefined = bld?.shopConfig;
  if (bld?.shopConfig?.roomCatalogs && roomName) {
    const rmLower = roomName.toLowerCase();
    const matchedRoomKey = Object.keys(bld.shopConfig.roomCatalogs).find(
      k => k.toLowerCase() === rmLower || rmLower.includes(k.toLowerCase()) || k.toLowerCase().includes(rmLower)
    );
    if (matchedRoomKey) {
      activeConfig = bld.shopConfig.roomCatalogs[matchedRoomKey];
    }
  }

  const presetKey = activeConfig?.catalogPreset || shopType;
  const priceMult = typeof activeConfig?.priceMultiplier === 'number' && Number.isFinite(activeConfig.priceMultiplier)
    ? activeConfig.priceMultiplier
    : 1;
  const removeSet = new Set(activeConfig?.removeIds || []);

  // 1. Choose source list: explicit per-building catalog -> map.json preset -> built-in fallback
  let sourceList: MapShopCatalogEntry[] = [];
  let usedMapData = false;

  if (activeConfig?.catalog && activeConfig.catalog.length > 0) {
    sourceList = activeConfig.catalog;
    usedMapData = true;
  } else if (presets && presets[presetKey] && presets[presetKey].length > 0) {
    sourceList = presets[presetKey];
    usedMapData = true;
  } else if (presets && presets[shopType] && presets[shopType].length > 0) {
    sourceList = presets[shopType];
    usedMapData = true;
  } else {
    sourceList = SHOP_CATALOGS[presetKey] || SHOP_CATALOGS[shopType] || SHOP_CATALOGS.supermarket || [];
  }

  const seenEntryIds = new Set<string>();
  const seenFallbackItemIds = new Set<string>();
  const resolved: ShopItem[] = [];

  for (const rawEntry of sourceList) {
    if (removeSet.has(rawEntry.id)) continue;
    if (seenEntryIds.has(rawEntry.id)) continue;
    const norm = normalizeShopEntry(rawEntry, priceMult);
    if (!norm) continue;
    seenEntryIds.add(norm.id);
    seenFallbackItemIds.add(norm.originalCatalogId || norm.itemId);
    resolved.push(norm);
  }

  if (activeConfig?.addItems && activeConfig.addItems.length > 0) {
    for (const extra of activeConfig.addItems) {
      if (removeSet.has(extra.id) || seenEntryIds.has(extra.id)) continue;
      const norm = normalizeShopEntry(extra, priceMult);
      if (!norm) continue;
      seenEntryIds.add(norm.id);
      seenFallbackItemIds.add(norm.originalCatalogId || norm.itemId);
      resolved.push(norm);
    }
  }

  // Only append legacy ITEM_CATALOG.shopListings when running on a map without map.json presets
  if (!usedMapData) {
    for (const def of Object.values(ITEM_CATALOG)) {
      if (!def.shopListings || seenFallbackItemIds.has(def.itemId)) continue;
      for (const listing of def.shopListings) {
        if (listing.shopType !== shopType) continue;
        seenFallbackItemIds.add(def.itemId);
        const shopCat: 'food' | 'medical' | 'auto' =
          listing.category ||
          (def.category === 'food' || def.category === 'drink'
            ? 'food'
            : def.category === 'med' || def.category === 'medical'
            ? 'medical'
            : 'auto');
        resolved.push({
          id: `auto_${shopType}_${def.itemId}`,
          itemId: def.itemId,
          nameRu: def.nameRu,
          price: Math.max(1, Math.round(listing.price * priceMult)),
          description: def.descriptionRu,
          category: shopCat,
          effectText: listing.effectText || formatItemEffectSummary(def.itemId)
        });
      }
    }
  }

  return resolved;
}

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
  shopBuildingId?: string | null;
  shopRoomName?: string | null;
  player: Player | null;
  world?: GameWorld | null;
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
  const [activeTab, setActiveTab] = useState<'fuel' | 'catalog' | 'diagnostics' | 'repair' | 'tuning' | 'cart' | 'pos' | 'lpg'>('catalog');
  const [trayDenoms, setTrayDenoms] = useState<Record<string, number>>({});
  const [posSuccess, setPosSuccess] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Gas Station TRK state
  const [selectedPumpId, setSelectedPumpId] = useState<string>('gas_pump_1');
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('ai95');
  const [fuelLiters, setFuelLiters] = useState<number>(20);

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

  const isGasStation =
    shop.type === 'gas_station_shop' ||
    shop.nameRu.toLowerCase().includes('азс') ||
    shop.nameRu.toLowerCase().includes('нефть');

  const isAutoShop =
    !isGasStation &&
    (shop.type === 'auto_shop' ||
      shop.id.includes('pitstop') ||
      shop.nameRu.toLowerCase().includes('авто') ||
      shop.nameRu.toLowerCase().includes('сервис') ||
      shop.nameRu.toLowerCase().includes('pit-stop') ||
      shop.nameRu.toLowerCase().includes('мастерск') ||
      shop.nameRu.toLowerCase().includes('сто') ||
      shop.nameRu.toLowerCase().includes('гараж'));

  const isAutoShopOrGas = isAutoShop || isGasStation;

  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setActiveTab(isGasStation ? 'fuel' : 'catalog');
      setTrayDenoms({});
      setPosSuccess(false);
      setInstallingLpg(false);
      setInstallingCamera(false);
      setIsScanningEcu(false);
      setHasScannedEcu(false);
      setIsRepairing(false);
      setRepairActionMessage(null);
      setSearchQuery('');
      setSelectedDept('all');
      setSelectedItemId(null);

      const pumps: GasPumpDispenser[] = props.gasPumps || [];
      if (pumps.length > 0) {
        const inserted = pumps.find((p) => p.status === 'inserted' && p.connectedVehicleId);
        const held = pumps.find((p) => p.nozzleTaken !== null);
        const chosen = inserted || held || pumps[0];
        if (chosen) {
          setSelectedPumpId(chosen.id);
          if (chosen.connectedFuelType) {
            setSelectedFuelType(chosen.connectedFuelType);
          } else if (chosen.nozzleTaken) {
            setSelectedFuelType(chosen.nozzleTaken);
          } else if (chosen.id === 'gas_pump_5_lpg') {
            setSelectedFuelType('lpg');
          } else {
            setSelectedFuelType('ai95');
          }
        }
      }
    }
  }, [isOpen, shop?.id, shop?.type]);

  const activeIntervalsRef = React.useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const activeTimeoutsRef = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const registerInterval = (fn: () => void, ms: number) => {
    const id = setInterval(fn, ms);
    activeIntervalsRef.current.add(id);
    return id;
  };
  const stopInterval = (id: ReturnType<typeof setInterval>) => {
    clearInterval(id);
    activeIntervalsRef.current.delete(id);
  };
  const registerTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      activeTimeoutsRef.current.delete(id);
      fn();
    }, ms);
    activeTimeoutsRef.current.add(id);
    return id;
  };

  useEffect(() => {
    if (!isOpen) {
      activeIntervalsRef.current.forEach(clearInterval);
      activeIntervalsRef.current.clear();
      activeTimeoutsRef.current.forEach(clearTimeout);
      activeTimeoutsRef.current.clear();
    }
    return () => {
      activeIntervalsRef.current.forEach(clearInterval);
      activeIntervalsRef.current.clear();
      activeTimeoutsRef.current.forEach(clearTimeout);
      activeTimeoutsRef.current.clear();
    };
  }, [isOpen]);

  if (!isOpen || !shop || !player) return null;

  const playerCash = getPlayerCash(player);
  const catalog = getResolvedShopCatalog(
    shop.type,
    props.world,
    props.shopBuildingId,
    props.shopRoomName || shop.nameRu
  );

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
    registerTimeout(() => {
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
    registerTimeout(() => {
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
    if (currentVehicle.engineState?.alternatorWorking === false) {
      dtcErrors.push({
        code: 'P0560',
        title: 'Отказ генератора / обрыв приводного ремня',
        desc: 'Нет зарядки бортовой сети при работающем ДВС. Возможно падение напряжения до нуля.',
        severity: 'warning'
      });
    }
    if (currentVehicle.engineState?.coolingFanBroken) {
      dtcErrors.push({
        code: 'P0480',
        title: 'Неисправность вентилятора охлаждения',
        desc: 'Крыльчатка или диффузор вентилятора разрушены. Высокий риск перегрева в пробках и на холостых.',
        severity: 'warning'
      });
    }
    if ((currentVehicle.engineState?.turboHealth ?? 100) < 65 || (currentVehicle.engineState?.intercoolerHealth ?? 100) < 65) {
      dtcErrors.push({
        code: 'P0299',
        title: 'Недодув турбонаддува / разгерметизация интеркулера',
        desc: `Узел турбокомпрессора (${Math.round(currentVehicle.engineState?.turboHealth ?? 100)}%) или интеркулер (${Math.round(currentVehicle.engineState?.intercoolerHealth ?? 100)}%) повреждены при ударе.`,
        severity: 'warning'
      });
    }
    if (currentVehicle.engineState?.airIntakeDamaged) {
      dtcErrors.push({
        code: 'P0101',
        title: 'Повреждение воздушного фильтра / тракта впуска',
        desc: 'Снижена пропускная способность впускного тракта, потеря мощности двигателя.',
        severity: 'warning'
      });
    }
    if (currentVehicle.engineState?.ecuDamaged) {
      dtcErrors.push({
        code: 'P0606',
        title: 'Повреждение блока управления двигателем (ЭБУ)',
        desc: 'Двигатель переведен в аварийный режим ограничения крутящего момента.',
        severity: 'critical'
      });
    }
    if (currentVehicle.engineState?.fuelInjectorPumpDamaged || currentVehicle.engineState?.gboReducerDamaged) {
      dtcErrors.push({
        code: 'P0190',
        title: 'Повреждение ТНВД / топливного узла / редуктора ГБО',
        desc: 'Нарушена подача топлива под капотом, нестабильная работа и перебои впрыска.',
        severity: 'critical'
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
        title: 'Капитальный ремонт ДВС, наддува и КПП',
        desc: 'Восстановление блока цилиндров, трансмиссии, турбокомпрессора, интеркулера и впускного тракта с заменой поврежденных деталей.',
        price:
          Math.round((100 - (currentVehicle.engineState?.engineHealth ?? 100)) * 320) +
          Math.round((100 - (currentVehicle.engineState?.transmissionHealth ?? 100)) * 180) +
          Math.round((100 - (currentVehicle.engineState?.turboHealth ?? 100)) * 160) +
          Math.round((100 - (currentVehicle.engineState?.intercoolerHealth ?? 100)) * 95) +
          (currentVehicle.engineState?.airIntakeDamaged ? 2200 : 0) +
          2500,
        needsRepair:
          (currentVehicle.engineState?.engineHealth ?? 100) < 95 ||
          (currentVehicle.engineState?.transmissionHealth ?? 100) < 95 ||
          !!currentVehicle.engineState?.transmissionJammed ||
          (currentVehicle.engineState?.turboHealth ?? 100) < 95 ||
          (currentVehicle.engineState?.intercoolerHealth ?? 100) < 95 ||
          !!currentVehicle.engineState?.airIntakeDamaged,
        apply: (v) => {
          if (v.engineState) {
            v.engineState.engineHealth = 100;
            v.engineState.transmissionHealth = 100;
            v.engineState.transmissionJammed = false;
            v.engineState.turboHealth = 100;
            v.engineState.intercoolerHealth = 100;
            v.engineState.airIntakeDamaged = false;
            v.engineState.engineKnocking = false;
            v.engineState.engineStalled = false;
            v.engineState.isSeized = false;
          }
        }
      },
      {
        id: 'leaks_and_fluids',
        title: 'Ремонт системы охлаждения, поддона и замена жидкостей',
        desc: 'Сварка трещин поддона картера, пайка радиатора, замена разрушенного вентилятора охлаждения, заправка масла и антифриза.',
        price:
          (currentVehicle.engineState?.radiatorPunctured ? 4500 : 0) +
          (currentVehicle.engineState?.oilPunctured ? 3800 : 0) +
          (currentVehicle.engineState?.coolingFanBroken ? 2800 : 0) +
          1200,
        needsRepair: !!(
          currentVehicle.engineState?.radiatorPunctured ||
          currentVehicle.engineState?.oilPunctured ||
          currentVehicle.engineState?.coolingFanBroken ||
          (currentVehicle.engineState?.oilLevel ?? 100) < 90 ||
          (currentVehicle.engineState?.radiatorWater ?? 100) < 90
        ),
        apply: (v) => {
          if (v.engineState) {
            v.engineState.radiatorPunctured = false;
            v.engineState.oilPunctured = false;
            v.engineState.coolingFanBroken = false;
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
        title: 'Ремонт АКБ, стартера, генератора и ЭБУ',
        desc: 'Заряд и восстановление клемм батареи, замена ремня и генератора, переборка стартера и восстановление блока управления двигателем.',
        price:
          (!currentVehicle.engineState?.starterWorking ? 1800 : 0) +
          (currentVehicle.engineState?.alternatorWorking === false ? 3200 : 0) +
          (currentVehicle.engineState?.ecuDamaged ? 5500 : 0) +
          Math.round((100 - (currentVehicle.engineState?.batteryCharge ?? 100)) * 25) +
          500,
        needsRepair:
          (currentVehicle.engineState?.batteryCharge ?? 100) < 95 ||
          currentVehicle.engineState?.batteryPosConnected === false ||
          currentVehicle.engineState?.batteryNegConnected === false ||
          currentVehicle.engineState?.starterWorking === false ||
          currentVehicle.engineState?.alternatorWorking === false ||
          !!currentVehicle.engineState?.ecuDamaged,
        apply: (v) => {
          if (v.engineState) {
            v.engineState.batteryCharge = 100;
            v.engineState.batteryPosConnected = true;
            v.engineState.batteryNegConnected = true;
            v.engineState.starterWorking = true;
            v.engineState.alternatorWorking = true;
            v.engineState.ecuDamaged = false;
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
            v.damage.hoodDetached = false;
            v.damage.hoodRaisedAmount = 0;
            v.damage.wheelRubResistance = 0;
            v.damage.frameBentAngle = 0;
            v.damage.nodeBeam = createVehicleNodeBeamSystem(v);
            syncNodeBeamToVehicle(v.damage.nodeBeam, v);
          }
        }
      },
      {
        id: 'fuel_system',
        title: 'Устранение разгерметизации топливной рампы, ТНВД и ГБО',
        desc: 'Устранение утечек бака, ремонт рампы впрыска, ТНВД и редуктора ГБО, замена поврежденных топливных магистралей высокого давления.',
        price:
          (currentVehicle.fuelSystem?.tankPunctured ? 4800 : 0) +
          (currentVehicle.fuelSystem?.fuelRailBroken ? 3500 : 0) +
          (currentVehicle.engineState?.fuelInjectorPumpDamaged ? 4200 : 0) +
          (currentVehicle.engineState?.gboReducerDamaged ? 2900 : 0) +
          800,
        needsRepair: !!(
          currentVehicle.fuelSystem?.tankPunctured ||
          currentVehicle.fuelSystem?.fuelRailBroken ||
          currentVehicle.engineState?.fuelInjectorPumpDamaged ||
          currentVehicle.engineState?.gboReducerDamaged
        ),
        apply: (v) => {
          if (v.fuelSystem) {
            v.fuelSystem.tankPunctured = false;
            v.fuelSystem.fuelRailBroken = false;
          }
          if (v.engineState) {
            v.engineState.fuelInjectorPumpDamaged = false;
            v.engineState.gboReducerDamaged = false;
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
      registerTimeout(() => setRepairActionMessage(null), 3500);
      return;
    }

    const totalCost = activeRepairs.reduce((sum, r) => sum + r.price, 0);
    if (playerCash < totalCost) {
      setRepairActionMessage(`Недостаточно средств! Требуется ${totalCost.toLocaleString()} ₽, у вас ${playerCash.toLocaleString()} ₽`);
      registerTimeout(() => setRepairActionMessage(null), 4000);
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
    const interval = registerInterval(() => {
      setRepairLogs(prev => [...prev, logSteps[step]]);
      setCurrentRepairStep(step + 1);
      sound.playUseItem();

      step++;
      if (step >= logSteps.length) {
        stopInterval(interval);
        
        // Execute physical logic for each repair item
        activeRepairs.forEach(r => r.apply(currentVehicle));

        // Submit the repair with custom cost to App.tsx
        onRepairVehicle?.(false, totalCost);
        
        setIsRepairing(false);
        (currentVehicle as any).isUnderRepair = false;
        setRepairActionMessage('Техническое обслуживание и ремонт по наряд-заказу успешно завершены!');
        registerTimeout(() => setRepairActionMessage(null), 3000);
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

    const interval = registerInterval(() => {
      setChiptuningProgress(prev => {
        if (prev >= 100) {
          stopInterval(interval);
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

    const interval = registerInterval(() => {
      setSuspensionProgress(prev => {
        if (prev >= 100) {
          stopInterval(interval);
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

    const interval = registerInterval(() => {
      setLpgProgress(prev => {
        if (prev >= 100) {
          stopInterval(interval);
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

    const interval = registerInterval(() => {
      setCameraProgress(prev => {
        if (prev >= 100) {
          stopInterval(interval);
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

    const interval = registerInterval(() => {
      setPaintProgress(prev => {
        if (prev >= 100) {
          stopInterval(interval);
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

  const getItemDept = (item: ShopItem): { id: string; label: string } => {
    const rawContainerId = item.itemId.toLowerCase();
    const hasFill = Boolean(
      (item.contents && item.contents.length > 0) ||
      (item.fluidStorage && item.fluidStorage.liquidId && (item.fluidStorage.currentMl || 0) > 0)
    );
    const id = hasFill
      ? (item.originalCatalogId || item.contents?.[0]?.itemId || item.fluidStorage?.liquidId || item.itemId).toLowerCase()
      : rawContainerId;
    const name = item.nameRu.toLowerCase();
    if (isAutoShop) {
      if (id.includes('oil') || id.includes('coolant') || id.includes('fluid') || id.includes('canister') || id.includes('water') || name.includes('масло') || name.includes('антифриз') || name.includes('тосол') || name.includes('тормозн')) {
        return { id: 'fluids', label: 'Техжидкости и ГСМ' };
      }
      if (id.includes('tire') || id.includes('wheel') || id.includes('battery') || id.includes('spark') || id.includes('filter') || id.includes('belt') || id.includes('bulb') || id.includes('fuse') || name.includes('аккумулятор') || name.includes('свеч') || name.includes('фильтр') || name.includes('ламп') || name.includes('шин') || name.includes('колес')) {
        return { id: 'parts', label: 'Запчасти и агрегаты' };
      }
      if (id.includes('wrench') || id.includes('jack') || id.includes('tow') || id.includes('extinguisher') || id.includes('kit') || id.includes('tape') || id.includes('sand') || name.includes('ключ') || name.includes('домкрат') || name.includes('трос') || name.includes('огнетушитель')) {
        return { id: 'tools', label: 'Инструмент и ЧС' };
      }
      return { id: 'misc', label: 'Сопутствующие товары' };
    } else {
      const eff = (item.effectText || '').toLowerCase();
      if (item.fluidStorage?.liquidId === 'detergent' || id.startsWith('detergent_') || rawContainerId.startsWith('detergent_')) {
        return { id: 'chemistry', label: 'Бытовая химия' };
      }
      if (isGasStation && (id.includes('oil') || id.includes('coolant') || id.includes('fluid') || id.includes('canister') || id.includes('tow') || id.includes('extinguisher') || id.includes('kit') || name.includes('масло') || name.includes('антифриз') || name.includes('тосол') || name.includes('канистр'))) {
        return { id: 'fluids', label: 'Автотовары и ГСМ' };
      }
      if (!hasFill && (rawContainerId === 'grain_pack_pouch' || rawContainerId === 'grain_pack_box' || rawContainerId === 'pasta_pack_bag' || rawContainerId === 'pasta_pack_long')) {
        return { id: 'household', label: 'Тара и сопутствующее' };
      }
      if (id.startsWith('pasta_')) {
        return { id: 'pasta', label: 'Макаронные изделия' };
      }
      if (
        id.startsWith('grain_') || id.startsWith('rice_') || id.startsWith('buckwheat_') ||
        id.startsWith('barley_') || id.startsWith('millet_') || id.startsWith('semolina_') ||
        id.startsWith('bulgur_') || id.startsWith('couscous_') || id.startsWith('corn_grits_') ||
        id.startsWith('quinoa_') || id.startsWith('spelt_') || id.startsWith('peas_') ||
        id.startsWith('beans_') || id.startsWith('lentils_') || id.startsWith('chickpeas_') ||
        id.startsWith('mung_') || id.startsWith('flour_')
      ) {
        return { id: 'grains', label: 'Крупы и культуры' };
      }
      if ((eff.includes('сытость') || id.includes('bread') || id.includes('meat') || id.includes('minced') || id.includes('beef') || id.includes('pork') || id.includes('chicken') || id.includes('turkey') || id.includes('sausage') || id.includes('cheese') || id.includes('chips') || id.includes('choc') || id.includes('gummy') || id.includes('canned') || id.includes('burger') || id.includes('shawarma') || id.includes('pie') || id.includes('noodle') || id.includes('pelmen') || id.includes('hotdog')) && (hasFill || (!rawContainerId.startsWith('chocolate_pack') && !rawContainerId.startsWith('pelmeni_pack')))) {
        return { id: 'food', label: 'Продукты и перекус' };
      }
      if (eff.includes('жажд') || eff.includes('бодрость') || id.includes('water') || id.includes('cola') || id.includes('soda') || id.includes('juice') || id.includes('energy') || id.includes('milk') || id.includes('tea') || id.includes('coffee') || id.includes('kvass') || id.includes('beer')) {
        return { id: 'drinks', label: 'Напитки и кофе' };
      }
      if (!hasFill && (rawContainerId.includes('bag') || rawContainerId.includes('box') || rawContainerId.includes('sack') || rawContainerId.includes('pouch') || rawContainerId.includes('crate') || rawContainerId.includes('case') || rawContainerId.includes('lock') || rawContainerId.includes('cigarette') || rawContainerId.includes('lighter') || rawContainerId.includes('phone') || rawContainerId.includes('watch') || rawContainerId.startsWith('chocolate_pack') || rawContainerId.startsWith('pelmeni_pack') || rawContainerId.startsWith('candy_pouch') || rawContainerId.startsWith('paper_packaging') || rawContainerId.startsWith('vacuum_pack') || rawContainerId === 'tray_sealed_food')) {
        return { id: 'household', label: 'Тара и сопутствующее' };
      }
      return { id: 'other', label: 'Разное' };
    }
  };

  const departmentsMap = new Map<string, { id: string; label: string; count: number }>();
  catalog.forEach(item => {
    const d = getItemDept(item);
    const cur = departmentsMap.get(d.id);
    if (cur) cur.count += 1;
    else departmentsMap.set(d.id, { id: d.id, label: d.label, count: 1 });
  });
  const departments = Array.from(departmentsMap.values());

  const filteredCatalog = catalog.filter(item => {
    if (selectedDept !== 'all' && getItemDept(item).id !== selectedDept) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      const matchName = item.nameRu.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchEff = (item.effectText || '').toLowerCase().includes(q);
      return matchName || matchDesc || matchEff;
    }
    return true;
  });

  const activeInspectedItem = catalog.find(i => i.id === selectedItemId) || filteredCatalog[0] || catalog[0] || null;

  const totalCartWeightKg = cart.reduce((sum, entry) => {
    const pItem = getShopPreviewItem(entry.item);
    return sum + getItemTotalWeight(pItem) * entry.count;
  }, 0);

  const tabItems: TabItem<'fuel' | 'catalog' | 'diagnostics' | 'repair' | 'tuning' | 'cart' | 'pos'>[] = [
    ...(isGasStation
      ? ([
          {
            id: 'fuel',
            label: 'Заправка ТРК',
            icon: <Fuel className="w-3.5 h-3.5" />,
            badge: (props.gasPumps || []).length || 5,
          },
        ] as TabItem<'fuel' | 'catalog' | 'diagnostics' | 'repair' | 'tuning' | 'cart' | 'pos'>[])
      : []),
    {
      id: 'catalog',
      label: isGasStation ? 'Минимаркет АЗС' : isAutoShop ? 'Автозапчасти' : 'Каталог товаров',
      icon: <Package className="w-3.5 h-3.5" />,
      badge: catalog.length,
    },
    ...(isAutoShop
      ? ([
          {
            id: 'diagnostics',
            label: 'Диагностика',
            icon: <Activity className="w-3.5 h-3.5" />,
            badge: dtcErrors.length > 0 ? dtcErrors.length : undefined,
          },
          {
            id: 'repair',
            label: 'Починка и ТО',
            icon: <Wrench className="w-3.5 h-3.5" />,
            badge: getActiveRepairs().length > 0 ? getActiveRepairs().length : undefined,
          },
          {
            id: 'tuning',
            label: 'Тюнинг и Окраска',
            icon: <Zap className="w-3.5 h-3.5" />,
          },
        ] as TabItem<'fuel' | 'catalog' | 'diagnostics' | 'repair' | 'tuning' | 'cart' | 'pos'>[])
      : []),
    {
      id: 'cart',
      label: 'Корзина',
      icon: <ShoppingCart className="w-3.5 h-3.5" />,
      badge: totalCartItemsCount > 0 ? totalCartItemsCount : undefined,
    },
    ...(cartTotal > 0 || activeTab === 'pos'
      ? ([
          {
            id: 'pos',
            label: 'Касса оплаты',
            icon: <Receipt className="w-3.5 h-3.5" />,
          },
        ] as TabItem<'fuel' | 'catalog' | 'diagnostics' | 'repair' | 'tuning' | 'cart' | 'pos'>[])
      : []),
  ];

  const normalizedTab: 'fuel' | 'catalog' | 'diagnostics' | 'repair' | 'tuning' | 'cart' | 'pos' =
    activeTab === 'lpg' ? 'tuning' : activeTab;

  return (
    <ModalShell
      id="shop-modal"
      title={shop.nameRu}
      subtitle={shop.description}
      onClose={onClose}
      width={1080}
      tall
      wipeKey={normalizedTab}
      bodyKey={normalizedTab}
      headRight={
        <div className="gu-row" style={{ gap: 8 }}>
          {currentVehicle && isAutoShopOrGas && (
            <span className="gu-tag gu-hide-s" title="Подключенный автомобиль в зоне сервиса">
              <Car className="w-3.5 h-3.5" />
              <span>{currentVehicle.nameRu || currentVehicle.type}</span>
            </span>
          )}
          <span className="gu-chip" title="Наличные в кошельке и карманах">
            <Coins className="w-4 h-4" style={{ color: 'var(--gu-amber-hi)' }} />
            <span className="gu-num" style={{ fontSize: 16 }}>{playerCash.toLocaleString()} ₽</span>
          </span>
          {cartTotal > 0 && normalizedTab !== 'pos' && (
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="gu-btn gu-btn-p gu-btn-sm"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Касса · {cartTotal.toLocaleString()} ₽</span>
            </button>
          )}
        </div>
      }
      tabs={
        <Tabs
          items={tabItems}
          value={normalizedTab}
          onChange={(id) => setActiveTab(id)}
        />
      }
      footerHints={[
        ['Клик', 'Выбрать товар'],
        ['Esc', 'Закрыть'],
      ]}
      footerRight={
        <div className="gu-row" style={{ gap: 8 }}>
          {normalizedTab === 'pos' && cartTotal > 0 && (
            <button
              type="button"
              disabled={inTrayMoney < cartTotal || posSuccess}
              onClick={handleExecutePOSPayment}
              className="gu-btn gu-btn-p gu-btn-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>
                {posSuccess
                  ? 'Оплата проведена'
                  : inTrayMoney < cartTotal
                  ? `В лоток еще ${(cartTotal - inTrayMoney).toLocaleString()} ₽`
                  : `Оплатить и забрать (${cartTotal.toLocaleString()} ₽)`}
              </span>
            </button>
          )}
          {cartTotal > 0 && normalizedTab !== 'pos' && (
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="gu-btn gu-btn-p gu-btn-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Перейти на кассу ({cartTotal.toLocaleString()} ₽)</span>
            </button>
          )}
          <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
            Закрыть
          </button>
        </div>
      }
    >
      {/* GAS STATION TRK FUEL DISPENSER TAB */}
      {normalizedTab === 'fuel' && (() => {
        const pumpsList: GasPumpDispenser[] = props.gasPumps || [];
        const selectedPump = pumpsList.find((p) => p.id === selectedPumpId) || pumpsList[0];
        const connectedVeh = selectedPump?.connectedVehicleId
          ? vehiclesList.find((v: any) => v.id === selectedPump.connectedVehicleId) || null
          : null;
        const isLpgPump = selectedPump?.id === 'gas_pump_5_lpg' || selectedFuelType === 'lpg';
        const tankCap = isLpgPump
          ? connectedVeh?.fuelSystem?.gboCapacity || 42
          : connectedVeh?.fuelSystem?.tankCapacity || 55;
        const curPct = isLpgPump
          ? connectedVeh?.fuelSystem?.gboLevel || 0
          : connectedVeh?.fuelSystem?.tankLevel || 0;
        const curLitersInTank = Math.round((curPct / 100) * tankCap);
        const maxNeeded = Math.max(5, Math.round(tankCap - curLitersInTank));
        const activeGrade = FUEL_GRADES[selectedFuelType] || FUEL_GRADES.ai95;
        const totalFuelCost = Math.round(fuelLiters * activeGrade.pricePerLiter);
        const canAffordFuel = playerCash >= totalFuelCost;
        const presetLiters = [10, 20, 30, 40, 50];

        const createFuelShopItem = (): ShopItem => ({
          id: `fuel_${selectedPump?.id || 'pump1'}_${selectedFuelType}_${fuelLiters}`,
          itemId: 'fuel_order',
          nameRu: `Топливо ${activeGrade.badgeText} · ${fuelLiters} л (ТРК №${selectedPump?.pumpNumber || 1})`,
          price: totalFuelCost,
          description: `${activeGrade.nameRu} (${activeGrade.pricePerLiter.toFixed(2)} ₽/л) на колонке №${selectedPump?.pumpNumber || 1}`,
          category: 'auto',
          effectText: `${fuelLiters} л`,
          fuelPumpId: selectedPump?.id || 'gas_pump_1',
          fuelLiters: fuelLiters,
          fuelType: selectedFuelType,
        });

        return (
          <div className="gu-trk-grid">
            {/* Row 1: Horizontal 5-Column TRK Pump Selector (№1..5) */}
            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="gu-row-between">
                <span className="gu-grp">1. Топливные колонки (Посты ТРК №1–5)</span>
                <span className="gu-tag">{pumpsList.length} постов в линию</span>
              </div>

              <div className="gu-trk-pumps">
                {pumpsList.map((pump) => {
                  const isSel = pump.id === (selectedPump?.id || selectedPumpId);
                  const veh = pump.connectedVehicleId
                    ? vehiclesList.find((v: any) => v.id === pump.connectedVehicleId)
                    : null;
                  const isLpg = pump.id === 'gas_pump_5_lpg';
                  const isReady = pump.status === 'inserted' && Boolean(veh);

                  return (
                    <button
                      key={pump.id}
                      type="button"
                      onClick={() => {
                        sound.playUseItem();
                        setSelectedPumpId(pump.id);
                        if (pump.connectedFuelType) {
                          setSelectedFuelType(pump.connectedFuelType);
                        } else if (pump.nozzleTaken) {
                          setSelectedFuelType(pump.nozzleTaken);
                        } else if (isLpg) {
                          setSelectedFuelType('lpg');
                        } else if (selectedFuelType === 'lpg') {
                          setSelectedFuelType('ai95');
                        }
                      }}
                      className={`gu-trk-pump ${isSel ? 'is-on' : ''} ${isReady ? 'is-ready' : ''}`}
                    >
                      <div className="gu-row-between" style={{ width: '100%' }}>
                        <span className="gu-trk-pump-num">ТРК №{pump.pumpNumber}</span>
                        <span
                          className={`gu-tag ${pump.isPumping ? 'warn' : isReady ? 'good' : ''}`}
                          style={{ height: 18, padding: '0 6px', fontSize: 10 }}
                        >
                          {pump.isPumping
                            ? `${pump.displayLiters.toFixed(1)} л`
                            : isReady
                            ? 'В баке'
                            : 'Свободна'}
                        </span>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {veh
                            ? veh.nameRu || veh.type
                            : isLpg
                            ? 'Газ Пропан (LPG)'
                            : 'Ожидание ТС'}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: 'var(--gu-mut)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {veh
                            ? `Пистолет: ${FUEL_GRADES[pump.connectedFuelType || 'ai95']?.badgeText}`
                            : pump.status === 'nozzle_held'
                            ? 'Пистолет снят'
                            : isLpg
                            ? 'ГБО Пост №5'
                            : '92 · 95 · 98 · ДТ'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Horizontal 5-Column Fuel Grade / Nozzle Row */}
            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="gu-row-between">
                <span className="gu-grp">2. Пистолет и марка горючего</span>
                <span style={{ fontSize: 12, color: 'var(--gu-amber-hi)', fontWeight: 700 }}>
                  {activeGrade.nameRu} · {activeGrade.pricePerLiter.toFixed(2)} ₽/л
                </span>
              </div>

              <div className="gu-trk-grades">
                {(Object.keys(FUEL_GRADES) as FuelType[]).map((ft) => {
                  const g = FUEL_GRADES[ft];
                  const active = selectedFuelType === ft;
                  const lockedByNozzle =
                    selectedPump?.connectedFuelType && selectedPump.connectedFuelType !== ft;
                  const incompatibleWithPump =
                    selectedPump?.id === 'gas_pump_5_lpg' ? ft !== 'lpg' : ft === 'lpg';

                  return (
                    <button
                      key={ft}
                      type="button"
                      disabled={Boolean(lockedByNozzle || incompatibleWithPump)}
                      onClick={() => {
                        sound.playUseItem();
                        setSelectedFuelType(ft);
                      }}
                      className={`gu-trk-grade ${active ? 'is-on' : ''}`}
                      style={{ '--grade-color': g.color } as React.CSSProperties}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{g.badgeText}</span>
                      <span className="gu-num" style={{ fontSize: 12, color: 'var(--gu-amber-hi)' }}>
                        {g.pricePerLiter.toFixed(1)} ₽/л
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: 2-Column Bottom Row (Left: Volume + Tank Status, Right: Total + Cart/Pay Buttons) */}
            <div className="gu-trk-bottom">
              <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                <div className="gu-row-between" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span className="gu-grp">3. Объем заправки (литры)</span>
                  <div className="gu-row" style={{ gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setFuelLiters(Math.max(5, fuelLiters - 5))}
                      className="gu-btn gu-btn-s gu-btn-xs"
                    >
                      <Minus className="w-3 h-3" /> 5 л
                    </button>
                    <span
                      className="gu-num"
                      style={{ fontSize: 16, fontWeight: 700, color: '#fff', minWidth: 46, textAlign: 'center' }}
                    >
                      {fuelLiters} л
                    </span>
                    <button
                      type="button"
                      onClick={() => setFuelLiters(Math.min(120, fuelLiters + 5))}
                      className="gu-btn gu-btn-s gu-btn-xs"
                    >
                      <Plus className="w-3 h-3" /> 5 л
                    </button>
                  </div>
                </div>

                <div className="gu-trk-presets">
                  {presetLiters.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        sound.playUseItem();
                        setFuelLiters(val);
                      }}
                      className={`gu-pill ${fuelLiters === val ? 'on' : ''}`}
                      style={{ justifyContent: 'center', height: 28 }}
                    >
                      {val} л
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playUseItem();
                      setFuelLiters(connectedVeh ? maxNeeded : 45);
                    }}
                    className={`gu-pill ${connectedVeh && fuelLiters === maxNeeded ? 'on' : ''}`}
                    style={{ justifyContent: 'center', height: 28 }}
                  >
                    Полный ({connectedVeh ? `${maxNeeded}л` : '45л'})
                  </button>
                </div>

                {connectedVeh ? (
                  <div>
                    <div className="gu-row-between" style={{ fontSize: 11.5, marginBottom: 4 }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>
                        <Car className="w-3.5 h-3.5 inline mr-1" style={{ color: 'var(--gu-good)' }} />
                        {connectedVeh.nameRu || connectedVeh.type}
                      </span>
                      <span className="gu-num" style={{ color: 'var(--gu-amber-hi)' }}>
                        В баке: {curLitersInTank} / {tankCap} л ({Math.round(curPct)}%)
                      </span>
                    </div>
                    <div className="gu-bar good">
                      <span style={{ width: `${Math.min(100, curPct)}%` }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--gu-mut)' }}>
                    На колонке №{selectedPump?.pumpNumber || 1} пистолет еще не вставлен в бак автомобиля. Оплатите заранее или вставьте пистолет на улице (ПКМ / удержание).
                  </div>
                )}
              </div>

              <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                <div className="gu-row-between">
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--gu-mut)', textTransform: 'uppercase' }}>
                      Сумма за топливо ({fuelLiters} л × {activeGrade.pricePerLiter.toFixed(2)} ₽)
                    </div>
                    <div className="gu-shop-price" style={{ fontSize: 24, marginTop: 2 }}>
                      {totalFuelCost.toLocaleString()}
                      <small>₽</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const fuelItem = createFuelShopItem();
                      handleAddToCart(fuelItem);
                    }}
                    className="gu-btn gu-btn-s gu-btn-sm"
                    style={{ height: 32 }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>В чек</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!canAffordFuel || selectedPump?.isPumping}
                  onClick={() => {
                    const fuelItem = createFuelShopItem();
                    if (props.onBuyItems) {
                      props.onBuyItems([fuelItem], totalFuelCost);
                      onClose();
                    } else {
                      handleAddToCart(fuelItem);
                      setActiveTab('pos');
                    }
                  }}
                  className="gu-btn gu-btn-p gu-btn-block"
                  style={{ height: 36 }}
                >
                  <Fuel className="w-3.5 h-3.5" />
                  <span>
                    {selectedPump?.isPumping
                      ? 'Идет подача...'
                      : !canAffordFuel
                      ? `Не хватает средств (${totalFuelCost} ₽)`
                      : `Оплатить и включить ТРК №${selectedPump?.pumpNumber || 1}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CATALOG TAB */}
      {normalizedTab === 'catalog' && (
        <div>
          {/* Single-row compact toolbar: Search + Department Filter Pills */}
          <div className="gu-shop-bar">
            <div className="gu-shop-search">
              <Search className="w-3.5 h-3.5" style={{ color: 'var(--gu-mut)', flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск товара..."
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="gu-shop-search-clear"
                  aria-label="Очистить поиск"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="gu-shop-depts">
              <button
                type="button"
                onClick={() => setSelectedDept('all')}
                className={`gu-pill ${selectedDept === 'all' ? 'on' : ''}`}
              >
                Все ({catalog.length})
              </button>
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDept(d.id)}
                  className={`gu-pill ${selectedDept === d.id ? 'on' : ''}`}
                >
                  {d.label} ({d.count})
                </button>
              ))}
            </div>
          </div>

          <div className="gu-shop-layout">
            {/* Left Column: Compact Product Row-Cards Grid */}
            <div>
              {filteredCatalog.length === 0 ? (
                <div className="gu-empty">
                  <Search className="w-7 h-7" />
                  <div className="gu-empty-t">Ничего не найдено</div>
                  <div style={{ fontSize: 13 }}>
                    По запросу «{searchQuery}» в выбранном отделе нет подходящих товаров.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDept('all');
                    }}
                    className="gu-btn gu-btn-s gu-btn-sm"
                  >
                    Показать все товары
                  </button>
                </div>
              ) : (
                <div className="gu-shop-grid">
                  {filteredCatalog.map((item) => {
                    const inCart = cart.find((i) => i.item.id === item.id);
                    const countInCart = inCart ? inCart.count : 0;
                    const previewItem = getShopPreviewItem(item);
                    const totalWeightKg = getItemTotalWeight(previewItem);
                    const weightLabel = formatShopWeight(totalWeightKg);
                    const isSelected = activeInspectedItem?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`gu-shop-item ${countInCart > 0 ? 'in-cart' : ''} ${isSelected ? 'on' : ''}`}
                      >
                        <div className="gu-ic">
                          <ItemIconCanvas itemId={previewItem.itemId} item={previewItem} size={40} />
                          {countInCart > 0 && <span className="gu-ic-n">×{countInCart}</span>}
                        </div>

                        <div className="gu-shop-item-main">
                          <div className="gu-shop-item-name" title={item.nameRu}>
                            {item.nameRu}
                          </div>
                          <div className="gu-shop-item-meta" title={item.description}>
                            {weightLabel && (
                              <>
                                <span>{weightLabel}</span>
                                <span>·</span>
                              </>
                            )}
                            <span>{item.description}</span>
                          </div>
                        </div>

                        <div className="gu-shop-item-right" onClick={(e) => e.stopPropagation()}>
                          <div className="gu-shop-price">
                            {item.price.toLocaleString()}
                            <small>₽</small>
                          </div>

                          {countInCart > 0 ? (
                            <div className="gu-shop-qty">
                              <button
                                type="button"
                                onClick={() => handleRemoveOneFromCart(item.id)}
                                aria-label="Убрать 1 шт."
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span>{countInCart}</span>
                              <button
                                type="button"
                                className="is-plus"
                                onClick={() => handleAddToCart(item)}
                                aria-label="Добавить ещё 1 шт."
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemId(item.id);
                                handleAddToCart(item);
                              }}
                              className="gu-shop-add-btn"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Купить</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column (Desktop > 920px & > 620px height): Inspector + Live Receipt */}
            <aside className="gu-shop-side">
              {activeInspectedItem && (() => {
                const preview = getShopPreviewItem(activeInspectedItem);
                const weightKg = getItemTotalWeight(preview);
                const weightStr = formatShopWeight(weightKg);
                const inCartEntry = cart.find((c) => c.item.id === activeInspectedItem.id);
                const qtyInCart = inCartEntry ? inCartEntry.count : 0;
                const deptInfo = getItemDept(activeInspectedItem);

                return (
                  <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="gu-row-between">
                      <span className="gu-grp">О товаре</span>
                      <span className="gu-tag">{deptInfo.label}</span>
                    </div>

                    <div className="gu-row" style={{ gap: 10, alignItems: 'flex-start' }}>
                      <div className="gu-ic gu-md">
                        <ItemIconCanvas itemId={preview.itemId} item={preview} size={52} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>
                          {activeInspectedItem.nameRu}
                        </div>
                        {weightStr && (
                          <div style={{ fontSize: 11.5, color: 'var(--gu-mut)', marginTop: 2 }}>
                            Масса нетто: {weightStr}
                          </div>
                        )}
                        <div className="gu-shop-price" style={{ marginTop: 5, fontSize: 20 }}>
                          {activeInspectedItem.price.toLocaleString()}
                          <small>₽ / шт.</small>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--gu-mut)', lineHeight: 1.4 }}>
                      {activeInspectedItem.description}
                    </div>

                    {(() => {
                      const uAttrs = getUnifiedItemAttributes(preview);
                      const fs = preview.fluidStorage;
                      const liq = fs?.liquidId ? LIQUID_REGISTRY[fs.liquidId as LiquidId] : undefined;
                      const rawIng = uAttrs.ingredients ?? uAttrs.sourceIngredients;
                      const ingText = Array.isArray(rawIng) ? rawIng.filter(Boolean).join(', ') : rawIng;
                      const containerDef = ITEM_CATALOG[preview.itemId];
                      const innerItems = preview.contents && preview.contents.length > 0 ? preview.contents : null;
                      const innerSummary = innerItems
                        ? (() => {
                            const counts = new Map<string, number>();
                            innerItems.forEach((it) => {
                              const label = it.nameRu || ITEM_CATALOG[it.itemId]?.nameRu || it.itemId;
                              counts.set(label, (counts.get(label) || 0) + 1);
                            });
                            return Array.from(counts.entries())
                              .slice(0, 3)
                              .map(([label, qty]) => (qty > 1 ? `${label} ×${qty}` : label))
                              .join(', ');
                          })()
                        : '';
                      const isDryFluid = fs ? isFluidStorageDryForm(fs) : false;
                      const colorName = uAttrs.visuals?.colorNameRu || uAttrs.substanceColorRu;
                      const colorHex = uAttrs.visuals?.color || uAttrs.customColor || liq?.color;
                      const materialName = uAttrs.visuals?.materialNameRu;
                      const shapeName = uAttrs.productShapeRu || uAttrs.visuals?.shapeNameRu;
                      const capacityMlVal = uAttrs.capacityMl;
                      const capacityLabel =
                        capacityMlVal !== undefined && capacityMlVal > 0
                          ? (capacityMlVal >= 1000
                              ? `${Number((capacityMlVal / 1000).toFixed(2))} л (${capacityMlVal} мл)`
                              : `${capacityMlVal} мл`)
                          : undefined;
                      const pa = preview.phoneAttributes;
                      const ha = preview.hardwareAttributes;
                      if (pa) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                            <div className="gu-kv-grid gu-g2 gu-kv-compact">
                              <div className="gu-kv">
                                <span className="gu-kv-k">Марка</span>
                                <span className="gu-kv-v">{pa.brand}</span>
                              </div>
                              <div className="gu-kv">
                                <span className="gu-kv-k">Модель</span>
                                <span className="gu-kv-v">{pa.modelName}</span>
                              </div>
                              <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                                <span className="gu-kv-k">Цвет (RGB)</span>
                                <span className="gu-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', whiteSpace: 'normal' }}>
                                  <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: pa.colorHex, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                  <span>{pa.colorNameRu}</span>
                                  <span className="gu-num" style={{ fontSize: 10.5, color: 'var(--gu-mut)' }}>{formatRgbString(pa.colorRgb)}</span>
                                </span>
                              </div>
                              <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                                <span className="gu-kv-k">Из чего</span>
                                <span className="gu-kv-v" style={{ whiteSpace: 'normal' }}>{pa.materialRu}</span>
                              </div>
                              <div className="gu-kv">
                                <span className="gu-kv-k">Габариты</span>
                                <span className="gu-kv-v gu-num">{pa.dimensionsRu}</span>
                              </div>
                              <div className="gu-kv">
                                <span className="gu-kv-k">Вес / Объём</span>
                                <span className="gu-kv-v gu-num">{pa.weightGrams} г · {pa.volumeL} л</span>
                              </div>
                              <div className="gu-kv">
                                <span className="gu-kv-k">ОС</span>
                                <span className="gu-kv-v">{pa.osName} {pa.osVersion}</span>
                              </div>
                              <div className="gu-kv">
                                <span className="gu-kv-k">Защита</span>
                                <span className="gu-kv-v">{pa.ingressProtectionRu || 'Базовая'}</span>
                              </div>
                            </div>
                            {pa.components.length > 0 && (
                              <div className="gu-kv" style={{ gap: 3 }}>
                                <span className="gu-kv-k">Комплектующие ({pa.components.length})</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, marginTop: 2 }}>
                                  {pa.components.slice(0, 6).map((c) => (
                                    <div key={`${c.slot}-${c.itemId}`} style={{ fontSize: 10.5, lineHeight: 1.3, color: 'var(--gu-ink-soft)' }}>
                                      <strong style={{ color: '#fff' }}>{c.slotNameRu}:</strong> {c.attributes.brand} {c.attributes.model}{' '}
                                      <span className="gu-num" style={{ color: '#e0ab45', fontSize: 9.5 }}>[{c.itemId}]</span>
                                    </div>
                                  ))}
                                  {pa.components.length > 6 && (
                                    <div style={{ fontSize: 10, color: 'var(--gu-mut)' }}>
                                      И ещё {pa.components.length - 6} модулей внутри
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      if (ha) {
                        const specEntries = Object.entries(ha.specs || {}).slice(0, 4);
                        return (
                          <div className="gu-kv-grid gu-g2 gu-kv-compact" style={{ marginTop: 2 }}>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Марка</span>
                              <span className="gu-kv-v">{ha.brand}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Модель</span>
                              <span className="gu-kv-v">{ha.model}</span>
                            </div>
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Цвет (RGB)</span>
                              <span className="gu-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', whiteSpace: 'normal' }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ha.colorHex, border: '1px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                                <span>{ha.colorNameRu}</span>
                                <span className="gu-num" style={{ fontSize: 10.5, color: 'var(--gu-mut)' }}>{formatRgbString(ha.colorRgb)}</span>
                              </span>
                            </div>
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Подключение</span>
                              <span className="gu-kv-v" style={{ whiteSpace: 'normal' }}>{ha.connectorRu}</span>
                            </div>
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Из чего</span>
                              <span className="gu-kv-v" style={{ whiteSpace: 'normal' }}>{ha.materialRu}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Размер</span>
                              <span className="gu-kv-v gu-num">{ha.dimensionsRu}</span>
                            </div>
                            <div className="gu-kv">
                              <span className="gu-kv-k">Вес / Объём</span>
                              <span className="gu-kv-v gu-num">{ha.weightGrams} г · {ha.volumeL} л</span>
                            </div>
                            {specEntries.map(([k, v]) => (
                              <div className="gu-kv" key={k}>
                                <span className="gu-kv-k">{k}</span>
                                <span className="gu-kv-v gu-num">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      const hasSpecs = Boolean(
                        innerItems ||
                        liq ||
                        uAttrs.physicalFormRu ||
                        materialName ||
                        uAttrs.coatingRu ||
                        capacityLabel ||
                        colorName ||
                        uAttrs.patternRu ||
                        shapeName ||
                        uAttrs.dimensionCm ||
                        uAttrs.lidRu ||
                        uAttrs.handleRu ||
                        uAttrs.featureRu ||
                        uAttrs.grainGradeRu ||
                        uAttrs.cookingTimeMin ||
                        uAttrs.proteinPer100g !== undefined ||
                        uAttrs.surfaceTextureRu ||
                        uAttrs.glutenFree ||
                        ingText
                      );
                      if (!hasSpecs) return null;

                      return (
                        <div className="gu-kv-grid gu-g2 gu-kv-compact" style={{ marginTop: 2 }}>
                          {innerItems && (
                            <>
                              <div className="gu-kv">
                                <span className="gu-kv-k">Упаковка</span>
                                <span className="gu-kv-v">{containerDef?.nameRu || preview.itemId}</span>
                              </div>
                              <div className="gu-kv">
                                <span className="gu-kv-k">Внутри</span>
                                <span className="gu-kv-v">{innerSummary}</span>
                              </div>
                            </>
                          )}
                          {liq && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">
                                {fs?.liquidId === 'detergent'
                                  ? (isDryFluid ? 'Сыпучее средство' : 'Жидкое средство')
                                  : 'Сыпучее / Вещество'}
                              </span>
                              <span className="gu-kv-v">{uAttrs.varietyRu || liq.nameRu}</span>
                            </div>
                          )}
                          {uAttrs.physicalFormRu && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Форма средства</span>
                              <span className="gu-kv-v">{uAttrs.physicalFormRu}</span>
                            </div>
                          )}
                          {materialName && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Материал</span>
                              <span className="gu-kv-v">{materialName}</span>
                            </div>
                          )}
                          {capacityLabel && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Вмещает объём</span>
                              <span className="gu-kv-v gu-num">{capacityLabel}</span>
                            </div>
                          )}
                          {uAttrs.coatingRu && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Покрытие</span>
                              <span className="gu-kv-v">{uAttrs.coatingRu}</span>
                            </div>
                          )}
                          {uAttrs.dimensionCm && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Габарит</span>
                              <span className="gu-kv-v gu-num">{uAttrs.dimensionCm} см</span>
                            </div>
                          )}
                          {colorName && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Цвет</span>
                              <span className="gu-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'normal' }}>
                                {colorHex && (
                                  <span
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: 3,
                                      backgroundColor: colorHex,
                                      border: '1px solid rgba(255,255,255,0.28)',
                                      flexShrink: 0
                                    }}
                                  />
                                )}
                                <span>{colorName}</span>
                              </span>
                            </div>
                          )}
                          {uAttrs.patternRu && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Узор</span>
                              <span className="gu-kv-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'normal' }}>
                                {uAttrs.patternColor && (
                                  <span
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: 3,
                                      backgroundColor: uAttrs.patternColor,
                                      border: '1px solid rgba(255,255,255,0.28)',
                                      flexShrink: 0
                                    }}
                                  />
                                )}
                                <span>{uAttrs.patternRu}</span>
                              </span>
                            </div>
                          )}
                          {uAttrs.cookingTimeMin && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Варка</span>
                              <span className="gu-kv-v">{uAttrs.cookingTimeMin}</span>
                            </div>
                          )}
                          {shapeName && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Форма</span>
                              <span className="gu-kv-v" style={{ whiteSpace: 'normal' }}>{shapeName}</span>
                            </div>
                          )}
                          {uAttrs.lidRu && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Крышка</span>
                              <span className="gu-kv-v">{uAttrs.lidRu}</span>
                            </div>
                          )}
                          {uAttrs.handleRu && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Ручка</span>
                              <span className="gu-kv-v">{uAttrs.handleRu}</span>
                            </div>
                          )}
                          {uAttrs.featureRu && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Особенности</span>
                              <span className="gu-kv-v" style={{ whiteSpace: 'normal' }}>{uAttrs.featureRu}</span>
                            </div>
                          )}
                          {uAttrs.grainGradeRu && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Сорт / Группа</span>
                              <span className="gu-kv-v" style={{ whiteSpace: 'normal' }}>{uAttrs.grainGradeRu}</span>
                            </div>
                          )}
                          {uAttrs.proteinPer100g !== undefined && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Белок (100г)</span>
                              <span className="gu-kv-v">{uAttrs.proteinPer100g} г</span>
                            </div>
                          )}
                          {uAttrs.glutenFree !== undefined && (
                            <div className="gu-kv">
                              <span className="gu-kv-k">Глютен</span>
                              <span className="gu-kv-v">{uAttrs.glutenFree ? 'Без глютена' : 'Содержит глютен'}</span>
                            </div>
                          )}
                          {uAttrs.surfaceTextureRu && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Поверхность</span>
                              <span className="gu-kv-v" style={{ whiteSpace: 'normal' }}>{uAttrs.surfaceTextureRu}</span>
                            </div>
                          )}
                          {ingText && (
                            <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                              <span className="gu-kv-k">Из чего</span>
                              <span className="gu-kv-v" style={{ fontSize: 11, lineHeight: 1.3, color: 'var(--gu-ink-soft)', whiteSpace: 'normal' }}>
                                {ingText}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="gu-row-between" style={{ paddingTop: 2 }}>
                      {qtyInCart > 0 ? (
                        <>
                          <span style={{ fontSize: 12, color: 'var(--gu-mut)' }}>
                            В корзине: <b className="gu-num">{qtyInCart} шт.</b>
                          </span>
                          <div className="gu-shop-qty">
                            <button type="button" onClick={() => handleRemoveOneFromCart(activeInspectedItem.id)}>
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span>{qtyInCart}</span>
                            <button type="button" className="is-plus" onClick={() => handleAddToCart(activeInspectedItem)}>
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(activeInspectedItem)}
                          className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>В корзину · {activeInspectedItem.price.toLocaleString()} ₽</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Live Mini-Cart Receipt Panel */}
              <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="gu-row-between">
                  <span className="gu-grp">Чек ({totalCartItemsCount})</span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="gu-btn gu-btn-ghost gu-btn-xs"
                    >
                      <Trash2 className="w-3 h-3" /> Очистить
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--gu-mut)', padding: '6px 0' }}>
                    Корзина пуста. Нажмите «Купить» напротив нужного товара.
                  </div>
                ) : (
                  <>
                    <div className="gu-shop-mini-list">
                      {cart.map((entry) => (
                        <div key={entry.item.id} className="gu-shop-mini-item">
                          <span className="gu-shop-mini-item-name" title={entry.item.nameRu}>
                            {entry.item.nameRu}
                          </span>
                          <span className="gu-shop-mini-item-qty">×{entry.count}</span>
                          <span className="gu-shop-mini-item-sum">
                            {(entry.item.price * entry.count).toLocaleString()} ₽
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      className="gu-row-between"
                      style={{ paddingTop: 6, borderTop: '1px solid var(--gu-line)' }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--gu-mut)' }}>Итого</span>
                      <span className="gu-shop-price" style={{ fontSize: 20 }}>
                        {cartTotal.toLocaleString()}
                        <small>₽</small>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('pos')}
                      className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Перейти к оплате</span>
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* DIAGNOSTICS TAB */}
      {normalizedTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Vehicle Connection Header Panel */}
          <div className="gu-panel gu-pad gu-row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="gu-row" style={{ gap: 10 }}>
              <div className="gu-ico">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="gu-row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    {currentVehicle ? (currentVehicle.nameRu || currentVehicle.type) : 'Автомобиль не подключен'}
                  </span>
                  {currentVehicle && (
                    <span className="gu-code">{currentVehicle.licensePlate || 'БЕЗ НОМЕРА'}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gu-mut)', marginTop: 2 }}>
                  {currentVehicle
                    ? 'Электронный блок управления (ECU) подключен по шине OBD-II'
                    : 'Подгоните автомобиль к боксу мастерской для считывания телеметрии'}
                </div>
              </div>
            </div>

            {currentVehicle && (
              <button
                type="button"
                disabled={isScanningEcu}
                onClick={handleScanEcu}
                className="gu-btn gu-btn-p gu-btn-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningEcu ? 'gu-spin' : ''}`} />
                <span>{isScanningEcu ? 'Сканирование...' : 'Сканировать OBD-II'}</span>
              </button>
            )}
          </div>

          {!currentVehicle ? (
            <div className="gu-empty">
              <Car className="w-8 h-8" />
              <div className="gu-empty-t">Транспортное средство не обнаружено в рабочей зоне</div>
              <div style={{ fontSize: 13, maxWidth: 460 }}>
                Загоните автомобиль на эстакаду или припаркуйтесь у ворот сервиса, чтобы считать показания датчиков и коды неисправностей ЭБУ.
              </div>
            </div>
          ) : (
            <>
              {/* OBD-II Fault Codes / DTC Section */}
              <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="gu-row-between">
                  <span className="gu-grp">Журнал кодов неисправностей OBD-II (DTC)</span>
                  <span className={`gu-tag ${dtcErrors.length === 0 ? 'good' : 'bad'}`}>
                    {dtcErrors.length === 0 ? 'Ошибок нет' : `Кодов: ${dtcErrors.length}`}
                  </span>
                </div>

                {dtcErrors.length === 0 ? (
                  <div className="gu-note gu-ok" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Все электронные системы, датчики и исполнительные механизмы функционируют штатно.</span>
                  </div>
                ) : (
                  <div className="gu-li-list">
                    {dtcErrors.map((err, idx) => (
                      <div key={idx} className="gu-item">
                        <AlertTriangle
                          className="w-4 h-4 shrink-0"
                          style={{
                            color: err.severity === 'critical' ? 'var(--gu-bad)' : 'var(--gu-amber-hi)',
                          }}
                        />
                        <div className="gu-item-main">
                          <div className="gu-row" style={{ gap: 8 }}>
                            <span className="gu-code" style={{ padding: '2px 6px', fontSize: 11 }}>{err.code}</span>
                            <span className="gu-item-title">{err.title}</span>
                            <span className={`gu-tag ${err.severity === 'critical' ? 'bad' : 'warn'}`}>
                              {err.severity === 'critical' ? 'Критично' : 'Внимание'}
                            </span>
                          </div>
                          <div className="gu-item-sub">{err.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4 Telemetry Modules Grid */}
              <div className="gu-grid gu-g2">
                {/* 1. Engine & Fluids */}
                <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="gu-row" style={{ gap: 6 }}>
                    <Gauge className="w-4 h-4" style={{ color: 'var(--gu-amber-hi)' }} />
                    <span className="gu-grp">ДВС и Техжидкости</span>
                  </div>

                  <div>
                    <div className="gu-row-between" style={{ fontSize: 12, marginBottom: 4 }}>
                      <span className="gu-mute">Ресурс ЦПГ двигателя</span>
                      <b className="gu-num">
                        {Math.round(currentVehicle.engineState?.engineHealth ?? 100)}%
                      </b>
                    </div>
                    <div
                      className={`gu-bar ${
                        (currentVehicle.engineState?.engineHealth ?? 100) < 50 ? 'bad' : 'good'
                      }`}
                    >
                      <span
                        style={{
                          width: `${Math.max(5, Math.min(100, currentVehicle.engineState?.engineHealth ?? 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="gu-kv-grid">
                    <div className="gu-kv">
                      <span className="gu-kv-k">Моторное масло</span>
                      <span className="gu-kv-v">
                        {Math.round(currentVehicle.engineState?.oilLevel ?? 100)}%
                        {currentVehicle.engineState?.oilPunctured ? ' · Пробой' : ''}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Охлаждающая жидкость</span>
                      <span className="gu-kv-v">
                        {Math.round(currentVehicle.engineState?.radiatorWater ?? 100)}%
                        {currentVehicle.engineState?.radiatorPunctured ? ' · Течь' : ''}
                      </span>
                    </div>
                    <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                      <span className="gu-kv-k">Блок цилиндров</span>
                      <span
                        className="gu-kv-v"
                        style={{
                          color: currentVehicle.engineState?.isSeized ? 'var(--gu-bad)' : 'var(--gu-good)',
                        }}
                      >
                        {currentVehicle.engineState?.isSeized ? 'КЛИН ДВИГАТЕЛЯ' : 'Исправен, вращение штатное'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Suspension & Alignment */}
                <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="gu-row" style={{ gap: 6 }}>
                    <Disc className="w-4 h-4" style={{ color: 'var(--gu-good)' }} />
                    <span className="gu-grp">Ходовая и Сход-развал</span>
                  </div>

                  <div className="gu-kv-grid">
                    <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                      <span className="gu-kv-k">Увод руля (развал-схождение)</span>
                      <span className="gu-kv-v">
                        {Math.abs(currentVehicle.damage?.steeringDrift || 0) < 0.01
                          ? 'Идеально (0.0°)'
                          : `${((currentVehicle.damage?.steeringDrift || 0) * 10).toFixed(1)}° ${
                              (currentVehicle.damage?.steeringDrift || 0) < 0 ? 'влево' : 'вправо'
                            }`}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Стойка передняя Л</span>
                      <span className="gu-kv-v">
                        {100 - Math.round((currentVehicle.damage?.frontLeftSuspensionDamage || 0) * 100)}%
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Стойка передняя П</span>
                      <span className="gu-kv-v">
                        {100 - Math.round((currentVehicle.damage?.frontRightSuspensionDamage || 0) * 100)}%
                      </span>
                    </div>
                    <div className="gu-kv" style={{ gridColumn: '1 / -1' }}>
                      <span className="gu-kv-k">Конфигурация шасси</span>
                      <span className="gu-kv-v" style={{ color: 'var(--gu-amber-soft)' }}>
                        {isHeavySuspended ? 'Bilstein HD (Усиленная)' : 'Заводская подвеска'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Electrical & Fuel */}
                <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="gu-row" style={{ gap: 6 }}>
                    <Zap className="w-4 h-4" style={{ color: 'var(--gu-amber-hi)' }} />
                    <span className="gu-grp">Электрика и Топливо</span>
                  </div>

                  <div className="gu-kv-grid">
                    <div className="gu-kv">
                      <span className="gu-kv-k">Заряд АКБ</span>
                      <span className="gu-kv-v">{Math.round(currentVehicle.engineState?.batteryCharge ?? 100)}%</span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Стартер / Генератор</span>
                      <span className="gu-kv-v">
                        {currentVehicle.engineState?.starterWorking === false
                          ? 'Отказ стартера'
                          : currentVehicle.engineState?.alternatorWorking === false
                            ? 'Отказ генератора'
                            : 'Штатно'}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Питание / Наддув</span>
                      <span className="gu-kv-v">
                        {currentVehicle.engineState?.fuelInjectorPumpDamaged
                          ? 'Поврежден ТНВД/Рампа'
                          : (currentVehicle.engineState?.turboHealth ?? 100) < 75
                            ? `Турбо ${Math.round(currentVehicle.engineState?.turboHealth ?? 100)}%`
                            : currentVehicle.fuelSystem?.hasLPG
                              ? (currentVehicle.engineState?.gboReducerDamaged ? 'Редуктор ГБО поврежден' : 'Бензин + ГБО 4')
                              : 'Штатная'}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">ЭБУ / Впуск</span>
                      <span className="gu-kv-v" style={{ color: (currentVehicle.engineState?.ecuDamaged || currentVehicle.engineState?.airIntakeDamaged) ? 'var(--gu-bad)' : 'var(--gu-amber-soft)' }}>
                        {currentVehicle.engineState?.ecuDamaged
                          ? 'Сбой ЭБУ'
                          : currentVehicle.engineState?.airIntakeDamaged
                            ? 'Замят впуск'
                            : isChiptuned ? 'Stage 1 (+15% л.с.)' : 'Заводской сток'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Body & Optics */}
                <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="gu-row" style={{ gap: 6 }}>
                    <ShieldCheck className="w-4 h-4" style={{ color: 'var(--gu-good)' }} />
                    <span className="gu-grp">Кузов и Оптика</span>
                  </div>

                  <div className="gu-kv-grid">
                    <div className="gu-kv">
                      <span className="gu-kv-k">Геометрия кузова</span>
                      <span className="gu-kv-v">
                        {(currentVehicle.damage?.frontCrumple || 0) + (currentVehicle.damage?.rearCrumple || 0) > 2
                          ? 'Деформирован'
                          : 'В допуске'}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Лобовое стекло</span>
                      <span className="gu-kv-v">
                        {currentVehicle.damage?.windshieldCracked ? 'Трещина триплекса' : 'Целое'}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Головной свет</span>
                      <span className="gu-kv-v">
                        {currentVehicle.damage?.leftHeadlightBroken || currentVehicle.damage?.rightHeadlightBroken
                          ? 'Разбита фара'
                          : 'Исправен'}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Камера ЗВ</span>
                      <span className="gu-kv-v">{hasCameraInstalled ? 'Установлена' : 'Отсутствует'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="gu-card-sm gu-row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--gu-mut)' }}>
                  Перейдите к оформлению наряд-заказа для ремонта или в цех дооснащения:
                </span>
                <div className="gu-row" style={{ gap: 8 }}>
                  <button type="button" onClick={() => setActiveTab('repair')} className="gu-btn gu-btn-s gu-btn-sm">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Починка и ТО ({getActiveRepairs().length})</span>
                  </button>
                  <button type="button" onClick={() => setActiveTab('tuning')} className="gu-btn gu-btn-p gu-btn-sm">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Тюнинг и Окраска</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}


      {/* REPAIR & SERVICE TAB */}
      {normalizedTab === 'repair' && (
        <div className="gu-grp">
          {repairActionMessage && (
            <div className="gu-note good">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="gu-note-body">{repairActionMessage}</div>
            </div>
          )}

          <div className="gu-panel gu-pad gu-row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="gu-row" style={{ gap: 10 }}>
              <div className="gu-ico">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gu-fg-0)' }}>
                  Слесарный ремонт и Техническое обслуживание
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--gu-fg-2)', marginTop: 1 }}>
                  {currentVehicle
                    ? `Автомобиль на подъемнике: ${currentVehicle.nameRu || currentVehicle.type}`
                    : 'Подгоните ТС в бокс СТО для формирования дефектовочной ведомости'}
                </div>
              </div>
            </div>

            {currentVehicle && (
              <div className="gu-pill is-on">
                <span>Наличные:</span>
                <b className="gu-num">{playerCash.toLocaleString()} ₽</b>
              </div>
            )}
          </div>

          {!currentVehicle ? (
            <div className="gu-empty">
              <Car className="gu-empty-ic" />
              <div className="gu-empty-t">Транспортное средство не обнаружено на подъемнике</div>
              <div className="gu-empty-s">
                Загоните вашу машину в бокс автосервиса, чтобы механики провели дефектовку узлов и сформировали наряд-заказ.
              </div>
            </div>
          ) : isRepairing ? (
            <div className="gu-panel gu-pad gu-grp">
              <div className="gu-sec" style={{ marginBottom: 0 }}>
                <Cpu className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--gu-info)' }} />
                <span>Пост СТО — Выполнение регламентных работ</span>
                <span className="gu-sec-line" />
                <span className="gu-code">
                  Этап {currentRepairStep} / {totalRepairStepsCount}
                </span>
              </div>

              <div className="gu-shop-terminal">
                {repairLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.startsWith('>>>')
                        ? 'is-step'
                        : log.includes('[ОК]') || log.includes('УСПЕШНО')
                        ? 'is-ok'
                        : ''
                    }
                  >
                    {log}
                  </div>
                ))}
                <div className="is-step">_</div>
              </div>

              <div>
                <div className="gu-row-between" style={{ fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: 'var(--gu-fg-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Готовность наряд-заказа
                  </span>
                  <b className="gu-num" style={{ color: 'var(--gu-accent)' }}>
                    {Math.round((currentRepairStep / (totalRepairStepsCount || 1)) * 100)}%
                  </b>
                </div>
                <div className="gu-bar">
                  <span style={{ width: `${(currentRepairStep / (totalRepairStepsCount || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <>
              {getActiveRepairs().length === 0 ? (
                <div className="gu-empty">
                  <CheckCircle2 className="gu-empty-ic" style={{ color: 'var(--gu-ok)', opacity: 0.85 }} />
                  <div className="gu-empty-t">Дефектовка завершена — неисправностей не выявлено</div>
                  <div className="gu-empty-s">
                    Все агрегаты, кузовные панели, техжидкости и углы установки колес находятся в заводском допуске.
                  </div>
                </div>
              ) : (
                <div className="gu-grp">
                  <div className="gu-sec" style={{ marginBottom: 0 }}>
                    <span>Дефектовочная ведомость к оплате</span>
                    <span className="gu-sec-line" />
                    <span className="gu-tag warn">Позиций: {getActiveRepairs().length}</span>
                  </div>

                  <div className="gu-shop-grid">
                    {getActiveRepairs().map((rep) => (
                      <div key={rep.id} className="gu-shop-item">
                        <div className="gu-ic" style={{ width: 34, height: 34 }}>
                          <Wrench className="w-4 h-4" style={{ color: 'var(--gu-accent)' }} />
                        </div>
                        <div className="gu-shop-item-main">
                          <div className="gu-shop-item-name">{rep.title}</div>
                          <div className="gu-shop-item-meta">
                            <span>{rep.desc}</span>
                          </div>
                        </div>
                        <div className="gu-shop-item-right">
                          <div className="gu-shop-price">
                            {rep.price.toLocaleString()}
                            <small>₽</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="gu-panel gu-pad gu-row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--gu-fg-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Итоговая смета (запчасти + работа)
                      </div>
                      <div className="gu-shop-price" style={{ fontSize: 21, marginTop: 2 }}>
                        {getActiveRepairs().reduce((sum, r) => sum + r.price, 0).toLocaleString()}
                        <small>₽</small>
                      </div>
                    </div>

                    <div className="gu-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                      {playerCash < getActiveRepairs().reduce((sum, r) => sum + r.price, 0) && (
                        <span className="gu-tag bad">Недостаточно наличных средств</span>
                      )}
                      <button
                        type="button"
                        disabled={playerCash < getActiveRepairs().reduce((sum, r) => sum + r.price, 0)}
                        onClick={handleFullRepair}
                        className="gu-btn gu-btn-p"
                      >
                        <Wrench className="w-4 h-4" />
                        <span>Утвердить наряд-заказ и начать ремонт</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TUNING & UPGRADES TAB */}
      {normalizedTab === 'tuning' && (
        <div className="gu-grp">
          <div className="gu-panel gu-pad gu-row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="gu-row" style={{ gap: 10 }}>
              <div className="gu-ico">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gu-fg-0)' }}>
                  Дооснащение, Инжиниринг и Малярный цех
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--gu-fg-2)', marginTop: 1 }}>
                  {currentVehicle
                    ? `Объект модернизации: ${currentVehicle.nameRu || currentVehicle.type}`
                    : 'Припаркуйте автомобиль в боксе мастерской для установки дополнительного оборудования'}
                </div>
              </div>
            </div>
          </div>

          {!currentVehicle ? (
            <div className="gu-empty">
              <Car className="gu-empty-ic" />
              <div className="gu-empty-t">Транспортное средство не обнаружено в боксе</div>
              <div className="gu-empty-s">
                Загоните автомобиль в сервисную зону для калибровки ЭБУ Stage 1, монтажа подвески Bilstein HD, ГБО 4-го поколения или перекраски кузова.
              </div>
            </div>
          ) : (
            <div className="gu-grp">
              <div className="gu-grid gu-g2">
                {/* 1. Stage 1 ECU Remap */}
                <div className="gu-panel gu-pad gu-grp" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="gu-row-between" style={{ marginBottom: 6 }}>
                      <div className="gu-row" style={{ gap: 6 }}>
                        <Gauge className="w-4 h-4" style={{ color: 'var(--gu-accent)' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gu-fg-0)' }}>
                          Чип-тюнинг ЭБУ Stage 1
                        </span>
                      </div>
                      <span className={`gu-tag ${isChiptuned ? 'good' : 'warn'}`}>
                        {isChiptuned ? 'Установлено' : '+15% Мощности'}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--gu-fg-2)', lineHeight: 1.4, margin: 0 }}>
                      Калибровка топливных карт и углов опережения зажигания. Повышает крутящий момент на +15% и убирает задержку педали акселератора.
                    </p>
                  </div>

                  <div className="gu-row-between" style={{ paddingTop: 8, borderTop: '1px solid var(--gu-line-subtle)' }}>
                    <div className="gu-shop-price">
                      {CHIPTUNING_PRICE.toLocaleString()}
                      <small>₽</small>
                    </div>
                    <button
                      type="button"
                      disabled={installingChiptuning || isChiptuned || playerCash < CHIPTUNING_PRICE}
                      onClick={handleInstallChiptuning}
                      className={`gu-btn ${isChiptuned ? 'gu-btn-s' : 'gu-btn-p'} gu-btn-sm`}
                    >
                      {installingChiptuning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Запись {chiptuningProgress}%</span>
                        </>
                      ) : isChiptuned ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Прошито</span>
                        </>
                      ) : (
                        <span>Прошить Stage 1</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Bilstein HD Suspension */}
                <div className="gu-panel gu-pad gu-grp" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="gu-row-between" style={{ marginBottom: 6 }}>
                      <div className="gu-row" style={{ gap: 6 }}>
                        <Disc className="w-4 h-4" style={{ color: 'var(--gu-info)' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gu-fg-0)' }}>
                          Подвеска Bilstein B6 HD
                        </span>
                      </div>
                      <span className={`gu-tag ${isHeavySuspended ? 'good' : ''}`}>
                        {isHeavySuspended ? 'Установлено' : 'Износ −40%'}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--gu-fg-2)', lineHeight: 1.4, margin: 0 }}>
                      Однотрубные газомасляные амортизаторы и усиленные пружины. Предотвращают пробои на пересеченной местности и снижают износ ходовой на 40%.
                    </p>
                  </div>

                  <div className="gu-row-between" style={{ paddingTop: 8, borderTop: '1px solid var(--gu-line-subtle)' }}>
                    <div className="gu-shop-price">
                      {SUSPENSION_PRICE.toLocaleString()}
                      <small>₽</small>
                    </div>
                    <button
                      type="button"
                      disabled={installingSuspension || isHeavySuspended || playerCash < SUSPENSION_PRICE}
                      onClick={handleInstallSuspension}
                      className={`gu-btn ${isHeavySuspended ? 'gu-btn-s' : 'gu-btn-p'} gu-btn-sm`}
                    >
                      {installingSuspension ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Монтаж {suspensionProgress}%</span>
                        </>
                      ) : isHeavySuspended ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Установлено</span>
                        </>
                      ) : (
                        <span>Установить стойки</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. LPG System Lovato 4 */}
                <div className="gu-panel gu-pad gu-grp" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="gu-row-between" style={{ marginBottom: 6 }}>
                      <div className="gu-row" style={{ gap: 6 }}>
                        <Flame className="w-4 h-4" style={{ color: 'var(--gu-ok)' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gu-fg-0)' }}>
                          ГБО Lovato 4 (Пропан-Бутан)
                        </span>
                      </div>
                      <span className={`gu-tag ${hasLpgInstalled ? 'good' : 'warn'}`}>
                        {hasLpgInstalled
                          ? 'Установлено'
                          : lpgConfig?.isAvailable
                          ? `Баллон ${lpgConfig.capacity} л`
                          : 'Недоступно'}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--gu-fg-2)', lineHeight: 1.4, margin: 0 }}>
                      {lpgConfig?.description ||
                        'Двухтопливная система питания сжиженным газом. Позволяет переключаться между бензином и пропаном прямо из салона.'}
                    </p>
                  </div>

                  <div className="gu-row-between" style={{ paddingTop: 8, borderTop: '1px solid var(--gu-line-subtle)' }}>
                    <div className="gu-shop-price">
                      {lpgConfig ? lpgConfig.price.toLocaleString() : '35,000'}
                      <small>₽</small>
                    </div>
                    {hasLpgInstalled ? (
                      <button type="button" onClick={handleRemoveLPG} className="gu-btn gu-btn-d gu-btn-sm">
                        <span>Демонтировать ГБО</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={installingLpg || !lpgConfig?.isAvailable || playerCash < (lpgConfig?.price || 35000)}
                        onClick={handleInstallLPG}
                        className="gu-btn gu-btn-p gu-btn-sm"
                      >
                        {installingLpg ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Монтаж {lpgProgress}%</span>
                          </>
                        ) : (
                          <span>Установить ГБО</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Rearview Camera */}
                <div className="gu-panel gu-pad gu-grp" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="gu-row-between" style={{ marginBottom: 6 }}>
                      <div className="gu-row" style={{ gap: 6 }}>
                        <Video className="w-4 h-4" style={{ color: 'var(--gu-info)' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gu-fg-0)' }}>
                          Парковочная камера с разметкой
                        </span>
                      </div>
                      <span className={`gu-tag ${hasCameraInstalled ? 'good' : ''}`}>
                        {isCameraFactoryInstalled
                          ? 'Штатная'
                          : hasCameraInstalled
                          ? 'Установлена'
                          : 'Опция'}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--gu-fg-2)', lineHeight: 1.4, margin: 0 }}>
                      Широкоугольная камера заднего обзора с динамическими траекторными линиями, синхронизированными с поворотом рулевого колеса.
                    </p>
                  </div>

                  <div className="gu-row-between" style={{ paddingTop: 8, borderTop: '1px solid var(--gu-line-subtle)' }}>
                    <div className="gu-shop-price">
                      {isCameraFactoryInstalled ? 'В базе' : CAMERA_PRICE.toLocaleString()}
                      {!isCameraFactoryInstalled && <small>₽</small>}
                    </div>
                    {isCameraFactoryInstalled ? (
                      <span className="gu-tag good">Заводская комплектация</span>
                    ) : hasCameraInstalled ? (
                      <button type="button" onClick={handleRemoveCamera} className="gu-btn gu-btn-d gu-btn-sm">
                        <span>Демонтировать</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={installingCamera || playerCash < CAMERA_PRICE}
                        onClick={handleInstallCamera}
                        className="gu-btn gu-btn-p gu-btn-sm"
                      >
                        {installingCamera ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Монтаж {cameraProgress}%</span>
                          </>
                        ) : (
                          <span>Установить камеру</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Paint Booth Section */}
              <div className="gu-panel gu-pad gu-grp">
                <div className="gu-sec" style={{ marginBottom: 0 }}>
                  <Palette className="w-3.5 h-3.5" style={{ color: 'var(--gu-accent)' }} />
                  <span>Покрасочная камера (Малярный цех)</span>
                  <span className="gu-sec-line" />
                  <span className="gu-tag warn">{PAINT_PRICE.toLocaleString()} ₽ за деталь</span>
                </div>

                <div className="gu-row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div className="gu-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--gu-fg-2)', fontWeight: 600 }}>Элемент окраски:</span>
                    <Seg<'body' | 'roof'>
                      options={[
                        { v: 'body', label: 'Основной кузов' },
                        { v: 'roof', label: 'Крыша (контраст)' },
                      ]}
                      value={selectedPaintTarget}
                      onChange={(id) => setSelectedPaintTarget(id)}
                    />
                  </div>

                  <div className="gu-row" style={{ gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--gu-fg-2)' }}>Оттенок:</span>
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      style={{
                        width: 28,
                        height: 24,
                        padding: 0,
                        border: '1px solid var(--gu-line-strong)',
                        borderRadius: 2,
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>

                <div className="gu-shop-swatch-grid">
                  {PAINT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      className={`gu-shop-swatch ${
                        selectedColor.toLowerCase() === c.value.toLowerCase() ? 'is-on' : ''
                      }`}
                    >
                      <span className="gu-shop-swatch-dot" style={{ backgroundColor: c.value }} />
                      <span className="gu-shop-swatch-name">{c.name}</span>
                    </button>
                  ))}
                </div>

                <div className="gu-panel-inset gu-pad gu-row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div className="gu-row" style={{ gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 2,
                        backgroundColor: selectedColor,
                        border: '1px solid rgba(255,255,255,0.28)',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                        display: 'inline-block',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gu-fg-0)' }}>
                        Код эмали: <span className="gu-code">{selectedColor.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gu-fg-2)' }}>
                        Зона нанесения: {selectedPaintTarget === 'roof' ? 'Крыша автомобиля' : 'Основной кузов'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPainting || playerCash < PAINT_PRICE}
                    onClick={handlePaintVehicle}
                    className="gu-btn gu-btn-p gu-btn-sm"
                  >
                    {isPainting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Окраска и сушка {paintProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Palette className="w-3.5 h-3.5" />
                        <span>Покрасить за {PAINT_PRICE.toLocaleString()} ₽</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CART TAB */}
      {normalizedTab === 'cart' && (
        <div>
          {cart.length === 0 ? (
            <div className="gu-empty">
              <ShoppingCart className="w-7 h-7" />
              <div className="gu-empty-t">Ваша корзина пуста</div>
              <div style={{ fontSize: 13 }}>
                Перейдите в каталог магазина и добавьте необходимые товары для оформления покупки на кассе.
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="gu-btn gu-btn-p gu-btn-sm"
                style={{ marginTop: 4 }}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Перейти в каталог</span>
              </button>
            </div>
          ) : (
            <div className="gu-shop-cart-layout">
              {/* Left Column: Selected Cart Items */}
              <div className="gu-shop-cart-list">
                {cart.map((entry) => {
                  const cartPreview = getShopPreviewItem(entry.item);
                  const unitWeight = getItemTotalWeight(cartPreview);
                  const lineWeightStr = formatShopWeight(unitWeight * entry.count);

                  return (
                    <div key={entry.item.id} className="gu-shop-item">
                      <div className="gu-ic">
                        <ItemIconCanvas itemId={cartPreview.itemId} item={cartPreview} size={36} />
                      </div>
                      <div className="gu-shop-item-main">
                        <div className="gu-shop-item-name">{entry.item.nameRu}</div>
                        <div className="gu-shop-item-meta">
                          <span>{entry.item.price.toLocaleString()} ₽ / шт.</span>
                          {lineWeightStr && (
                            <>
                              <span>·</span>
                              <span>{lineWeightStr}</span>
                            </>
                          )}
                          {entry.item.description && (
                            <>
                              <span>·</span>
                              <span>{entry.item.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="gu-shop-item-right">
                        <div className="gu-shop-qty">
                          <button type="button" onClick={() => handleRemoveOneFromCart(entry.item.id)}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span>{entry.count}</span>
                          <button type="button" className="is-plus" onClick={() => handleAddToCart(entry.item)}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div
                          className="gu-shop-price"
                          style={{ minWidth: 74, textAlign: 'right' }}
                        >
                          {(entry.item.price * entry.count).toLocaleString()}
                          <small>₽</small>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Sticky Receipt Summary */}
              <aside className="gu-shop-cart-summary">
                <div className="gu-row-between">
                  <span className="gu-grp">Сводка заказа</span>
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="gu-btn gu-btn-ghost gu-btn-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Очистить</span>
                  </button>
                </div>

                <div className="gu-kv-grid">
                  <div className="gu-kv">
                    <span className="gu-kv-k">Позиций</span>
                    <span className="gu-kv-v">{totalCartItemsCount} шт.</span>
                  </div>
                  <div className="gu-kv">
                    <span className="gu-kv-k">Общий вес</span>
                    <span className="gu-kv-v">{formatShopWeight(totalCartWeightKg) || '—'}</span>
                  </div>
                </div>

                {(() => {
                  const carrierBagItem = catalog.find(
                    (it) => it.itemId === 'plastic_bag' && !(it.contents && it.contents.length > 0)
                  );
                  const carrierBagsCount = cart.reduce(
                    (sum, entry) =>
                      entry.item.itemId === 'plastic_bag' && !(entry.item.contents && entry.item.contents.length > 0)
                        ? sum + entry.count
                        : sum,
                    0
                  );
                  if (!carrierBagItem) return null;
                  return (
                    <div
                      className="gu-panel-inset"
                      style={{
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        border: carrierBagsCount > 0 ? '1px solid rgba(201, 146, 43, 0.4)' : undefined,
                      }}
                    >
                      <div className="gu-row-between" style={{ gap: 8 }}>
                        <div className="gu-row" style={{ gap: 6, minWidth: 0 }}>
                          <ShoppingBag className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--gu-accent)' }} />
                          <span style={{ fontSize: 11.5, color: 'var(--gu-fg-1)', fontWeight: 600 }}>
                            {carrierBagsCount > 0
                              ? `Пакеты: ${carrierBagsCount} шт. (товар внутрь)`
                              : 'Упаковка покупок'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(carrierBagItem)}
                          className="gu-btn gu-btn-s gu-btn-xs"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Пакет ({carrierBagItem.price} ₽)</span>
                        </button>
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--gu-mut)', lineHeight: 1.3 }}>
                        Штучные овощи, фрукты, ягоды и грибы фасуются по мешочкам. Взятые пакеты-майки заполнятся товаром автоматически.
                      </span>
                    </div>
                  );
                })()}

                <div
                  className="gu-row-between"
                  style={{ paddingTop: 8, borderTop: '1px solid var(--gu-line)' }}
                >
                  <span style={{ fontSize: 12, color: 'var(--gu-mut)' }}>К оплате</span>
                  <div className="gu-shop-price" style={{ fontSize: 22 }}>
                    {cartTotal.toLocaleString()}
                    <small>₽</small>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pos')}
                    className="gu-btn gu-btn-p gu-btn-sm gu-btn-block"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Перейти на кассу</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="gu-btn gu-btn-s gu-btn-sm gu-btn-block"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Вернуться в каталог</span>
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      )}

      {/* POS CASHIER PAYMENT TERMINAL */}
      {normalizedTab === 'pos' && (
        <div className="gu-shop-pos-grid">
          {/* Left Column: Cashier Display + Money Tray + Final Pay Button */}
          <div className="gu-shop-pos-col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="gu-sec" style={{ marginBottom: 0 }}>
                <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--gu-accent)' }} />
                <span>Касса · Оплата ({totalCartItemsCount} ед.)</span>
                <span className="gu-sec-line" />
                <button
                  type="button"
                  onClick={() => setActiveTab('cart')}
                  className="gu-btn gu-btn-ghost gu-btn-xs"
                  style={{ height: 22 }}
                >
                  <ArrowLeft className="w-3 h-3" /> К корзине
                </button>
              </div>

              <div className="gu-shop-pos-kpis">
                <div className="gu-shop-pos-kpi">
                  <span className="gu-shop-pos-kpi-k">Сумма чека</span>
                  <span className="gu-shop-pos-kpi-v is-amber">{cartTotal.toLocaleString()} ₽</span>
                </div>
                <div className="gu-shop-pos-kpi">
                  <span className="gu-shop-pos-kpi-k">В лотке</span>
                  <span className="gu-shop-pos-kpi-v is-ok">{inTrayMoney.toLocaleString()} ₽</span>
                </div>
                <div className="gu-shop-pos-kpi">
                  <span className="gu-shop-pos-kpi-k">
                    {inTrayMoney >= cartTotal ? 'Сдача' : 'Остаток'}
                  </span>
                  <span className={`gu-shop-pos-kpi-v ${inTrayMoney >= cartTotal ? 'is-ok' : ''}`}>
                    {inTrayMoney >= cartTotal
                      ? `${(inTrayMoney - cartTotal).toLocaleString()} ₽`
                      : `${(cartTotal - inTrayMoney).toLocaleString()} ₽`}
                  </span>
                </div>
              </div>

              {/* Quick Exact Pay & Reset Buttons */}
              <div className="gu-row" style={{ gap: 6 }}>
                <button
                  type="button"
                  disabled={playerCash < cartTotal}
                  onClick={handleExactTrayMoney}
                  className="gu-btn gu-btn-s gu-btn-sm"
                  style={{ flex: 1, height: 30 }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gu-accent)' }} />
                  <span>Без сдачи ({cartTotal.toLocaleString()} ₽)</span>
                </button>
                {Object.keys(trayDenoms).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTray}
                    className="gu-btn gu-btn-ghost gu-btn-sm"
                    style={{ height: 30 }}
                  >
                    <span>Очистить лоток</span>
                  </button>
                )}
              </div>

              {/* Cashier Tray — 3-column grid with fixed max-height so Pay button never overflows */}
              <div className="gu-shop-tray-box">
                <div className="gu-row-between" style={{ fontSize: 10, color: 'var(--gu-fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span>Купюры и монеты в лотке</span>
                  <span className="gu-num">{inTrayMoney.toLocaleString()} ₽</span>
                </div>

                {Object.keys(trayDenoms).length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--gu-fg-3)', padding: '3px 0', textAlign: 'center' }}>
                    Лоток пуст — выберите купюры справа или нажмите «Без сдачи»
                  </div>
                ) : (
                  <div className="gu-shop-tray-chips">
                    {Object.entries(trayDenoms).map(([itemId, count]) => {
                      const denom = playerDenoms.find((d) => d.itemId === itemId);
                      if (!denom || count <= 0) return null;
                      return (
                        <div key={itemId} className="gu-shop-tray-chip">
                          <div className="gu-row" style={{ gap: 4, minWidth: 0 }}>
                            <ItemIconCanvas itemId={itemId} size={15} />
                            <b style={{ whiteSpace: 'nowrap' }}>{denom.nameRu}</b>
                            <span className="gu-num" style={{ color: 'var(--gu-fg-2)' }}>×{count}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTrayDenom(itemId)}
                            title="Убрать одну купюру/монету"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {playerCash < cartTotal && (
                <div className="gu-note bad" style={{ padding: '5px 8px', fontSize: 11 }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <div className="gu-note-body">
                    Не хватает {(cartTotal - playerCash).toLocaleString()} ₽ наличными.
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={inTrayMoney < cartTotal || posSuccess}
                onClick={handleExecutePOSPayment}
                className="gu-btn gu-btn-p gu-btn-block"
                style={{ height: 34 }}
              >
                {posSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Оплата проведена — Чек закрыт</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Оплатить и забрать ({cartTotal.toLocaleString()} ₽)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Player Wallet Banknotes & Coins */}
          <div className="gu-shop-pos-col" style={{ justifyContent: 'flex-start', gap: 8 }}>
            <div>
              <div className="gu-sec" style={{ marginBottom: 5 }}>
                <span>Банкноты в кошельке</span>
                <span className="gu-sec-line" />
                <span className="gu-tag warn">Всего: {playerCash.toLocaleString()} ₽</span>
              </div>

              <div className="gu-shop-denom-grid">
                {playerDenoms
                  .filter((d) => d.type === 'banknote')
                  .map((denom) => {
                    const inTray = trayDenoms[denom.itemId] || 0;
                    const remaining = Math.max(0, denom.count - inTray);
                    const canAdd = remaining > 0;

                    return (
                      <button
                        key={denom.itemId}
                        type="button"
                        disabled={!canAdd}
                        onClick={() => handleAddTrayDenom(denom.itemId)}
                        className="gu-shop-denom"
                      >
                        <div className="gu-shop-denom-top">
                          <ItemIconCanvas itemId={denom.itemId} size={20} />
                          <span className="gu-shop-denom-val">{denom.nameRu}</span>
                        </div>
                        <span className="gu-shop-denom-cnt">×{remaining}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div>
              <div className="gu-sec" style={{ marginBottom: 5 }}>
                <span>Разменная монета</span>
                <span className="gu-sec-line" />
              </div>

              <div className="gu-shop-denom-grid">
                {playerDenoms
                  .filter((d) => d.type === 'coin')
                  .map((denom) => {
                    const inTray = trayDenoms[denom.itemId] || 0;
                    const remaining = Math.max(0, denom.count - inTray);
                    const canAdd = remaining > 0;

                    return (
                      <button
                        key={denom.itemId}
                        type="button"
                        disabled={!canAdd}
                        onClick={() => handleAddTrayDenom(denom.itemId)}
                        className="gu-shop-denom"
                      >
                        <div className="gu-shop-denom-top">
                          <ItemIconCanvas itemId={denom.itemId} size={16} />
                          <span className="gu-shop-denom-val is-coin">{denom.nameRu}</span>
                        </div>
                        <span className="gu-shop-denom-cnt">×{remaining}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
};




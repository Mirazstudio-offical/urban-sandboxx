import React, { useState, useEffect } from 'react';
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
  Palette
} from 'lucide-react';
import { sound } from '../audio';
import { getPlayerCash, getAllPlayerItemsFlat, deductPlayerCash } from '../items';
import { FUEL_GRADES } from '../gasStationSystem';
import { createDefaultVehicleDamage } from '../vehicleHelpers';

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
    nameRu: 'Супермаркет "Перекрёсток 24/7"',
    type: 'supermarket',
    x: 3442,
    y: 2685,
    icon: '[ТОРГ]',
    badgeColor: '#16a34a',
    description: 'Флагманский продуктовый супермаркет: свежие продукты, бакалея, напитки и готовая кулинария.'
  },
  {
    id: 'shop_fastfood_mall',
    nameRu: 'Ресторан "Вкусно — и точка"',
    type: 'fast_food',
    x: 3728,
    y: 2955,
    icon: '[ЕДА]',
    badgeColor: '#ef4444',
    description: 'Горячие бургеры, картофель фри, хрустящие наггетсы и прохладительные напитки.'
  },
  {
    id: 'shop_pizzeria_mall',
    nameRu: 'Пиццерия "Додо Пицца"',
    type: 'pizzeria',
    x: 3728,
    y: 2685,
    icon: '[ПИЦЦА]',
    badgeColor: '#f97316',
    description: 'Свежая горячая пицца Пепперони, Додстеры, морсы и десерты.'
  },
  {
    id: 'shop_sushi_mall',
    nameRu: 'Суши & WOK "Якитория"',
    type: 'sushi_asian',
    x: 3800,
    y: 2685,
    icon: '[СУШИ]',
    badgeColor: '#ec4899',
    description: 'Сеты роллов Филадельфия, горячая вок-лапша с курицей и зеленый чай.'
  },
  {
    id: 'shop_cinema_mall',
    nameRu: 'Кинобар "Синема Парк"',
    type: 'cinema_bar',
    x: 3880,
    y: 2685,
    icon: '[КИНО]',
    badgeColor: '#a855f7',
    description: 'Карамельный попкорн, начос с сырным соусом чеддер и прохладительные напитки.'
  },
  {
    id: 'shop_electronics_mall',
    nameRu: 'Гипермаркет электроники "М.Видео"',
    type: 'electronics',
    x: 3442,
    y: 2955,
    icon: '[ТЕХ]',
    badgeColor: '#3b82f6',
    description: 'Повербанки высокой емкости, смарт-часы, рации дальнего действия, фонари и гаджеты.'
  },
  {
    id: 'shop_clothing_mall',
    nameRu: 'Магазин одежды "Zara Fashion"',
    type: 'clothing',
    x: 3500,
    y: 2685,
    icon: '[ОДЕЖДА]',
    badgeColor: '#6366f1',
    description: 'Городская одежда, куртки Arctix, беговые кроссовки и защитные аксессуары.'
  },
  {
    id: 'shop_books_mall',
    nameRu: 'Книжный магазин "Читай-Город"',
    type: 'bookstore',
    x: 3550,
    y: 2685,
    icon: '[КНИГИ]',
    badgeColor: '#14b8a6',
    description: 'Путеводители по городу, блокноты в клетку, ручки и скотч.'
  },
  {
    id: 'shop_sports_mall',
    nameRu: 'Спортивный гипермаркет "Спортмастер"',
    type: 'sports_shop',
    x: 3600,
    y: 2685,
    icon: '[СПОРТ]',
    badgeColor: '#0ea5e9',
    description: 'Спортивная экипировка, беговые кроссовки, рюкзаки и походные фляги.'
  },
  {
    id: 'shop_pyaterochka_east',
    nameRu: 'Супермаркет "Пятёрочка 24/7" (Восточный)',
    type: 'supermarket',
    x: 7611,
    y: 3435,
    icon: '[ТОРГ]',
    badgeColor: '#f59e0b',
    description: 'Филиал супермаркета в восточном коммерческом секторе.'
  },
  {
    id: 'shop_pharmacy_hospital',
    nameRu: 'Аптека "36.6" (При больнице)',
    type: 'pharmacy',
    x: 3525,
    y: 1010,
    icon: '[МЕД]',
    badgeColor: '#10b981',
    description: 'Главный аптечный пункт в здании городской больницы.'
  },
  {
    id: 'shop_pharmacy_west',
    nameRu: 'Аптека "36.6" (Западные кварталы)',
    type: 'pharmacy',
    x: 1200,
    y: 3435,
    icon: '[МЕД]',
    badgeColor: '#10b981',
    description: 'Дежурная аптека в западном торговом комплексе.'
  },
  {
    id: 'shop_pharmacy_east',
    nameRu: 'Аптека "36.6" (Восточный район)',
    type: 'pharmacy',
    x: 6015,
    y: 3435,
    icon: '[МЕД]',
    badgeColor: '#10b981',
    description: 'Аптечный филиал в восточной части города.'
  },
  {
    id: 'shop_pharmacy_south',
    nameRu: 'Аптека "36.6" (Южный универмаг)',
    type: 'pharmacy',
    x: 2800,
    y: 5835,
    icon: '[МЕД]',
    badgeColor: '#10b981',
    description: 'Аптека в южном коммерческом центре.'
  },
  {
    id: 'shop_pitstop',
    nameRu: 'Автомастерская & Запчасти "PIT-STOP"',
    type: 'auto_shop',
    x: 3399,
    y: 2160,
    icon: '[АВТО]',
    badgeColor: '#0284c7',
    description: 'Полный сервис и ремонт авто, запчасти, инструменты и канистры.'
  },
  {
    id: 'shop_pitstop_southwest',
    nameRu: 'Автомастерская "PIT-STOP" (Юго-Западная)',
    type: 'auto_shop',
    x: 157,
    y: 5810,
    icon: '[АВТО]',
    badgeColor: '#0284c7',
    description: 'Дополнительный автосервис рядом с южным автосалоном.'
  },
  {
    id: 'shop_cafe_center',
    nameRu: 'Кафе & Пекарня "Cofix & Bakery" (Центр)',
    type: 'cafe',
    x: 4415,
    y: 3435,
    icon: '[КАФЕ]',
    badgeColor: '#f97316',
    description: 'Кофейня в центре города. Горячий кофе, капучино, круассаны и супы.'
  },
  {
    id: 'shop_cafe_west',
    nameRu: 'Кафе & Кофейня "Bean & Bistro" (Запад)',
    type: 'cafe',
    x: 389,
    y: 3435,
    icon: '[КАФЕ]',
    badgeColor: '#f97316',
    description: 'Уютный кофейный филиал в западной части города.'
  },
  {
    id: 'shop_gear',
    nameRu: 'Магазин "Охота & Туризм Сплав"',
    type: 'gear_shop',
    x: 2730,
    y: 1766,
    icon: '[ТУРИЗМ]',
    badgeColor: '#8b5cf6',
    description: 'Тактические фонари, ножи, сухпайки, спальники и походная экипировка.'
  },
  {
    id: 'shop_gas_station',
    nameRu: 'АЗС "Нефть-Магистраль 24/7" (Касса & Минимаркет)',
    type: 'gas_station_shop',
    x: 5260,
    y: 5025,
    icon: '[АЗС]',
    badgeColor: '#16a34a',
    description: 'Круглосуточный комплекс: оплата 5 видов топлива на ТРК №1-4, автотовары, канистры, масла, хот-доги, кофе и снеки.'
  }
];

export const SHOP_CATALOGS: Record<string, ShopItem[]> = {
  gas_station_shop: [
    { id: 'gas_canister_full', itemId: 'fuel_canister', nameRu: 'Канистра с бензином (20л)', price: 450, description: 'Стальная канистра, заправленная бензином АИ-95.', category: 'auto', effectText: 'Заправка авто / 20L' },
    { id: 'gas_canister_empty', itemId: 'canister_empty', nameRu: 'Пустая канистра (20л)', price: 180, description: 'Металлическая канистра для набора топлива на АЗС.', category: 'auto', effectText: 'Емкость 20L' },
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
    { id: 'gas_energy', itemId: 'energy_drink', nameRu: 'Энергетик Red Bull / Flash', price: 65, description: 'Банка ледяного энергетика с таурином и кофеином.', category: 'food', effectText: '+35% Энергия' },
    { id: 'gas_water', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в пластиковой бутылке.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'gas_chips', itemId: 'chips', nameRu: 'Картофельные чипсы', price: 40, description: 'Хрустящие чипсы с паприкой.', category: 'food', effectText: '+20% Сытость' },
    { id: 'gas_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Батончик с карамелью и арахисом.', category: 'food', effectText: '+20% Энергия' }
  ],
  supermarket: [
    { id: 'sup_water', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода в пластиковой бутылке.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'sup_bread', itemId: 'bread_loaf', nameRu: 'Батон нарезной', price: 35, description: 'Свежий белый хлеб, упакован в хрустящий целлофан.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_banana', itemId: 'banana', nameRu: 'Спелый банан', price: 25, description: 'Желтый тропический фрукт из Эквадора, сладкий.', category: 'food', effectText: '+20% Сытость, +15% Энергия' },
    { id: 'sup_apple', itemId: 'apple', nameRu: 'Сочное яблоко', price: 20, description: 'Спелое красно-зеленое яблоко, богато витаминами.', category: 'food', effectText: '+15% Сытость, +10% Гидратация' },
    { id: 'sup_juice', itemId: 'fresh_juice', nameRu: 'Апельсиновый сок (0.5L)', price: 45, description: 'Картонная коробка пастеризованного сока с мякотью.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'sup_cookies', itemId: 'cookie_pack', nameRu: 'Печенье с шоколадом', price: 50, description: 'Упаковка песочного печенья с темными каплями какао.', category: 'food', effectText: '+25% Сытость, +20% Энергия' },
    { id: 'sup_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Энергетический батончик в фольгированной обертке.', category: 'food', effectText: '+20% Энергия' },
    { id: 'sup_chips', itemId: 'chips', nameRu: 'Хрустящие картофельные чипсы', price: 40, description: 'Герметичная шуршащая пачка со вкусом паприки и соли.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_canned', itemId: 'canned_meat', nameRu: 'Армейская тушенка', price: 90, description: 'Свиной тушеный консерв в жестяной банке по ГОСТу.', category: 'food', effectText: '+60% Сытость' },
  ],
  fast_food: [
    { id: 'ff_burger', itemId: 'burger', nameRu: 'Двойной Чизбургер', price: 95, description: 'Бургер в картонной коробке: кунжутная булка, две котлеты, сыр.', category: 'food', effectText: '+50% Сытость, +25% Энергия' },
    { id: 'ff_fries', itemId: 'french_fries', nameRu: 'Картофель фри (Крупный)', price: 55, description: 'Картонный кулек горячей соленой картофельной соломки.', category: 'food', effectText: '+30% Сытость, +15% Энергия' },
    { id: 'ff_nuggets', itemId: 'nuggets', nameRu: 'Куриные наггетсы (6 шт)', price: 70, description: 'Хрустящие куриные кусочки в панировке из фритюра.', category: 'food', effectText: '+35% Сытость, +20% Энергия' },
    { id: 'ff_hotdog', itemId: 'hot_dog', nameRu: 'Датский хот-дог', price: 65, description: 'Длинная булка с поджаристой сосиской, кетчупом и горчицей.', category: 'food', effectText: '+40% Сытость' },
    { id: 'ff_colazero', itemId: 'cola_zero', nameRu: 'Кола Зеро (0.33L)', price: 40, description: 'Жестяная баночка черного газированного напитка, без сахара.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'ff_milkshake', itemId: 'milkshake', nameRu: 'Ванильный милкшейк', price: 60, description: 'Пластиковый стаканчик густого холодного молочного коктейля.', category: 'food', effectText: '+35% Гидратация, +20% Сытость' },
  ],
  pizzeria: [
    { id: 'piz_pepperoni', itemId: 'pizza_slice', nameRu: 'Кусок пиццы Пепперони', price: 60, description: 'Треугольный кусок горячего теста с пикантной колбасой.', category: 'food', effectText: '+35% Сытость, +10% Энергия' },
    { id: 'piz_croissant', itemId: 'croissant', nameRu: 'Сырный чесночный круассан', price: 45, description: 'Золотистая слоеная выпечка с пикантной начинкой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'piz_juice', itemId: 'fresh_juice', nameRu: 'Фруктовый морс', price: 40, description: 'Стакан кисленького ягодного морса из клюквы и брусники.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'piz_colazero', itemId: 'cola_zero', nameRu: 'Банка Колы', price: 40, description: 'Баночка сильногазированной колы из холодильника.', category: 'food', effectText: '+28% Гидратация' },
  ],
  sushi_asian: [
    { id: 'sush_phila', itemId: 'sushi_set', nameRu: 'Сет роллов Филадельфия', price: 160, description: 'Пластиковый контейнер: 8 роллов с лососем, сыром и огурцом.', category: 'food', effectText: '+55% Сытость, +15 HP' },
    { id: 'sush_wok', itemId: 'wok_box', nameRu: 'WOK-лапша Терияки с курицей', price: 130, description: 'Картонная коробочка горячей пшеничной лапши с соусом.', category: 'food', effectText: '+60% Сытость, +30% Энергия' },
    { id: 'sush_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча', price: 40, description: 'Бумажный стакан заваренного крупнолистового зеленого чая.', category: 'food', effectText: '+35% Гидратация, +5 HP' },
  ],
  cinema_bar: [
    { id: 'cin_popcorn', itemId: 'popcorn_caramel', nameRu: 'Карамельный попкорн', price: 70, description: 'Бумажное ведро хрустящего попкорна в сладкой карамели.', category: 'food', effectText: '+25% Сытость, +18% Энергия' },
    { id: 'cin_nachos', itemId: 'nachos', nameRu: 'Начос с сырным соусом', price: 80, description: 'Коробка кукурузных чипсов с пластиковой баночкой соуса чеддер.', category: 'food', effectText: '+32% Сытость, +15% Энергия' },
    { id: 'cin_colazero', itemId: 'cola_zero', nameRu: 'Большой стакан Колы', price: 45, description: 'Полулитровый картонный стакан ледяного газированного напитка.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'cin_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Шоколадка с карамелью и арахисом.', category: 'food', effectText: '+20% Энергия' },
  ],
  electronics: [
    { id: 'elec_pbank', itemId: 'powerbank', nameRu: 'Повербанк 20 000 мАч', price: 220, description: 'Фирменная коробка с тяжелым литий-полимерным аккумулятором.', category: 'auto', effectText: 'Зарядка гаджетов' },
    { id: 'elec_watch', itemId: 'smart_watch', nameRu: 'Тактические смарт-часы', price: 380, description: 'Коробка с часами в титановом ударопрочном корпусе.', category: 'auto', effectText: 'Мониторинг здоровья' },
    { id: 'elec_radio', itemId: 'walkie_talkie', nameRu: 'Рация дальнего действия', price: 290, description: 'Пылевлагозащитная радиостанция с длинной гибкой антенной.', category: 'auto', effectText: 'Связь в эфире' },
    { id: 'elec_phones', itemId: 'headphones', nameRu: 'Беспроводные наушники ANC', price: 260, description: 'Кейс с наушниками, имеющими гибридное шумоподавление.', category: 'auto', effectText: 'Шумоизоляция' },
    { id: 'elec_flash', itemId: 'flashlight', nameRu: 'LED-фонарь со стробоскопом', price: 160, description: 'Металлический тактический фонарик в пластиковом боксе.', category: 'auto', effectText: 'Освещение в темноте' },
  ],
  clothing: [
    // Головные уборы
    { id: 'clo_beanie', itemId: 'beanie_black', nameRu: 'Черная шапка', price: 120, description: 'Теплая шерстяная черная шапка.', category: 'auto', effectText: 'Теплоизоляция +30%' },
    { id: 'clo_cap', itemId: 'cap_red', nameRu: 'Красная кепка', price: 80, description: 'Простая красная бейсболка. Защищает от солнца.', category: 'auto', effectText: 'Защита от солнца' },
    { id: 'clo_ushanka', itemId: 'ushanka_hat', nameRu: 'Шапка-ушанка', price: 250, description: 'Очень теплая меховая шапка для суровых морозов.', category: 'auto', effectText: 'Теплоизоляция +70%' },

    // Лицо
    { id: 'clo_glasses', itemId: 'sunglasses', nameRu: 'Поляризационные очки', price: 110, description: 'Черный футляр с очками против ультрафиолета и бликов.', category: 'auto', effectText: 'Защита зрения' },
    { id: 'clo_scarf', itemId: 'scarf_blue', nameRu: 'Синий шарф', price: 130, description: 'Вязаный теплый синий шарф.', category: 'auto', effectText: 'Теплоизоляция +20%' },

    // Верх и белье
    { id: 'clo_twhite', itemId: 'tshirt_white', nameRu: 'Белая футболка', price: 90, description: 'Легкая дышащая хлопковая футболка.', category: 'auto', effectText: 'Дыхание +80%' },
    { id: 'clo_tblack', itemId: 'tshirt_black', nameRu: 'Черная футболка', price: 90, description: 'Простая черная хлопковая футболка.', category: 'auto', effectText: 'Дыхание +80%' },
    { id: 'clo_ljohns', itemId: 'long_johns', nameRu: 'Термобелье', price: 220, description: 'Теплый базовый слой для холодной погоды.', category: 'auto', effectText: 'Теплоизоляция +40%' },
    { id: 'clo_sweater', itemId: 'sweater_blue', nameRu: 'Синяя кофта', price: 250, description: 'Удобная синяя вязаная кофта.', category: 'auto', effectText: 'Теплоизоляция +45%' },
    { id: 'clo_plaid', itemId: 'plaid_shirt', nameRu: 'Клетчатая рубашка', price: 180, description: 'Фланелевая клетчатая рубашка. Классика.', category: 'auto', effectText: 'Теплоизоляция +20%' },
    { id: 'clo_leather', itemId: 'leather_jacket', nameRu: 'Кожаная куртка', price: 450, description: 'Прочная кожаная куртка. Хорошо защищает от ветра.', category: 'auto', effectText: 'Ветрозащита +90%' },
    { id: 'clo_winter', itemId: 'winter_jacket', nameRu: 'Зимний пуховик', price: 500, description: 'Тяжелая утепленная куртка для сильных морозов.', category: 'auto', effectText: 'Теплоизоляция +90%' },
    { id: 'clo_raincoat', itemId: 'raincoat_yellow', nameRu: 'Желтый дождевик', price: 200, description: 'Водонепроницаемый плащ. Сохранит сухим.', category: 'auto', effectText: 'Влагозащита 100%' },
    { id: 'clo_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Arctix"', price: 350, description: 'Фирменная куртка на вешалке с мембраной и гусиным пухом.', category: 'auto', effectText: 'Защита от холода (-15°C)' },

    // Штаны
    { id: 'clo_jeans', itemId: 'jeans_blue', nameRu: 'Синие джинсы', price: 280, description: 'Классические прочные джинсы.', category: 'auto', effectText: 'Вместительные карманы' },
    { id: 'clo_cargo', itemId: 'cargo_pants', nameRu: 'Штаны карго', price: 320, description: 'Практичные штаны с множеством карманов.', category: 'auto', effectText: 'Карманы 4.5L' },
    { id: 'clo_shorts', itemId: 'shorts_khaki', nameRu: 'Шорты хаки', price: 150, description: 'Легкие шорты для жаркой погоды.', category: 'auto', effectText: 'Дыхание +90%' },

    // Обувь и носки
    { id: 'clo_socks_w', itemId: 'socks_white', nameRu: 'Хлопковые носки', price: 30, description: 'Простые белые носки.', category: 'auto', effectText: 'Базовый слой' },
    { id: 'clo_socks_wool', itemId: 'socks_wool', nameRu: 'Шерстяные носки', price: 60, description: 'Теплые толстые вязаные носки.', category: 'auto', effectText: 'Теплоизоляция +40%' },
    { id: 'clo_sneakers_w', itemId: 'sneakers_white', nameRu: 'Белые кроссовки', price: 250, description: 'Удобная спортивная обувь.', category: 'auto', effectText: 'Легкая обувь' },
    { id: 'clo_sneakers', itemId: 'sneakers', nameRu: 'Кроссовки "Urban Sprint"', price: 280, description: 'Коробка с кроссовками: текстильная сетка, пенная подошва.', category: 'auto', effectText: '+20% Скорость бега' },
    { id: 'clo_work_boots', itemId: 'work_boots', nameRu: 'Рабочие ботинки', price: 380, description: 'Тяжелые кожаные рабочие ботинки.', category: 'auto', effectText: 'Влагозащита +60%' },
    { id: 'clo_winter_boots', itemId: 'winter_boots', nameRu: 'Зимние ботинки', price: 420, description: 'Утепленные ботинки для снега.', category: 'auto', effectText: 'Теплоизоляция +80%' },

    // Перчатки
    { id: 'clo_gloves_l', itemId: 'gloves_leather', nameRu: 'Кожаные перчатки', price: 160, description: 'Защищают руки от холода и царапин.', category: 'auto', effectText: 'Ветрозащита +60%' },
    { id: 'clo_gloves_w', itemId: 'gloves_winter', nameRu: 'Зимние перчатки', price: 220, description: 'Толстые утепленные перчатки.', category: 'auto', effectText: 'Теплоизоляция +60%' },

    // Рюкзаки
    { id: 'clo_pack_canvas', itemId: 'backpack', nameRu: 'Брезентовый рюкзак (28L)', price: 180, description: 'Простой брезентовый походный рюкзак.', category: 'auto', effectText: 'Емкость 28L' },
    { id: 'clo_pack', itemId: 'backpack_travel', nameRu: 'Городской рюкзак (35L)', price: 240, description: 'Плотный нейлоновый рюкзак с защищенным отсеком под ноутбук.', category: 'auto', effectText: 'Емкость 35L' },
  ],
  bookstore: [
    { id: 'bk_guide', itemId: 'city_guide', nameRu: 'Путеводитель по городу', price: 60, description: 'Глянцевая книжка карманного формата с подробной картой кварталов.', category: 'auto', effectText: 'Знание города' },
    { id: 'bk_note', itemId: 'notebook', nameRu: 'Блокнот для заметок', price: 35, description: 'Записная книжка в клетку, стянута эластичной резинкой.', category: 'auto', effectText: 'Записи' },
    { id: 'bk_pen', itemId: 'pen_stationery', nameRu: 'Шариковая ручка', price: 15, description: 'Прозрачный корпус, синие чернила повышенной укрывистости.', category: 'auto', effectText: 'Канцтовары' },
    { id: 'bk_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Рулон плотного серого сантехнического скотча на картонной втулке.', category: 'auto', effectText: 'Починка вещей' },
  ],
  sports_shop: [
    { id: 'spt_sneakers', itemId: 'sneakers', nameRu: 'Беговые кроссовки', price: 280, description: 'Эргономичная обувь для фитнеса с гелевыми амортизаторами.', category: 'auto', effectText: '+20% Скорость' },
    { id: 'spt_sneakers_w', itemId: 'sneakers_white', nameRu: 'Белые кроссовки', price: 250, description: 'Удобная спортивная обувь.', category: 'auto', effectText: 'Легкая обувь' },
    { id: 'spt_cap', itemId: 'cap_red', nameRu: 'Красная кепка', price: 80, description: 'Простая спортивная бейсболка.', category: 'auto', effectText: 'Защита от солнца' },
    { id: 'spt_tshirt', itemId: 'tshirt_white', nameRu: 'Белая спортивная футболка', price: 90, description: 'Дышащая хлопковая футболка.', category: 'auto', effectText: 'Дыхание +80%' },
    { id: 'spt_shorts', itemId: 'shorts_khaki', nameRu: 'Шорты хаки', price: 150, description: 'Легкие шорты для спорта и тренингов.', category: 'auto', effectText: 'Дыхание +90%' },
    { id: 'spt_ljohns', itemId: 'long_johns', nameRu: 'Термобелье', price: 220, description: 'Теплый базовый спортивный слой.', category: 'auto', effectText: 'Теплоизоляция +40%' },
    { id: 'spt_flask', itemId: 'camp_flask', nameRu: 'Стальная фляга (0.75L)', price: 90, description: 'Питьевая фляжка из пищевой стали, закручивающаяся пробка.', category: 'food', effectText: '+50% Гидратация' },
    { id: 'spt_bag', itemId: 'backpack_travel', nameRu: 'Спортивный рюкзак', price: 240, description: 'Влагозащитный рюкзак со свистком на нагрудной стяжке.', category: 'auto', effectText: '+Слоты инвентаря' },
    { id: 'spt_energy', itemId: 'energy_drink', nameRu: 'Изотоник Flash', price: 65, description: 'Бутылочка спортивного энергетика с электролитами и таурином.', category: 'food', effectText: '+35% Энергия' },
    { id: 'spt_splint', itemId: 'splint', nameRu: 'Эластичный бандаж / Шина', price: 120, description: 'Коробка с неопреновым фиксатором на липучке Velcro.', category: 'medical', effectText: 'Лечение растяжений' },
  ],
  pharmacy: [
    { id: 'pha_panthenol', itemId: 'panthenol_spray', nameRu: 'Спрей Пантенол от ожогов', price: 180, description: 'Алюминиевый баллончик с пеной для заживления повреждений эпидермиса.', category: 'medical', effectText: 'Заживление ожогов 1-3 ст.' },
    { id: 'pha_spasatel', itemId: 'spasatel_ointment', nameRu: 'Бальзам «Спасатель»', price: 120, description: 'Тюбик в картонной пачке, натуральная мазь с облепиховым маслом.', category: 'medical', effectText: 'Регенерация тканей' },
    { id: 'pha_zelenka', itemId: 'zelenka', nameRu: 'Раствор Бриллиантового зеленого', price: 35, description: 'Стеклянный флакончик со спиртовым раствором яркого красителя.', category: 'medical', effectText: 'Стерилизация и сушка' },
    { id: 'pha_iodine', itemId: 'iodine', nameRu: 'Спиртовой раствор Йода 5%', price: 40, description: 'Флакон из темного стекла для дезинфекции кожи.', category: 'medical', effectText: 'Йодная сетка / Ушибы' },
    { id: 'pha_diclofenac', itemId: 'diclofenac_gel', nameRu: 'Гель Диклофенак 5%', price: 130, description: 'Алюминиевая туба с противовоспалительным охлаждающим гелем.', category: 'medical', effectText: 'Лечение растяжений' },
    { id: 'pha_peroxide', itemId: 'hydrogen_peroxide', nameRu: 'Перекись водорода 3%', price: 45, description: 'Пластиковый флакон с дозатором: шипит и коагулирует кровь в ране.', category: 'medical', effectText: 'Остановка крови и промывка' },
    { id: 'pha_ammonia', itemId: 'ammonia_spirit', nameRu: 'Нашатырный спирт (Аммиак 10%)', price: 50, description: 'Флакончик с летучим веществом с резким специфическим запахом.', category: 'medical', effectText: 'Снятие шока и обморока' },
    { id: 'pha_balm_star', itemId: 'balm_star', nameRu: 'Бальзам «Золотая Звезда»', price: 65, description: 'Легендарная крошечная жестяная круглая баночка с пахучей мазью.', category: 'medical', effectText: 'Головная боль и паника' },
    { id: 'pha_charcoal', itemId: 'activated_charcoal', nameRu: 'Активированный уголь', price: 30, description: 'Бумажная контурная упаковка: 10 черных пористых абсорбирующих таблеток.', category: 'medical', effectText: 'Снятие тошноты' },
    { id: 'pha_valerian', itemId: 'valerian_drops', nameRu: 'Капли настойки валерианы', price: 55, description: 'Флакон-капельница с ароматной спиртовой настойкой корня растения.', category: 'medical', effectText: 'Снятие паники и пульса' },
    { id: 'pha_bandage', itemId: 'bandage', nameRu: 'Стерильный бинт', price: 100, description: 'Медицинский марлевый бинт в герметичной бумажной обертке.', category: 'medical', effectText: 'Лечение кровотечений' },
    { id: 'pha_painkillers', itemId: 'painkillers', nameRu: 'Сильное обезболивающее', price: 140, description: 'Алюминиевый блистер с таблетками анальгетика быстрого действия.', category: 'medical', effectText: '-40 Уровень боли' },
    { id: 'pha_medkit', itemId: 'medkit', nameRu: 'Большая медицинская аптечка', price: 350, description: 'Красный пластиковый чемоданчик с перевязочными и шинами.', category: 'medical', effectText: '+60 HP, Лечение ран' },
    { id: 'pha_antiseptic', itemId: 'antiseptic', nameRu: 'Антисептик для ран', price: 75, description: 'Флакон с распылителем, бесцветная жидкость без жжения.', category: 'medical', effectText: 'Дезинфекция' },
    { id: 'pha_vitamins', itemId: 'vitamins', nameRu: 'Витаминный комплекс', price: 85, description: 'Баночка с разноцветными драже поливитаминов.', category: 'medical', effectText: '+15 HP, Восстановление' },
    { id: 'pha_fever', itemId: 'antipyretic', nameRu: 'Жаропонижающее "Парацетамол"', price: 60, description: 'Таблетки в картонной пачке от высокой температуры и простуды.', category: 'medical', effectText: '+15 HP, Снятие жара' },
    { id: 'pha_patch', itemId: 'medical_patch', nameRu: 'Бактерицидные пластыри', price: 40, description: 'Набор дышащих телесных пластырей на полимерной основе.', category: 'medical', effectText: '+10 HP' },
    { id: 'pha_drops', itemId: 'eye_drops', nameRu: 'Глазные капли', price: 50, description: 'Флакон-капельница со стерильным успокаивающим раствором.', category: 'medical', effectText: '+10% Энергия' },
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
    { id: 'aut_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Широкая клейкая лента с тканевым армированием.', category: 'auto', effectText: 'Починка' },
  ],
  cafe: [
    { id: 'caf_cappuccino', itemId: 'cappuccino', nameRu: 'Сливочный Cappuccino', price: 65, description: 'Бумажный стакан с пластиковой крышкой, плотная молочная пена.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'caf_espresso', itemId: 'hot_coffee', nameRu: 'Горячий Espresso', price: 50, description: 'Крошечный стакан крепчайшего бодрящего согревающего напитка.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'caf_croissant', itemId: 'croissant', nameRu: 'Свежий масляный круассан', price: 45, description: 'Французская выпечка с хрустящей слоеной текстурой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'caf_donut', itemId: 'donut', nameRu: 'Пончик с клубничной глазурью', price: 40, description: 'Ароматный дрожжевой пончик в розовой помадке.', category: 'food', effectText: '+25% Сытость, +20% Энергия' },
    { id: 'caf_soup', itemId: 'soup', nameRu: 'Горячий куриный бульон', price: 110, description: 'Контейнер согревающего бульона с лапшой и зеленью.', category: 'food', effectText: '+45% Сытость, +8°C Тепло' },
    { id: 'caf_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча', price: 40, description: 'Стаканчик китайского зеленого чая с жасминовыми лепестками.', category: 'food', effectText: '+35% Гидратация' },
  ],
  gear_shop: [
    { id: 'gea_ration', itemId: 'military_ration', nameRu: 'Армейский сухпай (ИРП)', price: 220, description: 'Зеленая герметичная коробка с пайком на сутки, спичками и ложками.', category: 'food', effectText: '+85% Сытость, +50% Энергия' },
    { id: 'gea_flask', itemId: 'camp_flask', nameRu: 'Стальная фляга (0.75L)', price: 90, description: 'Окрашенная в хаки металлическая походная бутылка с чехлом.', category: 'food', effectText: '+50% Гидратация' },
    { id: 'gea_flashlight', itemId: 'flashlight', nameRu: 'Яркий LED-фонарь', price: 160, description: 'Алюминиевый герметичный фонарь с зубчатой короной линзы.', category: 'auto', effectText: 'Освещение в темноте' },
    { id: 'gea_knife', itemId: 'pocket_knife', nameRu: 'Туристический нож', price: 200, description: 'Черная рукоять со стеклобоем, клинок с серрейтором.', category: 'auto', effectText: 'Инструмент' },
    { id: 'gea_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Arctix"', price: 350, description: 'Плотная горная парка со штормовым капюшоном.', category: 'auto', effectText: 'Защита от холода' },
    { id: 'gea_raincoat', itemId: 'raincoat_yellow', nameRu: 'Штормовой дождевик', price: 200, description: 'Плотный непромокаемый плащ для походов.', category: 'auto', effectText: 'Влагозащита 100%' },
    { id: 'gea_ushanka', itemId: 'ushanka_hat', nameRu: 'Тактическая шапка-ушанка', price: 250, description: 'Очень теплая меховая шапка.', category: 'auto', effectText: 'Теплоизоляция +70%' },
    { id: 'gea_cargo', itemId: 'cargo_pants', nameRu: 'Штаны карго', price: 320, description: 'Прочные полевые штаны с карманами.', category: 'auto', effectText: 'Карманы 4.5L' },
    { id: 'gea_wboots', itemId: 'winter_boots', nameRu: 'Зимние походные ботинки', price: 420, description: 'Тяжелые утепленные ботинки.', category: 'auto', effectText: 'Теплоизоляция +80%' },
    { id: 'gea_gloves_w', itemId: 'gloves_winter', nameRu: 'Зимние тактические перчатки', price: 220, description: 'Утепленные прочные перчатки.', category: 'auto', effectText: 'Теплоизоляция +60%' },
    { id: 'gea_sleep', itemId: 'sleeping_bag', nameRu: 'Спальный мешок (-15°C)', price: 260, description: 'Компрессионный чехол с теплым туристическим коконом.', category: 'auto', effectText: 'Ночлег на природе' },
    { id: 'gea_zippo', itemId: 'zippo_lighter', nameRu: 'Зажигалка Zippo', price: 80, description: 'Хромированный металлический бензиновый девайс с характерным щелчком.', category: 'auto', effectText: 'Розжиг огня' },
    { id: 'gea_compass', itemId: 'compass', nameRu: 'Тактический компас', price: 75, description: 'Металлический корпус с визиром и светящейся шкалой.', category: 'auto', effectText: 'Навигация' },
    { id: 'gea_pack_canvas', itemId: 'backpack', nameRu: 'Брезентовый походный рюкзак (28L)', price: 180, description: 'Надежный брезентовый рюкзак.', category: 'auto', effectText: 'Емкость 28L' },
    { id: 'gea_pack', itemId: 'backpack_travel', nameRu: 'Тактический рюкзак (35L)', price: 240, description: 'Рюкзак из плотной ткани Cordura с системой крепления итогов.', category: 'auto', effectText: '+Слоты инвентаря' },
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
    
    osc1.start();
    osc2.start();
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.25);
  } catch (e) {}
};

interface PhysicalMoney {
  id: string;
  value: number;
  type: 'bill' | 'coin';
  x: number;
  y: number;
  angle: number;
}

// Decomposition of cash balance into detailed physical bills/coins
function decomposeWallet(player: Player | null): PhysicalMoney[] {
  const result: PhysicalMoney[] = [];
  if (!player) return result;

  let itemCount = 0;
  const allItems = getAllPlayerItemsFlat(player);

  // 1. First, find all explicit physical currency items across inventory, wallet contents, hands and add them exactly!
  for (const item of allItems) {
    if (!item) continue;
    if (item.itemId.startsWith('cash_') || item.itemId.startsWith('coin_')) {
      const isCoin = item.itemId.startsWith('coin_');
      let val = 0;
      if (item.itemId === 'cash_5000') val = 5000;
      else if (item.itemId === 'cash_1000') val = 1000;
      else if (item.itemId === 'cash_500') val = 500;
      else if (item.itemId === 'cash_100') val = 100;
      else if (item.itemId === 'cash_50') val = 50;
      else if (item.itemId === 'cash_10') val = 10;
      else if (item.itemId === 'coin_10') val = 10;
      else if (item.itemId === 'coin_5') val = 5;
      else if (item.itemId === 'coin_2') val = 2;
      else if (item.itemId === 'coin_1') val = 1;

      if (val > 0) {
        for (let i = 0; i < item.count; i++) {
          result.push({
            id: `wallet_phys_${item.itemId}_${itemCount++}_${Math.random()}`,
            value: val,
            type: isCoin ? 'coin' : 'bill',
            x: 0,
            y: 0,
            angle: 0
          });
        }
      }
    }
  }

  // 2. Now, collect all general unified 'cash' items and decompose them
  let remaining = 0;
  for (const item of allItems) {
    if (item && item.itemId === 'cash') {
      remaining += item.count;
    }
  }

  if (remaining > 0) {
    const denominations = [
      { value: 5000, type: 'bill' as const },
      { value: 1000, type: 'bill' as const },
      { value: 500, type: 'bill' as const },
      { value: 100, type: 'bill' as const },
      { value: 50, type: 'bill' as const },
      { value: 10, type: 'bill' as const },
      { value: 10, type: 'coin' as const },
      { value: 5, type: 'coin' as const },
      { value: 2, type: 'coin' as const },
      { value: 1, type: 'coin' as const },
    ];

    // Decompose general cash with some constraints to ensure a healthy mix of smaller change/coins is generated
    for (const den of denominations) {
      if (remaining <= 0) break;
      let count = Math.floor(remaining / den.value);
      if (count === 0) continue;

      // Force a mix: don't convert EVERYTHING to a single giant bill
      if (den.value === 5000 && count > 1) count = 1;
      if (den.value === 1000 && count > 2) count = 2;
      if (den.value === 500 && count > 2) count = 2;
      if (den.value === 100 && count > 3) count = 3;
      if (den.value === 50 && count > 3) count = 3;
      if (den.value === 10 && count > 5) count = 5;

      for (let i = 0; i < count; i++) {
        result.push({
          id: `wallet_gen_${den.value}_${den.type}_${itemCount++}_${Math.random()}`,
          value: den.value,
          type: den.type,
          x: 0,
          y: 0,
          angle: 0
        });
        remaining -= den.value;
      }
    }

    // Decompose the absolute remainder (change) completely down to coins/small bills
    if (remaining > 0) {
      for (const den of denominations) {
        if (remaining <= 0) break;
        const count = Math.floor(remaining / den.value);
        for (let i = 0; i < count; i++) {
          result.push({
            id: `wallet_rem_${den.value}_${den.type}_${itemCount++}_${Math.random()}`,
            value: den.value,
            type: den.type,
            x: 0,
            y: 0,
            angle: 0
          });
          remaining -= den.value;
        }
      }
    }
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'bill' ? -1 : 1;
    return b.value - a.value;
  });
}

// Live change return generator - splits a value into diverse, randomized bills and coins
function getDiverseChange(amount: number): { value: number; type: 'bill' | 'coin' }[] {
  const result: { value: number; type: 'bill' | 'coin' }[] = [];
  const denoms = [
    { value: 1000, type: 'bill' as const },
    { value: 500, type: 'bill' as const },
    { value: 100, type: 'bill' as const },
    { value: 50, type: 'bill' as const },
    { value: 10, type: 'bill' as const },
    { value: 10, type: 'coin' as const },
    { value: 5, type: 'coin' as const },
    { value: 2, type: 'coin' as const },
    { value: 1, type: 'coin' as const },
  ];

  let tempRemaining = amount;
  let baseParts: { value: number; type: 'bill' | 'coin' }[] = [];
  
  for (const d of denoms) {
    if (tempRemaining <= 0) break;
    const count = Math.floor(tempRemaining / d.value);
    for (let i = 0; i < count; i++) {
      baseParts.push({ value: d.value, type: d.type });
      tempRemaining -= d.value;
    }
  }

  // Recursive random splits
  const breakdown = (val: number, type: 'bill' | 'coin'): { value: number; type: 'bill' | 'coin' }[] => {
    const r = Math.random();
    if (val === 1000) {
      if (r < 0.4) return [{ value: 500, type: 'bill' }, { value: 500, type: 'bill' }];
      if (r < 0.7) return [{ value: 500, type: 'bill' }, { value: 100, type: 'bill' }, { value: 100, type: 'bill' }, { value: 100, type: 'bill' }, { value: 100, type: 'bill' }, { value: 100, type: 'bill' }];
      return [{ value: 1000, type: 'bill' }];
    }
    if (val === 500) {
      if (r < 0.5) return Array(5).fill({ value: 100, type: 'bill' });
      if (r < 0.8) return [{ value: 100, type: 'bill' }, { value: 100, type: 'bill' }, { value: 100, type: 'bill' }, { value: 100, type: 'bill' }, { value: 50, type: 'bill' }, { value: 50, type: 'bill' }];
      return [{ value: 500, type: 'bill' }];
    }
    if (val === 100) {
      if (r < 0.5) return [{ value: 50, type: 'bill' }, { value: 50, type: 'bill' }];
      if (r < 0.8) return [{ value: 50, type: 'bill' }, { value: 10, type: 'bill' }, { value: 10, type: 'bill' }, { value: 10, type: 'bill' }, { value: 10, type: 'bill' }, { value: 10, type: 'bill' }];
      return [{ value: 100, type: 'bill' }];
    }
    if (val === 50) {
      if (r < 0.5) return Array(5).fill({ value: 10, type: 'bill' });
      if (r < 0.8) return [{ value: 10, type: 'bill' }, { value: 10, type: 'bill' }, { value: 10, type: 'bill' }, { value: 10, type: 'bill' }, { value: 5, type: 'coin' }, { value: 5, type: 'coin' }];
      return [{ value: 50, type: 'bill' }];
    }
    if (val === 10) {
      if (r < 0.4) return [{ value: 5, type: 'coin' }, { value: 5, type: 'coin' }];
      if (r < 0.8) return [{ value: 5, type: 'coin' }, { value: 2, type: 'coin' }, { value: 2, type: 'coin' }, { value: 1, type: 'coin' }];
      return [{ value: 10, type: type }];
    }
    if (val === 5) {
      if (r < 0.5) return [{ value: 2, type: 'coin' }, { value: 2, type: 'coin' }, { value: 1, type: 'coin' }];
      if (r < 0.8) return Array(5).fill({ value: 1, type: 'coin' });
      return [{ value: 5, type: 'coin' }];
    }
    if (val === 2) {
      return [{ value: 1, type: 'coin' }, { value: 1, type: 'coin' }];
    }
    return [{ value: val, type }];
  };

  let finalParts = [...baseParts];
  let iterations = 0;
  
  while (iterations < 4) {
    let broken = false;
    const nextParts: { value: number; type: 'bill' | 'coin' }[] = [];
    
    for (const part of finalParts) {
      // Safety Cap: if we exceed 15 bills/coins, stop splitting to prevent visual lag
      if (finalParts.length + nextParts.length > 15) {
        nextParts.push(part);
        continue;
      }
      
      const res = breakdown(part.value, part.type);
      if (res.length > 1 || res[0].value !== part.value || res[0].type !== part.type) {
        broken = true;
        nextParts.push(...res);
      } else {
        nextParts.push(part);
      }
    }
    
    finalParts = nextParts;
    if (!broken) break;
    iterations++;
  }

  return finalParts;
}

const getBanknoteStyle = (val: number) => {
  switch (val) {
    case 5000:
      return {
        dims: 'w-[140px] h-[72px]',
        bg: 'bg-gradient-to-br from-red-600 via-orange-600 to-red-700 border-red-400/30 text-red-50',
        label: '5000',
        serial: 'РР 9104859'
      };
    case 1000:
      return {
        dims: 'w-[132px] h-[68px]',
        bg: 'bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 border-teal-400/30 text-teal-50',
        label: '1000',
        serial: 'АБ 3385204'
      };
    case 500:
      return {
        dims: 'w-[124px] h-[64px]',
        bg: 'bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 border-purple-400/30 text-purple-50',
        label: '500',
        serial: 'ВХ 8140498'
      };
    case 100:
      return {
        dims: 'w-[116px] h-[60px]',
        bg: 'bg-gradient-to-br from-amber-700 via-lime-700 to-amber-800 border-amber-500/30 text-amber-50',
        label: '100',
        serial: 'ЕК 4190835'
      };
    case 50:
      return {
        dims: 'w-[108px] h-[56px]',
        bg: 'bg-gradient-to-br from-cyan-600 via-sky-600 to-cyan-700 border-cyan-400/30 text-cyan-50',
        label: '50',
        serial: 'ЗХ 5012487'
      };
    case 10:
    default:
      return {
        dims: 'w-[100px] h-[52px]',
        bg: 'bg-gradient-to-br from-amber-800 via-yellow-800 to-stone-800 border-yellow-600/30 text-yellow-50',
        label: '10',
        serial: 'ОО 1148590'
      };
  }
};

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  shopTitle?: string;
  shopType?: 
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
    | 'gas_station_shop';
  gasPumps?: GasPumpDispenser[];
  vehicles?: Vehicle[];
  onBuyItems: (items: ShopItem[], totalCost: number) => void;
  onRepairVehicle?: () => void;
  canRepairVehicle?: boolean;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  player,
  shopTitle = 'СУПЕРМАРКЕТ 24/7',
  shopType = 'supermarket',
  gasPumps = [],
  vehicles = [],
  onBuyItems,
  onRepairVehicle,
  canRepairVehicle = false
}) => {
  // Shopping Cart & Buying Flow States
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customCartItems, setCustomCartItems] = useState<Record<string, { item: ShopItem; quantity: number }>>({});
  const [activeTab, setActiveTab] = useState<'shelf' | 'cart'>('shelf'); // Mobile responsiveness
  const [view, setView] = useState<'catalog' | 'checkout'>('catalog');

  // Gas Station Specific States
  const [gasSubTab, setGasSubTab] = useState<'shelves' | 'pumps'>('pumps');
  const [selectedPumpId, setSelectedPumpId] = useState<string>('gas_pump_1');
  const [fuelLiters, setFuelLiters] = useState<number>(30);
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('ai95');

  // Auto Shop / Workshop Specific States
  const [autoSubTab, setAutoSubTab] = useState<'parts' | 'workshop'>('workshop');
  const [workshopSubTab, setWorkshopSubTab] = useState<'diagnostics' | 'repair' | 'paint' | 'lpg' | 'tuning'>('diagnostics');
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [inspectionProgress, setInspectionProgress] = useState<number>(0);
  const [inspectionStepText, setInspectionStepText] = useState<string>('');
  const [hasInspectedVehicleId, setHasInspectedVehicleId] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairProgress, setRepairProgress] = useState<number>(0);
  const [repairStepText, setRepairStepText] = useState<string>('');
  
  // Paint shop states
  const [paintType, setPaintType] = useState<'standard' | 'premium' | 'custom'>('standard');
  const [selectedPaintColor, setSelectedPaintColor] = useState<string>('#991b1b');
  const [paintTarget, setPaintTarget] = useState<'body' | 'roof'>('body');
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const [paintProgress, setPaintProgress] = useState<number>(0);
  const [paintStepText, setPaintStepText] = useState<string>('');

  // Tuning/Upgrades interactive states
  const [tuningAction, setTuningAction] = useState<string | null>(null);
  const [tuningProgress, setTuningProgress] = useState<number>(0);
  const [tuningStepText, setTuningStepText] = useState<string>('');

  // Checkout Interactive States
  const [wallet, setWallet] = useState<PhysicalMoney[]>([]);
  const [trayItems, setTrayItems] = useState<PhysicalMoney[]>([]);
  const [paymentPhase, setPaymentPhase] = useState<'paying' | 'change' | 'complete'>('paying');
  const [checkoutTotal, setCheckoutTotal] = useState<number>(0);
  const [pendingWorkshopService, setPendingWorkshopService] = useState<{
    action: string;
    cost: number;
    title: string;
  } | null>(null);

  const handleWorkshopCheckout = (action: string, cost: number, title: string) => {
    setPendingWorkshopService({ action, cost, title });
    setCheckoutTotal(cost);
    setCustomCartItems({
      'workshop_service': {
        item: {
          id: 'workshop_service',
          itemId: 'service_fee',
          nameRu: title,
          price: cost,
          description: 'Услуга автомастерской PIT-STOP',
          category: 'auto',
          effectText: 'Ремонт / Обслуживание'
        },
        quantity: 1
      }
    });
    setView('checkout');
    setWallet(decomposeWallet(player));
    setTrayItems([]);
    setPaymentPhase('paying');
    playTerminalBeep();
  };

  // Progress timers useEffects
  useEffect(() => {
    let timer: any;
    if (isInspecting) {
      timer = setInterval(() => {
        setInspectionProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsInspecting(false);
            const cur = getNearbyOrActiveVehicle();
            if (cur) setHasInspectedVehicleId(cur.id);
            playCashRegister();
            return 100;
          }
          const next = prev + 25;
          if (next === 25) setInspectionStepText("📊 Опрос блоков ЭБУ, датчиков ABS и впрыска...");
          else if (next === 50) setInspectionStepText("🔍 Сканирование геометрии кузова и подвески...");
          else if (next === 75) setInspectionStepText("📋 Формирование итоговой диагностической карты...");
          return next;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isInspecting]);

  useEffect(() => {
    let timer: any;
    if (isRepairing) {
      timer = setInterval(() => {
        setRepairProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsRepairing(false);
            if (onRepairVehicle) onRepairVehicle();
            playCashRegister();
            return 100;
          }
          const next = prev + 20;
          if (next === 20) setRepairStepText("🔨 Стапельные работы: выравнивание геометрии кузова...");
          else if (next === 40) setRepairStepText("⚙️ Замена изношенных рычагов и узлов подвески...");
          else if (next === 60) setRepairStepText("🛡️ Установка новых стекол, фар и рихтовка крыльев...");
          else if (next === 80) setRepairStepText("🔧 Финальная регулировка схода-развала и тестирование ДВС...");
          return next;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isRepairing]);

  useEffect(() => {
    let timer: any;
    if (isPainting) {
      timer = setInterval(() => {
        setPaintProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsPainting(false);
            playCashRegister();
            return 100;
          }
          const next = prev + 25;
          if (next === 25) setPaintStepText("🧼 Обезжиривание и абразивная подготовка поверхности кузова...");
          else if (next === 50) setPaintStepText("🎨 Нанесение грунтовочного антикоррозийного слоя...");
          else if (next === 75) setPaintStepText("🖌️ Покраска в покрасочной камере под давлением...");
          return next;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isPainting]);

  useEffect(() => {
    let timer: any;
    if (tuningAction) {
      timer = setInterval(() => {
        setTuningProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setTuningAction(null);
            playCashRegister();
            return 100;
          }
          const next = prev + 33;
          if (next === 33) setTuningStepText("⚙️ Демонтаж старых компонентов и установка тюнинг-комплекта...");
          else if (next === 66) setTuningStepText("🔌 Калибровка ЭБУ и проверка герметичности магистралей...");
          return next;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [tuningAction]);

  // If closed, return state
  useEffect(() => {
    if (!isOpen) {
      setCart({});
      setCustomCartItems({});
      setView('catalog');
      setTrayItems([]);
      setWallet([]);
      setPaymentPhase('paying');
      setIsInspecting(false);
      setInspectionProgress(0);
      setInspectionStepText('');
      setIsRepairing(false);
      setRepairProgress(0);
      setRepairStepText('');
      setIsPainting(false);
      setPaintProgress(0);
      setPaintStepText('');
      setTuningAction(null);
      setTuningProgress(0);
      setTuningStepText('');
    }
  }, [isOpen]);

  // Sync selected pump defaults if a nozzle is inserted into a car
  useEffect(() => {
    if (isOpen && gasPumps.length > 0) {
      const activePump = gasPumps.find(p => p.hasNozzleTaken || p.connectedVehicleId);
      if (activePump) {
        setSelectedPumpId(activePump.id);
        if (activePump.selectedFuelType) {
          setSelectedFuelType(activePump.selectedFuelType);
        }
      }
    }
  }, [isOpen, gasPumps]);

  if (!isOpen || !player) return null;

  const playerCash = getPlayerCash(player);

  const getNearbyOrActiveVehicle = (): Vehicle | null => {
    if (!player) return null;
    if (player.isInVehicle && player.currentVehicleId) {
      const activeCar = vehicles.find((v) => v.id === player.currentVehicleId);
      if (activeCar) return activeCar;
    }
    const closestCar = vehicles
      .filter((v) => Math.hypot(v.x - player.x, v.y - player.y) < 120)
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
    return closestCar || null;
  };

  const currentCatalog = SHOP_CATALOGS[shopType] || SHOP_CATALOGS.supermarket;

  // Derive cart contents combining shelf catalog and custom fuel orders
  const cartItemsList: { item: ShopItem; quantity: number }[] = [
    ...Object.entries(cart)
      .map(([id, quantity]) => {
        const item = currentCatalog.find((x) => x.id === id);
        return item ? { item, quantity } : null;
      })
      .filter((x): x is { item: ShopItem; quantity: number } => x !== null),
    ...(Object.values(customCartItems) as { item: ShopItem; quantity: number }[])
  ];

  const cartTotalItemsCount = cartItemsList.reduce((acc, curr) => acc + curr.quantity, 0);

  // Helper functions for Cart
  const handleAddToCart = (item: ShopItem) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
    sound.playPickup();
  };

  const handleRemoveFromCart = (item: ShopItem) => {
    if (customCartItems[item.id]) {
      setCustomCartItems((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      sound.playPickup();
      return;
    }

    setCart((prev) => {
      const copy = { ...prev };
      if (copy[item.id] <= 1) {
        delete copy[item.id];
      } else {
        copy[item.id]--;
      }
      return copy;
    });
    sound.playPickup();
  };

  const handleClearCart = () => {
    setCart({});
    setCustomCartItems({});
  };

  // Add Fuel Pump Order to Cart
  const handleAddFuelToCart = () => {
    const pump = gasPumps.find(p => p.id === selectedPumpId) || gasPumps[0];
    const grade = FUEL_GRADES[selectedFuelType];
    const pumpNum = pump ? pump.pumpNumber : 1;
    const totalCost = Math.round(fuelLiters * grade.pricePerLiter);

    const fuelOrderItem: ShopItem = {
      id: `fuel_order_${pump ? pump.id : 'p1'}_${Date.now()}`,
      itemId: 'fuel_order',
      nameRu: `Заправка ТРК №${pumpNum} (${grade.nameRu}, ${fuelLiters.toFixed(1)} л)`,
      price: totalCost,
      description: `Подача топлива ${grade.nameRu} (${grade.octane}) на колонке №${pumpNum}`,
      category: 'auto',
      effectText: `Заправка ${fuelLiters.toFixed(1)}L`,
      fuelPumpId: pump ? pump.id : selectedPumpId,
      fuelLiters: fuelLiters,
      fuelType: selectedFuelType
    };

    setCustomCartItems(prev => ({
      ...prev,
      [fuelOrderItem.id]: { item: fuelOrderItem, quantity: 1 }
    }));

    sound.playPickup();
  };

  // Switch to POS Payment view
  const handleProceedToPayment = () => {
    const total = cartItemsList.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
    if (total <= 0) return;
    
    setCheckoutTotal(total);
    setView('checkout');
    setWallet(decomposeWallet(player));
    setTrayItems([]);
    setPaymentPhase('paying');
    playTerminalBeep();
  };

  // Exit Payment back to Catalog (refunds everything safely)
  const handleCancelPayment = () => {
    setView('catalog');
    setTrayItems([]);
    setWallet([]);
    setPaymentPhase('paying');
    sound.playPickup();
  };

  // Manual drag-and-drop & click actions for coins and bills
  const handlePayItem = (money: PhysicalMoney) => {
    if (paymentPhase !== 'paying') return;
    
    // Play correct tactile audio
    if (money.type === 'coin') {
      playCoinDrop();
    } else {
      playCashRustle();
    }

    setWallet((prev) => prev.filter((x) => x.id !== money.id));
    setTrayItems((prev) => [
      ...prev,
      {
        ...money,
        // Realistic physical scatter offsets
        x: Math.random() * 80 - 40,
        y: Math.random() * 50 - 25,
        angle: Math.random() * 40 - 20
      }
    ]);
  };

  const handlePayAllOfDenom = (items: PhysicalMoney[]) => {
    if (paymentPhase !== 'paying' || items.length === 0) return;

    if (items[0].type === 'coin') {
      playCoinDrop();
    } else {
      playCashRustle();
    }

    const idsToPay = new Set(items.map((x) => x.id));
    setWallet((prev) => prev.filter((x) => !idsToPay.has(x.id)));
    setTrayItems((prev) => [
      ...prev,
      ...items.map((money) => ({
        ...money,
        x: Math.random() * 80 - 40,
        y: Math.random() * 50 - 25,
        angle: Math.random() * 40 - 20
      }))
    ]);
  };

  const handleAutoPayRequired = () => {
    if (paymentPhase !== 'paying' || remainingToPay <= 0 || wallet.length === 0) return;

    let needed = remainingToPay;
    const sortedWallet = [...wallet].sort((a, b) => b.value - a.value);
    const selected: PhysicalMoney[] = [];

    for (const item of sortedWallet) {
      if (needed > 0) {
        selected.push(item);
        needed -= item.value;
      }
    }

    if (selected.length === 0) return;

    if (selected[0].type === 'coin') {
      playCoinDrop();
    } else {
      playCashRustle();
    }

    const selectedIds = new Set(selected.map((x) => x.id));
    setWallet((prev) => prev.filter((x) => !selectedIds.has(x.id)));
    setTrayItems((prev) => [
      ...prev,
      ...selected.map((money) => ({
        ...money,
        x: Math.random() * 80 - 40,
        y: Math.random() * 50 - 25,
        angle: Math.random() * 40 - 20
      }))
    ]);
  };

  const handleAutoPayAll = () => {
    if (paymentPhase !== 'paying' || wallet.length === 0) return;

    playCashRustle();
    setTrayItems((prev) => [
      ...prev,
      ...wallet.map((money) => ({
        ...money,
        x: Math.random() * 80 - 40,
        y: Math.random() * 50 - 25,
        angle: Math.random() * 40 - 20
      }))
    ]);
    setWallet([]);
  };

  const handleClearTray = () => {
    if (paymentPhase !== 'paying' || trayItems.length === 0) return;

    playCoinDrop();
    setWallet((prev) => [
      ...prev,
      ...trayItems.map((m) => ({ ...m, x: 0, y: 0, angle: 0 }))
    ].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'bill' ? -1 : 1;
      return b.value - a.value;
    }));
    setTrayItems([]);
  };

  const handleRefundItem = (money: PhysicalMoney) => {
    if (paymentPhase !== 'paying') return;

    if (money.type === 'coin') {
      playCoinDrop();
    } else {
      playCashRustle();
    }

    setTrayItems((prev) => prev.filter((x) => x.id !== money.id));
    setWallet((prev) => [
      ...prev,
      { ...money, x: 0, y: 0, angle: 0 }
    ].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'bill' ? -1 : 1;
      return b.value - a.value;
    }));
  };

  // HTML5 Drag and Drop handlers
  const onDragStart = (e: React.DragEvent, money: PhysicalMoney) => {
    e.dataTransfer.setData('text/plain', money.id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDropOnTray = (e: React.DragEvent) => {
    e.preventDefault();
    const moneyId = e.dataTransfer.getData('text/plain');
    const moneyItem = wallet.find((x) => x.id === moneyId);
    if (moneyItem) {
      handlePayItem(moneyItem);
    }
  };

  const onDropBackToWallet = (e: React.DragEvent) => {
    e.preventDefault();
    const moneyId = e.dataTransfer.getData('text/plain');
    const moneyItem = trayItems.find((x) => x.id === moneyId);
    if (moneyItem) {
      handleRefundItem(moneyItem);
    }
  };

  // Compute tray summary
  const totalPaid = trayItems.reduce((acc, curr) => acc + curr.value, 0);
  const remainingToPay = Math.max(0, checkoutTotal - totalPaid);

  // Trigger cash register transaction and prepare CHANGE
  const handleExecutePayment = () => {
    if (totalPaid < checkoutTotal) return;

    playCashRegister();
    const changeAmount = totalPaid - checkoutTotal;

    if (pendingWorkshopService) {
      const action = pendingWorkshopService.action;
      setPendingWorkshopService(null);
      const finalItemsList: ShopItem[] = [];
      cartItemsList.forEach(({ item, quantity }) => {
        for (let i = 0; i < quantity; i++) {
          finalItemsList.push(item);
        }
      });
      onBuyItems(finalItemsList, checkoutTotal);
      setCart({});
      setCustomCartItems({});
      setView('catalog');
      setAutoSubTab('workshop');

      if (action === 'diagnostics') {
        setIsInspecting(true);
        setInspectionProgress(0);
        setInspectionStepText("🔌 Подключение диагностического сканера OBD-II...");
      } else if (action === 'repair') {
        setIsRepairing(true);
        setRepairProgress(0);
        setRepairStepText("🔨 Стапельные работы: выравнивание геометрии кузова...");
      } else if (action === 'paint') {
        setIsPainting(true);
        setPaintProgress(0);
        setPaintStepText("🧼 Обезжиривание и подготовка поверхности кузова...");
      } else {
        setTuningAction(action);
        setTuningProgress(0);
        setTuningStepText("⚙️ Подготовка посадочных мест и монтаж узлов...");
      }
      return;
    }

    if (changeAmount > 0) {
      setPaymentPhase('change');
      const changeParts = getDiverseChange(changeAmount);
      
      // Scatter change onto tray
      const changePhysical: PhysicalMoney[] = changeParts.map((c, idx) => ({
        id: `change_${c.value}_${c.type}_${idx}_${Math.random()}`,
        value: c.value,
        type: c.type,
        x: Math.random() * 80 - 40,
        y: Math.random() * 55 - 25,
        angle: Math.random() * 45 - 22
      }));
      setTrayItems(changePhysical);
    } else {
      // Net transaction complete instantly!
      const finalItemsList: ShopItem[] = [];
      cartItemsList.forEach(({ item, quantity }) => {
        for (let i = 0; i < quantity; i++) {
          finalItemsList.push(item);
        }
      });
      onBuyItems(finalItemsList, checkoutTotal);
      setCart({});
      setView('catalog');
      onClose();
    }
  };

  // Pull individual change items or collect everything
  const handleTakeChangeItem = (money: PhysicalMoney) => {
    if (paymentPhase !== 'change') return;

    if (money.type === 'coin') {
      playCoinDrop();
    } else {
      playCashRustle();
    }

    setTrayItems((prev) => prev.filter((x) => x.id !== money.id));
  };

  const handleCollectAllChangeAndFinish = () => {
    // Collect all remaining change instantly and transfer goods!
    const finalItemsList: ShopItem[] = [];
    cartItemsList.forEach(({ item, quantity }) => {
      for (let i = 0; i < quantity; i++) {
        finalItemsList.push(item);
      }
    });

    if (pendingWorkshopService) {
      const action = pendingWorkshopService.action;
      setPendingWorkshopService(null);
      onBuyItems(finalItemsList, checkoutTotal);
      setCart({});
      setCustomCartItems({});
      setView('catalog');
      setAutoSubTab('workshop');

      if (action === 'diagnostics') {
        setIsInspecting(true);
        setInspectionProgress(0);
        setInspectionStepText("🔌 Подключение диагностического сканера OBD-II...");
      } else if (action === 'repair') {
        setIsRepairing(true);
        setRepairProgress(0);
        setRepairStepText("🔨 Стапельные работы: выравнивание геометрии кузова...");
      } else if (action === 'paint') {
        setIsPainting(true);
        setPaintProgress(0);
        setPaintStepText("🧼 Обезжиривание и подготовка поверхности кузова...");
      } else {
        setTuningAction(action);
        setTuningProgress(0);
        setTuningStepText("⚙️ Подготовка посадочных мест и монтаж узлов...");
      }
      return;
    }

    onBuyItems(finalItemsList, checkoutTotal);
    setCart({});
    setView('catalog');
    onClose();
  };

  return (
    <div 
      id="shop-modal-overlay"
      className="fixed inset-0 z-[1000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={view === 'paying' ? handleCancelPayment : onClose}
    >
      <div 
        id="shop-modal-container"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            {view === 'checkout' ? (
              <button
                onClick={handleCancelPayment}
                className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                <span>{view === 'checkout' ? 'Касса самообслуживания' : shopTitle}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  {view === 'checkout' ? 'Оплата наличными' : 'Заведение'}
                </span>
              </h2>
              <p className="text-slate-400 text-xs">
                {view === 'checkout' 
                  ? 'Вручную разложите деньги на монетницу для оплаты' 
                  : 'Свежие поставки товаров на витрине'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Player Cash Balance Badge */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono font-bold text-sm shadow-md">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{playerCash}</span>
            </div>

            <button
              id="btn-close-shop"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View 1: Catalog/Shelf with Shopping Cart */}
        {view === 'catalog' && (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            {/* Shelf Items Column (Left, 2/3 size) */}
            <div className="w-full md:w-2/3 p-5 overflow-y-auto flex-1 border-r border-slate-800">
              {/* Mobile View Toggles */}
              <div className="flex md:hidden bg-slate-950 p-1 rounded-xl mb-4">
                <button
                  onClick={() => setActiveTab('shelf')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    activeTab === 'shelf' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  Витрина
                </button>
                <button
                  onClick={() => setActiveTab('cart')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'cart' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Корзина ({cartTotalItemsCount})</span>
                </button>
              </div>

              {/* Sub tabs for Gas Station Shop */}
              {shopType === 'gas_station_shop' && (
                <div className="flex bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800">
                  <button
                    onClick={() => setGasSubTab('pumps')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                      gasSubTab === 'pumps'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Fuel className="w-4 h-4" />
                    <span>Заправка ТРК №1–4</span>
                  </button>
                  <button
                    onClick={() => setGasSubTab('shelves')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                      gasSubTab === 'shelves'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Минимаркет и Автотовары</span>
                  </button>
                </div>
              )}

              {/* Shelf Tab content */}
              <div className={`${activeTab === 'shelf' ? 'block' : 'hidden md:block'} space-y-4`}>
                {/* Gas Station Pumps Management Panel */}
                {shopType === 'gas_station_shop' && gasSubTab === 'pumps' ? (
                  <div className="space-y-4">
                    {/* Pump Selector Cards (ТРК №1-4) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {(gasPumps.length > 0 ? gasPumps : [
                        { id: 'gas_pump_1', pumpNumber: 1, hasNozzleTaken: false },
                        { id: 'gas_pump_2', pumpNumber: 2, hasNozzleTaken: false },
                        { id: 'gas_pump_3', pumpNumber: 3, hasNozzleTaken: false },
                        { id: 'gas_pump_4', pumpNumber: 4, hasNozzleTaken: false }
                      ]).map((pump: any) => {
                        const isSelected = selectedPumpId === pump.id;
                        const connectedCar = pump.connectedVehicleId 
                          ? vehicles.find(v => v.id === pump.connectedVehicleId) 
                          : null;
                        const isDispensing = pump.isFueling;

                        return (
                          <button
                            key={pump.id}
                            onClick={() => {
                              setSelectedPumpId(pump.id);
                              if (pump.selectedFuelType) {
                                setSelectedFuelType(pump.selectedFuelType);
                              }
                              sound.playPickup();
                            }}
                            className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-950/50 text-white ring-2 ring-emerald-500/40'
                                : 'bg-slate-850/70 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">ТРК №{pump.pumpNumber}</span>
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                isDispensing 
                                  ? 'bg-amber-400 animate-ping' 
                                  : pump.hasNozzleTaken 
                                    ? 'bg-sky-400' 
                                    : 'bg-emerald-400'
                              }`} />
                            </div>

                            <div className="mt-2 text-[11px]">
                              {isDispensing ? (
                                <span className="text-amber-300 font-semibold flex items-center gap-1">
                                  <span>Идет подача...</span>
                                </span>
                              ) : connectedCar ? (
                                <span className="text-sky-300 font-medium truncate block">
                                  🚗 {connectedCar.nameRu || 'Автомобиль'}
                                </span>
                              ) : pump.hasNozzleTaken ? (
                                <span className="text-amber-200">Пистолет в руках</span>
                              ) : (
                                <span className="text-slate-400">Готова к заправке</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Selected Pump Configurator Box */}
                    {(() => {
                      const curPump = gasPumps.find(p => p.id === selectedPumpId) || gasPumps[0];
                      const curCar = curPump?.connectedVehicleId 
                        ? vehicles.find(v => v.id === curPump.connectedVehicleId) 
                        : null;
                      const fuelGrade = FUEL_GRADES[selectedFuelType];
                      const totalRub = Math.round(fuelLiters * fuelGrade.pricePerLiter);

                      // Max tank space
                      const tankMax = curCar ? (curCar.fuelCapacity || 55) : 60;
                      const tankCurrent = curCar ? (curCar.fuel || 0) : 0;
                      const tankRemaining = Math.max(0, tankMax - tankCurrent);

                      return (
                        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                          {/* Selected Pump Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Fuel className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-base">
                                  Настройка заправки: ТРК №{curPump ? curPump.pumpNumber : 1}
                                </h3>
                                <p className="text-xs text-slate-400">
                                  {curCar 
                                    ? `Подключен автомобиль: ${curCar.nameRu || 'Авто'} (В баке: ${tankCurrent.toFixed(1)} / ${tankMax.toFixed(1)} л)` 
                                    : 'Пистолет можно вставить в автомобиль до или после оплаты'}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Тариф</span>
                              <span className="font-mono font-bold text-sm text-amber-300">
                                {fuelGrade.pricePerLiter.toFixed(2)} ₽ / л
                              </span>
                            </div>
                          </div>

                          {/* 1. Fuel Type Selector */}
                          <div>
                            <label className="text-xs font-semibold text-slate-300 mb-2 block">
                              Выберите вид топлива:
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                              {(['ai92', 'ai95', 'ai98', 'ai100', 'diesel', 'lpg'] as FuelType[]).map((fType) => {
                                const gr = FUEL_GRADES[fType];
                                const isSel = selectedFuelType === fType;
                                return (
                                  <button
                                    key={fType}
                                    onClick={() => {
                                      setSelectedFuelType(fType);
                                      sound.playPickup();
                                    }}
                                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                                      isSel
                                        ? 'bg-slate-800 border-emerald-500 text-white ring-2 ring-emerald-500/30 shadow-md'
                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    <span className="font-bold text-xs">{gr.nameRu}</span>
                                    <span className="font-mono text-[11px] text-amber-300 font-semibold">{gr.pricePerLiter.toFixed(2)} ₽</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Fuel Liters Selector */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-semibold text-slate-300">
                                Объем топлива:
                              </label>
                              <span className="font-mono font-bold text-sm text-emerald-400">
                                {fuelLiters.toFixed(1)} л
                              </span>
                            </div>

                            {/* Quick Liters Buttons */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {[10, 20, 30, 40, 50].map((l) => (
                                <button
                                  key={l}
                                  onClick={() => {
                                    setFuelLiters(l);
                                    sound.playPickup();
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition ${
                                    fuelLiters === l
                                      ? 'bg-emerald-600 text-white border-emerald-500'
                                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                                  }`}
                                >
                                  +{l} л
                                </button>
                              ))}
                              {curCar && tankRemaining > 0 && (
                                <button
                                  onClick={() => {
                                    setFuelLiters(Math.round(tankRemaining));
                                    sound.playPickup();
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-600/50 hover:bg-sky-900 transition"
                                >
                                  Полный бак ({Math.round(tankRemaining)} л)
                                </button>
                              )}
                            </div>

                            {/* Stepper + Range Slider */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setFuelLiters(prev => Math.max(1, prev - 5))}
                                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 active:scale-95"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="range"
                                min="1"
                                max="80"
                                step="1"
                                value={fuelLiters}
                                onChange={(e) => setFuelLiters(parseFloat(e.target.value))}
                                className="flex-1 accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                              />
                              <button
                                onClick={() => setFuelLiters(prev => Math.min(80, prev + 5))}
                                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* 3. Add to Cart / Check Action Button */}
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[11px] text-slate-400 block">Итоговая стоимость топлива:</span>
                              <span className="font-mono font-bold text-xl text-amber-300">
                                {totalRub.toLocaleString()} ₽
                              </span>
                            </div>

                            <button
                              onClick={handleAddFuelToCart}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition flex items-center gap-2"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              <span>Добавить заправку ТРК №{curPump ? curPump.pumpNumber : 1} в чек</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    {/* Auto Shop Tab Selector (If in auto shop) */}
                    {shopType === 'auto_shop' && (
                      <div className="flex bg-slate-950 p-1 rounded-xl mb-4 border border-slate-850">
                        <button
                          onClick={() => {
                            setAutoSubTab('workshop');
                            sound.playButtonPress();
                          }}
                          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                            autoSubTab === 'workshop'
                              ? 'bg-sky-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                          }`}
                        >
                          <Wrench className="w-4 h-4" />
                          <span>🔧 Автомастерская PIT-STOP</span>
                        </button>
                        <button
                          onClick={() => {
                            setAutoSubTab('parts');
                            sound.playButtonPress();
                          }}
                          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                            autoSubTab === 'parts'
                              ? 'bg-slate-800 text-white shadow-md'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>🛒 Автотовары & Запчасти</span>
                        </button>
                      </div>
                    )}

                    {/* Workshop Area Rendering */}
                    {shopType === 'auto_shop' && autoSubTab === 'workshop' ? (() => {
                      const curCar = getNearbyOrActiveVehicle();
                      
                      if (!curCar) {
                        return (
                          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 shadow-inner">
                            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 animate-pulse">
                              <Wrench className="w-8 h-8" />
                            </div>
                            <div className="max-w-md mx-auto space-y-2">
                              <h3 className="text-white font-bold text-lg">Автомобиль не обнаружен</h3>
                              <p className="text-slate-400 text-sm leading-relaxed">
                                Загоните ваш автомобиль на подъемник или припаркуйте его непосредственно у ворот мастерской PIT-STOP. Сервисная система сможет подключиться к блоку управления автомобилем по беспроводному каналу, как только он окажется в зоне обслуживания.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      // Define Russian brand names helper
                      const getCarNameRu = (type: string): string => {
                        switch (type) {
                          case 'sedan_vaz2101': return 'ВАЗ-2101 "Жигули"';
                          case 'sedan_vaz2107': return 'ВАЗ-2107 "Семерка"';
                          case 'hatchback_granta': return 'Lada Granta';
                          case 'van_gazel': return 'ГАЗель 3302';
                          case 'truck_tanker': return 'Топливозаправщик ГАЗ-3307';
                          case 'classic_black': return 'ГАЗ-24 "Волга"';
                          default: return 'Легковой автомобиль';
                        }
                      };

                      // Dynamic damage percentages
                      const frontBumperDeform = curCar.damage ? Math.round((curCar.damage.frontCrumple / 15) * 100) : 0;
                      const rearBumperDeform = curCar.damage ? Math.round((curCar.damage.rearCrumple / 12) * 100) : 0;
                      const leftSideDeform = curCar.damage ? Math.round((curCar.damage.leftDent / 10) * 100) : 0;
                      const rightSideDeform = curCar.damage ? Math.round((curCar.damage.rightDent / 10) * 100) : 0;
                      const bodyPanelsDeform = Math.min(100, Math.max(frontBumperDeform, rearBumperDeform, leftSideDeform, rightSideDeform));
                      
                      const suspensionDeform = curCar.damage 
                        ? Math.round(((curCar.damage.frontLeftSuspensionDamage + curCar.damage.frontRightSuspensionDamage + curCar.damage.rearLeftSuspensionDamage + curCar.damage.rearRightSuspensionDamage) / 4) * 100)
                        : 0;

                      // Diagnostic cost
                      const DIAGNOSTIC_COST = 50;

                      // Repair cost calculation
                      const calculateRepairCost = (car: Vehicle): number => {
                        let cost = 0;
                        const dmg = car.damage;
                        if (!dmg) return 0;
                        
                        // Body crumples/dents
                        cost += Math.round((dmg.frontCrumple || 0) * 20);
                        cost += Math.round((dmg.rearCrumple || 0) * 20);
                        cost += Math.round(((dmg.leftDent || 0) + (dmg.rightDent || 0)) * 15);
                        cost += Math.round(((dmg.frontLeftDent || 0) + (dmg.frontRightDent || 0) + (dmg.rearLeftDent || 0) + (dmg.rearRightDent || 0)) * 12);
                        
                        // Suspension
                        cost += Math.round(((dmg.frontLeftSuspensionDamage || 0) + (dmg.frontRightSuspensionDamage || 0) + (dmg.rearLeftSuspensionDamage || 0) + (dmg.rearRightSuspensionDamage || 0)) * 250);
                        
                        // Glass and Lights
                        if (dmg.windshieldCracked) cost += 250;
                        if (dmg.rearGlassCracked) cost += 150;
                        if (dmg.leftHeadlightBroken) cost += 80;
                        if (dmg.rightHeadlightBroken) cost += 80;
                        if (dmg.leftTaillightBroken) cost += 60;
                        if (dmg.rightTaillightBroken) cost += 60;
                        
                        // Engine & Fluids
                        if (dmg.engineFire || dmg.fuelTankFire) cost += 600;
                        if (dmg.engineSmoking || dmg.underHoodSmolder) cost += 300;
                        if (car.engineState && car.engineState.oilPunctured) cost += 200;
                        if (car.engineState && car.engineState.radiatorPunctured) cost += 180;
                        
                        if (cost > 0) {
                          cost = Math.max(100, cost); // min repair fee
                        }
                        
                        return cost;
                      };

                      const repairCost = calculateRepairCost(curCar);

                      // Start interactive inspection
                      const handleStartInspection = () => {
                        if (playerCash < DIAGNOSTIC_COST) {
                          sound.playHurt();
                          return;
                        }
                        handleWorkshopCheckout('diagnostics', DIAGNOSTIC_COST, 'Компьютерный техосмотр OBD-II');
                      };

                      // Start interactive repair
                      const handleStartRepair = () => {
                        if (playerCash < repairCost) {
                          sound.playHurt();
                          return;
                        }
                        handleWorkshopCheckout('repair', repairCost, 'Капитальный ремонт кузова и подвески');
                      };

                      // Paint costs
                      const getPaintPrice = (): number => {
                        switch (paintType) {
                          case 'standard': return 150;
                          case 'premium': return 350;
                          case 'custom': return 950;
                        }
                      };
                      const paintPrice = getPaintPrice();

                      // Start interactive paint job
                      const handleStartPaint = () => {
                        if (playerCash < paintPrice) {
                          sound.playHurt();
                          return;
                        }
                        handleWorkshopCheckout('paint', paintPrice, `Покраска кузова (${paintType === 'standard' ? 'Акрил' : paintType === 'premium' ? 'Металлик' : 'Кастом'})`);
                      };

                      // Start generic tuning actions
                      const handleStartTuning = (action: string, price: number, title?: string) => {
                        if (playerCash < price) {
                          sound.playHurt();
                          return;
                        }
                        const serviceTitle = title || (
                          action === 'gbo_install' ? 'Установка ГБО Lovato 4' :
                          action === 'gbo_remove' ? 'Демонтаж ГБО' :
                          action === 'alignment' ? 'Сход-развал 3D' :
                          action === 'suspension' ? 'Усиленная подвеска Bilstein' :
                          action === 'chiptuning' ? 'Чип-тюнинг ECU Stage 1' : 'Тюнинг автомобиля'
                        );
                        handleWorkshopCheckout(action, price, serviceTitle);
                      };

                      return (
                        <div className="space-y-4">
                          {/* Active Vehicle Status Card */}
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap sm:flex-nowrap justify-between items-center gap-4 shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                                <Activity className="w-6 h-6 animate-pulse" />
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                  <span>🚗 {getCarNameRu(curCar.type)}</span>
                                  {curCar.hasGBO && (
                                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-bold border border-emerald-400/20">
                                      ГБО LPG
                                    </span>
                                  )}
                                  {(curCar as any).hasChiptuning && (
                                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded font-bold border border-purple-400/20">
                                      Stage 1
                                    </span>
                                  )}
                                </h4>
                                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-2">
                                  <span>Топливный бак: {curCar.fuelSystem ? Math.round(curCar.fuelSystem.tankLevel) : 0}%</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    Цвет: 
                                    <span 
                                      className="inline-block w-3 h-3 rounded-full border border-white/20"
                                      style={{ backgroundColor: curCar.color || '#991b1b' }}
                                    />
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right sm:text-right text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-850">
                              <div className="text-slate-500">Система самодиагностики ЭБУ:</div>
                              <div className={`font-bold mt-0.5 ${repairCost > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {repairCost > 0 ? '⚠️ Требуется обслуживание' : '🟢 Ошибок не обнаружено'}
                              </div>
                            </div>
                          </div>

                          {/* Interactive Workshop Inner Navigation */}
                          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-850 text-[11px] font-bold">
                            <button
                              onClick={() => {
                                setWorkshopSubTab('diagnostics');
                                sound.playButtonPress();
                              }}
                              className={`py-2 rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                                workshopSubTab === 'diagnostics' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Техосмотр</span>
                            </button>
                            <button
                              onClick={() => {
                                setWorkshopSubTab('repair');
                                sound.playButtonPress();
                              }}
                              className={`py-2 rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                                workshopSubTab === 'repair' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Ремонт</span>
                            </button>
                            <button
                              onClick={() => {
                                setWorkshopSubTab('paint');
                                sound.playButtonPress();
                              }}
                              className={`py-2 rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                                workshopSubTab === 'paint' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Palette className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Покраска</span>
                            </button>
                            <button
                              onClick={() => {
                                setWorkshopSubTab('lpg');
                                sound.playButtonPress();
                              }}
                              className={`py-2 rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                                workshopSubTab === 'lpg' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Fuel className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Установка ГБО</span>
                            </button>
                            <button
                              onClick={() => {
                                setWorkshopSubTab('tuning');
                                sound.playButtonPress();
                              }}
                              className={`py-2 rounded-lg transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                                workshopSubTab === 'tuning' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Gauge className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Тюнинг</span>
                            </button>
                          </div>

                          {/* Tab Content Display Area */}
                          <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-xl min-h-[220px] flex flex-col justify-center">
                            
                            {/* TAB 1: DIAGNOSTICS */}
                            {workshopSubTab === 'diagnostics' && (
                              isInspecting ? (
                                <div className="space-y-4 py-6 text-center w-full">
                                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 max-w-md mx-auto">
                                    <span>{inspectionStepText}</span>
                                    <span className="font-mono text-sky-400">{inspectionProgress}%</span>
                                  </div>
                                  <div className="w-full max-w-md mx-auto bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                      className="bg-sky-500 h-full transition-all duration-100 ease-out shadow-[0_0_8px_#0ea5e9]"
                                      style={{ width: `${inspectionProgress}%` }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-500 animate-pulse">Идет сканирование диагностических шин и датчиков...</div>
                                </div>
                              ) : hasInspectedVehicleId === curCar.id ? (
                                <div className="space-y-4 w-full">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-white font-bold text-xs flex items-center gap-1.5">
                                      <Activity className="w-4 h-4 text-emerald-400" />
                                      <span>Диагностическая карта PIT-STOP</span>
                                    </h5>
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-400/20">
                                      Техосмотр пройден
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-1.5">
                                      <div className="font-semibold text-slate-400 border-b border-slate-800 pb-1 mb-1 flex justify-between">
                                        <span>Кузовное состояние:</span>
                                        <span className={bodyPanelsDeform > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                          {bodyPanelsDeform > 0 ? '⚠️ Нарушена геометрия' : '🟢 В идеале'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-mono">
                                        <span>• Передний бампер / Капот:</span>
                                        <span className={frontBumperDeform > 0 ? 'text-amber-400' : 'text-slate-500'}>
                                          {frontBumperDeform > 0 ? `Деформация ${frontBumperDeform}%` : '🟢 Без дефектов'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-mono">
                                        <span>• Задний бампер / Багажник:</span>
                                        <span className={rearBumperDeform > 0 ? 'text-amber-400' : 'text-slate-500'}>
                                          {rearBumperDeform > 0 ? `Деформация ${rearBumperDeform}%` : '🟢 Без дефектов'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-mono">
                                        <span>• Лобовое стекло:</span>
                                        <span className={curCar.damage?.windshieldCracked ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                                          {curCar.damage?.windshieldCracked ? '🔴 Трещины (Замена)' : '🟢 Целое'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-1.5">
                                      <div className="font-semibold text-slate-400 border-b border-slate-800 pb-1 mb-1 flex justify-between">
                                        <span>Ходовая и Моторный отсек:</span>
                                        <span className={(suspensionDeform > 0 || (curCar.damage?.steeringDrift && Math.abs(curCar.damage.steeringDrift) > 0.05)) ? 'text-amber-400' : 'text-emerald-400'}>
                                          {(suspensionDeform > 0 || (curCar.damage?.steeringDrift && Math.abs(curCar.damage.steeringDrift) > 0.05)) ? '⚠️ Требует ремонта' : '🟢 Норма'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-mono">
                                        <span>• Сход-развал колес:</span>
                                        <span className={(curCar.damage?.steeringDrift && Math.abs(curCar.damage.steeringDrift) > 0.05) ? 'text-amber-400' : 'text-slate-500'}>
                                          {(curCar.damage?.steeringDrift && Math.abs(curCar.damage.steeringDrift) > 0.05) ? '🔴 Нарушен (Увод в сторону)' : '🟢 Норма'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-mono">
                                        <span>• Подвеска / Рычаги:</span>
                                        <span className={suspensionDeform > 0 ? 'text-amber-400' : 'text-slate-500'}>
                                          {suspensionDeform > 0 ? `Деструкция ${suspensionDeform}%` : '🟢 Без дефектов'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-mono">
                                        <span>• Герметичность ДВС:</span>
                                        <span className={curCar.engineState?.oilPunctured ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                                          {curCar.engineState?.oilPunctured ? '🔴 Пробит картер (Течь масла)' : '🟢 Герметично'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-[11px]">
                                    <p className="text-slate-400">
                                      Диагностический отчет сохранен в локальном блоке ЭБУ. Вы можете перейти к вкладке <strong>Ремонт</strong> для проведения всех необходимых процедур.
                                    </p>
                                    <button 
                                      onClick={handleStartInspection}
                                      disabled={playerCash < DIAGNOSTIC_COST}
                                      className="ml-3 px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-bold hover:bg-slate-700 hover:text-white transition whitespace-nowrap"
                                    >
                                      Перепроверить (50 ₽)
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center space-y-4 py-4 max-w-md mx-auto">
                                  <Activity className="w-12 h-12 text-slate-500 mx-auto animate-pulse" />
                                  <div className="space-y-1">
                                    <h5 className="text-white font-bold text-sm">Полный техосмотр</h5>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                      Электронная диагностика кузовных повреждений, степени износа подвески, амортизаторов, а также опрос внутренней памяти ошибок ЭБУ OBD-II. 
                                      <br />
                                      <span className="text-amber-400/90 mt-1 inline-block font-semibold">После прохождения откроется автоматический расчет стоимости ремонта.</span>
                                    </p>
                                  </div>
                                  <button
                                    onClick={handleStartInspection}
                                    disabled={playerCash < DIAGNOSTIC_COST}
                                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md ${
                                      playerCash >= DIAGNOSTIC_COST
                                        ? 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95 border border-sky-400/40'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                    }`}
                                  >
                                    <span>Запустить техосмотр и диагностику</span>
                                    <span className="font-mono text-amber-300">50 ₽</span>
                                  </button>
                                </div>
                              )
                            )}

                            {/* TAB 2: REPAIR */}
                            {workshopSubTab === 'repair' && (
                              isRepairing ? (
                                <div className="space-y-4 py-6 text-center w-full">
                                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 max-w-md mx-auto">
                                    <span>{repairStepText}</span>
                                    <span className="font-mono text-sky-400">{repairProgress}%</span>
                                  </div>
                                  <div className="w-full max-w-md mx-auto bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                      className="bg-sky-500 h-full transition-all duration-100 ease-out shadow-[0_0_8px_#0ea5e9]"
                                      style={{ width: `${repairProgress}%` }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-500 animate-pulse">Работают стапельные роботы и автослесари...</div>
                                </div>
                              ) : hasInspectedVehicleId !== curCar.id ? (
                                <div className="text-center space-y-3 py-6 max-w-md mx-auto">
                                  <Info className="w-10 h-10 text-amber-500 mx-auto" />
                                  <h5 className="text-white font-bold text-sm">Сначала пройдите Техосмотр!</h5>
                                  <p className="text-slate-400 text-xs leading-relaxed">
                                    Автоматическая система PIT-STOP не может оценить степень внутренних дефектов без предварительной дефектовки. Пожалуйста, запустите техосмотр на первой вкладке.
                                  </p>
                                  <button
                                    onClick={() => setWorkshopSubTab('diagnostics')}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition"
                                  >
                                    Перейти к техосмотру
                                  </button>
                                </div>
                              ) : repairCost === 0 ? (
                                <div className="text-center space-y-3 py-6 max-w-md mx-auto">
                                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                                  <h5 className="text-white font-bold text-sm">Автомобиль полностью исправен</h5>
                                  <p className="text-slate-400 text-xs">
                                    Диагностика не выявила никаких дефектов кузова, оптики, стекол или ходовой части. Ремонтные работы не требуются!
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-4 w-full">
                                  <h5 className="text-white font-bold text-xs flex items-center gap-1.5">
                                    <Wrench className="w-4 h-4 text-sky-400" />
                                    <span>Дефектная ведомость и расчет стоимости ремонта</span>
                                  </h5>

                                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-2 text-xs max-h-[140px] overflow-y-auto font-mono scrollbar-thin">
                                    {curCar.damage?.frontCrumple > 0.05 && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Геометрия передка и моторный щит</span>
                                        <span>{Math.round(curCar.damage.frontCrumple * 20)} ₽</span>
                                      </div>
                                    )}
                                    {curCar.damage?.rearCrumple > 0.05 && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Рихтовка кормы и силовой балки</span>
                                        <span>{Math.round(curCar.damage.rearCrumple * 20)} ₽</span>
                                      </div>
                                    )}
                                    {((curCar.damage?.leftDent || 0) + (curCar.damage?.rightDent || 0)) > 0.05 && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Вытягивание вмятин боковых бортов</span>
                                        <span>{Math.round(((curCar.damage.leftDent || 0) + (curCar.damage.rightDent || 0)) * 15)} ₽</span>
                                      </div>
                                    )}
                                    {suspensionDeform > 0 && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Стендовая переборка рычагов подвески</span>
                                        <span>{Math.round((curCar.damage.frontLeftSuspensionDamage + curCar.damage.frontRightSuspensionDamage + curCar.damage.rearLeftSuspensionDamage + curCar.damage.rearRightSuspensionDamage) * 250)} ₽</span>
                                      </div>
                                    )}
                                    {curCar.damage?.windshieldCracked && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Новое лобовое триплекс-стекло с установкой</span>
                                        <span>250 ₽</span>
                                      </div>
                                    )}
                                    {curCar.damage?.leftHeadlightBroken && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Новая фара ближнего света (левая)</span>
                                        <span>80 ₽</span>
                                      </div>
                                    )}
                                    {curCar.damage?.rightHeadlightBroken && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Новая фара ближнего света (правая)</span>
                                        <span>80 ₽</span>
                                      </div>
                                    )}
                                    {curCar.engineState?.oilPunctured && (
                                      <div className="flex justify-between text-slate-300">
                                        <span>• Заварка аргоном трещины поддона картера</span>
                                        <span>200 ₽</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                    <div>
                                      <div className="text-[10px] text-slate-500">ИТОГО К ОПЛАТЕ:</div>
                                      <div className="text-xl font-mono font-bold text-amber-300">{repairCost} ₽</div>
                                    </div>
                                    <button
                                      onClick={handleStartRepair}
                                      disabled={playerCash < repairCost}
                                      className={`px-6 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-md ${
                                        playerCash >= repairCost
                                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/40'
                                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                      }`}
                                    >
                                      <span>Оплатить и начать ремонт</span>
                                    </button>
                                  </div>
                                </div>
                              )
                            )}

                            {/* TAB 3: PAINTING */}
                            {workshopSubTab === 'paint' && (
                              isPainting ? (
                                <div className="space-y-4 py-6 text-center w-full">
                                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 max-w-md mx-auto">
                                    <span>{paintStepText}</span>
                                    <span className="font-mono text-sky-400">{paintProgress}%</span>
                                  </div>
                                  <div className="w-full max-w-md mx-auto bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                      className="bg-emerald-500 h-full transition-all duration-100 ease-out"
                                      style={{ width: `${paintProgress}%` }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-500 animate-pulse">Работает покрасочная камера избыточного давления...</div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-xs">
                                  <div className="space-y-3">
                                    {/* Paint Target Selector */}
                                    <div>
                                      <span className="text-slate-400 font-semibold block mb-1.5">Зона окраски:</span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setPaintTarget('body');
                                            sound.playButtonPress();
                                          }}
                                          className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                            paintTarget === 'body'
                                              ? 'bg-sky-600/25 border-sky-500 text-sky-300'
                                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          🚗 Кузов целиком
                                        </button>
                                        <button
                                          onClick={() => {
                                            setPaintTarget('roof');
                                            sound.playButtonPress();
                                          }}
                                          className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                            paintTarget === 'roof'
                                              ? 'bg-sky-600/25 border-sky-500 text-sky-300'
                                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          📐 Только крыша
                                        </button>
                                      </div>
                                    </div>

                                    {/* Paint Quality Tier Selector */}
                                    <div>
                                      <span className="text-slate-400 font-semibold block mb-1.5">Класс покрытия и пигмента:</span>
                                      <div className="flex flex-col gap-1.5">
                                        <button
                                          onClick={() => {
                                            setPaintType('standard');
                                            sound.playButtonPress();
                                          }}
                                          className={`p-2 rounded-lg border text-left transition flex justify-between items-center ${
                                            paintType === 'standard'
                                              ? 'bg-slate-950 border-sky-500 text-white'
                                              : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          <div>
                                            <div className="font-bold">Стандартная автоэмаль</div>
                                            <div className="text-[10px] text-slate-500">Глянцевый однотонный акрил</div>
                                          </div>
                                          <span className="font-mono text-amber-400 font-bold">150 ₽</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            setPaintType('premium');
                                            sound.playButtonPress();
                                          }}
                                          className={`p-2 rounded-lg border text-left transition flex justify-between items-center ${
                                            paintType === 'premium'
                                              ? 'bg-slate-950 border-sky-500 text-white'
                                              : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          <div>
                                            <div className="font-bold">Перламутр / Металлик</div>
                                            <div className="text-[10px] text-slate-500">Сложное двухслойное покрытие со слюдой</div>
                                          </div>
                                          <span className="font-mono text-amber-400 font-bold">350 ₽</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            setPaintType('custom');
                                            sound.playButtonPress();
                                          }}
                                          className={`p-2 rounded-lg border text-left transition flex justify-between items-center ${
                                            paintType === 'custom'
                                              ? 'bg-slate-950 border-sky-500 text-white'
                                              : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          <div>
                                            <div className="font-bold">Кастомный подбор колера</div>
                                            <div className="text-[10px] text-slate-500">Ручное смешивание пигментов, любой RGB спектр</div>
                                          </div>
                                          <span className="font-mono text-amber-400 font-bold">950 ₽</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3 flex flex-col justify-between">
                                    {/* Interactive Color Selection */}
                                    <div>
                                      <span className="text-slate-400 font-semibold block mb-1.5">Выберите цвет автоэмали:</span>
                                      
                                      {paintType === 'custom' ? (
                                        <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                                          <div className="flex items-center gap-3">
                                            <input 
                                              type="color" 
                                              value={selectedPaintColor} 
                                              onChange={(e) => setSelectedPaintColor(e.target.value)} 
                                              className="w-12 h-10 bg-transparent border-0 cursor-pointer rounded overflow-hidden"
                                            />
                                            <div>
                                              <div className="font-mono font-bold text-white uppercase">{selectedPaintColor}</div>
                                              <div className="text-[10px] text-slate-500">Тонкий подбор колера по шкале Pantone</div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : paintType === 'premium' ? (
                                        <div className="flex flex-wrap gap-2">
                                          {[
                                            { name: 'Midnight Purple', hex: '#3b0764' },
                                            { name: 'Nardo Gray', hex: '#4b5563' },
                                            { name: 'Liquid Gold', hex: '#ca8a04' },
                                            { name: 'Cherry Metallic', hex: '#881337' },
                                            { name: 'Pearl Aqua', hex: '#0d9488' }
                                          ].map((c) => (
                                            <button
                                              key={c.hex}
                                              onClick={() => {
                                                setSelectedPaintColor(c.hex);
                                                sound.playButtonPress();
                                              }}
                                              className={`w-8 h-8 rounded-full border-2 transition relative ${
                                                selectedPaintColor === c.hex ? 'border-sky-400 scale-110 shadow' : 'border-transparent hover:scale-105'
                                              }`}
                                              style={{ backgroundColor: c.hex }}
                                              title={c.name}
                                            >
                                              {selectedPaintColor === c.hex && (
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm drop-shadow-md">✓</span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {[
                                            { name: 'Crimson Red', hex: '#991b1b' },
                                            { name: 'Alpine White', hex: '#f8fafc' },
                                            { name: 'Deep Onyx', hex: '#111827' },
                                            { name: 'Navy Blue', hex: '#1e3a8a' },
                                            { name: 'Forest Green', hex: '#064e3b' },
                                            { name: 'Sunflower Yellow', hex: '#eab308' }
                                          ].map((c) => (
                                            <button
                                              key={c.hex}
                                              onClick={() => {
                                                setSelectedPaintColor(c.hex);
                                                sound.playButtonPress();
                                              }}
                                              className={`w-8 h-8 rounded-full border-2 transition relative ${
                                                selectedPaintColor === c.hex ? 'border-sky-400 scale-110 shadow' : 'border-transparent hover:scale-105'
                                              }`}
                                              style={{ backgroundColor: c.hex }}
                                              title={c.name}
                                            >
                                              {selectedPaintColor === c.hex && (
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm drop-shadow-md">✓</span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Preview & Spray Trigger */}
                                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[10px]">Превью пигмента:</span>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-14 h-5 rounded-md border border-white/10 transition-all duration-300"
                                            style={{ backgroundColor: selectedPaintColor }}
                                          />
                                          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">{selectedPaintColor}</span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={handleStartPaint}
                                        disabled={playerCash < paintPrice}
                                        className={`w-full py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 shadow ${
                                          playerCash >= paintPrice
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/20'
                                            : 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed'
                                        }`}
                                      >
                                        <span>Начать окраску</span>
                                        <span className="font-mono text-amber-300">{paintPrice} ₽</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                            {/* TAB 4: LPG Retrofitting */}
                            {workshopSubTab === 'lpg' && (
                              tuningAction === 'gbo_install' || tuningAction === 'gbo_remove' ? (
                                <div className="space-y-4 py-6 text-center w-full">
                                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 max-w-md mx-auto">
                                    <span>{tuningStepText}</span>
                                    <span className="font-mono text-sky-400">{tuningProgress}%</span>
                                  </div>
                                  <div className="w-full max-w-md mx-auto bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                      className="bg-sky-500 h-full transition-all duration-100 ease-out"
                                      style={{ width: `${tuningProgress}%` }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-500 animate-pulse">Идет монтаж редуктора Lovato и прокладка магистралей...</div>
                                </div>
                              ) : curCar.hasGBO ? (
                                <div className="text-center space-y-4 py-4 max-w-md mx-auto">
                                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-xl">⛽</div>
                                  <div className="space-y-1">
                                    <h5 className="text-white font-bold text-sm">ГБО 4-го поколения уже установлено!</h5>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                      Ваш автомобиль успешно переоборудован на пропан-бутановую смесь Lovato Easy Fast. Заправка газом LPG производится на старой ТРК №5 (по сниженному тарифу). 
                                      Бензин сохранен как резервное топливо.
                                    </p>
                                  </div>
                                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
                                    <div className="text-left">
                                      <div className="font-bold text-xs text-white">Вам больше не нужно ГБО?</div>
                                      <div className="text-[10px] text-slate-500">Снятие бака и восстановление форсунок</div>
                                    </div>
                                    <button
                                      onClick={() => handleStartTuning('gbo_remove', 100)}
                                      disabled={playerCash < 100}
                                      className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-lg transition"
                                    >
                                      Демонтировать (100 ₽)
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-xs">
                                  <div className="space-y-3">
                                    <h5 className="text-white font-bold text-sm flex items-center gap-1.5">
                                      <Fuel className="w-4 h-4 text-emerald-400" />
                                      <span>Преимущества перехода на ГБО Lovato:</span>
                                    </h5>
                                    <ul className="space-y-2 text-slate-300">
                                      <li className="flex gap-2">
                                        <span className="text-emerald-400 font-bold">✓</span>
                                        <span><strong>Экономия 50%:</strong> Стоимость LPG пропан-бутана всего около 28 ₽/литр против 58 ₽ за бензин.</span>
                                      </li>
                                      <li className="flex gap-2">
                                        <span className="text-emerald-400 font-bold">✓</span>
                                        <span><strong>Антидетонация:</strong> Октановое число газа — 105-110, двигатель работает мягче, исключен износ клапанов.</span>
                                      </li>
                                      <li className="flex gap-2">
                                        <span className="text-emerald-400 font-bold">✓</span>
                                        <span><strong>Двухтопливность:</strong> Переключение бензин / газ по одной кнопке в салоне.</span>
                                      </li>
                                    </ul>
                                  </div>

                                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl flex flex-col justify-between">
                                    <div className="space-y-1.5">
                                      <div className="font-bold text-white text-xs">Комплект ГБО Digitronic/Lovato 4</div>
                                      <p className="text-slate-500 text-[11px] leading-relaxed">
                                        Включает тороидальный баллон 42л на место запаски, электромагнитный редуктор, рампу скоростных форсунок и ЭБУ газового впрыска.
                                      </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-850/60 flex items-center justify-between">
                                      <div>
                                        <span className="text-[9px] text-slate-500 block">СТОИМОСТЬ ПОД КЛЮЧ:</span>
                                        <span className="font-mono text-xl font-bold text-amber-300">1200 ₽</span>
                                      </div>
                                      <button
                                        onClick={() => handleStartTuning('gbo_install', 1200)}
                                        disabled={playerCash < 1200}
                                        className={`px-5 py-2 rounded-xl font-bold text-xs transition shadow ${
                                          playerCash >= 1200
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/20'
                                            : 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed'
                                        }`}
                                      >
                                        Установить ГБО
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                            {/* TAB 5: REALISTIC TUNING */}
                            {workshopSubTab === 'tuning' && (
                              tuningAction && tuningAction !== 'gbo_install' && tuningAction !== 'gbo_remove' ? (
                                <div className="space-y-4 py-6 text-center w-full">
                                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 max-w-md mx-auto">
                                    <span>{tuningStepText}</span>
                                    <span className="font-mono text-sky-400">{tuningProgress}%</span>
                                  </div>
                                  <div className="w-full max-w-md mx-auto bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                      className="bg-sky-500 h-full transition-all duration-100 ease-out"
                                      style={{ width: `${tuningProgress}%` }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-500 animate-pulse">Калибровка систем на мощностном стенде...</div>
                                </div>
                              ) : (
                                <div className="space-y-3 w-full text-xs">
                                  <h5 className="text-white font-bold text-xs flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                                    <Gauge className="w-4 h-4 text-purple-400 animate-spin-slow" />
                                    <span>Высокотехнологичный тюнинг автомобиля (Non-Arcade)</span>
                                  </h5>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* 1. Alignment */}
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                                      <div className="space-y-1">
                                        <div className="font-bold text-white flex justify-between">
                                          <span>Сход-развал 3D</span>
                                          <span className="text-emerald-400 font-mono">80 ₽</span>
                                        </div>
                                        <p className="text-slate-500 text-[10px] leading-relaxed">
                                          Коррекция углов кастера и схождения. Полностью убирает увод машины вбок при езде и нормализует износ шин.
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleStartTuning('alignment', 80)}
                                        disabled={playerCash < 80}
                                        className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg transition"
                                      >
                                        Отрегулировать
                                      </button>
                                    </div>

                                    {/* 2. Heavy Suspension */}
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                                      <div className="space-y-1">
                                        <div className="font-bold text-white flex justify-between">
                                          <span>Усиленная подвеска</span>
                                          {(curCar as any).hasHeavySuspension ? (
                                            <span className="text-sky-400 text-[9px] bg-sky-500/10 px-1 rounded border border-sky-400/20 font-bold">АКТИВНО</span>
                                          ) : (
                                            <span className="text-amber-400 font-mono">450 ₽</span>
                                          )}
                                        </div>
                                        <p className="text-slate-500 text-[10px] leading-relaxed">
                                          Комплект Bilstein Heavy Duty. Повышает прочность рычагов и пружин, снижая урон от бордюров и камней на 40%!
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleStartTuning('suspension', 450)}
                                        disabled={playerCash < 450 || (curCar as any).hasHeavySuspension}
                                        className={`mt-3 w-full py-1.5 font-bold text-[10px] rounded-lg transition ${
                                          (curCar as any).hasHeavySuspension
                                            ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                                        }`}
                                      >
                                        {(curCar as any).hasHeavySuspension ? 'Уже установлено' : 'Установить'}
                                      </button>
                                    </div>

                                    {/* 3. Chiptuning ECU */}
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                                      <div className="space-y-1">
                                        <div className="font-bold text-white flex justify-between">
                                          <span>Чип ДВС Stage 1</span>
                                          {(curCar as any).hasChiptuning ? (
                                            <span className="text-purple-400 text-[9px] bg-purple-500/10 px-1 rounded border border-purple-400/20 font-bold">АКТИВНО</span>
                                          ) : (
                                            <span className="text-amber-400 font-mono">600 ₽</span>
                                          )}
                                        </div>
                                        <p className="text-slate-500 text-[10px] leading-relaxed">
                                          Программная перепрошивка карт впрыска. Снижает расход топлива (включая LPG) на 15% за счет оптимизации AFR.
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleStartTuning('chiptuning', 600)}
                                        disabled={playerCash < 600 || (curCar as any).hasChiptuning}
                                        className={`mt-3 w-full py-1.5 font-bold text-[10px] rounded-lg transition ${
                                          (curCar as any).hasChiptuning
                                            ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                                        }`}
                                      >
                                        {(curCar as any).hasChiptuning ? 'Уже установлено' : 'Прошить ЭБУ'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                          </div>
                        </div>
                      );
                    })() : (
                      <>
                        {/* Normal / Non-Auto shop quick repair block if canRepairVehicle is true */}
                        {(canRepairVehicle || shopType === 'auto_shop') && onRepairVehicle && (
                          <div className="p-4 bg-slate-800 border border-slate-700/80 rounded-xl flex items-center justify-between gap-4 shadow-sm mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-sky-500/20 rounded-xl border border-sky-400/40 text-sky-300">
                                <Wrench className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-sm">Полный автосервис и ремонт</h3>
                                <p className="text-sky-200/80 text-xs">Восстановление кузова, двигателя, колес и стекол машины</p>
                              </div>
                            </div>

                            <button
                              onClick={onRepairVehicle}
                              disabled={playerCash < 300}
                              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-md ${
                                playerCash >= 300
                                  ? 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95 border border-sky-400/40'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              }`}
                            >
                              <span>Отремонтировать</span>
                              <span className="font-mono text-amber-300">$300</span>
                            </button>
                          </div>
                        )}

                        {/* Item Catalog Shelf Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentCatalog.map((item) => {
                        const quantityInCart = cart[item.id] || 0;

                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-850/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 p-1 shadow-inner">
                                <ItemIconCanvas itemId={item.itemId} size={36} />
                              </div>

                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-100 truncate block">{item.nameRu}</span>
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug mt-1 font-sans">{item.description}</p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {/* Price Tag styled as realistic retail shelf label */}
                              <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-bold rounded">
                                ${item.price}
                              </div>

                              <button
                                onClick={() => handleAddToCart(item)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition shadow-sm active:scale-95 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>В корзину</span>
                                {quantityInCart > 0 && (
                                  <span className="ml-1 px-1 bg-white text-emerald-700 rounded-full font-sans text-[9px]">
                                    {quantityInCart}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
              </div>

              {/* Cart Tab content on mobile */}
              <div className={`${activeTab === 'cart' ? 'block' : 'hidden md:hidden'}`}>
                <MobileCartPanel 
                  cartItemsList={cartItemsList} 
                  handleAddToCart={handleAddToCart}
                  handleRemoveFromCart={handleRemoveFromCart}
                  handleClearCart={handleClearCart}
                  handleProceedToPayment={handleProceedToPayment}
                />
              </div>
            </div>

            {/* Shopping Cart Panel (Right, 1/3 size - Desktop only) */}
            <div className="hidden md:flex md:w-1/3 p-5 flex-col bg-slate-950/40 border-l border-slate-900 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-slate-300" />
                  <span className="text-white font-bold text-sm">Моя корзина</span>
                </div>
                {cartTotalItemsCount > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Очистить
                  </button>
                )}
              </div>

              {/* Cart Item list - NO PRICES SHOWN FOR REALISM */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {cartItemsList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mb-2">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">Корзина пуста</span>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[160px]">
                      Выберите товары на прилавке слева и добавьте их в корзину
                    </p>
                  </div>
                ) : (
                  cartItemsList.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-850/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-sm hover:bg-slate-800/50 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-0.5 text-emerald-400">
                          {item.itemId === 'fuel_order' ? (
                            <Fuel className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ItemIconCanvas itemId={item.itemId} size={28} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-100 font-medium text-xs truncate block">{item.nameRu}</span>
                          <span className="text-[10px] text-emerald-400/80 uppercase font-mono tracking-wider">
                            {item.itemId === 'fuel_order' ? '⛽ Топливо ТРК' : 'Товар'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRemoveFromCart(item)}
                          className="p-1 rounded bg-slate-850 border border-slate-700 hover:bg-slate-750 text-slate-400 hover:text-white transition active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-slate-100 font-mono text-xs w-6 text-center">{quantity}</span>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="p-1 rounded bg-slate-850 border border-slate-700 hover:bg-slate-750 text-slate-400 hover:text-white transition active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout CTA */}
              <div className="pt-4 border-t border-slate-800 bg-slate-900/50 p-2.5 rounded-xl mt-4">
                <div className="flex items-center gap-2 mb-3 bg-slate-950 p-2 rounded-lg border border-slate-850">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-[10px] text-slate-400 leading-normal font-sans">
                    Цены не указаны в корзине для реализма. Полная стоимость отобразится на кассовом терминале.
                  </p>
                </div>
                <button
                  onClick={handleProceedToPayment}
                  disabled={cartTotalItemsCount === 0}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 ${
                    cartTotalItemsCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/40'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>ОПЛАТИТЬ НА ТЕРМИНАЛЕ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Interactive POS Terminal + Coin Tray */}
        {view === 'checkout' && (
          <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-[480px]">
            {/* Column 1: POS Terminal Display (Left, 2/5 size) */}
            <div className="w-full md:w-2/5 p-5 bg-slate-950/80 border-r border-slate-850 flex flex-col justify-between shrink-0">
              {/* Terminal Frame */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex-1 flex flex-col justify-between">
                <div>
                  {/* Digital glowing screen */}
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 font-mono shadow-inner text-emerald-400 mb-4 h-56 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] opacity-60 flex justify-between">
                        <span>ТЕРМИНАЛ POS-2026</span>
                        <span>ОНЛАЙН</span>
                      </div>
                      <div className="h-[1px] bg-emerald-500/20 my-2" />
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col justify-center">
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">ИТОГО К ОПЛАТЕ:</span>
                        <span className="font-bold text-amber-300 text-sm">${checkoutTotal}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">ВНЕСЕНО НАЛОМ:</span>
                        <span className="font-bold text-emerald-300 text-sm">${totalPaid}</span>
                      </div>
                      
                      <div className="h-[1px] bg-emerald-500/20 my-1" />

                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {paymentPhase === 'change' ? 'СДАЧА К ВЫДАЧЕ:' : 'ОСТАЛОСЬ ВНЕСТИ:'}
                        </span>
                        <span className={`text-xl font-bold ${
                          paymentPhase === 'change' ? 'text-amber-400' : remainingToPay === 0 ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'
                        }`}>
                          ${paymentPhase === 'change' ? (totalPaid - checkoutTotal) : remainingToPay}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="h-[1px] bg-emerald-500/20 my-2" />
                      <div className="text-[10px] uppercase flex items-center gap-1.5 font-sans font-bold">
                        {paymentPhase === 'change' ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                            <span className="text-amber-300">Заберите сдачу с монетницы!</span>
                          </>
                        ) : remainingToPay === 0 ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span className="text-emerald-300">Сумма набрана. Нажмите Оплатить.</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Ожидание купюр и монет...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guide info & Mobile Quick Pay Bar */}
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-[11px] text-slate-400 leading-normal">
                    <p className="text-white font-bold flex items-center gap-1.5 mb-1 text-xs">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Быстрая оплата (для телефонов и ПК)</span>
                    </p>
                    
                    {paymentPhase === 'paying' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAutoPayRequired}
                          disabled={remainingToPay <= 0 || wallet.length === 0}
                          className="px-2.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-500/40 text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition"
                        >
                          <span>⚡ Внести ровно ${remainingToPay}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleAutoPayAll}
                          disabled={wallet.length === 0}
                          className="px-2.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 border border-emerald-500/40 text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition"
                        >
                          <span>💰 Выложить всё</span>
                        </button>
                      </div>
                    )}

                    {paymentPhase === 'paying' ? (
                      <p className="text-[10px] text-slate-400 pt-1">
                        Вы также можете нажимать на отдельную купюру/монету или кнопку <strong className="text-emerald-400">+Всё</strong> в кошельке.
                      </p>
                    ) : (
                      <p className="text-amber-200">Кликните по сдаче на блюдце или нажмите кнопку ниже, чтобы забрать всё сразу.</p>
                    )}
                  </div>
                </div>

                {/* Primary Button panel */}
                <div className="mt-4 space-y-2">
                  {paymentPhase === 'paying' ? (
                    <>
                      <button
                        onClick={handleExecutePayment}
                        disabled={totalPaid < checkoutTotal}
                        className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${
                          totalPaid >= checkoutTotal
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>ПОДТВЕРДИТЬ И ОПЛАТИТЬ</span>
                      </button>

                      <button
                        onClick={handleCancelPayment}
                        className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/40 border border-slate-800 hover:bg-slate-800 transition text-xs font-semibold"
                      >
                        Вернуться к прилавку
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCollectAllChangeAndFinish}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white rounded-xl font-bold text-xs tracking-wider transition shadow-xl active:scale-95 flex items-center justify-center gap-2 animate-bounce"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>ЗАБРАТЬ СДАЧУ И ТОВАРЫ</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Physical Coin Tray and Wallet (Right, 3/5 size) */}
            <div className="w-full md:w-3/5 p-5 bg-slate-900/60 overflow-visible md:overflow-hidden flex flex-col justify-between space-y-4 shrink-0">
              
              {/* Section 1: The Coin Tray (Монетница) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>Монетница</span>
                    <span className="text-[10px] text-slate-500 normal-case font-normal">(Блюдце на прилавке)</span>
                  </h3>
                  {trayItems.length > 0 && paymentPhase === 'paying' && (
                    <button
                      type="button"
                      onClick={handleClearTray}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-amber-950/60 hover:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-800/60 transition active:scale-95"
                    >
                      ↩ Вернуть всё
                    </button>
                  )}
                </div>
                
                {/* The visual plastic/metallic coin plate */}
                <div
                  id="coin-tray"
                  onDragOver={onDragOver}
                  onDrop={onDropOnTray}
                  className="relative h-56 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-700 rounded-2xl shadow-inner overflow-hidden flex items-center justify-center border-dashed"
                >
                  {/* Subtle inner reflection ring for depth */}
                  <div className="absolute inset-2.5 border border-slate-800/30 rounded-xl pointer-events-none" />
                  
                  {trayItems.length === 0 ? (
                    <div className="text-center p-4 pointer-events-none select-none">
                      <Coins className="w-8 h-8 text-slate-700 mx-auto mb-1.5" />
                      <span className="text-[11px] text-slate-500 font-medium">Кладите деньги сюда</span>
                      <p className="text-[9px] text-slate-600 mt-0.5">Кликните по деньгам в кошельке ниже</p>
                    </div>
                  ) : (
                    <div className="absolute inset-0 w-full h-full">
                      {trayItems.map((item) => {
                        const styleInfo = item.type === 'bill' ? getBanknoteStyle(item.value) : null;
                        
                        return (
                          <div
                            key={item.id}
                            style={{
                              left: '50%',
                              top: '50%',
                              transform: `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px)) rotate(${item.angle}deg)`,
                              zIndex: 10
                            }}
                            className="absolute cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-100"
                            onClick={() => {
                              if (paymentPhase === 'paying') {
                                handleRefundItem(item);
                              } else {
                                handleTakeChangeItem(item);
                              }
                            }}
                            draggable={paymentPhase === 'paying'}
                            onDragStart={(e) => onDragStart(e, item)}
                          >
                            {item.type === 'bill' && styleInfo ? (
                              <div className={`${styleInfo.dims} ${styleInfo.bg} p-2 rounded-md shadow-2xl relative flex flex-col justify-between font-mono select-none overflow-hidden border`}>
                                {/* Fine security margins */}
                                <div className="absolute inset-1 border border-white/10 rounded pointer-events-none" />
                                
                                {/* Watermark cameo */}
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/5 pointer-events-none" />
                                
                                <div className="flex justify-between items-start text-[10px] font-bold">
                                  <span>${styleInfo.label}</span>
                                  <span className="text-[6px] opacity-40">{styleInfo.serial}</span>
                                  <span>${styleInfo.label}</span>
                                </div>
                                <div className="text-center text-xs font-bold tracking-widest my-0.5 py-0.5 border-y border-white/5 bg-white/5">
                                  ${styleInfo.label}
                                </div>
                                <div className="flex justify-between items-end text-[8px] font-bold">
                                  <span className="text-[5px] opacity-30 uppercase">Резерв</span>
                                  <span>${styleInfo.label}</span>
                                </div>
                              </div>
                            ) : (
                              /* 3D embossed realistic coin */
                              <div className="select-none flex items-center justify-center shrink-0">
                                {item.value === 10 ? (
                                  /* $10 Bimetallic gold/silver coin */
                                  <div className="w-[46px] h-[46px] rounded-full bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600 border border-yellow-700 shadow-xl flex items-center justify-center p-1.5">
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-400 border border-slate-400 flex items-center justify-center font-extrabold text-[11px] text-slate-800 font-mono shadow-inner">
                                      10
                                    </div>
                                  </div>
                                ) : item.value === 5 ? (
                                  /* $5 Silver coin */
                                  <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-slate-400 via-slate-100 to-slate-500 border border-slate-500 shadow-lg flex items-center justify-center font-extrabold text-xs text-slate-800 font-mono">
                                    5
                                  </div>
                                ) : item.value === 2 ? (
                                  /* $2 Silver coin */
                                  <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 border border-slate-400 shadow-md flex items-center justify-center font-extrabold text-xs text-slate-700 font-mono">
                                    2
                                  </div>
                                ) : (
                                  /* $1 Copper coin */
                                  <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-amber-700 via-orange-500 to-amber-800 border border-amber-800 shadow-md flex items-center justify-center font-extrabold text-[10px] text-amber-100 font-mono">
                                    1
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Player's Wallet (Кошелек) */}
              <div 
                className="flex-1 flex flex-col min-h-0"
                onDragOver={onDragOver}
                onDrop={onDropBackToWallet}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>Мой кошелёк</span>
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    ОСТАТОК: ${wallet.reduce((acc, curr) => acc + curr.value, 0)}
                  </div>
                </div>

                {/* Grid or scroll of physical cash */}
                <div className="flex-1 bg-slate-950/50 rounded-2xl border border-slate-800 p-4 overflow-y-auto space-y-4 shadow-inner max-h-[300px]">
                  {paymentPhase !== 'paying' ? (
                    <div className="h-full flex items-center justify-center text-center p-4 select-none">
                      <p className="text-xs text-slate-500 font-medium">
                        Оплата заблокирована. Завершите операцию или заберите сдачу выше.
                      </p>
                    </div>
                  ) : wallet.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 select-none">
                      <span className="text-xs text-slate-500 font-semibold">У вас кончились наличные!</span>
                      <p className="text-[10px] text-slate-600 mt-0.5">Все имеющиеся купюры разложены на кассе</p>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const billGroups = wallet
                          .filter((x) => x.type === 'bill')
                          .reduce((acc, curr) => {
                            const match = acc.find((g) => g.value === curr.value);
                            if (match) {
                              match.items.push(curr);
                            } else {
                              acc.push({ value: curr.value, type: 'bill', items: [curr] });
                            }
                            return acc;
                          }, [] as { value: number; type: 'bill'; items: PhysicalMoney[] }[])
                          .sort((a, b) => b.value - a.value);

                        const coinGroups = wallet
                          .filter((x) => x.type === 'coin')
                          .reduce((acc, curr) => {
                            const match = acc.find((g) => g.value === curr.value);
                            if (match) {
                              match.items.push(curr);
                            } else {
                              acc.push({ value: curr.value, type: 'coin', items: [curr] });
                            }
                            return acc;
                          }, [] as { value: number; type: 'coin'; items: PhysicalMoney[] }[])
                          .sort((a, b) => b.value - a.value);

                        return (
                          <>
                            <div className="text-[10px] text-slate-500 font-semibold mb-1 pb-1 flex justify-between items-center select-none font-mono">
                              <span>💡 Клик: положить 1 шт. | Двойной клик: выложить ВСЮ стопку</span>
                            </div>

                            {/* Banknotes sub-container */}
                            {billGroups.length > 0 && (
                              <div className="space-y-1.5 pb-2">
                                <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Бумажные купюры (Пачки)</span>
                                <div className="flex flex-wrap gap-x-5 gap-y-4 items-center pl-1 pt-1">
                                  {billGroups.map((group) => {
                                    const topItem = group.items[0];
                                    const styleInfo = getBanknoteStyle(group.value);
                                    const stackCount = group.items.length;

                                    return (
                                      <div key={group.value} className="relative select-none" style={{ width: '135px', height: '68px' }}>
                                        {/* 3D Stack Layer 3 */}
                                        {stackCount > 2 && (
                                          <div className={`absolute top-[4px] left-[4px] w-full h-full rounded-md border bg-slate-950 border-slate-900/60 opacity-60 pointer-events-none`} />
                                        )}
                                        {/* 3D Stack Layer 2 */}
                                        {stackCount > 1 && (
                                          <div className={`absolute top-[2px] left-[2px] w-full h-full rounded-md border bg-slate-900/80 border-slate-800/80 opacity-85 pointer-events-none`} />
                                        )}
                                        
                                        {/* Front Banknote */}
                                        <div
                                          className={`absolute top-0 left-0 cursor-pointer ${styleInfo.dims} ${styleInfo.bg} rounded-md border p-1.5 flex flex-col justify-between font-mono overflow-hidden hover:scale-105 active:scale-95 transition-transform shadow-md duration-75`}
                                          onClick={() => handlePayItem(topItem)}
                                          onDoubleClick={() => handlePayAllOfDenom(group.items)}
                                          draggable
                                          onDragStart={(e) => onDragStart(e, topItem)}
                                          title="Двойной клик — выложить всю стопку"
                                        >
                                          <div className="absolute inset-0.5 border border-white/5 rounded pointer-events-none" />
                                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/5 pointer-events-none" />
                                          
                                          <div className="flex justify-between items-start text-[9px] font-bold leading-none">
                                            <span>${styleInfo.label}</span>
                                            <span className="text-[4px] opacity-40">{styleInfo.serial}</span>
                                            <span>${styleInfo.label}</span>
                                          </div>
                                          <div className="text-center text-[10px] font-bold tracking-widest my-0.5 py-0.5 border-y border-white/5 bg-white/5 leading-none">
                                            ${styleInfo.label}
                                          </div>
                                          <div className="flex justify-between items-end text-[7px] font-bold leading-none">
                                            <span className="text-[4px] opacity-20 uppercase">Банк</span>
                                            <span>${styleInfo.label}</span>
                                          </div>

                                          {/* Stack quantity badge & Touch +Всё Button */}
                                          {stackCount > 1 && (
                                            <div className="absolute top-1 right-1 flex items-center gap-1 z-20">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handlePayAllOfDenom(group.items);
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-[8px] px-1 py-0.5 rounded border border-emerald-300 shadow-md transition"
                                                title="Выложить всю пачку"
                                              >
                                                +{stackCount} Всё
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Coins sub-container */}
                            {coinGroups.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                                <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Металлические монеты (Стопки)</span>
                                <div className="flex flex-wrap gap-x-6 gap-y-4 items-center pl-1 pt-1">
                                  {coinGroups.map((group) => {
                                    const topItem = group.items[0];
                                    const stackCount = group.items.length;
                                    const sizeClass = group.value === 10 ? 'w-[46px] h-[46px]' : group.value === 5 ? 'w-[42px] h-[42px]' : group.value === 2 ? 'w-[38px] h-[38px]' : 'w-[34px] h-[34px]';

                                    return (
                                      <div key={group.value} className={`relative flex items-center justify-center shrink-0 ${sizeClass}`}>
                                        {/* 3D Coin Stack Layer 3 */}
                                        {stackCount > 2 && (
                                          <div className="absolute top-[4px] left-[2px] w-full h-full rounded-full bg-slate-950 border border-slate-900/60 opacity-60 pointer-events-none" />
                                        )}
                                        {/* 3D Coin Stack Layer 2 */}
                                        {stackCount > 1 && (
                                          <div className="absolute top-[2px] left-[1px] w-full h-full rounded-full bg-slate-900 border border-slate-800/80 opacity-80 pointer-events-none" />
                                        )}

                                        {/* Front Coin */}
                                        <div
                                          className="absolute top-0 left-0 cursor-pointer transition-transform hover:scale-110 active:scale-95 flex items-center justify-center shrink-0"
                                          onClick={() => handlePayItem(topItem)}
                                          onDoubleClick={() => handlePayAllOfDenom(group.items)}
                                          draggable
                                          onDragStart={(e) => onDragStart(e, topItem)}
                                          title="Двойной клик — выложить всю стопку"
                                        >
                                          {group.value === 10 ? (
                                            <div className="w-[46px] h-[46px] rounded-full bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600 border border-yellow-700 shadow-md flex items-center justify-center p-1.5 relative">
                                              <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-400 border border-slate-400 flex items-center justify-center font-extrabold text-[11px] text-slate-800 font-mono">
                                                10
                                              </div>
                                            </div>
                                          ) : group.value === 5 ? (
                                            <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-slate-400 via-slate-100 to-slate-500 border border-slate-500 shadow-md flex items-center justify-center font-extrabold text-xs text-slate-800 font-mono">
                                              5
                                            </div>
                                          ) : group.value === 2 ? (
                                            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 border border-slate-400 shadow-md flex items-center justify-center font-extrabold text-xs text-slate-700 font-mono">
                                              2
                                            </div>
                                          ) : (
                                            <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-amber-700 via-orange-500 to-amber-800 border border-amber-800 shadow-sm flex items-center justify-center font-extrabold text-[10px] text-amber-100 font-mono">
                                              1
                                            </div>
                                          )}

                                          {/* Stack quantity badge & Touch +Всё button */}
                                          {stackCount > 1 && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handlePayAllOfDenom(group.items);
                                              }}
                                              className="absolute -top-1.5 -right-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-[8px] px-1 py-0.5 rounded-full border border-emerald-300 shadow-md z-20 transition"
                                              title="Выложить всю стопку"
                                            >
                                              +{stackCount}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            {view === 'checkout' 
              ? 'Магазин полностью офлайн-безопасен' 
              : 'Купленные предметы отправляются в ваш инвентарь [I]'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

// Extracted Sub-Component for mobile responsive cart layout
interface MobileCartPanelProps {
  cartItemsList: Array<{ item: ShopItem; quantity: number }>;
  handleAddToCart: (item: ShopItem) => void;
  handleRemoveFromCart: (item: ShopItem) => void;
  handleClearCart: () => void;
  handleProceedToPayment: () => void;
}

const MobileCartPanel: React.FC<MobileCartPanelProps> = ({
  cartItemsList,
  handleAddToCart,
  handleRemoveFromCart,
  handleClearCart,
  handleProceedToPayment
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
        <span className="text-white font-bold text-xs">Список покупок</span>
        {cartItemsList.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-[11px] text-red-400 font-bold hover:underline"
          >
            Очистить все
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] mb-4">
        {cartItemsList.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Корзина пуста. Добавьте товары выше.
          </div>
        ) : (
          cartItemsList.map(({ item, quantity }) => (
            <div
              key={item.id}
              className="p-2 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center p-0.5 text-emerald-400 shrink-0">
                  {item.itemId === 'fuel_order' ? (
                    <Fuel className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ItemIconCanvas itemId={item.itemId} size={24} />
                  )}
                </div>
                <span className="text-slate-100 text-xs truncate font-medium">{item.nameRu}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleRemoveFromCart(item)}
                  className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-400"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white font-mono text-xs w-4 text-center">{quantity}</span>
                <button
                  onClick={() => handleAddToCart(item)}
                  className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-400"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={handleProceedToPayment}
          disabled={cartItemsList.length === 0}
          className={`w-full py-3 rounded-xl font-bold text-xs transition ${
            cartItemsList.length > 0
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          Оплатить на терминале
        </button>
      </div>
    </div>
  );
};

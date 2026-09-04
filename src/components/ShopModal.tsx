import React, { useState, useEffect } from 'react';
import { Player } from '../types';
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
  Info 
} from 'lucide-react';
import { sound } from '../audio';
import { getPlayerCash } from '../items';

export interface ShopItem {
  id: string;
  itemId: string;
  nameRu: string;
  price: number;
  description: string;
  category: 'food' | 'medical' | 'auto';
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
    | 'sports_shop';
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
  }
];

export const SHOP_CATALOGS: Record<string, ShopItem[]> = {
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
    { id: 'clo_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Arctix"', price: 350, description: 'Фирменная куртка на вешалке с мембраной и гусиным пухом.', category: 'auto', effectText: 'Защита от холода (-15°C)' },
    { id: 'clo_sneakers', itemId: 'sneakers', nameRu: 'Кроссовки "Urban Sprint"', price: 280, description: 'Коробка с кроссовками: текстильная сетка, пенная подошва.', category: 'auto', effectText: '+20% Скорость бега' },
    { id: 'clo_glasses', itemId: 'sunglasses', nameRu: 'Поляризационные очки', price: 110, description: 'Черный футляр с очками против ультрафиолета и бликов.', category: 'auto', effectText: 'Защита зрения' },
    { id: 'clo_pack', itemId: 'backpack_travel', nameRu: 'Городской рюкзак (35L)', price: 240, description: 'Плотный нейлоновый рюкзак с защищенным отсеком под ноутбук.', category: 'auto', effectText: '+Слоты инвентаря' },
  ],
  bookstore: [
    { id: 'bk_guide', itemId: 'city_guide', nameRu: 'Путеводитель по городу', price: 60, description: 'Глянцевая книжка карманного формата с подробной картой кварталов.', category: 'auto', effectText: 'Знание города' },
    { id: 'bk_note', itemId: 'notebook', nameRu: 'Блокнот для заметок', price: 35, description: 'Записная книжка в клетку, стянута эластичной резинкой.', category: 'auto', effectText: 'Записи' },
    { id: 'bk_pen', itemId: 'pen_stationery', nameRu: 'Шариковая ручка', price: 15, description: 'Прозрачный корпус, синие чернила повышенной укрывистости.', category: 'auto', effectText: 'Канцтовары' },
    { id: 'bk_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Рулон плотного серого сантехнического скотча на картонной втулке.', category: 'auto', effectText: 'Починка вещей' },
  ],
  sports_shop: [
    { id: 'spt_sneakers', itemId: 'sneakers', nameRu: 'Беговые кроссовки', price: 280, description: 'Эргономичная обувь для фитнеса с гелевыми амортизаторами.', category: 'auto', effectText: '+20% Скорость' },
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
    { id: 'gea_sleep', itemId: 'sleeping_bag', nameRu: 'Спальный мешок (-15°C)', price: 260, description: 'Компрессионный чехол с теплым туристическим коконом.', category: 'auto', effectText: 'Ночлег на природе' },
    { id: 'gea_zippo', itemId: 'zippo_lighter', nameRu: 'Зажигалка Zippo', price: 80, description: 'Хромированный металлический бензиновый девайс с характерным щелчком.', category: 'auto', effectText: 'Розжиг огня' },
    { id: 'gea_compass', itemId: 'compass', nameRu: 'Тактический компас', price: 75, description: 'Металлический корпус с визиром и светящейся шкалой.', category: 'auto', effectText: 'Навигация' },
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
  if (!player || !player.inventory) return result;

  let itemCount = 0;

  // 1. First, find all explicit physical currency items in their inventory and add them exactly!
  for (const item of player.inventory) {
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

  // 2. Now, take the general unified 'cash' item from their inventory and decompose it into a lovely mix!
  const generalCashItem = player.inventory.find(i => i && i.itemId === 'cash');
  let remaining = generalCashItem ? generalCashItem.count : 0;

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
    | 'sports_shop';
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
  onBuyItems,
  onRepairVehicle,
  canRepairVehicle = false
}) => {
  // Shopping Cart & Buying Flow States
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'shelf' | 'cart'>('shelf'); // Mobile responsiveness
  const [view, setView] = useState<'catalog' | 'checkout'>('catalog');

  // Checkout Interactive States
  const [wallet, setWallet] = useState<PhysicalMoney[]>([]);
  const [trayItems, setTrayItems] = useState<PhysicalMoney[]>([]);
  const [paymentPhase, setPaymentPhase] = useState<'paying' | 'change' | 'complete'>('paying');
  const [checkoutTotal, setCheckoutTotal] = useState<number>(0);

  // If closed, return state
  useEffect(() => {
    if (!isOpen) {
      setCart({});
      setView('catalog');
      setTrayItems([]);
      setWallet([]);
      setPaymentPhase('paying');
    }
  }, [isOpen]);

  if (!isOpen || !player) return null;

  const playerCash = getPlayerCash(player);
  const currentCatalog = SHOP_CATALOGS[shopType] || SHOP_CATALOGS.supermarket;

  // Derive cart contents
  const cartItemsList = Object.entries(cart)
    .map(([id, quantity]) => {
      const item = currentCatalog.find((x) => x.id === id);
      return item ? { item, quantity } : null;
    })
    .filter((x): x is { item: ShopItem; quantity: number } => x !== null);

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

              {/* Shelf Tab content */}
              <div className={`${activeTab === 'shelf' ? 'block' : 'hidden md:block'} space-y-4`}>
                {/* Vehicle Repair Option (If in auto shop or near car) */}
                {(canRepairVehicle || shopType === 'auto_shop') && onRepairVehicle && (
                  <div className="p-4 bg-slate-800 border border-slate-700/80 rounded-xl flex items-center justify-between gap-4 shadow-sm">
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
                        <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-0.5">
                          <ItemIconCanvas itemId={item.itemId} size={28} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-100 font-medium text-xs truncate block">{item.nameRu}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Товар</span>
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
                <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center p-0.5">
                  <ItemIconCanvas itemId={item.itemId} size={24} />
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

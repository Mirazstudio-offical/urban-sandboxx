import React from 'react';
import { Player } from '../types';
import { ItemIconCanvas } from './ItemIconCanvas';
import { ShoppingBag, X, DollarSign, Wrench } from 'lucide-react';
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
    { id: 'sup_water', itemId: 'water_bottle', nameRu: 'Минеральная вода (0.5L)', price: 30, description: 'Чистая питьевая вода для утоления жажды.', category: 'food', effectText: '+40% Гидратация' },
    { id: 'sup_bread', itemId: 'bread_loaf', nameRu: 'Батон нарезной', price: 35, description: 'Свежий мягкий белый хлеб с хрустящей корочкой.', category: 'food', effectText: '+35% Сытость' },
    { id: 'sup_banana', itemId: 'banana', nameRu: 'Спелый банан', price: 25, description: 'Сладкий фрукт с калием и быстрой энергией.', category: 'food', effectText: '+20% Сытость, +15% Энергия' },
    { id: 'sup_apple', itemId: 'apple', nameRu: 'Сочное яблоко', price: 20, description: 'Свежее хрустящее яблоко.', category: 'food', effectText: '+15% Сытость, +10% Гидратация' },
    { id: 'sup_juice', itemId: 'fresh_juice', nameRu: 'Апельсиновый сок (0.5L)', price: 45, description: 'Натуральный сок с витамином C.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'sup_cookies', itemId: 'cookie_pack', nameRu: 'Печенье с шоколадом', price: 50, description: 'Хрустящее печенье с кусочками шоколада.', category: 'food', effectText: '+25% Сытость, +20% Энергия' },
    { id: 'sup_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Быстрые углеводы для восстановления тонуса.', category: 'food', effectText: '+20% Энергия' },
    { id: 'sup_chips', itemId: 'chips', nameRu: 'Хрустящие картофельные чипсы', price: 40, description: 'Соленые чипсы для быстрого перекуса.', category: 'food', effectText: '+20% Сытость' },
    { id: 'sup_canned', itemId: 'canned_meat', nameRu: 'Армейская тушенка', price: 90, description: 'Питательные мясные консервы длительного хранения.', category: 'food', effectText: '+60% Сытость' },
  ],
  fast_food: [
    { id: 'ff_burger', itemId: 'burger', nameRu: 'Двойной Чизбургер', price: 95, description: 'Сочная говяжья котлета, расплавленный сыр чеддер и салат.', category: 'food', effectText: '+50% Сытость, +25% Энергия' },
    { id: 'ff_fries', itemId: 'french_fries', nameRu: 'Картофель фри (Крупный)', price: 55, description: 'Золотистая хрустящая картофельная соломка с солью.', category: 'food', effectText: '+30% Сытость, +15% Энергия' },
    { id: 'ff_nuggets', itemId: 'nuggets', nameRu: 'Куриные наггетсы (6 шт)', price: 70, description: 'Нежное куриное филе в хрустящей панировке.', category: 'food', effectText: '+35% Сытость, +20% Энергия' },
    { id: 'ff_hotdog', itemId: 'hot_dog', nameRu: 'Датский хот-дог', price: 65, description: 'Поджаристая сосиска в булочке с хрустящим луком и горчицей.', category: 'food', effectText: '+40% Сытость' },
    { id: 'ff_colazero', itemId: 'cola_zero', nameRu: 'Кола Зеро (0.33L)', price: 40, description: 'Ледяная газировка без сахара со свежими пузырьками.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'ff_milkshake', itemId: 'milkshake', nameRu: 'Ванильный милкшейк', price: 60, description: 'Густой сладкий молочный коктейль с пломбиром.', category: 'food', effectText: '+35% Гидратация, +20% Сытость' },
  ],
  pizzeria: [
    { id: 'piz_pepperoni', itemId: 'pizza_slice', nameRu: 'Кусок пиццы Пепперони', price: 60, description: 'Горячая острая пицца с колбасками пепперони и моцареллой.', category: 'food', effectText: '+35% Сытость, +10% Энергия' },
    { id: 'piz_croissant', itemId: 'croissant', nameRu: 'Сырный чесночный круассан', price: 45, description: 'Слоеная выпечка с сырной корочкой.', category: 'food', effectText: '+25% Сытость' },
    { id: 'piz_juice', itemId: 'fresh_juice', nameRu: 'Фруктовый морс', price: 40, description: 'Освежающий морс из спелых ягод.', category: 'food', effectText: '+30% Гидратация' },
    { id: 'piz_colazero', itemId: 'cola_zero', nameRu: 'Банка Колы', price: 40, description: 'Ледяной газированный напиток.', category: 'food', effectText: '+28% Гидратация' },
  ],
  sushi_asian: [
    { id: 'sush_phila', itemId: 'sushi_set', nameRu: 'Сет роллов Филадельфия', price: 160, description: 'Атлантический лосось, сливочный сыр и рис. Васаби и имбирь.', category: 'food', effectText: '+55% Сытость, +15 HP' },
    { id: 'sush_wok', itemId: 'wok_box', nameRu: 'WOK-лапша Терияки с курицей', price: 130, description: 'Сытная яичная лапша вок с овощами и соусом терияки.', category: 'food', effectText: '+60% Сытость, +30% Энергия' },
    { id: 'sush_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча', price: 40, description: 'Горячий антиоксидантный чай. Снимает усталость.', category: 'food', effectText: '+35% Гидратация, +5 HP' },
  ],
  cinema_bar: [
    { id: 'cin_popcorn', itemId: 'popcorn_caramel', nameRu: 'Карамельный попкорн', price: 70, description: 'Большое хрустящее ведерко сладкого карамельного попкорна.', category: 'food', effectText: '+25% Сытость, +18% Энергия' },
    { id: 'cin_nachos', itemId: 'nachos', nameRu: 'Начос с сырным соусом', price: 80, description: 'Кукурузные чипсы начос с теплым сыром чеддер.', category: 'food', effectText: '+32% Сытость, +15% Энергия' },
    { id: 'cin_colazero', itemId: 'cola_zero', nameRu: 'Большой стакан Колы', price: 45, description: 'Газированный напиток со льдом.', category: 'food', effectText: '+28% Гидратация' },
    { id: 'cin_chocolate', itemId: 'chocolate', nameRu: 'Шоколадный батончик', price: 30, description: 'Сладкий батончик для просмотра кино.', category: 'food', effectText: '+20% Энергия' },
  ],
  electronics: [
    { id: 'elec_pbank', itemId: 'powerbank', nameRu: 'Повербанк 20 000 мАч', price: 220, description: 'Емкий портативный аккумулятор с быстрой зарядкой.', category: 'auto', effectText: 'Зарядка гаджетов' },
    { id: 'elec_watch', itemId: 'smart_watch', nameRu: 'Тактические смарт-часы', price: 380, description: 'Влагозащитные часы с пульсометром и шагомером.', category: 'auto', effectText: 'Мониторинг здоровья' },
    { id: 'elec_radio', itemId: 'walkie_talkie', nameRu: 'Рация дальнего действия', price: 290, description: 'Портативная рация с радиусом связи до 5 км.', category: 'auto', effectText: 'Связь в эфире' },
    { id: 'elec_phones', itemId: 'headphones', nameRu: 'Беспроводные наушники ANC', price: 260, description: 'Шумоподавляющие наушники с чистым звуком.', category: 'auto', effectText: 'Шумоизоляция' },
    { id: 'elec_flash', itemId: 'flashlight', nameRu: 'LED-фонарь со стробоскопом', price: 160, description: 'Сверхъяркий фонарь с дальнобойным лучом.', category: 'auto', effectText: 'Освещение в темноте' },
  ],
  clothing: [
    { id: 'clo_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Arctix"', price: 350, description: 'Плотная ветрозащитная куртка с утеплителем для холодов.', category: 'auto', effectText: 'Защита от холода (-15°C)' },
    { id: 'clo_sneakers', itemId: 'sneakers', nameRu: 'Кроссовки "Urban Sprint"', price: 280, description: 'Легкие амортизирующие кроссовки для быстрого бега.', category: 'auto', effectText: '+20% Скорость бега' },
    { id: 'clo_glasses', itemId: 'sunglasses', nameRu: 'Поляризационные очки', price: 110, description: 'Защита от слепящего солнца и бликов фар.', category: 'auto', effectText: 'Защита зрения' },
    { id: 'clo_pack', itemId: 'backpack_travel', nameRu: 'Городской рюкзак (35L)', price: 240, description: 'Вместительный прочный рюкзак с водоотталкивающей тканью.', category: 'auto', effectText: '+Слоты инвентаря' },
  ],
  bookstore: [
    { id: 'bk_guide', itemId: 'city_guide', nameRu: 'Путеводитель по городу', price: 60, description: 'Подробная карта и описание всех районов мегаполиса.', category: 'auto', effectText: 'Знание города' },
    { id: 'bk_note', itemId: 'notebook', nameRu: 'Блокнот для заметок', price: 35, description: 'Компактный блокнот в плотной кожаной обложке.', category: 'auto', effectText: 'Записи' },
    { id: 'bk_pen', itemId: 'pen_stationery', nameRu: 'Шариковая ручка', price: 15, description: 'Надежная ручка с синей пастой.', category: 'auto', effectText: 'Канцтовары' },
    { id: 'bk_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Прочный скотч для ремонта документов и вещей.', category: 'auto', effectText: 'Починка вещей' },
  ],
  sports_shop: [
    { id: 'spt_sneakers', itemId: 'sneakers', nameRu: 'Беговые кроссовки', price: 280, description: 'Кроссовки с пружинящей подошвой.', category: 'auto', effectText: '+20% Скорость' },
    { id: 'spt_flask', itemId: 'camp_flask', nameRu: 'Стальная фляга (0.75L)', price: 90, description: 'Фляга со свежей родниковой водой.', category: 'food', effectText: '+50% Гидратация' },
    { id: 'spt_bag', itemId: 'backpack_travel', nameRu: 'Спортивный рюкзак', price: 240, description: 'Анатомический рюкзак для тренировок.', category: 'auto', effectText: '+Слоты инвентаря' },
    { id: 'spt_energy', itemId: 'energy_drink', nameRu: 'Изотоник Flash', price: 65, description: 'Восполняет электролиты и силы.', category: 'food', effectText: '+35% Энергия' },
    { id: 'spt_splint', itemId: 'splint', nameRu: 'Эластичный бандаж / Шина', price: 120, description: 'Фиксирует связки и суставы при растяжениях.', category: 'medical', effectText: 'Лечение растяжений' },
  ],
  pharmacy: [
    { id: 'pha_panthenol', itemId: 'panthenol_spray', nameRu: 'Спрей Пантенол от ожогов', price: 180, description: 'Специализированный аэрозоль от термических и солнечных ожогов.', category: 'medical', effectText: 'Заживление ожогов 1-3 ст.' },
    { id: 'pha_spasatel', itemId: 'spasatel_ointment', nameRu: 'Бальзам «Спасатель»', price: 120, description: 'Регенерирующий масляный бальзам от ран, ссадин и ожогов.', category: 'medical', effectText: 'Регенерация тканей' },
    { id: 'pha_zelenka', itemId: 'zelenka', nameRu: 'Раствор Бриллиантового зеленого', price: 35, description: 'Аптечный антисептик для обработки краев ран.', category: 'medical', effectText: 'Стерилизация и сушка' },
    { id: 'pha_iodine', itemId: 'iodine', nameRu: 'Спиртовой раствор Йода 5%', price: 40, description: 'Дезинфицирует царапины, а йодная сетка снимает отеки при ушибах.', category: 'medical', effectText: 'Йодная сетка / Ушибы' },
    { id: 'pha_diclofenac', itemId: 'diclofenac_gel', nameRu: 'Гель Диклофенак 5%', price: 130, description: 'Снимает воспаление и отек при растяжении связок и ушибах.', category: 'medical', effectText: 'Лечение растяжений' },
    { id: 'pha_peroxide', itemId: 'hydrogen_peroxide', nameRu: 'Перекись водорода 3%', price: 45, description: 'Пенообразующий антисептик, останавливает кровотечения.', category: 'medical', effectText: 'Остановка крови и промывка' },
    { id: 'pha_ammonia', itemId: 'ammonia_spirit', nameRu: 'Нашатырный спирт (Аммиак 10%)', price: 50, description: 'Резкие пары выходят из обморока и снимают шок.', category: 'medical', effectText: 'Снятие шока и обморока' },
    { id: 'pha_balm_star', itemId: 'balm_star', nameRu: 'Бальзам «Золотая Звезда»', price: 65, description: 'Ментоловый бальзам от головной боли, паники и тошноты.', category: 'medical', effectText: 'Головная боль и паника' },
    { id: 'pha_charcoal', itemId: 'activated_charcoal', nameRu: 'Активированный уголь', price: 30, description: 'Природный сорбент от тошноты и отравлений.', category: 'medical', effectText: 'Снятие тошноты' },
    { id: 'pha_valerian', itemId: 'valerian_drops', nameRu: 'Капли настойки валерианы', price: 55, description: 'Седативное средство для нормализации пульса и страха.', category: 'medical', effectText: 'Снятие паники и пульса' },
    { id: 'pha_bandage', itemId: 'bandage', nameRu: 'Стерильный бинт', price: 100, description: 'Быстро останавливает кровотечения.', category: 'medical', effectText: 'Лечение кровотечений' },
    { id: 'pha_painkillers', itemId: 'painkillers', nameRu: 'Сильное обезболивающее', price: 140, description: 'Снимает болевой шок при травмах.', category: 'medical', effectText: '-40 Уровень боли' },
    { id: 'pha_medkit', itemId: 'medkit', nameRu: 'Большая медицинская аптечка', price: 350, description: 'Комплексное средство для лечения ушибов и переломов.', category: 'medical', effectText: '+60 HP, Лечение ран' },
    { id: 'pha_antiseptic', itemId: 'antiseptic', nameRu: 'Антисептик для ран', price: 75, description: 'Обеззараживает глубокие царапины и порезы.', category: 'medical', effectText: 'Дезинфекция' },
    { id: 'pha_vitamins', itemId: 'vitamins', nameRu: 'Витаминный комплекс', price: 85, description: 'Укрепляет иммунитет и тонус.', category: 'medical', effectText: '+15 HP, Восстановление' },
    { id: 'pha_fever', itemId: 'antipyretic', nameRu: 'Жаропонижающее "Парацетамол"', price: 60, description: 'Снижает жар и температуру при простуде.', category: 'medical', effectText: '+15 HP, Снятие жара' },
    { id: 'pha_patch', itemId: 'medical_patch', nameRu: 'Бактерицидные пластыри', price: 40, description: 'Набор пластырей от мозолей и порезов.', category: 'medical', effectText: '+10 HP' },
    { id: 'pha_drops', itemId: 'eye_drops', nameRu: 'Глазные капли', price: 50, description: 'Снимает сухость глаз и восстанавливает четкость.', category: 'medical', effectText: '+10% Энергия' },
  ],
  auto_shop: [
    { id: 'aut_repair_kit', itemId: 'repair_kit', nameRu: 'Набор автоинструментов', price: 220, description: 'Инструменты для самостоятельного ремонта кузова и мотора.', category: 'auto', effectText: 'Ремонт кузова/двигателя' },
    { id: 'aut_oil', itemId: 'motor_oil', nameRu: 'Канистра моторного масла', price: 110, description: 'Синтетическое масло 5W-40 для двигателя.', category: 'auto', effectText: 'Защита двигателя' },
    { id: 'aut_antifreeze', itemId: 'antifreeze', nameRu: 'Канистра антифриза G12+ (5L)', price: 140, description: 'Охлаждающая жидкость радиатора против перегрева.', category: 'auto', effectText: 'Охлаждение двигателя' },
    { id: 'aut_rope', itemId: 'tow_rope', nameRu: 'Буксировочный трос 5т', price: 95, description: 'Прочный трос со стальными карабинами.', category: 'auto', effectText: 'Буксировка' },
    { id: 'aut_battery', itemId: 'car_battery', nameRu: 'Запасной аккумулятор', price: 180, description: 'Надежный запуск авто в любую погоду.', category: 'auto', effectText: 'Питание электроники' },
    { id: 'aut_extinguisher', itemId: 'extinguisher', nameRu: 'Автоогнетушитель', price: 130, description: 'Огнетушитель порошковый для тушения пожара.', category: 'auto', effectText: 'Безопасность' },
    { id: 'aut_tape', itemId: 'duct_tape', nameRu: 'Армированный скотч', price: 40, description: 'Быстрый ремонт патрубков и кузова.', category: 'auto', effectText: 'Починка' },
  ],
  cafe: [
    { id: 'caf_cappuccino', itemId: 'cappuccino', nameRu: 'Сливочный Cappuccino', price: 65, description: 'Кофейный напиток с пышной сливочной пенкой.', category: 'food', effectText: '+20% Гидратация, +20% Бодрость' },
    { id: 'caf_espresso', itemId: 'hot_coffee', nameRu: 'Горячий Espresso', price: 50, description: 'Крепкий бодрящий согревающий кофе.', category: 'food', effectText: '+5°C Тепло, +25% Бодрость' },
    { id: 'caf_croissant', itemId: 'croissant', nameRu: 'Свежий масляный круассан', price: 45, description: 'Выпечка из французского слоеного теста.', category: 'food', effectText: '+25% Сытость' },
    { id: 'caf_donut', itemId: 'donut', nameRu: 'Пончик с клубничной глазурью', price: 40, description: 'Пышный сладкий пончик с посыпкой.', category: 'food', effectText: '+25% Сытость, +20% Энергия' },
    { id: 'caf_soup', itemId: 'soup', nameRu: 'Горячий куриный бульон', price: 110, description: 'Согревающий домашний суп с зеленью.', category: 'food', effectText: '+45% Сытость, +8°C Тепло' },
    { id: 'caf_tea', itemId: 'tea_green', nameRu: 'Зеленый чай Сенча', price: 40, description: 'Ароматный травяной чай.', category: 'food', effectText: '+35% Гидратация' },
  ],
  gear_shop: [
    { id: 'gea_ration', itemId: 'military_ration', nameRu: 'Армейский сухпай (ИРП)', price: 220, description: 'Полноценный военный паек: рагу, галеты, чай и джем.', category: 'food', effectText: '+85% Сытость, +50% Энергия' },
    { id: 'gea_flask', itemId: 'camp_flask', nameRu: 'Стальная фляга (0.75L)', price: 90, description: 'Надежная металлическая фляга с чистой водой.', category: 'food', effectText: '+50% Гидратация' },
    { id: 'gea_flashlight', itemId: 'flashlight', nameRu: 'Яркий LED-фонарь', price: 160, description: 'Мощный тактический фонарь для ночных вылазок.', category: 'auto', effectText: 'Освещение в темноте' },
    { id: 'gea_knife', itemId: 'pocket_knife', nameRu: 'Туристический нож', price: 200, description: 'Складной нож из нержавеющей стали.', category: 'auto', effectText: 'Инструмент' },
    { id: 'gea_coat', itemId: 'thermal_coat', nameRu: 'Термокуртка "Arctix"', price: 350, description: 'Сохраняет тепло при сильном морозе и ветре.', category: 'auto', effectText: 'Защита от холода' },
    { id: 'gea_sleep', itemId: 'sleeping_bag', nameRu: 'Спальный мешок (-15°C)', price: 260, description: 'Теплый походный спальник с защитой от сырости.', category: 'auto', effectText: 'Ночлег на природе' },
    { id: 'gea_zippo', itemId: 'zippo_lighter', nameRu: 'Зажигалка Zippo', price: 80, description: 'Ветрозащитная кремниевая зажигалка.', category: 'auto', effectText: 'Розжиг огня' },
    { id: 'gea_compass', itemId: 'compass', nameRu: 'Тактический компас', price: 75, description: 'Жидкостный компас для ориентирования.', category: 'auto', effectText: 'Навигация' },
    { id: 'gea_pack', itemId: 'backpack_travel', nameRu: 'Тактический рюкзак (35L)', price: 240, description: 'Прочный рюкзак с креплениями MOLLE.', category: 'auto', effectText: '+Слоты инвентаря' },
  ]
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
  onBuyItem: (item: ShopItem) => void;
  onRepairVehicle?: () => void;
  canRepairVehicle?: boolean;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  player,
  shopTitle = 'СУПЕРМАРКЕТ 24/7',
  shopType = 'supermarket',
  onBuyItem,
  onRepairVehicle,
  canRepairVehicle = false
}) => {
  if (!isOpen || !player) return null;

  const playerCash = getPlayerCash(player);
  const currentCatalog = SHOP_CATALOGS[shopType] || SHOP_CATALOGS.supermarket;

  return (
    <div 
      id="shop-modal-overlay"
      className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="shop-modal-container"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                <span>{shopTitle}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ЗАВЕДЕНИЕ
                </span>
              </h2>
              <p className="text-slate-400 text-xs">Ассортимент товаров и услуг данного заведения</p>
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Vehicle Repair Option (If in auto shop or near car) */}
          {(canRepairVehicle || shopType === 'auto_shop') && onRepairVehicle && (
            <div className="p-4 bg-slate-800 border border-slate-600 rounded-xl flex items-center justify-between gap-4">
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
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
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

          {/* Item Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentCatalog.map((item) => {
              const canAfford = playerCash >= item.price;

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-800/60 border border-slate-700/70 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 p-1">
                      <ItemIconCanvas itemId={item.itemId} size={36} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 truncate">{item.nameRu}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-900/80 border border-slate-700/80 rounded text-[9px] font-semibold text-sky-300">
                        {item.effectText}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (canAfford) {
                        onBuyItem(item);
                        sound.playUseItem();
                      }
                    }}
                    disabled={!canAfford}
                    className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center min-w-[75px] ${
                      canAfford
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/40 shadow-md'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <span>Купить</span>
                    <span className="font-mono text-[11px] text-amber-300">${item.price}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Купленные предметы отправляются в ваш инвентарь [I]</span>
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

import fs from 'fs';
import path from 'path';

const mapPath = path.join(process.cwd(), 'public/map.json');
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// 1. Defined City Shops
const cityShops = [
  {
    id: 'shop_perekrestok_main',
    nameRu: 'Супермаркет "Спутник 24/7"',
    category: 'shops',
    x: 3442,
    y: 2685,
    iconKey: 'mall',
    badgeColor: '#16a34a',
    description: 'Флагманский продуктовый супермаркет: свежие продукты, бакалея, напитки и готовая кулинария.'
  },
  {
    id: 'shop_furniture_mall',
    nameRu: 'Гипермаркет мебели "Комфорт & Уютный Дом"',
    category: 'shops',
    x: 3650,
    y: 2955,
    iconKey: 'mall',
    badgeColor: '#b45309',
    description: 'Диваны, кровати, столы, стулья, бытовые холодильники, ЖК-телевизоры, стеллажи и декор для квартир.'
  },
  {
    id: 'shop_fastfood_mall',
    nameRu: 'Ресторан "Экспресс-Бургер"',
    category: 'shops',
    x: 3728,
    y: 2955,
    iconKey: 'food',
    badgeColor: '#dc2626',
    description: 'Горячие бургеры, картофель фри, хрустящие наггетсы и прохладительные напитки.'
  },
  {
    id: 'shop_pizzeria_mall',
    nameRu: 'Пиццерия "Пицца-Империя"',
    category: 'shops',
    x: 3728,
    y: 2685,
    iconKey: 'food',
    badgeColor: '#ea580c',
    description: 'Свежая горячая пицца Пепперони, чикен-роллы, морсы и десерты.'
  },
  {
    id: 'shop_sushi_mall',
    nameRu: 'Суши & WOK "Сакура"',
    category: 'shops',
    x: 3800,
    y: 2685,
    iconKey: 'food',
    badgeColor: '#e11d48',
    description: 'Сеты роллов Филадельфия, горячая вок-лапша с курицей и зеленый чай.'
  },
  {
    id: 'shop_cinema_mall',
    nameRu: 'Кинобар "Горизонт"',
    category: 'shops',
    x: 3880,
    y: 2685,
    iconKey: 'food',
    badgeColor: '#9333ea',
    description: 'Карамельный попкорн, начос с сырным соусом чеддер и прохладительные напитки.'
  },
  {
    id: 'shop_electronics_mall',
    nameRu: 'Гипермаркет электроники "Техно-Мир"',
    category: 'shops',
    x: 3442,
    y: 2955,
    iconKey: 'mall',
    badgeColor: '#2563eb',
    description: 'Повербанки высокой емкости, смарт-часы, рации дальнего действия, фонари и гаджеты.'
  },
  {
    id: 'shop_clothing_mall',
    nameRu: 'Магазин одежды "Империя Стиля"',
    category: 'shops',
    x: 3500,
    y: 2685,
    iconKey: 'mall',
    badgeColor: '#4f46e5',
    description: 'Городская одежда, куртки мембранные, беговые кроссовки и защитные аксессуары.'
  },
  {
    id: 'shop_books_mall',
    nameRu: 'Книжная лавка "Слово"',
    category: 'shops',
    x: 3550,
    y: 2685,
    iconKey: 'mall',
    badgeColor: '#0891b2',
    description: 'Путеводители, атласы дорог, блокноты и письменные принадлежности.'
  },
  {
    id: 'shop_sports_mall',
    nameRu: 'Спорттовары "Атлет"',
    category: 'shops',
    x: 3600,
    y: 2685,
    iconKey: 'mall',
    badgeColor: '#0284c7',
    description: 'Спортивная обувь, изотоники, термобелье, бандажи и туризм.'
  },
  {
    id: 'shop_pharmacy_downtown',
    nameRu: 'Аптека "Пульс 24/7"',
    category: 'services',
    x: 3950,
    y: 2150,
    iconKey: 'pharmacy',
    badgeColor: '#059669',
    description: 'Медикаменты, перевязочные средства, антисептики и анальгетики.'
  },
  {
    id: 'shop_autoshop_industrial',
    nameRu: 'Автозапчасти "PIT-STOP"',
    category: 'services',
    x: 2500,
    y: 3500,
    iconKey: 'garage',
    badgeColor: '#d97706',
    description: 'Масла, антифриз, аккумуляторы, огнетушители, инструменты и тросы.'
  },
  {
    id: 'shop_gear_forest',
    nameRu: 'Магазин "Охота & Рыбалка"',
    category: 'shops',
    x: 1200,
    y: 1800,
    iconKey: 'nature',
    badgeColor: '#15803d',
    description: 'Сухпайки, фляги, фонари, термокуртки, спальники и компасы.'
  },
  {
    id: 'shop_gas_station_main',
    nameRu: 'Минимаркет АЗС "ПраймНефть"',
    category: 'gas_stations',
    x: 4300,
    y: 3300,
    iconKey: 'fuel',
    badgeColor: '#0284c7',
    description: 'Экспресс-товары: хот-доги, свежий кофе, автохимия, канистры и энергетики.'
  }
];

// 2. Defined Spawn Points
const spawnPoints = [
  {
    id: 'railway_station_loc',
    nameRu: 'Ж/Д Вокзал «Станция Степная»',
    nameEn: 'Railway Station Stepnaya',
    x: 11120,
    y: 5640,
    description: 'Новый вокзальный комплекс: двухэтажный вокзал РЖД, платформы, поезда, переезд и путевая сеть',
    iconKey: 'train'
  },
  {
    id: 'real_estate_agency_loc',
    nameRu: 'Агентство Недвижимости «ГлавНедвижимость»',
    nameEn: 'Real Estate Agency GlavNedvizhimost',
    x: 5030,
    y: 4610,
    description: 'Официальный риелторский центр и Росреестр: покупка квартир, выдача ключей и ЕГРН',
    iconKey: 'agency'
  },
  {
    id: 'car_dealership_loc',
    nameRu: 'Автосалон "Премиум Авто"',
    nameEn: 'Car Dealership & Showroom',
    x: 252,
    y: 5600,
    description: 'Официальный автосалон: выставка авто, выбор цвета и КПП, покупка с ПТС и ключом',
    iconKey: 'car'
  },
  {
    id: 'central_park',
    nameRu: 'Центральный Парк (Фонтан & Сквер)',
    nameEn: 'Central Park Promenade',
    x: 4400,
    y: 2400,
    description: 'Парковый фонтан, аллеи со скамейками, сквер и прогулочные зоны',
    iconKey: 'nature'
  },
  {
    id: 'downtown_plaza',
    nameRu: 'Деловой Центр (Парковка & Небоскребы)',
    nameEn: 'Downtown Commercial Plaza',
    x: 4000,
    y: 2000,
    description: 'Оживленный перекрёсток проспектов, высотные офисы и парковочный комплекс',
    iconKey: 'agency'
  },
  {
    id: 'residential_courtyard',
    nameRu: 'Жилой Двор (Многоэтажки & Дворовая парковка)',
    nameEn: 'Residential Courtyard',
    x: 2750,
    y: 2400,
    description: 'Уютный закрытый двор, подъезды, скамейки, урны, баки и припаркованные авто',
    iconKey: 'spawn'
  },
  {
    id: 'industrial_district',
    nameRu: 'Промзона (Грузовая база & Склады)',
    nameEn: 'Freight Logistics Yard',
    x: 6400,
    y: 1030,
    description: 'Логистический хаб, стоянки спецтехники, грузовые терминалы и ангары',
    iconKey: 'industrial'
  },
  {
    id: 'pine_forest',
    nameRu: 'Лесной Заповедник & Магазин «Охота»',
    nameEn: 'Pine Ridge Outpost',
    x: 1200,
    y: 1600,
    description: 'Извилистые лесные тропы, сосновый бор, пруды и магазин снаряжения',
    iconKey: 'nature'
  },
  {
    id: 'highway_junction',
    nameRu: 'Скоростное Шоссе (4-полосная магистраль)',
    nameEn: 'Silicon Highway Express',
    x: 4000,
    y: 4000,
    description: 'Широкая магистраль с непрерывным плотным потоком AI-трафика и светофорами',
    iconKey: 'car'
  },
  {
    id: 'auto_service_pitstop',
    nameRu: 'Автотехцентр "PIT-STOP" & Тюнинг',
    nameEn: 'PIT-STOP Auto Repair Service',
    x: 2400,
    y: 3500,
    description: 'СТО, ремонт двигателя, замена жидкостей, шин и покупка автозапчастей',
    iconKey: 'garage'
  },
  {
    id: 'hospital_city_1',
    nameRu: 'Городская Больница №1 / ОРИТ',
    nameEn: 'City Emergency Hospital #1',
    x: 4000,
    y: 2200,
    description: 'Круглосуточный медицинский комплекс, травматология и скорая помощь',
    iconKey: 'hospital'
  },
  {
    id: 'gas_station_main_loc',
    nameRu: 'АЗС «Гранд-Ойл» (Минимаркет 24/7)',
    nameEn: 'Grand-Oil Gas Station 24/7',
    x: 4300,
    y: 3200,
    description: 'Заправка всех видов топлива (АИ-92, 95, 98, ДТ, СУГ) и хот-доги',
    iconKey: 'fuel'
  },
  {
    id: 'police_station_loc',
    nameRu: 'УВД / Полицейский Участок',
    nameEn: 'Central Police Precinct',
    x: 4000,
    y: 1900,
    description: 'Городское управление внутренних дел и патрульная автостоянка',
    iconKey: 'police'
  },
  {
    id: 'fire_station_loc',
    nameRu: 'Пожарная Часть №12',
    nameEn: 'Fire Station #12',
    x: 6400,
    y: 1200,
    description: 'Депо спасателей, тяжелые пожарные грузовики и спасательное оборудование',
    iconKey: 'fire'
  },
  {
    id: 'gallery_mall_loc',
    nameRu: 'ТРЦ «Пассаж» (Азимут & Электро-Маркет)',
    nameEn: 'Passage Shopping Mall',
    x: 3500,
    y: 2400,
    description: 'Крупный Торгово-Развлекательный Центр: продукты, электроника, одежда и кафе',
    iconKey: 'mall'
  },
  {
    id: 'garage_coop_loc',
    nameRu: 'Гаражный Кооператив «Восток-1»',
    nameEn: 'Garage Cooperative Vostok-1',
    x: 1200,
    y: 4800,
    description: 'Массив частных кирпичных гаражей, ремонтные ямы и эстакады',
    iconKey: 'garage'
  },
  {
    id: 'cottage_district_loc',
    nameRu: 'Коттеджный Посёлок «Сосновый Бор»',
    nameEn: 'Pine Ridge Cottage Settlement',
    x: 4500,
    y: 6400,
    description: 'Тихий частный сектор, загородные дома, коттеджи и живописные улички',
    iconKey: 'spawn'
  },
  {
    id: 'steppe_highway',
    nameRu: 'Степное Шоссе М-12 (Магистраль 110 км/ч)',
    nameEn: 'Steppe Express Highway M-12',
    x: 9500,
    y: 4000,
    description: 'Скоростная 4-полосная автомагистраль через дикую степь с разделительным барьером',
    iconKey: 'car'
  },
  {
    id: 'steppe_village',
    nameRu: 'Деревня Полыновка (Полузаброшенная)',
    nameEn: 'Village Polynovka',
    x: 11480,
    y: 2500,
    description: 'Атмосферная глухая деревня: деревянные избы, колодец с журавлём, клуб и сады',
    iconKey: 'spawn'
  },
  {
    id: 'highway_hub_1',
    nameRu: 'Развилка 1: Степной Узел (14-й км)',
    nameEn: 'Steppe Interchange Hub 1 (14 km)',
    x: 14400,
    y: 4000,
    description: '4-сторонняя скоростная развязка: поворот на Северный Тракт к тайге и Южный объезд',
    iconKey: 'car'
  },
  {
    id: 'highway_hub_2',
    nameRu: 'Развилка 2: АЗС Оазис & Мотель (24-й км)',
    nameEn: 'Oasis Motel & Fuel Hub (24 km)',
    x: 24000,
    y: 4000,
    description: 'Загородный комплекс: АЗС «Транзит-Оазис», мотель «Степной Бриз», съезд в Каньон',
    iconKey: 'fuel'
  },
  {
    id: 'alpine_pass',
    nameRu: 'Перевал «Орлиный Пик» (Горный серпантин)',
    nameEn: 'Eagle Peak Mountain Pass',
    x: 36000,
    y: 3880,
    description: 'Высокогорная трасса над облаками, крутые виражи перевала, смотровая площадка',
    iconKey: 'mountain'
  },
  {
    id: 'canyon_descent',
    nameRu: 'Урочище «Глинистые Обрывы» (Серпантин)',
    nameEn: 'Clay Bluffs & Terraces Serpentine',
    x: 24000,
    y: 15000,
    description: 'Каскад опасных крутых поворотов, геологические разломы и террасы глинистого каньона',
    iconKey: 'mountain'
  },
  {
    id: 'dunes_express',
    nameRu: 'Озерная Магистраль «Солончаки»',
    nameEn: 'Salt Lake Steppe Express Highway',
    x: 32000,
    y: 9330,
    description: 'Скоростная 20-километровая панорамная прямая вдоль котловины Солёного озера и степных просторов',
    iconKey: 'car'
  },
  {
    id: 'east_gate_terminal',
    nameRu: 'Восточные Ворота (Терминал 48-й км)',
    nameEn: 'Far East Gate Terminal (48 km)',
    x: 48000,
    y: 4000,
    description: 'Дальний рубеж автомагистрали М-12: разворотная петля и пограничный пост',
    iconKey: 'spawn'
  }
];

// 3. Collect Building-based markers from map.json
const buildingMarkers: any[] = [];
const addedPos = new Set<string>();

const posKey = (x: number, y: number) => `${Math.round(x/30)*30}_${Math.round(y/30)*30}`;

// Add cityShops first
for (const shop of cityShops) {
  buildingMarkers.push(shop);
  addedPos.add(posKey(shop.x, shop.y));
}

// Add named buildings from map.json
for (const b of mapData.buildings || []) {
  const name = b.nameRu || b.name;
  // Ignore individual garage box numbers like "Гаражный бокс №С-11"
  if (!name || name.includes('Гаражный бокс №')) continue;

  const cx = Math.round(b.x + b.width / 2);
  const cy = Math.round(b.y + b.height / 2);
  const k = posKey(cx, cy);
  if (addedPos.has(k)) continue;

  let category = 'services';
  let iconKey = 'agency';
  let badgeColor = '#0284c7';

  if (name.includes('Магазин') || name.includes('Супермаркет') || name.includes('Гипермаркет') || name.includes('ТРЦ') || name.includes('Лавка') || name.includes('Пассаж')) {
    category = 'shops';
    iconKey = 'mall';
    badgeColor = '#9333ea';
  } else if (name.includes('Охота') || name.includes('Рыбалка') || name.includes('Сплав') || name.includes('кордон') || name.includes('вышка')) {
    category = 'nature';
    iconKey = 'nature';
    badgeColor = '#15803d';
  } else if (name.includes('Автосервис') || name.includes('Автомойка') || name.includes('Запчасти') || name.includes('PIT-STOP') || name.includes('Детейлинг')) {
    category = 'services';
    iconKey = 'garage';
    badgeColor = '#d97706';
  } else if (name.includes('Больница') || name.includes('Клиника') || name.includes('ОРИТ')) {
    category = 'services';
    iconKey = 'hospital';
    badgeColor = '#e11d48';
  } else if (name.includes('Вокзал') || name.includes('Станция') || name.includes('переезд') || name.includes('пакгауз')) {
    category = 'services';
    iconKey = 'train';
    badgeColor = '#0284c7';
  } else if (name.includes('Агентство') || name.includes('Росреестр')) {
    category = 'services';
    iconKey = 'agency';
    badgeColor = '#eab308';
  } else if (b.type === 'industrial' || name.includes('Элеватор') || name.includes('Склады') || name.includes('цех') || name.includes('Лесопилка') || name.includes('МТС') || name.includes('Райпо') || name.includes('База')) {
    category = 'industrial';
    iconKey = 'industrial';
    badgeColor = '#475569';
  }

  buildingMarkers.push({
    id: `marker_bld_${b.id}`,
    nameRu: name,
    category: category,
    x: cx,
    y: cy,
    iconKey: iconKey,
    badgeColor: badgeColor,
    description: name
  });
  addedPos.add(k);
}

mapData.minimapMarkers = buildingMarkers;
mapData.spawnPoints = spawnPoints;

fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 2), 'utf8');

console.log('Successfully written', buildingMarkers.length, 'minimap markers and', spawnPoints.length, 'spawn points to public/map.json');

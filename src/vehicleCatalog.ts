import { CarType } from './types';
import { CAR_CONFIGS } from './vehicleHelpers';
import { DEALERSHIP_CARS } from './components/CarDealershipModal';

export type VehicleCategory = 
  | 'passenger' 
  | 'sport' 
  | 'suv' 
  | 'commercial' 
  | 'special' 
  | 'emergency' 
  | 'bus'
  | 'moto'
  | 'trailers';

export interface VehicleCatalogEntry {
  id: string;
  type: CarType;
  nameRu: string;
  brand: string;
  category: VehicleCategory;
  classType: string;
  year?: number;
  powerHp: number;
  topSpeedKmh: number;
  weightKg: number;
  engineSpec?: string;
  fuelType: 'ai92' | 'ai95' | 'diesel';
  fuelTypeLabel: string;
  colors: { name: string; hex: string; roofHex?: string }[];
  descriptionRu: string;
}

export const DEFAULT_PALETTE = [
  { name: 'Охра Тракт', hex: '#c68a35' },
  { name: 'Белое облако', hex: '#f8fafc' },
  { name: 'Мокрый асфальт', hex: '#334155' },
  { name: 'Черный обсидиан', hex: '#0f172a' },
  { name: 'Коррида (красный)', hex: '#dc2626' },
  { name: 'Океан (синий)', hex: '#1d4ed8' },
  { name: 'Изумруд', hex: '#15803d' },
  { name: 'Песочный', hex: '#ca8a04' }
];

// Helper to deduce category
export function deduceCategory(type: string, classType?: string): VehicleCategory {
  const t = type.toLowerCase();
  const c = (classType || '').toLowerCase();
  if (t.startsWith('trailer') || t.includes('trailer') || t.includes('lowboy') || t.includes('barrel') || t.includes('vacuum') || c.includes('прицеп') || c.includes('трал') || c.includes('полуприцеп')) return 'trailers';
  if (t.startsWith('moto') || t.startsWith('moped') || c.includes('мотоцикл') || c.includes('мопед') || c.includes('байк')) return 'moto';
  if (t.includes('police') || t.includes('fire') || t.includes('ambulance') || c.includes('дпс') || c.includes('мчс') || c.includes('скорая')) return 'emergency';
  if (t.includes('bus') || t.includes('paz') || t.includes('ikarus') || c.includes('автобус')) return 'bus';
  if (t.includes('tractor') || t.includes('roller') || t.includes('paver') || t.includes('cement') || t.includes('garbage') || c.includes('каток') || c.includes('трактор') || c.includes('укладчик')) return 'special';
  if (t.includes('truck') || t.includes('van') || t.includes('kamaz') || t.includes('zil') || t.includes('semi') || c.includes('груз') || c.includes('фургон') || c.includes('тягач') || c.includes('самосвал')) return 'commercial';
  if (t.includes('suv') || t.includes('offroad') || t.includes('niva') || t.includes('uaz') || t.includes('pickup') || t.includes('crossover') || c.includes('внедорож') || c.includes('джип') || c.includes('4x4') || c.includes('кроссовер') || c.includes('пикап')) return 'suv';
  if (t.includes('sport') || t.includes('supercar') || t.includes('coupe') || t.includes('muscle') || t.includes('hatch_hot') || c.includes('спорт') || c.includes('суперкар') || c.includes('купе') || c.includes('маслкар')) return 'sport';
  return 'passenger';
}

// Build unified catalog
const catalogMap = new Map<string, VehicleCatalogEntry>();

// 1. Add all dealership cars
for (const car of DEALERSHIP_CARS) {
  catalogMap.set(car.type, {
    id: car.id,
    type: car.type,
    nameRu: car.nameRu,
    brand: car.brand,
    category: deduceCategory(car.type, car.classType),
    classType: car.classType,
    year: car.year,
    powerHp: car.powerHp,
    topSpeedKmh: car.topSpeedKmh,
    weightKg: car.weightKg,
    engineSpec: car.engineSpec,
    fuelType: car.fuelType,
    fuelTypeLabel: car.fuelTypeLabel,
    colors: car.availableColors && car.availableColors.length > 0 ? car.availableColors : DEFAULT_PALETTE,
    descriptionRu: car.descriptionRu
  });
}

// 2. Comprehensive catalog for all specialized, service, commercial, classic, motorcycle and trailer types
const EXTRA_VEHICLES: Partial<VehicleCatalogEntry>[] = [
  // --- EMERGENCY & PUBLIC SERVICES ---
  {
    type: 'police',
    nameRu: 'Патрульный ДПС (Lada Priora)',
    brand: 'МВД / ДПС',
    category: 'emergency',
    classType: 'Оперативный седан ДПС',
    year: 2014,
    powerHp: 98,
    topSpeedKmh: 185,
    weightKg: 1100,
    engineSpec: '1.6L 16V Спецподготовка',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [{ name: 'ДПС Патруль', hex: '#f8fafc', roofHex: '#2563eb' }],
    descriptionRu: 'Оперативный автомобиль дорожно-патрульной службы со спецсигналами, СГУ и маяками.'
  },
  {
    type: 'ambulance',
    nameRu: 'Скорая помощь (ГАЗель Бизнес)',
    brand: 'СМП',
    category: 'emergency',
    classType: 'Реанимация / АСМП',
    year: 2018,
    powerHp: 107,
    topSpeedKmh: 130,
    weightKg: 2800,
    engineSpec: '2.8L Cummins Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'АСМП Лимонный', hex: '#fef08a', roofHex: '#f8fafc' }, { name: 'АСМП Белый', hex: '#f8fafc' }],
    descriptionRu: 'Карета скорой медицинской помощи со светозвуковыми спецсигналами и медицинским отсеком.'
  },
  {
    type: 'fire_engine',
    nameRu: 'Пожарная АЦ-40 (ЗИЛ-131)',
    brand: 'МЧС России',
    category: 'emergency',
    classType: 'Пожарная автоцистерна',
    year: 2005,
    powerHp: 150,
    topSpeedKmh: 90,
    weightKg: 9500,
    engineSpec: '6.0L V8 Карбюратор',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [{ name: 'МЧС Сигнальный красный', hex: '#dc2626', roofHex: '#ffffff' }],
    descriptionRu: 'Тяжелая пожарная автоцистерна повышенной проходимости с насосной установкой и сиреной.'
  },
  {
    type: 'fire_ladder',
    nameRu: 'Пожарная автолестница АЛ-30 (КАМАЗ)',
    brand: 'МЧС России',
    category: 'emergency',
    classType: 'Пожарно-спасательная лестница',
    year: 2016,
    powerHp: 260,
    topSpeedKmh: 120,
    weightKg: 13500,
    engineSpec: '11.76L V8 Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'МЧС Сигнальный красный', hex: '#dc2626', roofHex: '#ffffff' }],
    descriptionRu: 'Телескопическая 30-метровая выдвижная пожарная автолестница на усиленном шасси КАМАЗ.'
  },

  // --- PASSENGER & TAXI ---
  {
    type: 'sedan',
    nameRu: 'Городской Седан',
    brand: 'Автоград',
    category: 'passenger',
    classType: 'Семейный седан',
    year: 2020,
    powerHp: 123,
    topSpeedKmh: 180,
    weightKg: 1400,
    engineSpec: '1.6L MPI DOHC 16V',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Удобный современный городской седан для комфортных ежедневных поездок.'
  },
  {
    type: 'hatchback',
    nameRu: 'Городской Хэтчбек',
    brand: 'Автоград',
    category: 'passenger',
    classType: 'Компактный хэтчбек',
    year: 2019,
    powerHp: 106,
    topSpeedKmh: 175,
    weightKg: 1150,
    engineSpec: '1.6L 16V',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Маневренный и экономичный хэтчбек с отличной обзорностью.'
  },
  {
    type: 'taxi',
    nameRu: 'Городское Такси (Lada Vesta)',
    brand: 'Сити-Такси',
    category: 'passenger',
    classType: 'Автомобиль такси',
    year: 2021,
    powerHp: 106,
    topSpeedKmh: 175,
    weightKg: 1450,
    engineSpec: '1.6L 16V Бензин + ГБО',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [{ name: 'Желтое такси с шашечками', hex: '#facc15' }],
    descriptionRu: 'Городское такси с навигационным терминалом и установленным экономичным ГБО.'
  },
  {
    type: 'bus',
    nameRu: 'Городской автобус ЛиАЗ-5256',
    brand: 'ЛиАЗ',
    category: 'bus',
    classType: 'Рейсовый автобус',
    year: 2013,
    powerHp: 245,
    topSpeedKmh: 110,
    weightKg: 9500,
    engineSpec: '6.7L Cummins Diesel Turbo',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [
      { name: 'Мосгортранс Синий', hex: '#2563eb', roofHex: '#f8fafc' },
      { name: 'Оранжевый пригород', hex: '#ea580c', roofHex: '#f8fafc' }
    ],
    descriptionRu: 'Вместительный большой городской автобус с пневмоподвеской и тремя широкими дверями.'
  },

  // --- SPORT & MUSCLE ---
  {
    type: 'sports',
    nameRu: 'Спорткар GT-Coupe',
    brand: 'Apex Motors',
    category: 'sport',
    classType: 'Спортивное купе',
    year: 2021,
    powerHp: 380,
    topSpeedKmh: 280,
    weightKg: 1320,
    engineSpec: '3.0L Twin-Turbo Inline-6',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [
      { name: 'Алый металлик', hex: '#dc2626' },
      { name: 'Солнечный желтый', hex: '#eab308' },
      { name: 'Ультрамарин', hex: '#2563eb' },
      { name: 'Ночной графит', hex: '#0f172a' }
    ],
    descriptionRu: 'Заднеприводный спорткар с идеальной развесовкой 50:50 и острым трековым управлением.'
  },
  {
    type: 'supercar',
    nameRu: 'Гиперкар Apex Venom GT',
    brand: 'Apex Motors',
    category: 'sport',
    classType: 'Трековый среднемоторный гиперкар',
    year: 2023,
    powerHp: 720,
    topSpeedKmh: 320,
    weightKg: 1250,
    engineSpec: '4.0L V8 Twin-Turbo Mid-Engine',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [
      { name: 'Лайм Неон', hex: '#84cc16' },
      { name: 'Карбоновый черный', hex: '#09090b' },
      { name: 'Кровавый апельсин', hex: '#ea580c' }
    ],
    descriptionRu: 'Бескомпромиссный среднемоторный карбоновый монстр с прижимным диффузором.'
  },
  {
    type: 'muscle',
    nameRu: 'Маслкар V8 1969',
    brand: 'Detroit Legend',
    category: 'sport',
    classType: 'Классический маслкар',
    year: 1969,
    powerHp: 425,
    topSpeedKmh: 230,
    weightKg: 1650,
    engineSpec: '7.0L Big Block V8',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [
      { name: 'Вулканический оранжевый', hex: '#ea580c' },
      { name: 'Черный с полосами', hex: '#09090b' },
      { name: 'Кобальт синий', hex: '#1d4ed8' },
      { name: 'Темный бордо', hex: '#881337' }
    ],
    descriptionRu: 'Американская легенда с рокочущим семилитровым атмосферным V8 и взрывным ускорением по прямой.'
  },
  {
    type: 'muscle_classic',
    nameRu: 'Маслкар Detroit Rebel 1971',
    brand: 'Detroit Motor Co.',
    category: 'sport',
    classType: 'Классический маслкар V8',
    year: 1971,
    powerHp: 375,
    topSpeedKmh: 230,
    weightKg: 1650,
    engineSpec: '6.6L Big-Block V8 4-BBL',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [
      { name: 'Пурпурный металлик', hex: '#7c3aed' },
      { name: 'Черный атлас', hex: '#0f172a' },
      { name: 'Гоночный желтый', hex: '#eab308' }
    ],
    descriptionRu: 'Звучный маслкар золотой эры с двухкамерным карбюратором и широкой задней колеей.'
  },
  {
    type: 'coupe_gt',
    nameRu: 'Гран Туризмо Купе Apex GT',
    brand: 'Apex Motors',
    category: 'sport',
    classType: 'Премиальное купе Gran Turismo',
    year: 2022,
    powerHp: 450,
    topSpeedKmh: 270,
    weightKg: 1650,
    engineSpec: '3.8L Twin-Turbo V6',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [
      { name: 'Серебристый титан', hex: '#94a3b8' },
      { name: 'Глубокий синий', hex: '#1e3a8a' },
      { name: 'Черный глянец', hex: '#09090b' }
    ],
    descriptionRu: 'Роскошное скоростное купе для дальних скоростных марш-бросков по шоссе.'
  },

  // --- SUV & 4X4 ---
  {
    type: 'suv',
    nameRu: 'Городской Кроссовер SUV',
    brand: 'Nordic Auto',
    category: 'suv',
    classType: 'Кроссовер 4x4',
    year: 2021,
    powerHp: 150,
    topSpeedKmh: 170,
    weightKg: 1450,
    engineSpec: '2.0L Turbo 16V',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Универсальный семейный кроссовер с увеличенным дорожным просветом.'
  },
  {
    type: 'pickup',
    nameRu: 'Пикап 4x4',
    brand: 'Trakt Motors',
    category: 'suv',
    classType: 'Полноприводный пикап',
    year: 2018,
    powerHp: 180,
    topSpeedKmh: 150,
    weightKg: 2200,
    engineSpec: '2.5L Turbo Diesel 4WD',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Выносливый рамный пикап с вместительным открытым кузовом и понижающей передачей.'
  },
  {
    type: 'pickup_heavy',
    nameRu: 'Тяжелый пикап Bison Heavy Duty',
    brand: 'Bison Trucks',
    category: 'suv',
    classType: 'Тяжелый рамный пикап 4x4',
    year: 2022,
    powerHp: 385,
    topSpeedKmh: 160,
    weightKg: 3100,
    engineSpec: '6.7L V8 Turbo Diesel PowerStroke',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [
      { name: 'Пустынный койот', hex: '#b45309' },
      { name: 'Черный гранит', hex: '#0f172a' },
      { name: 'Белый арктик', hex: '#f8fafc' }
    ],
    descriptionRu: 'Тяжелый американский пикап с двухскатной задней ошиновкой и фаркопом под полуприцепы.'
  },

  // --- COMMERCIAL, TRUCKS & VANS ---
  {
    type: 'van',
    nameRu: 'Бизнес-фургон (ГАЗель Next)',
    brand: 'ГАЗ',
    category: 'commercial',
    classType: 'Цельнометаллический фургон',
    year: 2020,
    powerHp: 149,
    topSpeedKmh: 160,
    weightKg: 2100,
    engineSpec: '2.8L Cummins ISF Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Надежный цельнометаллический грузовой фургон для коммерческих перевозок.'
  },
  {
    type: 'truck_tow',
    nameRu: 'Автоэвакуатор с платформой',
    brand: 'ГАЗ Валдай',
    category: 'commercial',
    classType: 'Специальный автоэвакуатор',
    year: 2017,
    powerHp: 152,
    topSpeedKmh: 140,
    weightKg: 4200,
    engineSpec: '3.8L Cummins Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'Желтый спецсигнал', hex: '#eab308' }],
    descriptionRu: 'Спецэвакуатор с аппарелями и гидравлической лебедкой для транспортировки техники.'
  },
  {
    type: 'truck_armored',
    nameRu: 'Бронеавтомобиль инкассации «Есаул»',
    brand: 'СпецБроня',
    category: 'commercial',
    classType: 'Бронированный инкассатор',
    year: 2019,
    powerHp: 180,
    topSpeedKmh: 140,
    weightKg: 5500,
    engineSpec: '4.5L V8 Дизель',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'Инкассаторский песочный', hex: '#ca8a04', roofHex: '#15803d' }],
    descriptionRu: 'Тяжелый бронированный фургон с пуленепробиваемыми бойницами и сейфовым отсеком.'
  },
  {
    type: 'delivery_truck',
    nameRu: 'Экспедиторский степвэн «Маршрут»',
    brand: 'ГАЗ',
    category: 'commercial',
    classType: 'Фургон экспресс-доставки',
    year: 2020,
    powerHp: 125,
    topSpeedKmh: 145,
    weightKg: 3200,
    engineSpec: '2.7L УМЗ-EvoTech',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [{ name: 'Желтый экспресс', hex: '#facc15' }, { name: 'Белый курьер', hex: '#f8fafc' }],
    descriptionRu: 'Специальный курьерский фургон с раздвижной дверью для быстрой развозки посылок.'
  },
  {
    type: 'truck_box',
    nameRu: 'Промтоварный фургон-будка ГАЗон Next',
    brand: 'ГАЗ',
    category: 'commercial',
    classType: 'Среднетоннажный грузовик 5т',
    year: 2019,
    powerHp: 170,
    topSpeedKmh: 125,
    weightKg: 6200,
    engineSpec: '4.43L ЯМЗ-534 Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'Белая кабина + Синий тент', hex: '#0284c7', roofHex: '#f8fafc' }],
    descriptionRu: 'Классический среднетоннажный грузовик с жестким изотермическим кузовом-будкой.'
  },
  {
    type: 'truck_semi',
    nameRu: 'Седельный тягач КамАЗ-54115',
    brand: 'КамАЗ',
    category: 'commercial',
    classType: 'Магистральный тягач 6x4',
    year: 2004,
    powerHp: 240,
    topSpeedKmh: 110,
    weightKg: 7500,
    engineSpec: '10.85L V8 Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [
      { name: 'Оранжевый КамАЗ', hex: '#ea580c' },
      { name: 'Синий кабин', hex: '#1e40af' },
      { name: 'Белый лебедь', hex: '#f8fafc' }
    ],
    descriptionRu: 'Трёхосный седельный тягач со спальником для сцепки с полуприцепами и дальних рейсов.'
  },
  {
    type: 'truck_tanker',
    nameRu: 'Топливозаправщик-Бензовоз КАМАЗ',
    brand: 'КАМАЗ',
    category: 'commercial',
    classType: 'Автоцистерна ГСМ Огнеопасно',
    year: 2015,
    powerHp: 240,
    topSpeedKmh: 110,
    weightKg: 9200,
    engineSpec: '10.85L V8 Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'Оранжевый ОГНЕОПАСНО', hex: '#ea580c' }],
    descriptionRu: 'Топливозаправщик с насосом и счетчиком литров для снабжения АЗС и техники.'
  },
  {
    type: 'truck_water',
    nameRu: 'Поливомоечная машина (Водовоз ЗИЛ-130)',
    brand: 'ЗИЛ / Москомхоз',
    category: 'commercial',
    classType: 'Коммунальная поливомоечная цистерна',
    year: 1991,
    powerHp: 150,
    topSpeedKmh: 118,
    weightKg: 8000,
    engineSpec: '6.0L ЗИЛ-130 V8',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [{ name: 'Коммунальный оранжевый', hex: '#ea580c', roofHex: '#0284c7' }],
    descriptionRu: 'Водовоз со сменным навесным оборудованием для полива газонов и очистки дорог.'
  },
  {
    type: 'cement_mixer',
    nameRu: 'Автобетоносмеситель (КАМАЗ-Миксер)',
    brand: 'КАМАЗ',
    category: 'commercial',
    classType: 'Автобетоносмеситель АБС-7',
    year: 2014,
    powerHp: 280,
    topSpeedKmh: 105,
    weightKg: 9800,
    engineSpec: '11.76L V8 Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'Белый барабан', hex: '#f8fafc', roofHex: '#ea580c' }],
    descriptionRu: 'Тяжелый миксер с вращающимся гравитационным барабаном для доставки свежего бетона.'
  },
  {
    type: 'garbage_truck',
    nameRu: 'Мусоровоз КО-440 (КАМАЗ)',
    brand: 'Коммаш / КАМАЗ',
    category: 'commercial',
    classType: 'Коммунальный прессующий мусоровоз',
    year: 2018,
    powerHp: 240,
    topSpeedKmh: 100,
    weightKg: 10500,
    engineSpec: '6.7L Cummins Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [{ name: 'Оранжевый спецтранспорт', hex: '#ea580c' }],
    descriptionRu: 'Спецавтомобиль с задней механизированной загрузкой и гидравлической плитой прессования.'
  },

  // --- SPECIAL MACHINERY & TRACTORS ---
  {
    type: 'tractor_mtz82',
    nameRu: 'Трактор МТЗ-82.1 «Беларус» (4x4)',
    brand: 'Минский Тракторный',
    category: 'special',
    classType: 'Универсальный трактор 4x4',
    year: 1994,
    powerHp: 81,
    topSpeedKmh: 70,
    weightKg: 4000,
    engineSpec: '4.75L Д-243 4-цил. Дизель',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [
      { name: 'Синий Беларус', hex: '#1d4ed8' },
      { name: 'Красный Беларус', hex: '#dc2626' }
    ],
    descriptionRu: 'Надежный полноприводный пропашной трактор с ВОМ и тягово-сцепным устройством.'
  },
  {
    type: 'tractor_mtz80',
    nameRu: 'Трактор МТЗ-80 «Беларус» (4x2)',
    brand: 'Минский Тракторный',
    category: 'special',
    classType: 'Пропашной трактор заднеприводный',
    year: 1988,
    powerHp: 75,
    topSpeedKmh: 70,
    weightKg: 3800,
    engineSpec: '4.75L Д-240 4-цил. Дизель',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [
      { name: 'Синий Беларус', hex: '#1d4ed8' },
      { name: 'Красный Беларус', hex: '#dc2626' }
    ],
    descriptionRu: 'Классический заднеприводный трактор с узкими передними колесами для полевых работ.'
  },

  // --- MOTORCYCLES & MOPEDS ---
  {
    type: 'moto_izh_jupiter',
    nameRu: 'Мотоцикл Иж Юпитер-5',
    brand: 'Ижмаш',
    category: 'moto',
    classType: 'Дорожный двухтактный мотоцикл',
    year: 1992,
    powerHp: 24,
    topSpeedKmh: 165,
    weightKg: 175,
    engineSpec: '348cc 2-тактный 2-цилиндровый',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [
      { name: 'Иж Красный', hex: '#dc2626' },
      { name: 'Иж Лазурный', hex: '#0284c7' },
      { name: 'Иж Черный', hex: '#0f172a' }
    ],
    descriptionRu: 'Советский двухцилиндровый дорожный мотоцикл с характерным рокотом выхлопа.'
  },
  {
    type: 'moto_ural_sidecar',
    nameRu: 'Мотоцикл Урал М-67 с коляской',
    brand: 'Ирбитский Мотозавод',
    category: 'moto',
    classType: 'Тяжелый мотоцикл с люлькой',
    year: 1985,
    powerHp: 36,
    topSpeedKmh: 145,
    weightKg: 350,
    engineSpec: '649cc 4-тактный оппозитный',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [
      { name: 'Хаки милитари', hex: '#4d5b38' },
      { name: 'Синий глянец', hex: '#1d4ed8' }
    ],
    descriptionRu: 'Тяжелый оппозитный мотоцикл с карданным приводом и вместительной пассажирской коляской.'
  },
  {
    type: 'moto_jawa350',
    nameRu: 'Мотоцикл Ява 350 (Jawa 638)',
    brand: 'Jawa Moto',
    category: 'moto',
    classType: 'Чехословацкая классика',
    year: 1989,
    powerHp: 26,
    topSpeedKmh: 175,
    weightKg: 160,
    engineSpec: '343cc 2-тактный 2-цил. раздельная смазка',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [{ name: 'Вишневый Jawa', hex: '#881337' }],
    descriptionRu: 'Культовый мотоцикл советской эпохи с великолепной динамикой и звуком сигарообразных труб.'
  },
  {
    type: 'moto_sport',
    nameRu: 'Спортбайк Superbike 1000cc',
    brand: 'Yamabusa Racing',
    category: 'moto',
    classType: 'Сверхскоростной спортбайк',
    year: 2022,
    powerHp: 180,
    topSpeedKmh: 310,
    weightKg: 195,
    engineSpec: '998cc 16V DOHC Inline-4',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [
      { name: 'Гоночный синий', hex: '#2563eb' },
      { name: 'Черно-красный', hex: '#dc2626' },
      { name: 'Кислотный зеленый', hex: '#16a34a' }
    ],
    descriptionRu: 'Бешеное ускорение до 100 км/ч за 3 секунды и предельная скорость свыше 300 км/ч.'
  },
  {
    type: 'moto_chopper',
    nameRu: 'Круизер-Чоппер V-Twin 1200',
    brand: 'Milwaukee Iron',
    category: 'moto',
    classType: 'Кастомный круизер',
    year: 2018,
    powerHp: 78,
    topSpeedKmh: 190,
    weightKg: 310,
    engineSpec: '1200cc V-Twin Воздушное охлаждение',
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    colors: [{ name: 'Черный хром', hex: '#09090b' }],
    descriptionRu: 'Широкий низкий руль, удобная посадка ногами вперед и басовитый выхлоп.'
  },
  {
    type: 'moped_soviet',
    nameRu: 'Мопед «Карпаты-2»',
    brand: 'Львовский Мотозавод',
    category: 'moto',
    classType: 'Советский легкий мопед',
    year: 1989,
    powerHp: 2,
    topSpeedKmh: 95,
    weightKg: 55,
    engineSpec: '49.8cc V-50 2-тактный',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [
      { name: 'Оранжевый Карпаты', hex: '#ea580c' },
      { name: 'Зеленый Карпаты', hex: '#15803d' }
    ],
    descriptionRu: 'Легкий двухскоростной мопед с ножным переключением и педалями.'
  },

  // --- TRAILERS & SEMI-TRAILERS ---
  {
    type: 'trailer_semi',
    nameRu: 'Полуприцеп бортовой НЕФАЗ-9334',
    brand: 'НЕФАЗ',
    category: 'trailers',
    classType: 'Трёхосный бортовой полуприцеп',
    year: 2016,
    powerHp: 0,
    topSpeedKmh: 120,
    weightKg: 6500,
    engineSpec: 'Шкворень 2" (50 мм)',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Синий борт', hex: '#1d4ed8' }, { name: 'Серый индустриальный', hex: '#475569' }],
    descriptionRu: 'Магистральный бортовой полуприцеп для перевозки штучных и генеральных грузов.'
  },
  {
    type: 'trailer_semi_box',
    nameRu: 'Полуприцеп-рефрижератор «Совтрансавто»',
    brand: 'НЕФАЗ / Schmitz',
    category: 'trailers',
    classType: 'Изотермический полуприцеп',
    year: 2015,
    powerHp: 0,
    topSpeedKmh: 120,
    weightKg: 7200,
    engineSpec: 'ХОУ Thermo King',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Белый Совтрансавто', hex: '#f8fafc', roofHex: '#dc2626' }],
    descriptionRu: 'Рефрижератор для перевозки замороженной продукции на дальние расстояния.'
  },
  {
    type: 'trailer_semi_tanker',
    nameRu: 'Полуприцеп-цистерна ГСМ НЕФАЗ (30 000 л)',
    brand: 'НЕФАЗ',
    category: 'trailers',
    classType: 'Цистерна нефтепродуктов',
    year: 2018,
    powerHp: 0,
    topSpeedKmh: 115,
    weightKg: 7800,
    engineSpec: '3-секционная емкость 30м³',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Оранжевый Огнеопасно', hex: '#ea580c' }],
    descriptionRu: 'Большая магистральная цистерна для доставки топлива на нефтебазы и АЗС.'
  },
  {
    type: 'trailer_semi_container',
    nameRu: 'Контейнеровоз ЧМЗАП (40ft MAERSK)',
    brand: 'ЧМЗАП',
    category: 'trailers',
    classType: 'Контейнеровозное шасси 40 футов',
    year: 2017,
    powerHp: 0,
    topSpeedKmh: 120,
    weightKg: 8500,
    engineSpec: 'Замки twist-lock под 40ft',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Красный MAERSK', hex: '#991b1b' }],
    descriptionRu: 'Полуприцеп-контейнеровоз с установленным 40-футовым морским интермодальным контейнером.'
  },
  {
    type: 'trailer_semi_lowboy',
    nameRu: 'Низкорамный трал-тяжеловоз ЧМЗАП',
    brand: 'ЧМЗАП',
    category: 'trailers',
    classType: 'Тяжеловозный низкорамный трал',
    year: 2019,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 8900,
    engineSpec: 'Аппарели грузоподъемностью 40 тонн',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Оранжевый ЧМЗАП', hex: '#d97706' }],
    descriptionRu: 'Сверхмощный трал для транспортировки катков, асфальтоукладчиков и тракторов.'
  },
  {
    type: 'trailer_barrel',
    nameRu: 'Тракторная бочка-цистерна 3.5м³',
    brand: 'Бобруйскагромаш',
    category: 'trailers',
    classType: 'Тракторная цистерна',
    year: 2010,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 1400,
    engineSpec: 'Сцепная петля под фаркоп МТЗ',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Желтая бочка', hex: '#ca8a04' }],
    descriptionRu: 'Прицепная тракторная цистерна для перевозки воды и технических жидкостей.'
  },
  {
    type: 'trailer_vacuum',
    nameRu: 'Тракторная вакуумная бочка МЖТ-Ф',
    brand: 'АгроМаш',
    category: 'trailers',
    classType: 'Ассенизационная вакуумная цистерна',
    year: 2012,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 1480,
    engineSpec: 'Вакуумный насос от ВОМ',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Оранжевая бочка', hex: '#ea580c' }],
    descriptionRu: 'Тракторная бочка с вакуумным насосом для откачки и полива жидких удобрений.'
  },
  {
    type: 'trailer_flatbed_2axle',
    nameRu: 'Прицеп тракторный 2-ПТС-4 (бортовой)',
    brand: 'Ташкентсельмаш',
    category: 'trailers',
    classType: '2-осный самосвальный тракторный прицеп',
    year: 1995,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 2400,
    engineSpec: 'Поворотный круг, гидроподъемник',
    fuelType: 'diesel',
    fuelTypeLabel: 'Прицеп',
    colors: [{ name: 'Зеленый колхозный', hex: '#166534' }, { name: 'Синий борт', hex: '#1d4ed8' }],
    descriptionRu: 'Универсальный двухосный тракторный самосвальный прицеп грузоподъемностью 4 тонны.'
  }
];

// Add extra items
for (const extra of EXTRA_VEHICLES) {
  if (extra.type && !catalogMap.has(extra.type)) {
    const cfg = CAR_CONFIGS[extra.type] || CAR_CONFIGS.sedan;
    catalogMap.set(extra.type, {
      id: `cat_${extra.type}`,
      type: extra.type as CarType,
      nameRu: extra.nameRu || cfg.name,
      brand: extra.brand || 'Авто',
      category: extra.category || deduceCategory(extra.type, extra.classType),
      classType: extra.classType || 'Транспорт',
      year: extra.year || 2020,
      powerHp: extra.powerHp || 100,
      topSpeedKmh: extra.topSpeedKmh || Math.round(cfg.maxSpeed),
      weightKg: extra.weightKg || cfg.mass,
      engineSpec: extra.engineSpec || 'ДВС',
      fuelType: extra.fuelType || 'ai95',
      fuelTypeLabel: extra.fuelTypeLabel || 'АИ-95',
      colors: extra.colors && extra.colors.length > 0 ? extra.colors : DEFAULT_PALETTE,
      descriptionRu: extra.descriptionRu || 'Надежный транспорт для любых дорог.'
    });
  }
}

// 3. Guaranteed completeness check: Ensure EVERY key in CAR_CONFIGS has an entry in VEHICLE_CATALOG
for (const [key, cfg] of Object.entries(CAR_CONFIGS)) {
  if (!catalogMap.has(key)) {
    const deducedCat = deduceCategory(key, cfg.name);
    catalogMap.set(key, {
      id: `cat_${key}`,
      type: key as CarType,
      nameRu: cfg.name,
      brand: 'Автопром',
      category: deducedCat,
      classType: deducedCat === 'special' ? 'Спецтехника' : (deducedCat === 'commercial' ? 'Грузовой' : 'Транспорт'),
      year: 2020,
      powerHp: Math.round(cfg.maxSpeed * 0.95),
      topSpeedKmh: Math.round(cfg.maxSpeed),
      weightKg: cfg.mass,
      engineSpec: deducedCat === 'special' || deducedCat === 'commercial' ? 'Дизель' : 'Бензиновый ДВС',
      fuelType: deducedCat === 'special' || deducedCat === 'commercial' ? 'diesel' : 'ai95',
      fuelTypeLabel: deducedCat === 'special' || deducedCat === 'commercial' ? 'ДТ' : 'АИ-95',
      colors: cfg.color ? [{ name: 'Стандартный', hex: cfg.color }, ...DEFAULT_PALETTE] : DEFAULT_PALETTE,
      descriptionRu: `${cfg.name}. Надежная заводская конструкция для дорожных условий.`
    });
  }
}

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = Array.from(catalogMap.values());

export function getVehicleCatalogItem(type: string): VehicleCatalogEntry | undefined {
  return catalogMap.get(type);
}

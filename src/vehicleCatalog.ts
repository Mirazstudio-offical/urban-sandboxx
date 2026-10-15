import { CarType } from './types';
import { CAR_CONFIGS } from './vehicleHelpers';
import { DEALERSHIP_CARS } from './components/CarDealershipModal';

export interface VehicleCatalogEntry {
  id: string;
  type: CarType;
  nameRu: string;
  brand: string;
  category: 'passenger' | 'sport' | 'suv' | 'commercial' | 'special' | 'emergency' | 'bus';
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
function deduceCategory(type: string, classType?: string): VehicleCatalogEntry['category'] {
  const t = type.toLowerCase();
  const c = (classType || '').toLowerCase();
  if (t.includes('police') || t.includes('fire') || t.includes('ambulance')) return 'emergency';
  if (t.includes('bus') || t.includes('paz') || t.includes('ikarus')) return 'bus';
  if (t.includes('tractor') || t.includes('roller') || t.includes('paver') || t.includes('cement') || t.includes('garbage')) return 'special';
  if (t.includes('truck') || t.includes('van') || t.includes('kamaz') || t.includes('zil') || t.includes('semi')) return 'commercial';
  if (t.includes('suv') || t.includes('offroad') || t.includes('niva') || t.includes('uaz') || t.includes('pickup')) return 'suv';
  if (t.includes('sport') || t.includes('supercar') || t.includes('coupe') || t.includes('muscle') || t.includes('hatch_hot')) return 'sport';
  if (c.includes('спорт') || c.includes('суперкар') || c.includes('купе')) return 'sport';
  if (c.includes('внедорож') || c.includes('джип') || c.includes('4x4')) return 'suv';
  if (c.includes('груз') || c.includes('фургон') || c.includes('тягач')) return 'commercial';
  if (c.includes('каток') || c.includes('трактор')) return 'special';
  if (c.includes('автобус')) return 'bus';
  return 'passenger';
}

// Build unified catalog from DEALERSHIP_CARS + extra specialized vehicles
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

// 2. Extra emergency, sports, tractors, and trucks from CAR_CONFIGS
const EXTRA_VEHICLES: Partial<VehicleCatalogEntry>[] = [
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
    descriptionRu: 'Оперативный автомобиль дорожно-патрульной службы с проблесковыми маячками и сиреной.'
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
    descriptionRu: 'Тяжелая пожарная автоцистерна повышенной проходимости с полным баком воды и сиреной.'
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
    descriptionRu: 'Карета скорой медицинской помощи со светозвуковыми спецсигналами.'
  },
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
    type: 'truck_semi',
    nameRu: 'Седельный тягач КамАЗ-54115',
    brand: 'КамАЗ',
    category: 'commercial',
    classType: 'Магистральный тягач',
    year: 2004,
    powerHp: 240,
    topSpeedKmh: 110,
    weightKg: 7200,
    engineSpec: '10.85L V8 Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    colors: [
      { name: 'Оранжевый КамАЗ', hex: '#ea580c' },
      { name: 'Синий кабин', hex: '#1e40af' },
      { name: 'Белый лебедь', hex: '#f8fafc' }
    ],
    descriptionRu: 'Трёхосный седельный тягач для сцепки с полуприцепами и дальних междугородных рейсов.'
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
    weightKg: 1230,
    engineSpec: '1.6L 16V Бензин + ГБО',
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    colors: [{ name: 'Желтое такси с шашечками', hex: '#facc15' }],
    descriptionRu: 'Городское такси с навигационным терминалом и установленным экономичным ГБО.'
  },
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
  }
];

for (const extra of EXTRA_VEHICLES) {
  if (extra.type && !catalogMap.has(extra.type)) {
    const cfg = CAR_CONFIGS[extra.type] || CAR_CONFIGS.sedan;
    catalogMap.set(extra.type, {
      id: `cat_${extra.type}`,
      type: extra.type as CarType,
      nameRu: extra.nameRu || cfg.name,
      brand: extra.brand || 'Авто',
      category: extra.category || 'passenger',
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

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = Array.from(catalogMap.values());

export function getVehicleCatalogItem(type: string): VehicleCatalogEntry | undefined {
  return catalogMap.get(type);
}

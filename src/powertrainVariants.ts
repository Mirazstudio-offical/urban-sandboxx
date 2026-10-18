/**
 * POWERTRAIN VARIANTS SYSTEM
 * Обширные наборы двигателей, КПП, прошивок ЭБУ, комплектов шин и турбонагнетателей.
 * Каждый вариант реально влияет на поведение автомобиля:
 *  - тип топлива / октановое число (requiredFuel, fuelSystem)
 *  - передаточные числа, количество передач, главная пара (gearRatios, finalDriveRatio)
 *  - тип коробки: МКПП / АКПП / РКПП (робот) / DSG / вариатор CVT / ГСТ / диапазонная с делителем
 *  - масса (масса двигателя, КПП, турбо-комплекта, комплект шин)
 *  - сцепление: отсрочка включения, износ, перегрев
 *  - динамика: кривая мощности, оборотистость, отсечка, потребление топлива
 *  - турбо: спул, лаг, наддув (реально добавляет тягу и расход)
 *  - шины: сцепление (сухо/мокро/лёд), сопротивление качению, предел скорости, шипы
 */

import { CarType, EngineState, FuelType, Vehicle } from './types';

// ============================================================================
// CATEGORY OF VEHICLE FOR POWERTRAIN POPULATION PICKING
// ============================================================================

export type PwCategory =
  | 'sport' | 'muscle' | 'luxury' | 'city' | 'retro' | 'suv' | 'offroad'
  | 'van' | 'truck' | 'heavy' | 'bus' | 'emergency' | 'tractor'
  | 'moto' | 'moped' | 'machinery';

const SPORT_TYPES = new Set<string>(['sports', 'supercar', 'hatch_hot', 'coupe_gt', 'moto_sport']);
const MUSCLE_TYPES = new Set<string>(['muscle', 'muscle_classic']);
const LUXURY_TYPES = new Set<string>(['sedan_luxury', 'suv_luxury', 'classic_black']);
const RETRO_TYPES = new Set<string>(['wagon_classic', 'sedan_classic', 'classic_compact', 'retro_bubble', 'micro_car', 'hatch_samara', 'sedan_samara', 'liftback_tavria', 'van_cargo_old', 'truck_zil_dump']);
const SUV_TYPES = new Set<string>(['suv', 'suv_classic_box', 'crossover_compact', 'wagon_allroad', 'wagon_modern', 'pickup', 'ambulance_suv']);
const OFFROAD_TYPES = new Set<string>(['offroad_hardcore', 'suv_classic_box', 'pickup', 'pickup_heavy', 'truck_armored']);
const VAN_TYPES = new Set<string>(['van', 'van_camper', 'bus_minibus', 'delivery_truck', 'ambulance_van', 'ambulance']);
const TRUCK_TYPES = new Set<string>(['truck_box', 'truck_dump', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'truck_tow', 'truck_semi', 'truck_armored', 'fire_engine', 'fire_ladder', 'fire_rescue']);
const BUS_TYPES = new Set<string>(['bus', 'bus_minibus']);
const EMERGENCY_TYPES = new Set<string>(['police', 'ambulance', 'ambulance_van', 'ambulance_suv', 'fire_engine', 'fire_ladder', 'fire_rescue']);
const MACHINERY_TYPES = new Set<string>(['paver_asphalt_wheeled', 'roller_heavy_tandem', 'roller_compact_sidewalk', 'roller_pneumatic']);
const TRUCK_ZIL = 'truck_zil_dump';

export function getVehiclePowertrainCategory(type?: CarType | string): PwCategory {
  if (!type) return 'city';
  if (MACHINERY_TYPES.has(type)) return 'machinery';
  if (type.startsWith('trailer_')) return 'machinery';
  if (type.startsWith('tractor_')) return 'tractor';
  if (type === 'moped_soviet') return 'moped';
  if (type.startsWith('moto_')) return 'moto';
  if (SPORT_TYPES.has(type)) return 'sport';
  if (MUSCLE_TYPES.has(type)) return 'muscle';
  if (EMERGENCY_TYPES.has(type)) return 'emergency';
  if (LUXURY_TYPES.has(type)) return 'luxury';
  if (TRUCK_TYPES.has(type)) return 'truck';
  if (BUS_TYPES.has(type)) return 'bus';
  if (type === TRUCK_ZIL) return 'retro';
  if (OFFROAD_TYPES.has(type)) return 'offroad';
  if (SUV_TYPES.has(type)) return 'suv';
  if (VAN_TYPES.has(type)) return 'van';
  if (RETRO_TYPES.has(type)) return 'retro';
  return 'city';
}

// ============================================================================
// ENGINE CATALOG (ДВИГАТЕЛИ)
// every engine: fuel requirement, RPM bands, power/torque factor, consumption,
// mass, response, heat, oil appetite. Many come from factory with turbo.
// ============================================================================

export interface TurboSpecDef {
  id: string;
  nameRu: string;
  boostMax: number;      // fraction of extra torque at full boost (0.15 - 0.50)
  spoolRPM: number;      // RPM where boost starts to build
  lagRate: number;       // 1/s spool responsiveness (higher = less lag)
  massKg: number;
  isSupercharged?: boolean;
  isTwin?: boolean;
}

export const TURBO_KITS: TurboSpecDef[] = [
  { id: 'trb_none', nameRu: 'Без наддува (атмо)', boostMax: 0, spoolRPM: 0, lagRate: 0, massKg: 0 },
  { id: 'trb_t25', nameRu: 'Турбокомпрессор T25 (малый)', boostMax: 0.18, spoolRPM: 2600, lagRate: 3.2, massKg: 9 },
  { id: 'trb_t28', nameRu: 'Турбокомпрессор T28 (средний)', boostMax: 0.27, spoolRPM: 3000, lagRate: 2.4, massKg: 13 },
  { id: 'trb_t4', nameRu: 'Турбокомпрессор T4 (большой)', boostMax: 0.42, spoolRPM: 3400, lagRate: 1.7, massKg: 19 },
  { id: 'trb_vnt', nameRu: 'Турбина VNT с изменяемой геометрией', boostMax: 0.30, spoolRPM: 2100, lagRate: 2.8, massKg: 14 },
  { id: 'trb_twinturbo', nameRu: 'Biturbo (двухвальный наддув)', boostMax: 0.50, spoolRPM: 2900, lagRate: 2.2, massKg: 26, isTwin: true },
  { id: 'trb_sch', nameRu: 'Механический нагнетатель (компрессор)', boostMax: 0.30, spoolRPM: 1200, lagRate: 6.0, massKg: 28, isSupercharged: true }
];

export interface EngineVariantDef {
  id: string;
  nameRu: string;
  fuel: FuelType;             // required fuel type at gas station
  idleRPM: number;
  redlineRPM: number;         // governor / stock cut-off
  maxRPM: number;             // absolute mechanical limit before governor collapse
  powerMult: number;          // base torque/power factor (1.0 = nominal for class)
  consumptionMult: number;    // fuel consumption multiplier
  massKg: number;             // engine mass (added to vehicle weight)
  rpmResponseMult: number;    // flywheel inertia factor (higher = revs faster)
  heatMult: number;           // thermal load multiplier
  lpgCompatible: boolean;     // can GBO/LPG be installed
  turbo?: TurboSpecDef;       // factory turbo/supercharger (may be nullvrequisit)
  cats: PwCategory[];
  weight: number;             // population pick weight
  note?: string;
}

const TAT = TURBO_KITS[1]; // atlas small T25
const TMD = TURBO_KITS[2]; // medium T28
const TBI = TURBO_KITS[3]; // big T4
const TVN = TURBO_KITS[4]; // VNT diesel
const TTN = TURBO_KITS[5]; // biturbo
const TSC = TURBO_KITS[6]; // supercharger

export const ENGINE_VARIANTS: EngineVariantDef[] = [
  // ---- Современные бензиновые (город / кроссоверы / универсалы) ----
  { id: 'eng_08_3cil_econ', nameRu: '0.9 л R3 Эконом (атмо)', fuel: 'ai92', idleRPM: 820, redlineRPM: 6300, maxRPM: 7200, powerMult: 0.78, consumptionMult: 0.78, massKg: 68, rpmResponseMult: 1.15, heatMult: 0.95, lpgCompatible: true, cats: ['city'], weight: 4, note: 'Крошечный трёхцилиндровый атмосферник, тяговит только наверхах' },
  { id: 'eng_12_4cil_econ', nameRu: '1.2 л R4 Эконом (атмо)', fuel: 'ai92', idleRPM: 800, redlineRPM: 6200, maxRPM: 7100, powerMult: 0.85, consumptionMult: 0.85, massKg: 82, rpmResponseMult: 1.10, heatMult: 0.97, lpgCompatible: true, cats: ['city'], weight: 8 },
  { id: 'eng_14_8v', nameRu: '1.4 л 8V Бюджетный (атмо)', fuel: 'ai92', idleRPM: 780, redlineRPM: 6000, maxRPM: 6900, powerMult: 0.92, consumptionMult: 0.9, massKg: 95, rpmResponseMult: 1.05, heatMult: 1.0, lpgCompatible: true, cats: ['city', 'van'], weight: 10 },
  { id: 'eng_14_t', nameRu: '1.4 л TSI 150 л.с. (турбо)', fuel: 'ai95', idleRPM: 790, redlineRPM: 6600, maxRPM: 7600, powerMult: 1.12, consumptionMult: 0.92, massKg: 105, rpmResponseMult: 1.12, heatMult: 1.05, lpgCompatible: false, turbo: TMD, cats: ['city', 'suv'], weight: 7, note: 'Современный турбомотор с неплохой тягой снизу' },
  { id: 'eng_16_8v', nameRu: '1.6 л 8V Классический (атмо)', fuel: 'ai92', idleRPM: 800, redlineRPM: 5800, maxRPM: 6600, powerMult: 0.95, consumptionMult: 0.95, massKg: 110, rpmResponseMult: 1.0, heatMult: 1.0, lpgCompatible: true, cats: ['city', 'retro', 'van', 'suv'], weight: 14, note: 'Народный нижневальный мотор, тяга снизу, любит 92-й' },
  { id: 'eng_16_16v', nameRu: '1.6 л 16V Инжектор (атмо)', fuel: 'ai95', idleRPM: 820, redlineRPM: 6400, maxRPM: 7300, powerMult: 1.04, consumptionMult: 0.94, massKg: 108, rpmResponseMult: 1.08, heatMult: 1.0, lpgCompatible: true, cats: ['city', 'suv'], weight: 10 },
  { id: 'eng_15_vtec', nameRu: '1.5 л 16V Высокооборотный (атмо)', fuel: 'ai95', idleRPM: 860, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.06, consumptionMult: 0.97, massKg: 96, rpmResponseMult: 1.2, heatMult: 1.02, lpgCompatible: false, cats: ['city', 'sport'], weight: 5, note: 'Верховый мотор: пик тяги на высоких оборотах' },
  { id: 'eng_20_na', nameRu: '2.0 л R4 150 л.с. (атмо)', fuel: 'ai95', idleRPM: 780, redlineRPM: 6300, maxRPM: 7200, powerMult: 1.10, consumptionMult: 1.05, massKg: 128, rpmResponseMult: 1.0, heatMult: 1.02, lpgCompatible: true, cats: ['city', 'suv', 'luxury', 'emergency'], weight: 8 },
  { id: 'eng_18_t', nameRu: '1.8 л Турбо (EJ-серия)', fuel: 'ai95', idleRPM: 830, redlineRPM: 6500, maxRPM: 7600, powerMult: 1.25, consumptionMult: 1.02, massKg: 122, rpmResponseMult: 1.05, heatMult: 1.08, lpgCompatible: false, turbo: TMD, cats: ['sport', 'luxury', 'city'], weight: 4 },
  { id: 'eng_20_t', nameRu: '2.0 л Турбо 245 л.с. (hot)', fuel: 'ai95', idleRPM: 860, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.42, consumptionMult: 1.12, massKg: 132, rpmResponseMult: 1.1, heatMult: 1.12, lpgCompatible: false, turbo: TMD, cats: ['sport', 'luxury'], weight: 4 },
  { id: 'eng_25_t5', nameRu: '2.5 л T5 Тиск (турбо)', fuel: 'ai98', idleRPM: 870, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.55, consumptionMult: 1.18, massKg: 150, rpmResponseMult: 1.05, heatMult: 1.15, lpgCompatible: false, turbo: TBI, cats: ['sport', 'luxury', 'emergency', 'suv'], weight: 2 },
  { id: 'eng_30_t6', nameRu: '3.0 л V6 Biturbo', fuel: 'ai98', idleRPM: 620, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.62, consumptionMult: 1.25, massKg: 185, rpmResponseMult: 0.92, heatMult: 1.12, lpgCompatible: false, turbo: TTN, cats: ['luxury', 'sport', 'suv'], weight: 2 },
  { id: 'eng_42_v8', nameRu: '4.2 л V8 32V (атмо)', fuel: 'ai98', idleRPM: 640, redlineRPM: 6800, maxRPM: 7800, powerMult: 1.60, consumptionMult: 1.3, massKg: 210, rpmResponseMult: 0.9, heatMult: 1.1, lpgCompatible: false, cats: ['luxury', 'muscle'], weight: 2 },
  { id: 'eng_50_sc_v8', nameRu: '5.0 л V8 Supercharged', fuel: 'ai98', idleRPM: 700, redlineRPM: 7100, maxRPM: 8100, powerMult: 1.88, consumptionMult: 1.45, massKg: 220, rpmResponseMult: 1.0, heatMult: 1.2, lpgCompatible: false, turbo: TSC, cats: ['muscle', 'sport', 'emergency', 'luxury'], weight: 1 },
  { id: 'eng_52_v10', nameRu: '5.2 л V10 FSI (атмо)', fuel: 'ai100', idleRPM: 720, redlineRPM: 8600, maxRPM: 8800, powerMult: 1.92, consumptionMult: 1.5, massKg: 215, rpmResponseMult: 1.35, heatMult: 1.18, lpgCompatible: false, cats: ['sport'], weight: 1, note: 'Отсечка на 8600 об/мин — атмосферный пик максимального биения' },
  { id: 'eng_62_w12', nameRu: '6.2 л V8 Компрессор (Charger Edition)', fuel: 'ai98', idleRPM: 680, redlineRPM: 7000, maxRPM: 8100, powerMult: 1.95, consumptionMult: 1.55, massKg: 245, rpmResponseMult: 0.92, heatMult: 1.22, lpgCompatible: false, turbo: TSC, cats: ['sport', 'muscle'], weight: 1 },
  // ---- ГАЗовые / эконом/ так принадлежность ----
  { id: 'eng_16_boost_95', nameRu: '1.6 л 16V Спортивный распредвал', fuel: 'ai95', idleRPM: 850, redlineRPM: 6700, maxRPM: 7600, powerMult: 1.12, consumptionMult: 1.04, massKg: 108, rpmResponseMult: 1.15, heatMult: 1.06, lpgCompatible: true, cats: ['city', 'sport', 'retro'], weight: 3, note: 'Ранние ковка/спорт-распредвалы' },
  // ---- Ретро и советские карбюраторные ----
  { id: 'eng_11_mez', nameRu: '1.1 л МеМЗ-245 Карбюратор', fuel: 'ai92', idleRPM: 850, redlineRPM: 5400, maxRPM: 6100, powerMult: 0.7, consumptionMult: 0.88, massKg: 88, rpmResponseMult: 1.0, heatMult: 0.92, lpgCompatible: true, cats: ['retro', 'city'], weight: 4, note: 'Анемичный таврический моторчик' },
  { id: 'eng_12_soviet', nameRu: '1.2 л Классический карбюратор', fuel: 'ai92', idleRPM: 850, redlineRPM: 5300, maxRPM: 6100, powerMult: 0.78, consumptionMult: 0.9, massKg: 96, rpmResponseMult: 0.95, heatMult: 0.95, lpgCompatible: true, cats: ['retro'], weight: 6 },
  { id: 'eng_15_soviet', nameRu: '1.5 л Классический карбюратор (ВАЗ)', fuel: 'ai92', idleRPM: 820, redlineRPM: 5600, maxRPM: 6400, powerMult: 0.88, consumptionMult: 0.98, massKg: 116, rpmResponseMult: 0.95, heatMult: 0.98, lpgCompatible: true, cats: ['retro', 'city'], weight: 8 },
  { id: 'eng_16_zil_v8', nameRu: '6.0 л V8 ЗИЛ-130 Карбюратор', fuel: 'ai92', idleRPM: 560, redlineRPM: 3200, maxRPM: 3800, powerMult: 1.05, consumptionMult: 1.35, massKg: 520, rpmResponseMult: 0.55, heatMult: 1.05, lpgCompatible: false, cats: ['retro'], weight: 1, note: 'Тяжёлый бензиновый грузовик-мотор с большим запасом тяги' },
  // ---- Лёгкие современные дизели ----
  { id: 'eng_19_tdi', nameRu: '1.9 л TDI 105 л.с. (турбо-дизель)', fuel: 'diesel', idleRPM: 820, redlineRPM: 4500, maxRPM: 5200, powerMult: 1.02, consumptionMult: 0.72, massKg: 128, rpmResponseMult: 0.9, heatMult: 1.0, lpgCompatible: false, turbo: TVN, cats: ['city', 'van', 'suv', 'retro'], weight: 8, note: 'Экономичный дизель с отличной тягой на низах' },
  { id: 'eng_22_na_d', nameRu: '2.2 л Дизель Атмо (старый)', fuel: 'diesel', idleRPM: 740, redlineRPM: 4000, maxRPM: 4600, powerMult: 0.72, consumptionMult: 0.85, massKg: 140, rpmResponseMult: 0.75, heatMult: 0.95, lpgCompatible: false, cats: ['retro', 'van'], weight: 3 },
  { id: 'eng_24_td', nameRu: '2.4 л TD Рядный (турбо-дизель)', fuel: 'diesel', idleRPM: 750, redlineRPM: 4200, maxRPM: 4800, powerMult: 1.05, consumptionMult: 0.85, massKg: 165, rpmResponseMult: 0.8, heatMult: 1.02, lpgCompatible: false, turbo: TVN, cats: ['van', 'suv', 'city'], weight: 5 },
  { id: 'eng_28_td_lux', nameRu: '2.8 л 24V Turbo-Diesel', fuel: 'diesel', idleRPM: 700, redlineRPM: 4400, maxRPM: 5000, powerMult: 1.18, consumptionMult: 0.9, massKg: 185, rpmResponseMult: 0.85, heatMult: 1.05, lpgCompatible: false, turbo: TVN, cats: ['suv', 'luxury', 'van', 'emergency'], weight: 4 },
  { id: 'eng_44_v8_td', nameRu: '4.4 л V8 Twin-Turbo Diesel', fuel: 'diesel', idleRPM: 620, redlineRPM: 4400, maxRPM: 5100, powerMult: 1.55, consumptionMult: 1.2, massKg: 245, rpmResponseMult: 0.85, heatMult: 1.12, lpgCompatible: false, turbo: TTN, cats: ['luxury', 'suv', 'sport'], weight: 1 },
  { id: 'eng_50_v8_td', nameRu: '5.0 л V8 TD Heavy (ТНВД)', fuel: 'diesel', idleRPM: 620, redlineRPM: 3400, maxRPM: 4000, powerMult: 1.35, consumptionMult: 1.15, massKg: 310, rpmResponseMult: 0.65, heatMult: 1.08, lpgCompatible: false, turbo: TVN, cats: ['truck', 'heavy', 'emergency'], weight: 2 },
  // ---- Среднетоннажные и тяжёлые дизели ----
  { id: 'eng_yamz_236', nameRu: 'ЯМЗ-236 V6 (ТНВД 12 цил)', fuel: 'diesel', idleRPM: 620, redlineRPM: 2400, maxRPM: 2900, powerMult: 1.18, consumptionMult: 1.1, massKg: 720, rpmResponseMult: 0.5, heatMult: 1.05, lpgCompatible: false, turbo: TMD, cats: ['truck', 'heavy', 'bus'], weight: 4, note: 'Классический средний дизель грузового класса' },
  { id: 'eng_yamz_238', nameRu: 'ЯМЗ-238 V8 (турбо)', fuel: 'diesel', idleRPM: 600, redlineRPM: 2500, maxRPM: 3000, powerMult: 1.32, consumptionMult: 1.15, massKg: 880, rpmResponseMult: 0.48, heatMult: 1.1, lpgCompatible: false, turbo: TMD, cats: ['truck', 'heavy'], weight: 4 },
  { id: 'eng_kamaz_740', nameRu: 'КАМАЗ-740 V8 (турбо)', fuel: 'diesel', idleRPM: 590, redlineRPM: 2600, maxRPM: 3150, powerMult: 1.42, consumptionMult: 1.12, massKg: 850, rpmResponseMult: 0.5, heatMult: 1.12, lpgCompatible: false, turbo: TMD, cats: ['truck', 'heavy'], weight: 4 },
  { id: 'eng_d434_zil_petrol', nameRu: 'Д-Petrol 4.6 л V8 Combined', fuel: 'diesel', idleRPM: 600, redlineRPM: 2550, maxRPM: 3000, powerMult: 1.25, consumptionMult: 1.08, massKg: 700, rpmResponseMult: 0.52, heatMult: 1.05, lpgCompatible: false, cats: ['truck'], weight: 2 },
  { id: 'eng_bus_d536', nameRu: '6-цил Рядный Турбо-Дизель (автобус)', fuel: 'diesel', idleRPM: 640, redlineRPM: 2500, maxRPM: 3000, powerMult: 1.25, consumptionMult: 0.95, massKg: 640, rpmResponseMult: 0.55, heatMult: 1.05, lpgCompatible: false, turbo: TMD, cats: ['bus', 'truck'], weight: 5 },
  { id: 'eng_hydro_d244', nameRu: 'Д-244 4-цил Дизель (станция ГСТ)', fuel: 'diesel', idleRPM: 650, redlineRPM: 2400, maxRPM: 2900, powerMult: 1.0, consumptionMult: 0.9, massKg: 390, rpmResponseMult: 0.5, heatMult: 1.0, lpgCompatible: false, cats: ['machinery'], weight: 10 },
  // ---- Тракторные ----
  { id: 'eng_d243_mtz', nameRu: 'Д-243 ММЗ (4 цил, атмо)', fuel: 'diesel', idleRPM: 780, redlineRPM: 2200, maxRPM: 2400, powerMult: 0.92, consumptionMult: 0.88, massKg: 430, rpmResponseMult: 0.42, heatMult: 0.98, lpgCompatible: false, cats: ['tractor'], weight: 6, note: 'Атмосферный некруточный дизель МТЗ' },
  { id: 'eng_d245_mtz', nameRu: 'Д-245 ММЗ Турбо (4 цил)', fuel: 'diesel', idleRPM: 780, redlineRPM: 2400, maxRPM: 2600, powerMult: 1.1, consumptionMult: 0.92, massKg: 445, rpmResponseMult: 0.45, heatMult: 1.02, lpgCompatible: false, turbo: TVN, cats: ['tractor'], weight: 6, note: 'Форкамерный турбодизель МТЗ-82' },
  // ---- Мототехника ----
  { id: 'eng_izj_2t_350', nameRu: '2Т 350 см3 (Иж-Юпитер)', fuel: 'ai92', idleRPM: 1100, redlineRPM: 6500, maxRPM: 7300, powerMult: 0.62, consumptionMult: 1.1, massKg: 38, rpmResponseMult: 1.3, heatMult: 0.9, lpgCompatible: false, cats: ['moto'], weight: 6, note: 'Двухтактный с вечной переборкой колец' },
  { id: 'eng_jawa_2t_350', nameRu: '2Т 344 см3 Sport (Jawa)', fuel: 'ai92', idleRPM: 1100, redlineRPM: 6800, maxRPM: 7600, powerMult: 0.68, consumptionMult: 1.05, massKg: 32, rpmResponseMult: 1.4, heatMult: 0.9, lpgCompatible: false, cats: ['moto'], weight: 5, note: 'Резкий «двухтактный подхват»' },
  { id: 'eng_ural_ohv_750', nameRu: 'Оппозитный ОВН 750 (Урал)', fuel: 'ai92', idleRPM: 1000, redlineRPM: 5800, maxRPM: 6300, powerMult: 0.66, consumptionMult: 1.0, massKg: 76, rpmResponseMult: 0.8, heatMult: 0.95, lpgCompatible: false, cats: ['moto'], weight: 4, note: 'Тяжёлый оппозитник с карданом' },
  { id: 'eng_chopper_v2_1100', nameRu: 'V2 1100 см3 Cruiser (ОВН)', fuel: 'ai92', idleRPM: 950, redlineRPM: 5600, maxRPM: 6200, powerMult: 0.95, consumptionMult: 1.0, massKg: 108, rpmResponseMult: 0.75, heatMult: 1.0, lpgCompatible: false, cats: ['moto'], weight: 3 },
  { id: 'eng_moto4t_600', nameRu: '4Т 600 см3 Inline-4 Суперспорт', fuel: 'ai95', idleRPM: 1250, redlineRPM: 11000, maxRPM: 13500, powerMult: 1.15, consumptionMult: 1.05, massKg: 58, rpmResponseMult: 2.0, heatMult: 1.15, lpgCompatible: false, cats: ['moto'], weight: 2, note: 'Отсечка на 11000 об/мин, механический предел 13500' },
  { id: 'eng_50cc_2t', nameRu: '2Т 50 см3 Мопедный', fuel: 'ai92', idleRPM: 1600, redlineRPM: 6300, maxRPM: 7200, powerMult: 0.22, consumptionMult: 0.55, massKg: 12, rpmResponseMult: 1.6, heatMult: 0.85, lpgCompatible: false, cats: ['moped'], weight: 10 }
];

// ============================================================================
// TRANSMISSION CATALOG (КОРОБКИ ПЕРЕДАЧ)
// ratios format: [reverse, neutral(0), 1st, 2nd, ... top]
// kind determines shift behavior: MT manual w/ clutch wear & stalls;
// AT classic torque converter automatic; DSG dual-clutch fast;
// AMT robotized single-clutch jerky; CVT belt pulley continuous.
// ============================================================================

export type TransmissionKind = 'MT' | 'AT' | 'DSG' | 'AMT' | 'CVT' | 'HYDRO' | 'RANGE';
export type DeviceMultiplier = 'divider' | 'tractor_range' | 'trans_case';

export interface TransmissionDef {
  id: string;
  nameRu: string;
  kind: TransmissionKind;
  ratios: number[];
  finalDrive: number;
  massKg: number;
  isManualYesNo?: boolean;   // true for MT: clutch pedal, step gear shifting, stalls
  shiftCooldown?: number;    // seconds between AUTO shifts (for AT/DSG/AMT)
  hasTorqueConverter?: boolean;  // AT only: low-speed creep & torque multiplication
  divider?: DeviceMultiplier;    // transfer case / range multiplier device
  cats: PwCategory[];
  weight: number;
  efficiency: number;        // drivetrain power efficiency (0.86 - 0.98)
  note?: string;
}

export const TRANSMISSION_VARIANTS: TransmissionDef[] = [
  // ---- Механические (MT) ----
  { id: 'trn_mt3_retro', nameRu: 'МКПП 3-ступ (старь)', kind: 'MT', ratios: [-3.5, 0, 3.7, 2.2, 1.5], finalDrive: 4.3, massKg: 38, isManualYesNo: true, cats: ['retro'], weight: 5, efficiency: 0.90 },
  { id: 'trn_mt4_retro', nameRu: 'МКПП 4-ступ (ретро)', kind: 'MT', ratios: [-3.5, 0, 3.6, 2.1, 1.36, 0.96], finalDrive: 4.1, massKg: 42, isManualYesNo: true, cats: ['retro', 'city'], weight: 6, efficiency: 0.92 },
  { id: 'trn_mt4_econ', nameRu: 'МКПП 4-ступ Экономика', kind: 'MT', ratios: [-3.4, 0, 3.9, 2.2, 1.44, 1.0], finalDrive: 4.0, massKg: 44, isManualYesNo: true, cats: ['retro', 'city'], weight: 5, efficiency: 0.92 },
  { id: 'trn_mt5_city', nameRu: 'МКПП 5-ступ (стандарт)', kind: 'MT', ratios: [-3.4, 0, 3.5, 2.05, 1.38, 1.0, 0.78], finalDrive: 3.9, massKg: 50, isManualYesNo: true, cats: ['city', 'retro', 'suv', 'van', 'offroad'], weight: 16, efficiency: 0.94 },
  { id: 'trn_mt5_econ_long', nameRu: 'МКПП 5-ступ эконом (long)', kind: 'MT', ratios: [-3.2, 0, 3.3, 2.0, 1.35, 0.97, 0.73], finalDrive: 3.7, massKg: 50, isManualYesNo: true, cats: ['city', 'suv'], weight: 5, efficiency: 0.94, note: 'Длинная главная пара — экономия, хуже разгон' },
  { id: 'trn_mt5_short', nameRu: 'МКПП 5-ступ короткая пара', kind: 'MT', ratios: [-3.6, 0, 3.7, 2.15, 1.45, 1.05, 0.82], finalDrive: 4.3, massKg: 50, isManualYesNo: true, cats: ['city', 'sport', 'retro'], weight: 5, efficiency: 0.94, note: 'Короткая пара — резкий разгон, бóльший расход' },
  { id: 'trn_mt6_sport', nameRu: 'МКПП 6-ступ Sport (близкие ряд)', kind: 'MT', ratios: [-3.0, 0, 3.05, 2.10, 1.56, 1.21, 1.00, 0.82], finalDrive: 3.7, massKg: 56, isManualYesNo: true, cats: ['sport', 'muscle'], weight: 6, efficiency: 0.95 },
  { id: 'trn_mt6_sport_short', nameRu: 'МКПП 6-ступ Sport (короткий ряд)', kind: 'MT', ratios: [-3.1, 0, 3.2, 2.2, 1.6, 1.25, 1.02, 0.85], finalDrive: 4.1, massKg: 56, isManualYesNo: true, cats: ['sport'], weight: 3, efficiency: 0.95 },
  // ---- Роботизированные (AMT: single clutch, jerky shifts) ----
  { id: 'trn_amt5', nameRu: 'РКПП 5-ступ (робот, однодисковая)', kind: 'AMT', ratios: [-2.9, 0, 3.0, 1.9, 1.3, 1.0], finalDrive: 4.0, massKg: 48, shiftCooldown: 0.8, cats: ['city', 'retro', 'suv'], weight: 3, efficiency: 0.93, note: 'Робот с характерным «клевком» при переключении' },
  { id: 'trn_amt6', nameRu: 'РКПП 6-ступ (робот EasyTronic)', kind: 'AMT', ratios: [-3.2, 0, 4.0, 2.34, 1.6, 1.18, 1.0], finalDrive: 4.1, massKg: 52, shiftCooldown: 0.75, cats: ['city', 'suv', 'van'], weight: 2, efficiency: 0.93 },
  // ---- Классические АКПП (torque converter) ----
  { id: 'trn_at3_retro', nameRu: 'АКПП 3-ступ (старая, гидротрансформатор)', kind: 'AT', ratios: [-3.0, 0, 2.8, 1.65, 1.0], finalDrive: 3.7, massKg: 62, shiftCooldown: 0.45, hasTorqueConverter: true, cats: ['retro', 'muscle', 'luxury'], weight: 4, efficiency: 0.86, note: 'Старый 3-диапазонный автомат, высокий расход' },
  { id: 'trn_at4', nameRu: 'АКПП 4-ступ', kind: 'AT', ratios: [-2.9, 0, 3.0, 1.95, 1.4, 1.0], finalDrive: 3.9, massKg: 66, shiftCooldown: 0.4, hasTorqueConverter: true, cats: ['city', 'retro', 'suv', 'van', 'muscle'], weight: 6, efficiency: 0.88 },
  { id: 'trn_at5', nameRu: 'АКПП 5-ступ', kind: 'AT', ratios: [-3.1, 0, 3.2, 2.05, 1.42, 1.0, 0.75], finalDrive: 3.7, massKg: 70, shiftCooldown: 0.35, hasTorqueConverter: true, cats: ['city', 'suv', 'luxury', 'van', 'muscle', 'offroad'], weight: 6, efficiency: 0.9 },
  { id: 'trn_at6', nameRu: 'АКПП 6-ступ (Tip)', kind: 'AT', ratios: [-3.2, 0, 4.7, 2.9, 2.0, 1.45, 1.0, 0.8], finalDrive: 3.9, massKg: 74, shiftCooldown: 0.32, hasTorqueConverter: true, cats: ['city', 'suv', 'luxury', 'van', 'offroad', 'emergency', 'muscle'], weight: 8, efficiency: 0.91 },
  { id: 'trn_at7', nameRu: 'АКПП 7-ступ (7G-Tronic)', kind: 'AT', ratios: [-3.15, 0, 4.5, 3.0, 2.2, 1.68, 1.28, 1.0, 0.82], finalDrive: 3.4, massKg: 78, shiftCooldown: 0.3, hasTorqueConverter: true, cats: ['luxury', 'suv'], weight: 4, efficiency: 0.92 },
  { id: 'trn_at8', nameRu: 'АКПП 8-ступ ZF 8HP', kind: 'AT', ratios: [-2.7, 0, 5.0, 3.2, 2.15, 1.72, 1.35, 1.0, 0.85, 0.66], finalDrive: 3.1, massKg: 80, shiftCooldown: 0.25, hasTorqueConverter: true, cats: ['luxury', 'sport', 'emergency', 'suv', 'offroad'], weight: 5, efficiency: 0.93 },
  { id: 'trn_at10', nameRu: 'АКПП 10-ступ (со-инжиниринг)', kind: 'AT', ratios: [-2.4, 0, 4.7, 3.1, 2.3, 1.75, 1.4, 1.15, 1.0, 0.87, 0.74, 0.63], finalDrive: 3.1, massKg: 82, shiftCooldown: 0.22, hasTorqueConverter: true, cats: ['muscle', 'sport', 'luxury'], weight: 3, efficiency: 0.93 },
  { id: 'trn_at6_truck', nameRu: 'АКПП 6-ступ Heavy-Duty (Advance)', kind: 'AT', ratios: [-3.4, 0, 3.6, 2.35, 1.65, 1.2, 1.0, 0.8], finalDrive: 4.9, massKg: 130, shiftCooldown: 0.4, hasTorqueConverter: true, cats: ['truck', 'heavy', 'bus', 'offroad', 'emergency'], weight: 4, efficiency: 0.88 },
  // ---- Тн - DSG (dual clutch, instant shifts) ----
  { id: 'trn_dsg6', nameRu: 'DSG 6-ступ (dual wet clutch)', kind: 'DSG', ratios: [-2.9, 0, 3.3, 2.1, 1.45, 1.05, 0.85], finalDrive: 3.9, massKg: 62, shiftCooldown: 0.12, cats: ['city', 'sport', 'suv'], weight: 4, efficiency: 0.95 },
  { id: 'trn_dsg7', nameRu: 'DSG 7-ступ (dry clutch DQ200)', kind: 'DSG', ratios: [-2.9, 0, 3.7, 2.4, 1.55, 1.16, 0.9, 0.74], finalDrive: 3.6, massKg: 60, shiftCooldown: 0.11, cats: ['city', 'sport', 'suv', 'luxury'], weight: 4, efficiency: 0.96 },
  { id: 'trn_dsg8_sport', nameRu: 'DSG 8-ступ PDK Спорт', kind: 'DSG', ratios: [-2.5, 0, 3.9, 2.5, 1.9, 1.5, 1.2, 1.0, 0.86, 0.72], finalDrive: 3.7, massKg: 70, shiftCooldown: 0.09, cats: ['sport', 'luxury'], weight: 2, efficiency: 0.96 },
  // ---- Вариатор CVT (бесступенчатый клиноремённый) ----
  { id: 'trn_cvt_econ', nameRu: 'Вариатор CVT (Eco-режим, симуляция 6-ступ)', kind: 'CVT', ratios: [-3.4, 0, 2.95, 1.72, 1.0], finalDrive: 3.9, massKg: 58, cats: ['city', 'suv'], weight: 6, efficiency: 0.91, note: 'Мотор держит обороты в зоне максимальной тяги, передач бесконечно много' },
  { id: 'trn_cvt_sport', nameRu: 'Вариатор CVT Xtronic Sport (виртуальные ступени)', kind: 'CVT', ratios: [-3.2, 0, 2.75, 1.62, 1.0], finalDrive: 3.6, massKg: 60, cats: ['sport', 'suv'], weight: 3, efficiency: 0.92 },
  // ---- Гидростатика для спецтехники (ГСТ) ----
  { id: 'trn_hydro_2r', nameRu: 'ГСТ Гидростатическая 2-диапазонная', kind: 'HYDRO', ratios: [-3.6, 0, 5.2, 2.0], finalDrive: 6.2, massKg: 90, cats: ['machinery'], weight: 10, efficiency: 0.83, note: 'Гидростатический привод до 5/14 км/h, рабочий/транспортный режим' },
  // ---- Грузовые и тракторные диапазонные (делитель) ----
  { id: 'trn_range_cam6', nameRu: 'РД МКПП 6-ступ с делителем', kind: 'RANGE', ratios: [-4.5, 0, 4.8, 3.1, 2.0, 1.42, 1.0, 0.75], finalDrive: 4.8, massKg: 190, isManualYesNo: true, divider: 'divider', cats: ['truck', 'heavy', 'bus', 'offroad', 'emergency'], weight: 8, efficiency: 0.9, note: '6 передач × 2 делителя | понижающий [LO] умножает тягу' },
  { id: 'trn_range_9_semi', nameRu: 'РД МКПП 9-ступ (дальнобой)', kind: 'RANGE', ratios: [-9.6, 0, 9.1, 6.6, 4.9, 3.7, 2.9, 2.25, 1.8, 1.45, 1.18, 1.0], finalDrive: 3.9, massKg: 260, isManualYesNo: true, divider: 'divider', cats: ['truck', 'heavy'], weight: 4, efficiency: 0.92, note: '9 передач × делитель тягового диапазона' },
  { id: 'trn_range_tr', nameRu: 'Тракторная КПП 9FD + понижающий ряд', kind: 'RANGE', ratios: [-4.5, 0, 5.5, 4.3, 3.3, 2.5, 1.9, 1.4, 1.0, 0.8, 0.65], finalDrive: 5.4, massKg: 210, isManualYesNo: true, divider: 'tractor_range', cats: ['tractor'], weight: 10, efficiency: 0.89, note: '9 передач × 2 тракторных ряда (1/2) = 18 передач' },
  // ---- Мото ----
  { id: 'trn_moto4', nameRu: 'МотоКПП 4-ступ (советская)', kind: 'MT', ratios: [-2.8, 0, 2.85, 1.95, 1.45, 1.15], finalDrive: 4.6, massKg: 12, isManualYesNo: true, cats: ['moto'], weight: 7, efficiency: 0.94 },
  { id: 'trn_moto5', nameRu: 'МотоКПП 5-ступ', kind: 'MT', ratios: [-2.8, 0, 2.7, 1.85, 1.35, 1.05, 0.85], finalDrive: 4.4, massKg: 13, isManualYesNo: true, cats: ['moto'], weight: 8, efficiency: 0.95 },
  { id: 'trn_moto6', nameRu: 'МотоКПП 6-ступ (суперспорт)', kind: 'MT', ratios: [-2.8, 0, 2.6, 1.9, 1.5, 1.2, 1.0, 0.86], finalDrive: 4.2, massKg: 14, isManualYesNo: true, cats: ['moto'], weight: 4, efficiency: 0.96 },
  { id: 'trn_moped3', nameRu: 'МотоКПП 3-ступ (мопед)', kind: 'MT', ratios: [-3.0, 0, 3.2, 1.8, 1.1], finalDrive: 4.8, massKg: 8, isManualYesNo: true, cats: ['moped'], weight: 10, efficiency: 0.93 }
];

// ============================================================================
// ECU TUNES / FIRMWARES (ПРОШИВКИ ЭБУ)
// ============================================================================

export interface TuneDef {
  id: string;
  nameRu: string;
  powerMult: number;          // torque & power factor
  redlineMult: number;        // RPM governor extension
  consumptionMult: number;
  minOctane: number;          // required minimum octane (detection: lower = knock)
  knockRisk: number;          // 0..1 extra detonation probability at full load
  heatMult: number;           // engine thermal load
  rpmResponseMult: number;
  requiresTurbo?: boolean;
  isDieselTune?: boolean;
  chipLevel: number;          // 0 = stock, 1 = eco/sport, 2 = aggressive
  cats?: PwCategory[];
  weight: number;
  note?: string;
}

export const TUNE_VARIANTS: TuneDef[] = [
  { id: 'tune_stock', nameRu: 'Сток (заводская прошивка)', powerMult: 1.0, redlineMult: 1.0, consumptionMult: 1.0, minOctane: 0, knockRisk: 0, heatMult: 1.0, rpmResponseMult: 1.0, chipLevel: 0, weight: 50, note: 'Заводская калибровка ЭБУ' },
  { id: 'tune_eco_92', nameRu: 'Эконом 92-й (дефорс)', powerMult: 0.9, redlineMult: 0.95, consumptionMult: 0.86, minOctane: 92, knockRisk: 0, heatMult: 0.95, rpmResponseMult: 0.95, chipLevel: 1, cats: ['city', 'retro', 'van'], weight: 8, note: 'Дешёвый 92-й, экономичная калибровка' },
  { id: 'tune_eco_city', nameRu: 'Эко-прошивка Город', powerMult: 0.92, redlineMult: 0.94, consumptionMult: 0.88, minOctane: 92, knockRisk: 0, heatMult: 0.96, rpmResponseMult: 0.97, chipLevel: 1, cats: ['city', 'van', 'suv'], weight: 6 },
  { id: 'tune_taxi_limiter', nameRu: 'Такси с ограничителем', powerMult: 0.95, redlineMult: 0.9, consumptionMult: 0.9, minOctane: 92, knockRisk: 0, heatMult: 0.95, rpmResponseMult: 0.95, chipLevel: 1, cats: ['city', 'retro', 'emergency'], weight: 4, note: 'Флот-прошивка таксопарка: отсечка ниже, расход умеренный' },
  { id: 'tune_police_recal', nameRu: 'Полицейская калибровка', powerMult: 1.1, redlineMult: 1.04, consumptionMult: 1.06, minOctane: 95, knockRisk: 0.05, heatMult: 1.04, rpmResponseMult: 1.08, chipLevel: 2, cats: ['emergency'], weight: 30, note: 'Стандартная спецкалибровка для патрульных' },
  { id: 'tune_sport_flow', nameRu: 'Спорт-прошивка Flow', powerMult: 1.12, redlineMult: 1.06, consumptionMult: 1.1, minOctane: 95, knockRisk: 0.2, heatMult: 1.07, rpmResponseMult: 1.1, chipLevel: 2, cats: ['sport', 'muscle'], weight: 14, note: 'Спортивная смесь зажигания, отсечка выше' },
  { id: 'tune_stage1', nameRu: 'Stage 1 (первая прошивка)', powerMult: 1.2, redlineMult: 1.07, consumptionMult: 1.14, minOctane: 95, knockRisk: 0.35, heatMult: 1.1, rpmResponseMult: 1.12, chipLevel: 2, cats: ['sport', 'city', 'suv', 'muscle', 'van'], weight: 5, note: 'Классический Stage 1: +12-20% тяги, нужен 95-й' },
  { id: 'tune_stage2', nameRu: 'Stage 2 (агрессивный)', powerMult: 1.3, redlineMult: 1.1, consumptionMult: 1.24, minOctane: 98, knockRisk: 0.6, heatMult: 1.18, rpmResponseMult: 1.15, chipLevel: 2, requiresTurbo: true, cats: ['sport', 'muscle', 'luxury'], weight: 3, note: 'Только для турбомоторов, требует 98-й; риск перегрева' },
  { id: 'tune_diesel_eco', nameRu: 'Дизель-Eco Map (ТНВД)', powerMult: 0.94, redlineMult: 0.95, consumptionMult: 0.84, minOctane: 0, knockRisk: 0, heatMult: 0.96, rpmResponseMult: 0.97, isDieselTune: true, chipLevel: 1, weight: 6, note: 'Экономичная калибровка ТНВД' },
  { id: 'tune_diesel_power', nameRu: 'Дизель-Power Map (трак/карьер)', powerMult: 1.18, redlineMult: 1.05, consumptionMult: 1.16, minOctane: 0, knockRisk: 0, heatMult: 1.1, rpmResponseMult: 1.05, isDieselTune: true, chipLevel: 2, cats: ['truck', 'heavy', 'tractor', 'machinery'], weight: 5, note: 'Мощностная прошивка ТНВД: больше дыма и тяги' },
  { id: 'tune_agricultural', nameRu: 'Заводская Агро (ТНВД избыт.)', powerMult: 1.0, redlineMult: 1.0, consumptionMult: 0.93, minOctane: 0, knockRisk: 0, heatMult: 0.98, rpmResponseMult: 0.98, isDieselTune: true, chipLevel: 0, cats: ['tractor', 'machinery'], weight: 20 }
];

// ============================================================================
// TIRE SETS (КОМПЛЕКТЫ ШИН)
// ============================================================================

export interface TireSetDef {
  id: string;
  nameRu: string;
  gripMult: number;        // dry asphalt grip factor
  wetGripMult: number;     // multiplier when surface is wet
  iceGripMult: number;     // multiplier on ice/snow-patched surface
  rollingMult: number;     // rolling resistance multiplier
  driftGripMult: number;   // handbrake/drift lateral grip
  topSpeedMult: number;    // tire speed rating influence on top speed
  massKg: number;          // weight of full set
  isStudded?: boolean;
  isOffroad?: boolean;
  isSemiSlick?: boolean;
  cats?: PwCategory[];     // restriction; undefined = universal
  weight: number;
  note?: string;
}

export const TIRE_SETS: TireSetDef[] = [
  // Летние
  { id: 'tir_summer_econ', nameRu: 'Летние Бюджет (эконом)', gripMult: 0.93, wetGripMult: 0.88, iceGripMult: 0.7, rollingMult: 1.03, driftGripMult: 0.9, topSpeedMult: 0.98, massKg: 29, weight: 10, note: 'Жёсткая смесевая резина, слабое мокрое сцепление' },
  { id: 'tir_summer_city', nameRu: 'Летние Шоссейные (городские)', gripMult: 1.0, wetGripMult: 0.97, iceGripMult: 0.78, rollingMult: 1.0, driftGripMult: 1.0, topSpeedMult: 1.0, massKg: 34, weight: 18 },
  { id: 'tir_summer_comfort', nameRu: 'Летние Комфорт (тихие)', gripMult: 0.97, wetGripMult: 0.99, iceGripMult: 0.76, rollingMult: 0.97, driftGripMult: 0.95, topSpeedMult: 1.0, massKg: 36, weight: 8, note: 'Мягкие, тихие, с меньшим сопротивлением качению' },
  { id: 'tir_summer_uhp', nameRu: 'Летние UHP Высокие скорости', gripMult: 1.09, wetGripMult: 1.03, iceGripMult: 0.8, rollingMult: 1.06, driftGripMult: 1.08, topSpeedMult: 1.02, massKg: 42, weight: 6 },
  { id: 'tir_summer_semi_slick', nameRu: 'Полуслики Track-Day', gripMult: 1.17, wetGripMult: 0.94, iceGripMult: 0.68, rollingMult: 1.11, driftGripMult: 1.16, topSpeedMult: 1.03, massKg: 46, weight: 3, isSemiSlick: true, note: 'Гоночный состав: липкая резина, но не для дождя и льда' },
  // Зимние
  { id: 'tir_winter_friction', nameRu: 'Зимние Фрикционные (Velcro)', gripMult: 0.94, wetGripMult: 1.04, iceGripMult: 1.15, rollingMult: 1.07, driftGripMult: 0.98, topSpeedMult: 0.96, massKg: 38, weight: 10, note: 'Годны на морозе, на асфальте подвывают' },
  { id: 'tir_winter_studded', nameRu: 'Зимние Шипованные', gripMult: 0.9, wetGripMult: 1.0, iceGripMult: 1.4, rollingMult: 1.08, driftGripMult: 0.92, topSpeedMult: 0.94, massKg: 42, weight: 8, isStudded: true, note: 'Шипы: уверенный лед, шум на асфальте' },
  { id: 'tir_allseason', nameRu: 'Всесезонные', gripMult: 0.96, wetGripMult: 0.95, iceGripMult: 0.94, rollingMult: 1.0, driftGripMult: 0.97, topSpeedMult: 0.99, massKg: 35, weight: 6, note: 'Компромисс между сезонами' },
  // Внедорожные
  { id: 'tir_allterrain', nameRu: 'AT All-Terrain', gripMult: 0.93, wetGripMult: 0.99, iceGripMult: 1.05, rollingMult: 1.09, driftGripMult: 0.95, topSpeedMult: 0.98, massKg: 58, weight: 6, isOffroad: true },
  { id: 'tir_mud', nameRu: 'MT Mud-Terrain (грязевые)', gripMult: 0.85, wetGripMult: 0.93, iceGripMult: 0.94, rollingMult: 1.14, driftGripMult: 0.9, topSpeedMult: 0.94, massKg: 66, weight: 3, isOffroad: true, note: 'Крупные грунтозацепы: асфальт гудит и грызёт канавки' },
  // Ретро
  { id: 'tir_retro_diagonal', nameRu: 'Диагональные (ретро)', gripMult: 0.82, wetGripMult: 0.8, iceGripMult: 0.7, rollingMult: 0.97, driftGripMult: 0.88, topSpeedMult: 0.95, massKg: 28, weight: 8, note: 'Старая диагональная конструкция: расплывчатый руль' },
  // Грузовые
  { id: 'tir_truck_highway', nameRu: 'Грузовые Магистральные (H)', gripMult: 0.96, wetGripMult: 0.92, iceGripMult: 0.75, rollingMult: 0.96, driftGripMult: 0.95, topSpeedMult: 1.0, massKg: 190, cats: ['truck', 'heavy', 'bus'], weight: 10 },
  { id: 'tir_truck_allpos', nameRu: 'Грузовые Всесезонные', gripMult: 0.94, wetGripMult: 0.96, iceGripMult: 0.85, rollingMult: 0.99, driftGripMult: 0.94, topSpeedMult: 0.99, massKg: 190, cats: ['truck', 'heavy', 'bus', 'offroad'], weight: 6 },
  // Тракторные
  { id: 'tir_agro_r1', nameRu: 'Агрошины R1 (задний привод)', gripMult: 0.88, wetGripMult: 0.9, iceGripMult: 1.0, rollingMult: 0.92, driftGripMult: 0.9, topSpeedMult: 0.9, massKg: 240, cats: ['tractor'], weight: 10, note: 'Глубокие грунтозацепы для пашни' },
  // Мото
  { id: 'tir_moto_sport', nameRu: 'Мотов покрышки Sport', gripMult: 1.12, wetGripMult: 0.9, iceGripMult: 0.6, rollingMult: 1.05, driftGripMult: 1.12, topSpeedMult: 1.03, massKg: 9, cats: ['moto'], weight: 6 },
  { id: 'tir_moto_tour', nameRu: 'Мотов покрышки Touring', gripMult: 1.0, wetGripMult: 0.97, iceGripMult: 0.72, rollingMult: 1.0, driftGripMult: 1.0, topSpeedMult: 1.0, massKg: 10, cats: ['moto'], weight: 8 },
  { id: 'tir_moped_mini', nameRu: 'Мопедные Мини', gripMult: 0.88, wetGripMult: 0.85, iceGripMult: 0.65, rollingMult: 1.0, driftGripMult: 0.9, topSpeedMult: 0.96, massKg: 4, cats: ['moped'], weight: 10 }
];

// ============================================================================
// WEIGHTED RANDOM SELECTION
// ============================================================================

function pickWeighted<T extends { weight: number; cats?: PwCategory[] | undefined }>(
  pool: T[],
  cat: PwCategory,
  fallbackCatOverride?: PwCategory
): T {
  const matching = pool.filter((e) => !e.cats || e.cats.includes(cat) || (fallbackCatOverride && e.cats.includes(fallbackCatOverride)));
  const list = matching.length > 0 ? matching : pool.filter((e) => !e.cats || e.cats.length === 0);
  const finalList = list.length > 0 ? list : pool;
  let total = 0;
  for (const e of finalList) total += e.weight;
  let r = Math.random() * total;
  for (const e of finalList) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return finalList[finalList.length - 1];
}

export interface PowertrainPick {
  engine: EngineVariantDef;
  transmission: TransmissionDef;
  tune: TuneDef;
  tires: TireSetDef;
  turboKit: TurboSpecDef | null;
  turboIsAftermarket: boolean;
}

export function pickPowertrain(type: CarType | string | undefined): PowertrainPick {
  const cat = getVehiclePowertrainCategory(type);
  const tstr = (type || 'sedan') as string;

  // --- Engine ---
  let engine: EngineVariantDef;
  if (cat === 'machinery') {
    engine = ENGINE_VARIANTS.find(e => e.id === 'eng_hydro_d244')!;
  } else {
    let poolCat = cat;
    if (cat === 'retro' && (tstr === 'micro_car' || tstr === 'retro_bubble')) poolCat = 'retro';
    engine = pickWeighted(ENGINE_VARIANTS, poolCat, cat === 'city' ? 'retro' : undefined);
  }

  // --- Transmission ---
  let transmission: TransmissionDef;
  if (cat === 'machinery') {
    transmission = TRANSMISSION_VARIANTS.find(t => t.id === 'trn_hydro_2r')!;
  } else {
    transmission = pickWeighted(TRANSMISSION_VARIANTS, cat);
  }

  // --- Tune ---
  let tune: TuneDef;
  if (cat === 'machinery') {
    tune = TUNE_VARIANTS.find(t => t.id === 'tune_agricultural')!;
  } else if (cat === 'tractor') {
    tune = pickWeighted(TUNE_VARIANTS, 'tractor', undefined);
  } else {
    const tunePool = TUNE_VARIANTS.filter(t => {
      if (engine.fuel === 'diesel' && t.isDieselTune) return true;
      if (engine.fuel !== 'diesel' && (t.isDieselTune || t.id === 'tune_agricultural')) return false;
      if (t.requiresTurbo && !(engine.turbo && engine.turbo.boostMax > 0)) return false;
      return true;
    });
    tune = pickWeighted(tunePool, cat);
  }

  // --- Tires ---
  const tires = pickWeighted(TIRE_SETS, cat);

  // --- Turbo kit (aftermarket only for N/A petrol engines with slim chance) ---
  let turboKit: TurboSpecDef | null = engine.turbo || null;
  let turboIsAftermarket = false;
  if (!turboKit && engine.fuel !== 'diesel' && (cat === 'city' || cat === 'sport') && engine.lpgCompatible) {
    if (Math.random() < 0.06) {
      turboKit = TURBO_KITS[1];
      turboIsAftermarket = true;
    }
  }

  return { engine, transmission, tune, tires, turboKit, turboIsAftermarket };
}

export function getPowertrainPickByIds(ids: { engineId?: string; transmissionId?: string; tuneId?: string; tireSetId?: string; turboKitId?: string }): PowertrainPick | null {
  const engine = ids.engineId ? ENGINE_VARIANTS.find(e => e.id === ids.engineId) : null;
  const transmission = ids.transmissionId ? TRANSMISSION_VARIANTS.find(t => t.id === ids.transmissionId) : null;
  const tune = ids.tuneId ? TUNE_VARIANTS.find(t => t.id === ids.tuneId) : null;
  const tires = ids.tireSetId ? TIRE_SETS.find(t => t.id === ids.tireSetId) : null;
  const turboKit = ids.turboKitId ? TURBO_KITS.find(t => t.id === ids.turboKitId) || null : null;
  if (!engine || !transmission || !tune || !tires) return null;
  return { engine, transmission, tune, tires, turboKit, turboIsAftermarket: false };
}

/**
 * Compose a powertrain pick from a user configurator selection.
 * Unspecified parts stay random (weighted per vehicle category), specified parts
 * are forced even with a partial selection. Handles the turbo cascade:
 * a factory-boosted engine always keeps its stock turbo unless the user picked none,
 * and a 'requiresTurbo' firmware silently falls back to stock without a turbo.
 */
export function buildPowertrainPick(
  type: CarType | string | undefined,
  sel?: { engineId?: string; transmissionId?: string; tuneId?: string; tireSetId?: string; turboKitId?: string }
): PowertrainPick {
  const pick = pickPowertrain(type);
  if (!sel) return pick;

  const engine = (sel.engineId && ENGINE_VARIANTS.find(e => e.id === sel.engineId)) || pick.engine;
  const transmission = (sel.transmissionId && TRANSMISSION_VARIANTS.find(t => t.id === sel.transmissionId)) || pick.transmission;
  let tires = (sel.tireSetId && TIRE_SETS.find(t => t.id === sel.tireSetId)) || pick.tires;
  let tune = (sel.tuneId && TUNE_VARIANTS.find(t => t.id === sel.tuneId)) || pick.tune;

  // Turbo cascade: factory turbo wins; explicit kit only for non-factory engines
  let turboKit: TurboSpecDef | null;
  let turboIsAftermarket: boolean;
  if (engine.turbo) {
    turboKit = engine.turbo;
    turboIsAftermarket = false;
  } else if (sel.turboKitId && sel.turboKitId !== 'trb_none') {
    turboKit = TURBO_KITS.find(k => k.id === sel.turboKitId) || null;
    turboIsAftermarket = !!turboKit;
  } else {
    turboKit = null;
  }

  // Firmware compatibility guard: Stage-requires-turbo map without a physical turbo
  if (tune.requiresTurbo && !(turboKit && turboKit.boostMax > 0)) {
    tune = TUNE_VARIANTS.find(t => t.id === 'tune_stock')!;
  }
  // Diesel firmware on a petrol engine is meaningless
  if ((tune.isDieselTune && engine.fuel !== 'diesel') || (!tune.isDieselTune && (tune.id === 'tune_diesel_eco' || tune.id === 'tune_diesel_power'))) {
    tune = TUNE_VARIANTS.find(t => t.id === 'tune_stock')!;
  }
  // Agro tires on a passenger car fall back if not matched (persona choice is kept, but truck tires on a sedan are too extreme)
  if (tires.cats && tires.cats.includes('tractor') && getVehiclePowertrainCategory(type) !== 'tractor') {
    tires = TIRE_SETS.find(t => t.id === 'tir_summer_city')!;
  }

  return { engine, transmission, tune, tires, turboKit, turboIsAftermarket };
}

// ============================================================================
// APPLY POWERTRAIN TO A FULLY-CONSTRUCTED VEHICLE
// ============================================================================

export function applyPowertrain(veh: Vehicle, forcedPick?: PowertrainPick): void {
  if (!veh || veh.isTrailer || (veh.type as string).startsWith('trailer_')) return;

  const pick = forcedPick || pickPowertrain(veh.type);
  const eng = veh.engineState;
  if (!eng || isTrailerLikeEngine(eng)) return;

  const { engine, transmission, tune, tires, turboKit, turboIsAftermarket } = pick;
  const isDiesel = engine.fuel === 'diesel';
  const machinery = getVehiclePowertrainCategory(veh.type) === 'machinery';

  // --- Store variant IDs for save/load consistency ---
  eng.engineId = engine.id;
  eng.transmissionId = transmission.id;
  eng.tuneId = tune.id;
  eng.tireSetId = tires.id;
  eng.turboKitId = turboKit ? turboKit.id : 'trb_none';
  eng.transmissionKind = transmission.kind;   // MT / AT / DSG / AMT / CVT / HYDRO / RANGE
  eng.transmissionEfficiency = transmission.efficiency;

  // --- Transmission type (compatibility with existing engine model) ---
  eng.transmissionType = (transmission.kind === 'MT' || transmission.kind === 'RANGE') ? 'MANUAL' : 'AUTO';
  if (machinery) eng.transmissionType = 'AUTO';
  if (eng.transmissionType === 'AUTO') {
    eng.autoGearMode = veh.isParked ? 'P' : 'D';
  } else {
    eng.autoGearMode = undefined;
  }

  // --- Gear ratios & final drive ---
  eng.gearRatios = transmission.ratios.slice();
  eng.finalDriveRatio = transmission.finalDrive;
  if (eng.currentGear > eng.gearRatios.length - 2) eng.currentGear = eng.gearRatios.length - 2;

  // Clutch devices
  if (transmission.divider === 'divider') eng.hasTransferCase = true;
  if (transmission.divider === 'tractor_range') {
    eng.hasTransferCase = false;
    eng.tractorRange = eng.tractorRange || 1;
  }

  // --- RPM bands with tune extensions ---
  eng.idleRPM = engine.idleRPM;
  eng.redlineRPM = Math.round(engine.redlineRPM * tune.redlineMult);
  eng.maxRPMLimit = Math.round(engine.maxRPM * Math.max(1.0, tune.redlineMult));

  // --- Power / consumption / heat overlays ---
  eng.powerMult = engine.powerMult * tune.powerMult;
  eng.consumptionMult = engine.consumptionMult * tune.consumptionMult;
  eng.heatMult = engine.heatMult * tune.heatMult;
  eng.rpmResponseMult = engine.rpmResponseMult * tune.rpmResponseMult;
  eng.minOctaneRequirement = engine.fuel === 'diesel' ? 0 : Math.max(
    engine.fuel === 'ai98' ? 98 : engine.fuel === 'ai100' ? 100 : engine.fuel === 'ai95' ? 95 : 92,
    tune.minOctane
  );
  eng.knockRisk = tune.knockRisk;
  eng.chipLevel = tune.chipLevel;

  // --- Turbo spec + dynamic boost state ---
  if (turboKit && turboKit.boostMax > 0) {
    eng.turboSpec = {
      id: turboKit.id,
      nameRu: turboKit.nameRu,
      boostMax: turboKit.boostMax,
      spoolRPM: turboKit.spoolRPM,
      lagRate: turboKit.lagRate,
      isSupercharged: turboKit.isSupercharged,
      isTwin: turboKit.isTwin
    };
    eng.turboBoost = 0;
  } else {
    eng.turboSpec = null;
    eng.turboBoost = 0;
  }

  // --- Tire characteristics ---
  eng.tireGripMult = tires.gripMult;
  eng.tireWetGripMult = tires.wetGripMult;
  eng.tireIceGripMult = tires.iceGripMult;
  eng.tireRollingMult = tires.rollingMult;
  eng.tireTopSpeedMult = tires.topSpeedMult;
  eng.tireStudded = !!tires.isStudded;
  eng.tireOffroad = !!tires.isOffroad;

  // --- Required fuel & fuel system alignment ---
  veh.requiredFuel = engine.fuel as any;
  if (veh.fuelSystem) {
    const fs = veh.fuelSystem;
    fs.fuelType = engine.fuel;
    if (isDiesel) {
      fs.octaneNumber = 45;
      fs.detonation = false;
    } else {
      // Fresh tank filled with the grade the engine & firmware require
      fs.octaneNumber = eng.minOctaneRequirement || 92;
    }
  }

  // --- Mass bonus (engine + transmission + turbo + tires) ---
  const baseMass = veh.mass - (veh.massBonusKg || 0);
  const turboMass = turboKit ? turboKit.massKg : 0;
  const massBonus = engine.massKg + transmission.massKg + tires.massKg + turboMass;
  veh.massBonusKg = Math.round(massBonus);
  veh.mass = Math.round(baseMass + massBonus);

  // --- Chip tuning flag for compatibility with existing systems ---
  if (tune.chipLevel >= 2) {
    veh.hasChiptuning = true;
  }

  // --- LPG compatibility guard ---
  if (!engine.lpgCompatible && veh.hasGBO) {
    veh.hasGBO = false;
  }

  // Reference pick description for UI
  veh.powertrainLabel = describePowertrain(veh, pick);
}

function isTrailerLikeEngine(eng: EngineState): boolean {
  return !eng || (eng.gearRatios.length === 1 && eng.gearRatios[0] === 0 && !eng.hasTransferCase && !eng.engineRunning && eng.currentGear === 0);
}

export function describePowertrain(veh: Vehicle, pick?: PowertrainPick): string {
  const eng = veh?.engineState as any;
  const p = pick || getPowertrainPickByIds(eng
    ? {
        engineId: eng.engineId,
        transmissionId: eng.transmissionId,
        tuneId: eng.tuneId,
        tireSetId: eng.tireSetId,
        turboKitId: eng.turboKitId
      }
    : {});
  if (!p) return '';
  const parts: string[] = [];
  parts.push(`Двигатель: ${p.engine.nameRu}`);
  parts.push(`КПП: ${p.transmission.nameRu}`);
  if (p.turboKit && p.turboKit.id !== 'trb_none') {
    parts.push(`Наддув: ${p.turboKit.nameRu}${p.turboIsAftermarket ? ' (колхоз-доп)' : ''}`);
  }
  parts.push(`Прошивка: ${p.tune.nameRu}`);
  parts.push(`Шины: ${p.tires.nameRu}`);
  return parts.join(' | ');
}

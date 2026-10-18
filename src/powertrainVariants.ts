/**
 * POWERTRAIN VARIANTS SYSTEM
 * РћР±С€РёСЂРЅС‹Рµ РЅР°Р±РѕСЂС‹ РґРІРёРіР°С‚РµР»РµР№, РљРџРџ, РїСЂРѕС€РёРІРѕРє Р­Р‘РЈ, РєРѕРјРїР»РµРєС‚РѕРІ С€РёРЅ Рё С‚СѓСЂР±РѕРЅР°РіРЅРµС‚Р°С‚РµР»РµР№.
 * РљР°Р¶РґС‹Р№ РІР°СЂРёР°РЅС‚ СЂРµР°Р»СЊРЅРѕ РІР»РёСЏРµС‚ РЅР° РїРѕРІРµРґРµРЅРёРµ Р°РІС‚РѕРјРѕР±РёР»СЏ:
 *  - С‚РёРї С‚РѕРїР»РёРІР° / РѕРєС‚Р°РЅРѕРІРѕРµ С‡РёСЃР»Рѕ (requiredFuel, fuelSystem)
 *  - РїРµСЂРµРґР°С‚РѕС‡РЅС‹Рµ С‡РёСЃР»Р°, РєРѕР»РёС‡РµСЃС‚РІРѕ РїРµСЂРµРґР°С‡, РіР»Р°РІРЅР°СЏ РїР°СЂР° (gearRatios, finalDriveRatio)
 *  - С‚РёРї РєРѕСЂРѕР±РєРё: РњРљРџРџ / РђРљРџРџ / Р РљРџРџ (СЂРѕР±РѕС‚) / DSG / РІР°СЂРёР°С‚РѕСЂ CVT / Р“РЎРў / РґРёР°РїР°Р·РѕРЅРЅР°СЏ СЃ РґРµР»РёС‚РµР»РµРј
 *  - РјР°СЃСЃР° (РјР°СЃСЃР° РґРІРёРіР°С‚РµР»СЏ, РљРџРџ, С‚СѓСЂР±Рѕ-РєРѕРјРїР»РµРєС‚Р°, РєРѕРјРїР»РµРєС‚ С€РёРЅ)
 *  - СЃС†РµРїР»РµРЅРёРµ: РѕС‚СЃСЂРѕС‡РєР° РІРєР»СЋС‡РµРЅРёСЏ, РёР·РЅРѕСЃ, РїРµСЂРµРіСЂРµРІ
 *  - РґРёРЅР°РјРёРєР°: РєСЂРёРІР°СЏ РјРѕС‰РЅРѕСЃС‚Рё, РѕР±РѕСЂРѕС‚РёСЃС‚РѕСЃС‚СЊ, РѕС‚СЃРµС‡РєР°, РїРѕС‚СЂРµР±Р»РµРЅРёРµ С‚РѕРїР»РёРІР°
 *  - С‚СѓСЂР±Рѕ: СЃРїСѓР», Р»Р°Рі, РЅР°РґРґСѓРІ (СЂРµР°Р»СЊРЅРѕ РґРѕР±Р°РІР»СЏРµС‚ С‚СЏРіСѓ Рё СЂР°СЃС…РѕРґ)
 *  - С€РёРЅС‹: СЃС†РµРїР»РµРЅРёРµ (СЃСѓС…Рѕ/РјРѕРєСЂРѕ/Р»С‘Рґ), СЃРѕРїСЂРѕС‚РёРІР»РµРЅРёРµ РєР°С‡РµРЅРёСЋ, РїСЂРµРґРµР» СЃРєРѕСЂРѕСЃС‚Рё, С€РёРїС‹
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
// ENGINE CATALOG (Р”Р’РР“РђРўР•Р›Р)
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
  { id: 'trb_none', nameRu: 'Р‘РµР· РЅР°РґРґСѓРІР° (Р°С‚РјРѕ)', boostMax: 0, spoolRPM: 0, lagRate: 0, massKg: 0 },
  { id: 'trb_t25', nameRu: 'РўСѓСЂР±РѕРєРѕРјРїСЂРµСЃСЃРѕСЂ T25 (РјР°Р»С‹Р№)', boostMax: 0.18, spoolRPM: 2600, lagRate: 3.2, massKg: 9 },
  { id: 'trb_t28', nameRu: 'РўСѓСЂР±РѕРєРѕРјРїСЂРµСЃСЃРѕСЂ T28 (СЃСЂРµРґРЅРёР№)', boostMax: 0.27, spoolRPM: 3000, lagRate: 2.4, massKg: 13 },
  { id: 'trb_t4', nameRu: 'РўСѓСЂР±РѕРєРѕРјРїСЂРµСЃСЃРѕСЂ T4 (Р±РѕР»СЊС€РѕР№)', boostMax: 0.42, spoolRPM: 3400, lagRate: 1.7, massKg: 19 },
  { id: 'trb_vnt', nameRu: 'РўСѓСЂР±РёРЅР° VNT СЃ РёР·РјРµРЅСЏРµРјРѕР№ РіРµРѕРјРµС‚СЂРёРµР№', boostMax: 0.30, spoolRPM: 2100, lagRate: 2.8, massKg: 14 },
  { id: 'trb_twinturbo', nameRu: 'Biturbo (РґРІСѓС…РІР°Р»СЊРЅС‹Р№ РЅР°РґРґСѓРІ)', boostMax: 0.50, spoolRPM: 2900, lagRate: 2.2, massKg: 26, isTwin: true },
  { id: 'trb_sch', nameRu: 'РњРµС…Р°РЅРёС‡РµСЃРєРёР№ РЅР°РіРЅРµС‚Р°С‚РµР»СЊ (РєРѕРјРїСЂРµСЃСЃРѕСЂ)', boostMax: 0.30, spoolRPM: 1200, lagRate: 6.0, massKg: 28, isSupercharged: true }
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
  // ---- РЎРѕРІСЂРµРјРµРЅРЅС‹Рµ Р±РµРЅР·РёРЅРѕРІС‹Рµ (РіРѕСЂРѕРґ / РєСЂРѕСЃСЃРѕРІРµСЂС‹ / СѓРЅРёРІРµСЂСЃР°Р»С‹) ----
  { id: 'eng_08_3cil_econ', nameRu: '0.9 Р» R3 Р­РєРѕРЅРѕРј (Р°С‚РјРѕ)', fuel: 'ai92', idleRPM: 820, redlineRPM: 6300, maxRPM: 7200, powerMult: 0.78, consumptionMult: 0.78, massKg: 68, rpmResponseMult: 1.15, heatMult: 0.95, lpgCompatible: true, cats: ['city'], weight: 4, note: 'РљСЂРѕС€РµС‡РЅС‹Р№ С‚СЂС‘С…С†РёР»РёРЅРґСЂРѕРІС‹Р№ Р°С‚РјРѕСЃС„РµСЂРЅРёРє, С‚СЏРіРѕРІРёС‚ С‚РѕР»СЊРєРѕ РЅР°РІРµСЂС…Р°С…' },
  { id: 'eng_12_4cil_econ', nameRu: '1.2 Р» R4 Р­РєРѕРЅРѕРј (Р°С‚РјРѕ)', fuel: 'ai92', idleRPM: 800, redlineRPM: 6200, maxRPM: 7100, powerMult: 0.85, consumptionMult: 0.85, massKg: 82, rpmResponseMult: 1.10, heatMult: 0.97, lpgCompatible: true, cats: ['city'], weight: 8 },
  { id: 'eng_14_8v', nameRu: '1.4 Р» 8V Р‘СЋРґР¶РµС‚РЅС‹Р№ (Р°С‚РјРѕ)', fuel: 'ai92', idleRPM: 780, redlineRPM: 6000, maxRPM: 6900, powerMult: 0.92, consumptionMult: 0.9, massKg: 95, rpmResponseMult: 1.05, heatMult: 1.0, lpgCompatible: true, cats: ['city', 'van'], weight: 10 },
  { id: 'eng_14_t', nameRu: '1.4 Р» TSI 150 Р».СЃ. (С‚СѓСЂР±Рѕ)', fuel: 'ai95', idleRPM: 790, redlineRPM: 6600, maxRPM: 7600, powerMult: 1.12, consumptionMult: 0.92, massKg: 105, rpmResponseMult: 1.12, heatMult: 1.05, lpgCompatible: false, turbo: TMD, cats: ['city', 'suv'], weight: 7, note: 'РЎРѕРІСЂРµРјРµРЅРЅС‹Р№ С‚СѓСЂР±РѕРјРѕС‚РѕСЂ СЃ РЅРµРїР»РѕС…РѕР№ С‚СЏРіРѕР№ СЃРЅРёР·Сѓ' },
  { id: 'eng_16_8v', nameRu: '1.6 Р» 8V РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ (Р°С‚РјРѕ)', fuel: 'ai92', idleRPM: 800, redlineRPM: 5800, maxRPM: 6600, powerMult: 0.95, consumptionMult: 0.95, massKg: 110, rpmResponseMult: 1.0, heatMult: 1.0, lpgCompatible: true, cats: ['city', 'retro', 'van', 'suv'], weight: 14, note: 'РќР°СЂРѕРґРЅС‹Р№ РЅРёР¶РЅРµРІР°Р»СЊРЅС‹Р№ РјРѕС‚РѕСЂ, С‚СЏРіР° СЃРЅРёР·Сѓ, Р»СЋР±РёС‚ 92-Р№' },
  { id: 'eng_16_16v', nameRu: '1.6 Р» 16V РРЅР¶РµРєС‚РѕСЂ (Р°С‚РјРѕ)', fuel: 'ai95', idleRPM: 820, redlineRPM: 6400, maxRPM: 7300, powerMult: 1.04, consumptionMult: 0.94, massKg: 108, rpmResponseMult: 1.08, heatMult: 1.0, lpgCompatible: true, cats: ['city', 'suv'], weight: 10 },
  { id: 'eng_15_vtec', nameRu: '1.5 Р» 16V Р’С‹СЃРѕРєРѕРѕР±РѕСЂРѕС‚РЅС‹Р№ (Р°С‚РјРѕ)', fuel: 'ai95', idleRPM: 860, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.06, consumptionMult: 0.97, massKg: 96, rpmResponseMult: 1.2, heatMult: 1.02, lpgCompatible: false, cats: ['city', 'sport'], weight: 5, note: 'Р’РµСЂС…РѕРІС‹Р№ РјРѕС‚РѕСЂ: РїРёРє С‚СЏРіРё РЅР° РІС‹СЃРѕРєРёС… РѕР±РѕСЂРѕС‚Р°С…' },
  { id: 'eng_20_na', nameRu: '2.0 Р» R4 150 Р».СЃ. (Р°С‚РјРѕ)', fuel: 'ai95', idleRPM: 780, redlineRPM: 6300, maxRPM: 7200, powerMult: 1.10, consumptionMult: 1.05, massKg: 128, rpmResponseMult: 1.0, heatMult: 1.02, lpgCompatible: true, cats: ['city', 'suv', 'luxury', 'emergency'], weight: 8 },
  { id: 'eng_18_t', nameRu: '1.8 Р» РўСѓСЂР±Рѕ (EJ-СЃРµСЂРёСЏ)', fuel: 'ai95', idleRPM: 830, redlineRPM: 6500, maxRPM: 7600, powerMult: 1.25, consumptionMult: 1.02, massKg: 122, rpmResponseMult: 1.05, heatMult: 1.08, lpgCompatible: false, turbo: TMD, cats: ['sport', 'luxury', 'city'], weight: 4 },
  { id: 'eng_20_t', nameRu: '2.0 Р» РўСѓСЂР±Рѕ 245 Р».СЃ. (hot)', fuel: 'ai95', idleRPM: 860, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.42, consumptionMult: 1.12, massKg: 132, rpmResponseMult: 1.1, heatMult: 1.12, lpgCompatible: false, turbo: TMD, cats: ['sport', 'luxury'], weight: 4 },
  { id: 'eng_25_t5', nameRu: '2.5 Р» T5 РўРёСЃРє (С‚СѓСЂР±Рѕ)', fuel: 'ai98', idleRPM: 870, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.55, consumptionMult: 1.18, massKg: 150, rpmResponseMult: 1.05, heatMult: 1.15, lpgCompatible: false, turbo: TBI, cats: ['sport', 'luxury', 'emergency', 'suv'], weight: 2 },
  { id: 'eng_30_t6', nameRu: '3.0 Р» V6 Biturbo', fuel: 'ai98', idleRPM: 620, redlineRPM: 6900, maxRPM: 8000, powerMult: 1.62, consumptionMult: 1.25, massKg: 185, rpmResponseMult: 0.92, heatMult: 1.12, lpgCompatible: false, turbo: TTN, cats: ['luxury', 'sport', 'suv'], weight: 2 },
  { id: 'eng_42_v8', nameRu: '4.2 Р» V8 32V (Р°С‚РјРѕ)', fuel: 'ai98', idleRPM: 640, redlineRPM: 6800, maxRPM: 7800, powerMult: 1.60, consumptionMult: 1.3, massKg: 210, rpmResponseMult: 0.9, heatMult: 1.1, lpgCompatible: false, cats: ['luxury', 'muscle'], weight: 2 },
  { id: 'eng_50_sc_v8', nameRu: '5.0 Р» V8 Supercharged', fuel: 'ai98', idleRPM: 700, redlineRPM: 7100, maxRPM: 8100, powerMult: 1.88, consumptionMult: 1.45, massKg: 220, rpmResponseMult: 1.0, heatMult: 1.2, lpgCompatible: false, turbo: TSC, cats: ['muscle', 'sport', 'emergency', 'luxury'], weight: 1 },
  { id: 'eng_52_v10', nameRu: '5.2 Р» V10 FSI (Р°С‚РјРѕ)', fuel: 'ai100', idleRPM: 720, redlineRPM: 8600, maxRPM: 8800, powerMult: 1.92, consumptionMult: 1.5, massKg: 215, rpmResponseMult: 1.35, heatMult: 1.18, lpgCompatible: false, cats: ['sport'], weight: 1, note: 'РћС‚СЃРµС‡РєР° РЅР° 8600 РѕР±/РјРёРЅ вЂ” Р°С‚РјРѕСЃС„РµСЂРЅС‹Р№ РїРёРє РјР°РєСЃРёРјР°Р»СЊРЅРѕРіРѕ Р±РёРµРЅРёСЏ' },
  { id: 'eng_62_w12', nameRu: '6.2 Р» V8 РљРѕРјРїСЂРµСЃСЃРѕСЂ (Charger Edition)', fuel: 'ai98', idleRPM: 680, redlineRPM: 7000, maxRPM: 8100, powerMult: 1.95, consumptionMult: 1.55, massKg: 245, rpmResponseMult: 0.92, heatMult: 1.22, lpgCompatible: false, turbo: TSC, cats: ['sport', 'muscle'], weight: 1 },
  // ---- Р“РђР—РѕРІС‹Рµ / СЌРєРѕРЅРѕРј/ С‚Р°Рє РїСЂРёРЅР°РґР»РµР¶РЅРѕСЃС‚СЊ ----
  { id: 'eng_16_boost_95', nameRu: '1.6 Р» 16V РЎРїРѕСЂС‚РёРІРЅС‹Р№ СЂР°СЃРїСЂРµРґРІР°Р»', fuel: 'ai95', idleRPM: 850, redlineRPM: 6700, maxRPM: 7600, powerMult: 1.12, consumptionMult: 1.04, massKg: 108, rpmResponseMult: 1.15, heatMult: 1.06, lpgCompatible: true, cats: ['city', 'sport', 'retro'], weight: 3, note: 'Р Р°РЅРЅРёРµ РєРѕРІРєР°/СЃРїРѕСЂС‚-СЂР°СЃРїСЂРµРґРІР°Р»С‹' },
  // ---- Р РµС‚СЂРѕ Рё СЃРѕРІРµС‚СЃРєРёРµ РєР°СЂР±СЋСЂР°С‚РѕСЂРЅС‹Рµ ----
  { id: 'eng_11_mez', nameRu: '1.1 Р» РњРµРњР—-245 РљР°СЂР±СЋСЂР°С‚РѕСЂ', fuel: 'ai92', idleRPM: 850, redlineRPM: 5400, maxRPM: 6100, powerMult: 0.7, consumptionMult: 0.88, massKg: 88, rpmResponseMult: 1.0, heatMult: 0.92, lpgCompatible: true, cats: ['retro', 'city'], weight: 4, note: 'РђРЅРµРјРёС‡РЅС‹Р№ С‚Р°РІСЂРёС‡РµСЃРєРёР№ РјРѕС‚РѕСЂС‡РёРє' },
  { id: 'eng_12_soviet', nameRu: '1.2 Р» РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ РєР°СЂР±СЋСЂР°С‚РѕСЂ', fuel: 'ai92', idleRPM: 850, redlineRPM: 5300, maxRPM: 6100, powerMult: 0.78, consumptionMult: 0.9, massKg: 96, rpmResponseMult: 0.95, heatMult: 0.95, lpgCompatible: true, cats: ['retro'], weight: 6 },
  { id: 'eng_15_soviet', nameRu: '1.5 Р» РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ РєР°СЂР±СЋСЂР°С‚РѕСЂ (Р’РђР—)', fuel: 'ai92', idleRPM: 820, redlineRPM: 5600, maxRPM: 6400, powerMult: 0.88, consumptionMult: 0.98, massKg: 116, rpmResponseMult: 0.95, heatMult: 0.98, lpgCompatible: true, cats: ['retro', 'city'], weight: 8 },
  { id: 'eng_16_zil_v8', nameRu: '6.0 Р» V8 Р—РР›-130 РљР°СЂР±СЋСЂР°С‚РѕСЂ', fuel: 'ai92', idleRPM: 560, redlineRPM: 3200, maxRPM: 3800, powerMult: 1.05, consumptionMult: 1.35, massKg: 520, rpmResponseMult: 0.55, heatMult: 1.05, lpgCompatible: false, cats: ['retro'], weight: 1, note: 'РўСЏР¶С‘Р»С‹Р№ Р±РµРЅР·РёРЅРѕРІС‹Р№ РіСЂСѓР·РѕРІРёРє-РјРѕС‚РѕСЂ СЃ Р±РѕР»СЊС€РёРј Р·Р°РїР°СЃРѕРј С‚СЏРіРё' },
  // ---- Р›С‘РіРєРёРµ СЃРѕРІСЂРµРјРµРЅРЅС‹Рµ РґРёР·РµР»Рё ----
  { id: 'eng_19_tdi', nameRu: '1.9 Р» TDI 105 Р».СЃ. (С‚СѓСЂР±Рѕ-РґРёР·РµР»СЊ)', fuel: 'diesel', idleRPM: 820, redlineRPM: 4500, maxRPM: 5200, powerMult: 1.02, consumptionMult: 0.72, massKg: 128, rpmResponseMult: 0.9, heatMult: 1.0, lpgCompatible: false, turbo: TVN, cats: ['city', 'van', 'suv', 'retro'], weight: 8, note: 'Р­РєРѕРЅРѕРјРёС‡РЅС‹Р№ РґРёР·РµР»СЊ СЃ РѕС‚Р»РёС‡РЅРѕР№ С‚СЏРіРѕР№ РЅР° РЅРёР·Р°С…' },
  { id: 'eng_22_na_d', nameRu: '2.2 Р» Р”РёР·РµР»СЊ РђС‚РјРѕ (СЃС‚Р°СЂС‹Р№)', fuel: 'diesel', idleRPM: 740, redlineRPM: 4000, maxRPM: 4600, powerMult: 0.72, consumptionMult: 0.85, massKg: 140, rpmResponseMult: 0.75, heatMult: 0.95, lpgCompatible: false, cats: ['retro', 'van'], weight: 3 },
  { id: 'eng_24_td', nameRu: '2.4 Р» TD Р СЏРґРЅС‹Р№ (С‚СѓСЂР±Рѕ-РґРёР·РµР»СЊ)', fuel: 'diesel', idleRPM: 750, redlineRPM: 4200, maxRPM: 4800, powerMult: 1.05, consumptionMult: 0.85, massKg: 165, rpmResponseMult: 0.8, heatMult: 1.02, lpgCompatible: false, turbo: TVN, cats: ['van', 'suv', 'city'], weight: 5 },
  { id: 'eng_28_td_lux', nameRu: '2.8 Р» 24V Turbo-Diesel', fuel: 'diesel', idleRPM: 700, redlineRPM: 4400, maxRPM: 5000, powerMult: 1.18, consumptionMult: 0.9, massKg: 185, rpmResponseMult: 0.85, heatMult: 1.05, lpgCompatible: false, turbo: TVN, cats: ['suv', 'luxury', 'van', 'emergency'], weight: 4 },
  { id: 'eng_44_v8_td', nameRu: '4.4 Р» V8 Twin-Turbo Diesel', fuel: 'diesel', idleRPM: 620, redlineRPM: 4400, maxRPM: 5100, powerMult: 1.55, consumptionMult: 1.2, massKg: 245, rpmResponseMult: 0.85, heatMult: 1.12, lpgCompatible: false, turbo: TTN, cats: ['luxury', 'suv', 'sport'], weight: 1 },
  { id: 'eng_50_v8_td', nameRu: '5.0 Р» V8 TD Heavy (РўРќР’Р”)', fuel: 'diesel', idleRPM: 620, redlineRPM: 3400, maxRPM: 4000, powerMult: 1.35, consumptionMult: 1.15, massKg: 310, rpmResponseMult: 0.65, heatMult: 1.08, lpgCompatible: false, turbo: TVN, cats: ['truck', 'heavy', 'emergency'], weight: 2 },
  // ---- РЎСЂРµРґРЅРµС‚РѕРЅРЅР°Р¶РЅС‹Рµ Рё С‚СЏР¶С‘Р»С‹Рµ РґРёР·РµР»Рё ----
  { id: 'eng_yamz_236', nameRu: 'РЇРњР—-236 V6 (РўРќР’Р” 12 С†РёР»)', fuel: 'diesel', idleRPM: 620, redlineRPM: 2400, maxRPM: 2900, powerMult: 1.18, consumptionMult: 1.1, massKg: 720, rpmResponseMult: 0.5, heatMult: 1.05, lpgCompatible: false, turbo: TMD, cats: ['truck', 'heavy', 'bus'], weight: 4, note: 'РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ СЃСЂРµРґРЅРёР№ РґРёР·РµР»СЊ РіСЂСѓР·РѕРІРѕРіРѕ РєР»Р°СЃСЃР°' },
  { id: 'eng_yamz_238', nameRu: 'РЇРњР—-238 V8 (С‚СѓСЂР±Рѕ)', fuel: 'diesel', idleRPM: 600, redlineRPM: 2500, maxRPM: 3000, powerMult: 1.32, consumptionMult: 1.15, massKg: 880, rpmResponseMult: 0.48, heatMult: 1.1, lpgCompatible: false, turbo: TMD, cats: ['truck', 'heavy'], weight: 4 },
  { id: 'eng_kamaz_740', nameRu: 'РљРђРњРђР—-740 V8 (С‚СѓСЂР±Рѕ)', fuel: 'diesel', idleRPM: 590, redlineRPM: 2600, maxRPM: 3150, powerMult: 1.42, consumptionMult: 1.12, massKg: 850, rpmResponseMult: 0.5, heatMult: 1.12, lpgCompatible: false, turbo: TMD, cats: ['truck', 'heavy'], weight: 4 },
  { id: 'eng_d434_zil_petrol', nameRu: 'Р”-Petrol 4.6 Р» V8 Combined', fuel: 'diesel', idleRPM: 600, redlineRPM: 2550, maxRPM: 3000, powerMult: 1.25, consumptionMult: 1.08, massKg: 700, rpmResponseMult: 0.52, heatMult: 1.05, lpgCompatible: false, cats: ['truck'], weight: 2 },
  { id: 'eng_bus_d536', nameRu: '6-С†РёР» Р СЏРґРЅС‹Р№ РўСѓСЂР±Рѕ-Р”РёР·РµР»СЊ (Р°РІС‚РѕР±СѓСЃ)', fuel: 'diesel', idleRPM: 640, redlineRPM: 2500, maxRPM: 3000, powerMult: 1.25, consumptionMult: 0.95, massKg: 640, rpmResponseMult: 0.55, heatMult: 1.05, lpgCompatible: false, turbo: TMD, cats: ['bus', 'truck'], weight: 5 },
  { id: 'eng_hydro_d244', nameRu: 'Р”-244 4-С†РёР» Р”РёР·РµР»СЊ (СЃС‚Р°РЅС†РёСЏ Р“РЎРў)', fuel: 'diesel', idleRPM: 650, redlineRPM: 2400, maxRPM: 2900, powerMult: 1.0, consumptionMult: 0.9, massKg: 390, rpmResponseMult: 0.5, heatMult: 1.0, lpgCompatible: false, cats: ['machinery'], weight: 10 },
  // ---- РўСЂР°РєС‚РѕСЂРЅС‹Рµ ----
  { id: 'eng_d243_mtz', nameRu: 'Р”-243 РњРњР— (4 С†РёР», Р°С‚РјРѕ)', fuel: 'diesel', idleRPM: 780, redlineRPM: 2200, maxRPM: 2400, powerMult: 0.92, consumptionMult: 0.88, massKg: 430, rpmResponseMult: 0.42, heatMult: 0.98, lpgCompatible: false, cats: ['tractor'], weight: 6, note: 'РђС‚РјРѕСЃС„РµСЂРЅС‹Р№ РЅРµРєСЂСѓС‚РѕС‡РЅС‹Р№ РґРёР·РµР»СЊ РњРўР—' },
  { id: 'eng_d245_mtz', nameRu: 'Р”-245 РњРњР— РўСѓСЂР±Рѕ (4 С†РёР»)', fuel: 'diesel', idleRPM: 780, redlineRPM: 2400, maxRPM: 2600, powerMult: 1.1, consumptionMult: 0.92, massKg: 445, rpmResponseMult: 0.45, heatMult: 1.02, lpgCompatible: false, turbo: TVN, cats: ['tractor'], weight: 6, note: 'Р¤РѕСЂРєР°РјРµСЂРЅС‹Р№ С‚СѓСЂР±РѕРґРёР·РµР»СЊ РњРўР—-82' },
  // ---- РњРѕС‚РѕС‚РµС…РЅРёРєР° ----
  { id: 'eng_izj_2t_350', nameRu: '2Рў 350 СЃРј3 (РР¶-Р®РїРёС‚РµСЂ)', fuel: 'ai92', idleRPM: 1100, redlineRPM: 6500, maxRPM: 7300, powerMult: 0.62, consumptionMult: 1.1, massKg: 38, rpmResponseMult: 1.3, heatMult: 0.9, lpgCompatible: false, cats: ['moto'], weight: 6, note: 'Р”РІСѓС…С‚Р°РєС‚РЅС‹Р№ СЃ РІРµС‡РЅРѕР№ РїРµСЂРµР±РѕСЂРєРѕР№ РєРѕР»РµС†' },
  { id: 'eng_jawa_2t_350', nameRu: '2Рў 344 СЃРј3 Sport (Jawa)', fuel: 'ai92', idleRPM: 1100, redlineRPM: 6800, maxRPM: 7600, powerMult: 0.68, consumptionMult: 1.05, massKg: 32, rpmResponseMult: 1.4, heatMult: 0.9, lpgCompatible: false, cats: ['moto'], weight: 5, note: 'Р РµР·РєРёР№ В«РґРІСѓС…С‚Р°РєС‚РЅС‹Р№ РїРѕРґС…РІР°С‚В»' },
  { id: 'eng_ural_ohv_750', nameRu: 'РћРїРїРѕР·РёС‚РЅС‹Р№ РћР’Рќ 750 (РЈСЂР°Р»)', fuel: 'ai92', idleRPM: 1000, redlineRPM: 5800, maxRPM: 6300, powerMult: 0.66, consumptionMult: 1.0, massKg: 76, rpmResponseMult: 0.8, heatMult: 0.95, lpgCompatible: false, cats: ['moto'], weight: 4, note: 'РўСЏР¶С‘Р»С‹Р№ РѕРїРїРѕР·РёС‚РЅРёРє СЃ РєР°СЂРґР°РЅРѕРј' },
  { id: 'eng_chopper_v2_1100', nameRu: 'V2 1100 СЃРј3 Cruiser (РћР’Рќ)', fuel: 'ai92', idleRPM: 950, redlineRPM: 5600, maxRPM: 6200, powerMult: 0.95, consumptionMult: 1.0, massKg: 108, rpmResponseMult: 0.75, heatMult: 1.0, lpgCompatible: false, cats: ['moto'], weight: 3 },
  { id: 'eng_moto4t_600', nameRu: '4Рў 600 СЃРј3 Inline-4 РЎСѓРїРµСЂСЃРїРѕСЂС‚', fuel: 'ai95', idleRPM: 1250, redlineRPM: 11000, maxRPM: 13500, powerMult: 1.15, consumptionMult: 1.05, massKg: 58, rpmResponseMult: 2.0, heatMult: 1.15, lpgCompatible: false, cats: ['moto'], weight: 2, note: 'РћС‚СЃРµС‡РєР° РЅР° 11000 РѕР±/РјРёРЅ, РјРµС…Р°РЅРёС‡РµСЃРєРёР№ РїСЂРµРґРµР» 13500' },
  { id: 'eng_50cc_2t', nameRu: '2Рў 50 СЃРј3 РњРѕРїРµРґРЅС‹Р№', fuel: 'ai92', idleRPM: 1600, redlineRPM: 6300, maxRPM: 7200, powerMult: 0.22, consumptionMult: 0.55, massKg: 12, rpmResponseMult: 1.6, heatMult: 0.85, lpgCompatible: false, cats: ['moped'], weight: 10 }
];

// ============================================================================
// TRANSMISSION CATALOG (РљРћР РћР‘РљР РџР•Р Р•Р”РђР§)
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
  // ---- РњРµС…Р°РЅРёС‡РµСЃРєРёРµ (MT) ----
  { id: 'trn_mt3_retro', nameRu: 'РњРљРџРџ 3-СЃС‚СѓРї (СЃС‚Р°СЂСЊ)', kind: 'MT', ratios: [-3.5, 0, 3.7, 2.2, 1.5], finalDrive: 4.3, massKg: 38, isManualYesNo: true, cats: ['retro'], weight: 5, efficiency: 0.90 },
  { id: 'trn_mt4_retro', nameRu: 'РњРљРџРџ 4-СЃС‚СѓРї (СЂРµС‚СЂРѕ)', kind: 'MT', ratios: [-3.5, 0, 3.6, 2.1, 1.36, 0.96], finalDrive: 4.1, massKg: 42, isManualYesNo: true, cats: ['retro', 'city'], weight: 6, efficiency: 0.92 },
  { id: 'trn_mt4_econ', nameRu: 'РњРљРџРџ 4-СЃС‚СѓРї Р­РєРѕРЅРѕРјРёРєР°', kind: 'MT', ratios: [-3.4, 0, 3.9, 2.2, 1.44, 1.0], finalDrive: 4.0, massKg: 44, isManualYesNo: true, cats: ['retro', 'city'], weight: 5, efficiency: 0.92 },
  { id: 'trn_mt5_city', nameRu: 'РњРљРџРџ 5-СЃС‚СѓРї (СЃС‚Р°РЅРґР°СЂС‚)', kind: 'MT', ratios: [-3.4, 0, 3.5, 2.05, 1.38, 1.0, 0.78], finalDrive: 3.9, massKg: 50, isManualYesNo: true, cats: ['city', 'retro', 'suv', 'van', 'offroad'], weight: 16, efficiency: 0.94 },
  { id: 'trn_mt5_econ_long', nameRu: 'РњРљРџРџ 5-СЃС‚СѓРї СЌРєРѕРЅРѕРј (long)', kind: 'MT', ratios: [-3.2, 0, 3.3, 2.0, 1.35, 0.97, 0.73], finalDrive: 3.7, massKg: 50, isManualYesNo: true, cats: ['city', 'suv'], weight: 5, efficiency: 0.94, note: 'Р”Р»РёРЅРЅР°СЏ РіР»Р°РІРЅР°СЏ РїР°СЂР° вЂ” СЌРєРѕРЅРѕРјРёСЏ, С…СѓР¶Рµ СЂР°Р·РіРѕРЅ' },
  { id: 'trn_mt5_short', nameRu: 'РњРљРџРџ 5-СЃС‚СѓРї РєРѕСЂРѕС‚РєР°СЏ РїР°СЂР°', kind: 'MT', ratios: [-3.6, 0, 3.7, 2.15, 1.45, 1.05, 0.82], finalDrive: 4.3, massKg: 50, isManualYesNo: true, cats: ['city', 'sport', 'retro'], weight: 5, efficiency: 0.94, note: 'РљРѕСЂРѕС‚РєР°СЏ РїР°СЂР° вЂ” СЂРµР·РєРёР№ СЂР°Р·РіРѕРЅ, Р±ГіР»СЊС€РёР№ СЂР°СЃС…РѕРґ' },
  { id: 'trn_mt6_sport', nameRu: 'РњРљРџРџ 6-СЃС‚СѓРї Sport (Р±Р»РёР·РєРёРµ СЂСЏРґ)', kind: 'MT', ratios: [-3.0, 0, 3.05, 2.10, 1.56, 1.21, 1.00, 0.82], finalDrive: 3.7, massKg: 56, isManualYesNo: true, cats: ['sport', 'muscle'], weight: 6, efficiency: 0.95 },
  { id: 'trn_mt6_sport_short', nameRu: 'РњРљРџРџ 6-СЃС‚СѓРї Sport (РєРѕСЂРѕС‚РєРёР№ СЂСЏРґ)', kind: 'MT', ratios: [-3.1, 0, 3.2, 2.2, 1.6, 1.25, 1.02, 0.85], finalDrive: 4.1, massKg: 56, isManualYesNo: true, cats: ['sport'], weight: 3, efficiency: 0.95 },
  // ---- Р РѕР±РѕС‚РёР·РёСЂРѕРІР°РЅРЅС‹Рµ (AMT: single clutch, jerky shifts) ----
  { id: 'trn_amt5', nameRu: 'Р РљРџРџ 5-СЃС‚СѓРї (СЂРѕР±РѕС‚, РѕРґРЅРѕРґРёСЃРєРѕРІР°СЏ)', kind: 'AMT', ratios: [-2.9, 0, 3.0, 1.9, 1.3, 1.0], finalDrive: 4.0, massKg: 48, shiftCooldown: 0.8, cats: ['city', 'retro', 'suv'], weight: 3, efficiency: 0.93, note: 'Р РѕР±РѕС‚ СЃ С…Р°СЂР°РєС‚РµСЂРЅС‹Рј В«РєР»РµРІРєРѕРјВ» РїСЂРё РїРµСЂРµРєР»СЋС‡РµРЅРёРё' },
  { id: 'trn_amt6', nameRu: 'Р РљРџРџ 6-СЃС‚СѓРї (СЂРѕР±РѕС‚ EasyTronic)', kind: 'AMT', ratios: [-3.2, 0, 4.0, 2.34, 1.6, 1.18, 1.0], finalDrive: 4.1, massKg: 52, shiftCooldown: 0.75, cats: ['city', 'suv', 'van'], weight: 2, efficiency: 0.93 },
  // ---- РљР»Р°СЃСЃРёС‡РµСЃРєРёРµ РђРљРџРџ (torque converter) ----
  { id: 'trn_at3_retro', nameRu: 'РђРљРџРџ 3-СЃС‚СѓРї (СЃС‚Р°СЂР°СЏ, РіРёРґСЂРѕС‚СЂР°РЅСЃС„РѕСЂРјР°С‚РѕСЂ)', kind: 'AT', ratios: [-3.0, 0, 2.8, 1.65, 1.0], finalDrive: 3.7, massKg: 62, shiftCooldown: 0.45, hasTorqueConverter: true, cats: ['retro', 'muscle', 'luxury'], weight: 4, efficiency: 0.86, note: 'РЎС‚Р°СЂС‹Р№ 3-РґРёР°РїР°Р·РѕРЅРЅС‹Р№ Р°РІС‚РѕРјР°С‚, РІС‹СЃРѕРєРёР№ СЂР°СЃС…РѕРґ' },
  { id: 'trn_at4', nameRu: 'РђРљРџРџ 4-СЃС‚СѓРї', kind: 'AT', ratios: [-2.9, 0, 3.0, 1.95, 1.4, 1.0], finalDrive: 3.9, massKg: 66, shiftCooldown: 0.4, hasTorqueConverter: true, cats: ['city', 'retro', 'suv', 'van', 'muscle'], weight: 6, efficiency: 0.88 },
  { id: 'trn_at5', nameRu: 'РђРљРџРџ 5-СЃС‚СѓРї', kind: 'AT', ratios: [-3.1, 0, 3.2, 2.05, 1.42, 1.0, 0.75], finalDrive: 3.7, massKg: 70, shiftCooldown: 0.35, hasTorqueConverter: true, cats: ['city', 'suv', 'luxury', 'van', 'muscle', 'offroad'], weight: 6, efficiency: 0.9 },
  { id: 'trn_at6', nameRu: 'РђРљРџРџ 6-СЃС‚СѓРї (Tip)', kind: 'AT', ratios: [-3.2, 0, 4.7, 2.9, 2.0, 1.45, 1.0, 0.8], finalDrive: 3.9, massKg: 74, shiftCooldown: 0.32, hasTorqueConverter: true, cats: ['city', 'suv', 'luxury', 'van', 'offroad', 'emergency', 'muscle'], weight: 8, efficiency: 0.91 },
  { id: 'trn_at7', nameRu: 'РђРљРџРџ 7-СЃС‚СѓРї (7G-Tronic)', kind: 'AT', ratios: [-3.15, 0, 4.5, 3.0, 2.2, 1.68, 1.28, 1.0, 0.82], finalDrive: 3.4, massKg: 78, shiftCooldown: 0.3, hasTorqueConverter: true, cats: ['luxury', 'suv'], weight: 4, efficiency: 0.92 },
  { id: 'trn_at8', nameRu: 'РђРљРџРџ 8-СЃС‚СѓРї ZF 8HP', kind: 'AT', ratios: [-2.7, 0, 5.0, 3.2, 2.15, 1.72, 1.35, 1.0, 0.85, 0.66], finalDrive: 3.1, massKg: 80, shiftCooldown: 0.25, hasTorqueConverter: true, cats: ['luxury', 'sport', 'emergency', 'suv', 'offroad'], weight: 5, efficiency: 0.93 },
  { id: 'trn_at10', nameRu: 'РђРљРџРџ 10-СЃС‚СѓРї (СЃРѕ-РёРЅР¶РёРЅРёСЂРёРЅРі)', kind: 'AT', ratios: [-2.4, 0, 4.7, 3.1, 2.3, 1.75, 1.4, 1.15, 1.0, 0.87, 0.74, 0.63], finalDrive: 3.1, massKg: 82, shiftCooldown: 0.22, hasTorqueConverter: true, cats: ['muscle', 'sport', 'luxury'], weight: 3, efficiency: 0.93 },
  { id: 'trn_at6_truck', nameRu: 'РђРљРџРџ 6-СЃС‚СѓРї Heavy-Duty (Advance)', kind: 'AT', ratios: [-3.4, 0, 3.6, 2.35, 1.65, 1.2, 1.0, 0.8], finalDrive: 4.9, massKg: 130, shiftCooldown: 0.4, hasTorqueConverter: true, cats: ['truck', 'heavy', 'bus', 'offroad', 'emergency'], weight: 4, efficiency: 0.88 },
  // ---- РўРЅ - DSG (dual clutch, instant shifts) ----
  { id: 'trn_dsg6', nameRu: 'DSG 6-СЃС‚СѓРї (dual wet clutch)', kind: 'DSG', ratios: [-2.9, 0, 3.3, 2.1, 1.45, 1.05, 0.85], finalDrive: 3.9, massKg: 62, shiftCooldown: 0.12, cats: ['city', 'sport', 'suv'], weight: 4, efficiency: 0.95 },
  { id: 'trn_dsg7', nameRu: 'DSG 7-СЃС‚СѓРї (dry clutch DQ200)', kind: 'DSG', ratios: [-2.9, 0, 3.7, 2.4, 1.55, 1.16, 0.9, 0.74], finalDrive: 3.6, massKg: 60, shiftCooldown: 0.11, cats: ['city', 'sport', 'suv', 'luxury'], weight: 4, efficiency: 0.96 },
  { id: 'trn_dsg8_sport', nameRu: 'DSG 8-СЃС‚СѓРї PDK РЎРїРѕСЂС‚', kind: 'DSG', ratios: [-2.5, 0, 3.9, 2.5, 1.9, 1.5, 1.2, 1.0, 0.86, 0.72], finalDrive: 3.7, massKg: 70, shiftCooldown: 0.09, cats: ['sport', 'luxury'], weight: 2, efficiency: 0.96 },
  // ---- Р’Р°СЂРёР°С‚РѕСЂ CVT (Р±РµСЃСЃС‚СѓРїРµРЅС‡Р°С‚С‹Р№ РєР»РёРЅРѕСЂРµРјС‘РЅРЅС‹Р№) ----
  { id: 'trn_cvt_econ', nameRu: 'Р’Р°СЂРёР°С‚РѕСЂ CVT (Eco-СЂРµР¶РёРј, СЃРёРјСѓР»СЏС†РёСЏ 6-СЃС‚СѓРї)', kind: 'CVT', ratios: [-3.4, 0, 2.95, 1.72, 1.0], finalDrive: 3.9, massKg: 58, cats: ['city', 'suv'], weight: 6, efficiency: 0.91, note: 'РњРѕС‚РѕСЂ РґРµСЂР¶РёС‚ РѕР±РѕСЂРѕС‚С‹ РІ Р·РѕРЅРµ РјР°РєСЃРёРјР°Р»СЊРЅРѕР№ С‚СЏРіРё, РїРµСЂРµРґР°С‡ Р±РµСЃРєРѕРЅРµС‡РЅРѕ РјРЅРѕРіРѕ' },
  { id: 'trn_cvt_sport', nameRu: 'Р’Р°СЂРёР°С‚РѕСЂ CVT Xtronic Sport (РІРёСЂС‚СѓР°Р»СЊРЅС‹Рµ СЃС‚СѓРїРµРЅРё)', kind: 'CVT', ratios: [-3.2, 0, 2.75, 1.62, 1.0], finalDrive: 3.6, massKg: 60, cats: ['sport', 'suv'], weight: 3, efficiency: 0.92 },
  // ---- Р“РёРґСЂРѕСЃС‚Р°С‚РёРєР° РґР»СЏ СЃРїРµС†С‚РµС…РЅРёРєРё (Р“РЎРў) ----
  { id: 'trn_hydro_2r', nameRu: 'Р“РЎРў Р“РёРґСЂРѕСЃС‚Р°С‚РёС‡РµСЃРєР°СЏ 2-РґРёР°РїР°Р·РѕРЅРЅР°СЏ', kind: 'HYDRO', ratios: [-3.6, 0, 5.2, 2.0], finalDrive: 6.2, massKg: 90, cats: ['machinery'], weight: 10, efficiency: 0.83, note: 'Р“РёРґСЂРѕСЃС‚Р°С‚РёС‡РµСЃРєРёР№ РїСЂРёРІРѕРґ РґРѕ 5/14 РєРј/h, СЂР°Р±РѕС‡РёР№/С‚СЂР°РЅСЃРїРѕСЂС‚РЅС‹Р№ СЂРµР¶РёРј' },
  // ---- Р“СЂСѓР·РѕРІС‹Рµ Рё С‚СЂР°РєС‚РѕСЂРЅС‹Рµ РґРёР°РїР°Р·РѕРЅРЅС‹Рµ (РґРµР»РёС‚РµР»СЊ) ----
  { id: 'trn_range_cam6', nameRu: 'Р Р” РњРљРџРџ 6-СЃС‚СѓРї СЃ РґРµР»РёС‚РµР»РµРј', kind: 'RANGE', ratios: [-4.5, 0, 4.8, 3.1, 2.0, 1.42, 1.0, 0.75], finalDrive: 4.8, massKg: 190, isManualYesNo: true, divider: 'divider', cats: ['truck', 'heavy', 'bus', 'offroad', 'emergency'], weight: 8, efficiency: 0.9, note: '6 РїРµСЂРµРґР°С‡ Г— 2 РґРµР»РёС‚РµР»СЏ | РїРѕРЅРёР¶Р°СЋС‰РёР№ [LO] СѓРјРЅРѕР¶Р°РµС‚ С‚СЏРіСѓ' },
  { id: 'trn_range_9_semi', nameRu: 'Р Р” РњРљРџРџ 9-СЃС‚СѓРї (РґР°Р»СЊРЅРѕР±РѕР№)', kind: 'RANGE', ratios: [-9.6, 0, 9.1, 6.6, 4.9, 3.7, 2.9, 2.25, 1.8, 1.45, 1.18, 1.0], finalDrive: 3.9, massKg: 260, isManualYesNo: true, divider: 'divider', cats: ['truck', 'heavy'], weight: 4, efficiency: 0.92, note: '9 РїРµСЂРµРґР°С‡ Г— РґРµР»РёС‚РµР»СЊ С‚СЏРіРѕРІРѕРіРѕ РґРёР°РїР°Р·РѕРЅР°' },
  { id: 'trn_range_tr', nameRu: 'РўСЂР°РєС‚РѕСЂРЅР°СЏ РљРџРџ 9FD + РїРѕРЅРёР¶Р°СЋС‰РёР№ СЂСЏРґ', kind: 'RANGE', ratios: [-4.5, 0, 5.5, 4.3, 3.3, 2.5, 1.9, 1.4, 1.0, 0.8, 0.65], finalDrive: 5.4, massKg: 210, isManualYesNo: true, divider: 'tractor_range', cats: ['tractor'], weight: 10, efficiency: 0.89, note: '9 РїРµСЂРµРґР°С‡ Г— 2 С‚СЂР°РєС‚РѕСЂРЅС‹С… СЂСЏРґР° (1/2) = 18 РїРµСЂРµРґР°С‡' },
  // ---- РњРѕС‚Рѕ ----
  { id: 'trn_moto4', nameRu: 'РњРѕС‚РѕРљРџРџ 4-СЃС‚СѓРї (СЃРѕРІРµС‚СЃРєР°СЏ)', kind: 'MT', ratios: [-2.8, 0, 2.85, 1.95, 1.45, 1.15], finalDrive: 4.6, massKg: 12, isManualYesNo: true, cats: ['moto'], weight: 7, efficiency: 0.94 },
  { id: 'trn_moto5', nameRu: 'РњРѕС‚РѕРљРџРџ 5-СЃС‚СѓРї', kind: 'MT', ratios: [-2.8, 0, 2.7, 1.85, 1.35, 1.05, 0.85], finalDrive: 4.4, massKg: 13, isManualYesNo: true, cats: ['moto'], weight: 8, efficiency: 0.95 },
  { id: 'trn_moto6', nameRu: 'РњРѕС‚РѕРљРџРџ 6-СЃС‚СѓРї (СЃСѓРїРµСЂСЃРїРѕСЂС‚)', kind: 'MT', ratios: [-2.8, 0, 2.6, 1.9, 1.5, 1.2, 1.0, 0.86], finalDrive: 4.2, massKg: 14, isManualYesNo: true, cats: ['moto'], weight: 4, efficiency: 0.96 },
  { id: 'trn_moped3', nameRu: 'РњРѕС‚РѕРљРџРџ 3-СЃС‚СѓРї (РјРѕРїРµРґ)', kind: 'MT', ratios: [-3.0, 0, 3.2, 1.8, 1.1], finalDrive: 4.8, massKg: 8, isManualYesNo: true, cats: ['moped'], weight: 10, efficiency: 0.93 }
];

// ============================================================================
// ECU TUNES / FIRMWARES (РџР РћРЁРР’РљР Р­Р‘РЈ)
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
  { id: 'tune_stock', nameRu: 'РЎС‚РѕРє (Р·Р°РІРѕРґСЃРєР°СЏ РїСЂРѕС€РёРІРєР°)', powerMult: 1.0, redlineMult: 1.0, consumptionMult: 1.0, minOctane: 0, knockRisk: 0, heatMult: 1.0, rpmResponseMult: 1.0, chipLevel: 0, weight: 50, note: 'Р—Р°РІРѕРґСЃРєР°СЏ РєР°Р»РёР±СЂРѕРІРєР° Р­Р‘РЈ' },
  { id: 'tune_eco_92', nameRu: 'Р­РєРѕРЅРѕРј 92-Р№ (РґРµС„РѕСЂСЃ)', powerMult: 0.9, redlineMult: 0.95, consumptionMult: 0.86, minOctane: 92, knockRisk: 0, heatMult: 0.95, rpmResponseMult: 0.95, chipLevel: 1, cats: ['city', 'retro', 'van'], weight: 8, note: 'Р”РµС€С‘РІС‹Р№ 92-Р№, СЌРєРѕРЅРѕРјРёС‡РЅР°СЏ РєР°Р»РёР±СЂРѕРІРєР°' },
  { id: 'tune_eco_city', nameRu: 'Р­РєРѕ-РїСЂРѕС€РёРІРєР° Р“РѕСЂРѕРґ', powerMult: 0.92, redlineMult: 0.94, consumptionMult: 0.88, minOctane: 92, knockRisk: 0, heatMult: 0.96, rpmResponseMult: 0.97, chipLevel: 1, cats: ['city', 'van', 'suv'], weight: 6 },
  { id: 'tune_taxi_limiter', nameRu: 'РўР°РєСЃРё СЃ РѕРіСЂР°РЅРёС‡РёС‚РµР»РµРј', powerMult: 0.95, redlineMult: 0.9, consumptionMult: 0.9, minOctane: 92, knockRisk: 0, heatMult: 0.95, rpmResponseMult: 0.95, chipLevel: 1, cats: ['city', 'retro', 'emergency'], weight: 4, note: 'Р¤Р»РѕС‚-РїСЂРѕС€РёРІРєР° С‚Р°РєСЃРѕРїР°СЂРєР°: РѕС‚СЃРµС‡РєР° РЅРёР¶Рµ, СЂР°СЃС…РѕРґ СѓРјРµСЂРµРЅРЅС‹Р№' },
  { id: 'tune_police_recal', nameRu: 'РџРѕР»РёС†РµР№СЃРєР°СЏ РєР°Р»РёР±СЂРѕРІРєР°', powerMult: 1.1, redlineMult: 1.04, consumptionMult: 1.06, minOctane: 95, knockRisk: 0.05, heatMult: 1.04, rpmResponseMult: 1.08, chipLevel: 2, cats: ['emergency'], weight: 30, note: 'РЎС‚Р°РЅРґР°СЂС‚РЅР°СЏ СЃРїРµС†РєР°Р»РёР±СЂРѕРІРєР° РґР»СЏ РїР°С‚СЂСѓР»СЊРЅС‹С…' },
  { id: 'tune_sport_flow', nameRu: 'РЎРїРѕСЂС‚-РїСЂРѕС€РёРІРєР° Flow', powerMult: 1.12, redlineMult: 1.06, consumptionMult: 1.1, minOctane: 95, knockRisk: 0.2, heatMult: 1.07, rpmResponseMult: 1.1, chipLevel: 2, cats: ['sport', 'muscle'], weight: 14, note: 'РЎРїРѕСЂС‚РёРІРЅР°СЏ СЃРјРµСЃСЊ Р·Р°Р¶РёРіР°РЅРёСЏ, РѕС‚СЃРµС‡РєР° РІС‹С€Рµ' },
  { id: 'tune_stage1', nameRu: 'Stage 1 (РїРµСЂРІР°СЏ РїСЂРѕС€РёРІРєР°)', powerMult: 1.2, redlineMult: 1.07, consumptionMult: 1.14, minOctane: 95, knockRisk: 0.35, heatMult: 1.1, rpmResponseMult: 1.12, chipLevel: 2, cats: ['sport', 'city', 'suv', 'muscle', 'van'], weight: 5, note: 'РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ Stage 1: +12-20% С‚СЏРіРё, РЅСѓР¶РµРЅ 95-Р№' },
  { id: 'tune_stage2', nameRu: 'Stage 2 (Р°РіСЂРµСЃСЃРёРІРЅС‹Р№)', powerMult: 1.3, redlineMult: 1.1, consumptionMult: 1.24, minOctane: 98, knockRisk: 0.6, heatMult: 1.18, rpmResponseMult: 1.15, chipLevel: 2, requiresTurbo: true, cats: ['sport', 'muscle', 'luxury'], weight: 3, note: 'РўРѕР»СЊРєРѕ РґР»СЏ С‚СѓСЂР±РѕРјРѕС‚РѕСЂРѕРІ, С‚СЂРµР±СѓРµС‚ 98-Р№; СЂРёСЃРє РїРµСЂРµРіСЂРµРІР°' },
  { id: 'tune_diesel_eco', nameRu: 'Р”РёР·РµР»СЊ-Eco Map (РўРќР’Р”)', powerMult: 0.94, redlineMult: 0.95, consumptionMult: 0.84, minOctane: 0, knockRisk: 0, heatMult: 0.96, rpmResponseMult: 0.97, isDieselTune: true, chipLevel: 1, weight: 6, note: 'Р­РєРѕРЅРѕРјРёС‡РЅР°СЏ РєР°Р»РёР±СЂРѕРІРєР° РўРќР’Р”' },
  { id: 'tune_diesel_power', nameRu: 'Р”РёР·РµР»СЊ-Power Map (С‚СЂР°Рє/РєР°СЂСЊРµСЂ)', powerMult: 1.18, redlineMult: 1.05, consumptionMult: 1.16, minOctane: 0, knockRisk: 0, heatMult: 1.1, rpmResponseMult: 1.05, isDieselTune: true, chipLevel: 2, cats: ['truck', 'heavy', 'tractor', 'machinery'], weight: 5, note: 'РњРѕС‰РЅРѕСЃС‚РЅР°СЏ РїСЂРѕС€РёРІРєР° РўРќР’Р”: Р±РѕР»СЊС€Рµ РґС‹РјР° Рё С‚СЏРіРё' },
  { id: 'tune_agricultural', nameRu: 'Р—Р°РІРѕРґСЃРєР°СЏ РђРіСЂРѕ (РўРќР’Р” РёР·Р±С‹С‚.)', powerMult: 1.0, redlineMult: 1.0, consumptionMult: 0.93, minOctane: 0, knockRisk: 0, heatMult: 0.98, rpmResponseMult: 0.98, isDieselTune: true, chipLevel: 0, cats: ['tractor', 'machinery'], weight: 20 }
];

// ============================================================================
// TIRE SETS (РљРћРњРџР›Р•РљРўР« РЁРРќ)
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
  // Р›РµС‚РЅРёРµ
  { id: 'tir_summer_econ', nameRu: 'Р›РµС‚РЅРёРµ Р‘СЋРґР¶РµС‚ (СЌРєРѕРЅРѕРј)', gripMult: 0.93, wetGripMult: 0.88, iceGripMult: 0.7, rollingMult: 1.03, driftGripMult: 0.9, topSpeedMult: 0.98, massKg: 29, weight: 10, note: 'Р–С‘СЃС‚РєР°СЏ СЃРјРµСЃРµРІР°СЏ СЂРµР·РёРЅР°, СЃР»Р°Р±РѕРµ РјРѕРєСЂРѕРµ СЃС†РµРїР»РµРЅРёРµ' },
  { id: 'tir_summer_city', nameRu: 'Р›РµС‚РЅРёРµ РЁРѕСЃСЃРµР№РЅС‹Рµ (РіРѕСЂРѕРґСЃРєРёРµ)', gripMult: 1.0, wetGripMult: 0.97, iceGripMult: 0.78, rollingMult: 1.0, driftGripMult: 1.0, topSpeedMult: 1.0, massKg: 34, weight: 18 },
  { id: 'tir_summer_comfort', nameRu: 'Р›РµС‚РЅРёРµ РљРѕРјС„РѕСЂС‚ (С‚РёС…РёРµ)', gripMult: 0.97, wetGripMult: 0.99, iceGripMult: 0.76, rollingMult: 0.97, driftGripMult: 0.95, topSpeedMult: 1.0, massKg: 36, weight: 8, note: 'РњСЏРіРєРёРµ, С‚РёС…РёРµ, СЃ РјРµРЅСЊС€РёРј СЃРѕРїСЂРѕС‚РёРІР»РµРЅРёРµРј РєР°С‡РµРЅРёСЋ' },
  { id: 'tir_summer_uhp', nameRu: 'Р›РµС‚РЅРёРµ UHP Р’С‹СЃРѕРєРёРµ СЃРєРѕСЂРѕСЃС‚Рё', gripMult: 1.09, wetGripMult: 1.03, iceGripMult: 0.8, rollingMult: 1.06, driftGripMult: 1.08, topSpeedMult: 1.02, massKg: 42, weight: 6 },
  { id: 'tir_summer_semi_slick', nameRu: 'РџРѕР»СѓСЃР»РёРєРё Track-Day', gripMult: 1.17, wetGripMult: 0.94, iceGripMult: 0.68, rollingMult: 1.11, driftGripMult: 1.16, topSpeedMult: 1.03, massKg: 46, weight: 3, isSemiSlick: true, note: 'Р“РѕРЅРѕС‡РЅС‹Р№ СЃРѕСЃС‚Р°РІ: Р»РёРїРєР°СЏ СЂРµР·РёРЅР°, РЅРѕ РЅРµ РґР»СЏ РґРѕР¶РґСЏ Рё Р»СЊРґР°' },
  // Р—РёРјРЅРёРµ
  { id: 'tir_winter_friction', nameRu: 'Р—РёРјРЅРёРµ Р¤СЂРёРєС†РёРѕРЅРЅС‹Рµ (Velcro)', gripMult: 0.94, wetGripMult: 1.04, iceGripMult: 1.15, rollingMult: 1.07, driftGripMult: 0.98, topSpeedMult: 0.96, massKg: 38, weight: 10, note: 'Р“РѕРґРЅС‹ РЅР° РјРѕСЂРѕР·Рµ, РЅР° Р°СЃС„Р°Р»СЊС‚Рµ РїРѕРґРІС‹РІР°СЋС‚' },
  { id: 'tir_winter_studded', nameRu: 'Р—РёРјРЅРёРµ РЁРёРїРѕРІР°РЅРЅС‹Рµ', gripMult: 0.9, wetGripMult: 1.0, iceGripMult: 1.4, rollingMult: 1.08, driftGripMult: 0.92, topSpeedMult: 0.94, massKg: 42, weight: 8, isStudded: true, note: 'РЁРёРїС‹: СѓРІРµСЂРµРЅРЅС‹Р№ Р»РµРґ, С€СѓРј РЅР° Р°СЃС„Р°Р»СЊС‚Рµ' },
  { id: 'tir_allseason', nameRu: 'Р’СЃРµСЃРµР·РѕРЅРЅС‹Рµ', gripMult: 0.96, wetGripMult: 0.95, iceGripMult: 0.94, rollingMult: 1.0, driftGripMult: 0.97, topSpeedMult: 0.99, massKg: 35, weight: 6, note: 'РљРѕРјРїСЂРѕРјРёСЃСЃ РјРµР¶РґСѓ СЃРµР·РѕРЅР°РјРё' },
  // Р’РЅРµРґРѕСЂРѕР¶РЅС‹Рµ
  { id: 'tir_allterrain', nameRu: 'AT All-Terrain', gripMult: 0.93, wetGripMult: 0.99, iceGripMult: 1.05, rollingMult: 1.09, driftGripMult: 0.95, topSpeedMult: 0.98, massKg: 58, weight: 6, isOffroad: true },
  { id: 'tir_mud', nameRu: 'MT Mud-Terrain (РіСЂСЏР·РµРІС‹Рµ)', gripMult: 0.85, wetGripMult: 0.93, iceGripMult: 0.94, rollingMult: 1.14, driftGripMult: 0.9, topSpeedMult: 0.94, massKg: 66, weight: 3, isOffroad: true, note: 'РљСЂСѓРїРЅС‹Рµ РіСЂСѓРЅС‚РѕР·Р°С†РµРїС‹: Р°СЃС„Р°Р»СЊС‚ РіСѓРґРёС‚ Рё РіСЂС‹Р·С‘С‚ РєР°РЅР°РІРєРё' },
  // Р РµС‚СЂРѕ
  { id: 'tir_retro_diagonal', nameRu: 'Р”РёР°РіРѕРЅР°Р»СЊРЅС‹Рµ (СЂРµС‚СЂРѕ)', gripMult: 0.82, wetGripMult: 0.8, iceGripMult: 0.7, rollingMult: 0.97, driftGripMult: 0.88, topSpeedMult: 0.95, massKg: 28, weight: 8, note: 'РЎС‚Р°СЂР°СЏ РґРёР°РіРѕРЅР°Р»СЊРЅР°СЏ РєРѕРЅСЃС‚СЂСѓРєС†РёСЏ: СЂР°СЃРїР»С‹РІС‡Р°С‚С‹Р№ СЂСѓР»СЊ' },
  // Р“СЂСѓР·РѕРІС‹Рµ
  { id: 'tir_truck_highway', nameRu: 'Р“СЂСѓР·РѕРІС‹Рµ РњР°РіРёСЃС‚СЂР°Р»СЊРЅС‹Рµ (H)', gripMult: 0.96, wetGripMult: 0.92, iceGripMult: 0.75, rollingMult: 0.96, driftGripMult: 0.95, topSpeedMult: 1.0, massKg: 190, cats: ['truck', 'heavy', 'bus'], weight: 10 },
  { id: 'tir_truck_allpos', nameRu: 'Р“СЂСѓР·РѕРІС‹Рµ Р’СЃРµСЃРµР·РѕРЅРЅС‹Рµ', gripMult: 0.94, wetGripMult: 0.96, iceGripMult: 0.85, rollingMult: 0.99, driftGripMult: 0.94, topSpeedMult: 0.99, massKg: 190, cats: ['truck', 'heavy', 'bus', 'offroad'], weight: 6 },
  // РўСЂР°РєС‚РѕСЂРЅС‹Рµ
  { id: 'tir_agro_r1', nameRu: 'РђРіСЂРѕС€РёРЅС‹ R1 (Р·Р°РґРЅРёР№ РїСЂРёРІРѕРґ)', gripMult: 0.88, wetGripMult: 0.9, iceGripMult: 1.0, rollingMult: 0.92, driftGripMult: 0.9, topSpeedMult: 0.9, massKg: 240, cats: ['tractor'], weight: 10, note: 'Р“Р»СѓР±РѕРєРёРµ РіСЂСѓРЅС‚РѕР·Р°С†РµРїС‹ РґР»СЏ РїР°С€РЅРё' },
  // РњРѕС‚Рѕ
  { id: 'tir_moto_sport', nameRu: 'РњРѕС‚РѕРІ РїРѕРєСЂС‹С€РєРё Sport', gripMult: 1.12, wetGripMult: 0.9, iceGripMult: 0.6, rollingMult: 1.05, driftGripMult: 1.12, topSpeedMult: 1.03, massKg: 9, cats: ['moto'], weight: 6 },
  { id: 'tir_moto_tour', nameRu: 'РњРѕС‚РѕРІ РїРѕРєСЂС‹С€РєРё Touring', gripMult: 1.0, wetGripMult: 0.97, iceGripMult: 0.72, rollingMult: 1.0, driftGripMult: 1.0, topSpeedMult: 1.0, massKg: 10, cats: ['moto'], weight: 8 },
  { id: 'tir_moped_mini', nameRu: 'РњРѕРїРµРґРЅС‹Рµ РњРёРЅРё', gripMult: 0.88, wetGripMult: 0.85, iceGripMult: 0.65, rollingMult: 1.0, driftGripMult: 0.9, topSpeedMult: 0.96, massKg: 4, cats: ['moped'], weight: 10 }
];

// ============================================================================
// WEIGHTED RANDOM SELECTION
// ============================================================================

function pickWeighted<T extends { weight: number; cats?: PwCategory[] | undefined }>(
  pool: T[],
  cat: PwCategory,
  fallbackCatOverride?: PwCategory,
  rng: () => number = Math.random
): T {
  const matching = pool.filter((e) => !e.cats || e.cats.includes(cat) || (fallbackCatOverride && e.cats.includes(fallbackCatOverride)));
  const list = matching.length > 0 ? matching : pool.filter((e) => !e.cats || e.cats.length === 0);
  const finalList = list.length > 0 ? list : pool;
  let total = 0;
  for (const e of finalList) total += e.weight;
  let r = rng() * total;
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

export function pickPowertrain(
  type: CarType | string | undefined,
  rng: () => number = Math.random
): PowertrainPick {
  const cat = getVehiclePowertrainCategory(type);
  const tstr = (type || 'sedan') as string;

  // --- Engine ---
  let engine: EngineVariantDef;
  if (cat === 'machinery') {
    engine = ENGINE_VARIANTS.find(e => e.id === 'eng_hydro_d244')!;
  } else {
    let poolCat = cat;
    if (cat === 'retro' && (tstr === 'micro_car' || tstr === 'retro_bubble')) poolCat = 'retro';
    engine = pickWeighted(ENGINE_VARIANTS, poolCat, cat === 'city' ? 'retro' : undefined, rng);
  }

  // --- Transmission ---
  let transmission: TransmissionDef;
  if (cat === 'machinery') {
    transmission = TRANSMISSION_VARIANTS.find(t => t.id === 'trn_hydro_2r')!;
  } else {
    transmission = pickWeighted(TRANSMISSION_VARIANTS, cat, undefined, rng);
  }

  // --- Tune ---
  let tune: TuneDef;
  if (cat === 'machinery') {
    tune = TUNE_VARIANTS.find(t => t.id === 'tune_agricultural')!;
  } else if (cat === 'tractor') {
    tune = pickWeighted(TUNE_VARIANTS, 'tractor', undefined, rng);
  } else {
    const tunePool = TUNE_VARIANTS.filter(t => {
      if (engine.fuel === 'diesel' && t.isDieselTune) return true;
      if (engine.fuel !== 'diesel' && (t.isDieselTune || t.id === 'tune_agricultural')) return false;
      if (t.requiresTurbo && !(engine.turbo && engine.turbo.boostMax > 0)) return false;
      return true;
    });
    tune = pickWeighted(tunePool, cat, undefined, rng);
  }

  // --- Tires ---
  const tires = pickWeighted(TIRE_SETS, cat, undefined, rng);

  // --- Turbo kit (aftermarket only for N/A petrol engines with slim chance) ---
  let turboKit: TurboSpecDef | null = engine.turbo || null;
  let turboIsAftermarket = false;
  if (!turboKit && engine.fuel !== 'diesel' && (cat === 'city' || cat === 'sport') && engine.lpgCompatible) {
    if (rng() < 0.06) {
      turboKit = TURBO_KITS[1];
      turboIsAftermarket = true;
    }
  }

  return { engine, transmission, tune, tires, turboKit, turboIsAftermarket };
}

/**
 * Deterministic RNG from a stable string seed (e.g. vehicle id).
 * Used so saved/legacy cars without stored parts keep the same
 * powertrain across every reload instead of re-rolling each time.
 */
export function makePowertrainRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
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
  parts.push(`Р”РІРёРіР°С‚РµР»СЊ: ${p.engine.nameRu}`);
  parts.push(`РљРџРџ: ${p.transmission.nameRu}`);
  if (p.turboKit && p.turboKit.id !== 'trb_none') {
    parts.push(`РќР°РґРґСѓРІ: ${p.turboKit.nameRu}${p.turboIsAftermarket ? ' (РєРѕР»С…РѕР·-РґРѕРї)' : ''}`);
  }
  parts.push(`РџСЂРѕС€РёРІРєР°: ${p.tune.nameRu}`);
  parts.push(`РЁРёРЅС‹: ${p.tires.nameRu}`);
  return parts.join(' | ');
}


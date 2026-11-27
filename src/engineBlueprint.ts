import type { EngineState, Vehicle } from './types';

/**
 * Hand-authored mechanical & physical blueprint registry for every real engine
 * modifier (`ENGINE_VARIANTS`), forced-induction kit (`TURBO_KITS`), transmission,
 * and chip-tune in the game.
 *
 * Kept strictly dependency-free (imports only types) so it can be shared safely by:
 *   - `nodeBeamPhysics.ts` (real engine mass, inertia, mount stiffness & break thresholds)
 *   - `softbodyDamage.ts` (modifier-specific block toughness, intercooler/turbo exposure)
 *   - `engineBayVisuals.ts` (hand-detailed under-hood mechanical rendering)
 */

export type EngineArchitecture = 'inline' | 'v' | 'boxer' | 'single';
export type EngineOrientation = 'transverse' | 'longitudinal';
export type EngineFuelLayout =
  | 'carb_round'
  | 'mpi_8v'
  | 'dohc_16v'
  | 'vtec_dohc'
  | 'tsi_direct'
  | 'diesel_tnvd'
  | 'diesel_cr'
  | 'heavy_v_diesel';

export type EngineBlockMaterial = 'aluminum' | 'cast_iron' | 'heavy_iron';
export type TurboVisualKind = 'none' | 'single' | 'twin' | 'supercharger';

export interface EngineBlueprintSpec {
  id: string;
  label: string;
  cylinders: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
  architecture: EngineArchitecture;
  defaultOrientation: EngineOrientation;
  fuelLayout: EngineFuelLayout;
  blockMaterial: EngineBlockMaterial;
  displacementL: number;
  /** Physical engine dry mass in kg (synced with ENGINE_VARIANTS). */
  massKg: number;
  /** Relative stiffness multiplier for engine mount soft-body beams. */
  mountStiffnessMult: number;
  /** Relative break resistance multiplier for engine mounts. */
  mountBreakMult: number;
  /** Block structural resistance against cracking/seizure on impact. */
  blockToughness: number;
  /** Visual footprint inside bay (fraction of available bay length/width). */
  sizeL: number;
  sizeW: number;
  /** Authentic material palette for the cylinder head, valve cover & intake. */
  blockColor: string;
  headColor: string;
  valveCoverColor: string;
  valveCoverAccent: string;
  intakeColor: string;
  factoryTurboId?: string;
  hasDistributor?: boolean;
  hasCenterTnvd?: boolean;
  hasSideTnvd?: boolean;
  hasTopMountIntercooler?: boolean;
  hasBlowerStock?: boolean;
  hasTwinPlenum?: boolean;
  hasVazHorns?: boolean;
  hasOilBathFilter?: boolean;
  isDiesel?: boolean;
  isHeavyTruck?: boolean;
  isExotic?: boolean;
  /** Base idle vibration amplitude factor (3-cyl / diesels vibrate slightly more). */
  idleVibMult: number;
}

export interface ResolvedEngineModifier {
  spec: EngineBlueprintSpec;
  orientation: EngineOrientation;
  turboKind: TurboVisualKind;
  turboKitId: string;
  /** Visual turbo housing scale: 0.8 (T25) .. 1.35 (T4/heavy). */
  turboScale: number;
  turboMassKg: number;
  isAftermarketTurbo: boolean;
  transmissionKind: 'MT' | 'AT' | 'DSG' | 'AMT' | 'CVT' | 'HYDRO' | 'RANGE';
  transmissionMassKg: number;
  tuneChipLevel: number;
  hasSportIntake: boolean;
  hasStrutBrace: boolean;
  hasGBO: boolean;
  totalPowertrainMassKg: number;
  effectiveMountStiffness: number;
  effectiveMountBreak: number;
  effectiveBlockToughness: number;
}

export interface EngineBayBounds {
  zone: 'front' | 'mid_rear' | 'rear' | 'cabover' | 'none';
  bayX1: number;
  bayX2: number;
  bayHalfW: number;
  hoodX1: number;
  hoodX2: number;
  hoodHalfW: number;
  hingeSide: 'rear' | 'front';
  isTransparentCover: boolean;
  isNarrowTractorBonnet: boolean;
  isTruckHood: boolean;
  isCabOver: boolean;
}

export const ENGINE_BLUEPRINTS: Record<string, EngineBlueprintSpec> = {
  // === COMPACT / CITY / BUDGET ===
  eng_08_3cil_econ: {
    id: 'eng_08_3cil_econ',
    label: '0.9 R3',
    cylinders: 3,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'mpi_8v',
    blockMaterial: 'aluminum',
    displacementL: 0.9,
    massKg: 68,
    mountStiffnessMult: 0.82,
    mountBreakMult: 0.88,
    blockToughness: 0.86,
    sizeL: 0.44,
    sizeW: 0.48,
    blockColor: '#64748b',
    headColor: '#94a3b8',
    valveCoverColor: '#cbd5e1',
    valveCoverAccent: '#475569',
    intakeColor: '#334155',
    hasDistributor: true,
    idleVibMult: 1.35,
  },
  eng_12_4cil_econ: {
    id: 'eng_12_4cil_econ',
    label: '1.2 R4',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'mpi_8v',
    blockMaterial: 'aluminum',
    displacementL: 1.2,
    massKg: 82,
    mountStiffnessMult: 0.88,
    mountBreakMult: 0.92,
    blockToughness: 0.94,
    sizeL: 0.50,
    sizeW: 0.50,
    blockColor: '#64748b',
    headColor: '#94a3b8',
    valveCoverColor: '#9ca3af',
    valveCoverAccent: '#334155',
    intakeColor: '#1e293b',
    idleVibMult: 1.1,
  },
  eng_14_8v: {
    id: 'eng_14_8v',
    label: '1.4 8V',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'mpi_8v',
    blockMaterial: 'cast_iron',
    displacementL: 1.4,
    massKg: 95,
    mountStiffnessMult: 0.94,
    mountBreakMult: 0.96,
    blockToughness: 1.0,
    sizeL: 0.54,
    sizeW: 0.52,
    blockColor: '#4b5563',
    headColor: '#9ca3af',
    valveCoverColor: '#cbd5e1',
    valveCoverAccent: '#334155',
    intakeColor: '#475569',
    idleVibMult: 1.08,
  },
  eng_16_8v: {
    id: 'eng_16_8v',
    label: '1.6 8V',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'mpi_8v',
    blockMaterial: 'cast_iron',
    displacementL: 1.6,
    massKg: 110,
    mountStiffnessMult: 0.98,
    mountBreakMult: 1.0,
    blockToughness: 1.04,
    sizeL: 0.58,
    sizeW: 0.54,
    blockColor: '#475569',
    headColor: '#94a3b8',
    valveCoverColor: '#64748b',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#334155',
    hasDistributor: true,
    idleVibMult: 1.05,
  },
  eng_16_16v: {
    id: 'eng_16_16v',
    label: '1.6 16V',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'cast_iron',
    displacementL: 1.6,
    massKg: 108,
    mountStiffnessMult: 1.0,
    mountBreakMult: 1.0,
    blockToughness: 1.02,
    sizeL: 0.60,
    sizeW: 0.56,
    blockColor: '#475569',
    headColor: '#94a3b8',
    valveCoverColor: '#1e293b',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#94a3b8',
    hasVazHorns: true,
    idleVibMult: 1.0,
  },
  eng_16_boost_95: {
    id: 'eng_16_boost_95',
    label: '1.6 16V Sport',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'cast_iron',
    displacementL: 1.6,
    massKg: 108,
    mountStiffnessMult: 1.05,
    mountBreakMult: 1.04,
    blockToughness: 1.04,
    sizeL: 0.60,
    sizeW: 0.56,
    blockColor: '#475569',
    headColor: '#cbd5e1',
    valveCoverColor: '#dc2626',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#94a3b8',
    hasVazHorns: true,
    idleVibMult: 1.06,
  },
  eng_15_vtec: {
    id: 'eng_15_vtec',
    label: '1.5 VTEC',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'vtec_dohc',
    blockMaterial: 'aluminum',
    displacementL: 1.5,
    massKg: 96,
    mountStiffnessMult: 1.08,
    mountBreakMult: 1.04,
    blockToughness: 0.98,
    sizeL: 0.58,
    sizeW: 0.56,
    blockColor: '#64748b',
    headColor: '#cbd5e1',
    valveCoverColor: '#dc2626',
    valveCoverAccent: '#f8fafc',
    intakeColor: '#cbd5e1',
    idleVibMult: 0.88,
  },
  eng_20_na: {
    id: 'eng_20_na',
    label: '2.0 R4',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'aluminum',
    displacementL: 2.0,
    massKg: 128,
    mountStiffnessMult: 1.06,
    mountBreakMult: 1.04,
    blockToughness: 1.0,
    sizeL: 0.62,
    sizeW: 0.58,
    blockColor: '#64748b',
    headColor: '#cbd5e1',
    valveCoverColor: '#475569',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#94a3b8',
    idleVibMult: 0.92,
  },

  // === SOVIET / CLASSIC CARBURETED ===
  eng_11_mez: {
    id: 'eng_11_mez',
    label: '1.1 MeMZ-245',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'carb_round',
    blockMaterial: 'cast_iron',
    displacementL: 1.1,
    massKg: 88,
    mountStiffnessMult: 0.9,
    mountBreakMult: 0.92,
    blockToughness: 1.02,
    sizeL: 0.52,
    sizeW: 0.46,
    blockColor: '#475569',
    headColor: '#94a3b8',
    valveCoverColor: '#9ca3af',
    valveCoverAccent: '#1e293b',
    intakeColor: '#0f172a',
    hasDistributor: true,
    idleVibMult: 1.28,
  },
  eng_12_soviet: {
    id: 'eng_12_soviet',
    label: '1.2 Carb',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'carb_round',
    blockMaterial: 'cast_iron',
    displacementL: 1.2,
    massKg: 96,
    mountStiffnessMult: 0.92,
    mountBreakMult: 0.95,
    blockToughness: 1.06,
    sizeL: 0.54,
    sizeW: 0.44,
    blockColor: '#475569',
    headColor: '#94a3b8',
    valveCoverColor: '#9ca3af',
    valveCoverAccent: '#1e293b',
    intakeColor: '#1d4ed8',
    hasDistributor: true,
    idleVibMult: 1.25,
  },
  eng_15_soviet: {
    id: 'eng_15_soviet',
    label: '1.5 VAZ Carb',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'carb_round',
    blockMaterial: 'cast_iron',
    displacementL: 1.5,
    massKg: 116,
    mountStiffnessMult: 0.98,
    mountBreakMult: 0.98,
    blockToughness: 1.08,
    sizeL: 0.58,
    sizeW: 0.46,
    blockColor: '#475569',
    headColor: '#cbd5e1',
    valveCoverColor: '#64748b',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#2563eb',
    hasDistributor: true,
    idleVibMult: 1.22,
  },

  // === TURBO PETROL / BOXER / I5 ===
  eng_14_t: {
    id: 'eng_14_t',
    label: '1.4 TSI',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'tsi_direct',
    blockMaterial: 'aluminum',
    displacementL: 1.4,
    massKg: 105,
    mountStiffnessMult: 1.04,
    mountBreakMult: 1.02,
    blockToughness: 0.96,
    sizeL: 0.56,
    sizeW: 0.54,
    blockColor: '#64748b',
    headColor: '#94a3b8',
    valveCoverColor: '#1e293b',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#0f172a',
    factoryTurboId: 'trb_t25',
    idleVibMult: 0.9,
  },
  eng_18_t: {
    id: 'eng_18_t',
    label: '1.8 Boxer Turbo',
    cylinders: 4,
    architecture: 'boxer',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'aluminum',
    displacementL: 1.8,
    massKg: 122,
    mountStiffnessMult: 1.16,
    mountBreakMult: 1.1,
    blockToughness: 1.05,
    sizeL: 0.60,
    sizeW: 0.72,
    blockColor: '#64748b',
    headColor: '#cbd5e1',
    valveCoverColor: '#dc2626',
    valveCoverAccent: '#f8fafc',
    intakeColor: '#b91c1c',
    factoryTurboId: 'trb_t25',
    hasTopMountIntercooler: true,
    idleVibMult: 1.06,
  },
  eng_20_t: {
    id: 'eng_20_t',
    label: '2.0 Turbo',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'tsi_direct',
    blockMaterial: 'aluminum',
    displacementL: 2.0,
    massKg: 132,
    mountStiffnessMult: 1.14,
    mountBreakMult: 1.08,
    blockToughness: 1.02,
    sizeL: 0.64,
    sizeW: 0.60,
    blockColor: '#475569',
    headColor: '#cbd5e1',
    valveCoverColor: '#1e293b',
    valveCoverAccent: '#f59e0b',
    intakeColor: '#94a3b8',
    factoryTurboId: 'trb_t28',
    idleVibMult: 0.94,
  },
  eng_25_t5: {
    id: 'eng_25_t5',
    label: '2.5 T5',
    cylinders: 5,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'aluminum',
    displacementL: 2.5,
    massKg: 150,
    mountStiffnessMult: 1.18,
    mountBreakMult: 1.12,
    blockToughness: 1.08,
    sizeL: 0.68,
    sizeW: 0.64,
    blockColor: '#64748b',
    headColor: '#cbd5e1',
    valveCoverColor: '#27272a',
    valveCoverAccent: '#ef4444',
    intakeColor: '#94a3b8',
    factoryTurboId: 'trb_t28',
    idleVibMult: 0.96,
  },

  // === V6 / V8 / V10 ===
  eng_30_t6: {
    id: 'eng_30_t6',
    label: '3.0 V6 Biturbo',
    cylinders: 6,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'tsi_direct',
    blockMaterial: 'aluminum',
    displacementL: 3.0,
    massKg: 185,
    mountStiffnessMult: 1.24,
    mountBreakMult: 1.18,
    blockToughness: 1.1,
    sizeL: 0.68,
    sizeW: 0.68,
    blockColor: '#475569',
    headColor: '#cbd5e1',
    valveCoverColor: '#1e293b',
    valveCoverAccent: '#ef4444',
    intakeColor: '#94a3b8',
    factoryTurboId: 'trb_twinturbo',
    hasTwinPlenum: true,
    idleVibMult: 0.85,
  },
  eng_42_v8: {
    id: 'eng_42_v8',
    label: '4.2 V8',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'aluminum',
    displacementL: 4.2,
    massKg: 210,
    mountStiffnessMult: 1.32,
    mountBreakMult: 1.24,
    blockToughness: 1.16,
    sizeL: 0.72,
    sizeW: 0.72,
    blockColor: '#334155',
    headColor: '#94a3b8',
    valveCoverColor: '#1e3a8a',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#94a3b8',
    idleVibMult: 0.98,
  },
  eng_50_sc_v8: {
    id: 'eng_50_sc_v8',
    label: '5.0 V8 SC',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'cast_iron',
    displacementL: 5.0,
    massKg: 220,
    mountStiffnessMult: 1.42,
    mountBreakMult: 1.32,
    blockToughness: 1.22,
    sizeL: 0.76,
    sizeW: 0.74,
    blockColor: '#334155',
    headColor: '#94a3b8',
    valveCoverColor: '#ea580c',
    valveCoverAccent: '#f8fafc',
    intakeColor: '#cbd5e1',
    factoryTurboId: 'trb_sch',
    hasBlowerStock: true,
    idleVibMult: 1.1,
  },
  eng_52_v10: {
    id: 'eng_52_v10',
    label: '5.2 V10 FSI',
    cylinders: 10,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'vtec_dohc',
    blockMaterial: 'aluminum',
    displacementL: 5.2,
    massKg: 215,
    mountStiffnessMult: 1.46,
    mountBreakMult: 1.34,
    blockToughness: 1.2,
    sizeL: 0.82,
    sizeW: 0.76,
    blockColor: '#334155',
    headColor: '#cbd5e1',
    valveCoverColor: '#dc2626',
    valveCoverAccent: '#fbbf24',
    intakeColor: '#1e293b',
    hasTwinPlenum: true,
    isExotic: true,
    idleVibMult: 0.75,
  },
  eng_62_w12: {
    id: 'eng_62_w12',
    label: '6.2 V8 Charger',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'cast_iron',
    displacementL: 6.2,
    massKg: 245,
    mountStiffnessMult: 1.48,
    mountBreakMult: 1.36,
    blockToughness: 1.25,
    sizeL: 0.78,
    sizeW: 0.76,
    blockColor: '#1e293b',
    headColor: '#94a3b8',
    valveCoverColor: '#dc2626',
    valveCoverAccent: '#f8fafc',
    intakeColor: '#e2e8f0',
    factoryTurboId: 'trb_sch',
    hasBlowerStock: true,
    idleVibMult: 1.14,
  },

  // === PASSENGER & LIGHT COMMERCIAL DIESELS ===
  eng_19_tdi: {
    id: 'eng_19_tdi',
    label: '1.9 TDI',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'diesel_cr',
    blockMaterial: 'cast_iron',
    displacementL: 1.9,
    massKg: 128,
    mountStiffnessMult: 1.18,
    mountBreakMult: 1.15,
    blockToughness: 1.18,
    sizeL: 0.62,
    sizeW: 0.58,
    blockColor: '#334155',
    headColor: '#94a3b8',
    valveCoverColor: '#18181b',
    valveCoverAccent: '#94a3b8',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_vnt',
    isDiesel: true,
    idleVibMult: 1.38,
  },
  eng_22_na_d: {
    id: 'eng_22_na_d',
    label: '2.2 Diesel NA',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_tnvd',
    blockMaterial: 'cast_iron',
    displacementL: 2.2,
    massKg: 140,
    mountStiffnessMult: 1.22,
    mountBreakMult: 1.18,
    blockToughness: 1.2,
    sizeL: 0.64,
    sizeW: 0.56,
    blockColor: '#334155',
    headColor: '#94a3b8',
    valveCoverColor: '#475569',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#64748b',
    hasSideTnvd: true,
    isDiesel: true,
    idleVibMult: 1.42,
  },
  eng_24_td: {
    id: 'eng_24_td',
    label: '2.4 TD',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_tnvd',
    blockMaterial: 'cast_iron',
    displacementL: 2.4,
    massKg: 165,
    mountStiffnessMult: 1.26,
    mountBreakMult: 1.2,
    blockToughness: 1.22,
    sizeL: 0.68,
    sizeW: 0.58,
    blockColor: '#334155',
    headColor: '#94a3b8',
    valveCoverColor: '#475569',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_vnt',
    hasSideTnvd: true,
    isDiesel: true,
    idleVibMult: 1.38,
  },
  eng_28_td_lux: {
    id: 'eng_28_td_lux',
    label: '2.8 24V TD',
    cylinders: 6,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_cr',
    blockMaterial: 'cast_iron',
    displacementL: 2.8,
    massKg: 185,
    mountStiffnessMult: 1.32,
    mountBreakMult: 1.25,
    blockToughness: 1.24,
    sizeL: 0.74,
    sizeW: 0.60,
    blockColor: '#334155',
    headColor: '#94a3b8',
    valveCoverColor: '#1e293b',
    valveCoverAccent: '#38bdf8',
    intakeColor: '#475569',
    factoryTurboId: 'trb_vnt',
    isDiesel: true,
    idleVibMult: 1.25,
  },
  eng_44_v8_td: {
    id: 'eng_44_v8_td',
    label: '4.4 V8 Twin-Turbo D',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_cr',
    blockMaterial: 'cast_iron',
    displacementL: 4.4,
    massKg: 245,
    mountStiffnessMult: 1.44,
    mountBreakMult: 1.34,
    blockToughness: 1.3,
    sizeL: 0.76,
    sizeW: 0.74,
    blockColor: '#1e293b',
    headColor: '#94a3b8',
    valveCoverColor: '#0f172a',
    valveCoverAccent: '#38bdf8',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_twinturbo',
    hasTwinPlenum: true,
    isDiesel: true,
    idleVibMult: 1.2,
  },
  eng_50_v8_td: {
    id: 'eng_50_v8_td',
    label: '5.0 V8 TD Heavy',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'heavy_v_diesel',
    blockMaterial: 'heavy_iron',
    displacementL: 5.0,
    massKg: 310,
    mountStiffnessMult: 1.54,
    mountBreakMult: 1.44,
    blockToughness: 1.42,
    sizeL: 0.76,
    sizeW: 0.74,
    blockColor: '#334155',
    headColor: '#64748b',
    valveCoverColor: '#475569',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_vnt',
    hasCenterTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.42,
  },

  // === HEAVY TRUCKS / SOVIET V8 & V6 DIESELS / BUSES ===
  eng_16_zil_v8: {
    id: 'eng_16_zil_v8',
    label: 'ZIL-130 V8',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'carb_round',
    blockMaterial: 'heavy_iron',
    displacementL: 6.0,
    massKg: 520,
    mountStiffnessMult: 1.58,
    mountBreakMult: 1.48,
    blockToughness: 1.44,
    sizeL: 0.78,
    sizeW: 0.76,
    blockColor: '#1d4ed8',
    headColor: '#64748b',
    valveCoverColor: '#2563eb',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#0f172a',
    hasDistributor: true,
    hasOilBathFilter: true,
    isHeavyTruck: true,
    idleVibMult: 1.38,
  },
  eng_d434_zil_petrol: {
    id: 'eng_d434_zil_petrol',
    label: 'ZIL V8 Heavy',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'heavy_v_diesel',
    blockMaterial: 'heavy_iron',
    displacementL: 6.4,
    massKg: 700,
    mountStiffnessMult: 1.68,
    mountBreakMult: 1.54,
    blockToughness: 1.5,
    sizeL: 0.78,
    sizeW: 0.76,
    blockColor: '#334155',
    headColor: '#64748b',
    valveCoverColor: '#1e3a8a',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#475569',
    hasCenterTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.46,
  },
  eng_yamz_236: {
    id: 'eng_yamz_236',
    label: 'YaMZ-236 V6',
    cylinders: 6,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'heavy_v_diesel',
    blockMaterial: 'heavy_iron',
    displacementL: 11.15,
    massKg: 720,
    mountStiffnessMult: 1.72,
    mountBreakMult: 1.56,
    blockToughness: 1.55,
    sizeL: 0.78,
    sizeW: 0.76,
    blockColor: '#334155',
    headColor: '#64748b',
    valveCoverColor: '#0284c7',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#475569',
    hasCenterTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.55,
  },
  eng_yamz_238: {
    id: 'eng_yamz_238',
    label: 'YaMZ-238 V8',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'heavy_v_diesel',
    blockMaterial: 'heavy_iron',
    displacementL: 14.86,
    massKg: 880,
    mountStiffnessMult: 1.85,
    mountBreakMult: 1.66,
    blockToughness: 1.64,
    sizeL: 0.84,
    sizeW: 0.80,
    blockColor: '#1e293b',
    headColor: '#64748b',
    valveCoverColor: '#0369a1',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#475569',
    factoryTurboId: 'trb_t4',
    hasCenterTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.58,
  },
  eng_kamaz_740: {
    id: 'eng_kamaz_740',
    label: 'KAMAZ-740 V8',
    cylinders: 8,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'heavy_v_diesel',
    blockMaterial: 'heavy_iron',
    displacementL: 10.85,
    massKg: 850,
    mountStiffnessMult: 1.78,
    mountBreakMult: 1.6,
    blockToughness: 1.58,
    sizeL: 0.80,
    sizeW: 0.78,
    blockColor: '#334155',
    headColor: '#64748b',
    valveCoverColor: '#475569',
    valveCoverAccent: '#e2e8f0',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_t4',
    hasCenterTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.52,
  },
  eng_bus_d536: {
    id: 'eng_bus_d536',
    label: 'D536 I6 Bus',
    cylinders: 6,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_tnvd',
    blockMaterial: 'heavy_iron',
    displacementL: 6.7,
    massKg: 640,
    mountStiffnessMult: 1.65,
    mountBreakMult: 1.52,
    blockToughness: 1.5,
    sizeL: 0.82,
    sizeW: 0.64,
    blockColor: '#334155',
    headColor: '#64748b',
    valveCoverColor: '#475569',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_t4',
    hasSideTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.42,
  },

  // === TRACTORS & MACHINERY (MMZ D-243 / D-244 / D-245) ===
  eng_d243_mtz: {
    id: 'eng_d243_mtz',
    label: 'D-243 MMZ',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_tnvd',
    blockMaterial: 'heavy_iron',
    displacementL: 4.75,
    massKg: 430,
    mountStiffnessMult: 1.6,
    mountBreakMult: 1.52,
    blockToughness: 1.52,
    sizeL: 0.78,
    sizeW: 0.68,
    blockColor: '#0369a1',
    headColor: '#64748b',
    valveCoverColor: '#94a3b8',
    valveCoverAccent: '#0f172a',
    intakeColor: '#475569',
    hasSideTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.62,
  },
  eng_d245_mtz: {
    id: 'eng_d245_mtz',
    label: 'D-245 Turbo',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_tnvd',
    blockMaterial: 'heavy_iron',
    displacementL: 4.75,
    massKg: 445,
    mountStiffnessMult: 1.65,
    mountBreakMult: 1.55,
    blockToughness: 1.54,
    sizeL: 0.78,
    sizeW: 0.70,
    blockColor: '#0369a1',
    headColor: '#64748b',
    valveCoverColor: '#cbd5e1',
    valveCoverAccent: '#0f172a',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_t28',
    hasSideTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.58,
  },
  eng_hydro_d244: {
    id: 'eng_hydro_d244',
    label: 'D-244 Hydro',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_tnvd',
    blockMaterial: 'heavy_iron',
    displacementL: 4.75,
    massKg: 390,
    mountStiffnessMult: 1.6,
    mountBreakMult: 1.5,
    blockToughness: 1.5,
    sizeL: 0.76,
    sizeW: 0.68,
    blockColor: '#334155',
    headColor: '#64748b',
    valveCoverColor: '#94a3b8',
    valveCoverAccent: '#1e293b',
    intakeColor: '#475569',
    hasSideTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.55,
  },
  eng_d245_ek12: {
    id: 'eng_d245_ek12',
    label: 'D-245.12S',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'diesel_tnvd',
    blockMaterial: 'heavy_iron',
    displacementL: 4.75,
    massKg: 460,
    mountStiffnessMult: 1.65,
    mountBreakMult: 1.55,
    blockToughness: 1.54,
    sizeL: 0.78,
    sizeW: 0.68,
    blockColor: '#334155',
    headColor: '#64748b',
    valveCoverColor: '#cbd5e1',
    valveCoverAccent: '#1e293b',
    intakeColor: '#64748b',
    factoryTurboId: 'trb_t28',
    hasSideTnvd: true,
    isDiesel: true,
    isHeavyTruck: true,
    idleVibMult: 1.56,
  },

  // === MOTORCYCLES & MOPEDS ===
  eng_izj_2t_350: {
    id: 'eng_izj_2t_350',
    label: 'Izh 350 2T',
    cylinders: 2,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'carb_round',
    blockMaterial: 'aluminum',
    displacementL: 0.35,
    massKg: 38,
    mountStiffnessMult: 0.85,
    mountBreakMult: 0.9,
    blockToughness: 0.9,
    sizeL: 0.42,
    sizeW: 0.42,
    blockColor: '#94a3b8',
    headColor: '#cbd5e1',
    valveCoverColor: '#cbd5e1',
    valveCoverAccent: '#475569',
    intakeColor: '#334155',
    idleVibMult: 1.5,
  },
  eng_jawa_2t_350: {
    id: 'eng_jawa_2t_350',
    label: 'Jawa 350 2T',
    cylinders: 2,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'carb_round',
    blockMaterial: 'aluminum',
    displacementL: 0.35,
    massKg: 32,
    mountStiffnessMult: 0.85,
    mountBreakMult: 0.9,
    blockToughness: 0.9,
    sizeL: 0.42,
    sizeW: 0.42,
    blockColor: '#94a3b8',
    headColor: '#cbd5e1',
    valveCoverColor: '#dc2626',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#334155',
    idleVibMult: 1.45,
  },
  eng_ural_ohv_750: {
    id: 'eng_ural_ohv_750',
    label: 'Ural 750 Boxer',
    cylinders: 2,
    architecture: 'boxer',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'carb_round',
    blockMaterial: 'aluminum',
    displacementL: 0.75,
    massKg: 76,
    mountStiffnessMult: 0.95,
    mountBreakMult: 0.96,
    blockToughness: 1.02,
    sizeL: 0.48,
    sizeW: 0.68,
    blockColor: '#94a3b8',
    headColor: '#cbd5e1',
    valveCoverColor: '#cbd5e1',
    valveCoverAccent: '#334155',
    intakeColor: '#334155',
    idleVibMult: 1.4,
  },
  eng_chopper_v2_1100: {
    id: 'eng_chopper_v2_1100',
    label: '1100 V-Twin',
    cylinders: 2,
    architecture: 'v',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'carb_round',
    blockMaterial: 'aluminum',
    displacementL: 1.1,
    massKg: 108,
    mountStiffnessMult: 1.0,
    mountBreakMult: 1.0,
    blockToughness: 1.04,
    sizeL: 0.54,
    sizeW: 0.52,
    blockColor: '#1e293b',
    headColor: '#cbd5e1',
    valveCoverColor: '#e2e8f0',
    valveCoverAccent: '#334155',
    intakeColor: '#cbd5e1',
    idleVibMult: 1.45,
  },
  eng_moto4t_600: {
    id: 'eng_moto4t_600',
    label: '600 I4 Sport',
    cylinders: 4,
    architecture: 'inline',
    defaultOrientation: 'transverse',
    fuelLayout: 'dohc_16v',
    blockMaterial: 'aluminum',
    displacementL: 0.6,
    massKg: 58,
    mountStiffnessMult: 1.05,
    mountBreakMult: 1.0,
    blockToughness: 0.98,
    sizeL: 0.50,
    sizeW: 0.56,
    blockColor: '#334155',
    headColor: '#94a3b8',
    valveCoverColor: '#475569',
    valveCoverAccent: '#cbd5e1',
    intakeColor: '#1e293b',
    idleVibMult: 0.95,
  },
  eng_50cc_2t: {
    id: 'eng_50cc_2t',
    label: '50cc 2T',
    cylinders: 1,
    architecture: 'single',
    defaultOrientation: 'longitudinal',
    fuelLayout: 'carb_round',
    blockMaterial: 'aluminum',
    displacementL: 0.05,
    massKg: 12,
    mountStiffnessMult: 0.75,
    mountBreakMult: 0.85,
    blockToughness: 0.85,
    sizeL: 0.34,
    sizeW: 0.34,
    blockColor: '#94a3b8',
    headColor: '#cbd5e1',
    valveCoverColor: '#cbd5e1',
    valveCoverAccent: '#475569',
    intakeColor: '#334155',
    idleVibMult: 1.6,
  },
};

const TURBO_MASS_KG: Record<string, number> = {
  trb_none: 0,
  trb_t25: 9,
  trb_t28: 13,
  trb_t4: 19,
  trb_vnt: 14,
  trb_twinturbo: 26,
  trb_sch: 28,
};

const TRANS_MASS_KG: Record<string, number> = {
  MT: 50,
  AT: 72,
  DSG: 62,
  AMT: 50,
  CVT: 58,
  HYDRO: 90,
  RANGE: 210,
};

function inferDefaultEngineId(carType?: string): string {
  switch (carType) {
    case 'compact_matiz':
    case 'micro_car':
      return 'eng_08_3cil_econ';
    case 'retro_bubble':
    case 'classic_compact':
    case 'sedan_classic':
    case 'liftback_tavria':
    case 'wagon_classic':
      return 'eng_12_soviet';
    case 'hatch_samara':
    case 'sedan_samara':
      return 'eng_15_soviet';
    case 'sedan_logan':
    case 'sedan_nexia':
    case 'sedan_compact':
    case 'sedan_accent':
    case 'sedan_polo':
      return 'eng_16_8v';
    case 'hatch_hot':
    case 'sports':
    case 'coupe_gt':
      return 'eng_20_t';
    case 'muscle':
    case 'muscle_classic':
      return 'eng_50_sc_v8';
    case 'supercar':
      return 'eng_52_v10';
    case 'sedan_luxury':
    case 'suv_luxury':
      return 'eng_42_v8';
    case 'suv':
    case 'suv_classic_box':
    case 'offroad_hardcore':
      return 'eng_30_t6';
    case 'pickup':
    case 'pickup_heavy':
      return 'eng_42_v8';
    case 'van':
    case 'van_camper':
    case 'van_cargo_old':
    case 'ambulance':
    case 'ambulance_van':
    case 'delivery_truck':
      return 'eng_24_td';
    case 'truck_flatbed':
      return 'eng_16_zil_v8';
    case 'truck_zil_dump':
      return 'eng_16_zil_v8';
    case 'truck_water':
      return 'eng_50_v8_td';
    case 'truck_semi':
      return 'eng_kamaz_740';
    case 'bus':
    case 'bus_minibus':
      return 'eng_bus_d536';
    case 'tractor_mtz82':
      return 'eng_d245_mtz';
    case 'tractor_mtz80':
    case 'tractor_mtz80_old':
      return 'eng_d243_mtz';
    case 'excavator_ek12':
      return 'eng_d245_ek12';
    case 'paver_asphalt_wheeled':
    case 'roller_heavy_tandem':
    case 'roller_compact_sidewalk':
    case 'roller_pneumatic':
      return 'eng_hydro_d244';
    case 'moto_izh_jupiter':
      return 'eng_izj_2t_350';
    case 'moto_jawa350':
      return 'eng_jawa_2t_350';
    case 'moto_ural_sidecar':
      return 'eng_ural_ohv_750';
    case 'moto_chopper':
      return 'eng_chopper_v2_1100';
    case 'moto_sport':
      return 'eng_moto4t_600';
    case 'moped_soviet':
      return 'eng_50cc_2t';
    default:
      return 'eng_20_na';
  }
}

const LONGITUDINAL_TYPES = new Set<string>([
  'sedan_classic',
  'classic_compact',
  'wagon_classic',
  'muscle',
  'muscle_classic',
  'coupe_gt',
  'supercar',
  'sedan_luxury',
  'suv',
  'suv_luxury',
  'suv_classic_box',
  'offroad_hardcore',
  'ambulance_suv',
  'pickup',
  'pickup_heavy',
  'van',
  'van_camper',
  'van_cargo_old',
  'ambulance',
  'ambulance_van',
  'delivery_truck',
  'truck_flatbed',
  'truck_zil_dump',
  'truck_water',
  'truck_semi',
  'bus',
  'bus_minibus',
  'tractor_mtz82',
  'tractor_mtz80',
  'tractor_mtz80_old',
]);

export function resolveEngineBlueprint(car: {
  type?: string;
  engineState?: EngineState;
  hasGBO?: boolean;
  fuelSystem?: { gboInstalled?: boolean };
  hasChiptuning?: boolean;
}): ResolvedEngineModifier {
  const eng = car.engineState;
  const engId = (eng?.engineId && ENGINE_BLUEPRINTS[eng.engineId])
    ? eng.engineId
    : inferDefaultEngineId(car.type);
  const spec = ENGINE_BLUEPRINTS[engId] || ENGINE_BLUEPRINTS.eng_20_na;

  // Orientation: V-engines, boxers, I6, heavy diesels & RWD/truck/tractor platforms are longitudinal;
  // compact 3/4/5-cylinders on FWD passenger bodies stay transverse.
  let orientation: EngineOrientation = spec.defaultOrientation;
  if (
    spec.architecture === 'v' ||
    spec.architecture === 'boxer' ||
    spec.cylinders >= 6 ||
    spec.isHeavyTruck ||
    (car.type && LONGITUDINAL_TYPES.has(car.type))
  ) {
    orientation = 'longitudinal';
  }

  // Resolve real selected turbo/supercharger kit (or engine's factory turbo if previewing by engineId alone)
  const rawTurboId = (eng?.turboKitId && eng.turboKitId !== 'trb_none')
    ? eng.turboKitId
    : (eng?.turboSpec?.id || (!eng?.turboKitId && spec.factoryTurboId) || 'trb_none');
  let turboKind: TurboVisualKind = 'none';
  let turboScale = 1.0;

  if (rawTurboId === 'trb_sch' || eng?.turboSpec?.isSupercharged) {
    turboKind = 'supercharger';
    turboScale = spec.cylinders >= 8 ? 1.2 : 1.0;
  } else if (rawTurboId === 'trb_twinturbo' || eng?.turboSpec?.isTwin) {
    turboKind = 'twin';
    turboScale = spec.cylinders >= 8 ? 1.15 : 0.95;
  } else if (rawTurboId === 'trb_t4') {
    turboKind = 'single';
    turboScale = 1.32;
  } else if (rawTurboId === 'trb_t28') {
    turboKind = 'single';
    turboScale = 1.08;
  } else if (rawTurboId === 'trb_t25' || rawTurboId === 'trb_vnt') {
    turboKind = 'single';
    turboScale = 0.88;
  } else if (eng?.turboSpec && eng.turboSpec.boostMax > 0) {
    turboKind = 'single';
    turboScale = 1.0;
  } else if (spec.hasBlowerStock && !eng?.turboKitId) {
    turboKind = 'supercharger';
    turboScale = 1.18;
  }

  const turboMassKg = TURBO_MASS_KG[rawTurboId] ?? (turboKind === 'none' ? 0 : 14);
  const transKind = (eng?.transmissionKind || (eng?.transmissionType === 'AUTO' ? 'AT' : 'MT')) as ResolvedEngineModifier['transmissionKind'];
  const transmissionMassKg = TRANS_MASS_KG[transKind] ?? 50;
  const tuneChipLevel = eng?.chipLevel ?? (car.hasChiptuning ? 2 : 0);
  const isAftermarketTurbo =
    turboKind !== 'none' &&
    !spec.isDiesel &&
    !spec.hasBlowerStock &&
    rawTurboId !== spec.factoryTurboId &&
    (rawTurboId === 'trb_t28' || rawTurboId === 'trb_t4' || rawTurboId === 'trb_twinturbo' || rawTurboId === 'trb_sch');

  const hasSportIntake =
    tuneChipLevel >= 1 ||
    spec.fuelLayout === 'vtec_dohc' ||
    spec.isExotic ||
    isAftermarketTurbo ||
    car.type === 'sports' ||
    car.type === 'coupe_gt' ||
    car.type === 'hatch_hot' ||
    car.type === 'supercar';

  const hasStrutBrace =
    tuneChipLevel >= 1 ||
    spec.isExotic ||
    spec.fuelLayout === 'vtec_dohc' ||
    car.type === 'sports' ||
    car.type === 'coupe_gt' ||
    car.type === 'supercar' ||
    car.type === 'hatch_hot';

  const hasGBO = !!(car.hasGBO || car.fuelSystem?.gboInstalled);
  const totalPowertrainMassKg = spec.massKg + turboMassKg + transmissionMassKg;

  // Forced-induction plumbing & higher engine weight mildly alter mount specs
  const massMountBonus = Math.min(0.25, turboMassKg * 0.004);
  const effectiveMountStiffness = spec.mountStiffnessMult + massMountBonus;
  const effectiveMountBreak = spec.mountBreakMult + massMountBonus * 0.6;
  const effectiveBlockToughness = spec.blockToughness;

  return {
    spec,
    orientation,
    turboKind,
    turboKitId: rawTurboId,
    turboScale,
    turboMassKg,
    isAftermarketTurbo,
    transmissionKind: transKind,
    transmissionMassKg,
    tuneChipLevel,
    hasSportIntake,
    hasStrutBrace,
    hasGBO,
    totalPowertrainMassKg,
    effectiveMountStiffness,
    effectiveMountBreak,
    effectiveBlockToughness,
  };
}

/**
 * Exact local-space engine bay & hood bounds aligned with `vehicleArchetypes.ts`
 * and `getVehicleCabinDimensions`.
 */
export function getEngineBayLayout(
  car: Vehicle,
  halfL: number,
  halfW: number,
  fc: number,
  rc: number,
  cabinX: number,
  cabinL: number,
  cabinW: number
): EngineBayBounds {
  const type = car.type;
  const isTrailer =
    car.isTrailer ||
    type.startsWith('trailer_') ||
    type === 'trailer_barrel' ||
    type === 'trailer_flatbed_2axle';
  const isMoto = type.startsWith('moto_') || type === 'moped_soviet';
  const isRoadMach =
    type === 'paver_asphalt_wheeled' ||
    type === 'roller_heavy_tandem' ||
    type === 'roller_compact_sidewalk' ||
    type === 'roller_pneumatic' ||
    type === 'excavator_ek12';

  if (isTrailer || isMoto || isRoadMach) {
    return {
      zone: 'none',
      bayX1: 0,
      bayX2: 0,
      bayHalfW: 0,
      hoodX1: 0,
      hoodX2: 0,
      hoodHalfW: 0,
      hingeSide: 'rear',
      isTransparentCover: false,
      isNarrowTractorBonnet: false,
      isTruckHood: false,
      isCabOver: false,
    };
  }

  // 1. Supercar: rear mid-engine glass bay
  if (type === 'supercar') {
    const engX = cabinX - cabinL * 0.65;
    const engL = halfL * 0.52;
    const engW = halfW * 1.35;
    const x1 = engX - engL * 0.5;
    const x2 = engX + engL * 0.5;
    return {
      zone: 'mid_rear',
      bayX1: x1 + 0.7,
      bayX2: x2 - 0.7,
      bayHalfW: engW * 0.46,
      hoodX1: x1,
      hoodX2: x2,
      hoodHalfW: engW * 0.5,
      hingeSide: 'front',
      isTransparentCover: true,
      isNarrowTractorBonnet: false,
      isTruckHood: false,
      isCabOver: false,
    };
  }

  // 2. Full-size rear-engine bus
  if (type === 'bus') {
    const x1 = -halfL + rc + 1.2;
    const x2 = -halfL + rc + Math.min(halfL * 0.42, 16);
    const hw = halfW * 0.72;
    return {
      zone: 'rear',
      bayX1: x1 + 0.8,
      bayX2: x2 - 0.6,
      bayHalfW: hw - 0.7,
      hoodX1: x1,
      hoodX2: x2,
      hoodHalfW: hw,
      hingeSide: 'front',
      isTransparentCover: false,
      isNarrowTractorBonnet: false,
      isTruckHood: false,
      isCabOver: false,
    };
  }

  // 3. Tractors (MTZ-80 / MTZ-82): narrow front diesel bonnet
  if (type === 'tractor_mtz82' || type === 'tractor_mtz80' || type === 'tractor_mtz80_old') {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc - 0.5;
    const hoodHalfW = halfW * 0.35;
    return {
      zone: 'front',
      bayX1: hoodX1 + 0.5,
      bayX2: hoodX2 - 0.8,
      bayHalfW: Math.max(2.6, hoodHalfW - 0.45),
      hoodX1,
      hoodX2,
      hoodHalfW,
      hingeSide: 'rear',
      isTransparentCover: false,
      isNarrowTractorBonnet: true,
      isTruckHood: false,
      isCabOver: false,
    };
  }

  // 4. Hooded trucks (GAZ-53, ZIL-130, ZIL-4331)
  const isGaz = type === 'truck_flatbed' || car.frameId?.startsWith('frm_gaz');
  const isZil130 = type === 'truck_zil_dump' || car.frameId?.startsWith('frm_zil130');
  const isZil4331 = type === 'truck_water' || car.frameId?.startsWith('frm_zil4331');
  if (isGaz || isZil130 || isZil4331) {
    const hoodX1 = cabinX + cabinL / 2;
    const hoodX2 = halfL - fc - 0.5;
    const hoodHalfW = isZil4331 ? halfW * 0.74 : (isZil130 ? halfW * 0.67 : halfW * 0.64);
    return {
      zone: 'front',
      bayX1: hoodX1 + 0.6,
      bayX2: hoodX2 - 0.9,
      bayHalfW: Math.max(3.8, hoodHalfW - 0.75),
      hoodX1,
      hoodX2,
      hoodHalfW,
      hingeSide: 'rear',
      isTransparentCover: false,
      isNarrowTractorBonnet: false,
      isTruckHood: true,
      isCabOver: false,
    };
  }

  // 5. Cab-over trucks (KAMAZ)
  const isKamaz =
    type === 'truck_semi' ||
    car.frameId?.startsWith('frm_kamaz');
  if (isKamaz) {
    const x1 = cabinX - cabinL * 0.36;
    const x2 = cabinX + cabinL * 0.40;
    const hw = Math.min(halfW * 0.64, cabinW * 0.40);
    return {
      zone: 'cabover',
      bayX1: x1,
      bayX2: x2,
      bayHalfW: hw,
      hoodX1: cabinX - cabinL * 0.48,
      hoodX2: cabinX + cabinL * 0.48,
      hoodHalfW: cabinW * 0.48,
      hingeSide: 'front',
      isTransparentCover: false,
      isNarrowTractorBonnet: false,
      isTruckHood: false,
      isCabOver: true,
    };
  }

  // 6. Standard front-engine vehicles (sedans, hatchbacks, wagons, pickups, SUVs, muscle, vans, ambulances, minibuses)
  const cowlX = cabinX + cabinL / 2;
  const noseX = halfL - fc - 0.9;
  const availLen = noseX - cowlX;
  if (availLen < 4.0) {
    // Very short cab-forward van/minibus: tuck bay slightly under front cowl
    const x1 = Math.max(cabinX + cabinL * 0.12, noseX - 9.0);
    const x2 = Math.max(x1 + 5.5, noseX);
    const hw = halfW * 0.72;
    return {
      zone: 'front',
      bayX1: x1 + 0.6,
      bayX2: x2 - 0.6,
      bayHalfW: hw - 0.8,
      hoodX1: x1,
      hoodX2: x2,
      hoodHalfW: hw,
      hingeSide: 'rear',
      isTransparentCover: false,
      isNarrowTractorBonnet: false,
      isTruckHood: false,
      isCabOver: false,
    };
  }

  const hoodHalfW = Math.min(halfW - 1.35, Math.max(cabinW * 0.44, halfW * 0.78));
  return {
    zone: 'front',
    bayX1: cowlX + 0.65,
    bayX2: noseX - 0.75,
    bayHalfW: Math.max(3.2, hoodHalfW - 0.85),
    hoodX1: cowlX,
    hoodX2: noseX,
    hoodHalfW,
    hingeSide: 'rear',
    isTransparentCover: false,
    isNarrowTractorBonnet: false,
    isTruckHood: false,
    isCabOver: false,
  };
}

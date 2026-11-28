import type { Vehicle } from './types';
import type { VehicleRenderContext } from './vehicleArchetypes';
import { getVehicleTurnSignalDynamicState } from './vehicleHelpers';
import { traceSoftbodyPath } from './softbodyVisuals';
import { getEngineBayLayout } from './engineBlueprint';
import {
  createArticulatedHoodDeform,
  drawDetachedHoodHingeStubs,
  drawNativeHoodOverEffects,
  drawNativeHoodUnderEffects,
  getVehicleHoodOpenProgress,
  isVehicleHoodVisualOpenOrBuckled,
  renderMuscleBlowerScoop,
} from './engineBayVisuals';

/**
 * All 35 passenger, sport, coupe, muscle, wagon, hatchback, micro, SUV,
 * patrol, rescue-4x4, and pickup car types rendered with bespoke integrated
 * top-down automotive artwork (zero generic programmatic bumper/lamp overlays).
 */
export const REDRAWN_PASSENGER_CAR_TYPES: ReadonlySet<string> = new Set([
  // Sedans (12)
  'sedan',
  'taxi',
  'police',
  'sedan_classic',
  'sedan_compact',
  'sedan_logan',
  'sedan_nexia',
  'sedan_accent',
  'sedan_polo',
  'sedan_samara',
  'sedan_luxury',
  'classic_compact',
  // Wagons (3)
  'wagon_classic',
  'wagon_modern',
  'wagon_allroad',
  // Hatchbacks / Liftbacks / Micro / Retro (7)
  'hatchback',
  'hatch_hot',
  'hatch_samara',
  'liftback_tavria',
  'compact_matiz',
  'micro_car',
  'retro_bubble',
  // Sports / Supercars / Muscle (5)
  'sports',
  'supercar',
  'coupe_gt',
  'muscle_classic',
  'muscle',
  // SUVs / Crossovers / Offroad / Pickups (8)
  'suv',
  'crossover_compact',
  'suv_luxury',
  'suv_classic_box',
  'offroad_hardcore',
  'ambulance_suv',
  'pickup',
  'pickup_heavy',
]);

export function isRedrawnPassengerCar(type: string | undefined | null): boolean {
  return !!type && REDRAWN_PASSENGER_CAR_TYPES.has(type);
}

// ============================================================================
// CACHED COLOR & AUTOMOTIVE CLEARCOAT SHADING UTILITIES
// ============================================================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

const rgbCache = new Map<string, RGB>();
const shadeCache = new Map<string, string>();

function parseColor(color: string | undefined): RGB {
  const key = (color || '#64748b').trim().toLowerCase();
  const hit = rgbCache.get(key);
  if (hit) return hit;

  let r = 100;
  let g = 116;
  let b = 139;

  if (key.startsWith('#')) {
    const hex = key.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) || 0;
      g = parseInt(hex[1] + hex[1], 16) || 0;
      b = parseInt(hex[2] + hex[2], 16) || 0;
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16) || 0;
      g = parseInt(hex.slice(2, 4), 16) || 0;
      b = parseInt(hex.slice(4, 6), 16) || 0;
    }
  } else if (key.startsWith('rgb')) {
    const m = key.match(/\d+/g);
    if (m && m.length >= 3) {
      r = Math.min(255, parseInt(m[0], 10) || 0);
      g = Math.min(255, parseInt(m[1], 10) || 0);
      b = Math.min(255, parseInt(m[2], 10) || 0);
    }
  }

  const out: RGB = { r, g, b };
  if (rgbCache.size < 2048) rgbCache.set(key, out);
  return out;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Shifts a paint color brighter (amount > 0, toward specular highlight)
 * or darker (amount < 0, toward deep clearcoat shadow).
 */
function shadePaint(color: string | undefined, amount: number): string {
  const key = `${color || '#64748b'}|${amount.toFixed(2)}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;

  const { r, g, b } = parseColor(color);
  let nr: number;
  let ng: number;
  let nb: number;

  if (amount >= 0) {
    // Specular metallic highlight shifts slightly warm-white
    nr = r + (255 - r) * amount;
    ng = g + (255 - g) * amount;
    nb = b + (255 - b) * (amount * 0.96);
  } else {
    // Deep clearcoat ambient shadow retains cool richness
    const f = 1 + amount;
    nr = r * f;
    ng = g * f;
    nb = b * Math.min(1, f * 1.06);
  }

  const res = `rgb(${clampByte(nr)},${clampByte(ng)},${clampByte(nb)})`;
  if (shadeCache.size < 4096) shadeCache.set(key, res);
  return res;
}

function colorLuminance(color: string | undefined): number {
  const { r, g, b } = parseColor(color);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isReverseActive(car: Vehicle): boolean {
  if (car.engineState) {
    if (car.engineState.transmissionType === 'AUTO') {
      return car.engineState.autoGearMode === 'R';
    }
    return car.engineState.currentGear === -1;
  }
  return !!car.isReversing;
}

// ============================================================================
// DEFORM-AWARE AUTOMOTIVE VECTOR PRIMITIVES
// ============================================================================

type Pt = [number, number];
type DeformFn = (x: number, y: number) => [number, number];

function tracePoly(ctx: CanvasRenderingContext2D, pts: Pt[], deform: DeformFn, close = true): void {
  if (pts.length === 0) return;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [dx, dy] = deform(pts[i][0], pts[i][1]);
    if (i === 0) ctx.moveTo(dx, dy);
    else ctx.lineTo(dx, dy);
  }
  if (close) ctx.closePath();
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  fill: string | CanvasGradient,
  deform: DeformFn,
  stroke?: string,
  lineWidth = 0.5
): void {
  tracePoly(ctx, pts, deform, true);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function strokePoly(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  stroke: string,
  lineWidth: number,
  deform: DeformFn,
  close = false
): void {
  tracePoly(ctx, pts, deform, close);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient | null,
  deform: DeformFn,
  stroke?: string,
  lineWidth = 0.5
): void {
  if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return;
  const cr = Math.min(Math.max(0, r), w * 0.48, h * 0.48);
  const pts: Pt[] = cr < 0.15
    ? [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ]
    : [
        [x + cr, y],
        [x + w - cr, y],
        [x + w - cr * 0.25, y + cr * 0.25],
        [x + w, y + cr],
        [x + w, y + h - cr],
        [x + w - cr * 0.25, y + h - cr * 0.25],
        [x + w - cr, y + h],
        [x + cr, y + h],
        [x + cr * 0.25, y + h - cr * 0.25],
        [x, y + h - cr],
        [x, y + cr],
        [x + cr * 0.25, y + cr * 0.25],
      ];
  tracePoly(ctx, pts, deform, true);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function drawMirroredQuad(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number,
  side: -1 | 1,
  fill: string | CanvasGradient,
  deform: DeformFn,
  stroke?: string,
  lineWidth = 0.4
): void {
  fillPoly(
    ctx,
    [
      [x1, y1 * side],
      [x2, y2 * side],
      [x3, y3 * side],
      [x4, y4 * side],
    ],
    fill,
    deform,
    stroke,
    lineWidth
  );
}

// ============================================================================
// LIVE INTEGRATED OPTICS STATE & RENDERING
// ============================================================================

interface CarLightState {
  headlightsOn: boolean;
  isHighBeam: boolean;
  positionOn: boolean;
  drlOn: boolean;
  frontFogOn: boolean;
  rearFogOn: boolean;
  braking: boolean;
  reversing: boolean;
  leftSignal: boolean;
  rightSignal: boolean;
  turnIntensity: number;
  turnSweep: number;
  turnType: string;
  hasMirrorRepeaters: boolean;
  hasFenderRepeaters: boolean;
  repeaterStyle: string;
  leftFrontBroken: boolean;
  rightFrontBroken: boolean;
  leftRearBroken: boolean;
  rightRearBroken: boolean;
  sirenOn: boolean;
}

function computeCarLightState(car: Vehicle, nightAlpha: number): CarLightState {
  const dmg = car.damage;
  const isPlayer = car.isPlayerControlled;
  const headlightsOn = isPlayer
    ? !!car.headlightsOn
    : !!(car.headlightsOn || (nightAlpha > 0.05 && !car.isParked));
  const isHighBeam = headlightsOn && car.headlightMode === 'high';
  const positionOn = !!(car.positionLightsOn || headlightsOn);
  const drlOn = !!(car.engineState?.engineRunning || car.engineState?.ignition || positionOn);
  const frontFogOn = !!car.frontFogLightsOn;
  const rearFogOn = !!car.rearFogLightsOn;
  const braking = !!car.brakeLightsOn;
  const reversing = isReverseActive(car);

  const turnDyn = getVehicleTurnSignalDynamicState(car);
  const leftSignal = car.turnSignal === 'left' || car.turnSignal === 'hazard';
  const rightSignal = car.turnSignal === 'right' || car.turnSignal === 'hazard';

  return {
    headlightsOn,
    isHighBeam,
    positionOn,
    drlOn,
    frontFogOn,
    rearFogOn,
    braking,
    reversing,
    leftSignal,
    rightSignal,
    turnIntensity: turnDyn.intensity,
    turnSweep: turnDyn.sweepProgress,
    turnType: turnDyn.config.type,
    hasMirrorRepeaters: !!turnDyn.config.hasSideMirrorRepeaters,
    hasFenderRepeaters: !!turnDyn.config.hasFenderRepeaters,
    repeaterStyle: turnDyn.config.repeaterStyle || 'fender_rect',
    leftFrontBroken: !!dmg?.leftHeadlightBroken,
    rightFrontBroken: !!dmg?.rightHeadlightBroken,
    leftRearBroken: !!dmg?.leftTaillightBroken,
    rightRearBroken: !!dmg?.rightTaillightBroken,
    sirenOn: !!car.sirenOn,
  };
}

// ============================================================================
// PER-MODEL DESIGN SPECIFICATIONS (ALL 35 PASSENGER CARS)
// ============================================================================

type BodyClass =
  | 'sedan'
  | 'wagon'
  | 'hatch'
  | 'micro'
  | 'retro_bubble'
  | 'coupe'
  | 'supercar'
  | 'muscle'
  | 'suv'
  | 'box4x4'
  | 'pickup';

type FrontLampStyle =
  | 'round_single'
  | 'round_twin'
  | 'rect_block'
  | 'swept_led'
  | 'razor_blade'
  | 'bug_eye'
  | 'matrix_lux'
  | 'c_clamp_truck'
  | 'split_drl'
  | 'muscle_recessed';

type RearLampStyle =
  | 'classic_slim'
  | 'classic_horiz'
  | 'classic_vert_estate'
  | 'samara_slat'
  | 'modern_split_led'
  | 'full_lightbar'
  | 'quad_sport'
  | 'muscle_triple'
  | 'truck_vertical'
  | 'micro_dot'
  | 'suv_wrap';

type GrilleStyle =
  | 'chrome_classic'
  | 'chrome_luxury'
  | 'dark_mesh'
  | 'sport_hex_red'
  | 'wide_slats'
  | 'narrow_euro'
  | 'truck_crossbar'
  | 'truck_hd_chrome'
  | 'supercar_ducts'
  | 'muscle_blackout'
  | 'retro_minimal'
  | 'offroad_winch';

type BumperStyle =
  | 'body_modern'
  | 'chrome_blade'
  | 'unpainted_90s'
  | 'cladding_offroad'
  | 'carbon_splitter'
  | 'steel_heavy'
  | 'police_pushbar'
  | 'ambulance_guard';

type RoofFeature =
  | 'clean'
  | 'sunroof'
  | 'panoramic'
  | 'rails_only'
  | 'rails_panoramic'
  | 'allroad_rack'
  | 'expedition_rack'
  | 'taxi_sign'
  | 'police_lightbar'
  | 'ambulance_lightbar'
  | 'hd_cab_markers';

type SpoilerStyle =
  | 'none'
  | 'lip'
  | 'hatch_wing'
  | 'hot_hatch_wing'
  | 'gt_wing'
  | 'supercar_active'
  | 'muscle_deck';

interface PassengerCarSpec {
  bodyClass: BodyClass;
  doors: 2 | 4;
  frontLamp: FrontLampStyle;
  rearLamp: RearLampStyle;
  grille: GrilleStyle;
  bumper: BumperStyle;
  roofFeature: RoofFeature;
  spoiler: SpoilerStyle;
  /** Chrome window surround / trim vs modern matte black */
  chromeTrim: boolean;
  /** Cabin geometry as fractions of halfL / halfW */
  wsFrontFrac: number;   // windshield base X / halfL
  wsRearFrac: number;    // windshield top X / halfL
  roofRearFrac: number;  // roof rear X / halfL
  rearGlassFrac: number; // rear glass bottom X / halfL
  cabinWidthFrac: number; // greenhouse base half-width / halfW
  roofWidthFrac: number;  // roof crown half-width / halfW
  /** Sculpted hood detail */
  hoodStyle: 'clean' | 'power_creases' | 'twin_vents' | 'muscle_scoop' | 'shaker_dome' | 'clamshell' | 'aero_ducts' | 'box_louvers' | 'ribbed_classic';
  /** Dual exhaust, quad, center, single */
  exhaust: 'hidden' | 'single_right' | 'dual' | 'dual_chrome' | 'center_twin' | 'quad';
  /** Has rear wiper (wagons, hatches, SUVs) */
  rearWiper?: boolean;
  /** Has fender arch dark cladding */
  archCladding?: boolean;
  /** Has racing stripes */
  racingStripes?: 'none' | 'twin' | 'center_band';
  /** Special livery */
  livery?: 'none' | 'taxi' | 'police_dps' | 'ambulance' | 'tridion_micro';
  /** Rear mounted spare wheel */
  rearSpare?: boolean;
  /** Hood-mounted G-Wagen turn indicator pods */
  hoodTopIndicators?: boolean;
  /** Side running boards */
  runningBoards?: boolean;
  /** Contrasting black roof option */
  blackRoof?: boolean;
  /** Has front fog lamps integrated in bumper */
  hasFrontFogs?: boolean;
  /** Shark-fin vs whip antenna */
  antenna?: 'none' | 'sharkfin' | 'whip_front' | 'whip_rear';
  /** Integrated tow mirrors (wider) */
  towMirrors?: boolean;
}

const CAR_SPECS: Record<string, PassengerCarSpec> = {
  // === SEDANS (12) ===
  sedan: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'modern_split_led',
    grille: 'dark_mesh',
    bumper: 'body_modern',
    roofFeature: 'sunroof',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.22,
    roofRearFrac: -0.34,
    rearGlassFrac: -0.62,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.66,
    hoodStyle: 'power_creases',
    exhaust: 'single_right',
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  taxi: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'modern_split_led',
    grille: 'dark_mesh',
    bumper: 'body_modern',
    roofFeature: 'taxi_sign',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.22,
    roofRearFrac: -0.34,
    rearGlassFrac: -0.62,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.66,
    hoodStyle: 'power_creases',
    exhaust: 'single_right',
    livery: 'taxi',
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  police: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'modern_split_led',
    grille: 'dark_mesh',
    bumper: 'police_pushbar',
    roofFeature: 'police_lightbar',
    spoiler: 'lip',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.22,
    roofRearFrac: -0.35,
    rearGlassFrac: -0.62,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.66,
    hoodStyle: 'power_creases',
    exhaust: 'dual',
    livery: 'police_dps',
    hasFrontFogs: true,
    antenna: 'whip_rear',
  },
  sedan_classic: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'round_twin',
    rearLamp: 'classic_horiz',
    grille: 'chrome_classic',
    bumper: 'chrome_blade',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: true,
    wsFrontFrac: 0.42,
    wsRearFrac: 0.24,
    roofRearFrac: -0.36,
    rearGlassFrac: -0.58,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.72,
    hoodStyle: 'ribbed_classic',
    exhaust: 'single_right',
    antenna: 'whip_front',
  },
  classic_compact: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'round_single',
    rearLamp: 'classic_slim',
    grille: 'chrome_classic',
    bumper: 'chrome_blade',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: true,
    wsFrontFrac: 0.40,
    wsRearFrac: 0.22,
    roofRearFrac: -0.36,
    rearGlassFrac: -0.58,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.72,
    hoodStyle: 'ribbed_classic',
    exhaust: 'single_right',
    antenna: 'whip_front',
  },
  sedan_compact: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'modern_split_led',
    grille: 'wide_slats',
    bumper: 'body_modern',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.45,
    wsRearFrac: 0.21,
    roofRearFrac: -0.34,
    rearGlassFrac: -0.64,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.65,
    hoodStyle: 'power_creases',
    exhaust: 'hidden',
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  sedan_logan: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'rect_block',
    rearLamp: 'classic_horiz',
    grille: 'wide_slats',
    bumper: 'body_modern',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.24,
    roofRearFrac: -0.38,
    rearGlassFrac: -0.60,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.70,
    hoodStyle: 'clean',
    exhaust: 'hidden',
    hasFrontFogs: true,
    antenna: 'whip_front',
  },
  sedan_nexia: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'rect_block',
    rearLamp: 'samara_slat',
    grille: 'narrow_euro',
    bumper: 'body_modern',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.42,
    wsRearFrac: 0.22,
    roofRearFrac: -0.35,
    rearGlassFrac: -0.61,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.68,
    hoodStyle: 'clean',
    exhaust: 'single_right',
    antenna: 'whip_rear',
  },
  sedan_accent: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'modern_split_led',
    grille: 'narrow_euro',
    bumper: 'body_modern',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.22,
    roofRearFrac: -0.35,
    rearGlassFrac: -0.62,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.66,
    hoodStyle: 'power_creases',
    exhaust: 'single_right',
    hasFrontFogs: true,
    antenna: 'whip_rear',
  },
  sedan_polo: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'matrix_lux',
    rearLamp: 'modern_split_led',
    grille: 'narrow_euro',
    bumper: 'body_modern',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.22,
    roofRearFrac: -0.36,
    rearGlassFrac: -0.62,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.68,
    hoodStyle: 'power_creases',
    exhaust: 'hidden',
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  sedan_samara: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'rect_block',
    rearLamp: 'samara_slat',
    grille: 'narrow_euro',
    bumper: 'unpainted_90s',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.42,
    wsRearFrac: 0.22,
    roofRearFrac: -0.36,
    rearGlassFrac: -0.60,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.69,
    hoodStyle: 'clean',
    exhaust: 'single_right',
    antenna: 'whip_front',
  },
  sedan_luxury: {
    bodyClass: 'sedan',
    doors: 4,
    frontLamp: 'matrix_lux',
    rearLamp: 'full_lightbar',
    grille: 'chrome_luxury',
    bumper: 'body_modern',
    roofFeature: 'panoramic',
    spoiler: 'none',
    chromeTrim: true,
    wsFrontFrac: 0.42,
    wsRearFrac: 0.19,
    roofRearFrac: -0.36,
    rearGlassFrac: -0.66,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.66,
    hoodStyle: 'clamshell',
    exhaust: 'dual_chrome',
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },

  // === WAGONS (3) ===
  wagon_classic: {
    bodyClass: 'wagon',
    doors: 4,
    frontLamp: 'round_twin',
    rearLamp: 'classic_vert_estate',
    grille: 'chrome_classic',
    bumper: 'chrome_blade',
    roofFeature: 'rails_only',
    spoiler: 'none',
    chromeTrim: true,
    wsFrontFrac: 0.42,
    wsRearFrac: 0.24,
    roofRearFrac: -0.78,
    rearGlassFrac: -0.92,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.72,
    hoodStyle: 'ribbed_classic',
    exhaust: 'single_right',
    rearWiper: true,
    antenna: 'whip_front',
  },
  wagon_modern: {
    bodyClass: 'wagon',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'modern_split_led',
    grille: 'dark_mesh',
    bumper: 'body_modern',
    roofFeature: 'rails_panoramic',
    spoiler: 'hatch_wing',
    chromeTrim: true,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.22,
    roofRearFrac: -0.76,
    rearGlassFrac: -0.92,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.67,
    hoodStyle: 'power_creases',
    exhaust: 'dual_chrome',
    rearWiper: true,
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  wagon_allroad: {
    bodyClass: 'wagon',
    doors: 4,
    frontLamp: 'matrix_lux',
    rearLamp: 'modern_split_led',
    grille: 'wide_slats',
    bumper: 'cladding_offroad',
    roofFeature: 'allroad_rack',
    spoiler: 'hatch_wing',
    chromeTrim: false,
    wsFrontFrac: 0.43,
    wsRearFrac: 0.21,
    roofRearFrac: -0.76,
    rearGlassFrac: -0.92,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.68,
    hoodStyle: 'power_creases',
    exhaust: 'dual_chrome',
    rearWiper: true,
    archCladding: true,
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },

  // === HATCHBACKS / MICRO / RETRO (7) ===
  hatchback: {
    bodyClass: 'hatch',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'modern_split_led',
    grille: 'dark_mesh',
    bumper: 'body_modern',
    roofFeature: 'clean',
    spoiler: 'hatch_wing',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.20,
    roofRearFrac: -0.66,
    rearGlassFrac: -0.88,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.67,
    hoodStyle: 'power_creases',
    exhaust: 'single_right',
    rearWiper: true,
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  hatch_hot: {
    bodyClass: 'hatch',
    doors: 4,
    frontLamp: 'razor_blade',
    rearLamp: 'full_lightbar',
    grille: 'sport_hex_red',
    bumper: 'carbon_splitter',
    roofFeature: 'panoramic',
    spoiler: 'hot_hatch_wing',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.19,
    roofRearFrac: -0.64,
    rearGlassFrac: -0.88,
    cabinWidthFrac: 0.84,
    roofWidthFrac: 0.66,
    hoodStyle: 'twin_vents',
    exhaust: 'center_twin',
    rearWiper: true,
    blackRoof: true,
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  hatch_samara: {
    bodyClass: 'hatch',
    doors: 4,
    frontLamp: 'rect_block',
    rearLamp: 'samara_slat',
    grille: 'narrow_euro',
    bumper: 'unpainted_90s',
    roofFeature: 'clean',
    spoiler: 'hatch_wing',
    chromeTrim: false,
    wsFrontFrac: 0.42,
    wsRearFrac: 0.20,
    roofRearFrac: -0.64,
    rearGlassFrac: -0.88,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.68,
    hoodStyle: 'clean',
    exhaust: 'single_right',
    rearWiper: true,
    antenna: 'whip_front',
  },
  liftback_tavria: {
    bodyClass: 'hatch',
    doors: 2,
    frontLamp: 'rect_block',
    rearLamp: 'classic_horiz',
    grille: 'narrow_euro',
    bumper: 'unpainted_90s',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.40,
    wsRearFrac: 0.18,
    roofRearFrac: -0.58,
    rearGlassFrac: -0.88,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.69,
    hoodStyle: 'clean',
    exhaust: 'single_right',
    rearWiper: true,
    antenna: 'whip_front',
  },
  compact_matiz: {
    bodyClass: 'micro',
    doors: 4,
    frontLamp: 'bug_eye',
    rearLamp: 'micro_dot',
    grille: 'retro_minimal',
    bumper: 'body_modern',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.50,
    wsRearFrac: 0.24,
    roofRearFrac: -0.66,
    rearGlassFrac: -0.88,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.70,
    hoodStyle: 'clean',
    exhaust: 'hidden',
    rearWiper: true,
    antenna: 'whip_front',
  },
  micro_car: {
    bodyClass: 'micro',
    doors: 2,
    frontLamp: 'bug_eye',
    rearLamp: 'micro_dot',
    grille: 'dark_mesh',
    bumper: 'body_modern',
    roofFeature: 'panoramic',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.54,
    wsRearFrac: 0.26,
    roofRearFrac: -0.68,
    rearGlassFrac: -0.88,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.70,
    hoodStyle: 'clean',
    exhaust: 'hidden',
    livery: 'tridion_micro',
    rearWiper: true,
  },
  retro_bubble: {
    bodyClass: 'retro_bubble',
    doors: 2,
    frontLamp: 'round_single',
    rearLamp: 'classic_slim',
    grille: 'retro_minimal',
    bumper: 'chrome_blade',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: true,
    wsFrontFrac: 0.40,
    wsRearFrac: 0.20,
    roofRearFrac: -0.34,
    rearGlassFrac: -0.56,
    cabinWidthFrac: 0.82,
    roofWidthFrac: 0.66,
    hoodStyle: 'ribbed_classic',
    exhaust: 'single_right',
  },

  // === SPORTS / SUPERCARS / MUSCLE (5) ===
  sports: {
    bodyClass: 'coupe',
    doors: 2,
    frontLamp: 'razor_blade',
    rearLamp: 'quad_sport',
    grille: 'dark_mesh',
    bumper: 'carbon_splitter',
    roofFeature: 'clean',
    spoiler: 'gt_wing',
    chromeTrim: false,
    wsFrontFrac: 0.32,
    wsRearFrac: 0.06,
    roofRearFrac: -0.36,
    rearGlassFrac: -0.74,
    cabinWidthFrac: 0.80,
    roofWidthFrac: 0.60,
    hoodStyle: 'twin_vents',
    exhaust: 'dual_chrome',
    antenna: 'sharkfin',
  },
  supercar: {
    bodyClass: 'supercar',
    doors: 2,
    frontLamp: 'razor_blade',
    rearLamp: 'full_lightbar',
    grille: 'supercar_ducts',
    bumper: 'carbon_splitter',
    roofFeature: 'clean',
    spoiler: 'supercar_active',
    chromeTrim: false,
    wsFrontFrac: 0.42,
    wsRearFrac: 0.14,
    roofRearFrac: -0.22,
    rearGlassFrac: -0.32,
    cabinWidthFrac: 0.78,
    roofWidthFrac: 0.56,
    hoodStyle: 'aero_ducts',
    exhaust: 'center_twin',
    blackRoof: true,
  },
  coupe_gt: {
    bodyClass: 'coupe',
    doors: 2,
    frontLamp: 'matrix_lux',
    rearLamp: 'full_lightbar',
    grille: 'chrome_luxury',
    bumper: 'carbon_splitter',
    roofFeature: 'panoramic',
    spoiler: 'lip',
    chromeTrim: true,
    wsFrontFrac: 0.30,
    wsRearFrac: 0.05,
    roofRearFrac: -0.38,
    rearGlassFrac: -0.72,
    cabinWidthFrac: 0.81,
    roofWidthFrac: 0.61,
    hoodStyle: 'twin_vents',
    exhaust: 'quad',
    antenna: 'sharkfin',
  },
  muscle_classic: {
    bodyClass: 'muscle',
    doors: 2,
    frontLamp: 'round_twin',
    rearLamp: 'muscle_triple',
    grille: 'muscle_blackout',
    bumper: 'chrome_blade',
    roofFeature: 'clean',
    spoiler: 'muscle_deck',
    chromeTrim: true,
    wsFrontFrac: 0.28,
    wsRearFrac: 0.08,
    roofRearFrac: -0.36,
    rearGlassFrac: -0.70,
    cabinWidthFrac: 0.82,
    roofWidthFrac: 0.64,
    hoodStyle: 'power_creases',
    exhaust: 'dual_chrome',
    racingStripes: 'twin',
  },
  muscle: {
    bodyClass: 'muscle',
    doors: 2,
    frontLamp: 'muscle_recessed',
    rearLamp: 'muscle_triple',
    grille: 'muscle_blackout',
    bumper: 'chrome_blade',
    roofFeature: 'clean',
    spoiler: 'muscle_deck',
    chromeTrim: true,
    wsFrontFrac: 0.26,
    wsRearFrac: 0.06,
    roofRearFrac: -0.38,
    rearGlassFrac: -0.68,
    cabinWidthFrac: 0.83,
    roofWidthFrac: 0.66,
    hoodStyle: 'clean',
    exhaust: 'dual_chrome',
    racingStripes: 'center_band',
  },

  // === SUVs / CROSSOVERS / OFFROAD / PICKUPS (8) ===
  suv: {
    bodyClass: 'suv',
    doors: 4,
    frontLamp: 'swept_led',
    rearLamp: 'suv_wrap',
    grille: 'wide_slats',
    bumper: 'cladding_offroad',
    roofFeature: 'rails_only',
    spoiler: 'hatch_wing',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.24,
    roofRearFrac: -0.78,
    rearGlassFrac: -0.92,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.72,
    hoodStyle: 'power_creases',
    exhaust: 'dual',
    rearWiper: true,
    archCladding: true,
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  crossover_compact: {
    bodyClass: 'suv',
    doors: 4,
    frontLamp: 'split_drl',
    rearLamp: 'modern_split_led',
    grille: 'dark_mesh',
    bumper: 'cladding_offroad',
    roofFeature: 'rails_only',
    spoiler: 'hatch_wing',
    chromeTrim: false,
    wsFrontFrac: 0.46,
    wsRearFrac: 0.22,
    roofRearFrac: -0.72,
    rearGlassFrac: -0.90,
    cabinWidthFrac: 0.85,
    roofWidthFrac: 0.67,
    hoodStyle: 'power_creases',
    exhaust: 'dual',
    rearWiper: true,
    archCladding: true,
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  suv_luxury: {
    bodyClass: 'suv',
    doors: 4,
    frontLamp: 'matrix_lux',
    rearLamp: 'suv_wrap',
    grille: 'chrome_luxury',
    bumper: 'body_modern',
    roofFeature: 'rails_panoramic',
    spoiler: 'hatch_wing',
    chromeTrim: true,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.23,
    roofRearFrac: -0.80,
    rearGlassFrac: -0.93,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.73,
    hoodStyle: 'clamshell',
    exhaust: 'dual_chrome',
    rearWiper: true,
    runningBoards: true,
    hasFrontFogs: true,
    antenna: 'sharkfin',
  },
  suv_classic_box: {
    bodyClass: 'box4x4',
    doors: 4,
    frontLamp: 'round_single',
    rearLamp: 'classic_horiz',
    grille: 'wide_slats',
    bumper: 'steel_heavy',
    roofFeature: 'rails_only',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.30,
    roofRearFrac: -0.84,
    rearGlassFrac: -0.93,
    cabinWidthFrac: 0.88,
    roofWidthFrac: 0.78,
    hoodStyle: 'box_louvers',
    exhaust: 'single_right',
    rearWiper: true,
    archCladding: true,
    rearSpare: true,
    hoodTopIndicators: true,
    runningBoards: true,
    hasFrontFogs: true,
  },
  offroad_hardcore: {
    bodyClass: 'box4x4',
    doors: 2,
    frontLamp: 'round_single',
    rearLamp: 'classic_horiz',
    grille: 'offroad_winch',
    bumper: 'steel_heavy',
    roofFeature: 'expedition_rack',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.40,
    wsRearFrac: 0.24,
    roofRearFrac: -0.78,
    rearGlassFrac: -0.92,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.74,
    hoodStyle: 'box_louvers',
    exhaust: 'single_right',
    rearWiper: true,
    archCladding: true,
    rearSpare: true,
    hasFrontFogs: true,
    antenna: 'whip_rear',
  },
  ambulance_suv: {
    bodyClass: 'suv',
    doors: 4,
    frontLamp: 'matrix_lux',
    rearLamp: 'suv_wrap',
    grille: 'wide_slats',
    bumper: 'ambulance_guard',
    roofFeature: 'ambulance_lightbar',
    spoiler: 'hatch_wing',
    chromeTrim: false,
    wsFrontFrac: 0.44,
    wsRearFrac: 0.24,
    roofRearFrac: -0.80,
    rearGlassFrac: -0.93,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.73,
    hoodStyle: 'power_creases',
    exhaust: 'dual',
    livery: 'ambulance',
    rearWiper: true,
    archCladding: true,
    runningBoards: true,
    hasFrontFogs: true,
  },
  pickup: {
    bodyClass: 'pickup',
    doors: 4,
    frontLamp: 'c_clamp_truck',
    rearLamp: 'truck_vertical',
    grille: 'truck_crossbar',
    bumper: 'cladding_offroad',
    roofFeature: 'clean',
    spoiler: 'none',
    chromeTrim: false,
    wsFrontFrac: 0.46,
    wsRearFrac: 0.28,
    roofRearFrac: -0.14,
    rearGlassFrac: -0.22,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.74,
    hoodStyle: 'power_creases',
    exhaust: 'single_right',
    archCladding: true,
    runningBoards: true,
    hasFrontFogs: true,
    antenna: 'whip_front',
  },
  pickup_heavy: {
    bodyClass: 'pickup',
    doors: 4,
    frontLamp: 'c_clamp_truck',
    rearLamp: 'truck_vertical',
    grille: 'truck_hd_chrome',
    bumper: 'steel_heavy',
    roofFeature: 'hd_cab_markers',
    spoiler: 'none',
    chromeTrim: true,
    wsFrontFrac: 0.48,
    wsRearFrac: 0.30,
    roofRearFrac: -0.10,
    rearGlassFrac: -0.18,
    cabinWidthFrac: 0.86,
    roofWidthFrac: 0.74,
    hoodStyle: 'muscle_scoop',
    exhaust: 'dual_chrome',
    archCladding: true,
    runningBoards: true,
    hasFrontFogs: true,
    towMirrors: true,
    antenna: 'whip_front',
  },
};

function getSpec(type: string): PassengerCarSpec {
  return CAR_SPECS[type] || CAR_SPECS.sedan;
}

// ============================================================================
// HIGH-CRAFT TUCKED VULCANIZED WHEEL RENDERER (FOR PASSENGER CARS)
// ============================================================================

export function renderPassengerCarWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wheelL: number,
  wheelW: number,
  steerAngle: number,
  isOffroad = false
): void {
  ctx.save();
  ctx.translate(x, y);
  if (steerAngle !== 0) ctx.rotate(steerAngle);

  const hl = wheelL * 0.5;
  const hw = wheelW * 0.5;
  const r = Math.min(1.1, hw * 0.45);

  // Vulcanized dark rubber carcass
  ctx.fillStyle = '#0d1117';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-hl, -hw, wheelL, wheelW, r);
  } else {
    ctx.rect(-hl, -hw, wheelL, wheelW);
  }
  ctx.fill();

  // Tread crown highlight & subtle transverse sipes
  ctx.fillStyle = isOffroad ? '#242b35' : '#1b222c';
  ctx.fillRect(-hl + 0.7, -hw + 0.35, wheelL - 1.4, wheelW - 0.7);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = isOffroad ? 0.55 : 0.38;
  const step = isOffroad ? 1.55 : 1.9;
  ctx.beginPath();
  for (let tx = -hl + 1.2; tx <= hl - 1.2; tx += step) {
    ctx.moveTo(tx, -hw + 0.2);
    ctx.lineTo(tx, hw - 0.2);
  }
  ctx.stroke();

  // Outer sidewall lip hint (visible when steered out)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 0.4;
  ctx.strokeRect(-hl + 0.3, -hw + 0.3, wheelL - 0.6, wheelW - 0.6);

  ctx.restore();
}

// ============================================================================
// LAYER 1: CHASSIS, SCULPTED BODY SHELL, BUMPERS, GRILLES & INTEGRATED OPTICS
// ============================================================================

export function renderPassengerCarChassisLayer(
  vCtx: VehicleRenderContext,
  bodyPoly: { x: number; y: number }[],
  polyDvs?: { x: number; y: number }[]
): void {
  const { ctx, car, halfL, halfW, fc, rc, deform, nightAlpha } = vCtx;
  const spec = getSpec(car.type);
  const lights = computeCarLightState(car, nightAlpha);
  const hoodBayOpen = spec.bodyClass !== 'supercar' && isVehicleHoodVisualOpenOrBuckled(car);
  const isHeavyPickup = car.type === 'pickup_heavy';

  // Effective base paint color (enforce authentic white base for DPS police & rescue SUV)
  const basePaint =
    spec.livery === 'police_dps'
      ? '#f1f5f9'
      : spec.livery === 'ambulance'
      ? '#f8fafc'
      : (car.color || '#64748b');

  const darkPaint = shadePaint(basePaint, -0.34);
  const midDarkPaint = shadePaint(basePaint, -0.14);
  const brightPaint = shadePaint(basePaint, 0.24);
  const specPaint = shadePaint(basePaint, 0.42);
  const panelSeam = colorLuminance(basePaint) > 0.45 ? 'rgba(15, 23, 42, 0.36)' : 'rgba(2, 6, 23, 0.56)';
  const edgeHighlight = 'rgba(255, 255, 255, 0.22)';

  const frontX = halfL - fc;
  const rearX = -halfL + rc;
  const hoodBackX = halfL * spec.wsFrontFrac;
  const rearDeckStartX = halfL * spec.rearGlassFrac;

  // --- A. CLIPPED BODY SHELL & INTEGRATED SURFACE ARTWORK ---
  ctx.save();
  ctx.beginPath();
  traceSoftbodyPath(ctx, bodyPoly, polyDvs);
  ctx.closePath();
  ctx.clip();

  // 1. Sculpted 3D Metallic Clearcoat Lateral Gradient (top-down studio form)
  const maxBodyW = isHeavyPickup ? halfW + 2.2 : halfW + 0.6;
  const bodyGrad = ctx.createLinearGradient(0, -maxBodyW, 0, maxBodyW);
  bodyGrad.addColorStop(0.0, darkPaint);
  bodyGrad.addColorStop(0.09, midDarkPaint);
  bodyGrad.addColorStop(0.20, brightPaint);
  bodyGrad.addColorStop(0.27, basePaint);
  bodyGrad.addColorStop(0.50, shadePaint(basePaint, 0.10));
  bodyGrad.addColorStop(0.73, basePaint);
  bodyGrad.addColorStop(0.80, brightPaint);
  bodyGrad.addColorStop(0.91, midDarkPaint);
  bodyGrad.addColorStop(1.0, darkPaint);

  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-halfL - 4, -maxBodyW - 2, halfL * 2 + 8, maxBodyW * 2 + 4);

  // Longitudinal subtle nose/tail roll-off shading (gives genuine 3D slope to hood & trunk)
  const longGrad = ctx.createLinearGradient(rearX, 0, frontX, 0);
  longGrad.addColorStop(0.0, 'rgba(2, 6, 23, 0.24)');
  longGrad.addColorStop(0.08, 'rgba(2, 6, 23, 0.04)');
  longGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.04)');
  longGrad.addColorStop(0.90, 'rgba(2, 6, 23, 0.04)');
  longGrad.addColorStop(1.0, 'rgba(2, 6, 23, 0.26)');
  ctx.fillStyle = longGrad;
  ctx.fillRect(-halfL - 4, -maxBodyW - 2, halfL * 2 + 8, maxBodyW * 2 + 4);

  // 2. Special Body-Wide Liveries (Taxi, DPS Police, Ambulance, Smart Tridion Cell, Racing Stripes)
  renderBodyLiveries(ctx, spec, halfL, halfW, frontX, rearX, hoodBackX, rearDeckStartX, basePaint, deform);

  // 3. Molded Wheel-Arch Flanks & Offroad Arch Cladding
  const frontWheelX = car.type === 'supercar' ? halfL * 0.66 : halfL * 0.62;
  const rearWheelX = -halfL * 0.62;
  const archHalfL = Math.min(4.8, halfL * 0.22);

  for (const side of [-1, 1] as const) {
    const edgeY = halfW * side;
    const rearEdgeY = isHeavyPickup ? (halfW + 1.9) * side : edgeY;

    // Subtle sculpted fender haunch shadows over wheel arches
    const drawArchAccent = (ax: number, ey: number, extraClad: boolean) => {
      if (extraClad) {
        fillPoly(
          ctx,
          [
            [ax - archHalfL, ey],
            [ax + archHalfL, ey],
            [ax + archHalfL * 0.82, ey - 1.35 * side],
            [ax - archHalfL * 0.82, ey - 1.35 * side],
          ],
          '#1e242c',
          deform
        );
      } else {
        strokePoly(
          ctx,
          [
            [ax - archHalfL * 0.88, ey - 0.55 * side],
            [ax - archHalfL * 0.45, ey - 1.15 * side],
            [ax + archHalfL * 0.45, ey - 1.15 * side],
            [ax + archHalfL * 0.88, ey - 0.55 * side],
          ],
          edgeHighlight,
          0.55,
          deform
        );
      }
    };

    drawArchAccent(frontWheelX, edgeY, !!spec.archCladding);
    drawArchAccent(rearWheelX, rearEdgeY, !!spec.archCladding);

    // Side rocker sill / lower cladding strip between wheel arches
    if (spec.archCladding || spec.bumper === 'carbon_splitter') {
      const sillCol = spec.bumper === 'carbon_splitter' ? '#141820' : '#222831';
      fillPoly(
        ctx,
        [
          [rearWheelX + archHalfL * 0.85, edgeY],
          [frontWheelX - archHalfL * 0.85, edgeY],
          [frontWheelX - archHalfL * 0.85, edgeY - 0.95 * side],
          [rearWheelX + archHalfL * 0.85, edgeY - 0.95 * side],
        ],
        sillCol,
        deform
      );
    }

    // Dually pickup rear fender flare crease & clearance marker lights
    if (isHeavyPickup) {
      strokePoly(
        ctx,
        [
          [-halfL * 0.16, halfW * 0.98 * side],
          [-halfL * 0.36, (halfW + 1.7) * side],
          [-halfL * 0.88, (halfW + 1.65) * side],
        ],
        panelSeam,
        0.75,
        deform
      );
      // Amber front dually marker & red rear dually marker
      drawRoundedBox(
        ctx,
        -halfL * 0.38,
        (halfW + 0.85) * side - 0.4,
        1.1,
        0.8,
        0.2,
        lights.positionOn ? '#f59e0b' : '#78350f',
        deform
      );
      drawRoundedBox(
        ctx,
        -halfL * 0.86,
        (halfW + 0.80) * side - 0.4,
        1.1,
        0.8,
        0.2,
        lights.positionOn ? '#ef4444' : '#7f1d1d',
        deform
      );
    }

    // Supercar side NACA air intakes ahead of rear haunches
    if (spec.bodyClass === 'supercar') {
      fillPoly(
        ctx,
        [
          [halfL * 0.04, halfW * 0.94 * side],
          [-halfL * 0.34, halfW * 1.02 * side],
          [-halfL * 0.38, halfW * 0.78 * side],
          [-halfL * 0.06, halfW * 0.84 * side],
        ],
        '#0c1017',
        deform,
        'rgba(148,163,184,0.28)',
        0.4
      );
    }

    // Retro bubble (ZAZ-965) side engine-cooling gill scoops on rear quarters
    if (spec.bodyClass === 'retro_bubble') {
      fillPoly(
        ctx,
        [
          [-halfL * 0.24, halfW * 0.96 * side],
          [-halfL * 0.62, halfW * 0.92 * side],
          [-halfL * 0.60, halfW * 0.78 * side],
          [-halfL * 0.28, halfW * 0.84 * side],
        ],
        '#1e293b',
        deform,
        'rgba(226,232,240,0.45)',
        0.35
      );
    }

    // Side body beltline / rub strip & door handles
    const beltY = halfW * 0.86 * side;
    const doorFrontX = halfL * (spec.wsFrontFrac - 0.02);
    const doorRearX = spec.bodyClass === 'pickup'
      ? halfL * (spec.roofRearFrac - 0.06)
      : halfL * (spec.bodyClass === 'coupe' || spec.bodyClass === 'muscle' || spec.bodyClass === 'supercar'
        ? spec.roofRearFrac - 0.06
        : Math.max(-0.56, spec.roofRearFrac - 0.08));
    const doorMidX = (doorFrontX + doorRearX) * 0.48;

    // Subtle shoulder character crease running front to back
    strokePoly(
      ctx,
      [
        [frontX - 3.0, beltY],
        [rearX + 2.8, beltY],
      ],
      edgeHighlight,
      0.45,
      deform
    );

    // Classic chrome side molding strip or 90s black rubber door molding (Samara)
    if (spec.chromeTrim && spec.bodyClass !== 'coupe') {
      strokePoly(
        ctx,
        [
          [frontX - 3.6, halfW * 0.93 * side],
          [rearX + 3.4, halfW * 0.93 * side],
        ],
        'rgba(226, 232, 240, 0.55)',
        0.6,
        deform
      );
    } else if (spec.bumper === 'unpainted_90s') {
      strokePoly(
        ctx,
        [
          [frontWheelX - archHalfL * 0.7, halfW * 0.93 * side],
          [rearWheelX + archHalfL * 0.7, halfW * 0.93 * side],
        ],
        '#181e26',
        0.95,
        deform
      );
    }

    // Door shutlines (front edge, B-pillar seam, rear edge)
    const seamInY = halfW * 0.72 * side;
    const seamOutY = halfW * 0.97 * side;
    strokePoly(ctx, [[doorFrontX, seamInY], [doorFrontX, seamOutY]], panelSeam, 0.5, deform);
    if (spec.doors === 4) {
      strokePoly(ctx, [[doorMidX, seamInY], [doorMidX, seamOutY]], panelSeam, 0.5, deform);
    }
    strokePoly(ctx, [[doorRearX, seamInY], [doorRearX, seamOutY]], panelSeam, 0.5, deform);

    // Flush door handles
    const handleCol = spec.chromeTrim ? '#e2e8f0' : shadePaint(basePaint, -0.38);
    const fHandleX = spec.doors === 4 ? doorMidX + 1.4 : doorRearX + 2.6;
    drawRoundedBox(ctx, fHandleX - 0.95, halfW * 0.87 * side - 0.28, 1.9, 0.56, 0.2, handleCol, deform);
    if (spec.doors === 4) {
      drawRoundedBox(ctx, doorRearX + 1.6 - 0.9, halfW * 0.87 * side - 0.28, 1.8, 0.56, 0.2, handleCol, deform);
    }

    // Side fender turn repeater (authentic flush crystal integrated into front fender)
    if (lights.hasFenderRepeaters) {
      const repX = frontWheelX - archHalfL * 0.95;
      const repY = halfW * 0.92 * side;
      const isLitSide = side < 0 ? lights.leftSignal : lights.rightSignal;
      const litInt = isLitSide ? lights.turnIntensity : 0;
      const repFill = litInt > 0.05
        ? `rgba(245, 158, 11, ${0.55 + 0.45 * litInt})`
        : '#92400e';
      if (lights.repeaterStyle === 'fender_round') {
        const [rx, ry] = deform(repX, repY);
        ctx.fillStyle = repFill;
        ctx.beginPath();
        ctx.arc(rx, ry, 0.65, 0, Math.PI * 2);
        ctx.fill();
        if (litInt > 0.25) {
          ctx.fillStyle = `rgba(254, 240, 138, ${litInt})`;
          ctx.beginPath();
          ctx.arc(rx, ry, 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        drawRoundedBox(ctx, repX - 0.7, repY - 0.3, 1.4, 0.6, 0.2, repFill, deform);
        if (litInt > 0.25) {
          drawRoundedBox(ctx, repX - 0.35, repY - 0.16, 0.7, 0.32, 0.1, `rgba(254, 240, 138, ${litInt})`, deform);
        }
      }
    }
  }

  // Fuel filler door (right rear quarter panel)
  if (spec.bodyClass !== 'pickup') {
    const fuelX = rearWheelX + 0.5;
    drawRoundedBox(ctx, fuelX - 1.0, halfW * 0.77, 2.0, 1.15, 0.35, null, deform, panelSeam, 0.45);
  }

  // 4. Ventilated Cowl, Engine Bay Cavity (when open/buckled/detached), G-Wagen Fender Pods & Supercar Front Nose
  renderSculptedHoodBase(ctx, spec, halfL, halfW, frontX, hoodBackX, hoodBayOpen, basePaint, brightPaint, darkPaint, panelSeam, lights, deform);

  // 5. Rear Deck / Trunk Lid / Pickup Cargo Bed / Supercar Mid-Engine Surround
  renderRearDeckOrBed(ctx, spec, car, halfL, halfW, rearX, rearDeckStartX, basePaint, brightPaint, darkPaint, panelSeam, deform);

  // 6. Integrated Molded Front Bumper & Grille Assembly
  renderIntegratedFrontFascia(ctx, spec, halfL, halfW, frontX, basePaint, darkPaint, panelSeam, lights, deform);

  // 7. Integrated Molded Rear Bumper, Diffuser & License Plate Recess
  renderIntegratedRearFascia(ctx, spec, halfL, isHeavyPickup ? halfW + 1.55 : halfW, rearX, basePaint, darkPaint, panelSeam, deform);

  // 8. Integrated Front Headlights, DRLs, Front Fogs & Front Turn Indicators (100% part of the car model!)
  renderIntegratedFrontOptics(ctx, spec, halfL, halfW, frontX, lights, deform);

  // 9. Integrated Rear Taillights, Brake Lights, Reverse Lights, Rear Fog & Rear Turn Indicators
  renderIntegratedRearOptics(ctx, spec, halfL, halfW, rearX, lights, deform);

  ctx.restore();

  // --- B. CRISP EXTERIOR BODY CONTOUR OUTLINE ---
  ctx.save();
  ctx.beginPath();
  traceSoftbodyPath(ctx, bodyPoly, polyDvs);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.58)';
  ctx.lineWidth = 0.95;
  ctx.stroke();
  ctx.restore();

  // --- C. EXTERIOR INTEGRATED CHASSIS HARDWARE (Exhaust Tips, Running Boards, Pushbar, Winch, Rear Spare) ---
  renderChassisExteriorHardware(ctx, spec, halfL, halfW, frontX, rearX, lights, deform);
}

// ============================================================================
// BODY LIVERIES & STRIPES
// ============================================================================

function renderBodyLiveries(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  frontX: number,
  rearX: number,
  hoodBackX: number,
  rearDeckStartX: number,
  basePaint: string,
  deform: DeformFn
): void {
  // 1. Racing stripes (muscle cars — hood portion is painted directly on the articulated hood panel)
  if (spec.racingStripes === 'twin') {
    const stripeCol = colorLuminance(basePaint) > 0.55 ? '#111827' : '#f1f5f9';
    const xEnd = spec.bodyClass === 'supercar' ? frontX - 1.2 : hoodBackX;
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [rearX + 1.2, 0.55 * side],
          [xEnd, 0.55 * side],
          [xEnd, 2.35 * side],
          [rearX + 1.2, 2.35 * side],
        ],
        stripeCol,
        deform
      );
    }
  } else if (spec.racingStripes === 'center_band') {
    const stripeCol = colorLuminance(basePaint) > 0.55 ? '#0f172a' : '#e2e8f0';
    // Classic rear bumblebee stripe wrapping the tail quarter
    fillPoly(
      ctx,
      [
        [rearX + 3.2, -halfW - 1],
        [rearX + 5.8, -halfW - 1],
        [rearX + 5.8, halfW + 1],
        [rearX + 3.2, halfW + 1],
      ],
      stripeCol,
      deform
    );
  }

  // 2. Taxi livery: crisp gold/black checker side belt + rear trunk badge band
  if (spec.livery === 'taxi') {
    const sqSize = 1.45;
    for (const side of [-1, 1] as const) {
      const yOuter = halfW * 0.97 * side;
      const yInner = halfW * 0.84 * side;
      const yMid = (yOuter + yInner) * 0.5;
      let idx = 0;
      for (let x = rearX + 4.5; x < frontX - 5.0; x += sqSize) {
        const isBlack = idx % 2 === 0;
        fillPoly(
          ctx,
          [[x, yInner], [x + sqSize, yInner], [x + sqSize, yMid], [x, yMid]],
          isBlack ? '#0f172a' : '#facc15',
          deform
        );
        fillPoly(
          ctx,
          [[x, yMid], [x + sqSize, yMid], [x + sqSize, yOuter], [x, yOuter]],
          isBlack ? '#facc15' : '#0f172a',
          deform
        );
        idx++;
      }
    }
  }

  // 3. Police DPS patrol livery (flanks + trunk; hood chevrons & crest live on the articulated hood panel)
  if (spec.livery === 'police_dps') {
    const dpsBlue = '#1d4ed8';
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [rearX + 2.5, halfW * 0.84 * side],
          [frontX - 3.0, halfW * 0.84 * side],
          [frontX - 3.0, halfW * 0.98 * side],
          [rearX + 2.5, halfW * 0.98 * side],
        ],
        dpsBlue,
        deform
      );
      // Thin reflective silver accent edge
      strokePoly(
        ctx,
        [[rearX + 2.5, halfW * 0.84 * side], [frontX - 3.0, halfW * 0.84 * side]],
        '#93c5fd',
        0.45,
        deform
      );
    }
    // Trunk blue panel
    fillPoly(
      ctx,
      [
        [rearX + 2.2, -halfW * 0.54],
        [rearDeckStartX - 0.5, -halfW * 0.56],
        [rearDeckStartX - 0.5, halfW * 0.56],
        [rearX + 2.2, halfW * 0.54],
      ],
      dpsBlue,
      deform
    );
  }

  // 4. Ambulance Rescue 4x4 livery (flank bands; hood medical cross lives on the articulated hood panel)
  if (spec.livery === 'ambulance') {
    const medRed = '#dc2626';
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [rearX + 2.2, halfW * 0.82 * side],
          [frontX - 2.6, halfW * 0.82 * side],
          [frontX - 2.6, halfW * 0.98 * side],
          [rearX + 2.2, halfW * 0.98 * side],
        ],
        medRed,
        deform
      );
      // Reflective hi-vis yellow piping
      strokePoly(
        ctx,
        [[rearX + 2.2, halfW * 0.82 * side], [frontX - 2.6, halfW * 0.82 * side]],
        '#facc15',
        0.55,
        deform
      );
    }
  }

  // 5. Smart Micro Car contrasting Tridion safety cell framing
  if (spec.livery === 'tridion_micro') {
    const cellCol = colorLuminance(basePaint) > 0.4 ? '#1e293b' : '#cbd5e1';
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [rearX + 1.0, halfW * 0.74 * side],
          [halfL * 0.36, halfW * 0.80 * side],
          [halfL * 0.36, halfW * 1.02 * side],
          [rearX + 1.0, halfW * 1.02 * side],
        ],
        cellCol,
        deform
      );
    }
  }
}

// ============================================================================
// SCULPTED HOOD PANEL & DETAILS (NATIVE ARTICULATED MODEL PART)
// ============================================================================

function getPassengerHoodMetrics(
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  frontX: number
) {
  const hoodBackX = halfL * spec.wsFrontFrac;
  const hoodFrontX = frontX - (spec.bumper === 'steel_heavy' || spec.bumper === 'chrome_blade' ? 2.4 : 2.8);
  const hoodLen = hoodFrontX - hoodBackX;
  const cowlFrontX = hoodBackX + Math.min(1.6, Math.max(0.4, hoodLen * 0.18));
  const rearHalfW = halfW * (spec.bodyClass === 'box4x4' ? 0.72 : 0.76);
  const frontHalfW = halfW * (spec.bodyClass === 'supercar' ? 0.62 : spec.bodyClass === 'box4x4' ? 0.68 : 0.69);
  return { hoodBackX, hoodFrontX, hoodLen, cowlFrontX, rearHalfW, frontHalfW };
}

function renderPassengerHoodPanelSurface(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfW: number,
  frontX: number,
  hoodBackX: number,
  cowlFrontX: number,
  hoodFrontX: number,
  rearHalfW: number,
  frontHalfW: number,
  basePaint: string,
  brightPaint: string,
  panelSeam: string,
  deform: DeformFn,
  paintSolidShell: boolean
): void {
  const hoodLen = hoodFrontX - hoodBackX;
  if (hoodLen < 1.5) return;

  if (paintSolidShell) {
    const darkPaint = shadePaint(basePaint, -0.34);
    const midDarkPaint = shadePaint(basePaint, -0.14);
    const gradSpan = halfW + 0.6;
    const panelGrad = ctx.createLinearGradient(0, -gradSpan, 0, gradSpan);
    panelGrad.addColorStop(0.0, darkPaint);
    panelGrad.addColorStop(0.09, midDarkPaint);
    panelGrad.addColorStop(0.20, brightPaint);
    panelGrad.addColorStop(0.27, basePaint);
    panelGrad.addColorStop(0.50, shadePaint(basePaint, 0.10));
    panelGrad.addColorStop(0.73, basePaint);
    panelGrad.addColorStop(0.80, brightPaint);
    panelGrad.addColorStop(0.91, midDarkPaint);
    panelGrad.addColorStop(1.0, darkPaint);
    fillPoly(
      ctx,
      [
        [cowlFrontX, -rearHalfW],
        [hoodFrontX, -frontHalfW],
        [hoodFrontX, frontHalfW],
        [cowlFrontX, rearHalfW],
      ],
      panelGrad,
      deform
    );
  }

  // Hood liveries painted directly onto the hood sheet metal so they articulate & deform with it
  if (spec.racingStripes === 'twin') {
    const stripeCol = colorLuminance(basePaint) > 0.55 ? '#111827' : '#f1f5f9';
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [cowlFrontX + 0.15, 0.55 * side],
          [hoodFrontX - 0.15, 0.55 * side],
          [hoodFrontX - 0.15, 2.35 * side],
          [cowlFrontX + 0.15, 2.35 * side],
        ],
        stripeCol,
        deform
      );
    }
  } else if (spec.racingStripes === 'center_band') {
    fillPoly(
      ctx,
      [
        [cowlFrontX + 0.35, -2.2],
        [hoodFrontX - 0.35, -1.8],
        [hoodFrontX - 0.35, 1.8],
        [cowlFrontX + 0.35, 2.2],
      ],
      'rgba(15, 23, 42, 0.72)',
      deform
    );
  }

  if (spec.livery === 'police_dps') {
    const dpsBlue = '#1d4ed8';
    for (const side of [-1, 1] as const) {
      drawMirroredQuad(
        ctx,
        cowlFrontX + 0.3, Math.min(rearHalfW * 0.72, halfW * 0.54),
        hoodFrontX - 0.4, Math.min(frontHalfW * 0.54, halfW * 0.36),
        hoodFrontX - 0.4, Math.min(frontHalfW * 0.84, halfW * 0.56),
        cowlFrontX + 0.3, Math.min(rearHalfW * 0.96, halfW * 0.72),
        side,
        dpsBlue,
        deform
      );
    }
    const midX = (cowlFrontX + hoodFrontX) * 0.5;
    fillPoly(
      ctx,
      [
        [midX + 1.4, 0],
        [midX - 0.6, -1.8],
        [midX - 1.5, 0],
        [midX - 0.6, 1.8],
      ],
      dpsBlue,
      deform,
      '#93c5fd',
      0.4
    );
  }

  if (spec.livery === 'ambulance') {
    const medRed = '#dc2626';
    const hcx = (cowlFrontX + hoodFrontX) * 0.5;
    fillPoly(ctx, [[hcx - 2.2, -0.72], [hcx + 2.2, -0.72], [hcx + 2.2, 0.72], [hcx - 2.2, 0.72]], medRed, deform);
    fillPoly(ctx, [[hcx - 0.72, -2.2], [hcx + 0.72, -2.2], [hcx + 0.72, 2.2], [hcx - 0.72, 2.2]], medRed, deform);
  }

  // Subtle hood crown metallic sheen
  const hoodMidX = (cowlFrontX + hoodFrontX) * 0.5;
  if (spec.livery !== 'police_dps' && spec.livery !== 'ambulance') {
    const hoodGrad = ctx.createLinearGradient(0, -rearHalfW, 0, rearHalfW);
    hoodGrad.addColorStop(0.0, 'rgba(0,0,0,0.09)');
    hoodGrad.addColorStop(0.22, 'rgba(255,255,255,0.12)');
    hoodGrad.addColorStop(0.50, 'rgba(255,255,255,0.03)');
    hoodGrad.addColorStop(0.78, 'rgba(255,255,255,0.12)');
    hoodGrad.addColorStop(1.0, 'rgba(0,0,0,0.09)');
    fillPoly(
      ctx,
      [
        [cowlFrontX + 0.2, -rearHalfW + 0.2],
        [hoodFrontX - 0.2, -frontHalfW + 0.2],
        [hoodFrontX - 0.2, frontHalfW - 0.2],
        [cowlFrontX + 0.2, rearHalfW - 0.2],
      ],
      hoodGrad,
      deform
    );
  }

  // Per-model hood sculpting
  if (spec.hoodStyle === 'power_creases' || spec.hoodStyle === 'clamshell') {
    for (const side of [-1, 1] as const) {
      strokePoly(
        ctx,
        [
          [cowlFrontX + 0.8, rearHalfW * 0.56 * side],
          [hoodFrontX - 0.8, frontHalfW * 0.44 * side],
        ],
        'rgba(255, 255, 255, 0.24)',
        0.55,
        deform
      );
      strokePoly(
        ctx,
        [
          [cowlFrontX + 0.8, (rearHalfW * 0.56 + 0.45) * side],
          [hoodFrontX - 0.8, (frontHalfW * 0.44 + 0.45) * side],
        ],
        'rgba(2, 6, 23, 0.18)',
        0.4,
        deform
      );
    }
    if (spec.hoodStyle === 'clamshell') {
      strokePoly(ctx, [[cowlFrontX + 1.0, 0], [hoodFrontX - 1.5, 0]], 'rgba(255,255,255,0.22)', 0.5, deform);
      const [ox, oy] = deform(hoodFrontX - 0.55, 0);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(ox, oy, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (spec.hoodStyle === 'ribbed_classic') {
    strokePoly(ctx, [[cowlFrontX + 0.6, 0], [hoodFrontX - 0.6, 0]], 'rgba(255,255,255,0.28)', 0.65, deform);
    strokePoly(ctx, [[cowlFrontX + 0.6, 0.45], [hoodFrontX - 0.6, 0.45]], 'rgba(2,6,23,0.22)', 0.4, deform);
    for (let ly = -3.0; ly <= 3.0; ly += 1.2) {
      strokePoly(ctx, [[cowlFrontX + 0.5, ly], [cowlFrontX + 1.5, ly]], 'rgba(2,6,23,0.45)', 0.35, deform);
    }
  } else if (spec.hoodStyle === 'twin_vents') {
    for (const side of [-1, 1] as const) {
      drawMirroredQuad(
        ctx,
        hoodMidX - 1.6, rearHalfW * 0.32,
        hoodMidX + 1.6, frontHalfW * 0.30,
        hoodMidX + 1.3, frontHalfW * 0.56,
        hoodMidX - 1.9, rearHalfW * 0.58,
        side,
        '#0f172a',
        deform,
        'rgba(148,163,184,0.32)',
        0.35
      );
      strokePoly(
        ctx,
        [[hoodMidX - 0.5, rearHalfW * 0.35 * side], [hoodMidX - 0.7, rearHalfW * 0.54 * side]],
        'rgba(148,163,184,0.4)',
        0.35,
        deform
      );
      strokePoly(
        ctx,
        [[hoodMidX + 0.6, frontHalfW * 0.33 * side], [hoodMidX + 0.4, frontHalfW * 0.52 * side]],
        'rgba(148,163,184,0.4)',
        0.35,
        deform
      );
    }
  } else if (spec.hoodStyle === 'aero_ducts') {
    fillPoly(
      ctx,
      [
        [hoodMidX - 1.8, -2.0],
        [hoodFrontX - 1.2, -1.5],
        [hoodFrontX - 1.2, 1.5],
        [hoodMidX - 1.8, 2.0],
      ],
      '#0b0f17',
      deform,
      'rgba(148,163,184,0.28)',
      0.4
    );
    strokePoly(ctx, [[hoodMidX - 1.4, 0], [hoodFrontX - 1.4, 0]], '#334155', 0.5, deform);
  } else if (spec.hoodStyle === 'muscle_scoop') {
    for (const side of [-1, 1] as const) {
      drawMirroredQuad(
        ctx,
        cowlFrontX + 2.2, 0.9,
        hoodFrontX - 2.6, 1.1,
        hoodFrontX - 2.6, 2.7,
        cowlFrontX + 2.2, 2.5,
        side,
        shadePaint(basePaint, 0.14),
        deform,
        panelSeam,
        0.45
      );
      drawMirroredQuad(
        ctx,
        hoodFrontX - 3.3, 1.25,
        hoodFrontX - 2.55, 1.25,
        hoodFrontX - 2.55, 2.55,
        hoodFrontX - 3.3, 2.55,
        side,
        '#090d14',
        deform
      );
    }
  } else if (spec.hoodStyle === 'shaker_dome') {
    drawRoundedBox(
      ctx,
      cowlFrontX + 2.0,
      -2.3,
      Math.max(3.5, hoodLen - 4.2),
      4.6,
      0.9,
      brightPaint,
      deform,
      panelSeam,
      0.55
    );
    drawRoundedBox(
      ctx,
      hoodFrontX - 3.0,
      -1.65,
      1.1,
      3.3,
      0.3,
      '#090d14',
      deform,
      '#cbd5e1',
      0.4
    );
  } else if (spec.hoodStyle === 'box_louvers') {
    drawRoundedBox(
      ctx,
      cowlFrontX + 0.8,
      -rearHalfW * 0.62,
      Math.max(3.0, hoodLen - 2.0),
      rearHalfW * 1.24,
      0.5,
      shadePaint(basePaint, 0.08),
      deform,
      panelSeam,
      0.5
    );
    for (let lx = cowlFrontX + 1.8; lx <= cowlFrontX + 4.4; lx += 0.85) {
      strokePoly(ctx, [[lx, rearHalfW * 0.72], [lx, rearHalfW * 0.94]], '#0f172a', 0.45, deform);
    }
  }

  // Dual black windshield washer nozzles on hood near cowl
  for (const s of [-1, 1] as const) {
    const [nx, ny] = deform(cowlFrontX + 0.85, s * rearHalfW * 0.42);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(nx - 0.32, ny - 0.22, 0.64, 0.44);
  }

  // Crisp hood outer shutlines
  strokePoly(
    ctx,
    [
      [cowlFrontX, -rearHalfW],
      [hoodFrontX, -frontHalfW],
      [hoodFrontX, frontHalfW],
      [cowlFrontX, rearHalfW],
    ],
    panelSeam,
    0.62,
    deform,
    true
  );

  void frontX;
  void hoodBackX;
}

function renderSculptedHoodBase(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  frontX: number,
  hoodBackX: number,
  hoodBayOpen: boolean,
  basePaint: string,
  brightPaint: string,
  darkPaint: string,
  panelSeam: string,
  lights: CarLightState,
  deform: DeformFn
): void {
  const { hoodFrontX, hoodLen, cowlFrontX, rearHalfW, frontHalfW } = getPassengerHoodMetrics(spec, halfL, halfW, frontX);
  if (hoodLen < 1.5) return;

  // Dark ventilated cowl panel at windshield base (fixed to chassis where wipers park)
  fillPoly(
    ctx,
    [
      [hoodBackX - 0.4, -halfW * 0.80],
      [cowlFrontX, -halfW * 0.76],
      [cowlFrontX, halfW * 0.76],
      [hoodBackX - 0.4, halfW * 0.80],
    ],
    '#141922',
    deform
  );

  // Iconic G-Wagen fender-mounted amber indicator pods (stay mounted on outer fenders when hood opens)
  if (spec.hoodTopIndicators) {
    for (const side of [-1, 1] as const) {
      const isLit = side < 0 ? lights.leftSignal : lights.rightSignal;
      const litInt = isLit ? lights.turnIntensity : 0;
      const podX = hoodFrontX - 2.4;
      const podY = halfW * 0.74 * side;
      drawRoundedBox(ctx, podX - 0.9, podY - 0.65, 1.8, 1.3, 0.35, '#111827', deform);
      const lensCol = litInt > 0.08
        ? `rgba(245, 158, 11, ${0.55 + 0.45 * litInt})`
        : '#b45309';
      drawRoundedBox(ctx, podX - 0.55, podY - 0.42, 1.25, 0.84, 0.25, lensCol, deform);
      if (litInt > 0.35) {
        drawRoundedBox(ctx, podX - 0.2, podY - 0.2, 0.6, 0.4, 0.15, '#fef08a', deform);
      }
    }
  }

  // Supercar front nose is a fixed front luggage lid (engine bay is mid-rear glass deck)
  if (spec.bodyClass === 'supercar') {
    renderPassengerHoodPanelSurface(
      ctx,
      spec,
      halfW,
      frontX,
      hoodBackX,
      cowlFrontX,
      hoodFrontX,
      rearHalfW,
      frontHalfW,
      basePaint,
      brightPaint,
      panelSeam,
      deform,
      false
    );
    void darkPaint;
    return;
  }

  // When hood is open, animating, buckled, or detached, carve out the dark recessed engine bay cavity
  if (hoodBayOpen) {
    fillPoly(
      ctx,
      [
        [cowlFrontX + 0.2, -rearHalfW * 0.96],
        [hoodFrontX - 0.4, -frontHalfW * 0.96],
        [hoodFrontX - 0.4, frontHalfW * 0.96],
        [cowlFrontX + 0.2, rearHalfW * 0.96],
      ],
      '#0b0f17',
      deform,
      'rgba(148,163,184,0.22)',
      0.55
    );
  }

  void darkPaint;
}

/**
 * Renders the vehicle's OWN native sculpted hood panel (or supercar rear panoramic glass cover)
 * after the under-hood engine bay pass, inheriting live soft-body mesh deformation/damage
 * and smoothly articulating on its real hinges.
 */
export function renderPassengerCarHoodLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, cabinX, cabinL, cabinW, deform } = vCtx;
  const spec = getSpec(car.type);

  const basePaint =
    spec.livery === 'police_dps'
      ? '#f1f5f9'
      : spec.livery === 'ambulance'
      ? '#f8fafc'
      : (car.color || '#64748b');
  const brightPaint = shadePaint(basePaint, 0.24);
  const panelSeam = colorLuminance(basePaint) > 0.45 ? 'rgba(15, 23, 42, 0.36)' : 'rgba(2, 6, 23, 0.56)';

  // --- SUPERCAR: REAR PANORAMIC GLASS MID-ENGINE COVER ---
  if (spec.bodyClass === 'supercar') {
    const bay = getEngineBayLayout(car, halfL, halfW, fc, rc, cabinX, cabinL, cabinW);
    if (bay.zone === 'none') return;
    if (car.damage?.hoodDetached) {
      drawDetachedHoodHingeStubs(ctx, deform, bay.hoodX1, bay.hoodHalfW);
      return;
    }

    const hoodLen = bay.hoodX2 - bay.hoodX1;
    const hoodDeform = createArticulatedHoodDeform(car, deform, bay.hoodX1, bay.hoodX2, {
      isTransparentCover: true,
    });
    const openT = Math.min(1, getVehicleHoodOpenProgress(car));

    drawNativeHoodUnderEffects(
      ctx,
      car,
      deform,
      hoodDeform,
      bay.hoodX1,
      bay.hoodX2,
      bay.hoodHalfW,
      bay.hoodHalfW,
      { isTransparentCover: true }
    );

    // Tinted panoramic glass engine cover framed in car's real paint
    const glassAlpha = 0.24 + 0.44 * openT;
    fillPoly(
      ctx,
      [
        [bay.hoodX1, -bay.hoodHalfW],
        [bay.hoodX2, -bay.hoodHalfW],
        [bay.hoodX2, bay.hoodHalfW],
        [bay.hoodX1, bay.hoodHalfW],
      ],
      `rgba(15, 23, 42, ${glassAlpha.toFixed(3)})`,
      hoodDeform,
      openT > 0.015 ? basePaint : 'rgba(148, 163, 184, 0.42)',
      openT > 0.015 ? 0.85 + 0.2 * openT : 0.75
    );

    // Carbon-fiber structural X-brace integrated into the glass deck
    strokePoly(
      ctx,
      [
        [bay.bayX1 + 0.6, -bay.bayHalfW * 0.75],
        [bay.bayX2 - 0.6, bay.bayHalfW * 0.75],
      ],
      `rgba(148, 163, 184, ${(0.78 * (1 - openT * 0.45)).toFixed(3)})`,
      1.05,
      hoodDeform
    );
    strokePoly(
      ctx,
      [
        [bay.bayX1 + 0.6, bay.bayHalfW * 0.75],
        [bay.bayX2 - 0.6, -bay.bayHalfW * 0.75],
      ],
      `rgba(148, 163, 184, ${(0.78 * (1 - openT * 0.45)).toFixed(3)})`,
      1.05,
      hoodDeform
    );

    // Diagonal glass specular sheen
    strokePoly(
      ctx,
      [
        [bay.hoodX1 + hoodLen * 0.15, -bay.hoodHalfW * 0.72],
        [bay.hoodX2 - hoodLen * 0.18, bay.hoodHalfW * 0.62],
      ],
      'rgba(224, 242, 254, 0.26)',
      1.35,
      hoodDeform
    );

    drawNativeHoodOverEffects(
      ctx,
      car,
      hoodDeform,
      bay.hoodX1,
      bay.hoodX2,
      bay.hoodHalfW,
      bay.hoodHalfW,
      basePaint,
      { isTransparentCover: true }
    );
    return;
  }

  // --- ALL FRONT-ENGINE PASSENGER CARS ---
  const frontX = halfL - fc;
  const { hoodBackX, hoodFrontX, hoodLen, cowlFrontX, rearHalfW, frontHalfW } = getPassengerHoodMetrics(
    spec,
    halfL,
    halfW,
    frontX
  );
  if (hoodLen < 1.5) return;

  if (car.damage?.hoodDetached) {
    drawDetachedHoodHingeStubs(ctx, deform, cowlFrontX, rearHalfW);
    return;
  }

  const hoodDeform = createArticulatedHoodDeform(car, deform, cowlFrontX, hoodFrontX);
  const isArticulated = isVehicleHoodVisualOpenOrBuckled(car);

  drawNativeHoodUnderEffects(ctx, car, deform, hoodDeform, cowlFrontX, hoodFrontX, rearHalfW, frontHalfW);

  renderPassengerHoodPanelSurface(
    ctx,
    spec,
    halfW,
    frontX,
    hoodBackX,
    cowlFrontX,
    hoodFrontX,
    rearHalfW,
    frontHalfW,
    basePaint,
    brightPaint,
    panelSeam,
    hoodDeform,
    isArticulated
  );

  // Muscle car supercharger blower scoop protruding through closed hood cutout
  renderMuscleBlowerScoop(vCtx, hoodDeform);

  drawNativeHoodOverEffects(ctx, car, hoodDeform, cowlFrontX, hoodFrontX, rearHalfW, frontHalfW, basePaint);
}

// ============================================================================
// REAR DECK / TRUNK LID / PICKUP CORRUGATED CARGO BED
// ============================================================================

function renderRearDeckOrBed(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  car: Vehicle,
  halfL: number,
  halfW: number,
  rearX: number,
  rearDeckStartX: number,
  basePaint: string,
  brightPaint: string,
  darkPaint: string,
  panelSeam: string,
  deform: DeformFn
): void {
  // 1. PICKUP TRUCKS: Deep corrugated black bedliner cargo bed with tie-downs & heavy toolbox
  if (spec.bodyClass === 'pickup') {
    const isHeavy = car.type === 'pickup_heavy';
    const bedFrontX = halfL * (spec.rearGlassFrac - 0.03);
    const bedRearX = rearX + 2.4;
    const bedHalfW = halfW * 0.78;

    // Protective dark bed rail caps along top of cargo walls
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [bedRearX - 0.5, bedHalfW * side],
          [bedFrontX + 0.5, bedHalfW * side],
          [bedFrontX + 0.5, (bedHalfW + 1.1) * side],
          [bedRearX - 0.5, (bedHalfW + 1.1) * side],
        ],
        '#181e27',
        deform
      );
    }

    // Recessed cargo floor bedliner
    drawRoundedBox(
      ctx,
      bedRearX,
      -bedHalfW,
      Math.max(4, bedFrontX - bedRearX),
      bedHalfW * 2,
      0.5,
      '#141921',
      deform,
      '#090d14',
      0.7
    );

    // Corrugated steel floor ribs running longitudinally
    const ribStep = 1.45;
    for (let ry = -bedHalfW + 1.1; ry <= bedHalfW - 1.1; ry += ribStep) {
      strokePoly(ctx, [[bedRearX + 0.7, ry], [bedFrontX - 0.7, ry]], '#252f3d', 0.55, deform);
      strokePoly(ctx, [[bedRearX + 0.7, ry + 0.38], [bedFrontX - 0.7, ry + 0.38]], '#0b0f16', 0.35, deform);
    }

    // Inner wheel-well humps inside bed
    const rwX = -halfL * 0.62;
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        rwX - 3.6,
        side < 0 ? -bedHalfW + 0.2 : bedHalfW - 2.1,
        7.2,
        1.9,
        0.5,
        '#1d2530',
        deform,
        '#0c1018',
        0.5
      );
    }

    // Heavy-duty pickup diamond-plate aluminum cross-bed toolbox behind cab
    if (isHeavy) {
      const boxW = 3.8;
      drawRoundedBox(
        ctx,
        bedFrontX - boxW - 0.4,
        -bedHalfW - 0.2,
        boxW,
        bedHalfW * 2 + 0.4,
        0.4,
        '#cbd5e1',
        deform,
        '#475569',
        0.55
      );
      strokePoly(ctx, [[bedFrontX - boxW * 0.5 - 0.4, -bedHalfW + 0.6], [bedFrontX - boxW * 0.5 - 0.4, bedHalfW - 0.6]], '#64748b', 0.45, deform);
      // Chrome latch handles
      drawRoundedBox(ctx, bedFrontX - boxW * 0.5 - 0.9, -bedHalfW * 0.65, 1.0, 1.3, 0.2, '#334155', deform);
      drawRoundedBox(ctx, bedFrontX - boxW * 0.5 - 0.9, bedHalfW * 0.65 - 1.3, 1.0, 1.3, 0.2, '#334155', deform);
    }

    // Tailgate top cap & center latch handle
    fillPoly(
      ctx,
      [
        [rearX + 1.5, -bedHalfW - 0.6],
        [bedRearX + 0.2, -bedHalfW - 0.6],
        [bedRearX + 0.2, bedHalfW + 0.6],
        [rearX + 1.5, bedHalfW + 0.6],
      ],
      '#1a202c',
      deform
    );
    drawRoundedBox(ctx, rearX + 1.1, -1.6, 0.85, 3.2, 0.25, '#090d14', deform, '#64748b', 0.35);
    return;
  }

  // 2. SUPERCAR: Mid-engine bay surround (clear louvers framing the real under-hood mid-engine!)
  if (spec.bodyClass === 'supercar') {
    const bayFrontX = halfL * spec.rearGlassFrac - 0.2;
    const bayRearX = rearX + 2.8;
    const bayHalfW = halfW * 0.52;
    // Recessed carbon engine surround deck
    fillPoly(
      ctx,
      [
        [bayRearX, -bayHalfW],
        [bayFrontX, -bayHalfW * 1.12],
        [bayFrontX, bayHalfW * 1.12],
        [bayRearX, bayHalfW],
      ],
      '#0b0f17',
      deform,
      'rgba(148,163,184,0.32)',
      0.55
    );
    // Sculpted flying buttresses flanking the mid-engine bay
    for (const side of [-1, 1] as const) {
      drawMirroredQuad(
        ctx,
        bayFrontX + 0.4, bayHalfW * 1.08,
        bayRearX + 0.5, bayHalfW * 0.96,
        bayRearX + 0.5, halfW * 0.80,
        bayFrontX + 0.4, halfW * 0.82,
        side,
        shadePaint(basePaint, 0.12),
        deform,
        panelSeam,
        0.45
      );
      // Heat vent gills on buttress
      for (let gx = bayRearX + 2.0; gx < bayFrontX - 1.5; gx += 1.5) {
        strokePoly(ctx, [[gx, bayHalfW * 1.15 * side], [gx + 0.6, halfW * 0.72 * side]], '#0f172a', 0.45, deform);
      }
    }
    return;
  }

  // 3. RETRO BUBBLE (ZAZ-965): Rear-mounted air-cooled engine lid with stamped louvers
  if (spec.bodyClass === 'retro_bubble') {
    const deckFrontX = rearDeckStartX - 0.4;
    const deckRearX = rearX + 2.0;
    const dw = halfW * 0.62;
    strokePoly(
      ctx,
      [
        [deckFrontX, -dw],
        [deckRearX, -dw * 0.84],
        [deckRearX, dw * 0.84],
        [deckFrontX, dw],
      ],
      panelSeam,
      0.55,
      deform
    );
    // Iconic horizontal cooling louver slats across rear engine deck
    for (let lx = deckRearX + 1.0; lx < deckFrontX - 0.8; lx += 0.95) {
      strokePoly(ctx, [[lx, -dw * 0.62], [lx, dw * 0.62]], 'rgba(15,23,42,0.58)', 0.45, deform);
    }
    return;
  }

  // 4. SEDANS, COUPES & MUSCLE CARS: Defined stepped trunk lid shutlines & garnish trim
  if (spec.bodyClass === 'sedan' || spec.bodyClass === 'coupe' || spec.bodyClass === 'muscle') {
    const trunkFrontX = rearDeckStartX - 0.4;
    const trunkRearX = rearX + 2.2;
    if (trunkFrontX - trunkRearX > 1.2) {
      const tw = halfW * 0.70;
      strokePoly(
        ctx,
        [
          [trunkFrontX, -tw],
          [trunkRearX, -tw * 0.88],
          [trunkRearX, tw * 0.88],
          [trunkFrontX, tw],
        ],
        panelSeam,
        0.55,
        deform
      );
      // Trunk lip highlight (and dark reflector garnish bar for classic 90s Nexia)
      if (car.type === 'sedan_nexia') {
        drawRoundedBox(ctx, trunkRearX - 0.1, -tw * 0.74, 0.85, tw * 1.48, 0.2, '#450a0a', deform, '#1e293b', 0.3);
      } else {
        strokePoly(
          ctx,
          [[trunkRearX + 0.5, -tw * 0.82], [trunkRearX + 0.5, tw * 0.82]],
          spec.chromeTrim ? 'rgba(241, 245, 249, 0.68)' : 'rgba(255, 255, 255, 0.22)',
          spec.chromeTrim ? 0.85 : 0.45,
          deform
        );
      }
      // Subtle trunk deck crown highlight
      fillPoly(
        ctx,
        [
          [trunkFrontX - 0.3, -tw * 0.82],
          [trunkRearX + 0.6, -tw * 0.74],
          [trunkRearX + 0.6, tw * 0.74],
          [trunkFrontX - 0.3, tw * 0.82],
        ],
        'rgba(255, 255, 255, 0.05)',
        deform
      );
    }
  }

  void brightPaint;
  void darkPaint;
}

// ============================================================================
// INTEGRATED FRONT BUMPER & GRILLE FASCIA (NO PROGRAMMATIC BLOCKS!)
// ============================================================================

function renderIntegratedFrontFascia(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  frontX: number,
  basePaint: string,
  darkPaint: string,
  panelSeam: string,
  lights: CarLightState,
  deform: DeformFn
): void {
  const bumperRearX = frontX - (spec.bumper === 'chrome_blade' || spec.bumper === 'steel_heavy' ? 1.85 : 2.5);

  // 1. Molded Bumper Cap / Blade
  if (spec.bumper === 'chrome_blade') {
    // Classic mirror-chrome wraparound bumper bar cleanly hugging front edge without covering headlamps
    const chromeGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
    chromeGrad.addColorStop(0.0, '#64748b');
    chromeGrad.addColorStop(0.22, '#e2e8f0');
    chromeGrad.addColorStop(0.50, '#ffffff');
    chromeGrad.addColorStop(0.78, '#e2e8f0');
    chromeGrad.addColorStop(1.0, '#64748b');
    fillPoly(
      ctx,
      [
        [frontX - 1.15, -halfW * 0.90],
        [frontX + 0.2, -halfW * 0.76],
        [frontX + 0.4, 0],
        [frontX + 0.2, halfW * 0.76],
        [frontX - 1.15, halfW * 0.90],
        [frontX - 1.6, halfW * 0.84],
        [frontX - 0.75, 0],
        [frontX - 1.6, -halfW * 0.84],
      ],
      chromeGrad,
      deform,
      'rgba(15,23,42,0.52)',
      0.42
    );
    // Rubber bumper over-riders (classic bumper guards)
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, frontX - 1.05, halfW * 0.34 * side - 0.4, 1.05, 0.8, 0.2, '#1e293b', deform);
    }
  } else if (spec.bumper === 'steel_heavy') {
    // Heavy matte-black offroad / HD truck steel bumper with tow shackles
    fillPoly(
      ctx,
      [
        [frontX - 2.1, -halfW * 0.96],
        [frontX + 0.3, -halfW * 0.88],
        [frontX + 0.4, 0],
        [frontX + 0.3, halfW * 0.88],
        [frontX - 2.1, halfW * 0.96],
        [frontX - 2.4, halfW * 0.88],
        [frontX - 1.55, 0],
        [frontX - 2.4, -halfW * 0.88],
      ],
      spec.grille === 'truck_hd_chrome' ? '#cbd5e1' : '#1b212a',
      deform,
      '#090d14',
      0.55
    );
  } else if (spec.bumper === 'unpainted_90s') {
    // Authentic 90s molded dark-charcoal plastic bumper (Samara / Tavria)
    fillPoly(
      ctx,
      [
        [frontX - 2.4, -halfW * 0.94],
        [frontX + 0.2, -halfW * 0.78],
        [frontX + 0.3, 0],
        [frontX + 0.2, halfW * 0.78],
        [frontX - 2.4, halfW * 0.94],
        [frontX - 2.8, halfW * 0.86],
        [frontX - 1.7, 0],
        [frontX - 2.8, -halfW * 0.86],
      ],
      '#272e38',
      deform,
      '#0f172a',
      0.45
    );
  } else if (spec.bumper === 'carbon_splitter') {
    // Low protruding carbon-fiber aero front lip splitter
    fillPoly(
      ctx,
      [
        [frontX - 2.3, -halfW * 0.86],
        [frontX + 0.3, -halfW * 0.70],
        [frontX + 0.5, 0],
        [frontX + 0.3, halfW * 0.70],
        [frontX - 2.3, halfW * 0.86],
        [frontX - 2.7, halfW * 0.76],
        [frontX - 1.2, 0],
        [frontX - 2.7, -halfW * 0.76],
      ],
      '#11161f',
      deform,
      'rgba(148,163,184,0.35)',
      0.4
    );
    // Subtle red splitter pinstripe on hot hatch
    if (spec.grille === 'sport_hex_red') {
      strokePoly(
        ctx,
        [[frontX - 1.5, -halfW * 0.62], [frontX - 0.4, 0], [frontX - 1.5, halfW * 0.62]],
        '#ef4444',
        0.55,
        deform
      );
    }
  } else if (spec.bumper === 'cladding_offroad') {
    // Rugged lower matte cladding bumper + brushed silver center skid plate
    fillPoly(
      ctx,
      [
        [frontX - 2.2, -halfW * 0.88],
        [frontX + 0.2, -halfW * 0.74],
        [frontX + 0.3, 0],
        [frontX + 0.2, halfW * 0.74],
        [frontX - 2.2, halfW * 0.88],
        [frontX - 2.6, halfW * 0.80],
        [frontX - 1.4, 0],
        [frontX - 2.6, -halfW * 0.80],
      ],
      '#222832',
      deform
    );
    // Brushed aluminum skid plate lip
    drawRoundedBox(ctx, frontX - 1.25, -halfW * 0.38, 1.15, halfW * 0.76, 0.25, '#94a3b8', deform, '#475569', 0.35);
  } else {
    // Modern integrated body-colored bumper seam line + subtle dark lower air dam lip
    strokePoly(
      ctx,
      [
        [bumperRearX - 0.8, -halfW * 0.92],
        [bumperRearX + 0.2, -halfW * 0.70],
        [bumperRearX + 0.3, halfW * 0.70],
        [bumperRearX - 0.8, halfW * 0.92],
      ],
      panelSeam,
      0.45,
      deform
    );
    // Lower dark splitter chin
    fillPoly(
      ctx,
      [
        [frontX - 1.1, -halfW * 0.58],
        [frontX + 0.1, -halfW * 0.46],
        [frontX + 0.2, 0],
        [frontX + 0.1, halfW * 0.46],
        [frontX - 1.1, halfW * 0.58],
      ],
      '#11161f',
      deform
    );
  }

  // 2. Integrated Recessed Radiator Grille (tailored per car style)
  const gHalfW = halfW * (spec.grille === 'truck_hd_chrome' || spec.grille === 'truck_crossbar' ? 0.58 : spec.grille === 'retro_minimal' ? 0.32 : 0.46);
  const gX = frontX - (spec.bumper === 'chrome_blade' || spec.bumper === 'steel_heavy' ? 2.5 : 2.15);
  const gDepth = 1.25;

  if (spec.grille === 'chrome_classic') {
    drawRoundedBox(ctx, gX, -gHalfW, gDepth, gHalfW * 2, 0.25, '#111827', deform, '#e2e8f0', 0.55);
    for (let gy = -gHalfW + 0.9; gy <= gHalfW - 0.9; gy += 0.95) {
      strokePoly(ctx, [[gX + 0.15, gy], [gX + gDepth - 0.15, gy]], '#94a3b8', 0.32, deform);
    }
  } else if (spec.grille === 'chrome_luxury') {
    drawRoundedBox(ctx, gX - 0.2, -gHalfW * 1.05, gDepth + 0.3, gHalfW * 2.1, 0.35, '#0c111a', deform, '#f1f5f9', 0.65);
    for (let gy = -gHalfW + 0.8; gy <= gHalfW - 0.8; gy += 0.85) {
      strokePoly(ctx, [[gX, gy], [gX + gDepth, gy]], '#cbd5e1', 0.35, deform);
    }
    // Center chrome spine
    strokePoly(ctx, [[gX - 0.15, 0], [gX + gDepth + 0.15, 0]], '#f8fafc', 0.55, deform);
  } else if (spec.grille === 'truck_crossbar' || spec.grille === 'truck_hd_chrome') {
    const isHD = spec.grille === 'truck_hd_chrome';
    drawRoundedBox(ctx, gX - 0.2, -gHalfW, gDepth + 0.35, gHalfW * 2, 0.3, '#0b0f17', deform, isHD ? '#f1f5f9' : '#475569', isHD ? 0.8 : 0.55);
    // Bold horizontal truck grille bars
    strokePoly(ctx, [[gX + 0.55, -gHalfW + 0.4], [gX + 0.55, gHalfW - 0.4]], isHD ? '#e2e8f0' : '#64748b', isHD ? 0.85 : 0.65, deform);
    // Center badge emblem
    drawRoundedBox(ctx, gX + 0.15, -1.1, 0.85, 2.2, 0.2, isHD ? '#f59e0b' : '#94a3b8', deform);
  } else if (spec.grille === 'muscle_blackout') {
    // Full-width recessed dark muscle nose panel
    drawRoundedBox(ctx, gX - 0.1, -halfW * 0.78, gDepth + 0.1, halfW * 1.56, 0.25, '#090d14', deform, '#cbd5e1', 0.45);
    strokePoly(ctx, [[gX + 0.55, -halfW * 0.42], [gX + 0.55, halfW * 0.42]], '#334155', 0.4, deform);
  } else if (spec.grille === 'supercar_ducts') {
    // Twin deep side intake nostrils + sharp carbon center splitter fang
    for (const side of [-1, 1] as const) {
      drawMirroredQuad(
        ctx,
        frontX - 2.3, halfW * 0.12,
        frontX - 0.8, halfW * 0.16,
        frontX - 1.3, halfW * 0.66,
        frontX - 2.7, halfW * 0.56,
        side,
        '#090d14',
        deform,
        'rgba(148,163,184,0.26)',
        0.35
      );
    }
  } else if (spec.grille !== 'retro_minimal') {
    // Clean modern dark mesh / slatted intake recess
    drawRoundedBox(
      ctx,
      gX,
      -gHalfW,
      gDepth,
      gHalfW * 2,
      0.3,
      '#0d121b',
      deform,
      spec.grille === 'sport_hex_red' ? '#dc2626' : 'rgba(148,163,184,0.34)',
      0.42
    );
    // Subtle chrome/silver horizontal accent slat + brand emblem dot
    if (spec.grille === 'wide_slats' || spec.grille === 'narrow_euro') {
      strokePoly(ctx, [[gX + 0.55, -gHalfW + 0.6], [gX + 0.55, gHalfW - 0.6]], 'rgba(203,213,225,0.55)', 0.35, deform);
    }
    const [bx, by] = deform(gX + 0.55, 0);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(bx, by, 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front License Plate centered on bumper nose (subtle authentic detail)
  if (spec.bodyClass !== 'supercar' && spec.grille !== 'offroad_winch') {
    drawRoundedBox(ctx, frontX - 0.95, -1.75, 0.65, 3.5, 0.12, '#e2e8f0', deform, '#334155', 0.25);
  }

  void basePaint;
  void darkPaint;
  void lights;
}

// ============================================================================
// INTEGRATED REAR BUMPER, DIFFUSER & LICENSE PLATE RECESS
// ============================================================================

function renderIntegratedRearFascia(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  rearX: number,
  basePaint: string,
  darkPaint: string,
  panelSeam: string,
  deform: DeformFn
): void {
  if (spec.bumper === 'chrome_blade') {
    const chromeGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
    chromeGrad.addColorStop(0.0, '#64748b');
    chromeGrad.addColorStop(0.25, '#e2e8f0');
    chromeGrad.addColorStop(0.50, '#ffffff');
    chromeGrad.addColorStop(0.75, '#e2e8f0');
    chromeGrad.addColorStop(1.0, '#64748b');
    fillPoly(
      ctx,
      [
        [rearX + 1.4, -halfW * 0.90],
        [rearX - 0.2, -halfW * 0.72],
        [rearX - 0.35, 0],
        [rearX - 0.2, halfW * 0.72],
        [rearX + 1.4, halfW * 0.90],
        [rearX + 2.0, halfW * 0.84],
        [rearX + 1.1, 0],
        [rearX + 2.0, -halfW * 0.84],
      ],
      chromeGrad,
      deform,
      'rgba(15,23,42,0.52)',
      0.45
    );
  } else if (spec.bumper === 'steel_heavy') {
    fillPoly(
      ctx,
      [
        [rearX + 1.8, -halfW * 0.95],
        [rearX - 0.2, -halfW * 0.84],
        [rearX - 0.3, 0],
        [rearX - 0.2, halfW * 0.84],
        [rearX + 1.8, halfW * 0.95],
        [rearX + 2.2, halfW * 0.86],
        [rearX + 1.4, 0],
        [rearX + 2.2, -halfW * 0.86],
      ],
      spec.grille === 'truck_hd_chrome' ? '#cbd5e1' : '#1b212a',
      deform,
      '#090d14',
      0.5
    );
    // Center step pad on pickup rear bumper
    if (spec.bodyClass === 'pickup') {
      drawRoundedBox(ctx, rearX + 0.1, -3.2, 1.25, 6.4, 0.2, '#0f172a', deform);
    }
  } else if (spec.bumper === 'unpainted_90s') {
    fillPoly(
      ctx,
      [
        [rearX + 2.0, -halfW * 0.92],
        [rearX - 0.2, -halfW * 0.74],
        [rearX - 0.3, 0],
        [rearX - 0.2, halfW * 0.74],
        [rearX + 2.0, halfW * 0.92],
        [rearX + 2.4, halfW * 0.82],
        [rearX + 1.4, 0],
        [rearX + 2.4, -halfW * 0.82],
      ],
      '#272e38',
      deform,
      '#0f172a',
      0.42
    );
  } else if (spec.bumper === 'carbon_splitter') {
    // Aggressive carbon rear diffuser with aerodynamic vertical strakes
    fillPoly(
      ctx,
      [
        [rearX + 1.6, -halfW * 0.76],
        [rearX - 0.2, -halfW * 0.64],
        [rearX - 0.35, 0],
        [rearX - 0.2, halfW * 0.64],
        [rearX + 1.6, halfW * 0.76],
      ],
      '#10151e',
      deform,
      'rgba(148,163,184,0.28)',
      0.4
    );
    for (const fy of [-3.4, -1.7, 1.7, 3.4]) {
      if (Math.abs(fy) < halfW * 0.6) {
        strokePoly(ctx, [[rearX + 0.1, fy], [rearX + 1.5, fy]], '#334155', 0.45, deform);
      }
    }
  } else if (spec.bumper === 'cladding_offroad') {
    fillPoly(
      ctx,
      [
        [rearX + 1.8, -halfW * 0.86],
        [rearX - 0.15, -halfW * 0.72],
        [rearX - 0.25, 0],
        [rearX - 0.15, halfW * 0.72],
        [rearX + 1.8, halfW * 0.86],
      ],
      '#222832',
      deform
    );
    drawRoundedBox(ctx, rearX + 0.15, -halfW * 0.36, 1.0, halfW * 0.72, 0.2, '#94a3b8', deform);
  } else {
    // Clean modern molded rear bumper seam + subtle black lower valence
    strokePoly(
      ctx,
      [
        [rearX + 2.3, -halfW * 0.90],
        [rearX + 1.6, -halfW * 0.68],
        [rearX + 1.5, halfW * 0.68],
        [rearX + 2.3, halfW * 0.90],
      ],
      panelSeam,
      0.42,
      deform
    );
    fillPoly(
      ctx,
      [
        [rearX + 1.0, -halfW * 0.56],
        [rearX - 0.1, -halfW * 0.44],
        [rearX - 0.15, 0],
        [rearX - 0.1, halfW * 0.44],
        [rearX + 1.0, halfW * 0.56],
      ],
      '#141923',
      deform
    );
  }

  // Rear license plate (center recess)
  if (!spec.rearSpare) {
    drawRoundedBox(ctx, rearX + 0.35, -1.8, 0.65, 3.6, 0.12, '#e2e8f0', deform, '#334155', 0.25);
  }

  void basePaint;
  void darkPaint;
}

// ============================================================================
// INTEGRATED FRONT OPTICS (HEADLIGHTS, DRLS, FOGS, TURN SIGNALS)
// ============================================================================

function renderSequentialStrip(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments: number,
  progress: number,
  deform: DeformFn
): void {
  for (let i = 0; i < segments; i++) {
    const t = segments > 1 ? i / (segments - 1) : 0.5;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    const lit = progress >= (i + 0.45) / segments;
    const [dx, dy] = deform(px, py);
    ctx.fillStyle = lit ? '#f59e0b' : '#292524';
    ctx.fillRect(dx - 0.45, dy - 0.45, 0.9, 0.9);
    if (lit) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(dx - 0.22, dy - 0.22, 0.44, 0.44);
    }
  }
}

function renderIntegratedFrontOptics(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  frontX: number,
  lights: CarLightState,
  deform: DeformFn
): void {
  const lampBaseX = frontX - (spec.bumper === 'chrome_blade' || spec.bumper === 'steel_heavy' ? 2.55 : 2.1);

  for (const side of [-1, 1] as const) {
    const isLeft = side < 0;
    const broken = isLeft ? lights.leftFrontBroken : lights.rightFrontBroken;
    const sigActive = isLeft ? lights.leftSignal : lights.rightSignal;
    const sigInt = !broken && sigActive ? lights.turnIntensity : 0;

    // Color palette for active vs off headlamp lens
    const lensFill = broken
      ? '#0b0f17'
      : lights.isHighBeam
      ? '#ffffff'
      : lights.headlightsOn
      ? (spec.frontLamp === 'round_single' || spec.frontLamp === 'round_twin' || spec.frontLamp === 'rect_block'
          ? '#fef3c7'
          : '#f0f9ff')
      : lights.positionOn
      ? '#e2e8f0'
      : '#64748b';

    const coreFill = broken
      ? '#1e293b'
      : lights.isHighBeam
      ? '#ffffff'
      : lights.headlightsOn
      ? '#fef9c3'
      : '#cbd5e1';

    const amberFill = sigInt > 0.05
      ? `rgba(245, 158, 11, ${0.45 + 0.55 * sigInt})`
      : '#78350f';

    // --- 1. CLASSIC SINGLE ROUND (VAZ-2101, ZAZ-965, G-Class, Offroader) ---
    if (spec.frontLamp === 'round_single') {
      const ly = halfW * 0.67 * side;
      const lx = lampBaseX + 0.45;
      const [cx, cy] = deform(lx, ly);

      // Molded chrome or dark housing bezel flush in front fender
      ctx.fillStyle = spec.chromeTrim ? '#e2e8f0' : '#1e293b';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 1.35, 1.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Convex glass lens
      ctx.fillStyle = lensFill;
      ctx.beginPath();
      ctx.ellipse(cx + 0.15, cy, 0.95, 1.32, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!broken && lights.headlightsOn) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx + 0.35, cy, 0.45, 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (broken) {
        strokePoly(ctx, [[lx - 0.6, ly - 0.8], [lx + 0.6, ly + 0.8]], '#475569', 0.35, deform);
      }

      // Separate classic amber corner indicator pod (skip if G-Wagen hood-top indicators already cover it)
      if (!spec.hoodTopIndicators) {
        const ty = halfW * 0.85 * side;
        drawRoundedBox(ctx, lx - 0.45, ty - 0.5, 1.05, 1.0, 0.3, broken ? '#1e293b' : amberFill, deform, '#0f172a', 0.3);
        if (sigInt > 0.3) {
          drawRoundedBox(ctx, lx - 0.15, ty - 0.25, 0.5, 0.5, 0.15, '#fef08a', deform);
        }
      }
    }

    // --- 2. CLASSIC TWIN ROUND (VAZ-2106, VAZ-2104, 1971 Muscle) ---
    else if (spec.frontLamp === 'round_twin') {
      const lx = lampBaseX + 0.45;
      const outerY = halfW * 0.72 * side;
      const innerY = halfW * 0.50 * side;

      // Dark rectangular twin-lamp bezel recess
      drawRoundedBox(
        ctx,
        lx - 0.95,
        Math.min(outerY, innerY) - 1.15,
        1.9,
        Math.abs(outerY - innerY) + 2.3,
        0.35,
        '#111827',
        deform,
        spec.chromeTrim ? '#cbd5e1' : '#334155',
        0.4
      );

      for (const [idx, cyPos] of [outerY, innerY].entries()) {
        const [cx, cy] = deform(lx + 0.1, cyPos);
        const litHere = !broken && (idx === 0 ? lights.headlightsOn : lights.isHighBeam);
        ctx.fillStyle = broken ? '#0f172a' : litHere ? '#ffffff' : lights.positionOn ? '#fef3c7' : '#64748b';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 0.72, 0.92, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outboard amber turn repeater strip
      const ty = halfW * 0.87 * side;
      drawRoundedBox(ctx, lx - 0.6, ty - 0.45, 1.15, 0.9, 0.2, broken ? '#1e293b' : amberFill, deform);
      if (sigInt > 0.3) {
        drawRoundedBox(ctx, lx - 0.25, ty - 0.22, 0.5, 0.44, 0.12, '#fef08a', deform);
      }
    }

    // --- 3. 90s/00s RECTANGULAR BLOCK LAMPS (Samara, Tavria, Logan, Nexia) ---
    else if (spec.frontLamp === 'rect_block') {
      const lx = lampBaseX - 0.15;
      const inY = halfW * 0.48;
      const outY = halfW * 0.88;
      // Main clear glass housing
      drawMirroredQuad(
        ctx,
        lx, inY,
        lx + 1.55, inY,
        lx + 1.25, outY - 1.05,
        lx - 0.2, outY - 1.05,
        side,
        lensFill,
        deform,
        '#1e293b',
        0.4
      );
      if (!broken && lights.headlightsOn) {
        drawMirroredQuad(
          ctx,
          lx + 0.35, inY + 0.35,
          lx + 1.3, inY + 0.35,
          lx + 1.1, outY - 1.3,
          lx + 0.2, outY - 1.3,
          side,
          coreFill,
          deform
        );
      }
      // Corner amber turn signal lens integrated flush at fender corner
      drawMirroredQuad(
        ctx,
        lx - 0.2, outY - 1.05,
        lx + 1.25, outY - 1.05,
        lx + 0.65, outY,
        lx - 0.55, outY,
        side,
        broken ? '#1e293b' : amberFill,
        deform,
        '#0f172a',
        0.35
      );
      if (sigInt > 0.3) {
        drawMirroredQuad(
          ctx,
          lx + 0.1, outY - 0.85,
          lx + 0.85, outY - 0.85,
          lx + 0.55, outY - 0.2,
          lx - 0.1, outY - 0.2,
          side,
          '#fef08a',
          deform
        );
      }
    }

    // --- 4. BUG-EYE OVAL LAMPS (Matiz, Smart Micro) ---
    else if (spec.frontLamp === 'bug_eye') {
      const lx = frontX - 2.15;
      const ly = halfW * 0.68 * side;
      const [cx, cy] = deform(lx, ly);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.28 * side);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.55, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lensFill;
      ctx.beginPath();
      ctx.ellipse(0.1, 0, 1.2, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!broken && lights.headlightsOn) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0.3, 0, 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      // Integrated amber upper turn dot
      ctx.fillStyle = broken ? '#1e293b' : amberFill;
      ctx.beginPath();
      ctx.arc(-0.55, 0.35 * side, 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- 5. MUSCLE RECESSED QUAD GRILLE LAMPS (1969 Muscle) ---
    else if (spec.frontLamp === 'muscle_recessed') {
      const lx = lampBaseX + 0.3;
      const inY = halfW * 0.46;
      const outY = halfW * 0.84;
      drawMirroredQuad(
        ctx,
        lx - 0.3, inY,
        lx + 1.0, inY,
        lx + 0.85, outY,
        lx - 0.4, outY,
        side,
        '#090d14',
        deform,
        '#cbd5e1',
        0.35
      );
      if (!broken) {
        const l1 = lights.headlightsOn ? '#fef3c7' : '#475569';
        const l2 = lights.isHighBeam ? '#ffffff' : lights.positionOn ? '#fde68a' : '#334155';
        drawRoundedBox(ctx, lx, side < 0 ? -outY + 0.35 : outY - 1.55, 0.85, 1.2, 0.25, l1, deform);
        drawRoundedBox(ctx, lx, side < 0 ? -inY - 1.35 : inY + 0.15, 0.85, 1.2, 0.25, l2, deform);
      }
      if (sigInt > 0.05) {
        drawRoundedBox(ctx, lx + 0.35, (outY + 0.25) * side - 0.45, 0.85, 0.9, 0.2, amberFill, deform);
      }
    }

    // --- 6. PICKUP C-CLAMP LED HEADLIGHTS (Pickup, HD Pickup) ---
    else if (spec.frontLamp === 'c_clamp_truck') {
      const lx = frontX - 2.35;
      const inY = halfW * 0.56;
      const outY = halfW * 0.92;
      drawMirroredQuad(
        ctx,
        lx - 0.5, inY,
        lx + 1.5, inY,
        lx + 1.15, outY,
        lx - 0.85, outY,
        side,
        '#111827',
        deform,
        '#475569',
        0.4
      );
      if (!broken) {
        // Projector core
        drawMirroredQuad(
          ctx,
          lx + 0.1, inY + 0.45,
          lx + 1.2, inY + 0.45,
          lx + 0.95, outY - 0.65,
          lx - 0.1, outY - 0.65,
          side,
          lensFill,
          deform
        );
        // Signature bright C-clamp DRL / Amber turn perimeter
        const drlCol = sigInt > 0.1
          ? `rgba(245, 158, 11, ${0.55 + 0.45 * sigInt})`
          : lights.drlOn
          ? '#f0f9ff'
          : '#64748b';
        strokePoly(
          ctx,
          [
            [lx + 1.3, (inY + 0.2) * side],
            [lx + 1.0, (outY - 0.2) * side],
            [lx - 0.5, (outY - 0.2) * side],
          ],
          drlCol,
          0.65,
          deform
        );
      }
    }

    // --- 7. MODERN SWEPT LED / RAZOR BLADE / MATRIX LUXURY / SPLIT DRL ---
    else {
      const isRazor = spec.frontLamp === 'razor_blade';
      const isMatrix = spec.frontLamp === 'matrix_lux';
      const isSplit = spec.frontLamp === 'split_drl';
      const lx = frontX - (isRazor ? 2.6 : 2.2);
      const inY = halfW * (isRazor ? 0.36 : 0.45);
      const outY = halfW * 0.89;
      const sweepBack = isRazor ? 2.2 : 1.5;

      // Dark smoked optical housing swept cleanly back into the front fender
      drawMirroredQuad(
        ctx,
        lx + 0.1, inY,
        lx + 1.55, inY + 0.15,
        lx + 0.75, outY,
        lx - sweepBack, outY - 0.25,
        side,
        '#0c111b',
        deform,
        'rgba(148,163,184,0.34)',
        0.38
      );

      if (!broken) {
        // Multi-element crystal LED / projector optics inside housing
        if (isMatrix) {
          for (let m = 0; m < 3; m++) {
            const t = (m + 0.5) / 3;
            const mx = lx + 0.8 - t * 0.9;
            const my = (inY + (outY - inY) * t) * side;
            drawRoundedBox(
              ctx,
              mx - 0.38,
              my - 0.42,
              0.76,
              0.84,
              0.2,
              lights.headlightsOn ? (lights.isHighBeam ? '#ffffff' : '#e0f2fe') : '#475569',
              deform
            );
          }
        } else {
          drawMirroredQuad(
            ctx,
            lx + 0.35, inY + 0.35,
            lx + 1.25, inY + 0.45,
            lx + 0.65, outY - 0.55,
            lx - sweepBack * 0.52, outY - 0.65,
            side,
            lights.headlightsOn ? lensFill : '#334155',
            deform
          );
          if (lights.headlightsOn) {
            const [px, py] = deform(lx + 0.55, (inY + (outY - inY) * 0.42) * side);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Integrated Sweeping LED DRL Blade (switches to amber / sequential sweep when signaling!)
        if (sigActive && lights.turnType === 'dynamic_sequential_led') {
          renderSequentialStrip(
            ctx,
            lx + 1.35,
            (inY + 0.25) * side,
            lx - sweepBack * 0.45,
            (outY - 0.35) * side,
            5,
            lights.turnSweep,
            deform
          );
        } else {
          const bladeCol = sigInt > 0.08
            ? `rgba(245, 158, 11, ${0.5 + 0.5 * sigInt})`
            : lights.drlOn
            ? '#f0f9ff'
            : 'rgba(203, 213, 225, 0.5)';
          strokePoly(
            ctx,
            [
              [lx + 1.35, (inY + 0.25) * side],
              [lx + 0.72, (outY - 0.35) * side],
              [lx - sweepBack * 0.55, (outY - 0.42) * side],
            ],
            bladeCol,
            isSplit ? 0.8 : 0.6,
            deform
          );
        }
      }
    }

    // --- INTEGRATED FRONT FOG LAMPS (inside lower bumper corner intakes) ---
    if (spec.hasFrontFogs) {
      const fx = frontX - 0.75;
      const fy = halfW * 0.62 * side;
      const fogLit = !broken && lights.frontFogOn;
      drawRoundedBox(
        ctx,
        fx - 0.42,
        fy - 0.62,
        0.84,
        1.24,
        0.25,
        broken ? '#0f172a' : fogLit ? '#fef9c3' : '#334155',
        deform,
        '#090d14',
        0.3
      );
      if (fogLit) {
        drawRoundedBox(ctx, fx - 0.18, fy - 0.3, 0.4, 0.6, 0.12, '#ffffff', deform);
      }
    }
  }
}

// ============================================================================
// INTEGRATED REAR OPTICS (TAILLIGHTS, BRAKE, REVERSE, REAR FOG, TURN SIGNALS)
// ============================================================================

function renderIntegratedRearOptics(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  rearX: number,
  lights: CarLightState,
  deform: DeformFn
): void {
  const rx = rearX + (spec.bumper === 'chrome_blade' || spec.bumper === 'steel_heavy' ? 1.8 : 1.05);

  // Full-width LED lightbar connecting left & right clusters (Luxury Sedan, Supercar, Coupe GT, Hot Hatch)
  if (spec.rearLamp === 'full_lightbar') {
    const barHalfW = halfW * 0.78;
    drawRoundedBox(ctx, rx - 0.25, -barHalfW, 1.05, barHalfW * 2, 0.3, '#18080b', deform);
    const barCol = lights.braking
      ? '#ff3b3b'
      : lights.positionOn
      ? '#dc2626'
      : '#6b1218';
    strokePoly(ctx, [[rx + 0.25, -barHalfW + 0.3], [rx + 0.25, barHalfW - 0.3]], barCol, lights.braking ? 0.95 : 0.65, deform);
    if (lights.braking) {
      strokePoly(ctx, [[rx + 0.25, -barHalfW + 0.6], [rx + 0.25, barHalfW - 0.6]], '#fecaca', 0.35, deform);
    }
  }

  for (const side of [-1, 1] as const) {
    const isLeft = side < 0;
    const broken = isLeft ? lights.leftRearBroken : lights.rightRearBroken;
    const sigActive = isLeft ? lights.leftSignal : lights.rightSignal;
    const sigInt = !broken && sigActive ? lights.turnIntensity : 0;

    const rubyMain = broken
      ? '#111827'
      : lights.braking
      ? '#ef4444'
      : lights.positionOn
      ? '#dc2626'
      : '#7f1d1d';

    const rubyCore = broken
      ? '#1e293b'
      : lights.braking
      ? '#ffffff'
      : lights.positionOn
      ? '#fca5a5'
      : '#991b1b';

    const amberCol = broken
      ? '#1e293b'
      : sigInt > 0.05
      ? `rgba(245, 158, 11, ${0.48 + 0.52 * sigInt})`
      : '#78350f';

    const inbCol = broken
      ? '#111827'
      : lights.reversing
      ? '#ffffff'
      : (lights.rearFogOn && isLeft)
      ? '#ef4444'
      : '#94a3b8';

    // --- 1. QUAD SPORT ROUND / RING LAMPS (Apex GT-Coupe) ---
    if (spec.rearLamp === 'quad_sport') {
      const outY = halfW * 0.74 * side;
      const inY = halfW * 0.48 * side;
      drawRoundedBox(
        ctx,
        rx - 0.2,
        Math.min(outY, inY) - 1.1,
        1.45,
        Math.abs(outY - inY) + 2.2,
        0.35,
        '#0c1018',
        deform
      );
      // Outer main brake/tail ring
      const [ox, oy] = deform(rx + 0.5, outY);
      ctx.fillStyle = sigInt > 0.2 ? amberCol : rubyMain;
      ctx.beginPath();
      ctx.ellipse(ox, oy, 0.58, 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!broken && (lights.braking || lights.positionOn)) {
        ctx.fillStyle = rubyCore;
        ctx.beginPath();
        ctx.ellipse(ox, oy, 0.28, 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Inner reverse / fog / brake lamp
      const [ix, iy] = deform(rx + 0.5, inY);
      ctx.fillStyle = lights.reversing ? '#ffffff' : rubyMain;
      ctx.beginPath();
      ctx.ellipse(ix, iy, 0.55, 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 2. MUSCLE TRIPLE-BAR SEQUENTIAL TAILLIGHTS ---
    else if (spec.rearLamp === 'muscle_triple') {
      const inY = halfW * 0.34;
      const outY = halfW * 0.84;
      drawMirroredQuad(
        ctx,
        rx - 0.15, inY,
        rx + 1.15, inY,
        rx + 1.15, outY,
        rx - 0.15, outY,
        side,
        '#090d14',
        deform,
        '#cbd5e1',
        0.35
      );
      if (!broken) {
        const span = outY - inY - 0.5;
        for (let b = 0; b < 3; b++) {
          const by = (inY + 0.35 + (b + 0.5) * (span / 3)) * side;
          const seqLit = sigActive && lights.turnSweep >= (b + 0.35) / 3;
          const barCol = seqLit
            ? '#f59e0b'
            : (b === 0 && lights.reversing)
            ? '#ffffff'
            : rubyMain;
          drawRoundedBox(ctx, rx + 0.1, by - 0.52, 0.85, 1.04, 0.18, barCol, deform);
          if (lights.braking || seqLit) {
            drawRoundedBox(ctx, rx + 0.3, by - 0.24, 0.42, 0.48, 0.1, seqLit ? '#fef08a' : '#fecaca', deform);
          }
        }
      }
    }

    // --- 3. VERTICAL PICKUP / CLASSIC ESTATE / MICRO DOT LAMPS ---
    else if (spec.rearLamp === 'truck_vertical' || spec.rearLamp === 'classic_vert_estate' || spec.rearLamp === 'micro_dot') {
      const ly = halfW * 0.84 * side;
      const lenX = spec.rearLamp === 'micro_dot' ? 1.55 : 2.1;
      const wY = spec.rearLamp === 'micro_dot' ? 1.35 : 1.5;
      drawRoundedBox(ctx, rx - 0.15, ly - wY * 0.5, lenX, wY, 0.35, '#111827', deform);
      if (!broken) {
        // Main ruby lens
        drawRoundedBox(ctx, rx + 0.05, ly - wY * 0.42, lenX * 0.52, wY * 0.84, 0.2, rubyMain, deform);
        if (lights.braking || lights.positionOn) {
          drawRoundedBox(ctx, rx + 0.25, ly - wY * 0.2, lenX * 0.24, wY * 0.4, 0.1, rubyCore, deform);
        }
        // Forward-wrapped amber / reverse top chamber
        drawRoundedBox(
          ctx,
          rx + lenX * 0.54,
          ly - wY * 0.42,
          lenX * 0.36,
          wY * 0.84,
          0.18,
          lights.reversing ? '#ffffff' : amberCol,
          deform
        );
      }
    }

    // --- 4. MODERN SPLIT LED / FULL LIGHTBAR END CLUSTERS / SUV WRAP / CLASSIC HORIZONTAL ---
    else {
      const isModern = spec.rearLamp === 'modern_split_led' || spec.rearLamp === 'full_lightbar' || spec.rearLamp === 'suv_wrap';
      const inY = halfW * (isModern ? 0.38 : 0.46);
      const outY = halfW * 0.88;
      const wrapX = isModern ? 1.55 : 1.05;

      // Recessed dark cluster bezel wrapping subtly onto the rear quarter
      drawMirroredQuad(
        ctx,
        rx - 0.2, inY,
        rx + 0.95, inY,
        rx + 0.95 + wrapX * 0.65, outY - 0.25,
        rx + 0.2, outY,
        side,
        '#14090d',
        deform,
        'rgba(15,23,42,0.55)',
        0.35
      );

      if (!broken) {
        const span = outY - inY;
        const yInbEnd = inY + span * 0.28;
        const yBrakeEnd = inY + span * 0.72;

        // Inboard chamber: reverse light / rear fog
        drawMirroredQuad(
          ctx,
          rx - 0.05, inY + 0.15,
          rx + 0.82, inY + 0.15,
          rx + 0.85, yInbEnd,
          rx, yInbEnd,
          side,
          inbCol,
          deform
        );

        // Main center chamber: brake / running ruby LED or reflector
        drawMirroredQuad(
          ctx,
          rx, yInbEnd,
          rx + 0.85, yInbEnd,
          rx + 1.05, yBrakeEnd,
          rx + 0.1, yBrakeEnd,
          side,
          rubyMain,
          deform
        );
        if (lights.braking || lights.positionOn) {
          drawMirroredQuad(
            ctx,
            rx + 0.22, yInbEnd + 0.22,
            rx + 0.65, yInbEnd + 0.22,
            rx + 0.78, yBrakeEnd - 0.22,
            rx + 0.32, yBrakeEnd - 0.22,
            side,
            rubyCore,
            deform
          );
        }

        // Outboard corner chamber: turn indicator (amber or dynamic sweeping LED)
        if (sigActive && lights.turnType === 'dynamic_sequential_led') {
          renderSequentialStrip(
            ctx,
            rx + 0.45,
            (inY + 0.3) * side,
            rx + 0.85,
            (outY - 0.35) * side,
            5,
            lights.turnSweep,
            deform
          );
        } else {
          drawMirroredQuad(
            ctx,
            rx + 0.1, yBrakeEnd,
            rx + 1.05, yBrakeEnd,
            rx + 0.9 + wrapX * 0.55, outY - 0.28,
            rx + 0.25, outY - 0.12,
            side,
            amberCol,
            deform
          );
          if (sigInt > 0.3) {
            const [ax, ay] = deform(rx + 0.65, ((yBrakeEnd + outY) * 0.5) * side);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(ax - 0.35, ay - 0.35, 0.7, 0.7);
          }
        }
      }
    }
  }
}

// ============================================================================
// NON-CLIPPED CHASSIS HARDWARE (EXHAUSTS, RUNNING BOARDS, PUSHBAR, WINCH, SPARE)
// ============================================================================

function renderChassisExteriorHardware(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  frontX: number,
  rearX: number,
  lights: CarLightState,
  deform: DeformFn
): void {
  // 1. Exhaust tailpipe tips
  const drawPipe = (py: number, chrome: boolean, radius = 0.72) => {
    drawRoundedBox(
      ctx,
      rearX - 0.75,
      py - radius * 0.55,
      1.15,
      radius * 1.1,
      0.2,
      chrome ? '#e2e8f0' : '#475569',
      deform,
      '#0f172a',
      0.32
    );
  };

  if (spec.exhaust === 'single_right') {
    drawPipe(halfW * 0.48, spec.chromeTrim, 0.68);
  } else if (spec.exhaust === 'dual' || spec.exhaust === 'dual_chrome') {
    const ch = spec.exhaust === 'dual_chrome';
    drawPipe(-halfW * 0.50, ch, 0.78);
    drawPipe(halfW * 0.50, ch, 0.78);
  } else if (spec.exhaust === 'center_twin') {
    drawPipe(-0.85, true, 0.76);
    drawPipe(0.85, true, 0.76);
  } else if (spec.exhaust === 'quad') {
    drawPipe(-halfW * 0.54, true, 0.62);
    drawPipe(-halfW * 0.40, true, 0.62);
    drawPipe(halfW * 0.40, true, 0.62);
    drawPipe(halfW * 0.54, true, 0.62);
  }

  // 2. Side running boards (luxury SUV, G-Class, Pickups, Rescue SUV)
  if (spec.runningBoards) {
    const rbFront = halfL * 0.34;
    const rbRear = spec.bodyClass === 'pickup' ? -halfL * 0.22 : -halfL * 0.40;
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        rbRear,
        side < 0 ? -halfW - 0.85 : halfW - 0.15,
        rbFront - rbRear,
        1.0,
        0.25,
        '#1f2937',
        deform,
        spec.chromeTrim ? '#cbd5e1' : '#0f172a',
        0.35
      );
    }
  }

  // 3. Police Interceptor heavy push-bar / Ambulance brush guard (integrated on nose)
  if (spec.bumper === 'police_pushbar' || spec.bumper === 'ambulance_guard') {
    const barW = halfW * (spec.bumper === 'ambulance_guard' ? 0.66 : 0.48);
    drawRoundedBox(ctx, frontX - 0.2, -barW, 1.35, barW * 2, 0.3, '#111827', deform, '#334155', 0.4);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, frontX - 0.55, barW * 0.68 * side - 0.55, 1.85, 1.1, 0.2, '#1f2937', deform, '#090d14', 0.35);
    }
    // Red/blue grille strobe emitters on emergency units when siren is active
    if (lights.sirenOn) {
      const phase = Math.floor(performance.now() / 110) % 2;
      drawRoundedBox(ctx, frontX + 0.55, -barW * 0.42 - 0.55, 0.55, 1.1, 0.15, phase === 0 ? '#3b82f6' : '#1e3a8a', deform);
      drawRoundedBox(ctx, frontX + 0.55, barW * 0.42 - 0.55, 0.55, 1.1, 0.15, phase === 1 ? '#ef4444' : '#7f1d1d', deform);
    }
  }

  // 4. Hardcore Offroader front electric winch spool & recovery shackles
  if (spec.grille === 'offroad_winch') {
    // Winch drum housing
    drawRoundedBox(ctx, frontX - 0.5, -2.6, 1.75, 5.2, 0.35, '#1e293b', deform, '#090d14', 0.45);
    // Wound steel cable spool
    drawRoundedBox(ctx, frontX - 0.1, -1.75, 1.0, 3.5, 0.2, '#64748b', deform);
    for (let cy = -1.4; cy <= 1.4; cy += 0.55) {
      strokePoly(ctx, [[frontX - 0.1, cy], [frontX + 0.9, cy]], '#334155', 0.3, deform);
    }
    // Red recovery tow D-rings
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, frontX + 0.4, 4.1 * side - 0.45, 0.95, 0.9, 0.25, '#dc2626', deform, '#7f1d1d', 0.3);
    }
  }

  // 5. Rear tailgate-mounted full-size spare tire (G-Class & Hardcore 4x4)
  if (spec.rearSpare) {
    const spareW = 3.1;
    const spareD = 2.05;
    const isHardCover = spec.roofFeature === 'rails_only'; // G-Class hard shell vs bare mud tire
    const spareX = rearX - spareD + 0.82; // Flush bolted directly onto tailgate
    drawRoundedBox(
      ctx,
      spareX,
      -spareW,
      spareD,
      spareW * 2,
      0.65,
      isHardCover ? '#181e28' : '#0f172a',
      deform,
      isHardCover ? '#94a3b8' : '#1e293b',
      isHardCover ? 0.65 : 0.45
    );
    if (!isHardCover) {
      // Bare aggressive offroad tread lugs on spare tire
      for (let sy = -spareW + 0.6; sy <= spareW - 0.6; sy += 0.82) {
        strokePoly(ctx, [[spareX + 0.25, sy], [spareX + spareD - 0.25, sy]], '#334155', 0.45, deform);
      }
    } else {
      // Sleek chrome outer ring & metallic hard cover center badge on G-Class spare carrier
      strokePoly(ctx, [[spareX + 0.45, -spareW + 0.65], [spareX + 0.45, spareW - 0.65]], 'rgba(226,232,240,0.68)', 0.55, deform);
      drawRoundedBox(ctx, spareX + 0.65, -1.25, 0.75, 2.5, 0.2, '#334155', deform);
    }
  }
}

// ============================================================================
// LAYER 2: GREENHOUSE, INTERIOR DEPTH, WIPERS, ROOF, MIRRORS, SPOILERS & CHMSL
// ============================================================================

export function renderPassengerCarUpperLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform, nightAlpha } = vCtx;
  const spec = getSpec(car.type);
  const lights = computeCarLightState(car, nightAlpha);

  const basePaint =
    spec.livery === 'police_dps'
      ? '#f1f5f9'
      : spec.livery === 'ambulance'
      ? '#f8fafc'
      : (car.color || '#64748b');

  const roofPaint = spec.blackRoof
    ? '#111827'
    : (spec.livery === 'police_dps' || spec.livery === 'ambulance')
    ? basePaint
    : (car.roofColor || basePaint);

  const wsFrontX = halfL * spec.wsFrontFrac - fc * 0.25;
  const wsRearX = halfL * spec.wsRearFrac;
  const roofRearX = halfL * spec.roofRearFrac;
  const rearGlassX = halfL * spec.rearGlassFrac + rc * 0.25;

  const baseHalfW = halfW * spec.cabinWidthFrac;
  const roofHalfW = halfW * spec.roofWidthFrac;

  // 1. SCULPTED WING MIRRORS (with integrated live LED turn signal repeaters!)
  renderWingMirrors(ctx, spec, halfW, wsFrontX, wsRearX, basePaint, lights, deform);

  // 2. TAPERED GREENHOUSE BASE (Dark rubber seal framing all glass)
  const ghPoly: Pt[] = [
    [wsFrontX, -baseHalfW * 0.92],
    [wsFrontX + 0.55, 0],
    [wsFrontX, baseHalfW * 0.92],
    [wsRearX, baseHalfW],
    [roofRearX, baseHalfW * (spec.bodyClass === 'coupe' || spec.bodyClass === 'supercar' ? 0.92 : 0.98)],
    [rearGlassX, baseHalfW * (spec.bodyClass === 'coupe' || spec.bodyClass === 'supercar' ? 0.80 : 0.88)],
    [rearGlassX - 0.35, 0],
    [rearGlassX, -baseHalfW * (spec.bodyClass === 'coupe' || spec.bodyClass === 'supercar' ? 0.80 : 0.88)],
    [roofRearX, -baseHalfW * (spec.bodyClass === 'coupe' || spec.bodyClass === 'supercar' ? 0.92 : 0.98)],
    [wsRearX, -baseHalfW],
  ];

  // Subtle ambient contact shadow under greenhouse lip
  ctx.save();
  tracePoly(ctx, ghPoly, deform, true);
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.38)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Glass dark base fill + subtle automotive smoked-blue tint gradient
  const glassGrad = ctx.createLinearGradient(rearGlassX, -baseHalfW, wsFrontX, baseHalfW);
  glassGrad.addColorStop(0.0, '#0b1220');
  glassGrad.addColorStop(0.35, '#132033');
  glassGrad.addColorStop(0.55, '#1b2d45');
  glassGrad.addColorStop(0.85, '#0f1a2b');
  glassGrad.addColorStop(1.0, '#09101c');
  ctx.fillStyle = glassGrad;
  ctx.fill();

  // Clip interior silhouettes & glass reflections strictly inside greenhouse
  ctx.clip();

  // 3. SUBTLE INTERIOR COCKPIT DEPTH (Dashboard, steering wheel on left y<0, seats)
  const dashX = wsFrontX - (wsFrontX - wsRearX) * 0.34;
  fillPoly(
    ctx,
    [
      [wsFrontX + 1.0, -baseHalfW],
      [dashX, -baseHalfW * 0.92],
      [dashX, baseHalfW * 0.92],
      [wsFrontX + 1.0, baseHalfW],
    ],
    'rgba(2, 6, 23, 0.58)',
    deform
  );

  // Steering wheel rim on driver's side (left side = negative Y in local car coordinates)
  const [swx, swy] = deform(dashX - 0.85, -roofHalfW * 0.44);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.arc(swx, swy, 1.0, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle front bucket seat headrest silhouettes visible through windshield/side glass
  const seatX = wsRearX - 1.4;
  for (const side of [-1, 1] as const) {
    drawRoundedBox(ctx, seatX - 1.4, roofHalfW * 0.48 * side - 1.15, 2.2, 2.3, 0.65, 'rgba(30, 41, 59, 0.52)', deform);
  }

  // Rear deck / parcel shelf / headrests on sedans & coupes
  if (spec.bodyClass !== 'pickup' && spec.bodyClass !== 'supercar' && spec.bodyClass !== 'micro') {
    const rSeatX = roofRearX + 0.8;
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, rSeatX - 0.8, roofHalfW * 0.45 * side - 0.9, 1.5, 1.8, 0.5, 'rgba(30, 41, 59, 0.45)', deform);
    }
  }

  // Crisp diagonal studio sky clearcoat glare across windshield & rear glass
  const glareGrad = ctx.createLinearGradient(wsFrontX, -baseHalfW, wsRearX, baseHalfW);
  glareGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.0)');
  glareGrad.addColorStop(0.32, 'rgba(224, 242, 254, 0.16)');
  glareGrad.addColorStop(0.46, 'rgba(255, 255, 255, 0.24)');
  glareGrad.addColorStop(0.58, 'rgba(224, 242, 254, 0.05)');
  glareGrad.addColorStop(1.0, 'rgba(224, 242, 254, 0.0)');
  fillPoly(
    ctx,
    [
      [wsFrontX + 0.8, -baseHalfW],
      [wsFrontX + 0.8, baseHalfW],
      [wsRearX - 0.5, baseHalfW],
      [wsRearX - 0.5, -baseHalfW],
    ],
    glareGrad,
    deform
  );

  // Rear glass glare & subtle defroster grid lines
  if (Math.abs(roofRearX - rearGlassX) > 1.2) {
    fillPoly(
      ctx,
      [
        [roofRearX + 0.3, -baseHalfW * 0.88],
        [roofRearX + 0.3, baseHalfW * 0.2],
        [rearGlassX - 0.5, baseHalfW * 0.65],
        [rearGlassX - 0.5, -baseHalfW * 0.88],
      ],
      'rgba(186, 230, 253, 0.09)',
      deform
    );
    // Fine horizontal rear glass defroster filaments
    const defStep = Math.max(0.85, (roofRearX - rearGlassX) / 5);
    for (let dx = rearGlassX + 0.7; dx < roofRearX - 0.5; dx += defStep) {
      strokePoly(ctx, [[dx, -roofHalfW * 0.78], [dx, roofHalfW * 0.78]], 'rgba(249, 115, 22, 0.14)', 0.25, deform);
    }
    // Classic muscle fastback rear window louvers!
    if (spec.bodyClass === 'muscle' && car.type === 'muscle_classic') {
      for (let lx = rearGlassX + 0.8; lx < roofRearX - 0.5; lx += 1.25) {
        strokePoly(ctx, [[lx, -roofHalfW * 0.88], [lx, roofHalfW * 0.88]], '#0b0f17', 0.75, deform);
      }
    }
  }

  ctx.restore();

  // Greenhouse perimeter trim molding (chrome on classic/luxury, matte black rubber on modern)
  strokePoly(
    ctx,
    ghPoly,
    spec.chromeTrim ? 'rgba(226, 232, 240, 0.75)' : 'rgba(15, 23, 42, 0.85)',
    spec.chromeTrim ? 0.75 : 0.65,
    deform,
    true
  );

  // 4. STRUCTURAL PILLARS (A, B, C, D pillars painted to match body/roof or blacked-out)
  const pillarCol = spec.blackRoof ? '#111827' : shadePaint(basePaint, -0.08);
  for (const side of [-1, 1] as const) {
    // A-pillar (front windshield frame)
    strokePoly(ctx, [[wsFrontX - 0.1, baseHalfW * 0.90 * side], [wsRearX, roofHalfW * side]], pillarCol, 0.95, deform);
    // B-pillar (blacked-out center door divider)
    if (spec.doors === 4) {
      const bX = wsRearX * 0.52 + roofRearX * 0.48;
      strokePoly(ctx, [[bX, baseHalfW * 0.98 * side], [bX, roofHalfW * side]], '#0f172a', 1.05, deform);
    }
    // C-pillar (rear roof buttress)
    const cRearX = spec.bodyClass === 'wagon' || spec.bodyClass === 'suv' || spec.bodyClass === 'box4x4'
      ? (wsRearX * 0.15 + roofRearX * 0.85)
      : rearGlassX + 0.2;
    strokePoly(
      ctx,
      [[roofRearX, roofHalfW * side], [cRearX, baseHalfW * (spec.bodyClass === 'coupe' ? 0.84 : 0.94) * side]],
      pillarCol,
      spec.bodyClass === 'hatch' || spec.bodyClass === 'coupe' ? 1.1 : 1.25,
      deform
    );
    // D-pillar on estates / SUVs
    if (spec.bodyClass === 'wagon' || spec.bodyClass === 'suv' || spec.bodyClass === 'box4x4') {
      strokePoly(ctx, [[roofRearX - 0.2, roofHalfW * side], [rearGlassX, baseHalfW * 0.88 * side]], pillarCol, 1.15, deform);
    }
  }

  // 5. ANIMATED TWIN WINDSHIELD WIPERS (linked live to car.wiperAngle!)
  const wsSpan = wsFrontX - wsRearX;
  const bladeLen = Math.min(4.4, roofHalfW * 0.82);
  const wAngle = car.wiperAngle !== undefined ? car.wiperAngle : 0;
  const pivotX = wsFrontX + 0.15;
  for (const pivotY of [-roofHalfW * 0.42, roofHalfW * 0.22]) {
    const baseAngle = -Math.PI * 0.5 + 0.18 + wAngle * 0.85;
    const tipX = pivotX - Math.sin(Math.abs(wAngle) * 0.9 + 0.22) * wsSpan * 0.62;
    const tipY = pivotY + Math.cos(baseAngle) * bladeLen * 0.45 - bladeLen * 0.55;
    strokePoly(ctx, [[pivotX, pivotY], [tipX, tipY]], '#0a0e14', 0.55, deform);
  }

  // Rear hatch wiper (wagons, hatchbacks, SUVs)
  if (spec.rearWiper) {
    const rwX = rearGlassX + 0.35;
    strokePoly(ctx, [[rwX, 0], [rwX + 0.75, 2.5]], '#0a0e14', 0.5, deform);
  }

  // 6. SCULPTED 3D-CROWNED ROOF PANEL
  const roofPoly: Pt[] = [
    [wsRearX, -roofHalfW * 0.96],
    [wsRearX + 0.45, 0],
    [wsRearX, roofHalfW * 0.96],
    [roofRearX, roofHalfW * (spec.bodyClass === 'coupe' || spec.bodyClass === 'supercar' ? 0.90 : 0.96)],
    [roofRearX - 0.35, 0],
    [roofRearX, -roofHalfW * (spec.bodyClass === 'coupe' || spec.bodyClass === 'supercar' ? 0.90 : 0.96)],
  ];

  const roofGrad = ctx.createLinearGradient(0, -roofHalfW, 0, roofHalfW);
  roofGrad.addColorStop(0.0, shadePaint(roofPaint, -0.18));
  roofGrad.addColorStop(0.18, shadePaint(roofPaint, 0.12));
  roofGrad.addColorStop(0.45, shadePaint(roofPaint, 0.26));
  roofGrad.addColorStop(0.55, shadePaint(roofPaint, 0.22));
  roofGrad.addColorStop(0.82, shadePaint(roofPaint, 0.08));
  roofGrad.addColorStop(1.0, shadePaint(roofPaint, -0.20));

  fillPoly(ctx, roofPoly, roofGrad, deform, 'rgba(2, 6, 23, 0.42)', 0.6);

  // Subtle roof ditch rain channels along left/right roof edges
  for (const side of [-1, 1] as const) {
    strokePoly(
      ctx,
      [[wsRearX - 0.5, roofHalfW * 0.84 * side], [roofRearX + 0.5, roofHalfW * 0.84 * side]],
      'rgba(15, 23, 42, 0.28)',
      0.4,
      deform
    );
  }

  // Racing stripes continuing cleanly across roof
  if (spec.racingStripes === 'twin') {
    const stripeCol = colorLuminance(basePaint) > 0.55 ? '#111827' : '#f1f5f9';
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [roofRearX + 0.1, 0.55 * side],
          [wsRearX - 0.1, 0.55 * side],
          [wsRearX - 0.1, 2.30 * side],
          [roofRearX + 0.1, 2.30 * side],
        ],
        stripeCol,
        deform
      );
    }
  }

  // Roof stamped ribs on boxy 4x4 (G-Class / Offroader)
  if (spec.bodyClass === 'box4x4') {
    for (const ry of [-roofHalfW * 0.52, -roofHalfW * 0.18, roofHalfW * 0.18, roofHalfW * 0.52]) {
      strokePoly(ctx, [[roofRearX + 1.4, ry], [wsRearX - 1.4, ry]], 'rgba(255,255,255,0.16)', 0.55, deform);
      strokePoly(ctx, [[roofRearX + 1.4, ry + 0.4], [wsRearX - 1.4, ry + 0.4]], 'rgba(2,6,23,0.18)', 0.35, deform);
    }
  }

  // Roof medical cross on Ambulance SUV
  if (spec.livery === 'ambulance') {
    const mcx = (wsRearX + roofRearX) * 0.5 - 1.6;
    fillPoly(ctx, [[mcx - 3.0, -0.95], [mcx + 3.0, -0.95], [mcx + 3.0, 0.95], [mcx - 3.0, 0.95]], '#dc2626', deform);
    fillPoly(ctx, [[mcx - 0.95, -3.0], [mcx + 0.95, -3.0], [mcx + 0.95, 3.0], [mcx - 0.95, 3.0]], '#dc2626', deform);
  }

  // 7. ROOF FEATURES (Sunroof, Panoramic Glass, Rails, Expedition Rack, Taxi Sign, Emergency Lightbars, HD Markers)
  renderRoofFeatures(ctx, spec, wsRearX, roofRearX, roofHalfW, lights, deform);

  // 8. INTEGRATED THIRD BRAKE LIGHT (CHMSL) — part of the model, zero generic overlay!
  renderIntegratedCHMSL(ctx, spec, roofRearX, rearGlassX, roofHalfW, lights, deform);

  // 9. REAR SPOILERS / ACTIVE WINGS
  renderRearSpoiler(ctx, spec, halfL, halfW, rc, roofRearX, basePaint, deform);
}

// ============================================================================
// WING MIRRORS WITH INTEGRATED LED REPEATERS
// ============================================================================

function renderWingMirrors(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfW: number,
  wsFrontX: number,
  wsRearX: number,
  basePaint: string,
  lights: CarLightState,
  deform: DeformFn
): void {
  const mx = wsFrontX * 0.64 + wsRearX * 0.36;
  const mirrorColor = spec.chromeTrim
    ? '#e2e8f0'
    : (spec.bumper === 'unpainted_90s' || spec.bumper === 'steel_heavy')
    ? '#1e242d'
    : shadePaint(basePaint, 0.08);

  const reach = spec.towMirrors ? 2.55 : spec.bodyClass === 'box4x4' ? 2.15 : 1.75;
  const mLen = spec.towMirrors ? 1.85 : 1.45;

  for (const side of [-1, 1] as const) {
    const isLeft = side < 0;
    const sigActive = isLeft ? lights.leftSignal : lights.rightSignal;
    const sigInt = sigActive ? lights.turnIntensity : 0;

    // Aerodynamic mirror stalk connecting cleanly to door beltline
    strokePoly(
      ctx,
      [[mx + 0.25, (halfW - 0.35) * side], [mx - 0.2, (halfW + reach * 0.55) * side]],
      '#141923',
      spec.towMirrors ? 0.95 : 0.75,
      deform
    );

    // Sculpted teardrop / rectangular mirror cap
    drawMirroredQuad(
      ctx,
      mx + mLen * 0.45, halfW + 0.15,
      mx + mLen * 0.25, halfW + reach,
      mx - mLen * 0.65, halfW + reach * 0.92,
      mx - mLen * 0.55, halfW + 0.2,
      side,
      mirrorColor,
      deform,
      'rgba(2, 6, 23, 0.55)',
      0.4
    );

    // Integrated LED mirror turn signal blade on forward edge of mirror cap
    if (lights.hasMirrorRepeaters) {
      if (sigActive && lights.repeaterStyle === 'mirror_led_dynamic') {
        renderSequentialStrip(
          ctx,
          mx + mLen * 0.35,
          (halfW + 0.35) * side,
          mx + mLen * 0.15,
          (halfW + reach - 0.2) * side,
          3,
          lights.turnSweep,
          deform
        );
      } else {
        const ledCol = sigInt > 0.1
          ? `rgba(245, 158, 11, ${0.55 + 0.45 * sigInt})`
          : 'rgba(203, 213, 225, 0.4)';
        strokePoly(
          ctx,
          [[mx + mLen * 0.38, (halfW + 0.35) * side], [mx + mLen * 0.18, (halfW + reach - 0.18) * side]],
          ledCol,
          sigInt > 0.1 ? 0.65 : 0.35,
          deform
        );
      }
    }
  }
}

// ============================================================================
// ROOF FEATURES (SUNROOF, PANORAMIC, RAILS, RACKS, TAXI, SIRENS, ANTENNAS)
// ============================================================================

function renderRoofFeatures(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  wsRearX: number,
  roofRearX: number,
  roofHalfW: number,
  lights: CarLightState,
  deform: DeformFn
): void {
  const roofLen = wsRearX - roofRearX;
  const roofMidX = (wsRearX + roofRearX) * 0.5;

  // 1. Sunroof or Full Panoramic Smoked Glass Roof
  if (spec.roofFeature === 'sunroof') {
    const srL = Math.min(4.8, roofLen * 0.42);
    const srW = roofHalfW * 1.38;
    drawRoundedBox(ctx, wsRearX - srL - 1.2, -srW * 0.5, srL, srW, 0.5, '#0c1524', deform, '#334155', 0.45);
    strokePoly(ctx, [[wsRearX - 2.0, -srW * 0.38], [wsRearX - srL - 0.4, srW * 0.15]], 'rgba(186,230,253,0.22)', 0.7, deform);
  } else if (spec.roofFeature === 'panoramic' || spec.roofFeature === 'rails_panoramic') {
    const panL = Math.max(4.0, roofLen - 2.2);
    const panW = roofHalfW * 1.52;
    drawRoundedBox(ctx, roofRearX + 1.1, -panW * 0.5, panL, panW, 0.55, '#0a1220', deform, '#334155', 0.45);
    // Center glass cross-seam
    strokePoly(ctx, [[roofMidX, -panW * 0.48], [roofMidX, panW * 0.48]], '#1e293b', 0.65, deform);
    // Crisp glass sky highlight
    strokePoly(ctx, [[wsRearX - 1.8, -panW * 0.35], [roofRearX + 2.2, panW * 0.25]], 'rgba(186,230,253,0.18)', 1.1, deform);
  }

  // 2. Brushed Aluminum / Black Roof Rails (Wagons, SUVs, Allroad)
  if (spec.roofFeature === 'rails_only' || spec.roofFeature === 'rails_panoramic' || spec.roofFeature === 'allroad_rack') {
    const railCol = spec.chromeTrim || spec.roofFeature === 'rails_panoramic' || spec.roofFeature === 'allroad_rack'
      ? '#cbd5e1'
      : '#1e293b';
    for (const side of [-1, 1] as const) {
      const ry = roofHalfW * 0.86 * side;
      strokePoly(ctx, [[roofRearX + 1.2, ry], [wsRearX - 1.0, ry]], railCol, 0.85, deform);
      // Mounting stanchions
      for (const sx of [roofRearX + 1.6, roofMidX, wsRearX - 1.4]) {
        const [px, py] = deform(sx, ry);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px - 0.45, py - 0.45, 0.9, 0.9);
      }
    }
    if (spec.roofFeature === 'allroad_rack') {
      // Crossbars on Allroad touring rack
      for (const cx of [roofMidX + roofLen * 0.22, roofMidX - roofLen * 0.24]) {
        strokePoly(ctx, [[cx, -roofHalfW * 0.86], [cx, roofHalfW * 0.86]], '#1e293b', 0.8, deform);
      }
    }
  }

  // 3. Heavy Expedition Steel Roof Rack + LED Lightbar + Recovery Gear (Hardcore 4x4)
  if (spec.roofFeature === 'expedition_rack') {
    const rx1 = roofRearX + 0.9;
    const rx2 = wsRearX - 0.8;
    const rw = roofHalfW * 0.86;
    // Steel perimeter basket
    drawRoundedBox(ctx, rx1, -rw, rx2 - rx1, rw * 2, 0.4, null, deform, '#111827', 0.95);
    // Cross slats
    for (let sx = rx1 + 1.8; sx < rx2 - 1.0; sx += 2.2) {
      strokePoly(ctx, [[sx, -rw], [sx, rw]], '#1f2937', 0.55, deform);
    }
    // Sand recovery traction boards strapped to left side
    drawRoundedBox(ctx, rx1 + 1.0, -rw + 0.65, Math.min(6.2, (rx2 - rx1) * 0.55), 1.9, 0.25, '#d97706', deform, '#78350f', 0.35);
    // Olive expedition jerrycan / cargo case on right side
    drawRoundedBox(ctx, rx1 + 1.2, rw - 2.65, 3.6, 2.0, 0.25, '#365314', deform, '#1a2e05', 0.35);
    // Forward-facing roof LED auxiliary lightbar
    const lbCol = lights.isHighBeam || lights.frontFogOn ? '#ffffff' : '#64748b';
    drawRoundedBox(ctx, rx2 - 0.4, -rw * 0.74, 0.85, rw * 1.48, 0.2, '#0f172a', deform);
    strokePoly(ctx, [[rx2 + 0.2, -rw * 0.68], [rx2 + 0.2, rw * 0.68]], lbCol, 0.6, deform);
  }

  // 4. Illuminated TAXI Roof Plafon
  if (spec.roofFeature === 'taxi_sign') {
    const tx = roofMidX + 0.8;
    drawRoundedBox(ctx, tx - 1.15, -2.55, 2.3, 5.1, 0.45, '#facc15', deform, '#1e293b', 0.5);
    // Checkered inner detail
    drawRoundedBox(ctx, tx - 0.5, -1.65, 1.0, 3.3, 0.2, '#fef08a', deform);
    strokePoly(ctx, [[tx, -1.3], [tx, 1.3]], '#0f172a', 0.55, deform);
  }

  // 5. Aerodynamic Emergency LED Roof Lightbar (Police DPS & Ambulance Rescue 4x4)
  if (spec.roofFeature === 'police_lightbar' || spec.roofFeature === 'ambulance_lightbar') {
    const isAmb = spec.roofFeature === 'ambulance_lightbar';
    const lx = wsRearX - (isAmb ? 2.4 : 2.8);
    const lbHalfW = roofHalfW * 0.86;
    const now = performance.now();
    const strobeA = Math.floor(now / 120) % 2 === 0;
    const strobeB = !strobeA;

    // Aluminum lightbar mount chassis
    drawRoundedBox(ctx, lx - 1.15, -lbHalfW, 2.3, lbHalfW * 2, 0.45, '#1e293b', deform, '#090d14', 0.45);
    // Center white speaker / takedown housing
    drawRoundedBox(ctx, lx - 0.9, -1.15, 1.8, 2.3, 0.25, '#e2e8f0', deform, '#475569', 0.3);

    // Left blue LED bank & Right red (or blue on ambulance) LED bank
    const leftLit = lights.sirenOn && strobeA;
    const rightLit = lights.sirenOn && strobeB;
    const leftColor = leftLit ? '#60a5fa' : '#1d4ed8';
    const rightColor = isAmb
      ? (rightLit ? '#60a5fa' : '#1d4ed8')
      : (rightLit ? '#f87171' : '#dc2626');

    drawRoundedBox(ctx, lx - 0.88, -lbHalfW + 0.35, 1.76, lbHalfW - 1.65, 0.3, leftColor, deform);
    drawRoundedBox(ctx, lx - 0.88, 1.3, 1.76, lbHalfW - 1.65, 0.3, rightColor, deform);

    if (leftLit) {
      drawRoundedBox(ctx, lx - 0.4, -lbHalfW + 0.8, 0.8, lbHalfW - 2.5, 0.2, '#ffffff', deform);
    }
    if (rightLit) {
      drawRoundedBox(ctx, lx - 0.4, 1.75, 0.8, lbHalfW - 2.5, 0.2, '#ffffff', deform);
    }

    // Rear secondary roof amber/blue traffic bar on Ambulance Rescue SUV
    if (isAmb) {
      const rlx = roofRearX + 1.6;
      drawRoundedBox(ctx, rlx - 0.65, -lbHalfW * 0.78, 1.3, lbHalfW * 1.56, 0.3, '#1e293b', deform);
      const rCol = lights.sirenOn ? (strobeA ? '#f59e0b' : '#3b82f6') : '#92400e';
      drawRoundedBox(ctx, rlx - 0.4, -lbHalfW * 0.68, 0.8, lbHalfW * 1.36, 0.2, rCol, deform);
    }
  }

  // 6. Heavy-Duty Pickup Cab Roof Amber Clearance Markers (3-dot center + 2 outboard)
  if (spec.roofFeature === 'hd_cab_markers') {
    const mx = wsRearX - 0.95;
    const mCol = lights.positionOn ? '#f59e0b' : '#78350f';
    for (const my of [-roofHalfW * 0.72, -1.6, 0, 1.6, roofHalfW * 0.72]) {
      drawRoundedBox(ctx, mx - 0.35, my - 0.42, 0.7, 0.84, 0.2, mCol, deform, '#0f172a', 0.25);
      if (lights.positionOn) {
        drawRoundedBox(ctx, mx - 0.15, my - 0.18, 0.32, 0.36, 0.1, '#fef08a', deform);
      }
    }
  }

  // 7. Shark-Fin or Whip Radio Antenna
  if (spec.antenna === 'sharkfin') {
    fillPoly(
      ctx,
      [
        [roofRearX + 2.6, 0],
        [roofRearX + 0.9, -0.45],
        [roofRearX + 0.9, 0.45],
      ],
      '#111827',
      deform
    );
  } else if (spec.antenna === 'whip_front') {
    const [ax, ay] = deform(wsRearX - 0.8, 0);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ax, ay, 0.42, 0, Math.PI * 2);
    ctx.fill();
    strokePoly(ctx, [[wsRearX - 0.8, 0], [wsRearX - 3.6, 0]], 'rgba(15,23,42,0.55)', 0.35, deform);
  } else if (spec.antenna === 'whip_rear') {
    const [ax, ay] = deform(roofRearX + 1.0, 0);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ax, ay, 0.45, 0, Math.PI * 2);
    ctx.fill();
    strokePoly(ctx, [[roofRearX + 1.0, 0], [roofRearX - 2.2, 0]], 'rgba(15,23,42,0.55)', 0.35, deform);
  }
}

// ============================================================================
// INTEGRATED THIRD BRAKE LIGHT (CHMSL)
// ============================================================================

function renderIntegratedCHMSL(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  roofRearX: number,
  rearGlassX: number,
  roofHalfW: number,
  lights: CarLightState,
  deform: DeformFn
): void {
  // Classic 1960s/70s Soviet & Vintage Muscle cars predate mandatory CHMSL
  if (
    spec.bodyClass === 'retro_bubble' ||
    spec.frontLamp === 'round_single' ||
    spec.frontLamp === 'round_twin' ||
    spec.frontLamp === 'muscle_recessed'
  ) {
    return;
  }

  const chmslX = spec.bodyClass === 'sedan' || spec.bodyClass === 'coupe'
    ? rearGlassX + 0.75
    : roofRearX + 0.35;
  const barHalfW = Math.min(2.6, roofHalfW * 0.44);

  drawRoundedBox(
    ctx,
    chmslX - 0.35,
    -barHalfW,
    0.7,
    barHalfW * 2,
    0.2,
    lights.braking ? '#ef4444' : '#450a0a',
    deform,
    '#0f172a',
    0.25
  );
  if (lights.braking) {
    strokePoly(ctx, [[chmslX, -barHalfW + 0.35], [chmslX, barHalfW - 0.35]], '#ffffff', 0.35, deform);
  }
}

// ============================================================================
// REAR SPOILERS & ACTIVE WINGS
// ============================================================================

function renderRearSpoiler(
  ctx: CanvasRenderingContext2D,
  spec: PassengerCarSpec,
  halfL: number,
  halfW: number,
  rc: number,
  roofRearX: number,
  basePaint: string,
  deform: DeformFn
): void {
  if (spec.spoiler === 'none') return;
  const rearX = -halfL + rc;

  if (spec.spoiler === 'lip') {
    // Sleek trunk-edge ducktail lip spoiler
    drawRoundedBox(ctx, rearX + 1.15, -halfW * 0.72, 1.1, halfW * 1.44, 0.3, '#111827', deform, 'rgba(148,163,184,0.28)', 0.3);
  } else if (spec.spoiler === 'hatch_wing') {
    // Integrated roof-edge tailgate spoiler
    drawRoundedBox(ctx, roofRearX - 1.15, -halfW * 0.68, 1.35, halfW * 1.36, 0.35, shadePaint(basePaint, -0.06), deform, 'rgba(2,6,23,0.45)', 0.4);
  } else if (spec.spoiler === 'hot_hatch_wing') {
    // Twin-plane matte black/carbon hot hatch roof spoiler with side endplates
    drawRoundedBox(ctx, roofRearX - 1.7, -halfW * 0.76, 1.9, halfW * 1.52, 0.35, '#111827', deform, '#334155', 0.4);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, roofRearX - 2.0, (halfW * 0.76) * side - 0.35, 2.3, 0.7, 0.15, '#dc2626', deform);
    }
  } else if (spec.spoiler === 'gt_wing' || spec.spoiler === 'supercar_active') {
    const isSuper = spec.spoiler === 'supercar_active';
    const wingW = halfW * (isSuper ? 0.92 : 0.86);
    const wx = rearX + (isSuper ? 0.4 : 0.75);
    // Wing mounting pylons
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, wx + 0.5, wingW * 0.42 * side - 0.35, 1.8, 0.7, 0.15, '#1e293b', deform);
    }
    // Carbon airfoil blade
    drawRoundedBox(ctx, wx - 0.3, -wingW, 2.1, wingW * 2, 0.35, '#11161f', deform, 'rgba(226,232,240,0.35)', 0.4);
    // Wing leading highlight
    strokePoly(ctx, [[wx + 1.45, -wingW + 0.5], [wx + 1.45, wingW - 0.5]], 'rgba(255,255,255,0.22)', 0.4, deform);
    // Sculpted side endplates
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, wx - 0.65, wingW * side - 0.42, 2.8, 0.84, 0.2, shadePaint(basePaint, 0.05), deform, '#090d14', 0.35);
    }
  } else if (spec.spoiler === 'muscle_deck') {
    // Classic matte-black pedestal trunk spoiler
    drawRoundedBox(ctx, rearX + 1.4, -halfW * 0.78, 1.65, halfW * 1.56, 0.25, '#111827', deform, '#334155', 0.4);
  }
}

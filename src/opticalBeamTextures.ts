/**
 * Physically-based 2D Optical Beam Texture Engine (IES-like Angular + Radial Profiles)
 *
 * Replaces hard-clipped vector cone paths filled with radial-only gradients
 * (which create a sharp step-function cutoff along lateral flanks) with genuine
 * 2D photometric distributions I(r, theta) = f_dist(r) * g_angle(theta):
 *   - Multi-zone real optics: focused Hotspot + transitional Corona + wide peripheral Spill
 *   - Smooth finite-aperture origin (virtual reflector focus behind lens plane)
 *   - Authentic ECE R112 right-kerb asymmetry for automotive low beams with zero side knife-edges
 *   - Dual-Kelvin color temperature shift from hot central core to outer corona/spill
 *   - Guaranteed smooth zero-at-border window so sprite bounds are never visible
 *
 * Each profile's scalar intensity & core-weight fields are generated once lazily into
 * compact offscreen sprites and drawn in a single GPU-accelerated `drawImage` call.
 */

export type OpticalBeamProfile =
  | 'low_beam'
  | 'low_beam_vintage'
  | 'low_beam_projector'
  | 'high_beam'
  | 'fog_lamp'
  | 'rear_beam'
  | 'flashlight'
  | 'phone_flash'
  | 'camera_flood'
  | 'siren_lobe'
  | 'locomotive'
  | 'signal_beam'
  | 'underwater'
  | 'window_sun';

export type OpticalRgb = readonly [number, number, number];

interface ProfileSpec {
  /** Nominal halfWidth / reach ratio baked into the polar angle evaluation */
  nomAspect: number;
  /** Virtual focal point offset behind the lens face (normalized to reach) -> finite aperture width */
  focusBack: number;
  /** Housing rear cutoff softness behind u = 0 */
  backBleed: number;
  frontRamp: number;
  /** Asymmetric ECE R112 parameters (only used when asymmetric = true) */
  asymmetric?: boolean;
  hotShiftTheta?: number;
  corShiftTheta?: number;
  /** Hotspot lobe */
  hotWeight: number;
  hotSigmaLeft: number;
  hotSigmaRight: number;
  hotPower: number;
  hotReachLeft: number;
  hotReachRight: number;
  hotHeight: number;
  /** Corona / penumbra transition lobe */
  corWeight: number;
  corSigmaLeft: number;
  corSigmaRight: number;
  corPower: number;
  corReachLeft: number;
  corReachRight: number;
  corHeight: number;
  /** Wide peripheral glass/bezel spill lobe */
  spillWeight: number;
  spillSigma: number;
  spillReach: number;
  spillHeight: number;
  /** Cutout perceptual compression gamma (Weber-Fechner night vision curve; <1 lifts soft penumbra) */
  cutoutGamma: number;
  /** Color radiance inverse-square steepness (>1 concentrates rich tint in hotspot & near-field) */
  colorGamma: number;
}

const TEX_W = 192;
const TEX_H = 160;
const ANCHOR_U = 0.14; // Emitter lens sits at 14% from left edge, leaving 86% for forward reach

const PROFILE_SPECS: Record<OpticalBeamProfile, ProfileSpec> = {
  // Halogen ECE R112 asymmetric low beam: smooth right-kerb reach, tucked left oncoming flank, gentle wide spill
  low_beam: {
    nomAspect: 0.72,
    focusBack: 0.048,
    backBleed: 0.045,
    frontRamp: 0.055,
    asymmetric: true,
    hotShiftTheta: 0.065,
    corShiftTheta: 0.085,
    hotWeight: 0.62,
    hotSigmaLeft: 0.17,
    hotSigmaRight: 0.27,
    hotPower: 2.05,
    hotReachLeft: 0.56,
    hotReachRight: 0.84,
    hotHeight: 0.26,
    corWeight: 0.44,
    corSigmaLeft: 0.32,
    corSigmaRight: 0.52,
    corPower: 1.95,
    corReachLeft: 0.74,
    corReachRight: 0.98,
    corHeight: 0.34,
    spillWeight: 0.26,
    spillSigma: 0.92,
    spillReach: 0.52,
    spillHeight: 0.28,
    cutoutGamma: 0.68,
    colorGamma: 1.15,
  },

  // Vintage fluted-glass sealed-beam / Soviet reflector: softer, rounder, warmer, gentler asymmetry
  low_beam_vintage: {
    nomAspect: 0.76,
    focusBack: 0.055,
    backBleed: 0.055,
    frontRamp: 0.060,
    asymmetric: true,
    hotShiftTheta: 0.045,
    corShiftTheta: 0.060,
    hotWeight: 0.54,
    hotSigmaLeft: 0.22,
    hotSigmaRight: 0.31,
    hotPower: 1.90,
    hotReachLeft: 0.62,
    hotReachRight: 0.82,
    hotHeight: 0.30,
    corWeight: 0.46,
    corSigmaLeft: 0.39,
    corSigmaRight: 0.56,
    corPower: 1.85,
    corReachLeft: 0.78,
    corReachRight: 0.96,
    corHeight: 0.36,
    spillWeight: 0.32,
    spillSigma: 1.02,
    spillReach: 0.58,
    spillHeight: 0.30,
    cutoutGamma: 0.70,
    colorGamma: 1.12,
  },

  // Modern HID Xenon / LED Matrix projector: broader uniform lane fill, clean but still optically feathered penumbra
  low_beam_projector: {
    nomAspect: 0.74,
    focusBack: 0.042,
    backBleed: 0.038,
    frontRamp: 0.048,
    asymmetric: true,
    hotShiftTheta: 0.070,
    corShiftTheta: 0.095,
    hotWeight: 0.68,
    hotSigmaLeft: 0.19,
    hotSigmaRight: 0.30,
    hotPower: 2.30,
    hotReachLeft: 0.62,
    hotReachRight: 0.90,
    hotHeight: 0.28,
    corWeight: 0.42,
    corSigmaLeft: 0.34,
    corSigmaRight: 0.54,
    corPower: 2.15,
    corReachLeft: 0.76,
    corReachRight: 0.99,
    corHeight: 0.34,
    spillWeight: 0.22,
    spillSigma: 0.88,
    spillReach: 0.50,
    spillHeight: 0.26,
    cutoutGamma: 0.65,
    colorGamma: 1.12,
  },

  // Symmetric long-range high beam: intense central spear + generous corona + wide near spill
  high_beam: {
    nomAspect: 0.56,
    focusBack: 0.042,
    backBleed: 0.042,
    frontRamp: 0.050,
    hotWeight: 0.70,
    hotSigmaLeft: 0.145,
    hotSigmaRight: 0.145,
    hotPower: 2.0,
    hotReachLeft: 0.96,
    hotReachRight: 0.96,
    hotHeight: 0.30,
    corWeight: 0.42,
    corSigmaLeft: 0.34,
    corSigmaRight: 0.34,
    corPower: 1.9,
    corReachLeft: 0.94,
    corReachRight: 0.94,
    corHeight: 0.36,
    spillWeight: 0.24,
    spillSigma: 0.84,
    spillReach: 0.48,
    spillHeight: 0.28,
    cutoutGamma: 0.66,
    colorGamma: 1.12,
  },

  // Front fog lamps (PTF): wide low-slung selective-yellow fan with ultra-soft roadside fade
  fog_lamp: {
    nomAspect: 0.94,
    focusBack: 0.058,
    backBleed: 0.055,
    frontRamp: 0.055,
    hotWeight: 0.50,
    hotSigmaLeft: 0.44,
    hotSigmaRight: 0.44,
    hotPower: 2.0,
    hotReachLeft: 0.76,
    hotReachRight: 0.76,
    hotHeight: 0.32,
    corWeight: 0.46,
    corSigmaLeft: 0.78,
    corSigmaRight: 0.78,
    corPower: 1.85,
    corReachLeft: 0.94,
    corReachRight: 0.94,
    corHeight: 0.38,
    spillWeight: 0.28,
    spillSigma: 1.15,
    spillReach: 0.58,
    spillHeight: 0.32,
    cutoutGamma: 0.72,
    colorGamma: 1.14,
  },

  // Reverse & brake rear optics: wide diffused Lambertian ground wash behind bumper
  rear_beam: {
    nomAspect: 0.92,
    focusBack: 0.075,
    backBleed: 0.065,
    frontRamp: 0.055,
    hotWeight: 0.46,
    hotSigmaLeft: 0.46,
    hotSigmaRight: 0.46,
    hotPower: 1.9,
    hotReachLeft: 0.74,
    hotReachRight: 0.74,
    hotHeight: 0.36,
    corWeight: 0.44,
    corSigmaLeft: 0.86,
    corSigmaRight: 0.86,
    corPower: 1.8,
    corReachLeft: 0.95,
    corReachRight: 0.95,
    corHeight: 0.40,
    spillWeight: 0.34,
    spillSigma: 1.28,
    spillReach: 0.62,
    spillHeight: 0.34,
    cutoutGamma: 0.74,
    colorGamma: 1.15,
  },

  // Handheld reflector flashlight: focused central hotspot + glowing corona + broad soft bezel spill
  flashlight: {
    nomAspect: 0.64,
    focusBack: 0.036,
    backBleed: 0.045,
    frontRamp: 0.050,
    hotWeight: 0.68,
    hotSigmaLeft: 0.15,
    hotSigmaRight: 0.15,
    hotPower: 2.1,
    hotReachLeft: 0.94,
    hotReachRight: 0.94,
    hotHeight: 0.28,
    corWeight: 0.36,
    corSigmaLeft: 0.33,
    corSigmaRight: 0.33,
    corPower: 1.9,
    corReachLeft: 0.86,
    corReachRight: 0.86,
    corHeight: 0.34,
    spillWeight: 0.28,
    spillSigma: 0.76,
    spillReach: 0.60,
    spillHeight: 0.32,
    cutoutGamma: 0.68,
    colorGamma: 1.16,
  },

  // Smartphone bare LED flash: no narrow cone; wide smooth cosine flood with faster distance drop-off
  phone_flash: {
    nomAspect: 0.96,
    focusBack: 0.065,
    backBleed: 0.070,
    frontRamp: 0.055,
    hotWeight: 0.50,
    hotSigmaLeft: 0.58,
    hotSigmaRight: 0.58,
    hotPower: 1.85,
    hotReachLeft: 0.72,
    hotReachRight: 0.72,
    hotHeight: 0.32,
    corWeight: 0.44,
    corSigmaLeft: 0.94,
    corSigmaRight: 0.94,
    corPower: 1.75,
    corReachLeft: 0.94,
    corReachRight: 0.94,
    corHeight: 0.36,
    spillWeight: 0.32,
    spillSigma: 1.32,
    spillReach: 0.62,
    spillHeight: 0.34,
    cutoutGamma: 0.74,
    colorGamma: 1.24,
  },

  // Surveillance camera LED floodlight: wide prismatic diffuser wash, zero hard sector lines
  camera_flood: {
    nomAspect: 0.90,
    focusBack: 0.055,
    backBleed: 0.050,
    frontRamp: 0.055,
    hotWeight: 0.52,
    hotSigmaLeft: 0.42,
    hotSigmaRight: 0.42,
    hotPower: 2.0,
    hotReachLeft: 0.82,
    hotReachRight: 0.82,
    hotHeight: 0.34,
    corWeight: 0.46,
    corSigmaLeft: 0.74,
    corSigmaRight: 0.74,
    corPower: 1.85,
    corReachLeft: 0.96,
    corReachRight: 0.96,
    corHeight: 0.40,
    spillWeight: 0.28,
    spillSigma: 1.10,
    spillReach: 0.56,
    spillHeight: 0.34,
    cutoutGamma: 0.68,
    colorGamma: 1.12,
  },

  // Rotating emergency siren beacon lobe: ribbed polycarbonate Fresnel lens -> ultra-soft wide sweep
  siren_lobe: {
    nomAspect: 0.88,
    focusBack: 0.075,
    backBleed: 0.080,
    frontRamp: 0.060,
    hotWeight: 0.48,
    hotSigmaLeft: 0.38,
    hotSigmaRight: 0.38,
    hotPower: 1.85,
    hotReachLeft: 0.82,
    hotReachRight: 0.82,
    hotHeight: 0.38,
    corWeight: 0.44,
    corSigmaLeft: 0.74,
    corSigmaRight: 0.74,
    corPower: 1.75,
    corReachLeft: 0.96,
    corReachRight: 0.96,
    corHeight: 0.42,
    spillWeight: 0.32,
    spillSigma: 1.20,
    spillReach: 0.60,
    spillHeight: 0.36,
    cutoutGamma: 0.74,
    colorGamma: 1.10,
  },

  // Locomotive parabolic searchlight: penetrating narrow rail core + broad soft parabolic halo + spill
  locomotive: {
    nomAspect: 0.46,
    focusBack: 0.032,
    backBleed: 0.038,
    frontRamp: 0.045,
    hotWeight: 0.74,
    hotSigmaLeft: 0.105,
    hotSigmaRight: 0.105,
    hotPower: 2.05,
    hotReachLeft: 0.98,
    hotReachRight: 0.98,
    hotHeight: 0.34,
    corWeight: 0.38,
    corSigmaLeft: 0.25,
    corSigmaRight: 0.25,
    corPower: 1.90,
    corReachLeft: 0.92,
    corReachRight: 0.92,
    corHeight: 0.38,
    spillWeight: 0.22,
    spillSigma: 0.66,
    spillReach: 0.46,
    spillHeight: 0.30,
    cutoutGamma: 0.66,
    colorGamma: 1.10,
  },

  // Railway signal Fresnel lens beam: focused Gaussian collimated beam with soft feathered edges
  signal_beam: {
    nomAspect: 0.56,
    focusBack: 0.045,
    backBleed: 0.040,
    frontRamp: 0.045,
    hotWeight: 0.64,
    hotSigmaLeft: 0.17,
    hotSigmaRight: 0.17,
    hotPower: 2.0,
    hotReachLeft: 0.92,
    hotReachRight: 0.92,
    hotHeight: 0.32,
    corWeight: 0.38,
    corSigmaLeft: 0.35,
    corSigmaRight: 0.35,
    corPower: 1.85,
    corReachLeft: 0.92,
    corReachRight: 0.92,
    corHeight: 0.36,
    spillWeight: 0.22,
    spillSigma: 0.68,
    spillReach: 0.50,
    spillHeight: 0.30,
    cutoutGamma: 0.72,
    colorGamma: 1.12,
  },

  // Subsurface underwater headlight scatter: heavy aquatic Mie diffusion
  underwater: {
    nomAspect: 0.80,
    focusBack: 0.062,
    backBleed: 0.060,
    frontRamp: 0.055,
    hotWeight: 0.48,
    hotSigmaLeft: 0.34,
    hotSigmaRight: 0.34,
    hotPower: 1.85,
    hotReachLeft: 0.80,
    hotReachRight: 0.80,
    hotHeight: 0.36,
    corWeight: 0.46,
    corSigmaLeft: 0.66,
    corSigmaRight: 0.66,
    corPower: 1.75,
    corReachLeft: 0.95,
    corReachRight: 0.95,
    corHeight: 0.42,
    spillWeight: 0.30,
    spillSigma: 1.05,
    spillReach: 0.58,
    spillHeight: 0.34,
    cutoutGamma: 0.75,
    colorGamma: 1.08,
  },

  // Interior window daylight shaft: wide flat window aperture with soft penumbra edges
  window_sun: {
    nomAspect: 0.58,
    focusBack: 0.24,
    backBleed: 0.035,
    frontRamp: 0.070,
    hotWeight: 0.64,
    hotSigmaLeft: 0.21,
    hotSigmaRight: 0.21,
    hotPower: 2.35,
    hotReachLeft: 0.92,
    hotReachRight: 0.92,
    hotHeight: 0.48,
    corWeight: 0.34,
    corSigmaLeft: 0.36,
    corSigmaRight: 0.36,
    corPower: 1.90,
    corReachLeft: 0.96,
    corReachRight: 0.96,
    corHeight: 0.50,
    spillWeight: 0.14,
    spillSigma: 0.60,
    spillReach: 0.55,
    spillHeight: 0.42,
    cutoutGamma: 0.80,
    colorGamma: 1.05,
  },
};

interface CachedProfileField {
  cutoutAlpha: Uint8Array;
  colorAlpha: Uint8Array;
  coreMix: Uint8Array;
  cutoutCanvas: HTMLCanvasElement;
}

const profileFieldCache = new Map<OpticalBeamProfile, CachedProfileField>();
const tintedCanvasCache = new Map<string, HTMLCanvasElement>();
const MAX_TINTED_CACHE = 128;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Physical grazing-angle inverse-square distance attenuation on horizontal ground
 * with a smooth finite-range window reaching exact 0 at r = maxReach.
 */
function radialDecay(r: number, maxReach: number, height: number): number {
  if (r >= maxReach) return 0;
  const rn = r / maxReach;
  // Physical flat-ground illuminance ~ h / (r^2 + h^2)^1.5 normalized to 1 at r = 0
  const invSq = Math.pow(height / Math.hypot(r, height), 1.65);
  // Smooth C^2 window so energy reaches 0 with zero slope at r = maxReach
  const w = 1 - rn * rn;
  return invSq * w * w;
}

function angularGaussian(theta: number, sigma: number, power: number): number {
  const a = Math.abs(theta) / Math.max(1e-4, sigma);
  return Math.exp(-0.5 * Math.pow(a, power));
}

function buildProfileField(profile: OpticalBeamProfile): CachedProfileField {
  const existing = profileFieldCache.get(profile);
  if (existing) return existing;

  const spec = PROFILE_SPECS[profile];
  const count = TEX_W * TEX_H;
  const rawTotal = new Float32Array(count);
  const rawCore = new Float32Array(count);

  const x0 = TEX_W * ANCHOR_U;
  const fwdSpan = TEX_W * (1 - ANCHOR_U);
  const y0 = TEX_H * 0.5;
  const halfH = TEX_H * 0.5;

  let maxTotal = 1e-6;

  for (let py = 0; py < TEX_H; py++) {
    const v = (py + 0.5 - y0) / halfH; // [-1, 1]
    const absV = Math.abs(v);
    // Guaranteed smooth zero-at-border lateral window (active only near outer 22% of sprite height)
    const edgeV = smoothstep(1.0, 0.74, absV);
    if (edgeV <= 0) continue;

    const ry = v * spec.nomAspect;

    for (let px = 0; px < TEX_W; px++) {
      const u = (px + 0.5 - x0) / fwdSpan; // [-0.163 .. 1.0]
      // Guaranteed smooth zero-at-border forward & rear windows
      const edgeU = smoothstep(1.0, 0.78, u) * smoothstep(-ANCHOR_U / (1 - ANCHOR_U), -spec.backBleed * 1.15, u);
      if (edgeU <= 0) continue;

      const rx = u + spec.focusBack;
      const r = Math.hypot(rx, ry);
      const theta = Math.atan2(ry, rx);

      // Housing bezel occlusion behind the lens face (u = 0)
      const houseCore = smoothstep(-spec.backBleed * 0.55, spec.frontRamp, u);
      const houseSpill = smoothstep(-spec.backBleed * 1.15, spec.frontRamp * 0.85, u);

      // Asymmetric ECE R112 transition across theta = 0 (smoothstep prevents any centerline crease)
      const sideT = spec.asymmetric ? smoothstep(-0.30, 0.34, theta) : 0.5;

      const hotTheta = theta - (spec.hotShiftTheta ?? 0);
      const hotSigma = lerp(spec.hotSigmaLeft, spec.hotSigmaRight, sideT);
      const hotReach = lerp(spec.hotReachLeft, spec.hotReachRight, sideT);
      const hotVal =
        spec.hotWeight *
        houseCore *
        radialDecay(r, hotReach, spec.hotHeight) *
        angularGaussian(hotTheta, hotSigma, spec.hotPower);

      const corTheta = theta - (spec.corShiftTheta ?? 0);
      const corSigma = lerp(spec.corSigmaLeft, spec.corSigmaRight, sideT);
      const corReach = lerp(spec.corReachLeft, spec.corReachRight, sideT);
      const corVal =
        spec.corWeight *
        houseCore *
        radialDecay(r, corReach, spec.corHeight) *
        angularGaussian(corTheta, corSigma, spec.corPower);

      const spillVal =
        spec.spillWeight *
        houseSpill *
        radialDecay(r, spec.spillReach, spec.spillHeight) *
        angularGaussian(theta, spec.spillSigma, 1.80);

      const total = (hotVal + corVal + spillVal) * edgeU * edgeV;
      const idx = py * TEX_W + px;
      rawTotal[idx] = total;
      rawCore[idx] = total > 1e-6 ? Math.min(1, (hotVal * 1.15) / (hotVal + corVal + spillVal + 1e-6)) : 0;

      if (total > maxTotal) maxTotal = total;
    }
  }

  const cutoutAlpha = new Uint8Array(count);
  const colorAlpha = new Uint8Array(count);
  const coreMix = new Uint8Array(count);

  const cutoutCanvas = document.createElement('canvas');
  cutoutCanvas.width = TEX_W;
  cutoutCanvas.height = TEX_H;
  const cutCtx = cutoutCanvas.getContext('2d')!;
  const cutImg = cutCtx.createImageData(TEX_W, TEX_H);
  const cutData = cutImg.data;

  const invMax = 1 / maxTotal;
  for (let i = 0; i < count; i++) {
    const norm = Math.max(0, Math.min(1, rawTotal[i] * invMax));
    if (norm <= 0.0005) {
      cutoutAlpha[i] = 0;
      colorAlpha[i] = 0;
      coreMix[i] = 0;
      continue;
    }

    // Perceptual cutout alpha (soft lifted penumbra for realistic human night vision)
    const cutA = Math.min(1, Math.pow(norm, spec.cutoutGamma));
    // Inverse-square colored radiance alpha (richer core, gentle outer feather)
    const colA = Math.min(1, Math.pow(norm, spec.colorGamma));

    const cutByte = Math.round(cutA * 255);
    const colByte = Math.round(colA * 255);
    cutoutAlpha[i] = cutByte;
    colorAlpha[i] = colByte;
    coreMix[i] = Math.round(rawCore[i] * 255);

    const o = i * 4;
    cutData[o] = 0;
    cutData[o + 1] = 0;
    cutData[o + 2] = 0;
    cutData[o + 3] = cutByte;
  }

  cutCtx.putImageData(cutImg, 0, 0);

  const result: CachedProfileField = {
    cutoutAlpha,
    colorAlpha,
    coreMix,
    cutoutCanvas,
  };
  profileFieldCache.set(profile, result);
  return result;
}

function getTintedBeamCanvas(
  profile: OpticalBeamProfile,
  coreRgb: OpticalRgb,
  outerRgb: OpticalRgb
): HTMLCanvasElement {
  const cr = Math.round(coreRgb[0]);
  const cg = Math.round(coreRgb[1]);
  const cb = Math.round(coreRgb[2]);
  const or = Math.round(outerRgb[0]);
  const og = Math.round(outerRgb[1]);
  const ob = Math.round(outerRgb[2]);

  const key = `${profile}|${cr},${cg},${cb}|${or},${og},${ob}`;
  const cached = tintedCanvasCache.get(key);
  if (cached) return cached;

  if (tintedCanvasCache.size >= MAX_TINTED_CACHE) {
    const firstKey = tintedCanvasCache.keys().next().value;
    if (firstKey !== undefined) tintedCanvasCache.delete(firstKey);
  }

  const field = buildProfileField(profile);
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(TEX_W, TEX_H);
  const data = img.data;
  const colAlpha = field.colorAlpha;
  const coreMix = field.coreMix;
  const count = TEX_W * TEX_H;

  for (let i = 0; i < count; i++) {
    const a = colAlpha[i];
    if (a === 0) continue;
    const t = coreMix[i] / 255;
    const o = i * 4;
    data[o] = Math.round(or + (cr - or) * t);
    data[o + 1] = Math.round(og + (cg - og) * t);
    data[o + 2] = Math.round(ob + (cb - ob) * t);
    data[o + 3] = a;
  }

  ctx.putImageData(img, 0, 0);
  tintedCanvasCache.set(key, canvas);
  return canvas;
}

export function getOpticalBeamNominalAspect(profile: OpticalBeamProfile): number {
  return PROFILE_SPECS[profile].nomAspect;
}

/**
 * Stamps a smooth 2D angular-and-radial darkness cutout (for lightmapCanvas `destination-out`).
 * Multiplies existing ctx.globalAlpha so daytime shadow-fill scaling is preserved.
 */
export function drawOpticalBeamCutout(
  ctx: CanvasRenderingContext2D,
  profile: OpticalBeamProfile,
  x: number,
  y: number,
  angle: number,
  reach: number,
  halfWidth: number,
  alpha: number = 1.0
): void {
  if (alpha <= 0.002 || reach <= 1 || halfWidth <= 1) return;
  const field = buildProfileField(profile);
  const drawW = reach / (1 - ANCHOR_U);
  const drawX = -drawW * ANCHOR_U;
  const drawH = halfWidth * 2;
  const drawY = -halfWidth;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = ctx.globalAlpha * Math.max(0, Math.min(1, alpha));
  ctx.drawImage(field.cutoutCanvas, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/**
 * Stamps a smooth 2D dual-Kelvin colored optical beam (for lightColorCanvas `lighter`,
 * fog/rain volumetric Mie scatter, underwater scattering, or signal optics).
 */
export function drawOpticalBeamColor(
  ctx: CanvasRenderingContext2D,
  profile: OpticalBeamProfile,
  x: number,
  y: number,
  angle: number,
  reach: number,
  halfWidth: number,
  alpha: number,
  coreRgb: OpticalRgb,
  outerRgb?: OpticalRgb
): void {
  if (alpha <= 0.002 || reach <= 1 || halfWidth <= 1) return;
  const sprite = getTintedBeamCanvas(profile, coreRgb, outerRgb ?? coreRgb);
  const drawW = reach / (1 - ANCHOR_U);
  const drawX = -drawW * ANCHOR_U;
  const drawH = halfWidth * 2;
  const drawY = -halfWidth;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = ctx.globalAlpha * Math.max(0, Math.min(1, alpha));
  ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
  ctx.restore();
}

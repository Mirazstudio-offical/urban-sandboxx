/** Anatomical quadruped kinematics, volumetric lighting, fur/feature primitives, and cast shadows. */
import { Animal } from './types';
import { SunShadowState } from './shadowSystem';
import { performanceConfig } from './performanceConfig';

// ============================================================================
// FAST CACHED COLOR & MATH UTILITIES (Zero per-frame GC churn)
// ============================================================================

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function seededRand(seed: number, salt: number): number {
  const h = Math.imul((seed ^ (salt * 2654435761)) >>> 0, 2246822519);
  const h2 = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h2 ^ (h2 >>> 16)) >>> 0) / 4294967296;
}

const _rgbCache = new Map<string, [number, number, number]>();
const _shadeCache = new Map<string, string>();
const _mixCache = new Map<string, string>();
const _rgbaCache = new Map<string, string>();

export function parseHexRgb(hex: string): [number, number, number] {
  const hit = _rgbCache.get(hex);
  if (hit) return hit;
  let clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const num = parseInt(clean, 16);
  const rgb: [number, number, number] = Number.isNaN(num)
    ? [120, 110, 100]
    : [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  if (_rgbCache.size < 512) _rgbCache.set(hex, rgb);
  return rgb;
}

export function shadeColor(hex: string, factor: number): string {
  const fKey = Math.round(factor * 100);
  const key = `${hex}_${fKey}`;
  const hit = _shadeCache.get(key);
  if (hit) return hit;
  const [r, g, b] = parseHexRgb(hex);
  const nr = clamp(Math.round(r * factor), 0, 255);
  const ng = clamp(Math.round(g * factor), 0, 255);
  const nb = clamp(Math.round(b * factor), 0, 255);
  const out = `rgb(${nr},${ng},${nb})`;
  if (_shadeCache.size < 2048) _shadeCache.set(key, out);
  return out;
}

export function mixColor(hexA: string, hexB: string, t: number): string {
  const tKey = Math.round(clamp(t, 0, 1) * 100);
  const key = `${hexA}_${hexB}_${tKey}`;
  const hit = _mixCache.get(key);
  if (hit) return hit;
  const [r1, g1, b1] = parseHexRgb(hexA);
  const [r2, g2, b2] = parseHexRgb(hexB);
  const k = tKey / 100;
  const r = clamp(Math.round(r1 + (r2 - r1) * k), 0, 255);
  const g = clamp(Math.round(g1 + (g2 - g1) * k), 0, 255);
  const b = clamp(Math.round(b1 + (b2 - b1) * k), 0, 255);
  const out = `rgb(${r},${g},${b})`;
  if (_mixCache.size < 2048) _mixCache.set(key, out);
  return out;
}

export function rgbaColor(hex: string, alpha: number): string {
  const aKey = Math.round(clamp(alpha, 0, 1) * 100);
  const key = `${hex}_${aKey}`;
  const hit = _rgbaCache.get(key);
  if (hit) return hit;
  const [r, g, b] = parseHexRgb(hex);
  const out = `rgba(${r},${g},${b},${(aKey / 100).toFixed(2)})`;
  if (_rgbaCache.size < 2048) _rgbaCache.set(key, out);
  return out;
}

// ============================================================================
// RENDER CONTEXT & LOCAL SUN LIGHTING
// ============================================================================

export interface AnimalRenderContext {
  a: Animal;
  halfLen: number;
  halfWid: number;
  nowSec: number;
  isWinter: boolean;
  nightAlpha: number;
  detailZoom: boolean;
  baseCol: string;
  secCol: string;
  bellyCol: string;
  accentCol: string;
  deepShadow: string;
  midShadow: string;
  highlightCol: string;
  rimCol: string;
  sunLX: number;
  sunLY: number;
  stretch: number;
  breath: number;
  spineBend: number;
  tailWag: number;
  headDrop: number;
  legs: QuadrupedLegState;
}

export interface LimbFootPose {
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  footX: number;
  footY: number;
  lift: number;
  isFront: boolean;
}

export interface QuadrupedLegState {
  fl: LimbFootPose;
  fr: LimbFootPose;
  bl: LimbFootPose;
  br: LimbFootPose;
  bodyStretch: number;
  shoulderRoll: number;
  pelvisRoll: number;
  visible: boolean;
}

/**
 * Biologically accurate PARASAGITTAL mammal limb kinematics:
 * Mammalian legs swing longitudinally forward/backward directly beneath the shoulders and hips,
 * staying tucked close to the flanks (never splayed out sideways like a reptile!).
 */
export function computeQuadrupedLegs(
  a: Animal,
  halfLen: number,
  halfWid: number
): QuadrupedLegState {
  const p = a.gaitPhase;
  const g = a.gaitType;
  const zeroFoot = (isFront: boolean): LimbFootPose => ({
    hipX: 0, hipY: 0, kneeX: 0, kneeY: 0, footX: 0, footY: 0, lift: 0, isFront,
  });

  if (g === 'rest' || a.state === 'curled' || a.state === 'resting') {
    return {
      fl: zeroFoot(true),
      fr: zeroFoot(true),
      bl: zeroFoot(false),
      br: zeroFoot(false),
      bodyStretch: 0.94,
      shoulderRoll: 0,
      pelvisRoll: 0,
      visible: false,
    };
  }

  // Longitudinal shoulder & hip sockets
  const frontAnchor = halfLen * 0.44;
  const rearAnchor = -halfLen * 0.48;
  // Parasagittal lateral placement: tucked right under body edge!
  const hipLat = halfWid * 0.46;
  const footLat =
    a.species === 'bear'
      ? halfWid * 0.80
      : a.species === 'moose' || a.species === 'horse' || a.species === 'cow'
        ? halfWid * 0.72
        : halfWid * 0.68;

  const strideAmp = halfLen * 0.42;

  let sFL = 0, sFR = 0, sBL = 0, sBR = 0;
  let lFL = 0, lFR = 0, lBL = 0, lBR = 0;
  let bodyStretch = 1.0;

  const alwaysShowStanding =
    a.species === 'moose' ||
    a.species === 'horse' ||
    a.species === 'cow' ||
    a.species === 'bear' ||
    a.species === 'roe_deer';

  if (g === 'stand') {
    const makeStand = (ax: number, side: -1 | 1, fwdBias: number, isFront: boolean): LimbFootPose => ({
      hipX: ax,
      hipY: side * hipLat,
      kneeX: ax + fwdBias * 0.55,
      kneeY: side * lerp(hipLat, footLat, 0.55),
      footX: ax + fwdBias,
      footY: side * (footLat * 0.96),
      lift: 0,
      isFront,
    });
    return {
      fl: makeStand(frontAnchor, -1, halfLen * 0.14, true),
      fr: makeStand(frontAnchor, 1, halfLen * 0.04, true),
      bl: makeStand(rearAnchor, -1, -halfLen * 0.12, false),
      br: makeStand(rearAnchor, 1, -halfLen * 0.03, false),
      bodyStretch: 1.0,
      shoulderRoll: 0,
      pelvisRoll: 0,
      visible: alwaysShowStanding,
    };
  } else if (g === 'walk') {
    sBL = Math.sin(p) * strideAmp * 0.72;
    lBL = Math.max(0, Math.cos(p));
    sFL = Math.sin(p + Math.PI * 0.5) * strideAmp * 0.72;
    lFL = Math.max(0, Math.cos(p + Math.PI * 0.5));
    sBR = Math.sin(p + Math.PI) * strideAmp * 0.72;
    lBR = Math.max(0, Math.cos(p + Math.PI));
    sFR = Math.sin(p + Math.PI * 1.5) * strideAmp * 0.72;
    lFR = Math.max(0, Math.cos(p + Math.PI * 1.5));
  } else if (g === 'trot') {
    sFL = Math.sin(p) * strideAmp * 0.95;
    lFL = Math.max(0, Math.cos(p));
    sBR = Math.sin(p) * strideAmp * 0.95;
    lBR = Math.max(0, Math.cos(p));
    sFR = Math.sin(p + Math.PI) * strideAmp * 0.95;
    lFR = Math.max(0, Math.cos(p + Math.PI));
    sBL = Math.sin(p + Math.PI) * strideAmp * 0.95;
    lBL = Math.max(0, Math.cos(p + Math.PI));
    bodyStretch = 1.0 + Math.abs(Math.sin(p)) * 0.04;
  } else if (g === 'gallop' || g === 'bound') {
    const flex = Math.sin(p);
    sFL = Math.sin(p) * strideAmp * 1.25;
    lFL = Math.max(0, Math.cos(p));
    sFR = Math.sin(p + 0.34) * strideAmp * 1.25;
    lFR = Math.max(0, Math.cos(p + 0.34));
    sBL = Math.sin(p + Math.PI) * strideAmp * 1.3;
    lBL = Math.max(0, Math.cos(p + Math.PI));
    sBR = Math.sin(p + Math.PI + 0.32) * strideAmp * 1.3;
    lBR = Math.max(0, Math.cos(p + Math.PI + 0.32));
    bodyStretch = 1.0 + flex * (g === 'bound' ? 0.16 : 0.11);
  } else if (g === 'limp') {
    sFL = Math.sin(p) * strideAmp * 0.25;
    lFL = Math.max(0, Math.cos(p)) * 0.3;
    sFR = Math.sin(p + Math.PI) * strideAmp * 0.82;
    lFR = Math.max(0, Math.cos(p + Math.PI));
    sBL = Math.sin(p + 0.7) * strideAmp * 0.65;
    lBL = Math.max(0, Math.cos(p + 0.7));
    sBR = Math.sin(p + Math.PI + 0.4) * strideAmp * 0.72;
    lBR = Math.max(0, Math.cos(p + Math.PI + 0.4));
  } else {
    sFL = Math.sin(p) * strideAmp * 0.85;
    lFL = 0.6;
    sFR = Math.sin(p + Math.PI) * strideAmp * 0.85;
    lFR = 0.6;
    sBL = Math.sin(p + Math.PI * 0.7) * strideAmp * 0.85;
    lBL = 0.6;
    sBR = Math.sin(p + Math.PI * 1.7) * strideAmp * 0.85;
    lBR = 0.6;
  }

  const buildLimb = (
    anchorX: number,
    side: -1 | 1,
    stride: number,
    lift: number,
    isFront: boolean
  ): LimbFootPose => {
    // Forelimbs reach forward (+X), hindlimbs push backward (-X) from beneath the torso!
    const restBias = isFront ? halfLen * 0.16 : -halfLen * 0.18;
    const fx = anchorX + restBias + stride;
    // Slight outward stance only when extended forward/back so feet clear the ribcage naturally
    const reachMag = isFront ? Math.max(0, stride) : Math.max(0, -stride);
    const fy = side * (footLat + reachMag * 0.08 + lift * halfWid * 0.06);
    const hx = anchorX + stride * 0.14;
    const hy = side * hipLat;
    const kx = lerp(hx, fx, 0.52);
    const ky = lerp(hy, fy, 0.56);
    return { hipX: hx, hipY: hy, kneeX: kx, kneeY: ky, footX: fx, footY: fy, lift, isFront };
  };

  return {
    fl: buildLimb(frontAnchor, -1, sFL, lFL, true),
    fr: buildLimb(frontAnchor, 1, sFR, lFR, true),
    bl: buildLimb(rearAnchor, -1, sBL, lBL, false),
    br: buildLimb(rearAnchor, 1, sBR, lBR, false),
    bodyStretch,
    shoulderRoll: ((sFL - sFR) / Math.max(1, strideAmp)) * 0.05,
    pelvisRoll: ((sBL - sBR) / Math.max(1, strideAmp)) * 0.05,
    visible: true,
  };
}

// ============================================================================
// VOLUMETRIC SHADING & GRADIENT HELPERS
// ============================================================================

export function makeVolumetricGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sunLX: number,
  sunLY: number,
  highlightCol: string,
  baseCol: string,
  shadowCol: string
): CanvasGradient {
  const r = Math.max(0.5, radius);
  const g = ctx.createLinearGradient(
    cx + sunLX * r * 0.92,
    cy + sunLY * r * 0.92,
    cx - sunLX * r * 0.96,
    cy - sunLY * r * 0.96
  );
  g.addColorStop(0, highlightCol);
  g.addColorStop(0.45, baseCol);
  g.addColorStop(1, shadowCol);
  return g;
}

export function makeDomeGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sunLX: number,
  sunLY: number,
  highlightCol: string,
  baseCol: string,
  shadowCol: string
): CanvasGradient {
  const r = Math.max(0.5, radius);
  const hx = cx + sunLX * r * 0.34;
  const hy = cy + sunLY * r * 0.34;
  const g = ctx.createRadialGradient(hx, hy, r * 0.06, cx, cy, r);
  g.addColorStop(0, highlightCol);
  g.addColorStop(0.56, baseCol);
  g.addColorStop(1, shadowCol);
  return g;
}

// ============================================================================
// SCULPTED ORGANIC BODY CONTOUR BUILDER
// ============================================================================

export interface TorsoProfilePoint {
  x: number;
  w: number;
}

export function traceOrganicTorsoPath(
  ctx: CanvasRenderingContext2D,
  profile: TorsoProfilePoint[],
  spineBend: number,
  halfLen: number
): void {
  const n = profile.length;
  if (n < 3) return;

  const bendY = (x: number) => {
    const t = x / Math.max(1, halfLen);
    return spineBend * (t * t) * halfLen * 0.2;
  };

  const p0 = profile[0];
  ctx.beginPath();
  ctx.moveTo(p0.x, bendY(p0.x));

  for (let i = 0; i < n - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    const mx = (a.x + b.x) * 0.5;
    const my = bendY(mx) - (a.w + b.w) * 0.5;
    if (i === 0) {
      ctx.quadraticCurveTo(a.x, bendY(a.x) - b.w * 0.58, mx, my);
    } else {
      ctx.quadraticCurveTo(a.x, bendY(a.x) - a.w, mx, my);
    }
  }
  const last = profile[n - 1];
  const prev = profile[n - 2];
  ctx.quadraticCurveTo(prev.x, bendY(prev.x) - prev.w, last.x, bendY(last.x));

  ctx.quadraticCurveTo(
    prev.x,
    bendY(prev.x) + prev.w,
    (prev.x + last.x) * 0.5,
    bendY((prev.x + last.x) * 0.5) + (prev.w + last.w) * 0.5
  );
  for (let i = n - 2; i >= 1; i--) {
    const curr = profile[i];
    const next = profile[i - 1];
    const mx = (curr.x + next.x) * 0.5;
    const my = bendY(mx) + (curr.w + next.w) * 0.5;
    ctx.quadraticCurveTo(curr.x, bendY(curr.x) + curr.w, mx, my);
  }
  ctx.quadraticCurveTo(p0.x, bendY(p0.x) + profile[1].w * 0.58, p0.x, bendY(p0.x));
  ctx.closePath();
}

// ============================================================================
// ARTICULATED TAPERED SEGMENT & PARASAGITTAL LIMBS
// ============================================================================

export function drawTaperedLimbSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  fill: string | CanvasGradient
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.06) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x1, y1, Math.max(r1, r2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const nx = -dy / len;
  const ny = dx / len;
  const ang = Math.atan2(dy, dx);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
  ctx.arc(x2, y2, r2, ang + Math.PI * 0.5, ang - Math.PI * 0.5, true);
  ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
  ctx.arc(x1, y1, r1, ang - Math.PI * 0.5, ang + Math.PI * 0.5, true);
  ctx.closePath();
  ctx.fill();
}

export type FootTerminalStyle =
  | 'cloven_hoof'
  | 'solid_hoof'
  | 'canid_paw'
  | 'feline_paw'
  | 'bear_claw_paw'
  | 'rodent_paw';

export interface LimbDrawOptions {
  upperColor: string;
  lowerColor: string;
  footColor: string;
  clawColor?: string;
  upperRadius: number;
  kneeRadius: number;
  footRadius: number;
  terminalStyle: FootTerminalStyle;
  detailZoom: boolean;
}

export function drawArticulatedLimbs(
  ctx: CanvasRenderingContext2D,
  legs: QuadrupedLegState,
  opts: LimbDrawOptions
): void {
  if (!legs.visible) return;
  const list: LimbFootPose[] = [legs.bl, legs.br, legs.fl, legs.fr];
  const upperShadow = shadeColor(opts.upperColor, 0.72);
  const lowerShadow = shadeColor(opts.lowerColor, 0.76);

  for (let i = 0; i < 4; i++) {
    const f = list[i];
    // Ground contact shadow beneath planted foot
    const aoAlpha = clamp(0.28 - f.lift * 0.2, 0.04, 0.3);
    ctx.fillStyle = `rgba(6, 12, 10, ${aoAlpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(f.footX + 0.15, f.footY, opts.footRadius * 1.45, opts.footRadius * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    const s = 1 + f.lift * 0.06;

    // Upper limb emerging from under body flank
    drawTaperedLimbSegment(
      ctx,
      f.hipX,
      f.hipY,
      opts.upperRadius * s,
      f.kneeX,
      f.kneeY,
      opts.kneeRadius * s,
      upperShadow
    );
    drawTaperedLimbSegment(
      ctx,
      f.hipX,
      f.hipY,
      opts.upperRadius * 0.76 * s,
      f.kneeX,
      f.kneeY,
      opts.kneeRadius * 0.76 * s,
      opts.upperColor
    );

    // Lower cannon/forearm segment
    drawTaperedLimbSegment(
      ctx,
      f.kneeX,
      f.kneeY,
      opts.kneeRadius * 0.9 * s,
      f.footX,
      f.footY,
      opts.footRadius * 0.82 * s,
      lowerShadow
    );
    drawTaperedLimbSegment(
      ctx,
      f.kneeX,
      f.kneeY,
      opts.kneeRadius * 0.68 * s,
      f.footX,
      f.footY,
      opts.footRadius * 0.64 * s,
      opts.lowerColor
    );

    // Foot terminal always faces generally FORWARD (+X) like real parasagittal hooves/paws!
    const fr = opts.footRadius * s;
    const footYaw = clamp((f.footY - f.kneeY) * 0.06, -0.22, 0.22);

    ctx.save();
    ctx.translate(f.footX, f.footY);
    ctx.rotate(footYaw);

    if (opts.terminalStyle === 'cloven_hoof') {
      ctx.fillStyle = opts.footColor;
      ctx.beginPath();
      ctx.ellipse(fr * 0.35, -fr * 0.34, fr * 0.88, fr * 0.38, 0.08, 0, Math.PI * 2);
      ctx.ellipse(fr * 0.35, fr * 0.34, fr * 0.88, fr * 0.38, -0.08, 0, Math.PI * 2);
      ctx.fill();
      if (opts.detailZoom) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.arc(fr * 0.55, -fr * 0.3, fr * 0.2, 0, Math.PI * 2);
        ctx.arc(fr * 0.55, fr * 0.3, fr * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (opts.terminalStyle === 'solid_hoof') {
      ctx.fillStyle = opts.footColor;
      ctx.beginPath();
      ctx.ellipse(fr * 0.3, 0, fr * 0.98, fr * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      if (opts.detailZoom) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = Math.max(0.28, fr * 0.18);
        ctx.beginPath();
        ctx.arc(fr * 0.32, 0, fr * 0.62, -0.75, 0.75);
        ctx.stroke();
      }
    } else if (opts.terminalStyle === 'bear_claw_paw') {
      ctx.fillStyle = opts.footColor;
      ctx.beginPath();
      ctx.ellipse(fr * 0.3, 0, fr * 1.15, fr * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      if (opts.detailZoom) {
        ctx.strokeStyle = opts.clawColor || '#a89985';
        ctx.lineWidth = Math.max(0.32, fr * 0.18);
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let c = -1.5; c <= 1.5; c += 1) {
          const cy = c * fr * 0.36;
          ctx.moveTo(fr * 0.92, cy);
          ctx.lineTo(fr * 1.62, cy * 1.05);
        }
        ctx.stroke();
      }
    } else if (opts.terminalStyle === 'canid_paw' || opts.terminalStyle === 'feline_paw') {
      ctx.fillStyle = opts.footColor;
      ctx.beginPath();
      ctx.ellipse(fr * 0.35, 0, fr * 1.08, fr * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      if (opts.detailZoom) {
        ctx.fillStyle = shadeColor(opts.footColor, 0.68);
        ctx.beginPath();
        ctx.arc(fr * 0.82, -fr * 0.3, fr * 0.22, 0, Math.PI * 2);
        ctx.arc(fr * 0.98, 0, fr * 0.22, 0, Math.PI * 2);
        ctx.arc(fr * 0.82, fr * 0.3, fr * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = opts.footColor;
      ctx.beginPath();
      ctx.ellipse(fr * 0.35, 0, fr * 1.05, fr * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ============================================================================
// FINE DIRECTIONAL FUR & ANATOMICAL MUSCLE TEXTURE HELPERS
// ============================================================================

export function drawFurTextureStrokes(
  ctx: CanvasRenderingContext2D,
  seed: number,
  halfLen: number,
  halfWid: number,
  lightCol: string,
  darkCol: string,
  count: number,
  strokeLen: number,
  strokeWidth: number,
  spineBend: number = 0
): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = strokeWidth;

  // Soft under-fur grain
  ctx.strokeStyle = darkCol;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const rx = (seededRand(seed, i * 3 + 11) - 0.5) * 1.68;
    const ry = (seededRand(seed, i * 3 + 12) - 0.5) * 1.64;
    const x = rx * halfLen;
    const bend = spineBend * (rx * rx) * halfLen * 0.2;
    const y = ry * halfWid + bend;
    // Hair flows naturally backward & slightly outward down flanks
    const ang = Math.PI + ry * 0.26 + (seededRand(seed, i * 3 + 13) - 0.5) * 0.22;
    const len = strokeLen * (0.65 + seededRand(seed, i * 5 + 7) * 0.6);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  }
  ctx.stroke();

  // Delicate sun-lit guard hairs along dorsal mantle
  ctx.strokeStyle = lightCol;
  ctx.lineWidth = strokeWidth * 0.85;
  ctx.beginPath();
  const hiCount = Math.max(5, Math.floor(count * 0.68));
  for (let i = 0; i < hiCount; i++) {
    const rx = (seededRand(seed, i * 4 + 91) - 0.5) * 1.52;
    const ry = (seededRand(seed, i * 4 + 92) - 0.5) * 1.08;
    const x = rx * halfLen;
    const bend = spineBend * (rx * rx) * halfLen * 0.2;
    const y = ry * halfWid + bend;
    const ang = Math.PI + ry * 0.2 + (seededRand(seed, i * 4 + 93) - 0.5) * 0.18;
    const len = strokeLen * (0.6 + seededRand(seed, i * 4 + 94) * 0.55);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  }
  ctx.stroke();
}

export function drawDorsalSpineHighlight(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  width: number,
  color: string,
  spineBend: number,
  halfLen: number
): void {
  const bendAt = (x: number) => {
    const t = x / Math.max(1, halfLen);
    return spineBend * (t * t) * halfLen * 0.2;
  };
  const mx = (x0 + x1) * 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, bendAt(x0));
  ctx.quadraticCurveTo(mx, bendAt(mx), x1, bendAt(x1));
  ctx.stroke();
}

// ============================================================================
// REALISTIC TOP-DOWN HEAD ANATOMY: BROW-TUCKED EYES, EARS, NOSES, ANTLERS
// ============================================================================

/**
 * Draws realistic top-down mammalian eyes: sleek lateral dark almond shapes tucked under
 * the supraorbital brow ridge (never oversized cartoon round eyes!), with a subtle wet corneal glint
 * and vivid nocturnal tapetum lucidum eye-shine when illuminated by headlights.
 */
export function drawAnatomicalEyes(
  ctx: CanvasRenderingContext2D,
  eyeX: number,
  eyeYOffset: number,
  eyeSize: number,
  irisColor: string,
  eyeShineIntensity: number,
  eyeShineColor: string,
  detailZoom: boolean
): void {
  const rx = eyeSize * 0.92;
  const ry = eyeSize * 0.52;

  for (const s of [-1, 1]) {
    const ey = s * eyeYOffset;
    // Subtle dark orbital socket / brow crease
    ctx.fillStyle = 'rgba(12, 10, 9, 0.55)';
    ctx.beginPath();
    ctx.ellipse(eyeX, ey, rx * 1.25, ry * 1.32, s * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Glossy dark almond eye peeking from beneath brow
    ctx.fillStyle = '#0d0b0a';
    ctx.beginPath();
    ctx.ellipse(eyeX + rx * 0.08, ey + s * ry * 0.14, rx, ry, s * 0.26, 0, Math.PI * 2);
    ctx.fill();

    if (detailZoom && eyeSize >= 0.34) {
      // Subtle muted iris tint at outer rim
      ctx.fillStyle = rgbaColor(irisColor, 0.58);
      ctx.beginPath();
      ctx.ellipse(eyeX + rx * 0.14, ey + s * ry * 0.18, rx * 0.58, ry * 0.58, s * 0.26, 0, Math.PI * 2);
      ctx.fill();

      // Tiny crisp wet corneal reflection pinpoint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(eyeX + rx * 0.32, ey + s * ry * 0.05, Math.max(0.11, eyeSize * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Nocturnal Tapetum Lucidum Eye-Shine in car headlights
  if (eyeShineIntensity > 0.08) {
    ctx.save();
    const alpha = clamp(eyeShineIntensity, 0, 0.96);
    for (const s of [-1, 1]) {
      const ey = s * eyeYOffset;
      ctx.fillStyle = rgbaColor(eyeShineColor, alpha * 0.42);
      ctx.beginPath();
      ctx.arc(eyeX + rx * 0.15, ey, Math.max(1.3, eyeSize * 2.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = eyeShineColor;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(eyeX + rx * 0.15, ey, Math.max(0.7, eyeSize * 1.05), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawWetNose(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  detailZoom: boolean
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  if (detailZoom && rx >= 0.42) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.1, y - ry * 0.42, rx * 0.28, ry * 0.17, 0.25, 0, Math.PI * 2);
    ctx.ellipse(x + rx * 0.1, y + ry * 0.42, rx * 0.28, ry * 0.17, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.15, y - ry * 0.12, rx * 0.3, ry * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws anatomically angled top-down mammalian ears.
 * `sweepAngle`: 0 = pointing straight forward (+X), PI/2 = sideways, ~2.0..2.75 = swept naturally back-and-out!
 */
export function drawSculptedEars(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseYOffset: number,
  length: number,
  width: number,
  sweepAngle: number,
  outerColor: string,
  innerColor: string,
  tipColor: string | null,
  detailZoom: boolean
): void {
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(baseX, s * baseYOffset);
    ctx.rotate(s * sweepAngle);

    // Subtle grounding shadow beneath ear pinna
    ctx.fillStyle = 'rgba(10, 8, 6, 0.24)';
    ctx.beginPath();
    ctx.moveTo(-0.15, -s * width * 0.38);
    ctx.quadraticCurveTo(length * 0.45, -s * width * 0.8, length * 1.02, 0.15 * s);
    ctx.quadraticCurveTo(length * 0.45, s * width * 0.72, -0.15, s * width * 0.38);
    ctx.closePath();
    ctx.fill();

    // Outer furred pinna
    ctx.fillStyle = outerColor;
    ctx.beginPath();
    ctx.moveTo(0, -s * width * 0.4);
    ctx.quadraticCurveTo(length * 0.46, -s * width * 0.78, length, 0);
    ctx.quadraticCurveTo(length * 0.46, s * width * 0.68, 0, s * width * 0.4);
    ctx.closePath();
    ctx.fill();

    // Soft shaded inner concave ear groove
    if (detailZoom) {
      ctx.fillStyle = rgbaColor(innerColor, 0.72);
      ctx.beginPath();
      ctx.moveTo(length * 0.16, -s * width * 0.18);
      ctx.quadraticCurveTo(length * 0.48, -s * width * 0.38, length * 0.76, 0);
      ctx.quadraticCurveTo(length * 0.48, s * width * 0.3, length * 0.16, s * width * 0.18);
      ctx.closePath();
      ctx.fill();
    }

    if (tipColor) {
      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.moveTo(length * 0.7, -s * width * 0.32);
      ctx.quadraticCurveTo(length * 0.88, -s * width * 0.2, length, 0);
      ctx.quadraticCurveTo(length * 0.88, s * width * 0.2, length * 0.7, s * width * 0.32);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export function drawWhiskers(
  ctx: CanvasRenderingContext2D,
  x: number,
  yOffset: number,
  length: number,
  color: string = 'rgba(241, 245, 249, 0.42)'
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of [-1, 1]) {
    const by = s * yOffset;
    ctx.moveTo(x, by);
    ctx.lineTo(x + length * 0.18, by + s * length * 0.88);
    ctx.moveTo(x - length * 0.1, by);
    ctx.lineTo(x - length * 0.22, by + s * length * 0.98);
    ctx.moveTo(x - length * 0.22, by);
    ctx.lineTo(x - length * 0.56, by + s * length * 0.82);
  }
  ctx.stroke();
}

export function drawMooseAntlers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  span: number,
  detailZoom: boolean
): void {
  ctx.save();
  ctx.translate(x, y);

  for (const s of [-1, 1]) {
    // Subtle drop shadow onto head/neck
    ctx.fillStyle = 'rgba(10, 8, 6, 0.22)';
    ctx.beginPath();
    ctx.moveTo(-0.35, s * 1.25);
    ctx.quadraticCurveTo(span * 0.1, s * span * 0.56, -span * 0.26, s * span * 0.96);
    ctx.lineTo(span * 0.34, s * span * 1.08);
    ctx.lineTo(span * 0.46, s * span * 0.78);
    ctx.lineTo(span * 0.42, s * span * 0.38);
    ctx.closePath();
    ctx.fill();

    const grad = ctx.createLinearGradient(0, s * 1.0, span * 0.35, s * span * 1.1);
    grad.addColorStop(0, '#6e5842');
    grad.addColorStop(0.28, '#baa284');
    grad.addColorStop(0.76, '#dad0bd');
    grad.addColorStop(1, '#f2ece0');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#66523d';
    ctx.lineWidth = 0.4;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(0, s * 0.88);
    ctx.quadraticCurveTo(span * 0.04, s * span * 0.34, -span * 0.14, s * span * 0.62);
    ctx.quadraticCurveTo(-span * 0.34, s * span * 0.85, -span * 0.18, s * span * 1.04);
    ctx.lineTo(0.02 * span, s * span * 0.86);
    ctx.lineTo(span * 0.16, s * span * 1.12);
    ctx.lineTo(span * 0.14, s * span * 0.84);
    ctx.lineTo(span * 0.38, s * span * 0.98);
    ctx.lineTo(span * 0.24, s * span * 0.72);
    ctx.lineTo(span * 0.48, s * span * 0.74);
    ctx.lineTo(span * 0.26, s * span * 0.54);
    ctx.lineTo(span * 0.44, s * span * 0.42);
    ctx.lineTo(span * 0.22, s * span * 0.36);
    ctx.lineTo(span * 0.34, s * span * 0.22);
    ctx.quadraticCurveTo(span * 0.12, s * span * 0.2, 0.3, s * 1.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (detailZoom) {
      ctx.strokeStyle = 'rgba(84, 64, 46, 0.42)';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.moveTo(0.1, s * span * 0.25);
      ctx.quadraticCurveTo(span * 0.05, s * span * 0.55, span * 0.18, s * span * 0.86);
      ctx.moveTo(0.15, s * span * 0.32);
      ctx.quadraticCurveTo(span * 0.14, s * span * 0.48, span * 0.32, s * span * 0.66);
      ctx.stroke();

      ctx.fillStyle = '#574534';
      ctx.beginPath();
      ctx.ellipse(0.1, s * 1.2, 0.8, 0.5, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawRoeAntlers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  span: number,
  detailZoom: boolean
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';

  for (const s of [-1, 1]) {
    // Dark rough pearled main beam sweeping gracefully back-and-out
    ctx.strokeStyle = '#735e48';
    ctx.lineWidth = 0.82;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.52);
    ctx.quadraticCurveTo(-span * 0.3, s * span * 0.34, -span * 0.72, s * span * 0.68);
    ctx.stroke();

    // Forward brow tine + rear top point with polished bone tips
    ctx.strokeStyle = '#d4c6b0';
    ctx.lineWidth = 0.58;
    ctx.beginPath();
    ctx.moveTo(-span * 0.22, s * span * 0.28);
    ctx.quadraticCurveTo(span * 0.06, s * span * 0.46, span * 0.24, s * span * 0.54);
    ctx.moveTo(-span * 0.45, s * span * 0.48);
    ctx.lineTo(-span * 0.74, s * span * 0.42);
    ctx.stroke();

    if (detailZoom) {
      ctx.fillStyle = '#5c4a38';
      ctx.beginPath();
      ctx.arc(0, s * 0.58, 0.46, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ============================================================================
// ANATOMICAL GROUND SHADOWS (Contact AO + Directional Cast Shadow)
// ============================================================================

export function drawAnatomicalGroundShadow(
  ctx: CanvasRenderingContext2D,
  a: Animal,
  sun: SunShadowState,
  nightAlpha: number,
  isWinter: boolean
): void {
  if (!performanceConfig.enableShadows || nightAlpha > 0.84) return;
  const alt = Math.max(0, a.z || 0);
  const halfLen = a.bodyLength * 0.5;
  const halfWid = a.bodyWidth * 0.5;
  const isDowned = a.state === 'dead' || a.state === 'knocked_down';
  const isResting = a.state === 'resting' || a.state === 'curled';

  let heightPx = halfWid * 1.05;
  if (a.species === 'moose' || a.species === 'horse') heightPx = halfLen * 0.42;
  else if (a.species === 'cow' || a.species === 'bear') heightPx = halfLen * 0.34;
  else if (a.species === 'roe_deer' || a.species === 'wolf') heightPx = halfLen * 0.32;
  else if (a.species === 'hedgehog' || a.species === 'squirrel') heightPx = halfWid * 0.65;
  if (isDowned || isResting) heightPx *= 0.24;

  const baseAlpha = clamp((0.36 - alt * 0.012) * (1.0 - nightAlpha * 0.82), 0.06, 0.38);

  // 1. Soft ground-contact AO directly underneath the body
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  const aoAlpha = clamp(baseAlpha * (isDowned ? 0.95 : 0.76) * (1 - alt * 0.04), 0.04, 0.34);
  const aoGrad = ctx.createRadialGradient(0, 0, halfWid * 0.18, 0, 0, Math.max(halfLen, halfWid) * 1.06);
  aoGrad.addColorStop(0, `rgba(6, 12, 10, ${aoAlpha.toFixed(3)})`);
  aoGrad.addColorStop(0.68, `rgba(6, 12, 10, ${(aoAlpha * 0.46).toFixed(3)})`);
  aoGrad.addColorStop(1, 'rgba(6, 12, 10, 0)');
  ctx.fillStyle = aoGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, halfLen * 1.02, halfWid * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Directional sun-projected cast shadow silhouette
  const castDist = heightPx * sun.lengthFactor * 0.4 + alt * 0.52;
  const shiftX = sun.shadowDirX * castDist;
  const shiftY = sun.shadowDirY * castDist;
  const shrink = clamp(1.0 - alt * 0.012, 0.68, 1.04);

  ctx.save();
  ctx.translate(a.x + shiftX, a.y + shiftY);
  ctx.rotate(a.angle);
  ctx.fillStyle = `rgba(8, 16, 14, ${(baseAlpha * 0.68).toFixed(3)})`;

  ctx.beginPath();
  if (a.state === 'curled') {
    ctx.arc(0, 0, halfWid * 1.06 * shrink, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, 0, halfLen * 0.9 * shrink, halfWid * 0.92 * shrink, 0, 0, Math.PI * 2);
  }
  ctx.fill();

  if (!isDowned && !isResting && a.species !== 'hedgehog') {
    ctx.beginPath();
    const headExtend =
      a.species === 'moose' || a.species === 'horse' || a.species === 'roe_deer'
        ? halfLen * 1.1
        : halfLen * 0.9;
    ctx.ellipse(
      headExtend * shrink,
      Math.sin(a.headYaw) * halfWid * 0.32,
      halfLen * 0.26 * shrink,
      halfWid * 0.42 * shrink,
      a.headYaw * 0.6,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (a.hasAntlers && a.species === 'moose' && !isWinter) {
      ctx.beginPath();
      ctx.ellipse(headExtend * 0.94 * shrink, -halfWid * 1.12, halfWid * 0.5, halfWid * 0.9, 0.25, 0, Math.PI * 2);
      ctx.ellipse(headExtend * 0.94 * shrink, halfWid * 1.12, halfWid * 0.5, halfWid * 0.9, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ============================================================================
// SPECIES-AWARE DOWNED / DEAD LATERAL ANATOMY
// ============================================================================

export function drawSpeciesDownedPosture(ctx: CanvasRenderingContext2D, r: AnimalRenderContext): void {
  const { a, halfLen, halfWid, baseCol, secCol, bellyCol, accentCol, deepShadow, highlightCol, detailZoom, isWinter } = r;
  const side = a.deathSide || 1;
  const flat = 1.0 + (a.crushedLevel || 0) * 0.26;

  if (a.state === 'dead' || a.injuryLevel > 0.52) {
    const poolGrad = ctx.createRadialGradient(
      -halfLen * 0.04,
      side * halfWid * 0.15,
      halfWid * 0.1,
      -halfLen * 0.04,
      side * halfWid * 0.15,
      halfLen * 0.78
    );
    poolGrad.addColorStop(0, 'rgba(78, 8, 12, 0.72)');
    poolGrad.addColorStop(0.55, 'rgba(112, 16, 20, 0.48)');
    poolGrad.addColorStop(1, 'rgba(112, 16, 20, 0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.04, side * halfWid * 0.18, halfLen * 0.78, halfWid * 0.94, 0.22 * side, 0, Math.PI * 2);
    ctx.fill();
  }

  const legCol = a.species === 'moose' ? '#b8a898' : a.species === 'fox' ? '#1c1917' : secCol;
  const legR = Math.max(0.8, halfWid * 0.17);
  const legPairs = [
    { hx: halfLen * 0.36, kx: halfLen * 0.48, ky: side * halfWid * 0.95, fx: halfLen * 0.62, fy: side * halfWid * 1.46 },
    { hx: halfLen * 0.24, kx: halfLen * 0.3, ky: side * halfWid * 0.85, fx: halfLen * 0.36, fy: side * halfWid * 1.32 },
    { hx: -halfLen * 0.36, kx: -halfLen * 0.52, ky: side * halfWid * 0.96, fx: -halfLen * 0.62, fy: side * halfWid * 1.44 },
    { hx: -halfLen * 0.46, kx: -halfLen * 0.62, ky: side * halfWid * 0.82, fx: -halfLen * 0.78, fy: side * halfWid * 1.22 },
  ];
  for (let i = 0; i < legPairs.length; i++) {
    const lp = legPairs[i];
    drawTaperedLimbSegment(ctx, lp.hx, side * halfWid * 0.28, legR * 1.15, lp.kx, lp.ky, legR * 0.85, shadeColor(legCol, 0.8));
    drawTaperedLimbSegment(ctx, lp.kx, lp.ky, legR * 0.82, lp.fx, lp.fy, legR * 0.62, legCol);
    ctx.fillStyle = '#14110f';
    ctx.beginPath();
    ctx.arc(lp.fx, lp.fy, legR * 0.68, 0, Math.PI * 2);
    ctx.fill();
  }

  if (a.species === 'fox' || a.species === 'wolf' || a.species === 'cat' || a.species === 'horse' || a.species === 'dog' || a.species === 'squirrel') {
    const tLen = a.species === 'fox' || a.species === 'cat' || a.species === 'squirrel' ? halfLen * 0.75 : halfLen * 0.52;
    const tRad = a.species === 'fox' || a.species === 'squirrel' ? halfWid * 0.44 : halfWid * 0.22;
    drawTaperedLimbSegment(ctx, -halfLen * 0.72, 0, tRad * 0.7, -halfLen * 0.72 - tLen, -side * halfWid * 0.38, tRad * 0.48, a.species === 'horse' ? accentCol : baseCol);
    if (a.species === 'fox') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(-halfLen * 0.72 - tLen * 0.9, -side * halfWid * 0.34, tRad * 0.72, tRad * 0.45, 0.3 * side, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const torsoGrad = makeVolumetricGradient(ctx, 0, 0, halfWid * 1.15, r.sunLX, r.sunLY, highlightCol, baseCol, deepShadow);
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, halfLen * 0.84 * flat, halfWid * 0.94 * flat, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, halfLen * 0.84 * flat, halfWid * 0.94 * flat, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = rgbaColor(bellyCol, 0.6);
  ctx.beginPath();
  ctx.ellipse(0, side * halfWid * 0.55, halfLen * 0.64 * flat, halfWid * 0.52 * flat, 0, 0, Math.PI * 2);
  ctx.fill();

  if (a.coat.pattern === 'piebald' || a.coat.pattern === 'spotted' || a.coat.pattern === 'calico') {
    ctx.fillStyle = secCol;
    for (let p = 0; p < 3; p++) {
      const px = (seededRand(a.seed, p * 4 + 1) - 0.5) * halfLen * 1.1;
      const py = (seededRand(a.seed, p * 4 + 2) - 0.5) * halfWid * 1.1;
      ctx.beginPath();
      ctx.ellipse(px, py, halfLen * 0.25, halfWid * 0.38, seededRand(a.seed, p + 9) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = rgbaColor(secCol, 0.48);
    ctx.beginPath();
    ctx.ellipse(-halfLen * 0.05, -side * halfWid * 0.32, halfLen * 0.62 * flat, halfWid * 0.45 * flat, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (detailZoom) {
    drawFurTextureStrokes(
      ctx,
      a.seed,
      halfLen * 0.8,
      halfWid * 0.85,
      rgbaColor(highlightCol, 0.24),
      rgbaColor(deepShadow, 0.28),
      16,
      Math.max(1.0, halfLen * 0.12),
      Math.max(0.28, halfWid * 0.055)
    );
  }
  ctx.restore();

  ctx.save();
  ctx.translate(halfLen * 0.66 * flat, side * halfWid * 0.12);
  ctx.rotate(side * 0.36);

  const headRx = Math.max(2.0, halfLen * 0.25);
  const headRy = Math.max(1.5, halfWid * 0.42);
  ctx.fillStyle = makeDomeGradient(ctx, headRx * 0.6, 0, headRx * 1.1, r.sunLX, r.sunLY, highlightCol, baseCol, deepShadow);
  ctx.beginPath();
  ctx.ellipse(headRx * 0.65, 0, headRx, headRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = secCol;
  ctx.beginPath();
  ctx.ellipse(headRx * 0.1, -side * headRy * 0.85, headRx * 0.45, headRy * 0.35, -side * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0c0a09';
  ctx.lineWidth = Math.max(0.32, headRy * 0.12);
  ctx.beginPath();
  ctx.moveTo(headRx * 0.65, -side * headRy * 0.32);
  ctx.lineTo(headRx * 1.05, -side * headRy * 0.24);
  ctx.stroke();

  drawWetNose(ctx, headRx * 1.55, 0, Math.max(0.5, headRx * 0.2), Math.max(0.45, headRy * 0.34), accentCol, detailZoom);

  if (a.hasAntlers && a.species === 'moose' && !isWinter) {
    drawMooseAntlers(ctx, headRx * 0.15, 0, halfWid * 1.45, detailZoom);
  } else if (a.hasAntlers && a.species === 'roe_deer' && !isWinter) {
    drawRoeAntlers(ctx, headRx * 0.15, 0, halfWid * 0.95, detailZoom);
  } else if (a.hasHorns && a.species === 'cow') {
    ctx.strokeStyle = '#e7dec8';
    ctx.lineWidth = 1.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headRx * 0.1, -headRy * 0.75);
    ctx.quadraticCurveTo(headRx * 0.4, -headRy * 1.55, headRx * 1.05, -headRy * 1.45);
    ctx.moveTo(headRx * 0.1, headRy * 0.75);
    ctx.quadraticCurveTo(headRx * 0.4, headRy * 1.55, headRx * 1.05, headRy * 1.45);
    ctx.stroke();
  }
  ctx.restore();
}

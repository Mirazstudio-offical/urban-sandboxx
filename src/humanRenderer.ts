import { GameWorld, Pedestrian, Player } from './types';
import { computeHumanPose, HumanPose3D } from './humanAnimationSystem';
import { getOutsideTemperature } from './physics';

// ============================================================================
// FAST CACHED COLOR SHADING UTILITIES (Zero per-frame allocation churn)
// ============================================================================
const _shadeCache = new Map<string, string>();

function parseHexRgb(hex: string): [number, number, number] {
  let clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [120, 128, 140];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Multiplies RGB channels by `factor` (<1 darkens, >1 lightens) with cached hex output.
 */
export function shadeHex(hex: string, factor: number): string {
  const fKey = Math.round(factor * 100);
  const key = `${hex}_${fKey}`;
  const hit = _shadeCache.get(key);
  if (hit) return hit;

  const [r, g, b] = parseHexRgb(hex);
  const nr = Math.max(0, Math.min(255, Math.round(r * factor)));
  const ng = Math.max(0, Math.min(255, Math.round(g * factor)));
  const nb = Math.max(0, Math.min(255, Math.round(b * factor)));
  const out = `rgb(${nr},${ng},${nb})`;
  if (_shadeCache.size < 1600) _shadeCache.set(key, out);
  return out;
}

function safeEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
  sa: number,
  ea: number
): void {
  const srx = Math.max(0.05, Math.abs(rx));
  const sry = Math.max(0.05, Math.abs(ry));
  ctx.ellipse(x, y, srx, sry, rot, sa, ea);
}

function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, rad);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// ============================================================================
// PROCEDURAL MICRO-TEXTURE OVERLAYS (Generated once on offscreen canvas)
// ============================================================================
let _weavePattern: CanvasPattern | null = null;
let _weavePatternInit = false;

function getFabricMicroWeave(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (_weavePatternInit) return _weavePattern;
  _weavePatternInit = true;
  if (typeof document === 'undefined') return null;
  try {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const g = c.getContext('2d');
    if (!g) return null;
    // Subtle cross-hatch cotton/wool twill micro-grain
    g.fillStyle = 'rgba(255,255,255,0.045)';
    g.fillRect(0, 0, 2, 1);
    g.fillRect(4, 2, 2, 1);
    g.fillRect(2, 4, 2, 1);
    g.fillRect(6, 6, 2, 1);
    g.fillStyle = 'rgba(0,0,0,0.055)';
    g.fillRect(2, 1, 2, 1);
    g.fillRect(6, 3, 2, 1);
    g.fillRect(0, 5, 2, 1);
    g.fillRect(4, 7, 2, 1);
    _weavePattern = ctx.createPattern(c, 'repeat');
  } catch {
    _weavePattern = null;
  }
  return _weavePattern;
}

// ============================================================================
// SHARED ANATOMICAL DRAWING PRIMITIVES
// ============================================================================

function drawFootwear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  liftZ: number,
  footwearType: NonNullable<Pedestrian['footwearType']>,
  footwearColor: string,
  skinColor: string,
  isFirefighter: boolean,
  highDetail: boolean
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Ground contact ambient occlusion under shoe (fades & softens as foot lifts!)
  const aoAlpha = Math.max(0.06, 0.28 - liftZ * 0.055);
  ctx.fillStyle = `rgba(0,0,0,${aoAlpha.toFixed(2)})`;
  ctx.beginPath();
  safeEllipse(ctx, -0.1, 0, 1.95, 1.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const shoeScale = 1.0 + Math.min(0.18, liftZ * 0.042);
  ctx.scale(shoeScale, shoeScale);

  if (isFirefighter) {
    // Heavy steel-toe fire boot with yellow sole trim
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    safeRoundRect(ctx, -1.6, -1.45, 3.6, 2.9, 0.85);
    ctx.fill();
    if (highDetail) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      safeEllipse(ctx, 1.05, 0, 0.7, 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (footwearType === 'sandals') {
    // Bare foot + leather cross straps
    ctx.fillStyle = shadeHex(footwearColor, 0.85);
    ctx.beginPath();
    safeRoundRect(ctx, -1.4, -1.25, 3.1, 2.5, 0.9);
    ctx.fill();
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    safeEllipse(ctx, 0.15, 0, 1.2, 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = footwearColor;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(-0.3, -1.0); ctx.lineTo(0.6, 1.0);
    ctx.moveTo(-0.3, 1.0); ctx.lineTo(0.6, -1.0);
    ctx.stroke();
  } else if (footwearType === 'winter_boots' || footwearType === 'boots') {
    // Chunky insulated boot with lug sole & subtle fur cuff for winter_boots
    ctx.fillStyle = shadeHex(footwearColor, 0.72);
    ctx.beginPath();
    safeRoundRect(ctx, -1.55, -1.4, 3.5, 2.8, 0.85);
    ctx.fill();
    ctx.fillStyle = footwearColor;
    ctx.beginPath();
    safeRoundRect(ctx, -1.35, -1.22, 3.1, 2.44, 0.75);
    ctx.fill();
    if (highDetail) {
      // Leather toe highlight
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      safeEllipse(ctx, 0.95, 0, 0.65, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      if (footwearType === 'winter_boots') {
        // Warm shearling cuff ring
        ctx.strokeStyle = '#d6cfc2';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.arc(-0.55, 0, 1.05, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else if (footwearType === 'loafers') {
    // Sleek tapered dress shoe with polished vamp shine
    ctx.fillStyle = footwearColor;
    ctx.beginPath();
    safeEllipse(ctx, 0.2, 0, 1.85, 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      safeEllipse(ctx, 0.9, -0.15, 0.6, 0.35, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Modern sneakers with contrasting rubber midsole & laces
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    safeRoundRect(ctx, -1.45, -1.32, 3.25, 2.64, 0.85);
    ctx.fill();
    ctx.fillStyle = footwearColor;
    ctx.beginPath();
    safeRoundRect(ctx, -1.28, -1.12, 2.85, 2.24, 0.7);
    ctx.fill();
    if (highDetail) {
      // Toe cap & subtle laces
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(0.85, -0.82, 0.55, 1.64);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(0.0, -0.5); ctx.lineTo(0.0, 0.5);
      ctx.moveTo(0.45, -0.45); ctx.lineTo(0.45, 0.45);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawTaperedSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  fill: string,
  outline?: string
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x1, y1, Math.max(r1, r2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const nx = -dy / len;
  const ny = dx / len;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
  ctx.arc(x2, y2, r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
  ctx.arc(x1, y1, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  ctx.closePath();
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.35;
    ctx.stroke();
  }
}

function drawRealisticLeg(
  ctx: CanvasRenderingContext2D,
  leg: HumanPose3D['legL'],
  pantsColor: string,
  skinColor: string,
  hasShorts: boolean,
  footwearType: NonNullable<Pedestrian['footwearType']>,
  footwearColor: string,
  isFirefighter: boolean,
  highDetail: boolean
): void {
  drawFootwear(
    ctx,
    leg.foot.x,
    leg.foot.y,
    leg.footAngle,
    leg.foot.z,
    footwearType,
    footwearColor,
    skinColor,
    isFirefighter,
    highDetail
  );

  const thighColor = isFirefighter ? '#111827' : pantsColor;
  const shinColor = isFirefighter ? '#111827' : hasShorts ? skinColor : shadeHex(pantsColor, 0.92);
  const outline = 'rgba(0,0,0,0.22)';

  // Upper thigh (hip -> knee)
  drawTaperedSegment(
    ctx,
    leg.hip.x,
    leg.hip.y,
    isFirefighter ? 1.75 : 1.62,
    leg.knee.x,
    leg.knee.y,
    isFirefighter ? 1.52 : 1.38,
    thighColor,
    highDetail ? outline : undefined
  );

  // Lower shin/calf (knee -> foot)
  drawTaperedSegment(
    ctx,
    leg.knee.x,
    leg.knee.y,
    isFirefighter ? 1.48 : hasShorts ? 1.18 : 1.34,
    leg.foot.x,
    leg.foot.y,
    isFirefighter ? 1.25 : hasShorts ? 0.92 : 1.12,
    shinColor,
    highDetail ? outline : undefined
  );

  if (highDetail) {
    // Subtle knee fabric highlight / kneecap contour
    ctx.fillStyle = hasShorts ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.09)';
    ctx.beginPath();
    ctx.arc(leg.knee.x, leg.knee.y, 1.05, 0, Math.PI * 2);
    ctx.fill();

    if (hasShorts && !isFirefighter) {
      // Crisp hem line at shorts knee edge
      ctx.strokeStyle = shadeHex(pantsColor, 0.72);
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.arc(leg.knee.x, leg.knee.y, 1.32, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (isFirefighter) {
    // High-vis reflective ankle bands
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(leg.foot.x - 0.65, leg.foot.y - 1.35, 0.95, 2.7);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(leg.foot.x - 0.35, leg.foot.y - 1.35, 0.32, 2.7);
  }
}

function drawRealisticArm(
  ctx: CanvasRenderingContext2D,
  arm: HumanPose3D['armL'],
  isLeft: boolean,
  upperSleeveColor: string,
  forearmColor: string,
  handColor: string,
  hasGloves: boolean,
  hasCuff: boolean,
  isCheckingWatch: boolean,
  isFirefighter: boolean,
  highDetail: boolean
): void {
  const outline = highDetail ? 'rgba(0,0,0,0.22)' : undefined;

  // Upper arm / deltoid (shoulder -> elbow)
  drawTaperedSegment(
    ctx,
    arm.shoulder.x,
    arm.shoulder.y,
    isFirefighter ? 1.5 : 1.32,
    arm.elbow.x,
    arm.elbow.y,
    isFirefighter ? 1.28 : 1.12,
    upperSleeveColor,
    outline
  );

  // Forearm (elbow -> wrist/hand)
  drawTaperedSegment(
    ctx,
    arm.elbow.x,
    arm.elbow.y,
    isFirefighter ? 1.25 : 1.08,
    arm.hand.x,
    arm.hand.y,
    isFirefighter ? 1.08 : 0.88,
    forearmColor,
    outline
  );

  if (highDetail) {
    // Soft elbow crease shadow
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.arc(arm.elbow.x, arm.elbow.y, 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Sleeve cuff ring at wrist when wearing long sleeves
    if (hasCuff) {
      const wx = arm.elbow.x * 0.22 + arm.hand.x * 0.78;
      const wy = arm.elbow.y * 0.22 + arm.hand.y * 0.78;
      ctx.strokeStyle = isFirefighter ? '#a3e635' : shadeHex(forearmColor, 0.74);
      ctx.lineWidth = isFirefighter ? 0.65 : 0.45;
      ctx.beginPath();
      ctx.arc(wx, wy, 0.98, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Wristwatch on left wrist when checking watch
  if (isLeft && isCheckingWatch) {
    const wx = arm.elbow.x * 0.25 + arm.hand.x * 0.75;
    const wy = arm.elbow.y * 0.25 + arm.hand.y * 0.75;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(wx, wy, 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(wx, wy, 0.68, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sculpted hand / winter glove with thumb contour
  ctx.save();
  ctx.translate(arm.hand.x, arm.hand.y);
  const handAng = Math.atan2(arm.hand.y - arm.elbow.y, arm.hand.x - arm.elbow.x);
  ctx.rotate(handAng);
  ctx.fillStyle = handColor;
  ctx.beginPath();
  safeEllipse(ctx, 0.2, 0, hasGloves ? 1.25 : 1.15, hasGloves ? 1.0 : 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  if (highDetail) {
    // Subtle thumb tuck
    ctx.fillStyle = shadeHex(handColor, 0.9);
    ctx.beginPath();
    ctx.arc(0.15, isLeft ? 0.65 : -0.65, 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    safeEllipse(ctx, 0.2, 0, hasGloves ? 1.25 : 1.15, hasGloves ? 1.0 : 0.88, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// REALISTIC LAYERED TORSO & GARMENT RENDERER (14 Garment Types + Weather Wear)
// ============================================================================
function drawRealisticTorso(
  ctx: CanvasRenderingContext2D,
  ped: Pedestrian,
  pose: HumanPose3D,
  wetDarken: number,
  isFirefighter: boolean,
  highDetail: boolean
): void {
  const clothType = ped.clothingType || 'tshirt';
  const mainCol = shadeHex(ped.isJanitor ? '#ca8a04' : ped.shirtColor || '#3b82f6', wetDarken);
  const jacketCol = shadeHex(ped.jacketColor || mainCol, wetDarken);
  const innerCol = shadeHex(ped.innerShirtColor || '#f8fafc', wetDarken);
  const shoulderScale = ped.bio?.shoulderScale ?? 1.0;

  // Bulky winter coats have slightly thicker outer silhouette
  const bulkMul =
    isFirefighter
      ? 1.08
      : clothType === 'parka' || clothType === 'puffer' || clothType === 'winter_coat'
        ? 1.09
        : clothType === 'raincoat' || clothType === 'trench'
          ? 1.04
          : 1.0;

  const rx = 4.25 * bulkMul;
  const ry = 5.75 * shoulderScale * bulkMul;

  ctx.save();
  ctx.translate(pose.torso.x, pose.torso.y);
  ctx.rotate(pose.torso.yaw);
  ctx.scale(pose.torso.breathScale, pose.torso.breathScale);

  // Subtle torso base shading gradient (directional upper-left skylight -> natural 3D cylindrical rolloff!)
  const makeFabricGrad = (baseColor: string) => {
    if (!highDetail) return baseColor;
    const g = ctx.createLinearGradient(-rx, -ry * 0.7, rx, ry * 0.8);
    g.addColorStop(0.0, shadeHex(baseColor, 1.16));
    g.addColorStop(0.48, baseColor);
    g.addColorStop(1.0, shadeHex(baseColor, 0.74));
    return g;
  };

  if (isFirefighter) {
    // Heavy Nomex turnout coat with reflective harness
    ctx.fillStyle = makeFabricGrad('#151d2e');
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // High-vis lime-yellow & silver reflective strips
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(-1.3, -ry * 0.82); ctx.lineTo(-1.3, ry * 0.82);
    ctx.moveTo(1.4, -ry * 0.82); ctx.lineTo(1.4, ry * 0.82);
    ctx.moveTo(-rx * 0.8, -2.1); ctx.lineTo(rx * 0.8, -2.1);
    ctx.moveTo(-rx * 0.8, 2.1); ctx.lineTo(rx * 0.8, 2.1);
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(-1.3, -ry * 0.82); ctx.lineTo(-1.3, ry * 0.82);
    ctx.moveTo(1.4, -ry * 0.82); ctx.lineTo(1.4, ry * 0.82);
    ctx.stroke();
  } else if (clothType === 'parka' || clothType === 'puffer') {
    // Insulated Winter Parka / Puffer Jacket with quilted down baffles & fur collar!
    ctx.fillStyle = makeFabricGrad(mainCol);
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (highDetail) {
      // Quilted horizontal baffle stitching lines
      ctx.strokeStyle = shadeHex(mainCol, 0.68);
      ctx.lineWidth = 0.48;
      ctx.beginPath();
      ctx.moveTo(-2.1, -ry * 0.82); ctx.lineTo(-2.1, ry * 0.82);
      ctx.moveTo(0.2, -ry * 0.92); ctx.lineTo(0.2, ry * 0.92);
      ctx.moveTo(2.3, -ry * 0.72); ctx.lineTo(2.3, ry * 0.72);
      ctx.stroke();

      // Central zipper / storm flap
      ctx.strokeStyle = shadeHex(mainCol, 0.58);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(1.0, 0); ctx.lineTo(rx * 0.95, 0);
      ctx.stroke();

      // Parka fur-lined collar / folded hood behind neck
      if (clothType === 'parka' && !ped.hoodUp) {
        ctx.fillStyle = '#c2a684';
        ctx.beginPath();
        safeEllipse(ctx, -2.4, 0, 2.3, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shadeHex(mainCol, 0.85);
        ctx.beginPath();
        safeEllipse(ctx, -2.1, 0, 1.85, 2.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (clothType === 'winter_coat' || clothType === 'trench') {
    // Tailored Heavy Wool Overcoat / Trench Coat with structured wide lapels & buttons
    ctx.fillStyle = makeFabricGrad(mainCol);
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (highDetail) {
      // Wide notched lapels & inner shirt/sweater V
      ctx.fillStyle = innerCol;
      ctx.beginPath();
      ctx.moveTo(rx * 0.88, 0);
      ctx.lineTo(0.4, -1.7);
      ctx.lineTo(0.4, 1.7);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = shadeHex(mainCol, 0.65);
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(rx * 0.85, -1.5); ctx.lineTo(0.2, -2.5); ctx.lineTo(-1.2, -1.7);
      ctx.moveTo(rx * 0.85, 1.5); ctx.lineTo(0.2, 2.5); ctx.lineTo(-1.2, 1.7);
      ctx.stroke();

      // Epaulets on trench coat
      if (clothType === 'trench') {
        ctx.fillStyle = shadeHex(mainCol, 0.82);
        ctx.fillRect(-0.8, -ry * 0.82, 1.5, 2.2);
        ctx.fillRect(-0.8, ry * 0.82 - 2.2, 1.5, 2.2);
      }
    }
  } else if (clothType === 'raincoat') {
    // Waterproof technical shell with subtle glossy sheen & taped seams
    ctx.fillStyle = makeFabricGrad(mainCol);
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (highDetail) {
      // Specular waterproof highlight arc along shoulders
      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      safeEllipse(ctx, -0.3, -0.5, rx * 0.65, ry * 0.72, 0, -Math.PI * 0.75, Math.PI * 0.4);
      ctx.stroke();

      // Taped waterproof zip seam
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(0.8, 0); ctx.lineTo(rx * 0.92, 0);
      ctx.stroke();

      // Draped rear hood if not pulled up
      if (!ped.hoodUp) {
        ctx.fillStyle = shadeHex(mainCol, 0.82);
        ctx.beginPath();
        safeEllipse(ctx, -2.5, 0, 2.1, 2.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (clothType === 'open_jacket' || clothType === 'suit') {
    const outerCol = clothType === 'suit' ? shadeHex('#172030', wetDarken) : jacketCol;
    ctx.fillStyle = makeFabricGrad(outerCol);
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner shirt V-opening
    ctx.fillStyle = innerCol;
    ctx.beginPath();
    ctx.moveTo(rx * 0.85, 0);
    ctx.lineTo(-1.2, -1.85);
    ctx.lineTo(-1.2, 1.85);
    ctx.closePath();
    ctx.fill();

    if (clothType === 'suit') {
      // Silk necktie
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(2.9, 0);
      ctx.lineTo(1.2, -0.58);
      ctx.lineTo(-0.9, 0);
      ctx.lineTo(1.2, 0.58);
      ctx.closePath();
      ctx.fill();
    }
    if (highDetail) {
      // Lapel edges
      ctx.strokeStyle = shadeHex(outerCol, 1.25);
      ctx.lineWidth = 0.52;
      ctx.beginPath();
      ctx.moveTo(rx * 0.75, -1.9); ctx.lineTo(-1.1, -1.9);
      ctx.moveTo(rx * 0.75, 1.9); ctx.lineTo(-1.1, 1.9);
      ctx.stroke();
    }
  } else if (clothType === 'hoodie') {
    ctx.fillStyle = makeFabricGrad(mainCol);
    ctx.beginPath();
    safeEllipse(ctx, 0.1, 0, rx * 1.03, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (highDetail) {
      if (!ped.hoodUp) {
        // Soft draped fleece hood behind shoulders
        ctx.fillStyle = shadeHex(mainCol, 0.78);
        ctx.beginPath();
        safeEllipse(ctx, -2.55, 0, 2.25, 2.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shadeHex(mainCol, 0.62);
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
      // Hoodie drawstrings
      ctx.strokeStyle = 'rgba(248,250,252,0.78)';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.moveTo(1.4, -0.85); ctx.lineTo(3.1, -0.65);
      ctx.moveTo(1.4, 0.85); ctx.lineTo(3.1, 0.65);
      ctx.stroke();
    }
  } else if (clothType === 'vest') {
    // Contrasting shirt sleeves + quilted gilet torso
    ctx.fillStyle = makeFabricGrad(innerCol);
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx * 0.96, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = makeFabricGrad(mainCol);
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx * 0.98, ry * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      ctx.strokeStyle = shadeHex(mainCol, 0.7);
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.moveTo(-1.2, -ry * 0.76); ctx.lineTo(-1.2, ry * 0.76);
      ctx.moveTo(1.1, -ry * 0.76); ctx.lineTo(1.1, ry * 0.76);
      ctx.stroke();
    }
  } else if (clothType === 'dress') {
    // Flowing A-line dress with waist cinch & subtle skirt pleats
    const skirtSway = Math.sin(ped.walkCycle || 0) * 0.45;
    ctx.fillStyle = makeFabricGrad(mainCol);
    ctx.beginPath();
    ctx.moveTo(-3.9, -ry * 1.02 + skirtSway * 0.4);
    ctx.quadraticCurveTo(1.2, -ry * 0.9, rx * 0.92, -2.4);
    ctx.lineTo(rx * 0.92, 2.4);
    ctx.quadraticCurveTo(1.2, ry * 0.9, -3.9, ry * 1.02 + skirtSway * 0.4);
    ctx.closePath();
    ctx.fill();
    if (highDetail) {
      // Waistband & soft fabric fold lines
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(-0.85, -ry * 0.82, 1.05, ry * 1.64);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.moveTo(-1.0, -2.5); ctx.lineTo(-3.6, -3.6);
      ctx.moveTo(-1.0, 2.5); ctx.lineTo(-3.6, 3.6);
      ctx.stroke();
      // Exposed neck/collarbone
      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      safeEllipse(ctx, 1.9, 0, 1.35, 1.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (clothType === 'button_shirt' || clothType === 'sweater') {
    ctx.fillStyle = makeFabricGrad(mainCol);
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      if (clothType === 'button_shirt') {
        // Pointed shirt collar & center button placket
        ctx.fillStyle = shadeHex(mainCol, 1.15);
        ctx.beginPath();
        ctx.moveTo(1.7, -1.9); ctx.lineTo(3.3, -0.7); ctx.lineTo(1.8, 0);
        ctx.moveTo(1.7, 1.9); ctx.lineTo(3.3, 0.7); ctx.lineTo(1.8, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-2.2, 0); ctx.lineTo(2.4, 0);
        ctx.stroke();
      } else {
        // Ribbed sweater crew neck ring
        ctx.strokeStyle = shadeHex(mainCol, 0.72);
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(1.2, 0, 2.1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else {
    // T-Shirt / Tank Top / Janitor high-vis top
    if (clothType === 'tank' && !ped.isJanitor) {
      // Bare shoulders visible on outer edges of tank straps
      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      safeEllipse(ctx, 0, 0, rx * 0.92, ry * 0.96, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = makeFabricGrad(mainCol);
      ctx.beginPath();
      safeEllipse(ctx, 0, 0, rx * 0.94, ry * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = makeFabricGrad(mainCol);
      ctx.beginPath();
      safeEllipse(ctx, 0, 0, rx * 0.95, ry * 0.96, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ped.isJanitor) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(-1.1, -ry * 0.8); ctx.lineTo(-1.1, ry * 0.8);
      ctx.moveTo(1.2, -ry * 0.8); ctx.lineTo(1.2, ry * 0.8);
      ctx.stroke();
    } else {
      // Neck/clavicle opening
      ctx.fillStyle = ped.skinColor;
      ctx.beginPath();
      ctx.arc(1.85, 0, 1.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle woven micro-texture + soft crisp garment rim
  if (highDetail) {
    const pat = getFabricMicroWeave(ctx);
    if (pat) {
      ctx.save();
      ctx.fillStyle = pat;
      ctx.beginPath();
      safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Shoulder seam & rim definition
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle rain wetness specular sheen on shoulders
    const wet = ped.bio?.wetness || 0;
    if (wet > 25) {
      ctx.fillStyle = `rgba(215, 238, 255, ${((wet / 100) * 0.14).toFixed(3)})`;
      ctx.beginPath();
      safeEllipse(ctx, -0.5, -1.4, rx * 0.52, ry * 0.38, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cozy Winter Scarf wrapped around neck with swaying folded tail!
  if (ped.scarfColor && !isFirefighter) {
    const scarfCol = shadeHex(ped.scarfColor, wetDarken);
    const tailSway = Math.sin((ped.walkCycle || 0) * 0.9) * 0.55;
    ctx.fillStyle = scarfCol;
    ctx.beginPath();
    safeEllipse(ctx, 0.9, 0, 2.35, 3.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trailing scarf end over left shoulder/chest
    ctx.beginPath();
    safeRoundRect(ctx, -0.6, -2.5 + tailSway * 0.3, 4.3, 1.45, 0.55);
    ctx.fill();
    if (highDetail) {
      ctx.strokeStyle = shadeHex(scarfCol, 1.25);
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(0.4, -2.2); ctx.lineTo(0.4, 2.2);
      ctx.moveTo(1.6, -2.1); ctx.lineTo(1.6, 2.1);
      ctx.stroke();
    }
  }

  // Detailed Woven Backpack (attached to torso frame)
  if (ped.hasBackpack) {
    const bpCol = shadeHex(ped.backpackColor || '#1e293b', wetDarken);
    ctx.fillStyle = bpCol;
    ctx.beginPath();
    safeRoundRect(ctx, -5.5, -3.7, 3.9, 7.4, 1.1);
    ctx.fill();
    if (highDetail) {
      // Front zipped compartment pouch & zipper line
      ctx.fillStyle = shadeHex(bpCol, 0.82);
      ctx.beginPath();
      safeRoundRect(ctx, -5.2, -2.9, 1.7, 5.8, 0.65);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-3.4, -2.7); ctx.lineTo(-3.4, 2.7);
      ctx.stroke();
      // Padded shoulder straps over trapezius
      ctx.strokeStyle = shadeHex(bpCol, 0.62);
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(-1.6, -3.2); ctx.lineTo(1.8, -2.85);
      ctx.moveTo(-1.6, 3.2); ctx.lineTo(1.8, 2.85);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ============================================================================
// REALISTIC SCULPTED HEAD, HAIR, HATS, HOODS & COLD BREATH VAPOR
// ============================================================================
function drawRealisticHead(
  ctx: CanvasRenderingContext2D,
  headPose: HumanPose3D['head'],
  skinColor: string,
  hairColor: string,
  hairStyle: NonNullable<Pedestrian['hairStyle']>,
  hasHat: boolean,
  hatType: NonNullable<Pedestrian['hatType']>,
  hatColor: string,
  hoodUp: boolean,
  hoodColor: string,
  hasFurTrimHood: boolean,
  hasGlasses: boolean,
  glassesStyle: 'optical' | 'sunglasses',
  hasHeadphones: boolean,
  isFirefighter: boolean,
  walkCycle: number,
  coldBreathAlpha: number,
  breathPhase: number,
  highDetail: boolean
): void {
  ctx.save();
  ctx.translate(headPose.x, headPose.y);
  ctx.rotate(headPose.yaw);
  const pitchShiftX = -headPose.pitch * 1.32;

  // 1. Soft drop shadow from head onto neck & shoulders (critical for crisp 3D depth separation!)
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.beginPath();
  safeEllipse(ctx, -0.55, 0.45, 3.6, 3.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Visible cold-air condensation breath puff drifting forward from mouth/nose (< 4°C)!
  if (coldBreathAlpha > 0.02) {
    const exhale = Math.sin(breathPhase);
    if (exhale > 0.15) {
      const p = (exhale - 0.15) / 0.85;
      const puffX = 4.2 + p * 4.4;
      const puffY = Math.sin(breathPhase * 0.5) * 0.9;
      const puffR = 1.15 + p * 2.1;
      const a = coldBreathAlpha * (1 - p * 0.72) * 0.34;
      ctx.fillStyle = `rgba(226, 238, 250, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(puffX, puffY, puffR, 0, Math.PI * 2);
      ctx.arc(puffX + 1.1, puffY + 0.45, puffR * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Ears (subtle shaded pinnae)
  if (!hoodUp && !isFirefighter) {
    ctx.fillStyle = shadeHex(skinColor, 0.9);
    ctx.beginPath();
    safeEllipse(ctx, -0.2, -3.35, 0.82, 0.55, 0.18, 0, Math.PI * 2);
    safeEllipse(ctx, -0.2, 3.35, 0.82, 0.55, -0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Anatomically shaded cranium & face
  if (highDetail) {
    const skGrad = ctx.createRadialGradient(0.9, -0.9, 0.4, 0, 0, 3.6);
    skGrad.addColorStop(0.0, shadeHex(skinColor, 1.12));
    skGrad.addColorStop(0.65, skinColor);
    skGrad.addColorStop(1.0, shadeHex(skinColor, 0.78));
    ctx.fillStyle = skGrad;
  } else {
    ctx.fillStyle = skinColor;
  }
  ctx.beginPath();
  safeEllipse(ctx, 0, 0, 3.45, 3.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle nose bridge & brow cues on front of face (+X)
  const noseX = 3.25 + pitchShiftX * 0.6;
  ctx.fillStyle = shadeHex(skinColor, 0.94);
  ctx.beginPath();
  safeEllipse(ctx, noseX, 0, 0.65, 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  if (highDetail) {
    // Subtle nasal bridge highlight
    ctx.fillStyle = shadeHex(skinColor, 1.14);
    ctx.beginPath();
    ctx.arc(noseX - 0.12, -0.08, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Subtle eyebrows near forehead rim
    ctx.strokeStyle = shadeHex(hairColor, 0.85);
    ctx.lineWidth = 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2.4 + pitchShiftX * 0.45, -1.65); ctx.lineTo(2.65 + pitchShiftX * 0.45, -0.6);
    ctx.moveTo(2.4 + pitchShiftX * 0.45, 1.65); ctx.lineTo(2.65 + pitchShiftX * 0.45, 0.6);
    ctx.stroke();
  }

  // 5. Optical Eyeglasses or Tinted Sunglasses with specular glint
  if (hasGlasses && !isFirefighter) {
    const gx = 1.95 + pitchShiftX * 0.4;
    const isSun = glassesStyle === 'sunglasses';
    ctx.fillStyle = isSun ? 'rgba(15, 23, 42, 0.92)' : 'rgba(186, 230, 253, 0.36)';
    ctx.strokeStyle = isSun ? '#0f172a' : '#334155';
    ctx.lineWidth = 0.38;
    ctx.beginPath();
    safeRoundRect(ctx, gx - 0.3, -2.35, 1.05, 1.75, 0.35);
    safeRoundRect(ctx, gx - 0.3, 0.6, 1.05, 1.75, 0.35);
    ctx.fill();
    ctx.stroke();
    // Bridge & temples
    ctx.beginPath();
    ctx.moveTo(gx + 0.2, -0.6); ctx.lineTo(gx + 0.2, 0.6);
    ctx.moveTo(gx + 0.2, -2.35); ctx.lineTo(0.1, -3.25);
    ctx.moveTo(gx + 0.2, 2.35); ctx.lineTo(0.1, 3.25);
    ctx.stroke();
    if (highDetail && isSun) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(gx + 0.15, -2.1, 0.3, 0.55);
      ctx.fillRect(gx + 0.15, 0.85, 0.3, 0.55);
    }
  }

  // 6. Hairstyles / Raised Hood / Hats / Firefighter Helmet
  if (isFirefighter) {
    // Detailed Fire Helmet with gold shield, ridge & dark visor
    const helmGrad = ctx.createRadialGradient(0.6, -0.8, 0.4, 0, 0, 4.4);
    helmGrad.addColorStop(0, '#fb923c');
    helmGrad.addColorStop(0.7, '#ea580c');
    helmGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = helmGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 4.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 0.85;
    ctx.stroke();

    // Central protective crest ridge
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    safeRoundRect(ctx, -3.8, -0.62, 6.8, 1.24, 0.5);
    ctx.fill();

    // Front brass shield & tinted polycarbonate visor
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(3.0, -1.0); ctx.lineTo(4.25, 0); ctx.lineTo(3.0, 1.0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.arc(0, 0, 4.45, -Math.PI * 0.22, Math.PI * 0.22);
    ctx.lineTo(1.8, 0);
    ctx.closePath();
    ctx.fill();
  } else if (hoodUp) {
    // Raised rain/winter hood enveloping head from behind with natural fabric crease
    const hGrad = highDetail
      ? ctx.createRadialGradient(-0.8, -0.8, 0.4, -0.4, 0, 4.4)
      : null;
    if (hGrad) {
      hGrad.addColorStop(0, shadeHex(hoodColor, 1.15));
      hGrad.addColorStop(0.7, hoodColor);
      hGrad.addColorStop(1, shadeHex(hoodColor, 0.7));
      ctx.fillStyle = hGrad;
    } else {
      ctx.fillStyle = hoodColor;
    }
    ctx.beginPath();
    ctx.arc(-0.55, 0, 4.05, Math.PI * 0.28, Math.PI * 1.72);
    ctx.quadraticCurveTo(2.4, -2.5, 2.25, -1.4);
    ctx.quadraticCurveTo(1.5, 0, 2.25, 1.4);
    ctx.quadraticCurveTo(2.4, 2.5, -0.55 + Math.cos(Math.PI * 0.28) * 4.05, Math.sin(Math.PI * 0.28) * 4.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shadeHex(hoodColor, 0.62);
    ctx.lineWidth = 0.45;
    ctx.stroke();

    // Cozy faux-fur front hood rim on winter parkas!
    if (hasFurTrimHood) {
      ctx.strokeStyle = '#d4bc9b';
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0.4, 0, 3.25, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
      ctx.strokeStyle = '#8b6f4e';
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
  } else if (hasHat) {
    drawRealisticHat(ctx, hatType, hatColor, hairColor, highDetail);
  } else {
    drawRealisticHair(ctx, hairStyle, hairColor, walkCycle, highDetail);
  }

  // 7. Over-Ear Headphones (if no hood/winter ushanka covering ears)
  if (hasHeadphones && !isFirefighter && !hoodUp && !(hasHat && hatType === 'ushanka')) {
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.arc(-0.2, 0, 3.65, -Math.PI * 0.44, Math.PI * 0.44);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    safeRoundRect(ctx, -0.9, -4.25, 1.7, 1.1, 0.45);
    safeRoundRect(ctx, -0.9, 3.15, 1.7, 1.1, 0.45);
    ctx.fill();
    if (highDetail) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-0.4, -4.15, 0.7, 0.35);
      ctx.fillRect(-0.4, 3.8, 0.7, 0.35);
    }
  }

  ctx.restore();
}

function drawRealisticHair(
  ctx: CanvasRenderingContext2D,
  hairStyle: NonNullable<Pedestrian['hairStyle']>,
  hairColor: string,
  walkCycle: number,
  highDetail: boolean
): void {
  if (hairStyle === 'bald') {
    // Natural scalp specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    safeEllipse(ctx, 0.4, -0.8, 1.25, 0.85, -0.3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const hBase = hairColor;
  const hDark = shadeHex(hairColor, 0.72);
  const hLight = shadeHex(hairColor, 1.28);

  const hairFill = highDetail
    ? (() => {
        const g = ctx.createRadialGradient(-0.3, -1.0, 0.3, -0.8, 0, 4.2);
        g.addColorStop(0.0, hLight);
        g.addColorStop(0.55, hBase);
        g.addColorStop(1.0, hDark);
        return g;
      })()
    : hBase;

  ctx.fillStyle = hairFill;
  ctx.beginPath();

  if (hairStyle === 'short') {
    ctx.arc(-0.75, 0, 3.35, Math.PI * 0.38, Math.PI * 1.62);
    ctx.quadraticCurveTo(1.6, -2.0, 1.85, -0.5);
    ctx.quadraticCurveTo(1.5, 0.7, 1.25, 2.0);
    ctx.closePath();
    ctx.fill();
  } else if (hairStyle === 'bob') {
    ctx.arc(-0.9, 0, 3.65, Math.PI * 0.32, Math.PI * 1.68);
    ctx.quadraticCurveTo(1.7, -2.6, 1.9, 0);
    ctx.quadraticCurveTo(1.7, 2.6, -0.9 + Math.cos(Math.PI * 0.32) * 3.65, Math.sin(Math.PI * 0.32) * 3.65);
    ctx.closePath();
    ctx.fill();
  } else if (hairStyle === 'long') {
    const hairSway = Math.sin(walkCycle) * 0.35;
    ctx.arc(-1.1, 0, 3.65, Math.PI * 0.32, Math.PI * 1.68);
    ctx.fill();
    ctx.beginPath();
    safeEllipse(ctx, -3.55, -2.35 + hairSway * 0.3, 3.25, 1.65, -0.45, 0, Math.PI * 2);
    safeEllipse(ctx, -3.55, 2.35 + hairSway * 0.3, 3.25, 1.65, 0.45, 0, Math.PI * 2);
    safeEllipse(ctx, -4.1, hairSway * 0.45, 2.8, 2.15, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 'bun') {
    ctx.arc(-0.85, 0, 3.35, Math.PI * 0.42, Math.PI * 1.58);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-4.1, 0, 1.95, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      // Hair tie ring around bun
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 0.48;
      ctx.beginPath();
      ctx.arc(-4.1, 0, 1.95, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }
  } else if (hairStyle === 'ponytail') {
    const tailWag = Math.sin(walkCycle) * 0.18;
    ctx.arc(-0.85, 0, 3.35, Math.PI * 0.42, Math.PI * 1.58);
    ctx.fill();
    ctx.beginPath();
    safeEllipse(ctx, -5.2, tailWag * 2.2, 3.1, 1.25, tailWag, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-3.7, -0.85, 0.65, 1.7);
    }
  } else if (hairStyle === 'spiky') {
    ctx.moveTo(-0.9, -3.2);
    ctx.lineTo(0.9, -4.0); ctx.lineTo(0.0, -2.1);
    ctx.lineTo(2.0, -1.3); ctx.lineTo(0.8, 0);
    ctx.lineTo(2.0, 1.3); ctx.lineTo(0.0, 2.1);
    ctx.lineTo(0.9, 4.0); ctx.lineTo(-0.9, 3.2);
    ctx.arc(-0.9, 0, 3.25, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
  } else if (hairStyle === 'curly') {
    for (let a = 0.45; a < Math.PI * 1.82; a += 0.48) {
      const hx = -0.6 + Math.cos(a) * 2.95;
      const hy = Math.sin(a) * 2.95;
      ctx.moveTo(hx + 1.3, hy);
      ctx.arc(hx, hy, 1.3, 0, Math.PI * 2);
    }
    ctx.arc(-0.9, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 'afro') {
    ctx.arc(-1.1, 0, 4.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine specular crown highlight & strand lines (gives realistic hair volume!)
  if (highDetail) {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.52;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-0.9, 0, 2.25, -Math.PI * 0.65, -Math.PI * 0.15);
    ctx.stroke();

    // Subtle hairline/part shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-2.5, -0.4); ctx.lineTo(0.9, -0.15);
    ctx.stroke();
  }
}

function drawRealisticHat(
  ctx: CanvasRenderingContext2D,
  hatType: NonNullable<Pedestrian['hatType']>,
  hatColor: string,
  hairColor: string,
  highDetail: boolean
): void {
  // Subtle peek of back hair under hats
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(-1.3, 0, 3.2, Math.PI * 0.6, Math.PI * 1.4);
  ctx.fill();

  const hGrad = highDetail
    ? (() => {
        const g = ctx.createRadialGradient(-0.1, -1.0, 0.3, -0.5, 0, 4.2);
        g.addColorStop(0.0, shadeHex(hatColor, 1.22));
        g.addColorStop(0.65, hatColor);
        g.addColorStop(1.0, shadeHex(hatColor, 0.68));
        return g;
      })()
    : hatColor;

  if (hatType === 'ushanka') {
    // Classic winter fur ushanka with thick shearling front visor & side ear flaps!
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    safeRoundRect(ctx, -3.9, -3.7, 6.8, 7.4, 2.2);
    ctx.fill();
    // Fluffy fur front cuff & ear flaps
    ctx.fillStyle = '#c8beb2';
    ctx.beginPath();
    safeRoundRect(ctx, 1.3, -3.3, 1.9, 6.6, 0.85);
    safeEllipse(ctx, -0.9, -3.9, 1.9, 1.05, 0.15, 0, Math.PI * 2);
    safeEllipse(ctx, -0.9, 3.9, 1.9, 1.05, -0.15, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      ctx.strokeStyle = 'rgba(0,0,0,0.24)';
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
  } else if (hatType === 'beanie') {
    // Ribbed knit winter beanie with cuff & cozy top pom-pom
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(-0.55, 0, 3.65, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      ctx.strokeStyle = shadeHex(hatColor, 0.62);
      ctx.lineWidth = 0.45;
      for (let a = 0; a < Math.PI; a += Math.PI / 5) {
        ctx.beginPath();
        ctx.moveTo(-0.55 - Math.cos(a) * 3.4, -Math.sin(a) * 3.4);
        ctx.lineTo(-0.55 + Math.cos(a) * 3.4, Math.sin(a) * 3.4);
        ctx.stroke();
      }
      // Knit cuff ring
      ctx.strokeStyle = shadeHex(hatColor, 0.78);
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.arc(-0.55, 0, 3.45, 0, Math.PI * 2);
      ctx.stroke();
      // Pom-pom at crown
      ctx.fillStyle = shadeHex(hatColor, 1.25);
      ctx.beginPath();
      ctx.arc(-1.2, 0, 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (hatType === 'cap') {
    // Curved-brim baseball cap with 6-panel seams & top button
    ctx.fillStyle = shadeHex(hatColor, 0.82);
    ctx.beginPath();
    safeEllipse(ctx, 2.75, 0, 2.35, 2.15, 0, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(-0.5, 0, 3.42, 0, Math.PI * 2);
    ctx.fill();

    if (highDetail) {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-0.5, -3.3); ctx.lineTo(-0.5, 3.3);
      ctx.moveTo(-3.8, 0); ctx.lineTo(2.8, 0);
      ctx.stroke();
      ctx.fillStyle = shadeHex(hatColor, 1.2);
      ctx.beginPath();
      ctx.arc(-0.5, 0, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (hatType === 'sunhat') {
    // Woven summer straw hat with ribbon band
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(-0.4, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.arc(-0.4, 0, 3.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = shadeHex(hatColor, 1.1);
    ctx.beginPath();
    ctx.arc(-0.4, 0, 2.85, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatType === 'fedora') {
    // Classic brimmed fedora with grosgrain band & pinched crown
    ctx.fillStyle = shadeHex(hatColor, 0.86);
    ctx.beginPath();
    safeEllipse(ctx, -0.2, 0, 4.9, 4.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    safeEllipse(ctx, -0.35, 0, 3.25, 2.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    safeEllipse(ctx, -0.35, 0, 2.9, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (highDetail) {
      ctx.strokeStyle = 'rgba(0,0,0,0.32)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-2.2, 0); ctx.lineTo(1.7, 0);
      ctx.stroke();
    }
  }
}

// ============================================================================
// REALISTIC PROPS (Umbrella, Multi-Breed Dogs, Phone, Coffee, Bike, Scooter)
// ============================================================================
function drawRealisticUmbrella(
  ctx: CanvasRenderingContext2D,
  umb: NonNullable<HumanPose3D['props']['umbrella']>,
  color: string,
  highDetail: boolean
): void {
  ctx.save();
  ctx.translate(umb.x, umb.y);

  // Subtle shadow cast by umbrella onto wearer
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.arc(-0.6, 0.8, umb.radius * 0.96, 0, Math.PI * 2);
  ctx.fill();

  const uGrad = highDetail
    ? (() => {
        const g = ctx.createRadialGradient(-2.4, -2.6, 0.6, 0, 0, umb.radius);
        g.addColorStop(0.0, shadeHex(color, 1.32));
        g.addColorStop(0.62, color);
        g.addColorStop(1.0, shadeHex(color, 0.66));
        return g;
      })()
    : color;

  ctx.fillStyle = uGrad;
  ctx.beginPath();
  // Scalloped 8-panel octagonal umbrella silhouette
  const panels = 8;
  for (let i = 0; i < panels; i++) {
    const a1 = (i / panels) * Math.PI * 2;
    const a2 = ((i + 1) / panels) * Math.PI * 2;
    const am = (a1 + a2) * 0.5;
    const x1 = Math.cos(a1) * umb.radius;
    const y1 = Math.sin(a1) * umb.radius;
    const xm = Math.cos(am) * (umb.radius * 0.95);
    const ym = Math.sin(am) * (umb.radius * 0.95);
    const x2 = Math.cos(a2) * umb.radius;
    const y2 = Math.sin(a2) * umb.radius;
    if (i === 0) ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(xm, ym, x2, y2);
  }
  ctx.closePath();
  ctx.fill();

  if (highDetail) {
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 8 tensioned metal ribs
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 0.62;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      ctx.moveTo(-Math.cos(a) * umb.radius, -Math.sin(a) * umb.radius);
      ctx.lineTo(Math.cos(a) * umb.radius, Math.sin(a) * umb.radius);
    }
    ctx.stroke();

    // Wet specular sheen crescent on top-left panels
    ctx.fillStyle = 'rgba(225, 242, 255, 0.16)';
    ctx.beginPath();
    safeEllipse(ctx, -2.8, -2.8, 3.6, 2.0, -0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  // Metallic tip ferrule
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(0, 0, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRealisticDog(
  ctx: CanvasRenderingContext2D,
  dog: NonNullable<HumanPose3D['props']['dog']>,
  ped: Pedestrian,
  highDetail: boolean
): void {
  const coat = ped.dogColor || '#9a6332';
  const darkCoat = shadeHex(coat, 0.65);
  const lightCoat = shadeHex(coat, 1.24);
  const breed = ped.dogBreed || 'retriever';
  const sizeScale = breed === 'corgi' ? 0.82 : breed === 'terrier' ? 0.74 : breed === 'shepherd' ? 1.08 : 1.0;

  ctx.save();
  // Sagging leather/nylon leash
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.62;
  ctx.beginPath();
  ctx.moveTo(dog.leashStart.x, dog.leashStart.y);
  const midLx = (dog.leashStart.x + dog.leashEnd.x) * 0.5 - 0.7;
  const midLy = (dog.leashStart.y + dog.leashEnd.y) * 0.5 + 1.1;
  ctx.quadraticCurveTo(midLx, midLy, dog.leashEnd.x, dog.leashEnd.y);
  ctx.stroke();

  ctx.translate(dog.x, dog.y);
  ctx.rotate(dog.angle);
  ctx.scale(sizeScale, sizeScale);

  // Soft ground shadow under dog
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  safeEllipse(ctx, -0.3, 0.5, 5.1, 2.9, 0, 0, Math.PI * 2);
  ctx.fill();

  const pawStride = Math.sin(dog.legPhase) * 2.1;
  ctx.fillStyle = darkCoat;
  ctx.beginPath();
  ctx.arc(2.6 + pawStride, -2.0, 0.88, 0, Math.PI * 2);
  ctx.arc(2.6 - pawStride, 2.0, 0.88, 0, Math.PI * 2);
  ctx.arc(-2.6 - pawStride, -2.0, 0.88, 0, Math.PI * 2);
  ctx.arc(-2.6 + pawStride, 2.0, 0.88, 0, Math.PI * 2);
  ctx.fill();

  // Fluffy wagging tail
  ctx.strokeStyle = breed === 'husky' ? '#e2e8f0' : coat;
  ctx.lineWidth = breed === 'corgi' ? 1.0 : 1.45;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4.0, 0);
  ctx.quadraticCurveTo(-5.8, dog.tailAngle * 2.0, breed === 'corgi' ? -5.4 : -7.2, dog.tailAngle * 4.2);
  ctx.stroke();

  // Shaded torso
  ctx.fillStyle = highDetail
    ? (() => {
        const g = ctx.createLinearGradient(0, -2.6, 0, 2.6);
        g.addColorStop(0, lightCoat);
        g.addColorStop(0.55, coat);
        g.addColorStop(1, darkCoat);
        return g;
      })()
    : coat;
  ctx.beginPath();
  safeEllipse(ctx, 0, 0, 4.5, 2.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Breed saddle marking (shepherd / husky)
  if (highDetail && (breed === 'shepherd' || breed === 'husky')) {
    ctx.fillStyle = breed === 'husky' ? '#f1f5f9' : '#291b12';
    ctx.beginPath();
    safeEllipse(ctx, -0.4, 0, 2.6, 1.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Collar with brass tag
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  ctx.moveTo(2.3, -2.0); ctx.lineTo(2.3, 2.0);
  ctx.stroke();

  // Head & tapered snout
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.arc(3.6, 0, 2.15, 0, Math.PI * 2);
  safeEllipse(ctx, 5.4, 0, 1.45, 1.02, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(6.55, 0, 0.52, 0, Math.PI * 2);
  ctx.fill();

  // Ears (pointed for husky/shepherd/corgi, floppy for retriever/terrier)
  ctx.fillStyle = darkCoat;
  ctx.beginPath();
  if (breed === 'husky' || breed === 'shepherd' || breed === 'corgi') {
    ctx.moveTo(2.2, -1.6); ctx.lineTo(3.4, -3.1); ctx.lineTo(4.0, -1.3);
    ctx.moveTo(2.2, 1.6); ctx.lineTo(3.4, 3.1); ctx.lineTo(4.0, 1.3);
  } else {
    safeRoundRect(ctx, 2.1, -2.7, 1.65, 1.35, 0.55);
    safeRoundRect(ctx, 2.1, 1.35, 1.65, 1.35, 0.55);
  }
  ctx.fill();
  ctx.restore();
}

// ============================================================================
// MAIN EXPORTED PEDESTRIAN BATCH RENDERER
// ============================================================================
export function renderDetailedPedestrians(
  ctx: CanvasRenderingContext2D,
  pedestrians: Pedestrian[],
  world: GameWorld | undefined,
  cameraZoom: number = 1.0
): void {
  if (!pedestrians || pedestrians.length === 0) return;

  const nowSec = performance.now() * 0.001;
  const highDetail = cameraZoom >= 0.85;
  const showBubbles = cameraZoom >= 0.45;
  const outsideTempC = world ? getOutsideTemperature(world, world.timeHour ?? 12) : 16;
  const coldBreathAlpha = outsideTempC < 4.5 ? Math.min(1, (4.5 - outsideTempC) / 14) : 0;

  for (let i = 0; i < pedestrians.length; i++) {
    const ped = pedestrians[i];
    if (ped.isInsideBuilding) continue;

    const isFirefighter = Boolean((ped as any).isFirefighter);

    // 0. World-space Fire Hose from Fire Engine to Firefighter
    if (
      world &&
      isFirefighter &&
      ['going_to_fire', 'extinguishing', 'returning_to_truck'].includes((ped as any).firefighterState || '')
    ) {
      const parentCar = world.vehicles.find((v) => v.id === (ped as any).parentVehicleId);
      if (parentCar) {
        const rearX = parentCar.x - Math.cos(parentCar.angle) * (parentCar.length * 0.45);
        const rearY = parentCar.y - Math.sin(parentCar.angle) * (parentCar.length * 0.45);
        const midX = (rearX + ped.x) * 0.5;
        const midY = (rearY + ped.y) * 0.5 + 12;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(rearX + 1.0, rearY + 1.2);
        ctx.quadraticCurveTo(midX, midY, ped.x + 1.0, ped.y + 1.2);
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(rearX, rearY);
        ctx.quadraticCurveTo(midX, midY - 1.5, ped.x, ped.y);
        ctx.stroke();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 0.35;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(rearX, rearY);
        ctx.quadraticCurveTo(midX, midY - 1.5, ped.x, ped.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    const heightScale = ped.bio?.heightScale ?? (ped.isChild ? 0.72 : 1.0);
    const pedScale = heightScale * 0.74;
    const pose = computeHumanPose(ped, false, nowSec);
    const wetness = ped.bio?.wetness || 0;
    const wetDarken = wetness > 8 ? Math.max(0.62, 1.0 - (wetness / 100) * 0.34) : 1.0;

    ctx.save();
    ctx.translate(ped.x, ped.y);

    ctx.save();
    ctx.rotate(ped.angle);
    ctx.scale(pedScale, pedScale);

    // Subtle ground contact occlusion right under body
    if (!pose.props.bicycle && !pose.props.scooter) {
      ctx.fillStyle = pose.isLyingDown ? 'rgba(0,0,0,0.26)' : 'rgba(0,0,0,0.16)';
      ctx.beginPath();
      safeEllipse(ctx, pose.isLyingDown ? -1.0 : 0, 0, pose.isLyingDown ? 8.5 : 4.2, pose.isLyingDown ? 4.4 : 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1. Bicycle / E-Scooter chassis
    if (pose.props.bicycle) {
      const bike = pose.props.bicycle;
      ctx.save();
      ctx.translate(0, bike.leanRoll * 2.0);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8.8, -0.9, 4.6, 1.8);
      ctx.fillRect(4.2, -0.9, 4.6, 1.8);
      const crankX = -0.5;
      const pLx = crankX + Math.cos(bike.pedalAngle) * 2.0;
      const pRx = crankX - Math.cos(bike.pedalAngle) * 2.0;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(crankX, -1.6); ctx.lineTo(pLx, -2.5);
      ctx.moveTo(crankX, 1.6); ctx.lineTo(pRx, 2.5);
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(pLx - 0.7, -3.0, 1.4, 0.9);
      ctx.fillRect(pRx - 0.7, 2.1, 1.4, 0.9);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6.2, 0); ctx.lineTo(5.6, 0);
      ctx.moveTo(3.6, 0); ctx.lineTo(4.6, -3.8);
      ctx.moveTo(3.6, 0); ctx.lineTo(4.6, 3.8);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      safeEllipse(ctx, -2.2, 0, 1.8, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (pose.props.scooter) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7.8, -0.75, 2.6, 1.5);
      ctx.fillRect(5.2, -0.75, 2.6, 1.5);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      safeRoundRect(ctx, -6.5, -1.6, 12.5, 3.2, 1.0);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4.4, -0.6, 1.2, 1.2);
      ctx.fillRect(4.8, -3.4, 0.85, 6.8);
    }

    // 2. Articulated Realistic Legs & Footwear
    const pantsCol = shadeHex(ped.pantsColor || '#1e293b', wetDarken);
    const footType = ped.footwearType || 'sneakers';
    const footCol = shadeHex(ped.footwearColor || '#1e293b', wetDarken);
    const hasShorts = Boolean(ped.hasShorts || ped.clothingType === 'dress');

    drawRealisticLeg(ctx, pose.legL, pantsCol, ped.skinColor, hasShorts, footType, footCol, isFirefighter, highDetail);
    drawRealisticLeg(ctx, pose.legR, pantsCol, ped.skinColor, hasShorts, footType, footCol, isFirefighter, highDetail);

    // 3. Sculpted Torso & Layered Weather-Appropriate Garment
    drawRealisticTorso(ctx, ped, pose, wetDarken, isFirefighter, highDetail);

    // 4. Articulated Realistic Arms, Sleeves & Hands/Gloves
    const clothType = ped.clothingType || 'tshirt';
    const baseSleeve = isFirefighter
      ? '#151d2e'
      : ped.isJanitor
        ? '#ca8a04'
        : clothType === 'open_jacket'
          ? ped.jacketColor || '#334155'
          : clothType === 'suit'
            ? '#172030'
            : clothType === 'vest'
              ? ped.innerShirtColor || '#e2e8f0'
              : ped.shirtColor || '#3b82f6';
    const upperCol = clothType === 'tank' && !isFirefighter && !ped.isJanitor ? ped.skinColor : shadeHex(baseSleeve, wetDarken);
    const isShortSleeve = !isFirefighter && !ped.isJanitor && (clothType === 'tshirt' || clothType === 'dress' || clothType === 'tank');
    const forearmCol = isShortSleeve ? ped.skinColor : upperCol;
    const hasGloves = Boolean(isFirefighter || ped.glovesColor);
    const handCol = isFirefighter ? '#d97724' : ped.glovesColor ? shadeHex(ped.glovesColor, wetDarken) : ped.skinColor;
    const isCheckWatch = pose.actionType === 'checking_watch';

    drawRealisticArm(ctx, pose.armL, true, upperCol, forearmCol, handCol, hasGloves, !isShortSleeve, isCheckWatch, isFirefighter, highDetail);
    drawRealisticArm(ctx, pose.armR, false, upperCol, forearmCol, handCol, hasGloves, !isShortSleeve, false, isFirefighter, highDetail);

    // 5. Handheld Props & Action Gear
    if (isFirefighter && pose.props.fireNozzle) {
      const fn = pose.props.fireNozzle;
      ctx.save();
      ctx.translate(fn.x, fn.y);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-1.4, -1.2, 3.6, 2.4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(1.8, -0.6, 1.3, 1.2);
      ctx.fillRect(-0.6, 0.8, 0.8, 1.5);
      ctx.restore();
    }

    if (pose.props.phone) {
      const ph = pose.props.phone;
      ctx.save();
      ctx.translate(ph.x, ph.y);
      ctx.rotate(ph.angle);
      if (highDetail && pose.actionType !== 'calling_112') {
        const screenGlow = ctx.createRadialGradient(0.5, 0, 0.3, 0.5, 0, 5.5);
        screenGlow.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
        screenGlow.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
        ctx.fillStyle = screenGlow;
        ctx.beginPath();
        ctx.arc(0.5, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      safeRoundRect(ctx, -1.5, -1.2, 3.2, 2.4, 0.55);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-1.15, -0.88, 2.5, 1.76);
      ctx.restore();
    } else if (pose.props.extinguisher) {
      const ext = pose.props.extinguisher;
      ctx.save();
      ctx.translate(ext.x, ext.y);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      safeRoundRect(ctx, -1.5, -2.5, 3.0, 5.0, 1.0);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-1.0, -2.8, 2.0, 0.8);
      ctx.restore();
    } else if (pose.props.coffee) {
      const cf = pose.props.coffee;
      ctx.save();
      ctx.translate(cf.x, cf.y);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 2.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 1.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 1.32, 0, Math.PI * 2);
      ctx.fill();
      if (highDetail) {
        const sp = cf.steamPhase;
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.42)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(Math.sin(sp) * 0.55, Math.cos(sp * 0.8) * 0.55, 0.85 + (sp % 1) * 0.75, 0, Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.restore();
    } else if (pose.props.box) {
      const bx = pose.props.box;
      ctx.save();
      ctx.translate(bx.x, bx.y);
      ctx.rotate(bx.angle);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-2.6, -3.6, 5.2, 7.2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.75;
      ctx.strokeRect(-2.6, -3.6, 5.2, 7.2);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-0.65, -3.6, 1.3, 7.2);
      ctx.restore();
    } else if (pose.props.bag) {
      const bg = pose.props.bag;
      ctx.save();
      ctx.translate(bg.x, bg.y);
      ctx.rotate(bg.swingPitch * 0.42);
      ctx.fillStyle = shadeHex(ped.propColor || '#be123c', wetDarken);
      ctx.beginPath();
      safeRoundRect(ctx, -3.0, -1.7, 6.0, 3.4, 0.9);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      safeEllipse(ctx, 0, 0, 2.2, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (pose.props.broom) {
      const br = pose.props.broom;
      ctx.save();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(br.gripL.x - 1.2, br.gripL.y - 0.5);
      ctx.lineTo(br.shaftEnd.x, br.shaftEnd.y);
      ctx.stroke();
      ctx.save();
      ctx.translate(br.shaftEnd.x, br.shaftEnd.y);
      ctx.rotate(br.headAngle);
      ctx.fillStyle = '#571c05';
      ctx.fillRect(-0.8, -4.8, 2.0, 9.6);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(1.2, -4.8); ctx.lineTo(5.6, -5.8); ctx.lineTo(5.6, 5.8); ctx.lineTo(1.2, 4.8);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    // 6. Sculpted Head, Hair, Hats, Pulled-Up Hood & Winter Breath Vapor
    const hoodColor = shadeHex(ped.shirtColor || '#334155', wetDarken);
    drawRealisticHead(
      ctx,
      pose.head,
      ped.skinColor || '#eac09b',
      ped.hairColor || '#29211d',
      ped.hairStyle || 'short',
      Boolean(ped.hasHat),
      ped.hatType || 'cap',
      shadeHex(ped.hatColor || '#1e293b', wetDarken),
      Boolean(ped.hoodUp),
      hoodColor,
      clothType === 'parka',
      Boolean(ped.hasGlasses),
      ped.glassesStyle || 'optical',
      Boolean(ped.hasHeadphones),
      isFirefighter,
      ped.walkCycle || 0,
      coldBreathAlpha,
      ped.bio?.breathPhase ?? nowSec * 2.4,
      highDetail
    );

    // 7. Rain Umbrella Overhead
    if (pose.props.umbrella) {
      drawRealisticUmbrella(ctx, pose.props.umbrella, ped.umbrellaColor || '#1d4ed8', highDetail);
    }

    // 8. Multi-Breed Dog Companion
    if (pose.props.dog) {
      drawRealisticDog(ctx, pose.props.dog, ped, highDetail);
    }

    // 8b. Anatomical trauma wound markings on wounded/unconscious/dead pedestrians
    if (ped.anatomy && (ped.anatomy.bloodLoss > 3 || ped.anatomy.gunshotTraumaCount > 0)) {
      const a = ped.anatomy;
      ctx.save();
      ctx.fillStyle = 'rgba(136, 19, 24, 0.78)';
      if (a.parts.torso.length > 0) {
        ctx.beginPath();
        safeEllipse(ctx, pose.torso.x + 0.4, pose.torso.y, 1.8 + Math.min(1.6, a.bloodLoss * 0.025), 1.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.parts.head.length > 0) {
        ctx.beginPath();
        ctx.arc(pose.head.x + 0.5, pose.head.y + 0.4, 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.parts.leftArm.length > 0) {
        ctx.beginPath();
        ctx.arc(pose.armL.elbow.x, pose.armL.elbow.y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.parts.rightArm.length > 0) {
        ctx.beginPath();
        ctx.arc(pose.armR.elbow.x, pose.armR.elbow.y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.parts.leftLeg.length > 0) {
        ctx.beginPath();
        ctx.arc(pose.legL.knee.x, pose.legL.knee.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.parts.rightLeg.length > 0) {
        ctx.beginPath();
        ctx.arc(pose.legR.knee.x, pose.legR.knee.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore(); // end rotated ped transform

    // 9. Crisp Translucent Russian Speech Bubble (screen-aligned, hidden if dead or unconscious)
    if (
      showBubbles &&
      ped.state !== 'dead' &&
      ped.state !== 'unconscious' &&
      ped.alertBubbleText &&
      ped.alertBubbleTimer > 0
    ) {
      const text = ped.alertBubbleText;
      const fade = Math.min(1, ped.alertBubbleTimer * 2.2);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.font = '600 9.5px system-ui, -apple-system, sans-serif';
      const tw = ctx.measureText(text).width;
      const bw = tw + 11;
      const bh = 16;
      ctx.translate(0, -12);

      // Tail
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.beginPath();
      ctx.moveTo(0, 4.5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.closePath();
      ctx.fill();

      // Dark frosted card
      ctx.beginPath();
      safeRoundRect(ctx, -bw * 0.5, -bh, bw, bh, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, -bh * 0.5 + 0.3);
      ctx.restore();
    }

    ctx.restore();
  }
}

// ============================================================================
// SHARED REALISTIC PLAYER BODY HELPER (Keeps Player 100% Cohesive with NPCs!)
// ============================================================================
export function renderDetailedPlayerStandingBody(
  ctx: CanvasRenderingContext2D,
  player: Player | any,
  pose: HumanPose3D,
  colors: {
    cSkin: string;
    cPants: string;
    cShirt: string;
    cHair: string;
    cShoes: string;
    cHat: string | null;
    cBack: string | null;
    cHands: string;
  },
  wadeRatio: number,
  outsideTempC: number
): void {
  const { cSkin, cPants, cShirt, cHair, cShoes, cHat, cBack, cHands } = colors;
  const nowSec = performance.now() * 0.001;
  const coldBreathAlpha = outsideTempC < 4.5 ? Math.min(1, (4.5 - outsideTempC) / 14) : 0;

  // Ground contact AO under player (hidden while airborne so ground shadow stays anchored in renderer.ts)
  const isAirborneJump = Boolean(pose.isJumping && (pose.jumpZ || 0) > 0.2);
  if (wadeRatio < 0.2 && !isAirborneJump) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, 4.5, 5.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1. Articulated Realistic Legs & Footwear
  ctx.save();
  if (wadeRatio > 0.12) {
    ctx.globalAlpha = Math.max(0.28, 1 - wadeRatio * 0.72);
  }
  drawRealisticLeg(ctx, pose.legL, cPants, cSkin, false, 'sneakers', cShoes, false, true);
  drawRealisticLeg(ctx, pose.legR, cPants, cSkin, false, 'sneakers', cShoes, false, true);
  ctx.restore();

  if (wadeRatio > 0.15) {
    ctx.fillStyle = `rgba(14, 78, 96, ${(wadeRatio * 0.52).toFixed(3)})`;
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, 4.8, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Sculpted Shaded Player Torso & Backpack
  ctx.save();
  ctx.translate(pose.torso.x, pose.torso.y);
  ctx.rotate(pose.torso.yaw);
  ctx.scale(pose.torso.breathScale, pose.torso.breathScale);

  const rx = 4.55;
  const ry = 6.05;
  const tGrad = ctx.createLinearGradient(-rx, -ry * 0.7, rx, ry * 0.8);
  tGrad.addColorStop(0.0, shadeHex(cShirt, 1.18));
  tGrad.addColorStop(0.5, cShirt);
  tGrad.addColorStop(1.0, shadeHex(cShirt, 0.72));
  ctx.fillStyle = tGrad;
  ctx.beginPath();
  safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  const pat = getFabricMicroWeave(ctx);
  if (pat) {
    ctx.fillStyle = pat;
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shoulder seam, collar detail & neck skin
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  safeEllipse(ctx, 0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0.35, -5.2); ctx.lineTo(0.35, 5.2);
  ctx.stroke();

  ctx.fillStyle = cSkin;
  ctx.beginPath();
  ctx.arc(1.9, 0, 1.45, 0, Math.PI * 2);
  ctx.fill();

  // Waist-deep waterline foam ring when wading deep
  if (wadeRatio > 0.48) {
    const waistAlpha = (wadeRatio - 0.48) * 0.75;
    ctx.strokeStyle = `rgba(224, 245, 254, ${waistAlpha.toFixed(3)})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    safeEllipse(ctx, 0, 0, 4.9, 6.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (cBack) {
    ctx.fillStyle = cBack;
    ctx.beginPath();
    safeRoundRect(ctx, -5.3, -3.5, 3.8, 7.0, 1.0);
    ctx.fill();
    ctx.fillStyle = shadeHex(cBack, 0.8);
    ctx.beginPath();
    safeRoundRect(ctx, -5.0, -2.7, 1.6, 5.4, 0.6);
    ctx.fill();
    ctx.strokeStyle = shadeHex(cBack, 0.58);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-1.5, -3.1); ctx.lineTo(1.7, -2.75);
    ctx.moveTo(-1.5, 3.1); ctx.lineTo(1.7, 2.75);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Articulated Realistic Arms & Hands
  const hasGloves = cHands !== cSkin;
  const isCheckWatch = pose.actionType === 'checking_watch';
  drawRealisticArm(ctx, pose.armL, true, cShirt, cShirt, cHands, hasGloves, true, isCheckWatch, false, true);
  drawRealisticArm(ctx, pose.armR, false, cShirt, cShirt, cHands, hasGloves, true, false, false, true);
}

export function renderDetailedPlayerHead(
  ctx: CanvasRenderingContext2D,
  player: Player | any,
  pose: HumanPose3D,
  cSkin: string,
  cHair: string,
  cHat: string | null,
  outsideTempC: number
): void {
  const nowSec = performance.now() * 0.001;
  const coldBreathAlpha = outsideTempC < 4.5 ? Math.min(1, (4.5 - outsideTempC) / 14) : 0;
  const hatType: NonNullable<Pedestrian['hatType']> = outsideTempC < 4 ? 'beanie' : 'cap';
  drawRealisticHead(
    ctx,
    pose.head,
    cSkin,
    cHair,
    'short',
    Boolean(cHat),
    hatType,
    cHat || '#1e293b',
    false,
    '#1e293b',
    false,
    false,
    'optical',
    false,
    false,
    player.walkCycle || 0,
    coldBreathAlpha,
    nowSec * 2.4,
    true
  );
}

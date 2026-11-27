import type { Vehicle } from './types';
import { getVehicleTurnSignalDynamicState } from './vehicleHelpers';

export type Pt = [number, number];
export type DeformFn = (x: number, y: number) => [number, number];

interface RGB {
  r: number;
  g: number;
  b: number;
}

const rgbCache = new Map<string, RGB>();
const shadeCache = new Map<string, string>();

export function parseColor(color: string | undefined): RGB {
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
 * Shifts a paint color brighter (amount > 0, specular clearcoat)
 * or darker (amount < 0, deep ambient clearcoat shadow).
 */
export function shadePaint(color: string | undefined, amount: number): string {
  const key = `${color || '#64748b'}|${amount.toFixed(2)}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;

  const { r, g, b } = parseColor(color);
  let nr: number;
  let ng: number;
  let nb: number;

  if (amount >= 0) {
    nr = r + (255 - r) * amount;
    ng = g + (255 - g) * amount;
    nb = b + (255 - b) * (amount * 0.96);
  } else {
    const f = 1 + amount;
    nr = r * f;
    ng = g * f;
    nb = b * Math.min(1, f * 1.06);
  }

  const res = `rgb(${clampByte(nr)},${clampByte(ng)},${clampByte(nb)})`;
  if (shadeCache.size < 4096) shadeCache.set(key, res);
  return res;
}

export function colorLuminance(color: string | undefined): number {
  const { r, g, b } = parseColor(color);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isReverseActive(car: Vehicle): boolean {
  if (car.engineState) {
    if (car.engineState.transmissionType === 'AUTO') {
      return car.engineState.autoGearMode === 'R';
    }
    return car.engineState.currentGear === -1;
  }
  return !!car.isReversing;
}

export interface LiveOpticsState {
  headlightsOn: boolean;
  highBeam: boolean;
  positionOn: boolean;
  frontFogOn: boolean;
  rearFogOn: boolean;
  braking: boolean;
  reversing: boolean;
  leftTurn: number;
  rightTurn: number;
  leftHeadBroken: boolean;
  rightHeadBroken: boolean;
  leftTailBroken: boolean;
  rightTailBroken: boolean;
  ignitionOn: boolean;
  sirenOn: boolean;
  sirenStrobe: number;
  roadTrainOn: boolean;
}

export function getLiveOpticsState(car: Vehicle): LiveOpticsState {
  const dmg = car.damage;
  const eng = car.engineState;
  const isTrailer = car.type.startsWith('trailer_') || !!car.isTrailer;
  const plugConnected = car.type !== 'trailer_barrel' && car.trailerPlugConnected !== false;

  const ignitionOn = !!(eng?.ignition || eng?.engineRunning);
  const headlightsOn = !!(car.headlightsOn && (car.headlightMode === 'low' || car.headlightMode === 'high' || !car.headlightMode));
  const highBeam = !!(headlightsOn && car.headlightMode === 'high');
  const positionOn = isTrailer
    ? !!(plugConnected && (car.positionLightsOn || car.headlightsOn))
    : !!(car.positionLightsOn || headlightsOn);
  const braking = isTrailer ? !!(plugConnected && car.brakeLightsOn) : !!car.brakeLightsOn;
  const reversing = isTrailer ? !!(plugConnected && isReverseActive(car)) : isReverseActive(car);
  const rearFogOn = isTrailer ? !!(plugConnected && car.rearFogLightsOn) : !!car.rearFogLightsOn;

  let leftTurn = 0;
  let rightTurn = 0;
  if (!isTrailer || plugConnected) {
    if (car.turnSignal && car.turnSignal !== 'none') {
      const st = getVehicleTurnSignalDynamicState(car);
      if (st.intensity > 0.04) {
        if (car.turnSignal === 'left' || car.turnSignal === 'hazard') leftTurn = st.intensity;
        if (car.turnSignal === 'right' || car.turnSignal === 'hazard') rightTurn = st.intensity;
      }
    }
  }

  return {
    headlightsOn,
    highBeam,
    positionOn,
    frontFogOn: !!car.frontFogLightsOn,
    rearFogOn,
    braking,
    reversing,
    leftTurn,
    rightTurn,
    leftHeadBroken: !!dmg?.leftHeadlightBroken,
    rightHeadBroken: !!dmg?.rightHeadlightBroken,
    leftTailBroken: !!dmg?.leftTaillightBroken,
    rightTailBroken: !!dmg?.rightTaillightBroken,
    ignitionOn,
    sirenOn: !!car.sirenOn,
    sirenStrobe: car.sirenStrobe || 0,
    roadTrainOn: car.roadTrainLightsOn !== false && (ignitionOn || positionOn),
  };
}

export function tracePoly(ctx: CanvasRenderingContext2D, pts: Pt[], deform: DeformFn, close = true): void {
  if (pts.length === 0) return;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [dx, dy] = deform(pts[i][0], pts[i][1]);
    if (i === 0) ctx.moveTo(dx, dy);
    else ctx.lineTo(dx, dy);
  }
  if (close) ctx.closePath();
}

export function fillPoly(
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

export function strokePoly(
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

export function roundedBoxPts(x1: number, y1: number, x2: number, y2: number, r: number): Pt[] {
  const rx = Math.min(r, Math.abs(x2 - x1) * 0.45);
  const ry = Math.min(r, Math.abs(y2 - y1) * 0.45);
  const rr = Math.min(rx, ry);
  if (rr <= 0.08) {
    return [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ];
  }
  const c = rr * 0.30;
  return [
    [x1 + rr, y1],
    [x2 - rr, y1],
    [x2 - c, y1 + c],
    [x2, y1 + rr],
    [x2, y2 - rr],
    [x2 - c, y2 - c],
    [x2 - rr, y2],
    [x1 + rr, y2],
    [x1 + c, y2 - c],
    [x1, y2 - rr],
    [x1, y1 + rr],
    [x1 + c, y1 + c],
  ];
}

export function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  fill: string | CanvasGradient,
  deform: DeformFn,
  stroke?: string,
  lineWidth = 0.5
): void {
  fillPoly(ctx, roundedBoxPts(x1, y1, x2, y2, r), fill, deform, stroke, lineWidth);
}

export function drawDeformedDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  deform: DeformFn,
  stroke?: string,
  lineWidth = 0.4
): void {
  const [dx, dy] = deform(x, y);
  ctx.beginPath();
  ctx.arc(dx, dy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function drawSoftDropShadow(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  offsetX: number,
  offsetY: number,
  alpha: number,
  deform: DeformFn
): void {
  const shifted: Pt[] = pts.map(([px, py]) => [px + offsetX, py + offsetY]);
  fillPoly(ctx, shifted, `rgba(2,6,23,${alpha.toFixed(2)})`, deform);
}

export function drawBoxShadow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  ox: number,
  oy: number,
  alpha: number,
  deform: DeformFn
): void {
  drawRoundedBox(
    ctx,
    x1 + ox,
    y1 + oy,
    x2 + ox,
    y2 + oy,
    r,
    `rgba(2,6,23,${alpha.toFixed(2)})`,
    deform
  );
}

export function createBodyMetallicGradient(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  baseColor: string
): CanvasGradient {
  const grad = ctx.createLinearGradient(0, -halfW, 0, halfW);
  grad.addColorStop(0.0, shadePaint(baseColor, -0.36));
  grad.addColorStop(0.11, shadePaint(baseColor, -0.10));
  grad.addColorStop(0.27, shadePaint(baseColor, 0.24));
  grad.addColorStop(0.46, shadePaint(baseColor, 0.08));
  grad.addColorStop(0.68, shadePaint(baseColor, -0.05));
  grad.addColorStop(0.87, shadePaint(baseColor, -0.20));
  grad.addColorStop(1.0, shadePaint(baseColor, -0.42));
  return grad;
}

export function createRoofGradient(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  roofColor: string
): CanvasGradient {
  const grad = ctx.createLinearGradient(0, -halfW, 0, halfW);
  grad.addColorStop(0.0, shadePaint(roofColor, -0.18));
  grad.addColorStop(0.24, shadePaint(roofColor, 0.24));
  grad.addColorStop(0.52, shadePaint(roofColor, 0.09));
  grad.addColorStop(0.80, shadePaint(roofColor, -0.07));
  grad.addColorStop(1.0, shadePaint(roofColor, -0.24));
  return grad;
}

export function createCylindricalGradient(
  ctx: CanvasRenderingContext2D,
  yMin: number,
  yMax: number,
  baseColor: string,
  highlight = 0.36
): CanvasGradient {
  const grad = ctx.createLinearGradient(0, yMin, 0, yMax);
  grad.addColorStop(0.0, shadePaint(baseColor, -0.44));
  grad.addColorStop(0.14, shadePaint(baseColor, -0.16));
  grad.addColorStop(0.32, shadePaint(baseColor, highlight));
  grad.addColorStop(0.46, shadePaint(baseColor, highlight * 0.45));
  grad.addColorStop(0.70, shadePaint(baseColor, -0.12));
  grad.addColorStop(0.88, shadePaint(baseColor, -0.32));
  grad.addColorStop(1.0, shadePaint(baseColor, -0.50));
  return grad;
}

export function createGlassGradient(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tint: 'blue' | 'smoke' | 'green' = 'blue'
): CanvasGradient {
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  if (tint === 'green') {
    grad.addColorStop(0.0, '#0a1c21');
    grad.addColorStop(0.38, '#173840');
    grad.addColorStop(0.68, '#2b5964');
    grad.addColorStop(1.0, '#081419');
  } else if (tint === 'smoke') {
    grad.addColorStop(0.0, '#070b13');
    grad.addColorStop(0.38, '#131d2f');
    grad.addColorStop(0.68, '#243550');
    grad.addColorStop(1.0, '#070c15');
  } else {
    grad.addColorStop(0.0, '#0a1628');
    grad.addColorStop(0.38, '#1a3454');
    grad.addColorStop(0.68, '#305982');
    grad.addColorStop(1.0, '#081120');
  }
  return grad;
}

/**
 * Renders subtle interior cabin geometry (dash, steering wheel, seats) visible under tinted glass.
 */
export function drawCabinInteriorHint(
  ctx: CanvasRenderingContext2D,
  dashX: number,
  seatX: number,
  cabHalfW: number,
  deform: DeformFn,
  options?: { driverY?: number; dualFrontSeats?: boolean; wheelRadius?: number }
): void {
  const driverY = options?.driverY ?? -cabHalfW * 0.42;
  const dual = options?.dualFrontSeats !== false;
  const wr = options?.wheelRadius ?? Math.min(1.5, cabHalfW * 0.24);

  // Dashboard fascia
  drawRoundedBox(
    ctx,
    dashX - 1.5,
    -cabHalfW * 0.88,
    dashX + 0.6,
    cabHalfW * 0.88,
    0.45,
    'rgba(15,23,42,0.72)',
    deform
  );

  // Steering wheel rim
  const [wx, wy] = deform(dashX - 1.15, driverY);
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(148,163,184,0.34)';
  ctx.lineWidth = 0.55;
  ctx.stroke();

  // Front seat backs + headrests
  const seatW = Math.min(2.6, cabHalfW * 0.44);
  const drawSeat = (sy: number) => {
    drawRoundedBox(
      ctx,
      seatX - 1.5,
      sy - seatW * 0.5,
      seatX + 1.1,
      sy + seatW * 0.5,
      0.5,
      'rgba(30,41,59,0.52)',
      deform,
      'rgba(148,163,184,0.14)',
      0.3
    );
    drawRoundedBox(
      ctx,
      seatX - 1.35,
      sy - seatW * 0.26,
      seatX - 0.55,
      sy + seatW * 0.26,
      0.3,
      'rgba(51,65,85,0.55)',
      deform
    );
  };

  drawSeat(driverY);
  if (dual) drawSeat(-driverY);
}

/**
 * Diagonal glossy sky reflection streak on windshields, roof skylights, and visors.
 */
export function drawGlassGlint(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha: number,
  deform: DeformFn
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  fillPoly(
    ctx,
    [
      [x1 + dx * 0.14, y1 + dy * 0.08],
      [x1 + dx * 0.34, y1 + dy * 0.08],
      [x1 + dx * 0.78, y1 + dy * 0.92],
      [x1 + dx * 0.56, y1 + dy * 0.92],
    ],
    `rgba(224,242,254,${alpha.toFixed(2)})`,
    deform
  );
  fillPoly(
    ctx,
    [
      [x1 + dx * 0.40, y1 + dy * 0.08],
      [x1 + dx * 0.48, y1 + dy * 0.08],
      [x1 + dx * 0.89, y1 + dy * 0.92],
      [x1 + dx * 0.81, y1 + dy * 0.92],
    ],
    `rgba(224,242,254,${(alpha * 0.52).toFixed(2)})`,
    deform
  );
}

/**
 * Integrated multi-layer automotive/commercial headlight optic.
 */
export function drawIntegratedHeadlight(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  side: -1 | 1,
  style: 'modern_led' | 'round_classic' | 'rect_commercial' | 'projector_dual',
  lit: boolean,
  highBeam: boolean,
  drlOn: boolean,
  turnInt: number,
  broken: boolean,
  deform: DeformFn
): void {
  const cx = (x1 + x2) * 0.5;
  const cy = (y1 + y2) * 0.5;
  const hw = Math.abs(y2 - y1) * 0.5;
  const hl = Math.abs(x2 - x1) * 0.5;

  if (broken) {
    drawRoundedBox(ctx, x1, y1, x2, y2, 0.55, '#111827', deform, '#020617', 0.45);
    strokePoly(
      ctx,
      [
        [x1 + 0.3, y1 + 0.3],
        [x2 - 0.3, y2 - 0.3],
      ],
      'rgba(148,163,184,0.45)',
      0.35,
      deform
    );
    return;
  }

  if (style === 'round_classic') {
    const r = Math.min(hl, hw);
    drawDeformedDot(ctx, cx, cy, r + 0.35, '#cbd5e1', deform, '#1e293b', 0.4);
    drawDeformedDot(
      ctx,
      cx,
      cy,
      r,
      lit ? (highBeam ? '#ffffff' : '#fef3c7') : '#cbd5e1',
      deform,
      '#475569',
      0.3
    );
    drawDeformedDot(
      ctx,
      cx + r * 0.15,
      cy,
      r * 0.52,
      lit ? '#ffffff' : '#f1f5f9',
      deform
    );
    return;
  }

  // Dark recessed headlamp housing
  drawRoundedBox(ctx, x1, y1, x2, y2, 0.65, '#0b1220', deform, '#334155', 0.35);

  // Inner parabolic reflector / lens
  const lensFill = lit
    ? highBeam
      ? '#ffffff'
      : '#fef3c7'
    : 'rgba(203,213,225,0.68)';
  drawRoundedBox(ctx, x1 + 0.25, y1 + 0.25, x2 - 0.18, y2 - 0.25, 0.45, lensFill, deform);

  // Projector optic dot(s)
  if (style === 'projector_dual' || style === 'modern_led') {
    drawDeformedDot(
      ctx,
      cx + hl * 0.12,
      cy - side * hw * 0.22,
      Math.min(0.75, hw * 0.34),
      lit ? '#ffffff' : '#94a3b8',
      deform,
      '#1e293b',
      0.22
    );
  }

  // Crisp DRL LED blade along outer/front edge
  if (style === 'modern_led' || style === 'projector_dual') {
    const drlColor =
      turnInt > 0.08
        ? `rgba(251,191,36,${(0.45 + 0.55 * turnInt).toFixed(2)})`
        : drlOn || lit
        ? '#e0f2fe'
        : 'rgba(148,163,184,0.45)';
    strokePoly(
      ctx,
      [
        [x2 - 0.22, y1 + 0.3],
        [x2 - 0.22, y2 - 0.3],
      ],
      drlColor,
      0.55,
      deform
    );
  }

  // Outboard corner turn indicator chamber
  const turnY1 = side < 0 ? y1 + 0.18 : y2 - Math.min(1.15, hw * 0.72);
  const turnY2 = side < 0 ? y1 + Math.min(1.15, hw * 0.72) : y2 - 0.18;
  drawRoundedBox(
    ctx,
    x1 + 0.2,
    turnY1,
    x2 - 0.35,
    turnY2,
    0.25,
    turnInt > 0.08 ? `rgba(251,191,36,${(0.55 + 0.45 * turnInt).toFixed(2)})` : '#92400e',
    deform
  );
}

/**
 * Integrated multi-chamber rear taillight (tail/brake red, turn amber, reverse white).
 */
export function drawIntegratedTaillight(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  side: -1 | 1,
  posOn: boolean,
  brakeOn: boolean,
  revOn: boolean,
  turnInt: number,
  rearFogOn: boolean,
  broken: boolean,
  deform: DeformFn
): void {
  if (broken) {
    drawRoundedBox(ctx, x1, y1, x2, y2, 0.4, '#111827', deform, '#020617', 0.4);
    return;
  }

  // Dark housing bezel
  drawRoundedBox(ctx, x1, y1, x2, y2, 0.45, '#111827', deform, '#020617', 0.35);

  const span = Math.abs(y2 - y1);
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);

  // Split into 3 chambers across Y: outer = amber turn, middle = red tail/brake, inner = white reverse/fog
  const outerW = span * 0.28;
  const innerW = span * 0.24;

  const redColor = brakeOn ? '#ff3b3b' : posOn ? '#ef4444' : '#7f1d1d';
  const ambColor = turnInt > 0.08 ? `rgba(251,191,36,${(0.5 + 0.5 * turnInt).toFixed(2)})` : '#78350f';
  const innerColor = revOn ? '#f8fafc' : rearFogOn && side < 0 ? '#ff2424' : '#94a3b8';

  if (side < 0) {
    drawRoundedBox(ctx, x1 + 0.18, yMin + 0.15, x2 - 0.18, yMin + outerW, 0.2, ambColor, deform);
    drawRoundedBox(ctx, x1 + 0.18, yMin + outerW, x2 - 0.18, yMax - innerW, 0.2, redColor, deform);
    drawRoundedBox(ctx, x1 + 0.18, yMax - innerW, x2 - 0.18, yMax - 0.15, 0.2, innerColor, deform);
  } else {
    drawRoundedBox(ctx, x1 + 0.18, yMin + 0.15, x2 - 0.18, yMin + innerW, 0.2, innerColor, deform);
    drawRoundedBox(ctx, x1 + 0.18, yMin + innerW, x2 - 0.18, yMax - outerW, 0.2, redColor, deform);
    drawRoundedBox(ctx, x1 + 0.18, yMax - outerW, x2 - 0.18, yMax - 0.15, 0.2, ambColor, deform);
  }

  // Hot LED/filament core highlight when braking
  if (brakeOn) {
    const midY = (yMin + yMax) * 0.5;
    drawDeformedDot(ctx, (x1 + x2) * 0.5, midY, Math.min(0.55, span * 0.16), '#fecaca', deform);
  }
}

/**
 * Corrugated roof / sheet-metal stamping ribs (containers, vans, stepvans).
 */
export function drawCorrugatedDeck(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  step: number,
  orientation: 'transverse' | 'longitudinal',
  deform: DeformFn,
  lightAlpha = 0.16,
  darkAlpha = 0.24
): void {
  if (orientation === 'transverse') {
    for (let rx = x1 + step; rx < x2 - step * 0.4; rx += step) {
      strokePoly(ctx, [[rx, y1], [rx, y2]], `rgba(0,0,0,${darkAlpha.toFixed(2)})`, 0.52, deform);
      strokePoly(ctx, [[rx + 0.45, y1], [rx + 0.45, y2]], `rgba(255,255,255,${lightAlpha.toFixed(2)})`, 0.36, deform);
    }
  } else {
    for (let ry = y1 + step; ry < y2 - step * 0.4; ry += step) {
      strokePoly(ctx, [[x1, ry], [x2, ry]], `rgba(0,0,0,${darkAlpha.toFixed(2)})`, 0.48, deform);
      strokePoly(ctx, [[x1, ry + 0.42], [x2, ry + 0.42]], `rgba(255,255,255,${lightAlpha.toFixed(2)})`, 0.34, deform);
    }
  }
}

/**
 * Weathered timber / oak plank decking for flatbed, dump, and lowboy trailers.
 */
export function drawWoodPlankDeck(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  plankStep: number,
  baseColor: string,
  deform: DeformFn
): void {
  const grad = ctx.createLinearGradient(0, y1, 0, y2);
  grad.addColorStop(0.0, shadePaint(baseColor, -0.18));
  grad.addColorStop(0.30, shadePaint(baseColor, 0.12));
  grad.addColorStop(0.65, baseColor);
  grad.addColorStop(1.0, shadePaint(baseColor, -0.22));
  fillPoly(ctx, [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], grad, deform);

  let idx = 0;
  for (let py = y1 + plankStep; py < y2 - 0.4; py += plankStep) {
    // Alternating subtle plank tint band
    if (idx % 2 === 0) {
      fillPoly(
        ctx,
        [[x1, py - plankStep], [x2, py - plankStep], [x2, py], [x1, py]],
        'rgba(255,255,255,0.035)',
        deform
      );
    }
    strokePoly(ctx, [[x1, py], [x2, py]], 'rgba(28,16,8,0.42)', 0.42, deform);
    strokePoly(ctx, [[x1, py + 0.32], [x2, py + 0.32]], 'rgba(255,235,205,0.08)', 0.26, deform);
    idx++;
  }
}

/**
 * Checkered anti-slip steel treadplate (lowboys, paver decks, dock bumpers, catwalks).
 */
export function drawTreadplateSurface(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  baseColor: string,
  deform: DeformFn,
  pitch = 2.4
): void {
  drawRoundedBox(ctx, x1, y1, x2, y2, 0.35, baseColor, deform, '#0f172a', 0.4);
  for (let gx = x1 + pitch * 0.5; gx < x2 - 0.5; gx += pitch) {
    for (let gy = y1 + pitch * 0.5; gy < y2 - 0.5; gy += pitch) {
      strokePoly(
        ctx,
        [[gx - 0.42, gy - 0.28], [gx + 0.42, gy + 0.28]],
        'rgba(226,232,240,0.22)',
        0.32,
        deform
      );
    }
  }
}

/**
 * Industrial hydraulic cylinder (painted barrel + chrome piston rod + pivot eyes).
 */
export function drawHydraulicCylinder(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  barrelWidth: number,
  barrelColor: string,
  deform: DeformFn
): void {
  const mx = x1 + (x2 - x1) * 0.58;
  const my = y1 + (y2 - y1) * 0.58;
  // Outer hydraulic barrel
  strokePoly(ctx, [[x1, y1], [mx, my]], '#0f172a', barrelWidth + 0.45, deform);
  strokePoly(ctx, [[x1, y1], [mx, my]], barrelColor, barrelWidth, deform);
  // Chrome piston rod
  strokePoly(ctx, [[mx, my], [x2, y2]], '#334155', barrelWidth * 0.65, deform);
  strokePoly(ctx, [[mx, my], [x2, y2]], '#e2e8f0', barrelWidth * 0.42, deform);
  // Pivot pins
  drawDeformedDot(ctx, x1, y1, barrelWidth * 0.48, '#475569', deform, '#0f172a', 0.3);
  drawDeformedDot(ctx, x2, y2, barrelWidth * 0.44, '#94a3b8', deform, '#0f172a', 0.3);
}

/**
 * Multi-pass metallic chrome pipe (exhausts, crash bars, grab rails, handlebars).
 */
export function drawChromePipe(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  width: number,
  deform: DeformFn,
  tint = '#cbd5e1'
): void {
  strokePoly(ctx, pts, '#0f172a', width + 0.55, deform);
  strokePoly(ctx, pts, tint, width, deform);
  strokePoly(ctx, pts, '#f8fafc', Math.max(0.3, width * 0.36), deform);
}

/**
 * Machined heavy steel compactor roller drum with realistic roll highlight, bevels & wear bands.
 */
export function drawSteelCompactorDrum(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diamLen: number,
  drumWidth: number,
  deform: DeformFn
): void {
  const hl = diamLen * 0.5;
  const hw = drumWidth * 0.5;
  const x1 = cx - hl;
  const x2 = cx + hl;
  const y1 = cy - hw;
  const y2 = cy + hw;

  // Longitudinal cylindrical metallic roll gradient (light reflects across drum curve along X)
  const [gx1] = deform(x1, cy);
  const [gx2] = deform(x2, cy);
  const drumGrad = ctx.createLinearGradient(gx1, 0, gx2, 0);
  drumGrad.addColorStop(0.0, '#1e293b');
  drumGrad.addColorStop(0.14, '#475569');
  drumGrad.addColorStop(0.32, '#94a3b8');
  drumGrad.addColorStop(0.46, '#e2e8f0');
  drumGrad.addColorStop(0.58, '#cbd5e1');
  drumGrad.addColorStop(0.78, '#64748b');
  drumGrad.addColorStop(0.92, '#334155');
  drumGrad.addColorStop(1.0, '#0f172a');

  drawRoundedBox(ctx, x1, y1, x2, y2, 0.8, drumGrad, deform, '#090d16', 0.6);

  // Machined chamfered end bevel rings
  for (const side of [-1, 1] as const) {
    const by1 = side < 0 ? y1 : y2 - 1.05;
    const by2 = side < 0 ? y1 + 1.05 : y2;
    drawRoundedBox(ctx, x1 + 0.25, by1, x2 - 0.25, by2, 0.3, 'rgba(15,23,42,0.45)', deform);
    strokePoly(ctx, [[x1 + 0.3, side < 0 ? y1 + 1.15 : y2 - 1.15], [x2 - 0.3, side < 0 ? y1 + 1.15 : y2 - 1.15]], 'rgba(248,250,252,0.32)', 0.32, deform);
  }

  // Subtle asphalt polishing striations across steel face
  for (let sy = y1 + 2.2; sy < y2 - 1.8; sy += 2.3) {
    strokePoly(ctx, [[x1 + 0.8, sy], [x2 - 0.8, sy]], 'rgba(15,23,42,0.12)', 0.28, deform);
  }
}

export function drawTreadedTire(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  wid: number,
  angle: number,
  style: 'road' | 'heavy' | 'agri' | 'slick' = 'road',
  rimColor = '#94a3b8'
): void {
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);

  const r = Math.min(1.15, wid * 0.36);
  const hl = len * 0.5;
  const hw = wid * 0.5;

  // Vulcanized rubber carcass
  ctx.beginPath();
  ctx.roundRect(-hl, -hw, len, wid, r);
  ctx.fillStyle = '#0d121a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.74)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Rubber crown sheen
  const crownGrad = ctx.createLinearGradient(0, -hw, 0, hw);
  crownGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
  crownGrad.addColorStop(0.32, 'rgba(148,163,184,0.18)');
  crownGrad.addColorStop(0.66, 'rgba(15,23,42,0.12)');
  crownGrad.addColorStop(1, 'rgba(0,0,0,0.36)');
  ctx.fillStyle = crownGrad;
  ctx.beginPath();
  ctx.roundRect(-hl + 0.28, -hw + 0.24, len - 0.56, wid - 0.48, r * 0.72);
  ctx.fill();

  if (style === 'agri') {
    // Deep herringbone V-cleats (Belarus / agricultural tire tread)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.05;
    for (let tx = -hl + 1.4; tx <= hl - 1.4; tx += 2.2) {
      ctx.beginPath();
      ctx.moveTo(tx - 0.9, -hw + 0.2);
      ctx.lineTo(tx + 1.0, 0);
      ctx.lineTo(tx - 0.9, hw - 0.2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(203,213,225,0.28)';
    ctx.lineWidth = 0.42;
    for (let tx = -hl + 1.65; tx <= hl - 1.3; tx += 2.2) {
      ctx.beginPath();
      ctx.moveTo(tx - 0.7, -hw + 0.28);
      ctx.lineTo(tx + 1.15, 0);
      ctx.lineTo(tx - 0.7, hw - 0.28);
      ctx.stroke();
    }
    // Lugged rim dish peek on axle center
    ctx.fillStyle = rimColor;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(2.0, hw * 0.62), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(0.8, hw * 0.26), 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'slick') {
    // Smooth pneumatic compactor rubber gloss
    ctx.strokeStyle = 'rgba(203,213,225,0.22)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-hl + 0.9, -hw * 0.26);
    ctx.lineTo(hl - 0.9, -hw * 0.26);
    ctx.stroke();
  } else {
    // Longitudinal drainage grooves + lateral sipes
    ctx.strokeStyle = 'rgba(2,6,23,0.72)';
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    ctx.moveTo(-hl + 0.8, -hw * 0.30);
    ctx.lineTo(hl - 0.8, -hw * 0.30);
    ctx.moveTo(-hl + 0.8, hw * 0.30);
    ctx.lineTo(hl - 0.8, hw * 0.30);
    ctx.stroke();

    const step = style === 'heavy' ? 1.8 : 2.05;
    ctx.strokeStyle = 'rgba(148,163,184,0.20)';
    ctx.lineWidth = 0.38;
    for (let tx = -hl + 1.15; tx <= hl - 1.15; tx += step) {
      ctx.beginPath();
      ctx.moveTo(tx, -hw + 0.35);
      ctx.lineTo(tx, hw - 0.35);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawAmberBeacon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  lit: boolean,
  deform: DeformFn,
  nowSec: number
): void {
  const [dx, dy] = deform(x, y);
  const pulse = lit ? 0.55 + 0.45 * Math.sin(nowSec * 14.5 + x * 0.3) : 0;

  // Cast shadow under beacon pedestal
  ctx.beginPath();
  ctx.arc(dx + 0.45, dy + 0.45, radius + 0.7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(2,6,23,0.38)';
  ctx.fill();

  // Black rubber mounting collar
  ctx.beginPath();
  ctx.arc(dx, dy, radius + 0.52, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Amber polycarbonate dome
  ctx.beginPath();
  ctx.arc(dx, dy, radius, 0, Math.PI * 2);
  ctx.fillStyle = lit ? '#f59e0b' : '#b45309';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 0.38;
  ctx.stroke();

  // Internal parabolic reflector + strobe core
  ctx.beginPath();
  ctx.arc(dx - radius * 0.18, dy - radius * 0.18, radius * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = lit
    ? `rgba(254, 249, 195, ${(0.58 + 0.42 * pulse).toFixed(2)})`
    : 'rgba(253, 224, 71, 0.36)';
  ctx.fill();
}

export function drawEceRedTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  deform: DeformFn
): void {
  const pts: Pt[] = [
    [x + size * 0.55, y],
    [x - size * 0.45, y - size * 0.58],
    [x - size * 0.45, y + size * 0.58],
  ];
  fillPoly(ctx, pts, '#ef4444', deform, '#7f1d1d', 0.42);
  const inner: Pt[] = [
    [x + size * 0.18, y],
    [x - size * 0.26, y - size * 0.26],
    [x - size * 0.26, y + size * 0.26],
  ];
  fillPoly(ctx, inner, '#1e293b', deform);
}

export function drawRoadTrainMarkers(
  ctx: CanvasRenderingContext2D,
  x: number,
  offsetsY: number[],
  lit: boolean,
  deform: DeformFn
): void {
  for (const my of offsetsY) {
    drawRoundedBox(ctx, x - 0.65, my - 0.52, x + 0.65, my + 0.52, 0.24, '#0f172a', deform);
    drawRoundedBox(
      ctx,
      x - 0.42,
      my - 0.34,
      x + 0.42,
      my + 0.34,
      0.15,
      lit ? '#fbbf24' : '#78350f',
      deform
    );
    if (lit) {
      drawDeformedDot(ctx, x, my, 0.22, '#fef9c3', deform);
    }
  }
}

export function drawSideMirrorArm(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  side: -1 | 1,
  outreach: number,
  housingLen: number,
  housingW: number,
  bodyColor: string,
  deform: DeformFn,
  repeaterInt = 0
): void {
  const tipX = baseX + 0.85;
  const tipY = baseY + side * outreach;
  strokePoly(
    ctx,
    [
      [baseX - 0.75, baseY],
      [tipX, tipY],
      [baseX + 1.15, baseY],
    ],
    '#0f172a',
    0.72,
    deform,
    false
  );
  drawRoundedBox(
    ctx,
    tipX - housingLen * 0.5,
    tipY - housingW * 0.5,
    tipX + housingLen * 0.5,
    tipY + housingW * 0.5,
    0.45,
    bodyColor,
    deform,
    '#0f172a',
    0.42
  );
  if (repeaterInt > 0.08) {
    strokePoly(
      ctx,
      [
        [tipX + housingLen * 0.35, tipY - housingW * 0.28],
        [tipX + housingLen * 0.35, tipY + housingW * 0.28],
      ],
      `rgba(251,191,36,${(0.55 + 0.45 * repeaterInt).toFixed(2)})`,
      0.48,
      deform
    );
  }
}

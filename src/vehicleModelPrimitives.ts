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
  const c = rr * 0.32;
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

export function createBodyMetallicGradient(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  baseColor: string
): CanvasGradient {
  const grad = ctx.createLinearGradient(0, -halfW, 0, halfW);
  grad.addColorStop(0.0, shadePaint(baseColor, -0.34));
  grad.addColorStop(0.14, shadePaint(baseColor, -0.06));
  grad.addColorStop(0.32, shadePaint(baseColor, 0.20));
  grad.addColorStop(0.50, shadePaint(baseColor, 0.06));
  grad.addColorStop(0.72, shadePaint(baseColor, -0.05));
  grad.addColorStop(0.88, shadePaint(baseColor, -0.18));
  grad.addColorStop(1.0, shadePaint(baseColor, -0.40));
  return grad;
}

export function createRoofGradient(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  roofColor: string
): CanvasGradient {
  const grad = ctx.createLinearGradient(0, -halfW, 0, halfW);
  grad.addColorStop(0.0, shadePaint(roofColor, -0.16));
  grad.addColorStop(0.28, shadePaint(roofColor, 0.22));
  grad.addColorStop(0.55, shadePaint(roofColor, 0.08));
  grad.addColorStop(1.0, shadePaint(roofColor, -0.22));
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
    grad.addColorStop(0.0, '#0c1f24');
    grad.addColorStop(0.45, '#193b42');
    grad.addColorStop(0.72, '#2d5c66');
    grad.addColorStop(1.0, '#0a171c');
  } else if (tint === 'smoke') {
    grad.addColorStop(0.0, '#090d16');
    grad.addColorStop(0.42, '#162033');
    grad.addColorStop(0.72, '#273854');
    grad.addColorStop(1.0, '#090e18');
  } else {
    grad.addColorStop(0.0, '#0c1a2e');
    grad.addColorStop(0.40, '#1c3758');
    grad.addColorStop(0.68, '#325a82');
    grad.addColorStop(1.0, '#0a1424');
  }
  return grad;
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

  const r = Math.min(1.1, wid * 0.34);
  const hl = len * 0.5;
  const hw = wid * 0.5;

  // Vulcanized rubber carcass
  ctx.beginPath();
  ctx.roundRect(-hl, -hw, len, wid, r);
  ctx.fillStyle = '#0e131b';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.68)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Rubber crown sheen
  const crownGrad = ctx.createLinearGradient(0, -hw, 0, hw);
  crownGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
  crownGrad.addColorStop(0.35, 'rgba(148,163,184,0.16)');
  crownGrad.addColorStop(0.65, 'rgba(15,23,42,0.10)');
  crownGrad.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = crownGrad;
  ctx.beginPath();
  ctx.roundRect(-hl + 0.3, -hw + 0.25, len - 0.6, wid - 0.5, r * 0.7);
  ctx.fill();

  if (style === 'agri') {
    // Deep herringbone V-cleats
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.05;
    for (let tx = -hl + 1.5; tx <= hl - 1.5; tx += 2.4) {
      ctx.beginPath();
      ctx.moveTo(tx - 0.9, -hw + 0.2);
      ctx.lineTo(tx + 1.0, 0);
      ctx.lineTo(tx - 0.9, hw - 0.2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(203,213,225,0.28)';
    ctx.lineWidth = 0.45;
    for (let tx = -hl + 1.7; tx <= hl - 1.4; tx += 2.4) {
      ctx.beginPath();
      ctx.moveTo(tx - 0.7, -hw + 0.3);
      ctx.lineTo(tx + 1.15, 0);
      ctx.lineTo(tx - 0.7, hw - 0.3);
      ctx.stroke();
    }
    // Outer hub disc visible on tractor axle edge
    ctx.fillStyle = rimColor;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(2.1, hw * 0.68), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(0.85, hw * 0.28), 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'slick') {
    // Smooth pneumatic compactor rubber gloss
    ctx.strokeStyle = 'rgba(203,213,225,0.16)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(-hl + 1.0, -hw * 0.28);
    ctx.lineTo(hl - 1.0, -hw * 0.28);
    ctx.stroke();
  } else {
    // Longitudinal drainage grooves + lateral sipes
    ctx.strokeStyle = 'rgba(2,6,23,0.68)';
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    ctx.moveTo(-hl + 0.8, -hw * 0.30);
    ctx.lineTo(hl - 0.8, -hw * 0.30);
    ctx.moveTo(-hl + 0.8, hw * 0.30);
    ctx.lineTo(hl - 0.8, hw * 0.30);
    ctx.stroke();

    const step = style === 'heavy' ? 1.85 : 2.1;
    ctx.strokeStyle = 'rgba(148,163,184,0.20)';
    ctx.lineWidth = 0.4;
    for (let tx = -hl + 1.2; tx <= hl - 1.2; tx += step) {
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

  // Black rubber mounting collar
  ctx.beginPath();
  ctx.arc(dx, dy, radius + 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Amber polycarbonate dome
  ctx.beginPath();
  ctx.arc(dx, dy, radius, 0, Math.PI * 2);
  ctx.fillStyle = lit ? '#f59e0b' : '#b45309';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 0.4;
  ctx.stroke();

  // Internal parabolic reflector + strobe core
  ctx.beginPath();
  ctx.arc(dx - radius * 0.18, dy - radius * 0.18, radius * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = lit
    ? `rgba(254, 249, 195, ${(0.55 + 0.45 * pulse).toFixed(2)})`
    : 'rgba(253, 224, 71, 0.35)';
  ctx.fill();
}

export function drawEceRedTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  deform: DeformFn
): void {
  // Equilateral ECE warning triangle pointing forward (+X) on trailer rear
  const pts: Pt[] = [
    [x + size * 0.55, y],
    [x - size * 0.45, y - size * 0.58],
    [x - size * 0.45, y + size * 0.58],
  ];
  fillPoly(ctx, pts, '#ef4444', deform, '#7f1d1d', 0.45);
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
    drawRoundedBox(ctx, x - 0.65, my - 0.55, x + 0.65, my + 0.55, 0.25, '#0f172a', deform);
    drawRoundedBox(
      ctx,
      x - 0.42,
      my - 0.36,
      x + 0.42,
      my + 0.36,
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
  deform: DeformFn
): void {
  const tipX = baseX + 0.9;
  const tipY = baseY + side * outreach;
  strokePoly(
    ctx,
    [
      [baseX - 0.8, baseY],
      [tipX, tipY],
      [baseX + 1.2, baseY],
    ],
    '#0f172a',
    0.75,
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
    0.45
  );
}

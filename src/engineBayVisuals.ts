import type { Vehicle } from './types';
import {
  EngineBayBounds,
  ResolvedEngineModifier,
  getEngineBayLayout,
  resolveEngineBlueprint,
} from './engineBlueprint';

export type DeformFn = (px: number, py: number) => [number, number];
export type DrawDeformedRectFn = (
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  fillStyle: string | CanvasGradient
) => void;
export type DrawDeformedLineFn = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeStyle: string,
  lineWidth: number,
  isDashed?: boolean
) => void;
export type DrawDeformedCircleFn = (
  cx: number,
  cy: number,
  r: number,
  color: string,
  strokeColor?: string,
  lineWidth?: number
) => void;

export interface EngineBayRenderParams {
  ctx: CanvasRenderingContext2D;
  car: Vehicle;
  halfL: number;
  halfW: number;
  fc: number;
  rc: number;
  cabinX: number;
  cabinL: number;
  cabinW: number;
  deform: DeformFn;
  drawDeformedRect: DrawDeformedRectFn;
  drawDeformedLine: DrawDeformedLineFn;
  drawDeformedCircle: DrawDeformedCircleFn;
  nightAlpha: number;
  /** Force revealing engine even when hood is closed (e.g. X-ray or supercar glass). */
  forceExpose?: boolean;
}

interface EngineSoftbodyPose {
  shiftX: number;
  shiftY: number;
  tiltAngle: number;
  vibX: number;
  vibY: number;
  vibRot: number;
  mountBrokenCount: number;
  mountHealth: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Computes rigid-body displacement & tilt of the heavy engine block directly
 * from live soft-body Node-Beam nodes (`engine`, `subframe`, `engine_mount`),
 * plus physically authentic harmonic micro-vibration when running.
 */
function computeEngineSoftbodyPose(
  car: Vehicle,
  mod: ResolvedEngineModifier,
  bay: EngineBayBounds,
  nowSec: number
): EngineSoftbodyPose {
  const nb = car.damage?.nodeBeam;
  const eng = car.engineState;
  const bayLen = Math.max(4, bay.bayX2 - bay.bayX1);
  const bayW = Math.max(4, bay.bayHalfW * 2);

  let shiftX = 0;
  let shiftY = 0;
  let tiltAngle = 0;
  let mountBrokenCount = nb?.engineMountBrokenCount ?? 0;
  let mountHealth = nb?.engineMountHealth ?? 1.0;

  if (nb && nb.nodes && nb.nodes.length > 0) {
    const tr = nb.definition?.tracking;
    const engNode =
      (tr?.engineNodeId !== undefined ? nb.nodes[tr.engineNodeId] : undefined) ||
      nb.nodes.find((n) => n.group === 'engine');
    const isRear = bay.zone === 'mid_rear' || bay.zone === 'rear';
    const subL = isRear
      ? (tr?.subframeLeftRL !== undefined ? nb.nodes[tr.subframeLeftRL] : undefined)
      : (tr?.subframeLeftFL !== undefined ? nb.nodes[tr.subframeLeftFL] : undefined);
    const subR = isRear
      ? (tr?.subframeRightRR !== undefined ? nb.nodes[tr.subframeRightRR] : undefined)
      : (tr?.subframeRightFR !== undefined ? nb.nodes[tr.subframeRightFR] : undefined);

    if (engNode) {
      const ox = Number.isFinite(engNode.offsetX) ? engNode.offsetX! : 0;
      const oy = Number.isFinite(engNode.offsetY) ? engNode.offsetY! : 0;
      shiftX = clamp(ox * 0.85, -bayLen * 0.24, bayLen * 0.24);
      shiftY = clamp(oy * 0.85, -bayW * 0.22, bayW * 0.22);
    }

    let asym = 0;
    if (subL && subR) {
      const lx = Number.isFinite(subL.offsetX) ? subL.offsetX! : 0;
      const rx = Number.isFinite(subR.offsetX) ? subR.offsetX! : 0;
      asym = (lx - rx) * 0.045;
    }
    const shearMult = 1.0 + mountBrokenCount * 0.65;
    tiltAngle = clamp((asym + shiftY * 0.035) * shearMult, -0.34, 0.34);

    if (nb.engineMountCount === undefined && nb.beams) {
      let totalM = 0;
      let brokenM = 0;
      for (const b of nb.beams) {
        if (b.partTag === 'engine_mount') {
          totalM++;
          if (b.broken) brokenM++;
        }
      }
      if (totalM > 0) {
        mountBrokenCount = brokenM;
        mountHealth = clamp(1 - brokenM / totalM, 0, 1);
      }
    }
  }

  let vibX = 0;
  let vibY = 0;
  let vibRot = 0;
  if (eng?.engineRunning && !eng.isSeized) {
    const rpm = Math.max(600, eng.engineRPM || 850);
    const freq = (rpm / 60) * 1.4;
    const knockBoost = eng.engineKnocking ? 2.4 : 1.0;
    const mountBoost = 1.0 + (1.0 - mountHealth) * 2.2;
    const amp = 0.085 * mod.spec.idleVibMult * knockBoost * mountBoost * clamp(1400 / rpm, 0.55, 1.3);
    const phase = nowSec * freq + (car.x * 0.03);
    vibX = Math.sin(phase * 1.3) * amp * 0.65;
    vibY = Math.cos(phase * 1.9) * amp;
    vibRot = Math.sin(phase * 2.1) * amp * 0.035;
  }

  return {
    shiftX,
    shiftY,
    tiltAngle,
    vibX,
    vibY,
    vibRot,
    mountBrokenCount,
    mountHealth,
  };
}

/**
 * Checks whether the vehicle's under-hood engine bay should be visually rendered
 * underneath or through the hood in the current frame.
 */
export function shouldRenderUnderHoodEngine(car: Vehicle): boolean {
  const dmg = car.damage;
  const eng = car.engineState;
  if (car.type === 'supercar') return true;
  if (dmg?.hoodDetached) return true;
  if (eng?.hoodOpen) return true;
  if (dmg?.hoodBuckled) return true;
  if ((dmg?.hoodRaisedAmount || 0) > 0.12) return true;
  return false;
}

/**
 * Returns true when the vehicle's hood panel is open or detached so archetype-specific
 * hood overlays (tractors, GAZ-53, ZIL-130, ZIL-4331, muscle stripes) must NOT paint
 * solid hood sheet metal over the exposed engine bay.
 */
export function isVehicleHoodExposed(car: Vehicle): boolean {
  return !!(car.damage?.hoodDetached || car.engineState?.hoodOpen);
}

/**
 * Helper to draw a deformed filled & optionally stroked rounded/quad polygon.
 */
function drawQuad(
  ctx: CanvasRenderingContext2D,
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number],
  fill?: string | CanvasGradient,
  stroke?: string,
  lineWidth = 0.6
): void {
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.lineTo(p4[0], p4[1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string | CanvasGradient,
  stroke?: string,
  lineWidth = 0.45
): void {
  const rr = Math.min(r, Math.abs(w) * 0.45, Math.abs(h) * 0.45);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Draws a hand-crafted two-tone turbocharger snail (cast-iron hot exhaust volute +
 * brushed aluminum cold compressor scroll + CHRA center + wastegate actuator).
 */
function drawTurboSnail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  hotGlow: number,
  mirrorY = 1
): void {
  ctx.save();
  ctx.translate(cx, cy);
  if (mirrorY < 0) ctx.scale(1, -1);

  // Hot exhaust turbine housing (oxidized cast iron, glows cherry-orange when hot)
  ctx.beginPath();
  ctx.arc(-r * 0.48, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fillStyle = hotGlow > 0.15 ? '#7c2d12' : '#451a03';
  ctx.fill();
  ctx.lineWidth = Math.max(0.28, r * 0.16);
  ctx.strokeStyle = hotGlow > 0.15 ? `rgba(251, 146, 60, ${clamp(hotGlow, 0.25, 0.95)})` : '#292524';
  ctx.stroke();

  if (hotGlow > 0.2) {
    ctx.beginPath();
    ctx.arc(-r * 0.48, 0, r * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(249, 115, 22, ${clamp(hotGlow * 0.72, 0, 0.75)})`;
    ctx.fill();
  }

  // Center CHRA oil-cooled bearing cartridge
  ctx.fillStyle = '#334155';
  ctx.fillRect(-r * 0.35, -r * 0.44, r * 0.70, r * 0.88);
  // Braided steel oil feed line fitting
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Cold brushed aluminum compressor snail volute
  ctx.beginPath();
  ctx.arc(r * 0.50, 0, r * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = '#cbd5e1';
  ctx.fill();
  ctx.lineWidth = Math.max(0.25, r * 0.14);
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  // Compressor intake inlet eye & impeller hub
  ctx.beginPath();
  ctx.arc(r * 0.54, 0, r * 0.44, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.54, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();

  // Spiral volute highlight arc
  ctx.beginPath();
  ctx.arc(r * 0.50, 0, r * 0.70, -Math.PI * 0.7, Math.PI * 0.35);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(0.2, r * 0.12);
  ctx.stroke();

  // Wastegate gold canister & actuator rod
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(r * 0.15, r * 0.96, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = Math.max(0.2, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(r * 0.0, r * 0.85);
  ctx.lineTo(-r * 0.48, r * 0.55);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the hand-detailed mechanical engine bay underneath the hood,
 * driven strictly by the real selected engine modifier, turbo kit, transmission,
 * tune, GBO, live service states, and live soft-body deformation.
 */
export function renderUnderHoodEngineBay(params: EngineBayRenderParams): void {
  const { ctx, car, halfL, halfW, fc, rc, cabinX, cabinL, cabinW, deform, forceExpose } = params;
  if (!forceExpose && !shouldRenderUnderHoodEngine(car)) return;

  const bay = getEngineBayLayout(car, halfL, halfW, fc, rc, cabinX, cabinL, cabinW);
  if (bay.zone === 'none') return;

  const bayLen = bay.bayX2 - bay.bayX1;
  const bayW = bay.bayHalfW * 2;
  if (bayLen < 3.5 || bayW < 3.5) return;

  const mod = resolveEngineBlueprint(car);
  const spec = mod.spec;
  const eng = car.engineState;
  const dmg = car.damage;
  const nowSec = performance.now() * 0.001;
  const pose = computeEngineSoftbodyPose(car, mod, bay, nowSec);

  const isRearBay = bay.zone === 'mid_rear' || bay.zone === 'rear';
  const dir = isRearBay ? -1 : 1; // +1 = nose toward +X; -1 = cooling/rear toward -X
  const bayCx = (bay.bayX1 + bay.bayX2) * 0.5;
  const bayCy = 0;

  // Helper mapping rigid engine-block local coords (ex, ey) into deformed vehicle canvas space
  const baseEngCx = bayCx - dir * bayLen * 0.05;
  const baseEngCy = 0;
  const [dBayCx, dBayCy] = deform(baseEngCx, baseEngCy);
  // Blend node-beam engine node displacement directly with bay anchor so engine moves solidly
  const engOriginX = baseEngCx + (pose.shiftX !== 0 ? pose.shiftX : (dBayCx - baseEngCx)) + pose.vibX;
  const engOriginY = baseEngCy + (pose.shiftY !== 0 ? pose.shiftY : (dBayCy - baseEngCy)) + pose.vibY;
  const engAngle = pose.tiltAngle + pose.vibRot;
  const cosE = Math.cos(engAngle);
  const sinE = Math.sin(engAngle);
  const engPt = (lx: number, ly: number): [number, number] => [
    engOriginX + lx * cosE - ly * sinE,
    engOriginY + lx * sinE + ly * cosE,
  ];

  // Thermal state for glowing exhaust headers / turbo turbine
  const temp = eng?.temperature ?? car.engineTemp ?? 85;
  const boost = eng?.turboBoost ?? 0;
  const hotGlow = clamp((temp - 102) / 38 + boost * 0.25, 0, 1);

  ctx.save();

  // =========================================================================
  // 1. RECESSED ENGINE BAY CAVITY & INNER CHASSIS STRUCTURE (Soft-Body Deformed)
  // =========================================================================
  const cFL = deform(bay.bayX2, -bay.bayHalfW);
  const cFR = deform(bay.bayX2, bay.bayHalfW);
  const cRR = deform(bay.bayX1, bay.bayHalfW);
  const cRL = deform(bay.bayX1, -bay.bayHalfW);

  // Outer bay seam bezel
  drawQuad(ctx, cFL, cFR, cRR, cRL, '#070a10', 'rgba(15, 23, 42, 0.95)', 0.9);

  // Clip interior engine bay details cleanly inside the deformed bay aperture
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cFL[0], cFL[1]);
  ctx.lineTo(cFR[0], cFR[1]);
  ctx.lineTo(cRR[0], cRR[1]);
  ctx.lineTo(cRL[0], cRL[1]);
  ctx.closePath();
  ctx.clip();

  // Deep recessed metallic bay well gradient
  const floorGrad = ctx.createRadialGradient(
    engOriginX,
    engOriginY,
    Math.min(bayLen, bayW) * 0.1,
    dBayCx,
    dBayCy,
    Math.max(bayLen, bayW) * 0.72
  );
  floorGrad.addColorStop(0, '#0f1623');
  floorGrad.addColorStop(0.65, '#0b1019');
  floorGrad.addColorStop(1, '#06090f');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(bay.bayX1 - 8, -bay.bayHalfW - 8, bayLen + 16, bayW + 16);

  // Longitudinal stamped steel frame rails inside the bay
  const railY = bay.bayHalfW * 0.62;
  for (const s of [-1, 1] as const) {
    const r1 = deform(bay.bayX1 + 0.3, s * railY);
    const r2 = deform(bay.bayX2 - 0.3, s * railY);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1.2, bayW * 0.085);
    ctx.beginPath();
    ctx.moveTo(r1[0], r1[1]);
    ctx.lineTo(r2[0], r2[1]);
    ctx.stroke();

    // Rail flange highlight
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(r1[0], r1[1]);
    ctx.lineTo(r2[0], r2[1]);
    ctx.stroke();
  }

  // Front radiator support core crossmember & cowl firewall bulkhead
  const coreX = isRearBay ? bay.bayX1 + 0.55 : bay.bayX2 - 0.55;
  const wallX = isRearBay ? bay.bayX2 - 0.55 : bay.bayX1 + 0.55;
  {
    const a = deform(coreX, -bay.bayHalfW);
    const b = deform(coreX, bay.bayHalfW);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(1.0, bayLen * 0.075);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();

    const w1 = deform(wallX, -bay.bayHalfW);
    const w2 = deform(wallX, bay.bayHalfW);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1.1, bayLen * 0.085);
    ctx.beginPath();
    ctx.moveTo(w1[0], w1[1]);
    ctx.lineTo(w2[0], w2[1]);
    ctx.stroke();
  }

  // Left & Right Strut Towers (for cars/SUVs/supercar; skipped on narrow tractor bonnets)
  const strutX = isRearBay ? bayCx - bayLen * 0.04 : bayCx - bayLen * 0.10;
  const strutY = bay.bayHalfW * 0.78;
  const strutR = clamp(Math.min(bayLen, bayW) * 0.125, 1.0, 2.3);
  if (!bay.isNarrowTractorBonnet && !bay.isCabOver) {
    for (const s of [-1, 1] as const) {
      const [sx, sy] = deform(strutX, s * strutY);
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(sx, sy, strutR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.4;
      ctx.stroke();
      // Top mount cap & 3 studs
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(sx, sy, strutR * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(sx, sy, strutR * 0.22, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI * 2 + 0.4;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(
          sx + Math.cos(ang) * strutR * 0.72,
          sy + Math.sin(ang) * strutR * 0.72,
          Math.max(0.2, strutR * 0.12),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  // =========================================================================
  // 2. LIVE FLUID SPILLS UNDER THE BLOCK (Oil Leak & Ruptured Coolant Pool)
  // =========================================================================
  if (eng?.oilPunctured || (eng && eng.engineHealth < 45)) {
    const oilR = Math.min(bayLen, bayW) * (eng?.oilPunctured ? 0.42 : 0.26);
    const oilGrad = ctx.createRadialGradient(engOriginX, engOriginY, 0.3, engOriginX, engOriginY, oilR);
    oilGrad.addColorStop(0, 'rgba(9, 10, 14, 0.92)');
    oilGrad.addColorStop(0.65, 'rgba(24, 24, 27, 0.75)');
    oilGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = oilGrad;
    ctx.beginPath();
    ctx.ellipse(engOriginX - dir * 0.6, engOriginY + 0.5, oilR, oilR * 0.78, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (eng?.radiatorPunctured) {
    const radLeakX = isRearBay ? bay.bayX1 + bayLen * 0.16 : bay.bayX2 - bayLen * 0.16;
    const [rlx, rly] = deform(radLeakX, 0.4);
    const coolR = Math.min(bayLen, bayW) * 0.34;
    const coolGrad = ctx.createRadialGradient(rlx, rly, 0.2, rlx, rly, coolR);
    coolGrad.addColorStop(0, 'rgba(34, 197, 94, 0.62)');
    coolGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.32)');
    coolGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = coolGrad;
    ctx.beginPath();
    ctx.ellipse(rlx, rly, coolR * 0.75, coolR * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 3. SOFT-BODY ENGINE MOUNT BRACKETS (Visibly Bridging Subframe -> Engine)
  // =========================================================================
  {
    const mountYs = [-railY, railY];
    for (let mi = 0; mi < mountYs.length; mi++) {
      const sy = mountYs[mi];
      const [subX, subY] = deform(baseEngCx, sy);
      const [blkX, blkY] = engPt(0, Math.sign(sy) * Math.min(bay.bayHalfW * 0.42, 3.2));
      const torn = pose.mountBrokenCount >= mi + 1;
      ctx.strokeStyle = torn ? '#7f1d1d' : '#475569';
      ctx.lineWidth = Math.max(0.85, bayW * 0.055);
      if (torn) ctx.setLineDash([0.8, 0.8]);
      ctx.beginPath();
      ctx.moveTo(subX, subY);
      ctx.lineTo(blkX, blkY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Rubber isolator puck
      const mx = (subX + blkX) * 0.5;
      const my = (subY + blkY) * 0.5;
      ctx.fillStyle = torn ? '#dc2626' : '#0f172a';
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(0.55, bayW * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // 4. RADIATOR, INTERCOOLER (FMIC), COOLING FAN & RADIATOR CAP
  // =========================================================================
  const hasFmic = (mod.turboKind === 'single' || mod.turboKind === 'twin') && !spec.hasTopMountIntercooler;
  const radThick = clamp(bayLen * 0.105, 0.9, 2.2);
  const radW = bay.bayHalfW * (bay.isNarrowTractorBonnet ? 1.55 : 1.38);
  const radX = isRearBay
    ? bay.bayX1 + radThick * 1.05
    : bay.bayX2 - radThick * 1.15 - (hasFmic ? radThick * 0.72 : 0);

  // Front-Mount Intercooler (FMIC) ahead of radiator when turbo kit is fitted
  if (hasFmic && !isRearBay) {
    const icX = bay.bayX2 - radThick * 0.65;
    const icW = radW * 0.92;
    const ic1 = deform(icX - radThick * 0.34, -icW * 0.5);
    const ic2 = deform(icX + radThick * 0.34, -icW * 0.5);
    const ic3 = deform(icX + radThick * 0.34, icW * 0.5);
    const ic4 = deform(icX - radThick * 0.34, icW * 0.5);
    drawQuad(ctx, ic1, ic2, ic3, ic4, '#cbd5e1', '#475569', 0.4);
    // Cast end-tanks on left & right of FMIC
    for (const s of [-1, 1] as const) {
      const [tx, ty] = deform(icX, s * icW * 0.48);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(0.45, radThick * 0.36), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Radiator core housing
  {
    const r1 = deform(radX - radThick * 0.5, -radW * 0.5);
    const r2 = deform(radX + radThick * 0.5, -radW * 0.5);
    const r3 = deform(radX + radThick * 0.5, radW * 0.5);
    const r4 = deform(radX - radThick * 0.5, radW * 0.5);
    const radTopCol = spec.isHeavyTruck || spec.fuelLayout === 'carb_round' ? '#3f3f46' : '#64748b';
    drawQuad(
      ctx,
      r1,
      r2,
      r3,
      r4,
      eng?.radiatorPunctured ? '#3f2e2b' : radTopCol,
      '#0f172a',
      0.5
    );

    // Fin louvers along radiator core
    ctx.strokeStyle = eng?.radiatorPunctured ? 'rgba(34,197,94,0.45)' : 'rgba(203,213,225,0.34)';
    ctx.lineWidth = 0.3;
    const finCount = 7;
    for (let f = 1; f < finCount; f++) {
      const fy = -radW * 0.45 + (f / finCount) * radW * 0.9;
      const fa = deform(radX - radThick * 0.35, fy);
      const fb = deform(radX + radThick * 0.35, fy);
      ctx.beginPath();
      ctx.moveTo(fa[0], fa[1]);
      ctx.lineTo(fb[0], fb[1]);
      ctx.stroke();
    }

    // Radiator pressure cap (open black filler neck if radiatorCapOpen!)
    const [capX, capY] = deform(radX, radW * 0.28);
    const capR = clamp(radThick * 0.48, 0.45, 0.95);
    if (eng?.radiatorCapOpen) {
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(capX, capY, capR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.35;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(capX, capY, capR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.32;
      ctx.stroke();
    }

    // Cooling fan shroud & animated spinning blades right behind radiator
    const fanX = radX - dir * (radThick * 0.95);
    const [fx, fy] = deform(fanX, 0);
    const fanR = clamp(Math.min(radW * 0.24, bayLen * 0.14), 0.95, 2.5);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, fanR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.4;
    ctx.stroke();

    const fanSpin = eng?.engineRunning && !eng.isSeized
      ? nowSec * (12 + (eng.engineRPM || 800) * 0.008)
      : 0.4;
    const blades = spec.isHeavyTruck ? 6 : 5;
    ctx.rotate(fanSpin);
    if (eng?.engineRunning && !eng.isSeized) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, fanR * 0.84, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = spec.isHeavyTruck ? '#eab308' : '#64748b';
    ctx.lineWidth = Math.max(0.35, fanR * 0.24);
    for (let bi = 0; bi < blades; bi++) {
      const a = (bi / blades) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * fanR * 0.82, Math.sin(a) * fanR * 0.82);
      ctx.stroke();
    }
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, fanR * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // 5. AUXILIARIES: 12V BATTERY, BRAKE BOOSTER, EXPANSION & WASHER TANKS, ECU
  // =========================================================================
  if (!bay.isNarrowTractorBonnet && !bay.isCabOver) {
    // 5A. 12V Battery (front-left corner; respects batteryInstalled, batteryPosConnected, batteryNegConnected!)
    const batX = isRearBay ? bay.bayX2 - bayLen * 0.22 : bay.bayX2 - bayLen * 0.26;
    const batY = -bay.bayHalfW * 0.64;
    const batL = clamp(bayLen * 0.22, 1.8, 4.0);
    const batW = clamp(bayW * 0.18, 1.4, 3.0);
    const [bx, by] = deform(batX, batY);

    ctx.save();
    ctx.translate(bx, by);
    if (eng && eng.batteryInstalled === false) {
      // Empty stamped steel battery tray + dangling red/black cable clamps
      drawRoundedBox(ctx, -batL * 0.5, -batW * 0.5, batL, batW, 0.35, '#18181b', '#475569', 0.45);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-batL * 0.4, -batW * 0.35);
      ctx.lineTo(batL * 0.4, batW * 0.35);
      ctx.stroke();
      // Loose red & black clamps
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-batL * 0.55, -batW * 0.2, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(-batL * 0.55, batW * 0.25, 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Installed 12V Battery
      drawRoundedBox(ctx, -batL * 0.5, -batW * 0.5, batL, batW, 0.35, '#111827', '#475569', 0.45);
      // Top cell cap strip
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(-batL * 0.34, -batW * 0.18, batL * 0.68, batW * 0.36);
      // Red + terminal & black - terminal
      const posConnected = eng?.batteryPosConnected !== false;
      const negConnected = eng?.batteryNegConnected !== false;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(batL * 0.26, -batW * 0.26, Math.max(0.28, batW * 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(batL * 0.26, batW * 0.26, Math.max(0.28, batW * 0.15), 0, Math.PI * 2);
      ctx.fill();
      // Positive red wire
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(posConnected ? batL * 0.26 : batL * 0.62, -batW * 0.26);
      ctx.lineTo(-batL * 0.55, -batW * 0.12);
      ctx.stroke();
      // Negative black ground strap
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(negConnected ? batL * 0.26 : batL * 0.62, batW * 0.26);
      ctx.lineTo(batL * 0.1, batW * 0.65);
      ctx.stroke();
    }
    ctx.restore();

    // 5B. Coolant expansion tank (rear-right) + Blue washer tank (front-right)
    const expX = isRearBay ? bay.bayX2 - bayLen * 0.20 : bay.bayX1 + bayLen * 0.22;
    const expY = bay.bayHalfW * 0.64;
    const [exx, exy] = deform(expX, expY);
    const tankR = clamp(Math.min(bayLen, bayW) * 0.10, 0.75, 1.75);
    const coolFrac = clamp((eng?.radiatorWater ?? 100) / 100, 0, 1);
    ctx.fillStyle = coolFrac > 0.2 ? 'rgba(52, 211, 153, 0.72)' : '#334155';
    ctx.beginPath();
    ctx.arc(exx, exy, tankR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.35;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(exx, exy, tankR * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Washer fluid tank (translucent blue)
    const washX = isRearBay ? bay.bayX1 + bayLen * 0.28 : bay.bayX2 - bayLen * 0.26;
    const washY = bay.bayHalfW * 0.66;
    const [wx, wy] = deform(washX, washY);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.62)';
    ctx.beginPath();
    ctx.arc(wx, wy, tankR * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.32;
    ctx.stroke();

    // 5C. Brake booster drum & master cylinder on firewall (driver left side)
    if (!isRearBay) {
      const [bbx, bby] = deform(bay.bayX1 + bayLen * 0.15, -bay.bayHalfW * 0.56);
      const bbR = clamp(Math.min(bayLen, bayW) * 0.105, 0.8, 1.85);
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(bbx, bby, bbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      // Master cylinder & translucent white brake reservoir
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(bbx + bbR * 0.35, bby - bbR * 0.36, bbR * 0.95, bbR * 0.72);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bbx + bbR * 0.85, bby, bbR * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5D. ECU / Relay box & wiring loom harness
    const [ecux, ecuy] = deform(
      isRearBay ? bay.bayX2 - bayLen * 0.22 : bay.bayX1 + bayLen * 0.18,
      -bay.bayHalfW * 0.22
    );
    drawRoundedBox(ctx, ecux - 1.0, ecuy - 0.8, 2.0, 1.6, 0.25, '#1e293b', '#64748b', 0.32);
  }

  // =========================================================================
  // 6. FLEXIBLE COOLANT HOSES & INTERCOOLER PIPING (Deformed Chassis <-> Rigid Engine)
  // =========================================================================
  const blkLen = clamp(bayLen * spec.sizeL, 3.2, bayLen * 0.68);
  const blkW = clamp(bayW * spec.sizeW, 2.6, bayW * 0.64);

  {
    // Upper & lower radiator coolant hoses
    const radOut1 = deform(radX - dir * radThick * 0.4, -radW * 0.24);
    const radOut2 = deform(radX - dir * radThick * 0.4, radW * 0.26);
    const engIn1 = engPt(dir * blkLen * 0.42, -blkW * 0.22);
    const engIn2 = engPt(dir * blkLen * 0.42, blkW * 0.22);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(0.75, Math.min(bayLen, bayW) * 0.065);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(radOut1[0], radOut1[1]);
    ctx.quadraticCurveTo(
      (radOut1[0] + engIn1[0]) * 0.5,
      Math.min(radOut1[1], engIn1[1]) - 0.8,
      engIn1[0],
      engIn1[1]
    );
    ctx.stroke();

    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(radOut2[0], radOut2[1]);
    ctx.quadraticCurveTo(
      (radOut2[0] + engIn2[0]) * 0.5,
      Math.max(radOut2[1], engIn2[1]) + 0.8,
      engIn2[0],
      engIn2[1]
    );
    ctx.stroke();

    // Aluminum FMIC Intercooler Charge Pipes + Colored Silicone Couplers (if turbo kit!)
    if (hasFmic && !isRearBay) {
      const couplerCol = mod.isAftermarketTurbo || mod.tuneChipLevel >= 2 ? '#ef4444' : '#2563eb';
      const icL = deform(bay.bayX2 - radThick * 0.65, -radW * 0.44);
      const icR = deform(bay.bayX2 - radThick * 0.65, radW * 0.44);
      const tbL = engPt(dir * blkLen * 0.22, -blkW * 0.44);
      const tbR = engPt(dir * blkLen * 0.22, blkW * 0.44);

      for (const [pA, pB, bend] of [
        [icL, tbL, -1.0],
        [icR, tbR, 1.0],
      ] as [[number, number], [number, number], number][]) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(0.65, Math.min(bayLen, bayW) * 0.055);
        ctx.beginPath();
        ctx.moveTo(pA[0], pA[1]);
        ctx.quadraticCurveTo((pA[0] + pB[0]) * 0.5, (pA[1] + pB[1]) * 0.5 + bend * 0.9, pB[0], pB[1]);
        ctx.stroke();

        // Silicone coupler sleeves near each end
        ctx.strokeStyle = couplerCol;
        ctx.lineWidth = Math.max(0.85, Math.min(bayLen, bayW) * 0.072);
        const c1x = pA[0] + (pB[0] - pA[0]) * 0.18;
        const c1y = pA[1] + (pB[1] - pA[1]) * 0.18;
        const c2x = pA[0] + (pB[0] - pA[0]) * 0.82;
        const c2y = pA[1] + (pB[1] - pA[1]) * 0.82;
        ctx.beginPath();
        ctx.moveTo(pA[0] + (pB[0] - pA[0]) * 0.08, pA[1] + (pB[1] - pA[1]) * 0.08);
        ctx.lineTo(c1x, c1y);
        ctx.moveTo(c2x, c2y);
        ctx.lineTo(pA[0] + (pB[0] - pA[0]) * 0.92, pA[1] + (pB[1] - pA[1]) * 0.92);
        ctx.stroke();
      }
    }
  }

  // =========================================================================
  // 7. AIRBOX OR CONE COLD-AIR FILTER (Outside Rigid Engine Block)
  // =========================================================================
  if (spec.fuelLayout !== 'carb_round' && !spec.hasOilBathFilter && !bay.isNarrowTractorBonnet) {
    const airX = isRearBay ? bay.bayX1 + bayLen * 0.30 : bay.bayX2 - bayLen * 0.34;
    const airY = bay.bayHalfW * 0.62;
    const [ax, ay] = deform(airX, airY);
    const [inX, inY] = engPt(0, blkW * 0.36);

    // Corrugated intake duct to engine
    ctx.strokeStyle = mod.hasSportIntake ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = Math.max(0.75, Math.min(bayLen, bayW) * 0.07);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(inX, inY);
    ctx.stroke();

    if (mod.hasSportIntake) {
      // Conical pleated sport cold-air intake filter (crimson/red)
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(isRearBay ? Math.PI : 0);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-1.1, -0.75);
      ctx.lineTo(1.2, -0.5);
      ctx.lineTo(1.2, 0.5);
      ctx.lineTo(-1.1, 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 0.3;
      ctx.stroke();
      // Chrome cone endcap
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(1.05, -0.46, 0.32, 0.92);
      ctx.restore();
    } else {
      // OEM rectangular ribbed air filter box
      const abL = clamp(bayLen * 0.22, 1.6, 3.6);
      const abW = clamp(bayW * 0.18, 1.3, 2.8);
      drawRoundedBox(ctx, ax - abL * 0.5, ay - abW * 0.5, abL, abW, 0.35, '#18181b', '#475569', 0.4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(ax - abL * 0.32, ay - abW * 0.32);
      ctx.lineTo(ax + abL * 0.32, ay - abW * 0.32);
      ctx.moveTo(ax - abL * 0.32, ay + abW * 0.32);
      ctx.lineTo(ax + abL * 0.32, ay + abW * 0.32);
      ctx.stroke();
    }
  }

  // =========================================================================
  // 8. RIGID ENGINE BLOCK, HEADS, GEARBOX, INDUCTION & BELT DRIVE
  // =========================================================================
  ctx.save();
  ctx.translate(engOriginX, engOriginY);
  ctx.rotate(engAngle);
  // Orient engine local +X toward cooling/front of bay
  if (isRearBay) ctx.scale(-1, 1);

  const isTransverse = mod.orientation === 'transverse' && spec.architecture === 'inline';

  // --- 8A. TRANSMISSION / GEARBOX BELLHOUSING ---
  {
    const isAuto = mod.transmissionKind === 'AT' || mod.transmissionKind === 'DSG' || mod.transmissionKind === 'CVT';
    const isHeavyTrans = mod.transmissionKind === 'RANGE' || spec.isHeavyTruck;
    const transCol = isHeavyTrans ? '#475569' : '#94a3b8';
    const transEdge = '#1e293b';

    if (isTransverse) {
      // Transverse transaxle bolted to the left (-Y) side of the inline block
      const txL = blkLen * 0.74;
      const txW = blkW * (isAuto ? 0.42 : 0.34);
      drawRoundedBox(ctx, -txL * 0.52, -blkW * 0.52 - txW * 0.65, txL, txW, 0.45, transCol, transEdge, 0.45);
      // Cast cooling ribs on transaxle
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 0.3;
      for (let r = -txL * 0.32; r <= txL * 0.32; r += txL * 0.22) {
        ctx.beginPath();
        ctx.moveTo(r, -blkW * 0.52 - txW * 0.55);
        ctx.lineTo(r, -blkW * 0.52 + txW * 0.25);
        ctx.stroke();
      }
    } else {
      // Longitudinal gearbox bellhousing bolted to the rear (-X) of the block
      const gbL = blkLen * (isAuto ? 0.44 : 0.36);
      const gbW = blkW * (isAuto ? 0.58 : 0.48);
      drawRoundedBox(ctx, -blkLen * 0.5 - gbL * 0.72, -gbW * 0.5, gbL, gbW, 0.45, transCol, transEdge, 0.45);
      // Bellhousing reinforcement ribs
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.42)';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(-blkLen * 0.5 - gbL * 0.6, -gbW * 0.24);
      ctx.lineTo(-blkLen * 0.5 + gbL * 0.1, -gbW * 0.24);
      ctx.moveTo(-blkLen * 0.5 - gbL * 0.6, gbW * 0.24);
      ctx.lineTo(-blkLen * 0.5 + gbL * 0.1, gbW * 0.24);
      ctx.stroke();
    }
  }

  // --- 8B. ENGINE BLOCK LOWER CRANKCASE CASTING ---
  drawRoundedBox(
    ctx,
    -blkLen * 0.52,
    -blkW * 0.52,
    blkLen * 1.04,
    blkW * 1.04,
    0.55,
    spec.blockColor,
    '#0f172a',
    0.55
  );

  // --- 8C. FRONT ACCESSORY DRIVE: SERPENTINE BELT, CRANK PULLEY & ALTERNATOR ---
  {
    const beltX = isTransverse ? 0 : blkLen * 0.53;
    const beltY = isTransverse ? blkW * 0.52 : 0;
    const pulleyR = clamp(Math.min(blkLen, blkW) * 0.13, 0.42, 0.95);
    const beltPhase = eng?.engineRunning && !eng.isSeized ? (nowSec * 18) % 2 : 0;

    if (isTransverse) {
      // Belt running on right (+Y) end of transverse block
      ctx.strokeStyle = '#090d14';
      ctx.lineWidth = Math.max(0.55, pulleyR * 0.75);
      ctx.beginPath();
      ctx.moveTo(-blkLen * 0.34, beltY);
      ctx.lineTo(blkLen * 0.34, beltY);
      ctx.stroke();
      // Animated belt ribs
      ctx.strokeStyle = 'rgba(148,163,184,0.45)';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([0.5, 0.7]);
      ctx.lineDashOffset = -beltPhase;
      ctx.beginPath();
      ctx.moveTo(-blkLen * 0.34, beltY);
      ctx.lineTo(blkLen * 0.34, beltY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Alternator housing (vented aluminum + copper stator hint)
      drawRoundedBox(ctx, blkLen * 0.16, beltY - pulleyR * 1.25, pulleyR * 2.1, pulleyR * 1.9, 0.3, '#cbd5e1', '#334155', 0.35);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(blkLen * 0.24, beltY - pulleyR * 0.75, pulleyR * 0.75, pulleyR * 0.85);
    } else {
      // Belt running across front (+X) nose of longitudinal block
      ctx.strokeStyle = '#090d14';
      ctx.lineWidth = Math.max(0.55, pulleyR * 0.8);
      ctx.beginPath();
      ctx.moveTo(beltX, -blkW * 0.42);
      ctx.lineTo(beltX, blkW * 0.42);
      ctx.stroke();
      // Animated belt ribs
      ctx.strokeStyle = 'rgba(148,163,184,0.45)';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([0.5, 0.7]);
      ctx.lineDashOffset = -beltPhase;
      ctx.beginPath();
      ctx.moveTo(beltX, -blkW * 0.42);
      ctx.lineTo(beltX, blkW * 0.42);
      ctx.stroke();
      ctx.setLineDash([]);
      // Crank & water-pump pulleys
      ctx.fillStyle = '#334155';
      ctx.fillRect(beltX - pulleyR * 0.4, -pulleyR * 0.8, pulleyR * 0.8, pulleyR * 1.6);
      // Alternator on front-right (+Y)
      drawRoundedBox(ctx, beltX - pulleyR * 1.7, blkW * 0.22, pulleyR * 1.9, pulleyR * 1.75, 0.3, '#cbd5e1', '#334155', 0.35);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(beltX - pulleyR * 1.2, blkW * 0.30, pulleyR * 0.8, pulleyR * 0.85);
    }
  }

  // --- 8D. CYLINDER ARCHITECTURE-SPECIFIC HEADS, MANIFOLDS & VALVE COVERS ---
  if (spec.architecture === 'v') {
    // =====================================================================
    // V6 (3+3) / V8 (4+4) / V10 (5+5) TWIN-BANK ENGINE
    // =====================================================================
    const perBank = Math.max(2, Math.round(spec.cylinders / 2));
    const bankL = blkLen * 0.90;
    const bankW = blkW * 0.34;
    const bankOffsetY = blkW * 0.34;

    // Outer multi-runner exhaust manifolds on BOTH flanks (with thermal heat glow!)
    const exhCol = hotGlow > 0.18
      ? `rgba(${Math.round(145 + hotGlow * 105)}, ${Math.round(62 + hotGlow * 55)}, 24, 0.95)`
      : (spec.isExotic ? '#a8a29e' : '#57534e');
    for (const s of [-1, 1] as const) {
      const manY = s * (blkW * 0.56);
      ctx.strokeStyle = exhCol;
      ctx.lineWidth = Math.max(0.55, blkW * 0.06);
      ctx.beginPath();
      ctx.moveTo(-bankL * 0.42, manY);
      ctx.lineTo(bankL * 0.42, manY);
      ctx.stroke();
      // Individual exhaust primary ports per cylinder
      ctx.lineWidth = Math.max(0.4, blkW * 0.045);
      for (let c = 0; c < perBank; c++) {
        const cx = -bankL * 0.38 + (c / Math.max(1, perBank - 1)) * bankL * 0.76;
        ctx.beginPath();
        ctx.moveTo(cx, s * (bankOffsetY + bankW * 0.4));
        ctx.lineTo(cx, manY);
        ctx.stroke();
      }
    }

    // Left & Right Cylinder Banks / Valve Covers
    for (const s of [-1, 1] as const) {
      const cy = s * bankOffsetY;
      drawRoundedBox(
        ctx,
        -bankL * 0.5,
        cy - bankW * 0.5,
        bankL,
        bankW,
        0.4,
        spec.valveCoverColor,
        '#0f172a',
        0.45
      );

      // Individual cylinder heads (for heavy KAMAZ/YaMZ diesels) or coil packs / machined ribs
      for (let c = 0; c < perBank; c++) {
        const cx = -bankL * 0.37 + (c / Math.max(1, perBank - 1)) * bankL * 0.74;
        if (spec.fuelLayout === 'heavy_v_diesel') {
          // Individual cast-iron diesel head covers per cylinder
          const capL = (bankL * 0.84) / perBank;
          drawRoundedBox(
            ctx,
            cx - capL * 0.42,
            cy - bankW * 0.38,
            capL * 0.84,
            bankW * 0.76,
            0.22,
            spec.valveCoverColor,
            '#0f172a',
            0.32
          );
          // Central injector nozzle boss
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(0.22, bankW * 0.14), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Coil-on-plug pack or spark plug wire boot
          ctx.fillStyle = mod.tuneChipLevel >= 1 || spec.isExotic ? '#ef4444' : spec.valveCoverAccent;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(0.22, bankW * 0.17), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Machined longitudinal highlight stripe on each valve cover
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(-bankL * 0.42, cy - bankW * 0.28);
      ctx.lineTo(bankL * 0.42, cy - bankW * 0.28);
      ctx.stroke();
    }

    // Central V-Valley Hardware (Modifier-Specific!)
    const valleyW = blkW * 0.36;
    if (mod.turboKind === 'supercharger') {
      // MASSIVE RIBBED ROOTS / TWIN-SCREW SUPERCHARGER BLOWER IN V-VALLEY
      const scL = blkLen * 0.78;
      const scW = blkW * 0.44;
      drawRoundedBox(ctx, -scL * 0.52, -scW * 0.5, scL, scW, 0.45, '#cbd5e1', '#1e293b', 0.48);
      // CNC longitudinal cooling ribs along supercharger casing
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.32;
      for (let ry = -scW * 0.32; ry <= scW * 0.32; ry += scW * 0.16) {
        ctx.beginPath();
        ctx.moveTo(-scL * 0.44, ry);
        ctx.lineTo(scL * 0.40, ry);
        ctx.stroke();
      }
      // Forward blower drive snout + billet pulley
      drawRoundedBox(ctx, scL * 0.32, -scW * 0.22, blkLen * 0.24, scW * 0.44, 0.25, '#94a3b8', '#1e293b', 0.38);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(blkLen * 0.50, -scW * 0.26, 0.55, scW * 0.52);
      // Supercharger top badge strip
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-scL * 0.22, -scW * 0.10, scL * 0.44, scW * 0.20);
    } else if (spec.hasCenterTnvd) {
      // HEAVY V6/V8 DIESEL (YaMZ-236 / YaMZ-238 / KAMAZ-740):
      // Inline 6/8-plunger mechanical ТНВД injection pump in V-valley + fanned stainless injector pipes!
      const pL = blkLen * 0.62;
      const pW = valleyW * 0.72;
      drawRoundedBox(ctx, -pL * 0.5, -pW * 0.5, pL, pW, 0.25, '#94a3b8', '#0f172a', 0.4);
      // Plunger governor housing at rear
      drawRoundedBox(ctx, -pL * 0.55, -pW * 0.58, pL * 0.26, pW * 1.16, 0.25, '#475569', '#0f172a', 0.35);
      // Gleaming stainless steel high-pressure fuel pipes fanning out to EVERY cylinder!
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.28;
      for (let c = 0; c < perBank; c++) {
        const cx = -bankL * 0.37 + (c / Math.max(1, perBank - 1)) * bankL * 0.74;
        const px = -pL * 0.25 + (c / Math.max(1, perBank - 1)) * pL * 0.65;
        for (const s of [-1, 1] as const) {
          ctx.beginPath();
          ctx.moveTo(px, s * pW * 0.35);
          ctx.quadraticCurveTo((px + cx) * 0.5, s * bankOffsetY * 0.55, cx, s * bankOffsetY);
          ctx.stroke();
        }
      }
      // Centrifugal oil filter dome on front valley
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(blkLen * 0.36, 0, Math.max(0.55, pW * 0.52), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.3;
      ctx.stroke();
    } else if (spec.hasOilBathFilter || spec.fuelLayout === 'carb_round') {
      // SOVIET / CLASSIC V8 (ZMZ-53 GAZ-53 / ZIL-130):
      // Cast V-intake + big round pancake / oil-bath air cleaner canister + chrome wingnut!
      drawRoundedBox(ctx, -blkLen * 0.38, -valleyW * 0.5, blkLen * 0.76, valleyW, 0.35, '#94a3b8', '#334155', 0.35);
      const filtR = clamp(Math.min(blkLen, blkW) * 0.34, 1.3, 3.0);
      ctx.fillStyle = spec.intakeColor;
      ctx.beginPath();
      ctx.arc(0, 0, filtR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.45;
      ctx.stroke();
      // Air snorkel tube
      ctx.fillStyle = spec.intakeColor;
      ctx.fillRect(filtR * 0.55, -filtR * 0.24, filtR * 0.78, filtR * 0.48);
      // Inner embossed ring & chrome wingnut
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, filtR * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.28, filtR * 0.18), 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.hasTwinPlenum) {
      // EXOTIC V10 FSI / V6 BITURBO: Twin magnesium/carbon intake plenums + individual crossover runners!
      for (const s of [-1, 1] as const) {
        drawRoundedBox(
          ctx,
          -bankL * 0.42,
          s * valleyW * 0.32 - valleyW * 0.26,
          bankL * 0.84,
          valleyW * 0.52,
          0.3,
          spec.intakeColor,
          '#94a3b8',
          0.35
        );
      }
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.32;
      for (let c = 0; c < perBank; c++) {
        const cx = -bankL * 0.36 + (c / Math.max(1, perBank - 1)) * bankL * 0.72;
        ctx.beginPath();
        ctx.moveTo(cx, -valleyW * 0.55);
        ctx.lineTo(cx, valleyW * 0.55);
        ctx.stroke();
      }
    } else {
      // MODERN V6 / V8 NA: Sculpted ribbed central aluminum intake plenum
      drawRoundedBox(ctx, -bankL * 0.42, -valleyW * 0.48, bankL * 0.84, valleyW * 0.96, 0.38, spec.intakeColor, '#1e293b', 0.38);
      ctx.strokeStyle = 'rgba(226,232,240,0.42)';
      ctx.lineWidth = 0.3;
      for (let c = 0; c < perBank; c++) {
        const cx = -bankL * 0.34 + (c / Math.max(1, perBank - 1)) * bankL * 0.68;
        ctx.beginPath();
        ctx.moveTo(cx, -valleyW * 0.42);
        ctx.lineTo(cx, valleyW * 0.42);
        ctx.stroke();
      }
    }
  } else if (spec.architecture === 'boxer') {
    // =====================================================================
    // HORIZONTALLY OPPOSED BOXER 4 (EJ25 TURBO) + TOP-MOUNT INTERCOOLER
    // =====================================================================
    const headL = blkLen * 0.72;
    const headW = blkW * 0.24;
    // Left & right opposing cam covers on extreme outer edges
    for (const s of [-1, 1] as const) {
      drawRoundedBox(ctx, -headL * 0.5, s * blkW * 0.40 - headW * 0.5, headL, headW, 0.32, '#94a3b8', '#0f172a', 0.4);
    }
    // Red STI cast intake spider manifold in center
    drawRoundedBox(ctx, -blkLen * 0.34, -blkW * 0.24, blkLen * 0.68, blkW * 0.48, 0.35, spec.intakeColor, '#7f1d1d', 0.4);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 0.45;
    for (const sx of [-blkLen * 0.18, blkLen * 0.18]) {
      ctx.beginPath();
      ctx.moveTo(sx, -blkW * 0.38);
      ctx.lineTo(sx, blkW * 0.38);
      ctx.stroke();
    }
    // Angled Top-Mount Intercooler (TMIC) sitting cleanly across rear half of boxer block
    if (spec.hasTopMountIntercooler) {
      const tmL = blkLen * 0.46;
      const tmW = blkW * 0.72;
      drawRoundedBox(ctx, -blkLen * 0.48, -tmW * 0.5, tmL, tmW, 0.35, '#cbd5e1', '#334155', 0.45);
      // Intercooler bar-and-plate fins
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.25;
      for (let fy = -tmW * 0.38; fy <= tmW * 0.38; fy += tmW * 0.16) {
        ctx.beginPath();
        ctx.moveTo(-blkLen * 0.44, fy);
        ctx.lineTo(-blkLen * 0.06, fy);
        ctx.stroke();
      }
      // Red silicone Y-pipe coupler
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-blkLen * 0.04, -tmW * 0.14, blkLen * 0.12, tmW * 0.28);
    }
  } else {
    // =====================================================================
    // INLINE ENGINES: R3 / R4 / I5 / I6 (Transverse OR Longitudinal)
    // =====================================================================
    const cyls = spec.cylinders;
    ctx.save();
    // If transverse, rotate head layout 90 deg so cylinders line up across Y-axis!
    if (isTransverse) ctx.rotate(Math.PI * 0.5);
    const headLen = isTransverse ? blkW * 0.90 : blkLen * 0.90;
    const headW = isTransverse ? blkLen * 0.52 : blkW * 0.52;

    // Exhaust manifold runners on one side (+Y in head-local coords -> front on transverse, right on longitudinal)
    const exhY = headW * 0.72;
    const exhCol = hotGlow > 0.18
      ? `rgba(${Math.round(145 + hotGlow * 105)}, ${Math.round(62 + hotGlow * 55)}, 24, 0.95)`
      : '#57534e';
    ctx.strokeStyle = exhCol;
    ctx.lineWidth = Math.max(0.5, headW * 0.14);
    ctx.beginPath();
    ctx.moveTo(-headLen * 0.40, exhY);
    ctx.lineTo(headLen * 0.40, exhY);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.36, headW * 0.10);
    for (let c = 0; c < cyls; c++) {
      const cx = cyls === 1 ? 0 : -headLen * 0.38 + (c / (cyls - 1)) * headLen * 0.76;
      ctx.beginPath();
      ctx.moveTo(cx, headW * 0.44);
      ctx.lineTo(cx, exhY);
      ctx.stroke();
    }

    // Intake manifold on opposite side (-Y in head-local coords)
    const intY = -headW * 0.72;
    drawRoundedBox(
      ctx,
      -headLen * 0.42,
      intY - headW * 0.22,
      headLen * 0.84,
      headW * 0.44,
      0.32,
      spec.intakeColor,
      '#0f172a',
      0.35
    );

    // Main Valve Cover
    drawRoundedBox(
      ctx,
      -headLen * 0.5,
      -headW * 0.5,
      headLen,
      headW,
      0.38,
      spec.valveCoverColor,
      '#0f172a',
      0.48
    );

    // Valve cover style variations per real engine modifier
    if (spec.hasVazHorns) {
      // VAZ-21126 16V: 4 iconic curved cast aluminum intake "horns" ("рога") arching over valve cover
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(0.55, headLen * 0.09);
      for (let c = 0; c < cyls; c++) {
        const cx = -headLen * 0.36 + (c / Math.max(1, cyls - 1)) * headLen * 0.72;
        ctx.beginPath();
        ctx.moveTo(cx, -headW * 0.75);
        ctx.quadraticCurveTo(cx, 0, cx, headW * 0.25);
        ctx.stroke();
      }
    } else if (spec.fuelLayout === 'vtec_dohc' || spec.fuelLayout === 'dohc_16v') {
      // Twin-cam valley plate + machined silver ribs + individual coil packs
      ctx.fillStyle = spec.valveCoverAccent;
      ctx.fillRect(-headLen * 0.42, -headW * 0.14, headLen * 0.84, headW * 0.28);
      for (let c = 0; c < cyls; c++) {
        const cx = cyls === 1 ? 0 : -headLen * 0.36 + (c / (cyls - 1)) * headLen * 0.72;
        ctx.fillStyle = spec.fuelLayout === 'vtec_dohc' || mod.tuneChipLevel >= 1 ? '#ef4444' : '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, 0, Math.max(0.24, headW * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (spec.fuelLayout === 'tsi_direct') {
      // Modern TSI dark acoustic engine shroud with silver/red racing stripes & 4 red-top coils
      ctx.strokeStyle = spec.valveCoverAccent;
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-headLen * 0.42, -headW * 0.26);
      ctx.lineTo(headLen * 0.42, -headW * 0.26);
      ctx.moveTo(-headLen * 0.42, headW * 0.26);
      ctx.lineTo(headLen * 0.42, headW * 0.26);
      ctx.stroke();
      for (let c = 0; c < cyls; c++) {
        const cx = -headLen * 0.34 + (c / Math.max(1, cyls - 1)) * headLen * 0.68;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 0.32, -headW * 0.15, 0.64, headW * 0.30);
      }
    } else if (spec.hasSideTnvd) {
      // Inline Mechanical Diesel (MTZ D-243 / D-245 / 2.5 TD / 4.2 TD / Bus I6):
      // Side-mounted inline ТНВД pump + gleaming curved steel high-pressure injector pipes!
      const pL = headLen * 0.68;
      const pW = headW * 0.36;
      drawRoundedBox(ctx, -pL * 0.5, -headW * 0.96, pL, pW, 0.22, '#94a3b8', '#0f172a', 0.35);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.26;
      for (let c = 0; c < cyls; c++) {
        const cx = -headLen * 0.38 + (c / Math.max(1, cyls - 1)) * headLen * 0.76;
        const px = -pL * 0.35 + (c / Math.max(1, cyls - 1)) * pL * 0.70;
        ctx.beginPath();
        ctx.moveTo(px, -headW * 0.65);
        ctx.quadraticCurveTo((px + cx) * 0.5, -headW * 0.35, cx, 0);
        ctx.stroke();
        // Injector nut on valve cover
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(cx, 0, Math.max(0.22, headW * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (spec.fuelLayout === 'diesel_cr') {
      // Common-rail TDI: stainless pressure rail + injector bosses
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.moveTo(-headLen * 0.40, -headW * 0.22);
      ctx.lineTo(headLen * 0.40, -headW * 0.22);
      ctx.stroke();
      for (let c = 0; c < cyls; c++) {
        const cx = -headLen * 0.36 + (c / Math.max(1, cyls - 1)) * headLen * 0.72;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(cx, 0.1, Math.max(0.22, headW * 0.13), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (spec.fuelLayout === 'carb_round') {
      // Classic Soviet Carburetor (MeMZ / VAZ-2101-2107):
      // Round blue/steel pancake air cleaner ("кастрюля") + chrome wingnut + distributor & HT wires
      const filtR = clamp(headW * 0.72, 1.0, 2.3);
      ctx.fillStyle = spec.intakeColor;
      ctx.beginPath();
      ctx.arc(0, -headW * 0.42, filtR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.4;
      ctx.stroke();
      // Air horn snorkel
      ctx.fillStyle = spec.intakeColor;
      ctx.fillRect(filtR * 0.5, -headW * 0.42 - filtR * 0.2, filtR * 0.8, filtR * 0.4);
      // Chrome center wingnut
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -headW * 0.42, Math.max(0.24, filtR * 0.20), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard 8V MPI: ribbed alloy cover + spark plug boots
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(-headLen * 0.42, -headW * 0.18);
      ctx.lineTo(headLen * 0.42, -headW * 0.18);
      ctx.moveTo(-headLen * 0.42, headW * 0.18);
      ctx.lineTo(headLen * 0.42, headW * 0.18);
      ctx.stroke();
      for (let c = 0; c < cyls; c++) {
        const cx = cyls === 1 ? 0 : -headLen * 0.36 + (c / (cyls - 1)) * headLen * 0.72;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, headW * 0.25, Math.max(0.2, headW * 0.13), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ignition Distributor & curved HT spark plug wires (classic / carb / 8V)
    if (spec.hasDistributor) {
      const distX = -headLen * 0.42;
      const distY = headW * 0.35;
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(distX, distY, Math.max(0.35, headW * 0.20), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.22;
      for (let c = 0; c < Math.min(4, cyls); c++) {
        const cx = -headLen * 0.32 + (c / Math.max(1, cyls - 1)) * headLen * 0.64;
        ctx.beginPath();
        ctx.moveTo(distX, distY);
        ctx.quadraticCurveTo((distX + cx) * 0.5, headW * 0.55, cx, headW * 0.22);
        ctx.stroke();
      }
    }

    // Inline Supercharger (if aftermarket trb_sch fitted on an inline engine!)
    if (mod.turboKind === 'supercharger') {
      drawRoundedBox(
        ctx,
        -headLen * 0.34,
        -headW * 1.02,
        headLen * 0.68,
        headW * 0.46,
        0.3,
        '#cbd5e1',
        '#1e293b',
        0.4
      );
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(-headLen * 0.26, -headW * 0.85);
      ctx.lineTo(headLen * 0.26, -headW * 0.85);
      ctx.moveTo(-headLen * 0.26, -headW * 0.72);
      ctx.lineTo(headLen * 0.26, -headW * 0.72);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- 8E. TURBOCHARGER SNAIL(S) (Single T25/T28/T4/VNT or Biturbo Twin Snails) ---
  if (mod.turboKind === 'single') {
    const turboR = clamp(Math.min(blkLen, blkW) * 0.18 * mod.turboScale, 0.65, 1.75);
    const tx = isTransverse ? blkLen * 0.46 : blkLen * 0.08;
    const ty = isTransverse ? 0 : blkW * 0.64;
    drawTurboSnail(ctx, tx, ty, turboR, hotGlow, 1);
  } else if (mod.turboKind === 'twin') {
    const turboR = clamp(Math.min(blkLen, blkW) * 0.16 * mod.turboScale, 0.58, 1.45);
    drawTurboSnail(ctx, blkLen * 0.12, -blkW * 0.62, turboR, hotGlow, -1);
    drawTurboSnail(ctx, blkLen * 0.12, blkW * 0.62, turboR, hotGlow, 1);
  }

  // --- 8F. OIL FILLER CAP (Interactive oilCapOpen) & YELLOW DIPSTICK (Interactive dipstickPulled) ---
  {
    const capX = isTransverse ? 0 : blkLen * 0.26;
    const capY = isTransverse ? -blkW * 0.24 : (spec.architecture === 'v' ? -blkW * 0.34 : 0);
    const capR = clamp(Math.min(blkLen, blkW) * 0.11, 0.35, 0.78);
    if (eng?.oilCapOpen) {
      // Open dark oil port hole + cap sitting beside it
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(capX, capY, capR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.28;
      ctx.stroke();
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(capX + capR * 2.1, capY - capR * 0.6, capR * 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(capX, capY, capR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.28;
      ctx.stroke();
    }

    // Bright yellow oil dipstick pull-ring
    const dipBaseX = blkLen * 0.22;
    const dipBaseY = blkW * 0.42;
    const dipPull = eng?.dipstickPulled ? 1.55 : 0;
    if (eng?.dipstickPulled) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.moveTo(dipBaseX, dipBaseY);
      ctx.lineTo(dipBaseX + dipPull * 0.4, dipBaseY + dipPull);
      ctx.stroke();
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    ctx.arc(dipBaseX + dipPull * 0.4, dipBaseY + dipPull, Math.max(0.32, capR * 0.65), 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- 8G. GBO / LPG REDUCER & GAS INJECTOR RAIL ---
  if (mod.hasGBO) {
    const rX = -blkLen * 0.34;
    const rY = blkW * 0.56;
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(rX, rY, Math.max(0.55, blkW * 0.13), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 0.35;
    ctx.stroke();
    // Brass LPG solenoid & copper pipe
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(rX + 0.55, rY - 0.3, 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 8H. ENGINE BLOCK IMPACT FRACTURE CRACK (When Severely Damaged) ---
  if (eng && eng.engineHealth < 40) {
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-blkLen * 0.20, -blkW * 0.18);
    ctx.lineTo(0, blkW * 0.04);
    ctx.lineTo(blkLen * 0.18, -blkW * 0.12);
    ctx.lineTo(blkLen * 0.28, blkW * 0.18);
    ctx.stroke();
  }

  ctx.restore(); // end rigid engine block transform

  // =========================================================================
  // 9. SPORT ANODIZED STRUT TOWER BRACE (Across Engine Bay)
  // =========================================================================
  if (mod.hasStrutBrace && !bay.isNarrowTractorBonnet && !bay.isCabOver) {
    const [sL_x, sL_y] = deform(strutX, -strutY);
    const [sR_x, sR_y] = deform(strutX, strutY);
    const midX = (sL_x + sR_x) * 0.5 - dir * 0.7;
    const midY = (sL_y + sR_y) * 0.5;
    const braceCol = spec.isExotic ? '#f59e0b' : (mod.tuneChipLevel >= 2 ? '#dc2626' : '#cbd5e1');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(sL_x, sL_y);
    ctx.quadraticCurveTo(midX, midY, sR_x, sR_y);
    ctx.stroke();
    ctx.strokeStyle = braceCol;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(sL_x, sL_y);
    ctx.quadraticCurveTo(midX, midY, sR_x, sR_y);
    ctx.stroke();
  }

  // =========================================================================
  // 10. UNDER-HOOD FIRE / THERMAL CHARRING OVERLAY
  // =========================================================================
  if (dmg?.engineFire || dmg?.isFullyBurnt) {
    ctx.fillStyle = dmg.isFullyBurnt ? 'rgba(10, 12, 16, 0.78)' : 'rgba(18, 12, 10, 0.42)';
    ctx.fillRect(bay.bayX1 - 4, -bay.bayHalfW - 4, bayLen + 8, bayW + 8);
    if (dmg.engineFire && !dmg.isFullyBurnt) {
      const pulse = 0.78 + 0.22 * Math.sin(nowSec * 16.0 + car.x);
      const fireR = Math.max(bayLen, bayW) * 0.55;
      const fg = ctx.createRadialGradient(engOriginX, engOriginY, 0.5, engOriginX, engOriginY, fireR);
      fg.addColorStop(0, `rgba(254, 240, 138, ${0.75 * pulse})`);
      fg.addColorStop(0.45, `rgba(249, 115, 22, ${0.52 * pulse})`);
      fg.addColorStop(1, 'rgba(185, 28, 28, 0)');
      ctx.fillStyle = fg;
      ctx.fillRect(bay.bayX1 - 4, -bay.bayHalfW - 4, bayLen + 8, bayW + 8);
    }
  }

  ctx.restore(); // end bay clip
  ctx.restore();
}

/**
 * Renders the articulated hood panel (detached hinges, hinged-open with inner X-ribs
 * and prop rod, crash-buckled with engine peeking out, supercar tinted glass cover
 * with carbon X-brace, or muscle chrome supercharger blower cutout).
 */
export function renderArticulatedHoodAndBlower(params: EngineBayRenderParams): void {
  const { ctx, car, halfL, halfW, fc, rc, cabinX, cabinL, cabinW, deform } = params;
  const bay = getEngineBayLayout(car, halfL, halfW, fc, rc, cabinX, cabinL, cabinW);
  if (bay.zone === 'none') return;

  const dmg = car.damage;
  const eng = car.engineState;
  const mod = resolveEngineBlueprint(car);
  const nowSec = performance.now() * 0.001;

  const hoodLen = bay.hoodX2 - bay.hoodX1;
  const hoodW = bay.hoodHalfW * 2;
  if (hoodLen < 3.0 || hoodW < 3.0) return;

  // --- CASE 1: SUPERCAR TRANSPARENT GLASS MID-ENGINE COVER ---
  if (bay.isTransparentCover) {
    if (dmg?.hoodDetached) {
      // Torn rear deck hinge brackets
      for (const s of [-1, 1] as const) {
        const [hx, hy] = deform(bay.hoodX2, s * bay.hoodHalfW * 0.65);
        ctx.fillStyle = '#475569';
        ctx.fillRect(hx - 0.6, hy - 0.5, 1.2, 1.0);
      }
      return;
    }

    if (eng?.hoodOpen) {
      // Opened rear clamshell glass deck propped backward
      const p1 = deform(bay.hoodX1 - hoodLen * 0.25, -bay.hoodHalfW * 0.88);
      const p2 = deform(bay.hoodX1 + 0.6, -bay.hoodHalfW * 0.94);
      const p3 = deform(bay.hoodX1 + 0.6, bay.hoodHalfW * 0.94);
      const p4 = deform(bay.hoodX1 - hoodLen * 0.25, bay.hoodHalfW * 0.88);
      drawQuad(ctx, p1, p2, p3, p4, 'rgba(15, 23, 42, 0.72)', car.color, 0.9);
      return;
    }

    // Closed tinted panoramic glass engine cover + carbon X-brace + side heat louver vents
    const g1 = deform(bay.hoodX1, -bay.hoodHalfW);
    const g2 = deform(bay.hoodX2, -bay.hoodHalfW);
    const g3 = deform(bay.hoodX2, bay.hoodHalfW);
    const g4 = deform(bay.hoodX1, bay.hoodHalfW);
    drawQuad(ctx, g1, g2, g3, g4, 'rgba(15, 23, 42, 0.24)', 'rgba(148, 163, 184, 0.42)', 0.75);

    // Carbon-fiber structural X-brace over the engine
    const x1 = deform(bay.bayX1 + 0.6, -bay.bayHalfW * 0.75);
    const x2 = deform(bay.bayX2 - 0.6, bay.bayHalfW * 0.75);
    const x3 = deform(bay.bayX1 + 0.6, bay.bayHalfW * 0.75);
    const x4 = deform(bay.bayX2 - 0.6, -bay.bayHalfW * 0.75);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.78)';
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(x1[0], x1[1]);
    ctx.lineTo(x2[0], x2[1]);
    ctx.moveTo(x3[0], x3[1]);
    ctx.lineTo(x4[0], x4[1]);
    ctx.stroke();

    // Specular glass sheen diagonal highlight
    const sh1 = deform(bay.hoodX1 + hoodLen * 0.15, -bay.hoodHalfW * 0.72);
    const sh2 = deform(bay.hoodX2 - hoodLen * 0.18, bay.hoodHalfW * 0.62);
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.26)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sh1[0], sh1[1]);
    ctx.lineTo(sh2[0], sh2[1]);
    ctx.stroke();
    return;
  }

  // --- CASE 2: HOOD COMPLETELY DETACHED ---
  if (dmg?.hoodDetached) {
    // Sheared metallic cowl hinge stubs & torn fender seam lip
    const hingeX = bay.hingeSide === 'rear' ? bay.hoodX1 : bay.hoodX2;
    for (const s of [-1, 1] as const) {
      const [hx, hy] = deform(hingeX, s * bay.hoodHalfW * 0.72);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(hx - 0.7, hy - 0.45, 1.4, 0.9);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.35;
      ctx.strokeRect(hx - 0.7, hy - 0.45, 1.4, 0.9);
    }
    return;
  }

  // --- CASE 3: HOOD HINGED OPEN IN-WORLD (`eng.hoodOpen`) ---
  if (eng?.hoodOpen) {
    if (bay.isCabOver) return; // cab-over engine inspected from tilted service cover
    const isRearHinge = bay.hingeSide === 'rear';
    const hingeX = isRearHinge ? bay.hoodX1 : bay.hoodX2;
    const dir = isRearHinge ? 1 : -1;
    // Foreshortened lifted hood (tilted ~62 degrees upward so entire engine bay is unobstructed!)
    const projLen = clamp(hoodLen * 0.24, 2.2, 4.6);
    const tipX = hingeX + dir * projLen;
    const halfWBase = bay.hoodHalfW;
    const halfWTip = bay.hoodHalfW * 0.94;

    // Soft cast shadow dropped onto windshield cowl & rear bay edge
    const sh1 = deform(hingeX - dir * 1.4, -halfWBase);
    const sh2 = deform(tipX + dir * 0.8, -halfWTip);
    const sh3 = deform(tipX + dir * 0.8, halfWTip);
    const sh4 = deform(hingeX - dir * 1.4, halfWBase);
    drawQuad(ctx, sh1, sh2, sh3, sh4, 'rgba(2, 6, 23, 0.45)');

    // Metallic hood prop rod on right fender rail holding the hood open
    const rodBase = deform(bay.bayX2 - dir * hoodLen * 0.28, bay.bayHalfW * 0.88);
    const rodTop = deform(tipX, halfWTip * 0.76);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(rodBase[0], rodBase[1]);
    ctx.lineTo(rodTop[0], rodTop[1]);
    ctx.stroke();

    // Inner hood underside panel (dark primer / insulation mat with stamped X-frame ribs)
    const p1 = deform(hingeX, -halfWBase);
    const p2 = deform(tipX, -halfWTip);
    const p3 = deform(tipX, halfWTip);
    const p4 = deform(hingeX, halfWBase);
    drawQuad(ctx, p1, p2, p3, p4, '#181e29', car.color, 1.05);

    // Inner X-reinforcement stamping ribs
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.26)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.moveTo(p4[0], p4[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();

    // Painted leading outer lip of the raised hood + striker latch loop
    ctx.strokeStyle = car.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.stroke();

    const latchTip = deform(tipX + dir * 0.35, 0);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(latchTip[0], latchTip[1], 0.45, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // --- CASE 4: CRASH-BUCKLED HOOD (Closed but tent-folded, revealing front of engine bay!) ---
  const hoodRaise = dmg?.hoodRaisedAmount || (dmg?.hoodBuckled ? 0.5 : 0);
  if (hoodRaise > 0.12 && !bay.isCabOver) {
    const foldFrac = clamp(hoodRaise, 0.15, 1.0);
    // Pull the leading edge of the buckled hood backward so the crushed radiator/engine peeks out
    const gapFront = hoodLen * (0.14 + foldFrac * 0.24);
    const apexX = bay.hoodX1 + (hoodLen - gapFront) * 0.52;
    const leadX = bay.hoodX2 - gapFront;
    const hw = bay.hoodHalfW;

    // Dark shadow gap under the lifted front hood edge
    const g1 = deform(leadX - 0.8, -hw * 0.96);
    const g2 = deform(leadX + 1.4, -hw * 0.92);
    const g3 = deform(leadX + 1.4, hw * 0.92);
    const g4 = deform(leadX - 0.8, hw * 0.96);
    drawQuad(ctx, g1, g2, g3, g4, 'rgba(2, 6, 23, 0.72)');

    // Rear half of tent-folded hood (hinge to buckled apex)
    const r1 = deform(bay.hoodX1, -hw);
    const r2 = deform(apexX, -hw * (1 - foldFrac * 0.06));
    const r3 = deform(apexX, hw * (1 - foldFrac * 0.06));
    const r4 = deform(bay.hoodX1, hw);
    drawQuad(ctx, r1, r2, r3, r4, car.color, 'rgba(0,0,0,0.45)', 0.75);

    // Front half of tent-folded hood (apex sloping down to bent leading edge)
    const f1 = r2;
    const f2 = deform(leadX, -hw * 0.94);
    const f3 = deform(leadX, hw * 0.94);
    const f4 = r3;
    drawQuad(ctx, f1, f2, f3, f4, car.color, 'rgba(0,0,0,0.55)', 0.85);
    // Slight shadow tint on forward sloped facet for 2.5D tent depth
    drawQuad(ctx, f1, f2, f3, f4, `rgba(15, 23, 42, ${0.14 + foldFrac * 0.18})`);

    // Bright specular ridge along the buckled tent crease
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + foldFrac * 0.45})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(r2[0], r2[1]);
    ctx.lineTo(r3[0], r3[1]);
    ctx.stroke();
    return;
  }

  // --- CASE 5: CLOSED INTACT HOOD ---
  // 5A. Muscle car supercharger blower scoop protruding cleanly through hood cutout!
  if ((car.type === 'muscle' || car.type === 'muscle_classic') && mod.turboKind === 'supercharger') {
    const scoopCx = (bay.hoodX1 + bay.hoodX2) * 0.52;
    const vib = eng?.engineRunning && !eng.isSeized ? Math.sin(nowSec * 36) * 0.12 : 0;
    const [sx, sy] = deform(scoopCx, vib);
    const sL = clamp(hoodLen * 0.44, 3.6, 6.2);
    const sW = clamp(hoodW * 0.28, 2.4, 4.2);

    ctx.save();
    ctx.translate(sx, sy);
    // Black rubber hood cutout bezel
    drawRoundedBox(ctx, -sL * 0.54, -sW * 0.58, sL * 1.08, sW * 1.16, 0.45, '#090d14', '#334155', 0.45);
    // Polished chrome 3-barrel supercharger bug-catcher scoop
    drawRoundedBox(ctx, -sL * 0.46, -sW * 0.46, sL * 0.92, sW * 0.92, 0.4, '#e2e8f0', '#475569', 0.45);
    // Chrome center ribs
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-sL * 0.38, -sW * 0.16);
    ctx.lineTo(sL * 0.34, -sW * 0.16);
    ctx.moveTo(-sL * 0.38, sW * 0.16);
    ctx.lineTo(sL * 0.34, sW * 0.16);
    ctx.stroke();
    // Forward intake throat with 3 crimson butterfly valves
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sL * 0.30, -sW * 0.40, sL * 0.18, sW * 0.80);
    for (const by of [-sW * 0.24, 0, sW * 0.24]) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(sL * 0.39, by, Math.max(0.24, sW * 0.10), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5B. Crisp realistic hood panel shutlines & cowl washer nozzles on standard front-hood cars
  if (!bay.isCabOver && !bay.isTruckHood && !bay.isNarrowTractorBonnet && bay.zone === 'front') {
    const h1 = deform(bay.hoodX1, -bay.hoodHalfW);
    const h2 = deform(bay.hoodX2, -bay.hoodHalfW * 0.94);
    const h3 = deform(bay.hoodX2, bay.hoodHalfW * 0.94);
    const h4 = deform(bay.hoodX1, bay.hoodHalfW);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.lineWidth = 0.72;
    ctx.beginPath();
    ctx.moveTo(h1[0], h1[1]);
    ctx.lineTo(h2[0], h2[1]);
    ctx.lineTo(h3[0], h3[1]);
    ctx.lineTo(h4[0], h4[1]);
    ctx.stroke();

    // Dual black windshield washer nozzles near cowl
    for (const s of [-1, 1] as const) {
      const [nx, ny] = deform(bay.hoodX1 + 1.1, s * bay.hoodHalfW * 0.42);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 0.35, ny - 0.25, 0.7, 0.5);
    }
  }
}

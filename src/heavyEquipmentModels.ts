import type { CarType } from './types';
import type { VehicleRenderContext } from './vehicleVisuals';
import { isVehicleHoodExposed } from './engineBayVisuals';
import {
  type Pt,
  type DeformFn,
  type LiveOpticsState,
  shadePaint,
  getLiveOpticsState,
  fillPoly,
  strokePoly,
  drawRoundedBox,
  drawDeformedDot,
  createBodyMetallicGradient,
  createRoofGradient,
  createGlassGradient,
  drawTreadedTire,
  drawAmberBeacon,
  drawEceRedTriangle,
  drawSideMirrorArm,
} from './vehicleModelPrimitives';

export const REDRAWN_TRACTOR_TYPES: ReadonlySet<string> = new Set<CarType>([
  'tractor_mtz82',
  'tractor_mtz80',
  'tractor_mtz80_old',
]);

export const REDRAWN_MACHINERY_TYPES: ReadonlySet<string> = new Set<CarType>([
  'paver_asphalt_wheeled',
  'roller_heavy_tandem',
  'roller_compact_sidewalk',
  'roller_pneumatic',
]);

export const REDRAWN_TRAILER_TYPES: ReadonlySet<string> = new Set<CarType>([
  'trailer_barrel',
  'trailer_vacuum',
  'trailer_flatbed_2axle',
  'trailer_semi',
  'trailer_semi_box',
  'trailer_semi_tanker',
  'trailer_semi_container',
  'trailer_semi_lowboy',
]);

export const REDRAWN_HEAVY_EQUIPMENT_TYPES: ReadonlySet<string> = new Set<string>([
  ...REDRAWN_TRACTOR_TYPES,
  ...REDRAWN_MACHINERY_TYPES,
  ...REDRAWN_TRAILER_TYPES,
]);

export function isRedrawnTractor(type: string): boolean {
  return REDRAWN_TRACTOR_TYPES.has(type);
}

export function isRedrawnRoadMachinery(type: string): boolean {
  return REDRAWN_MACHINERY_TYPES.has(type);
}

export function isRedrawnTrailer(type: string): boolean {
  return REDRAWN_TRAILER_TYPES.has(type);
}

export function isRedrawnHeavyEquipment(type: string): boolean {
  return REDRAWN_HEAVY_EQUIPMENT_TYPES.has(type);
}

function drawTrailerRearLampBar(
  ctx: CanvasRenderingContext2D,
  bumperX: number,
  halfW: number,
  opt: LiveOpticsState,
  deform: DeformFn,
  includeTriangles = true,
  lampScale = 1.0
): void {
  const barHalfW = halfW * 0.88;
  // Steel underride bumper beam
  drawRoundedBox(
    ctx,
    bumperX - 1.35 * lampScale,
    -barHalfW,
    bumperX + 0.9 * lampScale,
    barHalfW,
    0.45,
    '#1e293b',
    deform,
    '#0f172a',
    0.45
  );
  // Reflective chevron caution tape on bumper center flanks
  for (let i = -3; i <= 3; i++) {
    const sy = i * (barHalfW * 0.16);
    drawRoundedBox(
      ctx,
      bumperX - 1.15 * lampScale,
      sy - 0.55,
      bumperX - 0.55 * lampScale,
      sy + 0.55,
      0.1,
      i % 2 === 0 ? '#ef4444' : '#f8fafc',
      deform
    );
  }

  // Left & Right integrated multi-chamber ECE/GOST rear clusters
  const drawCluster = (side: -1 | 1) => {
    const cy = side * (halfW * 0.66);
    const broken = side < 0 ? opt.leftTailBroken : opt.rightTailBroken;
    const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
    const cw = 4.6 * lampScale;
    const cd = 1.45 * lampScale;
    drawRoundedBox(
      ctx,
      bumperX - cd - 0.15,
      cy - cw * 0.5 - 0.2,
      bumperX + 0.25,
      cy + cw * 0.5 + 0.2,
      0.3,
      '#090d16',
      deform
    );
    if (broken) return;

    const minY = cy - cw * 0.5;
    const turnW = cw * 0.27;
    const brakeW = cw * 0.44;
    const revW = cw - turnW - brakeW;

    const turnY = side < 0 ? minY : minY + revW + brakeW;
    const brakeY = side < 0 ? minY + turnW : minY + revW;
    const revY = side < 0 ? minY + turnW + brakeW : minY;

    // Amber turn
    const turnLit = turnInt > 0.06;
    drawRoundedBox(
      ctx,
      bumperX - cd,
      turnY,
      bumperX,
      turnY + turnW,
      0.16,
      turnLit ? '#f59e0b' : '#92400e',
      deform
    );
    if (turnLit) {
      drawDeformedDot(ctx, bumperX - cd * 0.5, turnY + turnW * 0.5, 0.35 * lampScale, '#fef08a', deform);
    }

    // Ruby brake / tail
    const brakeCol = opt.braking ? '#ef4444' : opt.positionOn ? '#dc2626' : '#7f1d1d';
    drawRoundedBox(ctx, bumperX - cd, brakeY, bumperX, brakeY + brakeW, 0.16, brakeCol, deform);
    if (opt.braking) {
      drawRoundedBox(
        ctx,
        bumperX - cd * 0.78,
        brakeY + brakeW * 0.22,
        bumperX - cd * 0.22,
        brakeY + brakeW * 0.78,
        0.1,
        '#ffffff',
        deform
      );
    } else if (opt.positionOn) {
      drawRoundedBox(
        ctx,
        bumperX - cd * 0.72,
        brakeY + brakeW * 0.28,
        bumperX - cd * 0.28,
        brakeY + brakeW * 0.72,
        0.1,
        '#fca5a5',
        deform
      );
    }

    // Reverse / rear fog
    const revCol = opt.reversing
      ? '#ffffff'
      : opt.rearFogOn
      ? '#ef4444'
      : side < 0
      ? '#94a3b8'
      : '#7f1d1d';
    drawRoundedBox(ctx, bumperX - cd, revY, bumperX, revY + revW, 0.16, revCol, deform);
  };

  drawCluster(-1);
  drawCluster(1);

  if (includeTriangles) {
    drawEceRedTriangle(ctx, bumperX - 0.55 * lampScale, -halfW * 0.36, 1.9 * lampScale, deform);
    drawEceRedTriangle(ctx, bumperX - 0.55 * lampScale, halfW * 0.36, 1.9 * lampScale, deform);
  }
}

function drawAmberSideMarkers(
  ctx: CanvasRenderingContext2D,
  xs: number[],
  halfW: number,
  lit: boolean,
  deform: DeformFn
): void {
  for (const x of xs) {
    for (const side of [-1, 1] as const) {
      const y = side * (halfW - 0.2);
      drawRoundedBox(
        ctx,
        x - 0.85,
        y - 0.38,
        x + 0.85,
        y + 0.38,
        0.18,
        lit ? '#fbbf24' : '#92400e',
        deform,
        '#0f172a',
        0.25
      );
    }
  }
}

function drawSemiLandingGear(
  ctx: CanvasRenderingContext2D,
  x: number,
  halfW: number,
  deployed: boolean,
  deform: DeformFn
): void {
  const spread = halfW * 0.68;
  strokePoly(ctx, [[x, -spread], [x, spread]], '#334155', 1.25, deform);
  for (const side of [-1, 1] as const) {
    const py = side * spread;
    drawRoundedBox(
      ctx,
      x - 1.5,
      py - 1.35,
      x + 1.5,
      py + 1.35,
      0.35,
      deployed ? '#475569' : '#1e293b',
      deform,
      '#0f172a',
      0.45
    );
    if (deployed) {
      // Extended sand-shoe landing foot peeking slightly outward
      drawRoundedBox(
        ctx,
        x - 1.9,
        py + side * 0.45 - 1.1,
        x + 1.9,
        py + side * 0.45 + 1.1,
        0.25,
        '#64748b',
        deform,
        '#0f172a',
        0.4
      );
    }
  }
  // Crank handle on right side
  strokePoly(ctx, [[x, spread + 0.8], [x, halfW + 0.9], [x - 1.6, halfW + 0.9]], '#cbd5e1', 0.6, deform);
}

function drawSemiKingpinApron(ctx: CanvasRenderingContext2D, halfL: number, halfW: number, deform: DeformFn): void {
  const frontX = halfL - 1.0;
  const apronRear = halfL * 0.64;
  drawRoundedBox(ctx, apronRear, -halfW * 0.84, frontX, halfW * 0.84, 1.2, '#1e293b', deform, '#0f172a', 0.55);
  // Twin longitudinal I-beam rails
  drawRoundedBox(ctx, -halfL + 3.0, -halfW * 0.46, apronRear + 1.5, -halfW * 0.34, 0.25, '#334155', deform);
  drawRoundedBox(ctx, -halfL + 3.0, halfW * 0.34, apronRear + 1.5, halfW * 0.46, 0.25, '#334155', deform);
  // Kingpin fifth-wheel pin
  drawDeformedDot(ctx, halfL * 0.80, 0, 2.2, '#0f172a', deform, '#64748b', 0.6);
  drawDeformedDot(ctx, halfL * 0.80, 0, 0.9, '#94a3b8', deform);
  // Air/electric coupling gladhands on front bulkhead nose
  drawDeformedDot(ctx, frontX - 0.5, -2.4, 0.72, '#ef4444', deform, '#0f172a', 0.3);
  drawDeformedDot(ctx, frontX - 0.5, 0, 0.72, '#f59e0b', deform, '#0f172a', 0.3);
  drawDeformedDot(ctx, frontX - 0.5, 2.4, 0.72, '#eab308', deform, '#0f172a', 0.3);
}

// ============================================================================
// 1. WHEELS LAYER (Tractors + Trailers; Road Machinery draws drums/wheels internally)
// ============================================================================
export function renderHeavyEquipmentWheels(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;

  if (isRedrawnRoadMachinery(car.type)) {
    // Drums and articulated pneumatic compactor tires are drawn inside the articulated machinery renderer
    return;
  }

  // --- MTZ TRACTORS ---
  if (isRedrawnTractor(car.type)) {
    const is82 = car.type === 'tractor_mtz82';
    const isOld = car.type === 'tractor_mtz80_old';
    const rimCol = isOld ? '#94a3b8' : is82 ? '#fef08a' : '#e2e8f0';

    // Huge Rear Agricultural Chevron Wheels
    const rearAxleX = -halfL * 0.52;
    const rearL = 13.8;
    const rearW = 5.2;
    const rearTrackY = halfW - 1.1;

    // Rear differential housing & axle trumpet tubes
    drawRoundedBox(ctx, rearAxleX - 2.2, -rearTrackY + 1.5, rearAxleX + 2.2, rearTrackY - 1.5, 0.8, '#1e293b', deform, '#0f172a', 0.5);
    for (const side of [-1, 1] as const) {
      const [rx, ry] = deform(rearAxleX, side * rearTrackY);
      drawTreadedTire(ctx, rx, ry, rearL, rearW, 0, 'agri', rimCol);
    }

    // Front Axle & Steered Front Wheels
    const frontAxleX = halfL * 0.58;
    const frontL = is82 ? 9.6 : 8.5;
    const frontW = is82 ? 3.8 : 2.75;
    const frontTrackY = halfW - (is82 ? 1.5 : 1.7);

    // Front portal beam axle (4WD pumpkin housing on MTZ-82)
    drawRoundedBox(ctx, frontAxleX - 1.35, -frontTrackY + 1.0, frontAxleX + 1.35, frontTrackY - 1.0, 0.55, '#1e293b', deform, '#0f172a', 0.45);
    if (is82) {
      drawDeformedDot(ctx, frontAxleX, 0, 2.0, '#334155', deform, '#0f172a', 0.45);
    }

    const steer = car.steerAngle || 0;
    for (const side of [-1, 1] as const) {
      const [fx, fy] = deform(frontAxleX, side * frontTrackY);
      if (is82) {
        drawTreadedTire(ctx, fx, fy, frontL, frontW, steer, 'agri', rimCol);
        // Steering-knuckle curved front mudguard turning with the 4WD front wheel
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(steer);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-frontL * 0.46, -(frontW + 0.85) * 0.5, frontL * 0.78, frontW + 0.85, 0.75);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.45;
        ctx.stroke();
        ctx.fillStyle = '#475569';
        ctx.fillRect(-0.7, -(frontW + 0.85) * 0.5, 1.4, frontW + 0.85);
        ctx.restore();
      } else {
        // 2WD longitudinal steering guide rib front tire
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(steer);
        const hl = frontL * 0.5;
        const hw = frontW * 0.5;
        ctx.fillStyle = '#0e131b';
        ctx.beginPath();
        ctx.roundRect(-hl, -hw, frontL, frontW, 0.85);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.30)';
        ctx.lineWidth = 0.52;
        ctx.beginPath();
        ctx.moveTo(-hl + 0.9, -hw * 0.42);
        ctx.lineTo(hl - 0.9, -hw * 0.42);
        ctx.moveTo(-hl + 0.9, 0);
        ctx.lineTo(hl - 0.9, 0);
        ctx.moveTo(-hl + 0.9, hw * 0.42);
        ctx.lineTo(hl - 0.9, hw * 0.42);
        ctx.stroke();
        ctx.fillStyle = rimCol;
        ctx.beginPath();
        ctx.arc(0, 0, hw * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    return;
  }

  // --- SINGLE-AXLE FARM TANKERS (Barrel & Vacuum) ---
  if (car.type === 'trailer_barrel' || car.type === 'trailer_vacuum') {
    const axleX = -halfL * 0.28;
    const tireL = car.type === 'trailer_vacuum' ? 11.4 : 10.2;
    const tireW = car.type === 'trailer_vacuum' ? 4.3 : 3.8;
    const trackY = halfW - 1.25;
    drawRoundedBox(ctx, axleX - 1.2, -trackY + 1.0, axleX + 1.2, trackY - 1.0, 0.4, '#1e293b', deform);
    for (const side of [-1, 1] as const) {
      const [tx, ty] = deform(axleX, side * trackY);
      drawTreadedTire(ctx, tx, ty, tireL, tireW, 0, 'heavy', '#94a3b8');
    }
    return;
  }

  // --- 2-AXLE TURNTABLE DOLLY FARM TRAILER (2-PTS-4) ---
  if (car.type === 'trailer_flatbed_2axle') {
    const rearAxleX = -halfL * 0.56;
    const frontPivotX = halfL * 0.44;
    const tireL = 9.8;
    const tireW = 3.6;
    const trackY = halfW - 1.3;

    // Fixed rear axle
    drawRoundedBox(ctx, rearAxleX - 1.1, -trackY + 1.0, rearAxleX + 1.1, trackY - 1.0, 0.35, '#1e293b', deform);
    for (const side of [-1, 1] as const) {
      const [rx, ry] = deform(rearAxleX, side * trackY);
      drawTreadedTire(ctx, rx, ry, tireL, tireW, 0, 'heavy', '#94a3b8');
    }

    // Swiveling front turntable dolly + axle + A-frame drawbar!
    const dollyRel = (car.trailerDollyAngle !== undefined ? car.trailerDollyAngle - car.angle : 0);
    const [px, py] = deform(frontPivotX, 0);
    const drawbarL = Math.max(car.drawbarLength || 16, halfL - frontPivotX + 8.5);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(dollyRel);

    // Turntable slew ring & axle beam
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-1.2, -trackY, 2.4, trackY * 2);

    // Front dolly wheels
    drawTreadedTire(ctx, 0, -trackY, tireL, tireW, 0, 'heavy', '#94a3b8');
    drawTreadedTire(ctx, 0, trackY, tireL, tireW, 0, 'heavy', '#94a3b8');

    // Forged steel A-frame drawbar extending forward from front dolly to hitch ring
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.8, -trackY * 0.56);
    ctx.lineTo(drawbarL, 0);
    ctx.lineTo(0.8, trackY * 0.56);
    ctx.stroke();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(drawbarL - 1.2, 0);
    ctx.stroke();
    // Hitch towing eye ring
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(drawbarL, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(drawbarL, 0, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // --- SEMI-TRAILERS (Tri-Axle Dual Heavy Bogie) ---
  if (car.type.startsWith('trailer_semi')) {
    const isLowboy = car.type === 'trailer_semi_lowboy';
    const axleXs = isLowboy
      ? [-halfL * 0.52, -halfL * 0.68, -halfL * 0.84]
      : [-halfL * 0.46, -halfL * 0.64, -halfL * 0.82];
    const tireL = isLowboy ? 9.6 : 10.6;
    const tireW = 3.1;
    const outerY = halfW - 1.15;
    const innerY = outerY - tireW - 0.55;

    for (const ax of axleXs) {
      drawRoundedBox(ctx, ax - 1.0, -innerY, ax + 1.0, innerY, 0.35, '#1e293b', deform);
      for (const side of [-1, 1] as const) {
        const [ox, oy] = deform(ax, side * outerY);
        const [ix, iy] = deform(ax, side * innerY);
        drawTreadedTire(ctx, ix, iy, tireL, tireW, 0, 'heavy', '#64748b');
        drawTreadedTire(ctx, ox, oy, tireL, tireW, 0, 'heavy', '#94a3b8');
      }
    }
  }
}

// ============================================================================
// 2. CHASSIS LAYER (Lower structural frame, tractors hood/ballast, articulated machinery base, trailer underbody)
// ============================================================================
export function renderHeavyEquipmentChassisLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const opt = getLiveOpticsState(car);
  const paint = car.color || '#2563eb';

  // --- TRACTORS CHASSIS / HOOD / BALLAST / 3-POINT HITCH ---
  if (isRedrawnTractor(car.type)) {
    const isOld = car.type === 'tractor_mtz80_old';
    const is82 = car.type === 'tractor_mtz82';
    const hoodOpen = isVehicleHoodExposed(car);
    const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.55, paint);

    // Central cast-iron tractor semi-frame & transmission tunnel
    drawRoundedBox(ctx, -halfL * 0.68, -3.3, halfL * 0.72, 3.3, 0.8, '#1e293b', deform, '#0f172a', 0.55);

    // Heavy front cast-iron ballast suitcase weights rack (stacked cast iron plates)
    const balX1 = halfL * 0.80;
    const balX2 = halfL * 0.99;
    drawRoundedBox(ctx, balX1, -4.15, balX2, 4.15, 0.55, '#1e293b', deform, '#0f172a', 0.55);
    const weightCount = is82 ? 8 : 6;
    const span = 7.2;
    for (let i = 0; i < weightCount; i++) {
      const wy = -span * 0.5 + (span * (i + 0.5)) / weightCount;
      drawRoundedBox(
        ctx,
        balX1 + 0.4,
        wy - 0.42,
        balX2 - 0.35,
        wy + 0.42,
        0.18,
        i % 2 === 0 ? '#334155' : '#475569',
        deform,
        '#0f172a',
        0.28
      );
    }
    // Front tow clevis pin
    drawDeformedDot(ctx, balX2 + 0.15, 0, 0.75, '#94a3b8', deform, '#0f172a', 0.35);

    // Sculpted narrow MTZ Engine Hood (hidden when player opens hood to reveal D-243 engine bay)
    const hoodFront = halfL * 0.78;
    const hoodRear = halfL * 0.04;
    const hoodHalfW = isOld ? 4.2 : 4.55;
    if (!hoodOpen) {
      const hoodPts: Pt[] = [
        [hoodFront, -hoodHalfW * 0.82],
        [hoodFront + 0.8, -hoodHalfW * 0.45],
        [hoodFront + 0.8, hoodHalfW * 0.45],
        [hoodFront, hoodHalfW * 0.82],
        [hoodRear, hoodHalfW],
        [hoodRear, -hoodHalfW],
      ];
      fillPoly(ctx, hoodPts, bodyGrad, deform, '#0f172a', 0.65);

      // Center hood seam crease + cooling louver slots along flanks
      strokePoly(ctx, [[hoodFront + 0.4, 0], [hoodRear + 0.6, 0]], shadePaint(paint, 0.25), 0.75, deform);
      for (let lx = hoodRear + 2.2; lx <= hoodFront - 2.6; lx += 1.65) {
        strokePoly(ctx, [[lx, -hoodHalfW + 0.55], [lx, -hoodHalfW + 1.55]], '#0f172a', 0.45, deform);
        strokePoly(ctx, [[lx, hoodHalfW - 0.55], [lx, hoodHalfW - 1.55]], '#0f172a', 0.45, deform);
      }

      // Black radiator front grille trim & iconic vertical nose badge
      drawRoundedBox(ctx, hoodFront - 0.35, -hoodHalfW * 0.68, hoodFront + 0.75, hoodHalfW * 0.68, 0.35, '#0f172a', deform);
      drawRoundedBox(ctx, hoodFront - 0.1, -1.2, hoodFront + 0.85, 1.2, 0.2, '#cbd5e1', deform);

      // Vertical exhaust muffler stack (right side) & mushroom air pre-cleaner intake (left side)
      drawDeformedDot(ctx, halfL * 0.42, 3.05, 1.25, '#1e293b', deform, '#0f172a', 0.45);
      drawDeformedDot(ctx, halfL * 0.42, 3.05, 0.65, '#475569', deform);
      drawDeformedDot(ctx, halfL * 0.56, -2.65, 1.05, '#0f172a', deform, '#64748b', 0.38);
      // Radiator filler cap
      drawDeformedDot(ctx, hoodFront - 1.4, 0, 0.55, '#cbd5e1', deform, '#334155', 0.3);
    }

    // Side-mounted Tractor Headlights on steel brackets flanking the radiator nose
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const hx = halfL * 0.70;
      const hy = side * (hoodHalfW + 1.55);
      strokePoly(ctx, [[hx, side * hoodHalfW], [hx, hy]], '#1e293b', 0.9, deform);
      drawRoundedBox(ctx, hx - 1.45, hy - 1.15, hx + 0.95, hy + 1.15, 0.55, '#0f172a', deform, '#334155', 0.38);
      const lensCol = broken
        ? '#090d16'
        : opt.highBeam
        ? '#ffffff'
        : opt.headlightsOn
        ? '#fef08a'
        : opt.positionOn
        ? '#fde68a'
        : '#94a3b8';
      drawRoundedBox(ctx, hx + 0.35, hy - 0.92, hx + 1.15, hy + 0.92, 0.35, lensCol, deform);
      if (!broken && (opt.headlightsOn || opt.positionOn)) {
        drawDeformedDot(ctx, hx + 0.78, hy, 0.4, '#ffffff', deform);
      }
      // Front amber turn signal pod inboard of fender/cab cowl
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const ty = side * (hoodHalfW + 2.35);
      drawRoundedBox(
        ctx,
        halfL * 0.14,
        ty - 0.65,
        halfL * 0.25,
        ty + 0.65,
        0.25,
        turnInt > 0.06 ? '#f59e0b' : '#92400e',
        deform,
        '#0f172a',
        0.3
      );
    }

    // Rear 3-Point Hydraulic Hitch (Навеска МТЗ) + PTO guard + rear hitch drawbar
    const hitchRearX = -halfL * 0.98;
    const hitchBaseX = -halfL * 0.68;
    strokePoly(ctx, [[hitchBaseX, -3.8], [hitchRearX, -2.4]], '#334155', 1.45, deform);
    strokePoly(ctx, [[hitchBaseX, 3.8], [hitchRearX, 2.4]], '#334155', 1.45, deform);
    strokePoly(ctx, [[hitchBaseX + 0.8, 0], [hitchRearX + 0.8, 0]], '#475569', 1.15, deform);
    strokePoly(ctx, [[hitchRearX, -2.5], [hitchRearX, 2.5]], '#1e293b', 1.25, deform);
    drawDeformedDot(ctx, hitchRearX, 0, 1.05, '#94a3b8', deform, '#0f172a', 0.4);
    drawDeformedDot(ctx, hitchRearX, -2.4, 0.65, '#cbd5e1', deform);
    drawDeformedDot(ctx, hitchRearX, 2.4, 0.65, '#cbd5e1', deform);
    return;
  }

  // --- ROAD MACHINERY CHASSIS BASE ---
  if (car.type === 'paver_asphalt_wheeled') {
    // Heavy solid rubber drive wheels (rear) + twin steered bogie wheels (front)
    const rearAxleX = -halfL * 0.34;
    const frontBogie1 = halfL * 0.08;
    const frontBogie2 = halfL * 0.34;
    const steer = car.steerAngle || 0;

    for (const side of [-1, 1] as const) {
      const [rx, ry] = deform(rearAxleX, side * (halfW * 0.72));
      drawTreadedTire(ctx, rx, ry, 10.6, 4.2, 0, 'heavy', '#f59e0b');
      const [f1x, f1y] = deform(frontBogie1, side * (halfW * 0.66));
      const [f2x, f2y] = deform(frontBogie2, side * (halfW * 0.66));
      drawTreadedTire(ctx, f1x, f1y, 5.8, 2.6, steer, 'slick', '#475569');
      drawTreadedTire(ctx, f2x, f2y, 5.8, 2.6, steer, 'slick', '#475569');
    }

    // Main lower structural chassis frame
    drawRoundedBox(ctx, -halfL * 0.66, -halfW * 0.76, halfL * 0.78, halfW * 0.76, 1.0, '#1e293b', deform, '#0f172a', 0.6);

    // Front dump-truck push roller beam
    drawRoundedBox(ctx, halfL * 0.88, -halfW * 0.82, halfL * 0.99, halfW * 0.82, 0.4, '#334155', deform, '#0f172a', 0.5);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, halfL * 0.84, side * halfW * 0.48 - 1.5, halfL * 0.99, side * halfW * 0.48 + 1.5, 0.6, '#0f172a', deform, '#64748b', 0.38);
    }

    // Rear extending hydraulic asphalt screed bar (выглаживающая плита)
    const screedFront = -halfL * 0.64;
    const screedRear = -halfL * 0.97;
    drawRoundedBox(ctx, screedRear, -halfW * 1.02, screedFront, halfW * 1.02, 0.75, '#1e293b', deform, '#0f172a', 0.65);
    // Heated vibrating screed deck & yellow/orange side extension end-gates
    drawRoundedBox(ctx, screedRear + 0.8, -halfW * 0.96, screedFront - 0.8, halfW * 0.96, 0.45, shadePaint(paint, -0.08), deform, '#0f172a', 0.5);
    // Screw auger tunnel & hot asphalt sheen along front of screed
    drawRoundedBox(ctx, screedFront - 1.1, -halfW * 0.94, screedFront + 1.5, halfW * 0.94, 0.3, '#0c0a09', deform);
    for (let ay = -halfW * 0.86; ay <= halfW * 0.86; ay += 2.2) {
      strokePoly(ctx, [[screedFront - 0.6, ay - 0.7], [screedFront + 0.8, ay + 0.7]], '#475569', 0.75, deform);
    }
    // Twin hydraulic tow-arms connecting screed to tractor chassis
    strokePoly(ctx, [[-halfL * 0.14, -halfW * 0.82], [screedFront, -halfW * 0.88]], '#334155', 1.65, deform);
    strokePoly(ctx, [[-halfL * 0.14, halfW * 0.82], [screedFront, halfW * 0.88]], '#334155', 1.65, deform);
    // Depth-control crank handwheels on screed corners
    drawDeformedDot(ctx, screedRear + 1.6, -halfW * 0.84, 1.15, '#e2e8f0', deform, '#0f172a', 0.4);
    drawDeformedDot(ctx, screedRear + 1.6, halfW * 0.84, 1.15, '#e2e8f0', deform, '#0f172a', 0.4);
    return;
  }

  if (car.type === 'roller_heavy_tandem' || car.type === 'roller_compact_sidewalk') {
    const isMini = car.type === 'roller_compact_sidewalk';
    const steerArtic = (car.steerAngle || 0) * (isMini ? 0.55 : 0.50);
    const drumL = isMini ? 5.8 : 9.4;
    const drumW = halfW * (isMini ? 1.72 : 1.78);
    const rearDrumX = -halfL * (isMini ? 0.62 : 0.64);
    const frontDrumX = halfL * (isMini ? 0.62 : 0.64);
    const yokeColor = paint || '#eab308';

    const drawSteelDrum = (cx: number, w: number, l: number) => {
      const grad = ctx.createLinearGradient(cx - l * 0.5, 0, cx + l * 0.5, 0);
      grad.addColorStop(0.0, '#1e293b');
      grad.addColorStop(0.22, '#64748b');
      grad.addColorStop(0.45, '#cbd5e1');
      grad.addColorStop(0.62, '#94a3b8');
      grad.addColorStop(0.86, '#475569');
      grad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(cx - l * 0.5, -w * 0.5, l, w, 0.75);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Machined drum seam grooves & pressurized water spray bar
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(cx - l * 0.5, -w * 0.38);
      ctx.lineTo(cx + l * 0.5, -w * 0.38);
      ctx.moveTo(cx - l * 0.5, w * 0.38);
      ctx.lineTo(cx + l * 0.5, w * 0.38);
      ctx.stroke();

      // Heavy outer steel yoke frame rails & scraper bars
      const railW = isMini ? 1.25 : 1.75;
      ctx.fillStyle = yokeColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.roundRect(cx - l * 0.5 - 1.2, -w * 0.5 - railW, l + 2.4, railW, 0.4);
      ctx.roundRect(cx - l * 0.5 - 1.2, w * 0.5, l + 2.4, railW, 0.4);
      ctx.fill();
      ctx.stroke();
      // Scraper blade crossbars fore & aft of drum
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - l * 0.5 - 1.35, -w * 0.5, 1.0, w);
      ctx.fillRect(cx + l * 0.5 + 0.35, -w * 0.5, 1.0, w);
    };

    // Rear fixed frame & rear compaction drum
    drawSteelDrum(rearDrumX, drumW, drumL);
    // Central hydraulic articulation joint & twin steering cylinders
    drawRoundedBox(ctx, -halfL * 0.14, -halfW * 0.55, halfL * 0.14, halfW * 0.55, 0.7, '#334155', deform, '#0f172a', 0.55);
    drawDeformedDot(ctx, 0, 0, isMini ? 1.4 : 2.1, '#94a3b8', deform, '#0f172a', 0.5);

    // Front articulated half-frame pivoting smoothly by steerArtic!
    ctx.save();
    ctx.rotate(steerArtic);
    // Front frame yoke bridge connecting articulation hinge to front drum
    ctx.fillStyle = shadePaint(yokeColor, -0.08);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.roundRect(0.5, -drumW * 0.42, frontDrumX - drumL * 0.5, drumW * 0.84, 0.8);
    ctx.fill();
    ctx.stroke();
    drawSteelDrum(frontDrumX, drumW, drumL);

    // Integrated front work headlights mounted on front drum frame crossbar
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const ly = side * (drumW * 0.36);
      const lx = frontDrumX + drumL * 0.5 + 0.6;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(lx - 0.5, ly - 1.05, 1.4, 2.1);
      ctx.fillStyle = broken ? '#090d16' : opt.headlightsOn ? '#fef08a' : opt.positionOn ? '#fde68a' : '#94a3b8';
      ctx.fillRect(lx + 0.15, ly - 0.8, 0.9, 1.6);
    }
    ctx.restore();
    return;
  }

  if (car.type === 'roller_pneumatic') {
    const steerArtic = (car.steerAngle || 0) * 0.46;
    const tireL = 8.4;
    const tireW = 2.65;

    // Rear 5 overlapping smooth pneumatic compactor tires
    const rearAxleX = -halfL * 0.64;
    for (let i = -2; i <= 2; i++) {
      const ty = i * 3.35;
      const [tx, tty] = deform(rearAxleX, ty);
      drawTreadedTire(ctx, tx, tty, tireL, tireW, 0, 'slick', '#475569');
    }

    // Front 4 staggered smooth pneumatic compactor tires pivoting with front steering carriage
    const frontAxleX = halfL * 0.62;
    ctx.save();
    ctx.translate(frontAxleX, 0);
    ctx.rotate(steerArtic);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-1.4, -halfW * 0.72, 2.8, halfW * 1.44);
    for (const iy of [-5.0, -1.68, 1.68, 5.0]) {
      drawTreadedTire(ctx, 0, iy, tireL, tireW, 0, 'slick', '#475569');
    }
    ctx.restore();

    // Heavy rectangular steel ballast hull
    const hullGrad = createBodyMetallicGradient(ctx, halfW, paint || '#eab308');
    drawRoundedBox(ctx, -halfL * 0.92, -halfW * 0.92, halfL * 0.92, halfW * 0.92, 2.2, hullGrad, deform, '#0f172a', 0.7);
    // Wheel-well recesses showing top crowns of pneumatic tires
    drawRoundedBox(ctx, halfL * 0.36, -halfW * 0.84, halfL * 0.88, halfW * 0.84, 0.8, 'rgba(15,23,42,0.38)', deform);
    drawRoundedBox(ctx, -halfL * 0.88, -halfW * 0.84, -halfL * 0.38, halfW * 0.84, 0.8, 'rgba(15,23,42,0.38)', deform);
    return;
  }

  // --- TRAILERS CHASSIS LAYER ---
  if (car.type === 'trailer_barrel' || car.type === 'trailer_vacuum') {
    const isVac = car.type === 'trailer_vacuum';
    const hitchX = car.couplerOffset !== undefined ? car.couplerOffset : halfL + 8;

    // A-frame forged steel drawbar synchronized with physics couplerOffset
    strokePoly(ctx, [[halfL * 0.25, 0], [hitchX, 0]], '#1e293b', isVac ? 2.6 : 2.3, deform);
    strokePoly(ctx, [[halfL * 0.25, -halfW * 0.48], [hitchX, 0]], '#334155', 1.8, deform);
    strokePoly(ctx, [[halfL * 0.25, halfW * 0.48], [hitchX, 0]], '#334155', 1.8, deform);
    // Tow ring coupler + safety chain loop
    drawDeformedDot(ctx, hitchX, 0, 2.25, '#cbd5e1', deform, '#1e293b', 0.55);
    drawDeformedDot(ctx, hitchX, 0, 0.95, '#0f172a', deform);

    // Steel chassis undercarriage frame rails
    drawRoundedBox(ctx, -halfL * 0.88, -halfW * 0.56, halfL * 0.52, halfW * 0.56, 0.6, '#1e293b', deform, '#0f172a', 0.45);
    return;
  }

  if (car.type === 'trailer_flatbed_2axle') {
    // Main steel ladder frame under the wooden/steel bed
    drawRoundedBox(ctx, -halfL * 0.94, -halfW * 0.88, halfL * 0.90, halfW * 0.88, 0.9, '#1e293b', deform, '#0f172a', 0.55);
    return;
  }

  if (car.type.startsWith('trailer_semi')) {
    drawSemiKingpinApron(ctx, halfL, halfW, deform);
    drawSemiLandingGear(ctx, halfL * 0.44, halfW, !car.towedById, deform);
    // Side cyclist underrun protection bars along mid flanks
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[-halfL * 0.34, side * (halfW - 0.55)], [halfL * 0.32, side * (halfW - 0.55)]], '#94a3b8', 0.85, deform);
    }
  }
}

// ============================================================================
// 3. UPPER LAYER (Cabs, Canopies, Tank Bodies, Containers, Decks, Integrated Lights)
// ============================================================================
export function renderHeavyEquipmentUpperLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const opt = getLiveOpticsState(car);
  const paint = car.color || '#2563eb';
  const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;

  // --- MTZ TRACTORS UPPER CAB, ROOF, FENDERS, WORK LIGHTS & BEACON ---
  if (isRedrawnTractor(car.type)) {
    const isOld = car.type === 'tractor_mtz80_old';
    const roofBase = car.roofColor && car.roofColor !== paint ? car.roofColor : isOld ? paint : '#f8fafc';
    const roofGrad = createRoofGradient(ctx, halfW * 0.55, roofBase);

    // Wide rear wheel fenders flanking the cab
    const fenderFront = -halfL * 0.14;
    const fenderRear = -halfL * 0.84;
    const fenderInner = isOld ? 4.4 : 5.1;
    const fenderOuter = halfW + 0.65;
    for (const side of [-1, 1] as const) {
      const y1 = side < 0 ? -fenderOuter : fenderInner;
      const y2 = side < 0 ? -fenderInner : fenderOuter;
      drawRoundedBox(ctx, fenderRear, y1, fenderFront, y2, 1.0, paint, deform, '#0f172a', 0.55);
      // Black rubber fender flare lip
      drawRoundedBox(
        ctx,
        fenderRear + 0.4,
        side < 0 ? -fenderOuter - 0.45 : fenderOuter - 0.35,
        fenderFront - 0.4,
        side < 0 ? -fenderOuter + 0.35 : fenderOuter + 0.45,
        0.3,
        '#0f172a',
        deform
      );

      // Integrated Rear Tractor Tail / Brake / Turn cluster on rear fender edge
      const broken = side < 0 ? opt.leftTailBroken : opt.rightTailBroken;
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const fy = side * ((fenderInner + fenderOuter) * 0.5);
      drawRoundedBox(ctx, fenderRear - 0.65, fy - 1.65, fenderRear + 0.45, fy + 1.65, 0.28, '#0f172a', deform);
      if (!broken) {
        const brakeCol = opt.braking ? '#ef4444' : opt.positionOn ? '#dc2626' : '#7f1d1d';
        drawRoundedBox(ctx, fenderRear - 0.5, fy - 1.4, fenderRear + 0.25, fy + 0.15, 0.15, brakeCol, deform);
        drawRoundedBox(
          ctx,
          fenderRear - 0.5,
          fy + 0.22,
          fenderRear + 0.25,
          fy + 1.4,
          0.15,
          turnInt > 0.06 ? '#f59e0b' : '#92400e',
          deform
        );
      }
    }

    // Cab Greenhouse (Wide panoramic UK cab vs narrow MK small cab)
    const cabFront = halfL * 0.08;
    const cabRear = -halfL * 0.72;
    const cabHalfW = isOld ? 4.8 : 6.15;
    const wsGrad = createGlassGradient(ctx, cabRear, -cabHalfW, cabFront, cabHalfW, 'green');

    // Outer glass perimeter frame
    drawRoundedBox(ctx, cabRear, -cabHalfW, cabFront, cabHalfW, 1.35, wsGrad, deform, '#0f172a', 0.7);
    // Steel cab corner pillars
    strokePoly(ctx, [[cabFront - 1.5, -cabHalfW + 0.4], [cabFront, -cabHalfW + 0.4]], '#1e293b', 0.85, deform);
    strokePoly(ctx, [[cabFront - 1.5, cabHalfW - 0.4], [cabFront, cabHalfW - 0.4]], '#1e293b', 0.85, deform);
    strokePoly(ctx, [[cabRear, -cabHalfW + 0.4], [cabRear + 1.4, -cabHalfW + 0.4]], '#1e293b', 0.85, deform);
    strokePoly(ctx, [[cabRear, cabHalfW - 0.4], [cabRear + 1.4, cabHalfW - 0.4]], '#1e293b', 0.85, deform);

    // Molded Cab Roof Panel with sun-visor overhang
    const roofFront = cabFront - (isOld ? 1.8 : 1.5);
    const roofRear = cabRear + 1.3;
    const roofHW = cabHalfW - 0.95;
    drawRoundedBox(ctx, roofRear, -roofHW, roofFront, roofHW, 1.15, roofGrad, deform, '#0f172a', 0.58);
    // Stamped roof ventilation hatch lid
    drawRoundedBox(
      ctx,
      roofRear + 2.2,
      -roofHW * 0.58,
      roofFront - 2.6,
      roofHW * 0.58,
      0.65,
      shadePaint(roofBase, -0.06),
      deform,
      'rgba(15,23,42,0.45)',
      0.45
    );

    // Roof-mounted front & rear halogen work floodlights
    const workFrontLit = opt.headlightsOn || opt.frontFogOn;
    const workRearLit = opt.reversing || opt.rearFogOn;
    for (const side of [-1, 1] as const) {
      const wy = side * (roofHW * 0.68);
      drawRoundedBox(
        ctx,
        roofFront - 0.3,
        wy - 0.75,
        roofFront + 0.65,
        wy + 0.75,
        0.22,
        workFrontLit ? '#fef9c3' : '#94a3b8',
        deform,
        '#0f172a',
        0.3
      );
      drawRoundedBox(
        ctx,
        roofRear - 0.65,
        wy - 0.7,
        roofRear + 0.3,
        wy + 0.7,
        0.22,
        workRearLit ? '#ffffff' : '#64748b',
        deform,
        '#0f172a',
        0.3
      );
    }

    // External tractor side mirrors on tubular arms
    drawSideMirrorArm(ctx, cabFront - 1.2, -cabHalfW, -1, 2.1, 1.3, 0.85, '#1e293b', deform);
    drawSideMirrorArm(ctx, cabFront - 1.2, cabHalfW, 1, 2.1, 1.3, 0.85, '#1e293b', deform);

    // Live flashing amber roof beacon
    drawAmberBeacon(ctx, roofFront - 1.5, -roofHW * 0.55, 1.05, opt.ignitionOn || opt.sirenOn, deform, nowSec);
    return;
  }

  // --- ASPHALT PAVER UPPER HOPPER, ENGINE DECK, OPERATOR CANOPY & BEACONS ---
  if (car.type === 'paver_asphalt_wheeled') {
    const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.85, paint || '#f59e0b');

    // Front Wide Folding Asphalt Hopper with Dark Hot-Mix Asphalt Load
    const hopFront = halfL * 0.84;
    const hopRear = halfL * 0.08;
    const hopOuter = halfW * 0.94;
    const hopInner = halfW * 0.52;

    // Folding side hopper wings (painted yellow/orange with steel wear plates)
    fillPoly(
      ctx,
      [
        [hopFront, -hopOuter],
        [hopRear, -hopOuter],
        [hopRear, -hopInner],
        [hopFront, -hopInner * 0.85],
      ],
      bodyGrad,
      deform,
      '#0f172a',
      0.58
    );
    fillPoly(
      ctx,
      [
        [hopFront, hopOuter],
        [hopRear, hopOuter],
        [hopRear, hopInner],
        [hopFront, hopInner * 0.85],
      ],
      bodyGrad,
      deform,
      '#0f172a',
      0.58
    );

    // Inner hopper well filled with dark textured hot-mix asphalt & twin slat bar conveyors
    drawRoundedBox(ctx, hopRear, -hopInner, hopFront, hopInner, 0.45, '#18181b', deform, '#09090b', 0.5);
    // Hot asphalt mound gradient inside hopper
    const mixGrad = ctx.createRadialGradient((hopFront + hopRear) * 0.5, 0, 1.5, (hopFront + hopRear) * 0.5, 0, hopInner * 1.1);
    mixGrad.addColorStop(0.0, '#27272a');
    mixGrad.addColorStop(0.65, '#18181b');
    mixGrad.addColorStop(1.0, '#09090b');
    drawRoundedBox(ctx, hopRear + 1.0, -hopInner + 0.8, hopFront - 1.2, hopInner - 0.8, 0.8, mixGrad, deform);
    // Twin slat bar conveyor tracks
    for (const cy of [-2.4, 2.4]) {
      drawRoundedBox(ctx, hopRear + 0.5, cy - 1.2, hopFront - 1.0, cy + 1.2, 0.2, 'rgba(71,85,105,0.28)', deform);
      for (let sx = hopRear + 1.4; sx <= hopFront - 1.8; sx += 2.2) {
        strokePoly(ctx, [[sx, cy - 1.0], [sx, cy + 1.0]], '#52525b', 0.55, deform);
      }
    }

    // Mid-Mounted Diesel Powerpack Deck with Radiator Louvers & Chrome Exhaust Stack
    const deckFront = halfL * 0.08;
    const deckRear = -halfL * 0.34;
    drawRoundedBox(ctx, deckRear, -halfW * 0.78, deckFront, halfW * 0.78, 0.95, bodyGrad, deform, '#0f172a', 0.6);
    // Black perforated radiator intake grille
    drawRoundedBox(ctx, deckRear + 1.6, -halfW * 0.58, deckFront - 1.6, halfW * 0.58, 0.45, '#1e293b', deform, '#0f172a', 0.45);
    for (let gx = deckRear + 2.6; gx <= deckFront - 2.4; gx += 1.45) {
      strokePoly(ctx, [[gx, -halfW * 0.52], [gx, halfW * 0.52]], '#090d16', 0.55, deform);
    }
    // Vertical chrome exhaust stack + pre-cleaner
    drawDeformedDot(ctx, deckFront - 2.2, halfW * 0.64, 1.3, '#cbd5e1', deform, '#0f172a', 0.45);
    drawDeformedDot(ctx, deckFront - 2.2, halfW * 0.64, 0.65, '#0f172a', deform);

    // Operator Platform & Weather Canopy (ROPS/FOPS roof over rear deck)
    const cabFront = -halfL * 0.28;
    const cabRear = -halfL * 0.66;
    const cabHW = halfW * 0.80;
    // Operator deck anti-slip floor & twin sliding control seats
    drawRoundedBox(ctx, cabRear, -cabHW, cabFront, cabHW, 0.8, '#334155', deform, '#0f172a', 0.55);
    drawRoundedBox(ctx, cabRear + 1.5, -cabHW * 0.68, cabRear + 5.2, -cabHW * 0.22, 0.7, '#18181b', deform);
    drawRoundedBox(ctx, cabRear + 1.5, cabHW * 0.22, cabRear + 5.2, cabHW * 0.68, 0.7, '#18181b', deform);
    // Overhead sun canopy with translucent ribbed shading
    const canGrad = createRoofGradient(ctx, cabHW, '#f8fafc');
    drawRoundedBox(ctx, cabRear + 0.6, -cabHW * 0.92, cabFront - 0.5, cabHW * 0.92, 1.15, canGrad, deform, '#1e293b', 0.6);
    strokePoly(ctx, [[cabRear + 3.2, -cabHW * 0.84], [cabRear + 3.2, cabHW * 0.84]], 'rgba(15,23,42,0.22)', 0.55, deform);
    strokePoly(ctx, [[cabFront - 3.0, -cabHW * 0.84], [cabFront - 3.0, cabHW * 0.84]], 'rgba(15,23,42,0.22)', 0.55, deform);

    // Integrated front work lamps on canopy front edge + rear screed floodlights + twin amber beacons
    for (const side of [-1, 1] as const) {
      const ly = side * (cabHW * 0.62);
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      drawRoundedBox(
        ctx,
        cabFront - 0.6,
        ly - 0.9,
        cabFront + 0.45,
        ly + 0.9,
        0.22,
        broken ? '#090d16' : opt.headlightsOn ? '#fef08a' : '#94a3b8',
        deform,
        '#0f172a',
        0.3
      );
      drawRoundedBox(
        ctx,
        cabRear - 0.2,
        ly - 0.85,
        cabRear + 0.75,
        ly + 0.85,
        0.22,
        opt.braking ? '#ef4444' : opt.reversing ? '#ffffff' : opt.positionOn ? '#dc2626' : '#7f1d1d',
        deform,
        '#0f172a',
        0.3
      );
    }
    drawAmberBeacon(ctx, cabFront - 1.6, -cabHW * 0.72, 1.15, opt.ignitionOn || opt.sirenOn, deform, nowSec);
    drawAmberBeacon(ctx, cabFront - 1.6, cabHW * 0.72, 1.15, opt.ignitionOn || opt.sirenOn, deform, nowSec);
    return;
  }

  // --- TANDEM HEAVY & COMPACT SIDEWALK ROLLERS UPPER BODY & CANOPY ---
  if (car.type === 'roller_heavy_tandem' || car.type === 'roller_compact_sidewalk') {
    const isMini = car.type === 'roller_compact_sidewalk';
    const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.85, paint || '#eab308');

    // Rear engine hood + water tank hull over rear drum
    const rearFront = isMini ? -halfL * 0.04 : -halfL * 0.02;
    const rearBack = -halfL * (isMini ? 0.84 : 0.86);
    const hullHW = halfW * (isMini ? 0.82 : 0.86);
    drawRoundedBox(ctx, rearBack, -hullHW, rearFront, hullHW, 1.4, bodyGrad, deform, '#0f172a', 0.6);

    // Engine cooling grille & black pressurized drum-sprinkler water tank cap
    drawRoundedBox(ctx, rearBack + 1.4, -hullHW * 0.65, rearBack + (isMini ? 4.4 : 7.6), hullHW * 0.65, 0.5, '#1e293b', deform, '#0f172a', 0.4);
    for (let lx = rearBack + 2.2; lx <= rearBack + (isMini ? 3.8 : 7.0); lx += 1.3) {
      strokePoly(ctx, [[lx, -hullHW * 0.56], [lx, hullHW * 0.56]], '#090d16', 0.5, deform);
    }
    drawDeformedDot(ctx, rearFront - 1.5, hullHW * 0.45, isMini ? 0.65 : 0.9, '#0f172a', deform, '#64748b', 0.35);

    // Elevated operator cockpit deck + swivel seat + steering console
    const opFront = halfL * (isMini ? 0.36 : 0.40);
    const opRear = -halfL * (isMini ? 0.24 : 0.30);
    const opHW = halfW * (isMini ? 0.74 : 0.78);
    drawRoundedBox(ctx, opRear, -opHW, opFront, opHW, 1.0, '#1e293b', deform, '#0f172a', 0.55);
    // Operator seat
    drawRoundedBox(ctx, opRear + 1.2, -opHW * 0.42, opRear + (isMini ? 4.2 : 6.2), opHW * 0.42, 0.75, '#09090b', deform, '#334155', 0.4);
    // Steering wheel & dash console
    drawDeformedDot(ctx, opFront - (isMini ? 2.1 : 3.2), 0, isMini ? 1.2 : 1.7, '#0f172a', deform, '#94a3b8', 0.45);

    if (isMini) {
      // Folding black steel ROPS roll-bar arch behind operator
      drawRoundedBox(ctx, opRear + 0.3, -opHW * 0.96, opRear + 1.45, opHW * 0.96, 0.35, '#0f172a', deform, '#475569', 0.35);
      drawAmberBeacon(ctx, opRear + 0.88, -opHW * 0.62, 0.85, opt.ignitionOn || opt.sirenOn, deform, nowSec);
    } else {
      // Full heavy ROPS canopy roof on 4 dark steel posts
      const canGrad = createRoofGradient(ctx, opHW, '#f8fafc');
      drawRoundedBox(ctx, opRear + 0.4, -opHW * 0.94, opFront - 0.6, opHW * 0.94, 1.25, canGrad, deform, '#1e293b', 0.65);
      drawAmberBeacon(ctx, opRear + 2.0, 0, 1.15, opt.ignitionOn || opt.sirenOn, deform, nowSec);
      // Canopy work lamps
      for (const side of [-1, 1] as const) {
        drawRoundedBox(
          ctx,
          opFront - 0.8,
          side * opHW * 0.65 - 0.75,
          opFront + 0.2,
          side * opHW * 0.65 + 0.75,
          0.2,
          opt.headlightsOn ? '#fef08a' : '#94a3b8',
          deform,
          '#0f172a',
          0.3
        );
      }
    }

    // Integrated rear red tail/brake + amber turn lights on rear hull edge
    for (const side of [-1, 1] as const) {
      const ly = side * (hullHW * 0.68);
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      drawRoundedBox(
        ctx,
        rearBack - 0.55,
        ly - 1.3,
        rearBack + 0.4,
        ly + 1.3,
        0.22,
        '#0f172a',
        deform
      );
      drawRoundedBox(
        ctx,
        rearBack - 0.42,
        ly - 1.1,
        rearBack + 0.2,
        ly + 0.1,
        0.14,
        opt.braking ? '#ef4444' : opt.positionOn ? '#dc2626' : '#7f1d1d',
        deform
      );
      drawRoundedBox(
        ctx,
        rearBack - 0.42,
        ly + 0.15,
        rearBack + 0.2,
        ly + 1.1,
        0.14,
        turnInt > 0.06 ? '#f59e0b' : '#92400e',
        deform
      );
    }
    return;
  }

  // --- PNEUMATIC TIRE ROLLER UPPER CAB & BALLAST DECK ---
  if (car.type === 'roller_pneumatic') {
    const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.85, paint || '#eab308');
    // Sloped front diesel bonnet + radiator grille
    drawRoundedBox(ctx, halfL * 0.16, -halfW * 0.62, halfL * 0.86, halfW * 0.62, 1.2, bodyGrad, deform, '#0f172a', 0.55);
    drawRoundedBox(ctx, halfL * 0.62, -halfW * 0.48, halfL * 0.82, halfW * 0.48, 0.4, '#1e293b', deform);
    // Exhaust pipe
    drawDeformedDot(ctx, halfL * 0.44, halfW * 0.52, 1.05, '#1e293b', deform, '#94a3b8', 0.35);

    // Panoramic Enclosed Operator Cab over rear/center ballast block
    const cabFront = halfL * 0.22;
    const cabRear = -halfL * 0.46;
    const cabHW = halfW * 0.78;
    const wsGrad = createGlassGradient(ctx, cabRear, -cabHW, cabFront, cabHW, 'smoke');
    drawRoundedBox(ctx, cabRear, -cabHW, cabFront, cabHW, 1.4, wsGrad, deform, '#0f172a', 0.65);
    const roofGrad = createRoofGradient(ctx, cabHW * 0.84, '#f8fafc');
    drawRoundedBox(ctx, cabRear + 1.6, -cabHW * 0.82, cabFront - 1.8, cabHW * 0.82, 1.15, roofGrad, deform, '#1e293b', 0.55);
    drawAmberBeacon(ctx, cabRear + 3.2, 0, 1.15, opt.ignitionOn || opt.sirenOn, deform, nowSec);

    // Rear ballast water-sprinkler access hatch
    drawRoundedBox(ctx, -halfL * 0.86, -halfW * 0.64, -halfL * 0.52, halfW * 0.64, 0.7, '#334155', deform, '#0f172a', 0.45);
    drawDeformedDot(ctx, -halfL * 0.69, 0, 1.4, '#1e293b', deform, '#64748b', 0.4);

    // Integrated front headlights + rear brake/turn lamps
    for (const side of [-1, 1] as const) {
      const ly = side * (halfW * 0.66);
      const brokenF = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      drawRoundedBox(
        ctx,
        halfL * 0.85,
        ly - 1.1,
        halfL * 0.96,
        ly + 1.1,
        0.25,
        brokenF ? '#090d16' : opt.headlightsOn ? '#fef08a' : '#94a3b8',
        deform,
        '#0f172a',
        0.35
      );
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      drawRoundedBox(ctx, -halfL * 0.96, ly - 1.45, -halfL * 0.86, ly + 1.45, 0.25, '#0f172a', deform);
      drawRoundedBox(
        ctx,
        -halfL * 0.95,
        ly - 1.25,
        -halfL * 0.88,
        ly + 0.15,
        0.15,
        opt.braking ? '#ef4444' : opt.positionOn ? '#dc2626' : '#7f1d1d',
        deform
      );
      drawRoundedBox(
        ctx,
        -halfL * 0.95,
        ly + 0.2,
        -halfL * 0.88,
        ly + 1.25,
        0.15,
        turnInt > 0.06 ? '#f59e0b' : '#92400e',
        deform
      );
    }
    return;
  }

  // --- FARM BARREL TRAILER (AgriTech FarmTank 3.5m3) ---
  if (car.type === 'trailer_barrel') {
    const tankFront = halfL * 0.66;
    const tankRear = -halfL * 0.86;
    const tankHW = halfW * 0.74;
    const baseCol = car.color || '#5a81a3';

    // Cylindrical sun-weathered steel barrel shading
    const tankGrad = ctx.createLinearGradient(0, -tankHW, 0, tankHW);
    tankGrad.addColorStop(0.0, shadePaint(baseCol, -0.40));
    tankGrad.addColorStop(0.20, shadePaint(baseCol, 0.26));
    tankGrad.addColorStop(0.45, shadePaint(baseCol, 0.06));
    tankGrad.addColorStop(0.80, shadePaint(baseCol, -0.18));
    tankGrad.addColorStop(1.0, shadePaint(baseCol, -0.46));

    drawRoundedBox(ctx, tankRear, -tankHW, tankFront, tankHW, 2.2, tankGrad, deform, '#1e293b', 0.72);

    // Rolled circumferential steel stiffening ribs & mounting saddle brackets
    for (const rx of [tankRear + (tankFront - tankRear) * 0.28, tankRear + (tankFront - tankRear) * 0.72]) {
      strokePoly(ctx, [[rx, -tankHW], [rx, tankHW]], '#1e293b', 1.15, deform);
      strokePoly(ctx, [[rx + 0.55, -tankHW + 0.4], [rx + 0.55, tankHW - 0.4]], 'rgba(255,255,255,0.22)', 0.5, deform);
    }

    // Top bolted filling manhole hatch (offset forward toward drawbar)
    const hatchX = tankFront - (tankFront - tankRear) * 0.24;
    drawDeformedDot(ctx, hatchX, 0, 2.7, '#1e293b', deform, '#0f172a', 0.5);
    drawDeformedDot(ctx, hatchX, 0, 1.95, baseCol, deform, '#334155', 0.4);
    strokePoly(ctx, [[hatchX - 1.3, 0], [hatchX + 1.3, 0]], '#cbd5e1', 0.7, deform);
    drawDeformedDot(ctx, hatchX, 0, 0.6, '#0f172a', deform);

    // Side steel wheel mudguards over single axle
    const axleX = -halfL * 0.28;
    for (const side of [-1, 1] as const) {
      const fy1 = side < 0 ? -tankHW - 2.1 : tankHW + 0.35;
      const fy2 = side < 0 ? -tankHW - 0.35 : tankHW + 2.1;
      drawRoundedBox(ctx, axleX - 5.6, fy1, axleX + 5.6, fy2, 0.45, '#1e293b', deform, '#0f172a', 0.45);
    }

    // Rear steel bumper with red cat-eye reflectors + authentic brass discharge tap
    const rearBumperX = tankRear - 1.05;
    drawRoundedBox(ctx, rearBumperX - 0.85, -halfW * 0.66, rearBumperX + 0.65, halfW * 0.66, 0.35, '#334155', deform, '#0f172a', 0.45);
    drawDeformedDot(ctx, rearBumperX - 0.3, -halfW * 0.52, 0.65, '#dc2626', deform, '#7f1d1d', 0.3);
    drawDeformedDot(ctx, rearBumperX - 0.3, halfW * 0.52, 0.65, '#dc2626', deform, '#7f1d1d', 0.3);

    // Threaded brass valve body + red cross-handle lever + active hose lead when deployed
    drawRoundedBox(ctx, rearBumperX - 2.6, -0.75, rearBumperX - 0.4, 0.75, 0.22, '#d97706', deform, '#78350f', 0.35);
    strokePoly(ctx, [[rearBumperX - 1.9, -1.6], [rearBumperX - 1.9, 1.6]], '#dc2626', 1.0, deform);
    drawDeformedDot(ctx, rearBumperX - 1.9, 0, 0.4, '#f8fafc', deform);
    drawDeformedDot(ctx, rearBumperX - 3.1, 0, 0.68, '#b45309', deform);
    if (car.fluidTank?.isWaterHoseDeployed) {
      strokePoly(ctx, [[rearBumperX - 3.1, 0], [rearBumperX - 5.4, 0]], '#09090b', 1.85, deform);
    }
    return;
  }

  // --- VACUUM SLURRY TANKER TRAILER (AgriTech SlurryVac Tanker) ---
  if (car.type === 'trailer_vacuum') {
    const hitchX = car.couplerOffset !== undefined ? car.couplerOffset : halfL + 8;
    const baseCol = car.color || '#2563eb';

    // Drawbar utility tool chest + KO-503 finned vacuum compressor pump
    const boxX = hitchX - 4.4;
    drawRoundedBox(ctx, boxX - 1.55, -3.3, boxX + 1.55, 3.3, 0.35, '#1e293b', deform, '#0f172a', 0.45);
    drawRoundedBox(ctx, boxX - 1.2, -2.9, boxX + 1.2, 2.9, 0.22, '#334155', deform);
    drawRoundedBox(ctx, boxX - 0.4, -0.5, boxX + 0.4, 0.5, 0.15, '#cbd5e1', deform);

    const pumpX = halfL * 0.96;
    drawRoundedBox(ctx, pumpX - 2.1, -2.35, pumpX + 2.1, 2.35, 0.42, '#1e293b', deform, '#0f172a', 0.45);
    for (let px = pumpX - 1.4; px <= pumpX + 1.4; px += 0.75) {
      strokePoly(ctx, [[px, -2.05], [px, 2.05]], '#64748b', 0.48, deform);
    }
    drawDeformedDot(ctx, pumpX - 0.8, -2.75, 0.85, '#64748b', deform, '#0f172a', 0.35);

    // Cylindrical glossy steel vacuum tank with hemispherical welded end domes
    const tankFront = halfL * 0.60;
    const tankRear = -halfL * 0.82;
    const tankHW = halfW * 0.72;
    const tankGrad = ctx.createLinearGradient(0, -tankHW, 0, tankHW);
    tankGrad.addColorStop(0.0, shadePaint(baseCol, -0.44));
    tankGrad.addColorStop(0.20, shadePaint(baseCol, 0.28));
    tankGrad.addColorStop(0.48, shadePaint(baseCol, 0.05));
    tankGrad.addColorStop(0.82, shadePaint(baseCol, -0.20));
    tankGrad.addColorStop(1.0, shadePaint(baseCol, -0.48));

    // Rounded barrel polygon with domed front & rear bulkheads
    const domePts: Pt[] = [
      [tankFront, -tankHW],
      [tankFront + 2.3, -tankHW * 0.55],
      [tankFront + 2.8, 0],
      [tankFront + 2.3, tankHW * 0.55],
      [tankFront, tankHW],
      [tankRear, tankHW],
      [tankRear - 2.3, tankHW * 0.55],
      [tankRear - 2.8, 0],
      [tankRear - 2.3, -tankHW * 0.55],
      [tankRear, -tankHW],
    ];
    fillPoly(ctx, domePts, tankGrad, deform, '#0f172a', 0.72);

    // 3 structural steel tank bands + top manhole + vacuum relief valve
    for (const bx of [tankRear + 4.5, (tankRear + tankFront) * 0.5, tankFront - 4.5]) {
      strokePoly(ctx, [[bx, -tankHW], [bx, tankHW]], '#1e293b', 1.2, deform);
    }
    drawDeformedDot(ctx, (tankRear + tankFront) * 0.5 + 3.2, 0, 2.5, '#1e293b', deform, '#0f172a', 0.45);
    drawDeformedDot(ctx, (tankRear + tankFront) * 0.5 + 3.2, 0, 1.75, '#475569', deform);
    drawDeformedDot(ctx, tankFront - 2.0, 0, 1.1, '#cbd5e1', deform, '#1e293b', 0.35);

    // Side corrugated black suction hoses stowed in galvanized steel trays along both flanks
    for (const side of [-1, 1] as const) {
      const hy = side * (tankHW + 1.35);
      drawRoundedBox(ctx, tankRear + 1.5, hy - 1.05, tankFront - 1.5, hy + 1.05, 0.45, '#475569', deform, '#0f172a', 0.4);
      strokePoly(ctx, [[tankRear + 2.4, hy], [tankFront - 2.4, hy]], '#09090b', 1.35, deform);
      for (let cx = tankRear + 3.2; cx <= tankFront - 3.2; cx += 1.6) {
        strokePoly(ctx, [[cx, hy - 0.6], [cx, hy + 0.6]], '#334155', 0.4, deform);
      }
    }

    // Rear circular level sight-glass & slurry discharge gate valve
    const fillRatio = car.fluidTank ? Math.max(0, Math.min(1, (car.fluidTank.amount || 0) / Math.max(1, car.fluidTank.capacity || 1))) : 0;
    drawDeformedDot(ctx, tankRear - 1.6, 0, 1.45, '#0f172a', deform, '#cbd5e1', 0.4);
    drawDeformedDot(ctx, tankRear - 1.6, 0, 0.95, fillRatio > 0.1 ? '#65a30d' : '#1e293b', deform);

    // Integrated rear bumper with live tail/brake/reverse/turn lamps & ECE red triangles
    drawTrailerRearLampBar(ctx, -halfL + 0.4, halfW, opt, deform, true, 0.86);
    return;
  }

  // --- 2-AXLE FARM FLATBED / DUMP TRAILER (2-PTS-4) ---
  if (car.type === 'trailer_flatbed_2axle') {
    const sideCol = car.color || '#4d7c0f';
    const deckFront = halfL * 0.90;
    const deckRear = -halfL * 0.92;
    const deckHW = halfW * 0.94;

    // Outer stamped-steel corrugated drop-side box
    drawRoundedBox(ctx, deckRear, -deckHW, deckFront, deckHW, 0.85, sideCol, deform, '#0f172a', 0.68);

    // Inner weathered timber/steel flatbed floor planks
    const bedInF = deckFront - 1.6;
    const bedInR = deckRear + 1.5;
    const bedInHW = deckHW - 1.45;
    drawRoundedBox(ctx, bedInR, -bedInHW, bedInF, bedInHW, 0.4, '#44403c', deform, '#1c1917', 0.5);
    for (let py = -bedInHW + 1.8; py < bedInHW - 0.8; py += 2.2) {
      strokePoly(ctx, [[bedInR + 0.4, py], [bedInF - 0.4, py]], '#292524', 0.55, deform);
    }
    // Steel cross-bolsters & side vertical board stiffener posts
    for (let rx = bedInR + 4.5; rx <= bedInF - 4.0; rx += 7.5) {
      strokePoly(ctx, [[rx, -deckHW], [rx, -bedInHW]], '#1e293b', 0.9, deform);
      strokePoly(ctx, [[rx, bedInHW], [rx, deckHW]], '#1e293b', 0.9, deform);
    }
    // Corner latch pins & front headboard reinforcement
    drawRoundedBox(ctx, deckFront - 1.8, -deckHW, deckFront, deckHW, 0.4, shadePaint(sideCol, 0.14), deform, '#0f172a', 0.45);
    for (const [cx, cy] of [
      [deckFront - 0.8, -deckHW + 0.8],
      [deckFront - 0.8, deckHW - 0.8],
      [deckRear + 0.8, -deckHW + 0.8],
      [deckRear + 0.8, deckHW - 0.8],
    ] as Pt[]) {
      drawDeformedDot(ctx, cx, cy, 0.65, '#cbd5e1', deform, '#0f172a', 0.3);
    }

    // Side amber marker reflectors + integrated rear ECE lighting & triangles
    drawAmberSideMarkers(ctx, [-halfL * 0.45, 0, halfL * 0.45], deckHW, opt.positionOn, deform);
    drawTrailerRearLampBar(ctx, deckRear - 0.5, halfW, opt, deform, true, 0.9);
    return;
  }

  // --- SEMI-TRAILERS UPPER SUPERSTRUCTURES ---
  if (car.type === 'trailer_semi') {
    // IronForge Prime Flatbed Semi-Trailer (13.6m hardwood/steel deck)
    const deckFront = halfL - 0.8;
    const deckRear = -halfL + 1.4;
    const deckHW = halfW - 0.4;
    const trimCol = car.color || '#1e3a8a';

    // Perimeter painted steel rub-rail frame
    drawRoundedBox(ctx, deckRear, -deckHW, deckFront, deckHW, 0.9, trimCol, deform, '#0f172a', 0.72);
    // Weathered oak & steel deck planks
    drawRoundedBox(ctx, deckRear + 1.3, -deckHW + 1.35, deckFront - 2.6, deckHW - 1.35, 0.35, '#57534e', deform, '#1c1917', 0.45);
    for (let py = -deckHW + 3.0; py <= deckHW - 2.6; py += 2.35) {
      strokePoly(ctx, [[deckRear + 1.5, py], [deckFront - 2.8, py]], '#292524', 0.5, deform);
    }
    // Steel transverse bolster seams & stake pockets along rub-rails
    for (let sx = deckRear + 8; sx <= deckFront - 8; sx += 11.5) {
      strokePoly(ctx, [[sx, -deckHW + 1.4], [sx, deckHW - 1.4]], 'rgba(15,23,42,0.28)', 0.55, deform);
      drawRoundedBox(ctx, sx - 0.9, -deckHW + 0.2, sx + 0.9, -deckHW + 1.15, 0.15, '#0f172a', deform);
      drawRoundedBox(ctx, sx - 0.9, deckHW - 1.15, sx + 0.9, deckHW - 0.2, 0.15, '#0f172a', deform);
    }
    // Tall reinforced steel front headboard bulkhead
    drawRoundedBox(ctx, deckFront - 2.9, -deckHW, deckFront, deckHW, 0.65, shadePaint(trimCol, 0.15), deform, '#0f172a', 0.65);
    for (let hy = -deckHW + 3.0; hy <= deckHW - 3.0; hy += 4.2) {
      drawRoundedBox(ctx, deckFront - 2.6, hy - 0.55, deckFront - 0.4, hy + 0.55, 0.15, '#334155', deform);
    }

    drawAmberSideMarkers(ctx, [-halfL * 0.75, -halfL * 0.35, 0, halfL * 0.35, halfL * 0.75], deckHW, opt.positionOn, deform);
    drawTrailerRearLampBar(ctx, deckRear - 0.4, halfW, opt, deform, true, 1.0);
    return;
  }

  if (car.type === 'trailer_semi_box') {
    // IronForge Thermo Reefer Trailer
    const boxFront = halfL - 5.2;
    const boxRear = -halfL + 1.5;
    const boxHW = halfW - 0.35;
    const roofCol = car.color || '#f8fafc';
    const roofGrad = createRoofGradient(ctx, boxHW, roofCol);

    // Front diesel refrigeration unit (Thermo-King style pod mounted on nose wall)
    drawRoundedBox(ctx, boxFront - 0.4, -boxHW * 0.62, halfL - 0.6, boxHW * 0.62, 1.15, '#f1f5f9', deform, '#0f172a', 0.65);
    drawRoundedBox(ctx, halfL - 3.4, -boxHW * 0.46, halfL - 1.0, boxHW * 0.46, 0.45, '#1e293b', deform);
    for (let ry = -boxHW * 0.40; ry <= boxHW * 0.40; ry += 1.65) {
      strokePoly(ctx, [[halfL - 3.1, ry], [halfL - 1.2, ry]], '#475569', 0.5, deform);
    }
    // Green/amber reefer status LED indicator
    drawDeformedDot(ctx, halfL - 1.4, -boxHW * 0.52, 0.48, opt.ignitionOn || opt.positionOn ? '#22c55e' : '#14532d', deform);

    // Main insulated reefer box body
    drawRoundedBox(ctx, boxRear, -boxHW, boxFront, boxHW, 1.1, roofGrad, deform, '#0f172a', 0.72);
    // Brushed aluminum perimeter roof extrusions
    drawRoundedBox(ctx, boxRear + 0.5, -boxHW + 0.35, boxFront - 0.5, -boxHW + 1.35, 0.2, '#cbd5e1', deform);
    drawRoundedBox(ctx, boxRear + 0.5, boxHW - 1.35, boxFront - 0.5, boxHW - 0.35, 0.2, '#cbd5e1', deform);

    // Roof insulation panel seams & subtle cross-ribs
    for (let sx = boxRear + 12; sx <= boxFront - 10; sx += 14.5) {
      strokePoly(ctx, [[sx, -boxHW + 1.5], [sx, boxHW - 1.5]], 'rgba(15,23,42,0.16)', 0.65, deform);
    }
    // Rear double barn-door cam-lock bars
    drawRoundedBox(ctx, boxRear - 0.25, -boxHW + 1.2, boxRear + 1.0, boxHW - 1.2, 0.2, '#e2e8f0', deform, '#475569', 0.4);
    for (const ly of [-4.2, -1.6, 1.6, 4.2]) {
      drawDeformedDot(ctx, boxRear + 0.2, ly, 0.5, '#64748b', deform);
    }

    // Top rear outline red marker horns + side amber markers
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, boxRear - 0.5, side * (boxHW - 0.5) - 0.55, boxRear + 0.6, side * (boxHW - 0.5) + 0.55, 0.2, opt.positionOn ? '#ef4444' : '#7f1d1d', deform);
    }
    drawAmberSideMarkers(ctx, [-halfL * 0.72, -halfL * 0.35, 0, halfL * 0.35, halfL * 0.68], boxHW, opt.positionOn, deform);
    drawTrailerRearLampBar(ctx, boxRear - 0.6, halfW, opt, deform, true, 1.0);
    return;
  }

  if (car.type === 'trailer_semi_tanker') {
    // IronForge Hazmat Fuel Tanker 30m3
    const tankFront = halfL - 2.4;
    const tankRear = -halfL + 3.2;
    const tankHW = halfW * 0.88;
    const baseCol = car.color || '#ea580c';

    // Cylindrical/elliptical clearcoat fuel barrel
    const tankGrad = ctx.createLinearGradient(0, -tankHW, 0, tankHW);
    tankGrad.addColorStop(0.0, shadePaint(baseCol, -0.42));
    tankGrad.addColorStop(0.18, shadePaint(baseCol, 0.28));
    tankGrad.addColorStop(0.42, shadePaint(baseCol, 0.14));
    tankGrad.addColorStop(0.76, shadePaint(baseCol, -0.18));
    tankGrad.addColorStop(1.0, shadePaint(baseCol, -0.48));

    const barrelPts: Pt[] = [
      [tankFront - 2.8, -tankHW],
      [tankFront, -tankHW * 0.62],
      [tankFront + 1.6, 0],
      [tankFront, tankHW * 0.62],
      [tankFront - 2.8, tankHW],
      [tankRear + 2.8, tankHW],
      [tankRear, tankHW * 0.62],
      [tankRear - 1.6, 0],
      [tankRear, -tankHW * 0.62],
      [tankRear + 2.8, -tankHW],
    ];
    fillPoly(ctx, barrelPts, tankGrad, deform, '#0f172a', 0.75);

    // 4 Circumferential steel stiffening baffle rings
    for (const frac of [-0.54, -0.18, 0.18, 0.54]) {
      const rx = (tankFront + tankRear) * 0.5 + (tankFront - tankRear) * 0.5 * frac;
      strokePoly(ctx, [[rx, -tankHW + 0.3], [rx, tankHW - 0.3]], '#1e293b', 1.25, deform);
      strokePoly(ctx, [[rx + 0.65, -tankHW + 0.5], [rx + 0.65, tankHW - 0.5]], 'rgba(255,255,255,0.24)', 0.55, deform);
    }

    // Center recessed spill-containment coaming trough + 4 circular loading manholes
    drawRoundedBox(ctx, tankRear + 6.0, -4.4, tankFront - 6.0, 4.4, 1.0, '#1e293b', deform, '#cbd5e1', 0.55);
    for (const frac of [-0.62, -0.21, 0.21, 0.62]) {
      const hx = (tankFront + tankRear) * 0.5 + (tankFront - tankRear) * 0.42 * frac;
      drawDeformedDot(ctx, hx, 0, 2.55, '#cbd5e1', deform, '#0f172a', 0.45);
      drawDeformedDot(ctx, hx, 0, 1.55, '#475569', deform, '#1e293b', 0.35);
      drawDeformedDot(ctx, hx, 0, 0.55, '#e2e8f0', deform);
    }

    // Perforated aluminum anti-slip catwalk along left roof flank + safety handrail
    drawRoundedBox(ctx, tankRear + 7.5, -tankHW * 0.76, tankFront - 7.5, -4.9, 0.35, '#94a3b8', deform, '#334155', 0.4);
    for (let cx = tankRear + 9.0; cx <= tankFront - 9.0; cx += 2.6) {
      strokePoly(ctx, [[cx, -tankHW * 0.73], [cx, -5.2]], '#475569', 0.45, deform);
    }

    // Orange ADR Hazmat Warning Placards on front & rear tank flanks
    drawRoundedBox(ctx, tankRear + 2.5, -tankHW * 0.42, tankRear + 5.2, tankHW * 0.42, 0.25, '#f97316', deform, '#0f172a', 0.45);
    strokePoly(ctx, [[tankRear + 3.85, -tankHW * 0.35], [tankRear + 3.85, tankHW * 0.35]], '#0f172a', 0.45, deform);

    drawAmberSideMarkers(ctx, [-halfL * 0.72, -halfL * 0.36, 0, halfL * 0.36, halfL * 0.72], tankHW, opt.positionOn, deform);
    drawTrailerRearLampBar(ctx, -halfL + 1.0, halfW, opt, deform, true, 1.0);
    return;
  }

  if (car.type === 'trailer_semi_container') {
    // IronForge Intermodal Container 40ft (ISO Corrugated Steel Box on Skeletal Chassis)
    const cFront = halfL - 1.8;
    const cRear = -halfL + 2.0;
    const cHW = halfW - 0.55;
    const baseCol = car.color || '#991b1b';
    const boxGrad = createBodyMetallicGradient(ctx, cHW, baseCol);

    // Skeletal black chassis corner beams peeking slightly at ends
    drawRoundedBox(ctx, -halfL + 1.0, -halfW * 0.88, halfL - 0.6, halfW * 0.88, 0.6, '#1e293b', deform, '#0f172a', 0.55);

    // 40ft ISO Steel Shipping Container shell
    drawRoundedBox(ctx, cRear, -cHW, cFront, cHW, 0.55, boxGrad, deform, '#0f172a', 0.72);

    // Iconic deep transverse corrugated roof ribs with sunlit highlight & shadow bevels
    for (let rx = cRear + 3.6; rx <= cFront - 3.6; rx += 3.1) {
      strokePoly(ctx, [[rx, -cHW + 0.7], [rx, cHW - 0.7]], shadePaint(baseCol, -0.34), 0.95, deform);
      strokePoly(ctx, [[rx + 1.05, -cHW + 0.7], [rx + 1.05, cHW - 0.7]], shadePaint(baseCol, 0.22), 0.65, deform);
    }

    // 4 ISO yellow/gold corner twist-lock castings
    for (const [cx, cy] of [
      [cFront - 1.1, -cHW + 1.1],
      [cFront - 1.1, cHW - 1.1],
      [cRear + 1.1, -cHW + 1.1],
      [cRear + 1.1, cHW - 1.1],
    ] as Pt[]) {
      drawRoundedBox(ctx, cx - 1.05, cy - 1.05, cx + 1.05, cy + 1.05, 0.15, '#eab308', deform, '#0f172a', 0.45);
    }

    // Subtle white shipping line roof stencil bars
    drawRoundedBox(ctx, -18, -cHW * 0.28, 18, -cHW * 0.12, 0.15, 'rgba(248,250,252,0.72)', deform);
    drawRoundedBox(ctx, -18, cHW * 0.12, 18, cHW * 0.28, 0.15, 'rgba(248,250,252,0.72)', deform);

    drawAmberSideMarkers(ctx, [-halfL * 0.75, -halfL * 0.38, 0, halfL * 0.38, halfL * 0.75], halfW - 0.2, opt.positionOn, deform);
    drawTrailerRearLampBar(ctx, -halfL + 1.1, halfW, opt, deform, true, 1.0);
    return;
  }

  if (car.type === 'trailer_semi_lowboy') {
    // IronForge Titan Lowboy 40T (Stepped Heavy Equipment Transporter)
    const trimCol = car.color || '#d97706';
    const deckHW = halfW - 0.3;

    // 1. Raised Front Hydraulic Gooseneck Deck
    const neckFront = halfL - 0.8;
    const neckRear = halfL * 0.46;
    drawRoundedBox(ctx, neckRear, -deckHW * 0.86, neckFront, deckHW * 0.86, 1.0, trimCol, deform, '#0f172a', 0.7);
    drawRoundedBox(ctx, neckRear + 1.4, -deckHW * 0.72, neckFront - 2.0, deckHW * 0.72, 0.45, '#334155', deform, '#0f172a', 0.45);
    // Hydraulic winch drum & steel cable spool on gooseneck
    drawRoundedBox(ctx, neckRear + 3.2, -4.6, neckRear + 7.6, 4.6, 0.55, '#1e293b', deform, '#0f172a', 0.45);
    for (let wy = -3.8; wy <= 3.8; wy += 0.95) {
      strokePoly(ctx, [[neckRear + 3.7, wy], [neckRear + 7.1, wy]], '#94a3b8', 0.45, deform);
    }

    // 2. Stepped Gooseneck Transition Beams
    drawRoundedBox(ctx, halfL * 0.36, -deckHW * 0.78, neckRear + 0.6, deckHW * 0.78, 0.4, '#1e293b', deform, '#0f172a', 0.55);

    // 3. Ultra-Low Main Heavy Cargo Well Deck (Outrigger Steel + Timber Planks)
    const wellFront = halfL * 0.38;
    const wellRear = -halfL * 0.38;
    drawRoundedBox(ctx, wellRear, -deckHW, wellFront, deckHW, 0.65, trimCol, deform, '#0f172a', 0.72);
    // Heavy oak plank strips flanking central steel spine
    drawRoundedBox(ctx, wellRear + 1.0, -deckHW + 1.6, wellFront - 1.0, -3.2, 0.3, '#57534e', deform, '#1c1917', 0.45);
    drawRoundedBox(ctx, wellRear + 1.0, 3.2, wellFront - 1.0, deckHW - 1.6, 0.3, '#57534e', deform, '#1c1917', 0.45);
    drawRoundedBox(ctx, wellRear + 1.0, -2.8, wellFront - 1.0, 2.8, 0.3, '#334155', deform, '#0f172a', 0.45);
    for (let px = wellRear + 5.0; px <= wellFront - 5.0; px += 7.5) {
      strokePoly(ctx, [[px, -deckHW + 1.6], [px, -3.2]], '#292524', 0.5, deform);
      strokePoly(ctx, [[px, 3.2], [px, deckHW - 1.6]], '#292524', 0.5, deform);
      // Heavy forged D-ring chain tie-downs along outer rail
      drawDeformedDot(ctx, px, -deckHW + 0.85, 0.55, '#cbd5e1', deform, '#0f172a', 0.3);
      drawDeformedDot(ctx, px, deckHW - 0.85, 0.55, '#cbd5e1', deform, '#0f172a', 0.3);
    }

    // 4. Raised Tri-Axle Rear Bogie Deck with Checkered Anti-Slip Steel Plate
    const bogieFront = -halfL * 0.38;
    const bogieRear = -halfL * 0.89;
    drawRoundedBox(ctx, bogieRear, -deckHW, bogieFront, deckHW, 0.75, shadePaint(trimCol, -0.06), deform, '#0f172a', 0.7);
    drawRoundedBox(ctx, bogieRear + 1.2, -deckHW + 1.2, bogieFront - 1.2, deckHW - 1.2, 0.4, '#334155', deform, '#1e293b', 0.45);
    for (let cx = bogieRear + 4.5; cx <= bogieFront - 4.0; cx += 5.5) {
      strokePoly(ctx, [[cx, -deckHW + 1.5], [cx, deckHW - 1.5]], '#475569', 0.55, deform);
    }

    // 5. Twin Hinged Hydraulic Folding Loading Ramps with High-Vis Hazard Stripes
    const rampFront = bogieRear + 0.5;
    const rampRear = -halfL + 0.4;
    for (const side of [-1, 1] as const) {
      const ry1 = side < 0 ? -deckHW + 1.2 : 2.6;
      const ry2 = side < 0 ? -2.6 : deckHW - 1.2;
      drawRoundedBox(ctx, rampRear, ry1, rampFront, ry2, 0.4, '#1e293b', deform, '#0f172a', 0.55);
      // Yellow/black diagonal hazard strips on folded ramps
      for (let i = 0; i < 4; i++) {
        const sy = ry1 + 0.9 + i * ((ry2 - ry1 - 1.8) / 3.2);
        drawRoundedBox(ctx, rampRear + 0.9, sy, rampFront - 0.9, sy + 1.1, 0.15, i % 2 === 0 ? '#facc15' : '#0f172a', deform);
      }
    }

    // Rear flashing wide-load amber beacon + side markers + ECE tail/brake/turn bar
    drawAmberBeacon(ctx, bogieRear + 1.4, 0, 1.15, opt.positionOn || opt.sirenOn || !!car.towedById, deform, nowSec);
    drawAmberSideMarkers(ctx, [-halfL * 0.72, -halfL * 0.34, 0, halfL * 0.34, halfL * 0.72], deckHW, opt.positionOn, deform);
    drawTrailerRearLampBar(ctx, -halfL + 0.2, halfW, opt, deform, true, 1.0);
  }
}

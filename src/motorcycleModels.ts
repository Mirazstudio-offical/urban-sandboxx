import type { VehicleRenderContext } from './vehicleArchetypes';
import {
  Pt,
  DeformFn,
  shadePaint,
  getLiveOpticsState,
  fillPoly,
  strokePoly,
  drawRoundedBox,
  drawDeformedDot,
  drawBoxShadow,
  createBodyMetallicGradient,
  createGlassGradient,
  drawGlassGlint,
  drawChromePipe,
  drawTreadedTire,
  LiveOpticsState,
} from './vehicleModelPrimitives';

export const REDRAWN_MOTORCYCLE_TYPES: ReadonlySet<string> = new Set([
  'moto_izh_jupiter',
  'moto_ural_sidecar',
  'moto_jawa350',
  'moto_sport',
  'moto_chopper',
  'moped_soviet',
]);

export function isRedrawnMotorcycle(type: string | undefined | null): boolean {
  return !!type && REDRAWN_MOTORCYCLE_TYPES.has(type);
}

// ============================================================================
// SHARED MOTORCYCLE MECHANICAL SUB-ASSEMBLY HELPERS
// ============================================================================

function drawMotoWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  len: number,
  wid: number,
  angle: number,
  deform: DeformFn,
  options?: {
    hasBrakeDisc?: boolean;
    dualDisc?: boolean;
    rimColor?: string;
    isSport?: boolean;
  }
): void {
  const [dx, dy] = deform(cx, cy);
  ctx.save();
  ctx.translate(dx, dy);
  if (angle) ctx.rotate(angle);

  // Brake disc(s) peeking alongside hub
  if (options?.hasBrakeDisc) {
    const discLen = len * 0.46;
    const discOff = wid * 0.56;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-discLen * 0.5, -discOff - 0.35, discLen, 0.38);
    if (options.dualDisc) {
      ctx.fillRect(-discLen * 0.5, discOff - 0.03, discLen, 0.38);
    }
    // Gold/red brake caliper
    ctx.fillStyle = options.isSport ? '#d97706' : '#475569';
    ctx.fillRect(-discLen * 0.35, -discOff - 0.55, discLen * 0.34, 0.55);
  }

  // Treaded motorcycle rubber tire
  drawTreadedTire(ctx, 0, 0, len, wid, 0, options?.isSport ? 'slick' : 'road', options?.rimColor || '#cbd5e1');

  // Center tread groove / directional chevron line
  ctx.strokeStyle = options?.isSport ? 'rgba(226,232,240,0.18)' : 'rgba(2,6,23,0.65)';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(-len * 0.42, 0);
  ctx.lineTo(len * 0.42, 0);
  ctx.stroke();

  // Axle bolt ends
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-0.45, -wid * 0.62, 0.9, wid * 1.24);
  ctx.restore();
}

function drawSteeredHandlebars(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  halfSpan: number,
  sweepBack: number,
  steerAngle: number,
  deform: DeformFn,
  options: {
    barColor: string;
    barWidth: number;
    gripLen: number;
    hasMirrors?: boolean;
    mirrorStalk?: number;
    isClipOn?: boolean;
    forkCapColor?: string;
  }
): void {
  const cos = Math.cos(steerAngle);
  const sin = Math.sin(steerAngle);
  const rot = (lx: number, ly: number): Pt => [
    headX + lx * cos - ly * sin,
    headY + lx * sin + ly * cos,
  ];

  // Triple-tree top clamp + fork tube caps
  const clampPts: Pt[] = [
    rot(0.95, -1.45),
    rot(0.95, 1.45),
    rot(-0.75, 1.25),
    rot(-0.75, -1.25),
  ];
  fillPoly(ctx, clampPts, '#1e293b', deform, '#090d16', 0.35);
  for (const side of [-1, 1] as const) {
    const [fx, fy] = rot(0.15, side * 1.05);
    drawDeformedDot(ctx, fx, fy, 0.42, options.forkCapColor || '#cbd5e1', deform, '#0f172a', 0.22);
  }

  // Handlebar tube(s)
  const leftEnd = rot(-sweepBack, -halfSpan);
  const leftMid = rot(-sweepBack * 0.25, -halfSpan * 0.36);
  const rightMid = rot(-sweepBack * 0.25, halfSpan * 0.36);
  const rightEnd = rot(-sweepBack, halfSpan);

  if (options.isClipOn) {
    drawChromePipe(ctx, [rot(0.1, -1.05), leftEnd], options.barWidth, deform, options.barColor);
    drawChromePipe(ctx, [rot(0.1, 1.05), rightEnd], options.barWidth, deform, options.barColor);
  } else {
    drawChromePipe(ctx, [leftEnd, leftMid, rightMid, rightEnd], options.barWidth, deform, options.barColor);
  }

  // Rubber grips + brake/clutch levers
  const gripStart = Math.max(0.4, 1 - options.gripLen / halfSpan);
  for (const side of [-1, 1] as const) {
    const g1 = rot(-sweepBack * gripStart, side * halfSpan * gripStart);
    const g2 = rot(-sweepBack, side * halfSpan);
    strokePoly(ctx, [g1, g2], '#090d16', options.barWidth + 0.55, deform);
    // Front brake / clutch lever blade ahead of grip
    const lv1 = rot(-sweepBack * gripStart + 0.45, side * (halfSpan * gripStart - 0.1));
    const lv2 = rot(-sweepBack + 0.72, side * (halfSpan * 0.92));
    strokePoly(ctx, [lv1, lv2], '#cbd5e1', 0.32, deform);

    if (options.hasMirrors) {
      const mBase = rot(-sweepBack * 0.52, side * halfSpan * 0.62);
      const mTip = rot(-sweepBack * 0.52 + (options.mirrorStalk ?? 1.25), side * (halfSpan * 0.88 + 0.55));
      strokePoly(ctx, [mBase, mTip], '#475569', 0.32, deform);
      drawDeformedDot(ctx, mTip[0], mTip[1], 0.58, '#1e293b', deform, '#cbd5e1', 0.26);
    }
  }
}

function drawClassicRoundHeadlamp(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  radius: number,
  steerAngle: number,
  opt: LiveOpticsState,
  broken: boolean,
  deform: DeformFn,
  shellColor = '#cbd5e1',
  withBlinkers = true
): void {
  const cos = Math.cos(steerAngle);
  const sin = Math.sin(steerAngle);
  const rot = (lx: number, ly: number): Pt => [hx + lx * cos - ly * sin, hy + lx * sin + ly * cos];

  // Stalk turn indicators on fork sides
  if (withBlinkers) {
    for (const side of [-1, 1] as const) {
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const b1 = rot(-0.2, side * (radius + 0.25));
      const b2 = rot(0.1, side * (radius + 1.05));
      strokePoly(ctx, [b1, b2], '#334155', 0.35, deform);
      drawDeformedDot(
        ctx,
        b2[0],
        b2[1],
        0.44,
        turnInt > 0.08 ? `rgba(251,191,36,${(0.55 + 0.45 * turnInt).toFixed(2)})` : '#b45309',
        deform,
        '#0f172a',
        0.22
      );
    }
  }

  // Bullet headlamp shell (rear tapered dome) + front glass bezel
  const backPt = rot(-radius * 0.72, 0);
  const frontPt = rot(radius * 0.38, 0);
  drawDeformedDot(ctx, backPt[0], backPt[1], radius * 0.92, shellColor, deform, '#0f172a', 0.36);
  drawDeformedDot(ctx, frontPt[0], frontPt[1], radius * 0.86, '#e2e8f0', deform, '#1e293b', 0.32);

  if (broken) {
    drawDeformedDot(ctx, frontPt[0], frontPt[1], radius * 0.68, '#111827', deform);
    return;
  }

  const lensFill = opt.headlightsOn
    ? opt.highBeam
      ? '#ffffff'
      : '#fef3c7'
    : opt.positionOn
    ? '#fde68a'
    : '#cbd5e1';
  drawDeformedDot(ctx, frontPt[0] + cos * 0.15, frontPt[1] + sin * 0.15, radius * 0.66, lensFill, deform);
  if (opt.headlightsOn) {
    drawDeformedDot(ctx, frontPt[0] + cos * 0.25, frontPt[1] + sin * 0.25, radius * 0.34, '#ffffff', deform);
  }
}

function drawMotoTailAssembly(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  opt: LiveOpticsState,
  broken: boolean,
  deform: DeformFn,
  width = 1.6,
  withStalkBlinkers = true
): void {
  if (withStalkBlinkers) {
    for (const side of [-1, 1] as const) {
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      strokePoly(ctx, [[tx + 0.3, ty + side * (width * 0.5)], [tx + 0.2, ty + side * (width * 0.5 + 0.95)]], '#334155', 0.32, deform);
      drawDeformedDot(
        ctx,
        tx + 0.2,
        ty + side * (width * 0.5 + 0.95),
        0.4,
        turnInt > 0.08 ? `rgba(251,191,36,${(0.55 + 0.45 * turnInt).toFixed(2)})` : '#b45309',
        deform,
        '#0f172a',
        0.2
      );
    }
  }
  // License plate bracket behind tail lamp
  drawRoundedBox(ctx, tx - 0.55, ty - width * 0.52, tx + 0.15, ty + width * 0.52, 0.15, '#e2e8f0', deform, '#0f172a', 0.25);

  // Red tail/brake lens
  const tailFill = broken
    ? '#111827'
    : opt.braking
    ? '#ff3b3b'
    : opt.positionOn
    ? '#ef4444'
    : '#7f1d1d';
  drawRoundedBox(ctx, tx - 0.15, ty - width * 0.46, tx + 0.85, ty + width * 0.46, 0.28, tailFill, deform, '#0f172a', 0.3);
  if (!broken && opt.braking) {
    drawDeformedDot(ctx, tx + 0.35, ty, 0.36, '#fecaca', deform);
  }
}

function drawRibbedSaddle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  cy: number,
  halfWFront: number,
  halfWRear: number,
  leatherColor: string,
  deform: DeformFn,
  ribStep = 1.15
): void {
  const pts: Pt[] = [
    [x2, cy - halfWFront * 0.72],
    [x2 - 0.8, cy - halfWFront],
    [x1 + 1.0, cy - halfWRear],
    [x1, cy - halfWRear * 0.65],
    [x1, cy + halfWRear * 0.65],
    [x1 + 1.0, cy + halfWRear],
    [x2 - 0.8, cy + halfWFront],
    [x2, cy + halfWFront * 0.72],
  ];
  fillPoly(ctx, pts, leatherColor, deform, '#090d16', 0.52);
  // Stitched upholstery transverse ribs
  for (let sx = x1 + 1.2; sx < x2 - 0.9; sx += ribStep) {
    const t = (sx - x1) / Math.max(1, x2 - x1);
    const rw = (halfWRear * (1 - t) + halfWFront * t) * 0.78;
    strokePoly(ctx, [[sx, cy - rw], [sx, cy + rw]], 'rgba(255,255,255,0.12)', 0.32, deform);
    strokePoly(ctx, [[sx + 0.28, cy - rw], [sx + 0.28, cy + rw]], 'rgba(0,0,0,0.38)', 0.32, deform);
  }
}

// ============================================================================
// 1. CHASSIS LAYER (WHEELS, SWINGARMS, EXHAUSTS, CRADLE FRAMES, SIDECAR BOAT)
// ============================================================================

export function renderMotorcycleChassisLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  const type = car.type;
  const opt = getLiveOpticsState(car);
  const steer = (car.steerAngle || 0) * 1.05;
  const fX = halfL - fc;
  const rX = -halfL + rc;

  // --------------------------------------------------------------------------
  // A. URAL SIDECAR (Stellar Outback Sidecar — M-67 / Gear Up 650cc)
  // --------------------------------------------------------------------------
  if (type === 'moto_ural_sidecar') {
    const bikeY = -halfW * 0.44;
    const carY = halfW * 0.44;
    const baseColor = car.color || '#365314';

    // 1. Wheels: motorcycle front & rear + sidecar right wheel
    drawMotoWheel(ctx, fX - 3.3, bikeY, 6.2, 2.0, steer, deform, { hasBrakeDisc: false });
    drawMotoWheel(ctx, rX + 3.2, bikeY, 6.2, 2.25, 0, deform, { hasBrakeDisc: false });
    drawMotoWheel(ctx, -halfL * 0.28, halfW * 0.87, 6.0, 2.0, 0, deform, { hasBrakeDisc: false });

    // 2. Tubular black steel sidecar connecting sub-frame & torsion axle
    const framePts: [Pt, Pt][] = [
      [[halfL * 0.28, bikeY + 0.4], [halfL * 0.14, carY - 1.5]],
      [[-halfL * 0.08, bikeY + 0.4], [-halfL * 0.12, carY - 1.5]],
      [[-halfL * 0.44, bikeY + 0.4], [-halfL * 0.36, carY - 1.5]],
      [[-halfL * 0.28, bikeY + 0.6], [-halfL * 0.28, halfW * 0.84]],
    ];
    for (const [p1, p2] of framePts) {
      strokePoly(ctx, [p1, p2], '#0f172a', 1.1, deform);
      strokePoly(ctx, [p1, p2], '#334155', 0.48, deform);
    }

    // 3. Horizontally-opposed 650cc Boxer Twin cylinder heads protruding left & right
    for (const side of [-1, 1] as const) {
      const cy = bikeY + side * 1.95;
      drawRoundedBox(ctx, -1.65, cy - 0.95, 1.45, cy + 0.95, 0.3, '#94a3b8', deform, '#0f172a', 0.42);
      // Cooling fins
      for (let fx = -1.25; fx <= 1.05; fx += 0.55) {
        strokePoly(ctx, [[fx, cy - 0.85], [fx, cy + 0.85]], '#1e293b', 0.3, deform);
      }
      // Polished valve cover cap
      drawRoundedBox(ctx, -0.8, cy + side * 0.65 - 0.25, 0.7, cy + side * 0.65 + 0.25, 0.2, '#cbd5e1', deform, '#334155', 0.25);
    }

    // 4. Twin chrome low exhaust pipes on motorcycle flanks
    for (const side of [-1, 1] as const) {
      drawChromePipe(
        ctx,
        [
          [0.9, bikeY + side * 1.7],
          [-2.2, bikeY + side * 1.9],
          [rX + 2.4, bikeY + side * 1.65],
        ],
        0.72,
        deform
      );
    }

    // 5. Motorcycle steel front & rear mudguards
    drawRoundedBox(ctx, fX - 4.8, bikeY - 1.25, fX - 1.6, bikeY + 1.25, 0.6, shadePaint(baseColor, -0.05), deform, '#090d16', 0.42);
    drawRoundedBox(ctx, rX + 1.2, bikeY - 1.35, rX + 5.8, bikeY + 1.35, 0.6, shadePaint(baseColor, -0.08), deform, '#090d16', 0.42);

    // 6. Sidecar wheel fender + integrated front marker & rear tail/turn lamp
    const scFendY = halfW * 0.86;
    drawRoundedBox(ctx, -halfL * 0.58, scFendY - 1.25, halfL * 0.04, scFendY + 1.25, 0.65, shadePaint(baseColor, 0.04), deform, '#090d16', 0.48);
    // Front white/amber sidecar fender marker lamp (xFrac ~ +0.16? Wait: front of fender is +0.02*L -> let's put lamp pod cleanly at +0.04*halfL and also bow lamp!)
    drawDeformedDot(
      ctx,
      halfL * 0.02,
      scFendY,
      0.55,
      opt.headlightsOn || opt.positionOn ? '#fef3c7' : '#cbd5e1',
      deform,
      '#0f172a',
      0.28
    );
    // Rear red/amber sidecar fender lamp
    drawRoundedBox(
      ctx,
      -halfL * 0.62,
      scFendY - 0.6,
      -halfL * 0.50,
      scFendY + 0.6,
      0.25,
      opt.braking ? '#ff3b3b' : opt.positionOn ? '#ef4444' : '#7f1d1d',
      deform,
      '#0f172a',
      0.25
    );
    if (opt.rightTurn > 0.08) {
      drawDeformedDot(ctx, -halfL * 0.56, scFendY + 0.52, 0.35, '#fbbf24', deform);
    }

    // 7. Torpedo-nosed Ural Sidecar Boat Hull
    const boatPts: Pt[] = [
      [halfL * 0.54, carY - 0.5],
      [halfL * 0.50, carY + 0.8],
      [halfL * 0.24, carY + 2.55],
      [-halfL * 0.54, carY + 2.55],
      [-halfL * 0.72, carY + 1.75],
      [-halfL * 0.72, carY - 1.85],
      [-halfL * 0.54, carY - 2.45],
      [halfL * 0.24, carY - 2.35],
    ];
    fillPoly(ctx, boatPts, createBodyMetallicGradient(ctx, halfW, baseColor), deform, '#090d16', 0.75);
    // Sidecar nose spotlight/bumper guard
    drawChromePipe(ctx, [[halfL * 0.42, carY - 1.5], [halfL * 0.58, carY], [halfL * 0.42, carY + 1.5]], 0.52, deform);
    // Sidecar open cockpit recess + ribbed steel footwell + stitched leather seat
    drawRoundedBox(ctx, -halfL * 0.42, carY - 1.85, halfL * 0.12, carY + 1.85, 0.65, '#111827', deform, '#334155', 0.4);
    for (let fx = -halfL * 0.02; fx <= halfL * 0.10; fx += 0.65) {
      strokePoly(ctx, [[fx, carY - 1.5], [fx, carY + 1.5]], 'rgba(148,163,184,0.22)', 0.3, deform);
    }
    drawRibbedSaddle(ctx, -halfL * 0.40, -halfL * 0.05, carY, 1.55, 1.65, '#292524', deform, 0.9);

    // Sidecar rear luggage rack + full-size spare spoke tire mounted on rear deck
    drawDeformedDot(ctx, -halfL * 0.58, carY, 2.1, '#0f172a', deform, '#334155', 0.4);
    drawDeformedDot(ctx, -halfL * 0.58, carY, 1.0, '#64748b', deform, '#1e293b', 0.3);
    return;
  }

  // --------------------------------------------------------------------------
  // B. SOLO MOTORCYCLES & MOPED (Chassis, Wheels, Swingarm, Engine, Exhausts)
  // --------------------------------------------------------------------------
  const baseColor = car.color || (type === 'moto_jawa350' ? '#991b1b' : '#2563eb');

  if (type === 'moto_sport') {
    // Superbike 1000: wide sticky sport slicks, radial Brembo discs, cast aluminum swingarm, right-side titanium Akrapovic
    drawMotoWheel(ctx, fX - 2.9, 0, 5.8, 2.05, steer, deform, { hasBrakeDisc: true, dualDisc: true, isSport: true });
    drawMotoWheel(ctx, rX + 2.9, 0, 6.0, 2.85, 0, deform, { hasBrakeDisc: true, isSport: true });

    // Brushed aluminum twin-spar rear swingarm
    fillPoly(
      ctx,
      [
        [rX + 2.8, -1.75],
        [-1.0, -1.55],
        [-1.0, 1.55],
        [rX + 2.8, 1.75],
        [rX + 2.8, 1.25],
        [-1.2, 1.05],
        [-1.2, -1.05],
        [rX + 2.8, -1.25],
      ],
      '#94a3b8',
      deform,
      '#1e293b',
      0.38
    );

    // Right-side sculpted titanium + carbon Akrapovic muffler canister
    drawChromePipe(ctx, [[0.8, 1.7], [-2.5, 2.15], [rX + 3.4, 2.0]], 0.95, deform, '#94a3b8');
    drawRoundedBox(ctx, rX + 2.2, 1.55, rX + 3.6, 2.45, 0.25, '#0f172a', deform, '#475569', 0.25);

    // Front carbon mudguard over tire
    drawRoundedBox(ctx, fX - 4.4, -1.25, fX - 1.9, 1.25, 0.55, '#1e293b', deform, '#090d16', 0.35);

    // Rearset billet rider footpegs
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[-1.6, side * 1.4], [-1.8, side * 2.55]], '#cbd5e1', 0.55, deform);
    }
    return;
  }

  if (type === 'moto_chopper') {
    // V-Twin Cruiser: raked skinny 21" front wheel, huge 240mm fat rear tire, long chrome forks, staggered shotgun pipes
    drawMotoWheel(ctx, fX - 3.3, 0, 6.4, 1.65, steer, deform, { hasBrakeDisc: true, rimColor: '#e2e8f0' });
    drawMotoWheel(ctx, rX + 3.4, 0, 6.6, 3.35, 0, deform, { hasBrakeDisc: true, rimColor: '#e2e8f0' });

    // Long raked chrome front fork legs
    const cos = Math.cos(steer);
    const sin = Math.sin(steer);
    for (const side of [-1, 1] as const) {
      const fx1 = halfL * 0.42;
      const fy1 = side * 1.05;
      const fx2 = fX - 3.2 + 0.2 * cos - side * 1.15 * sin;
      const fy2 = 0.2 * sin + side * 1.15 * cos;
      drawChromePipe(ctx, [[fx1, fy1], [fx2, fy2]], 0.65, deform);
    }

    // Minimal bobbed front fender & wide curved bobbed rear fender
    drawRoundedBox(ctx, fX - 4.6, -1.0, fX - 2.0, 1.0, 0.45, shadePaint(baseColor, 0.06), deform, '#090d16', 0.38);
    drawRoundedBox(ctx, rX + 0.9, -1.95, rX + 6.6, 1.95, 1.1, createBodyMetallicGradient(ctx, 2.0, baseColor), deform, '#090d16', 0.52);

    // Exposed V-twin air-cooled heads + round chrome air cleaner (right) + belt primary cover (left)
    drawRoundedBox(ctx, -1.5, -2.05, 2.6, 2.05, 0.5, '#1e293b', deform, '#090d16', 0.45);
    drawDeformedDot(ctx, 0.8, 2.15, 1.15, '#e2e8f0', deform, '#0f172a', 0.35);
    drawRoundedBox(ctx, -2.0, -2.35, 1.5, -1.4, 0.45, '#cbd5e1', deform, '#0f172a', 0.35);

    // Staggered twin chrome shotgun exhaust pipes down right side
    drawChromePipe(ctx, [[2.0, 1.75], [-1.0, 2.45], [rX + 2.6, 2.35]], 0.82, deform);
    drawChromePipe(ctx, [[-0.2, 1.85], [-2.5, 2.75], [rX + 4.4, 2.68]], 0.78, deform);

    // Forward highway cruiser footpegs + brake/shifter pedals
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[3.8, side * 1.2], [4.0, side * 2.95]], '#cbd5e1', 0.65, deform);
      drawRoundedBox(ctx, 3.65, side * 2.75 - 0.3, 4.35, side * 2.75 + 0.3, 0.15, '#090d16', deform);
    }
    return;
  }

  if (type === 'moped_soviet') {
    // Riga / Karpaty 50cc Moped: slender bicycle-like tires, tubular frame, tiny 50cc engine, bicycle crank pedals
    drawMotoWheel(ctx, fX - 2.4, 0, 4.8, 1.15, steer, deform);
    drawMotoWheel(ctx, rX + 2.4, 0, 4.8, 1.25, 0, deform);

    // Thin tubular step-through frame & rear stays
    strokePoly(ctx, [[rX + 2.4, -0.75], [0.5, -0.55], [halfL * 0.44, 0]], '#1e293b', 0.65, deform);
    strokePoly(ctx, [[rX + 2.4, 0.75], [0.5, 0.55], [halfL * 0.44, 0]], '#1e293b', 0.65, deform);

    // Tiny 50cc finned engine + single right chrome exhaust muffler
    drawRoundedBox(ctx, -1.2, -1.05, 1.4, 1.05, 0.3, '#64748b', deform, '#0f172a', 0.35);
    drawChromePipe(ctx, [[0.8, 0.95], [-1.8, 1.3], [rX + 1.8, 1.15]], 0.52, deform);

    // Functional moped bicycle crank pedals!
    strokePoly(ctx, [[-0.6, -1.1], [-0.6, -2.35]], '#94a3b8', 0.42, deform);
    drawRoundedBox(ctx, -1.0, -2.65, -0.2, -1.95, 0.15, '#090d16', deform);
    strokePoly(ctx, [[0.4, 1.1], [0.4, 2.35]], '#94a3b8', 0.42, deform);
    drawRoundedBox(ctx, 0.0, 1.95, 0.8, 2.65, 0.15, '#090d16', deform);

    // Narrow painted mudguards
    drawRoundedBox(ctx, fX - 3.6, -0.82, fX - 1.2, 0.82, 0.38, shadePaint(baseColor, 0.05), deform, '#090d16', 0.32);
    drawRoundedBox(ctx, rX + 0.8, -0.88, rX + 4.4, 0.88, 0.38, shadePaint(baseColor, 0.05), deform, '#090d16', 0.32);
    return;
  }

  // Classic Standard Motorcycles: Izh Jupiter-5 & Jawa 350
  const isJawa = type === 'moto_jawa350';
  drawMotoWheel(ctx, fX - 3.0, 0, 6.0, 1.8, steer, deform, { hasBrakeDisc: isJawa, rimColor: '#e2e8f0' });
  drawMotoWheel(ctx, rX + 3.0, 0, 6.0, 2.05, 0, deform, { rimColor: '#e2e8f0' });

  // Front mudguard (chrome on Jawa 350, painted on Izh Jupiter) & painted rear mudguard
  drawRoundedBox(
    ctx,
    fX - 4.6,
    -1.15,
    fX - 1.5,
    1.15,
    0.52,
    isJawa ? '#e2e8f0' : shadePaint(baseColor, 0.04),
    deform,
    '#090d16',
    0.38
  );
  drawRoundedBox(ctx, rX + 1.0, -1.25, rX + 5.6, 1.25, 0.55, shadePaint(baseColor, -0.05), deform, '#090d16', 0.42);

  // Parallel-twin finned 350cc air-cooled cylinders protruding slightly beyond tank
  drawRoundedBox(ctx, -1.2, -2.05, 2.2, 2.05, 0.45, '#64748b', deform, '#0f172a', 0.42);
  for (let fx = -0.7; fx <= 1.7; fx += 0.55) {
    strokePoly(ctx, [[fx, -1.95], [fx, 1.95]], '#1e293b', 0.28, deform);
  }

  // Symmetrical twin chrome exhaust cigars (swept outwards on Jawa 350)
  for (const side of [-1, 1] as const) {
    drawChromePipe(
      ctx,
      [
        [1.9, side * 1.45],
        [-1.4, side * (isJawa ? 2.15 : 1.95)],
        [rX + 2.2, side * (isJawa ? 1.95 : 1.75)],
      ],
      0.74,
      deform
    );
    // Rider footpegs
    strokePoly(ctx, [[-0.8, side * 1.4], [-0.8, side * 2.55]], '#1e293b', 0.52, deform);
  }
}

// ============================================================================
// 2. UPPER LAYER (TANKS, FAIRINGS, SADDLES, HANDLEBARS, GAUGES, OPTICS)
// ============================================================================

export function renderMotorcycleUpperLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  const type = car.type;
  const opt = getLiveOpticsState(car);
  const steer = (car.steerAngle || 0) * 1.05;
  const fX = halfL - fc;
  const rX = -halfL + rc;

  // --------------------------------------------------------------------------
  // A. URAL SIDECAR UPPER (Motorcycle Tank, Saddles, Bars, Sidecar Windscreen)
  // --------------------------------------------------------------------------
  if (type === 'moto_ural_sidecar') {
    const bikeY = -halfW * 0.44;
    const carY = halfW * 0.44;
    const baseColor = car.color || '#365314';

    // Teardrop Ural fuel tank with white military/classic pinstripe & chrome cap
    const tankPts: Pt[] = [
      [4.2, bikeY - 0.85],
      [2.6, bikeY - 1.95],
      [-0.8, bikeY - 1.6],
      [-1.7, bikeY - 0.9],
      [-1.7, bikeY + 0.9],
      [-0.8, bikeY + 1.6],
      [2.6, bikeY + 1.95],
      [4.2, bikeY + 0.85],
    ];
    fillPoly(ctx, tankPts, createBodyMetallicGradient(ctx, 2.2, baseColor), deform, '#090d16', 0.52);
    strokePoly(ctx, [[3.4, bikeY], [-1.3, bikeY]], 'rgba(255,255,255,0.22)', 0.4, deform);
    drawDeformedDot(ctx, 2.0, bikeY, 0.55, '#cbd5e1', deform, '#0f172a', 0.25);

    // Classic Ural sprung solo tractor saddle + rear pillion pad
    drawRibbedSaddle(ctx, -4.8, -1.7, bikeY, 1.45, 1.75, '#1c1917', deform, 0.85);
    drawRibbedSaddle(ctx, -8.8, -5.5, bikeY, 1.35, 1.35, '#292524', deform, 0.85);

    // Steered handlebars + mirrors
    drawSteeredHandlebars(ctx, halfL * 0.42, bikeY, 3.6, 1.25, steer, deform, {
      barColor: '#cbd5e1',
      barWidth: 0.55,
      gripLen: 1.3,
      hasMirrors: true,
      mirrorStalk: 1.1,
    });

    // Motorcycle classic round chrome headlamp (xFrac ~ +0.35, yFrac = -0.22)
    drawClassicRoundHeadlamp(
      ctx,
      halfL * 0.70,
      bikeY,
      1.12,
      steer,
      opt,
      opt.leftHeadBroken,
      deform,
      shadePaint(baseColor, -0.1),
      true
    );

    // Motorcycle rear taillight (xFrac ~ -0.45, yFrac = -0.22)
    drawMotoTailAssembly(ctx, rX + 1.2, bikeY, opt, opt.leftTailBroken, deform, 1.4, true);

    // Sidecar curved framed glass windscreen (above sidecar cockpit front)
    drawBoxShadow(ctx, halfL * 0.08, carY - 2.1, halfL * 0.26, carY + 2.1, 0.6, -0.35, 0.4, 0.24, deform);
    fillPoly(
      ctx,
      [
        [halfL * 0.26, carY - 1.75],
        [halfL * 0.26, carY + 1.75],
        [halfL * 0.10, carY + 2.15],
        [halfL * 0.10, carY - 2.15],
      ],
      createGlassGradient(ctx, halfL * 0.26, carY - 2.1, halfL * 0.10, carY + 2.1, 'blue'),
      deform,
      '#cbd5e1',
      0.55
    );
    drawGlassGlint(ctx, halfL * 0.11, carY - 1.7, halfL * 0.24, carY + 1.7, 0.2, deform);
    return;
  }

  // --------------------------------------------------------------------------
  // B. SUPERBIKE 1000 (Stellar Superbike — Aero Fairing, Winglets, Cat-Eye LEDs)
  // --------------------------------------------------------------------------
  if (type === 'moto_sport') {
    const baseColor = car.color || '#dc2626';

    // Carbon MotoGP aero downforce winglets flanking nose
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [halfL * 0.62, side * 1.75],
          [halfL * 0.48, side * 3.45],
          [halfL * 0.34, side * 3.20],
          [halfL * 0.40, side * 1.75],
        ],
        '#111827',
        deform,
        '#475569',
        0.32
      );
    }

    // Wide sculpted race nose fairing & side belly cowls
    const fairingPts: Pt[] = [
      [fX - 0.6, -0.55],
      [fX - 1.3, -1.85],
      [halfL * 0.56, -2.55],
      [halfL * 0.12, -2.35],
      [-halfL * 0.12, -1.75],
      [-halfL * 0.12, 1.75],
      [halfL * 0.12, 2.35],
      [halfL * 0.56, 2.55],
      [fX - 1.3, 1.85],
      [fX - 0.6, 0.55],
    ];
    fillPoly(ctx, fairingPts, createBodyMetallicGradient(ctx, 2.6, baseColor), deform, '#090d16', 0.62);

    // Center ram-air intake scoop at nose tip
    drawRoundedBox(ctx, fX - 1.55, -0.52, fX - 0.7, 0.52, 0.2, '#090d16', deform);

    // Twin recessed cat-eye LED projector headlamps (xFrac ~ 0.44, yFrac = ±0.11)
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const cy = side * 1.1;
      fillPoly(
        ctx,
        [
          [fX - 0.9, cy - side * 0.45],
          [fX - 1.85, cy + side * 0.72],
          [fX - 2.55, cy + side * 0.48],
          [fX - 1.55, cy - side * 0.55],
        ],
        broken ? '#111827' : opt.headlightsOn ? (opt.highBeam ? '#ffffff' : '#e0f2fe') : '#94a3b8',
        deform,
        '#090d16',
        0.32
      );
      if (!broken && (opt.positionOn || opt.ignitionOn || opt.headlightsOn)) {
        strokePoly(
          ctx,
          [[fX - 1.0, cy - side * 0.35], [fX - 1.85, cy + side * 0.62]],
          turnInt > 0.08 ? '#fbbf24' : '#ffffff',
          0.45,
          deform
        );
      }
    }

    // Smoked double-bubble racing windscreen + backlit cyan TFT instrument dash underneath
    fillPoly(
      ctx,
      [
        [halfL * 0.72, -1.1],
        [halfL * 0.72, 1.1],
        [halfL * 0.44, 1.55],
        [halfL * 0.44, -1.55],
      ],
      createGlassGradient(ctx, halfL * 0.72, -1.5, halfL * 0.44, 1.5, 'smoke'),
      deform,
      '#090d16',
      0.45
    );
    drawRoundedBox(
      ctx,
      halfL * 0.54,
      -0.72,
      halfL * 0.63,
      0.72,
      0.16,
      opt.ignitionOn ? '#0ea5e9' : '#1e293b',
      deform
    );
    drawGlassGlint(ctx, halfL * 0.46, -1.2, halfL * 0.70, 1.2, 0.22, deform);

    // Clip-on sport bars + gold Ohlins USD fork caps + fairing mirrors
    drawSteeredHandlebars(ctx, halfL * 0.44, 0, 3.65, 1.45, steer * 0.7, deform, {
      barColor: '#475569',
      barWidth: 0.48,
      gripLen: 1.2,
      isClipOn: true,
      forkCapColor: '#f59e0b',
    });
    for (const side of [-1, 1] as const) {
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      strokePoly(ctx, [[halfL * 0.56, side * 1.9], [halfL * 0.68, side * 3.85]], '#0f172a', 0.42, deform);
      drawRoundedBox(
        ctx,
        halfL * 0.62,
        side * 3.9 - 0.45,
        halfL * 0.76,
        side * 3.9 + 0.45,
        0.2,
        turnInt > 0.08 ? '#fbbf24' : '#111827',
        deform,
        '#475569',
        0.22
      );
    }

    // Sculpted knee-indented sport fuel tank + billet aluminum gas cap
    fillPoly(
      ctx,
      [
        [halfL * 0.34, -1.15],
        [halfL * 0.16, -2.05],
        [-halfL * 0.14, -1.45],
        [-halfL * 0.14, 1.45],
        [halfL * 0.16, 2.05],
        [halfL * 0.34, 1.15],
      ],
      createBodyMetallicGradient(ctx, 2.1, shadePaint(baseColor, 0.08)),
      deform,
      '#090d16',
      0.48
    );
    drawDeformedDot(ctx, halfL * 0.14, 0, 0.58, '#cbd5e1', deform, '#1e293b', 0.25);

    // Split alcantara rider saddle + sharp sculpted pillion tail cowl
    drawRibbedSaddle(ctx, -halfL * 0.54, -halfL * 0.14, 0, 1.45, 1.65, '#18181b', deform, 1.2);
    fillPoly(
      ctx,
      [
        [-halfL * 0.52, -1.65],
        [-halfL * 0.90, -0.85],
        [-halfL * 0.96, 0],
        [-halfL * 0.90, 0.85],
        [-halfL * 0.52, 1.65],
      ],
      createBodyMetallicGradient(ctx, 1.65, baseColor),
      deform,
      '#090d16',
      0.52
    );
    // Razor V-blade LED taillight integrated into sharp tail cowl
    const tailFill = opt.leftTailBroken && opt.rightTailBroken
      ? '#111827'
      : opt.braking
      ? '#ff3b3b'
      : opt.positionOn
      ? '#ef4444'
      : '#7f1d1d';
    strokePoly(
      ctx,
      [
        [-halfL * 0.82, -0.95],
        [-halfL * 0.95, 0],
        [-halfL * 0.82, 0.95],
      ],
      tailFill,
      0.78,
      deform
    );
    return;
  }

  // --------------------------------------------------------------------------
  // C. V-TWIN CRUISER / CHOPPER (Stellar V-Twin Cruiser)
  // --------------------------------------------------------------------------
  if (type === 'moto_chopper') {
    const baseColor = car.color || '#1e293b';

    // Wide sculpted teardrop fuel tank with chrome center console dash & dual caps
    fillPoly(
      ctx,
      [
        [halfL * 0.34, -1.15],
        [halfL * 0.18, -2.45],
        [-halfL * 0.10, -2.05],
        [-halfL * 0.20, -1.2],
        [-halfL * 0.20, 1.2],
        [-halfL * 0.10, 2.05],
        [halfL * 0.18, 2.45],
        [halfL * 0.34, 1.15],
      ],
      createBodyMetallicGradient(ctx, 2.45, baseColor),
      deform,
      '#090d16',
      0.58
    );
    // Chrome tank dash console + round analog speedometer
    drawRoundedBox(ctx, -halfL * 0.14, -0.78, halfL * 0.26, 0.78, 0.45, '#e2e8f0', deform, '#334155', 0.3);
    drawDeformedDot(ctx, halfL * 0.08, 0, 0.56, '#0f172a', deform, '#cbd5e1', 0.25);
    for (const side of [-1, 1] as const) {
      drawDeformedDot(ctx, halfL * 0.10, side * 1.45, 0.42, '#cbd5e1', deform, '#1e293b', 0.22);
    }

    // Low sculpted studded cruiser saddle + passenger pillion + chrome sissy bar
    drawRibbedSaddle(ctx, -halfL * 0.62, -halfL * 0.18, 0, 1.75, 2.15, '#1c1917', deform, 1.15);
    drawChromePipe(
      ctx,
      [
        [-halfL * 0.52, -1.65],
        [-halfL * 0.72, -1.25],
        [-halfL * 0.76, 0],
        [-halfL * 0.72, 1.25],
        [-halfL * 0.52, 1.65],
      ],
      0.52,
      deform
    );
    drawRoundedBox(ctx, -halfL * 0.76, -1.0, -halfL * 0.62, 1.0, 0.35, '#292524', deform, '#090d16', 0.35);

    // Wide swept-back chrome beach/buckhorn handlebars + tear mirrors
    drawSteeredHandlebars(ctx, halfL * 0.42, 0, 5.1, 2.35, steer, deform, {
      barColor: '#f1f5f9',
      barWidth: 0.62,
      gripLen: 1.55,
      hasMirrors: true,
      mirrorStalk: 1.25,
      forkCapColor: '#f8fafc',
    });

    // Chrome bullet main headlamp + twin passing spotlights (xFrac ~ 0.38, yFrac = 0)
    drawClassicRoundHeadlamp(
      ctx,
      halfL * 0.72,
      0,
      1.28,
      steer,
      opt,
      opt.leftHeadBroken && opt.rightHeadBroken,
      deform,
      '#e2e8f0',
      false
    );
    const cos = Math.cos(steer);
    const sin = Math.sin(steer);
    for (const side of [-1, 1] as const) {
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const px = halfL * 0.66 - side * 1.95 * sin;
      const py = side * 1.95 * cos;
      drawDeformedDot(
        ctx,
        px,
        py,
        0.62,
        opt.headlightsOn || opt.frontFogOn ? '#fef3c7' : '#cbd5e1',
        deform,
        '#1e293b',
        0.26
      );
      drawDeformedDot(
        ctx,
        px - 0.4 * cos,
        py + side * 0.75 * cos,
        0.38,
        turnInt > 0.08 ? '#fbbf24' : '#b45309',
        deform,
        '#0f172a',
        0.2
      );
    }

    // Bobbed rear fender chrome taillight
    drawMotoTailAssembly(ctx, rX + 1.5, 0, opt, opt.leftTailBroken && opt.rightTailBroken, deform, 1.75, true);
    return;
  }

  // --------------------------------------------------------------------------
  // D. SOVIET MOPED 50cc (Stellar Cub Moped — Riga / Karpaty)
  // --------------------------------------------------------------------------
  if (type === 'moped_soviet') {
    const baseColor = car.color || '#eab308';

    // Compact boxy front fuel tank + chrome filler cap
    drawRoundedBox(ctx, 0.2, -1.25, halfL * 0.44, 1.25, 0.55, createBodyMetallicGradient(ctx, 1.3, baseColor), deform, '#090d16', 0.45);
    drawDeformedDot(ctx, halfL * 0.26, 0, 0.42, '#cbd5e1', deform, '#0f172a', 0.2);

    // Sprung single retro moped saddle
    drawRibbedSaddle(ctx, -halfL * 0.44, -0.3, 0, 1.05, 1.45, '#292524', deform, 0.9);

    // Chrome wire rear luggage carrier rack
    const rkX1 = rX + 1.4;
    const rkX2 = -halfL * 0.45;
    strokePoly(
      ctx,
      [
        [rkX1, -1.25],
        [rkX2, -1.25],
        [rkX2, 1.25],
        [rkX1, 1.25],
      ],
      '#cbd5e1',
      0.52,
      deform,
      true
    );
    for (let sx = rkX1 + 0.8; sx < rkX2 - 0.3; sx += 0.95) {
      strokePoly(ctx, [[sx, -1.2], [sx, 1.2]], '#94a3b8', 0.35, deform);
    }

    // Narrow chrome moped handlebars
    drawSteeredHandlebars(ctx, halfL * 0.50, 0, 3.1, 0.95, steer, deform, {
      barColor: '#e2e8f0',
      barWidth: 0.44,
      gripLen: 1.0,
      hasMirrors: true,
      mirrorStalk: 0.9,
    });

    // Compact round moped headlamp & mini taillight
    drawClassicRoundHeadlamp(ctx, halfL * 0.72, 0, 0.92, steer, opt, opt.leftHeadBroken && opt.rightHeadBroken, deform, '#cbd5e1', true);
    drawMotoTailAssembly(ctx, rX + 0.9, 0, opt, opt.leftTailBroken && opt.rightTailBroken, deform, 1.15, true);
    return;
  }

  // --------------------------------------------------------------------------
  // E. CLASSIC STANDARD MOTORCYCLES: IZH JUPITER-5 & JAWA 350
  // --------------------------------------------------------------------------
  const isJawa = type === 'moto_jawa350';
  const baseColor = car.color || (isJawa ? '#991b1b' : '#2563eb');

  // Sculpted fuel tank (Jawa teardrop with polished chrome knee panels + gold stripe; Izh squared-teardrop with black rubber knee pads)
  const tankPts: Pt[] = isJawa
    ? [
        [halfL * 0.38, -0.9],
        [halfL * 0.22, -2.15],
        [-halfL * 0.08, -1.65],
        [-halfL * 0.16, -0.95],
        [-halfL * 0.16, 0.95],
        [-halfL * 0.08, 1.65],
        [halfL * 0.22, 2.15],
        [halfL * 0.38, 0.9],
      ]
    : [
        [halfL * 0.38, -1.15],
        [halfL * 0.26, -2.05],
        [-halfL * 0.12, -1.85],
        [-halfL * 0.18, -1.1],
        [-halfL * 0.18, 1.1],
        [-halfL * 0.12, 1.85],
        [halfL * 0.26, 2.05],
        [halfL * 0.38, 1.15],
      ];
  fillPoly(ctx, tankPts, createBodyMetallicGradient(ctx, 2.1, baseColor), deform, '#090d16', 0.55);

  if (isJawa) {
    // Signature Jawa chrome side teardrop panels + crisp gold center pinstripe
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [halfL * 0.26, side * 1.35],
          [halfL * 0.18, side * 2.02],
          [-halfL * 0.06, side * 1.58],
          [-halfL * 0.04, side * 1.15],
        ],
        '#e2e8f0',
        deform,
        '#d97706',
        0.32
      );
    }
    strokePoly(ctx, [[halfL * 0.34, 0], [-halfL * 0.14, 0]], '#fbbf24', 0.35, deform);
  } else {
    // Izh Jupiter black rubber knee grip pads + center seam crease
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, -halfL * 0.08, side * 1.65 - 0.32, halfL * 0.18, side * 1.65 + 0.32, 0.2, '#111827', deform);
    }
    strokePoly(ctx, [[halfL * 0.34, 0], [-halfL * 0.14, 0]], 'rgba(255,255,255,0.22)', 0.38, deform);
  }
  // Chrome fuel filler cap
  drawDeformedDot(ctx, halfL * 0.18, 0, 0.52, '#cbd5e1', deform, '#0f172a', 0.25);

  // Long ribbed double leather saddle + rear chrome passenger grab rail
  drawRibbedSaddle(ctx, -halfL * 0.72, -halfL * 0.16, 0, 1.45, 1.75, '#1c1917', deform, 1.05);
  drawChromePipe(
    ctx,
    [
      [-halfL * 0.52, -1.65],
      [-halfL * 0.76, -1.55],
      [-halfL * 0.80, 0],
      [-halfL * 0.76, 1.55],
      [-halfL * 0.52, 1.65],
    ],
    0.45,
    deform
  );

  // Twin chrome analog speedometer & tachometer dials ahead of triple-tree
  const cos = Math.cos(steer);
  const sin = Math.sin(steer);
  for (const side of [-1, 1] as const) {
    const gx = halfL * 0.54 + 0.15 * cos - side * 0.68 * sin;
    const gy = 0.15 * sin + side * 0.68 * cos;
    drawDeformedDot(ctx, gx, gy, 0.52, '#0f172a', deform, '#e2e8f0', 0.28);
  }

  // Steered chrome handlebars + mirrors
  drawSteeredHandlebars(ctx, halfL * 0.44, 0, 4.1, 1.25, steer, deform, {
    barColor: '#e2e8f0',
    barWidth: 0.54,
    gripLen: 1.35,
    hasMirrors: true,
    mirrorStalk: 1.15,
  });

  // Classic round chrome headlamp + stalk blinkers (xFrac ~ +0.36, yFrac = 0)
  drawClassicRoundHeadlamp(
    ctx,
    halfL * 0.72,
    0,
    1.15,
    steer,
    opt,
    opt.leftHeadBroken && opt.rightHeadBroken,
    deform,
    isJawa ? '#e2e8f0' : shadePaint(baseColor, -0.06),
    true
  );

  // Rear taillight + stalk blinkers (xFrac ~ -0.45, yFrac = 0)
  drawMotoTailAssembly(ctx, rX + 1.2, 0, opt, opt.leftTailBroken && opt.rightTailBroken, deform, 1.55, true);
}

import type { VehicleRenderContext } from './vehicleArchetypes';
import { isVehicleHoodExposed } from './engineBayVisuals';
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
  createRoofGradient,
  createGlassGradient,
  drawCabinInteriorHint,
  drawGlassGlint,
  drawIntegratedHeadlight,
  drawIntegratedTaillight,
  drawCorrugatedDeck,
  drawTreadplateSurface,
  drawTreadedTire,
  drawRoadTrainMarkers,
  drawSideMirrorArm,
  LiveOpticsState,
} from './vehicleModelPrimitives';

export const REDRAWN_VAN_BUS_TYPES: ReadonlySet<string> = new Set([
  'van',
  'van_camper',
  'van_cargo_old',
  'delivery_truck',
  'ambulance',
  'ambulance_van',
  'bus_minibus',
  'bus',
]);

export function isRedrawnVanBus(type: string | undefined | null): boolean {
  return !!type && REDRAWN_VAN_BUS_TYPES.has(type);
}

// ============================================================================
// 1. WHEELS (BLUEPRINT AXLE POSITIONS & TIRE PROPORTIONS)
// ============================================================================

export function renderVanBusWheels(
  vCtx: VehicleRenderContext,
  steerAngle: number
): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const type = car.type;
  const effSteer = steerAngle || 0;

  let frontX = halfL * 0.56;
  let rearX = -halfL * 0.54;
  let wheelLen = 7.4;
  let wheelW = 2.65;
  let trackY = halfW - 1.1;
  let rearDual = false;

  if (type === 'van_cargo_old') {
    frontX = halfL * 0.58;
    rearX = -halfL * 0.56;
    wheelLen = 7.0;
    wheelW = 2.6;
    trackY = halfW - 1.0;
  } else if (type === 'van_camper') {
    frontX = halfL * 0.58;
    rearX = -halfL * 0.44;
    wheelLen = 7.5;
    wheelW = 2.7;
    trackY = halfW - 1.15;
    rearDual = true;
  } else if (type === 'delivery_truck') {
    frontX = halfL * 0.54;
    rearX = -halfL * 0.50;
    wheelLen = 7.8;
    wheelW = 2.85;
    trackY = halfW - 1.15;
    rearDual = true;
  } else if (type === 'ambulance' || type === 'ambulance_van') {
    frontX = halfL * 0.56;
    rearX = -halfL * 0.48;
    wheelLen = 7.6;
    wheelW = 2.75;
    trackY = halfW - 1.1;
  } else if (type === 'bus_minibus') {
    frontX = halfL * 0.58;
    rearX = -halfL * 0.50;
    wheelLen = 8.0;
    wheelW = 2.9;
    trackY = halfW - 1.15;
    rearDual = true;
  } else if (type === 'bus') {
    frontX = halfL * 0.54;
    rearX = -halfL * 0.48;
    wheelLen = 9.4;
    wheelW = 3.2;
    trackY = halfW - 1.25;
    rearDual = true;
  }

  for (const side of [-1, 1] as const) {
    const [fx, fy] = deform(frontX, side * trackY);
    drawTreadedTire(ctx, fx, fy, wheelLen, wheelW, effSteer, type === 'bus' ? 'heavy' : 'road');

    const [rx, ry] = deform(rearX, side * trackY);
    drawTreadedTire(ctx, rx, ry, wheelLen, wheelW, 0, rearDual ? 'heavy' : 'road');
    if (rearDual) {
      const [rxIn, ryIn] = deform(rearX, side * (trackY - wheelW * 0.85));
      drawTreadedTire(ctx, rxIn, ryIn, wheelLen, wheelW * 0.88, 0, 'heavy');
    }
  }
}

// ============================================================================
// SHARED COMMERCIAL AUTOMOTIVE DETAIL HELPERS
// ============================================================================

function drawHullContouredShape(
  type: string,
  halfL: number,
  halfW: number,
  fc: number,
  rc: number
): Pt[] {
  const fX = halfL - fc;
  const rX = -halfL + rc;

  if (type === 'van_cargo_old') {
    // UAZ-452 Bukhanka iconic rounded loaf hull
    return [
      [fX, -halfW * 0.56],
      [fX - 0.55, -halfW * 0.84],
      [fX - 2.0, -halfW * 0.98],
      [halfL * 0.52, -halfW],
      [-halfL * 0.58, -halfW],
      [rX + 1.8, -halfW * 0.97],
      [rX + 0.5, -halfW * 0.82],
      [rX, -halfW * 0.56],
      [rX, halfW * 0.56],
      [rX + 0.5, halfW * 0.82],
      [rX + 1.8, halfW * 0.97],
      [-halfL * 0.58, halfW],
      [halfL * 0.52, halfW],
      [fX - 2.0, halfW * 0.98],
      [fX - 0.55, halfW * 0.84],
      [fX, halfW * 0.56],
    ];
  }

  if (type === 'van_camper') {
    // Tapered Ducato/Sprinter front cab stepping smoothly into wider RV living module
    const cabW = halfW * 0.88;
    const boxW = halfW * 1.03;
    return [
      [fX, -cabW * 0.68],
      [fX - 0.7, -cabW * 0.90],
      [fX - 2.4, -cabW],
      [halfL * 0.33, -cabW],
      [halfL * 0.25, -boxW],
      [-halfL * 0.64, -boxW],
      [rX + 1.1, -boxW * 0.97],
      [rX, -boxW * 0.84],
      [rX, boxW * 0.84],
      [rX + 1.1, boxW * 0.97],
      [-halfL * 0.64, boxW],
      [halfL * 0.25, boxW],
      [halfL * 0.33, cabW],
      [fX - 2.4, cabW],
      [fX - 0.7, cabW * 0.90],
      [fX, cabW * 0.68],
    ];
  }

  if (type === 'delivery_truck') {
    // Grumman Olson / MT45 Stepvan: slightly inset walk-in nose + square cargo cube
    const noseW = halfW * 0.88;
    return [
      [fX, -noseW * 0.82],
      [fX - 0.8, -noseW],
      [halfL * 0.66, -noseW],
      [halfL * 0.56, -halfW],
      [rX + 0.9, -halfW],
      [rX, -halfW * 0.90],
      [rX, halfW * 0.90],
      [rX + 0.9, halfW],
      [halfL * 0.56, halfW],
      [halfL * 0.66, noseW],
      [fX - 0.8, noseW],
      [fX, noseW * 0.82],
    ];
  }

  if (type === 'bus') {
    // Sleek 12m CityBus: gentle panoramic front/rear corner chamfers
    return [
      [fX, -halfW * 0.78],
      [fX - 0.65, -halfW * 0.94],
      [fX - 2.2, -halfW],
      [rX + 1.8, -halfW],
      [rX + 0.5, -halfW * 0.94],
      [rX, -halfW * 0.80],
      [rX, halfW * 0.80],
      [rX + 0.5, halfW * 0.94],
      [rX + 1.8, halfW],
      [fX - 2.2, halfW],
      [fX - 0.65, halfW * 0.94],
      [fX, halfW * 0.78],
    ];
  }

  // Modern commercial van / ambulance / minibus: tapered aerodynamic semi-bonnet nose + straight flanks
  return [
    [fX, -halfW * 0.66],
    [fX - 0.65, -halfW * 0.88],
    [fX - 2.4, -halfW],
    [halfL * 0.42, -halfW],
    [rX + 1.2, -halfW],
    [rX + 0.3, -halfW * 0.92],
    [rX, -halfW * 0.78],
    [rX, halfW * 0.78],
    [rX + 0.3, halfW * 0.92],
    [rX + 1.2, halfW],
    [halfL * 0.42, halfW],
    [fX - 2.4, halfW],
    [fX - 0.65, halfW * 0.88],
    [fX, halfW * 0.66],
  ];
}

function drawWheelArchFlares(
  ctx: CanvasRenderingContext2D,
  frontX: number,
  rearX: number,
  halfW: number,
  archLen: number,
  archDepth: number,
  claddingColor: string,
  deform: DeformFn
): void {
  for (const side of [-1, 1] as const) {
    const outerY = side * halfW;
    const innerY = side * (halfW - archDepth);
    for (const ax of [frontX, rearX]) {
      const hl = archLen * 0.5;
      fillPoly(
        ctx,
        [
          [ax - hl, outerY],
          [ax - hl * 0.72, innerY],
          [ax + hl * 0.72, innerY],
          [ax + hl, outerY],
        ],
        claddingColor,
        deform,
        'rgba(2,6,23,0.42)',
        0.35
      );
    }
  }
}

function drawSideRubStripsAndHandles(
  ctx: CanvasRenderingContext2D,
  xFront: number,
  xRear: number,
  halfW: number,
  doorSplitsX: number[],
  handleXs: number[],
  deform: DeformFn,
  stripColor = 'rgba(15,23,42,0.58)'
): void {
  for (const side of [-1, 1] as const) {
    const yEdge = side * (halfW - 0.42);
    // Protective body rub molding along lower flank
    strokePoly(
      ctx,
      [
        [xRear, yEdge],
        [xFront, yEdge],
      ],
      stripColor,
      0.65,
      deform
    );
    // Subtle shoulder highlight crease just inboard of flank edge
    strokePoly(
      ctx,
      [
        [xRear + 1.0, side * (halfW - 1.15)],
        [xFront - 1.0, side * (halfW - 1.15)],
      ],
      'rgba(255,255,255,0.16)',
      0.38,
      deform
    );
    // Door shutline ticks visible along top shoulder
    for (const dx of doorSplitsX) {
      strokePoly(
        ctx,
        [
          [dx, side * (halfW - 1.55)],
          [dx, side * (halfW - 0.25)],
        ],
        'rgba(15,23,42,0.45)',
        0.42,
        deform
      );
    }
    // Flush commercial door handles
    for (const hx of handleXs) {
      drawRoundedBox(
        ctx,
        hx - 0.75,
        side * (halfW - 0.92) - 0.24,
        hx + 0.75,
        side * (halfW - 0.92) + 0.24,
        0.16,
        '#1e293b',
        deform,
        'rgba(255,255,255,0.18)',
        0.22
      );
    }
  }
}

function drawWiperPair(
  ctx: CanvasRenderingContext2D,
  cowlX: number,
  spanY: number,
  bladeLen: number,
  deform: DeformFn,
  pantograph = false
): void {
  for (const offset of [-spanY * 0.42, spanY * 0.22]) {
    if (pantograph) {
      strokePoly(
        ctx,
        [
          [cowlX + 0.3, offset],
          [cowlX - bladeLen * 0.55, offset + spanY * 0.22],
          [cowlX - bladeLen * 0.48, offset + spanY * 0.28],
        ],
        '#090d16',
        0.58,
        deform
      );
    } else {
      strokePoly(
        ctx,
        [
          [cowlX + 0.35, offset],
          [cowlX - bladeLen * 0.45, offset + spanY * 0.26],
        ],
        '#0f172a',
        0.52,
        deform
      );
    }
  }
}

function drawModernVanFrontEnd(
  ctx: CanvasRenderingContext2D,
  halfL: number,
  halfW: number,
  fc: number,
  bodyColor: string,
  opt: LiveOpticsState,
  deform: DeformFn,
  options: {
    cabHalfW?: number;
    hoodEndX: number;
    hoodExposed: boolean;
    grilleChrome?: boolean;
    badgeColor?: string;
    hasFogs?: boolean;
    headlightYFrac?: number;
    fogYFrac?: number;
  }
): void {
  const fX = halfL - fc;
  const cw = options.cabHalfW ?? halfW;
  const hY = (options.headlightYFrac ?? 0.355) * (halfW * 2);
  const fY = (options.fogYFrac ?? 0.385) * (halfW * 2);

  // Molded matte-black/anthracite front commercial bumper valence with step pocket
  fillPoly(
    ctx,
    [
      [fX + 0.15, -cw * 0.68],
      [fX - 0.55, -cw * 0.90],
      [fX - 1.9, -cw * 0.98],
      [fX - 2.3, -cw * 0.86],
      [fX - 1.3, -cw * 0.58],
      [fX - 1.3, cw * 0.58],
      [fX - 2.3, cw * 0.86],
      [fX - 1.9, cw * 0.98],
      [fX - 0.55, cw * 0.90],
      [fX + 0.15, cw * 0.68],
    ],
    '#1e293b',
    deform,
    '#090d16',
    0.55
  );
  // Central license plate / bumper step recess
  drawRoundedBox(
    ctx,
    fX - 1.05,
    -cw * 0.25,
    fX - 0.05,
    cw * 0.25,
    0.25,
    '#334155',
    deform,
    '#0f172a',
    0.3
  );
  drawRoundedBox(
    ctx,
    fX - 0.65,
    -cw * 0.17,
    fX - 0.12,
    cw * 0.17,
    0.15,
    '#f1f5f9',
    deform
  );

  // Multi-slat radiator grille with emblem
  drawRoundedBox(
    ctx,
    fX - 2.2,
    -cw * 0.44,
    fX - 0.95,
    cw * 0.44,
    0.45,
    '#0f172a',
    deform,
    options.grilleChrome ? '#cbd5e1' : '#334155',
    0.45
  );
  for (const sy of [-cw * 0.28, -cw * 0.14, 0, cw * 0.14, cw * 0.28]) {
    strokePoly(
      ctx,
      [
        [fX - 2.0, sy],
        [fX - 1.15, sy],
      ],
      options.grilleChrome ? 'rgba(226,232,240,0.55)' : 'rgba(148,163,184,0.34)',
      0.38,
      deform
    );
  }
  drawDeformedDot(
    ctx,
    fX - 1.55,
    0,
    0.72,
    options.badgeColor || '#e2e8f0',
    deform,
    '#0f172a',
    0.3
  );

  // Sculpted hood panel + power bulges + cowl intake grille (skipped if hood is open!)
  if (!options.hoodExposed) {
    const hStart = options.hoodEndX;
    const hFront = fX - 2.15;
    fillPoly(
      ctx,
      [
        [hFront, -cw * 0.66],
        [hStart, -cw * 0.78],
        [hStart, cw * 0.78],
        [hFront, cw * 0.66],
      ],
      createBodyMetallicGradient(ctx, cw, shadePaint(bodyColor, 0.04)),
      deform,
      'rgba(15,23,42,0.44)',
      0.48
    );
    // Longitudinal sculpted hood character creases
    for (const side of [-1, 1] as const) {
      strokePoly(
        ctx,
        [
          [hFront + 0.35, side * cw * 0.38],
          [hStart + 0.5, side * cw * 0.50],
        ],
        'rgba(255,255,255,0.22)',
        0.45,
        deform
      );
      strokePoly(
        ctx,
        [
          [hFront + 0.35, side * cw * 0.42],
          [hStart + 0.5, side * cw * 0.54],
        ],
        'rgba(15,23,42,0.22)',
        0.38,
        deform
      );
    }
    // Black plastic cowl vent screen + washer nozzles
    drawRoundedBox(
      ctx,
      hStart - 0.25,
      -cw * 0.68,
      hStart + 1.25,
      cw * 0.68,
      0.35,
      '#111827',
      deform,
      '#020617',
      0.35
    );
    for (let vy = -cw * 0.54; vy <= cw * 0.54; vy += 1.4) {
      strokePoly(
        ctx,
        [
          [hStart + 0.05, vy],
          [hStart + 0.95, vy],
        ],
        'rgba(148,163,184,0.25)',
        0.32,
        deform
      );
    }
  }

  // Integrated multi-layer headlights aligned directly with opticsMounts
  for (const side of [-1, 1] as const) {
    const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
    const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
    const cy = side * hY;
    const ly1 = cy - 1.45;
    const ly2 = cy + 1.45;
    drawIntegratedHeadlight(
      ctx,
      fX - 2.65,
      ly1,
      fX - 0.55,
      ly2,
      side,
      'modern_led',
      opt.headlightsOn,
      opt.highBeam,
      opt.positionOn || opt.ignitionOn,
      turnInt,
      broken,
      deform
    );

    // Corner bumper fog light pods
    if (options.hasFogs !== false) {
      const fy = side * fY;
      drawRoundedBox(
        ctx,
        fX - 1.45,
        fy - 0.65,
        fX - 0.35,
        fy + 0.65,
        0.35,
        '#090d16',
        deform
      );
      drawDeformedDot(
        ctx,
        fX - 0.85,
        fy,
        0.46,
        opt.frontFogOn && !broken ? '#fef08a' : '#64748b',
        deform,
        '#1e293b',
        0.22
      );
    }
  }
}

function drawCommercialRearEnd(
  ctx: CanvasRenderingContext2D,
  halfL: number,
  halfW: number,
  rc: number,
  opt: LiveOpticsState,
  deform: DeformFn,
  options: {
    rearHalfW?: number;
    taillightYFrac?: number;
    hasStepBumper?: boolean;
    barnDoorSplit?: boolean;
    hasChmsl?: boolean;
    hasExhaust?: boolean;
  }
): void {
  const rX = -halfL + rc;
  const rw = options.rearHalfW ?? halfW;
  const tY = (options.taillightYFrac ?? 0.405) * (halfW * 2);

  // Integrated rear bumper / step deck
  const bumpDepth = options.hasStepBumper ? 1.85 : 1.15;
  drawRoundedBox(
    ctx,
    rX - 0.15,
    -rw * 0.90,
    rX + bumpDepth,
    rw * 0.90,
    0.45,
    '#1e293b',
    deform,
    '#090d16',
    0.5
  );
  if (options.hasStepBumper) {
    drawTreadplateSurface(
      ctx,
      rX + 0.15,
      -rw * 0.56,
      rX + bumpDepth - 0.2,
      rw * 0.56,
      '#334155',
      deform,
      1.6
    );
  }
  // Rear license plate pocket
  drawRoundedBox(
    ctx,
    rX + 0.1,
    -rw * 0.17,
    rX + 0.72,
    rw * 0.17,
    0.15,
    '#e2e8f0',
    deform,
    '#0f172a',
    0.25
  );

  // Rear barn door center seam & stainless hinges
  if (options.barnDoorSplit) {
    strokePoly(ctx, [[rX + bumpDepth, 0], [rX + bumpDepth + 2.6, 0]], 'rgba(15,23,42,0.58)', 0.55, deform);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        rX + bumpDepth - 0.25,
        side * rw * 0.62 - 0.35,
        rX + bumpDepth + 0.55,
        side * rw * 0.62 + 0.35,
        0.15,
        '#475569',
        deform
      );
    }
  }

  // Tailpipe tip on left rear underside
  if (options.hasExhaust !== false) {
    drawRoundedBox(
      ctx,
      rX - 0.55,
      -rw * 0.58,
      rX + 0.45,
      -rw * 0.45,
      0.2,
      '#64748b',
      deform,
      '#0f172a',
      0.35
    );
  }

  // Multi-chamber rear taillights aligned with opticsMounts
  for (const side of [-1, 1] as const) {
    const broken = side < 0 ? opt.leftTailBroken : opt.rightTailBroken;
    const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
    const cy = side * tY;
    drawIntegratedTaillight(
      ctx,
      rX + 0.25,
      cy - 1.55,
      rX + 1.85,
      cy + 1.55,
      side,
      opt.positionOn,
      opt.braking,
      opt.reversing,
      turnInt,
      opt.rearFogOn,
      broken,
      deform
    );
  }

  // High-mount third brake light (CHMSL)
  if (options.hasChmsl) {
    drawRoundedBox(
      ctx,
      rX + 0.9,
      -2.0,
      rX + 1.75,
      2.0,
      0.28,
      '#0f172a',
      deform
    );
    drawRoundedBox(
      ctx,
      rX + 1.05,
      -1.65,
      rX + 1.58,
      1.65,
      0.18,
      opt.braking ? '#ff3b3b' : '#7f1d1d',
      deform
    );
  }
}

function drawEmergencyLightbar(
  ctx: CanvasRenderingContext2D,
  barX: number,
  barHalfW: number,
  sirenOn: boolean,
  strobe: number,
  deform: DeformFn,
  barLen = 2.6
): void {
  const hl = barLen * 0.5;
  // Cast roof drop shadow under aerodynamic lightbar
  drawBoxShadow(ctx, barX - hl, -barHalfW, barX + hl, barHalfW, 0.75, -0.8, 0.75, 0.34, deform);

  // Outer clear polycarbonate shroud & aluminum mounting feet
  for (const side of [-1, 1] as const) {
    drawRoundedBox(
      ctx,
      barX - hl * 0.72,
      side * (barHalfW - 0.8) - 0.5,
      barX + hl * 0.72,
      side * (barHalfW - 0.8) + 0.5,
      0.2,
      '#334155',
      deform
    );
  }
  drawRoundedBox(
    ctx,
    barX - hl,
    -barHalfW,
    barX + hl,
    barHalfW,
    0.8,
    '#0f172a',
    deform,
    '#475569',
    0.45
  );

  // Left Red & Right Blue LED banks + central white/amber takedown speaker pod
  const redPulse = sirenOn ? 0.5 + 0.5 * Math.sin(strobe) : 0;
  const bluePulse = sirenOn ? 0.5 - 0.5 * Math.sin(strobe) : 0;

  drawRoundedBox(
    ctx,
    barX - hl + 0.25,
    -barHalfW + 0.35,
    barX + hl - 0.25,
    -barHalfW * 0.20,
    0.45,
    sirenOn ? (redPulse > 0.45 ? '#ff3333' : '#b91c1c') : '#991b1b',
    deform
  );
  drawRoundedBox(
    ctx,
    barX - hl + 0.25,
    barHalfW * 0.20,
    barX + hl - 0.25,
    barHalfW - 0.35,
    0.45,
    sirenOn ? (bluePulse > 0.45 ? '#38bdf8' : '#1d4ed8') : '#1e3a8a',
    deform
  );
  // Central chrome/white LED alley-speaker pod
  drawRoundedBox(
    ctx,
    barX - hl + 0.3,
    -barHalfW * 0.20,
    barX + hl - 0.3,
    barHalfW * 0.20,
    0.25,
    '#cbd5e1',
    deform,
    '#334155',
    0.25
  );

  if (sirenOn) {
    if (redPulse > 0.45) {
      drawDeformedDot(ctx, barX, -barHalfW * 0.58, 0.85, '#fecaca', deform);
    }
    if (bluePulse > 0.45) {
      drawDeformedDot(ctx, barX, barHalfW * 0.58, 0.85, '#e0f2fe', deform);
    }
  }
}

function drawRedCrossEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  deform: DeformFn,
  armColor = '#dc2626',
  bgCircle?: string
): void {
  if (bgCircle) {
    drawDeformedDot(ctx, cx, cy, radius * 1.18, bgCircle, deform, 'rgba(15,23,42,0.22)', 0.35);
  }
  const t = radius * 0.34;
  drawRoundedBox(ctx, cx - radius, cy - t, cx + radius, cy + t, 0.18, armColor, deform);
  drawRoundedBox(ctx, cx - t, cy - radius, cx + t, cy + radius, 0.18, armColor, deform);
}

// ============================================================================
// 2. CHASSIS LAYER (CONTOURED HULL, WHEEL ARCHES, BUMPERS, GRILLES, OPTICS)
// ============================================================================

export function renderVanBusChassisLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  const type = car.type;
  const opt = getLiveOpticsState(car);
  const hoodExposed = isVehicleHoodExposed(car);
  const fX = halfL - fc;
  const rX = -halfL + rc;

  const baseColor =
    type === 'ambulance'
      ? '#f8fafc'
      : type === 'ambulance_van'
      ? '#facc15'
      : type === 'van_camper'
      ? '#f1f5f9'
      : car.color || '#cbd5e1';

  // Contoured clearcoat body shell
  const hullPts = drawHullContouredShape(type, halfL, halfW, fc, rc);
  fillPoly(
    ctx,
    hullPts,
    createBodyMetallicGradient(ctx, halfW, baseColor),
    deform,
    'rgba(10,14,22,0.82)',
    1.1
  );

  // Subtle top bevel sheen inside outer hull
  strokePoly(
    ctx,
    hullPts.map(([px, py]) => [px * 0.985, py * 0.96]),
    'rgba(255,255,255,0.14)',
    0.45,
    deform,
    true
  );

  // --------------------------------------------------------------------------
  // A. VAN (Bison Transporter Van — Modern Commercial Cargo Van)
  // --------------------------------------------------------------------------
  if (type === 'van') {
    drawWheelArchFlares(ctx, halfL * 0.56, -halfL * 0.54, halfW, 7.8, 0.95, '#1e293b', deform);
    drawSideRubStripsAndHandles(
      ctx,
      halfL * 0.66,
      -halfL * 0.80,
      halfW,
      [halfL * 0.24, -halfL * 0.26],
      [halfL * 0.34, halfL * 0.14],
      deform
    );
    // Sliding side door recessed track rail on right flank
    strokePoly(
      ctx,
      [
        [-halfL * 0.58, halfW - 0.52],
        [halfL * 0.20, halfW - 0.52],
      ],
      '#090d16',
      0.62,
      deform
    );
    // Fuel filler door on left B-pillar flank
    drawRoundedBox(ctx, halfL * 0.16, -halfW + 0.35, halfL * 0.23, -halfW + 1.05, 0.18, shadePaint(baseColor, -0.14), deform, 'rgba(15,23,42,0.5)', 0.28);

    drawModernVanFrontEnd(ctx, halfL, halfW, fc, baseColor, opt, deform, {
      hoodEndX: halfL * 0.64,
      hoodExposed,
      grilleChrome: false,
      badgeColor: '#cbd5e1',
      hasFogs: true,
      headlightYFrac: 0.35,
      fogYFrac: 0.38,
    });
    drawCommercialRearEnd(ctx, halfL, halfW, rc, opt, deform, {
      taillightYFrac: 0.40,
      hasStepBumper: true,
      barnDoorSplit: true,
      hasChmsl: true,
    });
    return;
  }

  // --------------------------------------------------------------------------
  // B. VAN CAMPER (Bison Nomad Camper — C-Class Coachbuilt RV)
  // --------------------------------------------------------------------------
  if (type === 'van_camper') {
    const cabW = halfW * 0.88;
    const boxW = halfW * 1.03;

    // Two-tone warm adventure livery stripes along lower flanks of living box
    for (const side of [-1, 1] as const) {
      strokePoly(
        ctx,
        [
          [-halfL * 0.88, side * (boxW - 0.48)],
          [halfL * 0.24, side * (boxW - 0.48)],
        ],
        '#0f766e',
        0.9,
        deform
      );
      strokePoly(
        ctx,
        [
          [-halfL * 0.84, side * (boxW - 1.15)],
          [halfL * 0.20, side * (boxW - 1.15)],
        ],
        '#d97706',
        0.48,
        deform
      );
    }

    drawWheelArchFlares(ctx, halfL * 0.58, -halfL * 0.44, boxW, 7.6, 0.9, '#334155', deform);
    // Exterior utility hatches on left flank (water fill / shore power)
    drawRoundedBox(ctx, -halfL * 0.18, -boxW + 0.35, -halfL * 0.04, -boxW + 1.0, 0.18, '#cbd5e1', deform, '#475569', 0.28);
    drawRoundedBox(ctx, -halfL * 0.66, -boxW + 0.35, -halfL * 0.56, -boxW + 0.95, 0.18, '#e2e8f0', deform, '#475569', 0.28);

    drawModernVanFrontEnd(ctx, halfL, halfW, fc, car.color || '#f8fafc', opt, deform, {
      cabHalfW: cabW,
      hoodEndX: halfL * 0.66,
      hoodExposed,
      grilleChrome: true,
      badgeColor: '#f59e0b',
      hasFogs: true,
      headlightYFrac: 0.32,
      fogYFrac: 0.35,
    });
    drawCommercialRearEnd(ctx, halfL, halfW, rc, opt, deform, {
      rearHalfW: boxW,
      taillightYFrac: 0.41,
      hasStepBumper: true,
      barnDoorSplit: false,
      hasChmsl: true,
    });
    return;
  }

  // --------------------------------------------------------------------------
  // C. VAN CARGO OLD (Bison Pathfinder Van — UAZ-452 "Bukhanka")
  // --------------------------------------------------------------------------
  if (type === 'van_cargo_old') {
    // Classic Bukhanka stamped beltline swage & wheel arch flares
    drawWheelArchFlares(ctx, halfL * 0.58, -halfL * 0.56, halfW, 7.2, 0.85, shadePaint(baseColor, -0.22), deform);
    drawSideRubStripsAndHandles(
      ctx,
      halfL * 0.78,
      -halfL * 0.78,
      halfW,
      [halfL * 0.26, -halfL * 0.12],
      [halfL * 0.36, -halfL * 0.02],
      deform,
      shadePaint(baseColor, -0.28)
    );

    // Classic stamped steel front channel bumper with dual tow shackles
    drawRoundedBox(
      ctx,
      fX - 0.95,
      -halfW * 0.82,
      fX + 0.45,
      halfW * 0.82,
      0.45,
      '#1e293b',
      deform,
      '#090d16',
      0.55
    );
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        fX - 0.1,
        side * halfW * 0.44 - 0.38,
        fX + 0.68,
        side * halfW * 0.44 + 0.38,
        0.16,
        '#475569',
        deform,
        '#090d16',
        0.3
      );
    }

    // Iconic Bukhanka narrow radiator mouth & round headlights + outboard orange blinkers
    drawRoundedBox(ctx, fX - 1.55, -halfW * 0.22, fX - 0.8, halfW * 0.22, 0.35, '#0f172a', deform, '#475569', 0.35);
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const hy = side * (halfW * 2) * 0.32;
      drawIntegratedHeadlight(
        ctx,
        fX - 2.05,
        hy - 1.15,
        fX - 0.45,
        hy + 1.15,
        side,
        'round_classic',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn,
        turnInt,
        broken,
        deform
      );
      // Small outboard amber turn pod
      drawDeformedDot(
        ctx,
        fX - 1.25,
        side * halfW * 0.82,
        0.52,
        turnInt > 0.08 ? `rgba(251,191,36,${(0.55 + 0.45 * turnInt).toFixed(2)})` : '#b45309',
        deform,
        '#0f172a',
        0.28
      );
    }

    // Rear stamped steel bumperette corners + vintage twin oval lamps + barn doors
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        rX - 0.45,
        side * halfW * 0.48 - 1.65,
        rX + 0.55,
        side * halfW * 0.48 + 1.65,
        0.3,
        '#1e293b',
        deform,
        '#090d16',
        0.45
      );
      const broken = side < 0 ? opt.leftTailBroken : opt.rightTailBroken;
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const ty = side * (halfW * 2) * 0.38;
      drawIntegratedTaillight(
        ctx,
        rX + 0.35,
        ty - 1.15,
        rX + 1.65,
        ty + 1.15,
        side,
        opt.positionOn,
        opt.braking,
        opt.reversing,
        turnInt,
        opt.rearFogOn,
        broken,
        deform
      );
    }
    // Rear hitch pintle & barn door center seam
    drawDeformedDot(ctx, rX - 0.3, 0, 0.55, '#334155', deform, '#090d16', 0.32);
    strokePoly(ctx, [[rX + 0.4, 0], [rX + 2.4, 0]], 'rgba(15,23,42,0.55)', 0.5, deform);
    return;
  }

  // --------------------------------------------------------------------------
  // D. DELIVERY TRUCK (Bison Express Stepvan — Grumman / Freightliner MT45)
  // --------------------------------------------------------------------------
  if (type === 'delivery_truck') {
    const noseW = halfW * 0.88;
    drawWheelArchFlares(ctx, halfL * 0.54, -halfL * 0.50, halfW, 8.2, 0.9, '#1e293b', deform);
    // Express courier horizontal livery stripe along flanks
    for (const side of [-1, 1] as const) {
      strokePoly(
        ctx,
        [
          [-halfL * 0.88, side * (halfW - 0.52)],
          [halfL * 0.54, side * (halfW - 0.52)],
        ],
        '#f59e0b',
        0.78,
        deform
      );
      // Pocket sliding cab door tracks
      strokePoly(
        ctx,
        [
          [halfL * 0.24, side * (halfW - 0.38)],
          [halfL * 0.54, side * (halfW - 0.38)],
        ],
        '#090d16',
        0.6,
        deform
      );
    }

    // Heavy flat galvanized steel front bumper with rubber overrides
    drawRoundedBox(
      ctx,
      fX - 0.95,
      -noseW * 0.96,
      fX + 0.45,
      noseW * 0.96,
      0.35,
      '#334155',
      deform,
      '#090d16',
      0.55
    );
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, fX - 0.15, side * noseW * 0.56 - 0.45, fX + 0.6, side * noseW * 0.56 + 0.45, 0.18, '#0f172a', deform);
    }

    // Recessed rectangular mesh radiator grille & flat aluminum stepvan hood
    drawRoundedBox(ctx, fX - 2.2, -noseW * 0.42, fX - 0.85, noseW * 0.42, 0.3, '#0f172a', deform, '#64748b', 0.45);
    if (!hoodExposed) {
      drawRoundedBox(
        ctx,
        halfL * 0.68,
        -noseW * 0.82,
        fX - 2.1,
        noseW * 0.82,
        0.5,
        createBodyMetallicGradient(ctx, noseW, shadePaint(baseColor, 0.04)),
        deform,
        'rgba(15,23,42,0.45)',
        0.48
      );
      // Side hood latches
      for (const side of [-1, 1] as const) {
        drawRoundedBox(ctx, halfL * 0.78, side * noseW * 0.76 - 0.3, halfL * 0.83, side * noseW * 0.76 + 0.3, 0.12, '#1e293b', deform);
      }
    }

    // Stepvan recessed front headlamps
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const hy = side * (halfW * 2) * 0.33;
      drawIntegratedHeadlight(
        ctx,
        fX - 2.35,
        hy - 1.35,
        fX - 0.55,
        hy + 1.35,
        side,
        'rect_commercial',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn,
        turnInt,
        broken,
        deform
      );
    }

    // Heavy rear dock step bumper + black rubber dock impact blocks + rear optics
    drawCommercialRearEnd(ctx, halfL, halfW, rc, opt, deform, {
      taillightYFrac: 0.40,
      hasStepBumper: true,
      barnDoorSplit: false,
      hasChmsl: true,
    });
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, rX - 0.45, side * halfW * 0.68 - 0.7, rX + 0.4, side * halfW * 0.68 + 0.7, 0.18, '#090d16', deform);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // E. AMBULANCE & AMBULANCE_VAN (Sentinel Medic & Critical Care ICU)
  // --------------------------------------------------------------------------
  if (type === 'ambulance' || type === 'ambulance_van') {
    const isIcu = type === 'ambulance_van';
    const stripeColor = '#dc2626';
    const accentColor = isIcu ? '#0284c7' : '#f59e0b';

    // High-visibility emergency flank livery bands
    for (const side of [-1, 1] as const) {
      strokePoly(
        ctx,
        [
          [-halfL * 0.88, side * (halfW - 0.48)],
          [halfL * 0.64, side * (halfW - 0.48)],
        ],
        stripeColor,
        1.1,
        deform
      );
      strokePoly(
        ctx,
        [
          [-halfL * 0.84, side * (halfW - 1.25)],
          [halfL * 0.48, side * (halfW - 1.25)],
        ],
        accentColor,
        0.55,
        deform
      );
    }

    drawWheelArchFlares(ctx, halfL * 0.56, -halfL * 0.48, halfW, 7.8, 0.9, '#1e293b', deform);
    drawSideRubStripsAndHandles(
      ctx,
      halfL * 0.64,
      -halfL * 0.78,
      halfW,
      [halfL * 0.25, -halfL * 0.18],
      [halfL * 0.34, halfL * 0.16],
      deform,
      'rgba(15,23,42,0.38)'
    );

    drawModernVanFrontEnd(ctx, halfL, halfW, fc, baseColor, opt, deform, {
      hoodEndX: halfL * 0.64,
      hoodExposed,
      grilleChrome: true,
      badgeColor: '#dc2626',
      hasFogs: true,
      headlightYFrac: isIcu ? 0.35 : 0.36,
      fogYFrac: isIcu ? 0.38 : 0.39,
    });

    // Grille wig-wag red/blue LED flashers
    for (const side of [-1, 1] as const) {
      const flashOn = opt.sirenOn && (side < 0 ? Math.sin(opt.sirenStrobe) > 0 : Math.sin(opt.sirenStrobe) <= 0);
      drawRoundedBox(
        ctx,
        fX - 1.75,
        side * halfW * 0.24 - 0.55,
        fX - 1.1,
        side * halfW * 0.24 + 0.55,
        0.18,
        flashOn ? (side < 0 ? '#ff3b3b' : '#38bdf8') : side < 0 ? '#7f1d1d' : '#1e3a8a',
        deform
      );
    }

    // Hood medical red cross emblem (when hood closed)
    if (!hoodExposed) {
      drawRedCrossEmblem(ctx, halfL * 0.77, 0, 1.85, deform, '#dc2626');
    }

    drawCommercialRearEnd(ctx, halfL, halfW, rc, opt, deform, {
      taillightYFrac: 0.41,
      hasStepBumper: true,
      barnDoorSplit: true,
      hasChmsl: true,
    });
    return;
  }

  // --------------------------------------------------------------------------
  // F. BUS MINIBUS (Metro Shuttle 18-Seater)
  // --------------------------------------------------------------------------
  if (type === 'bus_minibus') {
    drawWheelArchFlares(ctx, halfL * 0.58, -halfL * 0.50, halfW, 8.2, 0.9, '#1e293b', deform);
    // Transit stripe along shuttle flanks
    for (const side of [-1, 1] as const) {
      strokePoly(
        ctx,
        [
          [-halfL * 0.88, side * (halfW - 0.5)],
          [halfL * 0.66, side * (halfW - 0.5)],
        ],
        '#0284c7',
        0.85,
        deform
      );
    }
    drawSideRubStripsAndHandles(
      ctx,
      halfL * 0.64,
      -halfL * 0.82,
      halfW,
      [halfL * 0.36, halfL * 0.08],
      [halfL * 0.42],
      deform
    );

    drawModernVanFrontEnd(ctx, halfL, halfW, fc, baseColor, opt, deform, {
      hoodEndX: halfL * 0.68,
      hoodExposed,
      grilleChrome: true,
      badgeColor: '#38bdf8',
      hasFogs: true,
      headlightYFrac: 0.36,
      fogYFrac: 0.39,
    });
    drawCommercialRearEnd(ctx, halfL, halfW, rc, opt, deform, {
      taillightYFrac: 0.41,
      hasStepBumper: true,
      barnDoorSplit: true,
      hasChmsl: true,
    });
    return;
  }

  // --------------------------------------------------------------------------
  // G. BUS (Metro Linemaster 12m Low-Floor CityBus)
  // --------------------------------------------------------------------------
  if (type === 'bus') {
    drawWheelArchFlares(ctx, halfL * 0.54, -halfL * 0.48, halfW, 9.6, 0.95, '#1e293b', deform);
    // Metro transit body beltline stripe
    for (const side of [-1, 1] as const) {
      strokePoly(
        ctx,
        [
          [-halfL * 0.90, side * (halfW - 0.55)],
          [halfL * 0.86, side * (halfW - 0.55)],
        ],
        '#0284c7',
        0.95,
        deform
      );
    }

    // 3 double-leaf boarding doors on right side (+Y)
    for (const dx of [halfL * 0.74, halfL * 0.06, -halfL * 0.64]) {
      drawRoundedBox(
        ctx,
        dx - 3.0,
        halfW - 1.15,
        dx + 3.0,
        halfW - 0.15,
        0.25,
        '#0f172a',
        deform,
        'rgba(148,163,184,0.38)',
        0.3
      );
      strokePoly(ctx, [[dx, halfW - 1.15], [dx, halfW - 0.15]], 'rgba(203,213,225,0.45)', 0.38, deform);
    }

    // Sleek full-width low-floor front bumper & projector headlights
    fillPoly(
      ctx,
      [
        [fX + 0.1, -halfW * 0.78],
        [fX - 0.7, -halfW * 0.95],
        [fX - 2.0, -halfW * 0.98],
        [fX - 2.0, halfW * 0.98],
        [fX - 0.7, halfW * 0.95],
        [fX + 0.1, halfW * 0.78],
      ],
      '#1e293b',
      deform,
      '#090d16',
      0.55
    );
    // Front black mask & central chrome transit badge
    drawRoundedBox(ctx, fX - 1.85, -halfW * 0.48, fX - 0.55, halfW * 0.48, 0.35, '#090d16', deform, '#475569', 0.35);
    drawRoundedBox(ctx, fX - 0.72, -halfW * 0.14, fX - 0.1, halfW * 0.14, 0.15, '#f8fafc', deform);
    drawDeformedDot(ctx, fX - 1.2, 0, 0.85, '#e2e8f0', deform, '#334155', 0.25);

    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      const hy = side * (halfW * 2) * 0.39;
      drawIntegratedHeadlight(
        ctx,
        fX - 2.35,
        hy - 1.45,
        fX - 0.45,
        hy + 1.45,
        side,
        'projector_dual',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn || opt.ignitionOn,
        turnInt,
        broken,
        deform
      );
      const fy = side * (halfW * 2) * 0.41;
      drawDeformedDot(
        ctx,
        fX - 0.85,
        fy,
        0.5,
        opt.frontFogOn && !broken ? '#fef08a' : '#475569',
        deform,
        '#090d16',
        0.24
      );
    }

    // Rear engine service louver deck + full rear LED light columns
    drawCommercialRearEnd(ctx, halfL, halfW, rc, opt, deform, {
      taillightYFrac: 0.42,
      hasStepBumper: false,
      barnDoorSplit: false,
      hasChmsl: true,
    });
    // Rear cooling intake louvers (left engine side)
    drawRoundedBox(ctx, rX + 2.2, -halfW + 0.4, rX + 10.2, -halfW + 1.35, 0.25, '#0f172a', deform);
    for (let lx = rX + 3.0; lx <= rX + 9.4; lx += 1.25) {
      strokePoly(ctx, [[lx, -halfW + 0.5], [lx, -halfW + 1.25]], '#475569', 0.35, deform);
    }
  }
}

// ============================================================================
// 3. UPPER LAYER (GREENHOUSE, INTERIOR HINTS, ROOF HARDWARE, MIRRORS, LIVERY)
// ============================================================================

export function renderVanBusUpperLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  const type = car.type;
  const opt = getLiveOpticsState(car);
  const fX = halfL - fc;
  const rX = -halfL + rc;

  const baseColor =
    type === 'ambulance'
      ? '#f8fafc'
      : type === 'ambulance_van'
      ? '#facc15'
      : type === 'van_camper'
      ? '#f8fafc'
      : car.color || '#cbd5e1';

  // --------------------------------------------------------------------------
  // A. VAN (Bison Transporter Van)
  // --------------------------------------------------------------------------
  if (type === 'van') {
    const wsFront = halfL * 0.64;
    const wsRear = halfL * 0.36;
    const roofRear = rX + 1.9;
    const gW = halfW * 0.87;

    // Tinted panoramic front windshield + front cab door windows
    const wsPts: Pt[] = [
      [wsFront, -gW * 0.88],
      [wsFront, gW * 0.88],
      [wsRear, gW * 0.96],
      [wsRear, -gW * 0.96],
    ];
    fillPoly(ctx, wsPts, createGlassGradient(ctx, wsFront, -gW, wsRear, gW, 'blue'), deform, '#090d16', 0.65);
    drawCabinInteriorHint(ctx, wsFront - 1.8, wsRear + 0.4, gW * 0.85, deform);
    drawGlassGlint(ctx, wsRear + 0.6, -gW * 0.84, wsFront - 0.5, gW * 0.84, 0.16, deform);
    drawWiperPair(ctx, wsFront, gW * 1.45, 3.8, deform);

    // Side cab windows (dark bonded glass)
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [wsFront - 1.1, side * gW * 0.90],
          [halfL * 0.20, side * gW * 0.98],
          [halfL * 0.20, side * (halfW - 0.85)],
          [wsFront - 1.6, side * (halfW - 0.95)],
        ],
        createGlassGradient(ctx, wsFront, 0, halfL * 0.2, side * halfW, 'smoke'),
        deform,
        '#090d16',
        0.45
      );
      // A-pillar
      strokePoly(ctx, [[wsFront - 0.3, side * gW * 0.88], [wsRear, side * gW * 0.96]], shadePaint(baseColor, -0.18), 0.95, deform);
      // Side mirror with amber repeater
      drawSideMirrorArm(
        ctx,
        halfL * 0.50,
        side * (halfW - 0.45),
        side,
        2.05,
        2.2,
        1.15,
        '#1e293b',
        deform,
        side < 0 ? opt.leftTurn : opt.rightTurn
      );
    }

    // Stamped commercial roof deck with longitudinal strengthening ribs & rain channels
    const roofW = halfW * 0.82;
    drawRoundedBox(
      ctx,
      roofRear,
      -roofW,
      wsRear + 0.4,
      roofW,
      1.6,
      createRoofGradient(ctx, roofW, shadePaint(baseColor, 0.06)),
      deform,
      'rgba(15,23,42,0.42)',
      0.55
    );
    // Longitudinal stamped roof corrugations
    drawCorrugatedDeck(ctx, roofRear + 2.0, -roofW + 1.3, wsRear - 1.5, roofW - 1.3, 2.2, 'longitudinal', deform, 0.14, 0.18);
    // Transverse roof panel joint seams
    for (const jx of [-halfL * 0.34, halfL * 0.02]) {
      strokePoly(ctx, [[jx, -roofW + 0.5], [jx, roofW - 0.5]], 'rgba(15,23,42,0.28)', 0.45, deform);
    }
    // Roof radio antenna + rear magnetic loading work-lamp pod
    drawDeformedDot(ctx, wsRear - 1.3, 0, 0.55, '#0f172a', deform);
    strokePoly(ctx, [[wsRear - 1.3, 0], [wsRear - 4.4, 0]], '#1e293b', 0.35, deform);
    return;
  }

  // --------------------------------------------------------------------------
  // B. VAN CAMPER (Bison Nomad Camper — C-Class Coachbuilt RV)
  // --------------------------------------------------------------------------
  if (type === 'van_camper') {
    const cabW = halfW * 0.88;
    const boxW = halfW * 1.03;
    const wsFront = halfL * 0.66;
    const wsRear = halfL * 0.44;
    const roofRear = rX + 1.4;

    // Front Ducato/Sprinter cab windshield
    fillPoly(
      ctx,
      [
        [wsFront, -cabW * 0.84],
        [wsFront, cabW * 0.84],
        [wsRear, cabW * 0.90],
        [wsRear, -cabW * 0.90],
      ],
      createGlassGradient(ctx, wsFront, -cabW, wsRear, cabW, 'blue'),
      deform,
      '#090d16',
      0.6
    );
    drawCabinInteriorHint(ctx, wsFront - 1.5, wsRear + 0.2, cabW * 0.80, deform);
    drawGlassGlint(ctx, wsRear + 0.4, -cabW * 0.78, wsFront - 0.4, cabW * 0.78, 0.16, deform);
    drawWiperPair(ctx, wsFront, cabW * 1.35, 3.4, deform);

    for (const side of [-1, 1] as const) {
      drawSideMirrorArm(
        ctx,
        halfL * 0.54,
        side * (cabW - 0.35),
        side,
        2.5,
        2.3,
        1.15,
        '#1e293b',
        deform,
        side < 0 ? opt.leftTurn : opt.rightTurn
      );
    }

    // Fiberglass insulated RV roof + aerodynamic over-cab luton sleeper alcove
    const alcoveFront = halfL * 0.52;
    const coachRoofPts: Pt[] = [
      [alcoveFront, -cabW * 0.78],
      [halfL * 0.30, -boxW * 0.94],
      [roofRear + 1.0, -boxW * 0.94],
      [roofRear, -boxW * 0.82],
      [roofRear, boxW * 0.82],
      [roofRear + 1.0, boxW * 0.94],
      [halfL * 0.30, boxW * 0.94],
      [alcoveFront, cabW * 0.78],
    ];
    fillPoly(
      ctx,
      coachRoofPts,
      createRoofGradient(ctx, boxW, '#f8fafc'),
      deform,
      'rgba(15,23,42,0.45)',
      0.65
    );
    // Luton alcove contour seam & front outline clearance lights
    strokePoly(ctx, [[halfL * 0.26, -boxW * 0.90], [halfL * 0.26, boxW * 0.90]], 'rgba(15,23,42,0.22)', 0.5, deform);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        alcoveFront - 1.2,
        side * cabW * 0.65 - 0.42,
        alcoveFront - 0.3,
        side * cabW * 0.65 + 0.42,
        0.18,
        opt.positionOn ? '#fef9c3' : '#cbd5e1',
        deform,
        '#334155',
        0.22
      );
    }

    // Right-side roll-out awning cassette (Thule Omnistor) with drop shadow
    drawBoxShadow(ctx, -halfL * 0.72, boxW * 0.76, halfL * 0.20, boxW * 0.96, 0.4, -0.4, 0.5, 0.28, deform);
    drawRoundedBox(ctx, -halfL * 0.72, boxW * 0.76, halfL * 0.20, boxW * 0.96, 0.4, '#cbd5e1', deform, '#334155', 0.45);
    strokePoly(ctx, [[-halfL * 0.68, boxW * 0.86], [halfL * 0.16, boxW * 0.86]], '#64748b', 0.4, deform);

    // Panoramic tinted Heki roof skylight over lounge
    drawBoxShadow(ctx, halfL * 0.04, -boxW * 0.44, halfL * 0.24, boxW * 0.44, 0.6, -0.5, 0.5, 0.25, deform);
    drawRoundedBox(ctx, halfL * 0.04, -boxW * 0.44, halfL * 0.24, boxW * 0.44, 0.6, '#334155', deform, '#0f172a', 0.45);
    drawRoundedBox(
      ctx,
      halfL * 0.06,
      -boxW * 0.38,
      halfL * 0.22,
      boxW * 0.38,
      0.4,
      createGlassGradient(ctx, halfL * 0.06, -boxW * 0.38, halfL * 0.22, boxW * 0.38, 'smoke'),
      deform
    );
    drawGlassGlint(ctx, halfL * 0.06, -boxW * 0.36, halfL * 0.22, boxW * 0.36, 0.18, deform);

    // Low-profile Dometic RV roof AC condenser pod with cast shadow
    drawBoxShadow(ctx, -halfL * 0.34, -boxW * 0.36, -halfL * 0.05, boxW * 0.36, 0.9, -0.75, 0.65, 0.30, deform);
    drawRoundedBox(ctx, -halfL * 0.34, -boxW * 0.36, -halfL * 0.05, boxW * 0.36, 0.9, '#e2e8f0', deform, '#475569', 0.5);
    drawRoundedBox(ctx, -halfL * 0.29, -boxW * 0.24, -halfL * 0.11, boxW * 0.24, 0.45, '#1e293b', deform);
    for (let gy = -boxW * 0.18; gy <= boxW * 0.18; gy += 1.05) {
      strokePoly(ctx, [[-halfL * 0.27, gy], [-halfL * 0.13, gy]], '#64748b', 0.32, deform);
    }

    // Twin monocrystalline solar panels on rear roof deck
    for (const side of [-1, 1] as const) {
      const py1 = side < 0 ? -boxW * 0.72 : boxW * 0.08;
      const py2 = side < 0 ? -boxW * 0.08 : boxW * 0.72;
      drawBoxShadow(ctx, -halfL * 0.82, py1, -halfL * 0.44, py2, 0.3, -0.45, 0.45, 0.22, deform);
      drawRoundedBox(ctx, -halfL * 0.82, py1, -halfL * 0.44, py2, 0.3, '#0f172a', deform, '#cbd5e1', 0.48);
      // Blue-indigo photovoltaic cell grid
      drawRoundedBox(ctx, -halfL * 0.80, py1 + 0.35, -halfL * 0.46, py2 - 0.35, 0.18, '#172554', deform);
      for (let gx = -halfL * 0.74; gx < -halfL * 0.48; gx += 2.2) {
        strokePoly(ctx, [[gx, py1 + 0.35], [gx, py2 - 0.35]], 'rgba(148,163,184,0.34)', 0.25, deform);
      }
      strokePoly(ctx, [[-halfL * 0.80, (py1 + py2) * 0.5], [-halfL * 0.46, (py1 + py2) * 0.5]], 'rgba(148,163,184,0.42)', 0.28, deform);
    }

    // Rear folding aluminum roof access ladder / bike carrier bar
    drawRoundedBox(ctx, rX - 0.5, -boxW * 0.58, rX + 0.55, -boxW * 0.22, 0.2, '#94a3b8', deform, '#1e293b', 0.32);
    return;
  }

  // --------------------------------------------------------------------------
  // C. VAN CARGO OLD (Bison Pathfinder — UAZ-452 "Bukhanka")
  // --------------------------------------------------------------------------
  if (type === 'van_cargo_old') {
    const wsFront = fX - 1.3;
    const wsRear = halfL * 0.62;
    const gW = halfW * 0.84;

    // Iconic Bukhanka split 2-pane green-tinted windshield
    fillPoly(
      ctx,
      [
        [wsFront, -gW * 0.84],
        [wsFront, gW * 0.84],
        [wsRear, gW * 0.94],
        [wsRear, -gW * 0.94],
      ],
      createGlassGradient(ctx, wsFront, -gW, wsRear, gW, 'green'),
      deform,
      '#090d16',
      0.6
    );
    drawCabinInteriorHint(ctx, wsFront - 1.2, wsRear - 1.0, gW * 0.80, deform);
    drawGlassGlint(ctx, wsRear + 0.3, -gW * 0.78, wsFront - 0.3, gW * 0.78, 0.14, deform);
    // Central painted windshield mullion pillar
    strokePoly(ctx, [[wsFront + 0.1, 0], [wsRear - 0.1, 0]], shadePaint(baseColor, -0.06), 1.0, deform);
    drawWiperPair(ctx, wsFront, gW * 1.25, 2.8, deform);

    // Classic stalk-mounted black steel side mirrors
    for (const side of [-1, 1] as const) {
      drawSideMirrorArm(ctx, halfL * 0.68, side * (halfW - 0.3), side, 1.9, 1.65, 0.95, '#1e293b', deform);
    }

    // Iconic smooth domed rain-gutter Bukhanka roof
    const roofW = halfW * 0.85;
    drawRoundedBox(
      ctx,
      rX + 1.8,
      -roofW,
      wsRear + 0.2,
      roofW,
      2.6,
      createRoofGradient(ctx, roofW, shadePaint(baseColor, 0.08)),
      deform,
      'rgba(15,23,42,0.52)',
      0.65
    );
    // Vintage front-center roof ventilation hatch scoop
    drawBoxShadow(ctx, halfL * 0.36, -2.0, halfL * 0.52, 2.0, 0.5, -0.45, 0.45, 0.24, deform);
    drawRoundedBox(ctx, halfL * 0.36, -2.0, halfL * 0.52, 2.0, 0.5, shadePaint(baseColor, 0.16), deform, '#1e293b', 0.45);

    // Tubular black steel expedition roof rack with timber slats + spare tire & jerrycan
    const rkX1 = -halfL * 0.78;
    const rkX2 = halfL * 0.24;
    const rkW = roofW * 0.84;
    drawBoxShadow(ctx, rkX1, -rkW, rkX2, rkW, 0.6, -0.5, 0.5, 0.22, deform);
    // Timber cross slats
    for (let sx = rkX1 + 1.8; sx < rkX2 - 1.0; sx += 2.6) {
      strokePoly(ctx, [[sx, -rkW + 0.4], [sx, rkW - 0.4]], '#78350f', 0.85, deform);
      strokePoly(ctx, [[sx + 0.2, -rkW + 0.4], [sx + 0.2, rkW - 0.4]], 'rgba(254,243,199,0.2)', 0.25, deform);
    }
    // Outer tubular rack perimeter
    strokePoly(
      ctx,
      [
        [rkX1, -rkW],
        [rkX2, -rkW],
        [rkX2, rkW],
        [rkX1, rkW],
      ],
      '#0f172a',
      0.82,
      deform,
      true
    );
    // Roof-mounted spare off-road tire (rear right) + olive steel jerrycan (front left)
    drawDeformedDot(ctx, -halfL * 0.48, rkW * 0.22, 3.2, '#0f172a', deform, '#334155', 0.5);
    drawDeformedDot(ctx, -halfL * 0.48, rkW * 0.22, 1.5, '#64748b', deform, '#1e293b', 0.35);
    drawRoundedBox(ctx, -halfL * 0.04, -rkW * 0.74, halfL * 0.14, -rkW * 0.18, 0.35, '#991b1b', deform, '#0f172a', 0.4);
    strokePoly(ctx, [[-halfL * 0.01, -rkW * 0.64], [halfL * 0.11, -rkW * 0.28]], 'rgba(255,255,255,0.22)', 0.35, deform);
    return;
  }

  // --------------------------------------------------------------------------
  // D. DELIVERY TRUCK (Bison Express Stepvan)
  // --------------------------------------------------------------------------
  if (type === 'delivery_truck') {
    const wsFront = halfL * 0.66;
    const wsRear = halfL * 0.52;
    const gW = halfW * 0.84;

    // Flat 2-piece vertical stepvan windshield
    fillPoly(
      ctx,
      [
        [wsFront, -gW * 0.88],
        [wsFront, gW * 0.88],
        [wsRear, gW * 0.94],
        [wsRear, -gW * 0.94],
      ],
      createGlassGradient(ctx, wsFront, -gW, wsRear, gW, 'smoke'),
      deform,
      '#090d16',
      0.6
    );
    drawCabinInteriorHint(ctx, wsFront - 1.0, wsRear - 1.2, gW * 0.8, deform, { dualFrontSeats: false });
    strokePoly(ctx, [[wsFront, 0], [wsRear, 0]], '#1e293b', 0.85, deform);
    drawGlassGlint(ctx, wsRear + 0.2, -gW * 0.82, wsFront - 0.2, gW * 0.82, 0.14, deform);
    drawWiperPair(ctx, wsFront, gW * 1.3, 3.0, deform);

    // Tall aluminum West-Coast stepvan mirrors
    for (const side of [-1, 1] as const) {
      drawSideMirrorArm(ctx, halfL * 0.56, side * (halfW - 0.35), side, 2.3, 2.2, 1.1, '#cbd5e1', deform);
    }

    // Square brushed aluminum cargo roof with translucent fiberglass center panel + exposed transverse bows
    const roofW = halfW * 0.92;
    drawRoundedBox(
      ctx,
      rX + 1.4,
      -roofW,
      wsRear + 0.1,
      roofW,
      0.95,
      createRoofGradient(ctx, roofW, '#e2e8f0'),
      deform,
      '#334155',
      0.65
    );
    // Translucent daylighting center roof skin
    drawRoundedBox(
      ctx,
      rX + 3.2,
      -roofW * 0.62,
      halfL * 0.32,
      roofW * 0.62,
      0.4,
      '#f8fafc',
      deform,
      'rgba(100,116,139,0.45)',
      0.4
    );
    // Transverse aluminum roof bows + corner extrusion rivets
    drawCorrugatedDeck(ctx, rX + 2.4, -roofW + 0.6, wsRear - 1.0, roofW - 0.6, 4.4, 'transverse', deform, 0.22, 0.26);

    // 3 amber front DOT roof clearance markers + 2 outer corner markers
    drawRoadTrainMarkers(ctx, wsRear - 0.85, [-roofW * 0.62, -1.7, 0, 1.7, roofW * 0.62], opt.positionOn || opt.roadTrainOn, deform);
    return;
  }

  // --------------------------------------------------------------------------
  // E. AMBULANCE & AMBULANCE_VAN (Sentinel Medic & Critical Care ICU)
  // --------------------------------------------------------------------------
  if (type === 'ambulance' || type === 'ambulance_van') {
    const isIcu = type === 'ambulance_van';
    const wsFront = halfL * 0.64;
    const wsRear = halfL * 0.38;
    const roofRear = rX + 1.8;
    const gW = halfW * 0.88;

    // Tinted front cab windshield
    fillPoly(
      ctx,
      [
        [wsFront, -gW * 0.88],
        [wsFront, gW * 0.88],
        [wsRear, gW * 0.95],
        [wsRear, -gW * 0.95],
      ],
      createGlassGradient(ctx, wsFront, -gW, wsRear, gW, 'blue'),
      deform,
      '#090d16',
      0.65
    );
    drawCabinInteriorHint(ctx, wsFront - 1.7, wsRear + 0.4, gW * 0.84, deform);
    drawGlassGlint(ctx, wsRear + 0.5, -gW * 0.82, wsFront - 0.4, gW * 0.82, 0.16, deform);
    drawWiperPair(ctx, wsFront, gW * 1.4, 3.6, deform);

    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[wsFront - 0.3, side * gW * 0.88], [wsRear, side * gW * 0.95]], shadePaint(baseColor, -0.15), 0.95, deform);
      drawSideMirrorArm(
        ctx,
        halfL * 0.50,
        side * (halfW - 0.4),
        side,
        2.1,
        2.25,
        1.15,
        '#1e293b',
        deform,
        side < 0 ? opt.leftTurn : opt.rightTurn
      );
    }

    // High-roof medical module roof
    const roofW = halfW * (isIcu ? 0.90 : 0.84);
    drawRoundedBox(
      ctx,
      roofRear,
      -roofW,
      wsRear + 0.4,
      roofW,
      isIcu ? 1.15 : 1.75,
      createRoofGradient(ctx, roofW, isIcu ? '#fef08a' : '#f8fafc'),
      deform,
      'rgba(15,23,42,0.45)',
      0.6
    );

    if (isIcu) {
      // Type-C Critical Care ICU Reanimobile: red roof perimeter frame, medical HVAC pod, dual lightbars, telemetry antennas
      strokePoly(
        ctx,
        [
          [roofRear + 0.8, -roofW + 0.7],
          [wsRear - 0.5, -roofW + 0.7],
          [wsRear - 0.5, roofW - 0.7],
          [roofRear + 0.8, roofW - 0.7],
        ],
        '#dc2626',
        0.75,
        deform,
        true
      );
      // Central medical Red Cross on bright white circle
      drawRedCrossEmblem(ctx, -halfL * 0.04, 0, 3.2, deform, '#dc2626', '#ffffff');

      // Roof HVAC medical climate condenser pod with drop shadow
      drawBoxShadow(ctx, -halfL * 0.64, -roofW * 0.48, -halfL * 0.34, roofW * 0.48, 0.75, -0.65, 0.6, 0.28, deform);
      drawRoundedBox(ctx, -halfL * 0.64, -roofW * 0.48, -halfL * 0.34, roofW * 0.48, 0.75, '#f1f5f9', deform, '#475569', 0.48);
      drawRoundedBox(ctx, -halfL * 0.58, -roofW * 0.32, -halfL * 0.40, roofW * 0.32, 0.35, '#1e293b', deform);
      // Dual ICU telemetry/GPS sharkfin & whip antennas
      drawDeformedDot(ctx, -halfL * 0.24, -roofW * 0.62, 0.55, '#0f172a', deform);
      drawDeformedDot(ctx, -halfL * 0.24, roofW * 0.62, 0.55, '#0f172a', deform);

      // Front + Rear aerodynamic red/blue LED lightbars
      drawEmergencyLightbar(ctx, halfL * 0.34, roofW * 0.78, opt.sirenOn, opt.sirenStrobe, deform, 2.8);
      drawEmergencyLightbar(ctx, -halfL * 0.82, roofW * 0.74, opt.sirenOn, opt.sirenStrobe + Math.PI, deform, 2.2);

      // Side white scene-flood LED strips on flanks
      for (const side of [-1, 1] as const) {
        drawRoundedBox(
          ctx,
          -halfL * 0.52,
          side * (roofW - 0.15) - 0.3,
          -halfL * 0.10,
          side * (roofW - 0.15) + 0.3,
          0.15,
          opt.sirenOn ? '#e0f2fe' : '#cbd5e1',
          deform,
          '#1e293b',
          0.22
        );
      }
    } else {
      // Type-B Medic Van: clean white roof with crisp red cross, exhaust mushroom vent, front lightbar, rear floodlights
      drawRedCrossEmblem(ctx, -halfL * 0.14, 0, 3.4, deform, '#dc2626');
      // Red livery roof shoulder trim stripes
      for (const side of [-1, 1] as const) {
        strokePoly(ctx, [[roofRear + 1.8, side * (roofW - 0.9)], [halfL * 0.18, side * (roofW - 0.9)]], '#dc2626', 0.75, deform);
      }
      // Circular stainless medical ventilation mushroom fan on rear roof
      drawBoxShadow(ctx, -halfL * 0.66, -2.1, -halfL * 0.48, 2.1, 1.8, -0.45, 0.45, 0.22, deform);
      drawDeformedDot(ctx, -halfL * 0.57, 0, 2.1, '#e2e8f0', deform, '#475569', 0.45);
      drawDeformedDot(ctx, -halfL * 0.57, 0, 1.0, '#94a3b8', deform, '#334155', 0.3);

      // Front aerodynamic LED lightbar
      drawEmergencyLightbar(ctx, halfL * 0.34, roofW * 0.78, opt.sirenOn, opt.sirenStrobe, deform, 2.7);

      // Rear high-mount scene floodlights & twin amber/blue rear strobes
      for (const side of [-1, 1] as const) {
        const flash = opt.sirenOn && (side < 0 ? Math.sin(opt.sirenStrobe) > 0 : Math.sin(opt.sirenStrobe) <= 0);
        drawRoundedBox(
          ctx,
          roofRear + 0.2,
          side * roofW * 0.62 - 0.85,
          roofRear + 1.15,
          side * roofW * 0.62 + 0.85,
          0.25,
          flash ? '#38bdf8' : '#1e3a8a',
          deform,
          '#0f172a',
          0.3
        );
      }
    }
    return;
  }

  // --------------------------------------------------------------------------
  // F. BUS MINIBUS (Metro Shuttle 18-Seater)
  // --------------------------------------------------------------------------
  if (type === 'bus_minibus') {
    const wsFront = halfL * 0.68;
    const wsRear = halfL * 0.46;
    const roofRear = rX + 1.8;
    const gW = halfW * 0.88;

    // Wide flush-bonded side panoramic window strips visible along roof bevels
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [wsFront - 1.2, side * gW * 0.90],
          [rX + 2.2, side * gW * 0.95],
          [rX + 2.2, side * (halfW - 0.75)],
          [wsFront - 1.8, side * (halfW - 0.85)],
        ],
        createGlassGradient(ctx, wsFront, 0, rX, side * halfW, 'smoke'),
        deform,
        '#090d16',
        0.45
      );
    }

    // Front panoramic windshield + backlit amber LED route display box
    fillPoly(
      ctx,
      [
        [wsFront, -gW * 0.88],
        [wsFront, gW * 0.88],
        [wsRear, gW * 0.95],
        [wsRear, -gW * 0.95],
      ],
      createGlassGradient(ctx, wsFront, -gW, wsRear, gW, 'blue'),
      deform,
      '#090d16',
      0.65
    );
    drawCabinInteriorHint(ctx, wsFront - 1.8, wsRear + 0.5, gW * 0.84, deform);
    // Amber LED route board glow visible at top header of windshield
    drawRoundedBox(
      ctx,
      wsRear + 0.35,
      -gW * 0.42,
      wsRear + 1.55,
      gW * 0.42,
      0.22,
      '#090d16',
      deform
    );
    strokePoly(
      ctx,
      [
        [wsRear + 0.95, -gW * 0.34],
        [wsRear + 0.95, gW * 0.34],
      ],
      opt.ignitionOn || opt.positionOn ? '#fbbf24' : '#78350f',
      0.65,
      deform
    );
    drawGlassGlint(ctx, wsRear + 0.6, -gW * 0.82, wsFront - 0.4, gW * 0.82, 0.16, deform);
    drawWiperPair(ctx, wsFront, gW * 1.4, 3.8, deform);

    for (const side of [-1, 1] as const) {
      drawSideMirrorArm(
        ctx,
        halfL * 0.56,
        side * (halfW - 0.35),
        side,
        2.35,
        2.4,
        1.2,
        '#1e293b',
        deform,
        side < 0 ? opt.leftTurn : opt.rightTurn
      );
    }

    // Elongated passenger roof + slim roof HVAC pod + tinted glass emergency escape hatch
    const roofW = halfW * 0.82;
    drawRoundedBox(
      ctx,
      roofRear,
      -roofW,
      wsRear + 0.3,
      roofW,
      1.6,
      createRoofGradient(ctx, roofW, shadePaint(baseColor, 0.08)),
      deform,
      'rgba(15,23,42,0.45)',
      0.58
    );
    // 3 amber shuttle clearance markers above windshield
    drawRoadTrainMarkers(ctx, wsRear - 0.9, [-2.2, 0, 2.2], opt.positionOn || opt.roadTrainOn, deform);

    // Mid-roof slim passenger HVAC condenser unit with twin cooling grilles
    drawBoxShadow(ctx, -halfL * 0.14, -roofW * 0.56, halfL * 0.22, roofW * 0.56, 1.0, -0.7, 0.6, 0.28, deform);
    drawRoundedBox(ctx, -halfL * 0.14, -roofW * 0.56, halfL * 0.22, roofW * 0.56, 1.0, '#f1f5f9', deform, '#475569', 0.5);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        -halfL * 0.08,
        side * roofW * 0.25 - 1.5,
        halfL * 0.16,
        side * roofW * 0.25 + 1.5,
        0.4,
        '#1e293b',
        deform
      );
    }

    // Rear glass emergency escape hatch
    drawBoxShadow(ctx, -halfL * 0.66, -roofW * 0.42, -halfL * 0.38, roofW * 0.42, 0.6, -0.45, 0.45, 0.22, deform);
    drawRoundedBox(ctx, -halfL * 0.66, -roofW * 0.42, -halfL * 0.38, roofW * 0.42, 0.6, '#334155', deform, '#0f172a', 0.45);
    drawRoundedBox(
      ctx,
      -halfL * 0.63,
      -roofW * 0.35,
      -halfL * 0.41,
      roofW * 0.35,
      0.35,
      createGlassGradient(ctx, -halfL * 0.63, -roofW * 0.35, -halfL * 0.41, roofW * 0.35, 'smoke'),
      deform
    );
    drawGlassGlint(ctx, -halfL * 0.63, -roofW * 0.32, -halfL * 0.41, roofW * 0.32, 0.16, deform);
    return;
  }

  // --------------------------------------------------------------------------
  // G. BUS (Metro Linemaster 12m Low-Floor CityBus)
  // --------------------------------------------------------------------------
  if (type === 'bus') {
    const wsFront = fX - 1.5;
    const wsRear = halfL * 0.80;
    const roofRear = rX + 2.2;
    const gW = halfW * 0.90;

    // Continuous dark bonded panoramic side window rails along both flanks
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        [
          [wsFront - 0.8, side * gW * 0.92],
          [roofRear, side * gW * 0.94],
          [roofRear, side * (halfW - 0.72)],
          [wsFront - 1.2, side * (halfW - 0.78)],
        ],
        createGlassGradient(ctx, wsFront, 0, roofRear, side * halfW, 'smoke'),
        deform,
        '#090d16',
        0.45
      );
      // Window pillar dividers along side glass band
      for (let px = -halfL * 0.74; px <= halfL * 0.70; px += 9.5) {
        strokePoly(ctx, [[px, side * gW * 0.93], [px, side * (halfW - 0.72)]], '#020617', 0.65, deform);
      }
    }

    // Wide curved panoramic city bus windshield + dual pantograph wipers
    fillPoly(
      ctx,
      [
        [wsFront, -gW * 0.90],
        [wsFront, gW * 0.90],
        [wsRear, gW * 0.96],
        [wsRear, -gW * 0.96],
      ],
      createGlassGradient(ctx, wsFront, -gW, wsRear, gW, 'blue'),
      deform,
      '#090d16',
      0.7
    );
    drawCabinInteriorHint(ctx, wsFront - 2.0, wsRear + 0.6, gW * 0.84, deform, { driverY: -gW * 0.46, dualFrontSeats: false });
    drawGlassGlint(ctx, wsRear + 0.4, -gW * 0.86, wsFront - 0.4, gW * 0.86, 0.16, deform);
    drawWiperPair(ctx, wsFront, gW * 1.4, 4.4, deform, true);

    // Long forward-swept coach side mirrors (distinctive bus silhouette!)
    for (const side of [-1, 1] as const) {
      const mBaseX = halfL * 0.84;
      const mBaseY = side * (halfW - 0.4);
      const mTipX = fX + 1.3;
      const mTipY = side * (halfW + 2.2);
      strokePoly(ctx, [[mBaseX, mBaseY], [mTipX - 1.0, mTipY], [mTipX, mTipY]], '#0f172a', 0.85, deform);
      drawRoundedBox(ctx, mTipX - 1.4, mTipY - 0.7, mTipX + 1.4, mTipY + 0.7, 0.45, '#1e293b', deform, '#475569', 0.35);
    }

    // Main 12m city bus roof deck with molded side coving & panel seams
    const roofW = halfW * 0.85;
    drawRoundedBox(
      ctx,
      roofRear,
      -roofW,
      wsRear + 0.3,
      roofW,
      1.6,
      createRoofGradient(ctx, roofW, '#f1f5f9'),
      deform,
      'rgba(15,23,42,0.48)',
      0.65
    );

    // Glowing amber LED destination matrix housing above front brow
    drawRoundedBox(ctx, wsRear - 1.6, -roofW * 0.56, wsRear + 0.1, roofW * 0.56, 0.35, '#090d16', deform, '#334155', 0.35);
    strokePoly(
      ctx,
      [[wsRear - 0.75, -roofW * 0.44], [wsRear - 0.75, roofW * 0.44]],
      opt.ignitionOn || opt.positionOn ? '#fbbf24' : '#78350f',
      0.85,
      deform
    );
    // Front roof outline marker horns
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        wsRear - 1.1,
        side * (roofW - 0.9) - 0.5,
        wsRear - 0.1,
        side * (roofW - 0.9) + 0.5,
        0.2,
        opt.positionOn ? '#fef9c3' : '#94a3b8',
        deform
      );
      drawRoundedBox(
        ctx,
        roofRear + 0.2,
        side * (roofW - 0.9) - 0.5,
        roofRear + 1.2,
        side * (roofW - 0.9) + 0.5,
        0.2,
        opt.positionOn ? '#ef4444' : '#7f1d1d',
        deform
      );
    }

    // 2 Roof emergency escape hatches (front & rear)
    for (const hx of [halfL * 0.54, -halfL * 0.66]) {
      drawBoxShadow(ctx, hx - 3.6, -roofW * 0.36, hx + 3.6, roofW * 0.36, 0.6, -0.5, 0.5, 0.22, deform);
      drawRoundedBox(ctx, hx - 3.6, -roofW * 0.36, hx + 3.6, roofW * 0.36, 0.6, '#e2e8f0', deform, '#475569', 0.48);
      drawRoundedBox(
        ctx,
        hx - 2.8,
        -roofW * 0.28,
        hx + 2.8,
        roofW * 0.28,
        0.35,
        createGlassGradient(ctx, hx - 2.8, -roofW * 0.28, hx + 2.8, roofW * 0.28, 'smoke'),
        deform
      );
      drawGlassGlint(ctx, hx - 2.6, -roofW * 0.25, hx + 2.6, roofW * 0.25, 0.14, deform);
    }

    // Large low-profile dual-fan city bus roof HVAC pod (center deck) with cast shadow
    drawBoxShadow(ctx, -halfL * 0.34, -roofW * 0.68, halfL * 0.26, roofW * 0.68, 1.4, -0.85, 0.75, 0.30, deform);
    drawRoundedBox(
      ctx,
      -halfL * 0.34,
      -roofW * 0.68,
      halfL * 0.26,
      roofW * 0.68,
      1.4,
      createRoofGradient(ctx, roofW * 0.68, shadePaint(baseColor, 0.16)),
      deform,
      '#334155',
      0.55
    );
    // 4 recessed circular condenser fan shrouds inside HVAC pod
    for (const fx of [-halfL * 0.20, -halfL * 0.04, halfL * 0.12]) {
      for (const side of [-1, 1] as const) {
        const fy = side * roofW * 0.32;
        drawDeformedDot(ctx, fx, fy, 2.25, '#0f172a', deform, '#475569', 0.4);
        drawDeformedDot(ctx, fx, fy, 1.65, '#1e293b', deform);
        // Subtle radial fan blades
        for (let b = 0; b < 4; b++) {
          const ang = (b * Math.PI) / 2 + 0.4;
          strokePoly(
            ctx,
            [
              [fx, fy],
              [fx + Math.cos(ang) * 1.45, fy + Math.sin(ang) * 1.45],
            ],
            '#475569',
            0.42,
            deform
          );
        }
        drawDeformedDot(ctx, fx, fy, 0.5, '#64748b', deform);
      }
    }
    // Roof panel expansion seams
    for (const sx of [halfL * 0.36, -halfL * 0.46]) {
      strokePoly(ctx, [[sx, -roofW + 0.6], [sx, roofW - 0.6]], 'rgba(15,23,42,0.24)', 0.45, deform);
    }
  }
}

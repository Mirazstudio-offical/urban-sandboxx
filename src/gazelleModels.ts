import type { Vehicle } from './types';
import type { VehicleRenderContext } from './vehicleArchetypes';
import {
  resolveVehicleTruckFrameAndBody,
  getTruckFrameAxlePositions,
  getGazelleWalkableSaloonKind,
  isGazelleIntegralBody,
  GazelleWalkableSaloonKind,
  TruckFrameVariant,
  TruckBodyVariant,
  TruckPlatformId,
} from './truckChassisVariants';
import { getGazelleInteriorLayout, GazelleInteriorLayout } from './busInteriorSystem';
import { isVehicleHoodExposed } from './engineBayVisuals';
import {
  Pt,
  DeformFn,
  shadePaint,
  getLiveOpticsState,
  LiveOpticsState,
  fillPoly,
  strokePoly,
  drawRoundedBox,
  drawDeformedDot,
  drawBoxShadow,
  createBodyMetallicGradient,
  createRoofGradient,
  createCylindricalGradient,
  createGlassGradient,
  drawCabinInteriorHint,
  drawGlassGlint,
  drawIntegratedTaillight,
  drawCorrugatedDeck,
  drawWoodPlankDeck,
  drawTreadplateSurface,
  drawChromePipe,
  drawTreadedTire,
  drawAmberBeacon,
  drawRoadTrainMarkers,
} from './vehicleModelPrimitives';

export const REDRAWN_GAZELLE_TYPES = new Set<string>([
  'gazelle_old',
  'gazelle_business',
]);

export function isRedrawnGazelle(type: string | undefined): boolean {
  return !!type && REDRAWN_GAZELLE_TYPES.has(type);
}

interface GazelleResolved {
  platform: TruckPlatformId;
  frame: TruckFrameVariant;
  body: TruckBodyVariant;
  isNewBusiness: boolean;
  isFermer: boolean;
  isAwd: boolean;
  isTipperFrame: boolean;
  walkableKind: GazelleWalkableSaloonKind | null;
  isIntegral: boolean;
  layout: GazelleInteriorLayout | null;
}

function resolveGazelle(car: Vehicle): GazelleResolved {
  const resolved = resolveVehicleTruckFrameAndBody(car);
  const platform: TruckPlatformId =
    resolved?.platform || (car.type === 'gazelle_business' ? 'gazelle_business' : 'gazelle_old');
  const frame: TruckFrameVariant = resolved?.frame || {
    id: 'frm_gazelle_std_2900',
    nameRu: 'Стандартная рама ГАЗ-3302',
    modelCode: '3302-2800010',
    compatiblePlatforms: ['gazelle_old', 'gazelle_business'],
    lengthPx: car.length || 54,
    wheelBasePx: car.wheelBase || 31,
    frameLengthMm: 5475,
    wheelbaseMm: '2900 мм',
    massKg: 820,
    payloadCapacityKg: 1500,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '185/75R16C',
    mountTypes: ['gazelle_std'],
    crossmemberCount: 6,
    frameColor: '#161b24',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -10,
    notes: '',
  };
  const body: TruckBodyVariant = resolved?.body || {
    id: 'body_none',
    nameRu: 'Голая рама',
    modelCode: 'ШАССИ-00',
    massKg: 0,
    requiredMounts: [],
    minPayloadKg: 0,
    attachmentCarType: null,
    notes: '',
  };
  const walkableKind = getGazelleWalkableSaloonKind(car);
  const isIntegral = isGazelleIntegralBody(car);
  const layout = walkableKind ? getGazelleInteriorLayout(car) : null;

  return {
    platform,
    frame,
    body,
    isNewBusiness: platform === 'gazelle_business',
    isFermer: frame.id.includes('fermer'),
    isAwd: frame.hasFrontDriveAxle || frame.wheelFormula === '4x4',
    isTipperFrame: frame.id.includes('tipper'),
    walkableKind,
    isIntegral,
    layout,
  };
}

function drawGazelleEmergencyLightbar(
  ctx: CanvasRenderingContext2D,
  barX: number,
  barHalfW: number,
  sirenOn: boolean,
  strobe: number,
  deform: DeformFn,
  barLen = 2.5
): void {
  const hl = barLen * 0.5;
  drawBoxShadow(ctx, barX - hl, -barHalfW, barX + hl, barHalfW, 0.7, -0.75, 0.7, 0.34, deform);

  for (const side of [-1, 1] as const) {
    drawRoundedBox(
      ctx,
      barX - hl * 0.7,
      side * (barHalfW - 0.75) - 0.45,
      barX + hl * 0.7,
      side * (barHalfW - 0.75) + 0.45,
      0.18,
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
    0.75,
    '#0f172a',
    deform,
    '#475569',
    0.42
  );

  const redPulse = sirenOn ? 0.5 + 0.5 * Math.sin(strobe) : 0;
  const bluePulse = sirenOn ? 0.5 - 0.5 * Math.sin(strobe) : 0;

  drawRoundedBox(
    ctx,
    barX - hl + 0.22,
    -barHalfW + 0.32,
    barX + hl - 0.22,
    -barHalfW * 0.2,
    0.4,
    sirenOn ? (redPulse > 0.45 ? '#ff3333' : '#b91c1c') : '#991b1b',
    deform
  );
  drawRoundedBox(
    ctx,
    barX - hl + 0.22,
    barHalfW * 0.2,
    barX + hl - 0.22,
    barHalfW - 0.32,
    0.4,
    sirenOn ? (bluePulse > 0.45 ? '#38bdf8' : '#1d4ed8') : '#1e3a8a',
    deform
  );
  drawRoundedBox(
    ctx,
    barX - hl + 0.28,
    -barHalfW * 0.2,
    barX + hl - 0.28,
    barHalfW * 0.2,
    0.22,
    '#cbd5e1',
    deform,
    '#334155',
    0.24
  );

  if (sirenOn) {
    if (redPulse > 0.45) {
      drawDeformedDot(ctx, barX, -barHalfW * 0.58, 0.8, '#fecaca', deform);
    }
    if (bluePulse > 0.45) {
      drawDeformedDot(ctx, barX, barHalfW * 0.58, 0.8, '#e0f2fe', deform);
    }
  }
}

function drawMedicalCrossEmblem(
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
// 1. BESPOKE GAZELLE WHEELS (16" DUAL REAR OR 4x4 OFFROAD SINGLE)
// ============================================================================

export function renderGazelleWheels(vCtx: VehicleRenderContext, steerAngle = 0): void {
  const { ctx, car, halfL, halfW } = vCtx;
  const g = resolveGazelle(car);
  const { frontAxlesX, rearAxlesX } = getTruckFrameAxlePositions(g.frame, halfL, g.platform);
  const dmg = car.damage;
  const wheelDamage = dmg?.wheelDamage || [0, 0, 0, 0];

  const isOffroad = g.frame.rearTireType === 'offroad_single' || g.isAwd;
  const frontLen = isOffroad ? 8.2 : 7.6;
  const frontWid = isOffroad ? 3.2 : 2.6;
  const rearLen = isOffroad ? 8.4 : 7.6;
  const rearSingleWid = isOffroad ? 3.4 : 2.35;
  const tireStyle = isOffroad ? 'agri' : 'heavy';

  const drawSingleWheel = (
    wx: number,
    wy: number,
    len: number,
    wid: number,
    ang: number,
    rimColor: string,
    isBurst: boolean
  ) => {
    if (isBurst) {
      drawTreadedTire(ctx, wx, wy, len * 0.88, wid * 0.78, ang, 'slick', '#475569');
      return;
    }
    drawTreadedTire(ctx, wx, wy, len, wid, ang, tireStyle, rimColor);
  };

  // Front steered axle
  const frontX = frontAxlesX[0];
  const frontTrackY = halfW - (isOffroad ? 1.55 : 1.75);
  for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
    const side = sideIdx === 0 ? -1 : 1;
    const isBurst = (wheelDamage[sideIdx] || 0) >= 0.95;
    drawSingleWheel(
      frontX,
      side * frontTrackY,
      frontLen,
      frontWid,
      steerAngle,
      g.isNewBusiness ? '#cbd5e1' : '#94a3b8',
      isBurst
    );
  }

  // Rear drive axle (dual 16C tires on 4x2, aggressive single MT on 4x4)
  const rearX = rearAxlesX[0];
  if (isOffroad) {
    const rearTrackY = halfW - 1.45;
    for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
      const side = sideIdx === 0 ? -1 : 1;
      const isBurst = (wheelDamage[2 + sideIdx] || 0) >= 0.95;
      drawSingleWheel(rearX, side * rearTrackY, rearLen, rearSingleWid, 0, '#94a3b8', isBurst);
    }
  } else {
    // Classic GAZelle twin rear wheels (outer + inner tire per side)
    const outerY = halfW - 1.45;
    const innerY = outerY - rearSingleWid - 0.55;
    for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
      const side = sideIdx === 0 ? -1 : 1;
      const isBurst = (wheelDamage[2 + sideIdx] || 0) >= 0.95;
      drawSingleWheel(rearX, side * innerY, rearLen, rearSingleWid, 0, '#64748b', isBurst);
      drawSingleWheel(rearX, side * outerY, rearLen, rearSingleWid, 0, '#94a3b8', isBurst);
    }
  }
}

// ============================================================================
// 2. BARE LADDER FRAME, DRIVETRAIN, AXLES, SUSPENSION & REAR LAMP BAR
// ============================================================================

function renderGazelleBareFrame(
  vCtx: VehicleRenderContext,
  g: GazelleResolved,
  optics: LiveOpticsState
): void {
  const { ctx, halfL, halfW, fc, rc, cabinX, cabinL, deform } = vCtx;
  const { frontAxlesX, rearAxlesX } = getTruckFrameAxlePositions(g.frame, halfL, g.platform);
  const frontX = frontAxlesX[0];
  const rearX = rearAxlesX[0];
  const cabRearX = cabinX - cabinL * 0.5 - 0.35;

  const railStartX = -halfL + rc + 0.9;
  const railEndX = halfL - fc - 1.2;
  const railCenterY = 3.55;
  const railFlangeW = 1.15;
  const railDark = g.frame.frameColor || '#161b24';
  const railEdge = '#334155';
  const isBareFrame = g.body.id === 'body_none';

  // --- A. UNDER-CHASSIS EXHAUST PIPE & MUFFLER (right side) ---
  const muffX1 = Math.max(railStartX + 4.5, cabRearX - 11.5);
  const muffX2 = Math.min(cabRearX - 1.2, muffX1 + 7.2);
  drawChromePipe(
    ctx,
    [
      [cabRearX + 3.5, 1.8],
      [muffX2 + 0.5, railCenterY + 1.5],
      [muffX1 - 1.4, railCenterY + 1.5],
      [muffX1 - 3.6, halfW - 2.3],
    ],
    0.75,
    deform,
    '#64748b'
  );
  // Muffler resonator canister
  drawRoundedBox(
    ctx,
    muffX1,
    railCenterY + 0.65,
    muffX2,
    railCenterY + 2.45,
    0.55,
    createCylindricalGradient(ctx, railCenterY + 0.65, railCenterY + 2.45, '#525b68', 0.25),
    deform,
    '#1e293b',
    0.42
  );
  // Muffler clamping bands
  strokePoly(ctx, [[muffX1 + 1.4, railCenterY + 0.6], [muffX1 + 1.4, railCenterY + 2.5]], '#1e293b', 0.5, deform);
  strokePoly(ctx, [[muffX2 - 1.4, railCenterY + 0.6], [muffX2 - 1.4, railCenterY + 2.5]], '#1e293b', 0.5, deform);

  // --- B. SPARE WHEEL CARRIER (under rear overhang or side frame) ---
  if (g.frame.spareWheelMount === 'under_rear') {
    const spX = Math.min(rearX - 6.6, railStartX + 4.9);
    if (spX > railStartX + 2.2) {
      drawDeformedDot(ctx, spX, 0, 3.65, '#0b1018', deform, '#1e293b', 0.5);
      drawDeformedDot(ctx, spX, 0, 2.1, '#475569', deform, '#0f172a', 0.4);
      drawDeformedDot(ctx, spX, 0, 0.85, '#94a3b8', deform);
      // Carrier retainer strap
      strokePoly(ctx, [[spX - 3.9, 0], [spX + 3.9, 0]], '#334155', 0.65, deform);
    }
  } else if (g.frame.spareWheelMount === 'frame_side') {
    const spX = (cabRearX + rearX) * 0.5;
    drawRoundedBox(ctx, spX - 3.5, railCenterY + 1.0, spX + 3.5, railCenterY + 3.3, 0.6, '#0d121a', deform, '#334155', 0.4);
  }

  // --- C. AXLE BEAMS, BANJO DIFFERENTIAL & LEAF SPRINGS ---
  // Front axle beam (solid I-beam on 4x2, live differential pumpkin on 4x4)
  strokePoly(ctx, [[frontX, -halfW + 1.6], [frontX, halfW - 1.6]], '#1e293b', g.isAwd ? 1.8 : 1.35, deform);
  strokePoly(ctx, [[frontX, -halfW + 2.2], [frontX, halfW - 2.2]], '#475569', 0.55, deform);
  if (g.isAwd) {
    drawDeformedDot(ctx, frontX, -1.1, 2.05, '#334155', deform, '#0f172a', 0.45);
    drawDeformedDot(ctx, frontX, -1.1, 1.0, '#64748b', deform);
  }

  // Rear Banjo live axle beam + central differential pumpkin + brake drum housings
  strokePoly(ctx, [[rearX, -halfW + 1.4], [rearX, halfW - 1.4]], '#0f172a', 2.4, deform);
  strokePoly(ctx, [[rearX, -halfW + 1.8], [rearX, halfW - 1.8]], '#334155', 1.35, deform);
  // Brake drum backing hubs near inner tires
  for (const side of [-1, 1] as const) {
    drawRoundedBox(
      ctx,
      rearX - 1.7,
      side * (halfW - 4.7) - 0.65,
      rearX + 1.7,
      side * (halfW - 4.7) + 0.65,
      0.3,
      '#1e293b',
      deform,
      '#475569',
      0.35
    );
  }
  // Banjo differential pumpkin (oval housing + bolts + pinion nose)
  drawRoundedBox(ctx, rearX - 2.3, -2.2, rearX + 2.5, 2.2, 1.3, '#1e293b', deform, '#475569', 0.45);
  drawDeformedDot(ctx, rearX, 0, 1.45, '#334155', deform, '#64748b', 0.35);
  for (let bi = 0; bi < 6; bi++) {
    const ba = (bi / 6) * Math.PI * 2;
    drawDeformedDot(ctx, rearX + Math.cos(ba) * 1.15, Math.sin(ba) * 1.15, 0.22, '#cbd5e1', deform);
  }

  // Longitudinal multi-leaf springs & angled shock absorbers along rear axle
  for (const side of [-1, 1] as const) {
    const sy = side * (railCenterY + 0.95);
    const springL = 7.4;
    // Spring pack + clamps + end shackles
    strokePoly(ctx, [[rearX - springL, sy], [rearX + springL, sy]], '#0f172a', 1.45, deform);
    strokePoly(ctx, [[rearX - springL + 0.5, sy], [rearX + springL - 0.5, sy]], '#475569', 0.72, deform);
    // U-bolt mounting plate
    drawRoundedBox(ctx, rearX - 1.15, sy - 0.9, rearX + 1.15, sy + 0.9, 0.25, '#64748b', deform, '#0f172a', 0.35);
    // Spring eye bushings
    drawDeformedDot(ctx, rearX - springL, sy, 0.55, '#94a3b8', deform, '#0f172a', 0.3);
    drawDeformedDot(ctx, rearX + springL, sy, 0.55, '#94a3b8', deform, '#0f172a', 0.3);
    // Angled telescopic shock absorber
    strokePoly(ctx, [[rearX + 0.6, side * (railCenterY + 0.1)], [rearX + 4.4, side * (railCenterY - 1.35)]], '#0284c7', 0.75, deform);
    strokePoly(ctx, [[rearX + 0.6, side * (railCenterY + 0.1)], [rearX + 2.5, side * (railCenterY - 0.62)]], '#cbd5e1', 0.42, deform);
  }

  // --- D. TRANSMISSION, TRANSFER CASE (4x4) & MULTI-PIECE DRIVESHAFT ---
  const gboxX = Math.min(cabRearX + 2.8, frontX - 5.2);
  // Ribbed cast-aluminum 5-speed GAZelle gearbox
  drawRoundedBox(
    ctx,
    gboxX - 2.6,
    -1.65,
    gboxX + 2.8,
    1.65,
    0.55,
    '#64748b',
    deform,
    '#1e293b',
    0.45
  );
  for (let rx = gboxX - 1.8; rx <= gboxX + 1.8; rx += 1.15) {
    strokePoly(ctx, [[rx, -1.45], [rx, 1.45]], '#334155', 0.36, deform);
  }

  let shaftStartX = gboxX - 2.5;
  if (g.isAwd) {
    // 4x4 transfer case ("раздатка") with front prop shaft to front axle
    const tcaseX = gboxX - 6.0;
    drawRoundedBox(ctx, tcaseX - 1.9, -2.3, tcaseX + 1.9, 1.8, 0.55, '#475569', deform, '#0f172a', 0.45);
    strokePoly(ctx, [[gboxX - 2.4, 0], [tcaseX + 1.8, 0]], '#94a3b8', 1.05, deform);
    // Front driveshaft to front axle differential
    drawChromePipe(ctx, [[tcaseX + 1.4, -1.4], [frontX - 1.2, -1.1]], 0.8, deform, '#94a3b8');
    shaftStartX = tcaseX - 1.8;
  }

  // Main rear tubular driveshaft (2-piece with carrier bearing on long/XL/Fermer frames)
  const shaftSpan = shaftStartX - (rearX + 2.3);
  if (shaftSpan > 2.5) {
    drawChromePipe(ctx, [[shaftStartX, 0], [rearX + 2.3, 0]], 0.95, deform, '#94a3b8');
    // Universal joint yokes
    drawRoundedBox(ctx, shaftStartX - 0.8, -0.75, shaftStartX + 0.5, 0.75, 0.25, '#334155', deform, '#0f172a', 0.3);
    drawRoundedBox(ctx, rearX + 1.8, -0.75, rearX + 3.0, 0.75, 0.25, '#334155', deform, '#0f172a', 0.3);
    if (shaftSpan > 15) {
      const midShaftX = (shaftStartX + rearX + 2.3) * 0.5;
      // Carrier bearing cross-strap
      drawRoundedBox(ctx, midShaftX - 0.8, -1.5, midShaftX + 0.8, 1.5, 0.3, '#1e293b', deform, '#64748b', 0.35);
    }
  }

  // Tipper frame PTO & hydraulic cylinder cradle
  if (g.isTipperFrame) {
    const hoistX = (cabRearX + rearX) * 0.52;
    drawRoundedBox(ctx, hoistX - 2.4, -railCenterY + 0.7, hoistX + 2.4, railCenterY - 0.7, 0.4, '#27272a', deform, '#52525b', 0.42);
    drawDeformedDot(ctx, hoistX, 0, 1.65, '#f59e0b', deform, '#0f172a', 0.45);
    drawDeformedDot(ctx, hoistX, 0, 0.85, '#e2e8f0', deform, '#334155', 0.3);
  }

  // --- E. FUEL TANK(S) MOUNTED OUTSIDE FRAME RAILS ---
  const tankX2 = cabRearX - 1.4;
  const tankX1 = Math.max(rearX + 5.2, tankX2 - 8.4);
  const drawFuelTank = (side: -1 | 1) => {
    const ty1 = side < 0 ? -(railCenterY + 3.45) : railCenterY + 0.85;
    const ty2 = side < 0 ? -(railCenterY + 0.85) : railCenterY + 3.45;
    drawRoundedBox(
      ctx,
      tankX1,
      ty1,
      tankX2,
      ty2,
      0.7,
      createCylindricalGradient(ctx, ty1, ty2, '#334155', 0.24),
      deform,
      '#0f172a',
      0.48
    );
    // Steel mounting straps
    strokePoly(ctx, [[tankX1 + 1.8, ty1 - 0.1], [tankX1 + 1.8, ty2 + 0.1]], '#0f172a', 0.7, deform);
    strokePoly(ctx, [[tankX2 - 1.8, ty1 - 0.1], [tankX2 - 1.8, ty2 + 0.1]], '#0f172a', 0.7, deform);
    // Brass filler cap
    const capY = side < 0 ? ty1 + 0.75 : ty2 - 0.75;
    drawDeformedDot(ctx, tankX2 - 1.2, capY, 0.6, '#d97706', deform, '#0f172a', 0.32);
  };
  if (tankX2 - tankX1 > 3.5) {
    drawFuelTank(-1);
    if (g.frame.fuelTankCount >= 2) {
      drawFuelTank(1);
    }
  }

  // --- F. STAMPED C-CHANNEL LADDER FRAME RAILS & CROSSMEMBERS ---
  // Crossmembers
  const cmCount = Math.max(4, g.frame.crossmemberCount || 6);
  const cmSpan = cabRearX - railStartX;
  const visibleCmCount = Math.max(3, cmCount - 2);
  for (let i = 0; i <= visibleCmCount; i++) {
    const cx = railStartX + (i / visibleCmCount) * cmSpan;
    const isRearEnd = i === 0;
    const cmW = isRearEnd ? 1.55 : 1.05;
    drawRoundedBox(
      ctx,
      cx - cmW * 0.5,
      -railCenterY - 0.3,
      cx + cmW * 0.5,
      railCenterY + 0.3,
      0.2,
      isRearEnd ? '#1e293b' : '#242b38',
      deform,
      '#0b0f17',
      0.38
    );
    // Triangular corner gusset rivets
    for (const side of [-1, 1] as const) {
      drawDeformedDot(ctx, cx, side * (railCenterY - 0.45), 0.25, '#94a3b8', deform);
    }
  }

  // Two main longitudinal C-channel frame rails
  for (const side of [-1, 1] as const) {
    const ry1 = side * railCenterY - railFlangeW * 0.5;
    const ry2 = side * railCenterY + railFlangeW * 0.5;
    drawRoundedBox(ctx, railStartX, ry1, railEndX, ry2, 0.25, railDark, deform, '#090d14', 0.45);
    // Top metallic highlight flange
    strokePoly(ctx, [[railStartX + 0.4, side * railCenterY], [cabRearX + 1.0, side * railCenterY]], railEdge, 0.48, deform);

    // XL frame reinforcement outer doubler plates
    if (g.frame.id === 'frm_gazelle_xl_4200') {
      drawRoundedBox(
        ctx,
        rearX + 1.0,
        ry1 - 0.22,
        cabRearX - 0.4,
        ry2 + 0.22,
        0.15,
        '#273040',
        deform,
        '#0f172a',
        0.35
      );
    }

    // Rivet rows visible on exposed rear frame rails
    for (let rx = railStartX + 1.6; rx < cabRearX - 0.8; rx += 3.2) {
      drawDeformedDot(ctx, rx, side * railCenterY, 0.24, '#64748b', deform);
    }
  }

  // --- G. BARE-FRAME REAR WHEEL MUDGUARDS, FLAPS, LICENSE PLATE & LIVE REAR LAMP BAR ---
  if (isBareFrame) {
    // Plastic arched rear wheel mudguards (крылья) + red/white mudflaps
    for (const side of [-1, 1] as const) {
      const guardY1 = side < 0 ? -(halfW - 0.35) : railCenterY + 1.05;
      const guardY2 = side < 0 ? -(railCenterY + 1.05) : halfW - 0.35;
      drawRoundedBox(
        ctx,
        rearX - 4.7,
        guardY1,
        rearX + 4.7,
        guardY2,
        0.95,
        '#111827',
        deform,
        '#334155',
        0.45
      );
      // Ribbed top reinforcement stripe on plastic wing
      strokePoly(ctx, [[rearX - 4.0, (guardY1 + guardY2) * 0.5], [rearX + 4.0, (guardY1 + guardY2) * 0.5]], '#1f2937', 0.7, deform);
      // Rear rubber mudflap behind wheel
      drawRoundedBox(
        ctx,
        rearX - 5.35,
        guardY1 + 0.3,
        rearX - 4.55,
        guardY2 - 0.3,
        0.2,
        '#090d14',
        deform,
        '#475569',
        0.3
      );
    }

    // Rear closing steel bumper bar / lamp carrier bracket
    const barX1 = -halfL + rc + 0.25;
    const barX2 = -halfL + rc + 1.75;
    drawRoundedBox(ctx, barX1, -(railCenterY + 4.2), barX2, railCenterY + 4.2, 0.35, '#1e293b', deform, '#090d14', 0.45);

    // Central steel tow loop & Russian rear license plate
    drawRoundedBox(ctx, barX1 - 0.3, -1.9, barX2 - 0.2, 1.9, 0.2, '#f8fafc', deform, '#0f172a', 0.35);
    strokePoly(ctx, [[barX1 + 0.2, -1.3], [barX1 + 0.2, 1.2]], '#0f172a', 0.4, deform);
    drawRoundedBox(ctx, barX1 - 0.55, -0.5, barX1 + 0.2, 0.5, 0.2, '#475569', deform, '#0f172a', 0.35);

    // Integrated live GAZelle multi-chamber rear taillights on frame brackets
    for (const side of [-1, 1] as const) {
      const ly1 = side < 0 ? -(railCenterY + 4.05) : railCenterY + 0.95;
      const ly2 = side < 0 ? -(railCenterY + 0.95) : railCenterY + 4.05;
      drawIntegratedTaillight(
        ctx,
        barX1 - 0.15,
        ly1,
        barX2 - 0.1,
        ly2,
        side,
        optics.positionOn,
        optics.braking,
        optics.reversing,
        side < 0 ? optics.leftTurn : optics.rightTurn,
        optics.rearFogOn,
        side < 0 ? optics.leftTailBroken : optics.rightTailBroken,
        deform
      );
    }
  }
}

// ============================================================================
// 3. CAB LOWER SHELL, INTEGRATED FRONT BUMPER, GRILLE & HEADLIGHTS (ON MODEL)
// ============================================================================

function getGazelleCabShellColor(car: Vehicle, g: GazelleResolved): string {
  if (g.body.id === 'body_gazelle_utility' || g.body.id === 'body_gazelle_med_reanim') {
    return '#eab308'; // Emergency utility/reanimobile high-visibility yellow
  }
  if (
    g.body.id === 'body_gazelle_med_03' ||
    g.body.id === 'body_gazelle_med_lab' ||
    g.body.id === 'body_gazelle_med_module'
  ) {
    return '#f8fafc'; // Clean clinical ambulance white
  }
  return car.color || '#f1f5f9';
}

function renderGazelleCabLower(
  vCtx: VehicleRenderContext,
  g: GazelleResolved,
  optics: LiveOpticsState
): void {
  const { ctx, car, halfL, halfW, fc, rc, cabinX, cabinL, deform } = vCtx;
  const cabRearX = cabinX - cabinL * 0.5 - 0.35;
  const rearEndX = -halfL + rc + 0.45;
  const noseX = halfL - fc - 0.95;
  const cabColor = getGazelleCabShellColor(car, g);
  const bodyGrad = createBodyMetallicGradient(ctx, halfW, cabColor);
  const { rearAxlesX } = getTruckFrameAxlePositions(g.frame, halfL, g.platform);
  const rearAxleX = rearAxlesX[0];

  // --- A. FRONT CAB & SEMI-BONNET BODY SHELL (OR SEAMLESS ЦМФ MONOCOQUE BODY) ---
  const cabHW = halfW - 0.35;
  const frontShoulderX = noseX - (g.isNewBusiness ? 3.2 : 1.8);
  const noseCornerY = g.isNewBusiness ? cabHW * 0.72 : cabHW * 0.84;
  const shellBackX = g.isIntegral ? rearEndX : cabRearX;

  const cabPoly: Pt[] = g.isIntegral
    ? [
        [noseX, 0],
        [noseX - (g.isNewBusiness ? 0.55 : 0.15), noseCornerY],
        [frontShoulderX, cabHW],
        [rearEndX + 0.75, cabHW],
        [rearEndX, cabHW * 0.86],
        [rearEndX, -cabHW * 0.86],
        [rearEndX + 0.75, -cabHW],
        [frontShoulderX, -cabHW],
        [noseX - (g.isNewBusiness ? 0.55 : 0.15), -noseCornerY],
      ]
    : [
        [noseX, 0],
        [noseX - (g.isNewBusiness ? 0.55 : 0.15), noseCornerY],
        [frontShoulderX, cabHW],
        [cabRearX + 0.9, cabHW],
        [cabRearX, cabHW - 0.7],
        [cabRearX, -(cabHW - 0.7)],
        [cabRearX + 0.9, -cabHW],
        [frontShoulderX, -cabHW],
        [noseX - (g.isNewBusiness ? 0.55 : 0.15), -noseCornerY],
      ];

  // Subtle ambient shadow under shell onto frame
  drawBoxShadow(ctx, shellBackX, -cabHW, noseX, cabHW, 1.5, -0.6, 0.7, 0.32, deform);

  // Main metallic painted shell
  fillPoly(ctx, cabPoly, bodyGrad, deform, shadePaint(cabColor, -0.45), 0.72);

  // Subtle side door/fender shoulder highlight line, wheel arches, moldings & integral livery
  const archX = halfL - 10.6;
  const moldingStartX = g.isIntegral ? rearEndX + 1.2 : cabRearX + 1.2;

  for (const side of [-1, 1] as const) {
    strokePoly(
      ctx,
      [
        [moldingStartX, side * (cabHW - 0.75)],
        [frontShoulderX - 0.3, side * (cabHW - 0.75)],
      ],
      'rgba(255,255,255,0.22)',
      0.48,
      deform
    );
    // Front wheel arch lip crease
    strokePoly(
      ctx,
      [
        [archX - 3.9, side * (cabHW - 0.12)],
        [archX - 2.6, side * (cabHW - 1.05)],
        [archX + 2.6, side * (cabHW - 1.05)],
        [archX + 3.9, side * (cabHW - 0.12)],
      ],
      shadePaint(cabColor, -0.35),
      0.55,
      deform
    );
    // Rear wheel arch crease on integral ЦМФ bodies
    if (g.isIntegral) {
      strokePoly(
        ctx,
        [
          [rearAxleX - 4.3, side * (cabHW - 0.12)],
          [rearAxleX - 2.8, side * (cabHW - 1.1)],
          [rearAxleX + 2.8, side * (cabHW - 1.1)],
          [rearAxleX + 4.3, side * (cabHW - 0.12)],
        ],
        shadePaint(cabColor, -0.35),
        0.55,
        deform
      );
    }

    // Door / flank rub-strip molding
    if (g.isIntegral) {
      // Split around rear arch cleanly
      strokePoly(
        ctx,
        [
          [rearEndX + 1.0, side * (cabHW - 0.18)],
          [rearAxleX - 4.6, side * (cabHW - 0.18)],
        ],
        '#1e293b',
        0.65,
        deform
      );
      strokePoly(
        ctx,
        [
          [rearAxleX + 4.6, side * (cabHW - 0.18)],
          [archX - 4.3, side * (cabHW - 0.18)],
        ],
        '#1e293b',
        0.7,
        deform
      );

      // Variant-specific full-flank livery stripes along ЦМФ lower waist
      const stripeY = side * (cabHW - 0.55);
      if (g.walkableKind === 'passenger') {
        strokePoly(ctx, [[rearEndX + 1.1, stripeY], [cabRearX + 2.0, stripeY]], '#0284c7', 0.72, deform);
      } else if (g.walkableKind === 'med_03' || g.walkableKind === 'med_reanim') {
        strokePoly(ctx, [[rearEndX + 1.1, stripeY], [frontShoulderX - 1.2, stripeY]], '#dc2626', 0.98, deform);
      } else if (g.walkableKind === 'med_lab') {
        strokePoly(ctx, [[rearEndX + 1.1, stripeY], [frontShoulderX - 1.2, stripeY]], '#059669', 0.92, deform);
      }
    } else {
      strokePoly(
        ctx,
        [
          [cabRearX + 1.2, side * (cabHW - 0.18)],
          [archX - 4.3, side * (cabHW - 0.18)],
        ],
        '#1e293b',
        0.7,
        deform
      );
    }
  }

  // Sliding boarding door threshold & step pocket on right side (+Y) for integral bodies
  if (g.isIntegral && g.layout) {
    const dx = g.layout.doorSlideX;
    drawRoundedBox(
      ctx,
      dx - 3.3,
      cabHW - 1.0,
      dx + 3.3,
      cabHW + 0.1,
      0.22,
      '#1e293b',
      deform,
      '#0f172a',
      0.35
    );
    drawRoundedBox(
      ctx,
      dx - 2.9,
      cabHW - 0.7,
      dx + 2.9,
      cabHW - 0.1,
      0.14,
      g.walkableKind === 'passenger' ? '#eab308' : '#94a3b8',
      deform
    );
    // Integrated rear step bumper & live GAZelle taillight blocks
    drawBodyRearLightsAndBumper(ctx, rearEndX + 0.15, cabHW, optics, deform);
  }

  // --- B. MODEL-INTEGRATED FRONT BUMPER, GRILLE & HEADLIGHTS ---
  if (!g.isNewBusiness) {
    // =========================================================================
    // GAZELLE OLD TYPE (ГАЗ-3302 Старый тип):
    // Angular matte-black separate bumper with footstep, slat grille,
    // classic rectangular fluted block headlights + separate amber turn corners
    // =========================================================================
    const bmpX1 = noseX - 0.75;
    const bmpX2 = halfL - fc + 0.55;
    const bmpHW = cabHW + 0.25;

    // Separate protruding matte-black thermoplastic bumper with chamfered ends
    const oldBumperPoly: Pt[] = [
      [bmpX2, -bmpHW * 0.78],
      [bmpX2 - 0.35, -bmpHW],
      [bmpX1 - 0.65, -bmpHW],
      [bmpX1, -bmpHW * 0.85],
      [bmpX1, bmpHW * 0.85],
      [bmpX1 - 0.65, bmpHW],
      [bmpX2 - 0.35, bmpHW],
      [bmpX2, bmpHW * 0.78],
    ];
    fillPoly(ctx, oldBumperPoly, '#1a202c', deform, '#090d14', 0.55);

    // Molded bumper top ribs & central footstep recess (ступенька)
    strokePoly(ctx, [[bmpX2 - 0.45, -bmpHW * 0.76], [bmpX2 - 0.45, bmpHW * 0.76]], '#334155', 0.45, deform);
    drawRoundedBox(ctx, bmpX1 + 0.25, -3.0, bmpX2 - 0.2, 3.0, 0.25, '#0f172a', deform, '#334155', 0.35);
    // License plate on bumper front edge
    drawRoundedBox(ctx, bmpX2 - 0.35, -2.05, bmpX2 + 0.12, 2.05, 0.15, '#f8fafc', deform, '#0f172a', 0.3);
    // Two classic vertical rubber bumperettes
    drawRoundedBox(ctx, bmpX1 + 0.2, -3.65, bmpX2 - 0.1, -3.05, 0.18, '#111827', deform, '#475569', 0.28);
    drawRoundedBox(ctx, bmpX1 + 0.2, 3.05, bmpX2 - 0.1, 3.65, 0.18, '#111827', deform, '#475569', 0.28);
    // Exposed steel front tow eye on right side
    drawDeformedDot(ctx, bmpX2 + 0.15, 4.3, 0.45, '#475569', deform, '#0f172a', 0.3);

    // Classic horizontal-slat black plastic radiator grille behind bumper
    const grX1 = noseX - 1.55;
    const grX2 = noseX - 0.25;
    drawRoundedBox(ctx, grX1, -5.2, grX2, 5.2, 0.35, '#0c111b', deform, '#334155', 0.4);
    for (let gy = -4.3; gy <= 4.35; gy += 1.45) {
      strokePoly(ctx, [[grX1 + 0.25, gy], [grX2 - 0.2, gy]], '#1e293b', 0.42, deform);
    }
    // Classic central GAZ crest badge (silver ring + red shield)
    drawRoundedBox(ctx, grX1 + 0.2, -1.05, grX2 - 0.1, 1.05, 0.3, '#cbd5e1', deform, '#0f172a', 0.3);
    drawDeformedDot(ctx, (grX1 + grX2) * 0.5, 0, 0.52, '#b91c1c', deform);

    // Classic rectangular glass block headlights + separate outboard amber turn signals
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? optics.leftHeadBroken : optics.rightHeadBroken;
      const turnInt = side < 0 ? optics.leftTurn : optics.rightTurn;
      const hlX1 = noseX - 2.15;
      const hlX2 = noseX - 0.15;
      const innerY = side * 5.25;
      const midY = side * 8.15;
      const outerY = side * (cabHW - 0.35);

      const yMinMain = Math.min(innerY, midY);
      const yMaxMain = Math.max(innerY, midY);
      const yMinTurn = Math.min(midY, outerY);
      const yMaxTurn = Math.max(midY, outerY);

      if (broken) {
        drawRoundedBox(ctx, hlX1, yMinMain, hlX2, yMaxMain, 0.3, '#0f172a', deform, '#020617', 0.4);
        strokePoly(ctx, [[hlX1 + 0.25, yMinMain + 0.25], [hlX2 - 0.25, yMaxMain - 0.25]], '#94a3b8', 0.32, deform);
      } else {
        // Chrome bezel + fluted rectangular glass headlamp
        drawRoundedBox(ctx, hlX1, yMinMain, hlX2, yMaxMain, 0.35, '#1e293b', deform, '#475569', 0.38);
        const lampFill = optics.headlightsOn
          ? (optics.highBeam ? '#ffffff' : '#fef3c7')
          : (optics.positionOn ? '#fde68a' : '#cbd5e1');
        drawRoundedBox(ctx, hlX1 + 0.22, yMinMain + 0.22, hlX2 - 0.14, yMaxMain - 0.22, 0.22, lampFill, deform);
        // Classic vertical glass fluting striations
        for (let fy = yMinMain + 0.65; fy < yMaxMain - 0.45; fy += 0.62) {
          strokePoly(ctx, [[hlX1 + 0.32, fy], [hlX2 - 0.22, fy]], 'rgba(15,23,42,0.18)', 0.22, deform);
        }
        // Bright halogen core glow when lit
        if (optics.headlightsOn) {
          drawDeformedDot(ctx, (hlX1 + hlX2) * 0.5 + 0.25, (yMinMain + yMaxMain) * 0.5, 0.85, '#ffffff', deform);
        }
      }

      // Separate outboard amber corner turn signal lamp (classic old GAZelle feature)
      const turnFill = turnInt > 0.08
        ? `rgba(251,191,36,${(0.60 + 0.40 * turnInt).toFixed(2)})`
        : '#c2410c';
      drawRoundedBox(
        ctx,
        hlX1 - 0.45,
        yMinTurn,
        hlX2 - 0.25,
        yMaxTurn,
        0.4,
        broken ? '#111827' : turnFill,
        deform,
        '#1e293b',
        0.35
      );
      if (turnInt > 0.12 && !broken) {
        drawDeformedDot(ctx, (hlX1 + hlX2) * 0.5 - 0.2, (yMinTurn + yMaxTurn) * 0.5, 0.6, '#fef9c3', deform);
      }

      // Classic rectangular amber fender side repeater
      const repX = halfL - 14.3;
      drawRoundedBox(
        ctx,
        repX - 0.6,
        side * (cabHW - 0.35) - 0.28,
        repX + 0.6,
        side * (cabHW - 0.35) + 0.28,
        0.18,
        turnInt > 0.08 ? '#fbbf24' : '#b45309',
        deform,
        '#0f172a',
        0.25
      );

      // Underslung rectangular auxiliary fog lamps on bumper when active
      const fogY = side * 5.9;
      drawRoundedBox(
        ctx,
        bmpX1 + 0.35,
        fogY - 0.95,
        bmpX2 - 0.15,
        fogY + 0.95,
        0.22,
        optics.frontFogOn ? '#fef08a' : '#334155',
        deform,
        '#0f172a',
        0.3
      );
    }
  } else {
    // =========================================================================
    // GAZELLE BUSINESS NEW TYPE (ГАЗель Бизнес Новый тип — Рестайлинг):
    // Iconic integrated one-piece wrap-around bumper-grille fascia,
    // twin silver grille bars + GAZ deer emblem, round recessed bumper fogs,
    // large swept-back clear-lens teardrop headlights with DRL brow & turn corner
    // =========================================================================
    const bmpX1 = noseX - 1.35;
    const bmpX2 = halfL - fc + 0.72;
    const bmpHW = cabHW + 0.28;

    // One-piece sculpted matte graphite Business bumper-grille molding
    const bizBumperPoly: Pt[] = [
      [bmpX2 + 0.15, 0],
      [bmpX2 - 0.05, bmpHW * 0.58],
      [bmpX2 - 0.65, bmpHW * 0.88],
      [bmpX1 - 0.55, bmpHW],
      [bmpX1 - 1.0, bmpHW * 0.92],
      [bmpX1 + 0.25, bmpHW * 0.52],
      [bmpX1 + 0.45, 0],
      [bmpX1 + 0.25, -bmpHW * 0.52],
      [bmpX1 - 1.0, -bmpHW * 0.92],
      [bmpX1 - 0.55, -bmpHW],
      [bmpX2 - 0.65, -bmpHW * 0.88],
      [bmpX2 - 0.05, -bmpHW * 0.58],
    ];
    const bmpGrad = createCylindricalGradient(ctx, -bmpHW, bmpHW, '#272f3d', 0.22);
    fillPoly(ctx, bizBumperPoly, bmpGrad, deform, '#090d14', 0.58);

    // Lower trapezoidal honeycomb air intake dam
    const lowerIntake: Pt[] = [
      [bmpX2 - 0.22, -4.6],
      [bmpX2 - 0.22, 4.6],
      [bmpX2 - 0.88, 3.8],
      [bmpX2 - 0.88, -3.8],
    ];
    fillPoly(ctx, lowerIntake, '#090d16', deform, '#334155', 0.32);

    // Upper iconic Business trapezoidal grille pocket with twin brushed silver bars
    const upperGrille: Pt[] = [
      [bmpX1 + 0.4, -5.0],
      [bmpX2 - 0.85, -4.4],
      [bmpX2 - 0.85, 4.4],
      [bmpX1 + 0.4, 5.0],
    ];
    fillPoly(ctx, upperGrille, '#0b1019', deform, '#475569', 0.36);

    // Twin silver horizontal grille bars (signature GAZelle Business face)
    strokePoly(ctx, [[bmpX1 + 0.72, -4.5], [bmpX1 + 0.72, 4.5]], '#cbd5e1', 0.45, deform);
    strokePoly(ctx, [[bmpX2 - 1.15, -4.15], [bmpX2 - 1.15, 4.15]], '#94a3b8', 0.42, deform);

    // Chrome-ringed GAZ deer emblem medallion on upper center grille
    const embX = (bmpX1 + 0.4 + bmpX2 - 0.85) * 0.5;
    drawRoundedBox(ctx, embX - 0.45, -1.15, embX + 0.45, 1.15, 0.35, '#e2e8f0', deform, '#1e293b', 0.32);
    drawDeformedDot(ctx, embX, 0, 0.48, '#dc2626', deform);

    // Front license plate mounted cleanly on central Business bumper bar
    drawRoundedBox(ctx, bmpX2 - 0.38, -2.05, bmpX2 + 0.14, 2.05, 0.15, '#f8fafc', deform, '#0f172a', 0.3);

    // Round recessed bumper fog lights + swept-back teardrop Business headlights
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? optics.leftHeadBroken : optics.rightHeadBroken;
      const turnInt = side < 0 ? optics.leftTurn : optics.rightTurn;

      // Round recessed fog light in Business bumper corner
      const fogX = bmpX2 - 0.55;
      const fogY = side * 6.55;
      drawDeformedDot(ctx, fogX, fogY, 0.92, '#0f172a', deform, '#64748b', 0.32);
      drawDeformedDot(
        ctx,
        fogX + 0.08,
        fogY,
        0.65,
        optics.frontFogOn ? '#fef9c3' : '#94a3b8',
        deform
      );

      // Swept-back teardrop clear-lens Business headlight polygon
      const hlPts: Pt[] = [
        [noseX - 0.1, side * 5.0],
        [noseX - 0.55, side * 8.3],
        [noseX - 1.85, side * (cabHW - 0.25)],
        [noseX - 3.35, side * (cabHW - 0.55)],
        [noseX - 2.35, side * 5.4],
      ];

      if (broken) {
        fillPoly(ctx, hlPts, '#0f172a', deform, '#020617', 0.42);
        strokePoly(ctx, [[noseX - 2.6, side * 6.0], [noseX - 0.6, side * 9.0]], '#94a3b8', 0.32, deform);
      } else {
        // Dark polycarbonate housing + crystal clear outer lens
        fillPoly(ctx, hlPts, '#111827', deform, '#475569', 0.42);
        const lensPts: Pt[] = [
          [noseX - 0.28, side * 5.35],
          [noseX - 0.68, side * 8.15],
          [noseX - 1.75, side * (cabHW - 0.55)],
          [noseX - 2.95, side * (cabHW - 0.85)],
          [noseX - 2.12, side * 5.65],
        ];
        const lensFill = optics.headlightsOn
          ? (optics.highBeam ? '#ffffff' : '#fef9c3')
          : 'rgba(226,232,240,0.82)';
        fillPoly(ctx, lensPts, lensFill, deform);

        // Dual chrome parabolic reflector bowls (inner high-beam + outer low-beam)
        drawDeformedDot(
          ctx,
          noseX - 1.15,
          side * 6.45,
          0.78,
          optics.highBeam ? '#ffffff' : (optics.headlightsOn ? '#fef08a' : '#94a3b8'),
          deform,
          '#334155',
          0.25
        );
        drawDeformedDot(
          ctx,
          noseX - 1.45,
          side * 8.05,
          0.88,
          optics.headlightsOn ? '#ffffff' : '#cbd5e1',
          deform,
          '#334155',
          0.25
        );

        // Swept DRL / position light eyebrow along front edge of headlight
        const browColor = optics.headlightsOn || optics.positionOn || optics.ignitionOn
          ? '#e0f2fe'
          : 'rgba(148,163,184,0.45)';
        strokePoly(
          ctx,
          [
            [noseX - 0.32, side * 5.45],
            [noseX - 0.72, side * 8.2],
            [noseX - 1.72, side * (cabHW - 0.65)],
          ],
          browColor,
          0.48,
          deform
        );

        // Swept outer corner turn indicator chamber
        const turnPts: Pt[] = [
          [noseX - 1.65, side * (cabHW - 1.55)],
          [noseX - 1.88, side * (cabHW - 0.55)],
          [noseX - 2.95, side * (cabHW - 0.82)],
          [noseX - 2.62, side * (cabHW - 1.65)],
        ];
        fillPoly(
          ctx,
          turnPts,
          turnInt > 0.08
            ? `rgba(251,191,36,${(0.60 + 0.40 * turnInt).toFixed(2)})`
            : 'rgba(217,119,6,0.55)',
          deform
        );
      }
    }
  }

  // Grille emergency red/blue wig-wag LEDs on ambulances
  if (
    g.walkableKind === 'med_03' ||
    g.walkableKind === 'med_reanim' ||
    g.walkableKind === 'med_module'
  ) {
    const wigX1 = g.isNewBusiness ? noseX - 1.05 : noseX - 1.4;
    const wigX2 = g.isNewBusiness ? noseX - 0.45 : noseX - 0.45;
    for (const side of [-1, 1] as const) {
      const flashOn = optics.sirenOn && (side < 0 ? Math.sin(optics.sirenStrobe) > 0 : Math.sin(optics.sirenStrobe) <= 0);
      drawRoundedBox(
        ctx,
        wigX1,
        side * 2.8 - 0.65,
        wigX2,
        side * 2.8 + 0.65,
        0.16,
        flashOn ? (side < 0 ? '#ff3b3b' : '#38bdf8') : side < 0 ? '#7f1d1d' : '#1e3a8a',
        deform
      );
    }
  }
}

function renderGazelleSaloonCutawayFloorAndFurniture(
  vCtx: VehicleRenderContext,
  g: GazelleResolved,
  optics: LiveOpticsState
): void {
  const layout = g.layout;
  if (!layout) return;
  const { ctx, halfL, halfW, rc, cabinX, cabinL, deform } = vCtx;

  const isPass = layout.kind === 'passenger';
  const isMedLab = layout.kind === 'med_lab';
  const isReanim = layout.kind === 'med_reanim';

  if (layout.isIntegral) {
    const cabHW = halfW - 0.35;
    const floorX1 = layout.salRearX;
    const floorX2 = layout.cabFrontX - 1.1;
    const floorHW = cabHW - 0.95;

    // 1. Continuous Interior Floor Deck
    const floorFill = isPass ? '#1e293b' : '#cbd5e1';
    drawRoundedBox(ctx, floorX1, -floorHW, floorX2, floorHW, 0.55, floorFill, deform, '#334155', 0.45);

    if (isPass) {
      // Ribbed dark gray transit flooring + central aisle runner
      for (let rx = floorX1 + 1.8; rx < layout.partitionX - 0.6; rx += 2.6) {
        strokePoly(ctx, [[rx, -floorHW + 0.4], [rx, floorHW - 0.4]], 'rgba(148,163,184,0.12)', 0.35, deform);
      }
      drawRoundedBox(
        ctx,
        layout.rearBenchX + 2.2,
        -2.2,
        layout.partitionX - 0.4,
        2.2,
        0.2,
        '#334155',
        deform
      );
    } else {
      // Clinical seamless hospital vinyl floor tile grid
      for (let rx = floorX1 + 2.5; rx < layout.partitionX - 0.5; rx += 4.2) {
        strokePoly(ctx, [[rx, -floorHW + 0.3], [rx, floorHW - 0.3]], 'rgba(71,85,105,0.22)', 0.32, deform);
      }
      strokePoly(ctx, [[floorX1 + 0.5, 0], [layout.partitionX - 0.4, 0]], 'rgba(71,85,105,0.20)', 0.32, deform);
    }

    // Yellow high-visibility safety step at sliding door threshold
    drawRoundedBox(
      ctx,
      layout.doorSlideX - 3.0,
      floorHW - 0.95,
      layout.doorSlideX + 3.0,
      floorHW + 0.15,
      0.16,
      '#eab308',
      deform,
      '#0f172a',
      0.25
    );
    if (!isPass) {
      // Rear loading threshold plate (for ambulance stretcher)
      drawRoundedBox(
        ctx,
        floorX1 - 0.25,
        -4.5,
        floorX1 + 1.0,
        4.5,
        0.16,
        '#eab308',
        deform,
        '#0f172a',
        0.25
      );
    }

    // 2. Cockpit Dashboard, Steering Column & Driver/Passenger Seats
    const dashX = layout.cabFrontX - 1.5;
    drawRoundedBox(ctx, dashX - 1.3, -floorHW + 0.2, dashX + 0.75, floorHW - 0.2, 0.35, '#0f172a', deform, '#334155', 0.35);
    // Instrument binnacle + steering wheel on driver side (-Y)
    drawDeformedDot(ctx, dashX - 1.55, -4.8, 1.35, '#090d16', deform, '#94a3b8', 0.45);
    // Gearstick between front seats
    drawDeformedDot(ctx, layout.cockpitSeatX + 2.5, -1.2, 0.42, '#1e293b', deform, '#cbd5e1', 0.22);

    for (const sy of [-4.8, 4.8]) {
      const sx = layout.cockpitSeatX;
      drawRoundedBox(ctx, sx - 1.55, sy - 1.95, sx + 1.65, sy + 1.95, 0.45, '#334155', deform, '#0f172a', 0.35);
      // Backrest bolster & headrest
      drawRoundedBox(ctx, sx - 1.55, sy - 1.75, sx - 0.55, sy + 1.75, 0.3, '#475569', deform);
      drawRoundedBox(ctx, sx - 1.4, sy - 0.85, sx - 0.75, sy + 0.85, 0.22, '#1e293b', deform);
    }

    // 3. Cab-to-Saloon Bulkhead Partition (right-hand walkway open to match physics wall)
    const partX = layout.partitionX;
    drawRoundedBox(ctx, partX - 0.4, -floorHW, partX + 0.4, 1.2, 0.18, '#475569', deform, '#0f172a', 0.35);
    drawRoundedBox(ctx, partX - 0.4, floorHW - 1.1, partX + 0.4, floorHW, 0.14, '#475569', deform, '#0f172a', 0.3);
  } else {
    // Modular Class C Medical Box (behind separate GAZelle cab):
    // Render outer base floor & rear lights/bumper here so player walks on top!
    const cabRearX = cabinX - cabinL * 0.5 - 0.35;
    const bx2 = cabRearX - 0.9;
    const bx1 = -halfL + rc + 0.65;
    const bodyHW = halfW + 0.35;

    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);
    drawBoxShadow(ctx, bx1, -bodyHW, bx2, bodyHW, 0.85, -0.5, 0.6, 0.34, deform);
    // Outer white medical module floor deck + clinical interior floor
    drawRoundedBox(ctx, bx1, -bodyHW, bx2, bodyHW, 0.5, '#f8fafc', deform, '#475569', 0.6);
    drawRoundedBox(ctx, bx1 + 0.85, -bodyHW + 0.85, bx2 - 0.85, bodyHW - 0.85, 0.35, '#cbd5e1', deform, '#64748b', 0.4);
    for (let rx = bx1 + 3.0; rx < bx2 - 1.5; rx += 4.2) {
      strokePoly(ctx, [[rx, -bodyHW + 1.1], [rx, bodyHW - 1.1]], 'rgba(71,85,105,0.22)', 0.32, deform);
    }
    // Side & rear door caution steps
    drawRoundedBox(ctx, layout.doorSlideX - 2.8, bodyHW - 1.1, layout.doorSlideX + 2.8, bodyHW + 0.05, 0.16, '#eab308', deform);
    drawRoundedBox(ctx, bx1 - 0.1, -4.5, bx1 + 1.0, 4.5, 0.16, '#eab308', deform);
  }

  // 4. Saloon Furniture (aligned 1:1 with getGazelleInteriorLayout)
  if (isPass) {
    const drawTransitSeat = (sx: number, sy: number) => {
      drawRoundedBox(ctx, sx - 1.55, sy - 1.85, sx + 1.55, sy + 1.85, 0.42, '#1d4ed8', deform, '#0f172a', 0.34);
      drawRoundedBox(ctx, sx - 1.5, sy - 1.65, sx - 0.6, sy + 1.65, 0.25, '#1e40af', deform);
      drawRoundedBox(ctx, sx - 1.4, sy - 0.8, sx - 0.75, sy + 0.8, 0.2, '#60a5fa', deform);
    };
    for (const sx of layout.passengerLeftXs) {
      drawTransitSeat(sx, -5.4);
    }
    for (const sx of layout.passengerRightXs) {
      drawTransitSeat(sx, 5.4);
    }
    for (const ry of [-5.6, -1.9, 1.9, 5.6]) {
      drawTransitSeat(layout.rearBenchX, ry);
    }
    return;
  }

  if (layout.kind === 'med_03' || isReanim || layout.kind === 'med_module') {
    const gx = layout.gurneyX;
    const gy = layout.gurneyY;

    // Stretcher Gurney with mattress, orange/teal blanket, pillow & aluminum safety rails
    drawBoxShadow(ctx, gx - 5.4, gy - 2.25, gx + 5.4, gy + 2.25, 0.55, -0.35, 0.4, 0.24, deform);
    drawRoundedBox(ctx, gx - 5.4, gy - 2.25, gx + 5.4, gy + 2.25, 0.55, '#94a3b8', deform, '#334155', 0.45);
    drawRoundedBox(ctx, gx - 4.9, gy - 1.85, gx + 4.9, gy + 1.85, 0.4, '#f8fafc', deform, '#64748b', 0.3);
    // Blanket on lower 2/3 of gurney
    drawRoundedBox(
      ctx,
      gx - 4.7,
      gy - 1.7,
      gx + 1.8,
      gy + 1.7,
      0.3,
      isReanim ? '#ea580c' : '#dc2626',
      deform
    );
    // White pillow at head end (+X)
    drawRoundedBox(ctx, gx + 2.6, gy - 1.25, gx + 4.5, gy + 1.25, 0.35, '#ffffff', deform, '#cbd5e1', 0.25);
    // Chrome aluminum side rails
    strokePoly(ctx, [[gx - 4.4, gy - 2.1], [gx + 4.2, gy - 2.1]], '#e2e8f0', 0.35, deform);
    strokePoly(ctx, [[gx - 4.4, gy + 2.1], [gx + 4.2, gy + 2.1]], '#e2e8f0', 0.35, deform);

    // Head Medic Swivel Chair (facing -X toward patient head)
    const hx = layout.medHeadSeatX;
    const hy = layout.medHeadSeatY;
    drawRoundedBox(ctx, hx - 1.45, hy - 1.65, hx + 1.45, hy + 1.65, 0.4, '#0f172a', deform, '#475569', 0.35);
    drawRoundedBox(ctx, hx + 0.55, hy - 1.45, hx + 1.4, hy + 1.45, 0.25, '#334155', deform);

    // Side Folding Medic Seat (facing -Y toward gurney)
    const sx = layout.medSideSeatX;
    const sy = layout.medSideSeatY;
    drawRoundedBox(ctx, sx - 1.6, sy - 1.3, sx + 1.6, sy + 1.3, 0.38, '#1e293b', deform, '#475569', 0.35);
    drawRoundedBox(ctx, sx - 1.4, sy + 0.45, sx + 1.4, sy + 1.25, 0.22, '#334155', deform);

    // Left-wall Medicine Cabinet & ECG / Defibrillator Monitor Station
    const wallY = -(halfW - 1.65);
    drawRoundedBox(ctx, gx - 5.2, wallY - 0.85, gx + 4.5, wallY + 0.9, 0.25, '#f1f5f9', deform, '#475569', 0.38);
    drawMedicalCrossEmblem(ctx, gx - 2.5, wallY, 0.65, deform, '#dc2626');
    // Glowing ECG Vital Monitor Screen
    drawRoundedBox(ctx, gx + 0.6, wallY - 0.55, gx + 3.6, wallY + 0.65, 0.2, '#0f172a', deform, '#64748b', 0.25);
    drawRoundedBox(ctx, gx + 0.9, wallY - 0.32, gx + 3.3, wallY + 0.42, 0.12, '#064e3b', deform);
    strokePoly(
      ctx,
      [
        [gx + 1.1, wallY + 0.05],
        [gx + 1.7, wallY + 0.05],
        [gx + 2.0, wallY - 0.2],
        [gx + 2.3, wallY + 0.25],
        [gx + 2.6, wallY + 0.05],
        [gx + 3.1, wallY + 0.05],
      ],
      '#34d399',
      0.28,
      deform
    );

    // Oxygen Cylinder Rack (twin cylinders in Reanimobile, single in 03 / Module)
    const o2X = layout.salRearX + 2.2;
    const o2Y = halfW - 2.6;
    drawRoundedBox(ctx, o2X - 1.0, o2Y - 1.2, o2X + 1.0, o2Y + 1.2, 0.5, '#0284c7', deform, '#0f172a', 0.35);
    drawDeformedDot(ctx, o2X, o2Y, 0.3, '#eab308', deform);
    if (isReanim) {
      drawRoundedBox(ctx, o2X - 1.0, o2Y - 3.6, o2X + 1.0, o2Y - 1.4, 0.5, '#0284c7', deform, '#0f172a', 0.35);
      drawDeformedDot(ctx, o2X, o2Y - 2.5, 0.3, '#eab308', deform);
    }
    return;
  }

  if (isMedLab) {
    // 1. White leatherette medical examination couch (left rear)
    const cx = layout.labCouchX;
    const cy = layout.labCouchY;
    drawBoxShadow(ctx, cx - 5.2, cy - 2.15, cx + 5.2, cy + 2.15, 0.45, -0.35, 0.35, 0.2, deform);
    drawRoundedBox(ctx, cx - 5.2, cy - 2.15, cx + 5.2, cy + 2.15, 0.45, '#f8fafc', deform, '#475569', 0.42);
    drawRoundedBox(ctx, cx + 2.8, cy - 1.5, cx + 4.7, cy + 1.5, 0.3, '#e2e8f0', deform, '#94a3b8', 0.25);
    drawRoundedBox(ctx, cx - 4.7, cy - 1.7, cx + 2.4, cy + 1.7, 0.25, '#d1fae5', deform);

    // 2. Doctor Desk & Lab Analyzer / Microscope + Doctor Swivel Chair
    const dx = layout.labDoctorX;
    const dy = layout.labDoctorY;
    drawRoundedBox(ctx, dx - 3.8, dy + 2.2, dx + 3.8, halfW - 1.45, 0.3, '#f1f5f9', deform, '#475569', 0.4);
    // Lab blood analyzer & microscope pad on desk
    drawRoundedBox(ctx, dx - 2.2, dy + 2.6, dx + 0.6, dy + 4.4, 0.2, '#0f172a', deform, '#059669', 0.25);
    drawDeformedDot(ctx, dx + 2.1, dy + 3.5, 0.7, '#334155', deform, '#cbd5e1', 0.25);
    // Doctor chair
    drawRoundedBox(ctx, dx - 1.45, dy - 1.45, dx + 1.45, dy + 1.45, 0.45, '#059669', deform, '#0f172a', 0.35);

    // 3. Patient Waiting Seat + Cold-Chain Vaccine Fridge & Sink
    const wx = layout.labWaitX;
    const wy = layout.labWaitY;
    drawRoundedBox(ctx, wx - 1.5, wy - 1.7, wx + 1.5, wy + 1.7, 0.38, '#10b981', deform, '#0f172a', 0.35);
    // Vaccine cold-chain fridge near front bulkhead
    drawRoundedBox(ctx, layout.salFrontX - 3.0, halfW - 4.5, layout.salFrontX - 0.5, halfW - 1.5, 0.25, '#e2e8f0', deform, '#0284c7', 0.4);
    // Stainless steel washbasin next to desk
    drawRoundedBox(ctx, layout.salRearX + 0.8, halfW - 4.2, layout.salRearX + 3.6, halfW - 1.4, 0.25, '#94a3b8', deform, '#334155', 0.35);
    drawDeformedDot(ctx, layout.salRearX + 2.2, halfW - 2.8, 0.65, '#334155', deform);
  }
}

export function renderGazelleChassisLayer(vCtx: VehicleRenderContext): void {
  const g = resolveGazelle(vCtx.car);
  const optics = getLiveOpticsState(vCtx.car);

  // 1. Bare ladder frame, drivetrain, axles, suspension, tanks, and rear lamp bar
  renderGazelleBareFrame(vCtx, g, optics);

  // 2. Cab lower body shell (or full ЦМФ lower hull) with model-integrated front bumper, grille & live headlights
  renderGazelleCabLower(vCtx, g, optics);

  // 3. If player is currently walking or sitting inside saloon, render cutaway floor & interior furniture in Pass 1
  if (vCtx.car.isPlayerInsideSaloon && g.layout) {
    renderGazelleSaloonCutawayFloorAndFurniture(vCtx, g, optics);
  }
}

// ============================================================================
// 4. CAB UPPER LAYER: HOOD, WIPERS, GREENHOUSE, FERMER CAB, MIRRORS & ROOF
// ============================================================================

function renderGazelleCabUpper(
  vCtx: VehicleRenderContext,
  g: GazelleResolved,
  optics: LiveOpticsState
): void {
  const { ctx, car, halfL, halfW, fc, cabinX, cabinL, cabinW, deform } = vCtx;
  const cabColor = getGazelleCabShellColor(car, g);
  const cabHW = halfW - 0.35;
  const cabFrontX = cabinX + cabinL * 0.5;
  const cabRearX = cabinX - cabinL * 0.5;
  const noseX = halfL - fc - 1.05;
  const hoodOpen = isVehicleHoodExposed(car);

  // --- A. CLOSED SEMI-BONNET HOOD & COWL VENTING (skip if hood is open!) ---
  if (!hoodOpen) {
    const hoodX1 = cabFrontX;
    const hoodX2 = noseX - (g.isNewBusiness ? 0.55 : 0.25);
    const hoodHW = halfW * 0.72;

    if (!g.isNewBusiness) {
      // Old GAZelle flat ribbed hood with twin cooling intake louvers ("жабры")
      const hoodPts: Pt[] = [
        [hoodX1, -hoodHW],
        [hoodX2, -hoodHW * 0.88],
        [hoodX2 + 0.2, 0],
        [hoodX2, hoodHW * 0.88],
        [hoodX1, hoodHW],
      ];
      fillPoly(
        ctx,
        hoodPts,
        createBodyMetallicGradient(ctx, hoodHW, cabColor),
        deform,
        'rgba(15,23,42,0.48)',
        0.55
      );
      // Raised central hood stampings
      strokePoly(ctx, [[hoodX1 + 0.5, -hoodHW * 0.54], [hoodX2 - 0.4, -hoodHW * 0.46]], 'rgba(255,255,255,0.28)', 0.5, deform);
      strokePoly(ctx, [[hoodX1 + 0.5, hoodHW * 0.54], [hoodX2 - 0.4, hoodHW * 0.46]], 'rgba(255,255,255,0.28)', 0.5, deform);
      strokePoly(ctx, [[hoodX1 + 0.5, -hoodHW * 0.58], [hoodX2 - 0.4, -hoodHW * 0.50]], 'rgba(15,23,42,0.26)', 0.38, deform);
      strokePoly(ctx, [[hoodX1 + 0.5, hoodHW * 0.58], [hoodX2 - 0.4, hoodHW * 0.50]], 'rgba(15,23,42,0.26)', 0.38, deform);

      // Iconic twin dark slotted cowl cooling louvers on old GAZelle hood
      for (const side of [-1, 1] as const) {
        const lvY1 = side < 0 ? -hoodHW * 0.78 : hoodHW * 0.18;
        const lvY2 = side < 0 ? -hoodHW * 0.18 : hoodHW * 0.78;
        drawRoundedBox(ctx, hoodX1 + 0.45, lvY1, hoodX1 + 2.05, lvY2, 0.25, '#0f172a', deform, '#334155', 0.28);
        for (let sy = lvY1 + 0.5; sy < lvY2 - 0.3; sy += 0.62) {
          strokePoly(ctx, [[hoodX1 + 0.6, sy], [hoodX1 + 1.9, sy]], '#334155', 0.26, deform);
        }
      }
    } else {
      // New GAZelle Business aerodynamic hood with V-bulge & black plastic wiper cowl ("жабо")
      const hoodPts: Pt[] = [
        [hoodX1 + 0.95, -hoodHW],
        [hoodX2 - 0.2, -hoodHW * 0.80],
        [hoodX2 + 0.35, 0],
        [hoodX2 - 0.2, hoodHW * 0.80],
        [hoodX1 + 0.95, hoodHW],
      ];
      fillPoly(
        ctx,
        hoodPts,
        createBodyMetallicGradient(ctx, hoodHW, cabColor),
        deform,
        'rgba(15,23,42,0.45)',
        0.55
      );
      // Smooth sculpted V-character creases converging toward emblem
      strokePoly(ctx, [[hoodX1 + 1.15, -hoodHW * 0.62], [hoodX2 - 0.3, -hoodHW * 0.30]], 'rgba(255,255,255,0.34)', 0.55, deform);
      strokePoly(ctx, [[hoodX1 + 1.15, hoodHW * 0.62], [hoodX2 - 0.3, hoodHW * 0.30]], 'rgba(255,255,255,0.34)', 0.55, deform);
      // Black perforated plastic wiper cowl panel ("жабо") at base of windshield
      drawRoundedBox(ctx, hoodX1 - 0.1, -cabinW * 0.48, hoodX1 + 1.05, cabinW * 0.48, 0.28, '#111827', deform, '#1e293b', 0.32);
    }
    // Dual windshield washer nozzles
    drawDeformedDot(ctx, hoodX1 + 1.4, -2.2, 0.32, '#0f172a', deform);
    drawDeformedDot(ctx, hoodX1 + 1.4, 2.2, 0.32, '#0f172a', deform);
  }

  // Medical cross decal on closed hood (for 03 / Reanim / Lab / Medblock)
  if (!hoodOpen && g.walkableKind && g.walkableKind !== 'passenger') {
    const hoodX1 = cabFrontX;
    const hoodX2 = noseX - (g.isNewBusiness ? 0.55 : 0.25);
    const crossColor = g.walkableKind === 'med_lab' ? '#059669' : '#dc2626';
    drawMedicalCrossEmblem(ctx, (hoodX1 + hoodX2) * 0.5 + 0.35, 0, 1.55, deform, crossColor);
  }

  // --- B. PANORAMIC WINDSHIELD, INTERIOR HINT & ANIMATED DUAL WIPERS ---
  const wsX2 = cabFrontX + 0.1;
  const wsX1 = cabFrontX - 3.6;
  const wsHW = cabinW * 0.48;
  const wsPts: Pt[] = [
    [wsX1, -wsHW * 0.92],
    [wsX2 - 0.35, -wsHW],
    [wsX2 + 0.35, 0],
    [wsX2 - 0.35, wsHW],
    [wsX1, wsHW * 0.92],
  ];
  // Black rubber windshield gasket frame
  fillPoly(ctx, wsPts, '#090d16', deform, '#1e293b', 0.45);
  // Tinted laminated windshield glass
  const wsInner: Pt[] = [
    [wsX1 + 0.42, -wsHW * 0.86],
    [wsX2 - 0.55, -wsHW * 0.93],
    [wsX2 + 0.02, 0],
    [wsX2 - 0.55, wsHW * 0.93],
    [wsX1 + 0.42, wsHW * 0.86],
  ];
  fillPoly(
    ctx,
    wsInner,
    createGlassGradient(ctx, wsX1, -wsHW, wsX2, wsHW, g.isNewBusiness ? 'blue' : 'green'),
    deform
  );

  // Subtle cabin dashboard, steering wheel & seats visible through windshield
  drawCabinInteriorHint(ctx, wsX2 - 1.35, wsX1 - 1.6, wsHW * 0.86, deform, {
    driverY: -wsHW * 0.44,
    dualFrontSeats: true,
    wheelRadius: 1.35,
  });

  // Glossy diagonal sky reflection glint on windshield
  drawGlassGlint(ctx, wsX1 + 0.5, -wsHW * 0.84, wsX2 - 0.45, wsHW * 0.84, 0.16, deform);

  // Dual animated windshield wipers (directly integrated on model, driven by car.wiperAngle)
  const wAng = car.wiperAngle || 0;
  const sweep = Math.sin(wAng) * 0.9;
  for (const pivotY of [-3.3, 1.5]) {
    const px = wsX2 - 0.15;
    const armLen = 3.85;
    const baseAngle = Math.PI * 0.56 + sweep * 0.58;
    const bx = px - Math.sin(baseAngle) * 2.25;
    const by = pivotY + Math.cos(baseAngle) * armLen;
    strokePoly(ctx, [[px, pivotY], [bx, by]], '#090d14', 0.65, deform);
    strokePoly(ctx, [[bx - 0.35, by - 1.4], [bx + 0.35, by + 1.4]], '#1e293b', 0.55, deform);
  }

  // --- C & D. SIDE WINDOWS & STAMPED CAB ROOF (SKIP FOR INTEGRAL ЦМФ BODIES — HANDLED BY renderGazelleIntegralUpper) ---
  const roofX1 = cabRearX + 0.75;
  const roofX2 = wsX1 + 0.25;
  const roofHW = cabinW * 0.455;

  if (!g.isIntegral) {
    // Side window glass bands tucked between cab shoulder and roof edge
    for (const side of [-1, 1] as const) {
      const syOut = side * (cabHW - 0.55);
      const syIn = side * (roofHW - 0.15);
      const frontWinX1 = g.isFermer ? (roofX2 - 8.2) : (roofX1 + 1.1);
      const frontWinX2 = roofX2 - 0.5;
      fillPoly(
        ctx,
        [
          [frontWinX1, syIn],
          [frontWinX2, syIn],
          [wsX2 - 0.9, syOut],
          [frontWinX1 + 0.35, syOut],
        ],
        createGlassGradient(ctx, frontWinX1, syIn, frontWinX2, syOut, 'smoke'),
        deform,
        '#090d16',
        0.38
      );

      // Front door handle & vertical door shutline
      strokePoly(ctx, [[frontWinX1 - 0.2, side * cabHW], [frontWinX1 - 0.2, side * roofHW]], 'rgba(15,23,42,0.55)', 0.5, deform);
      drawRoundedBox(
        ctx,
        frontWinX1 + 0.4,
        side * (cabHW - 0.45) - 0.22,
        frontWinX1 + 2.0,
        side * (cabHW - 0.45) + 0.22,
        0.16,
        '#111827',
        deform
      );

      // Fermer double cab second-row windows & asymmetric right rear passenger door
      if (g.isFermer) {
        const rearWinX1 = roofX1 + 1.2;
        const rearWinX2 = frontWinX1 - 1.1;
        fillPoly(
          ctx,
          [
            [rearWinX1, syIn],
            [rearWinX2, syIn],
            [rearWinX2 - 0.2, syOut],
            [rearWinX1 + 0.2, syOut],
          ],
          createGlassGradient(ctx, rearWinX1, syIn, rearWinX2, syOut, 'smoke'),
          deform,
          '#090d16',
          0.38
        );
        if (side > 0) {
          strokePoly(ctx, [[rearWinX1 - 0.3, side * cabHW], [rearWinX1 - 0.3, side * roofHW]], 'rgba(15,23,42,0.55)', 0.5, deform);
          drawRoundedBox(
            ctx,
            rearWinX1 + 0.4,
            side * (cabHW - 0.45) - 0.22,
            rearWinX1 + 1.9,
            side * (cabHW - 0.45) + 0.22,
            0.16,
            '#111827',
            deform
          );
        }
      }
    }

    // Rear cab window strip (visible on bare frame, flatbed, tow, tipper)
    drawRoundedBox(
      ctx,
      cabRearX + 0.12,
      -roofHW * 0.72,
      roofX1 + 0.2,
      roofHW * 0.72,
      0.25,
      '#0f172a',
      deform,
      '#334155',
      0.32
    );

    // Stamped Steel Cab Roof
    const roofColor = car.roofColor && g.body.id !== 'body_gazelle_utility' && g.body.id !== 'body_gazelle_med_module' ? car.roofColor : cabColor;
    drawBoxShadow(ctx, roofX1, -roofHW, roofX2, roofHW, 1.35, -0.4, 0.45, 0.26, deform);
    drawRoundedBox(
      ctx,
      roofX1,
      -roofHW,
      roofX2,
      roofHW,
      1.35,
      createRoofGradient(ctx, roofHW, roofColor),
      deform,
      shadePaint(roofColor, -0.40),
      0.6
    );

    // Drip rails along roof edges
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[roofX1 + 0.8, side * (roofHW - 0.22)], [roofX2 - 0.8, side * (roofHW - 0.22)]], '#1e293b', 0.42, deform);
    }

    // Authentic stamped roof stiffening ribs (5 classic ribs on old, 3 sleek channels on Business)
    const ribYs = g.isNewBusiness
      ? [-roofHW * 0.52, 0, roofHW * 0.52]
      : [-roofHW * 0.64, -roofHW * 0.32, 0, roofHW * 0.32, roofHW * 0.64];
    for (const ry of ribYs) {
      strokePoly(ctx, [[roofX1 + 1.1, ry], [roofX2 - 1.1, ry]], 'rgba(15,23,42,0.22)', 0.5, deform);
      strokePoly(ctx, [[roofX1 + 1.1, ry - 0.35], [roofX2 - 1.1, ry - 0.35]], 'rgba(255,255,255,0.22)', 0.32, deform);
    }

    // Roof vent hatch on Fermer 6-seat crew cab
    if (g.isFermer) {
      drawRoundedBox(
        ctx,
        roofX1 + 2.2,
        -2.6,
        roofX1 + 6.0,
        2.6,
        0.55,
        shadePaint(roofColor, 0.08),
        deform,
        '#1e293b',
        0.45
      );
      drawRoundedBox(ctx, roofX1 + 2.7, -2.0, roofX1 + 5.5, 2.0, 0.35, '#1e293b', deform);
    }

    // Front roof clearance / road-train markers
    drawRoadTrainMarkers(
      ctx,
      roofX2 - 0.72,
      [-roofHW * 0.58, 0, roofHW * 0.58],
      optics.roadTrainOn,
      deform
    );

    // Whip radio antenna on left A-pillar/roof corner
    strokePoly(ctx, [[roofX2 - 1.2, -roofHW + 0.9], [roofX2 - 5.2, -roofHW - 0.2]], '#1e293b', 0.35, deform);
  }

  // --- E. SIDE MIRRORS (OLD TUBULAR COMMERCIAL vs NEW BUSINESS AERO WITH LED REPEATERS) ---
  const mirrorBaseX = wsX2 - 1.2;
  for (const side of [-1, 1] as const) {
    const turnInt = side < 0 ? optics.leftTurn : optics.rightTurn;
    if (!g.isNewBusiness) {
      // Classic old GAZelle tubular steel U-bracket + vertical black rectangular commercial mirror
      const tipX = mirrorBaseX + 1.15;
      const tipY = side * (cabHW + 2.1);
      strokePoly(
        ctx,
        [
          [mirrorBaseX - 1.1, side * (cabHW - 0.2)],
          [tipX, tipY],
          [mirrorBaseX + 1.3, side * (cabHW - 0.2)],
        ],
        '#0f172a',
        0.65,
        deform
      );
      drawRoundedBox(
        ctx,
        tipX - 0.95,
        tipY - 1.15,
        tipX + 0.95,
        tipY + 1.15,
        0.32,
        '#111827',
        deform,
        '#334155',
        0.38
      );
      // Mirror glass sliver edge
      strokePoly(ctx, [[tipX - 0.65, tipY - 0.75], [tipX - 0.65, tipY + 0.75]], '#94a3b8', 0.35, deform);
    } else {
      // New GAZelle Business aerodynamic dual-section wide mirrors with live LED amber turn repeaters
      const tipX = mirrorBaseX + 1.25;
      const tipY = side * (cabHW + 2.25);
      // Aerodynamic fairing stalk
      fillPoly(
        ctx,
        [
          [mirrorBaseX - 0.6, side * (cabHW - 0.3)],
          [mirrorBaseX + 1.1, side * (cabHW - 0.3)],
          [tipX + 0.5, tipY - side * 0.45],
          [tipX - 0.5, tipY - side * 0.45],
        ],
        '#111827',
        deform,
        '#020617',
        0.35
      );
      // Sculpted rounded-aero Business mirror shell
      drawRoundedBox(
        ctx,
        tipX - 1.15,
        tipY - 1.35,
        tipX + 1.15,
        tipY + 1.35,
        0.55,
        '#1e242e',
        deform,
        '#090d14',
        0.42
      );
      // Live amber LED turn-signal repeater strip along front leading edge
      const ledColor = turnInt > 0.08
        ? `rgba(251,191,36,${(0.62 + 0.38 * turnInt).toFixed(2)})`
        : 'rgba(203,213,225,0.52)';
      strokePoly(
        ctx,
        [
          [tipX + 0.9, tipY - 0.95],
          [tipX + 0.9, tipY + 0.95],
        ],
        ledColor,
        0.52,
        deform
      );
    }
  }

  // --- F. ROOF WIND FAIRING, BEACON OR EMERGENCY LIGHTBAR ---
  const nowSec = performance.now() * 0.001;
  if (!g.isIntegral) {
    if (g.body.id === 'body_gazelle_tent') {
      const fairPts: Pt[] = [
        [roofX1 - 0.15, -roofHW * 0.94],
        [roofX2 - 1.4, -roofHW * 0.72],
        [roofX2 - 0.65, 0],
        [roofX2 - 1.4, roofHW * 0.72],
        [roofX1 - 0.15, roofHW * 0.94],
      ];
      fillPoly(
        ctx,
        fairPts,
        createRoofGradient(ctx, roofHW, '#f8fafc'),
        deform,
        '#475569',
        0.55
      );
      strokePoly(ctx, [[roofX1 + 0.6, -roofHW * 0.5], [roofX2 - 1.8, -roofHW * 0.38]], 'rgba(15,23,42,0.16)', 0.4, deform);
      strokePoly(ctx, [[roofX1 + 0.6, roofHW * 0.5], [roofX2 - 1.8, roofHW * 0.38]], 'rgba(15,23,42,0.16)', 0.4, deform);
    } else if (g.body.id === 'body_gazelle_tow') {
      const barX = roofX1 + 2.2;
      const barLit = optics.sirenOn || optics.ignitionOn || optics.leftTurn > 0.1 || optics.rightTurn > 0.1;
      drawRoundedBox(ctx, barX - 1.25, -5.6, barX + 1.25, 5.6, 0.55, '#0f172a', deform, '#334155', 0.4);
      drawRoundedBox(ctx, barX - 0.95, -5.2, barX + 0.95, -1.6, 0.35, barLit ? '#f59e0b' : '#b45309', deform);
      drawRoundedBox(ctx, barX - 0.95, 1.6, barX + 0.95, 5.2, 0.35, barLit ? '#f59e0b' : '#b45309', deform);
      drawRoundedBox(ctx, barX - 0.95, -1.4, barX + 0.95, 1.4, 0.25, '#e2e8f0', deform);
      if (barLit) {
        const pulse = Math.sin(nowSec * 16) > 0;
        drawDeformedDot(ctx, barX, pulse ? -3.4 : 3.4, 1.05, '#fef9c3', deform);
      }
    } else if (g.body.id === 'body_gazelle_utility') {
      drawAmberBeacon(ctx, roofX1 + 2.6, 0, 1.55, optics.sirenOn || optics.ignitionOn, deform, nowSec);
    } else if (g.body.id === 'body_gazelle_med_module') {
      // Full-width red/blue SGU emergency LED bar mounted on ambulance cab roof
      drawGazelleEmergencyLightbar(
        ctx,
        roofX2 - 1.8,
        roofHW * 0.78,
        optics.sirenOn,
        optics.sirenStrobe,
        deform,
        2.5
      );
    }
  }
}

// ============================================================================
// 5. ALL 8 GAZELLE SUPERSTRUCTURES (WITH INTEGRATED REAR LAMPS & HARDWARE)
// ============================================================================

function drawBodyRearLightsAndBumper(
  ctx: CanvasRenderingContext2D,
  bx1: number,
  bodyHW: number,
  optics: LiveOpticsState,
  deform: DeformFn
): void {
  // Rear steel underrun protection bar & rubber dock bumpers
  drawRoundedBox(ctx, bx1 - 0.75, -bodyHW + 0.5, bx1 + 0.35, bodyHW - 0.5, 0.28, '#1e293b', deform, '#090d14', 0.42);
  drawRoundedBox(ctx, bx1 - 0.95, -bodyHW + 1.1, bx1 - 0.15, -bodyHW + 2.2, 0.2, '#0f172a', deform);
  drawRoundedBox(ctx, bx1 - 0.95, bodyHW - 2.2, bx1 - 0.15, bodyHW - 1.1, 0.2, '#0f172a', deform);
  // Rear license plate
  drawRoundedBox(ctx, bx1 - 0.82, -1.9, bx1 - 0.25, 1.9, 0.15, '#f8fafc', deform, '#0f172a', 0.28);

  // Integrated live GAZelle multi-chamber rear taillight blocks
  for (const side of [-1, 1] as const) {
    const ly1 = side < 0 ? -(bodyHW - 0.85) : bodyHW - 4.45;
    const ly2 = side < 0 ? -(bodyHW - 4.45) : bodyHW - 0.85;
    drawIntegratedTaillight(
      ctx,
      bx1 - 0.85,
      ly1,
      bx1 + 0.25,
      ly2,
      side,
      optics.positionOn,
      optics.braking,
      optics.reversing,
      side < 0 ? optics.leftTurn : optics.rightTurn,
      optics.rearFogOn,
      side < 0 ? optics.leftTailBroken : optics.rightTailBroken,
      deform
    );
  }
}

function renderGazelleSuperstructure(
  vCtx: VehicleRenderContext,
  g: GazelleResolved,
  optics: LiveOpticsState
): void {
  if (g.body.id === 'body_none') return;

  const { ctx, car, halfL, halfW, rc, cabinX, cabinL, deform } = vCtx;
  const cabRearX = cabinX - cabinL * 0.5 - 0.35;
  const bx2 = cabRearX - 0.9;
  const bx1 = -halfL + rc + 0.65;
  if (bx2 - bx1 < 8) return;

  const bodyHW = halfW + 0.35;
  const bId = g.body.id;

  // Drop shadow of superstructure onto chassis rails & rear wheels
  drawBoxShadow(ctx, bx1, -bodyHW, bx2, bodyHW, 0.85, -0.5, 0.6, 0.34, deform);

  // --------------------------------------------------------------------------
  // 1. БОРТОВАЯ ПЛАТФОРМА ГАЗ-3302 (body_gazelle_flatbed)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_flatbed') {
    // Rear lights & underrun bumper underneath rear sill
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Outer steel sideboard frame (silver-gray metallic steel sides)
    const sideColor = '#64748b';
    drawRoundedBox(ctx, bx1, -bodyHW, bx2, bodyHW, 0.55, sideColor, deform, '#1e293b', 0.65);

    // Inner weathered wood/plywood cargo deck
    const wallT = 1.25;
    drawWoodPlankDeck(ctx, bx1 + wallT, -bodyHW + wallT, bx2 - wallT, bodyHW - wallT, 1.9, '#8c6239', deform);

    // Cargo tie-down rings in 4 corners
    for (const tx of [bx1 + 2.8, bx2 - 2.8]) {
      for (const ty of [-bodyHW + 2.4, bodyHW - 2.4]) {
        drawDeformedDot(ctx, tx, ty, 0.42, '#cbd5e1', deform, '#0f172a', 0.28);
      }
    }

    // Front protective bulkhead behind cab with mesh window guard
    drawRoundedBox(ctx, bx2 - wallT - 0.25, -bodyHW, bx2 + 0.15, bodyHW, 0.3, '#334155', deform, '#0f172a', 0.5);
    strokePoly(ctx, [[bx2 - 0.5, -bodyHW + 2.2], [bx2 - 0.5, bodyHW - 2.2]], '#94a3b8', 0.55, deform);

    // Sideboard hinge latches & corner locks
    const hingeCount = Math.max(3, Math.round((bx2 - bx1) / 8));
    for (let i = 0; i <= hingeCount; i++) {
      const hx = bx1 + 1.4 + (i / hingeCount) * (bx2 - bx1 - 2.8);
      for (const side of [-1, 1] as const) {
        drawRoundedBox(ctx, hx - 0.4, side * (bodyHW + 0.15) - 0.32, hx + 0.4, side * (bodyHW + 0.15) + 0.32, 0.15, '#1e293b', deform);
      }
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 2. ЕВРОТЕНТ «ЕВРОФУРГОН» (body_gazelle_tent)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_tent') {
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Steel base skirt beneath PVC tarpaulin
    drawRoundedBox(ctx, bx1, -bodyHW - 0.1, bx2, bodyHW + 0.1, 0.55, '#334155', deform, '#0f172a', 0.55);

    // Heavy industrial gray-blue PVC tarpaulin canopy with arched crown shading
    const tarpColor = '#64748b';
    const tarpGrad = createCylindricalGradient(ctx, -bodyHW, bodyHW, tarpColor, 0.26);
    drawRoundedBox(ctx, bx1 + 0.35, -bodyHW + 0.15, bx2 - 0.2, bodyHW - 0.15, 0.75, tarpGrad, deform, '#1e293b', 0.6);

    // Transverse steel bow ribs pressing up under canvas + subtle fabric wrinkles
    const bowStep = 4.6;
    for (let rx = bx1 + 3.2; rx < bx2 - 2.0; rx += bowStep) {
      strokePoly(ctx, [[rx, -bodyHW + 0.55], [rx, bodyHW - 0.55]], 'rgba(248,250,252,0.22)', 0.65, deform);
      strokePoly(ctx, [[rx + 0.55, -bodyHW + 0.55], [rx + 0.55, bodyHW - 0.55]], 'rgba(15,23,42,0.24)', 0.52, deform);
      // Side tie-down grommets & lacing cord
      for (const side of [-1, 1] as const) {
        drawDeformedDot(ctx, rx, side * (bodyHW - 0.25), 0.26, '#e2e8f0', deform, '#0f172a', 0.22);
      }
    }

    // Rear swing barn doors top edge & twin vertical locking bar cams
    drawRoundedBox(ctx, bx1, -bodyHW + 0.2, bx1 + 0.95, bodyHW - 0.2, 0.2, '#cbd5e1', deform, '#1e293b', 0.4);
    for (const ly of [-3.2, -1.0, 1.0, 3.2]) {
      drawDeformedDot(ctx, bx1 + 0.25, ly, 0.34, '#334155', deform, '#0f172a', 0.22);
    }
    // Upper rear corner red clearance markers
    for (const side of [-1, 1] as const) {
      drawDeformedDot(ctx, bx1 + 0.35, side * (bodyHW - 0.8), 0.42, optics.positionOn ? '#ef4444' : '#7f1d1d', deform);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 3. ИЗОТЕРМИЧЕСКИЙ ФУРГОН «СЭНДВИЧ» + РЕФРИЖЕРАТОР (body_gazelle_box_iso)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_box_iso') {
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Crisp white insulated sandwich-panel box with anodized aluminum corner extrusions
    const boxGrad = createRoofGradient(ctx, bodyHW, '#f1f5f9');
    drawRoundedBox(ctx, bx1, -bodyHW, bx2, bodyHW, 0.5, boxGrad, deform, '#475569', 0.65);

    // Aluminum perimeter edge trim & corner caps
    strokePoly(ctx, [[bx1 + 0.55, -bodyHW + 0.55], [bx2 - 0.55, -bodyHW + 0.55]], '#94a3b8', 0.65, deform);
    strokePoly(ctx, [[bx1 + 0.55, bodyHW - 0.55], [bx2 - 0.55, bodyHW - 0.55]], '#94a3b8', 0.65, deform);
    strokePoly(ctx, [[bx1 + 0.55, -bodyHW + 0.55], [bx1 + 0.55, bodyHW - 0.55]], '#94a3b8', 0.65, deform);
    strokePoly(ctx, [[bx2 - 0.55, -bodyHW + 0.55], [bx2 - 0.55, bodyHW - 0.55]], '#94a3b8', 0.65, deform);

    // Subtle sandwich-panel roof seam joints
    for (let sx = bx1 + 6.5; sx < bx2 - 4.0; sx += 7.5) {
      strokePoly(ctx, [[sx, -bodyHW + 0.7], [sx, bodyHW - 0.7]], 'rgba(100,116,139,0.28)', 0.42, deform);
    }

    // Refrigeration condenser unit (Элинж / Thermo King) protruding on front bulkhead above cab
    drawRoundedBox(ctx, bx2 - 1.8, -4.4, bx2 + 1.55, 4.4, 0.7, '#f8fafc', deform, '#334155', 0.5);
    // Condenser fan grille & blue/cyan refrigeration accent stripe
    drawRoundedBox(ctx, bx2 - 1.2, -3.4, bx2 + 0.85, 3.4, 0.4, '#1e293b', deform);
    drawDeformedDot(ctx, bx2 - 0.15, -1.65, 1.05, '#334155', deform, '#64748b', 0.3);
    drawDeformedDot(ctx, bx2 - 0.15, 1.65, 1.05, '#334155', deform, '#64748b', 0.3);
    strokePoly(ctx, [[bx2 + 1.15, -3.5], [bx2 + 1.15, 3.5]], '#0284c7', 0.55, deform);

    // Rear stainless steel door hinges & corner clearance markers
    for (const side of [-1, 1] as const) {
      drawDeformedDot(ctx, bx1 + 0.35, side * (bodyHW - 0.75), 0.42, optics.positionOn ? '#ef4444' : '#7f1d1d', deform);
      drawDeformedDot(ctx, bx2 - 0.35, side * (bodyHW - 0.75), 0.42, optics.positionOn ? '#f8fafc' : '#94a3b8', deform);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 4. ХЛЕБНЫЙ ФУРГОН «ХЛЕБ» (body_gazelle_bread)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_bread') {
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Warm cream/beige insulated aluminum bread-van body
    const breadBase = '#f3ead8';
    drawRoundedBox(ctx, bx1, -bodyHW, bx2, bodyHW, 0.45, createRoofGradient(ctx, bodyHW, breadBase), deform, '#78350f', 0.62);

    // Corrugated aluminum roof ribs
    drawCorrugatedDeck(ctx, bx1 + 0.9, -bodyHW + 0.8, bx2 - 0.9, bodyHW - 0.8, 3.4, 'transverse', deform, 0.22, 0.14);

    // Classic brown bakery livery accent stripes along both sides
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[bx1 + 0.6, side * (bodyHW - 0.55)], [bx2 - 0.6, side * (bodyHW - 0.55)]], '#92400e', 0.95, deform);
      // 4 side tray-compartment bay door handles on right side (side > 0)
      if (side > 0) {
        const bayCount = 4;
        for (let bi = 0; bi < bayCount; bi++) {
          const dX = bx1 + 1.2 + ((bi + 0.5) / bayCount) * (bx2 - bx1 - 2.4);
          drawRoundedBox(ctx, dX - 0.6, bodyHW - 0.25, dX + 0.6, bodyHW + 0.25, 0.15, '#1e293b', deform);
        }
      }
    }

    // Two classic bread-van roof mushroom ventilator cowls
    const ventX1 = bx1 + (bx2 - bx1) * 0.30;
    const ventX2 = bx1 + (bx2 - bx1) * 0.70;
    for (const vx of [ventX1, ventX2]) {
      drawDeformedDot(ctx, vx, 0, 1.55, '#cbd5e1', deform, '#475569', 0.45);
      drawDeformedDot(ctx, vx, 0, 0.65, '#64748b', deform);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 5. САМОСВАЛ ГАЗ-САЗ-3512 (body_gazelle_tipper)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_tipper') {
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Heavy welded steel dump bed (industrial steel blue-gray / cab color tinted)
    const dumpColor = shadePaint(car.color || '#475569', -0.15);
    drawRoundedBox(ctx, bx1, -bodyHW, bx2, bodyHW, 0.4, dumpColor, deform, '#0f172a', 0.72);

    // Recessed ribbed steel cargo floor
    const wallT = 1.45;
    drawRoundedBox(ctx, bx1 + wallT, -bodyHW + wallT, bx2 - wallT, bodyHW - wallT, 0.25, '#334155', deform, '#0f172a', 0.45);
    drawCorrugatedDeck(ctx, bx1 + wallT + 0.5, -bodyHW + wallT + 0.5, bx2 - wallT - 0.5, bodyHW - wallT - 0.5, 2.8, 'transverse', deform, 0.14, 0.26);

    // Heavy external structural side stiffener ribs
    for (let rx = bx1 + 3.2; rx < bx2 - 2.2; rx += 4.2) {
      for (const side of [-1, 1] as const) {
        drawRoundedBox(ctx, rx - 0.45, side * (bodyHW - 1.5), rx + 0.45, side * (bodyHW + 0.2), 0.15, shadePaint(dumpColor, 0.12), deform, '#0f172a', 0.35);
      }
    }

    // Protective steel cab-over visor canopy (козырёк)
    drawRoundedBox(ctx, bx2 - 0.6, -bodyHW + 0.2, bx2 + 3.2, bodyHW - 0.2, 0.4, shadePaint(dumpColor, 0.08), deform, '#0f172a', 0.55);
    // Reinforced rear swinging tailgate pivot pins
    for (const side of [-1, 1] as const) {
      drawDeformedDot(ctx, bx1 + 0.45, side * (bodyHW - 0.65), 0.5, '#cbd5e1', deform, '#0f172a', 0.3);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 6. ЭВАКУАТОР С ЛОМАНОЙ ПЛАТФОРМОЙ И ЛЕБЁДКОЙ (body_gazelle_tow)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_tow') {
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Steel flatbed recovery deck with yellow/black chevron edge striping
    const towBase = '#334155';
    drawRoundedBox(ctx, bx1, -bodyHW - 0.2, bx2 + 0.3, bodyHW + 0.2, 0.45, towBase, deform, '#0f172a', 0.65);

    // Side safety rails with yellow/black hazard marking
    for (const side of [-1, 1] as const) {
      const sy = side * (bodyHW - 0.45);
      strokePoly(ctx, [[bx1 + 0.6, sy], [bx2 - 0.3, sy]], '#f59e0b', 1.15, deform);
      for (let cx = bx1 + 1.8; cx < bx2 - 1.2; cx += 3.6) {
        strokePoly(ctx, [[cx, sy], [cx + 1.4, sy]], '#0f172a', 1.15, deform);
      }
    }

    // Two perforated galvanized wheel-track channels + central steel sheet
    const trackIn = 2.4;
    const trackOut = bodyHW - 1.35;
    for (const side of [-1, 1] as const) {
      const ty1 = side < 0 ? -trackOut : trackIn;
      const ty2 = side < 0 ? -trackIn : trackOut;
      drawTreadplateSurface(ctx, bx1 + 0.6, ty1, bx2 - 2.6, ty2, '#475569', deform, 2.3);
    }

    // Sloped beaver-tail rear break line & stowed pull-out aluminum loading ramps
    const breakX = bx1 + 5.8;
    strokePoly(ctx, [[breakX, -bodyHW + 0.8], [breakX, bodyHW - 0.8]], '#0f172a', 0.75, deform);
    for (const side of [-1, 1] as const) {
      const ry1 = side < 0 ? -trackOut + 0.5 : trackIn + 0.5;
      const ry2 = side < 0 ? -trackIn - 0.5 : trackOut - 0.5;
      drawRoundedBox(ctx, bx1 - 0.4, ry1, bx1 + 1.6, ry2, 0.2, '#94a3b8', deform, '#1e293b', 0.35);
    }

    // Front steel headache rack + 4.5t electric recovery winch drum & steel cable hook
    drawRoundedBox(ctx, bx2 - 2.4, -bodyHW + 0.5, bx2 + 0.2, bodyHW - 0.5, 0.35, '#1e293b', deform, '#090d14', 0.5);
    // Electric winch motor & spooled steel cable drum
    drawRoundedBox(ctx, bx2 - 2.1, -2.5, bx2 - 0.2, 2.5, 0.4, '#0f172a', deform, '#64748b', 0.4);
    drawRoundedBox(ctx, bx2 - 1.8, -1.4, bx2 - 0.5, 1.4, 0.25, '#94a3b8', deform);
    // Spooled cable & red tow hook
    strokePoly(ctx, [[bx2 - 2.1, 0], [bx2 - 5.5, 0]], '#cbd5e1', 0.42, deform);
    drawDeformedDot(ctx, bx2 - 5.8, 0, 0.55, '#dc2626', deform, '#0f172a', 0.28);
    // Two rear-facing LED work floodlights on headache rack
    for (const wy of [-4.6, 4.6]) {
      drawRoundedBox(ctx, bx2 - 1.4, wy - 0.65, bx2 - 0.4, wy + 0.65, 0.2, optics.headlightsOn ? '#e0f2fe' : '#64748b', deform, '#0f172a', 0.28);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 7. АВАРИЙНО-РЕМОНТНАЯ МАСТЕРСКАЯ «АВМ / ГАЗ» (body_gazelle_utility)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_utility') {
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // High-visibility municipal yellow steel workshop van body
    drawRoundedBox(ctx, bx1, -bodyHW, bx2, bodyHW, 0.55, createRoofGradient(ctx, bodyHW, '#eab308'), deform, '#713f12', 0.65);

    // Red reflective emergency perimeter stripes
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[bx1 + 0.6, side * (bodyHW - 0.55)], [bx2 - 0.6, side * (bodyHW - 0.55)]], '#dc2626', 1.0, deform);
    }
    strokePoly(ctx, [[bx1 + 0.55, -bodyHW + 0.7], [bx1 + 0.55, bodyHW - 0.7]], '#dc2626', 0.9, deform);

    // Heavy tubular roof expedition rack
    const rackX1 = bx1 + 1.4;
    const rackX2 = bx2 - 1.4;
    const rackHW = bodyHW - 1.45;
    strokePoly(
      ctx,
      [
        [rackX1, -rackHW],
        [rackX2, -rackHW],
        [rackX2, rackHW],
        [rackX1, rackHW],
      ],
      '#1e293b',
      0.8,
      deform,
      true
    );
    for (let rx = rackX1 + 3.4; rx < rackX2 - 1.5; rx += 3.8) {
      strokePoly(ctx, [[rx, -rackHW], [rx, rackHW]], '#334155', 0.5, deform);
    }

    // Aluminum extension ladder strapped to left half of roof rack
    const ladY1 = -rackHW + 0.85;
    const ladY2 = -1.1;
    strokePoly(ctx, [[rackX1 + 0.4, ladY1], [rackX2 - 0.4, ladY1]], '#e2e8f0', 0.65, deform);
    strokePoly(ctx, [[rackX1 + 0.4, ladY2], [rackX2 - 0.4, ladY2]], '#e2e8f0', 0.65, deform);
    for (let lx = rackX1 + 1.4; lx < rackX2 - 1.0; lx += 1.9) {
      strokePoly(ctx, [[lx, ladY1], [lx, ladY2]], '#cbd5e1', 0.38, deform);
    }

    // Oxygen (blue) & propane (red) welding cylinders + pipe storage tube on right half of rack
    drawRoundedBox(ctx, rackX1 + 1.8, 1.2, rackX2 - 2.6, 3.1, 0.85, '#0284c7', deform, '#0f172a', 0.4);
    drawRoundedBox(ctx, rackX1 + 1.8, 3.7, rackX2 - 2.6, 5.6, 0.85, '#dc2626', deform, '#0f172a', 0.4);
    drawRoundedBox(ctx, rackX1 + 0.6, 6.2, rackX2 - 0.6, 7.6, 0.55, '#64748b', deform, '#0f172a', 0.38);

    // Rear corner amber warning flasher
    const nowSec = performance.now() * 0.001;
    drawAmberBeacon(ctx, bx1 + 1.8, 0, 1.1, optics.sirenOn || optics.ignitionOn, deform, nowSec + 1.2);
    return;
  }

  // --------------------------------------------------------------------------
  // 8. ТЕРМОЦИСТЕРНА АЦПТ-1.5 «МОЛОКО / ВОДА» (body_gazelle_tanker_milk)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_tanker_milk') {
    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Tanker subframe cradle & side walkways
    drawRoundedBox(ctx, bx1 + 0.6, -bodyHW + 0.3, bx2 - 0.4, bodyHW - 0.3, 0.5, '#334155', deform, '#0f172a', 0.55);

    // Left-side anti-slip inspection catwalk
    drawTreadplateSurface(ctx, bx1 + 1.8, -bodyHW + 0.6, bx2 - 1.6, -bodyHW + 2.6, '#475569', deform, 2.0);
    // Right-side food-grade discharge hose tube
    drawRoundedBox(ctx, bx1 + 1.8, bodyHW - 2.3, bx2 - 1.8, bodyHW - 0.8, 0.55, '#94a3b8', deform, '#1e293b', 0.4);

    // Insulated elliptical stainless-steel / white food-grade milk/water tank barrel
    const tankX1 = bx1 + 2.6;
    const tankX2 = bx2 - 1.0;
    const tankHW = bodyHW - 2.65;
    const tankGrad = createCylindricalGradient(ctx, -tankHW, tankHW, '#e2e8f0', 0.42);
    drawRoundedBox(ctx, tankX1, -tankHW, tankX2, tankHW, 3.2, tankGrad, deform, '#475569', 0.62);

    // Stainless clamping bands & blue hygienic accent stripe
    for (const bandFrac of [0.22, 0.5, 0.78]) {
      const bandX = tankX1 + (tankX2 - tankX1) * bandFrac;
      strokePoly(ctx, [[bandX, -tankHW + 0.25], [bandX, tankHW - 0.25]], '#64748b', 0.85, deform);
      strokePoly(ctx, [[bandX + 0.35, -tankHW + 0.35], [bandX + 0.35, tankHW - 0.35]], '#f8fafc', 0.35, deform);
    }

    // Central thermal filler dome hatch with locking dog bolts
    const domeX = (tankX1 + tankX2) * 0.5;
    drawDeformedDot(ctx, domeX, 0, 2.55, '#cbd5e1', deform, '#334155', 0.55);
    drawDeformedDot(ctx, domeX, 0, 1.7, '#f8fafc', deform, '#475569', 0.4);
    for (let bi = 0; bi < 4; bi++) {
      const ba = (bi / 4) * Math.PI * 2 + Math.PI * 0.25;
      drawDeformedDot(ctx, domeX + Math.cos(ba) * 2.1, Math.sin(ba) * 2.1, 0.3, '#0f172a', deform);
    }

    // Rear insulated valve/pump compartment box at tail of tank
    drawRoundedBox(ctx, bx1 + 0.2, -4.4, tankX1 + 0.4, 4.4, 0.45, '#f1f5f9', deform, '#334155', 0.5);
    strokePoly(ctx, [[bx1 + 0.55, -3.5], [bx1 + 0.55, 3.5]], '#0284c7', 0.6, deform);
    return;
  }

  // --------------------------------------------------------------------------
  // 9. МОДУЛЬНЫЙ СПЕЦМЕДБЛОК КЛАССА С (body_gazelle_med_module)
  // --------------------------------------------------------------------------
  if (bId === 'body_gazelle_med_module') {
    if (car.isPlayerInsideSaloon) {
      // Cutaway upper rim framing around open Pass-1 interior (rear lights & floor already drawn in Pass 1)
      const wallT = 0.85;
      drawRoundedBox(ctx, bx1, -bodyHW, bx2, -bodyHW + wallT, 0.2, '#f8fafc', deform, '#475569', 0.45);
      drawRoundedBox(ctx, bx1, bodyHW - wallT, bx2, bodyHW, 0.2, '#f8fafc', deform, '#475569', 0.45);
      drawRoundedBox(ctx, bx2 - wallT, -bodyHW, bx2, bodyHW, 0.2, '#f8fafc', deform, '#475569', 0.45);
      // Red perimeter stripe on thin cutaway rails + front header repeater LEDs
      for (const side of [-1, 1] as const) {
        strokePoly(ctx, [[bx1 + 0.4, side * (bodyHW - 0.42)], [bx2 - 0.4, side * (bodyHW - 0.42)]], '#dc2626', 0.48, deform);
        const flash = optics.sirenOn && (side < 0 ? Math.sin(optics.sirenStrobe) > 0 : Math.sin(optics.sirenStrobe) <= 0);
        drawRoundedBox(
          ctx,
          bx2 - 1.1,
          side * (bodyHW - 2.2) - 0.6,
          bx2 - 0.2,
          side * (bodyHW - 2.2) + 0.6,
          0.18,
          flash ? (side < 0 ? '#ff3333' : '#38bdf8') : (side < 0 ? '#7f1d1d' : '#1e3a8a'),
          deform
        );
      }
      return;
    }

    drawBodyRearLightsAndBumper(ctx, bx1, bodyHW, optics, deform);

    // Crisp white insulated square Class-C medical module box
    drawRoundedBox(ctx, bx1, -bodyHW, bx2, bodyHW, 0.55, createRoofGradient(ctx, bodyHW, '#f8fafc'), deform, '#475569', 0.68);
    // Anodized perimeter aluminum trim & red emergency stripes
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[bx1 + 0.6, side * (bodyHW - 0.55)], [bx2 - 0.6, side * (bodyHW - 0.55)]], '#dc2626', 0.95, deform);
      // Side flood scene lights
      drawRoundedBox(
        ctx,
        (bx1 + bx2) * 0.5 - 3.2,
        side * (bodyHW - 0.15) - 0.28,
        (bx1 + bx2) * 0.5 + 3.2,
        side * (bodyHW - 0.15) + 0.28,
        0.14,
        optics.sirenOn ? '#e0f2fe' : '#cbd5e1',
        deform,
        '#1e293b',
        0.2
      );
    }
    strokePoly(ctx, [[bx1 + 0.6, -bodyHW + 0.65], [bx1 + 0.6, bodyHW - 0.65]], '#dc2626', 0.85, deform);

    // Central roof Red Cross emblem + medical HVAC unit + rear beacons
    const boxMidX = (bx1 + bx2) * 0.5;
    drawMedicalCrossEmblem(ctx, boxMidX - 1.5, 0, 2.9, deform, '#dc2626', '#ffffff');

    // Roof medical HVAC climate pod behind cab overhang
    drawBoxShadow(ctx, bx2 - 6.8, -4.4, bx2 - 1.4, 4.4, 0.65, -0.55, 0.55, 0.24, deform);
    drawRoundedBox(ctx, bx2 - 6.8, -4.4, bx2 - 1.4, 4.4, 0.65, '#e2e8f0', deform, '#475569', 0.45);
    drawRoundedBox(ctx, bx2 - 5.6, -2.8, bx2 - 2.6, 2.8, 0.35, '#1e293b', deform);

    // Front module corner red/blue repeaters + rear blue corner beacons
    for (const side of [-1, 1] as const) {
      const fFlash = optics.sirenOn && (side < 0 ? Math.sin(optics.sirenStrobe) > 0 : Math.sin(optics.sirenStrobe) <= 0);
      drawRoundedBox(
        ctx,
        bx2 - 1.35,
        side * (bodyHW - 2.2) - 0.65,
        bx2 - 0.25,
        side * (bodyHW - 2.2) + 0.65,
        0.2,
        fFlash ? (side < 0 ? '#ff3333' : '#38bdf8') : (side < 0 ? '#7f1d1d' : '#1e3a8a'),
        deform
      );
      const rFlash = optics.sirenOn && (side < 0 ? Math.sin(optics.sirenStrobe) <= 0 : Math.sin(optics.sirenStrobe) > 0);
      drawRoundedBox(
        ctx,
        bx1 + 0.25,
        side * (bodyHW - 2.2) - 0.75,
        bx1 + 1.25,
        side * (bodyHW - 2.2) + 0.75,
        0.22,
        rFlash ? '#38bdf8' : '#1e3a8a',
        deform,
        '#0f172a',
        0.28
      );
    }

    // Right side medical module door handle
    if (g.layout) {
      drawRoundedBox(ctx, g.layout.doorSlideX - 0.65, bodyHW - 0.25, g.layout.doorSlideX + 0.65, bodyHW + 0.25, 0.14, '#111827', deform);
    }
  }
}

function renderGazelleIntegralUpper(
  vCtx: VehicleRenderContext,
  g: GazelleResolved,
  optics: LiveOpticsState
): void {
  const { ctx, car, halfL, halfW, rc, cabinX, cabinL, cabinW, deform } = vCtx;
  const kind = g.walkableKind;
  if (!kind || !g.isIntegral) return;

  const cabFrontX = cabinX + cabinL * 0.5;
  const wsX1 = cabFrontX - 3.6;
  const wsX2 = cabFrontX + 0.1;
  const rearEndX = -halfL + rc + 0.45;
  const cabHW = halfW - 0.35;
  const roofX1 = rearEndX + 1.15;
  const roofX2 = wsX1 + 0.25;
  const roofHW = cabinW * 0.46;
  const cabColor = getGazelleCabShellColor(car, g);
  const roofColor =
    kind === 'med_reanim'
      ? '#fef08a'
      : kind === 'med_03' || kind === 'med_lab'
      ? '#f8fafc'
      : car.roofColor || cabColor;

  // --- A. CUTAWAY OPEN-ROOF MODE WHEN PLAYER IS WALKING / SITTING INSIDE ---
  if (car.isPlayerInsideSaloon) {
    const doorSlideX = g.layout?.doorSlideX ?? (cabFrontX - 15.6);
    // Thin side window rail eaves framing the open cabin (leaving door opening clear on +Y)
    for (const side of [-1, 1] as const) {
      const wyOut = side * (cabHW - 0.25);
      const wyIn = side * (cabHW - 0.95);
      if (side < 0) {
        drawRoundedBox(ctx, roofX1, wyIn, wsX1 + 0.4, wyOut, 0.2, cabColor, deform, '#0f172a', 0.42);
      } else {
        // Split around sliding door gap
        const gapX1 = doorSlideX - 3.3;
        const gapX2 = doorSlideX + 3.3;
        if (gapX1 > roofX1 + 1.0) {
          drawRoundedBox(ctx, roofX1, wyIn, gapX1, wyOut, 0.2, cabColor, deform, '#0f172a', 0.42);
        }
        if (wsX1 + 0.4 > gapX2 + 0.5) {
          drawRoundedBox(ctx, gapX2, wyIn, wsX1 + 0.4, wyOut, 0.2, cabColor, deform, '#0f172a', 0.42);
        }
      }
      // Subtle rear-edge corner pillar lip
      drawRoundedBox(ctx, rearEndX + 0.35, -cabHW * 0.84, roofX1 + 0.4, -cabHW * 0.45, 0.15, cabColor, deform, '#0f172a', 0.35);
      drawRoundedBox(ctx, rearEndX + 0.35, cabHW * 0.45, roofX1 + 0.4, cabHW * 0.84, 0.15, cabColor, deform, '#0f172a', 0.35);
    }

    // Thin front header brow above windshield carrying lights / SGU / route board
    drawRoundedBox(ctx, wsX1 - 2.3, -roofHW, wsX1 + 0.35, roofHW, 0.5, roofColor, deform, '#1e293b', 0.45);
    if (kind === 'passenger') {
      drawRoadTrainMarkers(ctx, wsX1 - 0.7, [-2.2, 0, 2.2], optics.roadTrainOn, deform);
      // Subtle longitudinal overhead grab rail down saloon aisle
      if (g.layout) {
        strokePoly(
          ctx,
          [[g.layout.rearBenchX + 1.0, 0], [g.layout.partitionX - 0.4, 0]],
          'rgba(250,204,21,0.45)',
          0.42,
          deform
        );
      }
    } else if (kind === 'med_03' || kind === 'med_reanim') {
      drawGazelleEmergencyLightbar(ctx, wsX1 - 1.05, roofHW * 0.78, optics.sirenOn, optics.sirenStrobe, deform, 2.35);
    }
    return;
  }

  // --- B. FULL SEALED EXTERIOR MONOCOQUE ЦМФ GREENHOUSE & ROOF ---
  // 1. Flush-bonded panoramic side window bands + pillar mullions + sliding door handle
  for (const side of [-1, 1] as const) {
    const syOut = side * (cabHW - 0.5);
    const syIn = side * (roofHW - 0.15);
    const winX1 = roofX1 + 1.2;
    const winX2 = wsX1 + 0.1;
    const glassTint = kind === 'med_03' || kind === 'med_reanim' ? 'smoke' : 'blue';

    fillPoly(
      ctx,
      [
        [winX1, syIn],
        [winX2, syIn],
        [wsX2 - 0.9, syOut],
        [winX1 + 0.2, syOut],
      ],
      createGlassGradient(ctx, winX1, syIn, winX2, syOut, glassTint),
      deform,
      '#090d16',
      0.42
    );

    // Vertical window B/C/D pillar mullions
    for (let px = winX1 + 5.8; px < winX2 - 2.5; px += 7.2) {
      strokePoly(ctx, [[px, syIn], [px, syOut]], '#090d16', 0.62, deform);
    }

    // Frosted lower white privacy glaze on 03 / Reanim ambulances
    if (kind === 'med_03' || kind === 'med_reanim') {
      const fYOut = side * (cabHW - 0.56);
      const fYIn = side * ((cabHW + roofHW) * 0.5 - 0.1);
      strokePoly(ctx, [[winX1 + 0.6, (fYOut + fYIn) * 0.5], [cabFrontX - 11.2, (fYOut + fYIn) * 0.5]], 'rgba(241,245,249,0.45)', 0.55, deform);
    }

    // Front door handle + right sliding door handle
    drawRoundedBox(ctx, cabFrontX - 10.2, side * (cabHW - 0.42) - 0.2, cabFrontX - 8.6, side * (cabHW - 0.42) + 0.2, 0.14, '#111827', deform);
    if (side > 0 && g.layout) {
      const dx = g.layout.doorSlideX;
      drawRoundedBox(ctx, dx + 1.6, side * (cabHW - 0.42) - 0.2, dx + 3.2, side * (cabHW - 0.42) + 0.2, 0.14, '#111827', deform);
      strokePoly(ctx, [[dx - 3.3, side * cabHW], [dx - 3.3, side * roofHW]], 'rgba(15,23,42,0.55)', 0.48, deform);
      strokePoly(ctx, [[dx + 3.3, side * cabHW], [dx + 3.3, side * roofHW]], 'rgba(15,23,42,0.55)', 0.48, deform);
    }
  }

  // 2. Rear twin barn-door glazed windows & vertical center seam
  for (const side of [-1, 1] as const) {
    const wy1 = side < 0 ? -roofHW * 0.78 : 0.7;
    const wy2 = side < 0 ? -0.7 : roofHW * 0.78;
    drawRoundedBox(
      ctx,
      rearEndX + 0.2,
      wy1,
      roofX1 + 0.1,
      wy2,
      0.22,
      createGlassGradient(ctx, rearEndX, wy1, roofX1, wy2, 'smoke'),
      deform,
      '#090d16',
      0.35
    );
  }

  // 3. Seamless Full-Length Integral Roof Deck
  drawBoxShadow(ctx, roofX1, -roofHW, roofX2, roofHW, 1.4, -0.45, 0.5, 0.28, deform);
  drawRoundedBox(
    ctx,
    roofX1,
    -roofHW,
    roofX2,
    roofHW,
    1.4,
    createRoofGradient(ctx, roofHW, roofColor),
    deform,
    shadePaint(roofColor, -0.4),
    0.62
  );

  // Drip rails along full monocoque roof
  for (const side of [-1, 1] as const) {
    strokePoly(ctx, [[roofX1 + 0.8, side * (roofHW - 0.22)], [roofX2 - 0.8, side * (roofHW - 0.22)]], '#1e293b', 0.42, deform);
  }

  // Front whip antenna
  strokePoly(ctx, [[roofX2 - 1.2, -roofHW + 0.9], [roofX2 - 5.2, -roofHW - 0.2]], '#1e293b', 0.35, deform);

  const roofMidX = (roofX1 + roofX2) * 0.5;

  // --- C. VARIANT-SPECIFIC ROOF HARDWARE & LIVERY ---
  if (kind === 'passenger') {
    // Stamped longitudinal roof ribs + front backlit LED route display + clearance lights + mid HVAC + rear escape hatch
    for (const ry of [-roofHW * 0.62, 0, roofHW * 0.62]) {
      strokePoly(ctx, [[roofX1 + 1.5, ry], [roofX2 - 2.2, ry]], 'rgba(15,23,42,0.18)', 0.45, deform);
    }
    // Amber LED route display at windshield top header
    drawRoundedBox(ctx, wsX1 + 0.15, -roofHW * 0.42, wsX1 + 1.45, roofHW * 0.42, 0.2, '#090d16', deform);
    strokePoly(
      ctx,
      [[wsX1 + 0.8, -roofHW * 0.34], [wsX1 + 0.8, roofHW * 0.34]],
      optics.ignitionOn || optics.positionOn ? '#fbbf24' : '#78350f',
      0.65,
      deform
    );
    drawRoadTrainMarkers(ctx, roofX2 - 0.72, [-2.2, 0, 2.2], optics.roadTrainOn, deform);

    // Slim passenger HVAC pod
    drawBoxShadow(ctx, roofMidX - 2.2, -roofHW * 0.52, roofMidX + 4.4, roofHW * 0.52, 0.8, -0.55, 0.5, 0.24, deform);
    drawRoundedBox(ctx, roofMidX - 2.2, -roofHW * 0.52, roofMidX + 4.4, roofHW * 0.52, 0.8, '#f1f5f9', deform, '#475569', 0.48);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, roofMidX - 1.1, side * roofHW * 0.22 - 1.35, roofMidX + 3.2, side * roofHW * 0.22 + 1.35, 0.32, '#1e293b', deform);
    }

    // Rear smoked-glass emergency escape hatch
    const hatchX = roofX1 + 4.8;
    drawRoundedBox(ctx, hatchX - 2.2, -2.8, hatchX + 2.2, 2.8, 0.45, '#334155', deform, '#0f172a', 0.4);
    drawRoundedBox(ctx, hatchX - 1.7, -2.2, hatchX + 1.7, 2.2, 0.3, createGlassGradient(ctx, hatchX - 1.7, -2.2, hatchX + 1.7, 2.2, 'smoke'), deform);
    return;
  }

  if (kind === 'med_03') {
    // Class B Ambulance 03: red roof shoulder stripes, Red Cross, stainless rotary vent fan, front SGU lightbar, twin rear blue strobes
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[roofX1 + 1.8, side * (roofHW - 0.85)], [roofX2 - 4.0, side * (roofHW - 0.85)]], '#dc2626', 0.75, deform);
    }
    drawMedicalCrossEmblem(ctx, roofMidX - 1.5, 0, 3.1, deform, '#dc2626');

    // Stainless rotary medical mushroom exhaust vent
    const ventX = roofX1 + 4.6;
    drawBoxShadow(ctx, ventX - 1.8, -1.8, ventX + 1.8, 1.8, 1.5, -0.4, 0.4, 0.22, deform);
    drawDeformedDot(ctx, ventX, 0, 1.85, '#e2e8f0', deform, '#475569', 0.42);
    drawDeformedDot(ctx, ventX, 0, 0.85, '#94a3b8', deform, '#334155', 0.28);

    // Front SGU lightbar above cab brow
    drawGazelleEmergencyLightbar(ctx, roofX2 - 1.8, roofHW * 0.78, optics.sirenOn, optics.sirenStrobe, deform, 2.5);

    // Twin rear roof corner blue strobes
    for (const side of [-1, 1] as const) {
      const flash = optics.sirenOn && (side < 0 ? Math.sin(optics.sirenStrobe) > 0 : Math.sin(optics.sirenStrobe) <= 0);
      drawRoundedBox(
        ctx,
        roofX1 + 0.25,
        side * roofHW * 0.6 - 0.75,
        roofX1 + 1.2,
        side * roofHW * 0.6 + 0.75,
        0.22,
        flash ? '#38bdf8' : '#1e3a8a',
        deform,
        '#0f172a',
        0.28
      );
    }
    return;
  }

  if (kind === 'med_reanim') {
    // High-Roof Class C Reanimobile: red perimeter frame, central cross on white disc, HVAC pod, twin antennas, front + rear SGU lightbars, side scene LEDs
    strokePoly(
      ctx,
      [
        [roofX1 + 0.8, -roofHW + 0.65],
        [roofX2 - 0.6, -roofHW + 0.65],
        [roofX2 - 0.6, roofHW - 0.65],
        [roofX1 + 0.8, roofHW - 0.65],
      ],
      '#dc2626',
      0.75,
      deform,
      true
    );
    drawMedicalCrossEmblem(ctx, roofMidX + 1.0, 0, 2.9, deform, '#dc2626', '#ffffff');

    // Medical climate HVAC condenser pod
    const acX = roofX1 + (roofX2 - roofX1) * 0.28;
    drawBoxShadow(ctx, acX - 3.0, -roofHW * 0.48, acX + 3.0, roofHW * 0.48, 0.7, -0.6, 0.55, 0.26, deform);
    drawRoundedBox(ctx, acX - 3.0, -roofHW * 0.48, acX + 3.0, roofHW * 0.48, 0.7, '#f1f5f9', deform, '#475569', 0.46);
    drawRoundedBox(ctx, acX - 2.0, -roofHW * 0.3, acX + 2.0, roofHW * 0.3, 0.35, '#1e293b', deform);

    // Telemetry/GPS antenna pods
    drawDeformedDot(ctx, roofMidX - 4.0, -roofHW * 0.62, 0.5, '#0f172a', deform);
    drawDeformedDot(ctx, roofMidX - 4.0, roofHW * 0.62, 0.5, '#0f172a', deform);

    // Dual front & rear SGU red/blue LED lightbars
    drawGazelleEmergencyLightbar(ctx, roofX2 - 1.8, roofHW * 0.78, optics.sirenOn, optics.sirenStrobe, deform, 2.6);
    drawGazelleEmergencyLightbar(ctx, roofX1 + 1.5, roofHW * 0.72, optics.sirenOn, optics.sirenStrobe + Math.PI, deform, 2.1);

    // Side scene-flood LED strips
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        roofMidX - 4.5,
        side * (roofHW - 0.15) - 0.28,
        roofMidX + 4.5,
        side * (roofHW - 0.15) + 0.28,
        0.14,
        optics.sirenOn ? '#e0f2fe' : '#cbd5e1',
        deform,
        '#1e293b',
        0.2
      );
    }
    return;
  }

  if (kind === 'med_lab') {
    // Mobile Clinic / FAP: emerald green roof trim & medical cross, A/C condenser pod, twin vents, stowed right awning cassette
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[roofX1 + 1.4, side * (roofHW - 0.75)], [roofX2 - 2.5, side * (roofHW - 0.75)]], '#059669', 0.8, deform);
    }
    drawMedicalCrossEmblem(ctx, roofMidX + 0.5, 0, 2.9, deform, '#059669', '#ecfdf5');

    // Clinic A/C pod
    const acX = roofX1 + 5.2;
    drawBoxShadow(ctx, acX - 2.8, -roofHW * 0.46, acX + 2.8, roofHW * 0.46, 0.65, -0.5, 0.5, 0.24, deform);
    drawRoundedBox(ctx, acX - 2.8, -roofHW * 0.46, acX + 2.8, roofHW * 0.46, 0.65, '#f1f5f9', deform, '#475569', 0.45);
    drawRoundedBox(ctx, acX - 1.8, -roofHW * 0.28, acX + 1.8, roofHW * 0.28, 0.32, '#1e293b', deform);

    // Right-side roll-out diagnostic awning cassette
    drawBoxShadow(ctx, roofX1 + 2.2, roofHW * 0.78, roofX2 - 6.0, roofHW * 0.98, 0.35, -0.35, 0.45, 0.24, deform);
    drawRoundedBox(ctx, roofX1 + 2.2, roofHW * 0.78, roofX2 - 6.0, roofHW * 0.98, 0.35, '#cbd5e1', deform, '#334155', 0.4);
    strokePoly(ctx, [[roofX1 + 2.8, roofHW * 0.88], [roofX2 - 6.6, roofHW * 0.88]], '#059669', 0.38, deform);

    drawRoadTrainMarkers(ctx, roofX2 - 0.72, [-2.2, 0, 2.2], optics.roadTrainOn, deform);
  }
}

export function renderGazelleUpperLayer(vCtx: VehicleRenderContext): void {
  const g = resolveGazelle(vCtx.car);
  const optics = getLiveOpticsState(vCtx.car);

  if (g.isIntegral) {
    // Integral ЦМФ monocoque: render hood/windshield/mirrors via cab upper, then full integral greenhouse/roof/cutaway
    renderGazelleCabUpper(vCtx, g, optics);
    renderGazelleIntegralUpper(vCtx, g, optics);
    return;
  }

  // 1. Render mounted superstructure (if any) behind cab
  renderGazelleSuperstructure(vCtx, g, optics);

  // 2. Render semi-bonnet hood, wipers, panoramic windshield, Fermer/standard roof, mirrors & beacons
  renderGazelleCabUpper(vCtx, g, optics);
}

import type { VehicleRenderContext } from './vehicleArchetypes';
import {
  createArticulatedHoodDeform,
  drawDetachedHoodHingeStubs,
  drawNativeHoodOverEffects,
  drawNativeHoodUnderEffects,
  isVehicleHoodVisualOpenOrBuckled,
} from './engineBayVisuals';
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
  createCylindricalGradient,
  createGlassGradient,
  drawCabinInteriorHint,
  drawGlassGlint,
  drawIntegratedHeadlight,
  drawIntegratedTaillight,
  drawCorrugatedDeck,
  drawWoodPlankDeck,
  drawTreadplateSurface,
  drawHydraulicCylinder,
  drawChromePipe,
  drawSteelCompactorDrum,
  drawTreadedTire,
  drawAmberBeacon,
  drawEceRedTriangle,
  drawSideMirrorArm,
  LiveOpticsState,
} from './vehicleModelPrimitives';

export const REDRAWN_HEAVY_EQUIPMENT_TYPES: ReadonlySet<string> = new Set([
  // Tractors (3)
  'tractor_mtz82',
  'tractor_mtz80',
  'tractor_mtz80_old',
  // Road Machinery (4)
  'paver_asphalt_wheeled',
  'roller_heavy_tandem',
  'roller_compact_sidewalk',
  'roller_pneumatic',
  // Agricultural & Semi Trailers (8)
  'trailer_barrel',
  'trailer_vacuum',
  'trailer_flatbed_2axle',
  'trailer_semi',
  'trailer_semi_box',
  'trailer_semi_tanker',
  'trailer_semi_container',
  'trailer_semi_lowboy',
]);

export function isRedrawnHeavyEquipment(type: string | undefined | null): boolean {
  return !!type && REDRAWN_HEAVY_EQUIPMENT_TYPES.has(type);
}

// ============================================================================
// SHARED HEAVY EQUIPMENT & TRAILER HELPERS
// ============================================================================

function makeArticulatedDeform(baseDeform: DeformFn, gamma: number): DeformFn {
  if (!gamma) return baseDeform;
  const c = Math.cos(gamma);
  const s = Math.sin(gamma);
  return (x: number, y: number): [number, number] => {
    const rx = x * c - y * s;
    const ry = x * s + y * c;
    return baseDeform(rx, ry);
  };
}

function drawHazardChevronStrip(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  deform: DeformFn,
  stripeStep = 1.8
): void {
  drawRoundedBox(ctx, x1, y1, x2, y2, 0.2, '#facc15', deform, '#090d16', 0.38);
  const h = y2 - y1;
  const w = x2 - x1;
  if (h >= w) {
    for (let sy = y1 + 0.5; sy < y2 - 0.5; sy += stripeStep) {
      strokePoly(ctx, [[x1 + 0.2, sy], [x2 - 0.2, Math.min(y2 - 0.2, sy + w * 0.75)]], '#090d16', 0.72, deform);
    }
  } else {
    for (let sx = x1 + 0.5; sx < x2 - 0.5; sx += stripeStep) {
      strokePoly(ctx, [[sx, y1 + 0.2], [Math.min(x2 - 0.2, sx + h * 0.75), y2 - 0.2]], '#090d16', 0.72, deform);
    }
  }
}

function drawTrailerRearEceBumper(
  ctx: CanvasRenderingContext2D,
  rearX: number,
  halfW: number,
  lampY: number,
  opt: LiveOpticsState,
  deform: DeformFn,
  options?: {
    bumperHalfW?: number;
    hasMudflaps?: boolean;
    hasTriangles?: boolean;
    hasLicensePlate?: boolean;
  }
): void {
  const bw = options?.bumperHalfW ?? halfW * 0.94;
  // Underride galvanized steel bumper bar
  drawRoundedBox(ctx, rearX - 0.2, -bw, rearX + 1.45, bw, 0.35, '#1e293b', deform, '#090d16', 0.5);
  strokePoly(ctx, [[rearX + 0.55, -bw + 0.6], [rearX + 0.55, bw - 0.6]], 'rgba(203,213,225,0.28)', 0.45, deform);

  // Rubber spray mudflaps behind outer tires
  if (options?.hasMudflaps) {
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, rearX - 0.55, side * bw * 0.72 - 1.5, rearX + 0.15, side * bw * 0.72 + 1.5, 0.15, '#090d16', deform);
    }
  }

  // Center rear license plate
  if (options?.hasLicensePlate !== false) {
    drawRoundedBox(ctx, rearX + 0.15, -2.1, rearX + 1.05, 2.1, 0.15, '#f1f5f9', deform, '#0f172a', 0.25);
  }

  // Twin red ECE warning triangles
  if (options?.hasTriangles !== false) {
    for (const side of [-1, 1] as const) {
      drawEceRedTriangle(ctx, rearX + 0.75, side * Math.min(bw * 0.44, lampY - 2.35), 1.45, deform);
    }
  }

  // Integrated multi-chamber ECE trailer lamps
  for (const side of [-1, 1] as const) {
    const broken = side < 0 ? opt.leftTailBroken : opt.rightTailBroken;
    const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
    drawIntegratedTaillight(
      ctx,
      rearX + 0.15,
      side * lampY - 1.55,
      rearX + 1.55,
      side * lampY + 1.55,
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
}

function drawSemiSideDetails(
  ctx: CanvasRenderingContext2D,
  halfL: number,
  halfW: number,
  opt: LiveOpticsState,
  towed: boolean,
  deform: DeformFn,
  isLowboy = false
): void {
  // Crank landing gear pads & cross-brace (visible peeking from chassis when unhitched!)
  if (!towed) {
    const lgX = isLowboy ? halfL * 0.42 : halfL * 0.54;
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, lgX - 1.4, side * (halfW * 0.78) - 1.1, lgX + 1.4, side * (halfW * 0.78) + 1.1, 0.25, '#334155', deform, '#090d16', 0.4);
    }
    // Folding crank handle on right flank
    strokePoly(ctx, [[lgX, halfW * 0.85], [lgX, halfW + 1.0], [lgX - 1.2, halfW + 1.0]], '#94a3b8', 0.5, deform);
  }

  // Side amber LED outline marker lamps along trailer flanks
  const markerXs = isLowboy
    ? [halfL * 0.75, halfL * 0.22, -halfL * 0.22, -halfL * 0.68]
    : [halfL * 0.72, halfL * 0.24, -halfL * 0.22, -halfL * 0.68];
  for (const mx of markerXs) {
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        mx - 0.65,
        side * (halfW - 0.22) - 0.22,
        mx + 0.65,
        side * (halfW - 0.22) + 0.22,
        0.12,
        opt.positionOn ? '#fbbf24' : '#92400e',
        deform
      );
    }
  }
}

function drawAFrameDrawbar(
  ctx: CanvasRenderingContext2D,
  bodyFrontX: number,
  hitchTipX: number,
  spreadY: number,
  deform: DeformFn,
  withJockeyWheel = true
): void {
  // Twin heavy steel A-frame channel beams converging to forged towing eye
  for (const side of [-1, 1] as const) {
    strokePoly(ctx, [[bodyFrontX, side * spreadY], [hitchTipX - 1.0, 0]], '#090d16', 1.65, deform);
    strokePoly(ctx, [[bodyFrontX, side * spreadY], [hitchTipX - 1.0, 0]], '#475569', 0.95, deform);
  }
  // Cross brace & safety chains
  const midX = bodyFrontX + (hitchTipX - bodyFrontX) * 0.45;
  strokePoly(ctx, [[midX, -spreadY * 0.54], [midX, spreadY * 0.54]], '#334155', 0.8, deform);

  // Forged steel lunette towing eye ring at hitch tip
  drawDeformedDot(ctx, hitchTipX - 0.5, 0, 1.05, '#334155', deform, '#090d16', 0.42);
  drawDeformedDot(ctx, hitchTipX - 0.5, 0, 0.46, '#0f172a', deform);

  // Parking jockey wheel & crank handle
  if (withJockeyWheel) {
    drawRoundedBox(ctx, midX + 0.4, -1.0, midX + 2.1, -0.1, 0.2, '#1e293b', deform, '#090d16', 0.3);
    drawDeformedDot(ctx, midX + 1.2, 0.65, 0.65, '#94a3b8', deform, '#0f172a', 0.28);
  }
}

// ============================================================================
// 1. WHEELS LAYER (TRACTORS, PAVER, PNEUMATIC ROLLER, ALL TRAILERS)
// ============================================================================

export function renderHeavyEquipmentWheels(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const type = car.type;
  const steer = car.steerAngle || 0;

  // --- TRACTORS (MTZ-82 4x4, MTZ-80 2WD, MTZ-80 Veteran) ---
  if (type === 'tractor_mtz82' || type === 'tractor_mtz80' || type === 'tractor_mtz80_old') {
    const is82 = type === 'tractor_mtz82';
    const isOld = type === 'tractor_mtz80_old';
    const frontX = is82 ? halfL * 0.56 : halfL * 0.58;
    const rearX = -halfL * 0.50;

    // Front beam / portal axle housing
    const fTrack = is82 ? halfW * 0.72 : halfW * 0.68;
    strokePoly(ctx, [[frontX, -fTrack], [frontX, fTrack]], '#0f172a', is82 ? 2.2 : 1.5, deform);
    strokePoly(ctx, [[frontX, -fTrack], [frontX, fTrack]], '#334155', is82 ? 1.1 : 0.75, deform);
    if (is82) {
      // Front 4WD differential pumpkin + driveshaft
      drawDeformedDot(ctx, frontX, halfW * 0.16, 1.5, '#1e293b', deform, '#090d16', 0.4);
      strokePoly(ctx, [[frontX, halfW * 0.16], [0, halfW * 0.12]], '#334155', 0.85, deform);
    }

    // Rear heavy cast-iron axle trumpet housings
    strokePoly(ctx, [[rearX, -halfW * 0.82], [rearX, halfW * 0.82]], '#0f172a', 2.8, deform);

    // Front steering wheels (chunky 4WD chevron on MTZ-82, slim 3-rib on MTZ-80 / Veteran)
    const fLen = is82 ? 7.6 : 6.4;
    const fWid = is82 ? 3.2 : 2.15;
    const rimCol = isOld ? '#d97706' : '#e2e8f0';
    for (const side of [-1, 1] as const) {
      const [fx, fy] = deform(frontX, side * fTrack);
      drawTreadedTire(ctx, fx, fy, fLen, fWid, steer, is82 ? 'agri' : 'road', rimCol);
      // Turning steel front fenders on MTZ-82 4x4
      if (is82) {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(steer);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.roundRect(-fLen * 0.48, -fWid * 0.56, fLen * 0.96, fWid * 1.12, 0.7);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Massive rear agricultural herringbone tires
      const [rx, ry] = deform(rearX, side * (halfW - 1.95));
      drawTreadedTire(ctx, rx, ry, 13.0, 4.35, 0, 'agri', rimCol);
    }
    return;
  }

  // --- ASPHALT PAVER (4 front solid bogie guide tires + 2 huge rear drive tires) ---
  if (type === 'paver_asphalt_wheeled') {
    for (const side of [-1, 1] as const) {
      for (const fx of [halfL * 0.56, halfL * 0.24]) {
        const [wx, wy] = deform(fx, side * (halfW * 0.76));
        drawTreadedTire(ctx, wx, wy, 5.2, 2.3, steer * 0.8, 'heavy');
      }
      const [rx, ry] = deform(-halfL * 0.34, side * (halfW * 0.78));
      drawTreadedTire(ctx, rx, ry, 9.6, 3.8, 0, 'agri', '#f59e0b');
    }
    return;
  }

  // --- PNEUMATIC TIRE ROLLER (4 staggered front smooth slicks + 5 overlapping rear slicks) ---
  if (type === 'roller_pneumatic') {
    const frontX = halfL * 0.56;
    const rearX = -halfL * 0.56;
    const fYs = [-halfW * 0.69, -halfW * 0.23, halfW * 0.23, halfW * 0.69];
    for (const fy of fYs) {
      const [wx, wy] = deform(frontX, fy);
      drawTreadedTire(ctx, wx, wy, 7.6, 2.65, steer, 'slick');
    }
    const rYs = [-halfW * 0.76, -halfW * 0.38, 0, halfW * 0.38, halfW * 0.76];
    for (const ry of rYs) {
      const [wx, wy] = deform(rearX, ry);
      drawTreadedTire(ctx, wx, wy, 7.8, 2.65, 0, 'slick');
    }
    return;
  }

  // --- STEEL DRUM ROLLERS (No rubber tires; steel drums rendered in chassis layer) ---
  if (type === 'roller_heavy_tandem' || type === 'roller_compact_sidewalk') {
    return;
  }

  // --- AGRICULTURAL TRAILERS ---
  if (type === 'trailer_barrel') {
    const ax = -halfL * 0.14;
    for (const side of [-1, 1] as const) {
      const [wx, wy] = deform(ax, side * (halfW - 1.55));
      drawTreadedTire(ctx, wx, wy, 8.6, 3.1, 0, 'agri', '#cbd5e1');
    }
    return;
  }

  if (type === 'trailer_vacuum') {
    const ax = -halfL * 0.18;
    for (const side of [-1, 1] as const) {
      const [wx, wy] = deform(ax, side * (halfW - 1.45));
      drawTreadedTire(ctx, wx, wy, 9.4, 3.4, 0, 'agri', '#cbd5e1');
    }
    return;
  }

  if (type === 'trailer_flatbed_2axle') {
    // Front swiveling turntable dolly axle + rear fixed axle
    const dollyAngle = car.trailerDollyAngle || 0;
    const frontAx = halfL * 0.44;
    const rearAx = -halfL * 0.54;
    const track = halfW - 1.4;
    for (const side of [-1, 1] as const) {
      const lx = frontAx - side * track * Math.sin(dollyAngle);
      const ly = side * track * Math.cos(dollyAngle);
      const [fx, fy] = deform(lx, ly);
      drawTreadedTire(ctx, fx, fy, 8.0, 2.8, dollyAngle, 'heavy');
      const [rx, ry] = deform(rearAx, side * track);
      drawTreadedTire(ctx, rx, ry, 8.0, 2.8, 0, 'heavy');
    }
    return;
  }

  // --- HEAVY SEMI-TRAILERS (Tri-axle dual bogies) ---
  if (type.startsWith('trailer_semi')) {
    const isLowboy = type === 'trailer_semi_lowboy';
    const axleXs = isLowboy
      ? [-halfL * 0.52, -halfL * 0.66, -halfL * 0.80]
      : [-halfL * 0.48, -halfL * 0.64, -halfL * 0.80];
    const outerY = halfW - 1.25;
    const innerY = halfW - 3.65;
    for (const ax of axleXs) {
      for (const side of [-1, 1] as const) {
        const [ox, oy] = deform(ax, side * outerY);
        const [ix, iy] = deform(ax, side * innerY);
        drawTreadedTire(ctx, ox, oy, 8.4, 2.55, 0, 'heavy');
        drawTreadedTire(ctx, ix, iy, 8.4, 2.55, 0, 'heavy');
      }
    }
  }
}

// ============================================================================
// 2. CHASSIS LAYER (FRAMES, HOODS, HULLS, STEEL DRUMS, DECKS, OPTICS)
// ============================================================================

export function renderHeavyEquipmentChassisLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  const type = car.type;
  const opt = getLiveOpticsState(car);
  const hoodExposed = isVehicleHoodVisualOpenOrBuckled(car);
  const fX = halfL - fc;
  const rX = -halfL + rc;
  const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;

  // ==========================================================================
  // A. TRACTORS (MTZ-82 4x4, MTZ-80 2WD, MTZ-80 Veteran MK Cab)
  // ==========================================================================
  if (type === 'tractor_mtz82' || type === 'tractor_mtz80' || type === 'tractor_mtz80_old') {
    const is82 = type === 'tractor_mtz82';
    const isOld = type === 'tractor_mtz80_old';
    const baseColor = car.color || (isOld ? '#2563eb' : is82 ? '#0284c7' : '#dc2626');
    const hoodW = isOld ? halfW * 0.33 : halfW * 0.35;
    const hoodRearX = halfL * 0.04;
    const hoodFrontX = halfL * 0.84;

    // 1. Cast-iron longitudinal half-frame rails & central transmission housing
    drawRoundedBox(ctx, -halfL * 0.72, -hoodW * 0.82, halfL * 0.88, hoodW * 0.82, 0.5, '#1e293b', deform, '#090d16', 0.55);

    // 2. Front cast-iron suitcase ballast weight rack & tow jaw
    const plateCount = is82 ? 8 : isOld ? 4 : 6;
    const rackW = is82 ? halfW * 0.44 : isOld ? halfW * 0.28 : halfW * 0.36;
    drawRoundedBox(ctx, hoodFrontX, -rackW, fX - 0.1, rackW, 0.35, '#111827', deform, '#020617', 0.5);
    const step = (rackW * 2 - 0.6) / plateCount;
    for (let i = 0; i < plateCount; i++) {
      const py = -rackW + 0.3 + i * step;
      drawRoundedBox(ctx, hoodFrontX + 0.25, py + 0.1, fX - 0.25, py + step - 0.1, 0.15, '#334155', deform, '#0f172a', 0.22);
    }
    // Front towing clevis pin
    drawDeformedDot(ctx, fX - 0.35, 0, 0.65, '#64748b', deform, '#090d16', 0.3);

    // 3. Engine bay recess when hood is open/buckled/detached (sculpted Belarus hood itself renders in renderHeavyEquipmentHoodLayer)
    if (hoodExposed) {
      drawRoundedBox(
        ctx,
        hoodRearX + 0.25,
        -hoodW * 0.94,
        hoodFrontX - 0.35,
        hoodW * 0.94,
        0.35,
        '#0b0f17',
        deform,
        'rgba(148,163,184,0.22)',
        0.48
      );
      // Right vertical exhaust muffler stack & left cyclone pre-cleaner stay mounted to the diesel frame
      drawDeformedDot(ctx, halfL * 0.46, hoodW * 0.84, 1.05, '#111827', deform, '#475569', 0.35);
      drawDeformedDot(ctx, halfL * 0.46, hoodW * 0.84, 0.48, '#64748b', deform);
      drawDeformedDot(ctx, halfL * 0.52, -hoodW * 0.72, 1.05, '#1e293b', deform, '#94a3b8', 0.32);
      drawDeformedDot(ctx, halfL * 0.52, -hoodW * 0.72, 0.52, '#334155', deform);
    }

    // 4. Side Radiator-Bracket Headlights (exact sync with opticsMounts: xFrac +0.36, yFrac ±0.27)
    const hlX = halfL * 0.72;
    const hlY = (halfW * 2) * (isOld ? 0.26 : 0.27);
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      // Steel mounting stalk from radiator shell
      strokePoly(ctx, [[hlX - 0.2, side * hoodW * 0.9], [hlX - 0.2, side * hlY]], '#1e293b', 0.7, deform);
      drawIntegratedHeadlight(
        ctx,
        hlX - 0.95,
        side * hlY - 0.95,
        hlX + 0.95,
        side * hlY + 0.95,
        side,
        'round_classic',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        broken,
        deform
      );
    }

    // 5. Rear Curved Mudguard Fenders + Side Cab Boarding Steps + Rear Tail/Turn Lamps
    const fendX1 = -halfL * 0.82;
    const fendX2 = -halfL * 0.16;
    for (const side of [-1, 1] as const) {
      const fIn = isOld ? halfW * 0.62 : halfW * 0.56;
      const fOut = halfW * 0.97;
      drawRoundedBox(
        ctx,
        fendX1,
        side < 0 ? -fOut : fIn,
        fendX2,
        side < 0 ? -fIn : fOut,
        0.95,
        createBodyMetallicGradient(ctx, halfW, shadePaint(baseColor, -0.05)),
        deform,
        '#090d16',
        0.52
      );
      // Black fender rubber edge lip
      strokePoly(ctx, [[fendX1 + 0.6, side * fOut], [fendX2 - 0.6, side * fOut]], '#0f172a', 0.65, deform);

      // Steel cab entry footstep ahead of rear tire
      drawRoundedBox(
        ctx,
        -halfL * 0.14,
        side < 0 ? -halfW * 0.84 : halfW * 0.44,
        halfL * 0.04,
        side < 0 ? -halfW * 0.44 : halfW * 0.84,
        0.25,
        '#334155',
        deform,
        '#090d16',
        0.35
      );

      // Front amber/white fender clearance marker + Rear integrated tail/brake/turn cluster (xFrac -0.39, yFrac ±0.38)
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      drawRoundedBox(
        ctx,
        fendX2 - 0.9,
        side * (fIn + fOut) * 0.5 - 0.6,
        fendX2 - 0.1,
        side * (fIn + fOut) * 0.5 + 0.6,
        0.2,
        turnInt > 0.08 ? '#fbbf24' : opt.positionOn ? '#fef3c7' : '#94a3b8',
        deform,
        '#090d16',
        0.25
      );
      const tlY = (halfW * 2) * (isOld ? 0.37 : 0.38);
      drawIntegratedTaillight(
        ctx,
        -halfL * 0.83,
        side * tlY - 1.1,
        -halfL * 0.72,
        side * tlY + 1.1,
        side,
        opt.positionOn,
        opt.braking,
        opt.reversing,
        turnInt,
        opt.rearFogOn,
        side < 0 ? opt.leftTailBroken : opt.rightTailBroken,
        deform
      );
    }

    // 6. Detailed Rear 3-Point Hydraulic Hitch (lift arms, top link, hydraulic cylinder, PTO stub)
    drawRoundedBox(ctx, -halfL * 0.84, -halfW * 0.32, -halfL * 0.62, halfW * 0.32, 0.35, '#1e293b', deform, '#090d16', 0.45);
    // Lower forged lift arms + sway chains
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[-halfL * 0.72, side * halfW * 0.24], [rX + 0.7, side * halfW * 0.30]], '#0f172a', 1.35, deform);
      strokePoly(ctx, [[-halfL * 0.72, side * halfW * 0.24], [rX + 0.7, side * halfW * 0.30]], '#64748b', 0.65, deform);
      drawDeformedDot(ctx, rX + 0.7, side * halfW * 0.30, 0.52, '#cbd5e1', deform, '#090d16', 0.25);
    }
    // Cross drawbar beam + central adjustable top link + PTO spline shaft
    strokePoly(ctx, [[rX + 0.7, -halfW * 0.30], [rX + 0.7, halfW * 0.30]], '#334155', 0.95, deform);
    drawHydraulicCylinder(ctx, -halfL * 0.74, 0, rX + 1.3, 0, 0.9, '#475569', deform);
    drawDeformedDot(ctx, rX + 0.7, 0, 0.65, '#f59e0b', deform, '#090d16', 0.3);
    return;
  }

  // ==========================================================================
  // B. ASPHALT PAVER (IronForge PaveMaster Hydro — Vögele / CAT Wheeled Paver)
  // ==========================================================================
  if (type === 'paver_asphalt_wheeled') {
    const baseColor = car.color || '#eab308';

    // 1. Front oscillating truck-push roller bumper beam
    drawRoundedBox(ctx, halfL * 0.90, -halfW * 0.48, fX, halfW * 0.48, 0.35, '#1e293b', deform, '#090d16', 0.55);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, halfL * 0.92, side * halfW * 0.28 - 1.55, fX + 0.25, side * halfW * 0.28 + 1.55, 0.45, '#090d16', deform, '#475569', 0.35);
    }

    // 2. Wide Folding Steel Asphalt Material Hopper (+0.12L .. +0.90L)
    fillPoly(
      ctx,
      [
        [halfL * 0.90, -halfW * 0.96],
        [halfL * 0.90, halfW * 0.96],
        [halfL * 0.12, halfW * 0.96],
        [halfL * 0.12, -halfW * 0.96],
      ],
      createBodyMetallicGradient(ctx, halfW, baseColor),
      deform,
      '#090d16',
      0.75
    );
    // Hopper inner dark trough + sloped side folding wings + hydraulic tilt rams
    drawRoundedBox(ctx, halfL * 0.16, -halfW * 0.80, halfL * 0.86, halfW * 0.80, 0.55, '#18181b', deform, '#334155', 0.45);
    for (const side of [-1, 1] as const) {
      // Sloped wing plate bevel
      fillPoly(
        ctx,
        [
          [halfL * 0.88, side * halfW * 0.93],
          [halfL * 0.85, side * halfW * 0.52],
          [halfL * 0.18, side * halfW * 0.52],
          [halfL * 0.16, side * halfW * 0.93],
        ],
        shadePaint(baseColor, -0.22),
        deform,
        'rgba(15,23,42,0.55)',
        0.4
      );
      // Twin twin-bar steel slat feeder conveyors at center floor
      const cy = side * halfW * 0.24;
      drawRoundedBox(ctx, halfL * 0.16, cy - 1.65, halfL * 0.84, cy + 1.65, 0.2, '#0f172a', deform);
      for (let bx = halfL * 0.20; bx <= halfL * 0.80; bx += 2.0) {
        strokePoly(ctx, [[bx, cy - 1.45], [bx, cy + 1.45]], '#475569', 0.65, deform);
      }
      // Hopper wing hydraulic fold ram
      drawHydraulicCylinder(ctx, halfL * 0.50, side * halfW * 0.88, halfL * 0.50, side * halfW * 0.60, 0.85, '#334155', deform);
    }
    // Steaming hot-mix asphalt mound loaded in center hopper
    fillPoly(
      ctx,
      [
        [halfL * 0.72, -halfW * 0.46],
        [halfL * 0.54, -halfW * 0.62],
        [halfL * 0.24, -halfW * 0.52],
        [halfL * 0.20, halfW * 0.50],
        [halfL * 0.52, halfW * 0.60],
        [halfL * 0.74, halfW * 0.42],
      ],
      '#1c1917',
      deform,
      '#090d16',
      0.45
    );
    // Subtle aggregate stone texture specks in asphalt mix
    for (const [ax, ay] of [
      [halfL * 0.60, -2.1], [halfL * 0.48, 1.4], [halfL * 0.36, -0.8],
      [halfL * 0.44, -3.2], [halfL * 0.56, 2.8], [halfL * 0.30, 2.2],
    ]) {
      drawDeformedDot(ctx, ax, ay, 0.42, '#44403c', deform);
    }

    // Integrated front hopper corner road/work headlights (xFrac +0.44, yFrac ±0.42)
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const hy = side * (halfW * 2) * 0.42;
      drawIntegratedHeadlight(
        ctx,
        halfL * 0.84,
        hy - 1.05,
        halfL * 0.92,
        hy + 1.05,
        side,
        'rect_commercial',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        broken,
        deform
      );
    }

    // 3. Mid Diesel Powerpack Deck (-0.28L .. +0.14L)
    drawRoundedBox(
      ctx,
      -halfL * 0.28,
      -halfW * 0.82,
      halfL * 0.14,
      halfW * 0.82,
      0.8,
      createBodyMetallicGradient(ctx, halfW * 0.82, shadePaint(baseColor, 0.05)),
      deform,
      '#090d16',
      0.65
    );
    // Perforated engine cooling louver deck
    drawRoundedBox(ctx, -halfL * 0.20, -halfW * 0.64, halfL * 0.06, halfW * 0.64, 0.4, '#111827', deform, '#475569', 0.4);
    for (let lx = -halfL * 0.17; lx <= halfL * 0.03; lx += 1.35) {
      strokePoly(ctx, [[lx, -halfW * 0.56], [lx, halfW * 0.56]], '#475569', 0.45, deform);
    }
    // Vertical diesel exhaust stack + hydraulic oil cooler cap
    drawDeformedDot(ctx, halfL * 0.02, -halfW * 0.72, 1.1, '#0f172a', deform, '#64748b', 0.35);
    drawDeformedDot(ctx, -halfL * 0.08, halfW * 0.70, 0.85, '#dc2626', deform, '#090d16', 0.3);

    // 4. Operator Walk-Platform (-0.64L .. -0.26L) in anti-slip checkered steel
    drawTreadplateSurface(ctx, -halfL * 0.64, -halfW * 0.94, -halfL * 0.26, halfW * 0.94, '#334155', deform, 2.2);

    // 5. Rear Extending Hydraulic Screed Assembly (-1.0L .. -0.70L, ±1.06 halfW)
    const screedW = halfW * 1.06;
    // Heavy steel screed tow arms connecting chassis waist to screed
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[-halfL * 0.20, side * halfW * 0.84], [-halfL * 0.76, side * screedW * 0.85]], '#0f172a', 1.6, deform);
      strokePoly(ctx, [[-halfL * 0.20, side * halfW * 0.84], [-halfL * 0.76, side * screedW * 0.85]], shadePaint(baseColor, -0.15), 0.9, deform);
    }
    // Visible twin spiral auger flights ahead of screed plate!
    const augX = -halfL * 0.71;
    strokePoly(ctx, [[augX, -screedW * 0.92], [augX, screedW * 0.92]], '#0f172a', 2.0, deform);
    for (let ay = -screedW * 0.86; ay <= screedW * 0.86; ay += 1.65) {
      strokePoly(ctx, [[augX - 0.9, ay - 0.4], [augX + 0.9, ay + 0.4]], '#94a3b8', 0.65, deform);
    }
    // Main heated screed beam + extending side wings + hazard stripes
    drawRoundedBox(ctx, rX, -screedW, -halfL * 0.76, screedW, 0.55, createBodyMetallicGradient(ctx, screedW, baseColor), deform, '#090d16', 0.65);
    drawTreadplateSurface(ctx, rX + 0.5, -screedW * 0.72, -halfL * 0.79, screedW * 0.72, '#1e293b', deform, 2.0);
    for (const side of [-1, 1] as const) {
      // Depth-adjustment crank handwheels on screed wings
      drawDeformedDot(ctx, -halfL * 0.86, side * screedW * 0.78, 1.05, '#0f172a', deform, '#cbd5e1', 0.4);
      // Hazard chevron plates on screed end-gates
      drawHazardChevronStrip(
        ctx,
        rX + 0.2,
        side < 0 ? -screedW + 0.2 : screedW - 2.3,
        -halfL * 0.78,
        side < 0 ? -screedW + 2.3 : screedW - 0.2,
        deform,
        1.4
      );
      // Integrated rear screed tail/brake/turn cluster (xFrac -0.47, yFrac ±0.44)
      const ty = side * (halfW * 2) * 0.44;
      drawIntegratedTaillight(
        ctx,
        rX + 0.2,
        ty - 1.15,
        rX + 1.5,
        ty + 1.15,
        side,
        opt.positionOn,
        opt.braking,
        opt.reversing,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        opt.rearFogOn,
        side < 0 ? opt.leftTailBroken : opt.rightTailBroken,
        deform
      );
    }
    return;
  }

  // ==========================================================================
  // C. HEAVY ARTICULATED TANDEM ROLLER (BOMAG BW 161 / HAMM HD+ 120 12T)
  // ==========================================================================
  if (type === 'roller_heavy_tandem') {
    const baseColor = car.color || '#f59e0b';
    const gamma = car.steerAngle || 0;
    const frontDeform = makeArticulatedDeform(deform, gamma);
    const drumW = halfW * 1.84;

    // 1. Center Articulated Hydraulic Pivot Joint + Twin Chrome Steering Rams
    drawRoundedBox(ctx, -3.2, -3.2, 3.2, 3.2, 0.8, '#0f172a', deform, '#475569', 0.5);
    drawDeformedDot(ctx, 0, 0, 1.45, '#475569', deform, '#090d16', 0.45);
    for (const side of [-1, 1] as const) {
      const [fx, fy] = frontDeform(4.8, side * 3.1);
      const [rx, ry] = deform(-4.8, side * 3.1);
      // Draw hydraulic cylinder directly in deformed screen coords
      const id = (x: number, y: number): [number, number] => [x, y];
      drawHydraulicCylinder(ctx, rx, ry, fx, fy, 1.0, '#1e293b', id);
    }

    // 2. FRONT ARTICULATED STEEL DRUM & YOKE FRAME (rotates with steerAngle!)
    const fDrumX = halfL * 0.64;
    drawSteelCompactorDrum(ctx, fDrumX, 0, 9.6, drumW, frontDeform);
    // Front & rear rubber scraper blades + blue pressurized sprinkler spray bar
    strokePoly(ctx, [[fDrumX + 5.1, -drumW * 0.49], [fDrumX + 5.1, drumW * 0.49]], '#090d16', 0.9, frontDeform);
    strokePoly(ctx, [[fDrumX - 5.1, -drumW * 0.49], [fDrumX - 5.1, drumW * 0.49]], '#090d16', 0.9, frontDeform);
    strokePoly(ctx, [[fDrumX + 5.65, -drumW * 0.45], [fDrumX + 5.65, drumW * 0.45]], '#38bdf8', 0.55, frontDeform);

    // Heavy painted front drum yoke cheeks & front crossbar bumper
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        halfL * 0.24,
        side < 0 ? -halfW * 0.98 : halfW * 0.84,
        fX,
        side < 0 ? -halfW * 0.84 : halfW * 0.98,
        0.55,
        shadePaint(baseColor, side < 0 ? 0.08 : -0.10),
        frontDeform,
        '#090d16',
        0.55
      );
      // Drum vibratory motor end-cap hub
      drawDeformedDot(ctx, fDrumX, side * halfW * 0.91, 1.25, '#1e293b', frontDeform, '#64748b', 0.32);
    }
    // Front tapered frame bridge & polyethylene water tank
    fillPoly(
      ctx,
      [
        [fX, -halfW * 0.94],
        [fX, halfW * 0.94],
        [halfL * 0.88, halfW * 0.94],
        [halfL * 0.88, -halfW * 0.94],
      ],
      createBodyMetallicGradient(ctx, halfW, baseColor),
      frontDeform,
      '#090d16',
      0.55
    );
    fillPoly(
      ctx,
      [
        [halfL * 0.36, -halfW * 0.88],
        [halfL * 0.36, halfW * 0.88],
        [halfL * 0.06, halfW * 0.44],
        [halfL * 0.06, -halfW * 0.44],
      ],
      createBodyMetallicGradient(ctx, halfW * 0.85, baseColor),
      frontDeform,
      '#090d16',
      0.58
    );
    // Front black water filler cap + integrated front yoke halogen headlights (xFrac +0.46, yFrac ±0.35)
    drawDeformedDot(ctx, halfL * 0.22, -halfW * 0.28, 0.9, '#0f172a', frontDeform, '#38bdf8', 0.3);
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const hy = side * (halfW * 2) * 0.35;
      drawIntegratedHeadlight(
        ctx,
        fX - 1.85,
        hy - 1.15,
        fX - 0.15,
        hy + 1.15,
        side,
        'rect_commercial',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        broken,
        frontDeform
      );
    }

    // 3. REAR FIXED STEEL DRUM, ENGINE DECK & OPEN YOKE (Drum fully visible!)
    const rDrumX = -halfL * 0.63;
    drawSteelCompactorDrum(ctx, rDrumX, 0, 9.4, drumW, deform);
    // Front & rear rubber scrapers + blue pressurized sprinkler spray bar
    strokePoly(ctx, [[rDrumX + 4.9, -drumW * 0.49], [rDrumX + 4.9, drumW * 0.49]], '#090d16', 0.9, deform);
    strokePoly(ctx, [[rDrumX - 4.9, -drumW * 0.49], [rDrumX - 4.9, drumW * 0.49]], '#090d16', 0.9, deform);
    strokePoly(ctx, [[rDrumX - 5.45, -drumW * 0.45], [rDrumX - 5.45, drumW * 0.45]], '#38bdf8', 0.55, deform);

    // Heavy painted rear drum yoke side arms
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        rX,
        side < 0 ? -halfW * 0.98 : halfW * 0.84,
        -halfL * 0.24,
        side < 0 ? -halfW * 0.84 : halfW * 0.98,
        0.55,
        shadePaint(baseColor, side < 0 ? 0.08 : -0.10),
        deform,
        '#090d16',
        0.55
      );
      drawDeformedDot(ctx, rDrumX, side * halfW * 0.91, 1.25, '#1e293b', deform, '#64748b', 0.32);
    }
    // Rear cross-frame bumper strip ONLY behind the rear drum (leaves steel drum completely visible)
    fillPoly(
      ctx,
      [
        [-halfL * 0.88, -halfW * 0.94],
        [-halfL * 0.88, halfW * 0.94],
        [rX, halfW * 0.94],
        [rX, -halfW * 0.94],
      ],
      createBodyMetallicGradient(ctx, halfW, baseColor),
      deform,
      '#090d16',
      0.55
    );
    // Compact tapered diesel engine bay deck ahead of rear drum (-halfL*0.06 .. -halfL*0.36)
    fillPoly(
      ctx,
      [
        [-halfL * 0.06, -halfW * 0.44],
        [-halfL * 0.06, halfW * 0.44],
        [-halfL * 0.36, halfW * 0.88],
        [-halfL * 0.36, -halfW * 0.88],
      ],
      createBodyMetallicGradient(ctx, halfW * 0.85, baseColor),
      deform,
      '#090d16',
      0.58
    );
    // Engine cooling louver grille & vertical exhaust cap
    drawRoundedBox(ctx, -halfL * 0.33, -halfW * 0.56, -halfL * 0.14, halfW * 0.56, 0.35, '#111827', deform, '#475569', 0.35);
    for (let lx = -halfL * 0.30; lx <= -halfL * 0.17; lx += 1.1) {
      strokePoly(ctx, [[lx, -halfW * 0.48], [lx, halfW * 0.48]], '#475569', 0.36, deform);
    }
    drawDeformedDot(ctx, -halfL * 0.24, -halfW * 0.66, 0.78, '#1e293b', deform, '#94a3b8', 0.32);

    // Integrated rear bumper tail/brake/turn lamps (xFrac -0.46, yFrac ±0.36)
    for (const side of [-1, 1] as const) {
      const ty = side * (halfW * 2) * 0.36;
      drawIntegratedTaillight(
        ctx,
        rX + 0.15,
        ty - 1.2,
        rX + 1.75,
        ty + 1.2,
        side,
        opt.positionOn,
        opt.braking,
        opt.reversing,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        opt.rearFogOn,
        side < 0 ? opt.leftTailBroken : opt.rightTailBroken,
        deform
      );
    }
    return;
  }

  // ==========================================================================
  // D. COMPACT SIDEWALK ROLLER (BOMAG BW 100 / HAMM HD 10 — 2.5T)
  // ==========================================================================
  if (type === 'roller_compact_sidewalk') {
    const baseColor = car.color || '#f59e0b';
    const gamma = car.steerAngle || 0;
    const frontDeform = makeArticulatedDeform(deform, gamma);
    const drumW = halfW * 1.76;

    // Articulated center joint
    drawRoundedBox(ctx, -2.0, -2.1, 2.0, 2.1, 0.5, '#0f172a', deform, '#475569', 0.4);
    drawDeformedDot(ctx, 0, 0, 0.95, '#64748b', deform, '#090d16', 0.35);

    // Front compact steel drum & OPEN yoke (steel drum prominently visible!)
    const fDrumX = halfL * 0.64;
    drawSteelCompactorDrum(ctx, fDrumX, 0, 5.6, drumW, frontDeform);
    strokePoly(ctx, [[fDrumX + 3.05, -drumW * 0.48], [fDrumX + 3.05, drumW * 0.48]], '#090d16', 0.7, frontDeform);
    strokePoly(ctx, [[fDrumX - 3.05, -drumW * 0.48], [fDrumX - 3.05, drumW * 0.48]], '#090d16', 0.7, frontDeform);
    strokePoly(ctx, [[fDrumX + 3.45, -drumW * 0.44], [fDrumX + 3.45, drumW * 0.44]], '#38bdf8', 0.45, frontDeform);

    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        halfL * 0.24,
        side < 0 ? -halfW * 0.96 : halfW * 0.80,
        fX,
        side < 0 ? -halfW * 0.80 : halfW * 0.96,
        0.4,
        shadePaint(baseColor, side < 0 ? 0.08 : -0.10),
        frontDeform,
        '#090d16',
        0.45
      );
      drawDeformedDot(ctx, fDrumX, side * halfW * 0.88, 0.85, '#1e293b', frontDeform, '#64748b', 0.25);
    }
    // Front crossbar bumper strip ONLY ahead of drum + compact engine cowling behind drum
    fillPoly(
      ctx,
      [
        [fX, -halfW * 0.90],
        [fX, halfW * 0.90],
        [halfL * 0.87, halfW * 0.90],
        [halfL * 0.87, -halfW * 0.90],
      ],
      createBodyMetallicGradient(ctx, halfW * 0.9, baseColor),
      frontDeform,
      '#090d16',
      0.48
    );
    fillPoly(
      ctx,
      [
        [halfL * 0.38, -halfW * 0.86],
        [halfL * 0.38, halfW * 0.86],
        [halfL * 0.08, halfW * 0.56],
        [halfL * 0.08, -halfW * 0.56],
      ],
      createBodyMetallicGradient(ctx, halfW * 0.82, baseColor),
      frontDeform,
      '#090d16',
      0.48
    );
    drawRoundedBox(ctx, halfL * 0.14, -halfW * 0.44, halfL * 0.34, halfW * 0.44, 0.28, '#111827', frontDeform, '#475569', 0.28);
    // Integrated front work headlamps (xFrac +0.44, yFrac ±0.34)
    for (const side of [-1, 1] as const) {
      const hy = side * (halfW * 2) * 0.34;
      drawIntegratedHeadlight(
        ctx,
        fX - 1.5,
        hy - 0.8,
        fX - 0.15,
        hy + 0.8,
        side,
        'rect_commercial',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken,
        frontDeform
      );
    }

    // Rear compact steel drum & OPEN rear yoke + compact operator platform ahead of rear drum
    const rDrumX = -halfL * 0.68;
    drawSteelCompactorDrum(ctx, rDrumX, 0, 5.4, drumW, deform);
    strokePoly(ctx, [[rDrumX + 2.95, -drumW * 0.48], [rDrumX + 2.95, drumW * 0.48]], '#090d16', 0.7, deform);
    strokePoly(ctx, [[rDrumX - 2.95, -drumW * 0.48], [rDrumX - 2.95, drumW * 0.48]], '#090d16', 0.7, deform);
    strokePoly(ctx, [[rDrumX - 3.35, -drumW * 0.44], [rDrumX - 3.35, drumW * 0.44]], '#38bdf8', 0.45, deform);

    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        rX,
        side < 0 ? -halfW * 0.96 : halfW * 0.80,
        -halfL * 0.24,
        side < 0 ? -halfW * 0.80 : halfW * 0.96,
        0.4,
        shadePaint(baseColor, side < 0 ? 0.08 : -0.10),
        deform,
        '#090d16',
        0.45
      );
      drawDeformedDot(ctx, rDrumX, side * halfW * 0.88, 0.85, '#1e293b', deform, '#64748b', 0.25);
    }
    // Rear crossbar bumper ONLY behind rear drum + compact cockpit floor ONLY ahead of rear drum
    fillPoly(
      ctx,
      [
        [-halfL * 0.89, -halfW * 0.90],
        [-halfL * 0.89, halfW * 0.90],
        [rX, halfW * 0.90],
        [rX, -halfW * 0.90],
      ],
      createBodyMetallicGradient(ctx, halfW * 0.9, baseColor),
      deform,
      '#090d16',
      0.48
    );
    drawRoundedBox(ctx, -halfL * 0.46, -halfW * 0.84, -halfL * 0.06, halfW * 0.84, 0.5, createBodyMetallicGradient(ctx, halfW * 0.84, baseColor), deform, '#090d16', 0.48);
    // Integrated rear tail/brake/turn lamps (xFrac -0.45, yFrac ±0.36)
    for (const side of [-1, 1] as const) {
      const ty = side * (halfW * 2) * 0.36;
      drawIntegratedTaillight(
        ctx,
        rX + 0.15,
        ty - 0.85,
        rX + 1.35,
        ty + 0.85,
        side,
        opt.positionOn,
        opt.braking,
        opt.reversing,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        opt.rearFogOn,
        side < 0 ? opt.leftTailBroken : opt.rightTailBroken,
        deform
      );
    }
    return;
  }

  // ==========================================================================
  // E. PNEUMATIC TIRE ROLLER (HAMM GRW 280 / Sakai GW750 — Full Ballast Hull)
  // ==========================================================================
  if (type === 'roller_pneumatic') {
    const baseColor = car.color || '#f59e0b';

    // Full-width heavy rectangular ballast steel hull (matches rectangular pneumatic roller silhouette!)
    const hullPts: Pt[] = [
      [fX, -halfW * 0.82],
      [fX - 1.2, -halfW * 0.95],
      [rX + 1.2, -halfW * 0.95],
      [rX, -halfW * 0.82],
      [rX, halfW * 0.82],
      [rX + 1.2, halfW * 0.95],
      [fX - 1.2, halfW * 0.95],
      [fX, halfW * 0.82],
    ];
    fillPoly(ctx, hullPts, createBodyMetallicGradient(ctx, halfW * 0.95, baseColor), deform, '#090d16', 0.85);

    // Side ballast access doors & heavy steel skirt trim
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        -halfL * 0.42,
        side < 0 ? -halfW * 0.92 : halfW * 0.72,
        halfL * 0.36,
        side < 0 ? -halfW * 0.72 : halfW * 0.92,
        0.3,
        shadePaint(baseColor, -0.18),
        deform,
        'rgba(15,23,42,0.5)',
        0.4
      );
      // Hazard stripes on front & rear corners
      drawHazardChevronStrip(
        ctx,
        fX - 2.6,
        side < 0 ? -halfW * 0.92 : halfW * 0.62,
        fX - 0.6,
        side < 0 ? -halfW * 0.62 : halfW * 0.92,
        deform,
        1.3
      );
    }

    // Front sloped diesel engine hood with cooling louver deck & ballast tank hatch
    drawRoundedBox(ctx, halfL * 0.14, -halfW * 0.68, fX - 2.2, halfW * 0.68, 0.75, shadePaint(baseColor, 0.08), deform, '#090d16', 0.55);
    drawRoundedBox(ctx, halfL * 0.34, -halfW * 0.50, fX - 3.2, halfW * 0.50, 0.4, '#111827', deform, '#475569', 0.35);
    for (let lx = halfL * 0.40; lx <= fX - 4.0; lx += 1.55) {
      strokePoly(ctx, [[lx, -halfW * 0.42], [lx, halfW * 0.42]], '#475569', 0.42, deform);
    }
    // Vertical exhaust pipe & water tank cap
    drawDeformedDot(ctx, halfL * 0.24, -halfW * 0.54, 1.0, '#0f172a', deform, '#64748b', 0.35);
    drawDeformedDot(ctx, -halfL * 0.74, 0, 1.25, '#0f172a', deform, '#38bdf8', 0.32);

    // Rear ballast compartment lid hatches
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        -halfL * 0.86,
        side < 0 ? -halfW * 0.72 : halfW * 0.16,
        -halfL * 0.48,
        side < 0 ? -halfW * 0.16 : halfW * 0.72,
        0.4,
        shadePaint(baseColor, -0.06),
        deform,
        'rgba(15,23,42,0.48)',
        0.42
      );
    }

    // Integrated front work headlights (xFrac +0.47, yFrac ±0.38) & rear tail/brake/turn lamps (xFrac -0.47, yFrac ±0.38)
    for (const side of [-1, 1] as const) {
      const hy = side * (halfW * 2) * 0.38;
      drawIntegratedHeadlight(
        ctx,
        fX - 1.9,
        hy - 1.2,
        fX - 0.15,
        hy + 1.2,
        side,
        'rect_commercial',
        opt.headlightsOn,
        opt.highBeam,
        opt.positionOn,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken,
        deform
      );
      drawIntegratedTaillight(
        ctx,
        rX + 0.15,
        hy - 1.2,
        rX + 1.75,
        hy + 1.2,
        side,
        opt.positionOn,
        opt.braking,
        opt.reversing,
        side < 0 ? opt.leftTurn : opt.rightTurn,
        opt.rearFogOn,
        side < 0 ? opt.leftTailBroken : opt.rightTailBroken,
        deform
      );
    }
    return;
  }

  // ==========================================================================
  // F. TRAILER BARREL (AgriTech FarmTank 3.5m³ — РЖТ-3)
  // ==========================================================================
  if (type === 'trailer_barrel') {
    const baseColor = car.color || '#d97706';
    const tankFront = halfL * 0.52;
    const tankRear = -halfL * 0.80;
    const tankW = halfW * 0.72;

    // 1. A-frame drawbar + steel chassis cradle + wheel mudguards
    drawAFrameDrawbar(ctx, tankFront - 1.0, fX, tankW * 0.78, deform, true);
    drawRoundedBox(ctx, tankRear - 1.6, -tankW * 0.86, tankFront, tankW * 0.86, 0.4, '#1e293b', deform, '#090d16', 0.5);
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        -halfL * 0.44,
        side < 0 ? -halfW * 0.98 : halfW * 0.74,
        halfL * 0.18,
        side < 0 ? -halfW * 0.74 : halfW * 0.98,
        0.55,
        '#334155',
        deform,
        '#090d16',
        0.45
      );
    }

    // 2. Cylindrical steel barrel tank with cylindrical highlight & stiffening hoops
    const barrelPts: Pt[] = [
      [tankFront + 0.6, -tankW * 0.78],
      [tankFront - 0.8, -tankW],
      [tankRear + 0.8, -tankW],
      [tankRear - 0.6, -tankW * 0.78],
      [tankRear - 0.6, tankW * 0.78],
      [tankRear + 0.8, tankW],
      [tankFront - 0.8, tankW],
      [tankFront + 0.6, tankW * 0.78],
    ];
    fillPoly(ctx, barrelPts, createCylindricalGradient(ctx, -tankW, tankW, baseColor, 0.34), deform, '#090d16', 0.75);

    // 3 rolled steel saddle stiffening rings around barrel
    for (const bx of [tankFront - 2.6, (tankFront + tankRear) * 0.5, tankRear + 2.6]) {
      strokePoly(ctx, [[bx, -tankW], [bx, tankW]], '#0f172a', 1.1, deform);
      strokePoly(ctx, [[bx + 0.35, -tankW * 0.92], [bx + 0.35, tankW * 0.92]], 'rgba(255,255,255,0.22)', 0.35, deform);
    }

    // Rear steel bumper bar + red cat-eye reflectors + triangles + brass discharge tap & coiled hose
    drawRoundedBox(ctx, rX, -tankW * 0.92, rX + 1.4, tankW * 0.92, 0.3, '#1e293b', deform, '#090d16', 0.45);
    for (const side of [-1, 1] as const) {
      drawEceRedTriangle(ctx, rX + 0.7, side * tankW * 0.55, 1.35, deform);
    }
    // Brass discharge spigot & cross-handle valve
    strokePoly(ctx, [[tankRear - 0.5, 0], [rX - 0.3, 0]], '#ca8a04', 1.0, deform);
    strokePoly(ctx, [[rX + 0.3, -1.1], [rX + 0.3, 1.1]], '#dc2626', 0.65, deform);
    return;
  }

  // ==========================================================================
  // G. TRAILER VACUUM (AgriTech SlurryVac Tanker — МЖТ-6)
  // ==========================================================================
  if (type === 'trailer_vacuum') {
    const baseColor = car.color || '#15803d';
    const tankFront = halfL * 0.54;
    const tankRear = -halfL * 0.82;
    const tankW = halfW * 0.72;

    // 1. A-frame drawbar + rotary vacuum compressor pump & oil trap
    drawAFrameDrawbar(ctx, tankFront - 1.2, fX, tankW * 0.80, deform, true);
    drawRoundedBox(ctx, tankFront + 0.8, -2.1, tankFront + 4.4, 2.1, 0.4, '#334155', deform, '#090d16', 0.45);
    // Finned compressor barrel & PTO input shaft
    strokePoly(ctx, [[tankFront + 4.4, 0], [fX - 1.5, 0]], '#94a3b8', 0.75, deform);
    for (let cx = tankFront + 1.4; cx <= tankFront + 3.8; cx += 0.75) {
      strokePoly(ctx, [[cx, -1.7], [cx, 1.7]], '#0f172a', 0.35, deform);
    }

    // 2. Chassis frame & twin galvanized steel side hose trays with corrugated black suction hoses
    drawRoundedBox(ctx, rX + 1.2, -tankW * 0.90, tankFront, tankW * 0.90, 0.4, '#1e293b', deform, '#090d16', 0.5);
    for (const side of [-1, 1] as const) {
      const trayY = side * (halfW * 0.86);
      drawRoundedBox(ctx, tankRear + 1.5, trayY - 1.05, tankFront - 1.0, trayY + 1.05, 0.3, '#64748b', deform, '#0f172a', 0.4);
      // Corrugated black rubber suction hose inside tray
      strokePoly(ctx, [[tankRear + 2.0, trayY], [tankFront - 1.5, trayY]], '#090d16', 1.45, deform);
      for (let hx = tankRear + 2.6; hx < tankFront - 2.0; hx += 1.4) {
        strokePoly(ctx, [[hx, trayY - 0.65], [hx, trayY + 0.65]], '#334155', 0.38, deform);
      }
    }

    // 3. Hemispherical-domed glossy pressure tank with cylindrical sheen & 3 saddle bands
    const vacPts: Pt[] = [
      [tankFront + 1.4, -tankW * 0.42],
      [tankFront + 0.4, -tankW * 0.82],
      [tankFront - 1.4, -tankW],
      [tankRear + 1.4, -tankW],
      [tankRear - 0.4, -tankW * 0.82],
      [tankRear - 1.4, -tankW * 0.42],
      [tankRear - 1.4, tankW * 0.42],
      [tankRear - 0.4, tankW * 0.82],
      [tankRear + 1.4, tankW],
      [tankFront - 1.4, tankW],
      [tankFront + 0.4, tankW * 0.82],
      [tankFront + 1.4, tankW * 0.42],
    ];
    fillPoly(ctx, vacPts, createCylindricalGradient(ctx, -tankW, tankW, baseColor, 0.36), deform, '#090d16', 0.78);
    for (const bx of [tankFront - 3.2, (tankFront + tankRear) * 0.5, tankRear + 3.2]) {
      strokePoly(ctx, [[bx, -tankW], [bx, tankW]], '#0f172a', 1.1, deform);
      strokePoly(ctx, [[bx + 0.35, -tankW * 0.9], [bx + 0.35, tankW * 0.9]], 'rgba(255,255,255,0.22)', 0.35, deform);
    }

    // 4. Rear underride ECE bumper with integrated lamps (xFrac -0.47, yFrac ±0.34) + hydraulic gate valve
    drawTrailerRearEceBumper(ctx, rX, halfW, (halfW * 2) * 0.34, opt, deform, {
      bumperHalfW: halfW * 0.88,
      hasMudflaps: true,
      hasTriangles: true,
    });
    drawDeformedDot(ctx, tankRear - 1.2, 0, 1.05, '#cbd5e1', deform, '#090d16', 0.38);
    drawDeformedDot(ctx, tankRear - 1.2, 0, 0.55, '#0f172a', deform);
    return;
  }

  // ==========================================================================
  // H. 2-AXLE FARM DUMP TRAILER (AgriTech AgriDump 4T — 2-PTS-4)
  // ==========================================================================
  if (type === 'trailer_flatbed_2axle') {
    const baseColor = car.color || '#3f6212';
    const boxFront = halfL * 0.68;
    const boxRear = -halfL * 0.94;
    const boxW = halfW * 0.95;

    // 1. Articulated Front Turntable Dolly & Forged A-Frame Drawbar (rotates with trailerDollyAngle!)
    const dollyAngle = car.trailerDollyAngle || 0;
    const dollyX = halfL * 0.44;
    const cD = Math.cos(dollyAngle);
    const sD = Math.sin(dollyAngle);
    const dollyDeform: DeformFn = (lx, ly) => {
      const dx = lx - dollyX;
      return deform(dollyX + dx * cD - ly * sD, dx * sD + ly * cD);
    };
    drawAFrameDrawbar(ctx, dollyX + 2.5, fX, boxW * 0.44, dollyDeform, false);

    // 2. Heavy Steel Ladder Chassis + Drop-Side Corrugated Dump Bed
    drawRoundedBox(ctx, boxRear, -boxW, boxFront, boxW, 0.55, shadePaint(baseColor, -0.18), deform, '#090d16', 0.85);
    // Weathered timber-and-steel cargo floor inside bed walls
    drawWoodPlankDeck(ctx, boxRear + 1.2, -boxW + 1.2, boxFront - 1.2, boxW - 1.2, 2.35, '#785a3a', deform);
    // Transverse steel floor ribs & central hydraulic tipping ram boss
    for (let rx = boxRear + 5.5; rx < boxFront - 3.0; rx += 6.5) {
      strokePoly(ctx, [[rx, -boxW + 1.2], [rx, boxW - 1.2]], 'rgba(15,23,42,0.34)', 0.5, deform);
    }
    drawDeformedDot(ctx, -halfL * 0.06, 0, 1.4, '#334155', deform, '#090d16', 0.35);

    // Painted corrugated steel sideboards & stake posts + corner latch pins
    for (const side of [-1, 1] as const) {
      const y1 = side < 0 ? -boxW : boxW - 1.25;
      const y2 = side < 0 ? -boxW + 1.25 : boxW;
      drawRoundedBox(ctx, boxRear, y1, boxFront, y2, 0.2, shadePaint(baseColor, side < 0 ? 0.14 : -0.14), deform, '#090d16', 0.4);
      for (let px = boxRear + 1.0; px <= boxFront - 0.5; px += 7.2) {
        drawRoundedBox(ctx, px - 0.45, y1 - 0.15, px + 0.45, y2 + 0.15, 0.12, shadePaint(baseColor, -0.25), deform);
      }
    }
    // Front bulkhead & rear hinged tailgate board
    drawRoundedBox(ctx, boxFront - 1.25, -boxW, boxFront, boxW, 0.2, shadePaint(baseColor, 0.08), deform, '#090d16', 0.45);
    drawRoundedBox(ctx, boxRear, -boxW, boxRear + 1.25, boxW, 0.2, shadePaint(baseColor, -0.06), deform, '#090d16', 0.45);

    // Rear ECE bumper + lamps (xFrac -0.47, yFrac ±0.37)
    drawTrailerRearEceBumper(ctx, rX, halfW, (halfW * 2) * 0.37, opt, deform, {
      bumperHalfW: boxW * 0.94,
      hasMudflaps: true,
      hasTriangles: true,
    });
    return;
  }

  // ==========================================================================
  // I. SEMI-TRAILER FLATBED (IronForge Prime 13.6m Flatbed)
  // ==========================================================================
  if (type === 'trailer_semi') {
    const baseColor = car.color || '#334155';
    const deckFront = halfL * 0.92;
    const deckRear = -halfL * 0.95;
    const deckW = halfW * 0.96;

    // Outer steel perimeter rub-rail chassis frame
    drawRoundedBox(ctx, deckRear, -deckW, halfL * 0.97, deckW, 0.65, shadePaint(baseColor, -0.18), deform, '#090d16', 0.85);
    // Weathered oak timber plank deck with steel longitudinal deck stringers
    drawWoodPlankDeck(ctx, deckRear + 1.4, -deckW + 1.2, deckFront, deckW - 1.2, 2.35, '#856442', deform);

    // Transverse galvanized cross-bolsters, stake pockets & orange cargo tie-down straps
    for (let bx = deckRear + 7.0; bx < deckFront - 4.0; bx += 9.5) {
      strokePoly(ctx, [[bx, -deckW + 1.1], [bx, deckW - 1.1]], 'rgba(30,41,59,0.45)', 0.55, deform);
      for (const side of [-1, 1] as const) {
        drawRoundedBox(ctx, bx - 0.6, side * (deckW - 0.55) - 0.42, bx + 0.6, side * (deckW - 0.55) + 0.42, 0.12, '#0f172a', deform);
      }
    }
    // Two neatly cinched orange ratchet tie-down straps stowed across deck
    for (const sx of [halfL * 0.38, -halfL * 0.22]) {
      strokePoly(ctx, [[sx, -deckW + 0.4], [sx, deckW - 0.4]], '#ea580c', 0.85, deform);
      drawRoundedBox(ctx, sx - 0.6, deckW - 1.6, sx + 0.6, deckW - 0.3, 0.12, '#cbd5e1', deform, '#090d16', 0.22);
    }

    // Tall reinforced corrugated steel front headboard bulkhead + gladhand air coils
    drawRoundedBox(ctx, deckFront, -deckW, halfL * 0.97, deckW, 0.5, createBodyMetallicGradient(ctx, deckW, baseColor), deform, '#090d16', 0.65);
    for (const gy of [-deckW * 0.58, -deckW * 0.22, deckW * 0.22, deckW * 0.58]) {
      drawRoundedBox(ctx, deckFront + 0.3, gy - 0.5, halfL * 0.96, gy + 0.5, 0.12, shadePaint(baseColor, -0.25), deform);
    }
    drawDeformedDot(ctx, halfL * 0.98, -2.1, 0.52, '#dc2626', deform, '#090d16', 0.25);
    drawDeformedDot(ctx, halfL * 0.98, 2.1, 0.52, '#facc15', deform, '#090d16', 0.25);

    drawSemiSideDetails(ctx, halfL, halfW, opt, !!car.towedById, deform, false);
    drawTrailerRearEceBumper(ctx, rX, halfW, (halfW * 2) * 0.38, opt, deform, {
      bumperHalfW: deckW * 0.95,
      hasMudflaps: true,
      hasTriangles: true,
    });
    return;
  }

  // ==========================================================================
  // J. SEMI-TRAILER REEFER BOX (IronForge Thermo Reefer 13.6m)
  // ==========================================================================
  if (type === 'trailer_semi_box') {
    const baseColor = car.color || '#f8fafc';
    const boxFront = halfL * 0.91;
    const boxRear = -halfL * 0.96;
    const boxW = halfW * 0.96;

    // 1. Nose-mounted Thermo-King refrigeration pod with recessed mesh & status LED
    drawBoxShadow(ctx, boxFront, -boxW * 0.58, halfL * 0.995, boxW * 0.58, 0.8, -0.6, 0.5, 0.24, deform);
    drawRoundedBox(ctx, boxFront - 0.5, -boxW * 0.56, halfL * 0.99, boxW * 0.56, 0.85, '#e2e8f0', deform, '#334155', 0.55);
    drawRoundedBox(ctx, boxFront + 1.2, -boxW * 0.42, halfL * 0.96, boxW * 0.42, 0.4, '#111827', deform);
    for (const fy of [-boxW * 0.22, boxW * 0.22]) {
      drawDeformedDot(ctx, boxFront + 2.8, fy, 1.35, '#1e293b', deform, '#64748b', 0.32);
    }
    // Green Thermo-King refrigeration active status LED
    drawDeformedDot(ctx, halfL * 0.96, -boxW * 0.46, 0.48, '#22c55e', deform, '#090d16', 0.2);

    // 2. Insulated White Gelcoat Reefer Box Body + Brushed Aluminum Corner Extrusions
    drawRoundedBox(
      ctx,
      boxRear,
      -boxW,
      boxFront,
      boxW,
      0.85,
      createRoofGradient(ctx, boxW, baseColor),
      deform,
      '#1e293b',
      0.8
    );
    // Brushed aluminum perimeter roof rails
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[boxRear + 0.8, side * (boxW - 0.65)], [boxFront - 0.8, side * (boxW - 0.65)]], '#cbd5e1', 0.95, deform);
    }
    // Transverse insulated composite roof panel seams
    for (let sx = boxRear + 12; sx < boxFront - 6; sx += 13.5) {
      strokePoly(ctx, [[sx, -boxW + 1.0], [sx, boxW - 1.0]], 'rgba(15,23,42,0.18)', 0.45, deform);
      strokePoly(ctx, [[sx + 0.45, -boxW + 1.0], [sx + 0.45, boxW - 1.0]], 'rgba(255,255,255,0.28)', 0.32, deform);
    }
    // Subtle clean transit / cold-chain roof chevron accent
    fillPoly(
      ctx,
      [
        [halfL * 0.64, -boxW * 0.72],
        [halfL * 0.56, -boxW * 0.72],
        [halfL * 0.64, 0],
        [halfL * 0.56, boxW * 0.72],
        [halfL * 0.64, boxW * 0.72],
        [halfL * 0.72, 0],
      ],
      'rgba(2,132,199,0.24)',
      deform
    );

    // Rear stainless barn-door header with 4 vertical cam-lock rod latches + outline markers
    for (const ly of [-boxW * 0.60, -boxW * 0.22, boxW * 0.22, boxW * 0.60]) {
      drawRoundedBox(ctx, boxRear - 0.35, ly - 0.38, boxRear + 0.95, ly + 0.38, 0.12, '#94a3b8', deform, '#0f172a', 0.25);
    }
    for (const side of [-1, 1] as const) {
      drawDeformedDot(ctx, boxRear + 0.8, side * (boxW - 0.9), 0.52, opt.positionOn ? '#ef4444' : '#7f1d1d', deform);
      drawDeformedDot(ctx, boxFront - 0.8, side * (boxW - 0.9), 0.52, opt.positionOn ? '#fef9c3' : '#94a3b8', deform);
    }

    drawSemiSideDetails(ctx, halfL, halfW, opt, !!car.towedById, deform, false);
    drawTrailerRearEceBumper(ctx, rX, halfW, (halfW * 2) * 0.38, opt, deform, {
      bumperHalfW: boxW * 0.95,
      hasMudflaps: true,
      hasTriangles: true,
    });
    return;
  }

  // ==========================================================================
  // K. SEMI-TRAILER FUEL TANKER (IronForge Hazmat 30m³)
  // ==========================================================================
  if (type === 'trailer_semi_tanker') {
    const baseColor = car.color || '#e2e8f0';
    const tankFront = halfL * 0.94;
    const tankRear = -halfL * 0.93;
    const tankW = halfW * 0.88;

    // Underlying dark chassis rail skirts + side vapor-recovery discharge cabinet & hose tube
    drawRoundedBox(ctx, tankRear - 0.8, -halfW * 0.92, halfL * 0.90, halfW * 0.92, 0.5, '#1e293b', deform, '#090d16', 0.6);
    drawRoundedBox(ctx, -halfL * 0.16, halfW * 0.72, halfL * 0.18, halfW * 0.97, 0.3, '#475569', deform, '#090d16', 0.4);
    drawRoundedBox(ctx, -halfL * 0.42, -halfW * 0.96, halfL * 0.34, -halfW * 0.78, 0.35, '#94a3b8', deform, '#0f172a', 0.35);

    // Cylindrical/elliptical stainless-aluminum fuel barrel with smooth hemispherical end caps
    const tankPts: Pt[] = [
      [tankFront + 1.2, -tankW * 0.52],
      [tankFront, -tankW * 0.88],
      [tankFront - 2.2, -tankW],
      [tankRear + 2.2, -tankW],
      [tankRear, -tankW * 0.88],
      [tankRear - 1.2, -tankW * 0.52],
      [tankRear - 1.2, tankW * 0.52],
      [tankRear, tankW * 0.88],
      [tankRear + 2.2, tankW],
      [tankFront - 2.2, tankW],
      [tankFront, tankW * 0.88],
      [tankFront + 1.2, tankW * 0.52],
    ];
    fillPoly(ctx, tankPts, createCylindricalGradient(ctx, -tankW, tankW, baseColor, 0.40), deform, '#090d16', 0.85);

    // 5 structural compartment baffle stiffening rings
    for (const rx of [halfL * 0.62, halfL * 0.30, 0, -halfL * 0.30, -halfL * 0.62]) {
      strokePoly(ctx, [[rx, -tankW], [rx, tankW]], '#1e293b', 1.05, deform);
      strokePoly(ctx, [[rx + 0.45, -tankW * 0.92], [rx + 0.45, tankW * 0.92]], 'rgba(255,255,255,0.28)', 0.38, deform);
    }

    // Orange ADR Hazmat Placards on flanks & rear dome
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, halfL * 0.10, side * (tankW - 1.15) - 0.65, halfL * 0.22, side * (tankW - 1.15) + 0.65, 0.15, '#ea580c', deform, '#090d16', 0.3);
    }
    drawRoundedBox(ctx, tankRear - 0.6, -1.6, tankRear + 1.0, 1.6, 0.15, '#ea580c', deform, '#090d16', 0.3);

    drawSemiSideDetails(ctx, halfL, halfW, opt, !!car.towedById, deform, false);
    drawTrailerRearEceBumper(ctx, rX, halfW, (halfW * 2) * 0.38, opt, deform, {
      bumperHalfW: halfW * 0.92,
      hasMudflaps: true,
      hasTriangles: true,
    });
    return;
  }

  // ==========================================================================
  // L. SEMI-TRAILER 40ft ISO CONTAINER (IronForge Intermodal)
  // ==========================================================================
  if (type === 'trailer_semi_container') {
    const baseColor = car.color || '#1d4ed8';
    const cFront = halfL * 0.94;
    const cRear = -halfL * 0.95;
    const cW = halfW * 0.94;

    // Black skeletal container chassis visible at gooseneck front & rear bolster
    drawRoundedBox(ctx, rX + 0.5, -halfW * 0.92, halfL * 0.98, halfW * 0.92, 0.5, '#111827', deform, '#020617', 0.65);

    // 40ft Corrugated Corten-Steel ISO Shipping Container
    drawRoundedBox(ctx, cRear, -cW, cFront, cW, 0.45, createRoofGradient(ctx, cW, baseColor), deform, '#090d16', 0.85);
    // Crisp transverse stamped roof corrugations along entire 40ft container roof
    drawCorrugatedDeck(ctx, cRear + 2.4, -cW + 1.1, cFront - 2.4, cW - 1.1, 3.2, 'transverse', deform, 0.20, 0.30);

    // Reinforced longitudinal top header rails
    for (const side of [-1, 1] as const) {
      strokePoly(ctx, [[cRear + 1.0, side * (cW - 0.75)], [cFront - 1.0, side * (cW - 0.75)]], shadePaint(baseColor, -0.25), 0.95, deform);
    }

    // 4 High-Visibility Gold/Yellow ISO Twist-Lock Corner Castings
    for (const cx of [cFront - 1.4, cRear + 1.4]) {
      for (const side of [-1, 1] as const) {
        drawRoundedBox(
          ctx,
          cx - 1.25,
          side < 0 ? -cW : cW - 2.1,
          cx + 1.25,
          side < 0 ? -cW + 2.1 : cW,
          0.2,
          '#facc15',
          deform,
          '#090d16',
          0.35
        );
        drawDeformedDot(ctx, cx, side * (cW - 1.05), 0.42, '#090d16', deform);
      }
    }

    // Subtle shipping line identification roof stripe & rear container lock bars
    drawRoundedBox(ctx, halfL * 0.34, -cW * 0.52, halfL * 0.56, cW * 0.52, 0.25, 'rgba(255,255,255,0.14)', deform);
    for (const ly of [-cW * 0.58, -cW * 0.22, cW * 0.22, cW * 0.58]) {
      drawRoundedBox(ctx, cRear - 0.35, ly - 0.36, cRear + 0.85, ly + 0.36, 0.12, '#cbd5e1', deform, '#090d16', 0.25);
    }

    drawSemiSideDetails(ctx, halfL, halfW, opt, !!car.towedById, deform, false);
    drawTrailerRearEceBumper(ctx, rX, halfW, (halfW * 2) * 0.38, opt, deform, {
      bumperHalfW: cW * 0.96,
      hasMudflaps: true,
      hasTriangles: true,
    });
    return;
  }

  // ==========================================================================
  // M. SEMI-TRAILER LOWBOY 40T (IronForge Titan Lowboy)
  // ==========================================================================
  if (type === 'trailer_semi_lowboy') {
    const baseColor = car.color || '#ca8a04';
    const neckFront = halfL * 0.96;
    const neckRear = halfL * 0.58;
    const wellFront = halfL * 0.48;
    const wellRear = -halfL * 0.42;
    const bogieRear = -halfL * 0.86;
    const deckW = halfW * 0.96;

    // 1. Main Ultra-Low Heavy Cargo Well (-0.42L .. +0.48L)
    drawRoundedBox(ctx, wellRear, -deckW, wellFront, deckW, 0.45, shadePaint(baseColor, -0.18), deform, '#090d16', 0.85);
    // Outrigger oak timber plank runways left & right + central steel I-beam spine
    drawWoodPlankDeck(ctx, wellRear + 0.8, -deckW + 1.1, wellFront - 0.8, -halfW * 0.28, 2.2, '#7c5d3b', deform);
    drawWoodPlankDeck(ctx, wellRear + 0.8, halfW * 0.28, wellFront - 0.8, deckW - 1.1, 2.2, '#7c5d3b', deform);
    drawTreadplateSurface(ctx, wellRear, -halfW * 0.28, wellFront, halfW * 0.28, '#334155', deform, 2.6);

    // Forged steel D-ring tie-down eyes along outer lowboy deck flange
    for (let dx = wellRear + 5.5; dx < wellFront - 3.5; dx += 8.8) {
      for (const side of [-1, 1] as const) {
        drawDeformedDot(ctx, dx, side * (deckW - 0.7), 0.62, '#0f172a', deform, '#cbd5e1', 0.28);
      }
    }

    // 2. Stepped Gooseneck Transition Beams (+0.48L .. +0.58L)
    for (const side of [-1, 1] as const) {
      drawRoundedBox(
        ctx,
        wellFront - 0.5,
        side < 0 ? -deckW * 0.72 : deckW * 0.34,
        neckRear + 0.8,
        side < 0 ? -deckW * 0.34 : deckW * 0.72,
        0.3,
        shadePaint(baseColor, -0.05),
        deform,
        '#090d16',
        0.55
      );
    }

    // 3. Raised Hydraulic Gooseneck Deck (+0.58L .. +0.96L) with Winch Drum & Cable Spool
    drawRoundedBox(ctx, neckRear, -deckW * 0.90, neckFront, deckW * 0.90, 0.65, createBodyMetallicGradient(ctx, deckW * 0.9, baseColor), deform, '#090d16', 0.75);
    drawTreadplateSurface(ctx, neckRear + 1.5, -deckW * 0.76, neckFront - 1.5, deckW * 0.76, '#334155', deform, 2.4);
    // Heavy hydraulic recovery winch drum spooled with steel cable
    drawRoundedBox(ctx, neckRear + 3.2, -deckW * 0.42, neckRear + 7.2, deckW * 0.42, 0.35, '#1e293b', deform, '#090d16', 0.45);
    for (let wy = -deckW * 0.34; wy <= deckW * 0.34; wy += 0.85) {
      strokePoly(ctx, [[neckRear + 3.7, wy], [neckRear + 6.7, wy]], '#94a3b8', 0.38, deform);
    }
    // Tool chest & spare hydraulic hose reel on gooseneck front
    drawRoundedBox(ctx, neckFront - 6.0, -deckW * 0.66, neckFront - 1.8, -deckW * 0.14, 0.3, '#1e293b', deform, '#475569', 0.35);
    drawRoundedBox(ctx, neckFront - 6.0, deckW * 0.14, neckFront - 1.8, deckW * 0.66, 0.3, '#1e293b', deform, '#475569', 0.35);

    // 4. Raised Tri-Axle Rear Bogie Deck (-0.86L .. -0.42L)
    drawRoundedBox(ctx, bogieRear, -deckW, wellRear + 0.5, deckW, 0.5, createBodyMetallicGradient(ctx, deckW, baseColor), deform, '#090d16', 0.75);
    drawTreadplateSurface(ctx, bogieRear + 1.4, -deckW * 0.86, wellRear - 0.8, deckW * 0.86, '#334155', deform, 2.5);

    // 5. Twin Hydraulic Folding Rear Loading Ramps (-0.99L .. -0.86L) with Hazard Chevrons!
    for (const side of [-1, 1] as const) {
      const ry1 = side < 0 ? -deckW * 0.92 : deckW * 0.12;
      const ry2 = side < 0 ? -deckW * 0.12 : deckW * 0.92;
      drawBoxShadow(ctx, rX, ry1, bogieRear + 0.6, ry2, 0.35, -0.5, 0.5, 0.25, deform);
      drawHazardChevronStrip(ctx, rX, ry1, bogieRear + 0.6, ry2, deform, 2.2);
      // Hydraulic ramp lift cylinder
      drawHydraulicCylinder(ctx, bogieRear + 4.5, (ry1 + ry2) * 0.5, bogieRear - 0.6, (ry1 + ry2) * 0.5, 0.95, '#1e293b', deform);
    }

    // Rear wide-load flashing amber warning beacon & ECE lamps (xFrac -0.48, yFrac ±0.39)
    drawAmberBeacon(ctx, bogieRear + 2.2, 0, 1.35, opt.positionOn || opt.roadTrainOn, deform, nowSec);
    drawSemiSideDetails(ctx, halfL, halfW, opt, !!car.towedById, deform, true);
    drawTrailerRearEceBumper(ctx, rX, halfW, (halfW * 2) * 0.39, opt, deform, {
      bumperHalfW: deckW * 0.96,
      hasMudflaps: false,
      hasTriangles: true,
      hasLicensePlate: false,
    });
  }
}

// ============================================================================
// 3. UPPER LAYER (CABS, CANOPIES, ROPS ARCHES, TANKER CATWALKS, BEACONS)
// ============================================================================

export function renderHeavyEquipmentUpperLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const type = car.type;
  const opt = getLiveOpticsState(car);
  const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
  const litMach = opt.ignitionOn || opt.positionOn || opt.headlightsOn;

  // ==========================================================================
  // A. TRACTORS UPPER (MTZ-82/80 Wide UK Cab vs MTZ-80 Veteran Small MK Cab)
  // ==========================================================================
  if (type === 'tractor_mtz82' || type === 'tractor_mtz80' || type === 'tractor_mtz80_old') {
    const is82 = type === 'tractor_mtz82';
    const isOld = type === 'tractor_mtz80_old';
    const baseColor = car.color || (isOld ? '#2563eb' : is82 ? '#0284c7' : '#dc2626');

    const cabX1 = -halfL * 0.62;
    const cabX2 = halfL * 0.06;
    const cabW = isOld ? halfW * 0.56 : halfW * 0.72;

    // 1. Cast shadow under cab overhang
    drawBoxShadow(ctx, cabX1, -cabW, cabX2, cabW, 0.9, -0.65, 0.65, 0.28, deform);

    // 2. Panoramic Safety Glass Greenhouse (tinted glass + visible tractor seat & steering wheel)
    drawRoundedBox(
      ctx,
      cabX1,
      -cabW,
      cabX2,
      cabW,
      0.9,
      createGlassGradient(ctx, cabX2, -cabW, cabX1, cabW, isOld ? 'green' : 'blue'),
      deform,
      '#090d16',
      0.68
    );
    drawCabinInteriorHint(ctx, cabX2 - 1.5, cabX1 + 4.0, cabW * 0.80, deform, {
      driverY: 0,
      dualFrontSeats: false,
      wheelRadius: 1.55,
    });
    drawGlassGlint(ctx, cabX1 + 0.8, -cabW * 0.85, cabX2 - 0.6, cabW * 0.85, 0.14, deform);

    // 4 Corner steel safety ROPS pillars
    for (const px of [cabX1 + 0.5, cabX2 - 0.5]) {
      for (const side of [-1, 1] as const) {
        drawDeformedDot(ctx, px, side * (cabW - 0.5), 0.58, '#0f172a', deform);
      }
    }

    // 3. Cab Roof Panel (White molded fiberglass on UK MTZ-82/80; body-colored steel roof on MK Veteran!)
    const roofW = cabW * 0.84;
    const roofX1 = cabX1 + 1.1;
    const roofX2 = cabX2 - 1.2;
    const roofColor = isOld ? shadePaint(baseColor, 0.10) : is82 ? '#f8fafc' : '#f1f5f9';
    drawRoundedBox(
      ctx,
      roofX1,
      -roofW,
      roofX2,
      roofW,
      isOld ? 0.75 : 1.25,
      createRoofGradient(ctx, roofW, roofColor),
      deform,
      '#1e293b',
      0.6
    );

    if (isOld) {
      // Classic small MK cab: ribbed canvas/steel ventilation roof hatch + vintage single front spot
      drawRoundedBox(ctx, roofX1 + 1.4, -roofW * 0.58, roofX2 - 1.4, roofW * 0.58, 0.35, shadePaint(baseColor, -0.08), deform, '#1e293b', 0.42);
      drawRoundedBox(ctx, roofX2 - 0.2, -1.1, roofX2 + 0.7, 1.1, 0.2, opt.headlightsOn ? '#fef3c7' : '#cbd5e1', deform, '#090d16', 0.28);
    } else {
      // Modern UK panoramic cab: flip-up roof sunroof hatch + 4 front/rear halogen work floodlights
      drawRoundedBox(ctx, roofX1 + 1.6, -roofW * 0.56, roofX2 - 1.8, roofW * 0.56, 0.45, '#e2e8f0', deform, '#475569', 0.42);
      for (const side of [-1, 1] as const) {
        // Front roof work lamps
        drawRoundedBox(
          ctx,
          roofX2 - 0.1,
          side * roofW * 0.56 - 0.75,
          roofX2 + 0.85,
          side * roofW * 0.56 + 0.75,
          0.2,
          opt.headlightsOn ? '#fef3c7' : '#94a3b8',
          deform,
          '#090d16',
          0.28
        );
        // Rear implement work lamps
        drawRoundedBox(
          ctx,
          roofX1 - 0.8,
          side * roofW * 0.54 - 0.65,
          roofX1 + 0.1,
          side * roofW * 0.54 + 0.65,
          0.2,
          opt.reversing || opt.headlightsOn ? '#fef3c7' : '#64748b',
          deform,
          '#090d16',
          0.25
        );
      }
    }

    // Side cab mirrors on outrigger stalks
    for (const side of [-1, 1] as const) {
      drawSideMirrorArm(ctx, cabX2 - 0.8, side * cabW, side, isOld ? 1.8 : 2.1, 1.75, 0.9, '#1e293b', deform);
    }

    // Flashing roof amber beacon synced with renderer.ts (bX = -halfL * 0.10)
    drawAmberBeacon(ctx, -halfL * 0.10, isOld ? 0 : -roofW * 0.44, 1.25, litMach, deform, nowSec);
    return;
  }

  // ==========================================================================
  // B. ASPHALT PAVER UPPER (Dual Operator Consoles, Weather Canopy, Beacons)
  // ==========================================================================
  if (type === 'paver_asphalt_wheeled') {
    const baseColor = car.color || '#eab308';
    const cX1 = -halfL * 0.62;
    const cX2 = -halfL * 0.24;
    const cW = halfW * 0.82;

    // Dual sliding operator consoles & swivel seats visible under canopy edges
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, -halfL * 0.52, side * cW * 0.62 - 1.5, -halfL * 0.34, side * cW * 0.62 + 1.5, 0.5, '#18181b', deform, '#475569', 0.35);
      drawDeformedDot(ctx, -halfL * 0.31, side * cW * 0.62, 1.05, '#0f172a', deform, '#cbd5e1', 0.35);
    }

    // Cast shadow under elevated weather canopy roof
    drawBoxShadow(ctx, cX1, -cW, cX2, cW, 0.9, -0.85, 0.75, 0.32, deform);
    // Steel 4-post canopy roof with transverse stiffening ribs
    drawRoundedBox(
      ctx,
      cX1,
      -cW,
      cX2,
      cW,
      0.9,
      createRoofGradient(ctx, cW, shadePaint(baseColor, 0.14)),
      deform,
      '#090d16',
      0.65
    );
    drawCorrugatedDeck(ctx, cX1 + 1.2, -cW + 0.9, cX2 - 1.2, cW - 0.9, 2.5, 'longitudinal', deform, 0.15, 0.20);

    // Front & rear canopy halogen floodlights
    for (const side of [-1, 1] as const) {
      drawRoundedBox(ctx, cX2 - 0.2, side * cW * 0.58 - 0.7, cX2 + 0.75, side * cW * 0.58 + 0.7, 0.2, opt.headlightsOn ? '#fef3c7' : '#94a3b8', deform, '#090d16', 0.25);
      drawRoundedBox(ctx, cX1 - 0.75, side * cW * 0.58 - 0.7, cX1 + 0.2, side * cW * 0.58 + 0.7, 0.2, opt.headlightsOn || opt.reversing ? '#fef3c7' : '#94a3b8', deform, '#090d16', 0.25);
    }

    // Flashing amber beacon synced with renderer.ts (bX = -halfL * 0.42)
    drawAmberBeacon(ctx, -halfL * 0.42, 0, 1.45, litMach, deform, nowSec);
    return;
  }

  // ==========================================================================
  // C. HEAVY TANDEM ROLLER UPPER (Operator Swivel Station, ROPS Canopy, Beacon)
  // ==========================================================================
  if (type === 'roller_heavy_tandem') {
    const baseColor = car.color || '#f59e0b';
    const cX1 = -halfL * 0.38;
    const cX2 = halfL * 0.16;
    const cW = halfW * 0.68;

    // Operator cockpit console & swivel seat peeking under canopy
    drawRoundedBox(ctx, cX1 + 1.2, -cW * 0.78, cX2 - 1.2, cW * 0.78, 0.5, '#1e293b', deform, '#090d16', 0.4);
    drawCabinInteriorHint(ctx, cX2 - 2.6, cX1 + 3.8, cW * 0.72, deform, { driverY: 0, dualFrontSeats: false, wheelRadius: 1.5 });

    // Elevated white/steel ROPS canopy roof with crisp directional cast shadow
    drawBoxShadow(ctx, cX1, -cW, cX2, cW, 0.95, -0.8, 0.75, 0.34, deform);
    drawRoundedBox(
      ctx,
      cX1,
      -cW,
      cX2,
      cW,
      0.95,
      createRoofGradient(ctx, cW, '#f1f5f9'),
      deform,
      '#1e293b',
      0.65
    );
    // Accent safety stripe & 4 ROPS post caps
    strokePoly(ctx, [[cX1 + 1.1, -cW + 0.9], [cX2 - 1.1, -cW + 0.9]], baseColor, 0.75, deform);
    strokePoly(ctx, [[cX1 + 1.1, cW - 0.9], [cX2 - 1.1, cW - 0.9]], baseColor, 0.75, deform);
    for (const px of [cX1 + 0.8, cX2 - 0.8]) {
      for (const side of [-1, 1] as const) {
        drawDeformedDot(ctx, px, side * (cW - 0.8), 0.55, '#0f172a', deform);
      }
    }

    // Flashing amber beacon synced with renderer.ts (bX = -halfL * 0.09)
    drawAmberBeacon(ctx, -halfL * 0.09, 0, 1.35, litMach, deform, nowSec);
    return;
  }

  // ==========================================================================
  // D. COMPACT SIDEWALK ROLLER UPPER (Open Cockpit, Steering Wheel, ROPS Arch)
  // ==========================================================================
  if (type === 'roller_compact_sidewalk') {
    // Open operator tub positioned neatly ahead of the exposed rear steel drum (-halfL*0.44 .. -halfL*0.09)
    drawRoundedBox(ctx, -halfL * 0.44, -halfW * 0.56, -halfL * 0.09, halfW * 0.56, 0.42, '#1e293b', deform, '#090d16', 0.36);
    // Steering wheel & control pod
    drawDeformedDot(ctx, -halfL * 0.17, 0, 1.25, '#0f172a', deform, '#94a3b8', 0.42);
    drawDeformedDot(ctx, -halfL * 0.17, 0, 0.42, '#475569', deform);
    // Red hydrostatic drive lever on right console
    strokePoly(ctx, [[-halfL * 0.25, halfW * 0.38], [-halfL * 0.15, halfW * 0.42]], '#cbd5e1', 0.42, deform);
    drawDeformedDot(ctx, -halfL * 0.15, halfW * 0.42, 0.40, '#dc2626', deform);
    // Padded black operator seat
    drawRoundedBox(ctx, -halfL * 0.42, -halfW * 0.34, -halfL * 0.26, halfW * 0.34, 0.42, '#18181b', deform, '#475569', 0.30);

    // Folding black tubular ROPS safety rollbar arch behind operator seat + cast shadow
    const archX = -halfL * 0.56;
    drawBoxShadow(ctx, archX - 0.65, -halfW * 0.82, archX + 0.65, halfW * 0.82, 0.35, -0.5, 0.45, 0.28, deform);
    drawRoundedBox(ctx, archX - 0.62, -halfW * 0.82, archX + 0.62, halfW * 0.82, 0.32, '#111827', deform, '#475569', 0.36);

    // Amber flashing beacon mounted atop ROPS arch (synced with renderer.ts bX = -halfL * 0.58)
    drawAmberBeacon(ctx, -halfL * 0.58, 0, 1.08, litMach, deform, nowSec);
    return;
  }

  // ==========================================================================
  // E. PNEUMATIC TIRE ROLLER UPPER (Enclosed Panoramic Cab & Roof Beacon)
  // ==========================================================================
  if (type === 'roller_pneumatic') {
    const cX1 = -halfL * 0.46;
    const cX2 = halfL * 0.10;
    const cW = halfW * 0.74;

    drawBoxShadow(ctx, cX1, -cW, cX2, cW, 0.85, -0.7, 0.65, 0.30, deform);
    // Panoramic dark safety-glass cab
    drawRoundedBox(
      ctx,
      cX1,
      -cW,
      cX2,
      cW,
      0.85,
      createGlassGradient(ctx, cX2, -cW, cX1, cW, 'blue'),
      deform,
      '#090d16',
      0.68
    );
    drawCabinInteriorHint(ctx, cX2 - 1.8, cX1 + 4.4, cW * 0.82, deform, { driverY: 0, dualFrontSeats: false, wheelRadius: 1.55 });
    drawGlassGlint(ctx, cX1 + 0.8, -cW * 0.82, cX2 - 0.6, cW * 0.82, 0.16, deform);

    // Molded cab roof + sunroof panel + side mirrors
    const roofW = cW * 0.82;
    drawRoundedBox(
      ctx,
      cX1 + 1.4,
      -roofW,
      cX2 - 1.4,
      roofW,
      1.05,
      createRoofGradient(ctx, roofW, '#f1f5f9'),
      deform,
      '#1e293b',
      0.58
    );
    for (const side of [-1, 1] as const) {
      drawSideMirrorArm(ctx, cX2 - 0.6, side * cW, side, 1.8, 1.8, 0.9, '#1e293b', deform);
    }

    // Flashing amber beacon synced with renderer.ts (bX = -halfL * 0.28)
    drawAmberBeacon(ctx, -halfL * 0.28, 0, 1.35, litMach, deform, nowSec);
    return;
  }

  // ==========================================================================
  // F. BARREL TRAILER UPPER (Bolted Top Filling Manhole, Level Sight Gauge, Hose)
  // ==========================================================================
  if (type === 'trailer_barrel') {
    const tankFront = halfL * 0.52;
    const tankRear = -halfL * 0.80;
    const midX = (tankFront + tankRear) * 0.5;
    const fillFrac = Math.max(0, Math.min(1, (car.tankWaterLevel ?? 100) / Math.max(1, car.tankMaxCapacity ?? 100)));

    // Bolted steel top filling manhole hatch with clamping wing-nuts
    drawBoxShadow(ctx, midX - 2.3, -2.3, midX + 2.3, 2.3, 2.0, -0.45, 0.45, 0.25, deform);
    drawDeformedDot(ctx, midX, 0, 2.25, '#334155', deform, '#090d16', 0.45);
    drawDeformedDot(ctx, midX, 0, 1.55, '#94a3b8', deform, '#1e293b', 0.35);
    strokePoly(ctx, [[midX - 1.4, 0], [midX + 1.4, 0]], '#0f172a', 0.5, deform);

    // Translucent sight-glass fluid level indicator bar along front dome
    drawRoundedBox(ctx, tankFront - 3.6, -2.6, tankFront - 2.4, 2.6, 0.25, '#0f172a', deform);
    const fluidSpan = 4.6 * fillFrac;
    if (fluidSpan > 0.2) {
      drawRoundedBox(ctx, tankFront - 3.4, 2.3 - fluidSpan, tankFront - 2.6, 2.3, 0.15, '#38bdf8', deform);
    }

    // Coiled green/black fill hose strapped on right tank shoulder (if not currently deployed)
    if (!car.waterHoseDeployed) {
      drawDeformedDot(ctx, tankRear + 3.0, halfW * 0.48, 1.65, '#15803d', deform, '#090d16', 0.45);
      drawDeformedDot(ctx, tankRear + 3.0, halfW * 0.48, 0.82, '#0f172a', deform);
    }
    return;
  }

  // ==========================================================================
  // G. VACUUM TRAILER UPPER (Top Pressure Manhole, Relief Valve, Vacuum Gauge)
  // ==========================================================================
  if (type === 'trailer_vacuum') {
    const tankFront = halfL * 0.54;
    const tankRear = -halfL * 0.82;
    const midX = (tankFront + tankRear) * 0.5;

    // Bolted pressure-tank top manhole + safety pressure-relief manifold pipe
    drawBoxShadow(ctx, midX - 2.4, -2.4, midX + 2.4, 2.4, 2.0, -0.45, 0.45, 0.25, deform);
    drawDeformedDot(ctx, midX, 0, 2.4, '#1e293b', deform, '#090d16', 0.48);
    drawDeformedDot(ctx, midX, 0, 1.65, '#cbd5e1', deform, '#334155', 0.38);
    // Overhead vacuum manifold pipe running forward from manhole to compressor
    drawChromePipe(ctx, [[midX + 2.0, 0], [tankFront + 2.2, 0]], 0.72, deform, '#94a3b8');
    // Pressure dial gauge
    drawDeformedDot(ctx, tankFront - 2.2, -1.6, 0.78, '#f8fafc', deform, '#090d16', 0.3);
    return;
  }

  // ==========================================================================
  // H. SEMI-TRAILER FUEL TANKER UPPER (Coaming Trough, 4 Manholes, Catwalk)
  // ==========================================================================
  if (type === 'trailer_semi_tanker') {
    const tankFront = halfL * 0.90;
    const tankRear = -halfL * 0.88;

    // Full-length recessed aluminum top spill-containment coaming trough
    drawBoxShadow(ctx, tankRear + 3.0, -3.6, tankFront - 3.0, 3.6, 0.8, -0.5, 0.5, 0.22, deform);
    drawRoundedBox(ctx, tankRear + 3.0, -3.4, tankFront - 3.0, 3.4, 0.75, '#475569', deform, '#0f172a', 0.55);
    drawRoundedBox(ctx, tankRear + 4.2, -2.6, tankFront - 4.2, 2.6, 0.5, '#1e293b', deform);

    // 4 Compartmented circular aluminum dome loading manholes + vapor recovery rail
    const domeXs = [halfL * 0.58, halfL * 0.20, -halfL * 0.18, -halfL * 0.56];
    drawChromePipe(ctx, [[domeXs[3] - 2.0, -1.75], [domeXs[0] + 2.0, -1.75]], 0.55, deform, '#cbd5e1');
    for (const dx of domeXs) {
      drawDeformedDot(ctx, dx, 0.1, 2.1, '#94a3b8', deform, '#090d16', 0.45);
      drawDeformedDot(ctx, dx, 0.1, 1.35, '#e2e8f0', deform, '#334155', 0.32);
      strokePoly(ctx, [[dx - 1.1, 0.1], [dx + 1.1, 0.1]], '#0f172a', 0.42, deform);
    }

    // Perforated aluminum anti-slip catwalk grating & folding safety handrail on right top flank
    drawTreadplateSurface(ctx, tankRear + 4.5, 3.6, tankFront - 4.5, 5.7, '#94a3b8', deform, 2.0);
    strokePoly(ctx, [[tankRear + 4.5, 5.85], [tankFront - 4.5, 5.85]], '#e2e8f0', 0.55, deform);
    // Rear stainless access ladder rungs
    drawRoundedBox(ctx, tankRear - 1.5, 3.2, tankRear + 2.5, 5.8, 0.2, '#64748b', deform, '#090d16', 0.35);
    return;
  }

  // Other trailers (flatbed_2axle, semi, semi_box, semi_container, semi_lowboy) complete in chassis layer
}

/**
 * Renders the MTZ-80/82 tractor's OWN sculpted Belarus diesel bonnet after the under-hood
 * engine bay pass, inheriting live soft-body deformation and articulating on its real hinges.
 */
export function renderHeavyEquipmentHoodLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const type = car.type;
  if (type !== 'tractor_mtz82' && type !== 'tractor_mtz80' && type !== 'tractor_mtz80_old') return;

  const is82 = type === 'tractor_mtz82';
  const isOld = type === 'tractor_mtz80_old';
  const baseColor = car.color || (isOld ? '#2563eb' : is82 ? '#0284c7' : '#dc2626');
  const hoodW = isOld ? halfW * 0.33 : halfW * 0.35;
  const hoodRearX = halfL * 0.04;
  const hoodFrontX = halfL * 0.84;
  const rearHW = hoodW * (isOld ? 1.06 : 1.08);
  const frontHW = hoodW * (isOld ? 0.66 : 0.88);

  if (car.damage?.hoodDetached) {
    drawDetachedHoodHingeStubs(ctx, deform, hoodRearX, hoodW);
    return;
  }

  const hoodDeform = createArticulatedHoodDeform(car, deform, hoodRearX, hoodFrontX);
  drawNativeHoodUnderEffects(ctx, car, deform, hoodDeform, hoodRearX, hoodFrontX, rearHW, frontHW);

  const hoodPts: Pt[] = isOld
    ? [
        [hoodFrontX + 0.2, -hoodW * 0.66],
        [hoodFrontX - 0.9, -hoodW],
        [hoodRearX, -hoodW * 1.06],
        [hoodRearX, hoodW * 1.06],
        [hoodFrontX - 0.9, hoodW],
        [hoodFrontX + 0.2, hoodW * 0.66],
      ]
    : [
        [hoodFrontX + 0.2, -hoodW * 0.88],
        [hoodFrontX - 0.4, -hoodW],
        [hoodRearX, -hoodW * 1.08],
        [hoodRearX, hoodW * 1.08],
        [hoodFrontX - 0.4, hoodW],
        [hoodFrontX + 0.2, hoodW * 0.88],
      ];
  fillPoly(ctx, hoodPts, createBodyMetallicGradient(ctx, hoodW, baseColor), hoodDeform, '#090d16', 0.65);

  // Top radiator intake grille & sculpted hood center ridge
  drawRoundedBox(ctx, hoodFrontX - 2.2, -hoodW * 0.68, hoodFrontX - 0.35, hoodW * 0.68, 0.3, '#0f172a', hoodDeform, '#475569', 0.35);
  for (let gy = -hoodW * 0.52; gy <= hoodW * 0.52; gy += 0.9) {
    strokePoly(ctx, [[hoodFrontX - 1.95, gy], [hoodFrontX - 0.55, gy]], '#64748b', 0.28, hoodDeform);
  }
  strokePoly(ctx, [[hoodRearX + 0.8, 0], [hoodFrontX - 2.4, 0]], 'rgba(255,255,255,0.28)', 0.45, hoodDeform);

  // Side cooling louver slits along hood cheeks
  for (const side of [-1, 1] as const) {
    for (let lx = hoodRearX + 2.2; lx <= hoodFrontX - 3.6; lx += 1.4) {
      strokePoly(ctx, [[lx, side * (hoodW - 0.55)], [lx, side * (hoodW - 0.15)]], 'rgba(15,23,42,0.55)', 0.35, hoodDeform);
    }
  }

  // Radiator brass/black cap on bonnet nose
  drawDeformedDot(ctx, hoodFrontX - 2.9, 0, 0.52, '#1e293b', hoodDeform, '#cbd5e1', 0.22);

  // When closed, vertical exhaust muffler stack & cyclone air pre-cleaner protrude through the bonnet
  if (!isVehicleHoodVisualOpenOrBuckled(car)) {
    drawDeformedDot(ctx, halfL * 0.46, hoodW * 0.84, 1.05, '#111827', deform, '#475569', 0.35);
    drawDeformedDot(ctx, halfL * 0.46, hoodW * 0.84, 0.48, '#64748b', deform);
    drawDeformedDot(ctx, halfL * 0.52, -hoodW * 0.72, 1.05, '#1e293b', deform, '#94a3b8', 0.32);
    drawDeformedDot(ctx, halfL * 0.52, -hoodW * 0.72, 0.52, '#334155', deform);
  }

  drawNativeHoodOverEffects(ctx, car, hoodDeform, hoodRearX, hoodFrontX, rearHW, frontHW, baseColor);
}

import type { VehicleRenderContext } from './vehicleArchetypes';
import { isVehicleHoodExposed } from './engineBayVisuals';
import {
  Pt,
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
  drawRoadTrainMarkers,
  drawSideMirrorArm,
} from './vehicleModelPrimitives';

/**
 * All 8 redrawn vans, campers, stepvans, ambulances, minibuses & city buses.
 * Integrated top-down automotive drafting with zero generic programmatic overlays.
 */
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

/**
 * Renders tucked commercial van / bus / ambulance tires cleanly on the lower wheel layer.
 */
export function renderVanBusWheels(
  vCtx: VehicleRenderContext,
  steerAngle: number
): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const type = car.type;
  const isBus = type === 'bus';
  const isMinibus = type === 'bus_minibus';
  const isStepvan = type === 'delivery_truck';
  const isBukhanka = type === 'van_cargo_old';

  const wheelL = isBus ? 10.6 : isMinibus || isStepvan ? 9.2 : isBukhanka ? 8.0 : 8.6;
  const wheelW = isBus ? 3.8 : isMinibus || isStepvan ? 3.5 : 3.2;
  const frontX = isBus
    ? halfL * 0.64
    : isBukhanka
      ? halfL * 0.56
      : isStepvan
        ? halfL * 0.68
        : halfL * 0.64;
  const rearX = isBus
    ? -halfL * 0.52
    : isBukhanka
      ? -halfL * 0.54
      : isStepvan
        ? -halfL * 0.58
        : -halfL * 0.58;
  const trackY = halfW - wheelW * 0.52;
  const tireStyle = isBus || isStepvan ? 'heavy' : 'road';

  // Rear axle (dual wheels on heavy city bus & stepvan)
  const [rlx, rly] = deform(rearX, -trackY);
  const [rrx, rry] = deform(rearX, trackY);
  drawTreadedTire(ctx, rlx, rly, wheelL, wheelW, 0, tireStyle);
  drawTreadedTire(ctx, rrx, rry, wheelL, wheelW, 0, tireStyle);

  if (isBus || isStepvan) {
    const innerTrackY = trackY - wheelW - 0.35;
    const [ilx, ily] = deform(rearX, -innerTrackY);
    const [irx, iry] = deform(rearX, innerTrackY);
    drawTreadedTire(ctx, ilx, ily, wheelL, wheelW * 0.92, 0, tireStyle);
    drawTreadedTire(ctx, irx, iry, wheelL, wheelW * 0.92, 0, tireStyle);
  }

  // Steered front axle
  const [flx, fly] = deform(frontX, -trackY);
  const [frx, fry] = deform(frontX, trackY);
  drawTreadedTire(ctx, flx, fly, wheelL, wheelW, steerAngle, tireStyle);
  drawTreadedTire(ctx, frx, fry, wheelL, wheelW, steerAngle, tireStyle);
}

// ============================================================================
// INTEGRATED FRONT & REAR OPTICS HELPERS FOR VANS & BUSES
// ============================================================================

function drawIntegratedVanHeadlight(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  yInner: number,
  yOuter: number,
  side: -1 | 1,
  broken: boolean,
  headlightsOn: boolean,
  highBeam: boolean,
  positionOn: boolean,
  turnIntensity: number,
  style: 'modern' | 'retro_round' | 'bus_quad' | 'stepvan',
  deform: (x: number, y: number) => [number, number]
): void {
  const yMin = Math.min(yInner, yOuter);
  const yMax = Math.max(yInner, yOuter);
  const yMid = (yMin + yMax) * 0.5;

  if (style === 'retro_round') {
    const cx = (x1 + x2) * 0.5;
    drawDeformedDot(ctx, cx, yMid, 1.85, '#334155', deform, '#0f172a', 0.45);
    if (broken) {
      drawDeformedDot(ctx, cx, yMid, 1.35, '#1e293b', deform);
    } else {
      const fill = highBeam ? '#fffef0' : headlightsOn ? '#fef3c7' : positionOn ? '#fde68a' : '#cbd5e1';
      drawDeformedDot(ctx, cx, yMid, 1.38, fill, deform, '#94a3b8', 0.35);
      if (headlightsOn || positionOn) {
        drawDeformedDot(ctx, cx + 0.2, yMid, 0.65, '#ffffff', deform);
      }
    }
    // Small separate round amber turn blinker outboard
    const blinkY = yMid + side * 2.15;
    drawDeformedDot(
      ctx,
      cx - 0.45,
      blinkY,
      0.85,
      turnIntensity > 0.1 ? `rgba(255,190,40,${(0.65 + 0.35 * turnIntensity).toFixed(2)})` : '#b45309',
      deform,
      '#0f172a',
      0.35
    );
    return;
  }

  // Flush sculpted housing
  const housingPts: Pt[] = [
    [x1, yInner],
    [x2, yInner + side * 0.3],
    [x2 - 0.5, yOuter],
    [x1 - 0.6, yOuter],
  ];
  fillPoly(ctx, housingPts, broken ? '#111827' : '#1e293b', deform, '#0f172a', 0.45);

  if (!broken) {
    // Inner projector / reflector lens
    const lensColor = highBeam
      ? '#ffffff'
      : headlightsOn
        ? '#fef9c3'
        : positionOn
          ? '#e2e8f0'
          : '#94a3b8';
    const mainPts: Pt[] = [
      [x1 + 0.25, yInner + side * 0.2],
      [x2 - 0.2, yInner + side * 0.45],
      [x2 - 0.55, yMid + side * 0.55],
      [x1 + 0.1, yMid + side * 0.4],
    ];
    fillPoly(ctx, mainPts, lensColor, deform);

    if (style === 'modern' || style === 'bus_quad') {
      // Crisp DRL LED blade along outer rim
      strokePoly(
        ctx,
        [
          [x2 - 0.15, yInner + side * 0.25],
          [x2 - 0.4, yOuter - side * 0.25],
        ],
        headlightsOn || positionOn ? '#f8fafc' : 'rgba(226,232,240,0.45)',
        0.65,
        deform
      );
    }

    // Outer amber turn signal corner
    const turnFill =
      turnIntensity > 0.08
        ? `rgba(255,186,36,${(0.55 + 0.45 * turnIntensity).toFixed(2)})`
        : '#92400e';
    const turnPts: Pt[] = [
      [x1 - 0.35, yOuter - side * 0.2],
      [x2 - 0.55, yOuter - side * 0.15],
      [x2 - 0.45, yMid + side * 0.65],
      [x1 - 0.1, yMid + side * 0.55],
    ];
    fillPoly(ctx, turnPts, turnFill, deform);
  }
}

function drawIntegratedRearLampCluster(
  ctx: CanvasRenderingContext2D,
  xRear: number,
  yInner: number,
  yOuter: number,
  side: -1 | 1,
  broken: boolean,
  optics: ReturnType<typeof getLiveOpticsState>,
  turnIntensity: number,
  deform: (x: number, y: number) => [number, number]
): void {
  const yMin = Math.min(yInner, yOuter);
  const yMax = Math.max(yInner, yOuter);
  const span = yMax - yMin;

  // Recessed smoked bezel
  drawRoundedBox(ctx, xRear, yMin, xRear + 1.85, yMax, 0.4, '#0f172a', deform, '#020617', 0.4);
  if (broken) return;

  // Tail / Brake / Rear Fog main ruby segment (outer 58%)
  const redFill = optics.braking
    ? '#ff2a2a'
    : optics.rearFogOn
      ? '#ff1e1e'
      : optics.positionOn
        ? '#dc2626'
        : '#7f1d1d';
  const redY1 = side < 0 ? yMin + 0.2 : yMin + span * 0.40;
  const redY2 = side < 0 ? yMin + span * 0.60 : yMax - 0.2;
  drawRoundedBox(ctx, xRear + 0.2, redY1, xRear + 1.55, redY2, 0.25, redFill, deform);
  if (optics.braking || optics.rearFogOn) {
    drawRoundedBox(
      ctx,
      xRear + 0.45,
      redY1 + 0.25,
      xRear + 1.25,
      redY2 - 0.25,
      0.15,
      '#fecaca',
      deform
    );
  }

  // Reverse white lens (innermost 22%)
  const revY1 = side < 0 ? yMax - span * 0.22 : yMin + 0.2;
  const revY2 = side < 0 ? yMax - 0.2 : yMin + span * 0.22;
  drawRoundedBox(
    ctx,
    xRear + 0.25,
    revY1,
    xRear + 1.45,
    revY2,
    0.15,
    optics.reversing ? '#f8fafc' : '#64748b',
    deform
  );

  // Amber turn lens (middle 18%)
  const ambY1 = side < 0 ? yMin + span * 0.61 : yMin + span * 0.23;
  const ambY2 = side < 0 ? yMax - span * 0.23 : yMin + span * 0.39;
  drawRoundedBox(
    ctx,
    xRear + 0.25,
    ambY1,
    xRear + 1.45,
    ambY2,
    0.15,
    turnIntensity > 0.08
      ? `rgba(255,186,36,${(0.55 + 0.45 * turnIntensity).toFixed(2)})`
      : '#78350f',
    deform
  );
}

function drawEmergencyLightbar(
  ctx: CanvasRenderingContext2D,
  x: number,
  halfBarW: number,
  sirenOn: boolean,
  strobe: number,
  colorMode: 'blue_blue' | 'red_blue',
  deform: (x: number, y: number) => [number, number]
): void {
  // Aerodynamic aluminum mounting base
  drawRoundedBox(ctx, x - 1.65, -halfBarW, x + 1.65, halfBarW, 0.75, '#0f172a', deform, '#334155', 0.45);
  // Center white speaker / takedown pod
  drawRoundedBox(ctx, x - 1.25, -halfBarW * 0.22, x + 1.25, halfBarW * 0.22, 0.35, '#e2e8f0', deform);

  const phaseA = sirenOn ? Math.sin(strobe * 2.2) > 0 : false;
  const phaseB = sirenOn ? !phaseA : false;

  const leftBase = colorMode === 'red_blue' ? '#dc2626' : '#2563eb';
  const leftLit = colorMode === 'red_blue' ? '#ff5c5c' : '#60a5fa';
  const rightBase = '#2563eb';
  const rightLit = '#60a5fa';

  // Left pod
  drawRoundedBox(
    ctx,
    x - 1.25,
    -halfBarW + 0.35,
    x + 1.25,
    -halfBarW * 0.26,
    0.4,
    phaseA ? leftLit : leftBase,
    deform
  );
  if (phaseA) {
    drawRoundedBox(ctx, x - 0.65, -halfBarW * 0.80, x + 0.65, -halfBarW * 0.42, 0.25, '#ffffff', deform);
  }

  // Right pod
  drawRoundedBox(
    ctx,
    x - 1.25,
    halfBarW * 0.26,
    x + 1.25,
    halfBarW - 0.35,
    0.4,
    phaseB ? rightLit : rightBase,
    deform
  );
  if (phaseB) {
    drawRoundedBox(ctx, x - 0.65, halfBarW * 0.42, x + 0.65, halfBarW * 0.80, 0.25, '#ffffff', deform);
  }
}

// ============================================================================
// PASS 1: CHASSIS SHELL + INTEGRATED BUMPERS, GRILLES & FASCIA OPTICS
// ============================================================================

export function renderVanBusChassisLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  const type = car.type;
  const optics = getLiveOpticsState(car);

  const frontX = halfL - fc;
  const rearX = -halfL + rc;
  const isAmbulance = type === 'ambulance' || type === 'ambulance_van';
  const isCamper = type === 'van_camper';
  const isBukhanka = type === 'van_cargo_old';
  const isStepvan = type === 'delivery_truck';
  const isBus = type === 'bus';
  const isMinibus = type === 'bus_minibus';

  const basePaint = isAmbulance
    ? '#f8fafc'
    : isCamper
      ? (car.color || '#f5f0e1')
      : (car.color || '#cbd5e1');
  const bodyGrad = createBodyMetallicGradient(ctx, halfW, basePaint);
  const cornerR = isBukhanka ? 2.8 : isBus ? 2.2 : isStepvan ? 1.5 : 2.1;

  // 1. Main body shell contour
  if (isCamper) {
    // Wider rear living coachbox + tapered aerodynamic front van cab
    const cabW = halfW * 0.89;
    const boxW = halfW * 1.02;
    const stepX = halfL * 0.30;
    const camperPoly: Pt[] = [
      [frontX, 0],
      [frontX - 0.4, cabW * 0.78],
      [frontX - 1.8, cabW],
      [stepX + 1.2, cabW],
      [stepX - 1.0, boxW],
      [rearX + 1.6, boxW],
      [rearX + 0.4, boxW * 0.90],
      [rearX, boxW * 0.72],
      [rearX, -boxW * 0.72],
      [rearX + 0.4, -boxW * 0.90],
      [rearX + 1.6, -boxW],
      [stepX - 1.0, -boxW],
      [stepX + 1.2, -cabW],
      [frontX - 1.8, -cabW],
      [frontX - 0.4, -cabW * 0.78],
    ];
    fillPoly(ctx, camperPoly, bodyGrad, deform, shadePaint(basePaint, -0.45), 0.95);
  } else {
    drawRoundedBox(ctx, rearX, -halfW, frontX, halfW, cornerR, bodyGrad, deform, shadePaint(basePaint, -0.46), 0.95);
  }

  // Subtle body shoulder specular crease lines along both flanks
  const flankY = (isCamper ? halfW * 0.92 : halfW) - 1.1;
  strokePoly(ctx, [[rearX + 2.5, -flankY], [frontX - 3.2, -flankY]], 'rgba(255,255,255,0.22)', 0.6, deform);
  strokePoly(ctx, [[rearX + 2.5, flankY], [frontX - 3.2, flankY]], 'rgba(0,0,0,0.24)', 0.65, deform);

  // 2. Integrated Front Bumper & Cooling Grille Fascia
  const bumperW = isCamper ? halfW * 0.88 : halfW - 0.35;
  const bumperColor = isBukhanka
    ? '#1e293b'
    : isStepvan
      ? '#334155'
      : isBus
        ? shadePaint(basePaint, -0.22)
        : '#1e293b';

  // Sculpted front bumper shelf
  drawRoundedBox(
    ctx,
    frontX - 1.55,
    -bumperW,
    frontX + 0.25,
    bumperW,
    isBukhanka ? 0.8 : 1.0,
    bumperColor,
    deform,
    '#0f172a',
    0.5
  );
  // Subtle chrome/matte lip highlight along bumper
  strokePoly(
    ctx,
    [[frontX - 0.25, -bumperW + 1.4], [frontX - 0.25, bumperW - 1.4]],
    isBukhanka ? 'rgba(203,213,225,0.35)' : 'rgba(255,255,255,0.20)',
    0.55,
    deform
  );

  // Recessed front intake grille slats
  const grilleHalfW = bumperW * (isBus ? 0.52 : isBukhanka ? 0.44 : 0.48);
  drawRoundedBox(
    ctx,
    frontX - 2.35,
    -grilleHalfW,
    frontX - 0.9,
    grilleHalfW,
    0.4,
    '#0b1120',
    deform,
    '#334155',
    0.4
  );
  // Horizontal grille bar accent
  strokePoly(
    ctx,
    [[frontX - 1.65, -grilleHalfW + 0.6], [frontX - 1.65, grilleHalfW - 0.6]],
    isStepvan || isBukhanka ? '#94a3b8' : '#cbd5e1',
    0.55,
    deform
  );

  // 3. Integrated Rear Bumper & Step Plate
  const rearBumperW = isCamper ? halfW * 0.98 : halfW - 0.35;
  drawRoundedBox(
    ctx,
    rearX - 0.2,
    -rearBumperW,
    rearX + 1.45,
    rearBumperW,
    0.8,
    isBus ? shadePaint(basePaint, -0.22) : '#1e293b',
    deform,
    '#0f172a',
    0.5
  );
  // Rear non-slip boarding step tread on vans/ambulances/stepvan
  if (!isBus && !isCamper) {
    drawRoundedBox(ctx, rearX - 0.3, -rearBumperW * 0.42, rearX + 0.8, rearBumperW * 0.42, 0.3, '#475569', deform);
  }

  // 4. Integrated Front Headlights, Fog Lamps & Turn Signals
  const lampStyle = isBukhanka
    ? 'retro_round'
    : isBus
      ? 'bus_quad'
      : isStepvan
        ? 'stepvan'
        : 'modern';
  const lampInnerY = grilleHalfW + 0.65;
  const lampOuterY = bumperW - 0.65;

  drawIntegratedVanHeadlight(
    ctx,
    frontX - 2.8,
    frontX - 0.65,
    -lampInnerY,
    -lampOuterY,
    -1,
    optics.leftHeadBroken,
    optics.headlightsOn,
    optics.highBeam,
    optics.positionOn,
    optics.leftTurn,
    lampStyle,
    deform
  );
  drawIntegratedVanHeadlight(
    ctx,
    frontX - 2.8,
    frontX - 0.65,
    lampInnerY,
    lampOuterY,
    1,
    optics.rightHeadBroken,
    optics.headlightsOn,
    optics.highBeam,
    optics.positionOn,
    optics.rightTurn,
    lampStyle,
    deform
  );

  // Front fog lamps recessed in lower bumper corners
  const fogY = bumperW * 0.62;
  const fogFill = optics.frontFogOn ? '#fef08a' : '#334155';
  drawDeformedDot(ctx, frontX - 0.9, -fogY, 0.72, optics.leftHeadBroken ? '#0f172a' : fogFill, deform, '#0f172a', 0.35);
  drawDeformedDot(ctx, frontX - 0.9, fogY, 0.72, optics.rightHeadBroken ? '#0f172a' : fogFill, deform, '#0f172a', 0.35);

  // 5. Integrated Rear Taillights, Brake, Reverse, Rear Fog & Turn Signals
  const tailInnerY = rearBumperW * 0.56;
  const tailOuterY = rearBumperW - 0.55;
  drawIntegratedRearLampCluster(
    ctx,
    rearX + 0.3,
    -tailInnerY,
    -tailOuterY,
    -1,
    optics.leftTailBroken,
    optics,
    optics.leftTurn,
    deform
  );
  drawIntegratedRearLampCluster(
    ctx,
    rearX + 0.3,
    tailInnerY,
    tailOuterY,
    1,
    optics.rightTailBroken,
    optics,
    optics.rightTurn,
    deform
  );

  // 6. Side amber marker LEDs along bus / stepvan / minibus flanks
  if (isBus || isMinibus || isStepvan) {
    const markerXs = isBus ? [-halfL * 0.65, -halfL * 0.15, halfL * 0.35] : [-halfL * 0.45, halfL * 0.15];
    const mCol = optics.positionOn ? '#fbbf24' : '#92400e';
    for (const mx of markerXs) {
      drawRoundedBox(ctx, mx - 0.7, -halfW + 0.15, mx + 0.7, -halfW + 0.65, 0.15, mCol, deform);
      drawRoundedBox(ctx, mx - 0.7, halfW - 0.65, mx + 0.7, halfW - 0.15, 0.15, mCol, deform);
    }
  }
}

// ============================================================================
// PASS 2: UPPER GREENHOUSE, ROOF ARCHITECTURE, LIVERIES & EQUIPMENT
// ============================================================================

export function renderVanBusUpperLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  const type = car.type;
  const optics = getLiveOpticsState(car);
  const frontX = halfL - fc;
  const rearX = -halfL + rc;
  const hoodExposed = isVehicleHoodExposed(car);

  const drawChmsl = (x: number, halfSpan = 2.0) => {
    drawRoundedBox(
      ctx,
      x - 0.45,
      -halfSpan,
      x + 0.45,
      halfSpan,
      0.2,
      optics.braking ? '#ff2a2a' : '#7f1d1d',
      deform,
      '#0f172a',
      0.35
    );
    if (optics.braking) {
      strokePoly(ctx, [[x, -halfSpan + 0.4], [x, halfSpan - 0.4]], '#fecaca', 0.55, deform);
    }
  };

  // ==========================================================================
  // 1. CITY BUS (Metro Linemaster CityBus — 85x26)
  // ==========================================================================
  if (type === 'bus') {
    const bodyPaint = car.color || '#eab308';
    const roofPaint = car.roofColor || shadePaint(bodyPaint, 0.12);
    const glassW = halfW - 0.9;
    const roofW = halfW - 2.3;

    // Continuous dark tinted panoramic glass ribbon framing the perimeter
    drawRoundedBox(ctx, rearX + 1.8, -glassW, frontX - 1.6, glassW, 1.5, '#0b1120', deform);

    // Panoramic curved front windshield
    const fWsX1 = frontX - 7.8;
    const fWsX2 = frontX - 1.8;
    drawRoundedBox(
      ctx,
      fWsX1,
      -glassW + 0.5,
      fWsX2,
      glassW - 0.5,
      1.0,
      createGlassGradient(ctx, fWsX1, -glassW, fWsX2, glassW, 'blue'),
      deform
    );
    // Specular sky reflection across bus windshield
    strokePoly(ctx, [[fWsX1 + 1.2, -glassW + 2.2], [fWsX2 - 1.2, glassW - 2.4]], 'rgba(255,255,255,0.28)', 1.3, deform);
    // Dual pantograph bus wipers
    strokePoly(ctx, [[fWsX2 - 0.8, -glassW * 0.42], [fWsX1 + 1.4, -glassW * 0.14]], '#0f172a', 0.85, deform);
    strokePoly(ctx, [[fWsX2 - 0.8, glassW * 0.42], [fWsX1 + 1.4, glassW * 0.14]], '#0f172a', 0.85, deform);

    // Glowing amber LED destination matrix above windshield
    const ledX = fWsX1 - 0.9;
    drawRoundedBox(ctx, ledX - 1.0, -4.6, ledX + 0.9, 4.6, 0.35, '#090d16', deform, '#334155', 0.4);
    const ledLit = optics.ignitionOn || optics.positionOn;
    const ledCol = ledLit ? '#fbbf24' : '#78350f';
    for (let dy = -3.4; dy <= 3.4; dy += 1.35) {
      drawRoundedBox(ctx, ledX - 0.45, dy - 0.35, ledX + 0.45, dy + 0.35, 0.1, ledCol, deform);
    }

    // Side passenger windows along both flanks with crisp pillar dividers
    const sideGlassX1 = rearX + 7.0;
    const sideGlassX2 = fWsX1 - 1.0;
    const sideWinH = glassW - roofW - 0.35;
    drawRoundedBox(ctx, sideGlassX1, -glassW + 0.25, sideGlassX2, -roofW - 0.1, 0.4, '#1b3554', deform);
    drawRoundedBox(ctx, sideGlassX1, roofW + 0.1, sideGlassX2, glassW - 0.25, 0.4, '#1b3554', deform);

    // Window pillars & right-side double boarding door seams
    const pillarStep = (sideGlassX2 - sideGlassX1) / 6;
    for (let i = 1; i < 6; i++) {
      const px = sideGlassX1 + pillarStep * i;
      strokePoly(ctx, [[px, -glassW], [px, -roofW]], '#0f172a', 1.1, deform);
      strokePoly(ctx, [[px, roofW], [px, glassW]], '#0f172a', 1.1, deform);
    }
    // Boarding door rubber doorframes on right side (+Y)
    for (const doorX of [frontX - 12.5, -halfL * 0.04, -halfL * 0.56]) {
      strokePoly(ctx, [[doorX - 3.0, halfW - 0.2], [doorX + 3.0, halfW - 0.2]], '#0f172a', 1.2, deform);
      strokePoly(ctx, [[doorX, roofW], [doorX, halfW]], 'rgba(255,255,255,0.35)', 0.65, deform);
    }

    // Full-length metallic bus roof panel
    const roofX1 = rearX + 4.4;
    const roofX2 = fWsX1 - 0.3;
    drawRoundedBox(ctx, roofX1, -roofW, roofX2, roofW, 1.3, createRoofGradient(ctx, roofW, roofPaint), deform, shadePaint(roofPaint, -0.35), 0.7);

    // Transverse expansion joints
    for (let rx = roofX1 + 10; rx < roofX2 - 8; rx += 13) {
      strokePoly(ctx, [[rx, -roofW + 0.8], [rx, roofW - 0.8]], 'rgba(0,0,0,0.16)', 0.65, deform);
    }

    // Dual roof HVAC climate pods (white composite shells with twin condenser fan grilles)
    const drawHvacPod = (px: number) => {
      drawRoundedBox(ctx, px - 6.8, -roofW * 0.64, px + 6.8, roofW * 0.64, 1.8, '#e2e8f0', deform, '#64748b', 0.55);
      drawRoundedBox(ctx, px - 5.6, -roofW * 0.52, px + 5.6, roofW * 0.52, 1.2, '#f8fafc', deform);
      drawDeformedDot(ctx, px - 2.4, 0, 2.2, '#1e293b', deform, '#64748b', 0.45);
      drawDeformedDot(ctx, px + 2.4, 0, 2.2, '#1e293b', deform, '#64748b', 0.45);
      drawDeformedDot(ctx, px - 2.4, 0, 0.75, '#475569', deform);
      drawDeformedDot(ctx, px + 2.4, 0, 0.75, '#475569', deform);
    };
    drawHvacPod(halfL * 0.16);
    drawHvacPod(-halfL * 0.32);

    // Emergency roof escape hatches (front & rear)
    for (const hx of [halfL * 0.50, -halfL * 0.68]) {
      drawRoundedBox(ctx, hx - 3.2, -3.6, hx + 3.2, 3.6, 0.6, '#cbd5e1', deform, '#475569', 0.55);
      strokePoly(ctx, [[hx - 2.2, 0], [hx + 2.2, 0]], '#64748b', 0.55, deform);
    }

    // Rear engine ventilation louver deck & rear glass
    drawRoundedBox(ctx, rearX + 1.9, -roofW * 0.78, rearX + 4.2, roofW * 0.78, 0.5, '#1e293b', deform);
    for (let ly = -roofW * 0.64; ly <= roofW * 0.64; ly += 1.55) {
      strokePoly(ctx, [[rearX + 2.3, ly], [rearX + 3.8, ly]], '#475569', 0.55, deform);
    }

    // 3 amber roof road-train / clearance markers + rear high-mount CHMSL
    drawRoadTrainMarkers(ctx, roofX2 - 1.2, [-3.6, 0, 3.6], optics.roadTrainOn, deform);
    drawChmsl(roofX1 - 0.3, 2.6);

    // Extended dual bus coach mirrors (long forward-reaching arms)
    drawSideMirrorArm(ctx, frontX - 2.4, -halfW + 0.3, -1, 2.9, 3.4, 1.35, '#1e293b', deform);
    drawSideMirrorArm(ctx, frontX - 2.4, halfW - 0.3, 1, 2.9, 3.4, 1.35, '#1e293b', deform);
    return;
  }

  // ==========================================================================
  // 2. MINIBUS SHUTTLE (Metro Shuttle 18-Seater — 62x23)
  // ==========================================================================
  if (type === 'bus_minibus') {
    const bodyPaint = car.color || '#f59e0b';
    const roofPaint = car.roofColor || shadePaint(bodyPaint, 0.10);
    const hoodX1 = frontX - 7.2;
    const fWsX1 = hoodX1 - 5.4;
    const glassW = halfW - 1.1;
    const roofW = halfW - 2.4;

    // Short sculpted semi-bonnet nose hood (skipped if open)
    if (!hoodExposed) {
      drawRoundedBox(
        ctx,
        hoodX1,
        -halfW + 1.8,
        frontX - 2.3,
        halfW - 1.8,
        1.0,
        createBodyMetallicGradient(ctx, halfW - 1.8, bodyPaint),
        deform,
        shadePaint(bodyPaint, -0.35),
        0.55
      );
      strokePoly(ctx, [[hoodX1 + 0.8, -halfW * 0.45], [frontX - 2.9, -halfW * 0.40]], 'rgba(255,255,255,0.22)', 0.65, deform);
      strokePoly(ctx, [[hoodX1 + 0.8, halfW * 0.45], [frontX - 2.9, halfW * 0.40]], 'rgba(0,0,0,0.22)', 0.65, deform);
    }

    // Panoramic greenhouse shell
    drawRoundedBox(ctx, rearX + 1.9, -glassW, hoodX1, glassW, 1.3, '#0b1120', deform);
    // Front windshield
    drawRoundedBox(
      ctx,
      fWsX1,
      -glassW + 0.45,
      hoodX1 - 0.35,
      glassW - 0.45,
      0.85,
      createGlassGradient(ctx, fWsX1, -glassW, hoodX1, glassW, 'blue'),
      deform
    );
    strokePoly(ctx, [[fWsX1 + 0.9, -glassW + 1.6], [hoodX1 - 1.0, glassW - 1.8]], 'rgba(255,255,255,0.28)', 1.05, deform);
    // Dual wipers
    strokePoly(ctx, [[hoodX1 - 0.8, -glassW * 0.36], [fWsX1 + 1.2, -glassW * 0.08]], '#0f172a', 0.75, deform);
    strokePoly(ctx, [[hoodX1 - 0.8, glassW * 0.36], [fWsX1 + 1.2, glassW * 0.08]], '#0f172a', 0.75, deform);

    // Side passenger panoramic windows with pillars
    const sideX1 = rearX + 4.4;
    const sideX2 = fWsX1 - 0.5;
    drawRoundedBox(ctx, sideX1, -glassW + 0.2, sideX2, -roofW - 0.1, 0.35, '#1d395a', deform);
    drawRoundedBox(ctx, sideX1, roofW + 0.1, sideX2, glassW - 0.2, 0.35, '#1d395a', deform);
    for (let i = 1; i <= 4; i++) {
      const px = sideX1 + ((sideX2 - sideX1) * i) / 5;
      strokePoly(ctx, [[px, -glassW], [px, -roofW]], '#0f172a', 0.95, deform);
      strokePoly(ctx, [[px, roofW], [px, glassW]], '#0f172a', 0.95, deform);
    }

    // Twin rear glass panes (50/50 cargo doors)
    drawRoundedBox(ctx, rearX + 2.0, -glassW + 0.7, rearX + 4.1, -0.55, 0.35, '#1a324e', deform);
    drawRoundedBox(ctx, rearX + 2.0, 0.55, rearX + 4.1, glassW - 0.7, 0.35, '#1a324e', deform);
    strokePoly(ctx, [[rearX + 0.2, 0], [rearX + 4.4, 0]], '#0f172a', 1.0, deform);

    // High-top ribbed minibus roof
    drawRoundedBox(ctx, rearX + 4.1, -roofW, fWsX1 + 0.2, roofW, 1.2, createRoofGradient(ctx, roofW, roofPaint), deform, shadePaint(roofPaint, -0.35), 0.65);
    for (let ry = -roofW * 0.58; ry <= roofW * 0.58; ry += roofW * 0.29) {
      strokePoly(ctx, [[rearX + 6.5, ry], [fWsX1 - 2.4, ry]], 'rgba(0,0,0,0.16)', 0.65, deform);
      strokePoly(ctx, [[rearX + 6.5, ry - 0.45], [fWsX1 - 2.4, ry - 0.45]], 'rgba(255,255,255,0.20)', 0.45, deform);
    }

    // Slim roof AC pod + rear glass escape hatch
    drawRoundedBox(ctx, halfL * 0.08 - 4.4, -roofW * 0.52, halfL * 0.08 + 4.4, roofW * 0.52, 1.3, '#f1f5f9', deform, '#64748b', 0.5);
    drawDeformedDot(ctx, halfL * 0.08, 0, 1.8, '#334155', deform, '#94a3b8', 0.4);
    drawRoundedBox(ctx, -halfL * 0.44 - 2.6, -2.8, -halfL * 0.44 + 2.6, 2.8, 0.55, '#cbd5e1', deform, '#475569', 0.5);

    // Amber route placard box on front roof brow + road-train markers + CHMSL
    drawRoundedBox(ctx, fWsX1 - 1.5, -3.4, fWsX1 + 0.1, 3.4, 0.3, '#0f172a', deform);
    drawRoundedBox(ctx, fWsX1 - 1.15, -2.9, fWsX1 - 0.2, 2.9, 0.15, optics.ignitionOn ? '#fde047' : '#ca8a04', deform);
    drawRoadTrainMarkers(ctx, fWsX1 - 2.4, [-3.0, 0, 3.0], optics.roadTrainOn, deform);
    drawChmsl(rearX + 3.9, 2.1);

    drawSideMirrorArm(ctx, fWsX1 + 2.4, -halfW + 0.3, -1, 2.2, 2.6, 1.15, '#1e293b', deform);
    drawSideMirrorArm(ctx, fWsX1 + 2.4, halfW - 0.3, 1, 2.2, 2.6, 1.15, '#1e293b', deform);
    return;
  }

  // ==========================================================================
  // 3. EXPRESS STEPVAN (Bison Express Stepvan — 56x23)
  // ==========================================================================
  if (type === 'delivery_truck') {
    const bodyPaint = car.color || '#78350f';
    const roofPaint = car.roofColor || '#e2e8f0';
    const hoodX1 = frontX - 6.8;
    const fWsX1 = hoodX1 - 4.4;
    const cabEndX = fWsX1 - 7.8;
    const glassW = halfW - 1.1;
    const roofW = halfW - 1.5;

    // Flat boxy service hood with corner latches
    if (!hoodExposed) {
      drawRoundedBox(
        ctx,
        hoodX1,
        -halfW + 1.5,
        frontX - 2.2,
        halfW - 1.5,
        0.7,
        createBodyMetallicGradient(ctx, halfW - 1.5, bodyPaint),
        deform,
        shadePaint(bodyPaint, -0.4),
        0.55
      );
      strokePoly(ctx, [[hoodX1 + 0.7, 0], [frontX - 2.7, 0]], 'rgba(255,255,255,0.22)', 0.6, deform);
    }

    // Flat two-piece walk-in stepvan windshield
    drawRoundedBox(ctx, fWsX1, -glassW, hoodX1, glassW, 0.5, '#0f172a', deform);
    drawRoundedBox(ctx, fWsX1 + 0.35, -glassW + 0.45, hoodX1 - 0.35, -0.45, 0.3, createGlassGradient(ctx, fWsX1, -glassW, hoodX1, 0, 'smoke'), deform);
    drawRoundedBox(ctx, fWsX1 + 0.35, 0.45, hoodX1 - 0.35, glassW - 0.45, 0.3, createGlassGradient(ctx, fWsX1, 0, hoodX1, glassW, 'smoke'), deform);
    strokePoly(ctx, [[hoodX1 - 0.7, -glassW * 0.48], [fWsX1 + 0.9, -glassW * 0.16]], '#0f172a', 0.75, deform);
    strokePoly(ctx, [[hoodX1 - 0.7, glassW * 0.48], [fWsX1 + 0.9, glassW * 0.16]], '#0f172a', 0.75, deform);

    // Cab roof + translucent fiberglass cargo skylight roof!
    drawRoundedBox(ctx, rearX + 1.6, -roofW, fWsX1 + 0.2, roofW, 0.85, createRoofGradient(ctx, roofW, roofPaint), deform, '#475569', 0.7);
    // Bulkhead seam between driver cab & cargo box
    strokePoly(ctx, [[cabEndX, -halfW + 0.3], [cabEndX, halfW - 0.3]], '#0f172a', 1.2, deform);
    // Translucent bright fiberglass cargo roof insert with aluminum cross-bows
    drawRoundedBox(ctx, rearX + 3.2, -roofW * 0.74, cabEndX - 1.4, roofW * 0.74, 0.5, '#f1f5f9', deform, '#94a3b8', 0.5);
    for (let bx = rearX + 7.0; bx < cabEndX - 3.5; bx += 6.2) {
      strokePoly(ctx, [[bx, -roofW * 0.74], [bx, roofW * 0.74]], '#cbd5e1', 0.85, deform);
    }

    // Sliding cab door tracks along both front flanks
    strokePoly(ctx, [[cabEndX - 3.0, -halfW + 0.55], [fWsX1 + 0.5, -halfW + 0.55]], '#0f172a', 1.1, deform);
    strokePoly(ctx, [[cabEndX - 3.0, halfW - 0.55], [fWsX1 + 0.5, halfW - 0.55]], '#0f172a', 1.1, deform);

    // Rear roll-up door seam & aluminum drip gutter
    strokePoly(ctx, [[rearX + 1.8, -roofW + 0.5], [rearX + 1.8, roofW - 0.5]], '#334155', 0.95, deform);

    drawRoadTrainMarkers(ctx, fWsX1 - 1.3, [-3.0, 0, 3.0], optics.roadTrainOn, deform);
    drawChmsl(rearX + 1.8, 2.0);
    drawSideMirrorArm(ctx, fWsX1 + 1.8, -halfW + 0.25, -1, 2.4, 2.8, 1.1, '#334155', deform);
    drawSideMirrorArm(ctx, fWsX1 + 1.8, halfW - 0.25, 1, 2.4, 2.8, 1.1, '#334155', deform);
    return;
  }

  // ==========================================================================
  // 4. UAZ-452 «БУХАНКА» RETRO VAN (Bison Pathfinder Van — 42x20)
  // ==========================================================================
  if (type === 'van_cargo_old') {
    const bodyPaint = car.color || '#64748b';
    const roofPaint = car.roofColor || shadePaint(bodyPaint, 0.06);
    const fWsX2 = frontX - 2.6;
    const fWsX1 = fWsX2 - 4.0;
    const glassW = halfW - 1.0;
    const roofW = halfW - 2.0;

    // Iconic rounded cab-over loaf shell with split 2-pane windshield
    drawRoundedBox(ctx, rearX + 1.8, -glassW, fWsX2, glassW, 2.0, '#0f172a', deform);
    drawRoundedBox(ctx, fWsX1, -glassW + 0.55, fWsX2 - 0.3, -0.55, 0.5, createGlassGradient(ctx, fWsX1, -glassW, fWsX2, 0, 'green'), deform);
    drawRoundedBox(ctx, fWsX1, 0.55, fWsX2 - 0.3, glassW - 0.55, 0.5, createGlassGradient(ctx, fWsX1, 0, fWsX2, glassW, 'green'), deform);
    // Body-colored center windshield divider bar
    drawRoundedBox(ctx, fWsX1 - 0.2, -0.65, fWsX2 + 0.1, 0.65, 0.15, bodyPaint, deform);
    // Small wipers
    strokePoly(ctx, [[fWsX2 - 0.6, -glassW * 0.48], [fWsX1 + 0.9, -glassW * 0.22]], '#0f172a', 0.65, deform);
    strokePoly(ctx, [[fWsX2 - 0.6, glassW * 0.48], [fWsX1 + 0.9, glassW * 0.22]], '#0f172a', 0.65, deform);

    // Side cab & small cargo side windows
    const cabWinX1 = fWsX1 - 7.5;
    drawRoundedBox(ctx, cabWinX1, -glassW + 0.2, fWsX1 - 0.5, -roofW - 0.1, 0.3, '#1a383f', deform);
    drawRoundedBox(ctx, cabWinX1, roofW + 0.1, fWsX1 - 0.5, glassW - 0.2, 0.3, '#1a383f', deform);
    // Small rectangular mid-body side windows
    drawRoundedBox(ctx, -5.5, -glassW + 0.2, 2.5, -roofW - 0.1, 0.3, '#1a383f', deform);
    drawRoundedBox(ctx, -5.5, roofW + 0.1, 2.5, glassW - 0.2, 0.3, '#1a383f', deform);

    // Twin small rear barn-door windows
    drawRoundedBox(ctx, rearX + 1.9, -glassW + 1.2, rearX + 3.6, -0.8, 0.35, '#19353c', deform);
    drawRoundedBox(ctx, rearX + 1.9, 0.8, rearX + 3.6, glassW - 1.2, 0.35, '#19353c', deform);
    strokePoly(ctx, [[rearX + 0.2, 0], [rearX + 3.8, 0]], '#0f172a', 1.0, deform);

    // Domed stamped steel roof with perimeter rain gutter & longitudinal ribs
    drawRoundedBox(ctx, rearX + 3.5, -roofW, fWsX1 + 0.2, roofW, 1.8, createRoofGradient(ctx, roofW, roofPaint), deform, shadePaint(roofPaint, -0.38), 0.7);
    for (let ry = -roofW * 0.52; ry <= roofW * 0.52; ry += roofW * 0.26) {
      strokePoly(ctx, [[rearX + 5.8, ry], [fWsX1 - 2.0, ry]], 'rgba(0,0,0,0.18)', 0.65, deform);
      strokePoly(ctx, [[rearX + 5.8, ry - 0.4], [fWsX1 - 2.0, ry - 0.4]], 'rgba(255,255,255,0.22)', 0.45, deform);
    }
    // Retro roof ventilation scoop hatch & expedition rear roof rack bars
    drawRoundedBox(ctx, halfL * 0.18 - 1.8, -2.4, halfL * 0.18 + 1.8, 2.4, 0.45, shadePaint(roofPaint, -0.1), deform, '#334155', 0.45);
    // Sturdy tubular expedition rack on rear half of roof
    const rX1 = rearX + 5.2;
    const rX2 = -1.5;
    const rY = roofW * 0.74;
    strokePoly(ctx, [[rX1, -rY], [rX2, -rY], [rX2, rY], [rX1, rY]], '#1e293b', 0.9, deform, true);
    for (let rx = rX1 + 2.4; rx < rX2 - 1.2; rx += 3.0) {
      strokePoly(ctx, [[rx, -rY], [rx, rY]], '#334155', 0.55, deform);
    }

    // Vintage tubular stalk mirrors
    drawSideMirrorArm(ctx, fWsX1 + 1.5, -halfW + 0.35, -1, 1.9, 1.8, 0.95, '#334155', deform);
    drawSideMirrorArm(ctx, fWsX1 + 1.5, halfW - 0.35, 1, 1.9, 1.8, 0.95, '#334155', deform);
    return;
  }

  // ==========================================================================
  // 5. NOMAD EXPEDITION CAMPER (Bison Nomad Camper — 50x22)
  // ==========================================================================
  if (type === 'van_camper') {
    const bodyPaint = car.color || '#f5f0e1';
    const cabW = halfW * 0.89;
    const boxW = halfW * 1.02;
    const hoodX1 = frontX - 6.6;
    const fWsX1 = hoodX1 - 4.8;
    const boxFrontX = halfL * 0.28;

    // Front cab hood (skipped if open)
    if (!hoodExposed) {
      drawRoundedBox(
        ctx,
        hoodX1,
        -cabW + 1.2,
        frontX - 2.1,
        cabW - 1.2,
        0.9,
        createBodyMetallicGradient(ctx, cabW - 1.2, bodyPaint),
        deform,
        shadePaint(bodyPaint, -0.35),
        0.55
      );
    }

    // Front cab windshield & side windows
    drawRoundedBox(ctx, fWsX1, -cabW + 0.9, hoodX1, cabW - 0.9, 0.9, '#0f172a', deform);
    drawRoundedBox(
      ctx,
      fWsX1 + 0.3,
      -cabW + 1.3,
      hoodX1 - 0.3,
      cabW - 1.3,
      0.65,
      createGlassGradient(ctx, fWsX1, -cabW, hoodX1, cabW, 'blue'),
      deform
    );
    strokePoly(ctx, [[fWsX1 + 0.8, -cabW + 2.2], [hoodX1 - 0.9, cabW - 2.4]], 'rgba(255,255,255,0.28)', 0.95, deform);

    // Insulated white gelcoat coachbox roof + aerodynamic over-cab sleeper alcove
    const roofW = boxW - 1.1;
    drawRoundedBox(ctx, rearX + 1.5, -roofW, boxFrontX, roofW, 1.2, createRoofGradient(ctx, roofW, '#f8fafc'), deform, '#94a3b8', 0.65);
    // Over-cab alcove nose overhang curving gracefully above windshield
    const alcovePts: Pt[] = [
      [boxFrontX - 0.5, -roofW],
      [fWsX1 + 2.6, -cabW * 0.86],
      [fWsX1 + 3.6, -cabW * 0.52],
      [fWsX1 + 3.6, cabW * 0.52],
      [fWsX1 + 2.6, cabW * 0.86],
      [boxFrontX - 0.5, roofW],
    ];
    fillPoly(ctx, alcovePts, createRoofGradient(ctx, cabW, '#f1f5f9'), deform, '#94a3b8', 0.6);
    // Decorative adventure stripes on roof flanks
    strokePoly(ctx, [[rearX + 3.0, -roofW + 0.65], [boxFrontX - 0.5, -roofW + 0.65]], '#d97706', 0.85, deform);
    strokePoly(ctx, [[rearX + 3.0, roofW - 0.65], [boxFrontX - 0.5, roofW - 0.65]], '#d97706', 0.85, deform);

    // Panoramic tinted Heki roof skylight (forward living bay)
    const skyX = boxFrontX - 6.2;
    drawRoundedBox(ctx, skyX - 3.2, -3.4, skyX + 3.2, 3.4, 0.7, '#334155', deform, '#0f172a', 0.45);
    drawRoundedBox(ctx, skyX - 2.5, -2.7, skyX + 2.5, 2.7, 0.5, '#38bdf8', deform);
    strokePoly(ctx, [[skyX - 2.0, -1.8], [skyX + 2.0, 1.8]], 'rgba(255,255,255,0.45)', 0.75, deform);

    // Low-profile RV roof air conditioner unit
    const acX = -3.8;
    drawRoundedBox(ctx, acX - 4.0, -3.1, acX + 4.0, 3.1, 1.1, '#e2e8f0', deform, '#64748b', 0.5);
    drawRoundedBox(ctx, acX - 3.2, -2.3, acX + 3.2, 2.3, 0.7, '#ffffff', deform);
    strokePoly(ctx, [[acX - 1.8, -1.6], [acX - 1.8, 1.6]], '#94a3b8', 0.65, deform);
    strokePoly(ctx, [[acX + 1.8, -1.6], [acX + 1.8, 1.6]], '#94a3b8', 0.65, deform);

    // Dual monocrystalline solar panels (rear roof)
    const solX = rearX + 7.4;
    drawRoundedBox(ctx, solX - 4.2, -roofW * 0.72, solX + 4.2, roofW * 0.72, 0.45, '#0f172a', deform, '#475569', 0.45);
    drawRoundedBox(ctx, solX - 3.7, -roofW * 0.66, solX + 3.7, roofW * 0.66, 0.3, '#1e3a8a', deform);
    for (let sy = -roofW * 0.52; sy <= roofW * 0.52; sy += 2.3) {
      strokePoly(ctx, [[solX - 3.6, sy], [solX + 3.6, sy]], 'rgba(147,197,253,0.48)', 0.5, deform);
    }
    strokePoly(ctx, [[solX, -roofW * 0.66], [solX, roofW * 0.66]], 'rgba(147,197,253,0.45)', 0.55, deform);

    // Full-length anodized roll-out awning cassette along right (+Y) roof rail
    drawRoundedBox(ctx, rearX + 2.8, roofW - 0.25, boxFrontX - 1.0, boxW + 0.15, 0.45, '#cbd5e1', deform, '#475569', 0.45);
    strokePoly(ctx, [[rearX + 3.2, roofW + 0.45], [boxFrontX - 1.4, roofW + 0.45]], '#64748b', 0.55, deform);

    // Rear bike rack rail + CHMSL
    strokePoly(ctx, [[rearX - 0.5, -5.2], [rearX - 0.5, 5.2]], '#94a3b8', 0.8, deform);
    drawChmsl(rearX + 1.6, 2.0);
    drawSideMirrorArm(ctx, fWsX1 + 2.2, -cabW + 0.2, -1, 2.4, 2.4, 1.1, '#1e293b', deform);
    drawSideMirrorArm(ctx, fWsX1 + 2.2, cabW - 0.2, 1, 2.4, 2.4, 1.1, '#1e293b', deform);
    return;
  }

  // ==========================================================================
  // 6. TRANSPORTER VAN + AMBULANCE MEDIC VAN + CRITICAL CARE ICU VAN
  //    (van 48x21.5 | ambulance 51x22 | ambulance_van 51x22)
  // ==========================================================================
  const isAmb = type === 'ambulance';
  const isIcu = type === 'ambulance_van';
  const isMedical = isAmb || isIcu;
  const bodyPaint = isMedical ? '#f8fafc' : (car.color || '#cbd5e1');
  const roofPaint = isMedical ? '#f8fafc' : (car.roofColor || shadePaint(bodyPaint, 0.08));

  const hoodX1 = frontX - 6.8;
  const fWsX1 = hoodX1 - 5.2;
  const glassW = halfW - 1.0;
  const roofW = halfW - 2.1;

  // Sculpted van nose hood (skipped if open)
  if (!hoodExposed) {
    drawRoundedBox(
      ctx,
      hoodX1,
      -halfW + 1.6,
      frontX - 2.1,
      halfW - 1.6,
      1.0,
      createBodyMetallicGradient(ctx, halfW - 1.6, bodyPaint),
      deform,
      shadePaint(bodyPaint, -0.34),
      0.55
    );
    strokePoly(ctx, [[hoodX1 + 0.6, -halfW * 0.42], [frontX - 2.8, -halfW * 0.36]], 'rgba(255,255,255,0.25)', 0.65, deform);
    strokePoly(ctx, [[hoodX1 + 0.6, halfW * 0.42], [frontX - 2.8, halfW * 0.36]], 'rgba(0,0,0,0.22)', 0.65, deform);
    if (isMedical) {
      // Medical red / high-vis lime hood accent stripe
      const stripeCol = isIcu ? '#eab308' : '#dc2626';
      drawRoundedBox(ctx, hoodX1 + 1.2, -3.2, frontX - 3.2, 3.2, 0.35, stripeCol, deform);
      drawRoundedBox(ctx, hoodX1 + 2.0, -0.7, frontX - 4.0, 0.7, 0.15, '#ffffff', deform);
      drawRoundedBox(ctx, (hoodX1 + frontX - 2.0) * 0.5 - 0.7, -2.0, (hoodX1 + frontX - 2.0) * 0.5 + 0.7, 2.0, 0.15, '#ffffff', deform);
    }
  }

  // Greenhouse perimeter frame
  drawRoundedBox(ctx, rearX + 1.8, -glassW, hoodX1, glassW, 1.3, '#0f172a', deform);

  // Front windshield
  drawRoundedBox(
    ctx,
    fWsX1,
    -glassW + 0.45,
    hoodX1 - 0.3,
    glassW - 0.45,
    0.8,
    createGlassGradient(ctx, fWsX1, -glassW, hoodX1, glassW, 'blue'),
    deform
  );
  strokePoly(ctx, [[fWsX1 + 0.8, -glassW + 1.8], [hoodX1 - 0.9, glassW - 2.0]], 'rgba(255,255,255,0.28)', 1.0, deform);
  strokePoly(ctx, [[hoodX1 - 0.7, -glassW * 0.36], [fWsX1 + 1.1, -glassW * 0.08]], '#0f172a', 0.7, deform);
  strokePoly(ctx, [[hoodX1 - 0.7, glassW * 0.36], [fWsX1 + 1.1, glassW * 0.08]], '#0f172a', 0.7, deform);

  // Front driver/passenger door glass
  const cabWinX1 = fWsX1 - 8.2;
  drawRoundedBox(ctx, cabWinX1, -glassW + 0.25, fWsX1 - 0.45, -roofW - 0.1, 0.3, '#1a3554', deform);
  drawRoundedBox(ctx, cabWinX1, roofW + 0.1, fWsX1 - 0.45, glassW - 0.25, 0.3, '#1a3554', deform);

  // Twin rear cargo door windows + 50/50 vertical split seam
  drawRoundedBox(ctx, rearX + 1.9, -glassW + 0.85, rearX + 3.8, -0.55, 0.35, '#19314d', deform);
  drawRoundedBox(ctx, rearX + 1.9, 0.55, rearX + 3.8, glassW - 0.85, 0.35, '#19314d', deform);
  strokePoly(ctx, [[rearX + 0.2, 0], [rearX + 4.1, 0]], '#0f172a', 1.0, deform);

  // Full-length ribbed van roof panel
  drawRoundedBox(ctx, rearX + 3.8, -roofW, fWsX1 + 0.25, roofW, 1.25, createRoofGradient(ctx, roofW, roofPaint), deform, shadePaint(roofPaint, -0.35), 0.65);

  if (isMedical) {
    // Bold medical livery stripes along roof edges
    const edgeCol = isIcu ? '#ef4444' : '#dc2626';
    const accentCol = isIcu ? '#facc15' : '#dc2626';
    drawRoundedBox(ctx, rearX + 4.6, -roofW + 0.4, fWsX1 - 1.0, -roofW + 1.55, 0.2, accentCol, deform);
    drawRoundedBox(ctx, rearX + 4.6, roofW - 1.55, fWsX1 - 1.0, roofW - 0.4, 0.2, accentCol, deform);

    // Crisp red medical cross emblem centered on roof
    const cx = -halfL * 0.14;
    const armL = isIcu ? 4.4 : 4.0;
    const armW = 1.45;
    drawRoundedBox(ctx, cx - armL, -armW, cx + armL, armW, 0.2, edgeCol, deform);
    drawRoundedBox(ctx, cx - armW, -armL, cx + armW, armL, 0.2, edgeCol, deform);
    if (isIcu) {
      // ICU High-roof HVAC pod + telemetry antenna behind cross
      drawRoundedBox(ctx, rearX + 6.4, -4.0, rearX + 12.2, 4.0, 0.9, '#e2e8f0', deform, '#64748b', 0.45);
      drawDeformedDot(ctx, rearX + 9.3, 0, 1.65, '#334155', deform, '#94a3b8', 0.35);
      // Secondary rear flashing blue/red beacon bar
      drawEmergencyLightbar(ctx, rearX + 4.9, roofW * 0.56, optics.sirenOn, optics.sirenStrobe + Math.PI, 'red_blue', deform);
    } else {
      // Ventilation mushroom dome on standard medic van roof
      drawDeformedDot(ctx, rearX + 8.5, 0, 2.0, '#e2e8f0', deform, '#64748b', 0.45);
      drawDeformedDot(ctx, rearX + 8.5, 0, 0.85, '#94a3b8', deform);
    }

    // Main aerodynamic front roof emergency lightbar
    drawEmergencyLightbar(
      ctx,
      fWsX1 - 2.2,
      roofW * 0.74,
      optics.sirenOn,
      optics.sirenStrobe,
      isIcu ? 'red_blue' : 'blue_blue',
      deform
    );

    // Side emergency LED strobes along roof edges
    const sLit = optics.sirenOn && Math.sin(optics.sirenStrobe * 3.1) > 0;
    const sCol = sLit ? '#60a5fa' : '#1d4ed8';
    drawRoundedBox(ctx, cx - 1.1, -halfW + 0.25, cx + 1.1, -halfW + 0.85, 0.15, sCol, deform);
    drawRoundedBox(ctx, cx - 1.1, halfW - 0.85, cx + 1.1, halfW - 0.25, 0.15, sCol, deform);
  } else {
    // Commercial cargo van roof stamping ribs
    for (let ry = -roofW * 0.56; ry <= roofW * 0.56; ry += roofW * 0.28) {
      strokePoly(ctx, [[rearX + 6.0, ry], [fWsX1 - 2.2, ry]], 'rgba(0,0,0,0.16)', 0.65, deform);
      strokePoly(ctx, [[rearX + 6.0, ry - 0.45], [fWsX1 - 2.2, ry - 0.45]], 'rgba(255,255,255,0.20)', 0.45, deform);
    }
    // Right-side sliding cargo door track & handle
    strokePoly(ctx, [[rearX + 5.0, halfW - 0.45], [cabWinX1 - 1.5, halfW - 0.45]], '#0f172a', 1.15, deform);
    drawRoundedBox(ctx, cabWinX1 - 2.4, halfW - 1.1, cabWinX1 - 0.4, halfW - 0.4, 0.15, '#1e293b', deform);
  }

  // Rear high-mount CHMSL & wing mirrors
  drawChmsl(rearX + 3.8, 1.9);
  drawSideMirrorArm(ctx, fWsX1 + 2.2, -halfW + 0.3, -1, 2.0, 2.3, 1.05, isMedical ? '#1e293b' : shadePaint(bodyPaint, -0.15), deform);
  drawSideMirrorArm(ctx, fWsX1 + 2.2, halfW - 0.3, 1, 2.0, 2.3, 1.05, isMedical ? '#1e293b' : shadePaint(bodyPaint, -0.15), deform);
}

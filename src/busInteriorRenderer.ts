import type { VehicleRenderContext } from './vehicleArchetypes';
import {
  getCityBusInteriorLayout,
  getMinibusInteriorLayout,
} from './busInteriorSystem';
import {
  Pt,
  DeformFn,
  LiveOpticsState,
  shadePaint,
  fillPoly,
  strokePoly,
  drawRoundedBox,
  drawDeformedDot,
  drawBoxShadow,
  createGlassGradient,
  drawGlassGlint,
} from './vehicleModelPrimitives';

// ============================================================================
// SHARED HIGH-DETAIL TRANSIT INTERIOR PRIMITIVES (SOFTBODY DEFORM-SAFE)
// Two-pass cutaway renderer for CityBus (12m) & Urban Minibus saloons
// ============================================================================

function drawTransitSeat(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  seatLen: number,
  seatWid: number,
  angle: number,
  deform: DeformFn,
  options?: {
    isDriver?: boolean;
    hasGrabRail?: boolean;
    cushionColor?: string;
    accentColor?: string;
    hasArmrests?: boolean;
  }
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toLocal = (lx: number, ly: number): Pt => [
    sx + lx * cos - ly * sin,
    sy + lx * sin + ly * cos,
  ];
  const rectPts = (x1: number, y1: number, x2: number, y2: number): Pt[] => [
    toLocal(x1, y1),
    toLocal(x2, y1),
    toLocal(x2, y2),
    toLocal(x1, y2),
  ];

  const hl = seatLen * 0.5;
  const hw = seatWid * 0.5;
  const isDriver = !!options?.isDriver;
  const cushion = options?.cushionColor ?? (isDriver ? '#1e3a8a' : '#0369a1');
  const accent = options?.accentColor ?? (isDriver ? '#3b82f6' : '#38bdf8');

  // Subtle floor shadow under seat frame
  fillPoly(
    ctx,
    rectPts(-hl - 0.35, -hw - 0.25, hl + 0.15, hw + 0.45),
    'rgba(2,6,23,0.34)',
    deform
  );

  // Outer molded ABS/steel seat bucket shell
  fillPoly(
    ctx,
    rectPts(-hl, -hw, hl, hw),
    '#0f172a',
    deform,
    '#334155',
    0.35
  );

  // Contoured lower thigh & hip cushion
  fillPoly(
    ctx,
    rectPts(-hl + 1.05, -hw + 0.38, hl - 0.25, hw - 0.38),
    cushion,
    deform,
    'rgba(15,23,42,0.55)',
    0.25
  );

  // Woven transit pattern center insert
  fillPoly(
    ctx,
    rectPts(-hl + 1.55, -hw * 0.62, hl - 0.65, hw * 0.62),
    accent,
    deform
  );
  // Dark side bolster shading on cushion
  fillPoly(
    ctx,
    rectPts(-hl + 1.5, -hw * 0.52, hl - 0.8, hw * 0.52),
    shadePaint(cushion, 0.08),
    deform
  );
  // Ergonomic cushion front knee roll seam
  strokePoly(
    ctx,
    [toLocal(hl - 0.85, -hw + 0.5), toLocal(hl - 0.85, hw - 0.5)],
    'rgba(255,255,255,0.16)',
    0.3,
    deform
  );

  // Sculpted backrest bolster
  fillPoly(
    ctx,
    rectPts(-hl + 0.15, -hw + 0.25, -hl + 1.55, hw - 0.25),
    '#1e293b',
    deform,
    '#090d16',
    0.25
  );

  // Padded headrest cushion
  fillPoly(
    ctx,
    rectPts(-hl + 0.18, -hw * 0.48, -hl + 1.25, hw * 0.48),
    shadePaint(cushion, -0.18),
    deform,
    '#0f172a',
    0.22
  );

  // Folding side armrests (for driver / executive cockpit seats)
  if (options?.hasArmrests) {
    for (const side of [-1, 1] as const) {
      fillPoly(
        ctx,
        rectPts(-hl + 0.8, side * (hw + 0.05) - 0.38, hl * 0.45, side * (hw + 0.05) + 0.38),
        '#1e293b',
        deform,
        '#090d16',
        0.22
      );
    }
  }

  // Safety-yellow tubular grab bar on back of passenger seat
  if (options?.hasGrabRail !== false && !isDriver) {
    strokePoly(
      ctx,
      [toLocal(-hl + 0.32, -hw + 0.65), toLocal(-hl + 0.32, hw - 0.65)],
      '#ca8a04',
      0.85,
      deform
    );
    strokePoly(
      ctx,
      [toLocal(-hl + 0.32, -hw + 0.72), toLocal(-hl + 0.32, hw - 0.72)],
      '#facc15',
      0.48,
      deform
    );
  }
}

function drawDoubleTransitBench(
  ctx: CanvasRenderingContext2D,
  sx: number,
  winY: number,
  aisleY: number,
  seatLen: number,
  eachWid: number,
  deform: DeformFn
): void {
  const minY = Math.min(winY, aisleY) - eachWid * 0.5;
  const maxY = Math.max(winY, aisleY) + eachWid * 0.5;
  const hl = seatLen * 0.5;

  // Shared under-bench shadow & steel subframe
  drawBoxShadow(ctx, sx - hl, minY, sx + hl, maxY, 0.55, -0.35, 0.4, 0.28, deform);
  drawRoundedBox(ctx, sx - hl, minY, sx + hl, maxY, 0.55, '#0f172a', deform, '#334155', 0.38);

  // Two distinct ergonomic cushions
  for (const sy of [winY, aisleY]) {
    drawTransitSeat(ctx, sx, sy, seatLen - 0.2, eachWid - 0.25, 0, deform, {
      hasGrabRail: false,
      cushionColor: '#0369a1',
      accentColor: '#38bdf8',
    });
  }

  // Continuous double safety-yellow tubular handrail across rear top edge
  strokePoly(
    ctx,
    [
      [sx - hl + 0.34, minY + 0.65],
      [sx - hl + 0.34, maxY - 0.65],
    ],
    '#a16207',
    0.95,
    deform
  );
  strokePoly(
    ctx,
    [
      [sx - hl + 0.34, minY + 0.72],
      [sx - hl + 0.34, maxY - 0.72],
    ],
    '#facc15',
    0.55,
    deform
  );

  // Vertical aisle-side grab horn sticking slightly upward on aisle corner
  const aisleCornerY = Math.abs(aisleY) < Math.abs(winY) ? aisleY + (aisleY < 0 ? eachWid * 0.42 : -eachWid * 0.42) : winY;
  drawDeformedDot(ctx, sx - hl + 0.34, aisleCornerY, 0.46, '#eab308', deform, '#713f12', 0.22);
}

function drawRotatingSteeringWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  steerAngle: number,
  deform: DeformFn,
  spokes: 3 | 4 = 4
): void {
  // Steering column shroud
  drawRoundedBox(ctx, cx - 0.65, cy - 0.75, cx + 1.15, cy + 0.75, 0.35, '#1e293b', deform, '#090d16', 0.3);

  const rimPts: Pt[] = [];
  const segs = 16;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    rimPts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  // Outer dark leather wheel rim + subtle top gloss
  strokePoly(ctx, rimPts, '#090d16', 1.05, deform, true);
  strokePoly(ctx, rimPts, '#334155', 0.55, deform, true);

  // Spokes rotating smoothly with steerAngle * 2.2
  const wheelRot = (steerAngle || 0) * 2.2;
  const spokeAngles =
    spokes === 4
      ? [0.45, Math.PI - 0.45, Math.PI + 0.45, -0.45]
      : [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  for (const baseA of spokeAngles) {
    const a = baseA + wheelRot;
    strokePoly(
      ctx,
      [
        [cx, cy],
        [cx + Math.cos(a) * (radius - 0.22), cy + Math.sin(a) * (radius - 0.22)],
      ],
      '#1e293b',
      0.58,
      deform
    );
  }

  // Center horn boss & transit emblem dot
  drawDeformedDot(ctx, cx, cy, radius * 0.34, '#0f172a', deform, '#475569', 0.28);
  drawDeformedDot(ctx, cx, cy, radius * 0.14, '#94a3b8', deform);
}

function drawCardValidator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  active: boolean,
  deform: DeformFn
): void {
  // Yellow vertical mounting pole collar
  drawDeformedDot(ctx, x, y, 0.56, '#eab308', deform, '#713f12', 0.28);
  // Contactless NFC validator housing
  drawRoundedBox(ctx, x - 0.9, y - 0.95, x + 0.4, y + 0.15, 0.24, '#0284c7', deform, '#0f172a', 0.3);
  // Dark NFC tap display screen
  drawRoundedBox(ctx, x - 0.7, y - 0.78, x + 0.15, y - 0.12, 0.14, '#090d16', deform);
  // Status LED (green when active/ignition on, dim amber when off)
  drawDeformedDot(ctx, x - 0.32, y - 0.45, 0.24, active ? '#22c55e' : '#78350f', deform);
}

function drawDoorStepwell(
  ctx: CanvasRenderingContext2D,
  doorX: number,
  innerY: number,
  outerY: number,
  doorSpan: number,
  deform: DeformFn
): void {
  const x1 = doorX - doorSpan * 0.5;
  const x2 = doorX + doorSpan * 0.5;
  const yMin = Math.min(innerY, outerY);
  const yMax = Math.max(innerY, outerY);

  // Recessed charcoal anti-slip entry trough
  drawRoundedBox(ctx, x1, yMin, x2, yMax, 0.28, '#0b111c', deform, '#334155', 0.38);

  // Ribbed dark drainage grooves along stepwell
  for (let rx = x1 + 0.85; rx <= x2 - 0.85; rx += 1.05) {
    strokePoly(ctx, [[rx, yMin + 0.65], [rx, yMax - 0.45]], '#1e293b', 0.35, deform);
  }

  // High-visibility safety-yellow hazard nosing edge facing saloon
  drawRoundedBox(ctx, x1 + 0.1, yMin, x2 - 0.1, yMin + 0.78, 0.14, '#eab308', deform, '#713f12', 0.22);
  for (let hx = x1 + 0.65; hx <= x2 - 0.65; hx += 1.3) {
    strokePoly(ctx, [[hx, yMin + 0.08], [hx + 0.42, yMin + 0.70]], 'rgba(15,23,42,0.48)', 0.35, deform);
  }

  // Brushed aluminum outer pneumatic door sill plate
  drawRoundedBox(ctx, x1 + 0.1, yMax - 0.52, x2 - 0.1, yMax, 0.1, '#94a3b8', deform);
}

function drawWheelchairFloorEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  deform: DeformFn
): void {
  const c = 'rgba(248,250,252,0.88)';
  // Rear wheel arc
  const wheelPts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = 0.45 + (i / 12) * Math.PI * 1.45;
    wheelPts.push([cx - 0.35 * scale + Math.cos(a) * 1.15 * scale, cy + 0.45 * scale + Math.sin(a) * 1.15 * scale]);
  }
  strokePoly(ctx, wheelPts, c, 0.48, deform, false);
  // Head dot
  drawDeformedDot(ctx, cx - 0.15 * scale, cy - 1.35 * scale, 0.42 * scale, c, deform);
  // Back, seat & lower leg L-shape
  strokePoly(
    ctx,
    [
      [cx - 0.2 * scale, cy - 0.85 * scale],
      [cx - 0.2 * scale, cy + 0.25 * scale],
      [cx + 0.85 * scale, cy + 0.25 * scale],
      [cx + 1.15 * scale, cy + 1.25 * scale],
    ],
    c,
    0.5,
    deform,
    false
  );
  // Arm reach
  strokePoly(ctx, [[cx - 0.2 * scale, cy - 0.35 * scale], [cx + 0.7 * scale, cy - 0.35 * scale]], c, 0.42, deform);
}

function drawExtinguisher(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  deform: DeformFn
): void {
  drawBoxShadow(ctx, x - 0.7, y - 0.7, x + 0.7, y + 0.7, 0.55, -0.25, 0.25, 0.28, deform);
  drawDeformedDot(ctx, x, y, 0.75, '#dc2626', deform, '#7f1d1d', 0.32);
  drawDeformedDot(ctx, x + 0.15, y - 0.15, 0.28, '#f87171', deform);
  drawDeformedDot(ctx, x, y, 0.22, '#facc15', deform, '#0f172a', 0.18);
}

// ============================================================================
// PASS 1: FLOORING, WHEELHOUSES, STEPWELLS, COCKPIT & PASSENGER SEATS
// ============================================================================

export function renderBusInteriorChassisLayer(
  vCtx: VehicleRenderContext,
  opt: LiveOpticsState
): void {
  const { ctx, car, deform } = vCtx;
  if (car.type === 'bus') {
    renderCityBusInteriorChassis(ctx, car.steerAngle || 0, opt, deform, car);
  } else if (car.type === 'bus_minibus') {
    renderMinibusInteriorChassis(ctx, car.steerAngle || 0, opt, deform, car);
  }
}

function renderCityBusInteriorChassis(
  ctx: CanvasRenderingContext2D,
  steerAngle: number,
  opt: LiveOpticsState,
  deform: DeformFn,
  car: { length?: number; width?: number }
): void {
  const cb = getCityBusInteriorLayout(car);
  const wY = cb.wallInY;
  const fX = cb.frontWallX;
  const rX = cb.rearWallX;

  // 1. Interior structural floor deck (Speckled Transit Tarkett #1c2636)
  drawRoundedBox(ctx, rX - 0.6, -wY, fX + 0.8, wY, 0.9, '#1b2432', deform, '#090d16', 0.55);

  // Subtle floor panel cross seams & speckled rubber texture dots
  for (let fx = rX + 6.0; fx < fX - 3.0; fx += 8.5) {
    strokePoly(ctx, [[fx, -wY + 0.4], [fx, wY - 0.4]], 'rgba(15,23,42,0.34)', 0.35, deform);
  }

  // Central walkable low-floor aisle runner (10.4 px clear corridor)
  drawRoundedBox(
    ctx,
    cb.rearBenchFrontX,
    -2.55,
    cb.cabPartitionX - 0.4,
    7.65,
    0.35,
    '#253143',
    deform
  );
  // Front boarding vestibule aisle merge
  drawRoundedBox(
    ctx,
    cb.cabPartitionX - 0.5,
    cb.cabSideY + 0.3,
    fX - 2.2,
    wY - 0.3,
    0.35,
    '#232f40',
    deform
  );
  // Brushed aluminum aisle edge trim strips
  strokePoly(ctx, [[cb.rearBenchFrontX, -2.55], [cb.cabPartitionX - 0.4, -2.55]], 'rgba(148,163,184,0.28)', 0.35, deform);
  strokePoly(ctx, [[cb.rearBenchFrontX, 7.65], [cb.cabPartitionX - 0.4, 7.65]], 'rgba(148,163,184,0.28)', 0.35, deform);

  // 2. Sculpted Wheelhouse Covers (Front & Rear Axle Humped Housings)
  for (const ax of [cb.frontAxleX, cb.rearAxleX]) {
    const halfAx = ax > 0 ? 5.6 : 6.2;
    for (const side of [-1, 1] as const) {
      const yOut = side * wY;
      const yIn = side * (wY - 5.2);
      const y1 = Math.min(yOut, yIn);
      const y2 = Math.max(yOut, yIn);
      drawRoundedBox(ctx, ax - halfAx, y1, ax + halfAx, y2, 0.55, '#131b26', deform, '#334155', 0.4);
      // Ribbed top anti-slip pad & yellow edge warning trim on wheelhouse step
      strokePoly(
        ctx,
        [[ax - halfAx + 0.6, yIn], [ax + halfAx - 0.6, yIn]],
        'rgba(234,179,8,0.45)',
        0.42,
        deform
      );
    }
  }

  // 3. Wheelchair & Stroller Standing Bay (накопительная площадка opposite middle door)
  drawRoundedBox(
    ctx,
    cb.wheelchairBayX1,
    cb.wheelchairBayY1,
    cb.wheelchairBayX2,
    cb.wheelchairBayY2,
    0.55,
    '#1e3a5f',
    deform,
    '#38bdf8',
    0.38
  );
  drawWheelchairFloorEmblem(
    ctx,
    (cb.wheelchairBayX1 + cb.wheelchairBayX2) * 0.5,
    (cb.wheelchairBayY1 + cb.wheelchairBayY2) * 0.5 + 0.8,
    1.7,
    deform
  );
  // Padded ergonomic hip-rest cushion along left bay wall
  drawRoundedBox(
    ctx,
    cb.wheelchairBayX1 + 1.2,
    cb.wheelchairBayY1 + 0.1,
    cb.wheelchairBayX2 - 1.2,
    cb.wheelchairBayY1 + 1.15,
    0.3,
    '#0f172a',
    deform,
    '#475569',
    0.3
  );
  // Two tip-up folding seats mounted in bay
  for (const fx of cb.foldingSeatXs) {
    drawTransitSeat(ctx, fx, cb.foldingSeatY, 4.4, 4.6, Math.PI / 2, deform, {
      cushionColor: '#0284c7',
      accentColor: '#7dd3fc',
      hasGrabRail: false,
    });
  }
  // Yellow safety rail guarding forward edge of wheelchair bay
  strokePoly(
    ctx,
    [[cb.wheelchairBayX2, cb.wheelchairBayY1 + 0.5], [cb.wheelchairBayX2, cb.wheelchairBayY2 - 0.4]],
    '#eab308',
    0.75,
    deform
  );

  // 4. Three Recessed Boarding Door Stepwells (+ Middle Wheelchair Fold-Out Ramp Plate)
  drawDoorStepwell(ctx, cb.doorFrontX, wY - 2.65, wY + 0.15, 7.6, deform);
  drawDoorStepwell(ctx, cb.doorMidX, wY - 2.65, wY + 0.15, 8.6, deform);
  drawDoorStepwell(ctx, cb.doorRearX, wY - 2.65, wY + 0.15, 8.0, deform);
  // Fold-out manual wheelchair ramp hinge plate tucked cleanly inside middle door sill
  drawRoundedBox(
    ctx,
    cb.doorMidX - 3.0,
    wY - 2.55,
    cb.doorMidX + 3.0,
    wY - 0.7,
    0.15,
    '#334155',
    deform,
    '#94a3b8',
    0.25
  );

  // 5. Rear Raised Engine Compartment Podium & 4-Seat Rear Row
  drawRoundedBox(
    ctx,
    rX,
    -wY,
    cb.rearBenchFrontX,
    wY,
    0.55,
    '#141c28',
    deform,
    '#334155',
    0.42
  );
  // Brushed aluminum step riser & hazard strip along edge of rear engine podium
  strokePoly(ctx, [[cb.rearBenchFrontX, -wY + 0.5], [cb.rearBenchFrontX, wY - 0.5]], '#94a3b8', 0.65, deform);
  strokePoly(ctx, [[cb.rearBenchFrontX + 0.45, -wY + 0.8], [cb.rearBenchFrontX + 0.45, wY - 0.8]], 'rgba(234,179,8,0.55)', 0.35, deform);
  // Engine maintenance floor access hatch seam behind rear seat backs
  drawRoundedBox(ctx, rX + 0.5, -5.8, rX + 3.2, 5.8, 0.25, '#0f172a', deform, '#475569', 0.32);

  for (const ry of cb.rearSeatYs) {
    drawTransitSeat(ctx, cb.rearBenchSeatX, ry, 5.4, 5.4, 0, deform, {
      hasGrabRail: false,
      cushionColor: '#0369a1',
      accentColor: '#38bdf8',
    });
  }

  // 6. Driver Cockpit Enclosure (Front-Left)
  const cabX1 = cb.cabPartitionX;
  const cabX2 = fX;
  const cabY1 = -wY;
  const cabY2 = cb.cabSideY;

  // Rubberized driver floor mat & pedal cluster (clutch, brake, accelerator)
  drawRoundedBox(ctx, cabX1 + 0.8, cabY1 + 0.6, cabX2 - 2.6, cabY2 - 0.6, 0.45, '#0c121d', deform, '#1e293b', 0.35);
  for (const py of [cb.driverSeatY - 1.6, cb.driverSeatY, cb.driverSeatY + 1.7]) {
    drawRoundedBox(ctx, cb.steerX - 0.8, py - 0.45, cb.steerX + 0.6, py + 0.45, 0.14, '#334155', deform, '#64748b', 0.22);
  }

  // Curved Wrap-Around Bus Dashboard & Instrument Binnacle
  fillPoly(
    ctx,
    [
      [fX + 0.3, -wY + 0.3],
      [fX + 0.5, wY - 0.3],
      [fX - 2.3, wY - 0.5],
      [fX - 2.0, cabY2 + 0.6],
      [fX - 2.5, cabY2 - 0.5],
      [fX - 3.6, cb.driverSeatY],
      [fX - 2.5, -wY + 0.4],
    ],
    '#0f172a',
    deform,
    '#334155',
    0.45
  );

  // Backlit instrument cluster gauges & transit telemetry display
  const dashGaugeX = fX - 2.35;
  drawRoundedBox(ctx, dashGaugeX - 0.75, cb.driverSeatY - 2.6, dashGaugeX + 0.55, cb.driverSeatY + 2.6, 0.25, '#020617', deform, '#475569', 0.28);
  for (const [gy, col] of [
    [cb.driverSeatY - 1.5, opt.ignitionOn ? '#38bdf8' : '#1e293b'],
    [cb.driverSeatY, opt.ignitionOn ? '#22c55e' : '#1e293b'],
    [cb.driverSeatY + 1.5, opt.ignitionOn ? '#f59e0b' : '#1e293b'],
  ] as const) {
    drawDeformedDot(ctx, dashGaugeX - 0.1, gy, 0.55, col, deform);
  }

  // Right-side driver control pod: 3 pneumatic door buttons + hazard + transmission keypad
  const podX = fX - 3.2;
  drawRoundedBox(ctx, podX - 2.6, cabY2 - 2.2, podX + 1.0, cabY2 - 0.45, 0.22, '#1e293b', deform, '#475569', 0.25);
  for (const [bx, col] of [
    [podX - 1.9, '#22c55e'],
    [podX - 1.1, '#22c55e'],
    [podX - 0.3, '#ef4444'],
    [podX + 0.5, '#f59e0b'],
  ] as const) {
    drawDeformedDot(ctx, bx, cabY2 - 1.32, 0.28, col, deform);
  }

  // Live Rotating 4-Spoke Heavy Transit Steering Wheel
  drawRotatingSteeringWheel(ctx, cb.steerX, cb.steerY, 2.45, steerAngle, deform, 4);

  // Suspended Air-Ride Driver Seat
  drawTransitSeat(ctx, cb.driverSeatX, cb.driverSeatY, 6.2, 6.2, 0, deform, {
    isDriver: true,
    hasArmrests: true,
    cushionColor: '#1e3a8a',
    accentColor: '#60a5fa',
  });

  // Glazed Driver Cabin Partition Walls + Hinged Entry Gate + Ticket Hatch
  drawRoundedBox(ctx, cabX1 - 0.45, cabY1, cabX1 + 0.45, cabY2 + 0.35, 0.2, '#334155', deform, '#090d16', 0.38);
  // Tempered glass window pane on rear bulkhead
  strokePoly(ctx, [[cabX1, cabY1 + 1.2], [cabX1, cabY2 - 1.0]], '#7dd3fc', 0.45, deform);
  // Side glass partition & ticket transaction tray
  drawRoundedBox(ctx, cabX1 + 5.2, cabY2 - 0.35, fX - 2.4, cabY2 + 0.35, 0.18, '#334155', deform, '#090d16', 0.35);
  strokePoly(ctx, [[cabX1 + 6.0, cabY2], [fX - 3.2, cabY2]], '#7dd3fc', 0.42, deform);
  // Hinged cabin door (half-height partition gate)
  strokePoly(ctx, [[cabX1 + 0.5, cabY2], [cabX1 + 5.1, cabY2]], '#475569', 0.85, deform);
  // Small ticket pass-through tray
  drawRoundedBox(ctx, cabX1 + 8.5, cabY2 - 0.55, cabX1 + 12.2, cabY2 + 0.55, 0.16, '#94a3b8', deform, '#1e293b', 0.22);

  // 7. Passenger Double & Single Seats
  for (const sx of cb.leftRowXs) {
    drawDoubleTransitBench(ctx, sx, cb.leftWinY, cb.leftAisleY, 5.4, 5.0, deform);
  }
  for (const sx of cb.rightRowXs) {
    drawBoxShadow(ctx, sx - 2.7, cb.rightSingleY - 2.6, sx + 2.7, cb.rightSingleY + 2.6, 0.5, -0.3, 0.35, 0.25, deform);
    drawTransitSeat(ctx, sx, cb.rightSingleY, 5.4, 5.2, 0, deform, {
      cushionColor: '#0369a1',
      accentColor: '#38bdf8',
    });
  }

  // 8. Tempered-Glass Door Modesty Screens & Vertical Stanchion Bases + NFC Validators + Fire Extinguisher
  const modestyScreens: [number, number, number][] = [
    [cb.doorFrontX - 4.1, wY - 4.5, wY - 0.2],
    [cb.doorMidX + 4.6, wY - 4.5, wY - 0.2],
    [cb.doorMidX - 4.6, wY - 4.5, wY - 0.2],
    [cb.doorRearX + 4.3, wY - 4.5, wY - 0.2],
  ];
  for (const [mx, y1, y2] of modestyScreens) {
    strokePoly(ctx, [[mx, y1], [mx, y2]], '#eab308', 0.72, deform);
    strokePoly(ctx, [[mx, y1 + 0.4], [mx, y2 - 0.4]], 'rgba(125,211,252,0.55)', 0.35, deform);
    drawDeformedDot(ctx, mx, y1, 0.5, '#eab308', deform, '#713f12', 0.22);
  }

  // NFC Contactless Fare Validators at all 3 doors
  drawCardValidator(ctx, cb.doorFrontX - 4.1, wY - 3.9, opt.ignitionOn, deform);
  drawCardValidator(ctx, cb.doorMidX + 4.6, wY - 3.9, opt.ignitionOn, deform);
  drawCardValidator(ctx, cb.doorMidX - 4.6, wY - 3.9, opt.ignitionOn, deform);
  drawCardValidator(ctx, cb.doorRearX + 4.3, wY - 3.9, opt.ignitionOn, deform);

  // Additional aisle stanchion column bases
  for (const [px, py] of [
    [cb.cabPartitionX - 0.5, 0.4],
    [cb.wheelchairBayX1, cb.wheelchairBayY2 + 0.3],
    [cb.wheelchairBayX2, cb.wheelchairBayY2 + 0.3],
  ] as const) {
    drawDeformedDot(ctx, px, py, 0.55, '#eab308', deform, '#713f12', 0.25);
  }

  // ОП-5 Red Powder Fire Extinguisher mounted near front right bulkhead
  drawExtinguisher(ctx, cb.cabPartitionX + 1.2, wY - 1.4, deform);
}

function renderMinibusInteriorChassis(
  ctx: CanvasRenderingContext2D,
  steerAngle: number,
  opt: LiveOpticsState,
  deform: DeformFn,
  car: { length?: number; width?: number }
): void {
  const mb = getMinibusInteriorLayout(car);
  const wY = mb.wallInY;
  const fX = mb.frontWallX;
  const rX = mb.rearWallX;

  // 1. Textured charcoal commercial minibus floor deck
  drawRoundedBox(ctx, rX - 0.5, -wY, fX + 0.8, wY, 0.8, '#1a2332', deform, '#090d16', 0.5);

  // Brushed aluminum seat-rail channels along floor
  for (const ry of [-wY + 1.1, -4.9, 4.9, wY - 1.1]) {
    strokePoly(ctx, [[rX + 4.5, ry], [mb.cabPartitionX - 0.8, ry]], 'rgba(148,163,184,0.34)', 0.42, deform);
  }

  // Light-slate ribbed central walkable aisle runner (~9.8 px wide!)
  drawRoundedBox(ctx, mb.rearBenchX + 2.4, -4.6, mb.cabPartitionX + 0.4, 4.6, 0.3, '#253143', deform);
  for (let rx = mb.rearBenchX + 3.6; rx < mb.cabPartitionX; rx += 3.2) {
    strokePoly(ctx, [[rx, -4.3], [rx, 4.3]], 'rgba(15,23,42,0.28)', 0.32, deform);
  }

  // Rear wheelhouse floor boxes
  for (const side of [-1, 1] as const) {
    const yOut = side * wY;
    const yIn = side * (wY - 3.6);
    drawRoundedBox(
      ctx,
      mb.rearAxleX - 4.8,
      Math.min(yOut, yIn),
      mb.rearAxleX + 4.8,
      Math.max(yOut, yIn),
      0.45,
      '#111827',
      deform,
      '#334155',
      0.35
    );
  }

  // 2. Wide Sliding Door Stepwell (+ Vertical Entry Stanchion & NFC Validator)
  drawDoorStepwell(ctx, mb.doorSlideX, wY - 2.35, wY + 0.15, 7.6, deform);
  drawDeformedDot(ctx, mb.doorSlideX - 3.6, wY - 2.8, 0.52, '#cbd5e1', deform, '#334155', 0.25);
  drawCardValidator(ctx, mb.doorSlideX + 3.6, wY - 2.4, opt.ignitionOn, deform);

  // 3. Front Semi-Bonnet Cockpit (Dashboard, Cluster, Screen, Gearstick, Pedals, Wheel, Dual Seats)
  drawRoundedBox(ctx, mb.cabPartitionX + 0.6, -wY + 0.4, fX - 1.8, wY - 0.4, 0.45, '#111827', deform, '#1e293b', 0.32);

  // Sculpted Sprinter/Transit full-width dashboard
  drawRoundedBox(ctx, fX - 2.3, -wY + 0.3, fX + 0.5, wY - 0.3, 0.45, '#0f172a', deform, '#334155', 0.4);
  // Driver illuminated instrument binnacle
  drawRoundedBox(ctx, fX - 2.0, mb.driverSeatY - 2.3, fX - 0.6, mb.driverSeatY + 2.3, 0.25, '#020617', deform, '#475569', 0.26);
  drawDeformedDot(ctx, fX - 1.3, mb.driverSeatY - 1.0, 0.48, opt.ignitionOn ? '#38bdf8' : '#1e293b', deform);
  drawDeformedDot(ctx, fX - 1.3, mb.driverSeatY + 1.0, 0.48, opt.ignitionOn ? '#22c55e' : '#1e293b', deform);
  // Center infotainment / navigation display
  drawRoundedBox(ctx, fX - 2.1, -1.5, fX - 0.9, 1.5, 0.22, opt.ignitionOn ? '#0c4a6e' : '#090d16', deform, '#475569', 0.25);
  // Pedals on driver floor
  for (const py of [mb.driverSeatY - 1.4, mb.driverSeatY, mb.driverSeatY + 1.4]) {
    drawRoundedBox(ctx, mb.steerX - 0.5, py - 0.38, mb.steerX + 0.5, py + 0.38, 0.12, '#334155', deform);
  }
  // Gearshift lever & boot + handbrake between front seats
  drawRoundedBox(ctx, mb.steerX - 1.8, -1.6, mb.steerX - 0.2, 0.2, 0.35, '#1e293b', deform, '#475569', 0.22);
  drawDeformedDot(ctx, mb.steerX - 1.0, -0.7, 0.52, '#090d16', deform, '#cbd5e1', 0.24);
  drawRoundedBox(ctx, mb.driverSeatX - 0.5, -1.1, mb.driverSeatX + 1.6, -0.3, 0.15, '#1e293b', deform, '#64748b', 0.22);

  // Live Rotating 3-Spoke Minibus Steering Wheel
  drawRotatingSteeringWheel(ctx, mb.steerX, mb.steerY, 2.1, steerAngle, deform, 3);

  // Driver & Front Co-Driver Seats
  drawTransitSeat(ctx, mb.driverSeatX, mb.driverSeatY, 5.5, 5.6, 0, deform, {
    isDriver: true,
    hasArmrests: true,
    cushionColor: '#1e3a8a',
    accentColor: '#60a5fa',
  });
  drawTransitSeat(ctx, mb.frontPassSeatX, mb.frontPassSeatY, 5.5, 5.6, 0, deform, {
    hasGrabRail: false,
    hasArmrests: true,
    cushionColor: '#1e3a8a',
    accentColor: '#60a5fa',
  });

  // Glazed Partition Behind Driver Seat + Yellow Top Grab Bar
  drawRoundedBox(
    ctx,
    mb.cabPartitionX - 0.38,
    -wY,
    mb.cabPartitionX + 0.38,
    mb.cabPartitionEndY,
    0.18,
    '#334155',
    deform,
    '#090d16',
    0.35
  );
  strokePoly(ctx, [[mb.cabPartitionX, -wY + 0.8], [mb.cabPartitionX, mb.cabPartitionEndY - 0.5]], '#eab308', 0.55, deform);
  drawExtinguisher(ctx, mb.cabPartitionX - 0.9, -wY + 1.15, deform);

  // 4. Passenger Saloon Seats (4 Left + 3 Right + 3 Rear Bench)
  for (const sx of mb.leftSeatXs) {
    drawBoxShadow(ctx, sx - 2.65, mb.leftSeatY - 2.65, sx + 2.65, mb.leftSeatY + 2.65, 0.45, -0.28, 0.32, 0.24, deform);
    drawTransitSeat(ctx, sx, mb.leftSeatY, 5.3, 5.4, 0, deform, {
      cushionColor: '#0369a1',
      accentColor: '#38bdf8',
    });
  }
  for (const sx of mb.rightSeatXs) {
    drawBoxShadow(ctx, sx - 2.65, mb.rightSeatY - 2.65, sx + 2.65, mb.rightSeatY + 2.65, 0.45, -0.28, 0.32, 0.24, deform);
    drawTransitSeat(ctx, sx, mb.rightSeatY, 5.3, 5.4, 0, deform, {
      cushionColor: '#0369a1',
      accentColor: '#38bdf8',
    });
  }

  // Rear 3-seat full-width padded row
  drawBoxShadow(ctx, mb.rearBenchX - 2.8, -wY + 0.6, mb.rearBenchX + 2.6, wY - 0.6, 0.5, -0.3, 0.32, 0.24, deform);
  for (const ry of mb.rearSeatYs) {
    drawTransitSeat(ctx, mb.rearBenchX, ry, 5.3, 5.5, 0, deform, {
      hasGrabRail: false,
      cushionColor: '#0369a1',
      accentColor: '#38bdf8',
    });
  }
}

// ============================================================================
// PASS 2: CUTAWAY EAVES, GLASS, OPEN DOOR LEAVES & OVERHEAD HANDRAILS
// ============================================================================

export function renderBusInteriorUpperLayer(
  vCtx: VehicleRenderContext,
  opt: LiveOpticsState
): void {
  const { ctx, car, halfL, halfW, fc, rc, deform } = vCtx;
  if (car.type === 'bus') {
    renderCityBusInteriorUpper(ctx, car, halfL, halfW, fc, rc, opt, deform);
  } else if (car.type === 'bus_minibus') {
    renderMinibusInteriorUpper(ctx, car, halfL, halfW, fc, rc, opt, deform);
  }
}

function renderCityBusInteriorUpper(
  ctx: CanvasRenderingContext2D,
  car: { color?: string; length?: number; width?: number; wiperAngle?: number },
  halfL: number,
  halfW: number,
  fc: number,
  rc: number,
  opt: LiveOpticsState,
  deform: DeformFn
): void {
  const cb = getCityBusInteriorLayout(car);
  const fX = halfL - fc;
  const rX = -halfL + rc;
  const wsFront = fX - 1.2;
  const wsRear = fX - 3.8;
  const gW = halfW * 0.90;
  const baseColor = car.color || '#2563eb';
  const wallIn = cb.wallInY;

  // 1. Cutaway Side Window Rails & Mullions (Split around all 3 open boarding doors on +Y!)
  // Left side continuous side rail & tinted bonded window strip
  drawRoundedBox(ctx, rX + 2.0, -halfW + 0.15, wsRear + 0.4, -wallIn + 0.15, 0.2, '#0f172a', deform, '#020617', 0.4);
  strokePoly(
    ctx,
    [[rX + 3.2, -halfW + 0.72], [wsRear - 0.5, -halfW + 0.72]],
    'rgba(56,189,248,0.48)',
    0.72,
    deform
  );

  // Right side window rail segments leaving exact door gaps at doorFrontX, doorMidX, doorRearX
  const rSegments: [number, number][] = [
    [rX + 2.0, cb.doorRearX - 4.2],
    [cb.doorRearX + 4.2, cb.doorMidX - 4.5],
    [cb.doorMidX + 4.5, cb.doorFrontX - 4.0],
    [cb.doorFrontX + 4.0, wsRear + 0.4],
  ];
  for (const [sx1, sx2] of rSegments) {
    if (sx2 > sx1 + 1.0) {
      drawRoundedBox(ctx, sx1, wallIn - 0.15, sx2, halfW - 0.15, 0.2, '#0f172a', deform, '#020617', 0.4);
      strokePoly(ctx, [[sx1 + 0.8, halfW - 0.72], [sx2 - 0.8, halfW - 0.72]], 'rgba(56,189,248,0.48)', 0.72, deform);
    }
  }

  // Pillar mullions + red emergency glass-breaker hammers on window pillars
  for (let px = -halfL * 0.76; px <= halfL * 0.68; px += 12.0) {
    strokePoly(ctx, [[px, -halfW + 0.15], [px, -wallIn + 0.15]], shadePaint(baseColor, -0.1), 0.78, deform);
    // Small red emergency hammer bracket
    drawRoundedBox(ctx, px - 0.35, -wallIn - 0.1, px + 0.35, -wallIn + 0.42, 0.1, '#dc2626', deform);
  }

  // Open inward-plug/folded door leaves parked neatly at each of the 3 door jambs
  for (const [dx, halfSpan] of [
    [cb.doorFrontX, 3.8],
    [cb.doorMidX, 4.3],
    [cb.doorRearX, 4.0],
  ] as const) {
    // Forward leaf swung open inside/outward
    fillPoly(
      ctx,
      [
        [dx + halfSpan - 0.2, halfW - 0.2],
        [dx + halfSpan + 0.6, halfW + 1.8],
        [dx + halfSpan + 0.2, halfW + 2.1],
        [dx + halfSpan - 0.6, halfW + 0.1],
      ],
      '#1e293b',
      deform,
      '#090d16',
      0.35
    );
    // Rearward leaf swung open
    fillPoly(
      ctx,
      [
        [dx - halfSpan + 0.2, halfW - 0.2],
        [dx - halfSpan - 0.6, halfW + 1.8],
        [dx - halfSpan - 0.2, halfW + 2.1],
        [dx - halfSpan + 0.6, halfW + 0.1],
      ],
      '#1e293b',
      deform,
      '#090d16',
      0.35
    );
  }

  // 2. Curved Panoramic Front Windshield Header + Lit Route Matrix + Mirrors + Rear Window Sill
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
    0.65
  );
  drawGlassGlint(ctx, wsRear + 0.3, -gW * 0.85, wsFront - 0.3, gW * 0.85, 0.18, deform);

  // Backlit amber route number board above windshield
  drawRoundedBox(ctx, wsRear - 1.2, -gW * 0.48, wsRear + 0.4, gW * 0.48, 0.28, '#090d16', deform, '#334155', 0.35);
  strokePoly(
    ctx,
    [[wsRear - 0.4, -gW * 0.38], [wsRear - 0.4, gW * 0.38]],
    opt.ignitionOn || opt.positionOn ? '#fbbf24' : '#78350f',
    0.8,
    deform
  );

  // Wide-angle convex interior driver saloon mirror
  drawRoundedBox(ctx, wsRear - 0.3, -2.5, wsRear + 0.5, -0.5, 0.2, '#e2e8f0', deform, '#0f172a', 0.3);

  // Forward-swept exterior bus mirrors
  for (const side of [-1, 1] as const) {
    const mBaseX = halfL * 0.88;
    const mBaseY = side * (halfW - 0.4);
    const mTipX = fX + 1.4;
    const mTipY = side * (halfW + 2.3);
    strokePoly(ctx, [[mBaseX, mBaseY], [mTipX - 1.0, mTipY], [mTipX, mTipY]], '#0f172a', 0.85, deform);
    drawRoundedBox(ctx, mTipX - 1.4, mTipY - 0.72, mTipX + 1.4, mTipY + 0.72, 0.45, '#1e293b', deform, '#475569', 0.35);
  }

  // Rear header trim lip
  drawRoundedBox(ctx, rX + 0.4, -wallIn, rX + 2.2, wallIn, 0.3, shadePaint(baseColor, -0.15), deform, '#090d16', 0.45);

  // 3. Semi-Transparent Overhead Handrail Lattice, Straps & Cabin LED Strip Lights
  ctx.save();
  ctx.globalAlpha = 0.58;
  const railStartX = cb.rearBenchFrontX + 1.5;
  const railEndX = cb.cabPartitionX + 1.0;

  // Dual longitudinal yellow overhead grab rails
  for (const railY of [-2.4, 5.2]) {
    strokePoly(ctx, [[railStartX, railY], [railEndX, railY]], '#713f12', 1.0, deform);
    strokePoly(ctx, [[railStartX, railY], [railEndX, railY]], '#facc15', 0.62, deform);

    // Hanging passenger grip loops along rails
    for (let sx = railStartX + 4.5; sx <= railEndX - 3.0; sx += 7.5) {
      drawRoundedBox(ctx, sx - 0.42, railY - 0.9, sx + 0.42, railY + 0.9, 0.25, '#1e293b', deform, '#eab308', 0.24);
    }
  }

  // Transverse ceiling crossbar handrails connecting left/right walls & longitudinal rails
  for (const bx of [cb.doorFrontX - 4.1, cb.wheelchairBayX2, cb.wheelchairBayX1, cb.doorRearX + 4.3]) {
    strokePoly(ctx, [[bx, -wallIn + 0.4], [bx, wallIn - 0.4]], '#eab308', 0.55, deform);
  }

  // Warm-white longitudinal LED ceiling light strips (brighter when ignition on)
  const ledCol = opt.ignitionOn || opt.positionOn ? 'rgba(254,249,195,0.85)' : 'rgba(148,163,184,0.38)';
  for (const ly of [-4.2, 4.2]) {
    for (let lx = railStartX + 2.0; lx < railEndX - 6.0; lx += 18.0) {
      strokePoly(ctx, [[lx, ly], [lx + 11.0, ly]], ledCol, 0.65, deform);
    }
  }
  ctx.restore();
}

function renderMinibusInteriorUpper(
  ctx: CanvasRenderingContext2D,
  car: { color?: string; length?: number; width?: number; wiperAngle?: number },
  halfL: number,
  halfW: number,
  fc: number,
  rc: number,
  opt: LiveOpticsState,
  deform: DeformFn
): void {
  const mb = getMinibusInteriorLayout(car);
  const fX = halfL - fc;
  const rX = -halfL + rc;
  const wsFront = halfL * 0.68;
  const wsRear = halfL * 0.48;
  const gW = halfW * 0.88;
  const baseColor = car.color || '#cbd5e1';
  const wallIn = mb.wallInY;

  // 1. Cutaway Side Window Rails (Left intact, Right cleanly open at sliding door mb.doorSlideX)
  drawRoundedBox(ctx, rX + 1.5, -halfW + 0.15, wsRear + 0.4, -wallIn + 0.15, 0.2, '#0f172a', deform, '#020617', 0.38);
  strokePoly(ctx, [[rX + 2.5, -halfW + 0.62], [wsRear - 0.4, -halfW + 0.62]], 'rgba(56,189,248,0.48)', 0.65, deform);

  const doorX1 = mb.doorSlideX - 3.8;
  const doorX2 = mb.doorSlideX + 3.8;
  drawRoundedBox(ctx, rX + 1.5, wallIn - 0.15, doorX1, halfW - 0.15, 0.2, '#0f172a', deform, '#020617', 0.38);
  strokePoly(ctx, [[rX + 2.5, halfW - 0.62], [doorX1 - 0.6, halfW - 0.62]], 'rgba(56,189,248,0.48)', 0.65, deform);
  drawRoundedBox(ctx, doorX2, wallIn - 0.15, wsRear + 0.4, halfW - 0.15, 0.2, '#0f172a', deform, '#020617', 0.38);
  strokePoly(ctx, [[doorX2 + 0.5, halfW - 0.62], [wsRear - 0.4, halfW - 0.62]], 'rgba(56,189,248,0.48)', 0.65, deform);

  // Side window pillars
  for (let px = -halfL * 0.68; px <= halfL * 0.38; px += 11.2) {
    strokePoly(ctx, [[px, -halfW + 0.15], [px, -wallIn + 0.15]], shadePaint(baseColor, -0.12), 0.72, deform);
  }

  // Retracted Open Sliding Door Leaf parked along right flank track rail behind door opening
  drawRoundedBox(
    ctx,
    doorX1 - 7.8,
    halfW - 0.05,
    doorX1 - 0.2,
    halfW + 0.85,
    0.22,
    shadePaint(baseColor, -0.08),
    deform,
    '#090d16',
    0.38
  );
  strokePoly(ctx, [[doorX1 - 7.1, halfW + 0.4], [doorX1 - 0.9, halfW + 0.4]], 'rgba(56,189,248,0.45)', 0.35, deform);

  // 2. Front Panoramic Windshield, Amber Route Display & Mirrors
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
    0.6
  );
  drawGlassGlint(ctx, wsRear + 0.3, -gW * 0.82, wsFront - 0.3, gW * 0.82, 0.16, deform);

  // Lit Amber Shuttle Route Display Box
  drawRoundedBox(ctx, wsRear - 0.8, -gW * 0.42, wsRear + 0.5, gW * 0.42, 0.2, '#090d16', deform);
  strokePoly(
    ctx,
    [[wsRear - 0.15, -gW * 0.34], [wsRear - 0.15, gW * 0.34]],
    opt.ignitionOn || opt.positionOn ? '#fbbf24' : '#78350f',
    0.65,
    deform
  );

  // Side mirrors
  for (const side of [-1, 1] as const) {
    const mBaseX = halfL * 0.56;
    const mBaseY = side * (halfW - 0.35);
    const mTipX = mBaseX + 0.85;
    const mTipY = mBaseY + side * 2.35;
    strokePoly(ctx, [[mBaseX - 0.7, mBaseY], [mTipX, mTipY], [mBaseX + 1.0, mBaseY]], '#0f172a', 0.72, deform);
    drawRoundedBox(ctx, mTipX - 1.15, mTipY - 0.58, mTipX + 1.15, mTipY + 0.58, 0.4, '#1e293b', deform, '#475569', 0.32);
  }

  // Rear barn-door header frame
  drawRoundedBox(ctx, rX + 0.2, -wallIn, rX + 1.8, wallIn, 0.25, shadePaint(baseColor, -0.14), deform, '#090d16', 0.4);

  // 3. Semi-Transparent Overhead Handrails & Dome Strips
  ctx.save();
  ctx.globalAlpha = 0.55;
  const railStartX = mb.rearBenchX + 1.2;
  const railEndX = mb.cabPartitionX + 0.6;
  for (const ry of [-3.5, 3.5]) {
    strokePoly(ctx, [[railStartX, ry], [railEndX, ry]], '#713f12', 0.85, deform);
    strokePoly(ctx, [[railStartX, ry], [railEndX, ry]], '#facc15', 0.52, deform);
    for (let sx = railStartX + 4.0; sx <= railEndX - 3.0; sx += 8.2) {
      drawRoundedBox(ctx, sx - 0.35, ry - 0.72, sx + 0.35, ry + 0.72, 0.2, '#1e293b', deform, '#eab308', 0.22);
    }
  }
  const ledCol = opt.ignitionOn || opt.positionOn ? 'rgba(254,249,195,0.82)' : 'rgba(148,163,184,0.34)';
  strokePoly(ctx, [[railStartX + 2.0, 0], [railEndX - 2.0, 0]], ledCol, 0.65, deform);
  ctx.restore();
}

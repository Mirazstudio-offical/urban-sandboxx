import type { CarType } from './types';
import type { VehicleRenderContext } from './vehicleVisuals';
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
  createGlassGradient,
} from './vehicleModelPrimitives';

export const REDRAWN_MOTORCYCLE_TYPES: ReadonlySet<string> = new Set<CarType>([
  'moto_izh_jupiter',
  'moto_ural_sidecar',
  'moto_jawa350',
  'moto_sport',
  'moto_chopper',
  'moped_soviet',
]);

export function isRedrawnMotorcycle(type: string): boolean {
  return REDRAWN_MOTORCYCLE_TYPES.has(type);
}

function drawMotoWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  wid: number,
  angle: number,
  style: 'spoke' | 'sport_front' | 'sport_rear' | 'chopper_fat' | 'moped',
  deform: DeformFn
): void {
  const [dx, dy] = deform(x, y);
  ctx.save();
  ctx.translate(dx, dy);
  if (angle) ctx.rotate(angle);

  const hl = len * 0.5;
  const hw = wid * 0.5;
  const r = Math.min(0.95, hw * 0.85);

  // Soft tire contact shadow
  ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
  ctx.beginPath();
  ctx.roundRect(-hl - 0.35, -hw - 0.3, len + 0.7, wid + 0.6, r + 0.25);
  ctx.fill();

  // Vulcanized tire carcass
  ctx.fillStyle = '#0c1118';
  ctx.beginPath();
  ctx.roundRect(-hl, -hw, len, wid, r);
  ctx.fill();

  // Rounded tire crown specular highlight
  const crown = ctx.createLinearGradient(0, -hw, 0, hw);
  crown.addColorStop(0.0, 'rgba(15, 23, 42, 0.25)');
  crown.addColorStop(0.35, 'rgba(148, 163, 184, 0.24)');
  crown.addColorStop(0.55, 'rgba(100, 116, 139, 0.12)');
  crown.addColorStop(1.0, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = crown;
  ctx.beginPath();
  ctx.roundRect(-hl + 0.25, -hw + 0.2, len - 0.5, wid - 0.4, r * 0.7);
  ctx.fill();

  // Tread sipes
  if (style === 'sport_front' || style === 'sport_rear') {
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.18)';
    ctx.lineWidth = 0.35;
    for (let tx = -hl + 1.1; tx <= hl - 1.1; tx += 1.6) {
      ctx.beginPath();
      ctx.moveTo(tx - 0.4, -hw * 0.75);
      ctx.lineTo(tx + 0.4, 0);
      ctx.lineTo(tx - 0.4, hw * 0.75);
      ctx.stroke();
    }
    // Floating steel brake discs & gold Brembo calipers
    ctx.fillStyle = '#cbd5e1';
    if (style === 'sport_front') {
      ctx.fillRect(-hl * 0.52, -hw - 0.35, hl * 1.04, 0.42);
      ctx.fillRect(-hl * 0.52, hw - 0.07, hl * 1.04, 0.42);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-0.3, -hw - 0.52, 1.35, 0.65);
      ctx.fillRect(-0.3, hw - 0.13, 1.35, 0.65);
    } else {
      // Rear right disc + left gold drive chain
      ctx.fillRect(-hl * 0.48, hw - 0.08, hl * 0.96, 0.4);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-hl * 0.65, -hw - 0.42, hl * 1.3, 0.45);
    }
  } else {
    // Classic circumferential tread groove + chrome/steel spoke hub peeking at axle
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.lineWidth = 0.38;
    ctx.beginPath();
    ctx.moveTo(-hl + 0.7, 0);
    ctx.lineTo(hl - 0.7, 0);
    ctx.stroke();

    // Axle caps / spoke drum flange
    const rimCol = style === 'chopper_fat' ? '#f8fafc' : '#cbd5e1';
    ctx.fillStyle = rimCol;
    ctx.fillRect(-0.9, -hw - 0.32, 1.8, 0.42);
    ctx.fillRect(-0.9, hw - 0.1, 1.8, 0.42);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-0.45, -hw - 0.45, 0.9, wid + 0.9);
  }

  ctx.restore();
}

function drawRoundChromeHeadlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  opt: LiveOpticsState,
  broken: boolean,
  deform: DeformFn
): void {
  // Chrome bucket extending slightly behind the lens
  drawRoundedBox(ctx, x - radius * 1.45, y - radius * 0.92, x + radius * 0.35, y + radius * 0.92, radius * 0.55, '#cbd5e1', deform, '#334155', 0.42);
  // Chrome bezel ring
  drawRoundedBox(ctx, x - radius * 0.1, y - radius * 0.95, x + radius * 0.52, y + radius * 0.95, radius * 0.35, '#f8fafc', deform, '#475569', 0.35);

  if (broken) {
    drawRoundedBox(ctx, x + radius * 0.1, y - radius * 0.78, x + radius * 0.62, y + radius * 0.78, radius * 0.25, '#090d16', deform);
    return;
  }

  const lit = opt.headlightsOn || opt.positionOn;
  const lensFill = opt.highBeam
    ? '#ffffff'
    : opt.headlightsOn
    ? '#fef08a'
    : opt.positionOn
    ? '#fde68a'
    : '#94a3b8';

  drawRoundedBox(ctx, x + radius * 0.15, y - radius * 0.78, x + radius * 0.68, y + radius * 0.78, radius * 0.32, lensFill, deform, '#475569', 0.3);
  if (lit) {
    drawDeformedDot(ctx, x + radius * 0.42, y, radius * 0.35, '#ffffff', deform);
  }
}

function drawMotoBlinkers(
  ctx: CanvasRenderingContext2D,
  x: number,
  offsetY: number,
  centerY: number,
  opt: LiveOpticsState,
  deform: DeformFn,
  size = 0.72
): void {
  const drawPod = (side: -1 | 1, intensity: number) => {
    const py = centerY + side * offsetY;
    strokePoly(ctx, [[x, centerY + side * (offsetY * 0.38)], [x, py]], '#334155', 0.55, deform);
    const lit = intensity > 0.06;
    drawRoundedBox(
      ctx,
      x - size * 0.72,
      py - size * 0.58,
      x + size * 0.72,
      py + size * 0.58,
      0.32,
      lit ? '#f59e0b' : '#92400e',
      deform,
      '#0f172a',
      0.35
    );
    if (lit) {
      drawDeformedDot(ctx, x, py, size * 0.28, '#fef08a', deform);
    }
  };
  drawPod(-1, opt.leftTurn);
  drawPod(1, opt.rightTurn);
}

function drawMotoTaillight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  opt: LiveOpticsState,
  broken: boolean,
  deform: DeformFn
): void {
  drawRoundedBox(ctx, x - 1.05, y - halfWidth - 0.25, x + 0.55, y + halfWidth + 0.25, 0.35, '#1e293b', deform, '#0f172a', 0.35);
  if (broken) {
    drawRoundedBox(ctx, x - 0.85, y - halfWidth, x + 0.25, y + halfWidth, 0.22, '#090d16', deform);
    return;
  }
  const fill = opt.braking ? '#ef4444' : opt.positionOn ? '#dc2626' : '#7f1d1d';
  drawRoundedBox(ctx, x - 0.92, y - halfWidth, x + 0.28, y + halfWidth, 0.25, fill, deform);
  if (opt.braking) {
    drawRoundedBox(ctx, x - 0.72, y - halfWidth * 0.52, x - 0.12, y + halfWidth * 0.52, 0.15, '#ffffff', deform);
  } else if (opt.positionOn) {
    drawRoundedBox(ctx, x - 0.72, y - halfWidth * 0.45, x - 0.18, y + halfWidth * 0.45, 0.15, '#fca5a5', deform);
  }
}

function drawHandlebars(
  ctx: CanvasRenderingContext2D,
  pivotX: number,
  pivotY: number,
  steerAngle: number,
  halfSpan: number,
  sweepBack: number,
  barColor: string,
  gripColor: string,
  mirrorStyle: 'round_chrome' | 'teardrop_chrome' | 'sport_black' | 'none',
  deform: DeformFn
): void {
  const [px, py] = deform(pivotX, pivotY);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(steerAngle * 0.85);

  // Triple tree clamp
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(-0.95, -1.55, 1.9, 3.1, 0.45);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 0.4;
  ctx.stroke();

  // Fork tube caps
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(0, -1.05, 0.48, 0, Math.PI * 2);
  ctx.arc(0, 1.05, 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Left & right handlebar tubes
  ctx.strokeStyle = barColor;
  ctx.lineWidth = 1.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-sweepBack, -halfSpan);
  ctx.quadraticCurveTo(0.2, -halfSpan * 0.35, 0.15, 0);
  ctx.quadraticCurveTo(0.2, halfSpan * 0.35, -sweepBack, halfSpan);
  ctx.stroke();

  // Rubber grips
  ctx.strokeStyle = gripColor;
  ctx.lineWidth = 1.45;
  ctx.beginPath();
  ctx.moveTo(-sweepBack - 0.1, -halfSpan);
  ctx.lineTo(-sweepBack * 0.65, -halfSpan * 0.68);
  ctx.moveTo(-sweepBack - 0.1, halfSpan);
  ctx.lineTo(-sweepBack * 0.65, halfSpan * 0.68);
  ctx.stroke();

  // Clutch & front brake levers
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-sweepBack * 0.62 + 0.55, -halfSpan * 0.68);
  ctx.lineTo(-sweepBack + 0.55, -halfSpan * 0.94);
  ctx.moveTo(-sweepBack * 0.62 + 0.55, halfSpan * 0.68);
  ctx.lineTo(-sweepBack + 0.55, halfSpan * 0.94);
  ctx.stroke();

  // Mirrors
  if (mirrorStyle !== 'none') {
    for (const side of [-1, 1] as const) {
      const mx = -sweepBack * 0.45 + 1.05;
      const my = side * (halfSpan * 0.88 + 0.65);
      ctx.strokeStyle = mirrorStyle === 'sport_black' ? '#1e293b' : '#cbd5e1';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-sweepBack * 0.55, side * halfSpan * 0.64);
      ctx.lineTo(mx, my);
      ctx.stroke();

      if (mirrorStyle === 'round_chrome') {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(mx, my, 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.35;
        ctx.stroke();
      } else if (mirrorStyle === 'teardrop_chrome') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(mx, my, 0.55, 0.92, side * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.35;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(mx, my, 0.5, 0.88, side * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawEngineCoolingFins(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  len: number,
  wid: number,
  deform: DeformFn
): void {
  drawRoundedBox(ctx, cx - len * 0.5, cy - wid * 0.5, cx + len * 0.5, cy + wid * 0.5, 0.55, '#64748b', deform, '#1e293b', 0.45);
  const steps = Math.max(3, Math.round(len / 0.85));
  for (let i = 1; i < steps; i++) {
    const fx = cx - len * 0.5 + (len * i) / steps;
    strokePoly(ctx, [[fx, cy - wid * 0.46], [fx, cy + wid * 0.46]], '#1e293b', 0.42, deform);
  }
}

export function renderMotorcycleChassisLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const steer = car.steerAngle || 0;

  if (car.type === 'moto_ural_sidecar') {
    const bikeY = -halfW * 0.44;
    const scY = halfW * 0.44;

    // 3 Spoke wheels (Rear, Front steered, Sidecar)
    drawMotoWheel(ctx, -halfL * 0.64, bikeY, 6.8, 2.2, 0, 'spoke', deform);
    drawMotoWheel(ctx, halfL * 0.68, bikeY, 6.8, 2.1, steer, 'spoke', deform);
    drawMotoWheel(ctx, -halfL * 0.20, halfW * 0.78, 6.8, 2.2, 0, 'spoke', deform);

    // Sidecar tubular mounting frame & cross-struts
    strokePoly(ctx, [[-halfL * 0.45, bikeY + 0.6], [-halfL * 0.20, halfW * 0.72]], '#1e293b', 1.35, deform);
    strokePoly(ctx, [[halfL * 0.22, bikeY + 0.6], [halfL * 0.16, scY]], '#1e293b', 1.15, deform);
    strokePoly(ctx, [[-halfL * 0.25, bikeY + 0.8], [-halfL * 0.10, scY]], '#334155', 0.95, deform);

    // Horizontally-opposed 650cc Boxer twin cylinder heads protruding left & right
    drawEngineCoolingFins(ctx, halfL * 0.04, bikeY - 2.2, 2.9, 1.8, deform);
    drawEngineCoolingFins(ctx, halfL * 0.04, bikeY + 2.2, 2.9, 1.8, deform);

    // Twin chrome exhaust mufflers along both sides of the motorcycle
    for (const side of [-1, 1] as const) {
      const ey = bikeY + side * 2.15;
      strokePoly(ctx, [[halfL * 0.08, ey], [-halfL * 0.82, ey + side * 0.15]], '#cbd5e1', 1.05, deform);
      strokePoly(ctx, [[halfL * 0.05, ey - 0.15], [-halfL * 0.78, ey + side * 0.02]], '#f8fafc', 0.35, deform);
    }

    // Center tubular frame spine & swingarm
    drawRoundedBox(ctx, -halfL * 0.62, bikeY - 0.95, halfL * 0.56, bikeY + 0.95, 0.55, '#1e293b', deform);
    // Telescopic front fork tubes rotating subtly toward wheel
    const [fx, fy] = deform(halfL * 0.55, bikeY);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(steer * 0.6);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-1.0, -1.15);
    ctx.lineTo(2.4, -1.15);
    ctx.moveTo(-1.0, 1.15);
    ctx.lineTo(2.4, 1.15);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // --- Solo Motorcycles & Moped ---
  if (car.type === 'moto_sport') {
    drawMotoWheel(ctx, -halfL * 0.64, 0, 6.8, 3.1, 0, 'sport_rear', deform);
    drawMotoWheel(ctx, halfL * 0.67, 0, 6.4, 2.35, steer, 'sport_front', deform);
    // Cast aluminum dual-sided swingarm
    drawRoundedBox(ctx, -halfL * 0.66, -2.0, -halfL * 0.08, 2.0, 0.55, '#475569', deform, '#0f172a', 0.4);
    drawRoundedBox(ctx, -halfL * 0.56, -1.1, -halfL * 0.14, 1.1, 0.3, '#0f172a', deform);
    // Titanium/carbon canister exhaust on right side
    drawRoundedBox(ctx, -halfL * 0.72, 1.55, -halfL * 0.06, 2.65, 0.48, '#334155', deform, '#0f172a', 0.4);
    drawRoundedBox(ctx, -halfL * 0.78, 1.72, -halfL * 0.62, 2.48, 0.25, '#cbd5e1', deform);
    // Inverted gold USD front fork tubes
    const [fx, fy] = deform(halfL * 0.55, 0);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(steer * 0.65);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(-1.2, -1.3);
    ctx.lineTo(1.8, -1.3);
    ctx.moveTo(-1.2, 1.3);
    ctx.lineTo(1.8, 1.3);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (car.type === 'moto_chopper') {
    drawMotoWheel(ctx, -halfL * 0.66, 0, 6.9, 3.25, 0, 'chopper_fat', deform);
    drawMotoWheel(ctx, halfL * 0.80, 0, 7.2, 1.85, steer, 'spoke', deform);

    // Wide chrome V-twin engine block + side air-filter dome
    drawEngineCoolingFins(ctx, halfL * 0.05, 0, 4.4, 3.9, deform);
    drawDeformedDot(ctx, halfL * 0.08, 2.25, 1.15, '#e2e8f0', deform, '#334155', 0.4);
    // Staggered twin chrome shotgun pipes on right side
    strokePoly(ctx, [[halfL * 0.14, 2.35], [-halfL * 0.78, 2.45]], '#e2e8f0', 1.15, deform);
    strokePoly(ctx, [[halfL * 0.02, 2.95], [-halfL * 0.68, 3.05]], '#cbd5e1', 1.05, deform);
    // Foot pegs / highway forward controls
    strokePoly(ctx, [[halfL * 0.34, -3.1], [halfL * 0.34, 3.1]], '#cbd5e1', 0.85, deform);

    // Long raked chrome telescopic forks
    const [fx, fy] = deform(halfL * 0.48, 0);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(steer * 0.55);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(-0.5, -1.25);
    ctx.lineTo(4.8, -1.05);
    ctx.moveTo(-0.5, 1.25);
    ctx.lineTo(4.8, 1.05);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (car.type === 'moped_soviet') {
    drawMotoWheel(ctx, -halfL * 0.66, 0, 5.5, 1.45, 0, 'moped', deform);
    drawMotoWheel(ctx, halfL * 0.69, 0, 5.5, 1.40, steer, 'moped', deform);

    // Compact 50cc engine + bicycle pedals
    drawEngineCoolingFins(ctx, halfL * 0.02, 0, 2.5, 2.3, deform);
    strokePoly(ctx, [[-halfL * 0.06, -2.5], [-halfL * 0.06, 2.5]], '#94a3b8', 0.65, deform);
    drawRoundedBox(ctx, -halfL * 0.14, -2.85, halfL * 0.02, -2.15, 0.2, '#0f172a', deform);
    drawRoundedBox(ctx, -halfL * 0.14, 2.15, halfL * 0.02, 2.85, 0.2, '#0f172a', deform);
    // Slim chrome muffler on right
    strokePoly(ctx, [[halfL * 0.05, 1.42], [-halfL * 0.72, 1.48]], '#cbd5e1', 0.85, deform);
    // Step-through tubular steel backbone
    drawRoundedBox(ctx, -halfL * 0.64, -0.75, halfL * 0.58, 0.75, 0.4, '#1e293b', deform);
    return;
  }

  // moto_izh_jupiter & moto_jawa350 (Classic twin-cylinder roadsters)
  const isJawa = car.type === 'moto_jawa350';
  drawMotoWheel(ctx, -halfL * 0.65, 0, 6.8, 2.15, 0, 'spoke', deform);
  drawMotoWheel(ctx, halfL * 0.69, 0, 6.8, 1.9, steer, 'spoke', deform);

  // Air-cooled parallel-twin cylinder block
  drawEngineCoolingFins(ctx, halfL * 0.08, 0, 3.3, 3.6, deform);

  // Twin symmetrical chrome megaphone exhausts
  for (const side of [-1, 1] as const) {
    const ey = side * (isJawa ? 2.18 : 2.25);
    strokePoly(ctx, [[halfL * 0.14, ey * 0.88], [-halfL * 0.82, ey]], '#cbd5e1', 1.1, deform);
    strokePoly(ctx, [[halfL * 0.08, ey * 0.88 - 0.12], [-halfL * 0.78, ey - 0.12]], '#f8fafc', 0.35, deform);
  }

  // Foot pegs & center frame spine
  strokePoly(ctx, [[-halfL * 0.05, -2.85], [-halfL * 0.05, 2.85]], '#64748b', 0.75, deform);
  drawRoundedBox(ctx, -halfL * 0.65, -0.95, halfL * 0.56, 0.95, 0.5, '#1e293b', deform);

  // Telescopic forks
  const [fx, fy] = deform(halfL * 0.54, 0);
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(steer * 0.65);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(-0.8, -1.05);
  ctx.lineTo(2.4, -1.05);
  ctx.moveTo(-0.8, 1.05);
  ctx.lineTo(2.4, 1.05);
  ctx.stroke();
  ctx.restore();
}

export function renderMotorcycleUpperLayer(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, deform } = vCtx;
  const opt = getLiveOpticsState(car);
  const paint = car.color || '#dc2626';
  const steer = car.steerAngle || 0;

  if (car.type === 'moto_ural_sidecar') {
    const bikeY = -halfW * 0.44;
    const scY = halfW * 0.38;
    const bodyGrad = createBodyMetallicGradient(ctx, halfW, paint);

    // Front & rear painted steel mudguards on motorcycle
    drawRoundedBox(ctx, halfL * 0.44, bikeY - 1.25, halfL * 0.90, bikeY + 1.25, 0.85, paint, deform, '#0f172a', 0.45);
    drawRoundedBox(ctx, -halfL * 0.92, bikeY - 1.3, -halfL * 0.36, bikeY + 1.3, 0.8, paint, deform, '#0f172a', 0.45);

    // Classic teardrop fuel tank on motorcycle
    const tankPts: Pt[] = [
      [halfL * 0.38, bikeY - 1.75],
      [halfL * 0.46, bikeY - 0.95],
      [halfL * 0.46, bikeY + 0.95],
      [halfL * 0.38, bikeY + 1.75],
      [-halfL * 0.02, bikeY + 1.45],
      [-halfL * 0.08, bikeY + 0.8],
      [-halfL * 0.08, bikeY - 0.8],
      [-halfL * 0.02, bikeY - 1.45],
    ];
    fillPoly(ctx, tankPts, bodyGrad, deform, '#0f172a', 0.5);
    // White pinstripe & chrome fuel cap
    strokePoly(ctx, [[halfL * 0.34, bikeY - 1.25], [halfL * 0.02, bikeY - 1.05]], 'rgba(255,255,255,0.55)', 0.4, deform);
    strokePoly(ctx, [[halfL * 0.34, bikeY + 1.25], [halfL * 0.02, bikeY + 1.05]], 'rgba(255,255,255,0.55)', 0.4, deform);
    drawDeformedDot(ctx, halfL * 0.25, bikeY, 0.55, '#e2e8f0', deform, '#334155', 0.35);

    // Rider tractor-style solo saddle + passenger pad
    drawRoundedBox(ctx, -halfL * 0.44, bikeY - 1.55, -halfL * 0.06, bikeY + 1.55, 0.95, '#1c1917', deform, '#09090b', 0.45);
    drawRoundedBox(ctx, -halfL * 0.78, bikeY - 1.28, -halfL * 0.47, bikeY + 1.28, 0.65, '#1c1917', deform, '#09090b', 0.42);

    // Handlebars + chrome headlight + motorcycle tail lamp
    drawHandlebars(ctx, halfL * 0.46, bikeY, steer, 3.6, 1.35, '#cbd5e1', '#0f172a', 'round_chrome', deform);
    drawRoundChromeHeadlight(ctx, halfL * 0.68, bikeY, 1.12, opt, opt.leftHeadBroken, deform);
    drawMotoTaillight(ctx, -halfL * 0.88, bikeY, 0.95, opt, opt.leftTailBroken, deform);

    // --- RIGHT-SIDE SIDECAR BOAT (Люлька Урал) ---
    const boatPts: Pt[] = [
      [halfL * 0.74, scY - 0.75],
      [halfL * 0.78, scY],
      [halfL * 0.74, scY + 0.75],
      [halfL * 0.42, scY + 2.45],
      [-halfL * 0.70, scY + 2.55],
      [-halfL * 0.82, scY + 1.7],
      [-halfL * 0.82, scY - 1.7],
      [-halfL * 0.70, scY - 2.55],
      [halfL * 0.42, scY - 2.45],
    ];
    fillPoly(ctx, boatPts, bodyGrad, deform, '#0f172a', 0.58);

    // Boat nose specular ridge & chrome grab bumper
    strokePoly(ctx, [[halfL * 0.72, scY], [halfL * 0.25, scY]], shadePaint(paint, 0.28), 0.75, deform);
    strokePoly(ctx, [[halfL * 0.82, scY - 1.2], [halfL * 0.87, scY], [halfL * 0.82, scY + 1.2]], '#e2e8f0', 0.7, deform);

    // Sidecar open cockpit well & stitched leather bench seat
    drawRoundedBox(ctx, -halfL * 0.42, scY - 1.95, halfL * 0.22, scY + 1.95, 0.85, '#0f172a', deform, '#334155', 0.4);
    drawRoundedBox(ctx, -halfL * 0.39, scY - 1.7, -halfL * 0.04, scY + 1.7, 0.55, '#292524', deform, '#1c1917', 0.35);
    strokePoly(ctx, [[-halfL * 0.28, scY - 1.5], [-halfL * 0.28, scY + 1.5]], '#44403c', 0.45, deform);

    // Sidecar transparent curved windscreen with brushed alloy frame
    const wsGrad = createGlassGradient(ctx, halfL * 0.14, scY - 1.9, halfL * 0.32, scY + 1.9, 'blue');
    fillPoly(
      ctx,
      [
        [halfL * 0.16, scY - 1.95],
        [halfL * 0.30, scY - 1.65],
        [halfL * 0.34, scY],
        [halfL * 0.30, scY + 1.65],
        [halfL * 0.16, scY + 1.95],
        [halfL * 0.21, scY],
      ],
      wsGrad,
      deform,
      '#cbd5e1',
      0.55
    );

    // Rear-mounted full-size spare wheel & chrome luggage rack on sidecar trunk
    drawRoundedBox(ctx, -halfL * 0.76, scY - 1.75, -halfL * 0.46, scY + 1.75, 0.45, '#1e293b', deform, '#0f172a', 0.4);
    drawDeformedDot(ctx, -halfL * 0.61, scY, 1.55, '#0c1118', deform, '#334155', 0.45);
    drawDeformedDot(ctx, -halfL * 0.61, scY, 0.82, '#cbd5e1', deform, '#1e293b', 0.35);

    // Sidecar outer wheel fender with integrated front marker/turn & rear red lamp
    const scFenderY = halfW * 0.78;
    drawRoundedBox(ctx, -halfL * 0.52, scFenderY - 1.35, halfL * 0.14, scFenderY + 1.35, 0.75, paint, deform, '#0f172a', 0.45);
    // Front fender white position + right turn
    const scFrontCol = opt.rightTurn > 0.06 ? '#f59e0b' : opt.positionOn ? '#fef9c3' : '#cbd5e1';
    drawRoundedBox(ctx, halfL * 0.04, scFenderY - 0.58, halfL * 0.18, scFenderY + 0.58, 0.25, scFrontCol, deform, '#0f172a', 0.3);
    // Rear fender red tail/brake + right turn
    const scRearCol = opt.rightTurn > 0.06 ? '#f59e0b' : opt.braking ? '#ef4444' : opt.positionOn ? '#dc2626' : '#7f1d1d';
    drawRoundedBox(ctx, -halfL * 0.56, scFenderY - 0.62, -halfL * 0.42, scFenderY + 0.62, 0.25, scRearCol, deform, '#0f172a', 0.3);
    // Left bike blinkers
    if (opt.leftTurn > 0.06) {
      drawDeformedDot(ctx, halfL * 0.52, bikeY - 2.4, 0.55, '#f59e0b', deform);
      drawDeformedDot(ctx, -halfL * 0.80, bikeY - 2.1, 0.55, '#f59e0b', deform);
    }
    return;
  }

  if (car.type === 'moto_sport') {
    const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.7, paint);
    const accent = car.roofColor && car.roofColor !== paint ? car.roofColor : shadePaint(paint, -0.35);

    // Carbon front fender over front tire
    drawRoundedBox(ctx, halfL * 0.48, -1.45, halfL * 0.88, 1.45, 0.75, '#1e293b', deform, '#0f172a', 0.4);

    // Aerodynamic full wind-tunnel fairing + nose cowl + sharp tail
    const fairingPts: Pt[] = [
      [halfL * 0.88, -0.65],
      [halfL * 0.94, 0],
      [halfL * 0.88, 0.65],
      [halfL * 0.54, 2.75],
      [halfL * 0.14, 2.95],
      [-halfL * 0.22, 2.25],
      [-halfL * 0.62, 1.65],
      [-halfL * 0.92, 0.82],
      [-halfL * 0.92, -0.82],
      [-halfL * 0.62, -1.65],
      [-halfL * 0.22, -2.25],
      [halfL * 0.14, -2.95],
      [halfL * 0.54, -2.75],
    ];
    fillPoly(ctx, fairingPts, bodyGrad, deform, '#0f172a', 0.55);

    // Racing accent flank stripes & carbon winglets
    fillPoly(ctx, [[halfL * 0.56, -2.6], [halfL * 0.42, -3.45], [halfL * 0.30, -2.85]], '#0f172a', deform);
    fillPoly(ctx, [[halfL * 0.56, 2.6], [halfL * 0.42, 3.45], [halfL * 0.30, 2.85]], '#0f172a', deform);
    strokePoly(ctx, [[halfL * 0.55, -2.1], [halfL * 0.05, -2.3]], accent, 0.7, deform);
    strokePoly(ctx, [[halfL * 0.55, 2.1], [halfL * 0.05, 2.3]], accent, 0.7, deform);

    // Double-bubble smoked aerodynamic windscreen
    const wsGrad = createGlassGradient(ctx, halfL * 0.38, -1.9, halfL * 0.82, 1.9, 'smoke');
    fillPoly(
      ctx,
      [
        [halfL * 0.82, -0.72],
        [halfL * 0.86, 0],
        [halfL * 0.82, 0.72],
        [halfL * 0.44, 1.92],
        [halfL * 0.35, 0],
        [halfL * 0.44, -1.92],
      ],
      wsGrad,
      deform,
      '#0f172a',
      0.45
    );

    // Sculpted knee-recessed fuel tank + billet aluminum quick-fill cap
    drawRoundedBox(ctx, -halfL * 0.06, -2.15, halfL * 0.38, 2.15, 1.05, shadePaint(paint, 0.12), deform, '#0f172a', 0.42);
    drawDeformedDot(ctx, halfL * 0.19, 0, 0.62, '#cbd5e1', deform, '#334155', 0.32);

    // Split alcantara rider seat + raised pillion tail cowl
    drawRoundedBox(ctx, -halfL * 0.48, -1.55, -halfL * 0.06, 1.55, 0.65, '#18181b', deform, '#09090b', 0.4);
    drawRoundedBox(ctx, -halfL * 0.84, -1.05, -halfL * 0.52, 1.05, 0.55, paint, deform, '#0f172a', 0.4);

    // Clip-on sport handlebars + mirror stalks
    drawHandlebars(ctx, halfL * 0.40, 0, steer, 3.25, 1.15, '#1e293b', '#09090b', 'sport_black', deform);

    // Integrated dual LED cat-eye projector headlights + DRL eyebrows
    for (const side of [-1, 1] as const) {
      const broken = side < 0 ? opt.leftHeadBroken : opt.rightHeadBroken;
      const lensCol = broken
        ? '#090d16'
        : opt.highBeam
        ? '#ffffff'
        : opt.headlightsOn
        ? '#e0f2fe'
        : opt.ignitionOn || opt.positionOn
        ? '#bae6fd'
        : '#64748b';
      fillPoly(
        ctx,
        [
          [halfL * 0.86, side * 0.45],
          [halfL * 0.90, side * 1.15],
          [halfL * 0.72, side * 1.95],
          [halfL * 0.66, side * 1.22],
        ],
        lensCol,
        deform,
        '#0f172a',
        0.32
      );
      const turnInt = side < 0 ? opt.leftTurn : opt.rightTurn;
      if (turnInt > 0.06) {
        drawDeformedDot(ctx, halfL * 0.56, side * 2.55, 0.55, '#f59e0b', deform);
        drawDeformedDot(ctx, -halfL * 0.78, side * 1.45, 0.5, '#f59e0b', deform);
      }
    }

    // Sleek LED V-bar taillight / brake light
    const tailBroken = opt.leftTailBroken && opt.rightTailBroken;
    const tailCol = tailBroken ? '#090d16' : opt.braking ? '#ef4444' : opt.positionOn ? '#dc2626' : '#7f1d1d';
    strokePoly(ctx, [[-halfL * 0.86, -1.05], [-halfL * 0.94, 0], [-halfL * 0.86, 1.05]], tailCol, 0.95, deform);
    if (!tailBroken && opt.braking) {
      strokePoly(ctx, [[-halfL * 0.87, -0.75], [-halfL * 0.93, 0], [-halfL * 0.87, 0.75]], '#ffffff', 0.4, deform);
    }
    return;
  }

  if (car.type === 'moto_chopper') {
    const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.65, paint);

    // Bobbed front fender & wide rear fender over fat tire
    drawRoundedBox(ctx, halfL * 0.64, -1.15, halfL * 0.94, 1.15, 0.65, paint, deform, '#0f172a', 0.4);
    drawRoundedBox(ctx, -halfL * 0.94, -1.9, -halfL * 0.42, 1.9, 1.1, bodyGrad, deform, '#0f172a', 0.5);

    // Wide sculpted cruiser teardrop tank with chrome center dash console
    const tankPts: Pt[] = [
      [halfL * 0.34, -2.35],
      [halfL * 0.44, -1.35],
      [halfL * 0.44, 1.35],
      [halfL * 0.34, 2.35],
      [-halfL * 0.08, 1.85],
      [-halfL * 0.16, 0.95],
      [-halfL * 0.16, -0.95],
      [-halfL * 0.08, -1.85],
    ];
    fillPoly(ctx, tankPts, bodyGrad, deform, '#0f172a', 0.52);
    // Chrome center dash & speedometer
    drawRoundedBox(ctx, -halfL * 0.06, -0.68, halfL * 0.34, 0.68, 0.45, '#e2e8f0', deform, '#334155', 0.35);
    drawDeformedDot(ctx, halfL * 0.18, 0, 0.48, '#0f172a', deform, '#94a3b8', 0.25);

    // Low-slung stitched leather cruiser saddle + chrome sissy bar backrest
    drawRoundedBox(ctx, -halfL * 0.56, -1.95, -halfL * 0.12, 1.95, 1.05, '#1c1917', deform, '#09090b', 0.48);
    drawRoundedBox(ctx, -halfL * 0.80, -1.32, -halfL * 0.56, 1.32, 0.65, '#292524', deform, '#09090b', 0.4);
    // Chrome sissy-bar hoop
    strokePoly(ctx, [[-halfL * 0.72, -1.45], [-halfL * 0.86, -1.2], [-halfL * 0.86, 1.2], [-halfL * 0.72, 1.45]], '#f8fafc', 0.65, deform);

    // Wide swept-back chrome cruiser handlebars
    drawHandlebars(ctx, halfL * 0.44, 0, steer, 4.65, 2.25, '#f8fafc', '#18181b', 'teardrop_chrome', deform);

    // Chrome bullet main headlight + twin passing lamps + bullet blinkers + rear bobber light
    drawRoundChromeHeadlight(ctx, halfL * 0.62, 0, 1.18, opt, opt.leftHeadBroken && opt.rightHeadBroken, deform);
    drawRoundChromeHeadlight(ctx, halfL * 0.54, -1.85, 0.62, opt, opt.leftHeadBroken, deform);
    drawRoundChromeHeadlight(ctx, halfL * 0.54, 1.85, 0.62, opt, opt.rightHeadBroken, deform);
    drawMotoBlinkers(ctx, halfL * 0.48, 2.95, 0, opt, deform, 0.68);
    drawMotoBlinkers(ctx, -halfL * 0.84, 2.35, 0, opt, deform, 0.68);
    drawMotoTaillight(ctx, -halfL * 0.92, 0, 1.05, opt, opt.leftTailBroken, deform);
    return;
  }

  if (car.type === 'moped_soviet') {
    const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.65, paint);

    // Slim painted front & rear fenders
    drawRoundedBox(ctx, halfL * 0.48, -0.95, halfL * 0.90, 0.95, 0.55, paint, deform, '#0f172a', 0.4);
    drawRoundedBox(ctx, -halfL * 0.92, -0.95, -halfL * 0.42, 0.95, 0.55, paint, deform, '#0f172a', 0.4);

    // Compact boxy front fuel tank (Карпаты / Рига)
    drawRoundedBox(ctx, halfL * 0.06, -1.42, halfL * 0.48, 1.42, 0.55, bodyGrad, deform, '#0f172a', 0.45);
    drawDeformedDot(ctx, halfL * 0.34, 0, 0.42, '#e2e8f0', deform, '#334155', 0.28);

    // Sprung moped saddle
    drawRoundedBox(ctx, -halfL * 0.44, -1.32, -halfL * 0.04, 1.32, 0.72, '#1c1917', deform, '#09090b', 0.42);

    // Rear steel wire luggage rack
    drawRoundedBox(ctx, -halfL * 0.86, -1.25, -halfL * 0.46, 1.25, 0.25, 'rgba(203,213,225,0.2)', deform, '#cbd5e1', 0.5);
    strokePoly(ctx, [[-halfL * 0.84, -0.45], [-halfL * 0.48, -0.45]], '#cbd5e1', 0.4, deform);
    strokePoly(ctx, [[-halfL * 0.84, 0.45], [-halfL * 0.48, 0.45]], '#cbd5e1', 0.4, deform);

    // Narrow chrome handlebars
    drawHandlebars(ctx, halfL * 0.52, 0, steer, 2.85, 0.95, '#e2e8f0', '#0f172a', 'round_chrome', deform);

    // Round chrome headlight, mini blinkers & rear lamp
    drawRoundChromeHeadlight(ctx, halfL * 0.70, 0, 0.92, opt, opt.leftHeadBroken, deform);
    drawMotoBlinkers(ctx, halfL * 0.56, 2.0, 0, opt, deform, 0.52);
    drawMotoBlinkers(ctx, -halfL * 0.82, 1.75, 0, opt, deform, 0.52);
    drawMotoTaillight(ctx, -halfL * 0.90, 0, 0.75, opt, opt.leftTailBroken, deform);
    return;
  }

  // moto_izh_jupiter & moto_jawa350 (Classic Roadsters)
  const isJawa = car.type === 'moto_jawa350';
  const bodyGrad = createBodyMetallicGradient(ctx, halfW * 0.65, paint);

  // Front & rear fenders (chrome front on Jawa, painted on Izh)
  drawRoundedBox(
    ctx,
    halfL * 0.46,
    -1.15,
    halfL * 0.91,
    1.15,
    0.72,
    isJawa ? '#e2e8f0' : paint,
    deform,
    '#0f172a',
    0.45
  );
  drawRoundedBox(ctx, -halfL * 0.92, -1.25, -halfL * 0.36, 1.25, 0.72, paint, deform, '#0f172a', 0.45);

  // Sculpted teardrop metallic fuel tank with chrome knee-pad panels on Jawa
  const tankPts: Pt[] = [
    [halfL * 0.38, -1.85],
    [halfL * 0.46, -1.0],
    [halfL * 0.46, 1.0],
    [halfL * 0.38, 1.85],
    [-halfL * 0.04, 1.5],
    [-halfL * 0.12, 0.82],
    [-halfL * 0.12, -0.82],
    [-halfL * 0.04, -1.5],
  ];
  fillPoly(ctx, tankPts, bodyGrad, deform, '#0f172a', 0.5);

  if (isJawa) {
    // Iconic Jawa chrome flank panels & gold center pinstripe
    drawRoundedBox(ctx, halfL * 0.04, -1.78, halfL * 0.34, -1.22, 0.3, '#f1f5f9', deform, '#475569', 0.3);
    drawRoundedBox(ctx, halfL * 0.04, 1.22, halfL * 0.34, 1.78, 0.3, '#f1f5f9', deform, '#475569', 0.3);
    strokePoly(ctx, [[halfL * 0.42, 0], [-halfL * 0.08, 0]], '#fbbf24', 0.45, deform);
  } else {
    // Izh Jupiter sculpted shoulder ridges & rubber knee pads
    drawRoundedBox(ctx, halfL * 0.02, -1.72, halfL * 0.30, -1.25, 0.25, '#1e293b', deform);
    drawRoundedBox(ctx, halfL * 0.02, 1.25, halfL * 0.30, 1.72, 0.25, '#1e293b', deform);
  }
  // Chrome fuel filler cap
  drawDeformedDot(ctx, halfL * 0.26, 0, 0.55, '#f8fafc', deform, '#334155', 0.35);

  // Long double ribbed leather saddle + passenger strap + chrome rear grab rail
  drawRoundedBox(ctx, -halfL * 0.74, -1.52, -halfL * 0.10, 1.52, 0.75, '#1c1917', deform, '#09090b', 0.48);
  for (let rx = -halfL * 0.64; rx <= -halfL * 0.20; rx += 1.35) {
    strokePoly(ctx, [[rx, -1.28], [rx, 1.28]], '#292524', 0.45, deform);
  }
  strokePoly(ctx, [[-halfL * 0.42, -1.5], [-halfL * 0.42, 1.5]], '#09090b', 0.85, deform);
  strokePoly(ctx, [[-halfL * 0.70, -1.45], [-halfL * 0.84, -1.15], [-halfL * 0.84, 1.15], [-halfL * 0.70, 1.45]], '#cbd5e1', 0.58, deform);

  // Handlebars + twin dial gauge pod
  drawHandlebars(ctx, halfL * 0.47, 0, steer, 3.65, 1.35, '#e2e8f0', '#0f172a', 'round_chrome', deform);
  drawDeformedDot(ctx, halfL * 0.55, -0.58, 0.48, '#0f172a', deform, '#cbd5e1', 0.3);
  drawDeformedDot(ctx, halfL * 0.55, 0.58, 0.48, '#0f172a', deform, '#cbd5e1', 0.3);

  // Round chrome headlight + stalk blinkers + rear taillight
  drawRoundChromeHeadlight(ctx, halfL * 0.68, 0, 1.12, opt, opt.leftHeadBroken, deform);
  drawMotoBlinkers(ctx, halfL * 0.56, 2.35, 0, opt, deform, 0.65);
  drawMotoBlinkers(ctx, -halfL * 0.82, 2.15, 0, opt, deform, 0.65);
  drawMotoTaillight(ctx, -halfL * 0.90, 0, 1.0, opt, opt.leftTailBroken, deform);
}

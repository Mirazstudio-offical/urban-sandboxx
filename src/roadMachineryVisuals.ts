import type { VehicleRenderContext } from './vehicleArchetypes';
import type { Vehicle } from './types';

function isVehicleReverseGearActive(car: Vehicle): boolean {
  if (car.engineState) {
    if (car.engineState.transmissionType === 'AUTO') {
      return car.engineState.autoGearMode === 'R';
    }
    return car.engineState.currentGear === -1;
  }
  return !!car.isReversing;
}

/**
 * Procedural asphalt aggregate texture (hot bituminous mix with mineral stones)
 */
function drawAsphaltAggregateTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  density: number = 30
): void {
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x, y, w, h);

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
  grad.addColorStop(0.5, 'rgba(28, 25, 23, 0.15)');
  grad.addColorStop(1, 'rgba(10, 10, 10, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  const seed = Math.floor(Math.abs(x * 31 + y * 17)) % 1000;
  for (let i = 0; i < density; i++) {
    const rx = x + ((seed * (i + 1) * 13) % 1000) / 1000 * w;
    const ry = y + ((seed * (i + 3) * 29) % 1000) / 1000 * h;
    const size = 0.8 + (((seed + i * 7) % 5) / 5) * 1.6;
    const tone = (i % 3 === 0) ? '#292524' : (i % 3 === 1 ? '#0c0a09' : '#3f3f46');
    ctx.fillStyle = tone;
    ctx.fillRect(rx, ry, size, size);
  }
}

/**
 * Renders an authentic asphalt roller drum housed UNDER the chassis/hood frame.
 * On real asphalt tandem rollers (unlike open-drum soil compactors), the drums
 * are enclosed within the frame and under the massive water tanks & bodywork.
 * From above, only the leading/trailing drum curved lip peeks out under the bumper
 * beam and scrapers, while the machined drum sides run flush along the frame cheeks.
 */
function drawAsphaltRollerDrumUnderFrame(
  ctx: CanvasRenderingContext2D,
  drumCenter: number,
  drumLength: number,
  drumWidth: number,
  isFront: boolean
): void {
  const halfDL = drumLength / 2;
  const halfDW = drumWidth / 2;
  const drumX1 = drumCenter - halfDL;
  const drumX2 = drumCenter + halfDL;

  // 1. Under-chassis ground shadow of drum
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(drumX1 - 1, -halfDW + 0.5, drumLength + 2, drumWidth);

  // 2. Machined steel cylindrical drum body (underframe layer)
  const drumGrad = ctx.createLinearGradient(drumX1, 0, drumX2, 0);
  drumGrad.addColorStop(0.00, '#334155');
  drumGrad.addColorStop(0.15, '#64748b');
  drumGrad.addColorStop(0.50, '#e2e8f0'); // Specular center reflection apex
  drumGrad.addColorStop(0.85, '#64748b');
  drumGrad.addColorStop(1.00, '#334155');

  ctx.fillStyle = drumGrad;
  ctx.fillRect(drumX1, -halfDW, drumLength, drumWidth);

  // 3. Chamfered drum outer edges (visible along left & right frame cheeks)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(drumX1, -halfDW, drumLength, 1.2);
  ctx.fillRect(drumX1, halfDW - 1.2, drumLength, 1.2);

  ctx.fillStyle = '#f8fafc'; // Machined bevel sheen
  ctx.fillRect(drumX1, -halfDW + 1.2, drumLength, 0.6);
  ctx.fillRect(drumX1, halfDW - 1.8, drumLength, 0.6);

  // 4. Exposed leading/trailing curved steel drum lip peeking out from under bumper
  const exposedLipX = isFront ? drumX2 - 3.5 : drumX1;
  const lipW = 3.5;
  const lipGrad = ctx.createLinearGradient(exposedLipX, 0, exposedLipX + lipW, 0);
  if (isFront) {
    lipGrad.addColorStop(0, '#94a3b8');
    lipGrad.addColorStop(0.6, '#f1f5f9');
    lipGrad.addColorStop(1.0, '#475569');
  } else {
    lipGrad.addColorStop(0, '#475569');
    lipGrad.addColorStop(0.4, '#f1f5f9');
    lipGrad.addColorStop(1.0, '#94a3b8');
  }
  ctx.fillStyle = lipGrad;
  ctx.fillRect(exposedLipX, -halfDW + 1.2, lipW, drumWidth - 2.4);

  // 5. Spring-loaded scraper blade & water spray pipe bar over the exposed drum lip
  const scraperX = isFront ? drumX2 - 4.5 : drumX1 + 3.5;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(scraperX - 0.8, -halfDW + 1, 1.6, drumWidth - 2);
  ctx.fillStyle = '#ea580c'; // Polyurethane wiper blade
  ctx.fillRect(scraperX - 0.4, -halfDW + 1.5, 0.8, drumWidth - 3);

  // Pressurized stainless spray bar with nozzles
  const sprayBarX = isFront ? drumX2 - 5.5 : drumX1 + 4.5;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(sprayBarX, -halfDW + 2);
  ctx.lineTo(sprayBarX, halfDW - 2);
  ctx.stroke();

  // Water atomizing mist cone
  const nozzleCount = Math.max(3, Math.floor(drumWidth / 5.5));
  const step = (drumWidth - 4) / (nozzleCount - 1);
  for (let n = 0; n < nozzleCount; n++) {
    const ny = -halfDW + 2 + n * step;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(sprayBarX - 0.6, ny - 0.6, 1.2, 1.2);
    // Subtle fine water mist sheen on drum
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    const mistTargetX = isFront ? drumX2 - 1 : drumX1 + 1;
    ctx.moveTo(sprayBarX, ny);
    ctx.lineTo(mistTargetX, ny - 1.5);
    ctx.lineTo(mistTargetX, ny + 1.5);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Industrial diamond checkerplate texture
 */
function drawDiamondPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseColor: string = '#334155'
): void {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 0.6;
  const step = 2.4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (let px = x - h; px < x + w + h; px += step) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + h, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + h, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Amber rotating/pulsing safety strobe beacon
 */
function drawAmberBeacon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number = 2.2
): void {
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, radius + 0.8, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(x, y, 0.2, x, y, radius);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.5, '#f59e0b');
  grad.addColorStop(1, '#b45309');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  const pulse = 0.5 + Math.sin(Date.now() * 0.008) * 0.5;
  ctx.fillStyle = `rgba(245, 158, 11, ${0.35 * pulse})`;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * High-output LED work floodlight
 */
function drawWorkFloodlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  active: boolean,
  angleRad: number = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  if (angleRad !== 0) ctx.rotate(angleRad);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-w / 2 - 0.5, -h / 2 - 0.5, w + 1, h + 1);

  if (active) {
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
  } else {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-w / 2 + 0.6, -h / 2 + 0.6, w - 1.2, h - 1.2);
  }

  ctx.restore();
}

/**
 * Large water tank filling cap with ribbed twist grip (crucial for asphalt rollers)
 */
function drawWaterTankCap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number = 2.0
): void {
  // Recessed collar
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, radius + 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Blue polyethylene cap
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Ribbed grip notches
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 0.8;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (radius - 1.0), y + Math.sin(a) * (radius - 1.0));
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    ctx.stroke();
  }
}

/**
 * ============================================================================
 * 1. WHEELED ASPHALT PAVER (КОЛЕСНЫЙ АСФАЛЬТОУКЛАДЧИК)
 * High-fidelity top-down simulation:
 * - Oscillating front push roller crossbeam with twin dampers
 * - Folding hydraulic hopper with steaming bituminous aggregate mix
 * - Twin flight conveyor chains feeding mix backwards
 * - Tandem steering bogie wheels pivoted under hopper wings
 * - Central tractor unit with diesel engine bonnet, radiator louvers,
 *   cyclonic pre-cleaner air intake & rain-capped exhaust stack
 * - Ergonomic hardtop canopy with dual slide-out operator seats,
 *   ErgoPlus multi-function console, safety handrails & amber beacons
 * - Massive rear traction compactor tires
 * - Screed tow arms with hydraulic leveling cylinders
 * - Open auger chamber with left/right spiral distributor screws
 * - Heavy vibratory floating screed with telescoping extensions,
 *   crown adjustment crank, rear footboard & dual remote control handsets
 * ============================================================================
 */
export function renderWheeledAsphaltPaver(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, nightAlpha } = vCtx;
  const bodyColor = car.color || '#eab308'; // Vögele Yellow / Cat Equipment Yellow
  const gamma = car.steerAngle || 0;
  const isLightsOn = car.headlightsOn || (nightAlpha > 0.05 && !car.isParked);
  const isReversing = isVehicleReverseGearActive(car);
  const isBraking = car.brakeLightsOn && !isReversing;

  // --- A. UNDERCARRIAGE & REAR TRACTION DRIVE TIRES ---
  const rearTireX = -halfL * 0.28;
  const rearTireL = 17;
  const rearTireW = 6.8;
  const rearTireY = halfW * 0.88;

  // Left drive tire
  ctx.fillStyle = '#090d16';
  ctx.fillRect(rearTireX - rearTireL / 2, -rearTireY - rearTireW / 2, rearTireL, rearTireW);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.0;
  for (let tx = rearTireX - rearTireL / 2 + 2; tx < rearTireX + rearTireL / 2 - 1; tx += 2.8) {
    ctx.beginPath();
    ctx.moveTo(tx, -rearTireY - rearTireW / 2);
    ctx.lineTo(tx + 1.2, -rearTireY + rearTireW / 2);
    ctx.stroke();
  }

  // Right drive tire
  ctx.fillStyle = '#090d16';
  ctx.fillRect(rearTireX - rearTireL / 2, rearTireY - rearTireW / 2, rearTireL, rearTireW);
  for (let tx = rearTireX - rearTireL / 2 + 2; tx < rearTireX + rearTireL / 2 - 1; tx += 2.8) {
    ctx.beginPath();
    ctx.moveTo(tx, rearTireY - rearTireW / 2);
    ctx.lineTo(tx + 1.2, rearTireY + rearTireW / 2);
    ctx.stroke();
  }

  // --- B. FRONT HOPPER & STEERING BOGIE SECTION (100% RIGID FRAME) ---
  const engX2 = halfL * 0.18;
  const hopStartX = engX2 - 1.0;
  const hopEndX = halfL * 0.94;
  const hopL = hopEndX - hopStartX;
  const hopW = halfW * 2.0 - 1.0;

  // Front steered bogie wheels tucked under hopper wings (4 wheels steered via kingpins)
  const bogieTireL = 9.5;
  const bogieTireW = 3.8;
  const bogieX1 = hopStartX + hopL * 0.35;
  const bogieX2 = hopStartX + hopL * 0.70;
  const bogieY = halfW * 0.82;

  const drawBogieWheel = (bx: number, by: number) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(gamma); // Front bogie wheels steer with Ackerman steering!
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-bogieTireL / 2, -bogieTireW / 2, bogieTireL, bogieTireW);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-bogieTireL / 2 + 1, -bogieTireW / 2 + 1, bogieTireL - 2, bogieTireW - 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-1.5, -bogieTireW / 2 + 1.2, 3.0, bogieTireW - 2.4);
    ctx.restore();
  };
  drawBogieWheel(bogieX1, -bogieY);
  drawBogieWheel(bogieX2, -bogieY);
  drawBogieWheel(bogieX1, bogieY);
  drawBogieWheel(bogieX2, bogieY);

  // Hopper outer frame & hydraulic folding wings (monocoque fixed steel)
  // Left wing
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(hopStartX, -hopW / 2);
  ctx.lineTo(hopEndX, -hopW / 2 + 2.5);
  ctx.lineTo(hopEndX, -hopW / 2 + 5.5);
  ctx.lineTo(hopStartX, -hopW / 2 + 6.0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Right wing
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(hopStartX, hopW / 2);
  ctx.lineTo(hopEndX, hopW / 2 - 2.5);
  ctx.lineTo(hopEndX, hopW / 2 - 5.5);
  ctx.lineTo(hopStartX, hopW / 2 - 6.0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Hydraulic wing folding rams
  const ramX = hopStartX + hopL * 0.45;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(ramX, -hopW / 2 + 2.0);
  ctx.lineTo(ramX - 5, -halfW * 0.45);
  ctx.moveTo(ramX, hopW / 2 - 2.0);
  ctx.lineTo(ramX - 5, halfW * 0.45);
  ctx.stroke();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(ramX - 0.5, -hopW / 2 + 2.0);
  ctx.lineTo(ramX - 3.0, -halfW * 0.45 + 3);
  ctx.moveTo(ramX - 0.5, hopW / 2 - 2.0);
  ctx.lineTo(ramX - 3.0, halfW * 0.45 - 3);
  ctx.stroke();

  // Steaming hot asphalt mix inside hopper
  const hopInnerW = hopW - 11;
  drawAsphaltAggregateTexture(ctx, hopStartX + 2, -hopInnerW / 2, hopL - 4, hopInnerW, 45);

  // Twin conveyor chains with transverse steel flight bars
  const chainW = hopInnerW * 0.42;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  for (let fx = hopStartX + 4; fx < hopEndX - 2; fx += 3.5) {
    ctx.beginPath();
    ctx.moveTo(fx, -chainW - 1);
    ctx.lineTo(fx, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, 2);
    ctx.lineTo(fx, chainW + 1);
    ctx.stroke();
  }
  // Center divider
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(hopStartX + 2, -1.2, hopL - 4, 2.4);

  // Front protective rubber curtain
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(hopEndX - 1.5, -hopW / 2 + 3, 2.5, hopW - 6);

  // Front dump truck push rollers (упорные цилиндрические ролики на качающейся балке)
  const pushBeamX = hopEndX + 1.5;
  ctx.fillStyle = '#334155';
  ctx.fillRect(pushBeamX - 1.5, -halfW * 0.72, 3.2, halfW * 1.44);

  const drawPushRoller = (ry: number) => {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(pushBeamX, ry - 3.8, 4.2, 7.6);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(pushBeamX + 0.8, ry - 3.0, 2.6, 6.0);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(pushBeamX + 2.1, ry, 1.2, 0, Math.PI * 2);
    ctx.fill();
  };
  drawPushRoller(-halfW * 0.42);
  drawPushRoller(halfW * 0.42);

  drawWorkFloodlight(ctx, hopEndX - 2, -hopW / 2 + 2.5, 3.2, 2.0, isLightsOn, -0.3);
  drawWorkFloodlight(ctx, hopEndX - 2, hopW / 2 - 2.5, 3.2, 2.0, isLightsOn, 0.3);

  // --- C. CENTER TRACTOR UNIT & DIESEL ENGINE HOOD ---
  const engX1 = -halfL * 0.22;
  const engW = halfW * 1.62;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(engX1, -engW / 2, engX2 - engX1, engW);
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(engX1, -engW / 2, engX2 - engX1, engW);

  // Radiator ventilation louvers
  const ventX = engX1 + 3;
  const ventW = 12;
  const ventH = engW * 0.68;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(ventX, -ventH / 2, ventW, ventH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  for (let vx = ventX + 1.8; vx < ventX + ventW - 1; vx += 2.0) {
    ctx.beginPath();
    ctx.moveTo(vx, -ventH / 2 + 1);
    ctx.lineTo(vx, ventH / 2 - 1);
    ctx.stroke();
  }

  // Exhaust stack
  const exX = engX1 + 17;
  const exY = -engW * 0.32;
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(exX, exY, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(exX, exY, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(exX - 0.4, exY - 0.4, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Cyclonic air pre-cleaner
  const airX = engX1 + 17;
  const airY = engW * 0.32;
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(airX, airY, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(airX, airY, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Fluid service caps
  ctx.fillStyle = '#15803d'; // Diesel
  ctx.beginPath();
  ctx.arc(engX1 + 8, -engW * 0.42, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d4ed8'; // Hydraulic
  ctx.beginPath();
  ctx.arc(engX1 + 8, engW * 0.42, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // --- D. OPERATOR PLATFORM & ALL-WEATHER HARDTOP CANOPY ---
  const platX1 = -halfL * 0.62;
  const platX2 = engX1;
  const platW = halfW * 2.0;

  drawDiamondPlate(ctx, platX1, -platW / 2, platX2 - platX1, platW, '#1e293b');

  // Yellow handrails
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(platX1 + 1, -platW / 2 + 0.8);
  ctx.lineTo(platX2 - 1, -platW / 2 + 0.8);
  ctx.moveTo(platX1 + 1, platW / 2 - 0.8);
  ctx.lineTo(platX2 - 1, platW / 2 - 0.8);
  ctx.stroke();

  // Dual sliding seats
  const seatX = platX1 + (platX2 - platX1) * 0.52;
  const drawOperatorSeat = (sy: number) => {
    ctx.fillStyle = '#475569';
    ctx.fillRect(seatX - 4, sy - 1, 8, 2);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(seatX - 2.8, sy - 2.6, 5.6, 5.2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(seatX - 2.2, sy - 2.0, 4.4, 4.0);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(seatX - 1.8, sy - 3.0, 3.6, 0.8);
    ctx.fillRect(seatX - 1.8, sy + 2.2, 3.6, 0.8);
  };
  drawOperatorSeat(-platW * 0.36);
  drawOperatorSeat(platW * 0.36);

  // ErgoPlus console
  const deskX = platX1 + (platX2 - platX1) * 0.65;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(deskX - 2.5, -4, 5.0, 8.0);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(deskX - 1.5, -2.5, 3.0, 5.0);

  // Hardtop canopy roof
  const roofX1 = platX1 + 2;
  const roofX2 = engX1 - 1;
  const roofW = platW - 3;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.fillRect(roofX1, -roofW / 2, roofX2 - roofX1, roofW);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(roofX1 + 1.2, -roofW / 2 + 1.2, roofX2 - roofX1 - 2.4, roofW - 2.4);

  // Sun visor
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(roofX2 - 2, -roofW / 2, 2, roofW);

  // Beacons & floodlights on canopy
  drawAmberBeacon(ctx, (roofX1 + roofX2) / 2, -roofW * 0.40, 2.0);
  drawAmberBeacon(ctx, (roofX1 + roofX2) / 2, roofW * 0.40, 2.0);

  drawWorkFloodlight(ctx, roofX2 - 1, -roofW / 2 + 1.5, 2.8, 1.8, isLightsOn, 0.2);
  drawWorkFloodlight(ctx, roofX2 - 1, roofW / 2 - 1.5, 2.8, 1.8, isLightsOn, -0.2);
  drawWorkFloodlight(ctx, roofX1 + 1, -roofW / 2 + 1.5, 2.8, 1.8, isLightsOn, Math.PI - 0.2);
  drawWorkFloodlight(ctx, roofX1 + 1, roofW / 2 - 1.5, 2.8, 1.8, isLightsOn, Math.PI + 0.2);

  // --- E. MATERIAL AUGER CHAMBER & SCREED TOW ARMS ---
  const screedX1 = -halfL + 2.5;
  const augerX = (screedX1 + platX1) / 2;
  const augerW = halfW * 1.95;

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(engX1 + 4, -halfW * 0.85);
  ctx.lineTo(screedX1 + 3, -halfW * 1.05);
  ctx.moveTo(engX1 + 4, halfW * 0.85);
  ctx.lineTo(screedX1 + 3, halfW * 1.05);
  ctx.stroke();

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(platX1, -halfW * 0.90);
  ctx.lineTo(screedX1 + 6, -halfW * 1.00);
  ctx.moveTo(platX1, halfW * 0.90);
  ctx.lineTo(screedX1 + 6, halfW * 1.00);
  ctx.stroke();

  drawAsphaltAggregateTexture(ctx, augerX - 3.5, -augerW / 2, 7.0, augerW, 25);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  for (let ay = -augerW / 2 + 2; ay < -2; ay += 3.2) {
    ctx.beginPath();
    ctx.moveTo(augerX - 2.5, ay);
    ctx.lineTo(augerX + 2.5, ay + 1.8);
    ctx.stroke();
  }
  for (let ay = 2; ay < augerW / 2 - 2; ay += 3.2) {
    ctx.beginPath();
    ctx.moveTo(augerX - 2.5, ay + 1.8);
    ctx.lineTo(augerX + 2.5, ay);
    ctx.stroke();
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(augerX - 3.0, -3.0, 6.0, 6.0);

  // --- F. VIBRATORY FLOATING SCREED ---
  const screedW = halfW * 2.2;
  const screedL = 8.5;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(screedX1, -screedW / 2, screedL, screedW);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(screedX1 + 1, -screedW / 2 + 1, screedL - 3.5, screedW - 2);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(screedX1 + 2, -2, 4, 4);

  drawDiamondPlate(ctx, screedX1 - 2.5, -screedW * 0.45, 2.5, screedW * 0.90, '#0f172a');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(screedX1 - 2, -screedW / 2 - 1.2, screedL + 5, 1.4);
  ctx.fillRect(screedX1 - 2, screedW / 2 - 0.2, screedL + 5, 1.4);

  const drawScreedRemote = (ry: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(screedX1, ry - 1.8, 3.2, 3.6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(screedX1 + 0.6, ry - 1.2, 1.8, 2.4);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(screedX1 + 2.4, ry, 0.7, 0, Math.PI * 2);
    ctx.fill();
  };
  drawScreedRemote(-screedW * 0.46);
  drawScreedRemote(screedW * 0.46);

  const rearLightX = screedX1;
  const drawScreedLight = (ly: number) => {
    if (isReversing) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rearLightX - 0.8, ly - 1, 1.6, 2);
    } else if (isBraking) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rearLightX - 0.8, ly - 1, 1.6, 2);
    } else if (isLightsOn) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rearLightX - 0.8, ly - 1, 1.6, 2);
    } else {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(rearLightX - 0.8, ly - 1, 1.6, 2);
    }
  };
  drawScreedLight(-screedW * 0.42);
  drawScreedLight(screedW * 0.42);
}

/**
 * ============================================================================
 * 2. HEAVY ARTICULATED TANDEM ASPHALT ROLLER (ТЯЖЕЛЫЙ АСФАЛЬТОВЫЙ КАТОК)
 * High-fidelity top-down simulation of a modern double-drum asphalt roller:
 * Unlike an open-drum soil compactor, in an asphalt roller the front and rear
 * drums are mounted UNDER the chassis modules!
 * - Front module:
 *   * Heavy front bumper crossmember with rubber buffers & recessed worklights
 *   * Steel drum leading curved lip peeks out under front bumper with scraper
 *   * Massive front water tank module (large blue filler caps, sight gauge)
 *   * Sloping aerodynamic front engine/cooler hood with ventilation louvers
 *   * Robust side frame cheeks flush with drum edges for curb rolling
 * - Central articulation & oscillation joint:
 *   * Heavy cast pivot knuckle, grease pin, dual dynamic steering rams with chrome rods
 *   * Flexible high-pressure hydraulic hose bundles across waist
 * - Rear module:
 *   * Panoramic ROPS/FOPS glazed cabin with tinted solar glass, sliding workstation
 *   * Rear engine compartment behind cabin with exhaust stack & cyclone filter
 *   * Rear water tank module extending over the rear drum
 *   * Heavy rear bumper with integrated taillights & worklights
 *   * Rear drum leading edge and scraper tucked beneath rear bumper
 * ============================================================================
 */
export function renderHeavyTandemRoller(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, nightAlpha, fc, rc } = vCtx;
  const bodyColor = car.color || '#eab308'; // Hamm Orange / Bomag Yellow / Cat Yellow
  const gamma = car.steerAngle || 0;
  const isLightsOn = car.headlightsOn || (nightAlpha > 0.05 && !car.isParked);
  const isReversing = isVehicleReverseGearActive(car);
  const isBraking = car.brakeLightsOn && !isReversing;
  const dmg = car.damage || {
    frontCrumple: 0, rearCrumple: 0, leftDent: 0, rightDent: 0,
    frontLeftDent: 0, frontRightDent: 0, rearLeftDent: 0, rearRightDent: 0,
    leftHeadlightBroken: false, rightHeadlightBroken: false,
    leftTaillightBroken: false, rightTaillightBroken: false,
    hoodBuckled: false, scratches: []
  };

  const fld = Math.min(halfL * 0.4, dmg.frontLeftDent || 0);
  const frd = Math.min(halfL * 0.4, dmg.frontRightDent || 0);
  const rld = Math.min(halfL * 0.35, dmg.rearLeftDent || 0);
  const rrd = Math.min(halfL * 0.35, dmg.rearRightDent || 0);

  const halfGamma = gamma / 2;
  const cosF = Math.cos(halfGamma);
  const sinF = Math.sin(halfGamma);
  const cosR = Math.cos(-halfGamma);
  const sinR = Math.sin(-halfGamma);

  const drumW = halfW * 1.94; // Wide asphalt compaction drums
  const drumL = halfL * 0.56;

  // --- A. CENTRAL ARTICULATION & OSCILLATION WAIST (JOINT PIN AT 0, 0) ---
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Dual hydraulic steering rams (anchored to rear frame at -10, connecting to pivoting front frame)
  const flX = 10 * cosF - (-6.5) * sinF;
  const flY = 10 * sinF + (-6.5) * cosF;
  const rlX = -10 * cosR - (-6.5) * sinR;
  const rlY = -10 * sinR + (-6.5) * cosR;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(rlX, rlY);
  ctx.lineTo((flX + rlX) / 2, (flY + rlY) / 2);
  ctx.stroke();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo((flX + rlX) / 2, (flY + rlY) / 2);
  ctx.lineTo(flX, flY);
  ctx.stroke();

  const frX = 10 * cosF - 6.5 * sinF;
  const frY = 10 * sinF + 6.5 * cosF;
  const rrX = -10 * cosR - 6.5 * sinR;
  const rrY = -10 * sinR + 6.5 * cosR;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(rrX, rrY);
  ctx.lineTo((frX + rrX) / 2, (frY + rrY) / 2);
  ctx.stroke();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo((frX + rrX) / 2, (frY + rrY) / 2);
  ctx.lineTo(frX, frY);
  ctx.stroke();

  // Flexible hydraulic hose bundle across waist
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5 * cosR - (-2.5) * sinR, -5 * sinR + (-2.5) * cosR);
  ctx.quadraticCurveTo(0, 0, 5 * cosF - (-2.5) * sinF, 5 * sinF + (-2.5) * cosF);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5 * cosR - 2.5 * sinR, -5 * sinR + 2.5 * cosR);
  ctx.quadraticCurveTo(0, 0, 5 * cosF - 2.5 * sinF, 5 * sinF + 2.5 * cosF);
  ctx.stroke();

  // --- B. FRONT MODULE (FRONT DRUM UNDER CHASSIS + WATER TANK & HOOD - PIVOTS BY +HALF_GAMMA) ---
  ctx.save();
  ctx.rotate(halfGamma);

  const fDrumCenter = halfL * 0.62;
  // 1. Steel drum under chassis (leading curved lip and sides visible)
  drawAsphaltRollerDrumUnderFrame(ctx, fDrumCenter, drumL, drumW, true);

  // 2. Heavy side frame cheeks (боковины вилки вальца, вровень с торцами вальца)
  const cheekW = 2.4;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(fDrumCenter - drumL / 2, -drumW / 2, drumL, cheekW);
  ctx.fillRect(fDrumCenter - drumL / 2, drumW / 2 - cheekW, drumL, cheekW);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(fDrumCenter - drumL / 2 + 1, -drumW / 2 + 0.6, drumL - 2, cheekW - 0.6);
  ctx.fillRect(fDrumCenter - drumL / 2 + 1, drumW / 2 - cheekW, drumL - 2, cheekW - 0.6);

  // Drum vibration exciter motor hubs on side cheeks
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(fDrumCenter, -drumW / 2 + cheekW / 2, 1.8, 0, Math.PI * 2);
  ctx.arc(fDrumCenter, drumW / 2 - cheekW / 2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 3. Front Heavy Bumper Crossmember (балка переднего бампера над вальцом с учетом деформации fc)
  const fBumpX = halfL - fc - 2.5;
  const fBumpW = drumW - 4.0;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fBumpX - 2, -fBumpW / 2, 4.0, fBumpW);
  // Rubber impact buffers on bumper
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(fBumpX + 1.2, -fBumpW * 0.40, 1.5, fBumpW * 0.80);

  // Front working floodlights in bumper recesses (taking into account broken headlights)
  const isLeftLightOn = isLightsOn && !dmg.leftHeadlightBroken;
  const isRightLightOn = isLightsOn && !dmg.rightHeadlightBroken;
  drawWorkFloodlight(ctx, fBumpX - 0.5 - fld * 0.2, -fBumpW * 0.38, 3.2, 2.0, isLeftLightOn);
  drawWorkFloodlight(ctx, fBumpX - 0.5 - frd * 0.2, fBumpW * 0.38, 3.2, 2.0, isRightLightOn);

  // Front turn indicators on front bumper corners
  if (car.turnSignal !== 'none') {
    const isBlinkOn = Math.floor((car.turnSignalTimer || 0) * 4) % 2 === 0;
    if (isBlinkOn) {
      ctx.fillStyle = '#f59e0b';
      if (car.turnSignal === 'left' || car.turnSignal === 'hazard') {
        ctx.fillRect(fBumpX - 0.5, -fBumpW / 2 - 0.5, 2.0, 2.0);
      }
      if (car.turnSignal === 'right' || car.turnSignal === 'hazard') {
        ctx.fillRect(fBumpX - 0.5, fBumpW / 2 - 1.5, 2.0, 2.0);
      }
    }
  }

  // 4. FRONT CHASSIS HOOD & INTEGRATED WATER TANK (накрывает вальц сверху)
  const fModX1 = 3;
  const fModX2 = fBumpX - 1.5;
  const fModW = halfW * 1.64;

  // Main contoured bodywork covering drum
  ctx.fillStyle = bodyColor;
  ctx.fillRect(fModX1, -fModW / 2, fModX2 - fModX1, fModW);
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(fModX1, -fModW / 2, fModX2 - fModX1, fModW);

  // Front Water Tank Section (большой объемный бак системы орошения с тиснением)
  const tankX1 = fModX1 + (fModX2 - fModX1) * 0.35;
  const tankX2 = fModX2 - 2;
  const tankW = fModW - 3.5;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(tankX1, -tankW / 2, tankX2 - tankX1, tankW);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(tankX1 + 1, -tankW / 2 + 1, tankX2 - tankX1 - 2, tankW - 2);

  // Dual water tank quick-fill caps with ribbed grips
  drawWaterTankCap(ctx, (tankX1 + tankX2) / 2, -tankW * 0.30, 2.2);
  drawWaterTankCap(ctx, (tankX1 + tankX2) / 2, tankW * 0.30, 2.2);

  // Water level sight gauge glass in center
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect((tankX1 + tankX2) / 2 - 3, -0.6, 6, 1.2);

  // Engine radiator cooling louvers on sloped hood
  const fLouverX = fModX1 + 2;
  const fLouverW = (tankX1 - fModX1) - 3;
  const fLouverH = fModW * 0.65;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fLouverX, -fLouverH / 2, fLouverW, fLouverH);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 0.6;
  for (let ly = -fLouverH / 2 + 1.2; ly < fLouverH / 2 - 1; ly += 2.0) {
    ctx.beginPath();
    ctx.moveTo(fLouverX + 1, ly);
    ctx.lineTo(fLouverX + fLouverW - 1, ly);
    ctx.stroke();
  }

  // Lifting lugs on front frame corners
  ctx.fillStyle = '#facc15';
  ctx.fillRect(fModX1 + 2, -fModW / 2 - 1.2, 3, 1.2);
  ctx.fillRect(fModX1 + 2, fModW / 2, 3, 1.2);

  // Front Module Scratches (rotated with front module!)
  if (dmg.scratches && dmg.scratches.length > 0) {
    ctx.save();
    for (const sc of dmg.scratches) {
      if (sc.x > 0) { // Front half damage
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 2, 0);
        ctx.lineTo(sc.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  ctx.restore();

  // --- C. REAR MODULE (REAR DRUM UNDER CHASSIS + CABIN, ENGINE & REAR WATER TANK - PIVOTS BY -HALF_GAMMA) ---
  ctx.save();
  ctx.rotate(-halfGamma);

  const rDrumCenter = -halfL * 0.62;
  // 1. Steel drum under chassis (trailing curved lip and sides visible)
  drawAsphaltRollerDrumUnderFrame(ctx, rDrumCenter, drumL, drumW, false);

  // 2. Rear side frame cheeks
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(rDrumCenter - drumL / 2, -drumW / 2, drumL, cheekW);
  ctx.fillRect(rDrumCenter - drumL / 2, drumW / 2 - cheekW, drumL, cheekW);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(rDrumCenter - drumL / 2 + 1, -drumW / 2 + 0.6, drumL - 2, cheekW - 0.6);
  ctx.fillRect(rDrumCenter - drumL / 2 + 1, drumW / 2 - cheekW, drumL - 2, cheekW - 0.6);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(rDrumCenter, -drumW / 2 + cheekW / 2, 1.8, 0, Math.PI * 2);
  ctx.arc(rDrumCenter, drumW / 2 - cheekW / 2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 3. Rear Heavy Bumper Crossmember (балка заднего бампера над вальцом с учетом rc)
  const rBumpX = -halfL + rc + 2.5;
  const rBumpW = drumW - 4.0;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(rBumpX - 2, -rBumpW / 2, 4.0, rBumpW);

  // Integrated rear taillights & reverse lights on bumper
  const drawRearLight = (ly: number, isBroken: boolean) => {
    if (isBroken) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rBumpX - 1.2, ly - 1, 2.4, 2);
      return;
    }
    if (isReversing) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rBumpX - 1.2, ly - 1, 2.4, 2);
    } else if (isBraking) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rBumpX - 1.2, ly - 1, 2.4, 2);
    } else if (isLightsOn) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rBumpX - 1.2, ly - 1, 2.4, 2);
    } else {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(rBumpX - 1.2, ly - 1, 2.4, 2);
    }
  };
  drawRearLight(-rBumpW * 0.38, !!dmg.leftTaillightBroken);
  drawRearLight(rBumpW * 0.38, !!dmg.rightTaillightBroken);

  // Rear turn signals
  if (car.turnSignal !== 'none') {
    const isBlinkOn = Math.floor((car.turnSignalTimer || 0) * 4) % 2 === 0;
    if (isBlinkOn) {
      ctx.fillStyle = '#f59e0b';
      if (car.turnSignal === 'left' || car.turnSignal === 'hazard') {
        ctx.fillRect(rBumpX - 1.2, -rBumpW * 0.38 - 2.5, 2.4, 1.8);
      }
      if (car.turnSignal === 'right' || car.turnSignal === 'hazard') {
        ctx.fillRect(rBumpX - 1.2, rBumpW * 0.38 + 0.8, 2.4, 1.8);
      }
    }
  }

  // 4. Rear Engine Housing & Rear Water Tank (накрывает задний вальц)
  const rModX1 = rBumpX + 2.0;
  const rModX2 = -3;
  const rModW = halfW * 1.64;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(rModX1, -rModW / 2, rModX2 - rModX1, rModW);
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(rModX1, -rModW / 2, rModX2 - rModX1, rModW);

  // Rear secondary water tank cap
  drawWaterTankCap(ctx, rModX1 + 4, 0, 2.2);

  // Engine exhaust stack with rain cap
  const exX = rModX1 + 10;
  const exY = -rModW * 0.32;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(exX, exY, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(exX, exY, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(exX - 0.3, exY - 0.3, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Cyclonic air filter
  const airX = rModX1 + 10;
  const airY = rModW * 0.32;
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(airX, airY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Diesel fuel filler neck
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(rModX1 + 15, -rModW * 0.38, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // --- D. OPERATOR ROPS/FOPS PANORAMIC CABIN ---
  const cabX1 = -halfL * 0.30;
  const cabX2 = halfL * 0.12;
  const cabW = halfW * 1.68;

  // Diamond plate platform steps on both sides
  drawDiamondPlate(ctx, cabX1 - 2, -halfW * 0.98, cabX2 - cabX1 + 4, halfW * 0.98 - cabW / 2, '#334155');
  drawDiamondPlate(ctx, cabX1 - 2, cabW / 2, cabX2 - cabX1 + 4, halfW * 0.98 - cabW / 2, '#334155');

  // Panoramic tinted safety glass cabin structure
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(cabX1, -cabW / 2, cabX2 - cabX1, cabW);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
  ctx.fillRect(cabX1 + 1, -cabW / 2 + 1, cabX2 - cabX1 - 2, cabW - 2);

  // Interior: Swivel operator station that slides across to edges
  const seatX = (cabX1 + cabX2) / 2;
  ctx.fillStyle = '#475569';
  ctx.fillRect(seatX - 1, -cabW * 0.36, 2, cabW * 0.72);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(seatX - 2.8, -cabW * 0.22 - 2.5, 5.6, 5.0);
  ctx.fillStyle = '#334155';
  ctx.fillRect(seatX - 2.2, -cabW * 0.22 - 2.0, 4.4, 4.0);

  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(seatX + 2.5, -cabW * 0.22, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Streamlined Cabin Roof with Ceramic Frit & Drainage Grooves
  const roofX1 = cabX1 + 2.0;
  const roofX2 = cabX2 - 2.0;
  const roofW = cabW - 3.0;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(roofX1, -roofW / 2, roofX2 - roofX1, roofW);
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(roofX1, -roofW / 2, roofX2 - roofX1, roofW);

  drawAmberBeacon(ctx, (roofX1 + roofX2) / 2, 0, 2.2);

  drawWorkFloodlight(ctx, roofX2 - 0.5, -roofW / 2 + 1.2, 2.6, 1.8, isLightsOn, 0.2);
  drawWorkFloodlight(ctx, roofX2 - 0.5, roofW / 2 - 1.2, 2.6, 1.8, isLightsOn, -0.2);
  drawWorkFloodlight(ctx, roofX1 + 0.5, -roofW / 2 + 1.2, 2.6, 1.8, isLightsOn, Math.PI - 0.2);
  drawWorkFloodlight(ctx, roofX1 + 0.5, roofW / 2 - 1.2, 2.6, 1.8, isLightsOn, Math.PI + 0.2);

  // Rear Module Scratches
  if (dmg.scratches && dmg.scratches.length > 0) {
    ctx.save();
    for (const sc of dmg.scratches) {
      if (sc.x <= 0) { // Rear half damage
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 2, 0);
        ctx.lineTo(sc.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  ctx.restore(); // Close rear module save/rotate(-halfGamma)
}

/**
 * ============================================================================
 * 3. COMPACT SIDEWALK ASPHALT ROLLER (ТРОТУАРНЫЙ АСФАЛЬТОВЫЙ КАТОК)
 * High-fidelity top-down simulation:
 * Unlike an open soil compactor, the front drum sits UNDER the sloping front hood
 * & translucent HDPE water tank, while the rear drum sits UNDER the operator deck!
 * - Front sloped hood covers front drum, with leading drum lip and scrapers underneath
 * - Flush curb-clearance side fork for compaction flush against vertical curbs
 * - Agile central articulation joint with single hydraulic steering cylinder
 * - Open operator deck with weather-proof suspension seat, steering pedestal
 * - Yellow tubular ROPS roll-over bar over rear with central amber strobe beacon
 * ============================================================================
 */
export function renderCompactSidewalkRoller(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, nightAlpha, fc, rc } = vCtx;
  const bodyColor = car.color || '#f97316'; // Hamm Orange / Ammann Yellow
  const gamma = car.steerAngle || 0;
  const isLightsOn = car.headlightsOn || (nightAlpha > 0.05 && !car.isParked);
  const isReversing = isVehicleReverseGearActive(car);
  const isBraking = car.brakeLightsOn && !isReversing;
  const dmg = car.damage;
  const fLampsBroken = dmg ? (dmg.leftHeadlightBroken || dmg.rightHeadlightBroken) : false;
  const rLampsBroken = dmg ? (dmg.leftTaillightBroken || dmg.rightTaillightBroken) : false;

  const halfGamma = gamma / 2;
  const cosF = Math.cos(halfGamma);
  const sinF = Math.sin(halfGamma);
  const cosR = Math.cos(-halfGamma);
  const sinR = Math.sin(-halfGamma);

  const drumW = halfW * 1.88;
  const drumL = halfL * 0.58;

  // Deformation deltas
  const fDef = fc ? (halfL - fc) : 0;
  const rDef = rc ? (rc - (-halfL)) : 0;

  // --- A. CENTRAL ARTICULATION JOINT (JOINT PIN AT 0, 0) ---
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();

  const flX = 6 * cosF - (-4) * sinF;
  const flY = 6 * sinF + (-4) * cosF;
  const rlX = -6 * cosR - (-4) * sinR;
  const rlY = -6 * sinR + (-4) * cosR;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(rlX, rlY);
  ctx.lineTo((flX + rlX) / 2, (flY + rlY) / 2);
  ctx.stroke();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo((flX + rlX) / 2, (flY + rlY) / 2);
  ctx.lineTo(flX, flY);
  ctx.stroke();

  // --- B. FRONT MODULE (FRONT DRUM UNDER SLOPED HOOD & WATER TANK - PIVOTS BY +HALF_GAMMA) ---
  ctx.save();
  ctx.rotate(halfGamma);

  const fDrumCenter = halfL * 0.60 - fDef * 0.4;
  // Drum mounted under chassis
  drawAsphaltRollerDrumUnderFrame(ctx, fDrumCenter, drumL, drumW, true);

  // Single-sided curb-clearance fork (flush on right side for curb rolling)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(fDrumCenter - drumL / 2, -drumW / 2, drumL, 2.0);
  ctx.fillRect(fDrumCenter - drumL / 2, drumW / 2 - 2.0, drumL, 2.0);

  // Front bumper lip
  const fBumpX = (halfL - fDef) - 1.8;
  const fBumpW = drumW - 3.0;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fBumpX - 1.5, -fBumpW / 2, 2.5, fBumpW);

  // Front sloped hood & integrated water tank covering the drum
  const hoodX1 = 2;
  const hoodX2 = fBumpX - 1.0;
  const hoodW = halfW * 1.52;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(hoodX1, -hoodW / 2, hoodX2 - hoodX1, hoodW);
  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(hoodX1, -hoodW / 2, hoodX2 - hoodX1, hoodW);

  // Translucent white HDPE water tank with blue filling cap
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(hoodX1 + 1.5, -hoodW * 0.35, Math.max(2, (hoodX2 - hoodX1) * 0.45), hoodW * 0.70);
  drawWaterTankCap(ctx, hoodX1 + (hoodX2 - hoodX1) * 0.22, 0, 1.8);

  // Forward worklight (affected by broken lamp damage)
  const isFrontLightWorking = isLightsOn && !fLampsBroken;
  drawWorkFloodlight(ctx, hoodX2 - 1, 0, 2.8, 1.8, isFrontLightWorking);

  // Front Turn signals
  const isTurnLeft = (car.turnSignal === 'left' || car.turnSignal === 'hazard') && Math.floor(Date.now() / 400) % 2 === 0;
  const isTurnRight = (car.turnSignal === 'right' || car.turnSignal === 'hazard') && Math.floor(Date.now() / 400) % 2 === 0;
  if (isTurnLeft) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(hoodX2 - 1.5, -hoodW / 2, 1.8, 2.0);
  }
  if (isTurnRight) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(hoodX2 - 1.5, hoodW / 2 - 2.0, 1.8, 2.0);
  }

  // Front module scratches
  if (dmg && dmg.scratches && dmg.scratches.length > 0) {
    for (const sc of dmg.scratches) {
      if (sc.x > 0) {
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 2, 0);
        ctx.lineTo(sc.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.restore();

  // --- C. REAR MODULE (REAR DRUM UNDER OPERATOR PLATFORM & ROPS BAR - PIVOTS BY -HALF_GAMMA) ---
  ctx.save();
  ctx.rotate(-halfGamma);
  const rDrumCenter = -halfL * 0.60 + rDef * 0.4;
  // Drum mounted under operator deck
  drawAsphaltRollerDrumUnderFrame(ctx, rDrumCenter, drumL, drumW, false);

  // Rear curb-clearance forks
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(rDrumCenter - drumL / 2, -drumW / 2, drumL, 2.0);
  ctx.fillRect(rDrumCenter - drumL / 2, drumW / 2 - 2.0, drumL, 2.0);

  // Rear bumper lip with taillights
  const rBumpX = -halfL + rDef + 1.8;
  const rBumpW = drumW - 3.0;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(rBumpX - 1.0, -rBumpW / 2, 2.5, rBumpW);

  const drawCompactRearLight = (ly: number, isLeft: boolean) => {
    const isSignalActive = (isLeft ? isTurnLeft : isTurnRight);
    if (isSignalActive) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(rBumpX - 0.8, ly - 0.8, 1.6, 1.6);
      return;
    }
    if (rLampsBroken) {
      ctx.fillStyle = '#3f1111';
      ctx.fillRect(rBumpX - 0.8, ly - 0.8, 1.6, 1.6);
      return;
    }
    if (isReversing) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rBumpX - 0.8, ly - 0.8, 1.6, 1.6);
    } else if (isBraking) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rBumpX - 0.8, ly - 0.8, 1.6, 1.6);
    } else if (isLightsOn) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rBumpX - 0.8, ly - 0.8, 1.6, 1.6);
    } else {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(rBumpX - 0.8, ly - 0.8, 1.6, 1.6);
    }
  };
  drawCompactRearLight(-rBumpW * 0.38, true);
  drawCompactRearLight(rBumpW * 0.38, false);

  // Open Operator Station Platform covering the rear drum
  const opX1 = rBumpX + 1.5;
  const opX2 = -2;
  const opW = halfW * 1.56;

  drawDiamondPlate(ctx, opX1, -opW / 2, opX2 - opX1, opW, '#1e293b');

  // Ergonomic vinyl weather-proof seat with rain drain slot
  const seatX = (opX1 + opX2) / 2 - 1;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(seatX - 2.2, -2.6, 4.4, 5.2);
  ctx.fillStyle = '#334155';
  ctx.fillRect(seatX - 1.6, -2.0, 3.2, 4.0);
  ctx.fillStyle = '#090d16';
  ctx.fillRect(seatX - 1.2, -0.4, 2.4, 0.8);

  // Steering console pedestal & wheel
  const steerX = opX2 - 1.8;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(steerX - 1.5, -1.8, 2.2, 3.6);
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(steerX, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Tubular ROPS bar across rear with amber strobe beacon
  const ropsX = opX1 + 1.2;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(ropsX - 1.2, -opW / 2 - 0.8, 2.4, opW + 1.6);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(ropsX - 0.6, -opW / 2 - 0.4, 1.2, opW + 0.8);

  drawAmberBeacon(ctx, ropsX, 0, 1.8);
  drawWorkFloodlight(ctx, ropsX - 0.5, opW * 0.32, 2.4, 1.6, isLightsOn && !rLampsBroken, Math.PI);

  // Rear module scratches
  if (dmg && dmg.scratches && dmg.scratches.length > 0) {
    for (const sc of dmg.scratches) {
      if (sc.x <= 0) {
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 2, 0);
        ctx.lineTo(sc.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

export function renderPneumaticRoller(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, nightAlpha, fc, rc } = vCtx;
  const bodyColor = car.color || '#ea580c'; // Bomag Orange / Dynapac Yellow
  const gamma = car.steerAngle || 0;
  const isLightsOn = car.headlightsOn || (nightAlpha > 0.05 && !car.isParked);
  const isReversing = isVehicleReverseGearActive(car);
  const isBraking = car.brakeLightsOn && !isReversing;
  const dmg = car.damage;
  const fLampsBroken = dmg ? (dmg.leftHeadlightBroken || dmg.rightHeadlightBroken) : false;
  const rLampsBroken = dmg ? (dmg.leftTaillightBroken || dmg.rightTaillightBroken) : false;

  const halfGamma = gamma / 2;
  const cosF = Math.cos(halfGamma);
  const sinF = Math.sin(halfGamma);
  const cosR = Math.cos(-halfGamma);
  const sinR = Math.sin(-halfGamma);

  // Deformation deltas
  const fDef = fc ? (halfL - fc) : 0;
  const rDef = rc ? (rc - (-halfL)) : 0;

  // --- A. CENTRAL ARTICULATION JOINT (JOINT PIN AT 0, 0) ---
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
  ctx.fill();

  const flX = 8 * cosF - (-5.5) * sinF;
  const flY = 8 * sinF + (-5.5) * cosF;
  const rlX = -8 * cosR - (-5.5) * sinR;
  const rlY = -8 * sinR + (-5.5) * cosR;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(rlX, rlY);
  ctx.lineTo((flX + rlX) / 2, (flY + rlY) / 2);
  ctx.stroke();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo((flX + rlX) / 2, (flY + rlY) / 2);
  ctx.lineTo(flX, flY);
  ctx.stroke();

  const frX = 8 * cosF - 5.5 * sinF;
  const frY = 8 * sinF + 5.5 * cosF;
  const rrX = -8 * cosR - 5.5 * sinR;
  const rrY = -8 * sinR + 5.5 * cosR;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(rrX, rrY);
  ctx.lineTo((frX + rrX) / 2, (frY + rrY) / 2);
  ctx.stroke();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo((frX + rrX) / 2, (frY + rrY) / 2);
  ctx.lineTo(frX, frY);
  ctx.stroke();

  // --- B. FRONT MODULE (SMOOTH SLICK COMPACTOR TIRES UNDER BALLAST BODY - PIVOTS BY +HALF_GAMMA) ---
  ctx.save();
  ctx.rotate(halfGamma);

  const fTireX1 = halfL * 0.40 - fDef * 0.3;
  const fTireL = halfL * 0.54;
  const tireCount = 4;
  const tireTotalW = halfW * 1.90;
  const tireW = tireTotalW / tireCount - 1.2;
  const tireGap = 1.2;

  // Front 4 Smooth Compactor Tires under chassis
  for (let i = 0; i < tireCount; i++) {
    const ty = -tireTotalW / 2 + i * (tireW + tireGap) + tireW / 2;

    const tireGrad = ctx.createLinearGradient(fTireX1, 0, fTireX1 + fTireL, 0);
    tireGrad.addColorStop(0.0, '#090d16');
    tireGrad.addColorStop(0.2, '#1e293b');
    tireGrad.addColorStop(0.5, '#475569');
    tireGrad.addColorStop(0.8, '#1e293b');
    tireGrad.addColorStop(1.0, '#090d16');

    ctx.fillStyle = tireGrad;
    ctx.fillRect(fTireX1, ty - tireW / 2, fTireL, tireW);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(fTireX1, ty - tireW / 2, fTireL, 0.8);
    ctx.fillRect(fTireX1, ty + tireW / 2 - 0.8, fTireL, 0.8);
  }

  // Thermal apron / skirt bar across tires
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fTireX1 - 2.0, -tireTotalW / 2 - 1, 2.2, tireTotalW + 2);

  // Front Ballast Compartment Body (накрывает шины сверху)
  const fBodyX1 = 2;
  const fBodyX2 = (halfL - fDef) - 2;
  const fBodyW = halfW * 1.86;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(fBodyX1, -fBodyW / 2, fBodyX2 - fBodyX1, fBodyW);
  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(fBodyX1, -fBodyW / 2, fBodyX2 - fBodyX1, fBodyW);

  // Ballast hatches
  ctx.fillStyle = '#9a3412';
  ctx.fillRect(fBodyX1 + 2, -fBodyW * 0.35, 6, fBodyW * 0.70);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(fBodyX1 + 4.5, -fBodyW * 0.15, 1.2, 4);

  // Water/emulsion spray tank cap
  drawWaterTankCap(ctx, fBodyX2 - 5, 0, 2.2);

  // Front worklights
  const isFrontLightWorking = isLightsOn && !fLampsBroken;
  drawWorkFloodlight(ctx, fBodyX2 - 1, -fBodyW * 0.42, 3.0, 2.0, isFrontLightWorking);
  drawWorkFloodlight(ctx, fBodyX2 - 1, fBodyW * 0.42, 3.0, 2.0, isFrontLightWorking);

  // Turn signals
  const isTurnLeft = (car.turnSignal === 'left' || car.turnSignal === 'hazard') && Math.floor(Date.now() / 400) % 2 === 0;
  const isTurnRight = (car.turnSignal === 'right' || car.turnSignal === 'hazard') && Math.floor(Date.now() / 400) % 2 === 0;
  if (isTurnLeft) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(fBodyX2 - 1.5, -fBodyW * 0.48, 2.0, 2.4);
  }
  if (isTurnRight) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(fBodyX2 - 1.5, fBodyW * 0.48 - 2.4, 2.0, 2.4);
  }

  // Front scratches
  if (dmg && dmg.scratches && dmg.scratches.length > 0) {
    for (const sc of dmg.scratches) {
      if (sc.x > 0) {
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 2, 0);
        ctx.lineTo(sc.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.restore();

  // --- C. REAR MODULE (STAGGERED COMPACTOR TIRES UNDER REAR BALLAST & CABIN - PIVOTS BY -HALF_GAMMA) ---
  ctx.save();
  ctx.rotate(-halfGamma);
  const rTireX1 = -halfL * 0.94 + rDef * 0.3;
  const rTireL = halfL * 0.54;

  // Rear 4 Smooth Compactor Tires, STAGGERED for 100% road coverage
  const rTireOffset = (tireW + tireGap) * 0.5;
  for (let i = 0; i < tireCount; i++) {
    const ty = -tireTotalW / 2 + rTireOffset + i * (tireW + tireGap) - (rTireOffset * 0.5);

    const tireGrad = ctx.createLinearGradient(rTireX1, 0, rTireX1 + rTireL, 0);
    tireGrad.addColorStop(0.0, '#090d16');
    tireGrad.addColorStop(0.2, '#1e293b');
    tireGrad.addColorStop(0.5, '#475569');
    tireGrad.addColorStop(0.8, '#1e293b');
    tireGrad.addColorStop(1.0, '#090d16');

    ctx.fillStyle = tireGrad;
    ctx.fillRect(rTireX1, ty - tireW / 2, rTireL, tireW);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(rTireX1, ty - tireW / 2, rTireL, 0.8);
    ctx.fillRect(rTireX1, ty + tireW / 2 - 0.8, rTireL, 0.8);
  }

  // Thermal apron bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(rTireX1 + rTireL, -tireTotalW / 2 - 1, 2.2, tireTotalW + 2);

  // Rear Ballast & Engine Body
  const rBodyX1 = -halfL + rDef + 2;
  const rBodyX2 = -2;
  const rBodyW = halfW * 1.86;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(rBodyX1, -rBodyW / 2, rBodyX2 - rBodyX1, rBodyW);
  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(rBodyX1, -rBodyW / 2, rBodyX2 - rBodyX1, rBodyW);

  // Diamond-plate service walkway
  drawDiamondPlate(ctx, rBodyX1 + 4, -4, rBodyX2 - rBodyX1 - 8, 8, '#334155');

  // Engine exhaust stack
  const exX = rBodyX1 + 7;
  const exY = -rBodyW * 0.35;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(exX, exY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Air cleaner
  const airX = rBodyX1 + 7;
  const airY = rBodyW * 0.35;
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(airX, airY, 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Dual Operator Cabin covering rear section
  const cabX1 = rBodyX1 + 10;
  const cabX2 = rBodyX2 - 2;
  const cabW = rBodyW * 0.88;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(cabX1, -cabW / 2, cabX2 - cabX1, cabW);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.fillRect(cabX1 + 1, -cabW / 2 + 1, cabX2 - cabX1 - 2, cabW - 2);

  // Dual steering consoles & seats (left and right for curb edge viewing)
  const seatX = (cabX1 + cabX2) / 2;
  const drawPneumaticStation = (sy: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(seatX - 2.5, sy - 2.2, 5.0, 4.4);
    ctx.fillStyle = '#334155';
    ctx.fillRect(seatX - 2.0, sy - 1.8, 4.0, 3.6);
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(seatX + 2.0, sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  };
  drawPneumaticStation(-cabW * 0.28);
  drawPneumaticStation(cabW * 0.28);

  // Roof cap with amber beacon
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cabX1 + 1.5, -cabW / 2 + 1.5, cabX2 - cabX1 - 3.0, cabW - 3.0);
  drawAmberBeacon(ctx, seatX, 0, 2.0);

  drawWorkFloodlight(ctx, cabX2 - 0.5, -cabW / 2 + 1.2, 2.6, 1.8, isLightsOn, 0.2);
  drawWorkFloodlight(ctx, cabX2 - 0.5, cabW / 2 - 1.2, 2.6, 1.8, isLightsOn, -0.2);

  // Rear warning taillights
  const rLampX = rBodyX1;
  const drawPneumaticRearLight = (ly: number, isLeft: boolean) => {
    const isSignalActive = (isLeft ? isTurnLeft : isTurnRight);
    if (isSignalActive) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(rLampX, ly - 1, 1.6, 2);
      return;
    }
    if (rLampsBroken) {
      ctx.fillStyle = '#3f1111';
      ctx.fillRect(rLampX, ly - 1, 1.6, 2);
      return;
    }
    if (isReversing) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rLampX, ly - 1, 1.6, 2);
    } else if (isBraking) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rLampX, ly - 1, 1.6, 2);
    } else if (isLightsOn) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rLampX, ly - 1, 1.6, 2);
    } else {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(rLampX, ly - 1, 1.6, 2);
    }
  };
  drawPneumaticRearLight(-tireTotalW * 0.42, true);
  drawPneumaticRearLight(tireTotalW * 0.42, false);

  // Rear module scratches
  if (dmg && dmg.scratches && dmg.scratches.length > 0) {
    for (const sc of dmg.scratches) {
      if (sc.x <= 0) {
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 2, 0);
        ctx.lineTo(sc.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

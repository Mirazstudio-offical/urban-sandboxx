import type { VehicleRenderContext } from './vehicleArchetypes';
import { ensureExcavatorState, getExcavatorGeometry } from './excavatorSystem';
import { getVehicleTurnSignalDynamicState } from './vehicleHelpers';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function drawAmberBeacon(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean, radius = 1.9): void {
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, radius + 0.65, 0, Math.PI * 2);
  ctx.fill();

  if (active) {
    const grad = ctx.createRadialGradient(x, y, 0.2, x, y, radius);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.55, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = '#92400e';
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (active) {
    const pulse = 0.45 + Math.sin(Date.now() * 0.012) * 0.55;
    ctx.fillStyle = `rgba(245, 158, 11, ${(0.34 * pulse).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDualTireAssembly(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  steerAngle: number,
  isLeftSide: boolean
): void {
  ctx.save();
  ctx.translate(cx, cy);
  if (Math.abs(steerAngle) > 0.001) {
    ctx.rotate(steerAngle);
  }

  const rL = 5.0; // 9.00-20 wheel outer diameter ~10px (~1.0m)
  const singleW = 2.45;
  const dualGap = 0.55;

  const drawSingle = (yOff: number, isOuter: boolean) => {
    const y0 = yOff - singleW * 0.5;
    // Rubber carcass
    ctx.fillStyle = '#0b0f17';
    ctx.beginPath();
    ctx.roundRect(-rL, y0, rL * 2, singleW, 0.9);
    ctx.fill();

    // Crown tread surface
    ctx.fillStyle = '#18202c';
    ctx.fillRect(-rL + 0.5, y0 + 0.3, rL * 2 - 1.0, singleW - 0.6);

    // Heavy offroad chevron tread blocks (9.00-20 И-111А / ВФ-166)
    ctx.strokeStyle = '#070a0f';
    ctx.lineWidth = 0.85;
    for (let tx = -rL + 1.3; tx <= rL - 1.3; tx += 1.95) {
      ctx.beginPath();
      ctx.moveTo(tx - 0.5, y0 + 0.15);
      ctx.lineTo(tx + 0.55, yOff);
      ctx.lineTo(tx - 0.5, y0 + singleW - 0.15);
      ctx.stroke();
    }

    // Planetary wheel reducer hub on outer wheel face
    if (isOuter) {
      const faceY = isLeftSide ? y0 - 0.35 : y0 + singleW - 0.25;
      ctx.fillStyle = '#334155';
      ctx.fillRect(-1.7, faceY, 3.4, 0.6);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-0.8, faceY + (isLeftSide ? -0.25 : 0.25), 1.6, 0.45);
    }
  };

  // Outer & Inner twin tires straddling cy
  const outerOffset = isLeftSide ? -(singleW * 0.5 + dualGap * 0.5) : (singleW * 0.5 + dualGap * 0.5);
  const innerOffset = -outerOffset;
  drawSingle(outerOffset, true);
  drawSingle(innerOffset, false);

  // Inner spacer ring visible in dual gap
  ctx.fillStyle = '#334155';
  ctx.fillRect(-1.4, -dualGap * 0.5 - 0.1, 2.8, dualGap + 0.2);

  ctx.restore();
}

export function renderExcavatorEK12(vCtx: VehicleRenderContext): void {
  const { ctx, car, halfL, halfW, renderLayer } = vCtx;
  ensureExcavatorState(car);
  const geom = getExcavatorGeometry(car);

  const drawChassis = !renderLayer || renderLayer === 'chassis' || renderLayer === 'both';
  const drawUpper = !renderLayer || renderLayer === 'upper' || renderLayer === 'both';

  const bodyPaint = car.color || '#d99b1e';
  const roofPaint = car.roofColor || '#f1f5f9';
  const isEngineRunning = !!car.engineState?.engineRunning;
  const isIgnitionOn = !!(isEngineRunning || car.engineState?.ignition || car.positionLightsOn || car.headlightsOn);
  const isBraking = !!car.brakeLightsOn;
  const isTailOn = !!(car.headlightsOn || car.positionLightsOn);
  const turnDyn = getVehicleTurnSignalDynamicState(car);

  const bladePos = clamp01(geom.bladePos);
  const outPos = clamp01(geom.outriggersPos);
  const contacts = car.exOutriggersContact || [false, false, false];

  const frontAxleX = halfL * 0.57; // ~ +13.96px
  const rearAxleX = -halfL * 0.57; // ~ -13.96px

  // =========================================================================
  // PASS 1: UNDERCARRIAGE, 8 DUAL 9.00-20 TIRES, BLADE & OUTRIGGER STABILIZERS
  // =========================================================================
  if (drawChassis) {
    ctx.save();

    // 1. Undercarriage Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.roundRect(-halfL - 1.5, -halfW - 0.5, halfL * 2 + 4.5, halfW * 2 + 1.0, 4);
    ctx.fill();

    // 2. Dual 9.00-20 Tire Pairs (front steered + rear fixed drive axles)
    const wheelCenterY = halfW - 3.0; // Outer face sits right inside 2500mm width (halfW=12.5)
    const steer = Math.max(-0.58, Math.min(0.58, car.steerAngle || 0));
    drawDualTireAssembly(ctx, frontAxleX, -wheelCenterY, steer, true);
    drawDualTireAssembly(ctx, frontAxleX, wheelCenterY, steer, false);
    drawDualTireAssembly(ctx, rearAxleX, -wheelCenterY, 0, true);
    drawDualTireAssembly(ctx, rearAxleX, wheelCenterY, 0, false);

    // 3. Heavy Welded Undercarriage Box Frame (Нижняя рама ЕК-12)
    // Front & rear axle housings + planetary axle tubes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(frontAxleX - 1.5, -wheelCenterY + 2.2, 3.0, (wheelCenterY - 2.2) * 2);
    ctx.fillRect(rearAxleX - 1.6, -wheelCenterY + 2.2, 3.2, (wheelCenterY - 2.2) * 2);
    // Differential pumpkins
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(frontAxleX, 0, 2.7, 0, Math.PI * 2);
    ctx.arc(rearAxleX, 0, 2.9, 0, Math.PI * 2);
    ctx.fill();

    // Front steering tie-rod & oscillation lock hydraulic cylinders
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(frontAxleX - 1.9, -6.4);
    ctx.lineTo(frontAxleX - 1.9, 6.4);
    ctx.stroke();
    // Front axle oscillation stabilizer lock cylinders (гидроцилиндры блокировки балансира переднего моста)
    [-5.6, 5.6].forEach((ly) => {
      ctx.fillStyle = car.exAxleOscillationLocked ? '#d97706' : '#334155';
      ctx.fillRect(frontAxleX - 3.8, ly - 0.7, 2.2, 1.4);
    });

    // Main H-frame longitudinal box rails & center cross-pedestal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-halfL + 2.0, -6.2, halfL * 2 - 4.5, 12.4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfL + 2.8, -3.8, halfL * 2 - 6.0, 7.6);
    // Center hydrostatic transfer box & longitudinal driveshafts
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rearAxleX + 2.0, 0);
    ctx.lineTo(frontAxleX - 2.0, 0);
    ctx.stroke();

    // Heavy side undercarriage mudguards & boarding step rails
    [-1, 1].forEach((side) => {
      const sy = side < 0 ? -halfW + 0.6 : halfW - 4.0;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-halfL + 4.5, sy, halfL * 1.45, 3.4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-halfL + 4.5, sy, halfL * 1.45, 3.4);
    });

    // 4. Front 2500mm Hydraulic Bulldozer Blade (Отвал передний)
    const bladeX = halfL + 4.1 - bladePos * 1.5; // Tuck closer/lower to grade when pressed down
    const bladeW = halfW * 2 + 1.0; // 2500mm full coverage (~26px)
    const bladeHalfW = bladeW * 0.5;
    const bladeElevOffset = (1 - bladePos) * 2.2;

    // Blade ground shadow (shrinks cleanly as blade contacts ground)
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.34 - bladePos * 0.14).toFixed(2)})`;
    ctx.fillRect(bladeX - 1.2 + bladeElevOffset, -bladeHalfW + 0.5, 3.4, bladeW - 1.0);

    // Twin push-beams connecting front axle frame to blade back
    [-6.6, 6.6].forEach((py) => {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(frontAxleX - 1.0, py * 0.85);
      ctx.lineTo(bladeX - 1.2, py);
      ctx.stroke();

      // Blade lift hydraulic cylinder & chrome rod
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(frontAxleX + 1.6, py * 0.68);
      ctx.lineTo(bladeX - 3.6 + bladePos * 1.0, py * 0.72);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(bladeX - 3.6 + bladePos * 1.0, py * 0.72);
      ctx.lineTo(bladeX - 0.8, py * 0.74);
      ctx.stroke();
    });

    // Main curved moldboard (основной щит отвала)
    ctx.fillStyle = bodyPaint;
    ctx.beginPath();
    ctx.roundRect(bladeX - 1.8, -bladeHalfW, 3.4, bladeW, 0.8);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Ribbed back stiffeners on moldboard
    ctx.fillStyle = '#1e293b';
    [-8.5, -3.5, 3.5, 8.5].forEach((ry) => {
      ctx.fillRect(bladeX - 1.9, ry - 0.5, 1.8, 1.0);
    });

    // Hardened steel cutting edge (съемный нож отвала)
    ctx.fillStyle = contacts[2] ? '#cbd5e1' : '#64748b';
    ctx.fillRect(bladeX + 1.1, -bladeHalfW + 0.3, 0.9, bladeW - 0.6);

    // Corner yellow/black hazard tips on 2500mm dozer wings
    [-bladeHalfW + 0.4, bladeHalfW - 2.4].forEach((wy) => {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bladeX - 1.4, wy, 2.4, 2.0);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bladeX - 1.0, wy + 0.5, 1.6, 0.8);
    });

    // 5. Rear Hinged Hydraulic Outrigger Stabilizers (Задние откидные опоры)
    const outMountX = -halfL + 3.8;
    const outMountY = 7.4;
    // Rear undercarriage cross-beam carrying the outriggers & rear travel lights
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-halfL + 1.4, -outMountY - 1.6, 4.4, (outMountY + 1.6) * 2);

    // Rear road travel lights (red tail/brake + amber turn) on undercarriage rear apron
    const tailCol = isBraking ? '#ef4444' : isTailOn ? '#dc2626' : '#7f1d1d';
    const leftTurnLit = turnDyn.intensity > 0.1 && (car.turnSignal === 'left' || car.turnSignal === 'hazard');
    const rightTurnLit = turnDyn.intensity > 0.1 && (car.turnSignal === 'right' || car.turnSignal === 'hazard');
    [-5.4, 3.6].forEach((ly, idx) => {
      ctx.fillStyle = '#090d14';
      ctx.fillRect(-halfL + 0.8, ly, 1.0, 2.2);
      ctx.fillStyle = tailCol;
      ctx.fillRect(-halfL + 0.8, ly + 0.2, 0.8, 1.0);
      const isLeftSide = idx === 0;
      const tLit = isLeftSide ? leftTurnLit : rightTurnLit;
      ctx.fillStyle = tLit ? '#fbbf24' : '#78350f';
      ctx.fillRect(-halfL + 0.8, ly + 1.3, 0.8, 0.7);
    });

    [-1, 1].forEach((side, idx) => {
      const hingeY = side * outMountY;
      // Hinged outrigger arm unfolds rearward & outward smoothly with outPos (0..1)
      const padX = outMountX - 3.6 - outPos * 2.8;
      const padY = side * (8.4 + outPos * 4.4);
      const isPlanted = contacts[idx];

      // Ground pressure ring when planted
      if (isPlanted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.fillRect(padX - 2.6, padY - 2.3, 5.2, 4.6);
      }

      // Stabilizer arm weldment
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(outMountX, hingeY);
      ctx.lineTo(padX, padY);
      ctx.stroke();

      // Hydraulic ram cylinder
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(outMountX + 1.4, hingeY * 0.72);
      ctx.lineTo(outMountX + (padX - outMountX) * 0.55, hingeY * 0.72 + (padY - hingeY * 0.72) * 0.55);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(outMountX + (padX - outMountX) * 0.55, hingeY * 0.72 + (padY - hingeY * 0.72) * 0.55);
      ctx.lineTo(padX, padY);
      ctx.stroke();

      // Wide hinged steel stabilizer pad
      ctx.fillStyle = isPlanted ? '#334155' : '#475569';
      ctx.beginPath();
      ctx.roundRect(padX - 2.2, padY - 2.0, 4.4, 4.0, 0.6);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Ribbed tread + warning yellow cap on footpad
      ctx.fillStyle = '#eab308';
      ctx.fillRect(padX - 1.6, padY - 0.5, 3.2, 1.0);
    });

    // 6. Central Slewing Ring Bearing (ОПУ) at (geom.turretLocalX, 0)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(geom.turretLocalX, 0, 6.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(geom.turretLocalX, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    // Brass central rotary hydraulic manifold union
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(geom.turretLocalX, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // PASS 2: 360° REVOLVING UPPER HOUSE, CAB, ENGINE BAY & ARTICULATED BOOM/STICK/BUCKET
  // =========================================================================
  if (drawUpper) {
    ctx.save();
    ctx.translate(geom.turretLocalX, geom.turretLocalY);
    ctx.rotate(geom.turretAngle);

    // 1. Turntable House Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.roundRect(-19.8, -11.4, 28.0, 23.8, 3.5);
    ctx.fill();

    // 2. Main Upper Platform Deck + Cast Counterweight (Задний противовес 2150мм)
    ctx.fillStyle = bodyPaint;
    ctx.beginPath();
    ctx.moveTo(7.4, -10.8);
    ctx.lineTo(-14.2, -10.8);
    ctx.quadraticCurveTo(-19.8, -10.2, -20.2, 0);
    ctx.quadraticCurveTo(-19.8, 10.2, -14.2, 10.8);
    ctx.lineTo(7.4, 10.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Heavy dark cast iron Counterweight Skirt at rear (-20.2 .. -12.6)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-12.6, -10.6);
    ctx.lineTo(-14.2, -10.6);
    ctx.quadraticCurveTo(-19.6, -10.0, -20.0, 0);
    ctx.quadraticCurveTo(-19.6, 10.0, -14.2, 10.6);
    ctx.lineTo(-12.6, 10.6);
    ctx.closePath();
    ctx.fill();

    // Diagonal hazard chevron trim along counterweight arc
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-15.5, -8.8);
    ctx.quadraticCurveTo(-19.1, 0, -15.5, 8.8);
    ctx.stroke();

    // Recessed towing / lifting lugs on counterweight
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-15.5, -6.4, 1.8, 2.2);
    ctx.fillRect(-15.5, 4.2, 1.8, 2.2);

    // 3. Engine Compartment Hood (ММЗ Д-245.12С) + Hydraulic Tank (Right Side / Rear Deck)
    // Engine bay raised cowling (center-right: x = -12.4 .. +2.0, y = -0.2 .. +10.2)
    ctx.fillStyle = bodyPaint;
    ctx.beginPath();
    ctx.roundRect(-12.4, -0.4, 14.2, 10.4, 1.4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Radiator cooling louvers & engine service hatch
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-11.4, 1.2, 5.2, 7.2);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.7;
    for (let lx = -10.8; lx <= -6.8; lx += 1.0) {
      ctx.beginPath();
      ctx.moveTo(lx, 1.8);
      ctx.lineTo(lx, 7.8);
      ctx.stroke();
    }

    // Diesel Exhaust Stack + Rain Flapper & Air Cyclone Pre-Cleaner
    const exhX = -8.4;
    const exhY = 2.8;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(exhX, exhY, 1.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(exhX, exhY, 0.8, 0, Math.PI * 2);
    ctx.fill();
    // Cyclone air intake cap
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-5.6, 5.6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Right-Side HLP-46 Hydraulic Reservoir & Valve Manifold Bank (200 L)
    ctx.fillStyle = '#334155';
    ctx.fillRect(-3.6, 5.4, 8.8, 4.8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-3.6, 5.4, 8.8, 4.8);
    // Hydraulic breather cap + sight strip
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(-1.8, 7.8, 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0.6, 9.3, 2.8, 0.5);

    // 4. Panoramic Operator Cab (Left Side y < 0: x = -7.4 .. +7.2, y = -10.8 .. -1.4)
    const cabX = -7.2;
    const cabY = -10.8;
    const cabL = 14.4;
    const cabW = 9.4;

    // Cab ROPS/FOPS outer steel frame
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cabX, cabY, cabL, cabW, 1.3);
    ctx.fill();

    // Cab interior floor & pilot joysticks (visible through panoramic roof skylight & glass!)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cabX + 0.9, cabY + 0.8, cabL - 2.4, cabW - 1.6);

    // Driver seat + twin pilot joysticks (visible before/through glass tint)
    ctx.fillStyle = '#334155';
    ctx.fillRect(cabX + 2.4, cabY + 2.2, 4.6, 5.0);
    ctx.fillStyle = '#090d14';
    ctx.beginPath();
    ctx.arc(cabX + 8.6, cabY + 2.5, 0.75, 0, Math.PI * 2);
    ctx.arc(cabX + 8.6, cabY + 6.9, 0.75, 0, Math.PI * 2);
    ctx.fill();
    // Operator hard-hat / head when player is inside cab
    if (car.isPlayerControlled) {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(cabX + 4.8, cabY + 4.7, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Windshield & side glazing tint
    ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
    ctx.fillRect(cabX + cabL - 3.6, cabY + 0.8, 2.9, cabW - 1.6); // Front glass
    ctx.fillRect(cabX + 1.0, cabY + 0.5, cabL - 3.2, 1.2); // Left door glass
    // Windshield wiper
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cabX + cabL - 3.3, cabY + 2.0);
    ctx.lineTo(cabX + cabL - 1.0, cabY + 5.8);
    ctx.stroke();

    // Characteristic Light Cab Roof Panel with Skylight Hatch (Белая/серая крыша кабины ТВЭКС)
    ctx.fillStyle = roofPaint;
    ctx.beginPath();
    ctx.roundRect(cabX + 0.8, cabY + 1.4, cabL - 4.4, cabW - 2.6, 0.9);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Panoramic roof skylight glass above joysticks
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(cabX + cabL - 7.4, cabY + 2.4, 3.2, cabW - 4.6);

    // Left cab rear-view mirror & side grab rail
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(cabX + cabL - 1.8, cabY);
    ctx.lineTo(cabX + cabL - 0.8, cabY - 2.0);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cabX + cabL - 2.0, cabY - 2.9, 2.2, 1.3);

    // Cab Roof Twin Halogen Work Floodlights (Фара рабочего света на кабине)
    const workLampLit = !!car.exWorkLightOn;
    [cabY + 2.0, cabY + cabW - 3.6].forEach((ly) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cabX + cabL - 4.1, ly, 1.4, 1.8);
      ctx.fillStyle = workLampLit ? '#fef08a' : '#64748b';
      ctx.fillRect(cabX + cabL - 3.2, ly + 0.2, 0.7, 1.4);
    });

    // Rotating Amber Beacon on cab rear-left roof corner
    drawAmberBeacon(ctx, cabX + 2.0, cabY + 2.0, isIgnitionOn, 1.75);

    // =========================================================================
    // 5. ARTICULATED DIGGING ARM (Monoboom 4.25m -> Stick 2.20m -> Bucket 0.65 m3)
    // =========================================================================
    const boomX0 = geom.boomStartLocalX; // +3.8
    const armY = geom.armMountOffsetY;   // +1.4 (mounted beside left cab)
    const boomX1 = boomX0 + geom.boomHorizPx;
    const stickX1 = boomX1 + geom.stickHorizPx;
    const bucketCurl = geom.bucketCurl;

    // Compute 2.5D arm drop shadow proportional to height above ground
    const shBoomOff = Math.max(1.0, geom.boomTipHeightM * 0.75);
    const shStickOff = Math.max(1.0, geom.stickTipHeightM * 0.75);
    const shBucketOff = Math.max(0.6, Math.max(0, geom.bucketHeightM) * 0.75);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(boomX0 + 1.0, armY + 1.5);
    ctx.lineTo(boomX1 + shBoomOff, armY + shBoomOff);
    ctx.lineTo(stickX1 + shStickOff, armY + shStickOff);
    ctx.lineTo(stickX1 + geom.bucketHorizPx + shBucketOff, armY + shBucketOff);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Boom Pivot Saddle & Twin Main Hoist Cylinders (Гидроцилиндры подъёма стрелы)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(boomX0 - 3.2, armY - 2.6, 5.4, 5.2);
    // Twin lift cylinder barrels flanking the boom foot
    [-2.0, 2.0].forEach((cyOff) => {
      const cylEndX = boomX0 + geom.boomHorizPx * 0.42;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(boomX0 - 1.2, armY + cyOff);
      ctx.lineTo(boomX0 + (cylEndX - boomX0) * 0.55, armY + cyOff * 0.78);
      ctx.stroke();

      ctx.strokeStyle = '#e2e8f0'; // Chrome piston rod
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(boomX0 + (cylEndX - boomX0) * 0.55, armY + cyOff * 0.78);
      ctx.lineTo(cylEndX, armY + cyOff * 0.56);
      ctx.stroke();
    });

    // Main Monoboom Box Weldment (Моноблочная изогнутая стрела)
    const boomLen = geom.boomHorizPx;
    ctx.fillStyle = bodyPaint;
    ctx.beginPath();
    ctx.moveTo(boomX0, armY - 1.9);
    ctx.lineTo(boomX0 + boomLen * 0.45, armY - 2.2); // Goose-neck knuckle ridge
    ctx.lineTo(boomX1, armY - 1.45);
    ctx.lineTo(boomX1, armY + 1.45);
    ctx.lineTo(boomX0 + boomLen * 0.45, armY + 2.2);
    ctx.lineTo(boomX0, armY + 1.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Boom top hydraulic steel tubes & work floodlight
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(boomX0 + 1.5, armY - 0.6);
    ctx.lineTo(boomX1 - 2.0, armY - 0.6);
    ctx.moveTo(boomX0 + 1.5, armY + 0.6);
    ctx.lineTo(boomX1 - 2.0, armY + 0.6);
    ctx.stroke();

    // Boom-mounted floodlight
    const boomLampX = boomX0 + boomLen * 0.52;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(boomLampX - 0.8, armY - 2.8, 1.5, 1.2);
    if (workLampLit) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(boomLampX + 0.3, armY - 2.6, 0.6, 0.8);
    }

    // Stick Hydraulic Cylinder on top of boom (Гидроцилиндр рукояти)
    const stickCylAnchorX = boomX0 + boomLen * 0.32;
    const stickCylTipX = boomX1 + 1.4;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(stickCylAnchorX, armY);
    ctx.lineTo((stickCylAnchorX + stickCylTipX) * 0.55, armY);
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo((stickCylAnchorX + stickCylTipX) * 0.55, armY);
    ctx.lineTo(stickCylTipX, armY);
    ctx.stroke();

    // Boom-Stick Pivot Pin
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(boomX1, armY, 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Stick / Dipper Arm (Рукоять 2.20 м)
    ctx.fillStyle = bodyPaint;
    ctx.beginPath();
    ctx.moveTo(boomX1 - 1.0, armY - 1.3);
    ctx.lineTo(stickX1, armY - 0.95);
    ctx.lineTo(stickX1, armY + 0.95);
    ctx.lineTo(boomX1 - 1.0, armY + 1.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Bucket Cylinder along top of Stick (Гидроцилиндр ковша + трапеция тяг)
    const bCylStart = boomX1 + geom.stickHorizPx * 0.14;
    const bCylEnd = stickX1 - 1.6;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(bCylStart, armY);
    ctx.lineTo((bCylStart + bCylEnd) * 0.58, armY);
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo((bCylStart + bCylEnd) * 0.58, armY);
    ctx.lineTo(stickX1 - 0.2, armY);
    ctx.stroke();

    // Stick-Bucket Pivot Pin & H-link
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(stickX1, armY, 1.15, 0, Math.PI * 2);
    ctx.fill();

    // 6. Reinforced 5-Tooth Backhoe Bucket 0.65 m3 (Ковш ЕК-12 с 5 зубьями и грунтом внутри)
    const bucketLen = geom.bucketHorizPx;
    const bucketW = 6.2; // ~0.95m width bucket
    const bucketVisualPitch = (bucketCurl - 0.4) * 0.35; // slight 2.5D yaw/extension feel
    ctx.save();
    ctx.translate(stickX1, armY);
    ctx.rotate(bucketVisualPitch * 0.18);

    // Bucket main steel shell
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(0.2, -bucketW * 0.5, bucketLen * 0.85, bucketW, 1.2);
    ctx.fill();
    ctx.strokeStyle = '#090d14';
    ctx.lineWidth = 0.95;
    ctx.stroke();

    // Wear-resistant side plates & rib strips
    ctx.fillStyle = '#334155';
    ctx.fillRect(0.6, -bucketW * 0.5, bucketLen * 0.72, 1.0);
    ctx.fillRect(0.6, bucketW * 0.5 - 1.0, bucketLen * 0.72, 1.0);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bucketLen * 0.35, -bucketW * 0.42);
    ctx.lineTo(bucketLen * 0.35, bucketW * 0.42);
    ctx.stroke();

    // Excavated earth/sand payload visibly heaped inside bucket bowl!
    const loadFrac = clamp01(car.exBucketLoad ?? 0);
    if (loadFrac > 0.04) {
      const matColor =
        car.exBucketMaterial === 'sand'
          ? '#eab308'
          : car.exBucketMaterial === 'mud'
          ? '#3b2b1a'
          : '#5c3f24';
      const matHighlight =
        car.exBucketMaterial === 'sand'
          ? '#fef08a'
          : '#785636';
      const fillR = (bucketW * 0.38) * (0.45 + 0.55 * loadFrac);
      ctx.fillStyle = matColor;
      ctx.beginPath();
      ctx.ellipse(bucketLen * 0.45, 0, Math.min(bucketLen * 0.38, fillR * 1.15), fillR, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = matHighlight;
      ctx.beginPath();
      ctx.ellipse(bucketLen * 0.38, -fillR * 0.25, fillR * 0.45, fillR * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cutting lip & 5 Forged Steel Bucket Teeth (5 зубьев ковша)
    const lipX = bucketLen * 0.82;
    ctx.fillStyle = '#475569';
    ctx.fillRect(lipX - 0.6, -bucketW * 0.48, 1.0, bucketW * 0.96);

    const teethCount = 5;
    for (let t = 0; t < teethCount; t++) {
      const ty = -bucketW * 0.40 + (t / (teethCount - 1)) * (bucketW * 0.80);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(lipX, ty - 0.52);
      ctx.lineTo(lipX + 1.85, ty - 0.22);
      ctx.lineTo(lipX + 1.85, ty + 0.22);
      ctx.lineTo(lipX, ty + 0.52);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }
}

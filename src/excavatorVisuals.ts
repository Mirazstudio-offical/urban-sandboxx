import type { Vehicle } from './types';
import type { VehicleRenderContext } from './vehicleArchetypes';
import { ensureExcavatorState, getExcavatorGeometry, EK12_EXHAUST_LOCAL } from './excavatorSystem';
import { getVehicleTurnSignalDynamicState } from './vehicleHelpers';
import { getCurrentSunShadowState } from './shadowSystem';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

// Beacon lens is ~0.2-0.25 m across on the real machine (1 m = 10 px), so radius stays ~1 px.
function drawAmberBeacon(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean, radius = 0.95): void {
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, radius + 0.35, 0, Math.PI * 2);
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
    ctx.fillStyle = `rgba(245, 158, 11, ${(0.24 * pulse).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.7, 0, Math.PI * 2);
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

  const rL = 5.5; // 10.00-20 wheel outer diameter ~11px (~1.1m)
  const singleW = 2.8; // ~280 mm section width (10.00-20 / 12.00-20 range)
  const dualGap = 0.4;

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
  const hasHeadlightsOn = !!car.headlightsOn;
  const isIgnitionOn = !!(isEngineRunning || car.engineState?.ignition || car.positionLightsOn || hasHeadlightsOn);
  const isBraking = !!car.brakeLightsOn;
  const isReversing = !!(car.isReversing || car.engineState?.currentGear === -1 || car.engineState?.autoGearMode === 'R');
  const isTailOn = !!(hasHeadlightsOn || car.positionLightsOn);
  const isRearFogOn = !!(car.rearFogLightsOn && (hasHeadlightsOn || isTailOn));
  const isFrontFogOn = !!car.frontFogLightsOn;
  const turnDyn = getVehicleTurnSignalDynamicState(car);
  const leftTurnLit = turnDyn.intensity > 0.1 && (car.turnSignal === 'left' || car.turnSignal === 'hazard');
  const rightTurnLit = turnDyn.intensity > 0.1 && (car.turnSignal === 'right' || car.turnSignal === 'hazard');
  const snowCoat = car.snowCoat ?? 0;
  const wetCoat = Math.max(car.wetCoatTimer ? Math.min(1, car.wetCoatTimer / 12) : 0, (car.waterDepth || 0) > 0.04 ? 0.9 : 0);
  const warmHoodFactor = Math.max(0, Math.min(1, ((car.engineTemp ?? 20) - 48) / 42));

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

    // Boarding steps / tool boxes sit BETWEEN the axles only, so they never cover the tires
    const wheelHalfLen = 5.5;
    const stepX0 = rearAxleX + wheelHalfLen + 1.0;
    const stepLen = frontAxleX - rearAxleX - (wheelHalfLen + 1.0) * 2;
    [-1, 1].forEach((side) => {
      const sy = side < 0 ? -halfW + 1.0 : halfW - 4.4;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(stepX0, sy, stepLen, 3.4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(stepX0, sy, stepLen, 3.4);
    });

    // 4. Front 2500mm Hydraulic Bulldozer Blade (Отвал передний)
    const bladeX = halfL + 1.0 - bladePos * 0.8; // Blade hangs right off the frame end; pressed down it tucks in
    const bladeW = halfW * 2 + 1.0; // 2500mm full coverage (~26px)
    const bladeHalfW = bladeW * 0.5;
    const bladeElevOffset = (1 - bladePos) * 2.2;

    // Blade ground shadow (shrinks cleanly as blade contacts ground)
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.34 - bladePos * 0.14).toFixed(2)})`;
    ctx.fillRect(bladeX - 1.2 + bladeElevOffset, -bladeHalfW + 0.5, 3.4, bladeW - 1.0);

    // Short twin push-arms (inboard of the wheels) connecting the frame to the blade back
    [-4.6, 4.6].forEach((py) => {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(frontAxleX + 2.0, py);
      ctx.lineTo(bladeX - 1.8, py);
      ctx.stroke();

      // Blade lift hydraulic cylinder & chrome rod (short, parallel to the push-arm)
      const cylY = py * 0.62;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(frontAxleX + 2.8, cylY);
      ctx.lineTo(bladeX - 3.6 + bladePos * 0.5, cylY);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(bladeX - 3.6 + bladePos * 0.5, cylY);
      ctx.lineTo(bladeX - 1.6, cylY);
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

    // Subtle snow ridge accumulating along top of front bulldozer moldboard
    if (snowCoat > 0.08) {
      ctx.fillStyle = `rgba(241, 245, 249, ${Math.min(0.75, snowCoat * 0.72).toFixed(3)})`;
      ctx.fillRect(bladeX - 1.5, -bladeHalfW + 1.0, 2.0, bladeW - 2.0);
    }

    // 5. Rear Hinged Hydraulic Outrigger Stabilizers (Задние откидные опоры)
    const outMountX = -halfL + 3.8;
    const outMountY = 7.4;
    // Rear undercarriage cross-beam carrying the outriggers (all lamps sit on the rotating upper house)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-halfL + 1.4, -outMountY - 1.6, 4.4, (outMountY + 1.6) * 2);

    // Outriggers move VERTICALLY: the arm stub and the cylinder stay put in plan view, only the
    // foot pad drops to the ground. Height is shown through the pad lift, scale and ground shadow.
    const chRelCam = (vCtx.cameraAngle ?? (car.angle || 0)) - (car.angle || 0);
    const chUpX = Math.cos(chRelCam);
    const chUpY = Math.sin(chRelCam);
    const LIFT_PX_PER_M = 4.2;
    const padHeightM = (1 - outPos) * 0.55; // stowed pad hangs ~0.55 m above grade
    const padLiftPx = padHeightM * LIFT_PX_PER_M;
    const padScale = 1 + padHeightM * 0.12;

    [-1, 1].forEach((side, idx) => {
      const hingeY = side * outMountY;
      const padX = -halfL + 0.6;
      const padY = side * 10.0;
      const isPlanted = contacts[idx];

      // Ground footprint of the pad: stays on the ground, darkens as the pad presses down
      ctx.fillStyle = `rgba(0, 0, 0, ${(isPlanted ? 0.42 : 0.14 + outPos * 0.16).toFixed(2)})`;
      ctx.fillRect(padX - 2.4, padY - 2.2, 4.8, 4.4);

      // Stabilizer arm weldment (fixed short stub from the rear cross-beam)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(outMountX, hingeY);
      ctx.lineTo(padX + 1.2, padY);
      ctx.stroke();

      // Foot pad (drops straight down; lifted along screen-up while stowed)
      const px = padX + chUpX * padLiftPx;
      const py = padY + chUpY * padLiftPx;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(padScale, padScale);
      ctx.fillStyle = isPlanted ? '#334155' : '#475569';
      ctx.beginPath();
      ctx.roundRect(-2.2, -2.0, 4.4, 4.0, 0.6);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Ribbed tread + warning yellow cap on footpad
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-1.6, -0.5, 3.2, 1.0);
      ctx.restore();

      // Vertical hydraulic cylinder seen from above: round barrel on the arm end, chrome rod inside
      const cx = padX + 1.2 + chUpX * 0.7 * LIFT_PX_PER_M;
      const cy = padY + chUpY * 0.7 * LIFT_PX_PER_M;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(cx, cy, 0.5, 0, Math.PI * 2);
      ctx.fill();
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
  // PASS 2: 360° REVOLVING UPPER HOUSE, CAB, ENGINE BAY & 2.5D ARTICULATED ARM
  // =========================================================================
  if (drawUpper) {
    ctx.save();
    ctx.translate(geom.turretLocalX, geom.turretLocalY);
    ctx.rotate(geom.turretAngle);

    // 2.5D screen-UP unit vector & solar shadow vector transformed into turret-local frame
    const relCam = (vCtx.cameraAngle ?? (car.angle || 0)) - geom.worldArmAngle;
    const upX = Math.cos(relCam);
    const upY = Math.sin(relCam);

    const sun = getCurrentSunShadowState();
    const cosA = Math.cos(geom.worldArmAngle);
    const sinA = Math.sin(geom.worldArmAngle);
    const shLocalX = cosA * sun.castX + sinA * sun.castY;
    const shLocalY = -sinA * sun.castX + cosA * sun.castY;
    const shadowHeightScale = 5.4; // Ground cast shadow offset px per meter of elevation

    const PX_PER_M = 10.0;
    const armY = geom.armMountOffsetY;

    // TOP-DOWN plan projection: a point is drawn exactly above its ground footprint (r, lat).
    // Height never shifts the sprite sideways (that read as a side view); it only gives a mild
    // width/scale cue, while the cast shadow below carries the real height information.
    const proj = (rM: number, latM: number, zM: number): { x: number; y: number; s: number; z: number } => {
      const s = Math.max(0.9, Math.min(1.18, 1.0 + zM * 0.03));
      return {
        x: rM * PX_PER_M,
        y: armY + latM * PX_PER_M,
        s,
        z: zM,
      };
    };

    const projShadow = (rM: number, latM: number, zM: number): { x: number; y: number } => {
      const h = Math.max(0, zM);
      return {
        x: rM * PX_PER_M + shLocalX * h * shadowHeightScale,
        y: armY + latM * PX_PER_M + shLocalY * h * shadowHeightScale,
      };
    };

    // -----------------------------------------------------------------------
    // 0. GROUND-PLANE CAST SHADOWS FOR ARM & EXCAVATED TRENCH PIT DEPTH RING
    // -----------------------------------------------------------------------
    const shBase = projShadow(geom.boomBaseR_m, 0, geom.boomBaseZ_m);
    const shKnee = projShadow(geom.boomKneeR_m, 0, geom.boomKneeZ_m);
    const shTip = projShadow(geom.boomTipR_m, 0, geom.boomTipZ_m);
    const shStick = projShadow(geom.stickTipR_m, 0, geom.stickTipZ_m);
    const shBucket = projShadow(geom.bucketMidR_m, 0, geom.bucketMidZ_m);

    // Excavated trench pit vignette on ground when bucket plunges below grade (z < -0.15m)
    const bucketGroundX = geom.bucketMidR_m * PX_PER_M;
    const bucketGroundY = armY;
    if (geom.bucketHeightM < -0.15) {
      const pitDepthNorm = Math.min(1, (-geom.bucketHeightM) / 3.8);
      const pitR = 6.5 + pitDepthNorm * 5.2;
      const pitGrad = ctx.createRadialGradient(
        bucketGroundX,
        bucketGroundY,
        1.2,
        bucketGroundX,
        bucketGroundY,
        pitR
      );
      pitGrad.addColorStop(0, `rgba(12, 8, 5, ${(0.62 + pitDepthNorm * 0.25).toFixed(2)})`);
      pitGrad.addColorStop(0.6, `rgba(38, 25, 14, ${(0.38 + pitDepthNorm * 0.2).toFixed(2)})`);
      pitGrad.addColorStop(1, 'rgba(38, 25, 14, 0)');
      ctx.fillStyle = pitGrad;
      ctx.beginPath();
      ctx.arc(bucketGroundX, bucketGroundY, pitR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp sun-projected ground shadow of boom, stick & bucket (separates clearly as arm rises!)
    const shadowAlpha = Math.max(0.14, Math.min(0.36, 0.34 * (1 - sun.ambientNightAlpha * 0.65)));
    ctx.save();
    ctx.strokeStyle = `rgba(5, 10, 18, ${shadowAlpha.toFixed(3)})`;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(shBase.x, shBase.y);
    ctx.lineTo(shKnee.x, shKnee.y);
    ctx.lineTo(shTip.x, shTip.y);
    ctx.stroke();

    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(shTip.x, shTip.y);
    ctx.lineTo(shStick.x, shStick.y);
    ctx.stroke();

    // Bucket shadow blob on ground
    const bShadowR = 4.2 + Math.max(0, geom.bucketHeightM) * 0.35;
    ctx.fillStyle = `rgba(5, 10, 18, ${(shadowAlpha * (geom.bucketHeightM < 0 ? 0.55 : 0.95)).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(shBucket.x, shBucket.y, bShadowR * 1.15, bShadowR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // -----------------------------------------------------------------------
    // 1. TURNTABLE HOUSE (with subtle 2.5D roof/body height lift)
    // -----------------------------------------------------------------------
    const bodyDark = shadeHex(bodyPaint, 0.68);
    const bodyBright = shadeHex(bodyPaint, 1.12);
    const houseLiftX = upX * 2.4;
    const houseLiftY = upY * 2.4;

    // Turntable House Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.roundRect(-19.8 + shLocalX * 5.0, -11.2 + shLocalY * 5.0, 28.0, 23.0, 3.8);
    ctx.fill();

    // Lower deck extrusion base (gives 2.5D side wall thickness to turntable & counterweight)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(7.4, -10.8);
    ctx.lineTo(-14.2, -10.8);
    ctx.quadraticCurveTo(-19.8, -10.2, -20.2, 0);
    ctx.quadraticCurveTo(-19.8, 10.2, -14.2, 10.8);
    ctx.lineTo(7.4, 10.8);
    ctx.closePath();
    ctx.fill();

    // Elevated upper deck + cast counterweight (shifted along screen-UP)
    ctx.save();
    ctx.translate(houseLiftX, houseLiftY);

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

    // Rear Counterweight Recessed Light Clusters (tail, brake, reverse, rear fog, amber turn)
    const rearTailCol = (isBraking || isRearFogOn) ? '#ef4444' : isTailOn ? '#dc2626' : '#7f1d1d';
    [-6.4, 6.4].forEach((ly, idx) => {
      const isLeftSide = idx === 0;
      const tLit = isLeftSide ? leftTurnLit : rightTurnLit;
      ctx.fillStyle = '#090d14';
      ctx.fillRect(-19.0, ly - 1.8, 1.4, 3.6);
      // Red tail / brake / rear-fog lens
      ctx.fillStyle = rearTailCol;
      ctx.fillRect(-18.8, ly - 1.5, 1.0, 1.3);
      if (isBraking || isRearFogOn) {
        ctx.fillStyle = '#fecaca';
        ctx.fillRect(-18.7, ly - 1.2, 0.5, 0.7);
      }
      // White reverse lens
      ctx.fillStyle = isReversing ? '#ffffff' : '#64748b';
      ctx.fillRect(-18.8, ly - 0.1, 1.0, 0.8);
      // Amber turn indicator
      ctx.fillStyle = tLit ? '#fbbf24' : '#78350f';
      ctx.fillRect(-18.8, ly + 0.8, 1.0, 0.8);
      if (tLit) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-18.7, ly + 1.0, 0.5, 0.4);
      }
    });

    // Front Turntable Corner Marker / Fog / Turn Pods (rotate with upper platform)
    [-9.2, 8.6].forEach((ly, idx) => {
      const isLeftSide = idx === 0;
      const tLit = isLeftSide ? leftTurnLit : rightTurnLit;
      ctx.fillStyle = '#090d14';
      ctx.fillRect(5.8, ly - 1.2, 1.6, 2.4);
      // Turn indicator lens
      ctx.fillStyle = tLit ? '#fbbf24' : '#78350f';
      ctx.fillRect(6.2, ly - 0.9, 1.0, 0.9);
      if (tLit) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(6.5, ly - 0.7, 0.5, 0.5);
      }
      // Front fog / position marker lens
      ctx.fillStyle = isFrontFogOn ? '#fde047' : (isIgnitionOn ? '#f1f5f9' : '#64748b');
      ctx.fillRect(6.2, ly + 0.1, 1.0, 0.9);
      if (isFrontFogOn) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(6.6, ly + 0.3, 0.4, 0.5);
      }
    });

    // 3. Engine Compartment Hood (ММЗ Д-245.12С) + Hydraulic Tank (Right Side / Rear Deck)
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

    // Diesel Exhaust Stack + Air Cyclone Pre-Cleaner
    // Vertical stack on the turret deck; its position is shared with the smoke emitter (EK12_EXHAUST_LOCAL)
    const exhX = EK12_EXHAUST_LOCAL.x;
    const exhY = EK12_EXHAUST_LOCAL.y;
    const stackTopX = exhX + upX * 3.2;
    const stackTopY = exhY + upY * 3.2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(exhX, exhY, 1.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(exhX, exhY);
    ctx.lineTo(stackTopX, stackTopY);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(stackTopX, stackTopY, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(stackTopX, stackTopY, 0.7, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(-1.8, 7.8, 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0.6, 9.3, 2.8, 0.5);

    // 4. Panoramic Operator Cab (Left Side y < 0) with 2.5D roof lift
    const cabX = -7.2;
    const cabY = -10.8;
    const cabL = 14.4;
    const cabW = 9.4;
    const cabRoofLiftX = upX * 2.2;
    const cabRoofLiftY = upY * 2.2;

    // Cab lower ROPS steel walls
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cabX, cabY, cabL, cabW, 1.3);
    ctx.fill();

    // Cab interior floor & pilot joysticks
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cabX + 0.9, cabY + 0.8, cabL - 2.4, cabW - 1.6);
    ctx.fillStyle = '#334155';
    ctx.fillRect(cabX + 2.4, cabY + 2.2, 4.6, 5.0);
    ctx.fillStyle = '#090d14';
    ctx.beginPath();
    ctx.arc(cabX + 8.6, cabY + 2.5, 0.75, 0, Math.PI * 2);
    ctx.arc(cabX + 8.6, cabY + 6.9, 0.75, 0, Math.PI * 2);
    ctx.fill();

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
    ctx.fillStyle = 'rgba(56, 189, 248, 0.26)';
    ctx.fillRect(cabX + cabL - 3.6, cabY + 0.8, 2.9, cabW - 1.6);
    ctx.fillRect(cabX + 1.0, cabY + 0.5, cabL - 3.2, 1.2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cabX + cabL - 3.3, cabY + 2.0);
    ctx.lineTo(cabX + cabL - 1.0, cabY + 5.8);
    ctx.stroke();

    // Cab roof panel lifted slightly along 2.5D screen-UP for crisp greenhouse depth
    ctx.save();
    ctx.translate(cabRoofLiftX, cabRoofLiftY);
    ctx.fillStyle = roofPaint;
    ctx.beginPath();
    ctx.roundRect(cabX + 0.8, cabY + 1.4, cabL - 4.4, cabW - 2.6, 0.9);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(cabX + cabL - 7.4, cabY + 2.4, 3.2, cabW - 4.6);

    // Left cab rear-view mirror
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(cabX + cabL - 1.8, cabY);
    ctx.lineTo(cabX + cabL - 0.8, cabY - 2.0);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cabX + cabL - 2.0, cabY - 2.9, 2.2, 1.3);

    // Cab Roof Twin Halogen Road & Work Floodlights (rotate with upper house)
    const workLampLit = !!car.exWorkLightOn;
    const cabLampLit = workLampLit || hasHeadlightsOn;
    const cabHighCore = workLampLit || (hasHeadlightsOn && car.headlightMode === 'high');
    [cabY + 2.0, cabY + cabW - 3.6].forEach((ly) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cabX + cabL - 4.1, ly, 1.4, 1.8);
      ctx.fillStyle = cabLampLit ? (cabHighCore ? '#ffffff' : '#fef08a') : '#64748b';
      ctx.fillRect(cabX + cabL - 3.2, ly + 0.2, 0.7, 1.4);
      if (cabHighCore) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cabX + cabL - 3.6, ly + 0.4, 0.4, 1.0);
      }
    });

    // Accumulated snow / wet clearcoat on cab roof
    if (wetCoat > 0.04) {
      const cabSheen = ctx.createLinearGradient(cabX + 1, cabY + 1, cabX + cabL - 3, cabY + cabW - 1);
      cabSheen.addColorStop(0, `rgba(186, 230, 253, ${(wetCoat * 0.16).toFixed(3)})`);
      cabSheen.addColorStop(0.5, `rgba(255, 255, 255, ${(wetCoat * 0.22).toFixed(3)})`);
      cabSheen.addColorStop(1, `rgba(15, 23, 42, ${(wetCoat * 0.14).toFixed(3)})`);
      ctx.fillStyle = cabSheen;
      ctx.beginPath();
      ctx.roundRect(cabX + 0.8, cabY + 1.4, cabL - 4.4, cabW - 2.6, 0.9);
      ctx.fill();
    }
    if (snowCoat > 0.05) {
      ctx.fillStyle = `rgba(248, 250, 252, ${Math.min(0.84, snowCoat * 0.82).toFixed(3)})`;
      ctx.beginPath();
      ctx.roundRect(cabX + 1.2, cabY + 1.8, cabL - 5.2, cabW - 3.4, 0.7);
      ctx.fill();
    }

    // Rotating Amber Beacon on cab rear-left roof corner
    drawAmberBeacon(ctx, cabX + 2.0, cabY + 2.0, isIgnitionOn, 0.95);
    ctx.restore(); // end cabRoofLift

    // Accumulated snow & wet sheen on rotating counterweight & warm engine hood
    if (wetCoat > 0.04) {
      const deckSheen = ctx.createLinearGradient(-19, -10, 7, 10);
      deckSheen.addColorStop(0, `rgba(186, 230, 253, ${(wetCoat * 0.14).toFixed(3)})`);
      deckSheen.addColorStop(0.5, `rgba(255, 255, 255, ${(wetCoat * 0.18).toFixed(3)})`);
      deckSheen.addColorStop(1, `rgba(15, 23, 42, ${(wetCoat * 0.16).toFixed(3)})`);
      ctx.fillStyle = deckSheen;
      ctx.beginPath();
      ctx.roundRect(-12.4, -0.4, 14.2, 10.4, 1.4);
      ctx.fill();
    }
    if (snowCoat > 0.05) {
      const cwSnowA = Math.min(0.80, snowCoat * 0.78);
      const hoodSnowA = Math.max(0, cwSnowA * (1 - warmHoodFactor * 0.92));
      // Counterweight rear deck snow blanket
      ctx.fillStyle = `rgba(241, 245, 249, ${cwSnowA.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(-13.0, -9.8);
      ctx.lineTo(-14.3, -9.8);
      ctx.quadraticCurveTo(-19.0, -9.2, -19.4, 0);
      ctx.quadraticCurveTo(-19.0, 9.2, -14.3, 9.8);
      ctx.lineTo(-13.0, 9.8);
      ctx.closePath();
      ctx.fill();
      // Engine hood snow (melts cleanly as D-245 diesel warms up)
      if (hoodSnowA > 0.03) {
        ctx.fillStyle = `rgba(241, 245, 249, ${hoodSnowA.toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect(-11.8, 0.2, 13.0, 9.2, 1.1);
        ctx.fill();
      }
    }
    ctx.restore(); // end houseLift

    // =========================================================================
    // 5. 2.5D PERSPECTIVE ARTICULATED DIGGING ARM (Z-Sorted Painter's Order)
    // =========================================================================
    const pBase = proj(geom.boomBaseR_m, 0, geom.boomBaseZ_m);
    const pKnee = proj(geom.boomKneeR_m, 0, geom.boomKneeZ_m);
    const pTip = proj(geom.boomTipR_m, 0, geom.boomTipZ_m);
    const pStick = proj(geom.stickTipR_m, 0, geom.stickTipZ_m);
    const pBucketMid = proj(geom.bucketMidR_m, 0, geom.bucketMidZ_m);

    // Helper: draw a welded box-beam segment from A to B as seen from straight above
    // (tapered top face, darker side rails, centre ridge highlight).
    const drawBoxBeamPlan = (
      a: { x: number; y: number; s: number; z: number },
      b: { x: number; y: number; s: number; z: number },
      halfWA: number,
      halfWB: number,
      topFill: string,
      railFill: string
    ) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 0.001;
      const nx = -dy / len;
      const ny = dx / len;
      const wA = halfWA * a.s;
      const wB = halfWB * b.s;

      // Top face
      ctx.fillStyle = topFill;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * wA, a.y + ny * wA);
      ctx.lineTo(b.x + nx * wB, b.y + ny * wB);
      ctx.lineTo(b.x - nx * wB, b.y - ny * wB);
      ctx.lineTo(a.x - nx * wA, a.y - ny * wA);
      ctx.closePath();
      ctx.fill();

      // Darker side rails along both edges (outer 22% of the width)
      ctx.fillStyle = railFill;
      [1, -1].forEach((sgn) => {
        ctx.beginPath();
        ctx.moveTo(a.x + sgn * nx * wA, a.y + sgn * ny * wA);
        ctx.lineTo(b.x + sgn * nx * wB, b.y + sgn * ny * wB);
        ctx.lineTo(b.x + sgn * nx * wB * 0.78, b.y + sgn * ny * wB * 0.78);
        ctx.lineTo(a.x + sgn * nx * wA * 0.78, a.y + sgn * ny * wA * 0.78);
        ctx.closePath();
        ctx.fill();
      });

      // Outline
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * wA, a.y + ny * wA);
      ctx.lineTo(b.x + nx * wB, b.y + ny * wB);
      ctx.lineTo(b.x - nx * wB, b.y - ny * wB);
      ctx.lineTo(a.x - nx * wA, a.y - ny * wA);
      ctx.closePath();
      ctx.stroke();

      // Centre ridge highlight (or accumulated snow frosting along upper boom/stick face)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = Math.max(0.6, 0.7 * ((a.s + b.s) * 0.5));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if (snowCoat > 0.08) {
        ctx.strokeStyle = `rgba(241, 245, 249, ${Math.min(0.68, snowCoat * 0.65).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.9, ((wA + wB) * 0.42));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    };

    // Everything below grade is hidden: clip a part so the stretch of it that is underground
    // is cut away and the ground (with the trench vignette drawn earlier) shows through.
    // pts are the part's outline in (radius, height) metres; closed polygons close back to the first point.
    const drawWithBuriedClip = (
      pts: { r: number; z: number }[],
      halfWidthPx: number,
      closed: boolean,
      draw: () => void
    ) => {
      const ZC = -0.02;
      let rMin = Infinity;
      let rMax = -Infinity;
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        if (pts[i].z < ZC) {
          rMin = Math.min(rMin, pts[i].r);
          rMax = Math.max(rMax, pts[i].r);
        }
      }
      const edges = closed ? n : n - 1;
      for (let i = 0; i < edges; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        if ((a.z < ZC) !== (b.z < ZC)) {
          const rc = a.r + ((b.r - a.r) * (ZC - a.z)) / (b.z - a.z);
          rMin = Math.min(rMin, rc);
          rMax = Math.max(rMax, rc);
        }
      }
      if (rMax < rMin) {
        draw();
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(-400, -400, 800, 800);
      ctx.rect(rMin * PX_PER_M - 0.4, armY - halfWidthPx, (rMax - rMin) * PX_PER_M + 0.8, halfWidthPx * 2);
      ctx.clip('evenodd');
      draw();
      ctx.restore();
    };

    const drawHydraulicCylinder3D = (
      a: { x: number; y: number; s: number },
      b: { x: number; y: number; s: number },
      barrelRatio = 0.54,
      barrelWidth = 2.0
    ) => {
      const mx = a.x + (b.x - a.x) * barrelRatio;
      const my = a.y + (b.y - a.y) * barrelRatio;
      const avgS = (a.s + b.s) * 0.5;
      ctx.lineCap = 'round';
      // Dark steel cylinder barrel
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = barrelWidth * avgS;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(mx, my);
      ctx.stroke();
      // Barrel top highlight
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = barrelWidth * 0.42 * avgS;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(mx, my);
      ctx.stroke();
      // Chrome piston rod
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = barrelWidth * 0.54 * avgS;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    };

    const drawPin3D = (p: { x: number; y: number; s: number }, r: number) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * p.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.75;
      ctx.stroke();
    };

    // Segment draw routines for true Z-sorted painter's occlusion
    const drawBoomLower = () => {
      // Boom Pivot Saddle on turret deck
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(pBase.x, pBase.y, 3.0 * pBase.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // Twin Main Hoist Cylinders flanking boom foot up to gooseneck underside
      const cylAttachR = geom.boomBaseR_m + (geom.boomKneeR_m - geom.boomBaseR_m) * 0.76;
      const cylAttachZ = geom.boomBaseZ_m + (geom.boomKneeZ_m - geom.boomBaseZ_m) * 0.76 - 0.28;
      [-0.22, 0.22].forEach((latOff) => {
        const cA = proj(geom.boomBaseR_m - 0.14, latOff, geom.boomBaseZ_m - 0.25);
        const cB = proj(cylAttachR, latOff * 0.85, cylAttachZ);
        drawHydraulicCylinder3D(cA, cB, 0.52, 1.9);
      });

      const zShade = geom.boomKneeZ_m > 2.2 ? bodyBright : bodyPaint;
      drawBoxBeamPlan(pBase, pKnee, 2.1, 2.45, zShade, bodyDark);
      drawPin3D(pBase, 1.15);
    };

    const drawBoomUpper = () => {
      const zShade = geom.boomTipZ_m > 2.8 ? bodyBright : geom.boomTipZ_m < 0.2 ? shadeHex(bodyPaint, 0.86) : bodyPaint;
      drawBoxBeamPlan(pKnee, pTip, 2.45, 1.55, zShade, bodyDark);

      // Boom-mounted halogen work floodlight on left flank of upper boom
      const lampR = geom.boomKneeR_m + (geom.boomTipR_m - geom.boomKneeR_m) * 0.35;
      const lampZ = geom.boomKneeZ_m + (geom.boomTipZ_m - geom.boomKneeZ_m) * 0.35 + 0.12;
      const pLamp = proj(lampR, -0.26, lampZ);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pLamp.x - 0.9, pLamp.y - 0.9, 1.8, 1.8);
      if (workLampLit) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(pLamp.x - 0.4, pLamp.y - 0.4, 0.9, 0.9);
      }

      // Stick Hydraulic Cylinder perched above gooseneck arch -> stick heel lug
      const stickCylA = proj(geom.boomKneeR_m - 0.18, 0, geom.boomKneeZ_m + 0.38);
      const stickLugR = geom.boomTipR_m - Math.cos(geom.stickPitch) * 0.45;
      const stickLugZ = geom.boomTipZ_m - Math.sin(geom.stickPitch) * 0.45;
      const stickCylB = proj(stickLugR, 0, stickLugZ);
      drawHydraulicCylinder3D(stickCylA, stickCylB, 0.56, 2.0);

      drawPin3D(pTip, 1.3);
    };

    const drawStick = () => {
      const avgZ = (geom.boomTipZ_m + geom.stickTipZ_m) * 0.5;
      const stickDepthFactor = avgZ < 0 ? Math.max(0.68, 1.0 + avgZ * 0.1) : avgZ > 2.8 ? 1.1 : 0.98;
      drawBoxBeamPlan(pTip, pStick, 1.55, 1.05, shadeHex(bodyPaint, stickDepthFactor), bodyDark);

      // Bucket Hydraulic Cylinder along back of stick -> dogbone linkage near stick tip
      const bCylA = proj(
        geom.boomTipR_m + (geom.stickTipR_m - geom.boomTipR_m) * 0.16,
        0,
        geom.boomTipZ_m + (geom.stickTipZ_m - geom.boomTipZ_m) * 0.16 + 0.25
      );
      const bCylB = proj(
        geom.boomTipR_m + (geom.stickTipR_m - geom.boomTipR_m) * 0.88,
        0,
        geom.boomTipZ_m + (geom.stickTipZ_m - geom.boomTipZ_m) * 0.88 + 0.15
      );
      drawHydraulicCylinder3D(bCylA, bCylB, 0.58, 1.65);

      drawPin3D(pTip, 1.25);
      drawPin3D(pStick, 1.15);
    };

    const drawBucket3D = () => {
      // True 3D projected backhoe bucket (0.65 m3, 0.92m wide, 5 forged teeth)
      const bp = geom.bucketPitch;
      const cosB = Math.cos(bp);
      const sinB = Math.sin(bp);
      // Curved heel normal perpendicular to bucket pitch (outer/bottom curved back of backhoe scoop)
      const heelCos = Math.cos(bp + Math.PI * 0.5);
      const heelSin = Math.sin(bp + Math.PI * 0.5);

      const halfWidthM = 0.44;
      const L_B = 1.05;
      // 3D vertices along bucket profile: wrist pin (0), curved back heel (1), cutting lip (2), tooth tips (3)
      const rPin = geom.stickTipR_m;
      const zPin = geom.stickTipZ_m;
      const rHeel = rPin + cosB * 0.44 + heelCos * 0.52;
      const zHeel = zPin + sinB * 0.44 + heelSin * 0.52;
      const rLip = rPin + cosB * (L_B * 0.84);
      const zLip = zPin + sinB * (L_B * 0.84);
      const rTooth = rPin + cosB * (L_B * 1.08);
      const zTooth = zPin + sinB * (L_B * 1.08);

      const pPinL = proj(rPin, -halfWidthM, zPin);
      const pPinR = proj(rPin, halfWidthM, zPin);
      const pHeelL = proj(rHeel, -halfWidthM, zHeel);
      const pHeelR = proj(rHeel, halfWidthM, zHeel);
      const pLipL = proj(rLip, -halfWidthM, zLip);
      const pLipR = proj(rLip, halfWidthM, zLip);

      // Depth shading when bucket plunges into trench below grade
      const trenchDark = geom.bucketHeightM < 0 ? Math.max(0.65, 1 + geom.bucketHeightM * 0.08) : 1.0;
      const shellCol = shadeHex('#1e293b', trenchDark);
      const cheekCol = shadeHex('#334155', trenchDark);
      const lipCol = shadeHex('#475569', trenchDark);

      // 1) Curved bucket back/bottom steel shell
      ctx.fillStyle = shellCol;
      ctx.beginPath();
      ctx.moveTo(pPinL.x, pPinL.y);
      ctx.lineTo(pHeelL.x, pHeelL.y);
      ctx.lineTo(pLipL.x, pLipL.y);
      ctx.lineTo(pLipR.x, pLipR.y);
      ctx.lineTo(pHeelR.x, pHeelR.y);
      ctx.lineTo(pPinR.x, pPinR.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#090d14';
      ctx.lineWidth = 0.95;
      ctx.stroke();

      // 2) Bucket interior cavity shadow (between pin & cutting lip)
      ctx.fillStyle = '#0b111c';
      ctx.beginPath();
      ctx.moveTo(pPinL.x, pPinL.y);
      ctx.lineTo(pLipL.x, pLipL.y);
      ctx.lineTo(pLipR.x, pLipR.y);
      ctx.lineTo(pPinR.x, pPinR.y);
      ctx.closePath();
      ctx.fill();

      // 3) Side wear plates / cheeks (left and right triangles)
      ctx.fillStyle = cheekCol;
      ctx.beginPath();
      ctx.moveTo(pPinL.x, pPinL.y);
      ctx.lineTo(pHeelL.x, pHeelL.y);
      ctx.lineTo(pLipL.x, pLipL.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pPinR.x, pPinR.y);
      ctx.lineTo(pHeelR.x, pHeelR.y);
      ctx.lineTo(pLipR.x, pLipR.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4) Excavated earth / sand payload visibly heaped inside bucket bowl
      const loadFrac = clamp01(car.exBucketLoad ?? 0);
      if (loadFrac > 0.04) {
        const matColor =
          car.exBucketMaterial === 'sand'
            ? '#eab308'
            : car.exBucketMaterial === 'mud'
            ? '#3b2b1a'
            : '#5c3f24';
        const matHighlight = car.exBucketMaterial === 'sand' ? '#fef08a' : '#7c5a38';
        const pLoad = proj(
          (rPin + rHeel + rLip) / 3,
          0,
          (zPin + zHeel + zLip) / 3 + 0.14 * loadFrac
        );
        const rad = (2.1 + 2.3 * loadFrac) * pLoad.s;
        ctx.fillStyle = matColor;
        ctx.beginPath();
        ctx.ellipse(pLoad.x, pLoad.y, rad * 1.1, rad * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = matHighlight;
        ctx.beginPath();
        ctx.ellipse(pLoad.x + upX * 0.6, pLoad.y + upY * 0.6, rad * 0.48, rad * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5) Hardened steel cutting lip & 5 Forged Steel Teeth
      ctx.strokeStyle = lipCol;
      ctx.lineWidth = 1.6 * pBucketMid.s;
      ctx.beginPath();
      ctx.moveTo(pLipL.x, pLipL.y);
      ctx.lineTo(pLipR.x, pLipR.y);
      ctx.stroke();

      const teethCount = 5;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(0.9, 1.15 * pBucketMid.s);
      ctx.lineCap = 'round';
      for (let t = 0; t < teethCount; t++) {
        const lat = -halfWidthM * 0.82 + (t / (teethCount - 1)) * (halfWidthM * 1.64);
        const tBase = proj(rLip, lat, zLip);
        const tEnd = proj(rTooth, lat, zTooth);
        ctx.beginPath();
        ctx.moveTo(tBase.x, tBase.y);
        ctx.lineTo(tEnd.x, tEnd.y);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';

      drawPin3D(pStick, 1.1);
    };

    // Bucket outline in (radius, height): wrist pin, heel, cutting lip, tooth tips (same maths as drawBucket3D)
    const bucketOutline = (() => {
      const bp = geom.bucketPitch;
      const cosB = Math.cos(bp);
      const sinB = Math.sin(bp);
      const hc = Math.cos(bp + Math.PI * 0.5);
      const hs = Math.sin(bp + Math.PI * 0.5);
      const rPin = geom.stickTipR_m;
      const zPin = geom.stickTipZ_m;
      return [
        { r: rPin, z: zPin },
        { r: rPin + cosB * 0.44 + hc * 0.52, z: zPin + sinB * 0.44 + hs * 0.52 },
        { r: rPin + cosB * (1.05 * 0.84), z: zPin + sinB * (1.05 * 0.84) },
        { r: rPin + cosB * (1.05 * 1.08), z: zPin + sinB * (1.05 * 1.08) },
      ];
    })();

    // Sort the 4 articulated rigid assemblies by true average elevation (lowest Z first -> highest Z on top!)
    // Each part is clipped against the ground plane, so nothing below grade is drawn.
    const parts: { z: number; draw: () => void }[] = [
      {
        z: (geom.boomBaseZ_m + geom.boomKneeZ_m) * 0.5,
        draw: () =>
          drawWithBuriedClip(
            [
              { r: geom.boomBaseR_m, z: geom.boomBaseZ_m },
              { r: geom.boomKneeR_m, z: geom.boomKneeZ_m },
            ],
            3.8,
            false,
            drawBoomLower
          ),
      },
      {
        z: (geom.boomKneeZ_m + geom.boomTipZ_m) * 0.5 + 0.05,
        draw: () =>
          drawWithBuriedClip(
            [
              { r: geom.boomKneeR_m, z: geom.boomKneeZ_m },
              { r: geom.boomTipR_m, z: geom.boomTipZ_m },
            ],
            3.8,
            false,
            drawBoomUpper
          ),
      },
      {
        z: (geom.boomTipZ_m + geom.stickTipZ_m) * 0.5,
        draw: () =>
          drawWithBuriedClip(
            [
              { r: geom.boomTipR_m, z: geom.boomTipZ_m },
              { r: geom.stickTipR_m, z: geom.stickTipZ_m },
            ],
            3.4,
            false,
            drawStick
          ),
      },
      {
        z: (geom.stickTipZ_m + geom.bucketMidZ_m) * 0.5,
        draw: () => drawWithBuriedClip(bucketOutline, 5.6, true, drawBucket3D),
      },
    ];
    parts.sort((a, b) => a.z - b.z);
    for (const part of parts) {
      part.draw();
    }

    ctx.restore();
  }
}

/**
 * Traces & fills the exact solid occluder silhouette of the TVEX EK-12 (undercarriage,
 * front 2500mm dozer blade, rear outriggers, 360° revolving turntable house + cab roof,
 * and above-grade articulated boom / stick / bucket) in world space.
 * Used by renderMaterialGBuffer (destination-out) so PostFX ground snow, road snow,
 * wetness, puddles, and rut relief shaders never bleed onto the rotating turret or arm.
 */
export function traceExcavatorOccluderMask(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  cameraAngle?: number
): void {
  ensureExcavatorState(car);
  const geom = getExcavatorGeometry(car);
  const halfL = (car.length || 49) / 2;
  const halfW = (car.width || 25) / 2;
  const bladePos = clamp01(geom.bladePos);
  const outPos = clamp01(geom.outriggersPos);
  const maxWDepth = Math.max(
    car.waterDepth || 0,
    car.frontWaterDepth || 0,
    car.rearWaterDepth || 0,
    car.cabinWaterLevel || 0
  );

  // 1. Undercarriage chassis, tires, front bulldozer blade & rear outriggers (vehicle-local space)
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle || 0);

  if (maxWDepth < 0.78) {
    // Undercarriage box & dual 9.00-20 tire footprint
    ctx.fillRect(-halfL - 1.5, -halfW - 1.0, halfL * 2 + 3.0, halfW * 2 + 2.0);

    // Front 2500mm bulldozer blade
    const bladeX = halfL + 1.0 - bladePos * 0.8;
    const bladeW = halfW * 2 + 2.4;
    ctx.fillRect(bladeX - 2.4, -bladeW * 0.5, 4.8, bladeW);

    // Rear outrigger foot pads (lifted along screen-up when stowed)
    const chRelCam = (cameraAngle ?? (car.angle || 0)) - (car.angle || 0);
    const chUpX = Math.cos(chRelCam);
    const chUpY = Math.sin(chRelCam);
    const padLiftPx = (1 - outPos) * 0.55 * 4.2;
    [-1, 1].forEach((side) => {
      const padX = -halfL + 0.6;
      const padY = side * 10.0;
      ctx.fillRect(padX - 3.0, padY - 2.8, 6.0, 5.6);
      ctx.fillRect(padX + chUpX * padLiftPx - 2.8, padY + chUpY * padLiftPx - 2.6, 5.6, 5.2);
    });
  }

  // 2. Revolving 360° Upper Turntable House, Counterweight, Cab & 2.5D Articulated Arm
  ctx.translate(geom.turretLocalX, geom.turretLocalY);
  ctx.rotate(geom.turretAngle);

  const relCam = (cameraAngle ?? (car.angle || 0)) - geom.worldArmAngle;
  const upX = Math.cos(relCam);
  const upY = Math.sin(relCam);
  const houseLiftX = upX * 2.4;
  const houseLiftY = upY * 2.4;
  const cabRoofLiftX = upX * 2.2;
  const cabRoofLiftY = upY * 2.2;

  const traceHouse = () => {
    ctx.beginPath();
    ctx.moveTo(8.2, -11.6);
    ctx.lineTo(-14.4, -11.6);
    ctx.quadraticCurveTo(-20.6, -10.8, -21.0, 0);
    ctx.quadraticCurveTo(-20.6, 10.8, -14.4, 11.6);
    ctx.lineTo(8.2, 11.6);
    ctx.closePath();
    ctx.fill();
  };

  // Base deck extrusion + elevated upper deck
  traceHouse();
  ctx.save();
  ctx.translate(houseLiftX, houseLiftY);
  traceHouse();

  // Elevated cab roof + side mirror
  ctx.translate(cabRoofLiftX, cabRoofLiftY);
  const cabX = -7.2;
  const cabY = -10.8;
  const cabL = 14.4;
  const cabW = 9.4;
  ctx.fillRect(cabX - 0.6, cabY - 0.6, cabL + 1.2, cabW + 1.2);
  ctx.fillRect(cabX + cabL - 2.6, cabY - 3.4, 3.2, 3.4);
  ctx.restore();

  // Articulated arm & bucket (plan projection matching renderExcavatorEK12, clipped above ground z >= -0.02)
  const PX_PER_M = 10.0;
  const armY = geom.armMountOffsetY;
  const projPt = (rM: number, latM: number, zM: number) => ({
    x: rM * PX_PER_M,
    y: armY + latM * PX_PER_M,
    s: Math.max(0.9, Math.min(1.18, 1.0 + zM * 0.03)),
  });

  const maskAboveGrade = (
    pts: { r: number; z: number }[],
    halfWidthPx: number,
    closed: boolean,
    draw: () => void
  ) => {
    const ZC = -0.02;
    let rMin = Infinity;
    let rMax = -Infinity;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      if (pts[i].z < ZC) {
        rMin = Math.min(rMin, pts[i].r);
        rMax = Math.max(rMax, pts[i].r);
      }
    }
    const edges = closed ? n : n - 1;
    for (let i = 0; i < edges; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if ((a.z < ZC) !== (b.z < ZC)) {
        const rc = a.r + ((b.r - a.r) * (ZC - a.z)) / (b.z - a.z);
        rMin = Math.min(rMin, rc);
        rMax = Math.max(rMax, rc);
      }
    }
    if (rMax < rMin) {
      draw();
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(-400, -400, 800, 800);
    ctx.rect(rMin * PX_PER_M - 0.4, armY - halfWidthPx, (rMax - rMin) * PX_PER_M + 0.8, halfWidthPx * 2);
    ctx.clip('evenodd');
    draw();
    ctx.restore();
  };

  const pBase = projPt(geom.boomBaseR_m, 0, geom.boomBaseZ_m);
  const pKnee = projPt(geom.boomKneeR_m, 0, geom.boomKneeZ_m);
  const pTip = projPt(geom.boomTipR_m, 0, geom.boomTipZ_m);
  const pStick = projPt(geom.stickTipR_m, 0, geom.stickTipZ_m);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Boom lower + twin hoist cylinders
  maskAboveGrade(
    [
      { r: geom.boomBaseR_m, z: geom.boomBaseZ_m },
      { r: geom.boomKneeR_m, z: geom.boomKneeZ_m },
    ],
    4.6,
    false,
    () => {
      ctx.lineWidth = 6.8 * ((pBase.s + pKnee.s) * 0.5);
      ctx.beginPath();
      ctx.moveTo(pBase.x, pBase.y);
      ctx.lineTo(pKnee.x, pKnee.y);
      ctx.stroke();
    }
  );

  // Boom upper + work floodlight + stick cylinder
  maskAboveGrade(
    [
      { r: geom.boomKneeR_m, z: geom.boomKneeZ_m },
      { r: geom.boomTipR_m, z: geom.boomTipZ_m },
    ],
    4.6,
    false,
    () => {
      ctx.lineWidth = 5.8 * ((pKnee.s + pTip.s) * 0.5);
      ctx.beginPath();
      ctx.moveTo(pKnee.x, pKnee.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.stroke();
    }
  );

  // Stick / dipper arm
  maskAboveGrade(
    [
      { r: geom.boomTipR_m, z: geom.boomTipZ_m },
      { r: geom.stickTipR_m, z: geom.stickTipZ_m },
    ],
    4.0,
    false,
    () => {
      ctx.lineWidth = 4.4 * ((pTip.s + pStick.s) * 0.5);
      ctx.beginPath();
      ctx.moveTo(pTip.x, pTip.y);
      ctx.lineTo(pStick.x, pStick.y);
      ctx.stroke();
    }
  );

  // 3D Backhoe Bucket hull + teeth
  const bp = geom.bucketPitch;
  const cosB = Math.cos(bp);
  const sinB = Math.sin(bp);
  const hc = Math.cos(bp + Math.PI * 0.5);
  const hs = Math.sin(bp + Math.PI * 0.5);
  const halfWidthM = 0.50;
  const rPin = geom.stickTipR_m;
  const zPin = geom.stickTipZ_m;
  const rHeel = rPin + cosB * 0.44 + hc * 0.52;
  const zHeel = zPin + sinB * 0.44 + hs * 0.52;
  const rTooth = rPin + cosB * (1.05 * 1.08);
  const zTooth = zPin + sinB * (1.05 * 1.08);

  const pPinL = projPt(rPin, -halfWidthM, zPin);
  const pPinR = projPt(rPin, halfWidthM, zPin);
  const pHeelL = projPt(rHeel, -halfWidthM, zHeel);
  const pHeelR = projPt(rHeel, halfWidthM, zHeel);
  const pToothL = projPt(rTooth, -halfWidthM, zTooth);
  const pToothR = projPt(rTooth, halfWidthM, zTooth);

  maskAboveGrade(
    [
      { r: rPin, z: zPin },
      { r: rHeel, z: zHeel },
      { r: rTooth, z: zTooth },
    ],
    6.4,
    true,
    () => {
      ctx.beginPath();
      ctx.moveTo(pPinL.x, pPinL.y);
      ctx.lineTo(pHeelL.x, pHeelL.y);
      ctx.lineTo(pToothL.x, pToothL.y);
      ctx.lineTo(pToothR.x, pToothR.y);
      ctx.lineTo(pHeelR.x, pHeelR.y);
      ctx.lineTo(pPinR.x, pPinR.y);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
  );

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.restore();
}

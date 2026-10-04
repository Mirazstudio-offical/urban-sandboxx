import { DeformVertex, Vehicle } from './types';

/**
 * Traces a softbody perimeter contour using Catmull-Rom splines for smooth metal curves
 * and accordion fold vertices for crumpled plastic-strain zones.
 * Strictly enforces anti-ballooning: deformed metal dents inward into hollow cavities,
 * never expanding outwards like an inflated balloon.
 */
export function traceSoftbodyPath(
  ctx: CanvasRenderingContext2D,
  bodyPoly: { x: number; y: number }[],
  deformedVertices?: DeformVertex[]
): void {
  if (!bodyPoly || bodyPoly.length === 0) return;
  const n = bodyPoly.length;

  const pStart = bodyPoly[0];
  if (!pStart || !isFinite(pStart.x) || !isFinite(pStart.y)) return;

  ctx.moveTo(pStart.x, pStart.y);

  for (let i = 0; i < n; i++) {
    const idx0 = i;
    const idx1 = (i + 1) % n;
    const idxPrev = (i - 1 + n) % n;
    const idxNext = (i + 2) % n;

    const p0 = bodyPoly[idx0];
    const p1 = bodyPoly[idx1];
    const pPrev = bodyPoly[idxPrev];
    const pNext = bodyPoly[idxNext];

    if (!p0 || !p1 || !pPrev || !pNext ||
        !isFinite(p0.x) || !isFinite(p0.y) ||
        !isFinite(p1.x) || !isFinite(p1.y) ||
        !isFinite(pPrev.x) || !isFinite(pPrev.y) ||
        !isFinite(pNext.x) || !isFinite(pNext.y)) {
      continue;
    }

    const strain0 = deformedVertices ? (deformedVertices[idx0]?.plasticStrain || 0) : 0;
    const strain1 = deformedVertices ? (deformedVertices[idx1]?.plasticStrain || 0) : 0;
    const maxStrain = Math.max(strain0, strain1);

    // If metal is crumpled, draw straight accordion creases (anti-ballooning)
    if (maxStrain > 0.25) {
      ctx.lineTo(p1.x, p1.y);
      continue;
    }

    // Tight tension factor prevents wide bulging curves
    const tension = Math.max(0.04, 0.12 - maxStrain * 0.08);

    const cp1x = p0.x + (p1.x - pPrev.x) * tension;
    const cp1y = p0.y + (p1.y - pPrev.y) * tension;
    const cp2x = p1.x - (pNext.x - p0.x) * tension;
    const cp2y = p1.y - (pNext.y - p0.y) * tension;

    if (isFinite(cp1x) && isFinite(cp1y) && isFinite(cp2x) && isFinite(cp2y)) {
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
    } else {
      ctx.lineTo(p1.x, p1.y);
    }
  }
}

/**
 * Renders the vehicle's hollow chassis framework, inner wheel wells, engine bay cavity,
 * and radiator crossmember underneath the outer body panels.
 * When panels (fenders, bumpers, doors, hood) are dented or detached, this hollow
 * mechanical skeleton is authentically exposed.
 */
export function renderHollowChassisAndCavities(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;

  ctx.save();

  // 1. Dark underbody floorpan & frame rails
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-halfL * 0.90, -halfW * 0.85, halfL * 1.80, halfW * 1.70);

  // Twin longitudinal steel subframe rails
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-halfL * 0.95, -halfW * 0.48, halfL * 1.90, 2.2);
  ctx.fillRect(-halfL * 0.95, halfW * 0.48 - 2.2, halfL * 1.90, 2.2);

  // 2. Hollow Engine Bay Cavity (Front compartment)
  const engineBayX = halfL * 0.22;
  const engineBayL = halfL * 0.65;
  const engineBayW = halfW * 1.45;

  ctx.fillStyle = '#090d16'; // Deep hollow engine bay shadow
  ctx.fillRect(engineBayX, -engineBayW * 0.5, engineBayL, engineBayW);

  // Front radiator core support crossmember & crash bar horns
  ctx.fillStyle = '#334155';
  ctx.fillRect(halfL * 0.82, -halfW * 0.65, 2.8, halfW * 1.30);
  // Radiator cooling fins
  ctx.fillStyle = (dmg?.underHoodSteam && dmg.underHoodSteam !== 'none') ? '#475569' : '#1e293b';
  ctx.fillRect(halfL * 0.77, -halfW * 0.50, 2.0, halfW * 1.0);

  // Engine block & cylinder head top silhouette
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  const blockX = halfL * 0.40;
  const blockW = halfW * 0.65;
  const blockL = halfL * 0.32;
  ctx.fillRect(blockX - blockL * 0.5, -blockW * 0.5, blockL, blockW);
  ctx.strokeRect(blockX - blockL * 0.5, -blockW * 0.5, blockL, blockW);

  // Front suspension strut tower aprons
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(halfL * 0.45, -halfW * 0.62, 3.2, 0, Math.PI * 2);
  ctx.arc(halfL * 0.45, halfW * 0.62, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // 3. Hollow Passenger Cabin Tub (Footwells, transmission tunnel, seat tubs)
  const cabinX = -halfL * 0.12;
  const cabinL = halfL * 0.75;
  const cabinW = halfW * 1.55;

  ctx.fillStyle = '#0a0e17'; // Dark cabin cavity
  ctx.fillRect(cabinX - cabinL * 0.5, -cabinW * 0.5, cabinL, cabinW);

  // Transmission center tunnel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cabinX - cabinL * 0.5, -1.5, cabinL, 3.0);

  // Driver and passenger seat outlines
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cabinX - cabinL * 0.3, -halfW * 0.55, cabinL * 0.35, halfW * 0.42);
  ctx.fillRect(cabinX - cabinL * 0.3, halfW * 0.13, cabinL * 0.35, halfW * 0.42);

  // 4. Hollow Trunk Well (Rear luggage cavity)
  const trunkX = -halfL * 0.68;
  const trunkL = halfL * 0.45;
  const trunkW = halfW * 1.35;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(trunkX - trunkL * 0.5, -trunkW * 0.5, trunkL, trunkW);

  // Spare tire well impression
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(trunkX, 0, halfW * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Wheel Well Inner Liners
  ctx.fillStyle = '#05070d';
  const frontAxleX = halfL * 0.46;
  const rearAxleX = -halfL * 0.46;
  const wellL = halfL * 0.34;
  const wellDepth = halfW * 0.32;

  // Front-Left and Front-Right inner wells
  ctx.fillRect(frontAxleX - wellL * 0.5, -halfW, wellL, wellDepth);
  ctx.fillRect(frontAxleX - wellL * 0.5, halfW - wellDepth, wellL, wellDepth);
  // Rear-Left and Rear-Right inner wells
  ctx.fillRect(rearAxleX - wellL * 0.5, -halfW, wellL, wellDepth);
  ctx.fillRect(rearAxleX - wellL * 0.5, halfW - wellDepth, wellL, wellDepth);

  ctx.restore();
}

/**
 * Renders discrete panel shutlines (panel gaps separating front bumper, fenders, hood,
 * doors, rear quarters, and trunk). Shows physical stamping lines and hollow construction.
 */
export function renderPanelShutlines(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;

  ctx.save();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 0.85;

  const fc = dmg?.frontCrumple || 0;
  const rc = dmg?.rearCrumple || 0;

  // 1. Hood Shutlines (U-shaped seam between hood, front fenders, and windshield cowl)
  if (!dmg?.hoodDetached) {
    const hoodFrontX = halfL * 0.82 - fc * 0.9;
    const hoodRearX = halfL * 0.20;
    const hoodHalfW = halfW * 0.65;

    ctx.beginPath();
    // Left shutline (between hood and front-left fender)
    ctx.moveTo(hoodFrontX, -hoodHalfW);
    ctx.lineTo(hoodRearX, -hoodHalfW * 0.92);
    // Cowl seam (base of windshield)
    ctx.lineTo(hoodRearX, hoodHalfW * 0.92);
    // Right shutline (between hood and front-right fender)
    ctx.lineTo(hoodFrontX, hoodHalfW);
    ctx.stroke();
  }

  // 2. Front Bumper Shutline (Seam separating front bumper fascia from fenders and hood)
  if (!dmg?.frontBumperDetached) {
    const bumperSeamX = halfL * 0.80 - fc * 0.8;
    ctx.beginPath();
    ctx.moveTo(bumperSeamX, -halfW * 0.95);
    ctx.lineTo(bumperSeamX + 2, -halfW * 0.60);
    ctx.lineTo(bumperSeamX + 2, halfW * 0.60);
    ctx.lineTo(bumperSeamX, halfW * 0.95);
    ctx.stroke();
  }

  // 3. Front Fender to Door Shutlines (A-pillar gap)
  const aPillarX = halfL * 0.18;
  if (!dmg?.fenderFLDetached && !dmg?.leftDoorDetached) {
    ctx.beginPath();
    ctx.moveTo(aPillarX, -halfW * 0.98);
    ctx.lineTo(aPillarX - 2, -halfW * 0.72);
    ctx.stroke();
  }
  if (!dmg?.fenderFRDetached && !dmg?.rightDoorDetached) {
    ctx.beginPath();
    ctx.moveTo(aPillarX, halfW * 0.98);
    ctx.lineTo(aPillarX - 2, halfW * 0.72);
    ctx.stroke();
  }

  // 4. Door to Rear Quarter Shutlines (B/C pillar gap)
  const bPillarX = -halfL * 0.25;
  if (!dmg?.leftDoorDetached) {
    ctx.beginPath();
    ctx.moveTo(bPillarX, -halfW * 0.98);
    ctx.lineTo(bPillarX, -halfW * 0.72);
    ctx.stroke();
  }
  if (!dmg?.rightDoorDetached) {
    ctx.beginPath();
    ctx.moveTo(bPillarX, halfW * 0.98);
    ctx.lineTo(bPillarX, halfW * 0.72);
    ctx.stroke();
  }

  // 5. Trunk Lid Shutlines
  if (!dmg?.trunkDetached) {
    const trunkFrontX = -halfL * 0.40;
    const trunkRearX = -halfL * 0.85 + rc * 0.8;
    const trunkHalfW = halfW * 0.62;

    ctx.beginPath();
    ctx.moveTo(trunkFrontX, -trunkHalfW);
    ctx.lineTo(trunkRearX, -trunkHalfW * 0.95);
    ctx.lineTo(trunkRearX, trunkHalfW * 0.95);
    ctx.lineTo(trunkFrontX, trunkHalfW);
    ctx.stroke();
  }

  // 6. Rear Bumper Shutline
  if (!dmg?.rearBumperDetached) {
    const rBumperSeamX = -halfL * 0.84 + rc * 0.8;
    ctx.beginPath();
    ctx.moveTo(rBumperSeamX, -halfW * 0.95);
    ctx.lineTo(rBumperSeamX - 2, -halfW * 0.55);
    ctx.lineTo(rBumperSeamX - 2, halfW * 0.55);
    ctx.lineTo(rBumperSeamX, halfW * 0.95);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders exposed hollow cavities, mechanical skeleton, and structural crash bars
 * whenever individual body panels (hood, bumpers, fenders, doors, trunk) are detached.
 * Completely eliminates solid 'balloon' look: reveals true hollow automotive architecture.
 */
export function renderExposedCavitiesOnDetachedPanels(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;
  if (!dmg) return;

  const fc = dmg.frontCrumple || 0;
  const rc = dmg.rearCrumple || 0;

  ctx.save();

  // 1. HOOD DETACHED: Expose full hollow engine bay cavity & mechanical components
  if (dmg.hoodDetached) {
    const bayX = halfL * 0.20;
    const bayL = halfL * 0.62 - fc * 0.7;
    const bayHalfW = halfW * 0.65;

    // Deep hollow engine bay shadow aperture
    ctx.fillStyle = '#070a10';
    ctx.fillRect(bayX, -bayHalfW, bayL, bayHalfW * 2);

    // Inner cowl perimeter gutter & apron flanges
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bayX, -bayHalfW, bayL, bayHalfW * 2);

    // Radiator core support crossmember & cooling matrix
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bayX + bayL - 4.5, -bayHalfW * 0.85, 4.0, bayHalfW * 1.7);
    ctx.fillStyle = (dmg.underHoodSteam && dmg.underHoodSteam !== 'none') ? '#475569' : '#0f172a';
    ctx.fillRect(bayX + bayL - 3.5, -bayHalfW * 0.75, 2.0, bayHalfW * 1.5);
    // Radiator pressure cap
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(bayX + bayL - 2.5, -bayHalfW * 0.55, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Engine block & cylinder head cover (cast aluminum or steel)
    const engCenterX = bayX + bayL * 0.45;
    const blockL = halfL * 0.32;
    const blockW = halfW * 0.55;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.9;
    ctx.fillRect(engCenterX - blockL * 0.5, -blockW * 0.5, blockL, blockW);
    ctx.strokeRect(engCenterX - blockL * 0.5, -blockW * 0.5, blockL, blockW);

    // Cylinder head valve cover ribbed stamping lines
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.6;
    for (let i = -blockL * 0.35; i <= blockL * 0.35; i += blockL * 0.22) {
      ctx.beginPath();
      ctx.moveTo(engCenterX + i, -blockW * 0.4);
      ctx.lineTo(engCenterX + i, blockW * 0.4);
      ctx.stroke();
    }

    // 12V Automotive battery in corner tray
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bayX + 2.5, -bayHalfW * 0.82, 5.5, 4.2);
    ctx.fillStyle = '#ef4444'; // Positive red terminal
    ctx.fillRect(bayX + 3.0, -bayHalfW * 0.80, 1.2, 1.2);
    ctx.fillStyle = '#94a3b8'; // Negative brass terminal
    ctx.fillRect(bayX + 6.0, -bayHalfW * 0.80, 1.2, 1.2);

    // Front suspension strut tower aprons
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(bayX + bayL * 0.55, -bayHalfW * 0.88, 3.2, 0, Math.PI * 2);
    ctx.arc(bayX + bayL * 0.55, bayHalfW * 0.88, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Severed hood cowl hinge brackets with sheared metallic fracture marks
    ctx.fillStyle = '#475569';
    ctx.fillRect(bayX - 1.5, -bayHalfW * 0.82, 2.5, 2.0);
    ctx.fillRect(bayX - 1.5, bayHalfW * 0.82 - 2.0, 2.5, 2.0);
  }

  // 2. FRONT BUMPER DETACHED: Expose structural crash bar & horns
  if (dmg.frontBumperDetached) {
    const barX = halfL * 0.82 - fc * 0.8;
    // Structural steel reinforcement crash beam
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.0;
    ctx.fillRect(barX, -halfW * 0.85, 3.2, halfW * 1.70);
    ctx.strokeRect(barX, -halfW * 0.85, 3.2, halfW * 1.70);

    // Crash horn crumple box mounts
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX - 4.5, -halfW * 0.48, 4.5, 2.8);
    ctx.fillRect(barX - 4.5, halfW * 0.48 - 2.8, 4.5, 2.8);

    // Severed plastic bumper clip fracture scars
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(barX + 2.8, -halfW * 0.70, 1.2, 1.5);
    ctx.fillRect(barX + 2.8, halfW * 0.70 - 1.5, 1.2, 1.5);
  }

  // 3. REAR BUMPER DETACHED: Expose rear crash beam & exhaust
  if (dmg.rearBumperDetached) {
    const rBarX = -halfL * 0.84 + rc * 0.8;
    // Rear structural steel crash beam
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.0;
    ctx.fillRect(rBarX - 3.2, -halfW * 0.85, 3.2, halfW * 1.70);
    ctx.strokeRect(rBarX - 3.2, -halfW * 0.85, 3.2, halfW * 1.70);

    // Exhaust muffler canister & chrome exhaust tip
    ctx.fillStyle = '#475569';
    ctx.fillRect(rBarX - 10, halfW * 0.45, 7.5, 4.5);
    ctx.fillStyle = '#cbd5e1'; // Chrome tailpipe tip
    ctx.fillRect(rBarX - 3.5, halfW * 0.50, 4.5, 2.2);

    // Severed rear bracket tabs
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(rBarX - 4.2, -halfW * 0.65, 1.2, 1.5);
    ctx.fillRect(rBarX - 4.2, halfW * 0.65 - 1.5, 1.2, 1.5);
  }

  // 4. FRONT-LEFT FENDER DETACHED: Expose wheel arch & suspension strut
  if (dmg.fenderFLDetached) {
    const fX = halfL * 0.20;
    const fL = halfL * 0.62;
    const fY = -halfW * 0.98;
    const fW = halfW * 0.35;

    // Dark inner wheel arch cavity
    ctx.fillStyle = '#06080e';
    ctx.fillRect(fX, fY, fL, fW);

    // Stamped unibody inner apron rail
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(fX, fY + fW - 2.0, fL, 2.0);

    // Suspension coil spring & strut top
    const strutX = halfL * 0.46;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(strutX, fY + fW * 0.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    // Coil spring rib impressions
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(strutX, fY + fW * 0.5, 3.6, 0, Math.PI * 2);
    ctx.stroke();

    // Apron bolt holes where fender torn off
    ctx.fillStyle = '#090d16';
    for (let bx = fX + 4; bx < fX + fL - 4; bx += 6) {
      ctx.fillRect(bx, fY + fW - 1.6, 1.2, 1.2);
    }
  }

  // 5. FRONT-RIGHT FENDER DETACHED: Expose right wheel arch & suspension
  if (dmg.fenderFRDetached) {
    const fX = halfL * 0.20;
    const fL = halfL * 0.62;
    const fY = halfW * 0.63;
    const fW = halfW * 0.35;

    ctx.fillStyle = '#06080e';
    ctx.fillRect(fX, fY, fL, fW);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(fX, fY, fL, 2.0);

    const strutX = halfL * 0.46;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(strutX, fY + fW * 0.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(strutX, fY + fW * 0.5, 3.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#090d16';
    for (let bx = fX + 4; bx < fX + fL - 4; bx += 6) {
      ctx.fillRect(bx, fY + 0.4, 1.2, 1.2);
    }
  }

  // 6. LEFT DOOR DETACHED: Expose hollow doorway opening & cabin seat
  if (dmg.leftDoorDetached) {
    const dX = -halfL * 0.25;
    const dL = halfL * 0.43;
    const dY = -halfW * 0.98;
    const dW = halfW * 0.45;

    // Deep dark passenger cabin interior opening
    ctx.fillStyle = '#070a11';
    ctx.fillRect(dX, dY, dL, dW);

    // Structural rocker panel / door threshold sill
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(dX, dY, dL, 2.5);
    ctx.fillStyle = '#475569'; // Stamped sill step plate
    ctx.fillRect(dX + 2, dY + 0.6, dL - 4, 1.2);

    // Driver's bucket seat cushion & bolsters inside
    const seatX = dX + dL * 0.5;
    const seatY = dY + dW * 0.7;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.fillRect(seatX - dL * 0.35, seatY - 3.5, dL * 0.7, 7.0);
    ctx.strokeRect(seatX - dL * 0.35, seatY - 3.5, dL * 0.7, 7.0);

    // Steering column rim visible from side opening
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(dX + dL * 0.8, seatY, 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // Severed A-pillar hinge brackets & sheared metal edges
    ctx.fillStyle = '#475569';
    ctx.fillRect(dX + dL - 1.5, dY, 2.0, 3.0);
    ctx.fillStyle = '#f1f5f9'; // Bright stress shear highlight
    ctx.fillRect(dX + dL - 1.0, dY, 1.0, 1.2);

    // B-pillar striker pin bracket
    ctx.fillStyle = '#334155';
    ctx.fillRect(dX - 1.0, dY + 0.5, 1.8, 2.2);
  }

  // 7. RIGHT DOOR DETACHED: Expose right doorway opening & passenger seat
  if (dmg.rightDoorDetached) {
    const dX = -halfL * 0.25;
    const dL = halfL * 0.43;
    const dY = halfW * 0.53;
    const dW = halfW * 0.45;

    ctx.fillStyle = '#070a11';
    ctx.fillRect(dX, dY, dL, dW);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(dX, dY + dW - 2.5, dL, 2.5);
    ctx.fillStyle = '#475569';
    ctx.fillRect(dX + 2, dY + dW - 1.8, dL - 4, 1.2);

    const seatX = dX + dL * 0.5;
    const seatY = dY + dW * 0.3;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.fillRect(seatX - dL * 0.35, seatY - 3.5, dL * 0.7, 7.0);
    ctx.strokeRect(seatX - dL * 0.35, seatY - 3.5, dL * 0.7, 7.0);

    ctx.fillStyle = '#475569';
    ctx.fillRect(dX + dL - 1.5, dY + dW - 3.0, 2.0, 3.0);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(dX + dL - 1.0, dY + dW - 1.2, 1.0, 1.2);

    ctx.fillStyle = '#334155';
    ctx.fillRect(dX - 1.0, dY + dW - 2.7, 1.8, 2.2);
  }

  // 8. TRUNK LID DETACHED: Expose luggage tub & spare wheel
  if (dmg.trunkDetached) {
    const tFrontX = -halfL * 0.40;
    const tRearX = -halfL * 0.84 + rc * 0.8;
    const tL = Math.abs(tFrontX - tRearX);
    const tHalfW = halfW * 0.62;

    // Dark luggage cavity opening
    ctx.fillStyle = '#080c14';
    ctx.fillRect(tRearX, -tHalfW, tL, tHalfW * 2);

    // Stamped inner trunk lip gutter
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(tRearX, -tHalfW, tL, tHalfW * 2);

    // Corrugated floor ribs
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.8;
    for (let y = -tHalfW * 0.7; y <= tHalfW * 0.7; y += tHalfW * 0.35) {
      ctx.beginPath();
      ctx.moveTo(tRearX + 2, y);
      ctx.lineTo(tFrontX - 2, y);
      ctx.stroke();
    }

    // Spare tire wheel well depression
    const spX = tRearX + tL * 0.5;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(spX, 0, halfW * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Spare steel wheel rim & center hub nut
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(spX, 0, halfW * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(spX, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Severed decklid hinge ears
    ctx.fillStyle = '#475569';
    ctx.fillRect(tFrontX - 2.5, -tHalfW * 0.75, 2.5, 2.0);
    ctx.fillRect(tFrontX - 2.5, tHalfW * 0.75 - 2.0, 2.5, 2.0);
  }

  ctx.restore();
}

/**
 * Renders loose/ajar doors and flared fenders that have suffered partial mounting clip failure.
 */
export function renderLoosePanelsAndDoors(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;
  if (!dmg) return;

  const doorFL = dmg.doorFLAjar || 0;
  const doorFR = dmg.doorFRAjar || 0;
  const doorRL = dmg.doorRLAjar || 0;
  const doorRR = dmg.doorRRAjar || 0;
  const fenderFLLoose = dmg.fenderFLLoose;
  const fenderFRLoose = dmg.fenderFRLoose;

  // 1. Driver Front Door Popped Ajar (Hinged at A-pillar, latch failed)
  if (doorFL > 0 && !dmg.leftDoorDetached) {
    const hingeX = halfL * 0.16;
    const hingeY = -halfW * 0.95;
    const openAngle = Math.min(0.55, 0.10 + doorFL * 0.42);
    const doorL = halfL * 0.42;

    ctx.save();
    ctx.translate(hingeX, hingeY);
    ctx.rotate(openAngle); // Swung outward into space

    // Dark doorway cavity shadow under open door
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(-doorL, 0, doorL, 4.0);

    // Stamped sheet metal door panel
    ctx.fillStyle = car.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.fillRect(-doorL, -2.5, doorL, 3.5);
    ctx.strokeRect(-doorL, -2.5, doorL, 3.5);

    // Door window aperture / glass frame
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(-doorL * 0.85, -2.0, doorL * 0.7, 1.8);

    // Door handle notch
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-doorL * 0.88, -3.2, 3.2, 1.2);

    ctx.restore();
  }

  // 2. Passenger Front Door Popped Ajar
  if (doorFR > 0 && !dmg.rightDoorDetached) {
    const hingeX = halfL * 0.16;
    const hingeY = halfW * 0.95;
    const openAngle = -Math.min(0.55, 0.10 + doorFR * 0.42);
    const doorL = halfL * 0.42;

    ctx.save();
    ctx.translate(hingeX, hingeY);
    ctx.rotate(openAngle);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(-doorL, -4.0, doorL, 4.0);

    ctx.fillStyle = car.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.fillRect(-doorL, -1.0, doorL, 3.5);
    ctx.strokeRect(-doorL, -1.0, doorL, 3.5);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(-doorL * 0.85, 0.2, doorL * 0.7, 1.8);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-doorL * 0.88, 2.0, 3.2, 1.2);

    ctx.restore();
  }

  // 3. Rear-Left Door Popped Ajar (Hinged at B-pillar)
  if (doorRL > 0 && !dmg.doorRLDetached) {
    const hingeX = -halfL * 0.25;
    const hingeY = -halfW * 0.95;
    const openAngle = Math.min(0.50, 0.10 + doorRL * 0.38);
    const doorL = halfL * 0.38;

    ctx.save();
    ctx.translate(hingeX, hingeY);
    ctx.rotate(openAngle);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(-doorL, 0, doorL, 3.5);

    ctx.fillStyle = car.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.fillRect(-doorL, -2.2, doorL, 3.2);
    ctx.strokeRect(-doorL, -2.2, doorL, 3.2);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-doorL * 0.85, -2.8, 2.8, 1.0);

    ctx.restore();
  }

  // 4. Rear-Right Door Popped Ajar
  if (doorRR > 0 && !dmg.doorRRDetached) {
    const hingeX = -halfL * 0.25;
    const hingeY = halfW * 0.95;
    const openAngle = -Math.min(0.50, 0.10 + doorRR * 0.38);
    const doorL = halfL * 0.38;

    ctx.save();
    ctx.translate(hingeX, hingeY);
    ctx.rotate(openAngle);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(-doorL, -3.5, doorL, 3.5);

    ctx.fillStyle = car.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.fillRect(-doorL, -1.0, doorL, 3.2);
    ctx.strokeRect(-doorL, -1.0, doorL, 3.2);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-doorL * 0.85, 1.8, 2.8, 1.0);

    ctx.restore();
  }

  // 5. Flared Loose Front-Left Fender (Front bracket sheared, rubbing tire)
  if (fenderFLLoose && !dmg.fenderFLDetached) {
    const fenderX = halfL * 0.45;
    const fenderY = -halfW * 0.96;
    const flutter = Math.sin(Date.now() * 0.015 + car.x) * 1.2;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.ellipse(fenderX, fenderY, halfL * 0.22, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flared peeled sheet metal edge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fenderX - halfL * 0.2, fenderY);
    ctx.lineTo(fenderX, fenderY - 2.5 + flutter);
    ctx.lineTo(fenderX + halfL * 0.2, fenderY);
    ctx.stroke();

    ctx.restore();
  }

  // 6. Flared Loose Front-Right Fender
  if (fenderFRLoose && !dmg.fenderFRDetached) {
    const fenderX = halfL * 0.45;
    const fenderY = halfW * 0.96;
    const flutter = Math.cos(Date.now() * 0.015 + car.y) * 1.2;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.ellipse(fenderX, fenderY, halfL * 0.22, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fenderX - halfL * 0.2, fenderY);
    ctx.lineTo(fenderX, fenderY + 2.5 + flutter);
    ctx.lineTo(fenderX + halfL * 0.2, fenderY);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Renders metallic stress highlights on raised fold ridges
 * and ambient occlusion shadow lines inside deep crease troughs.
 */
export function renderSoftbodyStressLines(
  ctx: CanvasRenderingContext2D,
  bodyPoly: { x: number; y: number }[],
  deformedVertices?: DeformVertex[]
): void {
  if (!deformedVertices || deformedVertices.length < 16) return;

  const n = bodyPoly.length;
  for (let i = 0; i < n; i++) {
    const dv = deformedVertices[i];
    if (!dv) continue;
    const strain = dv.plasticStrain || 0;
    if (strain < 0.12) continue;

    const p = bodyPoly[i];
    const pPrev = bodyPoly[(i - 1 + n) % n];
    const pNext = bodyPoly[(i + 1) % n];

    // Compute angle bend between previous and next edge
    const v1x = p.x - pPrev.x;
    const v1y = p.y - pPrev.y;
    const v2x = pNext.x - p.x;
    const v2y = pNext.y - p.y;

    const cross = v1x * v2y - v1y * v2x;
    const isConvex = cross > 0;

    // Line inward towards car center
    const len = Math.hypot(p.x, p.y) || 1;
    const dirX = -p.x / len;
    const dirY = -p.y / len;

    const lineLen = Math.min(10, 3 + strain * 5);

    ctx.save();
    ctx.lineWidth = 1.1;

    if (isConvex) {
      // Metallic Specular Ridge Highlight
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.7, 0.25 + strain * 0.4)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + dirX * lineLen, p.y + dirY * lineLen);
      ctx.stroke();
    } else {
      // Ambient Occlusion Crease Shadow
      ctx.strokeStyle = `rgba(15, 23, 42, ${Math.min(0.8, 0.35 + strain * 0.45)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + dirX * lineLen, p.y + dirY * lineLen);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Renders 2.5D buckled hood overlay with fold shadow and ridge specular highlight
 */
export function renderBuckledHoodOverlay(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  bodyPoly: { x: number; y: number }[],
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;
  if (!dmg || dmg.hoodDetached) return;

  const hoodAmount = dmg.hoodRaisedAmount || (dmg.hoodBuckled ? 0.5 : 0);
  if (hoodAmount <= 0) return;

  const fc = dmg.frontCrumple || 0;
  const hoodApexX = halfL * 0.15 - fc * 0.5;
  const hoodWidth = halfW * 1.35;
  const liftY = Math.min(6, hoodAmount * 5);

  ctx.save();

  // Dark cast shadow under the buckled fold line
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.beginPath();
  ctx.moveTo(halfL - fc - 2, -hoodWidth * 0.4);
  ctx.lineTo(hoodApexX, 0);
  ctx.lineTo(halfL - fc - 2, hoodWidth * 0.4);
  ctx.lineTo(hoodApexX - 3, 0);
  ctx.closePath();
  ctx.fill();

  // Raised V-shaped fold ridge with bright specular highlight
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.85, 0.35 + hoodAmount * 0.5)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(halfL - fc - 1, -hoodWidth * 0.38 - liftY * 0.2);
  ctx.lineTo(hoodApexX, -liftY);
  ctx.lineTo(halfL - fc - 1, hoodWidth * 0.38 + liftY * 0.2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders sagging or dangling bumper ends on severe corner impacts when mounting clips shear.
 */
export function renderSaggingBumpers(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  bodyPoly: { x: number; y: number }[],
  halfL: number,
  halfW: number
): void {
  const dmg = car.damage;
  if (!dmg) return;

  const sagL = dmg.bumperSagLeft || 0;
  const sagR = dmg.bumperSagRight || 0;
  const rSagL = dmg.rearBumperSagLeft || 0;
  const rSagR = dmg.rearBumperSagRight || 0;

  // Front Bumper Sagging (hanging from surviving clip)
  if ((sagL > 0 || sagR > 0) && !dmg.frontBumperDetached) {
    const fc = dmg.frontCrumple || 0;
    const bumperX = halfL * 0.88 - fc * 0.8;
    const swingL = sagL > 0 ? (Math.sin(Date.now() * 0.012 + car.x) * 2.0 * sagL - sagL * 4.0) : 0;
    const swingR = sagR > 0 ? (Math.cos(Date.now() * 0.012 + car.y) * 2.0 * sagR + sagR * 4.0) : 0;

    ctx.save();
    // Bumper bar hanging obliquely
    ctx.fillStyle = car.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(bumperX - (sagL > 0 ? 3.5 : 0), -halfW * 0.95 + swingL);
    ctx.lineTo(bumperX + 2.5, -halfW * 0.5);
    ctx.lineTo(bumperX + 2.5, halfW * 0.5);
    ctx.lineTo(bumperX - (sagR > 0 ? 3.5 : 0), halfW * 0.95 + swingR);
    ctx.lineTo(bumperX - 2.5 - (sagR > 0 ? 3.5 : 0), halfW * 0.90 + swingR);
    ctx.lineTo(bumperX, halfW * 0.45);
    ctx.lineTo(bumperX, -halfW * 0.45);
    ctx.lineTo(bumperX - 2.5 - (sagL > 0 ? 3.5 : 0), -halfW * 0.90 + swingL);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Severed clip fracture marks
    ctx.fillStyle = '#e2e8f0';
    if (sagL > 0) ctx.fillRect(bumperX - 4, -halfW * 0.85 + swingL, 1.8, 1.8);
    if (sagR > 0) ctx.fillRect(bumperX - 4, halfW * 0.85 + swingR, 1.8, 1.8);

    ctx.restore();
  }

  // Rear Bumper Sagging
  if ((rSagL > 0 || rSagR > 0) && !dmg.rearBumperDetached) {
    const rc = dmg.rearCrumple || 0;
    const rBumperX = -halfL * 0.88 + rc * 0.8;
    const swingL = rSagL > 0 ? (Math.sin(Date.now() * 0.012 + car.x) * 2.0 * rSagL - rSagL * 4.0) : 0;
    const swingR = rSagR > 0 ? (Math.cos(Date.now() * 0.012 + car.y) * 2.0 * rSagR + rSagR * 4.0) : 0;

    ctx.save();
    ctx.fillStyle = car.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(rBumperX + (rSagL > 0 ? 3.5 : 0), -halfW * 0.95 + swingL);
    ctx.lineTo(rBumperX - 2.5, -halfW * 0.5);
    ctx.lineTo(rBumperX - 2.5, halfW * 0.5);
    ctx.lineTo(rBumperX + (rSagR > 0 ? 3.5 : 0), halfW * 0.95 + swingR);
    ctx.lineTo(rBumperX + 2.5 + (rSagR > 0 ? 3.5 : 0), halfW * 0.90 + swingR);
    ctx.lineTo(rBumperX, halfW * 0.45);
    ctx.lineTo(rBumperX, -halfW * 0.45);
    ctx.lineTo(rBumperX + 2.5 + (rSagL > 0 ? 3.5 : 0), -halfW * 0.90 + swingL);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

import { DeformVertex, Vehicle } from './types';
import {
  isRoadMachinery,
  isTrailerVehicle,
  isMotorcycle,
  isTractorVehicle,
  getVehicleBodyPanelsConfig
} from './vehicleHelpers';

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
 * Physical internal cavity deformation solver:
 * Propagates kinetic collision crush waves from perimeter crumple zones directly into
 * interior components (radiator, engine block, battery, strut towers, cabin tub, seats, trunk well).
 * Internal components physically crush, bend, tilt, crack and compress rather than remaining static.
 */
function createInternalDeformSolver(
  car: Vehicle,
  halfL: number,
  halfW: number,
  deform?: (x: number, y: number) => [number, number]
): (lx: number, ly: number) => [number, number] {
  const dmg = car.damage;
  const fc = dmg?.frontCrumple || 0;
  const rc = dmg?.rearCrumple || 0;
  const fld = dmg?.frontLeftDent || 0;
  const frd = dmg?.frontRightDent || 0;
  const ld = dmg?.leftDent || 0;
  const rd = dmg?.rightDent || 0;

  return (lx: number, ly: number): [number, number] => {
    let dx = 0;
    let dy = 0;

    // 1. Frontal impact crush wave (radiator, crash horn, engine block, suspension strut towers)
    if (lx > 0) {
      const fReach = Math.max(0, Math.min(1.0, (lx - halfL * 0.05) / (halfL * 0.95)));
      dx -= fc * fReach * 0.95;
      if (ly < 0) {
        dx -= fld * fReach * 0.85;
      } else {
        dx -= frd * fReach * 0.85;
      }
      // Lateral squish / wedge deflection of engine components
      dy += (ly < 0 ? -1 : 1) * (fc * 0.16 + Math.abs(fld - frd) * 0.20) * fReach;
    }

    // 2. Rear impact crush wave (rear crash beam, luggage floor, spare tire well)
    if (lx < 0) {
      const rReach = Math.max(0, Math.min(1.0, (-lx - halfL * 0.10) / (halfL * 0.90)));
      dx += rc * rReach * 0.95;
    }

    // 3. Side impact T-bone intrusion wave (door rocker sills, passenger cabin footwell, bucket seats)
    if (ly < 0) {
      const sReach = Math.max(0, Math.min(1.0, (-ly - halfW * 0.15) / (halfW * 0.85)));
      dy += ld * sReach * 0.80;
    } else {
      const sReach = Math.max(0, Math.min(1.0, (ly - halfW * 0.15) / (halfW * 0.85)));
      dy -= rd * sReach * 0.80;
    }

    if (deform) {
      const [exX, exY] = deform(lx, ly);
      return [exX + dx * 0.75, exY + dy * 0.75];
    }
    return [lx + dx, ly + dy];
  };
}

/**
 * Renders the vehicle's hollow chassis framework, inner wheel wells, engine bay cavity,
 * and radiator crossmember underneath the outer body panels.
 * Respects real vehicle archetypes (tractors, trailers, trucks, passenger cars).
 * Internals deform organically with real impact softbody displacement.
 */
export function renderHollowChassisAndCavities(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  halfL: number,
  halfW: number,
  deform?: (x: number, y: number) => [number, number]
): void {
  const isMoto = isMotorcycle(car.type);
  const isMachinery = isRoadMachinery(car.type);
  if (isMoto || isMachinery) return; // Motorcycles and heavy road rollers have dedicated custom architectures

  const isTrailer = isTrailerVehicle(car);
  const isTractor = isTractorVehicle(car.type);
  const isTruckOrBus = car.type.startsWith('truck_') || car.type === 'bus' || car.type === 'garbage_truck';
  const dmg = car.damage;

  ctx.save();

  // Internal deformation solver directly crunches inner components
  const iDeform = createInternalDeformSolver(car, halfL, halfW, deform);

  // Helper to draw deformed polygons
  const dRect = (x: number, y: number, w: number, h: number, fill: string, stroke?: string, strokeW?: number) => {
    const [p1x, p1y] = iDeform(x, y);
    const [p2x, p2y] = iDeform(x + w, y);
    const [p3x, p3y] = iDeform(x + w, y + h);
    const [p4x, p4y] = iDeform(x, y + h);
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.lineTo(p4x, p4y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW || 1;
      ctx.stroke();
    }
  };

  const dCircle = (cx: number, cy: number, r: number, fill: string, stroke?: string, strokeW?: number) => {
    const [dcx, dcy] = iDeform(cx, cy);
    ctx.beginPath();
    ctx.arc(dcx, dcy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW || 1;
      ctx.stroke();
    }
  };

  // 1. TRAILERS: Only chassis frame floor and heavy longitudinal I-beams
  if (isTrailer) {
    dRect(-halfL * 0.95, -halfW * 0.88, halfL * 1.90, halfW * 1.76, '#0f172a');
    dRect(-halfL * 0.95, -halfW * 0.45, halfL * 1.90, 2.5, '#1e293b');
    dRect(-halfL * 0.95, halfW * 0.45 - 2.5, halfL * 1.90, 2.5, '#1e293b');
    ctx.restore();
    return;
  }

  // 2. TRACTORS (MTZ-80 / MTZ-82): Cast iron front diesel engine block, radiator & single cab seat
  if (isTractor) {
    // Tractor chassis floor
    dRect(-halfL * 0.88, -halfW * 0.85, halfL * 1.76, halfW * 1.70, '#0f172a');
    // Front diesel engine casting (MMZ D-240 cast iron block)
    const d240X = halfL * 0.15;
    const d240L = halfL * 0.55;
    const d240W = halfW * 0.58;
    dRect(d240X - d240L * 0.5, -d240W * 0.5, d240L, d240W, '#1e293b', '#334155', 0.8);
    // Front tractor radiator & cooling fan shroud
    dRect(halfL * 0.48, -halfW * 0.42, 2.5, halfW * 0.84, '#334155');
    // Single tractor operator seat with high backrest inside rear cab
    const cabX = -halfL * 0.32;
    dRect(cabX - 4.5, -4.0, 9.0, 8.0, '#1e293b', '#334155', 0.8);
    dCircle(cabX + 4.0, 0, 2.2, '#334155'); // Steering wheel
    ctx.restore();
    return;
  }

  // 3. HEAVY TRUCKS (ZIL, Semi, Bus): Heavy channel frame, diesel block, wide cabin seating
  if (isTruckOrBus) {
    dRect(-halfL * 0.95, -halfW * 0.88, halfL * 1.90, halfW * 1.76, '#0f172a');
    dRect(-halfL * 0.95, -halfW * 0.42, halfL * 1.90, 3.2, '#1e293b');
    dRect(-halfL * 0.95, halfW * 0.42 - 3.2, halfL * 1.90, 3.2, '#1e293b');
    // Front diesel engine block
    const engX = halfL * 0.35;
    dRect(engX - halfL * 0.2, -halfW * 0.55, halfL * 0.4, halfW * 1.1, '#1e293b', '#334155', 0.9);
    // Front radiator crossmember
    dRect(halfL * 0.78, -halfW * 0.70, 3.5, halfW * 1.40, '#334155');
    // Truck cabin driver & passenger bench seats
    const cabX = halfL * 0.05;
    dRect(cabX - 5.0, -halfW * 0.65, 8.5, halfW * 1.30, '#1e293b', '#334155', 0.8);
    ctx.restore();
    return;
  }

  // 4. PASSENGER CARS (Sedans, Wagons, Hatchbacks, SUVs, Pickups, Vans): Full hollow unibody
  const fc = dmg?.frontCrumple || 0;
  const rc = dmg?.rearCrumple || 0;
  const isFrontCrushed = fc > 3.0 || (dmg?.frontLeftDent || 0) > 3.0 || (dmg?.frontRightDent || 0) > 3.0;
  const isRearCrushed = rc > 3.0 || (dmg?.rearLeftDent || 0) > 3.0 || (dmg?.rearRightDent || 0) > 3.0;

  // Underbody floorpan & frame rails (compressed along impact axis)
  dRect(-halfL * 0.90, -halfW * 0.85, halfL * 1.80, halfW * 1.70, '#0f172a');
  dRect(-halfL * 0.95, -halfW * 0.48, halfL * 1.90, 2.2, isFrontCrushed ? '#475569' : '#1e293b');
  dRect(-halfL * 0.95, halfW * 0.48 - 2.2, halfL * 1.90, 2.2, isFrontCrushed ? '#475569' : '#1e293b');

  // Hollow Engine Bay Cavity (Front compartment - compressed by front crumple)
  const engineBayX = halfL * 0.22;
  const engineBayL = Math.max(halfL * 0.20, halfL * 0.65 - fc * 0.8);
  const engineBayW = halfW * 1.45;
  dRect(engineBayX, -engineBayW * 0.5, engineBayL, engineBayW, '#090d16');

  // Front radiator core support crossmember & crash bar horns (crushes into V-shape)
  if (fc > 5.0) {
    const rX = halfL * 0.82 - fc * 0.85;
    dRect(rX, -halfW * 0.65, 3.5, halfW * 1.30, '#475569', '#1e293b', 0.8);
    // Leaking green antifreeze puddle
    dCircle(rX - 2.0, 0, 3.5, 'rgba(34, 197, 94, 0.45)');
  } else {
    dRect(halfL * 0.82 - fc * 0.7, -halfW * 0.65, 2.8, halfW * 1.30, '#334155');
    // Radiator cooling matrix
    const radCol = (dmg?.underHoodSteam && dmg.underHoodSteam !== 'none') ? '#475569' : '#1e293b';
    dRect(halfL * 0.77 - fc * 0.7, -halfW * 0.50, 2.0, halfW * 1.0, radCol);
  }

  // Engine block & cylinder head top silhouette (displaced and skewed by impact)
  const blockX = halfL * 0.40 - fc * 0.2;
  const blockW = halfW * 0.65;
  const blockL = Math.max(halfL * 0.22, halfL * 0.32 - (fc > 6 ? 2.5 : 0));
  dRect(blockX - blockL * 0.5, -blockW * 0.5, blockL, blockW, '#1e293b', isFrontCrushed ? '#ef4444' : '#334155', 0.8);

  if (isFrontCrushed || car.engineState?.oilPunctured) {
    // Engine oil spill stain over the cylinder head
    dCircle(blockX, 0, 3.8, 'rgba(15, 23, 42, 0.70)');
  }

  // Front suspension strut tower aprons
  dCircle(halfL * 0.45, -halfW * 0.62, 3.2, '#1e293b');
  dCircle(halfL * 0.45, halfW * 0.62, 3.2, '#1e293b');

  // Hollow Passenger Cabin Tub (Footwells, transmission tunnel, seat tubs)
  const cabinX = -halfL * 0.12;
  const cabinL = halfL * 0.75;
  const cabinW = halfW * 1.55;
  dRect(cabinX - cabinL * 0.5, -cabinW * 0.5, cabinL, cabinW, '#0a0e17');

  // Transmission center tunnel (buckles if side impact or severe front impact)
  dRect(cabinX - cabinL * 0.5, -1.5, cabinL, 3.0, '#1e293b');

  // Driver and passenger seat outlines (deforms and skews under T-bone intrusion)
  dRect(cabinX - cabinL * 0.3, -halfW * 0.55, cabinL * 0.35, halfW * 0.42, '#1e293b');
  dRect(cabinX - cabinL * 0.3, halfW * 0.13, cabinL * 0.35, halfW * 0.42, '#1e293b');

  // Hollow Trunk Well (Rear luggage cavity - crushes on rear impact)
  const trunkX = -halfL * 0.68 + rc * 0.5;
  const trunkL = Math.max(halfL * 0.15, halfL * 0.45 - rc * 0.8);
  const trunkW = halfW * 1.35;
  dRect(trunkX - trunkL * 0.5, -trunkW * 0.5, trunkL, trunkW, '#090d16');

  // Spare tire well impression (buckled / compressed on rear crash)
  dCircle(trunkX, 0, Math.max(2.0, halfW * 0.38 - rc * 0.3), '#090d16', isRearCrushed ? '#475569' : '#1e293b', 1.0);

  // Wheel Well Inner Liners
  const frontAxleX = halfL * 0.46;
  const rearAxleX = -halfL * 0.46;
  const wellL = halfL * 0.34;
  const wellDepth = halfW * 0.32;
  dRect(frontAxleX - wellL * 0.5, -halfW, wellL, wellDepth, '#05070d');
  dRect(frontAxleX - wellL * 0.5, halfW - wellDepth, wellL, wellDepth, '#05070d');
  dRect(rearAxleX - wellL * 0.5, -halfW, wellL, wellDepth, '#05070d');
  dRect(rearAxleX - wellL * 0.5, halfW - wellDepth, wellL, wellDepth, '#05070d');

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
  const isMoto = isMotorcycle(car.type);
  const isMachinery = isRoadMachinery(car.type);
  const isTrailer = isTrailerVehicle(car);
  if (isMoto || isMachinery || isTrailer) return; // Motorcycles, trailers, road rollers have no car body stamped panel shutlines

  const isTractor = isTractorVehicle(car.type);
  const dmg = car.damage;
  const panelsConfig = getVehicleBodyPanelsConfig(car.type);

  ctx.save();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 0.85;

  const fc = dmg?.frontCrumple || 0;
  const rc = dmg?.rearCrumple || 0;

  // TRACTOR SHUTLINES: Narrow engine bonnet and cab doors only
  if (isTractor) {
    if (!dmg?.hoodDetached) {
      const bFrontX = halfL * 0.46 - fc * 0.8;
      const bRearX = -halfL * 0.12;
      const bHalfW = halfW * 0.32;
      ctx.beginPath();
      ctx.moveTo(bFrontX, -bHalfW);
      ctx.lineTo(bRearX, -bHalfW);
      ctx.lineTo(bRearX, bHalfW);
      ctx.lineTo(bFrontX, bHalfW);
      ctx.stroke();
    }
    if (!dmg?.leftDoorDetached) {
      const cFrontX = -halfL * 0.12;
      const cRearX = -halfL * 0.52;
      ctx.beginPath();
      ctx.moveTo(cFrontX, -halfW * 0.86);
      ctx.lineTo(cRearX, -halfW * 0.86);
      ctx.stroke();
    }
    if (!dmg?.rightDoorDetached) {
      const cFrontX = -halfL * 0.12;
      const cRearX = -halfL * 0.52;
      ctx.beginPath();
      ctx.moveTo(cFrontX, halfW * 0.86);
      ctx.lineTo(cRearX, halfW * 0.86);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // PASSENGER CARS & TRUCKS SHUTLINES (Validated per component capability):

  // 1. Hood Shutlines (U-shaped seam between hood, front fenders, and windshield cowl)
  if (panelsConfig.hasHood && !dmg?.hoodDetached) {
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
  if (panelsConfig.hasFrontBumper && !dmg?.frontBumperDetached) {
    const bumperSeamX = halfL * 0.80 - fc * 0.8;
    ctx.beginPath();
    ctx.moveTo(bumperSeamX, -halfW * 0.95);
    ctx.lineTo(bumperSeamX + 2, -halfW * 0.60);
    ctx.lineTo(bumperSeamX + 2, halfW * 0.60);
    ctx.lineTo(bumperSeamX, halfW * 0.95);
    ctx.stroke();
  }

  // 3. Front Fender to Door Shutlines (A-pillar gap)
  if (panelsConfig.hasFenders && panelsConfig.hasDoors) {
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
  halfW: number,
  deform?: (x: number, y: number) => [number, number]
): void {
  const isMoto = car.type.startsWith('moto_') || car.type === 'moped_soviet';
  const isMachinery = isRoadMachinery(car.type);
  const isTrailer = isTrailerVehicle(car);
  if (isMoto || isMachinery || isTrailer) return; // Trailers and bikes do not have car body cavities

  const isTractor = car.type.startsWith('tractor_');
  const dmg = car.damage;
  if (!dmg) return;

  const fc = dmg.frontCrumple || 0;
  const rc = dmg.rearCrumple || 0;

  ctx.save();

  // Helper to draw deformed shapes inside cavities
  const dRect = (x: number, y: number, w: number, h: number, fill: string, stroke?: string, strokeW?: number) => {
    if (!deform) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeW || 1;
        ctx.strokeRect(x, y, w, h);
      }
      return;
    }
    const [p1x, p1y] = deform(x, y);
    const [p2x, p2y] = deform(x + w, y);
    const [p3x, p3y] = deform(x + w, y + h);
    const [p4x, p4y] = deform(x, y + h);
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.lineTo(p4x, p4y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW || 1;
      ctx.stroke();
    }
  };

  const dLine = (x1: number, y1: number, x2: number, y2: number, stroke: string, strokeW: number) => {
    const [p1x, p1y] = deform ? deform(x1, y1) : [x1, y1];
    const [p2x, p2y] = deform ? deform(x2, y2) : [x2, y2];
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
  };

  const dCircle = (cx: number, cy: number, r: number, fill: string, stroke?: string, strokeW?: number) => {
    const [dcx, dcy] = deform ? deform(cx, cy) : [cx, cy];
    ctx.beginPath();
    ctx.arc(dcx, dcy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW || 1;
      ctx.stroke();
    }
  };

  // TRACTOR DETACHED CAVITIES: Only engine cowl & cab doors
  if (isTractor) {
    if (dmg.hoodDetached) {
      const d240X = halfL * 0.15;
      const d240L = halfL * 0.55;
      const d240W = halfW * 0.58;
      dRect(d240X - d240L * 0.5, -d240W * 0.5, d240L, d240W, '#080c14', '#334155', 1.0);
      dRect(halfL * 0.48, -halfW * 0.42, 2.5, halfW * 0.84, '#475569');
    }
    if (dmg.leftDoorDetached) {
      dRect(-halfL * 0.35, -halfW * 0.88, halfL * 0.38, 3.5, '#070a11', '#334155', 0.9);
    }
    if (dmg.rightDoorDetached) {
      dRect(-halfL * 0.35, halfW * 0.88 - 3.5, halfL * 0.38, 3.5, '#070a11', '#334155', 0.9);
    }
    ctx.restore();
    return;
  }

  // PASSENGER CARS & TRUCKS DETACHED CAVITIES (Fully deformable with impact):

  // 1. HOOD DETACHED: Expose full hollow engine bay cavity & mechanical components
  if (dmg.hoodDetached) {
    const bayX = halfL * 0.20;
    const bayL = Math.max(halfL * 0.18, halfL * 0.62 - fc * 0.85);
    const bayHalfW = halfW * 0.65;
    const isCrushed = fc > 3.0 || (dmg.frontLeftDent || 0) > 3.0 || (dmg.frontRightDent || 0) > 3.0;
    const isSevereCrush = fc > 6.5;

    // Deep hollow engine bay shadow aperture (compressed by frontal crush)
    dRect(bayX, -bayHalfW, bayL, bayHalfW * 2, '#070a10', '#1e293b', 1.2);

    // Inner fender unibody apron metal (wrinkles under stress)
    dLine(bayX, -bayHalfW, bayX + bayL, -bayHalfW, isCrushed ? '#475569' : '#1e293b', isCrushed ? 1.4 : 0.8);
    dLine(bayX, bayHalfW, bayX + bayL, bayHalfW, isCrushed ? '#475569' : '#1e293b', isCrushed ? 1.4 : 0.8);

    // Radiator core support crossmember & cooling matrix (severely crumpled/bent into V-wedge on impact!)
    const radX = bayX + bayL - 2.5;
    if (isSevereCrush) {
      // Severely crushed & ruptured radiator matrix (collapsed inward)
      const rPinchY = ((dmg.frontLeftDent || 0) - (dmg.frontRightDent || 0)) * 0.4;
      dLine(radX + 1.5, -bayHalfW * 0.85, radX - 4.0, rPinchY, '#475569', 2.2);
      dLine(radX - 4.0, rPinchY, radX + 1.5, bayHalfW * 0.85, '#475569', 2.2);
      // Bent, crumpled aluminum cooling fins
      for (let y = -bayHalfW * 0.7; y <= bayHalfW * 0.7; y += 2.2) {
        dLine(radX - 2.0, y, radX + 0.5, y + (Math.sin(y) * 1.5), '#1e293b', 1.0);
      }
      // Green fluorescent antifreeze puddle stain spreading in engine bay
      dCircle(radX - 3.0, rPinchY, 3.5, 'rgba(34, 197, 94, 0.45)');
    } else if (isCrushed) {
      // Moderately buckled radiator
      dRect(radX - 3.5, -bayHalfW * 0.80, 3.2, bayHalfW * 1.6, '#334155', '#1e293b', 0.8);
      dRect(radX - 2.5, -bayHalfW * 0.70, 1.8, bayHalfW * 1.4, '#1e293b');
      // Antifreeze seep
      dCircle(radX - 1.5, -bayHalfW * 0.35, 2.0, 'rgba(34, 197, 94, 0.40)');
    } else {
      // Intact radiator core & pressure cap
      dRect(radX - 4.0, -bayHalfW * 0.85, 3.5, bayHalfW * 1.7, '#1e293b');
      const steamCol = (dmg.underHoodSteam && dmg.underHoodSteam !== 'none') ? '#475569' : '#0f172a';
      dRect(radX - 3.0, -bayHalfW * 0.75, 2.0, bayHalfW * 1.5, steamCol);
      dCircle(radX - 2.0, -bayHalfW * 0.55, 1.4, '#e2e8f0');
    }

    // Engine block & cylinder head cover (pushed back towards firewall, cocked/skewed on mounts)
    const skewAng = ((dmg.frontLeftDent || 0) - (dmg.frontRightDent || 0)) * 0.08;
    const engCenterX = bayX + bayL * 0.42 - fc * 0.15;
    const blockL = Math.max(halfL * 0.20, halfL * 0.32 - (isSevereCrush ? 3.0 : 0));
    const blockW = halfW * 0.55;

    // Engine block silhouette (deformed & pushed back)
    dRect(engCenterX - blockL * 0.5, -blockW * 0.5, blockL, blockW, '#1e293b', isSevereCrush ? '#ef4444' : '#475569', 0.9);

    // Dark oil spill stain over crushed engine block
    if (car.engineState?.oilPunctured || isCrushed) {
      dCircle(engCenterX - 1.0, 1.5, 4.0, 'rgba(15, 23, 42, 0.75)');
      dCircle(engCenterX + 2.0, -2.0, 2.8, 'rgba(51, 65, 85, 0.65)');
    }

    // Cylinder head valve cover ribbed lines (skewed / bent if damaged)
    for (let i = -blockL * 0.32; i <= blockL * 0.32; i += blockL * 0.22) {
      const lineSkew = isCrushed ? (Math.sin(i) * 1.8) : 0;
      dLine(engCenterX + i, -blockW * 0.38 + lineSkew, engCenterX + i, blockW * 0.38 + lineSkew, isSevereCrush ? '#475569' : '#64748b', 0.6);
    }

    // Metallic fracture cracks across cast engine block if severely smashed
    if (isSevereCrush) {
      dLine(engCenterX - blockL * 0.3, -blockW * 0.3, engCenterX + blockL * 0.2, blockW * 0.2, '#f8fafc', 0.9);
      dLine(engCenterX + blockL * 0.1, -blockW * 0.25, engCenterX - blockL * 0.1, blockW * 0.3, '#f8fafc', 0.7);
    }

    // 12V Automotive battery in corner tray (cracked / crushed if front-left hit)
    const batX = bayX + 2.5;
    const batY = -bayHalfW * 0.82;
    if ((dmg.frontLeftDent || 0) > 3.5) {
      // Cracked / tilted crushed battery with leaking electrolyte
      dRect(batX - 1.0, batY - 1.0, 5.0, 3.8, '#0f172a', '#e2e8f0', 0.6);
      dCircle(batX + 1.5, batY + 1.0, 2.5, 'rgba(254, 240, 138, 0.35)'); // Acid pool
      dRect(batX, batY, 1.2, 1.2, '#ef4444'); // Broken positive terminal
    } else {
      dRect(batX, batY, 5.5, 4.2, '#0f172a');
      dRect(batX + 0.5, batY + 0.5, 1.2, 1.2, '#ef4444');
      dRect(batX + 3.5, batY + 0.5, 1.2, 1.2, '#94a3b8');
    }

    // Air filter intake box on opposite corner (crushed on front-right impact)
    const airX = bayX + 3.0;
    const airY = bayHalfW * 0.52;
    if ((dmg.frontRightDent || 0) > 3.5) {
      dRect(airX - 1.0, airY, 5.0, 3.5, '#1e293b', '#64748b', 0.8);
      dLine(airX, airY + 1.5, airX + 3.5, airY + 2.0, '#94a3b8', 0.8); // Torn rubber intake duct
    } else {
      dRect(airX, airY, 6.0, 4.5, '#0f172a', '#334155', 0.8);
      dLine(airX + 2.0, airY, engCenterX, 0, '#1e293b', 1.8); // Rubber air duct to throttle body
    }

    // Front suspension strut tower aprons
    const strutLeftY = -bayHalfW * 0.88;
    const strutRightY = bayHalfW * 0.88;
    const strutLeftX = bayX + bayL * 0.55 + ((dmg.frontLeftDent || 0) > 4 ? -2.0 : 0);
    const strutRightX = bayX + bayL * 0.55 + ((dmg.frontRightDent || 0) > 4 ? -2.0 : 0);
    dCircle(strutLeftX, strutLeftY, 3.2, '#1e293b', '#334155', 0.8);
    dCircle(strutRightX, strutRightY, 3.2, '#1e293b', '#334155', 0.8);

    // Severed dangling wiring harness & hoses
    if (isCrushed) {
      dLine(engCenterX - 2.0, -bayHalfW * 0.6, engCenterX - 6.0, -bayHalfW * 0.3, '#ef4444', 0.8);
      dLine(engCenterX + 1.0, bayHalfW * 0.4, engCenterX + 4.0, bayHalfW * 0.7, '#3b82f6', 0.8);
    }

    // Severed hood cowl hinge brackets with sheared metallic fracture marks
    dRect(bayX - 1.5, -bayHalfW * 0.82, 2.5, 2.0, '#475569');
    dRect(bayX - 1.5, bayHalfW * 0.82 - 2.0, 2.5, 2.0, '#475569');
  }

  // 2. FRONT BUMPER DETACHED: Expose structural crash bar & horns (deforms into V-shape on impact!)
  if (dmg.frontBumperDetached) {
    const barX = halfL * 0.82 - fc * 0.8;
    // Structural steel reinforcement crash beam
    dRect(barX, -halfW * 0.85, 3.2, halfW * 1.70, '#334155', '#1e293b', 1.0);

    // Crash horn crumple box mounts
    dRect(barX - 4.5, -halfW * 0.48, 4.5, 2.8, '#1e293b');
    dRect(barX - 4.5, halfW * 0.48 - 2.8, 4.5, 2.8, '#1e293b');

    // Severed plastic bumper clip fracture scars
    dRect(barX + 2.8, -halfW * 0.70, 1.2, 1.5, '#f1f5f9');
    dRect(barX + 2.8, halfW * 0.70 - 1.5, 1.2, 1.5, '#f1f5f9');
  }

  // 3. REAR BUMPER DETACHED: Expose rear crash beam & exhaust
  if (dmg.rearBumperDetached) {
    const rBarX = -halfL * 0.84 + rc * 0.8;
    // Rear structural steel crash beam
    dRect(rBarX - 3.2, -halfW * 0.85, 3.2, halfW * 1.70, '#334155', '#1e293b', 1.0);

    // Exhaust muffler canister & chrome exhaust tip
    dRect(rBarX - 10, halfW * 0.45, 7.5, 4.5, '#475569');
    dRect(rBarX - 3.5, halfW * 0.50, 4.5, 2.2, '#cbd5e1');

    // Severed rear bracket tabs
    dRect(rBarX - 4.2, -halfW * 0.65, 1.2, 1.5, '#f1f5f9');
    dRect(rBarX - 4.2, halfW * 0.65 - 1.5, 1.2, 1.5, '#f1f5f9');
  }

  // 4. FRONT-LEFT FENDER DETACHED: Expose wheel arch & suspension strut
  if (dmg.fenderFLDetached) {
    const fX = halfL * 0.20;
    const fL = halfL * 0.62;
    const fY = -halfW * 0.98;
    const fW = halfW * 0.35;

    // Dark inner wheel arch cavity
    dRect(fX, fY, fL, fW, '#06080e');

    // Stamped unibody inner apron rail
    dRect(fX, fY + fW - 2.0, fL, 2.0, '#1e293b');

    // Suspension coil spring & strut top
    const strutX = halfL * 0.46;
    dCircle(strutX, fY + fW * 0.5, 2.8, '#475569', '#94a3b8', 0.8);

    // Apron bolt holes where fender torn off
    for (let bx = fX + 4; bx < fX + fL - 4; bx += 6) {
      dRect(bx, fY + fW - 1.6, 1.2, 1.2, '#090d16');
    }
  }

  // 5. FRONT-RIGHT FENDER DETACHED: Expose right wheel arch & suspension
  if (dmg.fenderFRDetached) {
    const fX = halfL * 0.20;
    const fL = halfL * 0.62;
    const fY = halfW * 0.63;
    const fW = halfW * 0.35;

    dRect(fX, fY, fL, fW, '#06080e');
    dRect(fX, fY, fL, 2.0, '#1e293b');

    const strutX = halfL * 0.46;
    dCircle(strutX, fY + fW * 0.5, 2.8, '#475569', '#94a3b8', 0.8);

    for (let bx = fX + 4; bx < fX + fL - 4; bx += 6) {
      dRect(bx, fY + 0.4, 1.2, 1.2, '#090d16');
    }
  }

  // 6. LEFT DOOR DETACHED: Expose hollow doorway opening & cabin seat
  if (dmg.leftDoorDetached) {
    const dX = -halfL * 0.25;
    const dL = halfL * 0.43;
    const dY = -halfW * 0.98;
    const dW = halfW * 0.45;

    // Deep dark passenger cabin interior opening
    dRect(dX, dY, dL, dW, '#070a11');

    // Structural rocker panel / door threshold sill
    dRect(dX, dY, dL, 2.5, '#1e293b');
    dRect(dX + 2, dY + 0.6, dL - 4, 1.2, '#475569');

    // Driver's bucket seat cushion & bolsters inside (deforms with side T-bone impact!)
    const seatX = dX + dL * 0.5;
    const seatY = dY + dW * 0.7;
    dRect(seatX - dL * 0.35, seatY - 3.5, dL * 0.7, 7.0, '#1e293b', '#334155', 0.8);

    // Steering column rim visible from side opening
    dCircle(dX + dL * 0.8, seatY, 2.5, '#1e293b', '#475569', 1.2);

    // Severed A-pillar hinge brackets & sheared metal edges
    dRect(dX + dL - 1.5, dY, 2.0, 3.0, '#475569');
    dRect(dX + dL - 1.0, dY, 1.0, 1.2, '#f1f5f9');

    // B-pillar striker pin bracket
    dRect(dX - 1.0, dY + 0.5, 1.8, 2.2, '#334155');
  }

  // 7. RIGHT DOOR DETACHED: Expose right doorway opening & passenger seat
  if (dmg.rightDoorDetached) {
    const dX = -halfL * 0.25;
    const dL = halfL * 0.43;
    const dY = halfW * 0.53;
    const dW = halfW * 0.45;

    dRect(dX, dY, dL, dW, '#070a11');
    dRect(dX, dY + dW - 2.5, dL, 2.5, '#1e293b');
    dRect(dX + 2, dY + dW - 1.8, dL - 4, 1.2, '#475569');

    const seatX = dX + dL * 0.5;
    const seatY = dY + dW * 0.3;
    dRect(seatX - dL * 0.35, seatY - 3.5, dL * 0.7, 7.0, '#1e293b', '#334155', 0.8);

    dRect(dX + dL - 1.5, dY + dW - 3.0, 2.0, 3.0, '#475569');
    dRect(dX + dL - 1.0, dY + dW - 1.2, 1.0, 1.2, '#f1f5f9');
    dRect(dX - 1.0, dY + dW - 2.7, 1.8, 2.2, '#334155');
  }

  // 8. TRUNK LID DETACHED: Expose luggage tub & spare wheel (deforms with rear crush!)
  if (dmg.trunkDetached) {
    const tFrontX = -halfL * 0.40;
    const tRearX = -halfL * 0.84 + rc * 0.8;
    const tL = Math.abs(tFrontX - tRearX);
    const tHalfW = halfW * 0.62;

    // Dark luggage cavity opening
    dRect(tRearX, -tHalfW, tL, tHalfW * 2, '#080c14', '#334155', 1.0);

    // Corrugated floor ribs
    for (let y = -tHalfW * 0.7; y <= tHalfW * 0.7; y += tHalfW * 0.35) {
      dLine(tRearX + 2, y, tFrontX - 2, y, '#1e293b', 0.8);
    }

    // Spare tire wheel well depression
    const spX = tRearX + tL * 0.5;
    dCircle(spX, 0, halfW * 0.35, '#0f172a');
    dCircle(spX, 0, halfW * 0.22, '#334155');
    dCircle(spX, 0, 1.4, '#1e293b');

    // Severed decklid hinge ears
    dRect(tFrontX - 2.5, -tHalfW * 0.75, 2.5, 2.0, '#475569');
    dRect(tFrontX - 2.5, tHalfW * 0.75 - 2.0, 2.5, 2.0, '#475569');
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

  const doorFL = typeof dmg.doorFLAjar === 'number' ? dmg.doorFLAjar : (dmg.doorFLAjar ? 1 : 0);
  const doorFR = typeof dmg.doorFRAjar === 'number' ? dmg.doorFRAjar : (dmg.doorFRAjar ? 1 : 0);
  const doorRL = typeof dmg.doorRLAjar === 'number' ? dmg.doorRLAjar : (dmg.doorRLAjar ? 1 : 0);
  const doorRR = typeof dmg.doorRRAjar === 'number' ? dmg.doorRRAjar : (dmg.doorRRAjar ? 1 : 0);
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
    const dvIdx = n === 16 ? i : Math.min(15, Math.floor((i / n) * 16));
    const dv = deformedVertices[dvIdx];
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
 * Renders dark charcoal-grey exposed primer, torn sheet metal edges,
 * and dark engine compartment cavities at crumpled vertices.
 */
export function renderTornBodyLining(
  ctx: CanvasRenderingContext2D,
  car: Vehicle,
  bodyPoly: { x: number; y: number }[],
  deformedVertices?: DeformVertex[]
): void {
  if (!deformedVertices || deformedVertices.length < 16) return;

  const n = bodyPoly.length;
  ctx.save();

  // 1. Dark Engine/Underbody Cavities Exposed at Ruptured Vertices
  for (let i = 0; i < n; i++) {
    const dvIdx = n === 16 ? i : Math.min(15, Math.floor((i / n) * 16));
    const dv = deformedVertices[dvIdx];
    if (!dv) continue;

    const strain = dv.plasticStrain || 0;
    const offsetDist = Math.hypot(dv.offsetX || 0, dv.offsetY || 0);

    // Require noticeable plastic deformation or offset displacement
    if (strain < 0.14 && offsetDist < 1.4) continue;

    const p = bodyPoly[i];
    const pPrev = bodyPoly[(i - 1 + n) % n];
    const pNext = bodyPoly[(i + 1) % n];

    // Vector pointing inward toward vehicle center
    const centerDist = Math.hypot(p.x, p.y) || 1;
    const inX = -p.x / centerDist;
    const inY = -p.y / centerDist;

    // Normal vector perpendicular to boundary edge
    const edgeX = pNext.x - pPrev.x;
    const edgeY = pNext.y - pPrev.y;
    const edgeLen = Math.hypot(edgeX, edgeY) || 1;
    const normX = -edgeY / edgeLen;
    const normY = edgeX / edgeLen;

    // Ensure normal points inward
    const dot = normX * inX + normY * inY;
    const finalNormX = dot >= 0 ? normX : -normX;
    const finalNormY = dot >= 0 ? normY : -normY;

    // Exposed cavity depth scales with strain and offset
    const depth = Math.min(6.5, 1.2 + strain * 2.8 + offsetDist * 0.45);

    // Seed-based procedural jagged tooth for torn metal edge
    const seed = (dv.shapeSeed || i * 17) % 100;
    const jag1 = 0.8 + (seed % 5) * 0.12;
    const jag2 = 0.7 + ((seed * 3) % 7) * 0.11;

    // A. Dark Charcoal / Slate Engine Compartment Cavity (Blackish-grey #0f172a / #1e293b)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.moveTo(p.x - edgeX * 0.25, p.y - edgeY * 0.25);
    ctx.lineTo(p.x + finalNormX * (depth * jag1), p.y + finalNormY * (depth * jag1));
    ctx.lineTo(p.x + edgeX * 0.25 + finalNormX * (depth * 0.6), p.y + edgeY * 0.25 + finalNormY * (depth * 0.6));
    ctx.lineTo(p.x + edgeX * 0.35, p.y + edgeY * 0.35);
    ctx.closePath();
    ctx.fill();

    // B. Grey Zinc Primer Layer (#334155 / #475569) simulating peeled paint & raw inner lining
    ctx.fillStyle = 'rgba(51, 65, 85, 0.85)';
    ctx.beginPath();
    ctx.moveTo(p.x - edgeX * 0.20, p.y - edgeY * 0.20);
    ctx.lineTo(p.x + finalNormX * (depth * 0.42 * jag2), p.y + finalNormY * (depth * 0.42 * jag2));
    ctx.lineTo(p.x + edgeX * 0.20, p.y + edgeY * 0.20);
    ctx.closePath();
    ctx.fill();

    // C. Jagged Raw Steel Edge Highlight (#94a3b8 / #cbd5e1)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.80)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(p.x - edgeX * 0.20, p.y - edgeY * 0.20);
    ctx.lineTo(p.x + finalNormX * (depth * 0.42 * jag2), p.y + finalNormY * (depth * 0.42 * jag2));
    ctx.stroke();
  }

  // 2. Dark Grey/Charcoal Rim Border Along Severely Crumpled Edge Segments
  for (let i = 0; i < n; i++) {
    const idx0 = i;
    const idx1 = (i + 1) % n;

    const strain0 = deformedVertices[idx0]?.plasticStrain || 0;
    const strain1 = deformedVertices[idx1]?.plasticStrain || 0;
    const maxStrain = Math.max(strain0, strain1);

    if (maxStrain < 0.16) continue;

    const p0 = bodyPoly[idx0];
    const p1 = bodyPoly[idx1];

    // Dark charcoal border along torn metal seam
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = Math.min(2.8, 1.2 + maxStrain * 1.2);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Inner grey primer stripe
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.75)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

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

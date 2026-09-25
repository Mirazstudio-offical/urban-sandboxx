import { CAR_CONFIGS, canVehicleHaveHitch, createDefaultEngineState, createDefaultFuelSystem, createDefaultFluidTank, ensureVehicleFluidTank, liquidTypeToStainType, createDefaultVehicleDamage, ensureVehicleDamage, getVehicleFuelCapPosition, getVehicleAxleGeometry, isTrailerVehicle, isRoadMachinery, getVehicleDriveType, SPEED_KMH_TO_PX_S, PX_S_TO_SPEED_KMH, getLPGDefaultCapacity, cycleVehicleDiffLock, getVehicleDiffCapabilities, ensureVehicleDiffLock } from './vehicleHelpers';
import { Building, GameWorld, InputState, Particle, Pedestrian, Player, SkidMark, Vehicle, StreetProp, FluidStainType, Roundabout } from './types';
import { getBuildingLayout, constrainPlayerToInterior } from './buildingInteriors';
import { sound } from './audio';
import { trafficDiagnostics, isVehicleDisabledOrCrashed } from './aiTraffic';
import { performanceConfig } from './performanceConfig';
import { createDefaultPlayerInventory, addPlayerNotification, getPlayerTotalCarriedWeight } from './items';
import { defaultBodyState } from './sensations';
import { updateBodySystem, distributeImpactDamage, applyDriverVehicleCrashTrauma, addInjuryToPart } from './bodySystem';
import { updateMedicineSystem } from './medicineSystem';
import { GuardrailPhysics } from './guardrailPhysics';
import { AGRICULTURAL_FIELDS, getTerrainSlope } from './terrainElevation';
import { getRiverWaterAt, getUniversalWaterDepthAt } from './riverSystem';
import { getBiomeSampleAt } from './biomeSystem';

export interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  depth: number;
}

function angleDiff(a: number, b: number): number {
  let diff = (a - b) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

const GAS_STATION_STRUCTURAL_SUB_BOXES = [
  // Island 0 (West fuel island, pumps & support pillars)
  { x: 5003, y: 5190, width: 34, height: 180 },
  // Island 1 (East fuel island, pumps & support pillars)
  { x: 5143, y: 5190, width: 34, height: 180 },
  // Island 2 (LPG Gas Island, Propane Storage Tank & Dispenser)
  { x: 4950, y: 4923, width: 180, height: 34 },
  // Price Totem on corner lawn
  { x: 4872, y: 4872, width: 16, height: 16 }
];

export interface VehicleCollisionOBB {
  centerX: number;
  centerY: number;
  halfL: number;
  halfW: number;
  angle: number;
  corners: { x: number; y: number }[];
  axes: { x: number; y: number }[];
}

export function isArticulatedRoller(car: Vehicle): boolean {
  return car.type === 'roller_heavy_tandem' || car.type === 'roller_compact_sidewalk' || car.type === 'roller_pneumatic';
}

export function getVehicleCollisionOBBs(car: Vehicle, extraMargin = 0.5): VehicleCollisionOBB[] {
  const effL = car.length - (car.damage ? (car.damage.frontCrumple + car.damage.rearCrumple) / 2 : 0);
  const effW = car.width - (car.damage ? (car.damage.leftDent + car.damage.rightDent) / 2 : 0);

  if (isArticulatedRoller(car) && Math.abs(car.steerAngle || 0) > 0.001) {
    const gamma = car.steerAngle || 0;
    const rearL = effL * 0.50;
    const frontL = effL * 0.50;

    const rearHalfL = rearL / 2 + extraMargin;
    const rearHalfW = effW / 2 + extraMargin;
    const rearAngle = car.angle;
    const cosR = Math.cos(rearAngle);
    const sinR = Math.sin(rearAngle);
    const rearCenterX = car.x + cosR * (-rearL / 2);
    const rearCenterY = car.y + sinR * (-rearL / 2);

    const rearCorners = [
      { x: rearCenterX + cosR * rearHalfL - sinR * rearHalfW, y: rearCenterY + sinR * rearHalfL + cosR * rearHalfW },
      { x: rearCenterX + cosR * rearHalfL + sinR * rearHalfW, y: rearCenterY + sinR * rearHalfL - cosR * rearHalfW },
      { x: rearCenterX - cosR * rearHalfL + sinR * rearHalfW, y: rearCenterY - sinR * rearHalfL - cosR * rearHalfW },
      { x: rearCenterX - cosR * rearHalfL - sinR * rearHalfW, y: rearCenterY - sinR * rearHalfL + cosR * rearHalfW }
    ];

    const frontHalfL = frontL / 2 + extraMargin;
    const frontHalfW = effW / 2 + extraMargin;
    const frontAngle = car.angle + gamma;
    const cosF = Math.cos(frontAngle);
    const sinF = Math.sin(frontAngle);
    const frontCenterX = car.x + cosF * (frontL / 2);
    const frontCenterY = car.y + sinF * (frontL / 2);

    const frontCorners = [
      { x: frontCenterX + cosF * frontHalfL - sinF * frontHalfW, y: frontCenterY + sinF * frontHalfL + cosF * frontHalfW },
      { x: frontCenterX + cosF * frontHalfL + sinF * frontHalfW, y: frontCenterY + sinF * frontHalfL - cosF * frontHalfW },
      { x: frontCenterX - cosF * frontHalfL + sinF * frontHalfW, y: frontCenterY - sinF * frontHalfL - cosF * frontHalfW },
      { x: frontCenterX - cosF * frontHalfL - sinF * frontHalfW, y: frontCenterY - sinF * frontHalfL + cosF * frontHalfW }
    ];

    return [
      {
        centerX: rearCenterX,
        centerY: rearCenterY,
        halfL: rearHalfL,
        halfW: rearHalfW,
        angle: rearAngle,
        corners: rearCorners,
        axes: [{ x: cosR, y: sinR }, { x: -sinR, y: cosR }]
      },
      {
        centerX: frontCenterX,
        centerY: frontCenterY,
        halfL: frontHalfL,
        halfW: frontHalfW,
        angle: frontAngle,
        corners: frontCorners,
        axes: [{ x: cosF, y: sinF }, { x: -sinF, y: cosF }]
      }
    ];
  }

  const halfL = effL / 2 + extraMargin;
  const halfW = effW / 2 + extraMargin;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const corners = [
    { x: car.x + cosA * halfL - sinA * halfW, y: car.y + sinA * halfL + cosA * halfW },
    { x: car.x + cosA * halfL + sinA * halfW, y: car.y + sinA * halfL - cosA * halfW },
    { x: car.x - cosA * halfL + sinA * halfW, y: car.y - sinA * halfL - cosA * halfW },
    { x: car.x - cosA * halfL - sinA * halfW, y: car.y - sinA * halfL + cosA * halfW }
  ];

  return [
    {
      centerX: car.x,
      centerY: car.y,
      halfL,
      halfW,
      angle: car.angle,
      corners,
      axes: [{ x: cosA, y: sinA }, { x: -sinA, y: cosA }]
    }
  ];
}

export function checkOBBBoxCollision(
  obb: VehicleCollisionOBB,
  box: { x: number; y: number; width: number; height: number }
): CollisionResult {
  const cornersB = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height }
  ];

  const axes = [
    obb.axes[0],
    obb.axes[1],
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ];

  let minOverlap = 999999;
  let smallestAxisX = 0;
  let smallestAxisY = 0;

  for (const axis of axes) {
    let minA = 999999;
    let maxA = -999999;
    for (const p of obb.corners) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    let minB = 999999;
    let maxB = -999999;
    for (const p of cornersB) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) {
      return { collided: false, normalX: 0, normalY: 0, depth: 0 };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxisX = axis.x;
      smallestAxisY = axis.y;
    }
  }

  const bCenterX = box.x + box.width / 2;
  const bCenterY = box.y + box.height / 2;
  const dirX = obb.centerX - bCenterX;
  const dirY = obb.centerY - bCenterY;
  if (dirX * smallestAxisX + dirY * smallestAxisY < 0) {
    smallestAxisX = -smallestAxisX;
    smallestAxisY = -smallestAxisY;
  }

  return {
    collided: true,
    normalX: smallestAxisX,
    normalY: smallestAxisY,
    depth: minOverlap
  };
}

export function checkCarBoxCollision(
  car: Vehicle,
  box: { x: number; y: number; width: number; height: number }
): CollisionResult {
  const obbs = getVehicleCollisionOBBs(car, 0);
  let bestResult: CollisionResult = { collided: false, normalX: 0, normalY: 0, depth: 0 };
  let maxDepth = 0;

  for (const obb of obbs) {
    const res = checkOBBBoxCollision(obb, box);
    if (res.collided && res.depth > maxDepth) {
      maxDepth = res.depth;
      bestResult = res;
    }
  }

  return bestResult;
}

// Check intersection between rotated car box and AABB building using SAT
export function checkCarBuildingCollision(car: Vehicle, building: Building): CollisionResult {
  if (building.type === 'garage_ramp' || (building as any).garageSubtype === 'ramp') {
    return { collided: false, normalX: 0, normalY: 0, depth: 0 };
  }

  if (building.type === 'gas_station_canopy'|| building.type === 'gas_station_island') {
    for (const sub of GAS_STATION_STRUCTURAL_SUB_BOXES) {
      const res = checkCarBoxCollision(car, sub);
      if (res.collided) {
        return res;
      }
    }
    return { collided: false, normalX: 0, normalY: 0, depth: 0 };
  }

  return checkCarBoxCollision(car, building);
}

export function checkPedestrianBoxCollision(
  px: number,
  py: number,
  radius: number,
  box: { x: number; y: number; width: number; height: number }
): { x: number; y: number; collided: boolean } {
  const closestX = Math.max(box.x, Math.min(px, box.x + box.width));
  const closestY = Math.max(box.y, Math.min(py, box.y + box.height));

  const distX = px - closestX;
  const distY = py - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < radius * radius && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    const nx = distX / dist;
    const ny = distY / dist;
    return {
      x: px + nx * overlap,
      y: py + ny * overlap,
      collided: true
    };
  } else if (distSq <= 0.0001) {
    // Inside box, push out towards nearest edge
    const dLeft = px - box.x;
    const dRight = (box.x + box.width) - px;
    const dTop = py - box.y;
    const dBottom = (box.y + box.height) - py;
    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dLeft) return { x: box.x - radius, y: py, collided: true };
    if (minD === dRight) return { x: box.x + box.width + radius, y: py, collided: true };
    if (minD === dTop) return { x: px, y: box.y - radius, collided: true };
    return { x: px, y: box.y + box.height + radius, collided: true };
  }

  return { x: px, y: py, collided: false };
}

// Circle-AABB / Circle-Circle collision for pedestrian against building
export function checkPedestrianBuildingCollision(
  px: number,
  py: number,
  radius: number,
  building: Building
): { x: number; y: number; collided: boolean } {
  if (building.type === 'garage_ramp' || (building as any).garageSubtype === 'ramp') {
    return { x: px, y: py, collided: false };
  }

  if (building.type === 'gas_station_canopy'|| building.type === 'gas_station_island') {
    let currentX = px;
    let currentY = py;
    let collidedAny = false;
    for (const sub of GAS_STATION_STRUCTURAL_SUB_BOXES) {
      const res = checkPedestrianBoxCollision(currentX, currentY, radius, sub);
      if (res.collided) {
        currentX = res.x;
        currentY = res.y;
        collidedAny = true;
      }
    }
    return { x: currentX, y: currentY, collided: collidedAny };
  }

  if (building.type === 'park_monument') {
    const cx = building.x + building.width / 2;
    const cy = building.y + building.height / 2;
    const fountainRadius = building.width / 2;
    const dx = px - cx;
    const dy = py - cy;
    const distSq = dx * dx + dy * dy;
    const minSafeDist = fountainRadius + radius;

    if (distSq < minSafeDist * minSafeDist) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        return {
          x: cx + (dx / dist) * minSafeDist,
          y: cy + (dy / dist) * minSafeDist,
          collided: true
        };
      } else {
        return {
          x: cx + minSafeDist,
          y: cy,
          collided: true
        };
      }
    }
    return { x: px, y: py, collided: false };
  }

  const closestX = Math.max(building.x, Math.min(px, building.x + building.width));
  const closestY = Math.max(building.y, Math.min(py, building.y + building.height));

  const distX = px - closestX;
  const distY = py - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < radius * radius && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    const nx = distX / dist;
    const ny = distY / dist;
    return {
      x: px + nx * overlap,
      y: py + ny * overlap,
      collided: true
    };
  } else if (distSq <= 0.0001) {
    // Inside building, push out towards nearest edge
    const dLeft = px - building.x;
    const dRight = (building.x + building.width) - px;
    const dTop = py - building.y;
    const dBottom = (building.y + building.height) - py;
    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dLeft) return { x: building.x - radius, y: py, collided: true };
    if (minD === dRight) return { x: building.x + building.width + radius, y: py, collided: true };
    if (minD === dTop) return { x: px, y: building.y - radius, collided: true };
    return { x: px, y: building.y + building.height + radius, collided: true };
  }

  return { x: px, y: py, collided: false };
}

// Circle-OBB (Oriented Bounding Box) collision for pedestrian against vehicle
export function checkPedestrianVehicleCollision(
  px: number,
  py: number,
  radius: number,
  car: Vehicle
): { x: number; y: number; collided: boolean } {
  const obbs = getVehicleCollisionOBBs(car, 0);
  let curX = px;
  let curY = py;
  let hasCollided = false;

  for (const obb of obbs) {
    const dx = curX - obb.centerX;
    const dy = curY - obb.centerY;
    const cosA = Math.cos(obb.angle);
    const sinA = Math.sin(obb.angle);

    const localX = dx * cosA + dy * sinA;
    const localY = -dx * sinA + dy * cosA;

    const closestX = Math.max(-obb.halfL, Math.min(localX, obb.halfL));
    const closestY = Math.max(-obb.halfW, Math.min(localY, obb.halfW));

    const diffX = localX - closestX;
    const diffY = localY - closestY;
    const distSq = diffX * diffX + diffY * diffY;

    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;

      const localPushX = (diffX / dist) * overlap;
      const localPushY = (diffY / dist) * overlap;

      const pushX = localPushX * cosA - localPushY * sinA;
      const pushY = localPushX * sinA + localPushY * cosA;

      curX += pushX;
      curY += pushY;
      hasCollided = true;
    } else if (distSq <= 0.0001) {
      const dLeft = localX + obb.halfL;
      const dRight = obb.halfL - localX;
      const dTop = localY + obb.halfW;
      const dBottom = obb.halfW - localY;
      const minD = Math.min(dLeft, dRight, dTop, dBottom);

      let localPushX = 0;
      let localPushY = 0;

      if (minD === dLeft) {
        localPushX = -(radius + dLeft);
      } else if (minD === dRight) {
        localPushX = radius + dRight;
      } else if (minD === dTop) {
        localPushY = -(radius + dTop);
      } else {
        localPushY = radius + dBottom;
      }

      const pushX = localPushX * cosA - localPushY * sinA;
      const pushY = localPushX * sinA + localPushY * cosA;

      curX += pushX;
      curY += pushY;
      hasCollided = true;
    }
  }

  return { x: curX, y: curY, collided: hasCollided };
}

// --- EXACT ORIENTED BOUNDING BOX (OBB) SAT COLLISION DETECTION ---
export interface VehicleCollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  overlap: number;
  contactX: number;
  contactY: number;
}

export function getCarCorners(car: Vehicle, extraMargin = 1.0) {
  const obbs = getVehicleCollisionOBBs(car, extraMargin);
  const allCorners: { x: number; y: number }[] = [];
  for (const obb of obbs) {
    for (const c of obb.corners) {
      allCorners.push(c);
    }
  }
  return allCorners;
}

export function isPointInsideCar(px: number, py: number, car: Vehicle): boolean {
  const obbs = getVehicleCollisionOBBs(car, 1.5);
  for (const obb of obbs) {
    const dx = px - obb.centerX;
    const dy = py - obb.centerY;
    const cosA = Math.cos(obb.angle);
    const sinA = Math.sin(obb.angle);
    const localX = dx * cosA + dy * sinA;
    const localY = -dx * sinA + dy * cosA;
    if (Math.abs(localX) <= obb.halfL && Math.abs(localY) <= obb.halfW) {
      return true;
    }
  }
  return false;
}

export function checkOBBOBBCollision(
  obbA: VehicleCollisionOBB,
  obbB: VehicleCollisionOBB
): { collided: boolean; normalX: number; normalY: number; overlap: number } {
  const axes = [
    obbA.axes[0],
    obbA.axes[1],
    obbB.axes[0],
    obbB.axes[1]
  ];

  let minOverlap = 999999;
  let smallestAxisX = 0;
  let smallestAxisY = 0;

  for (const axis of axes) {
    let minA = 999999;
    let maxA = -999999;
    for (const p of obbA.corners) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    let minB = 999999;
    let maxB = -999999;
    for (const p of obbB.corners) {
      const proj = p.x * axis.x + p.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) {
      return { collided: false, normalX: 0, normalY: 0, overlap: 0 };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxisX = axis.x;
      smallestAxisY = axis.y;
    }
  }

  const cdx = obbB.centerX - obbA.centerX;
  const cdy = obbB.centerY - obbA.centerY;
  const centerDir = cdx * smallestAxisX + cdy * smallestAxisY;
  if (centerDir < 0) {
    smallestAxisX = -smallestAxisX;
    smallestAxisY = -smallestAxisY;
  }

  return {
    collided: true,
    normalX: smallestAxisX,
    normalY: smallestAxisY,
    overlap: minOverlap
  };
}

export function checkVehicleVehicleCollision(carA: Vehicle, carB: Vehicle): VehicleCollisionResult {
  const obbsA = getVehicleCollisionOBBs(carA, 0.8);
  const obbsB = getVehicleCollisionOBBs(carB, 0.8);

  const cdx = carB.x - carA.x;
  const cdy = carB.y - carA.y;
  const radA = Math.max(carA.length, carA.width) * 0.7 + 10;
  const radB = Math.max(carB.length, carB.width) * 0.7 + 10;

  if (cdx * cdx + cdy * cdy > (radA + radB) * (radA + radB)) {
    return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
  }

  let bestCollision: { collided: boolean; normalX: number; normalY: number; overlap: number } | null = null;
  let maxOverlap = 0;

  for (const obbA of obbsA) {
    for (const obbB of obbsB) {
      const res = checkOBBOBBCollision(obbA, obbB);
      if (res.collided && res.overlap > maxOverlap) {
        maxOverlap = res.overlap;
        bestCollision = res;
      }
    }
  }

  if (!bestCollision || !bestCollision.collided) {
    return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
  }

  // Find contact point from penetrating vertices
  let contactX = 0;
  let contactY = 0;
  let count = 0;

  for (const obbA of obbsA) {
    for (const p of obbA.corners) {
      if (isPointInsideCar(p.x, p.y, carB)) {
        contactX += p.x;
        contactY += p.y;
        count++;
      }
    }
  }
  for (const obbB of obbsB) {
    for (const p of obbB.corners) {
      if (isPointInsideCar(p.x, p.y, carA)) {
        contactX += p.x;
        contactY += p.y;
        count++;
      }
    }
  }

  if (count > 0) {
    contactX /= count;
    contactY /= count;
  } else {
    contactX = (carA.x + carB.x) / 2;
    contactY = (carA.y + carB.y) / 2;
  }

  return {
    collided: true,
    normalX: bestCollision.normalX,
    normalY: bestCollision.normalY,
    overlap: bestCollision.overlap,
    contactX,
    contactY
  };
}

// --- STREET PROP HITBOX & COLLISION SYSTEM ---
export interface PropHitbox {
  shape: 'circle'| 'box'| 'none';
  radius?: number;
  halfWidth?: number;  // extent along prop.angle (local X)
  halfHeight?: number; // extent perpendicular to prop.angle (local Y)
  isIndestructible?: boolean;
  resistance: number;
  displayNameRu: string;
}

export function getPropHitbox(prop: StreetProp): PropHitbox {
  switch (prop.type) {
    case 'bench':
      return { shape: 'box', halfWidth: 11, halfHeight: 5, resistance: 0.06, displayNameRu: 'скамейка'};
    case 'dumpster':
      return { shape: 'box', halfWidth: 14, halfHeight: 10, resistance: 0.28, displayNameRu: 'мусорный контейнер'};
    case 'flowerbed':
      return { shape: 'box', halfWidth: 12, halfHeight: 8, resistance: 0.12, displayNameRu: 'клумба'};
    case 'bus_stop':
      return { shape: 'box', halfWidth: 19, halfHeight: 11, resistance: 0.24, displayNameRu: 'автобусная остановка'};
    case 'kiosk':
      return { shape: 'box', halfWidth: 13, halfHeight: 13, resistance: 0.38, displayNameRu: 'киоск'};
    case 'mailbox':
      return { shape: 'box', halfWidth: 5, halfHeight: 5, resistance: 0.06, displayNameRu: 'почтовый ящик'};
    case 'playground_swing':
      return { shape: 'box', halfWidth: 12, halfHeight: 6, resistance: 0.15, displayNameRu: 'детские качели'};
    case 'garage_door':
      return { shape: 'box', halfWidth: 11, halfHeight: 5, resistance: 10.0, isIndestructible: true, displayNameRu: 'гаражные ворота'};
    case 'lamp':
      return { shape: 'circle', radius: 3.5, resistance: 0.10, displayNameRu: 'парковый фонарь'};
    case 'lamp_highway':
      return { shape: 'circle', radius: 3.8, resistance: 0.04, displayNameRu: 'автодорожный фонарь'};
    case 'lamp_concrete':
      return { shape: 'box', halfWidth: 4.5, halfHeight: 4.5, resistance: 10.0, isIndestructible: true, displayNameRu: 'старый бетонный столб'};
    case 'hydrant':
      return { shape: 'circle', radius: 4.2, resistance: 0.22, displayNameRu: 'пожарный гидрант'};
    case 'trash_can':
      return { shape: 'circle', radius: 4.0, resistance: 0.05, displayNameRu: 'урна'};
    case 'bollard':
      return { shape: 'circle', radius: 2.8, resistance: 0.03, displayNameRu: 'столбик ограждения'};
    case 'cone':
      return { shape: 'circle', radius: 3.0, resistance: 0.01, displayNameRu: 'дорожный конус'};
    case 'tire_flowerbed':
      return { shape: 'circle', radius: 7.5, resistance: 0.04, displayNameRu: 'клумба из покрышки'};
    case 'traffic_light':
      return { shape: 'circle', radius: 3.2, resistance: 0.08, displayNameRu: 'светофор'};
    case 'manhole':
      return { shape: 'none', resistance: 0, displayNameRu: 'канализационный люк'};
    case 'drain_grate':
      return { shape: 'none', resistance: 0, displayNameRu: 'ливневая решётка'};
    case 'village_well':
      return { shape: 'circle', radius: 11, resistance: 10.0, isIndestructible: true, displayNameRu: 'деревенский колодец'};
    case 'village_sign':
      return { shape: 'box', halfWidth: 10, halfHeight: 3, resistance: 0.15, displayNameRu: 'дорожный указатель'};
    case 'haystack':
      return { shape: 'circle', radius: 14, resistance: 0.05, displayNameRu: 'стог сена'};
    case 'woodpile':
      return { shape: 'box', halfWidth: 12, halfHeight: 6, resistance: 0.18, displayNameRu: 'поленница дров'};
    case 'rustic_car_wreck':
      return { shape: 'box', halfWidth: 20, halfHeight: 10, resistance: 10.0, isIndestructible: true, displayNameRu: 'ржавый остов машины'};
    case 'concrete_barrier':
      return { shape: 'box', halfWidth: 16, halfHeight: 6, resistance: 10.0, isIndestructible: true, displayNameRu: 'бетонный блок'};
    case 'concrete_fence_po2':
      return { shape: 'box', halfWidth: 19, halfHeight: 6, resistance: 10.0, isIndestructible: true, displayNameRu: 'бетонный забор ПО-2'};
    case 'power_pole':
      return { shape: 'circle', radius: 3.2, resistance: 10.0, isIndestructible: true, displayNameRu: 'деревянный столб ЛЭП'};
    case 'shipping_container':
      return { shape: 'box', halfWidth: 26, halfHeight: 12, resistance: 10.0, isIndestructible: true, displayNameRu: 'грузовой контейнер'};
    case 'pallet_stack':
      return { shape: 'box', halfWidth: 10, halfHeight: 8, resistance: 0.12, displayNameRu: 'стопка деревянных поддонов'};
    case 'industrial_tank':
      return { shape: 'box', halfWidth: 22, halfHeight: 12, resistance: 10.0, isIndestructible: true, displayNameRu: 'резервуар ГСМ'};
    case 'silo_tank':
      return { shape: 'circle', radius: 16, resistance: 10.0, isIndestructible: true, displayNameRu: 'силосная башня'};
    case 'cable_spool':
      return { shape: 'circle', radius: 9, resistance: 0.35, displayNameRu: 'кабельный барабан'};
    case 'security_barrier':
      return { shape: 'box', halfWidth: 12, halfHeight: 3, resistance: 0.15, displayNameRu: 'шлагбаум КПП'};
    case 'industrial_floodlight':
      return { shape: 'box', halfWidth: 5, halfHeight: 5, resistance: 10.0, isIndestructible: true, displayNameRu: 'прожекторная мачта'};
    case 'industrial_tires':
      return { shape: 'circle', radius: 10, resistance: 0.45, displayNameRu: 'штабель карьерных шин'};
    case 'scrap_pile':
      return { shape: 'circle', radius: 12, resistance: 0.60, displayNameRu: 'куча металлолома'};
    case 'industrial_sign':
      return { shape: 'box', halfWidth: 8, halfHeight: 3, resistance: 0.10, displayNameRu: 'щит-указатель'};
    case 'industrial_pipe':
      return { shape: 'box', halfWidth: 16, halfHeight: 4, resistance: 10.0, isIndestructible: true, displayNameRu: 'эстакада трубопровода'};
    case 'fence_wood_vertical':
      return { shape: 'box', halfWidth: 18, halfHeight: 3.5, resistance: 0.85, displayNameRu: 'деревянный штакетник'};
    case 'fence_metal_vertical':
      return { shape: 'box', halfWidth: 18, halfHeight: 3.5, resistance: 1.80, displayNameRu: 'забор из профнастила'};
    case 'cottage_gate':
      return { shape: 'box', halfWidth: 36, halfHeight: 4.5, resistance: 2.20, displayNameRu: 'въездные ворота'};
    case 'wicket_gate':
      return { shape: 'box', halfWidth: 12, halfHeight: 2.5, resistance: 0.15, displayNameRu: 'калитка'};
    case 'garden_path_tile':
      return { shape: 'none', resistance: 0, displayNameRu: 'садовая дорожка'};
    case 'garage_sofa':
      return { shape: 'box', halfWidth: 10, halfHeight: 6, resistance: 0.35, displayNameRu: 'гаражный диван' };
    case 'garage_workbench':
      return { shape: 'box', halfWidth: 12, halfHeight: 6, resistance: 0.75, displayNameRu: 'верстак с тисками' };
    case 'garage_dirt_pile':
    case 'garage_sand_pile':
      return { shape: 'circle', radius: 10, resistance: 0.20, displayNameRu: 'куча грунта' };
    case 'garage_tires_heap':
      return { shape: 'circle', radius: 12, resistance: 0.40, displayNameRu: 'горка старых шин' };
    case 'garage_scrap_metal':
      return { shape: 'circle', radius: 13, resistance: 0.65, displayNameRu: 'свалка металлолома' };
    case 'tarp_covered_car':
      return { shape: 'box', halfWidth: 20, halfHeight: 10, resistance: 1.80, isIndestructible: true, displayNameRu: 'машина под брезентом' };
    case 'car_on_blocks':
      return { shape: 'box', halfWidth: 19, halfHeight: 9, resistance: 1.80, isIndestructible: true, displayNameRu: 'автомобиль на колодках' };
    case 'oil_barrel_cluster':
      return { shape: 'circle', radius: 10, resistance: 0.45, displayNameRu: 'бочки из-под масел' };
    case 'garage_trash_heap':
      return { shape: 'circle', radius: 10, resistance: 0.25, displayNameRu: 'куча мусора' };
    default:
      return { shape: 'circle', radius: 3.0, resistance: 0.05, displayNameRu: 'уличный объект'};
  }
}

export function checkPropVehicleCollision(
  prop: StreetProp,
  veh: Vehicle
): { collided: boolean; pushX: number; pushY: number; contactX: number; contactY: number; overlap: number } {
  const hitbox = getPropHitbox(prop);
  if (hitbox.shape === 'none') {
    return { collided: false, pushX: 0, pushY: 0, contactX: prop.x, contactY: prop.y, overlap: 0 };
  }

  if (hitbox.shape === 'circle') {
    const res = checkPedestrianVehicleCollision(prop.x, prop.y, hitbox.radius!, veh);
    if (res.collided) {
      const pushX = res.x - prop.x;
      const pushY = res.y - prop.y;
      const overlap = Math.hypot(pushX, pushY);
      return {
        collided: true,
        pushX,
        pushY,
        contactX: (prop.x + res.x) / 2,
        contactY: (prop.y + res.y) / 2,
        overlap
      };
    }
    return { collided: false, pushX: 0, pushY: 0, contactX: prop.x, contactY: prop.y, overlap: 0 };
  }

  // Box hitbox vs Vehicle OBB using 2D Separating Axis Theorem (SAT)
  const halfHW = hitbox.halfWidth!;
  const halfHH = hitbox.halfHeight!;
  const pAngle = prop.angle || 0;
  const cosP = Math.cos(pAngle);
  const sinP = Math.sin(pAngle);

  // Broadphase radius check
  const propRad = Math.hypot(halfHW, halfHH);
  const vehRad = Math.hypot(veh.length / 2, veh.width / 2);
  const cdx = veh.x - prop.x;
  const cdy = veh.y - prop.y;
  if (cdx * cdx + cdy * cdy > (propRad + vehRad) * (propRad + vehRad)) {
    return { collided: false, pushX: 0, pushY: 0, contactX: prop.x, contactY: prop.y, overlap: 0 };
  }

  // 4 corners of prop in world space
  const propCorners = [
    { x: prop.x + cosP * halfHW - sinP * halfHH, y: prop.y + sinP * halfHW + cosP * halfHH },
    { x: prop.x + cosP * halfHW + sinP * halfHH, y: prop.y + sinP * halfHW - cosP * halfHH },
    { x: prop.x - cosP * halfHW + sinP * halfHH, y: prop.y - sinP * halfHW - cosP * halfHH },
    { x: prop.x - cosP * halfHW - sinP * halfHH, y: prop.y - sinP * halfHW + cosP * halfHH }
  ];

  const vehObbs = getVehicleCollisionOBBs(veh, 0.6);
  const vehCorners = getCarCorners(veh, 0.6);
  const testAxes: { x: number; y: number }[] = [
    { x: cosP, y: sinP },
    { x: -sinP, y: cosP }
  ];
  for (const obb of vehObbs) {
    testAxes.push(obb.axes[0], obb.axes[1]);
  }

  let minOverlap = Infinity;
  let normalX = 0;
  let normalY = 0;

  for (const axis of testAxes) {
    let minA = Infinity, maxA = -Infinity;
    for (const c of propCorners) {
      const proj = c.x * axis.x + c.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    let minB = Infinity, maxB = -Infinity;
    for (const c of vehCorners) {
      const proj = c.x * axis.x + c.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) {
      return { collided: false, pushX: 0, pushY: 0, contactX: prop.x, contactY: prop.y, overlap: 0 };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      normalX = axis.x;
      normalY = axis.y;
    }
  }

  // Ensure normal points from prop toward vehicle
  const dirDot = cdx * normalX + cdy * normalY;
  if (dirDot < 0) {
    normalX = -normalX;
    normalY = -normalY;
  }

  return {
    collided: true,
    pushX: normalX * minOverlap,
    pushY: normalY * minOverlap,
    contactX: prop.x + normalX * (halfHW + halfHH) * 0.4,
    contactY: prop.y + normalY * (halfHW + halfHH) * 0.4,
    overlap: minOverlap
  };
}

// --- DYNAMIC DAMAGE & DEFORMATION APPLICATION ---
export function applyVehicleDamageAndDeformation(
  car: Vehicle,
  contactX: number,
  contactY: number,
  impactSpeed: number,
  scrapeSpeed: number,
  world: GameWorld,
  strikerMass: number = 1400,
  isNarrowImpact: boolean = false
) {
  car.damage = ensureVehicleDamage(car);
  if (!car.engineState) {
    car.engineState = createDefaultEngineState(car.type);
  }
  if (!car.fuelSystem) {
    car.fuelSystem = createDefaultFuelSystem(car.type);
  }
  ensureVehicleFluidTank(car);

  const now = performance.now() / 1000;

  // Real-world automobile safety threshold: Modern polyurethane/foam bumpers absorb very gentle nudges
  // (< 18 px/s) completely without structural metal crumple or mechanical shock.
  if (impactSpeed < 18 && scrapeSpeed < 18) {
    if (scrapeSpeed > 12 && car.damage.scratches.length < 10) {
      const dx = contactX - car.x;
      const dy = contactY - car.y;
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);
      const localX = dx * cosA + dy * sinA;
      const localY = -dx * sinA + dy * cosA;
      const halfL = car.length / 2;
      const halfW = car.width / 2;
      car.damage.scratches.push({
        x: Math.max(-halfL + 2, Math.min(halfL - 2, localX)),
        y: Math.max(-halfW + 1, Math.min(halfW - 1, localY)),
        length: 2 + Math.random() * 5,
        angle: (Math.random() - 0.5) * 0.4,
        depth: 0.1
      });
    }
    return;
  }

  // Damage Cooldown Protection (shortened so multi-car pileups or repeated hard wall impacts register properly)
  if (car.lastDamageTime && now - car.lastDamageTime < 0.12) {
    return;
  }
  car.lastDamageTime = now;

  const dmg = car.damage;
  const eng = car.engineState;
  const fuel = car.fuelSystem;
  const halfL = car.length / 2;
  const halfW = car.width / 2;

  // Local coordinates relative to car center & heading
  const dx = contactX - car.x;
  const dy = contactY - car.y;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const localX = dx * cosA + dy * sinA;  // +halfL = front, -halfL = rear
  const localY = -dx * sinA + dy * cosA; // -halfW = left, +halfW = right

  const normX = Math.max(-1, Math.min(1, localX / halfL));
  const normY = Math.max(-1, Math.min(1, localY / halfW));

  // Dynamic Mass & Kinetic Momentum Factor
  const isExtremeStriker = strikerMass >= 40000;
  const maxMassRatioLimit = isExtremeStriker ? 45.0 : 3.5;
  const massRatio = Math.max(0.5, Math.min(maxMassRatioLimit, strikerMass / car.mass));
  const effectiveSpeed = impactSpeed * Math.sqrt(massRatio);

  const isHeavyRigidTrailer = car.type.startsWith('trailer_semi');
  const isMachinery = isRoadMachinery(car.type);

  if ((isHeavyRigidTrailer || isMachinery) && impactSpeed < 45 && scrapeSpeed < 45) {
    return; // Heavy I-beam chassis / heavy cast iron road machinery does not dent or deform from minor nudges or scrapes
  }

  // Realistic Impact Severity calculation:
  // Non-linear kinetic energy scaling: starts scaling from 18 px/s up to 108 px/s.
  // Using quadratic curve to model E_k = 1/2 * m * v^2 so high-speed impacts are catastrophic and low-speed are minor.
  const speedProgress = Math.max(0, effectiveSpeed - 18) / 90;
  let severity = Math.min(1.0, Math.pow(speedProgress, 1.6));
  if ((car as any).hasHeavySuspension) {
    severity *= 0.6; // Heavy-duty Bilstein suspension absorbs 40% of the shock energy!
  }
  if (isHeavyRigidTrailer) {
    severity *= 0.12; // Massive heavy-duty industrial trailer frame absorbs shocks
  }
  if (isMachinery) {
    severity *= 0.05; // Heavy steel plate ballast chassis on rollers absorbs impacts without softbody crumpling
  }

  // 1. Realistic Directional Softbody Mass-Spring Network with Plastic Strain & Poisson Wrinkling
  if (dmg.deformedVertices && impactSpeed > ((isHeavyRigidTrailer || isMachinery) ? 45 : 18)) {
    let pushStrength = Math.min(isExtremeStriker ? 32.0 : 6.5, (effectiveSpeed / 60) * 2.8 * Math.sqrt(massRatio));
    if (isHeavyRigidTrailer) {
      pushStrength *= 0.10; // Semi-trailer structural steel rails have massive yield resistance
    }
    if (isMachinery) {
      pushStrength *= 0.05; // Heavy road compaction machinery steel frame resists denting
    }
    
    // Determine local impact vector in car local coordinates
    const contactDist = Math.hypot(localX, localY) || 1;
    let impulseX = -localX / contactDist;
    let impulseY = -localY / contactDist;

    // Add tangential scrape component if scraping along surface
    if (scrapeSpeed > 12) {
      const tangentX = -impulseY;
      const tangentY = impulseX;
      impulseX = impulseX * 0.7 + tangentX * 0.35;
      impulseY = impulseY * 0.7 + tangentY * 0.35;
      const impLen = Math.hypot(impulseX, impulseY) || 1;
      impulseX /= impLen;
      impulseY /= impLen;
    }

    // Find closest vertex node index
    let closestIdx = 0;
    let minNodeDist = 999999;
    const totalNodes = dmg.deformedVertices.length;
    for (let i = 0; i < totalNodes; i++) {
      const v = dmg.deformedVertices[i];
      const curX = v.localX + v.offsetX;
      const curY = v.localY + v.offsetY;
      const dist = Math.hypot(curX - localX, curY - localY);
      if (dist < minNodeDist) {
        minNodeDist = dist;
        closestIdx = i;
      }
    }

    // Propagate plastic strain and elastic jiggle through softbody node lattice
    const maxOffsetReach = isExtremeStriker ? 8 : 4;
    for (let offset = -maxOffsetReach; offset <= maxOffsetReach; offset++) {
      const idx = (closestIdx + offset + totalNodes) % totalNodes;
      const v = dmg.deformedVertices[idx];
      const len = Math.hypot(v.localX, v.localY) || 1;
      
      // Node structural stiffness resistance multiplier based on panel type
      const structStiffness = v.structuralType === 'door'? 0.75 :
                              (v.structuralType === 'quarter'? 0.85 :
                              (v.structuralType === 'fender'? 1.0 : 1.25));

      const absOffset = Math.abs(offset);
      let weight = 0;
      let isPoissonBulge = false;

      if (absOffset === 0) {
        weight = 1.0;
      } else if (absOffset === 1) {
        weight = 0.75 * structStiffness;
      } else if (absOffset === 2) {
        weight = 0.50 * structStiffness;
      } else if (absOffset === 3 || absOffset === 4) {
        // POISSON OUTWARD METAL WRINKLE / BULGE: Metal volume is conserved!
        weight = isExtremeStriker ? 0.35 * structStiffness : 0.18 * severity; 
        isPoissonBulge = !isExtremeStriker;
      } else if (isExtremeStriker) {
        weight = 0.20 * structStiffness;
      }

      if (weight !== 0) {
        let nodeImpulseX = impulseX;
        let nodeImpulseY = impulseY;

        if (isPoissonBulge) {
          const outNormX = v.localX / len;
          const outNormY = v.localY / len;
          nodeImpulseX = outNormX;
          nodeImpulseY = outNormY;
        }

        const deltaPush = pushStrength * weight;
        const maxOffset = (isHeavyRigidTrailer || isMachinery) ? 1.0 : isExtremeStriker ? Math.min(38.0, Math.max(16.0, len * 0.85)) : Math.min(10.0, Math.max(2.5, len * 0.32));

        // Apply permanent plastic offset with progressive multi-frame crumple targets
        const currentTargetX = v.targetOffsetX !== undefined && isFinite(v.targetOffsetX) ? v.targetOffsetX : (isFinite(v.offsetX) ? v.offsetX : 0);
        const currentTargetY = v.targetOffsetY !== undefined && isFinite(v.targetOffsetY) ? v.targetOffsetY : (isFinite(v.offsetY) ? v.offsetY : 0);
        let newTargetX = currentTargetX + nodeImpulseX * deltaPush;
        let newTargetY = currentTargetY + nodeImpulseY * deltaPush;
        const newLen = Math.hypot(newTargetX, newTargetY);

        if (newLen > maxOffset) {
          newTargetX = (newTargetX / newLen) * maxOffset;
          newTargetY = (newTargetY / newLen) * maxOffset;
        }

        v.targetOffsetX = newTargetX;
        v.targetOffsetY = newTargetY;
        // Apply initial partial step so the impact registers immediately
        const stepRatio = isExtremeStriker ? 0.65 : 0.25;
        v.offsetX = v.offsetX + (newTargetX - v.offsetX) * stepRatio;
        v.offsetY = v.offsetY + (newTargetY - v.offsetY) * stepRatio;

        // Hard bound check for offset values
        const curOffLen = Math.hypot(v.offsetX, v.offsetY);
        if (curOffLen > maxOffset) {
          v.offsetX = (v.offsetX / curOffLen) * maxOffset;
          v.offsetY = (v.offsetY / curOffLen) * maxOffset;
        }

        if (!isFinite(v.targetOffsetX)) v.targetOffsetX = 0;
        if (!isFinite(v.targetOffsetY)) v.targetOffsetY = 0;
        if (!isFinite(v.offsetX)) v.offsetX = 0;
        if (!isFinite(v.offsetY)) v.offsetY = 0;

        // Accumulate plastic strain (metal yield & crease severity)
        const strainAdd = Math.abs(deltaPush) / (len * 0.25);
        v.plasticStrain = Math.min(2.0, (v.plasticStrain || 0) + strainAdd);

        // Inject transient elastic jiggle velocity impulse
        const jiggleStrength = Math.min(16.0, severity * 16.0 * Math.abs(weight));
        v.velX = Math.max(-30, Math.min(30, (v.velX || 0) + nodeImpulseX * jiggleStrength));
        v.velY = Math.max(-30, Math.min(30, (v.velY || 0) + nodeImpulseY * jiggleStrength));

        if (!isFinite(v.offsetX)) v.offsetX = 0;
        if (!isFinite(v.offsetY)) v.offsetY = 0;
      }
    }

    // Calculate asymmetric plastic strain & update softbody frame mechanics
    let strainFL = 0, strainFR = 0, strainRL = 0, strainRR = 0;
    for (let i = 0; i < totalNodes; i++) {
      const st = dmg.deformedVertices[i]?.plasticStrain || 0;
      if (i >= 14 || i <= 1) strainFR += st;
      else if (i >= 2 && i <= 5) strainFL += st;
      else if (i >= 6 && i <= 9) strainRL += st;
      else strainRR += st;
    }

    // Frame twist angle drift
    const frontAsym = (strainFL - strainFR);
    if (Math.abs(frontAsym) > 0.12 || isExtremeStriker) {
      dmg.steeringDrift = Math.max(-1.0, Math.min(1.0, dmg.steeringDrift + frontAsym * 0.4 + (isExtremeStriker ? (Math.random() - 0.5) * 0.8 : 0)));
      dmg.frameBentAngle = (dmg.frameBentAngle || 0) + frontAsym * 0.08 + (isExtremeStriker ? (Math.random() - 0.5) * 0.25 : 0);
    }

    // Buckled hood elevation
    // Safe index access for polygon vertices
    const frontTotalStrain = 
      (dmg.deformedVertices[0]?.plasticStrain || 0) + 
      (dmg.deformedVertices[1]?.plasticStrain || 0) + 
      (dmg.deformedVertices[2]?.plasticStrain || 0) + 
      (dmg.deformedVertices[18]?.plasticStrain || 0) + 
      (dmg.deformedVertices[19]?.plasticStrain || 0);
    if (frontTotalStrain > 0.25 || isExtremeStriker) {
      dmg.hoodBuckled = true;
      dmg.hoodRaisedAmount = Math.min(1.0, Math.max(isExtremeStriker ? 0.85 : 0, frontTotalStrain * 0.65));
    }

    // Sagging bumper corners
    if ((dmg.deformedVertices[3]?.plasticStrain || 0) > 0.4) dmg.bumperSagLeft = Math.min(1.0, (dmg.deformedVertices[3]?.plasticStrain || 0) * 0.8);
    if ((dmg.deformedVertices[17]?.plasticStrain || 0) > 0.4) dmg.bumperSagRight = Math.min(1.0, (dmg.deformedVertices[17]?.plasticStrain || 0) * 0.8);

    // Wheel well clearance check & wheel rub resistance
    const checkWheelRub = (nodeIdx: number) => {
      const v = dmg.deformedVertices?.[nodeIdx];
      if (!v) return;
      const offsetMag = Math.hypot(v.offsetX || 0, v.offsetY || 0);
      if (offsetMag > 3.5) {
        dmg.wheelRubResistance += (offsetMag - 3.5) * 4.0;
      }
    };
    checkWheelRub(3);  // Front-Left wheel well
    checkWheelRub(17); // Front-Right wheel well
    checkWheelRub(7);  // Rear-Left wheel well
    checkWheelRub(13); // Rear-Right wheel well
  }

  const isTrailer = isTrailerVehicle(car);

  // 2. Structural crumple & component damage logic (Radiator, Oil pan, Fuel tank, Suspension, Engine & Transmission)
  const crushFactor = severity * (1.2 + severity * 1.8) * Math.sqrt(massRatio) * (isExtremeStriker ? 1.5 : 0.4);

  if (normX > 0.20 && impactSpeed > 20) {
    // --- FRONTAL COLLISION ---
    const maxFrontCrush = isMachinery ? 1.2 : (isExtremeStriker ? halfL * 0.75 : halfL * 0.24); // Massive crushing under multi-ton striker
    dmg.frontCrumple = Math.min(maxFrontCrush, dmg.frontCrumple + crushFactor);

    if (!isTrailer) {
      // Mechanical engine and transmission shock / crushing
      const engShock = (severity * (isExtremeStriker ? 75 : 30) + (dmg.frontCrumple / maxFrontCrush) * 35) * Math.sqrt(massRatio);
      eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - engShock);

      const transShock = (severity * (isExtremeStriker ? 65 : 25) + (dmg.frontCrumple / maxFrontCrush) * 30) * Math.sqrt(massRatio);
      eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - transShock);

      // Radiator puncture (starts rapid coolant loss & overheating)
      if (severity > 0.42 || dmg.frontCrumple > 5.5 || isExtremeStriker) {
        eng.radiatorPunctured = true;
      }

      // Oil pan puncture (starts oil loss, knocking, then seizure)
      if (severity > 0.60 || dmg.frontCrumple > 8.0 || isExtremeStriker) {
        eng.oilPunctured = true;
      }

      // Engine knock from internal mechanical damage
      if (eng.engineHealth <= 35 || severity > 0.65 || isExtremeStriker) {
        eng.engineKnocking = true;
      }

      // Severe engine seizure & dead starter from direct engine bay smash
      if (eng.engineHealth <= 10 || severity > 0.85 || dmg.frontCrumple > 11.0 || isExtremeStriker) {
        eng.starterWorking = false;
        eng.engineRunning = false;
        eng.isSeized = true;
        eng.engineRPM = 0;
      }

      // Transmission jamming / locking up
      if (eng.transmissionHealth <= 15 || (severity > 0.75 && Math.random() < 0.75) || isExtremeStriker) {
        eng.transmissionJammed = true;
      }
    }

    if (normY < -0.22) {
      dmg.frontLeftDent = Math.min(maxFrontCrush * 0.75, dmg.frontLeftDent + crushFactor * 0.85);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.85);
      dmg.steeringDrift = Math.max(-1.0, dmg.steeringDrift - severity * 0.7);
      dmg.wheelRubResistance += severity * 18;
      if (severity > 0.35 || isExtremeStriker) dmg.leftHeadlightBroken = true;
    } else if (normY > 0.22) {
      dmg.frontRightDent = Math.min(maxFrontCrush * 0.75, dmg.frontRightDent + crushFactor * 0.85);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.85);
      dmg.steeringDrift = Math.min(1.0, dmg.steeringDrift + severity * 0.7);
      dmg.wheelRubResistance += severity * 18;
      if (severity > 0.35 || isExtremeStriker) dmg.rightHeadlightBroken = true;
    } else {
      dmg.frontLeftDent = Math.min(maxFrontCrush * 0.65, dmg.frontLeftDent + crushFactor * 0.6);
      dmg.frontRightDent = Math.min(maxFrontCrush * 0.65, dmg.frontRightDent + crushFactor * 0.6);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.6);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.6);
      dmg.wheelRubResistance += severity * 14;
      if (severity > 0.45 || isExtremeStriker) {
        dmg.leftHeadlightBroken = true;
        dmg.rightHeadlightBroken = true;
      }
    }

    if (!isTrailer) {
      if (severity > 0.55 || dmg.frontCrumple > 8.0 || isExtremeStriker) {
        dmg.hoodBuckled = true;
      }
    }
    if (severity > 0.60 || dmg.frontCrumple > 8.5 || isExtremeStriker) {
      dmg.windshieldCracked = true;
    }
  } else if (normX < -0.25 && impactSpeed > 20) {
    // --- REAR IMPACT ---
    const maxRearCrush = isExtremeStriker ? halfL * 0.75 : halfL * 0.22; // Fuel tank & subframe restrict rear crumpling
    dmg.rearCrumple = Math.min(maxRearCrush, dmg.rearCrumple + crushFactor);

    if (!isTrailer) {
      // Rear fuel tank puncture threshold
      const isPlayerInvolved = car.isPlayerControlled || ((world as any).player && (world as any).player.inVehicleId === car.id);
      if (isPlayerInvolved || isExtremeStriker) {
        if (severity > 0.65 || dmg.rearCrumple > 5.5 || isExtremeStriker) {
          fuel.tankPunctured = true;
        }
      } else {
        if (severity > 0.95 || dmg.rearCrumple > 12.0) {
          fuel.tankPunctured = true;
        }
      }

      // Rear impacts can shock transmission driveshaft and differential
      const rearTransShock = (severity * 18 + (dmg.rearCrumple / maxRearCrush) * 15) * Math.sqrt(massRatio);
      eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - rearTransShock);
      if (eng.transmissionHealth <= 15 || (severity > 0.85 && Math.random() < 0.4) || isExtremeStriker) {
        eng.transmissionJammed = true;
      }
    }

    if (car.fluidTank && (severity > 0.45 || dmg.rearCrumple > 4.5 || isExtremeStriker)) {
      car.fluidTank.isPunctured = true;
    }

    if (normY < -0.22) {
      dmg.rearLeftDent = Math.min(maxRearCrush * 0.75, dmg.rearLeftDent + crushFactor * 0.85);
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.85);
      if (severity > 0.45 || isExtremeStriker) dmg.leftTaillightBroken = true;
    } else if (normY > 0.22) {
      dmg.rearRightDent = Math.min(maxRearCrush * 0.75, dmg.rearRightDent + crushFactor * 0.85);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.85);
      if (severity > 0.45 || isExtremeStriker) dmg.rightTaillightBroken = true;
    } else {
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.6);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.6);
      if (severity > 0.55 || isExtremeStriker) {
        dmg.leftTaillightBroken = true;
        dmg.rightTaillightBroken = true;
      }
    }

    if (severity > 0.75 || isExtremeStriker) {
      dmg.rearGlassCracked = true;
    }
  } else if (impactSpeed > 20) {
    // --- SIDE IMPACT / T-BONE ---
    const maxSideDent = isExtremeStriker ? halfW * 0.75 : halfW * 0.22; // Side door impact bars restrict intrusion
    const sideDent = crushFactor * 0.95;

    if (normY < 0) {
      dmg.leftDent = Math.min(maxSideDent, dmg.leftDent + sideDent);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.7);
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.7);
      dmg.steeringDrift = Math.max(-1.0, dmg.steeringDrift - severity * 0.5);
    } else {
      dmg.rightDent = Math.min(maxSideDent, dmg.rightDent + sideDent);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.7);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.7);
      dmg.steeringDrift = Math.min(1.0, dmg.steeringDrift + severity * 0.5);
    }
    dmg.wheelRubResistance += severity * 15;

    if (car.fluidTank && (severity > 0.48 || dmg.leftDent > 3.0 || dmg.rightDent > 3.0 || isExtremeStriker)) {
      car.fluidTank.isPunctured = true;
    }

    if (!isTrailer) {
      if (severity > 0.48 || isExtremeStriker) {
        eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - severity * (isExtremeStriker ? 45 : 18));
        eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - severity * (isExtremeStriker ? 40 : 14));
        if (eng.transmissionHealth <= 15 || (severity > 0.82 && Math.random() < 0.50) || isExtremeStriker) {
          eng.transmissionJammed = true;
        }
        if (eng.engineHealth <= 10 || (severity > 0.88 && Math.random() < 0.40) || isExtremeStriker) {
          eng.isSeized = true;
          eng.engineRunning = false;
          eng.starterWorking = false;
          eng.engineRPM = 0;
        }
      }
    }
    if (severity > 0.48 || isExtremeStriker) {
      dmg.windshieldCracked = true;
      dmg.rearGlassCracked = true;
    }
    if (!isTrailer) {
      if (severity > 0.52 || isExtremeStriker) {
        fuel.tankPunctured = true;
      }
    }
  }

  // 3. Engine smoke & differentiated fire ignition conditions (Frontal Engine Fire vs. Rear Fuel Tank Fire)
  if (!isTrailer) {
    if (eng.radiatorPunctured || eng.oilPunctured || eng.overheatingSteam) {
      dmg.engineSmoking = true;
      if (eng.radiatorPunctured || eng.overheatingSteam) {
        if (!dmg.underHoodSteam || dmg.underHoodSteam === 'none') {
          dmg.underHoodSteam = 'thin';
        }
      }
      if (eng.oilPunctured) {
        if (!dmg.underHoodSmoke || dmg.underHoodSmoke === 'none') {
          dmg.underHoodSmoke = 'oil_blue';
        }
      }
    }
    const isEngineHot = (eng.temperature ?? 20) > 85;

    if (normX > 0.15 && impactSpeed > 10) {
      const isFrontFuelRailBroken = (dmg.frontCrumple ?? 0) > 4.5 || severity > 0.55;
      if (isFrontFuelRailBroken) {
        fuel.fuelRailBroken = true;
      }

      // Detailed collision probability calculation (Kmh based)
      // FIX: corrected multiplier to convert impactSpeed (px/s) to actual km/h
      const impactKmh = impactSpeed * PX_S_TO_SPEED_KMH;
      if (!dmg.underHoodSteam) dmg.underHoodSteam = 'none';
      if (!dmg.underHoodSmoke) dmg.underHoodSmoke = 'none';

      if (impactKmh >= 25 && impactKmh <= 55) {
        // Легкий удар (25–55 км/ч):
        // Шанс пара: 15% (если радиатор поврежден или горячий).
        if ((eng.radiatorPunctured || isEngineHot) && Math.random() < 0.15) {
          dmg.underHoodSteam = 'thin';
          dmg.engineSmoking = true;
        }
      } else if (impactKmh > 55 && impactKmh <= 95) {
        // Средний удар (55–95 км/ч):
        // Шанс пара: 45%.
        // Шанс сизого масляного дыма: 10%.
        if (Math.random() < 0.45) {
          dmg.underHoodSteam = Math.random() < 0.35 ? 'dense': 'thin';
          dmg.engineSmoking = true;
        }
        if (Math.random() < 0.10) {
          dmg.underHoodSmoke = 'oil_blue';
          dmg.engineSmoking = true;
        }
      } else if (impactKmh > 95 && impactKmh <= 160) {
        // Тяжелый удар (95–160 км/ч):
        // Шанс пара: 70%.
        // Шанс дыма: 35%.
        // Шанс возгорания: 5%.
        if (Math.random() < 0.30) {
          dmg.underHoodSteam = 'geyser';
          dmg.engineSmoking = true;
        } else if (Math.random() < 0.70) {
          dmg.underHoodSteam = 'dense';
          dmg.engineSmoking = true;
        }
        
        if (Math.random() < 0.35) {
          dmg.underHoodSmoke = 'oil_gray_wiring_black';
          dmg.engineSmoking = true;
        }
        const isPlayerCarInvolved = car.isPlayerControlled || ((world as any).player && (world as any).player.inVehicleId === car.id);
        if (isPlayerCarInvolved && Math.random() < 0.05 && !dmg.isFullyBurnt && !dmg.engineFire && !dmg.cabinFire && !dmg.underHoodSmolder && !dmg.fuelTankFire) {
          dmg.fireOrigin = 'front';
          dmg.underHoodSmolder = true;
          dmg.fireTimer = 0;
          dmg.engineSmoking = true;
          dmg.engineFire = false;
          dmg.fuelTankFire = false;
          dmg.cabinFire = false;
          dmg.fireProgress = 0;
          dmg.fireIntensity = 0;
          dmg.underHoodSmoke = 'oil_gray_wiring_black';
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, 'Из-под капота повалил едкий серый дым! Повреждена топливная рампа, тление в моторном отсеке!', 'warning');
          }
        }
      } else if (impactKmh > 160) {
        // Катастрофический / Эпический удар (160+ км/ч):
        // Огромная кинетическая энергия. Почти гарантированный сильный огонь и мощный пар!
        dmg.underHoodSteam = 'geyser';
        dmg.underHoodSmoke = 'oil_gray_wiring_black';
        dmg.engineSmoking = true;

        if (!dmg.isFullyBurnt && !dmg.engineFire && !dmg.cabinFire && !dmg.underHoodSmolder && !dmg.fuelTankFire) {
          if (Math.random() < 0.75) {
            dmg.fireOrigin = 'front';
            dmg.engineFire = true; // Сразу открытый сильный огонь под капотом!
            dmg.fireTimer = 5.0; // Сразу запущен процесс сильного горения
            dmg.fireProgress = 0.20;
            dmg.fireIntensity = 0.45;
            if (car.isPlayerControlled && (world as any).player) {
              addPlayerNotification((world as any).player, 'КАТАСТРОФИЧЕСКОЕ СТОЛКНОВЕНИЕ! Моторный отсек мгновенно вспыхнул от колоссального удара!', 'warning');
            }
          }
        }
      }
    }

    if (!dmg.isFullyBurnt && !dmg.engineFire && !dmg.cabinFire && !dmg.underHoodSmolder && !dmg.fuelTankFire) {
      // Check REAR or TANK AREA collision ignition (Fuel Tank / Puddle fire)
      // Occurs when the rear or side near the fuel tank is crushed:
      // Tank / filler neck punctures, gasoline leaks and flashes from metal friction sparks or hot exhaust
      if (normX <= 0.15 && fuel.tankPunctured) {
        const isPlayerInvolved = car.isPlayerControlled || ((world as any).player && (world as any).player.inVehicleId === car.id);
        const minIgnitionImpactSpeed = isPlayerInvolved ? 35 : 75;
        const minIgnitionSeverity = isPlayerInvolved ? 0.45 : 0.85;
        const hasIgnitionSource = (scrapeSpeed > 24 || impactSpeed > minIgnitionImpactSpeed || severity > minIgnitionSeverity || (isEngineHot && severity > 0.65));
        if (hasIgnitionSource) {
          // AI background traffic collisions do not erupt into catastrophic explosions from minor bumps
          const ignitionChance = isPlayerInvolved ? (severity < 0.35 ? 0.005 : (0.01 + (severity - 0.35) * 0.65)) : (severity > 0.88 ? 0.08 : 0);
          if (Math.random() < ignitionChance) {
          dmg.fireOrigin = 'rear';
          dmg.fuelTankFire = true;
          dmg.fireTimer = 0;
          dmg.engineSmoking = false; // Engine at the front is fine!
          dmg.underHoodSmolder = false;
          dmg.engineFire = false;
          dmg.cabinFire = false;
          dmg.fireProgress = 0.15;
          dmg.fireIntensity = 0.6;
          dmg.groundPuddleIgnited = true;

          // Immediately spill & ignite fuel under the rear of the car
          const fAnchor = getVehicleAnchor(car, 'fuel');
          addOrGrowFluidStain(world, fAnchor.x, fAnchor.y, 'fuel');
          if (world.stains && world.stains.length > 0) {
            for (const st of world.stains) {
              if (st.type === 'fuel') {
                const dist = Math.hypot(st.x - fAnchor.x, st.y - fAnchor.y);
                if (dist < 28) {
                  st.onFire = true;
                  st.fireIntensity = 0.85;
                  st.maxRadius = Math.max(st.maxRadius, 26);
                }
              }
            }
          }
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, 'ВСПЫХНУЛ БЕНЗОБАК И РАЗЛИВШЕЕСЯ ТОПЛИВО СЗАДИ! Огонь охватил заднюю часть и днище машины!', 'warning');
          }
        }
      }
    }
  }
  } else {
    // Force clean trailer engine / fuel states
    if (eng) {
      eng.radiatorPunctured = false;
      eng.oilPunctured = false;
      eng.engineRunning = false;
      eng.engineKnocking = false;
      eng.engineStalled = false;
      eng.overheatingSteam = false;
      eng.oilPressure = 0;
      eng.starterWorking = false;
      eng.isSeized = false;
      eng.transmissionJammed = false;
      eng.hoodOpen = false;
    }
    if (fuel) {
      fuel.tankPunctured = false;
      fuel.fuelRailBroken = false;
      fuel.tankLevel = 0;
      fuel.tankCapacity = 0;
    }
    if (dmg) {
      dmg.hoodBuckled = false;
      dmg.engineSmoking = false;
      dmg.underHoodSmolder = false;
      dmg.underHoodSteam = 'none';
      dmg.underHoodSmoke = 'none';
      dmg.engineFire = false;
      dmg.fuelTankFire = false;
      dmg.cabinFire = false;
    }
  }

  // 4. Scrapes & Paint Scuffs
  if (scrapeSpeed > 20 || impactSpeed > 25) {
    if (dmg.scratches.length < 14) {
      dmg.scratches.push({
        x: Math.max(-halfL + 2, Math.min(halfL - 2, localX)),
        y: Math.max(-halfW + 1, Math.min(halfW - 1, localY)),
        length: 4 + Math.random() * 10,
        angle: (Math.random() - 0.5) * 0.5,
        depth: Math.min(1.0, (impactSpeed + scrapeSpeed) / 100)
      });
    }
  }

  // 5. Particle Emission on High-Speed Crash (Sparks, Glass shards, Debris)
  if (impactSpeed > 35) {
    const sparkCount = Math.floor(3 + severity * 8);
    for (let s = 0; s < sparkCount; s++) {
      world.particles.push({
        x: contactX + (Math.random() * 8 - 4),
        y: contactY + (Math.random() * 8 - 4),
        vx: (Math.random() * 120 - 60),
        vy: (Math.random() * 120 - 60),
        radius: 1.5 + Math.random() * 1.5,
        color: '#fbbf24',
        alpha: 0.95,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.15,
        type: 'spark'});
    }

    if (severity > 0.45 || dmg.windshieldCracked || dmg.leftHeadlightBroken || dmg.rightHeadlightBroken) {
      const glassCount = Math.floor(5 + severity * 10);
      for (let g = 0; g < glassCount; g++) {
        world.particles.push({
          x: contactX + (Math.random() * 6 - 3),
          y: contactY + (Math.random() * 6 - 3),
          vx: (Math.random() * 90 - 45),
          vy: (Math.random() * 90 - 45),
          radius: 1.5 + Math.random() * 2.0,
          color: '#bae6fd',
          alpha: 0.85,
          life: 0,
          maxLife: 0.4 + Math.random() * 0.25,
          type: 'glass_shard'});
      }
    }

    if (severity > 0.35) {
      const debrisCount = Math.floor(2 + severity * 4);
      for (let d = 0; d < debrisCount; d++) {
        world.particles.push({
          x: contactX + (Math.random() * 6 - 3),
          y: contactY + (Math.random() * 6 - 3),
          vx: (Math.random() * 70 - 35),
          vy: (Math.random() * 70 - 35),
          radius: 2 + Math.random() * 2.5,
          color: Math.random() > 0.5 ? car.color : '#334155',
          alpha: 0.9,
          life: 0,
          maxLife: 0.45 + Math.random() * 0.35,
          type: 'debris'});
      }
    }
  }

  // Set NPC emergency hazard lights & stop state if vehicle was disabled or crashed
  if (!car.isPlayerControlled && isVehicleDisabledOrCrashed(car)) {
    car.turnSignal = 'hazard';
    car.brakeLightsOn = true;
    car.targetSpeed = 0;
    car.idmAcceleration = 0;
    if (Math.abs(car.speed) < 1.0) {
      car.speed = 0;
      car.angularVelocity = 0;
      car.steerAngle = 0;
      car.vx = 0;
      car.vy = 0;
    }
    car.aiState = 'stopping_obstacle';
    if (car.engineState) {
      car.engineState.engineRunning = false;
      car.engineState.engineRPM = 0;
    }
  }
}

// --- MODULAR VEHICLE ANCHORS & FLUID STAINS ---
export interface WorldAnchor {
  x: number;
  y: number;
}

export function getVehicleAnchor(
  car: Vehicle, 
  type: 'radiator'| 'oil'| 'fuel'| 'fuel_left'| 'fuel_right'| 'exhaust'): WorldAnchor {
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const L = car.length;
  const W = car.width;
  const carType = car.type || 'sedan';
  
  let f = 0; // localForward
  let r = 0; // localRight
  
  const isTruck = carType.startsWith('truck_') || carType === 'cement_mixer'|| carType === 'garbage_truck'|| carType === 'pickup_heavy'|| carType === 'delivery_truck';
  const isTractor = carType.startsWith('tractor_');
  const isBike = carType.startsWith('moto_') || carType.startsWith('moped_');
  const isRearEngineBus = carType === 'bus'|| carType === 'bus_minibus';
  
  if (type === 'radiator') {
    if (isRearEngineBus) {
      f = -0.45 * L;
      r = 0;
    } else if (isTruck || isTractor) {
      f = 0.42 * L;
      r = 0;
    } else {
      f = 0.48 * L;
      r = 0;
    }
  } else if (type === 'oil') {
    if (isRearEngineBus) {
      f = -0.45 * L;
      r = 0;
    } else if (isTruck || isTractor) {
      f = 0.30 * L;
      r = 0;
    } else {
      f = 0.30 * L;
      r = 0;
    }
  } else if (type === 'fuel'|| type === 'fuel_left'|| type === 'fuel_right') {
    if (isTruck) {
      f = 0.05 * L;
      r = type === 'fuel_left'? -0.48 * W : (type === 'fuel_right'? 0.48 * W : (Math.random() < 0.5 ? -0.48 * W : 0.48 * W));
    } else if (isTractor) {
      f = -0.42 * L;
      r = 0.28 * W;
    } else if (isBike) {
      f = 0.08 * L;
      r = 0;
    } else if (isRearEngineBus) {
      f = -0.15 * L;
      r = 0.48 * W;
    } else {
      f = -0.35 * L;
      r = 0.45 * W;
    }
  } else if (type === 'exhaust') {
    if (isTractor) {
      // MTZ Tractor: Vertical hood exhaust stack on front-right hood
      f = 0.22 * L;
      r = -0.38 * W;
    } else if (isTruck) {
      // All Trucks (KamAZ, ZIL, KrAZ, MAZ, GAZ, Dumpers, Tankers, Mixers, Garbage Trucks): Side exit pipe under chassis frame (выхлоп под рамой в бок)
      f = -0.05 * L;
      r = -0.48 * W;
    } else if (isBike) {
      // Motorcycle / Moped: Right side chrome pipe
      f = -0.35 * L;
      r = 0.38 * W;
    } else if (carType === 'muscle_classic'|| carType === 'muscle'|| carType === 'supercar') {
      // Muscle / Supercar: Side rocker pipe or rear center pipe
      f = carType === 'muscle_classic'? -0.05 * L : -0.50 * L;
      r = carType === 'muscle_classic'? -0.48 * W : 0;
    } else if (isRearEngineBus) {
      f = -0.50 * L;
      r = -0.40 * W;
    } else {
      // Standard Passenger Cars
      f = -0.50 * L;
      r = -0.32 * W;
    }
  }

  return {
    x: car.x + cosA * f - sinA * r,
    y: car.y + sinA * f + cosA * r
  };
}

export function addOrGrowFluidStain(
  world: GameWorld, 
  x: number, 
  y: number, 
  type: FluidStainType
) {
  if (!world.stains) world.stains = [];

  // If water stain, douse any overlapping fire stains immediately
  if (type === 'water') {
    for (const st of world.stains) {
      if (st.onFire) {
        const dx = st.x - x;
        const dy = st.y - y;
        if (dx * dx + dy * dy < (st.radius + 18) * (st.radius + 18)) {
          st.onFire = false;
          st.fireIntensity = 0;
          if (world.particles) {
            world.particles.push({
              x: st.x,
              y: st.y,
              vx: (Math.random() - 0.5) * 16,
              vy: -25 - Math.random() * 20,
              radius: 4 + Math.random() * 4,
              color: '#f8fafc',
              alpha: 0.75,
              life: 0,
              maxLife: 0.65,
              type: 'engine_smoke'});
          }
        }
      }
    }
  }
  
  // Find nearby existing stain of same type to grow - reduced radius from 22 to 10 for continuous track support
  for (const stain of world.stains) {
    if (stain.type === type) {
      const dx = stain.x - x;
      const dy = stain.y - y;
      if (dx * dx + dy * dy < 10 * 10) {
        stain.radius = Math.min(stain.maxRadius, stain.radius + 0.18);
        stain.life = Math.max(0, stain.life - 8); // Refresh lifespan
        stain.alpha = Math.min(0.85, stain.alpha + 0.05);
        return;
      }
    }
  }

  if (world.stains.length < 600) {
    world.stains.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      radius: type === 'water'? 2.2 : 2.5,
      maxRadius: type === 'water'? (6 + Math.random() * 4) : (8 + Math.random() * 12),
      type,
      alpha: type === 'oil'? 0.75 : (type === 'coolant'? 0.65 : (type === 'water'? 0.60 : 0.45)),
      life: 0,
      maxLife: type === 'water'? (60 + Math.random() * 30) : (180 + Math.random() * 120)
    });
  }
}

// --- DYNAMIC REALISTIC EXHAUST SMOKE EMISSION SYSTEM ---
export function emitVehicleExhaust(car: Vehicle, dt: number, world: GameWorld) {
  if (world.cleanMode) return;
  const eng = car.engineState;
  if (!eng || !eng.engineRunning) return;

  const fuel = car.fuelSystem;
  const carType = car.type as string;
  const fuelTypeStr = (fuel?.fuelType || car.requiredFuel || 'ai92') as string;

  // Electric vehicles produce zero exhaust smoke
  if (fuelTypeStr === 'electric'|| carType === 'electric_sedan'|| carType === 'electric_suv') {
    return;
  }

  // Distance culling optimization: skip offscreen vehicles far from active player
  const activePlayer = (world as any)._lastPlayer;
  if (activePlayer && !car.isPlayerControlled) {
    const dx = car.x - activePlayer.x;
    const dy = car.y - activePlayer.y;
    if (dx * dx + dy * dy > 1960000) return; // 1400^2 px
  }

  const isTractor = carType.startsWith('tractor_') || carType === 'tractor';
  const isTruck = carType.startsWith('truck_') || carType === 'cement_mixer'|| carType === 'garbage_truck'||
    carType === 'pickup_heavy'|| carType === 'delivery_truck'|| carType === 'van_flatbed'|| carType.startsWith('fire_');

  const isOldHeavyTruck = carType === 'truck_dumper'|| carType === 'truck_dump'|| carType === 'truck_heavy'||
    carType === 'truck_tractor'|| carType === 'truck_semi'|| carType === 'truck_flatbed'|| carType === 'truck_covered'|| carType === 'truck_tanker'||
    carType === 'cement_mixer'|| carType === 'garbage_truck'|| carType === 'fire_engine'||
    carType === 'fire_ladder'|| carType === 'fire_rescue'|| carType === 'van_flatbed';

  const durability = (car as any).durability ?? 100;
  const engineHealth = eng.engineHealth ?? 100;

  const isOldCar = carType === 'sedan_classic'|| carType === 'coupe_old'|| carType === 'pickup_old'||
    carType === 'muscle_classic'|| durability < 65 || engineHealth < 70;

  const isDiesel = fuelTypeStr === 'diesel'|| isTractor || isOldHeavyTruck || carType === 'pickup_heavy'|| carType === 'delivery_truck'|| carType === 'van_camper';
  const isSports = carType === 'supercar'|| carType === 'sports'|| carType === 'moto_sport';

  const throttle = (car as any)._lastThrottle ?? 0.0;
  const rpm = eng.engineRPM || 800;
  const temp = eng.temperature ?? 85;
  const oilLevel = eng.oilLevel ?? 100;

  // 1. Calculate Emission Frequency Chance (per frame)
  // Balanced emission rate: modern cars produce subtle wisps; diesels/tractors produce rhythmic gas puffs
  let emissionChance = 0.035; // Base chance per frame at idle for standard modern warm car
  if (isOldHeavyTruck) emissionChance = 0.12;
  else if (isTractor) emissionChance = 0.10; // Rhythmic diesel idle chug
  else if (isOldCar) emissionChance = 0.065;
  else if (isDiesel) emissionChance = 0.055;
  else if (isSports) emissionChance = 0.025;

  // Moderate boost under throttle and engine load
  emissionChance *= (1.0 + throttle * 1.6 + (rpm / 3800) * 0.8);

  // Cold engine steam / condensation
  if (temp < 45) emissionChance *= 1.4;

  // Burning oil / damaged engine
  if (engineHealth < 40 || oilLevel < 20) emissionChance *= 1.5;
  if (durability < 45) emissionChance *= 1.25;

  // Hard safety clamp to prevent particle flooding and lag
  emissionChance = Math.min(0.28, emissionChance);

  if (Math.random() > emissionChance * dt * 60) return;

  // 2. Obtain Exact Exhaust Pipe Anchor
  const exhaustAnchor = getVehicleAnchor(car, 'exhaust');
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // 3. Determine Smoke Color, Initial Size, Lifetime & Initial Gas Opacity
  let smokeColor = '#94a3b8';
  let initialRadius = 1.8 + Math.random() * 0.8;
  let maxLife = 0.50 + Math.random() * 0.30;
  let initialAlpha = 0.32 + throttle * 0.20; // Clean, visible warm gas haze

  const isLpgActive = car.hasGBO && fuel && fuel.gboActive !== false && (fuel.gboLevel === undefined || fuel.gboLevel > 0) && temp >= 40;

  if (isLpgActive) {
    const outsideTemp = getOutsideTemperature(world);
    if (outsideTemp > 10.0) {
      // Warm / summer: ABSOLUTELY INVISIBLE, just faint heat haze / shimmer
      smokeColor = '#ffffff';
      initialAlpha = 0.015 + Math.random() * 0.01; 
      maxLife = 0.35 + Math.random() * 0.15;
      initialRadius = 1.4 + Math.random() * 0.6;
    } else {
      // Cool / winter / autumn: thick white steam + water drops
      smokeColor = '#f8fafc'; // beautiful thick white steam
      initialAlpha = 0.85 + throttle * 0.12; // very dense white steam
      maxLife = 1.05 + Math.random() * 0.50; // trails slightly longer in cold air
      initialRadius = 2.8 + Math.random() * 1.5;

      // Spawn water droplets occasionally
      if (Math.random() < 0.15 * dt * 60) {
        if (Math.abs(car.speed) < 2.0 && Math.random() < 0.08) {
          addOrGrowFluidStain(world, exhaustAnchor.x, exhaustAnchor.y, 'water');
        }
      }
    }
  } else if (temp < 40) {
    // Cold Engine Vapor: dense whitish-gray condensate steam clouds
    smokeColor = temp < 25 ? '#f8fafc': '#e2e8f0';
    initialAlpha = 0.65 + Math.random() * 0.15;
    maxLife = 0.75 + Math.random() * 0.40;
    initialRadius = 2.4 + Math.random() * 1.4;
  } else if (engineHealth < 40 || oilLevel < 20) {
    // Burning Oil Smoke: thick translucent blue-gray clouds
    smokeColor = '#64748b';
    initialAlpha = 0.70 + Math.random() * 0.15;
    maxLife = 0.95 + Math.random() * 0.45;
    initialRadius = 2.6 + Math.random() * 1.4;
  } else if (isOldHeavyTruck) {
    // Old Heavy Truck: Dark slate indigo / soot diesel clouds ("синевато-черные клубы дыма")
    const blueSootColors = ['#1a2230', '#222b3d', '#2c384e', '#151d2a'];
    smokeColor = blueSootColors[Math.floor(Math.random() * blueSootColors.length)];
    initialAlpha = 0.80 + Math.min(0.18, throttle * 0.18);
    maxLife = 1.10 + Math.random() * 0.55;
    initialRadius = 3.0 + Math.random() * 1.6;
  } else if (isTractor) {
    // Tractor MTZ: Dark charcoal / black diesel soot puffs
    const tractorColors = ['#0f172a', '#1e293b', '#263346', '#111827'];
    smokeColor = tractorColors[Math.floor(Math.random() * tractorColors.length)];
    initialAlpha = 0.84 + Math.min(0.15, throttle * 0.15);
    maxLife = 1.00 + Math.random() * 0.50;
    initialRadius = 2.8 + Math.random() * 1.5;
  } else if (isOldCar) {
    // Old classic car: gray-blue or brownish-gray exhaust
    const oldCarColors = ['#475569', '#52525b', '#3f3f46'];
    smokeColor = oldCarColors[Math.floor(Math.random() * oldCarColors.length)];
    initialAlpha = 0.52 + Math.min(0.25, throttle * 0.22);
    maxLife = 0.70 + Math.random() * 0.35;
    initialRadius = 2.2 + Math.random() * 1.2;
  } else if (isDiesel) {
    // Standard Diesel
    smokeColor = '#334155';
    initialAlpha = 0.58 + throttle * 0.25;
    maxLife = 0.75 + Math.random() * 0.35;
    initialRadius = 2.4 + Math.random() * 1.2;
  }

  // 4. Physics: Ejection Velocity & Placement (Above Hood vs Under Chassis)
  let pVx = 0;
  let pVy = 0;

  if (isTractor) {
    // TRACTOR EXHAUST PHYSICS (ABOVE HOOD / CAB)
    // Pipe is vertical on front hood: gases shoot UPWARDS into 3D airspace (-y is up)
    const ejectUpward = 24 + throttle * 30 + Math.random() * 12;
    const ejectBack = -cosA * (6 + throttle * 10) + (Math.random() * 8 - 4);
    const ejectSide = -sinA * (6 + throttle * 10) + (Math.random() * 8 - 4);

    pVx = car.vx * 0.25 + ejectBack;
    pVy = car.vy * 0.25 + ejectSide - ejectUpward;
  } else if (isTruck || isOldHeavyTruck) {
    // ALL TRUCKS SIDE EXHAUST UNDER CHASSIS FRAME (ВЫХЛОП ПОД РАМОЙ В БОК)
    // Ejected outwards to the side from under the chassis frame and trailing low along asphalt
    const normX = -sinA;
    const normY = cosA;
    const sideSign = -1; // Right side under chassis frame

    const sideSpeed = 14 + throttle * 22 + Math.random() * 6;
    const backSpeed = 10 + throttle * 18 + Math.random() * 5;

    const ejectSideX = (sideSign * normX) * sideSpeed;
    const ejectSideY = (sideSign * normY) * sideSpeed;
    const ejectBackX = -cosA * backSpeed;
    const ejectBackY = -sinA * backSpeed;

    pVx = car.vx * 0.2 + ejectSideX + ejectBackX;
    pVy = car.vy * 0.2 + ejectSideY + ejectBackY;
  } else {
    // PASSENGER CAR / LIGHT BUS PHYSICS (UNDER REAR BUMPER / GROUND LEVEL)
    // Pipe exits under rear bumper near asphalt surface
    const ejectBack = -cosA * (18 + throttle * 32) + (Math.random() * 12 - 6);
    const ejectSide = -sinA * (18 + throttle * 32) + (Math.random() * 12 - 6);

    pVx = car.vx * 0.2 + ejectBack;
    pVy = car.vy * 0.2 + ejectSide;
  }

  world.particles.push({
    x: exhaustAnchor.x + (Math.random() * 2 - 1),
    y: exhaustAnchor.y + (Math.random() * 2 - 1),
    vx: pVx,
    vy: pVy,
    radius: initialRadius,
    color: smokeColor,
    alpha: initialAlpha,
    initialAlpha: initialAlpha,
    life: 0,
    maxLife: maxLife,
    type: 'exhaust',
    underVehicle: !isTractor
  });
}

// --- MODULAR VEHICLE TICK SYSTEMS (ENGINE, COOLING, OIL, FUEL, SUSPENSION) ---
export function updateVehicleSystems(car: Vehicle, dt: number, world: GameWorld) {
  if (!car.engineState) {
    car.engineState = createDefaultEngineState(car.type, !car.isParked, !!car.isParked);
  }
  if (!car.fuelSystem) {
    car.fuelSystem = createDefaultFuelSystem(car.type, !!car.isParked);
  }
  car.damage = ensureVehicleDamage(car);

  const eng = car.engineState;
  const fuel = car.fuelSystem;
  const dmg = car.damage;

  // Check if any vertices require progressive plastic or elastic simulation
  const needsDeformSimulation = dmg.deformedVertices && dmg.deformedVertices.some(v => 
    (v.targetOffsetX !== undefined && Math.abs(v.targetOffsetX - (v.offsetX || 0)) > 0.02) || 
    (v.targetOffsetY !== undefined && Math.abs(v.targetOffsetY - (v.offsetY || 0)) > 0.02) || 
    (v.velX !== undefined && (Math.abs(v.velX) > 0.02 || Math.abs(v.velY || 0) > 0.02 || Math.abs(v.elasticX || 0) > 0.02 || Math.abs(v.elasticY || 0) > 0.02))
  );

  // Step progressive softbody plastic crumple & transient elastic jiggle dynamics
  if (needsDeformSimulation && dmg.deformedVertices) {
    const kSpring = 160;  // Spring stiffness
    const cDamping = 18;  // Damping factor
    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    const crumpleRate = Math.min(1.0, 18.0 * clampedDt); // Smooth multi-frame crumple progression (~80-120ms)

    for (const v of dmg.deformedVertices) {
      if (!v) continue;

      const vLen = Math.hypot(v.localX, v.localY) || 1;
      const maxAllowedOffset = Math.min(10.0, Math.max(2.5, vLen * 0.32));

      // Sanitize non-finite values
      if (!isFinite(v.targetOffsetX || 0)) v.targetOffsetX = 0;
      if (!isFinite(v.targetOffsetY || 0)) v.targetOffsetY = 0;
      if (!isFinite(v.offsetX || 0)) v.offsetX = 0;
      if (!isFinite(v.offsetY || 0)) v.offsetY = 0;
      if (!isFinite(v.elasticX || 0)) v.elasticX = 0;
      if (!isFinite(v.elasticY || 0)) v.elasticY = 0;

      // Hard clamp target offsets
      if (v.targetOffsetX !== undefined && v.targetOffsetY !== undefined) {
        const tDist = Math.hypot(v.targetOffsetX, v.targetOffsetY);
        if (tDist > maxAllowedOffset) {
          v.targetOffsetX = (v.targetOffsetX / tDist) * maxAllowedOffset;
          v.targetOffsetY = (v.targetOffsetY / tDist) * maxAllowedOffset;
        }
      }

      // Smooth progressive plastic deformation towards target offset
      if (v.targetOffsetX !== undefined && v.targetOffsetY !== undefined) {
        v.offsetX += (v.targetOffsetX - v.offsetX) * crumpleRate;
        v.offsetY += (v.targetOffsetY - v.offsetY) * crumpleRate;
        if (Math.abs(v.targetOffsetX - v.offsetX) < 0.04 && Math.abs(v.targetOffsetY - v.offsetY) < 0.04) {
          v.offsetX = v.targetOffsetX;
          v.offsetY = v.targetOffsetY;
        }
      }

      // Hard clamp current offsets
      const oDist = Math.hypot(v.offsetX, v.offsetY);
      if (oDist > maxAllowedOffset) {
        v.offsetX = (v.offsetX / oDist) * maxAllowedOffset;
        v.offsetY = (v.offsetY / oDist) * maxAllowedOffset;
      }

      if (v.velX !== undefined && v.velY !== undefined) {
        let elX = v.elasticX || 0;
        let elY = v.elasticY || 0;
        let vx = v.velX;
        let vy = v.velY;

        if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01 || Math.abs(elX) > 0.01 || Math.abs(elY) > 0.01) {
          // Spring force acceleration: a = -k * x - c * v
          const accX = -kSpring * elX - cDamping * vx;
          const accY = -kSpring * elY - cDamping * vy;

          vx += accX * clampedDt;
          vy += accY * clampedDt;

          elX += vx * clampedDt;
          elY += vy * clampedDt;

          // Clamp max elastic displacement to 6.0px so it can never blow up
          elX = Math.max(-6.0, Math.min(6.0, elX));
          elY = Math.max(-6.0, Math.min(6.0, elY));

          // Heavy velocity damping clamp
          vx = Math.max(-30.0, Math.min(30.0, vx));
          vy = Math.max(-30.0, Math.min(30.0, vy));

          if (Math.hypot(elX, elY) < 0.02 && Math.hypot(vx, vy) < 0.02) {
            elX = 0; elY = 0; vx = 0; vy = 0;
          }

          if (!isFinite(elX)) elX = 0;
          if (!isFinite(elY)) elY = 0;
          if (!isFinite(vx)) vx = 0;
          if (!isFinite(vy)) vy = 0;

          v.elasticX = elX;
          v.elasticY = elY;
          v.velX = vx;
          v.velY = vy;
        }
      }
    }
  }

  // Trailers do not have engines, fuel systems, radiators, or internal thermal/fire mechanics
  if (isTrailerVehicle(car)) return;

  // Fast-path: completely skip inactive parked/stationary cars with engine off, no fire, and no leaks
  const isVehicleInactive = !eng.engineRunning && 
    !eng.radiatorPunctured && 
    !eng.oilPunctured && 
    !fuel.tankPunctured && 
    !fuel.fuelRailBroken && 
    !dmg.engineFire && 
    !dmg.cabinFire && 
    !dmg.fuelTankFire && 
    !dmg.underHoodSmolder &&
    !dmg.underHoodSteam &&
    !dmg.underHoodSmoke &&
    eng.temperature <= 21 && 
    Math.abs(car.speed) < 0.1 && 
    !car.isPlayerControlled;

  if (isVehicleInactive) {
    eng.temperature = 20;
    car.engineTemp = 20;
    eng.overheatingSteam = false;
    eng.oilPressure = 0;
    return;
  }

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // Exact component anchors using vehicle geometry & type
  const radAnchor = getVehicleAnchor(car, 'radiator');
  const oilAnchor = getVehicleAnchor(car, 'oil');
  const fuelAnchor = getVehicleAnchor(car, 'fuel');
  const exhaustAnchor = getVehicleAnchor(car, 'exhaust');

  // 1. RADIATOR & COOLANT LEAK
  if (eng.radiatorPunctured) {
    if (eng.radiatorWater > 0) {
      eng.radiatorWater = Math.max(0, eng.radiatorWater - 12 * dt);
      const last = (car as any)._lastRadAnchor;
      if (last) {
        const dx = radAnchor.x - last.x;
        const dy = radAnchor.y - last.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          // Car is moving, interpolate along the path to form a continuous track
          const steps = Math.min(25, Math.ceil(dist / 6));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const ix = last.x + dx * t;
            const iy = last.y + dy * t;
            addOrGrowFluidStain(world, ix + (Math.random() * 1.5 - 0.75), iy + (Math.random() * 1.5 - 0.75), 'coolant');
          }
        } else {
          // Stationary or very slow, grow the local puddle
          addOrGrowFluidStain(world, radAnchor.x + (Math.random() * 4 - 2), radAnchor.y + (Math.random() * 4 - 2), 'coolant');
        }
      } else {
        addOrGrowFluidStain(world, radAnchor.x + (Math.random() * 4 - 2), radAnchor.y + (Math.random() * 4 - 2), 'coolant');
      }
      (car as any)._lastRadAnchor = { x: radAnchor.x, y: radAnchor.y };
    } else {
      (car as any)._lastRadAnchor = null;
    }
  } else {
    (car as any)._lastRadAnchor = null;
  }

  // 2. ENGINE THERMAL DYNAMICS & OVERHEATING
  if (eng.engineRunning) {
    const isMachinery = isRoadMachinery(car.type);
    const rpmNorm = Math.max(0.2, (eng.engineRPM || 800) / 3800);
    const throttleRatio = (car as any)._lastThrottle !== undefined ? (car as any)._lastThrottle : 0.4;
    const baseHeat = 2.4;
    // Combustion heat scales quadratically with RPM and linearly with throttle
    // Heavy road machinery runs with steady governed industrial diesel RPM without runaway heat spikes
    const heatGen = isMachinery
      ? (1.2 + Math.pow(rpmNorm, 1.1) * 2.6) * (0.45 + throttleRatio * 0.55)
      : (baseHeat + Math.pow(rpmNorm, 1.8) * 8.8) * (0.45 + throttleRatio * 0.55);

    let cooling = 0;
    if (eng.radiatorWater > 10) {
      if (isMachinery) {
        // Heavy road construction equipment has high-flow viscous cooling fans and oversized radiators
        // designed to run continuously at 100% engine load at slow speeds (thermostatically stable at 80-84°C)
        const fanFactor = 3.6;
        const coolingFactor = (eng.radiatorWater / 100) * fanFactor;
        cooling = Math.max(0, (eng.temperature - 79) * 2.8 * coolingFactor);
      } else {
        // Radiator cooling: base fan flow + ram-air effect through grille at speed
        const airFlowKmh = Math.abs(car.speed) * PX_S_TO_SPEED_KMH;
        const ramAirFactor = 1.0 + (airFlowKmh / 55.0) * 1.5;
        const coolingFactor = (eng.radiatorWater / 100) * ramAirFactor;
        cooling = (eng.temperature - 84) * 0.85 * coolingFactor;
      }
    } else {
      // Dry engine cooling (convection through metal surface only)
      cooling = (eng.temperature - 20) * 0.02;
    }

    eng.temperature = Math.min(145, Math.max(20, eng.temperature + (heatGen - cooling) * dt));
    car.engineTemp = eng.temperature;

    if (eng.temperature > 102) {
      eng.overheatingSteam = true;
      if (Math.random() < 0.6) {
        // Steam clouds rise into air above radiator anchor
        world.particles.push({
          x: radAnchor.x + (Math.random() * 6 - 3),
          y: radAnchor.y + (Math.random() * 6 - 3),
          vx: -cosA * 10 + (Math.random() * 20 - 10),
          vy: -sinA * 10 - 15 + (Math.random() * 20 - 10),
          radius: 4 + Math.random() * 5,
          color: '#f8fafc',
          alpha: 0.75,
          life: 0,
          maxLife: 0.7 + Math.random() * 0.4,
          type: 'engine_smoke'});
      }
    } else {
      eng.overheatingSteam = false;
    }

    if (eng.temperature > 125) {
      eng.engineKnocking = true;
      car.speed *= (1 - dt * 0.5);
      eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 12 * dt);
      if (eng.engineHealth <= 10 || eng.temperature > 134 || Math.random() < 0.15 * dt) {
        eng.engineRunning = false;
        eng.engineStalled = true;
        eng.isSeized = true;
        eng.engineRPM = 0;
        if (eng.temperature > 135) eng.starterWorking = false;
      }
    }
  } else {
    eng.temperature = Math.max(20, eng.temperature - 4.0 * dt);
    car.engineTemp = eng.temperature;
    eng.overheatingSteam = false;
  }

  // 3. OIL PAN & LUBRICATION SYSTEM
  if (eng.oilPunctured) {
    if (eng.oilLevel > 0) {
      eng.oilLevel = Math.max(0, eng.oilLevel - 8 * dt);
      const last = (car as any)._lastOilAnchor;
      if (last) {
        const dx = oilAnchor.x - last.x;
        const dy = oilAnchor.y - last.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          // Car is moving, interpolate along the path to form a continuous track
          const steps = Math.min(25, Math.ceil(dist / 6));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const ix = last.x + dx * t;
            const iy = last.y + dy * t;
            addOrGrowFluidStain(world, ix + (Math.random() * 1.5 - 0.75), iy + (Math.random() * 1.5 - 0.75), 'oil');
          }
        } else {
          // Stationary or very slow
          addOrGrowFluidStain(world, oilAnchor.x + (Math.random() * 4 - 2), oilAnchor.y + (Math.random() * 4 - 2), 'oil');
        }
      } else {
        addOrGrowFluidStain(world, oilAnchor.x + (Math.random() * 4 - 2), oilAnchor.y + (Math.random() * 4 - 2), 'oil');
      }
      (car as any)._lastOilAnchor = { x: oilAnchor.x, y: oilAnchor.y };
    } else {
      (car as any)._lastOilAnchor = null;
    }
  } else {
    (car as any)._lastOilAnchor = null;
  }

  eng.oilPressure = (eng.oilLevel / 100) * (eng.engineRunning ? 100 : 0);

  if (eng.oilLevel < 15 && eng.engineRunning) {
    eng.engineKnocking = true;
    eng.temperature += 12 * dt;
    eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 18 * dt);
    if ((eng.oilLevel <= 0 || eng.engineHealth <= 10) && Math.random() < 0.25 * dt) {
      eng.engineRunning = false;
      eng.isSeized = true;
      eng.starterWorking = false;
      eng.engineRPM = 0;
    }
  }

  // --- DIESEL RUNAWAY MECHANIC (Разнос дизеля) ---
  const isTractorType = car.type.startsWith('tractor_');
  const isTruckOrBusType = car.type.startsWith('truck_') || car.type === 'bus'|| car.type === 'bus_minibus'|| car.type === 'cement_mixer'|| car.type === 'garbage_truck'|| car.type === 'fire_engine'|| car.type === 'fire_ladder'|| car.type === 'fire_rescue';
  const isDiesel = fuel?.fuelType === 'diesel'|| isTractorType || isTruckOrBusType || car.type === 'pickup_heavy'|| car.type === 'delivery_truck'|| car.type === 'van_camper';

  // Check trigger: overfilled oil (>105%) OR low engine health (<25%) with oil present
  if (isDiesel && eng.engineRunning && !eng.isDieselRunaway && !eng.isSeized) {
    if (eng.oilLevel > 105 || (eng.engineHealth < 25 && eng.oilLevel > 20 && Math.random() < 0.2 * dt)) {
      eng.isDieselRunaway = true;
      const wPlayer = (world as any).player;
      if (wPlayer && (wPlayer.currentVehicleId === car.id || Math.hypot(car.x - wPlayer.x, car.y - wPlayer.y) < 250)) {
        addPlayerNotification(wPlayer, 'ДИЗЕЛЬ ПОШЁЛ В РАЗНОС! Двигатель работает на моторном масле!', 'warning');
      }
    }
  }

  if (eng.isDieselRunaway) {
    // Ignition key cannot stop runaway!
    eng.engineRunning = true;

    // Gradual, realistic oil consumption as fuel (~35-45 seconds total runaway duration)
    eng.oilLevel = Math.max(0, eng.oilLevel - 2.5 * dt);

    // Progressive heat buildup and thermal damage
    eng.temperature = Math.min(145, eng.temperature + 1.5 * dt);
    eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 2.2 * dt);

    // Escalating smoke, sparks, and soot emission
    const radAnchor = getVehicleAnchor(car, 'radiator');
    const exhaustAnchor = getVehicleAnchor(car, 'exhaust');
    const cosA = Math.cos(car.angle);
    const sinA = Math.sin(car.angle);

    // Emit dense black soot particles from exhaust
    if (Math.random() < 0.90) {
      world.particles.push({
        x: exhaustAnchor.x,
        y: exhaustAnchor.y,
        vx: -cosA * (70 + Math.random() * 50) + (Math.random() * 20 - 10),
        vy: -sinA * (70 + Math.random() * 50) + (Math.random() * 20 - 10),
        radius: 4.5 + Math.random() * 4.5,
        color: Math.random() < 0.8 ? '#090d16': '#1e293b',
        alpha: 0.95,
        life: 0,
        maxLife: 1.2,
        type: 'exhaust'});
    }

    // Engine bay smoke & flame sparks escalating with heat
    if (Math.random() < 0.75) {
      world.particles.push({
        x: radAnchor.x + (Math.random() * 20 - 10),
        y: radAnchor.y + (Math.random() * 20 - 10),
        vx: (Math.random() - 0.5) * 50,
        vy: -40 - Math.random() * 30,
        radius: 5.5 + Math.random() * 5.0,
        color: eng.temperature > 120 ? '#0f172a': '#334155',
        alpha: 0.90,
        life: 0,
        maxLife: 1.0,
        type: 'engine_smoke'});
    }

    // Under-hood sparks & small flames when near critical failure
    if (eng.temperature > 115 || eng.oilLevel < 30) {
      if (Math.random() < 0.45) {
        world.particles.push({
          x: radAnchor.x + (Math.random() * 14 - 7),
          y: radAnchor.y + (Math.random() * 14 - 7),
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          radius: 1.8 + Math.random() * 2.2,
          color: Math.random() < 0.6 ? '#f97316': '#eab308',
          alpha: 1.0,
          life: 0,
          maxLife: 0.6,
          type: 'spark'});
      }
    }

    // Periodic loud engine knocking sound as runaway progresses
    if (Math.random() < 0.12) {
      sound.playEngineKnock(eng.engineRPM || 4500);
    }

    // CATASTROPHIC EXPLOSION ("КУЛАК ДРУЖБЫ")
    if (eng.oilLevel <= 0 || eng.engineHealth <= 0 || eng.temperature >= 142) {
      eng.isDieselRunaway = false;
      eng.engineRunning = false;
      eng.isSeized = true;
      eng.starterWorking = false;
      eng.engineHealth = 0;
      eng.engineRPM = 0;
      dmg.engineFire = true;
      dmg.fireIntensity = 1.0;
      dmg.underHoodSmolder = true;

      //  SOUND & CAMERA SHAKE
      sound.playEngineExplosion();
      sound.playCollision(1.5);
      sound.playDetonation();
      const wCamera = (world as any).camera;
      if (wCamera) {
        wCamera.shakeTimer = 1.4;
        wCamera.shakeIntensity = 26.0;
      }

      //  PHYSICAL SHRAPNEL & METAL DEBRIS SPRAY (45+ Flying engine fragments)
      const debrisColors = ['#1e293b', '#334155', '#475569', '#64748b', '#0f172a', '#b45309', '#ea580c', '#d97706'];
      for (let i = 0; i < 45; i++) {
        const spreadAngle = Math.random() * Math.PI * 2;
        const speed = 90 + Math.random() * 310;
        world.particles.push({
          x: radAnchor.x + (Math.random() * 16 - 8),
          y: radAnchor.y + (Math.random() * 16 - 8),
          vx: Math.cos(spreadAngle) * speed + car.vx * 0.4,
          vy: Math.sin(spreadAngle) * speed + car.vy * 0.4,
          radius: 2.5 + Math.random() * 5.5,
          color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
          alpha: 1.0,
          life: 0,
          maxLife: 2.2 + Math.random() * 2.0,
          type: 'debris'});
      }

      //  FIERY SPARKS & MOLTEN SPLATTERS (35+ sparks)
      for (let i = 0; i < 35; i++) {
        const spreadAngle = Math.random() * Math.PI * 2;
        const speed = 130 + Math.random() * 340;
        world.particles.push({
          x: radAnchor.x,
          y: radAnchor.y,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          radius: 1.6 + Math.random() * 2.8,
          color: Math.random() < 0.6 ? '#f97316': (Math.random() < 0.5 ? '#eab308': '#ef4444'),
          alpha: 1.0,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.8,
          type: 'spark'});
      }

      //  EXPLOSION FIREBALL CLOUD (22+ flame particles)
      for (let i = 0; i < 22; i++) {
        const spreadAngle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 130;
        world.particles.push({
          x: radAnchor.x + Math.cos(spreadAngle) * 12,
          y: radAnchor.y + Math.sin(spreadAngle) * 12,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          radius: 14 + Math.random() * 16,
          color: Math.random() < 0.5 ? '#f97316': '#dc2626',
          alpha: 0.95,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.7,
          type: 'flame'});
      }

      //  GROUND STAINS (Burn mark & hot oil spill on asphalt)
      if (world.stains) {
        if (world.stains.length < 580) {
          world.stains.push({
            id: Math.random().toString(36).substring(2, 9),
            x: radAnchor.x,
            y: radAnchor.y,
            radius: 26,
            maxRadius: 36,
            type: 'oil',
            alpha: 0.85,
            life: 0,
            maxLife: 300
          });
          world.stains.push({
            id: Math.random().toString(36).substring(2, 9),
            x: radAnchor.x + (Math.random() * 12 - 6),
            y: radAnchor.y + (Math.random() * 12 - 6),
            radius: 20,
            maxRadius: 32,
            type: 'oil',
            alpha: 0.9,
            life: 0,
            maxLife: 300
          });
        }
      }

      // Notification & Tinnitus Sound
      const wPlayer = (world as any).player;
      if (wPlayer && (wPlayer.currentVehicleId === car.id || Math.hypot(car.x - wPlayer.x, car.y - wPlayer.y) < 320)) {
        sound.playTinnitus(2.5);
        addPlayerNotification(wPlayer, 'КАТАСТРОФИЧЕСКИЙ ВЗРЫВ! Двигатель пошёл в разнос и разорвался! Шатуны и обломки блока разметало вокруг!', 'warning');
      }
    }
  }
  
  // --- LAZY INITIALIZE GBO/LPG PROPERTIES ---
  if (car.hasGBO && fuel) {
    if (fuel.gboActive === undefined) {
      fuel.gboActive = true;
    }
    if (fuel.gboLevel === undefined) {
      fuel.gboLevel = car.isParked ? Math.round(15 + Math.random() * 50) : Math.round(35 + Math.random() * 55);
    }
    if (fuel.gboCapacity === undefined) {
      fuel.gboCapacity = getLPGDefaultCapacity(car.type);
    }
  }

  // --- REALISTIC DRIVING FUEL CONSUMPTION (Influenced by Chip Tuning & GBO/LPG) ---
  if (eng.engineRunning && fuel) {
    let consumptionRate = 0.0003 + (eng.engineRPM / 3000) * 0.0012; // liters per second
    if ((car as any).hasChiptuning) {
      consumptionRate *= 0.85; // 15% fuel economy from optimized timing & AFR
    }

    const isLpgRunning = car.hasGBO && fuel.gboActive !== false && (fuel.gboLevel ?? 0) > 0 && (eng.temperature ?? 20) >= 40;

    if (isLpgRunning) {
      // LPG consumption is 18% higher by volume
      const gboCap = fuel.gboCapacity || getLPGDefaultCapacity(car.type);
      const lpgConsumptionRate = consumptionRate * 1.18;
      const consumedLiters = lpgConsumptionRate * dt;
      const consumedPercent = (consumedLiters / gboCap) * 100;
      fuel.gboLevel = Math.max(0, (fuel.gboLevel ?? 100) - consumedPercent);

      if (fuel.gboLevel <= 0) {
        fuel.gboLevel = 0;
        fuel.gboActive = false; // automatically switch back to reserve gasoline
        const player = (world as any).player;
        if (player && player.currentVehicleId === car.id) {
          addPlayerNotification(player, "Закончился газ! ГБО автоматически переключилось на резервный бензин.", "warning");
        }
      }
    } else {
      // Standard Gasoline/Diesel consumption
      const consumedLiters = consumptionRate * dt;
      const consumedPercent = (consumedLiters / (fuel.tankCapacity || 55)) * 100;
      fuel.tankLevel = Math.max(0, fuel.tankLevel - consumedPercent);
      
      if (fuel.tankLevel <= 0) {
        fuel.tankLevel = 0;
        eng.engineRunning = false;
        eng.engineRPM = 0;
        eng.engineStalled = true;
      }
    }
  }
  
  // --- MODULE 3: ELECTRICAL CIRCUIT, BATTERY & ALTERNATOR ---
  if (eng.engineRunning && eng.engineRPM > 900) {
    // Recharge (Alternator)
    const chargeRate = 1.2 * Math.min(1.5, eng.engineRPM / 2000) * dt;
    eng.batteryCharge = Math.min(100, eng.batteryCharge + chargeRate);
  } else {
    // Discharge
    if (car.headlightsOn) {
      eng.batteryCharge = Math.max(0, eng.batteryCharge - 0.08 * dt);
    }
    if (car.heaterMode && car.heaterMode !== 'off') {
      eng.batteryCharge = Math.max(0, eng.batteryCharge - 0.05 * dt);
    }
  }

  // 4. FUEL SYSTEM & LEAKS
  const isTankerHeavilyDamaged = car.type === 'truck_tanker'&& (
    dmg.rearCrumple > 4.5 || 
    dmg.leftDent > 2.2 || 
    dmg.rightDent > 2.2 || 
    dmg.frontLeftDent > 3.0 || 
    dmg.frontRightDent > 3.0 || 
    dmg.rearLeftDent > 3.0 || 
    dmg.rearRightDent > 3.0 || 
    fuel.tankPunctured || 
    !!dmg.engineFire ||
    !!dmg.fuelTankFire ||
    !!dmg.cabinFire
  );

  if (isTankerHeavilyDamaged && !fuel.tankPunctured) {
    fuel.tankPunctured = true;
  }

  // 4a. Engine fuel rail/line leak (at most 0.5 - 1.0 liters in a head-on collision)
  if (fuel.fuelRailBroken && !fuel.tankPunctured) {
    if (fuel.engineFuelLeaked === undefined) {
      fuel.engineFuelLeaked = 0;
    }
    const maxEngineLeak = 0.5 + ((car.mass ?? 1400) % 500) / 1000; // deterministic range 0.5 - 1.0L
    const isLpgRunning = car.hasGBO && fuel.gboActive !== false && (fuel.gboLevel ?? 0) > 0 && (eng.temperature ?? 20) >= 40;

    if (isLpgRunning) {
      if (fuel.engineFuelLeaked < maxEngineLeak && (fuel.gboLevel ?? 0) > 0) {
        const leakRateSec = 0.08 * 1.18; // LPG leaks slightly faster due to higher pressure
        const leakLiters = Math.min(leakRateSec * dt, maxEngineLeak - fuel.engineFuelLeaked);
        fuel.engineFuelLeaked += leakLiters;

        const leakPercent = (leakLiters / (fuel.gboCapacity || 42)) * 100;
        fuel.gboLevel = Math.max(0, (fuel.gboLevel ?? 100) - leakPercent);

        // Periodically spawn cold white gas vapor in the engine bay
        if (Math.random() < 0.65) {
          world.particles.push({
            x: radAnchor.x + (Math.random() * 4 - 2),
            y: radAnchor.y + (Math.random() * 4 - 2),
            vx: (Math.random() - 0.5) * 20,
            vy: -25 - Math.random() * 15,
            radius: 3.5 + Math.random() * 3.5,
            color: '#f1f5f9', // cold gas condensation
            alpha: 0.6,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.3,
            type: 'engine_smoke'} as any);
        }
      }
    } else {
      if (fuel.engineFuelLeaked < maxEngineLeak && fuel.tankLevel > 0) {
        const leakRateSec = 0.08; // leak 0.08L per second
        const leakLiters = Math.min(leakRateSec * dt, maxEngineLeak - fuel.engineFuelLeaked);
        fuel.engineFuelLeaked += leakLiters;

        // Convert liters to percentage of fuel tank capacity (usually 55L)
        const leakPercent = (leakLiters / (fuel.tankCapacity || 55)) * 100;
        fuel.tankLevel = Math.max(0, fuel.tankLevel - leakPercent);

        // Periodically spawn small fuel stain under the engine/radiator anchor
        if (Math.random() < 3.0 * dt) {
          addOrGrowFluidStain(world, radAnchor.x + (Math.random() * 4 - 2), radAnchor.y + (Math.random() * 4 - 2), 'fuel');
        }
      }
    }
  }

  if (fuel.tankPunctured) {
    // LPG GBO Tank leak
    if (car.hasGBO && fuel.gboLevel !== undefined && fuel.gboLevel > 0) {
      const gboLeakRateSec = 2.0; // 2% tank level or 2L per sec
      const gboCapacity = fuel.gboCapacity || 42;
      const leakLiters = gboLeakRateSec * dt;
      const leakPercent = (leakLiters / gboCapacity) * 100;
      fuel.gboLevel = Math.max(0, fuel.gboLevel - leakPercent);

      // Spawn cold white gas vapor cloud at the rear of the car
      if (Math.random() < 0.6) {
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const gboTankX = car.x - cosA * (car.length * 0.4);
        const gboTankY = car.y - sinA * (car.length * 0.4);
        world.particles.push({
          x: gboTankX + (Math.random() * 4 - 2),
          y: gboTankY + (Math.random() * 4 - 2),
          vx: -cosA * (15 + Math.random() * 15) + (Math.random() * 12 - 6),
          vy: -sinA * (15 + Math.random() * 15) + (Math.random() * 12 - 6),
          radius: 4.0 + Math.random() * 4.0,
          color: '#f8fafc', // cold white condensate vapor
          alpha: 0.7,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
          type: 'engine_smoke'} as any);
      }
    }

    if (fuel.tankLevel > 0) {
      const isTanker = car.type === 'truck_tanker';
      const leakRate = isTanker ? 15.0 * dt : 2.5 * dt;
      fuel.tankLevel = Math.max(0, fuel.tankLevel - leakRate);
      
      const last = (car as any)._lastFuelAnchor;
      const addFuelStain = (wx: number, wy: number) => {
        if (isTanker) {
          // Spawn multiple and larger stains
          const count = Math.random() < 0.5 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            const sx = wx + (Math.random() * 24 - 12);
            const sy = wy + (Math.random() * 24 - 12);
            let found = false;
            for (const stain of world.stains) {
              if (stain.type === 'fuel') {
                const dx = stain.x - sx;
                const dy = stain.y - sy;
                if (dx * dx + dy * dy < 25 * 25) { // larger merge radius for tanker spills
                  stain.radius = Math.min(38, stain.radius + 1.2); // larger growth
                  stain.maxRadius = Math.max(stain.maxRadius, 38);
                  stain.life = Math.max(0, stain.life - 30);
                  stain.alpha = Math.min(0.95, stain.alpha + 0.15);
                  found = true;
                  break;
                }
              }
            }
            if (!found && world.stains.length < 600) {
              world.stains.push({
                id: Math.random().toString(36).substring(2, 9),
                x: sx,
                y: sy,
                radius: 12 + Math.random() * 8, // much larger starting radius
                maxRadius: 28 + Math.random() * 20, // much larger max radius
                type: 'fuel',
                alpha: 0.85,
                life: 0,
                maxLife: 240 + Math.random() * 120
              });
            }
          }
        } else {
          addOrGrowFluidStain(world, wx, wy, 'fuel');
        }
      };

      if (last) {
        const dx = fuelAnchor.x - last.x;
        const dy = fuelAnchor.y - last.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          // Car is moving, interpolate along the path to form a continuous track
          const steps = Math.min(25, Math.ceil(dist / (isTanker ? 4 : 6)));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const ix = last.x + dx * t;
            const iy = last.y + dy * t;
            addFuelStain(ix + (Math.random() * (isTanker ? 6 : 1.5) - (isTanker ? 3 : 0.75)), iy + (Math.random() * (isTanker ? 6 : 1.5) - (isTanker ? 3 : 0.75)));
          }
        } else {
          // Stationary or very slow
          addFuelStain(fuelAnchor.x + (Math.random() * (isTanker ? 12 : 4) - (isTanker ? 6 : 2)), fuelAnchor.y + (Math.random() * (isTanker ? 12 : 4) - (isTanker ? 6 : 2)));
        }
      } else {
        addFuelStain(fuelAnchor.x + (Math.random() * (isTanker ? 12 : 4) - (isTanker ? 6 : 2)), fuelAnchor.y + (Math.random() * (isTanker ? 12 : 4) - (isTanker ? 6 : 2)));
      }
      (car as any)._lastFuelAnchor = { x: fuelAnchor.x, y: fuelAnchor.y };
    } else {
      (car as any)._lastFuelAnchor = null;
    }
  } else {
    (car as any)._lastFuelAnchor = null;
  }

  // 5. UNIFIED FLUID STORAGE SYSTEM (Tankers, Water Trucks, Barrel Trailers)
  ensureVehicleFluidTank(car);
  if (car.fluidTank && car.fluidTank.capacity > 0) {
    const fTank = car.fluidTank;

    // Check severe structural damage, crumple, or fire rupture
    const isTankHeavilyDamaged = (
      dmg.rearCrumple > 3.5 || 
      dmg.leftDent > 2.0 || 
      dmg.rightDent > 2.0 || 
      dmg.frontLeftDent > 2.8 || 
      dmg.frontRightDent > 2.8 || 
      dmg.rearLeftDent > 2.8 || 
      dmg.rearRightDent > 2.8 || 
      !!dmg.fuelTankFire ||
      !!dmg.cabinFire ||
      !!dmg.engineFire
    );

    if (isTankHeavilyDamaged && !fTank.isPunctured) {
      fTank.isPunctured = true;
    }

    const halfL = car.length / 2;
    const rearOffset = (car.type === 'trailer_barrel'|| car.type === 'trailer_vacuum') ? -halfL * 0.75 : -halfL * 0.65;
    const tankAnchor = {
      x: car.x + cosA * rearOffset,
      y: car.y + sinA * rearOffset
    };

    const targetStainType = liquidTypeToStainType(fTank.liquidType);

    const spawnCisternStain = (wx: number, wy: number, isMajorSpill: boolean) => {
      const stainRadius = isMajorSpill ? (3.8 + Math.random() * 2.2) : (1.6 + Math.random() * 1.2);
      const stainMaxRadius = isMajorSpill ? (12 + Math.random() * 4) : (5.5 + Math.random() * 2.5);
      const stainAlpha = targetStainType === 'oil'? 0.80 : (targetStainType === 'coolant'? 0.70 : (targetStainType === 'water'? 0.60 : 0.65));

      let merged = false;
      for (const st of world.stains) {
        if (st.type === targetStainType) {
          const dx = st.x - wx;
          const dy = st.y - wy;
          const mergeDist = isMajorSpill ? 14 : 7;
          if (dx * dx + dy * dy < mergeDist * mergeDist) {
            st.radius = Math.min(st.maxRadius, st.radius + (isMajorSpill ? 0.35 : 0.15));
            st.maxRadius = Math.max(st.maxRadius, stainMaxRadius);
            st.life = Math.max(0, st.life - 10);
            st.alpha = Math.min(0.85, st.alpha + 0.05);
            merged = true;
            break;
          }
        }
      }

      if (!merged && world.stains.length < 600) {
        world.stains.push({
          id: `tank_stain_${Date.now()}_${Math.random()}`,
          x: wx,
          y: wy,
          radius: stainRadius,
          maxRadius: stainMaxRadius,
          type: targetStainType,
          alpha: stainAlpha,
          life: 0,
          maxLife: targetStainType === 'water'? (60 + Math.random() * 30) : (200 + Math.random() * 100),
          onFire: false,
          fireIntensity: 0
        });
      }

      // If water is spilled, douse overlapping ground fire!
      if (targetStainType === 'water') {
        for (const st of world.stains) {
          if (st.onFire) {
            const dx = st.x - wx;
            const dy = st.y - wy;
            if (dx * dx + dy * dy < 28 * 28) {
              st.onFire = false;
              st.fireIntensity = 0;
              if (world.particles) {
                world.particles.push({
                  x: st.x,
                  y: st.y,
                  vx: (Math.random() - 0.5) * 16,
                  vy: -25 - Math.random() * 20,
                  radius: 4 + Math.random() * 4,
                  color: '#f8fafc',
                  alpha: 0.75,
                  life: 0,
                  maxLife: 0.65,
                  type: 'engine_smoke'});
              }
            }
          }
        }
      }

      // Droplet particles
      if (isMajorSpill && world.particles && Math.random() < 0.35) {
        const pColor = targetStainType === 'water'? (Math.random() < 0.6 ? '#38bdf8': '#e0f2fe') :
                       (targetStainType === 'fuel'? (Math.random() < 0.7 ? '#f59e0b': '#ca8a04') :
                       (targetStainType === 'oil'? '#0f172a': '#22c55e'));
        world.particles.push({
          x: wx,
          y: wy,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          radius: 1.2 + Math.random() * 1.5,
          color: pColor,
          alpha: 0.85,
          life: 0,
          maxLife: 0.28,
          type: 'debris'});
      }
    };

    // A. Puncture / High-speed rupture leak
    if (fTank.isPunctured && fTank.currentVolume > 0) {
      const pRate = fTank.punctureRatePerSec || 16.0; // L/s
      const drained = Math.min(fTank.currentVolume, pRate * dt);
      fTank.currentVolume = Math.max(0, fTank.currentVolume - drained);

      const last = fTank._lastLeakAnchor;
      if (last) {
        const dx = tankAnchor.x - last.x;
        const dy = tankAnchor.y - last.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
          const steps = Math.min(10, Math.ceil(dist / 14));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            spawnCisternStain(last.x + dx * t + (Math.random() * 4 - 2), last.y + dy * t + (Math.random() * 4 - 2), true);
          }
        } else {
          spawnCisternStain(tankAnchor.x + (Math.random() * 6 - 3), tankAnchor.y + (Math.random() * 6 - 3), true);
        }
      } else {
        spawnCisternStain(tankAnchor.x, tankAnchor.y, true);
      }
      fTank._lastLeakAnchor = { x: tankAnchor.x, y: tankAnchor.y };
    }
    // B. Manual Drain Valve opened (dumping liquid on ground)
    else if (fTank.drainValveOpen && fTank.currentVolume > 0) {
      const drainRate = 8.0; // 8 L/s
      const drained = Math.min(fTank.currentVolume, drainRate * dt);
      fTank.currentVolume = Math.max(0, fTank.currentVolume - drained);
      spawnCisternStain(tankAnchor.x + (Math.random() * 4 - 2), tankAnchor.y + (Math.random() * 4 - 2), true);
      fTank._lastLeakAnchor = { x: tankAnchor.x, y: tankAnchor.y };
    }
    // C. Non-Hermetic Idle Micro-Leaks (Water Trucks & Barrel Trailers)
    else if (!fTank.isHermetic && fTank.currentVolume > 0) {
      const currentSpeed = Math.hypot(car.vx, car.vy);
      const isIdleOrParked = currentSpeed < 0.6 || car.isParked;
      
      fTank.idleLeakTimer = (fTank.idleLeakTimer || 0) + dt;

      // Leak interval: while idle/parked, drips consistently to leave puddles
      const dripInterval = isIdleOrParked ? 1.5 : 4.0;
      if (fTank.idleLeakTimer >= dripInterval) {
        fTank.idleLeakTimer = 0;
        const dripChance = fTank.leakProbabilityPerSec !== undefined ? fTank.leakProbabilityPerSec : 0.3;
        if (Math.random() < (isIdleOrParked ? Math.max(0.65, dripChance * 2.5) : dripChance)) {
          const dripAmount = (fTank.dripRatePerSec || 0.12) * (isIdleOrParked ? 1.5 : 0.8);
          fTank.currentVolume = Math.max(0, fTank.currentVolume - dripAmount);
          spawnCisternStain(tankAnchor.x + (Math.random() * 4 - 2), tankAnchor.y + (Math.random() * 4 - 2), false);
        }
      }
      fTank._lastLeakAnchor = null;
    } else {
      // Hermetic tanks (like fuel tankers) do not leak when intact
      fTank._lastLeakAnchor = null;
    }

    // C. Front Street-Washing Nozzles (Поливомоечные сопла водовоза КО-829А с приводом от КОМ)
    if (car.type === 'truck_water'&& car.isWashingNozzlesActive) {
      const curWater = fTank.currentVolume ?? fTank.currentAmount ?? 0;
      const isEngineRunning = !!car.engineState?.engineRunning;
      const isPtoActive = !!car.isPtoActive;
      const isPumpPowered = isEngineRunning && isPtoActive;

      if (curWater <= 0) {
        car.isWashingNozzlesActive = false;
        fTank.currentVolume = 0;
        fTank.currentAmount = 0;
      } else if (!isPumpPowered) {
        // Without engine running & PTO engaged, pump cannot generate pressure (gentle gravity drip)
        fTank.currentVolume = Math.max(0, curWater - 0.25 * dt);
        fTank.currentAmount = fTank.currentVolume;

        // Micro-drips under front bumper
        car._washParticleTimer = (car._washParticleTimer || 0) + dt;
        if (car._washParticleTimer >= 0.12 && world.particles && world.particles.length < 450) {
          car._washParticleTimer = 0;
          const halfL = car.length / 2;
          const frontX = car.x + cosA * (halfL + 2);
          const frontY = car.y + sinA * (halfL + 2);
          world.particles.push({
            x: frontX + (Math.random() - 0.5) * 6,
            y: frontY + (Math.random() - 0.5) * 6,
            vx: car.vx * 0.1 + (Math.random() - 0.5) * 5,
            vy: car.vy * 0.1 + (Math.random() - 0.5) * 5,
            radius: 1.2,
            color: '#e0f2fe',
            alpha: 0.6,
            life: 0,
            maxLife: 0.15,
            type: 'water_spray'});
        }
      } else {
        // High pressure pump driven by PTO (КОМ) & engine RPM
        const rpm = car.engineState?.engineRPM || 800;
        const rpmRatio = Math.min(1.0, Math.max(0, (rpm - 750) / 1850));
        const nozPressureFactor = 0.65 + rpmRatio * 0.55; // 0.65 at idle (3.8 bar), up to 1.20 at high RPM (7.6 bar)!

        // Drain water rate scales with RPM pump pressure (~1.8 to 3.4 L/s)
        const drainRate = 1.6 + nozPressureFactor * 1.5;
        const drained = Math.min(curWater, drainRate * dt);
        fTank.currentVolume = Math.max(0, curWater - drained);
        fTank.currentAmount = fTank.currentVolume;

        // Front bumper nozzle coordinates
        const halfL = car.length / 2;
        const halfW = car.width / 2;
        const frontDist = halfL + 2;
        const frontX = car.x + cosA * frontDist;
        const frontY = car.y + sinA * frontDist;

        const normX = -sinA;
        const normY = cosA;

        const nozzleLX = frontX - normX * (halfW * 0.85);
        const nozzleLY = frontY - normY * (halfW * 0.85);
        const nozzleRX = frontX + normX * (halfW * 0.85);
        const nozzleRY = frontY + normY * (halfW * 0.85);

        // Realistic downward-angled ground impact geometry:
        // Nozzles hit the pavement ~2.0 - 3.0m (20 - 30px) in front of the bumper and fan outwards
        const impactForward = 20 + nozPressureFactor * 9;
        const impactOutward = 12 + nozPressureFactor * 14;

        // Left & right ground impact points
        const leftImpX = frontX + cosA * impactForward - normX * (halfW * 0.85 + impactOutward);
        const leftImpY = frontY + sinA * impactForward - normY * (halfW * 0.85 + impactOutward);
        const rightImpX = frontX + cosA * impactForward + normX * (halfW * 0.85 + impactOutward);
        const rightImpY = frontY + sinA * impactForward + normY * (halfW * 0.85 + impactOutward);

        // Spray emission angles
        const leftSprayAngle = Math.atan2(leftImpY - nozzleLY, leftImpX - nozzleLX);
        const rightSprayAngle = Math.atan2(rightImpY - nozzleRY, rightImpX - nozzleRX);

        // Particles: Downward high-speed jet streams and ground splash/mist
        car._washParticleTimer = (car._washParticleTimer || 0) + dt;
        if (car._washParticleTimer >= 0.032) { // ~30 FPS particle rate
          car._washParticleTimer = 0;
          if (world.particles && world.particles.length < 480) {
            const jetSpeed = (160 + nozPressureFactor * 140) + Math.abs(car.speed) * 0.3;

            // 1. High velocity downward jet stream particles from nozzles
            for (const [nx, ny, sang] of [[nozzleLX, nozzleLY, leftSprayAngle], [nozzleRX, nozzleRY, rightSprayAngle]] as const) {
              const spread = (Math.random() - 0.5) * 0.22;
              const pAng = sang + spread;
              world.particles.push({
                x: nx,
                y: ny,
                vx: Math.cos(pAng) * jetSpeed + car.vx * 0.2,
                vy: Math.sin(pAng) * jetSpeed + car.vy * 0.2,
                radius: 1.6 + nozPressureFactor * 0.8 + Math.random() * 1.2,
                color: Math.random() < 0.70 ? '#ffffff': (Math.random() < 0.5 ? '#e0f2fe': '#38bdf8'),
                alpha: 0.85,
                life: 0,
                maxLife: 0.12 + nozPressureFactor * 0.04,
                type: 'water_spray'});
            }

            // 2. Ground impact splash & mist bursting along the contact zone
            for (const [ix, iy, sideSign] of [[leftImpX, leftImpY, -1], [rightImpX, rightImpY, 1]] as const) {
              const splashAng = car.angle + sideSign * (0.65 + Math.random() * 0.45);
              const splashSpeed = (40 + nozPressureFactor * 60) + Math.random() * 30;
              world.particles.push({
                x: ix + (Math.random() - 0.5) * 8,
                y: iy + (Math.random() - 0.5) * 8,
                vx: Math.cos(splashAng) * splashSpeed + car.vx * 0.3,
                vy: Math.sin(splashAng) * splashSpeed + car.vy * 0.3,
                radius: 2.0 + nozPressureFactor * 1.5 + Math.random() * 1.8,
                color: Math.random() < 0.6 ? '#f0f9ff': '#bae6fd',
                alpha: 0.65,
                life: 0,
                maxLife: 0.22 + nozPressureFactor * 0.08,
                type: 'water_spray'});
            }
          }
        }

        // Sound throttling
        if (!car._waterSpraySoundTimer) car._waterSpraySoundTimer = 0;
        car._waterSpraySoundTimer += dt;
        const soundInterval = Math.max(0.08, 0.15 - rpmRatio * 0.05);
        if (car._waterSpraySoundTimer >= soundInterval) {
          car._waterSpraySoundTimer = 0;
          sound.playWaterSpray();
        }

        // Hydrodynamic sweep & washing physics (Runs frequently for smooth, responsive interaction)
        car._washSweepTimer = (car._washSweepTimer || 0) + dt;
        if (car._washSweepTimer >= 0.04) {
          const sweepDt = car._washSweepTimer;
          car._washSweepTimer = 0;

          const sweepCenterDist = frontDist + 14 + nozPressureFactor * 8;
          const sweepCenterX = car.x + cosA * sweepCenterDist;
          const sweepCenterY = car.y + sinA * sweepCenterDist;
          const sweepReachFwd = frontDist + impactForward + 10;
          const sweepReachSide = halfW * 0.85 + impactOutward + 12;

          // 1) Hydrodynamic physical push on street litter (Снос мусора струей воды к обочине)
          if (world.litter && world.litter.length > 0) {
            for (let i = world.litter.length - 1; i >= 0; i--) {
              const lit = world.litter[i];
              // Transform to truck local coordinates
              const relFwd = (lit.x - car.x) * cosA + (lit.y - car.y) * sinA;
              const relSide = -(lit.x - car.x) * sinA + (lit.y - car.y) * cosA;

              // Check if within the forward washing blast cone
              if (relFwd >= halfL - 2 && relFwd <= sweepReachFwd && Math.abs(relSide) <= sweepReachSide) {
                const sideSign = relSide < 0 ? -1 : 1; // Left or right side of truck
                const pushStrength = (110 + nozPressureFactor * 160);

                // Water jet vector: sweeps forward and pushes outward towards curb
                const pushNormX = cosA * 0.45 + (sideSign * normX) * 0.88;
                const pushNormY = sinA * 0.45 + (sideSign * normY) * 0.88;

                lit.vx += pushNormX * pushStrength * sweepDt;
                lit.vy += pushNormY * pushStrength * sweepDt;
                lit.rotationSpeed += sideSign * (15 + Math.random() * 20);
                lit.isAirborne = true;
                lit.airborneTimer = Math.max(lit.airborneTimer || 0, 0.4);

                // Spawn micro water splash at litter position
                if (Math.random() < 0.25 && world.particles && world.particles.length < 480) {
                  world.particles.push({
                    x: lit.x,
                    y: lit.y,
                    vx: pushNormX * 35 + (Math.random() - 0.5) * 20,
                    vy: pushNormY * 35 + (Math.random() - 0.5) * 20,
                    radius: 1.8,
                    color: '#e0f2fe',
                    alpha: 0.75,
                    life: 0,
                    maxLife: 0.18,
                    type: 'water_spray'});
                }

                // Track continuous high-pressure wash duration on litter
                const litAny = lit as { washDuration?: number };
                litAny.washDuration = (litAny.washDuration || 0) + sweepDt;

                // After sustained high pressure washing (~1.8-2.4s), small paper/trash disintegrates and is washed away
                const isLightDebris = lit.type === 'paper'|| lit.type === 'newspaper'|| lit.type === 'leaf'|| lit.type === 'butt'|| lit.type === 'wrapper';
                const dissolveThreshold = isLightDebris ? 1.4 : 2.5;

                if (litAny.washDuration >= dissolveThreshold) {
                  world.litter.splice(i, 1);
                  if (world.particles && world.particles.length < 480) {
                    for (let p = 0; p < 3; p++) {
                      world.particles.push({
                        x: lit.x + (Math.random() - 0.5) * 6,
                        y: lit.y + (Math.random() - 0.5) * 6,
                        vx: pushNormX * 45 + (Math.random() - 0.5) * 30,
                        vy: pushNormY * 45 + (Math.random() - 0.5) * 30,
                        radius: 2.2,
                        color: '#f0f9ff',
                        alpha: 0.85,
                        life: 0,
                        maxLife: 0.25,
                        type: 'water_spray'});
                    }
                  }
                }
              }
            }
          }

          // 2) Gradual scrubbing of stains & instant extinguishing of fires
          if (world.stains && world.stains.length > 0) {
            for (let i = world.stains.length - 1; i >= 0; i--) {
              const st = world.stains[i];
              const relFwd = (st.x - car.x) * cosA + (st.y - car.y) * sinA;
              const relSide = -(st.x - car.x) * sinA + (st.y - car.y) * cosA;

              if (relFwd >= halfL - 4 && relFwd <= sweepReachFwd && Math.abs(relSide) <= sweepReachSide) {
                // Instantly extinguish any burning stain
                if (st.onFire) {
                  st.onFire = false;
                  st.fireIntensity = 0;
                }

                // Gradually dilute and wash non-water stains (oil, coolant, fuel, sand)
                if (st.type !== 'water') {
                  const sideSign = relSide < 0 ? -1 : 1;
                  // Hydrodynamic scrubbing erosion rate
                  st.radius -= (0.45 + nozPressureFactor * 0.45) * sweepDt * 8;
                  st.alpha -= (0.15 + nozPressureFactor * 0.20) * sweepDt * 6;
                  // Shift stain slightly towards road curb under wash current
                  st.x += (sideSign * normX) * sweepDt * 18;
                  st.y += (sideSign * normY) * sweepDt * 18;

                  if (st.radius <= 0.8 || st.alpha <= 0.05) {
                    world.stains.splice(i, 1);
                  }
                }
              }
            }
          }

          // 3) Glistening wet road trail (Creates wide clean wet asphalt track behind nozzles)
          if (world.stains) {
            let merged = false;
            for (let i = 0; i < world.stains.length; i++) {
              const st = world.stains[i];
              if (st.type === 'water') {
                const dx = st.x - sweepCenterX;
                const dy = st.y - sweepCenterY;
                if (dx * dx + dy * dy < 40 * 40) {
                  st.radius = Math.min(22, st.radius + 0.6);
                  st.life = 0; // Refresh drying lifetime
                  st.alpha = Math.min(0.65, st.alpha + 0.06);
                  merged = true;
                  break;
                }
              }
            }

            // Spawn new wet track segment if none exists at current position
            if (!merged && world.stains.length < 400) {
              world.stains.push({
                id: `w_track_${Math.floor(sweepCenterX)}_${Math.floor(sweepCenterY)}`,
                x: sweepCenterX + (Math.random() - 0.5) * 12,
                y: sweepCenterY + (Math.random() - 0.5) * 12,
                radius: 8 + nozPressureFactor * 4,
                maxRadius: 20,
                type: 'water',
                alpha: 0.55,
                life: 0,
                maxLife: 45,
                onFire: false,
                fireIntensity: 0
              });
            }
          }
        }
      }
    }
  }

  if (fuel.detonation || fuel.fuelQuality < 50) {
    eng.engineKnocking = true;
    if (eng.engineRunning && Math.random() < 0.08) {
      // Backfire sparks at exhaust pipe
      world.particles.push({
        x: exhaustAnchor.x,
        y: exhaustAnchor.y,
        vx: -cosA * 60 + (Math.random() * 20 - 10),
        vy: -sinA * 60 + (Math.random() * 20 - 10),
        radius: 2 + Math.random() * 2,
        color: '#f97316',
        alpha: 0.9,
        life: 0,
        maxLife: 0.15,
        type: 'spark'});
      if (car.isPlayerControlled) {
        sound.playDetonation();
      }
    }
  }

  // --- REALISTIC VEHICLE EXHAUST SMOKE EMISSION ---
  emitVehicleExhaust(car, dt, world);

  // --- VEHICLE FIRE SPREAD & DYNAMIC MULTI-MINUTE LIFECYCLE (210s) ---
  const isFireActive = (dmg.underHoodSmolder || dmg.engineFire || dmg.fuelTankFire || dmg.cabinFire) && !dmg.isFullyBurnt;
  if (isFireActive) {
    dmg.fireTimer = (dmg.fireTimer || 0) + dt;
    const t = dmg.fireTimer;
    const isRearOrigin = dmg.fireOrigin === 'rear'|| (dmg.fuelTankFire && !dmg.engineFire && t < 70.0);

    // Continuous fuel tank draining & feeding the ground puddle beneath the car
    if (fuel.tankLevel > 0 && (dmg.fuelTankFire || dmg.fuelTankBurntThrough || dmg.cabinFire || t > 35.0)) {
      // Tank drains gasoline under the vehicle (fuel burns off gradually over minutes)
      const drainRate = (dmg.fuelTankBurntThrough ? 0.38 : 0.18) * dt;
      fuel.tankLevel = Math.max(0, fuel.tankLevel - drainRate);

      // Periodically spawn / grow burning fuel puddles under the fuel tank & chassis
      if (Math.random() < 9.0 * dt) {
        addOrGrowFluidStain(world, fuelAnchor.x + (Math.random() * 8 - 4), fuelAnchor.y + (Math.random() * 8 - 4), 'fuel');
      }
    }

    // Ground puddle ignition and life refresh under burning car
    if (world.stains) {
      for (const st of world.stains) {
        if (st.type === 'fuel'|| st.type === 'oil') {
          const dx = st.x - car.x;
          const dy = st.y - car.y;
          if (Math.hypot(dx, dy) < car.length * 0.48 + st.radius) {
            st.onFire = true;
            st.fireIntensity = Math.max(st.fireIntensity || 0.4, 0.85);
            // Refresh puddle lifespan while fuel is actively dripping from burning vehicle!
            if (fuel.tankLevel > 0) {
              st.life = Math.max(0, st.life - 12.0 * dt);
            }
            dmg.groundPuddleIgnited = true;
          }
        }
      }
    }

    if (isRearOrigin) {
      // =======================================================================
      // ТРАЕКТОРИЯ 1: ВОЗГОРАНИЕ СЗАДИ (БЕНЗОБАК / ТОПЛИВОПРОВОД / ДНИЩЕ)
      // Пострадавшая машина, удар в корму или бок в районе бака.
      // Двигатель спереди цел и не горит! Огонь питается вытекающим бензином.
      // =======================================================================
      if (t < 20.0) {
        // ЭТАП 1: Горение бензобака и лужи под кормой (0–20 сек)
        // Огонь бушует сзади и под днищем, капот цел, мотор спереди не дымит!
        dmg.fuelTankFire = true;
        dmg.engineFire = false;
        dmg.underHoodSmolder = false;
        dmg.cabinFire = false;
        dmg.fireProgress = Math.min(0.25, 0.12 + (t / 20.0) * 0.13);
        dmg.fireIntensity = 0.65;
        car.cabinSmoke = Math.min(25, (t / 20.0) * 25); // дым начинает подсасываться сзади
        car.heaterTemp = (car.heaterTemp ?? 20) + 1.0 * dt;
      } else if (t < 60.0) {
        // ЭТАП 2: Прогорание бака и прорыв через багажник в салон (20–60 сек)
        // Бак окончательно прогорает / плавится, разливая остатки бензина под днищем
        if (!dmg.fuelTankBurntThrough) {
          dmg.fuelTankBurntThrough = true;
          fuel.tankPunctured = true;
          dmg.rearGlassCracked = true;
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, 'БЕНЗОБАК ПОЛНОСТЬЮ ПРОГОРЕЛ! Горящий бензин заливает асфальт под машиной, лопнуло заднее стекло!', 'warning');
          }
        }
        const p2 = (t - 20.0) / 40.0;
        dmg.fireProgress = 0.25 + p2 * 0.30; // 0.25 to 0.55
        dmg.fireIntensity = 0.90;

        // Дым и температура в салоне нарастают с задней части
        car.cabinSmoke = Math.min(100, 25 + p2 * 75);
        car.heaterTemp = (car.heaterTemp ?? 20) + 3.8 * dt;

        if (t > 42.0 && !dmg.cabinFire) {
          dmg.cabinFire = true;
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, 'ОГОНЬ ПРОРВАЛСЯ В САЛОН ЧЕРЕЗ ЗАДНИЕ СИДЕНЬЯ! СРОЧНО ПОКИДАЙТЕ МАШИНУ!', 'warning');
          }
        }
      } else if (t < 135.0) {
        // ЭТАП 3: Полномасштабный пожар всего кузова (60–135 сек)
        // Салон полностью охвачен пламенем, горят сиденья, шины, обшивка потолка
        dmg.cabinFire = true;
        dmg.fuelTankFire = true;
        dmg.windshieldCracked = true;
        if (t > 85.0 && !dmg.engineFire) {
          dmg.engineFire = true; // Пламя охватывает и переднюю панель с капотом
          eng.engineRunning = false;
          eng.isSeized = true;
        }
        const p3 = (t - 60.0) / 75.0;
        dmg.fireProgress = 0.55 + p3 * 0.30; // 0.55 to 0.85
        dmg.fireIntensity = 1.0;
        car.cabinSmoke = 100;
        car.heaterTemp = Math.min(350, (car.heaterTemp ?? 20) + 7.5 * dt);
        eng.engineHealth = 0;
      } else if (t < 195.0) {
        // ЭТАП 4: Догорание обшивки, резины и каркаса (135–195 сек)
        const p4 = (t - 135.0) / 60.0;
        dmg.fireProgress = 0.85 + p4 * 0.15;
        dmg.fireIntensity = Math.max(0.15, 1.0 - p4 * 0.75); // пламя постепенно спадает
        car.cabinSmoke = 100;
        car.heaterTemp = Math.max(100, (car.heaterTemp ?? 20) - 1.2 * dt);
      } else {
        // ЭТАП 5: Обугленный остов (195+ сек)
        dmg.isFullyBurnt = true;
        dmg.fuelTankFire = false;
        dmg.cabinFire = false;
        dmg.engineFire = false;
        dmg.underHoodSmolder = false;
        dmg.fireIntensity = 0;
        car.cabinSmoke = 0;
      }
    } else {
      // =======================================================================
      // ТРАЕКТОРИЯ 2: ВОЗГОРАНИЕ СПЕРЕДИ (МОТОРНЫЙ ОТСЕК / РАМПА)
      // Влетевшая передом машина. Очаг под капотом.
      // =======================================================================
      if (t < 15.0) {
        // ЭТАП 1: Тление под капотом (0–15 сек)
        dmg.underHoodSmolder = true;
        dmg.engineFire = false;
        dmg.cabinFire = false;
        dmg.fuelTankFire = false;
        dmg.engineSmoking = true;
        dmg.fireProgress = Math.min(0.15, (t / 15.0) * 0.15);
        dmg.fireIntensity = 0.05;
        eng.temperature = Math.max(eng.temperature, 95 + (t / 15.0) * 25);
        car.engineTemp = eng.temperature;
        car.cabinSmoke = 0;
      } else if (t < 48.0) {
        // ЭТАП 2: Открытое пламя в моторном отсеке (15–48 сек)
        if (!dmg.engineFire) {
          dmg.engineFire = true;
          dmg.underHoodSmolder = false;
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, 'В моторном отсеке разгорелось открытое пламя! Токсичный дым проникает в салон!', 'warning');
          }
        }
        const p2 = (t - 15.0) / 33.0;
        dmg.fireProgress = 0.15 + p2 * 0.30; // 0.15 to 0.45
        dmg.fireIntensity = Math.min(1.0, 0.3 + p2 * 0.5);
        car.heaterTemp = (car.heaterTemp ?? 20) + 1.8 * dt;
        car.cabinSmoke = Math.min(100, p2 * 100);
        eng.temperature = Math.max(eng.temperature, 120 + p2 * 80);
        car.engineTemp = eng.temperature;
        eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 15 * dt);

        if (t > 22.0 && eng.engineRunning) {
          eng.engineRunning = false;
          eng.engineStalled = true;
          eng.isSeized = true;
          eng.starterWorking = false;
        }
      } else if (t < 95.0) {
        // ЭТАП 3: Прорыв через моторный щит в салон и перегрев магистралей (48–95 сек)
        if (!dmg.cabinFire) {
          dmg.cabinFire = true;
          dmg.windshieldCracked = true;
          dmg.hoodBuckled = true;
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, 'ОГОНЬ ПРОРВАЛ МОТОРНЫЙ ЩИТ И ВОРВАЛСЯ В САЛОН! ТОРПЕДА ПЛАВИТСЯ!', 'warning');
          }
        }
        // На 65-й секунде огонь доходит по топливопроводу до бака, бак прогорает
        if (t > 65.0 && !dmg.fuelTankBurntThrough) {
          dmg.fuelTankBurntThrough = true;
          dmg.fuelTankFire = true;
          fuel.tankPunctured = true;
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, 'ОГОНЬ ДОБРАЛСЯ ДО БЕНЗОБАКА! Горящее топливо разливается под днищем!', 'warning');
          }
        }
        const p3 = (t - 48.0) / 47.0;
        dmg.fireProgress = 0.45 + p3 * 0.35; // 0.45 to 0.80
        dmg.fireIntensity = 1.0;
        car.heaterTemp = Math.min(350, (car.heaterTemp ?? 20) + 9.5 * dt);
        car.cabinSmoke = 100;
        eng.engineHealth = 0;
      } else if (t < 165.0) {
        // ЭТАП 4: Полномасштабный инферно (95–165 сек)
        dmg.cabinFire = true;
        dmg.engineFire = true;
        dmg.fuelTankFire = true;
        dmg.rearGlassCracked = true;
        const p4 = (t - 95.0) / 70.0;
        dmg.fireProgress = 0.80 + p4 * 0.15; // 0.80 to 0.95
        dmg.fireIntensity = 1.0;
        car.cabinSmoke = 100;
        car.heaterTemp = Math.min(350, (car.heaterTemp ?? 20) + 2.0 * dt);
      } else if (t < 215.0) {
        // ЭТАП 5: Затухание и обугливание каркаса (165–215 сек)
        const p5 = (t - 165.0) / 50.0;
        dmg.fireProgress = 0.95 + p5 * 0.05;
        dmg.fireIntensity = Math.max(0.1, 1.0 - p5 * 0.8);
        car.cabinSmoke = 100;
      } else {
        // ЭТАП 6: Полное выгорание
        dmg.isFullyBurnt = true;
        dmg.engineFire = false;
        dmg.cabinFire = false;
        dmg.fuelTankFire = false;
        dmg.underHoodSmolder = false;
        dmg.fireIntensity = 0;
        car.cabinSmoke = 0;
      }
    }
  }

  // --- CHAIN REACTION LOGIC FOR ADJACENT VEHICLES ---
  // A neighboring vehicle can ONLY ignite if:
  // 1. Proximity < 1.5m to open flame torch for 45-60 continuous seconds, OR
  // 2. Burning fuel puddle directly reaches its fuel tank
  if (!dmg.isFullyBurnt && !dmg.engineFire && !dmg.underHoodSmolder && !dmg.cabinFire && !dmg.fuelTankFire) {
    let nearOpenFlame = false;
    if (world.vehicles) {
      for (const other of world.vehicles) {
        if (other !== car && other.damage && (other.damage.engineFire || other.damage.cabinFire || other.damage.fuelTankFire) && !other.damage.isFullyBurnt) {
          const distCenters = Math.hypot(other.x - car.x, other.y - car.y);
          const gap = Math.max(0, distCenters - (car.length + other.length) * 0.42);
          // 1.5 meters is ~18-20 pixels
          if (gap < 20) {
            nearOpenFlame = true;
            break;
          }
        }
      }
    }

    if (nearOpenFlame) {
      car.externalHeatTimer = (car.externalHeatTimer || 0) + dt;
      // After 50 seconds of continuous severe heat exposure (45-60s range)
      if (car.externalHeatTimer >= 50.0) {
        dmg.underHoodSmolder = true;
        dmg.fireTimer = 0;
        dmg.engineSmoking = true;
        car.externalHeatTimer = 0;
        if (car.isPlayerControlled && (world as any).player) {
          addPlayerNotification((world as any).player, 'Машина задымилась и загорелась от длительного непрерывного жара соседнего факела огня!', 'warning');
        }
      }
    } else if (car.externalHeatTimer && car.externalHeatTimer > 0) {
      car.externalHeatTimer = Math.max(0, car.externalHeatTimer - 0.5 * dt);
    }
  }

  // --- MODULE 5: 4-CORNER INDIVIDUAL SUSPENSION PHYSICS ---
  // Damaged front corner suspension increases localized rolling resistance and introduces asymmetric steering pull
  dmg.steeringDrift = (dmg.frontLeftSuspensionDamage - dmg.frontRightSuspensionDamage) * 1.0;
  
  if (dmg.wheelRubResistance > 0) {
    if (Math.abs(car.speed) > 0) {
      const rubDrag = Math.min(120, dmg.wheelRubResistance) * 1.5 * dt;
      if (car.speed > 0) car.speed = Math.max(0, car.speed - rubDrag);
      else car.speed = Math.min(0, car.speed + rubDrag);
    }
  }

  if (Math.abs(dmg.steeringDrift) > 0.01 && Math.abs(car.speed) > 10) {
    const pullRate = dmg.steeringDrift * (car.speed / 120) * 0.35 * dt;
    car.angle += pullRate;
  }
  
  // Rear suspension reduces lateral grip factor. This will be consumed in `updateVehiclePhysics`car.driftFactor = Math.min(1.0, (dmg.rearLeftSuspensionDamage + dmg.rearRightSuspensionDamage) / 2);
}

export function updatePlayerPedestrianPhysics(
  player: Player,
  input: InputState,
  buildings: Building[],
  dt: number,
  cameraAngle: number = 0,
  worldWidth: number = 52000,
  worldHeight: number = 30000,
  world?: GameWorld,
  vehGrid?: any
) {
  if (player.isInVehicle) return;

  const effectiveWorldW = world?.width ?? worldWidth;
  const effectiveWorldH = world?.height ?? worldHeight;

  // FLYING / NOCLIP CREATIVE MODE
  if (player.isFlying) {
    let moveX = 0;
    let moveY = 0;
    if (input.forward) moveY -= 1;
    if (input.backward) moveY += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    const len = Math.hypot(moveX, moveY);
    const flySpeed = input.sprint ? 800 : 350; // Super fast fly when holding Shift

    if (len > 0.01) {
      moveX /= len;
      moveY /= len;

      const rotAngle = cameraAngle + Math.PI / 2;
      const cos = Math.cos(rotAngle);
      const sin = Math.sin(rotAngle);
      const worldMoveX = moveX * cos - moveY * sin;
      const worldMoveY = moveX * sin + moveY * cos;

      player.vx = worldMoveX * flySpeed;
      player.vy = worldMoveY * flySpeed;
      player.angle = Math.atan2(worldMoveY, worldMoveX);
      player.speed = flySpeed;
    } else {
      player.vx *= 0.8;
      player.vy *= 0.8;
      player.speed = Math.hypot(player.vx, player.vy);
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.walkCycle += dt * 12;
    return; // Completely bypass all building/vehicle/map collision logic when flying!
  }
  
  if (player.isFainting || player.isHospitalized || player.isSleeping) {
    player.vx = 0;
    player.vy = 0;
    return;
  }

  // If player is inside a building, bypass standard physics and use interior constraints
  if (player.isInsideBuilding && player.insideBuildingId && world) {
    const bld = world.buildings.find(b => b.id === player.insideBuildingId);
    if (bld) {
      const floor = player.currentFloor ?? 0;
      const layout = getBuildingLayout(bld, floor, player.insideApartmentId || undefined);

      // Handle standard movement WASD input inside the building
      let moveX = 0;
      let moveY = 0;
      if (input.forward) moveY -= 1;
      if (input.backward) moveY += 1;
      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;

      const len = Math.hypot(moveX, moveY);
      const speed = input.sprint ? 140 : 80; // Slower, more controlled movement speed inside buildings

      if (len > 0.01) {
        moveX /= len;
        moveY /= len;
        
        // Rotate input based on camera angle so WASD moves in screen coordinates
        const rotAngle = cameraAngle + Math.PI / 2;
        const cos = Math.cos(rotAngle);
        const sin = Math.sin(rotAngle);
        const worldMoveX = moveX * cos - moveY * sin;
        const worldMoveY = moveX * sin + moveY * cos;

        player.vx = worldMoveX * speed;
        player.vy = worldMoveY * speed;
        player.angle = Math.atan2(worldMoveY, worldMoveX);
        player.walkCycle += dt * (input.sprint ? 14 : 8);
        player.speed = speed;
      } else {
        player.vx = 0;
        player.vy = 0;
        player.speed = 0;
      }

      // Apply movement inside building
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Apply interior constraints
      constrainPlayerToInterior(player, bld, layout, dt);
      return;
    }
  }

  // Dodge Roll / Quick Dash Trigger (Space key on foot - requires at least 8 stamina)
  const canRoll = !player.isDashing && (player.dashTimer || 0) <= 0 && (!player.needs || player.needs.energy >= 8);
  if (input.handbrake && canRoll) {
    player.isDashing = true;
    player.dashTimer = 0.28; // Roll duration in seconds
    if (player.needs) {
      player.needs.energy = Math.max(0, player.needs.energy - 12);
    }

    // Roll in current input direction if WASD pressed, or facing direction
    let inputX = 0;
    let inputY = 0;
    if (input.forward) inputY -= 1;
    if (input.backward) inputY += 1;
    if (input.left) inputX -= 1;
    if (input.right) inputX += 1;

    let rollAngle = player.angle;
    if (Math.hypot(inputX, inputY) > 0.01) {
      const len = Math.hypot(inputX, inputY);
      inputX /= len;
      inputY /= len;
      const rotAngle = cameraAngle + Math.PI / 2;
      const cosM = Math.cos(rotAngle);
      const sinM = Math.sin(rotAngle);
      const worldRollX = inputX * cosM - inputY * sinM;
      const worldRollY = inputX * sinM + inputY * cosM;
      rollAngle = Math.atan2(worldRollY, worldRollX);
    }

    player.dashAngle = rollAngle;
    player.angle = rollAngle;
    sound.resume();
  }

  if (player.isDashing) {
    player.dashTimer = (player.dashTimer || 0) - dt;
    const dashSpeed = 260; // Energetic quick dash
    const dAngle = player.dashAngle ?? player.angle;
    player.vx = Math.cos(dAngle) * dashSpeed;
    player.vy = Math.sin(dAngle) * dashSpeed;
    player.speed = dashSpeed;
    player.walkCycle += dt * 26;

    // Dust particles on dodge roll
    if (world && Math.random() < 0.65) {
      world.particles.push({
        x: player.x + (Math.random() * 8 - 4),
        y: player.y + (Math.random() * 8 - 4),
        vx: -Math.cos(dAngle) * 35 + (Math.random() * 20 - 10),
        vy: -Math.sin(dAngle) * 35 + (Math.random() * 20 - 10),
        radius: 2.5 + Math.random() * 2.5,
        color: '#cbd5e1',
        alpha: 0.6,
        life: 0,
        maxLife: 0.3,
        type: 'tire_smoke'});
    }

    if ((player.dashTimer || 0) <= 0) {
      player.isDashing = false;
      player.dashTimer = 0.32; // Brief cooldown before next dodge roll
    }
  } else {
    if (player.dashTimer && player.dashTimer > 0) {
      player.dashTimer -= dt;
    }

    let moveX = 0;
    let moveY = 0;
    if (!player.isFainting) {
      if (input.forward) moveY -= 1;
      if (input.backward) moveY += 1;
      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;
    }

    const len = Math.hypot(moveX, moveY);

    // Check leg injuries for speed penalties and limping
    const leftFractured = player.bodyState?.bodyParts?.leftLeg.some(i => i.type === 'fracture'&& !i.treated);
    const rightFractured = player.bodyState?.bodyParts?.rightLeg.some(i => i.type === 'fracture'&& !i.treated);
    const isDoubleFracture = leftFractured && rightFractured;
    const hasFracture = leftFractured || rightFractured;
    const hasLegInjury = player.bodyState?.bodyParts && (
      player.bodyState.bodyParts.leftLeg.some(i => !i.treated && i.type !== 'abrasion') ||
      player.bodyState.bodyParts.rightLeg.some(i => !i.treated && i.type !== 'abrasion')
    );
    const legPenalty = isDoubleFracture ? 0.07 : (hasFracture ? 0.18 : (hasLegInjury ? 0.55 : 1.0));

    // Calculate realistic carried weight and bulky hands penalty
    const carriedWeight = getPlayerTotalCarriedWeight(player);
    const leftBulky = !!(player.leftHandItem && (player.leftHandItem.volume || 0) >= 10);
    const rightBulky = !!(player.rightHandItem && (player.rightHandItem.volume || 0) >= 10);
    const isCarryingBulky = leftBulky || rightBulky;

    // Weight penalty:
    // 0 - 8 kg: 1.0 (light, no penalty)
    // 8 - 25 kg: scales down from 1.0 to 0.75
    // 25 - 45 kg: scales down from 0.75 to 0.45
    // 45+ kg: heavily encumbered, scales down to 0.25
    let weightPenalty = 1.0;
    if (carriedWeight > 8) {
      if (carriedWeight <= 25) {
        weightPenalty = 1.0 - ((carriedWeight - 8) / 17) * 0.25;
      } else if (carriedWeight <= 45) {
        weightPenalty = 0.75 - ((carriedWeight - 25) / 20) * 0.30;
      } else {
        weightPenalty = Math.max(0.25, 0.45 - ((carriedWeight - 45) / 25) * 0.20);
      }
    }
    if (isCarryingBulky) {
      weightPenalty *= 0.82; // Holding a big 20L canister or bulky bag slows your stride
    }

    const canSprint = input.sprint && (!player.needs || player.needs.energy > 5) && !hasLegInjury && carriedWeight < 40 && !isCarryingBulky;
    
    let mPenalty = 0;
    if (player.equippedClothing) {
      for (const slot of Object.values(player.equippedClothing)) {
        for (const item of Object.values(slot || {})) {
          if (item && item.clothingStats) mPenalty += item.clothingStats.mobilityPenalty || 0;
        }
      }
    }
    const mobilityFactor = Math.max(0.2, 1.0 - (mPenalty * 0.01)) * weightPenalty;
    let targetSpeed = (canSprint ? 175 : 95) * legPenalty * mobilityFactor;

    // Water Immersion, Wading & Swimming Physics
    const pWaterDepth = world ? getUniversalWaterDepthAt(world, player.x, player.y) : 0;
    player.waterDepth = pWaterDepth;
    player.isWading = pWaterDepth > 0.12 && pWaterDepth <= 0.85;
    player.isSwimming = pWaterDepth > 0.85;

    if (pWaterDepth > 0.08) {
      if (player.isSwimming) {
        targetSpeed = 46 * mobilityFactor; // Swimming stroke speed
      } else {
        targetSpeed *= Math.max(0.35, 1.0 - pWaterDepth * 0.55); // Fluid wading resistance
      }

      // Wetness accumulation while in water
      if (player.bodyState) {
        const soakRate = Math.min(1.5, pWaterDepth) * 42.0;
        player.bodyState.wetness = Math.min(100, (player.bodyState.wetness || 0) + soakRate * dt);
      }
      player.wetFootstepCount = 30;

      // Energy drain from wading and swimming against water
      if (player.needs && len > 0.01) {
        const swimStaminaDrain = (player.isSwimming ? 5.5 : 2.2) * dt;
        player.needs.energy = Math.max(0, player.needs.energy - swimStaminaDrain);
      }

      // River current drift while in water
      if (pWaterDepth > 0.15) {
        const river = getRiverWaterAt(player.x, player.y);
        if (river.inWater && !river.isBridge) {
          const currentPush = player.isSwimming ? 0.70 : Math.min(0.45, pWaterDepth * 0.40);
          player.vx += river.currentVx * currentPush * dt;
          player.vy += river.currentVy * currentPush * dt;
        }
      }

      // Water splash particles
      if (len > 0.01 && world && world.particles && Math.random() < (player.isSwimming ? 0.55 : 0.30)) {
        world.particles.push({
          x: player.x + (Math.random() * 14 - 7),
          y: player.y + (Math.random() * 14 - 7),
          vx: (Math.random() * 20 - 10),
          vy: (Math.random() * 20 - 10),
          radius: player.isSwimming ? 2.5 + Math.random() * 2.5 : 1.8 + Math.random() * 1.8,
          color: '#bae6fd',
          alpha: 0.75,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
          type: 'water_splash'
        });
      }
    } else if (pWaterDepth <= 0.05 && (player.wetFootstepCount || 0) > 0 && len > 0.01 && world) {
      if (Math.random() < 0.22) {
        player.wetFootstepCount!--;
        if (!world.stains) world.stains = [];
        world.stains.push({
          id: 'wet_step_' + Date.now() + Math.random(),
          x: player.x,
          y: player.y,
          type: 'water',
          radius: 3.5,
          maxRadius: 4.5,
          alpha: 0.35,
          life: 0,
          maxLife: 18,
          onFire: false,
          fireIntensity: 0
        });
      }
    }


    // Authentic gait hitching / limping rhythm when walking with an injured leg or fracture
    if (hasLegInjury && len > 0.01) {
      const hitchRhythm = Math.sin(player.walkCycle * (hasFracture ? 3.5 : 2.2));
      if (hitchRhythm > (hasFracture ? 0.2 : 0.55)) {
        targetSpeed *= (isDoubleFracture ? 0.15 : (hasFracture ? 0.25 : 0.4)); // Severe pain hitch / limp step
      }

      // Pain shock & health drain from moving on untreated fractures
      if (hasFracture) {
        const shockDrain = isDoubleFracture ? 5.5 : 2.2;
        player.needs.health = Math.max(0, player.needs.health - shockDrain * dt);

        if (player.bodyState) {
          player.bodyState.painLevel = Math.min(100, (player.bodyState.painLevel || 0) + (isDoubleFracture ? 30 : 12) * dt);
          player.bodyState.shockLevel = Math.min(100, (player.bodyState.shockLevel || 0) + (isDoubleFracture ? 25 : 10) * dt);
        }

        // Collapse from excruciating traumatic pain shock if health reaches 0 or pain hits critical peak
        if (!player.isHospitalized && !player.needsHospitalEvacuation && (player.needs.health <= 0 || (player.bodyState && player.bodyState.painLevel >= 95 && Math.random() < 0.35 * dt))) {
          player.needs.health = 0;
          player.isFainting = true;
          player.needsHospitalEvacuation = true;
          player.evacCause = 'fractures_shock';
          player.evacPhase = 'dispatch';
          player.hospitalEvacTimer = 0;
          if (player.isInVehicle) {
            player.isInVehicle = false;
            player.currentVehicleId = null;
          }
          sound.playGroan();
          addPlayerNotification(player, `Вы потеряли сознание от невыносимого болевого шока сломанных ног! Вызывается Бригада Скорой Помощи...`, 'warning');
        }
      }
    }

    if (len > 0.01) {
      moveX /= len;
      moveY /= len;

      // Transform screen WASD input directly into world space relative to camera orientation
      let rotAngle = cameraAngle + Math.PI / 2;

      // Panic & Fear spatial disorientation ("ломает координацию в пространстве")
      const panicLevel = player.bodyState?.panicLevel || 0;
      if (panicLevel > 10) {
        const panicNorm = Math.min(1.0, panicLevel / 100);
        // Erratic swaying angle offset that swings left and right unpredictably
        const panicSwayAngle = Math.sin(Date.now() * 0.0038) * (panicNorm * 0.45) + Math.cos(Date.now() * 0.0075) * (panicNorm * 0.25);
        rotAngle += panicSwayAngle;
      }

      const cosM = Math.cos(rotAngle);
      const sinM = Math.sin(rotAngle);
      const worldMoveX = moveX * cosM - moveY * sinM;
      const worldMoveY = moveX * sinM + moveY * cosM;

      // Responsive acceleration lerp
      const targetVx = worldMoveX * targetSpeed;
      const targetVy = worldMoveY * targetSpeed;
      player.vx += (targetVx - player.vx) * Math.min(1.0, 10 * dt);
      player.vy += (targetVy - player.vy) * Math.min(1.0, 10 * dt);

      // Panic stumble velocity jitter
      if (panicLevel > 25) {
        const panicJitter = (panicLevel / 100) * 40;
        player.vx += (Math.random() - 0.5) * panicJitter;
        player.vy += (Math.random() - 0.5) * panicJitter;
      }

      // Smooth body rotation lerp towards movement direction or aim angle
      const targetAngle = Math.atan2(worldMoveY, worldMoveX);
      let angleDiff = (targetAngle - player.angle) % (Math.PI * 2);
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      player.angle += angleDiff * Math.min(1.0, 25 * dt);

      player.walkCycle += dt * (canSprint ? 18 : (hasLegInjury ? 7 : 10));
      player.speed = Math.hypot(player.vx, player.vy);

      // Footstep dust particles when sprinting
      if (canSprint && world && Math.random() < 0.25) {
        world.particles.push({
          x: player.x,
          y: player.y,
          vx: (Math.random() * 16 - 8),
          vy: (Math.random() * 16 - 8),
          radius: 1.8 + Math.random() * 1.5,
          color: '#94a3b8',
          alpha: 0.35,
          life: 0,
          maxLife: 0.25,
          type: 'tire_smoke'});
      }
    } else {
      // Smooth deceleration with natural inertia
      player.vx += (0 - player.vx) * Math.min(1.0, 8 * dt);
      player.vy += (0 - player.vy) * Math.min(1.0, 8 * dt);
      player.speed = Math.hypot(player.vx, player.vy);
      if (player.speed < 1.5) {
        player.vx = 0;
        player.vy = 0;
        player.speed = 0;
      }

      // When standing still, smoothly rotate towards aimAngle (pointer / cursor direction)
      if (player.aimAngle !== undefined) {
        let angleDiff = (player.aimAngle - player.angle) % (Math.PI * 2);
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        player.angle += angleDiff * Math.min(1.0, 20 * dt);
      }
    }
  }

  let newX = player.x + player.vx * dt;
  let newY = player.y + player.vy * dt;

  // Collision with buildings
  const pedRadius = 7.0;
  for (const bld of buildings) {
    if (newX + pedRadius > bld.x && newX - pedRadius < bld.x + bld.width &&
        newY + pedRadius > bld.y && newY - pedRadius < bld.y + bld.height) {
      const res = checkPedestrianBuildingCollision(newX, newY, pedRadius, bld);
      newX = res.x;
      newY = res.y;
    }
  }

  // Explicit collision with Gas Station structural islands (including LPG island & propane tank)
  for (const sub of GAS_STATION_STRUCTURAL_SUB_BOXES) {
    if (newX + pedRadius > sub.x && newX - pedRadius < sub.x + sub.width &&
        newY + pedRadius > sub.y && newY - pedRadius < sub.y + sub.height) {
      const res = checkPedestrianBoxCollision(newX, newY, pedRadius, sub);
      newX = res.x;
      newY = res.y;
    }
  }

  // Collision with vehicles
  if (world) {
    const nearbyVehicles = vehGrid ? vehGrid.queryRadius(newX, newY, 150) : world.vehicles;
    for (const car of nearbyVehicles) {
      const res = checkPedestrianVehicleCollision(newX, newY, pedRadius, car);
      if (res.collided) {
        newX = res.x;
        newY = res.y;

        // Apply hit damage based on real collision speed in km/h
        const carSpeedMag = Math.abs(car.speed || 0);
        const speedKmh = Math.round(carSpeedMag * PX_S_TO_SPEED_KMH); // Conversion from internal engine speed to km/h

        if (speedKmh >= 3 && player.needs) {
          const now = Date.now() / 1000;
          if (!player.lastHurtTime || now - player.lastHurtTime > 0.5) {
            player.lastHurtTime = now;
            const carType = car.type || '';
            const isTruck = carType.includes('truck') || carType.includes('bus') || carType.includes('cement') || carType.includes('garbage') || carType.includes('fire');
            
            // Calculate impact force proportional to km/h and vehicle mass
            let impactForce = speedKmh * 1.45;
            if (isTruck) impactForce *= 1.6;

            // Physical impulse & knockback throwing the player back
            const impactAngle = car.angle;
            const impulseMag = Math.min(550, speedKmh * 7.0);
            player.vx += Math.cos(impactAngle) * impulseMag;
            player.vy += Math.sin(impactAngle) * impulseMag;

            // Distribute realistic impact across limbs
            if (!player.isInvincible && !player.isCleanMode) {
              distributeImpactDamage(player, impactForce, impactAngle, true);
              sound.playHurt();

              // Clear speed-calibrated notifications
              if (speedKmh < 12) {
                addPlayerNotification(player, `Легкий толчок бампером (${speedKmh} км/ч). Ссадины и легкие ушибы.`, 'info');
              } else if (speedKmh < 32) {
                addPlayerNotification(player, `Сбит автомобилем на скорости ${speedKmh} км/ч! Ушибы и растяжение!`, 'warning');
              } else if (speedKmh < 60) {
                addPlayerNotification(player, `Тяжелое столкновение (${speedKmh} км/ч)! Перелом кости и кровотечение!`, 'warning');
              } else {
                addPlayerNotification(player, `Критический наезд на большой скорости (${speedKmh} км/ч)! Множественные переломы!`, 'warning');
              }
            }
          }
        }
      }
    }
  }

  // Collision with props (streetlamps, trash cans, benches, etc.)
  if (world) {
    for (const prop of world.props) {
      if (prop.isBroken) continue;
      const hitbox = getPropHitbox(prop);
      if (hitbox.shape === 'none') continue;

      if (hitbox.shape === 'circle') {
        const propRadius = hitbox.radius!;
        const dx = newX - prop.x;
        const dy = newY - prop.y;
        const distSq = dx * dx + dy * dy;
        const minDist = pedRadius + propRadius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          if (dist > 0.0001) {
            newX += (dx / dist) * overlap;
            newY += (dy / dist) * overlap;
          } else {
            newX += minDist;
          }
        }
      } else if (hitbox.shape === 'box') {
        const dx = newX - prop.x;
        const dy = newY - prop.y;
        const pAngle = prop.angle || 0;
        const cosP = Math.cos(pAngle);
        const sinP = Math.sin(pAngle);

        // Pedestrian position in prop's local coordinates
        const localX = dx * cosP + dy * sinP;
        const localY = -dx * sinP + dy * cosP;

        const hw = hitbox.halfWidth!;
        const hh = hitbox.halfHeight!;

        // Closest point on the prop box
        const closestX = Math.max(-hw, Math.min(localX, hw));
        const closestY = Math.max(-hh, Math.min(localY, hh));

        const diffX = localX - closestX;
        const diffY = localY - closestY;
        const distSq = diffX * diffX + diffY * diffY;

        if (distSq < pedRadius * pedRadius && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = pedRadius - dist;
          const localPushX = (diffX / dist) * overlap;
          const localPushY = (diffY / dist) * overlap;
          newX += localPushX * cosP - localPushY * sinP;
          newY += localPushX * sinP + localPushY * cosP;
        } else if (distSq <= 0.0001) {
          // Inside prop box: push out along closest edge
          const dLeft = localX + hw;
          const dRight = hw - localX;
          const dTop = localY + hh;
          const dBottom = hh - localY;
          const minD = Math.min(dLeft, dRight, dTop, dBottom);
          let localPushX = 0;
          let localPushY = 0;
          if (minD === dLeft) localPushX = -(dLeft + pedRadius);
          else if (minD === dRight) localPushX = (dRight + pedRadius);
          else if (minD === dTop) localPushY = -(dTop + pedRadius);
          else localPushY = (dBottom + pedRadius);
          newX += localPushX * cosP - localPushY * sinP;
          newY += localPushX * sinP + localPushY * cosP;
        }
      }
    }
  }

  // World bounds clamp (full world size including northern wilderness)
  const minWorldX = -4000;
  const maxWorldX = Math.max(52000, effectiveWorldW) - 20;
  const minWorldY = -5000;
  const maxWorldY = Math.max(30000, effectiveWorldH) - 20;
  player.x = Math.max(minWorldX, Math.min(maxWorldX, newX));
  player.y = Math.max(minWorldY, Math.min(maxWorldY, newY));
}

// === WINDSHIELD FOGGING, CONDENSATION & EVAPORATION LOGIC ===

/**
 * Calculates ambient outside air temperature in °C based on time of day and weather.
 */
export function getOutsideTemperature(world: GameWorld, timeHour?: number): number {
  if (typeof (world as any)?.outsideTemp === 'number'&& Number.isFinite((world as any).outsideTemp)) {
    return (world as any).outsideTemp;
  }
  let hour = 12;
  if (typeof timeHour === 'number'&& Number.isFinite(timeHour)) {
    hour = timeHour;
  } else if (world && typeof world.timeHour === 'number'&& Number.isFinite(world.timeHour)) {
    hour = world.timeHour;
  }
  // Diurnal sinusoidal temperature curve:
  // - Night / Early morning 04:30: Coolest (~9.5°C to 11°C)
  // - Midday / Afternoon 14:30: Warmest (~22.5°C to 25°C on clear sunny dry day)
  const diurnal = Math.sin(((hour - 8.5) / 24) * 2 * Math.PI);
  let temp = 16.5 + diurnal * 7.0;

  if (world?.weather === 'clear') temp += 2.0; // solar radiation warming
  else if (world?.weather === 'rain') temp -= 4.5; // cool precipitation
  else if (world?.weather === 'storm') temp -= 7.5; // cold storm front
  else if (world?.weather === 'fog') temp -= 3.5; // damp fog cooling

  return Math.round(temp * 10) / 10;
}

/**
 * Updates windshield condensation / fogging level according to thermodynamic balance.
 * Returns normalized fog level strictly between 0.0 (crystal clear) and 1.0 (completely opaque).
 * 
 * 1. Accumulation factors (+ to fogging):
 *    - Cold glass condensation: ONLY occurs when outer glass is cold (outsideTemp < 14°C)
 *      or in humid weather (rain, storm, fog) where dew point is exceeded.
 *    - Wet clothing: evaporation from soaked clothes (player.wetness > 12) saturates cabin air.
 *    - Cold air blower: if heater is on but engineTemp < 55°C, cold damp air blows directly onto glass.
 *    - In warm, dry weather (>16°C, sunny/cloudy, dry clothes), glass DOES NOT fog, and natural dry air dissipates moisture.
 * 
 * 2. Evaporation factors (- to fogging):
 *    - Warm heater defroster: effective drying when engineTemp > 65°C.
 *    - Open window (windowOpen): draft equalizes humidity and clears fog.
 *    - Natural dry air ventilation: warm dry ambient air naturally evaporates fog.
 */
export function updateFog(
  car: Vehicle,
  player: Player | undefined,
  world: GameWorld,
  dt: number,
  timeHour: number = 12
): number {
  const safeDt = Number.isFinite(dt) ? dt : 0.016;
  const delta = Math.min(0.2, Math.max(0.0, safeDt));
  const safeHour = (typeof timeHour === 'number'&& Number.isFinite(timeHour)) ? timeHour : 12;
  if (delta <= 0) return (typeof car.fogLevel === 'number'&& Number.isFinite(car.fogLevel)) ? car.fogLevel : 0.0;

  // 1. Environmental inputs
  const outsideTemp = getOutsideTemperature(world, safeHour);
  const isRaining = world?.weather === 'rain'|| world?.weather === 'storm';
  const isHumidWeather = isRaining || world?.weather === 'fog';

  // 2. Engine temperature resolution (sync car.engineTemp and car.engineState.temperature)
  let engineTemp = typeof car.engineTemp === 'number'&& Number.isFinite(car.engineTemp)
    ? car.engineTemp
    : (typeof car.engineState?.temperature === 'number'&& Number.isFinite(car.engineState.temperature) ? car.engineState.temperature : 20);
  car.engineTemp = engineTemp;
  if (car.engineState) {
    car.engineState.temperature = engineTemp;
  }

  // 3. Occupancy & Respiration
  const isPlayerInside = !!(player && player.isInVehicle && player.currentVehicleId === car.id);
  let passengerCount = (car as any).passengers ?? 0;
  if (isPlayerInside) {
    passengerCount = Math.max(1, passengerCount);
  }

  // 4. Wet clothing evaporation
  let wetness = 0;
  if (isPlayerInside && player) {
    wetness = player.bodyState?.wetness ?? (player as any).wetness ?? 0;
  }
  const wetRatio = Math.max(0, Math.min(100, Number.isFinite(wetness) ? wetness : 0)) / 100;
  const wetClothesRate = wetRatio > 0.12 ? (wetRatio - 0.12) * 0.045 : 0;

  // 5. Glass Temperature & Dew Point Check:
  // On warm dry days (outsideTemp >= 16°C, no rain, dry clothes), the windshield surface temperature
  // is well above dew point. Human breath disperses into the dry cabin air without condensing on glass.
  let isCondensationCondition = false;
  let coldGlassFactor = 0.0;

  if (outsideTemp < 14.0) {
    // Cold weather drops glass temp below cabin dew point
    isCondensationCondition = true;
    coldGlassFactor = Math.min(2.5, (14.0 - outsideTemp) / 8.0);
  } else if (isHumidWeather) {
    // Rain or fog pushes relative humidity near 100%
    isCondensationCondition = true;
    coldGlassFactor = isRaining ? 1.4 : 1.1;
  } else if (wetRatio > 0.20) {
    // Soaked clothing over-saturates cabin humidity
    isCondensationCondition = true;
    coldGlassFactor = 1.0;
  }

  // Respiration moisture only condenses when glass is cold or air is saturated
  const breathCondensationRate = isCondensationCondition
    ? passengerCount * 0.009 * (1.0 + coldGlassFactor)
    : 0.0;

  // 6. Heater / Blower state
  const heaterMode = car.heaterMode || 'off';
  const fanSpeed = heaterMode === 'high'? 1.0 : heaterMode === 'med'? 0.65 : heaterMode === 'low'? 0.35 : 0.0;

  let coldBlowerFogRate = 0.0;
  let warmBlowerDryRate = 0.0;

  if (fanSpeed > 0) {
    if (engineTemp < 55) {
      // COLD BLOWER: When engineTemp < 55°C, heater core is cold and damp, blowing wet cold air directly onto glass
      const coldFraction = Math.max(0, Math.min(1.0, (55 - engineTemp) / 35));
      coldBlowerFogRate = fanSpeed * (0.016 + 0.032 * coldFraction);
    } else if (engineTemp > 65) {
      // WARM HEATER DRYING: Effective drying when engineTemp > 65°C
      const warmFraction = Math.max(0, Math.min(1.0, (engineTemp - 65) / (90 - 65)));
      warmBlowerDryRate = fanSpeed * (0.032 + 0.078 * warmFraction);
    } else {
      // Lukewarm transition (55°C - 65°C)
      const lukewarmFraction = (engineTemp - 55) / 10;
      warmBlowerDryRate = fanSpeed * lukewarmFraction * 0.015;
    }
  }

  // 7. Open window draft dynamics
  const windowOpen = !!car.windowOpen;
  let windowDraftDryRate = 0.0;

  if (windowOpen) {
    const speedKmh = Math.abs(car.speed || 0) * PX_S_TO_SPEED_KMH;
    const speedDraftBonus = Math.min(0.05, (speedKmh / 75) * 0.05);
    windowDraftDryRate = 0.035 + speedDraftBonus;

    // Open window cools down cabin temperature towards outside ambient
    const cabinTemp = (typeof car.heaterTemp === 'number'&& Number.isFinite(car.heaterTemp)) ? car.heaterTemp : 18;
    const tempDelta = cabinTemp - outsideTemp;
    car.heaterTemp = cabinTemp - tempDelta * 0.35 * delta;
  }

  // 8. Natural dry air evaporation on warm dry days
  let naturalDryAirEvaporation = 0.0;
  if (!isHumidWeather && outsideTemp >= 15.0) {
    // Warm, dry atmospheric air naturally clears any residual glass haze
    const warmthBonus = Math.min(0.04, (outsideTemp - 15.0) * 0.005);
    naturalDryAirEvaporation = 0.025 + warmthBonus;
  }

  // 9. Accumulation vs Evaporation Balance
  const windowRetention = windowOpen ? 0.15 : 1.0;
  let accumulationRate = (breathCondensationRate + wetClothesRate) * windowRetention + coldBlowerFogRate;

  let evaporationRate = warmBlowerDryRate + windowDraftDryRate + naturalDryAirEvaporation;

  // 10. Net Balance, Smooth dt Integration & Clamping to [0.0, 1.0]
  const netRate = accumulationRate - evaporationRate;
  const prevFog = (typeof car.fogLevel === 'number'&& Number.isFinite(car.fogLevel)) ? car.fogLevel : 0.0;
  let newFog = prevFog + netRate * delta;
  if (!Number.isFinite(newFog) || (!isCondensationCondition && fanSpeed === 0 && !windowOpen && newFog < 0.001)) {
    newFog = 0.0;
  }
  newFog = Math.max(0.0, Math.min(1.0, newFog));
  car.fogLevel = newFog;

  return newFog;
}

/**
 * Alias for updateFog to support both naming conventions.
 */
export function updateWindows(
  car: Vehicle,
  player: Player | undefined,
  world: GameWorld,
  dt: number,
  timeHour: number = 12
): number {
  return updateFog(car, player, world, dt, timeHour);
}

// === PLAYER SURVIVAL NEEDS & VITALS SIMULATION ===
export function updatePlayerNeedsAndVitals(
  player: Player,
  world: GameWorld,
  dt: number,
  inputOrHour: InputState | number,
  hourOrInput?: number | InputState
) {
  const defaultInput: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    sprint: false,
    actionE: false,
    hornH: false,
    headlightsL: false,
    timeToggleT: false,
    cameraZoomC: false,
    minimapZoomM: false,
    resetR: false,
    turnLeftQ: false,
    turnRightZ: false,
    shiftUp: false,
    shiftDown: false,
    hazardX: false,
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false
  };
  let input: InputState;
  let timeHour: number;
  if (typeof inputOrHour === 'number') {
    timeHour = inputOrHour;
    input = (hourOrInput as InputState) || defaultInput;
  } else {
    input = inputOrHour || defaultInput;
    timeHour = typeof hourOrInput === 'number'? hourOrInput : 12;
  }
  if (!Number.isFinite(timeHour)) timeHour = 12;
  if (!player.needs) {
    player.needs = {
      health: 100,
      hunger: 90,
      thirst: 85,
      energy: 100,
      sleepiness: 15,
      fullness: 60,
      nausea: 0
    };
  }
  if (!player.inventory) {
    player.inventory = createDefaultPlayerInventory();
  }
  if (!player.notifications) {
    player.notifications = [];
  }
  if (player.maxInventorySlots === undefined) {
    player.maxInventorySlots = 18;
  }
  if (player.selectedHotbarIndex === undefined) {
    player.selectedHotbarIndex = 0;
  }
  if (!player.bodyState) {
    player.bodyState = defaultBodyState();
  }

  // Invincibility / Creative Mode vitals override
  if (player.isInvincible || player.isCreativeMode || player.isCleanMode) {
    player.needs.health = 100;
    player.needs.hunger = 100;
    player.needs.thirst = 100;
    player.needs.energy = 100;
    player.needs.sleepiness = 0;
    player.needs.nausea = 0;
    player.isFainting = false;
    player.isHospitalized = false;
    player.needsHospitalEvacuation = false;
    if (player.bodyState) {
      player.bodyState.painLevel = 0;
      player.bodyState.effectivePain = 0;
      player.bodyState.shockLevel = 0;
      player.bodyState.bloodLoss = 0;
      player.bodyState.panicLevel = 0;
    }
  }

  // --- BODY STATE & PHYSIOLOGICAL SIMULATION ---
  const bs = player.bodyState;
  const isRaining = world.weather === 'rain'|| world.weather === 'storm';
  const isExposedToRain = isRaining && !player.isInsideBuilding && !player.isInVehicle;

  // Find vehicle if player is inside one
  const curVehicle = player.isInVehicle && player.currentVehicleId
    ? world.vehicles.find(v => v.id === player.currentVehicleId)
    : undefined;

  if (curVehicle) {
    // Ensure heater mode & temperatures are initialized
    curVehicle.heaterMode = curVehicle.heaterMode || 'off';
    const outsideTemp = getOutsideTemperature(world, timeHour);
    if (typeof curVehicle.heaterTemp !== 'number'|| !Number.isFinite(curVehicle.heaterTemp)) {
      // Parked unheated cars are noticeably colder inside than outside ambient during morning/cold weather
      curVehicle.heaterTemp = outsideTemp < 20 ? Math.round(outsideTemp - 2.5) : outsideTemp;
    }
    curVehicle.fogLevel = (typeof curVehicle.fogLevel === 'number'&& Number.isFinite(curVehicle.fogLevel)) ? curVehicle.fogLevel : 0.0;
    curVehicle.windshieldRainLevel = (typeof curVehicle.windshieldRainLevel === 'number'&& Number.isFinite(curVehicle.windshieldRainLevel)) ? curVehicle.windshieldRainLevel : 0;

    // Sync engine temperature
    const engTemp = typeof curVehicle.engineTemp === 'number'? curVehicle.engineTemp
      : (curVehicle.engineState?.temperature ?? 20);
    curVehicle.engineTemp = engTemp;

    // Heat target and progression:
    // If heater is OFF, the cabin remains distinctly cold (cool shaded interior, no heating element)
    // If heater is ON, blowing air temperature scales directly with engine coolant temperature!
    let targetCabinTemp = outsideTemp < 20 ? outsideTemp - 2.5 : outsideTemp;
    const heaterMode = curVehicle.heaterMode || 'off';
    if (heaterMode !== 'off') {
      const modeTarget = heaterMode === 'low'? 22 : heaterMode === 'med'? 27 : 34;
      // If engine is cold (<50°C), blowing air is cold!
      const maxAirFromEngine = Math.max(outsideTemp - 2.5, engTemp - 6);
      targetCabinTemp = Math.min(modeTarget, maxAirFromEngine);
    }

    // Cooling/heating transfer rate
    const transferSpeed = heaterMode !== 'off'? 0.14 : 0.07;
    const hasActiveFire = curVehicle.damage && (curVehicle.damage.engineFire || curVehicle.damage.fuelTankFire || curVehicle.damage.cabinFire || curVehicle.damage.underHoodSmolder);
    if (!hasActiveFire) {
      if (curVehicle.windowOpen) {
        // Open window rushes outside air into cabin, rapidly pulling cabin temp towards outsideTemp
        const carSpeedKmh = Math.abs(curVehicle.speed) * 3.6;
        const draftRate = 0.32 + Math.min(0.5, carSpeedKmh / 75);
        curVehicle.heaterTemp += (outsideTemp - curVehicle.heaterTemp) * draftRate * dt;
      } else {
        curVehicle.heaterTemp += (targetCabinTemp - curVehicle.heaterTemp) * transferSpeed * dt;
      }
    } else {
      // In fire conditions, cabin temperature is governed by the 4-phase fire timeline in updateVehicleSystems
      // Open window allows fresh air draft, venting out smoke
      if (curVehicle.windowOpen && curVehicle.cabinSmoke && curVehicle.cabinSmoke > 0) {
        curVehicle.cabinSmoke = Math.max(0, curVehicle.cabinSmoke - 20 * dt);
      }
    }

    // Wipers and windshield rain level (exterior water on the glass)
    if (isRaining) {
      if (!curVehicle.wipersOn) {
        // Build up water on the screen
        curVehicle.windshieldRainLevel = Math.min(100, curVehicle.windshieldRainLevel + 16 * dt);
      } else {
        // Clear rain quickly
        curVehicle.windshieldRainLevel = Math.max(0, curVehicle.windshieldRainLevel - 45 * dt);
      }
    } else {
      // Dry out gradually
      curVehicle.windshieldRainLevel = Math.max(0, curVehicle.windshieldRainLevel - 15 * dt);
    }

    // Mathematical update of windshield fogging (moisture & temperature balance)
    updateFog(curVehicle, player, world, dt, timeHour);
  }


  // Calculate clothing stats
  let totalInsulation = 0;
  let totalWaterResist = 0;
  let totalBreathability = 0;
  let totalMobilityPenalty = 0;
  
  if (player.equippedClothing) {
    for (const slot of Object.values(player.equippedClothing)) {
      for (const item of Object.values(slot || {})) {
        if (item && item.clothingStats) {
          totalInsulation += item.clothingStats.insulation || 0;
          totalWaterResist += item.clothingStats.waterResistance || 0;
          totalBreathability += item.clothingStats.breathability || 0;
          totalMobilityPenalty += item.clothingStats.mobilityPenalty || 0;
        }
      }
    }
  }

  // 1. Wetness accumulation / drying
  if (isExposedToRain) {
    const wetRate = Math.max(0, 5.0 - (totalWaterResist * 0.05));
    bs.wetness = Math.min(100, bs.wetness + wetRate * dt);
  } else {
    // In heated cabin/building, clothes dry much faster
    const cabinWarmth = curVehicle ? Math.max(0, (curVehicle.heaterTemp ?? 18) - 18) * 0.4 : 0;
    const dryRate = player.isInsideBuilding ? 4.5 : (player.isInVehicle ? (2.8 + cabinWarmth) : 2.0);
    bs.wetness = Math.max(0, bs.wetness - dryRate * dt);
  }

  // 2. Body Temperature dynamics (Freezing in cold cars, outdoors, or warming by heater)
  const outsideTemp = getOutsideTemperature(world, timeHour);
  let ambientTemp = outsideTemp;
  let isEnclosed = false;
  let hasDraft = false;

  if (curVehicle) {
    ambientTemp = curVehicle.heaterTemp ?? outsideTemp;
    isEnclosed = !curVehicle.windowOpen;
    hasDraft = !!curVehicle.windowOpen;
  } else if (player.isInsideBuilding) {
    ambientTemp = 21.0; // heated indoor environment
    isEnclosed = true;
  } else {
    hasDraft = world.weather === 'storm'|| world.weather === 'rain';
    
    // Standing near or in burning puddles
    if (world.stains) {
      let maxHeatFromStains = 0;
      for (const stain of world.stains) {
        if (stain.onFire) {
          const dx = stain.x - player.x;
          const dy = stain.y - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist < stain.radius + 50) {
            const proximityFactor = 1.0 - (dist / (stain.radius + 50));
            const heatAdded = 25.0 + proximityFactor * 135.0; // Up to 160°C on top
            if (heatAdded > maxHeatFromStains) {
              maxHeatFromStains = heatAdded;
            }
          }
        }
      }
      if (maxHeatFromStains > 0) {
        ambientTemp = Math.max(ambientTemp, maxHeatFromStains);
      }
    }

    // Near campfire, barrel fire, or wood stove: rapid drying and cozy radiant heat
    if (world.props) {
      for (const prop of world.props) {
        const pType = prop.type as string;
        if (pType === 'camp_fire_pit' || pType === 'barrel_fire' || pType === 'wood_stove') {
          const dFire = Math.hypot(prop.x - player.x, prop.y - player.y);
          if (dFire < 130) {
            const fireProx = 1.0 - (dFire / 130);
            ambientTemp = Math.max(ambientTemp, 22.0 + fireProx * 38.0);
            bs.wetness = Math.max(0, bs.wetness - 9.0 * fireProx * dt);
          }
        }
      }
    }

    if (bs.wetness >= 70 && Math.random() < 0.04 * dt) {
      addPlayerNotification(player, 'Одежда промокла до нитки! Ледяная влажная ткань холодит кожу, начинается озноб.', 'warning');
    }
  }

  
  // Adjust ambient temp based on clothes
  // If cold outside, clothes keep you warm (increases effective ambient temp)
  const effectiveAmbientTemp = ambientTemp < 18.0 ? ambientTemp + (totalInsulation * 0.25) : ambientTemp;
  const isTooHotClothes = ambientTemp >= 25.0 && totalInsulation > 30;

  if (isTooHotClothes && !player.isInVehicle) {
      // Hot day in heavy clothes
      const sweatRate = Math.max(0, (totalInsulation * 0.05) - (totalBreathability * 0.02));
      player.needs.thirst = Math.max(0, player.needs.thirst - sweatRate * dt);
      player.needs.energy = Math.max(0, player.needs.energy - (totalMobilityPenalty * 0.05) * dt);
      bs.temperature = Math.min(38.5, bs.temperature + (sweatRate * 0.01) * dt);
  }

  if (effectiveAmbientTemp < 18.0) {
    ambientTemp = effectiveAmbientTemp; // Use effective temp for the rest of the cold calculation

    // Player is exposed to cold (whether in cold unheated car, open window, or outside)
    const coldDeficit = (18.0 - ambientTemp) / 10; // e.g. 1.0 at 8°C, 1.4 at 4°C
    const wetMultiplier = 1.0 + (bs.wetness / 100) * 3.0; // wet clothes cause severe evaporative cooling
    const draftMultiplier = hasDraft ? 1.45 : (isEnclosed ? 0.85 : 1.15);

    const coolingRate = 0.042 * coldDeficit * wetMultiplier * draftMultiplier;
    bs.temperature = Math.max(34.0, bs.temperature - coolingRate * dt);

    // Severe hypothermia penalty
    if (bs.temperature < 35.0) {
      player.needs.health = Math.max(5, (player.needs.health ?? 100) - 0.75 * dt);
    }
  } else if (!player.isInvincible && !player.isCleanMode && (ambientTemp >= 38.0 || (player.isInVehicle && (curVehicle?.cabinSmoke ?? 0) > 0))) {
    // -------------------------------------------------------------------------
    // SCALDING HEAT, CO POISONING & SMOKE INHALATION DYNAMICS
    // -------------------------------------------------------------------------
    const inCarSmoke = curVehicle ? (curVehicle.cabinSmoke ?? 0) : 0;
    const isVehicleFireActive = !!(curVehicle?.damage && (curVehicle.damage.engineFire || curVehicle.damage.fuelTankFire || curVehicle.damage.cabinFire || curVehicle.damage.underHoodSmolder));
    const fireProgress = curVehicle?.damage?.fireProgress || (ambientTemp > 80 ? 0.4 : 0.1);

    // 1. CARBON MONOXIDE (CO) ACCUMULATION & BLOOD POISONING (0-100%)
    if (player.isInVehicle && inCarSmoke > 0) {
      // In burning cabin: grows proportionally to smoke concentration
      bs.coPoisoning = Math.min(100, (bs.coPoisoning || 0) + inCarSmoke * 0.08 * dt);
    } else {
      // In fresh air: gradually dissipates
      bs.coPoisoning = Math.max(0, (bs.coPoisoning || 0) - 1.5 * dt);
    }

    const co = bs.coPoisoning || 0;
    bs.dizziness = Math.min(100, co * 1.15);
    bs.suffocationLevel = Math.min(100, co);

    // Symptoms from CO poisoning:
    // > 20%: Dizziness and rapid stamina / energy drain
    if (co > 20) {
      const staminaDrain = (co / 100) * 16.0;
      player.needs.energy = Math.max(0, player.needs.energy - staminaDrain * dt);
    }

    // > 50%: Severe coughing fits (and dynamic tunnel vision in screenEffects)
    if (co > 45 || inCarSmoke > 45) {
      bs.coughTimer = (bs.coughTimer || 0) - dt;
      if (bs.coughTimer <= 0) {
        sound.playCough();
        bs.coughTimer = Math.max(2.0, 7.0 - (co / 20.0));
      }
    }

    // > 80%: Hypoxic collapse / unconsciousness
    if (co >= 80 && !player.isFainting && !player.isHospitalized && !player.needsHospitalEvacuation) {
      player.isFainting = true;
      player.faintTimer = 18;
      sound.playGroan();
      addPlayerNotification(player, `ВЫ ПОТЕРЯЛИ СОЗНАНИЕ! Острая гипоксия и отравление угарным газом (${Math.round(co)}% CO)!`, 'warning');
    }

    // 2. THERMAL BURNS & CABIN HEAT (3 Realistic Tiers)
    if (ambientTemp <= 60.0) {
      // -----------------------------------------------------------------------
      // Tier 1: До 60°C — терпимо (одышка, потливость, жажда)
      // -----------------------------------------------------------------------
      if (ambientTemp > 38.0) {
        const heatExcess = ambientTemp - 37.0;
        // Profuse sweating
        player.needs.thirst = Math.max(0, player.needs.thirst - (0.35 + heatExcess * 0.02) * dt);
        // Mild core temperature elevation
        bs.temperature = Math.min(38.6, bs.temperature + 0.035 * dt);
        // Mild panic
        bs.panicLevel = Math.min(100, (bs.panicLevel || 0) + 2.5 * dt);
      }
    } else if (ambientTemp <= 120.0) {
      // -----------------------------------------------------------------------
      // Tier 2: 60–120°C — легкие ожоги, нарастающая пульсирующая боль
      // -----------------------------------------------------------------------
      const heatExcess = ambientTemp - 60.0;
      const heatRatio = heatExcess / 60.0; // 0.0 at 60°C to 1.0 at 120°C

      // Dehydration & hyperthermia
      player.needs.thirst = Math.max(0, player.needs.thirst - (1.0 + heatRatio * 1.5) * dt);
      bs.temperature = Math.min(40.2, bs.temperature + (0.08 + heatRatio * 0.15) * dt);

      // Mild burns (Degree 1 up to 90°C, Degree 2 above 90°C)
      const degree: 1 | 2 = ambientTemp > 90 ? 2 : 1;
      const burnSeverity = Math.min(100, Math.round(15 + heatRatio * 45));
      addInjuryToPart(bs, 'torso', 'burn', burnSeverity * 0.75, degree);
      addInjuryToPart(bs, 'leftLeg', 'burn', burnSeverity * 0.7, degree);
      addInjuryToPart(bs, 'rightLeg', 'burn', burnSeverity * 0.7, degree);
      addInjuryToPart(bs, 'leftArm', 'burn', burnSeverity * 0.55, degree);
      addInjuryToPart(bs, 'rightArm', 'burn', burnSeverity * 0.55, degree);

      // Increasing pulsating pain & panic
      bs.panicLevel = Math.min(100, (bs.panicLevel || 0) + (10 + heatRatio * 18) * dt);
      bs.shockLevel = Math.min(100, (bs.shockLevel || 0) + (5 + heatRatio * 12) * dt);

      // Moderate health loss (1.5 to 4.5 HP/sec)
      const hpDamage = 1.5 + heatRatio * 3.0;
      player.needs.health = Math.max(0, player.needs.health - hpDamage * dt);
    } else {
      // -----------------------------------------------------------------------
      // Tier 3: > 120°C (and > 150°C) — тяжелые ожоги, крики, стремительная потеря HP
      // -----------------------------------------------------------------------
      const isExtreme = ambientTemp > 150;
      const heatExcess = ambientTemp - 120.0;
      const heatRatio = Math.min(1.0, heatExcess / 100.0);

      // Severe hyperthermia & rapid dehydration
      player.needs.thirst = Math.max(0, player.needs.thirst - 3.2 * dt);
      bs.temperature = Math.min(41.9, bs.temperature + 0.35 * dt);

      // Severe burns (Degree 2 or 3)
      const degree: 2 | 3 = isExtreme ? 3 : 2;
      const burnSeverity = Math.min(100, Math.round(50 + heatRatio * 50));
      addInjuryToPart(bs, 'torso', 'burn', burnSeverity, degree);
      addInjuryToPart(bs, 'head', 'burn', burnSeverity * 0.85, degree);
      addInjuryToPart(bs, 'leftLeg', 'burn', burnSeverity * 0.9, degree);
      addInjuryToPart(bs, 'rightLeg', 'burn', burnSeverity * 0.9, degree);
      addInjuryToPart(bs, 'leftArm', 'burn', burnSeverity * 0.8, degree);
      addInjuryToPart(bs, 'rightArm', 'burn', burnSeverity * 0.8, degree);

      // High shock & maximum panic
      bs.panicLevel = 100;
      bs.shockLevel = Math.min(100, (bs.shockLevel || 0) + 25 * dt);

      // Character screams / groans in pain
      bs.groanTimer = (bs.groanTimer || 0) - dt;
      if (bs.groanTimer <= 0) {
        sound.playHurt();
        bs.groanTimer = Math.max(1.0, 2.8 - heatRatio * 1.5);
      }

      // Rapid health loss
      const hpDamage = isExtreme
        ? (16.0 + (ambientTemp - 150) * 0.12) // deadly inferno > 150°C
        : (5.0 + (ambientTemp - 120) * 0.35); // 5 to 15.5 HP/sec
      player.needs.health = Math.max(0, player.needs.health - hpDamage * dt);
    }

    // Heat stroke & asphyxiation collapse
    if (player.needs.health <= 0 && !player.isFainting && !player.isHospitalized && !player.needsHospitalEvacuation) {
      player.needs.health = 0;
      player.isFainting = true;
      player.needsHospitalEvacuation = true;
      player.evacCause = 'fire_burns';
      player.evacPhase = 'dispatch';
      player.hospitalEvacTimer = 0;
      if (player.isInVehicle) {
        player.isInVehicle = false;
        player.currentVehicleId = null;
      }
      sound.playGroan();
      addPlayerNotification(player, `ВЫ ПОТЕРЯЛИ СОЗНАНИЕ ОТ ОГНЯ И ОБЖИГАЮЩЕГО ЖАРА! Вызывается МЧС и Скорая Помощь...`, 'warning');
    }

    // Fire audio synthesis & groans
    const hasAudibleFire = isVehicleFireActive || ambientTemp > 65;
    sound.updateEngineFireSound(hasAudibleFire, Math.min(1.0, 0.3 + fireProgress * 0.7));

    // Russian warnings
    if (!player.notifications) player.notifications = [];
    const now = Date.now();
    const lastFireNotif = (player as any)._lastFireNotifTime || 0;
    if (now - lastFireNotif > 3500) {
      (player as any)._lastFireNotifTime = now;
      if (player.isInVehicle) {
        if (curVehicle?.damage?.cabinFire || ambientTemp > 180) {
          addPlayerNotification(player, `СРОЧНО ВЫБИРАЙТЕСЬ! САЛОН В ОГНЕ (${Math.round(ambientTemp)}°C)! ОБЖИГАЮЩИЙ АД!`, 'warning');
        } else if (curVehicle?.damage?.fuelTankFire) {
          addPlayerNotification(player, `ГОРИТ БЕНЗОБАК И ДНИЩЕ СЗАДИ (${Math.round(ambientTemp)}°C)! Вытекающий бензин полыхает под машиной!`, 'warning');
        } else if (curVehicle?.damage?.engineFire || ambientTemp > 75) {
          addPlayerNotification(player, `ОГОНЬ ПОД КАПОТОМ (${Math.round(ambientTemp)}°C)! Токсичный угарный газ заполняет салон!`, 'warning');
        } else if (curVehicle?.damage?.underHoodSmolder) {
          addPlayerNotification(player, `Под капотом тлеет проводка! Запах гари и серый дым из дефлекторов!`, 'warning');
        }
      } else {
        if (ambientTemp > 110) {
          addPlayerNotification(player, `ВЫ ГОРИТЕ! ВЫ НАСТУПИЛИ В ГОРЯЩУЮ ЛУЖУ ИЛИ СТОИТЕ В ОГНЕ (${Math.round(ambientTemp)}°C)! СРОЧНО БЕГИТЕ!`, 'warning');
        } else {
          addPlayerNotification(player, `Рядом полыхает огонь (${Math.round(ambientTemp)}°C)! Жар от горящего бензина или масла обжигает лицо!`, 'warning');
        }
      }
    }
  } else if (ambientTemp >= 19.5 && bs.temperature < 36.6) {
    // Warm up in heated car or heated building
    const warmFactor = Math.min(1.8, (ambientTemp - 18.0) / 12);
    const heatRate = 0.12 + 0.32 * warmFactor;
    bs.temperature = Math.min(36.6, bs.temperature + heatRate * dt);
  }

  // 3. Hydration & Energy sync
  bs.hydration = player.needs.thirst;
  bs.energy = player.needs.energy;

  // 4. Update Pharmacokinetics & Body Physiology Systems
  updateMedicineSystem(player, dt);
  updateBodySystem(player, input, dt, Date.now() / 1000);

  // 5. Audio symptom triggers & timers
  // Cold Teeth Chattering & Shivering
  if (bs.temperature < 36.1) {
    bs.shiverTimer = (bs.shiverTimer || 0) - dt;
    if (bs.shiverTimer <= 0) {
      sound.playShiver();
      bs.shiverTimer = 6 + Math.random() * 8;
      if (curVehicle && (curVehicle.heaterTemp ?? outsideTemp) < 15) {
        if (!player.notifications) player.notifications = [];
        const hasColdNotif = player.notifications.some(n => n.id.startsWith('cold_car_'));
        if (!hasColdNotif) {
          player.notifications.push({
            id: 'cold_car_'+ Date.now(),
            text: `В салоне машины холодно (${Math.round(curVehicle.heaterTemp ?? outsideTemp)}°C)! Заведите мотор и включите печку.`,
            type: 'warning',
            timer: 3.5
          });
        }
      }
    }
  }

  // Cold / Cough
  if (bs.wetness > 60 || bs.temperature < 35.8) {
    bs.coughTimer = (bs.coughTimer || 0) - dt;
    if (bs.coughTimer <= 0) {
      sound.playCough();
      bs.coughTimer = 14 + Math.random() * 16;
    }
  }

  // Dehydration / Exhaustion gasping
  if (bs.hydration < 22 || bs.energy < 18) {
    bs.heavyBreathTimer = (bs.heavyBreathTimer || 0) - dt;
    if (bs.heavyBreathTimer <= 0) {
      sound.playHeavyBreathing();
      bs.heavyBreathTimer = 7 + Math.random() * 8;
    }
  }

  // Timers countdown
  if ((bs.tinnitusTimer || 0) > 0) bs.tinnitusTimer! -= dt;
  if ((bs.impactFlashTimer || 0) > 0) bs.impactFlashTimer! -= dt;

  // Handle sleeping state
  if (player.isSleeping) {
    player.sleepTimer = (player.sleepTimer || 0) - dt;
    // Rapidly restore sleepiness and health during sleep
    player.needs.sleepiness = Math.max(0, player.needs.sleepiness - 40 * dt);
    player.needs.energy = Math.min(100, player.needs.energy + 35 * dt);
    player.needs.health = Math.min(100, player.needs.health + 20 * dt);
    
    if (player.sleepTimer <= 0) {
      player.isSleeping = false;
      player.sleepTimer = 0;
      player.needs.sleepiness = 0;
      player.needs.energy = 100;
      player.needs.health = 100;
      // Slight hunger/thirst from sleeping hours
      player.needs.hunger = Math.max(15, player.needs.hunger - 8);
      player.needs.thirst = Math.max(15, player.needs.thirst - 12);
      sound.playSleep();
      addPlayerNotification(player, 'Вы отлично выспались! Здоровье и силы на максимуме.', 'sleep');
    }
    return;
  }

  // 1. Drain Hunger (Голод)
  let hungerDrain = 0.06;
  if (input.sprint && !player.isInVehicle && player.speed > 50) {
    hungerDrain = 0.16;
  }
  player.needs.hunger = Math.max(0, player.needs.hunger - hungerDrain * dt);

  // 2. Drain Thirst (Жажда)
  let thirstDrain = 0.10;
  if (input.sprint && !player.isInVehicle && player.speed > 50) {
    thirstDrain = 0.24;
  }
  player.needs.thirst = Math.max(0, player.needs.thirst - thirstDrain * dt);

  // 3. Energy / Stamina (Усталость / Выносливость)
  const isDrowsy = player.needs.sleepiness > 75;
  const maxEnergy = isDrowsy ? 70 : 100;

  if (input.sprint && !player.isInVehicle && (input.forward || input.backward || input.left || input.right)) {
    
    let mPenalty = 0;
    if (player.equippedClothing) {
      for (const slot of Object.values(player.equippedClothing)) {
        for (const item of Object.values(slot || {})) {
          if (item && item.clothingStats) mPenalty += item.clothingStats.mobilityPenalty || 0;
        }
      }
    }
    player.needs.energy = Math.max(0, player.needs.energy - (20 + mPenalty * 0.4) * dt);
  
  } else if (player.isDashing) {
    player.needs.energy = Math.max(0, player.needs.energy - 8 * dt);
  } else {
    const recoveryRate = isDrowsy ? 15 : 28;
    if (player.needs.energy < maxEnergy) {
      player.needs.energy = Math.min(maxEnergy, player.needs.energy + recoveryRate * dt);
    }
  }

  // 4. Sleepiness (Сонливость) - Ultra-realistic circadian rhythm and homeostatic sleep drive model
  if (player.consecutiveWakeHours === undefined) {
    player.consecutiveWakeHours = 6.0; // Assume awake for 6 hours on initialization
  }

  // Detect instant time skips (e.g., from debug menu presets, time cycles, etc.)
  if (player.prevTimeHour !== undefined) {
    let deltaHours = timeHour - player.prevTimeHour;
    if (deltaHours < -12) {
      deltaHours += 24; // Handle passing midnight
    }
    // If the skip is positive and exceeds a normal frame tick (which is usually dt * 0.12 <= 0.05)
    if (deltaHours > 0.08 && !player.isSleeping) {
      // Dynamic sleepiness accumulation for skipped hours (approx 3.8 units per hour)
      const skippedSleepiness = deltaHours * 3.8;
      player.needs.sleepiness = Math.min(100, player.needs.sleepiness + skippedSleepiness);
      
      // Update consecutive wake hours to reflect skipped time
      player.consecutiveWakeHours = (player.consecutiveWakeHours || 0) + deltaHours;

      // Also adjust hunger and thirst during the skipped hours so skipping time has physiological costs!
      const hungerDrainPerHour = 1.0;
      const thirstDrainPerHour = 1.6;
      player.needs.hunger = Math.max(0, player.needs.hunger - deltaHours * hungerDrainPerHour);
      player.needs.thirst = Math.max(0, player.needs.thirst - deltaHours * thirstDrainPerHour);

      addPlayerNotification(
        player,
        `Время переместилось вперед на ${deltaHours.toFixed(1)} ч. Организм отреагировал усталостью.`,
        'info'
      );
    }
  }
  player.prevTimeHour = timeHour;

  if (player.isSleeping) {
    player.consecutiveWakeHours = 0;
  } else {
    // 1 in-game second is 0.12 in-game hours in normal gameplay
    const elapsedHours = dt * 0.12;
    player.consecutiveWakeHours = (player.consecutiveWakeHours || 0) + elapsedHours;
  }

  // A. Base fatigue accumulation rate
  let baseRate = 0.038;

  // B. Circadian Rhythm Multiplier based on biological clock
  let circadianMultiplier = 1.0;
  if (timeHour >= 2.0 && timeHour < 6.0) {
    circadianMultiplier = 2.4; // Melatonin peak, heavy biological sleep pressure
  } else if (timeHour >= 6.0 && timeHour < 12.0) {
    // "Second wind" (второе дыхание) morning alert window. Sun & morning cortisol block sleepiness
    circadianMultiplier = 0.35;
  } else if (timeHour >= 12.0 && timeHour < 16.0) {
    circadianMultiplier = 0.85; // Afternoon postprandial dip (nap pressure)
  } else if (timeHour >= 16.0 && timeHour < 21.0) {
    circadianMultiplier = 0.55; // Evening alert plateau before sunset
  } else {
    // 21:00 to 02:00
    circadianMultiplier = 1.7; // Sunset melatonin release onset
  }

  // C. Homeostatic Sleep Pressure (Time awake multiplier)
  let homeostaticMultiplier = 1.0;
  const wakeHours = player.consecutiveWakeHours || 0;
  if (wakeHours > 16.0) {
    // Awake for more than 16 hours: exponential rise in fatigue
    homeostaticMultiplier = 1.0 + (wakeHours - 16.0) * 0.18;
  } else if (wakeHours < 4.0) {
    // Freshly woke up: low sleep pressure
    homeostaticMultiplier = 0.55;
  }

  // D. Daytime Napping "Circadian Crash" Penalty (Дневной сон и сбой биоритма):
  // If you sleep during the day and wake up in the evening, your sleep pressure (wakeHours) is low,
  // but when night falls (22:00 to 06:00), your body clock expects sleep, causing an unnatural fatigue surge.
  let circadianCrashModifier = 1.0;
  const isNightTime = timeHour >= 22 || timeHour < 6;
  if (isNightTime && wakeHours < 6.0) {
    circadianCrashModifier = 1.95; // fast-tracks sleepiness at night to realign biological rhythms
  }

  // E. Physical Exertion & Driving Factors
  let physicalFactor = 1.0;
  if (input.sprint && !player.isInVehicle && player.speed > 50) {
    physicalFactor = 1.75; // running exhausts the body
  } else if (player.isInVehicle && player.speed > 10) {
    // Highway driving monotony / sleepiness, especially in dark hours (highway hypnosis)
    physicalFactor = isNightTime ? 1.25 : 0.95;
  }

  // Calculate final sleepiness rate
  const finalSleepinessRate = baseRate * circadianMultiplier * homeostaticMultiplier * circadianCrashModifier * physicalFactor;
  player.needs.sleepiness = Math.min(100, player.needs.sleepiness + finalSleepinessRate * dt);

  // F. Sleep deprivation side effects: dizziness and sudden faints (micro-sleeps)
  if (player.needs.sleepiness > 80 && !player.isSleeping && !player.isFainting) {
    if (!player.bodyState.dizziness) player.bodyState.dizziness = 0;
    player.bodyState.dizziness = Math.min(100, player.bodyState.dizziness + 3.5 * dt);

    if (player.needs.sleepiness >= 96 && wakeHours > 24.0) {
      // 1.5% chance per second of collapsing from absolute physical exhaustion (micro-sleep/faint)
      if (Math.random() < 0.015 * dt) {
        player.isFainting = true;
        player.faintTimer = 15 + Math.random() * 15; // Unconscious for 15-30s
        sound.playGroan();

        // Slightly recover sleepiness so they don't loop-collapse instantly
        player.needs.sleepiness = Math.max(68, player.needs.sleepiness - 22);
        player.needs.energy = Math.min(45, player.needs.energy + 20);
        player.consecutiveWakeHours = Math.max(12.0, player.consecutiveWakeHours - 6.0);

        addPlayerNotification(
          player,
          'ВЫ ПОТЕРЯЛИ СОЗНАНИЕ ОТ ПРЕДЕЛЬНОГО ИСТОЩЕНИЯ! Организм принудительно отключился для микросна.',
          'warning'
        );
      }
    }
  }

  // 4b. Fullness drain (Сытость - еда переваривается)
  if ((player.needs.fullness || 0) > 0) {
    const fullnessDrain = input.sprint ? 0.12 : 0.06;
    player.needs.fullness = Math.max(0, player.needs.fullness! - fullnessDrain * dt);
  }

  // 4c. Nausea drain (Тошнота проходит со временем)
  if ((player.needs.nausea || 0) > 0) {
    player.needs.nausea = Math.max(0, player.needs.nausea! - 0.8 * dt);
  }

  // 4d. Nausea effects: if very nauseous, lose health
  if ((player.needs.nausea || 0) > 80) {
    player.needs.health = Math.max(0, player.needs.health - 1.5 * dt);
  }

  // 5. Health & Survival Effects (Здоровье и Выживание)
  if (player.needs.hunger <= 0) {
    player.needs.health = Math.max(0, player.needs.health - 2.5 * dt);
  }
  if (player.needs.thirst <= 0) {
    player.needs.health = Math.max(0, player.needs.health - 3.5 * dt);
  }
  if (
    player.needs.hunger > 65 &&
    player.needs.thirst > 65 &&
    player.needs.energy > 30 &&
    player.needs.health < 100 &&
    player.needs.health > 0
  ) {
    player.needs.health = Math.min(100, player.needs.health + 1.2 * dt);
  }

  // Hospital emergency revival if health <= 0
  if (player.needs.health <= 0 && !player.isFainting && !player.isHospitalized && !player.needsHospitalEvacuation) {
    player.isFainting = true;
    player.needsHospitalEvacuation = true;
    player.evacPhase = 'dispatch';
    if (!player.evacCause) {
      const bs = player.bodyState;
      if (bs && (bs.temperature || 36.6) < 34) {
        player.evacCause = 'hypothermia';
      } else if (bs && (bs.bloodLoss || 0) > 25) {
        player.evacCause = 'blood_loss';
      } else if (player.needs.hunger < 5 || player.needs.thirst < 5) {
        player.evacCause = 'starvation';
      } else {
        player.evacCause = 'general';
      }
    }
    player.faintTimer = 0;
    player.vx = 0;
    player.vy = 0;
    if (player.isInVehicle) {
      player.isInVehicle = false;
      player.currentVehicleId = null;
    }
    sound.playGroan();
    addPlayerNotification(player, 'Критическое состояние! Вы теряете сознание...', 'warning');
  }

  // 6. Update Notification timers
  for (let i = player.notifications.length - 1; i >= 0; i--) {
    player.notifications[i].timer -= dt;
    if (player.notifications[i].timer <= 0) {
      player.notifications.splice(i, 1);
    }
  }
}

// Helper to compute if point is within road segment bounds
function isPointInRoadSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  halfWidth: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const dSq = (px - x1) * (px - x1) + (py - y1) * (py - y1);
    return dSq <= halfWidth * halfWidth;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);
  return dSq <= halfWidth * halfWidth;
}

export function getSurfaceTypeAt(world: GameWorld, x: number, y: number): { type: string; grip: number; extraDrag: number } {
  // 0. Check River "Быстрица" and aquatic fluid bodies
  const riverWater = getRiverWaterAt(x, y);
  if (riverWater.inWater && !riverWater.isBridge) {
    const d = riverWater.depth;
    return {
      type: 'water',
      grip: Math.max(0.08, 0.44 - d * 0.24),
      extraDrag: 45 + d * 150
    };
  } else if (!riverWater.inWater && riverWater.surfaceType === 'river_mud') {
    return { type: 'mud', grip: 0.55, extraDrag: 10 };
  } else if (!riverWater.inWater && riverWater.surfaceType === 'river_sand') {
    return { type: 'sand', grip: 0.68, extraDrag: 5 };
  }

  // 1. Check if the point is within any road segment (including curved and diagonal highways)
  const roads = world.roads || [];
  for (let i = 0; i < roads.length; i++) {
    const road = roads[i];
    // Shoulder buffer of +6px so tires riding the edge line don't abruptly sink
    const halfWidth = road.width / 2 + 6;

    // Fast bounding box test
    let rMinX = road._minX;
    let rMaxX = road._maxX;
    let rMinY = road._minY;
    let rMaxY = road._maxY;

    if (rMinX === undefined) {
      if (road.curvePoints && road.curvePoints.length > 0) {
        let mx = Infinity, Mx = -Infinity, my = Infinity, My = -Infinity;
        for (let k = 0; k < road.curvePoints.length; k++) {
          const pt = road.curvePoints[k];
          if (pt.x < mx) mx = pt.x;
          if (pt.x > Mx) Mx = pt.x;
          if (pt.y < my) my = pt.y;
          if (pt.y > My) My = pt.y;
        }
        road._minX = rMinX = mx;
        road._maxX = rMaxX = Mx;
        road._minY = rMinY = my;
        road._maxY = rMaxY = My;
      } else {
        road._minX = rMinX = Math.min(road.x1, road.x2);
        road._maxX = rMaxX = Math.max(road.x1, road.x2);
        road._minY = rMinY = Math.min(road.y1, road.y2);
        road._maxY = rMaxY = Math.max(road.y1, road.y2);
      }
    }

    if (x < rMinX - halfWidth || x > rMaxX + halfWidth || y < rMinY - halfWidth || y > rMaxY + halfWidth) {
      continue;
    }

    let onThisRoad = false;

    if (road.curvePoints && road.curvePoints.length > 1) {
      const pts = road.curvePoints;
      const n = pts.length;
      for (let j = 0; j < n - 1; j++) {
        const pA = pts[j];
        const pB = pts[j + 1];
        const segMinX = pA.x < pB.x ? pA.x : pB.x;
        const segMaxX = pA.x > pB.x ? pA.x : pB.x;
        const segMinY = pA.y < pB.y ? pA.y : pB.y;
        const segMaxY = pA.y > pB.y ? pA.y : pB.y;

        if (x < segMinX - halfWidth || x > segMaxX + halfWidth || y < segMinY - halfWidth || y > segMaxY + halfWidth) {
          continue;
        }

        if (isPointInRoadSegment(x, y, pA.x, pA.y, pB.x, pB.y, halfWidth)) {
          onThisRoad = true;
          break;
        }
      }
    } else if (road.direction === 'horizontal') {
      const minRoadX = Math.min(road.x1, road.x2);
      const maxRoadX = Math.max(road.x1, road.x2);
      if (x >= minRoadX - 6 && x <= maxRoadX + 6 && y >= road.y1 - halfWidth && y <= road.y1 + halfWidth) {
        onThisRoad = true;
      }
    } else if (road.direction === 'vertical') {
      const minRoadY = Math.min(road.y1, road.y2);
      const maxRoadY = Math.max(road.y1, road.y2);
      if (y >= minRoadY - 6 && y <= maxRoadY + 6 && x >= road.x1 - halfWidth && x <= road.x1 + halfWidth) {
        onThisRoad = true;
      }
    } else {
      // Diagonal or angled straight segment
      if (isPointInRoadSegment(x, y, road.x1, road.y1, road.x2, road.y2, halfWidth)) {
        onThisRoad = true;
      }
    }

    if (onThisRoad) {
      if (road.isDirt) return { type: 'dirt_road', grip: 0.82, extraDrag: 3 };
      if (road.isGravel) return { type: 'gravel_road', grip: 0.88, extraDrag: 2 };
      return { type: 'asphalt', grip: 1.00, extraDrag: 0 };
    }
  }

  // 2. Check if within any intersection
  const intersections = world.intersections || [];
  for (let i = 0; i < intersections.length; i++) {
    const inter = intersections[i];
    const halfW = inter.width / 2;
    const halfH = inter.height / 2;
    if (x >= inter.x - halfW && x <= inter.x + halfW && y >= inter.y - halfH && y <= inter.y + halfH) {
      if (inter.isDirt) return { type: 'dirt_road', grip: 0.82, extraDrag: 3 };
      if (inter.isGravel) return { type: 'gravel_road', grip: 0.88, extraDrag: 2 };
      return { type: 'asphalt', grip: 1.00, extraDrag: 0 };
    }
  }

  // 3. Check roundabouts (always paved asphalt)
  const roundabouts = world.roundabouts || [];
  for (let i = 0; i < roundabouts.length; i++) {
    const rb = roundabouts[i];
    const dx = x - rb.x;
    const dy = y - rb.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= rb.radius && dist >= rb.innerRadius) {
      return { type: 'asphalt', grip: 1.00, extraDrag: 0 };
    }
  }

  // 4. Check parking areas & sidewalks & driveways (paved concrete/asphalt)
  const parkings = world.parkings || [];
  for (let i = 0; i < parkings.length; i++) {
    const pk = parkings[i];
    if (x >= pk.x && x <= pk.x + pk.width && y >= pk.y && y <= pk.y + pk.height) {
      return { type: 'concrete', grip: 0.98, extraDrag: 0 };
    }
  }

  const sidewalks = world.sidewalks || [];
  for (let i = 0; i < sidewalks.length; i++) {
    const sw = sidewalks[i];
    if (x >= sw.x && x <= sw.x + sw.width && y >= sw.y && y <= sw.y + sw.height) {
      return { type: 'concrete', grip: 0.98, extraDrag: 1 };
    }
  }

  const driveways = world.driveways || [];
  for (let i = 0; i < driveways.length; i++) {
    const dw = driveways[i];
    if (x >= dw.x && x <= dw.x + dw.width && y >= dw.y && y <= dw.y + dw.height) {
      return { type: 'concrete', grip: 0.98, extraDrag: 0 };
    }
  }

  // 5. Check Agricultural Fields (Plowed Arable Chernozem, Wheat, Clover, Sunflowers)
  for (let i = 0; i < AGRICULTURAL_FIELDS.length; i++) {
    const f = AGRICULTURAL_FIELDS[i];
    const b = f.bounds;
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      if (f.type === 'plowed') {
        return { type: 'dirt_road', grip: 0.50, extraDrag: 36 }; // Heavy plowed loam resistance
      } else if (f.type === 'wheat') {
        return { type: 'grass', grip: 0.58, extraDrag: 24 }; // Ripe grain crop
      } else if (f.type === 'clover') {
        return { type: 'grass', grip: 0.60, extraDrag: 20 }; // Clover meadow
      } else if (f.type === 'sunflower') {
        return { type: 'dirt_road', grip: 0.54, extraDrag: 28 }; // Sunflower rows & soil
      } else if (f.type === 'pasture') {
        return { type: 'grass', grip: 0.58, extraDrag: 20 }; // Grassy knoll pasture
      }
    }
  }

  // 6. Natural Offroad Ecological Terrain & Biomes (Seamless First-Principles Simulation)
  const biome = getBiomeSampleAt(x, y);
  return {
    type: biome.surfaceType,
    grip: biome.grip,
    extraDrag: biome.extraDrag
  };
}

export function getSurfaceOffroadProps(surfType: string, isWet: boolean, isStormWeather: boolean) {
  let baseSink = 0.0;
  let wetExtraDrag = 0;
  let wetGripMult = 1.0;
  let isOffroad = false;
  let bermColor = '#452a18';
  let grooveColor = '#24140a';

  switch (surfType) {
    case 'mud':
      isOffroad = true;
      baseSink = isWet ? (isStormWeather ? 1.35 : 1.10) : 0.70;
      wetExtraDrag = isWet ? (isStormWeather ? 120 : 90) : 38;
      wetGripMult = isWet ? 0.35 : 0.62;
      bermColor = '#3a200f';
      grooveColor = '#150c05';
      break;
    case 'dirt_road':
      isOffroad = true;
      baseSink = isWet ? (isStormWeather ? 0.85 : 0.65) : 0.10;
      wetExtraDrag = isWet ? (isStormWeather ? 55 : 38) : 2;
      wetGripMult = isWet ? 0.55 : 0.98;
      bermColor = isWet ? '#442614' : '#6e4726';
      grooveColor = isWet ? '#1c1007' : '#3d2514';
      break;
    case 'grass':
      isOffroad = true;
      baseSink = isWet ? (isStormWeather ? 0.70 : 0.52) : 0.24;
      wetExtraDrag = isWet ? (isStormWeather ? 48 : 34) : 9;
      wetGripMult = isWet ? 0.52 : 0.92;
      bermColor = isWet ? '#2f3b1b' : '#3f5922';
      grooveColor = isWet ? '#1b1f0e' : '#1e3810';
      break;
    case 'sand':
      isOffroad = true;
      baseSink = isWet ? 0.72 : 0.58;
      wetExtraDrag = isWet ? 42 : 24;
      wetGripMult = isWet ? 0.60 : 0.85;
      bermColor = isWet ? '#78350f' : '#b45309';
      grooveColor = isWet ? '#451a03' : '#78350f';
      break;
    case 'gravel_road':
      isOffroad = true;
      baseSink = isWet ? 0.22 : 0.06;
      wetExtraDrag = isWet ? 12 : 2;
      wetGripMult = isWet ? 0.78 : 0.98;
      bermColor = '#64748b';
      grooveColor = '#334155';
      break;
    case 'rock':
      baseSink = 0.05;
      wetExtraDrag = 2;
      wetGripMult = isWet ? 0.80 : 1.0;
      bermColor = '#78716c';
      grooveColor = '#44403c';
      break;
    default: // asphalt, concrete
      baseSink = 0.0;
      wetExtraDrag = 0;
      wetGripMult = isWet ? 0.65 : 1.0;
      bermColor = '#1e293b';
      grooveColor = '#0f172a';
      break;
  }
  return { baseSink, wetExtraDrag, wetGripMult, isOffroad, bermColor, grooveColor };
}

export function updateVehiclePhysics(
  vehicle: Vehicle,
  input: InputState | null,
  world: GameWorld,
  nearbyBuildings: Building[],
  nearbyVehicles: Vehicle[],
  dt: number,
  player?: Player
) {
  // Smoothly recover ghosting alpha over time for all vehicles if below 1.0
  if (vehicle.ghostingAlpha !== undefined && vehicle.ghostingAlpha < 1.0) {
    vehicle.ghostingAlpha = Math.min(1.0, vehicle.ghostingAlpha + dt * 2.0);
  }

  const cfg = CAR_CONFIGS[vehicle.type] || CAR_CONFIGS.sedan;

  // Trailers are unpowered passive vehicles (no driver, no autonomous engine, no NPC AI cruising)
  if (vehicle.type.startsWith('trailer_') || vehicle.isTrailer) {
    if (vehicle.towedById) {
      // Position and kinematics are 100% computed in updateTrailerTowingPhysics!
      return;
    }
    // Unhitched trailer: simple passive rolling friction to a halt
    const rollingFriction = 0.92;
    vehicle.speed *= Math.pow(rollingFriction, dt * 60);
    vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
    vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;
    vehicle.x += vehicle.vx * dt;
    vehicle.y += vehicle.vy * dt;
    if (Math.abs(vehicle.speed) < 0.2) {
      vehicle.speed = 0;
      vehicle.vx = 0;
      vehicle.vy = 0;
      vehicle.isParked = true;
    }
    return;
  }

  if (vehicle.isPlayerControlled && input) {
    // --- REALISTIC PROGRESSIVE STEERING MODEL ---
    const currentSpeedKmh = Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH;
    const speedRatio = Math.min(1.0, currentSpeedKmh / cfg.maxSpeed);
    
    // Check if the vehicle is currently sliding or handbraking to adjust steering limits
    const isSliding = Math.abs(vehicle.lateralVelocity || 0) > 12.0 || (input.handbrake && currentSpeedKmh > 10.0);

    // Determine if the player is actively counter-steering to catch a slide
    // - Positive lateralVelocity (sliding right): must steer right (input.right) to catch it.
    // - Negative lateralVelocity (sliding left): must steer left (input.left) to catch it.
    const isCounterSteerLeft = (vehicle.lateralVelocity || 0) < -12.0 && input.left;
    const isCounterSteerRight = (vehicle.lateralVelocity || 0) > 12.0 && input.right;
    const isCounterSteeringForLimit = isCounterSteerLeft || isCounterSteerRight;

    // 1. Steering Limit at Speed (Driver Assist)
    // Limits the max lock at high speeds to prevent instant spin-outs since keyboards are binary.
    // However, if the car is sliding or drifting, we give the player FULL lock access ONLY when actively counter-steering!
    // Unlocking full lock during turn-in with handbrake at high speed is extremely dangerous and unrealistic,
    // so we preserve the high-speed steering lock restriction when initiating/turning-in, and only unlock it for counter-steering.
    const dynamicMaxSteer = isCounterSteeringForLimit
      ? cfg.maxSteerAngle 
      : cfg.maxSteerAngle * Math.max(0.28, 1.0 - Math.pow(speedRatio, 0.70) * 0.70);

    // 2. Physical Steering Rack Speed (Steering Weight & Lack of Power Steering)
    // Without power steering (ГУР), turning wheels on the spot (0 km/h) is physically exhausting and slow.
    // As the car rolls, steering gets lighter.
    // If the player is counter-steering to catch a slide, we boost steering speed heavily to mimic caster self-alignment!
    let desiredSteer = vehicle.steerAngle; // Default stay
    const hasAnalogSteer = typeof input.steeringAxis === 'number' && Math.abs(input.steeringAxis) > 0.005;

    let targetDesiredSteerTemp = 0;
    if (hasAnalogSteer) {
      const clampedAxis = Math.max(-1.0, Math.min(1.0, input.steeringAxis!));
      targetDesiredSteerTemp = clampedAxis * dynamicMaxSteer;
    } else if (input.left) {
      targetDesiredSteerTemp = -dynamicMaxSteer;
    } else if (input.right) {
      targetDesiredSteerTemp = dynamicMaxSteer;
    }

    const isCounterSteering = isSliding && (
      (targetDesiredSteerTemp < -0.01 && (vehicle.lateralVelocity || 0) < -8.0) ||
      (targetDesiredSteerTemp > 0.01 && (vehicle.lateralVelocity || 0) > 8.0)
    );

    const isArticulatedMachinery = vehicle.type === 'roller_heavy_tandem' || 
                                    vehicle.type === 'roller_compact_sidewalk' || 
                                    vehicle.type === 'roller_pneumatic';

    const steerRateMultiplier = isCounterSteering ? 2.6 : 1.0;
    let steerRate = cfg.turnSpeed * (isArticulatedMachinery ? 0.90 : 0.40) * steerRateMultiplier; 
    if (currentSpeedKmh < 10.0 && !isArticulatedMachinery) {
      // Extremely heavy steering at standstill for standard cars
      const standstillFactor = 0.4 + (currentSpeedKmh / 10.0) * 0.6;
      steerRate *= standstillFactor;
    } else if (!isCounterSteering && !isArticulatedMachinery) {
      // At high speeds, drivers steer smoothly and caster fights back
      steerRate *= Math.max(0.4, 1.0 - speedRatio * 0.65);
    }

    if (hasAnalogSteer) {
      desiredSteer = targetDesiredSteerTemp;
    } else if (input.left) {
      desiredSteer = -dynamicMaxSteer;
    } else if (input.right) {
      desiredSteer = dynamicMaxSteer;
    }
    
    // Apply steering over time
    if (hasAnalogSteer || input.left || input.right) {
      // Manual steering towards desired lock (analog wheel follows touch directly with steering rack dynamics)
      const maxDelta = hasAnalogSteer ? steerRate * 2.2 * dt : steerRate * dt;
      if (vehicle.steerAngle < desiredSteer) {
        vehicle.steerAngle = Math.min(desiredSteer, vehicle.steerAngle + maxDelta);
      } else if (vehicle.steerAngle > desiredSteer) {
        vehicle.steerAngle = Math.max(desiredSteer, vehicle.steerAngle - maxDelta);
      }
    } else {
      // 3. Caster Effect (Auto-centering)
      // The steering wheel only returns to center due to rolling tire forces (caster angle).
      // Articulated hydraulic machines stay locked at turned angle when stopped or releasing steer keys!
      if (Math.abs(vehicle.steerAngle) > 0.005 && !isArticulatedMachinery) {
        // Caster centering rate maxes out around 30 km/h
        const casterForce = Math.min(1.0, currentSpeedKmh / 30.0);
        const casterRate = steerRate * 1.4 * casterForce;
        
        if (casterRate > 0) {
          if (vehicle.steerAngle > 0) {
            vehicle.steerAngle = Math.max(0, vehicle.steerAngle - casterRate * dt);
          } else if (vehicle.steerAngle < 0) {
            vehicle.steerAngle = Math.min(0, vehicle.steerAngle + casterRate * dt);
          }
        }
      }
    }

    // Acceleration & Braking with progressive throttle
    const isHandbraking = input.handbrake;
    const rawForward = input.forward && !input.backward;
    
    // Time how long the throttle has been continuously held (for adaptive automatic transmission)
    if (rawForward) {
      (vehicle as any)._throttleHoldTimer = ((vehicle as any)._throttleHoldTimer || 0) + dt;
    } else {
      (vehicle as any)._throttleHoldTimer = 0;
    }
    
    // "Kickdown"is recognized if Sprint is held, or if the throttle is held continuously for >0.6s
    const isKickdown = rawForward && (input.sprint || (vehicle as any)._throttleHoldTimer > 0.6);
    
    const throttle = rawForward ? 1.0 : 0;
    
    // Split brakes calculation for MTZ tractors
    const isTractor = vehicle.type.startsWith('tractor_');
    const latchEnabled = vehicle.tractorBrakeLatch !== false;
    let brakeLeftVal = 0;
    let brakeRightVal = 0;
    
    if (isTractor) {
      if (latchEnabled) {
        const anyBrake = (input.backward || input.brakeLeft || input.brakeRight) ? 1.0 : 0.0;
        brakeLeftVal = anyBrake;
        brakeRightVal = anyBrake;
      } else {
        brakeLeftVal = (input.backward || input.brakeLeft) ? 1.0 : 0.0;
        brakeRightVal = (input.backward || input.brakeRight) ? 1.0 : 0.0;
      }
    } else {
      brakeLeftVal = input.backward ? 1.0 : 0.0;
      brakeRightVal = input.backward ? 1.0 : 0.0;
    }
    
    // Save these values on the vehicle for rendering / HUD access
    (vehicle as any)._brakeLeftVal = brakeLeftVal;
    (vehicle as any)._brakeRightVal = brakeRightVal;
    
    const brake = Math.max(brakeLeftVal, brakeRightVal);
    (vehicle as any)._lastThrottle = throttle;
    
    // --- MODULE 1 & 2: POWERTRAIN, ENGINE RPM, FUEL COMBUSTION ---
    let engineAccel = 0;
    let gearAccelMult = 1.0;
    let T_factor = 1.0;
    const eng = vehicle.engineState;
    const fuel = vehicle.fuelSystem;
    
    if (eng) {
      let idleRPM = 800;
      let redlineRPM = 6200;
      let maxRPM = 7500;

      if (vehicle.type === 'supercar'|| vehicle.type === 'sports'|| vehicle.type === 'muscle'|| vehicle.type === 'muscle_classic'|| vehicle.type === 'coupe_gt'|| vehicle.type === 'hatch_hot'|| vehicle.type === 'moto_sport') {
        idleRPM = 950;
        redlineRPM = 7200;
        maxRPM = 8800;
      } else if (vehicle.type.startsWith('truck_') || vehicle.type === 'bus'|| vehicle.type === 'bus_minibus'|| vehicle.type === 'cement_mixer'|| vehicle.type === 'garbage_truck'|| vehicle.type === 'delivery_truck'|| vehicle.type === 'fire_engine'|| vehicle.type === 'fire_ladder'|| vehicle.type === 'fire_rescue'|| vehicle.type === 'pickup_heavy'|| vehicle.type === 'truck_armored') {
        idleRPM = 600;
        redlineRPM = 2800;
        maxRPM = 3600;
      } else if (vehicle.type.startsWith('tractor_')) {
        idleRPM = 650;
        redlineRPM = 2400;
        maxRPM = 3000;
      } else if (vehicle.type.startsWith('moto_')) {
        idleRPM = 1000;
        redlineRPM = 7000;
        maxRPM = 8500;
      } else if (vehicle.type === 'moped_soviet') {
        idleRPM = 1100;
        redlineRPM = 6000;
        maxRPM = 7200;
      } else if ((vehicle.type || '').includes('retro') || (vehicle.type || '').includes('classic') || vehicle.type === 'micro_car') {
        idleRPM = 750;
        redlineRPM = 5200;
        maxRPM = 6200;
      }
      const stallThreshold = idleRPM * 0.55;
      
      // Transfer Case Toggle Logic
      if (input.transferCaseToggle) {
        if (eng.hasTransferCase) {
          if (eng.clutchPedal > 0.8 || eng.currentGear === 0 || (eng.transmissionType === 'AUTO'&& eng.autoGearMode === 'N')) {
            eng.transferCaseMode = eng.transferCaseMode === 'LOW'? 'HIGH': 'LOW';
            sound.playGearShift();
            if (player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, `Делитель: ${eng.transferCaseMode === 'LOW'? 'Пониженная [LO]': 'Повышенная [HI]'}`, 'info');
            }
          } else {
            if (player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, 'Выжмите сцепление (Space) или включите нейтраль (N) для переключения делителя!', 'warning');
            }
          }
        }
        input.transferCaseToggle = false;
      }

      // Differential Lock Cycling Toggle Logic (по осям: МОБ -> МКБ-З -> Полная -> Выкл)
      if (input.diffLockToggle) {
        const diffCaps = getVehicleDiffCapabilities(vehicle.type);
        if (diffCaps.supported) {
          const res = cycleVehicleDiffLock(vehicle);
          if (res.changed) {
            if (res.isEngaged) {
              sound.playDiffLockEngage();
            } else {
              sound.playDiffLockDisengage();
            }
          } else {
            sound.playDiffLockWarning();
          }
          if (player && (player.currentVehicleId === vehicle.id || player.vehicleId === vehicle.id)) {
            addPlayerNotification(player, res.message, res.isEngaged ? 'info' : (res.changed ? 'info' : 'warning'));
          }
        } else {
          if (player && (player.currentVehicleId === vehicle.id || player.vehicleId === vehicle.id)) {
            addPlayerNotification(player, 'На данном автомобиле установлен свободный дифференциал без принудительной блокировки.', 'warning');
          }
          sound.playDiffLockWarning();
        }
        input.diffLockToggle = false;
      }
      
      // Auto transmission logic
      if (eng.transmissionType === 'AUTO') {
        if (!eng.autoGearMode) eng.autoGearMode = 'D';

        eng.shiftCooldown = Math.max(0, (eng.shiftCooldown || 0) - dt);
        if (eng.shiftCooldown <= 0) {
          if (input.shiftUp) {
            // Shift selector ladder: P -> R -> N -> D
            if (eng.autoGearMode === 'P') eng.autoGearMode = 'R';
            else if (eng.autoGearMode === 'R') eng.autoGearMode = 'N';
            else if (eng.autoGearMode === 'N') eng.autoGearMode = 'D';
            eng.shiftCooldown = 0.25;
            sound.playButtonPress();
            input.shiftUp = false;
          } else if (input.shiftDown) {
            // Shift selector ladder: D -> N -> R -> P
            const oldMode = eng.autoGearMode;
            if (eng.autoGearMode === 'D') eng.autoGearMode = 'N';
            else if (eng.autoGearMode === 'N') eng.autoGearMode = 'R';
            else if (eng.autoGearMode === 'R') eng.autoGearMode = 'P';
            eng.shiftCooldown = 0.25;
            sound.playButtonPress();
            input.shiftDown = false;

            // Destructive shift into Park 'P'or Reverse 'R'at speed
            if (eng.autoGearMode === 'P'&& Math.abs(vehicle.speed) > 10) {
              eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - 45);
              sound.playCollision(0.9);
              vehicle.speed *= 0.15; // violent jerk / parking pawl snap
              if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
              if (player && player.vehicleId === vehicle.id) {
                addPlayerNotification(player, 'СРЕЗАН ФИКСАТОР ПАРКИНГА (PARKING PAWL)! Переключение в "P"на ходу!', 'warning');
              }
            } else if (oldMode === 'N'&& eng.autoGearMode === 'R'&& Math.abs(vehicle.speed) > 12) {
              eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - 35);
              sound.playCollision(0.8);
              if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
              if (player && player.vehicleId === vehicle.id) {
                addPlayerNotification(player, 'УДАР ПО АКПП! Включение задней передачи "R"на ходу!', 'warning');
              }
            }
          }
        }

        // Apply physical gear based on autoGearMode
        if (eng.autoGearMode === 'P') {
          eng.currentGear = 0;
          vehicle.speed = 0;
          vehicle.vx = 0;
          vehicle.vy = 0;
        } else if (eng.autoGearMode === 'R') {
          eng.currentGear = -1;
        } else if (eng.autoGearMode === 'N') {
          eng.currentGear = 0;
        } else if (eng.autoGearMode === 'D') {
          if (eng.currentGear <= 0) eng.currentGear = 1;

          // Smooth automatic upshifts & downshifts with cooldown (only if engine is running)
          if (eng.engineRunning && eng.shiftCooldown <= 0) {
            const maxForwardGear = (eng.gearRatios?.length || 7) - 2;
            
            // Adaptive Shift Logic (Smart Automatic Transmission)
            // If in kickdown mode (holding W for >0.6s or pressing Shift) or in diesel runaway, hold gears until redline
            const upshiftRatio = (isKickdown || eng.isDieselRunaway) ? 0.94 : 0.62;
            const upshiftRPM = idleRPM + (redlineRPM - idleRPM) * upshiftRatio;
            
            // Downshift early if braking hard (engine braking assist) or in runaway, otherwise wait until low RPM
            let downshiftRatio = (isKickdown || eng.isDieselRunaway) ? 0.65 : 0.32;
            if (brake > 0.5) downshiftRatio = Math.max(downshiftRatio, 0.48);
            
            const downshiftRPM = idleRPM + (redlineRPM - idleRPM) * downshiftRatio;

            if (eng.engineRPM > upshiftRPM && eng.currentGear < maxForwardGear) {
              eng.currentGear++;
              eng.shiftCooldown = 0.35;
              sound.playGearShift();
            } else if (eng.engineRPM < downshiftRPM && eng.currentGear > 1) {
              eng.currentGear--;
              eng.shiftCooldown = 0.35;
              sound.playGearShift();
            }
          }
        }
        eng.clutchPedal = 1.0;
      }
      
      // Powertrain & Transmission Thermodynamics Initialization
      const ambientTemp = world?.outsideTemp ?? 20;
      if (eng.clutchTemperature === undefined || !Number.isFinite(eng.clutchTemperature)) {
        eng.clutchTemperature = ambientTemp;
      }
      if (eng.clutchWear === undefined || !Number.isFinite(eng.clutchWear)) {
        eng.clutchWear = 0;
      }
      if (eng.transmissionTemp === undefined || !Number.isFinite(eng.transmissionTemp)) {
        eng.transmissionTemp = ambientTemp;
      }

      // Transmission Fluid Temperature & ATF Overheat Simulation
      if (eng.engineRunning) {
        const isMachinery = isRoadMachinery(vehicle.type);
        // Friction and hydraulic pumping heat input
        const transLoadFactor = (eng.engineRPM / redlineRPM) * (throttle * 0.7 + (Math.abs(vehicle.speed) > 2 ? 0.3 : 0.1));
        const atfHeatRate = eng.transmissionType === 'AUTO' && eng.autoGearMode !== 'P' && eng.autoGearMode !== 'N' && Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH < 15 && throttle > 0.3
          ? (isMachinery ? 0.4 : 3.5)
          : 0.8;
        const heatInput = transLoadFactor * atfHeatRate * 0.45 * dt;
        const heatCooling = (eng.transmissionTemp - ambientTemp) * (isMachinery ? 0.08 : 0.035) * dt;
        eng.transmissionTemp = Math.max(ambientTemp, Math.min(185, eng.transmissionTemp + heatInput - heatCooling));

        // Automatic Transmission ATF Boiling / Overheat (> 130°C)
        if (eng.transmissionType === 'AUTO' && eng.transmissionTemp > 130) {
          eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - 2.5 * dt);
          if (eng.transmissionHealth <= 20) {
            eng.transmissionJammed = true;
          }
          if (Math.random() < 0.08 * dt && player && player.vehicleId === vehicle.id) {
            addPlayerNotification(player, `ПЕРЕГРЕВ АКПП (ATF ${Math.round(eng.transmissionTemp)}°C)! Закипание гидравлического масла, пробуксовка гидротрансформатора!`, 'warning');
          }
        }
      } else {
        // Cool down towards ambient when engine is off
        eng.transmissionTemp += (ambientTemp - eng.transmissionTemp) * 0.02 * dt;
      }

      // Manual transmission logic
      if (eng.transmissionType === 'MANUAL') {
        eng.shiftCooldown = Math.max(0, (eng.shiftCooldown || 0) - dt);
        eng.gearGrindTimer = Math.max(0, (eng.gearGrindTimer || 0) - dt);

        if (eng.transmissionJammed) {
          if (input.shiftUp || input.shiftDown) {
            sound.playCollision(0.3);
            input.shiftUp = false;
            input.shiftDown = false;
            if (player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, 'КОРОБКА ПЕРЕДАЧ ЗАБЛОКИРОВАНА! Требуется ремонт в PIT-STOP.', 'warning');
            }
          }
        } else {
          // --- REALISTIC CLUTCHLESS SHIFTING & GEAR GRINDING (Скрежет шестерен при переключении без сцепления) ---
          const isMachinery = isRoadMachinery(vehicle.type);
          const isClutchDepressed = isMachinery || eng.clutchPedal < 0.40; // Clutch pedal pressed down or hydrostatic drive
          const isVehicleMovingOrRevving = !isMachinery && (Math.abs(vehicle.speed) > 2.0 || eng.engineRPM > 1200);

          if (input.shiftUp && eng.shiftCooldown <= 0) {
            const maxForwardGear = (eng.gearRatios?.length || 7) - 2;
            if (eng.currentGear < maxForwardGear) {
              // Shifting without clutch on moving vehicle causes violent gear grinding and synchro destruction!
              if (!isClutchDepressed && isVehicleMovingOrRevving && eng.currentGear !== 0) {
                sound.playCollision(0.75);
                eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - 8);
                if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
                if (eng.gearGrindTimer <= 0 && player && player.vehicleId === vehicle.id) {
                  addPlayerNotification(player, 'ГРУБЫЙ СКРЕЖЕТ ШЕСТЕРЕН КПП! Попытка переключения передачи без выжима сцепления!', 'warning');
                  eng.gearGrindTimer = 2.0;
                }
                // Metal sparks from bellhousing / gearbox
                const cosA = Math.cos(vehicle.angle);
                const sinA = Math.sin(vehicle.angle);
                world.particles.push({
                  x: vehicle.x - cosA * 10,
                  y: vehicle.y - sinA * 10,
                  vx: -cosA * 30 + (Math.random() * 20 - 10),
                  vy: -sinA * 30 + (Math.random() * 20 - 10),
                  radius: 2.8, color: '#f97316', alpha: 0.9, life: 0, maxLife: 0.25, type: 'spark'
                });
                eng.shiftCooldown = 0.60;
              } else {
                eng.currentGear++;
                sound.playGearShift();
                eng.shiftCooldown = isMachinery ? 0.25 : 0.45;
              }
            }
            input.shiftUp = false;
          }

          if (input.shiftDown && eng.shiftCooldown <= 0) {
            if (eng.currentGear > -1) {
              if (!isClutchDepressed && isVehicleMovingOrRevving && eng.currentGear !== 0 && eng.currentGear !== 1) {
                sound.playCollision(0.75);
                eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - 8);
                if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
                if (eng.gearGrindTimer <= 0 && player && player.vehicleId === vehicle.id) {
                  addPlayerNotification(player, 'ГРУБЫЙ СКРЕЖЕТ ШЕСТЕРЕН КПП! Сброс передачи без выжима сцепления!', 'warning');
                  eng.gearGrindTimer = 2.0;
                }
                eng.shiftCooldown = 0.60;
              } else {
                eng.currentGear--;
                sound.playGearShift();
                eng.shiftCooldown = isMachinery ? 0.25 : 0.45;

                // Catastrophic downshift into reverse while moving forward at speed
                if (!isMachinery && eng.currentGear === -1 && Math.abs(vehicle.speed) > 12) {
                  const damage = Math.min(65, 20 + Math.abs(vehicle.speed) * 0.8);
                  eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - damage);
                  sound.playCollision(0.85);
                  vehicle.speed *= 0.3; // sudden violent deceleration
                  if (eng.transmissionHealth <= 20) {
                    eng.transmissionJammed = true;
                  }
                  if (player && player.vehicleId === vehicle.id) {
                    addPlayerNotification(player, 'ТЯЖЕЛЫЙ СКРЕЖЕТ В КПП! Задняя передача включена во время движения!', 'warning');
                  }
                }
                eng.shiftCooldown = 0.45;
              }
            }
            input.shiftDown = false;
          }
        }

        // Clutch engagement for manual
        if (eng.currentGear === 0) {
          eng.clutchPedal += (0.0 - eng.clutchPedal) * Math.min(1.0, 18 * dt);
        } else if (eng.shiftCooldown > 0) {
          eng.clutchPedal += (0.0 - eng.clutchPedal) * Math.min(1.0, 12 * dt);
        } else {
          eng.clutchPedal += (1.0 - eng.clutchPedal) * Math.min(1.0, 10 * dt);
        }

        // --- CLUTCH THERMODYNAMICS, SLIPPING & BURNOUT (Перегрев, дым и выгорание сцепления) ---
        if (eng.engineRunning && eng.currentGear !== 0) {
          // Slipping occurs when clutch pedal is partially engaged under throttle or when clutch is worn/overheated
          const isPartialPedal = eng.clutchPedal > 0.12 && eng.clutchPedal < 0.88;
          const isHeavyLoadLaunch = Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH < 12 && throttle > 0.25;

          if ((isPartialPedal || isHeavyLoadLaunch) && eng.engineRPM > 1300) {
            const slipEnergy = (eng.engineRPM / redlineRPM) * throttle * (1 - Math.abs(eng.clutchPedal - 0.5) * 1.8);
            const heatInput = slipEnergy * 38.0 * dt; // Rapid temperature rise under slip
            eng.clutchTemperature = (eng.clutchTemperature || ambientTemp) + heatInput;
          }

          // Cool down towards ambient
          const clutchCooling = ((eng.clutchTemperature || ambientTemp) - ambientTemp) * 0.08 * dt;
          eng.clutchTemperature = Math.max(ambientTemp, (eng.clutchTemperature || ambientTemp) - clutchCooling);

          // Overheating effects (> 220°C): acrid white smoke & permanent lining wear (> 330°C)
          if ((eng.clutchTemperature || ambientTemp) > 220) {
            eng.clutchSmokeTimer = Math.max(0, (eng.clutchSmokeTimer || 0) - dt);

            // Emit acrid white/grey burning friction smoke from under vehicle
            if (Math.random() < 0.35) {
              const cosA = Math.cos(vehicle.angle);
              const sinA = Math.sin(vehicle.angle);
              world.particles.push({
                x: vehicle.x - cosA * 8 + (Math.random() * 6 - 3),
                y: vehicle.y - sinA * 8 + (Math.random() * 6 - 3),
                vx: -cosA * (12 + Math.random() * 8) + (Math.random() * 10 - 5),
                vy: -sinA * (12 + Math.random() * 8) + (Math.random() * 10 - 5),
                radius: 3.2 + Math.random() * 2.0,
                color: '#e2e8f0',
                alpha: 0.80,
                initialAlpha: 0.80,
                life: 0,
                maxLife: 0.65,
                type: 'engine_smoke',
                underVehicle: true
              });
            }

            if (eng.clutchSmokeTimer <= 0 && player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, `ГОРИТ СЦЕПЛЕНИЕ (${Math.round(eng.clutchTemperature)}°C)! Запах гари и белый дым из-под днища! Сбросьте газ!`, 'warning');
              eng.clutchSmokeTimer = 3.5;
            }

            // Permanent lining wear when temperature exceeds 330°C
            if (eng.clutchTemperature > 330) {
              eng.clutchWear = Math.min(100, (eng.clutchWear || 0) + 8 * dt);
            }
          }
        }

        // Manual stalling (only if engine is running and not in runaway)
        const isMachinery = isRoadMachinery(vehicle.type);
        if (eng.engineRunning && !eng.isDieselRunaway && !isMachinery) {
          let hasStalled = false;
          let stallImpulse = 0;
          let stallReason = '';
          const isTractor = vehicle.type?.startsWith('tractor_');
          const isHeavyTruckOrBus = vehicle.type?.startsWith('truck_') || vehicle.type === 'bus'|| vehicle.type === 'bus_minibus'|| vehicle.type === 'cement_mixer'|| vehicle.type === 'garbage_truck'|| vehicle.type === 'fire_engine'|| vehicle.type === 'fire_ladder'|| vehicle.type === 'fire_rescue';
          const isDieselEngine = fuel?.fuelType === 'diesel'|| isTractor || isHeavyTruckOrBus || vehicle.type === 'pickup_heavy'|| vehicle.type === 'delivery_truck'|| vehicle.type === 'van_camper';
          const isTractorOrHeavy = isDieselEngine || isTractor;
          const luggingGearThreshold = isTractorOrHeavy ? 5 : 2;

          // 1. In gear with clutch engaged, stopped or stationary without sufficient throttle
          if (eng.currentGear !== 0 && eng.clutchPedal > 0.60 && Math.abs(vehicle.speed) < 3.5 && throttle < 0.12) {
            hasStalled = true;
            stallImpulse = 3.8;
            stallReason = 'Двигатель заглох! На МКПП нельзя стоять на передаче без газа. Переключитесь на нейтраль [N]!';
          }
          // 2. High gear lugging at low speed or under heavy towing load
          const isTowingHeavy = !!vehicle.trailerId;
          // For tractors, enforce very strict gear limits when towing heavy loads
          const maxAllowedGearForLowSpeed = isTowingHeavy 
            ? (isTractor ? 2 : (isHeavyTruckOrBus ? 3 : 2)) 
            : luggingGearThreshold;
          const maxLuggingSpeed = isTowingHeavy ? (isTractor ? 15.0 : 28.0) : 8.5;

          if (eng.currentGear > maxAllowedGearForLowSpeed && eng.clutchPedal > 0.60 && Math.abs(vehicle.speed) < maxLuggingSpeed && (throttle < 0.20 || eng.engineRPM <= idleRPM * 0.85)) {
            hasStalled = true;
            stallImpulse = 2.4;
            stallReason = isTowingHeavy 
              ? 'Двигатель заглох от перегрузки! При буксировке тяжелого прицепа/цистерны трогайтесь только с 1-й или 2-й передачи!' 
              : 'Двигатель заглох от перегрузки на высокой передаче при низкой скорости!';
          }
          // 3. Hard braking to dead stop in gear with clutch engaged
          else if (eng.currentGear !== 0 && eng.clutchPedal > 0.60 && Math.abs(vehicle.speed) < 4.5 && brake > 0 && throttle < 0.10) {
            hasStalled = true;
            vehicle.speed = 0;
            stallImpulse = 2.0;
            stallReason = 'Двигатель заглох при торможении до остановки на передаче! Включайте нейтраль [N].';
          }

          if (hasStalled) {
            eng.isStalled = true;
            eng.engineRunning = false;
            eng.engineStalled = true;
            eng.engineRPM = 0;
            const jerkDir = eng.currentGear === -1 ? -1 : 1;
            if (stallImpulse > 0) {
              vehicle.speed += jerkDir * stallImpulse;
              vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
              vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;
            }
            sound.playEngineStall();
            sound.playCollision(0.30);
            if (player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, stallReason, 'warning');
            }
          }
        }
      }

      // Calculate RPM & engine response (only if engine is running)
      if (eng.engineRunning) {
        const topGearIdx = (eng.gearRatios?.length || 7) - 1;
        const topGearRatio = Math.abs(eng.gearRatios[topGearIdx] || 0.78);
        const firstGearRatio = Math.abs(eng.gearRatios[2] || 3.5);

        let currentGearRatio = eng.gearRatios[eng.currentGear + 1] !== undefined ? eng.gearRatios[eng.currentGear + 1] : 0;
        
        // Apply Transfer Case LOW multiplier
        if (eng.hasTransferCase && eng.transferCaseMode === 'LOW') {
          currentGearRatio *= 3.0;
        }

        const gearRatio = Math.abs(currentGearRatio);
        const v_speed = Math.abs(vehicle.speed);
        
        const maxSpeedPx = (cfg.maxSpeed || 150) * SPEED_KMH_TO_PX_S;
        const reverseMaxSpeedPx = (cfg.reverseMaxSpeed || 35) * SPEED_KMH_TO_PX_S;

        // Speed corresponding to redline in current gear
        let speedAtRedline = maxSpeedPx;
        if (eng.currentGear === -1) {
          speedAtRedline = reverseMaxSpeedPx;
        } else if (eng.currentGear > 0 && gearRatio > 0) {
          speedAtRedline = maxSpeedPx * (topGearRatio / Math.max(0.2, gearRatio));
        }

        // Mechanical top speed allowable in current gear with over-rev margin before rev limiter cutoff
        const gearMaxSpeedPx = speedAtRedline * 1.08;

        const wheelDrivenRPM = idleRPM + (v_speed / Math.max(1, speedAtRedline)) * (redlineRPM - idleRPM);

        // Determine engine rise/decay speeds based on vehicle flywheel inertia
        let rpmRiseRate = 13.0;
        let rpmDecayRate = 9.5;
        const isTractor = vehicle.type.startsWith('tractor_');
        const isHeavyTruckOrBus = vehicle.type.startsWith('truck_') || vehicle.type === 'bus'|| vehicle.type === 'bus_minibus'|| vehicle.type === 'cement_mixer'|| vehicle.type === 'garbage_truck'|| vehicle.type === 'fire_engine'|| vehicle.type === 'fire_ladder'|| vehicle.type === 'fire_rescue';
        const isDieselEngine = fuel?.fuelType === 'diesel'|| isTractor || isHeavyTruckOrBus || vehicle.type === 'pickup_heavy'|| vehicle.type === 'delivery_truck'|| vehicle.type === 'van_camper';

        if (isTractor) {
          // Heavy flywheel on MTZ tractor (smooth, heavy diesel spool up)
          rpmRiseRate = 4.2;
          rpmDecayRate = 3.5;
        } else if (isHeavyTruckOrBus) {
          rpmRiseRate = 5.5;
          rpmDecayRate = 4.5;
        } else if (vehicle.type === 'supercar'|| vehicle.type === 'sports'|| vehicle.type === 'moto_sport') {
          rpmRiseRate = 22.0;
          rpmDecayRate = 16.0;
        }

        // Full throttle (100%) allows RPM to reach into redline zone (up to 45% between redline & maxRPM)
        const effectiveThrottle = eng.isDieselRunaway ? 1.0 : throttle;
        const maxThrottleRPM = redlineRPM + (maxRPM - redlineRPM) * 0.45;
        const isMachineryVeh = isRoadMachinery(vehicle.type);
        let freeRevRPM = isMachineryVeh
          ? idleRPM + effectiveThrottle * (1650 - idleRPM)
          : idleRPM + effectiveThrottle * (maxThrottleRPM - idleRPM);
        if (eng.isDieselRunaway) {
          freeRevRPM = maxRPM * 1.05;
        }

        // Stalling runaway engine by heavy braking in gear
        if (eng.isDieselRunaway && eng.currentGear !== 0 && brake > 0.70 && Math.abs(vehicle.speed) < 3.0) {
          if (eng.transmissionType === 'AUTO') {
            if (player && player.vehicleId === vehicle.id && Math.random() < 0.05) {
              addPlayerNotification(player, 'На АКПП тормоз не глушит разнос! Перекройте воздух ветошью под капотом!', 'warning');
            }
          } else {
            eng.isDieselRunaway = false;
            eng.engineRunning = false;
            eng.engineRPM = 0;
            eng.isStalled = true;
            sound.playEngineStall();
            if (player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, 'Дизельный разнос успешно остановлен торможением на передаче!', 'heal');
            }
          }
        }

        if (eng.currentGear !== 0 && (!eng.autoGearMode || eng.autoGearMode !== 'P')) {
          let coupledRPM = wheelDrivenRPM;
          if (isMachineryVeh) {
            // Industrial hydrostatic diesel governor: RPM is governed smoothly around 1400-1650 RPM under load
            const governedRPM = idleRPM + (1600 - idleRPM) * Math.min(1.0, Math.max(0.15, effectiveThrottle * 1.05));
            coupledRPM = governedRPM;
          } else if (eng.transmissionType === 'AUTO') {
            const launchRPM = idleRPM + effectiveThrottle * (maxThrottleRPM - idleRPM) * 0.32;
            coupledRPM = Math.max(launchRPM, wheelDrivenRPM);
          } else {
            // Manual: at launch (< 4.3 km/h), allow clutch slip ONLY when throttle is actively pressed (launching)
            if (v_speed * PX_S_TO_SPEED_KMH < (isHeavyTruckOrBus ? 1.0 : 4.3) && effectiveThrottle >= 0.10) {
              const launchRPM = idleRPM + effectiveThrottle * (maxThrottleRPM - idleRPM) * 0.30;
              coupledRPM = Math.max(launchRPM, wheelDrivenRPM);
            } else {
              coupledRPM = wheelDrivenRPM;
            }
          }
          if (eng.isDieselRunaway) {
            // Runaway oil combustion drives crankshaft forcefully. Engine stays high (~70%+ redline) while pulling vehicle
            const runawayGearMinRPM = redlineRPM * 0.72;
            coupledRPM = Math.max(coupledRPM, runawayGearMinRPM);
          }
          const targetRPM = freeRevRPM * (1 - eng.clutchPedal) + coupledRPM * eng.clutchPedal;
          const lerpRate = targetRPM > eng.engineRPM ? rpmRiseRate : rpmDecayRate;
          eng.engineRPM += (targetRPM - eng.engineRPM) * Math.min(1.0, lerpRate * dt);
        } else {
          // Neutral or Park: free revving with flywheel inertia
          const lerpRate = (effectiveThrottle > 0.05 || eng.isDieselRunaway) ? rpmRiseRate : rpmDecayRate;
          eng.engineRPM += (freeRevRPM - eng.engineRPM) * Math.min(1.0, lerpRate * dt);
        }
        const minAllowableRPM = (eng.transmissionType === 'MANUAL'&& eng.currentGear !== 0) ? 0 : (idleRPM - 50);
        eng.engineRPM = Math.max(minAllowableRPM, Math.min(maxRPM * (eng.isDieselRunaway ? 1.08 : 1.0), eng.engineRPM));
        
        // Dynamic torque curve: 75% torque at idle, 100% at mid-range, 80% at redline
        const normRPM = Math.max(0, Math.min(1.15, (eng.engineRPM - idleRPM) / Math.max(1, redlineRPM - idleRPM)));
        T_factor = eng.isDieselRunaway ? 1.25 : (0.75 + 0.25 * Math.sin(Math.min(1.0, normRPM) * Math.PI));
        
        // Apply Chip Tuning torque boost (+15% torque)
        if (vehicle.hasChiptuning) {
          T_factor *= 1.15;
        }

        if (normRPM > 1.0 && !eng.isDieselRunaway) {
          T_factor *= Math.max(0.1, 1.0 - (normRPM - 1.0) * 2.5);
        }

        // Rev Limiter / Governor & Exhaust Particles
        if (eng.engineRPM >= redlineRPM) {
          const prevTimer = eng.revLimiterTimer || 0;
          eng.revLimiterTimer = prevTimer + dt;

          if (isDieselEngine) {
            // --- DIESEL GOVERNOR & DIESEL SOOT SMOKE (ТНВД) ---
            // Diesel mechanical governor smoothly trims fuel delivery without popping backfires or sparks
            const overRevRatio = Math.min(1.0, (eng.engineRPM - redlineRPM) / Math.max(1, maxRPM - redlineRPM));
            T_factor *= Math.max(0.15, 1.0 - overRevRatio * 0.85);

            // Sustained redline operation (> 5.0 s) causes engine wear and heat buildup (exempt industrial road machinery with heavy-duty governors)
            if (eng.revLimiterTimer > 5.0 && !isRoadMachinery(vehicle.type)) {
              eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 5 * dt);
              eng.temperature = Math.min(125, (eng.temperature ?? 85) + 4 * dt);
              if (prevTimer <= 5.0 && player && player.vehicleId === vehicle.id) {
                addPlayerNotification(player, 'Длительная работа дизеля на предельных оборотах перегревает мотор!', 'warning');
              }
            }

            // Authentic black diesel soot smoke puffs on diesel governor limit
            if (Math.random() < 0.22) {
              const cosA = Math.cos(vehicle.angle);
              const sinA = Math.sin(vehicle.angle);
              const exhaustAnchor = getVehicleAnchor(vehicle, 'exhaust');
              const isTr = vehicle.type.startsWith('tractor_') || (vehicle.type as string) === 'tractor';
              world.particles.push({
                x: exhaustAnchor.x,
                y: exhaustAnchor.y,
                vx: -cosA * (22 + Math.random() * 14) + (Math.random() * 8 - 4),
                vy: -sinA * (22 + Math.random() * 14) + (Math.random() * 8 - 4) - (isTr ? 22 : 0),
                radius: 2.8 + Math.random() * 1.6,
                color: Math.random() < 0.75 ? '#0f172a': '#1e293b',
                alpha: 0.88,
                initialAlpha: 0.88,
                life: 0,
                maxLife: 0.85 + Math.random() * 0.35,
                type: 'exhaust',
                underVehicle: !isTr
              });
            }
          } else {
            // --- GASOLINE ELECTRONIC REV LIMITER (ОТСЕЧКА С ИСКРАМИ) ---
            const cutCycle = (eng.revLimiterTimer * 18) % 1.0;

            if (eng.revLimiterTimer > 5.0) {
              eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 5 * dt);
              eng.temperature = Math.min(125, (eng.temperature ?? 85) + 4 * dt);
              if (prevTimer <= 5.0 && player && player.vehicleId === vehicle.id) {
                addPlayerNotification(player, 'Длительное удержание в отсечке разрушает двигатель и вызывает перегрев!', 'warning');
              }
              if (Math.random() < 0.3) {
                world.particles.push({
                  x: vehicle.x, y: vehicle.y,
                  vx: -Math.cos(vehicle.angle) * 20 + (Math.random() * 10 - 5),
                  vy: -Math.sin(vehicle.angle) * 20 + (Math.random() * 10 - 5),
                  radius: 3.5, color: '#94a3b8', alpha: 0.7, life: 0, maxLife: 0.4, type: 'engine_smoke'});
              }
            }

            if (cutCycle > 0.5) {
              T_factor *= 0.2;
              eng.engineRPM -= 1200 * dt;
              if (Math.random() < 0.22) {
                const cosA = Math.cos(vehicle.angle);
                const sinA = Math.sin(vehicle.angle);
                const exhaustAnchor = getVehicleAnchor(vehicle, 'exhaust');
                world.particles.push({
                  x: exhaustAnchor.x,
                  y: exhaustAnchor.y,
                  vx: -cosA * 55 + (Math.random() * 24 - 12),
                  vy: -sinA * 55 + (Math.random() * 24 - 12),
                  radius: 2.5 + Math.random() * 1.5,
                  color: '#f97316',
                  alpha: 0.95,
                  life: 0,
                  maxLife: 0.12,
                  type: 'spark'});
              }
            }
          }
        } else {
          eng.revLimiterTimer = 0;
        }

        // Cold engine viscous resistance (thick cold oil reduces available torque by ~12% until warmed up to 60°C)
        if ((eng.temperature ?? 85) < 60) {
          const warmupRatio = Math.max(0, Math.min(1.0, ((eng.temperature ?? 20) - 20) / 40));
          T_factor *= (0.88 + 0.12 * warmupRatio);
        }
        
        // Gear acceleration multiplier: wheel thrust scales proportionally with gear ratio vs 1st gear
        gearAccelMult = 1.0;
        if (eng.currentGear === -1) {
          // Reverse gear: High torque reduction for climbing/pulling out of mud
          gearAccelMult = 1.45;
        } else if (eng.currentGear === 1) {
          // 1st gear: Maximum low-end launch & climbing torque
          gearAccelMult = 1.65;
        } else if (eng.currentGear > 1 && firstGearRatio > 0) {
          const ratioFraction = Math.min(1.0, Math.max(0.12, gearRatio / firstGearRatio));
          // Direct mechanical ratio scaling
          gearAccelMult = 0.25 + 0.80 * Math.pow(ratioFraction, 0.9);
        }

        // Transfer case / Tractor range low-gear reduction (пониженная передача)
        if (eng.hasTransferCase && eng.transferCaseMode === 'LOW') {
          gearAccelMult *= 2.5; // 2.5x torque multiplier in LOW range!
        }
        if (eng.tractorRange === 1) {
          gearAccelMult *= 2.8; // 2.8x torque multiplier in Tractor Low Range!
        }

        // Fuel System Consequences
        let fuelFactor = 1.0;
        if (fuel && vehicle.requiredFuel) {
          // 1. Wrong fuel
          if (vehicle.requiredFuel !== 'diesel'&& fuel.fuelType === 'diesel') {
            eng.engineKnocking = true;
            fuelFactor = 0.0;
            if (!eng.isStalled && Math.random() < 0.02) {
              eng.isStalled = true;
              eng.engineRunning = false;
            }
            if (Math.random() < 0.3) {
              world.particles.push({
                x: vehicle.x, y: vehicle.y, vx: -Math.cos(vehicle.angle)*20, vy: -Math.sin(vehicle.angle)*20,
                radius: 4, color: '#e2e8f0', alpha: 0.8, life: 0, maxLife: 0.5, type: 'engine_smoke'});
            }
          }
          // 2. Sub-Octane Fuel
          if (vehicle.requiredFuel === 'ai95'&& fuel.octaneNumber === 92) {
            fuelFactor *= 0.85;
            if (throttle > 0.8 && Math.random() < 0.08 * dt) {
              eng.temperature += 5;
              eng.engineKnocking = true;
              vehicle.speed *= 0.96;
              sound.playHurt();
            }
          }
          // 3. Low Quality
          if (fuel.fuelQuality < 65) {
            if (Math.random() < 0.1) fuelFactor = 0;
            if (Math.random() < 0.05) {
              world.particles.push({
                x: vehicle.x, y: vehicle.y, vx: -Math.cos(vehicle.angle)*20, vy: -Math.sin(vehicle.angle)*20,
                radius: 3, color: '#111827', alpha: 0.8, life: 0, maxLife: 0.3, type: 'exhaust'});
            }
          }
        }
        
        const isParkedMode = eng.transmissionType === 'AUTO'&& eng.autoGearMode === 'P';
        const isNeutralMode = (eng.transmissionType === 'AUTO'&& eng.autoGearMode === 'N') || eng.currentGear === 0;

        // Calculate Engine Compression Braking & Over-Rev Retardation Force
        let engineBrakeFactor = 0;
        if (eng.clutchPedal > 0.3 && eng.currentGear !== 0 && !isNeutralMode && !isParkedMode) {
          // 1. Standard throttle-off engine compression braking
          if (throttle === 0 && eng.engineRPM > idleRPM + 300) {
            engineBrakeFactor = (gearRatio / Math.max(1, firstGearRatio)) * (eng.engineRPM / redlineRPM) * 16.0 * eng.clutchPedal;
          }

          // 2. Downshift / Over-rev braking (Money shift / Downshifting at excessively high speed)
          if (v_speed > gearMaxSpeedPx && !isRoadMachinery(vehicle.type)) {
            const overSpeedRatio = (v_speed - gearMaxSpeedPx) / gearMaxSpeedPx;
            const overRevBrake = (35.0 + overSpeedRatio * 75.0) * (gearRatio / Math.max(1, firstGearRatio)) * eng.clutchPedal;
            engineBrakeFactor = Math.max(engineBrakeFactor, overRevBrake);

            // Transmission synchro & gear damage during over-rev
            if (overSpeedRatio > 0.20) {
              eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - overSpeedRatio * 25 * dt);
              if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
            }

            // Severe Money Shift: Catastrophic engine mechanical over-rev
            if (overSpeedRatio > 0.35) {
              eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - overSpeedRatio * 45 * dt);
              eng.temperature = Math.min(130, (eng.temperature ?? 85) + overSpeedRatio * 12 * dt);
              if (eng.engineHealth <= 0) {
                eng.isSeized = true;
                eng.engineRunning = false;
                eng.engineRPM = 0;
              }
              if (Math.random() < 0.2 * dt) {
                sound.playCollision(0.8);
                if (player && player.vehicleId === vehicle.id) {
                  addPlayerNotification(player, 'МЕХАНИЧЕСКИЙ ПЕРЕКРУТ (MONEY SHIFT)! Опасный сброс передачи на высокой скорости!', 'warning');
                }
              }
            }
          }
        }

        let driveAccel = 0;
        if (!isParkedMode && !isNeutralMode) {
          let effectiveThrottle = eng.isDieselRunaway ? 1.0 : throttle;
          // Automatic transmission creep in D or R when no pedal is pressed
          if (eng.transmissionType === 'AUTO'&& brake === 0 && throttle === 0 && Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH < 5.8) {
            effectiveThrottle = 0.16;
          }
          if (eng.isDieselRunaway) {
            effectiveThrottle = 1.0;
          }

          if (effectiveThrottle > 0) {
            // Engine power drops off smoothly as vehicle approaches top speed for current gear
            const headroom = Math.max(12, gearMaxSpeedPx * 0.16);
            const speedCapFactor = Math.max(0, Math.min(1.0, (gearMaxSpeedPx - v_speed) / headroom));
            
            // Clutch Grip factor: pedal engagement + thermal fade + permanent lining wear
            let clutchGrip = Math.max(0.4, eng.clutchPedal);
            if (eng.transmissionType === 'MANUAL') {
              const clutchTemp = eng.clutchTemperature || 20;
              const clutchFade = clutchTemp > 220 ? Math.max(0.15, 1.0 - (clutchTemp - 220) / 180) : 1.0;
              const wearFactor = Math.max(0.0, 1.0 - (eng.clutchWear || 0) / 100);
              clutchGrip *= clutchFade * wearFactor;
            } else if (eng.transmissionType === 'AUTO') {
              // ATF fluid boiling / overheating torque converter slip (> 130°C)
              const atfTemp = eng.transmissionTemp || 20;
              if (atfTemp > 130) {
                const atfSlip = Math.max(0.2, 1.0 - (atfTemp - 130) / 50);
                clutchGrip *= atfSlip;
              }
            }

            const speedScaleFactor = SPEED_KMH_TO_PX_S / 2.7778; // 1.6
            driveAccel = (cfg.acceleration || 30) * speedScaleFactor * gearAccelMult * T_factor * fuelFactor * effectiveThrottle * clutchGrip * speedCapFactor;
          }
        }
        
        // Determine propulsion direction
        const isReverseMode = eng.currentGear === -1 || (eng.transmissionType === 'AUTO'&& eng.autoGearMode === 'R');
        if (isReverseMode && !isParkedMode) {
          engineAccel = -driveAccel;
          vehicle.isReversing = true;
        } else if (!isReverseMode && !isParkedMode && !isNeutralMode && eng.currentGear > 0) {
          engineAccel = driveAccel;
          vehicle.isReversing = false;
        } else {
          engineAccel = 0;
          vehicle.isReversing = false;
        }

        // Apply engine compression and downshift braking
        if (engineBrakeFactor > 0 && Math.abs(vehicle.speed) > 1) {
          engineAccel -= Math.sign(vehicle.speed) * engineBrakeFactor;
        }
      } else {
        // Engine Off Coasting (RPM decays to 0)
        if (eng.engineRPM > 0) {
          eng.engineRPM -= 800 * dt;
          eng.engineRPM = Math.max(0, eng.engineRPM);
        }
      }

      // Update isReversing strictly based on transmission selector engagement (regardless of vehicle speed)
      const isReverseEngaged = eng.currentGear === -1 || (eng.transmissionType === 'AUTO' && eng.autoGearMode === 'R');
      vehicle.isReversing = isReverseEngaged && !(eng.transmissionType === 'AUTO' && eng.autoGearMode === 'P');
    }
    
    // Braking & Rolling Resistance logic
    const speedScaleFactor = SPEED_KMH_TO_PX_S / 2.7778; // 1.6

    // Physical ground surface check under front and rear axles
    const wheelBaseForSurf = cfg.length * 0.70;
    const rearAxleDistForSurf = cfg.length * 0.35;
    const currentAngleForSurf = vehicle.angle;
    const headingCosForSurf = Math.cos(currentAngleForSurf);
    const headingSinForSurf = Math.sin(currentAngleForSurf);

    const rearXForSurf = vehicle.x - headingCosForSurf * rearAxleDistForSurf;
    const rearYForSurf = vehicle.y - headingSinForSurf * rearAxleDistForSurf;
    const frontXForSurf = rearXForSurf + headingCosForSurf * wheelBaseForSurf;
    const frontYForSurf = rearYForSurf + headingSinForSurf * wheelBaseForSurf;

    const frontSurf = getSurfaceTypeAt(world, frontXForSurf, frontYForSurf);
    const rearSurf = getSurfaceTypeAt(world, rearXForSurf, rearYForSurf);
    
    // Sluggish engine performance due to trailer mass
    let massRatio = 1.0;
    let extraDrag = ((frontSurf.extraDrag + rearSurf.extraDrag) / 2.0) * speedScaleFactor;

    const isRainingWeather = world.weather === 'rain' || world.weather === 'storm';
    const isStormWeather = world.weather === 'storm';
    const isOffroaderVeh = ['offroad_hardcore', 'suv', 'suv_luxury', 'suv_classic_box', 'pickup', 'pickup_heavy', 'tractor_mtz82', 'tractor_mtz80', 'tractor_mtz80_old', 'truck_armored', 'truck_dump'].includes(cfg.type);
    const isLowClearanceVeh = ['supercar', 'sports', 'coupe_gt', 'hatch_hot', 'micro_car', 'retro_bubble', 'sedan_compact', 'moto_sport'].includes(cfg.type);
    const clearanceFactor = isOffroaderVeh ? 0.50 : (isLowClearanceVeh ? 1.85 : 1.0);

    const frontOffroad = getSurfaceOffroadProps(frontSurf.type, isRainingWeather, isStormWeather);
    const rearOffroad = getSurfaceOffroadProps(rearSurf.type, isRainingWeather, isStormWeather);

    // Wet washed-out offroad terrain adds heavy rolling resistance (размытая земля)
    const wetOffroadDrag = ((frontOffroad.wetExtraDrag + rearOffroad.wetExtraDrag) / 2.0) * clearanceFactor * speedScaleFactor;
    extraDrag += wetOffroadDrag;

    if (vehicle.trailerId) {
      const trailer = world.vehicles.find(v => v.id === vehicle.trailerId);
      if (trailer) {
        const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
        const vehMass = cfg.mass || 1500;
        let trailMass = trailerCfg.mass || 1000;
        // Include liquid payload (water tank, fuel tanker) mass (1 Liter = 1 kg)
        if (trailer.fluidTank) {
          const liquidKg = trailer.fluidTank.currentVolume ?? trailer.fluidTank.currentAmount ?? 0;
          trailMass += liquidKg;
        }
        if ((trailer as any).cargoMass) {
          trailMass += (trailer as any).cargoMass;
        }
        massRatio = vehMass / (vehMass + trailMass);
        
        // Scale down positive or negative drivetrain acceleration by mass ratio
        engineAccel *= massRatio;

        // If trailer parking brake is engaged, apply massive dragging force!
        if (trailer.trailerParkingBrakeEngaged !== false) {
          extraDrag += 180 * speedScaleFactor;
        }
      }
    }

    // Tow rope attached vehicle mass, inertia and dragging resistance
    if (world.towingRopes && world.towingRopes.length > 0) {
      for (const rope of world.towingRopes) {
        let isThisVehicleTowing = false;
        let towedVehId = '';
        if (rope.vehicleAId === vehicle.id && !rope.isFrontA) {
          isThisVehicleTowing = true;
          towedVehId = rope.vehicleBId;
        } else if (rope.vehicleBId === vehicle.id && !rope.isFrontB) {
          isThisVehicleTowing = true;
          towedVehId = rope.vehicleAId;
        }

        if (isThisVehicleTowing && towedVehId) {
          const towedVeh = world.vehicles.find(v => v.id === towedVehId);
          if (towedVeh) {
            const towedCfg = CAR_CONFIGS[towedVeh.type] || CAR_CONFIGS.sedan;
            const vehMass = cfg.mass || 1500;
            let towedMass = towedCfg.mass || 1400;
            if (towedVeh.fluidTank) {
              towedMass += (towedVeh.fluidTank.currentVolume ?? towedVeh.fluidTank.currentAmount ?? 0);
            }
            if ((towedVeh as any).cargoMass) {
              towedMass += (towedVeh as any).cargoMass;
            }

            // Only apply mass ratio drag when rope is taut or actively pulling
            if (rope.isTaut) {
              const towMassRatio = vehMass / (vehMass + towedMass);
              massRatio *= towMassRatio;
              engineAccel *= towMassRatio;

              // Check towed vehicle braking / handbrake resistance
              const isTowedHandbraking = (towedVeh as any).isHandbraking || (towedVeh as any).handbrakeActive || towedVeh.isParked;
              if (isTowedHandbraking) {
                extraDrag += 170 * speedScaleFactor;
              }

              // Engine compression drag if towed in gear with engine stopped & clutch engaged
              const towedEng = towedVeh.engineState;
              if (towedEng && !towedEng.engineRunning && towedEng.currentGear !== 0 && (towedEng.clutchPedal ?? 1) > 0.5) {
                extraDrag += 105 * speedScaleFactor;
              }

              // Damaged/blown tires on towed vehicle
              const tDmg = towedVeh.damage as any;
              if (tDmg?.wheelPopFL || tDmg?.wheelPopFR || tDmg?.wheelPopRL || tDmg?.wheelPopRR || tDmg?.flatTireFL || tDmg?.flatTireFR) {
                extraDrag += 65 * speedScaleFactor;
              }
            }
          }
        }
      }
    }

    if (brake > 0) {
      vehicle.brakeLightsOn = true;
      const avgBrake = isTractor ? (brakeLeftVal + brakeRightVal) / 2 : brake;
      let bForce = cfg.brakingForce * speedScaleFactor * avgBrake;
      
      if (vehicle.trailerId) {
        const trailer = world.vehicles.find(v => v.id === vehicle.trailerId);
        if (trailer) {
          const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
          const hasBrakes = trailer.type === 'trailer_flatbed_2axle' || trailer.type.startsWith('trailer_semi');
          const isBrakesConnected = trailer.trailerBrakesConnected;
          
          if (hasBrakes) {
            if (isBrakesConnected) {
              // Brakes connected: trailer's brakes help stop the combined mass
              const trailBrakeForce = trailerCfg.brakingForce || 140;
              bForce = (cfg.brakingForce + trailBrakeForce) * speedScaleFactor * avgBrake * massRatio;
            } else {
              // Brakes disconnected: towing vehicle stops both itself and the trailer alone (very long stop distance!)
              bForce = cfg.brakingForce * speedScaleFactor * avgBrake * massRatio;
            }
          } else {
            // Trailer has no brakes (e.g., trailer_barrel)
            bForce = cfg.brakingForce * speedScaleFactor * avgBrake * massRatio;
          }
        }
      }

      const safeDt = Math.max(0.0001, dt);
      if (vehicle.speed > 0) {
        // Limit brake force to prevent speed crossing zero (no reverse overshoot)
        const maxBForce = Math.max(0, vehicle.speed / safeDt + engineAccel);
        const effectiveBForce = Math.min(bForce, maxBForce);
        engineAccel -= effectiveBForce;
      } else if (vehicle.speed < 0) {
        // Limit brake force to prevent speed crossing zero (no forward overshoot)
        const maxBForce = Math.max(0, -vehicle.speed / safeDt - engineAccel);
        const effectiveBForce = Math.min(bForce, maxBForce);
        engineAccel += effectiveBForce;
      }
      if (Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH < 0.7) {
        vehicle.speed = 0;
      }
    } else {
      vehicle.brakeLightsOn = isHandbraking;
      if (isHandbraking) {
        // Handbrake: strong deceleration and wheel lock
        let hBrakeForce = cfg.brakingForce * speedScaleFactor * 0.9;
        
        // Dilute handbrake force if towing a trailer
        hBrakeForce *= massRatio;

        const safeDt = Math.max(0.0001, dt);
        if (vehicle.speed > 0) {
          // Limit handbrake force to prevent speed crossing zero
          const maxHBForce = Math.max(0, vehicle.speed / safeDt + engineAccel);
          const effectiveHBForce = Math.min(hBrakeForce, maxHBForce);
          engineAccel -= effectiveHBForce;
        } else if (vehicle.speed < 0) {
          // Limit handbrake force to prevent speed crossing zero
          const maxHBForce = Math.max(0, -vehicle.speed / safeDt - engineAccel);
          const effectiveHBForce = Math.min(hBrakeForce, maxHBForce);
          engineAccel += effectiveHBForce;
        } else {
          vehicle.speed = 0;
        }
      } else {
        // Natural rolling resistance, cold transmission viscous drag (-30°C frost) and aerodynamic drag (v^2)
        const vAbs = Math.abs(vehicle.speed);
        let rollingResistance = 3.0 + vAbs * 0.008;
        
        // Cold gear oil / ATF viscosity drag (< 15°C)
        const transTemp = eng?.transmissionTemp ?? 20;
        if (transTemp < 15) {
          const coldViscousDrag = Math.min(18.0, (15 - transTemp) * 0.55);
          rollingResistance += coldViscousDrag;
        }

        if (extraDrag > 0) {
          rollingResistance += extraDrag;
        }
        
        let aeroCoeff = 0.000045;
        if (['truck_box', 'truck_dump', 'truck_semi', 'truck_tanker', 'truck_water', 'truck_flatbed', 'truck_covered', 'cement_mixer', 'garbage_truck', 'bus', 'delivery_truck', 'truck_tow', 'fire_engine', 'fire_ladder', 'fire_rescue', 'pickup_heavy', 'truck_armored'].includes(cfg.type)) {
          aeroCoeff = 0.000085;
        } else if (cfg.type.startsWith('tractor_') || ['suv', 'suv_luxury', 'offroad_hardcore', 'suv_classic_box', 'van', 'van_camper', 'van_cargo_old'].includes(cfg.type)) {
          aeroCoeff = 0.000065;
        } else if (['supercar', 'sports', 'coupe_gt', 'hatch_hot', 'moto_sport'].includes(cfg.type)) {
          aeroCoeff = 0.000032;
        }
        
        const aeroDrag = aeroCoeff * vAbs * vAbs;
        const totalDrag = rollingResistance + aeroDrag;

        if (vAbs > 1) {
          const safeDt = Math.max(0.0001, dt);
          if (vehicle.speed > 0) {
            // Limit drag deceleration to prevent overshooting zero
            const maxDrag = Math.max(0, vehicle.speed / safeDt + engineAccel);
            const effectiveDrag = Math.min(totalDrag, maxDrag);
            engineAccel -= effectiveDrag;
          } else {
            // Limit drag deceleration to prevent overshooting zero
            const maxDrag = Math.max(0, -vehicle.speed / safeDt - engineAccel);
            const effectiveDrag = Math.min(totalDrag, maxDrag);
            engineAccel += effectiveDrag;
          }
        } else if (throttle === 0 && !eng?.isDieselRunaway && (!eng || eng.transmissionType !== 'AUTO'|| eng.autoGearMode === 'P'|| eng.autoGearMode === 'N')) {
          vehicle.speed = 0;
        }
      }
    }

    if (isHandbraking) {
      vehicle.brakeLightsOn = true;
    }

    // Horn
    if (input.hornH) {
      if (!vehicle.isHonking) {
        vehicle.isHonking = true;
        sound.playHorn();
      }
      vehicle.hornEffectTimer = 0.2;
    } else {
      if (vehicle.isHonking) {
        vehicle.isHonking = false;
        sound.stopHorn();
      }
    }

    // Realistic downhill slope gravitational pull on hills and mounds
    const slope = getTerrainSlope(vehicle.x, vehicle.y);
    if (slope.gradient > 0.005) {
      const cosH = Math.cos(vehicle.angle);
      const sinH = Math.sin(vehicle.angle);
      // Downhill vector along the vehicle forward axis (slopeX/Y point uphill)
      const slopeForceLongitudinal = -(slope.slopeX * cosH + slope.slopeY * sinH);
      // Smooth gravitational slope grade force (scaled down so vehicles can easily climb steep hills)
      const slopeAccelRaw = slopeForceLongitudinal * 28.0;
      const slopeAccel = Math.max(-8.0, Math.min(8.0, slopeAccelRaw));
      if (!isHandbraking && brake < 0.5) {
        engineAccel += slopeAccel;
      }
    }

    // Apply engine acceleration
    vehicle.speed += engineAccel * dt;

    const maxSpeedPx = cfg.maxSpeed * SPEED_KMH_TO_PX_S;
    const reverseMaxSpeedPx = cfg.reverseMaxSpeed * SPEED_KMH_TO_PX_S;

    // Hard speed limits
    if (vehicle.speed > maxSpeedPx) vehicle.speed = maxSpeedPx;
    if (vehicle.speed < -reverseMaxSpeedPx) vehicle.speed = -reverseMaxSpeedPx;
    if (Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH < 0.7 && !input.forward && !input.backward) {
      vehicle.speed = 0;
    }

    // --- REALISTIC BICYCLE KINEMATICS WITH REAR-AXLE PIVOT & CONTROLLED DRIFT ---
    const { rearAxleDist, wheelBase } = getVehicleAxleGeometry(vehicle);

    const initialAngle = vehicle.angle;
    const initHeadingCos = Math.cos(initialAngle);
    const initHeadingSin = Math.sin(initialAngle);

    // Initial position of the rear axle in world space (the true pivot of front-steered vehicles)
    const rearX = vehicle.x - initHeadingCos * rearAxleDist;
    const rearY = vehicle.y - initHeadingSin * rearAxleDist;

    // Angular rotation from front wheel steer angle or articulated center pivot
    // Wheeled asphalt pavers have a rigid frame with steered front bogie wheels (NOT articulated!)
    const isArticulated = vehicle.type === 'roller_heavy_tandem' || 
                          vehicle.type === 'roller_compact_sidewalk' || 
                          vehicle.type === 'roller_pneumatic';

    const maxSafeSteer = 0.82; // cap steer from asymptotic growth
    const clampedSteer = Math.max(-maxSafeSteer, Math.min(maxSafeSteer, vehicle.steerAngle));
    const tanSteer = Math.tan(clampedSteer);

    let angularSpeed = 0;
    if (isArticulated) {
      // True Articulated Frame Kinematics: the front drum pivots by clampedSteer relative to the rear frame.
      // The front drum traction yaws the rear frame around the rear axle: omega = (v / wheelbase) * sin(steer)
      angularSpeed = (vehicle.speed / Math.max(10, wheelBase)) * Math.sin(clampedSteer);

      // Hydrostatic Transmission Drag when throttle is released
      if (!input.forward && !input.backward) {
        vehicle.speed *= Math.pow(0.82, dt * 60);
      }
    } else {
      // Standard front-steered Ackerman bicycle kinematics around rear axle
      angularSpeed = (vehicle.speed / Math.max(1, wheelBase)) * tanSteer;

      // Hydrostatic drag for wheeled paver as well
      if (vehicle.type === 'paver_asphalt_wheeled' && !input.forward && !input.backward) {
        vehicle.speed *= Math.pow(0.82, dt * 60);
      }
    }

    // MTZ Split Brakes pivot turning yaw moment
    if (isTractor && !latchEnabled) {
      const brakeDiff = brakeRightVal - brakeLeftVal; // positive: turn right, negative: turn left
      if (Math.abs(brakeDiff) > 0.1 && Math.abs(vehicle.speed) > 1.0) {
        const dir = Math.sign(vehicle.speed);
        // Add robust turning force (pivoting on one wheel).
        // Since standard turning is ~0.8-1.0 rad/s, we add a powerful 1.8 rad/s multiplier scaled by speed.
        angularSpeed += brakeDiff * dir * 1.8 * Math.min(1.0, Math.abs(vehicle.speed) / 110.0);
      }
    }

    // Surface & Weather grip calculations
    let weatherGrip = 1.0;
    let isWetSurface = false;
    if (world.weather === 'rain') {
      weatherGrip = 0.58; // Rain decreases grip significantly!
      isWetSurface = true;
    } else if (world.weather === 'storm') {
      weatherGrip = 0.44; // Storm makes asphalt super slick, drift is effortless!
      isWetSurface = true;
    } else if (world.weather === 'fog') {
      weatherGrip = 0.88;
    }

    // Check puddles / oil / fuel / coolant / sand stains with per-tire contact & heavy vehicle mass physics
    let frontStainGrip = 1.0;
    let rearStainGrip = 1.0;
    
    // Front and Rear axle world coordinates
    const frontAxleX = rearX + initHeadingCos * wheelBase;
    const frontAxleY = rearY + initHeadingSin * wheelBase;
    const rearAxleX = rearX;
    const rearAxleY = rearY;

    // Solo motorcycle check
    const isSoloMoto = cfg.type.startsWith('moto_') || cfg.type === 'moped_soviet';
    const trackHalfForTires = isSoloMoto ? 0 : (cfg.width || 20) * 0.42;

    // 4 Distinct Wheel Contact Patch coordinates (FL, FR, RL, RR)
    const tFLX = isSoloMoto ? frontAxleX : (frontAxleX - initHeadingSin * trackHalfForTires);
    const tFLY = isSoloMoto ? frontAxleY : (frontAxleY + initHeadingCos * trackHalfForTires);
    const tFRX = isSoloMoto ? frontAxleX : (frontAxleX + initHeadingSin * trackHalfForTires);
    const tFRY = isSoloMoto ? frontAxleY : (frontAxleY - initHeadingCos * trackHalfForTires);

    const tRLX = isSoloMoto ? rearAxleX : (rearAxleX - initHeadingSin * trackHalfForTires);
    const tRLY = isSoloMoto ? rearAxleY : (rearAxleY + initHeadingCos * trackHalfForTires);
    const tRRX = isSoloMoto ? rearAxleX : (rearAxleX + initHeadingSin * trackHalfForTires);
    const tRRY = isSoloMoto ? rearAxleY : (rearAxleY - initHeadingCos * trackHalfForTires);

    // Sample terrain surface under EACH individual wheel
    const surfFL = getSurfaceTypeAt(world, tFLX, tFLY);
    const surfFR = getSurfaceTypeAt(world, tFRX, tFRY);
    const surfRL = getSurfaceTypeAt(world, tRLX, tRLY);
    const surfRR = getSurfaceTypeAt(world, tRRX, tRRY);

    const offroadFL = getSurfaceOffroadProps(surfFL.type, isRainingWeather, isStormWeather);
    const offroadFR = getSurfaceOffroadProps(surfFR.type, isRainingWeather, isStormWeather);
    const offroadRL = getSurfaceOffroadProps(surfRL.type, isRainingWeather, isStormWeather);
    const offroadRR = getSurfaceOffroadProps(surfRR.type, isRainingWeather, isStormWeather);

    // Combined vehicle & trailer mass load factor
    let combinedMass = cfg.mass || 1500;
    if (vehicle.trailerId) {
      const trailer = world.vehicles.find(v => v.id === vehicle.trailerId);
      if (trailer) {
        const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
        combinedMass += (trailerCfg.mass || 1000) + (trailer.fluidTank?.currentVolume ?? 0) + ((trailer as any).cargoMass || 0);
      }
    }

    // Heavy trucks & road trains have massive vertical tire load and multi-wheel contact patches
    // that cut through small fluid stains instead of hydroplaning like a lightweight car
    const heavyMassLoadDamping = Math.min(0.68, Math.max(0, (combinedMass - 1500) / 22000));

    let stainFL = 1.0;
    let stainFR = 1.0;
    let stainRL = 1.0;
    let stainRR = 1.0;

    if (world.stains && world.stains.length > 0) {
      for (let i = 0; i < world.stains.length; i++) {
        const st = world.stains[i];
        const rSt = st.radius || 15;
        
        // Base grip for a single standard tire on this stain type
        let baseGripReduction = 0.35;
        if (st.type === 'oil' || st.type === 'fuel') {
          baseGripReduction = 0.32;
        } else if (st.type === 'coolant') {
          baseGripReduction = 0.42;
        } else if (st.type === 'water') {
          baseGripReduction = 0.55;
        } else if (st.type === 'sand') {
          baseGripReduction = 0.68;
        }

        // Heavy vehicle mass & multi-tire grip compensation
        const effectiveStainGripOnTire = baseGripReduction + (1.0 - baseGripReduction) * heavyMassLoadDamping;

        if (Math.hypot(tFLX - st.x, tFLY - st.y) < rSt + 6) {
          stainFL = Math.min(stainFL, effectiveStainGripOnTire);
          if (st.type === 'water') isWetSurface = true;
        }
        if (Math.hypot(tFRX - st.x, tFRY - st.y) < rSt + 6) {
          stainFR = Math.min(stainFR, effectiveStainGripOnTire);
          if (st.type === 'water') isWetSurface = true;
        }
        if (Math.hypot(tRLX - st.x, tRLY - st.y) < rSt + 6) {
          stainRL = Math.min(stainRL, effectiveStainGripOnTire);
          if (st.type === 'water') isWetSurface = true;
        }
        if (Math.hypot(tRRX - st.x, tRRY - st.y) < rSt + 6) {
          stainRR = Math.min(stainRR, effectiveStainGripOnTire);
          if (st.type === 'water') isWetSurface = true;
        }
      }
    }

    frontStainGrip = (stainFL + stainFR) / 2.0;
    rearStainGrip = (stainRL + stainRR) / 2.0;

    // Individual wheel grip calculation: weather * stain * surface * offroad
    const gripFL = weatherGrip * stainFL * surfFL.grip * offroadFL.wetGripMult;
    const gripFR = weatherGrip * stainFR * surfFR.grip * offroadFR.wetGripMult;
    const gripRL = weatherGrip * stainRL * surfRL.grip * offroadRL.wetGripMult;
    const gripRR = weatherGrip * stainRR * surfRR.grip * offroadRR.wetGripMult;

    // Differential lock status
    const dlState = vehicle.diffLock;
    const isRearLocked = !!dlState?.rear;
    const isFrontLocked = !!dlState?.front;
    const isCenterLocked = !!dlState?.center;

    // Retrieve vehicle drive type (FWD, RWD, AWD)
    const driveType = getVehicleDriveType(vehicle.type);

    // --- MATHEMATICAL REAR AXLE TORQUE & TRACTION (МКБ-З) ---
    // In an OPEN differential, torque to each wheel is limited by the wheel with least grip:
    // T_axle = 2 * min(grip_left, grip_right) + internal friction bias (5%).
    // In a LOCKED differential, wheels are mechanically bound (w_left = w_right):
    // T_axle = grip_left + grip_right!
    let surfaceGripRear: number;
    if (isRearLocked || isSoloMoto) {
      surfaceGripRear = (gripRL + gripRR) / 2.0;
    } else {
      surfaceGripRear = Math.min(gripRL, gripRR) * 1.05;
    }

    // --- MATHEMATICAL FRONT AXLE TORQUE & TRACTION (МКБ-П) ---
    let surfaceGripFront: number;
    if (isFrontLocked || isSoloMoto) {
      surfaceGripFront = (gripFL + gripFR) / 2.0;
    } else {
      surfaceGripFront = Math.min(gripFL, gripFR) * 1.05;
    }

    // --- MATHEMATICAL CENTER DIFFERENTIAL / TRANSFER CASE (МОБ) ---
    // If Center Diff is LOCKED (or Transfer case is 4H/4L):
    // Rigid 50:50 torque split between front and rear driveshafts:
    // T_total = (surfaceGripFront + surfaceGripRear) / 2
    // If Center Diff is OPEN (standard AWD):
    // Torque slips through the axle with least grip:
    let avgSurfaceGrip: number;
    if (isCenterLocked || vehicle.transferCaseMode === '4H' || vehicle.transferCaseMode === '4L') {
      avgSurfaceGrip = (surfaceGripFront + surfaceGripRear) / 2.0;
    } else if (driveType === 'AWD') {
      avgSurfaceGrip = Math.min(surfaceGripFront, surfaceGripRear) * 1.10;
    } else {
      avgSurfaceGrip = driveType === 'RWD' ? surfaceGripRear : surfaceGripFront;
    }

    // Calculate vehicle sink depth into muddy or soft soil based on surface, vehicle mass and clearance
    const massFactor = Math.min(2.5, Math.max(0.65, (combinedMass || 1500) / 1400));
    const frontSink = ((offroadFL.baseSink + offroadFR.baseSink) / 2.0) * massFactor * clearanceFactor;
    const rearSink = ((offroadRL.baseSink + offroadRR.baseSink) / 2.0) * massFactor * clearanceFactor;
    const currentSinkDepth = (frontSink + rearSink) / 2.0;
    vehicle.offroadSinkDepth = currentSinkDepth;
    vehicle.isBoggedDown = currentSinkDepth > 0.65 && Math.abs(vehicle.speed) < 18.0;

    // Separate front and rear axle grip factors for realistic differential slip
    let frontGripFactor = cfg.grip * surfaceGripFront;
    let rearGripFactor = (isHandbraking ? cfg.driftGrip * 0.48 : cfg.grip) * surfaceGripRear;

    const vSpeedKmh = Math.abs(vehicle.speed) * PX_S_TO_SPEED_KMH;
    const vSpeedAbs = Math.abs(vehicle.speed);
    const moveDir = Math.sign(vehicle.speed) || 1;

    // --- REALISTIC TRACTION & POWER SLIP PHYSICS (Physically sound torque-based slip) ---
    const isEngineRunning = !eng || (eng.engineRunning && !eng.isStalled && eng.engineRPM > 400);
    const effectiveThrottle = isEngineRunning ? (throttle > 0 ? throttle : 0) : 0;

    // 1. Transmission engagement check (No wheel torque in neutral/park or with depressed clutch)
    const isClutchEngaged = eng ? (eng.transmissionType === 'MANUAL' ? Math.max(0, (eng.clutchPedal - 0.25) / 0.75) : 1.0) : 1.0;
    const isInGear = eng ? (eng.currentGear !== 0 && (!eng.autoGearMode || (eng.autoGearMode !== 'N' && eng.autoGearMode !== 'P'))) : true;
    const effectiveDriveTransmission = isClutchEngaged * (isInGear ? 1.0 : 0.0);

    // 2. Wheel torque calculation (torque at driven wheels = engine torque * gear ratio * transmission engagement)
    const isPowerfulCar = ['supercar', 'sports', 'coupe_gt', 'muscle', 'muscle_classic', 'sedan_luxury', 'moto_sport'].includes(cfg.type);
    const powerMultiplier = isPowerfulCar ? 1.45 : (vehicle.hasChiptuning ? 1.15 : 0.85);
    const autoDamping = (eng?.transmissionType === 'AUTO' && !isPowerfulCar) ? 0.75 : 1.0;

    // Torque multiplier by gear (1st gear = 1.0, 2nd gear = 0.62, 3rd = 0.38, 4th+ = 0.20 or less)
    const wheelTorqueFactor = effectiveThrottle * effectiveDriveTransmission * gearAccelMult * T_factor * autoDamping;

    // 3. Launch RPM boost ONLY when launching from stop/low speed in 1st/reverse gear with clutch engaged
    const isLaunchState = vSpeedKmh < 15.0 && (eng ? (eng.currentGear === 1 || eng.currentGear === -1) : true);
    const launchRPMBoost = (isLaunchState && eng && eng.engineRPM > 4000 && effectiveDriveTransmission > 0.5)
      ? Math.min(1.7, 1.0 + (eng.engineRPM - 4000) / 3500)
      : 1.0;

    // 4. Speed slip attenuation and physical traction weight-scaling
    const speedSlipFactor = Math.max(0, 1.0 - (vSpeedKmh / 38.0));
    
    // Scale engine driving torque force proportionally with its configured acceleration power
    const baseEngineForceFactor = (cfg.acceleration || 30) / 30.0;
    
    // Dynamic combined mass calculation (including vehicle cargo, fluid tank volumes, and connected trailers)
    let dynamicCombinedMass = cfg.mass || 1500;
    
    // Include liquid payload (water tank, fuel tanker) mass (1 Liter = 1 kg)
    if (vehicle.fluidTank) {
      dynamicCombinedMass += vehicle.fluidTank.currentVolume ?? vehicle.fluidTank.currentAmount ?? 0;
    }
    if ((vehicle as any).cargoMass) {
      dynamicCombinedMass += (vehicle as any).cargoMass;
    }
    
    // Add trailer and trailer's cargo/fluid mass
    if (vehicle.trailerId) {
      const trailer = world.vehicles.find(v => v.id === vehicle.trailerId);
      if (trailer) {
        const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
        let trailMass = trailerCfg.mass || 1000;
        if (trailer.fluidTank) {
          trailMass += trailer.fluidTank.currentVolume ?? trailer.fluidTank.currentAmount ?? 0;
        }
        if ((trailer as any).cargoMass) {
          trailMass += (trailer as any).cargoMass;
        }
        dynamicCombinedMass += trailMass;
      }
    }
    
    // Scale resistance to tire slip based on dynamic weight relative to a standard passenger car
    const massScaleFactor = dynamicCombinedMass / 1500;
    const driveSlipDemand = wheelTorqueFactor * baseEngineForceFactor * powerMultiplier * launchRPMBoost * (0.30 + 0.70 * speedSlipFactor);

    // Burnout on the spot (holding throttle + handbrake with running engine at low speed)
    // Only physically possible if the engine torque force can overcome the rear tires' static friction!
    const isBurnoutHolding = isEngineRunning && isHandbraking && effectiveThrottle > 0.65 && vSpeedKmh < 12.0 &&
                             (driveSlipDemand > (surfaceGripRear * 0.85 * massScaleFactor));

    // 5. Drive-type specific power slip triggers and traction limits
    let isFrontPowerSlip = false;
    let isRearPowerSlip = false;
    let isAwdPowerSlip = false;

    if (driveType === 'FWD') {
      const fwdTractionLimit = surfaceGripFront * 0.90 * massScaleFactor;
      isFrontPowerSlip = isEngineRunning && effectiveThrottle > 0.30 &&
                         (isBurnoutHolding || (
                           driveSlipDemand > fwdTractionLimit * 1.25 &&
                           vSpeedKmh < 45.0 &&
                           (Math.abs(vehicle.steerAngle) > 0.18 || isWetSurface || frontStainGrip < 0.80)
                         ));
      if (isFrontPowerSlip) {
        const slipScale = Math.min(0.40, effectiveThrottle * 0.30 * (1.0 + Math.abs(vehicle.steerAngle)));
        frontGripFactor *= (1.0 - slipScale);
      }
    } else if (driveType === 'RWD') {
      const rwdTractionLimit = surfaceGripRear * 0.85 * massScaleFactor;
      isRearPowerSlip = isEngineRunning && effectiveThrottle > 0.25 &&
                        (isBurnoutHolding || (
                          driveSlipDemand > rwdTractionLimit * 1.05 &&
                          (Math.abs(vehicle.steerAngle) > 0.05 || isWetSurface || rearStainGrip < 0.80 || isBurnoutHolding || (isPowerfulCar && effectiveThrottle > 0.80 && vSpeedKmh < 28.0))
                        ));
      if (isRearPowerSlip && effectiveThrottle > 0.20) {
        rearGripFactor *= 0.42;
      }
    } else if (driveType === 'AWD') {
      // AWD / 4WD / 4x4: Engine torque is distributed across all 4 wheels (front and rear)
      // High traction limit - breaking 4WD into wheelspin on dry asphalt is nearly impossible (especially on automatic)
      const awdTractionLimit = (surfaceGripFront + surfaceGripRear) * 1.65 * massScaleFactor;
      
      // AWD power slip occurs ONLY under extreme torque (e.g. supercar launch or chiptuned) or very slick surface (ice/rain/oil)
      isAwdPowerSlip = isEngineRunning && effectiveThrottle > 0.45 &&
                       (isBurnoutHolding || (
                         driveSlipDemand > awdTractionLimit * (eng?.transmissionType === 'AUTO' ? 1.45 : 1.25) &&
                         (isWetSurface || rearStainGrip < 0.85 || frontStainGrip < 0.85 || (isPowerfulCar && vSpeedKmh < 20.0))
                       ));

      if (isAwdPowerSlip) {
        // Symmetric, mild 4-wheel slip: preserves stability and control, NO tail-spin / drift collapse!
        const awdSlipScale = Math.min(0.22, effectiveThrottle * 0.18);
        frontGripFactor *= (1.0 - awdSlipScale);
        rearGripFactor *= (1.0 - awdSlipScale);
      }
    }

    // Effective tire grip based on terrain surface properties
    const currentBaseGrip = (frontGripFactor + rearGripFactor) / 2.0;
    let effectiveGrip = Math.max(0.06, currentBaseGrip * (1 - Math.min(0.85, vehicle.driftFactor || 0)));
    if (vehicle.isHeavySuspended) effectiveGrip *= 1.12; // +12% grip from reinforced suspension

    let lateralSlip = vehicle.lateralVelocity || 0;

    // Centripetal acceleration demand (v * omega)
    const kinematicYawRate = isRoadMachinery(vehicle.type)
      ? ((vehicle.speed / Math.max(1, wheelBase)) * 2 * Math.sin((vehicle.steerAngle || 0) / 2))
      : ((vehicle.speed / Math.max(1, wheelBase)) * tanSteer);
    const lateralDemand = vehicle.speed * kinematicYawRate; // px/s^2

    // Threshold of grip before tires slip laterally (px/s^2)
    const rearGripLimit = rearGripFactor * 780.0;
    const frontGripLimit = frontGripFactor * 780.0;

    // Dynamic kinetic sliding friction factor
    const slipFractionForK = Math.min(1.0, Math.abs(lateralSlip) / 100.0);
    // Kinetic friction drop: up to 40% reduction in lateral grip when fully sliding
    const kineticGripReduction = slipFractionForK * 0.40;
    const lateralRearGripLimit = rearGripLimit * (1.0 - kineticGripReduction);

    // UNDERSTEER (снос передней оси) расчет
    const excessFront = Math.max(0, (Math.abs(lateralDemand) - frontGripLimit) / frontGripLimit);
    let understeerFactor = Math.min(0.65, excessFront * 0.35);
    if (isFrontPowerSlip) {
      understeerFactor = Math.max(understeerFactor, Math.min(0.55, effectiveThrottle * 0.40));
    }

    // --- REALISTIC DIFFERENTIAL LOCK RESISTANCE & UNDERSTEER (МАТЕМАТИКА СОПРОТИВЛЕНИЯ ПОВОРОТУ) ---
    // When cross-axle diffs are locked, wheels must rotate at identical speeds.
    // In turns, outer wheels must cover greater radius than inner wheels.
    // The forced scrubbing resists yaw rotation (parasitic stabilizing moment).
    const onHardRoad = surfFL.type === 'asphalt' || surfFL.type === 'concrete' || surfFL.type === 'rock' ||
                       surfRR.type === 'asphalt' || surfRR.type === 'concrete';

    if (isRearLocked && !isSoloMoto) {
      // Rear axle resists turning (pushes straight)
      understeerFactor += onHardRoad ? 0.22 : 0.08;
    }
    if (isFrontLocked && !isSoloMoto) {
      // Front axle locked makes steering extremely stiff and heavy
      understeerFactor += onHardRoad ? 0.44 : 0.20;
    }

    // Center diff lock binding (циркуляция паразитной мощности) on hard dry surfaces in tight turns
    if (isCenterLocked && onHardRoad && Math.abs(vehicle.steerAngle) > 0.10) {
      const drivelineBindDrag = Math.abs(vehicle.steerAngle) * 35.0 * dt;
      vehicle.speed = Math.sign(vehicle.speed) * Math.max(0, Math.abs(vehicle.speed) - drivelineBindDrag);
    }

    // Apply understeer: scales effective turning rate of the front wheels
    let effectiveYawRate = kinematicYawRate * (1.0 - understeerFactor);
    if (isRearLocked && !isSoloMoto) {
      effectiveYawRate *= (onHardRoad ? 0.74 : 0.88);
    }
    if (isFrontLocked && !isSoloMoto) {
      effectiveYawRate *= (onHardRoad ? 0.46 : 0.65);
    }

    // FWD natural mild stabilization without killing drift inertia
    const fwdStabilization = (driveType === 'FWD' && vehicle.speed > 5 && effectiveThrottle > 0.3) ? 1.25 : 1.0;

    // 1. Oversteer / Drift Logic: Calculate sliding forces and lateral momentum
    let isDriftingThisFrame = false;

    // Sustained power drift maintenance on RWD/AWD (maintaining slide with running engine throttle)
    const isPowerDriftMaintaining = isEngineRunning &&
                                    (driveType === 'RWD' || driveType === 'AWD') &&
                                    (Math.abs(lateralSlip) > 10.0) &&
                                    (effectiveThrottle > 0.15) &&
                                    vSpeedKmh > 4.0;

    if (isHandbraking && vSpeedKmh > 6.0) {
      // Handbrake locks rear wheels, swinging rear out in forward or reverse
      isDriftingThisFrame = true;
      const swingSign = -Math.sign(vehicle.steerAngle || (vehicle.angularVelocity * moveDir) || 1) * moveDir;
      
      // Proportional handbrake slip: sliding is triggered by steering or existing drift angle.
      // If going perfectly straight, locking the rear wheels does not force the tail sideways out of nowhere.
      const steerInfluence = Math.min(1.0, Math.abs(vehicle.steerAngle) * 3.5);
      const existingSlipInfluence = Math.min(1.0, Math.abs(lateralSlip) / 25.0);
      const handbrakeInfluence = Math.max(steerInfluence, existingSlipInfluence);
      
      const targetSlip = swingSign * Math.min(150, vSpeedAbs * 0.70) * handbrakeInfluence;
      
      // Build up the slide at a progressive, manageable rate (6.0 instead of 9.0)
      lateralSlip += (targetSlip - lateralSlip) * Math.min(1.0, 6.0 * dt);
    } else if (vSpeedAbs > 2.0 && (Math.abs(lateralDemand) > lateralRearGripLimit || (isRearPowerSlip && Math.abs(vehicle.steerAngle) > 0.06))) {
      // Oversteer drift from centrifugal force, Scandinavian flick, or RWD power kick
      isDriftingThisFrame = true;
      const excessFactor = isRearPowerSlip ? 1.6 : (Math.abs(lateralDemand) - lateralRearGripLimit) / lateralRearGripLimit;
      const swingSign = -Math.sign(vehicle.steerAngle || (vehicle.angularVelocity * moveDir) || 1) * moveDir;
      const targetSlip = swingSign * Math.min(150, (excessFactor * 36.0 + vSpeedAbs * 0.42) * Math.min(1.0, vSpeedAbs / 8.0));
      
      lateralSlip += (targetSlip - lateralSlip) * Math.min(1.0, 6.5 * dt);
    } else if (isPowerDriftMaintaining) {
      // Holding throttle in a slide sustains drift angle smoothly
      isDriftingThisFrame = true;
      const swingSign = Math.sign(lateralSlip) || 1;
      const targetSlip = swingSign * Math.min(170, effectiveThrottle * 58.0 + vSpeedAbs * 0.45);
      
      lateralSlip += (targetSlip - lateralSlip) * Math.min(1.0, 5.5 * dt);
    } else {
      // GRIP / TRANSITION REGIME: Smooth kinetic to static tire tracking
      // Does not snap or lock, allowing smooth weight transfer pendulum ("повилять")
      const slipRel = Math.min(1.0, Math.abs(lateralSlip) / 60.0);

      // Throttle-based drift maintenance damping (reduces recovery when giving gas in RWD/AWD)
      let throttleDamping = 1.0;
      if (effectiveThrottle > 0.15 && (driveType === 'RWD' || driveType === 'AWD')) {
        throttleDamping = Math.max(0.35, 1.0 - effectiveThrottle * 0.65);
      }

      const recoveryRate = (5.5 + (1.0 - slipRel) * 8.0) * effectiveGrip * fwdStabilization * throttleDamping;
      lateralSlip *= Math.max(0, 1.0 - recoveryRate * dt);
      if (Math.abs(lateralSlip) < 0.4 || vSpeedAbs < 0.8) lateralSlip = 0;
    }

    if (isRoadMachinery(vehicle.type)) {
      lateralSlip = 0;
      isDriftingThisFrame = false;
    }

    // 2. Dynamic Yaw Rate with realistic Counter-Steering (Руление, контр-руление и виляние)
    let finalAngularSpeed = effectiveYawRate;

    if (vSpeedAbs < 0.8 && !isBurnoutHolding) {
      // Stationary vehicle: zero angular momentum or slide rotation
      lateralSlip = 0;
      vehicle.angularVelocity = 0;
      finalAngularSpeed = 0;
      if (isRoadMachinery(vehicle.type) && dt > 0) {
        const prevSteer = (vehicle as any)._prevSteerAngle ?? (vehicle.steerAngle || 0);
        const steerDiff = (vehicle.steerAngle || 0) - prevSteer;
        finalAngularSpeed = (steerDiff / dt) * 0.5;
      }
    } else if (Math.abs(lateralSlip) > 6.0 || isHandbraking) {
      // DRIFT REGIME: Vehicle is sliding sideways
      // Front wheels exert counter-steering torque; sliding rear axle exerts swing torque
      const isHeavyVehicle = (cfg.mass || 1500) >= 4500 || vehicle.type === 'truck_semi' || vehicle.type.startsWith('truck_') || vehicle.type.startsWith('tractor_') || vehicle.type === 'bus' || !!vehicle.trailerId;
      const trailerYawDamping = vehicle.trailerId ? 0.32 : (isHeavyVehicle ? 0.55 : 1.0);

      const frontSteerTorque = effectiveYawRate * 1.65;
      const rearSlideTorque = -Math.sign(lateralSlip) * Math.min(4.0, (Math.abs(lateralSlip) / 50.0) * 2.2) * moveDir * trailerYawDamping;
      
      const totalYawTorque = frontSteerTorque + rearSlideTorque;
      
      let currentYaw = vehicle.angularVelocity || 0;
      currentYaw += (totalYawTorque - currentYaw) * Math.min(1.0, 7.5 * dt);
      
      // Natural body rotational damping (allows smooth rotational momentum without auto-centering snap)
      currentYaw *= Math.max(0, 1.0 - 0.55 * dt);
      
      finalAngularSpeed = currentYaw;
    } else {
      // GRIP REGIME: Responsive geometrical turning tracking front wheels
      let currentYaw = vehicle.angularVelocity || 0;
      currentYaw += (effectiveYawRate - currentYaw) * Math.min(1.0, 15.0 * dt);
      currentYaw *= Math.max(0, 1.0 - 0.35 * dt);
      finalAngularSpeed = currentYaw;
    }

    // 3. Sliding Tire Friction Scrubbing (Speed Bleed)
    const slipAbs = Math.abs(lateralSlip);
    if (slipAbs > 10.0) {
      const scrubIntensity = (slipAbs / 120.0) * (isHandbraking ? 1.35 : 0.85);
      // Reduce speed scrubbing on slippery surfaces (lower effectiveGrip) to slide naturally
      const gripScrubMult = Math.max(0.30, effectiveGrip);
      const speedLoss = 28.0 * scrubIntensity * gripScrubMult * dt;
      vehicle.speed = Math.sign(vehicle.speed) * Math.max(0, Math.abs(vehicle.speed) - speedLoss);
      
      lateralSlip *= Math.max(0, 1.0 - 1.8 * effectiveGrip * dt);
    }

    vehicle.lateralVelocity = lateralSlip;

    // Update yaw angle around the physical center (rear axle)
    vehicle.angularVelocity = finalAngularSpeed;
    vehicle.angle += vehicle.angularVelocity * dt;
    vehicle.angle = ((vehicle.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    (vehicle as any)._prevSteerAngle = vehicle.steerAngle || 0;

    // New heading after rotation
    const newHeadingCos = Math.cos(vehicle.angle);
    const newHeadingSin = Math.sin(vehicle.angle);

    // Rear axle moves along forward heading at vehicle.speed, plus genuine lateral drift slip
    const rearVelX = newHeadingCos * vehicle.speed - newHeadingSin * lateralSlip;
    const rearVelY = newHeadingSin * vehicle.speed + newHeadingCos * lateralSlip;

    const newRearX = rearX + rearVelX * dt;
    const newRearY = rearY + rearVelY * dt;

    // Reconstruct vehicle center from the newly translated & rotated rear axle
    const newCenterX = newRearX + newHeadingCos * rearAxleDist;
    const newCenterY = newRearY + newHeadingSin * rearAxleDist;

    // Velocity vector for the vehicle center
    vehicle.vx = (newCenterX - vehicle.x) / dt;
    vehicle.vy = (newCenterY - vehicle.y) / dt;

    // 1. Dual-Wheel Drift & Slip State
    const slipMagnitude = Math.abs(lateralSlip);
    vehicle.isDrifting = (isHandbraking && vSpeedKmh > 8.0) || 
                         (slipMagnitude > 22.0 && vSpeedKmh > 12.0) ||
                         (isBurnoutHolding);

    const isFrontSlipping = isFrontPowerSlip && effectiveThrottle > 0.60 && (vSpeedKmh < 45.0 || isWetSurface || frontStainGrip < 0.85);
    const isRearSlipping = isRearPowerSlip && effectiveThrottle > 0.60 && (vSpeedKmh < 45.0 || isWetSurface || rearStainGrip < 0.85);

    // Locked differential tire scrubbing on hard dry asphalt in turns
    const isLockedTireScrubbing = onHardRoad && (isRearLocked || isFrontLocked) && Math.abs(vehicle.steerAngle) > 0.08 && vSpeedKmh > 3.0 && vSpeedKmh < 60.0;

    // 2. Screech Sound - only screech on hard pavement (asphalt/concrete/rock), NEVER on soft mud or wet grass!
    if (onHardRoad && (vehicle.isDrifting || isFrontSlipping || isRearSlipping || isLockedTireScrubbing)) {
      const screechIntensity = Math.max(
        vehicle.isDrifting ? Math.min(1.0, slipMagnitude / 70.0) : 0,
        (isFrontSlipping || isRearSlipping) ? Math.min(1.0, effectiveThrottle * 0.75) : 0,
        isLockedTireScrubbing ? Math.min(0.55, Math.abs(vehicle.steerAngle) * 1.3) : 0
      );
      sound.startTireScreech(Math.min(1.0, screechIntensity));
    } else {
      sound.stopTireScreech();
    }

    // 3. Wheel Geometry & Positions
    const trackHalf = isSoloMoto ? 0 : cfg.width * 0.42;
    const baseTireWidth = cfg.width * 0.16 + 2.0;

    // Rear tires
    const leftRearX = isSoloMoto ? newRearX : (newRearX - newHeadingSin * trackHalf);
    const leftRearY = isSoloMoto ? newRearY : (newRearY + newHeadingCos * trackHalf);
    const rightRearX = isSoloMoto ? newRearX : (newRearX + newHeadingSin * trackHalf);
    const rightRearY = isSoloMoto ? newRearY : (newRearY - newHeadingCos * trackHalf);

    // Front tires
    const frontCenterX = newRearX + newHeadingCos * wheelBase;
    const frontCenterY = newRearY + newHeadingSin * wheelBase;
    const leftFrontX = isSoloMoto ? frontCenterX : (frontCenterX - newHeadingSin * trackHalf);
    const leftFrontY = isSoloMoto ? frontCenterY : (frontCenterY + newHeadingCos * trackHalf);
    const rightFrontX = isSoloMoto ? frontCenterX : (frontCenterX + newHeadingSin * trackHalf);
    const rightFrontY = isSoloMoto ? frontCenterY : (frontCenterY - newHeadingCos * trackHalf);

    // 4. Continuous Volumetric Offroad Ruts & Skidmarks Tracking
    const vAny = vehicle as any;
    if (!vAny._tireTracker) {
      vAny._tireTracker = {
        rlX: leftRearX, rlY: leftRearY,
        rrX: rightRearX, rrY: rightRearY,
        flX: leftFrontX, flY: leftFrontY,
        frX: rightFrontX, frY: rightFrontY,
        lastRearX: newRearX, lastRearY: newRearY,
        churnTimer: 0
      };
    }

    const tracker = vAny._tireTracker;
    const dMoved = Math.hypot(newRearX - tracker.lastRearX, newRearY - tracker.lastRearY);
    const hasWheelSpin = isFrontSlipping || isRearSlipping || vehicle.isDrifting;
    const minStep = hasWheelSpin ? 3.5 : 6.5;

    if (dMoved >= minStep) {
      // Helper function to deposit track for a tire
      const depositTireTrack = (currX: number, currY: number, prevX: number, prevY: number, isFrontAxle: boolean) => {
        const surf = getSurfaceTypeAt(world, currX, currY);
        const offroad = getSurfaceOffroadProps(surf.type, isWetSurface, isStormWeather);
        const isSlippingAxle = isFrontAxle ? isFrontSlipping : isRearSlipping;

        if (offroad.isOffroad) {
          // Offroad soil deformation & rut digging
          const tireDepth = offroad.baseSink * massFactor * clearanceFactor * (1.0 + (isSlippingAxle ? 0.45 : 0));
          const rutWidth = baseTireWidth * (1.0 + Math.min(1.2, tireDepth) * 0.35);
          const rutAlpha = Math.min(0.95, Math.max(0.24, 0.32 + tireDepth * 0.42 + (isSlippingAxle ? 0.25 : 0)));
          const wetRut = isWetSurface || surf.type === 'mud';

          world.skidMarks.push({
            x1: prevX,
            y1: prevY,
            x2: currX,
            y2: currY,
            alpha: rutAlpha,
            color: offroad.grooveColor,
            width: rutWidth,
            depth: tireDepth,
            surfaceType: surf.type,
            isWet: wetRut,
            bermColor: offroad.bermColor,
            grooveColor: offroad.grooveColor
          });
        } else {
          // Asphalt or concrete: marks only appear on drift, power slip, or hard braking
          if (vehicle.isDrifting || isSlippingAxle || isHandbraking || isBurnoutHolding) {
            const markAlpha = Math.max(0.12, Math.min(0.72, (slipMagnitude / 65) + (isHandbraking ? 0.28 : 0) + (isSlippingAxle ? 0.32 : 0)));
            world.skidMarks.push({
              x1: prevX,
              y1: prevY,
              x2: currX,
              y2: currY,
              alpha: markAlpha,
              color: '#111827',
              width: baseTireWidth,
              depth: 0,
              surfaceType: 'asphalt',
              isWet: isWetSurface
            });
          }
        }
      };

      // Deposit tracks for rear tires
      depositTireTrack(leftRearX, leftRearY, tracker.rlX, tracker.rlY, false);
      if (!isSoloMoto) {
        depositTireTrack(rightRearX, rightRearY, tracker.rrX, tracker.rrY, false);
      }

      // Deposit tracks for front tires
      depositTireTrack(leftFrontX, leftFrontY, tracker.flX, tracker.flY, true);
      if (!isSoloMoto) {
        depositTireTrack(rightFrontX, rightFrontY, tracker.frX, tracker.frY, true);
      }

      // Update tracker
      tracker.rlX = leftRearX; tracker.rlY = leftRearY;
      tracker.rrX = rightRearX; tracker.rrY = rightRearY;
      tracker.flX = leftFrontX; tracker.flY = leftFrontY;
      tracker.frX = rightFrontX; tracker.frY = rightFrontY;
      tracker.lastRearX = newRearX; tracker.lastRearY = newRearY;
    }

    // 5. Stationary wheel churn: digging deep trenches when spinning wheels in place in mud/dirt
    if (Math.abs(vehicle.speed) < 3.0 && effectiveThrottle > 0.35 && (isFrontSlipping || isRearSlipping)) {
      tracker.churnTimer = (tracker.churnTimer || 0) + dt;
      if (tracker.churnTimer > 0.08) {
        tracker.churnTimer = 0;
        const churnAxle = (currX: number, currY: number) => {
          const surf = getSurfaceTypeAt(world, currX, currY);
          const offroad = getSurfaceOffroadProps(surf.type, isWetSurface, isStormWeather);
          if (offroad.isOffroad) {
            const digDepth = Math.min(1.4, offroad.baseSink * massFactor * clearanceFactor * 1.55);
            world.skidMarks.push({
              x1: currX - newHeadingCos * 2.5,
              y1: currY - newHeadingSin * 2.5,
              x2: currX + newHeadingCos * 2.5,
              y2: currY + newHeadingSin * 2.5,
              alpha: 0.90,
              color: offroad.grooveColor,
              width: baseTireWidth * 1.5,
              depth: digDepth,
              surfaceType: surf.type,
              isWet: isWetSurface || surf.type === 'mud',
              bermColor: offroad.bermColor,
              grooveColor: offroad.grooveColor
            });
          }
        };

        if (isRearSlipping) {
          churnAxle(leftRearX, leftRearY);
          if (!isSoloMoto) churnAxle(rightRearX, rightRearY);
        }
        if (isFrontSlipping) {
          churnAxle(leftFrontX, leftFrontY);
          if (!isSoloMoto) churnAxle(rightFrontX, rightFrontY);
        }
      }
    }

    // 6. Dynamic Particles: Dust clouds and Mud clods ejected from drive wheels ("пыль и комки грязи из под ведущих колёс в зависимости от ситуации")
    const has4WdActive = (vehicle.hasTransferCase && vehicle.transferCaseMode && vehicle.transferCaseMode !== '2H') || driveType === 'AWD';
    const isFrontDrive = driveType === 'FWD' || has4WdActive;
    const isRearDrive = driveType === 'RWD' || has4WdActive;

    // Wheel thrust kickback vector: in forward gear, wheels fling backward; in reverse, wheels fling forward
    const isReverseGear = eng ? (eng.currentGear === -1 || (eng.transmissionType === 'AUTO' && eng.autoGearMode === 'R')) : (throttle < -0.1 || vehicle.speed < -0.5);
    const kickDir = isReverseGear ? 1.0 : -1.0;
    const kickCos = Math.cos(vehicle.angle) * kickDir;
    const kickSin = Math.sin(vehicle.angle) * kickDir;
    const latCos = -Math.sin(vehicle.angle);
    const latSin = Math.cos(vehicle.angle);

    const drivePedal = Math.abs(throttle);
    const isNeutral = !isInGear;

    const emitDriveWheelParticles = (tireX: number, tireY: number, isFrontAxle: boolean) => {
      const isAxleDriven = isFrontAxle ? isFrontDrive : isRearDrive;
      // Power is ONLY delivered if engine is running, gear is NOT neutral, and axle is driven
      const isApplyingPower = isAxleDriven && !isNeutral && isEngineRunning && drivePedal > 0.05;
      const isAxleSlipping = (isFrontAxle ? isFrontSlipping : isRearSlipping) && !isNeutral && isEngineRunning;
      const isScrubbing = vehicle.isDrifting && slipMagnitude > 22.0;

      const surf = getSurfaceTypeAt(world, tireX, tireY);
      const isHardPavement = surf.type === 'asphalt' || surf.type === 'concrete' || surf.type === 'rock';
      const isWetOrMud = isWetSurface || surf.type === 'mud';

      // --- SITUATION WATER: RIVER, FORDS & DEEP PUDDLES (STRICTLY WATER SPLASHES, ZERO DUST!) ---
      const tireRiver = getRiverWaterAt(tireX, tireY);
      const tireWaterDepth = (tireRiver.inWater && !tireRiver.isBridge) ? tireRiver.depth : (surf.type === 'water' ? (vehicle.waterDepth || 0.15) : 0);
      const isTireInWater = tireWaterDepth > 0.03 || surf.type === 'water';

      if (isTireInWater) {
        const waterIntensity = Math.min(1.0, (drivePedal * 0.75 + (isAxleSlipping ? 0.7 : 0) + vSpeedKmh * 0.03));
        if (waterIntensity > 0.05 && Math.random() < 0.70) {
          const flingSpeed = (40 + drivePedal * 95 + (isAxleSlipping ? 75 : 0) + vSpeedKmh * 0.85) * (0.8 + Math.random() * 0.4);
          
          // Ejected water spray plume
          world.particles.push({
            x: tireX + (Math.random() * 6 - 3),
            y: tireY + (Math.random() * 6 - 3),
            vx: kickCos * flingSpeed + latCos * (Math.random() - 0.5) * 35,
            vy: kickSin * flingSpeed + latSin * (Math.random() - 0.5) * 35,
            radius: 1.8 + Math.random() * 2.4,
            color: Math.random() > 0.35 ? '#bae6fd' : '#e0f2fe',
            alpha: 0.80,
            initialAlpha: 0.80,
            life: 0,
            maxLife: 0.32 + Math.random() * 0.20,
            type: 'water_spray',
            underVehicle: false
          });

          // Sidewall water splash crest
          world.particles.push({
            x: tireX + latCos * (Math.random() * 8 - 4),
            y: tireY + latSin * (Math.random() * 8 - 4),
            vx: latCos * (Math.random() - 0.5) * (45 + vSpeedKmh * 0.7),
            vy: latSin * (Math.random() - 0.5) * (45 + vSpeedKmh * 0.7),
            radius: 2.2 + Math.random() * 2.8,
            color: '#f0f9ff',
            alpha: 0.75,
            initialAlpha: 0.75,
            life: 0,
            maxLife: 0.28 + Math.random() * 0.18,
            type: 'water_splash',
            underVehicle: false
          });
        }
        return; // ABSOLUTELY PREVENT falling through into dust or soil logic!
      }

      // --- SITUATION A: ASPHALT & HARD PAVEMENT ---
      // ABSOLUTELY NEVER spawn mud clods or dirt on hard paved roads!
      if (isHardPavement) {
        if (isAxleSlipping || (isScrubbing && vSpeedKmh > 18.0) || isBurnoutHolding) {
          if (Math.random() < 0.45) {
            world.particles.push({
              x: tireX + (Math.random() * 6 - 3),
              y: tireY + (Math.random() * 6 - 3),
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              radius: 4.0 + Math.random() * 5.5,
              color: '#e2e8f0',
              alpha: 0.40,
              initialAlpha: 0.40,
              life: 0,
              maxLife: 0.45 + Math.random() * 0.25,
              type: 'tire_smoke',
              underVehicle: false
            });
          }
        } else if (isWetSurface && (vSpeedKmh > 32.0 || isAxleSlipping)) {
          if (Math.random() < 0.35) {
            world.particles.push({
              x: tireX + (Math.random() * 6 - 3),
              y: tireY + (Math.random() * 6 - 3),
              vx: kickCos * 40 + (Math.random() - 0.5) * 25,
              vy: kickSin * 40 + (Math.random() - 0.5) * 25,
              radius: 1.8 + Math.random() * 2.2,
              color: '#bae6fd',
              alpha: 0.55,
              initialAlpha: 0.55,
              life: 0,
              maxLife: 0.25 + Math.random() * 0.15,
              type: 'water_spray',
              underVehicle: false
            });
          }
        }
        return;
      }

      // --- SITUATION B: UNPAVED TERRAIN (грунтовка, грязь, трава, поле, песок, гравий) ---
      // If vehicle is in neutral or engine off: wheels have NO drive torque!
      // Revving in neutral produces ZERO mud or wheel spin.
      if (isNeutral || !isEngineRunning) {
        // Only passive rolling dust if rolling fast (> 28 km/h) down a slope
        if (vSpeedKmh > 28.0 && Math.random() < 0.20) {
          world.particles.push({
            x: tireX + (Math.random() * 6 - 3),
            y: tireY + (Math.random() * 6 - 3),
            vx: kickCos * 12 + (Math.random() - 0.5) * 12,
            vy: kickSin * 12 + (Math.random() - 0.5) * 12,
            radius: 5.0 + Math.random() * 3.0,
            targetRadius: 18.0 + Math.random() * 10.0,
            color: '#a07b53',
            alpha: 0.45,
            initialAlpha: 0.45,
            life: 0,
            maxLife: 0.8 + Math.random() * 0.4,
            type: 'dust',
            underVehicle: false
          });
        }
        return;
      }

      // 1. MUD & SOIL CLODS (комья земли и грязи из-под ведущих колес)
      const isUnderTorque = isApplyingPower || isAxleSlipping;
      const clodProb = isAxleSlipping ? 0.75 : (isApplyingPower ? 0.48 : (vSpeedKmh > 16.0 ? 0.22 : 0.0));

      if (isUnderTorque && Math.random() < clodProb) {
        const flingSpeed = (45 + drivePedal * 115 + (isAxleSlipping ? 85 : 0) + vSpeedKmh * 0.6) * (0.85 + Math.random() * 0.35);
        const pVx = kickCos * flingSpeed + latCos * (Math.random() - 0.5) * 26;
        const pVy = kickSin * flingSpeed + latSin * (Math.random() - 0.5) * 26;

        // Choose soil/mud color based on wetness and terrain
        let chosenColor: string;
        if (isWetOrMud) {
          const wetMudColors = ['#150a04', '#1f1006', '#2a1508', '#140802', '#231107'];
          chosenColor = wetMudColors[Math.floor(Math.random() * wetMudColors.length)];
        } else if (surf.type === 'sand') {
          const sandColors = ['#9c723f', '#b3854c', '#7d592e', '#c4995c'];
          chosenColor = sandColors[Math.floor(Math.random() * sandColors.length)];
        } else {
          // Dry dirt road, plowed field, meadow loam, chernozen
          const earthColors = ['#281609', '#381e0c', '#482710', '#1c0d04', '#331a0b', '#251307'];
          chosenColor = earthColors[Math.floor(Math.random() * earthColors.length)];
        }

        // Heavy chunks vs medium clods vs fine soil granules
        const randSize = Math.random();
        let clodRadius: number;
        let initVz: number;
        if (randSize < 0.25) {
          // Large heavy clay/turf chunk
          clodRadius = 3.6 + Math.random() * 2.8;
          initVz = 35 + Math.random() * 40 + drivePedal * 20;
        } else if (randSize < 0.70) {
          // Medium soil clump
          clodRadius = 2.4 + Math.random() * 1.5;
          initVz = 45 + Math.random() * 50 + drivePedal * 25;
        } else {
          // Fine flying earth pebble/granule
          clodRadius = 1.4 + Math.random() * 1.0;
          initVz = 55 + Math.random() * 60 + drivePedal * 30;
        }

        // Spawn at the tire tread ejection exit point
        const spawnX = tireX + kickCos * (6 + Math.random() * 6) + latCos * (Math.random() * 6 - 3);
        const spawnY = tireY + kickSin * (6 + Math.random() * 6) + latSin * (Math.random() * 6 - 3);

        world.particles.push({
          x: spawnX,
          y: spawnY,
          vx: pVx,
          vy: pVy,
          radius: clodRadius,
          color: chosenColor,
          alpha: 0.95,
          initialAlpha: 0.95,
          life: 0,
          maxLife: 1.2 + Math.random() * 0.8, // Remains as a ground splat after landing
          type: 'mud_clod',
          underVehicle: false,
          z: 1.0 + Math.random() * 1.5,
          vz: initVz,
          splatted: false,
          shapeSeed: Math.floor(Math.random() * 1000)
        });

        // In wet mud conditions, also fling dirty liquid water droplets
        if (isWetOrMud && (drivePedal > 0.15 || isAxleSlipping)) {
          world.particles.push({
            x: spawnX,
            y: spawnY,
            vx: kickCos * (flingSpeed * 1.05) + latCos * (Math.random() - 0.5) * 24,
            vy: kickSin * (flingSpeed * 1.05) + latSin * (Math.random() - 0.5) * 24,
            radius: 1.5 + Math.random() * 1.8,
            color: Math.random() > 0.5 ? '#3b2212' : '#4a2c17',
            alpha: 0.65,
            initialAlpha: 0.65,
            life: 0,
            maxLife: 0.28 + Math.random() * 0.18,
            type: 'water_spray',
            underVehicle: false
          });
        }
      }

      // 2. ATMOSPHERIC DUST CLOUDS (густая клубящаяся пыль на сухом грунте)
      if (!isWetOrMud) {
        const dustProb = isAxleSlipping ? 0.85 : (isApplyingPower ? 0.60 : (vSpeedKmh > 12.0 ? 0.38 : 0.0));
        if (Math.random() < dustProb) {
          const dustSpeed = 16 + drivePedal * 40 + vSpeedKmh * 0.25;
          const pVx = kickCos * dustSpeed + latCos * (Math.random() - 0.5) * 16;
          const pVy = kickSin * dustSpeed + latSin * (Math.random() - 0.5) * 16;

          let dustColor = '#a07b53'; // warm dirt brown
          if (surf.type === 'sand') {
            dustColor = Math.random() > 0.5 ? '#caa062' : '#d8b277';
          } else if (surf.type === 'gravel_road') {
            dustColor = Math.random() > 0.5 ? '#aba398' : '#beb7ad';
          } else if (surf.type === 'grass') {
            dustColor = Math.random() > 0.5 ? '#8a9463' : '#9ca871';
          }

          world.particles.push({
            x: tireX + kickCos * 4 + latCos * (Math.random() * 6 - 3),
            y: tireY + kickSin * 4 + latSin * (Math.random() * 6 - 3),
            vx: pVx,
            vy: pVy,
            radius: 6.5 + Math.random() * 4.0,
            targetRadius: 26.0 + Math.random() * 16.0,
            color: dustColor,
            alpha: 0.75,
            initialAlpha: 0.75,
            life: 0,
            maxLife: 1.2 + Math.random() * 0.7,
            type: 'dust',
            underVehicle: false
          });
        }
      }
    };

    // Emit drive wheel particles
    emitDriveWheelParticles(leftRearX, leftRearY, false);
    if (!isSoloMoto) {
      emitDriveWheelParticles(rightRearX, rightRearY, false);
    }
    emitDriveWheelParticles(leftFrontX, leftFrontY, true);
    if (!isSoloMoto) {
      emitDriveWheelParticles(rightFrontX, rightFrontY, true);
    }

    if (eng && eng.engineRunning) {
      const rpmRatio = (eng.engineRPM || 800) / 6000;
      sound.updateEngine(rpmRatio, input.forward);
    } else {
      sound.stopEngine();
    }

    // Update breakdown procedural Web Audio API sounds for player vehicle
    sound.updateEngineKnocking(
      eng ? (eng.engineKnocking || (fuel ? fuel.detonation : false) || eng.oilLevel < 15) && eng.engineRunning : false,
      eng ? eng.engineRPM : 1000,
      dt
    );

    sound.updateOverheatingSteam(
      eng ? (eng.overheatingSteam && !world.cleanMode) : false,
      eng ? (eng.temperature - 100) / 35 : 0
    );

    sound.updateWheelRubScrape(
      vehicle.damage ? vehicle.damage.wheelRubResistance : 0,
      vehicle.speed
    );

    sound.updateEngineFireSound(
      vehicle.damage ? (!!vehicle.damage.engineFire || !!vehicle.damage.fuelTankFire || !!vehicle.damage.cabinFire) : false
    );

  } else {
    // --- NPC AI VEHICLE OR PARKED CAR PHYSICS ---
    if (vehicle.isParked) {
      vehicle.vx = 0;
      vehicle.vy = 0;
      vehicle.speed = 0;
      vehicle.angularVelocity = 0;
      vehicle.steerAngle = 0;
      return;
    }

    if (vehicle.spinoutTimer && vehicle.spinoutTimer > 0) {
      // NPC vehicle in post-collision uncontrolled ballistic spinout & slide
      vehicle.spinoutTimer -= dt;
      vehicle.aiState = 'spinout';

      // Realistic angular rotation from yaw momentum
      vehicle.angle += (vehicle.angularVelocity || 0) * dt;
      vehicle.angle = ((vehicle.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

      // Tire yaw grip scrubbing rotational speed on asphalt
      vehicle.angularVelocity = (vehicle.angularVelocity || 0) * Math.max(0, 1.0 - 2.0 * dt);

      // Coulomb tire sliding friction scrubbing linear momentum
      const curSpeed = Math.hypot(vehicle.vx, vehicle.vy);
      if (curSpeed > 1.2) {
        const tireFrictionDecel = 150 * dt; // px/s^2 tire friction drag
        const newSpeed = Math.max(0, curSpeed - tireFrictionDecel);
        const speedRatio = newSpeed / curSpeed;
        vehicle.vx *= speedRatio;
        vehicle.vy *= speedRatio;
        vehicle.speed = newSpeed;

        // Produce tire marks & smoke while spinning out at high speed
        if (curSpeed > 28 && world.skidMarks && Math.random() < 0.55) {
          world.skidMarks.push({
            x1: vehicle.x,
            y1: vehicle.y,
            x2: vehicle.x + vehicle.vx * dt * 2.5,
            y2: vehicle.y + vehicle.vy * dt * 2.5,
            alpha: Math.min(0.65, curSpeed / 130),
            color: '#111827',
            width: 14,
            depth: 0,
            surfaceType: 'asphalt',
            isWet: false
          });
        }
      } else {
        vehicle.vx = 0;
        vehicle.vy = 0;
        vehicle.speed = 0;
        vehicle.angularVelocity = 0;
        vehicle.spinoutTimer = 0;
      }
    } else {
      if (!vehicle.isPlayerControlled && isVehicleDisabledOrCrashed(vehicle)) {
        vehicle.targetSpeed = 0;
        vehicle.idmAcceleration = 0;
        if (Math.abs(vehicle.speed) < 1.0) {
          vehicle.speed = 0;
        }
        if (vehicle.speed === 0) {
          vehicle.angularVelocity = 0;
          vehicle.steerAngle = 0;
          vehicle.vx = 0;
          vehicle.vy = 0;
        }
        vehicle.aiState = 'stopping_obstacle';
      }

      // Smooth, gentle acceleration and polite braking for AI
      const speedScaleFactor = SPEED_KMH_TO_PX_S / 2.7778; // 1.6
      const accelRate = 90 * speedScaleFactor; // px/s^2 (no rapid jerking or shoving)
      const brakeRate = 180 * speedScaleFactor; // px/s^2

      if (vehicle.stunnedTimer && vehicle.stunnedTimer > 0) {
        // AI is temporarily stunned/recoiling from severe impact momentum
        vehicle.speed = Math.hypot(vehicle.vx, vehicle.vy) * Math.sign(vehicle.speed || 1);
      } else if (vehicle.aiState === 'reversing') {
        // Smoothly reverse
        if (vehicle.speed > vehicle.targetSpeed) {
          vehicle.speed = Math.max(vehicle.targetSpeed, vehicle.speed - accelRate * 1.2 * dt);
        } else {
          vehicle.speed = Math.min(vehicle.targetSpeed, vehicle.speed + accelRate * dt);
        }
        vehicle.brakeLightsOn = false;
        vehicle.isReversing = true;
      } else {
        vehicle.isReversing = vehicle.speed * PX_S_TO_SPEED_KMH < -0.7;
        if (vehicle.idmAcceleration !== undefined) {
          // IDM Controlled speed and brake lights
          vehicle.speed = Math.max(0, vehicle.speed + vehicle.idmAcceleration * dt);
          vehicle.brakeLightsOn = vehicle.idmAcceleration < -20 * speedScaleFactor || vehicle.speed * PX_S_TO_SPEED_KMH < 1.4;
        } else {
          if (vehicle.speed < vehicle.targetSpeed) {
            vehicle.speed = Math.min(vehicle.targetSpeed, vehicle.speed + accelRate * dt);
            vehicle.brakeLightsOn = false;
          } else if (vehicle.speed > vehicle.targetSpeed) {
            vehicle.speed = Math.max(vehicle.targetSpeed, vehicle.speed - brakeRate * dt);
            vehicle.brakeLightsOn = ((vehicle.speed - vehicle.targetSpeed) * PX_S_TO_SPEED_KMH > 3.6) || (vehicle.targetSpeed * PX_S_TO_SPEED_KMH < 1.8);
          } else {
            vehicle.brakeLightsOn = false;
          }
        }
      }

      // Kinematic velocity aligned with vehicle heading and rear-axle pivot rotation
      const { rearAxleDist: npcRearAxleDist } = getVehicleAxleGeometry(vehicle);
      const cosA = Math.cos(vehicle.angle);
      const sinA = Math.sin(vehicle.angle);
      let yawRate = vehicle.angularVelocity || 0;
      if (Math.abs(vehicle.speed) < 0.5) {
        yawRate = 0;
        vehicle.angularVelocity = 0;
        vehicle.steerAngle = 0;
      }
      vehicle.vx = cosA * vehicle.speed - sinA * (yawRate * npcRearAxleDist);
      vehicle.vy = sinA * vehicle.speed + cosA * (yawRate * npcRearAxleDist);

      if (Math.abs(vehicle.speed) < 0.1 && yawRate === 0 && (!vehicle.knockbackVx || Math.abs(vehicle.knockbackVx) < 0.1) && (!vehicle.knockbackVy || Math.abs(vehicle.knockbackVy) < 0.1)) {
        vehicle.vx = 0;
        vehicle.vy = 0;
      }
    }
  }

  // --- PROGRESSIVE MULTI-FRAME CRUMPLE ZONE CUSHIONING & DECELERATION ---
  if (vehicle.activeCrumple && vehicle.activeCrumple.timer > 0) {
    const c = vehicle.activeCrumple;
    c.timer = Math.max(0, c.timer - dt);
    const progress = 1 - c.timer / c.totalDuration; // 0.0 to 1.0

    // For head-on rigid obstacles, compress forward speed.
    // For vehicle-to-vehicle or glancing collisions (preserveVelocity=true), velocity is already physically computed by 2D impulse!
    if (!c.preserveVelocity) {
      // Smooth softbody deceleration curve:
      // Phase 1 (0.0 to 0.72): Progressive plastic compression & kinetic energy absorption
      // Phase 2 (0.72 to 1.0): Gentle elastic rebound as chassis springs back
      if (progress < 0.72) {
        const compressProgress = progress / 0.72;
        // Cosine easing creates gradual entry, peak resistance at max penetration, then zero speed
        const decel = Math.cos(compressProgress * Math.PI * 0.5);
        vehicle.speed = c.initialSpeed * decel;
      } else {
        const reboundProgress = (progress - 0.72) / 0.28;
        vehicle.speed = c.reboundSpeed * Math.sin(reboundProgress * Math.PI * 0.5);
      }
      vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
      vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;
    }

    // Continuous collision sparks along contact point while metal crumples over multiple frames
    if (Math.abs(c.initialSpeed) > 35 && Math.random() < 0.60) {
      const spkAngle = Math.atan2(c.normalY, c.normalX) + (Math.random() - 0.5) * 1.6;
      const spkSpeed = 25 + Math.random() * 65;
      world.particles.push({
        x: c.contactX + (Math.random() - 0.5) * 8,
        y: c.contactY + (Math.random() - 0.5) * 8,
        vx: Math.cos(spkAngle) * spkSpeed,
        vy: Math.sin(spkAngle) * spkSpeed,
        radius: 1.5 + Math.random() * 2,
        color: Math.random() > 0.35 ? '#f59e0b': '#ef4444',
        alpha: 0.95,
        life: 0,
        maxLife: 0.12 + Math.random() * 0.12,
        type: 'spark'});
    }

    if (c.timer <= 0) {
      vehicle.activeCrumple = undefined;
    }
  }

  // Update position with combined engine velocity and physical knockback momentum
  const totalVx = vehicle.vx + (vehicle.knockbackVx || 0);
  const totalVy = vehicle.vy + (vehicle.knockbackVy || 0);
  vehicle.x += totalVx * dt;
  vehicle.y += totalVy * dt;

  // Smooth exponential decay of physics knockback & spin recoil (Cushioned tire friction dampening)
  if (vehicle.knockbackVx || vehicle.knockbackVy || vehicle.knockbackSpin) {
    const kDecay = Math.pow(0.008, dt);
    vehicle.knockbackVx = (vehicle.knockbackVx || 0) * kDecay;
    vehicle.knockbackVy = (vehicle.knockbackVy || 0) * kDecay;
    vehicle.knockbackSpin = (vehicle.knockbackSpin || 0) * Math.pow(0.015, dt);
    
    vehicle.angle += (vehicle.knockbackSpin || 0) * dt;

    if (Math.abs(vehicle.knockbackVx) < 0.1) vehicle.knockbackVx = 0;
    if (Math.abs(vehicle.knockbackVy) < 0.1) vehicle.knockbackVy = 0;
    if (Math.abs(vehicle.knockbackSpin) < 0.01) vehicle.knockbackSpin = 0;
  }
  if (vehicle.stunnedTimer && vehicle.stunnedTimer > 0) {
    vehicle.stunnedTimer -= dt;
    if (vehicle.stunnedTimer <= 0) vehicle.stunnedTimer = 0;
  }

  // --- WATER IMMERSION, HYDRODYNAMIC DRAG & REALISTIC HYDROLOCK (ГИДРОУДАР) ---
  const centerWaterDepth = getUniversalWaterDepthAt(world, vehicle.x, vehicle.y);
  vehicle.waterDepth = centerWaterDepth;

  const vCos = Math.cos(vehicle.angle);
  const vSin = Math.sin(vehicle.angle);

  // Calculate vehicle mass, ground clearance, and intake architecture
  const vType = vehicle.type as string;
  const vMass = (vehicle as any).mass || (cfg.mass || 1400);

  let intakeHeight = 0.65; // Default passenger car air intake (~65 cm)
  let intakeOffsetDist = (cfg.length || 45) * 0.35;
  let groundClearance = 0.18; // 18 cm ground clearance for sedans
  let isHeavyCommercial = false;

  if (['sports', 'supercar', 'coupe_gt', 'moto_sport', 'micro_car', 'moped_soviet', 'scooter'].includes(vType)) {
    intakeHeight = 0.52;
    groundClearance = 0.13;
  } else if (['hatchback', 'cabrio', 'hatch_hot'].includes(vType)) {
    intakeHeight = 0.60;
    groundClearance = 0.16;
  } else if (['station_wagon', 'sedan_classic', 'muscle', 'muscle_classic', 'limousine'].includes(vType)) {
    intakeHeight = 0.68;
    groundClearance = 0.18;
  } else if (['suv', 'suv_luxury', 'pickup', 'pickup_dually', 'pickup_heavy', 'offroad_hardcore'].includes(vType)) {
    intakeHeight = 2.15; // Snorkel / raised A-pillar intake (2.15m)
    intakeOffsetDist = 0;
    groundClearance = 0.38;
  } else if (['van', 'ambulance', 'bus', 'bus_minibus', 'van_camper'].includes(vType)) {
    intakeHeight = 1.55;
    intakeOffsetDist = (cfg.length || 45) * 0.25;
    groundClearance = 0.26;
  } else if ([
    'truck_dump', 'truck_semi', 'truck_box', 'truck_tanker', 'truck_water',
    'truck_flatbed', 'truck_covered', 'truck_tow', 'truck_armored',
    'cement_mixer', 'garbage_truck', 'delivery_truck', 'firetruck',
    'fire_engine', 'fire_ladder', 'fire_rescue'
  ].includes(vType)) {
    // Cabover and Heavy Trucks: High vertical air intake stack behind the cab near roof level!
    intakeHeight = 2.75;
    intakeOffsetDist = -(cfg.length || 45) * 0.15;
    groundClearance = 0.85; // Massive commercial tires & high axle clearance
    isHeavyCommercial = true;
  } else if (vType === 'tractor') {
    intakeHeight = 2.45;
    intakeOffsetDist = (cfg.length || 45) * 0.10;
    groundClearance = 0.70;
    isHeavyCommercial = true;
  }

  // Air intake sampling coordinates
  const frontIntakeX = vehicle.x + vCos * intakeOffsetDist;
  const frontIntakeY = vehicle.y + vSin * intakeOffsetDist;
  const rawFrontWaterDepth = getUniversalWaterDepthAt(world, frontIntakeX, frontIntakeY);
  
  // Dynamic bow wave elevation (water climbs up front grille when driving into water at speed)
  const speedAbs = Math.abs(vehicle.speed);
  const dynamicBowWave = Math.min(0.35, (speedAbs * 0.05) ** 2 * 1.2);
  const frontWaterDepth = rawFrontWaterDepth + dynamicBowWave;
  vehicle.frontWaterDepth = frontWaterDepth;

  // Progressive Hydrolock & Water Ingestion Physics
  const eng = vehicle.engineState;
  if (eng) {
    const isIntakeInWaterZone = frontWaterDepth >= (intakeHeight - 0.15);

    if (isIntakeInWaterZone && eng.engineRunning && !eng.hydrolocked) {
      // Ingestion rate scales with depth over intake threshold and throttle
      const ingestionSeverity = Math.max(0.1, frontWaterDepth - (intakeHeight - 0.15));
      const waterIngestRate = (ingestionSeverity * 45.0 + (vehicle.speed > 20 ? 30.0 : 10.0));
      eng.waterInCylinders = Math.min(100, (eng.waterInCylinders || 0) + waterIngestRate * dt);

      // 1. Choking / Sputtering Phase (5% to 90% water in cylinders)
      if (eng.waterInCylinders >= 10 && eng.waterInCylinders < 95) {
        eng.engineKnocking = true;
        // Engine misfire and sudden loss of combustion torque
        if (Math.random() < 0.40) {
          eng.engineRPM = Math.max(300, (eng.engineRPM || 800) * 0.75);
        }

        // Exhaust / hood sputtering steam & water mist
        if (world && world.particles && Math.random() < 0.50) {
          world.particles.push({
            x: frontIntakeX + (Math.random() * 14 - 7),
            y: frontIntakeY + (Math.random() * 14 - 7),
            vx: (Math.random() - 0.5) * 20,
            vy: -15 - Math.random() * 20,
            radius: 2.0 + Math.random() * 2.5,
            color: '#e2e8f0',
            alpha: 0.70,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.20,
            type: 'water_spray'
          });
        }

        if (player && (player.currentVehicleId === vehicle.id || (player as any).vehicleId === vehicle.id)) {
          if (!player.notifications || !player.notifications.some(n => n.id.startsWith('water_choke'))) {
            if (!player.notifications) player.notifications = [];
            player.notifications.push({
              id: 'water_choke_' + Date.now(),
              text: 'Внимание! Вода захлестывает воздухозаборник — двигатель захлебывается и троит!',
              color: '#f59e0b',
              timer: 2.5
            });
          }
        }
      }

      // 2. Definitive Hydrolock Phase (>= 95% water in cylinders)
      if (eng.waterInCylinders >= 95) {
        eng.hydrolocked = true;
        eng.waterInCylinders = 100;
        eng.engineRunning = false;
        eng.isStalled = true;
        eng.engineStalled = true;
        eng.isSeized = true;
        eng.engineRPM = 0;
        eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 50);
        eng.overheatingSteam = true;

        sound.playCollision(0.85);

        // Burst of bubbling steam particles under hood
        if (world && world.particles) {
          for (let p = 0; p < 16; p++) {
            world.particles.push({
              x: frontIntakeX + (Math.random() * 20 - 10),
              y: frontIntakeY + (Math.random() * 20 - 10),
              vx: (Math.random() * 30 - 15),
              vy: -20 - Math.random() * 30,
              radius: 2.2 + Math.random() * 3.5,
              color: '#cbd5e1',
              alpha: 0.8,
              life: 0,
              maxLife: 0.45 + Math.random() * 0.35,
              type: 'water_spray'
            });
          }
        }

        if (player && (player.currentVehicleId === vehicle.id || (player as any).vehicleId === vehicle.id)) {
          if (!player.notifications) player.notifications = [];
          player.notifications.push({
            id: 'hydrolock_' + Date.now(),
            text: 'ГИДРОУДАР! Вода заполнила цилиндры — поршни уперлись в несжимаемую жидкость, коленвал заклинило!',
            color: '#ef4444',
            timer: 5.0
          });
        }
      }
    } else if (!eng.engineRunning && !eng.hydrolocked && frontWaterDepth > intakeHeight + 0.12) {
      // Submerged stationary vehicle: water seeps into cylinders gradually
      eng.waterInCylinders = Math.min(100, (eng.waterInCylinders || 0) + dt * 25);
      if (eng.waterInCylinders >= 70) {
        eng.hydrolocked = true;
        eng.isSeized = true;
      }
    }
  }

  // Fluid immersion dynamics: Drag, Buoyancy & River Current Drift
  if (centerWaterDepth > 0.05) {
    // 1. Hydrodynamic Drag (Smooth progressive fluid drag proportional to depth and speed)
    const submergedFraction = isHeavyCommercial
      ? Math.min(1.0, Math.max(0, (centerWaterDepth - groundClearance) / 1.8))
      : Math.min(1.0, Math.max(0, (centerWaterDepth - groundClearance) / 1.0));
    vehicle.submergedFraction = submergedFraction;

    const hydroDrag = (submergedFraction * 75 + centerWaterDepth * 35) * (1 + speedAbs * 0.035) * dt;
    if (vehicle.speed > 0) vehicle.speed = Math.max(0, vehicle.speed - hydroDrag);
    else if (vehicle.speed < 0) vehicle.speed = Math.min(0, vehicle.speed + hydroDrag);

    // 2. Realistic Buoyancy & Tire Contact Normal Force
    // Heavy commercial trucks (6-18 tons) need 2.2m+ of water to float, firmly gripping fords!
    const floatDepthThreshold = isHeavyCommercial ? 2.35 : (groundClearance + 0.85);
    const isFloating = centerWaterDepth >= floatDepthThreshold;
    vehicle.isFloating = isFloating;

    const buoyantFraction = Math.min(1.0, centerWaterDepth / floatDepthThreshold);
    const tireNormalForceRatio = Math.max(0, 1.0 - buoyantFraction);

    if (isFloating) {
      // Floating vehicle has reduced forward speed damping and high slide
      vehicle.speed *= Math.pow(0.92, dt * 60);
    }

    // 3. River Current Drift & Hydrodynamic Alignment
    const river = getRiverWaterAt(vehicle.x, vehicle.y);
    if (river.inWater && !river.isBridge) {
      // Heavy trucks with firm tire contact (tireNormalForceRatio ~ 0.8-1.0) resist current!
      const currentDriftPush = isFloating
        ? 1.0
        : Math.max(0.04, (1.0 - tireNormalForceRatio) * 0.85 + (isHeavyCommercial ? 0.04 : 0.15) * Math.min(1.0, centerWaterDepth * 0.4));
      
      vehicle.x += river.currentVx * currentDriftPush * dt;
      vehicle.y += river.currentVy * currentDriftPush * dt;

      // When floating, current exerts torque aligning vehicle longitudinally with river flow
      if (isFloating) {
        const riverAngle = Math.atan2(river.currentVy, river.currentVx);
        let angleDiff = riverAngle - vehicle.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        vehicle.angle += angleDiff * 0.85 * dt;
      }
    }

    // 4. Hull Water Splash & Bow Wave Particles
    if (speedAbs > 12 && world && world.particles && Math.random() < 0.50) {
      const halfW = (cfg.width || 24) * 0.5;
      const perpX = -vSin;
      const perpY = vCos;
      world.particles.push({
        x: vehicle.x + perpX * halfW + (Math.random() * 8 - 4),
        y: vehicle.y + perpY * halfW + (Math.random() * 8 - 4),
        vx: perpX * (22 + Math.random() * 25) - vCos * (vehicle.speed * 0.18),
        vy: perpY * (22 + Math.random() * 25) - vSin * (vehicle.speed * 0.18),
        radius: 2.0 + Math.random() * 2.5,
        color: '#bae6fd',
        alpha: 0.75,
        life: 0,
        maxLife: 0.32 + Math.random() * 0.20,
        type: 'water_spray'
      });
      world.particles.push({
        x: vehicle.x - perpX * halfW + (Math.random() * 8 - 4),
        y: vehicle.y - perpY * halfW + (Math.random() * 8 - 4),
        vx: -perpX * (22 + Math.random() * 25) - vCos * (vehicle.speed * 0.18),
        vy: -perpY * (22 + Math.random() * 25) - vSin * (vehicle.speed * 0.18),
        radius: 2.0 + Math.random() * 2.5,
        color: '#bae6fd',
        alpha: 0.75,
        life: 0,
        maxLife: 0.32 + Math.random() * 0.20,
        type: 'water_spray'
      });
    }
  } else {
    vehicle.isFloating = false;
    vehicle.submergedFraction = 0;
  }

  // --- VEHICLE-TO-VEHICLE COLLISION RESOLUTION ---
  for (const other of nearbyVehicles) {
    if (other.id === vehicle.id) continue;
// Towing vehicle and hitched trailer must never collide with each other!
    if (vehicle.trailerId === other.id || vehicle.towedById === other.id || other.trailerId === vehicle.id || other.towedById === vehicle.id) {
      continue;
    }

    // Allow semi-trucks to back under semi-trailers (ignore collisions if both are unhitched)
    if ((vehicle.type === 'truck_semi' && other.type.startsWith('trailer_semi')) || 
        (vehicle.type.startsWith('trailer_semi') && other.type === 'truck_semi')) {
      const truck = vehicle.type === 'truck_semi' ? vehicle : other;
      const trailer = vehicle.type.startsWith('trailer_semi') ? vehicle : other;
      if (!truck.trailerId && !trailer.towedById) {
        continue;
      }
    }

    const isPlayerInvolved = vehicle.isPlayerControlled || other.isPlayerControlled ||
      (player && player.isInVehicle && (player.currentVehicleId === vehicle.id || player.currentVehicleId === other.id)) ||
      (vehicle.spinoutTimer !== undefined && vehicle.spinoutTimer > 0) ||
      (other.spinoutTimer !== undefined && other.spinoutTimer > 0);
    
    // If AI-to-AI and either car is in anti-deadlock ghosting mode, allow smooth glide-through
    if (!isPlayerInvolved) {
      if ((vehicle.ghostingAlpha !== undefined && vehicle.ghostingAlpha < 0.9) ||
          (other.ghostingAlpha !== undefined && other.ghostingAlpha < 0.9)) {
        continue;
      }
    }

    const col = checkVehicleVehicleCollision(vehicle, other);
    if (col.collided) {
      // Calculate mass-based separation
      const totalMass = vehicle.mass + other.mass;
      const ratioSelf = other.mass / totalMass;
      const ratioOther = vehicle.mass / totalMass;

      if (isPlayerInvolved) {
        // Player or spinout-involved: full rigid body momentum, metal friction, torque and angular impulse
        const sepFactor = Math.min(col.overlap, 4.0 + col.overlap * 0.4);
        vehicle.x -= col.normalX * sepFactor * ratioSelf;
        vehicle.y -= col.normalY * sepFactor * ratioSelf;
        other.x += col.normalX * sepFactor * ratioOther;
        other.y += col.normalY * sepFactor * ratioOther;

        // Contact point vectors from vehicle centers
        const rX_vehicle = col.contactX - vehicle.x;
        const rY_vehicle = col.contactY - vehicle.y;
        const rX_other = col.contactX - other.x;
        const rY_other = col.contactY - other.y;

        const w1 = vehicle.angularVelocity || 0;
        const w2 = other.angularVelocity || 0;

        // Linear velocity at contact points: v_contact = v + w x r (2D: vx - w*ry, vy + w*rx)
        const vp1x = vehicle.vx - w1 * rY_vehicle;
        const vp1y = vehicle.vy + w1 * rX_vehicle;

        const vp2x = other.vx - w2 * rY_other;
        const vp2y = other.vy + w2 * rX_other;

        const relVx = vp2x - vp1x;
        const relVy = vp2y - vp1y;
        const velAlongNormal = relVx * col.normalX + relVy * col.normalY;

        if (velAlongNormal < 0) {
          const impactSpeed = Math.abs(velAlongNormal);

          const I_yaw_vehicle = vehicle.mass * (vehicle.width * vehicle.width + vehicle.length * vehicle.length) / 12;
          const I_yaw_other = other.mass * (other.width * other.width + other.length * other.length) / 12;

          const invMass1 = 1 / vehicle.mass;
          const invMass2 = 1 / other.mass;

          // Cross products: r x n (rx * ny - ry * nx)
          const r1CrossN = rX_vehicle * col.normalY - rY_vehicle * col.normalX;
          const r2CrossN = rX_other * col.normalY - rY_other * col.normalX;

          const invMassN = invMass1 + invMass2 + (r1CrossN * r1CrossN) / I_yaw_vehicle + (r2CrossN * r2CrossN) / I_yaw_other;

          // High-speed impact restitution (mostly plastic crumple)
          const restitution = Math.max(0.06, 0.20 - Math.min(0.14, impactSpeed / 300));
          const impulseNormalMag = -(1 + restitution) * velAlongNormal / invMassN;

          // Tangential friction (Coulomb tearing/scraping friction of sheet metal)
          const vNormalX = velAlongNormal * col.normalX;
          const vNormalY = velAlongNormal * col.normalY;
          const vTanX = relVx - vNormalX;
          const vTanY = relVy - vNormalY;
          const vTanSpeed = Math.hypot(vTanX, vTanY);

          let impulseTanX = 0;
          let impulseTanY = 0;

          if (vTanSpeed > 0.5) {
            const tX = vTanX / vTanSpeed;
            const tY = vTanY / vTanSpeed;

            const r1CrossT = rX_vehicle * tY - rY_vehicle * tX;
            const r2CrossT = rX_other * tY - rY_other * tX;

            const invMassT = invMass1 + invMass2 + (r1CrossT * r1CrossT) / I_yaw_vehicle + (r2CrossT * r2CrossT) / I_yaw_other;
            const jtIdeal = -vTanSpeed / invMassT;

            const frictionLimit = 0.55 * impulseNormalMag;
            const jt = Math.max(-frictionLimit, Math.min(frictionLimit, jtIdeal));

            impulseTanX = jt * tX;
            impulseTanY = jt * tY;
          }

          const totalImpulseX = impulseNormalMag * col.normalX + impulseTanX;
          const totalImpulseY = impulseNormalMag * col.normalY + impulseTanY;

          // Linear velocity changes
          const deltaV1x = -totalImpulseX * invMass1;
          const deltaV1y = -totalImpulseY * invMass1;

          const deltaV2x = totalImpulseX * invMass2;
          const deltaV2y = totalImpulseY * invMass2;

          // Torque impulses: tau = r x J
          const tau_vehicle = -(rX_vehicle * totalImpulseY - rY_vehicle * totalImpulseX);
          const tau_other = (rX_other * totalImpulseY - rY_other * totalImpulseX);

          const deltaW1 = tau_vehicle / I_yaw_vehicle;
          const deltaW2 = tau_other / I_yaw_other;

          // Apply rotation directly to dynamic angular velocities
          vehicle.angularVelocity = (vehicle.angularVelocity || 0) + deltaW1;
          other.angularVelocity = (other.angularVelocity || 0) + deltaW2;

          // Apply new world velocities
          const postV1x = vehicle.vx + deltaV1x;
          const postV1y = vehicle.vy + deltaV1y;

          const postV2x = other.vx + deltaV2x;
          const postV2y = other.vy + deltaV2y;

          vehicle.vx = postV1x;
          vehicle.vy = postV1y;
          other.vx = postV2x;
          other.vy = postV2y;

          // Decompose into longitudinal (forward) speed and lateral (slip) speed
          const cos1 = Math.cos(vehicle.angle);
          const sin1 = Math.sin(vehicle.angle);
          const fwdSpeed1 = postV1x * cos1 + postV1y * sin1;
          const latSpeed1 = -postV1x * sin1 + postV1y * cos1;

          vehicle.speed = fwdSpeed1;
          vehicle.lateralVelocity = latSpeed1;
          (vehicle as any).lateralSlip = latSpeed1;
          vehicle.isDrifting = Math.abs(latSpeed1) > 8.0;

          const cos2 = Math.cos(other.angle);
          const sin2 = Math.sin(other.angle);
          const fwdSpeed2 = postV2x * cos2 + postV2y * sin2;
          const latSpeed2 = -postV2x * sin2 + postV2y * cos2;

          other.speed = fwdSpeed2;
          other.lateralVelocity = latSpeed2;
          (other as any).lateralSlip = latSpeed2;
          other.isDrifting = Math.abs(latSpeed2) > 8.0;

          // If vehicle or other is NPC AI, throw into full spinout / pileup state
          if (!vehicle.isPlayerControlled) {
            const relSpdKmh = Math.hypot(relVx, relVy) * PX_S_TO_SPEED_KMH;
            vehicle.spinoutTimer = Math.min(5.0, Math.max(1.8, 1.0 + Math.abs(deltaW1) * 0.4 + relSpdKmh / 70));
            vehicle.aiState = 'spinout';
            vehicle.turnSignal = 'hazard';
            vehicle.brakeLightsOn = true;
          }

          if (!other.isPlayerControlled) {
            const relSpdKmh = Math.hypot(relVx, relVy) * PX_S_TO_SPEED_KMH;
            other.spinoutTimer = Math.min(5.0, Math.max(1.8, 1.0 + Math.abs(deltaW2) * 0.4 + relSpdKmh / 70));
            other.aiState = 'spinout';
            other.turnSignal = 'hazard';
            other.brakeLightsOn = true;
          }

          const scrapeSpeed = vTanSpeed;

          // Mutual crumple zone cushion for deformation & sparks, PRESERVING velocity (preserveVelocity: true)
          if (impactSpeed > 20) {
            const crumpleDuration = 0.08 + Math.min(0.06, impactSpeed / 800);
            if (!vehicle.activeCrumple) {
              vehicle.activeCrumple = {
                timer: crumpleDuration,
                totalDuration: crumpleDuration,
                normalX: -col.normalX,
                normalY: -col.normalY,
                initialSpeed: vehicle.speed,
                reboundSpeed: 0,
                contactX: col.contactX,
                contactY: col.contactY,
                preserveVelocity: true
              };
            }
            if (!other.activeCrumple) {
              other.activeCrumple = {
                timer: crumpleDuration,
                totalDuration: crumpleDuration,
                normalX: col.normalX,
                normalY: col.normalY,
                initialSpeed: other.speed,
                reboundSpeed: 0,
                contactX: col.contactX,
                contactY: col.contactY,
                preserveVelocity: true
              };
            }
          }

          applyVehicleDamageAndDeformation(vehicle, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world, other.mass, false);
          applyVehicleDamageAndDeformation(other, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world, vehicle.mass, false);

          if (player) {
            if (vehicle.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === vehicle.id)) {
              applyDriverVehicleCrashTrauma(player, impactSpeed, 'другой автомобиль', 0.85, vehicle);
            } else if (other.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === other.id)) {
              applyDriverVehicleCrashTrauma(player, impactSpeed, 'другой автомобиль', 0.85, other);
            }
          }

          const impactIntensity = Math.min(1.0, impactSpeed / 160);
          if (impactIntensity > 0.1) {
            sound.playCollision(impactIntensity);
          }
        }
      } else {
        // AI-to-AI Collision: Anti-Shove Separation & Lane-Discipline Preservation
        // Prevent trailing cars from shoving lead/stopped cars forward into intersections or adjacent lanes!
        const headingCos = Math.cos(vehicle.angle);
        const headingSin = Math.sin(vehicle.angle);

        // Decompose normal into longitudinal and lateral components relative to lane heading
        const dotLong = col.normalX * headingCos + col.normalY * headingSin;
        const dotLat = col.normalX * -headingSin + col.normalY * headingCos;

        // Bounded lateral push (max 1.2px per tick) to prevent shoving into adjacent lanes
        const latClamp = Math.max(-1.2, Math.min(1.2, dotLat * col.overlap));
        const longPush = dotLong * col.overlap;

        const otherIsStoppedOrYielding = other.speed < 6 || other.aiState === 'stopping_light'|| other.aiState === 'yielding'|| other.aiState === 'stopping_obstacle';
        const selfIsStoppedOrYielding = vehicle.speed < 6 || vehicle.aiState === 'stopping_light'|| vehicle.aiState === 'yielding'|| vehicle.aiState === 'stopping_obstacle';

        if (dotLong < -0.2) {
          // 'vehicle'is behind 'other'(vehicle bumped into other's rear/bumper):
          // The trailing car MUST absorb 100% of the backward separation push!
          // NEVER push the lead/stopped car forward across a stop line or red light!
          const fullPushX = headingCos * (col.overlap + 0.5) - headingSin * latClamp;
          const fullPushY = headingSin * (col.overlap + 0.5) + headingCos * latClamp;

          vehicle.x -= fullPushX;
          vehicle.y -= fullPushY;
          vehicle.speed = Math.max(0, Math.min(vehicle.speed * 0.1, other.speed));
          vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
          vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;

          if (!otherIsStoppedOrYielding) {
            other.x += headingCos * 0.1;
            other.y += headingSin * 0.1;
          }
        } else if (dotLong > 0.2) {
          // 'other'is behind 'vehicle'(other bumped into vehicle's rear):
          // 'other'MUST absorb 100% of the backward separation push!
          const fullPushX = headingCos * (col.overlap + 0.5) - headingSin * latClamp;
          const fullPushY = headingSin * (col.overlap + 0.5) + headingCos * latClamp;

          other.x += fullPushX;
          other.y += fullPushY;
          other.speed = Math.max(0, Math.min(other.speed * 0.1, vehicle.speed));
          other.vx = Math.cos(other.angle) * other.speed;
          other.vy = Math.sin(other.angle) * other.speed;

          if (!selfIsStoppedOrYielding) {
            vehicle.x -= headingCos * 0.1;
            vehicle.y -= headingSin * 0.1;
          }
        } else {
          // Side-by-side or glancing contact: distribute push evenly laterally
          const pushX = (headingCos * longPush * 0.5 - headingSin * latClamp) * ratioSelf;
          const pushY = (headingSin * longPush * 0.5 + headingCos * latClamp) * ratioSelf;

          vehicle.x -= pushX;
          vehicle.y -= pushY;
          other.x += pushX * (ratioOther / ratioSelf);
          other.y += pushY * (ratioOther / ratioSelf);

          vehicle.speed = Math.max(0, vehicle.speed * 0.85);
          other.speed = Math.max(0, other.speed * 0.85);
        }

        // Head-on contact detection: if facing opposite directions, both cars brake hard to prevent deadlock
        const aDiff = Math.abs(angleDiff(vehicle.angle, other.angle));
        if (aDiff > 2.2) {
          vehicle.speed = Math.max(0, vehicle.speed * 0.5);
          other.speed = Math.max(0, other.speed * 0.5);
        }

        const relVx = other.vx - vehicle.vx;
        const relVy = other.vy - vehicle.vy;
        const impactSpeed = Math.hypot(relVx, relVy);
        // Only apply heavy deformation/damage if collision occurred at noticeable speed (>35px/s)
        // This keeps low-speed queue touches smooth, damage-free, and avoids CPU particle spam on mobile!
        if (impactSpeed > 35) {
          const scrapeSpeed = Math.abs(relVx * -col.normalY + relVy * col.normalX);
          applyVehicleDamageAndDeformation(vehicle, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world, other.mass, false);
          applyVehicleDamageAndDeformation(other, col.contactX, col.contactY, impactSpeed, scrapeSpeed, world, vehicle.mass, false);
        }
      }
    }
  }

  // --- COLLISION WITH BUILDINGS ---
  for (const bld of nearbyBuildings) {
    // If AI vehicle is ghosting or special ambulance, skip building collision to allow smooth emergency transit
    if (!vehicle.isPlayerControlled && ((vehicle.ghostingAlpha !== undefined && vehicle.ghostingAlpha < 0.9) || vehicle.id === 'evac_ambulance_special')) {
      continue;
    }

    const col = checkCarBuildingCollision(vehicle, bld);
    if (col.collided) {
      const contactX = vehicle.x - col.normalX * (vehicle.length / 2);
      const contactY = vehicle.y - col.normalY * (vehicle.width / 2);

      if (vehicle.activeCrumple && vehicle.activeCrumple.timer > 0) {
        // Vehicle is actively absorbing collision energy in its crumple zone:
        // Firmly clamp position to surface without snapping backwards in 1 frame
        vehicle.x += col.normalX * col.depth;
        vehicle.y += col.normalY * col.depth;
      } else {
        const impactSpeed = Math.hypot(vehicle.vx, vehicle.vy);

        if (impactSpeed > 16) {
          const velDotN = vehicle.vx * col.normalX + vehicle.vy * col.normalY;
          const tx = -col.normalY;
          const ty = col.normalX;
          const velDotT = vehicle.vx * tx + vehicle.vy * ty;

          const isPlayerVeh = vehicle.isPlayerControlled || (player && player.isInVehicle && player.currentVehicleId === vehicle.id);
          const isGlancingBlow = isPlayerVeh && (Math.abs(velDotT) > Math.abs(velDotN) * 0.9);

          // Dynamic multi-frame crumple zone cushion:
          // Kinetic energy is absorbed over ~5-8 frames (0.08 - 0.12s),
          // generating continuous metal wrinkling and smooth deceleration!
          const crumpleDuration = 0.08 + Math.min(0.06, impactSpeed / 800);
          const rebound = -0.12 * Math.sign(vehicle.speed || 1) * Math.min(25, Math.abs(vehicle.speed));

          if (isGlancingBlow && velDotN < 0) {
            // Glancing scrape against building wall: soft normal redirection & tangential friction
            const newVelDotN = -velDotN * 0.08;
            const newVelDotT = velDotT * 0.84;

            vehicle.vx = col.normalX * newVelDotN + tx * newVelDotT;
            vehicle.vy = col.normalY * newVelDotN + ty * newVelDotT;

            const rX = contactX - vehicle.x;
            const rY = contactY - vehicle.y;
            const I_yaw = vehicle.mass * (vehicle.width * vehicle.width + vehicle.length * vehicle.length) / 12;
            const tau = -(rX * (col.normalY * Math.abs(velDotN) * vehicle.mass * 0.7) - rY * (col.normalX * Math.abs(velDotN) * vehicle.mass * 0.7));
            vehicle.angularVelocity = (vehicle.angularVelocity || 0) + tau / I_yaw;

            const cos = Math.cos(vehicle.angle);
            const sin = Math.sin(vehicle.angle);
            vehicle.speed = vehicle.vx * cos + vehicle.vy * sin;
            const lat = -vehicle.vx * sin + vehicle.vy * cos;
            vehicle.lateralVelocity = lat;
            (vehicle as any).lateralSlip = lat;
            vehicle.isDrifting = true;

            vehicle.activeCrumple = {
              timer: crumpleDuration,
              totalDuration: crumpleDuration,
              normalX: col.normalX,
              normalY: col.normalY,
              initialSpeed: vehicle.speed,
              reboundSpeed: 0,
              contactX,
              contactY,
              preserveVelocity: true
            };
          } else {
            vehicle.activeCrumple = {
              timer: crumpleDuration,
              totalDuration: crumpleDuration,
              normalX: col.normalX,
              normalY: col.normalY,
              initialSpeed: vehicle.speed,
              reboundSpeed: rebound,
              contactX,
              contactY,
              preserveVelocity: false
            };
          }

          vehicle.x += col.normalX * col.depth;
          vehicle.y += col.normalY * col.depth;

          applyVehicleDamageAndDeformation(vehicle, contactX, contactY, impactSpeed, 10, world, 12000, true);

          if (vehicle.isPlayerControlled || (player && player.isInVehicle && player.currentVehicleId === vehicle.id)) {
            sound.playCollision(Math.min(1.0, impactSpeed / 120));
            if (player) {
              applyDriverVehicleCrashTrauma(player, impactSpeed, 'здание', 1.0, vehicle);
            }
          } else {
            // For AI cars: Trigger hazard stop if disabled/crashed, otherwise trigger smart reverse recovery
            if (isVehicleDisabledOrCrashed(vehicle)) {
              vehicle.turnSignal = 'hazard';
              vehicle.brakeLightsOn = true;
              vehicle.targetSpeed = 0;
              vehicle.speed = 0;
              vehicle.angularVelocity = 0;
              vehicle.steerAngle = 0;
              vehicle.vx = 0;
              vehicle.vy = 0;
              vehicle.aiState = 'stopping_obstacle';
              if (vehicle.engineState) {
                vehicle.engineState.engineRunning = false;
                vehicle.engineState.engineRPM = 0;
              }
            } else if (vehicle.aiState === 'reversing') {
              // If already reversing and rear bumped a building, complete reverse early
              vehicle.reverseTimer = 0;
            } else {
              vehicle.aiState = 'reversing';
              vehicle.reverseTimer = 1.2;
              vehicle.recoveryTargetAngle = vehicle.angle;
              vehicle.recoverySteer = 0;
              vehicle.speed = -35;
              vehicle.ghostingAlpha = 0.5; // Allow ghosting to avoid re-triggering collision
            }
          }
        } else {
          // Low speed contact (< 16 px/s): gentle bumper nudge / resting contact
          vehicle.x += col.normalX * (col.depth + 0.5);
          vehicle.y += col.normalY * (col.depth + 0.5);
          if (!vehicle.isPlayerControlled && (isVehicleDisabledOrCrashed(vehicle) || vehicle.aiState === 'stopping_obstacle')) {
            vehicle.speed = 0;
            vehicle.vx = 0;
            vehicle.vy = 0;
            vehicle.angularVelocity = 0;
            vehicle.steerAngle = 0;
          } else {
            vehicle.speed *= 0.4;
            vehicle.vx *= 0.4;
            vehicle.vy *= 0.4;
          }
        }
      }
    }
  }

  // Explicit collision with Gas Station structural islands (including LPG island & propane tank)
  if (vehicle.x >= 4800 && vehicle.x <= 5500 && vehicle.y >= 4800 && vehicle.y <= 5500) {
    for (const sub of GAS_STATION_STRUCTURAL_SUB_BOXES) {
      const col = checkCarBoxCollision(vehicle, sub);
      if (col.collided) {
        const contactX = vehicle.x - col.normalX * (vehicle.length / 2);
        const contactY = vehicle.y - col.normalY * (vehicle.width / 2);

        if (vehicle.activeCrumple && vehicle.activeCrumple.timer > 0) {
          vehicle.x += col.normalX * col.depth;
          vehicle.y += col.normalY * col.depth;
        } else {
          const impactSpeed = Math.hypot(vehicle.vx, vehicle.vy);
          if (impactSpeed > 16) {
            const crumpleDuration = 0.08 + Math.min(0.06, impactSpeed / 800);
            const rebound = -0.12 * Math.sign(vehicle.speed || 1) * Math.min(25, Math.abs(vehicle.speed));

            vehicle.activeCrumple = {
              timer: crumpleDuration,
              totalDuration: crumpleDuration,
              normalX: col.normalX,
              normalY: col.normalY,
              initialSpeed: vehicle.speed,
              reboundSpeed: rebound,
              contactX,
              contactY
            };

            vehicle.x += col.normalX * col.depth;
            vehicle.y += col.normalY * col.depth;

            applyVehicleDamageAndDeformation(vehicle, contactX, contactY, impactSpeed, 10, world, 12000, true);
          } else {
            vehicle.x += col.normalX * (col.depth + 0.5);
            vehicle.y += col.normalY * (col.depth + 0.5);
            vehicle.speed *= 0.4;
            vehicle.vx *= 0.4;
            vehicle.vy *= 0.4;
          }
        }
        break;
      }
    }
  }

  // World bounds clamp (full open-world size including northern wilderness)
  const minVehX = -4000;
  const maxVehX = Math.max(52000, world.width || 52000) - 15;
  const minVehY = -5000;
  const maxVehY = Math.max(30000, world.height || 30000) - 15;
  vehicle.x = Math.max(minVehX, Math.min(maxVehX, vehicle.x));
  vehicle.y = Math.max(minVehY, Math.min(maxVehY, vehicle.y));
}

export function updateSkidMarksAndParticles(world: GameWorld, player: Player, dt: number) {
  (world as any)._lastPlayer = player;
  // Skid marks fade (O(N) in-place retention, zero splice overhead)
  // Deep offroad ruts remain carved into the soil significantly longer than faint surface tire marks!
  const smList = world.skidMarks;
  const smLen = smList.length;
  let smWrite = 0;
  for (let i = 0; i < smLen; i++) {
    const sm = smList[i];
    const decayRate = (sm.depth && sm.depth > 0.05) ? (0.005 / Math.max(0.35, sm.depth)) : 0.015;
    sm.alpha -= dt * decayRate;
    if (sm.alpha > 0.01) {
      smList[smWrite++] = sm;
    }
  }
  smList.length = smWrite;

  const maxMarks = 1500;
  if (smList.length > maxMarks) {
    const dropCount = smList.length - maxMarks;
    for (let i = 0; i < maxMarks; i++) {
      smList[i] = smList[i + dropCount];
    }
    smList.length = maxMarks;
  }

  // Fluid Stains aging & drying & BURNING dynamics
  if (!world.stains) world.stains = [];
  const newlyIgnited = new Set<string>();

  const stainsList = world.stains;
  const stainsLen = stainsList.length;
  let stWrite = 0;

  for (let i = 0; i < stainsLen; i++) {
    const st = stainsList[i];
    const dxSt = st.x - player.x;
    const dySt = st.y - player.y;
    const isStainNear = (dxSt * dxSt + dySt * dySt <= 1960000); // 1400^2 px

    if (st.onFire) {
      // Fuel/oil burns: increase fire intensity quickly
      st.fireIntensity = Math.min(1.0, (st.fireIntensity || 0.1) + dt * 2.0);

      if (st.type === 'fuel') {
        st.life += dt * 25; // burns out very quickly (approx 8-12 sec)
        st.radius = Math.min(st.maxRadius, st.radius + dt * 1.5); // spread slightly initially
        const ratio = st.life / st.maxLife;
        if (ratio > 0.5) {
          st.radius = Math.max(0.1, st.radius - dt * 2.5); // shrink as fuel is consumed
        }
      } else if (st.type === 'oil') {
        st.life += dt * 8; // burns more slowly and thickly
        st.radius = Math.min(st.maxRadius, st.radius + dt * 0.5);
        const ratio = st.life / st.maxLife;
        if (ratio > 0.6) {
          st.radius = Math.max(0.1, st.radius - dt * 1.0); // shrink as oil is consumed
        }
      } else {
        // coolant and sand cannot burn, put out fire if set
        st.onFire = false;
        st.fireIntensity = 0;
      }

      // Spawn flame and smoke particles (throttled/scaled with dt to prevent pool saturation)
      if (isStainNear) {
        const stainSpawnChance = (st.type === 'fuel'? 12.0 : 8.0) * dt;
        if (Math.random() < stainSpawnChance) {
          // Flame particle
          world.particles.push({
            x: st.x + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
            y: st.y + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
            vx: (Math.random() * 20 - 10),
            vy: -25 - Math.random() * 25,
            radius: 2.5 + st.radius * 0.35 + Math.random() * 4,
            color: Math.random() < 0.55 ? '#f59e0b': '#ef4444',
            alpha: 0.9,
            life: 0,
            maxLife: 0.3 + Math.random() * 0.35,
            type: 'flame'});

          // Dense smoke particle
          world.particles.push({
            x: st.x + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
            y: st.y + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
            vx: (Math.random() * 16 - 8),
            vy: -35 - Math.random() * 30,
            radius: 4.5 + st.radius * 0.5 + Math.random() * 6,
            color: st.type === 'oil'? '#090d16': '#1e293b',
            alpha: 0.85,
            life: 0,
            maxLife: 0.8 + Math.random() * 0.5,
            type: 'engine_smoke'});
        }

        // Occasional flying sparks
        if (Math.random() < 3.0 * dt) {
          world.particles.push({
            x: st.x + (Math.random() * st.radius - st.radius * 0.5),
            y: st.y + (Math.random() * st.radius - st.radius * 0.5),
            vx: (Math.random() * 80 - 40),
            vy: -15 - Math.random() * 20,
            radius: 1 + Math.random() * 2,
            color: '#fef08a',
            alpha: 0.95,
            life: 0,
            maxLife: 0.15 + Math.random() * 0.2,
            type: 'spark'});
        }
      }

      // SPREAD FIRE TO NEIGHBORING FUEL/OIL STAINS (chain reaction!)
      if (st.fireIntensity > 0.45) {
        for (let j = 0; j < stainsLen; j++) {
          const other = stainsList[j];
          if (other !== st && !other.onFire && !newlyIgnited.has(other.id) && (other.type === 'fuel'|| other.type === 'oil')) {
            const dx = other.x - st.x;
            const dy = other.y - st.y;
            const distSq = dx * dx + dy * dy;
            const spreadDist = st.radius + other.radius + 3.0; // Must be in physical overlap + tiny 3px margin
            if (distSq < spreadDist * spreadDist) {
              // Gradual ignition delay (takes ~0.25s under direct contact to catch)
              if (Math.random() < 4.0 * dt) {
                other.onFire = true;
                other.fireIntensity = 0.1;
                newlyIgnited.add(other.id);
              }
            }
          }
        }
      }

      // SPREAD FIRE TO VEHICLES:
      // A burning puddle on the ground can ONLY ignite a vehicle IF:
      // 1. It is a FUEL puddle (st.type === 'fuel')
      // 2. The puddle directly reaches the vehicle's fuel tank (rear of vehicle)
      if (st.type === 'fuel'&& st.fireIntensity > 0.4) {
        for (const car of world.vehicles) {
          if (!car.damage) {
            car.damage = createDefaultVehicleDamage(car.length, car.width);
          }
          if (!car.damage.isFullyBurnt && !car.damage.engineFire && !car.damage.underHoodSmolder && !car.damage.cabinFire && !car.damage.fuelTankFire) {
            const cosA = Math.cos(car.angle);
            const sinA = Math.sin(car.angle);
            // Fuel tank location at the rear of the car
            const fuelTankX = car.x - cosA * (car.length * 0.38);
            const fuelTankY = car.y - sinA * (car.length * 0.38);
            const distToTank = Math.hypot(st.x - fuelTankX, st.y - fuelTankY);
            if (distToTank < st.radius + 3.0) {
              // Direct contact with the fuel tank initiates rear fuel tank fire only after sustained exposure
              // Driving across a puddle at > 10 km/h does not ignite the tank
              const isStationaryOverFire = Math.abs(car.speed) < 10;
              if (isStationaryOverFire) {
                (car.damage as any).tankFireExposureTimer = ((car.damage as any).tankFireExposureTimer || 0) + dt;
                if ((car.damage as any).tankFireExposureTimer > 3.0) {
                  car.damage.fireOrigin = 'rear';
                  car.damage.fuelTankFire = true;
                  car.damage.fireTimer = 0;
                  car.damage.fireProgress = 0.2;
                  car.damage.fireIntensity = 0.7;
                  car.damage.groundPuddleIgnited = true;
                  if (car.isPlayerControlled) {
                    addPlayerNotification(player, `Горящая лужа бензина подожгла бензобак машины сзади!`, 'warning');
                  }
                }
              } else {
                (car.damage as any).tankFireExposureTimer = Math.max(0, ((car.damage as any).tankFireExposureTimer || 0) - dt * 2.0);
              }
            }
          }
        }
      }
    } else {
      // Normal drying out (water evaporates faster on asphalt, especially in warm weather)
      const dryMultiplier = st.type === 'water'? 1.5 : 1.0;
      st.life += dt * dryMultiplier;
    }

    if (typeof st.alpha !== 'number'|| !isFinite(st.alpha)) {
      st.alpha = st.type === 'oil'? 0.75 : (st.type === 'coolant'? 0.65 : (st.type === 'water'? 0.60 : 0.45));
    }

    const fadeDuration = st.type === 'water'? 20 : 60;
    const fadeStart = Math.max(0, st.maxLife - fadeDuration);
    if (st.life > fadeStart) {
      st.alpha = Math.max(0, (1 - (st.life - fadeStart) / fadeDuration) * (st.type === 'oil'? 0.75 : (st.type === 'coolant'? 0.65 : (st.type === 'water'? 0.60 : 0.45))));
    }

    // In-place retention condition
    if (st.life < st.maxLife && st.alpha > 0.005 && st.radius > 0.15) {
      stainsList[stWrite++] = st;
    }
  }
  stainsList.length = stWrite;

  if (stainsList.length > 600) {
    const dropStains = stainsList.length - 600;
    for (let i = 0; i < 600; i++) {
      stainsList[i] = stainsList[i + dropStains];
    }
    stainsList.length = 600;
  }

  // Tick modular vehicle systems (engine heat, radiator leak, oil level/pressure, fuel tank, suspension drag & steering pull)
  for (const car of world.vehicles) {
    updateVehicleSystems(car, dt, world);
  }


  // Automatic Fifth-Wheel Coupling for Semi-Trucks
  for (const veh of world.vehicles) {
    if (veh.type === 'truck_semi'&& !veh.trailerId && veh.speed < -0.1) {
      const vehCfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
      const hitchOffset = veh.hitchOffset !== undefined ? veh.hitchOffset : (vehCfg.hitchOffset !== undefined ? vehCfg.hitchOffset : -vehCfg.length / 2 - 2);
      const hitchX = veh.x + Math.cos(veh.angle) * hitchOffset;
      const hitchY = veh.y + Math.sin(veh.angle) * hitchOffset;

      for (const trailer of world.vehicles) {
        if (trailer.type.startsWith('trailer_semi') && !trailer.towedById) {
          const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
          const couplerOffset = trailer.couplerOffset !== undefined ? trailer.couplerOffset : (trailerCfg.couplerOffset || 50);
          const couplerX = trailer.x + Math.cos(trailer.angle) * couplerOffset;
          const couplerY = trailer.y + Math.sin(trailer.angle) * couplerOffset;
          
          if (Math.hypot(hitchX - couplerX, hitchY - couplerY) < 16) {
            hitchTrailerToVehicle(veh, trailer, world);
            
            // Notify player if they are driving this truck
            if (player && player.currentVehicleId === veh.id) {
              const towName = CAR_CONFIGS[trailer.type]?.name || trailer.type;
              addPlayerNotification(player, `Шкворень ${towName} защелкнут в седле! Выйдите, чтобы подключить тормозные и электрические косички.`, 'info');
            }
            break; // Only hitch one
          }
        }
      }
    }
  }

  // Update trailer towing physics and tow hitch constraint positioning
  updateTrailerTowingPhysics(world, dt);
  updateTowingRopesPhysics(world, dt, player);


  // Spawn smoke/steam/flame for damaged vehicles
  for (const car of world.vehicles) {
    if (isTrailerVehicle(car)) continue; // Trailers do not emit engine smoke, steam or flames!
    
    // Skip visual particle spawning if vehicle is too far from player (offscreen optimization)
    const dxCar = car.x - player.x;
    const dyCar = car.y - player.y;
    if (dxCar * dxCar + dyCar * dyCar > 1960000) continue; // 1400^2 px

    if (car.damage && (car.damage.engineSmoking || car.damage.underHoodSmolder || car.damage.engineFire || car.damage.fuelTankFire || car.damage.cabinFire)) {
      const hasActiveFlame = car.damage.engineFire || car.damage.cabinFire || car.damage.fuelTankFire;
      // Convert raw probability to frame-rate independent spawn rate (scaled with dt)
      const spawnChance = (hasActiveFlame ? 40.0 : 15.0) * dt;
      if (Math.random() < spawnChance) {
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const hoodX = car.x + cosA * (car.length * 0.35);
        const hoodY = car.y + sinA * (car.length * 0.35);

        if (hasActiveFlame) {
          const fireProgress = Math.max(0.15, car.damage.fireProgress || 0.15);

          // Active fire emission points along car length:
          const fireOffsets: number[] = [];
          if (car.damage.fuelTankFire) {
            fireOffsets.push(-car.length * 0.35); // Trunk & fuel tank area
            fireOffsets.push(-car.length * 0.22); // Rear axle / underbody
          }
          if (car.damage.engineFire) {
            fireOffsets.push(car.length * 0.35); // Hood & engine bay
          }
          if (car.damage.cabinFire) {
            fireOffsets.push(car.length * 0.08); // Dashboard & front seats
            fireOffsets.push(-car.length * 0.10); // Rear seats & carpet
          }
          if (fireOffsets.length === 0) {
            fireOffsets.push(car.damage.fireOrigin === 'rear'? -car.length * 0.35 : car.length * 0.35);
          }

          const offL = fireOffsets[Math.floor(Math.random() * fireOffsets.length)];
          const fireX = car.x + cosA * offL + (Math.random() * 8 - 4);
          const fireY = car.y + sinA * offL + (Math.random() * 8 - 4);

          // 1. Turbulent roaring flame tongue
          world.particles.push({
            x: fireX,
            y: fireY,
            vx: -cosA * 15 + (Math.random() * 24 - 12),
            vy: -sinA * 15 - 20 + (Math.random() * 24 - 12),
            radius: 5 + fireProgress * 8 + Math.random() * 5,
            color: Math.random() < 0.55 ? '#f59e0b': '#ef4444',
            alpha: 0.88,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.35,
            type: 'flame'});

          // 2. Dense black soot smoke
          world.particles.push({
            x: fireX,
            y: fireY,
            vx: -cosA * 8 + (Math.random() * 16 - 8),
            vy: -sinA * 8 - 25 + (Math.random() * 16 - 8),
            radius: 8 + fireProgress * 12 + Math.random() * 8,
            color: '#0f172a',
            alpha: 0.82,
            life: 0,
            maxLife: 0.85 + Math.random() * 0.5,
            type: 'engine_smoke'});

          // 3. Flying sparks / embers
          if (Math.random() < 0.55) {
            world.particles.push({
              x: fireX,
              y: fireY,
              vx: (Math.random() * 90 - 45),
              vy: (Math.random() * 90 - 45),
              radius: 1.5 + Math.random() * 2.0,
              color: '#fef08a',
              alpha: 0.95,
              life: 0,
              maxLife: 0.2 + Math.random() * 0.25,
              type: 'spark'});
          }
        } else {
          // Detailed under-hood steam and smoke rendering
          const steamType = car.damage.underHoodSteam || 'none';
          const smokeType = car.damage.underHoodSmolder ? 'oil_gray_wiring_black': (car.damage.underHoodSmoke || 'none');

          let hasRenderedSteam = false;
          let hasRenderedSmoke = false;

          // 1. STEAM GENERATION
          if (steamType === 'thin') {
            hasRenderedSteam = true;
            if (Math.random() < 0.40) {
              world.particles.push({
                x: hoodX + (Math.random() * 3 - 1.5),
                y: hoodY + (Math.random() * 3 - 1.5),
                vx: -cosA * 4 + (Math.random() * 6 - 3),
                vy: -sinA * 4 - 22 + (Math.random() * 6 - 3), // rising stream
                radius: 2.4 + Math.random() * 1.8,
                color: '#f8fafc',
                alpha: 0.65,
                initialAlpha: 0.65,
                life: 0,
                maxLife: 0.65 + Math.random() * 0.35,
                type: 'engine_smoke'});
            }
          } else if (steamType === 'dense') {
            hasRenderedSteam = true;
            if (Math.random() < 0.70) {
              world.particles.push({
                x: hoodX + (Math.random() * 8 - 4),
                y: hoodY + (Math.random() * 8 - 4),
                vx: -cosA * 6 + (Math.random() * 12 - 6),
                vy: -sinA * 6 - 20 + (Math.random() * 10 - 5),
                radius: 5.5 + Math.random() * 4.0,
                color: '#f8fafc', // dense bright white steam
                alpha: 0.85,
                initialAlpha: 0.85,
                life: 0,
                maxLife: 1.05 + Math.random() * 0.55,
                type: 'engine_smoke'});
            }
          } else if (steamType === 'geyser') {
            hasRenderedSteam = true;
            const geyserCount = Math.floor(Math.random() * 2) + 1;
            for (let g = 0; g < geyserCount; g++) {
              world.particles.push({
                x: hoodX + (Math.random() * 5 - 2.5),
                y: hoodY + (Math.random() * 5 - 2.5),
                vx: -cosA * 12 + (Math.random() * 10 - 5),
                vy: -sinA * 12 - 45 - Math.random() * 25, // powerful geyser upwards blast
                radius: 5.0 + Math.random() * 4.5,
                color: '#f8fafc',
                alpha: 0.92,
                initialAlpha: 0.92,
                life: 0,
                maxLife: 0.55 + Math.random() * 0.35,
                type: 'engine_smoke'});
            }
          }

          // 2. SMOKE GENERATION
          if (smokeType === 'oil_blue') {
            hasRenderedSmoke = true;
            if (Math.random() < 0.50) {
              world.particles.push({
                x: hoodX + (Math.random() * 7 - 3.5),
                y: hoodY + (Math.random() * 7 - 3.5),
                vx: -cosA * 5 + (Math.random() * 14 - 7),
                vy: -sinA * 5 - 18 + (Math.random() * 12 - 6),
                radius: 4.5 + Math.random() * 3.5,
                color: '#64748b', // distinct blue-gray oil smoke color
                alpha: 0.75,
                initialAlpha: 0.75,
                life: 0,
                maxLife: 0.95 + Math.random() * 0.45,
                type: 'engine_smoke'});
            }
          } else if (smokeType === 'oil_gray_wiring_black') {
            hasRenderedSmoke = true;
            if (Math.random() < 0.60) {
              // Thick gray oil smoke
              world.particles.push({
                x: hoodX + (Math.random() * 9 - 4.5),
                y: hoodY + (Math.random() * 9 - 4.5),
                vx: -cosA * 6 + (Math.random() * 18 - 9),
                vy: -sinA * 6 - 25 + (Math.random() * 16 - 8),
                radius: 5.5 + Math.random() * 4.5,
                color: '#334155', // thick slate-gray oil smoke
                alpha: 0.85,
                initialAlpha: 0.85,
                life: 0,
                maxLife: 1.2 + Math.random() * 0.55,
                type: 'engine_smoke'});
            }
            if (Math.random() < 0.45) {
              // Acrid black wiring smoke
              world.particles.push({
                x: hoodX + (Math.random() * 7 - 3.5),
                y: hoodY + (Math.random() * 7 - 3.5),
                vx: -cosA * 4 + (Math.random() * 14 - 7),
                vy: -sinA * 4 - 32 + (Math.random() * 14 - 7),
                radius: 4.0 + Math.random() * 3.5,
                color: '#090d16', // dense pitch black wiring smoke
                alpha: 0.92,
                initialAlpha: 0.92,
                life: 0,
                maxLife: 1.05 + Math.random() * 0.45,
                type: 'engine_smoke'});
            }
          }

          // Fallback to standard white radiator steam if no other smoke/steam generated but smoking flag is set
          if (!hasRenderedSteam && !hasRenderedSmoke) {
            const fallbackColor = (car.engineState?.overheatingSteam) ? '#f8fafc': '#94a3b8';
            world.particles.push({
              x: hoodX + (Math.random() * 7 - 3.5),
              y: hoodY + (Math.random() * 7 - 3.5),
              vx: -cosA * 15 + (Math.random() * 20 - 10),
              vy: -sinA * 15 + (Math.random() * 20 - 10),
              radius: 4 + Math.random() * 4.5,
              color: fallbackColor,
              alpha: 0.78,
              initialAlpha: 0.78,
              life: 0,
              maxLife: 0.75 + Math.random() * 0.45,
              type: 'engine_smoke'});
          }
        }
      }
    }
  }

  // Define module-level particle pool
  if (!(globalThis as any)._particlePool) {
    (globalThis as any)._particlePool = [];
  }
  const particlePool: Particle[] = (globalThis as any)._particlePool;

  // Particles Pooling and Recycling System
  if (!world.particles.hasOwnProperty('_hooked')) {
    (world.particles as any)._hooked = true;
    // Pre-hook the push method to draw from the pool whenever possible to avoid allocating new objects
    const originalPush = world.particles.push;
    world.particles.push = function(...items: Particle[]) {
      const activePlayer = (world as any)._lastPlayer;
      const cleanMode = world.cleanMode;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (cleanMode && (item.type === 'engine_smoke'|| item.type === 'tire_smoke'|| item.type === 'exhaust')) {
          continue;
        }

        // Offscreen particle optimization - discard if too far from the player
        if (activePlayer) {
          const dx = item.x - activePlayer.x;
          const dy = item.y - activePlayer.y;
          if (dx * dx + dy * dy > 1960000) { // 1400^2 px
            continue;
          }
        }

        const p = particlePool.pop();
        if (p) {
          p.type = item.type;
          p.x = item.x;
          p.y = item.y;
          p.vx = item.vx;
          p.vy = item.vy;
          p.radius = item.radius;
          p.color = item.color;
          p.alpha = item.alpha;
          p.initialAlpha = item.initialAlpha !== undefined ? item.initialAlpha : item.alpha;
          p.underVehicle = item.underVehicle;
          p.life = item.life;
          p.maxLife = item.maxLife;
          originalPush.call(this, p);
        } else {
          if (item.initialAlpha === undefined) {
            item.initialAlpha = item.alpha;
          }
          originalPush.call(this, item);
        }
      }
      return this.length;
    };
  }

  if (world.particles.length > performanceConfig.particleLimit) {
    const excessCount = world.particles.length - performanceConfig.particleLimit;
    for (let i = 0; i < excessCount; i++) {
      particlePool.push(world.particles[i]);
    }
    const remCount = performanceConfig.particleLimit;
    for (let i = 0; i < remCount; i++) {
      world.particles[i] = world.particles[i + excessCount];
    }
    world.particles.length = remCount;
  }

  const pList = world.particles;
  const pCount = pList.length;
  let pWrite = 0;

  for (let i = 0; i < pCount; i++) {
    const p = pList[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'exhaust') {
      // Atmospheric air friction drag - gas decelerates rapidly against still air
      p.vx *= Math.max(0, 1 - 3.5 * dt);
      p.vy *= Math.max(0, 1 - 3.5 * dt);
      // Volumetric gas expansion: blooms and decompresses in ambient air
      p.radius += dt * (8.5 + p.radius * 0.45);
      // Micro-eddy atmospheric turbulence / flutter
      p.x += Math.sin(p.life * 7 + p.y * 0.05) * (3.0 * dt);
      // Gentle thermal buoyancy / warm exhaust updraft
      p.vy -= dt * 2.0;

      const baseAlpha = p.initialAlpha ?? 0.50;
      const progress = Math.min(1.0, Math.max(0, p.life / p.maxLife));
      // Volumetric dispersion curve: gas retains visible body and smoothly vanishes
      p.alpha = baseAlpha * Math.pow(1.0 - progress, 0.9);
    } else if (p.type === 'tire_smoke'|| p.type === 'engine_smoke') {
      p.radius += dt * (8.0 + p.radius * 0.35);
      if (p.type === 'engine_smoke') {
        p.vy -= dt * 16.0; // Strong thermal buoyancy for fire soot and boiling radiator steam
        p.vx *= Math.max(0, 1 - 1.5 * dt);
        p.x += Math.sin(p.life * 5 + p.y * 0.05) * (4.0 * dt);
      }
      const baseAlpha = p.initialAlpha !== undefined ? p.initialAlpha : (p.type === 'engine_smoke'? 0.85 : 0.65);
      const progress = Math.min(1.0, Math.max(0, p.life / p.maxLife));
      p.alpha = baseAlpha * Math.pow(1.0 - progress, 0.85);
    } else if (p.type === 'dust') {
      // Volumetric dust cloud physics: air drag slows the kick, cloud expands softly and drifts
      p.vx *= Math.max(0, 1 - 2.0 * dt);
      p.vy *= Math.max(0, 1 - 2.0 * dt);
      const targetR = p.targetRadius || 26.0;
      p.radius += (targetR - p.radius) * Math.min(1.0, 3.2 * dt);
      p.x += Math.sin(p.life * 2.0 + p.y * 0.04) * (2.0 * dt);
      p.y += Math.cos(p.life * 1.8 + p.x * 0.04) * (1.5 * dt);
      const baseAlpha = p.initialAlpha ?? 0.75;
      const progress = Math.min(1.0, Math.max(0, p.life / p.maxLife));
      p.alpha = baseAlpha * Math.pow(1.0 - progress, 1.1);
    } else if (p.type === 'mud_clod') {
      // Solid heavy earth projectile with 3D ballistic arc, gravity and ground splatter
      if (!p.splatted) {
        p.vz = (p.vz ?? 40) - 460 * dt; // Strong gravity pulling heavy mud chunk downward
        p.z = (p.z ?? 1.5) + p.vz * dt;
        p.vx *= Math.max(0, 1 - 1.5 * dt);
        p.vy *= Math.max(0, 1 - 1.5 * dt);

        if (p.z <= 0) {
          // Heavy mud clump smacks into the ground, flattens and splatters
          p.z = 0;
          p.vz = 0;
          p.vx = 0;
          p.vy = 0;
          p.splatted = true;
          p.radius = Math.min(9.0, p.radius * 1.35);
        }
      } else {
        // Splattered on the ground: stationary wet mud stain, slowly drying
        p.vx = 0;
        p.vy = 0;
        const remain = Math.max(0, 1.0 - p.life / p.maxLife);
        p.alpha = (p.initialAlpha ?? 0.95) * Math.min(1.0, remain * 1.5);
      }
    } else if (p.type === 'water_fountain'|| p.type === 'water_splash') {
      p.radius += dt * 5;
      p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
    } else {
      p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
    }

    // Dynamic off-screen early culling
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const isOffscreen = (dx * dx + dy * dy > 1960000); // 1400^2 px

    if (p.life < p.maxLife && !isOffscreen) {
      pList[pWrite++] = p;
    } else {
      particlePool.push(p); // Recycle to pool without array shifting
    }
  }
  pList.length = pWrite;
}

const scratchVehicleSet = new Set<Vehicle>();

export function updateBreakablePropsAndLivingWorld(world: GameWorld, player: Player, dt: number, vehGrid?: any) {
  const isRaining = world.weather === 'rain'|| world.weather === 'storm';

  // Spawn new puddles dynamically if it's raining
  if (isRaining) {
    const nonPondPuddles = world.puddles.filter(p => !p.isPond);
    if (nonPondPuddles.length < 50 && Math.random() < 0.05) { // Slow gradual puddle spawn up to 50 max
      const roads = world.roads || [];
      if (roads.length > 0) {
        const road = roads[Math.floor(Math.random() * roads.length)];
        const px = road.direction === 'horizontal'? (road.x1 + road.x2) / 2 + (Math.random() * 200 - 100) : road.x1 + (Math.random() * road.width - road.width / 2);
        const py = road.direction === 'vertical'? (road.y1 + road.y2) / 2 + (Math.random() * 200 - 100) : road.y1 + (Math.random() * road.width - road.width / 2);
        world.puddles.push({
          id: `puddle_dynamic_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          x: px,
          y: py,
          radiusX: 18 + Math.random() * 14,
          radiusY: 10 + Math.random() * 8,
          angle: Math.random() * Math.PI,
          rippleTimer: 0
        });
      } else {
        // Fallback spawn near player
        world.puddles.push({
          id: `puddle_dynamic_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          x: player.x + (Math.random() * 800 - 400),
          y: player.y + (Math.random() * 800 - 400),
          radiusX: 18 + Math.random() * 14,
          radiusY: 10 + Math.random() * 8,
          angle: Math.random() * Math.PI,
          rippleTimer: 0
        });
      }
    }
  }

  // 1. UPDATE BREAKABLE PROPS & WATER FOUNTAINS
  for (const prop of world.props) {
    if (prop.isBroken) {
      // Move detached prop with physics friction
      if (prop.breakVX || prop.breakVY) {
        prop.x += (prop.breakVX || 0) * dt;
        prop.y += (prop.breakVY || 0) * dt;
        prop.angle += (prop.breakSpin || 0) * dt;
        prop.breakVX = (prop.breakVX || 0) * (1 - dt * 3);
        prop.breakVY = (prop.breakVY || 0) * (1 - dt * 3);
        prop.breakSpin = (prop.breakSpin || 0) * (1 - dt * 3);
      }

      // Hydrant Water Fountain Spray (Shoots UPWARD into the air)
      if (prop.type === 'hydrant'&& (prop.waterFountainTimer ?? 0) > 0) {
        prop.waterFountainTimer = (prop.waterFountainTimer ?? 35) - dt;
        if (Math.random() < 0.85) {
          const fountainSpeed = 180 + Math.random() * 100;
          const fountainAngle = -Math.PI / 2 + (Math.random() * 0.3 - 0.15); // Upward cone (-90 deg)
          world.particles.push({
            x: prop.x + (Math.random() * 4 - 2),
            y: prop.y - 4,
            vx: Math.cos(fountainAngle) * fountainSpeed * 0.3,
            vy: Math.sin(fountainAngle) * fountainSpeed, // Strong upward velocity
            radius: 3 + Math.random() * 4,
            color: '#60a5fa',
            alpha: 0.85,
            life: 0,
            maxLife: 0.6 + Math.random() * 0.4,
            type: 'water_fountain'});
        }
      }
      continue;
    }

    const vehiclesToCheck = vehGrid ? vehGrid.queryRadius(prop.x, prop.y, 45, scratchVehicleSet) : world.vehicles;
    // Check prop collision against vehicles using exact OBB & Circle Hitbox detection
    for (const veh of vehiclesToCheck) {
      const hitbox = getPropHitbox(prop);
      if (hitbox.shape === 'none') {
        // Non-blocking flush surface props (manhole, drain grate)
        if (prop.type === 'manhole') {
          const dx = veh.x - prop.x;
          const dy = veh.y - prop.y;
          if (dx * dx + dy * dy < 144 && Math.abs(veh.speed) > 18) {
            sound.playManholeClank();
          }
        }
        continue;
      }

      const col = checkPropVehicleCollision(prop, veh);
      if (!col.collided) continue;

      // Special case: indestructible props (e.g. old concrete lamppost, garage doors)
      if (hitbox.isIndestructible) {
        const contactX = col.contactX;
        const contactY = col.contactY;
        const pushDist = Math.hypot(col.pushX, col.pushY) || 1;
        const normX = col.pushX / pushDist;
        const normY = col.pushY / pushDist;

        if (veh.activeCrumple && veh.activeCrumple.timer > 0) {
          veh.x += col.pushX;
          veh.y += col.pushY;
        } else {
          const impactSpeed = Math.hypot(veh.vx, veh.vy);

          if (impactSpeed > 16) {
            const crumpleDuration = 0.08 + Math.min(0.06, impactSpeed / 800);
            const rebound = -0.12 * Math.sign(veh.speed || 1) * Math.min(25, Math.abs(veh.speed));

            veh.activeCrumple = {
              timer: crumpleDuration,
              totalDuration: crumpleDuration,
              normalX: normX,
              normalY: normY,
              initialSpeed: veh.speed,
              reboundSpeed: rebound,
              contactX,
              contactY
            };

            veh.x += col.pushX;
            veh.y += col.pushY;

            // Heavy vehicle damage & deformation proportional to impact speed
            applyVehicleDamageAndDeformation(veh, contactX, contactY, impactSpeed, 12, world, 14000, true);

            sound.playCollision(Math.min(1.0, impactSpeed / 80));

            if (player && (veh.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === veh.id))) {
              applyDriverVehicleCrashTrauma(player, impactSpeed, hitbox.displayNameRu, 1.2, veh);
            } else {
              if (isVehicleDisabledOrCrashed(veh)) {
                veh.turnSignal = 'hazard';
                veh.brakeLightsOn = true;
                veh.targetSpeed = 0;
                veh.speed = 0;
                veh.aiState = 'stopping_obstacle';
              } else {
                veh.aiState = 'reversing';
              }
            }
          } else {
            veh.x += col.pushX * 1.02;
            veh.y += col.pushY * 1.02;
            veh.speed *= 0.4;
            veh.vx *= 0.4;
            veh.vy *= 0.4;
          }
        }

        // Concrete chip dust debris
        for (let d = 0; d < 6; d++) {
          const dAngle = Math.random() * Math.PI * 2;
          const dSpeed = 25 + Math.random() * 60;
          world.particles.push({
            x: contactX,
            y: contactY,
            vx: Math.cos(dAngle) * dSpeed,
            vy: Math.sin(dAngle) * dSpeed,
            radius: 1.5 + Math.random() * 2,
            color: '#a8a29e',
            alpha: 0.85,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.3,
            type: 'debris'});
        }
        continue; // Indestructible: remains standing and intact
      }

      if (!veh.isPlayerControlled && (isVehicleDisabledOrCrashed(veh) || (veh.aiState === 'stopping_obstacle'&& Math.abs(veh.speed) < 2.0))) {
        // Stopped/crashed NPC cannot break props or gain speed from prop pushing
        veh.x += col.pushX * 1.02;
        veh.y += col.pushY * 1.02;
        veh.speed = 0;
        veh.vx = 0;
        veh.vy = 0;
        veh.angularVelocity = 0;
        veh.steerAngle = 0;
        continue;
      }

      if (Math.abs(veh.speed) < 12) {
        // Slow speed: push vehicle out of the prop so it cannot pass through it
        veh.x += col.pushX * 1.02;
        veh.y += col.pushY * 1.02;
        
        const pushLen = Math.hypot(col.pushX, col.pushY) || 1;
        const nx = col.pushX / pushLen;
        const ny = col.pushY / pushLen;
        const velInto = veh.vx * -nx + veh.vy * -ny;
        if (velInto > 0) {
          veh.vx += nx * velInto;
          veh.vy += ny * velInto;
          if (!veh.isPlayerControlled && (isVehicleDisabledOrCrashed(veh) || veh.aiState === 'stopping_obstacle')) {
            veh.speed = 0;
            veh.vx = 0;
            veh.vy = 0;
            veh.angularVelocity = 0;
            veh.steerAngle = 0;
          } else {
            veh.speed = Math.hypot(veh.vx, veh.vy) * Math.sign(veh.speed || 1);
          }
        }
        continue;
      }

      // Break prop!
      prop.isBroken = true;

      // If this was a master traffic light, break the intersection signal!
      if (prop.type === 'traffic_light'&& prop.isMasterLight && prop.intersectionId) {
        const inter = world.intersections.find(i => i.id === prop.intersectionId);
        if (inter) {
          inter.isSignalLost = true;
          trafficDiagnostics.log('light', `SIGNAL LOST: Master control box destroyed at ${inter.id.toUpperCase()}`, undefined, inter.id);
        }
      }

      const rawImpactSpeed = Math.abs(veh.speed);
      const propResistance = hitbox.resistance;

      prop.breakVX = Math.cos(veh.angle) * Math.max(35, rawImpactSpeed) * 0.8;
      prop.breakVY = Math.sin(veh.angle) * Math.max(35, rawImpactSpeed) * 0.8;
      prop.breakAngle = veh.angle + (Math.random() - 0.5) * 0.4;
      prop.breakSpin = (Math.random() - 0.5) * 10;

      sound.playPropBreak(prop.type);

      // Vehicle damage & deformation scaled by prop resistance
      applyVehicleDamageAndDeformation(veh, col.contactX, col.contactY, rawImpactSpeed * propResistance, 15, world, 120, true);

      if (player && (veh.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === veh.id))) {
        applyDriverVehicleCrashTrauma(player, rawImpactSpeed, hitbox.displayNameRu, propResistance, veh);
      }

      if (prop.type === 'hydrant') {
        prop.waterFountainTimer = 35;
        sound.playWaterSpray();
        // Create puddle under hydrant
        world.puddles.push({
          id: `puddle_hydrant_${Date.now()}`,
          x: prop.x,
          y: prop.y,
          radiusX: 25,
          radiusY: 18,
          angle: 0,
          rippleTimer: 0
        });
      }

      // Spawn tailored debris particles
      let debrisColor = '#64748b';
      let debrisCount = 8;
      if (prop.type === 'hydrant') { debrisColor = '#ef4444'; debrisCount = 10; }
      else if (prop.type === 'bench') { debrisColor = '#b45309'; debrisCount = 10; }
      else if (prop.type === 'bus_stop') { debrisColor = '#bae6fd'; debrisCount = 14; }
      else if (prop.type === 'dumpster') { debrisColor = '#15803d'; debrisCount = 12; }
      else if (prop.type === 'trash_can') { debrisColor = '#475569'; debrisCount = 8; }
      else if (prop.type === 'kiosk') { debrisColor = '#0284c7'; debrisCount = 14; }
      else if (prop.type === 'mailbox') { debrisColor = '#2563eb'; debrisCount = 8; }
      else if (prop.type === 'flowerbed') { debrisColor = '#15803d'; debrisCount = 10; }
      else if (prop.type === 'tire_flowerbed') { debrisColor = '#1e293b'; debrisCount = 10; }
      else if (prop.type === 'cone') { debrisColor = '#ea580c'; debrisCount = 6; }
      else if (prop.type === 'bollard') { debrisColor = '#334155'; debrisCount = 6; }
      else if (prop.type === 'traffic_light') { debrisColor = '#eab308'; debrisCount = 10; }
      else if (prop.type === 'lamp_highway'|| prop.type === 'lamp') { debrisColor = '#94a3b8'; debrisCount = 10; }

      for (let d = 0; d < debrisCount; d++) {
        const dAngle = Math.random() * Math.PI * 2;
        const dSpeed = 40 + Math.random() * 80;
        world.particles.push({
          x: col.contactX,
          y: col.contactY,
          vx: Math.cos(dAngle) * dSpeed,
          vy: Math.sin(dAngle) * dSpeed,
          radius: 1.5 + Math.random() * 2.8,
          color: debrisColor,
          alpha: 0.9,
          life: 0,
          maxLife: 0.4 + Math.random() * 0.4,
          type: 'debris'});
      }

      if (prop.type === 'lamp_highway'|| prop.type === 'lamp'|| prop.type === 'traffic_light') {
        for (let g = 0; g < 5; g++) {
          const gAngle = Math.random() * Math.PI * 2;
          const gSpeed = 30 + Math.random() * 55;
          world.particles.push({
            x: prop.x,
            y: prop.y,
            vx: Math.cos(gAngle) * gSpeed,
            vy: Math.sin(gAngle) * gSpeed,
            radius: 1.2 + Math.random() * 1.5,
            color: '#fef08a',
            alpha: 0.95,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.3,
            type: 'debris'});
        }
      }
      break;
    }
  }

  // 1b. SOFT GUARDRAILS & IMPACT ATTENUATORS PHYSICS
  GuardrailPhysics.updateVehicleGuardrailCollisions(world, player, dt);

  // 2. BIRDS FAUNA PHYSICS & SCARED FLIGHT
  for (const bird of world.birds) {
    if (bird.state === 'ground') {
      // Check proximity to player or any moving car
      let scare = false;
      const distToPlayer = Math.hypot(player.x - bird.x, player.y - bird.y);
      if (distToPlayer < 65) scare = true;

      if (!scare) {
        const vehiclesToCheck = vehGrid ? vehGrid.queryRadius(bird.x, bird.y, 80, scratchVehicleSet) : world.vehicles;
        for (const veh of vehiclesToCheck) {
          if (Math.abs(veh.speed) > 10 && Math.hypot(veh.x - bird.x, veh.y - bird.y) < 80) {
            scare = true;
            break;
          }
        }
      }

      if (scare) {
        bird.state = 'flying';
        const escapeAngle = Math.random() * Math.PI * 2;
        bird.flyVX = Math.cos(escapeAngle) * (80 + Math.random() * 40);
        bird.flyVY = Math.sin(escapeAngle) * (80 + Math.random() * 40) - 30; // fly upward
        sound.playBirdFlap();
      } else {
        // Occasional walking
        if (bird.walkTimer === undefined) bird.walkTimer = Math.random() * 5;
        bird.walkTimer -= dt;
        
        if (bird.walkTimer <= 0) {
          if (Math.random() < 0.4) {
            // Take a few steps
            bird.flyVX = (Math.random() - 0.5) * 20;
            bird.flyVY = (Math.random() - 0.5) * 20;
            if (bird.groupId) {
              // Bias movement towards group center
              const group = world.birds.filter(b => b.groupId === bird.groupId && b.state === 'ground');
              if (group.length > 1) {
                const cx = group.reduce((sum, b) => sum + b.x, 0) / group.length;
                const cy = group.reduce((sum, b) => sum + b.y, 0) / group.length;
                const distToCenter = Math.hypot(cx - bird.x, cy - bird.y);
                if (distToCenter > 30) {
                  bird.flyVX += (cx - bird.x) * 0.5;
                  bird.flyVY += (cy - bird.y) * 0.5;
                }
              }
            }
            bird.angle = Math.atan2(bird.flyVY, bird.flyVX);
            bird.walkTimer = 0.5 + Math.random() * 1.5;
          } else {
            // Stop and rest
            bird.flyVX = 0;
            bird.flyVY = 0;
            bird.walkTimer = 2 + Math.random() * 4;
          }
        }
        
        if (bird.flyVX !== 0 || bird.flyVY !== 0) {
          bird.x += bird.flyVX * dt;
          bird.y += bird.flyVY * dt;
          bird.wingCycle += dt * 15; // Fast leg/bob cycle when walking
          // Friction
          bird.flyVX *= (1 - dt * 5);
          bird.flyVY *= (1 - dt * 5);
          if (Math.abs(bird.flyVX) < 1 && Math.abs(bird.flyVY) < 1) {
            bird.flyVX = 0;
            bird.flyVY = 0;
          }
        }
      }
    } else {
      // Flying bird dynamics
      bird.x += bird.flyVX * dt;
      bird.y += bird.flyVY * dt;
      bird.altitude = Math.min(120, bird.altitude + dt * 65);
      bird.wingCycle += dt * 24;
      bird.angle = Math.atan2(bird.flyVY, bird.flyVX);

      // Despawn / wrap around bird far off map
      if (bird.x < -100 || bird.x > world.width + 100 || bird.y < -100 || bird.y > world.height + 100) {
        bird.x = player.x + (Math.random() * 600 - 300);
        bird.y = player.y + (Math.random() * 600 - 300);
        bird.state = 'ground';
        bird.altitude = 0;
      }
    }
  }

  // 3. PUDDLE SPLASHES & EVAPORATION
  for (let i = world.puddles.length - 1; i >= 0; i--) {
    const puddle = world.puddles[i];
    puddle.rippleTimer += dt;
    
    // Evaporation if not raining and not a pond
    if (!isRaining && !puddle.isPond) {
      puddle.radiusX -= dt * 0.5;
      puddle.radiusY -= dt * 0.5;
      if (puddle.radiusX <= 0 || puddle.radiusY <= 0) {
        world.puddles.splice(i, 1);
        continue;
      }
    }
    
    for (const veh of world.vehicles) {
      if (Math.abs(veh.speed) > 25) {
        if (Math.hypot(veh.x - puddle.x, veh.y - puddle.y) < puddle.radiusX + 10) {
          if (Math.random() < 0.3) {
            world.particles.push({
              x: veh.x + (Math.random() * 12 - 6),
              y: veh.y + (Math.random() * 12 - 6),
              vx: (Math.random() * 60 - 30),
              vy: (Math.random() * 60 - 30),
              radius: 3 + Math.random() * 3,
              color: '#93c5fd',
              alpha: 0.75,
              life: 0,
              maxLife: 0.35,
              type: 'water_splash'});
          }
        }
      }
    }
  }

  // 3b. JANITOR CLEANUP
  const janitors = world.pedestrians.filter(p => p.isJanitor && p.state === 'walking');
  if (world.litter) {
    for (let i = world.litter.length - 1; i >= 0; i--) {
      const lit = world.litter[i];
      for (const janitor of janitors) {
        if (Math.hypot(janitor.x - lit.x, janitor.y - lit.y) < 30 && !lit.isAirborne) {
          world.litter.splice(i, 1);
          break; // Stop checking janitors for this litter piece
        }
      }
    }
  }

  // 4. LITTER & FLYING PAPER WIND PHYSICS
  if (world.litter) {
    for (const lit of world.litter) {
      lit.x += lit.vx * dt;
      lit.y += lit.vy * dt;
      lit.angle += lit.rotationSpeed * dt;

      // Friction / air resistance
      lit.vx *= (1 - dt * 2.5);
      lit.vy *= (1 - dt * 2.5);
      lit.rotationSpeed *= (1 - dt * 2.0);

      // Check proximity to vehicles to launch paper/newspapers into air (Wind Draft)
      if (lit.type === 'paper'|| lit.type === 'newspaper'|| lit.type === 'leaf') {
        for (const veh of world.vehicles) {
          if (Math.abs(veh.speed) > 25) {
            const dist = Math.hypot(veh.x - lit.x, veh.y - lit.y);
            if (dist < 60) {
              lit.isAirborne = true;
              lit.airborneTimer = 2.0;
              const blowAngle = veh.angle + (Math.random() * 0.6 - 0.3);
              const blowSpeed = Math.abs(veh.speed) * 0.6 + 30;
              lit.vx = Math.cos(blowAngle) * blowSpeed;
              lit.vy = Math.sin(blowAngle) * blowSpeed - 20; // Fly up
              lit.rotationSpeed = (Math.random() - 0.5) * 8;
              break;
            }
          }
        }
      }
      
      // COLLISION WITH VEHICLES/PLAYER
      for (const veh of world.vehicles) {
        const dist = Math.hypot(veh.x - lit.x, veh.y - lit.y);
        const radius = 30;
        
        if (dist < radius) {
          const pushAngle = Math.atan2(lit.y - veh.y, lit.x - veh.x);
          const pushForce = Math.abs(veh.speed) * 0.5 + 10;
          lit.vx = Math.cos(pushAngle) * pushForce;
          lit.vy = Math.sin(pushAngle) * pushForce;
          lit.rotationSpeed = (Math.random() - 0.5) * 4;
        }
      }

      // Check proximity to pedestrians to kick cups/cans
      if (lit.type === 'cup'|| lit.type === 'can') {
        for (const ped of world.pedestrians) {
          const dist = Math.hypot(ped.x - lit.x, ped.y - lit.y);
          if (dist < 14) {
            const kickAngle = ped.angle;
            lit.vx += Math.cos(kickAngle) * 45;
            lit.vy += Math.sin(kickAngle) * 45;
            lit.rotationSpeed += (Math.random() - 0.5) * 12;
            break;
          }
        }
      }

      // Airborne timer & flutter
      if (lit.isAirborne) {
        lit.airborneTimer = (lit.airborneTimer || 0) - dt;
        lit.altitude = Math.min(35, (lit.altitude || 0) + dt * 25);
        if ((lit.airborneTimer || 0) <= 0) {
          lit.isAirborne = false;
        }
      } else {
        lit.altitude = Math.max(0, (lit.altitude || 0) - dt * 30);
      }
    }
  }

  // 5. WIPERS ON VEHICLES
  for (const veh of world.vehicles) {
    const shouldSweep = veh.isPlayerControlled ? !!veh.wipersOn : (isRaining && !veh.isParked);
    if (shouldSweep) {
      veh.wiperDir = veh.wiperDir || 1;
      veh.wiperAngle = (veh.wiperAngle || 0) + veh.wiperDir * dt * 5.0;
      if (veh.wiperAngle > 0.8) {
        veh.wiperAngle = 0.8;
        veh.wiperDir = -1;
      } else if (veh.wiperAngle < -0.8) {
        veh.wiperAngle = -0.8;
        veh.wiperDir = 1;
      }
    } else {
      // Return wipers slowly to standard park position (-0.8 radians)
      if (veh.wiperAngle !== undefined && veh.wiperAngle !== -0.8) {
        veh.wiperAngle -= dt * 3.5;
        if (veh.wiperAngle < -0.8) veh.wiperAngle = -0.8;
      }
    }
  }

  // 5. STORM LIGHTNING & THUNDER
  if (world.weather === 'storm') {
    if (Math.random() < 0.0035) { // Thunder strike chance
      world.lightningFlashTimer = 0.38;
      const strikeCenterX = (player.x || 1000) + (Math.random() - 0.5) * 600;
      const strikeCenterY = (player.y || 1000) + (Math.random() - 0.5) * 400;
      world.lightningStrike = {
        startX: strikeCenterX + (Math.random() - 0.5) * 350,
        startY: strikeCenterY - 650,
        endX: strikeCenterX + (Math.random() - 0.5) * 200,
        endY: strikeCenterY + 150,
        seed: Math.random() * 1000,
        intensity: 1.0
      };
      sound.playThunder();
    }
  }
  if ((world.lightningFlashTimer ?? 0) > 0) {
    world.lightningFlashTimer = (world.lightningFlashTimer ?? 0) - dt;
    if (world.lightningFlashTimer <= 0) {
      world.lightningStrike = null;
    }
  }
}

export interface BuildingEntranceInfo {
  x: number;
  y: number;
  side: 'north'| 'south'| 'east'| 'west';
  offsetRatio: number;
  number: number;
}

export function getAllBuildingEntrances(bld: Building): BuildingEntranceInfo[] {
  const result: BuildingEntranceInfo[] = [];
  if (bld.entrances && bld.entrances.length > 0) {
    for (let i = 0; i < bld.entrances.length; i++) {
      const ent = bld.entrances[i];
      let ex = 0;
      let ey = 0;

      const hasDirectPos = (ent as any).x !== undefined && (ent as any).y !== undefined &&
                           Number.isFinite((ent as any).x) && Number.isFinite((ent as any).y);

      let ratio = ent.offsetRatio;
      if (ratio === undefined || !Number.isFinite(ratio)) {
        if (hasDirectPos) {
          if (ent.side === 'west'|| ent.side === 'east') {
            ratio = Math.max(0, Math.min(1, ((ent as any).y - bld.y) / (bld.height || 1)));
          } else {
            ratio = Math.max(0, Math.min(1, ((ent as any).x - bld.x) / (bld.width || 1)));
          }
        } else {
          ratio = 0.5;
        }
      }

      if (hasDirectPos) {
        ex = (ent as any).x;
        ey = (ent as any).y;
      } else {
        const side = ent.side || 'south';
        if (side === 'north') {
          ex = bld.x + bld.width * ratio;
          ey = bld.y;
        } else if (side === 'south') {
          ex = bld.x + bld.width * ratio;
          ey = bld.y + bld.height;
        } else if (side === 'west') {
          ex = bld.x;
          ey = bld.y + bld.height * ratio;
        } else if (side === 'east') {
          ex = bld.x + bld.width;
          ey = bld.y + bld.height * ratio;
        } else {
          ex = bld.x + bld.width * ratio;
          ey = bld.y + bld.height;
        }
      }

      if (!Number.isFinite(ex)) ex = bld.x + bld.width / 2;
      if (!Number.isFinite(ey)) ey = bld.y + bld.height;

      result.push({
        x: ex,
        y: ey,
        side: ent.side || 'south',
        offsetRatio: ratio,
        number: ent.number ?? (i + 1)
      });
    }
  } else if (bld.entranceSide) {
    let ex = bld.x + bld.width / 2;
    let ey = bld.y + bld.height;
    if (bld.entranceSide === 'north') {
      ex = bld.x + bld.width / 2;
      ey = bld.y;
    } else if (bld.entranceSide === 'west') {
      ex = bld.x;
      ey = bld.y + bld.height / 2;
    } else if (bld.entranceSide === 'east') {
      ex = bld.x + bld.width;
      ey = bld.y + bld.height / 2;
    }
    result.push({
      x: ex,
      y: ey,
      side: bld.entranceSide,
      offsetRatio: 0.5,
      number: 1
    });
  } else {
    result.push({
      x: bld.x + bld.width / 2,
      y: bld.y + bld.height,
      side: 'south',
      offsetRatio: 0.5,
      number: 1
    });
  }
  return result;
}

export function getBuildingEntrancePos(bld: Building): { x: number; y: number } {
  const ents = getAllBuildingEntrances(bld);
  return { x: ents[0].x, y: ents[0].y };
}

// ============================================================================
// TRAILER & TOW HITCH SYSTEM PHYSICS
// ============================================================================

export function updateTowingRopesPhysics(world: GameWorld, dt: number, player: Player) {
  // 1. Simulate active physical ropes between connected vehicles
  if (world.towingRopes && world.towingRopes.length > 0) {
    const activeRopes = [];
    for (const rope of world.towingRopes) {
      const vehA = world.vehicles.find(v => v.id === rope.vehicleAId);
      const vehB = world.vehicles.find(v => v.id === rope.vehicleBId);

      if (!vehA || !vehB) {
        // One of the connected vehicles was deleted or destroyed -> Drop rope
        continue;
      }

      // Decrement audio/haptic cooldowns
      rope.jerkCooldown = Math.max(0, (rope.jerkCooldown || 0) - dt);
      rope.groanCooldown = Math.max(0, (rope.groanCooldown || 0) - dt);

      // Determine attachment point coordinates on bumper of Vehicle A
      const cfgA = CAR_CONFIGS[vehA.type] || CAR_CONFIGS.sedan;
      const cosA = Math.cos(vehA.angle);
      const sinA = Math.sin(vehA.angle);
      const ax = vehA.x + (rope.isFrontA ? 1 : -1) * cosA * (cfgA.length / 2 + 1);
      const ay = vehA.y + (rope.isFrontA ? 1 : -1) * sinA * (cfgA.length / 2 + 1);

      // Determine attachment point coordinates on bumper of Vehicle B
      const cfgB = CAR_CONFIGS[vehB.type] || CAR_CONFIGS.sedan;
      const cosB = Math.cos(vehB.angle);
      const sinB = Math.sin(vehB.angle);
      const bx = vehB.x + (rope.isFrontB ? 1 : -1) * cosB * (cfgB.length / 2 + 1);
      const by = vehB.y + (rope.isFrontB ? 1 : -1) * sinB * (cfgB.length / 2 + 1);

      const numNodes = rope.segments.length;
      if (numNodes < 2) continue;

      // Pin first and last nodes of rope to bumper anchors
      rope.segments[0].x = ax;
      rope.segments[0].y = ay;
      rope.segments[0].oldX = ax;
      rope.segments[0].oldY = ay;

      rope.segments[numNodes - 1].x = bx;
      rope.segments[numNodes - 1].y = by;
      rope.segments[numNodes - 1].oldX = bx;
      rope.segments[numNodes - 1].oldY = by;

      // Verlet Integration for intermediate nodes of the rope
      const friction = 0.82;
      for (let i = 1; i < numNodes - 1; i++) {
        const node = rope.segments[i];
        const rvx = (node.x - node.oldX) * friction;
        const rvy = (node.y - node.oldY) * friction;

        node.oldX = node.x;
        node.oldY = node.y;

        node.x += rvx;
        node.y += rvy;
      }

      // Relaxation constraints (Verlet stiffness iterations)
      const targetSegLen = rope.maxLength / (numNodes - 1);
      const iterations = 10;
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < numNodes - 1; i++) {
          const n1 = rope.segments[i];
          const n2 = rope.segments[i + 1];

          const rdx = n2.x - n1.x;
          const rdy = n2.y - n1.y;
          const rd = Math.hypot(rdx, rdy) || 0.001;
          const diff = (rd - targetSegLen) / rd;

          const isN1Fixed = (i === 0);
          const isN2Fixed = (i + 1 === numNodes - 1);

          if (isN1Fixed && !isN2Fixed) {
            n2.x -= rdx * diff;
            n2.y -= rdy * diff;
          } else if (!isN1Fixed && isN2Fixed) {
            n1.x += rdx * diff;
            n1.y += rdy * diff;
          } else if (!isN1Fixed && !isN2Fixed) {
            n1.x += rdx * diff * 0.5;
            n1.y += rdy * diff * 0.5;
            n2.x -= rdx * diff * 0.5;
            n2.y -= rdy * diff * 0.5;
          }
        }
      }

      // --- TOWING CONSTRAINT FORCE & DYNAMIC TENSION ---
      const dx = bx - ax;
      const dy = by - ay;
      const dist = Math.hypot(dx, dy);

      const prevDist = rope.lastDistance || dist;
      rope.lastDistance = dist;

      const isSlack = dist < rope.maxLength;
      rope.isTaut = !isSlack;
      rope.slackAmount = rope.maxLength - dist;

      if (dist > rope.maxLength) {
        const excess = dist - rope.maxLength;
        const tensionVal = Math.min(2.0, excess / 16.0);
        rope.tension = tensionVal;
        rope.vibration = Math.min(1.0, tensionVal * 0.9);

        // Mass ratio calculation including cargo & fluids
        let massA = (cfgA.mass || 1500);
        let massB = (cfgB.mass || 1500);
        if (vehA.fluidTank) massA += (vehA.fluidTank.currentVolume ?? 0);
        if (vehB.fluidTank) massB += (vehB.fluidTank.currentVolume ?? 0);
        if ((vehA as any).cargoMass) massA += (vehA as any).cargoMass;
        if ((vehB as any).cargoMass) massB += (vehB as any).cargoMass;

        const totalMass = massA + massB;
        const ratioA = massB / totalMass;
        const ratioB = massA / totalMass;

        // Determine which vehicle is active towing vs towed
        const isPullingForward = (vehA.speed > 0.5 || vehA.engineState?.engineRunning);
        const towingCar = isPullingForward ? vehA : vehB;
        const towedCar = isPullingForward ? vehB : vehA;
        const towedCfg = isPullingForward ? cfgB : cfgA;
        const isTowedFront = isPullingForward ? rope.isFrontB : rope.isFrontA;

        // Dynamic Jerk / Shock Load when transitioning from slack to taut under speed
        const relVx = vehB.vx - vehA.vx;
        const relVy = vehB.vy - vehA.vy;
        const relSpeed = Math.hypot(relVx, relVy);

        if (prevDist <= rope.maxLength + 1.0 && excess > 1.5 && relSpeed > 6.0 && rope.jerkCooldown <= 0) {
          const jerkPower = Math.min(2.5, (excess * 0.15) + (relSpeed / 12.0));
          sound.playRopeJerk(jerkPower);
          rope.jerkCooldown = 0.45;

          // Shock load affects towing vehicle engine
          if (towingCar.engineState?.engineRunning) {
            const eng = towingCar.engineState;
            eng.engineRPM = Math.max(0, eng.engineRPM - 380 * jerkPower);
            if (eng.transmissionType === 'MANUAL' && eng.currentGear > 2 && eng.engineRPM < 450) {
              eng.engineRunning = false;
              eng.isStalled = true;
              sound.playEngineStall();
              if (player && player.vehicleId === towingCar.id) {
                addPlayerNotification(player, 'Двигатель заглох от резкого рывка троса! Начинайте буксировку плавно с 1-й передачи.', 'warning');
              }
            }
          }

          // Extreme shock load snapping check (> 45 px/s relative speed with heavy total mass)
          if (relSpeed > 45 && totalMass > 3600 && Math.random() < 0.4) {
            sound.playRopeSnap();
            if (player && (player.vehicleId === vehA.id || player.vehicleId === vehB.id || Math.hypot(player.x - ax, player.y - ay) < 400)) {
              addPlayerNotification(player, 'Буксировочный трос лопнул от критического динамического рывка!', 'warning');
            }
            continue; // Break rope
          }
        } else if (tensionVal > 0.6 && rope.groanCooldown <= 0) {
          sound.playRopeTension();
          rope.groanCooldown = 0.75;
        }

        // Direct position correction
        const pullA_X = (dx / dist) * excess * ratioA * 0.40;
        const pullA_Y = (dy / dist) * excess * ratioA * 0.40;
        const pullB_X = -(dx / dist) * excess * ratioB * 0.40;
        const pullB_Y = -(dy / dist) * excess * ratioB * 0.40;

        vehA.x += pullA_X;
        vehA.y += pullA_Y;
        vehB.x += pullB_X;
        vehB.y += pullB_Y;

        // Apply physical pulling velocity impulse
        const impulseScale = 4.4;
        const ux = dx / dist;
        const uy = dy / dist;

        vehA.vx += ux * excess * ratioA * impulseScale * dt;
        vehA.vy += uy * excess * ratioA * impulseScale * dt;
        vehB.vx -= ux * excess * ratioB * impulseScale * dt;
        vehB.vy -= uy * excess * ratioB * impulseScale * dt;

        // --- REALISTIC AUTO-STEERING & CASTOR ALIGNMENT FOR TOWED VEHICLE ---
        // Release unattended towed vehicle handbrake/parked state so it rolls freely
        if (!towedCar.isPlayerControlled) {
          towedCar.isParked = false;
        }

        // Vector from towed vehicle anchor towards towing vehicle anchor
        const towAnchorX = isPullingForward ? ax : bx;
        const towAnchorY = isPullingForward ? ay : by;
        const myAnchorX = isPullingForward ? bx : ax;
        const myAnchorY = isPullingForward ? by : ay;

        const pullDirX = towAnchorX - myAnchorX;
        const pullDirY = towAnchorY - myAnchorY;
        const pullAngle = Math.atan2(pullDirY, pullDirX);

        if (isTowedFront) {
          // Attached to front bumper of towed car:
          // Front steering wheels naturally pivot into the direction of pull (caster angle physics)
          let angleDiff = pullAngle - towedCar.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          const maxSteerRad = 0.65; // ~37 degrees max lock
          const targetSteer = Math.max(-maxSteerRad, Math.min(maxSteerRad, angleDiff * 1.1));
          towedCar.steerAngle = (towedCar.steerAngle || 0) + (targetSteer - (towedCar.steerAngle || 0)) * Math.min(1.0, dt * 9.0);

          // Bicycle model turning rate: dAngle/dt = (v / wheelbase) * sin(steerAngle)
          const forwardSpeed = towedCar.vx * Math.cos(towedCar.angle) + towedCar.vy * Math.sin(towedCar.angle);
          const effectiveWheelBase = towedCfg.length * 0.68;
          const turnRate = (forwardSpeed / Math.max(12, effectiveWheelBase)) * Math.sin(towedCar.steerAngle);
          
          towedCar.angle += turnRate * dt;

          // Align towed car velocity along its rolling axis with high lateral tire grip (no sideways ice skating)
          const headCos = Math.cos(towedCar.angle);
          const headSin = Math.sin(towedCar.angle);
          const longSpeed = towedCar.vx * headCos + towedCar.vy * headSin;
          const latSpeed = -towedCar.vx * headSin + towedCar.vy * headCos;

          const lateralDamp = 0.88; // 88% lateral slip damping per frame
          towedCar.vx = headCos * longSpeed + (-headSin * latSpeed * (1 - lateralDamp));
          towedCar.vy = headSin * longSpeed + (headCos * latSpeed * (1 - lateralDamp));
          towedCar.speed = longSpeed;
        } else {
          // Attached to rear bumper of towed car (backward towing)
          let revAngleDiff = pullAngle - (towedCar.angle + Math.PI);
          while (revAngleDiff > Math.PI) revAngleDiff -= Math.PI * 2;
          while (revAngleDiff < -Math.PI) revAngleDiff += Math.PI * 2;
          towedCar.angle += revAngleDiff * Math.min(1.0, dt * 6.0);
          
          const headCos = Math.cos(towedCar.angle);
          const headSin = Math.sin(towedCar.angle);
          towedCar.speed = towedCar.vx * headCos + towedCar.vy * headSin;
        }

        // Project velocities to driving speeds for towing car
        const cosAngleA = Math.cos(vehA.angle);
        const sinAngleA = Math.sin(vehA.angle);
        vehA.speed = vehA.vx * cosAngleA + vehA.vy * sinAngleA;

        // --- BUMP / PUSH STARTING MECHANIC ("ЗАПУСК С ТОЛКАЧА") ---
        const towedEng = towedCar.engineState;
        if (towedEng && !towedEng.engineRunning && towedEng.ignition !== false && !towedEng.isDieselRunaway) {
          if (towedEng.transmissionType === 'MANUAL' && towedEng.currentGear !== 0) {
            const clutchEngaged = (towedEng.clutchPedal ?? 1) > 0.45;
            if (clutchEngaged) {
              const vKmh = Math.abs(towedCar.speed) * PX_S_TO_SPEED_KMH;
              const gearRatio = Math.abs(towedEng.gearRatios?.[towedEng.currentGear + 1] || 2.2);
              const crankRPM = Math.min(3200, (vKmh / 45) * 1900 * gearRatio);
              towedEng.engineRPM = Math.max(towedEng.engineRPM || 0, crankRPM);

              // Engine compression drag slows down towing car
              if (crankRPM > 180) {
                const compressDrag = 0.22 * (crankRPM / 1000);
                towingCar.speed = Math.max(0, towingCar.speed - compressDrag * dt * 25);
              }

              // Bump start ignition threshold: > 10.5 km/h and RPM > 480
              const towedFuel = (towedCar as any).fuelState;
              const hasFuel = towedFuel ? (towedFuel.tankLevel > 0 || (towedCar.hasGBO && (towedFuel.gboLevel ?? 0) > 0)) : ((towedCar as any).fuel !== undefined ? (towedCar as any).fuel > 0 : true);
              const noHydrolock = !towedCar.damage?.engineFire && !towedEng.hydrolocked && !towedEng.isSeized;

              if (vKmh >= 10.5 && towedEng.engineRPM >= 480 && hasFuel && noHydrolock) {
                towedEng.engineRunning = true;
                towedEng.isStalled = false;
                towedEng.engineRPM = Math.max(850, towedEng.engineRPM);
                sound.startEngine();

                // Spawn exhaust smoke burst
                const exCos = Math.cos(towedCar.angle);
                const exSin = Math.sin(towedCar.angle);
                const exX = towedCar.x - exCos * (towedCfg.length * 0.48);
                const exY = towedCar.y - exSin * (towedCfg.length * 0.48);
                for (let p = 0; p < 8; p++) {
                  world.particles.push({
                    x: exX + (Math.random() * 6 - 3),
                    y: exY + (Math.random() * 6 - 3),
                    vx: -exCos * (20 + Math.random() * 20) + (Math.random() * 10 - 5),
                    vy: -exSin * (20 + Math.random() * 20) + (Math.random() * 10 - 5),
                    radius: 4.5 + Math.random() * 4.0,
                    color: '#334155',
                    alpha: 0.85,
                    life: 0,
                    maxLife: 0.65 + Math.random() * 0.4,
                    type: 'engine_smoke'
                  } as any);
                }

                if (player && (player.vehicleId === towedCar.id || player.vehicleId === towingCar.id)) {
                  addPlayerNotification(player, 'Двигатель успешно запущен с буксира (с толкача)!', 'heal');
                }
              }
            }
          }
        }
      } else {
        // Slack rope state
        rope.tension = 0;
        rope.vibration = 0;
      }

      activeRopes.push(rope);
    }
    world.towingRopes = activeRopes;
  }

  // 2. Simulate dragging rope if player is holding one end
  if (player && player.heldTowRope) {
    const rope = player.heldTowRope;
    const veh = world.vehicles.find(v => v.id === rope.vehicleId);
    if (!veh) {
      player.heldTowRope = null;
      return;
    }

    const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
    const cosA = Math.cos(veh.angle);
    const sinA = Math.sin(veh.angle);
    const ax = veh.x + (rope.isFront ? 1 : -1) * cosA * (cfg.length / 2 + 1);
    const ay = veh.y + (rope.isFront ? 1 : -1) * sinA * (cfg.length / 2 + 1);

    const numNodes = rope.segments.length;
    if (numNodes < 2) return;

    // Hand position for nozzle/rope end (directly at player body)
    const px = player.x;
    const py = player.y;

    // Max reach constraint (pull player back)
    const dx = px - ax;
    const dy = py - ay;
    const totalDist = Math.hypot(dx, dy);

    if (totalDist > rope.maxLength) {
      const excess = totalDist - rope.maxLength;
      player.x -= (dx / totalDist) * excess;
      player.y -= (dy / totalDist) * excess;

      // Dampen player speed
      const dot = (player.vx * dx + player.vy * dy) / totalDist;
      if (dot > 0) {
        player.vx -= (dx / totalDist) * dot * 0.9;
        player.vy -= (dy / totalDist) * dot * 0.9;
      }
    }

    // Pin end points
    rope.segments[0].x = ax;
    rope.segments[0].y = ay;
    rope.segments[0].oldX = ax;
    rope.segments[0].oldY = ay;

    rope.segments[numNodes - 1].x = player.x;
    rope.segments[numNodes - 1].y = player.y;
    rope.segments[numNodes - 1].oldX = player.x;
    rope.segments[numNodes - 1].oldY = player.y;

    // Integrate Verlet nodes
    const friction = 0.85;
    for (let i = 1; i < numNodes - 1; i++) {
      const node = rope.segments[i];
      const rvx = (node.x - node.oldX) * friction;
      const rvy = (node.y - node.oldY) * friction;

      node.oldX = node.x;
      node.oldY = node.y;

      node.x += rvx;
      node.y += rvy;
    }

    // Distance constraints
    const targetSegLen = rope.maxLength / (numNodes - 1);
    const iterations = 10;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < numNodes - 1; i++) {
        const n1 = rope.segments[i];
        const n2 = rope.segments[i + 1];

        const rdx = n2.x - n1.x;
        const rdy = n2.y - n1.y;
        const rd = Math.hypot(rdx, rdy) || 0.001;
        const diff = (rd - targetSegLen) / rd;

        const isN1Fixed = (i === 0);
        const isN2Fixed = (i + 1 === numNodes - 1);

        if (isN1Fixed && !isN2Fixed) {
          n2.x -= rdx * diff;
          n2.y -= rdy * diff;
        } else if (!isN1Fixed && isN2Fixed) {
          n1.x += rdx * diff;
          n1.y += rdy * diff;
        } else if (!isN1Fixed && !isN2Fixed) {
          n1.x += rdx * diff * 0.5;
          n1.y += rdy * diff * 0.5;
          n2.x -= rdx * diff * 0.5;
          n2.y -= rdy * diff * 0.5;
        }
      }
    }
  }
}

export function updateTrailerTowingPhysics(world: GameWorld, dt: number) {
  for (const veh of world.vehicles) {
    if (!veh.trailerId) continue;
    const trailer = world.vehicles.find(v => v.id === veh.trailerId);
    if (!trailer) {
      veh.trailerId = null;
      continue;
    }
    trailer.towedById = veh.id;
    trailer.isTrailer = true;
    trailer.isParked = false;

    // Duplicate all lights, signals and braking state from the towing vehicle to the trailer only if electrical plug is connected manually
    const needsPlug = trailer.type !== 'trailer_barrel';
    const isPlugConnected = !needsPlug || trailer.trailerPlugConnected;
    if (isPlugConnected) {
      trailer.turnSignal = veh.turnSignal;
      trailer.turnSignalTimer = veh.turnSignalTimer;
      trailer.brakeLightsOn = veh.brakeLightsOn;
      trailer.isReversing = !!veh.isReversing;
      trailer.headlightsOn = veh.headlightsOn;
      trailer.headlightMode = veh.headlightMode;
    } else {
      trailer.turnSignal = 'none';
      trailer.brakeLightsOn = false;
      trailer.isReversing = false;
      trailer.headlightsOn = false;
    }

    // Tow hitch ball position on towing vehicle (rear)
    const vehCfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
    const vehHalfL = vehCfg.length / 2;
    const hitchOffset = veh.hitchOffset !== undefined ? veh.hitchOffset : (vehCfg.hitchOffset !== undefined ? vehCfg.hitchOffset : -vehHalfL - 2);

    const cosV = Math.cos(veh.angle);
    const sinV = Math.sin(veh.angle);
    const hitchX = veh.x + cosV * hitchOffset;
    const hitchY = veh.y + sinV * hitchOffset;

    // Trailer details
    const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
    const trailerHalfL = trailerCfg.length / 2;

    const oldX = trailer.x;
    const oldY = trailer.y;

    if (trailer.type === 'trailer_flatbed_2axle'|| trailer.trailerType === 'turntable_dolly_2axle') {
      // 2-Axle Turntable Dolly Farm Trailer (2-PTS-4):
      // - Front turntable dolly pivot P sits at front of chassis
      // - Front axle and drawbar are mounted on the dolly and swivel around P
      // - Rear axle R sits at rear of chassis
      // Modeled as two mathematically chained Tractrix barrels for rock-solid stability:
      // 1. Dolly drawbar to towing vehicle hitch (first barrel)
      // 2. Trailer body to dolly turntable pivot (second barrel with persistent rear axle)
      const pivotDist = trailerHalfL * 0.44; // Distance from chassis center to front turntable pivot (~15px)
      const rearAxleDist = trailerHalfL * 0.56; // Distance from chassis center to rear fixed axle (~19px)
      const bodyWheelBase = pivotDist + rearAxleDist; // Total wheelbase between turntable pivot and rear axle (~34px)
      const drawbarL = trailer.drawbarLength || 20; // Length from turntable pivot to hitch ring coupler

      if (trailer.trailerDollyAngle === undefined) {
        trailer.trailerDollyAngle = trailer.angle;
      }

      // Initialize persistent, decoupled dolly coordinates if they don't exist
      if (trailer.trailerDollyX === undefined || trailer.trailerDollyY === undefined) {
        trailer.trailerDollyX = trailer.x + Math.cos(trailer.angle) * pivotDist;
        trailer.trailerDollyY = trailer.y + Math.sin(trailer.angle) * pivotDist;
      }

      // Initialize persistent rear axle coordinates if they don't exist
      if (trailer.trailerRearX === undefined || trailer.trailerRearY === undefined) {
        trailer.trailerRearX = trailer.x - Math.cos(trailer.angle) * rearAxleDist;
        trailer.trailerRearY = trailer.y - Math.sin(trailer.angle) * rearAxleDist;
      }

      // Step 2: First Barrel: Dolly drawbar points towards tow hitch ball
      const dxDolly = hitchX - trailer.trailerDollyX;
      const dyDolly = hitchY - trailer.trailerDollyY;
      const distDolly = Math.hypot(dxDolly, dyDolly);

      if (distDolly > 0.001) {
        trailer.trailerDollyAngle = Math.atan2(dyDolly, dxDolly);
      }

      // Step 3: Set new position of dolly turntable pivot from hitch using the dolly angle
      const newDollyX = hitchX - Math.cos(trailer.trailerDollyAngle) * drawbarL;
      const newDollyY = hitchY - Math.sin(trailer.trailerDollyAngle) * drawbarL;

      // Update persistent dolly coordinates for next frame
      trailer.trailerDollyX = newDollyX;
      trailer.trailerDollyY = newDollyY;

      // Step 4: Second Barrel: Trailer body behaves as a trailer hitched to the new turntable pivot
      // Persistent rear axle position ensures zero feedback oscillation and pristine straight-line tracking
      const dxBody = newDollyX - trailer.trailerRearX;
      const dyBody = newDollyY - trailer.trailerRearY;
      const distBody = Math.hypot(dxBody, dyBody);

      if (distBody > 0.001) {
        trailer.angle = Math.atan2(dyBody, dxBody);
      }

      // Step 5: Update rear axle and trailer chassis coordinates based on the new body angle and pivot position
      const newRearX = newDollyX - Math.cos(trailer.angle) * bodyWheelBase;
      const newRearY = newDollyY - Math.sin(trailer.angle) * bodyWheelBase;
      trailer.trailerRearX = newRearX;
      trailer.trailerRearY = newRearY;

      trailer.x = newDollyX - Math.cos(trailer.angle) * pivotDist;
      trailer.y = newDollyY - Math.sin(trailer.angle) * pivotDist;

      trailer.vx = (trailer.x - oldX) / Math.max(0.001, dt);
      trailer.vy = (trailer.y - oldY) / Math.max(0.001, dt);
      trailer.speed = veh.speed * Math.cos(veh.angle - trailer.angle);

    } else if (trailer.type.startsWith('trailer_semi')) {
      // Semi-Trailer (Fifth-Wheel Coupling)
      // Acts exactly like the second barrel of a dolly trailer, with persistent rear axle
      const couplerOffset = trailer.couplerOffset !== undefined ? trailer.couplerOffset : (trailerCfg.couplerOffset !== undefined ? trailerCfg.couplerOffset : 50);
      const rearAxleOffset = trailerCfg.wheelBase / 2;
      const bodyWheelBase = couplerOffset + rearAxleOffset;

      if (trailer.trailerRearX === undefined || trailer.trailerRearY === undefined) {
        trailer.trailerRearX = trailer.x - Math.cos(trailer.angle) * rearAxleOffset;
        trailer.trailerRearY = trailer.y - Math.sin(trailer.angle) * rearAxleOffset;
      }

      const dxBody = hitchX - trailer.trailerRearX;
      const dyBody = hitchY - trailer.trailerRearY;
      const distBody = Math.hypot(dxBody, dyBody);

      if (distBody > 0.001) {
        trailer.angle = Math.atan2(dyBody, dxBody);
      }

      const newRearX = hitchX - Math.cos(trailer.angle) * bodyWheelBase;
      const newRearY = hitchY - Math.sin(trailer.angle) * bodyWheelBase;
      
      trailer.trailerRearX = newRearX;
      trailer.trailerRearY = newRearY;

      trailer.x = hitchX - Math.cos(trailer.angle) * couplerOffset;
      trailer.y = hitchY - Math.sin(trailer.angle) * couplerOffset;

      trailer.vx = (trailer.x - oldX) / Math.max(0.001, dt);
      trailer.vy = (trailer.y - oldY) / Math.max(0.001, dt);
      trailer.speed = veh.speed * Math.cos(veh.angle - trailer.angle);

    } else {
      // Standard 1-Axle Drawbar Trailer (e.g. trailer_barrel):
      const drawbarL = trailer.couplerOffset !== undefined ? trailer.couplerOffset : (trailerCfg.couplerOffset !== undefined ? trailerCfg.couplerOffset : 26);
      
      const effectiveDrawbarL = drawbarL;

      // Calculate current position of the trailer's axle (for drawbar trailer, pivot is at the center of the chassis, so rearX is trailer.x)
      const rearX = trailer.x;
      const rearY = trailer.y;

      const dx = hitchX - rearX;
      const dy = hitchY - rearY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.001) {
        trailer.angle = Math.atan2(dy, dx);
      }

      // Geometric coupling: axle is kept exactly effectiveDrawbarL distance behind hitch point
      trailer.x = hitchX - Math.cos(trailer.angle) * effectiveDrawbarL;
      trailer.y = hitchY - Math.sin(trailer.angle) * effectiveDrawbarL;

      trailer.vx = (trailer.x - oldX) / Math.max(0.001, dt);
      trailer.vy = (trailer.y - oldY) / Math.max(0.001, dt);
      trailer.speed = veh.speed * Math.cos(veh.angle - trailer.angle);
    }
  }
}

export function hitchTrailerToVehicle(vehicle: Vehicle, trailer: Vehicle, world: GameWorld): boolean {
  if (vehicle.trailerId || trailer.towedById) return false;
  vehicle.trailerId = trailer.id;
  trailer.towedById = vehicle.id;
  trailer.isTrailer = true;
  trailer.isParked = false;
  trailer.trailerPlugConnected = false;
  trailer.trailerBrakesConnected = false;
  trailer.trailerParkingBrakeEngaged = true;

  // Immediately align dolly angle towards tow hitch ball to eliminate initial angle offset on spawn/hitch
  const vehCfg = CAR_CONFIGS[vehicle.type] || CAR_CONFIGS.sedan;
  const hitchOffset = vehicle.hitchOffset !== undefined ? vehicle.hitchOffset : (vehCfg.hitchOffset !== undefined ? vehCfg.hitchOffset : -vehCfg.length / 2 - 2);
  const hitchX = vehicle.x + Math.cos(vehicle.angle) * hitchOffset;
  const hitchY = vehicle.y + Math.sin(vehicle.angle) * hitchOffset;
  const pivotDist = (trailer.length / 2) * 0.46;
  const curPivotX = trailer.x + Math.cos(trailer.angle) * pivotDist;
  const curPivotY = trailer.y + Math.sin(trailer.angle) * pivotDist;
  const dx = hitchX - curPivotX;
  const dy = hitchY - curPivotY;
  if (Math.hypot(dx, dy) > 0.001) {
    trailer.trailerDollyAngle = Math.atan2(dy, dx);
  } else {
    trailer.trailerDollyAngle = vehicle.angle;
  }
  trailer.trailerDollyX = curPivotX;
  trailer.trailerDollyY = curPivotY;

  const rearAxleDist = (trailer.length / 2) * 0.56;
  trailer.trailerRearX = trailer.x - Math.cos(trailer.angle) * rearAxleDist;
  trailer.trailerRearY = trailer.y - Math.sin(trailer.angle) * rearAxleDist;

  sound.playButtonPress();
  return true;
}

export function unhitchTrailerFromVehicle(vehicle: Vehicle, world: GameWorld): boolean {
  if (!vehicle.trailerId) return false;
  const trailer = world.vehicles.find(v => v.id === vehicle.trailerId);
  if (trailer) {
    trailer.towedById = null;
    trailer.speed = 0;
    trailer.vx = 0;
    trailer.vy = 0;
    trailer.isParked = true;
    trailer.trailerDollyX = undefined;
    trailer.trailerDollyY = undefined;
    trailer.trailerRearX = undefined;
    trailer.trailerRearY = undefined;
  }
  vehicle.trailerId = null;
  sound.playButtonPress();
  return true;
}

export function toggleTrailerHitch(vehicle: Vehicle, world: GameWorld, playerNotifications?: any): boolean {
  if (playerNotifications && typeof playerNotifications.add === 'function') {
    playerNotifications.add('Для сцепки/расцепки прицепа выйдите из машины и выполните её вручную на [E]!', 'warning');
  }
  return false;
}




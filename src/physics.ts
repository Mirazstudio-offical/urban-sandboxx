import { CAR_CONFIGS, canVehicleHaveHitch, createDefaultEngineState, createDefaultFuelSystem, createDefaultFluidTank, ensureVehicleFluidTank, liquidTypeToStainType, createDefaultVehicleDamage, ensureVehicleDamage, getVehicleFuelCapPosition, getVehicleAxleGeometry, isTrailerVehicle } from './vehicleHelpers';
import { Building, GameWorld, InputState, Particle, Pedestrian, Player, SkidMark, Vehicle, StreetProp, FluidStainType } from './types';
import { getBuildingLayout, constrainPlayerToInterior } from './buildingInteriors';
import { sound } from './audio';
import { trafficDiagnostics, isVehicleDisabledOrCrashed } from './aiTraffic';
import { performanceConfig } from './performanceConfig';
import { createDefaultPlayerInventory, addPlayerNotification, getPlayerTotalCarriedWeight } from './items';
import { defaultBodyState } from './sensations';
import { updateBodySystem, distributeImpactDamage, applyDriverVehicleCrashTrauma, addInjuryToPart } from './bodySystem';
import { updateMedicineSystem } from './medicineSystem';

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

export function checkCarBoxCollision(
  car: Vehicle,
  box: { x: number; y: number; width: number; height: number }
): CollisionResult {
  const effL = car.length - (car.damage ? (car.damage.frontCrumple + car.damage.rearCrumple) / 2 : 0);
  const effW = car.width - (car.damage ? (car.damage.leftDent + car.damage.rightDent) / 2 : 0);
  const halfL = effL / 2;
  const halfW = effW / 2;

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  const cornersA = [
    { x: car.x + cosA * halfL - sinA * halfW, y: car.y + sinA * halfL + cosA * halfW },
    { x: car.x + cosA * halfL + sinA * halfW, y: car.y + sinA * halfL - cosA * halfW },
    { x: car.x - cosA * halfL + sinA * halfW, y: car.y - sinA * halfL - cosA * halfW },
    { x: car.x - cosA * halfL - sinA * halfW, y: car.y - sinA * halfL + cosA * halfW }
  ];

  const cornersB = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height }
  ];

  const axes = [
    { x: cosA, y: sinA },   // Car longitudinal
    { x: -sinA, y: cosA },  // Car lateral
    { x: 1, y: 0 },         // Building horizontal
    { x: 0, y: 1 }          // Building vertical
  ];

  let minOverlap = 999999;
  let smallestAxisX = 0;
  let smallestAxisY = 0;

  for (const axis of axes) {
    let minA = 999999;
    let maxA = -999999;
    for (const p of cornersA) {
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

  // Ensure normal points from building to car (away from building center)
  const bCenterX = box.x + box.width / 2;
  const bCenterY = box.y + box.height / 2;
  const dirX = car.x - bCenterX;
  const dirY = car.y - bCenterY;
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

// Check intersection between rotated car box and AABB building using SAT
export function checkCarBuildingCollision(car: Vehicle, building: Building): CollisionResult {
  if (building.type === 'gas_station_canopy' || building.type === 'gas_station_island') {
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
  if (building.type === 'gas_station_canopy' || building.type === 'gas_station_island') {
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
  // Translate pedestrian position to vehicle's local coordinate system
  const dx = px - car.x;
  const dy = py - car.y;

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // Local coordinates of pedestrian relative to car center
  const localX = dx * cosA + dy * sinA;
  const localY = -dx * sinA + dy * cosA;

  const halfL = car.length / 2;
  const halfW = car.width / 2;

  // Find the closest point on the car's OBB to the pedestrian in local space
  const closestX = Math.max(-halfL, Math.min(localX, halfL));
  const closestY = Math.max(-halfW, Math.min(localY, halfW));

  // Distance from local closest point to local pedestrian coordinates
  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distSq = diffX * diffX + diffY * diffY;

  if (distSq < radius * radius && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;

    // Push vector in local coordinates
    const localPushX = (diffX / dist) * overlap;
    const localPushY = (diffY / dist) * overlap;

    // Convert back to world coordinates
    const pushX = localPushX * cosA - localPushY * sinA;
    const pushY = localPushX * sinA + localPushY * cosA;

    return {
      x: px + pushX,
      y: py + pushY,
      collided: true
    };
  } else if (distSq <= 0.0001) {
    // Exactly inside vehicle center, push out along local axis
    const dLeft = localX + halfL;
    const dRight = halfL - localX;
    const dTop = localY + halfW;
    const dBottom = halfW - localY;
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

    return {
      x: px + pushX,
      y: py + pushY,
      collided: true
    };
  }

  return { x: px, y: py, collided: false };
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

function getCarCorners(car: Vehicle, extraMargin = 1.0) {
  const effL = car.length - (car.damage ? (car.damage.frontCrumple + car.damage.rearCrumple) / 2 : 0);
  const effW = car.width - (car.damage ? (car.damage.leftDent + car.damage.rightDent) / 2 : 0);
  const halfL = effL / 2 + extraMargin;
  const halfW = effW / 2 + extraMargin;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  return [
    { x: car.x + cosA * halfL - sinA * halfW, y: car.y + sinA * halfL + cosA * halfW }, // Front-Left
    { x: car.x + cosA * halfL + sinA * halfW, y: car.y + sinA * halfL - cosA * halfW }, // Front-Right
    { x: car.x - cosA * halfL + sinA * halfW, y: car.y - sinA * halfL - cosA * halfW }, // Rear-Right
    { x: car.x - cosA * halfL - sinA * halfW, y: car.y - sinA * halfL + cosA * halfW }  // Rear-Left
  ];
}

function isPointInsideCar(px: number, py: number, car: Vehicle): boolean {
  const dx = px - car.x;
  const dy = py - car.y;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const localX = dx * cosA + dy * sinA;
  const localY = -dx * sinA + dy * cosA;
  const effL = car.length - (car.damage ? (car.damage.frontCrumple + car.damage.rearCrumple) / 2 : 0);
  const effW = car.width - (car.damage ? (car.damage.leftDent + car.damage.rightDent) / 2 : 0);
  const halfL = effL / 2 + 1.5;
  const halfW = effW / 2 + 1.5;
  return Math.abs(localX) <= halfL && Math.abs(localY) <= halfW;
}

export function checkVehicleVehicleCollision(carA: Vehicle, carB: Vehicle): VehicleCollisionResult {
  const effLA = carA.length - (carA.damage ? (carA.damage.frontCrumple + carA.damage.rearCrumple) / 2 : 0);
  const effWA = carA.width - (carA.damage ? (carA.damage.leftDent + carA.damage.rightDent) / 2 : 0);
  const effLB = carB.length - (carB.damage ? (carB.damage.frontCrumple + carB.damage.rearCrumple) / 2 : 0);
  const effWB = carB.width - (carB.damage ? (carB.damage.leftDent + carB.damage.rightDent) / 2 : 0);

  const halfLA = effLA / 2 + 1.0;
  const halfWA = effWA / 2 + 1.0;
  const halfLB = effLB / 2 + 1.0;
  const halfWB = effWB / 2 + 1.0;

  // Broadphase bounding radius check
  const radA = Math.hypot(halfLA, halfWA);
  const radB = Math.hypot(halfLB, halfWB);
  const cdx = carB.x - carA.x;
  const cdy = carB.y - carA.y;
  const distSq = cdx * cdx + cdy * cdy;

  if (distSq > (radA + radB) * (radA + radB)) {
    return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
  }

  // Exact OBB SAT Narrowphase
  const cornersA = getCarCorners(carA, 1.0);
  const cornersB = getCarCorners(carB, 1.0);

  const cosA = Math.cos(carA.angle);
  const sinA = Math.sin(carA.angle);
  const cosB = Math.cos(carB.angle);
  const sinB = Math.sin(carB.angle);

  const testAxes = [
    { x: cosA, y: sinA },   // Car A longitudinal
    { x: -sinA, y: cosA },  // Car A lateral
    { x: cosB, y: sinB },   // Car B longitudinal
    { x: -sinB, y: cosB }   // Car B lateral
  ];

  let minOverlap = 999999;
  let smallestAxisX = 0;
  let smallestAxisY = 0;

  for (const axis of testAxes) {
    let minA = 999999;
    let maxA = -999999;
    for (const p of cornersA) {
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
      return { collided: false, normalX: 0, normalY: 0, overlap: 0, contactX: 0, contactY: 0 };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxisX = axis.x;
      smallestAxisY = axis.y;
    }
  }

  // Ensure normal points from Car A to Car B
  const centerDir = cdx * smallestAxisX + cdy * smallestAxisY;
  if (centerDir < 0) {
    smallestAxisX = -smallestAxisX;
    smallestAxisY = -smallestAxisY;
  }

  // Find contact point (deepest penetrating vertices)
  let contactX = 0;
  let contactY = 0;
  let count = 0;

  for (const p of cornersA) {
    if (isPointInsideCar(p.x, p.y, carB)) {
      contactX += p.x;
      contactY += p.y;
      count++;
    }
  }
  for (const p of cornersB) {
    if (isPointInsideCar(p.x, p.y, carA)) {
      contactX += p.x;
      contactY += p.y;
      count++;
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
    normalX: smallestAxisX,
    normalY: smallestAxisY,
    overlap: minOverlap,
    contactX,
    contactY
  };
}

// --- STREET PROP HITBOX & COLLISION SYSTEM ---
export interface PropHitbox {
  shape: 'circle' | 'box' | 'none';
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
      return { shape: 'box', halfWidth: 11, halfHeight: 5, resistance: 0.06, displayNameRu: 'скамейка' };
    case 'dumpster':
      return { shape: 'box', halfWidth: 14, halfHeight: 10, resistance: 0.28, displayNameRu: 'мусорный контейнер' };
    case 'flowerbed':
      return { shape: 'box', halfWidth: 12, halfHeight: 8, resistance: 0.12, displayNameRu: 'клумба' };
    case 'bus_stop':
      return { shape: 'box', halfWidth: 19, halfHeight: 11, resistance: 0.24, displayNameRu: 'автобусная остановка' };
    case 'kiosk':
      return { shape: 'box', halfWidth: 13, halfHeight: 13, resistance: 0.38, displayNameRu: 'киоск' };
    case 'mailbox':
      return { shape: 'box', halfWidth: 5, halfHeight: 5, resistance: 0.06, displayNameRu: 'почтовый ящик' };
    case 'playground_swing':
      return { shape: 'box', halfWidth: 12, halfHeight: 6, resistance: 0.15, displayNameRu: 'детские качели' };
    case 'garage_door':
      return { shape: 'box', halfWidth: 11, halfHeight: 5, resistance: 10.0, isIndestructible: true, displayNameRu: 'гаражные ворота' };
    case 'lamp':
      return { shape: 'circle', radius: 3.5, resistance: 0.10, displayNameRu: 'парковый фонарь' };
    case 'lamp_highway':
      return { shape: 'circle', radius: 3.8, resistance: 0.04, displayNameRu: 'автодорожный фонарь' };
    case 'lamp_concrete':
      return { shape: 'box', halfWidth: 4.5, halfHeight: 4.5, resistance: 10.0, isIndestructible: true, displayNameRu: 'старый бетонный столб' };
    case 'hydrant':
      return { shape: 'circle', radius: 4.2, resistance: 0.22, displayNameRu: 'пожарный гидрант' };
    case 'trash_can':
      return { shape: 'circle', radius: 4.0, resistance: 0.05, displayNameRu: 'урна' };
    case 'bollard':
      return { shape: 'circle', radius: 2.8, resistance: 0.03, displayNameRu: 'столбик ограждения' };
    case 'cone':
      return { shape: 'circle', radius: 3.0, resistance: 0.01, displayNameRu: 'дорожный конус' };
    case 'tire_flowerbed':
      return { shape: 'circle', radius: 7.5, resistance: 0.04, displayNameRu: 'клумба из покрышки' };
    case 'traffic_light':
      return { shape: 'circle', radius: 3.2, resistance: 0.08, displayNameRu: 'светофор' };
    case 'manhole':
      return { shape: 'none', resistance: 0, displayNameRu: 'канализационный люк' };
    case 'drain_grate':
      return { shape: 'none', resistance: 0, displayNameRu: 'ливневая решётка' };
    case 'village_well':
      return { shape: 'circle', radius: 11, resistance: 10.0, isIndestructible: true, displayNameRu: 'деревенский колодец' };
    case 'village_sign':
      return { shape: 'box', halfWidth: 10, halfHeight: 3, resistance: 0.15, displayNameRu: 'дорожный указатель' };
    case 'haystack':
      return { shape: 'circle', radius: 14, resistance: 0.05, displayNameRu: 'стог сена' };
    case 'woodpile':
      return { shape: 'box', halfWidth: 12, halfHeight: 6, resistance: 0.18, displayNameRu: 'поленница дров' };
    case 'rustic_car_wreck':
      return { shape: 'box', halfWidth: 20, halfHeight: 10, resistance: 10.0, isIndestructible: true, displayNameRu: 'ржавый остов машины' };
    case 'concrete_barrier':
      return { shape: 'box', halfWidth: 16, halfHeight: 6, resistance: 10.0, isIndestructible: true, displayNameRu: 'бетонный блок' };
    case 'concrete_fence_po2':
      return { shape: 'box', halfWidth: 19, halfHeight: 6, resistance: 10.0, isIndestructible: true, displayNameRu: 'бетонный забор ПО-2' };
    case 'power_pole':
      return { shape: 'circle', radius: 3.2, resistance: 10.0, isIndestructible: true, displayNameRu: 'деревянный столб ЛЭП' };
    case 'shipping_container':
      return { shape: 'box', halfWidth: 26, halfHeight: 12, resistance: 10.0, isIndestructible: true, displayNameRu: 'грузовой контейнер' };
    case 'pallet_stack':
      return { shape: 'box', halfWidth: 10, halfHeight: 8, resistance: 0.12, displayNameRu: 'стопка деревянных поддонов' };
    case 'industrial_tank':
      return { shape: 'box', halfWidth: 22, halfHeight: 12, resistance: 10.0, isIndestructible: true, displayNameRu: 'резервуар ГСМ' };
    case 'silo_tank':
      return { shape: 'circle', radius: 16, resistance: 10.0, isIndestructible: true, displayNameRu: 'силосная башня' };
    case 'cable_spool':
      return { shape: 'circle', radius: 9, resistance: 0.35, displayNameRu: 'кабельный барабан' };
    case 'security_barrier':
      return { shape: 'box', halfWidth: 12, halfHeight: 3, resistance: 0.15, displayNameRu: 'шлагбаум КПП' };
    case 'industrial_floodlight':
      return { shape: 'box', halfWidth: 5, halfHeight: 5, resistance: 10.0, isIndestructible: true, displayNameRu: 'прожекторная мачта' };
    case 'industrial_tires':
      return { shape: 'circle', radius: 10, resistance: 0.45, displayNameRu: 'штабель карьерных шин' };
    case 'scrap_pile':
      return { shape: 'circle', radius: 12, resistance: 0.60, displayNameRu: 'куча металлолома' };
    case 'industrial_sign':
      return { shape: 'box', halfWidth: 8, halfHeight: 3, resistance: 0.10, displayNameRu: 'щит-указатель' };
    case 'industrial_pipe':
      return { shape: 'box', halfWidth: 16, halfHeight: 4, resistance: 10.0, isIndestructible: true, displayNameRu: 'эстакада трубопровода' };
    case 'fence_wood_vertical':
      return { shape: 'box', halfWidth: 18, halfHeight: 3.5, resistance: 0.85, displayNameRu: 'деревянный штакетник' };
    case 'fence_metal_vertical':
      return { shape: 'box', halfWidth: 18, halfHeight: 3.5, resistance: 1.80, displayNameRu: 'забор из профнастила' };
    case 'cottage_gate':
      return { shape: 'box', halfWidth: 36, halfHeight: 4.5, resistance: 2.20, displayNameRu: 'въездные ворота' };
    case 'wicket_gate':
      return { shape: 'box', halfWidth: 12, halfHeight: 2.5, resistance: 0.15, displayNameRu: 'калитка' };
    case 'garden_path_tile':
      return { shape: 'none', resistance: 0, displayNameRu: 'садовая дорожка' };
    default:
      return { shape: 'circle', radius: 3.0, resistance: 0.05, displayNameRu: 'уличный объект' };
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

  const vehCorners = getCarCorners(veh, 0.6);

  const cosV = Math.cos(veh.angle);
  const sinV = Math.sin(veh.angle);

  const testAxes = [
    { x: cosV, y: sinV },
    { x: -sinV, y: cosV },
    { x: cosP, y: sinP },
    { x: -sinP, y: cosP }
  ];

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
  const massRatio = Math.max(0.5, Math.min(3.5, strikerMass / car.mass));
  const effectiveSpeed = impactSpeed * Math.sqrt(massRatio);

  // Realistic Impact Severity calculation:
  // Starts scaling from 18 px/s (~20 km/h) up to 105 px/s (~110 km/h total loss)
  let severity = Math.min(1.0, Math.max(0, effectiveSpeed - 16) / 92);
  if ((car as any).hasHeavySuspension) {
    severity *= 0.6; // Heavy-duty Bilstein suspension absorbs 40% of the shock energy!
  }

  // 1. Realistic Directional Softbody Mass-Spring Network with Plastic Strain & Poisson Wrinkling
  if (dmg.deformedVertices && impactSpeed > 18) {
    const pushStrength = Math.min(6.5, (effectiveSpeed / 60) * 2.8 * Math.sqrt(massRatio));
    
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
    for (let offset = -4; offset <= 4; offset++) {
      const idx = (closestIdx + offset + totalNodes) % totalNodes;
      const v = dmg.deformedVertices[idx];
      const len = Math.hypot(v.localX, v.localY) || 1;
      
      // Node structural stiffness resistance multiplier based on panel type
      const structStiffness = v.structuralType === 'door' ? 0.75 :
                              (v.structuralType === 'quarter' ? 0.85 :
                              (v.structuralType === 'fender' ? 1.0 : 1.25));

      const absOffset = Math.abs(offset);
      let weight = 0;
      let isPoissonBulge = false;

      if (absOffset === 0) {
        weight = 1.0;
      } else if (absOffset === 1) {
        weight = 0.65 * structStiffness;
      } else if (absOffset === 2) {
        weight = 0.30 * structStiffness;
      } else if (absOffset === 3 || absOffset === 4) {
        // POISSON OUTWARD METAL WRINKLE / BULGE: Metal volume is conserved!
        weight = 0.18 * severity; 
        isPoissonBulge = true;
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
        const maxOffset = Math.min(10.0, Math.max(2.5, len * 0.32));

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
        // Apply initial partial step (25%) so the impact registers immediately,
        // while the remaining 75% smoothly compresses over the next 6-10 frames!
        v.offsetX = v.offsetX + (newTargetX - v.offsetX) * 0.25;
        v.offsetY = v.offsetY + (newTargetY - v.offsetY) * 0.25;

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
        v.plasticStrain = Math.min(1.5, (v.plasticStrain || 0) + strainAdd);

        // Inject transient elastic jiggle velocity impulse
        const jiggleStrength = Math.min(12.0, severity * 14.0 * Math.abs(weight));
        v.velX = Math.max(-20, Math.min(20, (v.velX || 0) + nodeImpulseX * jiggleStrength));
        v.velY = Math.max(-20, Math.min(20, (v.velY || 0) + nodeImpulseY * jiggleStrength));

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
    if (Math.abs(frontAsym) > 0.12) {
      dmg.steeringDrift = Math.max(-1.0, Math.min(1.0, dmg.steeringDrift + frontAsym * 0.4));
      dmg.frameBentAngle = (dmg.frameBentAngle || 0) + frontAsym * 0.08;
    }

    // Buckled hood elevation
    // Safe index access for polygon vertices
    const frontTotalStrain = 
      (dmg.deformedVertices[0]?.plasticStrain || 0) + 
      (dmg.deformedVertices[1]?.plasticStrain || 0) + 
      (dmg.deformedVertices[2]?.plasticStrain || 0) + 
      (dmg.deformedVertices[18]?.plasticStrain || 0) + 
      (dmg.deformedVertices[19]?.plasticStrain || 0);
    if (frontTotalStrain > 0.25) {
      dmg.hoodBuckled = true;
      dmg.hoodRaisedAmount = Math.min(1.0, frontTotalStrain * 0.65);
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
  const crushFactor = severity * (1.2 + severity * 1.8) * Math.sqrt(massRatio) * 0.4;

  if (normX > 0.20 && impactSpeed > 20) {
    // --- FRONTAL COLLISION ---
    const maxFrontCrush = halfL * 0.24; // Engine block restricts crumpling
    dmg.frontCrumple = Math.min(maxFrontCrush, dmg.frontCrumple + crushFactor);

    if (!isTrailer) {
      // Mechanical engine and transmission shock / crushing
      const engShock = (severity * 58 + (dmg.frontCrumple / maxFrontCrush) * 52) * Math.sqrt(massRatio);
      eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - engShock);

      const transShock = (severity * 48 + (dmg.frontCrumple / maxFrontCrush) * 44) * Math.sqrt(massRatio);
      eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - transShock);

      // Radiator puncture (starts rapid coolant loss & overheating)
      if (severity > 0.20 || dmg.frontCrumple > 3.0) {
        eng.radiatorPunctured = true;
      }

      // Oil pan puncture (starts oil loss, knocking, then seizure)
      if (severity > 0.38 || dmg.frontCrumple > 5.5) {
        eng.oilPunctured = true;
      }

      // Engine knock from internal mechanical damage
      if (eng.engineHealth <= 45 || severity > 0.50) {
        eng.engineKnocking = true;
      }

      // Severe engine seizure & dead starter from direct engine bay smash
      if (eng.engineHealth <= 15 || severity > 0.72 || dmg.frontCrumple > 9.0) {
        eng.starterWorking = false;
        eng.engineRunning = false;
        eng.isSeized = true;
        eng.engineRPM = 0;
      }

      // Transmission jamming / locking up
      if (eng.transmissionHealth <= 20 || (severity > 0.55 && Math.random() < 0.75) || (eng.transmissionHealth <= 40 && Math.random() < 0.4)) {
        eng.transmissionJammed = true;
      }
    }

    if (normY < -0.22) {
      dmg.frontLeftDent = Math.min(maxFrontCrush * 0.75, dmg.frontLeftDent + crushFactor * 0.85);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.85);
      dmg.steeringDrift = Math.max(-1.0, dmg.steeringDrift - severity * 0.7);
      dmg.wheelRubResistance += severity * 18;
      if (severity > 0.28) dmg.leftHeadlightBroken = true;
    } else if (normY > 0.22) {
      dmg.frontRightDent = Math.min(maxFrontCrush * 0.75, dmg.frontRightDent + crushFactor * 0.85);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.85);
      dmg.steeringDrift = Math.min(1.0, dmg.steeringDrift + severity * 0.7);
      dmg.wheelRubResistance += severity * 18;
      if (severity > 0.28) dmg.rightHeadlightBroken = true;
    } else {
      dmg.frontLeftDent = Math.min(maxFrontCrush * 0.65, dmg.frontLeftDent + crushFactor * 0.6);
      dmg.frontRightDent = Math.min(maxFrontCrush * 0.65, dmg.frontRightDent + crushFactor * 0.6);
      dmg.frontLeftSuspensionDamage = Math.min(1.0, dmg.frontLeftSuspensionDamage + severity * 0.6);
      dmg.frontRightSuspensionDamage = Math.min(1.0, dmg.frontRightSuspensionDamage + severity * 0.6);
      dmg.wheelRubResistance += severity * 14;
      if (severity > 0.35) {
        dmg.leftHeadlightBroken = true;
        dmg.rightHeadlightBroken = true;
      }
    }

    if (!isTrailer) {
      if (severity > 0.40 || dmg.frontCrumple > 5.5) {
        dmg.hoodBuckled = true;
      }
    }
    if (severity > 0.60 || dmg.frontCrumple > 8.5) {
      dmg.windshieldCracked = true;
    }
  } else if (normX < -0.25 && impactSpeed > 20) {
    // --- REAR IMPACT ---
    const maxRearCrush = halfL * 0.22; // Fuel tank & subframe restrict rear crumpling
    dmg.rearCrumple = Math.min(maxRearCrush, dmg.rearCrumple + crushFactor);

    if (!isTrailer) {
      if (severity > 0.40 || dmg.rearCrumple > 3.0) {
        fuel.tankPunctured = true;
      }

      // Rear impacts can shock transmission driveshaft and differential
      const rearTransShock = (severity * 32 + (dmg.rearCrumple / maxRearCrush) * 28) * Math.sqrt(massRatio);
      eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - rearTransShock);
      if (eng.transmissionHealth <= 15 || (severity > 0.75 && Math.random() < 0.5)) {
        eng.transmissionJammed = true;
      }
    }

    if (car.fluidTank && (severity > 0.32 || dmg.rearCrumple > 2.5)) {
      car.fluidTank.isPunctured = true;
    }

    if (normY < -0.22) {
      dmg.rearLeftDent = Math.min(maxRearCrush * 0.75, dmg.rearLeftDent + crushFactor * 0.85);
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.85);
      if (severity > 0.32) dmg.leftTaillightBroken = true;
    } else if (normY > 0.22) {
      dmg.rearRightDent = Math.min(maxRearCrush * 0.75, dmg.rearRightDent + crushFactor * 0.85);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.85);
      if (severity > 0.32) dmg.rightTaillightBroken = true;
    } else {
      dmg.rearLeftSuspensionDamage = Math.min(1.0, dmg.rearLeftSuspensionDamage + severity * 0.6);
      dmg.rearRightSuspensionDamage = Math.min(1.0, dmg.rearRightSuspensionDamage + severity * 0.6);
      if (severity > 0.40) {
        dmg.leftTaillightBroken = true;
        dmg.rightTaillightBroken = true;
      }
    }

    if (severity > 0.55) {
      dmg.rearGlassCracked = true;
    }
  } else if (impactSpeed > 20) {
    // --- SIDE IMPACT / T-BONE ---
    const maxSideDent = halfW * 0.22; // Side door impact bars restrict intrusion
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

    if (car.fluidTank && (severity > 0.35 || dmg.leftDent > 2.0 || dmg.rightDent > 2.0)) {
      car.fluidTank.isPunctured = true;
    }

    if (!isTrailer) {
      if (severity > 0.28) {
        eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - severity * 38);
        eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - severity * 30);
        if (eng.transmissionHealth <= 20 || (severity > 0.65 && Math.random() < 0.65)) {
          eng.transmissionJammed = true;
        }
        if (eng.engineHealth <= 15 || (severity > 0.78 && Math.random() < 0.55)) {
          eng.isSeized = true;
          eng.engineRunning = false;
          eng.starterWorking = false;
          eng.engineRPM = 0;
        }
      }
    }
    if (severity > 0.48) {
      dmg.windshieldCracked = true;
    }
    if (!isTrailer) {
      if (severity > 0.52) {
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
      const isFrontFuelRailBroken = (dmg.frontCrumple ?? 0) > 2.2 || severity > 0.38;
      if (isFrontFuelRailBroken) {
        fuel.fuelRailBroken = true;
      }

      // Detailed collision probability calculation (Kmh based)
      const impactKmh = impactSpeed * 0.36;
      if (!dmg.underHoodSteam) dmg.underHoodSteam = 'none';
      if (!dmg.underHoodSmoke) dmg.underHoodSmoke = 'none';

      if (impactKmh >= 25 && impactKmh <= 45) {
        // Легкий удар (25–45 км/ч / бампер и радиатор):
        // Шанс пара: 10% (тонкая белая струйка, если треснул бачок).
        // Шанс дыма: 0%.
        if (Math.random() < 0.10) {
          dmg.underHoodSteam = 'thin';
          dmg.engineSmoking = true;
        }
      } else if (impactKmh > 45 && impactKmh <= 75) {
        // Средний удар (45–75 км/ч / замятие капота):
        // Шанс пара: 40% (плотное облако).
        // Шанс сизого масляного дыма: 15%.
        if (Math.random() < 0.40) {
          dmg.underHoodSteam = 'dense';
          dmg.engineSmoking = true;
        } else if (Math.random() < 0.30) {
          dmg.underHoodSteam = 'thin';
          dmg.engineSmoking = true;
        }
        
        if (Math.random() < 0.15) {
          dmg.underHoodSmoke = 'oil_blue';
          dmg.engineSmoking = true;
        }
      } else if (impactKmh > 75) {
        // Тяжелый удар (75+ км/ч / двигатель ушел назад):
        // Шанс пара: 70% (гейзер или плотный).
        // Шанс дыма: 40% (густой серый дым масла + черный дым проводки).
        // Шанс открытого пламени: 3%!
        if (Math.random() < 0.30) {
          dmg.underHoodSteam = 'geyser';
          dmg.engineSmoking = true;
        } else if (Math.random() < 0.80) {
          dmg.underHoodSteam = 'dense';
          dmg.engineSmoking = true;
        }
        
        if (Math.random() < 0.40) {
          dmg.underHoodSmoke = 'oil_gray_wiring_black';
          dmg.engineSmoking = true;
        }
        if (Math.random() < 0.03 && !dmg.isFullyBurnt && !dmg.engineFire && !dmg.cabinFire && !dmg.underHoodSmolder && !dmg.fuelTankFire) {
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
            addPlayerNotification((world as any).player, '⚠️ Из-под капота повалил едкий серый дым! Повреждена топливная рампа, тление в моторном отсеке!', 'warning');
          }
        }
      }
    }

    if (!dmg.isFullyBurnt && !dmg.engineFire && !dmg.cabinFire && !dmg.underHoodSmolder && !dmg.fuelTankFire) {
      // Check REAR or TANK AREA collision ignition (Fuel Tank / Puddle fire)
      // Occurs when the rear or side near the fuel tank is crushed:
      // Tank / filler neck punctures, gasoline leaks and flashes from metal friction sparks or hot exhaust
      if (normX <= 0.15 && fuel.tankPunctured) {
        const hasIgnitionSource = (scrapeSpeed > 14 || impactSpeed > 30 || severity > 0.44 || isEngineHot);
        if (hasIgnitionSource && Math.random() < 0.04) {
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
            addPlayerNotification((world as any).player, '🔥 ВСПЫХНУЛ БЕНЗОБАК И РАЗЛИВШЕЕСЯ ТОПЛИВО СЗАДИ! Огонь охватил заднюю часть и днище машины!', 'warning');
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
        type: 'spark'
      });
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
          type: 'glass_shard'
        });
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
          type: 'debris'
        });
      }
    }
  }

  // Set NPC emergency hazard lights & stop state if vehicle was disabled or crashed
  if (!car.isPlayerControlled && isVehicleDisabledOrCrashed(car)) {
    car.turnSignal = 'hazard';
    car.brakeLightsOn = true;
    car.targetSpeed = 0;
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
  type: 'radiator' | 'oil' | 'fuel' | 'fuel_left' | 'fuel_right' | 'exhaust'
): WorldAnchor {
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  const L = car.length;
  const W = car.width;
  const carType = car.type || 'sedan';
  
  let f = 0; // localForward
  let r = 0; // localRight
  
  const isTruck = carType.startsWith('truck_') || carType === 'cement_mixer' || carType === 'garbage_truck' || carType === 'pickup_heavy' || carType === 'delivery_truck';
  const isTractor = carType.startsWith('tractor_');
  const isBike = carType.startsWith('moto_') || carType.startsWith('moped_');
  const isRearEngineBus = carType === 'bus' || carType === 'bus_minibus';
  
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
  } else if (type === 'fuel' || type === 'fuel_left' || type === 'fuel_right') {
    if (isTruck) {
      f = 0.05 * L;
      r = type === 'fuel_left' ? -0.48 * W : (type === 'fuel_right' ? 0.48 * W : (Math.random() < 0.5 ? -0.48 * W : 0.48 * W));
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
    } else if ((carType as string) === 'truck_tractor' || (carType as string) === 'truck_dumper' || (carType as string) === 'truck_dump' || (carType as string) === 'truck_tanker' || (carType as string) === 'cement_mixer' || (carType as string) === 'garbage_truck') {
      // Heavy Truck: Vertical exhaust stack behind cabin
      f = 0.08 * L;
      r = -0.42 * W;
    } else if (isTruck) {
      // Medium / Light Truck: Side exit pipe under chassis frame
      f = -0.05 * L;
      r = -0.45 * W;
    } else if (isBike) {
      // Motorcycle / Moped: Right side chrome pipe
      f = -0.35 * L;
      r = 0.38 * W;
    } else if (carType === 'muscle_classic' || carType === 'muscle' || carType === 'supercar') {
      // Muscle / Supercar: Side rocker pipe or rear center pipe
      f = carType === 'muscle_classic' ? -0.05 * L : -0.50 * L;
      r = carType === 'muscle_classic' ? -0.48 * W : 0;
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
              type: 'engine_smoke'
            });
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
      radius: type === 'water' ? 2.2 : 2.5,
      maxRadius: type === 'water' ? (6 + Math.random() * 4) : (8 + Math.random() * 12),
      type,
      alpha: type === 'oil' ? 0.75 : (type === 'coolant' ? 0.65 : (type === 'water' ? 0.60 : 0.45)),
      life: 0,
      maxLife: type === 'water' ? (60 + Math.random() * 30) : (180 + Math.random() * 120)
    });
  }
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
    const rpmNorm = Math.max(0.2, (eng.engineRPM || 800) / 3800);
    const throttleRatio = (car as any)._lastThrottle !== undefined ? (car as any)._lastThrottle : 0.4;
    const baseHeat = 2.4;
    // Combustion heat scales quadratically with RPM and linearly with throttle
    const heatGen = (baseHeat + Math.pow(rpmNorm, 1.8) * 8.8) * (0.45 + throttleRatio * 0.55);

    let cooling = 0;
    if (eng.radiatorWater > 10) {
      // Radiator cooling: base fan flow + ram-air effect through grille at speed
      const airFlowKmh = Math.abs(car.speed) * 0.36;
      const ramAirFactor = 1.0 + (airFlowKmh / 55.0) * 1.5;
      const coolingFactor = (eng.radiatorWater / 100) * ramAirFactor;
      cooling = (eng.temperature - 84) * 0.85 * coolingFactor;
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
          type: 'engine_smoke'
        });
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
  
  // --- REALISTIC DRIVING FUEL CONSUMPTION (Influenced by Chip Tuning) ---
  if (eng.engineRunning && fuel) {
    let consumptionRate = 0.0003 + (eng.engineRPM / 3000) * 0.0012; // liters per second
    if ((car as any).hasChiptuning) {
      consumptionRate *= 0.85; // 15% fuel economy from optimized timing & AFR
    }
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
  const isTankerHeavilyDamaged = car.type === 'truck_tanker' && (
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

  if (fuel.tankPunctured) {
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
    const rearOffset = car.type === 'trailer_barrel' ? -halfL * 0.75 : -halfL * 0.65;
    const tankAnchor = {
      x: car.x + cosA * rearOffset,
      y: car.y + sinA * rearOffset
    };

    const targetStainType = liquidTypeToStainType(fTank.liquidType);

    const spawnCisternStain = (wx: number, wy: number, isMajorSpill: boolean) => {
      const stainRadius = isMajorSpill ? (3.8 + Math.random() * 2.2) : (1.6 + Math.random() * 1.2);
      const stainMaxRadius = isMajorSpill ? (12 + Math.random() * 4) : (5.5 + Math.random() * 2.5);
      const stainAlpha = targetStainType === 'oil' ? 0.80 : (targetStainType === 'coolant' ? 0.70 : (targetStainType === 'water' ? 0.60 : 0.65));

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
          maxLife: targetStainType === 'water' ? (60 + Math.random() * 30) : (200 + Math.random() * 100),
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
                  type: 'engine_smoke'
                });
              }
            }
          }
        }
      }

      // Droplet particles
      if (isMajorSpill && world.particles && Math.random() < 0.35) {
        const pColor = targetStainType === 'water' ? (Math.random() < 0.6 ? '#38bdf8' : '#e0f2fe') :
                       (targetStainType === 'fuel' ? (Math.random() < 0.7 ? '#f59e0b' : '#ca8a04') :
                       (targetStainType === 'oil' ? '#0f172a' : '#22c55e'));
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
          type: 'debris'
        });
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
        type: 'spark'
      });
      if (car.isPlayerControlled) {
        sound.playDetonation();
      }
    }
  }

  // --- VEHICLE FIRE SPREAD & DYNAMIC MULTI-MINUTE LIFECYCLE (210s) ---
  const isFireActive = (dmg.underHoodSmolder || dmg.engineFire || dmg.fuelTankFire || dmg.cabinFire) && !dmg.isFullyBurnt;
  if (isFireActive) {
    dmg.fireTimer = (dmg.fireTimer || 0) + dt;
    const t = dmg.fireTimer;
    const isRearOrigin = dmg.fireOrigin === 'rear' || (dmg.fuelTankFire && !dmg.engineFire && t < 70.0);

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
        if (st.type === 'fuel' || st.type === 'oil') {
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
            addPlayerNotification((world as any).player, '💥 БЕНЗОБАК ПОЛНОСТЬЮ ПРОГОРЕЛ! Горящий бензин заливает асфальт под машиной, лопнуло заднее стекло!', 'warning');
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
            addPlayerNotification((world as any).player, '🚨 ОГОНЬ ПРОРВАЛСЯ В САЛОН ЧЕРЕЗ ЗАДНИЕ СИДЕНЬЯ! СРОЧНО ПОКИДАЙТЕ МАШИНУ!', 'warning');
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
            addPlayerNotification((world as any).player, '🔥 В моторном отсеке разгорелось открытое пламя! Токсичный дым проникает в салон!', 'warning');
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
            addPlayerNotification((world as any).player, '🚨 ОГОНЬ ПРОРВАЛ МОТОРНЫЙ ЩИТ И ВОРВАЛСЯ В САЛОН! ТОРПЕДА ПЛАВИТСЯ!', 'warning');
          }
        }
        // На 65-й секунде огонь доходит по топливопроводу до бака, бак прогорает
        if (t > 65.0 && !dmg.fuelTankBurntThrough) {
          dmg.fuelTankBurntThrough = true;
          dmg.fuelTankFire = true;
          fuel.tankPunctured = true;
          if (car.isPlayerControlled && (world as any).player) {
            addPlayerNotification((world as any).player, '💥 ОГОНЬ ДОБРАЛСЯ ДО БЕНЗОБАКА! Горящее топливо разливается под днищем!', 'warning');
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
          addPlayerNotification((world as any).player, '⚠️ Машина задымилась и загорелась от длительного непрерывного жара соседнего факела огня!', 'warning');
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
  
  // Rear suspension reduces lateral grip factor. This will be consumed in `updateVehiclePhysics`
  car.driftFactor = Math.min(1.0, (dmg.rearLeftSuspensionDamage + dmg.rearRightSuspensionDamage) / 2);
}

export function updatePlayerPedestrianPhysics(
  player: Player,
  input: InputState,
  buildings: Building[],
  dt: number,
  cameraAngle: number = 0,
  worldWidth: number = 8000,
  worldHeight: number = 8000,
  world?: GameWorld,
  vehGrid?: any
) {
  if (player.isInVehicle) return;

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
      const layout = getBuildingLayout(bld, floor);

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
        type: 'tire_smoke'
      });
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
    const leftFractured = player.bodyState?.bodyParts?.leftLeg.some(i => i.type === 'fracture' && !i.treated);
    const rightFractured = player.bodyState?.bodyParts?.rightLeg.some(i => i.type === 'fracture' && !i.treated);
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
          addPlayerNotification(player, `💫 Вы потеряли сознание от невыносимого болевого шока сломанных ног! Вызывается Бригада Скорой Помощи...`, 'warning');
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
          type: 'tire_smoke'
        });
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
        const speedKmh = Math.round(carSpeedMag * 0.36); // Conversion from internal engine speed to km/h

        if (speedKmh >= 3 && player.needs) {
          const now = Date.now() / 1000;
          if (!player.lastHurtTime || now - player.lastHurtTime > 0.5) {
            player.lastHurtTime = now;
            const isTruck = car.type.includes('truck') || car.type.includes('bus') || car.type.includes('cement') || car.type.includes('garbage') || car.type.includes('fire');
            
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
                addPlayerNotification(player, `🚗 Легкий толчок бампером (${speedKmh} км/ч). Ссадины и легкие ушибы.`, 'info');
              } else if (speedKmh < 32) {
                addPlayerNotification(player, `💥 Сбит автомобилем на скорости ${speedKmh} км/ч! Ушибы и растяжение!`, 'warning');
              } else if (speedKmh < 60) {
                addPlayerNotification(player, `💥 Тяжелое столкновение (${speedKmh} км/ч)! Перелом кости и кровотечение!`, 'warning');
              } else {
                addPlayerNotification(player, `🚨 Критический наезд на большой скорости (${speedKmh} км/ч)! Множественные переломы!`, 'warning');
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

  // World bounds clamp (full world size)
  player.x = Math.max(20, Math.min(worldWidth - 20, newX));
  player.y = Math.max(20, Math.min(worldHeight - 20, newY));
}

// === WINDSHIELD FOGGING, CONDENSATION & EVAPORATION LOGIC ===

/**
 * Calculates ambient outside air temperature in °C based on time of day and weather.
 */
export function getOutsideTemperature(world: GameWorld, timeHour: number = 12): number {
  if (typeof (world as any)?.outsideTemp === 'number' && Number.isFinite((world as any).outsideTemp)) {
    return (world as any).outsideTemp;
  }
  const hour = (typeof timeHour === 'number' && Number.isFinite(timeHour)) ? timeHour : 12;
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
  const safeHour = (typeof timeHour === 'number' && Number.isFinite(timeHour)) ? timeHour : 12;
  if (delta <= 0) return (typeof car.fogLevel === 'number' && Number.isFinite(car.fogLevel)) ? car.fogLevel : 0.0;

  // 1. Environmental inputs
  const outsideTemp = getOutsideTemperature(world, safeHour);
  const isRaining = world?.weather === 'rain' || world?.weather === 'storm';
  const isHumidWeather = isRaining || world?.weather === 'fog';

  // 2. Engine temperature resolution (sync car.engineTemp and car.engineState.temperature)
  let engineTemp = typeof car.engineTemp === 'number' && Number.isFinite(car.engineTemp)
    ? car.engineTemp
    : (typeof car.engineState?.temperature === 'number' && Number.isFinite(car.engineState.temperature) ? car.engineState.temperature : 20);
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
  const fanSpeed = heaterMode === 'high' ? 1.0 : heaterMode === 'med' ? 0.65 : heaterMode === 'low' ? 0.35 : 0.0;

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
    const speedKmh = Math.abs(car.speed || 0) * 3.6;
    const speedDraftBonus = Math.min(0.05, (speedKmh / 75) * 0.05);
    windowDraftDryRate = 0.035 + speedDraftBonus;

    // Open window cools down cabin temperature towards outside ambient
    const cabinTemp = (typeof car.heaterTemp === 'number' && Number.isFinite(car.heaterTemp)) ? car.heaterTemp : 18;
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
  const prevFog = (typeof car.fogLevel === 'number' && Number.isFinite(car.fogLevel)) ? car.fogLevel : 0.0;
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
    timeHour = typeof hourOrInput === 'number' ? hourOrInput : 12;
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
  const isRaining = world.weather === 'rain' || world.weather === 'storm';
  const isExposedToRain = isRaining && !player.isInsideBuilding && !player.isInVehicle;

  // Find vehicle if player is inside one
  const curVehicle = player.isInVehicle && player.currentVehicleId
    ? world.vehicles.find(v => v.id === player.currentVehicleId)
    : undefined;

  if (curVehicle) {
    // Ensure heater mode & temperatures are initialized
    curVehicle.heaterMode = curVehicle.heaterMode || 'off';
    const outsideTemp = getOutsideTemperature(world, timeHour);
    if (typeof curVehicle.heaterTemp !== 'number' || !Number.isFinite(curVehicle.heaterTemp)) {
      // Parked unheated cars are noticeably colder inside than outside ambient during morning/cold weather
      curVehicle.heaterTemp = outsideTemp < 20 ? Math.round(outsideTemp - 2.5) : outsideTemp;
    }
    curVehicle.fogLevel = (typeof curVehicle.fogLevel === 'number' && Number.isFinite(curVehicle.fogLevel)) ? curVehicle.fogLevel : 0.0;
    curVehicle.windshieldRainLevel = (typeof curVehicle.windshieldRainLevel === 'number' && Number.isFinite(curVehicle.windshieldRainLevel)) ? curVehicle.windshieldRainLevel : 0;

    // Sync engine temperature
    const engTemp = typeof curVehicle.engineTemp === 'number'
      ? curVehicle.engineTemp
      : (curVehicle.engineState?.temperature ?? 20);
    curVehicle.engineTemp = engTemp;

    // Heat target and progression:
    // If heater is OFF, the cabin remains distinctly cold (cool shaded interior, no heating element)
    // If heater is ON, blowing air temperature scales directly with engine coolant temperature!
    let targetCabinTemp = outsideTemp < 20 ? outsideTemp - 2.5 : outsideTemp;
    const heaterMode = curVehicle.heaterMode || 'off';
    if (heaterMode !== 'off') {
      const modeTarget = heaterMode === 'low' ? 22 : heaterMode === 'med' ? 27 : 34;
      // If engine is cold (<50°C), blowing air is cold!
      const maxAirFromEngine = Math.max(outsideTemp - 2.5, engTemp - 6);
      targetCabinTemp = Math.min(modeTarget, maxAirFromEngine);
    }

    // Cooling/heating transfer rate
    const transferSpeed = heaterMode !== 'off' ? 0.14 : 0.07;
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
    hasDraft = world.weather === 'storm' || world.weather === 'rain';
    
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
      addPlayerNotification(player, `🚨 ВЫ ПОТЕРЯЛИ СОЗНАНИЕ! Острая гипоксия и отравление угарным газом (${Math.round(co)}% CO)!`, 'warning');
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
      addPlayerNotification(player, `🚨 ВЫ ПОТЕРЯЛИ СОЗНАНИЕ ОТ ОГНЯ И ОБЖИГАЮЩЕГО ЖАРА! Вызывается МЧС и Скорая Помощь...`, 'warning');
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
          addPlayerNotification(player, `🚨 СРОЧНО ВЫБИРАЙТЕСЬ! САЛОН В ОГНЕ (${Math.round(ambientTemp)}°C)! ОБЖИГАЮЩИЙ АД!`, 'warning');
        } else if (curVehicle?.damage?.fuelTankFire) {
          addPlayerNotification(player, `🔥 ГОРИТ БЕНЗОБАК И ДНИЩЕ СЗАДИ (${Math.round(ambientTemp)}°C)! Вытекающий бензин полыхает под машиной!`, 'warning');
        } else if (curVehicle?.damage?.engineFire || ambientTemp > 75) {
          addPlayerNotification(player, `🔥 ОГОНЬ ПОД КАПОТОМ (${Math.round(ambientTemp)}°C)! Токсичный угарный газ заполняет салон!`, 'warning');
        } else if (curVehicle?.damage?.underHoodSmolder) {
          addPlayerNotification(player, `⚠️ Под капотом тлеет проводка! Запах гари и серый дым из дефлекторов!`, 'warning');
        }
      } else {
        if (ambientTemp > 110) {
          addPlayerNotification(player, `🚨 ВЫ ГОРИТЕ! ВЫ НАСТУПИЛИ В ГОРЯЩУЮ ЛУЖУ ИЛИ СТОИТЕ В ОГНЕ (${Math.round(ambientTemp)}°C)! СРОЧНО БЕГИТЕ!`, 'warning');
        } else {
          addPlayerNotification(player, `🔥 Рядом полыхает огонь (${Math.round(ambientTemp)}°C)! Жар от горящего бензина или масла обжигает лицо!`, 'warning');
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
            id: 'cold_car_' + Date.now(),
            text: `🥶 В салоне машины холодно (${Math.round(curVehicle.heaterTemp ?? outsideTemp)}°C)! Заведите мотор и включите печку.`,
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
      addPlayerNotification(player, '😴 Вы отлично выспались! Здоровье и силы на максимуме.', 'sleep');
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

  // 4. Sleepiness (Сонливость)
  const isNight = timeHour >= 22 || timeHour < 6;
  const sleepinessRate = isNight ? 0.08 : 0.04;
  player.needs.sleepiness = Math.min(100, player.needs.sleepiness + sleepinessRate * dt);

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
    addPlayerNotification(player, '💔 Критическое состояние! Вы теряете сознание...', 'warning');
  }

  // 6. Update Notification timers
  for (let i = player.notifications.length - 1; i >= 0; i--) {
    player.notifications[i].timer -= dt;
    if (player.notifications[i].timer <= 0) {
      player.notifications.splice(i, 1);
    }
  }
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
    // Speed-sensitive steering: at higher speeds, steering angle is capped for stability
    const speedRatio = Math.abs(vehicle.speed) / cfg.maxSpeed;
    const speedSteerDamping = 1 / (1 + Math.pow(speedRatio * 1.5, 1.4));
    const dynamicMaxSteer = Math.max(cfg.minSteerAngle, cfg.maxSteerAngle * speedSteerDamping);

    // Target steering angle from input
    let desiredSteer = 0;
    if (input.left) {
      desiredSteer = -dynamicMaxSteer;
    } else if (input.right) {
      desiredSteer = dynamicMaxSteer;
    }

    // Natural steering rack with smooth return-to-center
    if (input.left || input.right) {
      vehicle.steerAngle += (desiredSteer - vehicle.steerAngle) * Math.min(1.0, cfg.turnSpeed * 2.2 * dt);
    } else {
      // Smooth automatic centering
      vehicle.steerAngle *= Math.max(0, 1 - 8.0 * dt);
      if (Math.abs(vehicle.steerAngle) < 0.005) vehicle.steerAngle = 0;
    }

    // Acceleration & Braking with progressive throttle
    const isHandbraking = input.handbrake;
    const throttle = input.forward && !input.backward ? 1.0 : 0;
    const brake = input.backward ? 1.0 : 0;
    (vehicle as any)._lastThrottle = throttle;
    
    // --- MODULE 1 & 2: POWERTRAIN, ENGINE RPM, FUEL COMBUSTION ---
    let engineAccel = 0;
    const eng = vehicle.engineState;
    const fuel = vehicle.fuelSystem;
    
    if (eng) {
      let idleRPM = 800;
      let redlineRPM = 6200;
      let maxRPM = 8000;

      if (vehicle.type === 'supercar' || vehicle.type === 'sports' || vehicle.type === 'muscle' || vehicle.type === 'muscle_classic' || vehicle.type === 'coupe_gt' || vehicle.type === 'hatch_hot') {
        idleRPM = 900;
        redlineRPM = 7000;
        maxRPM = 9000;
      } else if (vehicle.type.startsWith('truck_') || vehicle.type === 'bus' || vehicle.type === 'bus_minibus' || vehicle.type === 'cement_mixer' || vehicle.type === 'garbage_truck' || vehicle.type === 'delivery_truck') {
        idleRPM = 600;
        redlineRPM = 3200;
        maxRPM = 4500;
      } else if (vehicle.type.includes('retro') || vehicle.type.includes('classic') || vehicle.type === 'micro_car') {
        idleRPM = 750;
        redlineRPM = 5200;
        maxRPM = 6500;
      }
      const stallThreshold = idleRPM * 0.55;
      
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
            eng.shiftCooldown = 0.3;
            sound.playButtonPress();
            input.shiftUp = false;
          } else if (input.shiftDown) {
            // Shift selector ladder: D -> N -> R -> P
            const oldMode = eng.autoGearMode;
            if (eng.autoGearMode === 'D') eng.autoGearMode = 'N';
            else if (eng.autoGearMode === 'N') eng.autoGearMode = 'R';
            else if (eng.autoGearMode === 'R') eng.autoGearMode = 'P';
            eng.shiftCooldown = 0.3;
            sound.playButtonPress();
            input.shiftDown = false;

            // Destructive shift into Park 'P' or Reverse 'R' at speed
            if (eng.autoGearMode === 'P' && Math.abs(vehicle.speed) > 10) {
              eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - 45);
              sound.playCollision(0.9);
              vehicle.speed *= 0.15; // violent jerk / parking pawl snap
              if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
              if (player && player.vehicleId === vehicle.id) {
                addPlayerNotification(player, '💥 СРЕЗАН ФИКСАТОР ПАРКИНГА (PARKING PAWL)! Переключение в "P" на ходу!', 'warning');
              }
            } else if (oldMode === 'N' && eng.autoGearMode === 'R' && Math.abs(vehicle.speed) > 12) {
              eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - 35);
              sound.playCollision(0.8);
              if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
              if (player && player.vehicleId === vehicle.id) {
                addPlayerNotification(player, '⚙️ УДАР ПО АКПП! Включение задней передачи "R" на ходу!', 'warning');
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
            const upshiftRPM = throttle > 0.85 ? redlineRPM * 0.84 : redlineRPM * 0.52;
            const downshiftRPM = throttle > 0.85 ? redlineRPM * 0.56 : redlineRPM * 0.28;
            if (eng.engineRPM > upshiftRPM && eng.currentGear < maxForwardGear) {
              eng.currentGear++;
              eng.shiftCooldown = 0.45;
              sound.playGearShift();
            } else if (eng.engineRPM < downshiftRPM && eng.currentGear > 1) {
              eng.currentGear--;
              eng.shiftCooldown = 0.45;
              sound.playGearShift();
            }
          }
        }
        eng.clutchPedal = 1.0;
      }
      
      // Manual transmission logic
      if (eng.transmissionType === 'MANUAL') {
        eng.shiftCooldown = Math.max(0, (eng.shiftCooldown || 0) - dt);
        if (eng.transmissionJammed) {
          if (input.shiftUp || input.shiftDown) {
            sound.playCollision(0.3);
            input.shiftUp = false;
            input.shiftDown = false;
            if (player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, '⚙️ КОРОБКА ПЕРЕДАЧ ЗАБЛОКИРОВАНА! Требуется ремонт в PIT-STOP.', 'warning');
            }
          }
        } else {
          if (input.shiftUp && eng.shiftCooldown <= 0) {
            const maxForwardGear = (eng.gearRatios?.length || 7) - 2;
            if (eng.currentGear < maxForwardGear) {
              eng.currentGear++;
              sound.playGearShift();
              eng.shiftCooldown = 0.16;
            }
            input.shiftUp = false;
          }
          if (input.shiftDown && eng.shiftCooldown <= 0) {
            if (eng.currentGear > -1) {
              eng.currentGear--;
              sound.playGearShift();

              // Catastrophic downshift into reverse while moving forward at speed
              if (eng.currentGear === -1 && Math.abs(vehicle.speed) > 8) {
                const damage = Math.min(65, 20 + Math.abs(vehicle.speed) * 0.9);
                eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - damage);
                sound.playCollision(0.85);
                vehicle.speed *= 0.3; // sudden violent deceleration
                if (eng.transmissionHealth <= 20) {
                  eng.transmissionJammed = true;
                }
                if (player && player.vehicleId === vehicle.id) {
                  addPlayerNotification(player, '⚙️ ТЯЖЕЛЫЙ СКРЕЖЕТ В КПП! Задняя передача включена во время движения!', 'warning');
                }
              }
              eng.shiftCooldown = 0.16;
            }
            input.shiftDown = false;
          }
        }

        // Clutch engagement for manual
        if (eng.currentGear === 0) {
          eng.clutchPedal += (0.0 - eng.clutchPedal) * Math.min(1.0, 20 * dt);
        } else if (eng.shiftCooldown > 0) {
          eng.clutchPedal += (0.0 - eng.clutchPedal) * Math.min(1.0, 25 * dt);
        } else {
          eng.clutchPedal += (1.0 - eng.clutchPedal) * Math.min(1.0, 20 * dt);
        }

        // Manual stalling (only if engine is running)
        if (eng.engineRunning) {
          let hasStalled = false;
          // 1. In gear with clutch engaged, stopped without throttle
          if (eng.currentGear !== 0 && eng.clutchPedal > 0.85 && Math.abs(vehicle.speed) < 4 && throttle < 0.12) {
            hasStalled = true;
          }
          // 2. High gear lugging at very low speed
          else if (eng.currentGear > 1 && eng.clutchPedal > 0.75 && Math.abs(vehicle.speed) < 10 && throttle < 0.25) {
            hasStalled = true;
          }
          // 3. Hard braking to dead stop in gear with clutch engaged
          else if (eng.currentGear > 0 && eng.clutchPedal > 0.8 && Math.abs(vehicle.speed) < 3 && brake > 0 && throttle === 0) {
            if (eng.engineRPM < stallThreshold) {
              hasStalled = true;
              vehicle.speed = 0;
            }
          }

          if (hasStalled) {
            eng.isStalled = true;
            eng.engineRunning = false;
            eng.engineRPM = 0;
            vehicle.speed *= 0.3; // Physical shudder / abrupt torque loss
            sound.playEngineStall();
            if (player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, '🛑 Двигатель заглох! (Сброс оборотов ниже нормы / отпущено сцепление)', 'warning');
            }
          }
        }
      }

      // Calculate RPM & engine response (only if engine is running)
      if (eng.engineRunning) {
        const currentGearRatio = eng.gearRatios[eng.currentGear + 1] !== undefined ? eng.gearRatios[eng.currentGear + 1] : 0;
        const gearRatio = Math.abs(currentGearRatio);
        const v_speed = Math.abs(vehicle.speed);
        
        const maxSpeedPx = cfg.maxSpeed * 2.7778;
        const reverseMaxSpeedPx = cfg.reverseMaxSpeed * 2.7778;

        const topGearIdx = (eng.gearRatios?.length || 7) - 1;
        const topGearRatio = Math.abs(eng.gearRatios[topGearIdx] || 0.78);
        const firstGearRatio = Math.abs(eng.gearRatios[2] || 3.6);

        // Speed corresponding to redline in current gear
        const speedAtRedline = eng.currentGear === -1 
          ? reverseMaxSpeedPx 
          : (maxSpeedPx * (topGearRatio / Math.max(0.3, gearRatio)));

        const wheelDrivenRPM = idleRPM + (v_speed / Math.max(1, speedAtRedline)) * (redlineRPM - idleRPM);

        if (eng.currentGear !== 0 && (!eng.autoGearMode || eng.autoGearMode !== 'P')) {
          let coupledRPM = wheelDrivenRPM;
          if (eng.transmissionType === 'AUTO') {
            const launchRPM = idleRPM + throttle * 1400;
            coupledRPM = Math.max(launchRPM, wheelDrivenRPM);
          } else {
            // Manual: at launch allow slip, once rolling clutch rigidly synchronizes engine to wheels
            if (v_speed < 10) {
              const launchRPM = idleRPM + throttle * 1300;
              coupledRPM = Math.max(launchRPM, wheelDrivenRPM);
            } else {
              coupledRPM = wheelDrivenRPM;
            }
          }
          const freeRevRPM = idleRPM + throttle * (redlineRPM - idleRPM);
          const targetRPM = freeRevRPM * (1 - eng.clutchPedal) + coupledRPM * eng.clutchPedal;
          eng.engineRPM += (targetRPM - eng.engineRPM) * Math.min(1.0, 22 * dt);
        } else {
          // Neutral or Park: free revving with flywheel inertia
          const freeRevRPM = idleRPM + throttle * (redlineRPM - idleRPM);
          eng.engineRPM += (freeRevRPM - eng.engineRPM) * Math.min(1.0, (throttle > 0.05 ? 18 : 12) * dt);
        }
        eng.engineRPM = Math.max(idleRPM - 50, Math.min(maxRPM, eng.engineRPM));
        
        // Dynamic torque curve: 75% torque at idle, 100% at mid-range, 75% at redline
        const normRPM = Math.max(0, Math.min(1.15, (eng.engineRPM - idleRPM) / (redlineRPM - idleRPM)));
        let T_factor = 0.75 + 0.25 * Math.sin(Math.min(1.0, normRPM) * Math.PI);
        if (normRPM > 1.0) {
          T_factor *= Math.max(0, 1.0 - (normRPM - 1.0) * 3.0);
        }

        // Realistic Electronic Fuel/Ignition Rev Limiter (Отсечка: циклические микро-пропуски ~18-20 Гц и искры)
        if (eng.engineRPM >= redlineRPM) {
          const prevTimer = eng.revLimiterTimer || 0;
          eng.revLimiterTimer = prevTimer + dt;
          const cutCycle = (eng.revLimiterTimer * 20) % 1.0;

          // Sustained redline operation causes engine wear and heat buildup
          if (eng.revLimiterTimer > 3.5) {
            eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - 7 * dt);
            eng.temperature = Math.min(130, (eng.temperature ?? 85) + 6 * dt);
            if (prevTimer <= 3.5 && player && player.vehicleId === vehicle.id) {
              addPlayerNotification(player, '⚠️ Длительное удержание в отсечке разрушает двигатель и вызываeт перегрев!', 'warning');
            }
            if (Math.random() < 0.3) {
              world.particles.push({
                x: vehicle.x, y: vehicle.y,
                vx: -Math.cos(vehicle.angle) * 20 + (Math.random() * 10 - 5),
                vy: -Math.sin(vehicle.angle) * 20 + (Math.random() * 10 - 5),
                radius: 3.5, color: '#94a3b8', alpha: 0.7, life: 0, maxLife: 0.4, type: 'engine_smoke'
              });
            }
          }

          if (cutCycle > 0.45) {
            // Fuel cut phase: zero torque & drop RPM slightly
            T_factor = 0.0;
            eng.engineRPM -= 2400 * dt;
            if (Math.random() < 0.25) {
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
                type: 'spark'
              });
            }
          }
        } else {
          eng.revLimiterTimer = 0;
        }

        // Cold engine viscous resistance (thick cold oil reduces available torque by ~14% until warmed up to 60°C)
        if ((eng.temperature ?? 85) < 60) {
          const warmupRatio = Math.max(0, Math.min(1.0, ((eng.temperature ?? 20) - 20) / 40));
          T_factor *= (0.86 + 0.14 * warmupRatio);
        }
        
        // Gear acceleration multiplier (1st gear has high torque multiplier, overdrive top gear trades acceleration for low RPM cruising)
        let gearAccelMult = 1.0;
        if (eng.currentGear === -1) {
          gearAccelMult = 1.05;
        } else if (eng.currentGear > 0) {
          // Mechanical wheel torque advantage proportional to gear ratio
          gearAccelMult = Math.pow(gearRatio / firstGearRatio, 0.85);
        }

        // Fuel System Consequences
        let fuelFactor = 1.0;
        if (fuel && vehicle.requiredFuel) {
          // 1. Wrong fuel
          if (vehicle.requiredFuel !== 'diesel' && fuel.fuelType === 'diesel') {
            eng.engineKnocking = true;
            fuelFactor = 0.0;
            if (!eng.isStalled && Math.random() < 0.02) {
              eng.isStalled = true;
              eng.engineRunning = false;
            }
            if (Math.random() < 0.3) {
              world.particles.push({
                x: vehicle.x, y: vehicle.y, vx: -Math.cos(vehicle.angle)*20, vy: -Math.sin(vehicle.angle)*20,
                radius: 4, color: '#e2e8f0', alpha: 0.8, life: 0, maxLife: 0.5, type: 'engine_smoke'
              });
            }
          }
          // 2. Sub-Octane Fuel
          if (vehicle.requiredFuel === 'ai95' && fuel.octaneNumber === 92) {
            fuelFactor *= 0.82;
            if (throttle > 0.8 && Math.random() < 0.08 * dt) {
              eng.temperature += 5;
              eng.engineKnocking = true;
              vehicle.speed *= 0.95;
              sound.playHurt();
            }
          }
          // 3. Low Quality
          if (fuel.fuelQuality < 65) {
            if (Math.random() < 0.1) fuelFactor = 0;
            if (Math.random() < 0.05) {
              world.particles.push({
                x: vehicle.x, y: vehicle.y, vx: -Math.cos(vehicle.angle)*20, vy: -Math.sin(vehicle.angle)*20,
                radius: 3, color: '#111827', alpha: 0.8, life: 0, maxLife: 0.3, type: 'exhaust'
              });
            }
          }
        }
        
        const isParkedMode = eng.transmissionType === 'AUTO' && eng.autoGearMode === 'P';
        const isNeutralMode = (eng.transmissionType === 'AUTO' && eng.autoGearMode === 'N') || eng.currentGear === 0;

        // Current gear top speed calculation
        const gearMaxSpeedPx = maxSpeedPx * (0.8 / Math.max(0.3, gearRatio)) * 1.05;

        // Calculate Engine Compression Braking & Over-Rev Retardation Force
        let engineBrakeFactor = 0;
        if (eng.clutchPedal > 0.3 && eng.currentGear !== 0 && !isNeutralMode && !isParkedMode) {
          // 1. Standard throttle-off engine compression braking
          if (throttle === 0 && eng.engineRPM > idleRPM + 400) {
            engineBrakeFactor = (gearRatio / 3.4) * (eng.engineRPM / redlineRPM) * 85.0 * eng.clutchPedal;
          }

          // 2. Downshift / Over-rev braking (Money shift / Downshifting at high speed)
          // Rapidly decelerates vehicle momentum via engine drag instead of instant speed teleportation
          if (v_speed > gearMaxSpeedPx) {
            const overSpeedRatio = (v_speed - gearMaxSpeedPx) / gearMaxSpeedPx;
            const overRevBrake = (180.0 + overSpeedRatio * 380.0) * (gearRatio / 2.5) * eng.clutchPedal;
            engineBrakeFactor = Math.max(engineBrakeFactor, overRevBrake);

            // Transmission synchro & gear damage during over-rev
            if (overSpeedRatio > 0.15) {
              eng.transmissionHealth = Math.max(0, (eng.transmissionHealth ?? 100) - overSpeedRatio * 35 * dt);
              if (eng.transmissionHealth <= 20) eng.transmissionJammed = true;
            }

            // Severe Money Shift: Catastrophic engine mechanical over-rev (valve float / bent valves / connecting rod stress)
            if (overSpeedRatio > 0.25) {
              eng.engineHealth = Math.max(0, (eng.engineHealth ?? 100) - overSpeedRatio * 55 * dt);
              eng.temperature = Math.min(130, (eng.temperature ?? 85) + overSpeedRatio * 15 * dt);
              if (eng.engineHealth <= 0) {
                eng.isSeized = true;
                eng.engineRunning = false;
                eng.engineRPM = 0;
              }
              if (Math.random() < 0.2 * dt) {
                sound.playCollision(0.8);
                if (player && player.vehicleId === vehicle.id) {
                  addPlayerNotification(player, '💥 МЕХАНИЧЕСКИЙ ПЕРЕКРУТ (MONEY SHIFT)! Клапаны загнуты, КПП разрушается!', 'warning');
                }
              }
            }
          }
        }

        let driveAccel = 0;
        if (!isParkedMode && !isNeutralMode) {
          let effectiveThrottle = throttle;
          // Automatic transmission creep in D or R when no pedal is pressed
          if (eng.transmissionType === 'AUTO' && brake === 0 && throttle === 0 && Math.abs(vehicle.speed) < 16) {
            effectiveThrottle = 0.16;
          }

          if (effectiveThrottle > 0) {
            // Engine power drops off smoothly as vehicle approaches top speed for current gear
            const speedCapFactor = Math.max(0, Math.min(1.0, (gearMaxSpeedPx - v_speed) / (gearMaxSpeedPx * 0.12)));
            const clutchGrip = Math.max(0.4, eng.clutchPedal);
            driveAccel = cfg.acceleration * gearAccelMult * T_factor * fuelFactor * effectiveThrottle * clutchGrip * speedCapFactor;
          }
        }
        
        // Determine propulsion direction
        const isReverseMode = eng.currentGear === -1 || (eng.transmissionType === 'AUTO' && eng.autoGearMode === 'R');
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
    }
    
    // Braking & Rolling Resistance logic
    if (brake > 0) {
      vehicle.brakeLightsOn = true;
      const bForce = cfg.brakingForce * brake;
      if (vehicle.speed > 0) {
        engineAccel -= bForce;
        if (vehicle.speed < 8) vehicle.speed = Math.max(0, vehicle.speed - bForce * dt);
      } else if (vehicle.speed < 0) {
        engineAccel += bForce;
        if (vehicle.speed > -8) vehicle.speed = Math.min(0, vehicle.speed + bForce * dt);
      }
      if (Math.abs(vehicle.speed) < 2) {
        vehicle.speed = 0;
      }
    } else {
      vehicle.brakeLightsOn = isHandbraking;
      if (isHandbraking) {
        // Handbrake: strong deceleration and wheel lock
        const hBrakeForce = cfg.brakingForce * 0.9;
        if (Math.abs(vehicle.speed) > 1) {
          engineAccel -= Math.sign(vehicle.speed) * hBrakeForce;
        } else {
          vehicle.speed = 0;
        }
      } else {
        // Natural rolling resistance and aerodynamic drag (v^2)
        const vAbs = Math.abs(vehicle.speed);
        const rollingResistance = 5.0 + vAbs * 0.02;
        
        let aeroCoeff = 0.00085;
        if (['truck_box', 'truck_dump', 'truck_tanker', 'truck_water', 'truck_flatbed', 'cement_mixer', 'garbage_truck', 'bus', 'delivery_truck', 'truck_tow', 'fire_engine', 'fire_ladder', 'fire_rescue'].includes(cfg.type)) {
          aeroCoeff = 0.0016;
        } else if (cfg.type.startsWith('tractor_') || ['suv', 'suv_luxury', 'offroad_hardcore', 'suv_classic_box'].includes(cfg.type)) {
          aeroCoeff = 0.0013;
        } else if (['supercar', 'sports', 'coupe_gt', 'hatch_hot'].includes(cfg.type)) {
          aeroCoeff = 0.00065;
        }
        
        const aeroDrag = aeroCoeff * vAbs * vAbs;
        const totalDrag = rollingResistance + aeroDrag;

        if (vAbs > 1) {
          engineAccel -= Math.sign(vehicle.speed) * totalDrag;
        } else if (throttle === 0 && (!eng || eng.transmissionType !== 'AUTO' || eng.autoGearMode === 'P' || eng.autoGearMode === 'N')) {
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

    // Apply engine acceleration
    vehicle.speed += engineAccel * dt;

    const maxSpeedPx = cfg.maxSpeed * 2.7778;
    const reverseMaxSpeedPx = cfg.reverseMaxSpeed * 2.7778;

    // Hard speed limits
    if (vehicle.speed > maxSpeedPx) vehicle.speed = maxSpeedPx;
    if (vehicle.speed < -reverseMaxSpeedPx) vehicle.speed = -reverseMaxSpeedPx;
    if (Math.abs(vehicle.speed) < 2 && !input.forward && !input.backward) {
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

    // Angular rotation from front wheel steer angle (Ackerman / Bicycle model around rear axle)
    // Turn radius R = wheelBase / tan(steerAngle)
    // Yaw rate omega = v / R = (v / wheelBase) * tan(steerAngle)
    const maxSafeSteer = 0.82; // cap tan(steer) from asymptotic growth
    const clampedSteer = Math.max(-maxSafeSteer, Math.min(maxSafeSteer, vehicle.steerAngle));
    const tanSteer = Math.tan(clampedSteer);
    const angularSpeed = (vehicle.speed / Math.max(1, wheelBase)) * tanSteer;

    // Update yaw angle around the physical center (rear axle)
    vehicle.angularVelocity = angularSpeed;
    vehicle.angle += vehicle.angularVelocity * dt;
    vehicle.angle = ((vehicle.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    // Lateral grip friction & drift slip at the rear tires
    // In normal driving (no handbrake, no intentional drift), rear wheels have full traction (no phantom sideways slip)
    const currentGrip = isHandbraking ? cfg.driftGrip : cfg.grip;
    const effectiveGrip = currentGrip * (1 - Math.min(0.8, vehicle.driftFactor || 0));

    let lateralSlip = vehicle.lateralVelocity || 0;
    if (isHandbraking && Math.abs(vehicle.speed) > 20) {
      // Handbrake breaks rear traction, swinging the rear out in the direction of turn
      const centrifugalSlip = -Math.sign(vehicle.steerAngle || 1) * Math.min(120, Math.abs(vehicle.speed) * 0.7);
      lateralSlip += (centrifugalSlip - lateralSlip) * Math.min(1.0, 10.0 * dt);
    } else {
      // Natural tire grip quickly damps any residual lateral slip to 0
      const lateralDamping = Math.pow(1 - effectiveGrip, dt * 16);
      lateralSlip *= lateralDamping;
      if (Math.abs(lateralSlip) < 0.5) lateralSlip = 0;
    }
    vehicle.lateralVelocity = lateralSlip;

    // New heading after rotation
    const newHeadingCos = Math.cos(vehicle.angle);
    const newHeadingSin = Math.sin(vehicle.angle);

    // Rear axle moves along forward heading at vehicle.speed, plus any genuine lateral drift slip
    const rearVelX = newHeadingCos * vehicle.speed - newHeadingSin * lateralSlip;
    const rearVelY = newHeadingSin * vehicle.speed + newHeadingCos * lateralSlip;

    const newRearX = rearX + rearVelX * dt;
    const newRearY = rearY + rearVelY * dt;

    // Reconstruct vehicle center from the newly translated & rotated rear axle
    const newCenterX = newRearX + newHeadingCos * rearAxleDist;
    const newCenterY = newRearY + newHeadingSin * rearAxleDist;

    // Velocity vector for the vehicle center (combines longitudinal speed and rear-pivot angular swing)
    vehicle.vx = (newCenterX - vehicle.x) / dt;
    vehicle.vy = (newCenterY - vehicle.y) / dt;

    // Drift Detection & Skidmarks
    const slipMagnitude = Math.abs(lateralSlip);
    vehicle.isDrifting = (isHandbraking && Math.abs(vehicle.speed) > 35) || 
                         (slipMagnitude > 45 && Math.abs(vehicle.speed) > 65);

    if (vehicle.isDrifting) {
      sound.startTireScreech(Math.min(1.0, slipMagnitude / 100));

      const trackHalf = cfg.width * 0.42;
      const leftTireX = newRearX - newHeadingSin * trackHalf;
      const leftTireY = newRearY + newHeadingCos * trackHalf;
      const rightTireX = newRearX + newHeadingSin * trackHalf;
      const rightTireY = newRearY - newHeadingCos * trackHalf;

      world.skidMarks.push({
        x1: leftTireX,
        y1: leftTireY,
        x2: leftTireX - rearVelX * dt * 0.9,
        y2: leftTireY - rearVelY * dt * 0.9,
        alpha: Math.min(0.65, lateralSlip / 100),
        color: '#111827',
        width: 3.5
      });

      world.skidMarks.push({
        x1: rightTireX,
        y1: rightTireY,
        x2: rightTireX - rearVelX * dt * 0.9,
        y2: rightTireY - rearVelY * dt * 0.9,
        alpha: Math.min(0.65, lateralSlip / 100),
        color: '#111827',
        width: 3.5
      });

      if (Math.random() > 0.45) {
        world.particles.push({
          x: leftTireX + (Math.random() * 6 - 3),
          y: leftTireY + (Math.random() * 6 - 3),
          vx: (Math.random() * 20 - 10),
          vy: (Math.random() * 20 - 10),
          radius: 4 + Math.random() * 5,
          color: '#e2e8f0',
          alpha: 0.5,
          life: 0,
          maxLife: 0.5,
          type: 'tire_smoke'
        });
      }
    } else {
      sound.stopTireScreech();
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
      return;
    }

    // Smooth, gentle acceleration and polite braking for AI
    const accelRate = 90; // px/s^2 (no rapid jerking or shoving)
    const brakeRate = 180; // px/s^2

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
      vehicle.isReversing = vehicle.speed < -2;
      if (vehicle.idmAcceleration !== undefined) {
        // IDM Controlled speed and brake lights
        vehicle.speed = Math.max(0, vehicle.speed + vehicle.idmAcceleration * dt);
        vehicle.brakeLightsOn = vehicle.idmAcceleration < -20 || vehicle.speed < 4;
      } else {
        if (vehicle.speed < vehicle.targetSpeed) {
          vehicle.speed = Math.min(vehicle.targetSpeed, vehicle.speed + accelRate * dt);
          vehicle.brakeLightsOn = false;
        } else if (vehicle.speed > vehicle.targetSpeed) {
          vehicle.speed = Math.max(vehicle.targetSpeed, vehicle.speed - brakeRate * dt);
          vehicle.brakeLightsOn = (vehicle.speed - vehicle.targetSpeed > 10) || (vehicle.targetSpeed < 5);
        } else {
          vehicle.brakeLightsOn = false;
        }
      }
    }

    // Kinematic velocity aligned with vehicle heading and rear-axle pivot rotation
    const { rearAxleDist: npcRearAxleDist } = getVehicleAxleGeometry(vehicle);
    const cosA = Math.cos(vehicle.angle);
    const sinA = Math.sin(vehicle.angle);
    const yawRate = vehicle.angularVelocity || 0;
    vehicle.vx = cosA * vehicle.speed - sinA * (yawRate * npcRearAxleDist);
    vehicle.vy = sinA * vehicle.speed + cosA * (yawRate * npcRearAxleDist);
  }

  // --- PROGRESSIVE MULTI-FRAME CRUMPLE ZONE CUSHIONING & DECELERATION ---
  if (vehicle.activeCrumple && vehicle.activeCrumple.timer > 0) {
    const c = vehicle.activeCrumple;
    c.timer = Math.max(0, c.timer - dt);
    const progress = 1 - c.timer / c.totalDuration; // 0.0 to 1.0

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
        color: Math.random() > 0.35 ? '#f59e0b' : '#ef4444',
        alpha: 0.95,
        life: 0,
        maxLife: 0.12 + Math.random() * 0.12,
        type: 'spark'
      });
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

  // --- VEHICLE-TO-VEHICLE COLLISION RESOLUTION ---
  for (const other of nearbyVehicles) {
    if (other.id === vehicle.id) continue;
    // Towing vehicle and hitched trailer must never collide with each other!
    if (vehicle.trailerId === other.id || vehicle.towedById === other.id || other.trailerId === vehicle.id || other.towedById === vehicle.id) {
      continue;
    }

    const isPlayerInvolved = vehicle.isPlayerControlled || other.isPlayerControlled;
    
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
        // Player involved: full physics impulse, separation, deformation, and torque
        const sepPush = 1.01;
        vehicle.x -= col.normalX * col.overlap * ratioSelf * sepPush;
        vehicle.y -= col.normalY * col.overlap * ratioSelf * sepPush;
        other.x += col.normalX * col.overlap * ratioOther * sepPush;
        other.y += col.normalY * col.overlap * ratioOther * sepPush;

        const relVx = (other.vx + (other.knockbackVx || 0)) - (vehicle.vx + (vehicle.knockbackVx || 0));
        const relVy = (other.vy + (other.knockbackVy || 0)) - (vehicle.vy + (vehicle.knockbackVy || 0));
        const velAlongNormal = relVx * col.normalX + relVy * col.normalY;

        if (velAlongNormal < 0) {
          const restitution = 0.18; // Slightly more elastic rebound for vehicle bodies
          const impulseMagnitude = -(1 + restitution) * velAlongNormal / (1 / vehicle.mass + 1 / other.mass);
          
          // Controlled knockback factor: slightly more responsive impulse application
          const knockbackScale = Math.min(1.0, Math.max(0, (Math.abs(velAlongNormal) - 25) / 75)) * 0.28;
          const impulseX = impulseMagnitude * col.normalX * knockbackScale;
          const impulseY = impulseMagnitude * col.normalY * knockbackScale;

          vehicle.knockbackVx = (vehicle.knockbackVx || 0) - impulseX / vehicle.mass;
          vehicle.knockbackVy = (vehicle.knockbackVy || 0) - impulseY / vehicle.mass;
          other.knockbackVx = (other.knockbackVx || 0) + impulseX / other.mass;
          other.knockbackVy = (other.knockbackVy || 0) + impulseY / other.mass;

          // Angular impulse
          const rX_vehicle = col.contactX - vehicle.x;
          const rY_vehicle = col.contactY - vehicle.y;
          const rX_other = col.contactX - other.x;
          const rY_other = col.contactY - other.y;
          
          const I_yaw_vehicle = vehicle.mass * (vehicle.width * vehicle.width + vehicle.length * vehicle.length) / 12;
          const I_yaw_other = other.mass * (other.width * other.width + other.length * other.length) / 12;
          
          const tau_vehicle = rX_vehicle * (-impulseY) - rY_vehicle * (-impulseX);
          const tau_other = rX_other * impulseY - rY_other * impulseX;
          
          vehicle.knockbackSpin = (vehicle.knockbackSpin || 0) + tau_vehicle / I_yaw_vehicle;
          other.knockbackSpin = (other.knockbackSpin || 0) + tau_other / I_yaw_other;

          if (vehicle.isPlayerControlled) {
            vehicle.speed = Math.hypot(vehicle.vx + (vehicle.knockbackVx || 0), vehicle.vy + (vehicle.knockbackVy || 0)) * Math.sign(vehicle.speed || 1);
          } else {
            vehicle.speed = Math.hypot(vehicle.vx + (vehicle.knockbackVx || 0), vehicle.vy + (vehicle.knockbackVy || 0));
            if (impulseMagnitude / vehicle.mass > 40) {
              vehicle.stunnedTimer = Math.min(0.8, (impulseMagnitude / vehicle.mass) / 80);
            }
          }

          if (other.isPlayerControlled) {
            other.speed = Math.hypot(other.vx + (other.knockbackVx || 0), other.vy + (other.knockbackVy || 0)) * Math.sign(other.speed || 1);
          } else {
            other.speed = Math.hypot(other.vx + (other.knockbackVx || 0), other.vy + (other.knockbackVy || 0));
            if (impulseMagnitude / other.mass > 40) {
              other.stunnedTimer = Math.min(0.8, (impulseMagnitude / other.mass) / 80);
            }
          }

          const impactSpeed = Math.abs(velAlongNormal);
          const scrapeSpeed = Math.abs(relVx * -col.normalY + relVy * col.normalX);

          // Apply mutual softbody crumple zone cushion if relative impact is significant
          if (impactSpeed > 20) {
            const crumpleDuration = 0.08 + Math.min(0.06, impactSpeed / 800);
            if (!vehicle.activeCrumple) {
              vehicle.activeCrumple = {
                timer: crumpleDuration,
                totalDuration: crumpleDuration,
                normalX: -col.normalX,
                normalY: -col.normalY,
                initialSpeed: vehicle.speed,
                reboundSpeed: -0.1 * Math.sign(vehicle.speed || 1) * Math.min(20, Math.abs(vehicle.speed)),
                contactX: col.contactX,
                contactY: col.contactY
              };
            }
            if (!other.activeCrumple) {
              other.activeCrumple = {
                timer: crumpleDuration,
                totalDuration: crumpleDuration,
                normalX: col.normalX,
                normalY: col.normalY,
                initialSpeed: other.speed,
                reboundSpeed: -0.1 * Math.sign(other.speed || 1) * Math.min(20, Math.abs(other.speed)),
                contactX: col.contactX,
                contactY: col.contactY
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

        const otherIsStoppedOrYielding = other.speed < 6 || other.aiState === 'stopping_light' || other.aiState === 'yielding' || other.aiState === 'stopping_obstacle';
        const selfIsStoppedOrYielding = vehicle.speed < 6 || vehicle.aiState === 'stopping_light' || vehicle.aiState === 'yielding' || vehicle.aiState === 'stopping_obstacle';

        if (dotLong < -0.2) {
          // 'vehicle' is behind 'other' (vehicle bumped into other's rear/bumper):
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
          // 'other' is behind 'vehicle' (other bumped into vehicle's rear):
          // 'other' MUST absorb 100% of the backward separation push!
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
          // Dynamic multi-frame crumple zone cushion:
          // Kinetic energy is absorbed over ~5-8 frames (0.08 - 0.12s),
          // generating continuous metal wrinkling and smooth deceleration!
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
          vehicle.speed *= 0.4;
          vehicle.vx *= 0.4;
          vehicle.vy *= 0.4;
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

  // World bounds clamp (safe outer margin)
  vehicle.x = Math.max(15, Math.min(world.width - 15, vehicle.x));
  vehicle.y = Math.max(15, Math.min(world.height - 15, vehicle.y));
}

export function updateSkidMarksAndParticles(world: GameWorld, player: Player, dt: number) {
  // Skid marks fade (O(N) in-place retention, zero splice overhead)
  const smList = world.skidMarks;
  const smLen = smList.length;
  let smWrite = 0;
  for (let i = 0; i < smLen; i++) {
    const sm = smList[i];
    sm.alpha -= dt * 0.015;
    if (sm.alpha > 0.01) {
      smList[smWrite++] = sm;
    }
  }
  smList.length = smWrite;

  if (smList.length > 500) {
    const dropCount = smList.length - 500;
    for (let i = 0; i < 500; i++) {
      smList[i] = smList[i + dropCount];
    }
    smList.length = 500;
  }

  // Fluid Stains aging & drying & BURNING dynamics
  if (!world.stains) world.stains = [];
  const newlyIgnited = new Set<string>();

  const stainsList = world.stains;
  const stainsLen = stainsList.length;
  let stWrite = 0;

  for (let i = 0; i < stainsLen; i++) {
    const st = stainsList[i];

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
      const stainSpawnChance = (st.type === 'fuel' ? 12.0 : 8.0) * dt;
      if (Math.random() < stainSpawnChance) {
        // Flame particle
        world.particles.push({
          x: st.x + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
          y: st.y + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
          vx: (Math.random() * 20 - 10),
          vy: -25 - Math.random() * 25,
          radius: 2.5 + st.radius * 0.35 + Math.random() * 4,
          color: Math.random() < 0.55 ? '#f59e0b' : '#ef4444',
          alpha: 0.9,
          life: 0,
          maxLife: 0.3 + Math.random() * 0.35,
          type: 'flame'
        });

        // Dense smoke particle
        world.particles.push({
          x: st.x + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
          y: st.y + (Math.random() * st.radius * 1.4 - st.radius * 0.7),
          vx: (Math.random() * 16 - 8),
          vy: -35 - Math.random() * 30,
          radius: 4.5 + st.radius * 0.5 + Math.random() * 6,
          color: st.type === 'oil' ? '#090d16' : '#1e293b',
          alpha: 0.85,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.5,
          type: 'engine_smoke'
        });
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
          type: 'spark'
        });
      }

      // SPREAD FIRE TO NEIGHBORING FUEL/OIL STAINS (chain reaction!)
      if (st.fireIntensity > 0.45) {
        for (let j = 0; j < stainsLen; j++) {
          const other = stainsList[j];
          if (other !== st && !other.onFire && !newlyIgnited.has(other.id) && (other.type === 'fuel' || other.type === 'oil')) {
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
      if (st.type === 'fuel' && st.fireIntensity > 0.4) {
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
              // Direct contact with the fuel tank initiates rear fuel tank fire!
              car.damage.fireOrigin = 'rear';
              car.damage.fuelTankFire = true;
              car.damage.fireTimer = 0;
              car.damage.fireProgress = 0.2;
              car.damage.fireIntensity = 0.7;
              car.damage.groundPuddleIgnited = true;
              if (car.isPlayerControlled) {
                addPlayerNotification(player, `🚨 Горящая лужа бензина подожгла бензобак машины сзади!`, 'warning');
              }
            }
          }
        }
      }
    } else {
      // Normal drying out (water evaporates faster on asphalt, especially in warm weather)
      const dryMultiplier = st.type === 'water' ? 1.5 : 1.0;
      st.life += dt * dryMultiplier;
    }

    if (typeof st.alpha !== 'number' || !isFinite(st.alpha)) {
      st.alpha = st.type === 'oil' ? 0.75 : (st.type === 'coolant' ? 0.65 : (st.type === 'water' ? 0.60 : 0.45));
    }

    const fadeDuration = st.type === 'water' ? 20 : 60;
    const fadeStart = Math.max(0, st.maxLife - fadeDuration);
    if (st.life > fadeStart) {
      st.alpha = Math.max(0, (1 - (st.life - fadeStart) / fadeDuration) * (st.type === 'oil' ? 0.75 : (st.type === 'coolant' ? 0.65 : (st.type === 'water' ? 0.60 : 0.45))));
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

  // Update trailer towing physics and tow hitch constraint positioning
  updateTrailerTowingPhysics(world, dt);

  // Spawn smoke/steam/flame for damaged vehicles
  for (const car of world.vehicles) {
    if (isTrailerVehicle(car)) continue; // Trailers do not emit engine smoke, steam or flames!
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
            fireOffsets.push(car.damage.fireOrigin === 'rear' ? -car.length * 0.35 : car.length * 0.35);
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
            color: Math.random() < 0.55 ? '#f59e0b' : '#ef4444',
            alpha: 0.88,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.35,
            type: 'flame'
          });

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
            type: 'engine_smoke'
          });

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
              type: 'spark'
            });
          }
        } else {
          // Detailed under-hood steam and smoke rendering
          const steamType = car.damage.underHoodSteam || 'none';
          const smokeType = car.damage.underHoodSmolder ? 'oil_gray_wiring_black' : (car.damage.underHoodSmoke || 'none');

          let hasRenderedSteam = false;
          let hasRenderedSmoke = false;

          // 1. STEAM GENERATION
          if (steamType === 'thin') {
            hasRenderedSteam = true;
            if (Math.random() < 0.45) {
              world.particles.push({
                x: hoodX + (Math.random() * 2 - 1),
                y: hoodY + (Math.random() * 2 - 1),
                vx: -cosA * 4 + (Math.random() * 4 - 2),
                vy: -sinA * 4 - 18 + (Math.random() * 4 - 2), // rising thin stream
                radius: 1.8 + Math.random() * 2.2,
                color: '#f8fafc',
                alpha: 0.45,
                life: 0,
                maxLife: 0.5 + Math.random() * 0.3,
                type: 'engine_smoke'
              });
            }
          } else if (steamType === 'dense') {
            hasRenderedSteam = true;
            if (Math.random() < 0.85) {
              world.particles.push({
                x: hoodX + (Math.random() * 6 - 3),
                y: hoodY + (Math.random() * 6 - 3),
                vx: -cosA * 6 + (Math.random() * 10 - 5),
                vy: -sinA * 6 - 15 + (Math.random() * 8 - 4),
                radius: 7 + Math.random() * 6,
                color: '#f8fafc', // specified dense white steam color
                alpha: 0.72,
                life: 0,
                maxLife: 0.9 + Math.random() * 0.5,
                type: 'engine_smoke'
              });
            }
          } else if (steamType === 'geyser') {
            hasRenderedSteam = true;
            const geyserCount = Math.floor(Math.random() * 2) + 1;
            for (let g = 0; g < geyserCount; g++) {
              world.particles.push({
                x: hoodX + (Math.random() * 4 - 2),
                y: hoodY + (Math.random() * 4 - 2),
                vx: -cosA * 12 + (Math.random() * 8 - 4),
                vy: -sinA * 12 - 40 - Math.random() * 20, // powerful geyser upwards blast
                radius: 5 + Math.random() * 5,
                color: '#f8fafc',
                alpha: 0.85,
                life: 0,
                maxLife: 0.4 + Math.random() * 0.3,
                type: 'engine_smoke'
              });
            }
          }

          // 2. SMOKE GENERATION
          if (smokeType === 'oil_blue') {
            hasRenderedSmoke = true;
            if (Math.random() < 0.60) {
              world.particles.push({
                x: hoodX + (Math.random() * 6 - 3),
                y: hoodY + (Math.random() * 6 - 3),
                vx: -cosA * 5 + (Math.random() * 12 - 6),
                vy: -sinA * 5 - 12 + (Math.random() * 10 - 5),
                radius: 6 + Math.random() * 5,
                color: '#64748b', // specified blue-gray oil smoke color
                alpha: 0.65,
                life: 0,
                maxLife: 0.8 + Math.random() * 0.4,
                type: 'engine_smoke'
              });
            }
          } else if (smokeType === 'oil_gray_wiring_black') {
            hasRenderedSmoke = true;
            if (Math.random() < 0.75) {
              // Thick gray oil smoke
              world.particles.push({
                x: hoodX + (Math.random() * 8 - 4),
                y: hoodY + (Math.random() * 8 - 4),
                vx: -cosA * 6 + (Math.random() * 16 - 8),
                vy: -sinA * 6 - 22 + (Math.random() * 14 - 7),
                radius: 8 + Math.random() * 7,
                color: '#475569', // thick gray oil smoke
                alpha: 0.80,
                life: 0,
                maxLife: 1.1 + Math.random() * 0.5,
                type: 'engine_smoke'
              });
            }
            if (Math.random() < 0.55) {
              // Acrid black wiring smoke
              world.particles.push({
                x: hoodX + (Math.random() * 6 - 3),
                y: hoodY + (Math.random() * 6 - 3),
                vx: -cosA * 4 + (Math.random() * 12 - 6),
                vy: -sinA * 4 - 28 + (Math.random() * 12 - 6),
                radius: 5 + Math.random() * 6,
                color: '#0f172a', // black wiring color
                alpha: 0.88,
                life: 0,
                maxLife: 0.9 + Math.random() * 0.4,
                type: 'engine_smoke'
              });
            }
          }

          // Fallback to standard white radiator steam if no other smoke/steam generated but smoking flag is set
          if (!hasRenderedSteam && !hasRenderedSmoke) {
            const fallbackColor = (car.engineState?.overheatingSteam) ? '#f8fafc' : '#94a3b8';
            world.particles.push({
              x: hoodX + (Math.random() * 6 - 3),
              y: hoodY + (Math.random() * 6 - 3),
              vx: -cosA * 15 + (Math.random() * 20 - 10),
              vy: -sinA * 15 + (Math.random() * 20 - 10),
              radius: 3 + Math.random() * 4,
              color: fallbackColor,
              alpha: 0.60,
              life: 0,
              maxLife: 0.6 + Math.random() * 0.4,
              type: 'engine_smoke'
            });
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
  if (!world.hasOwnProperty('_particlesInitialized')) {
    (world as any)._particlesInitialized = true;
    // Pre-hook the push method to draw from the pool whenever possible to avoid allocating new objects
    const originalPush = world.particles.push;
    world.particles.push = function(...items: Particle[]) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (world.cleanMode && (item.type === 'engine_smoke' || item.type === 'tire_smoke' || item.type === 'exhaust')) {
          continue;
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
          p.life = item.life;
          p.maxLife = item.maxLife;
          originalPush.call(this, p);
        } else {
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
    if (p.type === 'tire_smoke' || p.type === 'engine_smoke' || p.type === 'exhaust' || p.type === 'water_fountain' || p.type === 'water_splash') {
      p.radius += dt * 5;
    }
    p.alpha = Math.max(0, 1 - (p.life / p.maxLife));

    if (p.life < p.maxLife) {
      pList[pWrite++] = p;
    } else {
      particlePool.push(p); // Recycle to pool without array shifting
    }
  }
  pList.length = pWrite;
}

const scratchVehicleSet = new Set<Vehicle>();

export function updateBreakablePropsAndLivingWorld(world: GameWorld, player: Player, dt: number, vehGrid?: any) {
  const isRaining = world.weather === 'rain' || world.weather === 'storm';

  // Spawn new puddles dynamically if it's raining
  if (isRaining) {
    const nonPondPuddles = world.puddles.filter(p => !p.isPond);
    if (nonPondPuddles.length < 50 && Math.random() < 0.05) { // Slow gradual puddle spawn up to 50 max
      const roads = world.roads || [];
      if (roads.length > 0) {
        const road = roads[Math.floor(Math.random() * roads.length)];
        const px = road.direction === 'horizontal' ? (road.x1 + road.x2) / 2 + (Math.random() * 200 - 100) : road.x1 + (Math.random() * road.width - road.width / 2);
        const py = road.direction === 'vertical' ? (road.y1 + road.y2) / 2 + (Math.random() * 200 - 100) : road.y1 + (Math.random() * road.width - road.width / 2);
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
      if (prop.type === 'hydrant' && (prop.waterFountainTimer ?? 0) > 0) {
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
            type: 'water_fountain'
          });
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
            type: 'debris'
          });
        }
        continue; // Indestructible: remains standing and intact
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
          veh.speed = Math.hypot(veh.vx, veh.vy) * Math.sign(veh.speed || 1);
        }
        continue;
      }

      // Break prop!
      prop.isBroken = true;

      // If this was a master traffic light, break the intersection signal!
      if (prop.type === 'traffic_light' && prop.isMasterLight && prop.intersectionId) {
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
      else if (prop.type === 'lamp_highway' || prop.type === 'lamp') { debrisColor = '#94a3b8'; debrisCount = 10; }

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
          type: 'debris'
        });
      }

      if (prop.type === 'lamp_highway' || prop.type === 'lamp' || prop.type === 'traffic_light') {
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
            type: 'debris'
          });
        }
      }
      break;
    }
  }

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
              type: 'water_splash'
            });
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
      if (lit.type === 'paper' || lit.type === 'newspaper' || lit.type === 'leaf') {
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
      if (lit.type === 'cup' || lit.type === 'can') {
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
  side: 'north' | 'south' | 'east' | 'west';
  offsetRatio: number;
  number: number;
}

export function getAllBuildingEntrances(bld: Building): BuildingEntranceInfo[] {
  const result: BuildingEntranceInfo[] = [];
  if (bld.entrances && bld.entrances.length > 0) {
    for (let i = 0; i < bld.entrances.length; i++) {
      const ent = bld.entrances[i];
      let ex = bld.x + bld.width * ent.offsetRatio;
      let ey = bld.y + bld.height;
      if (ent.side === 'north') {
        ex = bld.x + bld.width * ent.offsetRatio;
        ey = bld.y;
      } else if (ent.side === 'south') {
        ex = bld.x + bld.width * ent.offsetRatio;
        ey = bld.y + bld.height;
      } else if (ent.side === 'west') {
        ex = bld.x;
        ey = bld.y + bld.height * ent.offsetRatio;
      } else if (ent.side === 'east') {
        ex = bld.x + bld.width;
        ey = bld.y + bld.height * ent.offsetRatio;
      }
      result.push({
        x: ex,
        y: ey,
        side: ent.side,
        offsetRatio: ent.offsetRatio,
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

    // Duplicate all lights, signals and braking state from the towing vehicle to the trailer
    trailer.turnSignal = veh.turnSignal;
    trailer.turnSignalTimer = veh.turnSignalTimer;
    trailer.brakeLightsOn = veh.brakeLightsOn;
    trailer.isReversing = veh.isReversing || (veh.speed < -1 && !veh.isParked);
    trailer.headlightsOn = veh.headlightsOn;
    trailer.headlightMode = veh.headlightMode;

    // Tow hitch ball position on towing vehicle (rear)
    const vehCfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
    const vehHalfL = vehCfg.length / 2;
    const hitchOffset = veh.hitchOffset !== undefined ? veh.hitchOffset : (-vehHalfL - 2);

    const cosV = Math.cos(veh.angle);
    const sinV = Math.sin(veh.angle);
    const hitchX = veh.x + cosV * hitchOffset;
    const hitchY = veh.y + sinV * hitchOffset;

    // Trailer details
    const trailerCfg = CAR_CONFIGS[trailer.type] || CAR_CONFIGS.sedan;
    const trailerHalfL = trailerCfg.length / 2;

    const oldX = trailer.x;
    const oldY = trailer.y;

    if (trailer.type === 'trailer_flatbed_2axle' || trailer.trailerType === 'turntable_dolly_2axle') {
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

    } else {
      // Standard 1-Axle Drawbar Trailer (e.g. trailer_barrel):
      // Single axle with rigid A-frame drawbar extending forward to hitch ball
      const drawbarL = trailer.couplerOffset !== undefined ? trailer.couplerOffset : 26;

      const dx = hitchX - trailer.x;
      const dy = hitchY - trailer.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.001) {
        trailer.angle = Math.atan2(dy, dx);
      }

      // Geometric coupling: axle is kept exactly drawbarL distance behind hitch point
      trailer.x = hitchX - Math.cos(trailer.angle) * drawbarL;
      trailer.y = hitchY - Math.sin(trailer.angle) * drawbarL;

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

  // Immediately align dolly angle towards tow hitch ball to eliminate initial angle offset on spawn/hitch
  const vehCfg = CAR_CONFIGS[vehicle.type] || CAR_CONFIGS.sedan;
  const hitchOffset = vehicle.hitchOffset !== undefined ? vehicle.hitchOffset : (-vehCfg.length / 2 - 2);
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
  if (vehicle.trailerId) {
    unhitchTrailerFromVehicle(vehicle, world);
    if (playerNotifications && typeof playerNotifications.add === 'function') {
      playerNotifications.add('Прицеп отцеплен', 'info');
    }
    return true;
  }

  if (!canVehicleHaveHitch(vehicle)) {
    if (playerNotifications && typeof playerNotifications.add === 'function') {
      playerNotifications.add('У этого транспортного средства нет фаркопа', 'warning');
    }
    return false;
  }
  const vehCfg = CAR_CONFIGS[vehicle.type] || CAR_CONFIGS.sedan;
  const hitchOffset = vehicle.hitchOffset !== undefined ? vehicle.hitchOffset : (-vehCfg.length / 2 - 2);
  const hitchX = vehicle.x + Math.cos(vehicle.angle) * hitchOffset;
  const hitchY = vehicle.y + Math.sin(vehicle.angle) * hitchOffset;

  let nearestTrailer: Vehicle | null = null;
  let minDist = 110;

  for (const other of world.vehicles) {
    if (other.id === vehicle.id) continue;
    if (other.type.startsWith('trailer_') || other.isTrailer) {
      if (other.towedById && other.towedById !== vehicle.id) continue;
      const otherCfg = CAR_CONFIGS[other.type] || CAR_CONFIGS.sedan;
      const couplerOffset = other.couplerOffset !== undefined ? other.couplerOffset : (otherCfg.length / 2 + 8);
      const couplerX = other.x + Math.cos(other.angle) * couplerOffset;
      const couplerY = other.y + Math.sin(other.angle) * couplerOffset;

      const d = Math.hypot(hitchX - couplerX, hitchY - couplerY);
      if (d < minDist) {
        minDist = d;
        nearestTrailer = other;
      }
    }
  }

  if (nearestTrailer) {
    hitchTrailerToVehicle(vehicle, nearestTrailer, world);
    if (playerNotifications && typeof playerNotifications.add === 'function') {
      playerNotifications.add(`Прицеп сцеплен: ${CAR_CONFIGS[nearestTrailer.type]?.name || 'Прицеп'}`, 'success');
    }
    return true;
  } else {
    if (playerNotifications && typeof playerNotifications.add === 'function') {
      playerNotifications.add('Рядом нет подходящего прицепа для сцепки', 'warning');
    }
    return false;
  }
}



